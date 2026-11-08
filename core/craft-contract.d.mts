export const TICKS_PER_SECOND: number;
export function framesToTicks(frame: number, fps: number): number;
export function validateLayers(layers: readonly unknown[], frames: number): void;
