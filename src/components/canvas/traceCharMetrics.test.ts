import { describe, it, expect } from 'vitest';
import {
  computeTraceCharMetrics,
  getDefaultTraceScale,
  isKanaText,
  isKanjiText,
} from './traceCharMetrics';

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

  it('uses resolved baselineY when provided for Latin glyphs', () => {
    const res = computeTraceCharMetrics({
      charToRender: 'A',
      unitsPerEm: 1000,
      fontSize: 1000,
      baselineY: 880,
    });
    expect(res.effectiveY).toBe(880);
  });
});

describe('trace character kind and default scale', () => {
  it('classifies kana, kanji and other characters with the shared patterns', () => {
    expect(isKanaText('あ')).toBe(true);
    expect(isKanaText('ア')).toBe(true);
    expect(isKanaText('漢')).toBe(false);
    expect(isKanaText('a')).toBe(false);
    expect(isKanjiText('漢')).toBe(true);
    expect(isKanjiText('あ')).toBe(false);
    expect(isKanjiText('a')).toBe(false);
  });

  it('returns the same default scale for image and character underdrawings', () => {
    expect(getDefaultTraceScale('あ')).toBe(0.78);
    expect(getDefaultTraceScale('ア')).toBe(0.78);
    expect(getDefaultTraceScale('漢')).toBe(0.85);
    expect(getDefaultTraceScale('a')).toBe(1.0);
    expect(getDefaultTraceScale('')).toBe(1.0);
  });

  it('agrees with computeTraceCharMetrics on kana and kanji', () => {
    for (const ch of ['あ', 'ン', 'ー']) {
      expect(computeTraceCharMetrics({ charToRender: ch, unitsPerEm: 1000 }).isKana).toBe(true);
      expect(getDefaultTraceScale(ch)).toBe(0.78);
    }
    for (const ch of ['漢', '日']) {
      expect(computeTraceCharMetrics({ charToRender: ch, unitsPerEm: 1000 }).isKanji).toBe(true);
      expect(getDefaultTraceScale(ch)).toBe(0.85);
    }
  });
});
