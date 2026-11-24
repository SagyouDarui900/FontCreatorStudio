import { describe, expect, it } from 'vitest';
import { getThemeClasses, THEME_PRESETS } from './theme';

describe('getThemeClasses', () => {
  it('returns the same object reference for the same mode', () => {
    for (const preset of THEME_PRESETS) {
      expect(getThemeClasses(preset.id)).toBe(getThemeClasses(preset.id));
    }
    expect(getThemeClasses()).toBe(getThemeClasses('light'));
  });

  it('returns different references for different modes', () => {
    expect(getThemeClasses('light')).not.toBe(getThemeClasses('dark'));
    expect(getThemeClasses('sepia')).not.toBe(getThemeClasses('warm'));
    expect(getThemeClasses('nord')).not.toBe(getThemeClasses('monochrome'));
  });

  it('keeps the documented class values', () => {
    expect(getThemeClasses('light').accentHex).toBe('#059669');
    expect(getThemeClasses('light').canvasBgHex).toBe('#eef5f1');
    expect(getThemeClasses('dark').accentHex).toBe('#10b981');
    expect(getThemeClasses('dark').canvasBgHex).toBe('#0a110d');
    expect(getThemeClasses('sepia').accentHex).toBe('#854d0e');
    expect(getThemeClasses('warm').accentHex).toBe('#ea580c');
    expect(getThemeClasses('nord').accentHex).toBe('#88c0d0');
    expect(getThemeClasses('monochrome').accentHex).toBe('#18181b');
  });

  it('falls back to the light theme for an unknown mode', () => {
    expect(getThemeClasses('unknown' as never)).toBe(getThemeClasses('light'));
    expect(getThemeClasses('unknown' as never).accentHex).toBe('#059669');
  });
});
