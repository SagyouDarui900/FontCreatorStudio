// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { getPenMousePos, setPenMousePos, subscribePenMousePos } from './penMouseStore';

describe('penMouseStore (H12)', () => {
  it('holds the pen position outside React state and notifies subscribers', () => {
    setPenMousePos(null);
    expect(getPenMousePos()).toBeNull();

    let notifications = 0;
    const unsubscribe = subscribePenMousePos(() => {
      notifications += 1;
    });

    setPenMousePos({ x: 100, y: 200 });
    expect(getPenMousePos()).toEqual({ x: 100, y: 200 });
    expect(notifications).toBe(1);

    // Writing the identical position does not notify.
    setPenMousePos({ x: 100, y: 200 });
    expect(notifications).toBe(1);

    setPenMousePos({ x: 101, y: 200 });
    expect(notifications).toBe(2);

    unsubscribe();
    setPenMousePos(null);
    expect(notifications).toBe(2);
    expect(getPenMousePos()).toBeNull();
  });
});
