import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { Scene, motion } from '../../../core';
import {
  AREA_W, CopyCard, Rack, Label, RACK_TOP, RACK_OFFSET, WORK_PHASE,
  SLOTS_X, SLOT_W, SLOT_GAP, SLOT_H, LIFT, LINE_Y, OUT_X, OUT_Y,
  rackDrift, ramp, color, ease,
} from './_kit';

/**
 * Блок 18: «лежит на каком-нибудь внешнем источнике типа» — 147 кадров.
 *
 * Встык с предыдущим: схема стоит там же и в тот же кадр начинает подниматься —
 * не прыгает, а едет, освобождая место под чертой. Это и есть метафора блока:
 * под схемой появляется «снаружи», и третья копия уезжает туда с сервера.
 *
 * МЕТАФОРА: копия покидает периметр. Уберите текст — видно, что две остались
 * внутри, а третья ушла за черту, и связь с ней осталась.
 *
 * Движение: подъём схемы (0–40), черта (20–50), переезд копии (40–118),
 * посадка (118–140), связь (122–146). Переезд тянется долго намеренно: раньше
 * он кончался на 110-м кадре, и последние двадцать пять кадров блока держала
 * только тонкая линия связи — то есть ничего не держало.
 */

const ROW_W = SLOT_W * 3 + SLOT_GAP * 2;
const FROM_X = SLOTS_X + (SLOT_W + SLOT_GAP) * 2;

export const B18: React.FC = () => {
  const frame = useCurrentFrame();

  const live = motion.travel(frame + WORK_PHASE.b18, 52);
  const lift = ramp(frame, 0, 40, ease.enter) * LIFT;
  const line = ramp(frame, 20, 50, ease.fill);
  const trip = ramp(frame, 40, 118, ease.enter);
  const land = ramp(frame, 118, 140);
  const link = ramp(frame, 122, 146, ease.fill);

  const fromY = RACK_TOP - lift;
  const x = interpolate(trip, [0, 1], [FROM_X, OUT_X]);
  const y = interpolate(trip, [0, 1], [fromY, OUT_Y]);

  return (
    <Scene>
      <div style={{ position: 'relative', flex: 1 }}>
        <div
          style={{
            position: 'absolute',
            top: RACK_TOP - lift,
            left: 0,
            transform: rackDrift(frame, RACK_OFFSET.b18),
          }}
        >
          <Rack
            number="3"
            underline={1}
            slots={[
              <CopyCard key="a" title="рабочая" note="каждый день" live={live} />,
              <CopyCard key="b" title="сервер" note="тот же сервер" live={1} />,
              trip > 0 ? null : <CopyCard key="c" title="третья" note="копия данных" live={1} />,
            ]}
          />
          <div
            style={{
              position: 'absolute',
              top: SLOT_H + 24,
              left: SLOTS_X,
              width: ROW_W * (1 - trip),
              height: 4,
              background: color.accent,
            }}
          />
        </div>

        {/* черта периметра: выше — ваше, ниже — снаружи */}
        <div style={{ position: 'absolute', top: LINE_Y, left: 0, width: AREA_W }}>
          <div style={{ width: AREA_W * line, height: 3, background: color.line }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, opacity: line }}>
            <Label>ваш офис</Label>
            <Label tone={color.text}>снаружи</Label>
          </div>
        </div>

        {/* связь: копия ушла, но осталась своей */}
        <div
          style={{
            position: 'absolute',
            left: OUT_X + SLOT_W / 2,
            top: LINE_Y,
            width: 4,
            height: (OUT_Y - LINE_Y) * link,
            background: color.accent,
          }}
        />

        {/* третья копия уезжает за черту */}
        <div
          style={{
            position: 'absolute',
            left: x,
            top: y,
            transform: `${rackDrift(frame, RACK_OFFSET.b18)} scale(${
              1 - 0.06 * Math.sin(trip * Math.PI) + 0.06 * land
            })`,
          }}
        >
          <CopyCard title="третья" note="копия данных" live={1} />
        </div>
      </div>
    </Scene>
  );
};
