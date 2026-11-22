/**
 * GlyphCanvas Component
 * State Ownership & Source of Truth:
 * - Contours: `props.contours` is the authoritative source of truth (controlled).
 *   `contoursRef.current` is synchronized via effects and commit handlers to eliminate stale closures.
 * - Outline Mode: `props.outlineOnly` is authoritative if provided.
 *   `internalOutlineOnly` acts as an uncontrolled fallback or local cache synchronized to storageKeys.
 * - Callbacks: `onChangeContours` and `onCommitHistory` are tracked via mutable refs to prevent stale closure bugs in long pointer sessions.
 */
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  PathContour,
  Point,
  BrushStyle,
  SnapGuideLine,
} from '../types';
import {
  isLightTheme,
  getThemeClasses,
} from '../utils/theme';
import { useBrushDrawing } from '../hooks/useBrushDrawing';
import { useNodeEditing } from '../hooks/useNodeEditing';
import { CanvasSubToolbar } from './canvas/overlays/CanvasSubToolbar';
import { CanvasFloatingOverlays } from './canvas/overlays/CanvasFloatingOverlays';
import { CanvasStatusBar } from './canvas/overlays/CanvasStatusBar';
import { CanvasSvgStage } from './canvas/CanvasSvgStage';
import { CanvasContextMenu } from './canvas/CanvasContextMenu';
import {
  useCanvasShortcuts,
  useContourTransforms,
  useTransformSession,
  useCanvasViewport,
  useShapeCreation,
  isShapeToolMode,
  useRulerMeasure,
  usePenTool,
  useCanvasEraser,
  useCustomGuidelines,
  useTraceTransform,
  useCanvasPointerDispatcher,
  useCanvasLocalPrefs,
  useCanvasNativeGestures,
  useToolModeCleanup,
  useCanvasContourActions,
} from './canvas/hooks';

const NOOP_CHANGE_GRID_SETTINGS: React.Dispatch<React.SetStateAction<import('../types').GridSettings>> = () => {};

import {
  HIGH_CONTRAST_GRAB_CURSOR,
  HIGH_CONTRAST_GRABBING_CURSOR,
  HIGH_CONTRAST_PEN_CURSOR,
  HIGH_CONTRAST_NODE_CURSOR,
  HIGH_CONTRAST_ANCHOR_ERASER_CURSOR,
  HIGH_CONTRAST_ERASER_CURSOR,
  HIGH_CONTRAST_CROSSHAIR_CURSOR,
} from './canvas/cursors';
import { GlyphCanvasProps } from './canvas/glyphCanvasTypes';
import { hitTestContours } from './canvas/canvasHitTest';
import { getInkColors } from './canvas/glyphCanvasConstants';
import { resolveCanvasMetrics } from '../utils/font/constants';
export type { GlyphCanvasProps };

export const GlyphCanvas: React.FC<GlyphCanvasProps> = React.memo(({
  contours,
  onChangeContours,
  advanceWidth,
  lsb,
  onChangeAdvanceWidth,
  onChangeLsb,
  toolMode,
  onSetToolMode,
  brushWidth,
  brushStyle = 'brush' as BrushStyle,
  onChangeBrushStyle,
  onChangeBrushWidth,
  onAdjustBrushSize,
  autoSmoothBrush: propAutoSmoothBrush,
  onChangeAutoSmoothBrush,
  smoothStrength: propSmoothStrength,
  onChangeSmoothStrength,
  smoothPreserveCorners: propSmoothPreserveCorners,
  onChangeSmoothPreserveCorners,
  autoUnionBrush: propAutoUnionBrush,
  onChangeAutoUnionBrush,
  onRegisterResetCanvasPrefs,
  pressureSensitivity = 'high' as 'high' | 'normal' | 'low' | 'off',
  onChangePressureSensitivity,
  pressureCurve,
  smoothingIntensity = 50,
  onChangeSmoothingIntensity,
  traceSettings,
  onChangeTraceSettings,
  selectedUnicode,
  gridSettings,
  onChangeGridSettings,
  activeChar,
  onCommitHistory,
  theme,
  onSelectPrevGlyph,
  onSelectNextGlyph,
  onSelectPrevUncompletedGlyph,
  onSelectNextUncompletedGlyph,
  isGlyphLocked = false,
  onCopyFromChar,
  onGenerateDakutenTarget,
  onDuplicateAsSmallKana,
  onOpenGlyphSynthesisModal,
  onCopySelectedContours,
  onPasteSelectedContours,
  hasClipboard = false,
  onToggleGridDrawer,
  showGridDrawer,
  onToggleMetricsDrawer,
  showMetricsDrawer,
  onToggleRadicals,
  showRadicals,
  onToggleZenMode,
  isZenMode = false,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  onOpenPenPresetsModal,
  activePenPreset,
  isAnyModalOpen = false,
  overlaySettings,
  project,
  onOpenGlyphCompareModal,
  outlineOnly: propOutlineOnly,
  onChangeOutlineOnly,
  onSelectionChange,
}) => {
  const onUndoRef = useRef(onUndo);
  onUndoRef.current = onUndo;
  const onRedoRef = useRef(onRedo);
  onRedoRef.current = onRedo;
  const onChangeContoursRef = useRef(onChangeContours);
  onChangeContoursRef.current = onChangeContours;
  const onCommitHistoryRef = useRef(onCommitHistory);
  onCommitHistoryRef.current = onCommitHistory;

  const contoursRef = useRef<PathContour[]>(contours);

  const isLight = isLightTheme(theme);
  const themeClasses = getThemeClasses(theme);
  const selectionColor = themeClasses.selectionStroke || '#10b981';

  const { fill: inkFillColor } = useMemo(
    () => getInkColors(theme, isLight),
    [theme, isLight]
  );

  const upm = project?.metadata?.unitsPerEm || 1000;

  // Local preferences hook
  const {
    penMode,
    setPenMode,
    showNodes,
    setShowNodes,
    nodeStyle,
    setNodeStyle,
    isOutlineMode,
    setOutlineOnly,
    showGuideAssist,
    setShowGuideAssist,
    handleToggleGuideAssist,
    showSubToolbar,
    setShowSubToolbar,
    handleToggleSubToolbar,
    autoSmoothBrush,
    setAutoSmoothBrush,
    autoUnionBrush,
    setAutoUnionBrush,
    autoResolveBrushOverlap,
    setAutoResolveBrushOverlap,
    smoothStrength,
    setSmoothStrength,
    smoothPreserveCorners,
    setSmoothPreserveCorners,
    resetCanvasLocalPrefs,
    palmRejectionMode,
    setPalmRejectionMode,
    handleSetPalmRejectionMode,
    isMobileFocusMode,
    setIsMobileFocusMode,
    isMobileAuxMenuOpen,
    setIsMobileAuxMenuOpen,
    showMobilePartSheet,
    setShowMobilePartSheet,
    showMobileBrushSheet,
    setShowMobileBrushSheet,
    showMobileGuidesSheet,
    setShowMobileGuidesSheet,
  } = useCanvasLocalPrefs({
    propOutlineOnly,
    onChangeOutlineOnly,
    propAutoSmoothBrush,
    onChangeAutoSmoothBrush,
    propSmoothStrength,
    onChangeSmoothStrength,
    propSmoothPreserveCorners,
    onChangeSmoothPreserveCorners,
    propAutoUnionBrush,
    onChangeAutoUnionBrush,
  });

  // Zoom & Pan Viewport State
  const {
    containerRef,
    getContainerRectFast,
    invalidateContainerRect,
    zoom,
    setZoom,
    zoomRef,
    pan,
    setPan,
    panRef,
    panStartRef,
    isPanning,
    setIsPanning,
    clampPan,
    resetView,
    handleZoomStep,
    screenToCanvas,
  } = useCanvasViewport({ upm, showRulers: gridSettings.showRulers !== false });

  const canvasGroupRef = useRef<SVGGElement | null>(null);

  const [isStylusActive, setIsStylusActive] = useState<boolean>(false);
  const [liveStylusPressure, setLiveStylusPressure] = useState<number | null>(null);
  const [marqueeSelection, setMarqueeSelection] = useState<{ start: Point; current: Point } | null>(null);
  const [showShapePickerDropdown, setShowShapePickerDropdown] = useState<boolean>(false);
  const shapePickerRef = useRef<HTMLDivElement>(null);
  const [showQuickGridSlider, setShowQuickGridSlider] = useState<boolean>(false);
  const quickGridSliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (shapePickerRef.current && !shapePickerRef.current.contains(e.target as Node)) {
        setShowShapePickerDropdown(false);
      }
      if (quickGridSliderRef.current && !quickGridSliderRef.current.contains(e.target as Node)) {
        setShowQuickGridSlider(false);
      }
    };
    if (showShapePickerDropdown || showQuickGridSlider) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showShapePickerDropdown, showQuickGridSlider]);

  // Dragging metrics guide lines
  const [draggingMetric, setDraggingMetric] = useState<'lsb' | 'rsb' | null>(null);

  // Spacebar Hand/Pan navigation state
  const [isSpacePressed, setIsSpacePressed] = useState<boolean>(false);

  const [canvasToast, setCanvasToast] = useState<{ message: string; subText?: string; id: number } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showCanvasToast = useCallback((message: string, subText?: string) => {
    const id = Date.now();
    setCanvasToast({ message, subText, id });
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => {
      setCanvasToast((curr) => (curr?.id === id ? null : curr));
      toastTimerRef.current = null;
    }, 3200);
  }, []);

  // Throttled RAF references for ultra-smooth 60fps canvas operations
  const generalCrosshairRef = useRef<SVGGElement | null>(null);
  const eraserReticleRef = useRef<SVGGElement | null>(null);
  const drawingReticleRef = useRef<SVGGElement | null>(null);
  const eraseRafRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (eraseRafRef.current != null) cancelAnimationFrame(eraseRafRef.current);
    };
  }, []);

  // Active Smart Snap Guidelines
  const [activeSnapGuides, setActiveSnapGuides] = useState<SnapGuideLine[]>([]);
  const isShapeTool = isShapeToolMode(toolMode);

  // Custom Guidelines Hook
  const {
    customGuidelines,
    setCustomGuidelines,
    lockGuidelines,
    setLockGuidelines,
    draggingGuidelineId,
    setDraggingGuidelineId,
    newGuidelineType,
    setNewGuidelineType,
    isGuideEraserActive,
    setIsGuideEraserActive,
    handleDeleteGuideline,
    handleClearAllGuidelines,
    handlePointerDownGuide,
    handleDoubleClickGuide,
    updateDraggingGuideline,
  } = useCustomGuidelines({
    upm,
    toolMode,
    isShapeTool,
    showCanvasToast,
  });

  // Dynamic snap metrics calculated from project metadata and font canvas UPM
  const snapMetrics = useMemo(() => {
    const resolved = resolveCanvasMetrics(project?.metadata, upm);
    return {
      lsb,
      advanceWidth,
      baseline: resolved.baselineY,
      ascender: resolved.ascenderY,
      capHeight: resolved.capHeightY,
      xHeight: resolved.xHeightY,
      descender: resolved.descenderY,
      upm: resolved.upm,
    };
  }, [
    lsb,
    advanceWidth,
    upm,
    project?.metadata?.ascender,
    project?.metadata?.descender,
    project?.metadata?.capHeight,
    project?.metadata?.xHeight,
  ]);

  const {
    rulerMeasurement,
    setRulerMeasurement,
    brushStraightMode,
    setBrushStraightMode,
    handleRulerPointerDown,
    handleRulerPointerMove,
    handleRulerPointerUp,
    handleCreateGuidelineFromRuler,
  } = useRulerMeasure({
    contours,
    snapMetrics,
    customGuidelines,
    setCustomGuidelines,
    gridSettings,
    zoom,
    setActiveSnapGuides,
    showCanvasToast,
  });
  const handleConvertRulerToGuideline = handleCreateGuidelineFromRuler;

  const handleDeleteSelectedRef = useRef<() => void>(() => {});

  const {
    brushStrokePointsRef,
    activeBrushPathRef,
    activeBrushSvgDRef,
    resetBrushDrawing,
    finalizeBrushDrawing,
    handleBrushPointerDown,
    handleBrushPointerMove,
    handleBrushPointerUp,
  } = useBrushDrawing({
    toolMode,
    brushWidth,
    brushStyle,
    pressureSensitivity,
    pressureCurve,
    smoothingIntensity,
    autoSmoothBrush,
    smoothStrength,
    activePenPreset,
    brushStraightMode,
    customGuidelines,
    screenToCanvas,
    contoursRef,
    onChangeContours,
    onCommitHistory,
    setIsStylusActive,
    isStylusActive,
    onPressureUpdate: setLiveStylusPressure,
  });

  const {
    selectedContourIds,
    setSelectedContourIds,
    selectedContourId,
    setSelectedContourId,
    selectedNodeIds,
    setSelectedNodeIds,
    selectedNodeId,
    setSelectedNodeId,
    selectedHandleType,
    setSelectedHandleType,
    touchLoupeState,
    setTouchLoupeState,
    nodeDragSessionRef,
    pendingContoursRef,
    startNodeOrHandleDrag,
    handleNodePointerDownOnCanvas,
    handleInsertNodeOnContour,
    handleNodeDragMove,
    handleNodeDragEnd,
    handleToggleNodeType,
    handleAddNodeToSelected,
    handleDeleteSelectedNode,
    handleNudgeSelectedNode,
    clearNodeSelection,
  } = useNodeEditing({
    toolMode,
    zoom,
    contours,
    contoursRef,
    onChangeContours,
    onCommitHistory,
    screenToCanvas,
    gridSettings,
    snapMetrics,
    customGuidelines,
    showCanvasToast,
    onDeleteSelectedContour: () => handleDeleteSelectedRef.current(),
    setActiveSnapGuides,
    isGlyphLocked,
  });

  // ---------------- PEN TOOL HOOK ----------------
  const {
    penStrokeWidth,
    handleSetPenStrokeWidth,
    handleResetPenStrokeWidth,
    penCapStyle,
    handleSetPenCapStyle,
    activePenContour,
    setActivePenContour,
    penMousePos,
    setPenMousePos,
    handleUndoPenNode,
    handleResetPenContour,
    handleFinishPenContour,
    penSvgPath,
  } = usePenTool({
    toolMode,
    contours,
    contoursRef,
    autoResolveBrushOverlap,
    containerRef,
    onChangeContours,
    onCommitHistory,
    showCanvasToast,
    setSelectedContourId,
    setSelectedContourIds,
    setSelectedNodeId,
    setSelectedHandleType,
    isGlyphLocked,
  });

  // Register the drawing-side reset (smoothing settings + pen stroke
  // width) so the pen presets modal can restore defaults through App.
  const resetCanvasPrefsRef = useRef<() => void>(() => {});
  resetCanvasPrefsRef.current = () => {
    resetCanvasLocalPrefs();
    handleResetPenStrokeWidth();
  };
  useEffect(() => {
    onRegisterResetCanvasPrefs?.(() => resetCanvasPrefsRef.current());
  }, [onRegisterResetCanvasPrefs]);

  // ---------------- CANVAS ERASER HOOK ----------------
  const {
    eraserSize,
    setEraserSize,
    eraserMode,
    setEraserMode,
    isErasingRef,
    lastErasePosRef,
    eraserStrokePointsRef,
    activeEraserPathRef,
    activeEraserSvgDRef,
    resetEraserVisuals,
    handleEraserPointerDown,
    handleEraserPointerMove,
    handleEraserPointerUp,
    handleEraserPointerCancel,
  } = useCanvasEraser({
    toolMode,
    contours,
    contoursRef,
    onChangeContours,
    onCommitHistory,
    onUndo,
    showCanvasToast,
    selectedContourIds,
    selectedContourId,
    selectedNodeId,
    setSelectedContourIds,
    setSelectedContourId,
    setSelectedNodeId,
  });

  // ---------------- SHAPE CREATION HOOK ----------------
  const {
    shapeStartPoint,
    shapeCurrentPoint,
    setShapeStartPoint,
    setShapeCurrentPoint,
    handleShapePointerDown,
    handleShapePointerMove,
    handleShapePointerUp,
    activeShapeContours,
    getShapeContoursFromPoints,
    isShiftLockRatio,
    setIsShiftLockRatio,
    isAltFromCenter,
    setIsAltFromCenter,
    reset: resetShapeCreation,
  } = useShapeCreation({
    toolMode,
    brushWidth,
    zoom,
    contours,
    contoursRef,
    snapMetrics,
    customGuidelines,
    gridSettings,
    onChangeContours,
    onCommitHistory,
    setActiveSnapGuides,
    setSelectedContourIds,
    setSelectedContourId,
  });

  // ---------------- TRANSFORMATION SESSION HOOK ----------------
  const {
    transformSession,
    setTransformSession,
    rotateDisplayAngle,
    handleTransformPointerDown,
    handleTransformPointerMove,
    handleTransformPointerUp,
    cancelTransformSession,
    pendingTransformContoursRef,
  } = useTransformSession({
    contours,
    contoursRef,
    selectedContourIds,
    screenToCanvas,
    onChangeContours,
    onCommitHistory,
    gridSettings,
    snapMetrics,
    customGuidelines,
    zoom,
    setActiveSnapGuides,
    isGlyphLocked,
    showCanvasToast,
  });

  const {
    handleDrawRulerAsStroke,
    handleClearAllContours,
    handleNudgeSelection,
    handleConvertToQuadraticSelected,
    handleConvertToCubicSelected,
    handleRegisterSelectedAsCustomPart,
    handleSelectAllNodes,
  } = useCanvasContourActions({
    contours,
    contoursRef,
    onChangeContours,
    onCommitHistory,
    brushWidth,
    rulerMeasurement,
    setRulerMeasurement,
    showCanvasToast,
    resetBrushDrawing,
    resetEraserVisuals,
    setActivePenContour,
    setShapeStartPoint,
    setShapeCurrentPoint,
    setTransformSession,
    setMarqueeSelection,
    setSelectedContourIds,
    setSelectedContourId,
    setSelectedNodeId,
    setSelectedNodeIds,
    setSelectedHandleType,
    setTouchLoupeState,
    setEraserMode,
    selectedContourIds,
    activeChar,
    handleNudgeSelectedNode,
    onSetToolMode,
    isGlyphLocked,
  });
  const handleClearAll = handleClearAllContours;

  const isAnyModalOpenRef = useRef(isAnyModalOpen);
  useEffect(() => { isAnyModalOpenRef.current = isAnyModalOpen; }, [isAnyModalOpen]);
  const toolModeRef = useRef(toolMode);
  useEffect(() => { toolModeRef.current = toolMode; }, [toolMode]);
  const brushWidthRef = useRef(brushWidth);
  useEffect(() => { brushWidthRef.current = brushWidth; }, [brushWidth]);
  const eraserSizeRef = useRef(eraserSize);
  useEffect(() => { eraserSizeRef.current = eraserSize; }, [eraserSize]);
  const onChangeBrushWidthRef = useRef(onChangeBrushWidth);
  useEffect(() => { onChangeBrushWidthRef.current = onChangeBrushWidth; }, [onChangeBrushWidth]);
  const onChangeTraceSettingsRef = useRef(onChangeTraceSettings);
  useEffect(() => { onChangeTraceSettingsRef.current = onChangeTraceSettings; }, [onChangeTraceSettings]);

  // Synchronize reticle elements immediately when showCursorCrosshair is turned off
  useEffect(() => {
    if (!gridSettings.showCursorCrosshair) {
      if (generalCrosshairRef.current) generalCrosshairRef.current.style.display = 'none';
      if (eraserReticleRef.current) eraserReticleRef.current.style.display = 'none';
      if (drawingReticleRef.current) drawingReticleRef.current.style.display = 'none';
    }
  }, [gridSettings.showCursorCrosshair]);

  // Trace Transform Hook
  const {
    isDraggingTrace,
    isResizingTrace,
    handlePointerDownTraceImage,
    handlePointerDownTraceResize,
    handleResetTracePosition,
    handleResetTraceAll,
    handleTracePointerMove,
    resetTraceDragState,
  } = useTraceTransform({
    upm,
    zoom,
    pan,
    containerRef,
    traceSettings,
    onChangeTraceSettings,
    activeChar,
    showCanvasToast,
  });

  // Keep selection state strictly in-sync with current contours
  useEffect(() => {
    contoursRef.current = contours;
    if (!contours || contours.length === 0) {
      if (activeBrushPathRef.current) {
        activeBrushPathRef.current.setAttribute('d', '');
      }
      activeBrushSvgDRef.current = '';
      resetEraserVisuals();
      brushStrokePointsRef.current = [];
      setSelectedContourIds((prev) => (prev.length === 0 ? prev : []));
      setSelectedNodeIds((prev) => (prev.length === 0 ? prev : []));
      setSelectedHandleType((prev) => (prev === null ? prev : null));
      return;
    }

    const validContourIds = new Set(contours.map((c) => c.id));
    const validNodeIds = new Set(contours.flatMap((c) => c.nodes.map((n) => n.id)));
    setSelectedContourIds((prev) => {
      if (prev.length === 0) return prev;
      const next = prev.filter((id) => validContourIds.has(id));
      return next.length === prev.length ? prev : next;
    });
    setSelectedNodeIds((prev) => {
      if (prev.length === 0) return prev;
      const next = prev.filter((id) => validNodeIds.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [contours, resetEraserVisuals, setSelectedContourIds, setSelectedHandleType, setSelectedNodeIds, activeBrushPathRef, activeBrushSvgDRef, brushStrokePointsRef]);



  const getCanvasCursor = useCallback(() => {
    const isReticleEnabled = gridSettings.showCursorCrosshair !== false;
    const isHighContrast = gridSettings.highContrastCursor !== false;

    if (isSpacePressed || toolMode === 'hand' || isPanning) {
      if (isReticleEnabled && isHighContrast) {
        return isPanning ? HIGH_CONTRAST_GRABBING_CURSOR : HIGH_CONTRAST_GRAB_CURSOR;
      }
      return isPanning ? 'grabbing' : 'grab';
    }

    if (!isReticleEnabled) {
      return 'default';
    }

    if (toolMode === 'pen' || toolMode === 'brush') {
      return isHighContrast ? HIGH_CONTRAST_PEN_CURSOR : 'crosshair';
    }
    if (toolMode === 'node') return isHighContrast ? HIGH_CONTRAST_NODE_CURSOR : 'default';
    if (toolMode === 'select') return isHighContrast ? HIGH_CONTRAST_NODE_CURSOR : 'default';
    if (toolMode === 'eraser') {
      if (eraserMode === 'node') {
        return isHighContrast ? HIGH_CONTRAST_ANCHOR_ERASER_CURSOR : 'crosshair';
      }
      return isHighContrast ? HIGH_CONTRAST_ERASER_CURSOR : 'crosshair';
    }
    if (isShapeTool || toolMode === 'ruler') {
      return isHighContrast ? HIGH_CONTRAST_CROSSHAIR_CURSOR : 'crosshair';
    }
    return 'default';
  }, [gridSettings.highContrastCursor, gridSettings.showCursorCrosshair, toolMode, eraserMode, isPanning, isSpacePressed, isShapeTool]);

  // Canvas right-click context menu state
  const [contextMenuState, setContextMenuState] = useState<{ x: number; y: number } | null>(null);

  // C2: right-click hit-tests the cursor position before opening the menu.
  // A hit contour becomes the selection; when several contours are already
  // selected, the selection is kept only when it contains the hit contour.
  // A blank area clears the selection so the no-selection menu opens.
  const handleCanvasContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const pos = screenToCanvas(e.clientX, e.clientY);
      const hitId = hitTestContours(contours, pos, Math.max(6, 10 / zoom));
      if (hitId) {
        setSelectedContourIds((prev) =>
          prev.length > 1 && prev.includes(hitId) ? prev : [hitId]
        );
        setSelectedContourId(hitId);
        setSelectedNodeId(null);
        setSelectedNodeIds([]);
      } else {
        setSelectedContourIds([]);
        setSelectedContourId(null);
        setSelectedNodeId(null);
        setSelectedNodeIds([]);
      }
      setContextMenuState({ x: e.clientX, y: e.clientY });
    },
    [screenToCanvas, contours, zoom, setSelectedContourIds, setSelectedContourId, setSelectedNodeId, setSelectedNodeIds]
  );

  const handleCloseContextMenu = useCallback(() => setContextMenuState(null), []);
  const handleTraceImageError = useCallback(
    () => showCanvasToast('下絵画像を読み込めませんでした', '画像ファイルを確認してください'),
    [showCanvasToast]
  );

  // ---------------- POINTER EVENT DISPATCHER ----------------
  const {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    clearHoverPos,
    isPenDrawingRef,
    lastPenActiveTimeRef,
    touchPointersRef,
    pointerTypesRef,
    isTwoFingerGestureRef,
    twoFingerCooldownUntilRef,
    activeDrawingPointerIdRef,
  } = useCanvasPointerDispatcher({
    zoom,
    pan,
    setZoom,
    setPan,
    zoomRef,
    panRef,
    screenToCanvas,
    resetView,
    containerRef,
    canvasGroupRef,
    getContainerRectFast,
    invalidateContainerRect,
    upm,
    clampPan,
    isSpacePressed,
    isPanning,
    setIsPanning,
    panStartRef,
    toolMode,
    isShapeTool,
    eraserMode,
    penMode,
    palmRejectionMode,
    isStylusActive,
    setIsStylusActive,
    setLiveStylusPressure,
    contours,
    contoursRef,
    selectedContourIds,
    setSelectedContourIds,
    selectedContourId,
    setSelectedContourId,
    selectedNodeId,
    setSelectedNodeId,
    selectedNodeIds,
    setSelectedNodeIds,
    selectedHandleType,
    setSelectedHandleType,
    marqueeSelection,
    setMarqueeSelection,
    setTouchLoupeState,
    lsb,
    advanceWidth,
    onChangeLsb,
    onChangeAdvanceWidth,
    draggingMetric,
    setDraggingMetric,
    handleBrushPointerDown,
    handleBrushPointerMove,
    handleBrushPointerUp,
    resetBrushDrawing,
    brushStrokePointsRef,
    activeBrushPathRef,
    handleNodePointerDownOnCanvas,
    handleNodeDragMove,
    handleNodeDragEnd,
    nodeDragSessionRef,
    shapeStartPoint,
    handleShapePointerDown,
    handleShapePointerMove,
    handleShapePointerUp,
    setShapeStartPoint,
    setShapeCurrentPoint,
    isErasingRef,
    lastErasePosRef,
    handleEraserPointerDown,
    handleEraserPointerMove,
    handleEraserPointerUp,
    handleEraserPointerCancel,
    eraserReticleRef,
    drawingReticleRef,
    generalCrosshairRef,
    resetEraserVisuals,
    activePenContour,
    setActivePenContour,
    penStrokeWidth,
    penCapStyle,
    autoResolveBrushOverlap,
    setPenMousePos,
    handleTransformPointerMove,
    handleTransformPointerUp,
    setTransformSession,
    cancelTransformSession,
    rulerMeasurement,
    handleRulerPointerDown,
    handleRulerPointerMove,
    handleRulerPointerUp,
    lockGuidelines,
    draggingGuidelineId,
    setDraggingGuidelineId,
    updateDraggingGuideline,
    isDraggingTrace,
    isResizingTrace,
    handleTracePointerMove,
    handleTraceAdjustPointerDown: handlePointerDownTraceImage,
    resetTraceDragState,
    traceSettings,
    onChangeTraceSettings,
    gridSettings,
    snapMetrics,
    customGuidelines,
    setActiveSnapGuides,
    onChangeContours,
    onCommitHistory,
    onUndo,
    onRedo,
    showCanvasToast,
    isGlyphLocked,
    isContextMenuOpen: contextMenuState !== null,
    onCloseContextMenu: handleCloseContextMenu,
  });

  const handleCopySelectedContextMenu = useMemo(
    () =>
      onCopySelectedContours
        ? () => onCopySelectedContours(selectedContourIds)
        : undefined,
    [onCopySelectedContours, selectedContourIds]
  );

  const handlePointerLeave = useCallback(() => {
    if (generalCrosshairRef.current) generalCrosshairRef.current.style.display = 'none';
    if (eraserReticleRef.current) eraserReticleRef.current.style.display = 'none';
    if (drawingReticleRef.current) drawingReticleRef.current.style.display = 'none';
    clearHoverPos();
  }, [clearHoverPos]);

  // Consolidated Tool Switch & Pointer Loss Cleanup
  const { handleLostPointerCapture } = useToolModeCleanup({
    toolMode,
    selectedUnicode,
    gridSettingsShowRulers: gridSettings?.showRulers,
    setShowMobilePartSheet,
    setMarqueeSelection,
    resetShapeCreation,
    resetEraserVisuals,
    setRulerMeasurement,
    cancelTransformSession,
    setActiveSnapGuides,
    setTouchLoupeState,
    resetBrushDrawing,
    finalizeBrushDrawing,
    setActivePenContour,
    setPenMousePos,
    setShapeStartPoint,
    setShapeCurrentPoint,
    setTransformSession,
    setSelectedContourIds,
    setSelectedNodeId,
    setSelectedHandleType,
    setDraggingMetric,
    setDraggingGuidelineId,
    activeBrushPathRef,
    activeBrushSvgDRef,
    pendingTransformContoursRef,
    isPenDrawingRef,
    isTwoFingerGestureRef,
    setIsPanning,
    resetTraceDragState,
    nodeDragSessionRef,
    drawingReticleRef,
    isErasingRef,
    activeDrawingPointerIdRef,
    handleNodeDragEnd,
    handleTransformPointerUp,
    handleEraserPointerUp,
  });

  const handleWindowPointerEndRef = useRef<(() => void) | undefined>(undefined);
  handleWindowPointerEndRef.current = handleLostPointerCapture;

  // Native wheel & touch gesture registration hook
  useCanvasNativeGestures({
    containerRef,
    canvasGroupRef,
    getContainerRectFast,
    upm,
    isAnyModalOpenRef,
    toolModeRef,
    brushWidthRef,
    eraserSizeRef,
    onChangeBrushWidthRef,
    onChangeTraceSettingsRef,
    setEraserSize,
    setZoom,
    setPan,
    zoomRef,
    panRef,
    clampPan,
    showCanvasToast,
    setTouchLoupeState,
    isErasingRef,
    resetEraserVisuals,
    touchPointersRef,
    pointerTypesRef,
    isTwoFingerGestureRef,
    twoFingerCooldownUntilRef,
    isPenDrawingRef,
    lastPenActiveTimeRef,
    onWindowPointerEndRef: handleWindowPointerEndRef,
  });

  // Transform operations for active selection
  const {
    handleSlantSelected,
    handleRotateSelected,
    handleScaleSelected,
    handleFlipHSelected,
    handleFlipVSelected,
    handleDuplicateSelected,
    handleDeleteSelected,
    handleMergeSelectedContours,
    handleSubtractSelectedContours,
    handleIntersectSelectedContours,
    handleReverseWindingSelected,
    handleSmoothStrokeAll,
    handleSmoothStrokeSelected,
    handleStraightenWobblyAll,
    handleStraightenWobblySelected,
    handleSimplifyAll,
    handleSimplifySelected,
    handleConvertToCornersSelected,
    handleConvertToSmoothSelected,
    handleToggleClosedSelected,
    handleExpandStrokeSelected,
    handleAlignSelected,
    handleDistributeSelected,
  } = useContourTransforms({
    contours,
    selectedContourIds,
    onChangeContours,
    onCommitHistory,
    showCanvasToast,
    setSelectedContourIds,
    setSelectedContourId,
    setSelectedNodeId,
    setSelectedHandleType,
    smoothPreserveCorners,
    smoothStrength,
    penStrokeWidth,
    penCapStyle,
    activeBrushPathRef,
    activeBrushSvgDRef,
    activeEraserPathRef,
    activeEraserSvgDRef,
    brushStrokePointsRef,
    isGlyphLocked,
  });

  handleDeleteSelectedRef.current = handleDeleteSelected;

  const handleRotateSelectedWithDefault = useCallback(
    (deg?: number) => handleRotateSelected(deg ?? 90),
    [handleRotateSelected]
  );
  const handleRotateMenu90 = useCallback(() => handleRotateSelected(90), [handleRotateSelected]);

  // Canvas keyboard shortcuts & spacebar pan navigation
  useCanvasShortcuts({
    isAnyModalOpen,
    toolMode,
    activePenContour,
    selectedContourIds,
    selectedNodeId,
    selectedNodeIds,
    selectedContourId,
    rulerMeasurement,
    gridSettings,
    onChangeGridSettings,
    resetView,
    handleZoomStep,
    onToggleZenMode,
    handleResetTracePosition,
    handleResetPenContour,
    handleUndoPenNode,
    handleFinishPenContour,
    handleDeleteSelectedNode,
    handleDeleteSelected,
    handleToggleNodeType,
    handleSmoothStrokeSelected,
    handleDrawRulerAsStroke,
    onSelectPrevGlyph,
    onSelectNextGlyph,
    setShowNodes,
    setOutlineOnly,
    setEraserSize,
    brushWidth,
    onChangeBrushWidth,
    onAdjustBrushSize,
    setRulerMeasurement,
    setSelectedContourIds,
    setSelectedNodeId,
    setIsSpacePressed,
    showCanvasToast,
    onNudgeSelection: handleNudgeSelection,
    isGlyphLocked,
  });

  const lastNotifiedSelectionRef = useRef<{
    contourIds: string[];
    nodeId: string | null;
    handleType: 'node' | 'handleIn' | 'handleOut' | null;
  } | null>(null);

  useEffect(() => {
    if (!onSelectionChange) return;
    const prev = lastNotifiedSelectionRef.current;
    if (
      prev &&
      prev.nodeId === selectedNodeId &&
      prev.handleType === selectedHandleType &&
      prev.contourIds.length === selectedContourIds.length &&
      prev.contourIds.every((id, idx) => id === selectedContourIds[idx])
    ) {
      return;
    }
    const next = {
      contourIds: selectedContourIds,
      nodeId: selectedNodeId,
      handleType: selectedHandleType,
    };
    lastNotifiedSelectionRef.current = next;
    onSelectionChange(next);
  }, [selectedContourIds, selectedNodeId, selectedHandleType, onSelectionChange]);

  return (
    <div className={`w-full h-full flex flex-col min-h-0 relative overflow-hidden select-none ${themeClasses.canvasOuterBg} ${isAnyModalOpen ? 'pointer-events-none' : ''}`}>
      {/* Universal Docked Sub-Toolbar */}
      <CanvasSubToolbar
        isMobileFocusMode={isMobileFocusMode}
        showSubToolbar={showSubToolbar}
        handleToggleSubToolbar={handleToggleSubToolbar}
        themeClasses={themeClasses}
        isLight={isLight}
        onSelectPrevGlyph={onSelectPrevGlyph}
        onSelectNextGlyph={onSelectNextGlyph}
        activeChar={activeChar}
        selectedUnicode={selectedUnicode}
        onGenerateDakutenTarget={onGenerateDakutenTarget}
        onDuplicateAsSmallKana={onDuplicateAsSmallKana}
        onOpenGlyphSynthesisModal={onOpenGlyphSynthesisModal}
        showCanvasToast={showCanvasToast}
        showNodes={showNodes}
        setShowNodes={setShowNodes}
        isOutlineMode={isOutlineMode}
        setOutlineOnly={setOutlineOnly}
        gridSettings={gridSettings}
        onChangeGridSettings={onChangeGridSettings}
        toolMode={toolMode}
        setShowMobileBrushSheet={setShowMobileBrushSheet}
        brushStyle={brushStyle}
        brushWidth={brushWidth}
        onChangeBrushStyle={onChangeBrushStyle}
        onChangeBrushWidth={onChangeBrushWidth}
        onOpenPenPresetsModal={onOpenPenPresetsModal}
        pressureSensitivity={pressureSensitivity}
        onChangePressureSensitivity={onChangePressureSensitivity}
        isStylusActive={isStylusActive}
        liveStylusPressure={liveStylusPressure}
        autoResolveBrushOverlap={autoResolveBrushOverlap}
        setAutoResolveBrushOverlap={setAutoResolveBrushOverlap}
        autoUnionBrush={autoUnionBrush}
        setAutoUnionBrush={setAutoUnionBrush}
        brushStraightMode={brushStraightMode}
        setBrushStraightMode={setBrushStraightMode}
        autoSmoothBrush={autoSmoothBrush}
        setAutoSmoothBrush={setAutoSmoothBrush}
        smoothStrength={smoothStrength}
        setSmoothStrength={setSmoothStrength}
        handleStraightenWobblySelected={handleStraightenWobblySelected}
        penMode={penMode}
        setPenMode={setPenMode}
        penStrokeWidth={penStrokeWidth}
        handleSetPenStrokeWidth={handleSetPenStrokeWidth}
        penCapStyle={penCapStyle}
        handleSetPenCapStyle={handleSetPenCapStyle}
        activePenContour={activePenContour}
        handleFinishPenContour={handleFinishPenContour}
        handleUndoPenNode={handleUndoPenNode}
        handleResetPenContour={handleResetPenContour}
        eraserMode={eraserMode}
        setEraserMode={setEraserMode}
        eraserSize={eraserSize}
        setEraserSize={setEraserSize}
        isShapeTool={isShapeTool}
        rulerMeasurement={rulerMeasurement}
        handleDrawRulerAsStroke={handleDrawRulerAsStroke}
        handleConvertRulerToGuideline={handleConvertRulerToGuideline}
        setRulerMeasurement={setRulerMeasurement}
        customGuidelines={customGuidelines}
        setCustomGuidelines={setCustomGuidelines}
        lockGuidelines={lockGuidelines}
        setLockGuidelines={setLockGuidelines}
        contours={contours}
        handleClearAll={handleClearAll}
        selectedContourIds={selectedContourIds}
        selectedContourId={selectedContourId}
        setSelectedContourIds={setSelectedContourIds}
        setSelectedContourId={setSelectedContourId}
        selectedNodeId={selectedNodeId}
        selectedNodeIds={selectedNodeIds}
        setSelectedNodeId={setSelectedNodeId}
        setSelectedHandleType={setSelectedHandleType}
        isGlyphLocked={isGlyphLocked}
        handleRotateSelected={handleRotateSelected}
        handleFlipHSelected={handleFlipHSelected}
        handleFlipVSelected={handleFlipVSelected}
        handleMergeSelectedContours={handleMergeSelectedContours}
        handleDuplicateSelected={handleDuplicateSelected}
        handleDeleteSelected={handleDeleteSelected}
        handleSmoothStrokeSelected={handleSmoothStrokeSelected}
        handleSimplifySelected={handleSimplifySelected}
        handleExpandStrokeSelected={handleExpandStrokeSelected}
        handleSubtractSelectedContours={handleSubtractSelectedContours}
        handleIntersectSelectedContours={handleIntersectSelectedContours}
        handleSlantSelected={handleSlantSelected}
        handleReverseWindingSelected={handleReverseWindingSelected}
        handleConvertToSmoothSelected={handleConvertToSmoothSelected}
        handleConvertToCornersSelected={handleConvertToCornersSelected}
        handleToggleNodeType={handleToggleNodeType}
        handleDeleteSelectedNode={handleDeleteSelectedNode}
        handleClearAllGuidelines={handleClearAllGuidelines}
        isGuideEraserActive={isGuideEraserActive}
        setIsGuideEraserActive={setIsGuideEraserActive}
        nodeStyle={nodeStyle}
        setNodeStyle={setNodeStyle}
        smoothPreserveCorners={smoothPreserveCorners}
        setSmoothPreserveCorners={setSmoothPreserveCorners}
        isShiftLockRatio={isShiftLockRatio}
        setIsShiftLockRatio={setIsShiftLockRatio}
        isAltFromCenter={isAltFromCenter}
        setIsAltFromCenter={setIsAltFromCenter}
        handleAlignSelected={handleAlignSelected}
        handleDistributeSelected={handleDistributeSelected}
      />

      <div className="relative flex-1 min-h-0 w-full overflow-hidden">
        <div
          ref={containerRef}
          className={`relative w-full h-full overflow-hidden select-none touch-none transition-colors ${
            isLight ? 'bg-[#f0f4f1]' : 'bg-[#0c120e]'
          } ${isAnyModalOpen ? 'pointer-events-none' : ''}`}
          style={{
            touchAction: 'none',
            WebkitTouchCallout: 'none',
            WebkitUserSelect: 'none',
            userSelect: 'none',
          }}
          onAuxClick={(e) => {
            if (e.button === 1) {
              e.preventDefault();
            }
          }}
          onContextMenu={handleCanvasContextMenu}
        >
          {/* SVG Canvas Stage */}
          <CanvasSvgStage
          canvasGroupRef={canvasGroupRef}
          pan={pan}
          zoom={zoom}
          panRef={panRef}
          zoomRef={zoomRef}
          upm={upm}
          theme={theme}
          isLight={isLight}
          selectionColor={selectionColor}
          inkFillColor={inkFillColor}
          getCanvasCursor={getCanvasCursor}
          handlePointerDown={handlePointerDown}
          handlePointerMove={handlePointerMove}
          handlePointerUp={handlePointerUp}
          handlePointerCancel={handlePointerCancel}
          handlePointerLeave={handlePointerLeave}
          handleLostPointerCapture={handleLostPointerCapture}
          isAnyModalOpen={isAnyModalOpen}
          screenToCanvas={screenToCanvas}
          toolMode={toolMode}
          generalCrosshairRef={generalCrosshairRef}
          drawingReticleRef={drawingReticleRef}
          eraserReticleRef={eraserReticleRef}
          isSpacePressed={isSpacePressed}
          isPanning={isPanning}
          gridSettings={gridSettings}
          activeChar={activeChar}
          selectedUnicode={selectedUnicode}
          advanceWidth={advanceWidth}
          lsb={lsb}
          overlaySettings={overlaySettings}
          project={project}
          traceSettings={traceSettings}
          handlePointerDownTraceImage={handlePointerDownTraceImage}
          handlePointerDownTraceResize={handlePointerDownTraceResize}
          handleResetTracePosition={handleResetTracePosition}
          onTraceImageError={handleTraceImageError}
          isResizingTrace={isResizingTrace}
          customGuidelines={customGuidelines}
          isGuideEraserActive={isGuideEraserActive}
          lockGuidelines={lockGuidelines}
          isShapeTool={isShapeTool}
          handlePointerDownGuide={handlePointerDownGuide}
          handleDoubleClickGuide={handleDoubleClickGuide}
          handleDeleteGuideline={handleDeleteGuideline}
          rulerMeasurement={rulerMeasurement}
          handleDrawRulerAsStroke={handleDrawRulerAsStroke}
          handleConvertRulerToGuideline={handleConvertRulerToGuideline}
          setRulerMeasurement={setRulerMeasurement}
          contours={contours}
          contoursRef={contoursRef}
          isOutlineMode={isOutlineMode}
          selectedContourIds={selectedContourIds}
          onChangeContours={onChangeContours}
          setSelectedContourId={setSelectedContourId}
          setSelectedContourIds={setSelectedContourIds}
          selectedContourId={selectedContourId}
          selectedNodeId={selectedNodeId}
          selectedNodeIds={selectedNodeIds}
          setSelectedNodeId={setSelectedNodeId}
          selectedHandleType={selectedHandleType}
          setSelectedHandleType={setSelectedHandleType}
          nodeDragSessionRef={nodeDragSessionRef}
          handleInsertNodeOnContour={handleInsertNodeOnContour}
          onCommitHistory={onCommitHistory}
          showCanvasToast={showCanvasToast}
          handleTransformPointerDown={handleTransformPointerDown}
          onSetToolMode={onSetToolMode}
          marqueeSelection={marqueeSelection}
          activeBrushPathRef={activeBrushPathRef}
          activeEraserPathRef={activeEraserPathRef}
          eraserSize={eraserSize}
          activeShapeContours={activeShapeContours}
          rotateDisplayAngle={rotateDisplayAngle ?? 0}
          handleRotateSelected={handleRotateSelectedWithDefault}
          handleFlipHSelected={handleFlipHSelected}
          handleFlipVSelected={handleFlipVSelected}
          handleDuplicateSelected={handleDuplicateSelected}
          handleMergeSelectedContours={handleMergeSelectedContours}
          handleDeleteSelected={handleDeleteSelected}
          showNodes={showNodes}
          eraserMode={eraserMode}
          nodeStyle={nodeStyle}
          startNodeOrHandleDrag={startNodeOrHandleDrag}
          handleToggleNodeType={handleToggleNodeType}
          activePenContour={activePenContour}
          penSvgPath={penSvgPath}
          penStrokeWidth={penStrokeWidth}
          penCapStyle={penCapStyle}
          penMousePos={penMousePos}
            brushWidth={brushWidth}
            activeSnapGuides={activeSnapGuides}
            isGlyphLocked={isGlyphLocked}
          />
        </div>

        {/* Floating Overlays & Mobile Sheets (outside containerRef so canvas touch-none / preventDefault never blocks scrolling) */}
        <CanvasFloatingOverlays
          isMobileFocusMode={isMobileFocusMode}
          setIsMobileFocusMode={setIsMobileFocusMode}
          isMobileAuxMenuOpen={isMobileAuxMenuOpen}
          setIsMobileAuxMenuOpen={setIsMobileAuxMenuOpen}
          onUndo={onUndo}
          onRedo={onRedo}
          canUndo={canUndo}
          canRedo={canRedo}
          toolMode={toolMode}
          isSpacePressed={isSpacePressed}
          isLight={isLight}
          theme={theme}
          upm={upm}
          traceSettings={traceSettings}
          onChangeTraceSettings={onChangeTraceSettings}
          handleResetTracePosition={handleResetTracePosition}
          handleResetTraceAll={handleResetTraceAll}
          onSetToolMode={onSetToolMode}
          showCanvasToast={showCanvasToast}
          touchLoupeState={touchLoupeState}
          contours={contours}
          isOutlineMode={isOutlineMode}
          canvasToast={canvasToast}
          selectedNodeId={selectedNodeId}
          selectedNodeIds={selectedNodeIds}
          selectedContourId={selectedContourId}
          handleDeleteSelectedNode={handleDeleteSelectedNode}
          handleToggleNodeType={handleToggleNodeType}
          isGlyphLocked={isGlyphLocked}
          resetView={resetView}
          handleZoomStep={handleZoomStep}
          zoom={zoom}
          onChangeGridSettings={onChangeGridSettings || NOOP_CHANGE_GRID_SETTINGS}
          gridSettings={gridSettings}
          palmRejectionMode={palmRejectionMode}
          handleSetPalmRejectionMode={handleSetPalmRejectionMode}
          pressureSensitivity={pressureSensitivity}
          onChangePressureSensitivity={onChangePressureSensitivity}
          handleClearAllContours={handleClearAllContours}
          setOutlineOnly={setOutlineOnly}
          onOpenGlyphCompareModal={onOpenGlyphCompareModal}
          overlaySettings={overlaySettings}
          onToggleZenMode={onToggleZenMode}
          isZenMode={isZenMode}
          selectedContourIds={selectedContourIds}
          handleMergeSelectedContours={handleMergeSelectedContours}
          showMobilePartSheet={showMobilePartSheet}
          setShowMobilePartSheet={setShowMobilePartSheet}
          handleDuplicateSelected={handleDuplicateSelected}
          handleDeleteSelected={handleDeleteSelected}
          setSelectedContourIds={setSelectedContourIds}
          setSelectedNodeId={setSelectedNodeId}
          handleFlipHSelected={handleFlipHSelected}
          handleFlipVSelected={handleFlipVSelected}
          handleRotateSelected={handleRotateSelectedWithDefault}
          handleSlantSelected={handleSlantSelected}
          handleScaleSelected={handleScaleSelected}
          handleSmoothStrokeSelected={handleSmoothStrokeSelected}
          handleSimplifySelected={handleSimplifySelected}
          showMobileBrushSheet={showMobileBrushSheet}
          setShowMobileBrushSheet={setShowMobileBrushSheet}
          brushWidth={brushWidth}
          onChangeBrushWidth={onChangeBrushWidth}
          smoothingIntensity={smoothingIntensity}
          onChangeSmoothingIntensity={onChangeSmoothingIntensity}
          brushStraightMode={brushStraightMode}
          setBrushStraightMode={setBrushStraightMode}
          brushStyle={brushStyle}
          onChangeBrushStyle={onChangeBrushStyle}
          showMobileGuidesSheet={showMobileGuidesSheet}
          setShowMobileGuidesSheet={setShowMobileGuidesSheet}
          nodeStyle={nodeStyle}
          setNodeStyle={setNodeStyle}
          showNodes={showNodes}
          setShowNodes={setShowNodes}
          customGuidelines={customGuidelines}
          setCustomGuidelines={setCustomGuidelines}
          lockGuidelines={lockGuidelines}
          setLockGuidelines={setLockGuidelines}
          activeChar={activeChar}
          selectedUnicode={selectedUnicode}
          onGenerateDakutenTarget={onGenerateDakutenTarget}
          onDuplicateAsSmallKana={onDuplicateAsSmallKana}
          onOpenGlyphSynthesisModal={onOpenGlyphSynthesisModal}
        />

        {/* Canvas Right-Click Context Menu */}
        <CanvasContextMenu
          isOpen={contextMenuState !== null}
          x={contextMenuState?.x ?? 0}
          y={contextMenuState?.y ?? 0}
          onClose={handleCloseContextMenu}
          theme={theme}
          hasSelection={selectedContourIds.length > 0}
          selectedContourCount={selectedContourIds.length}
          contourCount={contours.length}
          isGlyphLocked={isGlyphLocked}
          hasClipboard={hasClipboard}
          onCopySelected={handleCopySelectedContextMenu}
          onPasteSelected={onPasteSelectedContours}
          onFlipH={handleFlipHSelected}
          onFlipV={handleFlipVSelected}
          onRotate={handleRotateMenu90}
          onDuplicate={handleDuplicateSelected}
          onDelete={handleDeleteSelected}
          onReverseWinding={handleReverseWindingSelected}
          onConvertToQuadratic={handleConvertToQuadraticSelected}
          onConvertToCubic={handleConvertToCubicSelected}
          onRegisterRadical={handleRegisterSelectedAsCustomPart}
          onSelectPrevGlyph={onSelectPrevGlyph}
          onSelectNextGlyph={onSelectNextGlyph}
          onSelectAllNodes={handleSelectAllNodes}
        />
      </div>

      {/* External Docked CAD Status Bar (never overlaps SVG stage) */}
      <CanvasStatusBar
        isLight={isLight}
        toolMode={toolMode}
        onSetToolMode={onSetToolMode}
        isSpacePressed={isSpacePressed}
        activeChar={activeChar}
        selectedUnicode={selectedUnicode}
        onSelectPrevGlyph={onSelectPrevGlyph}
        onSelectNextGlyph={onSelectNextGlyph}
        onSelectPrevUncompletedGlyph={onSelectPrevUncompletedGlyph}
        onSelectNextUncompletedGlyph={onSelectNextUncompletedGlyph}
        isGlyphLocked={isGlyphLocked}
        rulerMeasurement={rulerMeasurement}
        setRulerMeasurement={setRulerMeasurement}
        handleDrawRulerAsStroke={handleDrawRulerAsStroke}
        handleConvertRulerToGuideline={handleConvertRulerToGuideline}
        selectedNodeId={selectedNodeId}
        selectedNodeIds={selectedNodeIds}
        selectedContourId={selectedContourId}
        handleDeleteSelectedNode={handleDeleteSelectedNode}
        handleToggleNodeType={handleToggleNodeType}
        setIsMobileAuxMenuOpen={setIsMobileAuxMenuOpen}
        resetView={resetView}
        handleZoomStep={handleZoomStep}
        zoom={zoom}
        onChangeGridSettings={onChangeGridSettings as any}
        gridSettings={gridSettings}
        showCanvasToast={showCanvasToast}
        palmRejectionMode={palmRejectionMode}
        handleSetPalmRejectionMode={handleSetPalmRejectionMode}
        isStylusActive={isStylusActive}
        liveStylusPressure={liveStylusPressure}
        pressureSensitivity={pressureSensitivity}
        onChangePressureSensitivity={onChangePressureSensitivity}
        showQuickGridSlider={showQuickGridSlider}
        setShowQuickGridSlider={setShowQuickGridSlider}
        quickGridSliderRef={quickGridSliderRef}
        traceSettings={traceSettings}
        onChangeTraceSettings={onChangeTraceSettings}
        handleResetTracePosition={handleResetTracePosition}
        contours={contours}
        isOutlineMode={isOutlineMode}
        setOutlineOnly={setOutlineOnly}
        onOpenGlyphCompareModal={onOpenGlyphCompareModal}
        overlaySettings={overlaySettings}
        onToggleZenMode={onToggleZenMode}
        isZenMode={isZenMode}
        showGuideAssist={showGuideAssist}
        handleToggleGuideAssist={handleToggleGuideAssist}
        onUndo={onUndo}
        onRedo={onRedo}
        canUndo={canUndo}
        canRedo={canRedo}
      />
    </div>
  );
},
(prev, next) => {
  if (prev.selectedUnicode !== next.selectedUnicode) return false;
  if (prev.contours !== next.contours) return false;
  if (prev.toolMode !== next.toolMode) return false;
  if (prev.advanceWidth !== next.advanceWidth) return false;
  if (prev.lsb !== next.lsb) return false;
  if (prev.brushWidth !== next.brushWidth) return false;
  if (prev.brushStyle !== next.brushStyle) return false;
  if (prev.pressureSensitivity !== next.pressureSensitivity) return false;
  if (prev.smoothingIntensity !== next.smoothingIntensity) return false;
  if (prev.theme !== next.theme) return false;
  if (prev.activeChar !== next.activeChar) return false;
  if (prev.showGridDrawer !== next.showGridDrawer) return false;
  if (prev.showMetricsDrawer !== next.showMetricsDrawer) return false;
  if (prev.showRadicals !== next.showRadicals) return false;
  if (prev.isZenMode !== next.isZenMode) return false;
  if (prev.canUndo !== next.canUndo) return false;
  if (prev.canRedo !== next.canRedo) return false;
  if (prev.isAnyModalOpen !== next.isAnyModalOpen) return false;
  if (prev.gridSettings !== next.gridSettings) return false;
  if (prev.traceSettings !== next.traceSettings) return false;
  if (prev.overlaySettings !== next.overlaySettings) return false;
  if (prev.outlineOnly !== next.outlineOnly) return false;
  if (prev.activePenPreset !== next.activePenPreset) return false;
  if (prev.pressureCurve !== next.pressureCurve) return false;
  if (prev.isGlyphLocked !== next.isGlyphLocked) return false;
  if (prev.hasClipboard !== next.hasClipboard) return false;
  if (prev.onCopySelectedContours !== next.onCopySelectedContours) return false;
  if (prev.onPasteSelectedContours !== next.onPasteSelectedContours) return false;
  if (prev.onUndo !== next.onUndo) return false;
  if (prev.onRedo !== next.onRedo) return false;
  if (prev.onChangeContours !== next.onChangeContours) return false;
  if (prev.onCommitHistory !== next.onCommitHistory) return false;
  if (prev.onSetToolMode !== next.onSetToolMode) return false;
  if (prev.onSelectPrevGlyph !== next.onSelectPrevGlyph) return false;
  if (prev.onSelectNextGlyph !== next.onSelectNextGlyph) return false;
  if (prev.onChangeAdvanceWidth !== next.onChangeAdvanceWidth) return false;
  if (prev.onChangeLsb !== next.onChangeLsb) return false;
  if (prev.project?.metadata?.unitsPerEm !== next.project?.metadata?.unitsPerEm) return false;
  if (prev.project?.metadata?.ascender !== next.project?.metadata?.ascender) return false;
  if (prev.project?.metadata?.descender !== next.project?.metadata?.descender) return false;
  if (prev.project?.metadata?.capHeight !== next.project?.metadata?.capHeight) return false;
  if (prev.project?.metadata?.xHeight !== next.project?.metadata?.xHeight) return false;
  return true;
});
