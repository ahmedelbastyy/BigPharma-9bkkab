export function openingDistance(height: number): number { return Math.max(1, Math.min(220, height * 0.28)); }
export function openingProgress(origin: number, translationY: number, distance: number): number {
  'worklet';
  return Math.max(0, Math.min(0.999, origin - translationY / Math.max(1, distance)));
}
export function openingVelocity(velocityY: number, distance: number): number {
  'worklet';
  return -velocityY / Math.max(1, distance);
}
