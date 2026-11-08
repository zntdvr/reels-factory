import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Scene, motion } from '../../../core';
import { AREA_W, Label, css, lay, ramp, shadow, border, color, type, radius, space, ease } from './_kit';

/**
 * Блок 2: «с таким запросом» — 60 кадров.
 *
 * МЕТАФОРА: запрос прилетает. На лист ложится сообщение и на глазах
 * дописывается, а следом приходит второе — это и есть «обратились с запросом»,
 * без единого слова о том, что показано. Синим только непрочитанная метка:
 * в кадре она и есть «вот оно».
 *
 * Движение: карточка ложится (8–24), фраза набирается (26–48), метка (48–56),
 * второе сообщение приезжает и сдвигает стопку (46–58). Последнее движение
 * кончается за два кадра до конца блока.
 *
 * Первое попадание звука стоит на восьмом кадре, а не на нулевом: у самого шва
 * система снимает попадания, и посадка карточки осталась бы немой.
 */

const TEXT = 'срочно нужна помощь';
const CARD_W = Math.round(AREA_W * 0.66);

export const B02: React.FC = () => {
  const frame = useCurrentFrame();

  const typed = Math.floor(ramp(frame, 26, 48, ease.linear) * TEXT.length);
  const unread = ramp(frame, 48, 56);
  const second = ramp(frame, 46, 58);

  return (
    <Scene>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        {/* стопка приподнимается, освобождая место второму сообщению */}
        <div style={{ transform: `translateY(${-52 * second}px)` }}>
          <div
            style={{
              width: CARD_W,
              boxSizing: 'border-box',
              borderRadius: radius.card,
              background: color.card,
              border: `${border}px solid ${color.line}`,
              boxShadow: shadow.object,
              padding: space.block * 0.8,
              ...lay(frame, 8, 56),
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Label>входящее · 21:40</Label>
              <span
                style={{
                  width: 26,
                  height: 26,
                  background: color.accent,
                  transform: `scale(${unread})`,
                }}
              />
            </div>

            <div
              style={css(type.title, {
                color: color.text,
                marginTop: space.gap,
                minHeight: type.title.size * 1.1,
              })}
            >
              {TEXT.slice(0, typed)}
            </div>

            {/* пока фраза дописывается — собеседник продолжает печатать */}
            <div style={{ display: 'flex', gap: 14, marginTop: space.gap }}>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: radius.pill,
                    background: color.text,
                    opacity: 0.18 + 0.5 * motion.osc01(frame, 34, i * 0.33),
                  }}
                />
              ))}
            </div>
          </div>

          {/* второе сообщение: букв читать не надо, это уже поток */}
          <div
            style={{
              width: CARD_W,
              boxSizing: 'border-box',
              marginTop: space.gap,
              borderRadius: radius.card,
              background: color.card,
              border: `${border}px solid ${color.line}`,
              boxShadow: shadow.card,
              padding: space.block * 0.55,
              opacity: second,
              transform: `translateY(${34 * (1 - second)}px)`,
            }}
          >
            <Label>входящее · 21:41</Label>
            <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <span style={{ height: 16, width: '86%', borderRadius: 8, background: color.pill }} />
              <span style={{ height: 16, width: '54%', borderRadius: 8, background: color.pill }} />
            </div>
          </div>
        </div>
      </div>
    </Scene>
  );
};
