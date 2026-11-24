import { describe, it, expect } from 'vitest';
import {
  DEFAULT_ASCENDER,
  DEFAULT_DESCENDER,
  SCREEN_BASELINE_Y,
  isAsymmetricOrPunctuationGlyph,
  resolveBaselineY,
  resolveCanvasMetrics,
} from './constants';

describe('isAsymmetricOrPunctuationGlyph', () => {
  it('treats halfwidth lowercase letters as protected from centering (M7)', () => {
    expect(isAsymmetricOrPunctuationGlyph(0x61, 'a')).toBe(true);
    expect(isAsymmetricOrPunctuationGlyph(0x7a, 'z')).toBe(true);
    expect(isAsymmetricOrPunctuationGlyph(0x6d, 'm')).toBe(true);
  });

  it('still centers uppercase letters and keeps punctuation protected', () => {
    expect(isAsymmetricOrPunctuationGlyph(0x41, 'A')).toBe(false);
    expect(isAsymmetricOrPunctuationGlyph(0x5a, 'Z')).toBe(false);
    expect(isAsymmetricOrPunctuationGlyph(0x3001, '、')).toBe(true);
    expect(isAsymmetricOrPunctuationGlyph(0x3041, 'ぁ')).toBe(true);
  });
});

describe('resolveBaselineY', () => {
  it('uses metadata.ascender when it is a finite positive number', () => {
    expect(resolveBaselineY(800, 1000)).toBe(800);
    expect(resolveBaselineY(900, 1000)).toBe(900);
    expect(resolveBaselineY(880, 1000)).toBe(880);
  });

  it('falls back to 80% of unitsPerEm when ascender is missing', () => {
    expect(resolveBaselineY(undefined, 1000)).toBe(800);
    expect(resolveBaselineY(undefined, 2000)).toBe(1600);
    expect(resolveBaselineY(undefined, undefined)).toBe(800);
  });

  it('falls back to 80% of unitsPerEm when ascender is invalid', () => {
    expect(resolveBaselineY(NaN, 1000)).toBe(800);
    expect(resolveBaselineY(0, 1000)).toBe(800);
    expect(resolveBaselineY(-100, 1000)).toBe(800);
    expect(resolveBaselineY('800', 1000)).toBe(800);
  });
});

describe('resolveCanvasMetrics', () => {
  it('resolves default 1000 UPM project metrics accurately in screen coordinates', () => {
    expect(
      resolveCanvasMetrics({
        unitsPerEm: 1000,
        ascender: 800,
        descender: -200,
        capHeight: 700,
        xHeight: 500,
      })
    ).toEqual({
      upm: 1000,
      baselineY: 800,
      ascenderY: 0,
      capHeightY: 100,
      xHeightY: 300,
      descenderY: 1000,
    });
  });

  it('aligns custom CJK ascender/descender and cap/xHeight relative to baselineY', () => {
    expect(
      resolveCanvasMetrics({
        unitsPerEm: 1000,
        ascender: 880,
        descender: -120,
        capHeight: 740,
        xHeight: 520,
      })
    ).toEqual({
      upm: 1000,
      baselineY: 880,
      ascenderY: 0,
      capHeightY: 140,
      xHeightY: 360,
      descenderY: 1000,
    });
  });

  it('scales proportionally for custom UPM when metadata fields are missing or invalid', () => {
    expect(resolveCanvasMetrics({ ascender: 'bad', descender: 10 }, 2000)).toEqual({
      upm: 2000,
      baselineY: 1600,
      ascenderY: 0,
      capHeightY: 200,
      xHeightY: 600,
      descenderY: 2000,
    });
  });
});

describe('default metrics', () => {
  it('unifies the default descender to -200', () => {
    expect(DEFAULT_DESCENDER).toBe(-200);
  });

  it('keeps the default ascender and screen baseline at 800', () => {
    expect(DEFAULT_ASCENDER).toBe(800);
    expect(SCREEN_BASELINE_Y).toBe(800);
  });
});
