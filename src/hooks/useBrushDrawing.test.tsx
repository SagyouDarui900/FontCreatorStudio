// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { useBrushDrawing } from './useBrushDrawing';
import { PathContour } from '../types';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

function BrushHarness({
  store,
  zoom,
}: {
  store: { current: any };
  zoom: number;
}) {
  const [contours, setContours] = React.useState<PathContour[]>([]);
  const contoursRef = React.useRef<PathContour[]>(contours);
  React.useEffect(() => {
    contoursRef.current = contours;
  });
  const api = useBrushDrawing({
    toolMode: 'brush',
    brushWidth: 40,
    brushStyle: 'brush',
    pressureSensitivity: 'off',
    smoothingIntensity: 50,
    zoom,
    screenToCanvas: (x, y) => ({ x, y }),
    contoursRef,
    onChangeContours: (next) => setContours(next as PathContour[]),
    onCommitHistory: vi.fn(),
  });
  store.current = api;
  (store as any).contours = contours;
  return null;
}

function renderBrush(zoom: number) {
  const store: { current: any; contours?: PathContour[] } = { current: null };
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(<BrushHarness store={store} zoom={zoom} />);
  });
  const cleanup = () => {
    act(() => {
      root.unmount();
    });
    container.remove();
  };
  return { store, cleanup };
}

const fakePointerEvent = (overrides: Record<string, unknown> = {}) =>
  ({
    pointerType: 'mouse',
    pointerId: 1,
    button: 0,
    buttons: 1,
    shiftKey: false,
    altKey: false,
    clientX: 0,
    clientY: 0,
    pressure: 0.5,
    timeStamp: 1000,
    stopPropagation: vi.fn(),
    currentTarget: {},
    ...overrides,
  }) as any;

const flushRaf = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
};

describe('useBrushDrawing (Round 3)', () => {
  it('M10: lifting the pen while Shift is held keeps the freehand curve plus the straight tail', async () => {
    const { store, cleanup } = renderBrush(1);
    try {
      act(() => {
        store.current.handleBrushPointerDown(
          fakePointerEvent({ clientX: 100, clientY: 100, timeStamp: 1000 }),
          { x: 100, y: 100 }
        );
      });
      // Freehand curve: (100,100) -> (120,100) -> (140,110) -> (160,100).
      act(() => {
        store.current.handleBrushPointerMove(fakePointerEvent({ clientX: 120, clientY: 100, timeStamp: 1016 }));
        store.current.handleBrushPointerMove(fakePointerEvent({ clientX: 140, clientY: 110, timeStamp: 1032 }));
        store.current.handleBrushPointerMove(fakePointerEvent({ clientX: 160, clientY: 100, timeStamp: 1048 }));
      });
      await flushRaf();
      const freehand = store.current.brushStrokePointsRef.current;
      expect(freehand.length).toBeGreaterThanOrEqual(4);
      // The mouse 0.75/0.25 blend pulls each point toward the previous
      // one, so the last freehand point lands near (153, 102), not
      // exactly on (160, 100) — but the curve is recorded.
      expect(freehand[freehand.length - 1].x).toBeGreaterThan(140);
      expect(Math.max(...freehand.map((p: any) => p.y))).toBeGreaterThan(100);

      // Hold Shift and drag a straight tail to (200,100), then lift
      // the pen while Shift is still held.
      act(() => {
        store.current.handleBrushPointerMove(
          fakePointerEvent({ clientX: 200, clientY: 100, timeStamp: 1064, shiftKey: true })
        );
      });
      const withTail = store.current.brushStrokePointsRef.current;
      expect(withTail[0].x).toBeCloseTo(100, 0);
      expect(withTail[withTail.length - 1].x).toBeCloseTo(200, 0);

      act(() => {
        store.current.handleBrushPointerUp(
          fakePointerEvent({ clientX: 200, clientY: 100, timeStamp: 1080, shiftKey: true })
        );
      });
      expect(store.contours).toHaveLength(1);
      const xs = store.contours![0].nodes.map((n: any) => n.x);
      // The committed outline spans the freehand start (100) to the
      // tail end (200). If the freehand part were lost, minX would be
      // around the tail start (160 minus half width).
      expect(Math.min(...xs)).toBeLessThan(110);
      expect(Math.max(...xs)).toBeGreaterThan(190);
    } finally {
      cleanup();
    }
  });

  it('M10: releasing Shift mid-stroke keeps the straight tail for later points', async () => {
    const { store, cleanup } = renderBrush(1);
    try {
      act(() => {
        store.current.handleBrushPointerDown(
          fakePointerEvent({ clientX: 100, clientY: 100, timeStamp: 1000 }),
          { x: 100, y: 100 }
        );
      });
      act(() => {
        store.current.handleBrushPointerMove(fakePointerEvent({ clientX: 120, clientY: 100, timeStamp: 1016 }));
      });
      await flushRaf();
      act(() => {
        store.current.handleBrushPointerMove(
          fakePointerEvent({ clientX: 160, clientY: 100, timeStamp: 1032, shiftKey: true })
        );
      });
      const withTail = [...store.current.brushStrokePointsRef.current];
      expect(withTail[withTail.length - 1].x).toBeCloseTo(160, 0);
      // Let the shift branch's preview RAF fire so the next freehand
      // move schedules its own ingest RAF.
      await flushRaf();
      // Release Shift and keep drawing freehand: the tail must survive.
      act(() => {
        store.current.handleBrushPointerMove(fakePointerEvent({ clientX: 170, clientY: 110, timeStamp: 1048 }));
      });
      await flushRaf();
      const pts = store.current.brushStrokePointsRef.current;
      expect(pts[0].x).toBeCloseTo(100, 0);
      expect(pts.some((p: any) => Math.abs(p.x - 160) < 3 && Math.abs(p.y - 100) < 3)).toBe(true);
      expect(pts[pts.length - 1].x).toBeGreaterThan(160);
    } finally {
      cleanup();
    }
  });

  it('L11: micro-sampling distance is 1.5 screen px, not 1.5 canvas units', async () => {
    // zoom 2: 1.0-unit steps are 2 screen px apart, so all are kept.
    const hi = renderBrush(2);
    try {
      act(() => {
        hi.store.current.handleBrushPointerDown(
          fakePointerEvent({ clientX: 100, clientY: 100, timeStamp: 1000 }),
          { x: 100, y: 100 }
        );
      });
      act(() => {
        hi.store.current.handleBrushPointerMove(fakePointerEvent({ clientX: 102, clientY: 100, timeStamp: 1016 }));
        hi.store.current.handleBrushPointerMove(fakePointerEvent({ clientX: 104, clientY: 100, timeStamp: 1032 }));
        hi.store.current.handleBrushPointerMove(fakePointerEvent({ clientX: 106, clientY: 100, timeStamp: 1048 }));
      });
      await flushRaf();
      expect(hi.store.current.brushStrokePointsRef.current.length).toBe(4);
    } finally {
      hi.cleanup();
    }

    // zoom 0.5: the same 1.0-unit steps are 0.5 screen px apart, so
    // they are ignored as micro-sampling.
    const lo = renderBrush(0.5);
    try {
      act(() => {
        lo.store.current.handleBrushPointerDown(
          fakePointerEvent({ clientX: 100, clientY: 100, timeStamp: 1000 }),
          { x: 100, y: 100 }
        );
      });
      act(() => {
        lo.store.current.handleBrushPointerMove(fakePointerEvent({ clientX: 101, clientY: 100, timeStamp: 1016 }));
        lo.store.current.handleBrushPointerMove(fakePointerEvent({ clientX: 102, clientY: 100, timeStamp: 1032 }));
        lo.store.current.handleBrushPointerMove(fakePointerEvent({ clientX: 103, clientY: 100, timeStamp: 1048 }));
      });
      await flushRaf();
      expect(lo.store.current.brushStrokePointsRef.current.length).toBe(1);
    } finally {
      lo.cleanup();
    }
  });
});
