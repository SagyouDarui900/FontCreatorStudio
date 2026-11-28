import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  CustomPart,
  PathContour,
  Point,
  StrokePoint,
  ToolMode,
  BrushStyle,
  ShapeType,
  BezierNode,
} from '../../types';
import { STORAGE_KEYS, getStorageItem } from '../../utils/storageKeys';
import {
  generateId,
  contoursToSvgPath,
  strokePointsToOutline,
  smoothStrokeContour,
  createRectContour,
  createEllipseContour,
  createRoundedRectContour,
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
  unionContours,
  normalizeGlyphContoursWinding,
  isPointNearContour,
  eraseContoursAtPoint,
  subtractEraserStrokeFromContours,
  expandStrokeContours,
  getContoursBoundingBox,
} from '../../utils/path';

export interface UseRadicalCanvasProps {
  activePart: CustomPart | null;
  commitPartChange: (contours: PathContour[]) => void;
  toolMode: ToolMode;
  setToolMode: (mode: ToolMode) => void;
  brushStyle: BrushStyle;
  brushWidth: number;
  isStraightMode: boolean;
  pressureSensitivity: 'high' | 'normal' | 'low' | 'off';
  eraserMode: 'stroke' | 'cut' | 'node';
  eraserRadius: number;
  isAutoUnionMode: boolean;
  notify: (text: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  pan: Point;
  setPan: React.Dispatch<React.SetStateAction<Point>>;
  isSpacePressed: boolean;
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  selectedContourId: string | null;
  setSelectedContourId: (id: string | null) => void;
  activeSnapLines: { x: number | null; y: number | null };
  setActiveSnapLines: React.Dispatch<React.SetStateAction<{ x: number | null; y: number | null }>>;
  setParts: React.Dispatch<React.SetStateAction<CustomPart[]>>;
  isSnapEnabled: boolean;
  showGrid: boolean;
  setUndoStack: React.Dispatch<React.SetStateAction<PathContour[][]>>;
  setRedoStack: React.Dispatch<React.SetStateAction<PathContour[][]>>;
}

export function useRadicalCanvas({
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
}: UseRadicalCanvasProps) {
  const svgCanvasRef = useRef<SVGSVGElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // Pan and Drag State
  const [isPanning, setIsPanning] = useState(false);
  const isPanningRef = useRef(false);
  const [, setPanStart] = useState<Point>({ x: 0, y: 0 });
  const panStartRef = useRef<Point>({ x: 0, y: 0 });
  const [isMoveAllPart, setIsMoveAllPart] = useState<boolean>(false);

  // Node Dragging State
  const [, setIsDraggingNode] = useState(false);
  const isDraggingNodeRef = useRef(false);

  // Node & Handle Selection Drag States
  const [, setSelectedHandleType] = useState<'node' | 'handleIn' | 'handleOut' | null>(null);
  const selectedHandleTypeRef = useRef<'node' | 'handleIn' | 'handleOut' | null>(null);
  const [, setDragStartPoint] = useState<Point>({ x: 0, y: 0 });
  const dragStartPointRef = useRef<Point>({ x: 0, y: 0 });
  const dragStartContoursRef = useRef<PathContour[] | null>(null);
  const dragCurrentContoursRef = useRef<PathContour[] | null>(null);

  // Contour Dragging State
  const [, setIsDraggingContour] = useState(false);
  const isDraggingContourRef = useRef(false);

  // Brush / Shape / Pen tool in-progress state & high-performance drawing refs
  const [, setIsDrawingStroke] = useState(false);
  const isDrawingStrokeRef = useRef(false);
  const brushStrokePointsRef = useRef<StrokePoint[]>([]);
  const activeBrushPathRef = useRef<SVGPathElement>(null);
  const brushRafIdRef = useRef<number | null>(null);
  const mouseSmoothSpeedRef = useRef<number>(0.5);
  const isPenDraggingHandleRef = useRef<boolean>(false);
  const [isPenNearFirstNode, setIsPenNearFirstNode] = useState<boolean>(false);

  const selectedNodeIdRef = useRef<string | null>(selectedNodeId);
  selectedNodeIdRef.current = selectedNodeId;
  const selectedContourIdRef = useRef<string | null>(selectedContourId);
  selectedContourIdRef.current = selectedContourId;

  const getBrushPreviewPoints = useCallback((points: StrokePoint[], maxPoints = 180): StrokePoint[] => {
    if (points.length <= 2) return points;
    const stride = Math.max(1, Math.ceil(points.length / maxPoints));
    const sampled = points.filter((_, index) => index === 0 || index === points.length - 1 || index % stride === 0);
    return sampled.length >= 2 ? sampled : [points[0], points[points.length - 1]];
  }, []);

  const [shapeStartPoint, setShapeStartPoint] = useState<Point | null>(null);
  const shapeStartPointRef = useRef<Point | null>(null);
  const [shapeCurrentPoint, setShapeCurrentPoint] = useState<Point | null>(null);
  const shapeCurrentPointRef = useRef<Point | null>(null);
  const [activeShapeType, setActiveShapeType] = useState<ShapeType>('rect');
  const [showShapeMenu, setShowShapeMenu] = useState<boolean>(false);
  const [activePenContour, setActivePenContour] = useState<PathContour | null>(null);
  const activePenContourRef = useRef<PathContour | null>(null);
  activePenContourRef.current = activePenContour;
  const [penMousePos, setPenMousePos] = useState<Point | null>(null);
  const [penHudPos, setPenHudPos] = useState<{ x: number; y: number } | null>(null);
  const [penStrokeWidth, setPenStrokeWidth] = useState<number>(() => {
    const saved = getStorageItem(STORAGE_KEYS.PEN_STROKE_WIDTH);
    if (saved) {
      const val = parseInt(saved, 10);
      if (val >= 2 && val <= 300) return val;
    }
    return 40;
  });
  const [penCapStyle, setPenCapStyle] = useState<'round' | 'butt' | 'square'>(() => {
    const saved = getStorageItem(STORAGE_KEYS.PEN_CAP_STYLE);
    if (saved === 'round' || saved === 'butt' || saved === 'square') return saved;
    return 'round';
  });
  const [showPenStrokeMenu, setShowPenStrokeMenu] = useState<boolean>(false);
  const isDraggingPenHudRef = useRef(false);
  const penHudDragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Eraser modes & settings
  const isErasingRef = useRef<boolean>(false);
  const eraserStrokePointsRef = useRef<Point[]>([]);
  const eraserInitialContoursRef = useRef<PathContour[] | null>(null);
  const eraserCurrentContoursRef = useRef<PathContour[] | null>(null);
  const [eraserHoverPos, setEraserHoverPos] = useState<Point | null>(null);
  const activeEraserSvgDRef = useRef<string>('');
  const activeEraserPathRef = useRef<SVGPathElement | null>(null);

  // Multi-touch gestures (pinch-zoom and pan on mobile/tablet touch screens)
  const activeTouchesRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const touchPinchInitialDistRef = useRef<number | null>(null);
  const touchPinchInitialZoomRef = useRef<number>(1);
  const touchPinchInitialPanRef = useRef<Point>({ x: 0, y: 0 });
  const touchPinchInitialMidpointRef = useRef<Point>({ x: 0, y: 0 });

  // Cancel pending brush animation frame on unmount
  useEffect(() => {
    return () => {
      if (brushRafIdRef.current !== null) {
        cancelAnimationFrame(brushRafIdRef.current);
        brushRafIdRef.current = null;
      }
    };
  }, []);

  const prevToolModeRef = useRef<ToolMode>(toolMode);
  const prevPartIdRef = useRef<string | null>(activePart?.id ?? null);

  // Clean up transient gesture & drawing states on tool switch or active part change
  useEffect(() => {
    const currentPartId = activePart?.id ?? null;
    const toolChanged = prevToolModeRef.current !== toolMode;
    const partChanged = prevPartIdRef.current !== currentPartId;
    if (!toolChanged && !partChanged) return;
    prevToolModeRef.current = toolMode;
    prevPartIdRef.current = currentPartId;

    if (brushRafIdRef.current !== null) {
      cancelAnimationFrame(brushRafIdRef.current);
      brushRafIdRef.current = null;
    }

    isDrawingStrokeRef.current = false;
    setIsDrawingStroke((prev) => (prev ? false : prev));
    brushStrokePointsRef.current = [];

    isErasingRef.current = false;
    eraserStrokePointsRef.current = [];
    eraserInitialContoursRef.current = null;
    eraserCurrentContoursRef.current = null;
    activeEraserSvgDRef.current = '';
    if (activeBrushPathRef.current) {
      activeBrushPathRef.current.setAttribute('d', '');
    }
    if (activeEraserPathRef.current) {
      activeEraserPathRef.current.setAttribute('d', '');
    }

    shapeStartPointRef.current = null;
    shapeCurrentPointRef.current = null;
    setShapeStartPoint((prev) => (prev === null ? prev : null));
    setShapeCurrentPoint((prev) => (prev === null ? prev : null));

    isDraggingNodeRef.current = false;
    isDraggingContourRef.current = false;
    setIsDraggingNode((prev) => (prev ? false : prev));
    setIsDraggingContour((prev) => (prev ? false : prev));

    selectedHandleTypeRef.current = null;
    setSelectedHandleType((prev) => (prev === null ? prev : null));

    dragStartContoursRef.current = null;
    dragCurrentContoursRef.current = null;

    isPanningRef.current = false;
    setIsPanning((prev) => (prev ? false : prev));
    activeTouchesRef.current.clear();
    touchPinchInitialDistRef.current = null;

    isPenDraggingHandleRef.current = false;
    setPenMousePos((prev) => (prev === null ? prev : null));
    setIsPenNearFirstNode((prev) => (prev ? false : prev));

    if (toolMode !== 'pen' || partChanged) {
      activePenContourRef.current = null;
      setActivePenContour((prev) => (prev === null ? prev : null));
    }

    setEraserHoverPos((prev) => (prev === null ? prev : null));
    setActiveSnapLines((prev) => (prev.x === null && prev.y === null ? prev : { x: null, y: null }));
  }, [toolMode, activePart?.id, setActiveSnapLines]);

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


 // Screen to Canvas coordinate conversion helper
 const getCanvasCoordsFromClient = (clientX: number, clientY: number): Point => {
 if (!svgCanvasRef.current) return { x: 0, y: 0 };
 const rect = svgCanvasRef.current.getBoundingClientRect();
 const cx = clientX - rect.left;
 const cy = clientY - rect.top;
 return {
  x: (cx - pan.x) / zoom,
  y: (cy - pan.y) / zoom,
 };
 };

 // Screen to Canvas coordinate conversion
 const getCanvasCoords = (e: React.PointerEvent<SVGSVGElement>): Point => {
 return getCanvasCoordsFromClient(e.clientX, e.clientY);
 };

 // Shape helper
 const getShapeContours = (mode: ToolMode, p1: Point, p2: Point): PathContour[] => {
 const minX = Math.min(p1.x, p2.x);
 const maxX = Math.max(p1.x, p2.x);
 const minY = Math.min(p1.y, p2.y);
 const maxY = Math.max(p1.y, p2.y);
 const width = Math.max(16, maxX - minX);
 const height = Math.max(16, maxY - minY);
 const cx = (p1.x + p2.x) / 2;
 const cy = (p1.y + p2.y) / 2;
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
 default:
 return [createRectContour(minX, minY, maxX, maxY)];
 }
 };

 // Wheel zoom & pan on canvas. This is intentionally handled only here;
 // registering a second native listener causes every wheel gesture to apply twice.
 const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
 e.preventDefault();
 let dx = e.deltaX;
 let dy = e.deltaY;
 if (e.deltaMode === 1) {
 dx *= 20;
 dy *= 20;
 } else if (e.deltaMode === 2) {
 dx *= 400;
 dy *= 400;
 }

 if (isSpacePressed || e.shiftKey || (!e.ctrlKey && !e.metaKey && Math.abs(dx) > Math.abs(dy))) {
 setPan((prev) => ({
 x: prev.x - (e.shiftKey ? dy : dx),
 y: prev.y - (e.shiftKey ? 0 : dy),
 }));
 return;
 }

 if (e.ctrlKey || e.metaKey) {
 const zoomFactor = dy < 0 ? 1.12 : 0.88;
 const newZoom = Math.max(0.15, Math.min(3.0, zoom * zoomFactor));
 if (!svgCanvasRef.current) return;
 const rect = svgCanvasRef.current.getBoundingClientRect();
 const mouseX = e.clientX - rect.left;
 const mouseY = e.clientY - rect.top;
 setPan({
 x: mouseX - (mouseX - pan.x) * (newZoom / zoom),
 y: mouseY - (mouseY - pan.y) * (newZoom / zoom),
 });
 setZoom(newZoom);
 } else {
 setPan((prev) => ({
 x: prev.x - dx,
 y: prev.y - dy,
 }));
 }
 };

  // Pointer event handlers on Part Canvas
  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!activePart) return;
    if (typeof e.button === 'number' && e.button !== 0 && e.button !== 1) return;

 // Multi-touch tracking for pinch-to-zoom and two-finger pan
 if (e.pointerType === 'touch') {
 activeTouchesRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
 if (activeTouchesRef.current.size >= 2) {
 const pts = Array.from(activeTouchesRef.current.values()) as { x: number; y: number }[];
 touchPinchInitialDistRef.current = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
 touchPinchInitialZoomRef.current = zoom;
 touchPinchInitialPanRef.current = { ...pan };
 touchPinchInitialMidpointRef.current = {
 x: (pts[0].x + pts[1].x) / 2,
 y: (pts[0].y + pts[1].y) / 2,
 };
 isPanningRef.current = false;
 setIsPanning(false);
 return;
 }
 }

 try {
 (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
 } catch {}

 const pos = getCanvasCoords(e);

 // Hand tool / Middle click pan / Space key pan
 if (toolMode === 'hand' || e.button === 1 || isSpacePressed) {
 isPanningRef.current = true;
 setIsPanning(true);
 const nextPanStart = { x: e.clientX - pan.x, y: e.clientY - pan.y };
 panStartRef.current = nextPanStart;
 setPanStart(nextPanStart);
      return;
    }

    if (typeof e.button === 'number' && e.button !== 0) {
      return;
    }

 // Brush Tool
 if (toolMode === 'brush') {
 try {
 (e.target as Element).setPointerCapture?.(e.pointerId);
 } catch {}
 let initialPressure = 0.5;
 if (e.pressure && e.pressure > 0) {
 initialPressure = e.pressure;
 } else if (pressureSensitivity === 'off') {
 initialPressure = 1.0;
 }
 mouseSmoothSpeedRef.current = 0.5;
 const firstPt: StrokePoint = {
 x: pos.x,
 y: pos.y,
 pressure: initialPressure,
 time: e.timeStamp || Date.now(),
 pointerType: e.pointerType,
 };
 brushStrokePointsRef.current = [firstPt];
 isDrawingStrokeRef.current = true;
 setIsDrawingStroke(true);
 if (activeBrushPathRef.current) {
 activeBrushPathRef.current.setAttribute('d', '');
 }
 return;
 }

 // Shape Tools
 const isShape = [
 'rect',
 'square',
 'ellipse',
 'circle',
 'rounded_rect',
 'pill',
 'triangle',
 'triangle_down',
 'right_triangle',
 'semicircle',
 'ring',
 'parallelogram',
 'star',
 'heart',
 'sparkle',
 'starburst',
 'diamond',
 'polygon',
 'crescent',
 ].includes(toolMode);

 if (isShape) {
 shapeStartPointRef.current = pos;
 shapeCurrentPointRef.current = pos;
 setShapeStartPoint(pos);
 setShapeCurrentPoint(pos);
 return;
 }

 // Eraser Tool with pointer capture & live modes
 if (toolMode === 'eraser') {
 try {
 (e.target as Element).setPointerCapture?.(e.pointerId);
 } catch {}
 isErasingRef.current = true;
 eraserStrokePointsRef.current = [pos];
 eraserInitialContoursRef.current = JSON.parse(JSON.stringify(activePart.contours));
 eraserCurrentContoursRef.current = activePart.contours;
 setEraserHoverPos(pos);

 if (eraserMode === 'cut') {
 const d = `M ${pos.x} ${pos.y} L ${pos.x + 0.1} ${pos.y}`;
 activeEraserSvgDRef.current = d;
 if (activeEraserPathRef.current) {
 activeEraserPathRef.current.setAttribute('d', d);
 }
 } else {
 const sourceContours = eraserCurrentContoursRef.current || activePart.contours;
 const remaining = eraseContoursAtPoint(sourceContours, pos, eraserRadius, eraserMode);
 if (remaining !== sourceContours) {
 eraserCurrentContoursRef.current = remaining;
 setParts((prevParts) =>
 prevParts.map((p) => (p.id === activePart.id ? { ...p, contours: remaining } : p))
 );
 }
 }
 return;
 }

 // Pen Tool
 if (toolMode === 'pen') {
 const currentPenContour = activePenContourRef.current;
 if (!currentPenContour) {
 const newNode: BezierNode = {
 id: generateId(),
 x: pos.x,
 y: pos.y,
 handleIn: null,
 handleOut: null,
 type: 'corner',
 };
 const createdContour: PathContour = {
 id: generateId(),
 closed: false,
 nodes: [newNode],
 };
 activePenContourRef.current = createdContour;
 setActivePenContour(createdContour);
 selectedNodeIdRef.current = newNode.id;
 setSelectedNodeId(newNode.id);
 isPenDraggingHandleRef.current = true;
 dragStartPointRef.current = pos;
 setDragStartPoint(pos);
 } else {
 // Check if clicking near first node to close contour
 const firstNode = currentPenContour.nodes[0];
 const distToFirst = Math.hypot(pos.x - firstNode.x, pos.y - firstNode.y);

 if (distToFirst < 22 / zoom && currentPenContour.nodes.length >= 2) {
 const finishedContour: PathContour = {
 ...currentPenContour,
 closed: true,
 };
 commitPartChange([...activePart.contours, finishedContour]);
 activePenContourRef.current = null;
 setActivePenContour(null);
 selectedContourIdRef.current = finishedContour.id;
 setSelectedContourId(finishedContour.id);
 selectedNodeIdRef.current = null;
 setSelectedNodeId(null);
 setToolMode('select');
 } else {
 const newNode: BezierNode = {
 id: generateId(),
 x: pos.x,
 y: pos.y,
 handleIn: null,
 handleOut: null,
 type: 'corner',
 };
 const updatedPenContour: PathContour = {
 ...currentPenContour,
 nodes: [...currentPenContour.nodes, newNode],
 };
 activePenContourRef.current = updatedPenContour;
 setActivePenContour(updatedPenContour);
 selectedNodeIdRef.current = newNode.id;
 setSelectedNodeId(newNode.id);
 isPenDraggingHandleRef.current = true;
 dragStartPointRef.current = pos;
 setDragStartPoint(pos);
 }
 }
 return;
 }

 // Select Tool
 if (toolMode === 'select') {
 const initialContours = JSON.parse(JSON.stringify(activePart.contours)) as PathContour[];
 dragStartContoursRef.current = initialContours;
 dragCurrentContoursRef.current = initialContours;
 if (isMoveAllPart) {
 selectedHandleTypeRef.current = null;
 setSelectedHandleType(null);
 isDraggingContourRef.current = true;
 setIsDraggingContour(true);
 dragStartPointRef.current = pos;
 setDragStartPoint(pos);
 return;
 }
 const hitRadius = Math.max(12, 16 / zoom);

 // 1. Check Handle Hits on currently selected node first
 if (selectedNodeIdRef.current && selectedContourIdRef.current) {
 const targetContour = activePart.contours.find((c) => c.id === selectedContourIdRef.current);
 const targetNode = targetContour?.nodes.find((n) => n.id === selectedNodeIdRef.current);
 if (targetNode) {
 if (targetNode.handleIn) {
 const dIn = Math.hypot(pos.x - targetNode.handleIn.x, pos.y - targetNode.handleIn.y);
 if (dIn < hitRadius) {
 selectedHandleTypeRef.current = 'handleIn';
 setSelectedHandleType('handleIn');
 isDraggingNodeRef.current = true;
 setIsDraggingNode(true);
 dragStartPointRef.current = pos;
 setDragStartPoint(pos);
 return;
 }
 }
 if (targetNode.handleOut) {
 const dOut = Math.hypot(pos.x - targetNode.handleOut.x, pos.y - targetNode.handleOut.y);
 if (dOut < hitRadius) {
 selectedHandleTypeRef.current = 'handleOut';
 setSelectedHandleType('handleOut');
 isDraggingNodeRef.current = true;
 setIsDraggingNode(true);
 dragStartPointRef.current = pos;
 setDragStartPoint(pos);
 return;
 }
 }
 }
 }

 // 2. Check node hits
 let foundNode = false;
 for (const contour of activePart.contours) {
 for (const node of contour.nodes) {
 const distNode = Math.hypot(pos.x - node.x, pos.y - node.y);
 if (distNode < hitRadius) {
 selectedContourIdRef.current = contour.id;
 setSelectedContourId(contour.id);
 selectedNodeIdRef.current = node.id;
 setSelectedNodeId(node.id);
 selectedHandleTypeRef.current = 'node';
 setSelectedHandleType('node');
 isDraggingNodeRef.current = true;
 setIsDraggingNode(true);
 dragStartPointRef.current = pos;
 setDragStartPoint(pos);
 foundNode = true;
 break;
 }
 }
 if (foundNode) break;
 }

 // 3. Check contour hits (Proximity to stroke segments for accurate selection)
 if (!foundNode) {
 const contourHitThreshold = Math.max(16, 24 / zoom);
 let clickedContour = activePart.contours.find((contour) =>
 isPointNearContour(pos, contour, contourHitThreshold)
 );

 // Fallback: AABB check for filled interior of closed shapes
 if (!clickedContour) {
 clickedContour = activePart.contours.find((contour) => {
 const bbox = getContoursBoundingBox([contour]);
 return (
 pos.x >= bbox.minX &&
 pos.x <= bbox.maxX &&
 pos.y >= bbox.minY &&
 pos.y <= bbox.maxY
 );
 });
 }

 if (clickedContour) {
 selectedContourIdRef.current = clickedContour.id;
 setSelectedContourId(clickedContour.id);
 selectedNodeIdRef.current = null;
 setSelectedNodeId(null);
 isDraggingContourRef.current = true;
 setIsDraggingContour(true);
 dragStartPointRef.current = pos;
 setDragStartPoint(pos);
 } else {
 selectedContourIdRef.current = null;
 setSelectedContourId(null);
 selectedNodeIdRef.current = null;
 setSelectedNodeId(null);
 }
 selectedHandleTypeRef.current = null;
 setSelectedHandleType(null);
 }
 }
 };

 const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
 // Multi-touch gestures (pinch-zoom and pan)
 if (e.pointerType === 'touch') {
 activeTouchesRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
 if (activeTouchesRef.current.size >= 2 && touchPinchInitialDistRef.current) {
 const pts = Array.from(activeTouchesRef.current.values()) as { x: number; y: number }[];
 const newDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
 const scale = newDist / touchPinchInitialDistRef.current;
 const newZoom = Math.max(0.15, Math.min(3.5, touchPinchInitialZoomRef.current * scale));

 const currMid = {
 x: (pts[0].x + pts[1].x) / 2,
 y: (pts[0].y + pts[1].y) / 2,
 };
 const dMidX = currMid.x - touchPinchInitialMidpointRef.current.x;
 const dMidY = currMid.y - touchPinchInitialMidpointRef.current.y;

 if (svgCanvasRef.current) {
 const rect = svgCanvasRef.current.getBoundingClientRect();
 const midX = touchPinchInitialMidpointRef.current.x - rect.left;
 const midY = touchPinchInitialMidpointRef.current.y - rect.top;
 setPan({
 x: midX - (midX - touchPinchInitialPanRef.current.x) * (newZoom / touchPinchInitialZoomRef.current) + dMidX,
 y: midY - (midY - touchPinchInitialPanRef.current.y) * (newZoom / touchPinchInitialZoomRef.current) + dMidY,
 });
 }
 setZoom(newZoom);
 return;
 }
 }

 if (isPanningRef.current) {
 setPan({
 x: e.clientX - panStartRef.current.x,
 y: e.clientY - panStartRef.current.y,
 });
 return;
 }

 const rawPos = getCanvasCoords(e);
 const snapped = snapToGuides(rawPos);

 if (isDraggingNodeRef.current || isDraggingContourRef.current || toolMode === 'pen' || shapeStartPointRef.current) {
 if (activeSnapLines.x !== snapped.snapX || activeSnapLines.y !== snapped.snapY) {
 setActiveSnapLines({ x: snapped.snapX, y: snapped.snapY });
 }
 } else if (activeSnapLines.x !== null || activeSnapLines.y !== null) {
 setActiveSnapLines({ x: null, y: null });
 }

 // Freehand input must follow the pointer exactly. Snapping is reserved for
 // discrete geometry and editing operations, otherwise a brush stroke can
 // visibly jump toward guides.
 const pos = toolMode === 'brush' || toolMode === 'eraser' ? rawPos : snapped.point;

 // Track eraser hover position for the high-visibility circular reticle
 if (toolMode === 'eraser') {
 setEraserHoverPos(pos);
 }

 if (toolMode === 'pen') {
 if (!penMousePos || Math.hypot(penMousePos.x - pos.x, penMousePos.y - pos.y) > 0.5) {
 setPenMousePos(pos);
 }
 }

 // Eraser continuous sweep while dragging
 if (isErasingRef.current && toolMode === 'eraser' && activePart) {
 const prev = eraserStrokePointsRef.current[eraserStrokePointsRef.current.length - 1] || pos;
 eraserStrokePointsRef.current.push(pos);

 if (eraserMode === 'cut') {
 const pts = eraserStrokePointsRef.current;
 let d = `M ${pts[0].x} ${pts[0].y}`;
 for (let i = 1; i < pts.length; i++) {
 d += ` L ${pts[i].x} ${pts[i].y}`;
 }
 activeEraserSvgDRef.current = d;
 if (activeEraserPathRef.current) {
 activeEraserPathRef.current.setAttribute('d', d);
 }
 } else {
 const sourceContours = eraserCurrentContoursRef.current || activePart.contours;
 const remaining = eraseContoursAtPoint(sourceContours, pos, eraserRadius, eraserMode, prev);
 if (remaining !== sourceContours) {
 setParts((prevParts) =>
 prevParts.map((p) => (p.id === activePart.id ? { ...p, contours: remaining } : p))
 );
 eraserCurrentContoursRef.current = remaining;
 }
 }
 return;
 }

 // Live Brush Stroke Engine
 if (isDrawingStrokeRef.current && toolMode === 'brush') {
 const native = e.nativeEvent as PointerEvent & { getCoalescedEvents?: () => PointerEvent[] };
 const events = native.getCoalescedEvents ? native.getCoalescedEvents() : [native];
 
 for (const evt of events) {
 const lastPt = brushStrokePointsRef.current[brushStrokePointsRef.current.length - 1];
 const rawPos = getCanvasCoordsFromClient(evt.clientX, evt.clientY);
 let p = evt.pressure;
 const isMouse = (evt.pointerType || e.pointerType) === 'mouse';
 if (!p || p === 0 || isMouse) {
 if (pressureSensitivity === 'off') {
 p = 1.0;
 } else if (lastPt) {
 const dt = Math.max(1, (evt.timeStamp || Date.now()) - (lastPt.time || 0));
 const dist = Math.hypot(rawPos.x - lastPt.x, rawPos.y - lastPt.y);
 const instantSpeed = dist / dt;
 const emaAlpha = 0.25;
 mouseSmoothSpeedRef.current = emaAlpha * instantSpeed + (1 - emaAlpha) * mouseSmoothSpeedRef.current;
 const factor = pressureSensitivity === 'high' ? 0.7 : pressureSensitivity === 'low' ? 0.25 : 0.45;
 p = Math.max(0.2, Math.min(1.0, 1.0 - mouseSmoothSpeedRef.current * factor));
 } else {
 p = 0.5;
 }
 }
 brushStrokePointsRef.current.push({
 x: rawPos.x,
 y: rawPos.y,
 pressure: p,
 time: evt.timeStamp || Date.now(),
 pointerType: evt.pointerType || e.pointerType,
 });
 }

 // Capture shiftKey synchronously before entering rAF
 const shiftHeld = e.shiftKey;

 // RAF Throttled DOM path update for maximum frame rate
 if (!brushRafIdRef.current) {
 brushRafIdRef.current = requestAnimationFrame(() => {
 brushRafIdRef.current = null;
 if (brushStrokePointsRef.current.length >= 2 && activeBrushPathRef.current) {
 const sampledPoints = getBrushPreviewPoints(brushStrokePointsRef.current);
 const pts = isStraightMode || shiftHeld
 ? [
 brushStrokePointsRef.current[0],
 brushStrokePointsRef.current[brushStrokePointsRef.current.length - 1],
 ]
 : sampledPoints;
 const contour = strokePointsToOutline(
   pts,
   brushWidth,
   brushStyle,
   true,
   pressureSensitivity,
   undefined,
   62,
   { density: 'high', subdivisionStep: 1.5, widthSmoothingPasses: 1 },
 );
 if (contour && contour.nodes.length >= 3) {
 activeBrushPathRef.current.setAttribute('d', contoursToSvgPath([contour]));
 }
 }
 });
 }
 return;
 }

 // Pen Tool Hover and Dragging Handle
 if (toolMode === 'pen') {
 const currentPenContour = activePenContourRef.current;
 const currentNodeId = selectedNodeIdRef.current;
 if (currentPenContour && currentPenContour.nodes.length >= 2) {
 const firstNode = currentPenContour.nodes[0];
 const dist = Math.hypot(pos.x - firstNode.x, pos.y - firstNode.y);
 setIsPenNearFirstNode(dist < 22 / zoom);
 } else {
 setIsPenNearFirstNode(false);
 }

 if (isPenDraggingHandleRef.current && currentPenContour && currentNodeId) {
 const dx = pos.x - dragStartPointRef.current.x;
 const dy = pos.y - dragStartPointRef.current.y;
 if (Math.hypot(dx, dy) > 3) {
 const updatedNodes = currentPenContour.nodes.map((node) => {
 if (node.id !== currentNodeId) return node;
 return {
 ...node,
 type: 'smooth' as const,
 handleOut: { x: pos.x, y: pos.y },
 handleIn: { x: 2 * node.x - pos.x, y: 2 * node.y - pos.y },
 };
 });
 const updatedPenContour = {
 ...currentPenContour,
 nodes: updatedNodes,
 };
 activePenContourRef.current = updatedPenContour;
 setActivePenContour(updatedPenContour);
 }
 }
 return;
 }

 if (shapeStartPointRef.current) {
 shapeCurrentPointRef.current = pos;
 setShapeCurrentPoint(pos);
 return;
 }

 // Dragging handle or node in Select mode
 if (isDraggingNodeRef.current && selectedNodeIdRef.current && selectedContourIdRef.current && activePart) {
 const dx = pos.x - dragStartPointRef.current.x;
 const dy = pos.y - dragStartPointRef.current.y;
 const targetContourId = selectedContourIdRef.current;
 const targetNodeId = selectedNodeIdRef.current;
 const handleType = selectedHandleTypeRef.current;

 const sourceContours = dragCurrentContoursRef.current || activePart.contours;
 const updated = sourceContours.map((contour) => {
 if (contour.id !== targetContourId) return contour;
 return {
 ...contour,
 nodes: contour.nodes.map((node) => {
 if (node.id !== targetNodeId) return node;

 if (handleType === 'handleIn') {
 const newHandleIn = { x: pos.x, y: pos.y };
 let newHandleOut = node.handleOut;
 if (node.type === 'smooth' && node.handleOut) {
 const lenOut = Math.hypot(node.handleOut.x - node.x, node.handleOut.y - node.y);
 const angleIn = Math.atan2(newHandleIn.y - node.y, newHandleIn.x - node.x);
 const angleOut = angleIn + Math.PI;
 newHandleOut = {
 x: Math.round(node.x + Math.cos(angleOut) * lenOut),
 y: Math.round(node.y + Math.sin(angleOut) * lenOut),
 };
 }
 return { ...node, handleIn: newHandleIn, handleOut: newHandleOut };
 }

 if (handleType === 'handleOut') {
 const newHandleOut = { x: pos.x, y: pos.y };
 let newHandleIn = node.handleIn;
 if (node.type === 'smooth' && node.handleIn) {
 const lenIn = Math.hypot(node.handleIn.x - node.x, node.handleIn.y - node.y);
 const angleOut = Math.atan2(newHandleOut.y - node.y, newHandleOut.x - node.x);
 const angleIn = angleOut + Math.PI;
 newHandleIn = {
 x: Math.round(node.x + Math.cos(angleIn) * lenIn),
 y: Math.round(node.y + Math.sin(angleIn) * lenIn),
 };
 }
 return { ...node, handleIn: newHandleIn, handleOut: newHandleOut };
 }

 // Dragging node anchor point itself
 return {
 ...node,
 x: node.x + dx,
 y: node.y + dy,
 handleIn: node.handleIn
 ? { x: node.handleIn.x + dx, y: node.handleIn.y + dy }
 : null,
 handleOut: node.handleOut
 ? { x: node.handleOut.x + dx, y: node.handleOut.y + dy }
 : null,
 };
 }),
 };
 });

 dragCurrentContoursRef.current = updated;
 dragStartPointRef.current = pos;
 setParts((prev) =>
 prev.map((p) => (p.id === activePart.id ? { ...p, contours: updated } : p))
 );
 setDragStartPoint(pos);
 return;
 }

 // Dragging whole selected contour
 if (isDraggingContourRef.current && activePart && (selectedContourIdRef.current || isMoveAllPart)) {
 const dx = pos.x - dragStartPointRef.current.x;
 const dy = pos.y - dragStartPointRef.current.y;
 const targetContourId = selectedContourIdRef.current;

 const sourceContours = dragCurrentContoursRef.current || activePart.contours;
 const updated = sourceContours.map((contour) => {
 if (!isMoveAllPart && contour.id !== targetContourId) return contour;
 return {
 ...contour,
 nodes: contour.nodes.map((node) => ({
 ...node,
 x: node.x + dx,
 y: node.y + dy,
 handleIn: node.handleIn
 ? { x: node.handleIn.x + dx, y: node.handleIn.y + dy }
 : null,
 handleOut: node.handleOut
 ? { x: node.handleOut.x + dx, y: node.handleOut.y + dy }
 : null,
 })),
 };
 });

 dragCurrentContoursRef.current = updated;
 dragStartPointRef.current = pos;
 setParts((prev) =>
 prev.map((p) => (p.id === activePart.id ? { ...p, contours: updated } : p))
 );
 setDragStartPoint(pos);
 return;
 }
 };

 const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
  // Pointer cancellation must discard the in-progress gesture instead of
  // committing a shape, eraser stroke, or drag as if it completed normally.
  if (e.type === 'pointercancel') {
    handlePointerCancel(e);
    return;
  }

  if (e.pointerType === 'touch') {
    activeTouchesRef.current.delete(e.pointerId);
    if (activeTouchesRef.current.size < 2) {
      touchPinchInitialDistRef.current = null;
    }
  }

  isPanningRef.current = false;
  setIsPanning(false);
  isDraggingNodeRef.current = false;
  setIsDraggingNode(false);
  isDraggingContourRef.current = false;
  setIsDraggingContour(false);
  selectedHandleTypeRef.current = null;
  setSelectedHandleType(null);
  setActiveSnapLines({ x: null, y: null });
  try {
    (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
  } catch {}

 // Finalize Eraser Tool
 if (isErasingRef.current && toolMode === 'eraser') {
 try {
 (e.target as Element).releasePointerCapture?.(e.pointerId);
 } catch {}
 isErasingRef.current = false;
 activeEraserSvgDRef.current = '';
 if (activeEraserPathRef.current) {
 activeEraserPathRef.current.setAttribute('d', '');
 }

 if (eraserMode === 'cut' && eraserStrokePointsRef.current.length > 0 && activePart) {
 const rawPts = eraserStrokePointsRef.current;
 eraserStrokePointsRef.current = [];
 const pts = rawPts.length === 1
 ? [rawPts[0], { x: rawPts[0].x + 0.1, y: rawPts[0].y + 0.1 }]
 : rawPts;
 const updated = subtractEraserStrokeFromContours(activePart.contours, pts, eraserRadius);
 if (updated !== activePart.contours) {
 commitPartChange(updated);
 notify('パスを削り・分割しました', 'info');
 }
 } else {
 eraserStrokePointsRef.current = [];
 const initialContours = eraserInitialContoursRef.current;
 const currentContours = eraserCurrentContoursRef.current;
 if (initialContours && currentContours && JSON.stringify(initialContours) !== JSON.stringify(currentContours)) {
 setUndoStack((prev) => [...prev.slice(-25), initialContours]);
 setRedoStack([]);
 setParts((prevParts) =>
   prevParts.map((p) =>
     p.id === activePart?.id
       ? { ...p, contours: currentContours, updatedAt: Date.now() }
       : p
   )
 );
 }
 }
 eraserInitialContoursRef.current = null;
 eraserCurrentContoursRef.current = null;
 return;
 }

 // Record undo state if a node or contour drag occurred in select mode
 if (dragStartContoursRef.current && dragCurrentContoursRef.current && activePart) {
 const startContours = dragStartContoursRef.current;
 const finalContours = dragCurrentContoursRef.current;
 const startJson = JSON.stringify(startContours);
 const currentJson = JSON.stringify(finalContours);
 if (startJson !== currentJson) {
 setUndoStack((prev) => [...prev.slice(-25), startContours]);
 setRedoStack([]);
 setParts((prevParts) =>
   prevParts.map((p) =>
     p.id === activePart.id
       ? { ...p, contours: finalContours, updatedAt: Date.now() }
       : p
   )
 );
 }
 dragStartContoursRef.current = null;
 dragCurrentContoursRef.current = null;
 }

 // Finalize Pen dragging
 if (toolMode === 'pen') {
 isPenDraggingHandleRef.current = false;
 return;
 }

 if (!activePart) return;

 // Finalize Brush
 if (isDrawingStrokeRef.current && toolMode === 'brush') {
 if (brushRafIdRef.current !== null) {
 cancelAnimationFrame(brushRafIdRef.current);
 brushRafIdRef.current = null;
 }
 if (brushStrokePointsRef.current.length >= 2) {
 const finalPoints = isStraightMode || e.shiftKey
 ? [
 brushStrokePointsRef.current[0],
 brushStrokePointsRef.current[brushStrokePointsRef.current.length - 1],
 ]
 : brushStrokePointsRef.current;
 const rawContour = strokePointsToOutline(
 finalPoints,
 brushWidth,
 brushStyle,
 true,
 pressureSensitivity,
 undefined,
 62,
 { density: 'high', subdivisionStep: 1.5, widthSmoothingPasses: 1 },
 );
 if (rawContour && rawContour.nodes.length >= 3) {
 let strokeContour = rawContour;
 try {
 const selfMerged = unionContours([strokeContour], 1.2, true);
 if (selfMerged && selfMerged.length === 1) {
 strokeContour = selfMerged[0];
 } else if (selfMerged && selfMerged.length > 1) {
 commitPartChange(normalizeGlyphContoursWinding([...activePart.contours, ...selfMerged]));
 isDrawingStrokeRef.current = false;
 setIsDrawingStroke(false);
 brushStrokePointsRef.current = [];
 if (activeBrushPathRef.current) {
 activeBrushPathRef.current.setAttribute('d', '');
 }
 return;
 }
 } catch {
 // ignore
 }

 if (isAutoUnionMode && activePart.contours.length > 0) {
 try {
 const unioned = unionContours([...activePart.contours, strokeContour]);
 if (unioned && unioned.length > 0) {
 commitPartChange(normalizeGlyphContoursWinding(unioned));
 } else {
 commitPartChange([...activePart.contours, strokeContour]);
 }
 } catch {
 commitPartChange([...activePart.contours, strokeContour]);
 }
 } else {
 commitPartChange([...activePart.contours, strokeContour]);
 }
 }
 }
 isDrawingStrokeRef.current = false;
 setIsDrawingStroke(false);
 brushStrokePointsRef.current = [];
 if (activeBrushPathRef.current) {
 activeBrushPathRef.current.setAttribute('d', '');
 }
 return;
 }

 // Finalize Shape
 const isShape = [
 'rect',
 'square',
 'ellipse',
 'circle',
 'rounded_rect',
 'pill',
 'triangle',
 'triangle_down',
 'right_triangle',
 'semicircle',
 'ring',
 'parallelogram',
 'star',
 'sparkle',
 'starburst',
 'heart',
 'diamond',
 'polygon',
 'crescent',
 ].includes(toolMode);

 const startPt = shapeStartPointRef.current;
 const currPt = shapeCurrentPointRef.current;
 if (isShape && startPt && currPt) {
 const dist = Math.hypot(
 currPt.x - startPt.x,
 currPt.y - startPt.y
 );
 const p1 =
 dist < 10
 ? { x: startPt.x - 120, y: startPt.y - 120 }
 : startPt;
 const p2 =
 dist < 10
 ? { x: startPt.x + 120, y: startPt.y + 120 }
 : currPt;

 const newShapeContours = getShapeContours(toolMode, p1, p2);
 if (isAutoUnionMode && activePart.contours.length > 0) {
 try {
 const unioned = unionContours([...activePart.contours, ...newShapeContours]);
 if (unioned && unioned.length > 0) {
 commitPartChange(normalizeGlyphContoursWinding(unioned));
 } else {
 commitPartChange([...activePart.contours, ...newShapeContours]);
 }
 } catch {
 commitPartChange([...activePart.contours, ...newShapeContours]);
 }
 } else {
 commitPartChange([...activePart.contours, ...newShapeContours]);
 }
 const nextSelectedId = newShapeContours[0]?.id || null;
 selectedContourIdRef.current = nextSelectedId;
 setSelectedContourId(nextSelectedId);
 shapeStartPointRef.current = null;
 shapeCurrentPointRef.current = null;
 setShapeStartPoint(null);
 setShapeCurrentPoint(null);
 }
 };

 const handlePointerCancel = (e: React.PointerEvent<SVGSVGElement>) => {
   if (e.pointerType === 'touch') {
     activeTouchesRef.current.delete(e.pointerId);
     if (activeTouchesRef.current.size < 2) {
       touchPinchInitialDistRef.current = null;
     }
   }
   try {
     if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
       e.currentTarget.releasePointerCapture?.(e.pointerId);
     }
   } catch {
     // The browser may have released the pointer already.
   }

   if (activePart && eraserInitialContoursRef.current) {
     const initialContours = eraserInitialContoursRef.current;
     setParts((prevParts) =>
       prevParts.map((p) =>
         p.id === activePart.id
           ? { ...p, contours: initialContours, updatedAt: Date.now() }
           : p
       )
     );
   } else if (activePart && dragStartContoursRef.current) {
     const initialContours = dragStartContoursRef.current;
     setParts((prevParts) =>
       prevParts.map((p) =>
         p.id === activePart.id
           ? { ...p, contours: initialContours, updatedAt: Date.now() }
           : p
       )
     );
   }

   if (brushRafIdRef.current !== null) {
     cancelAnimationFrame(brushRafIdRef.current);
     brushRafIdRef.current = null;
   }
   isPanningRef.current = false;
   setIsPanning(false);
   isPenDraggingHandleRef.current = false;
   isDrawingStrokeRef.current = false;
   setIsDrawingStroke(false);
   brushStrokePointsRef.current = [];
   eraserStrokePointsRef.current = [];
   eraserInitialContoursRef.current = null;
   eraserCurrentContoursRef.current = null;
   isErasingRef.current = false;
   dragStartContoursRef.current = null;
   dragCurrentContoursRef.current = null;
   shapeStartPointRef.current = null;
   shapeCurrentPointRef.current = null;
   setShapeStartPoint(null);
   setShapeCurrentPoint(null);
   isDraggingNodeRef.current = false;
   setIsDraggingNode(false);
   isDraggingContourRef.current = false;
   setIsDraggingContour(false);
   selectedHandleTypeRef.current = null;
   setSelectedHandleType(null);
   setActiveSnapLines({ x: null, y: null });
   activeEraserSvgDRef.current = '';
   if (activeBrushPathRef.current) {
     activeBrushPathRef.current.setAttribute('d', '');
   }
   if (activeEraserPathRef.current) {
     activeEraserPathRef.current.setAttribute('d', '');
   }
 };

 // Pen Tool actions in Radical Studio
 const handleUndoPartPenNode = () => {
 if (!activePenContour) return;
 if (activePenContour.nodes.length <= 1) {
 setActivePenContour(null);
 setSelectedNodeId(null);
 } else {
 const remaining = activePenContour.nodes.slice(0, -1);
 setActivePenContour({
 ...activePenContour,
 nodes: remaining,
 });
 setSelectedNodeId(remaining[remaining.length - 1].id);
 }
 };

 const handleResetPartPenContour = () => {
 setActivePenContour(null);
 setSelectedNodeId(null);
 };

 const handleFinishPartPenContour = (closed: boolean = false, customWidth?: number) => {
 if (!activePenContour || activePenContour.nodes.length < 2 || !activePart) return;
 setShowPenStrokeMenu(false);
 const targetWidth = customWidth ?? penStrokeWidth;

 if (!closed) {
 try {
 const rawContour: PathContour = {
 ...activePenContour,
 closed: false,
 };
 const expanded = expandStrokeContours([rawContour], targetWidth, penCapStyle);
 if (expanded && expanded.length > 0) {
 let resultContours = expanded;
 if (isAutoUnionMode && activePart.contours.length > 0) {
 try {
 const unioned = unionContours([...activePart.contours, ...expanded]);
 if (unioned && unioned.length > 0) {
 commitPartChange(normalizeGlyphContoursWinding(unioned));
 setActivePenContour(null);
 setSelectedContourId(null);
 return;
 }
 } catch {}
 }
 commitPartChange([...activePart.contours, ...resultContours]);
 setActivePenContour(null);
 setSelectedContourId(resultContours[0].id);
 return;
 }
 } catch (err) {
 console.warn('Part stroke expansion fallback:', err);
 }
 }

 const finished: PathContour = {
 ...activePenContour,
 closed,
 };
 if (isAutoUnionMode && activePart.contours.length > 0 && closed) {
 try {
 const unioned = unionContours([...activePart.contours, finished]);
 if (unioned && unioned.length > 0) {
 commitPartChange(normalizeGlyphContoursWinding(unioned));
 setActivePenContour(null);
 setSelectedContourId(null);
 return;
 }
 } catch {
 // fallback
 }
 }
 commitPartChange([...activePart.contours, finished]);
 setActivePenContour(null);
 setSelectedContourId(finished.id);
 };

 const handlePartPenHudPointerDown = (e: React.PointerEvent) => {
 e.stopPropagation();
 e.preventDefault();
 isDraggingPenHudRef.current = true;
 const target = e.currentTarget as HTMLElement;
 try {
 target.setPointerCapture?.(e.pointerId);
 } catch {
 // ignore
 }

 const containerRect = canvasContainerRef.current?.getBoundingClientRect();
 const currentLeft =
 penHudPos?.x ??
 (containerRect ? Math.max(16, (containerRect.width - 340) / 2) : 40);
 const currentTop = penHudPos?.y ?? 20;

 penHudDragOffsetRef.current = {
 x: e.clientX - currentLeft,
 y: e.clientY - currentTop,
 };
 };

 const handlePartPenHudPointerMove = (e: React.PointerEvent) => {
 if (!isDraggingPenHudRef.current) return;
 e.stopPropagation();
 e.preventDefault();
 if (!canvasContainerRef.current) return;

 const containerRect = canvasContainerRef.current.getBoundingClientRect();
 let newX = e.clientX - penHudDragOffsetRef.current.x;
 let newY = e.clientY - penHudDragOffsetRef.current.y;

 const hudWidth = containerRect.width < 640 ? 300 : 260;
 newX = Math.max(8, Math.min(containerRect.width - hudWidth, newX));
 newY = Math.max(8, Math.min(containerRect.height - 44, newY));

 setPenHudPos({ x: newX, y: newY });
 };

 const handlePartPenHudPointerUp = (e: React.PointerEvent) => {
 if (isDraggingPenHudRef.current) {
 isDraggingPenHudRef.current = false;
 try {
 (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
 } catch {
 // ignore
 }
 }
 };


  const penSvgPath = activePenContour ? contoursToSvgPath([activePenContour]) : '';
  const brushSvgPath = '';

  return {
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
  };
}
