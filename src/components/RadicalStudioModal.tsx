import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
 X,
 Sparkles,
 Plus,
 Minus,
 Trash2,
 Copy,
 Download,
 Upload,
 MousePointer,
 PenTool,
 Paintbrush,
 Eraser,
 Square,
 Circle,
 Triangle,
 Star,
 Heart,
 Diamond,
 Hand,
 RotateCcw,
 RotateCw,
 FlipHorizontal,
 FlipVertical,
 Italic,
 Maximize2,
 ZoomIn,
 ZoomOut,
 Layers,
 Search,
 Check,
 ArrowRight,
 Move,
 FileCode,
 Shapes,
 Sliders,
 Undo2,
 Redo2,
 FolderOpen,
 BookmarkPlus,
 Scissors,
 GripVertical,
 CornerDownLeft,
 Minimize2,
 ChevronLeft,
 ChevronRight,
 ChevronDown,
 RefreshCw,
 ShieldCheck,
 CircleDot,
 Disc,
 Moon,
 Slash,
 Hexagon,
 Wand2,
 BookOpen,
 Database,
} from 'lucide-react';
import { BundledFontsModal } from './BundledFontsModal';
import {
 RADICAL_KANJI_DATABASE,
 KANJI_RADICAL_CATEGORIES,
 searchRadicalDatabase,
 RadicalEntry,
 getRadicalEntry,
} from '../data/kanjiRadicalDatabase';
import {
 CustomPart,
 PartCategory,
 PathContour,
 BezierNode,
 Point,
 StrokePoint,
 ToolMode,
 BrushStyle,
 ShapeType,
 RadicalPlacement,
 GlyphData,
 FontProject,
} from '../types';
import {
 generateId,
 contoursToSvgPath,
 strokePointsToOutline,
 smoothStrokeContour,
 createRectContour,
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
 createCrescentContour,
 slantSingleContour,
 rotateSingleContour,
 scaleSingleContour,
 flipSingleContourH,
 flipSingleContourV,
 slantContours,
 scaleContours,
 flipContoursHorizontal,
 flipContoursVertical,
 transformContoursForPlacement,
 getContoursBoundingBox,
 unionContours,
 normalizeGlyphContoursWinding,
 groupContoursForRendering,
 simplifyGlyphContours,
 isPointNearContour,
 eraseContoursAtPoint,
 subtractEraserStrokeFromContours,
 flipMultipleContoursH,
 flipMultipleContoursV,
 expandStrokeContours,
} from '../utils/pathUtils';
import { parseSvgStringToContours } from '../utils/svgParser';
import { SCREEN_BASELINE_Y } from '../utils/fontCompiler';
import { ThemeMode, isLightTheme } from '../utils/theme';
import { loadCustomParts, saveCustomParts } from '../utils/customPartsStorage';
import { KANJI_RADICALS } from '../data/kanjiRadicals';
import { KANGXI_214_RADICALS } from '../data/kangxi214Radicals';
import {
 getOrExtractRadicalContours,
 RADICAL_FONT_OPTIONS,
 FontStyleOption,
 INITIAL_STUDIO_RADICAL_DEFS,
} from '../utils/radicalExtractor';

import {
  CUSTOM_PARTS_STORAGE_KEY,
  StudioRadicalPresetItem,
  STUDIO_RADICAL_PRESETS,
  RadicalStudioModalProps,
  CATEGORY_TABS,
  KANJI_PRESETS_BY_CATEGORY,
  sanitizeCustomParts,
} from './radicalStudio/types';
import { RadicalLeftSidebar } from './radicalStudio/RadicalLeftSidebar';
import { RadicalRightSidebar } from './radicalStudio/RadicalRightSidebar';
import { RadicalMobileDrawer, MobileSheetTab, MobileSheetSnap } from './radicalStudio/RadicalMobileDrawer';
import { RadicalShortcutsHelpModal } from './radicalStudio/RadicalShortcutsHelpModal';
import { RadicalExtractContoursModal } from './radicalStudio/RadicalExtractContoursModal';
import { RadicalTopRibbon } from './radicalStudio/RadicalTopRibbon';
import { RadicalCanvasToolbar } from './radicalStudio/RadicalCanvasToolbar';
import { RadicalToolSettingsBar } from './radicalStudio/RadicalToolSettingsBar';
import { RadicalCanvasArea } from './radicalStudio/RadicalCanvasArea';
import { useRadicalCanvas } from './radicalStudio/useRadicalCanvas';




export const RadicalStudioModal: React.FC<RadicalStudioModalProps> = ({
 isOpen,
 onClose,
 project,
 selectedChar,
 selectedUnicode,
 onInsertToCurrentGlyph,
 onBatchInsertToGlyphs,
 theme,
 onShowToast,
}) => {
 const isLight = isLightTheme(theme);

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
 // Initial custom parts with ready-to-use vector contours
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

 const [selectedPartId, setSelectedPartId] = useState<string>(() => {
 return parts[0]?.id || '';
 });

 // Current editing part state with guaranteed non-null contours array
 const activePart = useMemo(() => {
 const found = parts.find((p) => p && p.id === selectedPartId) || parts[0] || null;
 if (!found) return null;
 return {
 ...found,
 contours: Array.isArray(found.contours) ? found.contours : [],
 };
 }, [parts, selectedPartId]);

 const hasActiveContours = Boolean(activePart && activePart.contours && activePart.contours.length > 0);

 // Sidebar Tab & Filter & Search state
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
 const isPressureSensitivity = (value: string): value is 'high' | 'normal' | 'low' | 'off' =>
   value === 'high' || value === 'normal' || value === 'low' || value === 'off';
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

 // Magnetic Snapping States
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
 const [selectedHandleType, setSelectedHandleType] = useState<'node' | 'handleIn' | 'handleOut' | null>(null);
 const [isDraggingNode, setIsDraggingNode] = useState(false);
 const [isDraggingContour, setIsDraggingContour] = useState(false);
 const [dragStartPoint, setDragStartPoint] = useState<Point>({ x: 0, y: 0 });
 const dragStartContoursRef = useRef<PathContour[] | null>(null);
 const dragCurrentContoursRef = useRef<PathContour[] | null>(null);

 // Spacebar pan navigation & hover & transform states
 const [isSpacePressed, setIsSpacePressed] = useState<boolean>(false);
 const [hoveredContourId, setHoveredContourId] = useState<string | null>(null);
 const [transformHandle, setTransformHandle] = useState<'move' | 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | null>(null);
 const transformSessionRef = useRef<{
   handle: 'move' | 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
   startPoint: Point;
   initialBBox: { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number; centerX: number; centerY: number };
   initialContours: PathContour[];
 } | null>(null);

 // Undo / Redo history stacks
  const [undoStack, setUndoStack] = useState<PathContour[][]>([]);
  const [redoStack, setRedoStack] = useState<PathContour[][]>([]);

  // Notification helper
  const notify = useCallback(
    (text: string, type: 'success' | 'info' | 'warning' | 'error' = 'info') => {
      onShowToast?.(text, type);
    },
    [onShowToast]
  );

  // Eraser tool settings
  const [eraserMode, setEraserMode] = useState<'stroke' | 'cut' | 'node'>('stroke');
  const [eraserRadius, setEraserRadius] = useState<number>(24);

  // Insertion & Extraction modals and settings
  const [targetChar, setTargetChar] = useState<string>(selectedChar || '休');
  const [insertPlacement, setInsertPlacement] = useState<RadicalPlacement>('original');
  const [showExtractModal, setShowExtractModal] = useState<boolean>(false);
  const [extractSearch, setExtractSearch] = useState<string>('');

  // UI Panels, drawer and fullscreen toggles
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState<boolean>(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState<boolean>(true);
  const [rightTab, setRightTab] = useState<'transform' | 'compose'>('transform');
  const [mobileSheetSnap, setMobileSheetSnap] = useState<MobileSheetSnap>('peek');
  const [mobileSheetTab, setMobileSheetTab] = useState<MobileSheetTab>('radicals');

  // File input refs
  const svgFileInputRef = useRef<HTMLInputElement>(null);
  const jsonFileInputRef = useRef<HTMLInputElement>(null);

  // History management
  const commitPartChange = (newContours: PathContour[]) => {
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
  };

  // Canvas engine & pointer interactions encapsulated in useRadicalCanvas hook
  const {
    svgCanvasRef,
    canvasContainerRef,
    isPanning,
    isMoveAllPart,
    setIsMoveAllPart,
    activeBrushPathRef,
    activeEraserPathRef,
    activePenContour,
    setActivePenContour,
    penMousePos,
    penHudPos,
    setPenHudPos,
    isPenNearFirstNode,
    eraserHoverPos,
    setEraserHoverPos,
    shapeStartPoint,
    shapeCurrentPoint,
    activeShapeType,
    setActiveShapeType,
    showShapeMenu,
    setShowShapeMenu,
    penStrokeWidth,
    setPenStrokeWidth,
    showPenStrokeMenu,
    setShowPenStrokeMenu,
    brushSvgPath,
    penSvgPath,
    getShapeContours,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    handleWheel,
    handleUndoPartPenNode,
    handleResetPartPenContour,
    handleFinishPartPenContour,
    handlePartPenHudPointerDown,
    handlePartPenHudPointerMove,
    handlePartPenHudPointerUp,
  } = useRadicalCanvas({

    activePart,
    commitPartChange,
    toolMode,
    setToolMode,
    brushStyle,
    brushWidth,
    isStraightMode,
    pressureSensitivity,
    eraserMode,
    eraserRadius,
    isAutoUnionMode,
    notify,
    zoom,
    setZoom,
    pan,
    setPan,
    isSpacePressed,
    selectedNodeId,
    setSelectedNodeId,
    selectedContourId,
    setSelectedContourId,
    activeSnapLines,
    setActiveSnapLines,
    setParts,
    isSnapEnabled,
    showGrid,
    setUndoStack,
    setRedoStack,
  });

  const resetView = useCallback(() => {
    const el = canvasContainerRef.current;
    if (!el) {
      setZoom(0.55);
      setPan({ x: 180, y: 140 });
      return;
    }
    const rect = el.getBoundingClientRect();
    const fitZoom = Math.min((rect.width - 60) / 1000, (rect.height - 60) / 1000);
    const clampedZoom = Math.max(0.2, Math.min(1.5, Number(fitZoom.toFixed(2))));
    setZoom(clampedZoom);
    setPan({
      x: (rect.width - 1000 * clampedZoom) / 2,
      y: (rect.height - 1000 * clampedZoom) / 2,
    });
  }, [canvasContainerRef]);




 useEffect(() => {
 if (isOpen) {
 const timer = setTimeout(() => {
 resetView();
 }, 50);
 return () => clearTimeout(timer);
 }
 }, [isOpen, resetView]);

 useEffect(() => {
 setUndoStack([]);
 setRedoStack([]);
 setSelectedContourId(null);
 setSelectedNodeId(null);
 setActivePenContour(null);
 }, [selectedPartId]);

 // Related Kanji list containing current radical for watermark tracing guide picker
 const relatedKanjiList = useMemo(() => {
 if (!activePart) return ['休', '体', '保', '信', '作', '使', '個', '倍', '値', '倶'];

 const partName = activePart.name || '';
 const matchEntry = RADICAL_KANJI_DATABASE.find(
 (r) =>
 (partName && (partName.includes(r.name) || r.name.includes(partName))) ||
 (activePart.char && r.char === activePart.char) ||
 r.id === activePart.id
 );

 if (matchEntry && matchEntry.kanjiList.length > 0) {
 return matchEntry.kanjiList;
 }

 const categoryPresets = (activePart?.category ? KANJI_PRESETS_BY_CATEGORY[activePart.category] : null) || KANJI_PRESETS_BY_CATEGORY.other;
 const projectChars = (Object.values(project.glyphs || {}) as GlyphData[]).map((g) => g.char);
 const combined = Array.from(new Set([...categoryPresets, ...projectChars])).filter(Boolean);
 return combined.length > 0 ? combined.slice(0, 20) : ['休', '体', '保', '信', '作', '使', '個', '倍'];
 }, [activePart, project.glyphs]);

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

 // Global Keyboard Shortcuts within Studio Modal
 useEffect(() => {
 if (!isOpen) return;

 const handleKeyDown = (e: KeyboardEvent) => {
 // Don't intercept if user is typing in an input or textarea
 const target = e.target as HTMLElement;
 if (
 target &&
 (target.tagName === 'INPUT' ||
 target.tagName === 'TEXTAREA' ||
 target.isContentEditable)
 ) {
 return;
 }

 // Undo / Redo
 const isZ = e.code === 'KeyZ' || e.key === 'z' || e.key === 'Z';
 const isY = e.code === 'KeyY' || e.key === 'y' || e.key === 'Y';
 if ((e.ctrlKey || e.metaKey) && isZ) {
 e.preventDefault();
 if (e.shiftKey) {
 handleRedo();
 } else if (activePenContour && activePenContour.nodes.length > 0) {
 handleUndoPartPenNode();
 } else {
 handleUndo();
 }
 return;
 }
 if ((e.ctrlKey || e.metaKey) && isY) {
 e.preventDefault();
 handleRedo();
 return;
 }

 // Select all / Move all: Ctrl+A / Cmd+A
 if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyA' || e.key === 'a' || e.key === 'A')) {
 e.preventDefault();
 setIsMoveAllPart(true);
 setSelectedContourId(null);
 setSelectedNodeId(null);
 notify('部首の全ストロークを選択しました（全体移動可能）', 'info');
 return;
 }

 // Save shortcut
 if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyS' || e.key === 's' || e.key === 'S')) {
 e.preventDefault();
 handleExportLibraryJson();
 return;
 }

 // Spacebar navigation pan
 if (e.code === 'Space' && !e.repeat) {
 e.preventDefault();
 setIsSpacePressed(true);
 return;
 }

 // Arrow Keys nudge (1px or 10px with Shift)
 if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
 e.preventDefault();
 const step = e.shiftKey ? 10 : 1;
 let dx = 0;
 let dy = 0;
 if (e.key === 'ArrowLeft') dx = -step;
 if (e.key === 'ArrowRight') dx = step;
 if (e.key === 'ArrowUp') dy = -step;
 if (e.key === 'ArrowDown') dy = step;

 if (selectedNodeId && selectedContourId && activePart) {
 const updated = activePart.contours.map((c) => {
 if (c.id !== selectedContourId) return c;
 return {
 ...c,
 nodes: c.nodes.map((n) => {
 if (n.id !== selectedNodeId) return n;
 return {
 ...n,
 x: n.x + dx,
 y: n.y + dy,
 handleIn: n.handleIn ? { x: n.handleIn.x + dx, y: n.handleIn.y + dy } : null,
 handleOut: n.handleOut ? { x: n.handleOut.x + dx, y: n.handleOut.y + dy } : null,
 };
 }),
 };
 });
 commitPartChange(updated);
 return;
 } else if (selectedContourId && activePart) {
 const updated = activePart.contours.map((c) => {
 if (c.id !== selectedContourId) return c;
 return {
 ...c,
 nodes: c.nodes.map((n) => ({
 ...n,
 x: n.x + dx,
 y: n.y + dy,
 handleIn: n.handleIn ? { x: n.handleIn.x + dx, y: n.handleIn.y + dy } : null,
 handleOut: n.handleOut ? { x: n.handleOut.x + dx, y: n.handleOut.y + dy } : null,
 })),
 };
 });
 commitPartChange(updated);
 return;
 } else if (activePart && activePart.contours.length > 0) {
 const updated = activePart.contours.map((c) => ({
 ...c,
 nodes: c.nodes.map((n) => ({
 ...n,
 x: n.x + dx,
 y: n.y + dy,
 handleIn: n.handleIn ? { x: n.handleIn.x + dx, y: n.handleIn.y + dy } : null,
 handleOut: n.handleOut ? { x: n.handleOut.x + dx, y: n.handleOut.y + dy } : null,
 })),
 }));
 commitPartChange(updated);
 return;
 }
 }

 // Tool Switching Shortcuts
 if (!e.ctrlKey && !e.metaKey && !e.altKey) {
 if (e.code === 'KeyV' || e.key === 'v' || e.key === 'V') {
 e.preventDefault();
 setToolMode('select');
 } else if (e.code === 'KeyP' || e.key === 'p' || e.key === 'P') {
 e.preventDefault();
 setToolMode('pen');
 } else if (e.code === 'KeyB' || e.key === 'b' || e.key === 'B') {
 e.preventDefault();
 setToolMode('brush');
 } else if (e.code === 'KeyE' || e.key === 'e' || e.key === 'E') {
 e.preventDefault();
 setToolMode('eraser');
 } else if (e.code === 'KeyH' || e.key === 'h' || e.key === 'H') {
 e.preventDefault();
 setToolMode('hand');
 } else if (e.key === 'Delete' || e.key === 'Backspace') {
 e.preventDefault();
 if (activePenContour) {
 handleUndoPartPenNode();
 } else if (selectedNodeId) {
 handleDeleteSelectedNode();
 } else if (selectedContourId) {
 handleDeleteSelectedContour();
 }
 } else if (e.key === 'Enter') {
 e.preventDefault();
 if (activePenContour && activePenContour.nodes.length >= 2) {
 handleFinishPartPenContour(true);
 }
 } else if (e.key === 'Escape') {
 e.preventDefault();
 if (activePenContour) {
 handleResetPartPenContour();
 } else {
 setSelectedNodeId(null);
 setSelectedContourId(null);
 setIsMoveAllPart(false);
 }
 }
 }
 };

 const handleKeyUp = (e: KeyboardEvent) => {
 if (e.code === 'Space') {
 setIsSpacePressed(false);
 }
 };

 window.addEventListener('keydown', handleKeyDown);
 window.addEventListener('keyup', handleKeyUp);
 return () => {
 window.removeEventListener('keydown', handleKeyDown);
 window.removeEventListener('keyup', handleKeyUp);
 };
 }, [
 isOpen,
 activePenContour,
 selectedNodeId,
 selectedContourId,
 undoStack,
 redoStack,
 activePart,
 ]);

 
 const handleUndo = () => {
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
 };

 const handleRedo = () => {
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
 };

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

 // Node & Path Direct Editing Helpers
 const getSelectedNodeType = (): 'smooth' | 'corner' | null => {
 if (!activePart || !selectedContourId || !selectedNodeId) return null;
 const c = activePart.contours.find((item) => item.id === selectedContourId);
 const n = c?.nodes.find((item) => item.id === selectedNodeId);
 return n ? (n.type === 'smooth' || n.type === 'symmetric' ? 'smooth' : 'corner') : 'corner';
 };

 const getContourNodeCount = (): number => {
 if (!activePart || !selectedContourId) return 0;
 const c = activePart.contours.find((item) => item.id === selectedContourId);
 return c?.nodes.length || 0;
 };

 const handleDeleteSelectedNode = () => {
 if (!activePart || !selectedNodeId || !selectedContourId) return;
 const updatedContours: PathContour[] = [];
 for (const contour of activePart.contours) {
 if (contour.id !== selectedContourId) {
 updatedContours.push(contour);
 continue;
 }
 const remainingNodes = contour.nodes.filter((n) => n.id !== selectedNodeId);
 const minNodes = contour.closed ? 3 : 2;
 if (remainingNodes.length >= minNodes) {
 updatedContours.push({
 ...contour,
 nodes: remainingNodes,
 });
 }
 }
 commitPartChange(updatedContours);
 setSelectedNodeId(null);
 notify('ノードを削除しました', 'info');
 };

 const handleToggleSelectedNodeType = () => {
 if (!activePart || !selectedNodeId || !selectedContourId) return;
 const updatedContours = activePart.contours.map((contour) => {
 if (contour.id !== selectedContourId) return contour;
 return {
 ...contour,
 nodes: contour.nodes.map((node) => {
 if (node.id !== selectedNodeId) return node;
 if (node.type === 'smooth') {
 return {
 ...node,
 type: 'corner' as const,
 handleIn: null,
 handleOut: null,
 };
 } else {
 const handleLength = 40;
 return {
 ...node,
 type: 'smooth' as const,
 handleIn: { x: node.x - handleLength, y: node.y },
 handleOut: { x: node.x + handleLength, y: node.y },
 };
 }
 }),
 };
 });
 commitPartChange(updatedContours);
 notify('ノードの種類を切り替えました', 'info');
 };

 const handleDeleteSelectedContour = () => {
 if (!activePart || !selectedContourId) return;
 const updated = activePart.contours.filter((c) => c.id !== selectedContourId);
 if (updated.length === 0 && activeBrushPathRef.current) {
 activeBrushPathRef.current.setAttribute('d', '');
 }
 commitPartChange(updated);
 setSelectedContourId(null);
 setSelectedNodeId(null);
 notify('輪郭パスを削除しました', 'info');
 };

 const handleDuplicateSelectedContour = () => {
 if (!activePart || !selectedContourId) return;
 const target = activePart.contours.find((c) => c.id === selectedContourId);
 if (!target) return;
 const offset = 24;
 const newId = generateId();
 const cloned: PathContour = {
 id: newId,
 closed: target.closed,
 nodes: target.nodes.map((n) => ({
 id: generateId(),
 x: n.x + offset,
 y: n.y + offset,
 type: n.type,
 handleIn: n.handleIn ? { x: n.handleIn.x + offset, y: n.handleIn.y + offset } : null,
 handleOut: n.handleOut ? { x: n.handleOut.x + offset, y: n.handleOut.y + offset } : null,
 })),
 };
 commitPartChange([...activePart.contours, cloned]);
 setSelectedContourId(newId);
 setSelectedNodeId(null);
 notify('輪郭パスを複製しました', 'success');
 };

 const handleFlipSelectedContour = (dir: 'h' | 'v') => {
 if (!activePart || !selectedContourId) return;
 const target = activePart.contours.find((c) => c.id === selectedContourId);
 if (!target) return;
 const flipped = dir === 'h' ? flipMultipleContoursH([target]) : flipMultipleContoursV([target]);
 const updated = activePart.contours.map((c) => (c.id === selectedContourId ? { ...flipped[0], id: c.id } : c));
 commitPartChange(updated);
 notify(`輪郭パスを${dir === 'h' ? '左右' : '上下'}反転しました`, 'info');
 };

 const handleSmoothSelectedContour = () => {
 if (!activePart || !selectedContourId) return;
 const target = activePart.contours.find((c) => c.id === selectedContourId);
 if (!target) return;
 const smoothedResult = smoothStrokeContour(target, { level: 'standard', preserveCorners: true });
 const updated = activePart.contours.map((c) => (c.id === selectedContourId ? smoothedResult.contour : c));
 commitPartChange(updated);
 notify('パスを平滑化（滑らか化）しました', 'success');
 };

 // Extract from Project Glyph
 const handleExtractFromGlyph = (glyph: GlyphData) => {
 if (!glyph.contours || glyph.contours.length === 0) {
 notify(`「${glyph.char}」には描画データがありません`, 'warning');
 return;
 }
 const newId = generateId();
 const clonedContours: PathContour[] = glyph.contours.map((c) => ({
 ...c,
 id: generateId(),
 nodes: c.nodes.map((n) => ({
 ...n,
 id: generateId(),
 handleIn: n.handleIn ? { ...n.handleIn } : null,
 handleOut: n.handleOut ? { ...n.handleOut } : null,
 })),
 }));

 const newPart: CustomPart = {
 id: newId,
 name: `パーツ_${glyph.char || glyph.name}`,
 category: 'other',
 description: `文字「${glyph.char}」から取り込んだ作字パーツ`,
 contours: clonedContours,
 createdAt: Date.now(),
 updatedAt: Date.now(),
 };

 setParts((prev) => [newPart, ...prev]);
 setSelectedPartId(newId);
 setShowExtractModal(false);
 notify(`文字「${glyph.char}」からパーツを作成しました`, 'success');
 };

 // Insert to current editing glyph
 const handleInsertToGlyph = (closeAfter: boolean = false) => {
 if (!activePart || !activePart.contours || activePart.contours.length === 0) {
 notify('パーツに輪郭データがありません', 'warning');
 return;
 }
 const cloned: PathContour[] = activePart.contours.map((c) => ({
 ...c,
 id: generateId(),
 nodes: c.nodes.map((n) => ({
 ...n,
 id: generateId(),
 handleIn: n.handleIn ? { ...n.handleIn } : null,
 handleOut: n.handleOut ? { ...n.handleOut } : null,
 })),
 }));

 const positioned = transformContoursForPlacement(cloned, insertPlacement, activePart.category);
 if (targetChar && targetChar !== selectedChar && onBatchInsertToGlyphs) {
 onBatchInsertToGlyphs(positioned, [targetChar]);
 } else {
 onInsertToCurrentGlyph(positioned);
 }
 notify(`「${activePart.name}」を「${targetChar || selectedChar}」に挿入しました`, 'success');
 if (closeAfter) {
 onClose();
 }
 };

 // Batch insert active part to multiple glyphs at once
 const handleBatchInsertToGlyphs = (closeAfter: boolean = false) => {
 if (!activePart || !activePart.contours || activePart.contours.length === 0) {
 notify('パーツに輪郭データがありません', 'warning');
 return;
 }

 const typedChars = Array.from(new Set(batchCharsInput.split('').filter((c) => c.trim())));
 const allTargetChars = Array.from(new Set([...selectedBatchChars, ...typedChars]));

 if (allTargetChars.length === 0) {
 notify('一括挿入の対象となる漢字を候補から選択するか、入力してください', 'warning');
 return;
 }

 const cloned: PathContour[] = activePart.contours.map((c) => ({
 ...c,
 id: generateId(),
 nodes: c.nodes.map((n) => ({
 ...n,
 id: generateId(),
 handleIn: n.handleIn ? { ...n.handleIn } : null,
 handleOut: n.handleOut ? { ...n.handleOut } : null,
 })),
 }));

 const positioned = transformContoursForPlacement(cloned, insertPlacement, activePart.category);

 if (onBatchInsertToGlyphs) {
 onBatchInsertToGlyphs(positioned, allTargetChars);
 } else {
 allTargetChars.forEach(() => {
 onInsertToCurrentGlyph(positioned);
 });
 }

 notify(`「${activePart.name}」を ${allTargetChars.length} 文字 (${allTargetChars.slice(0, 6).join('')}${allTargetChars.length > 6 ? '…' : ''}) に一括挿入しました`, 'success');
 if (closeAfter) {
 onClose();
 }
 };

 // Batch insert a radical directly from database to all kanji in its list
 const handleBatchInsertRadicalEntry = async (radical: RadicalEntry) => {
 if (!radical.kanjiList || radical.kanjiList.length === 0) {
 notify('対象の漢字リストがありません', 'warning');
 return;
 }

 let contoursToUse: PathContour[] = [];
 const placement = (radical.category === 'basic' ? 'auto' : radical.category) as RadicalPlacement;

 // 1. If currently active part in studio matches or is loaded with contours
 if (activePart && activePart.contours && activePart.contours.length > 0) {
 contoursToUse = JSON.parse(JSON.stringify(activePart.contours));
 } else {
 // 2. Otherwise load extracted or fallback contours for this radical
 try {
 const extracted = await getOrExtractRadicalContours(
 radical.char,
 'full',
 selectedFontStyle.fontFamily,
 selectedFontStyle.fontWeight
 );
 if (extracted && extracted.length > 0) {
 contoursToUse = JSON.parse(JSON.stringify(extracted));
 }
 } catch {
 // Fallback below
 }

 if (contoursToUse.length === 0) {
 const fallbackRad = KANJI_RADICALS.find((r) => r.name === radical.name || r.char === radical.char);
 if (fallbackRad && fallbackRad.contours && fallbackRad.contours.length > 0) {
 contoursToUse = JSON.parse(JSON.stringify(fallbackRad.contours));
 }
 }
 }

 if (contoursToUse.length === 0) {
 notify(`部首「${radical.name}」の輪郭データが見つかりません。まずキャンバスで作字するか部首を読み込んでください`, 'warning');
 return;
 }

 const cloned: PathContour[] = contoursToUse.map((c) => ({
 ...c,
 id: generateId(),
 nodes: c.nodes.map((n) => ({
 ...n,
 id: generateId(),
 handleIn: n.handleIn ? { ...n.handleIn } : null,
 handleOut: n.handleOut ? { ...n.handleOut } : null,
 })),
 }));

 const positioned = transformContoursForPlacement(
 cloned,
 placement,
 radical.category === 'basic' ? 'other' : (radical.category as PartCategory)
 );

 if (onBatchInsertToGlyphs) {
 onBatchInsertToGlyphs(positioned, radical.kanjiList);
 } else {
 radical.kanjiList.forEach(() => {
 onInsertToCurrentGlyph(positioned);
 });
 }

 notify(
 `部首「${radical.name}」を収録漢字 ${radical.kanjiList.length} 文字（${radical.kanjiList.slice(0, 6).join('')}${
 radical.kanjiList.length > 6 ? '…' : ''
 }）に一括配置しました（既存文字は輪郭を追加合成）`,
 'success'
 );
 };

 // Extract directly from currently edited character in canvas
 const handleExtractFromCurrentGlyph = () => {
 const currentGlyph = project.glyphs?.[selectedUnicode];
 if (!currentGlyph || !currentGlyph.contours || currentGlyph.contours.length === 0) {
 notify(`編集中文字「${selectedChar}」には描画された輪郭がありません`, 'warning');
 return;
 }
 const newId = generateId();
 const clonedContours: PathContour[] = currentGlyph.contours.map((c) => ({
 ...c,
 id: generateId(),
 nodes: c.nodes.map((n) => ({
 ...n,
 id: generateId(),
 handleIn: n.handleIn ? { ...n.handleIn } : null,
 handleOut: n.handleOut ? { ...n.handleOut } : null,
 })),
 }));

 const newPart: CustomPart = {
 id: newId,
 name: `パーツ_${selectedChar || currentGlyph.name || '文字'}`,
 category: 'other',
 description: `文字「${selectedChar}」から取り込んだ作字パーツ`,
 contours: clonedContours,
 createdAt: Date.now(),
 updatedAt: Date.now(),
 };

 setParts((prev) => [newPart, ...prev]);
 setSelectedPartId(newId);
 setLeftSidebarTab('custom');
 notify(`編集中文字「${selectedChar}」の輪郭（${clonedContours.length}本）をパーツとして取り込みました`, 'success');
 };

 // Load a preset radical into canvas for editing / fine-tuning with high-fidelity font vector extraction
 const handleLoadPreset = async (preset: StudioRadicalPresetItem) => {
 setIsLoadingPreset(true);
 try {
 // Extract pristine high-resolution vector contours from the selected font style
 let contours = await getOrExtractRadicalContours(
 preset.char,
 'full',
 selectedFontStyle.fontFamily,
 selectedFontStyle.fontWeight
 );
 if (!contours || contours.length === 0) {
 const fallbackRad = KANJI_RADICALS.find((r) => r.name === preset.name || r.char === preset.char);
 contours = fallbackRad?.contours || [];
 }

 const styleLabel = selectedFontStyle.label;
 const partName = `${preset.name} (${styleLabel})`;

 // Check if this part already exists with this exact name or base name
 let targetPart = parts.find((p) => p.name === partName || p.name === preset.name);
 if (targetPart) {
 // Update its contours with the newly extracted high-quality contours
 const updatedParts = parts.map((p) =>
 p.id === targetPart!.id
 ? { ...p, contours: JSON.parse(JSON.stringify(contours)), description: `${preset.name}・${selectedFontStyle.subLabel}の高品質ベクター部首`, updatedAt: Date.now() }
 : p
 );
 setParts(updatedParts);
 } else {
 const newPart: CustomPart = {
 id: generateId(),
 name: partName,
 category: preset.category,
 description: `${preset.name}・${selectedFontStyle.subLabel}の高品質ベクター部首`,
 contours: JSON.parse(JSON.stringify(contours)),
 createdAt: Date.now(),
 updatedAt: Date.now(),
 };
 setParts((prev) => [newPart, ...prev]);
 targetPart = newPart;
 }
 setSelectedPartId(targetPart.id);
 notify(`部首「${preset.name}」を${selectedFontStyle.label}の高精度ベクターとしてキャンバスに読み込みました`, 'success');
 } catch (err) {
 console.error('Failed to extract preset contours:', err);
 notify('部首ベクターの抽出に失敗しました', 'error');
 } finally {
 setIsLoadingPreset(false);
 }
 };

 // Direct 1-click insertion from Preset into current editing character
 const handleInsertPresetDirectly = async (
 preset: StudioRadicalPresetItem,
 placement: RadicalPlacement = 'original',
 closeAfter: boolean = false
 ) => {
 if (insertingPresetId) return;
 setInsertingPresetId(preset.id);
 try {
 let contours = await getOrExtractRadicalContours(
 preset.char,
 'full',
 selectedFontStyle.fontFamily,
 selectedFontStyle.fontWeight
 );
 if (!contours || contours.length === 0) {
 const fallbackRad = KANJI_RADICALS.find((r) => r.name === preset.name || r.char === preset.char);
 contours = fallbackRad?.contours || [];
 }

 const positioned = transformContoursForPlacement(contours, placement, preset.category);
 if (targetChar && targetChar !== selectedChar && onBatchInsertToGlyphs) {
 onBatchInsertToGlyphs(positioned, [targetChar]);
 } else {
 onInsertToCurrentGlyph(positioned);
 }
 notify(`部首「${preset.name} (${selectedFontStyle.label})」を文字「${targetChar || selectedChar}」に挿入しました`, 'success');
 if (closeAfter) {
 onClose();
 }
 } catch {
 notify('部首の挿入に失敗しました', 'error');
 } finally {
 setInsertingPresetId(null);
 }
 };

 // Quick insertion with specified placement from current active part
 const handleQuickInsertPlacement = (placement: RadicalPlacement, closeAfter: boolean = false) => {
 if (!activePart || !activePart.contours || activePart.contours.length === 0) {
 notify('挿入する輪郭データがありません', 'warning');
 return;
 }
 const cloned: PathContour[] = JSON.parse(JSON.stringify(activePart.contours));
 const positioned = transformContoursForPlacement(cloned, placement, activePart.category);
 if (targetChar && targetChar !== selectedChar && onBatchInsertToGlyphs) {
 onBatchInsertToGlyphs(positioned, [targetChar]);
 } else {
 onInsertToCurrentGlyph(positioned);
 }
 const placementNames: Record<RadicalPlacement, string> = {
 auto: '自動判別',
 original: '原寸のまま',
 hen: '偏 (左46%)',
 tsukuri: '旁 (右46%)',
 kanmuri: '冠 (上36%)',
 ashi: '脚 (下36%)',
 center_small: '中央縮小 (60%)',
 };
 notify(`「${activePart.name}」を【${placementNames[placement] || placement}】として「${targetChar || selectedChar}」に挿入しました`, 'success');
 if (closeAfter) {
 onClose();
 }
 };

 // Upgrade / refresh default initial parts with authentic typography contours
 const handleUpgradeDefaultParts = async (
 fontStyle: FontStyleOption = selectedFontStyle,
 silent: boolean = false
 ) => {
 if (!silent) {
 notify(`初期部首パーツを「${fontStyle.label}」の高精度ベクターに更新しています...`, 'info');
 }
 try {
 const updatedParts = [...parts];
 let updatedCount = 0;

 for (const def of INITIAL_STUDIO_RADICAL_DEFS) {
 const contours = await getOrExtractRadicalContours(
 def.char,
 'full',
 fontStyle.fontFamily,
 fontStyle.fontWeight
 );
 if (contours && contours.length > 0) {
 const idx = updatedParts.findIndex(
 (p) => p.name === def.name || p.name.startsWith(def.name.split(' ')[0])
 );
 if (idx >= 0) {
 updatedParts[idx] = {
 ...updatedParts[idx],
 contours: JSON.parse(JSON.stringify(contours)),
 description: `${def.description} (${fontStyle.label}・高精度ベクター)`,
 updatedAt: Date.now(),
 };
 updatedCount++;
 } else {
 updatedParts.push({
 id: generateId(),
 name: def.name,
 category: def.category as PartCategory,
 description: `${def.description} (${fontStyle.label}・高精度ベクター)`,
 contours: JSON.parse(JSON.stringify(contours)),
 createdAt: Date.now(),
 updatedAt: Date.now(),
 });
 updatedCount++;
 }
 }
 }

 setParts(updatedParts);
 if (!silent) {
 notify(`${updatedCount}件の部首パーツを高精度フォント（${fontStyle.label}）ベクターに刷新しました！`, 'success');
 }
 } catch (err) {
 console.error(err);
 if (!silent) {
 notify('部首パーツの更新に失敗しました', 'error');
 }
 }
 };

 // Import all standard kanji radicals into parts library with pristine font vectors
 const handleImportDefaultRadicals = async () => {
 setIsImportingAll(true);
 notify(`高品質な定番部首（${selectedFontStyle.label}）を順次取り込んでいます...`, 'info');
 try {
 const existingNames = new Set(parts.map((p) => p.name));
 const toAdd: CustomPart[] = [];

 for (const item of STUDIO_RADICAL_PRESETS) {
 const partName = `${item.name} (${selectedFontStyle.label})`;
 if (!existingNames.has(item.name) && !existingNames.has(partName)) {
 let contours: PathContour[] = [];
 try {
 contours = await getOrExtractRadicalContours(
 item.char,
 'full',
 selectedFontStyle.fontFamily,
 selectedFontStyle.fontWeight
 );
 } catch {
 // fallback
 }
 if (contours && contours.length > 0) {
 toAdd.push({
 id: generateId(),
 name: partName,
 category: item.category,
 description: `${item.name} (${item.char}) - ${selectedFontStyle.subLabel}`,
 contours,
 createdAt: Date.now(),
 updatedAt: Date.now(),
 });
 }
 }
 }

 if (toAdd.length === 0) {
 notify('すべての定番部首はすでにマイパーツに登録されています', 'info');
 return;
 }

 setParts((prev) => [...toAdd, ...prev]);
 notify(`${toAdd.length}件の高品質定番部首（${selectedFontStyle.label}）をマイパーツに取り込みました！`, 'success');
 } catch (e) {
 notify('部首の一括取り込み中にエラーが発生しました', 'error');
 } finally {
 setIsImportingAll(false);
 }
 };

 const hasUpgradedDefaultsRef = useRef(false);

 // Auto-upgrade legacy low-quality default parts on open (at most once per session)
 useEffect(() => {
 if (!isOpen || hasUpgradedDefaultsRef.current) return;
 hasUpgradedDefaultsRef.current = true;

 const hasLowQualityDefaults = parts.some((p) => {
 const isInitialPart = INITIAL_STUDIO_RADICAL_DEFS.some(
 (d) => p.name === d.name || p.name.startsWith(d.name.split(' ')[0])
 );
 if (!isInitialPart || !p.contours || p.contours.length === 0) return false;
 const totalNodes = p.contours.reduce((acc, c) => acc + (c.nodes?.length || 0), 0);
 const hasSmooth = p.contours.some((c) =>
 c.nodes?.some((n) => n.type === 'smooth' && (n.handleIn || n.handleOut))
 );
 // Legacy hand-coded contours had very few nodes and no smooth bezier handles
 return totalNodes < 30 || !hasSmooth;
 });

 if (hasLowQualityDefaults) {
 handleUpgradeDefaultParts(selectedFontStyle, true);
 }
 }, [isOpen]);

 // Export parts library as JSON
 const handleExportLibraryJson = () => {
 const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(parts, null, 2));
 const a = document.createElement('a');
 a.href = dataStr;
 a.download = `font_radical_parts_${new Date().toISOString().slice(0, 10)}.json`;
 document.body.appendChild(a);
 a.click();
 a.remove();
 notify('部首パーツライブラリをJSON形式で保存しました', 'success');
 };

 // Import parts library from JSON
 const handleImportLibraryJson = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file) return;
 const reader = new FileReader();
 reader.onload = (event) => {
 try {
 const json = JSON.parse(event.target?.result as string);
 if (Array.isArray(json)) {
 setParts((prev) => [...json, ...prev]);
 notify(`${json.length}件のパーツをライブラリに読み込みました`, 'success');
 } else {
 notify('無効なパーツJSONファイルです', 'error');
 }
 } catch {
 notify('JSONファイルの解析に失敗しました', 'error');
 }
 };
 reader.readAsText(file);
 e.target.value = '';
 };

 // Export current part as SVG
 const handleExportPartSvg = () => {
 if (!activePart) return;
 const svgPath = contoursToSvgPath(activePart.contours);
 const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000">\n <path d="${svgPath}" fill="#000000" fill-rule="evenodd" />\n</svg>`;
 const blob = new Blob([svgContent], { type: 'image/svg+xml' });
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 a.download = `${activePart.name.replace(/[^a-zA-Z0-9_\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff-]/g, '_')}.svg`;
 document.body.appendChild(a);
 a.click();
 a.remove();
 URL.revokeObjectURL(url);
 notify(`「${activePart.name}」をSVG出力しました`, 'success');
 };

 // Import SVG into current part
 const handleImportSvgFile = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file || !activePart) return;
 const reader = new FileReader();
 reader.onload = (event) => {
 try {
 const text = event.target?.result as string;
 const res = parseSvgStringToContours(text, true);
 if (res.contours.length === 0) {
 notify('SVGファイル内に有効なベクターパスが見つかりませんでした', 'warning');
 return;
 }
 commitPartChange(res.contours);
 notify(`SVGから ${res.contours.length} 本の輪郭を読み込みました`, 'success');
 } catch {
 notify('SVGファイルの読み込みに失敗しました', 'error');
 }
 };
 reader.readAsText(file);
 e.target.value = '';
 };

 const handleSlantPart = (angleDeg: number) => {
 if (!activePart) return;
 if (selectedContourId) {
 const updated = activePart.contours.map((c) =>
 c.id === selectedContourId ? slantSingleContour(c, angleDeg) : c
 );
 commitPartChange(updated);
 } else {
 const updated = slantContours(activePart.contours, angleDeg);
 commitPartChange(updated);
 }
 };

 const handleRotatePart = (angleDeg: number) => {
 if (!activePart) return;
 if (selectedContourId) {
 const updated = activePart.contours.map((c) =>
 c.id === selectedContourId ? rotateSingleContour(c, angleDeg) : c
 );
 commitPartChange(updated);
 } else {
 const updated = activePart.contours.map((c) => rotateSingleContour(c, angleDeg, 500, 500));
 commitPartChange(updated);
 }
 };

 const handleFlipHPart = () => {
 if (!activePart) return;
 if (selectedContourId) {
 const updated = activePart.contours.map((c) =>
 c.id === selectedContourId ? flipSingleContourH(c) : c
 );
 commitPartChange(updated);
 } else {
 const updated = flipContoursHorizontal(activePart.contours);
 commitPartChange(updated);
 }
 };

 const handleFlipVPart = () => {
 if (!activePart) return;
 if (selectedContourId) {
 const updated = activePart.contours.map((c) =>
 c.id === selectedContourId ? flipSingleContourV(c) : c
 );
 commitPartChange(updated);
 } else {
 const updated = flipContoursVertical(activePart.contours);
 commitPartChange(updated);
 }
 };

 const handleScalePart = (factor: number) => {
 if (!activePart) return;
 if (selectedContourId) {
 const updated = activePart.contours.map((c) =>
 c.id === selectedContourId ? scaleSingleContour(c, factor, factor) : c
 );
 commitPartChange(updated);
 } else {
 const updated = scaleContours(activePart.contours, factor, factor);
 commitPartChange(updated);
 }
 };

 const handleFitToPlacement = (place: RadicalPlacement) => {
 if (!activePart) return;
 const positioned = transformContoursForPlacement(activePart.contours, place, activePart.category);
 commitPartChange(positioned);
 notify(`配置を「${place}」基準に自動フィットしました`, 'info');
 };

 const handleUnionPart = () => {
 if (!activePart || !activePart.contours || activePart.contours.length <= 0) {
 notify('合体する輪郭がありません', 'warning');
 return;
 }
 try {
 const merged = unionContours(activePart.contours);
 commitPartChange(merged);
 notify('重なり合うストロークを合体し、交差の白抜けを防止しました', 'success');
 } catch (e) {
 notify('合体処理に失敗しました', 'error');
 }
 };

 const handleNormalizeWinding = () => {
 if (!activePart || !activePart.contours || activePart.contours.length === 0) return;
 try {
 const normalized = normalizeGlyphContoursWinding(activePart.contours);
 commitPartChange(normalized);
 notify('輪郭の向き（Winding）をTrueType規格に統一しました', 'success');
 } catch (e) {
 notify('輪郭処理に失敗しました', 'error');
 }
 };

 const handleSimplifyPart = () => {
 if (!activePart || !activePart.contours || activePart.contours.length === 0) return;
 try {
 const result = simplifyGlyphContours(activePart.contours, { tolerance: 2.0 });
 commitPartChange(result.contours);
 notify(`パスの単純化を実行しました（${result.reducedCount}頂点削減）`, 'success');
 } catch (e) {
 notify('パスの単純化に失敗しました', 'error');
 }
 };

 const handleCenterPartInCanvas = () => {
 if (!activePart || !activePart.contours || activePart.contours.length === 0) return;
 const bbox = getContoursBoundingBox(activePart.contours);
 if (bbox.width <= 0 || bbox.height <= 0) return;
 const currentCenterX = bbox.centerX;
 const currentCenterY = bbox.centerY;
 const dx = 500 - currentCenterX;
 const dy = 500 - currentCenterY;
 const centered = activePart.contours.map((c) => ({
 ...c,
 nodes: c.nodes.map((n) => ({
 ...n,
 x: n.x + dx,
 y: n.y + dy,
 handleIn: n.handleIn ? { x: n.handleIn.x + dx, y: n.handleIn.y + dy } : null,
 handleOut: n.handleOut ? { x: n.handleOut.x + dx, y: n.handleOut.y + dy } : null,
 })),
 }));
 commitPartChange(centered);
 notify('パーツをキャンバス中央に配置しました', 'info');
 };

 const handleClearCanvas = () => {
 if (!activePart) return;
 if (activeBrushPathRef.current) {
 activeBrushPathRef.current.setAttribute('d', '');
 }
 
 setActivePenContour(null);
 setSelectedContourId(null);
 setSelectedNodeId(null);
 
 
 commitPartChange([]);
 notify('輪郭を全消去しました', 'info');
 };

 const handleNudgePart = (dx: number, dy: number) => {
 if (!activePart || !activePart.contours || activePart.contours.length === 0) return;
 const nudged = activePart.contours.map((c) => ({
 ...c,
 nodes: c.nodes.map((n) => ({
 ...n,
 x: n.x + dx,
 y: n.y + dy,
 handleIn: n.handleIn ? { x: n.handleIn.x + dx, y: n.handleIn.y + dy } : null,
 handleOut: n.handleOut ? { x: n.handleOut.x + dx, y: n.handleOut.y + dy } : null,
 })),
 }));
 commitPartChange(nudged);
 };


 

 // Filter parts list
 const filteredParts = parts.filter((part) => {
 const matchesCat = activeCategory === 'all' || part.category === activeCategory;
 const matchesSearch =
 searchQuery.trim() === '' ||
 part.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
 (part.description && part.description.toLowerCase().includes(searchQuery.toLowerCase()));
 return matchesCat && matchesSearch;
 });

 // Filter presets list using high-fidelity STUDIO_RADICAL_PRESETS
 const filteredPresets = STUDIO_RADICAL_PRESETS.filter((radical) => {
 const matchesCat = activeCategory === 'all' || radical.category === activeCategory;
 const matchesSearch =
 searchQuery.trim() === '' ||
 radical.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
 (radical.char && radical.char.includes(searchQuery.trim())) ||
 (radical.description && radical.description.toLowerCase().includes(searchQuery.toLowerCase()));
 return matchesCat && matchesSearch;
 });

 // Available glyphs from project for extraction
 const modifiedGlyphs = (Object.values(project?.glyphs || {}) as GlyphData[]).filter(
 (g) => g && g.contours && g.contours.length > 0
 );

 const filteredGlyphsForExtract = modifiedGlyphs.filter((g) => {
 if (!extractSearch) return true;
 return (
 (g.char && g.char.includes(extractSearch)) ||
 (g.name && g.name.toLowerCase().includes(extractSearch.toLowerCase()))
 );
 });

 // SVG Paths for render
 const mainRenderGroups = useMemo(() => {
   if (!activePart || !activePart.contours || activePart.contours.length === 0) return [];
   return groupContoursForRendering(activePart.contours);
 }, [activePart?.contours]);
 const mainSvgPath = activePart && activePart.contours && activePart.contours.length > 0
 ? contoursToSvgPath(normalizeGlyphContoursWinding(activePart.contours))
 : '';

 if (!isOpen) return null;

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 select-none animate-fadeIn">
 {/* Hidden file inputs */}
 <input
 type="file"
 ref={svgFileInputRef}
 onChange={handleImportSvgFile}
 accept=".svg"
 className="hidden"
 />
 <input
 type="file"
 ref={jsonFileInputRef}
 onChange={handleImportLibraryJson}
 accept=".json"
 className="hidden"
 />

 <div
 className={`w-full h-full flex flex-col overflow-hidden transition-all ${
 isFullscreen
 ? isLight
 ? 'fixed inset-0 z-50 w-screen h-screen bg-[#f4f8f5] text-stone-800'
 : 'fixed inset-0 z-50 w-screen h-screen bg-[#121b15] text-emerald-100'
 : isLight
 ? 'w-full sm:w-[98vw] h-[100vh] sm:h-[94vh] max-w-[1720px] rounded-none sm:rounded-xl border border-stone-200/60 shadow-xl bg-[#f4f8f5] text-stone-800'
 : 'w-full sm:w-[98vw] h-[100vh] sm:h-[94vh] max-w-[1720px] rounded-none sm:rounded-xl border border-stone-800/60 shadow-xl bg-[#121b15] text-emerald-100'
 }`}
 >
 {/* ================= MODAL TOP HEADER ================= */}
 <div
 className={`px-3 sm:px-4 py-2 border-b flex items-center justify-between shrink-0 gap-2 ${
 isLight ? 'bg-white border-stone-200/60' : 'bg-[#18241c] border-stone-800/60'
 }`}
 >
 <div className="flex items-center space-x-2.5 min-w-0">
 <div
 className={`p-1.5 rounded-lg shrink-0 ${
 isLight ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-950/80 text-emerald-300'
 }`}
 >
 <Shapes className="w-5 h-5" />
 </div>
 <div className="min-w-0">
 <div className="flex items-center space-x-2">
 <h2 className="text-sm font-bold tracking-wide truncate">
 部首・作字パーツ工房
 </h2>
 <span className="text-xs text-stone-500 font-mono font-medium truncate shrink-0">
 パーツ数 {parts.length}
 </span>
 </div>
 <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate hidden md:block">
 偏旁・冠脚・筆画を設計し、漢字や文字へワンクリック合成
 </p>
 </div>
 </div>

 {/* Quick Workspace Switchers (Desktop/Tablet only) */}
 <div className="hidden md:flex items-center space-x-1.5 shrink-0">
 {/* Toggle Left Sidebar */}
          <button
            onClick={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              isLeftSidebarOpen
                ? isLight
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-2xs'
                  : 'bg-[#1e2d22] border-emerald-700 text-emerald-200 shadow-2xs'
                : isLight
                ? 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                : 'bg-[#18231c] border-[#25362b] text-stone-400 hover:bg-[#202e25]'
            }`}
            title={isLeftSidebarOpen ? 'ライブラリを収納してキャンバス作業領域を最大化' : '部首・パーツライブラリを展開'}
          >
            <Shapes className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">ライブラリ</span>
            <span className={`text-[10px] px-1 py-0.5 rounded font-mono font-bold leading-none ${
              isLeftSidebarOpen
                ? 'bg-emerald-200 dark:bg-emerald-900 text-emerald-950 dark:text-emerald-200'
                : 'bg-stone-200 dark:bg-stone-800 text-stone-500 dark:text-stone-400'
            }`}>
              {isLeftSidebarOpen ? '展開中' : '収納'}
            </span>
          </button>

          {/* Toggle Right Sidebar */}
          <button
            onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              isRightSidebarOpen
                ? isLight
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-2xs'
                  : 'bg-[#1e2d22] border-emerald-700 text-emerald-200 shadow-2xs'
                : isLight
                ? 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                : 'bg-[#18231c] border-[#25362b] text-stone-400 hover:bg-[#202e25]'
            }`}
            title={isRightSidebarOpen ? '変形・合成パネルを収納してキャンバス作業領域を最大化' : '変形・合成パネルを展開'}
          >
            <Sliders className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">詳細・変形</span>
            <span className={`text-[10px] px-1 py-0.5 rounded font-mono font-bold leading-none ${
              isRightSidebarOpen
                ? 'bg-emerald-200 dark:bg-emerald-900 text-emerald-950 dark:text-emerald-200'
                : 'bg-stone-200 dark:bg-stone-800 text-stone-500 dark:text-stone-400'
            }`}>
              {isRightSidebarOpen ? '展開中' : '収納'}
            </span>
          </button>
        </div>

        <div className="flex items-center space-x-1.5 shrink-0">
          {/* JSON Export/Import */}
 <button
 onClick={handleExportLibraryJson}
 className={`p-1.5 px-2 rounded-md border text-xs font-semibold hidden sm:flex items-center space-x-1 transition-all ${
 isLight
 ? 'bg-white border-[#d8e6df] text-stone-700 hover:bg-emerald-50 hover:text-emerald-900'
 : 'bg-[#1c2920] border-[#25362b] text-emerald-200 hover:bg-[#25362b]'
 }`}
 title="全パーツライブラリをJSONセーブデータとして書き出し"
 >
 <Download className="w-3.5 h-3.5" />
 <span className="hidden lg:inline">保存</span>
 </button>
 <button
 onClick={() => jsonFileInputRef.current?.click()}
 className={`p-1.5 px-2 rounded-md border text-xs font-semibold hidden sm:flex items-center space-x-1 transition-all ${
 isLight
 ? 'bg-white border-[#d8e6df] text-stone-700 hover:bg-emerald-50 hover:text-emerald-900'
 : 'bg-[#1c2920] border-[#25362b] text-emerald-200 hover:bg-[#25362b]'
 }`}
 title="JSONセーブデータからパーツライブラリを読み込み"
 >
 <Upload className="w-3.5 h-3.5" />
 <span className="hidden lg:inline">読込</span>
 </button>

 {/* Fullscreen Toggle Button */}
 <button
 onClick={() => setIsFullscreen(!isFullscreen)}
 className={`p-1.5 px-2 rounded-md border text-xs font-semibold flex items-center space-x-1 transition-all ${
 isFullscreen
 ? 'bg-emerald-600 text-white border-emerald-600'
 : isLight
 ? 'bg-white border-[#d8e6df] text-stone-700 hover:bg-emerald-50 hover:text-emerald-900'
 : 'bg-[#1c2920] border-[#25362b] text-emerald-200 hover:bg-[#25362b]'
 }`}
 title={isFullscreen ? '通常表示に戻す' : '工房を全画面で広々と使う'}
 >
 {isFullscreen ? (
 <>
 <Minimize2 className="w-3.5 h-3.5" />
 <span className="hidden md:inline">縮小</span>
 </>
 ) : (
 <>
 <Maximize2 className="w-3.5 h-3.5" />
 <span className="hidden md:inline">全画面</span>
 </>
 )}
 </button>

 {/* Close Button */}
 <button
 onClick={onClose}
 className={`p-1.5 rounded-md transition-colors ${
 isLight ? 'text-stone-600 hover:bg-emerald-100' : 'text-stone-400 hover:bg-[#223126]'
 }`}
 title="工房を閉じる"
 >
 <X className="w-5 h-5" />
 </button>
 </div>
 </div>

 {/* ================= 3-COLUMN WORKSPACE ================= */}
 <div className="flex-1 flex min-h-0 overflow-hidden">
 {/* ================= LEFT COLUMN: PARTS LIBRARY & PRESETS ================= */}
        <RadicalLeftSidebar
          isLeftSidebarOpen={isLeftSidebarOpen}
          setIsLeftSidebarOpen={setIsLeftSidebarOpen}
          leftSidebarTab={leftSidebarTab}
          setLeftSidebarTab={setLeftSidebarTab}
          isLight={isLight}
          parts={parts}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          selectedFontStyle={selectedFontStyle}
          setSelectedFontStyle={setSelectedFontStyle}
          onUpgradeDefaultParts={handleUpgradeDefaultParts}
          onImportDefaultRadicals={handleImportDefaultRadicals}
          onOpenBundledFontsModal={() => setIsLicenseModalOpen(true)}
          kanjiDbSearch={kanjiDbSearch}
          setKanjiDbSearch={setKanjiDbSearch}
          kanjiDbCategory={kanjiDbCategory}
          setKanjiDbCategory={setKanjiDbCategory}
          selectedRadicalDbId={selectedRadicalDbId}
          setSelectedRadicalDbId={setSelectedRadicalDbId}
          watermarkChar={watermarkChar}
          onSetWatermarkChar={setWatermarkChar}
          selectedChar={selectedChar}
          project={project}
          onBatchInsertRadicalEntry={handleBatchInsertRadicalEntry}
          onLoadPreset={handleLoadPreset}
          onInsertPresetDirectly={handleInsertPresetDirectly}
          insertPlacement={insertPlacement}
          activePart={activePart}
          selectedPartId={selectedPartId}
          setSelectedPartId={setSelectedPartId}
          onCreateNewPart={handleCreateNewPart}
          onExtractFromCurrentGlyph={handleExtractFromCurrentGlyph}
          onOpenExtractModal={() => setShowExtractModal(true)}
          onDuplicatePart={handleDuplicatePart}
          onDeletePart={handleDeletePart}
          contoursToSvgPath={contoursToSvgPath}
          setShowWatermark={setShowWatermark}
          notify={notify}
          isLoadingPreset={isLoadingPreset}
          isImportingAll={isImportingAll}
        />

 {/* ================= CENTER COLUMN: DEDICATED PART CANVAS ================= */}
 <div className="flex-1 flex flex-col min-w-0 min-h-0 relative overflow-hidden pb-14 md:pb-0">
        {/* Top Quick Action / Insertion Ribbon (作字・即時配置バー) */}
        <RadicalTopRibbon
          isLight={isLight}
          selectedChar={selectedChar}
          activePart={activePart}
          handleQuickInsertPlacement={handleQuickInsertPlacement}
          handleExtractFromCurrentGlyph={handleExtractFromCurrentGlyph}
        />

        {/* Canvas Toolbar */}
        <RadicalCanvasToolbar
          toolMode={toolMode}
          setToolMode={setToolMode}
          activeShapeType={activeShapeType}
          setActiveShapeType={setActiveShapeType}
          showShapeMenu={showShapeMenu}
          setShowShapeMenu={setShowShapeMenu}
          isLight={isLight}
          isAutoUnionMode={isAutoUnionMode}
          setIsAutoUnionMode={setIsAutoUnionMode}
          notify={notify}
          handleUnionPart={handleUnionPart}
          handleNormalizeWinding={handleNormalizeWinding}
          handleSimplifyPart={handleSimplifyPart}
          handleCenterPartInCanvas={handleCenterPartInCanvas}
          handleFlipHPart={handleFlipHPart}
          handleFlipVPart={handleFlipVPart}
          zoom={zoom}
          setZoom={setZoom}
          resetView={resetView}
          undoStack={undoStack}
          redoStack={redoStack}
          handleUndo={handleUndo}
          handleRedo={handleRedo}
          showKanjiGuides={showKanjiGuides}
          setShowKanjiGuides={setShowKanjiGuides}
          isWireframeMode={isWireframeMode}
          setIsWireframeMode={setIsWireframeMode}
          showNineBoxes={showNineBoxes}
          setShowNineBoxes={setShowNineBoxes}
          isSnapEnabled={isSnapEnabled}
          setIsSnapEnabled={setIsSnapEnabled}
          showWatermark={showWatermark}
          setShowWatermark={setShowWatermark}
          watermarkChar={watermarkChar}
          setWatermarkChar={setWatermarkChar}
          selectedChar={selectedChar}
          watermarkOpacity={watermarkOpacity}
          setWatermarkOpacity={setWatermarkOpacity}
          showWatermarkPicker={showWatermarkPicker}
          setShowWatermarkPicker={setShowWatermarkPicker}
          relatedKanjiList={relatedKanjiList}
          watermarkScale={watermarkScale}
          setWatermarkScale={setWatermarkScale}
          handleClearCanvas={handleClearCanvas}
          activePart={activePart}
        />

        {/* Contextual Tool Settings Bar (Brush / Shape / Pen / Node Options) */}
        <RadicalToolSettingsBar
          toolMode={toolMode}
          isLight={isLight}
          brushStyle={brushStyle}
          setBrushStyle={setBrushStyle}
          isAutoUnionMode={isAutoUnionMode}
          setIsAutoUnionMode={setIsAutoUnionMode}
          brushWidth={brushWidth}
          setBrushWidth={setBrushWidth}
          pressureSensitivity={pressureSensitivity}
          setPressureSensitivity={setPressureSensitivity}
          isStraightMode={isStraightMode}
          setIsStraightMode={setIsStraightMode}
          showPenShortcutsHelp={showPenShortcutsHelp}
          setShowPenShortcutsHelp={setShowPenShortcutsHelp}
          eraserMode={eraserMode}
          setEraserMode={setEraserMode}
          eraserRadius={eraserRadius}
          setEraserRadius={setEraserRadius}
          selectedNodeId={selectedNodeId}
          selectedContourId={selectedContourId}
          handleToggleSelectedNodeType={handleToggleSelectedNodeType}
          handleDeleteSelectedNode={handleDeleteSelectedNode}
          handleDuplicateSelectedContour={handleDuplicateSelectedContour}
          handleDeleteSelectedContour={handleDeleteSelectedContour}
          activePart={activePart}
          handleUnionPart={handleUnionPart}
          activePenContour={activePenContour}
          isPenNearFirstNode={isPenNearFirstNode}
        />

        {/* Main Interactive SVG Canvas */}
        <RadicalCanvasArea
          canvasContainerRef={canvasContainerRef}
          svgCanvasRef={svgCanvasRef}
          isLight={isLight}
          toolMode={toolMode}
          activePart={activePart}
          activePenContour={activePenContour}
          penHudPos={penHudPos}
          setPenHudPos={setPenHudPos}
          handlePartPenHudPointerDown={handlePartPenHudPointerDown}
          handlePartPenHudPointerMove={handlePartPenHudPointerMove}
          handlePartPenHudPointerUp={handlePartPenHudPointerUp}
          handleUndoPartPenNode={handleUndoPartPenNode}
          handleFinishPartPenContour={handleFinishPartPenContour}
          showPenStrokeMenu={showPenStrokeMenu}
          setShowPenStrokeMenu={setShowPenStrokeMenu}
          penStrokeWidth={penStrokeWidth}
          setPenStrokeWidth={setPenStrokeWidth}
          handleResetPartPenContour={handleResetPartPenContour}
          selectedNodeId={selectedNodeId}
          selectedContourId={selectedContourId}
          handleToggleSelectedNodeType={handleToggleSelectedNodeType}
          handleDeleteSelectedNode={handleDeleteSelectedNode}
          handleDuplicateSelectedContour={handleDuplicateSelectedContour}
          handleFlipSelectedContour={handleFlipSelectedContour}
          handleSmoothSelectedContour={handleSmoothSelectedContour}
          handleDeleteSelectedContour={handleDeleteSelectedContour}
          isMoveAllPart={isMoveAllPart}
          isSpacePressed={isSpacePressed}
          isPanning={isPanning}
          handlePointerDown={handlePointerDown}
          handlePointerMove={handlePointerMove}
          handlePointerUp={handlePointerUp}
          handlePointerCancel={handlePointerCancel}
          setEraserHoverPos={setEraserHoverPos}
          handleWheel={handleWheel}
          pan={pan}
          zoom={zoom}
          setZoom={setZoom}
          resetView={resetView}
          showGrid={showGrid}
          showMetrics={showMetrics}
          showKanjiGuides={showKanjiGuides}
          showNineBoxes={showNineBoxes}
          showWatermark={showWatermark}
          watermarkChar={watermarkChar}
          watermarkOpacity={watermarkOpacity}
          watermarkScale={watermarkScale}
          project={project}
          isSnapEnabled={isSnapEnabled}
          activeSnapLines={activeSnapLines}
          isWireframeMode={isWireframeMode}
          eraserRadius={eraserRadius}
          eraserHoverPos={eraserHoverPos}
          activeBrushPathRef={activeBrushPathRef}
          brushSvgPath={brushSvgPath}
          activeEraserPathRef={activeEraserPathRef}
          penSvgPath={penSvgPath}
          penMousePos={penMousePos}
          isPenNearFirstNode={isPenNearFirstNode}
          shapeStartPoint={shapeStartPoint}
          shapeCurrentPoint={shapeCurrentPoint}
          getShapeContours={getShapeContours}
          handleUndo={handleUndo}
          handleRedo={handleRedo}
          undoStack={undoStack}
          redoStack={redoStack}
        />
      </div>

 {/* ================= RIGHT COLUMN: PART INSPECTOR & COMPOSITION ================= */}
        <RadicalRightSidebar
          isRightSidebarOpen={isRightSidebarOpen}
          setIsRightSidebarOpen={setIsRightSidebarOpen}
          rightTab={rightTab}
          setRightTab={setRightTab}
          isLight={isLight}
          activePart={activePart}
          setParts={setParts}
          handleUnionPart={handleUnionPart}
          handleNormalizeWinding={handleNormalizeWinding}
          handleScalePart={handleScalePart}
          handleNudgePart={handleNudgePart}
          handleCenterPartInCanvas={handleCenterPartInCanvas}
          handleFlipHPart={handleFlipHPart}
          handleFlipVPart={handleFlipVPart}
          handleRotatePart={handleRotatePart}
          handleSlantPart={handleSlantPart}
          handleFitToPlacement={handleFitToPlacement}
          handleExportPartSvg={handleExportPartSvg}
          svgFileInputRef={svgFileInputRef}
          handleDuplicatePart={handleDuplicatePart}
          handleDeletePart={handleDeletePart}
          insertMode={insertMode}
          setInsertMode={setInsertMode}
          insertPlacement={insertPlacement}
          setInsertPlacement={setInsertPlacement}
          handleInsertToGlyph={handleInsertToGlyph}
          selectedBatchChars={selectedBatchChars}
          setSelectedBatchChars={setSelectedBatchChars}
          batchCharsInput={batchCharsInput}
          setBatchCharsInput={setBatchCharsInput}
          handleBatchInsertToGlyphs={handleBatchInsertToGlyphs}
          project={project}
          selectedChar={selectedChar}
          selectedUnicode={selectedUnicode}
          notify={notify}
        />
 </div>

 {/* ================= MOBILE RESPONSIVE BOTTOM SHEET ================= */}
      <RadicalMobileDrawer
        mobileSheetSnap={mobileSheetSnap}
        setMobileSheetSnap={setMobileSheetSnap}
        mobileSheetTab={mobileSheetTab}
        setMobileSheetTab={setMobileSheetTab}
        isLight={isLight}
        leftSidebarTab={leftSidebarTab}
        setLeftSidebarTab={setLeftSidebarTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        activeCategory={activeCategory}
        filteredPresets={filteredPresets}
        parts={parts}
        activePart={activePart}
        selectedPartId={selectedPartId}
        setSelectedPartId={setSelectedPartId}
        handleLoadPreset={handleLoadPreset}
        selectedRadicalDbId={selectedRadicalDbId}
        setSelectedRadicalDbId={setSelectedRadicalDbId}
        handleCreateNewPart={handleCreateNewPart}
        handleDuplicatePart={handleDuplicatePart}
        handleDeletePart={handleDeletePart}
        handleCenterPartInCanvas={handleCenterPartInCanvas}
        handleScalePart={handleScalePart}
        handleRotatePart={handleRotatePart}
        handleSlantPart={handleSlantPart}
        handleFlipHPart={handleFlipHPart}
        handleFlipVPart={handleFlipVPart}
        handleQuickInsertPlacement={handleQuickInsertPlacement}
        selectedChar={selectedChar}
        contoursToSvgPath={contoursToSvgPath}
        setWatermarkChar={setWatermarkChar}
        setShowWatermark={setShowWatermark}
        notify={notify}
        commitPartChange={commitPartChange}
      />
 </div>

      <RadicalShortcutsHelpModal
        isOpen={showPenShortcutsHelp}
        onClose={() => setShowPenShortcutsHelp(false)}
        isLight={isLight}
      />
      <RadicalExtractContoursModal
        isOpen={showExtractModal}
        onClose={() => setShowExtractModal(false)}
        isLight={isLight}
        glyphs={modifiedGlyphs}
        onExtractFromGlyph={handleExtractFromGlyph}
        contoursToSvgPath={contoursToSvgPath}
      />

 <BundledFontsModal
 isOpen={isLicenseModalOpen}
 onClose={() => setIsLicenseModalOpen(false)}
 theme={theme}
 />
 </div>
 );
};
