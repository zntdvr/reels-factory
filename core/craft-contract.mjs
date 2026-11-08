export const TICKS_PER_SECOND = 254016000000;
export function framesToTicks(frame, fps) {
  if (!Number.isSafeInteger(frame) || frame < 0) throw new Error('Invalid frame');
  if (!Number.isFinite(fps) || fps <= 0) throw new Error('Invalid fps');
  const ticks = Math.round(frame * TICKS_PER_SECOND / fps);
  if (!Number.isSafeInteger(ticks)) throw new Error('Timeline exceeds safe tick range');
  return ticks;
}
export function validateLayers(layers, frames) {
  const ids = new Set();
  for (const layer of layers) {
    if (!/^[a-z0-9-]+$/i.test(layer.id)) throw new Error('Invalid layer id');
    if (ids.has(layer.id)) throw new Error(`Duplicate layer id: ${layer.id}`);
    ids.add(layer.id);
    const start = layer.from ?? 0;
    const length = layer.frames ?? frames - start;
    if (!Number.isInteger(start) || start < 0 || !Number.isInteger(length) || length <= 0 || start + length > frames) throw new Error(`Invalid layer range: ${layer.id}`);
    if (!['text', 'render'].includes(layer.kind)) throw new Error(`Unknown layer kind: ${layer.kind}`);
    if (layer.kind === 'text') {
      if (typeof layer.text !== 'string' || !layer.fontFamily || !/^#[\da-f]{6}$/i.test(layer.color)) throw new Error(`Invalid text: ${layer.id}`);
      for (const k of ['x', 'y', 'width', 'fontSize']) {
        if (!Number.isFinite(layer[k]) || (['width', 'fontSize'].includes(k) && layer[k] <= 0)) throw new Error(`Invalid ${k}: ${layer.id}`);
      }
    }
  }
}
