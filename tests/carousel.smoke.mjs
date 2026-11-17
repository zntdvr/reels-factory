// Настоящий рендер синтетического поста. Не обращается к ElevenLabs и не публикует контент.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import path from 'node:path';
import { loadCarousel } from '../scripts/lib/carousel.mjs';
import { p, readJSON, writeJSON } from '../scripts/lib/util.mjs';

const dir = mkdtempSync(p('projects', 'test-carousel-'));
const id = path.basename(dir);
const browser = process.env.CAROUSEL_BROWSER;
function run(action, extra = []) {
  return spawnSync(process.execPath, [p('scripts/carousel.mjs'), action, '--project', id,
    ...(browser ? ['--browser-executable', browser] : []), ...extra], { encoding: 'utf8', timeout: 120000 });
}
function success(result) { assert.equal(result.status, 0, result.stderr || result.error?.message); }
try {
  writeJSON(path.join(dir, 'meta.json'), { id, title: 'Тест', content: { type: 'carousel' } });
  const deck = { title: 'Проверка', canvas: { width: 1080, height: 1350 }, slides: [
    { id: 'cover', role: 'cover', title: 'Кто отвечает за IT:', body: 'Проверьте, кто управляет доступами.' },
    { id: 'cta', role: 'cta', title: 'Начните с главного', body: 'Сохраните вопросы для разговора с командой.' },
  ] };
  writeJSON(path.join(dir, 'carousel.json'), deck);
  assert.notEqual(run('export').status, 0, 'Export must require approval');
  success(run('preview'));
  const preview = readJSON(path.join(dir, 'work/carousel-session.json')).preview;
  const first = path.join(dir, preview.directory, '01-cover.png');
  const png = readFileSync(first);
  assert.equal(png.readUInt32BE(16), 1080);
  assert.equal(png.readUInt32BE(20), 1350);
  assert.ok(existsSync(path.join(dir, preview.directory, 'index.html')));
  mkdirSync(path.join(dir, 'source'));
  copyFileSync(first, path.join(dir, 'source/fixture.png'));
  deck.slides[0].image = { src: 'source/fixture.png', alt: 'Тестовое изображение' };
  writeJSON(path.join(dir, 'carousel.json'), deck);
  const revision = loadCarousel(dir).revision;
  success(run('approve', ['--revision', revision])); // Утверждение только синтетической тестовой фикстуры.
  success(run('export'));
  const exported = readJSON(path.join(dir, 'work/carousel-session.json')).export;
  assert.deepEqual(readJSON(path.join(dir, exported.directory, 'manifest.json')).files, ['01-cover.png', '02-cta.png']);
  assert.deepEqual(readFileSync(first), png, 'Export must preserve the previous preview');
  deck.slides[0].title = 'Изменённый заголовок';
  writeJSON(path.join(dir, 'carousel.json'), deck);
  assert.notEqual(run('export').status, 0, 'Changed content must invalidate approval');
  deck.slides[0].body = 'Очень длинный текст. '.repeat(200);
  writeJSON(path.join(dir, 'carousel.json'), deck);
  const overflow = run('preview');
  assert.notEqual(overflow.status, 0);
  assert.match(overflow.stderr, /не помещаются/);
  assert.equal(readdirSync(path.join(dir, 'work')).filter((name) => name.startsWith('carousel-preview-')).length, 1, 'Failed output must be removed');
  assert.ok(existsSync(path.join(dir, exported.directory, '01-cover.png')), 'A failed preview must preserve the export');
  console.log('Carousel smoke: preview, PNG dimensions, ordered export, revision checks, overflow rejection and preservation passed.');
} finally { rmSync(dir, { recursive: true, force: true }); }
