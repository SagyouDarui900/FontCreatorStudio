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
 */
let liveViewport: LiveViewportState | null = null;
const viewportListeners = new Set<() => void>();
const zoomListeners = new Set<() => void>();

export function setLiveViewport(zoom: number, pan: Point): void {
  const prevZoom = liveViewport?.zoom;
  if (
    liveViewport &&
    liveViewport.zoom === zoom &&
    liveViewport.pan.x === pan.x &&
    liveViewport.pan.y === pan.y
  ) {
    return;
  }
  liveViewport = { zoom, pan: { x: pan.x, y: pan.y } };
  viewportListeners.forEach((listener) => listener());
  if (prevZoom !== zoom) {
    zoomListeners.forEach((listener) => listener());
  }
}

export function clearLiveViewport(): void {
  if (liveViewport === null) return;
  liveViewport = null;
  viewportListeners.forEach((listener) => listener());
  zoomListeners.forEach((listener) => listener());
}

export function getLiveViewport(): LiveViewportState | null {
  return liveViewport;
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

function subscribeZoom(listener: () => void): () => void {
  zoomListeners.add(listener);
  return () => {
    zoomListeners.delete(listener);
  };
}

export function useLiveViewport(fallbackZoom: number, fallbackPan: Point): LiveViewportState {
  const storeValue = useSyncExternalStore(subscribeViewport, getLiveViewport);
  return storeValue ?? { zoom: fallbackZoom, pan: fallbackPan };
}

export function useLiveViewportZoom(fallbackZoom: number): number {
  const storeZoom = useSyncExternalStore(subscribeZoom, getLiveZoomOnly);
  return storeZoom ?? fallbackZoom;
}
