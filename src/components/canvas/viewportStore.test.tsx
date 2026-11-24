// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import {
  clearLiveViewport,
  getLiveViewport,
  setLiveViewport,
  useLiveViewport,
  useLiveViewportZoom,
  INITIAL_LIVE_ZOOM,
  INITIAL_LIVE_PAN,
} from './viewportStore';
import { quantizeInverseZoom } from './BezierNodeControlsLayer';

function renderZoomCounters(container: HTMLDivElement) {
  const root = createRoot(container);
  let zoomRenderCount = 0;
  let fullRenderCount = 0;
  const ZoomCounter = () => {
    zoomRenderCount++;
    useLiveViewportZoom();
    return null;
  };
  const FullCounter = () => {
    fullRenderCount++;
    useLiveViewport();
    return null;
  };
  act(() => {
    root.render(
      <svg>
        <ZoomCounter />
        <FullCounter />
      </svg>
    );
  });
  return {
    root,
    getZoomRenders: () => zoomRenderCount,
    getFullRenders: () => fullRenderCount,
  };
}

describe('viewportStore zoom notification throttling', () => {
  it('does not notify zoom listeners for zoom changes below 0.2% but keeps the latest value', () => {
    clearLiveViewport();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const { root, getZoomRenders, getFullRenders } = renderZoomCounters(container);

    act(() => {
      setLiveViewport(1, { x: 0, y: 0 });
    });
    const afterFirst = getZoomRenders();
    expect(afterFirst).toBeGreaterThan(0);

    // 0.1% zoom change: zoom listeners stay quiet, full listeners still fire.
    act(() => {
      setLiveViewport(1.001, { x: 0, y: 0 });
    });
    expect(getZoomRenders()).toBe(afterFirst);
    expect(getFullRenders()).toBeGreaterThan(0);
    // The stored value is always the latest one, so the next React render
    // (e.g. the zoom commit) reads the exact zoom.
    expect(getLiveViewport()?.zoom).toBe(1.001);

    act(() => {
      root.unmount();
    });
    clearLiveViewport();
    container.remove();
  });

  it('notifies zoom listeners once the cumulative change reaches 0.2%', () => {
    clearLiveViewport();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const { root, getZoomRenders } = renderZoomCounters(container);

    act(() => {
      setLiveViewport(1, { x: 0, y: 0 });
    });
    const baseline = getZoomRenders();

    act(() => {
      setLiveViewport(1.001, { x: 0, y: 0 });
    });
    expect(getZoomRenders()).toBe(baseline);

    // Another 0.1% step reaches 0.2% from the last notified zoom.
    act(() => {
      setLiveViewport(1.002, { x: 0, y: 0 });
    });
    expect(getZoomRenders()).toBe(baseline + 1);
    expect(getLiveViewport()?.zoom).toBe(1.002);

    act(() => {
      root.unmount();
    });
    clearLiveViewport();
    container.remove();
  });

  it('notifies zoom listeners immediately for a large zoom change', () => {
    clearLiveViewport();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const { root, getZoomRenders } = renderZoomCounters(container);

    act(() => {
      setLiveViewport(0.5, { x: 0, y: 0 });
    });
    const baseline = getZoomRenders();

    act(() => {
      setLiveViewport(2, { x: 10, y: 20 });
    });
    expect(getZoomRenders()).toBe(baseline + 1);

    act(() => {
      root.unmount();
    });
    clearLiveViewport();
    container.remove();
  });

  it('pan-only changes notify full listeners but not zoom listeners', () => {
    clearLiveViewport();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const { root, getZoomRenders, getFullRenders } = renderZoomCounters(container);

    act(() => {
      setLiveViewport(1, { x: 0, y: 0 });
    });
    const zoomBaseline = getZoomRenders();
    const fullBaseline = getFullRenders();

    act(() => {
      setLiveViewport(1, { x: 100, y: 200 });
    });
    expect(getZoomRenders()).toBe(zoomBaseline);
    expect(getFullRenders()).toBe(fullBaseline + 1);

    act(() => {
      root.unmount();
    });
    clearLiveViewport();
    container.remove();
  });

  it('clearLiveViewport resets the throttle baseline', () => {
    clearLiveViewport();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const { root, getZoomRenders } = renderZoomCounters(container);

    act(() => {
      setLiveViewport(1, { x: 0, y: 0 });
    });
    const baseline = getZoomRenders();

    act(() => {
      clearLiveViewport();
    });
    // After a clear, the next set notifies zoom listeners even for a zoom
    // value close to the previous one (the baseline was reset).
    act(() => {
      setLiveViewport(1.001, { x: 0, y: 0 });
    });
    expect(getZoomRenders()).toBeGreaterThan(baseline);

    act(() => {
      root.unmount();
    });
    clearLiveViewport();
    container.remove();
  });
});

describe('viewportStore initial fallback', () => {
  it('falls back to the initial canvas zoom/pan while the store is empty', () => {
    clearLiveViewport();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    let seenZoom = -1;
    let seenViewport: { zoom: number; pan: { x: number; y: number } } | null = null;
    const Reader = () => {
      seenZoom = useLiveViewportZoom();
      seenViewport = useLiveViewport();
      return null;
    };
    act(() => {
      root.render(
        <svg>
          <Reader />
        </svg>
      );
    });
    // The fallback is the canvas's initial React state, so the first paint
    // shows the same zoom/pan as before the zoom prop was removed.
    expect(seenZoom).toBe(INITIAL_LIVE_ZOOM);
    expect(seenViewport).toEqual({ zoom: INITIAL_LIVE_ZOOM, pan: INITIAL_LIVE_PAN });

    // Once the store is synced (e.g. by the initial fit), the hooks read
    // the store value instead of the fallback.
    act(() => {
      setLiveViewport(0.8, { x: 120, y: 90 });
    });
    expect(seenZoom).toBe(0.8);
    expect(seenViewport).toEqual({ zoom: 0.8, pan: { x: 120, y: 90 } });

    act(() => {
      root.unmount();
    });
    clearLiveViewport();
    container.remove();
  });
});

describe('quantizeInverseZoom', () => {
  it('returns 1 for zoom 1 and stays within 1% of the exact inverse', () => {
    expect(quantizeInverseZoom(1)).toBe(1);
    for (const zoom of [0.05, 0.55, 1, 1.5, 2, 8, 32]) {
      const q = quantizeInverseZoom(zoom);
      expect(Math.abs(q / (1 / zoom) - 1)).toBeLessThanOrEqual(0.011);
    }
  });

  it('keeps nearby zooms in the same bucket and separates 2% steps', () => {
    expect(quantizeInverseZoom(1.001)).toBe(quantizeInverseZoom(1));
    expect(quantizeInverseZoom(1.02)).not.toBe(quantizeInverseZoom(1));
  });

  it('falls back to 1 for invalid zoom values', () => {
    expect(quantizeInverseZoom(0)).toBe(1);
    expect(quantizeInverseZoom(-2)).toBe(1);
    expect(quantizeInverseZoom(Number.NaN)).toBe(1);
  });
});
