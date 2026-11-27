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
  activeIvsKey?: string | null;
  setSelectedUnicode?: (unicode: number) => void;
  setSelectedChar?: (char: string) => void;
  setProject: React.Dispatch<React.SetStateAction<FontProject>>;
  maxHistoryBytes?: number;
}

export const MAX_HISTORY_GLYPHS = 150;
export const MAX_HISTORY_BYTES = 32 * 1024 * 1024;
/** Maximum number of project-level (metadata / kerning / OpenType / mojikumi) snapshots kept. */
export const MAX_PROJECT_HISTORY_ENTRIES = 50;

/** Project-level data the per-glyph undo stack cannot restore. */
export interface ProjectConfigSnapshot {
  metadata: FontProject['metadata'];
  kerning?: Record<string, number>;
  openTypeFeatures?: FontProject['openTypeFeatures'];
  mojikumiSettings?: FontProject['mojikumiSettings'];
}

function snapshotProjectConfig(project: FontProject): ProjectConfigSnapshot {
  return {
    metadata: JSON.parse(JSON.stringify(project.metadata)),
    kerning: project.kerning ? { ...project.kerning } : undefined,
    openTypeFeatures: project.openTypeFeatures
      ? JSON.parse(JSON.stringify(project.openTypeFeatures))
      : undefined,
    mojikumiSettings: project.mojikumiSettings
      ? JSON.parse(JSON.stringify(project.mojikumiSettings))
      : undefined,
  };
}

function projectConfigsEqual(a: ProjectConfigSnapshot, b: ProjectConfigSnapshot): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
const EMPTY_HISTORY_STACK: GlyphData[] = [];

function estimateContourListBytes(contours?: PathContour[]): number {
  if (!contours || contours.length === 0) return 0;
  let bytes = 0;
  for (let i = 0; i < contours.length; i++) {
    bytes += 64 + contours[i].nodes.length * 96;
  }
  return bytes;
}

export function estimateGlyphHistoryBytes(glyph: GlyphData): number {
  let bytes = 256;
  bytes += estimateContourListBytes(glyph.contours);
  bytes += estimateContourListBytes(glyph.vectorContoursBackup);
  if (glyph.pixelData?.data) {
    bytes += 128 + glyph.pixelData.data.length * 8;
  }
  return bytes;
}

function estimateStackBytes(stack?: GlyphData[]): number {
  if (!stack || stack.length === 0) return 0;
  let total = 0;
  for (let i = 0; i < stack.length; i++) {
    total += estimateGlyphHistoryBytes(stack[i]);
  }
  return total;
}

function computeTotalHistoryBytes(
  undoMap: Record<number, GlyphData[]>,
  redoMap: Record<number, GlyphData[]>
): number {
  let total = 0;
  for (const key of Object.keys(undoMap)) {
    total += estimateStackBytes(undoMap[Number(key)]);
  }
  for (const key of Object.keys(redoMap)) {
    total += estimateStackBytes(redoMap[Number(key)]);
  }
  return total;
}

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
  activeIvsKey = null,
  setProject,
  maxHistoryBytes = MAX_HISTORY_BYTES,
}: UseUndoRedoOptions) {
  // Store undo & redo histories isolated per glyph Unicode to prevent cross-glyph warping and contamination
  const [undoStacks, setUndoStacks] = useState<Record<number, GlyphData[]>>({});
  const [redoStacks, setRedoStacks] = useState<Record<number, GlyphData[]>>({});

  // Isolated undo/redo stacks for IVS variant glyphs keyed by IvsGlyphVariant.id
  const [ivsUndoStacks, setIvsUndoStacks] = useState<Record<string, GlyphData[]>>({});
  const [ivsRedoStacks, setIvsRedoStacks] = useState<Record<string, GlyphData[]>>({});
  const ivsUndoStacksRef = useRef<Record<string, GlyphData[]>>({});
  const ivsRedoStacksRef = useRef<Record<string, GlyphData[]>>({});

  // Project-level undo/redo for data the per-glyph stacks cannot restore:
  // metadata, kerning, OpenType features and mojikumi settings. These
  // stacks hold config-only snapshots; glyph edits never touch them.
  const [projectUndoStack, setProjectUndoStack] = useState<ProjectConfigSnapshot[]>([]);
  const [projectRedoStack, setProjectRedoStack] = useState<ProjectConfigSnapshot[]>([]);
  const projectUndoStackRef = useRef<ProjectConfigSnapshot[]>([]);
  const projectRedoStackRef = useRef<ProjectConfigSnapshot[]>([]);

  // Keep synchronous mirrors so Undo/Redo never invoke sibling setState/setProject inside another updater
  const undoStacksRef = useRef<Record<number, GlyphData[]>>({});
  const redoStacksRef = useRef<Record<number, GlyphData[]>>({});
  const historyOrderRef = useRef<number[]>([]);

  const currentUndoStack = activeIvsKey
    ? ivsUndoStacks[activeIvsKey] || EMPTY_HISTORY_STACK
    : undoStacks[selectedUnicode] || EMPTY_HISTORY_STACK;
  const currentRedoStack = activeIvsKey
    ? ivsRedoStacks[activeIvsKey] || EMPTY_HISTORY_STACK
    : redoStacks[selectedUnicode] || EMPTY_HISTORY_STACK;

  const applyEvictionAndBudget = useCallback(
    (
      undoMap: Record<number, GlyphData[]>,
      redoMap: Record<number, GlyphData[]>,
      evicted: number[],
      protectedUnicodes: number[]
    ): { undoChanged: boolean; redoChanged: boolean } => {
      let undoChanged = false;
      let redoChanged = false;
      const protectedSet = new Set(protectedUnicodes);

      for (const u of evicted) {
        if (u in undoMap) {
          delete undoMap[u];
          undoChanged = true;
        }
        if (u in redoMap) {
          delete redoMap[u];
          redoChanged = true;
        }
      }

      if (maxHistoryBytes <= 0 || !Number.isFinite(maxHistoryBytes)) {
        return { undoChanged, redoChanged };
      }

      let totalBytes = computeTotalHistoryBytes(undoMap, redoMap);
      if (totalBytes <= maxHistoryBytes) {
        return { undoChanged, redoChanged };
      }

      // 1. Evict oldest non-protected unicodes first
      const remainingOrder: number[] = [];
      for (const u of historyOrderRef.current) {
        if (totalBytes > maxHistoryBytes && !protectedSet.has(u)) {
          const freedUndo = estimateStackBytes(undoMap[u]);
          const freedRedo = estimateStackBytes(redoMap[u]);
          if (u in undoMap) {
            delete undoMap[u];
            undoChanged = true;
          }
          if (u in redoMap) {
            delete redoMap[u];
            redoChanged = true;
          }
          totalBytes -= freedUndo + freedRedo;
        } else {
          remainingOrder.push(u);
        }
      }
      historyOrderRef.current = remainingOrder;

      // 2. If protected glyphs alone still exceed budget, trim their redo stacks then oldest undo snapshots
      for (const protectedUnicode of protectedSet) {
        if (totalBytes <= maxHistoryBytes) break;
        const activeRedo = redoMap[protectedUnicode];
        if (activeRedo && activeRedo.length > 0) {
          const nextRedo = [...activeRedo];
          while (totalBytes > maxHistoryBytes && nextRedo.length > 0) {
            const removed = nextRedo.shift()!;
            totalBytes -= estimateGlyphHistoryBytes(removed);
            redoChanged = true;
          }
          if (nextRedo.length === 0) {
            delete redoMap[protectedUnicode];
          } else {
            redoMap[protectedUnicode] = nextRedo;
          }
        }
      }

      for (const protectedUnicode of protectedSet) {
        if (totalBytes <= maxHistoryBytes) break;
        const activeUndo = undoMap[protectedUnicode];
        if (activeUndo && activeUndo.length > 1) {
          const nextUndo = [...activeUndo];
          while (totalBytes > maxHistoryBytes && nextUndo.length > 1) {
            const removed = nextUndo.shift()!;
            totalBytes -= estimateGlyphHistoryBytes(removed);
            undoChanged = true;
          }
          undoMap[protectedUnicode] = nextUndo;
        }
      }

      return { undoChanged, redoChanged };
    },
    [maxHistoryBytes]
  );

  const commitHistory = useCallback(
    (targetUnicode?: number) => {
      if (targetUnicode === undefined && activeIvsKey) {
        const variant = projectRef.current.ivsVariants?.[activeIvsKey];
        if (!variant) return;
        const existingGlyph = variant.glyph;
        const currentUndo = ivsUndoStacksRef.current[activeIvsKey] || [];
        const last = currentUndo.length > 0 ? currentUndo[currentUndo.length - 1] : null;
        const nextUndoMap = { ...ivsUndoStacksRef.current };
        const nextRedoMap = { ...ivsRedoStacksRef.current };
        let undoChanged = false;
        let redoChanged = false;

        if (!last || !areGlyphsEqual(last, existingGlyph)) {
          nextUndoMap[activeIvsKey] = [...currentUndo.slice(-49), cloneGlyph(existingGlyph)];
          undoChanged = true;
        }
        if (nextRedoMap[activeIvsKey] && nextRedoMap[activeIvsKey].length > 0) {
          delete nextRedoMap[activeIvsKey];
          redoChanged = true;
        }
        if (undoChanged) {
          ivsUndoStacksRef.current = nextUndoMap;
          setIvsUndoStacks(nextUndoMap);
        }
        if (redoChanged) {
          ivsRedoStacksRef.current = nextRedoMap;
          setIvsRedoStacks(nextRedoMap);
        }
        return;
      }

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

      const budgetResult = applyEvictionAndBudget(nextUndoMap, nextRedoMap, evicted, [
        selectedUnicode,
        unicode,
      ]);
      if (undoChanged || budgetResult.undoChanged) {
        undoStacksRef.current = nextUndoMap;
        setUndoStacks(nextUndoMap);
      }
      if (redoChanged || budgetResult.redoChanged) {
        redoStacksRef.current = nextRedoMap;
        setRedoStacks(nextRedoMap);
      }
    },
    [activeIvsKey, selectedUnicode, selectedChar, projectRef, applyEvictionAndBudget]
  );

  const commitBatchHistory = useCallback(
    (targetUnicodes: number[], targetIvsKeys?: string[]) => {
      const hasUnicodes = Boolean(targetUnicodes && targetUnicodes.length > 0);
      const hasIvs = Boolean(targetIvsKeys && targetIvsKeys.length > 0);
      if (!hasUnicodes && !hasIvs) return;

      if (hasUnicodes) {
        const uniqueTargets = Array.from(new Set(targetUnicodes));
        const maxEntries = Math.max(MAX_HISTORY_GLYPHS, uniqueTargets.length);

        let order = historyOrderRef.current;
        const nextUndoMap = { ...undoStacksRef.current };
        const nextRedoMap = { ...redoStacksRef.current };
        let undoChanged = false;
        let redoChanged = false;
        const evictedSet = new Set<number>();

        for (const unicode of uniqueTargets) {
          const existingGlyph = projectRef.current.glyphs[unicode] || {
            unicode,
            char: String.fromCodePoint(unicode),
            advanceWidth: projectRef.current.metadata?.unitsPerEm || 1000,
            lsb: 50,
            contours: [],
          };

          const touched = touchHistoryGlyphOrder(order, unicode, maxEntries);
          order = touched.nextOrder;
          for (const ev of touched.evicted) evictedSet.add(ev);

          const currentUndo = nextUndoMap[unicode] || [];
          const last = currentUndo.length > 0 ? currentUndo[currentUndo.length - 1] : null;
          if (!last || !areGlyphsEqual(last, existingGlyph)) {
            nextUndoMap[unicode] = [...currentUndo.slice(-49), cloneGlyph(existingGlyph)];
            undoChanged = true;
          }
          if (nextRedoMap[unicode] && nextRedoMap[unicode].length > 0) {
            delete nextRedoMap[unicode];
            redoChanged = true;
          }
        }

        historyOrderRef.current = order;
        const budgetResult = applyEvictionAndBudget(
          nextUndoMap,
          nextRedoMap,
          Array.from(evictedSet),
          [selectedUnicode]
        );

        if (undoChanged || budgetResult.undoChanged) {
          undoStacksRef.current = nextUndoMap;
          setUndoStacks(nextUndoMap);
        }
        if (redoChanged || budgetResult.redoChanged) {
          redoStacksRef.current = nextRedoMap;
          setRedoStacks(nextRedoMap);
        }
      }

      if (hasIvs && targetIvsKeys) {
        const uniqueIvsKeys = Array.from(new Set(targetIvsKeys));
        const nextIvsUndoMap = { ...ivsUndoStacksRef.current };
        const nextIvsRedoMap = { ...ivsRedoStacksRef.current };
        let ivsUndoChanged = false;
        let ivsRedoChanged = false;

        for (const ivsKey of uniqueIvsKeys) {
          const variant = projectRef.current.ivsVariants?.[ivsKey];
          if (!variant) continue;
          const existingGlyph = variant.glyph;
          const currentUndo = nextIvsUndoMap[ivsKey] || [];
          const last = currentUndo.length > 0 ? currentUndo[currentUndo.length - 1] : null;
          if (!last || !areGlyphsEqual(last, existingGlyph)) {
            nextIvsUndoMap[ivsKey] = [...currentUndo.slice(-49), cloneGlyph(existingGlyph)];
            ivsUndoChanged = true;
          }
          if (nextIvsRedoMap[ivsKey] && nextIvsRedoMap[ivsKey].length > 0) {
            delete nextIvsRedoMap[ivsKey];
            ivsRedoChanged = true;
          }
        }

        if (ivsUndoChanged) {
          ivsUndoStacksRef.current = nextIvsUndoMap;
          setIvsUndoStacks(nextIvsUndoMap);
        }
        if (ivsRedoChanged) {
          ivsRedoStacksRef.current = nextIvsRedoMap;
          setIvsRedoStacks(nextIvsRedoMap);
        }
      }
    },
    [selectedUnicode, projectRef, applyEvictionAndBudget]
  );

  /**
   * Snapshot the current project-level config (metadata, kerning, OpenType
   * features, mojikumi settings) so a config-only change can be undone.
   * Call before the change is applied. Consecutive identical snapshots
   * are ignored, and the redo stack is cleared like commitHistory does.
   */
  const commitProjectHistory = useCallback(() => {
    const snapshot = snapshotProjectConfig(projectRef.current);
    const last =
      projectUndoStackRef.current.length > 0
        ? projectUndoStackRef.current[projectUndoStackRef.current.length - 1]
        : null;
    if (last && projectConfigsEqual(last, snapshot)) return;
    const nextUndo = [...projectUndoStackRef.current.slice(-(MAX_PROJECT_HISTORY_ENTRIES - 1)), snapshot];
    projectUndoStackRef.current = nextUndo;
    setProjectUndoStack(nextUndo);
    if (projectRedoStackRef.current.length > 0) {
      projectRedoStackRef.current = [];
      setProjectRedoStack([]);
    }
  }, [projectRef]);

  /**
   * Remove the most recent undo entry for a glyph, but only when its
   * contours still match `expectedContours`. A cancelled transform drag
   * commits history in a RAF callback and then restores the pre-drag
   * contours, leaving a phantom entry whose contours equal the restored
   * ones; discarding exactly that entry makes the next Ctrl+Z undo the
   * previous real edit. When no history was committed (the RAF never
   * fired) the top entry does not match and nothing is removed, so a
   * legitimate earlier entry is never lost.
   */
  const discardLastHistoryEntry = useCallback(
    (expectedContours?: PathContour[], targetUnicode?: number): boolean => {
      if (targetUnicode === undefined && activeIvsKey) {
        const stack = ivsUndoStacksRef.current[activeIvsKey] || [];
        if (stack.length === 0) return false;
        const top = stack[stack.length - 1];
        if (expectedContours && !areContoursEqual(top.contours || [], expectedContours)) {
          return false;
        }
        const nextUndoMap = {
          ...ivsUndoStacksRef.current,
          [activeIvsKey]: stack.slice(0, stack.length - 1),
        };
        ivsUndoStacksRef.current = nextUndoMap;
        setIvsUndoStacks(nextUndoMap);
        return true;
      }

      const unicode = targetUnicode ?? selectedUnicode;
      const stack = undoStacksRef.current[unicode] || [];
      if (stack.length === 0) return false;
      const top = stack[stack.length - 1];
      if (expectedContours && !areContoursEqual(top.contours || [], expectedContours)) {
        return false;
      }
      const nextUndoMap = {
        ...undoStacksRef.current,
        [unicode]: stack.slice(0, stack.length - 1),
      };
      undoStacksRef.current = nextUndoMap;
      setUndoStacks(nextUndoMap);
      return true;
    },
    [activeIvsKey, selectedUnicode]
  );

  const handleUndo = useCallback(() => {
    if (activeIvsKey) {
      const ivsKey = activeIvsKey;
      const stack = ivsUndoStacksRef.current[ivsKey] || [];
      if (stack.length === 0) return;

      const previous = stack[stack.length - 1];
      const nextUndoStack = stack.slice(0, stack.length - 1);
      const currentSnapshot = currentGlyphRef.current;
      const redoList = ivsRedoStacksRef.current[ivsKey] || [];
      const nextRedoStack = [...redoList.slice(-49), cloneGlyph(currentSnapshot)];

      const nextUndoMap = { ...ivsUndoStacksRef.current, [ivsKey]: nextUndoStack };
      const nextRedoMap = { ...ivsRedoStacksRef.current, [ivsKey]: nextRedoStack };
      ivsUndoStacksRef.current = nextUndoMap;
      ivsRedoStacksRef.current = nextRedoMap;

      const restoredGlyph: GlyphData = { ...previous, modified: true };
      currentGlyphRef.current = restoredGlyph;

      setIvsUndoStacks(nextUndoMap);
      setIvsRedoStacks(nextRedoMap);
      setProject((prevProj) => {
        const existingVariant = prevProj.ivsVariants?.[ivsKey];
        if (!existingVariant) return prevProj;
        return {
          ...prevProj,
          ivsVariants: {
            ...prevProj.ivsVariants,
            [ivsKey]: {
              ...existingVariant,
              glyph: restoredGlyph,
              updatedAt: Date.now(),
            },
          },
          updatedAt: Date.now(),
        };
      });
      return;
    }

    const unicode = selectedUnicode;
    const stack = undoStacksRef.current[unicode] || [];
    if (stack.length === 0) {
      // No glyph history for the selected glyph: fall back to the
      // project-level config history (metadata / kerning / OpenType /
      // mojikumi), if any entry was registered.
      const projectStack = projectUndoStackRef.current;
      if (projectStack.length === 0) return;
      const previous = projectStack[projectStack.length - 1];
      const nextProjectUndo = projectStack.slice(0, projectStack.length - 1);
      const nextProjectRedo = [
        ...projectRedoStackRef.current.slice(-(MAX_PROJECT_HISTORY_ENTRIES - 1)),
        snapshotProjectConfig(projectRef.current),
      ];
      projectUndoStackRef.current = nextProjectUndo;
      projectRedoStackRef.current = nextProjectRedo;
      setProjectUndoStack(nextProjectUndo);
      setProjectRedoStack(nextProjectRedo);
      setProject((prevProj) => ({
        ...prevProj,
        metadata: previous.metadata,
        kerning: previous.kerning,
        openTypeFeatures: previous.openTypeFeatures,
        mojikumiSettings: previous.mojikumiSettings,
        updatedAt: Date.now(),
      }));
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
    applyEvictionAndBudget(nextUndoMap, nextRedoMap, evicted, [unicode]);

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
  }, [activeIvsKey, selectedUnicode, currentGlyphRef, projectRef, setProject, applyEvictionAndBudget]);

  const handleRedo = useCallback(() => {
    if (activeIvsKey) {
      const ivsKey = activeIvsKey;
      const stack = ivsRedoStacksRef.current[ivsKey] || [];
      if (stack.length === 0) return;

      const next = stack[stack.length - 1];
      const nextRedoStack = stack.slice(0, stack.length - 1);
      const currentSnapshot = currentGlyphRef.current;
      const undoList = ivsUndoStacksRef.current[ivsKey] || [];
      const nextUndoStack = [...undoList.slice(-49), cloneGlyph(currentSnapshot)];

      const nextRedoMap = { ...ivsRedoStacksRef.current, [ivsKey]: nextRedoStack };
      const nextUndoMap = { ...ivsUndoStacksRef.current, [ivsKey]: nextUndoStack };
      ivsRedoStacksRef.current = nextRedoMap;
      ivsUndoStacksRef.current = nextUndoMap;

      const restoredGlyph: GlyphData = { ...next, modified: true };
      currentGlyphRef.current = restoredGlyph;

      setIvsRedoStacks(nextRedoMap);
      setIvsUndoStacks(nextUndoMap);
      setProject((prevProj) => {
        const existingVariant = prevProj.ivsVariants?.[ivsKey];
        if (!existingVariant) return prevProj;
        return {
          ...prevProj,
          ivsVariants: {
            ...prevProj.ivsVariants,
            [ivsKey]: {
              ...existingVariant,
              glyph: restoredGlyph,
              updatedAt: Date.now(),
            },
          },
          updatedAt: Date.now(),
        };
      });
      return;
    }

    const unicode = selectedUnicode;
    const stack = redoStacksRef.current[unicode] || [];
    if (stack.length === 0) {
      // Mirror of handleUndo: when the selected glyph has no redo entry,
      // redo the most recent project-level config change instead.
      const projectStack = projectRedoStackRef.current;
      if (projectStack.length === 0) return;
      const next = projectStack[projectStack.length - 1];
      const nextProjectRedo = projectStack.slice(0, projectStack.length - 1);
      const nextProjectUndo = [
        ...projectUndoStackRef.current.slice(-(MAX_PROJECT_HISTORY_ENTRIES - 1)),
        snapshotProjectConfig(projectRef.current),
      ];
      projectRedoStackRef.current = nextProjectRedo;
      projectUndoStackRef.current = nextProjectUndo;
      setProjectRedoStack(nextProjectRedo);
      setProjectUndoStack(nextProjectUndo);
      setProject((prevProj) => ({
        ...prevProj,
        metadata: next.metadata,
        kerning: next.kerning,
        openTypeFeatures: next.openTypeFeatures,
        mojikumiSettings: next.mojikumiSettings,
        updatedAt: Date.now(),
      }));
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
    applyEvictionAndBudget(nextUndoMap, nextRedoMap, evicted, [unicode]);

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
  }, [activeIvsKey, selectedUnicode, currentGlyphRef, projectRef, setProject, applyEvictionAndBudget]);

  const pushSnapshot = useCallback(
    (glyph: GlyphData, targetUnicode?: number) => {
      if (targetUnicode === undefined && activeIvsKey) {
        const stack = ivsUndoStacksRef.current[activeIvsKey] || [];
        const nextUndoMap = {
          ...ivsUndoStacksRef.current,
          [activeIvsKey]: [...stack.slice(-49), cloneGlyph(glyph)],
        };
        ivsUndoStacksRef.current = nextUndoMap;
        setIvsUndoStacks(nextUndoMap);
        if (ivsRedoStacksRef.current[activeIvsKey]?.length) {
          const nextRedoMap = { ...ivsRedoStacksRef.current };
          delete nextRedoMap[activeIvsKey];
          ivsRedoStacksRef.current = nextRedoMap;
          setIvsRedoStacks(nextRedoMap);
        }
        return;
      }

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

      const evictionResult = applyEvictionAndBudget(nextUndoMap, nextRedoMap, evicted, [
        selectedUnicode,
        unicode,
      ]);
      undoStacksRef.current = nextUndoMap;
      setUndoStacks(nextUndoMap);

      if (redoChanged || evictionResult.redoChanged) {
        redoStacksRef.current = nextRedoMap;
        setRedoStacks(nextRedoMap);
      }
    },
    [activeIvsKey, selectedUnicode, applyEvictionAndBudget]
  );

  const setUndoStack = useCallback(
    (action: React.SetStateAction<GlyphData[]>) => {
      if (activeIvsKey) {
        const currentStack = ivsUndoStacksRef.current[activeIvsKey] || [];
        const nextStack = typeof action === 'function' ? action(currentStack) : action;
        const nextUndoMap = { ...ivsUndoStacksRef.current, [activeIvsKey]: nextStack };
        ivsUndoStacksRef.current = nextUndoMap;
        setIvsUndoStacks(nextUndoMap);
        return;
      }

      const { nextOrder, evicted } = touchHistoryGlyphOrder(
        historyOrderRef.current,
        selectedUnicode
      );
      historyOrderRef.current = nextOrder;

      const currentStack = undoStacksRef.current[selectedUnicode] || [];
      const nextStack = typeof action === 'function' ? action(currentStack) : action;
      const nextUndoMap: Record<number, GlyphData[]> = {
        ...undoStacksRef.current,
        [selectedUnicode]: nextStack,
      };
      const nextRedoMap: Record<number, GlyphData[]> = { ...redoStacksRef.current };
      const evictionResult = applyEvictionAndBudget(nextUndoMap, nextRedoMap, evicted, [
        selectedUnicode,
      ]);

      undoStacksRef.current = nextUndoMap;
      setUndoStacks(nextUndoMap);
      if (evictionResult.redoChanged) {
        redoStacksRef.current = nextRedoMap;
        setRedoStacks(nextRedoMap);
      }
    },
    [activeIvsKey, selectedUnicode, applyEvictionAndBudget]
  );

  const clearHistory = useCallback(() => {
    undoStacksRef.current = {};
    redoStacksRef.current = {};
    ivsUndoStacksRef.current = {};
    ivsRedoStacksRef.current = {};
    historyOrderRef.current = [];
    projectUndoStackRef.current = [];
    projectRedoStackRef.current = [];
    setUndoStacks({});
    setRedoStacks({});
    setIvsUndoStacks({});
    setIvsRedoStacks({});
    setProjectUndoStack([]);
    setProjectRedoStack([]);
  }, []);

  return {
    undoStack: currentUndoStack,
    redoStack: currentRedoStack,
    undoStacks,
    redoStacks,
    setUndoStack,
    pushSnapshot,
    commitHistory,
    commitBatchHistory,
    commitProjectHistory,
    discardLastHistoryEntry,
    clearHistory,
    handleUndo,
    handleRedo,
    canUndo: activeIvsKey
      ? currentUndoStack.length > 0
      : currentUndoStack.length > 0 || projectUndoStack.length > 0,
    canRedo: activeIvsKey
      ? currentRedoStack.length > 0
      : currentRedoStack.length > 0 || projectRedoStack.length > 0,
  };
}
