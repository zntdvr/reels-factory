#!/usr/bin/env node
/**
 * РАСШИФРОВКА РЕЧИ. Из дорожки получаются слова с точным временем — на них
 * потом опирается вся разметка блоков и синхрон анимации с голосом.
 *
 *     node scripts/transcribe.mjs --project 2026-08-09-analitika
 *
 * Распознавание идёт локально: ничего не уходит в интернет, ничего не стоит,
 * работает без сети. Конвейер: ffprobe/ffmpeg → Silero VAD → куски до 25 с →
 * GigaAM v3 → чистка дублей на стыках. Сама модель — в scripts/asr/transcribe.py.
 */
import { existsSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { requireVideo } from './lib/content.mjs';
import {
  ASR_SCRIPT, args, asrPython, done, ensureDir, p, readConfig, readJSON, say, step, stop, run, writeJSON,
} from './lib/util.mjs';

const options = args();
if (!options.project) stop('Не указан проект: --project <идентификатор>');

const config = readConfig();
const dir = p('projects', String(options.project));
const meta = readJSON(path.join(dir, 'meta.json'));
try { requireVideo(meta); } catch (error) { stop(error.message); }
const workDir = path.join(dir, 'work');
ensureDir(workDir);

const media = options.file ? String(options.file) : p(meta.source.file ?? '');
if (!meta.source.file || !existsSync(media)) stop('У проекта нет звуковой дорожки — расшифровывать нечего.');

const python = asrPython();
if (!existsSync(python)) stop('Распознавание речи не установлено. Запустите: npm run install-deps');

const asr = config.transcribe ?? {};
const modelsDir = p(asr.models ?? 'models');
const quantization = asr.quantization ?? '';

say(`\n  Расшифровка: ${meta.title}\n`);

// ── 1. дорожка 16 кГц моно ──────────────────────────────
/**
 * Модель слушает 16 кГц моно. Частоту исходника сначала смотрим: wav, уже
 * записанный в нужном виде, идёт как есть, всё остальное приводится ffmpeg.
 */
step('Готовлю дорожку');
const probe = execFileSync(
  'ffprobe',
  ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=codec_name,sample_rate,channels', '-of', 'json', media],
  { encoding: 'utf8' },
);
const stream = JSON.parse(probe).streams?.[0];
if (!stream) stop('В файле нет звуковой дорожки.');

const ready = stream.codec_name === 'pcm_s16le' && Number(stream.sample_rate) === 16000 && Number(stream.channels) === 1;
const wav = ready ? media : path.join(workDir, 'source-16k.wav');
if (ready) {
  done('дорожка уже 16 кГц моно');
} else {
  run('ffmpeg', ['-y', '-i', media, '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', '-vn', wav]);
  done(`дорожка приведена к 16 кГц моно (было ${stream.sample_rate} Гц, каналов: ${stream.channels})`);
}

// ── 2. речь → слова ─────────────────────────────────────
step('Распознаю речь — это самая долгая часть');
const transcript = path.join(workDir, 'transcript.json');
const asrArgs = [ASR_SCRIPT, '--wav', wav, '--out', transcript, '--models', modelsDir];
if (quantization) asrArgs.push('--quantization', quantization);
try {
  run(python, asrArgs);
} finally {
  // Служебная дорожка нужна только распознаванию — дальше она лишний вес на диске.
  if (!ready) rmSync(wav, { force: true });
}
const raw = readJSON(transcript);
done(`речь распознана, участков речи: ${raw.speech.length}`);

/**
 * Слова приходят уже собранными, с пунктуацией и заглавными: «запросом,»,
 * «Яндекс.Диска». Чистка и субтитры сравнивают слова без знаков, так что
 * пунктуация им не мешает, а в субтитрах она к месту.
 */
const words = raw.words.filter((w) => w.text.trim());
if (!words.length) stop('Речь не распознана. Проверьте, что в файле действительно есть голос.');

writeJSON(path.join(workDir, 'words.json'), words);
done(`слов: ${words.length}, речь с ${words[0].start.toFixed(2)}с по ${words.at(-1).end.toFixed(2)}с`);

meta.stage = 'cleanup';
writeJSON(path.join(dir, 'meta.json'), meta);

say(`\n  Дальше — чистка запинок:  node scripts/cleanup.mjs --project ${meta.id}\n`);
