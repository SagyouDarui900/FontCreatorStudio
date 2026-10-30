import { StrokePoint } from '../../types';

/**
 * Decimate points for fast live stroke rendering during rapid pointermove events.
 */
export const getDecimatedPointsForLivePreview = (pts: StrokePoint[]): StrokePoint[] => {
  if (pts.length <= 4) return pts;
  return pts.filter((_, idx) => idx % 2 === 0 || idx === pts.length - 1);
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
