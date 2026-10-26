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
