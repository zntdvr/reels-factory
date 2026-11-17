import React from 'react';
import { AbsoluteFill, random, useVideoConfig } from 'remotion';
import { tokens } from './tokens';

/**
 * ПОДЛОЖКА КАДРА — тёплый белый лист.
 *
 * Мир «Синей точки» сделан из бумаги, а не из экрана: светлый градиент сверху
 * вниз и неподвижное зерно. Зерно — текстура материала, поэтому оно НЕ мерцает
 * и НЕ движется: мерцающее зерно превращает бумагу в киноплёнку.
 *
 * Точки зерна разложены по семени, а не случайно: на каждом прогоне рендера
 * лист получается один и тот же, и кадры не «шипят» между собой.
 */
export const Background: React.FC = () => {
  const VIDEO = useVideoConfig();
  const grain = tokens.extra?.grain as {
    count: number;
    opacity: number;
    color: string;
    min: number;
    max: number;
  };

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(170deg, ${tokens.color.bgTop} 0%, ${tokens.color.bg} 100%)`,
      }}
    >
      <svg
        width={VIDEO.width}
        height={VIDEO.height}
        viewBox={`0 0 ${VIDEO.width} ${VIDEO.height}`}
        style={{ position: 'absolute', inset: 0, opacity: grain.opacity }}
      >
        <g fill={grain.color}>
          {Array.from({ length: grain.count }).map((_, i) => {
            const seed = `grain-${i}`;
            return (
              <circle
                key={i}
                cx={random(seed + 'x') * VIDEO.width}
                cy={random(seed + 'y') * VIDEO.height}
                r={grain.min + random(seed + 'r') * (grain.max - grain.min)}
              />
            );
          })}
        </g>
      </svg>
    </AbsoluteFill>
  );
};
