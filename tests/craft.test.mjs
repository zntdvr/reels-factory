import test from 'node:test';
import assert from 'node:assert/strict';
import { validateLayers, framesToTicks } from '../core/craft-contract.mjs';

test('exact FilmCraft time survives a long 30 fps reel without drift', () => {
  assert.equal(framesToTicks(1800, 30), 254016000000 * 60);
  assert.throws(() => framesToTicks(1.5, 30), /frame/i);
});
test('editable objects reject duplicate IDs and out of block ranges', () => {
  const a = { id: 'title', kind: 'text', text: 'VPN', x: 10, y: 20, width: 200, fontSize: 40, fontFamily: 'Inter', color: '#245CFF' };
  assert.doesNotThrow(() => validateLayers([a], 60));
  assert.throws(() => validateLayers([a, a], 60), /duplicate/i);
  assert.throws(() => validateLayers([{ ...a, from: 50, frames: 20 }], 60), /range/i);
  assert.throws(() => validateLayers([{ ...a, fontSize: -1 }], 60), /fontSize/i);
});
