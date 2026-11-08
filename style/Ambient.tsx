import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { VIDEO } from '../core/format';
import { breathe, drift } from '../core/motion';
import { tokens } from './tokens';

/**
 * ВСЕГДА-ЖИВОЙ СЛОЙ. Лежит под каждой сценой и обеспечивает движение даже там,
 * где сцена его не дала. Статика при звучащем голосе — брак, и этот слой не даёт
 * ему случиться на уровне системы.
 *
 * В «Синей точке» кадр живёт ОДНИМ синим пятном за краем листа. Одним — потому
 * что акцент в этом стиле единственный, и второе пятно сразу читается вторым
 * акцентным цветом. Пятно очень медленно дышит и дрейфует: движение должно быть
 * на грани заметности, иначе бумага начинает «дышать» сильнее содержания.
 *
 * Здесь нет ни пыли, ни искр, ни свечений: в мире из бумаги им неоткуда взяться.
 */
export const Ambient: React.FC = () => {
  const frame = useCurrentFrame();
  const blob = tokens.extra?.blob as {
    size: number;
    opacity: number;
    period: number;
    driftAmp: number;
  };

  const d = drift(frame, 'blue-dot-blob', blob.driftAmp);
  const scale = breathe(frame, { period: blob.period, min: 0.94, max: 1.06 });
  const alpha = breathe(frame, { period: blob.period * 1.3, min: 0.8, max: 1 });

  /** Пятно уходит за правый нижний край: в кадре видна только его дуга. */
  const left = VIDEO.width - blob.size * 0.42 + d.x;
  const top = VIDEO.height - blob.size * 0.58 + d.y;

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          left,
          top,
          width: blob.size,
          height: blob.size,
          borderRadius: '50%',
          transform: `scale(${scale})`,
          opacity: alpha,
          background:
            `radial-gradient(circle, rgba(36,92,255,${blob.opacity}) 0%,` +
            ' rgba(36,92,255,0.06) 45%, rgba(36,92,255,0) 70%)',
        }}
      />
    </AbsoluteFill>
  );
};
