import { describe, it, expect } from 'vitest';
import { areStoredTraceSettingsEqual, sanitizeStoredTraceSettings, toStoredTraceSettings } from './traceSettings';
import { TraceSettings } from '../types';
import {
  TRACE_FONT_OPTIONS,
  TRACE_SCALE_MAX,
  TRACE_SCALE_MIN,
  clampTraceScale,
} from '../components/canvas/traceOptions';

const baseSettings: TraceSettings = {
  enabled: true,
  type: 'image',
  text: 'あ',
  fontFamily: "'Noto Sans JP', sans-serif",
  fontSize: 1000,
  imageSrc: 'data:image/png;base64,xxxx',
  charImages: { 12354: 'data:image/png;base64,yyyy' },
  opacity: 0.18,
  scale: 1,
  offsetX: 10,
  offsetY: -5,
  rotation: 30,
  contrast: 1.2,
  brightness: 1.1,
  grayscale: true,
  invert: false,
  flipH: true,
  flipV: false,
};

describe('toStoredTraceSettings', () => {
  it('drops image data URLs but keeps the other settings', () => {
    const stored = toStoredTraceSettings(baseSettings);
    expect('imageSrc' in stored).toBe(false);
    expect('charImages' in stored).toBe(false);
    expect(stored.enabled).toBe(true);
    expect(stored.type).toBe('image');
    expect(stored.text).toBe('あ');
    expect(stored.scale).toBe(1);
    expect(stored.offsetX).toBe(10);
    expect(stored.rotation).toBe(30);
    expect(stored.flipH).toBe(true);
  });
});

describe('sanitizeStoredTraceSettings', () => {
  it('returns undefined for non-objects', () => {
    expect(sanitizeStoredTraceSettings(null)).toBeUndefined();
    expect(sanitizeStoredTraceSettings('x')).toBeUndefined();
    expect(sanitizeStoredTraceSettings([])).toBeUndefined();
  });

  it('keeps valid values and clamps out-of-range numbers', () => {
    const sanitized = sanitizeStoredTraceSettings({
      ...baseSettings,
      scale: 99,
      opacity: 2,
      fontSize: 50,
    });
    expect(sanitized?.scale).toBe(TRACE_SCALE_MAX);
    expect(sanitized?.opacity).toBe(1);
    expect(sanitized?.fontSize).toBe(200);
    expect(sanitized?.text).toBe('あ');
  });

  it('replaces invalid values with defaults and drops stored image data', () => {
    const sanitized = sanitizeStoredTraceSettings({
      enabled: 'yes',
      type: 'photo',
      text: 'あいう',
      fontFamily: 42,
      scale: 'big',
    });
    expect(sanitized?.enabled).toBe(true);
    expect(sanitized?.type).toBe('char');
    expect(sanitized?.text).toBe('あ');
    expect(sanitized?.fontFamily).toBe("'Noto Sans JP', sans-serif");
    expect(sanitized?.scale).toBe(1);
    expect('imageSrc' in (sanitized as object)).toBe(false);
  });
});

describe('trace scale limits', () => {
  it('uses 0.1 to 4.0 as the shared range', () => {
    expect(TRACE_SCALE_MIN).toBe(0.1);
    expect(TRACE_SCALE_MAX).toBe(4.0);
    expect(clampTraceScale(0.05)).toBe(0.1);
    expect(clampTraceScale(5)).toBe(4.0);
    expect(clampTraceScale(1.5)).toBe(1.5);
    expect(clampTraceScale(Number.NaN)).toBe(1);
  });

  it('offers the same eight fonts in the modal and the HUD', () => {
    expect(TRACE_FONT_OPTIONS).toHaveLength(8);
    expect(TRACE_FONT_OPTIONS.map((o) => o.value)).toContain("'Noto Sans JP', sans-serif");
    expect(TRACE_FONT_OPTIONS.map((o) => o.value)).toContain('cursive');
  });
});

describe('areStoredTraceSettingsEqual', () => {
  it('treats identical values with different key insertion order as equal', () => {
    const a = { enabled: true, type: 'char' as const, opacity: 0.18, scale: 1 };
    const b = { scale: 1, opacity: 0.18, type: 'char' as const, enabled: true };
    expect(areStoredTraceSettingsEqual(a as any, b as any)).toBe(true);
    expect(areStoredTraceSettingsEqual(a as any, { ...b, scale: 1.5 } as any)).toBe(false);
  });
});
