import { describe, expect, it } from 'vitest';
import {
  PRESET_BETA,
  PRESET_TSUME,
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

  it('propagates trackingEm onto spacingAfterEm of non-hanging glyphs for visual ake rendering', () => {
    const res = simulateTypesetting('日本語', 10, baseConfig, { trackingEm: 0.15 });
    expect(res.lines).toHaveLength(1);
    for (const g of res.lines[0].glyphs) {
      expect(g.spacingAfterEm).toBeCloseTo(0.15, 5);
    }
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
    // With trackingEm=0.25 and charsPerLine=6: each 'a' = 0.75em -> 7 'a' = 5.25em (length=7), next '。' = 5.25 + 1.25 = 6.5 > 6.05 -> hangs!
    const halfRes = simulateTypesetting('aaaaaaa。次', 6, baseConfig, { trackingEm: 0.25 });
    // Even if line only had 4 chars with large spacing (e.g. 'あいうえ' + tracking=0.25 -> 4 * 1.25 = 5.0em on 6em line):
    // length=4 < (6 - 1 = 5), so old length-based check FAILED to hang, whereas advance=5.0 >= 4.5 PASSES!
    const spacedRes = simulateTypesetting('あいうえ。次', 6, baseConfig, { trackingEm: 0.25 });
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
    const res = simulateTypesetting('あいうえ。」か', 6, baseConfig, { trackingEm: 0.25 });
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
