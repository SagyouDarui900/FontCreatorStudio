import { describe, expect, it } from 'vitest';
import {
  PRESET_BETA,
  PRESET_TSUME,
  MOJIKUMI_PRESETS,
  applyParagraphIndentPreset,
  calculateTypesettingDimensions,
  getCharKind,
  getLineStartProhibitedChars,
  getPairOptimalSpacing,
  simulateTypesetting,
} from './mojikumiEngine';
import type { MojikumiConfig } from '../types';

const baseConfig: MojikumiConfig = {
  preset: 'beta',
  table: PRESET_BETA,
  kinsoku: 'weak_v2',
  kinsokuAdjust: 'push_out',
  burasagari: 'standard',
  paragraphIndent: 'none',
};

describe('mojikumiEngine', () => {
  it('applies spacing between a punctuation/closing bracket and the following character as beforeEm on the following glyph', () => {
    const res = simulateTypesetting('「猫」は', 20, {
      ...baseConfig,
      paragraphIndent: 'none',
    });
    expect(res.lines).toHaveLength(1);
    const glyphs = res.lines[0].glyphs;
    expect(glyphs.map((g) => g.char)).toEqual(['「', '猫', '」', 'は']);

    // Space after '」' must sit BEFORE 'は', not AFTER 'は'
    const closeBracket = glyphs[2];
    const ha = glyphs[3];
    expect(closeBracket.spacingAfterEm).toBe(0);
    expect(ha.spacingBeforeEm).toBe(PRESET_BETA.endBracket_to_nonYakumono.optimal / 100);
    expect(ha.spacingAfterEm).toBe(0);
  });

  it('applies middle-dot and latin/kanji spacing consistently via beforeEm', () => {
    const space = getPairOptimalSpacing('half_latin', 'non_yakumono', PRESET_BETA, false, false);
    expect(space.beforeEm).toBe(PRESET_BETA.halfLatin_around_nonYakumono.optimal / 100);
    expect(space.afterEm).toBe(0);
  });

  it('does not falsely mark lines as overflown due to floating-point tolerances within +0.05em', () => {
    const res = simulateTypesetting('あ'.repeat(10), 10, baseConfig);
    expect(res.lines).toHaveLength(1);
    expect(res.lines[0].isOverflown).toBe(false);

    // Tsume mode uses 0.95em per kanji; repeated additions must stay non-overflown
    const tsumeRes = simulateTypesetting('あ'.repeat(10), 10, {
      ...baseConfig,
      preset: 'tsume',
      table: PRESET_TSUME,
    });
    expect(tsumeRes.lines[0].isOverflown).toBe(false);
  });

  it('guards against zero or negative charsPerLine without NaN density or infinite loops', () => {
    const res = simulateTypesetting('日本語。', 0, baseConfig);
    expect(res.lines.length).toBeGreaterThan(0);
    expect(Number.isFinite(res.averageDensityPercent)).toBe(true);
  });

  it('L25: trackingEm applies only between glyphs, not after the last glyph of a line', () => {
    const res = simulateTypesetting('日本語', 10, baseConfig, { trackingEm: 0.15 });
    expect(res.lines).toHaveLength(1);
    const glyphs = res.lines[0].glyphs;
    // tracking sits between glyphs: the first two glyphs carry it, the last does not
    expect(glyphs[0].spacingAfterEm).toBeCloseTo(0.15, 5);
    expect(glyphs[1].spacingAfterEm).toBeCloseTo(0.15, 5);
    expect(glyphs[2].spacingAfterEm).toBe(0);
    // the line total is 3 x 1.0em + 2 gaps x 0.15em, not 3 x 1.15em
    expect(res.lines[0].totalAdvanceEm).toBeCloseTo(3.3, 5);
  });

  it('chains kinsoku push-out across consecutive start-prohibited characters and exposed end-prohibited brackets', () => {
    // burasagari 'none': '」' must not hang, so the push-out chain is exercised.
    // With burasagari enabled, '」' hangs after '。' (H4) and the chain does not run.
    const noHangConfig = { ...baseConfig, burasagari: 'none' as const };
    // 5 chars/line: "あいう「え。」かき" -> before break at index 5 ('。'), '」' at line 2 head is also startProhibited
    // Look at "あいうえ。」か" (5 chars/line): index 0='あ',1='い',2='う',3='え',4='。',5='」',6='か'
    // index 5 '」' exceeds line -> startProhibited pops '。' too? No, '。' before '」' at index 4 -> '。' pushed to next line -> wait: '。」' would start line 2 with '。' which is startProhibited -> pushes 'え' so line 2 starts with 'え。」' (non-prohibited)!
    const res = simulateTypesetting('あいうえ。」か', 5, noHangConfig);
    expect(res.lines[0].text).toBe('あいう');
    expect(res.lines[1].text.startsWith('え。」')).toBe(true);

    // Exposing '「' at end of line after popping start-prohibited '。':
    // 5 chars/line: "あいう「。」か" -> index 0..3 fits (with spacing before '「' = 0.5, advance = 4.5); index 4='。' exceeds or fits? 4.5 + 1 = 5.5 > 5.05 -> '。' exceeds -> '「' is at tail and endProhibited -> pushes '「' too!
    const bracketRes = simulateTypesetting('あいう「。」か', 5, noHangConfig);
    expect(bracketRes.lines[0].text).toBe('あいう');
    expect(bracketRes.lines[1].text.startsWith('「。」')).toBe(true);
  });

  it('evaluates burasagari by cumulative advance width so halfwidth-heavy lines still hang', () => {
    // 5em/line: 8 halfwidth chars = 4.0em, then 1 kanji = 5.125em? Actually 10 halfwidth chars = 5.0em (exact fit),
    // wait: 8 halfwidth chars ('a') + 'あ' -> 4.0 + 0.125 + 1.0 = 5.125 (exceeds on 'あ'), or 10 halfwidth 'a' = 5.0em, then '。':
    // length is 10, charsPerLine is 10; try charsPerLine = 10 with 20 halfwidth 'a' (advance = 10.0em) + '。' -> length=20 >= 9, wait test with fewer chars than charsPerLine?
    // Reverse: halfwidth=0.5em so advance < length! With usePalt or when burasagari needs advance >= charsPerLine - 1.5:
    // Actually 9 'あ' (9.0em) on 10em line: 9 >= 8.5 hangs '。'. For halfwidth: 19 'a' = 9.5em on 10em line + '。' (1.0em) -> 10.5em > 10.05 -> hangs!
    // What about 9.0em where charsPerLine=10? Try charsPerLine=6: 10 'a' = 5.0em + 1 'a'? Wait: 10 'a' + '。' = 5.0 + 0.125? ('half_latin' to 'kuten' = 0 beforeEm) -> 5.0 + 1.0 = 6.0 (fits).
    // L25: the line width excludes trailing tracking, so tracking 0.3
    // (instead of 0.25) is needed here to make '。' overflow the 6em line:
    // 4 glyphs = 4.0 + 3 x 0.3 = 4.9em, '。' adds 1.3em -> 6.2 > 6.05.
    const halfRes = simulateTypesetting('aaaaaaa。次', 6, baseConfig, { trackingEm: 0.3 });
    // Even if line only had 4 chars with large spacing (e.g. 'あいうえ' + tracking=0.3 -> 4 * 1.3 = 5.2em on 6em line):
    // length=4 < (6 - 1 = 5), so old length-based check FAILED to hang, whereas advance=4.9 >= 4.5 PASSES!
    const spacedRes = simulateTypesetting('あいうえ。次', 6, baseConfig, { trackingEm: 0.3 });
    expect(spacedRes.lines[0].burasagariCount).toBe(1);
    expect(spacedRes.lines[0].text).toBe('あいうえ。');
    expect(halfRes.lines[0].burasagariCount).toBe(1);
  });
});

describe('mojikumiEngine push-in / burasagari runs / tate-chu-yoko / justification', () => {
  it('H3: push_in compresses inter-glyph spacing so a line-end-prohibited bracket and the next glyph fit', () => {
    const res = simulateTypesetting('あいう「え', 5, { ...baseConfig, kinsokuAdjust: 'push_in' });
    expect(res.lines.map((l) => l.text)).toEqual(['あいう「え']);
    const bracket = res.lines[0].glyphs[3];
    expect(bracket.char).toBe('「');
    // deficit 0.45em compressed out of the 0.5em gap before '「'
    expect(bracket.spacingBeforeEm).toBeCloseTo(0.05, 5);
  });

  it('H3: push_in falls back to push-out when the spacing cannot be compressed enough', () => {
    // nonYakumono_to_startBracket min 50%: the 0.5em gap before '「' cannot be compressed
    const rigidTable = {
      ...PRESET_BETA,
      nonYakumono_to_startBracket: { min: 50, optimal: 50, max: 50, priority: 3 },
    };
    const res = simulateTypesetting('あいう「え', 5, {
      ...baseConfig,
      table: rigidTable,
      kinsokuAdjust: 'push_in',
    });
    expect(res.lines.map((l) => l.text)).toEqual(['あいう', '「え']);
  });

  it('H3: push_out keeps the old behavior for the same text', () => {
    const res = simulateTypesetting('あいう「え', 5, { ...baseConfig, kinsokuAdjust: 'push_out' });
    expect(res.lines.map((l) => l.text)).toEqual(['あいう', '「え']);
  });

  it('H4: consecutive hanging targets hang together so the next line does not start with a closing bracket', () => {
    // L25: with inter-glyph tracking, '。' fits on a 6em line (5 glyphs =
    // 5.0em + 4 x 0.25em = 6.0 <= 6.05), so a 5em line is used here to
    // make '。' overflow: 4 glyphs = 4.75em, '。' adds 1.25em -> 6.0 > 5.05.
    const res = simulateTypesetting('あいうえ。」か', 5, baseConfig, { trackingEm: 0.25 });
    expect(res.lines.map((l) => l.text)).toEqual(['あいうえ。」', 'か']);
    expect(res.lines[0].burasagariCount).toBe(2);
    expect(res.lines[0].glyphs.filter((g) => g.isHanging).map((g) => g.char)).toEqual(['。', '」']);
  });

  it('H5: hanging resolves the lone opening bracket left by chained push-out', () => {
    const res = simulateTypesetting('「あ。」', 3, baseConfig);
    expect(res.lines.map((l) => l.text)).toEqual(['「あ。」']);
    expect(res.lines[0].burasagariCount).toBe(1);
    expect(res.lines[0].glyphs[3].isHanging).toBe(true);
    // with burasagari off, the old chained push-out result remains (single '「' line)
    const noHang = simulateTypesetting('「あ。」', 3, { ...baseConfig, burasagari: 'none' });
    expect(noHang.lines.map((l) => l.text)).toEqual(['「', 'あ。」']);
  });

  it('M19: vertical runs of halfwidth alphanumerics become one tate-chu-yoko unit', () => {
    const res = simulateTypesetting('2026年', 10, baseConfig, { isVertical: true });
    expect(res.lines).toHaveLength(1);
    const glyphs = res.lines[0].glyphs;
    expect(glyphs.map((g) => g.char)).toEqual(['2', '0', '2', '6', '年']);
    expect(glyphs.slice(0, 4).every((g) => g.tateChuYoko === true)).toBe(true);
    expect(glyphs[4].tateChuYoko).toBeUndefined();
    // the unit occupies 1em: the first glyph carries it, followers carry 0
    expect(glyphs[0].baseAdvanceEm).toBe(1);
    expect(glyphs.slice(1, 4).every((g) => g.baseAdvanceEm === 0)).toBe(true);
  });

  it('M19: a tate-chu-yoko unit is not split across lines', () => {
    // 'あ' (1.0em) + unit 'ABC' (1.0em + 0.125em beforeEm) = 2.125 > 2.05,
    // so the unit moves to line 2 intact instead of splitting.
    const res = simulateTypesetting('あABC年い', 2, baseConfig, { isVertical: true });
    expect(res.lines.map((l) => l.text)).toEqual(['あ', 'ABC', '年い']);
  });

  it('M19: a lone halfwidth digit is not tate-chu-yoko, and horizontal text is unaffected', () => {
    const vertical = simulateTypesetting('あ2い', 10, baseConfig, { isVertical: true });
    expect(vertical.lines[0].glyphs[1].tateChuYoko).toBeUndefined();
    expect(vertical.lines[0].glyphs[1].baseAdvanceEm).toBe(0.5);
    const horizontal = simulateTypesetting('2026年', 10, baseConfig);
    expect(horizontal.lines[0].glyphs.every((g) => !g.tateChuYoko)).toBe(true);
  });

  it('M19: runs longer than 4 chars are split into units of at most 4 chars', () => {
    // On a 1em line each 4-char unit is forced onto its own line; without
    // chunking the 8-digit run would be a single unbreakable overflowing unit.
    const res = simulateTypesetting('あ12345678い', 1, baseConfig, { isVertical: true });
    expect(res.lines.map((l) => l.text)).toEqual(['あ', '1234', '5678', 'い']);
  });

  it('M23: justification expands mid-line spacing within [optimal, max] in priority order', () => {
    // beta: halfDigit_around_nonYakumono is 0/0/12.5 (min/optimal/max).
    // 'あ1うえお' on a 5em line breaks at 'か' (5.5 > 5.05), leaving 0.5em slack.
    // Both digit gaps expand to max 0.125em each.
    const res = simulateTypesetting('あ1うえおか', 5, baseConfig);
    expect(res.lines[0].text).toBe('あ1うえお');
    expect(res.lines[0].glyphs[1].spacingBeforeEm).toBeCloseTo(0.125, 5);
    expect(res.lines[0].glyphs[2].spacingBeforeEm).toBeCloseTo(0.125, 5);
    expect(res.lines[0].totalAdvanceEm).toBeCloseTo(4.75, 5);
  });

  it('M23: line-end rules participate in justification', () => {
    // 'あ」えお' on a 3em line: 'え' (1.0 + 0.5 beforeEm) overflows after
    // 'あ」' (2.0em), leaving 1.0em slack. The line-end rule for '」'
    // (beta endBracket_to_lineEnd 0/50/50, priority 1) expands its afterEm to 0.5.
    const res = simulateTypesetting('あ」えお', 3, baseConfig);
    expect(res.lines[0].text).toBe('あ」');
    expect(res.lines[0].glyphs[1].spacingAfterEm).toBeCloseTo(0.5, 5);
    expect(res.lines[0].totalAdvanceEm).toBeCloseTo(2.5, 5);
  });

  it('M23: the last line of a paragraph is not justified', () => {
    const res = simulateTypesetting('あ1う', 5, baseConfig);
    expect(res.lines).toHaveLength(1);
    expect(res.lines[0].glyphs[1].spacingBeforeEm).toBe(0);
  });

  it('M24: line-end kinsoku look-ahead uses the next glyph\'s real advance', () => {
    // Case A (old code overestimated): 'あいう「a' fits on a 5em line.
    // 'あいう' = 3.0, '「' = 1.5, next 'a' = 0.5 -> 5.0 <= 5.05.
    // The old proxy max(0.5, 1.0) = 1.0 broke the line early.
    const resA = simulateTypesetting('あいう「a', 5, baseConfig);
    expect(resA.lines.map((l) => l.text)).toEqual(['あいう「a']);
    // Case B (old code underestimated): tracking 0.05 makes the next '「'
    // wider than the proxy. The old code placed the first '「' and left it
    // at the line end (a violation: ['あい「', '「お']); the fixed code
    // breaks before the second '「' and pops the exposed first '「' too.
    const resB = simulateTypesetting('あい「「お', 5, baseConfig, { trackingEm: 0.05 });
    expect(resB.lines.map((l) => l.text)).toEqual(['あい', '「「お']);
    expect(resB.lines[0].text.endsWith('「')).toBe(false);
  });

  it('M25: forced burasagari hangs a fitting line-final punctuation, standard does not', () => {
    const text = 'あいうえ。か';
    const standard = simulateTypesetting(text, 5, { ...baseConfig, burasagari: 'standard' });
    expect(standard.lines.map((l) => l.text)).toEqual(['あいうえ。', 'か']);
    expect(standard.lines[0].burasagariCount).toBe(0);
    const forced = simulateTypesetting(text, 5, { ...baseConfig, burasagari: 'forced' });
    expect(forced.lines.map((l) => l.text)).toEqual(['あいうえ。か']);
    expect(forced.lines[0].burasagariCount).toBe(1);
    expect(forced.lines[0].glyphs[4].isHanging).toBe(true);
  });

  it('M26: paragraph indent applies to halfwidth alphanumerics, spaces and punctuation at the paragraph start', () => {
    const indented = { ...baseConfig, paragraphIndent: 'visual_half' as const };
    const digits = simulateTypesetting('2026年', 10, indented);
    expect(digits.lines[0].glyphs[0].spacingBeforeEm).toBe(1);
    const punct = simulateTypesetting('。あいう', 10, indented);
    expect(punct.lines[0].glyphs[0].spacingBeforeEm).toBe(1);
    const space = simulateTypesetting(' あいう', 10, indented);
    expect(space.lines[0].glyphs[0].spacingBeforeEm).toBe(1);
    // wrapped lines still get no indent
    const wrapped = simulateTypesetting('あいうえおかきくけこ', 5, indented);
    expect(wrapped.lines[1].glyphs[0].spacingBeforeEm).toBe(0);
  });

  it('M27: per-character advances and pair kerning are used for line breaking', () => {
    const res = simulateTypesetting('あいうえおか', 5, baseConfig, {
      advances: { あ: 0.6 },
      kerningEm: { 'あ,い': -0.2 },
    });
    // 'あ' 0.6, 'い' 1.0 - 0.2 kern = 0.8, 'う' 1.0, 'え' 1.0, 'お' 1.0 -> 4.4,
    // 'か' 1.0 -> 5.4 > 5.05 breaks.
    expect(res.lines[0].glyphs[0].baseAdvanceEm).toBe(0.6);
    expect(res.lines[0].glyphs[1].spacingBeforeEm).toBeCloseTo(-0.2, 5);
    expect(res.lines[0].text).toBe('あいうえお');
  });

  it('M27: extremely small advances are floored so line breaking does not break down', () => {
    const res = simulateTypesetting('aaaaaaaaaa', 5, baseConfig, { advances: { a: 0.05 } });
    // floored to 0.25em each: 10 glyphs fit on one 5em line
    expect(res.lines).toHaveLength(1);
    expect(res.lines[0].glyphs[0].baseAdvanceEm).toBe(0.25);
  });

  it('M27: advances change where lines break', () => {
    // wide 'あ' (1.5em): 'あいう' = 3.5, 'え' -> 4.5, 'お' -> 6.0 > 5.05
    const wide = simulateTypesetting('あいうえお', 5, baseConfig, { advances: { あ: 1.5 } });
    expect(wide.lines.map((l) => l.text)).toEqual(['あいうえ', 'お']);
    const narrow = simulateTypesetting('あいうえお', 5, baseConfig, { advances: { あ: 0.5 } });
    expect(narrow.lines.map((l) => l.text)).toEqual(['あいうえお']);
  });
});

describe('mojikumiEngine low-priority review fixes (L19, L22, L24-L29, L31, L33, L34)', () => {
  it('L19: calculateTypesettingDimensions no longer returns unused formula strings', () => {
    const dims = calculateTypesettingDimensions(12, 20, 10, 5);
    expect('formulaWidth' in dims).toBe(false);
    expect('formulaHeight' in dims).toBe(false);
    expect(dims.widthMm).toBe(30);
    expect(dims.heightMm).toBe(23);
  });

  it('L22: average density is advance-based, excludes empty lines, and never exceeds 100%', () => {
    // 10 halfwidth chars = 5.0em on a 10em line: 50%, not 100% by glyph count
    const half = simulateTypesetting('aaaaaaaaaa', 10, baseConfig);
    expect(half.averageDensityPercent).toBeCloseTo(50, 5);
    // empty paragraphs do not dilute the density: two 1em lines on 10em lines
    const withEmpty = simulateTypesetting('あ\n\nあ', 10, baseConfig);
    expect(withEmpty.averageDensityPercent).toBeCloseTo(10, 5);
    // an overflowing line (1.5em glyph forced onto a 1em line) is capped at 100%
    const overflown = simulateTypesetting('あ', 1, baseConfig, { advances: { あ: 1.5 } });
    expect(overflown.averageDensityPercent).toBe(100);
  });

  it('L24: CRLF and lone CR do not leave a 1em CR glyph', () => {
    const crlf = simulateTypesetting('あいう\r\nえお', 10, baseConfig);
    expect(crlf.lines.map((l) => l.text)).toEqual(['あいう', 'えお']);
    expect(crlf.lines.flatMap((l) => l.glyphs).some((g) => g.char === '\r')).toBe(false);
    const cr = simulateTypesetting('あいう\reお', 10, baseConfig);
    expect(cr.lines.map((l) => l.text)).toEqual(['あいう', 'eお']);
  });

  it('L26: calculateTypesettingDimensions clamps zero, negative and NaN line counts', () => {
    for (const lineCount of [0, -3, Number.NaN]) {
      const dims = calculateTypesettingDimensions(12, 20, 10, lineCount);
      expect(dims.lineCount).toBe(1);
      expect(Number.isFinite(dims.widthMm)).toBe(true);
      expect(Number.isFinite(dims.heightMm)).toBe(true);
      expect(Number.isFinite(dims.lineGapH)).toBe(true);
      expect(dims.heightMm).toBe(3); // one line: 12Q x 0.25mm
    }
    expect(calculateTypesettingDimensions(12, 20, 10, 2.7).lineCount).toBe(2);
  });

  it('L27: a fullwidth space keeps 1.0em advance in palt mode', () => {
    const res = simulateTypesetting('あ　い', 10, baseConfig, { usePalt: true });
    const glyphs = res.lines[0].glyphs;
    expect(glyphs.map((g) => g.char)).toEqual(['あ', '　', 'い']);
    expect(glyphs[1].baseAdvanceEm).toBe(1.0);
    expect(glyphs[0].baseAdvanceEm).toBe(0.95);
  });

  it('L28: halfwidth period and comma are 0.5em; fullwidth ones stay 1.0em', () => {
    const res = simulateTypesetting('a.b,c', 10, baseConfig);
    const glyphs = res.lines[0].glyphs;
    expect(glyphs[1].baseAdvanceEm).toBe(0.5);
    expect(glyphs[3].baseAdvanceEm).toBe(0.5);
    const full = simulateTypesetting('あ．い，う', 10, baseConfig);
    expect(full.lines[0].glyphs[1].baseAdvanceEm).toBe(1.0);
    expect(full.lines[0].glyphs[3].baseAdvanceEm).toBe(1.0);
  });

  it('L29: halfwidth katakana and accented Latin are 0.5em', () => {
    expect(getCharKind('ｱ')).toBe('half_latin');
    expect(getCharKind('ｶ')).toBe('half_latin');
    expect(getCharKind('é')).toBe('half_latin');
    expect(getCharKind('ü')).toBe('half_latin');
    expect(getCharKind('Ł')).toBe('half_latin');
    const res = simulateTypesetting('ｱéあ', 10, baseConfig);
    expect(res.lines[0].glyphs[0].baseAdvanceEm).toBe(0.5);
    expect(res.lines[0].glyphs[1].baseAdvanceEm).toBe(0.5);
    expect(res.lines[0].glyphs[2].baseAdvanceEm).toBe(1.0);
  });

  it('L31: paragraph indent presets keep caller-set line-start rules, and none resets nothing', () => {
    const customTable = {
      ...PRESET_BETA,
      paraStart_to_nonYakumono: { min: 50, optimal: 50, max: 50, priority: 0 },
      lineStart_to_startBracket: { min: 25, optimal: 25, max: 25, priority: 0 },
    };
    const indented = applyParagraphIndentPreset(customTable, 'visual_half');
    expect(indented.paraStart_to_nonYakumono.optimal).toBe(50);
    expect(indented.lineStart_to_startBracket.optimal).toBe(25);
    // the preset still fills the unset rule
    expect(indented.paraStart_to_startBracket.optimal).toBe(50);
    const none = applyParagraphIndentPreset(customTable, 'none');
    expect(none.paraStart_to_nonYakumono.optimal).toBe(50);
    expect(none.lineStart_to_startBracket.optimal).toBe(25);
    // the default beta table has no custom rules, so the preset applies as before
    const beta = applyParagraphIndentPreset(PRESET_BETA, 'visual_half');
    expect(beta.paraStart_to_nonYakumono.optimal).toBe(100);
    expect(beta.paraStart_to_startBracket.optimal).toBe(50);
  });

  it('L33: fullwidth and halfwidth ? and ! are line-start prohibited (JIS X 4051)', () => {
    const set = getLineStartProhibitedChars('weak_v2');
    expect(set.has('？')).toBe(true);
    expect(set.has('！')).toBe(true);
    expect(set.has('?')).toBe(true);
    expect(set.has('!')).toBe(true);
    const res = simulateTypesetting('あいうえお？か', 5, { ...baseConfig, burasagari: 'none' });
    expect(res.lines.map((l) => l.text)).toEqual(['あいうえ', 'お？か']);
    expect(res.lines[1].text.startsWith('？')).toBe(false);
  });

  it('L34: the custom preset table is a deep copy of PRESET_BETA, not the same object', () => {
    expect(MOJIKUMI_PRESETS.custom.table).not.toBe(PRESET_BETA);
    for (const key of Object.keys(PRESET_BETA) as (keyof typeof PRESET_BETA)[]) {
      expect(MOJIKUMI_PRESETS.custom.table[key]).not.toBe(PRESET_BETA[key]);
      expect(MOJIKUMI_PRESETS.custom.table[key]).toEqual(PRESET_BETA[key]);
    }
  });
});
