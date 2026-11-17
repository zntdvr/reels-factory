import React, { useEffect, useRef, useState } from 'react';
import { AbsoluteFill, cancelRender, continueRender, delayRender, Img, useCurrentFrame } from 'remotion';
import { tokens } from '../style/tokens';
import { FontLoader } from '../style/fonts';
import { Background } from '../style/Background';

type Slide = {
  id: string;
  role: 'cover' | 'content' | 'cta';
  title: string;
  body?: string;
  stat?: string;
  image?: { src: string; alt: string };
};
export type CarouselDeck = { title: string; canvas: { width: number; height: number }; slides: Slide[] };

const typography = (token: typeof tokens.type.body): React.CSSProperties => ({
  fontFamily: token.family, fontSize: token.size, fontWeight: token.weight,
  lineHeight: token.lh, letterSpacing: token.ls,
  textTransform: token.uppercase ? 'uppercase' : 'none',
});

const SlideContent: React.FC<{ slide: Slide; width: number; height: number }> = ({ slide, width, height }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [handle] = useState(() => delayRender(`Проверка слайда ${slide.id}`));
  useEffect(() => {
    document.fonts.ready.then(() => {
      const element = ref.current;
      if (!element) return;
      const bounds = element.getBoundingClientRect();
      const overflow = [...element.querySelectorAll<HTMLElement>('[data-fit]')].some((node) => {
        const rect = node.getBoundingClientRect();
        return node.scrollWidth > node.clientWidth + 1 ||
          rect.bottom > bounds.bottom + 1 || rect.right > bounds.right + 1;
      });
      if (overflow || element.scrollHeight > element.clientHeight + 1) {
        cancelRender(new Error(`${slide.id}: текст или изображение не помещаются. Сократите текст или измените компоновку.`));
      } else continueRender(handle);
    }).catch(cancelRender);
  }, [handle, slide.id]);
  const { color, type, space } = tokens;
  const dot = tokens.extra?.dot as { ratio: number; gap: number };
  const pad = space.block;
  return <AbsoluteFill style={{ color: color.text }}>
    <Background />
    <div style={{ position: 'absolute', inset: 0, transformOrigin: 'top left', transform: `scale(${width / 1080})`, width: 1080, height: height * 1080 / width, padding: pad, boxSizing: 'border-box' }}>
      <div ref={ref} style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: space.block }}>
        <h1 data-fit style={{ ...typography(slide.stat ? type.title : type.hero), margin: 0, flexShrink: 0, whiteSpace: 'pre-wrap' }}>
          {slide.title}
          {slide.role !== 'cover' && <span aria-hidden style={{ display: 'inline-block', marginLeft: `${dot.gap}em`, width: `${dot.ratio}em`, height: `${dot.ratio}em`, background: color.accent }} />}
        </h1>
        {slide.body && <p data-fit style={{ ...typography(type.subHeading!), fontWeight: type.body.weight, margin: 0, flexShrink: 0, whiteSpace: 'pre-wrap' }}>{slide.body}</p>}
        {slide.stat && <div data-fit style={{ ...typography(type.stat), color: color.accent, marginTop: 'auto', paddingBottom: space.block }}>{slide.stat}</div>}
        {slide.image && <div data-fit style={{ flex: 1, minHeight: 240, overflow: 'hidden', borderRadius: tokens.radius.card }}>
          <Img src={slide.image.src} alt={slide.image.alt} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>}
      </div>
    </div>
  </AbsoluteFill>;
};

export const Carousel: React.FC<{ deck: CarouselDeck }> = ({ deck }) => {
  const frame = useCurrentFrame();
  const slide = deck.slides[Math.min(frame, deck.slides.length - 1)];
  return <FontLoader><SlideContent key={slide.id} slide={slide} {...deck.canvas} /></FontLoader>;
};
