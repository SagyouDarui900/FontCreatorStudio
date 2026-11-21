import { describe, it, expect } from 'vitest';
import { hasContourIntersections } from './booleanOperations';
import type { PathContour } from '../../types';

function contour(id: string, closed: boolean, points: [number, number][]): PathContour {
  return {
    id,
    closed,
    nodes: points.map(([x, y], i) => ({
      id: `n${i + 1}`,
      x,
      y,
      type: 'corner' as const,
    })),
  };
}

describe('hasContourIntersections', () => {
  it('detects an open contour whose end returns to its start segment', () => {
    // Open contour: the last segment ends where the first segment starts.
    // The first/last pair is adjacent only for closed contours, so this
    // must be reported as a self-intersection.
    const loop = contour('open-loop', false, [
      [100, 100],
      [300, 100],
      [300, 300],
      [100, 300],
      [100, 100],
    ]);
    expect(hasContourIntersections([loop])).toBe(true);
  });

  it('does not report a closed rectangle as self-intersecting', () => {
    const rect = contour('rect', true, [
      [100, 100],
      [300, 100],
      [300, 300],
      [100, 300],
    ]);
    expect(hasContourIntersections([rect])).toBe(false);
  });

  it('does not report a plain open polyline as self-intersecting', () => {
    const line = contour('line', false, [
      [100, 100],
      [300, 100],
      [300, 300],
    ]);
    expect(hasContourIntersections([line])).toBe(false);
  });
});
