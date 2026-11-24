import { describe, it, expect } from 'vitest';
import { traceClosedBoundaryLoops, pointsToBezierContourNodes } from './imageVectorizer';
import { Point } from '../types';

describe('traceClosedBoundaryLoops (M22)', () => {
  it('keeps loops that return to their start point and drops walks that dead-end', () => {
    const edgeMap = new Map<string, Point[]>();
    // Dead-end walk: (0,0) -> (1,0) -> (2,0), then no outgoing edge.
    // Before the fix this was adopted as a closed contour and its start
    // and end were joined by a spurious straight edge.
    edgeMap.set('0,0', [{ x: 1, y: 0 }]);
    edgeMap.set('1,0', [{ x: 2, y: 0 }]);
    // Closed square loop
    edgeMap.set('10,10', [{ x: 11, y: 10 }]);
    edgeMap.set('11,10', [{ x: 11, y: 11 }]);
    edgeMap.set('11,11', [{ x: 10, y: 11 }]);
    edgeMap.set('10,11', [{ x: 10, y: 10 }]);

    const loops = traceClosedBoundaryLoops(edgeMap, 20, 20, 2);
    expect(loops).toHaveLength(1);
    expect(loops[0][0]).toEqual({ x: 10, y: 10 });
    expect(loops[0][loops[0].length - 1]).toEqual({ x: 10, y: 10 });
  });

  it('drops short closed loops below minArea', () => {
    const edgeMap = new Map<string, Point[]>();
    edgeMap.set('5,5', [{ x: 6, y: 5 }]);
    edgeMap.set('6,5', [{ x: 5, y: 5 }]);

    const loops = traceClosedBoundaryLoops(edgeMap, 20, 20, 8);
    expect(loops).toHaveLength(0);
  });
});

describe('pointsToBezierContourNodes with open contours (M21)', () => {
  it('gives open contour ends a single handle along their one real segment', () => {
    // 9 points on a half-circle arc, 22.5 degrees apart
    const pts: Point[] = [];
    for (let k = 0; k <= 8; k++) {
      const a = Math.PI - (k * Math.PI) / 8;
      pts.push({ x: Math.round(100 + 100 * Math.cos(a)), y: Math.round(100 - 100 * Math.sin(a)) });
    }

    const nodes = pointsToBezierContourNodes(pts, false);
    expect(nodes).toHaveLength(9);
    // First node: only the outgoing segment exists
    expect(nodes[0].handleIn).toBeNull();
    expect(nodes[0].handleOut).not.toBeNull();
    // Last node: only the incoming segment exists
    expect(nodes[8].handleOut).toBeNull();
    expect(nodes[8].handleIn).not.toBeNull();
    // Interior nodes on the arc get smooth handles
    const smoothInterior = nodes.slice(1, 8).filter((n) => n.type === 'smooth');
    expect(smoothInterior.length).toBeGreaterThan(0);
  });

  it('keeps the closed default behaviour (wrap-around neighbours)', () => {
    const pts: Point[] = [];
    for (let k = 0; k <= 8; k++) {
      const a = Math.PI - (k * Math.PI) / 8;
      pts.push({ x: Math.round(100 + 100 * Math.cos(a)), y: Math.round(100 - 100 * Math.sin(a)) });
    }

    const nodes = pointsToBezierContourNodes(pts);
    expect(nodes).toHaveLength(9);
  });
});
