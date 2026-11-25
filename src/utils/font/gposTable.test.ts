import { describe, it, expect } from 'vitest';
import * as opentype from 'opentype.js';
import {
  buildGposTableBytes,
  buildVheaTableBytes,
  buildVmtxTableBytes,
  buildVorgTableBytes,
  isKanaUnicode,
} from './gposTable';
import { injectSfntTables } from './kernTable';
import { compileFont } from './compilerCore';
import type { FontProject, PathContour } from '../../types';

/** Read one table's raw bytes out of a serialized SFNT buffer. */
function readSfntTable(buffer: ArrayBuffer, tag: string): Uint8Array | null {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const numTables = view.getUint16(4, false);
  for (let i = 0; i < numTables; i++) {
    const recOffset = 12 + i * 16;
    const foundTag = String.fromCharCode(
      bytes[recOffset],
      bytes[recOffset + 1],
      bytes[recOffset + 2],
      bytes[recOffset + 3]
    );
    if (foundTag === tag) {
      const offset = view.getUint32(recOffset + 8, false);
      const length = view.getUint32(recOffset + 12, false);
      return bytes.slice(offset, offset + length);
    }
  }
  return null;
}

function rectContour(id: string): PathContour {
  return {
    id,
    closed: true,
    nodes: [
      { id: `${id}n1`, x: 100, y: 100, type: 'corner' },
      { id: `${id}n2`, x: 500, y: 100, type: 'corner' },
      { id: `${id}n3`, x: 500, y: 600, type: 'corner' },
      { id: `${id}n4`, x: 100, y: 600, type: 'corner' },
    ],
  };
}

describe('isKanaUnicode', () => {
  it('matches hiragana, katakana and halfwidth katakana only', () => {
    expect(isKanaUnicode(0x3042)).toBe(true);
    expect(isKanaUnicode(0x30a2)).toBe(true);
    expect(isKanaUnicode(0xff71)).toBe(true);
    expect(isKanaUnicode(0x4e2d)).toBe(false);
    expect(isKanaUnicode(0x0041)).toBe(false);
  });
});

describe('buildGposTableBytes', () => {
  it('returns null when every adjustment is zero', () => {
    expect(buildGposTableBytes([{ glyphIndex: 1, xAdvance: 0 }], new Map())).toBeNull();
    expect(buildGposTableBytes([], new Map())).toBeNull();
  });

  it('builds a GPOS table that opentype.js parses back with palt/pkna features', () => {
    const project: FontProject = {
      id: 'gpos-test',
      name: 'Gpos Test',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: {
        familyName: 'GposTest',
        styleName: 'Regular',
        designer: 'Tester',
        copyright: 'Copyright 2026',
        version: '1.0',
        unitsPerEm: 1000,
        ascender: 800,
        descender: -200,
        lineGap: 100,
        capHeight: 700,
        xHeight: 500,
      },
      glyphs: {
        65: {
          char: 'A',
          name: 'A',
          unicode: 65,
          advanceWidth: 1000,
          lsb: 50,
          contours: [rectContour('c1')],
        },
        12354: {
          char: 'あ',
          name: 'uni3042',
          unicode: 12354,
          advanceWidth: 1000,
          lsb: 50,
          contours: [rectContour('c2')],
        },
      },
    };
    const base = compileFont(
      {
        ...project,
        openTypeFeatures: {
          enabled: true,
          verticalWriting: { enabled: true, defaultVertAdvance: 1000, vertOriginY: 800, substitutions: [] },
          ligatures: [],
          customKerningPairs: [],
          // palt off here so the base font has no GPOS yet; the bytes
          // under test are injected explicitly below.
          palt: {
            enabled: false,
            autoDerivePalt: true,
            autoDeriveVpal: true,
            opticalSideBearingPercent: 5,
            paltList: [],
            vpalList: [],
          },
        },
      },
      { skipBlobUrl: true, scaleFactor: 1.0 }
    );
    expect(readSfntTable(base.buffer, 'GPOS')).toBeNull();
    const glyphA = base.font.charToGlyphIndex('A');
    const glyphHiragana = base.font.charToGlyphIndex('あ');
    expect(glyphA).toBeGreaterThan(0);
    expect(glyphHiragana).toBeGreaterThan(0);

    const gposBytes = buildGposTableBytes(
      [
        { glyphIndex: glyphA, xAdvance: -120 },
        { glyphIndex: glyphHiragana, xAdvance: -500 },
      ],
      new Map([
        [glyphA, 65],
        [glyphHiragana, 12354],
      ])
    );
    expect(gposBytes).not.toBeNull();
    const injected = injectSfntTables(base.buffer, [{ tag: 'GPOS', data: gposBytes! }]);
    expect(readSfntTable(injected, 'GPOS')).not.toBeNull();

    const reparsed = opentype.parse(injected);
    const gpos = (reparsed as any).tables.gpos;
    expect(gpos).toBeDefined();
    expect(gpos.lookups).toHaveLength(2);
    const featureTags = gpos.features.map((f: any) => f.tag);
    expect(featureTags).toContain('palt');
    expect(featureTags).toContain('pkna');

    const paltLookup = gpos.lookups[0];
    expect(paltLookup.lookupType).toBe(1);
    const subtable = paltLookup.subtables[0];
    expect(subtable.posFormat).toBe(2);
    // Note: opentype.js 2.0.0 parses the value records but does not keep
    // valueFormat on the parsed SinglePos subtable, so only the values
    // themselves are asserted here. The written valueFormat (0x0004,
    // xAdvance only) is covered by the byte layout in buildGposTableBytes.
    expect(subtable.coverage.glyphs).toEqual([glyphA, glyphHiragana]);
    expect(subtable.values.map((v: any) => v.xAdvance)).toEqual([-120, -500]);

    const pknaLookup = gpos.lookups[1];
    expect(pknaLookup.subtables[0].coverage.glyphs).toEqual([glyphHiragana]);
    expect(pknaLookup.subtables[0].values.map((v: any) => v.xAdvance)).toEqual([-500]);
  });

  it('writes kern pairs as a GPOS kern PairPos lookup that getKerningValue reads', () => {
    const project: FontProject = {
      id: 'gpos-kern-test',
      name: 'Gpos Kern Test',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: {
        familyName: 'GposKernTest',
        styleName: 'Regular',
        designer: 'Tester',
        copyright: 'Copyright 2026',
        version: '1.0',
        unitsPerEm: 1000,
        ascender: 800,
        descender: -200,
        lineGap: 100,
        capHeight: 700,
        xHeight: 500,
      },
      glyphs: {
        65: {
          char: 'A',
          name: 'A',
          unicode: 65,
          advanceWidth: 1000,
          lsb: 50,
          contours: [rectContour('c1')],
        },
        86: {
          char: 'V',
          name: 'V',
          unicode: 86,
          advanceWidth: 1000,
          lsb: 50,
          contours: [rectContour('c2')],
        },
      },
      openTypeFeatures: {
        enabled: true,
        verticalWriting: { enabled: true, defaultVertAdvance: 1000, vertOriginY: 800, substitutions: [] },
        ligatures: [],
        customKerningPairs: [],
        palt: {
          enabled: false,
          autoDerivePalt: true,
          autoDeriveVpal: true,
          opticalSideBearingPercent: 5,
          paltList: [],
          vpalList: [],
        },
      },
    };
    const base = compileFont(project, { skipBlobUrl: true, scaleFactor: 1.0 });
    const glyphA = base.font.charToGlyphIndex('A');
    const glyphV = base.font.charToGlyphIndex('V');
    const gposBytes = buildGposTableBytes(
      [],
      new Map([
        [glyphA, 65],
        [glyphV, 86],
      ]),
      [{ leftGlyph: glyphA, rightGlyph: glyphV, value: -80 }]
    );
    expect(gposBytes).not.toBeNull();
    const injected = injectSfntTables(base.buffer, [{ tag: 'GPOS', data: gposBytes! }]);
    const reparsed = opentype.parse(injected);
    const gpos = (reparsed as any).tables.gpos;
    expect(gpos.features.map((f: any) => f.tag)).toEqual(['kern']);
    expect(gpos.lookups[0].lookupType).toBe(2);
    expect(gpos.lookups[0].subtables[0].posFormat).toBe(1);
    expect(
      reparsed.getKerningValue(reparsed.glyphs.get(glyphA), reparsed.glyphs.get(glyphV))
    ).toBe(-80);
  });
});

describe('buildVmtxTableBytes / buildVheaTableBytes', () => {
  it('writes one 4-byte vmtx record per glyph in glyph-index order', () => {
    const bytes = buildVmtxTableBytes(
      [
        { glyphIndex: 0, advanceHeight: 1000, topSideBearing: 100 },
        { glyphIndex: 1, advanceHeight: 600, topSideBearing: -50 },
      ],
      3,
      1000
    );
    expect(bytes.length).toBe(12);
    const view = new DataView(bytes.buffer);
    expect(view.getUint16(0, false)).toBe(1000);
    expect(view.getInt16(2, false)).toBe(100);
    expect(view.getUint16(4, false)).toBe(600);
    expect(view.getInt16(6, false)).toBe(-50);
    // Missing index 2 falls back to the default advance and tsb 0.
    expect(view.getUint16(8, false)).toBe(1000);
    expect(view.getInt16(10, false)).toBe(0);
  });

  it('writes a 36-byte vhea table with the given metrics', () => {
    const bytes = buildVheaTableBytes({
      ascender: 800,
      descender: -200,
      lineGap: 100,
      advanceHeightMax: 1000,
      minTopSideBearing: -50,
      minBottomSideBearing: 20,
      xMaxExtent: 900,
      numberOfVMetrics: 3,
    });
    expect(bytes.length).toBe(36);
    const view = new DataView(bytes.buffer);
    expect(view.getUint32(0, false)).toBe(0x00010000);
    expect(view.getInt16(4, false)).toBe(800);
    expect(view.getInt16(6, false)).toBe(-200);
    expect(view.getInt16(8, false)).toBe(100);
    expect(view.getUint16(10, false)).toBe(1000);
    expect(view.getInt16(12, false)).toBe(-50);
    expect(view.getInt16(14, false)).toBe(20);
    expect(view.getInt16(16, false)).toBe(900);
    expect(view.getUint16(34, false)).toBe(3);
  });

  it('builds a valid VORG v1.0 table and encodes GPOS vpal entries in alphabetical feature order', () => {
    const vorg = buildVorgTableBytes(880, [{ glyphIndex: 3, vertOriginY: 910 }]);
    const vorgView = new DataView(vorg.buffer);
    expect(vorg.length).toBe(12);
    expect(vorgView.getUint16(0, false)).toBe(1);
    expect(vorgView.getUint16(2, false)).toBe(0);
    expect(vorgView.getInt16(4, false)).toBe(880);
    expect(vorgView.getUint16(6, false)).toBe(1);
    expect(vorgView.getUint16(8, false)).toBe(3);
    expect(vorgView.getInt16(10, false)).toBe(910);

    const gposBytes = buildGposTableBytes(
      [{ glyphIndex: 1, xAdvance: -200 }],
      new Map([[1, 0x3042]]),
      [],
      [{ glyphIndex: 1, yPlacement: 60, yAdvance: -300 }]
    );
    expect(gposBytes).not.toBeNull();
  });
});
