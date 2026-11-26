// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import {
  isDoubleTap,
  DOUBLE_TAP_MAX_DISTANCE_PX,
  DOUBLE_TAP_MAX_INTERVAL_MS,
  useCanvasPointerDispatcher,
  type TapPoint,
} from './useCanvasPointerDispatcher';
import { clearLiveViewport, getLiveViewport, setLiveViewport, useLiveViewportZoom } from '../viewportStore';
import { getHoverCanvasPos, setHoverCanvasPos } from '../hoverStore';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

describe('isDoubleTap', () => {
  const first: TapPoint = { time: 1000, x: 200, y: 300 };

  it('accepts a second tap close in time and position', () => {
    expect(isDoubleTap(first, { time: 1000 + DOUBLE_TAP_MAX_INTERVAL_MS - 1, x: 200, y: 300 })).toBe(true);
    expect(
      isDoubleTap(first, { time: 1200, x: 200 + DOUBLE_TAP_MAX_DISTANCE_PX, y: 300 })
    ).toBe(true);
  });

  it('rejects taps too far apart in time', () => {
    expect(isDoubleTap(first, { time: 1000 + DOUBLE_TAP_MAX_INTERVAL_MS, x: 200, y: 300 })).toBe(false);
    expect(isDoubleTap(first, { time: 5000, x: 200, y: 300 })).toBe(false);
  });

  it('rejects a second tap at a different position (the reported bug)', () => {
    // Same time window, but the finger landed elsewhere on the canvas.
    expect(isDoubleTap(first, { time: 1100, x: 400, y: 300 })).toBe(false);
    expect(isDoubleTap(first, { time: 1100, x: 200, y: 500 })).toBe(false);
    // Just outside the distance threshold, diagonally.
    expect(
      isDoubleTap(first, { time: 1100, x: 200 + DOUBLE_TAP_MAX_DISTANCE_PX, y: 300 + 1 })
    ).toBe(false);
  });

  it('rejects a missing first tap and a backwards clock', () => {
    expect(isDoubleTap(null, { time: 1000, x: 200, y: 300 })).toBe(false);
    expect(isDoubleTap(first, { time: 999, x: 200, y: 300 })).toBe(false);
  });
});

describe('two-finger pinch GPU compositing & zero re-render fast path', () => {
  it('uses GPU CSS transform without triggering liveViewport/hover updates during pinch, then commits cleanly on release', () => {
    clearLiveViewport();
    setLiveViewport(1, { x: 0, y: 0 });
    setHoverCanvasPos(null);

    const origRaf = window.requestAnimationFrame;
    const origCancelRaf = window.cancelAnimationFrame;
    let rafQueue: Array<{ id: number; cb: FrameRequestCallback }> = [];
    let nextRafId = 1;
    window.requestAnimationFrame = (cb: FrameRequestCallback) => {
      const id = nextRafId++;
      rafQueue.push({ id, cb });
      return id;
    };
    window.cancelAnimationFrame = vi.fn((id: number) => {
      rafQueue = rafQueue.filter((item) => item.id !== id);
    });
    const flushRaf = () => {
      const items = rafQueue;
      rafQueue = [];
      items.forEach((item) => item.cb(0));
    };

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const setZoom = vi.fn();
    const setPan = vi.fn();
    const setMarqueeSelection = vi.fn();
    const setDraggingMetric = vi.fn();
    const setDraggingGuidelineId = vi.fn();
    let zoomSubscriberRenders = 0;
    let api!: ReturnType<typeof useCanvasPointerDispatcher>;

    function Harness() {
      zoomSubscriberRenders++;
      useLiveViewportZoom();

      const zoomRef = React.useRef(1);
      const panRef = React.useRef({ x: 0, y: 0 });
      const panStartRef = React.useRef({ x: 0, y: 0 });
      const containerRef = React.useRef<HTMLDivElement | null>(null);
      const canvasGroupRef = React.useRef<SVGGElement | null>(null);
      const emptyRef = React.useRef<any>(null);
      const emptyArrRef = React.useRef<any[]>([]);
      const falseRef = React.useRef(false);

      api = useCanvasPointerDispatcher({
        zoom: 1,
        pan: { x: 0, y: 0 },
        setZoom,
        setPan,
        zoomRef,
        panRef,
        screenToCanvas: (x, y) => ({ x, y }),
        resetView: vi.fn(),
        containerRef,
        canvasGroupRef,
        getContainerRectFast: () => ({ left: 0, top: 0, width: 400, height: 600 }),
        isSpacePressed: false,
        isPanning: false,
        setIsPanning: vi.fn(),
        panStartRef,
        toolMode: 'select',
        isShapeTool: false,
        eraserMode: 'stroke',
        palmRejectionMode: 'off',
        isStylusActive: false,
        setIsStylusActive: vi.fn(),
        setLiveStylusPressure: vi.fn(),
        contours: [],
        contoursRef: emptyArrRef,
        selectedContourIds: [],
        setSelectedContourIds: vi.fn(),
        selectedContourId: null,
        setSelectedContourId: vi.fn(),
        selectedNodeId: null,
        setSelectedNodeId: vi.fn(),
        selectedHandleType: null,
        setSelectedHandleType: vi.fn(),
        marqueeSelection: null,
        setMarqueeSelection,
        setTouchLoupeState: vi.fn(),
        lsb: 50,
        advanceWidth: 1000,
        onChangeLsb: vi.fn(),
        onChangeAdvanceWidth: vi.fn(),
        draggingMetric: null,
        setDraggingMetric,
        handleBrushPointerDown: vi.fn(),
        handleBrushPointerMove: vi.fn(() => false),
        handleBrushPointerUp: vi.fn(() => false),
        brushStrokePointsRef: emptyArrRef,
        activeBrushPathRef: React.useRef<SVGPathElement | null>(null),
        handleNodePointerDownOnCanvas: vi.fn(() => false),
        handleNodeDragMove: vi.fn(() => false),
        handleNodeDragEnd: vi.fn(),
        nodeDragSessionRef: emptyRef,
        shapeStartPoint: null,
        handleShapePointerDown: vi.fn(),
        handleShapePointerMove: vi.fn(),
        handleShapePointerUp: vi.fn(),
        setShapeStartPoint: vi.fn(),
        setShapeCurrentPoint: vi.fn(),
        isErasingRef: falseRef,
        lastErasePosRef: emptyRef,
        handleEraserPointerDown: vi.fn(),
        handleEraserPointerMove: vi.fn(),
        handleEraserPointerUp: vi.fn(),
        eraserReticleRef: emptyRef,
        drawingReticleRef: emptyRef,
        resetEraserVisuals: vi.fn(),
        activePenContour: null,
        setActivePenContour: vi.fn(),
        penStrokeWidth: 20,
        penCapStyle: 'round',
        autoResolveBrushOverlap: false,
        handleTransformPointerMove: vi.fn(() => false),
        handleTransformPointerUp: vi.fn(() => false),
        setTransformSession: vi.fn(),
        rulerMeasurement: null,
        handleRulerPointerDown: vi.fn(),
        handleRulerPointerMove: vi.fn(() => false),
        handleRulerPointerUp: vi.fn(),
        lockGuidelines: false,
        draggingGuidelineId: null,
        setDraggingGuidelineId,
        updateDraggingGuideline: vi.fn(() => false),
        isDraggingTrace: false,
        isResizingTrace: false,
        handleTracePointerMove: vi.fn(() => false),
        resetTraceDragState: vi.fn(),
        traceSettings: {
          enabled: false,
          type: 'char',
          text: '',
          fontFamily: 'sans-serif',
          fontSize: 1000,
          opacity: 0.2,
          scale: 1,
          offsetX: 0,
          offsetY: 0,
        },
        gridSettings: {
          showGrid: true,
          gridSize: 50,
          snapToGrid: false,
          snapToPoints: false,
          showMetrics: true,
          showPoints: true,
          showHandles: true,
        },
        snapMetrics: { ascender: 800, capHeight: 700, xHeight: 500, baseline: 800, descender: 1000, advanceWidth: 1000, lsb: 50 },
        customGuidelines: [],
        setActiveSnapGuides: vi.fn(),
        onChangeContours: vi.fn(),
        showCanvasToast: vi.fn(),
      });

      return React.createElement(
        'div',
        { ref: containerRef },
        React.createElement(
          'svg',
          { 'data-testid': 'stage-svg' },
          React.createElement('g', { ref: canvasGroupRef, transform: 'translate(0, 0) scale(1)' })
        )
      );
    }

    act(() => {
      root.render(React.createElement(Harness));
    });

    const svgEl = container.querySelector('svg[data-testid="stage-svg"]') as SVGSVGElement;
    const gEl = svgEl.querySelector('g') as SVGGElement;
    const rendersBeforePinch = zoomSubscriberRenders;

    const makeTouchEvent = (pointerId: number, clientX: number, clientY: number) =>
      ({
        pointerId,
        pointerType: 'touch',
        button: 0,
        clientX,
        clientY,
        currentTarget: svgEl,
      }) as unknown as React.PointerEvent<SVGSVGElement>;

    // Touch 1 & Touch 2 start pinch at (150, 300) and (250, 300), center=(200,300), dist=100
    act(() => {
      api.handlePointerDown(makeTouchEvent(1, 150, 300));
      api.handlePointerDown(makeTouchEvent(2, 250, 300));
    });

    // Clear idle-state calls should NOT have fired at pinch start
    expect(setDraggingMetric).not.toHaveBeenCalled();
    expect(setDraggingGuidelineId).not.toHaveBeenCalled();
    expect(svgEl.getAttribute('data-gesturing')).toBe('true');

    // Pinch zoom IN from dist=100 to dist=125 (1.25x around center (200, 300))
    act(() => {
      api.handlePointerMove(makeTouchEvent(1, 137.5, 300));
      api.handlePointerMove(makeTouchEvent(2, 262.5, 300));
      flushRaf();
    });

    // Zero React liveViewport re-renders and zero hover churn during active pinch frames!
    expect(zoomSubscriberRenders).toBe(rendersBeforePinch);
    expect(setZoom).not.toHaveBeenCalled();
    expect(setPan).not.toHaveBeenCalled();
    expect(getHoverCanvasPos()).toBeNull();

    // GPU CSS transform handles the visual zoom without mutating SVG <g> during in-bounds zoom-in
    expect(svgEl.style.transform).toContain('translate3d(');
    expect(svgEl.style.transform).toContain('scale(1.25)');
    expect(gEl.getAttribute('transform')).toBe('translate(0, 0) scale(1)');

    // Release one finger -> clears GPU CSS transform, commits exact final SVG <g>, liveViewport, setZoom & setPan
    act(() => {
      api.handlePointerUp(makeTouchEvent(2, 262.5, 300));
      api.handlePointerUp(makeTouchEvent(1, 137.5, 300));
    });

    expect(svgEl.style.transform).toBe('');
    expect(svgEl.getAttribute('data-gesturing')).toBeNull();
    expect(gEl.getAttribute('transform')).toContain('scale(1.25)');
    expect(getLiveViewport()?.zoom).toBeCloseTo(1.25, 3);
    expect(setZoom).toHaveBeenCalledTimes(1);
    expect(setPan).toHaveBeenCalledTimes(1);
    expect(zoomSubscriberRenders).toBe(rendersBeforePinch + 1);

    window.requestAnimationFrame = origRaf;
    window.cancelAnimationFrame = origCancelRaf;
    act(() => {
      root.unmount();
    });
    clearLiveViewport();
    setHoverCanvasPos(null);
    container.remove();
  });
});

