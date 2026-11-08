import React from 'react';
import { useCurrentFrame } from 'remotion';
import { defineReel, color, type, VIDEO, PAGE_PAD } from '../../core';
const Packet: React.FC = () => {
  const frame = useCurrentFrame();
  return <div style={{ position: 'absolute', left: VIDEO.width * (0.2 + frame / 120),
    top: VIDEO.height * 0.5, width: 120, height: 80, background: color.accent,
    borderRadius: 12, transform: `rotate(${Math.sin(frame / 10) * 4}deg)` }} />;
};
export default defineReel({
  id: 'craft-demo', title: 'VPN — editable Craft demo',
  source: { audio: 'craft-demo/voice.wav', music: false }, transition: 'cut', sfx: false,
  captions: [{text:'Проверка редактируемого текста',start:0,end:1.9},{text:'Защищённое соединение',start:2,end:3.9}],
  blocks: [
    { id: 'B01', text: 'Передача данных', frames: 60, layers: [
      { id: 'packet', kind: 'render', component: Packet },
      { id: 'title', kind: 'text', text: 'VPN: этот текст можно исправить',
        x: PAGE_PAD, y: VIDEO.height * 0.25, width: VIDEO.width - PAGE_PAD * 2,
        fontFamily: type.title.family, fontWeight: type.title.weight, fontSize: type.title.size, color: color.text },
    ] },
    { id: 'B02', text: 'Защищённое соединение', frames: 60, effectcraft: 'craft-demo/effectcraft/B02.webm', layers: [
      { id: 'title', kind: 'text', text: 'EffectCraft + редактируемая подпись',
        x: PAGE_PAD, y: VIDEO.height * 0.25, width: VIDEO.width - PAGE_PAD * 2,
        fontFamily: type.title.family, fontWeight: type.title.weight, fontSize: type.title.size, color: color.text },
    ] },
  ],
});
