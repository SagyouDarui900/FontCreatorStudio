import { describe, it, expect } from 'vitest';
import * as opentype from 'opentype.js';
import {
  buildKernTableBytes,
  computeSfntCheckSum,
  injectKernTable,
  SFNT_CHECKSUM_TARGET,
  type KernPair,
} from './kernTable';
import { compileFont } from './compilerCore';
import type { FontProject, PathContour } from '../../types';

function rectContour(): PathContour {
  return {
    id: 'c1',
    closed: true,
    nodes: [
      { id: 'n1', x: 100, y: 100, type: 'corner' },
      { id: 'n2', x: 500, y: 100, type: 'corner' },
      { id: 'n3', x: 500, y: 600, type: 'corner' },
      { id: 'n4', x: 100, y: 600, type: 'corner' },
    ],
  };
}

function createProjectWithGlyphs(): FontProject {
  return {
    id: 'kern-test',
    name: 'Kern Test',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    metadata: {
      familyName: 'KernTest',
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
        contours: [rectContour()],
      },
      86: {
        char: 'V',
        name: 'V',
        unicode: 86,
        advanceWidth: 1000,
        lsb: 50,
        contours: [rectContour()],
      },
    },
  };
}

/** Read the SFNT table directory of a serialized font. */
function readTableDirectory(buffer: ArrayBuffer): { tag: string; checkSum: number; offset: number; length: number }[] {
  const view = new DataView(buffer);
  const numTables = view.getUint16(4, false);
  const records: { tag: string; checkSum: number; offset: number; length: number }[] = [];
  for (let i = 0; i < numTables; i++) {
    const off = 12 + i * 16;
    let tag = '';
    for (let j = 0; j < 4; j++) tag += String.fromCharCode(view.getUint8(off + j));
    records.push({
      tag,
      checkSum: view.getUint32(off + 4, false),
      offset: view.getUint32(off + 8, false),
      length: view.getUint32(off + 12, false),
    });
  }
  return records;
}

describe('buildKernTableBytes', () => {
  it('encodes one pair as a 24-byte version-0 kern table with a format-0 subtable', () => {
    const bytes = buildKernTableBytes([{ leftIndex: 1, rightIndex: 2, value: -80 }]);
    expect(bytes.length).toBe(24);
    const view = new DataView(new Uint8Array(bytes).buffer);
    expect(view.getUint16(0, false)).toBe(0); // kern version
    expect(view.getUint16(2, false)).toBe(1); // nTables
    expect(view.getUint16(4, false)).toBe(0); // subtable version
    expect(view.getUint16(6, false)).toBe(20); // subtable length
    expect(view.getUint16(8, false)).toBe(1); // coverage: horizontal
    expect(view.getUint16(10, false)).toBe(1); // nPairs
    expect(view.getUint16(12, false)).toBe(6); // searchRange
    expect(view.getUint16(14, false)).toBe(0); // entrySelector
    expect(view.getUint16(16, false)).toBe(0); // rangeShift
    expect(view.getUint16(18, false)).toBe(1); // left glyph
    expect(view.getUint16(20, false)).toBe(2); // right glyph
    expect(view.getInt16(22, false)).toBe(-80); // value (signed)
  });

  it('sorts pairs and computes the binary-search header for 3 pairs', () => {
    const bytes = buildKernTableBytes([
      { leftIndex: 3, rightIndex: 1, value: 10 },
      { leftIndex: 1, rightIndex: 2, value: -80 },
      { leftIndex: 1, rightIndex: 5, value: 20 },
    ]);
    const view = new DataView(new Uint8Array(bytes).buffer);
    expect(view.getUint16(10, false)).toBe(3);
    expect(view.getUint16(12, false)).toBe(12); // searchRange: 2 * 6
    expect(view.getUint16(14, false)).toBe(1); // entrySelector
    expect(view.getUint16(16, false)).toBe(6); // rangeShift: 18 - 12
    // First pair after sorting is (1, 2, -80).
    expect(view.getUint16(18, false)).toBe(1);
    expect(view.getUint16(20, false)).toBe(2);
    expect(view.getInt16(22, false)).toBe(-80);
  });
});

describe('computeSfntCheckSum', () => {
  it('sums big-endian uint32 words and pads to 4 bytes', () => {
    // 0x00000001 + 0x02030405 (padded 0x06 -> 0x06000000)
    expect(computeSfntCheckSum(new Uint8Array([0, 0, 0, 1, 2, 3, 4, 5, 6]))).toBe(
      (1 + 0x02030405 + 0x06000000) >>> 0
    );
  });
});

describe('injectKernTable', () => {
  it('returns the same buffer when there are no pairs', () => {
    const { buffer } = compileFont(createProjectWithGlyphs(), { skipBlobUrl: true });
    expect(injectKernTable(buffer, [])).toBe(buffer);
  });

  it('inserts a kern table that round-trips through opentype.js', () => {
    const project = createProjectWithGlyphs();
    const { buffer } = compileFont(project, { skipBlobUrl: true });
    const parsed = opentype.parse(buffer);
    const leftIndex = parsed.charToGlyphIndex('A');
    const rightIndex = parsed.charToGlyphIndex('V');
    expect(leftIndex).toBeGreaterThan(0);
    expect(rightIndex).toBeGreaterThan(0);

    const injected = injectKernTable(buffer, [
      { leftIndex, rightIndex, value: -80 },
    ]);

    // The SFNT directory gains a kern record, still sorted by tag.
    const records = readTableDirectory(injected);
    const kern = records.find((r) => r.tag === 'kern');
    expect(kern).toBeDefined();
    expect(kern!.length).toBe(24);
    const tags = records.map((r) => r.tag);
    expect([...tags].sort()).toEqual(tags);
    // The whole-file checksum equals the OpenType target.
    expect(computeSfntCheckSum(new Uint8Array(injected))).toBe(SFNT_CHECKSUM_TARGET);
    // The kern record checksum matches the table bytes.
    const kernBytes = new Uint8Array(injected.slice(kern!.offset, kern!.offset + kern!.length));
    expect(computeSfntCheckSum(kernBytes)).toBe(kern!.checkSum);

    // opentype.js reads the injected kern table back into kerningPairs.
    const reparsed = opentype.parse(injected);
    expect(reparsed.kerningPairs[`${leftIndex},${rightIndex}`]).toBe(-80);
    expect(
      reparsed.getKerningValue(
        reparsed.glyphs.get(leftIndex),
        reparsed.glyphs.get(rightIndex)
      )
    ).toBe(-80);
    // The other glyphs still parse.
    expect(reparsed.charToGlyphIndex('A')).toBe(leftIndex);
    expect(reparsed.charToGlyphIndex('V')).toBe(rightIndex);
  });

  it('replacing an existing kern table keeps the table count', () => {
    const project = createProjectWithGlyphs();
    const { buffer } = compileFont(project, { skipBlobUrl: true });
    const parsed = opentype.parse(buffer);
    const leftIndex = parsed.charToGlyphIndex('A');
    const rightIndex = parsed.charToGlyphIndex('V');
    const pair: KernPair = { leftIndex, rightIndex, value: -80 };

    const once = injectKernTable(buffer, [pair]);
    const twice = injectKernTable(once, [{ ...pair, value: -40 }]);
    expect(readTableDirectory(twice).length).toBe(readTableDirectory(once).length);
    const reparsed = opentype.parse(twice);
    expect(reparsed.kerningPairs[`${leftIndex},${rightIndex}`]).toBe(-40);
    expect(computeSfntCheckSum(new Uint8Array(twice))).toBe(SFNT_CHECKSUM_TARGET);
  });
});
