export interface TraceCharMetricsInput {
  charToRender: string;
  unitsPerEm: number;
  fontSize?: number;
  advanceWidth?: number;
}

export interface TraceCharMetrics {
  isKana: boolean;
  isKanji: boolean;
  isJapanese: boolean;
  anchorX: number;
  effectiveFontSize: number;
  effectiveY: number;
  dominantBaseline: 'central' | 'alphabetic';
  charBoxSize: number;
  charBoxX: number;
  charBoxY: number;
}

/**
 * Compute authentic EM-square metrics for the trace underdrawing character.
 *
 * OpenType fonts (such as Noto Sans JP / Noto Serif JP) already bake Japanese
 * body scaling (~85% for Kanji, ~78% for Kana, plus optical offsets for small kana
 * and Japanese punctuation) inside their 1.0x EM square. Shrinking `fontSize` by
 * 0.78/0.85 again causes double-shrinking (~60% Kana / ~73% Kanji) and pulls
 * punctuation inward.
 *
 * For Latin/ASCII characters, every glyph must share the exact same alphabetic
 * baseline (`upm * 0.8`) and scale (`upm * 0.80`) so descenders (`g, j, p, q, y`)
 * and accented letters never jump above the baseline.
 */
export function computeTraceCharMetrics({
  charToRender,
  unitsPerEm,
  fontSize,
  advanceWidth,
}: TraceCharMetricsInput): TraceCharMetrics {
  const upm = unitsPerEm || 1000;
  const half = upm / 2;
  const screenBaselineY = Math.round(upm * 0.8);

  const isKana = /[\u3040-\u309F\u30A0-\u30FF\u31F0-\u31FF]/.test(charToRender);
  const isKanji = /[\u4E00-\u9FAF\u3400-\u4DBF\uF900-\uFAFF]/.test(charToRender);
  const isJapanese =
    isKana ||
    isKanji ||
    /[々〆〇\u3000-\u303F\uFF00-\uFFEF]/.test(charToRender);

  const userFontScale = fontSize ? fontSize / 1000 : 1;

  // Center inside custom narrow advanceWidth (e.g. half-width ASCII) when narrower than EM box
  const anchorX =
    !isJapanese &&
    typeof advanceWidth === 'number' &&
    advanceWidth > 0 &&
    advanceWidth < upm
      ? advanceWidth / 2
      : half;

  const charBoxSize = Math.round(
    (isKana ? upm * 0.78 : isKanji ? upm * 0.85 : upm * 0.8) * userFontScale
  );
  const charBoxX = anchorX - charBoxSize / 2;
  const charBoxY = half - charBoxSize / 2;

  if (isJapanese) {
    return {
      isKana,
      isKanji,
      isJapanese,
      anchorX,
      effectiveFontSize: Math.round(upm * userFontScale),
      effectiveY: half,
      dominantBaseline: 'central',
      charBoxSize,
      charBoxX,
      charBoxY,
    };
  }

  return {
    isKana,
    isKanji,
    isJapanese,
    anchorX,
    effectiveFontSize: Math.round(upm * 0.8 * userFontScale),
    effectiveY: screenBaselineY,
    dominantBaseline: 'alphabetic',
    charBoxSize,
    charBoxX,
    charBoxY,
  };
}
