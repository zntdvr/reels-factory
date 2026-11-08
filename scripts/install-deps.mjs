#!/usr/bin/env node
/**
 * УСТАНОВКА ТЕХНИЧЕСКОЙ ЧАСТИ. Первый шаг: сначала на машине появляется всё
 * необходимое, и только потом идут проверка и настройка.
 *
 *     node scripts/install-deps.mjs          спросит подтверждение
 *     node scripts/install-deps.mjs --yes    без вопросов
 *     node scripts/install-deps.mjs --model light    лёгкая модель для слабой машины
 *     node scripts/install-deps.mjs --model full     вернуть полную модель
 *
 * Ставятся:
 *   ffmpeg  — режет паузы, склеивает звук, собирает готовый файл
 *   Python  — на нём работает распознавание речи (если его ещё нет)
 *   распознавание — GigaAM и Silero VAD в своём окружении tools/asr-venv
 *   модели  — веса распознавания, скачиваются в models один раз
 *   Animator — библиотеки whiteboard-рендера в tools/Animator/.venv
 *
 * Скрипт ничего не делает молча и не просит прав администратора там, где можно
 * обойтись без них. Если шаг требует пароля — он честно останавливается и даёт
 * человеку команду, которую тот выполнит сам.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import {
  ASR_SCRIPT, ASR_VENV, args, asrPython, done, has, isMac, isWindows, note, p, problem, readConfig, runLoud, say,
  step, stop, writeConfig,
} from './lib/util.mjs';

const options = args();
const auto = options.yes === true;

/**
 * Модель одна — GigaAM v3, — но в двух весах. Полная точнее, лёгкая (int8) в
 * четыре раза меньше и бережёт память старого ноутбука; на русском разница в
 * тексте почти не слышна.
 */
const MODELS = {
  full: { quantization: '', size: '0.9 ГБ', about: 'лучшее качество' },
  light: { quantization: 'int8', size: '0.25 ГБ', about: 'для слабых машин, качество почти то же' },
};
const config = readConfig();
const animatorRoot = path.resolve(p(), config.animator?.path || 'tools/Animator');
const animatorVenv = path.join(animatorRoot, '.venv');
const animatorPython = path.join(animatorVenv, isWindows ? 'Scripts/python.exe' : 'bin/python');
const currentKey = config.transcribe?.quantization === 'int8' ? 'light' : 'full';
const modelKey = typeof options.model === 'string' ? options.model : currentKey;
const model = MODELS[modelKey] ?? stop(`Неизвестная модель «${modelKey}». Доступны: ${Object.keys(MODELS).join(', ')}`);

async function confirm(question) {
  if (auto) return true;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`  ${question} [Д/н] `);
  rl.close();
  return !/^n|^н/i.test(answer.trim());
}

/** Версия Python по команде запуска или null, если такой команды нет. */
function pythonVersion(command, prefix = []) {
  const result = spawnSync(command, [...prefix, '-c', 'import sys; print(sys.version_info[0], sys.version_info[1])'], {
    encoding: 'utf8',
  });
  if (result.status !== 0) return null;
  const [major, minor] = result.stdout.trim().split(' ').map(Number);
  return { major, minor };
}

/** Подходящий Python на машине: 3.10 или новее. */
function findPython() {
  const candidates = isWindows
    ? [['py', ['-3']], ['python', []]]
    : [['python3.13', []], ['python3.12', []], ['python3.11', []], ['python3.10', []], ['python3', []], ['python', []]];
  for (const [command, prefix] of candidates) {
    const version = pythonVersion(command, prefix);
    if (version && version.major === 3 && version.minor >= 10) return { command, prefix, version };
  }
  return null;
}

/** Python для Animator: эта сборка работает и на Python 3.14. */
function findAnimatorPython() {
  const candidates = isWindows
    ? [['py', ['-3.14']], ['py', ['-3']], ['python', []]]
    : [['python3.14', []], ['python3.13', []], ['python3.12', []], ['python3.11', []], ['python3.10', []], ['python3', []], ['python', []]];
  for (const [command, prefix] of candidates) {
    const version = pythonVersion(command, prefix);
    if (version && version.major === 3 && version.minor >= 10) return { command, prefix, version };
  }
  return null;
}

say('\n  Установка технической части\n  ===========================');

// ── 1. Менеджер пакетов ─────────────────────────────────
step('Проверяю, чем ставить программы');

if (isMac && !has('brew')) {
  problem('На Mac программы ставятся через Homebrew, а его нет.');
  say('');
  say('  Установка Homebrew требует пароля вашей учётной записи, поэтому её');
  say('  нужно запустить самому. Скопируйте эту строку в Терминал:');
  say('');
  say('    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"');
  say('');
  say('  Когда установка закончится — запустите этот шаг снова.');
  process.exit(1);
}
if (isWindows && !has('winget')) {
  problem('Не найден winget — встроенный установщик Windows.');
  say('  Обновите «Установщик приложений» в Microsoft Store и повторите.');
  process.exit(1);
}
done(isMac ? 'Homebrew на месте' : isWindows ? 'winget на месте' : 'системный пакетный менеджер');

// ── 2. ffmpeg ───────────────────────────────────────────
step('ffmpeg — обработка звука и видео');
if (has('ffmpeg') && has('ffprobe')) {
  done('уже установлен');
} else if (await confirm('Установить ffmpeg?')) {
  try {
    if (isMac) runLoud('brew', ['install', 'ffmpeg']);
    else if (isWindows) runLoud('winget', ['install', '--id', 'Gyan.FFmpeg', '-e', '--accept-source-agreements', '--accept-package-agreements']);
    else stop('Установите пакет ffmpeg пакетным менеджером вашей системы и повторите.');
    done('ffmpeg установлен');
    if (isWindows) note('Закройте и откройте окно заново, чтобы система увидела новую программу.');
  } catch (error) {
    problem(`Не получилось: ${error.message}`);
    say('  Поставьте ffmpeg вручную и запустите шаг снова.');
    process.exit(1);
  }
} else {
  note('Пропущено. Без ffmpeg ролик собрать нельзя.');
}

// ── 3. Распознавание речи ───────────────────────────────
/**
 * GigaAM и Silero работают на Python. Ставятся они не в системный Python, а в
 * собственное окружение внутри системы — tools/asr-venv: так установка ничего
 * не ломает на машине и сносится вместе с папкой.
 */
step('Распознавание речи — GigaAM');
const venvPython = asrPython();
const asrReady = () =>
  existsSync(venvPython) && spawnSync(venvPython, ['-c', 'import onnx_asr']).status === 0;

if (asrReady()) {
  done('уже установлено');
} else if (await confirm('Установить распознавание речи? Это около 200 МБ библиотек.')) {
  try {
    if (!existsSync(venvPython)) {
      let python = findPython();
      if (!python) {
        note('Нужен Python 3.10 или новее — ставлю его.');
        if (isMac) runLoud('brew', ['install', 'python@3.12']);
        else if (isWindows) runLoud('winget', ['install', '--id', 'Python.Python.3.12', '-e', '--accept-source-agreements', '--accept-package-agreements']);
        else stop('Установите Python 3.10 или новее (с модулем venv) пакетным менеджером системы и повторите.');
        python = findPython();
        if (!python) {
          problem('Python установлен, но это окно его ещё не видит.');
          say('  Закройте окно, откройте заново и запустите шаг снова.');
          process.exit(1);
        }
      }
      done(`Python ${python.version.major}.${python.version.minor}`);
      runLoud(python.command, [...python.prefix, '-m', 'venv', ASR_VENV]);
    }
    // Без -q: строки скачивания показывают, что работа идёт, а не встала.
    say('  Скачиваю библиотеки распознавания — это несколько минут.');
    runLoud(venvPython, ['-m', 'pip', 'install', '--disable-pip-version-check', '-r', p('scripts', 'asr', 'requirements.txt')]);
    if (!asrReady()) throw new Error('библиотеки распознавания не загрузились');
    done('распознавание установлено в tools/asr-venv');
  } catch (error) {
    problem(`Не получилось: ${error.message}`);
    say('  Проверьте интернет и запустите шаг снова — он продолжит с того же места.');
    process.exit(1);
  }
} else {
  note('Пропущено. Без распознавания не посчитать тайминги по голосу.');
}

// ── 4. Модели распознавания ─────────────────────────────
step(`Модели распознавания — ${modelKey === 'light' ? 'лёгкая' : 'полная'} (${model.size}, ${model.about})`);
const modelArgs = [ASR_SCRIPT, '--models', p(config.transcribe?.models ?? 'models')];
if (model.quantization) modelArgs.push('--quantization', model.quantization);

if (!existsSync(venvPython)) {
  note('Пропущено: сначала нужно распознавание речи из шага выше.');
} else if (spawnSync(venvPython, [...modelArgs, '--check']).status === 0) {
  done('уже скачаны');
} else if (await confirm(`Скачать модели? Это ${model.size}, один раз.`)) {
  try {
    say(`  Скачиваю модели, ${model.size} — это несколько минут. Оборвётся — запустите шаг снова, докачается.`);
    runLoud(venvPython, [...modelArgs, '--download-only']);
    done('модели сохранены в models');
  } catch (error) {
    problem(`Не получилось: ${error.message}`);
    say('  Проверьте интернет и запустите шаг снова.');
    process.exit(1);
  }
} else {
  note('Пропущено. Без моделей распознавание не запустится.');
}

// ── 5. Animator ─────────────────────────────────────────
step('Animator — рисованные whiteboard-сцены');
const animatorSource = existsSync(path.join(animatorRoot, 'animator', 'spec_scene.py'));
const animatorReady = () => existsSync(animatorPython) && spawnSync(animatorPython, [
  '-c', 'import cv2, numpy, onnxruntime, pydantic, scipy, skimage, httpx, dotenv',
]).status === 0;

if (config.animator?.enabled === false) {
  note('Animator отключён в настройке.');
} else if (!animatorSource) {
  note(`Исходники Animator не найдены: ${animatorRoot}`);
} else if (animatorReady()) {
  done('уже установлен');
} else if (await confirm('Установить Python-зависимости Animator? Это отдельное окружение внутри проекта.')) {
  try {
    if (!existsSync(animatorPython)) {
      const python = findAnimatorPython();
      if (!python) stop('Для Animator нужен Python 3.10 или новее с модулем venv.');
      runLoud(python.command, [...python.prefix, '-m', 'venv', animatorVenv]);
    }
    runLoud(animatorPython, ['-m', 'pip', 'install', '--disable-pip-version-check', '-r', path.join(animatorRoot, 'requirements.txt')]);
    if (!animatorReady()) throw new Error('зависимости Animator не загрузились');
    done('Animator установлен в tools/Animator/.venv');
  } catch (error) {
    problem(`Не получилось: ${error.message}`);
    say('  Проверьте интернет и запустите npm run install-deps ещё раз.');
    process.exit(1);
  }
} else {
  note('Пропущено. Установить зависимости Animator можно командой npm run install-deps.');
}

// Выбор модели запоминается: расшифровка возьмёт ту, что скачана.
if ((config.transcribe?.quantization ?? '') !== model.quantization) {
  config.transcribe = { ...config.transcribe, quantization: model.quantization };
  writeConfig(config);
  done(`в настройках выбрана ${modelKey === 'light' ? 'лёгкая' : 'полная'} модель`);
}

say('\n  Техническая часть готова. Дальше — проверка: npm run doctor\n');
