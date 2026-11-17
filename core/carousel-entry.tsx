import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { Carousel, type CarouselDeck } from './Carousel';

const deck: CarouselDeck = {
  title: 'Карусель', canvas: { width: 1080, height: 1350 },
  slides: [{ id: 'cover', role: 'cover', title: 'Карусель' }],
};
registerRoot(() => <Composition id="carousel" component={Carousel} width={1080} height={1350}
  fps={1} durationInFrames={1} defaultProps={{ deck }}
  calculateMetadata={({ props }) => ({ width: props.deck.canvas.width, height: props.deck.canvas.height, durationInFrames: props.deck.slides.length })} />);
