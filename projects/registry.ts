import type { Reel } from '../core/reel';
// reelfactory:imports
import reel_2026_09_20_backup from './2026-09-20-backup/reel';

/**
 * СПИСОК РОЛИКОВ. Ведётся системой: при сборке каркаса проекта сюда добавляется
 * строка, и ролик сразу виден в студии и доступен рендеру.
 *
 * Строки с пометками reelfactory:imports и reelfactory:reels — метки для
 * скрипта, по ним он находит, куда дописывать. Их не удалять.
 */
export const reels: Reel[] = [
  // reelfactory:reels
  reel_2026_09_20_backup,
];
