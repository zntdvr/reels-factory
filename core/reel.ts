import type React from 'react';
import type { EditableLayer } from './editable';
import { validateLayers } from './craft-contract.mjs';
import { VIDEO } from './format';
import type { CaptionWord } from './caption-pages';
import { autoTransition, isTransition, transitionNames } from './transitions';
import { isSfxRole, sfxReport } from './sfx';
import type { SfxCue, SfxRole } from './sfx';

/**
 * РОЛИК КАК ОПИСАНИЕ. Один блок озвучки = одна сцена = одна мысль.
 *
 * Длительности здесь не выдумываются: они приходят из расшифровки уже
 * почищенной дорожки, где посчитаны границы смысловых блоков. Сумма длительностей
 * обязана совпадать с длиной аудио — иначе анимация разъедется с голосом, и
 * `defineReel` не даст такому ролику собраться.
 */

/**
 * ЧТО НА ЭКРАНЕ В ЭТОМ БЛОКЕ. Выбирается ровно один источник:
 *
 *   сцена, Animator или Blender — графика на фоне стиля. Человека не видно,
 *            от него остаётся только голос;
 *   камера — кадры присланного видео. Человек говорит, графика не рисуется.
 *
 * Смешивать их в одном блоке нельзя намеренно. Полупрозрачная графика поверх
 * говорящего лица — это не «и то, и другое», а нечитаемая каша: зритель не
 * знает, куда смотреть, и не читает ни лицо, ни инфографику.
 */
export interface ReelBlock {
  /** Короткое имя блока — видно в отчётах и в студии. */
  id: string;
  /** Реплика этого блока. Нужна для проверки синхрона и для истории правок. */
  text: string;
  /** Длина блока в кадрах. Считается по чистой дорожке. */
  frames: number;
  /** Сцена Remotion. Указана — на экране графика, человека не видно. */
  scene?: React.FC;
  /** Клип с альфа-каналом, подготовленный Animator для whiteboard-сцен. */
  animator?: string;
  /** Transparent clip rendered from EffectCraft. */
  effectcraft?: string;
  /** Separate objects shared by Remotion and the editable FilmCraft export. */
  layers?: EditableLayer[];
  /** Прозрачный 3D-клип, отрендеренный Blender для блока. */
  blender?: string;
  /**
   * Видеовставка: живые кадры под фразу, во весь экран и без прозрачности.
   * Готовит `npm run footage` — находит кусок, режет вертикаль под длину блока.
   */
  footage?: string;
  /**
   * Блок отдан говорящему человеку: показываются кадры присланного видео.
   * Графическая сцена для такого блока не создаётся — и это главная экономия
   * работы: отрисовывать нужно только те блоки, где человек уходит с экрана.
   */
  camera?: boolean;
  /**
   * ВРЕЗКА ПОВЕРХ ГОВОРЯЩЕГО ЧЕЛОВЕКА — маленькое доказательство рядом с лицом:
   * скрин, число, короткая подпись. Ставится только на камерном блоке и только
   * через `<CameraInset>`: он держит врезку вне зоны лица и останавливает сборку,
   * если она туда лезет.
   *
   * Это не лазейка для сцены поверх видео. Сцена и камера в одном блоке
   * по-прежнему запрещены: у сцены свой непрозрачный фон и своё внимание, и
   * вместе с лицом она не читается. Врезка работает С речью, сцена — ВМЕСТО неё.
   */
  inset?: React.FC;
  /** Чем этот кадр иллюстрирует смысл — одной фразой. Для самопроверки. */
  metaphor?: string;
  /**
   * ЧЕМ ЭТОТ БЛОК ПРИХОДИТ на смену предыдущему. Имя склейки: `push-up`,
   * `iris`, `cut` и так далее — список открыт, свои регистрируются в
   * `core/transitions.tsx`.
   *
   * Не указано — берётся общая склейка ролика. Две одинаковые подряд запрещены
   * и останавливают сборку: повторённый переход глаз выучивает с первого раза,
   * и стык снова читается сменой слайда. Исключение — `cut`: встык идёт
   * подряд ровно тогда, когда одно действие тянется через несколько блоков.
   */
  transition?: string;
  /**
   * ЗВУК ДВИЖЕНИЯ этого блока: что и на каком кадре слышно. Кадры считаются от
   * начала блока — как считает движение сама сцена, поэтому при перемонтаже
   * звук уезжает вместе с блоком.
   *
   * `false` — блок звучит одним голосом. Это осознанная пауза, а не способ
   * сэкономить работу: молчащее движение читается макетом.
   */
  sfx?: SfxCue[] | false;
  /**
   * Чем звучит ШОВ перед этим блоком. Обычно не указывается: роль берётся по
   * характеру склейки. `false` — шов молчит.
   */
  seam?: SfxRole | false;
}

export interface ReelSource {
  /** Готовая звуковая дорожка ролика, путь внутри public/. */
  audio?: string;
  /**
   * Присланное видео с камеры. Путь внутри public/.
   *
   * Звук берётся из него всегда. А вот КАДРЫ показываются только в блоках с
   * пометкой `camera` — в остальных их закрывает непрозрачный фон стиля. Если
   * камерных блоков нет ни одного, изображение не появится нигде: это случай
   * «снимал только чтобы вытащить озвучку», и он не требует никаких особых
   * настроек — просто ни один блок не помечен.
   */
  video?: string;
  /** Слой ИИ-аватара, если подключён. */
  avatar?: string;
  /**
   * Фоновая музыка именно этого ролика. Обычно не указывается: трек берётся из
   * банка по настройке. Здесь — либо имя файла внутри public/, чтобы поставить
   * свой, либо `false`, чтобы у этого ролика музыки не было вовсе.
   */
  music?: string | false;
}

export interface Reel {
  /** Идентификатор композиции: только латиница, цифры и дефис. Без подчёркиваний. */
  id: string;
  title: string;
  source: ReelSource;
  blocks: ReelBlock[];
  /**
   * Слова чистой дорожки для своих субтитров — тот же `words.clean.json`, по
   * которому посчитаны длины блоков. Кладёт их сборка каркаса; если субтитры
   * внешние или выключены, поля просто нет.
   */
  captions?: CaptionWord[];
  /**
   * ОБЩАЯ СКЛЕЙКА РОЛИКА — чем сменяются сцены там, где у блока не сказано
   * иначе. `'auto'` (по умолчанию) — система ведёт очередь сама: разную для
   * разных роликов, но всегда одну и ту же для одного, и без двух одинаковых
   * подряд.
   */
  transition?: string;
  /** `false` — у этого ролика звука движения нет вовсе. Голос и музыка остаются. */
  sfx?: false;
  /** Сумма длительностей блоков. Заполняется автоматически. */
  totalFrames: number;
}

/**
 * Собрать описание ролика и сразу проверить то, что дороже всего чинить потом.
 * Ошибка здесь падает при сборке — до рендера, а не после сорока минут ожидания.
 */
export function defineReel(input: Omit<Reel, 'totalFrames'> & { audioSeconds?: number }): Reel {
  const { id, title, source, blocks: written, captions, audioSeconds, transition, sfx } = input;

  // Проверка держится внутри функции намеренно: описание ролика выполняется на
  // самом старте сборки, когда модули ещё дозагружаются, и вынесенная наружу
  // константа в этот момент может оказаться не готова.
  if (!/^[a-z0-9-]+$/i.test(id)) {
    throw new Error(
      `Имя ролика «${id}» не годится для композиции: только латиница, цифры и дефис, без подчёркиваний.`,
    );
  }
  if (!written.length) throw new Error(`Ролик «${id}»: нет ни одного блока.`);
  if (!source.audio && !source.video) {
    throw new Error(`Ролик «${id}»: не указан источник звука — ни audio, ни video.`);
  }

  const bad = written.find((b) => !Number.isInteger(b.frames) || b.frames <= 0);
  if (bad) throw new Error(`Ролик «${id}», блок «${bad.id}»: длительность должна быть целым числом кадров > 0.`);

  // Что на экране, должно быть сказано прямо. Молчание тут дороже ошибки:
  // блок без сцены и без пометки «камера» отрендерится пустым фоном, и увидят
  // это только на готовом файле.
  for (const b of written) {
    const visualModes = Number(!!b.camera) + Number(!!b.scene) + Number(!!b.animator) +
      Number(!!b.effectcraft) + Number(!!b.blender) + Number(!!b.footage);
    if (visualModes > 1) {
      throw new Error(
        `Ролик «${id}», блок «${b.id}»: выбрано больше одного источника изображения. ` +
          `Укажите что-то одно: camera, scene, animator, effectcraft, blender или footage.`,
      );
    }
    if (visualModes === 0 && !b.layers?.length) {
      throw new Error(
        `Ролик «${id}», блок «${b.id}»: не сказано, что на экране. ` +
          `Выберите scene, animator, effectcraft, blender, footage или camera: true.`,
      );
    }
    if (b.footage && typeof b.footage !== 'string') {
      throw new Error(`Ролик «${id}», блок «${b.id}»: footage должен быть путём к видеофайлу.`);
    }
    validateLayers(b.layers ?? [], b.frames);
    if (b.effectcraft && typeof b.effectcraft !== 'string') throw new Error('effectcraft должен быть путём к клипу');
    if (b.layers?.length && b.camera) throw new Error('Редактируемые слои используйте на графических блоках; врезки камеры — через inset');
    if (b.animator && typeof b.animator !== 'string') {
      throw new Error(`Ролик «${id}», блок «${b.id}»: animator должен быть путём к видеофайлу.`);
    }
    if (b.blender && typeof b.blender !== 'string') {
      throw new Error(`Ролик «${id}», блок «${b.id}»: blender должен быть путём к видеофайлу.`);
    }
    if (b.inset && !b.camera) {
      throw new Error(
        `Ролик «${id}», блок «${b.id}»: врезка указана на блоке, где человека не видно. ` +
          `Врезка — это дополнение к говорящему лицу; на графическом блоке используйте scene или animator.`,
      );
    }
    if (b.camera && !source.video) {
      throw new Error(
        `Ролик «${id}», блок «${b.id}»: помечен как камерный, но видео у ролика нет. ` +
          `Показывать нечего — нужна сцена.`,
      );
    }
  }

  // ── склейки ───────────────────────────────────────────
  //
  // Имя склейки раскрывается здесь, один раз: дальше по системе едут только
  // конкретные имена. Иначе «сам подбери» пришлось бы разгадывать заново и при
  // сборке кадра, и при расчёте звука, и однажды они разошлись бы.
  const fallback = transition ?? 'auto';
  if (fallback !== 'auto' && !isTransition(fallback)) {
    throw new Error(
      `Ролик «${id}»: склейка «${fallback}» неизвестна.\n` +
        `Есть такие: ${transitionNames().join(', ')}.`,
    );
  }

  const blocks: ReelBlock[] = written.map((block, index) => {
    if (index === 0) return block; // первый блок ниоткуда не приходит
    const name = block.transition ?? (fallback === 'auto' ? autoTransition(id, index) : fallback);
    if (!isTransition(name)) {
      throw new Error(
        `Ролик «${id}», блок «${block.id}»: склейка «${name}» неизвестна.\n` +
          `Есть такие: ${transitionNames().join(', ')}.`,
      );
    }
    return { ...block, transition: name };
  });

  // Две одинаковые подряд не ставятся никогда: повторённый переход глаз
  // выучивает с первого раза, и стык снова читается сменой слайда. Встык —
  // исключение: одно действие через несколько блоков идёт встык, иначе предмет
  // пропадёт и появится заново.
  for (let i = 2; i < blocks.length; i++) {
    const here = blocks[i].transition;
    if (here && here !== 'cut' && here === blocks[i - 1].transition) {
      throw new Error(
        `Ролик «${id}»: блоки «${blocks[i - 1].id}» и «${blocks[i].id}» приходят одной склейкой «${here}». ` +
          `Две одинаковые подряд читаются сменой слайда — поменяйте одну из них.`,
      );
    }
  }

  // ── звук движения ─────────────────────────────────────
  for (const block of blocks) {
    if (block.seam && !isSfxRole(block.seam)) {
      throw new Error(
        `Ролик «${id}», блок «${block.id}»: роль шва «${block.seam}» не существует.\n` +
          `Список ролей: npm run sfx -- --list`,
      );
    }
    if (!Array.isArray(block.sfx)) continue;
    for (const cue of block.sfx) {
      if (!isSfxRole(cue.role)) {
        throw new Error(
          `Ролик «${id}», блок «${block.id}»: роли звука «${cue.role}» не существует.\n` +
            `Просят роль — смысл события, а не имя файла. Список ролей: npm run sfx -- --list`,
        );
      }
      if (cue.at < 0 || cue.at >= block.frames) {
        console.warn(
          `  · ролик «${id}», блок «${block.id}»: звук на кадре ${cue.at}, а в блоке ${block.frames} кадров — он не прозвучит.`,
        );
      }
    }
  }

  const totalFrames = blocks.reduce((sum, b) => sum + b.frames, 0);

  // Синхрон с голосом — главное правило. Допуск в один кадр на округление.
  if (audioSeconds !== undefined) {
    const expected = Math.round(audioSeconds * VIDEO.fps);
    if (Math.abs(expected - totalFrames) > 1) {
      const diff = ((totalFrames - expected) / VIDEO.fps).toFixed(2);
      throw new Error(
        `Ролик «${id}»: сумма блоков ${totalFrames} кадров, а дорожка — ${expected}. ` +
          `Расхождение ${diff}с: видео и голос разъедутся. Пересчитай блоки по чистой дорожке.`,
      );
    }
  }

  // ── мягкая проверка звука ─────────────────────────────
  //
  // Не брак, а признак расстановки наугад. Сборку не останавливаем: ошибка тут
  // была бы наглее, чем повод для неё, — но и промолчать нельзя, иначе половина
  // попаданий тихо уйдёт в прореживание, а автор будет уверен, что они звучат.
  if (sfx !== false) {
    const report = sfxReport(blocks, { transition: fallback });
    if (report.asked >= 8 && report.played < report.asked * 0.6) {
      console.warn(
        `  · ролик «${id}»: из ${report.asked} звуков прозвучит ${report.played}. ` +
          `Похоже, они расставлены не по движению — система снимает то, что легло в кашу.`,
      );
    }
    if (report.perSecond > 6) {
      console.warn(
        `  · ролик «${id}»: ${report.perSecond.toFixed(1)} звука в секунду — это уже трещотка. ` +
          `Озвучивайте главное событие блока, а не каждое движение.`,
      );
    }
  }

  return { id, title, source, blocks, captions, transition: fallback, sfx, totalFrames };
}
