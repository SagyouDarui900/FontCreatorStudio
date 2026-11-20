export const SCREEN_BASELINE_Y = 800;
export const DEFAULT_UPM = 1000;
// Default ascender matches the screen baseline (800) and the default
// project metadata, so the compile-time baseline and the screen baseline
// use the same value for a new project.
export const DEFAULT_ASCENDER = 800;
// Default descender matches projectDefaults.ts and the TTF import in io.ts
// (SCREEN_BASELINE_Y - 1000 = -200), so the compile-time fallback and the
// default project metadata use the same value for a new project.
export const DEFAULT_DESCENDER = -200;

/**
 * Resolve the baseline Y (in screen coordinates) from project metadata.
 * The compile-time baseline uses metadata.ascender, so screen rendering
 * must use the same value for the exported glyph position to match the
 * position shown on screen. Falls back to 80% of unitsPerEm (800 for the
 * default UPM of 1000) when ascender is missing, non-finite, or <= 0.
 */
export function resolveBaselineY(ascender: unknown, unitsPerEm?: number): number {
  if (typeof ascender === 'number' && Number.isFinite(ascender) && ascender > 0) {
    return ascender;
  }
  const upm =
    typeof unitsPerEm === 'number' && Number.isFinite(unitsPerEm) && unitsPerEm > 0
      ? unitsPerEm
      : DEFAULT_UPM;
  return Math.round(upm * 0.8);
}

export interface CanvasMetricsMetadataInput {
  unitsPerEm?: unknown;
  ascender?: unknown;
  descender?: unknown;
  capHeight?: unknown;
  xHeight?: unknown;
}

export interface ResolvedCanvasMetrics {
  upm: number;
  baselineY: number;
  ascenderY: number;
  capHeightY: number;
  xHeightY: number;
  descenderY: number;
}

/**
 * Resolve all key vertical metrics in canvas screen coordinates (Y grows
 * downward from 0 at top of the EM box) consistent with FontY = baselineY - ScreenY.
 */
export function resolveCanvasMetrics(
  metadata?: CanvasMetricsMetadataInput | null,
  unitsPerEm?: number
): ResolvedCanvasMetrics {
  const upm =
    typeof unitsPerEm === 'number' && Number.isFinite(unitsPerEm) && unitsPerEm > 0
      ? unitsPerEm
      : typeof metadata?.unitsPerEm === 'number' &&
          Number.isFinite(metadata.unitsPerEm) &&
          metadata.unitsPerEm > 0
        ? metadata.unitsPerEm
        : DEFAULT_UPM;

  const baselineY = resolveBaselineY(metadata?.ascender, upm);

  const ascender =
    typeof metadata?.ascender === 'number' &&
    Number.isFinite(metadata.ascender) &&
    metadata.ascender > 0
      ? metadata.ascender
      : baselineY;
  const ascenderY = baselineY - ascender;

  const capHeight =
    typeof metadata?.capHeight === 'number' &&
    Number.isFinite(metadata.capHeight) &&
    metadata.capHeight > 0
      ? metadata.capHeight
      : Math.round(upm * 0.7);
  const capHeightY = baselineY - capHeight;

  const xHeight =
    typeof metadata?.xHeight === 'number' &&
    Number.isFinite(metadata.xHeight) &&
    metadata.xHeight > 0
      ? metadata.xHeight
      : Math.round(upm * 0.5);
  const xHeightY = baselineY - xHeight;

  const descender =
    typeof metadata?.descender === 'number' &&
    Number.isFinite(metadata.descender) &&
    metadata.descender < 0
      ? metadata.descender
      : baselineY - upm;
  const descenderY = baselineY - descender;

  return {
    upm,
    baselineY,
    ascenderY,
    capHeightY,
    xHeightY,
    descenderY,
  };
}

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
