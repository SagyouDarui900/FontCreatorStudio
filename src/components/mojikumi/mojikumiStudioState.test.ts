// Tests for the mojikumi view/hook fixes (review 2026-11-24): M14, M19,
// M20, M27 (builder only; the engine options are not wired yet), M31.
import { describe, expect, it } from 'vitest';
import { FontProject, GlyphData } from '../../types';
import { buildTypesettingAdvanceOptions } from './useMojikumiStudioState';
import { buildPreviewProject } from '../testpreview/hooks/useTestPreviewState';

function makeGlyph(unicode: number, char: string, advanceWidth: number): GlyphData {
  return {
    unicode,
    char,
    name: `uni${unicode.toString(16)}`,
    advanceWidth,
    lsb: 100,
    contours: [
      {
        id: `c${unicode}`,
        closed: true,
        nodes: [
          { id: 'n1', x: 100, y: 200, type: 'corner' },
          { id: 'n2', x: 600, y: 200, type: 'corner' },
          { id: 'n3', x: 600, y: 800, type: 'corner' },
          { id: 'n4', x: 100, y: 800, type: 'corner' },
        ],
      },
    ],
  };
}

function makeProject(): FontProject {
  return {
    id: 'mojikumi-state-test',
    name: 'MojikumiStateTest',
    metadata: {
      familyName: 'MojikumiStateTest',
      styleName: 'Regular',
      designer: '',
      copyright: '',
      version: '1.000',
      unitsPerEm: 1000,
      ascender: 800,
      descender: -200,
      lineGap: 0,
      capHeight: 700,
      xHeight: 500,
    },
    glyphs: {
      0x3042: makeGlyph(0x3042, 'あ', 1000),
      0x3044: makeGlyph(0x3044, 'い', 500),
      0x0041: makeGlyph(0x0041, 'A', 600),
    },
    kerning: {
      'あ,い': -50,
      'U+3042,U+0041': 100,
      'いA': -25,
      'bogus': 10,
    },
    createdAt: 1,
    updatedAt: 1,
  } as unknown as FontProject;
}

describe('buildTypesettingAdvanceOptions (M27, unwired)', () => {
  it('converts advanceWidth and kerning to em units with "left,right" char keys', () => {
    const { advances, kerningEm } = buildTypesettingAdvanceOptions(makeProject());
    expect(advances).toEqual({ 'あ': 1, 'い': 0.5, A: 0.6 });
    expect(kerningEm).toEqual({ 'あ,い': -0.05, 'あ,A': 0.1, 'い,A': -0.025 });
  });

  it('uses unitsPerEm for the conversion', () => {
    const project = makeProject();
    project.metadata.unitsPerEm = 2000;
    const { advances, kerningEm } = buildTypesettingAdvanceOptions(project);
    expect(advances['あ']).toBe(0.5);
    expect(kerningEm['あ,い']).toBe(-0.025);
  });
});

describe('buildPreviewProject for mojikumi text (M31)', () => {
  it('keeps only the glyphs in the preview text', () => {
    const project = makeProject();
    const subset = buildPreviewProject(project, 'あいあ');
    expect(Object.keys(subset.glyphs || {}).map(Number).sort()).toEqual([0x3042, 0x3044]);
    expect(subset.kerning).toEqual({ 'あ,い': -50, bogus: 10 });
  });
});
