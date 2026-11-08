import test from 'node:test';
import assert from 'node:assert/strict';
import { bestWindow, busyBySource, overlaps } from '../scripts/lib/footage-pick.mjs';

test('берёт окно с лучшими секундами', () => {
  const scores = [0.1, 0.1, 0.3, 0.32, 0.31, 0.1, 0.1];
  const w = bestWindow({ scores, seconds: 3 });
  assert.equal(w.start, 2);
  assert.equal(w.end, 5);
  assert.equal(w.speed, 1);
});

test('дробная длина блока: конец окна точный, а не округлённый', () => {
  const w = bestWindow({ scores: [0.2, 0.3, 0.3, 0.3, 0.3], seconds: 3.2 });
  assert.equal(w.end - w.start, 3.2);
  assert.ok(w.end <= 5);
});

test('смена плана внутри окна штрафуется', () => {
  const scores = [0.3, 0.3, 0.3, 0.3, 0.3, 0.3];
  const adjacent = [0.5, 0.95, 0.95, 0.95, 0.95];
  const w = bestWindow({ scores, adjacent, seconds: 3 });
  assert.equal(w.cuts, 0);
  assert.ok(w.start >= 1);
});

test('занятый кусок того же исходника не берётся', () => {
  const scores = [0.1, 0.4, 0.4, 0.4, 0.2, 0.2, 0.2];
  const w = bestWindow({ scores, seconds: 3, busy: [[1, 4]] });
  assert.ok(!overlaps(w.start, w.end, [[1, 4]]));
});

test('короткий исходник замедляется в пределах допуска', () => {
  const w = bestWindow({ scores: [0.3, 0.3, 0.3], seconds: 4, maxSlowdown: 1.5 });
  assert.equal(w.start, 0);
  assert.equal(w.end, 3);
  assert.equal(w.speed, 0.75);
});

test('исходник ровно по длине блока не замедляется', () => {
  // 3,2 секунды дают всего 4 кадра: по числу кадров длина угадывается неточно.
  const w = bestWindow({ scores: [0.3, 0.3, 0.3], seconds: 3.2, duration: 3.2 });
  assert.equal(w.speed, 1);
  assert.equal(w.end, 3.2);
});

test('слишком короткий исходник отбрасывается', () => {
  assert.equal(bestWindow({ scores: [0.3, 0.3], seconds: 4, maxSlowdown: 1.5 }), null);
});

test('вертикаль режется по самой сильной секунде окна', () => {
  const w = bestWindow({ scores: [0.2, 0.35, 0.2], crop: [0, 1, 0.5], seconds: 3 });
  assert.equal(w.crop, 1);
});

test('занятые отрезки собираются по источнику', () => {
  const busy = busyBySource([{ key: 'yt-a', start: 1, end: 4 }, null, { key: 'yt-a', start: 10, end: 12 }, { key: 'px-1', start: 0, end: 2 }]);
  assert.deepEqual(busy, { 'yt-a': [[1, 4], [10, 12]], 'px-1': [[0, 2]] });
});
