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
import { createLineContour } from '../utils/pathUtils';
import { useBrushDrawing } from '../hooks/useBrushDrawing';
import { useNodeEditing } from '../hooks/useNodeEditing';
import { CanvasSubToolbar } from './canvas/overlays/CanvasSubToolbar';
import { CanvasFloatingOverlays } from './canvas/overlays/CanvasFloatingOverlays';
import { CanvasSvgStage } from './canvas/CanvasSvgStage';
import { useCanvasShortcuts } from './canvas/hooks/useCanvasShortcuts';
import { useContourTransforms } from './canvas/hooks/useContourTransforms';
import { useTransformSession } from './canvas/hooks/useTransformSession';
import { useCanvasViewport } from './canvas/hooks/useCanvasViewport';
import { useShapeCreation, isShapeToolMode } from './canvas/hooks/useShapeCreation';
import { useRulerMeasure } from './canvas/hooks/useRulerMeasure';
import { usePenTool } from './canvas/hooks/usePenTool';
import { useCanvasEraser } from './canvas/hooks/useCanvasEraser';
import { useCustomGuidelines } from './canvas/hooks/useCustomGuidelines';
import { useTraceTransform } from './canvas/hooks/useTraceTransform';
import { useCanvasPointerDispatcher } from './canvas/hooks/useCanvasPointerDispatcher';
import { useCanvasLocalPrefs } from './canvas/hooks/useCanvasLocalPrefs';
import { useCanvasNativeGestures } from './canvas/hooks/useCanvasNativeGestures';

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
import { getInkColors } from './canvas/glyphCanvasConstants';
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
  onCopyFromChar,
  onGenerateDakutenTarget,
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
    isBottomBarCollapsed,
    setIsBottomBarCollapsed,
    toggleBottomBarCollapse,
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
  });

  // Zoom & Pan Viewport State
  const {
    containerRef,
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
  } = useCanvasViewport({ upm });

  const canvasGroupRef = useRef<SVGGElement | null>(null);

  const [isStylusActive, setIsStylusActive] = useState<boolean>(false);
  const [liveStylusPressure, setLiveStylusPressure] = useState<number | null>(null);
  const lastPressureValRef = useRef<number | null>(null);
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

  // Real-time Hover Position in Font Canvas Coordinates
  const [hoverCanvasPos, setHoverCanvasPos] = useState<Point | null>(null);
  const hoverRafRef = useRef<number | null>(null);

  // Throttled RAF references for ultra-smooth 60fps canvas operations
  const eraserReticleRef = useRef<SVGGElement | null>(null);
  const drawingReticleRef = useRef<SVGGElement | null>(null);
  const eraseRafRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (hoverRafRef.current != null) cancelAnimationFrame(hoverRafRef.current);
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

  // Dynamic snap metrics calculated from font canvas UPM
  const snapMetrics = useMemo(() => ({
    lsb,
    advanceWidth,
    baseline: Math.round(upm * 0.8),
    ascender: Math.round(upm * 0.2),
    capHeight: Math.round(upm * 0.3),
    xHeight: Math.round(upm * 0.5),
    descender: upm,
  }), [lsb, advanceWidth, upm]);

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
    onPressureUpdate: (val) => {
      lastPressureValRef.current = val;
    },
  });

  const {
    selectedContourIds,
    setSelectedContourIds,
    selectedContourId,
    setSelectedContourId,
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
  });

  // ---------------- PEN TOOL HOOK ----------------
  const {
    penStrokeWidth,
    setPenStrokeWidth,
    handleSetPenStrokeWidth,
    penCapStyle,
    setPenCapStyle,
    handleSetPenCapStyle,
    showPenStrokeMenu,
    setShowPenStrokeMenu,
    activePenContour,
    setActivePenContour,
    penMousePos,
    setPenMousePos,
    penHudPos,
    setPenHudPos,
    handleUndoPenNode,
    handleResetPenContour,
    handleFinishPenContour,
    handlePenHudPointerDown,
    handlePenHudPointerMove,
    handlePenHudPointerUp,
    penSvgPath,
  } = usePenTool({
    contours,
    autoResolveBrushOverlap,
    containerRef,
    onChangeContours,
    onCommitHistory,
    showCanvasToast,
    setSelectedContourId,
    setSelectedContourIds,
    setSelectedNodeId,
    setSelectedHandleType,
  });

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
    targetedEraserNodeCount,
    resetEraserVisuals,
    handleEraserPointerDown,
    handleEraserPointerMove,
    handleEraserPointerUp,
  } = useCanvasEraser({
    toolMode,
    contours,
    contoursRef,
    hoverCanvasPos,
    onChangeContours,
    onCommitHistory,
    showCanvasToast,
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
    selectedContourIds,
    screenToCanvas,
    onChangeContours,
    onCommitHistory,
    gridSettings,
    snapMetrics,
    customGuidelines,
    zoom,
    setActiveSnapGuides,
  });

  // Consolidated Tool Switch Cleanup Table
  useEffect(() => {
    if (toolMode !== 'select' && toolMode !== 'node') {
      setShowMobilePartSheet(false);
      setMarqueeSelection(null);
    }
    if (toolMode !== 'pen') {
      handleResetPenContour();
    }
    if (!isShapeToolMode(toolMode)) {
      resetShapeCreation();
    }
    if (toolMode !== 'eraser') {
      resetEraserVisuals();
    }
    if (toolMode !== 'ruler' || gridSettings?.showRulers === false) {
      setRulerMeasurement(null);
    }
    cancelTransformSession();
    setActiveSnapGuides([]);
    setTouchLoupeState((prev) => (prev.visible ? { ...prev, visible: false } : prev));
  }, [
    toolMode,
    gridSettings?.showRulers,
    handleResetPenContour,
    resetShapeCreation,
    resetEraserVisuals,
    cancelTransformSession,
    setActiveSnapGuides,
    setTouchLoupeState,
    setShowMobilePartSheet,
    setRulerMeasurement,
  ]);

  // Draw straight stroke directly from ruler measurement line
  const handleDrawRulerAsStroke = useCallback(() => {
    if (!rulerMeasurement) return;
    const { start, end } = rulerMeasurement;
    const dist = Math.hypot(end.x - start.x, end.y - start.y);
    if (dist < 4) return;

    const strokeContour = createLineContour(
      start.x,
      start.y,
      end.x,
      end.y,
      brushWidth || 32
    );
    onChangeContours([...contours, strokeContour]);
    onCommitHistory?.();
    setRulerMeasurement(null);
    showCanvasToast('定規のラインから直線ストロークを作成しました', `長さ: ${Math.round(dist)}px / 太さ: ${brushWidth}px`);
  }, [rulerMeasurement, brushWidth, contours, onChangeContours, onCommitHistory, showCanvasToast, setRulerMeasurement]);

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
      if (eraserReticleRef.current) eraserReticleRef.current.style.display = 'none';
      if (drawingReticleRef.current) drawingReticleRef.current.style.display = 'none';
      setHoverCanvasPos(null);
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
    const validContourIds = new Set(contours.map((c) => c.id));
    setSelectedContourIds((prev) => prev.filter((id) => validContourIds.has(id)));
    setSelectedContourId((prev) => (prev && validContourIds.has(prev) ? prev : null));
    setSelectedNodeId((prev) => {
      if (!prev) return null;
      return contours.some((c) => c.nodes.some((n) => n.id === prev)) ? prev : null;
    });

    if (!contours || contours.length === 0) {
      if (activeBrushPathRef.current) {
        activeBrushPathRef.current.setAttribute('d', '');
      }
      activeBrushSvgDRef.current = '';
      resetEraserVisuals();
      brushStrokePointsRef.current = [];
      setSelectedContourIds([]);
      setSelectedContourId(null);
      setSelectedNodeId(null);
      setSelectedHandleType(null);
    }
  }, [contours, resetEraserVisuals, setSelectedContourId, setSelectedContourIds, setSelectedHandleType, setSelectedNodeId, activeBrushPathRef, activeBrushSvgDRef, brushStrokePointsRef]);

  // Switching glyphs hygiene
  useEffect(() => {
    resetBrushDrawing();
    resetEraserVisuals();
    setActivePenContour(null);
    setShapeStartPoint(null);
    setShapeCurrentPoint(null);
    setMarqueeSelection(null);
    setTransformSession(null);
    setSelectedContourIds([]);
    setSelectedNodeId(null);
    setSelectedHandleType(null);
    setDraggingMetric(null);
    setDraggingGuidelineId(null);
    if (activeBrushPathRef.current) {
      activeBrushPathRef.current.setAttribute('d', '');
    }
    pendingTransformContoursRef.current = null;
    activeBrushSvgDRef.current = '';
  }, [selectedUnicode, resetBrushDrawing, resetEraserVisuals, setActivePenContour, setDraggingGuidelineId, setDraggingMetric, setSelectedContourIds, setSelectedHandleType, setSelectedNodeId, setShapeCurrentPoint, setShapeStartPoint, setTransformSession, activeBrushPathRef, activeBrushSvgDRef, pendingTransformContoursRef]);

  // Clear / Reset all contours of current character
  const handleClearAll = useCallback(() => {
    resetBrushDrawing();
    resetEraserVisuals();
    setActivePenContour(null);
    setShapeStartPoint(null);
    setShapeCurrentPoint(null);
    setRulerMeasurement(null);
    setTransformSession(null);
    setMarqueeSelection(null);
    setSelectedContourIds([]);
    setSelectedContourId(null);
    setSelectedNodeId(null);
    setSelectedHandleType(null);
    setTouchLoupeState({ visible: false, screenX: 0, screenY: 0, canvasPos: null });
    setEraserMode('stroke');

    if (!contours || contours.length === 0) {
      showCanvasToast('キャンバスは既に空です');
      return;
    }
    onCommitHistory?.();
    contoursRef.current = [];
    onChangeContours([]);
    showCanvasToast('文字の全パーツ（輪郭）を消去しました', 'Ctrl+Z で取り消し可能');
  }, [contours, onChangeContours, onCommitHistory, resetBrushDrawing, resetEraserVisuals, setActivePenContour, setEraserMode, setRulerMeasurement, setSelectedContourId, setSelectedContourIds, setSelectedHandleType, setSelectedNodeId, setShapeCurrentPoint, setShapeStartPoint, setTouchLoupeState, setTransformSession, showCanvasToast]);

  const handleClearAllContours = handleClearAll;

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

  // ---------------- POINTER EVENT DISPATCHER ----------------
  const {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    isPenDrawingRef,
    lastPenActiveTimeRef,
    touchPointersRef,
    pointerTypesRef,
    isTwoFingerGestureRef,
    twoFingerCooldownUntilRef,
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
    eraserReticleRef,
    drawingReticleRef,
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
    resetTraceDragState,
    traceSettings,
    onChangeTraceSettings,
    gridSettings,
    snapMetrics,
    customGuidelines,
    setActiveSnapGuides,
    hoverCanvasPos,
    setHoverCanvasPos,
    onChangeContours,
    onCommitHistory,
    onUndo,
    onRedo,
    showCanvasToast,
  });

  const handlePointerCancel = handlePointerUp;

  const handlePointerLeave = useCallback(() => {
    if (eraserReticleRef.current) eraserReticleRef.current.style.display = 'none';
    if (drawingReticleRef.current) drawingReticleRef.current.style.display = 'none';
    setHoverCanvasPos(null);
  }, []);

  const handleLostPointerCapture = useCallback(() => {
    if (drawingReticleRef.current) drawingReticleRef.current.style.display = 'none';
    if (isErasingRef.current) resetEraserVisuals();
    isPenDrawingRef.current = false;
    isTwoFingerGestureRef.current = false;
    setIsPanning(false);
    resetTraceDragState();
    setDraggingMetric(null);
    setDraggingGuidelineId(null);
    setMarqueeSelection(null);
    nodeDragSessionRef.current = null;
  }, [
    isErasingRef,
    resetEraserVisuals,
    isPenDrawingRef,
    isTwoFingerGestureRef,
    setIsPanning,
    resetTraceDragState,
    setDraggingMetric,
    setDraggingGuidelineId,
    nodeDragSessionRef,
  ]);

  // Native wheel & touch gesture registration hook
  useCanvasNativeGestures({
    containerRef,
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
    zoom,
    pan,
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
  });

  handleDeleteSelectedRef.current = handleDeleteSelected;

  // Canvas keyboard shortcuts & spacebar pan navigation
  useCanvasShortcuts({
    isAnyModalOpen,
    toolMode,
    activePenContour,
    selectedContourIds,
    selectedNodeId,
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
    handleSmoothStrokeSelected,
    handleDrawRulerAsStroke,
    onSelectPrevGlyph,
    onSelectNextGlyph,
    setShowNodes,
    setOutlineOnly,
    setEraserSize,
    setRulerMeasurement,
    setSelectedContourIds,
    setSelectedNodeId,
    setIsSpacePressed,
    showCanvasToast,
  });

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
        setSelectedNodeId={setSelectedNodeId}
        setSelectedHandleType={setSelectedHandleType}
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
      />

      <div
        ref={containerRef}
        className={`relative flex-1 min-h-0 h-full w-full overflow-hidden select-none touch-none transition-colors ${
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
      >
        {/* Floating Overlays & Mobile Sheets */}
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
          activeChar={activeChar}
          traceSettings={traceSettings}
          onChangeTraceSettings={onChangeTraceSettings}
          handleResetTracePosition={handleResetTracePosition}
          handleResetTraceAll={handleResetTraceAll}
          onSetToolMode={onSetToolMode}
          showCanvasToast={showCanvasToast}
          showGuideAssist={showGuideAssist}
          handleToggleGuideAssist={handleToggleGuideAssist}
          activePenContour={activePenContour}
          penHudPos={penHudPos || { x: 20, y: 80 }}
          handlePenHudPointerDown={handlePenHudPointerDown}
          handlePenHudPointerMove={handlePenHudPointerMove}
          handlePenHudPointerUp={handlePenHudPointerUp}
          handleUndoPenNode={handleUndoPenNode}
          handleFinishPenContour={handleFinishPenContour}
          penStrokeWidth={penStrokeWidth}
          penCapStyle={penCapStyle}
          showPenStrokeMenu={showPenStrokeMenu}
          setShowPenStrokeMenu={setShowPenStrokeMenu}
          handleSetPenStrokeWidth={handleSetPenStrokeWidth}
          handleSetPenCapStyle={handleSetPenCapStyle}
          handleResetPenContour={handleResetPenContour}
          setPenHudPos={setPenHudPos}
          touchLoupeState={touchLoupeState}
          contours={contours}
          isOutlineMode={isOutlineMode}
          canvasToast={canvasToast}
          isBottomBarCollapsed={isBottomBarCollapsed}
          toggleBottomBarCollapse={toggleBottomBarCollapse}
          hoverCanvasPos={hoverCanvasPos}
          rulerMeasurement={rulerMeasurement}
          setRulerMeasurement={setRulerMeasurement}
          handleDrawRulerAsStroke={handleDrawRulerAsStroke}
          handleConvertRulerToGuideline={handleConvertRulerToGuideline}
          selectedNodeId={selectedNodeId}
          selectedContourId={selectedContourId}
          handleDeleteSelectedNode={handleDeleteSelectedNode}
          handleToggleNodeType={handleToggleNodeType}
          resetView={resetView}
          handleZoomStep={handleZoomStep}
          zoom={zoom}
          onChangeGridSettings={onChangeGridSettings || (() => {})}
          gridSettings={gridSettings}
          palmRejectionMode={palmRejectionMode}
          handleSetPalmRejectionMode={handleSetPalmRejectionMode}
          isStylusActive={isStylusActive}
          liveStylusPressure={liveStylusPressure}
          pressureSensitivity={pressureSensitivity}
          onChangePressureSensitivity={onChangePressureSensitivity}
          showQuickGridSlider={showQuickGridSlider}
          setShowQuickGridSlider={setShowQuickGridSlider}
          quickGridSliderRef={quickGridSliderRef}
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
          handleRotateSelected={(deg?: number) => handleRotateSelected(deg ?? 90)}
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
        />

        {/* SVG Canvas Stage */}
        <CanvasSvgStage
          canvasGroupRef={canvasGroupRef}
          pan={pan}
          zoom={zoom}
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
          isResizingTrace={isResizingTrace}
          hoverCanvasPos={hoverCanvasPos}
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
          isOutlineMode={isOutlineMode}
          selectedContourIds={selectedContourIds}
          onChangeContours={onChangeContours}
          setSelectedContourId={setSelectedContourId}
          setSelectedContourIds={setSelectedContourIds}
          selectedContourId={selectedContourId}
          selectedNodeId={selectedNodeId}
          setSelectedNodeId={setSelectedNodeId}
          selectedHandleType={selectedHandleType}
          setSelectedHandleType={setSelectedHandleType}
          nodeDragSessionRef={nodeDragSessionRef}
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
          handleRotateSelected={(deg?: number) => handleRotateSelected(deg ?? 90)}
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
        />
      </div>
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
  return true;
});
