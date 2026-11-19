import React, { useState, useCallback, useRef } from 'react';
import { FontProject, GlyphData, PathContour, Point, PixelGlyphData } from '../types';

const EPSILON = 1e-4;

const arePointsEqual = (p1?: Point | null, p2?: Point | null): boolean => {
  if (!p1 && !p2) return true;
  if (!p1 || !p2) return false;
  return Math.abs(p1.x - p2.x) <= EPSILON && Math.abs(p1.y - p2.y) <= EPSILON;
};

export const areContoursEqual = (a: PathContour[], b: PathContour[]): boolean => {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const ca = a[i];
    const cb = b[i];
    if (ca.id !== cb.id || ca.closed !== cb.closed || ca.nodes.length !== cb.nodes.length) {
      return false;
    }
    for (let j = 0; j < ca.nodes.length; j++) {
      const na = ca.nodes[j];
      const nb = cb.nodes[j];
      if (na.id !== nb.id) return false;
      if (Math.abs(na.x - nb.x) > EPSILON || Math.abs(na.y - nb.y) > EPSILON) return false;
      if ((na.type || 'corner') !== (nb.type || 'corner')) return false;

      // handleIn existence and x, y
      const hasHandleInA = Boolean(na.handleIn);
      const hasHandleInB = Boolean(nb.handleIn);
      if (hasHandleInA !== hasHandleInB) return false;
      if (hasHandleInA && !arePointsEqual(na.handleIn, nb.handleIn)) return false;

      // handleOut existence and x, y
      const hasHandleOutA = Boolean(na.handleOut);
      const hasHandleOutB = Boolean(nb.handleOut);
      if (hasHandleOutA !== hasHandleOutB) return false;
      if (hasHandleOutA && !arePointsEqual(na.handleOut, nb.handleOut)) return false;
    }
  }
  return true;
};

export const arePixelDataEqual = (a?: PixelGlyphData, b?: PixelGlyphData): boolean => {
  if (a === b) return true;
  if (!a || !b) return false;
  if (
    a.width !== b.width ||
    a.height !== b.height ||
    a.shape !== b.shape ||
    a.data.length !== b.data.length
  ) {
    return false;
  }
  for (let i = 0; i < a.data.length; i++) {
    if (a.data[i] !== b.data[i]) return false;
  }
  return true;
};

export const areGlyphsEqual = (a: GlyphData, b: GlyphData): boolean => {
  if (a === b) return true;
  if (
    a.unicode !== b.unicode ||
    a.char !== b.char ||
    a.advanceWidth !== b.advanceWidth ||
    a.lsb !== b.lsb
  ) {
    return false;
  }
  if (!areContoursEqual(a.contours, b.contours)) return false;
  if (!areContoursEqual(a.vectorContoursBackup || [], b.vectorContoursBackup || [])) return false;
  if (!arePixelDataEqual(a.pixelData, b.pixelData)) return false;
  return true;
};

export const cloneGlyph = (g: GlyphData): GlyphData => ({
  ...g,
  contours: (g.contours || []).map((c) => ({
    ...c,
    nodes: c.nodes.map((n) => ({
      ...n,
      handleIn: n.handleIn ? { x: n.handleIn.x, y: n.handleIn.y } : null,
      handleOut: n.handleOut ? { x: n.handleOut.x, y: n.handleOut.y } : null,
    })),
  })),
  vectorContoursBackup: g.vectorContoursBackup
    ? g.vectorContoursBackup.map((c) => ({
        ...c,
        nodes: c.nodes.map((n) => ({
          ...n,
          handleIn: n.handleIn ? { x: n.handleIn.x, y: n.handleIn.y } : null,
          handleOut: n.handleOut ? { x: n.handleOut.x, y: n.handleOut.y } : null,
        })),
      }))
    : undefined,
  pixelData: g.pixelData
    ? {
        ...g.pixelData,
        data: [...g.pixelData.data],
      }
    : undefined,
});

interface UseUndoRedoOptions {
  projectRef: React.MutableRefObject<FontProject>;
  currentGlyphRef: React.MutableRefObject<GlyphData>;
  selectedUnicode: number;
  selectedChar: string;
  setSelectedUnicode?: (unicode: number) => void;
  setSelectedChar?: (char: string) => void;
  setProject: React.Dispatch<React.SetStateAction<FontProject>>;
}

export const MAX_HISTORY_GLYPHS = 150;

function touchHistoryGlyphOrder(
  order: number[],
  unicode: number,
  maxEntries: number = MAX_HISTORY_GLYPHS
): { nextOrder: number[]; evicted: number[] } {
  const filtered = order.filter((u) => u !== unicode);
  filtered.push(unicode);
  if (filtered.length <= maxEntries) {
    return { nextOrder: filtered, evicted: [] };
  }
  const excess = filtered.length - maxEntries;
  return {
    nextOrder: filtered.slice(excess),
    evicted: filtered.slice(0, excess),
  };
}

export function useUndoRedo({
  projectRef,
  currentGlyphRef,
  selectedUnicode,
  selectedChar,
  setProject,
}: UseUndoRedoOptions) {
  // Store undo & redo histories isolated per glyph Unicode to prevent cross-glyph warping and contamination
  const [undoStacks, setUndoStacks] = useState<Record<number, GlyphData[]>>({});
  const [redoStacks, setRedoStacks] = useState<Record<number, GlyphData[]>>({});

  // Keep synchronous mirrors so Undo/Redo never invoke sibling setState/setProject inside another updater
  const undoStacksRef = useRef<Record<number, GlyphData[]>>({});
  const redoStacksRef = useRef<Record<number, GlyphData[]>>({});
  const historyOrderRef = useRef<number[]>([]);

  const currentUndoStack = undoStacks[selectedUnicode] || [];
  const currentRedoStack = redoStacks[selectedUnicode] || [];

  const applyEvictionToMaps = useCallback((
    undoMap: Record<number, GlyphData[]>,
    redoMap: Record<number, GlyphData[]>,
    evicted: number[]
  ) => {
    if (evicted.length === 0) return { undoMap, redoMap, redoChanged: false };
    let redoChanged = false;
    for (const u of evicted) {
      delete undoMap[u];
      if (u in redoMap) {
        delete redoMap[u];
        redoChanged = true;
      }
    }
    return { undoMap, redoMap, redoChanged };
  }, []);

  const commitHistory = useCallback((targetUnicode?: number) => {
    const unicode = targetUnicode ?? selectedUnicode;
    const existingGlyph = projectRef.current.glyphs[unicode] || {
      unicode,
      char: unicode === selectedUnicode ? selectedChar : String.fromCodePoint(unicode),
      advanceWidth: projectRef.current.metadata?.unitsPerEm || 1000,
      lsb: 50,
      contours: [],
    };

    const { nextOrder, evicted } = touchHistoryGlyphOrder(historyOrderRef.current, unicode);
    historyOrderRef.current = nextOrder;

    const currentUndo = undoStacksRef.current[unicode] || [];
    const last = currentUndo.length > 0 ? currentUndo[currentUndo.length - 1] : null;
    const nextUndoMap = { ...undoStacksRef.current };
    const nextRedoMap = { ...redoStacksRef.current };
    let undoChanged = false;
    let redoChanged = false;

    if (!last || !areGlyphsEqual(last, existingGlyph)) {
      nextUndoMap[unicode] = [...currentUndo.slice(-49), cloneGlyph(existingGlyph)];
      undoChanged = true;
    }

    if (nextRedoMap[unicode] && nextRedoMap[unicode].length > 0) {
      delete nextRedoMap[unicode];
      redoChanged = true;
    }

    if (evicted.length > 0) {
      for (const u of evicted) {
        if (u in nextUndoMap) {
          delete nextUndoMap[u];
          undoChanged = true;
        }
        if (u in nextRedoMap) {
          delete nextRedoMap[u];
          redoChanged = true;
        }
      }
    }

    if (undoChanged) {
      undoStacksRef.current = nextUndoMap;
      setUndoStacks(nextUndoMap);
    }
    if (redoChanged) {
      redoStacksRef.current = nextRedoMap;
      setRedoStacks(nextRedoMap);
    }
  }, [selectedUnicode, selectedChar, projectRef]);

  const handleUndo = useCallback(() => {
    const unicode = selectedUnicode;
    const stack = undoStacksRef.current[unicode] || [];
    if (stack.length === 0) {
      return;
    }

    const { nextOrder, evicted } = touchHistoryGlyphOrder(historyOrderRef.current, unicode);
    historyOrderRef.current = nextOrder;

    const previous = stack[stack.length - 1];
    const nextUndoStack = stack.slice(0, stack.length - 1);
    const currentSnapshot = currentGlyphRef.current;
    const redoList = redoStacksRef.current[unicode] || [];
    const nextRedoStack = [...redoList.slice(-49), cloneGlyph(currentSnapshot)];

    const nextUndoMap = {
      ...undoStacksRef.current,
      [unicode]: nextUndoStack,
    };
    const nextRedoMap = {
      ...redoStacksRef.current,
      [unicode]: nextRedoStack,
    };
    applyEvictionToMaps(nextUndoMap, nextRedoMap, evicted);

    undoStacksRef.current = nextUndoMap;
    redoStacksRef.current = nextRedoMap;

    const restoredGlyph: GlyphData = {
      ...previous,
      modified: true,
    };
    currentGlyphRef.current = restoredGlyph;

    setUndoStacks(nextUndoMap);
    setRedoStacks(nextRedoMap);
    setProject((prevProj) => ({
      ...prevProj,
      glyphs: {
        ...prevProj.glyphs,
        [unicode]: restoredGlyph,
      },
      updatedAt: Date.now(),
    }));
  }, [selectedUnicode, currentGlyphRef, setProject, applyEvictionToMaps]);

  const handleRedo = useCallback(() => {
    const unicode = selectedUnicode;
    const stack = redoStacksRef.current[unicode] || [];
    if (stack.length === 0) {
      return;
    }

    const { nextOrder, evicted } = touchHistoryGlyphOrder(historyOrderRef.current, unicode);
    historyOrderRef.current = nextOrder;

    const next = stack[stack.length - 1];
    const nextRedoStack = stack.slice(0, stack.length - 1);
    const currentSnapshot = currentGlyphRef.current;
    const undoList = undoStacksRef.current[unicode] || [];
    const nextUndoStack = [...undoList.slice(-49), cloneGlyph(currentSnapshot)];

    const nextRedoMap = {
      ...redoStacksRef.current,
      [unicode]: nextRedoStack,
    };
    const nextUndoMap = {
      ...undoStacksRef.current,
      [unicode]: nextUndoStack,
    };
    applyEvictionToMaps(nextUndoMap, nextRedoMap, evicted);

    redoStacksRef.current = nextRedoMap;
    undoStacksRef.current = nextUndoMap;

    const restoredGlyph: GlyphData = {
      ...next,
      modified: true,
    };
    currentGlyphRef.current = restoredGlyph;

    setRedoStacks(nextRedoMap);
    setUndoStacks(nextUndoMap);
    setProject((prevProj) => ({
      ...prevProj,
      glyphs: {
        ...prevProj.glyphs,
        [unicode]: restoredGlyph,
      },
      updatedAt: Date.now(),
    }));
  }, [selectedUnicode, currentGlyphRef, setProject, applyEvictionToMaps]);

  const pushSnapshot = useCallback((glyph: GlyphData, targetUnicode?: number) => {
    const unicode = targetUnicode ?? glyph.unicode ?? selectedUnicode;
    const { nextOrder, evicted } = touchHistoryGlyphOrder(historyOrderRef.current, unicode);
    historyOrderRef.current = nextOrder;

    const stack = undoStacksRef.current[unicode] || [];
    const nextUndoMap: Record<number, GlyphData[]> = {
      ...undoStacksRef.current,
      [unicode]: [...stack.slice(-49), cloneGlyph(glyph)],
    };
    const nextRedoMap: Record<number, GlyphData[]> = { ...redoStacksRef.current };
    let redoChanged = false;

    if (nextRedoMap[unicode] && nextRedoMap[unicode].length > 0) {
      delete nextRedoMap[unicode];
      redoChanged = true;
    }

    const evictionResult = applyEvictionToMaps(nextUndoMap, nextRedoMap, evicted);
    undoStacksRef.current = nextUndoMap;
    setUndoStacks(nextUndoMap);

    if (redoChanged || evictionResult.redoChanged) {
      redoStacksRef.current = nextRedoMap;
      setRedoStacks(nextRedoMap);
    }
  }, [selectedUnicode, applyEvictionToMaps]);

  const setUndoStack = useCallback((action: React.SetStateAction<GlyphData[]>) => {
    const { nextOrder, evicted } = touchHistoryGlyphOrder(historyOrderRef.current, selectedUnicode);
    historyOrderRef.current = nextOrder;

    const currentStack = undoStacksRef.current[selectedUnicode] || [];
    const nextStack = typeof action === 'function' ? action(currentStack) : action;
    const nextUndoMap: Record<number, GlyphData[]> = {
      ...undoStacksRef.current,
      [selectedUnicode]: nextStack,
    };
    const nextRedoMap: Record<number, GlyphData[]> = { ...redoStacksRef.current };
    const evictionResult = applyEvictionToMaps(nextUndoMap, nextRedoMap, evicted);

    undoStacksRef.current = nextUndoMap;
    setUndoStacks(nextUndoMap);
    if (evictionResult.redoChanged) {
      redoStacksRef.current = nextRedoMap;
      setRedoStacks(nextRedoMap);
    }
  }, [selectedUnicode, applyEvictionToMaps]);

  return {
    undoStack: currentUndoStack,
    redoStack: currentRedoStack,
    undoStacks,
    redoStacks,
    setUndoStack,
    pushSnapshot,
    commitHistory,
    handleUndo,
    handleRedo,
    canUndo: currentUndoStack.length > 0,
    canRedo: currentRedoStack.length > 0,
  };
}
