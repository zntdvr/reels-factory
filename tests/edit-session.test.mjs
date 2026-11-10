import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { writePlan, approvePlan, requireApproval, readSession, sourceSnapshot, checkUpdateSources } from '../scripts/lib/edit-session.mjs';

test('approval pins the shown plan and production rejects changed blocks or plan text', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'edit-plan-'));
  try {
    mkdirSync(path.join(dir, 'work'));
    writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({ id: 'test', title: 'Test' }));
    const data = { fps: 30, duration: 1, totalFrames: 30, blocks: [{ id: 'b01', frames: 30, text: 'Речь', camera: false, visualizer: 'remotion', metaphor: 'Пакет движется к замку', transition: 'cut', sfx: false }] };
    const file = path.join(dir, 'work/blocks.json');
    writeFileSync(file, JSON.stringify(data));
    const { revision, text } = writePlan(dir);
    assert.match(text, /b01/); assert.match(text, /Пакет движется/); assert.match(text, /remotion/);
    assert.throws(() => requireApproval(dir), /утвер/i);
    assert.throws(() => approvePlan(dir, 'old-revision'), /верси/i);
    approvePlan(dir, revision); requireApproval(dir);
    assert.equal(readSession(dir).approval, revision);
    writeFileSync(path.join(dir, 'work/plan.md'), text + '\nПравка');
    assert.throws(() => requireApproval(dir), /измен/i);
    writeFileSync(path.join(dir, 'work/plan.md'), text);
    data.blocks[0].visualizer = 'blender'; writeFileSync(file, JSON.stringify(data));
    assert.throws(() => requireApproval(dir), /измен/i);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('partial update cannot mark changes to another scene as rebuilt', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'edit-sources-'));
  try {
    mkdirSync(path.join(dir, 'scenes'));
    writeFileSync(path.join(dir, 'scenes/B01.tsx'), 'first');
    writeFileSync(path.join(dir, 'scenes/B02.tsx'), 'second');
    const before = sourceSnapshot(dir);
    writeFileSync(path.join(dir, 'scenes/B02.tsx'), 'changed');
    assert.throws(() => checkUpdateSources(before, sourceSnapshot(dir), ['b01']), /B02/);
    assert.doesNotThrow(() => checkUpdateSources(before, sourceSnapshot(dir), ['b02']));
    assert.equal(readFileSync(path.join(dir, 'scenes/B01.tsx'), 'utf8'), 'first');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
