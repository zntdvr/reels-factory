import { defineReel } from '../../core/reel';
import captions from './captions.json';
import { B02 } from './scenes/B02';
import { B03 } from './scenes/B03';
import { B04 } from './scenes/B04';
import { B07 } from './scenes/B07';
import { B09 } from './scenes/B09';
import { B10 } from './scenes/B10';
import { B12 } from './scenes/B12';
import { B14 } from './scenes/B14';
import { B15 } from './scenes/B15';
import { B16 } from './scenes/B16';
import { B17 } from './scenes/B17';
import { B18 } from './scenes/B18';
import { B19 } from './scenes/B19';
import { B21 } from './scenes/B21';
import { B22 } from './scenes/B22';

/**
 * backup — «нас взломали, просят выкуп» и что с этим делать.
 *
 * Длительности блоков посчитаны по чистой дорожке и менять их руками нельзя:
 * defineReel сверяет их сумму с длиной звука и не даст собрать ролик, в котором
 * картинка разъезжается с голосом.
 *
 * КАК РАЗДЕЛЁН РОЛИК. Камере отдано то, что держится на человеке: зацепка,
 * личное суждение («ни в коем случае не платите»), обращение к зрителю и призыв
 * в конце. Графике — то, что на лице не читается: запертые данные, утекающие
 * деньги, пустой журнал копий и схема трёх копий.
 *
 * ПРО ЦВЕТ. Вся проблемная половина идёт без синего: в этом стиле синее значит
 * «вот оно, смотрите», а беда показывается серым. Первый акцент появляется в
 * блоке 10, на слове «копировать», — и работает как ответ на всё предыдущее.
 *
 * ПРО СКЛЕЙКИ. Блоки 14–19 идут встык: там шесть блоков подряд строят одну и ту
 * же схему, предмет продолжается из кадра в кадр, и стыка не должно быть видно.
 * Встык же идут два соседних камерных блока — там продолжается сам человек.
 */
export default defineReel({
  id: '2026-09-20-backup',
  title: 'backup',
  source: { video: '2026-09-20-backup/clean.mp4' },
  audioSeconds: 84.9,
  captions,
  blocks: [
    {
      id: 'b01',
      text: 'недавно ко мне обратилась компания',
      frames: 131,
      camera: true,
    },
    {
      id: 'b02',
      text: 'с таким запросом',
      frames: 60,
      scene: B02,
      metaphor: 'запрос прилетает: сообщение ложится на лист и дописывается',
      transition: 'sheet',
      sfx: [
        { at: 8, role: 'drop' },
        { at: 26, role: 'typing', lasts: 22 },
        { at: 46, role: 'notify' },
      ],
    },
    {
      id: 'b03',
      text: 'что их взломали хакеры и все их данные заблокировали',
      frames: 146,
      scene: B03,
      metaphor: 'полоса идёт по данным, и всё, чего коснулась, гаснет; сверху садится замок',
      transition: 'push-left',
      sfx: [
        { at: 10, role: 'enter' },
        { at: 26, role: 'swipe' },
        { at: 118, role: 'close' },
      ],
    },
    {
      id: 'b04',
      text: 'и теперь просят за эти данные выкуп',
      frames: 87,
      scene: B04,
      metaphor: 'поверх запертых данных ложится требование, и пошёл счёт времени',
      transition: 'cut',
      sfx: [
        { at: 10, role: 'drop' },
        { at: 44, role: 'tick' },
      ],
    },
    {
      id: 'b05',
      text: 'конечно первым делом что я им сказал',
      frames: 91,
      camera: true,
      transition: 'push-up',
    },
    {
      id: 'b06',
      text: 'ни в коем случае вам не нужно платить им выкуп',
      frames: 120,
      camera: true,
      transition: 'cut',
    },
    {
      id: 'b07',
      text: 'они с вас будут тянуть деньги до последнего',
      frames: 124,
      scene: B07,
      metaphor: 'из стопки тянут по купюре, и с каждым разом быстрее — до пустого контура',
      transition: 'sheet',
      sfx: [
        { at: 26, role: 'swipe' },
        { at: 46, role: 'swipe' },
        { at: 64, role: 'swipe' },
        { at: 80, role: 'swipe' },
        { at: 94, role: 'swipe' },
        { at: 106, role: 'swipe' },
        { at: 116, role: 'swipe' },
      ],
    },
    {
      id: 'b08',
      text: 'и второй момент который я им сказал',
      frames: 111,
      camera: true,
      transition: 'lift',
    },
    {
      id: 'b09',
      text: 'и которые они к сожалению до этого никогда не делали',
      frames: 150,
      scene: B09,
      metaphor: 'проверка идёт по дням журнала, и в каждом дне вместо копии прочерк',
      transition: 'push-up',
      sfx: [
        { at: 30, role: 'scroll', lasts: 100 },
        { at: 132, role: 'close' },
      ],
    },
    {
      id: 'b10',
      text: 'это то что данные всегда необходимо бы копировать',
      frames: 155,
      scene: B10,
      metaphor: 'из файла одна за другой выходят копии; синее приходит на слове «копировать»',
      transition: 'slide-in',
      sfx: [
        { at: 22, role: 'swipe' },
        { at: 54, role: 'swipe' },
        { at: 86, role: 'swipe' },
        { at: 114, role: 'select' },
      ],
    },
    {
      id: 'b11',
      text: 'если говорить простыми словами backup',
      frames: 113,
      camera: true,
      transition: 'lift',
    },
    {
      id: 'b12',
      text: 'это копия ваших данных',
      frames: 65,
      scene: B12,
      metaphor: 'равенство: из файла выезжает такой же, между ними встаёт знак равно',
      transition: 'sheet',
      sfx: [
        { at: 18, role: 'snap' },
        { at: 44, role: 'select' },
      ],
    },
    {
      id: 'b13',
      text: 'и самое идеальное если у вас есть',
      frames: 111,
      camera: true,
      transition: 'lift',
    },
    {
      id: 'b14',
      text: 'минимум три копии этих данных',
      frames: 105,
      scene: B14,
      metaphor: 'счёт до трёх, и под цифру встают три пустых места',
      transition: 'sheet',
      sfx: [
        { at: 10, role: 'enter' },
        { at: 26, role: 'tick' },
        { at: 40, role: 'tick' },
        { at: 56, role: 'tick' },
      ],
    },
    {
      id: 'b15',
      text: 'одна копия рабочая',
      frames: 65,
      scene: B15,
      metaphor: 'первое место занимает живая копия — в ней не перестаёт идти полоса',
      transition: 'cut',
      sfx: [
        { at: 0, role: 'drop' },
        { at: 18, role: 'select' },
      ],
    },
    {
      id: 'b16',
      text: 'еще одна лежит на том же сервере',
      frames: 81,
      scene: B16,
      metaphor: 'копия переезжает на соседнее место — ехать недалеко, тот же сервер',
      transition: 'cut',
      sfx: [
        { at: 10, role: 'swipe' },
        { at: 56, role: 'snap' },
      ],
    },
    {
      id: 'b17',
      text: 'и третья копия данных',
      frames: 63,
      scene: B17,
      metaphor: 'третье место занято, и по ряду протягивается общая линия',
      transition: 'cut',
      sfx: [
        { at: 0, role: 'drop' },
        { at: 18, role: 'select' },
      ],
    },
    {
      id: 'b18',
      text: 'лежит на каком-нибудь внешнем источнике типа',
      frames: 147,
      scene: B18,
      metaphor: 'схема поднимается, под ней открывается «снаружи», и копия уезжает за черту',
      transition: 'cut',
      sfx: [
        { at: 2, role: 'open' },
        { at: 40, role: 'swipe' },
        { at: 118, role: 'snap' },
        { at: 132, role: 'select' },
      ],
    },
    {
      id: 'b19',
      text: 'яндекс диска или съемного жесткого диска',
      frames: 143,
      scene: B19,
      metaphor: 'два настоящих места, и синее переходит с одного на другое: либо туда, либо туда',
      transition: 'cut',
      sfx: [
        { at: 0, role: 'enter' },
        { at: 20, role: 'enter' },
        { at: 44, role: 'select' },
        { at: 88, role: 'select' },
      ],
    },
    {
      id: 'b20',
      text: 'поэтому советую вам прямо сейчас',
      frames: 88,
      camera: true,
      transition: 'lift',
    },
    {
      id: 'b21',
      text: 'проверьте есть ли у вас backup',
      frames: 107,
      scene: B21,
      metaphor: 'проверка по вашему списку: три строки сходятся, на четвёртой прочерк',
      transition: 'sheet',
      sfx: [
        { at: 28, role: 'tick' },
        { at: 46, role: 'tick' },
        { at: 64, role: 'tick' },
        { at: 80, role: 'close' },
      ],
    },
    {
      id: 'b22',
      text: 'и делаются ли они регулярно',
      frames: 94,
      scene: B22,
      metaphor: 'метки падают в дни недели через равный шаг — регулярность отбита, а не нарисована',
      transition: 'push-left',
      sfx: [{ at: 18, role: 'tick', times: 7, step: 10 }],
    },
    {
      id: 'b23',
      text: 'а если и они еще не сделаны',
      frames: 75,
      camera: true,
      transition: 'lift',
    },
    {
      id: 'b24',
      text: 'обращайтесь к нам мы вам с этим поможем',
      frames: 115,
      camera: true,
      transition: 'cut',
    },
  ],
});
