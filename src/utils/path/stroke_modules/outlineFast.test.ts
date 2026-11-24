import { describe, expect, it } from 'vitest';
import {
  generateFastStrokeSvgPath,
  autoStraightenStrokePoints,
} from './outlineFast';
import { StrokePoint } from '../../../types';

const zigzag: StrokePoint[] = [
  { x: 100, y: 100, pressure: 0.5 },
  { x: 110, y: 120, pressure: 0.5 },
  { x: 120, y: 100, pressure: 0.5 },
  { x: 130, y: 120, pressure: 0.5 },
  { x: 140, y: 100, pressure: 0.5 },
  { x: 150, y: 120, pressure: 0.5 },
  { x: 160, y: 100, pressure: 0.5 },
];

const straight: StrokePoint[] = [
  { x: 100, y: 100, pressure: 0.5 },
  { x: 120, y: 100, pressure: 0.5 },
  { x: 140, y: 100, pressure: 0.5 },
  { x: 160, y: 100, pressure: 0.5 },
  { x: 180, y: 100, pressure: 0.5 },
  { x: 200, y: 100, pressure: 0.5 },
];

describe('generateFastStrokeSvgPath (H7: preview must match finalize)', () => {
  it('smoothingIntensity changes the preview: 0 keeps the zigzag, 100 smooths it', () => {
    const d0 = generateFastStrokeSvgPath(zigzag, 40, 'brush', true, 'off', null, 0);
    const d100 = generateFastStrokeSvgPath(zigzag, 40, 'brush', true, 'off', null, 100);
    expect(d0).not.toBe(d100);
  });

  it('smoothingIntensity has no effect on a straight evenly spaced line', () => {
    const d0 = generateFastStrokeSvgPath(straight, 40, 'brush', true, 'off', null, 0);
    const d100 = generateFastStrokeSvgPath(straight, 40, 'brush', true, 'off', null, 100);
    expect(d0).toBe(d100);
  });

  it('inkBleed widens the preview like finalize', () => {
    const single: StrokePoint[] = [{ x: 200, y: 300, pressure: 0.5 }];
    const plain = generateFastStrokeSvgPath(single, 40, 'brush', true, 'normal');
    const bled = generateFastStrokeSvgPath(single, 40, 'brush', true, 'normal', null, 50, {
      customPreset: { inkBleed: 100 },
    });
    // inkBleed 100 widens by 1 + 100/100 * 0.15 = 1.15, as in finalize.
    const radius = (d: string) => Number(/A ([\d.]+) \1 0 1 0/.exec(d)?.[1]);
    expect(radius(bled)).toBeCloseTo(radius(plain) * 1.15, 1);
    expect(bled).not.toBe(plain);
  });
});

describe('generateFastStrokeSvgPath (live preview pass cap)', () => {
  // A single spike keeps diffusing on every smoothing pass, so 2 passes
  // and 3 passes give different outputs (unlike a periodic zigzag, which
  // converges after one pass).
  const spike: StrokePoint[] = [
    { x: 100, y: 100, pressure: 0.5 },
    { x: 110, y: 100, pressure: 0.5 },
    { x: 120, y: 100, pressure: 0.5 },
    { x: 130, y: 130, pressure: 0.5 },
    { x: 140, y: 100, pressure: 0.5 },
    { x: 150, y: 100, pressure: 0.5 },
    { x: 160, y: 100, pressure: 0.5 },
  ];

  it('maxSmoothingPasses: 2 is a no-op at intensity 50 (already 2 passes)', () => {
    const capped = generateFastStrokeSvgPath(spike, 40, 'brush', true, 'off', null, 50, {
      maxSmoothingPasses: 2,
    });
    const plain = generateFastStrokeSvgPath(spike, 40, 'brush', true, 'off', null, 50);
    expect(capped).toBe(plain);
    expect(capped.length).toBeGreaterThan(0);
  });

  it('maxSmoothingPasses: 2 at intensity 100 equals the 2-pass result', () => {
    const capped = generateFastStrokeSvgPath(spike, 40, 'brush', true, 'off', null, 100, {
      maxSmoothingPasses: 2,
    });
    const twoPass = generateFastStrokeSvgPath(spike, 40, 'brush', true, 'off', null, 50);
    expect(capped).toBe(twoPass);
    const uncapped = generateFastStrokeSvgPath(spike, 40, 'brush', true, 'off', null, 100);
    expect(capped).not.toBe(uncapped);
    expect(capped.length).toBeGreaterThan(0);
  });

  it('auto-straight still applies with the pass cap', () => {
    const wobbly: StrokePoint[] = [
      { x: 100, y: 100, pressure: 0.5 },
      { x: 140, y: 101, pressure: 0.5 },
      { x: 180, y: 99, pressure: 0.5 },
      { x: 220, y: 100.5, pressure: 0.5 },
      { x: 260, y: 100, pressure: 0.5 },
    ];
    const capped = generateFastStrokeSvgPath(wobbly, 40, 'brush', true, 'off', null, 100, {
      maxSmoothingPasses: 2,
    });
    const withoutStraight = generateFastStrokeSvgPath(wobbly, 40, 'brush', true, 'off', null, 100, {
      disableAutoStraight: true,
      maxSmoothingPasses: 2,
    });
    expect(capped).not.toBe(withoutStraight);
  });

  it('long stroke preview output is non-empty', () => {
    const long: StrokePoint[] = Array.from({ length: 1000 }, (_, i) => ({
      x: i,
      y: 100 + Math.sin(i / 20) * 10,
      pressure: 0.5,
    }));
    const d = generateFastStrokeSvgPath(long, 40, 'brush', true, 'normal', null, 100, {
      maxSmoothingPasses: 2,
    });
    expect(d.length).toBeGreaterThan(0);
    expect(d.startsWith('M ')).toBe(true);
    expect(d.endsWith(' Z')).toBe(true);
  });
});

describe('autoStraightenStrokePoints (H7)', () => {
  it('snaps a near-straight wobbly line onto its chord', () => {
    const wobbly: StrokePoint[] = [
      { x: 100, y: 100, pressure: 0.5 },
      { x: 140, y: 101, pressure: 0.5 },
      { x: 180, y: 99, pressure: 0.5 },
      { x: 220, y: 100.5, pressure: 0.5 },
      { x: 260, y: 100, pressure: 0.5 },
    ];
    const snapped = autoStraightenStrokePoints(wobbly);
    expect(snapped).not.toBe(wobbly);
    for (let i = 1; i < snapped.length - 1; i++) {
      expect(snapped[i].y).toBeCloseTo(100, 1);
    }
    expect(snapped[0]).toEqual(wobbly[0]);
    expect(snapped[snapped.length - 1]).toEqual(wobbly[wobbly.length - 1]);
  });

  it('leaves a genuinely curved stroke alone', () => {
    const curved: StrokePoint[] = [
      { x: 100, y: 100, pressure: 0.5 },
      { x: 150, y: 50, pressure: 0.5 },
      { x: 200, y: 100, pressure: 0.5 },
      { x: 250, y: 150, pressure: 0.5 },
      { x: 300, y: 100, pressure: 0.5 },
    ];
    expect(autoStraightenStrokePoints(curved)).toBe(curved);
  });

  it('generateFastStrokeSvgPath applies auto-straight unless disabled', () => {
    const wobbly: StrokePoint[] = [
      { x: 100, y: 100, pressure: 0.5 },
      { x: 140, y: 101, pressure: 0.5 },
      { x: 180, y: 99, pressure: 0.5 },
      { x: 220, y: 100.5, pressure: 0.5 },
      { x: 260, y: 100, pressure: 0.5 },
    ];
    const withStraight = generateFastStrokeSvgPath(wobbly, 40, 'brush', true, 'off', null, 0);
    const withoutStraight = generateFastStrokeSvgPath(wobbly, 40, 'brush', true, 'off', null, 0, {
      disableAutoStraight: true,
    });
    expect(withStraight).not.toBe(withoutStraight);
  });
});
