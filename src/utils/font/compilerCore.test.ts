import { describe, it, expect } from 'vitest';
import { compileFont } from './compilerCore';
import { validateFontProject } from './validation';
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

  it('compiles a single rectangular contour into TTF bytes with valid advanceWidth', () => {
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

  it('sanitizes NaN and 0 values safely without throwing', () => {
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
    }).not.toThrow();
  });
});
