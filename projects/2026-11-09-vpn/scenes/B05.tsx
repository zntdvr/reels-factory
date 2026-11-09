import React from 'react';
import { useCurrentFrame } from 'remotion';
import {
  Scene,
  color,
  type,
  safe,
  PAGE_PAD,
  VIDEO,
  motion,
  anim,
} from '../../../core';
import type { EditableLayer } from '../../../core';
import {
  AREA_W,
  Badge,
  Card,
  Dot,
  Label,
  OfficeIcon,
  css,
  lay,
  ramp,
  shadow,
} from './_kit';

/**
 * Блок 5: «Второе — несколько офисов работают как одна сеть.»
 * Длина: 152 кадров (5.06с).
 *
 * МЕТАФОРА: Site-to-site VPN связывает удалённые филиалы компании.
 * Главный офис, второй офис и склад объединяются защищёнными туннелями
 * в единую локальную сеть с общим адресным пространством.
 */
export const B05: React.FC = () => {
  const frame = useCurrentFrame();

  const wander = motion.drift(frame, 'b05-scene', 5);

  // Фазы включения линков и объединения
  const link1 = ramp(frame, 15, 35);
  const link2 = ramp(frame, 30, 50);
  const link3 = ramp(frame, 45, 65);
  const unifiedRing = ramp(frame, 65, 85);

  // Бегущие сигналы между узлами
  const sig1 = (frame * 2.2) % 100;
  const sig2 = (frame * 2.5 + 30) % 100;

  return (
    <Scene>
      <div
        style={{
          position: 'relative',
          width: AREA_W,
          margin: '0 auto',
          paddingTop: 120,
          transform: `translate(${wander.x}px, ${wander.y}px)`,
        }}
      >
        {/* Бейдж кейса */}
        <div style={{ ...lay(frame, 4, 25), marginBottom: 28 }}>
          <Badge text="КЕЙС 02 · SITE-TO-SITE ИНТЕГРАЦИЯ" active={unifiedRing > 0.5} />
        </div>

        {/* Контейнер единой топологии */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            borderRadius: 24,
            background: color.card,
            border: `2px solid ${unifiedRing > 0.5 ? color.accent : color.line}`,
            boxShadow: unifiedRing > 0.5 ? shadow.object : shadow.card,
            padding: '28px 24px',
            boxSizing: 'border-box',
            ...lay(frame, 10, 25),
          }}
        >
          {/* Заголовок сети */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 28,
            }}
          >
            <div>
              <div style={css(type.subHeading, { color: color.text, fontSize: 32 })}>
                Единая корпоративная сеть
              </div>
              <Label tone={color.textMuted} style={{ marginTop: 4 }}>
                IP-ДИАПАЗОН: 10.10.0.0/16 · ОБЩИЙ КОНТУР
              </Label>
            </div>
            <div
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                background: unifiedRing > 0.5 ? color.accentLight : color.pill,
              }}
            >
              <span
                style={css(type.label, {
                  color: unifiedRing > 0.5 ? color.accent : color.textMuted,
                  fontSize: 20,
                })}
              >
                {unifiedRing > 0.5 ? 'СЕТЬ ОБЪЕДИНЕНА ▪' : 'ПОДКЛЮЧЕНИЕ...'}
              </span>
            </div>
          </div>

          {/* Сетка трёх офисов */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Офис 1: Москва */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderRadius: 16,
                background: color.pill,
                border: `1.5px solid ${link1 > 0.8 ? color.accentLine : 'transparent'}`,
                ...lay(frame, 12, 20),
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <OfficeIcon size={44} active={true} />
                <div>
                  <div style={css(type.listTitle, { fontSize: 26, color: color.text })}>
                    Центральный офис
                  </div>
                  <Label tone={color.textMuted}>ШТАБ · 10.10.1.0/24</Label>
                </div>
              </div>
              <div style={css(type.label, { color: color.accent, fontSize: 22 })}>ОНЛАЙН</div>
            </div>

            {/* Офис 2: Филиал */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderRadius: 16,
                background: color.pill,
                border: `1.5px solid ${link2 > 0.8 ? color.accentLine : 'transparent'}`,
                ...lay(frame, 22, 20),
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <OfficeIcon size={44} active={link2 > 0.5} />
                <div>
                  <div style={css(type.listTitle, { fontSize: 26, color: color.text })}>
                    Филиал · Регион
                  </div>
                  <Label tone={color.textMuted}>ОТДЕЛ ПРОДАЖ · 10.10.2.0/24</Label>
                </div>
              </div>
              <div
                style={css(type.label, {
                  color: link2 > 0.8 ? color.accent : color.textMuted,
                  fontSize: 22,
                })}
              >
                {link2 > 0.8 ? 'СВЯЗАН ▪' : 'ПОДКЛЮЧЕНИЕ'}
              </div>
            </div>

            {/* Офис 3: Склад / Логистика */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderRadius: 16,
                background: color.pill,
                border: `1.5px solid ${link3 > 0.8 ? color.accentLine : 'transparent'}`,
                ...lay(frame, 32, 20),
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <OfficeIcon size={44} active={link3 > 0.5} />
                <div>
                  <div style={css(type.listTitle, { fontSize: 26, color: color.text })}>
                    Склад и логистика
                  </div>
                  <Label tone={color.textMuted}>ПРОИЗВОДСТВО · 10.10.3.0/24</Label>
                </div>
              </div>
              <div
                style={css(type.label, {
                  color: link3 > 0.8 ? color.accent : color.textMuted,
                  fontSize: 22,
                })}
              >
                {link3 > 0.8 ? 'СВЯЗАН ▪' : 'ПОДКЛЮЧЕНИЕ'}
              </div>
            </div>
          </div>

          {/* Нижний бейдж результата */}
          <div
            style={{
              marginTop: 24,
              padding: '14px 18px',
              borderRadius: 12,
              background: unifiedRing > 0.5 ? color.accentLight : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              opacity: unifiedRing,
            }}
          >
            <div style={{ width: 8, height: 8, background: color.accent }} />
            <span style={css(type.label, { color: color.accent, fontSize: 22 })}>
              ОБЩИЕ СЕРВЕРЫ И БАЗЫ БЕЗ ПЕРЕБОЕВ
            </span>
          </div>
        </div>
      </div>
    </Scene>
  );
};

export const B05Layers: EditableLayer[] = [
  {
    id: 'title',
    kind: 'text',
    text: 'ОДНА СЕТЬ',
    x: PAGE_PAD,
    y: safe.top + 20,
    width: VIDEO.width - PAGE_PAD * 2,
    fontSize: type.title.size,
    fontFamily: type.title.family,
    fontWeight: type.title.weight,
    color: color.text,
  },
];
