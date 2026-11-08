import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { Scene } from '../../../core';
import { Rack, RACK_TOP, RACK_OFFSET, rackDrift, ramp, ease } from './_kit';

/**
 * Блок 14: «минимум три копии этих данных» — 105 кадров.
 *
 * Начало схемы, которая живёт шесть блоков подряд (14–19) и идёт между ними
 * встык: предмет продолжается из кадра в кадр, и стыка не должно быть видно.
 * Поэтому схема во всех шести рисуется одним компонентом и стоит на одном месте.
 *
 * В широком кадре цифра встала слева, а три места — в ряд справа от неё: так
 * ряду досталась вся ширина, а под ним осталось место, куда в блоке 18 уедет
 * третья копия.
 *
 * МЕТАФОРА: счёт. Цифра набирается — 1, 2, 3, — и рядом с ней встают три пустых
 * места, которые дальше по ролику заполняются одно за другим.
 *
 * Счёт идёт ровным темпом (а не по кривой), чтобы три щелчка легли равномерно:
 * кадры 26, 40, 56 — по ним и расставлен звук у блока.
 */

export const B14: React.FC = () => {
  const frame = useCurrentFrame();

  const counted = interpolate(frame, [18, 63], [0, 3], {
    easing: ease.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const shown = Math.min(3, Math.max(0, Math.round(counted)));
  // линия растёт ровным темпом: у затухающей кривой последние тридцать кадров
  // почти не двигались, и хвост блока замирал
  const underline = ramp(frame, 56, 102, ease.linear);

  return (
    <Scene>
      <div style={{ position: 'relative', flex: 1 }}>
        <div
          style={{
            position: 'absolute',
            top: RACK_TOP,
            left: 0,
            transform: rackDrift(frame, RACK_OFFSET.b14),
          }}
        >
          <Rack
            number={String(shown)}
            underline={underline}
            slots={[null, null, null]}
            slotAppear={[ramp(frame, 0, 12), ramp(frame, 5, 17), ramp(frame, 10, 22)]}
          />
        </div>
      </div>
    </Scene>
  );
};
