import React from 'react';
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from 'remotion';
import {
  Scene,
  Stage,
  anim,
  color,
  dur,
  ease,
  radius,
  space,
  tokens,
  type,
} from '../../core';
import type { TypeStep } from '../../core';

/**
 * ВИТРИНА СТИЛЯ «Синяя точка». Не ролик и не образец сцены — проба пера:
 * четыре кадра на разных приёмах, чтобы посмотреть стиль глазами до того, как
 * по нему начнут собирать настоящие ролики.
 *
 * Папку можно удалить в любой момент, на производство она не влияет.
 */

const SCENE = 105;

/**
 * Уровень типографики -> css. В токенах лежит ОПИСАНИЕ уровня (size, weight,
 * family), а не готовые css-свойства, и разложить его нужно явно: спред
 * `...type.hero` молча не даст ни кегля, ни шрифта.
 */
const css = (step: TypeStep, over?: React.CSSProperties): React.CSSProperties => ({
  fontFamily: step.family,
  fontWeight: step.weight,
  fontSize: step.size,
  lineHeight: step.lh,
  letterSpacing: step.ls,
  textTransform: step.uppercase ? 'uppercase' : undefined,
  ...over,
});

/** Квадрат-точка бренда: знак завершённого утверждения. */
const Dot: React.FC<{ size: number; visible: number }> = ({ size, visible }) => {
  const d = tokens.extra?.dot as { ratio: number; gap: number };
  const side = size * d.ratio;
  return (
    <span
      style={{
        display: 'inline-block',
        width: side,
        height: side,
        marginLeft: size * d.gap,
        background: color.accent,
        transform: `scale(${visible})`,
        transformOrigin: 'center bottom',
      }}
    />
  );
};

/**
 * Предметный вход: вещь приезжает снизу и останавливается с мягким доводом.
 * Перелёта нет — в этом мире вещи кладут, а не бросают.
 */
function lay(frame: number, delay = 0, from = 40): React.CSSProperties {
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

// ─────────────────────────────────────────────────────────
// 1. ЗАГОЛОВОК. Синее приходит последним и есть ударный момент.
// ─────────────────────────────────────────────────────────
const SceneHeadline: React.FC = () => {
  const frame = useCurrentFrame();
  const accentIn = interpolate(frame, [26, 26 + dur.accent], [0, 1], {
    easing: ease.enter,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <Scene>
      <div style={{ marginTop: 100 }}>
        <div style={css(type.hero, { color: color.text })}>
          <div style={lay(frame, 0)}>Кто у вас</div>
          <div style={lay(frame, dur.stagger)}>чинит</div>
          <div style={lay(frame, dur.stagger * 2)}>
            принтер
            <span style={{ color: color.accent, opacity: accentIn }}>?</span>
          </div>
        </div>

        <div
          style={css(type.body, {
            color: color.textMuted,
            marginTop: space.block,
            maxWidth: 780,
            ...lay(frame, dur.stagger * 4, 20),
          })}
        >
          Если бухгалтер — <b style={{ fontWeight: 700, color: color.text }}>досмотрите до конца.</b>
        </div>
      </div>
    </Scene>
  );
};

// ─────────────────────────────────────────────────────────
// 2. ЧИСЛО. Цифра набирается, а не появляется готовой.
// ─────────────────────────────────────────────────────────
const SceneStat: React.FC = () => {
  const frame = useCurrentFrame();
  const value = anim.counter(frame, 17, 0, 10, dur.fillLong);
  const dotIn = interpolate(frame, [10 + dur.fillLong, 10 + dur.fillLong + 8], [0, 1], {
    easing: ease.enter,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <Scene>
      <div style={{ marginTop: 120 }}>
        <div style={css(type.label, { color: color.textFaint, ...lay(frame, 0, 16) })}>
          Сервер упал в 9:02
        </div>

        <div
          style={css(type.stat, {
            color: color.text,
            marginTop: space.gap,
            display: 'flex',
            alignItems: 'baseline',
            ...lay(frame, dur.stagger, 24),
          })}
        >
          <span style={{ color: color.accent }}>{Math.round(value)}</span>
          <span style={css(type.title, { color: color.textMuted, marginLeft: 20 })}>минут</span>
          {/* Точка соразмерна слову, к которому приставлена, а не соседней цифре. */}
          <Dot size={type.title.size} visible={dotIn} />
        </div>

        <div
          style={css(type.body, {
            color: color.textMuted,
            marginTop: space.block,
            maxWidth: 800,
            ...lay(frame, dur.stagger * 3, 20),
          })}
        >
          Столько прошло до того, как он снова заработал.{' '}
          <b style={{ fontWeight: 700, color: color.text }}>Без вашего звонка.</b>
        </div>
      </div>
    </Scene>
  );
};

// ─────────────────────────────────────────────────────────
// 3. РОСТ. Полоса заполняется слева направо; серое — «было», синее — «стало».
// ─────────────────────────────────────────────────────────
const Bar: React.FC<{
  label: string;
  value: string;
  fill: number;
  accent?: boolean;
  delay: number;
}> = ({ label, value, fill, accent = false, delay }) => {
  const frame = useCurrentFrame();
  const grown = anim.grow(frame, delay + dur.enter, dur.fill);

  return (
    <div style={lay(frame, delay, 20)}>
      <div style={css(type.small, { fontWeight: 600, color: color.text, marginBottom: 12 })}>
        {label}
      </div>
      <div
        style={{
          height: 76,
          background: color.pill,
          borderRadius: radius.bar,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${fill * grown * 100}%`,
            height: '100%',
            background: accent ? color.accent : 'rgba(11,15,20,0.18)',
            borderRadius: radius.bar,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            paddingRight: 22,
          }}
        >
          <span
            style={css(type.label, {
              fontSize: 26,
              color: accent ? color.onAccent : color.text,
              opacity: grown > 0.5 ? 1 : 0,
              whiteSpace: 'nowrap',
            })}
          >
            {value}
          </span>
        </div>
      </div>
    </div>
  );
};

const SceneBars: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <Scene>
      <div style={{ marginTop: 110 }}>
        <div style={css(type.title, { color: color.text, ...lay(frame, 0) })}>
          Час в день
          <br />
          возвращается
          <Dot size={type.title.size} visible={1} />
        </div>

        <div style={{ marginTop: 80, display: 'flex', flexDirection: 'column', gap: 40 }}>
          <Bar label="Было" value="2 ч 40 мин" fill={0.92} delay={dur.stagger * 2} />
          <Bar label="Стало" value="18 мин" fill={0.24} accent delay={dur.stagger * 4} />
        </div>

        <div
          style={css(type.label, {
            color: color.textFaint,
            marginTop: 56,
            ...lay(frame, dur.stagger * 7, 14),
          })}
        >
          Простой техники · месяц
        </div>
      </div>
    </Scene>
  );
};

// ─────────────────────────────────────────────────────────
// 4. ЖИВОЙ ОБЪЕКТ. Клавишу кладут на лист, и она нажимается.
// ─────────────────────────────────────────────────────────
const SceneObject: React.FC = () => {
  const frame = useCurrentFrame();
  const shadow = tokens.extra?.shadow as { object: string; card: string };

  /** Нажатие: клавиша уходит вниз и возвращается. Ударный момент сцены. */
  const press = interpolate(frame, [42, 48, 60], [0, 1, 0], {
    easing: ease.fill,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <Scene>
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ ...lay(frame, 0, 56), transform: `translateY(${press * 10}px)` }}>
          <svg viewBox="0 0 200 170" width={620} height={527} style={{ display: 'block' }}>
            <defs>
              <linearGradient id="k-skirt" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#FFFFFF" />
                <stop offset="1" stopColor="#C9CED6" />
              </linearGradient>
              <linearGradient id="k-front" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#D5D9E0" />
                <stop offset="1" stopColor="#AEB5C0" />
              </linearGradient>
              <linearGradient id="k-face" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#FFFFFF" />
                <stop offset="1" stopColor="#E6E9EE" />
              </linearGradient>
              <filter id="k-drop" x="-30%" y="-30%" width="160%" height="170%">
                <feDropShadow dx="0" dy="10" stdDeviation="9" floodColor="#0B0F14" floodOpacity="0.22" />
              </filter>
              <filter id="k-soft" x="-40%" y="-80%" width="180%" height="260%">
                <feGaussianBlur stdDeviation="8" />
              </filter>
            </defs>

            <ellipse
              cx="100"
              cy="150"
              rx={72 - press * 5}
              ry={10 - press * 2}
              fill="#0B0F14"
              opacity={0.2 + press * 0.05}
              filter="url(#k-soft)"
            />
            <g filter="url(#k-drop)">
              <path
                d="M34 52 Q34 40 46 40 L154 40 Q166 40 166 52 L172 124 Q172 138 158 138 L42 138 Q28 138 28 124 Z"
                fill="url(#k-skirt)"
              />
              <path
                d="M28 118 L172 118 L172 124 Q172 138 158 138 L42 138 Q28 138 28 124 Z"
                fill="url(#k-front)"
              />
              <rect
                x="46"
                y={46 + press * 5}
                width="108"
                height={66 - press * 5}
                rx="13"
                fill="url(#k-face)"
                stroke="#FFFFFF"
                strokeWidth="1.2"
              />
            </g>
            <rect x="118" y={80 + press * 4} width="18" height="18" fill="#245CFF" />
            <rect x="118" y={80 + press * 4} width="18" height="4" fill="#FFFFFF" opacity="0.18" />
          </svg>
        </div>

        <div style={{ width: '100%', marginTop: 70 }}>
          <div style={css(type.title, { color: color.text, ...lay(frame, dur.stagger * 3, 24) })}>
            ИТ офиса
            <br />
            в одну кнопку
            {/* Точка ставится нажатием и больше не исчезает: утверждение завершено. */}
            <Dot size={type.title.size} visible={frame >= 46 ? 1 : 0} />
          </div>

          <div
            style={css(type.body, {
              color: color.textMuted,
              marginTop: space.gap + 12,
              boxShadow: shadow.card,
              background: color.card,
              border: `2px solid ${color.line}`,
              borderRadius: radius.card,
              padding: '28px 32px',
              ...lay(frame, dur.stagger * 6, 24),
            })}
          >
            Принтер снова печатает.{' '}
            <b style={{ fontWeight: 700, color: color.text }}>Бухгалтер свободен.</b>
          </div>
        </div>
      </div>
    </Scene>
  );
};

export const Showcase: React.FC = () => (
  <Stage>
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={SCENE}>
        <SceneHeadline />
      </Sequence>
      <Sequence from={SCENE} durationInFrames={SCENE}>
        <SceneStat />
      </Sequence>
      <Sequence from={SCENE * 2} durationInFrames={SCENE}>
        <SceneBars />
      </Sequence>
      <Sequence from={SCENE * 3} durationInFrames={SCENE}>
        <SceneObject />
      </Sequence>
    </AbsoluteFill>
  </Stage>
);

export const SHOWCASE_FRAMES = SCENE * 4;
