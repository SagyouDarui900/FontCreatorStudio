import { describe, it, expect } from 'vitest';
import { PathContour } from '../../types';
import { alignContours, distributeContours, setContourExactDimensions } from './alignment';

describe('Geometry Alignment & Distribution', () => {
  const contourA: PathContour = {
    id: 'contour-a',
    closed: true,
    nodes: [
      { id: 'a1', x: 100, y: 100, type: 'corner' },
      { id: 'a2', x: 200, y: 100, type: 'corner' },
      { id: 'a3', x: 200, y: 200, type: 'corner' },
      { id: 'a4', x: 100, y: 200, type: 'corner' },
    ],
  };

  const contourB: PathContour = {
    id: 'contour-b',
    closed: true,
    nodes: [
      { id: 'b1', x: 400, y: 300, type: 'corner' },
      { id: 'b2', x: 500, y: 300, type: 'corner' },
      { id: 'b3', x: 500, y: 400, type: 'corner' },
      { id: 'b4', x: 400, y: 400, type: 'corner' },
    ],
  };

  it('aligns contours to left boundary', () => {
    const aligned = alignContours([contourA, contourB], ['contour-a', 'contour-b'], 'left');
    expect(aligned[0].nodes[0].x).toBe(100);
    // B was at 400, min is 100, so B should shift left by 300
    expect(aligned[1].nodes[0].x).toBe(100);
    expect(aligned[1].nodes[1].x).toBe(200);
  });

  it('aligns contours to horizontal center', () => {
    const aligned = alignContours([contourA, contourB], ['contour-a', 'contour-b'], 'centerH');
    // Common box: minX 100, maxX 500 -> midX = 300
    // A width is 100, center is 150 -> shift +150 to center 300 -> minX 250
    expect(aligned[0].nodes[0].x).toBe(250);
    // B width is 100, center is 450 -> shift -150 to center 300 -> minX 250
    expect(aligned[1].nodes[0].x).toBe(250);
  });

  it('distributes 3 contours equally along horizontal axis', () => {
    const contourC: PathContour = {
      id: 'contour-c',
      closed: true,
      nodes: [
        { id: 'c1', x: 250, y: 100, type: 'corner' },
        { id: 'c2', x: 350, y: 100, type: 'corner' },
        { id: 'c3', x: 350, y: 200, type: 'corner' },
        { id: 'c4', x: 250, y: 200, type: 'corner' },
      ],
    };

    const distributed = distributeContours([contourA, contourC, contourB], ['contour-a', 'contour-b', 'contour-c'], 'horizontal');
    // First contour stays at 100
    const first = distributed.find((c) => c.id === 'contour-a')!;
    const last = distributed.find((c) => c.id === 'contour-b')!;
    const mid = distributed.find((c) => c.id === 'contour-c')!;

    expect(first.nodes[0].x).toBe(100);
    expect(last.nodes[0].x).toBe(400);
    // Total gap = (400 - 100 - (100 + 100 + 100)) = 0 spacing?
    // Span: 100 to 500 = 400. Sum of widths = 100+100+100 = 300. Gap space = 100 / 2 = 50.
    // So mid should start at 100 + 100 + 50 = 250.
    expect(mid.nodes[0].x).toBe(250);
  });

  it('resizes contour to exact dimensions', () => {
    const resized = setContourExactDimensions(contourA, 300, 400, false);
    // Original was width 100, height 100 (100..200, 100..200). Center was (150, 150).
    // New width 300 -> minX 0, maxX 300. New height 400 -> minY -50, maxY 350.
    const xs = resized.nodes.map((n) => n.x);
    const ys = resized.nodes.map((n) => n.y);
    expect(Math.max(...xs) - Math.min(...xs)).toBe(300);
    expect(Math.max(...ys) - Math.min(...ys)).toBe(400);
  });
});
