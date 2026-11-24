// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCanvasViewport } from './useCanvasViewport';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

describe('useCanvasViewport initial layout re-centering', () => {
  let resizeCallback: ResizeObserverCallback | null = null;
  let mockRect = { left: 0, top: 0, width: 1200, height: 800, right: 1200, bottom: 800 };

  beforeEach(() => {
    resizeCallback = null;
    mockRect = { left: 0, top: 0, width: 1200, height: 800, right: 1200, bottom: 800 };

    vi.stubGlobal(
      'ResizeObserver',
      class MockResizeObserver {
        constructor(cb: ResizeObserverCallback) {
          resizeCallback = cb;
        }
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('re-centers fit zoom/pan when sidebar narrows the canvas before manual user pan/zoom, and preserves user view afterwards', () => {
    vi.useFakeTimers();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    let api: ReturnType<typeof useCanvasViewport> | null = null;

    function Harness() {
      const vp = useCanvasViewport({ upm: 1000, showRulers: true });
      api = vp;
      return (
        <div
          ref={(el) => {
            if (el) {
              el.getBoundingClientRect = () => mockRect as DOMRect;
            }
            vp.containerRef.current = el;
          }}
        />
      );
    }

    act(() => {
      root.render(<Harness />);
      vi.runAllTimers();
    });

    // Initial mount measured at full 1200x800 width -> pan.x centered at 250
    const fullWidthPanX = api!.pan.x;
    expect(fullWidthPanX).toBeGreaterThanOrEqual(240);

    // Simulate sidebar opening and narrowing canvas to 800x800 via ResizeObserver
    mockRect = { left: 0, top: 0, width: 800, height: 800, right: 800, bottom: 800 };
    act(() => {
      resizeCallback?.(
        [{ contentRect: { width: 800, height: 800 } } as ResizeObserverEntry],
        {} as ResizeObserver
      );
    });

    // Should re-center for 800px width (availW = 772, zoom ~ 0.728, pan.x ~ 50)
    const narrowedPanX = api!.pan.x;
    expect(narrowedPanX).toBeLessThan(120);
    expect(narrowedPanX).toBeGreaterThan(20);

    // Once the user manually pans or zooms, subsequent ResizeObserver events must preserve zoom
    act(() => {
      api!.setZoom(1.5);
      api!.setPan({ x: 180, y: 90 });
    });

    mockRect = { left: 0, top: 0, width: 950, height: 800, right: 950, bottom: 800 };
    act(() => {
      resizeCallback?.(
        [{ contentRect: { width: 950, height: 800 } } as ResizeObserverEntry],
        {} as ResizeObserver
      );
    });

    expect(api!.zoom).toBe(1.5);
    expect(api!.pan).toEqual({ x: 180, y: 90 });

    act(() => {
      root.unmount();
    });
    container.remove();
    vi.useRealTimers();
  });
});
