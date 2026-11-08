import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Scene, motion } from '../../../core';
import {
  CopyCard, Rack, RACK_TOP, RACK_OFFSET, WORK_PHASE, SLOTS_X, SLOT_W, SLOT_GAP, SLOT_H,
  rackDrift, ramp, color, ease,
} from './_kit';

/**
 * Блок 17: «и третья копия данных» — 63 кадра. Встык, схема та же.
 *
 * МЕТАФОРА: третье место занято, и по низу ряда протягивается общая линия —
 * три копии стали одним набором. Линия растёт до 58-го кадра из 63, поэтому
 * кадр не успевает замереть.
 */

const ROW_W = SLOT_W * 3 + SLOT_GAP * 2;

export const B17: React.FC = () => {
  const frame = useCurrentFrame();

  const live = motion.travel(frame + WORK_PHASE.b17, 52);
  const drop = ramp(frame, 0, 16);
  const fill = ramp(frame, 18, 40, ease.fill);
  const tie = ramp(frame, 34, 58, ease.fill);

  return (
    <Scene>
      <div style={{ position: 'relative', flex: 1 }}>
        <div
          style={{
            position: 'absolute',
            top: RACK_TOP,
            left: 0,
            transform: rackDrift(frame, RACK_OFFSET.b17),
          }}
        >
          <Rack
            number="3"
            underline={1}
            slots={[
              <CopyCard key="a" title="рабочая" note="каждый день" live={live} />,
              <CopyCard key="b" title="сервер" note="тот же сервер" live={1} />,
              <div
                key="c"
                style={{ opacity: drop, transform: `translateY(${-46 * (1 - drop)}px)` }}
              >
                <CopyCard title="третья" note="копия данных" live={fill} />
              </div>,
            ]}
          />

          {/* общая линия под рядом: три копии стали одним набором */}
          <div
            style={{
              position: 'absolute',
              top: SLOT_H + 24,
              left: SLOTS_X,
              width: ROW_W * tie,
              height: 4,
              background: color.accent,
            }}
          />
        </div>
      </div>
    </Scene>
  );
};
