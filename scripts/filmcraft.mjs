#!/usr/bin/env node
import path from 'node:path';
import os from 'node:os';
import { cpSync, existsSync, mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { bundle } from '@remotion/bundler';
import { getCompositions, renderMedia } from '@remotion/renderer';
import { args, p, readConfig, readJSON, writeJSON, readyDir, done, run, stop } from './lib/util.mjs';
import { assembleFilmcraft, replaceGeneratedMedia } from './lib/craft-filmcraft.mjs';
import { readSession, saveSession, requireApproval, sourceSnapshot, checkUpdateSources } from './lib/edit-session.mjs';
import { connectEdit, saveEditCheckpoint, saveLiveProject } from './lib/filmcraft-live.mjs';
import { verifyCraftVideo } from './lib/craft-media.mjs';
import { validateLayers } from '../core/craft-contract.mjs';

const options = args();
if (typeof options.project !== 'string' || !/^[a-z0-9-]+$/i.test(options.project)) stop('Укажите --project ID');
const config = readConfig();
const dir = p('projects', options.project);
requireApproval(dir);
const session = readSession(dir);
if (session && !options.draft && !options.update && !options.snapshot) stop('Для нового процесса: npm run edit -- prepare или update --project ID');
if (options.draft && session?.project) stop('Рабочий проект уже существует; используйте edit update. Ручные правки сохраняются.');
if (options.update && !session?.project) stop('Сначала подготовьте рабочий проект FilmCraft.');
const meta = readJSON(path.join(dir, 'meta.json'));
if (!existsSync(path.join(dir, 'reel.tsx'))) stop('Нет reel.tsx; сначала создайте сцены.');
const outParent = options.out ? path.resolve(String(options.out)) : readyDir(config, dir);
mkdirSync(outParent, { recursive: true });
const output = options.update ? session.output : mkdtempSync(path.join(outParent, `${meta.id}-filmcraft-`));
const scratch = mkdtempSync(path.join(os.tmpdir(), 'reels-craft-'));
const publicDir = path.join(scratch, 'public');
const work = path.join(dir, 'work');
mkdirSync(work, { recursive: true });
const entry = path.join(work, 'craft-entry.tsx');
let bundlePath;
let live;
try {
  const sources = sourceSnapshot(dir);
  // Copy into an isolated public directory: never move or remove live render assets.
  cpSync(p('public'), publicDir, { recursive: true });
  const materials = path.join(work, 'public');
  if (existsSync(materials)) {
    if (existsSync(path.join(publicDir, meta.id))) throw new Error('Материалы есть и в public, и в work/public; устраните конфликт перед экспортом.');
    cpSync(materials, path.join(publicDir, meta.id), { recursive: true });
  }
  writeFileSync(entry, `import React from 'react';\nimport {registerRoot} from 'remotion';\nimport {CraftExport} from '../../../core/CraftExport';\nimport reel from '../reel';\nregisterRoot(() => <CraftExport reel={reel} />);\n`);
  bundlePath = await bundle({ entryPoint: entry, publicDir });
  const chromiumOptions = { gl: 'angle' };
  const compositions = await getCompositions(bundlePath, { chromiumOptions });
  const manifest = compositions.find((c) => c.id === 'craft-manifest')?.props.manifest;
  if (!manifest) throw new Error('Не получено описание экспорта.');
  for (const block of manifest.blocks) {
    validateLayers(block.layers, block.frames);
    if (block.effectcraft) verifyCraftVideo(path.join(publicDir, block.effectcraft), { ...manifest, frames: block.frames, alpha: true });
  }
  if (session) {
    const planned = readJSON(path.join(work, 'blocks.json'));
    if (planned.fps !== manifest.fps || planned.totalFrames !== manifest.totalFrames ||
      JSON.stringify(planned.blocks.map((b) => [b.id, b.frames, b.camera ? 'camera' : b.visualizer])) !== JSON.stringify(manifest.blocks.map((b) => [b.id, b.frames, b.visualizer]))) {
      throw new Error('reel.tsx не совпадает с утверждёнными блоками; обновите каркас и сцены.');
    }
  }
  let updatedIds = manifest.blocks.map((b) => b.id);
  if (options.update) {
    const old = readJSON(path.join(output, 'manifest.json'));
    const structure = (m) => JSON.stringify([m.width, m.height, m.fps, m.totalFrames, m.music, m.sfx, m.avatar,
      m.captions, m.blocks.map((b) => [b.id, b.start, b.frames, b.layers.map((l) => [l.id, l.kind, l.from, l.frames])])]);
    if (structure(old) !== structure(manifest)) throw new Error('Изменилась структура слоёв, субтитры или хронометраж. Нужен отдельный новый черновик; текущий монтаж не перезаписан.');
    if (options.update !== 'all') {
      const i = manifest.blocks.findIndex((b) => b.id === options.update);
      if (i < 0) throw new Error(`Нет блока ${options.update}`);
      updatedIds = manifest.blocks.slice(Math.max(0, i - 1), i + 2).map((b) => b.id);
      checkUpdateSources(session.sources, sources, updatedIds);
    }
    live = await connectEdit(dir, config);
  }
  const baseMedia = path.join(output, 'media'); mkdirSync(baseMedia, { recursive: true });
  const mediaDir = options.update ? mkdtempSync(path.join(baseMedia, 'update-')) : baseMedia;
  const media = [];
  const render = async (id, name, start, frames, track, audio = false, alpha = false) => {
    const composition = compositions.find((c) => c.id === id);
    if (!composition) throw new Error(`Нет композиции ${id}`);
    const file = path.join(mediaDir, `${name}.${audio ? 'wav' : alpha ? 'mov' : 'mp4'}`);
    console.log(`▸ FilmCraft: ${name}`);
    await renderMedia({ serveUrl: bundlePath, composition, outputLocation: file,
      codec: audio ? 'wav' : alpha ? 'prores' : 'h264',
      ...(alpha ? { proResProfile: '4444', pixelFormat: 'yuva444p10le', imageFormat: 'png' } : {}),
      frameRange: [start, start + frames - 1], chromiumOptions,
      concurrency: config.render?.concurrency ?? 2, ...(audio ? {} : { muted: true }),
    });
    const probe = () => Number(JSON.parse(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'json', file])).format.duration);
    const target = frames / manifest.fps;
    let duration = probe();
    // Сборщик звука отрезает хвост на доли секунды (на этом ролике — 0.08с). Это тишина,
    // поэтому дописываем её до длины таймлайна; расхождение больше 0.25с — настоящая ошибка.
    if (audio && duration < target && target - duration <= 0.25) {
      const padded = file.replace(/\.wav$/, '.padded.wav');
      run('ffmpeg', ['-y', '-i', file, '-af', `apad=whole_dur=${target}`, '-t', String(target), padded]);
      renameSync(padded, file);
      duration = probe();
    }
    if (Math.abs(duration - target) > 1 / manifest.fps + 0.01) throw new Error(`Длительность ${name} не совпала с таймлайном.`);
    if (!audio) verifyCraftVideo(file, { ...manifest, frames, alpha });
    media.push({ name, file, start, frames, track, audio });
  };
  for (const [i, block] of manifest.blocks.entries()) {
    if (!updatedIds.includes(block.id)) continue;
    await render('craft-base', `scene-${i}-${block.id}`, block.start, block.frames, 'V1');
    for (const [j, layer] of block.layers.entries()) if (layer.kind === 'render') {
      const from = layer.from ?? 0;
      await render(`craft-layer-${i}-${j}`, `layer-${i}-${j}-${layer.id}`, block.start + from, layer.frames ?? block.frames - from, `V${j + 2}`, false, true);
    }
  }
  const maxLayers = Math.max(0, ...manifest.blocks.map((b) => b.layers.length));
  if (!options.update || options.update === 'all') {
    if (manifest.avatar) await render('craft-avatar', 'avatar', 0, manifest.totalFrames, `V${maxLayers + 3}`, false, true);
    await render('craft-voice', 'voice', 0, manifest.totalFrames, 'A1', true);
    if (manifest.music) await render('craft-music', 'music', 0, manifest.totalFrames, 'A2', true);
    if (manifest.sfx) await render('craft-sfx', 'sfx', 0, manifest.totalFrames, 'A3', true);
  }
  if (JSON.stringify(sources) !== JSON.stringify(sourceSnapshot(dir))) throw new Error('Исходники изменились во время подготовки. Повторите обновление.');
  const fcproj = path.join(output, `${meta.id}.fcproj`);
  if (options.update) {
    live.close();
    live = await connectEdit(dir, config);
    await saveEditCheckpoint(live, session);
    await replaceGeneratedMedia(live, readJSON(path.join(output, 'objects.json')), media);
    await saveLiveProject(live, session);
    writeJSON(path.join(output, 'inspection.json'), await live.tool('sequence_inspect'));
  } else {
    const result = await assembleFilmcraft(manifest, media, fcproj, config);
    writeJSON(path.join(output, 'objects.json'), result.objects);
    writeJSON(path.join(output, 'inspection.json'), result.inspection);
    writeJSON(path.join(output, 'edit-build.json'), { sequence: result.sequence, sources, approval: session?.approval });
    if (options.draft) saveSession(dir, { ...session, project: fcproj, output, sequence: result.sequence, sources });
  }
  writeJSON(path.join(output, 'manifest.json'), manifest);
  if (options.update) {
    saveSession(dir, { ...session, sources });
    console.log(`▸ Обновлены сцены: ${updatedIds.join(', ')}. Проект остаётся открытым.`);
  }
  const sourceFolder = path.join(dir, 'effectcraft');
  if (existsSync(sourceFolder)) cpSync(sourceFolder, path.join(output, 'effectcraft-sources'), { recursive: true });
  if (options.reference && !options.update) {
    console.log('▸ FilmCraft: эталон Remotion');
    await renderMedia({ serveUrl: bundlePath, composition: compositions.find((c) => c.id === 'craft-reference'),
      outputLocation: path.join(output, 'reference.mp4'), codec: 'h264', chromiumOptions,
      concurrency: config.render?.concurrency ?? 2 });
  }
  const baked = manifest.blocks.filter((b) => b.bakedScene || b.effectcraft || b.inset).map((b) => b.id);
  if (!options.update) writeFileSync(path.join(output, 'README.md'), `# ${manifest.title}\n\nОткройте ${meta.id}.fcproj в FilmCraft. Переносите всю папку вместе с media.\n\n- V1: отдельные клипы сцен; можно удалить, обрезать или заменить.\n- Следующие дорожки: отдельные Remotion-объекты и нативный текст.\n- A1: голос; A2: музыка; A3: звуковые акценты.\n- Текст меняется через Graphics and Titles / Properties.\n- objects.json связывает имена элементов с ID FilmCraft.\n\n## Ограничения\nreference.mp4 создаётся только с --reference и служит эталоном Remotion до LUFS-нормализации. Рабочий монтаж экспортируется через npm run render после просмотра в FilmCraft.\nСодержимое цельных сцен ${baked.join(', ') || '(нет)'} запечено: текст внутри них не становится редактируемым. Для этого вынесите его в block.layers. EffectCraft меняется в исходном .ecproj с повторным рендером; внешние медиа исходников нужно переносить отдельно.\nСубтитры экспортированы редактируемыми страницами без покадровой подсветки. Нативная типографика может отличаться от Chromium. Анимация и переходы растровых слоёв запечены. Слои layers находятся вне перехода сцены и совпадают с обычным рендером по этому правилу.\nЗвуковые акценты сведены в отдельный stem; итоговая LUFS-нормализация MP4 не применяется к отдельным дорожкам.\nПовторный экспорт создаёт новую папку и не затирает ваши ручные правки.\n`);
  writeJSON(path.join(work, 'filmcraft-export.json'), { project: fcproj, output });
  done(fcproj);
} catch (error) {
  writeFileSync(path.join(output, options.update ? 'UPDATE-FAILED.txt' : 'EXPORT-FAILED.txt'), error.stack ?? error.message);
  process.exitCode = 1; console.error(error.stack ?? error.message);
} finally {
  live?.close();
  rmSync(scratch, { recursive: true, force: true });
  if (bundlePath) rmSync(bundlePath, { recursive: true, force: true });
}
