import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Scene } from '../../../core';
import { Label, css, ramp, shadow, border, color, type, radius, space, ease } from './_kit';

/**
 * Блок 21: «проверьте есть ли у вас backup» — 107 кадров.
 *
 * МЕТАФОРА: проверка идёт прямо сейчас, по вашему списку. Три строки сходятся,
 * а на четвёртой вместо галочки остаётся прочерк — ровно то, ради чего человек
 * просит проверить.
 *
 * Имена настоящие: 1С, почта, документы, сайт. Серой полоской их заменять
 * нельзя — именно они и делают список вашим, а не абстрактным.
 *
 * Движение: строки ложатся (0–20), галочки садятся (28, 46, 64), прочерк
 * растёт (78–102) — до конца блока остаётся пять кадров.
 */

const ROWS = [
  { name: '1С', hint: 'база и документы' },
  { name: 'почта', hint: 'переписка' },
  { name: 'документы', hint: 'договоры, акты' },
  { name: 'сайт', hint: 'и его база' },
];

const ROW_H = 130;
const ROW_GAP = 20;
/** В широком кадре список нарочно уже кадра: строка во всю ширину нечитаема. */
const LIST_W = 1200;

const Check: React.FC<{ p: number }> = ({ p }) => (
  <svg viewBox="0 0 48 48" width={56} height={56} style={{ display: 'block' }}>
    <path
      d="M10 25 L20 35 L38 14"
      fill="none"
      stroke={color.accent}
      strokeWidth="7"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray="56"
      strokeDashoffset={56 * (1 - p)}
    />
  </svg>
);

export const B21: React.FC = () => {
  const frame = useCurrentFrame();
  const dash = ramp(frame, 78, 102, ease.fill);

  return (
    <Scene>
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Label style={{ marginBottom: space.gap, width: LIST_W }}>что у вас копируется</Label>

        <div style={{ display: 'flex', flexDirection: 'column', gap: ROW_GAP, width: LIST_W }}>
          {ROWS.map((row, i) => {
            const appear = ramp(frame, i * 5, i * 5 + 14);
            const at = 28 + i * 18;
            const done = i < 3 ? ramp(frame, at, at + 12, ease.fill) : 0;
            return (
              <div
                key={row.name}
                style={{
                  height: ROW_H,
                  boxSizing: 'border-box',
                  borderRadius: radius.card,
                  background: color.card,
                  border: `${border}px solid ${done > 0.5 ? color.accentLine : color.line}`,
                  boxShadow: shadow.card,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingLeft: space.block * 0.7,
                  paddingRight: space.block * 0.7,
                  opacity: appear,
                  transform: `translateY(${30 * (1 - appear)}px)`,
                }}
              >
                <div>
                  <div style={css(type.listTitle, { color: color.text })}>{row.name}</div>
                  <div style={css(type.label, { color: color.textFaint, fontSize: 22, marginTop: 6 })}>
                    {row.hint}
                  </div>
                </div>

                {i < 3 ? (
                  <Check p={done} />
                ) : (
                  <span
                    style={{
                      width: 56 * dash,
                      height: 7,
                      borderRadius: 4,
                      background: color.textFaint,
                      opacity: 0.6,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Scene>
  );
};
