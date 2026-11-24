import { describe, expect, it } from 'vitest';
import { collectChangedGlyphUnicodes, commitChangedGlyphHistory } from './historyHelper';
import { FontProject, GlyphData } from '../types';

function makeGlyph(unicode: number, char: string): GlyphData {
  return {
    unicode,
    char,
    name: `uni${unicode.toString(16).toUpperCase().padStart(4, '0')}`,
    advanceWidth: 1000,
    lsb: 50,
    contours: [],
  };
}

function makeProject(glyphs: Record<number, GlyphData>): FontProject {
  return {
    id: 'proj-test',
    name: 'TestFont',
    metadata: {
      familyName: 'TestFont',
      styleName: 'Regular',
      designer: 'Tester',
      copyright: 'Copyright',
      license: 'OFL',
      licenseUrl: '',
      version: '1.0',
      unitsPerEm: 1000,
      ascender: 800,
      descender: -200,
      lineGap: 0,
      capHeight: 700,
      xHeight: 500,
    },
    glyphs,
    createdAt: 1000,
    updatedAt: 1000,
  };
}

describe('collectChangedGlyphUnicodes', () => {
  it('finds only the glyphs whose object reference changed', () => {
    const a = makeGlyph(0x3042, 'あ');
    const i = makeGlyph(0x3044, 'い');
    const prev = makeProject({ [0x3042]: a, [0x3044]: i });
    const changedA = { ...a, lsb: 60 };
    const next = makeProject({ [0x3042]: changedA, [0x3044]: i });
    expect(collectChangedGlyphUnicodes(prev, next)).toEqual([0x3042]);
  });

  it('includes added and deleted glyphs', () => {
    const a = makeGlyph(0x3042, 'あ');
    const prev = makeProject({ [0x3042]: a });
    const next = makeProject({ [0x3044]: makeGlyph(0x3044, 'い') });
    expect(collectChangedGlyphUnicodes(prev, next)).toEqual([0x3042, 0x3044]);
  });

  it('returns an empty list when nothing changed', () => {
    const a = makeGlyph(0x3042, 'あ');
    const prev = makeProject({ [0x3042]: a });
    expect(collectChangedGlyphUnicodes(prev, prev)).toEqual([]);
  });
});

describe('commitChangedGlyphHistory', () => {
  it('commits history for exactly the changed unicodes, before applying', () => {
    const a = makeGlyph(0x3042, 'あ');
    const i = makeGlyph(0x3044, 'い');
    const u = makeGlyph(0x3046, 'う');
    const prev = makeProject({ [0x3042]: a, [0x3044]: i, [0x3046]: u });
    const next = makeProject({
      [0x3042]: { ...a, lsb: 10 },
      [0x3044]: i,
      [0x3046]: { ...u, advanceWidth: 900 },
    });
    const committed: number[] = [];
    const changed = commitChangedGlyphHistory(prev, next, (unicode) => {
      if (unicode !== undefined) committed.push(unicode);
    });
    expect(changed).toEqual([0x3042, 0x3046]);
    expect(committed).toEqual([0x3042, 0x3046]);
  });
});
