import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Scene } from '../../../core';
import { AREA_W, AREA_H, Label, css, ramp, border, color, type, radius, space, ease } from './_kit';

/**
 * Блок 9: «и которые они к сожалению до этого никогда не делали» — 150 кадров.
 *
 * МЕТАФОРА: журнал, в котором нечего найти. Полоса проверки идёт по дням сверху
 * вниз, и в каждом дне вместо копии остаётся прочерк. Уберите текст — мысль
 * читается: искали каждый день и не нашли ни разу.
 *
 * В широком кадре журнал занимает левую половину, а итог — серый ноль — стоит
 * справа от него, на уровне глаз. В вертикали ноль стоял под журналом; здесь
 * он оказался бы в самом низу, у субтитров.
 *
 * Синего нет: это ещё проблемная половина ролика.
 *
 * Движение: строки ложатся (0–24), проверка идёт (30–130) и оставляет прочерк
 * на кадрах 32/50/68/86/104/122, ноль встаёт (130–146).
 */

const DAYS = ['12.03', '13.03', '14.03', '15.03', '16.03', '17.03'];
const ROW_H = 76;
const ROW_GAP = 14;
const LOG_W = 1000;
const COLUMN_H = DAYS.length * ROW_H + (DAYS.length - 1) * ROW_GAP;
const LOG_TOP = Math.round((AREA_H - COLUMN_H) / 2);

export const B09: React.FC = () => {
  const frame = useCurrentFrame();

  const scan = ramp(frame, 30, 130, ease.linear);
  const zero = ramp(frame, 130, 146);

  return (
    <Scene>
      <div style={{ position: 'relative', flex: 1 }}>
        <div style={{ position: 'absolute', left: 0, top: LOG_TOP - 46 }}>
          <Label>журнал копий · март</Label>
        </div>

        <div style={{ position: 'absolute', left: 0, top: LOG_TOP, width: LOG_W }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: ROW_GAP }}>
            {DAYS.map((day, i) => {
              const appear = ramp(frame, i * 4, i * 4 + 12);
              const at = 32 + i * 18;
              const dash = ramp(frame, at, at + 14, ease.fill);
              return (
                <div
                  key={day}
                  style={{
                    height: ROW_H,
                    boxSizing: 'border-box',
                    borderRadius: radius.card,
                    border: `${border}px dashed ${color.line}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingLeft: space.block * 0.7,
                    paddingRight: space.block * 0.7,
                    opacity: appear,
                    transform: `translateY(${28 * (1 - appear)}px)`,
                  }}
                >
                  <span style={css(type.label, { color: color.textMuted })}>{day}</span>
                  <span
                    style={{
                      width: 180 * dash,
                      height: 6,
                      borderRadius: 3,
                      background: color.textFaint,
                      opacity: 0.55,
                    }}
                  />
                </div>
              );
            })}
          </div>

          {/* полоса проверки: одно продолженное движение через весь журнал */}
          <div
            style={{
              position: 'absolute',
              left: -space.gap,
              width: LOG_W + space.gap * 2,
              top: scan * COLUMN_H,
              height: 4,
              background: color.text,
              opacity: scan > 0 && scan < 1 ? 0.5 : 0,
            }}
          />
        </div>

        <div
          style={{
            position: 'absolute',
            left: LOG_W + 150,
            top: Math.round(AREA_H / 2) - 120,
            width: AREA_W - LOG_W - 150,
            opacity: zero,
            transform: `translateY(${26 * (1 - zero)}px)`,
          }}
        >
          <span style={css(type.stat, { color: color.textFaint, fontSize: 220 })}>0</span>
          <Label style={{ marginTop: 8 }}>копий найдено</Label>
        </div>
      </div>
    </Scene>
  );
};
