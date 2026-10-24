import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
import { useShapeCreation } from './canvas/hooks/useShapeCreation';
import { useRulerMeasure } from './canvas/hooks/useRulerMeasure';
import { usePenTool } from './canvas/hooks/usePenTool';
import { useCanvasEraser } from './canvas/hooks/useCanvasEraser';
import { InteractiveContourHitLayer } from './canvas/InteractiveContourHitLayer';


// High-contrast dual-ring + center dot precision reticle SVG cursor (32x32, hotspot 16 16)
// Provides 100% visibility against white canvas, dark glyphs, and grid lines
const HIGH_CONTRAST_RETICLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <circle cx="16" cy="16" r="7.5" fill="none" stroke="#ffffff" stroke-width="3.2" stroke-opacity="0.95"/>
  <circle cx="16" cy="16" r="7.5" fill="none" stroke="#047857" stroke-width="1.6"/>
  <line x1="16" y1="1" x2="16" y2="6.5" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
  <line x1="16" y1="25.5" x2="16" y2="31" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
  <line x1="1" y1="16" x2="6.5" y2="16" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
  <line x1="25.5" y1="16" x2="31" y2="16" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
  <line x1="16" y1="1.5" x2="16" y2="6.5" stroke="#047857" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="16" y1="25.5" x2="16" y2="30.5" stroke="#047857" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="1.5" y1="16" x2="6.5" y2="16" stroke="#047857" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="25.5" y1="16" x2="30.5" y2="16" stroke="#047857" stroke-width="1.5" stroke-linecap="round"/>
  <circle cx="16" cy="16" r="2.8" fill="#ffffff"/>
  <circle cx="16" cy="16" r="1.5" fill="#047857"/>
</svg>`;

const HIGH_CONTRAST_NODE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
  <path d="M4 2 L4 18 L8 14 L12 22 L14.5 21 L10.5 13 L16 13 Z" fill="#0f172a" stroke="#ffffff" stroke-width="1.8" stroke-linejoin="round"/>
  <circle cx="18" cy="18" r="4.5" fill="none" stroke="#ffffff" stroke-width="2.5"/>
  <circle cx="18" cy="18" r="4.5" fill="none" stroke="#059669" stroke-width="1.4"/>
  <circle cx="18" cy="18" r="1.8" fill="#10b981"/>
</svg>`;

const HIGH_CONTRAST_GRAB_CURSOR = 'grab';
const HIGH_CONTRAST_GRABBING_CURSOR = 'grabbing';
const HIGH_CONTRAST_PEN_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(HIGH_CONTRAST_RETICLE_SVG)}") 16 16, crosshair`;
const HIGH_CONTRAST_NODE_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(HIGH_CONTRAST_NODE_SVG)}") 4 2, default`;
const HIGH_CONTRAST_ANCHOR_ERASER_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(HIGH_CONTRAST_RETICLE_SVG)}") 16 16, crosshair`;
const HIGH_CONTRAST_ERASER_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(HIGH_CONTRAST_RETICLE_SVG)}") 16 16, crosshair`;
const HIGH_CONTRAST_CROSSHAIR_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(HIGH_CONTRAST_RETICLE_SVG)}") 16 16, crosshair`;

const contourSvgCache = new Map<string, string>();
const getCachedContourSvgPath = (c: PathContour): string => {
  const key = `${c.id}_${c.closed}_${c.nodes?.length}_${c.nodes?.[0]?.x}_${c.nodes?.[c.nodes?.length - 1]?.y}`;
  if (!contourSvgCache.has(key)) {
    contourSvgCache.set(key, contoursToSvgPath([c]));
  }
  return contourSvgCache.get(key)!;
};

export interface GlyphCanvasProps {
  contours: PathContour[];
  onChangeContours: (contours: PathContour[], options?: { skipHistory?: boolean }) => void;
  advanceWidth: number;
  lsb: number;
  onChangeAdvanceWidth: (w: number) => void;
  onChangeLsb: (lsb: number) => void;
  toolMode: ToolMode;
  onSetToolMode?: (mode: ToolMode) => void;
  brushWidth: number;
  brushStyle?: BrushStyle;
  onChangeBrushStyle?: (style: BrushStyle) => void;
  onChangeBrushWidth?: (w: number) => void;
  pressureSensitivity?: 'high' | 'normal' | 'low' | 'off';
  onChangePressureSensitivity?: (val: 'high' | 'normal' | 'low' | 'off') => void;
  pressureCurve?: PressureCurveConfig;
  smoothingIntensity?: number;
  onChangeSmoothingIntensity?: (val: number) => void;
  traceSettings: TraceSettings;
  onChangeTraceSettings?: React.Dispatch<React.SetStateAction<TraceSettings>>;
  selectedUnicode: number;
  gridSettings: GridSettings;
  onChangeGridSettings?: React.Dispatch<React.SetStateAction<GridSettings>>;
  activeChar: string;
  onSelectPrevGlyph?: () => void;
  onSelectNextGlyph?: () => void;
  onCommitHistory?: () => void;
  theme: ThemeMode;
  onCopyFromChar?: (char: string) => void;
  onGenerateDakutenTarget?: (char: string, isHandaku?: boolean) => void;
  onToggleGridDrawer?: () => void;
  showGridDrawer?: boolean;
  onToggleMetricsDrawer?: () => void;
  showMetricsDrawer?: boolean;
  onToggleRadicals?: () => void;
  showRadicals?: boolean;
  onToggleZenMode?: () => void;
  isZenMode?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onOpenPenPresetsModal?: () => void;
  activePenPreset?: UserPenPreset;
  isAnyModalOpen?: boolean;
  overlaySettings?: GlyphOverlaySettings;
  project: FontProject;
  onOpenGlyphCompareModal?: () => void;
  outlineOnly?: boolean;
  onChangeOutlineOnly?: (val: boolean) => void;
}

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

 const contoursRef = useRef<PathContour[]>(contours);

 const isLight = isLightTheme(theme);
 const themeClasses = getThemeClasses(theme);
 const selectionColor = themeClasses.selectionStroke || '#10b981';

 const inkFillColor = useMemo(() => {
 if (theme === 'sepia') return '#2d2217';
 if (theme === 'warm') return '#292019';
 if (theme === 'nord') return '#eceff4';
 if (theme === 'monochrome') return '#000000';
 return isLight ? '#1f2937' : '#ecfdf5';
 }, [theme, isLight]);

 const inkStrokeColor = useMemo(() => {
 if (theme === 'sepia') return '#8c673b';
 if (theme === 'warm') return '#ea580c';
 if (theme === 'nord') return '#88c0d0';
 if (theme === 'monochrome') return '#000000';
 return isLight ? '#065f46' : '#34d399';
 }, [theme, isLight]);

 // Pen Mode: 'bezier' (smooth bezier curves) or 'corner' (sharp angular polyline)
 const [penMode, setPenMode] = useState<'bezier' | 'corner'>('bezier');

 // Node Points Visibility Toggle (hides clutter when writing/viewing)
 const [showNodes, setShowNodes] = useState<boolean>(true);
 // Node appearance style: 'clean' (subtle elegant dots that keep glyph shape 100% visible), 'minimal' (active only), 'full' (standard boxes & handles)
 const [nodeStyle, setNodeStyle] = useState<'clean' | 'full' | 'selected_only'>('clean');

 // Outline-Only (Wireframe) Mode (輪郭表示): Turns glyph paths into outlines only so overlapping shapes, curves, and underlying guides are easily seen during editing
 const [internalOutlineOnly, setInternalOutlineOnly] = useState<boolean>(() => {
 try {
 return localStorage.getItem('glyph_canvas_outline_mode') === 'true';
 } catch {
 return false;
 }
 });

 const isOutlineMode = propOutlineOnly !== undefined ? propOutlineOnly : internalOutlineOnly;

 const setOutlineOnly = useCallback(
 (value: boolean | ((prev: boolean) => boolean)) => {
 const nextVal = typeof value === 'function' ? value(isOutlineMode) : value;
 if (onChangeOutlineOnly) {
 onChangeOutlineOnly(nextVal);
 }
 setInternalOutlineOnly(nextVal);
 try {
 localStorage.setItem('glyph_canvas_outline_mode', String(nextVal));
 } catch {}
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

 // Trace adjust dragging & resizing state
 const [isDraggingTrace, setIsDraggingTrace] = useState<boolean>(false);
 const [isResizingTrace, setIsResizingTrace] = useState<boolean>(false);
 const traceDragStartRef = useRef<{ clientX: number; clientY: number; initOffsetX: number; initOffsetY: number }>({
 clientX: 0,
 clientY: 0,
 initOffsetX: 0,
 initOffsetY: 0,
 });
 const traceResizeStartRef = useRef<{
 clientX: number;
 clientY: number;
 initScale: number;
 initDist: number;
 centerScreenX: number;
 centerScreenY: number;
 }>({
 clientX: 0,
 clientY: 0,
 initScale: 1,
 initDist: 1,
 centerScreenX: 0,
 centerScreenY: 0,
 });

 // Typography Writing Guide Assist Card state (Default to false so it doesn't obstruct the canvas)
 const [showGuideAssist, setShowGuideAssist] = useState<boolean>(() => {
 try {
 return localStorage.getItem('mojisaku_guide_assist_open') === 'true';
 } catch {
 return false;
 }
 });

 // Sub-toolbar visibility (collapsible to maximize canvas height)
 const [showSubToolbar, setShowSubToolbar] = useState<boolean>(() => {
 try {
 const val = localStorage.getItem('mojisaku_show_subtoolbar');
 return val !== null ? val === 'true' : true;
 } catch {
 return true;
 }
 });

 const handleToggleSubToolbar = useCallback(() => {
 setShowSubToolbar((prev) => {
 const next = !prev;
 try {
 localStorage.setItem('mojisaku_show_subtoolbar', String(next));
 } catch {}
 return next;
 });
 }, []);

 const handleToggleGuideAssist = useCallback((open?: boolean) => {
 setShowGuideAssist((prev) => {
 const next = typeof open === 'boolean' ? open : !prev;
 try {
 localStorage.setItem('mojisaku_guide_assist_open', String(next));
 } catch {}
 return next;
 });
 }, []);

 // Touch gesture state for pinch-to-zoom & two-finger pan
 const touchPointersRef = useRef<Map<number, Point>>(new Map());
 const pointerTypesRef = useRef<Map<number, string>>(new Map());
 const isPenDrawingRef = useRef<boolean>(false);
 const lastPenActiveTimeRef = useRef<number>(0);
 const isTwoFingerGestureRef = useRef<boolean>(false);
 const activeTwoFingerIdsRef = useRef<[number, number] | null>(null);
 const twoFingerCooldownUntilRef = useRef<number>(0);
 const twoFingerLastCenterRef = useRef<Point | null>(null);
 const twoFingerLastDistRef = useRef<number | null>(null);
 const twoFingerStartDistRef = useRef<number | null>(null);
 const twoFingerStartCenterRef = useRef<Point | null>(null);
 const pinchRafRef = useRef<number | null>(null);
 const pendingPinchStateRef = useRef<{ zoom: number; pan: Point } | null>(null);
 const panRafRef = useRef<number | null>(null);
 const pendingPanRef = useRef<Point | null>(null);
 const lastTapTimeRef = useRef<number>(0);
 const [isStylusActive, setIsStylusActive] = useState<boolean>(false);
 const isStylusActiveRef = useRef<boolean>(false);
 const [liveStylusPressure, setLiveStylusPressure] = useState<number | null>(null);
 const lastPressureValRef = useRef<number | null>(null);

 // When switching tool modes away from selection / node editing, automatically clear transient tool states
 useEffect(() => {
 if (toolMode !== 'select' && toolMode !== 'node') {
 setShowMobilePartSheet(false);
 }
 if (toolMode !== 'eraser') {
 isErasingRef.current = false;
 eraserStrokePointsRef.current = [];
 activeEraserSvgDRef.current = '';
 if (activeEraserPathRef.current) {
 activeEraserPathRef.current.setAttribute('d', '');
 }
 }
 if (toolMode !== 'ruler' || gridSettings.showRulers === false) {
 setRulerMeasurement(null);
 }
 }, [toolMode, gridSettings.showRulers]);
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
 try {
 const saved = localStorage.getItem('fontforge_auto_union_brush');
 return saved !== null ? saved === 'true' : true;
 } catch {
 return true;
 }
 });
 // 一筆書きの線が交差・重なった部分の白抜き防止（デフォルトON: ループ線を描いた時の中抜け・白抜きバグ感を防止）
 const [autoResolveBrushOverlap, setAutoResolveBrushOverlap] = useState<boolean>(() => {
 try {
 const saved = localStorage.getItem('fontforge_auto_resolve_brush_overlap');
 return saved !== null ? saved === 'true' : true;
 } catch {
 return true;
 }
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
 if (pinchRafRef.current != null) {
 cancelAnimationFrame(pinchRafRef.current);
 }
 if (panRafRef.current != null) {
 cancelAnimationFrame(panRafRef.current);
 }
 };
 }, []);

 // Active Smart Snap Guidelines (Baseline, LSB, Metrics, Other Contours, Grid)
 const [activeSnapGuides, setActiveSnapGuides] = useState<SnapGuideLine[]>([]);

 // User Custom Guidelines (Created by dragging from Top or Left Rulers)
 const [customGuidelines, setCustomGuidelines] = useState<CustomGuideline[]>([]);
 const [lockGuidelines, setLockGuidelines] = useState<boolean>(true);
 const [draggingGuidelineId, setDraggingGuidelineId] = useState<string | null>(null);
 const [newGuidelineType, setNewGuidelineType] = useState<'h' | 'v' | null>(null);

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
    isShapeTool,
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

 // Guideline Eraser Mode State
 const [isGuideEraserActive, setIsGuideEraserActive] = useState<boolean>(false);

 // Delete an individual guideline
 const handleDeleteGuideline = useCallback((guideId: string) => {
 setCustomGuidelines((prev) => prev.filter((g) => g.id !== guideId));
 showCanvasToast('ガイド線を削除しました');
 }, [setCustomGuidelines, showCanvasToast]);

 // Clear all custom guidelines
 const handleClearAllGuidelines = useCallback(() => {
 if (customGuidelines.length === 0) return;
 setCustomGuidelines([]);
 showCanvasToast('すべてのカスタムガイド線を消去しました');
 }, [customGuidelines.length, setCustomGuidelines, showCanvasToast]);

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
 activeTwoFingerIdsRef.current = null;
 twoFingerLastCenterRef.current = null;
 twoFingerLastDistRef.current = null;
 twoFingerStartDistRef.current = null;
 twoFingerStartCenterRef.current = null;
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

 // Reset trace position offset back to (0, 0) (Center)
 const handleResetTracePosition = useCallback(() => {
 if (!onChangeTraceSettings) return;
 onChangeTraceSettings((prev) => ({
 ...prev,
 offsetX: 0,
 offsetY: 0,
 rotation: 0,
 }));
 showCanvasToast('下絵の位置を中央(X:0, Y:0)にリセットしました');
 }, [onChangeTraceSettings, showCanvasToast]);

 // Reset trace position AND scale back to standard
 const handleResetTraceAll = useCallback(() => {
 if (!onChangeTraceSettings) return;
 const isKana = /[ぁ-んァ-ヶー]/.test(traceSettings.text || activeChar || '');
 const isKanji = /[\u4e00-\u9faf\u3400-\u4dbf]/.test(traceSettings.text || activeChar || '');
 const defaultScale = isKana ? 0.78 : isKanji ? 0.85 : 1.0;
 onChangeTraceSettings((prev) => ({
 ...prev,
 offsetX: 0,
 offsetY: 0,
 scale: defaultScale,
 rotation: 0,
 }));
 showCanvasToast(`下絵の位置とサイズ(${Math.round(defaultScale * 100)}%)をリセットしました`);
 }, [onChangeTraceSettings, showCanvasToast, traceSettings.text, activeChar]);


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

 // ---------------- POINTER EVENT HANDLERS ----------------

 const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
 // Only capture pointer for non-touch (mouse/pen) to prevent WebKit / iOS multi-touch cancellation glitches
 if (e.pointerType !== 'touch') {
 try {
 (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
 } catch {
 // Ignored for non-capturable pointers in certain mobile browsers
 }
 }
 pointerTypesRef.current.set(e.pointerId, e.pointerType);
 touchPointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

 if (containerRef.current) {
 containerRectRef.current = containerRef.current.getBoundingClientRect();
 }

 // Spacebar or Middle Mouse or Hand tool = Pan canvas (HIGHEST PRIORITY)
 if (toolMode === 'hand' || e.button === 1 || isSpacePressed) {
 if (e.button === 1 && e.cancelable) {
 e.preventDefault();
 }
 setIsPanning(true);
 panStartRef.current = { x: e.clientX - panRef.current.x, y: e.clientY - panRef.current.y };
 return;
 }

 // Block non-left clicks (e.g. right click, back/forward buttons) from starting strokes
 if (e.pointerType === 'mouse' && e.button !== 0) {
 return;
 }

 // Stylus / Apple Pencil detection (Pen takes absolute priority)
 const isPen = e.pointerType === 'pen';
 if (isPen) {
 isPenDrawingRef.current = true;
 lastPenActiveTimeRef.current = Date.now();
 // Immediately cancel any conflicting touch gesture if Apple Pencil touches the screen
 isTwoFingerGestureRef.current = false;
 activeTwoFingerIdsRef.current = null;
 if (!isStylusActiveRef.current) {
 isStylusActiveRef.current = true;
 setIsStylusActive(true);
 }
 if (e.pressure && e.pressure > 0) {
 lastPressureValRef.current = Math.round(e.pressure * 100);
 }
 }

 // Cooldown check for touch: do not start single-finger drawing immediately after a 2-finger gesture ends
 if (e.pointerType === 'touch' && twoFingerCooldownUntilRef.current > Date.now()) {
 return;
 }

 // Track multi-touch tap gestures
 if (e.pointerType === 'touch') {
 const currentTouchCount = touchPointersRef.current.size;
 if (currentTouchCount === 1) {
 touchStartTimeRef.current = Date.now();
 maxTouchCountRef.current = 1;
 hasMovedSignificantRef.current = false;
 } else {
 maxTouchCountRef.current = Math.max(maxTouchCountRef.current, currentTouchCount);
 }
 }

 // PALM REJECTION for iPad & Stylus:
 // If palm rejection is active (auto when stylus was recently active or strict_pen_only), ignore accidental palm/finger drawing!
 const isPenRecentlyActive = Date.now() - lastPenActiveTimeRef.current < 1500;
 const isPalmRejectionActive =
 palmRejectionMode === 'strict_pen_only' ||
 (palmRejectionMode === 'auto' && (isPenDrawingRef.current || isPenRecentlyActive));

 if (e.pointerType === 'touch' && isPalmRejectionActive && !isPenDrawingRef.current) {
 // If 1 finger touch during active palm rejection, ignore canvas stroke to prevent stray marks
 if (touchPointersRef.current.size === 1) {
 // Allow metric dragging if right on guide
 const posCheck = screenToCanvas(e.clientX, e.clientY);
 const hitThreshold = 30 / zoomRef.current;
 if (Math.abs(posCheck.x - lsb) <= hitThreshold || Math.abs(posCheck.x - advanceWidth) <= hitThreshold) {
 // Allow guideline adjustment
 } else {
 showCanvasToast('パームリジェクション', 'ペン先以外の接触を自動ブロック中');
 return;
 }
 }
 }

 // If stylus is currently drawing or was active within 200ms, ignore touch input completely
 if (e.pointerType === 'touch' && (isPenDrawingRef.current || (Date.now() - lastPenActiveTimeRef.current < 200))) {
 return;
 }

 // Multi-touch gesture (Pinch-to-zoom & 2-Finger Pan)
 // Only pure finger touches trigger pinch zoom / 2-finger pan
 const fingerTouches = Array.from(touchPointersRef.current.entries())
 .filter(([id]) => pointerTypesRef.current.get(id) === 'touch');

 if (fingerTouches.length >= 2 && !isPenDrawingRef.current) {
 isTwoFingerGestureRef.current = true;
 activeTwoFingerIdsRef.current = [fingerTouches[0][0], fingerTouches[1][0]];

 // Immediately cancel any single-touch drawings in progress to prevent accidental blobs or stray strokes
 brushStrokePointsRef.current = [];
 if (activeBrushPathRef.current) {
 activeBrushPathRef.current.setAttribute('d', '');
 }
 setShapeStartPoint(null);
 setShapeCurrentPoint(null);
 setMarqueeSelection(null);
 setDraggingMetric(null);
 setDraggingGuidelineId(null);
 setIsDraggingTrace(false);
 setIsResizingTrace(false);
 setTransformSession(null);
 isErasingRef.current = false;
 lastErasePosRef.current = null;

 // If pen contour was just started by finger 1 (single node), discard it so pinch doesn't leave stray node
 if (activePenContour && activePenContour.nodes.length <= 1) {
 setActivePenContour(null);
 setSelectedNodeId(null);
 }

 const p1 = fingerTouches[0][1];
 const p2 = fingerTouches[1][1];
 const dist = Math.max(10, Math.hypot(p1.x - p2.x, p1.y - p2.y));
 const center = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

 twoFingerLastCenterRef.current = center;
 twoFingerLastDistRef.current = dist;
 twoFingerStartDistRef.current = dist;
 twoFingerStartCenterRef.current = center;
 return;
 }

 // Double tap on mobile screen -> quick toggle Fit / 100% (only in select or hand tool to avoid interrupting drawing)
 if (e.pointerType === 'touch' && (toolMode === 'select' || (toolMode as string) === 'hand')) {
 const now = Date.now();
 if (now - lastTapTimeRef.current < 300 && touchPointersRef.current.size === 1) {
 if (Math.abs(zoom - 1.0) < 0.08) {
 resetView('fit');
 showCanvasToast('画面にフィット');
 } else {
 resetView('100%');
 showCanvasToast('100% 等倍表示');
 }
 lastTapTimeRef.current = 0;
 return;
 }
 lastTapTimeRef.current = now;
 }

 const pos = screenToCanvas(e.clientX, e.clientY);
 const isTouch = e.pointerType === 'touch';
 const metricHitDist = isTouch ? Math.max(30 / zoom, 26) : 18 / zoom;

 // Metrics drag detection (LSB or RSB)
 // Guard against accidental vertical line dragging during drawing tools or when guidelines are locked
 const isDrawingTool = toolMode === 'brush' || toolMode === 'pen' || toolMode === 'eraser' || isShapeTool;
 const isMetricDragAllowed = !lockGuidelines && !isDrawingTool && (toolMode === 'select' || toolMode === 'ruler');

 if (isMetricDragAllowed) {
 if (Math.abs(pos.x - lsb) <= metricHitDist) {
 setDraggingMetric('lsb');
 return;
 }
 if (Math.abs(pos.x - advanceWidth) <= metricHitDist) {
 setDraggingMetric('rsb');
 return;
 }
 } else if (lockGuidelines && toolMode === 'select' && (Math.abs(pos.x - lsb) <= metricHitDist || Math.abs(pos.x - advanceWidth) <= metricHitDist)) {
 showCanvasToast('ガイド・文字幅線はロックされています', 'ヘッダーの鍵アイコンでロック解除できます');
 }

 // TRACE ADJUST DRAG
 if (toolMode === 'trace_adjust') {
 setIsDraggingTrace(true);
 traceDragStartRef.current = {
 clientX: e.clientX,
 clientY: e.clientY,
 initOffsetX: traceSettings.offsetX || 0,
 initOffsetY: traceSettings.offsetY || 0,
 };
 return;
 }

 // RULER / MEASUREMENT TOOL
 if (toolMode === 'ruler') {
 handleRulerPointerDown(pos, e);
 return;
 }

 // 選択中は誤描画を防止：輪郭やノードを選択している間はキャンバスへの新規書き込みをロック
 // タップ/クリックで選択を解除し、再度描画できるようにする
 const hasActiveSelection =
 selectedContourIds.length > 0 ||
 (selectedNodeId !== null && !activePenContour);

 // Auto-clear active selection on start drawing or erasing so user can directly interact immediately
 if (
 hasActiveSelection &&
 (toolMode === 'brush' || toolMode === 'pen' || toolMode === 'eraser' || isShapeTool)
 ) {
 setSelectedContourIds([]);
 setSelectedContourId(null);
 setSelectedNodeId(null);
 setSelectedHandleType(null);
 }

 // PEN TOOL
 if (toolMode === 'pen') {
 let penPos = pos;
 if (!e.altKey && (gridSettings.snapToGuides !== false || gridSettings.snapToGrid)) {
 const snapRes = snapSinglePoint(
 pos,
 contours,
 snapMetrics,
 customGuidelines,
 Math.max(7, Math.round(12 / zoom)),
 gridSettings
 );
 penPos = snapRes.point;
 setActiveSnapGuides(snapRes.activeGuides);
 }

 if (!activePenContour) {
 // Start new path
 const firstNode: BezierNode = {
 id: generateId(),
 x: penPos.x,
 y: penPos.y,
 type: penMode === 'corner' ? 'corner' : 'smooth',
 };
 const newContour: PathContour = {
 id: generateId(),
 closed: false,
 nodes: [firstNode],
 };
 setActivePenContour(newContour);
 setSelectedContourId(newContour.id);
 setSelectedNodeId(firstNode.id);
 if (penMode === 'bezier') {
 setSelectedHandleType('handleOut');
 } else {
 setSelectedHandleType(null);
 }
 } else {
 const firstNode = activePenContour.nodes[0];
 const distToStart = Math.hypot(penPos.x - firstNode.x, penPos.y - firstNode.y);

 // Closing path if clicked near start node
 if (activePenContour.nodes.length >= 2 && distToStart <= 24 / zoom) {
 handleFinishPenContour(true);
 return;
 }

 // Add new node
 const newNode: BezierNode = {
 id: generateId(),
 x: penPos.x,
 y: penPos.y,
 type: penMode === 'corner' ? 'corner' : 'smooth',
 };
 const updated = {
 ...activePenContour,
 nodes: [...activePenContour.nodes, newNode],
 };
 setActivePenContour(updated);
 setSelectedNodeId(newNode.id);
 if (penMode === 'bezier') {
 setSelectedHandleType('handleOut');
 } else {
 setSelectedHandleType(null);
 }
 }
 return;
 }

 // BRUSH TOOL (With Stylus / Apple Pencil pressure tracking & Straight Line Assist)
 if (toolMode === 'brush') {
 handleBrushPointerDown(e, pos);
 return;
 }

 // SHAPES
 if (isShapeTool) {
 handleShapePointerDown(pos, e);
 return;
 }

 // ERASER TOOL
 if (toolMode === 'eraser') {
 handleEraserPointerDown(pos, e);
 return;
 }

 // SELECT / NODE TOOL
 if (toolMode === 'select' || toolMode === 'node') {
 const handledNode = handleNodePointerDownOnCanvas(pos, e);
 if (!handledNode && toolMode === 'select') {
 setMarqueeSelection({ start: pos, current: pos });
 }
 }
 };

 const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
 // Pen takes absolute priority
 if (e.pointerType === 'pen') {
 isPenDrawingRef.current = true;
 lastPenActiveTimeRef.current = Date.now();
 isTwoFingerGestureRef.current = false;
 activeTwoFingerIdsRef.current = null;
 }

 // Palm rejection: ignore accidental resting palm movement while stylus is active or recently active
 if (e.pointerType === 'touch' && (isPenDrawingRef.current || (Date.now() - lastPenActiveTimeRef.current < 250))) {
 return;
 }
 touchPointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

 // Track movement for multi-touch tap gestures
 if (e.pointerType === 'touch' && !hasMovedSignificantRef.current) {
 hasMovedSignificantRef.current = true;
 }

 // Handle 2-finger pinch zoom and fluid two-finger pan (pure finger touches only)
 const fingerTouches = Array.from(touchPointersRef.current.entries())
 .filter(([id]) => pointerTypesRef.current.get(id) === 'touch');

 if (fingerTouches.length >= 2 && !isPenDrawingRef.current) {
 isTwoFingerGestureRef.current = true;

 // Select stable pair of touch points to prevent jumpiness if 3+ touches occur
 let p1: Point;
 let p2: Point;
 const trackedIds = activeTwoFingerIdsRef.current;
 if (trackedIds && touchPointersRef.current.has(trackedIds[0]) && touchPointersRef.current.has(trackedIds[1])) {
 p1 = touchPointersRef.current.get(trackedIds[0])!;
 p2 = touchPointersRef.current.get(trackedIds[1])!;
 } else {
 activeTwoFingerIdsRef.current = [fingerTouches[0][0], fingerTouches[1][0]];
 p1 = fingerTouches[0][1];
 p2 = fingerTouches[1][1];
 }

 const currDist = Math.max(10, Math.hypot(p1.x - p2.x, p1.y - p2.y));
 const currCenter = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

 if (!twoFingerLastCenterRef.current || !twoFingerLastDistRef.current) {
 twoFingerLastCenterRef.current = currCenter;
 twoFingerLastDistRef.current = currDist;
 twoFingerStartDistRef.current = currDist;
 twoFingerStartCenterRef.current = currCenter;
 return;
 }

 const dx = currCenter.x - twoFingerLastCenterRef.current.x;
 const dy = currCenter.y - twoFingerLastCenterRef.current.y;
 const lastDist = twoFingerLastDistRef.current;

 // Calculate scale step with smooth deadzone for pure pan
 let scaleStep = currDist / lastDist;
 const startDist = twoFingerStartDistRef.current || currDist;
 const totalRatioFromStart = currDist / startDist;

 // If finger distance stayed within ±6% of start, prioritize pure butter-smooth pan with no zoom jitter
 if (Math.abs(totalRatioFromStart - 1.0) < 0.06) {
 scaleStep = 1.0;
 } else {
 // Softly clamp per-frame step to prevent erratic jumps
 scaleStep = Math.max(0.86, Math.min(1.16, scaleStep));
 }

 const rect = containerRectRef.current || (containerRef.current ? containerRef.current.getBoundingClientRect() : null);
 const centerScreenX = rect ? (currCenter.x - rect.left) : currCenter.x;
 const centerScreenY = rect ? (currCenter.y - rect.top) : currCenter.y;

 const currentZoom = zoomRef.current;
 const currentPan = panRef.current;

 const nextZoom = Math.max(0.35, Math.min(5.0, currentZoom * scaleStep));
 const actualScaleChange = nextZoom / currentZoom;

 const nextPanX = centerScreenX - (centerScreenX - currentPan.x) * actualScaleChange + dx;
 const nextPanY = centerScreenY - (centerScreenY - currentPan.y) * actualScaleChange + dy;
 const nextPan = clampPan({ x: nextPanX, y: nextPanY }, nextZoom);

 twoFingerLastCenterRef.current = currCenter;
 twoFingerLastDistRef.current = currDist;
 zoomRef.current = nextZoom;
 panRef.current = nextPan;

 // Direct hardware-accelerated DOM transform during live pinch zoom
 if (canvasGroupRef.current) {
 canvasGroupRef.current.setAttribute(
 'transform',
 `translate(${nextPan.x}, ${nextPan.y}) scale(${nextZoom})`
 );
 }
 return;
 }

 // If currently in a two-finger gesture or within exit cooldown, strictly block single-finger canvas drawings
 if (isTwoFingerGestureRef.current || (e.pointerType === 'touch' && twoFingerCooldownUntilRef.current > Date.now())) {
 return;
 }

 if (isPanning) {
 const nextPan = clampPan({
 x: e.clientX - panStartRef.current.x,
 y: e.clientY - panStartRef.current.y,
 }, zoomRef.current);
 panRef.current = nextPan;

 if (canvasGroupRef.current) {
 canvasGroupRef.current.setAttribute(
 'transform',
 `translate(${nextPan.x}, ${nextPan.y}) scale(${zoomRef.current})`
 );
 }
 return;
 }

 // Dragging trace image position
 if (isDraggingTrace && onChangeTraceSettings) {
 const deltaX = (e.clientX - traceDragStartRef.current.clientX) / zoom;
 const deltaY = (e.clientY - traceDragStartRef.current.clientY) / zoom;
 onChangeTraceSettings((prev) => ({
 ...prev,
 offsetX: Math.round(traceDragStartRef.current.initOffsetX + deltaX),
 offsetY: Math.round(traceDragStartRef.current.initOffsetY + deltaY),
 }));
 return;
 }

 // Resizing trace image / char scale from corner handle
 if (isResizingTrace && onChangeTraceSettings) {
 const { centerScreenX, centerScreenY, initDist, initScale } = traceResizeStartRef.current;
 const currentDist = Math.hypot(e.clientX - centerScreenX, e.clientY - centerScreenY);
 const ratio = currentDist / initDist;
 const rawScale = initScale * ratio;
 const nextScale = Math.round(Math.max(0.2, Math.min(3.0, rawScale)) * 100) / 100;
 onChangeTraceSettings((prev) => ({
 ...prev,
 scale: nextScale,
 }));
 return;
 }

 const pos = screenToCanvas(e.clientX, e.clientY);
 
 // Instantaneous direct hardware DOM update for eraser reticle (0ms latency, bypasses React render tree)
 if (toolMode === 'eraser' && eraserReticleRef.current) {
  if (!gridSettings.showCursorCrosshair || isSpacePressed || isPanning) {
   if (eraserReticleRef.current.style.display !== 'none') {
    eraserReticleRef.current.style.display = 'none';
   }
  } else {
   eraserReticleRef.current.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
   if (eraserReticleRef.current.style.display === 'none') {
    eraserReticleRef.current.style.display = '';
   }
  }
 }

 // Instantaneous direct hardware DOM update for brush drawing reticle (0ms latency, bypasses React render tree)
 if (toolMode === 'brush' && drawingReticleRef.current) {
  if (!gridSettings.showCursorCrosshair || isSpacePressed || isPanning) {
   if (drawingReticleRef.current.style.display !== 'none') {
    drawingReticleRef.current.style.display = 'none';
   }
  } else {
   drawingReticleRef.current.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
   if (drawingReticleRef.current.style.display === 'none') {
    drawingReticleRef.current.style.display = '';
   }
  }
 }

 // Only update hover cursor coordinates when crosshair, ruler, or pen tool is active, and NOT during panning or active stroke drawing
 const isActivelyDrawing = brushStrokePointsRef.current.length > 0 || isPenDrawingRef.current;
 const isDrawingOrPanning =
 isActivelyDrawing ||
 isShapeTool ||
 isSpacePressed ||
 isPanning;

 const needsHoverPos =
 Boolean(gridSettings.showCursorCrosshair) ||
 (toolMode === 'pen' && Boolean(activePenContour)) ||
 (toolMode === 'eraser' && eraserMode === 'node');

 if (needsHoverPos && !isDrawingOrPanning) {
 if (hoverRafRef.current == null) {
 hoverRafRef.current = requestAnimationFrame(() => {
 hoverRafRef.current = null;
 setHoverCanvasPos(pos);
 });
 }
 } else if (!needsHoverPos && hoverCanvasPos !== null) {
 setHoverCanvasPos(null);
 }

 // Active Custom Guideline Drag
 if (draggingGuidelineId) {
 setCustomGuidelines((prev) =>
 prev.map((g) => {
 if (g.id !== draggingGuidelineId) return g;
 return {
 ...g,
 position: g.type === 'v' ? Math.max(0, Math.min(upm, pos.x)) : Math.max(0, Math.min(upm, pos.y)),
 };
 })
 );
 return;
 }

 // New Guideline Dragging from Rulers
 if (newGuidelineType) {
 // Keep tracking
 return;
 }

 // Active Ruler Measurement Drag
 if (toolMode === 'ruler' && rulerMeasurement && rulerMeasurement.active) {
 handleRulerPointerMove(pos, e);
 return;
 }

 // Metric lines drag
 if (draggingMetric === 'lsb') {
 onChangeLsb(Math.max(0, Math.min(pos.x, advanceWidth - 50)));
 return;
 }
 if (draggingMetric === 'rsb') {
 onChangeAdvanceWidth(Math.max(lsb + 50, Math.min(2000, pos.x)));
 return;
 }

 // Marquee rectangular drag selection
 if (marqueeSelection) {
 setMarqueeSelection((prev) => (prev ? { ...prev, current: pos } : null));
 return;
 }

  // ---------------- ACTIVE BOUNDING BOX TRANSFORMATION DRAG ----------------
  if (handleTransformPointerMove(pos, e)) {
    return;
  }

 // Eraser Tool continuous sweep-erase while dragging
 if (toolMode === 'eraser' && isErasingRef.current) {
 handleEraserPointerMove(pos);
 return;
 }

 if (toolMode === 'brush') {
 if (handleBrushPointerMove(e)) return;
 }

 // Shapes in-progress
 if (isShapeTool && shapeStartPoint) {
 handleShapePointerMove(pos, e);
 return;
 }

 // Pen tool hover rubber-band
 if (toolMode === 'pen' && activePenContour) {
 setPenMousePos(pos);
 // If dragging while creating node -> adjust handleOut
 if (selectedNodeId && selectedHandleType === 'handleOut') {
 const updatedNodes = activePenContour.nodes.map((node) => {
 if (node.id === selectedNodeId) {
 const dx = pos.x - node.x;
 const dy = pos.y - node.y;
 return {
 ...node,
 handleOut: { x: pos.x, y: pos.y },
 handleIn: { x: node.x - dx, y: node.y - dy },
 type: 'smooth' as const,
 };
 }
 return node;
 });
 setActivePenContour({ ...activePenContour, nodes: updatedNodes });
 }
 return;
 }

 // Select/Node Dragging (Ref-accelerated 0ms latency synchronous tracking)
 if (handleNodeDragMove(e, pos)) {
  return;
 }
 };


 const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
 setTouchLoupeState((prev) => (prev.visible ? { ...prev, visible: false } : prev));
 try {
 if (e.currentTarget?.hasPointerCapture?.(e.pointerId)) {
 e.currentTarget.releasePointerCapture(e.pointerId);
 }
 } catch {
 // Ignored
 }
 const wasTouch = e.pointerType === 'touch';
 touchPointersRef.current.delete(e.pointerId);
 pointerTypesRef.current.delete(e.pointerId);
 if (e.pointerType === 'pen') {
 isPenDrawingRef.current = false;
 lastPenActiveTimeRef.current = Date.now();
 if (lastPressureValRef.current !== null) {
 setLiveStylusPressure(lastPressureValRef.current);
 }
 }

 const remainingTouches = Array.from(touchPointersRef.current.entries())
 .filter(([id]) => pointerTypesRef.current.get(id) === 'touch');

 // If down to 1 or 0 fingers from a two-finger gesture:
 if (remainingTouches.length >= 2) {
 // Still 2 or more fingers (e.g. 3 fingers touched, 1 lifted): re-anchor seamlessly
 activeTwoFingerIdsRef.current = [remainingTouches[0][0], remainingTouches[1][0]];
 const p1 = remainingTouches[0][1];
 const p2 = remainingTouches[1][1];
 const dist = Math.max(10, Math.hypot(p1.x - p2.x, p1.y - p2.y));
 const center = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
 twoFingerLastCenterRef.current = center;
 twoFingerLastDistRef.current = dist;
 twoFingerStartDistRef.current = dist;
 twoFingerStartCenterRef.current = center;
 } else {
 twoFingerLastCenterRef.current = null;
 twoFingerLastDistRef.current = null;
 twoFingerStartDistRef.current = null;
 twoFingerStartCenterRef.current = null;
 }

 // Check for 2-finger tap (Undo) or 3-finger tap (Redo) when all fingers leave screen
 if (wasTouch && touchPointersRef.current.size === 0) {
 const duration = Date.now() - touchStartTimeRef.current;
 const touchCount = maxTouchCountRef.current;
 const didNotMove = !hasMovedSignificantRef.current;

 // Reset gesture tracking
 maxTouchCountRef.current = 0;
 hasMovedSignificantRef.current = false;

 if (duration < 380 && didNotMove) {
 if (touchCount === 2) {
 if (onUndo) {
 onUndo();
 isTwoFingerGestureRef.current = false;
 twoFingerCooldownUntilRef.current = Date.now() + 150;
 activeTwoFingerIdsRef.current = null;
 return;
 }
 } else if (touchCount === 3) {
 if (onRedo) {
 onRedo();
 isTwoFingerGestureRef.current = false;
 twoFingerCooldownUntilRef.current = Date.now() + 150;
 activeTwoFingerIdsRef.current = null;
 return;
 }
 }
 }
 }

 // If we were in a two-finger gesture, do not commit any drawing or shape actions
 if (isTwoFingerGestureRef.current) {
 if (touchPointersRef.current.size === 0) {
 isTwoFingerGestureRef.current = false;
 twoFingerCooldownUntilRef.current = Date.now() + 150;
 activeTwoFingerIdsRef.current = null;
 }
 if (Math.abs(zoomRef.current - zoom) > 0.001 || Math.abs(panRef.current.x - pan.x) > 0.5 || Math.abs(panRef.current.y - pan.y) > 0.5) {
 setZoom(zoomRef.current);
 setPan(panRef.current);
 }
 return;
 }

 if (touchPointersRef.current.size < 2) {
 twoFingerLastCenterRef.current = null;
 twoFingerLastDistRef.current = null;
 twoFingerStartDistRef.current = null;
 twoFingerStartCenterRef.current = null;
 }

 if (pinchRafRef.current != null) {
 cancelAnimationFrame(pinchRafRef.current);
 pinchRafRef.current = null;
 }
 if (pendingPinchStateRef.current) {
 setZoom(pendingPinchStateRef.current.zoom);
 setPan(pendingPinchStateRef.current.pan);
 zoomRef.current = pendingPinchStateRef.current.zoom;
 panRef.current = pendingPinchStateRef.current.pan;
 pendingPinchStateRef.current = null;
 }
 if (panRafRef.current != null) {
 cancelAnimationFrame(panRafRef.current);
 panRafRef.current = null;
 }
 if (pendingPanRef.current) {
 setPan(pendingPanRef.current);
 panRef.current = pendingPanRef.current;
 pendingPanRef.current = null;
 }
 containerRectRef.current = null;

 // Always clear active snap guidelines when releasing pointer
 setActiveSnapGuides([]);

 // Finalize Marquee Selection Box
 if (marqueeSelection) {
 const minX = Math.min(marqueeSelection.start.x, marqueeSelection.current.x);
 const maxX = Math.max(marqueeSelection.start.x, marqueeSelection.current.x);
 const minY = Math.min(marqueeSelection.start.y, marqueeSelection.current.y);
 const maxY = Math.max(marqueeSelection.start.y, marqueeSelection.current.y);
 if (Math.hypot(maxX - minX, maxY - minY) > 10) {
 const intersecting = contours.filter((c) => {
 const b = getContoursBoundingBox([c]);
 return !(b.maxX < minX || b.minX > maxX || b.maxY < minY || b.minY > maxY);
 });
 if (intersecting.length > 0) {
 const newIds = intersecting.map((c) => c.id);
 setSelectedContourIds((prev) =>
 e.shiftKey ? [...new Set([...prev, ...newIds])] : newIds
 );
 showCanvasToast(`${intersecting.length}個のパスを選択しました`);
 }
 }
 setMarqueeSelection(null);
 }

 if (isDraggingTrace) {
 setIsDraggingTrace(false);
 return;
 }

 if (isResizingTrace) {
 setIsResizingTrace(false);
 return;
 }

 if (isPanning) {
 setIsPanning(false);
 setPan(panRef.current);
 return;
 }

 if (draggingMetric) {
 setDraggingMetric(null);
 onCommitHistory?.();
 return;
 }

 if (draggingGuidelineId) {
 setDraggingGuidelineId(null);
 return;
 }

 // Finalize Ruler Measurement Drag
 if (toolMode === 'ruler' && rulerMeasurement && rulerMeasurement.active) {
 handleRulerPointerUp();
 return;
 }

 // Finalize Eraser Tool sweep session
 if (toolMode === 'eraser' && isErasingRef.current) {
 handleEraserPointerUp(e);
 return;
 }

 if (toolMode === 'brush') {
 if (handleBrushPointerUp(e)) return;
 }

 // Finalize Geometric Shape
 if (isShapeTool && shapeStartPoint && shapeCurrentPoint) {
 handleShapePointerUp(e);
 return;
 }

 // Finalize Node Drag
 handleNodeDragEnd();

  // Finalize Bounding Box Transform Drag
  handleTransformPointerUp();
 };

 const handlePointerCancel = (e: React.PointerEvent<SVGSVGElement>) => {
 if (e.pointerType !== 'touch') {
 try {
 if (e.currentTarget?.hasPointerCapture?.(e.pointerId)) {
 e.currentTarget.releasePointerCapture(e.pointerId);
 }
 } catch {
 // Ignored
 }
 }
 touchPointersRef.current.delete(e.pointerId);
 pointerTypesRef.current.delete(e.pointerId);

 if (e.pointerType === 'pen') {
 isPenDrawingRef.current = false;
 lastPenActiveTimeRef.current = Date.now();
 }

 const remainingTouches = Array.from(touchPointersRef.current.entries())
 .filter(([id]) => pointerTypesRef.current.get(id) === 'touch');

 if (remainingTouches.length >= 2) {
 activeTwoFingerIdsRef.current = [remainingTouches[0][0], remainingTouches[1][0]];
 const p1 = remainingTouches[0][1];
 const p2 = remainingTouches[1][1];
 const dist = Math.max(10, Math.hypot(p1.x - p2.x, p1.y - p2.y));
 const center = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
 twoFingerLastCenterRef.current = center;
 twoFingerLastDistRef.current = dist;
 twoFingerStartDistRef.current = dist;
 twoFingerStartCenterRef.current = center;
 } else {
 twoFingerLastCenterRef.current = null;
 twoFingerLastDistRef.current = null;
 twoFingerStartDistRef.current = null;
 twoFingerStartCenterRef.current = null;
 if (touchPointersRef.current.size === 0) {
 if (isTwoFingerGestureRef.current) {
 twoFingerCooldownUntilRef.current = Date.now() + 150;
 }
 isTwoFingerGestureRef.current = false;
 activeTwoFingerIdsRef.current = null;
 }
 }

 if (Math.abs(zoomRef.current - zoom) > 0.001 || Math.abs(panRef.current.x - pan.x) > 0.5 || Math.abs(panRef.current.y - pan.y) > 0.5) {
 setZoom(zoomRef.current);
 setPan(panRef.current);
 }

 // Cancel any in-progress stroke or drag cleanly. Pointer cancellation must
 // Cancel any in-progress stroke or drag cleanly. Pointer cancellation must
 // never create a contour or history entry.
 resetBrushDrawing();
 resetEraserVisuals();
 setShapeStartPoint(null);
 setShapeCurrentPoint(null);
 setMarqueeSelection(null);
 setDraggingMetric(null);
 setDraggingGuidelineId(null);
 setIsDraggingTrace(false);
 setIsResizingTrace(false);
 setIsPanning(false);
 pendingTransformContoursRef.current = null;
 setTransformSession(null);
 setSelectedHandleType(null);
 nodeDragSessionRef.current = null;
 setActiveSnapGuides([]);
 containerRectRef.current = null;
 };

 const handlePointerLeave = () => {
 if (hoverRafRef.current != null) {
 cancelAnimationFrame(hoverRafRef.current);
 hoverRafRef.current = null;
 }
 if (pinchRafRef.current != null) {
 cancelAnimationFrame(pinchRafRef.current);
 pinchRafRef.current = null;
 }
 if (panRafRef.current != null) {
 cancelAnimationFrame(panRafRef.current);
 panRafRef.current = null;
 }
 resetEraserVisuals();
 containerRectRef.current = null;
 twoFingerLastCenterRef.current = null;
 twoFingerLastDistRef.current = null;
 twoFingerStartDistRef.current = null;
 if (eraserReticleRef.current) {
 eraserReticleRef.current.style.display = 'none';
 }
 if (drawingReticleRef.current) {
 drawingReticleRef.current.style.display = 'none';
 }
 setHoverCanvasPos(null);
 };

 const handleLostPointerCapture = useCallback(() => {
 if (drawingReticleRef.current) {
 drawingReticleRef.current.style.display = 'none';
 }
 if (isErasingRef.current) {
 resetEraserVisuals();
 }
 isPenDrawingRef.current = false;
 isTwoFingerGestureRef.current = false;
 activeTwoFingerIdsRef.current = null;
 setIsPanning(false);
 setIsDraggingTrace(false);
 setIsResizingTrace(false);
 setDraggingMetric(null);
 setDraggingGuidelineId(null);
 setMarqueeSelection(null);
 nodeDragSessionRef.current = null;
 }, []);


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
 const handlePointerDownTraceImage = useCallback(
 (e: React.PointerEvent) => {
 e.stopPropagation();
 setIsDraggingTrace(true);
 traceDragStartRef.current = {
 clientX: e.clientX,
 clientY: e.clientY,
 initOffsetX: traceSettings.offsetX || 0,
 initOffsetY: traceSettings.offsetY || 0,
 };
 },
 [traceSettings.offsetX, traceSettings.offsetY]
 );

 const handlePointerDownTraceResize = useCallback(
 (e: React.PointerEvent, _handle: TraceResizeHandle) => {
 e.stopPropagation();
 setIsResizingTrace(true);
 const rect = containerRef.current?.getBoundingClientRect();
 const currentZoom = zoom;
 const currentPan = pan;
 const centerCanvasX = (upm / 2) + (traceSettings.offsetX || 0);
 const centerCanvasY = (upm / 2) + (traceSettings.offsetY || 0);
 const centerScreenX = (rect ? rect.left : 0) + currentPan.x + centerCanvasX * currentZoom;
 const centerScreenY = (rect ? rect.top : 0) + currentPan.y + centerCanvasY * currentZoom;
 const initDist = Math.hypot(e.clientX - centerScreenX, e.clientY - centerScreenY);

 traceResizeStartRef.current = {
 clientX: e.clientX,
 clientY: e.clientY,
 initScale: traceSettings.scale ?? 1,
 initDist: Math.max(10, initDist),
 centerScreenX,
 centerScreenY,
 };
 },
 [zoom, pan, traceSettings.offsetX, traceSettings.offsetY, traceSettings.scale, upm]
 );

 const handlePointerDownGuide = useCallback(
 (e: React.PointerEvent, guideId: string) => {
 if (
 lockGuidelines ||
 toolMode === 'brush' ||
 toolMode === 'pen' ||
 toolMode === 'eraser' ||
 isShapeTool
 ) {
 return;
 }
 e.stopPropagation();
 setDraggingGuidelineId(guideId);
 },
 [lockGuidelines, toolMode, isShapeTool]
 );

 const handleDoubleClickGuide = useCallback(
 (e: React.MouseEvent, guideId: string) => {
 if (
 lockGuidelines ||
 toolMode === 'brush' ||
 toolMode === 'pen' ||
 toolMode === 'eraser' ||
 isShapeTool
 ) {
 return;
 }
 e.stopPropagation();
 setCustomGuidelines((prev) => prev.filter((g) => g.id !== guideId));
 },
 [lockGuidelines, toolMode, isShapeTool]
 );

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
 <div className={`w-full h-full flex flex-col relative overflow-hidden select-none ${themeClasses.canvasOuterBg} ${isAnyModalOpen ? 'pointer-events-none' : ''}`}>
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
 className={`relative flex-1 h-full w-full overflow-hidden select-none touch-none transition-colors ${
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

