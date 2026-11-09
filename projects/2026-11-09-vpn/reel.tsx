import { defineReel } from '../../core/reel';
import captions from './captions.json';
import { B04, B04Layers } from './scenes/B04';
import { B05, B05Layers } from './scenes/B05';
import { B06, B06Layers } from './scenes/B06';
import { B07, B07Layers } from './scenes/B07';

/**
 * Ролик: «Что такое VPN и зачем он нужен бизнесу» (47.10с).
 *
 * ДРАМАТУРГИЯ И МУЛЬТИИНСТРУМЕНТАЛЬНОСТЬ:
 * - Камера (живой спикер, 32% хронометража): чистый говорящий человек без наложения графики на лицо.
 * - Animator (Whiteboard-анимация): штриховой рисунок устройства, защитного туннеля и замка (B02).
 * - Remotion (инфографика и дизайн-система): доступ к 1С/CRM (B04), топология филиалов (B05),
 *   защита в Wi-Fi (B06), международные сервисы с векторными логотипами (B07).
 *
 * СКЛЕЙКИ:
 * - Все переходы уникальны, ни одного повтора подряд.
 * - Фирменный переход «синий экран и точка» (`iris`) стоит перед кульминационным блоком зарубежных сервисов.
 */
export default defineReel({
  id: '2026-11-09-vpn',
  title: 'Что такое VPN и зачем он нужен бизнесу',
  source: { video: '2026-11-09-vpn/clean.mp4' },
  audioSeconds: 47.1,
  captions,
  blocks: [
    {
      id: 'b01',
      text: 'Что такое VPN — это защищённый тоннель между вашим устройством и другой сетью.',
      frames: 255,
      camera: true,
      metaphor: 'спикер в кадре задаёт тему без лишних наложений на лицо',
      sfx: false,
    },
    {
      id: 'b02',
      text: 'Всё, что идёт по нему, шифруется и по пути никто это не сможет прочитать.',
      frames: 233,
      animator: '2026-11-09-vpn/animator/b02.webm',
      transition: 'sheet',
      metaphor: 'whiteboard-рисунок туннеля, замка и шифрования штрих за штрихом',
      sfx: [
        { at: 12, role: 'drop' },
        { at: 52, role: 'close' },
        { at: 105, role: 'notify' },
        { at: 126, role: 'check' },
      ],
    },
    {
      id: 'b03',
      text: 'Зачем VPN нужен бизнесу? Первое — сотрудник из дома или из кафе',
      frames: 194,
      camera: true,
      transition: 'lift',
      metaphor: 'спикер задаёт бизнес-вопрос и объявляет первый кейс в чистом кадре',
      sfx: false,
    },
    {
      id: 'b04',
      text: 'Заходят во внутренние системы компании, как будто сидит в офисе.',
      frames: 172,
      scene: B04,
      layers: B04Layers,
      transition: 'push-left',
      metaphor: 'ноутбук удалёнщика связывается с локальными базами 1C и CRM без публичных IP',
      sfx: [
        { at: 15, role: 'swipe' },
        { at: 38, role: 'select' },
        { at: 58, role: 'tick' },
        { at: 78, role: 'check' },
        { at: 100, role: 'success' },
      ],
    },
    {
      id: 'b05',
      text: 'Второе — несколько офисов работают как одна сеть.',
      frames: 152,
      scene: B05,
      layers: B05Layers,
      transition: 'through',
      metaphor: 'три территориальных офиса соединяются в единый защищённый периметр Site-to-Site',
      sfx: [
        { at: 14, role: 'enter' },
        { at: 35, role: 'snap' },
        { at: 50, role: 'snap' },
        { at: 72, role: 'check' },
      ],
    },
    {
      id: 'b06',
      text: 'Третье — в публичном Wi-Fi почту и пароли не перехватят.',
      frames: 175,
      scene: B06,
      layers: B06Layers,
      transition: 'push-up',
      metaphor: 'над открытой сетью опускается щит шифрования, защищая почту и пароли компании',
      sfx: [
        { at: 12, role: 'drop' },
        { at: 32, role: 'drop' },
        { at: 50, role: 'close' },
        { at: 92, role: 'check' },
      ],
    },
    {
      id: 'b07',
      text: 'И четвёртое — доступ к зарубежным сервисам, которыми пользуется ваша команда.',
      frames: 232,
      scene: B07,
      layers: B07Layers,
      transition: 'iris',
      metaphor: 'карточки Figma, Notion, Slack, GitHub открываются без сбоев',
      sfx: [
        { at: 18, role: 'enter' },
        { at: 33, role: 'tick' },
        { at: 48, role: 'tick' },
        { at: 63, role: 'tick' },
        { at: 90, role: 'success' },
        { at: 130, role: 'select' },
      ],
    },
  ],
});
