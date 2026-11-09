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
  Padlock,
  Shield,
  WifiIcon,
  css,
  lay,
  ramp,
  shadow,
} from './_kit';

/**
 * Блок 6: «Третье — в публичном Wi-Fi почту и пароли не перехватят.»
 * Длина: 175 кадров (5.84с).
 *
 * МЕТАФОРА: в общественном Wi-Fi (кафе, отель, аэропорт) трафик открыт
 * для перехвата соседями по сети. VPN накрывает почту и пароли
 * бронированным щитом шифрования — перехватить данные невозможно.
 */
export const B06: React.FC = () => {
  const frame = useCurrentFrame();

  const wander = motion.drift(frame, 'b06-scene', 5);
  const breath = motion.breathe(frame, { period: 80, min: 0.96, max: 1.02 });

  // Фазы опускания щита и отражения атаки
  const shieldDrop = ramp(frame, 25, 48);
  const attackProbe = ramp(frame, 68, 88);
  const deflected = ramp(frame, 90, 108);

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
          <Badge text="КЕЙС 03 · ПУБЛИЧНЫЕ СЕТИ" active={shieldDrop > 0.5} />
        </div>

        {/* Карточка открытого Wi-Fi */}
        <Card width="100%" style={lay(frame, 10, 25)}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 16,
                  background: color.pill,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <WifiIcon size={38} colorTone={color.textMuted} />
              </div>
              <div>
                <div style={css(type.subHeading, { color: color.text, fontSize: 32 })}>
                  Общественный Wi-Fi
                </div>
                <Label tone={color.textMuted} style={{ marginTop: 4 }}>
                  КАФЕ · АЭРОПОРТ · НЕЗАЩИЩЁННАЯ СЕТЬ
                </Label>
              </div>
            </div>

            <div
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                background: color.pill,
              }}
            >
              <span style={css(type.label, { color: color.textMuted, fontSize: 20 })}>
                ОТКРЫТЫЙ ЭФИР
              </span>
            </div>
          </div>
        </Card>

        {/* Щит и защищаемые данные */}
        <div
          style={{
            position: 'relative',
            marginTop: 20,
            borderRadius: 24,
            background: color.card,
            border: `2px solid ${shieldDrop > 0.5 ? color.accent : color.line}`,
            boxShadow: shieldDrop > 0.5 ? shadow.object : shadow.card,
            padding: '28px 24px',
            boxSizing: 'border-box',
            ...lay(frame, 20, 25),
          }}
        >
          {/* Статус защиты */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 24,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <Shield size={44} active={shieldDrop > 0.5} />
              <div>
                <div style={css(type.subHeading, { color: color.text, fontSize: 30 })}>
                  Щит шифрования
                </div>
                <Label tone={shieldDrop > 0.5 ? color.accent : color.textMuted} style={{ marginTop: 2 }}>
                  {shieldDrop > 0.5 ? 'VPN-КРИПТОШИФР АКТИВЕН' : 'АКТИВАЦИЯ...'}
                </Label>
              </div>
            </div>

            <Padlock size={36} closed={shieldDrop} colorTone={color.accent} />
          </div>

          {/* Защищаемые учетные данные */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Почта */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderRadius: 14,
                background: color.pill,
                border: `1.5px solid ${shieldDrop > 0.5 ? color.accentLine : 'transparent'}`,
              }}
            >
              <div>
                <Label tone={color.textFaint}>КОРПОРАТИВНАЯ ПОЧТА</Label>
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 26,
                    fontWeight: 600,
                    color: color.text,
                    marginTop: 4,
                  }}
                >
                  director@company.ru
                </div>
              </div>
              <Label tone={shieldDrop > 0.5 ? color.accent : color.textMuted}>
                {shieldDrop > 0.5 ? 'ЗАШИФРОВАНО ▪' : 'ОТКРЫТО'}
              </Label>
            </div>

            {/* Пароли */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderRadius: 14,
                background: color.pill,
                border: `1.5px solid ${shieldDrop > 0.5 ? color.accentLine : 'transparent'}`,
              }}
            >
              <div>
                <Label tone={color.textFaint}>ПАРОЛИ И КЛЮЧИ ДОСТУПА</Label>
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 26,
                    fontWeight: 600,
                    color: color.accent,
                    letterSpacing: '0.18em',
                    marginTop: 4,
                  }}
                >
                  ••••••••••••••••
                </div>
              </div>
              <Label tone={shieldDrop > 0.5 ? color.accent : color.textMuted}>
                {shieldDrop > 0.5 ? 'НЕДОСТУПНО ▪' : 'РИСК'}
              </Label>
            </div>
          </div>

          {/* Предотвращение перехвата */}
          <div
            style={{
              marginTop: 22,
              padding: '14px 18px',
              borderRadius: 14,
              background: deflected > 0.5 ? color.accentLight : color.pill,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              opacity: attackProbe,
              transform: `translateY(${(1 - attackProbe) * 12}px)`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 6,
                  background: color.accent,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  fontWeight: 800,
                }}
              >
                ✓
              </div>
              <span style={css(type.small, { fontWeight: 700, color: color.text })}>
                Попытка сниффинга отклонена
              </span>
            </div>
            <Label tone={color.accent}>ПЕРЕХВАТ НЕВОЗМОЖЕН</Label>
          </div>
        </div>
      </div>
    </Scene>
  );
};

export const B06Layers: EditableLayer[] = [
  {
    id: 'title',
    kind: 'text',
    text: 'ЗАЩИТА В WI-FI',
    x: PAGE_PAD,
    y: safe.top + 20,
    width: VIDEO.width - PAGE_PAD * 2,
    fontSize: type.title.size,
    fontFamily: type.title.family,
    fontWeight: type.title.weight,
    color: color.text,
  },
];
