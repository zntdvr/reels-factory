import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Scene, motion } from '../../../core';
import { AREA_W, AREA_H, FileCard, Label, ramp, color, ease } from './_kit';

/**
 * Блок 10: «это то что данные всегда необходимо бы копировать» — 155 кадров.
 *
 * ПОВОРОТ РОЛИКА. Здесь в кадре впервые появляется синее: до этого весь
 * проблемный кусок шёл чёрно-серым, и оттого первая копия читается как ответ,
 * а не как очередная карточка.
 *
 * МЕТАФОРА: из файла одна за другой выходят его копии и складываются рядом
 * стопкой. Синее приходит последним — ровно на слове «копировать» (кадры 120+),
 * как и велит идиома стиля.
 *
 * Движение: оригинал ложится (0–18), копии выходят (22–42, 54–74, 86–106),
 * акцент загорается (112–152). Промежутки между соседними движениями — по
 * двенадцать кадров: раньше между копиями провисало двадцать, и кадр замирал.
 *
 * Имя пишется только у верхней копии: в стопке остальные видны кромкой, и
 * буквы на них наложились бы друг на друга кашей.
 */

const NAME = '1С_база.dbf';
const COPIES = [22, 54, 86];
const CARD_W = 420;
const CARD_H = 170;
const RUN = 560;
const STEP = 40;
const ORIG_X = Math.round((AREA_W - (RUN + STEP * 2 + CARD_W)) / 2);
const ROW_Y = Math.round(AREA_H / 2) - 40;

export const B10: React.FC = () => {
  const frame = useCurrentFrame();
  const wander = motion.drift(frame, 'b10-stack', 10);
  const accent = ramp(frame, 112, 152);
  const first = ramp(frame, 0, 18);

  return (
    <Scene>
      <div style={{ position: 'relative', flex: 1 }}>
        <div style={{ position: 'absolute', left: ORIG_X, top: ROW_Y - 90 }}>
          <Label>оригинал · копии</Label>
        </div>

        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: AREA_W,
            height: AREA_H,
            transform: `translate(${wander.x}px, ${wander.y}px)`,
          }}
        >
          {COPIES.map((at, i) => {
            const out = ramp(frame, at, at + 20, ease.enter);
            const mark = ramp(frame, 112 + i * 8, 112 + i * 8 + 16);
            const top = i === COPIES.length - 1 || frame < COPIES[i + 1];
            return (
              <div
                key={at}
                style={{
                  position: 'absolute',
                  left: ORIG_X,
                  top: ROW_Y,
                  zIndex: i + 1,
                  opacity: out,
                  transform: `translate(${(RUN + i * STEP) * out}px, ${-i * STEP * out}px)`,
                }}
              >
                <FileCard name={NAME} mark={mark} bare={!top} width={CARD_W} height={CARD_H} />
              </div>
            );
          })}

          {/* оригинал остаётся на месте: копируют его, а не уносят */}
          <div
            style={{
              position: 'absolute',
              left: ORIG_X,
              top: ROW_Y,
              zIndex: 9,
              opacity: first,
              transform: `translateY(${34 * (1 - first)}px)`,
            }}
          >
            <FileCard name={NAME} width={CARD_W} height={CARD_H} />
          </div>

          {/* волосяная связь оригинала с копиями — синее приходит последним */}
          <div
            style={{
              position: 'absolute',
              left: ORIG_X + CARD_W,
              top: ROW_Y + CARD_H / 2,
              zIndex: 10,
              width: (RUN - CARD_W) * accent,
              height: 4,
              background: color.accent,
              opacity: accent,
            }}
          />
        </div>
      </div>
    </Scene>
  );
};
