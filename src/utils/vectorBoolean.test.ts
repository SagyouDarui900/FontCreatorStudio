import { describe, it, expect } from 'vitest';
import {
  booleanUnionContours,
  booleanSubtractContours,
  booleanIntersectContours,
  sanitizeContourNodes,
  subtractEraserStrokeVector,
} from './vectorBoolean';
import { createRectContour, createCircleContour, getContoursBoundingBox } from './pathUtils';
import { BezierNode, PathContour } from '../types';

describe('vectorBoolean - Vector Boolean Operations & Geometry Sanitation', () => {
  describe('sanitizeContourNodes', () => {
    it('returns empty or single node array as is', () => {
      expect(sanitizeContourNodes([], true)).toEqual([]);
      const singleNode: BezierNode[] = [{ id: 'n1', x: 10, y: 10, type: 'corner' }];
      expect(sanitizeContourNodes(singleNode, true)).toEqual(singleNode);
    });

    it('merges redundant micro-distance adjacent nodes (< 0.5px)', () => {
      const nodes: BezierNode[] = [
        { id: 'n1', x: 10, y: 10, type: 'corner' },
        { id: 'n2', x: 10.2, y: 10.1, type: 'corner' }, // within 0.5px of n1
        { id: 'n3', x: 100, y: 10, type: 'corner' },
      ];
      const sanitized = sanitizeContourNodes(nodes, false);
      expect(sanitized.length).toBe(2);
      expect(sanitized[0].x).toBe(10);
      expect(sanitized[1].x).toBe(100);
    });

    it('deduplicates wrap-around start and end nodes when contour is closed', () => {
      const nodes: BezierNode[] = [
        { id: 'n1', x: 0, y: 0, type: 'corner' },
        { id: 'n2', x: 100, y: 0, type: 'corner' },
        { id: 'n3', x: 100, y: 100, type: 'corner' },
        { id: 'n4', x: 0.1, y: 0.2, type: 'corner' }, // matches n1 within 0.5px
      ];
      const sanitized = sanitizeContourNodes(nodes, true);
      expect(sanitized.length).toBe(3);
    });

    it('clamps runaway wild bezier handles to prevent distorted loops', () => {
      const nodes: BezierNode[] = [
        { id: 'n1', x: 0, y: 0, handleOut: { x: 500, y: 500 }, type: 'smooth' }, // runaway handle compared to 50px distance
        { id: 'n2', x: 50, y: 0, type: 'corner' },
        { id: 'n3', x: 50, y: 50, type: 'corner' },
      ];
      const sanitized = sanitizeContourNodes(nodes, true);
      const n1 = sanitized[0];
      expect(n1.handleOut).not.toBeNull();
      if (n1.handleOut) {
        // Distance should be clamped proportionally to segment length
        const handleDist = Math.hypot(n1.handleOut.x - n1.x, n1.handleOut.y - n1.y);
        expect(handleDist).toBeLessThan(150);
      }
    });

    it('L8: clamps open contour end handles against the single adjacent segment, not the opposite end', () => {
      // Open line (0,0) - (100,0) - (200,0) with runaway handles on both ends.
      // Before the fix the first node's handleIn was clamped against the
      // wrapped-around last node (200px away, limit 300) and the last
      // node's handleOut against the first node, so both stayed at 300.
      // The only real segment next to each end is 100px, so the limit is 150.
      const nodes: BezierNode[] = [
        { id: 'n1', x: 0, y: 0, handleIn: { x: -500, y: 0 }, type: 'smooth' },
        { id: 'n2', x: 100, y: 0, type: 'corner' },
        { id: 'n3', x: 200, y: 0, handleOut: { x: 700, y: 0 }, type: 'smooth' },
      ];
      const sanitized = sanitizeContourNodes(nodes, false);
      expect(sanitized).toHaveLength(3);
      expect(sanitized[0].handleIn).not.toBeNull();
      expect(Math.hypot(sanitized[0].handleIn!.x - 0, sanitized[0].handleIn!.y - 0)).toBeCloseTo(150);
      expect(sanitized[2].handleOut).not.toBeNull();
      expect(Math.hypot(sanitized[2].handleOut!.x - 200, sanitized[2].handleOut!.y - 0)).toBeCloseTo(150);
    });
  });

  describe('booleanUnionContours (結合・融着)', () => {
    it('returns empty array when passed empty contours', () => {
      expect(booleanUnionContours([])).toEqual([]);
    });

    it('preserves single contour without self-intersections untouched', () => {
      const rect = createRectContour(100, 100, 300, 300);
      const result = booleanUnionContours([rect]);
      expect(result.length).toBe(1);
      expect(result[0].nodes.length).toBe(4);
    });

    it('merges two overlapping rectangles into a single solid contour', () => {
      // Rect 1: [100, 100] to [300, 300]
      // Rect 2: [200, 100] to [400, 300] (overlaps on x from 200 to 300)
      const rect1 = createRectContour(100, 100, 300, 300);
      const rect2 = createRectContour(200, 100, 400, 300);

      const united = booleanUnionContours([rect1, rect2]);
      expect(united.length).toBe(1);

      const bbox = getContoursBoundingBox(united);
      expect(bbox).not.toBeNull();
      if (bbox) {
        expect(Math.round(bbox.minX)).toBe(100);
        expect(Math.round(bbox.maxX)).toBe(400);
        expect(Math.round(bbox.minY)).toBe(100);
        expect(Math.round(bbox.maxY)).toBe(300);
      }
    });

    it('preserves inner holes (e.g., character "口" or donut shape)', () => {
      // Outer rect: [100, 100] to [500, 500]
      // Inner hole: [200, 200] to [400, 400]
      const outer = createRectContour(100, 100, 500, 500);
      const inner = createRectContour(200, 200, 400, 400);

      const result = booleanUnionContours([outer, inner]);
      // Should retain both outer boundary and inner cutout
      expect(result.length).toBe(2);

      const bbox = getContoursBoundingBox(result);
      expect(Math.round(bbox!.minX)).toBe(100);
      expect(Math.round(bbox!.maxX)).toBe(500);
    });

    it('H14 (item 3): keeps the island of "回" — detached island inside a hole', () => {
      // Outer [100,100]-[500,500], hole [200,200]-[400,400],
      // island [250,250]-[350,350] detached inside the hole.
      // Containment depth: outer 0 (solid), hole 1 (cut out),
      // island 2 (solid again). The island must survive the union.
      const outer = createRectContour(100, 100, 500, 500);
      const hole = createRectContour(200, 200, 400, 400);
      const island = createRectContour(250, 250, 350, 350);

      const result = booleanUnionContours([outer, hole, island]);
      expect(result.length).toBe(3);
      const bboxes = result.map((c) => getContoursBoundingBox([c])!);
      expect(bboxes.some((b) => Math.round(b.minX) === 250 && Math.round(b.maxX) === 350)).toBe(true);
    });

    it('H14 (item 3): keeps the island of "回" when it touches the hole boundary', () => {
      // Same as above, but the island shares the hole's right edge
      // (x = 400) — the touching case from the review. The island
      // fuses with the frame along the shared edge, so the union has
      // 2 contours, not 3: the outer boundary and the remaining
      // L-shaped hole. What must survive is the island's AREA:
      // filled = outer (400x400) - hole (200x200) + island (150x100)
      //       = 160000 - 40000 + 15000 = 135000.
      // (Before the fix the island vanished: filled was 120000.)
      const outer = createRectContour(100, 100, 500, 500);
      const hole = createRectContour(200, 200, 400, 400);
      const island = createRectContour(250, 250, 400, 350);

      const result = booleanUnionContours([outer, hole, island]);
      expect(result.length).toBe(2);
      const bboxes = result.map((c) => getContoursBoundingBox([c])!);
      expect(bboxes.some((b) => Math.round(b.minX) === 100 && Math.round(b.maxX) === 500)).toBe(true);
      expect(bboxes.some((b) => Math.round(b.minX) === 200 && Math.round(b.maxX) === 400)).toBe(true);

      // Even-odd point-in-fill over the resulting contour polygons.
      const isFilled = (x: number, y: number): boolean => {
        let inside = false;
        for (const c of result) {
          const pts = c.nodes;
          for (let a = 0, b = pts.length - 1; a < pts.length; b = a++) {
            const xa = pts[a].x;
            const ya = pts[a].y;
            const xb = pts[b].x;
            const yb = pts[b].y;
            if (ya > y !== yb > y && x < ((xb - xa) * (y - ya)) / (yb - ya) + xa) {
              inside = !inside;
            }
          }
        }
        return inside;
      };
      expect(isFilled(325, 300)).toBe(true); // inside the island
      expect(isFilled(150, 150)).toBe(true); // frame
      expect(isFilled(225, 225)).toBe(false); // hole, outside the island
      expect(isFilled(225, 375)).toBe(false); // hole, outside the island
    });

    it('H14 (item 3): keeps a hole inside the island (depth 3) of "回"', () => {
      // Outer [0,0]-[500,500], hole [100,100]-[400,400],
      // island [150,150]-[350,350] with its own hole [200,200]-[300,300].
      // Depths 0/1/2/3: solid / cut out / solid / cut out.
      const outer = createRectContour(0, 0, 500, 500);
      const hole = createRectContour(100, 100, 400, 400);
      const island = createRectContour(150, 150, 350, 350);
      const islandHole = createRectContour(200, 200, 300, 300);

      const result = booleanUnionContours([outer, hole, island, islandHole]);
      expect(result.length).toBe(4);
      const bboxes = result.map((c) => getContoursBoundingBox([c])!);
      expect(bboxes.some((b) => Math.round(b.minX) === 150 && Math.round(b.maxX) === 350)).toBe(true);
      expect(bboxes.some((b) => Math.round(b.minX) === 200 && Math.round(b.maxX) === 300)).toBe(true);
    });

    it('resolves self-intersecting figure-8 contour into clean outer boundary', () => {
      // Figure-8 with crossing at (150, 150)
      const figure8: PathContour = {
        id: 'fig8',
        closed: true,
        nodes: [
          { id: 'n1', x: 100, y: 100, type: 'corner' },
          { id: 'n2', x: 200, y: 200, type: 'corner' },
          { id: 'n3', x: 100, y: 200, type: 'corner' },
          { id: 'n4', x: 200, y: 100, type: 'corner' },
        ],
      };

      const result = booleanUnionContours([figure8]);
      expect(result.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('booleanSubtractContours (差分・型抜き)', () => {
    it('returns empty array when subject is empty', () => {
      const cutter = [createRectContour(0, 0, 100, 100)];
      expect(booleanSubtractContours([], cutter)).toEqual([]);
    });

    it('returns subject contours intact when cutter is empty', () => {
      const subject = [createRectContour(100, 100, 200, 200)];
      const result = booleanSubtractContours(subject, []);
      expect(result.length).toBe(1);
      expect(result[0].nodes.length).toBe(4);
    });

    it('subtracts overlapping cutter from subject (e.g. notch cut)', () => {
      // Subject: [0, 0] to [200, 200]
      // Cutter: [100, 0] to [200, 100] (top-right quadrant cut)
      const subject = [createRectContour(0, 0, 200, 200)];
      const cutter = [createRectContour(100, 0, 200, 100)];

      const result = booleanSubtractContours(subject, cutter);
      expect(result.length).toBe(1);

      // Result should be an L-shaped polygon with 6 vertices
      expect(result[0].nodes.length).toBeGreaterThanOrEqual(5);

      const bbox = getContoursBoundingBox(result);
      expect(Math.round(bbox!.minX)).toBe(0);
      expect(Math.round(bbox!.maxX)).toBe(200);
    });

    it('carves an inner hole when cutter is fully enclosed by subject', () => {
      // Subject: [0, 0] to [300, 300]
      // Cutter: [100, 100] to [200, 200]
      const subject = [createRectContour(0, 0, 300, 300)];
      const cutter = [createRectContour(100, 100, 200, 200)];

      const result = booleanSubtractContours(subject, cutter);
      // Result should contain 2 contours: outer boundary and hole cutout
      expect(result.length).toBe(2);
    });

    it('H14: keeps the hole of a ring subject when the cutter passes through the hole', () => {
      // Subject: ring (outer [0, 0]-[100, 100] with hole [40, 40]-[60, 60])
      // Cutter: vertical bar [45, 0]-[55, 100] running through the hole.
      // The bar only cuts the ring's top and bottom strips; the hole stays
      // empty, so each side keeps a notch where the hole was: 2 pieces
      // with 8 nodes each.
      // (Before the fix the hole was treated as solid fill, so the bar cut
      // the disk into 2 plain 4-node rectangles.)
      const subject = [createRectContour(0, 0, 100, 100), createRectContour(40, 40, 60, 60)];
      const cutter = [createRectContour(45, 0, 55, 100)];

      const result = booleanSubtractContours(subject, cutter);
      expect(result.length).toBe(2);
      for (const c of result) {
        expect(c.nodes.length).toBe(8);
      }
      const bboxes = result.map((c) => getContoursBoundingBox([c])!);
      expect(bboxes.some((b) => Math.round(b.minX) === 0 && Math.round(b.maxX) === 45)).toBe(true);
      expect(bboxes.some((b) => Math.round(b.minX) === 55 && Math.round(b.maxX) === 100)).toBe(true);
    });

    it('H14: keeps the hole of a ring cutter when subtracting it', () => {
      // Subject: solid [0, 0]-[100, 100]
      // Cutter: ring (outer [20, 20]-[80, 80] with hole [40, 40]-[60, 60]).
      // Subtracting the ring leaves the subject with a frame-shaped cutout,
      // but the ring's own hole area (the [40, 40]-[60, 60] square) must
      // stay filled as a separate island.
      // (Before the fix the hole was treated as solid fill, so the cutter
      // cut a solid [20, 20]-[80, 80] square and the result had 2 contours.)
      const subject = [createRectContour(0, 0, 100, 100)];
      const cutter = [createRectContour(20, 20, 80, 80), createRectContour(40, 40, 60, 60)];

      const result = booleanSubtractContours(subject, cutter);
      // Outer boundary + frame cutout + surviving island = 3 contours
      expect(result.length).toBe(3);
      const bboxes = result.map((c) => getContoursBoundingBox([c])!);
      expect(bboxes.some((b) => Math.round(b.minX) === 20 && Math.round(b.maxX) === 80)).toBe(true);
      expect(bboxes.some((b) => Math.round(b.minX) === 40 && Math.round(b.maxX) === 60)).toBe(true);
    });
  });

  describe('booleanIntersectContours (交差・共通部分)', () => {
    it('returns empty array when either input is empty', () => {
      const rect = [createRectContour(0, 0, 100, 100)];
      expect(booleanIntersectContours([], rect)).toEqual([]);
      expect(booleanIntersectContours(rect, [])).toEqual([]);
    });

    it('returns the intersection box between two overlapping shapes', () => {
      // Subject: [0, 0] to [200, 200]
      // Cutter: [100, 100] to [300, 300]
      // Overlap: [100, 100] to [200, 200]
      const subject = [createRectContour(0, 0, 200, 200)];
      const cutter = [createRectContour(100, 100, 300, 300)];

      const result = booleanIntersectContours(subject, cutter);
      expect(result.length).toBe(1);

      const bbox = getContoursBoundingBox(result);
      expect(Math.round(bbox!.minX)).toBe(100);
      expect(Math.round(bbox!.maxX)).toBe(200);
      expect(Math.round(bbox!.minY)).toBe(100);
      expect(Math.round(bbox!.maxY)).toBe(200);
    });

    it('returns empty array when two shapes do not overlap at all', () => {
      const s1 = [createRectContour(0, 0, 50, 50)];
      const s2 = [createRectContour(200, 200, 250, 250)];

      const result = booleanIntersectContours(s1, s2);
      expect(result.length).toBe(0);
    });

    it('H14: keeps the hole when intersecting with a ring subject', () => {
      // Subject: ring (outer [0, 0]-[100, 100] with hole [40, 40]-[60, 60])
      // Cutter: [30, 30]-[70, 70] covering the hole and the surrounding ring.
      // The intersection is the frame [30, 30]-[70, 70] minus the hole,
      // so the result is 2 contours (frame outer + hole).
      // (Before the fix the hole was treated as solid fill, so the result
      // was a single solid [30, 30]-[70, 70] rectangle.)
      const subject = [createRectContour(0, 0, 100, 100), createRectContour(40, 40, 60, 60)];
      const cutter = [createRectContour(30, 30, 70, 70)];

      const result = booleanIntersectContours(subject, cutter);
      expect(result.length).toBe(2);
      const bboxes = result.map((c) => getContoursBoundingBox([c])!);
      expect(bboxes.some((b) => Math.round(b.minX) === 30 && Math.round(b.maxX) === 70)).toBe(true);
      expect(bboxes.some((b) => Math.round(b.minX) === 40 && Math.round(b.maxX) === 60)).toBe(true);
    });
  });

  describe('subtractEraserStrokeVector (ベクター消しゴム)', () => {
    it('returns unchanged contours when stroke does not intersect', () => {
      const rect = createRectContour(100, 100, 200, 200);
      const strokePoints = [{ x: 500, y: 500 }, { x: 550, y: 550 }];

      const result = subtractEraserStrokeVector([rect], strokePoints, 10);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe(rect.id);
    });

    it('erases a notch across the boundary of a solid contour', () => {
      const rect = createRectContour(100, 100, 300, 300);
      // Eraser cutting right side from (280, 200) to (320, 200) with radius 15
      const strokePoints = [{ x: 280, y: 200 }, { x: 320, y: 200 }];

      const result = subtractEraserStrokeVector([rect], strokePoints, 15);
      expect(result.length).toBeGreaterThanOrEqual(1);

      // Area should be indented
      const bbox = getContoursBoundingBox(result);
      expect(bbox).not.toBeNull();
    });
  });
});
