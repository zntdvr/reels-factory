import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Scene, motion } from '../../../core';
import {
  AREA_W, AREA_H, FileCard, Padlock, Label, css, ramp, shadow, border,
  color, type, radius, space, ease,
} from './_kit';
import { GRID_W, GRID_H, GRID_LEFT, GRID_TOP, CARD_W, CARD_H } from './B03';

/**
 * Блок 4: «и теперь просят за эти данные выкуп» — 87 кадров.
 *
 * Идёт встык с предыдущим: запертая сетка та же, на том же месте и в том же
 * состоянии — она как раз ушла вглубь листа, и здесь это движение продолжается,
 * а не начинается заново.
 *
 * Дальше широкий кадр работает по-своему: сетка уезжает влево и уменьшается, а
 * справа встаёт требование. В вертикали они стояли друг под другом — тут им
 * хватает места рядом, и обе вещи видно целиком.
 *
 * МЕТАФОРА: часы. Данные ещё видны, но говорить о них уже поздно — пошёл счёт.
 * Полоса срока убывает до самого последнего кадра блока.
 */

const NAMES = ['1С_база.dbf', 'Договоры.zip', 'Бухгалтерия', 'Почта', 'Клиенты.xlsx', 'Сайт'];
const COL_GAP = 60;
const DEMAND_X = 900;
const DEMAND_W = AREA_W - DEMAND_X;

const clock = (frame: number) => {
  const left = 86398 - Math.floor(frame / 3);
  const h = Math.floor(left / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
};

export const B04: React.FC = () => {
  const frame = useCurrentFrame();

  // предыдущий блок кончился тем, что сетка ушла вглубь листа: здесь она
  // возвращается — не прыгает на стыке, а продолжает то же движение
  const settle = ramp(frame, 0, 24, ease.fill);
  const move = ramp(frame, 6, 40, ease.enter);
  const card = ramp(frame, 16, 42);
  const body = ramp(frame, 38, 50);
  const drain = ramp(frame, 46, 87, ease.linear);
  const wander = motion.drift(frame + 146, 'b03-grid', 9);

  const scale = 0.95 + 0.05 * settle - 0.26 * move;

  return (
    <Scene>
      <div style={{ position: 'relative', flex: 1 }}>
        <div
          style={{
            position: 'absolute',
            left: GRID_LEFT,
            top: GRID_TOP,
            width: GRID_W,
            transform: `translate(${wander.x - 443 * move}px, ${
              wander.y + 34 * (1 - settle)
            }px) scale(${scale})`,
            opacity: (0.82 + 0.18 * settle) * (1 - 0.25 * card),
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: COL_GAP, rowGap: 24 }}>
            {NAMES.map((name) => (
              <FileCard key={name} name={name} dead={1} width={CARD_W} height={CARD_H} />
            ))}
          </div>

          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: GRID_H / 2,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <Padlock size={280} closed={1} />
          </div>
        </div>

        {/* требование приезжает справа и встаёт рядом с запертыми данными */}
        <div
          style={{
            position: 'absolute',
            left: DEMAND_X,
            top: Math.round((AREA_H - 330) / 2),
            width: DEMAND_W,
            boxSizing: 'border-box',
            borderRadius: radius.card,
            background: color.bgTop,
            border: `${border}px solid ${color.text}`,
            boxShadow: shadow.object,
            padding: space.block * 0.7,
            opacity: card,
            transform: `translateX(${160 * (1 - card)}px)`,
          }}
        >
          <Label tone={color.text}>требование</Label>

          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 14, opacity: body }}>
            <span style={{ height: 16, width: '92%', borderRadius: 8, background: color.pill }} />
            <span style={{ height: 16, width: '70%', borderRadius: 8, background: color.pill }} />
          </div>

          <div
            style={{
              marginTop: space.block * 0.7,
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              opacity: body,
            }}
          >
            <Label>осталось</Label>
            <span style={css(type.title, { color: color.text, fontFamily: type.label.family })}>
              {clock(frame)}
            </span>
          </div>

          <div
            style={{
              marginTop: 22,
              height: 14,
              borderRadius: radius.bar,
              background: color.pill,
              overflow: 'hidden',
              opacity: body,
            }}
          >
            <div
              style={{
                width: `${100 * (1 - drain)}%`,
                height: '100%',
                background: color.text,
                opacity: 0.55,
              }}
            />
          </div>
        </div>
      </div>
    </Scene>
  );
};
