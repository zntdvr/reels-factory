#!/usr/bin/env node
/** СБОРКА ПРОЗРАЧНОГО 3D-КЛИПА ДЛЯ ОДНОГО БЛОКА ЧЕРЕЗ BLENDER. */
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { requireApproval } from './lib/edit-session.mjs';
import { spawnSync } from 'node:child_process';
import {
  args, done, p, readConfig, readJSON, say, step, stop,
} from './lib/util.mjs';

const options = args();
if (!options.project || !options.block) {
  stop('Укажите проект и блок: npm run blender -- --project ID --block BLOCK');
}
if (!/^[a-z0-9-]+$/i.test(String(options.block))) stop('Имя блока может содержать только латинские буквы, цифры и дефис.');

const config = readConfig();
if (config.blender?.enabled === false) stop('Blender отключён в config/project.json.');
const projectDir = p('projects', String(options.project));
requireApproval(projectDir);
const meta = readJSON(path.join(projectDir, 'meta.json'));
const blockData = readJSON(path.join(projectDir, 'work', 'blocks.json'));
const block = blockData.blocks.find((item) => item.id === options.block);
if (!block) stop(`Блок «${options.block}» не найден в work/blocks.json.`);
if (block.camera) stop(`Блок «${options.block}» отдан камере; Blender используется для графических блоков.`);
if (block.visualizer !== 'blender') stop(`ИИ не выбрала Blender для блока «${options.block}». Укажите visualizer: "blender" в work/blocks.json и пересоберите каркас.`);

const configuredExecutable = config.blender?.executable || 'tools/blender/blender';
const configuredPath = path.resolve(p(), configuredExecutable);
const executableName = process.platform === 'win32' ? 'blender.exe' : 'blender';
const blender = existsSync(configuredPath) && !configuredPath.toLowerCase().endsWith('.exe')
  ? (configuredPath.endsWith(executableName) ? configuredPath : path.join(configuredPath, executableName))
  : configuredPath;
if (!existsSync(blender)) stop(`Не найден Blender: ${blender}. Установите Blender или укажите blender.executable в config/project.json.`);

const authoredScene = path.join(projectDir, 'blender', `${options.block}.py`);
if (!existsSync(authoredScene)) stop(`Нет сцены Blender: ${path.relative(p(), authoredScene)}. Запустите каркас и заполните build_scene(bpy, scene, params).`);
const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
const runner = p('scripts', 'blender-render.py');
const framesDir = path.join(projectDir, 'work', 'blender', 'frames', options.block);
const outputDir = path.join(projectDir, 'work', 'public', 'blender');
const output = path.join(outputDir, `${options.block}.webm`);
mkdirSync(outputDir, { recursive: true });
rmSync(framesDir, { recursive: true, force: true });
mkdirSync(framesDir, { recursive: true });

const { width, height, fps } = config.format;
const engine = config.blender?.engine || 'CYCLES';
const samples = Number(config.blender?.samples || 16);
const threads = Number(config.blender?.threads || 4);
say(`\n  Blender: ${meta.title} · ${options.block}\n`);
step(`Рендерю ${block.frames} прозрачных кадров`);
const result = spawnSync(blender, [
  '--background', '--factory-startup', '--threads', String(threads), '--python-exit-code', '1', '--python', runner, '--',
  '--scene', authoredScene, '--output', framesDir, '--frames', String(block.frames),
  '--fps', String(fps), '--width', String(width), '--height', String(height),
  '--engine', engine, '--samples', String(samples),
], { cwd: p(), stdio: 'inherit' });
if (result.error) stop(`Не удалось запустить Blender: ${result.error.message}`);
if (result.status !== 0) stop('Blender не собрал сцену. Проверьте build_scene и повторите запуск.');

const renderedFrames = readdirSync(framesDir).filter((name) => /^frame_\d+\.png$/.test(name)).length;
if (renderedFrames !== block.frames) stop(`Blender создал ${renderedFrames} кадров вместо ${block.frames}.`);

step('Упаковываю кадры в прозрачный WebM');
const encoded = spawnSync(ffmpeg, [
  '-y', '-hide_banner', '-loglevel', 'warning', '-framerate', String(fps),
  '-i', path.join(framesDir, 'frame_%04d.png'), '-frames:v', String(block.frames),
  '-an', '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-auto-alt-ref', '0', '-b:v', '0', '-crf', '30', output,
], { cwd: p(), stdio: 'inherit' });
if (encoded.error) stop(`Не удалось запустить ffmpeg: ${encoded.error.message}`);
if (encoded.status !== 0 || !existsSync(output)) stop('Не получилось упаковать Blender-кадры в WebM.');

done(path.relative(p(), output));
say(`\n  Клип блока подключён к описанию ролика как '${meta.id}/blender/${options.block}.webm'.\n`);
