import React from 'react';
import { Audio, Composition, Sequence, staticFile } from 'remotion';
import { ReelBody, MusicLayer, AvatarLayer } from './compose';
import { EditableLayers } from './editable';
import { style, type, color } from './style';
import { VIDEO, subtitles, captionBox } from './format';
import { buildCaptionPages } from './caption-pages';
import { pickTrack } from './music';
import { planSfx } from './sfx';
import { SfxLayer } from './SfxLayer';
import type { Reel } from './reel';

/** Isolated export entry: serialize declarations, never React functions, into metadata. */
export const CraftExport: React.FC<{ reel: Reel }> = ({ reel }) => {
  const track = pickTrack(reel.id, reel.source.music);
  const cues = planSfx(reel.blocks, { transition: reel.transition, enabled: reel.sfx !== false });
  let at = 0;
  const blocks = reel.blocks.map((block) => {
    const start = at; at += block.frames;
    return { id: block.id, start, frames: block.frames,
      visualizer: block.camera ? 'camera' : block.animator ? 'animator' : block.blender ? 'blender' : block.footage ? 'footage' : block.effectcraft ? 'effectcraft' : 'remotion',
      bakedScene: !!(block.scene || block.animator || block.blender || block.footage),
      effectcraft: block.effectcraft, inset: !!block.inset,
      layers: (block.layers ?? []).map(({ ...layer }) => {
        if (layer.kind === 'render') { const { component, ...data } = layer; return data; }
        return layer;
      }) };
  });
  const pages = subtitles.mode === 'own' && reel.captions?.length
    ? buildCaptionPages(reel.captions, { ...type.title, size: captionBox.fontSize, uppercase: false }, VIDEO.fps) : [];
  const manifest = { id: reel.id, title: reel.title, ...VIDEO, totalFrames: reel.totalFrames, blocks,
    music: !!track, sfx: cues.length > 0, avatar: !!reel.source.avatar,
    captions: pages.map((page, i) => ({ id: `caption-${i}`, kind: 'text',
      text: page.words.map((w) => w.text).join(' '), from: page.from,
      frames: Math.min(page.to, reel.totalFrames) - page.from,
      x: (VIDEO.width - captionBox.width) / 2,
      y: VIDEO.height - captionBox.bottom - captionBox.height,
      width: captionBox.width, fontSize: captionBox.fontSize, fontFamily: type.title.family,
      fontWeight: type.title.weight, color: subtitles.look === 'white' ? '#FFFFFF' : color.text,
      align: 'center', background: subtitles.plate,
    })).filter((p) => p.frames > 0),
  };
  const common = { fps: VIDEO.fps, width: VIDEO.width, height: VIDEO.height, durationInFrames: reel.totalFrames };
  const FontLoader = style.FontLoader;
  return <>
    <Composition {...common} id="craft-manifest" component={() => null} defaultProps={{ manifest }} />
    <Composition {...common} id="craft-reference" component={() => <ReelBody reel={reel} />} />
    <Composition {...common} id="craft-base" component={() => <ReelBody reel={reel} clean />} />
    <Composition {...common} id="craft-voice" component={() => <>
      {reel.source.video && <Audio src={staticFile(reel.source.video)} />}
      {reel.source.audio && <Audio src={staticFile(reel.source.audio)} />}
    </>} />
    {track && <Composition {...common} id="craft-music" component={() => <MusicLayer track={track} totalFrames={reel.totalFrames} />} />}
    {!!cues.length && <Composition {...common} id="craft-sfx" component={() => <SfxLayer cues={cues} />} />}
    {reel.source.avatar && <Composition {...common} id="craft-avatar" component={() => <AvatarLayer src={reel.source.avatar!} />} />}
    {reel.blocks.flatMap((block, i) => (block.layers ?? []).map((layer, j) => layer.kind === 'render' &&
      <Composition {...common} id={`craft-layer-${i}-${j}`} key={`${i}-${j}`} component={() =>
        <FontLoader><Sequence from={blocks[i].start} durationInFrames={block.frames} layout="none">
          <EditableLayers layers={[layer]} frames={block.frames} />
        </Sequence></FontLoader>} />))}
  </>;
};
