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
    a.advanceWidthCells !== b.advanceWidthCells ||
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

  const currentUndoStack = undoStacks[selectedUnicode] || [];
  const currentRedoStack = redoStacks[selectedUnicode] || [];

  const commitHistory = useCallback((targetUnicode?: number) => {
    const unicode = targetUnicode ?? selectedUnicode;
    const existingGlyph = projectRef.current.glyphs[unicode] || {
      unicode,
      char: unicode === selectedUnicode ? selectedChar : String.fromCodePoint(unicode),
      advanceWidth: projectRef.current.metadata?.unitsPerEm || 1000,
      lsb: 50,
      contours: [],
    };

    const currentUndo = undoStacksRef.current[unicode] || [];
    const last = currentUndo.length > 0 ? currentUndo[currentUndo.length - 1] : null;
    if (!last || !areGlyphsEqual(last, existingGlyph)) {
      const nextUndoMap = {
        ...undoStacksRef.current,
        [unicode]: [...currentUndo.slice(-49), cloneGlyph(existingGlyph)],
      };
      undoStacksRef.current = nextUndoMap;
      setUndoStacks(nextUndoMap);
    }

    if (redoStacksRef.current[unicode] && redoStacksRef.current[unicode].length > 0) {
      const nextRedoMap = { ...redoStacksRef.current };
      delete nextRedoMap[unicode];
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
  }, [selectedUnicode, currentGlyphRef, setProject]);

  const handleRedo = useCallback(() => {
    const unicode = selectedUnicode;
    const stack = redoStacksRef.current[unicode] || [];
    if (stack.length === 0) {
      return;
    }

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
  }, [selectedUnicode, currentGlyphRef, setProject]);

  const pushSnapshot = useCallback((glyph: GlyphData, targetUnicode?: number) => {
    const unicode = targetUnicode ?? glyph.unicode ?? selectedUnicode;
    const stack = undoStacksRef.current[unicode] || [];
    const nextUndoMap = {
      ...undoStacksRef.current,
      [unicode]: [...stack.slice(-49), cloneGlyph(glyph)],
    };
    undoStacksRef.current = nextUndoMap;
    setUndoStacks(nextUndoMap);

    if (redoStacksRef.current[unicode] && redoStacksRef.current[unicode].length > 0) {
      const nextRedoMap = { ...redoStacksRef.current };
      delete nextRedoMap[unicode];
      redoStacksRef.current = nextRedoMap;
      setRedoStacks(nextRedoMap);
    }
  }, [selectedUnicode]);

  const setUndoStack = useCallback((action: React.SetStateAction<GlyphData[]>) => {
    const currentStack = undoStacksRef.current[selectedUnicode] || [];
    const nextStack = typeof action === 'function' ? action(currentStack) : action;
    const nextUndoMap = {
      ...undoStacksRef.current,
      [selectedUnicode]: nextStack,
    };
    undoStacksRef.current = nextUndoMap;
    setUndoStacks(nextUndoMap);
  }, [selectedUnicode]);

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
