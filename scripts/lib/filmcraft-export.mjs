import path from 'node:path';
import { copyFileSync, existsSync, mkdirSync, renameSync, rmSync } from 'node:fs';
import { connectEdit, saveLiveProject } from './filmcraft-live.mjs';
import { readSession, sourceSnapshot } from './edit-session.mjs';
import { normalizeLoudness } from './loudness.mjs';
import { p, reelOutputs, run, runLoud } from './util.mjs';

/** Export only the live, reviewed timeline. Never fall back to the JSX reel. */
export async function exportFilmcraft(dir, meta, config) {
  const state = readSession(dir);
  if (!state?.project) throw new Error('Сначала подготовьте и просмотрите черновик FilmCraft.');
  if (JSON.stringify(state.sources) !== JSON.stringify(sourceSnapshot(dir))) throw new Error('Исходники изменились после подготовки. Сначала edit update, затем просмотр и экспорт.');
  const client = await connectEdit(dir, config);
  const temporary = path.join(dir, 'work/filmcraft-final.mp4');
  try {
    await saveLiveProject(client, state);
    const sequence = await client.tool('sequence_inspect');
    rmSync(temporary, { force: true });
    const result = await client.command('file.exportMedia', { path: temporary, range: 'entire', format: 'h264',
      h264Profile: 'high', audioCodec: 'aac', crf: config.render?.crf ?? 18, wait: true });
    if (result.offlineMedia?.length) throw new Error('FilmCraft обнаружил недоступные медиа; готовый файл не выдан.');
    if (!existsSync(temporary)) throw new Error('FilmCraft не создал итоговый файл.');
    const probe = JSON.parse(run('ffprobe', ['-v', 'error', '-show_streams', '-of', 'json', temporary]));
    const video = probe.streams.find((s) => s.codec_type === 'video');
    const audio = probe.streams.find((s) => s.codec_type === 'audio');
    if (!video || video.codec_name !== 'h264' || video.pix_fmt !== 'yuv420p' ||
      video.width !== config.format.width || video.height !== config.format.height || !Number.isFinite(Number(video.duration)) ||
      (audio && audio.codec_name !== 'aac') ||
      Math.abs(Number(video.duration) - sequence.durationFrames / meta.fps) > 1 / meta.fps + 0.01) throw new Error('Формат или длительность экспорта FilmCraft не совпали с монтажом.');
    const loudness = config.render?.loudness ?? {};
    if (loudness.normalize !== false) {
      const measured = normalizeLoudness(temporary, { targetLufs: loudness.targetLufs ?? -13, truePeak: loudness.truePeak ?? -1 });
      console.log(measured.ok ? `▸ Громкость: ${measured.after ?? loudness.targetLufs ?? -13} LUFS` : `▸ Громкость: ${measured.reason}`);
    }
    // Check the candidate before replacing the user's previous ready video.
    runLoud('node', [p('scripts/check.mjs'), '--project', meta.id, '--file', temporary]);
    const { ready } = reelOutputs(meta, config, dir);
    mkdirSync(path.dirname(ready), { recursive: true });
    try { renameSync(temporary, ready); }
    catch {
      const staged = `${ready}.pending.mp4`;
      try { copyFileSync(temporary, staged); renameSync(staged, ready); rmSync(temporary, { force: true }); }
      finally { rmSync(staged, { force: true }); }
    }
    console.log(`✓ ${ready}`);
    return ready;
  } finally { client.close(); }
}
