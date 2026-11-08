import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Scene, motion } from '../../../core';
import { AREA_W, AREA_H, FileCard, css, ramp, color, type, ease } from './_kit';

/**
 * Блок 12: «это копия ваших данных» — 65 кадров.
 *
 * МЕТАФОРА: равенство. Из файла выезжает второй такой же, и между ними встаёт
 * знак равно — определение показано, а не рассказано. Слов в кадре нет
 * намеренно: сцена понятна без них, а имя файла у вещи уже написано.
 *
 * Блок короткий, поэтому движений три и они плотные: оригинал (0–14), выезд
 * копии (18–38), знак и акцент (38–54). Дальше пара дрейфует до конца блока.
 */

const NAME = '1С_база.dbf';
const CARD_W = 500;
const CARD_H = 320;
const SHIFT = 640;
const LEFT = Math.round((AREA_W - (SHIFT + CARD_W)) / 2);
const TOP = Math.round((AREA_H - CARD_H) / 2);

export const B12: React.FC = () => {
  const frame = useCurrentFrame();

  const firstIn = ramp(frame, 0, 14);
  const out = ramp(frame, 18, 38, ease.enter);
  const equals = ramp(frame, 38, 48);
  const mark = ramp(frame, 44, 54);
  const wander = motion.drift(frame, 'b12-pair', 8);

  return (
    <Scene>
      <div style={{ position: 'relative', flex: 1 }}>
        <div
          style={{
            position: 'absolute',
            left: LEFT,
            top: TOP,
            width: SHIFT + CARD_W,
            height: CARD_H,
            transform: `translate(${wander.x}px, ${wander.y}px)`,
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              opacity: out,
              transform: `translateX(${SHIFT * out}px)`,
            }}
          >
            <FileCard name={NAME} mark={mark} width={CARD_W} height={CARD_H} />
          </div>

          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              opacity: firstIn,
              transform: `translateY(${34 * (1 - firstIn)}px)`,
            }}
          >
            <FileCard name={NAME} width={CARD_W} height={CARD_H} />
          </div>

          <div
            style={{
              position: 'absolute',
              left: CARD_W,
              top: 0,
              width: SHIFT - CARD_W,
              height: CARD_H,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: equals,
            }}
          >
            <span style={css(type.stat, { fontSize: 120, color: color.text })}>=</span>
          </div>
        </div>
      </div>
    </Scene>
  );
};
