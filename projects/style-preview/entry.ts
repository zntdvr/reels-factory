import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { VIDEO } from '../../core/format';
import { SHOWCASE_FRAMES, Showcase } from './Showcase';

/**
 * Отдельная точка входа витрины стиля. Реестр роликов она не трогает, поэтому
 * появиться в студии и попасть в чужой рендер не может.
 */
const Root: React.FC = () =>
  React.createElement(Composition, {
    id: 'style-preview',
    component: Showcase,
    durationInFrames: SHOWCASE_FRAMES,
    fps: VIDEO.fps,
    width: VIDEO.width,
    height: VIDEO.height,
  });

registerRoot(Root);
