import { describe, it, expect } from 'vitest';
import { PathContour } from '../../types';
import { hitTestContours, hitTestContour, isPointInPolygon } from './canvasHitTest';

function squareContour(id: string, x: number, y: number, size: number): PathContour {
  return {
    id,
    closed: true,
    nodes: [
      { id: `${id}-n1`, x, y, type: 'corner' },
      { id: `${id}-n2`, x: x + size, y, type: 'corner' },
      { id: `${id}-n3`, x: x + size, y: y + size, type: 'corner' },
      { id: `${id}-n4`, x, y: y + size, type: 'corner' },
    ],
  };
}

describe('hitTestContours', () => {
  it('returns the contour id for a point inside a closed contour', () => {
    const contours = [squareContour('a', 100, 100, 200)];
    expect(hitTestContours(contours, { x: 150, y: 150 })).toBe('a');
  });

  it('returns null for a point outside every contour', () => {
    const contours = [squareContour('a', 100, 100, 200)];
    expect(hitTestContours(contours, { x: 50, y: 50 })).toBeNull();
  });

  it('returns null when there are no contours', () => {
    expect(hitTestContours([], { x: 150, y: 150 })).toBeNull();
  });

  it('returns the topmost contour when contours overlap', () => {
    const contours = [
      squareContour('bottom', 100, 100, 200),
      squareContour('top', 150, 150, 200),
    ];
    expect(hitTestContours(contours, { x: 200, y: 200 })).toBe('top');
    expect(hitTestContours(contours, { x: 120, y: 120 })).toBe('bottom');
  });

  it('hits a point near the outline of a closed contour', () => {
    const contours = [squareContour('a', 100, 100, 200)];
    // Just outside the top edge, within the default stroke tolerance.
    expect(hitTestContour(contours[0], { x: 200, y: 95 })).toBe(true);
    expect(hitTestContour(contours[0], { x: 200, y: 50 })).toBe(false);
  });

  it('hits an open contour only near its segments', () => {
    const open: PathContour = {
      id: 'line',
      closed: false,
      nodes: [
        { id: 'l1', x: 100, y: 100, type: 'corner' },
        { id: 'l2', x: 300, y: 100, type: 'corner' },
      ],
    };
    expect(hitTestContour(open, { x: 200, y: 104 })).toBe(true);
    expect(hitTestContour(open, { x: 200, y: 150 })).toBe(false);
  });
});

describe('isPointInPolygon', () => {
  it('classifies inside and outside points', () => {
    const square = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    expect(isPointInPolygon({ x: 5, y: 5 }, square)).toBe(true);
    expect(isPointInPolygon({ x: 15, y: 5 }, square)).toBe(false);
  });
});
