import { describe, it, expect } from 'vitest';
import { getDefaultBatchSelection } from './BatchRadicalModal';
import { GlyphData } from '../../types';

function makeGlyph(char: string, contourCount: number): GlyphData {
  return {
    unicode: char.codePointAt(0) || 0,
    char,
    name: `uni${(char.codePointAt(0) || 0).toString(16).toUpperCase().padStart(4, '0')}`,
    contours: Array.from({ length: contourCount }, (_, i) => ({
      id: `c${i}`,
      closed: true,
      nodes: [],
    })) as GlyphData['contours'],
    advanceWidth: 1000,
    lsb: 50,
  };
}

describe('getDefaultBatchSelection', () => {
  it('excludes kanji that already have contours', () => {
    const allGlyphs: Record<number, GlyphData> = {
      [ '海'.codePointAt(0)! ]: makeGlyph('海', 3),
    };
    expect(getDefaultBatchSelection(['海', '洋', '泳'], allGlyphs)).toEqual(['洋', '泳']);
  });

  it('includes kanji whose glyph exists but has no contours', () => {
    const allGlyphs: Record<number, GlyphData> = {
      [ '海'.codePointAt(0)! ]: makeGlyph('海', 0),
    };
    expect(getDefaultBatchSelection(['海', '洋'], allGlyphs)).toEqual(['海', '洋']);
  });

  it('caps the selection at 30 kanji', () => {
    const list = Array.from({ length: 40 }, (_, i) => String.fromCodePoint(0x4e00 + i));
    expect(getDefaultBatchSelection(list, {}).length).toBe(30);
  });

  it('returns an empty selection when every candidate is already drawn', () => {
    const allGlyphs: Record<number, GlyphData> = {
      [ '海'.codePointAt(0)! ]: makeGlyph('海', 2),
      [ '洋'.codePointAt(0)! ]: makeGlyph('洋', 1),
    };
    expect(getDefaultBatchSelection(['海', '洋'], allGlyphs)).toEqual([]);
  });
});
