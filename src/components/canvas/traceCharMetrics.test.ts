import { describe, it, expect } from 'vitest';
import { computeTraceCharMetrics } from './traceCharMetrics';

describe('computeTraceCharMetrics', () => {
  it('renders Japanese kana at full UPM EM size without double-shrinking', () => {
    const res = computeTraceCharMetrics({
      charToRender: 'あ',
      unitsPerEm: 1000,
      fontSize: 1000,
    });
    expect(res.isKana).toBe(true);
    expect(res.isJapanese).toBe(true);
    expect(res.effectiveFontSize).toBe(1000);
    expect(res.effectiveY).toBe(500);
    expect(res.dominantBaseline).toBe('central');
    expect(res.anchorX).toBe(500);
    expect(res.charBoxSize).toBe(780);
  });

  it('renders Japanese kanji and extended kana/punctuation at full UPM EM size', () => {
    for (const ch of ['漢', '永', 'っ', 'ゔ', '・', 'ー', '。', '、', '「', '〜']) {
      const res = computeTraceCharMetrics({
        charToRender: ch,
        unitsPerEm: 1000,
        fontSize: 1000,
      });
      expect(res.isJapanese).toBe(true);
      expect(res.effectiveFontSize).toBe(1000);
      expect(res.effectiveY).toBe(500);
      expect(res.dominantBaseline).toBe('central');
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
    expect(res.effectiveFontSize).toBe(1200);
    expect(res.effectiveY).toBe(600);
    expect(res.anchorX).toBe(600);
  });
});
