#!/usr/bin/env node
/**
 * БАЗА ЗНАНИЙ. Сырьё для сценариев: свои эфиры, кейсы, заметки — и чужие
 * книги, статьи, видео. Сценарий без опоры на базу выходит «средним по
 * интернету»; с опорой — на истории и позиции, которых нет у других.
 *
 *     node scripts/kb.mjs                              что лежит в базе
 *     node scripts/kb.mjs --add <файл или ссылка>      положить материал
 *          [--kind own|source] [--title "Название"] [--source <ссылка>]
 *     node scripts/kb.mjs --search "слова через пробел" найти опоры под тему
 *     node scripts/kb.mjs --used <заметка> --project ID отметить, что опора ушла в ролик
 *
 * Скрипт делает механику: превращает материал в текст (расшифровка звука —
 * тем же GigaAM, что и озвучка) и заводит пустую заметку. Выжимку в заметку
 * пишет ИИ по сырому тексту — правила в knowledge/README.md.
 *
 * Раскладка:
 *   knowledge/raw/ID.txt     полный текст материала, руками не правится
 *   knowledge/notes/ID.md    выжимка: мысли, истории, цифры, цитаты, позиция
 *   knowledge/voice.md       голос компании и запретные штампы
 */
import { copyFileSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  ASR_SCRIPT, args, asrPython, done, ensureDir, has, note, p, readConfig, readJSON, run, say, slugify, step, stop, today,
} from './lib/util.mjs';

const options = args();
const KB = p('knowledge');
const RAW = path.join(KB, 'raw');
const NOTES = path.join(KB, 'notes');
ensureDir(RAW);
ensureDir(NOTES);

const AUDIO = /\.(mp3|wav|m4a|aac|ogg|opus|flac|mp4|mov|mkv|webm|avi|m4v)$/i;
const TEXT = /\.(txt|md|srt|vtt)$/i;

// ── заметки: чтение шапки ───────────────────────────────
/** Шапка заметки — простые строки «ключ: значение» между ---. */
function readNote(file) {
  const text = readFileSync(file, 'utf8');
  const head = text.match(/^---\n([\s\S]*?)\n---/);
  const meta = {};
  if (head) {
    for (const line of head[1].split('\n')) {
      const m = line.match(/^(\w+):\s*(.*)$/);
      if (m) meta[m[1]] = m[2].trim();
    }
  }
  return { id: path.basename(file, '.md'), file, text, meta };
}

const allNotes = () =>
  readdirSync(NOTES).filter((f) => f.endsWith('.md')).sort().map((f) => readNote(path.join(NOTES, f)));

const usedList = (meta) => (meta.used ?? '').replace(/[[\]]/g, '').split(',').map((s) => s.trim()).filter(Boolean);

// ── отметить использование ──────────────────────────────
if (options.used) {
  if (!options.project) stop('Укажите ролик: --project ID');
  const file = path.join(NOTES, `${String(options.used).replace(/\.md$/, '')}.md`);
  if (!existsSync(file)) stop(`Заметки «${options.used}» нет. Список: node scripts/kb.mjs`);
  const { text, meta } = readNote(file);
  const used = usedList(meta);
  if (!used.includes(String(options.project))) used.push(String(options.project));
  writeFileSync(file, text.replace(/^used:.*$/m, `used: [${used.join(', ')}]`));
  done(`${path.basename(file, '.md')}: использована в ${used.length} ролик(ах)`);
  process.exit(0);
}

// ── поиск ───────────────────────────────────────────────
/**
 * Поиск по корням слов: русские окончания меняются, поэтому слово режется до
 * первых пяти букв. Выжимка весит втрое больше сырого текста — там уже
 * отобрано главное. Уже использованные опоры опускаются вниз: повтор той же
 * истории в соседнем ролике заметен подписчику сразу.
 */
if (options.search) {
  const roots = String(options.search).toLowerCase().split(/[^a-zа-яё0-9]+/i).filter((w) => w.length > 2)
    .map((w) => w.slice(0, 5));
  if (!roots.length) stop('Дайте слова для поиска: --search "сисадмин увольнение"');
  const count = (text) => {
    const low = text.toLowerCase();
    return roots.reduce((sum, r) => sum + (low.split(r).length - 1), 0);
  };
  const hits = allNotes().map((n) => {
    const rawFile = path.join(RAW, `${n.id}.txt`);
    const raw = existsSync(rawFile) ? readFileSync(rawFile, 'utf8') : '';
    const used = usedList(n.meta).length;
    const score = (count(n.text) * 3 + count(raw)) / (1 + used);
    return { ...n, score, used };
  }).filter((h) => h.score > 0).sort((a, b) => b.score - a.score).slice(0, 12);

  if (!hits.length) {
    say('\n  Ничего не нашлось. Попробуйте другие слова или добавьте материал по теме.\n');
    process.exit(0);
  }
  say(`\n  Опоры по запросу «${options.search}»:\n`);
  for (const h of hits) {
    const used = h.used ? `, уже в роликах: ${h.used}` : '';
    say(`  ${h.score.toFixed(1).padStart(5)}  ${h.id}  — ${h.meta.title ?? ''} [${h.meta.kind ?? '?'}${used}]`);
  }
  say('\n  Заметки: knowledge/notes/<id>.md, полный текст: knowledge/raw/<id>.txt\n');
  process.exit(0);
}

// ── список ──────────────────────────────────────────────
if (!options.add) {
  const notes = allNotes();
  if (!notes.length) {
    say('\n  База пока пустая. Добавить: node scripts/kb.mjs --add <файл или ссылка>\n');
    process.exit(0);
  }
  const own = notes.filter((n) => n.meta.kind === 'own').length;
  say(`\n  В базе материалов: ${notes.length} (своих: ${own}, внешних: ${notes.length - own})\n`);
  for (const n of notes) {
    const empty = /status:\s*draft/.test(n.text) ? '  ← выжимка не написана' : '';
    const used = usedList(n.meta).length ? `  в роликах: ${usedList(n.meta).length}` : '';
    say(`  ${n.meta.kind === 'own' ? 'своё ' : 'чужое'}  ${n.id}  — ${n.meta.title ?? ''}${used}${empty}`);
  }
  say('');
  process.exit(0);
}

// ── добавить материал ───────────────────────────────────
const ref = String(options.add);
const isLink = /^https?:\/\//i.test(ref);
const kind = options.kind === 'own' ? 'own' : 'source';
const work = mkdtempSync(path.join(tmpdir(), 'kb-'));

/** Звук → текст тем же распознаванием, что и озвучка роликов. */
function transcribe(media) {
  const python = asrPython();
  if (!existsSync(python)) stop('Распознавание речи не установлено. Запустите: npm run install-deps');
  const config = readConfig().transcribe ?? {};
  const wav = path.join(work, 'audio-16k.wav');
  step('Готовлю дорожку');
  run('ffmpeg', ['-y', '-i', media, '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', '-vn', wav]);
  step('Распознаю речь — на часовой записи это заметное время');
  const out = path.join(work, 'transcript.json');
  const asrArgs = [ASR_SCRIPT, '--wav', wav, '--out', out, '--models', p(config.models ?? 'models')];
  if (config.quantization) asrArgs.push('--quantization', config.quantization);
  run(python, asrArgs);
  // Абзац рвётся на паузе длиннее полутора секунд: так текст читается, а не
  // стоит одной стеной, и в выжимке проще ссылаться на место.
  const words = readJSON(out).words.filter((w) => w.text.trim());
  const paragraphs = [];
  let current = [];
  let last = 0;
  for (const w of words) {
    if (current.length && w.start - last > 1.5) {
      paragraphs.push(current.join(' '));
      current = [];
    }
    if (!current.length) current.push(`[${Math.floor(w.start / 60)}:${String(Math.floor(w.start % 60)).padStart(2, '0')}]`);
    current.push(w.text);
    last = w.end;
  }
  if (current.length) paragraphs.push(current.join(' '));
  done(`распознано слов: ${words.length}`);
  return paragraphs.join('\n\n');
}

/**
 * Ссылка на видео (YouTube, VK, Rutube и прочее) скачивается звуком через
 * yt-dlp. Его нет в системе — он ставится в окружение распознавания один раз.
 */
function ytdlp() {
  const venvBin = path.dirname(asrPython());
  const local = path.join(venvBin, process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');
  if (existsSync(local)) return local;
  if (has('yt-dlp')) return 'yt-dlp';
  step('Ставлю загрузчик видео (один раз)');
  run(asrPython(), ['-m', 'pip', 'install', '--quiet', 'yt-dlp']);
  return local;
}

let text;
let title = options.title ? String(options.title) : '';
let origin = ref;

try {
  if (isLink) {
    step('Скачиваю звук по ссылке');
    const bin = ytdlp();
    try {
      if (!title) title = run(bin, ['--no-playlist', '--print', 'title', '--skip-download', ref]).toString().trim();
      run(bin, ['--no-playlist', '-x', '--audio-format', 'm4a', '-o', path.join(work, 'media.%(ext)s'), ref]);
    } catch {
      stop(
        'По ссылке нет видео или аудио.\n\n' +
          'Если это статья — ИИ откроет страницу сам, сохранит текст в файл и добавит его в базу.',
      );
    }
    const media = readdirSync(work).find((f) => f.startsWith('media.'));
    if (!media) stop('Загрузка не дала файла.');
    text = transcribe(path.join(work, media));
  } else {
    const from = path.isAbsolute(ref) ? ref : path.resolve(process.cwd(), ref);
    if (!existsSync(from)) stop(`Файла нет: ${from}`);
    if (!title) title = path.basename(from).replace(/\.[a-z0-9]+$/i, '');
    // Статью ИИ сохраняет во временный файл — источником тогда пишется ссылка.
    origin = options.source ? String(options.source) : path.basename(from);
    if (AUDIO.test(from)) {
      text = transcribe(from);
    } else if (TEXT.test(from)) {
      text = readFileSync(from, 'utf8');
    } else if (/\.pdf$/i.test(from) && has('pdftotext')) {
      const out = path.join(work, 'text.txt');
      copyFileSync(from, path.join(work, 'source.pdf'));
      run('pdftotext', ['-layout', path.join(work, 'source.pdf'), out]);
      text = readFileSync(out, 'utf8');
    } else {
      stop(
        `Этот формат скрипт сам не читает: ${path.extname(from) || 'без расширения'}.\n\n` +
          'PDF, Word и прочие документы ИИ прочитает сам, сохранит текст в .txt и добавит его в базу.',
      );
    }
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}

if (!text || !text.trim()) stop('Текста в материале не нашлось.');

// Имя — латиницей: кириллица в путях ломает работу на Windows.
let id = `${today()}-${slugify(title)}`;
for (let n = 2; existsSync(path.join(NOTES, `${id}.md`)); n++) id = `${today()}-${slugify(title)}-${n}`;

writeFileSync(path.join(RAW, `${id}.txt`), `${title}\nИсточник: ${origin}\n\n${text.trim()}\n`);
writeFileSync(
  path.join(NOTES, `${id}.md`),
  `---
title: ${title}
kind: ${kind}
source: ${origin}
added: ${today()}
tags: []
used: []
status: draft
---

<!-- Выжимку пишет ИИ по knowledge/raw/${id}.txt — правила в knowledge/README.md -->

## О чём

## Мысли

## Истории и случаи

## Цифры и факты

## Цитаты дословно

## Наша позиция

## Идеи роликов
`,
);

const words = text.trim().split(/\s+/).length;
done(`текст сохранён: knowledge/raw/${id}.txt (слов: ${words})`);
done(`заметка заведена: knowledge/notes/${id}.md`);
note('дальше ИИ пишет выжимку по правилам knowledge/README.md');
say('');
