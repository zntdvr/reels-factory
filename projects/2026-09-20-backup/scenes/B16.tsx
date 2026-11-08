import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Scene, motion } from '../../../core';
import {
  CopyCard, Rack, RACK_TOP, RACK_OFFSET, WORK_PHASE, SLOTS_X, SLOT_W, SLOT_GAP,
  rackDrift, ramp, ease,
} from './_kit';

/**
 * Блок 16: «еще одна лежит на том же сервере» — 81 кадр. Встык: схема
 * продолжается, рабочая копия в первом слоте всё так же живёт полосой.
 *
 * МЕТАФОРА: копия переезжает на соседнее место. Она физически выходит из первой
 * и едет во вторую — «тот же сервер» читается из того, что ехать пришлось
 * недалеко, рядом.
 *
 * Движение: переезд идёт 46 кадров (10–56), посадка и метка (56–78), и всё это
 * время идёт полоса рабочей копии.
 */

export const B16: React.FC = () => {
  const frame = useCurrentFrame();

  const live = motion.travel(frame + WORK_PHASE.b16, 52);
  const move = ramp(frame, 10, 56, ease.enter);
  const settle = ramp(frame, 56, 78);

  return (
    <Scene>
      <div style={{ position: 'relative', flex: 1 }}>
        <div
          style={{
            position: 'absolute',
            top: RACK_TOP,
            left: 0,
            transform: rackDrift(frame, RACK_OFFSET.b16),
          }}
        >
          <Rack
            number="3"
            underline={1}
            slots={[
              <CopyCard key="a" title="рабочая" note="каждый день" live={live} />,
              null,
              null,
            ]}
          />

          {/* копия едет из первого слота во второй — одно длинное движение */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: SLOTS_X,
              opacity: move,
              transform: `translate(${(SLOT_W + SLOT_GAP) * move}px, ${-30 * Math.sin(move * Math.PI)}px)`,
            }}
          >
            <CopyCard title="сервер" note="тот же сервер" live={settle} />
          </div>
        </div>
      </div>
    </Scene>
  );
};
