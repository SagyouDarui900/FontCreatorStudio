import { describe, it, expect } from 'vitest';
import {
  createDakutenContours,
  createHandakutenContours,
  synthesizeDakutenContours,
  batchSynthesizeDakuten,
} from './dakutenHelper';
import { getContourSignedArea } from './path/bounds';
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

  it('createHandakutenContours builds a symmetric circular inner hole around center (835, 215)', () => {
    const standard = createHandakutenContours(0, 0, 'standard', 1.0);
    expect(standard.length).toBe(2);
    const [outer, inner] = standard;

    // Outer CW (> 0) and Inner CCW (< 0) in Y-down coordinates
    expect(getContourSignedArea(outer)).toBeGreaterThan(0);
    expect(getContourSignedArea(inner)).toBeLessThan(0);

    // Inner circle nodes and handles must stay bounded around center (835, 215) with inner radius 30
    for (const node of inner.nodes) {
      expect(Math.hypot(node.x - 835, node.y - 215)).toBeCloseTo(30, 1);
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
});
