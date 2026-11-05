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
  setSelectedUnicode: (unicode: number) => void;
  setSelectedChar: (char: string) => void;
  setProject: React.Dispatch<React.SetStateAction<FontProject>>;
}

export function useUndoRedo({
  projectRef,
  currentGlyphRef,
  selectedUnicode,
  selectedChar,
  setSelectedUnicode,
  setSelectedChar,
  setProject,
}: UseUndoRedoOptions) {
  const [undoStack, setUndoStack] = useState<GlyphData[]>([]);
  const [redoStack, setRedoStack] = useState<GlyphData[]>([]);

  const commitHistory = useCallback(() => {
    const unicode = selectedUnicode;
    const existingGlyph = projectRef.current.glyphs[unicode] || {
      unicode,
      char: selectedChar,
      advanceWidth: projectRef.current.metadata.unitsPerEm || 1000,
      lsb: 50,
      contours: [],
    };
    setUndoStack((prev) => {
      if (prev.length > 0) {
        const last = prev[prev.length - 1];
        if (areGlyphsEqual(last, existingGlyph)) {
          return prev;
        }
      }
      return [...prev.slice(-49), cloneGlyph(existingGlyph)];
    });
    setRedoStack([]);
  }, [selectedUnicode, selectedChar, projectRef]);

  const handleUndo = useCallback(() => {
    setUndoStack((prevUndo) => {
      if (prevUndo.length === 0) {
        return prevUndo;
      }
      const previous = prevUndo[prevUndo.length - 1];
      const nextUndo = prevUndo.slice(0, prevUndo.length - 1);

      const currentSnapshot = currentGlyphRef.current;
      setRedoStack((prevRedo) => [...prevRedo.slice(-49), cloneGlyph(currentSnapshot)]);

      if (previous.unicode !== selectedUnicode) {
        setSelectedUnicode(previous.unicode);
        setSelectedChar(previous.char || String.fromCodePoint(previous.unicode));
      }

      setProject((prevProj) => ({
        ...prevProj,
        glyphs: {
          ...prevProj.glyphs,
          [previous.unicode]: {
            ...previous,
            modified: true,
          },
        },
        updatedAt: Date.now(),
      }));

      return nextUndo;
    });
  }, [selectedUnicode, currentGlyphRef, setSelectedUnicode, setSelectedChar, setProject]);

  const handleRedo = useCallback(() => {
    setRedoStack((prevRedo) => {
      if (prevRedo.length === 0) {
        return prevRedo;
      }
      const next = prevRedo[prevRedo.length - 1];
      const nextRedo = prevRedo.slice(0, prevRedo.length - 1);

      const currentSnapshot = currentGlyphRef.current;
      setUndoStack((prevUndo) => [...prevUndo.slice(-49), cloneGlyph(currentSnapshot)]);

      if (next.unicode !== selectedUnicode) {
        setSelectedUnicode(next.unicode);
        setSelectedChar(next.char || String.fromCodePoint(next.unicode));
      }

      setProject((prevProj) => ({
        ...prevProj,
        glyphs: {
          ...prevProj.glyphs,
          [next.unicode]: {
            ...next,
            modified: true,
          },
        },
        updatedAt: Date.now(),
      }));

      return nextRedo;
    });
  }, [selectedUnicode, currentGlyphRef, setSelectedUnicode, setSelectedChar, setProject]);

  const pushSnapshot = useCallback((glyph: GlyphData) => {
    setUndoStack((prev) => [...prev.slice(-49), cloneGlyph(glyph)]);
    setRedoStack([]);
  }, []);

  return {
    undoStack,
    redoStack,
    setUndoStack,
    pushSnapshot,
    commitHistory,
    handleUndo,
    handleRedo,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
  };
}
