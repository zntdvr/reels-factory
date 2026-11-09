import React from 'react';
import { interpolate } from 'remotion';
import {
  SAFE_WIDTH,
  color,
  dur,
  ease,
  radius,
  safe,
  space,
  tokens,
  type,
  VIDEO,
} from '../../../core';
import type { TypeStep } from '../../../core';

export const shadow = tokens.extra?.shadow as { object: string; card: string };
export const dotToken = tokens.extra?.dot as { ratio: number; gap: number };
export const border = (tokens.extra?.border as number) ?? 2;

export const AREA_W = SAFE_WIDTH; // 900px
export const AREA_H = safe.contentHeight; // 1310px

/** Преобразование шкалы типографики в стили */
export const css = (step: TypeStep, over?: React.CSSProperties): React.CSSProperties => ({
  fontFamily: step.family,
  fontWeight: step.weight,
  fontSize: step.size,
  lineHeight: step.lh,
  letterSpacing: step.ls,
  textTransform: step.uppercase ? 'uppercase' : undefined,
  ...over,
});

/** Мягкий плавный переход 0..1 между двумя номерами кадров */
export function ramp(frame: number, from: number, to: number, easing = ease.enter) {
  return interpolate(frame, [from, to], [0, 1], {
    easing,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

/** Предметный вход: вещь приезжает и мягко ложится */
export function lay(frame: number, delay = 0, from = 40): React.CSSProperties {
  const f = frame - delay;
  return {
    opacity: interpolate(f, [0, dur.enter], [0, 1], {
      easing: ease.enter,
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
    transform: `translateY(${interpolate(f, [0, dur.enter + 6], [from, 0], {
      easing: ease.enter,
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })}px)`,
  };
}

/** Квадрат-точка бренда: знак завершённого утверждения */
export const Dot: React.FC<{ size?: number; visible?: number }> = ({ size = 32, visible = 1 }) => {
  const side = Math.round(size * dotToken.ratio);
  return (
    <span
      style={{
        display: 'inline-block',
        width: side,
        height: side,
        marginLeft: Math.round(size * dotToken.gap),
        background: color.accent,
        transform: `scale(${visible})`,
        transformOrigin: 'center bottom',
        verticalAlign: 'baseline',
      }}
    />
  );
};

/** Функциональная подпись (моно-шрифт) */
export const Label: React.FC<{
  children: React.ReactNode;
  tone?: string;
  style?: React.CSSProperties;
}> = ({ children, tone = color.textFaint, style: customStyle }) => (
  <div style={css(type.label, { color: tone, ...customStyle })}>{children}</div>
);

/** Карточка в стиле брендбука */
export const Card: React.FC<{
  children: React.ReactNode;
  width?: number | string;
  height?: number | string;
  active?: boolean;
  style?: React.CSSProperties;
}> = ({ children, width, height, active, style: customStyle }) => (
  <div
    style={{
      width,
      height,
      boxSizing: 'border-box',
      background: color.card,
      borderRadius: radius.card,
      border: `${border}px solid ${active ? color.accent : color.line}`,
      boxShadow: active ? shadow.object : shadow.card,
      padding: space.block * 0.6,
      position: 'relative',
      ...customStyle,
    }}
  >
    {children}
  </div>
);

/** Пилюля / бейдж статуса */
export const Badge: React.FC<{
  text: string;
  active?: boolean;
  style?: React.CSSProperties;
}> = ({ text, active, style: customStyle }) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 12,
      padding: '8px 20px',
      borderRadius: radius.pill,
      background: active ? color.accentLight : color.pill,
      border: `1.5px solid ${active ? color.accentLine : 'transparent'}`,
      ...customStyle,
    }}
  >
    <div
      style={{
        width: 10,
        height: 10,
        borderRadius: radius.dot,
        background: active ? color.accent : color.textMuted,
      }}
    />
    <span
      style={css(type.label, {
        color: active ? color.accent : color.textMuted,
        fontSize: 22,
      })}
    >
      {text}
    </span>
  </div>
);

/* ─────────────────────────────────────────────────────────────
   Векторные иконки и реальные логотипы в стиле
   ───────────────────────────────────────────────────────────── */

/** Замок */
export const Padlock: React.FC<{ size?: number; closed?: number; colorTone?: string }> = ({
  size = 48,
  closed = 1,
  colorTone = color.accent,
}) => {
  const shackleLift = (1 - closed) * -8;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ overflow: 'visible' }}>
      <path
        d="M7 11V7C7 4.23858 9.23858 2 12 2C14.7614 2 17 4.23858 17 7V11"
        stroke={colorTone}
        strokeWidth="2.4"
        strokeLinecap="round"
        style={{ transform: `translateY(${shackleLift}px)` }}
      />
      <rect
        x="4"
        y="10"
        width="16"
        height="12"
        rx="3"
        fill={colorTone === color.accent ? color.accent : color.card}
        stroke={colorTone}
        strokeWidth="2.2"
      />
      <circle cx="12" cy="15" r="1.6" fill={colorTone === color.accent ? color.onAccent : colorTone} />
      <path
        d="M12 16.6V18.2"
        stroke={colorTone === color.accent ? color.onAccent : colorTone}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
};

/** Щит */
export const Shield: React.FC<{ size?: number; active?: boolean }> = ({ size = 56, active = true }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M12 2L4 5V11C4 16.52 7.41 21.61 12 22.8C16.59 21.61 20 16.52 20 11V5L12 2Z"
      fill={active ? color.accentLight : color.pill}
      stroke={active ? color.accent : color.textMuted}
      strokeWidth="2.2"
      strokeLinejoin="round"
    />
    <path
      d="M9 11.5L11 13.5L15 9.5"
      stroke={active ? color.accent : color.textMuted}
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** Ноутбук / устройство */
export const Laptop: React.FC<{ size?: number; active?: boolean }> = ({ size = 64, active = true }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect
      x="4"
      y="4"
      width="16"
      height="11"
      rx="2"
      fill={active ? color.card : color.pill}
      stroke={active ? color.accent : color.text}
      strokeWidth="2"
    />
    <line x1="7" y1="11" x2="17" y2="11" stroke={active ? color.accent : color.textMuted} strokeWidth="1.5" />
    <path
      d="M2 18H22C22 18 20.5 15 19 15H5C3.5 15 2 18 2 18Z"
      fill={color.bgTop}
      stroke={active ? color.accent : color.text}
      strokeWidth="2"
      strokeLinejoin="round"
    />
  </svg>
);

/** Сервер */
export const ServerIcon: React.FC<{ size?: number; active?: boolean }> = ({ size = 64, active = true }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect
      x="3"
      y="3"
      width="18"
      height="5.5"
      rx="1.5"
      fill={color.card}
      stroke={active ? color.accent : color.text}
      strokeWidth="2"
    />
    <circle cx="6.5" cy="5.75" r="1" fill={active ? color.accent : color.textMuted} />
    <line x1="10" y1="5.75" x2="18" y2="5.75" stroke={color.line} strokeWidth="1.5" strokeLinecap="round" />

    <rect
      x="3"
      y="9.25"
      width="18"
      height="5.5"
      rx="1.5"
      fill={color.card}
      stroke={active ? color.accent : color.text}
      strokeWidth="2"
    />
    <circle cx="6.5" cy="12" r="1" fill={active ? color.accent : color.textMuted} />
    <line x1="10" y1="12" x2="18" y2="12" stroke={color.line} strokeWidth="1.5" strokeLinecap="round" />

    <rect
      x="3"
      y="15.5"
      width="18"
      height="5.5"
      rx="1.5"
      fill={color.card}
      stroke={active ? color.accent : color.text}
      strokeWidth="2"
    />
    <circle cx="6.5" cy="18.25" r="1" fill={active ? color.accent : color.textMuted} />
    <line x1="10" y1="18.25" x2="18" y2="18.25" stroke={color.line} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

/** Wi-Fi иконка */
export const WifiIcon: React.FC<{ size?: number; colorTone?: string }> = ({
  size = 64,
  colorTone = color.accent,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M2 8.5C5.5 5 18.5 5 22 8.5"
      stroke={colorTone}
      strokeWidth="2.4"
      strokeLinecap="round"
    />
    <path
      d="M5.5 12C8 9.5 16 9.5 18.5 12"
      stroke={colorTone}
      strokeWidth="2.4"
      strokeLinecap="round"
    />
    <path
      d="M8.5 15.5C10.5 13.8 13.5 13.8 15.5 15.5"
      stroke={colorTone}
      strokeWidth="2.4"
      strokeLinecap="round"
    />
    <circle cx="12" cy="19.5" r="1.6" fill={colorTone} />
  </svg>
);

/** Офисное здание */
export const OfficeIcon: React.FC<{ size?: number; active?: boolean }> = ({ size = 64, active = true }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect
      x="4"
      y="3"
      width="16"
      height="18"
      rx="2"
      fill={color.card}
      stroke={active ? color.accent : color.text}
      strokeWidth="2"
    />
    <rect x="7" y="6" width="3" height="3" rx="0.5" fill={active ? color.accent : color.textMuted} />
    <rect x="14" y="6" width="3" height="3" rx="0.5" fill={active ? color.accent : color.textMuted} />
    <rect x="7" y="11" width="3" height="3" rx="0.5" fill={active ? color.accent : color.textMuted} />
    <rect x="14" y="11" width="3" height="3" rx="0.5" fill={active ? color.accent : color.textMuted} />
    <path d="M10 21V17H14V21" stroke={active ? color.accent : color.text} strokeWidth="1.8" />
  </svg>
);

/* ─────────────────────────────────────────────────────────────
   Официальные векторные логотипы зарубежных сервисов и 1С
   ───────────────────────────────────────────────────────────── */

/** Figma SVG Logo */
export const FigmaLogo: React.FC<{ size?: number }> = ({ size = 44 }) => (
  <svg width={size} height={size} viewBox="0 0 38 57" fill="none">
    <path d="M19 28.5C19 23.2533 23.2533 19 28.5 19C33.7467 19 38 23.2533 38 28.5C38 33.7467 33.7467 38 28.5 38C23.2533 38 19 33.7467 19 28.5Z" fill="#1ABCFE" />
    <path d="M0 47.5C0 42.2533 4.25329 38 9.5 38H19V47.5C19 52.7467 14.7467 57 9.5 57C4.25329 57 0 52.7467 0 47.5Z" fill="#0ACF83" />
    <path d="M19 0V19H28.5C33.7467 19 38 14.7467 38 9.5C38 4.25329 33.7467 0 28.5 0H19Z" fill="#FF7262" />
    <path d="M0 9.5C0 14.7467 4.25329 19 9.5 19H19V0H9.5C4.25329 0 0 4.25329 0 9.5Z" fill="#F24E1E" />
    <path d="M0 28.5C0 33.7467 4.25329 38 9.5 38H19V19H9.5C4.25329 19 0 23.2533 0 28.5Z" fill="#A259FF" />
  </svg>
);

/** Notion SVG Logo */
export const NotionLogo: React.FC<{ size?: number }> = ({ size = 44 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <path
      d="M18.8 17.5L71.2 12.8C75.8 12.4 78 14.6 77.2 19.3L68.7 73.6C68.1 77.4 65.5 79.4 60.9 79.8L11.5 83.5C7.2 83.8 5.4 81.6 6.1 77.3L14.4 23.7C15 19.5 16.9 17.6 18.8 17.5Z"
      fill="#0B0F14"
    />
    <path
      d="M33 34.6L54.7 33L38.4 69.8L22.8 68.7L33 34.6ZM48.6 33.5L71.8 31.9L61.7 67.5L46.8 66.5L54.5 39.5L38.8 74.3L30.2 73.6L48.6 33.5Z"
      fill="#FFFFFF"
    />
  </svg>
);

/** Slack SVG Logo */
export const SlackLogo: React.FC<{ size?: number }> = ({ size = 44 }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" fill="none">
    <path d="M28.4 79.2C22.7 79.2 18 83.9 18 89.6C18 95.3 22.7 100 28.4 100C34.1 100 38.8 95.3 38.8 89.6V79.2H28.4Z" fill="#E01E5A" />
    <path d="M44 79.2C49.7 79.2 54.4 83.9 54.4 89.6C54.4 95.3 49.7 100 44 100C38.3 100 33.6 95.3 33.6 89.6C33.6 83.9 38.3 79.2 44 79.2V53.2H44Z" fill="#E01E5A" />
    <path d="M48.8 28.4C48.8 22.7 44.1 18 38.4 18C32.7 18 28 22.7 28 28.4C28 34.1 32.7 38.8 38.4 38.8H48.8V28.4Z" fill="#36C5F0" />
    <path d="M48.8 44C48.8 49.7 44.1 54.4 38.4 54.4C32.7 54.4 28 49.7 28 44C28 38.3 32.7 33.6 38.4 33.6H74.8V44H48.8Z" fill="#36C5F0" />
    <path d="M99.6 48.8C105.3 48.8 110 44.1 110 38.4C110 32.7 105.3 28 99.6 28C93.9 28 89.2 32.7 89.2 38.4V48.8H99.6Z" fill="#2EB67D" />
    <path d="M84 48.8C78.3 48.8 73.6 44.1 73.6 38.4C73.6 32.7 78.3 28 84 28C89.7 28 94.4 32.7 94.4 38.4V74.8H84V48.8Z" fill="#2EB67D" />
    <path d="M79.2 99.6C79.2 105.3 83.9 110 89.6 110C95.3 110 100 105.3 100 99.6C100 93.9 95.3 89.2 89.6 89.2H79.2V99.6Z" fill="#ECB22E" />
    <path d="M79.2 84C79.2 78.3 83.9 73.6 89.6 73.6C95.3 73.6 100 78.3 100 84C100 89.7 95.3 94.4 89.6 94.4H53.2V84H79.2Z" fill="#ECB22E" />
  </svg>
);

/** GitHub SVG Logo */
export const GitHubLogo: React.FC<{ size?: number }> = ({ size = 44 }) => (
  <svg width={size} height={size} viewBox="0 0 98 96" fill="none">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.36 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.215-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z"
      fill="#0B0F14"
    />
  </svg>
);

/** 1C Значок */
export const OneCBadge: React.FC<{ size?: number }> = ({ size = 48 }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: radius.icon * 0.75,
      background: '#E52E2E',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: shadow.card,
    }}
  >
    <span
      style={{
        fontFamily: "'Inter Tight', sans-serif",
        fontWeight: 900,
        fontSize: size * 0.44,
        color: '#FFFFFF',
        letterSpacing: '-0.04em',
      }}
    >
      1C
    </span>
  </div>
);

export { color, type, radius, space, dur, ease };
