// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { useCustomGuidelines } from './useCustomGuidelines';
import { CustomGuideline } from '../../../types';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

function GuidelinesHarness({ store }: { store: { current: any } }) {
  const api = useCustomGuidelines({
    upm: 1000,
    toolMode: 'select',
    isShapeTool: false,
    showCanvasToast: vi.fn(),
  });
  store.current = api;
  return null;
}

function renderGuidelines() {
  const store: { current: any } = { current: null };
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(<GuidelinesHarness store={store} />);
  });
  const cleanup = () => {
    act(() => {
      root.unmount();
    });
    container.remove();
  };
  return { store, cleanup };
}

const diagonalGuide: CustomGuideline = {
  id: 'd1',
  type: 'diagonal',
  position: 0,
  p1: { x: 100, y: 100 },
  p2: { x: 200, y: 200 },
  angle: 45,
};

const hGuide: CustomGuideline = { id: 'h1', type: 'h', position: 300 };

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useCustomGuidelines (Round 3)', () => {
  it('M5: dragging a diagonal guideline translates p1/p2 by the pointer delta', () => {
    const { store, cleanup } = renderGuidelines();
    try {
      act(() => {
        store.current.setLockGuidelines(false);
      });
      act(() => {
        store.current.setCustomGuidelines([diagonalGuide]);
      });
      act(() => {
        store.current.handlePointerDownGuide({ stopPropagation: vi.fn() } as any, 'd1');
      });
      // First move only anchors the delta: the guide must not jump.
      act(() => {
        store.current.updateDraggingGuideline({ x: 110, y: 110 });
      });
      expect(store.current.customGuidelines[0].p1).toEqual({ x: 100, y: 100 });
      expect(store.current.customGuidelines[0].p2).toEqual({ x: 200, y: 200 });
      // Second move: delta (+20, +5) from the anchor.
      act(() => {
        store.current.updateDraggingGuideline({ x: 130, y: 115 });
      });
      expect(store.current.customGuidelines[0].p1).toEqual({ x: 120, y: 105 });
      expect(store.current.customGuidelines[0].p2).toEqual({ x: 220, y: 205 });
      // Angle is unchanged.
      expect(store.current.customGuidelines[0].angle).toBe(45);
    } finally {
      cleanup();
    }
  });

  it('M5: horizontal guidelines still move by absolute position', () => {
    const { store, cleanup } = renderGuidelines();
    try {
      act(() => {
        store.current.setLockGuidelines(false);
      });
      act(() => {
        store.current.setCustomGuidelines([hGuide]);
      });
      act(() => {
        store.current.handlePointerDownGuide({ stopPropagation: vi.fn() } as any, 'h1');
      });
      act(() => {
        store.current.updateDraggingGuideline({ x: 0, y: 350 });
      });
      act(() => {
        store.current.updateDraggingGuideline({ x: 0, y: 400 });
      });
      expect(store.current.customGuidelines[0].position).toBe(400);
    } finally {
      cleanup();
    }
  });

  it('M14: clear-all asks for confirmation and reports whether it cleared', () => {
    const { store, cleanup } = renderGuidelines();
    try {
      act(() => {
        store.current.setCustomGuidelines([hGuide, diagonalGuide]);
      });
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
      let cleared: boolean;
      act(() => {
        cleared = store.current.handleClearAllGuidelines();
      });
      expect(cleared!).toBe(false);
      expect(store.current.customGuidelines).toHaveLength(2);
      expect(confirmSpy).toHaveBeenCalledTimes(1);

      confirmSpy.mockReturnValue(true);
      act(() => {
        cleared = store.current.handleClearAllGuidelines();
      });
      expect(cleared!).toBe(true);
      expect(store.current.customGuidelines).toHaveLength(0);

      // Empty list: no confirm, no clear.
      confirmSpy.mockClear();
      act(() => {
        cleared = store.current.handleClearAllGuidelines();
      });
      expect(cleared!).toBe(false);
      expect(confirmSpy).not.toHaveBeenCalled();
    } finally {
      cleanup();
    }
  });

  it('H9: deleting a single guideline asks for confirmation', () => {
    const { store, cleanup } = renderGuidelines();
    try {
      act(() => {
        store.current.setCustomGuidelines([hGuide]);
      });
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
      act(() => {
        store.current.handleDeleteGuideline('h1');
      });
      expect(store.current.customGuidelines).toHaveLength(1);

      confirmSpy.mockReturnValue(true);
      act(() => {
        store.current.handleDeleteGuideline('h1');
      });
      expect(store.current.customGuidelines).toHaveLength(0);
    } finally {
      cleanup();
    }
  });
});
