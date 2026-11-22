import { useSyncExternalStore } from 'react';
import type { Point } from '../../types';

/**
 * Hover position in font-canvas coordinates, held outside React state.
 *
 * Previously this lived in GlyphCanvas state and was passed down to the
 * whole SVG stage, so every pointer move re-rendered GlyphCanvas and the
 * stage. Now the pointer dispatcher writes here and only the small
 * components that actually display hover information (ruler indicator,
 * node hover, pen rubber-band, status bar coordinates) subscribe to it.
 * GlyphCanvas and CanvasSvgStage no longer re-render on hover.
 */
let hoverPos: Point | null = null;
const listeners = new Set<() => void>();

export function setHoverCanvasPos(pos: Point | null): void {
  if (hoverPos === pos) return;
  if (hoverPos && pos && hoverPos.x === pos.x && hoverPos.y === pos.y) return;
  hoverPos = pos;
  listeners.forEach((listener) => listener());
}

export function getHoverCanvasPos(): Point | null {
  return hoverPos;
}

export function subscribeHoverCanvasPos(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useHoverCanvasPos(): Point | null {
  return useSyncExternalStore(subscribeHoverCanvasPos, getHoverCanvasPos);
}
