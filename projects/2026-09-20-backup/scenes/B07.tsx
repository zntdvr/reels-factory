import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Scene } from '../../../core';
import { AREA_W, Label, css, lay, ramp, shadow, border, color, type, radius, space, ease } from './_kit';

/**
 * Блок 7: «они с вас будут тянуть деньги до последнего» — 124 кадра.
 *
 * МЕТАФОРА: из стопки тянут по купюре, и с каждым разом быстрее. Уберите текст
 * — мысль читается одним движением: берут, берут, и берут, пока не останется
 * пустой контур.
 *
 * Промежутки между рывками сокращаются — 26, 46, 64, 80, 94, 106, 116: это и
 * есть «до последнего», и по этим же кадрам расставлен звук. Последний рывок
 * уходит за край кадра ровно на конце блока.
 *
 * Содержимое написано только у верхней купюры: в стопке нижние видны узкой
 * кромкой, и буквы на них наложились бы друг на друга кашей.
 */

const PULLS = [26, 46, 64, 80, 94, 106, 116];
const BILL_W = 1000;
const BILL_H = 170;
const STEP = 30;
const LEFT = (AREA_W - BILL_W) / 2;

export const B07: React.FC = () => {
  const frame = useCurrentFrame();
  // содержимое несёт верхняя купюра стопки и все, что уже в полёте
  const started = PULLS.filter((at) => frame >= at).length;

  return (
    <Scene>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <Label style={{ marginBottom: space.block * 0.7, marginLeft: LEFT }}>ваш счёт</Label>

        <div style={{ position: 'relative', width: AREA_W, height: STEP * PULLS.length + BILL_H }}>
          {/* то, что останется */}
          <div
            style={{
              position: 'absolute',
              left: LEFT,
              top: STEP * (PULLS.length - 1),
              width: BILL_W,
              height: BILL_H,
              boxSizing: 'border-box',
              borderRadius: radius.bar,
              border: `${border}px dashed ${color.line}`,
              ...lay(frame, 0, 26),
            }}
          />

          {PULLS.map((at, j) => {
            const gone = ramp(frame, at, at + 16, ease.fill);
            const appear = ramp(frame, (PULLS.length - 1 - j) * 3, (PULLS.length - 1 - j) * 3 + 12);
            const current = j <= started;
            return (
              <div
                key={at}
                style={{
                  position: 'absolute',
                  left: LEFT,
                  top: STEP * j,
                  zIndex: PULLS.length - j,
                  width: BILL_W,
                  height: BILL_H,
                  boxSizing: 'border-box',
                  borderRadius: radius.bar,
                  background: color.bgTop,
                  border: `${border}px solid ${color.line}`,
                  boxShadow: shadow.card,
                  display: 'flex',
                  alignItems: 'center',
                  paddingLeft: space.block,
                  opacity: appear * (1 - gone),
                  transform: `translate(${(AREA_W + BILL_W) * gone}px, ${
                    30 * (1 - appear) - 30 * gone
                  }px) rotate(${5 * gone}deg)`,
                }}
              >
                <span
                  style={css(type.stat, {
                    fontSize: 96,
                    color: 'rgba(11,15,20,0.20)',
                    opacity: current ? 1 : 0,
                  })}
                >
                  ₽
                </span>
                <div
                  style={{
                    marginLeft: space.block,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    opacity: current ? 1 : 0,
                  }}
                >
                  <span style={{ height: 14, width: 280, borderRadius: 7, background: color.pill }} />
                  <span style={{ height: 14, width: 170, borderRadius: 7, background: color.pill }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Scene>
  );
};
