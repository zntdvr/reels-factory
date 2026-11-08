#!/usr/bin/env node
import path from 'node:path';
import os from 'node:os';
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { bundle } from '@remotion/bundler';
import { getCompositions, renderMedia } from '@remotion/renderer';
import { args, p, readConfig, readJSON, writeJSON, readyDir, done, run, stop } from './lib/util.mjs';
import { assembleFilmcraft } from './lib/craft-filmcraft.mjs';
import { verifyCraftVideo } from './lib/craft-media.mjs';
import { validateLayers } from '../core/craft-contract.mjs';

const options = args();
if (typeof options.project !== 'string' || !/^[a-z0-9-]+$/i.test(options.project)) stop('Укажите --project ID');
const config = readConfig();
const dir = p('projects', options.project);
const meta = readJSON(path.join(dir, 'meta.json'));
if (!existsSync(path.join(dir, 'reel.tsx'))) stop('Нет reel.tsx; сначала создайте сцены.');
const outParent = options.out ? path.resolve(String(options.out)) : readyDir(config);
mkdirSync(outParent, { recursive: true });
const output = mkdtempSync(path.join(outParent, `${meta.id}-filmcraft-`));
const scratch = mkdtempSync(path.join(os.tmpdir(), 'reels-craft-'));
const publicDir = path.join(scratch, 'public');
const work = path.join(dir, 'work');
mkdirSync(work, { recursive: true });
const entry = path.join(work, 'craft-entry.tsx');
let bundlePath;
try {
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
  writeJSON(path.join(output, 'manifest.json'), manifest);
  const mediaDir = path.join(output, 'media'); mkdirSync(mediaDir);
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
    const info = JSON.parse(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'json', file]));
    if (Math.abs(Number(info.format.duration) - frames / manifest.fps) > 1 / manifest.fps + 0.01) throw new Error(`Длительность ${name} не совпала с таймлайном.`);
    if (!audio) verifyCraftVideo(file, { ...manifest, frames, alpha });
    media.push({ name, file, start, frames, track, audio });
  };
  for (const [i, block] of manifest.blocks.entries()) {
    await render('craft-base', `scene-${i}-${block.id}`, block.start, block.frames, 'V1');
    for (const [j, layer] of block.layers.entries()) if (layer.kind === 'render') {
      const from = layer.from ?? 0;
      await render(`craft-layer-${i}-${j}`, `layer-${i}-${j}-${layer.id}`, block.start + from, layer.frames ?? block.frames - from, `V${j + 2}`, false, true);
    }
  }
  const maxLayers = Math.max(0, ...manifest.blocks.map((b) => b.layers.length));
  if (manifest.avatar) await render('craft-avatar', 'avatar', 0, manifest.totalFrames, `V${maxLayers + 3}`, false, true);
  await render('craft-voice', 'voice', 0, manifest.totalFrames, 'A1', true);
  if (manifest.music) await render('craft-music', 'music', 0, manifest.totalFrames, 'A2', true);
  if (manifest.sfx) await render('craft-sfx', 'sfx', 0, manifest.totalFrames, 'A3', true);
  const fcproj = path.join(output, `${meta.id}.fcproj`);
  const result = await assembleFilmcraft(manifest, media, fcproj, config);
  writeJSON(path.join(output, 'objects.json'), result.objects);
  writeJSON(path.join(output, 'inspection.json'), result.inspection);
  const sources = path.join(dir, 'effectcraft');
  if (existsSync(sources)) cpSync(sources, path.join(output, 'effectcraft-sources'), { recursive: true });
  console.log('▸ FilmCraft: эталон Remotion');
  await renderMedia({ serveUrl: bundlePath, composition: compositions.find((c) => c.id === 'craft-reference'),
    outputLocation: path.join(output, 'reference.mp4'), codec: 'h264', chromiumOptions,
    concurrency: config.render?.concurrency ?? 2 });
  const baked = manifest.blocks.filter((b) => b.bakedScene || b.effectcraft || b.inset).map((b) => b.id);
  writeFileSync(path.join(output, 'README.md'), `# ${manifest.title}\n\nОткройте ${meta.id}.fcproj в FilmCraft. Переносите всю папку вместе с media.\n\n- V1: отдельные клипы сцен; можно удалить, обрезать или заменить.\n- Следующие дорожки: отдельные Remotion-объекты и нативный текст.\n- A1: голос; A2: музыка; A3: звуковые акценты.\n- Текст меняется через Graphics and Titles / Properties.\n- objects.json связывает имена элементов с ID FilmCraft.\n\n## Ограничения\nreference.mp4 — текущий обычный рендер Remotion для сравнения (до финальной LUFS-нормализации).\nСодержимое цельных сцен ${baked.join(', ') || '(нет)'} запечено: текст внутри них не становится редактируемым. Для этого вынесите его в block.layers. EffectCraft меняется в исходном .ecproj с повторным рендером; внешние медиа исходников нужно переносить отдельно.\nСубтитры экспортированы редактируемыми страницами без покадровой подсветки. Нативная типографика может отличаться от Chromium. Анимация и переходы растровых слоёв запечены. Слои layers находятся вне перехода сцены и совпадают с обычным рендером по этому правилу.\nЗвуковые акценты сведены в отдельный stem; итоговая LUFS-нормализация MP4 не применяется к отдельным дорожкам.\nПовторный экспорт создаёт новую папку и не затирает ваши ручные правки.\n`);
  writeJSON(path.join(work, 'filmcraft-export.json'), { project: fcproj, output });
  done(fcproj);
} catch (error) {
  writeFileSync(path.join(output, 'EXPORT-FAILED.txt'), error.stack ?? error.message);
  process.exitCode = 1; console.error(error.stack ?? error.message);
} finally {
  rmSync(scratch, { recursive: true, force: true });
  if (bundlePath) rmSync(bundlePath, { recursive: true, force: true });
}
