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
    // 5 chars/line: "あいう「え。」かき" -> before break at index 5 ('。'), '」' at line 2 head is also startProhibited
    // Look at "あいうえ。」か" (5 chars/line): index 0='あ',1='い',2='う',3='え',4='。',5='」',6='か'
    // index 5 '」' exceeds line -> startProhibited pops '。' too? No, '。' before '」' at index 4 -> '。' pushed to next line -> wait: '。」' would start line 2 with '。' which is startProhibited -> pushes 'え' so line 2 starts with 'え。」' (non-prohibited)!
    const res = simulateTypesetting('あいうえ。」か', 5, baseConfig);
    expect(res.lines[0].text).toBe('あいう');
    expect(res.lines[1].text.startsWith('え。」')).toBe(true);

    // Exposing '「' at end of line after popping start-prohibited '。':
    // 5 chars/line: "あいう「。」か" -> index 0..3 fits (with spacing before '「' = 0.5, advance = 4.5); index 4='。' exceeds or fits? 4.5 + 1 = 5.5 > 5.05 -> '。' exceeds -> '「' is at tail and endProhibited -> pushes '「' too!
    const bracketRes = simulateTypesetting('あいう「。」か', 5, baseConfig);
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
