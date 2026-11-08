import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Scene, motion } from '../../../core';
import { AREA_W, AREA_H, FileCard, Padlock, ramp, color, space, ease } from './_kit';

/**
 * Блок 3: «что их взломали хакеры и все их данные заблокировали» — 146 кадров.
 *
 * МЕТАФОРА: по данным компании сверху вниз проходит полоса, и всё, чего она
 * коснулась, гаснет. Уберите текст — мысль читается: живое становится мёртвым,
 * ряд за рядом, и сверху садится замок.
 *
 * Сетка нарочно не растянута на всю ширину широкого кадра: шесть карточек в
 * шесть колонок читались бы лентой, а не массивом данных. Два столбца по три —
 * и полоса гашения идёт по ним зигзагом, по одной карточке за раз.
 *
 * Синего в кадре нет намеренно. В этом стиле синее значит «вот оно, смотрите»,
 * а беда показывается серым: весь проблемный кусок ролика живёт без акцента,
 * и оттого первая синяя копия дальше по ролику читается как событие.
 *
 * Движение: карточки ложатся (8–40), полоса идёт по сетке (26–122) и гасит их
 * на кадрах 30/48/66/84/102/120, замок закрывается (118–134), и следом вся
 * сетка уходит вглубь листа (124–146).
 */

const NAMES = [
  '1С_база.dbf',
  'Договоры.zip',
  'Бухгалтерия',
  'Почта',
  'Клиенты.xlsx',
  'Сайт',
];

export const GRID_W = 1100;
const COL_GAP = 60;
const ROW_GAP = 24;
export const CARD_W = (GRID_W - COL_GAP) / 2;
export const CARD_H = 160;
export const GRID_H = CARD_H * 3 + ROW_GAP * 2;
export const GRID_LEFT = Math.round((AREA_W - GRID_W) / 2);
export const GRID_TOP = Math.round((AREA_H - GRID_H) / 2);

export const B03: React.FC = () => {
  const frame = useCurrentFrame();

  const sweep = ramp(frame, 26, 122, ease.linear);
  const closed = ramp(frame, 118, 134);
  // ровным темпом, а не по кривой: у затухающей кривой последние кадры почти
  // не двигаются, и хвост блока снова оказывается неподвижным
  const sink = ramp(frame, 124, 146, ease.linear);
  const wander = motion.drift(frame, 'b03-grid', 9);

  return (
    <Scene>
      <div style={{ position: 'relative', flex: 1 }}>
        <div
          style={{
            position: 'absolute',
            left: GRID_LEFT,
            top: GRID_TOP,
            width: GRID_W,
            transform: `translate(${wander.x}px, ${wander.y + 34 * sink}px) scale(${1 - 0.05 * sink})`,
            opacity: 1 - 0.18 * sink,
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: COL_GAP, rowGap: ROW_GAP }}>
            {NAMES.map((name, i) => {
              const at = 30 + i * 18;
              const dead = ramp(frame, at, at + 10);
              const appear = ramp(frame, 8 + i * 4, 20 + i * 4);
              return (
                <div
                  key={name}
                  style={{
                    opacity: appear,
                    transform: `translateY(${34 * (1 - appear)}px) scale(${1 - 0.03 * dead})`,
                  }}
                >
                  <FileCard name={name} dead={dead} width={CARD_W} height={CARD_H} />
                </div>
              );
            })}
          </div>

          {/* полоса, которая гасит данные: одно продолженное движение на весь блок */}
          <div
            style={{
              position: 'absolute',
              left: -space.gap,
              width: GRID_W + space.gap * 2,
              top: sweep * GRID_H,
              height: 4,
              background: color.text,
              opacity: sweep > 0 && sweep < 1 ? 0.55 : 0,
            }}
          />

          {/* замок садится сверху, когда гасить больше нечего */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: GRID_H / 2,
              transform: `translate(-50%, -50%) scale(${0.9 + 0.1 * closed})`,
              opacity: closed,
            }}
          >
            <Padlock size={280} closed={closed} />
          </div>
        </div>
      </div>
    </Scene>
  );
};
