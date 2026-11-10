#!/usr/bin/env node
/**
 * ВИДЕОВСТАВКИ — живые кадры под фразу: «Лондон — самый большой город»,
 * и на экране Лондон.
 *
 *     npm run footage -- --project ID --block b03           найти и нарезать
 *     npm run footage -- --project ID --block b03 --pick 2  взять другой вариант
 *     npm run footage                                       что лежит в банке
 *     npm run footage -- --add <файл или ссылка> --title "…" --license "…"
 *     npm run footage -- --find "aerial view of a city at night"
 *     npm run footage -- --remove <имя>
 *
 * Откуда берутся кадры, по очереди:
 *
 *   банк       свои отрывки в папке footage/. Права — у владельца, ищется мгновенно;
 *   Pexels     бесплатный фотобанк, лицензия разрешает коммерческое использование.
 *              Работает, если в .env есть PEXELS_API_KEY;
 *   YouTube    по умолчанию только видео с лицензией Creative Commons —
 *              переключатели footage.youtube и footage.creativeCommonsOnly.
 *
 * КАК ВЫБИРАЕТСЯ КУСОК. Из каждого кандидата берётся превью в низком качестве,
 * кадр раз в секунду. Модель CLIP на этом компьютере ставит каждой секунде
 * оценку, насколько она похожа на описание из плана, и находит окно ровно на
 * длину блока озвучки. Токены ИИ на это не тратятся: ИИ смотрит одну
 * раскадровку с лучшими вариантами и, если первый не годится, берёт другой
 * через --pick. В хорошем качестве скачивается только выбранный кусок.
 *
 * План блока — projects/ID/footage/BLOCK.json, его создаёт каркас:
 *   query     1–3 описания кадра по-английски, как подпись к фотографии;
 *   search    поисковая строка для YouTube и Pexels (по умолчанию — первое описание);
 *   negative  чего в кадре быть не должно, дополнительно к общему списку;
 *   sources   откуда искать: bank, pexels, youtube;
 *   picked    что выбрано — заполняет эта команда.
 */
import { copyFileSync, existsSync, readdirSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';
import { requireApproval } from './lib/edit-session.mjs';
import { spawn, spawnSync } from 'node:child_process';
import {
  args, done, ensureDir, has, isWindows, mediaDuration, note, p, problem, readConfig, readEnv, readJSON,
  say, slugify, step, stop, writeJSON,
} from './lib/util.mjs';
import { bestWindow, busyBySource } from './lib/footage-pick.mjs';

const options = args(process.argv.slice(2), { boolean: ['list', 'refresh'] });
const config = readConfig();
const settings = {
  enabled: true,
  youtube: true,
  creativeCommonsOnly: true,
  pexels: true,
  candidates: 4,
  previewSeconds: 150,
  maxSlowdown: 1.5,
  minScore: 0.24,
  ...(config.footage ?? {}),
};
if (settings.enabled === false) stop('Видеовставки выключены в config/project.json (footage.enabled).');

const FOOTAGE_VENV = p('tools', 'footage-venv');
const python = isWindows ? path.join(FOOTAGE_VENV, 'Scripts', 'python.exe') : path.join(FOOTAGE_VENV, 'bin', 'python');
const CLIP_SCRIPT = p('scripts', 'footage', 'clip.py');
const MODELS = p(config.transcribe?.models ?? 'models', 'clip');
const BANK_DIR = p('footage');
const BANK_FILE = path.join(BANK_DIR, 'bank.json');
const { width: W, height: H, fps: FPS } = config.format;

/**
 * Чего во вставке быть не должно никогда: говорящий в камеру человек спорит с
 * правилом «человек или графика», надписи спорят с нашими субтитрами, а
 * логотипы и водяные знаки — чужой бренд в нашем ролике.
 */
const NEGATIVE = [
  'a person talking to the camera, vlogger, presenter',
  'text, title card, subtitles on screen',
  'logo, watermark, channel intro',
  'black screen, blurry frame',
];

// ── мелочи ──────────────────────────────────────────────
function exec(command, argv, { timeout = 600000, quiet = true } = {}) {
  const result = spawnSync(command, argv, {
    encoding: 'utf8', timeout, maxBuffer: 256 * 1024 * 1024, stdio: quiet ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });
  if (result.error) throw new Error(`${command}: ${result.error.message}`);
  if (result.status !== 0) {
    throw new Error(`${command} завершился с ошибкой:\n${(result.stderr || '').trim().split('\n').slice(-5).join('\n')}`);
  }
  return result.stdout ?? '';
}

/** Как exec, но без ожидания: для параллельных закачек. Возвращает null или текст ошибки. */
function execAsync(command, argv, timeout = 300000) {
  return new Promise((resolve) => {
    const child = spawn(command, argv, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (chunk) => { stderr = (stderr + chunk).slice(-2000); });
    const timer = setTimeout(() => child.kill('SIGKILL'), timeout);
    child.on('error', (error) => { clearTimeout(timer); resolve(error.message); });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve(code === 0 ? null : (stderr.trim().split('\n').pop() || `код ${code}`));
    });
  });
}

function clip(command, extra) {
  if (!existsSync(python)) stop('Модель подбора вставок не установлена. Запустите npm run install-deps.');
  return exec(python, [CLIP_SCRIPT, command, '--models', MODELS, ...extra]);
}

function clipScore(items, plan, file) {
  writeJSON(file, {
    query: plan.query,
    negative: [...NEGATIVE, ...(plan.negative ?? [])],
    items: items.map((c) => ({ id: c.key, frames: c.frames })),
  });
  return JSON.parse(clip('score', ['--request', file]));
}

/** Кадр раз в секунду, маленький: модели хватает, а место и время экономятся. */
function sampleFrames(video, folder) {
  if (existsSync(path.join(folder, 'f_0001.jpg'))) return;
  ensureDir(folder);
  exec('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', video, '-vf', 'fps=1,scale=480:-2', '-q:v', '4', path.join(folder, 'f_%04d.jpg')]);
}

const frameCount = (folder) => readdirSync(folder).filter((n) => /^f_\d+\.jpg$/.test(n)).length;

/**
 * yt-dlp берётся свой, из окружения вставок: системный часто устаревает, и
 * YouTube отвечает ему отказом. Node есть на любой машине с фабрикой, поэтому
 * он разрешён как запасной движок для проверок YouTube, если нет deno.
 */
const ytDlpBin = () => {
  const own = path.join(FOOTAGE_VENV, isWindows ? 'Scripts/yt-dlp.exe' : 'bin/yt-dlp');
  return existsSync(own) ? own : has('yt-dlp') ? 'yt-dlp' : null;
};
const ytDlp = ytDlpBin;
function yt(argv, opts) {
  const bin = ytDlpBin();
  const full = ['--no-warnings', '--js-runtimes', 'node', ...argv];
  try {
    return exec(bin, full, opts);
  } catch (first) {
    // Отказы YouTube бывают случайными: одна повторная попытка снимает большую часть.
    return exec(bin, full, opts);
  }
}
const fontPath = ['/System/Library/Fonts/Supplemental/Arial.ttf', 'C:\\Windows\\Fonts\\arial.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf']
  .find((f) => existsSync(f)) ?? '';

function readBank() {
  return existsSync(BANK_FILE) ? readJSON(BANK_FILE) : { clips: [] };
}

// ── банк: показать, добавить, убрать, найти ─────────────
if (!options.project) {
  const bank = readBank();

  if (options.add) {
    const ref = String(options.add);
    const isLink = /^https?:\/\//i.test(ref);
    ensureDir(path.join(BANK_DIR, 'clips'));
    const name = slugify(options.title ? String(options.title) : isLink ? new URL(ref).pathname.split('/').pop() || 'clip' : path.parse(ref).name);
    const unique = bank.clips.some((c) => c.name === name) ? `${name}-${bank.clips.length + 1}` : name;
    const target = path.join(BANK_DIR, 'clips', `${unique}.mp4`);

    step(isLink ? 'Скачиваю отрывок' : 'Беру файл');
    const raw = path.join(BANK_DIR, 'clips', `.${unique}.source`);
    try {
      if (isLink) {
        const tool = ytDlp();
        if (!tool) stop('Для ссылок нужен yt-dlp. Запустите npm run install-deps.');
        yt(['--no-playlist', '-f', 'bv*[height<=1080]+ba/b[height<=1080]/b', '--merge-output-format', 'mp4', '-o', raw, ref], { quiet: false });
        const got = readdirSync(path.dirname(raw)).find((f) => f.startsWith(path.basename(raw)));
        if (!got) throw new Error('файл не скачался');
        if (path.join(path.dirname(raw), got) !== raw) copyFileSync(path.join(path.dirname(raw), got), raw);
      } else {
        const from = path.resolve(process.cwd(), ref);
        if (!existsSync(from)) stop(`Файла нет: ${from}`);
        copyFileSync(from, raw);
      }
      step('Перевожу в общий формат');
      exec('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', raw, '-an', '-c:v', 'libx264', '-crf', '18', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', target]);
    } catch (error) {
      stop(`Не получилось взять отрывок.\n\n${error.message}`);
    } finally {
      for (const f of readdirSync(path.dirname(raw))) if (f.startsWith(path.basename(raw))) rmSync(path.join(path.dirname(raw), f), { force: true });
    }

    step('Размечаю кадры для поиска');
    const frames = path.join(BANK_DIR, 'frames', unique);
    sampleFrames(target, frames);
    clip('embed', ['--frames', frames]);

    bank.clips.push({
      name: unique,
      file: path.relative(p(), target).split(path.sep).join('/'),
      frames: path.relative(p(), frames).split(path.sep).join('/'),
      title: options.title ? String(options.title) : unique,
      seconds: Math.round(mediaDuration(target)),
      license: options.license ? String(options.license) : 'свой файл — за права отвечает владелец',
      source: isLink ? ref : 'добавлен с этого компьютера',
    });
    writeJSON(BANK_FILE, bank);
    done(`в банке: ${unique}`);
    process.exit(0);
  }

  if (options.remove) {
    const index = bank.clips.findIndex((c) => c.name === String(options.remove));
    if (index === -1) stop(`В банке нет отрывка «${options.remove}». Список: npm run footage`);
    const [gone] = bank.clips.splice(index, 1);
    rmSync(p(gone.file), { force: true });
    rmSync(p(gone.frames), { recursive: true, force: true });
    writeJSON(BANK_FILE, bank);
    done(`убрал: ${gone.title}`);
    process.exit(0);
  }

  if (options.find) {
    if (!bank.clips.length) stop('Банк пуст — искать негде. Добавьте отрывки: npm run footage -- --add <файл>');
    const items = bank.clips.map((c) => ({ key: c.name, frames: p(c.frames) }));
    const scored = clipScore(items, { query: [String(options.find)] }, path.join(BANK_DIR, '.find.json'));
    const ranked = bank.clips
      .map((c) => {
        const s = scored[c.name]?.scores ?? [];
        const at = s.indexOf(Math.max(...s));
        return { c, best: s[at] ?? 0, at };
      })
      .sort((a, b) => b.best - a.best)
      .slice(0, 8);
    say(`\n  Лучшее в банке по запросу «${options.find}»:\n`);
    for (const { c, best, at } of ranked) say(`  ${best.toFixed(3)}  ${c.name}  — ${at}-я секунда · ${c.title}`);
    say('');
    process.exit(0);
  }

  say(`\n  Банк видеоотрывков — ${bank.clips.length} шт.\n`);
  if (!bank.clips.length) note('пока пусто: свои отрывки добавляются через --add');
  for (const c of bank.clips) say(`  ${c.name} · ${c.seconds}с · ${c.license}${existsSync(p(c.file)) ? '' : '  ! файла нет'}`);
  say('\n  Добавить:  npm run footage -- --add <файл или ссылка> --title "что в кадре"\n');
  process.exit(0);
}

// ── вставка для блока ───────────────────────────────────
if (!options.block) stop('Укажите блок: npm run footage -- --project ID --block b03');
const blockId = String(options.block);
if (!/^[a-z0-9-]+$/i.test(blockId)) stop('Имя блока может содержать только латинские буквы, цифры и дефис.');

const projectDir = p('projects', String(options.project));
requireApproval(projectDir);
const meta = readJSON(path.join(projectDir, 'meta.json'));
const { blocks } = readJSON(path.join(projectDir, 'work', 'blocks.json'));
const block = blocks.find((b) => b.id === blockId);
if (!block) stop(`Блок «${blockId}» не найден в work/blocks.json.`);
if (block.camera) stop(`Блок «${blockId}» отдан камере. Вставка ставится на блок, где человека не видно.`);
if (block.visualizer !== 'footage') stop(`Для блока «${blockId}» не выбрана вставка. Укажите visualizer: "footage" в work/blocks.json и пересоберите каркас.`);

const planFile = path.join(projectDir, 'footage', `${blockId}.json`);
if (!existsSync(planFile)) stop(`Нет плана вставки: ${path.relative(p(), planFile)}. Запустите каркас.`);
const plan = readJSON(planFile);
plan.query = (Array.isArray(plan.query) ? plan.query : [plan.query]).filter((q) => q && String(q).trim());
if (!plan.query.length) stop(`В плане ${path.relative(p(), planFile)} пустой query. Опишите кадр по-английски, как подпись к фото: "aerial view of London skyline".`);

const workDir = path.join(projectDir, 'work', 'footage');
const cacheDir = path.join(workDir, 'cache');
const blockDir = path.join(workDir, blockId);
const candidatesFile = path.join(blockDir, 'candidates.json');
const outputDir = path.join(projectDir, 'work', 'public', 'footage');
const output = path.join(outputDir, `${blockId}.mp4`);
ensureDir(cacheDir);
ensureDir(blockDir);
ensureDir(outputDir);

say(`\n  Вставка: ${meta.title} · ${blockId} · ${block.seconds}с\n  «${block.text}»\n`);

let ranked;
if (options.pick && existsSync(candidatesFile) && !options.refresh) {
  ranked = readJSON(candidatesFile).ranked;
} else {
  ranked = await search();
  writeJSON(candidatesFile, { query: plan.query, ranked });
}

if (!ranked.length) {
  stop(
    'Подходящего видео не нашлось. Варианты: переформулировать query и search в плане,\n' +
      'добавить отрывок в банк или отдать блок графике (visualizer: "remotion").',
  );
}

makeSheet(ranked);

const pickIndex = options.pick ? Number(options.pick) - 1 : 0;
const chosen = ranked[pickIndex];
if (!chosen) stop(`Варианта №${options.pick} нет — всего ${ranked.length}.`);
if (chosen.score < settings.minScore) {
  problem(`Даже лучший вариант похож на описание слабо (${chosen.score.toFixed(3)}). Посмотрите раскадровку: возможно, тут лучше графика.`);
}

finalize(chosen);

plan.picked = {
  key: chosen.key, source: chosen.source, title: chosen.title, url: chosen.url, author: chosen.author,
  license: chosen.license, start: chosen.start, end: chosen.end, speed: chosen.speed, crop: chosen.crop,
  score: chosen.score,
};
writeJSON(planFile, plan);

done(path.relative(p(), output));
say(`\n  Раскадровка вариантов: ${path.relative(p(), path.join(blockDir, 'sheet.jpg'))}`);
say(`  Взят №${pickIndex + 1}: ${chosen.title} (${chosen.source}, ${chosen.start}–${chosen.end}с)`);
say(`  Другой вариант: npm run footage -- --project ${meta.id} --block ${blockId} --pick N`);
say(`  Клип подключён к описанию ролика как '${meta.id}/footage/${blockId}.mp4'.\n`);

// ── поиск кандидатов ────────────────────────────────────
async function search() {
  const sources = plan.sources ?? ['bank', 'pexels', 'youtube'];
  const phrase = String(plan.search || plan.query[0]);
  const candidates = [];

  if (sources.includes('bank')) {
    const bank = readBank().clips.filter((c) => existsSync(p(c.file)) && existsSync(p(c.frames)));
    for (const c of bank) {
      candidates.push({
        key: `bank-${c.name}`, source: 'bank', title: c.title, url: c.source, author: 'свой отрывок',
        license: c.license, frames: p(c.frames), preview: p(c.file), full: p(c.file),
      });
    }
    note(`банк: ${bank.length} отрывков`);
  }

  if (sources.includes('pexels') && settings.pexels !== false) {
    const key = readEnv().PEXELS_API_KEY || process.env.PEXELS_API_KEY;
    if (!key) note('Pexels пропущен: нет PEXELS_API_KEY в .env');
    else {
      step(`Ищу на Pexels: «${phrase}»`);
      try {
        candidates.push(...pexels(phrase, key));
      } catch (error) {
        problem(`Pexels не ответил: ${error.message}`);
      }
    }
  }

  if (sources.includes('youtube') && settings.youtube !== false) {
    if (!ytDlp()) note('YouTube пропущен: не установлен yt-dlp (npm run install-deps)');
    else {
      step(`Ищу на YouTube${settings.creativeCommonsOnly ? ' среди Creative Commons' : ''}: «${phrase}»`);
      try {
        candidates.push(...(await youtube(phrase)));
      } catch (error) {
        problem(`YouTube не ответил: ${error.message}`);
      }
    }
  }

  if (!candidates.length) return [];

  step(`Сравниваю кадры с описанием — ${candidates.length} кандидатов`);
  const scores = clipScore(candidates, plan, path.join(blockDir, 'request.json'));

  // Уже взятое другими блоками этого ролика не повторяется.
  const others = readdirSync(path.join(projectDir, 'footage'))
    .filter((f) => f.endsWith('.json') && f !== `${blockId}.json`)
    .map((f) => readJSON(path.join(projectDir, 'footage', f)).picked);
  const busy = busyBySource(others);

  const ranked = [];
  for (const c of candidates) {
    const s = scores[c.key];
    if (!s?.scores?.length) continue;
    let duration;
    try {
      duration = mediaDuration(c.preview);
    } catch {
      duration = undefined; // длина не читается — оценим по числу кадров
    }
    const window = bestWindow({ ...s, seconds: block.seconds, maxSlowdown: settings.maxSlowdown, busy: busy[c.key] ?? [], duration });
    if (window) ranked.push({ ...c, ...window });
  }
  ranked.sort((a, b) => b.score - a.score);
  done(ranked.length ? `лучшее совпадение ${ranked[0].score.toFixed(3)}` : 'ни один кандидат не подошёл по длине');
  return ranked.slice(0, 4);
}

function pexels(phrase, key) {
  const url = `https://api.pexels.com/videos/search?per_page=${settings.candidates}&query=${encodeURIComponent(phrase)}`;
  const data = JSON.parse(exec('curl', ['-fsS', '--max-time', '30', '-H', `Authorization: ${key}`, url]));
  const out = [];
  for (const video of data.videos ?? []) {
    const files = (video.video_files ?? []).filter((f) => f.link && f.width && f.height);
    if (!files.length) continue;
    const side = (f) => Math.min(f.width, f.height);
    const preview = files.filter((f) => side(f) >= 360).sort((a, b) => side(a) - side(b))[0] ?? files[0];
    const full = files.filter((f) => side(f) <= 2160).sort((a, b) => side(b) - side(a))[0] ?? files[0];
    const dir = path.join(cacheDir, `px-${video.id}`);
    ensureDir(dir);
    const previewFile = path.join(dir, 'preview.mp4');
    if (!existsSync(previewFile)) exec('curl', ['-fsSL', '--max-time', '180', '-o', previewFile, preview.link]);
    sampleFrames(previewFile, path.join(dir, 'frames'));
    out.push({
      key: `px-${video.id}`, source: 'pexels', title: `Pexels ${video.id}`, url: video.url,
      author: video.user?.name ?? '', license: 'Pexels License — бесплатно, в том числе для рекламы',
      frames: path.join(dir, 'frames'), preview: previewFile, fullUrl: full.link, fullHeight: full.height,
    });
    note(`Pexels ${video.id}: ${video.duration}с`);
  }
  return out;
}

async function youtube(phrase) {
  const filter = settings.creativeCommonsOnly ? '&sp=EgIwAQ%253D%253D' : '';
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(phrase)}${filter}`;
  const list = JSON.parse(yt(['--flat-playlist', '-J', '--playlist-end', String(settings.candidates * 3), url], { timeout: 120000 }));
  const entries = (list.entries ?? [])
    .filter((e) => e.id && e.duration && e.duration >= 4 && e.duration <= 1800 && e.live_status !== 'is_live')
    .slice(0, settings.candidates);

  // Превью качаются все разом: по одному это минуты ожидания, вместе — секунды.
  const findPreview = (dir) => readdirSync(dir).find((f) => /^preview\.(mp4|webm|mkv)$/.test(f));
  const downloads = await Promise.all(entries.map(async (entry) => {
    const dir = path.join(cacheDir, `yt-${entry.id}`);
    ensureDir(dir);
    if (findPreview(dir)) return null;
    const argv = [
      '--no-warnings', '--js-runtimes', 'node', '--no-playlist', '--write-info-json',
      '-f', 'bv*[height<=360][protocol^=m3u8]/bv*[height<=360]/wv*',
      '--download-sections', `*0-${settings.previewSeconds}`,
      '-o', path.join(dir, 'preview.%(ext)s'),
      `https://www.youtube.com/watch?v=${entry.id}`,
    ];
    // Отказы YouTube бывают случайными: одна повторная попытка снимает большую часть.
    return (await execAsync(ytDlpBin(), argv)) ?? (await execAsync(ytDlpBin(), argv));
  }));

  const out = [];
  for (const [index, entry] of entries.entries()) {
    const dir = path.join(cacheDir, `yt-${entry.id}`);
    const previewFile = findPreview(dir);
    if (!previewFile) {
      note(`пропущено «${entry.title}»: ${downloads[index] ?? 'превью не скачалось'}`);
      continue;
    }
    const info = existsSync(path.join(dir, 'preview.info.json')) ? readJSON(path.join(dir, 'preview.info.json')) : {};
    // Фильтр поиска YouTube иногда пропускает чужое. Без явной лицензии в
    // карточке видео кандидат не берётся: за права в кадре отвечает владелец ролика.
    if (settings.creativeCommonsOnly && !/creative commons/i.test(info.license ?? '')) {
      note(`пропущено «${entry.title}»: в карточке нет лицензии Creative Commons`);
      continue;
    }
    try {
      sampleFrames(path.join(dir, previewFile), path.join(dir, 'frames'));
    } catch (error) {
      note(`пропущено «${entry.title}»: ${error.message.split('\n')[0]}`);
      continue;
    }
    out.push({
      key: `yt-${entry.id}`, source: 'youtube', title: entry.title ?? entry.id,
      url: `https://www.youtube.com/watch?v=${entry.id}`, author: info.uploader ?? entry.channel ?? '',
      license: info.license ?? (settings.creativeCommonsOnly ? 'Creative Commons (по фильтру поиска)' : 'не указана — проверьте права'),
      frames: path.join(dir, 'frames'), preview: path.join(dir, previewFile),
    });
    note(`YouTube «${entry.title}»: ${entry.duration}с`);
  }
  return out;
}

// ── раскадровка для проверки глазами ────────────────────
function makeSheet(list) {
  const tiles = list.map((c, i) => {
    const middle = Math.min(frameCount(c.frames), Math.floor((c.start + c.end) / 2) + 1);
    const image = path.join(c.frames, `f_${String(Math.max(1, middle)).padStart(4, '0')}.jpg`);
    return { image, crop: c.crop, label: `${c.source} ${c.score.toFixed(3)}`, detail: `${c.start}-${c.end}s · ${c.title}`, n: i + 1 };
  });
  const request = path.join(blockDir, 'sheet.request.json');
  writeJSON(request, { tiles, out: path.join(blockDir, 'sheet.jpg'), font: fontPath });
  exec(python, [CLIP_SCRIPT, 'sheet', '--request', request]);
}

// ── нарезка выбранного куска ────────────────────────────
function finalize(c) {
  step(`Режу выбранный кусок в хорошем качестве`);
  /**
   * Целиком исходник не скачивается: ffmpeg сам прыгает в нужную секунду
   * потока и читает только её. Для YouTube берётся HLS — он режется за
   * секунды, а одиночный файл YouTube отдаёт медленно и с обрывами.
   */
  let input = [];
  let height = 0;
  if (c.source === 'youtube') {
    const info = JSON.parse(yt([
      '--no-playlist', '-J',
      '-f', 'bv*[height<=1080][protocol^=m3u8]/bv*[height<=1080][protocol^=http]/bv*[height<=1080]/b',
      c.url,
    ], { timeout: 180000 }));
    const format = info.requested_formats?.[0] ?? info;
    if (!format.url) stop('YouTube не отдал выбранный кусок. Попробуйте --pick 2.');
    const headers = Object.entries(format.http_headers ?? {}).map(([k, v]) => `${k}: ${v}\r\n`).join('');
    input = [...(headers ? ['-headers', headers] : []), '-ss', String(c.start), '-i', format.url];
    height = format.height ?? 0;
  } else if (c.source === 'pexels') {
    input = ['-ss', String(c.start), '-i', c.fullUrl];
    height = c.fullHeight ?? 0;
  } else {
    input = ['-ss', String(c.start), '-i', c.full];
  }

  step('Режу вертикаль под длину блока');
  // Вертикаль вырезается там, где CLIP нашёл главное, затем кадр доводится до
  // размера ролика. Короткий исходник замедляется, но не больше чем в maxSlowdown.
  const slow = c.speed < 1 ? `setpts=PTS/${c.speed},` : '';
  const filter = [
    `crop='min(iw,ih*${W}/${H})':'min(ih,iw*${H}/${W})':'(iw-ow)*${c.crop}':'(ih-oh)/2'`,
    `scale=${W}:${H}:flags=lanczos`, 'setsar=1', `${slow}fps=${FPS}`,
    'tpad=stop_mode=clone:stop_duration=2',
  ].join(',');
  exec('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error', ...input,
    '-vf', filter, '-frames:v', String(block.frames), '-an',
    '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', output,
  ], { timeout: 600000 });

  // parseInt, а не Number: при служебных данных в потоке ffprobe дописывает хвостовую запятую.
  const counted = parseInt(exec('ffprobe', ['-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', output]), 10);
  if (counted !== block.frames) stop(`Во вставке ${counted} кадров вместо ${block.frames}. Сообщите об этом.`);

  if (!height && c.source === 'bank') {
    height = parseInt(exec('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=height', '-of', 'csv=p=0', c.full]), 10) || 0;
  }
  if (height && height < 720) note(`исходник всего ${height}p — во весь экран будет мягковато`);
  if (statSync(output).size < 50_000) problem('вставка подозрительно маленькая — проверьте её глазами');
}
