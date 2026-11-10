import React, { useState, useCallback } from 'react';
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

    setUndoStacks((prev) => {
      const stack = prev[unicode] || [];
      if (stack.length > 0) {
        const last = stack[stack.length - 1];
        if (areGlyphsEqual(last, existingGlyph)) {
          return prev;
        }
      }
      return {
        ...prev,
        [unicode]: [...stack.slice(-49), cloneGlyph(existingGlyph)],
      };
    });

    setRedoStacks((prev) => {
      if (!prev[unicode] || prev[unicode].length === 0) return prev;
      const copy = { ...prev };
      delete copy[unicode];
      return copy;
    });
  }, [selectedUnicode, selectedChar, projectRef]);

  const handleUndo = useCallback(() => {
    const unicode = selectedUnicode;
    setUndoStacks((prevUndoMap) => {
      const stack = prevUndoMap[unicode] || [];
      if (stack.length === 0) {
        return prevUndoMap;
      }
      const previous = stack[stack.length - 1];
      const nextStack = stack.slice(0, stack.length - 1);

      // Record current state of this glyph into its own redo stack
      const currentSnapshot = currentGlyphRef.current;
      setRedoStacks((prevRedoMap) => {
        const redoList = prevRedoMap[unicode] || [];
        return {
          ...prevRedoMap,
          [unicode]: [...redoList.slice(-49), cloneGlyph(currentSnapshot)],
        };
      });

      // Restore strictly within the current glyph (no cross-character warping!)
      setProject((prevProj) => ({
        ...prevProj,
        glyphs: {
          ...prevProj.glyphs,
          [unicode]: {
            ...previous,
            modified: true,
          },
        },
        updatedAt: Date.now(),
      }));

      return {
        ...prevUndoMap,
        [unicode]: nextStack,
      };
    });
  }, [selectedUnicode, currentGlyphRef, setProject]);

  const handleRedo = useCallback(() => {
    const unicode = selectedUnicode;
    setRedoStacks((prevRedoMap) => {
      const stack = prevRedoMap[unicode] || [];
      if (stack.length === 0) {
        return prevRedoMap;
      }
      const next = stack[stack.length - 1];
      const nextStack = stack.slice(0, stack.length - 1);

      // Record current state of this glyph into its own undo stack
      const currentSnapshot = currentGlyphRef.current;
      setUndoStacks((prevUndoMap) => {
        const undoList = prevUndoMap[unicode] || [];
        return {
          ...prevUndoMap,
          [unicode]: [...undoList.slice(-49), cloneGlyph(currentSnapshot)],
        };
      });

      // Redo strictly within the current glyph
      setProject((prevProj) => ({
        ...prevProj,
        glyphs: {
          ...prevProj.glyphs,
          [unicode]: {
            ...next,
            modified: true,
          },
        },
        updatedAt: Date.now(),
      }));

      return {
        ...prevRedoMap,
        [unicode]: nextStack,
      };
    });
  }, [selectedUnicode, currentGlyphRef, setProject]);

  const pushSnapshot = useCallback((glyph: GlyphData, targetUnicode?: number) => {
    const unicode = targetUnicode ?? glyph.unicode ?? selectedUnicode;
    setUndoStacks((prev) => {
      const stack = prev[unicode] || [];
      return {
        ...prev,
        [unicode]: [...stack.slice(-49), cloneGlyph(glyph)],
      };
    });
    setRedoStacks((prev) => {
      if (!prev[unicode] || prev[unicode].length === 0) return prev;
      const copy = { ...prev };
      delete copy[unicode];
      return copy;
    });
  }, [selectedUnicode]);

  const setUndoStack = useCallback((action: React.SetStateAction<GlyphData[]>) => {
    setUndoStacks((prev) => {
      const currentStack = prev[selectedUnicode] || [];
      const nextStack = typeof action === 'function' ? action(currentStack) : action;
      return {
        ...prev,
        [selectedUnicode]: nextStack,
      };
    });
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
