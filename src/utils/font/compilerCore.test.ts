import { describe, it, expect } from 'vitest';
import { compileFont } from './compilerCore';
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
});
