import { describe, expect, it } from 'vitest';
import { validateStoredFontProjectWithReport } from './validation';
import { createDefaultProject } from './projectDefaults';

function makeStoredProject(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const { metadata: metaOverride, glyphs: glyphsOverride, ...rest } = overrides;
  return {
    id: 'proj-test',
    name: 'TestFont',
    metadata: {
      familyName: 'TestFont',
      styleName: 'Regular',
      designer: 'Tester',
      copyright: 'Copyright',
      version: 'Version 1.000',
      unitsPerEm: 1000,
      ascender: 800,
      descender: -200,
      lineGap: 100,
      capHeight: 700,
      xHeight: 500,
      ...((metaOverride as Record<string, unknown> | undefined) || {}),
    },
    glyphs: {
      12354: {
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
              { id: 'n1', x: 100, y: 100, type: 'corner' },
              { id: 'n2', x: 200, y: 100, type: 'corner' },
              { id: 'n3', x: 200, y: 200, type: 'corner' },
            ],
          },
        ],
      },
      ...((glyphsOverride as Record<string, unknown> | undefined) || {}),
    },
    createdAt: 1000,
    updatedAt: 1000,
    ...rest,
  };
}

describe('validateStoredFontProjectWithReport (review H16)', () => {
  it('unifies string-field defaults with createDefaultProject and warns about replacements', () => {
    const defaults = createDefaultProject().metadata;
    const report = validateStoredFontProjectWithReport(
      makeStoredProject({ metadata: { familyName: 42, version: null } })
    );
    expect(report).not.toBeNull();
    expect(report!.project.metadata.familyName).toBe(defaults.familyName);
    expect(report!.project.metadata.version).toBe(defaults.version);
    expect(report!.warnings.some((w) => w.includes('フォント名'))).toBe(true);
    expect(report!.warnings.some((w) => w.includes('バージョン'))).toBe(true);
    expect(report!.removed.replacedMetadata).toBeGreaterThanOrEqual(2);
  });

  it('counts invalid numeric metadata replacements and invalid kerning drops', () => {
    const report = validateStoredFontProjectWithReport(
      makeStoredProject({
        metadata: { ascender: 'tall', lineGap: NaN },
        kerning: { 'あ,い': 10, 'あ,う': 'bad' },
      })
    );
    expect(report).not.toBeNull();
    expect(report!.project.metadata.ascender).toBe(800);
    expect(report!.project.metadata.lineGap).toBe(100);
    expect(report!.removed.replacedMetadata).toBeGreaterThanOrEqual(2);
    expect(report!.removed.droppedKerning).toBe(1);
    expect(report!.project.kerning).toEqual({ 'あ,い': 10 });
    expect(report!.warnings.some((w) => w.includes('カーニング'))).toBe(true);
  });

  it('lists the labels of dropped glyphs', () => {
    const report = validateStoredFontProjectWithReport(
      makeStoredProject({
        glyphs: {
          12356: { unicode: 999999, char: 'い', name: 'uni3044', advanceWidth: 1000, lsb: 50, contours: [] },
          12358: { unicode: 12358, char: 'う', name: 'uni3046', advanceWidth: 1000, lsb: 50, contours: [] },
          99999: null,
        },
      })
    );
    expect(report).not.toBeNull();
    // 12356: key/unicode mismatch; 12358 is valid; 99999 is null.
    expect(report!.removed.glyphs).toBe(2);
    expect(report!.removedGlyphLabels).toContain('い');
    expect(report!.removedGlyphLabels).toContain('U+1869F');
    expect(report!.project.glyphs[12358]).toBeDefined();
    expect(report!.project.glyphs[12356]).toBeUndefined();
  });
});
