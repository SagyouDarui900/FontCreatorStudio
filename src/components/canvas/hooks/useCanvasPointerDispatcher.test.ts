// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
  isDoubleTap,
  DOUBLE_TAP_MAX_DISTANCE_PX,
  DOUBLE_TAP_MAX_INTERVAL_MS,
  type TapPoint,
} from './useCanvasPointerDispatcher';

describe('isDoubleTap', () => {
  const first: TapPoint = { time: 1000, x: 200, y: 300 };

  it('accepts a second tap close in time and position', () => {
    expect(isDoubleTap(first, { time: 1000 + DOUBLE_TAP_MAX_INTERVAL_MS - 1, x: 200, y: 300 })).toBe(true);
    expect(
      isDoubleTap(first, { time: 1200, x: 200 + DOUBLE_TAP_MAX_DISTANCE_PX, y: 300 })
    ).toBe(true);
  });

  it('rejects taps too far apart in time', () => {
    expect(isDoubleTap(first, { time: 1000 + DOUBLE_TAP_MAX_INTERVAL_MS, x: 200, y: 300 })).toBe(false);
    expect(isDoubleTap(first, { time: 5000, x: 200, y: 300 })).toBe(false);
  });

  it('rejects a second tap at a different position (the reported bug)', () => {
    // Same time window, but the finger landed elsewhere on the canvas.
    expect(isDoubleTap(first, { time: 1100, x: 400, y: 300 })).toBe(false);
    expect(isDoubleTap(first, { time: 1100, x: 200, y: 500 })).toBe(false);
    // Just outside the distance threshold, diagonally.
    expect(
      isDoubleTap(first, { time: 1100, x: 200 + DOUBLE_TAP_MAX_DISTANCE_PX, y: 300 + 1 })
    ).toBe(false);
  });

  it('rejects a missing first tap and a backwards clock', () => {
    expect(isDoubleTap(null, { time: 1000, x: 200, y: 300 })).toBe(false);
    expect(isDoubleTap(first, { time: 999, x: 200, y: 300 })).toBe(false);
  });
});
