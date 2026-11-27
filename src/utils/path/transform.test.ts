import { describe, it, expect } from 'vitest';
import {
  transformContoursForPlacement,
  flipSingleContourH,
  flipSingleContourV,
  adjustContoursWeight,
} from './transform';
import { interpolateContours } from './stroke_modules/straightAndExpand';
import {
  getContoursBoundingBox,
  contoursHaveFiniteCoordinates,
  getContourSignedArea,
} from './bounds';
import { PathContour } from '../../types';

function rectContour(minX: number, minY: number, maxX: number, maxY: number): PathContour {
  return {
    id: 'test-rect',
    closed: true,
    nodes: [
      { id: 'n1', x: minX, y: minY, handleIn: null, handleOut: null, type: 'corner' },
      { id: 'n2', x: maxX, y: minY, handleIn: null, handleOut: null, type: 'corner' },
      { id: 'n3', x: maxX, y: maxY, handleIn: null, handleOut: null, type: 'corner' },
      { id: 'n4', x: minX, y: maxY, handleIn: null, handleOut: null, type: 'corner' },
    ],
  };
}

describe('transformContoursForPlacement', () => {
  const square = [rectContour(100, 100, 900, 900)];

  it('auto with category other defaults to hen (left side), not full size', () => {
    const placed = transformContoursForPlacement(square, 'auto', 'other');
    const bbox = getContoursBoundingBox(placed);
    expect(bbox.minX).toBe(80);
    expect(bbox.width).toBe(380);
    expect(bbox.maxY).toBeLessThanOrEqual(800);
  });

  it('auto with stroke, geometric, kana, basic, all, or no category defaults to hen', () => {
    for (const category of ['stroke', 'geometric', 'kana', 'basic', 'all', undefined]) {
      const placed = transformContoursForPlacement(square, 'auto', category);
      const bbox = getContoursBoundingBox(placed);
      expect(bbox.minX).toBe(80);
      expect(bbox.width).toBe(380);
    }
  });

  it('auto with a placement category uses that placement', () => {
    const placed = transformContoursForPlacement(square, 'auto', 'tsukuri');
    const bbox = getContoursBoundingBox(placed);
    expect(bbox.minX).toBe(450);
    expect(bbox.width).toBe(490);
  });

  it('original returns contours unchanged', () => {
    const placed = transformContoursForPlacement(square, 'original');
    expect(getContoursBoundingBox(placed)).toEqual(getContoursBoundingBox(square));
  });

  it('full is treated as original and returns contours unchanged', () => {
    const placed = transformContoursForPlacement(square, 'full' as never);
    expect(getContoursBoundingBox(placed)).toEqual(getContoursBoundingBox(square));
  });

  it('ashi, nyo, kamae, and tare never extend below the default baseline of 800', () => {
    for (const placement of ['ashi', 'nyo', 'kamae', 'tare'] as const) {
      const placed = transformContoursForPlacement(square, placement);
      const bbox = getContoursBoundingBox(placed);
      expect(bbox.maxY).toBeLessThanOrEqual(800);
    }
  });

  it('ashi respects a custom baseline', () => {
    const placed = transformContoursForPlacement(square, 'ashi', undefined, { baselineY: 700 });
    const bbox = getContoursBoundingBox(placed);
    expect(bbox.maxY).toBeLessThanOrEqual(700);
    expect(bbox.maxY).toBe(700);
  });

  it('ashi may extend further when the baseline is higher', () => {
    const placed = transformContoursForPlacement(square, 'ashi', undefined, { baselineY: 900 });
    const bbox = getContoursBoundingBox(placed);
    expect(bbox.maxY).toBeLessThanOrEqual(900);
    expect(bbox.maxY).toBe(860);
  });

  it('scales the target box for 2048 UPM instead of placing at 1000 coordinates', () => {
    // A 1600x1600 square in 2048 space (200..1800) with the 2048 baseline.
    const square2048 = [rectContour(200, 200, 1800, 1800)];
    const placed = transformContoursForPlacement(square2048, 'hen', undefined, {
      baselineY: 1638,
      unitsPerEm: 2048,
    });
    const bbox = getContoursBoundingBox(placed);
    // hen box scaled by 2048/1000: x 80 -> 163.84, width 380 -> 778.24.
    expect(bbox.minX).toBeCloseTo(163.84, 2);
    expect(bbox.width).toBeCloseTo(778.24, 2);
    expect(bbox.maxY).toBeLessThanOrEqual(1638);
  });

  it('ashi at 2048 UPM ends exactly at the scaled baseline', () => {
    const square2048 = [rectContour(200, 200, 1800, 1800)];
    const placed = transformContoursForPlacement(square2048, 'ashi', undefined, {
      baselineY: 1638,
      unitsPerEm: 2048,
    });
    const bbox = getContoursBoundingBox(placed);
    expect(bbox.maxY).toBeCloseTo(1638, 2);
  });

  it('invalid unitsPerEm falls back to the 1000 UPM boxes', () => {
    for (const unitsPerEm of [0, -1000, NaN, undefined]) {
      const placed = transformContoursForPlacement(square, 'hen', undefined, { unitsPerEm });
      const bbox = getContoursBoundingBox(placed);
      expect(bbox.minX).toBe(80);
      expect(bbox.width).toBe(380);
    }
  });
});

describe('getContoursBoundingBox', () => {
  it('ignores non-finite coordinates instead of returning NaN', () => {
    const contours: PathContour[] = [
      {
        id: 'mixed',
        closed: true,
        nodes: [
          { id: 'a', x: 100, y: 100, handleIn: null, handleOut: null, type: 'corner' },
          { id: 'b', x: NaN, y: 200, handleIn: null, handleOut: null, type: 'corner' },
          { id: 'c', x: 300, y: 400, handleIn: null, handleOut: null, type: 'corner' },
        ],
      },
    ];
    const bbox = getContoursBoundingBox(contours);
    expect(bbox.minX).toBe(100);
    expect(bbox.maxX).toBe(300);
    expect(bbox.maxY).toBe(400);
    expect(Number.isFinite(bbox.width)).toBe(true);
  });
});

describe('contoursHaveFiniteCoordinates', () => {
  it('returns true for finite contours and false when a node or handle is not finite', () => {
    const valid = [rectContour(0, 0, 100, 100)];
    expect(contoursHaveFiniteCoordinates(valid)).toBe(true);

    const badNode: PathContour[] = [
      {
        id: 'bad',
        closed: true,
        nodes: [{ id: 'a', x: Infinity, y: 0, handleIn: null, handleOut: null, type: 'corner' }],
      },
    ];
    expect(contoursHaveFiniteCoordinates(badNode)).toBe(false);

    const badHandle: PathContour[] = [
      {
        id: 'bad',
        closed: true,
        nodes: [
          { id: 'a', x: 0, y: 0, handleIn: { x: NaN, y: 0 }, handleOut: null, type: 'corner' },
        ],
      },
    ];
    expect(contoursHaveFiniteCoordinates(badHandle)).toBe(false);
    expect(contoursHaveFiniteCoordinates([])).toBe(false);
  });
});

describe('flipSingleContourH / flipSingleContourV winding preservation', () => {
  it('preserves signed area sign on horizontal and vertical single-contour flips', () => {
    const contour = rectContour(100, 200, 400, 600);
    const originalArea = getContourSignedArea(contour);
    expect(originalArea).not.toBe(0);

    const flippedH = flipSingleContourH(contour);
    expect(Math.sign(getContourSignedArea(flippedH))).toBe(Math.sign(originalArea));
    expect(getContoursBoundingBox([flippedH])).toEqual(getContoursBoundingBox([contour]));

    const flippedV = flipSingleContourV(contour);
    expect(Math.sign(getContourSignedArea(flippedV))).toBe(Math.sign(originalArea));
    expect(getContoursBoundingBox([flippedV])).toEqual(getContoursBoundingBox([contour]));
  });
});

describe('adjustContoursWeight Bezier handle scaling & inversion guard', () => {
  it('scales relative Bezier handles proportionally to segment chord growth when bolding', () => {
    const circleLike: PathContour = {
      id: 'circle',
      closed: true,
      nodes: [
        { id: 'n0', x: 500, y: 300, handleIn: { x: 390, y: 300 }, handleOut: { x: 610, y: 300 }, type: 'smooth' },
        { id: 'n1', x: 700, y: 500, handleIn: { x: 700, y: 390 }, handleOut: { x: 700, y: 610 }, type: 'smooth' },
        { id: 'n2', x: 500, y: 700, handleIn: { x: 610, y: 700 }, handleOut: { x: 390, y: 700 }, type: 'smooth' },
        { id: 'n3', x: 300, y: 500, handleIn: { x: 300, y: 610 }, handleOut: { x: 300, y: 390 }, type: 'smooth' },
      ],
    };

    const bolded = adjustContoursWeight([circleLike], 60);
    const topNode = bolded[0].nodes[0];
    // Original relative handleOut.x - node.x was 110; because radius grew from 200 to 260 (1.3x),
    // the handle length should expand above 110 rather than staying fixed at 110.
    expect(topNode.handleOut!.x - topNode.x).toBeGreaterThan(125);
    expect(topNode.x - topNode.handleIn!.x).toBeGreaterThan(125);

    const slimmed = adjustContoursWeight([circleLike], -50);
    const slimTop = slimmed[0].nodes[0];
    expect(slimTop.handleOut!.x - slimTop.x).toBeLessThan(95);
  });

  it('prevents winding inversion and shape collapse on extreme negative thinning', () => {
    const smallRect = rectContour(400, 400, 600, 600); // 200x200
    const origSign = Math.sign(getContourSignedArea(smallRect));
    const thinned = adjustContoursWeight([smallRect], -180);

    const newArea = getContourSignedArea(thinned[0]);
    expect(Math.sign(newArea)).toBe(origSign);
    const bbox = getContoursBoundingBox(thinned);
    expect(bbox.width).toBeGreaterThanOrEqual(2);
    expect(bbox.height).toBeGreaterThanOrEqual(2);
  });
});

describe('interpolateContours clone isolation', () => {
  it('returns fresh cloned contours at t=0, t=1, and mismatched contour counts without aliasing inputs', () => {
    const masterA = [rectContour(100, 100, 400, 400)];
    const masterB = [rectContour(200, 200, 700, 700)];
    const masterBExtra = [rectContour(200, 200, 700, 700), rectContour(300, 300, 500, 500)];

    const atZero = interpolateContours(masterA, masterB, 0);
    expect(atZero).not.toBe(masterA);
    expect(atZero[0]).not.toBe(masterA[0]);
    expect(atZero[0].nodes[0]).not.toBe(masterA[0].nodes[0]);
    atZero[0].nodes[0].x = 9999;
    expect(masterA[0].nodes[0].x).toBe(100);

    const atOne = interpolateContours(masterA, masterB, 1);
    expect(atOne[0]).not.toBe(masterB[0]);
    atOne[0].nodes[0].x = 8888;
    expect(masterB[0].nodes[0].x).toBe(200);

    const mismatched = interpolateContours(masterA, masterBExtra, 0.2);
    expect(mismatched[0]).not.toBe(masterA[0]);
    mismatched[0].nodes[0].x = 7777;
    expect(masterA[0].nodes[0].x).toBe(100);
  });
});
