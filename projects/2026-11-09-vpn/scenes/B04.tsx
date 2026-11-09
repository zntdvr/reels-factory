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
  OneCBadge,
  ServerIcon,
  css,
  lay,
  ramp,
  shadow,
} from './_kit';

/**
 * Блок 4: «Заходят во внутренние системы компании, как будто сидит в офисе.»
 * Длина: 172 кадров (5.74с).
 *
 * МЕТАФОРА: удалённый сотрудник (дом/кафе) подключается через VPN
 * и получает прямой доступ к базам 1C, CRM и внутренним серверам
 * ровно так же, как если бы находился за рабочим столом в офисе.
 */
export const B04: React.FC = () => {
  const frame = useCurrentFrame();

  const wander = motion.drift(frame, 'b04-scene', 5);
  const connectLine = ramp(frame, 15, 45);

  // Последовательное появление корпоративных систем
  const item1 = ramp(frame, 35, 50);
  const item2 = ramp(frame, 55, 70);
  const item3 = ramp(frame, 75, 90);

  // Пульсация сигнала
  const pulse = (frame * 3) % 120;

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
          <Badge text="КЕЙС 01 · УДАЛЁННЫЕ СОТРУДНИКИ" active={true} />
        </div>

        {/* Карточка сотрудника вне офиса */}
        <Card width="100%" active={true} style={lay(frame, 10, 25)}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 18,
                  background: color.accentLight,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Laptop size={38} active={true} />
              </div>
              <div>
                <div style={css(type.subHeading, { color: color.text, fontSize: 34 })}>
                  Ноутбук сотрудника
                </div>
                <Label tone={color.textMuted} style={{ marginTop: 4 }}>
                  ДОМ ИЛИ КАФЕ · VPN ПОДКЛЮЧЁН
                </Label>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 14px',
                borderRadius: 10,
                background: color.pill,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 0,
                  background: color.accent,
                }}
              />
              <span style={css(type.label, { fontSize: 20, color: color.accent })}>
                10.8.0.42
              </span>
            </div>
          </div>
        </Card>

        {/* Линия защищённого соединения */}
        <div
          style={{
            height: 56,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: 3,
              height: '100%',
              background: `linear-gradient(180deg, ${color.accent}, ${color.accentLine})`,
              opacity: connectLine,
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: `${(pulse / 120) * 100}%`,
              width: 10,
              height: 10,
              borderRadius: 0,
              background: color.accent,
              boxShadow: '0 0 12px rgba(36,92,255,0.6)',
              opacity: connectLine,
            }}
          />
        </div>

        {/* Блок внутренних корпоративных систем */}
        <Card
          width="100%"
          style={{
            ...lay(frame, 25, 25),
            border: `2px solid ${color.line}`,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <div style={css(type.subHeading, { color: color.text, fontSize: 34 })}>
                Внутренние системы офиса
              </div>
              <Label tone={color.textFaint} style={{ marginTop: 4 }}>
                ЛОКАЛЬНЫЙ СЕГМЕНТ КОМПАНИИ
              </Label>
            </div>
            <div
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                background: color.accentLight,
              }}
            >
              <span style={css(type.label, { color: color.accent, fontSize: 20 })}>
                ВНУТРИ СЕТИ ▪
              </span>
            </div>
          </div>

          {/* Список систем: 1С, CRM, Файловый сервер */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* 1С */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                borderRadius: 14,
                background: item1 > 0.5 ? color.card : color.pill,
                border: `1.5px solid ${item1 > 0.8 ? color.accentLine : color.line}`,
                opacity: item1,
                transform: `translateX(${(1 - item1) * 20}px)`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <OneCBadge size={40} />
                <div>
                  <div style={css(type.listTitle, { fontSize: 28, color: color.text })}>
                    1С:Предприятие
                  </div>
                  <Label tone={color.textMuted} style={{ marginTop: 2 }}>
                    База данных бухгалтерии и склада
                  </Label>
                </div>
              </div>
              <Label tone={color.accent}>ДОСТУПНО</Label>
            </div>

            {/* CRM */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                borderRadius: 14,
                background: item2 > 0.5 ? color.card : color.pill,
                border: `1.5px solid ${item2 > 0.8 ? color.accentLine : color.line}`,
                opacity: item2,
                transform: `translateX(${(1 - item2) * 20}px)`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: color.pill,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: "'Inter Tight', sans-serif",
                    fontWeight: 800,
                    fontSize: 18,
                    color: color.text,
                  }}
                >
                  CRM
                </div>
                <div>
                  <div style={css(type.listTitle, { fontSize: 28, color: color.text })}>
                    Корпоративная CRM
                  </div>
                  <Label tone={color.textMuted} style={{ marginTop: 2 }}>
                    Клиенты, сделки, закрытые документы
                  </Label>
                </div>
              </div>
              <Label tone={color.accent}>ДОСТУПНО</Label>
            </div>

            {/* Сервер файлов */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                borderRadius: 14,
                background: item3 > 0.5 ? color.card : color.pill,
                border: `1.5px solid ${item3 > 0.8 ? color.accentLine : color.line}`,
                opacity: item3,
                transform: `translateX(${(1 - item3) * 20}px)`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: color.pill,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ServerIcon size={26} active={true} />
                </div>
                <div>
                  <div style={css(type.listTitle, { fontSize: 28, color: color.text })}>
                    Файловый сервер
                  </div>
                  <Label tone={color.textMuted} style={{ marginTop: 2 }}>
                    Сетевые папки компании (SMB / NFS)
                  </Label>
                </div>
              </div>
              <Label tone={color.accent}>ДОСТУПНО</Label>
            </div>
          </div>
        </Card>
      </div>
    </Scene>
  );
};

export const B04Layers: EditableLayer[] = [
  {
    id: 'title',
    kind: 'text',
    text: 'КАК В ОФИСЕ',
    x: PAGE_PAD,
    y: safe.top + 20,
    width: VIDEO.width - PAGE_PAD * 2,
    fontSize: type.title.size,
    fontFamily: type.title.family,
    fontWeight: type.title.weight,
    color: color.text,
  },
];
