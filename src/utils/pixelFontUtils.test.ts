import { describe, it, expect } from 'vitest';
import {
  pixelGridToContours,
  resamplePixelGrid,
  getBresenhamLine,
  getMidpointCircle,
  floodFill,
} from './pixelFontUtils';
import { contoursToOpenTypePath } from './font/paths';

function signedAreaScreen(nodes: { x: number; y: number }[]): number {
  let area = 0;
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    const b = nodes[(i + 1) % nodes.length];
    area += a.x * b.y - b.x * a.y;
  }
  return area / 2;
}

describe('pixelFontUtils', () => {
  it('converts top row (gy=0) to upper screen Y and higher OpenType font Y than bottom row', () => {
    const topGrid = new Uint8Array(4 * 4);
    topGrid[0] = 1; // top-left pixel (gy=0)

    const botGrid = new Uint8Array(4 * 4);
    botGrid[3 * 4 + 0] = 1; // bottom-left pixel (gy=3)

    const topContours = pixelGridToContours(topGrid, 4, 4, 1000, 800, -200, 1000, 'square', true);
    const botContours = pixelGridToContours(botGrid, 4, 4, 1000, 800, -200, 1000, 'square', true);

    expect(topContours).toHaveLength(1);
    expect(botContours).toHaveLength(1);

    const topScreenAvgY =
      topContours[0].nodes.reduce((sum, n) => sum + n.y, 0) / topContours[0].nodes.length;
    const botScreenAvgY =
      botContours[0].nodes.reduce((sum, n) => sum + n.y, 0) / botContours[0].nodes.length;

    // Screen coords: Y=0 is top, so top pixel has smaller screen Y
    expect(topScreenAvgY).toBeLessThan(botScreenAvgY);

    // OpenType font coords: FontY = baselineY - ScreenY, so top pixel has larger font Y
    const topPath = contoursToOpenTypePath(topContours, 800);
    const botPath = contoursToOpenTypePath(botContours, 800);
    const topBb = topPath.getBoundingBox();
    const botBb = botPath.getBoundingBox();

    expect(topBb.y1).toBeGreaterThan(botBb.y2);
  });

  it('produces exact 4-corner clockwise square contour for a single pixel without dropping start corner', () => {
    const grid = new Uint8Array(3 * 3);
    grid[1 * 3 + 1] = 1;

    const contours = pixelGridToContours(grid, 3, 3, 1000, 800, -200, 1000, 'square', true);
    expect(contours).toHaveLength(1);
    expect(contours[0].closed).toBe(true);
    expect(contours[0].nodes).toHaveLength(4);
    // In screen Y-down coordinates, clockwise outer loop has negative shoelace sum?
    // Wait: let's check signedAreaScreen((0,0)->(10,0)->(10,10)->(0,10)) = (0-0)+(100-0)+(0-0)+(0-0) > 0!
    expect(signedAreaScreen(contours[0].nodes)).toBeGreaterThan(0);
  });

  it('emits clockwise outer contour and counter-clockwise hole for a ring', () => {
    const grid = new Uint8Array([
      1, 1, 1,
      1, 0, 1,
      1, 1, 1,
    ]);

    const contours = pixelGridToContours(grid, 3, 3, 1000, 800, -200, 1000, 'square', true);
    expect(contours).toHaveLength(2);

    const areas = contours.map((c) => signedAreaScreen(c.nodes)).sort((a, b) => a - b);
    expect(areas[0]).toBeLessThan(0); // inner hole (CCW in screen space)
    expect(areas[1]).toBeGreaterThan(0); // outer loop (CW in screen space)
  });

  it('splits checkerboard diagonal pixels cleanly into 2 separate 4-node contours without figure-8 crossings', () => {
    const grid = new Uint8Array([
      1, 0,
      0, 1,
    ]);

    const contours = pixelGridToContours(grid, 2, 2, 1000, 800, -200, 1000, 'square', true);
    expect(contours).toHaveLength(2);
    for (const c of contours) {
      expect(c.nodes).toHaveLength(4);
      expect(signedAreaScreen(c.nodes)).toBeGreaterThan(0);
    }

    // Reverse diagonal (where outer loop visits saddle vertex before hole/corner)
    const gridRev = new Uint8Array([
      0, 1,
      1, 0,
    ]);
    const contoursRev = pixelGridToContours(gridRev, 2, 2, 1000, 800, -200, 1000, 'square', true);
    expect(contoursRev).toHaveLength(2);
    for (const c of contoursRev) {
      expect(c.nodes).toHaveLength(4);
      expect(signedAreaScreen(c.nodes)).toBeGreaterThan(0);
    }
  });

  it('generates closed clockwise contours for round, squircle, diamond, and unmerged square dot shapes', () => {
    const grid = new Uint8Array([1, 1, 0, 0]);

    for (const shape of ['round', 'squircle', 'diamond', 'square'] as const) {
      const contours = pixelGridToContours(grid, 2, 2, 1000, 800, -200, 1000, shape, false);
      expect(contours).toHaveLength(2);
      for (const c of contours) {
        expect(c.closed).toBe(true);
        expect(c.nodes.length).toBeGreaterThanOrEqual(4);
        expect(signedAreaScreen(c.nodes)).toBeGreaterThan(0);
      }
    }
  });

  it('resamples pixel grid cleanly with nearest-neighbor scaling', () => {
    const src = new Uint8Array([
      1, 0,
      0, 1,
    ]);
    const dst = resamplePixelGrid(src, 2, 2, 4, 4);
    expect(Array.from(dst)).toEqual([
      1, 1, 0, 0,
      1, 1, 0, 0,
      0, 0, 1, 1,
      0, 0, 1, 1,
    ]);
  });

  it('computes Bresenham line, Midpoint circle, and flood fill accurately', () => {
    const line = getBresenhamLine(0, 0, 3, 3);
    expect(line).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 2 },
      { x: 3, y: 3 },
    ]);

    const filledCircle = getMidpointCircle(5, 5, 2, true);
    expect(filledCircle.some((p) => p.x === 5 && p.y === 5)).toBe(true);

    const grid = new Uint8Array([
      0, 1, 0,
      1, 0, 1,
      0, 1, 0,
    ]);
    floodFill(grid, 3, 3, 1, 1, 0, 1);
    expect(grid[1 * 3 + 1]).toBe(1);
    expect(grid[0]).toBe(0);
  });
});
