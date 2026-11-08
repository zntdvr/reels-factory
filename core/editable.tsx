import React from 'react';
import { Sequence } from 'remotion';

interface LayerTiming {
  id: string;
  /** Local block frames; omitted means the entire block. */
  from?: number;
  frames?: number;
}
export interface EditableText extends LayerTiming {
  kind: 'text';
  text: string;
  x: number;
  y: number;
  width: number;
  fontSize: number;
  fontFamily: string;
  fontWeight?: number;
  color: string;
  align?: 'left' | 'center' | 'right';
  background?: boolean;
}
export interface EditableRender extends LayerTiming {
  kind: 'render';
  /** Transparent full-frame component; exported as an independently removable clip. */
  component: React.FC;
}
export type EditableLayer = EditableText | EditableRender;
export const EditableLayers: React.FC<{ layers: EditableLayer[]; frames: number }> = ({ layers, frames }) => <>
  {layers.map((layer) => <Sequence key={layer.id} from={layer.from ?? 0}
    durationInFrames={layer.frames ?? frames - (layer.from ?? 0)} layout="none">
    {layer.kind === 'render' ? <layer.component /> : <div style={{
      position: 'absolute', left: layer.x, top: layer.y, width: layer.width,
      fontFamily: layer.fontFamily, fontSize: layer.fontSize, fontWeight: layer.fontWeight ?? 400,
      color: layer.color, textAlign: layer.align ?? 'left', whiteSpace: 'pre-wrap', lineHeight: 1.2,
      background: layer.background ? 'rgba(0,0,0,0.75)' : undefined,
    }}>{layer.text}</div>}
  </Sequence>)}
</>;
