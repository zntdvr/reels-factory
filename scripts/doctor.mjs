#!/usr/bin/env node
/**
 * ПРОВЕРКА ОКРУЖЕНИЯ. Запускается установщиком и в любой момент вручную:
 *
 *     npm run doctor
 *
 * Отвечает на один вопрос: чего не хватает, чтобы собрать ролик. Каждая
 * недостающая вещь объясняется тем, что из-за неё сломается, и как это починить
 * на этой операционной системе.
 */
import { execSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { craftBinary } from './lib/craft-client.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const isWindows = process.platform === 'win32';
const isMac = process.platform === 'darwin';

const results = [];
const ok = (name, detail) => results.push({ level: 'ok', name, detail });
const warn = (name, detail, fix) => results.push({ level: 'warn', name, detail, fix });
const fail = (name, detail, fix) => results.push({ level: 'fail', name, detail, fix });

function has(command) {
  try {
    execSync(isWindows ? `where ${command}` : `command -v ${command}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function readConfig() {
  const file = path.join(root, 'config', 'project.json');
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    fail('Конфигурация', `config/project.json повреждён: ${error.message}`, 'Восстановите файл или запустите настройку заново.');
    return null;
  }
}

function readEnv() {
  const file = path.join(root, '.env');
  if (!existsSync(file)) return {};
  const env = {};
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
  return env;
}

// ── Node ────────────────────────────────────────────────
const major = Number(process.versions.node.split('.')[0]);
if (major >= 20) ok('Node.js', `версия ${process.versions.node}`);
else
  fail(
    'Node.js',
    `версия ${process.versions.node}, нужна 20 или новее`,
    'Скачайте свежую версию с nodejs.org и установите поверх.',
  );

// ── Зависимости ─────────────────────────────────────────
if (existsSync(path.join(root, 'node_modules', 'remotion'))) ok('Библиотеки', 'установлены');
else fail('Библиотеки', 'не установлены', 'Выполните: npm install');

// ── ffmpeg ──────────────────────────────────────────────
if (has('ffmpeg') && has('ffprobe')) {
  ok('ffmpeg', 'найден');
} else {
  fail(
    'ffmpeg',
    'не найден — без него нельзя вырезать паузы и собрать звук',
    isMac
      ? 'Установите Homebrew с brew.sh, затем: brew install ffmpeg'
      : isWindows
        ? 'Установите через winget: winget install Gyan.FFmpeg — и перезапустите терминал'
        : 'Установите пакет ffmpeg вашим пакетным менеджером.',
  );
}

// ── Распознавание речи: GigaAM в tools/asr-venv ─────────
const config = readConfig();
const asrPython = path.join(root, 'tools', 'asr-venv', isWindows ? 'Scripts' : 'bin', isWindows ? 'python.exe' : 'python');
const asrScript = path.join(root, 'scripts', 'asr', 'transcribe.py');
const runs = (command, args) => spawnSync(command, args, { stdio: 'ignore' }).status === 0;

if (existsSync(asrPython) && runs(asrPython, ['-c', 'import onnx_asr'])) {
  ok('Распознавание речи', 'GigaAM установлен');
  const quantization = config?.transcribe?.quantization ?? '';
  const modelArgs = [asrScript, '--check', '--models', path.join(root, config?.transcribe?.models ?? 'models')];
  if (quantization) modelArgs.push('--quantization', quantization);
  if (runs(asrPython, modelArgs)) {
    ok('Модели распознавания', quantization ? 'лёгкая модель на месте' : 'полная модель на месте');
  } else {
    fail(
      'Модели распознавания',
      'не скачаны — без них распознавание не запустится',
      'Запустите npm run install-deps — он скачает модели (0,9 ГБ, один раз) и положит куда нужно.',
    );
  }
} else {
  fail(
    'Распознавание речи',
    'не установлено — без него не посчитать тайминги по озвучке',
    'Запустите npm run install-deps — он поставит Python, если его нет, и распознавание в папку tools.',
  );
}

// ── Конфигурация и стиль ────────────────────────────────
if (!config) {
  fail('Конфигурация', 'config/project.json отсутствует', 'Запустите настройку: /setup');
} else if (!config.configured) {
  warn('Конфигурация', 'мастер настройки ещё не пройден', 'Напишите /setup — это займёт пару минут.');
} else {
  ok('Конфигурация', `формат ${config.format.width}×${config.format.height}, ${config.format.fps} кадров/с`);
}

if (existsSync(path.join(root, 'style', 'index.ts'))) ok('Стиль', 'стиль-пак на месте');
else fail('Стиль', 'папка style пуста', 'Подключите свой дизайн-код командой /style');

// ── Blender 3D ─────────────────────────────────────────
if (config?.blender?.enabled === false) {
  warn('Blender', 'выключен в настройке', 'Включите blender.enabled в config/project.json, если нужны объёмные 3D-сцены.');
} else {
  const configured = path.resolve(root, config?.blender?.executable || 'tools/blender/blender');
  const executable = existsSync(configured) && !configured.toLowerCase().endsWith('.exe')
    ? (configured.endsWith(isWindows ? 'blender.exe' : 'blender') ? configured : path.join(configured, isWindows ? 'blender.exe' : 'blender'))
    : configured;
  if (existsSync(executable)) {
    const version = spawnSync(executable, ['--version'], { encoding: 'utf8', timeout: 15000 });
    const engine = config?.blender?.engine || 'CYCLES';
    const threads = Number(config?.blender?.threads || 2);
    const renderProbe = `import bpy; s=bpy.context.scene; s.render.engine=${JSON.stringify(engine)}; ${engine === 'CYCLES' ? 's.cycles.device="CPU"; s.cycles.samples=1;' : ''} s.render.resolution_x=8; s.render.resolution_y=8; bpy.ops.render.render()`;
    const runtime = version.status === 0
      ? spawnSync(executable, ['--background', '--factory-startup', '--threads', String(threads), '--python-expr', renderProbe], { encoding: 'utf8', timeout: 30000 })
      : version;
    if (runtime.status === 0) ok('Blender', (version.stdout || '').split('\n')[0] + '; headless-рендер и прозрачный WebM доступны');
    else if (runtime.error?.code === 'ETIMEDOUT') warn('Blender', 'проверка фонового запуска превысила 30 секунд', `Проверьте Blender: ${executable}`);
    else warn('Blender', 'не запускается для фонового рендера', 'Для Linux установите libegl1, libegl-mesa0 и libgl1-mesa-dri, затем повторите npm run doctor.');
  } else {
    warn('Blender', 'не установлен или не настроен', `Установите Blender и укажите путь в blender.executable (${executable}). 3D-сцены останутся недоступны.`);
  }
}

// ── Whiteboard Animator ────────────────────────────────
if (config?.animator?.enabled === false) {
  warn('Animator', 'выключен в настройке', 'Включите animator.enabled в config/project.json, если хотите использовать рисованные сцены.');
} else {
  const animatorRoot = path.resolve(root, config?.animator?.path || 'tools/Animator');
  const animatorPython = path.join(animatorRoot, '.venv', isWindows ? 'Scripts/python.exe' : 'bin/python');
  if (existsSync(path.join(animatorRoot, 'animator', 'spec_scene.py')) && existsSync(path.join(animatorRoot, 'animator', 'models', 'craft.onnx'))) {
    if (!existsSync(animatorPython) || !runs(animatorPython, ['-c', 'import cv2, numpy, onnxruntime, pydantic, scipy, skimage, httpx, dotenv'])) {
      warn('Animator', 'библиотеки ещё не установлены', 'Запустите npm run install-deps для создания локального Python-окружения.');
    } else {
    const animatorEnv = path.join(animatorRoot, '.env');
    const animatorKeyLine = existsSync(animatorEnv)
      ? readFileSync(animatorEnv, 'utf8').split('\n').find((line) => /^\s*OPENROUTER_API_KEY\s*=/.test(line))
      : '';
    const animatorKeyValue = animatorKeyLine?.slice(animatorKeyLine.indexOf('=') + 1).trim().replace(/^['"]|['"]$/g, '');
    const hasAnimatorKey = !!process.env.OPENROUTER_API_KEY || !!animatorKeyValue;
    if (hasAnimatorKey) ok('Animator', 'подключён; ИИ может выбирать его для подходящих сцен');
    else warn('Animator', 'нет ключа OpenRouter для генерации доски', `Добавьте OPENROUTER_API_KEY в ${animatorEnv}.`);
    }
  } else {
    warn('Animator', 'не найден или не настроено Python-окружение', `Проверьте animator.path в config/project.json и установите зависимости в ${animatorRoot}.`);
  }
}

// ── Craft editors ──────────────────────────────────────
for (const app of ['effectcraft', 'filmcraft']) {
  const binary = craftBinary(app, config ?? {});
  if (runs(binary, ['--version'])) ok(app, 'CLI доступен');
  else warn(
    app, 'CLI не найден — функция пропускается', `Установите официальный ${app}-cli и задайте ${app}.cli или ${app.toUpperCase()}_CLI; инструкция docs/CRAFT.md.`);
}

// ── Ключи сервисов ──────────────────────────────────────
const env = readEnv();
if (env.ELEVENLABS_API_KEY) ok('ElevenLabs', 'ключ на месте — озвучка доступна');
else warn('ElevenLabs', 'ключа нет — работаем с готовыми файлами озвучки', 'Захотите генерировать голос — добавьте ключ в .env, всё остальное подхватится само.');

if (env.AVATAR_API_KEY) ok('ИИ-аватар', 'ключ на месте');
else warn('ИИ-аватар', 'не подключён', 'Не обязателен. Ключ добавляется в .env в любой момент.');

// ── Отчёт ───────────────────────────────────────────────
const mark = { ok: '  ок  ', warn: ' можно', fail: ' нужно' };
console.log('\nПроверка окружения\n');
for (const r of results) {
  console.log(`[${mark[r.level]}] ${r.name}: ${r.detail}`);
  if (r.fix && r.level !== 'ok') console.log(`          ${r.fix}`);
}

const failures = results.filter((r) => r.level === 'fail').length;
console.log(
  failures
    ? `\nНе хватает: ${failures}. Сделайте, что написано выше, и запустите проверку снова: npm run doctor\n`
    : '\nВсё на месте. Можно присылать материал для ролика.\n',
);
// Подпись продукта. Не реклама: чтобы владелец копии знал, к кому идти с
// вопросами лицензии и сложной настройки.
try {
  const author = JSON.parse(readFileSync(path.join(root, 'config', 'author.json'), 'utf8'));
  console.log(`  ${author.product} · ${author.author} · условия в LICENSE.md\n`);
} catch {}

process.exit(failures ? 1 : 0);
