import { readFileSync } from 'node:fs';

export function readCatalog() {
  return JSON.parse(readFileSync(new URL('../../config/content-formats.json', import.meta.url), 'utf8'));
}

export function resolveContent(content = {}, catalog = readCatalog()) {
  if (!content || typeof content !== 'object') throw new Error('content должен содержать type и format.');
  const type = content.type ?? 'reel';
  const kind = Object.hasOwn(catalog.types, type) && catalog.types[type];
  if (!kind) throw new Error(`Неизвестный вид контента «${type}». Доступны: ${Object.keys(catalog.types).join(', ')}`);
  const format = content.format ?? kind.defaultFormat;
  const recipe = Object.hasOwn(kind.formats, format) && kind.formats[format];
  if (!recipe) throw new Error(`Неизвестный формат «${format}» для ${type}. Доступны: ${Object.keys(kind.formats).join(', ')}`);
  if (!['video', 'slides'].includes(kind.pipeline) ||
      !['forbidden', 'optional', 'mixed-when-video'].includes(recipe.camera) ||
      !['none', 'elevenlabs', 'source-or-elevenlabs'].includes(recipe.voice) ||
      !Array.isArray(recipe.visualizers) || !Array.isArray(recipe.structure)) {
    throw new Error(`Некорректный рецепт ${type}/${format} в config/content-formats.json`);
  }
  const tools = ['remotion', 'animator', 'effectcraft', 'blender', 'footage'];
  if (recipe.visualizers.some((tool) => !tools.includes(tool)) ||
      (kind.pipeline === 'video' && !recipe.visualizers.length) ||
      (kind.pipeline === 'slides' && (!Number.isInteger(recipe.maxSlides) || recipe.maxSlides < 2 ||
        !Number.isInteger(recipe.canvas?.width) || !Number.isInteger(recipe.canvas?.height)))) {
    throw new Error(`Проверьте инструменты и параметры холста в рецепте ${type}/${format}.`);
  }
  return { type, format, label: kind.label, pipeline: kind.pipeline, recipe };
}

export function requireVideo(meta) {
  const content = resolveContent(meta.content);
  if (content.pipeline !== 'video') throw new Error('Это карусель. Используйте npm run carousel -- plan|preview|export --project ID.');
  return content;
}

export function validateContentBlocks(meta, blocks) {
  const content = requireVideo(meta);
  // Старые проекты не получают новые ограничения при чтении.
  if (!meta.content) return content;
  const { recipe } = content;
  if (recipe.camera === 'forbidden' && meta.avatar) throw new Error('В этом формате нет ведущего или аватара.');
  const cameraCount = blocks.filter((b) => b.camera).length;
  if (recipe.camera === 'forbidden' && cameraCount) throw new Error('В этом формате нет ведущего: все блоки должны иметь camera: false.');
  if (cameraCount && meta.clean?.kind !== 'video') throw new Error('Камерные блоки требуют видеодорожку.');
  if (recipe.camera === 'mixed-when-video' && meta.clean?.kind === 'video' && blocks.length > 1 &&
      (cameraCount === 0 || cameraCount === blocks.length)) {
    throw new Error('Формат «человек и сцены» требует и камерные, и графические блоки.');
  }
  const invalid = blocks.find((b) => !b.camera && !recipe.visualizers.includes(b.visualizer));
  if (invalid) throw new Error(`Инструмент ${invalid.visualizer} у ${invalid.id} не входит в формат ${content.format}.`);
  return content;
}
