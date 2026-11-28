import { useSyncExternalStore } from 'react';
import type { Point } from '../../types';

export interface LiveViewportState {
  zoom: number;
  pan: Point;
}

/**
 * Live viewport transform (zoom & pan), held outside React state.
 *
 * Zoom listeners are tracked separately from full (zoom + pan) listeners so
 * panning / scrolling never triggers re-renders in zoom-only layers.
 *
 * Zoom notifications are throttled: a zoom change smaller than
 * ZOOM_NOTIFY_THRESHOLD (relative) does not notify zoom-only listeners.
 * The stored value is always updated, so the next React render (e.g. the
 * zoom commit that follows a gesture) reads the exact latest zoom. This
 * keeps slow zooms from re-rendering every layer on every frame while the
 * visible error stays below ~0.2% (under 0.03 screen px for a 14px handle).
 *
 * Before the store is first synced, the hooks fall back to the canvas's
 * initial React state (INITIAL_LIVE_ZOOM / INITIAL_LIVE_PAN). Layers must
 * not receive zoom/pan as props for this: the prop would change on every
 * zoom commit and defeat their React.memo, re-rendering them a second time
 * right after the live subscription already updated them.
 */
export const INITIAL_LIVE_ZOOM = 0.55;
export const INITIAL_LIVE_PAN: Point = { x: 0, y: 0 };
let liveViewport: LiveViewportState | null = null;
let liveRulerViewport: LiveViewportState | null = null;
const viewportListeners = new Set<() => void>();
const zoomListeners = new Set<() => void>();
const rulerListeners = new Set<() => void>();

const DEFAULT_FALLBACK_VIEWPORT: LiveViewportState = {
  zoom: INITIAL_LIVE_ZOOM,
  pan: { ...INITIAL_LIVE_PAN },
};

const ZOOM_NOTIFY_THRESHOLD = 0.002;
let lastNotifiedZoom: number | null = null;

export function setLiveViewport(zoom: number, pan: Point): void {
  const prevZoom = liveViewport?.zoom;
  const unchanged =
    liveViewport &&
    liveViewport.zoom === zoom &&
    liveViewport.pan.x === pan.x &&
    liveViewport.pan.y === pan.y &&
    liveRulerViewport === null;
  if (unchanged) {
    return;
  }
  liveViewport = { zoom, pan: { x: pan.x, y: pan.y } };
  liveRulerViewport = null;
  viewportListeners.forEach((listener) => listener());
  rulerListeners.forEach((listener) => listener());
  if (prevZoom !== zoom) {
    if (
      lastNotifiedZoom === null ||
      lastNotifiedZoom <= 0 ||
      Math.abs(zoom / lastNotifiedZoom - 1) >= ZOOM_NOTIFY_THRESHOLD
    ) {
      lastNotifiedZoom = zoom;
      zoomListeners.forEach((listener) => listener());
    }
  }
}

export function setLiveRulerViewport(zoom: number, pan: Point): void {
  if (
    liveRulerViewport &&
    liveRulerViewport.zoom === zoom &&
    liveRulerViewport.pan.x === pan.x &&
    liveRulerViewport.pan.y === pan.y
  ) {
    return;
  }
  liveRulerViewport = { zoom, pan: { x: pan.x, y: pan.y } };
  rulerListeners.forEach((listener) => listener());
}

export function clearLiveViewport(): void {
  if (liveViewport === null && liveRulerViewport === null) return;
  liveViewport = null;
  liveRulerViewport = null;
  lastNotifiedZoom = null;
  viewportListeners.forEach((listener) => listener());
  zoomListeners.forEach((listener) => listener());
  rulerListeners.forEach((listener) => listener());
}

export function getLiveViewport(): LiveViewportState | null {
  return liveViewport;
}

function getLiveRulerViewportSnapshot(): LiveViewportState {
  return liveRulerViewport ?? liveViewport ?? DEFAULT_FALLBACK_VIEWPORT;
}

function getLiveZoomOnly(): number | null {
  return liveViewport ? liveViewport.zoom : null;
}

function subscribeViewport(listener: () => void): () => void {
  viewportListeners.add(listener);
  return () => {
    viewportListeners.delete(listener);
  };
}

function subscribeRulerViewport(listener: () => void): () => void {
  rulerListeners.add(listener);
  return () => {
    rulerListeners.delete(listener);
  };
}

function subscribeZoom(listener: () => void): () => void {
  zoomListeners.add(listener);
  return () => {
    zoomListeners.delete(listener);
  };
}

export function useLiveViewport(): LiveViewportState {
  const storeValue = useSyncExternalStore(subscribeViewport, getLiveViewport);
  return storeValue ?? { zoom: INITIAL_LIVE_ZOOM, pan: { ...INITIAL_LIVE_PAN } };
}

export function useLiveRulerViewport(): LiveViewportState {
  return useSyncExternalStore(subscribeRulerViewport, getLiveRulerViewportSnapshot);
}

export function useLiveViewportZoom(): number {
  const storeZoom = useSyncExternalStore(subscribeZoom, getLiveZoomOnly);
  return storeZoom ?? INITIAL_LIVE_ZOOM;
}
