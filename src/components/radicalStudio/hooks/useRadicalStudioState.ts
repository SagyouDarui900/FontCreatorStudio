import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  CustomPart,
  PartCategory,
  PathContour,
  ToolMode,
  BrushStyle,
  RadicalPlacement,
  Point,
} from '../../../types';
import { generateId } from '../../../utils/path';
import { makeUniquePartName } from '../../../utils/customParts';
import {
  RADICAL_FONT_OPTIONS,
  FontStyleOption,
} from '../../../utils/radicalExtractor';
import {
  loadCustomParts,
  saveCustomParts,
  buildDefaultCustomParts,
  isCustomPartsInitialized,
} from '../../../utils/customPartsStorage';
import type { ToastAction } from '../../../components/Toast';
import {
  CUSTOM_PARTS_STORAGE_KEY,
  sanitizeCustomParts,
} from '../types';
import { MobileSheetTab, MobileSheetSnap } from '../RadicalMobileDrawer';

interface UseRadicalStudioStateProps {
  selectedChar: string;
  onShowToast?: (text: string, type?: 'success' | 'info' | 'warning' | 'error', action?: ToastAction) => void;
}

export function useRadicalStudioState({
  selectedChar,
  onShowToast,
}: UseRadicalStudioStateProps) {
  // Notification helper
  const notify = useCallback(
    (text: string, type: 'success' | 'info' | 'warning' | 'error' = 'info', action?: ToastAction) => {
      onShowToast?.(text, type, action);
    },
    [onShowToast]
  );

  // Custom parts library loaded from storage (IndexedDB, with migration from LocalStorage)
  const [parts, setParts] = useState<CustomPart[]>(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_PARTS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const sanitized = sanitizeCustomParts(parsed);
        if (sanitized.length > 0) return sanitized;
      }
    } catch {
      // ignore
    }
    // 保存データが一度もない初回起動時にだけ既定パーツを表示する。
    // ユーザーが全件削除した場合は初期化済みフラグが立っているため空のままにする。
    if (isCustomPartsInitialized()) return [];
    return buildDefaultCustomParts();
  });

  const [selectedPartId, setSelectedPartId] = useState<string>(() => parts[0]?.id || '');

  // 最新の parts を常に参照するための ref（遅延保存と閉じる時の即時保存で使う）
  const partsRef = useRef<CustomPart[]>(parts);
  const lastSavedStudioJsonRef = useRef<string>('');
  // 初回読み込みが終わるまで保存を行わないためのフラグ。
  // 読み込み前に既定パーツで IndexedDB を上書きしないようにする。
  const initialLoadDoneRef = useRef<boolean>(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveInFlightRef = useRef<boolean>(false);
  const deletedPartRef = useRef<{ part: CustomPart; index: number } | null>(null);
  const deletedPartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    partsRef.current = parts;
  }, [parts]);

  // Load custom parts from IndexedDB (with migration from LocalStorage-only data)
  const loadPartsFromStorage = useCallback(async () => {
    try {
      const loaded = await loadCustomParts();
      if (saveTimerRef.current !== null || saveInFlightRef.current) {
        // 未保存の編集がある場合は読み込みで上書きしない。
        // 遅延保存が完了すれば保存成功時にイベントが届き、改めて読み込む。
        return;
      }
      if (Array.isArray(loaded) && loaded.length > 0) {
        lastSavedStudioJsonRef.current = JSON.stringify(loaded);
        setParts(loaded);
        setSelectedPartId((curr) =>
          loaded.some((p) => p.id === curr) ? curr : loaded[0]?.id || ''
        );
      } else if (isCustomPartsInitialized()) {
        // ユーザーが全件削除した状態。既定パーツを復元しない。
        lastSavedStudioJsonRef.current = '[]';
        setParts([]);
        setSelectedPartId('');
      } else {
        // 初回起動。現在の表示内容（既定パーツ）を保存済みとみなし、
        // 読み込み直後の不要な書き戻しを行わない。
        lastSavedStudioJsonRef.current = JSON.stringify(partsRef.current);
      }
    } catch {
      // ignore
    } finally {
      initialLoadDoneRef.current = true;
    }
  }, []);

  useEffect(() => {
    loadPartsFromStorage();
  }, [loadPartsFromStorage]);

  // Reload when custom parts change elsewhere (drawer, canvas toolbar)
  useEffect(() => {
    const handleSync = () => {
      loadPartsFromStorage();
    };
    window.addEventListener('font_custom_parts_updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('font_custom_parts_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [loadPartsFromStorage]);

  const persistParts = useCallback(
    async (nextParts: CustomPart[]) => {
      saveInFlightRef.current = true;
      try {
        const result = await saveCustomParts(nextParts);
        if (!result.ok) {
          notify(
            `カスタムパーツの保存に失敗しました（${result.fallbackDroppedCount}件を保存できませんでした）`,
            'error'
          );
        } else if (result.fallbackSavedCount > 0) {
          notify('カスタムパーツをブラウザ保存に退避しました', 'warning');
        }
      } finally {
        saveInFlightRef.current = false;
      }
    },
    [notify]
  );

  // Persist parts to IndexedDB with debouncing to avoid disk I/O on rapid edits
  useEffect(() => {
    if (!initialLoadDoneRef.current) return;
    const json = JSON.stringify(parts);
    if (json === lastSavedStudioJsonRef.current) return;
    lastSavedStudioJsonRef.current = json;
    if (saveTimerRef.current !== null) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      void persistParts(parts);
    }, 500);
    return () => {
      if (saveTimerRef.current !== null) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [parts, persistParts]);

  // Save immediately, cancelling any pending debounced save.
  // Called when the modal closes and when this hook unmounts.
  const flushSaveParts = useCallback(async () => {
    if (!initialLoadDoneRef.current) return;
    if (saveTimerRef.current !== null) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const current = partsRef.current;
    lastSavedStudioJsonRef.current = JSON.stringify(current);
    await persistParts(current);
  }, [persistParts]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current !== null) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      if (deletedPartTimerRef.current !== null) {
        clearTimeout(deletedPartTimerRef.current);
        deletedPartTimerRef.current = null;
      }
      // アンマウント時に遅延中の保存が残っていれば即座に保存する
      if (initialLoadDoneRef.current) {
        void saveCustomParts(partsRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activePart = useMemo(() => {
    const found = parts.find((p) => p && p.id === selectedPartId) || parts[0] || null;
    if (!found) return null;
    return {
      ...found,
      contours: Array.isArray(found.contours) ? found.contours : [],
    };
  }, [parts, selectedPartId]);

  const hasActiveContours = Boolean(activePart && activePart.contours && activePart.contours.length > 0);

  // Tabs & Search
  const [leftSidebarTab, setLeftSidebarTab] = useState<'presets' | 'kanji_db' | 'custom'>('presets');
  const [activeCategory, setActiveCategory] = useState<PartCategory>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [kanjiDbCategory, setKanjiDbCategory] = useState<string>('all');
  const [kanjiDbSearch, setKanjiDbSearch] = useState<string>('');
  const [selectedRadicalDbId, setSelectedRadicalDbId] = useState<string>('rad_ninben');
  const [selectedFontStyle, setSelectedFontStyle] = useState<FontStyleOption>(RADICAL_FONT_OPTIONS[0]);
  const [isLoadingPreset, setIsLoadingPreset] = useState<boolean>(false);
  const [isImportingAll, setIsImportingAll] = useState<boolean>(false);
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState<boolean>(false);

  // Editor Tools & Viewport
  const [toolMode, setToolMode] = useState<ToolMode>('select');
  const [brushWidth, setBrushWidth] = useState<number>(36);
  const [brushStyle, setBrushStyle] = useState<BrushStyle>('brush');
  const [pressureSensitivity, setPressureSensitivity] = useState<'high' | 'normal' | 'low' | 'off'>('normal');
  const [isStraightMode, setIsStraightMode] = useState<boolean>(false);
  const [isAutoUnionMode, setIsAutoUnionMode] = useState<boolean>(true);
  const [showPenShortcutsHelp, setShowPenShortcutsHelp] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(0.55);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 200, y: 140 });

  // Guide Overlays
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showKanjiGuides, setShowKanjiGuides] = useState<boolean>(true);
  const [isWireframeMode, setIsWireframeMode] = useState<boolean>(false);
  const [showNineBoxes, setShowNineBoxes] = useState<boolean>(false);
  const [showMetrics, setShowMetrics] = useState<boolean>(true);
  const [showWatermark, setShowWatermark] = useState<boolean>(true);
  const [watermarkChar, setWatermarkChar] = useState<string>(selectedChar || '休');
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(0.18);
  const [watermarkScale, setWatermarkScale] = useState<number>(1.0);
  const [showWatermarkPicker, setShowWatermarkPicker] = useState<boolean>(false);

  // Snapping
  const [isSnapEnabled, setIsSnapEnabled] = useState<boolean>(true);
  const [activeSnapLines, setActiveSnapLines] = useState<{ x: number | null; y: number | null }>({ x: null, y: null });

  // Batch insertion states
  const [insertMode, setInsertMode] = useState<'single' | 'batch'>('single');
  const [batchCharsInput, setBatchCharsInput] = useState<string>('');
  const [selectedBatchChars, setSelectedBatchChars] = useState<string[]>([]);
  const [insertingPresetId, setInsertingPresetId] = useState<string | null>(null);

  // Active Drawing / Selection
  const [selectedContourId, setSelectedContourId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isSpacePressed, setIsSpacePressed] = useState<boolean>(false);

  // Undo / Redo history stacks
  const [undoStack, setUndoStack] = useState<PathContour[][]>([]);
  const [redoStack, setRedoStack] = useState<PathContour[][]>([]);

  // Eraser tool settings
  const [eraserMode, setEraserMode] = useState<'stroke' | 'cut' | 'node'>('stroke');
  const [eraserRadius, setEraserRadius] = useState<number>(24);

  // Insertion & Extraction
  const [targetChar, setTargetChar] = useState<string>(selectedChar || '休');
  const [insertPlacement, setInsertPlacement] = useState<RadicalPlacement>('original');
  const [showExtractModal, setShowExtractModal] = useState<boolean>(false);
  const [extractSearch, setExtractSearch] = useState<string>('');

  // UI Panels
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState<boolean>(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState<boolean>(true);
  const [rightTab, setRightTab] = useState<'transform' | 'compose'>('transform');
  const [mobileSheetSnap, setMobileSheetSnap] = useState<MobileSheetSnap>('peek');
  const [mobileSheetTab, setMobileSheetTab] = useState<MobileSheetTab>('radicals');

  // History management
  const commitPartChange = useCallback(
    (newContours: PathContour[]) => {
      if (!activePart) return;
      setUndoStack((prev) => [...prev.slice(-25), activePart.contours]);
      setRedoStack([]);
      setParts((prev) =>
        prev.map((p) =>
          p.id === activePart.id
            ? { ...p, contours: newContours, updatedAt: Date.now() }
            : p
        )
      );
    },
    [activePart]
  );

  const handleUndo = useCallback(() => {
    if (!activePart || undoStack.length === 0) return;
    const prevContours = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, prev.length - 1));
    setRedoStack((prev) => [...prev, activePart.contours]);
    setParts((prev) =>
      prev.map((p) =>
        p.id === activePart.id
          ? { ...p, contours: prevContours, updatedAt: Date.now() }
          : p
      )
    );
  }, [activePart, undoStack]);

  const handleRedo = useCallback(() => {
    if (!activePart || redoStack.length === 0) return;
    const nextContours = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, prev.length - 1));
    setUndoStack((prev) => [...prev, activePart.contours]);
    setParts((prev) =>
      prev.map((p) =>
        p.id === activePart.id
          ? { ...p, contours: nextContours, updatedAt: Date.now() }
          : p
      )
    );
  }, [activePart, redoStack]);

  // Create New Part
  const handleCreateNewPart = useCallback((category: PartCategory = 'hen') => {
    const newId = generateId();
    setParts((prev) => {
      const newPart: CustomPart = {
        id: newId,
        name: makeUniquePartName('新規パーツ', prev.map((p) => p.name)),
        category: category === 'all' ? 'hen' : category,
        description: '',
        contours: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      return [newPart, ...prev];
    });
    setSelectedPartId(newId);
    notify('新しいパーツを作成しました', 'success');
  }, [notify]);

  // Duplicate Part
  const handleDuplicatePart = useCallback((part: CustomPart, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newId = generateId();
    const clonedContours: PathContour[] = part.contours.map((c) => ({
      ...c,
      id: generateId(),
      nodes: c.nodes.map((n) => ({
        ...n,
        id: generateId(),
        handleIn: n.handleIn ? { ...n.handleIn } : null,
        handleOut: n.handleOut ? { ...n.handleOut } : null,
      })),
    }));

    const cloned: CustomPart = {
      ...part,
      id: newId,
      name: '',
      contours: clonedContours,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setParts((prev) => {
      const named: CustomPart = {
        ...cloned,
        name: makeUniquePartName(`${part.name} (コピー)`, prev.map((p) => p.name)),
      };
      return [named, ...prev];
    });
    setSelectedPartId(newId);
    notify(`「${part.name}」を複製しました`, 'success');
  }, [notify]);

  // Part pending deletion confirmation (shown in a confirm dialog by the modal)
  const [pendingDeletePart, setPendingDeletePart] = useState<CustomPart | null>(null);

  const restoreDeletedPart = useCallback(() => {
    const deleted = deletedPartRef.current;
    if (!deleted) return;
    deletedPartRef.current = null;
    if (deletedPartTimerRef.current !== null) {
      clearTimeout(deletedPartTimerRef.current);
      deletedPartTimerRef.current = null;
    }
    setParts((prev) => {
      if (prev.some((p) => p.id === deleted.part.id)) return prev;
      const next = [...prev];
      next.splice(Math.min(deleted.index, next.length), 0, deleted.part);
      return next;
    });
    setSelectedPartId(deleted.part.id);
    notify(`「${deleted.part.name}」を復元しました`, 'success');
  }, [notify]);

  // Request Part deletion: show a confirmation dialog instead of deleting immediately.
  // The last remaining part cannot be deleted.
  const handleDeletePart = useCallback((id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const target = parts.find((p) => p.id === id);
    if (!target) return;
    if (parts.length <= 1) {
      notify('最後のパーツは削除できません', 'warning');
      return;
    }
    setPendingDeletePart(target);
  }, [parts, notify]);

  const cancelDeletePart = useCallback(() => {
    setPendingDeletePart(null);
  }, []);

  // Confirm Part deletion. All side effects run outside the setParts updater.
  const confirmDeletePart = useCallback(() => {
    const target = pendingDeletePart;
    if (!target) return;
    setPendingDeletePart(null);
    const index = parts.findIndex((p) => p.id === target.id);
    const removedIndex = index >= 0 ? index : 0;
    const remaining = parts.filter((p) => p.id !== target.id);
    setParts(remaining);
    if (selectedPartId === target.id) {
      setSelectedPartId(remaining[0]?.id || '');
    }
    deletedPartRef.current = { part: target, index: removedIndex };
    if (deletedPartTimerRef.current !== null) {
      clearTimeout(deletedPartTimerRef.current);
    }
    deletedPartTimerRef.current = setTimeout(() => {
      deletedPartRef.current = null;
      deletedPartTimerRef.current = null;
    }, 5000);
    notify(`「${target.name}」を削除しました`, 'info', {
      label: '取り消す',
      onAction: () => restoreDeletedPart(),
    });
  }, [pendingDeletePart, parts, selectedPartId, notify, restoreDeletedPart]);

  // Magnetic guide & grid snapping helper
  const snapToGuides = useCallback(
    (pos: Point, snapDist = 12): { point: Point; snapX: number | null; snapY: number | null } => {
      if (!isSnapEnabled) {
        return { point: pos, snapX: null, snapY: null };
      }

      const keyXLines = [500, 460, 540, 333, 667];
      const keyYLines = [500, 380, 620, 333, 667];

      let snappedX = pos.x;
      let activeSnapX: number | null = null;
      let minDistX = snapDist;

      for (const lx of keyXLines) {
        const d = Math.abs(pos.x - lx);
        if (d < minDistX) {
          minDistX = d;
          snappedX = lx;
          activeSnapX = lx;
        }
      }

      if (activeSnapX === null && showGrid) {
        const gridX = Math.round(pos.x / 25) * 25;
        if (Math.abs(pos.x - gridX) < snapDist) {
          snappedX = gridX;
          activeSnapX = gridX;
        }
      }

      let snappedY = pos.y;
      let activeSnapY: number | null = null;
      let minDistY = snapDist;

      for (const ly of keyYLines) {
        const d = Math.abs(pos.y - ly);
        if (d < minDistY) {
          minDistY = d;
          snappedY = ly;
          activeSnapY = ly;
        }
      }

      if (activeSnapY === null && showGrid) {
        const gridY = Math.round(pos.y / 25) * 25;
        if (Math.abs(pos.y - gridY) < snapDist) {
          snappedY = gridY;
          activeSnapY = gridY;
        }
      }

      return {
        point: { x: snappedX, y: snappedY },
        snapX: activeSnapX,
        snapY: activeSnapY,
      };
    },
    [isSnapEnabled, showGrid]
  );

  return {
    parts,
    setParts,
    selectedPartId,
    setSelectedPartId,
    activePart,
    hasActiveContours,
    leftSidebarTab,
    setLeftSidebarTab,
    activeCategory,
    setActiveCategory,
    searchQuery,
    setSearchQuery,
    kanjiDbCategory,
    setKanjiDbCategory,
    kanjiDbSearch,
    setKanjiDbSearch,
    selectedRadicalDbId,
    setSelectedRadicalDbId,
    selectedFontStyle,
    setSelectedFontStyle,
    isLoadingPreset,
    setIsLoadingPreset,
    isImportingAll,
    setIsImportingAll,
    isLicenseModalOpen,
    setIsLicenseModalOpen,
    toolMode,
    setToolMode,
    brushWidth,
    setBrushWidth,
    brushStyle,
    setBrushStyle,
    pressureSensitivity,
    setPressureSensitivity,
    isStraightMode,
    setIsStraightMode,
    isAutoUnionMode,
    setIsAutoUnionMode,
    showPenShortcutsHelp,
    setShowPenShortcutsHelp,
    zoom,
    setZoom,
    pan,
    setPan,
    showGrid,
    setShowGrid,
    showKanjiGuides,
    setShowKanjiGuides,
    isWireframeMode,
    setIsWireframeMode,
    showNineBoxes,
    setShowNineBoxes,
    showMetrics,
    setShowMetrics,
    showWatermark,
    setShowWatermark,
    watermarkChar,
    setWatermarkChar,
    watermarkOpacity,
    setWatermarkOpacity,
    watermarkScale,
    setWatermarkScale,
    showWatermarkPicker,
    setShowWatermarkPicker,
    isSnapEnabled,
    setIsSnapEnabled,
    activeSnapLines,
    setActiveSnapLines,
    insertMode,
    setInsertMode,
    batchCharsInput,
    setBatchCharsInput,
    selectedBatchChars,
    setSelectedBatchChars,
    insertingPresetId,
    setInsertingPresetId,
    selectedContourId,
    setSelectedContourId,
    selectedNodeId,
    setSelectedNodeId,
    isSpacePressed,
    setIsSpacePressed,
    undoStack,
    setUndoStack,
    redoStack,
    setRedoStack,
    eraserMode,
    setEraserMode,
    eraserRadius,
    setEraserRadius,
    targetChar,
    setTargetChar,
    insertPlacement,
    setInsertPlacement,
    showExtractModal,
    setShowExtractModal,
    extractSearch,
    setExtractSearch,
    isFullscreen,
    setIsFullscreen,
    isLeftSidebarOpen,
    setIsLeftSidebarOpen,
    isRightSidebarOpen,
    setIsRightSidebarOpen,
    rightTab,
    setRightTab,
    mobileSheetSnap,
    setMobileSheetSnap,
    mobileSheetTab,
    setMobileSheetTab,
    notify,
    commitPartChange,
    handleUndo,
    handleRedo,
    handleCreateNewPart,
    handleDuplicatePart,
    handleDeletePart,
    pendingDeletePart,
    confirmDeletePart,
    cancelDeletePart,
    flushSaveParts,
    snapToGuides,
  };
}
