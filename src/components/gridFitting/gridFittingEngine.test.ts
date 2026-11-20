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
});
