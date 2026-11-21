import { useSyncExternalStore } from 'react';

const DEFAULT_VIEWPORT_WIDTH = 1280;

function readViewportWidth(): number {
  if (typeof window === 'undefined') return DEFAULT_VIEWPORT_WIDTH;
  const raw = window.visualViewport ? window.visualViewport.width : window.innerWidth;
  return Number.isFinite(raw) ? Math.round(raw) : DEFAULT_VIEWPORT_WIDTH;
}

const listeners = new Set<() => void>();
let cachedWidth = readViewportWidth();

function handleViewportResize() {
  const next = readViewportWidth();
  if (next !== cachedWidth) {
    cachedWidth = next;
  }
  listeners.forEach((listener) => listener());
}

function subscribeViewportWidth(listener: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  if (listeners.size === 0) {
    cachedWidth = readViewportWidth();
    window.addEventListener('resize', handleViewportResize);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportResize);
    }
  }

  listeners.add(listener);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.removeEventListener('resize', handleViewportResize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportResize);
      }
    }
  };
}

export function getViewportWidth(): number {
  if (listeners.size === 0) {
    cachedWidth = readViewportWidth();
  }
  return cachedWidth;
}

export function useViewportWidth(): number {
  return useSyncExternalStore(
    subscribeViewportWidth,
    getViewportWidth,
    () => DEFAULT_VIEWPORT_WIDTH
  );
}

export interface ResponsiveOverlayFlags {
  isGridOverlay: boolean;
  isMetricsOverlay: boolean;
  isRadicalsOverlay: boolean;
}

/**
 * Consistent breakpoints:
 * - < 1280: Grid, Metrics, and Radicals act as overlay drawers to protect canvas space
 * - 1280 - 1439: Grid is inline sidebar; Metrics / Radicals is overlay if Grid is open
 * - >= 1440: Both Grid and Metrics / Radicals can be inline simultaneously
 */
export function getResponsiveOverlayFlags(
  viewportWidth: number,
  showGridDrawer: boolean
): ResponsiveOverlayFlags {
  const isGridOverlay = viewportWidth < 1280;
  const isMetricsOverlay = viewportWidth < 1280 || (viewportWidth < 1440 && showGridDrawer);
  const isRadicalsOverlay = isMetricsOverlay;
  return {
    isGridOverlay,
    isMetricsOverlay,
    isRadicalsOverlay,
  };
}
