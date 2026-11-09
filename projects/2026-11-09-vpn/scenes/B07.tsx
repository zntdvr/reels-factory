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
  FigmaLogo,
  GitHubLogo,
  Label,
  NotionLogo,
  SlackLogo,
  css,
  lay,
  ramp,
  shadow,
} from './_kit';

/**
 * Блок 7: «И четвёртое — доступ к зарубежным сервисам, которыми пользуется ваша команда.»
 * Длина: 232 кадров (7.73с).
 *
 * МЕТАФОРА: команда получает бесперебойный доступ к ключевым международным
 * рабочим сервисам (Figma, Notion, Slack, GitHub). Реальные узнаваемые
 * логотипы вместо абстрактных иконок.
 */
export const B07: React.FC = () => {
  const frame = useCurrentFrame();

  const wander = motion.drift(frame, 'b07-scene', 5);

  // Последовательное открытие сервисов
  const figmaIn = ramp(frame, 15, 32);
  const notionIn = ramp(frame, 30, 47);
  const slackIn = ramp(frame, 45, 62);
  const githubIn = ramp(frame, 60, 77);

  // Статус общего контура
  const allActive = ramp(frame, 85, 105);
  const teamFinish = ramp(frame, 125, 145);

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
          <Badge text="КЕЙС 04 · ЗАРУБЕЖНЫЕ ИНСТРУМЕНТЫ" active={allActive > 0.5} />
        </div>

        {/* Сетка 4 ключевых зарубежных сервисов */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 1. Figma */}
          <Card
            width="100%"
            active={figmaIn > 0.8}
            style={{
              opacity: figmaIn,
              transform: `translateY(${(1 - figmaIn) * 20}px)`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    background: color.pill,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <FigmaLogo size={36} />
                </div>
                <div>
                  <div style={css(type.listTitle, { fontSize: 30, color: color.text })}>
                    Figma
                  </div>
                  <Label tone={color.textMuted} style={{ marginTop: 2 }}>
                    Дизайн, макеты и прототипы
                  </Label>
                </div>
              </div>
              <div
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  background: figmaIn > 0.8 ? color.accentLight : color.pill,
                }}
              >
                <span
                  style={css(type.label, {
                    color: figmaIn > 0.8 ? color.accent : color.textMuted,
                    fontSize: 20,
                  })}
                >
                  ДОСТУПНО ▪
                </span>
              </div>
            </div>
          </Card>

          {/* 2. Notion */}
          <Card
            width="100%"
            active={notionIn > 0.8}
            style={{
              opacity: notionIn,
              transform: `translateY(${(1 - notionIn) * 20}px)`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    background: color.pill,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <NotionLogo size={36} />
                </div>
                <div>
                  <div style={css(type.listTitle, { fontSize: 30, color: color.text })}>
                    Notion
                  </div>
                  <Label tone={color.textMuted} style={{ marginTop: 2 }}>
                    База знаний, регламенты, задачи
                  </Label>
                </div>
              </div>
              <div
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  background: notionIn > 0.8 ? color.accentLight : color.pill,
                }}
              >
                <span
                  style={css(type.label, {
                    color: notionIn > 0.8 ? color.accent : color.textMuted,
                    fontSize: 20,
                  })}
                >
                  ДОСТУПНО ▪
                </span>
              </div>
            </div>
          </Card>

          {/* 3. Slack */}
          <Card
            width="100%"
            active={slackIn > 0.8}
            style={{
              opacity: slackIn,
              transform: `translateY(${(1 - slackIn) * 20}px)`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    background: color.pill,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <SlackLogo size={36} />
                </div>
                <div>
                  <div style={css(type.listTitle, { fontSize: 30, color: color.text })}>
                    Slack
                  </div>
                  <Label tone={color.textMuted} style={{ marginTop: 2 }}>
                    Рабочая переписка и каналы отделов
                  </Label>
                </div>
              </div>
              <div
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  background: slackIn > 0.8 ? color.accentLight : color.pill,
                }}
              >
                <span
                  style={css(type.label, {
                    color: slackIn > 0.8 ? color.accent : color.textMuted,
                    fontSize: 20,
                  })}
                >
                  ДОСТУПНО ▪
                </span>
              </div>
            </div>
          </Card>

          {/* 4. GitHub */}
          <Card
            width="100%"
            active={githubIn > 0.8}
            style={{
              opacity: githubIn,
              transform: `translateY(${(1 - githubIn) * 20}px)`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    background: color.pill,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <GitHubLogo size={36} />
                </div>
                <div>
                  <div style={css(type.listTitle, { fontSize: 30, color: color.text })}>
                    GitHub
                  </div>
                  <Label tone={color.textMuted} style={{ marginTop: 2 }}>
                    Исходный код и CI/CD пайплайны
                  </Label>
                </div>
              </div>
              <div
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  background: githubIn > 0.8 ? color.accentLight : color.pill,
                }}
              >
                <span
                  style={css(type.label, {
                    color: githubIn > 0.8 ? color.accent : color.textMuted,
                    fontSize: 20,
                  })}
                >
                  ДОСТУПНО ▪
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Итоговая плашка стабильной работы команды */}
        <div
          style={{
            marginTop: 24,
            padding: '18px 24px',
            borderRadius: 18,
            background: color.card,
            border: `2px solid ${color.accent}`,
            boxShadow: shadow.card,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            opacity: teamFinish,
            transform: `translateY(${(1 - teamFinish) * 16}px)`,
          }}
        >
          <div>
            <div style={css(type.subHeading, { fontSize: 30, color: color.text })}>
              Ваша команда онлайн
            </div>
            <Label tone={color.accent} style={{ marginTop: 2 }}>
              РАБОТА БЕЗ ОГРАНИЧЕНИЙ И СБОЕВ ▪
            </Label>
          </div>
          <div
            style={{
              width: 14,
              height: 14,
              background: color.accent,
            }}
          />
        </div>
      </div>
    </Scene>
  );
};

export const B07Layers: EditableLayer[] = [
  {
    id: 'title',
    kind: 'text',
    text: 'ЗАРУБЕЖНЫЕ СЕРВИСЫ',
    x: PAGE_PAD,
    y: safe.top + 20,
    width: VIDEO.width - PAGE_PAD * 2,
    fontSize: type.title.size,
    fontFamily: type.title.family,
    fontWeight: type.title.weight,
    color: color.text,
  },
];
