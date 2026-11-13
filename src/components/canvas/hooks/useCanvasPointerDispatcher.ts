import React, { useRef, useCallback, useEffect } from 'react';
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
import { snapSinglePoint } from '../../../utils/snap';
import { generateId } from '../../../utils/path';
import { usePointerMetricsDrag } from './usePointerMetricsDrag';
import { usePointerTransformDispatch } from './usePointerTransformDispatch';
import { usePointerGuidelineDrag } from './usePointerGuidelineDrag';

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
  clampPan?: (p: Point, z: number) => Point;

  // Panning & Space
  isSpacePressed: boolean;
  isPanning: boolean;
  setIsPanning: React.Dispatch<React.SetStateAction<boolean>>;
  panStartRef: React.MutableRefObject<Point>;

  // Tool Modes
  toolMode: ToolMode;
  isShapeTool: boolean;
  eraserMode: 'stroke' | 'node' | 'all' | 'cut' | string;
  penMode?: 'bezier' | 'corner' | 'tangent';

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
  selectedNodeIds?: string[];
  setSelectedNodeIds?: (ids: string[]) => void;
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
  generalCrosshairRef?: React.RefObject<SVGGElement | null>;
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
  isGlyphLocked?: boolean;
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
    clampPan,
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
    selectedNodeIds,
    setSelectedNodeIds,
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
    generalCrosshairRef,
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
    draggingGuidelineId,
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
    isGlyphLocked = false,
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
  const twoFingerCachedContainerRectRef = useRef<{ left: number; top: number } | null>(null);

  // High-performance pinch RAF scheduler refs
  const pinchRafIdRef = useRef<number | null>(null);
  const pendingPinchUpdateRef = useRef<{ zoom: number; pan: Point } | null>(null);

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

  // Pen tool node handle dragging session ref & active contour ref
  const penDragHandleSessionRef = useRef<{
    startPos: Point;
    nodeId: string;
    isDraggingHandle: boolean;
  } | null>(null);

  const activePenContourRef = useRef<PathContour | null>(activePenContour);
  activePenContourRef.current = activePenContour;

  // Reset any active pointer locks and in-progress sessions when toolMode changes
  useEffect(() => {
    penDragHandleSessionRef.current = null;
    if (pinchRafIdRef.current !== null) {
      cancelAnimationFrame(pinchRafIdRef.current);
      pinchRafIdRef.current = null;
    }
    pendingPinchUpdateRef.current = null;
    twoFingerCachedContainerRectRef.current = null;
    activeDrawingPointerIdRef.current = null;
    touchPointersRef.current.clear();
    pointerTypesRef.current.clear();
    isTwoFingerGestureRef.current = false;
    activeTwoFingerIdsRef.current = null;
    isPenDrawingRef.current = false;
  }, [toolMode]);

  // Clean up any pending pinch RAF on unmount
  useEffect(() => {
    return () => {
      if (pinchRafIdRef.current !== null) {
        cancelAnimationFrame(pinchRafIdRef.current);
      }
    };
  }, []);

  const isDrawingTool = toolMode === 'brush' || toolMode === 'pen' || toolMode === 'eraser' || isShapeTool;

  // Sub-hook delegations
  const {
    handleMetricsPointerDown,
    handleMetricsPointerMove,
    handleMetricsPointerUp,
  } = usePointerMetricsDrag({
    zoom,
    lsb,
    advanceWidth,
    onChangeLsb,
    onChangeAdvanceWidth,
    draggingMetric,
    setDraggingMetric,
    lockGuidelines,
    toolMode,
    isDrawingTool,
    showCanvasToast,
  });

  const {
    dispatchTransformMove,
    dispatchTransformUp,
  } = usePointerTransformDispatch({
    handleTransformPointerMove,
    handleTransformPointerUp,
  });

  const {
    handleGuidelinePointerMove,
    handleGuidelinePointerUp,
  } = usePointerGuidelineDrag({
    draggingGuidelineId,
    setDraggingGuidelineId,
    updateDraggingGuideline,
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

      // Cache container bounding rect once at gesture start to eliminate forced reflows during pinch
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        twoFingerCachedContainerRectRef.current = { left: rect.left, top: rect.top };
      } else {
        twoFingerCachedContainerRectRef.current = null;
      }
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

    // Metrics drag detection (LSB or RSB delegated to hook)
    if (handleMetricsPointerDown(pos, e)) {
      return;
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

    // Guard drawing tools when glyph is locked
    if (isGlyphLocked && (toolMode === 'pen' || toolMode === 'brush' || toolMode === 'eraser' || isShapeTool)) {
      showCanvasToast('編集ロック中です', 'ヘッダーの鍵アイコンで解除できます');
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
      const currentContour = activePenContourRef.current;

      // Shift key for next node placement: snap to 45 degree angle relative to previous node
      if (e.shiftKey && currentContour && currentContour.nodes.length > 0) {
        const prevNode = currentContour.nodes[currentContour.nodes.length - 1];
        const dx = penPos.x - prevNode.x;
        const dy = penPos.y - prevNode.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 0) {
          const angle = Math.atan2(dy, dx);
          const snapped = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
          penPos = {
            x: Number((prevNode.x + dist * Math.cos(snapped)).toFixed(2)),
            y: Number((prevNode.y + dist * Math.sin(snapped)).toFixed(2)),
          };
        }
      } else if (!e.altKey && (gridSettings.snapToGuides !== false || gridSettings.snapToGrid)) {
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

      if (!currentContour || currentContour.nodes.length === 0) {
        const firstNode: BezierNode = {
          id: generateId(),
          x: penPos.x,
          y: penPos.y,
          type: 'corner',
        };
        const newContour: PathContour = {
          id: generateId(),
          closed: false,
          nodes: [firstNode],
        };
        activePenContourRef.current = newContour;
        setActivePenContour(newContour);
        setSelectedContourId(newContour.id);
        setSelectedNodeId(firstNode.id);
        setSelectedHandleType(null);

        penDragHandleSessionRef.current = {
          startPos: penPos,
          nodeId: firstNode.id,
          isDraggingHandle: false,
        };
        setPenMousePos(penPos);
        return;
      }

      const firstNode = currentContour.nodes[0];
      const distToStart = Math.hypot(penPos.x - firstNode.x, penPos.y - firstNode.y);
      const closeThreshold = 18 / zoom;

      if (currentContour.nodes.length >= 2 && distToStart <= closeThreshold) {
        const nodes = [...currentContour.nodes];
        const startNode = nodes[0];
        const lastIdx = nodes.length - 1;
        const lastNode = nodes[lastIdx];

        let updatedStartNode = { ...startNode };
        // Smooth handle continuity: If start node has handleOut and is smooth, derive its closing handleIn
        if (startNode.handleOut && !startNode.handleIn && (startNode.type === 'smooth' || startNode.type === 'symmetric')) {
          const hdx = startNode.handleOut.x - startNode.x;
          const hdy = startNode.handleOut.y - startNode.y;
          updatedStartNode = {
            ...startNode,
            handleIn: {
              x: Number((startNode.x - hdx).toFixed(2)),
              y: Number((startNode.y - hdy).toFixed(2)),
            },
          };
        }
        nodes[0] = updatedStartNode;

        // Also mirror closing outgoing handle on lastNode when it was pulled smooth
        if (lastIdx > 0 && lastNode.handleIn && !lastNode.handleOut && (lastNode.type === 'smooth' || lastNode.type === 'symmetric')) {
          const ldx = lastNode.x - lastNode.handleIn.x;
          const ldy = lastNode.y - lastNode.handleIn.y;
          nodes[lastIdx] = {
            ...lastNode,
            handleOut: {
              x: Number((lastNode.x + ldx).toFixed(2)),
              y: Number((lastNode.y + ldy).toFixed(2)),
            },
          };
        }

        const closedContour: PathContour = {
          ...currentContour,
          closed: true,
          nodes,
        };
        onCommitHistory?.();
        onChangeContours([...contours, closedContour]);
        activePenContourRef.current = null;
        setActivePenContour(null);
        setSelectedContourId(closedContour.id);
        setSelectedContourIds([closedContour.id]);
        setSelectedNodeId(null);
        setSelectedHandleType(null);
        penDragHandleSessionRef.current = null;
        setPenMousePos(null);
        showCanvasToast('ペンパスを閉じました（塗り輪郭）', `${closedContour.nodes.length} 頂点`);
        return;
      }

      const nextNode: BezierNode = {
        id: generateId(),
        x: penPos.x,
        y: penPos.y,
        type: 'corner',
      };
      const updatedContour = {
        ...currentContour,
        nodes: [...currentContour.nodes, nextNode],
      };
      activePenContourRef.current = updatedContour;
      setActivePenContour(updatedContour);
      setSelectedNodeId(nextNode.id);
      setSelectedHandleType(null);

      penDragHandleSessionRef.current = {
        startPos: penPos,
        nodeId: nextNode.id,
        isDraggingHandle: false,
      };
      setPenMousePos(penPos);
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
    handleMetricsPointerDown,
    handleShapePointerDown,
    handleEraserPointerDown,
    handleBrushPointerDown,
    handleNodePointerDownOnCanvas,
    isGlyphLocked,
    isDrawingTool,
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

        if (twoFingerLastDistRef.current && twoFingerLastCenterRef.current && twoFingerStartCenterRef.current && twoFingerStartDistRef.current) {
          // Detect gesture movement from start to avoid accidental undo on touch release
          const totalCenterDist = Math.hypot(curCenter.x - twoFingerStartCenterRef.current.x, curCenter.y - twoFingerStartCenterRef.current.y);
          const totalPinchDelta = Math.abs(curDist - twoFingerStartDistRef.current);
          if (totalCenterDist > 8 || totalPinchDelta > 8) {
            hasMovedSignificantRef.current = true;
          }

          const distDelta = Math.abs(curDist - twoFingerLastDistRef.current);
          const centerDelta = Math.hypot(curCenter.x - twoFingerLastCenterRef.current.x, curCenter.y - twoFingerLastCenterRef.current.y);

          // Sub-pixel jitter deadband: skip minuscule finger trembling under 0.25px
          if (distDelta > 0.25 || centerDelta > 0.25) {
            const rawScaleRatio = curDist / twoFingerLastDistRef.current;
            // Dampen scale factor to prevent erratic jumps on sudden touch drops
            const clampedScaleRatio = Math.max(0.75, Math.min(1.35, rawScaleRatio));
            const nextZoom = Math.max(0.1, Math.min(32.0, zoomRef.current * clampedScaleRatio));
            const zoomFactor = nextZoom / zoomRef.current;

            const panDeltaX = curCenter.x - twoFingerLastCenterRef.current.x;
            const panDeltaY = curCenter.y - twoFingerLastCenterRef.current.y;

            // Use cached container rect to avoid synchronous layout reflow
            let cLeft = 0;
            let cTop = 0;
            if (twoFingerCachedContainerRectRef.current) {
              cLeft = twoFingerCachedContainerRectRef.current.left;
              cTop = twoFingerCachedContainerRectRef.current.top;
            } else if (containerRef.current) {
              const rect = containerRef.current.getBoundingClientRect();
              twoFingerCachedContainerRectRef.current = { left: rect.left, top: rect.top };
              cLeft = rect.left;
              cTop = rect.top;
            }

            const mouseX = curCenter.x - cLeft;
            const mouseY = curCenter.y - cTop;

            const curPan = panRef.current as { x: number; y: number };
            let nextPan = {
              x: curPan.x + panDeltaX - (mouseX - curPan.x) * (zoomFactor - 1),
              y: curPan.y + panDeltaY - (mouseY - curPan.y) * (zoomFactor - 1),
            };

            if (clampPan) {
              nextPan = clampPan(nextPan, nextZoom);
            }

            // Immediately update refs so successive pointermove events read correct state
            zoomRef.current = nextZoom;
            (panRef.current as { x: number; y: number }) = nextPan;

            // Batch React state updates into requestAnimationFrame for ultra-smooth rendering
            pendingPinchUpdateRef.current = { zoom: nextZoom, pan: nextPan };
            if (pinchRafIdRef.current === null) {
              pinchRafIdRef.current = requestAnimationFrame(() => {
                if (pendingPinchUpdateRef.current) {
                  setZoom(pendingPinchUpdateRef.current.zoom);
                  setPan(pendingPinchUpdateRef.current.pan);
                  pendingPinchUpdateRef.current = null;
                }
                pinchRafIdRef.current = null;
              });
            }

            twoFingerLastDistRef.current = curDist;
            twoFingerLastCenterRef.current = curCenter;
          }
        } else {
          twoFingerLastDistRef.current = curDist;
          twoFingerLastCenterRef.current = curCenter;
        }

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

    // General Crosshair direct DOM positioning (0ms latency, zero drift)
    if (generalCrosshairRef?.current) {
      if (!gridSettings.showCursorCrosshair || isSpacePressed || isPanning || toolMode === 'brush' || toolMode === 'eraser') {
        if (generalCrosshairRef.current.style.display !== 'none') {
          generalCrosshairRef.current.style.display = 'none';
        }
      } else {
        generalCrosshairRef.current.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
        if (generalCrosshairRef.current.style.display !== '') {
          generalCrosshairRef.current.style.display = '';
        }
      }
    }

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
      if (!hoverCanvasPos || Math.abs(hoverCanvasPos.x - pos.x) > 0.05 || Math.abs(hoverCanvasPos.y - pos.y) > 0.05) {
        setHoverCanvasPos(pos);
      }
    } else if (hoverCanvasPos !== null) {
      setHoverCanvasPos(null);
    }

    // Guideline drag (delegated to hook)
    if (handleGuidelinePointerMove(pos)) {
      return;
    }

    // Active Ruler drag
    if (toolMode === 'ruler' && rulerMeasurement && rulerMeasurement.active) {
      handleRulerPointerMove(pos, e);
      return;
    }

    // Metric drag (delegated to hook)
    if (handleMetricsPointerMove(pos)) {
      return;
    }

    // Marquee rectangular drag selection
    if (marqueeSelection) {
      setMarqueeSelection((prev) => (prev ? { ...prev, current: pos } : null));
      return;
    }

    // Active bounding box transform (delegated to hook)
    if (dispatchTransformMove(pos, e)) {
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

    // Pen tool handle drag & rubber-band
    if (toolMode === 'pen') {
      const currentContour = activePenContourRef.current;
      const session = penDragHandleSessionRef.current;

      if (session && currentContour) {
        if (penMode === 'corner') {
          setPenMousePos(pos);
          return;
        }
        let dx = pos.x - session.startPos.x;
        let dy = pos.y - session.startPos.y;
        const dist = Math.hypot(dx, dy);

        // 3px drag threshold in screen pixels (3 / zoom)
        const threshold = 3 / zoom;
        if (dist >= threshold) {
          session.isDraggingHandle = true;

          // Shift key: 45° angle snapping for handle pull
          if (e.shiftKey) {
            const angle = Math.atan2(dy, dx);
            const snappedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
            dx = dist * Math.cos(snappedAngle);
            dy = dist * Math.sin(snappedAngle);
          }

          // Drag direction defines handleOut
          const handleOut: Point = {
            x: Number((session.startPos.x + dx).toFixed(2)),
            y: Number((session.startPos.y + dy).toFixed(2)),
          };

          // Opposite direction defines handleIn (unless Alt key is pressed)
          const isAlt = e.altKey;
          const handleIn: Point | null = isAlt
            ? null
            : {
                x: Number((session.startPos.x - dx).toFixed(2)),
                y: Number((session.startPos.y - dy).toFixed(2)),
              };

          const updatedNodes = currentContour.nodes.map((node) => {
            if (node.id !== session.nodeId) return node;
            return {
              ...node,
              type: isAlt ? ('corner' as const) : ('smooth' as const),
              handleOut,
              handleIn: isAlt ? (node.handleIn ?? null) : handleIn,
            };
          });

          const updatedContour = {
            ...currentContour,
            nodes: updatedNodes,
          };
          activePenContourRef.current = updatedContour;
          setActivePenContour(updatedContour);
          setSelectedHandleType('handleOut');
        }

        setPenMousePos(pos);
        return;
      }

      if (currentContour) {
        setPenMousePos(pos);
        return;
      }
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
    handleGuidelinePointerMove,
    rulerMeasurement,
    handleRulerPointerMove,
    handleMetricsPointerMove,
    marqueeSelection,
    setMarqueeSelection,
    dispatchTransformMove,
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
    clampPan,
    eraserReticleRef,
    drawingReticleRef,
    generalCrosshairRef,
    penMode,
    zoom,
    setActivePenContour,
    setSelectedHandleType,
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
    if (touchPointersRef.current.size === 0) {
      activeDrawingPointerIdRef.current = null;
    }

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

    // Flush pending pinch updates when fingers are lifted
    if (pinchRafIdRef.current !== null) {
      cancelAnimationFrame(pinchRafIdRef.current);
      pinchRafIdRef.current = null;
    }
    if (pendingPinchUpdateRef.current) {
      setZoom(pendingPinchUpdateRef.current.zoom);
      setPan(pendingPinchUpdateRef.current.pan);
      pendingPinchUpdateRef.current = null;
    }

    if (isTwoFingerGestureRef.current) {
      if (touchPointersRef.current.size === 0) {
        isTwoFingerGestureRef.current = false;
        twoFingerCooldownUntilRef.current = Date.now() + 150;
        activeTwoFingerIdsRef.current = null;
        twoFingerCachedContainerRectRef.current = null;
      }
      return;
    }

    if (touchPointersRef.current.size < 2) {
      twoFingerLastCenterRef.current = null;
      twoFingerLastDistRef.current = null;
      twoFingerStartDistRef.current = null;
      twoFingerStartCenterRef.current = null;
      twoFingerCachedContainerRectRef.current = null;
    }

    // Reset dragging states
    setIsPanning(false);
    resetTraceDragState();
    handleMetricsPointerUp();
    handleGuidelinePointerUp();
    nodeDragSessionRef.current = null;

    // Resolve Marquee Selection on release
    if (marqueeSelection) {
      const minX = Math.min(marqueeSelection.start.x, marqueeSelection.current.x);
      const maxX = Math.max(marqueeSelection.start.x, marqueeSelection.current.x);
      const minY = Math.min(marqueeSelection.start.y, marqueeSelection.current.y);
      const maxY = Math.max(marqueeSelection.start.y, marqueeSelection.current.y);
      const boxW = maxX - minX;
      const boxH = maxY - minY;

      if (boxW > 4 || boxH > 4) {
        if (toolMode === 'node') {
          const capturedNodeIds: string[] = [];
          const capturedContourIds: string[] = [];
          for (const contour of contours) {
            let hasNode = false;
            for (const node of contour.nodes) {
              if (node.x >= minX && node.x <= maxX && node.y >= minY && node.y <= maxY) {
                capturedNodeIds.push(node.id);
                hasNode = true;
              }
            }
            if (hasNode) {
              capturedContourIds.push(contour.id);
            }
          }

          if (capturedNodeIds.length > 0) {
            const nextNodeIds = e.shiftKey
              ? Array.from(new Set([...(selectedNodeIds || []), ...capturedNodeIds]))
              : capturedNodeIds;
            const nextContourIds = e.shiftKey
              ? Array.from(new Set([...selectedContourIds, ...capturedContourIds]))
              : capturedContourIds;

            setSelectedNodeIds?.(nextNodeIds);
            setSelectedContourIds(nextContourIds);
            if (nextContourIds.length > 0) {
              setSelectedContourId(nextContourIds[0]);
            }
            showCanvasToast(`${capturedNodeIds.length} 個の頂点を囲み選択しました`);
          }
        } else if (toolMode === 'select') {
          const capturedContourIds: string[] = [];
          for (const contour of contours) {
            if (contour.nodes.length === 0) continue;
            let cMinX = Infinity, cMaxX = -Infinity, cMinY = Infinity, cMaxY = -Infinity;
            for (const node of contour.nodes) {
              if (node.x < cMinX) cMinX = node.x;
              if (node.x > cMaxX) cMaxX = node.x;
              if (node.y < cMinY) cMinY = node.y;
              if (node.y > cMaxY) cMaxY = node.y;
            }
            const intersects = !(cMaxX < minX || cMinX > maxX || cMaxY < minY || cMinY > maxY);
            if (intersects) {
              capturedContourIds.push(contour.id);
            }
          }

          if (capturedContourIds.length > 0) {
            const nextContourIds = e.shiftKey
              ? Array.from(new Set([...selectedContourIds, ...capturedContourIds]))
              : capturedContourIds;
            setSelectedContourIds(nextContourIds);
            setSelectedContourId(nextContourIds[0]);
            showCanvasToast(`${capturedContourIds.length} 個の輪郭を囲み選択しました`);
          }
        }
      }
      setMarqueeSelection(null);
    }

    // Finish Pen Tool Drag/Click determination
    if (toolMode === 'pen' && penDragHandleSessionRef.current) {
      const session = penDragHandleSessionRef.current;
      const currentContour = activePenContourRef.current;
      if (currentContour) {
        if (penMode === 'corner' || !session.isDraggingHandle) {
          // Corner mode or single click (< 3px movement): Sharp corner vertex with no handles (linear segment)
          const updatedNodes = currentContour.nodes.map((node) => {
            if (node.id !== session.nodeId) return node;
            return {
              ...node,
              type: 'corner' as const,
              handleIn: null,
              handleOut: null,
            };
          });
          const updatedContour = { ...currentContour, nodes: updatedNodes };
          activePenContourRef.current = updatedContour;
          setActivePenContour(updatedContour);
        } else {
          // Dragged (>= 3px): Smooth cubic curve with symmetric handles (or corner if Alt pressed)
          const isAlt = e.altKey;
          const updatedNodes = currentContour.nodes.map((node) => {
            if (node.id !== session.nodeId) return node;
            return {
              ...node,
              type: isAlt ? ('corner' as const) : ('smooth' as const),
            };
          });
          const updatedContour = { ...currentContour, nodes: updatedNodes };
          activePenContourRef.current = updatedContour;
          setActivePenContour(updatedContour);
        }
      }
      penDragHandleSessionRef.current = null;
    } else {
      penDragHandleSessionRef.current = null;
    }

    // Finish Ruler
    if (toolMode === 'ruler') {
      handleRulerPointerUp(e);
      return;
    }

    // Finish Transform (delegated to hook)
    if (dispatchTransformUp()) {
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
    handleMetricsPointerUp,
    handleGuidelinePointerUp,
    nodeDragSessionRef,
    toolMode,
    handleRulerPointerUp,
    dispatchTransformUp,
    handleEraserPointerUp,
    isShapeTool,
    shapeStartPoint,
    handleShapePointerUp,
    handleBrushPointerUp,
    handleNodeDragEnd,
    setActivePenContour,
    penMode,
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
    activeDrawingPointerIdRef,
  };
}
