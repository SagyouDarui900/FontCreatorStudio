import { describe, it, expect } from 'vitest';
import { safeGlyphChar } from './FontPreviewSection';

describe('safeGlyphChar (E-L1)', () => {
  it('returns the stored char when present', () => {
    expect(safeGlyphChar({ char: 'あ', unicode: 0x3042 })).toBe('あ');
  });

  it('falls back to the character for a valid Unicode without a stored char', () => {
    expect(safeGlyphChar({ char: '', unicode: 0x3042 })).toBe('あ');
    expect(safeGlyphChar({ unicode: 65 })).toBe('A');
  });

  it('returns an empty string instead of throwing for an out-of-range Unicode', () => {
    expect(safeGlyphChar({ char: '', unicode: 0x110000 })).toBe('');
    expect(safeGlyphChar({ char: '', unicode: -1 })).toBe('');
    expect(safeGlyphChar({ char: '', unicode: Number.NaN })).toBe('');
    expect(safeGlyphChar({ char: '', unicode: 65.5 })).toBe('');
  });
});
