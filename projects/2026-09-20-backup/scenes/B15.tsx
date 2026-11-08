import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Scene, motion } from '../../../core';
import { CopyCard, Rack, RACK_TOP, RACK_OFFSET, rackDrift, ramp, ease } from './_kit';

/**
 * Блок 15: «одна копия рабочая» — 65 кадров. Встык с предыдущим: схема та же,
 * на том же месте, с тем же дрейфом — меняется только первый слот.
 *
 * МЕТАФОРА: первое место занимает та копия, с которой работают каждый день.
 * Она приезжает сбоку долгим движением, в ней заполняется полоса, и дальше
 * полоса идёт по кругу — рабочая копия не «готова», она всё время в работе.
 *
 * Движение растянуто на весь блок намеренно. Сначала карточка просто падала
 * сверху за шестнадцать кадров, а остальные пятьдесят кадр держала полоска в
 * шесть пикселей — по канону такая мелочь за движение не считается, и кадр
 * замирал. Теперь: переезд (0–40), рост полосы (40–60), дальше круг.
 */

export const B15: React.FC = () => {
  const frame = useCurrentFrame();

  const arrive = ramp(frame, 0, 40, ease.fill);
  const live = frame < 60 ? ramp(frame, 40, 60, ease.fill) : motion.travel(frame - 60, 52);

  return (
    <Scene>
      <div style={{ position: 'relative', flex: 1 }}>
        <div
          style={{
            position: 'absolute',
            top: RACK_TOP,
            left: 0,
            transform: rackDrift(frame, RACK_OFFSET.b15),
          }}
        >
          <Rack
            number="3"
            underline={1}
            slots={[
              <div
                key="a"
                style={{
                  opacity: Math.min(1, arrive * 4),
                  transform: `translateX(${-620 * (1 - arrive)}px)`,
                }}
              >
                <CopyCard title="рабочая" note="каждый день" live={live} />
              </div>,
              null,
              null,
            ]}
          />
        </div>
      </div>
    </Scene>
  );
};
