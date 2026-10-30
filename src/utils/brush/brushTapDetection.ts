import { StrokePoint } from '../../types';

/**
 * Trim terminal jitter at stroke end (e.g., stylus lift-off drift < 1.5px).
 * Modifies the array in-place by popping off jittery terminal points.
 */
export function trimTerminalJitter(pts: StrokePoint[], minDistanceSq: number = 2.25): void {
  while (pts.length > 2) {
    const last = pts[pts.length - 1];
    const prev = pts[pts.length - 2];
    const dx = last.x - prev.x;
    const dy = last.y - prev.y;
    if (dx * dx + dy * dy < minDistanceSq) {
      pts.pop();
    } else {
      break;
    }
  }
}

/**
 * Determines whether a stroke is an accidental stray tap / palm brush vs an intentional mark.
 * Deliberate stylus taps (pressure > 0.38) are preserved.
 */
export function isAccidentalStrayTap(
  pts: StrokePoint[],
  startPos: { x: number; y: number },
  durationMs: number,
  pointerType?: string
): boolean {
  if (pts.length === 0) return true;

  // Deliberate stylus firm tap check
  const isDeliberatePenTap =
    pointerType === 'pen' && pts.some((p) => (p.pressure || 0) > 0.38);

  if (isDeliberatePenTap) {
    return false;
  }

  let maxDistFromStart = 0;
  let totalStrokeLength = 0;
  for (let i = 0; i < pts.length; i++) {
    const dStart = Math.hypot(pts[i].x - startPos.x, pts[i].y - startPos.y);
    if (dStart > maxDistFromStart) maxDistFromStart = dStart;
    if (i > 0) {
      totalStrokeLength += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    }
  }

  const isAccidental =
    (pts.length <= 1 || (maxDistFromStart < 5.0 && totalStrokeLength < 8.0)) &&
    durationMs < 280;

  return isAccidental;
}
