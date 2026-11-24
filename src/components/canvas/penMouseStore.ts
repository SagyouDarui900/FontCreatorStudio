import { useSyncExternalStore } from 'react';
import type { Point } from '../../types';

/**
 * Pen mouse position in font-canvas coordinates, held outside React state.
 *
 * The pen rubber-band needs the pointer position on every pointermove,
 * without the hover store's 0.5-unit threshold and rAF batching and
 * without re-rendering GlyphCanvas (which owns the pen state). The
 * pointer dispatcher writes here immediately on pen pointermove; only
 * ActivePenPreviewLayer subscribes to it.
 */
let penMousePos: Point | null = null;
const listeners = new Set<() => void>();

export function setPenMousePos(pos: Point | null): void {
  if (penMousePos === pos) return;
  if (penMousePos && pos && penMousePos.x === pos.x && penMousePos.y === pos.y) return;
  penMousePos = pos;
  listeners.forEach((listener) => listener());
}

export function getPenMousePos(): Point | null {
  return penMousePos;
}

export function subscribePenMousePos(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function usePenMousePos(): Point | null {
  return useSyncExternalStore(subscribePenMousePos, getPenMousePos);
}
