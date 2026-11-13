import { describe, it, expect } from 'vitest';
import {
  quadraticToCubic,
  cubicToQuadratics,
  convertContourToQuadratic,
  convertContourToCubic,
  splitCubicAtHalf,
} from './bezierConversion';
import { PathContour } from '../types';

describe('bezierConversion', () => {
  it('correctly elevates quadratic bezier to cubic with zero error', () => {
    const p0 = { x: 0, y: 0 };
    const q = { x: 50, y: 100 };
    const p2 = { x: 100, y: 0 };

    const { c1, c2 } = quadraticToCubic(p0, q, p2);

    // C1 = P0 + 2/3 (Q - P0) = (33.333, 66.666)
    expect(c1.x).toBeCloseTo(33.333, 2);
    expect(c1.y).toBeCloseTo(66.667, 2);

    // C2 = P2 + 2/3 (Q - P2) = (66.667, 66.667)
    expect(c2.x).toBeCloseTo(66.667, 2);
    expect(c2.y).toBeCloseTo(66.667, 2);
  });

  it('correctly splits cubic bezier at t = 0.5 via De Casteljau algorithm', () => {
    const p0 = { x: 0, y: 0 };
    const c1 = { x: 0, y: 100 };
    const c2 = { x: 100, y: 100 };
    const p3 = { x: 100, y: 0 };

    const [left, right] = splitCubicAtHalf(p0, c1, c2, p3);

    // Midpoint at t=0.5: x=50, y=75
    expect(left.p3.x).toBeCloseTo(50, 1);
    expect(left.p3.y).toBeCloseTo(75, 1);
    expect(right.p0.x).toBeCloseTo(50, 1);
    expect(right.p0.y).toBeCloseTo(75, 1);
  });

  it('approximates cubic bezier into a sequence of quadratics', () => {
    const p0 = { x: 0, y: 0 };
    const c1 = { x: 10, y: 80 };
    const c2 = { x: 90, y: 80 };
    const p3 = { x: 100, y: 0 };

    const quads = cubicToQuadratics(p0, c1, c2, p3, 2.0);
    expect(quads.length).toBeGreaterThanOrEqual(1);

    // First quad starts at p0, last ends at p3
    expect(quads[0].p0.x).toBe(0);
    expect(quads[quads.length - 1].p2.x).toBe(100);
  });

  it('converts an entire PathContour to TrueType quadratic representation', () => {
    const contour: PathContour = {
      id: 'contour-1',
      closed: true,
      nodes: [
        { id: 'n1', x: 0, y: 0, handleOut: { x: 0, y: 50 } },
        { id: 'n2', x: 100, y: 50, handleIn: { x: 50, y: 50 } },
        { id: 'n3', x: 100, y: 0 },
      ],
    };

    const quadContour = convertContourToQuadratic(contour, 1.5);
    expect(quadContour.closed).toBe(true);
    expect(quadContour.nodes.length).toBeGreaterThanOrEqual(3);
  });

  it('reduces subdivided smooth nodes back into cubic curves', () => {
    const smoothCurve: PathContour = {
      id: 'contour-2',
      closed: false,
      nodes: [
        { id: 'n1', x: 0, y: 0, handleOut: { x: 0, y: 80 } },
        { id: 'n2', x: 200, y: 0, handleIn: { x: 200, y: 80 } },
      ],
    };

    const quadSubdivided = convertContourToQuadratic(smoothCurve, 0.5);
    expect(quadSubdivided.nodes.length).toBeGreaterThan(2);

    const mergedCubic = convertContourToCubic(quadSubdivided, 2.0);
    expect(mergedCubic.nodes.length).toBeLessThan(quadSubdivided.nodes.length);
  });
});
