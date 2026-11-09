import type { Reel } from '../core/reel';
// reelfactory:imports
import reel_2026_11_09_vpn from './2026-11-09-vpn/reel';

/**
 * СПИСОК РОЛИКОВ. Ведётся системой: при сборке каркаса проекта сюда добавляется
 * строка, и ролик сразу виден в студии и доступен рендеру.
 *
 * Строки с пометками reelfactory:imports и reelfactory:reels — метки для
 * скрипта, по ним он находит, куда дописывать. Их не удалять.
 */
export const reels: Reel[] = [
  // reelfactory:reels
  reel_2026_11_09_vpn,
];
