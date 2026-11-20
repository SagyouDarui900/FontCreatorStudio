export interface TraceCharMetricsInput {
  charToRender: string;
  unitsPerEm: number;
  fontSize?: number;
  advanceWidth?: number;
  baselineY?: number;
}

/**
 * Shared character-kind checks for trace defaults. The same regular
 * expressions are used by computeTraceCharMetrics and by the trace
 * transform reset, so the kana / kanji decision cannot drift apart.
 */
const KANA_PATTERN = /[\u3040-\u309F\u30A0-\u30FF\u31F0-\u31FF]/;
const KANJI_PATTERN = /[\u4E00-\u9FAF\u3400-\u4DBF\uF900-\uFAFF]/;

export function isKanaText(text: string): boolean {
  return KANA_PATTERN.test(text);
}

export function isKanjiText(text: string): boolean {
  return KANJI_PATTERN.test(text);
}

/**
 * Default trace scale for a character: kana 0.78, kanji 0.85, otherwise
 * 1.0. The rule applies to image and character underdrawings alike.
 */
export function getDefaultTraceScale(text: string): number {
  if (isKanaText(text)) return 0.78;
  if (isKanjiText(text)) return 0.85;
  return 1.0;
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
 * Bundled & fallback Japanese OpenType fonts (Noto Sans JP, Noto Serif JP,
 * Zen Maru Gothic, Kaisei Tokumin, system CJK fonts) render Kanji ink at
 * ~90-96% of `fontSize` and have `hhea` ascender/descender (+1160/-288)
 * that differ from the CJK ideographic EM box (+880/-120, center at +380
 * above the alphabetic baseline).
 *
 * Using `dominantBaseline="central"` shifts Kanji vertically depending on
 * browser `hhea` metrics and at 1.0x UPM overflows the 85% `漢字枠` and EM edges.
 * Anchoring Japanese characters via `dominantBaseline="alphabetic"` at
 * `half + effectiveFontSize * 0.38` centers the CJK ideographic EM box
 * deterministically across all browsers, while 0.88x (Kanji) and 0.94x
 * (Kana/JP punctuation) keep strokes cleanly inside `漢字枠 (85%)` / `かな枠 (78%)`
 * and well within the `0..upm` canvas.
 *
 * For Latin/ASCII characters, every glyph shares the exact same alphabetic
 * baseline (`upm * 0.8`) and scale (`upm * 0.80`) so descenders (`g, j, p, q, y`)
 * and accented letters never jump above the baseline.
 */
export function computeTraceCharMetrics({
  charToRender,
  unitsPerEm,
  fontSize,
  advanceWidth,
  baselineY,
}: TraceCharMetricsInput): TraceCharMetrics {
  const upm = unitsPerEm || 1000;
  const half = upm / 2;
  const screenBaselineY =
    typeof baselineY === 'number' && Number.isFinite(baselineY)
      ? baselineY
      : Math.round(upm * 0.8);

  const isKana = isKanaText(charToRender);
  const isKanji = isKanjiText(charToRender);
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
    const japaneseScale = isKanji ? 0.88 : 0.94;
    const effectiveFontSize = Math.round(upm * japaneseScale * userFontScale);
    return {
      isKana,
      isKanji,
      isJapanese,
      anchorX,
      effectiveFontSize,
      effectiveY: Math.round(half + effectiveFontSize * 0.38),
      dominantBaseline: 'alphabetic',
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
