import { describe, it, expect } from 'vitest';
import { batchGenerateSmallKana } from './kanaHelper';
import { adjustContoursWeight, createSmallKanaContours } from './path/transform';
import { interpolateContours } from './path/stroke_modules/straightAndExpand';
import { getContourSignedArea, getContoursBoundingBox } from './path/bounds';
import { GlyphData, PathContour } from '../types';

function makeRectContour(
  id: string,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  clockwise = true
): PathContour {
  const pts = clockwise
    ? [
        [minX, minY],
        [maxX, minY],
        [maxX, maxY],
        [minX, maxY],
      ]
    : [
        [minX, minY],
        [minX, maxY],
        [maxX, maxY],
        [maxX, minY],
      ];
  return {
    id,
    closed: true,
    nodes: pts.map(([x, y], idx) => ({
      id: `${id}-n${idx}`,
      x,
      y,
      handleIn: null,
      handleOut: null,
      type: 'corner' as const,
    })),
  };
}

describe('adjustContoursWeight & createSmallKanaContours', () => {
  it('expands both CW and CCW single outer contours when delta > 0', () => {
    const cw = [makeRectContour('cw', 200, 200, 800, 800, true)];
    const ccw = [makeRectContour('ccw', 200, 200, 800, 800, false)];

    const cwBoxBefore = getContoursBoundingBox(cw);
    const cwBoxAfter = getContoursBoundingBox(adjustContoursWeight(cw, 10));
    expect(cwBoxAfter.width).toBeGreaterThan(cwBoxBefore.width);
    expect(cwBoxAfter.height).toBeGreaterThan(cwBoxBefore.height);

    const ccwBoxBefore = getContoursBoundingBox(ccw);
    const ccwBoxAfter = getContoursBoundingBox(adjustContoursWeight(ccw, 10));
    expect(ccwBoxAfter.width).toBeGreaterThan(ccwBoxBefore.width);
    expect(ccwBoxAfter.height).toBeGreaterThan(ccwBoxBefore.height);
  });

  it('shrinks enclosed hole when expanding outer stroke weight (delta > 0)', () => {
    const outer = makeRectContour('outer', 100, 100, 900, 900, true);
    const hole = makeRectContour('hole', 300, 300, 700, 700, false);

    const result = adjustContoursWeight([outer, hole], 10);
    const outerBox = getContoursBoundingBox([result[0]]);
    const holeBox = getContoursBoundingBox([result[1]]);

    expect(outerBox.width).toBeGreaterThan(800);
    expect(holeBox.width).toBeLessThan(400);
  });

  it('handles duplicate consecutive vertices cleanly without collapsing to NaN', () => {
    const dupRect = makeRectContour('dup', 200, 200, 600, 600, true);
    dupRect.nodes.splice(1, 0, {
      id: 'dup-node',
      x: 200,
      y: 200,
      handleIn: null,
      handleOut: null,
      type: 'corner',
    });

    const result = adjustContoursWeight([dupRect], 8);
    for (const n of result[0].nodes) {
      expect(Number.isFinite(n.x)).toBe(true);
      expect(Number.isFinite(n.y)).toBe(true);
    }
    const bbox = getContoursBoundingBox(result);
    expect(bbox.width).toBeGreaterThan(400);
  });

  it('createSmallKanaContours normalizes winding, assigns fresh IDs even with weightDelta=0, and scales placement by UPM', () => {
    const source = [makeRectContour('orig', 100, 100, 900, 900, false)];

    const smallZeroWeight = createSmallKanaContours(source, {
      scale: 0.72,
      weightDelta: 0,
      placement: 'bottom-left',
      unitsPerEm: 1000,
    });
    expect(smallZeroWeight[0].id).not.toBe('orig');
    expect(getContourSignedArea(smallZeroWeight[0])).toBeGreaterThan(0);

    const small2048 = createSmallKanaContours([makeRectContour('orig2', 200, 200, 1800, 1800, true)], {
      scale: 0.72,
      weightDelta: 4,
      placement: 'bottom-left',
      unitsPerEm: 2048,
    });
    const bbox2048 = getContoursBoundingBox(small2048);
    expect(bbox2048.maxY).toBeGreaterThan(1500);
    expect(bbox2048.minX).toBeGreaterThan(0);
  });
});

describe('batchGenerateSmallKana', () => {
  it('respects scope, skips locked glyphs, and computes lsb from generated bbox', () => {
    const tsuCode = 'つ'.codePointAt(0)!;
    const smallTsuCode = 'っ'.codePointAt(0)!;
    const yaCode = 'や'.codePointAt(0)!;
    const smallYaCode = 'ゃ'.codePointAt(0)!;
    const kkTsuCode = 'ツ'.codePointAt(0)!;
    const kkSmallTsuCode = 'ッ'.codePointAt(0)!;

    const glyphs: Record<number, GlyphData> = {
      [tsuCode]: {
        unicode: tsuCode,
        char: 'つ',
        name: 'uni3064',
        advanceWidth: 950,
        lsb: 50,
        contours: [makeRectContour('tsu', 150, 200, 850, 800)],
      },
      [yaCode]: {
        unicode: yaCode,
        char: 'や',
        name: 'uni3084',
        advanceWidth: 950,
        lsb: 50,
        contours: [makeRectContour('ya', 150, 200, 850, 800)],
      },
      [smallYaCode]: {
        unicode: smallYaCode,
        char: 'ゃ',
        name: 'uni3083',
        advanceWidth: 950,
        lsb: 50,
        locked: true,
        contours: [makeRectContour('locked-ya', 150, 200, 850, 800)],
      },
      [kkTsuCode]: {
        unicode: kkTsuCode,
        char: 'ツ',
        name: 'uni30C4',
        advanceWidth: 1000,
        lsb: 50,
        contours: [makeRectContour('kk-tsu', 150, 200, 850, 800)],
      },
    };

    const res = batchGenerateSmallKana(glyphs, {
      scope: 'hiragana',
      overwriteExisting: true,
      scale: 0.72,
      weightDelta: 4,
      placement: 'bottom-left',
      unitsPerEm: 1000,
    });

    expect(res.generatedCount).toBe(1);
    const smallTsu = res.updatedGlyphs[smallTsuCode];
    expect(smallTsu).toBeDefined();
    expect(smallTsu.advanceWidth).toBe(950);
    const bbox = getContoursBoundingBox(smallTsu.contours);
    expect(smallTsu.lsb).toBe(Math.max(0, Math.round(bbox.minX)));

    // Locked small ya unchanged, katakana ッ skipped by scope
    expect(res.updatedGlyphs[smallYaCode].contours[0].id).toBe('locked-ya');
    expect(res.updatedGlyphs[kkSmallTsuCode]).toBeUndefined();
  });
});

describe('open-contour adjustContoursWeight & unequal-node interpolateContours', () => {
  it('shifts open horizontal contour perpendicular to segment without wrapping endpoints', () => {
    const openLine: PathContour = {
      id: 'open-1',
      closed: false,
      nodes: [
        { id: 'n0', x: 100, y: 500, handleIn: null, handleOut: null, type: 'corner' },
        { id: 'n1', x: 500, y: 500, handleIn: null, handleOut: null, type: 'corner' },
        { id: 'n2', x: 900, y: 500, handleIn: null, handleOut: null, type: 'corner' },
      ],
    };
    const shifted = adjustContoursWeight([openLine], 10);
    expect(shifted[0].nodes).toHaveLength(3);
    // Horizontal line normals point uniformly along Y without horizontal endpoint drift
    expect(shifted[0].nodes[0].x).toBe(100);
    expect(shifted[0].nodes[2].x).toBe(900);
    expect(shifted[0].nodes[0].y).toBe(shifted[0].nodes[1].y);
    expect(shifted[0].nodes[1].y).toBe(shifted[0].nodes[2].y);
    expect(Math.abs(shifted[0].nodes[0].y - 500)).toBe(10);
  });

  it('continuously morphs contours with unequal node counts all the way to Master B without snapping at t=1', () => {
    const rect4 = [makeRectContour('rect', 100, 100, 300, 300, true)];
    const tri3: PathContour[] = [
      {
        id: 'tri',
        closed: true,
        nodes: [
          { id: 't0', x: 700, y: 600, handleIn: null, handleOut: null, type: 'corner' },
          { id: 't1', x: 900, y: 800, handleIn: null, handleOut: null, type: 'corner' },
          { id: 't2', x: 500, y: 800, handleIn: null, handleOut: null, type: 'corner' },
        ],
      },
    ];

    const half = getContoursBoundingBox(interpolateContours(rect4, tri3, 0.5));
    const nearEnd = getContoursBoundingBox(interpolateContours(rect4, tri3, 0.98));
    const targetB = getContoursBoundingBox(tri3);

    expect(half.centerX).toBeGreaterThan(350);
    expect(half.centerX).toBeLessThan(650);
    expect(Math.abs(nearEnd.centerX - targetB.centerX)).toBeLessThan(20);
    expect(Math.abs(nearEnd.centerY - targetB.centerY)).toBeLessThan(20);
  });
});
