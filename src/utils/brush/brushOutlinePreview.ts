import { StrokePoint } from '../../types';

/** Maximum number of points fed to the live preview path generator. */
export const MAX_LIVE_PREVIEW_POINTS = 160;

/**
 * Decimate points for fast live stroke rendering during rapid pointermove events.
 * Keeps the existing every-other-point sampling for ordinary strokes, and
 * widens the stride only once the halved count would exceed
 * MAX_LIVE_PREVIEW_POINTS, so short strokes render exactly as before.
 * The last point is always kept so the stroke tip tracks the pointer.
 */
export const getDecimatedPointsForLivePreview = (pts: StrokePoint[]): StrokePoint[] => {
  if (pts.length <= 4) return pts;
  const stride = Math.max(2, Math.ceil(pts.length / MAX_LIVE_PREVIEW_POINTS));
  const out: StrokePoint[] = [];
  for (let i = 0; i < pts.length; i += stride) out.push(pts[i]);
  const last = pts[pts.length - 1];
  if (out[out.length - 1] !== last) out.push(last);
  return out;
};

/**
 * Computes effective smoothing intensity based on auto-smooth setting, preset strength, and manual slider.
 */
export function calculateEffectiveSmoothing(
  autoSmoothBrush?: boolean,
  smoothStrength?: 'light' | 'standard' | 'strong' | 'mild',
  smoothingIntensity: number = 50
): number {
  if (!autoSmoothBrush) {
    return smoothingIntensity;
  }
  if (smoothStrength === 'strong') {
    return Math.max(82, smoothingIntensity);
  }
  if (smoothStrength === 'standard') {
    return Math.max(62, smoothingIntensity);
  }
  return Math.max(40, smoothingIntensity);
}
