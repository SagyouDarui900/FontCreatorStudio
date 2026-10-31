import { describe, it, expect } from 'vitest';
import {
  isVerticalRotatedChar,
  isVerticalBracket,
  isVerticalCornerPunctuation,
  getVerticalGlyphStyle,
  VERTICAL_ROTATE_CHARS,
  VERTICAL_OPENING_BRACKETS,
  VERTICAL_CLOSING_BRACKETS,
  VERTICAL_TOP_RIGHT_PUNCTUATION,
} from './mojikumiVertical';

describe('mojikumiVertical', () => {
  it('correctly identifies prolonged sound marks and dashes for 90deg rotation', () => {
    expect(isVerticalRotatedChar('ー')).toBe(true);
    expect(isVerticalRotatedChar('〜')).toBe(true);
    expect(isVerticalRotatedChar('―')).toBe(true);
    expect(isVerticalRotatedChar('…')).toBe(true);
    expect(isVerticalRotatedChar('あ')).toBe(false);
  });

  it('correctly identifies opening and closing brackets', () => {
    expect(isVerticalBracket('「')).toBe('opening');
    expect(isVerticalBracket('『')).toBe('opening');
    expect(isVerticalBracket('（')).toBe('opening');
    expect(isVerticalBracket('【')).toBe('opening');

    expect(isVerticalBracket('」')).toBe('closing');
    expect(isVerticalBracket('』')).toBe('closing');
    expect(isVerticalBracket('）')).toBe('closing');
    expect(isVerticalBracket('】')).toBe('closing');

    expect(isVerticalBracket('漢')).toBe(null);
  });

  it('correctly identifies corner punctuation (touten/kuten)', () => {
    expect(isVerticalCornerPunctuation('、')).toBe(true);
    expect(isVerticalCornerPunctuation('。')).toBe(true);
    expect(isVerticalCornerPunctuation('，')).toBe(true);
    expect(isVerticalCornerPunctuation('．')).toBe(true);
    expect(isVerticalCornerPunctuation('字')).toBe(false);
  });

  it('generates appropriate styles for vertical vs horizontal mode', () => {
    // Horizontal mode: no transform
    const horizStyle = getVerticalGlyphStyle('ー', false);
    expect(horizStyle.transform).toBeUndefined();

    // Vertical mode: 'ー' rotated 90deg
    const vertChoon = getVerticalGlyphStyle('ー', true);
    expect(vertChoon.transform).toContain('rotate(90deg)');

    // Vertical mode: '「' rotated 90deg and translated
    const vertOpenBracket = getVerticalGlyphStyle('「', true);
    expect(vertOpenBracket.transform).toContain('rotate(90deg)');
    expect(vertOpenBracket.transform).toContain('translateY(-8%)');

    // Vertical mode: '」' rotated 90deg and translated
    const vertCloseBracket = getVerticalGlyphStyle('」', true);
    expect(vertCloseBracket.transform).toContain('rotate(90deg)');
    expect(vertCloseBracket.transform).toContain('translateY(8%)');

    // Vertical mode: '。' translated to top-right corner
    const vertKuten = getVerticalGlyphStyle('。', true);
    expect(vertKuten.transform).toContain('translate(28%, -28%)');

    // Vertical mode: 'っ' shifted to top-right
    const vertSokuon = getVerticalGlyphStyle('っ', true);
    expect(vertSokuon.transform).toContain('translate(10%, -10%)');

    // Normal kanji: no transform
    const vertKanji = getVerticalGlyphStyle('猫', true);
    expect(vertKanji.transform).toBeUndefined();
  });
});
