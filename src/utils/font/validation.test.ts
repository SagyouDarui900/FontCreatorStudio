import { describe, expect, it } from 'vitest';
import { validateStoredFontProjectWithReport, validateFontProject, parseKerningPairKey } from './validation';
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

describe('parseKerningPairKey (L37)', () => {
  it('reads decimal code point keys', () => {
    expect(parseKerningPairKey('44,65')).toEqual({ left: 44, right: 65 });
    expect(parseKerningPairKey('12354,65')).toEqual({ left: 12354, right: 65 });
  });

  it('still reads a single digit as the character itself', () => {
    expect(parseKerningPairKey('4,5')).toEqual({ left: 52, right: 53 });
  });

  it('rejects keys whose side is the comma character itself', () => {
    expect(parseKerningPairKey(',,X')).toEqual({ left: null, right: null });
    expect(parseKerningPairKey('A,,')).toEqual({ left: null, right: null });
  });

  it('reads character, U+ hex and 0x hex keys', () => {
    expect(parseKerningPairKey('A,V')).toEqual({ left: 65, right: 86 });
    expect(parseKerningPairKey('U+0041,U+0056')).toEqual({ left: 65, right: 86 });
    expect(parseKerningPairKey('0x41,0x56')).toEqual({ left: 65, right: 86 });
    expect(parseKerningPairKey('AV')).toEqual({ left: 65, right: 86 });
  });

  it('warns about an ambiguous comma key instead of silently dropping it', () => {
    const project = makeStoredProject({ kerning: { ',,V': -80 } }) as any;
    const result = validateFontProject(project);
    expect(result.warnings.some((w) => w.includes(',,V'))).toBe(true);
  });
});

describe('validateFontProject two-node contours and metadata (L44, L45)', () => {
  const twoNodeGlyph = (closed: boolean) => ({
    unicode: 65,
    char: 'A',
    name: 'A',
    advanceWidth: 1000,
    lsb: 50,
    contours: [
      {
        id: 'c1',
        closed,
        nodes: [
          { id: 'n1', x: 100, y: 100, type: 'corner' },
          { id: 'n2', x: 200, y: 100, type: 'corner' },
        ],
      },
    ],
  });

  it('does not claim a two-node open contour is exported as a line', () => {
    const result = validateFontProject(makeStoredProject({ glyphs: { 65: twoNodeGlyph(false) } }) as any);
    const warning = result.warnings.find((w) => w.includes('頂点が2つだけ'));
    expect(warning).toBeDefined();
    expect(warning).not.toContain('線として書き出されます');
    expect(warning).toContain('表示されません');
  });

  it('errors on a missing metadata object instead of leaving it for compilation to crash on', () => {
    const project = makeStoredProject({}) as any;
    delete project.metadata;
    const result = validateFontProject(project);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('メタデータ'))).toBe(true);
  });

  it('validates verticalWriting metrics and ligature code points/glyph availability', () => {
    const invalidLigProj = makeStoredProject({
      openTypeFeatures: {
        enabled: true,
        verticalWriting: {
          enabled: true,
          defaultVertAdvance: -50,
          vertOriginY: 880,
          substitutions: [
            { id: 'bad_v', sourceUnicode: -1, vertUnicode: 0xfe11, enabled: true },
          ],
        },
        ligatures: [
          {
            id: 'bad_unicode',
            type: 'liga',
            name: 'bad_unicode',
            inputChars: ['f', 'i'],
            substituteUnicode: 0x200000,
            enabled: true,
          },
          {
            id: 'short_input',
            type: 'liga',
            name: 'short_input',
            inputChars: ['f'],
            substituteUnicode: 0xfb01,
            enabled: true,
          },
        ],
        customKerningPairs: [],
      },
    }) as any;
    const res = validateFontProject(invalidLigProj);
    expect(res.valid).toBe(false);
    expect(res.warnings.some((w) => w.includes('デフォルト縦送り幅'))).toBe(true);
    expect(res.errors.some((e) => e.includes('縦書き置換ルール'))).toBe(true);
    expect(res.errors.some((e) => e.includes('変換先Unicode値が無効'))).toBe(true);
    expect(res.warnings.some((w) => w.includes('2文字未満'))).toBe(true);
  });
});
