import { describe, it, expect } from 'vitest';
import {
  trimTerminalJitter,
  isAccidentalStrayTap,
} from './brushTapDetection';
import {
  calibrateStylusPressure,
  computeMouseSpeedPressure,
  blendStrokePressure,
} from './brushPressure';
import {
  calculateEffectiveSmoothing,
  getDecimatedPointsForLivePreview,
} from './brushOutlinePreview';
import { StrokePoint } from '../../types';

describe('brushTapDetection', () => {
  it('trims terminal jitter points within 1.5px distance', () => {
    const pts: StrokePoint[] = [
      { x: 10, y: 10 },
      { x: 20, y: 20 },
      { x: 30, y: 30 },
      { x: 30.5, y: 30.5 }, // dx=0.5, dy=0.5 -> distSq=0.5 < 2.25
      { x: 30.7, y: 30.7 }, // dx=0.2, dy=0.2 -> distSq=0.08 < 2.25
    ];
    trimTerminalJitter(pts);
    expect(pts.length).toBe(3);
    expect(pts[pts.length - 1]).toEqual({ x: 30, y: 30 });
  });

  it('preserves valid terminal points with distance >= 1.5px', () => {
    const pts: StrokePoint[] = [
      { x: 10, y: 10 },
      { x: 20, y: 20 },
      { x: 30, y: 30 },
    ];
    trimTerminalJitter(pts);
    expect(pts.length).toBe(3);
  });

  it('detects accidental stray tap when touch is brief and minimal distance', () => {
    const pts: StrokePoint[] = [
      { x: 100, y: 100 },
      { x: 101, y: 101 },
    ];
    const isAccidental = isAccidentalStrayTap(pts, { x: 100, y: 100 }, 150, 'touch');
    expect(isAccidental).toBe(true);
  });

  it('preserves deliberate stylus tap even if brief when pressure is firm (> 0.38)', () => {
    const pts: StrokePoint[] = [
      { x: 100, y: 100, pressure: 0.65 },
    ];
    const isAccidental = isAccidentalStrayTap(pts, { x: 100, y: 100 }, 120, 'pen');
    expect(isAccidental).toBe(false);
  });

  it('preserves intentional marks when distance or duration exceeds threshold', () => {
    const pts: StrokePoint[] = [
      { x: 100, y: 100 },
      { x: 120, y: 120 },
    ];
    const isAccidentalByDistance = isAccidentalStrayTap(pts, { x: 100, y: 100 }, 100, 'mouse');
    expect(isAccidentalByDistance).toBe(false);

    const isAccidentalByTime = isAccidentalStrayTap([{ x: 100, y: 100 }], { x: 100, y: 100 }, 350, 'touch');
    expect(isAccidentalByTime).toBe(false);
  });
});

describe('brushPressure', () => {
  it('calibrates stylus hardware pressure to dynamic range', () => {
    expect(calibrateStylusPressure(0)).toBe(0.15);
    expect(calibrateStylusPressure(0.03)).toBe(0.04);
    expect(calibrateStylusPressure(0.68)).toBe(1.0);
    expect(calibrateStylusPressure(0.95)).toBe(1.0);
  });

  it('computes dynamic mouse pressure based on motion velocity', () => {
    const { smoothSpeed, rawPressure } = computeMouseSpeedPressure(16, 2, 0.5);
    expect(smoothSpeed).toBeGreaterThan(0);
    expect(rawPressure).toBeGreaterThanOrEqual(0.35);
    expect(rawPressure).toBeLessThanOrEqual(0.80);
  });

  it('blends stroke pressure according to pointer type', () => {
    // Off sensitivity always yields 0.5
    expect(blendStrokePressure('pen', 'off', 0.9, 0.4)).toBe(0.5);

    // Pen has high responsiveness (88% new)
    const penBlended = blendStrokePressure('pen', 'high', 1.0, 0.0);
    expect(penBlended).toBeCloseTo(0.88, 2);

    // Mouse has high dampening (25% new)
    const mouseBlended = blendStrokePressure('mouse', 'high', 1.0, 0.0);
    expect(mouseBlended).toBeCloseTo(0.25, 2);
  });
});

describe('brushOutlinePreview', () => {
  it('calculates effective smoothing based on preset and sliders', () => {
    expect(calculateEffectiveSmoothing(false, 'standard', 30)).toBe(30);
    expect(calculateEffectiveSmoothing(true, 'strong', 50)).toBe(82);
    expect(calculateEffectiveSmoothing(true, 'standard', 50)).toBe(62);
    expect(calculateEffectiveSmoothing(true, 'mild', 30)).toBe(40);
    expect(calculateEffectiveSmoothing(true, 'mild', 75)).toBe(75);
  });

  it('decimates points for rapid live preview', () => {
    const small: StrokePoint[] = [{ x: 1, y: 1 }, { x: 2, y: 2 }];
    expect(getDecimatedPointsForLivePreview(small)).toBe(small);

    const large: StrokePoint[] = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 2 },
      { x: 3, y: 3 },
      { x: 4, y: 4 },
      { x: 5, y: 5 },
    ];
    const decimated = getDecimatedPointsForLivePreview(large);
    expect(decimated.length).toBe(4); // index 0, 2, 4, 5
    expect(decimated[decimated.length - 1]).toEqual({ x: 5, y: 5 });
  });
});
