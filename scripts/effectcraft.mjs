#!/usr/bin/env node
import path from 'node:path';
import { requireApproval } from './lib/edit-session.mjs';
import { existsSync, renameSync } from 'node:fs';
import { args, p, readConfig, readJSON, ensureDir, stop, done, writeJSON } from './lib/util.mjs';
import { verifyCraftVideo } from './lib/craft-media.mjs';
import { startCraft } from './lib/craft-client.mjs';

const options = args();
if (![options.project, options.block].every((v) => typeof v === 'string' && /^[a-z0-9-]+$/i.test(v))) stop('Укажите --project ID --block B01');
const config = readConfig();
const dir = p('projects', options.project);
requireApproval(dir);
const { blocks } = readJSON(path.join(dir, 'work/blocks.json'));
const block = blocks.find((b) => b.id === options.block);
if (!block || block.camera || block.visualizer !== 'effectcraft') stop('Нужен графический блок с visualizer: effectcraft в work/blocks.json.');
if (!Number.isInteger(block.frames) || block.frames <= 0) stop('Неверная длина блока.');
const source = path.join(dir, 'effectcraft', `${block.id}.ecproj`);
const planFile = path.join(dir, 'effectcraft', `${block.id}.json`);
const output = path.join(dir, 'work/public/effectcraft', `${block.id}.webm`);
const temporary = path.join(dir, 'work/effectcraft', `${block.id}-${Date.now()}.webm`);
ensureDir(path.dirname(temporary)); ensureDir(path.dirname(output)); ensureDir(path.dirname(source));
let client;
try {
  client = await startCraft('effectcraft', config);
  if (existsSync(source)) {
    await client.tool('open_project', { path: source });
  } else {
    const plan = readJSON(planFile);
    if (!Array.isArray(plan.steps) || !plan.steps.length) throw new Error(`Заполните steps в ${planFile} командами EffectCraft или сохраните композицию в ${source}.`);
    await client.command('comp.new', { name: block.id, width: config.format.width, height: config.format.height, frameRate: config.format.fps, duration: block.frames / config.format.fps });
    await client.tool('batch', { steps: plan.steps, atomic: true });
    await client.tool('save_project', { path: source });
  }
  // Apply timing only to the in-memory render copy, never overwrite the authored source.
  await client.command('comp.settings', { width: config.format.width, height: config.format.height, frameRate: config.format.fps, duration: block.frames / config.format.fps });
  // Imported projects may contain old queued outputs. Disable them before adding ours.
  const queue = await client.command('renderQueue.list');
  for (const item of queue.items ?? []) await client.command('renderQueue.setRender', { item: item.id, render: false });
  await client.command('renderQueue.add', { format: 'webm', channels: 'rgba', webmCodec: 'vp9', audio: 'off', output: temporary, timeSpan: 'comp' });
  const rendered = await client.command('renderQueue.render', { wait: true });
  if (!existsSync(temporary)) throw new Error(`EffectCraft не создал клип: ${JSON.stringify(rendered)}`);
  verifyCraftVideo(temporary, { ...config.format, frames: block.frames, alpha: true });
  renameSync(temporary, output);
  writeJSON(path.join(dir, 'work/effectcraft', `${block.id}.render.json`), { source, output, frames: block.frames, format: config.format });
  done(output);
} catch (error) { process.exitCode = 1; console.error(error.message); }
finally { client?.close(); }
