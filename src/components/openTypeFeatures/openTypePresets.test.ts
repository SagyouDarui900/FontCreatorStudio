import { describe, expect, it } from 'vitest';
import {
  buildDefaultOpenTypeFeaturesConfig,
  DEFAULT_LIGATURE_PRESETS,
  DEFAULT_VERT_PRESETS,
  findVertPresetInfo,
  parseUnicodeCodePoint,
  safeFromCodePoint,
} from './openTypePresets';

describe('openTypePresets helpers', () => {
  it('parses valid hex U+ and decimal Unicode code points and rejects malformed inputs', () => {
    expect(parseUnicodeCodePoint('U+FB01')).toBe(0xfb01);
    expect(parseUnicodeCodePoint(' u+3002 ')).toBe(0x3002);
    expect(parseUnicodeCodePoint('64257')).toBe(64257);
    expect(parseUnicodeCodePoint('U+10FFFF')).toBe(0x10ffff);

    expect(parseUnicodeCodePoint('')).toBeNull();
    expect(parseUnicodeCodePoint('U+FB01ZZ')).toBeNull();
    expect(parseUnicodeCodePoint('12abc')).toBeNull();
    expect(parseUnicodeCodePoint('U+110000')).toBeNull();
    expect(parseUnicodeCodePoint('-1')).toBeNull();
  });

  it('formats valid code points safely including supplementary planes', () => {
    expect(safeFromCodePoint(0x3042)).toBe('あ');
    expect(safeFromCodePoint(0x1f600)).toBe('😀');
    expect(safeFromCodePoint(-1)).toBe('');
    expect(safeFromCodePoint(0x110000)).toBe('');
  });

  it('builds default config with all vertical and ligature presets', () => {
    const cfg = buildDefaultOpenTypeFeaturesConfig(1000, 880);
    expect(cfg.enabled).toBe(true);
    expect(cfg.verticalWriting.defaultVertAdvance).toBe(1000);
    expect(cfg.verticalWriting.vertOriginY).toBe(880);
    expect(cfg.verticalWriting.substitutions).toHaveLength(DEFAULT_VERT_PRESETS.length);
    expect(cfg.ligatures).toHaveLength(DEFAULT_LIGATURE_PRESETS.length);
  });

  it('matches vertical preset info by code point pair even when index shifts', () => {
    const sub = { id: 'custom', sourceUnicode: 0x30fc, vertUnicode: 0xfe31, enabled: true };
    const found = findVertPresetInfo(sub, 0);
    expect(found?.name).toBe('長音記号 (ー)');
  });

  it('orders 3-char ligatures (ffi/ffl) before ff and uses fullwidth curly braces in vertical presets', () => {
    const ids = DEFAULT_LIGATURE_PRESETS.map((p) => p.id);
    expect(ids.indexOf('liga_ffi')).toBeLessThan(ids.indexOf('liga_ff'));
    expect(ids.indexOf('liga_ffl')).toBeLessThan(ids.indexOf('liga_ff'));
    expect(DEFAULT_VERT_PRESETS.some((p) => p.sourceUnicode === 0xff5b && p.vertUnicode === 0xfe37)).toBe(true);
    expect(DEFAULT_VERT_PRESETS.some((p) => p.sourceUnicode === 0x3010 && p.vertUnicode === 0xfe3b)).toBe(true);
  });
});
