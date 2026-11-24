// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { useToolModeCleanup } from './hooks/useToolModeCleanup';
import { useCanvasEraser } from './hooks/useCanvasEraser';
import { useCanvasContourActions } from './hooks/useCanvasContourActions';
import { SmartSnapGuidesLayer } from './SmartSnapGuidesLayer';
import { useCanvasPointerDispatcher } from './hooks/useCanvasPointerDispatcher';
import { useNodeEditing } from '../../hooks/useNodeEditing';
import { useTransformSession } from './hooks/useTransformSession';
import { useShapeCreation, isShapeToolMode } from './hooks/useShapeCreation';
import { getHoverCanvasPos, setHoverCanvasPos } from './hoverStore';
import { getPenMousePos, setPenMousePos } from './penMouseStore';
import { clearLiveViewport, setLiveViewport, useLiveViewportZoom } from './viewportStore';
import { CanvasBackgroundLayer } from './CanvasBackgroundLayer';
import { AdjacentGlyphsLayer } from './AdjacentGlyphsLayer';
import { DEFAULT_GRID_OPACITY, DEFAULT_GRID_SIZE } from '../../utils/gridDefaults';
import { CanvasRulersLayer } from './CanvasRulersLayer';
import { MetricsGuidesLayer } from './MetricsGuidesLayer';
import { JapaneseGuidesLayer } from './JapaneseGuidesLayer';
import { InteractiveContourHitLayer } from './InteractiveContourHitLayer';
import { BezierNodeControlsLayer } from './BezierNodeControlsLayer';
import { CanvasContextMenu } from './CanvasContextMenu';
import {
  getLineSegmentIntersection,
  findContourIntersections,
  unionContours,
} from '../../utils/path/booleanOperations';
import {
  sliceOpenContourWithEraser,
  subtractEraserStrokeFromClosedContours,
} from '../../utils/path/eraser';
import { useBrushDrawing } from '../../hooks/useBrushDrawing';
import {
  groupContoursWithHoles,
  normalizeGlyphContoursWinding,
  getContourSignedArea,
} from '../../utils/path/bounds';
import * as vectorBoolean from '../../utils/vectorBoolean';
import { PathContour, ToolMode } from '../../types';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

describe('Wave 3 canvas, pointer & geometry remediation tests', () => {
  it('clears in-progress pen contour and isPenDrawingRef when switching away from pen mode', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const setActivePenContour = vi.fn();
    const isPenDrawingRef = { current: true };
    const emptyRef = { current: null };
    const falseRef = { current: false };
    const strRef = { current: '' };

    function Harness({ toolMode }: { toolMode: ToolMode }) {
      useToolModeCleanup({
        toolMode,
        selectedUnicode: 0x3042,
        gridSettingsShowRulers: true,
        setShowMobilePartSheet: vi.fn(),
        setMarqueeSelection: vi.fn(),
        resetShapeCreation: vi.fn(),
        resetEraserVisuals: vi.fn(),
        setRulerMeasurement: vi.fn(),
        cancelTransformSession: vi.fn(),
        setActiveSnapGuides: vi.fn(),
        setTouchLoupeState: vi.fn(),
        resetBrushDrawing: vi.fn(),
        finalizeBrushDrawing: vi.fn(() => false),
        setActivePenContour,
        setShapeStartPoint: vi.fn(),
        setShapeCurrentPoint: vi.fn(),
        setTransformSession: vi.fn(),
        setSelectedContourIds: vi.fn(),
        setSelectedNodeId: vi.fn(),
        setSelectedHandleType: vi.fn(),
        setDraggingMetric: vi.fn(),
        setDraggingGuidelineId: vi.fn(),
        activeBrushPathRef: emptyRef,
        activeBrushSvgDRef: strRef,
        pendingTransformContoursRef: emptyRef,
        isPenDrawingRef,
        isTwoFingerGestureRef: falseRef,
        setIsPanning: vi.fn(),
        resetTraceDragState: vi.fn(),
        nodeDragSessionRef: emptyRef,
        drawingReticleRef: emptyRef,
        isErasingRef: falseRef,
        activeDrawingPointerIdRef: emptyRef,
        handleNodeDragEnd: vi.fn(() => false),
        handleTransformPointerUp: vi.fn(() => false),
        handleEraserPointerUp: vi.fn(() => false),
      });
      return null;
    }

    act(() => {
      root.render(<Harness toolMode="pen" />);
    });
    setActivePenContour.mockClear();
    isPenDrawingRef.current = true;

    act(() => {
      root.render(<Harness toolMode="select" />);
    });

    expect(isPenDrawingRef.current).toBe(false);
    expect(setActivePenContour).toHaveBeenCalledWith(null);

    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('handlePointerCancel discards temporary drag/marquee state without committing brush strokes', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const handleBrushPointerUp = vi.fn(() => true);
    const resetBrushDrawing = vi.fn();
    const setMarqueeSelection = vi.fn();
    const resetEraserVisuals = vi.fn();
    let api!: ReturnType<typeof useCanvasPointerDispatcher>;

    function Harness() {
      const zoomRef = React.useRef(1);
      const panRef = React.useRef({ x: 0, y: 0 });
      const panStartRef = React.useRef({ x: 0, y: 0 });
      const emptyRef = React.useRef<any>(null);
      const emptyArrRef = React.useRef<any[]>([]);
      const falseRef = React.useRef(false);
      const svgRef = React.useRef<SVGSVGElement | null>(null);
      const gRef = React.useRef<SVGGElement | null>(null);

      api = useCanvasPointerDispatcher({
        zoom: 1,
        pan: { x: 0, y: 0 },
        setZoom: vi.fn(),
        setPan: vi.fn(),
        zoomRef,
        panRef,
        screenToCanvas: (x, y) => ({ x, y }),
        resetView: vi.fn(),
        containerRef: React.useRef<HTMLDivElement | null>(null),
        isSpacePressed: false,
        isPanning: false,
        setIsPanning: vi.fn(),
        panStartRef,
        toolMode: 'brush',
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
        marqueeSelection: { start: { x: 10, y: 10 }, current: { x: 50, y: 50 } },
        setMarqueeSelection,
        setTouchLoupeState: vi.fn(),
        lsb: 50,
        advanceWidth: 1000,
        onChangeLsb: vi.fn(),
        onChangeAdvanceWidth: vi.fn(),
        draggingMetric: null,
        setDraggingMetric: vi.fn(),
        handleBrushPointerDown: vi.fn(),
        handleBrushPointerMove: vi.fn(() => false),
        handleBrushPointerUp,
        resetBrushDrawing,
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
        eraserReticleRef: gRef,
        drawingReticleRef: gRef,
        resetEraserVisuals,
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
        setDraggingGuidelineId: vi.fn(),
        updateDraggingGuideline: vi.fn(() => false),
        isDraggingTrace: false,
        isResizingTrace: false,
        handleTracePointerMove: vi.fn(() => false),
        resetTraceDragState: vi.fn(),
        traceSettings: {
          enabled: true,
          type: 'char',
          text: '',
          fontFamily: 'sans-serif',
          fontSize: 1000,
          opacity: 0.2,
          scale: 1,
          offsetX: 0,
          offsetY: 0,
        },
        onChangeTraceSettings: vi.fn(),
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
        onUndo: vi.fn(),
        onRedo: vi.fn(),
        showCanvasToast: vi.fn(),
        isGlyphLocked: false,
      });
      return null;
    }

    act(() => {
      root.render(<Harness />);
    });

    const cancelEvent = {
      pointerId: 1,
      pointerType: 'pen',
      currentTarget: {
        hasPointerCapture: () => false,
        releasePointerCapture: vi.fn(),
      },
    } as unknown as React.PointerEvent<SVGSVGElement>;

    act(() => {
      api.handlePointerCancel(cancelEvent);
    });

    expect(handleBrushPointerUp).not.toHaveBeenCalled();
    expect(resetBrushDrawing).toHaveBeenCalledTimes(1);
    expect(resetEraserVisuals).toHaveBeenCalledTimes(1);
    expect(setMarqueeSelection).toHaveBeenCalledWith(null);

    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('renders diagonal snap guide lines, marker, and badge in SmartSnapGuidesLayer', () => {
    clearLiveViewport();
    setLiveViewport(1, { x: 0, y: 0 });
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <svg>
          <SmartSnapGuidesLayer
            selectionColor="#0284c7"
            activeSnapGuides={[
              {
                id: 'diag-1',
                type: 'diagonal',
                position: 0,
                targetType: 'custom',
                targetName: '45° 払',
                p1: { x: 200, y: 200 },
                p2: { x: 300, y: 300 },
                snapPoint: { x: 250, y: 250 },
              },
            ]}
          />
        </svg>
      );
    });

    const lines = container.querySelectorAll('line');
    expect(lines.length).toBeGreaterThanOrEqual(4);
    expect(container.textContent).toContain('45° 払');

    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('detects collinear segment overlaps and endpoint contacts without wrap-around false positives', () => {
    // Collinear overlap along X axis -> returns midpoint of [100, 150]
    const overlap = getLineSegmentIntersection(
      { x: 0, y: 100 },
      { x: 150, y: 100 },
      { x: 100, y: 100 },
      { x: 250, y: 100 }
    );
    expect(overlap).toEqual({ x: 125, y: 100 });

    // T-junction / endpoint contact at t=1.0
    const endpoint = getLineSegmentIntersection(
      { x: 0, y: 100 },
      { x: 100, y: 100 },
      { x: 100, y: 0 },
      { x: 100, y: 200 }
    );
    expect(endpoint).toEqual({ x: 100, y: 100 });

    // Closed rectangle has adjacent closing segment sharing vertex — must report 0 self-intersections
    const rect: PathContour = {
      id: 'rect',
      closed: true,
      nodes: [
        { id: 'n1', x: 100, y: 100, type: 'corner' },
        { id: 'n2', x: 300, y: 100, type: 'corner' },
        { id: 'n3', x: 300, y: 300, type: 'corner' },
        { id: 'n4', x: 100, y: 300, type: 'corner' },
      ],
    };
    expect(findContourIntersections([rect])).toEqual([]);
  });

  it('falls back to raster union in unionContours when Paper.js tryBooleanUnionContours reports failure', () => {
    const spy = vi
      .spyOn(vectorBoolean, 'tryBooleanUnionContours')
      .mockReturnValue({ ok: false, contours: [] });
    const origCreateElement = document.createElement.bind(document);
    // Return null 2d context -> raster fallback returns the untouched cluster safely without throwing
    const createSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') {
        return { width: 0, height: 0, getContext: () => null } as unknown as HTMLCanvasElement;
      }
      return origCreateElement(tag);
    });

    const r1: PathContour = {
      id: 'r1',
      closed: true,
      nodes: [
        { id: 'a1', x: 100, y: 100, type: 'corner' },
        { id: 'a2', x: 250, y: 100, type: 'corner' },
        { id: 'a3', x: 250, y: 250, type: 'corner' },
        { id: 'a4', x: 100, y: 250, type: 'corner' },
      ],
    };
    const r2: PathContour = {
      id: 'r2',
      closed: true,
      nodes: [
        { id: 'b1', x: 150, y: 150, type: 'corner' },
        { id: 'b2', x: 300, y: 150, type: 'corner' },
        { id: 'b3', x: 300, y: 300, type: 'corner' },
        { id: 'b4', x: 150, y: 300, type: 'corner' },
      ],
    };

    const result = unionContours([r1, r2]);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(createSpy).toHaveBeenCalledWith('canvas');
    expect(result.length).toBe(2);

    spy.mockRestore();
    createSpy.mockRestore();
  });

  it('falls back to raster union when Paper.js returns the input unchanged (silent bypass)', () => {
    const r1: PathContour = {
      id: 'r1',
      closed: true,
      nodes: [
        { id: 'a1', x: 100, y: 100, type: 'corner' },
        { id: 'a2', x: 250, y: 100, type: 'corner' },
        { id: 'a3', x: 250, y: 250, type: 'corner' },
        { id: 'a4', x: 100, y: 250, type: 'corner' },
      ],
    };
    const r2: PathContour = {
      id: 'r2',
      closed: true,
      nodes: [
        { id: 'b1', x: 150, y: 150, type: 'corner' },
        { id: 'b2', x: 300, y: 150, type: 'corner' },
        { id: 'b3', x: 300, y: 300, type: 'corner' },
        { id: 'b4', x: 150, y: 300, type: 'corner' },
      ],
    };
    // Paper.js silent bypass: ok:true but the input contours returned as-is.
    const spy = vi
      .spyOn(vectorBoolean, 'tryBooleanUnionContours')
      .mockReturnValue({ ok: true, contours: [r1, r2], unchanged: true });
    const origCreateElement = document.createElement.bind(document);
    const createSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') {
        return { width: 0, height: 0, getContext: () => null } as unknown as HTMLCanvasElement;
      }
      return origCreateElement(tag);
    });

    const result = unionContours([r1, r2]);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(createSpy).toHaveBeenCalledWith('canvas');
    expect(result.length).toBe(2);

    spy.mockRestore();
    createSpy.mockRestore();
  });

  it('slices open quadratic half-handle contours accurately and ignores unclosed bitmap loops', () => {
    // Open curve using ONLY curr.handleOut (next.handleIn is null), curving upward around y=100
    const curvedOpen: PathContour = {
      id: 'open-quad',
      closed: false,
      nodes: [
        { id: 'n1', x: 100, y: 300, type: 'corner', handleOut: { x: 200, y: 20 } },
        { id: 'n2', x: 300, y: 300, type: 'corner', handleIn: null },
      ],
    };

    // Erase the top apex around (200, 195) — linear chord would sit at y=300, far away from eraser
    const sliced = sliceOpenContourWithEraser(curvedOpen, { x: 200, y: 195 }, 25);
    expect(sliced.length).toBe(2);

    // Ensure incomplete raster boundary loop does not fabricate a phantom closed contour
    const rect: PathContour = {
      id: 'r1',
      closed: true,
      nodes: [
        { id: 'n1', x: 100, y: 100, type: 'corner' },
        { id: 'n2', x: 200, y: 100, type: 'corner' },
        { id: 'n3', x: 200, y: 200, type: 'corner' },
        { id: 'n4', x: 100, y: 200, type: 'corner' },
      ],
    };
    const origCreateElement = document.createElement.bind(document);
    // Mock bitmap where edges exist in an open non-looping configuration or empty
    const mockCtx = {
      fillStyle: '#ffffff',
      strokeStyle: '#ffffff',
      lineWidth: 1,
      lineCap: 'round',
      lineJoin: 'round',
      fillRect: vi.fn(),
      scale: vi.fn(),
      translate: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      getImageData: () => ({ data: new Uint8ClampedArray(60 * 60 * 4).fill(255) }),
    };
    const spyCanvas = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') {
        return { width: 60, height: 60, getContext: () => mockCtx } as unknown as HTMLCanvasElement;
      }
      return origCreateElement(tag);
    });
    const prevPath2d = (globalThis as any).Path2D;
    (globalThis as any).Path2D = class {
      constructor(_d: string = '') {}
    };

    const emptyResult = subtractEraserStrokeFromClosedContours([rect], [{ x: 150, y: 150 }], 20);
    expect(emptyResult).toEqual([]);

    (globalThis as any).Path2D = prevPath2d;
    spyCanvas.mockRestore();
  });

  it('pointercancel on an eraser stroke undoes the session commit instead of keeping the deletions', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const rect: PathContour = {
      id: 'r1',
      closed: true,
      nodes: [
        { id: 'n1', x: 100, y: 100, type: 'corner' },
        { id: 'n2', x: 300, y: 100, type: 'corner' },
        { id: 'n3', x: 300, y: 300, type: 'corner' },
        { id: 'n4', x: 100, y: 300, type: 'corner' },
      ],
    };
    const initial = [rect];
    const onCommitHistory = vi.fn();
    // Simulate the real undo: restore the pre-gesture contours.
    const contoursRef = { current: initial } as React.MutableRefObject<PathContour[]>;
    const onUndo = vi.fn(() => {
      contoursRef.current = initial;
    });
    const onChangeContours = vi.fn((c: PathContour[]) => {
      contoursRef.current = c;
    });
    let api!: ReturnType<typeof useCanvasEraser>;

    function Harness() {
      api = useCanvasEraser({
        toolMode: 'eraser',
        contours: initial,
        contoursRef,
        onChangeContours,
        onCommitHistory,
        onUndo,
        showCanvasToast: vi.fn(),
        selectedContourIds: ['r1'],
        selectedContourId: 'r1',
        selectedNodeId: null,
        setSelectedContourIds: vi.fn(),
        setSelectedContourId: vi.fn(),
        setSelectedNodeId: vi.fn(),
      });
      return null;
    }

    act(() => {
      root.render(<Harness />);
    });

    const downEvent = {
      currentTarget: { setPointerCapture: vi.fn() },
    } as unknown as React.PointerEvent<SVGSVGElement>;

    act(() => {
      api.handleEraserPointerDown({ x: 150, y: 100 }, downEvent);
    });
    // The top edge is erased on pointerdown.
    expect(contoursRef.current.length).toBe(0);
    expect(onCommitHistory).toHaveBeenCalledTimes(1);

    act(() => {
      api.handleEraserPointerCancel();
    });
    // Cancel undoes the single session entry and restores the contours.
    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(contoursRef.current).toBe(initial);
    expect(onCommitHistory).toHaveBeenCalledTimes(1);

    // The session is over: a later pointerup does nothing.
    let upResult: boolean | void;
    act(() => {
      upResult = api.handleEraserPointerUp();
    });
    expect(upResult!).toBe(false);
    expect(onUndo).toHaveBeenCalledTimes(1);

    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('clear-all contours asks for confirmation and clears only when confirmed', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const rect: PathContour = {
      id: 'r1',
      closed: true,
      nodes: [
        { id: 'n1', x: 100, y: 100, type: 'corner' },
        { id: 'n2', x: 300, y: 100, type: 'corner' },
        { id: 'n3', x: 300, y: 300, type: 'corner' },
        { id: 'n4', x: 100, y: 300, type: 'corner' },
      ],
    };
    const contoursRef = { current: [rect] } as React.MutableRefObject<PathContour[]>;
    const onChangeContours = vi.fn((c: PathContour[]) => {
      contoursRef.current = c;
    });
    const onCommitHistory = vi.fn();
    const confirmSpy = vi.spyOn(window, 'confirm');
    let api!: ReturnType<typeof useCanvasContourActions>;

    function Harness() {
      api = useCanvasContourActions({
        contours: [rect],
        contoursRef,
        onChangeContours,
        onCommitHistory,
        brushWidth: 32,
        rulerMeasurement: null,
        setRulerMeasurement: vi.fn(),
        showCanvasToast: vi.fn(),
        resetBrushDrawing: vi.fn(),
        resetEraserVisuals: vi.fn(),
        setActivePenContour: vi.fn(),
        setShapeStartPoint: vi.fn(),
        setShapeCurrentPoint: vi.fn(),
        setTransformSession: vi.fn(),
        setMarqueeSelection: vi.fn(),
        setSelectedContourIds: vi.fn(),
        setSelectedContourId: vi.fn(),
        setSelectedNodeId: vi.fn(),
        setSelectedHandleType: vi.fn(),
        setTouchLoupeState: vi.fn(),
        setEraserMode: vi.fn(),
        activeChar: 'あ',
      });
      return null;
    }

    act(() => {
      root.render(<Harness />);
    });

    confirmSpy.mockReturnValue(false);
    act(() => {
      api.handleClearAllContours();
    });
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(onChangeContours).not.toHaveBeenCalled();
    expect(onCommitHistory).not.toHaveBeenCalled();
    expect(contoursRef.current.length).toBe(1);

    confirmSpy.mockReturnValue(true);
    act(() => {
      api.handleClearAllContours();
    });
    expect(confirmSpy).toHaveBeenCalledTimes(2);
    expect(onCommitHistory).toHaveBeenCalledTimes(1);
    expect(onChangeContours).toHaveBeenCalledWith([], { skipHistory: true });
    expect(contoursRef.current).toEqual([]);

    confirmSpy.mockRestore();
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('useNodeEditing updates contoursRef synchronously on insert for immediate drag and commits history once before edit', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const rect: PathContour = {
      id: 'c1',
      closed: true,
      nodes: [
        { id: 'n1', x: 100, y: 100, type: 'corner' },
        { id: 'n2', x: 300, y: 100, type: 'corner' },
        { id: 'n3', x: 300, y: 300, type: 'corner' },
        { id: 'n4', x: 100, y: 300, type: 'corner' },
      ],
    };
    const contoursRef = { current: [rect] } as React.MutableRefObject<PathContour[]>;
    const callOrder: string[] = [];
    const onCommitHistory = vi.fn(() => callOrder.push('commit'));
    const onChangeContours = vi.fn((next: PathContour[], opts?: { skipHistory?: boolean }) => {
      callOrder.push(`change:${Boolean(opts?.skipHistory)}`);
      contoursRef.current = next;
    });
    let api!: ReturnType<typeof useNodeEditing>;

    function Harness() {
      api = useNodeEditing({
        toolMode: 'node',
        zoom: 1,
        contours: contoursRef.current,
        contoursRef,
        onChangeContours,
        onCommitHistory,
        screenToCanvas: (x, y) => ({ x, y }),
        gridSettings: {
          showGrid: false,
          gridSize: 50,
          snapToGrid: false,
          snapToGuides: false,
          snapToPoints: false,
          showMetrics: true,
          showPoints: true,
          showHandles: true,
        },
        snapMetrics: {
          lsb: 50,
          advanceWidth: 1000,
          baseline: 800,
          ascender: 800,
          capHeight: 700,
          xHeight: 500,
          descender: 1000,
        },
        customGuidelines: [],
        showCanvasToast: vi.fn(),
      });
      return null;
    }

    act(() => {
      root.render(<Harness />);
    });

    const insertEvent = {
      clientX: 200,
      clientY: 100,
      pointerId: 1,
      stopPropagation: vi.fn(),
      currentTarget: { setPointerCapture: vi.fn() },
    } as unknown as React.PointerEvent;

    let inserted = false;
    act(() => {
      inserted = api.handleInsertNodeOnContour(insertEvent, rect);
    });
    expect(inserted).toBe(true);
    expect(contoursRef.current[0].nodes.length).toBe(5);
    expect(callOrder).toEqual(['commit', 'change:true']);

    // Immediately drag the newly inserted node before a React re-render occurs
    const moveEvent = {
      pointerType: 'mouse',
      altKey: true,
      clientX: 220,
      clientY: 130,
    } as unknown as React.PointerEvent;
    let moved = false;
    act(() => {
      moved = api.handleNodeDragMove(moveEvent, { x: 220, y: 130 });
    });
    expect(moved).toBe(true);
    const draggedNode = contoursRef.current[0].nodes.find((n) => n.id === api.nodeDragSessionRef.current?.nodeId);
    expect(draggedNode).toBeDefined();
    expect(draggedNode!.x).toBe(220);
    expect(draggedNode!.y).toBe(130);

    act(() => {
      api.handleNodeDragEnd();
    });

    // Toggling node type should commit once before updating contours with skipHistory: true
    callOrder.length = 0;
    const targetNodeId = contoursRef.current[0].nodes[0].id;
    act(() => {
      api.handleToggleNodeType('c1', targetNodeId);
    });
    expect(callOrder).toEqual(['commit', 'change:true']);
    expect(contoursRef.current[0].nodes[0].type).toBe('smooth');

    // Deleting selected node should commit once before updating contours with skipHistory: true
    act(() => {
      api.setSelectedNodeIds([targetNodeId]);
    });
    callOrder.length = 0;
    act(() => {
      api.handleDeleteSelectedNode();
    });
    expect(callOrder).toEqual(['commit', 'change:true']);
    expect(contoursRef.current[0].nodes.length).toBe(4);

    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('useTransformSession performs same-frame move immediately after pointerdown with overrideTargetIds', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const rect: PathContour = {
      id: 'c1',
      closed: true,
      nodes: [
        { id: 'n1', x: 100, y: 100, type: 'corner' },
        { id: 'n2', x: 200, y: 100, type: 'corner' },
        { id: 'n3', x: 200, y: 200, type: 'corner' },
        { id: 'n4', x: 100, y: 200, type: 'corner' },
      ],
    };
    const contoursRef = { current: [rect] } as React.MutableRefObject<PathContour[]>;
    const onCommitHistory = vi.fn();
    const onChangeContours = vi.fn((next: PathContour[]) => {
      contoursRef.current = next;
    });
    let api!: ReturnType<typeof useTransformSession>;

    function Harness() {
      api = useTransformSession({
        contours: [rect],
        contoursRef,
        // Initially empty selectedContourIds before React commits selection
        selectedContourIds: [],
        screenToCanvas: (x, y) => ({ x, y }),
        onChangeContours,
        onCommitHistory,
        gridSettings: {
          showGrid: false,
          gridSize: 50,
          snapToGrid: false,
          snapToGuides: false,
          snapToPoints: false,
          showMetrics: true,
          showPoints: true,
          showHandles: true,
        },
        snapMetrics: {
          lsb: 50,
          advanceWidth: 1000,
          baseline: 800,
          ascender: 800,
          capHeight: 700,
          xHeight: 500,
          descender: 1000,
        },
        customGuidelines: [],
        zoom: 1,
        setActiveSnapGuides: vi.fn(),
      });
      return null;
    }

    act(() => {
      root.render(<Harness />);
    });

    const downEv = {
      clientX: 150,
      clientY: 150,
      pointerId: 1,
      stopPropagation: vi.fn(),
      currentTarget: { setPointerCapture: vi.fn() },
    } as unknown as React.PointerEvent;
    const moveEv = { altKey: true } as unknown as React.PointerEvent<SVGSVGElement>;

    let moved = false;
    act(() => {
      api.handleTransformPointerDown(downEv, 'move', ['c1']);
      moved = api.handleTransformPointerMove({ x: 190, y: 175 }, moveEv);
    });
    expect(moved).toBe(true);
    expect(contoursRef.current[0].nodes[0].x).toBe(140);
    expect(contoursRef.current[0].nodes[0].y).toBe(125);

    act(() => {
      api.handleTransformPointerUp();
    });
    expect(onCommitHistory).toHaveBeenCalledTimes(1);
    expect(onChangeContours).toHaveBeenCalledWith(expect.any(Array), { skipHistory: true });

    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('useShapeCreation supports square & hexagon, preserves sticky center toggle, and centers click-create shapes', () => {
    expect(isShapeToolMode('square')).toBe(true);
    expect(isShapeToolMode('hexagon')).toBe(true);

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const contoursRef = { current: [] as PathContour[] };
    const onCommitHistory = vi.fn();
    const onChangeContours = vi.fn((next: PathContour[]) => {
      contoursRef.current = next;
    });
    let api!: ReturnType<typeof useShapeCreation>;

    function Harness({ toolMode }: { toolMode: ToolMode }) {
      api = useShapeCreation({
        toolMode,
        brushWidth: 32,
        zoom: 1,
        contours: contoursRef.current,
        contoursRef,
        snapMetrics: {
          lsb: 50,
          advanceWidth: 1000,
          baseline: 800,
          ascender: 800,
          capHeight: 700,
          xHeight: 500,
          descender: 1000,
        },
        customGuidelines: [],
        gridSettings: {
          showGrid: false,
          gridSize: 50,
          snapToGrid: false,
          snapToGuides: false,
          snapToPoints: false,
          showMetrics: true,
          showPoints: true,
          showHandles: true,
        },
        onChangeContours,
        onCommitHistory,
        setActiveSnapGuides: vi.fn(),
        setSelectedContourIds: vi.fn(),
        setSelectedContourId: vi.fn(),
      });
      return null;
    }

    act(() => {
      root.render(<Harness toolMode="hexagon" />);
    });

    const hexContours = api.getShapeContoursFromPoints('hexagon', { x: 100, y: 100 }, { x: 300, y: 300 });
    expect(hexContours[0].nodes.length).toBe(6);

    // Sticky isAltFromCenter toggle remains ON across a pointer stroke
    act(() => {
      api.setIsAltFromCenter(true);
    });
    expect(api.isAltFromCenter).toBe(true);

    act(() => {
      api.handleShapePointerDown({ x: 500, y: 500 }, { shiftKey: false, altKey: false } as React.PointerEvent);
    });
    expect(api.isAltFromCenter).toBe(true);

    // Quick click (<10px) even with isAltFromCenter=true creates a 180x180 centered shape around (500, 500)
    act(() => {
      api.handleShapePointerUp({ shiftKey: false, altKey: true } as React.PointerEvent);
    });
    expect(api.isAltFromCenter).toBe(true);
    expect(contoursRef.current.length).toBe(1);
    const xs = contoursRef.current[0].nodes.map((n) => n.x);
    const ys = contoursRef.current[0].nodes.map((n) => n.y);
    const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
    const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;
    expect(Math.abs(centerX - 500)).toBeLessThan(2);
    expect(Math.abs(centerY - 500)).toBeLessThan(2);
    expect(Math.max(...xs) - Math.min(...xs)).toBeLessThanOrEqual(182);

    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('useCanvasPointerDispatcher updates hoverStore when showCursorCrosshair is false and clears pen handle/snap state on pointerup', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    setHoverCanvasPos(null);
    const setSelectedHandleType = vi.fn();
    const setActiveSnapGuides = vi.fn();
    setPenMousePos(null);
    let api!: ReturnType<typeof useCanvasPointerDispatcher>;

    const origRaf = window.requestAnimationFrame;
    const origCancelRaf = window.cancelAnimationFrame;
    window.requestAnimationFrame = (cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    };
    window.cancelAnimationFrame = vi.fn();

    function Harness() {
      const zoomRef = React.useRef(1);
      const panRef = React.useRef({ x: 0, y: 0 });
      const panStartRef = React.useRef({ x: 0, y: 0 });
      const emptyRef = React.useRef<any>(null);
      const emptyArrRef = React.useRef<any[]>([]);
      const falseRef = React.useRef(false);
      const gRef = React.useRef<SVGGElement | null>(null);

      api = useCanvasPointerDispatcher({
        zoom: 1,
        pan: { x: 0, y: 0 },
        setZoom: vi.fn(),
        setPan: vi.fn(),
        zoomRef,
        panRef,
        screenToCanvas: (x, y) => ({ x, y }),
        resetView: vi.fn(),
        containerRef: React.useRef<HTMLDivElement | null>(null),
        isSpacePressed: false,
        isPanning: false,
        setIsPanning: vi.fn(),
        panStartRef,
        toolMode: 'pen',
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
        setSelectedHandleType,
        marqueeSelection: null,
        setMarqueeSelection: vi.fn(),
        setTouchLoupeState: vi.fn(),
        lsb: 50,
        advanceWidth: 1000,
        onChangeLsb: vi.fn(),
        onChangeAdvanceWidth: vi.fn(),
        draggingMetric: null,
        setDraggingMetric: vi.fn(),
        handleBrushPointerDown: vi.fn(),
        handleBrushPointerMove: vi.fn(() => false),
        handleBrushPointerUp: vi.fn(() => false),
        resetBrushDrawing: vi.fn(),
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
        eraserReticleRef: gRef,
        drawingReticleRef: gRef,
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
        setDraggingGuidelineId: vi.fn(),
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
        onChangeTraceSettings: vi.fn(),
        gridSettings: {
          showGrid: true,
          gridSize: 50,
          snapToGrid: false,
          snapToPoints: false,
          showMetrics: true,
          showPoints: true,
          showHandles: true,
          showCursorCrosshair: false,
        },
        snapMetrics: { ascender: 800, capHeight: 700, xHeight: 500, baseline: 800, descender: 1000, advanceWidth: 1000, lsb: 50 },
        customGuidelines: [],
        setActiveSnapGuides,
        onChangeContours: vi.fn(),
        onUndo: vi.fn(),
        onRedo: vi.fn(),
        showCanvasToast: vi.fn(),
        isGlyphLocked: false,
      });
      return null;
    }

    act(() => {
      root.render(<Harness />);
    });

    const moveEvent = {
      pointerId: 1,
      pointerType: 'mouse',
      clientX: 345,
      clientY: 456,
      pressure: 0,
    } as unknown as React.PointerEvent<SVGSVGElement>;

    act(() => {
      api.handlePointerMove(moveEvent);
    });
    expect(getHoverCanvasPos()).toEqual({ x: 345, y: 456 });
    // H12: pen pointermove writes the pen-only store immediately, so the
    // rubber-band does not wait for the throttled hover update.
    expect(getPenMousePos()).toEqual({ x: 345, y: 456 });

    const upEvent = {
      pointerId: 1,
      pointerType: 'mouse',
      altKey: false,
      currentTarget: { hasPointerCapture: () => false, releasePointerCapture: vi.fn() },
    } as unknown as React.PointerEvent<SVGSVGElement>;

    act(() => {
      api.handlePointerUp(upEvent);
    });
    expect(setSelectedHandleType).toHaveBeenCalledWith(null);
    expect(setActiveSnapGuides).toHaveBeenCalledWith([]);

    window.requestAnimationFrame = origRaf;
    window.cancelAnimationFrame = origCancelRaf;
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('CanvasBackgroundLayer draws center-aligned minor/major vector grid lines without <pattern> or crispEdges and fades minor lines at low zoom', () => {
    clearLiveViewport();
    setLiveViewport(1, { x: 0, y: 0 });
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <svg>
          <CanvasBackgroundLayer isLight={true} showGrid={true} gridSize={128} unitsPerEm={1000} />
        </svg>
      );
    });

    expect(container.querySelector('pattern')).toBeNull();
    const gridPaths = Array.from(container.querySelectorAll('path[data-grid-tier]'));
    expect(gridPaths.length).toBe(2);
    gridPaths.forEach((p) => {
      expect(p.getAttribute('vector-effect')).toBe('non-scaling-stroke');
      expect(p.getAttribute('shape-rendering')).toBeNull();
    });

    // H13: pre-faead31 opacities (minor 0.36, major 0.72) at the shared
    // default gridOpacity of 30.
    expect(DEFAULT_GRID_SIZE).toBe(50);
    expect(DEFAULT_GRID_OPACITY).toBe(30);
    expect(gridPaths[0].getAttribute('opacity')).toBe('0.108');
    expect(gridPaths[1].getAttribute('opacity')).toBe('0.216');

    const minorD = gridPaths[0].getAttribute('d') || '';
    const majorD = gridPaths[1].getAttribute('d') || '';
    // Center (500) is always on major axis; 500 +/- 128 -> 372, 628 are on minor
    expect(majorD).toContain('M500 0V1000');
    expect(minorD).toContain('M372 0V1000');
    expect(minorD).toContain('M628 0V1000');

    // When gridSize=10 and zoom drops to 0.2 (2px screen cells), minor grid fades out cleanly while major stays
    act(() => {
      setLiveViewport(0.2, { x: 0, y: 0 });
    });
    act(() => {
      root.render(
        <svg>
          <CanvasBackgroundLayer isLight={true} showGrid={true} gridSize={10} unitsPerEm={1000} />
        </svg>
      );
    });

    const lowZoomGridPaths = Array.from(container.querySelectorAll('path[data-grid-tier]'));
    expect(lowZoomGridPaths.length).toBe(1);
    expect(lowZoomGridPaths[0].getAttribute('data-grid-tier')).toBe('major');

    act(() => {
      root.unmount();
    });
    clearLiveViewport();
    container.remove();
  });

  it('MetricsGuidesLayer and JapaneseGuidesLayer use sharp frame corners, fixed canvas anchors, and ignore pan-only updates', () => {
    clearLiveViewport();
    setLiveViewport(0.5, { x: 0, y: 0 });
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    let zoomRenderCount = 0;
    const ZoomRenderCounter = () => {
      zoomRenderCount++;
      useLiveViewportZoom();
      return null;
    };

    act(() => {
      root.render(
        <svg>
          <ZoomRenderCounter />
          <MetricsGuidesLayer showMetrics={true} lsb={50} advanceWidth={1000} unitsPerEm={1000} />
          <JapaneseGuidesLayer
            guideType="cross"
            verticalGuide="center"
            showBodyFrame={true}
            showKanaFrame={true}
            isLight={true}
            unitsPerEm={1000}
          />
        </svg>
      );
    });

    // Typography frames (漢字枠 / かな枠) must have sharp 90-degree corners (no rx rounding)
    const frameRects = Array.from(container.querySelectorAll('g.japanese-guides-layer rect'));
    expect(frameRects.length).toBe(2);
    frameRects.forEach((rect) => {
      expect(rect.getAttribute('rx')).toBeNull();
    });

    const findLabelTransform = (labelText: string) => {
      const textEl = Array.from(container.querySelectorAll('text')).find((t) =>
        (t.textContent || '').includes(labelText)
      );
      return textEl?.parentElement?.getAttribute('transform') || '';
    };

    expect(findLabelTransform('Ascender')).toBe('translate(1000, 0) scale(2)');
    expect(findLabelTransform('Baseline')).toBe('translate(0, 800) scale(2)');
    expect(findLabelTransform('Center (500)')).toBe('translate(500, 1000) scale(2)');
    expect(findLabelTransform('漢字枠 (85%)')).toBe('translate(75, 75) scale(2)');
    expect(findLabelTransform('かな枠 (78%)')).toBe('translate(890, 110) scale(2)');
    expect(findLabelTransform('X:500')).toBe('translate(500, 1000) scale(2)');

    act(() => {
      setLiveViewport(0.5, { x: 0, y: 0 });
    });

    // Pan-only updates with identical zoom must NOT re-render zoom subscribers
    const rendersBeforePan = zoomRenderCount;
    act(() => {
      setLiveViewport(0.5, { x: 100, y: 200 });
      setLiveViewport(0.5, { x: 140, y: 260 });
    });
    expect(zoomRenderCount).toBe(rendersBeforePan);

    // Updating liveViewport zoom rescales labels in-place without moving anchor coordinates
    act(() => {
      setLiveViewport(2, { x: 10, y: 20 });
    });
    expect(zoomRenderCount).toBe(rendersBeforePan + 1);

    expect(findLabelTransform('Ascender')).toBe('translate(1000, 0) scale(0.5)');
    expect(findLabelTransform('Baseline')).toBe('translate(0, 800) scale(0.5)');
    expect(findLabelTransform('Center (500)')).toBe('translate(500, 1000) scale(0.5)');
    expect(findLabelTransform('漢字枠 (85%)')).toBe('translate(75, 75) scale(0.5)');
    expect(findLabelTransform('かな枠 (78%)')).toBe('translate(890, 110) scale(0.5)');
    expect(findLabelTransform('X:500')).toBe('translate(500, 1000) scale(0.5)');

    // Japanese character hides Latin text clutter and suppressCenterLine deduplicates Center (500)
    act(() => {
      setLiveViewport(2, { x: 0, y: 0 });
    });
    act(() => {
      root.render(
        <svg>
          <MetricsGuidesLayer
            showMetrics={true}
            suppressCenterLine={true}
            activeChar="あ"
            lsb={50}
            advanceWidth={1000}
            unitsPerEm={1000}
          />
        </svg>
      );
    });
    const textLabels = Array.from(container.querySelectorAll('text')).map((t) => t.textContent || '');
    expect(textLabels.some((t) => t.includes('Ascender'))).toBe(false);
    expect(textLabels.some((t) => t.includes('Center (500)'))).toBe(false);
    expect(textLabels.some((t) => t.includes('LSB 50'))).toBe(true);

    act(() => {
      root.unmount();
    });
    clearLiveViewport();
    container.remove();
  });

  it('CanvasRulersLayer adapts tick spacing, tracks liveViewport, and updates hover markers via DOM without re-rendering', () => {
    clearLiveViewport();
    setHoverCanvasPos(null);
    setLiveViewport(0.5, { x: 40, y: 40 });
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <svg>
          <CanvasRulersLayer
            showRulers={true}
            isLight={true}
            unitsPerEm={1000}
            width={800}
            height={600}
          />
        </svg>
      );
    });

    expect(container.querySelector('#topRulerClip')).not.toBeNull();
    expect(container.querySelector('#leftRulerClip')).not.toBeNull();
    // At zoom 0.5, smallest candidate >= 56px is step=200 (0.5 * 200 = 100 >= 56)
    const topTextsAtHalf = Array.from(
      container.querySelectorAll('g[clip-path="url(#topRulerClip)"] text')
    ).map((t) => Number(t.textContent));
    expect(topTextsAtHalf).toContain(0);
    expect(topTextsAtHalf).toContain(200);
    expect(topTextsAtHalf).not.toContain(50);

    // Moving hover cursor updates red indicator lines directly in DOM
    act(() => {
      setHoverCanvasPos({ x: 200, y: 300 });
    });
    const topRedLine = container.querySelector('g[clip-path="url(#topRulerClip)"] line[stroke="#ef4444"]');
    expect(topRedLine?.getAttribute('x1')).toBe('140'); // 40 + 200 * 0.5
    expect((topRedLine as SVGLineElement | null)?.style.display).not.toBe('none');

    // Zooming in via liveViewport store increases tick density without prop update
    act(() => {
      setLiveViewport(2, { x: 40, y: 40 });
    });
    const topTextsAtTwo = Array.from(
      container.querySelectorAll('g[clip-path="url(#topRulerClip)"] text')
    ).map((t) => Number(t.textContent));
    // At zoom 2, step=50 (2 * 50 = 100 >= 56)
    expect(topTextsAtTwo).toContain(50);

    act(() => {
      root.unmount();
    });
    setHoverCanvasPos(null);
    clearLiveViewport();
    container.remove();
  });

  it('useBrushDrawing generates fast live SVG preview on pointermove and commits contour only on finalize', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const origRaf = window.requestAnimationFrame;
    const origCancelRaf = window.cancelAnimationFrame;
    window.requestAnimationFrame = (cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    };
    window.cancelAnimationFrame = vi.fn();

    const onChangeContours = vi.fn();
    const onCommitHistory = vi.fn();
    let api!: ReturnType<typeof useBrushDrawing>;

    function Harness() {
      const contoursRef = React.useRef<PathContour[]>([]);
      api = useBrushDrawing({
        toolMode: 'brush',
        brushWidth: 32,
        brushStyle: 'brush',
        pressureSensitivity: 'normal',
        smoothingIntensity: 50,
        screenToCanvas: (x, y) => ({ x, y }),
        contoursRef,
        onChangeContours,
        onCommitHistory,
      });
      return (
        <svg>
          <path ref={api.activeBrushPathRef} />
        </svg>
      );
    }

    act(() => {
      root.render(<Harness />);
    });

    const downEv = {
      pointerType: 'mouse',
      clientX: 100,
      clientY: 100,
      pressure: 0.5,
      shiftKey: false,
      timeStamp: 100,
    } as unknown as React.PointerEvent<SVGSVGElement>;

    act(() => {
      api.handleBrushPointerDown(downEv, { x: 100, y: 100 });
      api.handleBrushPointerMove({
        ...downEv,
        clientX: 180,
        clientY: 140,
        timeStamp: 140,
      } as unknown as React.PointerEvent<SVGSVGElement>);
      api.handleBrushPointerMove({
        ...downEv,
        clientX: 280,
        clientY: 220,
        timeStamp: 200,
      } as unknown as React.PointerEvent<SVGSVGElement>);
    });

    expect(api.activeBrushSvgDRef.current.length).toBeGreaterThan(0);
    expect(api.activeBrushPathRef.current?.getAttribute('d')).toBe(api.activeBrushSvgDRef.current);
    expect(onChangeContours).not.toHaveBeenCalled();

    const dateNowOrig = Date.now;
    Date.now = () => dateNowOrig() + 200;
    act(() => {
      api.finalizeBrushDrawing();
    });
    Date.now = dateNowOrig;

    expect(onCommitHistory).toHaveBeenCalledTimes(1);
    expect(onChangeContours).toHaveBeenCalledTimes(1);
    const committedContours = onChangeContours.mock.calls[0][0] as PathContour[];
    expect(committedContours.length).toBe(1);
    expect(committedContours[0].closed).toBe(true);
    expect(committedContours[0].nodes.length).toBeGreaterThanOrEqual(3);

    window.requestAnimationFrame = origRaf;
    window.cancelAnimationFrame = origCancelRaf;
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('groupContoursWithHoles and normalizeGlyphContoursWinding preserve outer/hole grouping and winding invariants', () => {
    const makeRectContour = (
      id: string,
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      clockwise: boolean
    ): PathContour => {
      const pts = clockwise
        ? [
            { x: x1, y: y1 },
            { x: x2, y: y1 },
            { x: x2, y: y2 },
            { x: x1, y: y2 },
          ]
        : [
            { x: x1, y: y1 },
            { x: x1, y: y2 },
            { x: x2, y: y2 },
            { x: x2, y: y1 },
          ];
      return {
        id,
        closed: true,
        nodes: pts.map((p, idx) => ({
          id: `${id}-${idx}`,
          x: p.x,
          y: p.y,
          type: 'corner',
          handleIn: null,
          handleOut: null,
        })),
      };
    };

    const outer1 = makeRectContour('outer1', 100, 100, 600, 600, false); // reversed initially
    const hole1 = makeRectContour('hole1', 200, 200, 400, 400, true); // nested inside outer1, reversed initially
    const outer2 = makeRectContour('outer2', 450, 150, 850, 550, true); // overlaps outer1 without enclosing hole1

    const groups = groupContoursWithHoles([outer1, hole1, outer2]);
    expect(groups.length).toBe(2);
    expect(groups.find((g) => g.some((c) => c.id === 'outer1'))?.map((c) => c.id)).toEqual([
      'outer1',
      'hole1',
    ]);
    expect(groups.find((g) => g.some((c) => c.id === 'outer2'))?.map((c) => c.id)).toEqual([
      'outer2',
    ]);

    const normalized = normalizeGlyphContoursWinding([outer1, hole1, outer2]);
    expect(getContourSignedArea(normalized[0])).toBeGreaterThan(0);
    expect(getContourSignedArea(normalized[1])).toBeLessThan(0);
    expect(getContourSignedArea(normalized[2])).toBeGreaterThan(0);
  });
});

describe('AdjacentGlyphsLayer zoom normalization (L7)', () => {
  it('keeps the neighbour labels a constant screen size at high zoom', () => {
    clearLiveViewport();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <svg>
          <AdjacentGlyphsLayer isLight={true} advanceWidth={1000} unitsPerEm={1000} zoom={4} />
        </svg>
      );
    });

    const labels = Array.from(container.querySelectorAll('text'));
    expect(labels.length).toBe(2);
    labels.forEach((label) => {
      expect(label.getAttribute('font-size')).toBe('6');
    });

    act(() => {
      root.unmount();
    });
    clearLiveViewport();
    container.remove();
  });
});

describe('Selection, Transform, Node & ContextMenu remediation tests', () => {
  it('InteractiveContourHitLayer keeps wide transparent hit stroke for selected contours in node mode and ignores right-click', () => {
    clearLiveViewport();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const handleInsertNodeOnContour = vi.fn(() => true);
    const contour: PathContour = {
      id: 'c1',
      closed: true,
      nodes: [
        { id: 'n1', x: 100, y: 100, type: 'corner', handleIn: null, handleOut: null },
        { id: 'n2', x: 300, y: 100, type: 'corner', handleIn: null, handleOut: null },
        { id: 'n3', x: 300, y: 300, type: 'corner', handleIn: null, handleOut: null },
      ],
    };
    const svgMap = new Map([['c1', 'M 100 100 L 300 100 L 300 300 Z']]);

    act(() => {
      root.render(
        <svg>
          <InteractiveContourHitLayer
            contours={[contour]}
            selectedContourIds={['c1']}
            contourSvgMap={svgMap}
            selectionColor="#10b981"
            toolMode="node"
            screenToCanvas={(x, y) => ({ x, y })}
            onChangeContours={vi.fn()}
            setSelectedContourId={vi.fn()}
            setSelectedContourIds={vi.fn()}
            setSelectedNodeId={vi.fn()}
            setSelectedHandleType={vi.fn()}
            nodeDragSessionRef={{ current: null }}
            handleInsertNodeOnContour={handleInsertNodeOnContour}
            showCanvasToast={vi.fn()}
            handleTransformPointerDown={vi.fn()}
          />
        </svg>
      );
    });

    const paths = Array.from(container.querySelectorAll('path'));
    expect(paths.length).toBe(2);
    const visualPath = paths[0];
    const hitPath = paths[1];
    expect(visualPath.getAttribute('pointer-events')).toBe('none');
    expect(hitPath.getAttribute('stroke')).toBe('transparent');
    expect(Number(hitPath.getAttribute('stroke-width'))).toBeGreaterThanOrEqual(18);

    // Right-click pointerdown must be ignored
    act(() => {
      hitPath.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse', button: 2 }));
    });
    expect(handleInsertNodeOnContour).not.toHaveBeenCalled();

    // Left-click triggers node insertion handler
    act(() => {
      hitPath.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse', button: 0 }));
    });
    expect(handleInsertNodeOnContour).toHaveBeenCalledTimes(1);

    act(() => {
      root.unmount();
    });
    clearLiveViewport();
    container.remove();
  });

  it('BezierNodeControlsLayer activates all contours in selectedContourIds and renders symmetric nodes as circles', () => {
    clearLiveViewport();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const c1: PathContour = {
      id: 'c1',
      closed: true,
      nodes: [
        {
          id: 'n1',
          x: 100,
          y: 100,
          type: 'symmetric',
          handleIn: { x: 80, y: 100 },
          handleOut: { x: 120, y: 100 },
        },
        { id: 'n2', x: 200, y: 100, type: 'corner', handleIn: null, handleOut: null },
      ],
    };
    const c2: PathContour = {
      id: 'c2',
      closed: true,
      nodes: [
        {
          id: 'n3',
          x: 300,
          y: 300,
          type: 'smooth',
          handleIn: { x: 280, y: 300 },
          handleOut: { x: 320, y: 300 },
        },
      ],
    };
    const svgMap = new Map([
      ['c1', 'M 100 100 L 200 100 Z'],
      ['c2', 'M 300 300 Z'],
    ]);

    act(() => {
      root.render(
        <svg>
          <BezierNodeControlsLayer
            showNodes
            contours={[c1, c2]}
            contourSvgMap={svgMap}
            toolMode="node"
            eraserMode="stroke"
            eraserSize={20}
            selectedContourId="c1"
            selectedContourIds={['c1', 'c2']}
            selectedNodeId="n3"
            selectedNodeIds={['n1', 'n3']}
            nodeStyle="clean"
            gridSettings={{
              showGrid: false,
              gridSize: 50,
              showMetrics: false,
              showPoints: true,
              showHandles: false,
              snapToGrid: false,
              snapToPoints: false,
              snapToGuides: false,
            }}
            isLight
            startNodeOrHandleDrag={vi.fn()}
            handleToggleNodeType={vi.fn()}
          />
        </svg>
      );
    });

    // Both c1 and c2 are active: handle lines rendered for n1 and n3
    const lines = container.querySelectorAll('line');
    expect(lines.length).toBe(4);
    // Symmetric node n1 has a dashed red selection <circle>, not a <rect>
    const dashedSelectionCircles = Array.from(container.querySelectorAll('circle')).filter(
      (el) => el.getAttribute('stroke') === '#ef4444'
    );
    expect(dashedSelectionCircles.length).toBe(2);

    act(() => {
      root.unmount();
    });
    clearLiveViewport();
    container.remove();
  });

  it('useTransformSession supports inward proportional Shift corner shrink and clears snap guides on cancel', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const rect: PathContour = {
      id: 'c1',
      closed: true,
      nodes: [
        { id: 'n1', x: 100, y: 100, type: 'corner' },
        { id: 'n2', x: 300, y: 100, type: 'corner' },
        { id: 'n3', x: 300, y: 300, type: 'corner' },
        { id: 'n4', x: 100, y: 300, type: 'corner' },
      ],
    };
    const contoursRef = { current: [rect] } as React.MutableRefObject<PathContour[]>;
    const setActiveSnapGuides = vi.fn();
    let api!: ReturnType<typeof useTransformSession>;

    function Harness() {
      api = useTransformSession({
        contours: [rect],
        contoursRef,
        selectedContourIds: ['c1'],
        screenToCanvas: (x, y) => ({ x, y }),
        onChangeContours: (next) => {
          contoursRef.current = next;
        },
        onCommitHistory: vi.fn(),
        gridSettings: {
          showGrid: false,
          gridSize: 50,
          snapToGrid: false,
          snapToGuides: false,
          snapToPoints: false,
          showMetrics: true,
          showPoints: true,
          showHandles: true,
        },
        snapMetrics: {
          lsb: 50,
          advanceWidth: 1000,
          baseline: 800,
          ascender: 800,
          capHeight: 700,
          xHeight: 500,
          descender: 1000,
        },
        customGuidelines: [],
        zoom: 1,
        setActiveSnapGuides,
      });
      return null;
    }

    act(() => {
      root.render(<Harness />);
    });

    const downEv = {
      pointerType: 'mouse',
      button: 0,
      clientX: 300,
      clientY: 300,
      pointerId: 1,
      stopPropagation: vi.fn(),
      currentTarget: { setPointerCapture: vi.fn() },
    } as unknown as React.PointerEvent;
    // Shrink SE corner proportionally inward: X moved -100px (0.5x), Y moved -40px (0.8x)
    const moveEv = { shiftKey: true, altKey: false } as unknown as React.PointerEvent<SVGSVGElement>;

    act(() => {
      api.handleTransformPointerDown(downEv, 'se', ['c1']);
      api.handleTransformPointerMove({ x: 200, y: 260 }, moveEv);
    });
    // Dominant deviation from 1 is 0.5x, so height must shrink to 100 (from 200) -> maxY = 200
    const xs = contoursRef.current[0].nodes.map((n) => n.x);
    const ys = contoursRef.current[0].nodes.map((n) => n.y);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(100, 1);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(100, 1);

    setActiveSnapGuides.mockClear();
    act(() => {
      api.cancelTransformSession();
    });
    expect(setActiveSnapGuides).toHaveBeenCalledWith([]);

    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('CanvasContextMenu displays node operations and keeps Select All Nodes visible even with selection', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const onToggleNodeType = vi.fn();
    const onAddNode = vi.fn();
    const onDeleteSelectedNode = vi.fn();
    const onSelectAllNodes = vi.fn();

    act(() => {
      root.render(
        <CanvasContextMenu
          isOpen
          x={100}
          y={100}
          onClose={vi.fn()}
          theme="light"
          hasSelection
          selectedContourCount={1}
          contourCount={2}
          toolMode="node"
          selectedNodeCount={1}
          onToggleNodeType={onToggleNodeType}
          onAddNode={onAddNode}
          onDeleteSelectedNode={onDeleteSelectedNode}
          onSelectAllNodes={onSelectAllNodes}
        />
      );
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const findBtn = (txt: string) => buttons.find((b) => b.textContent?.includes(txt));
    expect(findBtn('角 ⇄ スムーズ切替')).toBeDefined();
    expect(findBtn('中間頂点を追加')).toBeDefined();
    expect(findBtn('選択頂点を削除')).toBeDefined();
    expect(findBtn('すべてのノードを選択')).toBeDefined();

    act(() => {
      findBtn('中間頂点を追加')?.click();
    });
    expect(onAddNode).toHaveBeenCalledTimes(1);

    act(() => {
      root.unmount();
    });
    container.remove();
  });
});
