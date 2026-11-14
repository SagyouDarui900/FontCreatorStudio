import { describe, it, expect } from 'vitest';
import { snapSinglePoint, snapContourMovement } from './snapOperations';
import { GridSettings } from '../../types';

const baseGridSettings: GridSettings = {
  showGrid: true,
  gridSize: 128,
  snapToGrid: true,
  snapToPoints: false,
  snapToGuides: false,
  showMetrics: false,
  showPoints: true,
  showHandles: true,
  japaneseGuide: 'none',
  showBodyFrame: false,
  showKanaFrame: false,
};

describe('center-aligned grid snapping', () => {
  it('snaps points relative to canvas center (upm / 2) for non-divisor grid sizes', () => {
    const metrics = { lsb: 100, advanceWidth: 900, descender: 1000 };

    // Center itself (500, 500) must always be a grid intersection
    const centerSnap = snapSinglePoint({ x: 503, y: 497 }, [], metrics, [], 8, baseGridSettings);
    expect(centerSnap.point).toEqual({ x: 500, y: 500 });

    // Adjacent grid lines around center for gridSize=128 are 500 - 128 = 372 and 500 + 128 = 628
    const aroundSnap = snapSinglePoint({ x: 375, y: 625 }, [], metrics, [], 8, baseGridSettings);
    expect(aroundSnap.point).toEqual({ x: 372, y: 628 });
  });

  it('keeps standard multiples aligned for divisor grid sizes (e.g. 50 on 1000 UPM)', () => {
    const metrics = { lsb: 100, advanceWidth: 900, descender: 1000 };
    const settings50: GridSettings = { ...baseGridSettings, gridSize: 50 };

    const res = snapSinglePoint({ x: 148, y: 803 }, [], metrics, [], 8, settings50);
    expect(res.point).toEqual({ x: 150, y: 800 });
  });

  it('snaps contour movement to center-aligned grid lines', () => {
    const metrics = { lsb: 100, advanceWidth: 900, descender: 1000 };
    const initialBBox = { minX: 400, minY: 400, maxX: 500, maxY: 500, centerX: 450, centerY: 450 };

    // Moving by (+53, -47) moves center from (450, 450) to (503, 403), and maxX/maxY to (553, 453)
    //Wait: maxX=500 + dx=125 => 625 (near 628), minY=400 - 25 => 375 (near 372)
    const res = snapContourMovement(initialBBox, 125, -25, [], metrics, [], 10, undefined, baseGridSettings);
    expect(res.dx).toBe(128); // maxX 500 + 128 = 628
    expect(res.dy).toBe(-28); // minY 400 - 28 = 372
  });
});
