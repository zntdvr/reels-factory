#!/usr/bin/env node
/**
 * КАРКАС ПРОЕКТА. По размеченным блокам создаются файлы сцен, описание ролика и
 * запись в реестре композиций.
 *
 *     node scripts/scaffold.mjs --project 2026-08-09-analitika
 *
 * Каждая сцена появляется рабочей заглушкой: акцентное слово, вход, дыхание.
 * Ролик собирается и рендерится сразу — уже на этом шаге видно хронометраж и
 * синхрон. Дальше заглушки по очереди заменяются настоящими метафорами.
 *
 * Обвязку никто не пишет руками: имена, длительности и связи ставит скрипт,
 * а человеческая работа остаётся там, где она и должна быть — в метафорах.
 */
import { copyFileSync, existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import {
  args, done, ensureDir, note, p, readJSON, say, step, stop,
} from './lib/util.mjs';

const options = args();
if (!options.project) stop('Не указан проект: --project <идентификатор>');

const dir = p('projects', String(options.project));
const meta = readJSON(path.join(dir, 'meta.json'));
const blocksFile = path.join(dir, 'work', 'blocks.json');
if (!existsSync(blocksFile)) stop(`Сначала разметка блоков: node scripts/blocks.mjs --project ${meta.id}`);

const { blocks, duration } = readJSON(blocksFile);
const scenesDir = path.join(dir, 'scenes');
ensureDir(scenesDir);

say(`\n  Каркас проекта: ${meta.title}\n`);

// ── сцены-заглушки ──────────────────────────────────────
step('Создаю файлы сцен');

const escape = (text) => text.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const accentOf = (text) => {
  // берём самое длинное слово блока — как временный якорь смысла
  const word = text.split(/\s+/).filter((w) => w.length > 2).sort((a, b) => b.length - a.length)[0];
  return (word ?? text.slice(0, 12)).replace(/[.,!?;:—]/g, '');
};

/**
 * Сцены создаются только для графических блоков. Блок, где говорит человек,
 * файла не получает: его картинка — само присланное видео, и рисовать там
 * нечего. Это и есть обещанная экономия — работа остаётся ровно там, где
 * человек уходит с экрана.
 */
const graphic = blocks.filter((b) => !b.camera);
const animatorOnCamera = blocks.find((b) => b.camera && b.visualizer === 'animator');
if (animatorOnCamera) stop(`Блок ${animatorOnCamera.id} отмечен и как камера, и как Animator. Сначала решите, кто в кадре.`);
const animatorBlocks = graphic.filter((b) => b.visualizer === 'animator');
const remotionBlocks = graphic.filter((b) => b.visualizer !== 'animator');
const unknownVisualizer = graphic.find((b) => b.visualizer && !['remotion', 'animator'].includes(b.visualizer));
if (unknownVisualizer) stop(`Неизвестный visualizer «${unknownVisualizer.visualizer}» у блока ${unknownVisualizer.id}. Используйте remotion или animator.`);
const onCamera = blocks.length - graphic.length;

let created = 0;
for (const block of remotionBlocks) {
  const name = block.id.toUpperCase();
  const file = path.join(scenesDir, `${name}.tsx`);
  if (existsSync(file)) continue;

  writeFileSync(
    file,
    `import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Scene, FitText, color, type, safe, anim, motion } from '../../../core';

/**
 * Блок ${block.index}: «${block.text}»
 * Длина: ${block.frames} кадров (${block.seconds}с)
 *
 * ЗАГЛУШКА. Здесь должна появиться метафора: движение, которое БУДЕТ смыслом
 * этой фразы, а не украшением рядом с ней. Проверка простая — уберите текст:
 * мысль читается из одного движения? Нет — метафора ещё не найдена.
 *
 * И движение должно жить все ${block.frames} кадров: отыграл вход — дальше
 * послесвечение, дрейф, бегущий сигнал. Статика под звучащий голос — брак.
 */
export const ${name}: React.FC = () => {
  const frame = useCurrentFrame();
  const appear = anim.enter(frame);
  const breath = motion.breathe(frame);

  return (
    <Scene>
      <div style={{ marginTop: safe.contentHeight * 0.22, ...appear }}>
        <FitText step={type.hero} color={color.text}>
          {'${escape(accentOf(block.text))}'}
        </FitText>
        <div
          style={{
            marginTop: 28,
            width: 120,
            height: 6,
            borderRadius: 3,
            background: color.accent,
            opacity: breath,
          }}
        />
      </div>
    </Scene>
  );
};
`,
    'utf8',
  );
  created++;
}
if (animatorBlocks.length) {
  const animatorDir = path.join(dir, 'animator');
  mkdirSync(animatorDir, { recursive: true });
  for (const block of animatorBlocks) {
    const specFile = path.join(animatorDir, `${block.id}.json`);
    if (existsSync(specFile)) continue;
    writeFileSync(specFile, JSON.stringify({
      title: '',
      layout: 'Одна ясная метафора, крупно и с полями под интерфейс и субтитры.',
      style: 'syspartner',
      beats: [{ start: 0, end: block.seconds, visual: block.text, label: '', narration: block.text }],
    }, null, 2) + '\n', 'utf8');
  }
}
done(
  onCamera
    ? `Remotion-сцен создано: ${created}, Animator-сцен: ${animatorBlocks.length}, на камере ${onCamera}`
    : `Remotion-сцен создано: ${created}, Animator-сцен: ${animatorBlocks.length}`,
);

// ── слова для субтитров ─────────────────────────────────
/**
 * Свои субтитры берут слова отсюда — из той же расшифровки чистой дорожки, по
 * которой посчитаны длины блоков. Файл кладётся всегда, даже если сейчас
 * субтитры внешние: тогда переключение режима в конфиге — это одна строчка, а
 * не пересборка проекта.
 */
step('Кладу слова для субтитров');

const wordsFile = path.join(dir, 'work', 'words.clean.json');
const hasWords = existsSync(wordsFile);
if (hasWords) {
  copyFileSync(wordsFile, path.join(dir, 'captions.json'));
  done('captions.json');
} else {
  note('расшифровки нет — свои субтитры для этого ролика рисоваться не будут');
}

// ── описание ролика ─────────────────────────────────────
step('Собираю описание ролика');

const sourceLine = meta.clean.kind === 'video'
  ? `video: '${meta.clean.file}'`
  : `audio: '${meta.clean.file}'`;

const imports = remotionBlocks
  .map((b) => `import { ${b.id.toUpperCase()} } from './scenes/${b.id.toUpperCase()}';`)
  .join('\n');
const items = blocks
  .map(
    (b) => `    {
      id: '${b.id}',
      text: '${escape(b.text)}',
      frames: ${b.frames},
      ${b.camera ? 'camera: true,' : b.visualizer === 'animator'
        ? `animator: '${meta.id}/animator/${b.id}.webm',`
        : `scene: ${b.id.toUpperCase()},`}
    },`,
  )
  .join('\n');

const reelFile = path.join(dir, 'reel.tsx');
if (existsSync(reelFile) && !options.force) {
  note('reel.tsx уже есть — оставляю как есть (перезаписать: --force)');
} else {
  writeFileSync(
    reelFile,
    `import { defineReel } from '../../core/reel';
${hasWords ? "import captions from './captions.json';\n" : ''}${imports}

/**
 * ${meta.title}
 *
 * Длительности блоков посчитаны по чистой дорожке и менять их руками нельзя:
 * defineReel сверяет их сумму с длиной звука и не даст собрать ролик, в котором
 * картинка разъезжается с голосом.${onCamera ? `
 *
 * У каждого блока выбран способ визуализации в work/blocks.json: camera,
 * Remotion-сцена или Animator-клип. Чтобы изменить выбор, правьте visualizer
 * там и пересоберите каркас.` : ''}
 */
export default defineReel({
  id: '${meta.id}',
  title: '${escape(meta.title)}',
  source: { ${sourceLine} },
  audioSeconds: ${duration},${hasWords ? '\n  captions,' : ''}
  blocks: [
${items}
  ],
});
`,
    'utf8',
  );
  done('reel.tsx');
}

// ── реестр композиций ───────────────────────────────────
step('Добавляю ролик в реестр');

const registryFile = p('projects', 'registry.ts');
let registry = readFileSync(registryFile, 'utf8');
const variable = `reel_${meta.id.replace(/-/g, '_')}`;

// Место вставки помечено в самом файле — так скрипт не спутает код с примером
// в комментарии и не сломает реестр.
const IMPORT_MARK = '// reelfactory:imports';
const LIST_MARK = '// reelfactory:reels';

if (registry.includes(`'./${meta.id}/reel'`)) {
  note('уже был в реестре');
} else if (!registry.includes(IMPORT_MARK) || !registry.includes(LIST_MARK)) {
  note('в projects/registry.ts потеряны метки вставки — допишите ролик руками');
} else {
  registry = registry
    .replace(IMPORT_MARK, `${IMPORT_MARK}\nimport ${variable} from './${meta.id}/reel';`)
    .replace(LIST_MARK, `${LIST_MARK}\n  ${variable},`);
  writeFileSync(registryFile, registry, 'utf8');
  done('ролик виден студии и рендеру');
}

say(`\n  Посмотреть:  npm run studio`);
say(`  Собрать:     node scripts/render.mjs --project ${meta.id}\n`);
