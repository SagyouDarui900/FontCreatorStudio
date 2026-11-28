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

function computeMapsTotalBytes(
  ...maps: Array<Record<number, GlyphData[]> | Record<string, GlyphData[]>>
): number {
  let total = 0;
  for (const map of maps) {
    for (const key of Object.keys(map)) {
      total += estimateStackBytes((map as Record<string, GlyphData[]>)[key]);
    }
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

function touchIvsHistoryOrder(
  order: string[],
  ivsKey: string,
  maxEntries: number = MAX_HISTORY_GLYPHS
): { nextOrder: string[]; evicted: string[] } {
  const filtered = order.filter((k) => k !== ivsKey);
  filtered.push(ivsKey);
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
  // MRU order of IVS variant keys with history, capped at MAX_HISTORY_GLYPHS
  // like the base-glyph order. Used by the shared eviction below.
  const ivsHistoryOrderRef = useRef<string[]>([]);

  // Monotonic operation sequence shared by the glyph, IVS and project
  // histories. Every committed entry is stamped with the sequence number
  // of its operation (see opSeqRef); Undo compares the top entries of the
  // candidate stacks by that number and undoes the most recent operation
  // first, so a project-level change made after a glyph edit is undone
  // before that edit instead of being unreachable behind it. A second
  // number (see redoSeqRef) records when an entry was moved to a redo
  // stack by an Undo; Redo compares that number instead, because the
  // order operations were undone is not the same as the order they were
  // committed once new operations interleave with Undos. An entry moved
  // back to an undo stack by a Redo keeps its original operation number.
  const sequenceRef = useRef(0);
  const opSeqRef = useRef(new WeakMap<object, number>());
  const redoSeqRef = useRef(new WeakMap<object, number>());

  const nextSequence = useCallback((): number => {
    sequenceRef.current += 1;
    return sequenceRef.current;
  }, []);

  const opSeqOf = useCallback((entry: object): number => {
    return opSeqRef.current.get(entry) ?? -1;
  }, []);

  const redoSeqOf = useCallback((entry: object): number => {
    return redoSeqRef.current.get(entry) ?? -1;
  }, []);

  const undoTopSeq = useCallback(
    (stack: readonly object[] | undefined): number => {
      if (!stack || stack.length === 0) return -1;
      return opSeqOf(stack[stack.length - 1]);
    },
    [opSeqOf]
  );

  const redoTopSeq = useCallback(
    (stack: readonly object[] | undefined): number => {
      if (!stack || stack.length === 0) return -1;
      return redoSeqOf(stack[stack.length - 1]);
    },
    [redoSeqOf]
  );

  // Assign refs + state for the four history maps whose contents changed.
  // Callers pass the (possibly copied) maps together with one flag per map.
  const syncHistoryMaps = useCallback(
    (
      maps: {
        undoMap: Record<number, GlyphData[]>;
        redoMap: Record<number, GlyphData[]>;
        ivsUndoMap: Record<string, GlyphData[]>;
        ivsRedoMap: Record<string, GlyphData[]>;
      },
      changed: {
        undoChanged: boolean;
        redoChanged: boolean;
        ivsUndoChanged: boolean;
        ivsRedoChanged: boolean;
      }
    ) => {
      if (changed.undoChanged) {
        undoStacksRef.current = maps.undoMap;
        setUndoStacks(maps.undoMap);
      }
      if (changed.redoChanged) {
        redoStacksRef.current = maps.redoMap;
        setRedoStacks(maps.redoMap);
      }
      if (changed.ivsUndoChanged) {
        ivsUndoStacksRef.current = maps.ivsUndoMap;
        setIvsUndoStacks(maps.ivsUndoMap);
      }
      if (changed.ivsRedoChanged) {
        ivsRedoStacksRef.current = maps.ivsRedoMap;
        setIvsRedoStacks(maps.ivsRedoMap);
      }
    },
    []
  );

  const currentUndoStack = activeIvsKey
    ? ivsUndoStacks[activeIvsKey] || EMPTY_HISTORY_STACK
    : undoStacks[selectedUnicode] || EMPTY_HISTORY_STACK;
  const currentRedoStack = activeIvsKey
    ? ivsRedoStacks[activeIvsKey] || EMPTY_HISTORY_STACK
    : redoStacks[selectedUnicode] || EMPTY_HISTORY_STACK;

  interface EvictionInput {
    undoMap: Record<number, GlyphData[]>;
    redoMap: Record<number, GlyphData[]>;
    ivsUndoMap: Record<string, GlyphData[]>;
    ivsRedoMap: Record<string, GlyphData[]>;
    evicted?: number[];
    protectedUnicodes?: number[];
    evictedIvsKeys?: string[];
    protectedIvsKeys?: string[];
  }

  interface EvictionResult {
    undoChanged: boolean;
    redoChanged: boolean;
    ivsUndoChanged: boolean;
    ivsRedoChanged: boolean;
  }

  // Enforce the shared history budget (MAX_HISTORY_BYTES / MAX_HISTORY_GLYPHS)
  // over the base-glyph and IVS stacks together. Callers pass the next maps
  // for all four stacks (copies when the caller did not change that kind);
  // the maps are mutated in place and the result flags say which kinds
  // changed so the caller can sync refs + state via syncHistoryMaps.
  const applyEvictionAndBudget = useCallback(
    (input: EvictionInput): EvictionResult => {
      const { undoMap, redoMap, ivsUndoMap, ivsRedoMap } = input;
      const evicted = input.evicted ?? [];
      const protectedUnicodes = input.protectedUnicodes ?? [];
      const evictedIvsKeys = input.evictedIvsKeys ?? [];
      const protectedIvsKeys = input.protectedIvsKeys ?? [];
      let undoChanged = false;
      let redoChanged = false;
      let ivsUndoChanged = false;
      let ivsRedoChanged = false;
      const protectedSet = new Set(protectedUnicodes);
      const protectedIvsSet = new Set(protectedIvsKeys);

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
      for (const k of evictedIvsKeys) {
        if (k in ivsUndoMap) {
          delete ivsUndoMap[k];
          ivsUndoChanged = true;
        }
        if (k in ivsRedoMap) {
          delete ivsRedoMap[k];
          ivsRedoChanged = true;
        }
      }

      if (maxHistoryBytes <= 0 || !Number.isFinite(maxHistoryBytes)) {
        return { undoChanged, redoChanged, ivsUndoChanged, ivsRedoChanged };
      }

      let totalBytes = computeMapsTotalBytes(undoMap, redoMap, ivsUndoMap, ivsRedoMap);
      if (totalBytes <= maxHistoryBytes) {
        return { undoChanged, redoChanged, ivsUndoChanged, ivsRedoChanged };
      }

      // 1. Evict oldest non-protected stacks first. Within each kind the
      // order is the MRU order; across kinds, evict the stack whose most
      // recent committed entry is older (by its sequence number), so an
      // IVS stack that grew large does not evict recently used base glyphs
      // first, and vice versa. With only one kind present this is exactly
      // the previous oldest-first order.
      const stackLastSeq = (undo?: GlyphData[], redo?: GlyphData[]): number => {
        if (undo && undo.length > 0) return opSeqRef.current.get(undo[undo.length - 1]) ?? -1;
        if (redo && redo.length > 0) return opSeqRef.current.get(redo[redo.length - 1]) ?? -1;
        return -1;
      };
      const baseQueue = historyOrderRef.current.filter((u) => !protectedSet.has(u));
      const ivsQueue = ivsHistoryOrderRef.current.filter((k) => !protectedIvsSet.has(k));
      const evictedBase = new Set<number>();
      const evictedIvs = new Set<string>();
      while (totalBytes > maxHistoryBytes && (baseQueue.length > 0 || ivsQueue.length > 0)) {
        let takeBase: boolean;
        if (baseQueue.length === 0) takeBase = false;
        else if (ivsQueue.length === 0) takeBase = true;
        else {
          const baseSeq = stackLastSeq(undoMap[baseQueue[0]], redoMap[baseQueue[0]]);
          const ivsSeq = stackLastSeq(ivsUndoMap[ivsQueue[0]], ivsRedoMap[ivsQueue[0]]);
          takeBase = baseSeq <= ivsSeq;
        }
        if (takeBase) {
          const u = baseQueue.shift()!;
          totalBytes -= estimateStackBytes(undoMap[u]) + estimateStackBytes(redoMap[u]);
          if (u in undoMap) {
            delete undoMap[u];
            undoChanged = true;
          }
          if (u in redoMap) {
            delete redoMap[u];
            redoChanged = true;
          }
          evictedBase.add(u);
        } else {
          const k = ivsQueue.shift()!;
          totalBytes -= estimateStackBytes(ivsUndoMap[k]) + estimateStackBytes(ivsRedoMap[k]);
          if (k in ivsUndoMap) {
            delete ivsUndoMap[k];
            ivsUndoChanged = true;
          }
          if (k in ivsRedoMap) {
            delete ivsRedoMap[k];
            ivsRedoChanged = true;
          }
          evictedIvs.add(k);
        }
      }
      if (evictedBase.size > 0) {
        historyOrderRef.current = historyOrderRef.current.filter((u) => !evictedBase.has(u));
      }
      if (evictedIvs.size > 0) {
        ivsHistoryOrderRef.current = ivsHistoryOrderRef.current.filter((k) => !evictedIvs.has(k));
      }

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
      for (const protectedIvsKey of protectedIvsSet) {
        if (totalBytes <= maxHistoryBytes) break;
        const activeRedo = ivsRedoMap[protectedIvsKey];
        if (activeRedo && activeRedo.length > 0) {
          const nextRedo = [...activeRedo];
          while (totalBytes > maxHistoryBytes && nextRedo.length > 0) {
            const removed = nextRedo.shift()!;
            totalBytes -= estimateGlyphHistoryBytes(removed);
            ivsRedoChanged = true;
          }
          if (nextRedo.length === 0) {
            delete ivsRedoMap[protectedIvsKey];
          } else {
            ivsRedoMap[protectedIvsKey] = nextRedo;
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
      for (const protectedIvsKey of protectedIvsSet) {
        if (totalBytes <= maxHistoryBytes) break;
        const activeUndo = ivsUndoMap[protectedIvsKey];
        if (activeUndo && activeUndo.length > 1) {
          const nextUndo = [...activeUndo];
          while (totalBytes > maxHistoryBytes && nextUndo.length > 1) {
            const removed = nextUndo.shift()!;
            totalBytes -= estimateGlyphHistoryBytes(removed);
            ivsUndoChanged = true;
          }
          ivsUndoMap[protectedIvsKey] = nextUndo;
        }
      }

      return { undoChanged, redoChanged, ivsUndoChanged, ivsRedoChanged };
    },
    [maxHistoryBytes]
  );

  const commitHistory = useCallback(
    (targetUnicode?: number) => {
      if (targetUnicode === undefined && activeIvsKey) {
        const variant = projectRef.current.ivsVariants?.[activeIvsKey];
        if (!variant) return;
        const existingGlyph = variant.glyph;
        const { nextOrder, evicted } = touchIvsHistoryOrder(ivsHistoryOrderRef.current, activeIvsKey);
        ivsHistoryOrderRef.current = nextOrder;
        const currentUndo = ivsUndoStacksRef.current[activeIvsKey] || [];
        const last = currentUndo.length > 0 ? currentUndo[currentUndo.length - 1] : null;
        const nextIvsUndoMap = { ...ivsUndoStacksRef.current };
        const nextIvsRedoMap = { ...ivsRedoStacksRef.current };
        let ivsUndoChanged = false;
        let ivsRedoChanged = false;

        if (!last || !areGlyphsEqual(last, existingGlyph)) {
          const entry = cloneGlyph(existingGlyph);
          opSeqRef.current.set(entry, nextSequence());
          nextIvsUndoMap[activeIvsKey] = [...currentUndo.slice(-49), entry];
          ivsUndoChanged = true;
        }
        if (nextIvsRedoMap[activeIvsKey] && nextIvsRedoMap[activeIvsKey].length > 0) {
          delete nextIvsRedoMap[activeIvsKey];
          ivsRedoChanged = true;
        }
        const nextUndoMap = { ...undoStacksRef.current };
        const nextRedoMap = { ...redoStacksRef.current };
        const eviction = applyEvictionAndBudget({
          undoMap: nextUndoMap,
          redoMap: nextRedoMap,
          ivsUndoMap: nextIvsUndoMap,
          ivsRedoMap: nextIvsRedoMap,
          evictedIvsKeys: evicted,
          protectedUnicodes: [selectedUnicode],
          protectedIvsKeys: [activeIvsKey],
        });
        syncHistoryMaps(
          {
            undoMap: nextUndoMap,
            redoMap: nextRedoMap,
            ivsUndoMap: nextIvsUndoMap,
            ivsRedoMap: nextIvsRedoMap,
          },
          {
            undoChanged: eviction.undoChanged,
            redoChanged: eviction.redoChanged,
            ivsUndoChanged: ivsUndoChanged || eviction.ivsUndoChanged,
            ivsRedoChanged: ivsRedoChanged || eviction.ivsRedoChanged,
          }
        );
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
        const entry = cloneGlyph(existingGlyph);
        opSeqRef.current.set(entry, nextSequence());
        nextUndoMap[unicode] = [...currentUndo.slice(-49), entry];
        undoChanged = true;
      }

      if (nextRedoMap[unicode] && nextRedoMap[unicode].length > 0) {
        delete nextRedoMap[unicode];
        redoChanged = true;
      }

      const nextIvsUndoMap = { ...ivsUndoStacksRef.current };
      const nextIvsRedoMap = { ...ivsRedoStacksRef.current };
      const budgetResult = applyEvictionAndBudget({
        undoMap: nextUndoMap,
        redoMap: nextRedoMap,
        ivsUndoMap: nextIvsUndoMap,
        ivsRedoMap: nextIvsRedoMap,
        evicted,
        protectedUnicodes: [selectedUnicode, unicode],
        protectedIvsKeys: activeIvsKey ? [activeIvsKey] : [],
      });
      syncHistoryMaps(
        {
          undoMap: nextUndoMap,
          redoMap: nextRedoMap,
          ivsUndoMap: nextIvsUndoMap,
          ivsRedoMap: nextIvsRedoMap,
        },
        {
          undoChanged: undoChanged || budgetResult.undoChanged,
          redoChanged: redoChanged || budgetResult.redoChanged,
          ivsUndoChanged: budgetResult.ivsUndoChanged,
          ivsRedoChanged: budgetResult.ivsRedoChanged,
        }
      );
    },
    [
      activeIvsKey,
      selectedUnicode,
      selectedChar,
      projectRef,
      applyEvictionAndBudget,
      nextSequence,
      syncHistoryMaps,
    ]
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
            const entry = cloneGlyph(existingGlyph);
            opSeqRef.current.set(entry, nextSequence());
            nextUndoMap[unicode] = [...currentUndo.slice(-49), entry];
            undoChanged = true;
          }
          if (nextRedoMap[unicode] && nextRedoMap[unicode].length > 0) {
            delete nextRedoMap[unicode];
            redoChanged = true;
          }
        }

        historyOrderRef.current = order;
        const nextIvsUndoMap = { ...ivsUndoStacksRef.current };
        const nextIvsRedoMap = { ...ivsRedoStacksRef.current };
        const budgetResult = applyEvictionAndBudget({
          undoMap: nextUndoMap,
          redoMap: nextRedoMap,
          ivsUndoMap: nextIvsUndoMap,
          ivsRedoMap: nextIvsRedoMap,
          evicted: Array.from(evictedSet),
          protectedUnicodes: [selectedUnicode],
          protectedIvsKeys: activeIvsKey ? [activeIvsKey] : [],
        });

        syncHistoryMaps(
          {
            undoMap: nextUndoMap,
            redoMap: nextRedoMap,
            ivsUndoMap: nextIvsUndoMap,
            ivsRedoMap: nextIvsRedoMap,
          },
          {
            undoChanged: undoChanged || budgetResult.undoChanged,
            redoChanged: redoChanged || budgetResult.redoChanged,
            ivsUndoChanged: budgetResult.ivsUndoChanged,
            ivsRedoChanged: budgetResult.ivsRedoChanged,
          }
        );
      }

      if (hasIvs && targetIvsKeys) {
        const uniqueIvsKeys = Array.from(new Set(targetIvsKeys));
        const maxEntries = Math.max(MAX_HISTORY_GLYPHS, uniqueIvsKeys.length);
        let ivsOrder = ivsHistoryOrderRef.current;
        const nextIvsUndoMap = { ...ivsUndoStacksRef.current };
        const nextIvsRedoMap = { ...ivsRedoStacksRef.current };
        let ivsUndoChanged = false;
        let ivsRedoChanged = false;
        const evictedIvsSet = new Set<string>();

        for (const ivsKey of uniqueIvsKeys) {
          const variant = projectRef.current.ivsVariants?.[ivsKey];
          if (!variant) continue;
          const touched = touchIvsHistoryOrder(ivsOrder, ivsKey, maxEntries);
          ivsOrder = touched.nextOrder;
          for (const ev of touched.evicted) evictedIvsSet.add(ev);
          const existingGlyph = variant.glyph;
          const currentUndo = nextIvsUndoMap[ivsKey] || [];
          const last = currentUndo.length > 0 ? currentUndo[currentUndo.length - 1] : null;
          if (!last || !areGlyphsEqual(last, existingGlyph)) {
            const entry = cloneGlyph(existingGlyph);
            opSeqRef.current.set(entry, nextSequence());
            nextIvsUndoMap[ivsKey] = [...currentUndo.slice(-49), entry];
            ivsUndoChanged = true;
          }
          if (nextIvsRedoMap[ivsKey] && nextIvsRedoMap[ivsKey].length > 0) {
            delete nextIvsRedoMap[ivsKey];
            ivsRedoChanged = true;
          }
        }

        ivsHistoryOrderRef.current = ivsOrder;
        const nextUndoMap = { ...undoStacksRef.current };
        const nextRedoMap = { ...redoStacksRef.current };
        const eviction = applyEvictionAndBudget({
          undoMap: nextUndoMap,
          redoMap: nextRedoMap,
          ivsUndoMap: nextIvsUndoMap,
          ivsRedoMap: nextIvsRedoMap,
          evictedIvsKeys: Array.from(evictedIvsSet),
          protectedUnicodes: [selectedUnicode],
          protectedIvsKeys: activeIvsKey ? [activeIvsKey] : [],
        });
        syncHistoryMaps(
          {
            undoMap: nextUndoMap,
            redoMap: nextRedoMap,
            ivsUndoMap: nextIvsUndoMap,
            ivsRedoMap: nextIvsRedoMap,
          },
          {
            undoChanged: eviction.undoChanged,
            redoChanged: eviction.redoChanged,
            ivsUndoChanged: ivsUndoChanged || eviction.ivsUndoChanged,
            ivsRedoChanged: ivsRedoChanged || eviction.ivsRedoChanged,
          }
        );
      }
    },
    [selectedUnicode, projectRef, applyEvictionAndBudget, activeIvsKey, nextSequence, syncHistoryMaps]
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
    // Stamp the snapshot with the operation sequence so Undo/Redo can
    // compare it against the most recent glyph (or IVS) entry and undo
    // whichever operation happened last.
    opSeqRef.current.set(snapshot, nextSequence());
    const nextUndo = [...projectUndoStackRef.current.slice(-(MAX_PROJECT_HISTORY_ENTRIES - 1)), snapshot];
    projectUndoStackRef.current = nextUndo;
    setProjectUndoStack(nextUndo);
    if (projectRedoStackRef.current.length > 0) {
      projectRedoStackRef.current = [];
      setProjectRedoStack([]);
    }
  }, [projectRef, nextSequence]);

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

  // Undo one base-glyph entry: pop its undo stack, push the current glyph
  // onto its redo stack carrying the undone operation's sequence number
  // and stamped with a fresh redo-time sequence number (so a later Redo
  // re-applies operations in the reverse order they were undone), and run
  // the shared eviction over the base + IVS maps.
  const undoGlyphStack = useCallback(
    (unicode: number) => {
      const stack = undoStacksRef.current[unicode] || [];
      if (stack.length === 0) return;

      const { nextOrder, evicted } = touchHistoryGlyphOrder(historyOrderRef.current, unicode);
      historyOrderRef.current = nextOrder;

      const previous = stack[stack.length - 1];
      const seq = opSeqOf(previous);
      const nextUndoStack = stack.slice(0, stack.length - 1);
      const currentSnapshot = currentGlyphRef.current;
      const redoList = redoStacksRef.current[unicode] || [];
      const redoEntry = cloneGlyph(currentSnapshot);
      opSeqRef.current.set(redoEntry, seq);
      redoSeqRef.current.set(redoEntry, nextSequence());
      const nextRedoStack = [...redoList.slice(-49), redoEntry];

      const nextUndoMap = {
        ...undoStacksRef.current,
        [unicode]: nextUndoStack,
      };
      const nextRedoMap = {
        ...redoStacksRef.current,
        [unicode]: nextRedoStack,
      };
      const nextIvsUndoMap = { ...ivsUndoStacksRef.current };
      const nextIvsRedoMap = { ...ivsRedoStacksRef.current };
      const eviction = applyEvictionAndBudget({
        undoMap: nextUndoMap,
        redoMap: nextRedoMap,
        ivsUndoMap: nextIvsUndoMap,
        ivsRedoMap: nextIvsRedoMap,
        evicted,
        protectedUnicodes: [unicode],
        protectedIvsKeys: activeIvsKey ? [activeIvsKey] : [],
      });
      syncHistoryMaps(
        {
          undoMap: nextUndoMap,
          redoMap: nextRedoMap,
          ivsUndoMap: nextIvsUndoMap,
          ivsRedoMap: nextIvsRedoMap,
        },
        {
          undoChanged: true,
          redoChanged: true,
          ivsUndoChanged: eviction.ivsUndoChanged,
          ivsRedoChanged: eviction.ivsRedoChanged,
        }
      );

      const restoredGlyph: GlyphData = {
        ...previous,
        modified: true,
      };
      currentGlyphRef.current = restoredGlyph;

      setProject((prevProj) => ({
        ...prevProj,
        glyphs: {
          ...prevProj.glyphs,
          [unicode]: restoredGlyph,
        },
        updatedAt: Date.now(),
      }));
    },
    [activeIvsKey, currentGlyphRef, setProject, applyEvictionAndBudget, opSeqOf, syncHistoryMaps, nextSequence]
  );

  const undoIvsStack = useCallback(
    (ivsKey: string) => {
      const stack = ivsUndoStacksRef.current[ivsKey] || [];
      if (stack.length === 0) return;

      const { nextOrder, evicted } = touchIvsHistoryOrder(ivsHistoryOrderRef.current, ivsKey);
      ivsHistoryOrderRef.current = nextOrder;

      const previous = stack[stack.length - 1];
      const seq = opSeqOf(previous);
      const nextUndoStack = stack.slice(0, stack.length - 1);
      const currentSnapshot = currentGlyphRef.current;
      const redoList = ivsRedoStacksRef.current[ivsKey] || [];
      const redoEntry = cloneGlyph(currentSnapshot);
      opSeqRef.current.set(redoEntry, seq);
      redoSeqRef.current.set(redoEntry, nextSequence());
      const nextRedoStack = [...redoList.slice(-49), redoEntry];

      const nextIvsUndoMap = { ...ivsUndoStacksRef.current, [ivsKey]: nextUndoStack };
      const nextIvsRedoMap = { ...ivsRedoStacksRef.current, [ivsKey]: nextRedoStack };
      const nextUndoMap = { ...undoStacksRef.current };
      const nextRedoMap = { ...redoStacksRef.current };
      const eviction = applyEvictionAndBudget({
        undoMap: nextUndoMap,
        redoMap: nextRedoMap,
        ivsUndoMap: nextIvsUndoMap,
        ivsRedoMap: nextIvsRedoMap,
        evictedIvsKeys: evicted,
        protectedUnicodes: [selectedUnicode],
        protectedIvsKeys: [ivsKey],
      });
      syncHistoryMaps(
        {
          undoMap: nextUndoMap,
          redoMap: nextRedoMap,
          ivsUndoMap: nextIvsUndoMap,
          ivsRedoMap: nextIvsRedoMap,
        },
        {
          undoChanged: eviction.undoChanged,
          redoChanged: eviction.redoChanged,
          ivsUndoChanged: true,
          ivsRedoChanged: true,
        }
      );

      const restoredGlyph: GlyphData = { ...previous, modified: true };
      currentGlyphRef.current = restoredGlyph;

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
    },
    [selectedUnicode, currentGlyphRef, setProject, applyEvictionAndBudget, opSeqOf, syncHistoryMaps, nextSequence]
  );

  const undoProjectStack = useCallback(() => {
    const projectStack = projectUndoStackRef.current;
    if (projectStack.length === 0) return;
    const previous = projectStack[projectStack.length - 1];
    const seq = opSeqOf(previous);
    const nextProjectUndo = projectStack.slice(0, projectStack.length - 1);
    const redoSnapshot = snapshotProjectConfig(projectRef.current);
    opSeqRef.current.set(redoSnapshot, seq);
    redoSeqRef.current.set(redoSnapshot, nextSequence());
    const nextProjectRedo = [
      ...projectRedoStackRef.current.slice(-(MAX_PROJECT_HISTORY_ENTRIES - 1)),
      redoSnapshot,
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
  }, [projectRef, setProject, opSeqOf, nextSequence]);

  // Undo the most recent operation, whichever kind it was: compare the
  // sequence numbers stamped on the top entries of the current glyph (or
  // IVS) undo stack and the project undo stack. While an IVS variant is
  // being edited, a project-level change is no longer blanket-disabled:
  // it is undone whenever it is newer than the newest IVS entry, and the
  // IVS entry is undone whenever it is newer. The base glyph stack stays
  // out of reach while IVS editing is active, as before.
  const handleUndo = useCallback(() => {
    if (activeIvsKey) {
      const ivsKey = activeIvsKey;
      const ivsStack = ivsUndoStacksRef.current[ivsKey] || [];
      const projectStack = projectUndoStackRef.current;
      if (ivsStack.length === 0 && projectStack.length === 0) return;
      if (
        ivsStack.length > 0 &&
        (projectStack.length === 0 || undoTopSeq(ivsStack) >= undoTopSeq(projectStack))
      ) {
        undoIvsStack(ivsKey);
      } else {
        undoProjectStack();
      }
      return;
    }

    const unicode = selectedUnicode;
    const stack = undoStacksRef.current[unicode] || [];
    const projectStack = projectUndoStackRef.current;
    if (stack.length === 0 && projectStack.length === 0) return;
    if (
      stack.length > 0 &&
      (projectStack.length === 0 || undoTopSeq(stack) >= undoTopSeq(projectStack))
    ) {
      undoGlyphStack(unicode);
    } else {
      undoProjectStack();
    }
  }, [activeIvsKey, selectedUnicode, undoTopSeq, undoGlyphStack, undoIvsStack, undoProjectStack]);

  const redoGlyphStack = useCallback(
    (unicode: number) => {
      const stack = redoStacksRef.current[unicode] || [];
      if (stack.length === 0) return;

      const { nextOrder, evicted } = touchHistoryGlyphOrder(historyOrderRef.current, unicode);
      historyOrderRef.current = nextOrder;

      const next = stack[stack.length - 1];
      const seq = opSeqOf(next);
      const nextRedoStack = stack.slice(0, stack.length - 1);
      const currentSnapshot = currentGlyphRef.current;
      const undoList = undoStacksRef.current[unicode] || [];
      const undoEntry = cloneGlyph(currentSnapshot);
      opSeqRef.current.set(undoEntry, seq);
      const nextUndoStack = [...undoList.slice(-49), undoEntry];

      const nextRedoMap = {
        ...redoStacksRef.current,
        [unicode]: nextRedoStack,
      };
      const nextUndoMap = {
        ...undoStacksRef.current,
        [unicode]: nextUndoStack,
      };
      const nextIvsUndoMap = { ...ivsUndoStacksRef.current };
      const nextIvsRedoMap = { ...ivsRedoStacksRef.current };
      const eviction = applyEvictionAndBudget({
        undoMap: nextUndoMap,
        redoMap: nextRedoMap,
        ivsUndoMap: nextIvsUndoMap,
        ivsRedoMap: nextIvsRedoMap,
        evicted,
        protectedUnicodes: [unicode],
        protectedIvsKeys: activeIvsKey ? [activeIvsKey] : [],
      });
      syncHistoryMaps(
        {
          undoMap: nextUndoMap,
          redoMap: nextRedoMap,
          ivsUndoMap: nextIvsUndoMap,
          ivsRedoMap: nextIvsRedoMap,
        },
        {
          undoChanged: true,
          redoChanged: true,
          ivsUndoChanged: eviction.ivsUndoChanged,
          ivsRedoChanged: eviction.ivsRedoChanged,
        }
      );

      const restoredGlyph: GlyphData = {
        ...next,
        modified: true,
      };
      currentGlyphRef.current = restoredGlyph;

      setProject((prevProj) => ({
        ...prevProj,
        glyphs: {
          ...prevProj.glyphs,
          [unicode]: restoredGlyph,
        },
        updatedAt: Date.now(),
      }));
    },
    [activeIvsKey, currentGlyphRef, setProject, applyEvictionAndBudget, opSeqOf, syncHistoryMaps]
  );

  const redoIvsStack = useCallback(
    (ivsKey: string) => {
      const stack = ivsRedoStacksRef.current[ivsKey] || [];
      if (stack.length === 0) return;

      const { nextOrder, evicted } = touchIvsHistoryOrder(ivsHistoryOrderRef.current, ivsKey);
      ivsHistoryOrderRef.current = nextOrder;

      const next = stack[stack.length - 1];
      const seq = opSeqOf(next);
      const nextRedoStack = stack.slice(0, stack.length - 1);
      const currentSnapshot = currentGlyphRef.current;
      const undoList = ivsUndoStacksRef.current[ivsKey] || [];
      const undoEntry = cloneGlyph(currentSnapshot);
      opSeqRef.current.set(undoEntry, seq);
      const nextUndoStack = [...undoList.slice(-49), undoEntry];

      const nextIvsRedoMap = { ...ivsRedoStacksRef.current, [ivsKey]: nextRedoStack };
      const nextIvsUndoMap = { ...ivsUndoStacksRef.current, [ivsKey]: nextUndoStack };
      const nextUndoMap = { ...undoStacksRef.current };
      const nextRedoMap = { ...redoStacksRef.current };
      const eviction = applyEvictionAndBudget({
        undoMap: nextUndoMap,
        redoMap: nextRedoMap,
        ivsUndoMap: nextIvsUndoMap,
        ivsRedoMap: nextIvsRedoMap,
        evictedIvsKeys: evicted,
        protectedUnicodes: [selectedUnicode],
        protectedIvsKeys: [ivsKey],
      });
      syncHistoryMaps(
        {
          undoMap: nextUndoMap,
          redoMap: nextRedoMap,
          ivsUndoMap: nextIvsUndoMap,
          ivsRedoMap: nextIvsRedoMap,
        },
        {
          undoChanged: eviction.undoChanged,
          redoChanged: eviction.redoChanged,
          ivsUndoChanged: true,
          ivsRedoChanged: true,
        }
      );

      const restoredGlyph: GlyphData = { ...next, modified: true };
      currentGlyphRef.current = restoredGlyph;

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
    },
    [selectedUnicode, currentGlyphRef, setProject, applyEvictionAndBudget, opSeqOf, syncHistoryMaps]
  );

  const redoProjectStack = useCallback(() => {
    const projectStack = projectRedoStackRef.current;
    if (projectStack.length === 0) return;
    const next = projectStack[projectStack.length - 1];
    const seq = opSeqOf(next);
    const nextProjectRedo = projectStack.slice(0, projectStack.length - 1);
    const undoSnapshot = snapshotProjectConfig(projectRef.current);
    opSeqRef.current.set(undoSnapshot, seq);
    const nextProjectUndo = [
      ...projectUndoStackRef.current.slice(-(MAX_PROJECT_HISTORY_ENTRIES - 1)),
      undoSnapshot,
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
  }, [projectRef, setProject, opSeqOf]);

  // Redo mirrors handleUndo: redo the most recently undone operation
  // first, comparing the redo-time sequence numbers stamped on the top
  // entries of the current glyph (or IVS) redo stack and the project redo
  // stack. An entry moved back to an undo stack by a Redo keeps its
  // original operation sequence number, so the relative order of glyph
  // and project operations is preserved across Undo/Redo cycles.
  const handleRedo = useCallback(() => {
    if (activeIvsKey) {
      const ivsKey = activeIvsKey;
      const ivsStack = ivsRedoStacksRef.current[ivsKey] || [];
      const projectStack = projectRedoStackRef.current;
      if (ivsStack.length === 0 && projectStack.length === 0) return;
      if (
        ivsStack.length > 0 &&
        (projectStack.length === 0 || redoTopSeq(ivsStack) >= redoTopSeq(projectStack))
      ) {
        redoIvsStack(ivsKey);
      } else {
        redoProjectStack();
      }
      return;
    }

    const unicode = selectedUnicode;
    const stack = redoStacksRef.current[unicode] || [];
    const projectStack = projectRedoStackRef.current;
    if (stack.length === 0 && projectStack.length === 0) return;
    if (
      stack.length > 0 &&
      (projectStack.length === 0 || redoTopSeq(stack) >= redoTopSeq(projectStack))
    ) {
      redoGlyphStack(unicode);
    } else {
      redoProjectStack();
    }
  }, [activeIvsKey, selectedUnicode, redoTopSeq, redoGlyphStack, redoIvsStack, redoProjectStack]);

  const pushSnapshot = useCallback(
    (glyph: GlyphData, targetUnicode?: number) => {
      if (targetUnicode === undefined && activeIvsKey) {
        const { nextOrder, evicted } = touchIvsHistoryOrder(ivsHistoryOrderRef.current, activeIvsKey);
        ivsHistoryOrderRef.current = nextOrder;
        const stack = ivsUndoStacksRef.current[activeIvsKey] || [];
        const entry = cloneGlyph(glyph);
        opSeqRef.current.set(entry, nextSequence());
        const nextIvsUndoMap = {
          ...ivsUndoStacksRef.current,
          [activeIvsKey]: [...stack.slice(-49), entry],
        };
        const nextIvsRedoMap = { ...ivsRedoStacksRef.current };
        let ivsRedoChanged = false;
        if (nextIvsRedoMap[activeIvsKey]?.length) {
          delete nextIvsRedoMap[activeIvsKey];
          ivsRedoChanged = true;
        }
        const nextUndoMap = { ...undoStacksRef.current };
        const nextRedoMap = { ...redoStacksRef.current };
        const eviction = applyEvictionAndBudget({
          undoMap: nextUndoMap,
          redoMap: nextRedoMap,
          ivsUndoMap: nextIvsUndoMap,
          ivsRedoMap: nextIvsRedoMap,
          evictedIvsKeys: evicted,
          protectedUnicodes: [selectedUnicode],
          protectedIvsKeys: [activeIvsKey],
        });
        syncHistoryMaps(
          {
            undoMap: nextUndoMap,
            redoMap: nextRedoMap,
            ivsUndoMap: nextIvsUndoMap,
            ivsRedoMap: nextIvsRedoMap,
          },
          {
            undoChanged: eviction.undoChanged,
            redoChanged: eviction.redoChanged,
            ivsUndoChanged: true,
            ivsRedoChanged: ivsRedoChanged || eviction.ivsRedoChanged,
          }
        );
        return;
      }

      const unicode = targetUnicode ?? glyph.unicode ?? selectedUnicode;
      const { nextOrder, evicted } = touchHistoryGlyphOrder(historyOrderRef.current, unicode);
      historyOrderRef.current = nextOrder;

      const stack = undoStacksRef.current[unicode] || [];
      const entry = cloneGlyph(glyph);
      opSeqRef.current.set(entry, nextSequence());
      const nextUndoMap: Record<number, GlyphData[]> = {
        ...undoStacksRef.current,
        [unicode]: [...stack.slice(-49), entry],
      };
      const nextRedoMap: Record<number, GlyphData[]> = { ...redoStacksRef.current };
      let redoChanged = false;

      if (nextRedoMap[unicode] && nextRedoMap[unicode].length > 0) {
        delete nextRedoMap[unicode];
        redoChanged = true;
      }

      const nextIvsUndoMap = { ...ivsUndoStacksRef.current };
      const nextIvsRedoMap = { ...ivsRedoStacksRef.current };
      const evictionResult = applyEvictionAndBudget({
        undoMap: nextUndoMap,
        redoMap: nextRedoMap,
        ivsUndoMap: nextIvsUndoMap,
        ivsRedoMap: nextIvsRedoMap,
        evicted,
        protectedUnicodes: [selectedUnicode, unicode],
        protectedIvsKeys: activeIvsKey ? [activeIvsKey] : [],
      });
      syncHistoryMaps(
        {
          undoMap: nextUndoMap,
          redoMap: nextRedoMap,
          ivsUndoMap: nextIvsUndoMap,
          ivsRedoMap: nextIvsRedoMap,
        },
        {
          undoChanged: true,
          redoChanged: redoChanged || evictionResult.redoChanged,
          ivsUndoChanged: evictionResult.ivsUndoChanged,
          ivsRedoChanged: evictionResult.ivsRedoChanged,
        }
      );
    },
    [activeIvsKey, selectedUnicode, applyEvictionAndBudget, nextSequence, syncHistoryMaps]
  );

  const setUndoStack = useCallback(
    (action: React.SetStateAction<GlyphData[]>) => {
      if (activeIvsKey) {
        const { nextOrder, evicted } = touchIvsHistoryOrder(ivsHistoryOrderRef.current, activeIvsKey);
        ivsHistoryOrderRef.current = nextOrder;
        const currentStack = ivsUndoStacksRef.current[activeIvsKey] || [];
        const nextStack = typeof action === 'function' ? action(currentStack) : action;
        // Entries installed from outside carry no sequence number; stamp
        // them in stack order (oldest first) so the recency comparison
        // still reflects the order inside the stack.
        for (const entry of nextStack) {
          if (!opSeqRef.current.has(entry)) {
            opSeqRef.current.set(entry, nextSequence());
          }
        }
        const nextIvsUndoMap = { ...ivsUndoStacksRef.current, [activeIvsKey]: nextStack };
        const nextIvsRedoMap = { ...ivsRedoStacksRef.current };
        const nextUndoMap = { ...undoStacksRef.current };
        const nextRedoMap = { ...redoStacksRef.current };
        const eviction = applyEvictionAndBudget({
          undoMap: nextUndoMap,
          redoMap: nextRedoMap,
          ivsUndoMap: nextIvsUndoMap,
          ivsRedoMap: nextIvsRedoMap,
          evictedIvsKeys: evicted,
          protectedUnicodes: [selectedUnicode],
          protectedIvsKeys: [activeIvsKey],
        });
        syncHistoryMaps(
          {
            undoMap: nextUndoMap,
            redoMap: nextRedoMap,
            ivsUndoMap: nextIvsUndoMap,
            ivsRedoMap: nextIvsRedoMap,
          },
          {
            undoChanged: eviction.undoChanged,
            redoChanged: eviction.redoChanged,
            ivsUndoChanged: true,
            ivsRedoChanged: eviction.ivsRedoChanged,
          }
        );
        return;
      }

      const { nextOrder, evicted } = touchHistoryGlyphOrder(
        historyOrderRef.current,
        selectedUnicode
      );
      historyOrderRef.current = nextOrder;

      const currentStack = undoStacksRef.current[selectedUnicode] || [];
      const nextStack = typeof action === 'function' ? action(currentStack) : action;
      for (const entry of nextStack) {
        if (!opSeqRef.current.has(entry)) {
          opSeqRef.current.set(entry, nextSequence());
        }
      }
      const nextUndoMap: Record<number, GlyphData[]> = {
        ...undoStacksRef.current,
        [selectedUnicode]: nextStack,
      };
      const nextRedoMap: Record<number, GlyphData[]> = { ...redoStacksRef.current };
      const nextIvsUndoMap = { ...ivsUndoStacksRef.current };
      const nextIvsRedoMap = { ...ivsRedoStacksRef.current };
      const evictionResult = applyEvictionAndBudget({
        undoMap: nextUndoMap,
        redoMap: nextRedoMap,
        ivsUndoMap: nextIvsUndoMap,
        ivsRedoMap: nextIvsRedoMap,
        evicted,
        protectedUnicodes: [selectedUnicode],
        protectedIvsKeys: activeIvsKey ? [activeIvsKey] : [],
      });

      syncHistoryMaps(
        {
          undoMap: nextUndoMap,
          redoMap: nextRedoMap,
          ivsUndoMap: nextIvsUndoMap,
          ivsRedoMap: nextIvsRedoMap,
        },
        {
          undoChanged: true,
          redoChanged: evictionResult.redoChanged,
          ivsUndoChanged: evictionResult.ivsUndoChanged,
          ivsRedoChanged: evictionResult.ivsRedoChanged,
        }
      );
    },
    [activeIvsKey, selectedUnicode, applyEvictionAndBudget, nextSequence, syncHistoryMaps]
  );

  const clearHistory = useCallback(() => {
    undoStacksRef.current = {};
    redoStacksRef.current = {};
    ivsUndoStacksRef.current = {};
    ivsRedoStacksRef.current = {};
    historyOrderRef.current = [];
    ivsHistoryOrderRef.current = [];
    sequenceRef.current = 0;
    opSeqRef.current = new WeakMap();
    redoSeqRef.current = new WeakMap();
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
    ivsUndoStacks,
    ivsRedoStacks,
    setUndoStack,
    pushSnapshot,
    commitHistory,
    commitBatchHistory,
    commitProjectHistory,
    discardLastHistoryEntry,
    clearHistory,
    handleUndo,
    handleRedo,
    // The project stack is reachable whenever its entries exist, including
    // while an IVS variant is being edited: project-level changes are
    // unrelated to the IVS glyph, so they are no longer disabled by IVS
    // editing. handleUndo/handleRedo still pick the most recent operation
    // first by sequence number.
    canUndo: currentUndoStack.length > 0 || projectUndoStack.length > 0,
    canRedo: currentRedoStack.length > 0 || projectRedoStack.length > 0,
  };
}
