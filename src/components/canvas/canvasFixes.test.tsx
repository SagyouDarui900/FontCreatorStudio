// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { useToolModeCleanup } from './hooks/useToolModeCleanup';
import { SmartSnapGuidesLayer } from './SmartSnapGuidesLayer';
import { useCanvasPointerDispatcher } from './hooks/useCanvasPointerDispatcher';
import {
  getLineSegmentIntersection,
  findContourIntersections,
  unionContours,
} from '../../utils/path/booleanOperations';
import {
  sliceOpenContourWithEraser,
  subtractEraserStrokeFromClosedContours,
} from '../../utils/path/eraser';
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
        setPenMousePos: vi.fn(),
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
        setPenMousePos: vi.fn(),
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
        hoverCanvasPos: null,
        setHoverCanvasPos: vi.fn(),
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
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <svg>
          <SmartSnapGuidesLayer
            zoom={1}
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
});
