import { describe, it, expect } from 'vitest';
import {
  DEFAULT_ASCENDER,
  DEFAULT_DESCENDER,
  SCREEN_BASELINE_Y,
  resolveBaselineY,
} from './constants';

describe('resolveBaselineY', () => {
  it('uses metadata.ascender when it is a finite positive number', () => {
    expect(resolveBaselineY(800, 1000)).toBe(800);
    expect(resolveBaselineY(900, 1000)).toBe(900);
    expect(resolveBaselineY(880, 1000)).toBe(880);
  });

  it('falls back to 80% of unitsPerEm when ascender is missing', () => {
    expect(resolveBaselineY(undefined, 1000)).toBe(800);
    expect(resolveBaselineY(undefined, 2000)).toBe(1600);
    expect(resolveBaselineY(undefined, undefined)).toBe(800);
  });

  it('falls back to 80% of unitsPerEm when ascender is invalid', () => {
    expect(resolveBaselineY(NaN, 1000)).toBe(800);
    expect(resolveBaselineY(0, 1000)).toBe(800);
    expect(resolveBaselineY(-100, 1000)).toBe(800);
    expect(resolveBaselineY('800', 1000)).toBe(800);
  });
});

describe('default metrics', () => {
  it('unifies the default descender to -200', () => {
    expect(DEFAULT_DESCENDER).toBe(-200);
  });

  it('keeps the default ascender and screen baseline at 800', () => {
    expect(DEFAULT_ASCENDER).toBe(800);
    expect(SCREEN_BASELINE_Y).toBe(800);
  });
});
