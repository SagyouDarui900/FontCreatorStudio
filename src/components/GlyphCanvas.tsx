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
  STORAGE_KEYS,
  getBooleanStorageItem,
  setBooleanStorageItem,
} from '../utils/storageKeys';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Move,
  Eye,
  EyeOff,
  RotateCcw,
  Layers,
  Undo,
  Redo,
  Italic,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Copy,
  Trash2,
  Eraser,
  Plus,
  Minus,
  Ruler,
  Compass,
  Sparkles,
  Info,
  X,
  Square,
  Circle,
  Triangle,
  Star,
  Heart,
  Diamond,
  Spline,
  Zap,
  Activity,
  ChevronLeft,
  ChevronRight,
  Sliders,
  Wand2,
  Paintbrush,
  Check,
  Bookmark,
  Magnet,
  Crosshair,
  CornerDownLeft,
  MousePointer,
  PenTool,
  Maximize,
  Minimize,
  Grid,
  GripVertical,
  ChevronDown,
  Hexagon,
  Lock,
  Unlock,
  Shield,
  ShieldCheck,
  ChevronUp,
  PanelBottomClose,
  PanelBottomOpen,
  HelpCircle,
  Type,
  ArrowRightLeft,
  Hand,
  CircleDot,
  Disc,
  Moon,
  Slash,
} from 'lucide-react';
import {
  PathContour,
  BezierNode,
  Point,
  StrokePoint,
  BrushStyle,
  ToolMode,
  TraceSettings,
  GridSettings,
  JapaneseGuidePattern,
  VerticalGuidePattern,
  SnapGuideLine,
  CustomGuideline,
  GlyphOverlaySettings,
  FontProject,
  PressureCurveConfig,
  UserPenPreset,
} from '../types';
import {
  ThemeMode,
  isLightTheme,
  getThemeClasses,
} from '../utils/theme';
import {
  DAKUTEN_MAPPINGS,
} from '../utils/dakutenHelper';
import {
  snapContourMovement,
  snapSinglePoint,
} from '../utils/snapUtils';
import { useBrushDrawing } from '../hooks/useBrushDrawing';
import { useNodeEditing } from '../hooks/useNodeEditing';
import {
  PEN_PRESETS,
  generateId,
  contoursToSvgPath,
  generateFastStrokeSvgPath,
  strokePointsToOutline,
  simplifyContour,
  smoothStrokeContour,
  smoothContoursPreservingShape,
  convertContourToCorners,
  convertContourToSmooth,
  createRectContour,
  createRoundedRectContour,
  createEllipseContour,
  createTriangleContour,
  createStarContour,
  createHeartContour,
  createSparkleContour,
  createStarburstContour,
  createDiamondContour,
  createHexagonContour,
  createRightTriangleContour,
  createSemicircleContour,
  createRingContours,
  createPillContour,
  createParallelogramContour,
  createLineContour,
  createCrescentContour,
  flipContoursHorizontal,
  flipContoursVertical,
  slantContours,
  scaleContours,
  rotateContours,
  centerContoursInBox,
  fitContoursToEmBox,
  getContoursBoundingBox,
  outlineOpenContour,
  simplifyGlyphContours,
  smoothAndFixTransformedContours,
  transformContours,
  unionContours,
  hasContourIntersections,
  expandStrokeContours,
  eraseContoursAtPoint,
  subtractEraserStrokeFromContours,
  snapToStraightAngle,
  generateStraightStrokePoints,
  straightenWobblyContour,
  duplicateContour,
  duplicateMultipleContours,
  slantSingleContour,
  rotateSingleContour,
  rotateMultipleContours,
  scaleSingleContour,
  scaleMultipleContours,
  flipSingleContourH,
  flipMultipleContoursH,
  flipSingleContourV,
  flipMultipleContoursV,
  reverseContour,
  toggleNodeType,
  insertNodeOnContourAtPoint,
  isPointNearContour,
} from '../utils/pathUtils';
import { CursorReticleOverlay } from './canvas/overlays/CursorReticleOverlay';
import { GuidesAndGridModal } from './canvas/overlays/GuidesAndGridModal';
import { CanvasStatusBar } from './canvas/overlays/CanvasStatusBar';
import {
  booleanSubtractContours,
  booleanIntersectContours,
} from '../utils/vectorBoolean';
import { CanvasBackgroundLayer } from './canvas/CanvasBackgroundLayer';
import { JapaneseGuidesLayer } from './canvas/JapaneseGuidesLayer';
import { AdjacentGlyphsLayer } from './canvas/AdjacentGlyphsLayer';
import { GlyphComparisonLayer } from './canvas/GlyphComparisonLayer';
import { TraceReferenceLayer, TraceResizeHandle } from './canvas/TraceReferenceLayer';
import { CanvasRulersLayer } from './canvas/CanvasRulersLayer';
import { MetricsGuidesLayer } from './canvas/MetricsGuidesLayer';
import { CustomGuidelinesLayer } from './canvas/CustomGuidelinesLayer';
import { RulerMeasurementLayer } from './canvas/RulerMeasurementLayer';
import { MainGlyphContoursLayer } from './canvas/MainGlyphContoursLayer';
import { BezierNodeControlsLayer } from './canvas/BezierNodeControlsLayer';
import { ActivePenPreviewLayer } from './canvas/ActivePenPreviewLayer';
import { SmartSnapGuidesLayer } from './canvas/SmartSnapGuidesLayer';
import { TransformBoundingBoxLayer } from './canvas/TransformBoundingBoxLayer';
import { CanvasTouchLoupe } from './canvas/overlays/CanvasTouchLoupe';
import { MobileAuxMenuDrawer } from './canvas/overlays/MobileAuxMenuDrawer';
import { MobilePartTransformSheet } from './canvas/overlays/MobilePartTransformSheet';
import { MobileBrushSettingsSheet } from './canvas/overlays/MobileBrushSettingsSheet';
import { GuideAssistOverlay } from './canvas/overlays/GuideAssistOverlay';
import { ActivePenDrawingHud } from './canvas/overlays/ActivePenDrawingHud';
import { CanvasToastNotification } from './canvas/overlays/CanvasToastNotification';
import { MobileSelectionActionBar } from './canvas/overlays/MobileSelectionActionBar';
import { CanvasSubToolbar } from './canvas/overlays/CanvasSubToolbar';
import { TraceAdjustFloatingHud } from './canvas/overlays/TraceAdjustFloatingHud';
import { useCanvasShortcuts } from './canvas/hooks/useCanvasShortcuts';
import { useContourTransforms } from './canvas/hooks/useContourTransforms';
import { useTransformSession } from './canvas/hooks/useTransformSession';
import { useCanvasViewport } from './canvas/hooks/useCanvasViewport';
import { useShapeCreation, isShapeToolMode } from './canvas/hooks/useShapeCreation';
import { useRulerMeasure } from './canvas/hooks/useRulerMeasure';
import { usePenTool } from './canvas/hooks/usePenTool';
import { useCanvasEraser } from './canvas/hooks/useCanvasEraser';
import { InteractiveContourHitLayer } from './canvas/InteractiveContourHitLayer';
import { useCustomGuidelines } from './canvas/hooks/useCustomGuidelines';
import { useTraceTransform } from './canvas/hooks/useTraceTransform';
import { useCanvasPointerDispatcher } from './canvas/hooks/useCanvasPointerDispatcher';


import {
  HIGH_CONTRAST_GRAB_CURSOR,
  HIGH_CONTRAST_GRABBING_CURSOR,
  HIGH_CONTRAST_PEN_CURSOR,
  HIGH_CONTRAST_NODE_CURSOR,
  HIGH_CONTRAST_ANCHOR_ERASER_CURSOR,
  HIGH_CONTRAST_ERASER_CURSOR,
  HIGH_CONTRAST_CROSSHAIR_CURSOR,
  getCachedContourSvgPath,
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

 const { fill: inkFillColor, stroke: inkStrokeColor } = useMemo(
   () => getInkColors(theme, isLight),
   [theme, isLight]
 );



 // Pen Mode: 'bezier' (smooth bezier curves) or 'corner' (sharp angular polyline)
 const [penMode, setPenMode] = useState<'bezier' | 'corner'>('bezier');

 // Node Points Visibility Toggle (hides clutter when writing/viewing)
 const [showNodes, setShowNodes] = useState<boolean>(true);
 // Node appearance style: 'clean' (subtle elegant dots that keep glyph shape 100% visible), 'minimal' (active only), 'full' (standard boxes & handles)
 const [nodeStyle, setNodeStyle] = useState<'clean' | 'full' | 'selected_only'>('clean');

 // Outline-Only (Wireframe) Mode (輪郭表示): Turns glyph paths into outlines only so overlapping shapes, curves, and underlying guides are easily seen during editing
 const [internalOutlineOnly, setInternalOutlineOnly] = useState<boolean>(() => {
   return getBooleanStorageItem(STORAGE_KEYS.OUTLINE_MODE, false);
 });

 const isOutlineMode = propOutlineOnly !== undefined ? propOutlineOnly : internalOutlineOnly;

 const setOutlineOnly = useCallback(
   (value: boolean | ((prev: boolean) => boolean)) => {
     const nextVal = typeof value === 'function' ? value(isOutlineMode) : value;
     if (onChangeOutlineOnly) {
       onChangeOutlineOnly(nextVal);
     }
     setInternalOutlineOnly(nextVal);
     setBooleanStorageItem(STORAGE_KEYS.OUTLINE_MODE, nextVal);
   },
   [isOutlineMode, onChangeOutlineOnly]
 );

 const upm = project?.metadata?.unitsPerEm || 1000;

 // Zoom & Pan Viewport State (Encapsulated in custom hook)
 const {
  containerRef,
  containerRectRef,
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
  canvasToScreen,
 } = useCanvasViewport({ upm });
 const canvasGroupRef = useRef<SVGGElement | null>(null);
  // Trace state extracted to useTraceTransform hook below

 // Typography Writing Guide Assist Card state (Default to false so it doesn't obstruct the canvas)
 const [showGuideAssist, setShowGuideAssist] = useState<boolean>(() => {
   return getBooleanStorageItem(STORAGE_KEYS.GUIDE_ASSIST_OPEN, false);
 });

 // Sub-toolbar visibility (collapsible to maximize canvas height)
 const [showSubToolbar, setShowSubToolbar] = useState<boolean>(() => {
   return getBooleanStorageItem(STORAGE_KEYS.SHOW_SUBTOOLBAR, true);
 });

 const handleToggleSubToolbar = useCallback(() => {
   setShowSubToolbar((prev) => {
     const next = !prev;
     setBooleanStorageItem(STORAGE_KEYS.SHOW_SUBTOOLBAR, next);
     return next;
   });
 }, []);

 const handleToggleGuideAssist = useCallback((open?: boolean) => {
   setShowGuideAssist((prev) => {
     const next = typeof open === 'boolean' ? open : !prev;
     setBooleanStorageItem(STORAGE_KEYS.GUIDE_ASSIST_OPEN, next);
     return next;
   });
 }, []);

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


 // Stroke Smoothing Options & Real-time Auto-Smooth
 const [autoSmoothBrush, setAutoSmoothBrush] = useState<boolean>(true);
 // 合体（デフォルトON: 初心者でも交差した線が自然に結合され、穴あきや重なりバグ感を防止）
 const [autoUnionBrush, setAutoUnionBrush] = useState<boolean>(() => {
   return getBooleanStorageItem(STORAGE_KEYS.AUTO_UNION_BRUSH, true);
 });
 // 一筆書きの線が交差・重なった部分の白抜き防止（デフォルトON: ループ線を描いた時の中抜け・白抜きバグ感を防止）
 const [autoResolveBrushOverlap, setAutoResolveBrushOverlap] = useState<boolean>(() => {
   return getBooleanStorageItem(STORAGE_KEYS.AUTO_UNION_BRUSH, true);
 });
 const [smoothStrength, setSmoothStrength] = useState<'mild' | 'standard' | 'strong'>('standard');
 const [smoothPreserveCorners, setSmoothPreserveCorners] = useState<boolean>(true);
 const [showSmoothMenu, setShowSmoothMenu] = useState<boolean>(false);
 const [canvasToast, setCanvasToast] = useState<{ message: string; subText?: string; id: number } | null>(null);

 // Bottom Floating Bar Compact/Expand State (desktop)
 const [isBottomBarCollapsed, setIsBottomBarCollapsed] = useState<boolean>(() => {
 try {
 const saved = localStorage.getItem('mojisaku_bottom_bar_collapsed');
 if (saved !== null) return saved === 'true';
 return false;
 } catch {
 return false;
 }
 });

 // Mobile Auxiliary Drawer Open/Close State (never open on initial load)
 const [isMobileAuxMenuOpen, setIsMobileAuxMenuOpen] = useState<boolean>(false);

 const toggleBottomBarCollapse = useCallback(() => {
 setIsBottomBarCollapsed((prev) => {
 const next = !prev;
 try {
 localStorage.setItem('mojisaku_bottom_bar_collapsed', String(next));
 } catch {
 // Ignored
 }
 return next;
 });
 }, []);

 // Palm Rejection Mode ('auto': ignore single touch when stylus detected, 'strict_pen_only': only stylus draws, 'off': allow finger drawing)
 const [palmRejectionMode, setPalmRejectionMode] = useState<'auto' | 'strict_pen_only' | 'off'>(() => {
 try {
 const saved = localStorage.getItem('mojisaku_palm_rejection_mode');
 if (saved === 'auto' || saved === 'strict_pen_only' || saved === 'off') return saved;
 } catch {
 // fallback
 }
 return 'auto';
 });

 const handleSetPalmRejectionMode = useCallback((mode: 'auto' | 'strict_pen_only' | 'off') => {
 setPalmRejectionMode(mode);
 try {
 localStorage.setItem('mojisaku_palm_rejection_mode', mode);
 } catch {
 // Ignored
 }
 }, []);


 // Multi-touch Gesture tracking for 2-finger tap (Undo) and 3-finger tap (Redo)
 const touchStartTimeRef = useRef<number>(0);
 const maxTouchCountRef = useRef<number>(0);
 const hasMovedSignificantRef = useRef<boolean>(false);

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

 // Helper to generate exact brush contour for both live preview and finalization


 // Real-time Hover Position in Font Canvas Coordinates (0 - 1000)
 const [hoverCanvasPos, setHoverCanvasPos] = useState<Point | null>(null);
 const hoverRafRef = useRef<number | null>(null);


 // Throttled RAF references for ultra-smooth 60fps canvas operations
 const eraserReticleRef = useRef<SVGGElement | null>(null);
 const drawingReticleRef = useRef<SVGGElement | null>(null);
 const eraseRafRef = useRef<number | null>(null);

 // Clean up RAF & timers on unmount to prevent memory leaks
 useEffect(() => {
 return () => {
 if (toastTimerRef.current) {
 clearTimeout(toastTimerRef.current);
 }
 if (hoverRafRef.current != null) {
 cancelAnimationFrame(hoverRafRef.current);
 }
 if (eraseRafRef.current != null) {
 cancelAnimationFrame(eraseRafRef.current);
 }

 };
 }, []);

 // Active Smart Snap Guidelines (Baseline, LSB, Metrics, Other Contours, Grid)
 const [activeSnapGuides, setActiveSnapGuides] = useState<SnapGuideLine[]>([]);
  const isShapeTool = isShapeToolMode(toolMode);

  // Custom Guidelines Hook (Extracted for modularity and isolation)
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
 }, [rulerMeasurement, brushWidth, contours, onChangeContours, onCommitHistory, showCanvasToast]);
  // Guideline eraser mode and delete handlers extracted into useCustomGuidelines

 // Mobile UI View Modes & Bottom Action Sheets
 const [isMobileFocusMode, setIsMobileFocusMode] = useState<boolean>(false);
 const [showMobilePartSheet, setShowMobilePartSheet] = useState<boolean>(false);
 const [showMobileBrushSheet, setShowMobileBrushSheet] = useState<boolean>(false);
 const [showMobileGuidesSheet, setShowMobileGuidesSheet] = useState<boolean>(false);

 const containerDimensionsRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });
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

 // Unified native wheel & gesture handling (Passive: false for seamless zoom, pan, and brush sizing)
 useEffect(() => {
 const el = containerRef.current;
 if (!el) return;
 const preventAll = (e: Event) => {
 if (e.cancelable) {
 e.preventDefault();
 }
 };
 const handleTouchStart = (e: TouchEvent) => {
 // Prevent browser native zoom & multi-touch gestures when touching canvas
 if (e.touches.length >= 2 && e.cancelable) {
 e.preventDefault();
 }
 };
 const handleTouchMove = (e: TouchEvent) => {
 // Inside canvas area, touches are strictly for drawing or 2-finger panning. Always prevent page scrolling/bouncing.
 if (e.cancelable) {
 e.preventDefault();
 }
 };

 const handleWheelNative = (e: WheelEvent) => {
 if (e.cancelable) {
 e.preventDefault();
 }

 if (isAnyModalOpenRef.current) return;
 if (!containerRef.current) return;
 const rect = containerRef.current.getBoundingClientRect();
 const mouseX = e.clientX - rect.left;
 const mouseY = e.clientY - rect.top;

 let deltaX = e.deltaX;
 let deltaY = e.deltaY;
 if (e.deltaMode === 1) {
 deltaX *= 20;
 deltaY *= 20;
 } else if (e.deltaMode === 2) {
 deltaX *= 400;
 deltaY *= 400;
 }

 // 1. Trace Adjust Mode (when not holding Ctrl / Cmd)
 if (toolModeRef.current === 'trace_adjust' && onChangeTraceSettingsRef.current && !e.ctrlKey && !e.metaKey) {
 const delta = -Math.sign(deltaY) * 0.05;
 onChangeTraceSettingsRef.current((prev) => {
 const currentScale = prev.scale ?? 1;
 const nextScale = Math.round(Math.max(0.2, Math.min(3.0, currentScale + delta)) * 100) / 100;
 return { ...prev, scale: nextScale };
 });
 return;
 }

 // 2. Alt + Wheel: Quick Brush / Eraser Size adjustment
 if (e.altKey && !e.ctrlKey && !e.metaKey) {
 const sizeDelta = -Math.sign(deltaY) * (e.shiftKey ? 10 : 2);
 if (toolModeRef.current === 'eraser') {
 setEraserSize((prev) => {
 const next = Math.max(2, Math.min(160, prev + sizeDelta));
 showCanvasToast(`消しゴムサイズ: ${next}px`);
 return next;
 });
 } else {
 if (onChangeBrushWidthRef.current) {
 const currentW = brushWidthRef.current || 28;
 const nextW = Math.max(1, Math.min(200, currentW + sizeDelta));
 onChangeBrushWidthRef.current(nextW);
 showCanvasToast(`筆太さ: ${nextW}px`);
 }
 }
 return;
 }

 // 3. Ctrl / Cmd + Wheel: Smooth Zoom centered at mouse pointer (10% to 3200%)
 if (e.ctrlKey || e.metaKey) {
 const zoomFactor = Math.pow(1.12, -deltaY / 100);
 setZoom((prevZoom) => {
 const nextZoom = Math.max(0.1, Math.min(32.0, prevZoom * zoomFactor));
 const scale = nextZoom / prevZoom;

 setPan((prevPan) => {
 const newPan = {
 x: mouseX - (mouseX - prevPan.x) * scale,
 y: mouseY - (mouseY - prevPan.y) * scale,
 };
 return clampPan(newPan, nextZoom);
 });

 return nextZoom;
 });
 return;
 }

 // 4. Shift + Wheel: Horizontal Scroll (Pan X)
 if (e.shiftKey) {
 const scrollAmount = Math.abs(deltaY) > Math.abs(deltaX) ? deltaY : deltaX;
 setPan((prevPan) => {
 const newPan = {
 x: prevPan.x - scrollAmount,
 y: prevPan.y,
 };
 return clampPan(newPan, zoomRef.current);
 });
 return;
 }

 // 5. Default Wheel (No modifier): Vertical Scroll (Pan Y) + Horizontal Scroll (deltaX)
 setPan((prevPan) => {
 const newPan = {
 x: prevPan.x - deltaX,
 y: prevPan.y - deltaY,
 };
 return clampPan(newPan, zoomRef.current);
 });
 };

 el.addEventListener('gesturestart', preventAll, { passive: false });
 el.addEventListener('gesturechange', preventAll, { passive: false });
 el.addEventListener('gestureend', preventAll, { passive: false });
 el.addEventListener('touchstart', handleTouchStart, { passive: false });
 el.addEventListener('touchmove', handleTouchMove, { passive: false });
 el.addEventListener('wheel', handleWheelNative, { passive: false });

 // Window level safety release: if finger, mouse, or pen is lifted outside canvas window or interrupted
 const handleWindowPointerUpOrCancel = (e: PointerEvent) => {
 setTouchLoupeState((prev) => (prev.visible ? { ...prev, visible: false } : prev));
 if (isErasingRef.current) {
 resetEraserVisuals();
 }
 if (e.pointerType === 'touch') {
 touchPointersRef.current.delete(e.pointerId);
 pointerTypesRef.current.delete(e.pointerId);
 if (touchPointersRef.current.size === 0) {
 if (isTwoFingerGestureRef.current) {
 twoFingerCooldownUntilRef.current = Date.now() + 150;
 if (Math.abs(zoomRef.current - zoom) > 0.001 || Math.abs(panRef.current.x - pan.x) > 0.5 || Math.abs(panRef.current.y - pan.y) > 0.5) {
 setZoom(zoomRef.current);
 setPan(panRef.current);
 }
 }
 isTwoFingerGestureRef.current = false;

 }
 } else if (e.pointerType === 'pen') {
 isPenDrawingRef.current = false;
 lastPenActiveTimeRef.current = Date.now();
 }
 };

 window.addEventListener('pointerup', handleWindowPointerUpOrCancel);
 window.addEventListener('pointercancel', handleWindowPointerUpOrCancel);

 return () => {
 el.removeEventListener('gesturestart', preventAll);
 el.removeEventListener('gesturechange', preventAll);
 el.removeEventListener('gestureend', preventAll);
 el.removeEventListener('touchstart', handleTouchStart);
 el.removeEventListener('touchmove', handleTouchMove);
 el.removeEventListener('wheel', handleWheelNative);
 window.removeEventListener('pointerup', handleWindowPointerUpOrCancel);
 window.removeEventListener('pointercancel', handleWindowPointerUpOrCancel);
 };
 }, [clampPan, showCanvasToast, zoom, pan]);
  // Trace Transform Hook (Extracted for modularity and isolation)
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
  }, [contours, resetEraserVisuals, setSelectedContourId, setSelectedContourIds, setSelectedHandleType, setSelectedNodeId]);

  // Switching glyphs must never carry an in-progress gesture into the next page.
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
  }, [selectedUnicode, resetBrushDrawing, resetEraserVisuals, setActivePenContour, setDraggingGuidelineId, setDraggingMetric, setSelectedContourIds, setSelectedHandleType, setSelectedNodeId, setShapeCurrentPoint, setShapeStartPoint, setTransformSession]);

 // Clear / Reset all contours of current character (文字を全クリア)
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

  // When reticle is OFF, user explicitly requested:
  // "OS標準カーソルにし、照準線やリングを完全非表示"
  if (!isReticleEnabled) {
   return 'default';
  }

  // Pen and Brush both use lightweight, native hardware-accelerated cursor
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
  // ---------------- POINTER EVENT DISPATCHER (Extracted hook) ----------------
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
    if (eraserReticleRef.current) {
      eraserReticleRef.current.style.display = 'none';
    }
    if (drawingReticleRef.current) {
      drawingReticleRef.current.style.display = 'none';
    }
    setHoverCanvasPos(null);
  }, [setHoverCanvasPos]);

  const handleLostPointerCapture = useCallback(() => {
    if (drawingReticleRef.current) {
      drawingReticleRef.current.style.display = 'none';
    }
    if (isErasingRef.current) {
      resetEraserVisuals();
    }
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
    setMarqueeSelection,
    nodeDragSessionRef,
  ]);


 // Zoom handlers
 const handleZoomIn = () => setZoom((z) => Math.min(3.0, z * 1.25));
 const handleZoomOut = () => setZoom((z) => Math.max(0.2, z * 0.8));
 const handleResetZoom = () => {
 if (containerRef.current) {
 const rect = containerRef.current.getBoundingClientRect();
 const idealZoom = Math.min((rect.width - 60) / upm, (rect.height - 60) / upm, 0.7);
 setZoom(idealZoom);
 setPan({
 x: (rect.width - upm * idealZoom) / 2,
 y: (rect.height - upm * idealZoom) / 2,
 });
 }
 };

  // Transform operations for active selection (extracted to useContourTransforms hook)
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
    setSelectedContourIds,
    setSelectedContourId,
    setSelectedNodeId,
    setSelectedHandleType,
    onChangeContours,
    onCommitHistory,
    showCanvasToast,
    smoothStrength,
    smoothPreserveCorners,
    penStrokeWidth,
    penCapStyle,
    activeBrushPathRef,
    activeBrushSvgDRef,
    activeEraserPathRef,
    activeEraserSvgDRef,
    brushStrokePointsRef,
  });



 // Memoized SVG Paths using WeakMap cache so panning, zooming, and adding new strokes do not recalculate existing complex curves
 const mainSvgPath = useMemo(() => {
 if (!contours || contours.length === 0) return '';
 return contours.map(getCachedContourSvgPath).join(' ');
 }, [contours]);
 const contourSvgMap = useMemo(() => {
 const map = new Map<string, string>();
 for (const c of contours) {
 map.set(c.id, getCachedContourSvgPath(c));
 }
 return map;
 }, [contours]);

 const selContours = useMemo(
 () => contours.filter((c) => selectedContourIds.includes(c.id) && c.nodes.length > 0),
 [contours, selectedContourIds]
 );
 const selectedContoursSvgPath = useMemo(
 () => (selContours.length > 0 ? contoursToSvgPath(selContours) : ''),
 [selContours]
 );
 const selContoursBBox = useMemo(
 () => (selContours.length > 0 ? getContoursBoundingBox(selContours) : null),
 [selContours]
 );

 // Callbacks for memoized layer interactions
 // Trace & guideline pointer callbacks provided by useTraceTransform & useCustomGuidelines
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

 {/* Mobile Focus Mode Top Exit Bar */}
 {isMobileFocusMode && (
 <div className="sm:hidden absolute top-2 right-2 z-30 flex items-center space-x-1 bg-stone-900/90 px-2 py-1 rounded-full border border-white/20 shadow-lg text-white">
 {onUndo && (
 <button
 onClick={onUndo}
 disabled={!canUndo}
 className="p-1 rounded-full hover:bg-white/20 disabled:opacity-30"
 title="1つ戻す"
 >
 <Undo className="w-3.5 h-3.5" />
 </button>
 )}
 {onRedo && (
 <button
 onClick={onRedo}
 disabled={!canRedo}
 className="p-1 rounded-full hover:bg-white/20 disabled:opacity-30"
 title="やり直す"
 >
 <Redo className="w-3.5 h-3.5" />
 </button>
 )}
 <div className="w-[1px] h-3 bg-white/30 mx-0.5" />
 <button
 onClick={() => setIsMobileFocusMode(false)}
 className="flex items-center space-x-1 px-1.5 py-0.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-[10px] font-bold text-white "
 >
 <Minimize className="w-3.5 h-3.5" />
 <span>完了</span>
 </button>
 </div>
 )}

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
 {/* Hand Tool Active Floating HUD Indicator (Compact & Unobtrusive) */}
 {(toolMode === 'hand' || isSpacePressed) && (
 <div
 className={`absolute top-11 left-2 sm:top-2.5 sm:left-2.5 z-30 px-2 py-0.5 rounded-md border flex items-center gap-1.5 text-[10.5px] font-semibold transition-all duration-150 pointer-events-none select-none max-w-fit ${
 isLight
 ? 'bg-white/95 border-emerald-300 text-emerald-900 shadow-sm'
 : 'bg-[#121c15]/95 border-emerald-700/60 text-emerald-200 shadow-sm'
 }`}
 >
 <div className="flex items-center gap-1 shrink-0 font-bold text-emerald-700 dark:text-emerald-300">
 <Hand className="w-3 h-3" />
 <span>手のひら</span>
 </div>
 <span className={`text-[9.5px] font-normal opacity-75 ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
 {isSpacePressed ? 'Space移動' : 'ドラッグ移動'}
 </span>
 </div>
 )}

        {/* Enhanced Trace Adjust Mode Active Floating HUD Bar */}
        <TraceAdjustFloatingHud
          toolMode={toolMode}
          traceSettings={traceSettings}
          onChangeTraceSettings={onChangeTraceSettings}
          handleResetTracePosition={handleResetTracePosition}
          handleResetTraceAll={handleResetTraceAll}
          onSetToolMode={onSetToolMode}
          showCanvasToast={showCanvasToast}
          isLight={isLight}
        />
  {/* Typography Guide Assist Card */}
  <GuideAssistOverlay
    showGuideAssist={showGuideAssist}
    handleToggleGuideAssist={handleToggleGuideAssist}
    isLight={isLight}
    activeChar={activeChar}
    traceSettings={traceSettings}
    handleResetTracePosition={handleResetTracePosition}
    onSetToolMode={onSetToolMode}
    onChangeTraceSettings={onChangeTraceSettings}
    showCanvasToast={showCanvasToast}
  />

  {/* Active Pen Tool Drawing In-Progress Draggable Floating HUD Bar */}
  <ActivePenDrawingHud
    activePenContour={activePenContour}
    penHudPos={penHudPos}
    isLight={isLight}
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
  />
 {/* SVG Canvas Stage */}
 <svg
 className="w-full h-full touch-none select-none"
 style={{
 touchAction: 'none',
 WebkitTouchCallout: 'none',
 WebkitUserSelect: 'none',
 userSelect: 'none',
 cursor: getCanvasCursor(),
 }}
 onPointerDown={handlePointerDown}
 onPointerEnter={(e) => {
 if (toolMode === 'brush' && drawingReticleRef.current && !isSpacePressed && !isPanning && gridSettings.showCursorCrosshair) {
 const pos = screenToCanvas(e.clientX, e.clientY);
 drawingReticleRef.current.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
 drawingReticleRef.current.style.display = '';
 }
 }}
 onPointerMove={handlePointerMove}
 onPointerUp={handlePointerUp}
 onPointerCancel={handlePointerCancel}
 onPointerLeave={handlePointerLeave}
 onLostPointerCapture={handleLostPointerCapture}
 onDoubleClick={(e) => {
 if (isAnyModalOpen) return;
 const clickPos = screenToCanvas(e.clientX, e.clientY);
 const hitContour = contours.find((c) => isPointNearContour(clickPos, c, 24 / zoom));
 if (hitContour) {
 if (onSetToolMode) {
 onSetToolMode('node');
 }
 setSelectedContourId(hitContour.id);
 setSelectedContourIds([hitContour.id]);
 setSelectedNodeId(null);
 setSelectedHandleType(null);
 showCanvasToast('ノード編集モードに切り替えました', 'アンカーポイントとハンドルを直接編集できます');
 }
 }}
 >
 <g
 ref={canvasGroupRef}
 transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
 >
 {/* 1. Base Canvas Background & Grid */}
 <CanvasBackgroundLayer
 isLight={isLight}
 theme={theme}
 showGrid={!!gridSettings.showGrid}
 gridSize={gridSettings.gridSize || 50}
 gridOpacity={gridSettings.gridOpacity ?? 30}
 unitsPerEm={upm}
 />

 {/* 2. Japanese Calligraphy / Layout Guides (Cross, Tian, Jiugong, Sixteen, Mi, Vertical Guides, BodyFrame, KanaFrame) */}
 <JapaneseGuidesLayer
 guideType={gridSettings.japaneseGuide}
 verticalGuide={gridSettings.verticalGuide}
 showBodyFrame={gridSettings.showBodyFrame}
 showKanaFrame={gridSettings.showKanaFrame}
 isLight={isLight}
 theme={theme}
 activeChar={activeChar}
 gridOpacity={gridSettings.gridOpacity ?? 30}
 unitsPerEm={upm}
 />

 {/* 3. Adjacent Character Context Boxes */}
 <AdjacentGlyphsLayer
 isLight={isLight}
 advanceWidth={advanceWidth}
 unitsPerEm={upm}
 />

 {/* 3.5 Glyph Overlay Comparison Layer */}
 <GlyphComparisonLayer
 overlaySettings={overlaySettings}
 project={project}
 isLight={isLight}
 activeChar={activeChar}
 activeUnicode={selectedUnicode}
 unitsPerEm={upm}
 />

 {/* 4. Trace Reference Image / Char Template Layer */}
 <TraceReferenceLayer
 traceSettings={traceSettings}
 isLight={isLight}
 activeChar={activeChar}
 selectedUnicode={selectedUnicode != null ? String(selectedUnicode) : undefined}
 toolMode={toolMode}
 unitsPerEm={upm}
 onPointerDownImage={handlePointerDownTraceImage}
 onPointerDownResize={handlePointerDownTraceResize}
 onDoubleClickReset={handleResetTracePosition}
 isResizing={isResizingTrace}
 />

 {/* 5. Top & Left Ruler Scales */}
 <CanvasRulersLayer
 showRulers={gridSettings.showRulers !== false}
 isLight={isLight}
 hoverPos={hoverCanvasPos}
 unitsPerEm={upm}
 />

 {/* 6. Typography Metrics Guidelines (LSB, RSB, Center X=500, Baseline, Ascender, etc.) */}
 <MetricsGuidesLayer
 showMetrics={!!gridSettings.showMetrics}
 lsb={lsb}
 advanceWidth={advanceWidth}
 activeChar={activeChar}
 isLight={isLight}
 showVerticalCenter={gridSettings.showVerticalCenter !== false}
 gridOpacity={gridSettings.gridOpacity ?? 30}
 unitsPerEm={upm}
 />

 {/* 7. User Custom Guidelines */}
 <CustomGuidelinesLayer
 customGuidelines={customGuidelines}
 zoom={zoom}
 unitsPerEm={upm}
 locked={
 (!isGuideEraserActive && lockGuidelines) ||
 toolMode === 'brush' ||
 toolMode === 'pen' ||
 toolMode === 'eraser' ||
 isShapeTool
 }
 interactive={isGuideEraserActive || (!lockGuidelines && (toolMode === 'select' || toolMode === 'ruler'))}
 isGuideEraserActive={isGuideEraserActive}
 onPointerDownGuide={handlePointerDownGuide}
 onDoubleClickGuide={handleDoubleClickGuide}
 onDeleteGuide={handleDeleteGuideline}
 />

 {/* 8. Interactive Measurement Tool Overlay */}
 {toolMode === 'ruler' && gridSettings.showRulers !== false && Boolean(rulerMeasurement) && (
 <RulerMeasurementLayer
 rulerMeasurement={rulerMeasurement}
 zoom={zoom}
 onDrawLine={handleDrawRulerAsStroke}
 onConvertToGuide={handleConvertRulerToGuideline}
 onClear={() => setRulerMeasurement(null)}
 />
 )}

 {/* 9. Main Glyph Vector Contours */}
 <MainGlyphContoursLayer
 contours={contours}
 mainSvgPath={mainSvgPath}
 isLight={isLight}
 theme={theme}
 outlineOnly={isOutlineMode}
 />

 {/* ---------------- INTERACTIVE CONTOUR HIT & SELECTION STROKES ---------------- */}
 <InteractiveContourHitLayer
  contours={contours}
  selectedContourIds={selectedContourIds}
  contourSvgMap={contourSvgMap}
  selectionColor={selectionColor}
  zoom={zoom}
  toolMode={toolMode}
  screenToCanvas={screenToCanvas}
  onChangeContours={onChangeContours}
  setSelectedContourId={setSelectedContourId}
  setSelectedContourIds={setSelectedContourIds}
  setSelectedNodeId={setSelectedNodeId}
  setSelectedHandleType={setSelectedHandleType}
  nodeDragSessionRef={nodeDragSessionRef}
  onCommitHistory={onCommitHistory}
  showCanvasToast={showCanvasToast}
  handleTransformPointerDown={handleTransformPointerDown}
  onSetToolMode={onSetToolMode}
 />

 {/* Marquee Selection Box */}
 {marqueeSelection && (
 <rect
 x={Math.min(marqueeSelection.start.x, marqueeSelection.current.x)}
 y={Math.min(marqueeSelection.start.y, marqueeSelection.current.y)}
 width={Math.abs(marqueeSelection.current.x - marqueeSelection.start.x)}
 height={Math.abs(marqueeSelection.current.y - marqueeSelection.start.y)}
 fill="rgba(16, 185, 129, 0.14)"
 stroke={selectionColor}
 strokeWidth={1.5 / zoom}
 strokeDasharray="4 2"
 pointerEvents="none"
 />
 )}


 {/* Active Brush Stroke in-progress (Hardware-accelerated live path) */}
 <path
 ref={activeBrushPathRef}
            d=""
 fill={isOutlineMode ? 'none' : inkFillColor}
          stroke={isOutlineMode ? (isLight ? '#0284c7' : '#38bdf8') : 'none'}
          strokeWidth={isOutlineMode ? 1.5 : 0}
 vectorEffect={isOutlineMode ? 'non-scaling-stroke' : undefined}
 fillRule="nonzero"
 pointerEvents="none"
 />

 {/* Active Cut Eraser Stroke in-progress */}
 <path
 ref={activeEraserPathRef}
 d=""
 fill="none"
 stroke="#f43f5e"
 strokeWidth={Math.max(8, eraserSize)}
 strokeLinecap="round"
 strokeLinejoin="round"
 strokeOpacity={0.65}
 pointerEvents="none"
 />

 {/* Active Shape in-progress */}
 {isShapeTool && activeShapeContours.length > 0 && (
 <path
 d={contoursToSvgPath(activeShapeContours)}
 fill={isOutlineMode ? 'none' : '#f59e0b'}
 fillOpacity={isOutlineMode ? 0 : 0.35}
 stroke="#f59e0b"
 strokeWidth={2}
 vectorEffect={isOutlineMode ? 'non-scaling-stroke' : undefined}
 fillRule="nonzero"
 pointerEvents="none"
 />
 )}

          {/* Selected Contour Highlight & Interactive Bounding Box Transform UI */}
          <TransformBoundingBoxLayer
            toolMode={toolMode}
            selectedContourIds={selectedContourIds}
            selContoursBBox={selContoursBBox}
            zoom={zoom}
            selectionColor={selectionColor}
            selectedContoursSvgPath={selectedContoursSvgPath}
            rotateDisplayAngle={rotateDisplayAngle}
            handleTransformPointerDown={handleTransformPointerDown}
            handleRotateSelected={handleRotateSelected}
            handleFlipHSelected={handleFlipHSelected}
            handleFlipVSelected={handleFlipVSelected}
            handleDuplicateSelected={handleDuplicateSelected}
            handleMergeSelectedContours={handleMergeSelectedContours}
            handleDeleteSelected={handleDeleteSelected}
            setSelectedContourIds={setSelectedContourIds}
            setSelectedNodeId={setSelectedNodeId}
            setSelectedHandleType={setSelectedHandleType}
          />

            {/* ---------------- BEZIER NODES & CONTROL HANDLES ---------------- */}
            <BezierNodeControlsLayer
              showNodes={showNodes}
              toolMode={toolMode}
              eraserMode={eraserMode}
              gridSettings={gridSettings}
              contours={contours}
              selectedContourId={selectedContourId}
              selectedNodeId={selectedNodeId}
              contourSvgMap={contourSvgMap}
              nodeStyle={nodeStyle}
              zoom={zoom}
              isLight={isLight}
              hoverCanvasPos={hoverCanvasPos}
              eraserSize={eraserSize}
              startNodeOrHandleDrag={startNodeOrHandleDrag}
              handleToggleNodeType={handleToggleNodeType}
            />

            {/* ---------------- ACTIVE PEN CONTOUR PATH & RUBBER-BAND ---------------- */}
            <ActivePenPreviewLayer
              activePenContour={activePenContour}
              penSvgPath={penSvgPath}
              penStrokeWidth={penStrokeWidth}
              penCapStyle={penCapStyle}
              penMousePos={penMousePos}
              hoverCanvasPos={hoverCanvasPos}
              zoom={zoom}
              selectionColor={selectionColor}
            />

            {/* ---------------- HIGH-CONTRAST CURSOR CROSSHAIR & DRAWING RETICLES ---------------- */}
            <CursorReticleOverlay
              gridSettings={gridSettings}
              hoverCanvasPos={hoverCanvasPos}
              toolMode={toolMode}
              zoom={zoom}
              selectionColor={selectionColor}
              drawingReticleRef={drawingReticleRef}
              eraserReticleRef={eraserReticleRef}
              brushWidth={brushWidth}
              eraserMode={eraserMode}
              eraserSize={eraserSize}
            />

            {/* ---------------- ACTIVE SMART SNAP GUIDELINES (BASELINE, LSB, METRICS, OTHER CONTOURS) ---------------- */}
            <SmartSnapGuidesLayer
              activeSnapGuides={activeSnapGuides}
              selectionColor={selectionColor}
              zoom={zoom}
            />
 </g>
 </svg>

        {/* Mobile & Tablet Precision Touch Loupe (Zoom Magnifier Lens) */}
        <CanvasTouchLoupe
          touchLoupeState={touchLoupeState}
          contours={contours}
          theme={theme}
          isOutlineMode={isOutlineMode}
        />



  {/* Dynamic Smooth Stroke & Operation Feedback Toast Notification */}
  <CanvasToastNotification
    canvasToast={canvasToast}
    isLight={isLight}
  />
 <CanvasStatusBar
          isBottomBarCollapsed={isBottomBarCollapsed}
          toggleBottomBarCollapse={toggleBottomBarCollapse}
          isLight={isLight}
          toolMode={toolMode}
          isSpacePressed={isSpacePressed}
          hoverCanvasPos={hoverCanvasPos}
          rulerMeasurement={rulerMeasurement}
          setRulerMeasurement={setRulerMeasurement}
          handleDrawRulerAsStroke={handleDrawRulerAsStroke}
          handleConvertRulerToGuideline={handleConvertRulerToGuideline}
          selectedNodeId={selectedNodeId}
          selectedContourId={selectedContourId}
          handleDeleteSelectedNode={handleDeleteSelectedNode}
          handleToggleNodeType={handleToggleNodeType}
          setIsMobileAuxMenuOpen={setIsMobileAuxMenuOpen}
          resetView={resetView}
          handleZoomStep={handleZoomStep}
          zoom={zoom}
          onChangeGridSettings={onChangeGridSettings}
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
          handleClearAllContours={handleClearAllContours}
          contours={contours}
          isOutlineMode={isOutlineMode}
          setOutlineOnly={setOutlineOnly}
          onOpenGlyphCompareModal={onOpenGlyphCompareModal}
          overlaySettings={overlaySettings}
          onToggleZenMode={onToggleZenMode}
          isZenMode={isZenMode}
        />

        {/* Mobile Canvas Bottom Sheet Drawer (Only visible on mobile when isMobileAuxMenuOpen === true) */}
        <MobileAuxMenuDrawer
          isOpen={isMobileAuxMenuOpen}
          onClose={() => setIsMobileAuxMenuOpen(false)}
          theme={theme}
          isLight={isLight}
          zoom={zoom}
          handleZoomStep={handleZoomStep}
          resetView={resetView}
          isOutlineMode={isOutlineMode}
          setOutlineOnly={setOutlineOnly}
          showCanvasToast={showCanvasToast}
          onToggleZenMode={onToggleZenMode}
          isZenMode={isZenMode}
          gridSettings={gridSettings}
          onChangeGridSettings={onChangeGridSettings}
          palmRejectionMode={palmRejectionMode}
          handleSetPalmRejectionMode={handleSetPalmRejectionMode}
          toolMode={toolMode}
          selectedNodeId={selectedNodeId}
          selectedContourId={selectedContourId}
          handleToggleNodeType={handleToggleNodeType}
          handleDeleteSelectedNode={handleDeleteSelectedNode}
          traceSettings={traceSettings}
          onChangeTraceSettings={onChangeTraceSettings}
          handleResetTracePosition={handleResetTracePosition}
          onOpenGlyphCompareModal={onOpenGlyphCompareModal}
          overlaySettings={overlaySettings}
          contours={contours}
          handleClearAllContours={handleClearAllContours}
        />

  {/* Mobile Selected Contour Quick Action Bar */}
  <MobileSelectionActionBar
    toolMode={toolMode}
    selectedContourIds={selectedContourIds}
    isLight={isLight}
    handleMergeSelectedContours={handleMergeSelectedContours}
    setShowMobilePartSheet={setShowMobilePartSheet}
    handleDuplicateSelected={handleDuplicateSelected}
    handleDeleteSelected={handleDeleteSelected}
    setSelectedContourIds={setSelectedContourIds}
    setSelectedNodeId={setSelectedNodeId}
  />
  </div>

  {/* Mobile Bottom Drawers / Action Sheets */}
        {/* Mobile Bottom Drawers / Action Sheets */}
        {/* 1. Part Transform Bottom Sheet */}
        <MobilePartTransformSheet
          isOpen={showMobilePartSheet}
          onClose={() => setShowMobilePartSheet(false)}
          isLight={isLight}
          selectedContourIds={selectedContourIds}
          handleMergeSelectedContours={handleMergeSelectedContours}
          handleFlipHSelected={handleFlipHSelected}
          handleFlipVSelected={handleFlipVSelected}
          handleRotateSelected={handleRotateSelected}
          handleSlantSelected={handleSlantSelected}
          handleScaleSelected={handleScaleSelected}
          handleDuplicateSelected={handleDuplicateSelected}
          handleSmoothStrokeSelected={handleSmoothStrokeSelected}
          handleSimplifySelected={handleSimplifySelected}
          handleDeleteSelected={handleDeleteSelected}
        />

        {/* 2. Mobile Brush Presets & Width Bottom Sheet */}
        <MobileBrushSettingsSheet
          isOpen={showMobileBrushSheet}
          onClose={() => setShowMobileBrushSheet(false)}
          isLight={isLight}
          brushWidth={brushWidth}
          onChangeBrushWidth={onChangeBrushWidth}
          pressureSensitivity={pressureSensitivity}
          onChangePressureSensitivity={onChangePressureSensitivity}
          smoothingIntensity={smoothingIntensity}
          onChangeSmoothingIntensity={onChangeSmoothingIntensity}
          brushStraightMode={brushStraightMode}
          setBrushStraightMode={setBrushStraightMode}
          showCanvasToast={showCanvasToast}
          brushStyle={brushStyle}
          onChangeBrushStyle={onChangeBrushStyle}
        />

 {/* 3. Guides & Grid Settings Modal / Sheet */}
        <GuidesAndGridModal
          isOpen={showMobileGuidesSheet}
          onClose={() => setShowMobileGuidesSheet(false)}
          isLight={isLight}
          gridSettings={gridSettings}
          onChangeGridSettings={onChangeGridSettings}
          upm={upm}
          isOutlineMode={isOutlineMode}
          setOutlineOnly={setOutlineOnly}
          nodeStyle={nodeStyle}
          setNodeStyle={setNodeStyle}
          showNodes={showNodes}
          setShowNodes={setShowNodes}
          customGuidelines={customGuidelines}
          setCustomGuidelines={setCustomGuidelines}
          lockGuidelines={lockGuidelines}
          setLockGuidelines={setLockGuidelines}
          showCanvasToast={showCanvasToast}
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
 return true;
});

