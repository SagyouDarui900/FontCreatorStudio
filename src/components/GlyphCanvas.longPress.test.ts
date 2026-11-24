// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
  CANVAS_LONG_PRESS_MS,
  CANVAS_LONG_PRESS_CANCEL_PX,
  isLongPressMoveCancelled,
} from './GlyphCanvas';

describe('canvas long-press (touch context menu)', () => {
  it('uses the same 480ms hold as the glyph grid card', () => {
    expect(CANVAS_LONG_PRESS_MS).toBe(480);
  });

  it('cancels when the finger moves more than 10px, like the grid card', () => {
    const start = { x: 100, y: 100 };
    expect(isLongPressMoveCancelled(start, { x: 100, y: 100 })).toBe(false);
    expect(isLongPressMoveCancelled(start, { x: 110, y: 100 })).toBe(false);
    expect(isLongPressMoveCancelled(start, { x: 111, y: 100 })).toBe(true);
    expect(isLongPressMoveCancelled(start, { x: 100, y: 89 })).toBe(true);
    expect(isLongPressMoveCancelled(start, { x: 105, y: 105 })).toBe(false);
  });

  it('exposes the 10px cancel threshold', () => {
    expect(CANVAS_LONG_PRESS_CANCEL_PX).toBe(10);
  });
});
