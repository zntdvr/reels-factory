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
  Laptop,
  Padlock,
  ServerIcon,
  css,
  lay,
  ramp,
  shadow,
} from './_kit';

/**
 * Блок 2: «Всё, что идёт по нему, шифруется и по пути никто это не сможет прочитать.»
 * Длина: 233 кадров (7.78с).
 *
 * МЕТАФОРА: данные идут от устройства к серверу через закрытый туннель.
 * На входе в туннель защёлкивается замок, текст шифруется в хэши,
 * а сторонний перехватчик натыкается на барьер: прочитать трафик невозможно.
 */
export const B02: React.FC = () => {
  const frame = useCurrentFrame();

  // Движение предметов и фазы
  const wander = motion.drift(frame, 'b02-scene', 6);
  const flowProgress = (frame * 1.8) % 180;

  // Фаза закрытия замка и активации шифрования
  const lockClose = ramp(frame, 45, 65);
  // Появление попытки перехвата и её блокировка
  const snoopAppear = ramp(frame, 90, 110);
  const blockedState = ramp(frame, 120, 138);

  return (
    <Scene>
      <div
        style={{
          position: 'relative',
          width: AREA_W,
          margin: '0 auto',
          transform: `translate(${wander.x}px, ${wander.y}px)`,
        }}
      >
        {/* Верхняя карточка-статус */}
        <div style={{ ...lay(frame, 4, 30), marginBottom: 32 }}>
          <Badge text="ШИФРОВАНИЕ ТРАФИКА · AES-256" active={lockClose > 0.5} />
        </div>

        {/* Схема туннеля */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Источник: устройство сотрудника */}
          <Card width="100%" active={true} style={lay(frame, 10, 30)}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                <Laptop size={56} active={true} />
                <div>
                  <div style={css(type.subHeading, { color: color.text })}>Ваше устройство</div>
                  <Label tone={color.textMuted} style={{ marginTop: 6 }}>
                    IP: 192.168.1.104 · КЛИЕНТ
                  </Label>
                </div>
              </div>
              <div
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  background: color.pill,
                  fontSize: 22,
                  fontFamily: "'IBM Plex Mono', monospace",
                  color: color.accent,
                  fontWeight: 600,
                }}
              >
                ОТПРАВКА
              </div>
            </div>
          </Card>

          {/* Сам защитный туннель */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              minHeight: 380,
              borderRadius: 24,
              background: lockClose > 0.5 ? color.accentLight : color.pill,
              border: `2px dashed ${lockClose > 0.5 ? color.accent : color.line}`,
              padding: '24px 32px',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'background 0.3s ease',
              ...lay(frame, 22, 30),
            }}
          >
            {/* Статус внутри туннеля */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <Padlock size={38} closed={lockClose} colorTone={color.accent} />
                <div>
                  <div style={css(type.listTitle, { fontSize: 32, color: color.text })}>
                    Защищённый канал
                  </div>
                  <Label tone={color.accent} style={{ marginTop: 4 }}>
                    {lockClose > 0.8 ? 'ДАННЫЕ ЗАШИФРОВАНЫ' : 'УСТАНОВКА ШИФРОВАНИЯ...'}
                  </Label>
                </div>
              </div>

              {/* Метка протокола */}
              <div
                style={{
                  padding: '6px 16px',
                  borderRadius: 12,
                  background: color.card,
                  border: `1.5px solid ${color.accentLine}`,
                }}
              >
                <span style={css(type.label, { color: color.accent, fontSize: 22 })}>
                  VPN TUNNEL
                </span>
              </div>
            </div>

            {/* Бегущие пакеты данных */}
            <div
              style={{
                margin: '28px 0',
                padding: '20px 24px',
                borderRadius: 16,
                background: color.card,
                boxShadow: shadow.card,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <Label tone={color.textFaint}>ПАКЕТ ДАННЫХ В ПУТИ</Label>
                <Label tone={lockClose > 0.5 ? color.accent : color.textMuted}>
                  {lockClose > 0.5 ? 'ЗАЩИЩЕНО ▪' : 'ОТКРЫТЫЙ ВИД'}
                </Label>
              </div>

              {/* Содержимое пакета */}
              <div
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 28,
                  fontWeight: 600,
                  color: lockClose > 0.5 ? color.accent : color.text,
                  letterSpacing: '0.04em',
                }}
              >
                {lockClose > 0.5
                  ? '7f9c 81b2 d4e0 93a1 4f6b (SHA-256)'
                  : 'GET /corporate/crm/contracts.pdf'}
              </div>

              {/* Бегущий луч по пакету */}
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 80,
                  background: `linear-gradient(90deg, transparent, ${color.accentLine}, transparent)`,
                  transform: `translateX(${flowProgress * 5}px)`,
                }}
              />
            </div>

            {/* Внешний перехватчик (никто не сможет прочитать) */}
            <div
              style={{
                opacity: snoopAppear,
                transform: `translateY(${(1 - snoopAppear) * 16}px)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderRadius: 14,
                background: blockedState > 0.5 ? 'rgba(11,15,20,0.06)' : 'rgba(255,255,255,0.7)',
                border: `1.5px solid ${color.line}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: blockedState > 0.5 ? color.text : color.pill,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: 16,
                    fontWeight: 700,
                  }}
                >
                  ✕
                </div>
                <div>
                  <div style={css(type.small, { fontWeight: 700, color: color.text })}>
                    Попытка перехвата в сети
                  </div>
                  <Label tone={color.textMuted} style={{ marginTop: 2 }}>
                    Трафик недоступен третьим лицам
                  </Label>
                </div>
              </div>

              <div
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 20,
                  fontWeight: 700,
                  color: color.accent,
                }}
              >
                ПРОЧИТАТЬ НЕЛЬЗЯ
              </div>
            </div>
          </div>

          {/* Приёмник: сервер и ресурсы */}
          <Card width="100%" active={lockClose > 0.8} style={lay(frame, 30, 30)}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                <ServerIcon size={56} active={lockClose > 0.8} />
                <div>
                  <div style={css(type.subHeading, { color: color.text })}>Внутренняя сеть</div>
                  <Label tone={color.textMuted} style={{ marginTop: 6 }}>
                    СЕРВЕРЫ КОМПАНИИ · ЗАЩИЩЕНО
                  </Label>
                </div>
              </div>
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 0,
                  background: color.accent,
                }}
              />
            </div>
          </Card>
        </div>
      </div>
    </Scene>
  );
};

export const B02Layers: EditableLayer[] = [
  {
    id: 'title',
    kind: 'text',
    text: 'ШИФРОВАНИЕ ТРАФИКА',
    x: PAGE_PAD,
    y: safe.top + 20,
    width: VIDEO.width - PAGE_PAD * 2,
    fontSize: type.title.size,
    fontFamily: type.title.family,
    fontWeight: type.title.weight,
    color: color.text,
  },
];
