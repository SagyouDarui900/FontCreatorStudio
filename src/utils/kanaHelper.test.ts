import { describe, it, expect } from 'vitest';
import { batchGenerateSmallKana } from './kanaHelper';
import { KANA_PAIRS } from '../data/unicodeTables';
import { SMALL_KANA_UNICODES } from './font/constants';
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
  it('leaves open contours unchanged: weight adjustment has no "outside" to expand, so shifting would only translate the stroke', () => {
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
    // Open contours are excluded from weight adjustment: no node moves at all
    expect(shifted[0].nodes.map((n) => [n.x, n.y])).toEqual([
      [100, 500],
      [500, 500],
      [900, 500],
    ]);
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

describe('createSmallKanaContours UPM scaling, clamp and baseline (H2/M4/M5)', () => {
  it('H2: weightDelta and offsets are scaled by emScale (UPM 1000 result is unchanged)', () => {
    const base1000 = [makeRectContour('b1000', 100, 100, 900, 900, true)];
    const noWeight1000 = createSmallKanaContours(base1000, {
      scale: 0.72, weightDelta: 0, placement: 'bottom-left', unitsPerEm: 1000,
    });
    const weight1000 = createSmallKanaContours(base1000, {
      scale: 0.72, weightDelta: 4, placement: 'bottom-left', unitsPerEm: 1000,
    });
    const expansion1000 =
      getContoursBoundingBox(weight1000).width - getContoursBoundingBox(noWeight1000).width;
    expect(expansion1000).toBeGreaterThan(0);

    const base2048 = [makeRectContour('b2048', 200, 200, 1800, 1800, true)];
    const noWeight2048 = createSmallKanaContours(base2048, {
      scale: 0.72, weightDelta: 0, placement: 'bottom-left', unitsPerEm: 2048,
    });
    const weight2048 = createSmallKanaContours(base2048, {
      scale: 0.72, weightDelta: 4, placement: 'bottom-left', unitsPerEm: 2048,
    });
    const expansion2048 =
      getContoursBoundingBox(weight2048).width - getContoursBoundingBox(noWeight2048).width;
    // 換算されていれば拡大量の比は emScale 2.048 に近い（節点の整数
    // 丸めで 17/8 = 2.125 になるため、厳密な一致ではなく範囲で見る）
    expect(expansion2048 / expansion1000).toBeGreaterThan(1.9);
    expect(expansion2048 / expansion1000).toBeLessThan(2.2);

    const noOffset2048 = createSmallKanaContours(base2048, {
      scale: 0.72, weightDelta: 0, placement: 'bottom-left', offsetX: 0, unitsPerEm: 2048,
    });
    const offset2048 = createSmallKanaContours(base2048, {
      scale: 0.72, weightDelta: 0, placement: 'bottom-left', offsetX: 150, unitsPerEm: 2048,
    });
    // 節点は整数に丸められるため 307 になる（307.2 から 0.5 以内）
    expect(
      getContoursBoundingBox(offset2048).minX - getContoursBoundingBox(noOffset2048).minX
    ).toBeCloseTo(307.2, 0);
    const offset1000 = createSmallKanaContours(base1000, {
      scale: 0.72, weightDelta: 0, placement: 'bottom-left', offsetX: 150, unitsPerEm: 1000,
    });
    expect(
      getContoursBoundingBox(offset1000).minX - getContoursBoundingBox(noWeight1000).minX
    ).toBeCloseTo(150, 1);
  });

  it('M4: large offsets are clamped inside the em box and above the baseline', () => {
    const source = [makeRectContour('src', 100, 100, 900, 900, true)];
    const small = createSmallKanaContours(source, {
      scale: 0.72,
      weightDelta: 0,
      placement: 'bottom-left',
      offsetX: -150,
      offsetY: 150,
      unitsPerEm: 1000,
    });
    const bbox = getContoursBoundingBox(small);
    expect(bbox.minX).toBeGreaterThanOrEqual(-1);
    expect(bbox.maxX).toBeLessThanOrEqual(1001);
    expect(bbox.maxY).toBeLessThanOrEqual(781);
    expect(bbox.minY).toBeGreaterThanOrEqual(-1);
  });

  it('M5: target baseline follows ascender when given, and stays 780 otherwise', () => {
    const source = [makeRectContour('src', 100, 100, 900, 900, true)];
    const withAscender = createSmallKanaContours(source, {
      scale: 0.72,
      weightDelta: 0,
      placement: 'bottom-left',
      unitsPerEm: 1000,
      ascender: 900,
    });
    expect(getContoursBoundingBox(withAscender).maxY).toBeCloseTo(900, 0);
    const withoutAscender = createSmallKanaContours(source, {
      scale: 0.72,
      weightDelta: 0,
      placement: 'bottom-left',
      unitsPerEm: 1000,
    });
    expect(getContoursBoundingBox(withoutAscender).maxY).toBeCloseTo(780, 0);
  });
});

describe('batchGenerateSmallKana pixel parents, fallback and kana pairs (H4/H5/M3/M6)', () => {
  it('M12: overwrite re-run keeps 1 contour per target and sets modified; without overwrite the second run generates 0', () => {
    const tsuCode = 'つ'.codePointAt(0)!;
    const smallTsuCode = 'っ'.codePointAt(0)!;
    const yaCode = 'や'.codePointAt(0)!;
    const smallYaCode = 'ゃ'.codePointAt(0)!;

    const glyphs: Record<number, GlyphData> = {
      [tsuCode]: {
        unicode: tsuCode,
        char: 'つ',
        name: 'uni3064',
        advanceWidth: 1000,
        lsb: 50,
        contours: [makeRectContour('tsu', 150, 200, 850, 800)],
      },
      [yaCode]: {
        unicode: yaCode,
        char: 'や',
        name: 'uni3084',
        advanceWidth: 1000,
        lsb: 50,
        contours: [makeRectContour('ya', 150, 200, 850, 800)],
      },
    };
    const options = {
      scope: 'hiragana' as const,
      scale: 0.72,
      weightDelta: 4,
      placement: 'bottom-left' as const,
      unitsPerEm: 1000,
    };

    const first = batchGenerateSmallKana(glyphs, { ...options, overwriteExisting: false });
    expect(first.generatedCount).toBe(2);
    expect(first.updatedGlyphs[smallTsuCode].contours.length).toBe(1);
    expect(first.updatedGlyphs[smallTsuCode].modified).toBe(true);
    expect(first.updatedGlyphs[smallYaCode].modified).toBe(true);

    // Overwrite re-run regenerates from the parents: same count, still 1 contour each.
    const second = batchGenerateSmallKana(first.updatedGlyphs, {
      ...options,
      overwriteExisting: true,
    });
    expect(second.generatedCount).toBe(2);
    expect(second.updatedGlyphs[smallTsuCode].contours.length).toBe(1);
    expect(second.updatedGlyphs[smallYaCode].contours.length).toBe(1);
    expect(second.updatedGlyphs[smallTsuCode].modified).toBe(true);

    // Without overwrite the third run generates nothing and leaves the targets untouched.
    const third = batchGenerateSmallKana(second.updatedGlyphs, {
      ...options,
      overwriteExisting: false,
    });
    expect(third.generatedCount).toBe(0);
    expect(third.updatedGlyphs[smallTsuCode].contours[0].id).toBe(
      second.updatedGlyphs[smallTsuCode].contours[0].id
    );
    expect(third.updatedGlyphs[smallYaCode].contours.length).toBe(1);
  });

  it('M6: KANA_PAIRS includes ka->ゕ and ke->ゖ, and SMALL_KANA_UNICODES already contains them', () => {
    expect(KANA_PAIRS['か']).toEqual({ smallChar: 'ゕ', smallUnicode: 0x3095 });
    expect(KANA_PAIRS['け']).toEqual({ smallChar: 'ゖ', smallUnicode: 0x3096 });
    expect(SMALL_KANA_UNICODES.has(0x3095)).toBe(true);
    expect(SMALL_KANA_UNICODES.has(0x3096)).toBe(true);
  });

  it('M6: batch generates ゕ and ゖ from か and け', () => {
    const kaCode = 'か'.codePointAt(0)!;
    const smallKaCode = 'ゕ'.codePointAt(0)!;
    const keCode = 'け'.codePointAt(0)!;
    const smallKeCode = 'ゖ'.codePointAt(0)!;
    const res = batchGenerateSmallKana(
      {
        [kaCode]: {
          unicode: kaCode, char: 'か', name: 'uni304B', advanceWidth: 1000, lsb: 50,
          contours: [makeRectContour('ka', 150, 200, 850, 800)],
        },
        [keCode]: {
          unicode: keCode, char: 'け', name: 'uni3051', advanceWidth: 1000, lsb: 50,
          contours: [makeRectContour('ke', 150, 200, 850, 800)],
        },
      } as unknown as Record<number, GlyphData>,
      { scope: 'hiragana', overwriteExisting: true, unitsPerEm: 1000 }
    );
    expect(res.generatedCount).toBe(2);
    expect(res.updatedGlyphs[smallKaCode].contours.length).toBeGreaterThan(0);
    expect(res.updatedGlyphs[smallKeCode].contours.length).toBeGreaterThan(0);
  });

  it('M3: advanceWidth fallback uses upm instead of 1000', () => {
    const tsuCode = 'つ'.codePointAt(0)!;
    const smallTsuCode = 'っ'.codePointAt(0)!;
    const res = batchGenerateSmallKana(
      {
        [tsuCode]: {
          unicode: tsuCode, char: 'つ', name: 'uni3064', advanceWidth: 0, lsb: 50,
          contours: [makeRectContour('tsu', 300, 400, 1700, 1600)],
        },
      } as unknown as Record<number, GlyphData>,
      { scope: 'hiragana', overwriteExisting: true, unitsPerEm: 2048 }
    );
    expect(res.updatedGlyphs[smallTsuCode].advanceWidth).toBe(2048);
  });

  it('H4+H5: pixel-only parent is generated and pixelData/vectorContoursBackup are removed from the target', () => {
    const tsuCode = 'つ'.codePointAt(0)!;
    const smallTsuCode = 'っ'.codePointAt(0)!;
    const pixelData = {
      width: 4,
      height: 4,
      data: Array(16).fill(1),
      shape: 'square' as const,
    };
    const res = batchGenerateSmallKana(
      {
        [tsuCode]: {
          unicode: tsuCode, char: 'つ', name: 'uni3064', advanceWidth: 1000, lsb: 50,
          contours: [],
          pixelData,
        },
        [smallTsuCode]: {
          unicode: smallTsuCode, char: 'っ', name: 'uni3063', advanceWidth: 1000, lsb: 50,
          contours: [],
          pixelData,
          vectorContoursBackup: [makeRectContour('backup', 100, 100, 200, 200)],
        },
      } as unknown as Record<number, GlyphData>,
      { scope: 'hiragana', overwriteExisting: true, unitsPerEm: 1000 }
    );
    expect(res.generatedCount).toBe(1);
    const small = res.updatedGlyphs[smallTsuCode];
    expect(small.contours.length).toBeGreaterThan(0);
    expect(small.pixelData).toBeUndefined();
    expect(small.vectorContoursBackup).toBeUndefined();
  });
});
