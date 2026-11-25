import { describe, it, expect } from 'vitest';
import * as opentype from 'opentype.js';
import { compileFont, inferWeightClassFromStyleName } from './compilerCore';
import {
  validateFontProject,
  validateStoredFontProject,
  validateStoredFontProjectWithReport,
  stripInvalidPixelData,
} from './validation';
import { FontProject, PathContour } from '../../types';

function createMockProject(overrides?: Partial<FontProject>): FontProject {
  return {
    id: 'test-project',
    name: 'Test Project',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    metadata: {
      familyName: 'TestFont',
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
    glyphs: {},
    ...overrides,
  };
}

describe('Font Project Validation & Compilation', () => {
  it('validates an empty font project and produces warning without error', () => {
    const project = createMockProject();
    const result = validateFontProject(project);

    expect(result.valid).toBe(true);
    expect(result.glyphCount).toBe(0);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.errors.length).toBe(0);
  });

  it('compiles an empty font project into valid font with .notdef and space glyphs', () => {
    const project = createMockProject();
    const compiled = compileFont(project, { skipBlobUrl: true });

    expect(compiled).toBeDefined();
    expect(compiled.font).toBeDefined();
    expect(compiled.font.glyphs.length).toBeGreaterThanOrEqual(2); // .notdef, space, space.fullwidth
    expect(compiled.buffer).toBeInstanceOf(ArrayBuffer);
    expect(compiled.buffer.byteLength).toBeGreaterThan(256);
  });

  it('compiles a single rectangular contour into OTF bytes with valid advanceWidth', () => {
    const rectContour: PathContour = {
      id: 'c1',
      closed: true,
      nodes: [
        { id: 'n1', x: 100, y: 100, type: 'corner' },
        { id: 'n2', x: 500, y: 100, type: 'corner' },
        { id: 'n3', x: 500, y: 600, type: 'corner' },
        { id: 'n4', x: 100, y: 600, type: 'corner' },
      ],
    };

    const project = createMockProject({
      glyphs: {
        65: {
          char: 'A',
          name: 'A',
          unicode: 65,
          advanceWidth: 1000,
          lsb: 50,
          contours: [rectContour],
        },
      },
    });

    const compiled = compileFont(project, { skipBlobUrl: true, scaleFactor: 1.0 });

    expect(compiled.font).toBeDefined();
    expect(compiled.buffer.byteLength).toBeGreaterThan(512);

    // Verify glyph 'A' is found in opentype.Font
    const glyphIndex = compiled.font.charToGlyphIndex('A');
    expect(glyphIndex).toBeGreaterThan(0);

    const glyphA = compiled.font.glyphs.get(glyphIndex);
    expect(glyphA.unicode).toBe(65);
    expect(glyphA.advanceWidth).toBe(1000);
    expect(glyphA.path.commands.length).toBeGreaterThanOrEqual(5); // moveTo, 3 lineTo, close
  });

  it('handles multiple overlapping contours and standardizes winding without crashing', () => {
    const c1: PathContour = {
      id: 'c1',
      closed: true,
      nodes: [
        { id: 'n1', x: 200, y: 200, type: 'corner' },
        { id: 'n2', x: 600, y: 200, type: 'corner' },
        { id: 'n3', x: 600, y: 600, type: 'corner' },
        { id: 'n4', x: 200, y: 600, type: 'corner' },
      ],
    };
    const c2: PathContour = {
      id: 'c2',
      closed: true,
      nodes: [
        { id: 'n5', x: 400, y: 400, type: 'corner' },
        { id: 'n6', x: 800, y: 400, type: 'corner' },
        { id: 'n7', x: 800, y: 800, type: 'corner' },
        { id: 'n8', x: 400, y: 800, type: 'corner' },
      ],
    };

    const project = createMockProject({
      glyphs: {
        66: {
          char: 'B',
          name: 'B',
          unicode: 66,
          advanceWidth: 1000,
          lsb: 50,
          contours: [c1, c2],
        },
      },
    });

    const compiled = compileFont(project, { skipBlobUrl: true, normalizeWinding: true });
    expect(compiled.buffer.byteLength).toBeGreaterThan(512);
  });

  it('throws a validation error for NaN node coordinates instead of compiling', () => {
    const invalidContour: PathContour = {
      id: 'c_nan',
      closed: true,
      nodes: [
        { id: 'n1', x: NaN, y: 100, type: 'corner' },
        { id: 'n2', x: 300, y: NaN, type: 'corner' },
        { id: 'n3', x: 300, y: 300, type: 'corner' },
      ],
    };

    const project = createMockProject({
      metadata: {
        familyName: 'NanFont',
        styleName: 'Regular',
        designer: 'Tester',
        copyright: 'Copyright 2026',
        version: '1.0',
        lineGap: 100,
        capHeight: 700,
        xHeight: 500,
        ascender: 800,
        descender: -200,
        unitsPerEm: 0 as any, // invalid 0 unitsPerEm
      },
      glyphs: {
        67: {
          char: 'C',
          name: 'C',
          unicode: 67,
          advanceWidth: 0, // invalid 0 advanceWidth
          lsb: 0,
          contours: [invalidContour],
        },
      },
    });

    expect(() => {
      compileFont(project, { skipBlobUrl: true });
    }).toThrow(/フォントの検証に失敗しました/);
  });

  it('compiles a glyph with empty contours without throwing', () => {
    const project = createMockProject({
      glyphs: {
        12354: {
          char: 'あ',
          name: 'uni3042',
          unicode: 12354,
          advanceWidth: 1000,
          lsb: 50,
          contours: [],
        },
      },
    });

    const compiled = compileFont(project, { skipBlobUrl: true });
    expect(compiled.buffer).toBeInstanceOf(ArrayBuffer);
    expect(compiled.buffer.byteLength).toBeGreaterThan(256);
    expect(compiled.font.charToGlyphIndex('あ')).toBeGreaterThan(0);
  });

  it('reports validation errors for NaN node coordinates without throwing', () => {
    const project = createMockProject({
      glyphs: {
        68: {
          char: 'D',
          name: 'D',
          unicode: 68,
          advanceWidth: 1000,
          lsb: 50,
          contours: [
            {
              id: 'c_bad',
              closed: true,
              nodes: [
                { id: 'n1', x: NaN, y: 100, type: 'corner' },
                { id: 'n2', x: 300, y: 100, type: 'corner' },
                { id: 'n3', x: 300, y: 300, type: 'corner' },
              ],
            },
          ],
        },
      },
    });

    const validation = validateFontProject(project);
    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });

  it('includes removed counts in the validation result', () => {
    const project = createMockProject();
    const result = validateFontProject(project);
    expect(result.removed).toEqual({
      glyphs: 0,
      nodes: 0,
      contours: 0,
      replacedAdvanceWidth: 0,
      replacedLsb: 0,
      removedPixelData: 0,
      replacedMetadata: 0,
      droppedKerning: 0,
    });
  });

  it('rejects pixelData whose length does not match width * height', () => {
    const project = createMockProject({
      glyphs: {
        65: {
          char: 'A',
          name: 'A',
          unicode: 65,
          advanceWidth: 1000,
          lsb: 50,
          contours: [],
          pixelData: { width: 2, height: 2, data: [1, 0, 1] },
        },
      },
    });
    const validation = validateFontProject(project);
    expect(validation.valid).toBe(false);
    expect(validation.removed.removedPixelData).toBe(1);
    expect(validation.errors.some((e) => e.includes('ピクセルデータ'))).toBe(true);
  });

  it('compiles the remaining glyphs when one glyph has broken pixelData', () => {
    const rect: PathContour = {
      id: 'c1',
      closed: true,
      nodes: [
        { id: 'n1', x: 100, y: 100, type: 'corner' },
        { id: 'n2', x: 500, y: 100, type: 'corner' },
        { id: 'n3', x: 500, y: 600, type: 'corner' },
        { id: 'n4', x: 100, y: 600, type: 'corner' },
      ],
    };
    const project = createMockProject({
      glyphs: {
        65: {
          char: 'A',
          name: 'A',
          unicode: 65,
          advanceWidth: 1000,
          lsb: 50,
          contours: [],
          pixelData: { width: 2, height: 2, data: [1, 0, 1] },
        },
        66: {
          char: 'B',
          name: 'B',
          unicode: 66,
          advanceWidth: 1000,
          lsb: 50,
          contours: [rect],
        },
      },
    });
    const { project: stripped, excluded } = stripInvalidPixelData(project);
    expect(excluded).toEqual(['A']);
    expect(stripped.glyphs[65].pixelData).toBeUndefined();
    expect(stripped.glyphs[66].contours).toHaveLength(1);
    const compiled = compileFont(project, { skipBlobUrl: true });
    expect(compiled.font.glyphs.length).toBeGreaterThanOrEqual(3);
    expect(compiled.font.hasChar('B')).toBe(true);
  });

  it('warns when pixel glyphs use different grid sizes', () => {
    const project = createMockProject({
      glyphs: {
        65: {
          char: 'A',
          name: 'A',
          unicode: 65,
          advanceWidth: 1000,
          lsb: 50,
          contours: [],
          pixelData: { width: 8, height: 8, data: new Array(64).fill(0) },
        },
        66: {
          char: 'B',
          name: 'B',
          unicode: 66,
          advanceWidth: 1000,
          lsb: 50,
          contours: [],
          pixelData: { width: 16, height: 16, data: new Array(256).fill(0) },
        },
      },
    });
    const validation = validateFontProject(project);
    expect(validation.valid).toBe(true);
    expect(validation.warnings.some((w) => w.includes('グリッドサイズが混在'))).toBe(true);
  });

  it('rejects out-of-range, zero and duplicate Unicode values', () => {
    const rect = (id: string): PathContour => ({
      id,
      closed: true,
      nodes: [
        { id: `${id}n1`, x: 100, y: 100, type: 'corner' },
        { id: `${id}n2`, x: 500, y: 100, type: 'corner' },
        { id: `${id}n3`, x: 500, y: 600, type: 'corner' },
        { id: `${id}n4`, x: 100, y: 600, type: 'corner' },
      ],
    });
    const project = createMockProject({
      glyphs: {
        65: { char: 'A', name: 'A', unicode: 65, advanceWidth: 1000, lsb: 50, contours: [rect('c1')] },
        66: { char: 'A', name: 'A2', unicode: 65, advanceWidth: 1000, lsb: 50, contours: [rect('c2')] },
        67: { char: '', name: 'bad', unicode: 0x110000, advanceWidth: 1000, lsb: 50, contours: [rect('c3')] },
      },
    });
    const validation = validateFontProject(project);
    expect(validation.valid).toBe(false);
    expect(validation.removed.glyphs).toBe(2);
  });

  it('rejects a glyph whose storage key does not match its unicode', () => {
    const project = createMockProject({
      glyphs: {
        65: {
          char: 'B',
          name: 'B',
          unicode: 66,
          advanceWidth: 1000,
          lsb: 50,
          contours: [],
        },
      },
    });
    const validation = validateFontProject(project);
    expect(validation.valid).toBe(false);
    expect(validation.removed.glyphs).toBe(1);
  });

  it('warns on two-node and zero-area contours without stopping export', () => {
    const project = createMockProject({
      glyphs: {
        65: {
          char: 'A',
          name: 'A',
          unicode: 65,
          advanceWidth: 1000,
          lsb: 50,
          contours: [
            {
              id: 'c2',
              closed: true,
              nodes: [
                { id: 'n1', x: 100, y: 100, type: 'corner' },
                { id: 'n2', x: 500, y: 100, type: 'corner' },
              ],
            },
            {
              id: 'c3',
              closed: true,
              nodes: [
                { id: 'n1', x: 200, y: 200, type: 'corner' },
                { id: 'n2', x: 200, y: 200, type: 'corner' },
                { id: 'n3', x: 200, y: 200, type: 'corner' },
              ],
            },
          ],
        },
      },
    });
    const validation = validateFontProject(project);
    expect(validation.valid).toBe(true);
    expect(validation.warnings.some((w) => w.includes('2つだけ'))).toBe(true);
    expect(validation.warnings.some((w) => w.includes('同一座標'))).toBe(true);
  });

  it('warns on invalid advanceWidth and lsb and counts the replacements', () => {
    const project = createMockProject({
      glyphs: {
        65: {
          char: 'A',
          name: 'A',
          unicode: 65,
          advanceWidth: NaN,
          lsb: Infinity,
          contours: [],
        },
      },
    });
    const validation = validateFontProject(project);
    expect(validation.valid).toBe(true);
    expect(validation.removed.replacedAdvanceWidth).toBe(1);
    expect(validation.removed.replacedLsb).toBe(1);
  });

  it('warns on kerning that references a missing glyph', () => {
    const project = createMockProject({
      kerning: { 'A,V': -100 },
      glyphs: {
        65: {
          char: 'A',
          name: 'A',
          unicode: 65,
          advanceWidth: 1000,
          lsb: 50,
          contours: [],
        },
      },
    });
    const validation = validateFontProject(project);
    expect(validation.valid).toBe(true);
    expect(validation.warnings.some((w) => w.includes('A,V'))).toBe(true);
  });

  it('rejects a custom kerning pair with an invalid Unicode value in Japanese', () => {
    const project = createMockProject({
      openTypeFeatures: {
        enabled: true,
        verticalWriting: { enabled: false, defaultVertAdvance: 1000, vertOriginY: 800, substitutions: [] },
        ligatures: [],
        customKerningPairs: [
          { id: 'k1', firstUnicode: 0x110000, secondUnicode: 65, amount: -100, enabled: true },
        ],
      },
    });
    const validation = validateFontProject(project);
    expect(validation.valid).toBe(false);
    expect(validation.errors.some((e) => e.includes('カーニングペア'))).toBe(true);
    expect(() => compileFont(project, { skipBlobUrl: true })).toThrow(/フォントの検証に失敗しました/);
    expect(() => compileFont(project, { skipBlobUrl: true })).not.toThrow(/RangeError/);
  });

  it('counts removed and replaced items when sanitizing a stored project', () => {
    const report = validateStoredFontProjectWithReport({
      metadata: {
        familyName: 'Test',
        styleName: 'Regular',
        unitsPerEm: 1000,
        ascender: 'bad',
        descender: -200,
        capHeight: 700,
        xHeight: 500,
        lineGap: 100,
      },
      glyphs: {
        65: {
          unicode: 65,
          char: 'A',
          name: 'A',
          advanceWidth: 'bad',
          lsb: 50,
          contours: [
            {
              id: 'c1',
              closed: true,
              nodes: [
                { id: 'n1', x: 100, y: 100, type: 'corner' },
                { id: 'n2', x: NaN, y: 100, type: 'corner' },
                { id: 'n3', x: 300, y: 300, type: 'corner' },
              ],
            },
          ],
          pixelData: { width: 2, height: 2, data: [1, 0, 1] },
        },
        bad: { unicode: 66, char: 'B', name: 'B', advanceWidth: 1000, lsb: 50, contours: [] },
      },
      kerning: { 'A,V': 'bad', 'A,T': -50 },
    });
    expect(report).not.toBeNull();
    expect(report!.removed.glyphs).toBe(1);
    expect(report!.removed.nodes).toBe(1);
    expect(report!.removed.replacedAdvanceWidth).toBe(1);
    expect(report!.removed.removedPixelData).toBe(1);
    expect(report!.project.metadata.ascender).toBe(800);
    expect(report!.project.kerning).toEqual({ 'A,T': -50 });
    expect(report!.warnings.length).toBeGreaterThan(0);
    // The plain entry point keeps the FontProject shape for existing callers.
    expect(validateStoredFontProject(report!.project)).not.toBeNull();
  });

  it('infers full 100-900 usWeightClass range and avoids setting RIBBI Bold flag for SemiBold', () => {
    expect(inferWeightClassFromStyleName('Thin')).toBe(100);
    expect(inferWeightClassFromStyleName('ExtraLight')).toBe(200);
    expect(inferWeightClassFromStyleName('Light')).toBe(300);
    expect(inferWeightClassFromStyleName('Regular')).toBe(400);
    expect(inferWeightClassFromStyleName('Medium')).toBe(500);
    expect(inferWeightClassFromStyleName('SemiBold')).toBe(600);
    expect(inferWeightClassFromStyleName('Bold')).toBe(700);
    expect(inferWeightClassFromStyleName('ExtraBold')).toBe(800);
    expect(inferWeightClassFromStyleName('Heavy')).toBe(900);

    const semiBoldProj = createMockProject({
      metadata: {
        ...createMockProject().metadata,
        styleName: 'SemiBold',
        usWeightClass: undefined,
      },
    });
    const semiCompiled = compileFont(semiBoldProj, { skipBlobUrl: true });
    expect(semiCompiled.font.tables.os2.usWeightClass).toBe(600);
    expect(semiCompiled.font.tables.os2.fsSelection & 0x0020).toBe(0); // Not RIBBI Bold

    const italicBoldProj = createMockProject({
      metadata: {
        ...createMockProject().metadata,
        styleName: 'Bold Italic',
        usWeightClass: undefined,
      },
    });
    const boldItalicCompiled = compileFont(italicBoldProj, { skipBlobUrl: true });
    expect(boldItalicCompiled.font.tables.os2.usWeightClass).toBe(700);
    expect(boldItalicCompiled.font.tables.os2.fsSelection & 0x0020).toBe(0x0020);
    expect(boldItalicCompiled.font.tables.os2.fsSelection & 0x0001).toBe(0x0001);
  });
});

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

describe('compileFont with palt / vpal (H1)', () => {
  const rect = (id: string): PathContour => ({
    id,
    closed: true,
    nodes: [
      { id: `${id}n1`, x: 100, y: 100, type: 'corner' },
      { id: `${id}n2`, x: 500, y: 100, type: 'corner' },
      { id: `${id}n3`, x: 500, y: 600, type: 'corner' },
      { id: `${id}n4`, x: 100, y: 600, type: 'corner' },
    ],
  });

  function paltProject(percent: number, withConfig = true): FontProject {
    const base = createMockProject({
      glyphs: {
        12354: {
          char: 'あ',
          name: 'uni3042',
          unicode: 12354,
          advanceWidth: 1000,
          lsb: 50,
          contours: [rect('c1')],
        },
      },
    });
    if (!withConfig) return base;
    return {
      ...base,
      openTypeFeatures: {
        enabled: true,
        verticalWriting: { enabled: true, defaultVertAdvance: 1000, vertOriginY: 800, substitutions: [] },
        ligatures: [],
        customKerningPairs: [],
        palt: {
          enabled: true,
          autoDerivePalt: true,
          autoDeriveVpal: true,
          opticalSideBearingPercent: percent,
          paltList: [],
          vpalList: [],
        },
      },
    };
  }

  it('writes a GPOS palt/pkna table with the derived advance adjustment', () => {
    // Glyph outline is 400 wide in a 1000 advance; 5% padding (50 each
    // side) gives proportionalAdvance 500, so xAdvance is -500.
    const compiled = compileFont(paltProject(5), { skipBlobUrl: true, scaleFactor: 1.0 });
    expect(readSfntTable(compiled.buffer, 'GPOS')).not.toBeNull();
    const reparsed = opentype.parse(compiled.buffer);
    const gpos = (reparsed as any).tables.gpos;
    expect(gpos).toBeDefined();
    expect(gpos.features.map((f: any) => f.tag)).toEqual(
      expect.arrayContaining(['palt', 'pkna'])
    );
    const paltLookup = gpos.lookups[0];
    expect(paltLookup.lookupType).toBe(1);
    expect(paltLookup.subtables[0].values.map((v: any) => v.xAdvance)).toEqual([-500]);
  });

  it('writes full-em vmtx, centered vhea, VORG, and GPOS vpal tables without corrupting beta metrics', () => {
    const compiled = compileFont(paltProject(5), { skipBlobUrl: true, scaleFactor: 1.0 });
    const vmtx = readSfntTable(compiled.buffer, 'vmtx');
    const vhea = readSfntTable(compiled.buffer, 'vhea');
    const vorg = readSfntTable(compiled.buffer, 'VORG');
    expect(vmtx).not.toBeNull();
    expect(vhea).not.toBeNull();
    expect(vorg).not.toBeNull();
    // Glyph order: .notdef, あ, space, fullwidth space.
    expect(vmtx!.length).toBe(16);
    const vmtxView = new DataView(vmtx!.buffer);
    // vmtx retains defaultVertAdvance (1000) so beta typesetting never overlaps;
    // top side bearing is vertOriginY 800 minus the outline top (700) = 100.
    expect(vmtxView.getUint16(4, false)).toBe(1000);
    expect(vmtxView.getInt16(6, false)).toBe(100);
    const vheaView = new DataView(vhea!.buffer);
    expect(vhea!.length).toBe(36);
    expect(vheaView.getInt16(4, false)).toBe(500);
    expect(vheaView.getInt16(6, false)).toBe(-500);
    expect(vheaView.getUint16(10, false)).toBe(1000);
    expect(vheaView.getUint16(34, false)).toBe(4);
    // VORG v1.0 header: major 1, minor 0, defaultVertOriginY 800, numVertOriginYMetrics 0
    const vorgView = new DataView(vorg!.buffer);
    expect(vorg!.length).toBe(8);
    expect(vorgView.getUint16(0, false)).toBe(1);
    expect(vorgView.getInt16(4, false)).toBe(800);
    // GPOS includes vpal with yAdvance -400 and yPlacement +50
    const reparsed = opentype.parse(compiled.buffer);
    const gpos = (reparsed as any).tables.gpos;
    expect(gpos.features.map((f: any) => f.tag)).toContain('vpal');
    const vpalFeature = gpos.features.find((f: any) => f.tag === 'vpal');
    const vpalLookup = gpos.lookups[vpalFeature.feature.lookupListIndexes[0]];
    expect(vpalLookup.subtables[0].values).toEqual([{ yPlacement: 50, yAdvance: -400 }]);
  });

  it('applies palt even when the project has no openTypeFeatures config', () => {
    const compiled = compileFont(paltProject(5, false), { skipBlobUrl: true, scaleFactor: 1.0 });
    const reparsed = opentype.parse(compiled.buffer);
    expect((reparsed as any).tables.gpos).toBeDefined();
    expect(readSfntTable(compiled.buffer, 'vmtx')).not.toBeNull();
  });

  it('keeps an explicit opticalSideBearingPercent of 0 instead of falling back to 5', () => {
    // 0% padding: proportionalAdvance is the bare outline width 400.
    const compiled = compileFont(paltProject(0), { skipBlobUrl: true, scaleFactor: 1.0 });
    const reparsed = opentype.parse(compiled.buffer);
    const gpos = (reparsed as any).tables.gpos;
    expect(gpos.lookups[0].subtables[0].values.map((v: any) => v.xAdvance)).toEqual([-600]);
  });
});

describe('compileFont vertical derivations with saved presets (H2)', () => {
  it('keeps compiler derivations after the preset substitution list is saved', async () => {
    const { DEFAULT_VERT_PRESETS } = await import(
      '../../components/openTypeFeatures/openTypePresets'
    );
    const rect = (id: string): PathContour => ({
      id,
      closed: true,
      nodes: [
        { id: `${id}n1`, x: 100, y: 100, type: 'corner' },
        { id: `${id}n2`, x: 500, y: 100, type: 'corner' },
        { id: `${id}n3`, x: 500, y: 600, type: 'corner' },
        { id: `${id}n4`, x: 100, y: 600, type: 'corner' },
      ],
    });
    const sources: [number, string][] = [
      [0x3001, '、'],
      [0xff08, '（'],
      [0x301c, '〜'],
      [0x2015, '―'],
      [0x2026, '…'],
      [0x007b, '｛'],
    ];
    const glyphs: Record<number, any> = {};
    for (const [unicode, char] of sources) {
      glyphs[unicode] = {
        char,
        name: `uni${unicode.toString(16).toUpperCase()}`,
        unicode,
        advanceWidth: 1000,
        lsb: 50,
        contours: [rect(`c${unicode}`)],
      };
    }
    const project = createMockProject({
      glyphs,
      openTypeFeatures: {
        enabled: true,
        verticalWriting: {
          enabled: true,
          defaultVertAdvance: 1000,
          vertOriginY: 800,
          substitutions: DEFAULT_VERT_PRESETS.map((p, idx) => ({
            id: `vsub_${idx}`,
            sourceUnicode: p.sourceUnicode,
            vertUnicode: p.vertUnicode,
            enabled: true,
          })),
        },
        ligatures: [],
        customKerningPairs: [],
      },
    });
    const compiled = compileFont(project, { skipBlobUrl: true, scaleFactor: 1.0 });
    // Every compiler derivation survives the saved preset list.
    // (Checked by code point, not by literal: several vertical-form
    // characters have look-alikes, e.g. U+FE34 vs U+FE4F.)
    for (const vertUnicode of [0xfe11, 0xfe35, 0xfe4f, 0xfe33, 0xfe19, 0xfe37]) {
      expect(compiled.font.hasChar(String.fromCodePoint(vertUnicode))).toBe(true);
    }
    // The old wrong preset target for 、 (U+FE10) is not generated.
    expect(compiled.font.hasChar(String.fromCodePoint(0xfe10))).toBe(false);
  });
});

describe('compileFont OS/2 average width (M28)', () => {
  const rect = (id: string): PathContour => ({
    id,
    closed: true,
    nodes: [
      { id: `${id}n1`, x: 100, y: 100, type: 'corner' },
      { id: `${id}n2`, x: 500, y: 100, type: 'corner' },
      { id: `${id}n3`, x: 500, y: 600, type: 'corner' },
      { id: `${id}n4`, x: 100, y: 600, type: 'corner' },
    ],
  });

  it('averages advance width over the same glyph set it sums', () => {
    const glyphs: Record<number, any> = {};
    for (const [unicode, char] of [
      [0x3042, 'あ'],
      [0x3044, 'い'],
      [0x3046, 'う'],
      [0x3048, 'え'],
      [0x304a, 'お'],
    ] as const) {
      glyphs[unicode] = {
        char,
        name: `uni${unicode.toString(16)}`,
        unicode,
        advanceWidth: 1000,
        lsb: 50,
        contours: [rect(`c${unicode}`)],
      };
    }
    const compiled = compileFont(createMockProject({ glyphs }), {
      skipBlobUrl: true,
      scaleFactor: 1.0,
    });
    // (5 x 1000 + 500 space + 1000 fullwidth space) / 7 glyphs = 929.
    // .notdef (600) is in neither the sum nor the count.
    expect(compiled.font.tables.os2.xAvgCharWidth).toBe(929);
  });

  it('includes vertical derivations in the average and in advanceWidthMax', () => {
    const project = createMockProject({
      glyphs: {
        0x3042: {
          char: 'あ',
          name: 'uni3042',
          unicode: 0x3042,
          advanceWidth: 500,
          lsb: 50,
          contours: [rect('c1')],
        },
        0x3001: {
          char: '、',
          name: 'uni3001',
          unicode: 0x3001,
          advanceWidth: 500,
          lsb: 50,
          contours: [rect('c2')],
        },
      },
    });
    const compiled = compileFont(project, { skipBlobUrl: true, scaleFactor: 1.0 });
    // (500 + 500 + 500 space + 1000 fullwidth space + 1000 vert FE11) / 5 = 700.
    expect(compiled.font.tables.os2.xAvgCharWidth).toBe(700);
    // The vertical derivation's 1000 advance is the maximum.
    expect(compiled.font.tables.hhea.advanceWidthMax).toBe(1000);
  });
});

describe('compileFont unitsPerEm scaling (M29)', () => {
  it('scales .notdef, ascender/descender fallbacks and space widths with UPM', () => {
    const project = createMockProject({
      metadata: {
        familyName: 'TestFont',
        styleName: 'Regular',
        designer: 'Tester',
        copyright: 'Copyright 2026',
        version: '1.0',
        unitsPerEm: 2048,
      } as any,
      glyphs: {},
    });
    const compiled = compileFont(project, { skipBlobUrl: true });
    expect(compiled.font.unitsPerEm).toBe(2048);
    // Fallback ascender is 80% of UPM; fallback descender is ascender - UPM.
    expect(compiled.font.ascender).toBe(1638);
    expect(compiled.font.descender).toBe(-410);
    expect(compiled.font.glyphs.get(0).advanceWidth).toBe(1229);
    expect(compiled.font.glyphs.get(compiled.font.charToGlyphIndex(' ')).advanceWidth).toBe(1024);
    expect(
      compiled.font.glyphs.get(compiled.font.charToGlyphIndex('　')).advanceWidth
    ).toBe(2048);
  });

  it('uses the clamped UPM, not the raw metadata value, for fallbacks', () => {
    const project = createMockProject({
      metadata: {
        familyName: 'TestFont',
        styleName: 'Regular',
        designer: 'Tester',
        copyright: 'Copyright 2026',
        version: '1.0',
        unitsPerEm: 20000,
        ascender: 800,
        descender: -200,
      } as any,
      glyphs: {},
    });
    const compiled = compileFont(project, { skipBlobUrl: true });
    expect(compiled.font.unitsPerEm).toBe(16384);
    expect(compiled.font.glyphs.get(compiled.font.charToGlyphIndex(' ')).advanceWidth).toBe(8192);
    expect(
      compiled.font.glyphs.get(compiled.font.charToGlyphIndex('　')).advanceWidth
    ).toBe(16384);
  });
});

describe('compileFont fsSelection REGULAR bit (M32)', () => {
  it('does not set REGULAR for Medium / SemiBold weights', () => {
    for (const styleName of ['Medium', 'SemiBold']) {
      const project = createMockProject({
        metadata: {
          ...createMockProject().metadata,
          styleName,
          usWeightClass: undefined,
        },
      });
      const compiled = compileFont(project, { skipBlobUrl: true });
      expect(compiled.font.tables.os2.fsSelection & 0x0040).toBe(0);
    }
  });

  it('sets REGULAR for a true Regular weight', () => {
    const compiled = compileFont(createMockProject(), { skipBlobUrl: true });
    expect(compiled.font.tables.os2.fsSelection & 0x0040).toBe(0x0040);
  });

  it('reconciles a Bold style name with a stored weight class of 400', () => {
    const project = createMockProject({
      metadata: {
        ...createMockProject().metadata,
        styleName: 'Bold',
        usWeightClass: 400,
      },
    });
    const compiled = compileFont(project, { skipBlobUrl: true });
    expect(compiled.font.tables.os2.usWeightClass).toBe(700);
    expect(compiled.font.tables.os2.fsSelection & 0x0020).toBe(0x0020);
    expect(compiled.font.tables.os2.fsSelection & 0x0040).toBe(0);
  });
});
describe('compileFont with kerning', () => {
  it('compiles a project with valid kerning pairs and writes a kern table', () => {
    const rectContour: PathContour = {
      id: 'c1',
      closed: true,
      nodes: [
        { id: 'n1', x: 100, y: 100, type: 'corner' },
        { id: 'n2', x: 500, y: 100, type: 'corner' },
        { id: 'n3', x: 500, y: 600, type: 'corner' },
        { id: 'n4', x: 100, y: 600, type: 'corner' },
      ],
    };
    const project = createMockProject({
      glyphs: {
        65: {
          char: 'A',
          name: 'A',
          unicode: 65,
          advanceWidth: 1000,
          lsb: 50,
          contours: [rectContour],
        },
        86: {
          char: 'V',
          name: 'V',
          unicode: 86,
          advanceWidth: 1000,
          lsb: 50,
          contours: [rectContour],
        },
      },
      kerning: { 'A,V': -80 },
    });

    // Regression: this used to throw "カーニングテーブルの生成に失敗しました"
    // because opentype.js 2.0.0 does not export Table and never writes a
    // kern table.
    const compiled = compileFont(project, { skipBlobUrl: true });
    expect(compiled.buffer.byteLength).toBeGreaterThan(512);

    const reparsed = opentype.parse(compiled.buffer);
    const leftIndex = reparsed.charToGlyphIndex('A');
    const rightIndex = reparsed.charToGlyphIndex('V');
    expect(leftIndex).toBeGreaterThan(0);
    expect(rightIndex).toBeGreaterThan(0);
    expect(reparsed.kerningPairs[`${leftIndex},${rightIndex}`]).toBe(-80);
    expect(
      reparsed.getKerningValue(
        reparsed.glyphs.get(leftIndex),
        reparsed.glyphs.get(rightIndex)
      )
    ).toBe(-80);
  });
});

describe('compileFont hhea metrics (L35)', () => {
  const rect = (x0: number, y0: number, x1: number, y1: number): PathContour => ({
    id: 'c1',
    closed: true,
    nodes: [
      { id: 'n1', x: x0, y: y0, type: 'corner' },
      { id: 'n2', x: x1, y: y0, type: 'corner' },
      { id: 'n3', x: x1, y: y1, type: 'corner' },
      { id: 'n4', x: x0, y: y1, type: 'corner' },
    ],
  });

  it('computes hhea side bearings and extent from the actual outlines, in memory and in the binary', () => {
    // A: outline 100..400, advance 500 (LSB 100, RSB 100, extent 400).
    // あ: outline -50..600, advance 500 (LSB -50, RSB -100, extent 600).
    const project = createMockProject({
      glyphs: {
        65: { char: 'A', name: 'A', unicode: 65, advanceWidth: 500, lsb: 100, contours: [rect(100, 100, 400, 600)] },
        0x3042: { char: 'あ', name: 'a', unicode: 0x3042, advanceWidth: 500, lsb: -50, contours: [rect(-50, 100, 600, 600)] },
      },
    });
    const compiled = compileFont(project, { skipBlobUrl: true, scaleFactor: 1.0, balanceSideBearings: false });
    const expected = {
      advanceWidthMax: 1000, // synthetic fullwidth space
      minLeftSideBearing: -50,
      minRightSideBearing: -100,
      xMaxExtent: 600,
    };
    expect(compiled.font.tables.hhea.advanceWidthMax).toBe(expected.advanceWidthMax);
    expect(compiled.font.tables.hhea.minLeftSideBearing).toBe(expected.minLeftSideBearing);
    expect(compiled.font.tables.hhea.minRightSideBearing).toBe(expected.minRightSideBearing);
    expect(compiled.font.tables.hhea.xMaxExtent).toBe(expected.xMaxExtent);
    const reparsed: any = opentype.parse(compiled.buffer);
    expect(reparsed.tables.hhea.advanceWidthMax).toBe(expected.advanceWidthMax);
    expect(reparsed.tables.hhea.minLeftSideBearing).toBe(expected.minLeftSideBearing);
    expect(reparsed.tables.hhea.minRightSideBearing).toBe(expected.minRightSideBearing);
    expect(reparsed.tables.hhea.xMaxExtent).toBe(expected.xMaxExtent);
    // The hmtx side bearings are no longer all zero either: a parsed
    // glyph carries the hmtx left side bearing.
    const aIndex = reparsed.charToGlyphIndex('A');
    expect(reparsed.glyphs.get(aIndex).leftSideBearing).toBe(100);
  });
});

describe('compileFont OS/2 unicode and code page ranges (L36)', () => {
  const rect: PathContour = {
    id: 'c1',
    closed: true,
    nodes: [
      { id: 'n1', x: 100, y: 100, type: 'corner' },
      { id: 'n2', x: 500, y: 100, type: 'corner' },
      { id: 'n3', x: 500, y: 600, type: 'corner' },
      { id: 'n4', x: 100, y: 600, type: 'corner' },
    ],
  };
  const glyph = (unicode: number, char: string) => ({
    char,
    name: `uni${unicode.toString(16)}`,
    unicode,
    advanceWidth: 1000,
    lsb: 50,
    contours: [rect],
  });

  it('does not claim Japanese ranges or Shift-JIS for a Latin-only font', () => {
    const compiled = compileFont(
      createMockProject({ glyphs: { 65: glyph(65, 'A'), 66: glyph(66, 'B') } }),
      { skipBlobUrl: true, scaleFactor: 1.0 }
    );
    const reparsed: any = opentype.parse(compiled.buffer);
    const os2 = reparsed.tables.os2;
    expect(os2.ulUnicodeRange1 & 1).toBe(1); // Basic Latin (space exists)
    expect(os2.ulUnicodeRange2 & 0x00060000).toBe(0); // no Hiragana / Katakana
    expect(os2.ulUnicodeRange2 & 0x08000000).toBe(0); // no CJK Unified Ideographs
    expect(os2.ulCodePageRange1 & (1 << 17)).toBe(0); // no Shift-JIS (932)
    expect(os2.ulCodePageRange1 & 1).toBe(1); // 1252 Latin 1
  });

  it('sets General Punctuation, Cyrillic, Greek, Hiragana and Shift-JIS only when those glyphs exist', () => {
    const compiled = compileFont(
      createMockProject({
        glyphs: {
          0x2014: glyph(0x2014, '—'),
          0x0416: glyph(0x0416, 'Ж'),
          0x03b1: glyph(0x03b1, 'α'),
          0x3042: glyph(0x3042, 'あ'),
        },
      }),
      { skipBlobUrl: true, scaleFactor: 1.0 }
    );
    const reparsed: any = opentype.parse(compiled.buffer);
    const os2 = reparsed.tables.os2;
    expect(os2.ulUnicodeRange1 & (1 << 31)).toBe(1 << 31); // bit 31: General Punctuation
    expect(os2.ulUnicodeRange1 & (1 << 9)).toBe(1 << 9); // bit 9: Cyrillic
    expect(os2.ulUnicodeRange1 & (1 << 7)).toBe(1 << 7); // bit 7: Greek and Coptic
    expect(os2.ulUnicodeRange2 & 0x00020000).toBe(0x00020000); // bit 49: Hiragana
    expect(os2.ulCodePageRange1 & (1 << 17)).toBe(1 << 17); // 932 Shift-JIS
    expect(os2.ulCodePageRange1 & (1 << 2)).toBe(1 << 2); // 1251 Cyrillic
    expect(os2.ulCodePageRange1 & (1 << 3)).toBe(1 << 3); // 1253 Greek
  });
});

describe('compileFont kerning keys (L37)', () => {
  const rect: PathContour = {
    id: 'c1',
    closed: true,
    nodes: [
      { id: 'n1', x: 100, y: 100, type: 'corner' },
      { id: 'n2', x: 500, y: 100, type: 'corner' },
      { id: 'n3', x: 500, y: 600, type: 'corner' },
      { id: 'n4', x: 100, y: 600, type: 'corner' },
    ],
  };
  const glyphs = {
    65: { char: 'A', name: 'A', unicode: 65, advanceWidth: 1000, lsb: 50, contours: [rect] },
    86: { char: 'V', name: 'V', unicode: 86, advanceWidth: 1000, lsb: 50, contours: [rect] },
    44: { char: ',', name: 'comma', unicode: 44, advanceWidth: 500, lsb: 50, contours: [rect] },
  };

  it('reads decimal code point keys instead of misreading them as characters', () => {
    // "65,86" is decimal for A,V — not the characters '6','5' / '8','6'.
    const compiled = compileFont(createMockProject({ glyphs, kerning: { '65,86': -80 } }), {
      skipBlobUrl: true,
      scaleFactor: 1.0,
    });
    const reparsed: any = opentype.parse(compiled.buffer);
    const leftIndex = reparsed.charToGlyphIndex('A');
    const rightIndex = reparsed.charToGlyphIndex('V');
    expect(reparsed.kerningPairs[`${leftIndex},${rightIndex}`]).toBe(-80);
  });

  it('deduplicates the same pair given as characters and as U+ code points', () => {
    const compiled = compileFont(
      createMockProject({ glyphs, kerning: { 'A,V': -80, 'U+0041,U+0056': -50 } }),
      { skipBlobUrl: true, scaleFactor: 1.0 }
    );
    const reparsed: any = opentype.parse(compiled.buffer);
    const leftIndex = reparsed.charToGlyphIndex('A');
    const rightIndex = reparsed.charToGlyphIndex('V');
    // One entry: the last value wins, and the kern table holds one pair.
    expect(reparsed.kerningPairs[`${leftIndex},${rightIndex}`]).toBe(-50);
    expect(Object.keys(reparsed.kerningPairs).length).toBe(1);
  });

  it('ignores a key whose side is the comma character itself instead of applying it to the wrong pair', () => {
    const compiled = compileFont(createMockProject({ glyphs, kerning: { ',,V': -80 } }), {
      skipBlobUrl: true,
      scaleFactor: 1.0,
    });
    const reparsed: any = opentype.parse(compiled.buffer);
    expect(Object.keys(reparsed.kerningPairs).length).toBe(0);
  });
});

describe('compileFont deterministic uniqueID (L38)', () => {
  it('produces the same uniqueID for the same project and follows the project version', () => {
    const project = createMockProject({
      glyphs: {
        65: {
          char: 'A',
          name: 'A',
          unicode: 65,
          advanceWidth: 1000,
          lsb: 50,
          contours: [
            {
              id: 'c1',
              closed: true,
              nodes: [
                { id: 'n1', x: 100, y: 100, type: 'corner' },
                { id: 'n2', x: 500, y: 100, type: 'corner' },
                { id: 'n3', x: 500, y: 600, type: 'corner' },
                { id: 'n4', x: 100, y: 600, type: 'corner' },
              ],
            },
          ],
        },
      },
    });
    const first = compileFont(project, { skipBlobUrl: true, scaleFactor: 1.0 });
    const second = compileFont(project, { skipBlobUrl: true, scaleFactor: 1.0 });
    const firstId = (opentype.parse(first.buffer) as any).names.windows.uniqueID.en;
    const secondId = (opentype.parse(second.buffer) as any).names.windows.uniqueID.en;
    expect(firstId).toBe(secondId);
    expect(firstId).toMatch(/^1\.0;/);
    expect(firstId).not.toMatch(/\d{13}/); // no Date.now() timestamp
    const bumped = compileFont(
      createMockProject({
        ...project,
        metadata: { ...project.metadata, version: 'Version 2.000' },
      }),
      { skipBlobUrl: true, scaleFactor: 1.0 }
    );
    const bumpedId = (opentype.parse(bumped.buffer) as any).names.windows.uniqueID.en;
    expect(bumpedId).toMatch(/^2\.000;/);
    expect(bumpedId).not.toBe(firstId);
  });
});

describe('compileFont GSUB ligatures with vertical pairs (L40)', () => {
  const rect: PathContour = {
    id: 'c1',
    closed: true,
    nodes: [
      { id: 'n1', x: 100, y: 100, type: 'corner' },
      { id: 'n2', x: 500, y: 100, type: 'corner' },
      { id: 'n3', x: 500, y: 600, type: 'corner' },
      { id: 'n4', x: 100, y: 600, type: 'corner' },
    ],
  };

  it('keeps ligatures when vertical substitutions exist (alphabetical feature order)', () => {
    const project = createMockProject({
      glyphs: {
        0x300c: { char: '「', name: 'kagi', unicode: 0x300c, advanceWidth: 1000, lsb: 0, contours: [rect] },
        102: { char: 'f', name: 'f', unicode: 102, advanceWidth: 500, lsb: 0, contours: [rect] },
        105: { char: 'i', name: 'i', unicode: 105, advanceWidth: 500, lsb: 0, contours: [rect] },
        0xfb01: { char: 'ﬁ', name: 'fi', unicode: 0xfb01, advanceWidth: 800, lsb: 0, contours: [rect] },
      },
      openTypeFeatures: {
        enabled: true,
        ligatures: [{ type: 'liga', inputChars: ['f', 'i'], substituteUnicode: 0xfb01, enabled: true }],
      } as any,
    });
    const compiled = compileFont(project, { skipBlobUrl: true, scaleFactor: 1.0, balanceSideBearings: false });
    const reparsed: any = opentype.parse(compiled.buffer);
    const tags = (reparsed.tables.gsub?.features || []).map((f: any) => f.tag);
    expect(tags).toContain('liga');
    expect(tags).toContain('vert');
    expect(tags).toContain('vrt2');
    const fIndex = reparsed.charToGlyphIndex('f');
    const iIndex = reparsed.charToGlyphIndex('i');
    const fiIndex = reparsed.charToGlyphIndex('ﬁ');
    expect(reparsed.substitution.getLigatures('liga', 'DFLT')).toEqual([
      { sub: [fIndex, iIndex], by: fiIndex },
    ]);
  });

  it('orders longer ligatures (ffi/ffl) before shorter ones (ff) in GSUB', () => {
    const project = createMockProject({
      glyphs: {
        102: { char: 'f', name: 'f', unicode: 102, advanceWidth: 500, lsb: 0, contours: [rect] },
        105: { char: 'i', name: 'i', unicode: 105, advanceWidth: 500, lsb: 0, contours: [rect] },
        0xfb00: { char: 'ﬀ', name: 'ff', unicode: 0xfb00, advanceWidth: 800, lsb: 0, contours: [rect] },
        0xfb03: { char: 'ﬃ', name: 'ffi', unicode: 0xfb03, advanceWidth: 1000, lsb: 0, contours: [rect] },
      },
      openTypeFeatures: {
        enabled: true,
        ligatures: [
          { id: 'ff', type: 'liga', name: 'ff', inputChars: ['f', 'f'], substituteUnicode: 0xfb00, enabled: true },
          { id: 'ffi', type: 'liga', name: 'ffi', inputChars: ['f', 'f', 'i'], substituteUnicode: 0xfb03, enabled: true },
        ],
      } as any,
    });
    const compiled = compileFont(project, { skipBlobUrl: true, scaleFactor: 1.0, balanceSideBearings: false });
    const reparsed: any = opentype.parse(compiled.buffer);
    const fIndex = reparsed.charToGlyphIndex('f');
    const iIndex = reparsed.charToGlyphIndex('i');
    const ffiIndex = reparsed.charToGlyphIndex('ﬃ');
    const ffIndex = reparsed.charToGlyphIndex('ﬀ');
    expect(reparsed.substitution.getLigatures('liga', 'DFLT')).toEqual([
      { sub: [fIndex, fIndex, iIndex], by: ffiIndex },
      { sub: [fIndex, fIndex], by: ffIndex },
    ]);
  });

  it('generates .vert variant glyphs for small kana same-codepoint rules and shares GSUB across scripts', () => {
    const pixelData = {
      width: 4,
      height: 4,
      data: [
        0, 1, 1, 0,
        0, 1, 1, 0,
        0, 0, 0, 0,
        0, 0, 0, 0,
      ],
    };
    const project = createMockProject({
      glyphs: {
        0x3063: { char: 'っ', name: 'uni3063', unicode: 0x3063, advanceWidth: 1000, lsb: 0, contours: [], pixelData },
        0x300c: { char: '「', name: 'uni300C', unicode: 0x300c, advanceWidth: 1000, lsb: 0, contours: [rect] },
      },
      openTypeFeatures: {
        enabled: true,
        verticalWriting: {
          enabled: true,
          defaultVertAdvance: 1000,
          vertOriginY: 800,
          substitutions: [
            { id: 'vsub_tsu', sourceUnicode: 0x3063, vertUnicode: 0x3063, vertAdvanceHeight: 820, enabled: true },
            { id: 'vsub_kagi', sourceUnicode: 0x300c, vertUnicode: 0xfe41, enabled: true },
          ],
        },
        ligatures: [],
        customKerningPairs: [],
      },
    });
    const compiled = compileFont(project, { skipBlobUrl: true, scaleFactor: 1.25 });
    const reparsed: any = opentype.parse(compiled.buffer);
    // Vertical derivation of 「 works and matches compiled scale
    expect(reparsed.hasChar('﹁')).toBe(true);
    // Unencoded uni3063.vert glyph is generated and bound in vert/vrt2
    const tsuIndex = reparsed.charToGlyphIndex('っ');
    const vertVariant = Array.from({ length: reparsed.glyphs.length }, (_, idx) => reparsed.glyphs.get(idx))
      .find((g: any) => g.name === 'uni3063.vert');
    expect(vertVariant).toBeDefined();
    expect(reparsed.substitution.getSingle('vert', 'DFLT')).toContainEqual({
      sub: tsuIndex,
      by: vertVariant.index,
    });
    // Per-sub vertAdvanceHeight overrides vmtx for the .vert glyph
    const vmtx = readSfntTable(compiled.buffer, 'vmtx')!;
    const vmtxView = new DataView(vmtx.buffer);
    expect(vmtxView.getUint16(vertVariant.index * 4, false)).toBe(820);
    // GSUB shares FeatureRecords cleanly across DFLT, hani, kana, latn without 4x lookup bloat
    expect(reparsed.tables.gsub.scripts.map((s: any) => s.tag)).toEqual(
      expect.arrayContaining(['DFLT', 'hani', 'kana', 'latn'])
    );
    expect(reparsed.tables.gsub.features.filter((f: any) => f.tag === 'vert')).toHaveLength(1);
  });
});

describe('compileFont palt / vpal scaling with export scale (E-H1)', () => {
  const rect = (id: string): PathContour => ({
    id,
    closed: true,
    nodes: [
      { id: `${id}n1`, x: 100, y: 100, type: 'corner' },
      { id: `${id}n2`, x: 500, y: 100, type: 'corner' },
      { id: `${id}n3`, x: 500, y: 600, type: 'corner' },
      { id: `${id}n4`, x: 100, y: 600, type: 'corner' },
    ],
  });

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

  function paltProject(paltList: any[] = []): FontProject {
    return createMockProject({
      glyphs: {
        12354: {
          char: 'あ',
          name: 'uni3042',
          unicode: 12354,
          advanceWidth: 1000,
          lsb: 50,
          contours: [rect('c1')],
        },
      },
      openTypeFeatures: {
        enabled: true,
        verticalWriting: { enabled: true, defaultVertAdvance: 1000, vertOriginY: 800, substitutions: [] },
        ligatures: [],
        customKerningPairs: [],
        palt: {
          enabled: true,
          autoDerivePalt: true,
          autoDeriveVpal: true,
          opticalSideBearingPercent: 5,
          paltList,
          vpalList: [],
        },
      } as any,
    });
  }

  function gposXAdvances(buffer: ArrayBuffer): number[] {
    const reparsed: any = opentype.parse(buffer);
    const paltLookup = reparsed.tables.gpos.lookups.find((l: any) => l.lookupType === 1);
    return paltLookup.subtables[0].values.map((v: any) => v.xAdvance);
  }

  it('scales a derived palt advance to the 1.35x outline instead of the 1.0x value', () => {
    // Outline 400 wide, 5% padding: 1.0x gives proportionalAdvance 500
    // (xAdvance -500); at 1.35x the outline is 540 wide with scaled
    // padding, so proportionalAdvance is 675 (xAdvance -325).
    const compiled = compileFont(paltProject(), { skipBlobUrl: true, scaleFactor: 1.35 });
    expect(gposXAdvances(compiled.buffer)).toEqual([-325]);
  });

  it('scales a saved palt list to the export scale, and leaves 1.0x unchanged', () => {
    const saved = [
      {
        unicode: 12354,
        char: 'あ',
        originalAdvance: 1000,
        proportionalAdvance: 500,
        xPlacement: -50,
        deltaAdvance: -500,
        opticalMarginLeft: 100,
        opticalMarginRight: 400,
        enabled: true,
      },
    ];
    const scaled = compileFont(paltProject(saved), { skipBlobUrl: true, scaleFactor: 1.35 });
    expect(gposXAdvances(scaled.buffer)).toEqual([-325]);
    const unscaled = compileFont(paltProject(saved), { skipBlobUrl: true, scaleFactor: 1.0 });
    expect(gposXAdvances(unscaled.buffer)).toEqual([-500]);
  });

  it('scales a derived vpal advance to the export scale', () => {
    // Outline 500 high, 5% padding: 1.0x gives vertical advance 600;
    // at 1.35x it is 810. The vmtx advance stays at the default vertical
    // advance (1000); the tightening is carried by the GPOS vpal
    // SinglePos: yAdvance = 810 - 1000 = -190 (at 1.0x it is -400).
    // Glyph order: .notdef, あ, space, fullwidth space.
    const scaled = compileFont(paltProject(), { skipBlobUrl: true, scaleFactor: 1.35 });
    const vmtx = readSfntTable(scaled.buffer, 'vmtx');
    expect(vmtx).not.toBeNull();
    expect(vmtx!.length).toBe(16);
    const vmtxView = new DataView(vmtx!.buffer);
    expect(vmtxView.getUint16(4, false)).toBe(1000);
    const reparsed: any = opentype.parse(scaled.buffer);
    const vpalFeature = reparsed.tables.gpos.features.find((f: any) => f.tag === 'vpal');
    expect(vpalFeature).toBeDefined();
    const vpalLookup =
      reparsed.tables.gpos.lookups[vpalFeature.feature.lookupListIndexes[0]];
    expect(vpalLookup.subtables[0].values[0].yAdvance).toBe(-190);
    const unscaled = compileFont(paltProject(), { skipBlobUrl: true, scaleFactor: 1.0 });
    const reparsedUnscaled: any = opentype.parse(unscaled.buffer);
    const vpalFeatureUnscaled = reparsedUnscaled.tables.gpos.features.find(
      (f: any) => f.tag === 'vpal'
    );
    const vpalLookupUnscaled =
      reparsedUnscaled.tables.gpos.lookups[vpalFeatureUnscaled.feature.lookupListIndexes[0]];
    expect(vpalLookupUnscaled.subtables[0].values[0].yAdvance).toBe(-400);
  });
});

describe('compileFont OS/2 win metrics from actual outlines (E-H2)', () => {
  const rect = (id: string, y1: number, y2: number): PathContour => ({
    id,
    closed: true,
    nodes: [
      { id: `${id}n1`, x: 100, y: y1, type: 'corner' },
      { id: `${id}n2`, x: 500, y: y1, type: 'corner' },
      { id: `${id}n3`, x: 500, y: y2, type: 'corner' },
      { id: `${id}n4`, x: 100, y: y2, type: 'corner' },
    ],
  });

  function glyphProject(y1: number, y2: number, metadataOverrides: any = {}): FontProject {
    return createMockProject({
      metadata: { ...createMockProject().metadata, ...metadataOverrides },
      glyphs: {
        65: {
          char: 'A',
          name: 'A',
          unicode: 65,
          advanceWidth: 1000,
          lsb: 50,
          contours: [rect('c1', y1, y2)],
        },
      },
    });
  }

  it('raises usWinAscent to cover an outline above the ascender', () => {
    // Screen y -100 is font y 900 (baseline 800), above ascender 800.
    const compiled = compileFont(glyphProject(-100, 600), { skipBlobUrl: true, scaleFactor: 1.0 });
    expect(compiled.font.tables.os2.usWinAscent).toBe(900);
    expect(compiled.font.tables.os2.usWinDescent).toBe(200);
  });

  it('raises usWinDescent to cover an outline below the descender', () => {
    // Screen y 1050 is font y -250, below descender -200.
    const compiled = compileFont(glyphProject(100, 1050), { skipBlobUrl: true, scaleFactor: 1.0 });
    expect(compiled.font.tables.os2.usWinAscent).toBe(800);
    expect(compiled.font.tables.os2.usWinDescent).toBe(250);
  });

  it('keeps an explicitly set winAscent / winDescent instead of the outline fallback', () => {
    const compiled = compileFont(glyphProject(-100, 1050, { winAscent: 1200, winDescent: 300 }), {
      skipBlobUrl: true,
      scaleFactor: 1.0,
    });
    expect(compiled.font.tables.os2.usWinAscent).toBe(1200);
    expect(compiled.font.tables.os2.usWinDescent).toBe(300);
  });

  it('scales the cap height, x height and win fallbacks with UPM', () => {
    const project = createMockProject({
      metadata: {
        familyName: 'TestFont',
        styleName: 'Regular',
        designer: 'Tester',
        copyright: 'Copyright 2026',
        version: '1.0',
        unitsPerEm: 2000,
      } as any,
      glyphs: {},
    });
    const compiled = compileFont(project, { skipBlobUrl: true });
    expect(compiled.font.tables.os2.sCapHeight).toBe(1400);
    expect(compiled.font.tables.os2.sxHeight).toBe(1000);
    expect(compiled.font.tables.os2.usWinAscent).toBe(1600);
    expect(compiled.font.tables.os2.usWinDescent).toBe(400);
  });
});

describe('compileFont pixel glyph uses sanitized metrics (E-M2)', () => {
  it('sizes a pixel glyph from the sanitized descender, not the raw metadata value', () => {
    // Raw descender 0 would be passed as -200 by `|| DEFAULT_DESCENDER`
    // (effective em 1000, cell 420, glyph 840 wide). The sanitized
    // descender is 0, so the effective em is 800 - 0 = 800 and the
    // glyph is 672 units wide. (An ascender of 0 cannot be used here:
    // opentype.js rejects a falsy ascender when constructing the Font.)
    const project = createMockProject({
      metadata: {
        ...createMockProject().metadata,
        ascender: 800,
        descender: 0,
      },
      glyphs: {
        65: {
          char: 'A',
          name: 'A',
          unicode: 65,
          advanceWidth: 1000,
          lsb: 50,
          contours: [],
          pixelData: { width: 2, height: 2, data: [1, 1, 1, 1] },
        },
      },
    });
    const compiled = compileFont(project, { skipBlobUrl: true, scaleFactor: 1.0 });
    const glyph = compiled.font.glyphs.get(compiled.font.charToGlyphIndex('A'));
    const bbox = glyph.getBoundingBox();
    expect(bbox.x2 - bbox.x1).toBe(672);
    expect(bbox.y2 - bbox.y1).toBe(672);
  });
});

describe('compileFont PostScript glyph name sanitizing (E-M3)', () => {
  it('replaces non-ASCII glyph name characters and deduplicates collisions', () => {
    const rect: PathContour = {
      id: 'c1',
      closed: true,
      nodes: [
        { id: 'n1', x: 100, y: 100, type: 'corner' },
        { id: 'n2', x: 500, y: 100, type: 'corner' },
        { id: 'n3', x: 500, y: 600, type: 'corner' },
        { id: 'n4', x: 100, y: 600, type: 'corner' },
      ],
    };
    const project = createMockProject({
      glyphs: {
        65: { char: 'A', name: 'My Glyph (1)', unicode: 65, advanceWidth: 1000, lsb: 50, contours: [rect] },
        66: { char: 'B', name: 'My Glyph [1]', unicode: 66, advanceWidth: 1000, lsb: 50, contours: [rect] },
        67: { char: 'C', name: 'あいう', unicode: 67, advanceWidth: 1000, lsb: 50, contours: [rect] },
      },
    });
    const compiled = compileFont(project, { skipBlobUrl: true, scaleFactor: 1.0 });
    const names: string[] = [];
    for (let i = 0; i < compiled.font.glyphs.length; i++) {
      names.push(compiled.font.glyphs.get(i).name ?? '');
    }
    for (const name of names) {
      expect(name).toMatch(/^[A-Za-z0-9._]+$/);
    }
    expect(new Set(names).size).toBe(names.length);
    expect(names).toContain('My_Glyph__1_');
    expect(names).toContain('My_Glyph__1__2');
    expect(names).toContain('___');
  });
});
