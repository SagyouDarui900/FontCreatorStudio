import React, { useRef, useCallback } from 'react';
import {
  Point,
  PathContour,
  BezierNode,
  ToolMode,
  GridSettings,
  SnapGuideLine,
  CustomGuideline,
  SnapMetrics,
  RulerMeasurement,
  TraceSettings,
} from '../../../types';
import { snapSinglePoint } from '../../../utils/snapUtils';
import { generateId } from '../../../utils/pathUtils';

export interface UseCanvasPointerDispatcherOptions {
  // Viewport
  zoom: number;
  pan: { x: number; y: number };
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  setPan: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  zoomRef: React.MutableRefObject<number>;
  panRef: React.MutableRefObject<{ x: number; y: number }> | React.MutableRefObject<any>;
  screenToCanvas: (clientX: number, clientY: number) => Point;
  resetView: (mode?: 'fit' | '100%' | 'width') => void;
  containerRef: React.RefObject<HTMLDivElement | null>;

  // Panning & Space
  isSpacePressed: boolean;
  isPanning: boolean;
  setIsPanning: React.Dispatch<React.SetStateAction<boolean>>;
  panStartRef: React.MutableRefObject<Point>;

  // Tool Modes
  toolMode: ToolMode;
  isShapeTool: boolean;
  eraserMode: 'stroke' | 'node' | 'all' | 'cut' | string;
  penMode: 'bezier' | 'corner' | 'tangent';

  // Stylus & Palm Rejection
  palmRejectionMode: 'auto' | 'strict_pen_only' | 'off';
  isStylusActive: boolean;
  setIsStylusActive: (active: boolean) => void;
  setLiveStylusPressure: (pressure: number) => void;

  // Selection & Node Editing
  contours: PathContour[];
  contoursRef: React.MutableRefObject<PathContour[]>;
  selectedContourIds: string[];
  setSelectedContourIds: (ids: string[]) => void;
  selectedContourId: string | null;
  setSelectedContourId: (id: string | null) => void;
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  selectedHandleType: 'handleIn' | 'handleOut' | 'node' | null;
  setSelectedHandleType: (type: 'handleIn' | 'handleOut' | 'node' | null) => void;
  marqueeSelection: { start: Point; current: Point } | null;
  setMarqueeSelection: React.Dispatch<React.SetStateAction<{ start: Point; current: Point } | null>>;
  setTouchLoupeState: React.Dispatch<React.SetStateAction<any>>;

  // Metrics
  lsb: number;
  advanceWidth: number;
  onChangeLsb: (val: number) => void;
  onChangeAdvanceWidth: (val: number) => void;
  draggingMetric: 'lsb' | 'rsb' | null;
  setDraggingMetric: React.Dispatch<React.SetStateAction<'lsb' | 'rsb' | null>>;

  // Tool Sub-hooks
  handleBrushPointerDown: (e: React.PointerEvent<SVGSVGElement>, pos: Point) => void;
  handleBrushPointerMove: (e: React.PointerEvent<SVGSVGElement>) => boolean;
  handleBrushPointerUp: (e: React.PointerEvent<SVGSVGElement>) => boolean;
  brushStrokePointsRef: React.MutableRefObject<any[]>;
  activeBrushPathRef: React.RefObject<SVGPathElement | null>;

  handleNodePointerDownOnCanvas: (pos: Point, e: React.PointerEvent<SVGSVGElement>) => boolean;
  handleNodeDragMove: (e: React.PointerEvent<SVGSVGElement>, pos: Point) => boolean;
  handleNodeDragEnd: () => void;
  nodeDragSessionRef: React.MutableRefObject<any>;

  shapeStartPoint: Point | null;
  handleShapePointerDown: (pos: Point, e: React.PointerEvent<SVGSVGElement>) => void;
  handleShapePointerMove: (pos: Point, e: React.PointerEvent<SVGSVGElement>) => void;
  handleShapePointerUp: (e: React.PointerEvent<SVGSVGElement>) => boolean | void;
  setShapeStartPoint: (p: Point | null) => void;
  setShapeCurrentPoint: (p: Point | null) => void;

  isErasingRef: React.MutableRefObject<boolean>;
  lastErasePosRef: React.MutableRefObject<Point | null>;
  handleEraserPointerDown: (pos: Point, e: React.PointerEvent<SVGSVGElement>) => boolean | void;
  handleEraserPointerMove: (pos: Point) => void;
  handleEraserPointerUp: (e?: React.PointerEvent<SVGSVGElement>) => boolean | void;
  eraserReticleRef: React.RefObject<SVGGElement | null>;
  drawingReticleRef: React.RefObject<SVGGElement | null>;
  resetEraserVisuals: () => void;

  activePenContour: PathContour | null;
  setActivePenContour: (contour: PathContour | null) => void;
  penStrokeWidth: number;
  penCapStyle: 'round' | 'butt' | 'square';
  autoResolveBrushOverlap: boolean;
  setPenMousePos: (pos: Point | null) => void;

  handleTransformPointerMove: (pos: Point, e: React.PointerEvent<SVGSVGElement>) => boolean;
  handleTransformPointerUp: () => boolean;
  setTransformSession: (session: any) => void;

  rulerMeasurement: RulerMeasurement | null;
  handleRulerPointerDown: (pos: Point, e: React.PointerEvent<SVGSVGElement>) => void;
  handleRulerPointerMove: (pos: Point, e: React.PointerEvent<SVGSVGElement>) => void;
  handleRulerPointerUp: (e: React.PointerEvent<SVGSVGElement>) => void;

  lockGuidelines: boolean;
  draggingGuidelineId: string | null;
  setDraggingGuidelineId: (id: string | null) => void;
  updateDraggingGuideline: (pos: Point) => boolean;

  isDraggingTrace: boolean;
  isResizingTrace: boolean;
  handleTracePointerMove: (e: React.PointerEvent<SVGSVGElement>) => boolean;
  resetTraceDragState: () => void;
  traceSettings: TraceSettings;
  onChangeTraceSettings?: React.Dispatch<React.SetStateAction<TraceSettings>>;

  // Environment & Settings
  gridSettings: GridSettings;
  snapMetrics: SnapMetrics;
  customGuidelines: CustomGuideline[];
  setActiveSnapGuides: (guides: SnapGuideLine[]) => void;
  hoverCanvasPos: Point | null;
  setHoverCanvasPos: (pos: Point | null) => void;

  // History & Toasts
  onChangeContours: (contours: PathContour[]) => void;
  onCommitHistory?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  showCanvasToast: (msg: string, desc?: string) => void;
}

export function useCanvasPointerDispatcher(opts: UseCanvasPointerDispatcherOptions) {
  const {
    zoom,
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
    penMode,
    palmRejectionMode,
    setIsStylusActive,
    setLiveStylusPressure,
    contours,
    selectedContourIds,
    setSelectedContourIds,
    setSelectedContourId,
    selectedNodeId,
    setSelectedNodeId,
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
    activePenContour,
    setActivePenContour,
    setPenMousePos,
    handleTransformPointerMove,
    handleTransformPointerUp,
    setTransformSession,
    rulerMeasurement,
    handleRulerPointerDown,
    handleRulerPointerMove,
    handleRulerPointerUp,
    lockGuidelines,
    setDraggingGuidelineId,
    updateDraggingGuideline,
    handleTracePointerMove,
    resetTraceDragState,
    traceSettings,
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
  } = opts;

  // Active pointer isolation to prevent concurrent pointer collisions
  const activeDrawingPointerIdRef = useRef<number | null>(null);

  // Stylus state refs
  const isPenDrawingRef = useRef<boolean>(false);
  const lastPenActiveTimeRef = useRef<number>(0);
  const isStylusActiveRef = useRef<boolean>(false);
  const lastPressureValRef = useRef<number | null>(null);

  // Multi-touch refs
  const touchPointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pointerTypesRef = useRef<Map<number, string>>(new Map());
  const isTwoFingerGestureRef = useRef<boolean>(false);
  const activeTwoFingerIdsRef = useRef<[number, number] | null>(null);
  const twoFingerLastDistRef = useRef<number | null>(null);
  const twoFingerLastCenterRef = useRef<{ x: number; y: number } | null>(null);
  const twoFingerStartDistRef = useRef<number | null>(null);
  const twoFingerStartCenterRef = useRef<{ x: number; y: number } | null>(null);
  const twoFingerCooldownUntilRef = useRef<number>(0);

  const touchStartTimeRef = useRef<number>(0);
  const maxTouchCountRef = useRef<number>(0);
  const hasMovedSignificantRef = useRef<boolean>(false);
  const lastTapTimeRef = useRef<number>(0);

  // Trace drag refs
  const traceDragStartRef = useRef<{ clientX: number; clientY: number; initOffsetX: number; initOffsetY: number }>({
    clientX: 0,
    clientY: 0,
    initOffsetX: 0,
    initOffsetY: 0,
  });

  const handlePointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    // If an existing drawing pointer is already active, reject secondary pointerdown unless 2-finger gesture
    if (activeDrawingPointerIdRef.current !== null && activeDrawingPointerIdRef.current !== e.pointerId) {
      if (e.pointerType === 'touch' && touchPointersRef.current.size >= 1) {
        // Allow transition to 2-finger gesture below
      } else {
        return;
      }
    }

    try {
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    } catch {
      // Ignored
    }
    pointerTypesRef.current.set(e.pointerId, e.pointerType);
    touchPointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Spacebar or Middle Mouse or Hand tool = Pan canvas
    if (toolMode === 'hand' || e.button === 1 || isSpacePressed) {
      if (e.button === 1 && e.cancelable) {
        e.preventDefault();
      }
      setIsPanning(true);
      const curPan = panRef.current as { x: number; y: number };
      panStartRef.current = { x: e.clientX - curPan.x, y: e.clientY - curPan.y };
      return;
    }

    if (e.pointerType === 'mouse' && e.button !== 0) {
      return;
    }

    // Stylus / Apple Pencil detection
    const isPen = e.pointerType === 'pen';
    if (isPen) {
      isPenDrawingRef.current = true;
      lastPenActiveTimeRef.current = Date.now();
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

    // Cooldown check for touch
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

    // PALM REJECTION
    const isPenRecentlyActive = Date.now() - lastPenActiveTimeRef.current < 1500;
    const isPalmRejectionActive =
      palmRejectionMode === 'strict_pen_only' ||
      (palmRejectionMode === 'auto' && (isPenDrawingRef.current || isPenRecentlyActive));

    if (e.pointerType === 'touch' && isPalmRejectionActive && !isPenDrawingRef.current) {
      if (touchPointersRef.current.size === 1) {
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

    if (e.pointerType === 'touch' && (isPenDrawingRef.current || Date.now() - lastPenActiveTimeRef.current < 200)) {
      return;
    }

    // Multi-touch gesture (Pinch zoom & 2-Finger Pan)
    const fingerTouches = Array.from(touchPointersRef.current.entries())
      .filter(([id]) => pointerTypesRef.current.get(id) === 'touch');

    if (fingerTouches.length >= 2 && !isPenDrawingRef.current) {
      isTwoFingerGestureRef.current = true;
      activeTwoFingerIdsRef.current = [fingerTouches[0][0], fingerTouches[1][0]];
      activeDrawingPointerIdRef.current = null;

      brushStrokePointsRef.current = [];
      if (activeBrushPathRef.current) {
        activeBrushPathRef.current.setAttribute('d', '');
      }
      setShapeStartPoint(null);
      setShapeCurrentPoint(null);
      setMarqueeSelection(null);
      setDraggingMetric(null);
      setDraggingGuidelineId(null);
      resetTraceDragState();
      setTransformSession(null);
      isErasingRef.current = false;
      lastErasePosRef.current = null;

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

    // Double tap on mobile screen -> quick toggle Fit / 100%
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
      traceDragStartRef.current = {
        clientX: e.clientX,
        clientY: e.clientY,
        initOffsetX: traceSettings.offsetX || 0,
        initOffsetY: traceSettings.offsetY || 0,
      };
      return;
    }

    // RULER TOOL
    if (toolMode === 'ruler') {
      handleRulerPointerDown(pos, e);
      return;
    }

    // Set active drawing pointer for single-pointer tools
    activeDrawingPointerIdRef.current = e.pointerId;

    // Auto-clear active selection on start drawing or erasing
    const hasActiveSelection = selectedContourIds.length > 0 || (selectedNodeId !== null && !activePenContour);
    if (hasActiveSelection && isDrawingTool) {
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
        const closeThreshold = 18 / zoom;

        if (activePenContour.nodes.length >= 2 && distToStart <= closeThreshold) {
          const closedContour: PathContour = {
            ...activePenContour,
            closed: true,
          };
          onCommitHistory?.();
          onChangeContours([...contours, closedContour]);
          setActivePenContour(null);
          setSelectedContourId(closedContour.id);
          setSelectedContourIds([closedContour.id]);
          setSelectedNodeId(null);
          setSelectedHandleType(null);
          showCanvasToast('ペンパスを閉じました');
          return;
        }

        const nextNode: BezierNode = {
          id: generateId(),
          x: penPos.x,
          y: penPos.y,
          type: penMode === 'corner' ? 'corner' : 'smooth',
        };
        const updated = {
          ...activePenContour,
          nodes: [...activePenContour.nodes, nextNode],
        };
        setActivePenContour(updated);
        setSelectedNodeId(nextNode.id);
        if (penMode === 'bezier') {
          setSelectedHandleType('handleOut');
        } else {
          setSelectedHandleType(null);
        }
      }
      return;
    }

    // SHAPES TOOL
    if (isShapeTool) {
      handleShapePointerDown(pos, e);
      return;
    }

    // ERASER TOOL
    if (toolMode === 'eraser') {
      handleEraserPointerDown(pos, e);
      return;
    }

    // BRUSH TOOL
    if (toolMode === 'brush') {
      handleBrushPointerDown(e, pos);
      return;
    }

    // NODE TOOL / SELECT TOOL
    if (toolMode === 'node' || toolMode === 'select') {
      if (handleNodePointerDownOnCanvas(pos, e)) {
        return;
      }
      if (!e.shiftKey) {
        setSelectedContourIds([]);
        setSelectedContourId(null);
        setSelectedNodeId(null);
        setSelectedHandleType(null);
      }
      setMarqueeSelection({ start: pos, current: pos });
    }
  }, [
    toolMode,
    isSpacePressed,
    palmRejectionMode,
    zoom,
    screenToCanvas,
    lsb,
    advanceWidth,
    lockGuidelines,
    traceSettings.offsetX,
    traceSettings.offsetY,
    activePenContour,
    contours,
    snapMetrics,
    customGuidelines,
    gridSettings,
    penMode,
    isShapeTool,
    setIsPanning,
    panRef,
    panStartRef,
    setIsStylusActive,
    zoomRef,
    showCanvasToast,
    brushStrokePointsRef,
    activeBrushPathRef,
    setShapeStartPoint,
    setShapeCurrentPoint,
    setMarqueeSelection,
    setDraggingMetric,
    setDraggingGuidelineId,
    resetTraceDragState,
    setTransformSession,
    isErasingRef,
    lastErasePosRef,
    setActivePenContour,
    setSelectedNodeId,
    resetView,
    handleRulerPointerDown,
    setSelectedContourIds,
    setSelectedContourId,
    setSelectedHandleType,
    setActiveSnapGuides,
    onCommitHistory,
    onChangeContours,
    handleShapePointerDown,
    handleEraserPointerDown,
    handleBrushPointerDown,
    handleNodePointerDownOnCanvas,
  ]);

  const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    touchPointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Isolate active drawing pointer from secondary pointer movements
    if (activeDrawingPointerIdRef.current !== null && e.pointerId !== activeDrawingPointerIdRef.current && !isTwoFingerGestureRef.current) {
      return;
    }

    // Multi-touch gestures (Pinch-to-zoom & 2-finger Pan)
    if (isTwoFingerGestureRef.current && activeTwoFingerIdsRef.current) {
      const [id1, id2] = activeTwoFingerIdsRef.current;
      const p1 = touchPointersRef.current.get(id1);
      const p2 = touchPointersRef.current.get(id2);

      if (p1 && p2) {
        const curDist = Math.max(10, Math.hypot(p1.x - p2.x, p1.y - p2.y));
        const curCenter = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

        if (twoFingerLastDistRef.current && twoFingerLastCenterRef.current) {
          const moveDist = Math.hypot(curCenter.x - twoFingerLastCenterRef.current.x, curCenter.y - twoFingerLastCenterRef.current.y);
          if (moveDist > 6 || Math.abs(curDist - twoFingerLastDistRef.current) > 6) {
            hasMovedSignificantRef.current = true;
          }

          const scaleRatio = curDist / twoFingerLastDistRef.current;
          const nextZoom = Math.max(0.1, Math.min(32.0, zoomRef.current * scaleRatio));
          const zoomFactor = nextZoom / zoomRef.current;

          const panDeltaX = curCenter.x - twoFingerLastCenterRef.current.x;
          const panDeltaY = curCenter.y - twoFingerLastCenterRef.current.y;

          const containerRect = containerRef.current?.getBoundingClientRect();
          const mouseX = containerRect ? curCenter.x - containerRect.left : curCenter.x;
          const mouseY = containerRect ? curCenter.y - containerRect.top : curCenter.y;

          const curPan = panRef.current as { x: number; y: number };
          const nextPan = {
            x: curPan.x + panDeltaX - (mouseX - curPan.x) * (zoomFactor - 1),
            y: curPan.y + panDeltaY - (mouseY - curPan.y) * (zoomFactor - 1),
          };

          zoomRef.current = nextZoom;
          (panRef.current as { x: number; y: number }) = nextPan;
          setZoom(nextZoom);
          setPan(nextPan);
        }

        twoFingerLastDistRef.current = curDist;
        twoFingerLastCenterRef.current = curCenter;
        return;
      }
    }

    // Spacebar Pan
    if (isPanning) {
      const curPan = panRef.current as { x: number; y: number };
      const newPan = {
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      };
      (panRef.current as { x: number; y: number }) = newPan;
      setPan(newPan);
      return;
    }

    // Trace handle move
    if (handleTracePointerMove(e)) {
      return;
    }

    const pos = screenToCanvas(e.clientX, e.clientY);

    // Eraser Reticle direct DOM positioning
    if (toolMode === 'eraser' && eraserReticleRef.current) {
      if (!gridSettings.showCursorCrosshair || isSpacePressed || isPanning) {
        if (eraserReticleRef.current.style.display !== 'none') {
          eraserReticleRef.current.style.display = 'none';
        }
      } else {
        eraserReticleRef.current.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
        if (eraserReticleRef.current.style.display !== '') {
          eraserReticleRef.current.style.display = '';
        }
      }
    }

    // Drawing Reticle direct DOM positioning
    if (toolMode === 'brush' && drawingReticleRef.current) {
      if (!gridSettings.showCursorCrosshair || isSpacePressed || isPanning) {
        if (drawingReticleRef.current.style.display !== 'none') {
          drawingReticleRef.current.style.display = 'none';
        }
      } else {
        drawingReticleRef.current.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
        if (drawingReticleRef.current.style.display !== '') {
          drawingReticleRef.current.style.display = '';
        }
      }
    }

    // Update hover position
    const needsHoverPos = gridSettings.showCursorCrosshair !== false;
    if (needsHoverPos) {
      if (!hoverCanvasPos || Math.abs(hoverCanvasPos.x - pos.x) > 0.5 || Math.abs(hoverCanvasPos.y - pos.y) > 0.5) {
        setHoverCanvasPos(pos);
      }
    } else if (hoverCanvasPos !== null) {
      setHoverCanvasPos(null);
    }

    // Guideline drag
    if (updateDraggingGuideline(pos)) {
      return;
    }

    // Active Ruler drag
    if (toolMode === 'ruler' && rulerMeasurement && rulerMeasurement.active) {
      handleRulerPointerMove(pos, e);
      return;
    }

    // Metric drag
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

    // Active bounding box transform
    if (handleTransformPointerMove(pos, e)) {
      return;
    }

    // Eraser sweep
    if (toolMode === 'eraser' && isErasingRef.current) {
      handleEraserPointerMove(pos);
      return;
    }

    // Brush sweep
    if (toolMode === 'brush') {
      if (handleBrushPointerMove(e)) return;
    }

    // Shape creation
    if (isShapeTool && shapeStartPoint) {
      handleShapePointerMove(pos, e);
      return;
    }

    // Pen tool rubber-band
    if (toolMode === 'pen' && activePenContour) {
      setPenMousePos(pos);
      return;
    }

    // Node / Select drag
    if (handleNodeDragMove(e, pos)) {
      return;
    }
  }, [
    isPanning,
    handleTracePointerMove,
    screenToCanvas,
    toolMode,
    gridSettings.showCursorCrosshair,
    isSpacePressed,
    hoverCanvasPos,
    setHoverCanvasPos,
    updateDraggingGuideline,
    rulerMeasurement,
    handleRulerPointerMove,
    draggingMetric,
    onChangeLsb,
    advanceWidth,
    onChangeAdvanceWidth,
    lsb,
    marqueeSelection,
    setMarqueeSelection,
    handleTransformPointerMove,
    isErasingRef,
    handleEraserPointerMove,
    handleBrushPointerMove,
    isShapeTool,
    shapeStartPoint,
    handleShapePointerMove,
    activePenContour,
    setPenMousePos,
    handleNodeDragMove,
    panStartRef,
    panRef,
    setPan,
    zoomRef,
    setZoom,
    containerRef,
    eraserReticleRef,
    drawingReticleRef,
  ]);

  const handlePointerUp = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    setTouchLoupeState((prev: any) => (prev.visible ? { ...prev, visible: false } : prev));
    if (activeDrawingPointerIdRef.current === e.pointerId) {
      activeDrawingPointerIdRef.current = null;
    }
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

    // Multi-touch gestures (Undo on 2-finger tap, Redo on 3-finger tap)
    if (wasTouch && touchPointersRef.current.size === 0) {
      const duration = Date.now() - touchStartTimeRef.current;
      const touchCount = maxTouchCountRef.current;
      const didNotMove = !hasMovedSignificantRef.current;

      maxTouchCountRef.current = 0;
      hasMovedSignificantRef.current = false;

      if (duration < 380 && didNotMove) {
        if (touchCount === 2 && onUndo) {
          onUndo();
          isTwoFingerGestureRef.current = false;
          twoFingerCooldownUntilRef.current = Date.now() + 150;
          activeTwoFingerIdsRef.current = null;
          return;
        } else if (touchCount === 3 && onRedo) {
          onRedo();
          isTwoFingerGestureRef.current = false;
          twoFingerCooldownUntilRef.current = Date.now() + 150;
          activeTwoFingerIdsRef.current = null;
          return;
        }
      }
    }

    if (isTwoFingerGestureRef.current) {
      if (touchPointersRef.current.size === 0) {
        isTwoFingerGestureRef.current = false;
        twoFingerCooldownUntilRef.current = Date.now() + 150;
        activeTwoFingerIdsRef.current = null;
      }
      return;
    }

    if (touchPointersRef.current.size < 2) {
      twoFingerLastCenterRef.current = null;
      twoFingerLastDistRef.current = null;
      twoFingerStartDistRef.current = null;
      twoFingerStartCenterRef.current = null;
    }

    // Reset dragging states
    setIsPanning(false);
    resetTraceDragState();
    setDraggingMetric(null);
    setDraggingGuidelineId(null);
    nodeDragSessionRef.current = null;

    // Finish Ruler
    if (toolMode === 'ruler') {
      handleRulerPointerUp(e);
      return;
    }

    // Finish Transform
    if (handleTransformPointerUp()) {
      return;
    }

    // Finish Eraser
    if (toolMode === 'eraser') {
      handleEraserPointerUp(e);
      return;
    }

    // Finish Shape
    if (isShapeTool && shapeStartPoint) {
      handleShapePointerUp(e);
      return;
    }

    // Finish Brush
    if (toolMode === 'brush') {
      handleBrushPointerUp(e);
      return;
    }

    // Finish Node Drag
    handleNodeDragEnd();
  }, [
    setTouchLoupeState,
    setLiveStylusPressure,
    onUndo,
    onRedo,
    setIsPanning,
    resetTraceDragState,
    setDraggingMetric,
    setDraggingGuidelineId,
    nodeDragSessionRef,
    toolMode,
    handleRulerPointerUp,
    handleTransformPointerUp,
    handleEraserPointerUp,
    isShapeTool,
    shapeStartPoint,
    handleShapePointerUp,
    handleBrushPointerUp,
    handleNodeDragEnd,
  ]);

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    isPenDrawingRef,
    lastPenActiveTimeRef,
    touchPointersRef,
    pointerTypesRef,
    isTwoFingerGestureRef,
    twoFingerCooldownUntilRef,
  };
}
