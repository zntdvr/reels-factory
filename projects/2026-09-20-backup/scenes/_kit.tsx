import React from 'react';
import { interpolate } from 'remotion';
import { SAFE_WIDTH, color, dur, ease, radius, safe, space, tokens, type } from '../../../core';
import type { TypeStep } from '../../../core';

/**
 * ОБЩИЕ ДЕТАЛИ ЭТОГО РОЛИКА. Не ядро и не стиль — только то, что повторяется от
 * сцены к сцене внутри одного ролика: бумажная карточка файла, замок, схема
 * трёх копий, разметка уровня типографики в css.
 *
 * Всё внешнее берётся из токенов и из ядра: своих цветов, кеглей и скруглений
 * здесь нет, а ширина и высота рабочей зоны спрашиваются у формата, а не
 * записаны числом. Ролик переехал из вертикали в горизонт, и всё, что считалось
 * от кадра, переехало вместе с ним само.
 */

export const shadow = tokens.extra?.shadow as { object: string; card: string };
export const dotToken = tokens.extra?.dot as { ratio: number; gap: number };
export const border = (tokens.extra?.border as number) ?? 2;

/** Рабочая зона широкого кадра: 1700 × 726 при формате 1920×1080. */
export const AREA_W = SAFE_WIDTH;
export const AREA_H = safe.contentHeight;

/**
 * Уровень типографики -> css. В токенах лежит ОПИСАНИЕ уровня, а не готовые
 * свойства: спред `...type.hero` молча не даст ни кегля, ни шрифта.
 */
export const css = (step: TypeStep, over?: React.CSSProperties): React.CSSProperties => ({
  fontFamily: step.family,
  fontWeight: step.weight,
  fontSize: step.size,
  lineHeight: step.lh,
  letterSpacing: step.ls,
  textTransform: step.uppercase ? 'uppercase' : undefined,
  ...over,
});

/**
 * Предметный вход: вещь приезжает и останавливается с мягким доводом.
 * Перелёта нет — в этом мире вещи кладут, а не бросают.
 */
export function lay(frame: number, delay = 0, from = 40): React.CSSProperties {
  const f = frame - delay;
  return {
    opacity: interpolate(f, [0, dur.enter], [0, 1], {
      easing: ease.enter,
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
    transform: `translateY(${interpolate(f, [0, dur.enter + 4], [from, 0], {
      easing: ease.enter,
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })}px)`,
  };
}

/** Мягкое значение 0..1 между двумя кадрами. Основной рабочий инструмент сцен. */
export function ramp(frame: number, from: number, to: number, easing = ease.enter) {
  return interpolate(frame, [from, to], [0, 1], {
    easing,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

/** Квадрат-точка бренда: знак завершённого утверждения. */
export const Dot: React.FC<{ size: number; visible: number }> = ({ size, visible }) => {
  const side = size * dotToken.ratio;
  return (
    <span
      style={{
        display: 'inline-block',
        width: side,
        height: side,
        marginLeft: size * dotToken.gap,
        background: color.accent,
        transform: `scale(${visible})`,
        transformOrigin: 'center bottom',
      }}
    />
  );
};

/** Функциональная подпись. Только моно — так велит идиома. */
export const Label: React.FC<{
  children: React.ReactNode;
  tone?: string;
  style?: React.CSSProperties;
}> = ({ children, tone = color.textFaint, style }) => (
  <div style={css(type.label, { color: tone, ...style })}>{children}</div>
);

/**
 * КАРТОЧКА ФАЙЛА — главный предмет этого ролика. У вещи есть имя, и оно
 * написано: серая полоска вместо имени превратила бы данные в абстракцию, а
 * весь разговор именно про конкретные данные компании.
 */
export const FileCard: React.FC<{
  name: string;
  /** 0 — живой файл, 1 — обесцвеченный, запертый. */
  dead?: number;
  /** 0..1 — синяя метка «вот оно». */
  mark?: number;
  /** Карточка в стопке: имя пишется только у верхней, иначе буквы налезают. */
  bare?: boolean;
  width?: number;
  height?: number;
  style?: React.CSSProperties;
}> = ({ name, dead = 0, mark = 0, bare = false, width = 420, height = 170, style }) => (
  <div
    style={{
      width,
      height,
      boxSizing: 'border-box',
      borderRadius: radius.card,
      background: dead > 0.5 ? color.pill : color.card,
      border: `${border}px solid ${mark > 0.5 ? color.accent : color.line}`,
      boxShadow: dead > 0.5 ? 'none' : shadow.card,
      padding: space.gap,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      ...style,
    }}
  >
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: radius.icon * 0.5,
        background: mark > 0.5 ? color.accent : dead > 0.5 ? 'rgba(11,15,20,0.16)' : color.text,
        opacity: (1 - 0.45 * dead) * (bare ? 0 : 1),
      }}
    />
    <div
      style={css(type.small, {
        fontWeight: 600,
        color: dead > 0.5 ? color.textFaint : color.text,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        opacity: bare ? 0 : 1,
      })}
    >
      {name}
    </div>
  </div>
);

/**
 * ЗАМОК. `closed` 0..1 опускает дужку: это и есть момент «заблокировали».
 * Чёрный, не синий: в этом мире синим красится то, ради чего снят кадр, а не
 * беда — беда показывается серым и чёрным.
 */
export const Padlock: React.FC<{ size: number; closed: number; tone?: string }> = ({
  size,
  closed,
  tone = color.text,
}) => (
  <svg viewBox="0 0 100 120" width={size} height={size * 1.2} style={{ display: 'block' }}>
    <path
      d={`M30 ${52 - 14 * (1 - closed)} v${-14 - 10 * (1 - closed)} a20 20 0 0 1 40 0 v${14 + 10 * (1 - closed)}`}
      fill="none"
      stroke={tone}
      strokeWidth="11"
      strokeLinecap="round"
    />
    <rect x="16" y="50" width="68" height="58" rx="14" fill={tone} />
    <rect x="45" y="68" width="10" height="22" rx="5" fill={color.bgTop} />
  </svg>
);

/** Слот под копию: пустое место, которое ещё предстоит занять. */
export const Slot: React.FC<{
  width: number;
  height: number;
  filled?: number;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}> = ({ width, height, filled = 0, style, children }) => (
  <div
    style={{
      width,
      height,
      boxSizing: 'border-box',
      borderRadius: radius.card,
      border: `${border}px ${filled > 0.5 ? 'solid' : 'dashed'} ${
        filled > 0.5 ? color.accentLine : color.line
      }`,
      background: filled > 0.5 ? color.accentLight : 'transparent',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      ...style,
    }}
  >
    {children}
  </div>
);

/**
 * ГЕОМЕТРИЯ СХЕМЫ ТРЁХ КОПИЙ — блоки 14–19 идут встык, и схема обязана стоять
 * в них на одном и том же месте: иначе на стыке предмет прыгнет.
 *
 * В широком кадре схема легла иначе, чем в вертикальном: цифра слева, три места
 * в ряд справа от неё. Так ряд получает всю ширину, а под ним остаётся место
 * для «снаружи», куда в блоке 18 уезжает третья копия.
 */
export const NUM_W = 340;
export const SLOTS_X = NUM_W + 40;
export const SLOT_GAP = 60;
export const SLOT_W = Math.floor((AREA_W - SLOTS_X - SLOT_GAP * 2) / 3);
export const SLOT_H = 220;
export const RACK_H = 250;
/** Схема стоит по центру рабочей зоны. */
export const RACK_TOP = Math.round((AREA_H - RACK_H) / 2);
/** Насколько схема поднимается в блоке 18, освобождая место под чертой. */
export const LIFT = RACK_TOP - 40;
export const LINE_Y = 340;
export const OUT_Y = 420;
export const OUT_X = Math.round((AREA_W - SLOT_W) / 2);
export const DEST_GAP = 60;

/**
 * Схема живёт общим дрейфом на все шесть блоков: смещение кадра продолжает
 * счёт предыдущих блоков, поэтому на стыке встык ничего не дёргается.
 */
export const RACK_OFFSET = { b14: 0, b15: 105, b16: 170, b17: 251, b18: 314, b19: 461 };

/**
 * ФАЗА ПОЛОСЫ РАБОЧЕЙ КОПИИ. Полоса сначала растёт (блок 15), а дальше идёт по
 * кругу, и круг обязан продолжаться через стыки встык — иначе на каждом стыке
 * она дёргалась бы назад. Числа — сколько кадров прошло с момента, когда она
 * заполнилась впервые.
 */
export const WORK_PHASE = { b16: 5, b17: 86, b18: 149, b19: 296 };

export function rackDrift(frame: number, offset: number) {
  const f = frame + offset;
  const x = 8 * Math.sin((f / 168) * Math.PI * 2);
  const y = 5 * Math.sin((f / 214) * Math.PI * 2 + 1.1);
  return `translate(${x}px, ${y}px)`;
}

/** Занятая копия: та же карточка, но с именем роли и синей меткой. */
export const CopyCard: React.FC<{ title: string; note: string; live?: number }> = ({
  title,
  note,
  live = 0,
}) => (
  <div
    style={{
      width: SLOT_W,
      height: SLOT_H,
      boxSizing: 'border-box',
      borderRadius: radius.card,
      background: color.card,
      border: `${border}px solid ${color.accent}`,
      boxShadow: shadow.card,
      padding: space.gap + 6,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
    }}
  >
    <div style={{ width: 42, height: 42, background: color.accent }} />
    <div>
      <div style={css(type.listTitle, { color: color.text, fontSize: 38 })}>{title}</div>
      <div style={css(type.label, { color: color.textFaint, fontSize: 24, marginTop: 8 })}>{note}</div>
      {live > 0 && (
        <div
          style={{
            marginTop: 16,
            height: 18,
            borderRadius: radius.bar * 0.6,
            background: color.pill,
            overflow: 'hidden',
          }}
        >
          <div style={{ width: `${live * 100}%`, height: '100%', background: color.accent }} />
        </div>
      )}
    </div>
  </div>
);

/**
 * СХЕМА ТРЁХ КОПИЙ целиком. Блоки 14–19 рисуют её одним и тем же компонентом,
 * поэтому на стыках встык ничего не прыгает: меняется только начинка слотов.
 */
export const Rack: React.FC<{
  number: string;
  underline?: number;
  slots: (React.ReactNode | null)[];
  slotAppear?: number[];
}> = ({ number, underline = 0, slots, slotAppear = [1, 1, 1] }) => (
  <div style={{ position: 'relative', width: AREA_W, height: RACK_H }}>
    <div style={{ position: 'absolute', left: 0, top: 0, width: NUM_W }}>
      <div style={css(type.label, { color: color.textFaint })}>копии данных</div>
      {/* «минимум» — функциональная подпись к числу, поэтому моно и мелко:
          заголовком она не влезала в свою колонку и налезала на первый слот */}
      <div style={{ display: 'flex', alignItems: 'baseline' }}>
        <span style={css(type.stat, { color: color.accent })}>{number}</span>
        <span style={css(type.label, { color: color.textMuted, marginLeft: 22 })}>минимум</span>
      </div>
      <div style={{ width: NUM_W * underline, height: 6, background: color.accent, marginTop: 12 }} />
    </div>

    <div style={{ position: 'absolute', left: SLOTS_X, top: 0, display: 'flex', gap: SLOT_GAP }}>
      {slots.map((node, i) => (
        <div
          key={i}
          style={{
            opacity: slotAppear[i],
            transform: `translateY(${30 * (1 - slotAppear[i])}px)`,
          }}
        >
          {node ?? <Slot width={SLOT_W} height={SLOT_H} />}
        </div>
      ))}
    </div>
  </div>
);

export { color, type, radius, space, dur, ease };
