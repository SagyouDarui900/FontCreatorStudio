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
});
