import React from 'react';
import { CameraInset, color, type, radius } from '../../../core';
import { Badge, Label, css } from './_kit';

/**
 * Врезка для Блока 1 (на камере):
 * Появляется на словах «защищённый тоннель», подкрепляя речь тезисом.
 */
export const InsetB01: React.FC = () => {
  return (
    <CameraInset place="top" align="center" width={820} delay={40}>
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.94)',
          backdropFilter: 'blur(16px)',
          borderRadius: radius.card,
          border: `2px solid ${color.accent}`,
          boxShadow: '0 16px 36px rgba(11, 15, 20, 0.16)',
          padding: '20px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <Badge text="VPN · ТЕХНОЛОГИЯ" active={true} />
          <div style={css(type.subHeading, { fontSize: 30, color: color.text, marginTop: 8 })}>
            Защищённый тоннель
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '8px 16px',
            borderRadius: 12,
            background: color.accentLight,
          }}
        >
          <div style={{ width: 8, height: 8, background: color.accent }} />
          <span style={css(type.label, { color: color.accent, fontSize: 20 })}>
            УСТРОЙСТВО ↔ СЕТЬ ▪
          </span>
        </div>
      </div>
    </CameraInset>
  );
};

/**
 * Врезка для Блока 3 (на камере):
 * Появляется на вопросе «Зачем VPN нужен бизнесу?» и задаёт карту из 4 преимуществ.
 */
export const InsetB03: React.FC = () => {
  return (
    <CameraInset place="top" align="center" width={820} delay={18}>
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.94)',
          backdropFilter: 'blur(16px)',
          borderRadius: radius.card,
          border: `2px solid ${color.line}`,
          boxShadow: '0 16px 36px rgba(11, 15, 20, 0.16)',
          padding: '20px 28px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Badge text="КЕЙСЫ ДЛЯ КОМПАНИИ" active={true} />
            <div style={css(type.subHeading, { fontSize: 30, color: color.text, marginTop: 8 })}>
              4 задачи бизнеса
            </div>
          </div>
          <div
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              background: color.pill,
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 20,
              fontWeight: 700,
              color: color.accent,
            }}
          >
            01 / 04 ▪
          </div>
        </div>

        {/* Индикатор 4 пунктов */}
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          {['1. Удалёнка', '2. Филиалы', '3. Wi-Fi', '4. Сервисы'].map((item, i) => (
            <div
              key={item}
              style={{
                flex: 1,
                padding: '6px 8px',
                borderRadius: 8,
                background: i === 0 ? color.accentLight : color.pill,
                textAlign: 'center',
                fontFamily: "'Inter Tight', sans-serif",
                fontSize: 18,
                fontWeight: 600,
                color: i === 0 ? color.accent : color.textMuted,
              }}
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    </CameraInset>
  );
};
