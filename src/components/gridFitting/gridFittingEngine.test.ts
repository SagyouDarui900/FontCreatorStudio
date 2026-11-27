import { describe, it, expect } from 'vitest';
import {
  applyGridFittingToGlyph,
  contoursToSvgPath,
  detectGlyphStems,
} from './gridFittingEngine';
import { GlyphData } from '../../types';
import { GridFittingConfig } from './types';

const DEFAULT_CONFIG: GridFittingConfig = {
  snapStrength: 1.0,
  minStemWidthPx: 1.0,
  snapVertical: true,
  snapHorizontal: true,
  snapMetrics: true,
  adjustHandles: true,
};

describe('gridFittingEngine', () => {
  it('handles empty glyph contours safely without throwing', () => {
    const emptyGlyph: GlyphData = {
      unicode: 0x3042,
      char: 'あ',
      name: 'uni3042',
      advanceWidth: 1000,
      lsb: 50,
      contours: [],
    };

    expect(detectGlyphStems([], 16, 1000)).toEqual([]);
    expect(contoursToSvgPath([])).toBe('');
    const result = applyGridFittingToGlyph(emptyGlyph, 16, 1000, DEFAULT_CONFIG);
    expect(result).toBe(emptyGlyph);
  });

  it('snaps closed vertical stem rectangle coordinates to pixel grid cleanly', () => {
    const rectGlyph: GlyphData = {
      unicode: 73,
      char: 'I',
      name: 'I',
      advanceWidth: 1000,
      lsb: 100,
      contours: [
        {
          id: 'stem1',
          closed: true,
          nodes: [
            { id: 'n1', x: 202, y: 204, type: 'corner' },
            { id: 'n2', x: 302, y: 204, type: 'corner' },
            { id: 'n3', x: 302, y: 798, type: 'corner' },
            { id: 'n4', x: 202, y: 798, type: 'corner' },
          ],
        },
      ],
    };

    const stems = detectGlyphStems(rectGlyph.contours, 16, 1000);
    expect(stems.some((s) => s.type === 'v')).toBe(true);

    const fitted = applyGridFittingToGlyph(rectGlyph, 16, 1000, DEFAULT_CONFIG);
    expect(fitted.modified).toBe(true);
    expect(fitted.contours[0].nodes).toHaveLength(4);
    expect(contoursToSvgPath(fitted.contours)).toContain('Z');
  });

  it('snaps to custom project ascender/baseline/capHeight/xHeight metrics when provided', () => {
    const glyph: GlyphData = {
      unicode: 65,
      char: 'A',
      name: 'A',
      advanceWidth: 1000,
      lsb: 100,
      contours: [
        {
          id: 'stem1',
          closed: true,
          nodes: [
            // baselineY = 880, capHeightY = 880 - 740 = 140, xHeightY = 880 - 520 = 360
            { id: 'n1', x: 200, y: 145, type: 'corner' },
            { id: 'n2', x: 300, y: 365, type: 'corner' },
            { id: 'n3', x: 300, y: 875, type: 'corner' },
            { id: 'n4', x: 200, y: 875, type: 'corner' },
          ],
        },
      ],
    };

    const fitted = applyGridFittingToGlyph(
      glyph,
      16,
      1000,
      { ...DEFAULT_CONFIG, snapHorizontal: false, snapVertical: false, minStemWidthPx: 0 },
      { unitsPerEm: 1000, ascender: 880, descender: -120, capHeight: 740, xHeight: 520 }
    );

    expect(fitted.contours[0].nodes[0].y).toBe(140);
    expect(fitted.contours[0].nodes[1].y).toBe(360);
    expect(fitted.contours[0].nodes[2].y).toBe(880);
  });

  it('preserves exact relative Bezier handle offset when snapStrength < 1.0', () => {
    // At ppem=10, upm=1000 => pixelSizeInUnits = 100.
    // Node at x=120 snaps toward 100 with strength=0.5 => x=110 (dx = -10).
    // Handle relative offset (+30, -20) must shift by exact dx (-10), not dx * strength (-5).
    const curveGlyph: GlyphData = {
      unicode: 0x3042,
      char: 'あ',
      name: 'uni3042',
      advanceWidth: 1000,
      lsb: 100,
      contours: [
        {
          id: 'curve1',
          closed: false,
          nodes: [
            {
              id: 'n1',
              x: 120,
              y: 220,
              type: 'smooth',
              handleIn: { x: 90, y: 240 },
              handleOut: { x: 150, y: 200 },
            },
            {
              id: 'n2',
              x: 400,
              y: 500,
              type: 'corner',
            },
          ],
        },
      ],
    };

    const fitted = applyGridFittingToGlyph(curveGlyph, 10, 1000, {
      ...DEFAULT_CONFIG,
      snapStrength: 0.5,
      snapMetrics: false,
      minStemWidthPx: 0,
      adjustHandles: true,
    });

    const node1 = fitted.contours[0].nodes[0];
    expect(node1.x).toBe(110);
    expect(node1.y).toBe(210);
    expect(node1.handleIn).toEqual({ x: 80, y: 230 });
    expect(node1.handleOut).toEqual({ x: 140, y: 190 });
  });

  it('expands narrow stem walls without shifting unrelated nearby stroke nodes', () => {
    // ppem=10, upm=1000 -> pixelSizeInUnits=100. minStemWidthPx=1.0 -> minStrokeUnits=100.
    // Left stroke: x=200..240 (width 40 < 100), should expand walls by +-30 -> x=170 and x=270.
    // Nearby diagonal contour vertex at x=265 (25 units from highWall=240) must NOT be treated as part of highWall=240.
    const glyph: GlyphData = {
      unicode: 0x5ddd,
      char: '川',
      name: 'uni5DDD',
      advanceWidth: 1000,
      lsb: 100,
      contours: [
        {
          id: 'thin-stem',
          closed: true,
          nodes: [
            { id: 'l1', x: 200, y: 100, type: 'corner' },
            { id: 'l2', x: 240, y: 100, type: 'corner' },
            { id: 'l3', x: 240, y: 800, type: 'corner' },
            { id: 'l4', x: 200, y: 800, type: 'corner' },
          ],
        },
        {
          id: 'nearby-unrelated',
          closed: true,
          nodes: [
            { id: 'r1', x: 265, y: 100, type: 'corner' },
            { id: 'r2', x: 400, y: 150, type: 'corner' },
            { id: 'r3', x: 500, y: 800, type: 'corner' },
          ],
        },
      ],
    };

    const fitted = applyGridFittingToGlyph(glyph, 10, 1000, {
      ...DEFAULT_CONFIG,
      snapVertical: false,
      snapHorizontal: false,
      snapMetrics: false,
      minStemWidthPx: 1.0,
      snapStrength: 1.0,
    });

    // Left thin stem expanded symmetrically
    expect(fitted.contours[0].nodes[0].x).toBe(170);
    expect(fitted.contours[0].nodes[1].x).toBe(270);
    // Unrelated nearby vertex at 265 stayed untouched
    expect(fitted.contours[1].nodes[0].x).toBe(265);
  });
});
