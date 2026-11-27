// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import * as opentype from 'opentype.js';
import { compileFont } from './compilerCore';
import { loadFontFromFile } from './io';
import { buildCmapFormat14Subtable, spliceCmapWithFormat14 } from './cmapTable';
import { FontProject, formatIvsVariantKey } from '../../types';

function makeBoxContour(id: string, x1: number, y1: number, x2: number, y2: number) {
  return {
    id,
    closed: true,
    nodes: [
      { id: `${id}_1`, x: x1, y: y1, type: 'corner' as const },
      { id: `${id}_2`, x: x2, y: y1, type: 'corner' as const },
      { id: `${id}_3`, x: x2, y: y2, type: 'corner' as const },
      { id: `${id}_4`, x: x1, y: y2, type: 'corner' as const },
    ],
  };
}

function makeIvsProject(): FontProject {
  const ivsKey = formatIvsVariantKey(0x8fbb, 0xe0101);
  return {
    id: 'ivs-test-proj',
    name: 'IVS Test Font',
    metadata: {
      familyName: 'IvsTestFont',
      styleName: 'Regular',
      designer: 'Tester',
      copyright: 'Copyright (c) 2026',
      license: 'OFL-1.1',
      version: '1.000',
      unitsPerEm: 1000,
      ascender: 800,
      descender: -200,
      lineGap: 0,
      capHeight: 700,
      xHeight: 500,
    },
    glyphs: {
      [0x8fbb]: {
        unicode: 0x8fbb,
        char: '辻',
        name: 'uni8FBB',
        advanceWidth: 1000,
        lsb: 50,
        contours: [makeBoxContour('base_box', 100, 150, 700, 750)],
        modified: true,
      },
    },
    ivsVariants: {
      [ivsKey]: {
        id: ivsKey,
        baseUnicode: 0x8fbb,
        selectorCode: 0xe0101,
        collection: 'Adobe-Japan1',
        note: '2点しんにょう',
        glyph: {
          unicode: 0x8fbb,
          char: '辻',
          name: 'uni8FBB.uE0101',
          advanceWidth: 1000,
          lsb: 60,
          contours: [
            makeBoxContour('var_box1', 120, 180, 420, 720),
            makeBoxContour('var_box2', 520, 180, 820, 720),
          ],
          modified: true,
        },
        updatedAt: 1000,
      },
    },
    createdAt: 1000,
    updatedAt: 1000,
  };
}

describe('cmap format 14 & IVS OTF compile/import round-trip', () => {
  it('builds sorted cmap format 14 subtables and splices encoding (0, 5) cleanly', () => {
    const sub = buildCmapFormat14Subtable([
      { baseUnicode: 0x9089, selectorCode: 0xe0101, glyphIndex: 8 },
      { baseUnicode: 0x8fbb, selectorCode: 0xe0100, glyphIndex: 5 },
      { baseUnicode: 0x845b, selectorCode: 0xe0101, glyphIndex: 7 },
      { baseUnicode: 0x8fbb, selectorCode: 0xe0101, glyphIndex: 6 }, // overwritten below
      { baseUnicode: 0x8fbb, selectorCode: 0xe0101, glyphIndex: 9 },
      { baseUnicode: 0x8fbb, selectorCode: 0xe0101, glyphIndex: 0 }, // invalid gid 0 skipped
    ]);
    expect(sub).not.toBeNull();
    const view = new DataView(sub!.buffer);
    expect(view.getUint16(0, false)).toBe(14);
    expect(view.getUint32(2, false)).toBe(sub!.length);
    // 2 distinct selectors: 0xE0100 and 0xE0101
    expect(view.getUint32(6, false)).toBe(2);

    const sel0 = (view.getUint8(10) << 16) | (view.getUint8(11) << 8) | view.getUint8(12);
    const sel1 = (view.getUint8(21) << 16) | (view.getUint8(22) << 8) | view.getUint8(23);
    expect(sel0).toBe(0xe0100);
    expect(sel1).toBe(0xe0101);

    // Dummy minimal cmap v0 with 1 encoding record (3, 1) -> offset 12, 4-byte body
    const origCmap = new Uint8Array(16);
    const origView = new DataView(origCmap.buffer);
    origView.setUint16(0, 0, false);
    origView.setUint16(2, 1, false);
    origView.setUint16(4, 3, false);
    origView.setUint16(6, 1, false);
    origView.setUint32(8, 12, false);

    const spliced = spliceCmapWithFormat14(origCmap, [
      { baseUnicode: 0x8fbb, selectorCode: 0xe0101, glyphIndex: 9 },
    ]);
    const splicedView = new DataView(spliced.buffer);
    expect(splicedView.getUint16(2, false)).toBe(2);
    // Sorted ascending: (0, 5) comes before (3, 1)
    expect(splicedView.getUint16(4, false)).toBe(0);
    expect(splicedView.getUint16(6, false)).toBe(5);
    expect(splicedView.getUint16(12, false)).toBe(3);
    expect(splicedView.getUint16(14, false)).toBe(1);
    // (3, 1) offset shifted by +8 bytes
    expect(splicedView.getUint32(16, false)).toBe(20);
  });

  it('compiles IVS variants into OTF cmap format 14, sets OS/2 bit 91, and round-trips via loadFontFromFile', async () => {
    const project = makeIvsProject();
    const { buffer } = compileFont(project, {
      scaleFactor: 1.0,
      balanceSideBearings: false,
      skipBlobUrl: true,
    });

    const parsed = opentype.parse(buffer);
    const varSelectorList = (parsed.tables.cmap as any).varSelectorList;
    expect(varSelectorList).toBeDefined();
    const vs18Record = varSelectorList[0xe0101];
    expect(vs18Record).toBeDefined();
    const mapping = vs18Record.nonDefaultUVS?.uvsMappings?.[0x8fbb];
    expect(mapping).toBeDefined();
    expect(mapping.glyphID).toBeGreaterThan(0);

    const baseGlyphIndex = parsed.charToGlyphIndex('辻');
    expect(mapping.glyphID).not.toBe(baseGlyphIndex);

    const variantGlyph = parsed.glyphs.get(mapping.glyphID);
    expect(variantGlyph.name).toBe('uni8FBB.uE0101');
    expect(variantGlyph.unicode).toBeUndefined();
    expect(variantGlyph.path.commands.length).toBeGreaterThan(0);

    // OS/2 ulUnicodeRange3 bit 91 (Variation Selectors) -> bit 91 - 64 = 27
    const uRange3 = (parsed.tables.os2 as any).ulUnicodeRange3 >>> 0;
    expect((uRange3 & (1 << 27)) !== 0).toBe(true);

    // Round-trip re-import via loadFontFromFile
    const mockFile = {
      name: 'IvsRoundtrip.otf',
      size: buffer.byteLength,
      arrayBuffer: async () => buffer,
    } as unknown as File;
    const imported = await loadFontFromFile(mockFile);

    expect(imported.glyphs[0x8fbb]).toBeDefined();
    const importedKey = formatIvsVariantKey(0x8fbb, 0xe0101);
    expect(imported.ivsVariants?.[importedKey]).toBeDefined();
    expect(imported.ivsVariants?.[importedKey].glyph.contours.length).toBe(2);
    // Variant glyph was imported as IVS, not counted as an orphaned unicode-less glyph
    expect(imported.report.noUnicodeGlyphNames).not.toContain('uni8FBB.uE0101');
  });
});
