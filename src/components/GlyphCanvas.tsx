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

 const containerRef = useRef<HTMLDivElement>(null);
 const contoursRef = useRef<PathContour[]>(contours);
 useEffect(() => {
 contoursRef.current = contours;
 // Keep selection state strictly in-sync with current contours
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
 if (activeEraserPathRef.current) {
 activeEraserPathRef.current.setAttribute('d', '');
 }
 activeEraserSvgDRef.current = '';
 brushStrokePointsRef.current = [];
 setSelectedContourIds([]);
 setSelectedContourId(null);
 setSelectedNodeId(null);
 setSelectedHandleType(null);
 isErasingRef.current = false;
 lastErasePosRef.current = null;
 eraserStrokePointsRef.current = [];
 erasedAnyInSessionRef.current = false;
 }
 }, [contours]);

 // Switching glyphs must never carry an in-progress gesture into the next page.
 useEffect(() => {
   resetBrushDrawing();
   eraserStrokePointsRef.current = [];
   isErasingRef.current = false;
   erasedAnyInSessionRef.current = false;
   lastErasePosRef.current = null;
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
   if (activeEraserPathRef.current) {
     activeEraserPathRef.current.setAttribute('d', '');
   }
   pendingTransformContoursRef.current = null;
   activeBrushSvgDRef.current = '';
   activeEraserSvgDRef.current = '';
 }, [selectedUnicode]);

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

 // Pen Tool Stroke Width & Cap Style for "線で確定" (Stroke outline expansion)
 const [penStrokeWidth, setPenStrokeWidth] = useState<number>(() => {
 try {
 const saved = localStorage.getItem('glyph_pen_stroke_width');
 if (saved) {
 const val = parseInt(saved, 10);
 if (val >= 2 && val <= 300) return val;
 }
 } catch {}
 return 40;
 });

 const [penCapStyle, setPenCapStyle] = useState<'round' | 'butt' | 'square'>(() => {
 try {
 const saved = localStorage.getItem('glyph_pen_cap_style');
 if (saved === 'round' || saved === 'butt' || saved === 'square') return saved;
 } catch {}
 return 'round';
 });

 const [showPenStrokeMenu, setShowPenStrokeMenu] = useState<boolean>(false);

 const handleSetPenStrokeWidth = useCallback((width: number) => {
 const clamped = Math.max(2, Math.min(300, Math.round(width)));
 setPenStrokeWidth(clamped);
 try {
 localStorage.setItem('glyph_pen_stroke_width', String(clamped));
 } catch {}
 }, []);

 const handleSetPenCapStyle = useCallback((style: 'round' | 'butt' | 'square') => {
 setPenCapStyle(style);
 try {
 localStorage.setItem('glyph_pen_cap_style', style);
 } catch {}
 }, []);

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

 // Zoom & Pan Viewport State
 const [zoom, setZoom] = useState<number>(0.55);
 const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
 const [isPanning, setIsPanning] = useState<boolean>(false);
 const panStartRef = useRef<Point>({ x: 0, y: 0 });
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
 const containerRectRef = useRef<DOMRect | null>(null);
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

 const isShapeTool = [
 'rect',
 'square',
 'ellipse',
 'circle',
 'rounded_rect',
 'triangle',
 'triangle_down',
 'right_triangle',
 'semicircle',
 'ring',
 'pill',
 'parallelogram',
 'crescent',
 'star',
 'heart',
 'sparkle',
 'starburst',
 'diamond',
 'polygon',
 'line',
 ].includes(toolMode);

 // Pen Tool creation in-progress
 const [activePenContour, setActivePenContour] = useState<PathContour | null>(null);
 const [penMousePos, setPenMousePos] = useState<Point | null>(null);
 const [penHudPos, setPenHudPos] = useState<{ x: number; y: number } | null>(null);
 const isDraggingPenHudRef = useRef(false);
 const penHudDragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

 const activeEraserSvgDRef = useRef<string>('');

 // Shape creation in-progress
 const [shapeStartPoint, setShapeStartPoint] = useState<Point | null>(null);
 const [shapeCurrentPoint, setShapeCurrentPoint] = useState<Point | null>(null);
 const shapeRafRef = useRef<number | null>(null);
 const [isShiftLockRatio, setIsShiftLockRatio] = useState<boolean>(false);
 const [isAltFromCenter, setIsAltFromCenter] = useState<boolean>(false);

 // Dragging metrics guide lines
 const [draggingMetric, setDraggingMetric] = useState<'lsb' | 'rsb' | null>(null);

 // Spacebar Hand/Pan navigation state
 const [isSpacePressed, setIsSpacePressed] = useState<boolean>(false);

 // Continuous sweep eraser tracking
 const isErasingRef = useRef<boolean>(false);
 const erasedAnyInSessionRef = useRef<boolean>(false);
 const lastErasePosRef = useRef<Point | null>(null);
 const eraserStrokePointsRef = useRef<Point[]>([]);
 const activeEraserPathRef = useRef<SVGPathElement | null>(null);

 // Bounding Box Transformation Session (Move, Free Rotate, 8-directional Resizing for single or multiple contours)
 const [transformSession, setTransformSession] = useState<{
 handle: 'move' | 'rotate' | 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
 startPoint: Point;
 initialBBox: {
 minX: number;
 minY: number;
 maxX: number;
 maxY: number;
 width: number;
 height: number;
 centerX: number;
 centerY: number;
 };
 initialContours: PathContour[];
 allInitialNodes?: Point[];
 } | null>(null);
 const transformRafRef = useRef<number | null>(null);
 const pendingTransformContoursRef = useRef<PathContour[] | null>(null);
 const [rotateDisplayAngle, setRotateDisplayAngle] = useState<number | null>(null);

 // Ruler Measurement & Straight Line Draw Tool State
 const [rulerMeasurement, setRulerMeasurement] = useState<{
 start: Point;
 end: Point;
 active: boolean;
 } | null>(null);

 // Ruler Straight Line Assist (Hold Shift or toggle straight mode for precise horizontal/vertical/45deg lines)
 const [brushStraightMode, setBrushStraightMode] = useState<boolean>(false);


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

 // Eraser Tool Config (Size & Mode: 'stroke' = 消しゴム, 'cut' = 部分削り・分割, 'node' = アンカー点消去)
 const [eraserSize, setEraserSize] = useState<number>(36);
 const [eraserMode, setEraserMode] = useState<'stroke' | 'cut' | 'node' | 'all'>('stroke');

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

 // Count targeted nodes inside anchor point eraser sweep area for real-time pointer feedback
 const targetedEraserNodeCount = useMemo(() => {
 if (toolMode !== 'eraser' || eraserMode !== 'node' || !hoverCanvasPos) return 0;
 const radius = Math.max(2, eraserSize / 2);
 let count = 0;
 for (const c of contours) {
 for (const n of c.nodes) {
 if (Math.hypot(n.x - hoverCanvasPos.x, n.y - hoverCanvasPos.y) <= radius) {
 count++;
 }
 }
 }
 return count;
 }, [toolMode, eraserMode, hoverCanvasPos, eraserSize, contours]);

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
 if (shapeRafRef.current != null) {
 cancelAnimationFrame(shapeRafRef.current);
 }
 if (pinchRafRef.current != null) {
 cancelAnimationFrame(pinchRafRef.current);
 }
 if (panRafRef.current != null) {
 cancelAnimationFrame(panRafRef.current);
 }
 if (transformRafRef.current != null) {
 cancelAnimationFrame(transformRafRef.current);
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

 // Convert ruler line to horizontal, vertical, or diagonal canvas guideline
 const handleConvertRulerToGuideline = useCallback((guideType: 'auto' | 'diagonal' | 'h' | 'v' = 'auto') => {
 if (!rulerMeasurement) return;
 const { start, end } = rulerMeasurement;
 const dx = end.x - start.x;
 const dy = end.y - start.y;
 const absDx = Math.abs(dx);
 const absDy = Math.abs(dy);

 let finalType: 'h' | 'v' | 'diagonal' = 'diagonal';
 if (guideType === 'auto') {
 if (absDy < 2) {
 finalType = 'h';
 } else if (absDx < 2) {
 finalType = 'v';
 } else {
 finalType = 'diagonal';
 }
 } else {
 finalType = guideType;
 }

 if (finalType === 'diagonal') {
 const angle = Math.round((Math.atan2(dy, dx) * 180 / Math.PI) * 10) / 10;
 const newGuide: CustomGuideline = {
 id: generateId(),
 type: 'diagonal',
 position: 0,
 p1: { x: Math.round(start.x), y: Math.round(start.y) },
 p2: { x: Math.round(end.x), y: Math.round(end.y) },
 angle: angle,
 label: `斜め (${angle}°)`,
 };
 setCustomGuidelines((prev) => [...prev, newGuide]);
 setRulerMeasurement(null);
 showCanvasToast('斜めガイド線を作成しました', `角度: ${angle}° / 長さ: ${Math.round(Math.hypot(dx, dy))}px`);
 } else {
 const isHorizontal = finalType === 'h';
 const newGuide: CustomGuideline = {
 id: generateId(),
 type: isHorizontal ? 'h' : 'v',
 position: isHorizontal ? Math.round((start.y + end.y) / 2) : Math.round((start.x + end.x) / 2),
 };
 setCustomGuidelines((prev) => [...prev, newGuide]);
 setRulerMeasurement(null);
 showCanvasToast(
 isHorizontal ? '水平ガイド線を作成しました' : '垂直ガイド線を作成しました',
 `位置: ${newGuide.position}px`
 );
 }
 }, [rulerMeasurement, setCustomGuidelines, showCanvasToast]);

 // Mobile UI View Modes & Bottom Action Sheets
 const [isMobileFocusMode, setIsMobileFocusMode] = useState<boolean>(false);
 const [showMobilePartSheet, setShowMobilePartSheet] = useState<boolean>(false);
 const [showMobileBrushSheet, setShowMobileBrushSheet] = useState<boolean>(false);
 const [showMobileGuidesSheet, setShowMobileGuidesSheet] = useState<boolean>(false);

 const upm = project?.metadata?.unitsPerEm || 1000;

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

 // Boundary Clamping for Viewport Panning (prevents canvas from drifting into infinite empty space)
 const clampPan = useCallback((p: Point, currentZoom: number): Point => {
 if (!containerRef.current) return p;
 const rect = containerRef.current.getBoundingClientRect();
 const cWidth = rect.width;
 const cHeight = rect.height;
 if (cWidth <= 0 || cHeight <= 0) return p;

 const canvasWidth = upm * currentZoom;
 const canvasHeight = upm * currentZoom;

 // Minimum visible overlap: keep at least 30% or 180px in view
 const minVisibleX = Math.min(canvasWidth * 0.35, 180);
 const minVisibleY = Math.min(canvasHeight * 0.35, 180);

 const minX = -canvasWidth + minVisibleX;
 const maxX = cWidth - minVisibleX;
 const minY = -canvasHeight + minVisibleY;
 const maxY = cHeight - minVisibleY;

 return {
 x: Math.min(maxX, Math.max(minX, p.x)),
 y: Math.min(maxY, Math.max(minY, p.y)),
 };
 }, [upm]);

 // Auto-center canvas on initial mount, resize, or drawer toggle with optimal zoom
 const resetView = useCallback((mode: 'fit' | 'width' | '100%' = 'fit') => {
 if (containerRef.current) {
 const rect = containerRef.current.getBoundingClientRect();
 if (rect.width <= 0 || rect.height <= 0) return;

 if (mode === '100%') {
 setZoom(1.0);
 setPan({
 x: (rect.width - upm) / 2,
 y: (rect.height - upm) / 2,
 });
 return;
 }

 if (mode === 'width') {
 const margin = rect.width < 640 ? 12 : 24;
 const widthZoom = Math.max(0.35, Math.min(3.5, (rect.width - margin) / upm));
 setZoom(widthZoom);
 setPan({
 x: (rect.width - upm * widthZoom) / 2,
 y: Math.max(16, (rect.height - upm * widthZoom) / 2),
 });
 return;
 }

 // Default 'fit': comfortable, optimal margin (12px on mobile, 24px on desktop/iPad)
 const margin = rect.width < 640 ? 12 : 28;
 const idealZoom = Math.min((rect.width - margin) / upm, (rect.height - margin) / upm);
 const clampedZoom = Math.max(0.35, Math.min(3.5, idealZoom));
 setZoom(clampedZoom);
 setPan({
 x: (rect.width - upm * clampedZoom) / 2,
 y: (rect.height - upm * clampedZoom) / 2,
 });
 }
 }, [upm]);

 // Auto-recenter and fit canvas whenever project UPM (canvas size) changes
 const prevUpmRef = useRef<number>(upm);
 useEffect(() => {
 if (prevUpmRef.current !== upm) {
 prevUpmRef.current = upm;
 resetView('fit');
 }
 }, [upm, resetView]);

 // Smooth centered zoom step helper
 const handleZoomStep = useCallback((factor: number) => {
 if (!containerRef.current) return;
 const rect = containerRef.current.getBoundingClientRect();
 const centerX = rect.width / 2;
 const centerY = rect.height / 2;
 setZoom((prevZoom) => {
 const nextZoom = Math.max(0.35, Math.min(5.0, prevZoom * factor));
 const scale = nextZoom / prevZoom;
 setPan((prevPan) => {
 const newPan = {
 x: centerX - (centerX - prevPan.x) * scale,
 y: centerY - (centerY - prevPan.y) * scale,
 };
 return clampPan(newPan, nextZoom);
 });
 return nextZoom;
 });
 }, [clampPan]);

 const zoomRef = useRef<number>(zoom);
 useEffect(() => {
 zoomRef.current = zoom;
 }, [zoom]);
 const panRef = useRef<Point>(pan);
 useEffect(() => {
 panRef.current = pan;
 }, [pan]);
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
 isErasingRef.current = false;
 lastErasePosRef.current = null;
 activeEraserSvgDRef.current = '';
 if (activeEraserPathRef.current) {
 activeEraserPathRef.current.setAttribute('d', '');
 }
 eraserStrokePointsRef.current = [];
 erasedAnyInSessionRef.current = false;
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

 // Auto-fit on initial mount
 useEffect(() => {
 resetView('fit');
 }, [resetView]);

 // ResizeObserver to adapt cleanly when sidebar drawers slide open or close, or orientation changes
 useEffect(() => {
 if (!containerRef.current) return;
 const ro = new ResizeObserver((entries) => {
 for (const entry of entries) {
 const { width, height } = entry.contentRect;
 if (width > 0 && height > 0) {
 const prev = containerDimensionsRef.current;
 if (prev.width === 0) {
 resetView('fit');
 } else {
 // Keep user's zoom level intact, smoothly re-clamp pan to ensure canvas stays safely visible
 setPan((prevPan) => clampPan(prevPan, zoomRef.current));
 }
 containerDimensionsRef.current = { width, height };
 }
 }
 });
 ro.observe(containerRef.current);
 return () => ro.disconnect();
 }, [resetView, clampPan]);

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

 // Invalidate cached container rect on window resize/orientation change or scrolling
 useEffect(() => {
 const handleInvalidateContainerRect = () => {
 containerRectRef.current = null;
 };
 window.addEventListener('resize', handleInvalidateContainerRect);
 window.addEventListener('scroll', handleInvalidateContainerRect);
 return () => {
 window.removeEventListener('resize', handleInvalidateContainerRect);
 window.removeEventListener('scroll', handleInvalidateContainerRect);
 };
 }, []);

 // Screen to Canvas Coordinates Converter (Pure geometric mapping with zero drift & zero layout thrashing)
 const screenToCanvas = useCallback(
 (clientX: number, clientY: number): Point => {
 let rect = containerRectRef.current;
 if (!rect) {
 rect = containerRef.current?.getBoundingClientRect() || null;
 if (rect) {
 containerRectRef.current = rect;
 }
 }
 if (!rect) return { x: 0, y: 0 };
 const currentZoom = zoomRef.current || 1;
 const currentPan = panRef.current || { x: 0, y: 0 };
 const x = (clientX - rect.left - currentPan.x) / currentZoom;
 const y = (clientY - rect.top - currentPan.y) / currentZoom;
 return { x: Math.round(x), y: Math.round(y) };
 },
 []
 );

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

 const handleDeleteSelectedRef = useRef<() => void>(() => {});

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

 // ---------------- PATH & BEZIER UNDO / RESET / FINISH ACTIONS ----------------

 // Undo the last placed node in the active pen path - zero latency
 const handleUndoPenNode = useCallback(() => {
 if (!activePenContour) return;
 if (activePenContour.nodes.length <= 1) {
 setActivePenContour(null);
 setSelectedNodeId(null);
 } else {
 const remainingNodes = activePenContour.nodes.slice(0, -1);
 setActivePenContour({
 ...activePenContour,
 nodes: remainingNodes,
 });
 setSelectedNodeId(remainingNodes[remainingNodes.length - 1].id);
 }
 }, [activePenContour]);

 // Reset/Discard the entire in-progress pen path (リセット)
 const handleResetPenContour = useCallback(() => {
 if (activePenContour) {
 const count = activePenContour.nodes.length;
 setActivePenContour(null);
 setSelectedNodeId(null);
 setSelectedHandleType(null);
 showCanvasToast('作図中のパスをリセット・破棄しました', `${count} 点を消去`);
 }
 }, [activePenContour, showCanvasToast]);

 // Finish and commit the in-progress pen path (確定)
 const handleFinishPenContour = useCallback(
 (closed: boolean = false, customStrokeWidth?: number) => {
 if (!activePenContour || activePenContour.nodes.length === 0) return;
 if (activePenContour.nodes.length === 1) {
 showCanvasToast('パスには2点以上の頂点が必要です', '作図を継続またはEscでキャンセル');
 return;
 }
 setShowPenStrokeMenu(false);

 const targetWidth = customStrokeWidth ?? penStrokeWidth;

 if (!closed) {
 // "線で確定": Expand the open path into a smooth, solid vector outline with the chosen line thickness
 try {
 const rawContour: PathContour = {
 ...activePenContour,
 closed: false,
 };
 const expanded = expandStrokeContours([rawContour], targetWidth, penCapStyle);
 if (expanded && expanded.length > 0) {
 let resultContours = expanded;
 if (autoResolveBrushOverlap && hasContourIntersections(expanded)) {
 try {
 const selfMerged = unionContours(expanded, 1.2, false);
 if (selfMerged && selfMerged.length > 0) {
 resultContours = selfMerged;
 }
 } catch (e) {
 console.warn('Stroke self-merge fallback:', e);
 }
 }

 onChangeContours([...contours, ...resultContours]);
 setSelectedContourId(null);
 setSelectedContourIds([]);
 setActivePenContour(null);
 setSelectedNodeId(null);
 onCommitHistory?.();
 showCanvasToast(
 `太さ ${targetWidth}px の線として確定しました`,
 `${resultContours.length} 個の輪郭 (端点: ${penCapStyle === 'round' ? '丸' : penCapStyle === 'butt' ? '平' : '角'})`
 );
 return;
 }
 } catch (err) {
 console.warn('Pen stroke expansion fallback:', err);
 }
 }

 const finalized: PathContour = {
 ...activePenContour,
 closed,
 };

 if (closed && autoResolveBrushOverlap) {
 try {
 const selfMerged = unionContours([finalized], 1.2, true);
 if (selfMerged && selfMerged.length > 0) {
 onChangeContours([...contours, ...selfMerged]);
 setSelectedContourId(null);
 setSelectedContourIds([]);
 setActivePenContour(null);
 setSelectedNodeId(null);
 onCommitHistory?.();
 showCanvasToast(
 selfMerged.length > 1
 ? '交差を自動結合し、輪郭を確定しました'
 : '閉じた輪郭として確定しました',
 `${selfMerged.length} 個の輪郭`
 );
 return;
 }
 } catch (err) {
 console.warn('Pen self-merge fallback:', err);
 }
 }

 onChangeContours([...contours, finalized]);
 setSelectedContourId(null);
 setSelectedContourIds([]);
 setActivePenContour(null);
 setSelectedNodeId(null);
 onCommitHistory?.();
 showCanvasToast(
 closed ? '閉じた輪郭として確定しました' : `開いた線 (太さ: ${targetWidth}px) として確定しました`,
 `${finalized.nodes.length} 頂点`
 );
 },
 [activePenContour, contours, autoResolveBrushOverlap, penStrokeWidth, penCapStyle, onChangeContours, onCommitHistory, showCanvasToast]
 );

 // ---------------- DRAGGABLE PEN HUD ACTIONS ----------------
 const handlePenHudPointerDown = useCallback((e: React.PointerEvent) => {
 e.stopPropagation();
 e.preventDefault();
 isDraggingPenHudRef.current = true;
 const target = e.currentTarget as HTMLElement;
 try {
 target.setPointerCapture?.(e.pointerId);
 } catch {
 // ignore
 }

 const containerRect = containerRef.current?.getBoundingClientRect();
 const currentLeft =
 penHudPos?.x ??
 (containerRect ? Math.max(16, (containerRect.width - 340) / 2) : 60);
 const currentTop = penHudPos?.y ?? 56;

 penHudDragOffsetRef.current = {
 x: e.clientX - currentLeft,
 y: e.clientY - currentTop,
 };
 }, [penHudPos]);

 const handlePenHudPointerMove = useCallback((e: React.PointerEvent) => {
 if (!isDraggingPenHudRef.current) return;
 e.stopPropagation();
 e.preventDefault();
 if (!containerRef.current) return;

 const containerRect = containerRef.current.getBoundingClientRect();
 let newX = e.clientX - penHudDragOffsetRef.current.x;
 let newY = e.clientY - penHudDragOffsetRef.current.y;

 // Clamp within container boundaries
 newX = Math.max(8, Math.min(containerRect.width - 260, newX));
 newY = Math.max(8, Math.min(containerRect.height - 44, newY));

 setPenHudPos({ x: newX, y: newY });
 }, []);

 const handlePenHudPointerUp = useCallback((e: React.PointerEvent) => {
 if (isDraggingPenHudRef.current) {
 isDraggingPenHudRef.current = false;
 try {
 (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
 } catch {
 // ignore
 }
 }
 }, []);

 // Clear / Reset all contours of current character (文字を全クリア)
 const handleClearAll = useCallback(() => {
 if (activeBrushPathRef.current) {
 activeBrushPathRef.current.setAttribute('d', '');
 }
 activeBrushSvgDRef.current = '';
 if (activeEraserPathRef.current) {
 activeEraserPathRef.current.setAttribute('d', '');
 }
 activeEraserSvgDRef.current = '';
 brushStrokePointsRef.current = [];
 eraserStrokePointsRef.current = [];
 isErasingRef.current = false;
 lastErasePosRef.current = null;
 erasedAnyInSessionRef.current = false;
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
 }, [contours, onChangeContours, onCommitHistory, showCanvasToast]);

 const handleClearAllContours = handleClearAll;

 // ---------------- TRANSFORMATION SESSION HELPER ----------------
 const handleTransformPointerDown = useCallback(
 (
 e: React.PointerEvent,
 handle: 'move' | 'rotate' | 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w',
 overrideTargetIds?: string[]
 ) => {
 e.stopPropagation();
 const targetIds = overrideTargetIds || selectedContourIds;
 if (targetIds.length === 0) return;
 const targetContours = contours.filter((c) => targetIds.includes(c.id));
 if (targetContours.length === 0) return;

 const bbox = getContoursBoundingBox(targetContours);
 const pos = screenToCanvas(e.clientX, e.clientY);
 const allInitialNodes = targetContours.flatMap((c) => c.nodes.map((n) => ({ x: n.x, y: n.y })));
 setTransformSession({
 handle,
 startPoint: pos,
 initialBBox: bbox,
 initialContours: targetContours,
 allInitialNodes,
 });
 },
 [selectedContourIds, contours, screenToCanvas]
 );

 // Resolve dynamic high-contrast cursor (lightweight native OS hardware acceleration)
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
 let startPos = pos;
 if (!e.altKey && (gridSettings.snapToGuides !== false || gridSettings.snapToGrid)) {
 const snapRes = snapSinglePoint(
 pos,
 contours,
 snapMetrics,
 customGuidelines,
 Math.max(7, Math.round(12 / zoom)),
 gridSettings
 );
 startPos = snapRes.point;
 setActiveSnapGuides(snapRes.activeGuides);
 }
 setRulerMeasurement({
 start: startPos,
 end: startPos,
 active: true,
 });
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

 // SHAPES (RECT, SQUARE, ELLIPSE, CIRCLE, ROUNDED_RECT, TRIANGLE, STAR, HEART, SPARKLE, STARBURST, DIAMOND, POLYGON)
 if (isShapeTool) {
 let startPos = pos;
 if (!e.altKey && (gridSettings.snapToGuides !== false || gridSettings.snapToGrid)) {
 const snapRes = snapSinglePoint(
 pos,
 contours,
 snapMetrics,
 customGuidelines,
 Math.max(7, Math.round(12 / zoom)),
 gridSettings
 );
 startPos = snapRes.point;
 setActiveSnapGuides(snapRes.activeGuides);
 }
 setShapeStartPoint(startPos);
 setShapeCurrentPoint(startPos);
 setIsShiftLockRatio(e.shiftKey);
 setIsAltFromCenter(e.altKey);
 return;
 }

 // ERASER TOOL
 if (toolMode === 'eraser') {
 if (eraserMode === 'all') {
 handleClearAll();
 setEraserMode('stroke');
 return;
 }
 try {
 (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
 } catch {
 // Ignored
 }
 isErasingRef.current = true;
 erasedAnyInSessionRef.current = false;
 lastErasePosRef.current = pos;
 eraserStrokePointsRef.current = [pos];
 const eraseRadius = Math.max(2, eraserSize / 2);

 if (eraserMode === 'cut') {
 const d = `M ${pos.x} ${pos.y} L ${pos.x + 0.1} ${pos.y}`;
 activeEraserSvgDRef.current = d;
 if (activeEraserPathRef.current) {
 activeEraserPathRef.current.setAttribute('d', d);
 }
 } else {
 const currentContours = contoursRef.current || [];
 const updatedContours = eraseContoursAtPoint(currentContours, pos, eraseRadius, eraserMode);
 if (updatedContours !== currentContours) {
 onCommitHistory?.();
 erasedAnyInSessionRef.current = true;
 contoursRef.current = updatedContours;
 onChangeContours(updatedContours, { skipHistory: true });
 setSelectedContourIds((prev) => prev.filter((id) => updatedContours.some((c) => c.id === id)));
 setSelectedContourId((prev) => (prev && updatedContours.some((c) => c.id === prev) ? prev : null));
 setSelectedNodeId((prev) => {
 if (!prev) return null;
 return updatedContours.some((c) => c.nodes.some((n) => n.id === prev)) ? prev : null;
 });
 }
 }
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
 let endX = pos.x;
 let endY = pos.y;

 if (!e.altKey && (gridSettings.snapToGuides !== false || gridSettings.snapToGrid)) {
 const snapRes = snapSinglePoint(
 pos,
 contours,
 snapMetrics,
 customGuidelines,
 Math.max(7, Math.round(12 / zoom)),
 gridSettings
 );
 endX = snapRes.point.x;
 endY = snapRes.point.y;
 setActiveSnapGuides(snapRes.activeGuides);
 }

 if (e.shiftKey) {
 // Snap to 15-degree increments (0°, 15°, 30°, 45°, 60°, 75°, 90°, etc.) when Shift is held
 const dx = endX - rulerMeasurement.start.x;
 const dy = endY - rulerMeasurement.start.y;
 const angle = Math.atan2(dy, dx);
 const snapStep = (15 * Math.PI) / 180; // 15 degrees = Math.PI / 12
 const snapAngle = Math.round(angle / snapStep) * snapStep;
 const dist = Math.hypot(dx, dy);
 endX = Math.round(rulerMeasurement.start.x + Math.cos(snapAngle) * dist);
 endY = Math.round(rulerMeasurement.start.y + Math.sin(snapAngle) * dist);
 }

 setRulerMeasurement({
 ...rulerMeasurement,
 end: { x: endX, y: endY },
 });
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
 if (transformSession && selectedContourIds.length > 0) {
 const { handle, startPoint, initialBBox, initialContours, allInitialNodes: precomputedNodes } = transformSession;
 const rawDx = pos.x - startPoint.x;
 const rawDy = pos.y - startPoint.y;

 if (handle === 'move') {
 let finalDx = rawDx;
 let finalDy = rawDy;

 // Smart snap to Baseline, LSB, Metrics, Grid, and other contours (hold Alt/Option to bypass)
 if (!e.altKey && (Boolean(gridSettings.snapToGuides) || Boolean(gridSettings.snapToGrid))) {
 const otherContours = contours.filter((c) => !selectedContourIds.includes(c.id));
 const snapThreshold = Math.max(7, Math.round(12 / zoom));
 const allInitialNodes = precomputedNodes || initialContours.flatMap((c) => c.nodes);
 const snapResult = snapContourMovement(
 initialBBox,
 rawDx,
 rawDy,
 otherContours,
 snapMetrics,
 customGuidelines,
 snapThreshold,
 allInitialNodes,
 gridSettings
 );
 finalDx = snapResult.dx;
 finalDy = snapResult.dy;
 setActiveSnapGuides(snapResult.activeGuides);
 } else {
 setActiveSnapGuides([]);
 }

 const updatedMap = new Map<string, PathContour>();
 for (const ic of initialContours) {
 updatedMap.set(ic.id, {
 ...ic,
 nodes: ic.nodes.map((n) => ({
 ...n,
 x: Math.round(n.x + finalDx),
 y: Math.round(n.y + finalDy),
 handleIn: n.handleIn ? { x: Math.round(n.handleIn.x + finalDx), y: Math.round(n.handleIn.y + finalDy) } : null,
 handleOut: n.handleOut ? { x: Math.round(n.handleOut.x + finalDx), y: Math.round(n.handleOut.y + finalDy) } : null,
 })),
 });
 }

 const nextContours = contours.map((c) => updatedMap.get(c.id) || c);
 pendingTransformContoursRef.current = nextContours;
 if (transformRafRef.current == null) {
 transformRafRef.current = requestAnimationFrame(() => {
 transformRafRef.current = null;
 if (pendingTransformContoursRef.current) {
 onChangeContours(pendingTransformContoursRef.current);
 }
 });
 }
 return;
 }

 if (handle === 'rotate') {
 setActiveSnapGuides([]);
 const { centerX, centerY } = initialBBox;
 const startAngle = Math.atan2(startPoint.y - centerY, startPoint.x - centerX);
 const currAngle = Math.atan2(pos.y - centerY, pos.x - centerX);
 let delta = currAngle - startAngle;

 if (e.shiftKey) {
 // Snap to 15-degree increments when Shift is held
 const step = (15 * Math.PI) / 180;
 delta = Math.round(delta / step) * step;
 }

 const deg = Math.round((delta * 180) / Math.PI);
 setRotateDisplayAngle(deg);

 const cos = Math.cos(delta);
 const sin = Math.sin(delta);

 const rotPoint = (p: Point) => {
 const rx = p.x - centerX;
 const ry = p.y - centerY;
 return {
 x: Math.round(centerX + rx * cos - ry * sin),
 y: Math.round(centerY + rx * sin + ry * cos),
 };
 };

 const updatedMap = new Map<string, PathContour>();
 for (const ic of initialContours) {
 updatedMap.set(ic.id, {
 ...ic,
 nodes: ic.nodes.map((n) => ({
 ...n,
 ...rotPoint({ x: n.x, y: n.y }),
 handleIn: n.handleIn ? rotPoint(n.handleIn) : null,
 handleOut: n.handleOut ? rotPoint(n.handleOut) : null,
 })),
 });
 }

 const nextContours = contours.map((c) => updatedMap.get(c.id) || c);
 pendingTransformContoursRef.current = nextContours;
 if (transformRafRef.current == null) {
 transformRafRef.current = requestAnimationFrame(() => {
 transformRafRef.current = null;
 if (pendingTransformContoursRef.current) {
 onChangeContours(pendingTransformContoursRef.current);
 }
 });
 }
 return;
 }

 // Handle Resizing (8 Handles: nw, n, ne, e, se, s, sw, w)
 const { minX, minY, maxX, maxY, width, height } = initialBBox;
 const safeW = Math.max(1, width);
 const safeH = Math.max(1, height);

 let snapX = pos.x;
 let snapY = pos.y;

 if (!e.altKey && (Boolean(gridSettings.snapToGuides) || Boolean(gridSettings.snapToGrid))) {
 const otherContours = contours.filter((c) => !selectedContourIds.includes(c.id));
 const snapThreshold = Math.max(7, Math.round(12 / zoom));
 const snapResult = snapSinglePoint(
 pos,
 otherContours,
 snapMetrics,
 customGuidelines,
 snapThreshold,
 gridSettings
 );
 snapX = snapResult.point.x;
 snapY = snapResult.point.y;
 setActiveSnapGuides(snapResult.activeGuides);
 } else {
 setActiveSnapGuides([]);
 }

 let scaleX = 1;
 let scaleY = 1;
 let anchorX = minX;
 let anchorY = minY;

 const isPreserveAspect = e.shiftKey;

 switch (handle) {
 case 'se': {
 anchorX = minX;
 anchorY = minY;
 const newW = Math.max(8, snapX - minX);
 const newH = Math.max(8, snapY - minY);
 if (isPreserveAspect) {
 const s = Math.max(newW / safeW, newH / safeH);
 scaleX = s;
 scaleY = s;
 } else {
 scaleX = newW / safeW;
 scaleY = newH / safeH;
 }
 break;
 }
 case 'nw': {
 anchorX = maxX;
 anchorY = maxY;
 const newW = Math.max(8, maxX - snapX);
 const newH = Math.max(8, maxY - snapY);
 if (isPreserveAspect) {
 const s = Math.max(newW / safeW, newH / safeH);
 scaleX = s;
 scaleY = s;
 } else {
 scaleX = newW / safeW;
 scaleY = newH / safeH;
 }
 break;
 }
 case 'ne': {
 anchorX = minX;
 anchorY = maxY;
 const newW = Math.max(8, snapX - minX);
 const newH = Math.max(8, maxY - snapY);
 if (isPreserveAspect) {
 const s = Math.max(newW / safeW, newH / safeH);
 scaleX = s;
 scaleY = s;
 } else {
 scaleX = newW / safeW;
 scaleY = newH / safeH;
 }
 break;
 }
 case 'sw': {
 anchorX = maxX;
 anchorY = minY;
 const newW = Math.max(8, maxX - snapX);
 const newH = Math.max(8, snapY - minY);
 if (isPreserveAspect) {
 const s = Math.max(newW / safeW, newH / safeH);
 scaleX = s;
 scaleY = s;
 } else {
 scaleX = newW / safeW;
 scaleY = newH / safeH;
 }
 break;
 }
 case 'e': {
 anchorX = minX;
 anchorY = minY;
 const newW = Math.max(8, snapX - minX);
 scaleX = newW / safeW;
 scaleY = 1;
 break;
 }
 case 'w': {
 anchorX = maxX;
 anchorY = minY;
 const newW = Math.max(8, maxX - snapX);
 scaleX = newW / safeW;
 scaleY = 1;
 break;
 }
 case 's': {
 anchorX = minX;
 anchorY = minY;
 const newH = Math.max(8, snapY - minY);
 scaleX = 1;
 scaleY = newH / safeH;
 break;
 }
 case 'n': {
 anchorX = minX;
 anchorY = maxY;
 const newH = Math.max(8, maxY - snapY);
 scaleX = 1;
 scaleY = newH / safeH;
 break;
 }
 }

 const transformPoint = (p: Point): Point => {
 let nx = p.x;
 let ny = p.y;
 if (handle === 'nw' || handle === 'w' || handle === 'sw') {
 nx = anchorX - (anchorX - p.x) * scaleX;
 } else {
 nx = anchorX + (p.x - anchorX) * scaleX;
 }

 if (handle === 'nw' || handle === 'n' || handle === 'ne') {
 ny = anchorY - (anchorY - p.y) * scaleY;
 } else {
 ny = anchorY + (p.y - anchorY) * scaleY;
 }

 return { x: Math.round(nx), y: Math.round(ny) };
 };

 const updatedMap = new Map<string, PathContour>();
 for (const ic of initialContours) {
 updatedMap.set(ic.id, {
 ...ic,
 nodes: ic.nodes.map((n) => ({
 ...n,
 ...transformPoint({ x: n.x, y: n.y }),
 handleIn: n.handleIn ? transformPoint(n.handleIn) : null,
 handleOut: n.handleOut ? transformPoint(n.handleOut) : null,
 })),
 });
 }

 const nextContours = contours.map((c) => updatedMap.get(c.id) || c);
 pendingTransformContoursRef.current = nextContours;
 if (transformRafRef.current == null) {
 transformRafRef.current = requestAnimationFrame(() => {
 transformRafRef.current = null;
 if (pendingTransformContoursRef.current) {
 onChangeContours(pendingTransformContoursRef.current);
 }
 });
 }
 return;
 }

 // Eraser Tool continuous sweep-erase while dragging
 if (toolMode === 'eraser' && isErasingRef.current) {
 if (eraserMode === 'all') {
 return;
 }
 const eraseRadius = Math.max(2, eraserSize / 2);
 const prevPos = lastErasePosRef.current || pos;
 lastErasePosRef.current = pos;
 eraserStrokePointsRef.current.push(pos);

 if (eraserMode === 'cut') {
 // Fast SVG preview overlay without mutating/degrading vector contours every frame
 if (activeEraserPathRef.current && eraserStrokePointsRef.current.length > 0) {
 const pts = eraserStrokePointsRef.current;
 let d = `M ${pts[0].x} ${pts[0].y}`;
 for (let i = 1; i < pts.length; i++) {
 d += ` L ${pts[i].x} ${pts[i].y}`;
 }
 activeEraserSvgDRef.current = d;
 activeEraserPathRef.current.setAttribute('d', d);
 }
 } else {
 const currentContours = contoursRef.current || [];
 const updatedContours = eraseContoursAtPoint(currentContours, pos, eraseRadius, eraserMode, prevPos);
 if (updatedContours !== currentContours) {
 if (!erasedAnyInSessionRef.current) {
 onCommitHistory?.();
 erasedAnyInSessionRef.current = true;
 }
 contoursRef.current = updatedContours;
 onChangeContours(updatedContours, { skipHistory: true });
 setSelectedContourIds((prev) => prev.filter((id) => updatedContours.some((c) => c.id === id)));
 setSelectedContourId((prev) => (prev && updatedContours.some((c) => c.id === prev) ? prev : null));
 setSelectedNodeId((prev) => {
 if (!prev) return null;
 return updatedContours.some((c) => c.nodes.some((n) => n.id === prev)) ? prev : null;
 });
 }
 }
 return;
 }

 if (toolMode === 'brush') {
 if (handleBrushPointerMove(e)) return;
 }



 // Shapes in-progress (RAF throttled for maximum smoothness)
 if (isShapeTool && shapeStartPoint) {
 setIsShiftLockRatio(e.shiftKey);
 setIsAltFromCenter(e.altKey);
 let snapPos = pos;
 if (!e.altKey && (Boolean(gridSettings.snapToGuides) || Boolean(gridSettings.snapToGrid))) {
 const snapResult = snapSinglePoint(
 pos,
 contours,
 snapMetrics,
 customGuidelines,
 Math.max(7, Math.round(12 / zoom)),
 gridSettings
 );
 snapPos = snapResult.point;
 setActiveSnapGuides(snapResult.activeGuides);
 } else {
 setActiveSnapGuides([]);
 }
 if (shapeRafRef.current == null) {
 shapeRafRef.current = requestAnimationFrame(() => {
 shapeRafRef.current = null;
 setShapeCurrentPoint(snapPos);
 });
 }
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

 // Helper to construct shape contours from 2 bounding drag points
 const getShapeContoursFromPoints = (
 mode: ToolMode,
 p1: Point,
 p2: Point,
 options?: { shiftKey?: boolean; altKey?: boolean }
 ): PathContour[] => {
 let startX = p1.x;
 let startY = p1.y;
 let endX = p2.x;
 let endY = p2.y;

 const forceSquare =
 options?.shiftKey ||
 mode === 'square' ||
 mode === 'circle' ||
 isShiftLockRatio;

 // Alt: draw from center
 if (options?.altKey || isAltFromCenter) {
 const dx = Math.abs(endX - startX);
 const dy = Math.abs(endY - startY);
 const maxD = forceSquare ? Math.max(dx, dy) : 0;
 const rx = forceSquare ? maxD : dx;
 const ry = forceSquare ? maxD : dy;
 startX = p1.x - rx;
 startY = p1.y - ry;
 endX = p1.x + rx;
 endY = p1.y + ry;
 } else if (forceSquare) {
 // 1:1 Aspect Ratio Lock
 const dx = endX - startX;
 const dy = endY - startY;
 const side = Math.max(Math.abs(dx), Math.abs(dy));
 endX = startX + (dx >= 0 ? side : -side);
 endY = startY + (dy >= 0 ? side : -side);
 }

 const minX = Math.min(startX, endX);
 const maxX = Math.max(startX, endX);
 const minY = Math.min(startY, endY);
 const maxY = Math.max(startY, endY);
 const width = Math.max(16, maxX - minX);
 const height = Math.max(16, maxY - minY);
 const cx = (minX + maxX) / 2;
 const cy = (minY + maxY) / 2;
 const rx = width / 2;
 const ry = height / 2;

 switch (mode) {
 case 'rect':
 case 'square':
 return [createRectContour(minX, minY, maxX, maxY)];
 case 'rounded_rect':
 return [createRoundedRectContour(cx, cy, width, height, Math.min(width, height) * 0.2)];
 case 'pill':
 return [createPillContour(cx, cy, width, height)];
 case 'ellipse':
 case 'circle':
 return [createEllipseContour(cx, cy, rx, ry)];
 case 'triangle':
 return [createTriangleContour(cx, cy, width, height, 'up')];
 case 'triangle_down':
 return [createTriangleContour(cx, cy, width, height, 'down')];
 case 'right_triangle':
 return [createRightTriangleContour(cx, cy, width, height)];
 case 'semicircle':
 return [createSemicircleContour(cx, cy, rx, ry, 'top')];
 case 'ring':
 return createRingContours(cx, cy, rx, ry * 0.55);
 case 'parallelogram':
 return [createParallelogramContour(cx, cy, width, height, 18)];
 case 'star':
 return [createStarContour(cx, cy, Math.max(rx, ry), Math.max(rx, ry) * 0.42, 5)];
 case 'heart':
 return [createHeartContour(cx, cy, width, height)];
 case 'sparkle':
 return [createSparkleContour(cx, cy, Math.max(rx, ry), 0.22)];
 case 'starburst':
 return [createStarburstContour(cx, cy, Math.max(rx, ry), 0.45, 8)];
 case 'diamond':
 return [createDiamondContour(cx, cy, width, height)];
 case 'polygon':
 return [createHexagonContour(cx, cy, Math.max(rx, ry))];
 case 'crescent':
 return [createCrescentContour(cx, cy, Math.max(rx, ry))];
 case 'line': {
 let lEndX = p2.x;
 let lEndY = p2.y;
 if (options?.shiftKey || isShiftLockRatio) {
 const snapped = snapToStraightAngle(p1.x, p1.y, p2.x, p2.y);
 lEndX = snapped.x;
 lEndY = snapped.y;
 }
 return [createLineContour(p1.x, p1.y, lEndX, lEndY, brushWidth || 32)];
 }
 default:
 return [createRectContour(minX, minY, maxX, maxY)];
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
 const dist = Math.hypot(rulerMeasurement.end.x - rulerMeasurement.start.x, rulerMeasurement.end.y - rulerMeasurement.start.y);
 // If distance is negligible (user tapped/clicked to dismiss or reset), clear measurement
 if (dist < 4) {
 setRulerMeasurement(null);
 return;
 }

 setRulerMeasurement({
 ...rulerMeasurement,
 active: false,
 });
 return;
 }

 // Finalize Eraser Tool sweep session
 if (toolMode === 'eraser' && isErasingRef.current) {
 try {
 (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
 } catch {
 // Ignored
 }
 isErasingRef.current = false;
 lastErasePosRef.current = null;
 activeEraserSvgDRef.current = '';
 if (activeEraserPathRef.current) {
 activeEraserPathRef.current.setAttribute('d', '');
 }

 if (eraserMode === 'cut' && eraserStrokePointsRef.current.length > 0) {
 const eraseRadius = Math.max(2, eraserSize / 2);
 const rawPts = eraserStrokePointsRef.current;
 eraserStrokePointsRef.current = [];
 const pts = rawPts.length === 1
 ? [rawPts[0], { x: rawPts[0].x + 0.1, y: rawPts[0].y + 0.1 }]
 : rawPts;
 const currentContours = contoursRef.current || [];
 const updated = subtractEraserStrokeFromContours(currentContours, pts, eraseRadius);
 if (updated !== currentContours) {
 onCommitHistory?.();
 contoursRef.current = updated;
 onChangeContours(updated);
 showCanvasToast('パスを削り・分割しました');
 }
 } else if (erasedAnyInSessionRef.current) {
 erasedAnyInSessionRef.current = false;
 setSelectedContourIds((prev) => prev.filter((id) => (contoursRef.current || []).some((c) => c.id === id)));
 setSelectedContourId((prev) => (prev && (contoursRef.current || []).some((c) => c.id === prev) ? prev : null));
 setSelectedNodeId((prev) => {
 if (!prev) return null;
 return (contoursRef.current || []).some((c) => c.nodes.some((n) => n.id === prev)) ? prev : null;
 });
 }
 eraserStrokePointsRef.current = [];
 return;
 }

 if (toolMode === 'brush') {
 if (handleBrushPointerUp(e)) return;
 }



 // Finalize Geometric Shape
 if (isShapeTool && shapeStartPoint && shapeCurrentPoint) {
 if (shapeRafRef.current != null) {
 cancelAnimationFrame(shapeRafRef.current);
 shapeRafRef.current = null;
 }
 const dist = Math.hypot(
 shapeCurrentPoint.x - shapeStartPoint.x,
 shapeCurrentPoint.y - shapeStartPoint.y
 );
 // If clicked without dragging, stamp a balanced 180x180 shape centered at click position!
 const p1 =
 dist < 10
 ? { x: shapeStartPoint.x - 90, y: shapeStartPoint.y - 90 }
 : shapeStartPoint;
 const p2 =
 dist < 10
 ? { x: shapeStartPoint.x + 90, y: shapeStartPoint.y + 90 }
 : shapeCurrentPoint;

 const newContours = getShapeContoursFromPoints(toolMode, p1, p2, {
 shiftKey: e.shiftKey,
 altKey: e.altKey,
 });
 const currentContours = contoursRef.current || [];
 const nextContours = [...currentContours, ...newContours];
 contoursRef.current = nextContours;
 onChangeContours(nextContours);
 setSelectedContourIds([]);
 setSelectedContourId(null);
 setShapeStartPoint(null);
 setShapeCurrentPoint(null);
 setIsShiftLockRatio(false);
 setIsAltFromCenter(false);
 onCommitHistory?.();
 return;
 }

 // Finalize Node Drag
 handleNodeDragEnd();

 // Finalize Bounding Box Transform Drag
 if (transformSession) {
 if (transformRafRef.current != null) {
 cancelAnimationFrame(transformRafRef.current);
 transformRafRef.current = null;
 }
 if (pendingTransformContoursRef.current) {
 onChangeContours(pendingTransformContoursRef.current);
 pendingTransformContoursRef.current = null;
 }
 setTransformSession(null);
 setRotateDisplayAngle(null);
 onCommitHistory?.();
 }
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
 // never create a contour or history entry.
 resetBrushDrawing();
 if (isErasingRef.current) {
 isErasingRef.current = false;
 lastErasePosRef.current = null;
 activeEraserSvgDRef.current = '';
 if (activeEraserPathRef.current) {
 activeEraserPathRef.current.setAttribute('d', '');
 }
 erasedAnyInSessionRef.current = false;
 eraserStrokePointsRef.current = [];
 }
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
 if (isErasingRef.current) {
 isErasingRef.current = false;
 lastErasePosRef.current = null;
 activeEraserSvgDRef.current = '';
 if (activeEraserPathRef.current) {
 activeEraserPathRef.current.setAttribute('d', '');
 }
 if (eraserMode === 'cut' && eraserStrokePointsRef.current.length > 0) {
 const eraseRadius = Math.max(2, eraserSize / 2);
 const rawPts = eraserStrokePointsRef.current;
 eraserStrokePointsRef.current = [];
 const pts = rawPts.length === 1
 ? [rawPts[0], { x: rawPts[0].x + 0.1, y: rawPts[0].y + 0.1 }]
 : rawPts;
 const currentContours = contoursRef.current || [];
 const updated = subtractEraserStrokeFromContours(currentContours, pts, eraseRadius);
 if (updated !== currentContours) {
 onCommitHistory?.();
 contoursRef.current = updated;
 onChangeContours(updated);
 }
 } else if (erasedAnyInSessionRef.current) {
 erasedAnyInSessionRef.current = false;
 }
 eraserStrokePointsRef.current = [];
 }
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
 isErasingRef.current = false;
 lastErasePosRef.current = null;
 activeEraserSvgDRef.current = '';
 if (activeEraserPathRef.current) {
 activeEraserPathRef.current.setAttribute('d', '');
 }
 eraserStrokePointsRef.current = [];
 erasedAnyInSessionRef.current = false;
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

 // Transform operations for active selection (single or batch)
 const handleSlantSelected = (angleDeg: number) => {
 if (selectedContourIds.length === 0) return;
 const updated = contours.map((c) =>
 selectedContourIds.includes(c.id) ? slantSingleContour(c, angleDeg) : c
 );
 onChangeContours(updated);
 onCommitHistory?.();
 };

 const handleRotateSelected = (angleDeg: number) => {
 if (selectedContourIds.length === 0) return;
 if (selectedContourIds.length === 1) {
 const updated = contours.map((c) =>
 selectedContourIds.includes(c.id) ? rotateSingleContour(c, angleDeg) : c
 );
 onChangeContours(updated);
 } else {
 const selected = contours.filter((c) => selectedContourIds.includes(c.id));
 const rotated = rotateMultipleContours(selected, angleDeg);
 const rotatedMap = new Map(rotated.map((c) => [c.id, c]));
 onChangeContours(contours.map((c) => rotatedMap.get(c.id) || c));
 }
 onCommitHistory?.();
 };

 const handleScaleSelected = (factor: number) => {
 if (selectedContourIds.length === 0) return;
 if (selectedContourIds.length === 1) {
 const updated = contours.map((c) =>
 selectedContourIds.includes(c.id) ? scaleSingleContour(c, factor, factor) : c
 );
 onChangeContours(updated);
 } else {
 const selected = contours.filter((c) => selectedContourIds.includes(c.id));
 const scaled = scaleMultipleContours(selected, factor, factor);
 const scaledMap = new Map(scaled.map((c) => [c.id, c]));
 onChangeContours(contours.map((c) => scaledMap.get(c.id) || c));
 }
 onCommitHistory?.();
 };

 const handleFlipHSelected = () => {
 if (selectedContourIds.length === 0) return;
 if (selectedContourIds.length === 1) {
 const updated = contours.map((c) =>
 selectedContourIds.includes(c.id) ? flipSingleContourH(c) : c
 );
 onChangeContours(updated);
 } else {
 const selected = contours.filter((c) => selectedContourIds.includes(c.id));
 const flipped = flipMultipleContoursH(selected);
 const flippedMap = new Map(flipped.map((c) => [c.id, c]));
 onChangeContours(contours.map((c) => flippedMap.get(c.id) || c));
 }
 onCommitHistory?.();
 };

 const handleFlipVSelected = () => {
 if (selectedContourIds.length === 0) return;
 if (selectedContourIds.length === 1) {
 const updated = contours.map((c) =>
 selectedContourIds.includes(c.id) ? flipSingleContourV(c) : c
 );
 onChangeContours(updated);
 } else {
 const selected = contours.filter((c) => selectedContourIds.includes(c.id));
 const flipped = flipMultipleContoursV(selected);
 const flippedMap = new Map(flipped.map((c) => [c.id, c]));
 onChangeContours(contours.map((c) => flippedMap.get(c.id) || c));
 }
 onCommitHistory?.();
 };

 const handleDuplicateSelected = () => {
 if (selectedContourIds.length === 0) return;
 if (selectedContourIds.length === 1) {
 const target = contours.find((c) => c.id === selectedContourIds[0]);
 if (!target) return;
 const dup = duplicateContour(target, 40, 40);
 onChangeContours([...contours, dup]);
 setSelectedContourIds([dup.id]);
 } else {
 const selected = contours.filter((c) => selectedContourIds.includes(c.id));
 const dups = duplicateMultipleContours(selected, 40, 40);
 onChangeContours([...contours, ...dups]);
 setSelectedContourIds(dups.map((d) => d.id));
 }
 onCommitHistory?.();
 };

 const handleDeleteSelected = () => {
 if (selectedContourIds.length === 0) return;
 const remaining = contours.filter((c) => !selectedContourIds.includes(c.id));
 if (remaining.length === 0) {
 if (activeBrushPathRef.current) {
 activeBrushPathRef.current.setAttribute('d', '');
 }
 activeBrushSvgDRef.current = '';
 if (activeEraserPathRef.current) {
 activeEraserPathRef.current.setAttribute('d', '');
 }
 activeEraserSvgDRef.current = '';
 brushStrokePointsRef.current = [];
 }
 onChangeContours(remaining);
 setSelectedContourIds([]);
 setSelectedNodeId(null);
 setSelectedHandleType(null);
 onCommitHistory?.();
 };

 // Merge / Union selected contours into a single path or resolve single-stroke cursive overlaps
 const handleMergeSelectedContours = () => {
 const isExplicit = selectedContourIds.length > 0;
 const targets = isExplicit
 ? contours.filter((c) => selectedContourIds.includes(c.id))
 : contours;

 if (targets.length === 0) {
 showCanvasToast('対象となる輪郭がありません');
 return;
 }

 const merged = unionContours(targets, 1.2, true);
 if (merged.length === 0) {
 showCanvasToast('重なり白抜き解消に失敗しました');
 return;
 }

 const otherContours = isExplicit
 ? contours.filter((c) => !selectedContourIds.includes(c.id))
 : [];
 const newContours = [...otherContours, ...merged];
 onChangeContours(newContours);
 setSelectedContourIds(merged.map((m) => m.id));
 onCommitHistory?.();

 if (targets.length === 1) {
 showCanvasToast(
 '一筆書きの交差・重なり白抜きを解消しました',
 '交差ループが融解され、滑らかな単一輪郭になりました'
 );
 } else {
 showCanvasToast(
 `${targets.length}個のパスを結合し、白抜きを解消しました`,
 `重なりが結合され、${merged.length}個の輪郭になりました`
 );
 }
 };

 // Boolean Difference (型抜き): Subtract cutter paths from base path
 const handleSubtractSelectedContours = () => {
 if (selectedContourIds.length < 2) {
 showCanvasToast('型抜きには2つ以上のパスを選択してください');
 return;
 }
 const selected = contours.filter((c) => selectedContourIds.includes(c.id));
 const base = [selected[0]];
 const cutters = selected.slice(1);
 const result = booleanSubtractContours(base, cutters);
 if (result.length === 0) {
 showCanvasToast('型抜き結果が空になりました');
 return;
 }
 const other = contours.filter((c) => !selectedContourIds.includes(c.id));
 const updated = [...other, ...result];
 onChangeContours(updated);
 setSelectedContourIds(result.map((r) => r.id));
 onCommitHistory?.();
 showCanvasToast('パスを型抜き（前面で背面を切り抜き）しました');
 };

 // Boolean Intersection (交差): Keep only overlapping region
 const handleIntersectSelectedContours = () => {
 if (selectedContourIds.length < 2) {
 showCanvasToast('交差には2つ以上のパスを選択してください');
 return;
 }
 const selected = contours.filter((c) => selectedContourIds.includes(c.id));
 const base = [selected[0]];
 const cutters = selected.slice(1);
 const result = booleanIntersectContours(base, cutters);
 if (result.length === 0) {
 showCanvasToast('交差部分がありませんでした');
 return;
 }
 const other = contours.filter((c) => !selectedContourIds.includes(c.id));
 const updated = [...other, ...result];
 onChangeContours(updated);
 setSelectedContourIds(result.map((r) => r.id));
 onCommitHistory?.();
 showCanvasToast('パスの交差重なり部分を抽出しました');
 };

 // Reverse / Flip Winding Order (時計回り ⇄ 反時計回り) to fix transparent overlaps or create holes
 const handleReverseWindingSelected = () => {
 if (selectedContourIds.length === 0) return;
 const updated = contours.map((c) => {
 if (!selectedContourIds.includes(c.id)) return c;
 return reverseContour(c);
 });
 onChangeContours(updated);
 onCommitHistory?.();
 showCanvasToast(
 '輪郭の向き（回転方向）を反転しました',
 '重なりが白抜き/黒塗りに反転します'
 );
 };



 // Shape-Preserving Stroke Smoothing & Anchor Point Reduction
 const handleSmoothStrokeSelected = (
 level: 'mild' | 'standard' | 'strong' = smoothStrength,
 preserveCorners: boolean = smoothPreserveCorners
 ) => {
 if (selectedContourIds.length === 0) {
 handleSmoothStrokeAll(level, preserveCorners);
 return;
 }
 const updated = contours.map((c) => {
 if (!selectedContourIds.includes(c.id)) return c;
 return smoothStrokeContour(c, { level, preserveCorners }).contour;
 });
 onChangeContours(updated);
 onCommitHistory?.();

 const levelName = level === 'mild' ? 'マイルド' : level === 'strong' ? '強力' : '標準';
 showCanvasToast(
 `選択パスを平滑化 (${levelName})`,
 `${selectedContourIds.length}個のパスのアンカーポイント最適化完了`
 );
 };

 const handleSmoothStrokeAll = (
 level: 'mild' | 'standard' | 'strong' = smoothStrength,
 preserveCorners: boolean = smoothPreserveCorners
 ) => {
 if (contours.length === 0) return;
 const result = smoothContoursPreservingShape(contours, { level, preserveCorners });
 onChangeContours(result.contours);
 onCommitHistory?.();

 const levelName = level === 'mild' ? 'マイルド' : level === 'strong' ? '強力' : '標準';
 showCanvasToast(
 `全ストロークを一括平滑化 (${levelName})`,
 `全パーツ合計: ${result.totalOriginalPoints}点 → ${result.totalReducedPoints}点 (-${result.totalReductionPercent}% 削減)`
 );
 };

 // 1-Click Straighten & De-wobble wobbly strokes
 const handleStraightenWobblySelected = () => {
 if (selectedContourIds.length === 0) {
 handleStraightenWobblyAll();
 return;
 }
 const updated = contours.map((c) => {
 if (!selectedContourIds.includes(c.id)) return c;
 return straightenWobblyContour(c);
 });
 onChangeContours(updated);
 onCommitHistory?.();
 showCanvasToast('選択パスの歪み・うねりを直線化補正しました', `${selectedContourIds.length}個のパーツ`);
 };

 const handleStraightenWobblyAll = () => {
 if (contours.length === 0) return;
 const updated = contours.map((c) => straightenWobblyContour(c));
 onChangeContours(updated);
 onCommitHistory?.();
 showCanvasToast('全ストロークの歪み・うねりを直線化補正しました', `${contours.length}個のパーツ`);
 };

 // Path Simplification & Curvature Conversions
 const handleSimplifyAll = (tolerance: number = 6) => {
 if (contours.length === 0) return;
 const simplified = contours.map((c) => simplifyContour(c, tolerance));
 onChangeContours(simplified);
 onCommitHistory?.();
 };

 const handleSimplifySelected = (tolerance: number = 6) => {
 if (selectedContourIds.length === 0) return;
 const updated = contours.map((c) =>
 selectedContourIds.includes(c.id) ? simplifyContour(c, tolerance) : c
 );
 onChangeContours(updated);
 onCommitHistory?.();
 };

 const handleConvertToCornersSelected = () => {
 if (selectedContourIds.length === 0) return;
 const updated = contours.map((c) =>
 selectedContourIds.includes(c.id) ? convertContourToCorners(c) : c
 );
 onChangeContours(updated);
 onCommitHistory?.();
 };

 const handleConvertToSmoothSelected = () => {
 if (selectedContourIds.length === 0) return;
 const updated = contours.map((c) =>
 selectedContourIds.includes(c.id) ? convertContourToSmooth(c) : c
 );
 onChangeContours(updated);
 onCommitHistory?.();
 };

 const handleToggleClosedSelected = () => {
 if (selectedContourIds.length === 0) return;
 const updated = contours.map((c) =>
 selectedContourIds.includes(c.id) ? { ...c, closed: !c.closed } : c
 );
 onChangeContours(updated);
 onCommitHistory?.();
 };

 const handleExpandStrokeSelected = () => {
 if (selectedContourIds.length === 0) return;
 const targetContours = contours.filter((c) => selectedContourIds.includes(c.id));
 const nonTargetContours = contours.filter((c) => !selectedContourIds.includes(c.id));
 const expanded = expandStrokeContours(targetContours, penStrokeWidth, penCapStyle);
 if (expanded && expanded.length > 0) {
 onChangeContours([...nonTargetContours, ...expanded]);
 setSelectedContourIds(expanded.map((e) => e.id));
 setSelectedContourId(expanded[0].id);
 onCommitHistory?.();
 showCanvasToast(
 `選択パスを太さ ${penStrokeWidth}px の線輪郭に変換しました`,
 `${expanded.length} 個の輪郭 (端点: ${penCapStyle === 'round' ? '丸' : penCapStyle === 'butt' ? '平' : '角'})`
 );
 }
 };


 // Memoized SVG Paths using WeakMap cache so panning, zooming, and adding new strokes do not recalculate existing complex curves
 const mainSvgPath = useMemo(() => {
 if (!contours || contours.length === 0) return '';
 return contours.map(getCachedContourSvgPath).join(' ');
 }, [contours]);
 const penSvgPath = useMemo(
 () => (activePenContour ? contoursToSvgPath([activePenContour]) : ''),
 [activePenContour]
 );
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
 {contours.map((contour) => {
 const isSelected = selectedContourIds.includes(contour.id);
 const pathD = contourSvgMap.get(contour.id) || contoursToSvgPath([contour]);
 return (
 <path
 key={`contour-hit-${contour.id}`}
 d={pathD}
 fill="transparent"
 stroke={isSelected ? selectionColor : 'transparent'}
 strokeWidth={isSelected ? Math.max(2, 2.5 / zoom) : Math.max(14, 18 / zoom)}
 strokeDasharray={isSelected ? '6 4' : undefined}
 className={toolMode === 'select' || toolMode === 'node' ? 'cursor-pointer' : 'pointer-events-none'}
 pointerEvents={toolMode === 'select' ? 'stroke fill' : toolMode === 'node' ? 'stroke' : 'none'}
 onPointerDown={(e) => {
 if (toolMode === 'node') {
 e.stopPropagation();
 const clickPos = screenToCanvas(e.clientX, e.clientY);
 const insertResult = insertNodeOnContourAtPoint(contour, clickPos, 16 / zoom);
 if (insertResult) {
 const newContours = contours.map((c) => (c.id === contour.id ? insertResult.updatedContour : c));
 onChangeContours(newContours);
 setSelectedContourId(contour.id);
 setSelectedContourIds([contour.id]);
 setSelectedNodeId(insertResult.newNodeId);
 setSelectedHandleType('node');
 const insertedNode = insertResult.updatedContour.nodes.find((n) => n.id === insertResult.newNodeId);
 if (insertedNode) {
  nodeDragSessionRef.current = {
   contourId: contour.id,
   nodeId: insertResult.newNodeId,
   handleType: 'node',
   startPos: clickPos,
   initialNode: { ...insertedNode },
   initialContour: { ...insertResult.updatedContour },
  };
  try {
   (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  } catch {
   // Ignored
  }
 }
 onCommitHistory?.();
 showCanvasToast('頂点を追加しました', 'ドラッグして位置を調整できます');
 return;
 }
 setSelectedContourId(contour.id);
 setSelectedContourIds([contour.id]);
 return;
 }
 if (toolMode === 'select') {
 e.stopPropagation();
 if (e.shiftKey) {
 setSelectedContourIds((prev) =>
 prev.includes(contour.id)
 ? prev.filter((id) => id !== contour.id)
 : [...prev, contour.id]
 );
 } else {
 const nextIds =
 selectedContourIds.includes(contour.id) && selectedContourIds.length > 1
 ? selectedContourIds
 : [contour.id];
 setSelectedContourIds(nextIds);
 setSelectedContourId(contour.id);
 handleTransformPointerDown(e, 'move', nextIds);
 }
 setSelectedNodeId(null);
 setSelectedHandleType(null);
 }
 }}
 onDoubleClick={(e) => {
 e.stopPropagation();
 if (onSetToolMode) {
 onSetToolMode('node');
 }
 setSelectedContourId(contour.id);
 setSelectedContourIds([contour.id]);
 setSelectedNodeId(null);
 setSelectedHandleType(null);
 showCanvasToast('ノード編集モードに切り替えました', 'アンカーポイントとハンドルを直接編集できます');
 }}
 />
 );
 })}

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

 {/* Active Pen Path in-progress */}
 {penSvgPath && (
 <path
 d={penSvgPath}
 fill="none"
 stroke="#38bdf8"
 strokeWidth={2}
 strokeDasharray="4 2"
 />
 )}

 {/* Rubber band line to mouse for Pen */}
 {toolMode === 'pen' && activePenContour && penMousePos && activePenContour.nodes.length > 0 && (
 <line
 x1={activePenContour.nodes[activePenContour.nodes.length - 1].x}
 y1={activePenContour.nodes[activePenContour.nodes.length - 1].y}
 x2={penMousePos.x}
 y2={penMousePos.y}
 stroke="#0284c7"
 strokeWidth={1.5}
 strokeDasharray="3 3"
 />
 )}

 {/* Active Brush Stroke in-progress (Hardware-accelerated live path) */}
 <path
 ref={activeBrushPathRef}
 d={activeBrushSvgDRef.current || ''}
 fill={isOutlineMode ? 'none' : inkFillColor}
 stroke={isOutlineMode ? (isLight ? '#0284c7' : '#38bdf8') : inkStrokeColor}
 strokeWidth={1.5}
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
 {isShapeTool && shapeStartPoint && shapeCurrentPoint && (
 <path
 d={contoursToSvgPath(
 getShapeContoursFromPoints(toolMode, shapeStartPoint, shapeCurrentPoint)
 )}
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

 {/* ---------------- HIGH-CONTRAST CURSOR CROSSHAIR OVERLAY ---------------- */}
 {gridSettings.showCursorCrosshair && hoverCanvasPos && toolMode !== 'brush' && (
 <g className="canvas-cursor-crosshair pointer-events-none select-none">
 {/* Horizontal full line with dual-tone white/dark contrast */}
 <line
 x1={-300}
 y1={hoverCanvasPos.y}
 x2={1300}
 y2={hoverCanvasPos.y}
 stroke="#ffffff"
 strokeWidth={2.5 / zoom}
 strokeOpacity={0.6}
 />
 <line
 x1={-300}
 y1={hoverCanvasPos.y}
 x2={1300}
 y2={hoverCanvasPos.y}
 stroke="#059669"
 strokeWidth={1.2 / zoom}
 strokeDasharray="4 3"
 />

 {/* Vertical full line with dual-tone white/dark contrast */}
 <line
 x1={hoverCanvasPos.x}
 y1={-300}
 x2={hoverCanvasPos.x}
 y2={1300}
 stroke="#ffffff"
 strokeWidth={2.5 / zoom}
 strokeOpacity={0.6}
 />
 <line
 x1={hoverCanvasPos.x}
 y1={-300}
 x2={hoverCanvasPos.x}
 y2={1300}
 stroke="#059669"
 strokeWidth={1.2 / zoom}
 strokeDasharray="4 3"
 />

 {/* Central Target Reticle Ring */}
 <circle
 cx={hoverCanvasPos.x}
 cy={hoverCanvasPos.y}
 r={12 / zoom}
 fill="none"
 stroke="#ffffff"
 strokeWidth={2.5 / zoom}
 />
 <circle
 cx={hoverCanvasPos.x}
 cy={hoverCanvasPos.y}
 r={12 / zoom}
 fill="rgba(16, 185, 129, 0.1)"
 stroke={selectionColor}
 strokeWidth={1.5 / zoom}
 />
 <circle
 cx={hoverCanvasPos.x}
 cy={hoverCanvasPos.y}
 r={2.5 / zoom}
 fill="#ffffff"
 />
 <circle
 cx={hoverCanvasPos.x}
 cy={hoverCanvasPos.y}
 r={1.5 / zoom}
 fill={selectionColor}
 />
 </g>
 )}

 {/* ---------------- HARDWARE-ACCELERATED BRUSH DRAWING RETICLE (0ms DIRECT GPU DOM TRACKING) ---------------- */}
 {toolMode === 'brush' && gridSettings.showCursorCrosshair && (
 <g
 ref={drawingReticleRef}
 id="live-drawing-reticle"
 className="brush-drawing-reticle pointer-events-none select-none"
 style={{ display: 'none' }}
 >
 {/* Outer high-contrast white backing circle */}
 <circle
 cx={0}
 cy={0}
 r={Math.max(4, brushWidth / 2)}
 fill="rgba(16, 185, 129, 0.08)"
 stroke="#ffffff"
 strokeWidth={2.8 / zoom}
 />
 {/* Inner high-contrast emerald precision ring */}
 <circle
 cx={0}
 cy={0}
 r={Math.max(4, brushWidth / 2)}
 fill="none"
 stroke="#059669"
 strokeWidth={1.5 / zoom}
 />

 {/* 4 Cardinal Crosshair Ticks across brush boundary */}
 {/* Top tick */}
 <line
 x1={0}
 y1={-Math.max(4, brushWidth / 2) - 5 / zoom}
 x2={0}
 y2={-Math.max(4, brushWidth / 2) + 5 / zoom}
 stroke="#ffffff"
 strokeWidth={2.8 / zoom}
 strokeLinecap="round"
 />
 <line
 x1={0}
 y1={-Math.max(4, brushWidth / 2) - 5 / zoom}
 x2={0}
 y2={-Math.max(4, brushWidth / 2) + 5 / zoom}
 stroke="#059669"
 strokeWidth={1.4 / zoom}
 strokeLinecap="round"
 />

 {/* Bottom tick */}
 <line
 x1={0}
 y1={Math.max(4, brushWidth / 2) - 5 / zoom}
 x2={0}
 y2={Math.max(4, brushWidth / 2) + 5 / zoom}
 stroke="#ffffff"
 strokeWidth={2.8 / zoom}
 strokeLinecap="round"
 />
 <line
 x1={0}
 y1={Math.max(4, brushWidth / 2) - 5 / zoom}
 x2={0}
 y2={Math.max(4, brushWidth / 2) + 5 / zoom}
 stroke="#059669"
 strokeWidth={1.4 / zoom}
 strokeLinecap="round"
 />

 {/* Left tick */}
 <line
 x1={-Math.max(4, brushWidth / 2) - 5 / zoom}
 y1={0}
 x2={-Math.max(4, brushWidth / 2) + 5 / zoom}
 y2={0}
 stroke="#ffffff"
 strokeWidth={2.8 / zoom}
 strokeLinecap="round"
 />
 <line
 x1={-Math.max(4, brushWidth / 2) - 5 / zoom}
 y1={0}
 x2={-Math.max(4, brushWidth / 2) + 5 / zoom}
 y2={0}
 stroke="#059669"
 strokeWidth={1.4 / zoom}
 strokeLinecap="round"
 />

 {/* Right tick */}
 <line
 x1={Math.max(4, brushWidth / 2) - 5 / zoom}
 y1={0}
 x2={Math.max(4, brushWidth / 2) + 5 / zoom}
 y2={0}
 stroke="#ffffff"
 strokeWidth={2.8 / zoom}
 strokeLinecap="round"
 />
 <line
 x1={Math.max(4, brushWidth / 2) - 5 / zoom}
 y1={0}
 x2={Math.max(4, brushWidth / 2) + 5 / zoom}
 y2={0}
 stroke="#059669"
 strokeWidth={1.4 / zoom}
 strokeLinecap="round"
 />

 {/* Center Target Dot: White Outer Ring + Emerald Center */}
 <circle
 cx={0}
 cy={0}
 r={3.2 / zoom}
 fill="#ffffff"
 />
 <circle
 cx={0}
 cy={0}
 r={1.8 / zoom}
 fill="#059669"
 />

 {/* Floating brush size tag badge above cursor */}
 {brushWidth >= 20 && (
 <g transform={`translate(0, ${-Math.max(4, brushWidth / 2) - 13 / zoom})`}>
 <rect
 x={-28 / zoom}
 y={-9 / zoom}
 width={56 / zoom}
 height={16 / zoom}
 rx={8 / zoom}
 fill="#0f172a"
 stroke="#ffffff"
 strokeWidth={1.5 / zoom}
 opacity={0.9}
 />
 <text
 x={0}
 y={0}
 textAnchor="middle"
 dominantBaseline="central"
 fill="#ffffff"
 fontSize={9 / zoom}
 fontWeight="bold"
 fontFamily="system-ui, -apple-system, sans-serif"
 >
 {brushWidth}px
 </text>
 </g>
 )}
 </g>
 )}

 {/* ---------------- HARDWARE-ACCELERATED ERASER RETICLE (0ms DIRECT GPU DOM TRACKING) ---------------- */}
 {toolMode === 'eraser' && gridSettings.showCursorCrosshair && (
 <g
 ref={eraserReticleRef}
 id="live-eraser-reticle"
 className="eraser-sweep-reticle pointer-events-none select-none"
 style={{ display: 'none' }}
 >
 {eraserMode === 'node' ? (
 /* Specialized Anchor Point Eraser (アンカー点消去) Pointer */
 <g className="anchor-eraser-pointer">
 {/* Outer glow & deletion boundary circle */}
 <circle
 cx={0}
 cy={0}
 r={eraserSize / 2}
 fill="rgba(244, 63, 94, 0.12)"
 stroke="#ffffff"
 strokeWidth={3 / zoom}
 />
 {/* Inner high-contrast dashed ring */}
 <circle
 cx={0}
 cy={0}
 r={eraserSize / 2}
 fill="none"
 stroke="#e11d48"
 strokeWidth={1.8 / zoom}
 strokeDasharray={`${5 / zoom} ${3 / zoom}`}
 />

 {/* High-contrast precision crosshair lines */}
 {/* Horizontal white backing */}
 <line
 x1={-eraserSize / 2 - 6 / zoom}
 y1={0}
 x2={eraserSize / 2 + 6 / zoom}
 y2={0}
 stroke="#ffffff"
 strokeWidth={2.8 / zoom}
 strokeLinecap="round"
 />
 {/* Horizontal rose crosshair */}
 <line
 x1={-eraserSize / 2 - 6 / zoom}
 y1={0}
 x2={eraserSize / 2 + 6 / zoom}
 y2={0}
 stroke="#e11d48"
 strokeWidth={1.4 / zoom}
 strokeLinecap="round"
 />
 {/* Vertical white backing */}
 <line
 x1={0}
 y1={-eraserSize / 2 - 6 / zoom}
 x2={0}
 y2={eraserSize / 2 + 6 / zoom}
 stroke="#ffffff"
 strokeWidth={2.8 / zoom}
 strokeLinecap="round"
 />
 {/* Vertical rose crosshair */}
 <line
 x1={0}
 y1={-eraserSize / 2 - 6 / zoom}
 x2={0}
 y2={eraserSize / 2 + 6 / zoom}
 stroke="#e11d48"
 strokeWidth={1.4 / zoom}
 strokeLinecap="round"
 />

 {/* Center Node Target Diamond/Box */}
 <rect
 x={-4 / zoom}
 y={-4 / zoom}
 width={8 / zoom}
 height={8 / zoom}
 fill="#ffffff"
 stroke="#0f172a"
 strokeWidth={1.5 / zoom}
 rx={1 / zoom}
 />
 {/* Minus / Delete symbol inside center diamond */}
 <line
 x1={-2 / zoom}
 y1={0}
 x2={2 / zoom}
 y2={0}
 stroke="#e11d48"
 strokeWidth={1.5 / zoom}
 strokeLinecap="round"
 />

 {/* Floating Tag Badge Above Cursor */}
 <g transform={`translate(0, ${-eraserSize / 2 - 14 / zoom})`}>
 <rect
 x={-58 / zoom}
 y={-10 / zoom}
 width={116 / zoom}
 height={18 / zoom}
 rx={9 / zoom}
 fill="#0f172a"
 stroke="#ffffff"
 strokeWidth={1.5 / zoom}
 opacity={0.95}
 />
 <text
 x={0}
 y={0}
 textAnchor="middle"
 dominantBaseline="central"
 fill="#ffffff"
 fontSize={10 / zoom}
 fontWeight="bold"
 fontFamily="system-ui, -apple-system, sans-serif"
 >
 ⌖ アンカー消去 ({eraserSize}px)
 </text>
 </g>
 </g>
 ) : (
 /* Stroke / Cut Standard Eraser Pointer */
 <g className="standard-eraser-pointer">
 {/* Outer high-contrast ring */}
 <circle
 cx={0}
 cy={0}
 r={eraserSize / 2}
 fill="rgba(239, 68, 68, 0.16)"
 stroke="#ffffff"
 strokeWidth={2.5 / zoom}
 />
 {/* Inner dashed red circle */}
 <circle
 cx={0}
 cy={0}
 r={eraserSize / 2}
 fill="none"
 stroke="#ef4444"
 strokeWidth={1.8 / zoom}
 strokeDasharray={`${4 / zoom} ${3 / zoom}`}
 />
 {/* Center point */}
 <circle
 cx={0}
 cy={0}
 r={2.5 / zoom}
 fill="#ef4444"
 stroke="#ffffff"
 strokeWidth={1 / zoom}
 />
 </g>
 )}
 </g>
 )}

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

