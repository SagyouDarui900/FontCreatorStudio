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
});
