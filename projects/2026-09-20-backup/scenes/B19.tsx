import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Scene, motion } from '../../../core';
import {
  AREA_W, CopyCard, Rack, Label, RACK_TOP, RACK_OFFSET, WORK_PHASE,
  SLOT_W, SLOT_H, LIFT, LINE_Y, OUT_X, OUT_Y, DEST_GAP,
  rackDrift, ramp, css, shadow, border, color, type, radius, space, ease,
} from './_kit';

/**
 * Блок 19: «яндекс диска или съемного жесткого диска» — 143 кадра. Встык:
 * схема, черта и ушедшая за неё копия остаются ровно там, где были.
 *
 * МЕТАФОРА: выбор из двух. По бокам от копии встают два настоящих места, и
 * синее — то самое «вот оно» — переходит с одного на другое: либо туда, либо
 * туда. Широкий кадр здесь работает на смысл: оба варианта видно разом.
 *
 * Имена написаны намеренно: «Яндекс Диск» и «съёмный диск» — это то, чего в
 * движении нет, а зритель должен унести из кадра именно их.
 *
 * Движение: места встают (0–20 и 20–40), связь тянется к первому (42–80),
 * потом акцент переходит ко второму (86–138). Выбранное место при этом
 * приподнимается — одной сменой цвета рамки кадр не держится.
 */

const DEST_W = 400;
const DEST_H = SLOT_H;
const LEFT_X = OUT_X - DEST_GAP - DEST_W;
const RIGHT_X = OUT_X + SLOT_W + DEST_GAP;

const Dest: React.FC<{ name: string; hint: string; on: number; appear: number }> = ({
  name, hint, on, appear,
}) => (
  <div
    style={{
      width: DEST_W,
      height: DEST_H,
      boxSizing: 'border-box',
      borderRadius: radius.card,
      background: on > 0.5 ? color.accentLight : color.card,
      border: `${border}px solid ${on > 0.5 ? color.accent : color.line}`,
      boxShadow: shadow.card,
      padding: space.gap + 6,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      opacity: appear,
      // выбранное место приподнимается: это видно даже боковым зрением, а
      // смена цвета рамки — нет
      transform: `translateY(${34 * (1 - appear) - 18 * on}px) scale(${1 + 0.04 * on})`,
    }}
  >
    <div
      style={{
        width: 38,
        height: 38,
        borderRadius: radius.icon * 0.4,
        background: on > 0.5 ? color.accent : color.textFaint,
      }}
    />
    <div>
      <div style={css(type.listTitle, { color: color.text, fontSize: 38 })}>{name}</div>
      <div style={css(type.label, { color: color.textFaint, fontSize: 22, marginTop: 8 })}>{hint}</div>
    </div>
  </div>
);

export const B19: React.FC = () => {
  const frame = useCurrentFrame();

  const live = motion.travel(frame + WORK_PHASE.b19, 52);
  const leftIn = ramp(frame, 0, 20);
  const rightIn = ramp(frame, 20, 40);
  const toLeft = ramp(frame, 42, 80, ease.fill);
  const toRight = ramp(frame, 86, 138, ease.fill);

  return (
    <Scene>
      <div style={{ position: 'relative', flex: 1 }}>
        <div
          style={{
            position: 'absolute',
            top: RACK_TOP - LIFT,
            left: 0,
            transform: rackDrift(frame, RACK_OFFSET.b19),
          }}
        >
          <Rack
            number="3"
            underline={1}
            slots={[
              <CopyCard key="a" title="рабочая" note="каждый день" live={live} />,
              <CopyCard key="b" title="сервер" note="тот же сервер" live={1} />,
              null,
            ]}
          />
        </div>

        <div style={{ position: 'absolute', top: LINE_Y, left: 0, width: AREA_W }}>
          <div style={{ width: AREA_W, height: 3, background: color.line }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14 }}>
            <Label>ваш офис</Label>
            <Label tone={color.text}>снаружи</Label>
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            left: OUT_X + SLOT_W / 2,
            top: LINE_Y,
            width: 4,
            height: OUT_Y - LINE_Y,
            background: color.accent,
          }}
        />

        {/* связи к местам: сначала к первому, потом ко второму */}
        <div
          style={{
            position: 'absolute',
            left: OUT_X - DEST_GAP * toLeft,
            top: OUT_Y + DEST_H / 2,
            width: DEST_GAP * toLeft,
            height: 4,
            background: color.accent,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: OUT_X + SLOT_W,
            top: OUT_Y + DEST_H / 2,
            width: DEST_GAP * toRight,
            height: 4,
            background: color.accent,
          }}
        />

        <div style={{ position: 'absolute', left: LEFT_X, top: OUT_Y }}>
          <Dest name="Яндекс Диск" hint="облако" on={Math.max(0, toLeft - toRight)} appear={leftIn} />
        </div>

        <div style={{ position: 'absolute', left: OUT_X, top: OUT_Y }}>
          <CopyCard title="третья" note="копия данных" live={1} />
        </div>

        <div style={{ position: 'absolute', left: RIGHT_X, top: OUT_Y }}>
          <Dest name="съёмный диск" hint="в сейфе" on={toRight} appear={rightIn} />
        </div>

        <div
          style={{
            position: 'absolute',
            top: OUT_Y + DEST_H + 22,
            left: OUT_X,
            width: SLOT_W,
            textAlign: 'center',
            opacity: rightIn,
          }}
        >
          <Label>или</Label>
        </div>
      </div>
    </Scene>
  );
};
