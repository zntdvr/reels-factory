import { createHash } from 'node:crypto';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { resolveContent } from './content.mjs';
import { p, readJSON } from './util.mjs';

const text = (value) => typeof value === 'string' && value.trim().length > 0;
const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

export function validateCarousel(deck, recipe) {
  if (!text(deck.title)) throw new Error('Укажите title карусели.');
  const canvas = deck.canvas ?? recipe.canvas;
  if (!canvas || !Number.isInteger(canvas.width) || !Number.isInteger(canvas.height) ||
      canvas.width < 320 || canvas.height < 320 || canvas.width > 4096 || canvas.height > 4096) {
    throw new Error('canvas: нужны целые width/height от 320 до 4096.');
  }
  if (!Number.isInteger(recipe.maxSlides) || !Array.isArray(deck.slides) || deck.slides.length < 2 || deck.slides.length > recipe.maxSlides) {
    throw new Error(`Нужно от 2 до ${recipe.maxSlides} слайдов: обложка, мысли, призыв.`);
  }
  const ids = new Set();
  deck.slides.forEach((slide, index) => {
    if (!text(slide.id) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slide.id) || ids.has(slide.id)) throw new Error('Нужны уникальные латинские id слайдов.');
    ids.add(slide.id);
    const role = index === 0 ? 'cover' : index === deck.slides.length - 1 ? 'cta' : 'content';
    if (slide.role !== role) throw new Error(`${slide.id}: ожидается role: ${role}.`);
    if (!text(slide.title)) throw new Error(`${slide.id}: укажите заголовок.`);
    if (slide.body !== undefined && typeof slide.body !== 'string') throw new Error(`${slide.id}: body должен быть строкой.`);
    if (slide.image && (!text(slide.image.src) || !text(slide.image.alt))) throw new Error(`${slide.id}: у изображения нужны src и alt.`);
    if (slide.stat !== undefined && !text(slide.stat)) throw new Error(`${slide.id}: stat должен быть строкой.`);
    if (slide.image && slide.stat) throw new Error(`${slide.id}: выберите один главный образ — image или stat.`);
  });
  return { ...deck, canvas };
}

export function loadCarousel(dir) {
  const meta = readJSON(path.join(dir, 'meta.json'));
  const content = resolveContent(meta.content);
  if (content.pipeline !== 'slides') throw new Error('Это видеопроект. Для него используется npm run edit.');
  const file = path.join(dir, 'carousel.json');
  if (!existsSync(file)) throw new Error('Заполните carousel.json по docs/CONTENT.md.');
  const deck = validateCarousel(readJSON(file), content.recipe);
  const digest = createHash('sha256').update(JSON.stringify({ deck, content }));
  // Утверждение относится и к оформлению, и к конкретным изображениям.
  for (const file of ['style/tokens.ts', 'style/IDIOM.md', 'style/fonts.tsx', 'style/Background.tsx', 'core/Carousel.tsx', 'core/carousel-entry.tsx']) {
    digest.update(readFileSync(p(file)));
  }
  const root = realpathSync(dir) + path.sep;
  const slides = deck.slides.map((slide) => {
    if (!slide.image) return slide;
    const src = slide.image.src;
    if (path.isAbsolute(src) || !/^(source|work\/public)\//.test(src)) {
      throw new Error(`${slide.id}: image.src должен быть локальным путём source/… или work/public/… внутри проекта.`);
    }
    const file = realpathSync(path.resolve(dir, src));
    if (!file.startsWith(root)) throw new Error(`${slide.id}: изображение выходит за папку проекта.`);
    const mime = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' }[path.extname(file).toLowerCase()];
    if (!mime) throw new Error(`${slide.id}: используйте PNG, JPG или WebP.`);
    const data = readFileSync(file);
    digest.update(data);
    return { ...slide, image: { ...slide.image, src: `data:${mime};base64,${data.toString('base64')}` } };
  });
  return { meta, content, deck, renderDeck: { ...deck, slides }, revision: digest.digest('hex') };
}

export function carouselPlan({ deck, content }) {
  return `# ${deck.title}\n\nInstagram · ${deck.canvas.width}×${deck.canvas.height} · ${content.recipe.label}\n\n` +
    deck.slides.map((slide, i) => `## ${i + 1}. ${slide.title}\n\n${slide.body ?? ''}\n\n` +
      (slide.stat ? `Акцент: ${slide.stat}\n\n` : '') +
      (slide.image ? `Изображение: ${slide.image.alt} (${slide.image.src})\n\n` : '')).join('');
}

export function carouselPreview(deck, images) {
  return `<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHTML(deck.title)}</title><style>
body{margin:0;padding:24px;background:Canvas;color:CanvasText;font:16px system-ui}main{display:flex;gap:24px;flex-wrap:wrap;align-items:flex-start}
figure{margin:0;width:min(100%,360px)}img{display:block;width:100%;height:auto}figcaption{padding:12px 0}a{color:inherit}a:focus-visible{outline:3px solid currentColor;outline-offset:4px}
</style><h1>${escapeHTML(deck.title)}</h1><main>${images.map((data, i) => `<figure><img src="data:image/png;base64,${data}" alt="${escapeHTML(deck.slides[i].title)}"><figcaption><a download="${String(i + 1).padStart(2, '0')}-${deck.slides[i].id}.png" href="data:image/png;base64,${data}">Скачать слайд ${i + 1}</a></figcaption></figure>`).join('')}</main></html>`;
}
