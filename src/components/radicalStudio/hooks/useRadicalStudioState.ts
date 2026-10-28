import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  CustomPart,
  PartCategory,
  PathContour,
  ToolMode,
  BrushStyle,
  RadicalPlacement,
  Point,
} from '../../../types';
import { generateId } from '../../../utils/pathUtils';
import { KANJI_RADICALS } from '../../../data/kanjiRadicals';
import {
  RADICAL_FONT_OPTIONS,
  FontStyleOption,
} from '../../../utils/radicalExtractor';
import {
  CUSTOM_PARTS_STORAGE_KEY,
  sanitizeCustomParts,
} from '../types';
import { MobileSheetTab, MobileSheetSnap } from '../RadicalMobileDrawer';

interface UseRadicalStudioStateProps {
  selectedChar: string;
  onShowToast?: (text: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export function useRadicalStudioState({
  selectedChar,
  onShowToast,
}: UseRadicalStudioStateProps) {
  // Notification helper
  const notify = useCallback(
    (text: string, type: 'success' | 'info' | 'warning' | 'error' = 'info') => {
      onShowToast?.(text, type);
    },
    [onShowToast]
  );

  // Custom parts library loaded from storage
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
    return [
      {
        id: generateId(),
        name: 'さんずい (氵)',
        category: 'hen',
        description: '三水・水に関する偏',
        contours: KANJI_RADICALS.find((r) => r.id === 'rad_sanzui')?.contours || [],
        createdAt: Date.now() - 5000,
      },
      {
        id: generateId(),
        name: 'きへん (木)',
        category: 'hen',
        description: '木偏・樹木に関する偏',
        contours: KANJI_RADICALS.find((r) => r.id === 'rad_kihen')?.contours || [],
        createdAt: Date.now() - 4000,
      },
      {
        id: generateId(),
        name: 'にんべん (亻)',
        category: 'hen',
        description: '人偏・人間に関する偏',
        contours: KANJI_RADICALS.find((r) => r.id === 'rad_ninben')?.contours || [],
        createdAt: Date.now() - 3000,
      },
      {
        id: generateId(),
        name: 'ごんべん (言)',
        category: 'hen',
        description: '言偏・言葉に関する偏',
        contours: KANJI_RADICALS.find((r) => r.id === 'rad_gonben')?.contours || [],
        createdAt: Date.now() - 2000,
      },
      {
        id: generateId(),
        name: 'くさかんむり (艹)',
        category: 'kanmuri',
        description: '草冠・植物に関する冠',
        contours: KANJI_RADICALS.find((r) => r.id === 'rad_kusakanmuri')?.contours || [],
        createdAt: Date.now() - 1000,
      },
    ];
  });

  const [selectedPartId, setSelectedPartId] = useState<string>(() => parts[0]?.id || '');

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
  const handleCreateNewPart = (category: PartCategory = 'hen') => {
    const newId = generateId();
    const newPart: CustomPart = {
      id: newId,
      name: `新規パーツ_${parts.length + 1}`,
      category: category === 'all' ? 'hen' : category,
      description: '',
      contours: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setParts((prev) => [newPart, ...prev]);
    setSelectedPartId(newId);
    notify('新しいパーツを作成しました', 'success');
  };

  // Duplicate Part
  const handleDuplicatePart = (part: CustomPart, e?: React.MouseEvent) => {
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
      name: `${part.name} (コピー)`,
      contours: clonedContours,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setParts((prev) => [cloned, ...prev]);
    setSelectedPartId(newId);
    notify(`「${part.name}」を複製しました`, 'success');
  };

  // Delete Part
  const handleDeletePart = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const target = parts.find((p) => p.id === id);
    if (!target) return;
    if (parts.length <= 1) {
      notify('最後のパーツは削除できません', 'warning');
      return;
    }
    setParts((prev) => prev.filter((p) => p.id !== id));
    if (selectedPartId === id) {
      const remaining = parts.filter((p) => p.id !== id);
      setSelectedPartId(remaining[0]?.id || '');
    }
    notify(`「${target.name}」を削除しました`, 'info');
  };

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
    snapToGuides,
  };
}
