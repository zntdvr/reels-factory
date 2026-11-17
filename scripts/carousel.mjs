#!/usr/bin/env node
import { cpSync, existsSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { args, ensureDir, p, readJSON, writeJSON, stop } from './lib/util.mjs';
import { loadCarousel, carouselPlan, carouselPreview } from './lib/carousel.mjs';

const options = args();
const action = options._[0] ?? 'plan';
if (!['plan', 'approve', 'preview', 'export'].includes(action)) stop('Команды: plan, approve, preview, export.');
if (typeof options.project !== 'string' || !/^[a-z0-9-]+$/i.test(options.project)) stop('Не указан проект: --project ID');

try {
  const dir = p('projects', String(options.project));
  const input = loadCarousel(dir);
  const { meta, deck, renderDeck, revision } = input;
  const sessionFile = path.join(dir, 'work/carousel-session.json');
  const session = existsSync(sessionFile) ? readJSON(sessionFile) : {};
  ensureDir(path.join(dir, 'work'));
  if (action === 'plan') {
    const plan = carouselPlan(input);
    writeFileSync(path.join(dir, 'work/carousel-plan.md'), plan);
    console.log(`${plan}\nВерсия: ${revision}`);
  } else if (action === 'approve') {
    if (options.revision !== revision) throw new Error('Версия изменилась. Покажите актуальную карусель перед утверждением.');
    writeJSON(sessionFile, { ...session, approval: revision });
    console.log(`Утверждена версия ${revision}`);
  } else {
    if (action === 'export' && session.approval !== revision) throw new Error('Сначала согласуйте текущую карусель и выполните approve --revision HASH.');
    const { bundle } = await import('@remotion/bundler');
    const { openBrowser, selectComposition, renderStill } = await import('@remotion/renderer');
    const output = mkdtempSync(path.join(action === 'preview' ? path.join(dir, 'work') : dir, `carousel-${action}-`));
    let browser;
    let serveUrl;
    try {
      // Изображения входят в props; чужие видео и аудио не копируются в сборку.
      const emptyPublic = path.join(dir, 'work/carousel-public');
      ensureDir(emptyPublic);
      cpSync(p('public/fonts'), path.join(emptyPublic, 'fonts'), { recursive: true });
      serveUrl = await bundle({ entryPoint: p('core/carousel-entry.tsx'), publicDir: emptyPublic });
      browser = await openBrowser('chrome', { browserExecutable: options['browser-executable'] ?? null });
      const inputProps = { deck: renderDeck };
      const composition = await selectComposition({ serveUrl, id: 'carousel', inputProps, puppeteerInstance: browser });
      const images = [];
      const files = [];
      for (let frame = 0; frame < deck.slides.length; frame++) {
        const file = `${String(frame + 1).padStart(2, '0')}-${deck.slides[frame].id}.png`;
        await renderStill({ serveUrl, composition, inputProps, frame, output: path.join(output, file), imageFormat: 'png', puppeteerInstance: browser });
        images.push(readFileSync(path.join(output, file)).toString('base64'));
        files.push(file);
        console.log(`Слайд ${frame + 1}/${deck.slides.length}: ${file}`);
      }
      if (loadCarousel(dir).revision !== revision) throw new Error('Исходники изменились во время сборки. Повторите просмотр.');
      writeFileSync(path.join(output, 'index.html'), carouselPreview(deck, images));
      writeJSON(path.join(output, 'manifest.json'), { revision, canvas: deck.canvas, files });
      writeJSON(sessionFile, { ...session, [action]: { revision, directory: path.relative(dir, output) } });
      if (action === 'export') {
        meta.stage = 'exported';
        writeJSON(path.join(dir, 'meta.json'), meta);
      }
      console.log(`Готово: ${path.join(output, 'index.html')}`);
    } catch (error) {
      rmSync(output, { recursive: true, force: true });
      throw error;
    } finally {
      if (browser) await browser.close({ silent: true });
      if (serveUrl) rmSync(serveUrl, { recursive: true, force: true });
    }
  }
} catch (error) { stop(error.message); }
