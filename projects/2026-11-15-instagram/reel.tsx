import { defineReel } from '../../core/reel';
import { B01, B01Layers } from './scenes/B01';
import { B02, B02Layers } from './scenes/B02';
import { B03, B03Layers } from './scenes/B03';
import { B04, B04Layers } from './scenes/B04';
import { B05, B05Layers } from './scenes/B05';
import { B06, B06Layers } from './scenes/B06';
import { B07, B07Layers } from './scenes/B07';
import { B08, B08Layers } from './scenes/B08';
import { B09, B09Layers } from './scenes/B09';

/** Черновик без озвучки. 63 секунды — редакционный хронометраж.
 * draft-silence.wav — техническая немая дорожка, не синтезированная речь.
 * Субтитры по выдуманным словам не создаются. */
export default defineReel({
  id: '2026-11-15-instagram',
  title: 'Instagram',
  source: { audio: '2026-11-15-instagram/draft-silence.wav', music: 'music/loyalty-freak-music-02-one-cool-minute.mp3' },
  audioSeconds: 63,
  blocks: [
    {
      id: 'b01',
      text: 'Instagram появился, когда его создатели убрали из приложения почти всё.',
      frames: 120,
      transition: "cut",
      sfx: [{"at":12,"role":"close"}],
      scene: B01,
      layers: B01Layers,
    },
    {
      id: 'b02',
      text: 'Сначала Кевин Систром и Майк Кригер работали над Burbn — сервисом, где можно было отмечать посещённые места и делиться фотографиями. Но массового интереса не было.',
      frames: 270,
      transition: "sheet",
      sfx: [{"at":42,"role":"enter"}],
      scene: B02,
      layers: B02Layers,
    },
    {
      id: 'b03',
      text: 'Тогда они сосредоточились на фотографиях. Квадратный снимок, фильтр, публикация — идея, которую легко объяснить другу.',
      frames: 180,
      transition: "push-left",
      sfx: [{"at":54,"role":"click"}],
      scene: B03,
      layers: B03Layers,
    },
    {
      id: 'b04',
      text: 'Шестого октября две тысячи десятого года Instagram вышел на iPhone. За первый день к нему присоединились двадцать пять тысяч пользователей.',
      frames: 240,
      transition: "zoom-in",
      sfx: [{"at":105,"role":"tick"}],
      scene: B04,
      layers: B04Layers,
    },
    {
      id: 'b05',
      text: 'Уже в апреле две тысячи двенадцатого Facebook объявил о соглашении купить Instagram примерно за миллиард долларов. От запуска прошло всего полтора года.',
      frames: 300,
      transition: "lift",
      sfx: [{"at":150,"role":"snap"}],
      scene: B05,
      layers: B05Layers,
    },
    {
      id: 'b06',
      text: 'Потом приложение снова стало меняться. В две тысячи шестнадцатом появились Stories — фото и видео, исчезающие через сутки.',
      frames: 180,
      transition: "push-up",
      sfx: [{"at":138,"role":"close"}],
      scene: B06,
      layers: B06Layers,
    },
    {
      id: 'b07',
      text: 'В две тысячи двадцатом начался широкий запуск Reels — коротких роликов с музыкой и эффектами.',
      frames: 180,
      transition: "through",
      sfx: [{"at":48,"role":"swipe"}],
      scene: B07,
      layers: B07Layers,
    },
    {
      id: 'b08',
      text: 'От квадратных фотографий — к историям и видео. Сначала Instagram вырос благодаря простоте, а потом начал расширять возможности.',
      frames: 210,
      transition: "push-right",
      sfx: [{"at":84,"role":"enter"}],
      scene: B08,
      layers: B08Layers,
    },
    {
      id: 'b09',
      text: 'А вы каким помните свой первый Instagram: фильтры на фотографиях, Stories или уже Reels?',
      frames: 210,
      transition: "zoom-out",
      sfx: [{"at":24,"role":"select"}],
      scene: B09,
      layers: B09Layers,
    },
  ],
});
