import { describe, it, expect } from 'vitest';
import {
  createDakutenContours,
  createHandakutenContours,
  synthesizeDakutenContours,
  batchSynthesizeDakuten,
} from './dakutenHelper';
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

describe('dakutenHelper', () => {
  it('createDakutenContours applies scale across all 4 styles and produces unique IDs', () => {
    const styles = ['standard', 'brush', 'round', 'square'] as const;
    const allIds = new Set<string>();

    for (const style of styles) {
      const normal = createDakutenContours(0, 0, style, 1.0);
      const scaled = createDakutenContours(0, 0, style, 1.4);
      expect(normal.length).toBe(2);
      expect(scaled.length).toBe(2);

      const normalSpan =
        Math.max(...normal.flatMap((c) => c.nodes.map((n) => n.x))) -
        Math.min(...normal.flatMap((c) => c.nodes.map((n) => n.x)));
      const scaledSpan =
        Math.max(...scaled.flatMap((c) => c.nodes.map((n) => n.x))) -
        Math.min(...scaled.flatMap((c) => c.nodes.map((n) => n.x)));
      expect(scaledSpan).toBeGreaterThan(normalSpan * 1.2);

      for (const c of [...normal, ...scaled]) {
        expect(allIds.has(c.id)).toBe(false);
        allIds.add(c.id);
      }
    }
  });

  it('createHandakutenContours builds a symmetric circular inner hole around center (835, 220)', () => {
    const standard = createHandakutenContours(0, 0, 'standard', 1.0);
    expect(standard.length).toBe(2);
    const [outer, inner] = standard;

    // Outer CW (> 0) and Inner CCW (< 0) in Y-down coordinates
    expect(getContourSignedArea(outer)).toBeGreaterThan(0);
    expect(getContourSignedArea(inner)).toBeLessThan(0);

    // Inner circle nodes and handles must stay bounded around center (835, 220) with inner radius 30
    for (const node of inner.nodes) {
      expect(Math.hypot(node.x - 835, node.y - 220)).toBeCloseTo(30, 1);
      if (node.handleIn) {
        expect(Math.abs(node.handleIn.x - node.x)).toBeLessThanOrEqual(20);
        expect(Math.abs(node.handleIn.y - node.y)).toBeLessThanOrEqual(20);
      }
      if (node.handleOut) {
        expect(Math.abs(node.handleOut.x - node.x)).toBeLessThanOrEqual(20);
        expect(Math.abs(node.handleOut.y - node.y)).toBeLessThanOrEqual(20);
      }
    }

    // Check specific handleOut directions for CCW circle: top node goes LEFT (-x)
    expect(inner.nodes[0].handleOut!.x).toBeLessThan(inner.nodes[0].x);
    expect(inner.nodes[1].handleOut!.y).toBeGreaterThan(inner.nodes[1].y);
    expect(inner.nodes[2].handleOut!.x).toBeGreaterThan(inner.nodes[2].x);
    expect(inner.nodes[3].handleOut!.y).toBeLessThan(inner.nodes[3].y);

    // Brush style should differ organically from standard, and solid has 1 contour
    const brush = createHandakutenContours(0, 0, 'brush', 1.0);
    expect(brush.length).toBe(2);
    expect(brush[0].nodes[0].y).not.toBe(standard[0].nodes[0].y);
    expect(brush[0].nodes[1].x).not.toBe(standard[0].nodes[1].x);
    expect(brush[1].nodes[0].x).not.toBe(standard[1].nodes[0].x);

    const solid = createHandakutenContours(0, 0, 'solid', 1.0);
    expect(solid.length).toBe(1);
  });

  it('synthesizeDakutenContours normalizes base CCW contour winding', () => {
    const ccwBase = [makeRectContour('base', 150, 150, 750, 850, false)];
    const combined = synthesizeDakutenContours(ccwBase, false);
    expect(combined.length).toBe(3);
    // All non-hole outer contours should be CW (> 0)
    expect(getContourSignedArea(combined[0])).toBeGreaterThan(0);
  });

  it('batchSynthesizeDakuten respects scope, skips locked glyphs, and preserves existing metadata', () => {
    const kaCode = 'か'.codePointAt(0)!;
    const gaCode = 'が'.codePointAt(0)!;
    const haCode = 'は'.codePointAt(0)!;
    const baCode = 'ば'.codePointAt(0)!;
    const paCode = 'ぱ'.codePointAt(0)!;
    const katakanaKaCode = 'カ'.codePointAt(0)!;
    const katakanaGaCode = 'ガ'.codePointAt(0)!;

    const glyphs: Record<number, GlyphData> = {
      [kaCode]: {
        unicode: kaCode,
        char: 'か',
        name: 'uni304B',
        advanceWidth: 980,
        lsb: 45,
        contours: [makeRectContour('ka', 150, 200, 700, 800)],
      },
      [haCode]: {
        unicode: haCode,
        char: 'は',
        name: 'uni306F',
        advanceWidth: 960,
        lsb: 40,
        contours: [makeRectContour('ha', 160, 200, 680, 800)],
      },
      [paCode]: {
        unicode: paCode,
        char: 'ぱ',
        name: 'uni3071',
        advanceWidth: 960,
        lsb: 40,
        locked: true,
        contours: [makeRectContour('pa-locked', 160, 200, 680, 800)],
      },
      [katakanaKaCode]: {
        unicode: katakanaKaCode,
        char: 'カ',
        name: 'uni30AB',
        advanceWidth: 1000,
        lsb: 50,
        contours: [makeRectContour('kk', 160, 200, 680, 800)],
      },
    };

    const res = batchSynthesizeDakuten(glyphs, {
      scope: 'hiragana',
      overwriteExisting: true,
      dakuStyle: 'round',
      handakuStyle: 'brush',
    });

    // が and ば generated; ぱ skipped because locked; ガ skipped because hiragana scope
    expect(res.generatedCount).toBe(2);
    expect(res.updatedGlyphs[gaCode].contours.length).toBe(3);
    expect(res.updatedGlyphs[gaCode].advanceWidth).toBe(980);
    expect(res.updatedGlyphs[baCode].contours.length).toBe(3);
    expect(res.updatedGlyphs[paCode].contours[0].id).toBe('pa-locked');
    expect(res.updatedGlyphs[katakanaGaCode]).toBeUndefined();
  });

  it('M12: overwrite re-run keeps 3 contours per target and sets modified; without overwrite the second run generates 0', () => {
    const kaCode = 'か'.codePointAt(0)!;
    const gaCode = 'が'.codePointAt(0)!;
    const haCode = 'は'.codePointAt(0)!;
    const baCode = 'ば'.codePointAt(0)!;
    const paCode = 'ぱ'.codePointAt(0)!;

    const glyphs: Record<number, GlyphData> = {
      [kaCode]: {
        unicode: kaCode,
        char: 'か',
        name: 'uni304B',
        advanceWidth: 1000,
        lsb: 50,
        contours: [makeRectContour('ka', 150, 200, 700, 800)],
      },
      [haCode]: {
        unicode: haCode,
        char: 'は',
        name: 'uni306F',
        advanceWidth: 1000,
        lsb: 50,
        contours: [makeRectContour('ha', 160, 200, 680, 800)],
      },
    };

    const first = batchSynthesizeDakuten(glyphs, { scope: 'hiragana', overwriteExisting: false });
    expect(first.generatedCount).toBe(3);
    expect(first.updatedGlyphs[gaCode].contours.length).toBe(3);
    expect(first.updatedGlyphs[gaCode].modified).toBe(true);
    expect(first.updatedGlyphs[baCode].modified).toBe(true);
    expect(first.updatedGlyphs[paCode].modified).toBe(true);

    // Overwrite re-run regenerates from the parents: same count, still 3 contours each.
    const second = batchSynthesizeDakuten(first.updatedGlyphs, {
      scope: 'hiragana',
      overwriteExisting: true,
    });
    expect(second.generatedCount).toBe(3);
    expect(second.updatedGlyphs[gaCode].contours.length).toBe(3);
    expect(second.updatedGlyphs[baCode].contours.length).toBe(3);
    expect(second.updatedGlyphs[paCode].contours.length).toBe(3);
    expect(second.updatedGlyphs[gaCode].modified).toBe(true);

    // Without overwrite the third run generates nothing and leaves the targets untouched.
    const third = batchSynthesizeDakuten(second.updatedGlyphs, {
      scope: 'hiragana',
      overwriteExisting: false,
    });
    expect(third.generatedCount).toBe(0);
    expect(third.updatedGlyphs[gaCode].contours[0].id).toBe(
      second.updatedGlyphs[gaCode].contours[0].id
    );
    expect(third.updatedGlyphs[baCode].contours.length).toBe(3);
  });

  it('scales dakuten, handakuten, and fallback metrics proportionally for custom unitsPerEm', () => {
    const upm = 2000;
    const daku1000 = createDakutenContours(0, 0, 'standard', 1.0, 1000);
    const daku2000 = createDakutenContours(0, 0, 'standard', 1.0, upm);
    expect(daku2000[0].nodes[0].x).toBeCloseTo(daku1000[0].nodes[0].x * 2, 1);
    expect(daku2000[0].nodes[0].y).toBeCloseTo(daku1000[0].nodes[0].y * 2, 1);

    const handaku2000 = createHandakutenContours(0, 0, 'standard', 1.0, upm);
    const [, inner2000] = handaku2000;
    for (const node of inner2000.nodes) {
      expect(Math.hypot(node.x - 1670, node.y - 440)).toBeCloseTo(60, 1);
    }

    const kaCode = 'か'.codePointAt(0)!;
    const gaCode = 'が'.codePointAt(0)!;
    const res = batchSynthesizeDakuten(
      {
        [kaCode]: {
          unicode: kaCode,
          char: 'か',
          name: 'uni304B',
          advanceWidth: 0,
          contours: [makeRectContour('ka-2000', 300, 400, 1400, 1600)],
        },
      } as unknown as Record<number, GlyphData>,
      { scope: 'hiragana', overwriteExisting: true, unitsPerEm: upm }
    );
    expect(res.updatedGlyphs[gaCode].advanceWidth).toBe(2000);
    // lsb は合成後の輪郭の bounding box から再計算される（親文字の
    // 左端 300）。従来の既定値 100 ではない。
    expect(res.updatedGlyphs[gaCode].lsb).toBe(300);
  });

  it('H2: custom offsets are scaled by emScale (UPM 1000 result is unchanged)', () => {
    const daku1000 = createDakutenContours(150, 0, 'standard', 1.0, 1000);
    const daku1000NoOffset = createDakutenContours(0, 0, 'standard', 1.0, 1000);
    expect(daku1000[0].nodes[0].x - daku1000NoOffset[0].nodes[0].x).toBeCloseTo(150, 1);

    const daku2048 = createDakutenContours(150, 0, 'standard', 1.0, 2048);
    const daku2048NoOffset = createDakutenContours(0, 0, 'standard', 1.0, 2048);
    expect(daku2048[0].nodes[0].x - daku2048NoOffset[0].nodes[0].x).toBeCloseTo(307.2, 1);

    const handaku2048 = createHandakutenContours(150, 0, 'standard', 1.0, 2048);
    const handaku2048NoOffset = createHandakutenContours(0, 0, 'standard', 1.0, 2048);
    expect(handaku2048[0].nodes[0].x - handaku2048NoOffset[0].nodes[0].x).toBeCloseTo(307.2, 1);
    // UPM 1000 では従来と同一の位置になる
    const handaku1000 = createHandakutenContours(0, 0, 'standard', 1.0, 1000);
    expect(handaku1000[0].nodes[0].x).toBe(835);
    expect(handaku1000[0].nodes[0].y).toBe(160);
  });

  it('H3: dakuten is placed near the parent top-right, close to the legacy position for a standard kana', () => {
    const standardBase = [makeRectContour('base', 100, 100, 900, 800)];
    const combined = synthesizeDakutenContours(standardBase, false);
    const accentBbox = getContoursBoundingBox(combined.slice(1));
    expect(accentBbox.minX).toBeGreaterThanOrEqual(740);
    expect(accentBbox.maxX).toBeLessThanOrEqual(905);
    expect(accentBbox.minY).toBeGreaterThanOrEqual(140);
    expect(accentBbox.maxY).toBeLessThanOrEqual(290);

    // 小さい親文字では濁点が親文字から離れない
    const smallBase = [makeRectContour('small', 100, 600, 300, 800)];
    const smallCombined = synthesizeDakutenContours(smallBase, false);
    const smallAccentBbox = getContoursBoundingBox(smallCombined.slice(1));
    expect(smallAccentBbox.maxX).toBeLessThanOrEqual(300);
    expect(smallAccentBbox.minX).toBeGreaterThanOrEqual(100);
    expect(smallAccentBbox.minY).toBeGreaterThanOrEqual(640);
    expect(smallAccentBbox.minY).toBeLessThanOrEqual(660);
  });

  it('H3: accent is clamped inside the em box', () => {
    const edgeBase = [makeRectContour('edge', 900, 0, 990, 100)];
    // オフセットで em ボックスをはみ出してもクランプされる
    const combined = synthesizeDakutenContours(edgeBase, false, { offsetX: 200 });
    const bbox = getContoursBoundingBox(combined.slice(1));
    expect(bbox.minX).toBeGreaterThanOrEqual(0);
    expect(bbox.maxX).toBeLessThanOrEqual(1000);
    expect(bbox.minY).toBeGreaterThanOrEqual(0);
    expect(bbox.maxY).toBeLessThanOrEqual(1000);
  });

  it('H2+H3: offset moves the accent relative to the parent-derived position', () => {
    const base = [makeRectContour('base', 100, 100, 900, 800)];
    const noOffset = synthesizeDakutenContours(base, false);
    const withOffset = synthesizeDakutenContours(base, false, { offsetX: 100 });
    const bboxNoOffset = getContoursBoundingBox(noOffset.slice(1));
    const bboxWithOffset = getContoursBoundingBox(withOffset.slice(1));
    expect(bboxWithOffset.minX - bboxNoOffset.minX).toBeCloseTo(100, 1);
  });

  it('M1: handakuten ring keeps its winding when the parent encloses its center', () => {
    const enclosingBase = [makeRectContour('base', 700, 100, 950, 300)];
    const combined = synthesizeDakutenContours(enclosingBase, true);
    expect(combined.length).toBe(3);
    const [, outer, inner] = combined;
    expect(getContourSignedArea(outer)).toBeGreaterThan(0);
    expect(getContourSignedArea(inner)).toBeLessThan(0);
  });

  it('L4: handakuten node coordinates are rounded to 2 decimal places and share the dakuten anchor y 220', () => {
    const handaku = createHandakutenContours(0, 0, 'standard', 1.0, 2048);
    for (const contour of handaku) {
      for (const node of contour.nodes) {
        for (const p of [node, node.handleIn, node.handleOut]) {
          if (!p) continue;
          expect(Number.isInteger(Math.round(p.x * 100))).toBe(true);
          expect(Number.isInteger(Math.round(p.y * 100))).toBe(true);
          expect(Math.abs(p.x * 100 - Math.round(p.x * 100))).toBeLessThan(1e-6);
          expect(Math.abs(p.y * 100 - Math.round(p.y * 100))).toBeLessThan(1e-6);
        }
      }
    }
    // 外側円の上端ノードは中心 y 220 - 半径 60 = 160（UPM 1000）
    const handaku1000 = createHandakutenContours(0, 0, 'standard', 1.0, 1000);
    expect(handaku1000[0].nodes[0].y).toBe(160);
  });

  it('L5: synthesizeDakutenContours returns an empty array for empty base contours', () => {
    expect(synthesizeDakutenContours([], false)).toEqual([]);
    expect(synthesizeDakutenContours([], true)).toEqual([]);
  });

  it('M2: batch recomputes lsb from the combined bbox and widens advanceWidth past the accent right edge', () => {
    const kaCode = 'か'.codePointAt(0)!;
    const gaCode = 'が'.codePointAt(0)!;
    const res = batchSynthesizeDakuten(
      {
        [kaCode]: {
          unicode: kaCode,
          char: 'か',
          name: 'uni304B',
          advanceWidth: 500,
          lsb: 45,
          contours: [makeRectContour('ka', 100, 100, 900, 800)],
        },
      } as unknown as Record<number, GlyphData>,
      { scope: 'hiragana', overwriteExisting: true }
    );
    // lsb は親文字の lsb 45 ではなく合成後の最小 x 100 になる
    expect(res.updatedGlyphs[gaCode].lsb).toBe(100);
    // 右端 900 - lsb 100 = 800 が親文字の advanceWidth 500 を超えるため広がる
    expect(res.updatedGlyphs[gaCode].advanceWidth).toBe(800);
  });

  it('H4+H5: pixel-only parent is synthesized and pixelData/vectorContoursBackup are removed from the target', () => {
    const kaCode = 'か'.codePointAt(0)!;
    const gaCode = 'が'.codePointAt(0)!;
    const pixelData = {
      width: 4,
      height: 4,
      data: Array(16).fill(1),
      shape: 'square' as const,
    };
    const res = batchSynthesizeDakuten(
      {
        [kaCode]: {
          unicode: kaCode,
          char: 'か',
          name: 'uni304B',
          advanceWidth: 1000,
          lsb: 50,
          contours: [],
          pixelData,
        },
        [gaCode]: {
          unicode: gaCode,
          char: 'が',
          name: 'uni304C',
          advanceWidth: 1000,
          lsb: 50,
          contours: [],
          pixelData,
          vectorContoursBackup: [makeRectContour('backup', 100, 100, 200, 200)],
        },
      } as unknown as Record<number, GlyphData>,
      { scope: 'hiragana', overwriteExisting: true }
    );
    expect(res.generatedCount).toBe(1);
    const ga = res.updatedGlyphs[gaCode];
    expect(ga.contours.length).toBeGreaterThan(0);
    expect(ga.pixelData).toBeUndefined();
    expect(ga.vectorContoursBackup).toBeUndefined();
  });

  it('M11: standalone U+309B / U+309C glyph contours are used as the accent shape', () => {
    const kaCode = 'か'.codePointAt(0)!;
    const gaCode = 'が'.codePointAt(0)!;
    const haCode = 'は'.codePointAt(0)!;
    const paCode = 'ぱ'.codePointAt(0)!;
    const res = batchSynthesizeDakuten(
      {
        [kaCode]: {
          unicode: kaCode,
          char: 'か',
          name: 'uni304B',
          advanceWidth: 1000,
          lsb: 50,
          contours: [makeRectContour('ka', 100, 100, 900, 800)],
        },
        [haCode]: {
          unicode: haCode,
          char: 'は',
          name: 'uni306F',
          advanceWidth: 1000,
          lsb: 50,
          contours: [makeRectContour('ha', 100, 100, 900, 800)],
        },
        [0x309b]: {
          unicode: 0x309b,
          char: '゛',
          name: 'uni309B',
          advanceWidth: 1000,
          lsb: 0,
          contours: [makeRectContour('standalone-daku', 700, 100, 800, 200)],
        },
        [0x309c]: {
          unicode: 0x309c,
          char: '゜',
          name: 'uni309C',
          advanceWidth: 1000,
          lsb: 0,
          contours: [makeRectContour('standalone-handaku', 700, 100, 800, 200)],
        },
      } as unknown as Record<number, GlyphData>,
      { scope: 'hiragana', overwriteExisting: true }
    );
    // standalone 濁点（100x100 の矩形）が親文字の右上に置かれる
    const gaAccent = res.updatedGlyphs[gaCode].contours.slice(1);
    expect(gaAccent.length).toBe(1);
    const gaAccentBbox = getContoursBoundingBox(gaAccent);
    expect(gaAccentBbox.maxX).toBe(900);
    expect(gaAccentBbox.minY).toBe(150);
    expect(gaAccentBbox.width).toBe(100);
    expect(gaAccentBbox.height).toBe(100);
    const paAccent = res.updatedGlyphs[paCode].contours.slice(1);
    expect(paAccent.length).toBe(1);
    const paAccentBbox = getContoursBoundingBox(paAccent);
    expect(paAccentBbox.maxX).toBe(900);
    expect(paAccentBbox.minY).toBe(150);
  });
});
