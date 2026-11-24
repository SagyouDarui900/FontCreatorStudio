import { describe, it, expect } from 'vitest';
import {
  interpolateContours,
  straightenWobblyContour,
} from './straightAndExpand';
import { PathContour } from '../../../types';

describe('interpolateContours with open contours (M21)', () => {
  it('rebuilds smooth handles for open contours with unequal node counts instead of a corner polyline', () => {
    // Two open masters of the same upward bulge, with different node counts
    // (2 vs 3), so the resample fallback runs.
    const arcA: PathContour = {
      id: 'arc-a',
      closed: false,
      nodes: [
        { id: 'a0', x: 0, y: 0, handleIn: null, handleOut: { x: 0, y: 150 }, type: 'smooth' },
        { id: 'a1', x: 200, y: 0, handleIn: { x: 200, y: 150 }, handleOut: null, type: 'smooth' },
      ],
    };
    const arcB: PathContour = {
      id: 'arc-b',
      closed: false,
      nodes: [
        { id: 'b0', x: 0, y: 0, handleIn: null, handleOut: { x: 0, y: 150 }, type: 'smooth' },
        { id: 'b1', x: 100, y: 112, handleIn: { x: 50, y: 112 }, handleOut: { x: 150, y: 112 }, type: 'smooth' },
        { id: 'b2', x: 200, y: 0, handleIn: { x: 200, y: 150 }, handleOut: null, type: 'smooth' },
      ],
    };

    const result = interpolateContours([arcA], [arcB], 0.5);
    expect(result).toHaveLength(1);
    expect(result[0].closed).toBe(false);

    const nodes = result[0].nodes;
    expect(nodes.length).toBeGreaterThanOrEqual(24);
    // Before the fix every node was type 'corner' with no handles at all.
    const smoothNodes = nodes.filter(
      (n) => n.type === 'smooth' && (n.handleIn !== null || n.handleOut !== null)
    );
    expect(smoothNodes.length).toBeGreaterThan(0);
    // The ends keep a single handle on their one real segment.
    expect(nodes[0].handleIn).toBeNull();
    expect(nodes[0].handleOut).not.toBeNull();
    expect(nodes[nodes.length - 1].handleOut).toBeNull();
    expect(nodes[nodes.length - 1].handleIn).not.toBeNull();
  });
});

describe('straightenWobblyContour with open contours (L8)', () => {
  it('leaves the end nodes of an open contour untouched instead of straightening them against the opposite end', () => {
    // The first node (0,0) deviates ~21.7 from the chord between the last
    // node (150,50) and the second node (50,0.5), which is below the
    // default threshold 24: before the fix it was moved to (10,-19).
    const open: PathContour = {
      id: 'open',
      closed: false,
      nodes: [
        { id: 'n0', x: 0, y: 0, type: 'corner' },
        { id: 'n1', x: 50, y: 0.5, type: 'corner' },
        { id: 'n2', x: 100, y: 0, type: 'corner' },
        { id: 'n3', x: 150, y: 50, type: 'corner' },
      ],
    };

    const result = straightenWobblyContour(open);
    expect(result.nodes).toHaveLength(4);
    expect(result.nodes[0].x).toBe(0);
    expect(result.nodes[0].y).toBe(0);
    expect(result.nodes[3].x).toBe(150);
    expect(result.nodes[3].y).toBe(50);
    // Interior near-collinear nodes are still straightened against their
    // real neighbours.
    expect(result.nodes[1].y).toBe(0);
  });
});
