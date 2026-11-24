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
import { computePinchTransform } from './viewportMath';
import { setHoverCanvasPos, getHoverCanvasPos } from '../hoverStore';
import { setLiveViewport } from '../viewportStore';

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
  canvasGroupRef?: React.RefObject<SVGGElement | null>;
  getContainerRectFast?: () => { left: number; top: number; width: number; height: number } | null;
  invalidateContainerRect?: () => void;
  upm?: number;
  clampPan?: (p: Point, z: number) => Point;

  // Panning & Space
  isSpacePressed: boolean;
  isPanning: boolean;
  setIsPanning: React.Dispatch<React.SetStateAction<boolean>>;
  panStartRef: React.MutableRefObject<Point>;

  // Tool Modes
  toolMode: ToolMode;
  isShapeTool: boolean;
  eraserMode: 'stroke' | 'node' | 'cut' | string;
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
  onChangeLsb: (val: number, options?: { skipHistory?: boolean }) => void;
  onChangeAdvanceWidth: (val: number, options?: { skipHistory?: boolean }) => void;
  draggingMetric: 'lsb' | 'rsb' | null;
  setDraggingMetric: React.Dispatch<React.SetStateAction<'lsb' | 'rsb' | null>>;

  // Tool Sub-hooks
  handleBrushPointerDown: (e: React.PointerEvent<SVGSVGElement>, pos: Point) => void;
  handleBrushPointerMove: (e: React.PointerEvent<SVGSVGElement>) => boolean;
  handleBrushPointerUp: (e: React.PointerEvent<SVGSVGElement>) => boolean;
  resetBrushDrawing?: () => void;
  brushStrokePointsRef: React.MutableRefObject<any[]>;
  activeBrushPathRef: React.RefObject<SVGPathElement | null>;

  handleNodePointerDownOnCanvas: (pos: Point, e: React.PointerEvent<SVGSVGElement>) => boolean;
  handleNodeDragMove: (e: React.PointerEvent<SVGSVGElement>, pos: Point) => boolean;
  handleNodeDragEnd: () => void;
  // H6: cancels an in-progress node drag and restores the pre-drag
  // contour. Used by handlePointerCancel instead of just dropping the
  // session ref. Optional: falls back to dropping the session ref.
  handleNodeDragCancel?: () => boolean | void;
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
  handleEraserPointerCancel?: (e?: React.PointerEvent<SVGSVGElement>) => boolean | void;
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
  // A2: cancels the transform session and clears pendingTransformContoursRef.
  // Optional: when not wired, the dispatcher falls back to setTransformSession(null).
  cancelTransformSession?: () => void;

  rulerMeasurement?: RulerMeasurement | null;
  handleRulerPointerDown: (pos: Point, e: React.PointerEvent<SVGSVGElement>) => void;
  handleRulerPointerMove: (pos: Point, e: React.PointerEvent<SVGSVGElement>) => boolean | void;
  handleRulerPointerUp: (e: React.PointerEvent<SVGSVGElement>) => void;

  lockGuidelines: boolean;
  draggingGuidelineId: string | null;
  setDraggingGuidelineId: (id: string | null) => void;
  updateDraggingGuideline: (pos: Point) => boolean;

  isDraggingTrace: boolean;
  isResizingTrace: boolean;
  handleTracePointerMove: (e: React.PointerEvent<SVGSVGElement>) => boolean;
  // Starts a trace drag from anywhere on the canvas in trace_adjust mode,
  // including outside the underdrawing frame.
  handleTraceAdjustPointerDown?: (e: React.PointerEvent<SVGSVGElement>) => void;
  resetTraceDragState: () => void;
  traceSettings: TraceSettings;
  onChangeTraceSettings?: React.Dispatch<React.SetStateAction<TraceSettings>>;

  // Environment & Settings
  gridSettings: GridSettings;
  snapMetrics: SnapMetrics;
  customGuidelines: CustomGuideline[];
  setActiveSnapGuides: (guides: SnapGuideLine[]) => void;

  // History & Toasts
  onChangeContours: (contours: PathContour[], options?: { skipHistory?: boolean }) => void;
  onCommitHistory?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  showCanvasToast: (msg: string, desc?: string) => void;
  isGlyphLocked?: boolean;
  // C3: while the canvas context menu is open, pointerdown only closes the
  // menu instead of starting a draw or selection action.
  isContextMenuOpen?: boolean;
  onCloseContextMenu?: () => void;
}

export function useCanvasPointerDispatcher(opts: UseCanvasPointerDispatcherOptions) {
  const {
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
    upm = 1000,
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
    resetBrushDrawing,
    brushStrokePointsRef,
    activeBrushPathRef,
    handleNodePointerDownOnCanvas,
    handleNodeDragMove,
    handleNodeDragEnd,
    handleNodeDragCancel,
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
    setPenMousePos,
    handleTransformPointerMove,
    handleTransformPointerUp,
    setTransformSession,
    cancelTransformSession,
    handleRulerPointerDown,
    handleRulerPointerMove,
    handleRulerPointerUp,
    lockGuidelines,
    draggingGuidelineId,
    setDraggingGuidelineId,
    updateDraggingGuideline,
    handleTracePointerMove,
    handleTraceAdjustPointerDown,
    resetTraceDragState,
    gridSettings,
    snapMetrics,
    customGuidelines,
    setActiveSnapGuides,
    onChangeContours,
    onCommitHistory,
    onUndo,
    onRedo,
    showCanvasToast,
    isGlyphLocked = false,
    isContextMenuOpen = false,
    onCloseContextMenu,
  } = opts;

  // Active pointer isolation to prevent concurrent pointer collisions
  const activeDrawingPointerIdRef = useRef<number | null>(null);
  const activePanPointerIdRef = useRef<number | null>(null);

  // Stylus state refs
  const isPenDrawingRef = useRef<boolean>(false);
  const lastPenActiveTimeRef = useRef<number>(0);
  const isStylusActiveRef = useRef<boolean>(false);
  const lastPressureValRef = useRef<number | null>(null);
  // Live pressure display during pointermove, throttled with rAF so the
  // status bar updates at most once per frame instead of per event.
  const pressureRafIdRef = useRef<number | null>(null);
  const pendingPressureValRef = useRef<number | null>(null);
  const updateLivePressureThrottled = useCallback((val: number) => {
    lastPressureValRef.current = val;
    pendingPressureValRef.current = val;
    if (pressureRafIdRef.current === null) {
      pressureRafIdRef.current = requestAnimationFrame(() => {
        pressureRafIdRef.current = null;
        if (pendingPressureValRef.current !== null) {
          setLiveStylusPressure(pendingPressureValRef.current);
        }
      });
    }
  }, [setLiveStylusPressure]);

  // Throttled hover position mirror and rAF cancellation helper.
  // Hover lives in the external hoverStore now (not in GlyphCanvas state),
  // so writing it here does not re-render the canvas or the stage.
  const hoverCanvasPosRef = useRef<Point | null>(getHoverCanvasPos());
  const hoverRafIdRef = useRef<number | null>(null);
  const pendingHoverPosRef = useRef<Point | null>(null);
  const clearHoverPos = useCallback(() => {
    if (hoverRafIdRef.current !== null) {
      cancelAnimationFrame(hoverRafIdRef.current);
      hoverRafIdRef.current = null;
    }
    pendingHoverPosRef.current = null;
    hoverCanvasPosRef.current = null;
    setHoverCanvasPos(null);
  }, []);

  // L12: throttled hover update (0.5 canvas units threshold + rAF).
  // Kept as a helper so handlePointerMove can update hover before the
  // pan / pinch / trace early returns below; previously hover froze
  // during those gestures because the update sat behind them.
  const updateHoverPos = useCallback((pos: Point) => {
    const currentHover = pendingHoverPosRef.current ?? hoverCanvasPosRef.current;
    if (!currentHover || Math.abs(currentHover.x - pos.x) > 0.5 || Math.abs(currentHover.y - pos.y) > 0.5) {
      pendingHoverPosRef.current = pos;
      if (hoverRafIdRef.current === null) {
        hoverRafIdRef.current = requestAnimationFrame(() => {
          hoverRafIdRef.current = null;
          hoverCanvasPosRef.current = pendingHoverPosRef.current;
          setHoverCanvasPos(pendingHoverPosRef.current);
        });
      }
    }
  }, []);

  // Synchronous mirrors for panning & marquee selection so rapid single-frame sequences never miss updates
  const isPanningRef = useRef<boolean>(isPanning);
  isPanningRef.current = isPanning;
  const marqueeSelectionRef = useRef<{ start: Point; current: Point } | null>(marqueeSelection);
  marqueeSelectionRef.current = marqueeSelection;

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
  const twoFingerCachedContainerRectRef = useRef<{ left: number; top: number; width: number; height: number } | null>(null);

  // High-performance pinch RAF scheduler refs
  const pinchRafIdRef = useRef<number | null>(null);
  const pendingPinchUpdateRef = useRef<{ zoom: number; pan: Point } | null>(null);

  const setSvgGesturing = useCallback((active: boolean) => {
    const svgEl = canvasGroupRef?.current?.ownerSVGElement;
    if (!svgEl) return;
    if (active) {
      if (svgEl.getAttribute('data-gesturing') !== 'true') {
        svgEl.setAttribute('data-gesturing', 'true');
      }
    } else {
      svgEl.removeAttribute('data-gesturing');
    }
  }, [canvasGroupRef]);

  const touchStartTimeRef = useRef<number>(0);
  const maxTouchCountRef = useRef<number>(0);
  const hasMovedSignificantRef = useRef<boolean>(false);
  const lastTapTimeRef = useRef<number>(0);
  // A3: set when a pinch starts. A pinch starts when the 2nd finger arrives
  // well after the 1st finger was already down, or when the fingers move
  // during the gesture. While set, tap Undo/Redo does not fire.
  const pinchStartedRef = useRef<boolean>(false);
  // A9: last time the palm-rejection toast was shown, for throttling.
  const lastPalmToastTimeRef = useRef<number>(0);

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
    setSvgGesturing(false);
    twoFingerCachedContainerRectRef.current = null;
    activeDrawingPointerIdRef.current = null;
    activePanPointerIdRef.current = null;
    touchPointersRef.current.clear();
    pointerTypesRef.current.clear();
    isTwoFingerGestureRef.current = false;
    pinchStartedRef.current = false;
    activeTwoFingerIdsRef.current = null;
    isPenDrawingRef.current = false;
  }, [toolMode, setSvgGesturing]);

  // Clean up any pending RAFs on unmount
  useEffect(() => {
    return () => {
      if (pinchRafIdRef.current !== null) {
        cancelAnimationFrame(pinchRafIdRef.current);
        pinchRafIdRef.current = null;
      }
      if (pressureRafIdRef.current !== null) {
        cancelAnimationFrame(pressureRafIdRef.current);
        pressureRafIdRef.current = null;
      }
      if (hoverRafIdRef.current !== null) {
        cancelAnimationFrame(hoverRafIdRef.current);
        hoverRafIdRef.current = null;
      }
      setSvgGesturing(false);
    };
  }, [setSvgGesturing]);

  const isDrawingTool = toolMode === 'brush' || toolMode === 'pen' || toolMode === 'eraser' || isShapeTool;

  // Sub-hook delegations
  const {
    handleMetricsPointerDown,
    handleMetricsPointerMove,
    handleMetricsPointerUp,
  } = usePointerMetricsDrag({
    zoom: opts.zoom,
    lsb,
    advanceWidth,
    onChangeLsb,
    onChangeAdvanceWidth,
    onCommitHistory,
    draggingMetric,
    setDraggingMetric,
    lockGuidelines,
    toolMode,
    isDrawingTool,
    upm: opts.upm,
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
    // C3: pointerdown fires before mousedown, so a left click meant to close
    // the context menu would otherwise start drawing or selecting first.
    // While the menu is open, pointerdown only closes the menu.
    if (isContextMenuOpen) {
      onCloseContextMenu?.();
      return;
    }

    // If an existing drawing pointer is already active, reject secondary pointerdown unless 2-finger gesture
    if (activeDrawingPointerIdRef.current !== null && activeDrawingPointerIdRef.current !== e.pointerId) {
      if (e.pointerType === 'touch' && touchPointersRef.current.size >= 1) {
        // Allow transition to 2-finger gesture below
      } else {
        return;
      }
    }

    if (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 1) {
      return;
    }

    // Cooldown & active-pen guards for touch before capturing or tracking
    if (e.pointerType === 'touch' && twoFingerCooldownUntilRef.current > Date.now()) {
      return;
    }
    if (e.pointerType === 'touch' && (isPenDrawingRef.current || Date.now() - lastPenActiveTimeRef.current < 200)) {
      return;
    }

    if (touchPointersRef.current.size === 0) {
      invalidateContainerRect?.();
    }

    // Spacebar or Middle Mouse or Hand tool = Pan canvas
    if (toolMode === 'hand' || e.button === 1 || isSpacePressed) {
      if (
        isPanningRef.current &&
        activePanPointerIdRef.current !== null &&
        activePanPointerIdRef.current !== e.pointerId
      ) {
        return;
      }
      if (e.button === 1 && e.cancelable) {
        e.preventDefault();
      }
      try {
        (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
      } catch {
        // Ignored
      }
      activePanPointerIdRef.current = e.pointerId;
      isPanningRef.current = true;
      setIsPanning(true);
      const curPan = panRef.current as { x: number; y: number };
      panStartRef.current = { x: e.clientX - curPan.x, y: e.clientY - curPan.y };
      return;
    }

    if (e.pointerType === 'mouse' && e.button !== 0) {
      return;
    }

    pointerTypesRef.current.set(e.pointerId, e.pointerType);
    if (e.pointerType === 'touch') {
      touchPointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
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
          touchPointersRef.current.delete(e.pointerId);
          pointerTypesRef.current.delete(e.pointerId);
          // A9: show the palm-rejection toast at most once per 5 seconds.
          const palmToastNow = Date.now();
          if (palmToastNow - lastPalmToastTimeRef.current >= 5000) {
            lastPalmToastTimeRef.current = palmToastNow;
            showCanvasToast('パームリジェクション', 'ペン先以外の接触を自動ブロック中');
          }
          return;
        }
      }
    }

    try {
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    } catch {
      // Ignored
    }

    // Multi-touch gesture (Pinch zoom & 2-Finger Pan)
    const fingerTouches = Array.from(touchPointersRef.current.entries())
      .filter(([id]) => pointerTypesRef.current.get(id) === 'touch');

    if (fingerTouches.length >= 2 && !isPenDrawingRef.current) {
      isTwoFingerGestureRef.current = true;
      activeTwoFingerIdsRef.current = [fingerTouches[0][0], fingerTouches[1][0]];
      activeDrawingPointerIdRef.current = null;

      // A3: the 2nd finger arriving well after the 1st finger was already
      // down means a pinch started, not a simultaneous 2/3-finger tap.
      // After a pinch starts, tap Undo/Redo is disabled.
      if (Date.now() - touchStartTimeRef.current > 150) {
        pinchStartedRef.current = true;
      }

      // A2: end any in-progress node drag so its session does not survive
      // the gesture. handleNodeDragEnd flushes pending contours first.
      if (nodeDragSessionRef.current) {
        handleNodeDragEnd();
        nodeDragSessionRef.current = null;
      }

      setTouchLoupeState((prev: any) => (prev.visible ? { ...prev, visible: false } : prev));
      // A4: when the brush is mid-stroke, finalize the stroke instead of
      // discarding it, then start the pinch.
      if (toolMode === 'brush' && brushStrokePointsRef.current.length > 0) {
        handleBrushPointerUp(e);
      } else {
        resetBrushDrawing?.();
      }
      brushStrokePointsRef.current = [];
      if (activeBrushPathRef.current) {
        activeBrushPathRef.current.setAttribute('d', '');
      }
      // M9: pinch interruption used to finalize some tools and silently
      // discard others (transform reverted, shape vanished). Unify on
      // finalize: a shape in progress is committed, like the brush
      // stroke and node drag above.
      if (shapeStartPoint) {
        handleShapePointerUp(e);
      } else {
        setShapeStartPoint(null);
        setShapeCurrentPoint(null);
      }
      marqueeSelectionRef.current = null;
      setMarqueeSelection(null);
      setDraggingMetric(null);
      setDraggingGuidelineId(null);
      resetTraceDragState();
      // Commit an in-progress transform instead of cancelling it. Only
      // fall back to cancel when there is nothing to commit, so
      // pendingTransformContoursRef is still cleared.
      if (!dispatchTransformUp()) {
        if (cancelTransformSession) {
          cancelTransformSession();
        } else {
          setTransformSession(null);
        }
      }
      // Same for the eraser: a cut stroke in progress is committed; a
      // stroke-mode sweep already applied incrementally.
      if (isErasingRef.current) {
        handleEraserPointerUp(e);
      } else {
        lastErasePosRef.current = null;
      }

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
      const fastRect = getContainerRectFast?.();
      if (fastRect) {
        twoFingerCachedContainerRectRef.current = {
          left: fastRect.left,
          top: fastRect.top,
          width: fastRect.width,
          height: fastRect.height,
        };
      } else if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        twoFingerCachedContainerRectRef.current = {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        };
      } else {
        twoFingerCachedContainerRectRef.current = null;
      }
      return;
    }

    // Double tap on mobile screen -> quick toggle Fit / 100%
    if (e.pointerType === 'touch' && (toolMode === 'select' || (toolMode as string) === 'hand')) {
      const now = Date.now();
      if (now - lastTapTimeRef.current < 300 && touchPointersRef.current.size === 1) {
        if (Math.abs(zoomRef.current - 1.0) < 0.08) {
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

    // TRACE ADJUST DRAG: start dragging from anywhere on the canvas,
    // inside or outside the underdrawing frame. Pointer moves are handled
    // by handleTracePointerMove in handlePointerMove.
    if (toolMode === 'trace_adjust') {
      handleTraceAdjustPointerDown?.(e);
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
          Math.max(7, Math.round(12 / zoomRef.current)),
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
        hoverCanvasPosRef.current = penPos;
        pendingHoverPosRef.current = penPos;
        setHoverCanvasPos(penPos);
        return;
      }

      const firstNode = currentContour.nodes[0];
      const distToStart = Math.hypot(penPos.x - firstNode.x, penPos.y - firstNode.y);
      const closeThreshold = 18 / zoomRef.current;

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
        const baseContours = opts.contoursRef.current || contours;
        const nextContours = [...baseContours, closedContour];
        onCommitHistory?.();
        opts.contoursRef.current = nextContours;
        onChangeContours(nextContours, { skipHistory: true });
        activePenContourRef.current = null;
        setActivePenContour(null);
        setSelectedContourId(closedContour.id);
        setSelectedContourIds([closedContour.id]);
        setSelectedNodeId(null);
        setSelectedHandleType(null);
        setActiveSnapGuides([]);
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
      hoverCanvasPosRef.current = penPos;
      pendingHoverPosRef.current = penPos;
      setHoverCanvasPos(penPos);
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
      if (nodeDragSessionRef.current) {
        return;
      }
      if (handleNodePointerDownOnCanvas(pos, e)) {
        return;
      }
      if (!e.shiftKey) {
        setSelectedContourIds([]);
        setSelectedContourId(null);
        setSelectedNodeId(null);
        setSelectedHandleType(null);
      }
      const nextMarquee = { start: pos, current: pos };
      marqueeSelectionRef.current = nextMarquee;
      setMarqueeSelection(nextMarquee);
    }
  }, [
    toolMode,
    isSpacePressed,
    palmRejectionMode,
    screenToCanvas,
    lsb,
    advanceWidth,
    lockGuidelines,
    handleTraceAdjustPointerDown,
    activePenContour,
    contours,
    snapMetrics,
    customGuidelines,
    gridSettings,
    penMode,
    isShapeTool,
    selectedContourIds,
    selectedNodeId,
    nodeDragSessionRef,
    setIsPanning,
    panRef,
    panStartRef,
    setIsStylusActive,
    zoomRef,
    showCanvasToast,
    resetBrushDrawing,
    brushStrokePointsRef,
    activeBrushPathRef,
    setShapeStartPoint,
    setShapeCurrentPoint,
    setMarqueeSelection,
    setDraggingMetric,
    setDraggingGuidelineId,
    resetTraceDragState,
    setTransformSession,
    cancelTransformSession,
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
    opts.contoursRef,
    handleMetricsPointerDown,
    handleShapePointerDown,
    handleShapePointerUp,
    handleEraserPointerDown,
    handleEraserPointerUp,
    handleBrushPointerDown,
    handleBrushPointerUp,
    handleNodePointerDownOnCanvas,
    handleNodeDragEnd,
    dispatchTransformUp,
    isGlyphLocked,
    isDrawingTool,
    isContextMenuOpen,
    onCloseContextMenu,
    invalidateContainerRect,
    getContainerRectFast,
    containerRef,
  ]);

  const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (e.pointerType === 'touch' && touchPointersRef.current.has(e.pointerId)) {
      touchPointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    // Isolate active drawing pointer from secondary pointer movements
    if (activeDrawingPointerIdRef.current !== null && e.pointerId !== activeDrawingPointerIdRef.current && !isTwoFingerGestureRef.current) {
      return;
    }

    // Live stylus pressure display: update during pointermove as well, not
    // only on pointerdown / pointerup. Throttled to one update per frame.
    if (e.pointerType === 'pen' && e.pressure > 0) {
      updateLivePressureThrottled(Math.round(e.pressure * 100));
    }

    // L12: update hover before the pan / pinch / trace early returns
    // below, so rulers and status-bar coordinates keep tracking.
    updateHoverPos(screenToCanvas(e.clientX, e.clientY));

    // Multi-touch gestures (Pinch-to-zoom & 2-finger Pan)
    if (isTwoFingerGestureRef.current) {
      if (activeTwoFingerIdsRef.current) {
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
              // A3: any pinch movement means this is a pinch, not a tap.
              pinchStartedRef.current = true;
              // Use cached container rect to avoid synchronous layout reflow
              let cachedRect = twoFingerCachedContainerRectRef.current;
              if (!cachedRect) {
                const fastRect = getContainerRectFast?.();
                if (fastRect) {
                  cachedRect = {
                    left: fastRect.left,
                    top: fastRect.top,
                    width: fastRect.width,
                    height: fastRect.height,
                  };
                } else if (containerRef.current) {
                  const rect = containerRef.current.getBoundingClientRect();
                  cachedRect = {
                    left: rect.left,
                    top: rect.top,
                    width: rect.width,
                    height: rect.height,
                  };
                } else {
                  cachedRect = { left: 0, top: 0, width: 0, height: 0 };
                }
                twoFingerCachedContainerRectRef.current = cachedRect;
              }

              const curPan = panRef.current as { x: number; y: number };
              const transformed = computePinchTransform({
                currentZoom: zoomRef.current,
                currentPan: curPan,
                prevDist: twoFingerLastDistRef.current,
                curDist,
                prevCenter: twoFingerLastCenterRef.current,
                curCenter,
                containerLeft: cachedRect.left,
                containerTop: cachedRect.top,
                upm,
                viewportWidth: cachedRect.width,
                viewportHeight: cachedRect.height,
              });

              // Immediately update refs so successive pointermove events read exact state
              zoomRef.current = transformed.zoom;
              (panRef.current as { x: number; y: number }) = transformed.pan;

              // Batch direct SVG DOM transform updates in requestAnimationFrame with zero React re-renders during pinch
              pendingPinchUpdateRef.current = transformed;
              if (pinchRafIdRef.current === null) {
                pinchRafIdRef.current = requestAnimationFrame(() => {
                  pinchRafIdRef.current = null;
                  const pending = pendingPinchUpdateRef.current;
                  if (!pending) return;
                  pendingPinchUpdateRef.current = null;
                  setLiveViewport(pending.zoom, pending.pan);
                  const g = canvasGroupRef?.current;
                  if (g) {
                    setSvgGesturing(true);
                    g.setAttribute('transform', `translate(${pending.pan.x}, ${pending.pan.y}) scale(${pending.zoom})`);
                  } else {
                    setZoom(pending.zoom);
                    setPan(pending.pan);
                  }
                });
              }

              twoFingerLastDistRef.current = curDist;
              twoFingerLastCenterRef.current = curCenter;
            }
          } else {
            twoFingerLastDistRef.current = curDist;
            twoFingerLastCenterRef.current = curCenter;
          }
        }
      }
      return;
    }

    // Spacebar / Hand Pan
    if (isPanningRef.current) {
      if (activePanPointerIdRef.current !== null && e.pointerId !== activePanPointerIdRef.current) {
        return;
      }
      const rawPan = {
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      };
      const newPan = clampPan ? clampPan(rawPan, zoomRef.current) : rawPan;
      (panRef.current as { x: number; y: number }) = newPan;
      if (canvasGroupRef?.current) {
        pendingPinchUpdateRef.current = { zoom: zoomRef.current, pan: newPan };
        if (pinchRafIdRef.current === null) {
          pinchRafIdRef.current = requestAnimationFrame(() => {
            pinchRafIdRef.current = null;
            const pending = pendingPinchUpdateRef.current;
            if (!pending) return;
            pendingPinchUpdateRef.current = null;
            setLiveViewport(pending.zoom, pending.pan);
            const g = canvasGroupRef.current;
            if (g) {
              setSvgGesturing(true);
              g.setAttribute('transform', `translate(${pending.pan.x}, ${pending.pan.y}) scale(${pending.zoom})`);
            }
          });
        }
      } else {
        setLiveViewport(zoomRef.current, newPan);
        setPan(newPan);
      }
      return;
    }

    // Trace handle move
    if (handleTracePointerMove(e)) {
      return;
    }

    const pos = screenToCanvas(e.clientX, e.clientY);

    // General Crosshair direct DOM positioning (0ms latency, zero drift)
    if (generalCrosshairRef?.current) {
      if (!gridSettings.showCursorCrosshair || isSpacePressed || isPanningRef.current || toolMode === 'brush' || toolMode === 'eraser') {
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
      if (!gridSettings.showCursorCrosshair || isSpacePressed || isPanningRef.current) {
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
      if (!gridSettings.showCursorCrosshair || isSpacePressed || isPanningRef.current) {
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

    // Update hover position (throttled; see updateHoverPos). The early
    // call above already updated it for pan / pinch / trace moves, so
    // this is a no-op when the position did not change since.
    updateHoverPos(pos);

    // Guideline drag (delegated to hook)
    if (handleGuidelinePointerMove(pos)) {
      return;
    }

    // Active Ruler drag
    if (toolMode === 'ruler' && handleRulerPointerMove(pos, e)) {
      return;
    }

    // Metric drag (delegated to hook)
    if (handleMetricsPointerMove(pos)) {
      return;
    }

    // Marquee rectangular drag selection
    if (marqueeSelectionRef.current) {
      const nextMarquee = { ...marqueeSelectionRef.current, current: pos };
      marqueeSelectionRef.current = nextMarquee;
      setMarqueeSelection(nextMarquee);
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

    // Pen tool handle drag & rubber-band (hoverStore drives ActivePenPreviewLayer without GlyphCanvas re-renders)
    if (toolMode === 'pen') {
      const currentContour = activePenContourRef.current;
      const session = penDragHandleSessionRef.current;

      if (session && currentContour) {
        if (penMode === 'corner') {
          return;
        }
        let dx = pos.x - session.startPos.x;
        let dy = pos.y - session.startPos.y;
        const dist = Math.hypot(dx, dy);

        // 3px drag threshold in screen pixels (3 / zoom)
        const threshold = 3 / zoomRef.current;
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

        return;
      }

      if (currentContour) {
        return;
      }
    }

    // Node / Select drag
    if (handleNodeDragMove(e, pos)) {
      return;
    }
  }, [
    handleTracePointerMove,
    screenToCanvas,
    toolMode,
    gridSettings.showCursorCrosshair,
    isSpacePressed,
    updateLivePressureThrottled,
    updateHoverPos,
    handleGuidelinePointerMove,
    handleRulerPointerMove,
    handleMetricsPointerMove,
    setMarqueeSelection,
    dispatchTransformMove,
    isErasingRef,
    handleEraserPointerMove,
    handleBrushPointerMove,
    isShapeTool,
    shapeStartPoint,
    handleShapePointerMove,
    setPenMousePos,
    handleNodeDragMove,
    panStartRef,
    panRef,
    setPan,
    zoomRef,
    setZoom,
    clampPan,
    containerRef,
    canvasGroupRef,
    getContainerRectFast,
    upm,
    setSvgGesturing,
    eraserReticleRef,
    drawingReticleRef,
    generalCrosshairRef,
    penMode,
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

    // Flush pending pinch/pan RAF updates when fingers are lifted
    if (pinchRafIdRef.current !== null) {
      cancelAnimationFrame(pinchRafIdRef.current);
      pinchRafIdRef.current = null;
    }
    pendingPinchUpdateRef.current = null;
    setSvgGesturing(false);

    // Multi-touch gestures (Undo on 2-finger tap, Redo on 3-finger tap)
    if (wasTouch && touchPointersRef.current.size === 0) {
      const duration = Date.now() - touchStartTimeRef.current;
      const touchCount = maxTouchCountRef.current;
      const didNotMove = !hasMovedSignificantRef.current;
      // A3: tap Undo/Redo only fires when no pinch started. A pinch starts
      // when the 2nd finger arrives after the 1st was already held, or when
      // the fingers move during the gesture.
      const wasPinch = pinchStartedRef.current;

      maxTouchCountRef.current = 0;
      hasMovedSignificantRef.current = false;
      pinchStartedRef.current = false;

      // H17: never fire tap Undo/Redo while a pen path or another
      // drawing session is uncommitted. Keyboard Ctrl+Z is already
      // blocked during pen drawing for the same reason; a two-finger
      // tap must not undo the contours underneath the open path.
      const hasUncommittedDrawing =
        activePenContourRef.current !== null ||
        brushStrokePointsRef.current.length > 0 ||
        isErasingRef.current ||
        shapeStartPoint !== null ||
        nodeDragSessionRef.current !== null;
      if (duration < 380 && didNotMove && !wasPinch && !hasUncommittedDrawing) {
        if (touchCount === 2 && onUndo) {
          onUndo();
          isTwoFingerGestureRef.current = false;
          twoFingerCooldownUntilRef.current = Date.now() + 150;
          activeTwoFingerIdsRef.current = null;
          twoFingerCachedContainerRectRef.current = null;
          return;
        } else if (touchCount === 3 && onRedo) {
          onRedo();
          isTwoFingerGestureRef.current = false;
          twoFingerCooldownUntilRef.current = Date.now() + 150;
          activeTwoFingerIdsRef.current = null;
          twoFingerCachedContainerRectRef.current = null;
          return;
        }
      }
    }

    if (isTwoFingerGestureRef.current) {
      if (touchPointersRef.current.size < 2) {
        // Commit final zoom & pan once to React so node stroke widths and status bar % sync crisply
        setZoom(zoomRef.current);
        setPan(panRef.current as { x: number; y: number });
        twoFingerLastCenterRef.current = null;
        twoFingerLastDistRef.current = null;
        twoFingerStartDistRef.current = null;
        twoFingerStartCenterRef.current = null;
      }
      if (touchPointersRef.current.size === 0) {
        // A2: make sure no node drag session survives the gesture. The
        // early return below skips the handleNodeDragEnd() at the end of
        // this handler, so end it here.
        if (nodeDragSessionRef.current) {
          handleNodeDragEnd();
          nodeDragSessionRef.current = null;
        }
        pinchStartedRef.current = false;
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

    // Reset dragging states and commit pan if we were dragging with Hand/Space
    if (isPanningRef.current) {
      if (activePanPointerIdRef.current !== null && e.pointerId !== activePanPointerIdRef.current) {
        return;
      }
      const finalPan = clampPan
        ? clampPan(panRef.current as { x: number; y: number }, zoomRef.current)
        : (panRef.current as { x: number; y: number });
      (panRef.current as { x: number; y: number }) = finalPan;
      setPan(finalPan);
    }
    activePanPointerIdRef.current = null;
    isPanningRef.current = false;
    setIsPanning(false);
    resetTraceDragState();
    handleMetricsPointerUp();
    handleGuidelinePointerUp();

    // Resolve Marquee Selection on release
    const currentMarquee = marqueeSelectionRef.current;
    if (currentMarquee) {
      const minX = Math.min(currentMarquee.start.x, currentMarquee.current.x);
      const maxX = Math.max(currentMarquee.start.x, currentMarquee.current.x);
      const minY = Math.min(currentMarquee.start.y, currentMarquee.current.y);
      const maxY = Math.max(currentMarquee.start.y, currentMarquee.current.y);
      const boxW = maxX - minX;
      const boxH = maxY - minY;

      // L11: the click-vs-marquee threshold must be constant on screen
      // (4 screen px), not 4 canvas units.
      const marqueeThreshold = 4 / (zoomRef.current || 1);
      if (boxW > marqueeThreshold || boxH > marqueeThreshold) {
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
      marqueeSelectionRef.current = null;
      setMarqueeSelection(null);
    }

    // Finish Pen Tool Drag/Click determination
    if (toolMode === 'pen') {
      if (penDragHandleSessionRef.current) {
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
      }
      setSelectedHandleType(null);
      setActiveSnapGuides([]);
      return;
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
    setSvgGesturing,
    setZoom,
    setPan,
    zoomRef,
    panRef,
    clampPan,
    onUndo,
    onRedo,
    setIsPanning,
    resetTraceDragState,
    handleMetricsPointerUp,
    handleGuidelinePointerUp,
    setMarqueeSelection,
    contours,
    selectedNodeIds,
    setSelectedNodeIds,
    selectedContourIds,
    setSelectedContourIds,
    setSelectedContourId,
    showCanvasToast,
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
    setSelectedHandleType,
    setActiveSnapGuides,
    penMode,
  ]);

  const handlePointerCancel = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    try {
      if ((e.currentTarget as Element).hasPointerCapture?.(e.pointerId)) {
        (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
      }
    } catch {
      // Ignored
    }

    if (activeDrawingPointerIdRef.current === e.pointerId) {
      activeDrawingPointerIdRef.current = null;
    }
    if (activePanPointerIdRef.current === e.pointerId) {
      activePanPointerIdRef.current = null;
    }

    const cancelledPointerType = pointerTypesRef.current.get(e.pointerId) || e.pointerType;
    pointerTypesRef.current.delete(e.pointerId);
    touchPointersRef.current.delete(e.pointerId);

    if (cancelledPointerType === 'pen' || isPenDrawingRef.current) {
      isPenDrawingRef.current = false;
      setLiveStylusPressure(0);
    }

    if (pinchRafIdRef.current !== null) {
      cancelAnimationFrame(pinchRafIdRef.current);
      pinchRafIdRef.current = null;
    }
    pendingPinchUpdateRef.current = null;
    setSvgGesturing(false);

    if (isTwoFingerGestureRef.current || touchPointersRef.current.size < 2) {
      isTwoFingerGestureRef.current = false;
      pinchStartedRef.current = false;
      activeTwoFingerIdsRef.current = null;
      twoFingerLastCenterRef.current = null;
      twoFingerLastDistRef.current = null;
      twoFingerStartDistRef.current = null;
      twoFingerStartCenterRef.current = null;
      twoFingerCachedContainerRectRef.current = null;
      if (touchPointersRef.current.size === 0) {
        maxTouchCountRef.current = 0;
        hasMovedSignificantRef.current = false;
      }
      setZoom(zoomRef.current);
      const syncedPan = clampPan
        ? clampPan(panRef.current as { x: number; y: number }, zoomRef.current)
        : (panRef.current as { x: number; y: number });
      (panRef.current as { x: number; y: number }) = syncedPan;
      setPan(syncedPan);
    }

    if (isPanningRef.current) {
      isPanningRef.current = false;
      setIsPanning(false);
    }

    // Discard in-progress interactions without committing partial work or triggering tap undo/redo
    penDragHandleSessionRef.current = null;
    // H6: cancel the node drag properly instead of just dropping the
    // session: restore the pre-drag contour, drop the pending RAF
    // update, and clear the handle selection, or the next hover moves
    // the selected node.
    if (handleNodeDragCancel) {
      handleNodeDragCancel();
    } else {
      nodeDragSessionRef.current = null;
    }
    marqueeSelectionRef.current = null;
    setMarqueeSelection(null);
    setShapeStartPoint(null);
    setShapeCurrentPoint(null);
    setDraggingMetric(null);
    setDraggingGuidelineId(null);
    setActiveSnapGuides([]);
    setTouchLoupeState((prev: any) => (prev.visible ? { ...prev, visible: false } : prev));
    resetTraceDragState();
    resetBrushDrawing?.();
    if (activeBrushPathRef.current) {
      activeBrushPathRef.current.setAttribute('d', '');
    }
    if (!handleEraserPointerCancel?.(e)) {
      isErasingRef.current = false;
      lastErasePosRef.current = null;
      resetEraserVisuals();
    }
    if (drawingReticleRef.current) drawingReticleRef.current.style.display = 'none';
    if (eraserReticleRef.current) eraserReticleRef.current.style.display = 'none';
    if (generalCrosshairRef?.current) generalCrosshairRef.current.style.display = 'none';
    if (cancelTransformSession) {
      cancelTransformSession();
    } else {
      setTransformSession(null);
    }
  }, [
    setLiveStylusPressure,
    setSvgGesturing,
    setZoom,
    setPan,
    zoomRef,
    panRef,
    clampPan,
    setIsPanning,
    nodeDragSessionRef,
    handleNodeDragCancel,
    setMarqueeSelection,
    setShapeStartPoint,
    setShapeCurrentPoint,
    setDraggingMetric,
    setDraggingGuidelineId,
    setActiveSnapGuides,
    setTouchLoupeState,
    resetTraceDragState,
    resetBrushDrawing,
    activeBrushPathRef,
    isErasingRef,
    lastErasePosRef,
    handleEraserPointerCancel,
    resetEraserVisuals,
    drawingReticleRef,
    eraserReticleRef,
    generalCrosshairRef,
    cancelTransformSession,
    setTransformSession,
  ]);

  return {
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
  };
}
