import { run } from './util.mjs';

export function verifyCraftVideo(file, { width, height, fps, frames, alpha = false }) {
  const probe = JSON.parse(run('ffprobe', ['-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_streams', '-of', 'json', file])).streams[0];
  if (!probe) throw new Error(`Нет видеопотока: ${file}`);
  const [n, d] = probe.r_frame_rate.split('/').map(Number);
  const hasAlpha = String(probe.tags?.alpha_mode ?? probe.tags?.ALPHA_MODE) === '1' || /^(yuva|gbrap|rgba|argb|bgra|abgr)/.test(probe.pix_fmt);
  if (probe.width !== width || probe.height !== height || Math.abs(n / d - fps) > 0.001 || Number(probe.nb_read_frames) !== frames || (alpha && !hasAlpha)) {
    throw new Error(`Размер, FPS, число кадров или alpha не совпадают с блоком: ${file}. Перерендерите исходную сцену.`);
  }
  return probe;
}
