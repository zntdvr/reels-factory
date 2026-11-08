import path from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';
import { startCraft } from './craft-client.mjs';
import { framesToTicks, validateLayers } from '../../core/craft-contract.mjs';

/** Build a native project through FilmCraft's own engine, not an invented JSON schema. */
export async function assembleFilmcraft(manifest, media, output, config = {}) {
  for (const block of manifest.blocks) validateLayers(block.layers, block.frames);
  const client = await startCraft('filmcraft', config);
  const objects = [];
  try {
    const maxLayers = Math.max(0, ...manifest.blocks.map((b) => b.layers.length));
    await client.command('file.newSequence', { name: manifest.title, width: manifest.width,
      height: manifest.height, fps: manifest.fps, video: maxLayers + 3, audio: 3 });
    for (const clip of media) {
      const imported = await client.command('file.import', { paths: [path.resolve(clip.file)] });
      if (imported.errors?.length || !imported.items?.length) throw new Error(`FilmCraft import failed: ${JSON.stringify(imported)}`);
      const result = await client.command('timeline.place', { item: imported.items[0], track: clip.track,
        frame: clip.start, duration: { frame: clip.frames }, video: !clip.audio, audio: !!clip.audio, insert: false });
      objects.push({ name: clip.name, kind: clip.audio ? 'audio' : 'render', ...result });
    }
    const text = async (layer, start, frames, track, name) => {
      const result = await client.command('graphics.newText', { newClip: true, text: layer.text,
        position: [layer.x, layer.y], box: [layer.width, 0], size: layer.fontSize,
        font: layer.fontFamily.split(',')[0].replace(/["']/g, '').trim(),
        fontStyle: (layer.fontWeight ?? 400) >= 600 ? 'Bold' : 'Regular',
        seconds: frames / manifest.fps, time: framesToTicks(start, manifest.fps), track });
      await client.command('graphics.set', { clip: result.clip, layer: result.layer,
        props: { name, box_height: 0, fill_color: layer.color, align: layer.align ?? 'left', background: !!layer.background } });
      objects.push({ name, kind: 'text', ...result });
    };
    for (const block of manifest.blocks) {
      for (const [i, layer] of block.layers.entries()) if (layer.kind === 'text') {
        await text(layer, block.start + (layer.from ?? 0), layer.frames ?? block.frames - (layer.from ?? 0), i + 1, `${block.id}/${layer.id}`);
      }
    }
    for (const caption of manifest.captions) await text(caption, caption.from, caption.frames, maxLayers + 1, caption.id);
    await client.command('file.saveAs', { path: path.resolve(output) });
    const inspection = await client.tool('sequence_inspect');
    if (inspection.durationFrames !== manifest.totalFrames) throw new Error('FilmCraft timeline duration differs from the reel');
    // Native v0.18 stores absolute MediaRef::File paths. Its loader supports paths
    // relative to the document (crates/project/src/item.rs; stored_paths_tests.rs).
    const document = JSON.parse(readFileSync(output, 'utf8'));
    if (!document.project?.items) throw new Error('Unsupported FilmCraft project schema');
    for (const item of Object.values(document.project.items)) {
      const file = item.kind?.Media?.media?.File;
      if (!file) continue;
      const relative = path.relative(path.dirname(path.resolve(output)), file.path);
      if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Package media must be beside the FilmCraft project');
      file.path = relative.split(path.sep).join('/');
    }
    writeFileSync(output, JSON.stringify(document));
    return { objects, inspection };
  } finally { client.close(); }
}
