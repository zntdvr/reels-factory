import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync, symlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { readCatalog, resolveContent, requireVideo, validateContentBlocks } from '../scripts/lib/content.mjs';
import { loadCarousel, validateCarousel, carouselPreview } from '../scripts/lib/carousel.mjs';
import { writePlan, approvePlan, requireApproval } from '../scripts/lib/edit-session.mjs';
import { p, readJSON, writeJSON, today } from '../scripts/lib/util.mjs';

const deck = () => ({ title: 'Проверка', slides: [
  { id: 'cover', role: 'cover', title: 'Вопрос:' },
  { id: 'cta', role: 'cta', title: 'Сохраните' },
] });
const block = { id: 'b01', camera: false, visualizer: 'remotion', frames: 30, metaphor: 'Движение', transition: 'cut', sfx: false, text: 'Текст' };
const cli = (file, args) => spawnSync(process.execPath, [p('scripts', file), ...args], { encoding: 'utf8' });

test('formats are extensible data and incompatible type/format pairs fail', () => {
  const catalog = readCatalog();
  catalog.types.reel.formats.explainer = { ...catalog.types.reel.formats['presenter-cutaways'], camera: 'forbidden' };
  assert.equal(resolveContent({ type: 'reel', format: 'explainer' }, catalog).recipe.camera, 'forbidden');
  assert.throws(() => resolveContent({ type: 'carousel', format: 'narrated-story' }), /Неизвестный формат/);
  assert.throws(() => resolveContent({ type: 'missing' }), /Неизвестный вид/);
  assert.throws(() => requireVideo({ content: { type: 'carousel' } }), /карусель/);
});

test('history forbids a presenter/avatar and limits tools; old projects keep existing behavior', () => {
  const meta = { content: { type: 'history' }, clean: { kind: 'video' } };
  assert.throws(() => validateContentBlocks(meta, [{ ...block, camera: true }]), /нет ведущего/);
  assert.throws(() => validateContentBlocks({ ...meta, avatar: {} }, [block]), /аватара/);
  assert.throws(() => validateContentBlocks(meta, [{ ...block, visualizer: 'blender' }]), /не входит/);
  assert.doesNotThrow(() => validateContentBlocks(meta, [block]));
  assert.doesNotThrow(() => validateContentBlocks({}, [{ ...block, visualizer: 'blender' }]));
});

test('presenter format requires camera and graphics for video, accepts audio-only input', () => {
  const meta = { content: { type: 'reel' }, clean: { kind: 'video' } };
  assert.throws(() => validateContentBlocks(meta, [block, { ...block, id: 'b02' }]), /и камерные/);
  assert.doesNotThrow(() => validateContentBlocks(meta, [block, { ...block, id: 'b02', camera: true }]));
  assert.doesNotThrow(() => validateContentBlocks({ ...meta, clean: { kind: 'audio' } }, [block]));
});

test('changing a video format invalidates its approved plan', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'content-plan-'));
  try {
    const meta = { id: 'test', title: 'Test', content: { type: 'history' }, clean: { kind: 'audio' } };
    writeJSON(path.join(dir, 'meta.json'), meta);
    writeJSON(path.join(dir, 'work/blocks.json'), { fps: 30, totalFrames: 30, blocks: [block] });
    const { revision } = writePlan(dir);
    approvePlan(dir, revision);
    requireApproval(dir);
    meta.content = { type: 'reel' };
    writeJSON(path.join(dir, 'meta.json'), meta);
    assert.throws(() => requireApproval(dir), /измен/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('carousel validates order, count, dimensions, and duplicate ids', () => {
  const { recipe } = resolveContent({ type: 'carousel' });
  assert.deepEqual(validateCarousel(deck(), recipe).canvas, { width: 1080, height: 1350 });
  assert.throws(() => validateCarousel({ ...deck(), slides: [] }, recipe), /от 2 до 9/);
  assert.throws(() => validateCarousel({ ...deck(), canvas: { width: -1, height: 1350 } }, recipe), /canvas/);
  const wrong = deck(); wrong.slides[0].role = 'content';
  assert.throws(() => validateCarousel(wrong, recipe), /role: cover/);
  wrong.slides[0].role = 'cover'; wrong.slides[1].id = 'cover';
  assert.throws(() => validateCarousel(wrong, recipe), /уникальные/);
  delete wrong.slides[0].id;
  assert.throws(() => validateCarousel(wrong, recipe), /уникальные/);
});

test('carousel revision includes image bytes and rejects files outside the project', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'carousel-'));
  try {
    writeJSON(path.join(dir, 'meta.json'), { content: { type: 'carousel' } });
    const value = deck();
    value.slides[0].image = { src: 'source/image.png', alt: 'Иллюстрация' };
    mkdirSync(path.join(dir, 'source'));
    writeFileSync(path.join(dir, 'source/image.png'), 'first image');
    writeJSON(path.join(dir, 'carousel.json'), value);
    const before = loadCarousel(dir).revision;
    writeFileSync(path.join(dir, 'source/image.png'), 'changed image');
    assert.notEqual(loadCarousel(dir).revision, before);
    value.slides[0].image.src = 'source/../../../etc/passwd';
    writeJSON(path.join(dir, 'carousel.json'), value);
    assert.throws(() => loadCarousel(dir));
    symlinkSync(p('package.json'), path.join(dir, 'source/link.png'));
    value.slides[0].image.src = 'source/link.png';
    writeJSON(path.join(dir, 'carousel.json'), value);
    assert.throws(() => loadCarousel(dir), /выходит за папку/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('preview escapes author text and offers ordered image downloads', () => {
  const value = deck(); value.title = '<script>alert(1)</script>';
  value.slides[0].title = '"><script>bad</script>';
  const html = carouselPreview(value, ['AAAA', 'BBBB']);
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('01-cover.png'));
  assert.ok(html.includes('02-cta.png'));
});

test('intake routes all content types without creating video artifacts for carousel', () => {
  for (const type of ['history', 'reel', 'carousel']) {
    const name = `test-content-${type}-${process.pid}`;
    const id = `${today()}-${name}`;
    const dir = p('projects', id);
    try {
      const result = cli('intake.mjs', ['--name', name, '--type', type, '--topic', 'Тест']);
      assert.equal(result.status, 0, result.stderr);
      const meta = readJSON(path.join(dir, 'meta.json'));
      assert.equal(meta.content.type, type);
      assert.equal(meta.stage, type === 'carousel' ? 'slides' : 'script');
      assert.equal(existsSync(path.join(dir, 'carousel.json')), type === 'carousel');
      assert.ok(!existsSync(path.join(dir, 'reel.tsx')));
      if (type === 'carousel') {
        for (const script of ['tts.mjs', 'transcribe.mjs', 'cleanup.mjs', 'render.mjs', 'avatar.mjs']) {
          const rejected = cli(script, ['--project', id]);
          assert.notEqual(rejected.status, 0);
          assert.match(rejected.stderr, /карусель/);
        }
        writeJSON(path.join(dir, 'carousel.json'), deck());
        const rejected = cli('carousel.mjs', ['export', '--project', id]);
        assert.notEqual(rejected.status, 0);
        assert.match(rejected.stderr, /согласуйте/);
      }
    } finally { rmSync(dir, { recursive: true, force: true }); }
  }
});
