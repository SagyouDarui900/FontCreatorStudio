import { describe, it, expect } from 'vitest';
import { strokePointsToOutline } from './stroke_modules/outlineSubdivided';
import type { StrokePoint, PathContour, UserPenPreset } from '../../types';

function makeLinePoints(): StrokePoint[] {
  const pts: StrokePoint[] = [];
  for (let i = 0; i <= 20; i++) {
    pts.push({
      x: 100 + i * 20,
      y: 500,
      pressure: 0.2 + (i / 20) * 0.8,
      time: i * 16,
      pointerType: 'pen',
    });
  }
  return pts;
}

function bboxHeight(contour: PathContour): number {
  const ys = contour.nodes.map((n) => n.y);
  return Math.max(...ys) - Math.min(...ys);
}

function basePreset(overrides: Partial<UserPenPreset>): UserPenPreset {
  return {
    id: 'test-preset',
    name: 'test',
    isCustom: true,
    brushStyle: 'brush',
    brushWidth: 40,
    pressureSensitivity: 'high',
    autoSmoothBrush: true,
    smoothStrength: 'standard',
    smoothPreserveCorners: true,
    autoUnionBrush: true,
    ...overrides,
  };
}

describe('strokePointsToOutline - extended preset fields', () => {
  it('inkBleed widens the outline', () => {
    const pts = makeLinePoints();
    const plain = strokePointsToOutline(pts, 40, 'brush', true, 'high', undefined, 50, {
      customPreset: basePreset({}),
    });
    const bled = strokePointsToOutline(pts, 40, 'brush', true, 'high', undefined, 50, {
      customPreset: basePreset({ inkBleed: 100 }),
    });
    expect(bboxHeight(bled)).toBeGreaterThan(bboxHeight(plain));
  });

  it('constantWidth keeps the outline width uniform despite pressure change', () => {
    const pts = makeLinePoints();
    const varied = strokePointsToOutline(pts, 40, 'brush', true, 'high', undefined, 50, {
      customPreset: basePreset({}),
    });
    const uniform = strokePointsToOutline(pts, 40, 'brush', true, 'high', undefined, 50, {
      customPreset: basePreset({ constantWidth: true }),
    });
    expect(bboxHeight(uniform)).toBeLessThan(bboxHeight(varied));
    expect(bboxHeight(uniform)).toBeGreaterThan(30);
  });

  it('axisSlant shears the outline', () => {
    const pts = makeLinePoints();
    const plain = strokePointsToOutline(pts, 40, 'brush', true, 'high', undefined, 50, {
      customPreset: basePreset({}),
    });
    const slanted = strokePointsToOutline(pts, 40, 'brush', true, 'high', undefined, 50, {
      customPreset: basePreset({ axisSlant: 30 }),
    });
    const plainXs = plain.nodes.map((n) => n.x);
    const slantedXs = slanted.nodes.map((n) => n.x);
    expect(Math.max(...slantedXs) - Math.min(...slantedXs)).not.toBeCloseTo(
      Math.max(...plainXs) - Math.min(...plainXs),
      0
    );
  });
});
