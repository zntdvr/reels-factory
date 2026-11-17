import React, { useEffect, useState } from 'react';
import { cancelRender, continueRender, delayRender, staticFile } from 'remotion';

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
// Полные локальные файлы включают кириллицу. Каждый renderer/browser загружает
// их один раз; внешняя сеть не должна прерывать длительный просчёт сцен.
let fontsReady: Promise<unknown> | undefined;
const loadLocalFonts = () => fontsReady ??= Promise.all([
  ['Inter Tight', 'InterTight.ttf', '100 900'],
  ['IBM Plex Mono', 'IBMPlexMono-Medium.ttf', '500'],
  ['IBM Plex Mono', 'IBMPlexMono-SemiBold.ttf', '600'],
].map(async ([family, file, weight]) => {
  const face = new FontFace(family, `url("${staticFile(`fonts/${file}`)}")`, { weight, style: 'normal' });
  const loaded = await face.load();
  document.fonts.add(loaded);
}));

/**
 * Задерживает рендер кадров, пока шрифты не готовы.
 * delayRender вызывается внутри состояния компонента, а не на верхнем уровне
 * модуля — иначе первый кадр уходит в рендер с неготовым шрифтом.
 */
export const FontLoader: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [handle] = useState(() => delayRender('Загрузка шрифтов стиля'));

  useEffect(() => {
    loadLocalFonts()
      .then(() => continueRender(handle))
      .catch(cancelRender);
  }, [handle]);

  return <>{children}</>;
};
