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
const toolVisualizers = ['animator', 'effectcraft', 'blender', 'footage'];
const toolOnCamera = blocks.find((b) => b.camera && toolVisualizers.includes(b.visualizer));
if (toolOnCamera) stop(`Блок ${toolOnCamera.id} отмечен и как камера, и как ${toolOnCamera.visualizer}. Сначала решите, кто в кадре.`);
const animatorBlocks = graphic.filter((b) => b.visualizer === 'animator');
const effectcraftBlocks = graphic.filter((b) => b.visualizer === 'effectcraft');
const blenderBlocks = graphic.filter((b) => b.visualizer === 'blender');
const footageBlocks = graphic.filter((b) => b.visualizer === 'footage');
const remotionBlocks = graphic.filter((b) => !toolVisualizers.includes(b.visualizer));
const unknownVisualizer = graphic.find((b) => b.visualizer && !['remotion', ...toolVisualizers].includes(b.visualizer));
if (unknownVisualizer) stop(`Неизвестный visualizer «${unknownVisualizer.visualizer}» у блока ${unknownVisualizer.id}. Используйте remotion, animator, effectcraft, blender или footage.`);
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
import { Scene, color, type, safe, PAGE_PAD, VIDEO, anim, motion } from '../../../core';
import type { EditableLayer } from '../../../core';

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
        <div
          style={{
            marginTop: type.hero.size + 28,
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

// Текст отдельным объектом: Remotion и FilmCraft читают одно описание.
export const ${name}Layers: EditableLayer[] = [{
  id: 'title', kind: 'text', text: '${escape(accentOf(block.text))}',
  x: PAGE_PAD, y: safe.top + safe.contentHeight * 0.22,
  width: VIDEO.width - PAGE_PAD * 2, fontSize: type.hero.size,
  fontFamily: type.hero.family, fontWeight: type.hero.weight, color: color.text,
}];
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
for (const block of effectcraftBlocks) {
  const folder = path.join(dir, 'effectcraft');
  mkdirSync(folder, { recursive: true });
  const file = path.join(folder, `${block.id}.json`);
  if (!existsSync(file)) writeFileSync(file, JSON.stringify({
    note: 'Заполните steps командами EffectCraft (command, params); comp.new и рендер делает фабрика. Либо сохраните B01.ecproj в этой папке.',
    steps: [],
  }, null, 2) + '\n');
}

if (blenderBlocks.length) {
  const blenderDir = path.join(dir, 'blender');
  mkdirSync(blenderDir, { recursive: true });
  for (const block of blenderBlocks) {
    const sceneFile = path.join(blenderDir, `${block.id}.py`);
    if (existsSync(sceneFile)) continue;
    writeFileSync(sceneFile, `"""Blender-сцена для блока ${block.id}: ${block.text.replace(/\"/g, '\\\"')}.

Измени геометрию, материалы и анимацию под смысл реплики.
Функция получает bpy, активную сцену и параметры видео.
Фон рендерится прозрачным; голос и субтитры добавляет Reels Factory.
"""
import bpy
import math


def build_scene(bpy, scene, params):
    """Создай объекты, камеру, свет и ключевые кадры для этой сцены."""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)

    # Заглушка: вращающийся объёмный куб. Замени его метафорой блока.
    bpy.ops.mesh.primitive_cube_add(size=1.5, location=(0, 0, 0))
    subject = bpy.context.object
    subject.name = "Subject"
    bevel = subject.modifiers.new("SoftEdges", 'BEVEL')
    bevel.width = 0.12
    bevel.segments = 4
    subject.modifiers.new("Normals", 'WEIGHTED_NORMAL')
    subject.rotation_euler[2] = 0
    subject.keyframe_insert(data_path="rotation_euler", frame=1)
    subject.rotation_euler[2] = math.tau
    subject.keyframe_insert(data_path="rotation_euler", frame=params["frames"])

    material = bpy.data.materials.new("Accent")
    material.diffuse_color = (0.14, 0.36, 0.95, 1.0)
    material.use_nodes = True
    material.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.14, 0.36, 0.95, 1.0)
    material.node_tree.nodes["Principled BSDF"].inputs["Metallic"].default_value = 0.15
    material.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.3
    subject.data.materials.append(material)

    bpy.ops.object.camera_add(location=(3.8, -5.5, 3.3))
    camera = bpy.context.object
    direction = -camera.location
    camera.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
    camera.data.type = 'ORTHO'
    camera.data.ortho_scale = 4.4
    scene.camera = camera

    bpy.ops.object.light_add(type='AREA', location=(0, -3, 4))
    key = bpy.context.object
    key.data.energy = 480
    key.data.shape = 'DISK'
    key.data.size = 5
    key.rotation_euler = (math.radians(25), 0, math.radians(-12))

    bpy.ops.object.light_add(type='AREA', location=(2, 2, 1.5))
    fill = bpy.context.object
    fill.data.energy = 220
    fill.data.color = (0.35, 0.55, 1.0)
    fill.data.size = 4
`, 'utf8');
  }
}
if (footageBlocks.length) {
  const footageDir = path.join(dir, 'footage');
  mkdirSync(footageDir, { recursive: true });
  for (const block of footageBlocks) {
    const planFile = path.join(footageDir, `${block.id}.json`);
    if (existsSync(planFile)) continue;
    writeFileSync(planFile, JSON.stringify({
      text: block.text,
      seconds: block.seconds,
      query: [],
      search: '',
      negative: [],
      sources: ['bank', 'pexels', 'youtube'],
      picked: null,
      note: 'query — 1–3 описания кадра по-английски, как подпись к фото. search — строка для поиска на YouTube и Pexels. ' +
        'Затем: npm run footage -- --project ' + meta.id + ' --block ' + block.id,
    }, null, 2) + '\n', 'utf8');
  }
}

const counts = `Remotion-сцен создано: ${created}, Animator-сцен: ${animatorBlocks.length}, ` +
  `EffectCraft-сцен: ${effectcraftBlocks.length}, Blender-сцен: ${blenderBlocks.length}, ` +
  `вставок: ${footageBlocks.length}`;
done(onCamera ? `${counts}, на камере ${onCamera}` : counts);

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

const hasLayers = (b) => readFileSync(path.join(scenesDir, `${b.id.toUpperCase()}.tsx`), 'utf8').includes(`export const ${b.id.toUpperCase()}Layers`);
const imports = remotionBlocks
  .map((b) => `import { ${b.id.toUpperCase()}${hasLayers(b) ? `, ${b.id.toUpperCase()}Layers` : ''} } from './scenes/${b.id.toUpperCase()}';`)
  .join('\n');
const items = blocks
  .map(
    (b) => `    {
      id: '${b.id}',
      text: '${escape(b.text)}',
      frames: ${b.frames},
      ${b.camera ? 'camera: true,' : b.visualizer === 'animator'
        ? `animator: '${meta.id}/animator/${b.id}.webm',`
        : b.visualizer === 'effectcraft' ? `effectcraft: '${meta.id}/effectcraft/${b.id}.webm',`
        : b.visualizer === 'blender' ? `blender: '${meta.id}/blender/${b.id}.webm',`
        : b.visualizer === 'footage' ? `footage: '${meta.id}/footage/${b.id}.mp4',`
        : `scene: ${b.id.toUpperCase()},${hasLayers(b) ? `\n      layers: ${b.id.toUpperCase()}Layers,` : ''}`}
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
 * Remotion-сцена, Animator-клип, Blender-клип или видеовставка. Чтобы изменить выбор, правьте visualizer
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
