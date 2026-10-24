export const SCREEN_BASELINE_Y = 800;
export const DEFAULT_UPM = 1000;
export const DEFAULT_ASCENDER = 880;
export const DEFAULT_DESCENDER = -120;

// Small Hiragana & Katakana unicodes (should remain in their natural position, not centered)
export const SMALL_KANA_UNICODES = new Set<number>([
  0x3041, 0x3043, 0x3045, 0x3047, 0x3049, 0x3063, 0x3083, 0x3085, 0x3087, 0x308E, 0x3095, 0x3096, // ぁぃぅぇぉっゃゅょゎゕゖ
  0x30A1, 0x30A3, 0x30A5, 0x30A7, 0x30A9, 0x30C3, 0x30E3, 0x30E5, 0x30E7, 0x30EE, 0x30F5, 0x30F6, // ァィゥェォッャュョヮヵヶ
]);

/**
 * Check if a character is intentionally asymmetric (e.g. small kana, punctuation, quotes, brackets, marks).
 * These glyphs MUST NOT be forced to geometric center (LSB == RSB) as doing so ruins sentence layout.
 */
export function isAsymmetricOrPunctuationGlyph(unicode: number, char?: string): boolean {
  if (!unicode) return false;

  // Space characters
  if (unicode === 32 || unicode === 0x3000) return true;

  // Small Hiragana & Katakana
  if (SMALL_KANA_UNICODES.has(unicode)) return true;

  // Standalone Dakuten & Handakuten (濁点 ゛, 半濁点 ゜, 結合濁点/半濁点)
  if (unicode >= 0x3099 && unicode <= 0x309c) return true;

  // Japanese & CJK Punctuation, Brackets, Quotes, Marks (U+3000..U+303F, U+FF00..U+FFEF)
  if (unicode >= 0x3000 && unicode <= 0x303f) return true;
  if (unicode >= 0xff00 && unicode <= 0xffef) return true;

  // Western ASCII Punctuation & Symbols (0x21..0x2F, 0x3A..0x40, 0x5B..0x60, 0x7B..0x7E)
  if (
    (unicode >= 0x21 && unicode <= 0x2f) ||
    (unicode >= 0x3a && unicode <= 0x40) ||
    (unicode >= 0x5b && unicode <= 0x60) ||
    (unicode >= 0x7b && unicode <= 0x7e)
  ) {
    return true;
  }

  // General Punctuation & Currency (U+2000..U+206F, U+2070..U+209F, U+20A0..U+20CF)
  if (unicode >= 0x2000 && unicode <= 0x20cf) return true;

  // Combining Diacritical Marks (U+0300..U+036F)
  if (unicode >= 0x0300 && unicode <= 0x036f) return true;

  return false;
}
