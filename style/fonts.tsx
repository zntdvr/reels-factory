import React, { useEffect, useState } from 'react';
import { continueRender, delayRender } from 'remotion';
import { loadFont as loadInterTight } from '@remotion/google-fonts/InterTight';
import { loadFont as loadPlexMono } from '@remotion/google-fonts/IBMPlexMono';

/**
 * Шрифты стиля «Синяя точка». Их ровно два, третьего быть не должно:
 *
 *   Inter Tight  — заголовки капсом, цифры, тексты, подписи карточек;
 *   IBM Plex Mono — только функциональные подписи: легенды, автор цитаты,
 *                   значения на полосах.
 *
 * Подписка кириллицы обязательна: без неё русский текст молча съезжает на
 * запасной шрифт, и вся выверка кеглей перестаёт что-либо значить.
 */
const interTight = loadInterTight('normal', {
  weights: ['400', '500', '600', '700', '800'],
  subsets: ['cyrillic', 'cyrillic-ext', 'latin'],
});

const plexMono = loadPlexMono('normal', {
  weights: ['500', '600'],
  subsets: ['cyrillic', 'cyrillic-ext', 'latin'],
});

/**
 * Задерживает рендер кадров, пока шрифты не готовы.
 * delayRender вызывается внутри состояния компонента, а не на верхнем уровне
 * модуля — иначе первый кадр уходит в рендер с неготовым шрифтом.
 */
export const FontLoader: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [handle] = useState(() => delayRender('Загрузка шрифтов стиля'));

  useEffect(() => {
    Promise.all([interTight.waitUntilDone(), plexMono.waitUntilDone()])
      .then(() => continueRender(handle))
      .catch(() => continueRender(handle));
  }, [handle]);

  return <>{children}</>;
};
