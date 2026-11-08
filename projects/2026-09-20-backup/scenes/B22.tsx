import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Scene } from '../../../core';
import { AREA_W, Label, css, ramp, border, color, type, radius, space, ease } from './_kit';

/**
 * Блок 22: «и делаются ли они регулярно» — 94 кадра.
 *
 * МЕТАФОРА: ритм. Метки падают в дни недели через равные промежутки — 18, 28,
 * 38, 48, 58, 68, 78, — и регулярность здесь не нарисована, а отбита. Тот же
 * ровный шаг стоит и в звуке блока: ухо слышит расписание раньше, чем глаз
 * успевает пересчитать клетки.
 *
 * Последняя метка садится на 90-м кадре из 94 — замереть кадру негде.
 */

const DAYS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];
const CELL_GAP = 12;
const CELL_W = (AREA_W - CELL_GAP * (DAYS.length - 1)) / DAYS.length;
const CELL_H = 230;

export const B22: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <Scene>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <Label style={{ marginBottom: space.gap }}>неделя</Label>

        <div style={{ display: 'flex', gap: CELL_GAP, width: AREA_W }}>
          {DAYS.map((day, i) => {
            const appear = ramp(frame, i * 2, i * 2 + 14);
            const at = 18 + i * 10;
            const mark = ramp(frame, at, at + 12, ease.enter);
            return (
              <div
                key={day}
                style={{
                  width: CELL_W,
                  height: CELL_H,
                  boxSizing: 'border-box',
                  borderRadius: radius.bar,
                  border: `${border}px solid ${mark > 0.5 ? color.accentLine : color.line}`,
                  background: mark > 0.5 ? color.accentLight : 'transparent',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: 20,
                  paddingBottom: 20,
                  opacity: appear,
                  transform: `translateY(${26 * (1 - appear)}px)`,
                }}
              >
                <span
                  style={{
                    width: 40,
                    height: 40,
                    background: color.accent,
                    opacity: mark,
                    transform: `translateY(${-46 * (1 - mark)}px)`,
                  }}
                />
                <span style={css(type.label, { color: color.textMuted, fontSize: 24 })}>{day}</span>
              </div>
            );
          })}
        </div>
      </div>
    </Scene>
  );
};
