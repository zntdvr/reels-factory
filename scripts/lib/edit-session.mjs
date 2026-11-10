import path from 'node:path';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { p, readJSON, writeJSON } from './util.mjs';

export const sessionFile = (dir) => path.join(dir, 'work/edit-session.json');
export const readSession = (dir) => existsSync(sessionFile(dir)) ? readJSON(sessionFile(dir)) : null;
export const saveSession = (dir, state) => writeJSON(sessionFile(dir), state);
const hash = (value) => createHash('sha256').update(value).digest('hex');
const blocksFile = (dir) => path.join(dir, 'work/blocks.json');
const planFile = (dir) => path.join(dir, 'work/plan.md');

function validatePlan(data) {
  if (!Number.isFinite(data.fps) || data.fps <= 0 || !data.blocks?.length) throw new Error('Нет корректной разметки блоков.');
  const ids = new Set();
  for (const b of data.blocks) {
    if (!/^[a-z0-9-]+$/i.test(b.id) || ids.has(b.id.toLowerCase())) throw new Error('Нужны уникальные ID сцен.');
    ids.add(b.id.toLowerCase());
    if (!Number.isInteger(b.frames) || b.frames < 1) throw new Error(`Некорректная длительность ${b.id}`);
    if (!b.camera && !['remotion', 'animator', 'effectcraft', 'blender', 'footage'].includes(b.visualizer)) throw new Error(`Выберите инструмент ${b.id}`);
    if (typeof b.camera !== 'boolean') throw new Error(`Укажите camera: true/false у ${b.id}`);
    if (typeof b.metaphor !== 'string' || !b.metaphor.trim()) throw new Error(`Опишите действие в кадре: metaphor у ${b.id}`);
    if (typeof b.transition !== 'string' || !b.transition || (b.sfx !== false && !Array.isArray(b.sfx))) throw new Error(`Укажите transition и sfx у ${b.id} (false — осознанная тишина).`);
  }
  if (data.blocks.reduce((n, b) => n + b.frames, 0) !== data.totalFrames) throw new Error('Сумма кадров не совпадает с дорожкой.');
}

function revisionNow(dir) {
  return hash(JSON.stringify(readJSON(blocksFile(dir))) + '\n' + readFileSync(planFile(dir), 'utf8'));
}

export function writePlan(dir) {
  const data = readJSON(blocksFile(dir));
  validatePlan(data);
  const meta = readJSON(path.join(dir, 'meta.json'));
  let frame = 0;
  const text = `# Монтажный план: ${meta.title}\n\n` + data.blocks.map((b) => {
    const start = frame / data.fps; frame += b.frames;
    return `## ${b.id} · ${start.toFixed(2)}–${(frame / data.fps).toFixed(2)} с\n\n` +
      `Речь: ${b.text}\n\nКадр: ${b.metaphor}\n\nИнструмент: ${b.camera ? 'камера' : b.visualizer}\n\n` +
      `Переход: ${b.transition}\n\nЗвук: ${JSON.stringify(b.sfx)}\n`;
  }).join('\n');
  writeFileSync(planFile(dir), text);
  const revision = revisionNow(dir);
  const state = readSession(dir) ?? {};
  saveSession(dir, { ...state, revision });
  return { text, revision };
}

export function approvePlan(dir, revision) {
  const current = revisionNow(dir);
  if (revision !== current) throw new Error('Версия плана изменилась; покажите пользователю текущий план.');
  validatePlan(readJSON(blocksFile(dir)));
  saveSession(dir, { ...readSession(dir), revision: current, approval: current });
}

export function requireApproval(dir) {
  const state = readSession(dir);
  if (!state) return; // Existing standalone projects retain their current commands.
  if (!state.approval) throw new Error('Сначала покажите монтажный план и дождитесь утверждения пользователя: npm run edit -- plan --project ID');
  if (state.approval !== revisionNow(dir)) throw new Error('План или блоки изменились после утверждения; покажите и утвердите новую версию.');
}

/** Text inputs are hashed; generated media use size+mtime to avoid reading gigabytes. */
export function sourceSnapshot(dir) {
  const result = {};
  const collect = (root, prefix, media = false) => {
    if (!existsSync(root)) return;
    const visit = (file, key) => {
      const stat = statSync(file);
      if (stat.isDirectory()) for (const name of readdirSync(file).sort()) visit(path.join(file, name), `${key}/${name}`);
      else if (stat.isFile()) result[key] = media ? `${stat.size}:${stat.mtimeMs}` : hash(readFileSync(file));
    };
    visit(root, prefix);
  };
  for (const folder of ['core', 'style', 'config']) collect(p(folder), `shared/${folder}`);
  for (const name of ['reel.tsx', 'captions.json', 'scenes', 'animator', 'blender', 'effectcraft', 'footage']) collect(path.join(dir, name), name);
  collect(path.join(dir, 'work/public'), 'media', true);
  collect(p('public'), 'shared/public', true);
  return result;
}

export function checkUpdateSources(before, after, ids) {
  if (ids === 'all') return;
  const changed = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter((key) => before[key] !== after[key]);
  const outside = changed.filter((key) => !ids.some((id) => {
    const base = path.basename(key).split('.')[0].toLowerCase();
    return !key.startsWith('shared/') && base === id.toLowerCase();
  }));
  if (outside.length) throw new Error(`Изменены общие файлы или другие сцены: ${outside.join(', ')}. Обновите --block all.`);
}
