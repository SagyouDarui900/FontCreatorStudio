// Runs in the default node environment (not jsdom): compileFont with
// kerning entries needs the opentype.js Table API, which is unavailable
// under jsdom, so the subset/full compile comparison lives here.
import { describe, expect, it } from 'vitest';
import { FontProject, GlyphData } from '../../../types';
import { compileFont } from '../../../utils/font/compilerCore';
import { buildPreviewProject } from './useTestPreviewState';

function makeGlyph(unicode: number, char: string, x = 100): GlyphData {
  return {
    unicode,
    char,
    name: `uni${unicode.toString(16).toUpperCase()}`,
    advanceWidth: 1000,
    lsb: 100,
    contours: [
      {
        id: `c${unicode}`,
        closed: true,
        nodes: [
          { id: 'n1', x, y: 200, type: 'corner' },
          { id: 'n2', x: 600, y: 200, type: 'corner' },
          { id: 'n3', x: 600, y: 800, type: 'corner' },
          { id: 'n4', x: 100, y: 800, type: 'corner' },
        ],
      },
    ],
  };
}

function makeProject(): FontProject {
  return {
    id: 'preview-test',
    name: 'PreviewTest',
    metadata: {
      familyName: 'PreviewTest',
      styleName: 'Regular',
      designer: '',
      copyright: '',
      version: '1.000',
      unitsPerEm: 1000,
      ascender: 800,
      descender: -200,
      lineGap: 0,
      capHeight: 700,
      xHeight: 500,
    },
    glyphs: {
      0x3042: makeGlyph(0x3042, 'あ'),
      0x3044: makeGlyph(0x3044, 'い'),
      0x3046: makeGlyph(0x3046, 'う'),
    },
    kerning: {},
    createdAt: 1,
    updatedAt: 1,
  } as unknown as FontProject;
}

describe('subset compile equivalence', () => {
  it('compiles the same glyphs and advances for the preview text as the full project', () => {
    const project = makeProject();
    // No kerning entries here: compileFont throws for any valid kern pair
    // in this repo's opentype.js version (its Table API is not exported),
    // which is a pre-existing issue outside this change. Kerning filtering
    // itself is covered by the buildPreviewProject tests above.
    const options = {
      skipBlobUrl: true,
      scaleFactor: 1.0,
      balanceSideBearings: false,
      mergeOverlaps: true,
      normalizeWinding: true,
    };
    const full = compileFont(project, options).font;
    const subsetProject = buildPreviewProject(project, 'あい');
    const subset = compileFont(subsetProject, options).font;
    for (const ch of ['あ', 'い']) {
      const fullGlyph = full.charToGlyph(ch);
      const subsetGlyph = subset.charToGlyph(ch);
      expect(subsetGlyph.advanceWidth).toBe(fullGlyph.advanceWidth);
      expect(subsetGlyph.path.commands).toEqual(fullGlyph.path.commands);
    }
    expect(subset.hasChar('う')).toBe(false);
    expect(full.hasChar('う')).toBe(true);
  });
});
