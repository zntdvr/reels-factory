/**
 * ВЫБОР КУСКА ВНУТРИ ВИДЕО — чистая арифметика над оценками кадров.
 *
 * CLIP ставит оценку каждой секунде исходника (кадры берутся раз в секунду).
 * Здесь из этих оценок выбирается окно ровно на длину блока озвучки: лучшее по
 * среднему, без резких смен плана внутри и без кусков, уже взятых в этот ролик.
 *
 * Вынесено отдельно от скачивания и ffmpeg, чтобы проверяться тестом.
 */

/** Соседние кадры с похожестью ниже — это смена плана, а не движение камеры. */
export const CUT_SIMILARITY = 0.8;
/** Штраф за каждую смену плана внутри окна: склейка посреди вставки читается браком. */
export const CUT_PENALTY = 0.03;

/**
 * Лучшее окно длиной `seconds` в одном исходнике.
 *
 * @param {object} input
 * @param {number[]} input.scores    оценка каждой секунды
 * @param {number[]} input.crop      где резать вертикаль для каждой секунды, 0…1
 * @param {number[]} input.adjacent  похожесть соседних секунд (на одну короче)
 * @param {number} input.seconds     длина блока озвучки
 * @param {number} [input.maxSlowdown] во сколько раз можно замедлить короткий исходник
 * @param {Array<[number, number]>} [input.busy] уже занятые отрезки этого исходника, секунды
 * @param {number} [input.duration] настоящая длина исходника в секундах. Кадров
 *   берётся раз в секунду, и по их числу длина угадывается с ошибкой до секунды
 * @returns {{start:number,end:number,speed:number,score:number,crop:number,cuts:number}|null}
 */
export function bestWindow({ scores, crop = [], adjacent = [], seconds, maxSlowdown = 1.5, busy = [], duration }) {
  const total = scores.length;
  if (!total || !(seconds > 0)) return null;
  const length = duration > 0 ? duration : total;

  // Исходник короче блока: берём целиком и замедляем, если замедление терпимое.
  if (length < seconds) {
    if (seconds / length > maxSlowdown) return null;
    if (overlaps(0, length, busy)) return null;
    const window = measure(scores, crop, adjacent, 0, total, length / seconds);
    window.end = Number(length.toFixed(3));
    return window;
  }

  const span = Math.ceil(seconds);
  let best = null;
  for (let start = 0; start + seconds <= length; start++) {
    const end = start + seconds;
    if (overlaps(start, end, busy)) continue;
    const window = measure(scores, crop, adjacent, start, Math.min(total, start + span), 1);
    window.end = Number(end.toFixed(3));
    if (!best || window.score > best.score) best = window;
  }
  return best;
}

function measure(scores, crop, adjacent, from, to, speed) {
  const part = scores.slice(from, to);
  const mean = part.reduce((s, x) => s + x, 0) / part.length;
  let cuts = 0;
  for (let i = from; i < to - 1; i++) if ((adjacent[i] ?? 1) < CUT_SIMILARITY) cuts++;
  // Вертикаль режется в одном месте на всё окно: берём положение у самой сильной секунды.
  let strongest = from;
  for (let i = from; i < to; i++) if (scores[i] > scores[strongest]) strongest = i;
  return {
    start: from,
    end: to,
    speed: Number(speed.toFixed(4)),
    score: Number((mean - cuts * CUT_PENALTY).toFixed(4)),
    crop: crop[strongest] ?? 0.5,
    cuts,
  };
}

/** Пересекается ли отрезок с занятыми. Касание краями — не пересечение. */
export function overlaps(start, end, busy) {
  return busy.some(([a, b]) => start < b && a < end);
}

/**
 * Отрезки, уже взятые в этот ролик другими блоками: один и тот же кусок дважды
 * в ролике не ставится. Ключ — источник вида `yt-abc123`.
 */
export function busyBySource(picks) {
  const out = {};
  for (const pick of picks) {
    if (!pick?.key) continue;
    (out[pick.key] ??= []).push([pick.start, pick.end]);
  }
  return out;
}
