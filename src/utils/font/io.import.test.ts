// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as opentype from 'opentype.js';
import { loadFontFromFile } from './io';

vi.mock('opentype.js', () => ({ parse: vi.fn() }));

const parseMock = vi.mocked(opentype.parse);

function makePathCommands() {
  return [
    { type: 'M', x: 0, y: 0 },
    { type: 'L', x: 100, y: 0 },
    { type: 'L', x: 100, y: 100 },
    { type: 'Z' },
  ];
}

function makeFakeGlyph(overrides: Record<string, unknown>) {
  return {
    unicode: 0,
    unicodes: [],
    name: 'glyph',
    advanceWidth: 1024,
    leftSideBearing: 100,
    getPath: () => ({ commands: makePathCommands() }),
    ...overrides,
  };
}

function makeFakeFont() {
  const glyphs = [
    makeFakeGlyph({ unicode: 65, unicodes: [65], name: 'A' }),
    makeFakeGlyph({ unicode: 65, unicodes: [65], name: 'A.dup' }),
    makeFakeGlyph({ unicode: 0, unicodes: [], name: '.notdef' }),
    makeFakeGlyph({ unicode: 66, unicodes: [66, 67], name: 'B' }),
  ];
  return {
    unitsPerEm: 2048,
    ascender: 1600,
    descender: -400,
    names: {
      fontFamily: { en: 'Fake' },
      fontSubfamily: { en: 'Regular' },
      manufacturer: { en: 'FakeCo' },
      description: { en: 'A fake font' },
      version: { en: 'Version 2.000' },
      designer: { en: 'D' },
      copyright: { en: 'C' },
      license: { en: 'L' },
    },
    tables: {
      os2: {
        sCapHeight: 1400,
        sxHeight: 1000,
        usWeightClass: 700,
        usWidthClass: 5,
        achVendID: 'FAKE',
        sTypoAscender: 1500,
        sTypoDescender: -500,
        sTypoLineGap: 200,
        usWinAscent: 1800,
        usWinDescent: 600,
      },
      post: { italicAngle: 0, isFixedPitch: false },
      hhea: { ascender: 1600, descender: -400, lineGap: 400 },
      kern: { tables: [{ pairs: { '1,2': -50, '3,4': -20 } }] },
    },
    glyphs: {
      length: glyphs.length,
      get: (i: number) => glyphs[i],
    },
  };
}

function makeFakeFile() {
  return {
    name: 'Fake.otf',
    size: 100,
    arrayBuffer: async () => new ArrayBuffer(100),
  } as unknown as File;
}

describe('loadFontFromFile import report (review M19)', () => {
  beforeEach(() => {
    parseMock.mockReset();
    parseMock.mockReturnValue(makeFakeFont() as unknown as opentype.Font);
  });

  it('imports lineGap, typo/win metrics, manufacturer and description scaled to 1000 UPM', async () => {
    const imported = await loadFontFromFile(makeFakeFile());
    // UPM 2048 -> scale 1000/2048 = 0.48828125, values rounded.
    expect(imported.metadata.unitsPerEm).toBe(1000);
    expect(imported.metadata.lineGap).toBe(195);
    expect(imported.metadata.typoAscender).toBe(732);
    expect(imported.metadata.typoDescender).toBe(-244);
    expect(imported.metadata.typoLineGap).toBe(98);
    expect(imported.metadata.winAscent).toBe(879);
    expect(imported.metadata.winDescent).toBe(293);
    expect(imported.metadata.manufacturer).toBe('FakeCo');
    expect(imported.metadata.description).toBe('A fake font');
    expect(imported.metadata.capHeight).toBe(684);
    expect(imported.metadata.xHeight).toBe(488);
    expect(imported.metadata.usWeightClass).toBe(700);
    expect(imported.metadata.vendorId).toBe('FAKE');
    expect(imported.glyphs[65].advanceWidth).toBe(500);
  });

  it('counts Unicode-less glyphs and keeps the first glyph on duplicate Unicodes', async () => {
    const imported = await loadFontFromFile(makeFakeFile());
    expect(imported.report.noUnicodeGlyphs).toBe(1);
    expect(imported.report.noUnicodeGlyphNames).toContain('.notdef');
    expect(imported.report.duplicateUnicodes).toBe(1);
    expect(imported.report.duplicateUnicodeLabels).toContain('U+41');
    expect(imported.glyphs[65].name).toBe('A');
    expect(imported.glyphs[66]).toBeDefined();
    expect(imported.glyphs[67]).toBeDefined();
    expect(imported.report.kerningPairsSkipped).toBe(2);
    expect(imported.report.kerningTablesPresent).toBe(true);
  });
});
