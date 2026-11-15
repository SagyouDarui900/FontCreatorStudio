import { describe, it, expect } from 'vitest';
import { computeTraceCharMetrics } from './traceCharMetrics';

describe('computeTraceCharMetrics', () => {
  it('renders Japanese kana cleanly inside the 78% kana guide frame with deterministic alphabetic EM centering', () => {
    const res = computeTraceCharMetrics({
      charToRender: 'あ',
      unitsPerEm: 1000,
      fontSize: 1000,
    });
    expect(res.isKana).toBe(true);
    expect(res.isJapanese).toBe(true);
    expect(res.effectiveFontSize).toBe(940);
    expect(res.effectiveY).toBe(Math.round(500 + 940 * 0.38));
    expect(res.dominantBaseline).toBe('alphabetic');
    expect(res.anchorX).toBe(500);
    expect(res.charBoxSize).toBe(780);
  });

  it('renders Japanese kanji scaled inside the 85% kanji guide frame and EM bounds without overflowing', () => {
    for (const ch of ['漢', '永', '龍', '鬱', '日']) {
      const res = computeTraceCharMetrics({
        charToRender: ch,
        unitsPerEm: 1000,
        fontSize: 1000,
      });
      expect(res.isKanji).toBe(true);
      expect(res.isJapanese).toBe(true);
      expect(res.effectiveFontSize).toBe(880);
      expect(res.effectiveY).toBe(Math.round(500 + 880 * 0.38));
      expect(res.dominantBaseline).toBe('alphabetic');
      expect(res.charBoxSize).toBe(850);
      // CJK ideographic EM box top (effectiveY - 0.88*fs) and bottom (effectiveY + 0.12*fs) stay well inside [0, 1000]
      expect(res.effectiveY - res.effectiveFontSize * 0.88).toBeGreaterThan(40);
      expect(res.effectiveY + res.effectiveFontSize * 0.12).toBeLessThan(960);
    }
  });

  it('renders extended kana and Japanese punctuation inside EM bounds', () => {
    for (const ch of ['っ', 'ゔ', '・', 'ー', '。', '、', '「', '〜']) {
      const res = computeTraceCharMetrics({
        charToRender: ch,
        unitsPerEm: 1000,
        fontSize: 1000,
      });
      expect(res.isJapanese).toBe(true);
      expect(res.effectiveFontSize).toBe(940);
      expect(res.effectiveY).toBe(Math.round(500 + 940 * 0.38));
      expect(res.dominantBaseline).toBe('alphabetic');
    }
  });

  it('keeps identical baseline and scale across normal, descender, and accented Latin letters', () => {
    const base = computeTraceCharMetrics({ charToRender: 'a', unitsPerEm: 1000, fontSize: 1000 });
    const descender = computeTraceCharMetrics({ charToRender: 'g', unitsPerEm: 1000, fontSize: 1000 });
    const accented = computeTraceCharMetrics({ charToRender: 'É', unitsPerEm: 1000, fontSize: 1000 });
    const cap = computeTraceCharMetrics({ charToRender: 'A', unitsPerEm: 1000, fontSize: 1000 });

    expect(base.isJapanese).toBe(false);
    expect(base.dominantBaseline).toBe('alphabetic');
    expect(base.effectiveY).toBe(800);
    expect(descender.effectiveY).toBe(base.effectiveY);
    expect(accented.effectiveY).toBe(base.effectiveY);
    expect(cap.effectiveY).toBe(base.effectiveY);

    expect(descender.effectiveFontSize).toBe(base.effectiveFontSize);
    expect(accented.effectiveFontSize).toBe(base.effectiveFontSize);
    expect(cap.effectiveFontSize).toBe(base.effectiveFontSize);
    expect(base.effectiveFontSize).toBe(800);
  });

  it('centers narrow half-width Latin glyphs inside custom advanceWidth', () => {
    const res = computeTraceCharMetrics({
      charToRender: 'a',
      unitsPerEm: 1000,
      fontSize: 1000,
      advanceWidth: 500,
    });
    expect(res.anchorX).toBe(250);
    expect(res.charBoxX).toBe(250 - res.charBoxSize / 2);
  });

  it('scales proportionally with custom unitsPerEm and user fontSize', () => {
    const res = computeTraceCharMetrics({
      charToRender: '日',
      unitsPerEm: 1200,
      fontSize: 1000,
    });
    expect(res.effectiveFontSize).toBe(Math.round(1200 * 0.88));
    expect(res.effectiveY).toBe(Math.round(600 + res.effectiveFontSize * 0.38));
    expect(res.anchorX).toBe(600);
  });
});
