import { describe, it, expect } from 'vitest';
import { areGlyphsEqual, areContoursEqual, cloneGlyph } from './useUndoRedo';
import { GlyphData } from '../types';

describe('useUndoRedo utilities and glyph cloning', () => {
  it('correctly compares equal glyphs and detects modified contours', () => {
    const glyph1: GlyphData = {
      unicode: 12354,
      char: 'あ',
      name: 'uni3042',
      advanceWidth: 1000,
      lsb: 50,
      contours: [
        {
          id: 'c1',
          closed: true,
          nodes: [
            { id: 'n1', x: 100, y: 200, type: 'corner' },
            { id: 'n2', x: 300, y: 400, type: 'smooth', handleOut: { x: 350, y: 450 } },
          ],
        },
      ],
    };

    const glyph2 = cloneGlyph(glyph1);
    expect(areGlyphsEqual(glyph1, glyph2)).toBe(true);

    const glyphModified = {
      ...glyph1,
      contours: [
        {
          ...glyph1.contours[0],
          nodes: [
            { id: 'n1', x: 105, y: 200, type: 'corner' as const },
            glyph1.contours[0].nodes[1],
          ],
        },
      ],
    };
    expect(areGlyphsEqual(glyph1, glyphModified)).toBe(false);
  });

  it('deep clones glyph contours and handles safely', () => {
    const original: GlyphData = {
      unicode: 12356,
      char: 'い',
      name: 'uni3044',
      advanceWidth: 1000,
      lsb: 60,
      contours: [
        {
          id: 'c1',
          closed: true,
          nodes: [
            {
              id: 'n1',
              x: 150,
              y: 250,
              type: 'smooth',
              handleIn: { x: 100, y: 200 },
              handleOut: { x: 200, y: 300 },
            },
          ],
        },
      ],
    };

    const cloned = cloneGlyph(original);
    expect(cloned).toEqual(original);
    expect(cloned).not.toBe(original);
    expect(cloned.contours).not.toBe(original.contours);
    expect(cloned.contours[0].nodes[0].handleIn).not.toBe(original.contours[0].nodes[0].handleIn);
  });
});
