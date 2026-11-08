#!/usr/bin/env node
/** РЕНДЕР ОДНОЙ СЦЕНЫ ЧЕРЕЗ WHITEBOARD-ANIMATOR. */
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  args, done, p, readConfig, readJSON, say, step, stop, writeJSON,
} from './lib/util.mjs';

const options = args(process.argv.slice(2), { boolean: ['regenerate'] });
if (!options.project || !options.block) {
  stop('Укажите проект и блок: npm run animator -- --project ID --block BLOCK');
}
if (!/^[a-z0-9-]+$/i.test(String(options.block))) stop('Имя блока для Animator может содержать только латинские буквы, цифры и дефис.');

const config = readConfig();
if (config.animator?.enabled === false) stop('Animator отключён в config/project.json.');
const projectDir = p('projects', String(options.project));
const meta = readJSON(path.join(projectDir, 'meta.json'));
const blockData = readJSON(path.join(projectDir, 'work', 'blocks.json'));
const block = blockData.blocks.find((item) => item.id === options.block);
if (!block) stop(`Блок «${options.block}» не найден в work/blocks.json.`);
if (block.camera) stop(`Блок «${options.block}» отдан камере; Animator используется только для графических блоков.`);
if (block.visualizer !== 'animator') stop(`ИИ не выбрала Animator для блока «${options.block}». Укажите visualizer: "animator" в work/blocks.json и пересоберите каркас.`);

const toolPath = config.animator?.path || 'tools/Animator';
const animatorRoot = path.resolve(p(), toolPath);
if (!existsSync(path.join(animatorRoot, 'animator', 'spec_scene.py'))) {
  stop(`Не нашёл Animator в ${animatorRoot}. Исправьте animator.path в config/project.json.`);
}
const python = path.join(animatorRoot, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
if (!existsSync(python)) stop(`В Animator нет Python-окружения: ${python}. Установите зависимости по README Animator.`);

const authoredSpec = path.join(projectDir, 'animator', `${options.block}.json`);
if (!existsSync(authoredSpec)) {
  stop(
    `Нет описания Animator для блока. Создайте ${path.relative(p(), authoredSpec)} ` +
      'с полями title, layout и beats (visual, label, narration).',
  );
}

let spec;
try {
  spec = JSON.parse(readFileSync(authoredSpec, 'utf8'));
} catch (error) {
  stop(`Не удалось прочитать описание Animator: ${error.message}`);
}
if (!Array.isArray(spec.beats) || spec.beats.length === 0) {
  stop(`В ${path.relative(p(), authoredSpec)} нужен непустой список beats.`);
}

const fps = config.format.fps;
const duration = block.frames / fps;
for (const [index, beat] of spec.beats.entries()) {
  if (!beat.visual || !Number.isFinite(beat.start) || !Number.isFinite(beat.end) || beat.end <= beat.start || beat.start >= duration) {
    stop(`Некорректный beat ${index + 1}: укажите visual и окно start/end внутри ${duration.toFixed(2)}с.`);
  }
}

const workingDir = path.join(projectDir, 'work', 'animator');
const assetsDir = path.join(projectDir, 'work', 'public', 'animator');
mkdirSync(workingDir, { recursive: true });
mkdirSync(assetsDir, { recursive: true });
const effectiveSpec = path.join(workingDir, `${options.block}.json`);
const output = path.join(assetsDir, `${options.block}.webm`);
const ratio = config.format.width / config.format.height;
const aspect = ratio > 1.5 ? '16:9' : ratio < 0.75 ? '9:16' : '1:1';
writeJSON(effectiveSpec, {
  ...spec,
  fps,
  frames: block.frames,
  aspect,
});

say(`\n  Animator: ${meta.title} · ${options.block}\n`);
step('Рисую сцену под длительность блока');
const cliArgs = ['-m', 'animator', '--spec', effectiveSpec, '--assets', assetsDir, '-o', output];
if (options.regenerate) cliArgs.push('--regenerate');
const result = spawnSync(python, cliArgs, {
  cwd: animatorRoot,
  env: process.env,
  stdio: 'inherit',
});
if (result.error) stop(`Не удалось запустить Animator: ${result.error.message}`);
if (result.status !== 0 || !existsSync(output)) stop('Animator не собрал клип. Проверьте настройки Animator и повторите запуск.');

done(path.relative(p(), output));
say(`\n  Клип блока ${options.block} подключён к описанию ролика как '${meta.id}/animator/${options.block}.webm'.\n`);
