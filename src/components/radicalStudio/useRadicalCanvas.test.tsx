// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { useRadicalCanvas } from './useRadicalCanvas';
import { CustomPart, PathContour, ToolMode } from '../../types';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

function createRectPart(): CustomPart {
  return {
    id: 'part-1',
    name: 'テスト部品',
    category: 'other',
    contours: [
      {
        id: 'c1',
        closed: true,
        nodes: [
          { id: 'n1', x: 100, y: 100, type: 'corner', handleIn: null, handleOut: null },
          { id: 'n2', x: 300, y: 100, type: 'corner', handleIn: null, handleOut: null },
          { id: 'n3', x: 300, y: 300, type: 'corner', handleIn: null, handleOut: null },
          { id: 'n4', x: 100, y: 300, type: 'corner', handleIn: null, handleOut: null },
        ],
      },
    ],
    createdAt: 1000,
    updatedAt: 1000,
  };
}

function makePointerEvent(
  type: string,
  clientX: number,
  clientY: number,
  opts: Partial<{ pointerId: number; pointerType: string; button: number; shiftKey: boolean }> = {}
): React.PointerEvent<SVGSVGElement> {
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  return {
    type,
    clientX,
    clientY,
    pointerId: opts.pointerId ?? 1,
    pointerType: opts.pointerType ?? 'mouse',
    button: opts.button ?? 0,
    pressure: 0.5,
    timeStamp: Date.now(),
    shiftKey: opts.shiftKey ?? false,
    currentTarget: el,
    target: el,
    nativeEvent: {
      pointerType: opts.pointerType ?? 'mouse',
      pressure: 0.5,
      timeStamp: Date.now(),
      clientX,
      clientY,
    },
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  } as unknown as React.PointerEvent<SVGSVGElement>;
}

describe('useRadicalCanvas bug & leak fixes', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prevents runaway double-add node drag deltas across same-frame pointermove events', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    let api!: ReturnType<typeof useRadicalCanvas>;
    let latestParts: CustomPart[] = [createRectPart()];
    const setUndoStack = vi.fn();

    function Harness() {
      const [parts, setParts] = React.useState<CustomPart[]>(latestParts);
      latestParts = parts;
      const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(null);
      const [selectedContourId, setSelectedContourId] = React.useState<string | null>(null);
      const [toolMode, setToolMode] = React.useState<ToolMode>('select');
      const [zoom, setZoom] = React.useState(1);
      const [pan, setPan] = React.useState({ x: 0, y: 0 });
      const [activeSnapLines, setActiveSnapLines] = React.useState<{ x: number | null; y: number | null }>({ x: null, y: null });

      api = useRadicalCanvas({
        activePart: parts[0],
        commitPartChange: (contours) => {
          setParts((prev) => prev.map((p) => ({ ...p, contours })));
        },
        toolMode,
        setToolMode,
        brushStyle: 'marumoji',
        brushWidth: 40,
        isStraightMode: false,
        pressureSensitivity: 'off',
        eraserMode: 'stroke',
        eraserRadius: 20,
        isAutoUnionMode: false,
        notify: vi.fn(),
        zoom,
        setZoom,
        pan,
        setPan,
        isSpacePressed: false,
        selectedNodeId,
        setSelectedNodeId,
        selectedContourId,
        setSelectedContourId,
        activeSnapLines,
        setActiveSnapLines,
        setParts,
        isSnapEnabled: false,
        showGrid: false,
        setUndoStack,
        setRedoStack: vi.fn(),
      });

      return <svg ref={api.svgCanvasRef} />;
    }

    act(() => {
      root.render(<Harness />);
    });

    vi.spyOn(api.svgCanvasRef.current!, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 1000,
      height: 1000,
      right: 1000,
      bottom: 1000,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    act(() => {
      // Grab node n1 at (100, 100), move synchronously in 3 steps to (130, 100)
      api.handlePointerDown(makePointerEvent('pointerdown', 100, 100));
      api.handlePointerMove(makePointerEvent('pointermove', 110, 100));
      api.handlePointerMove(makePointerEvent('pointermove', 120, 100));
      api.handlePointerMove(makePointerEvent('pointermove', 130, 100));
      api.handlePointerUp(makePointerEvent('pointerup', 130, 100));
    });

    const movedNode = latestParts[0].contours[0].nodes.find((n) => n.id === 'n1')!;
    expect(movedNode.x).toBe(130);
    expect(movedNode.y).toBe(100);
    expect(setUndoStack).toHaveBeenCalledTimes(1);

    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('commits node eraser deletions even when the contour survives with fewer nodes', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    let api!: ReturnType<typeof useRadicalCanvas>;
    let latestParts: CustomPart[] = [createRectPart()];
    const setUndoStack = vi.fn();

    function Harness() {
      const [parts, setParts] = React.useState<CustomPart[]>(latestParts);
      latestParts = parts;
      const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(null);
      const [selectedContourId, setSelectedContourId] = React.useState<string | null>(null);
      const [toolMode, setToolMode] = React.useState<ToolMode>('eraser');
      const [zoom, setZoom] = React.useState(1);
      const [pan, setPan] = React.useState({ x: 0, y: 0 });
      const [activeSnapLines, setActiveSnapLines] = React.useState<{ x: number | null; y: number | null }>({ x: null, y: null });

      api = useRadicalCanvas({
        activePart: parts[0],
        commitPartChange: (contours) => {
          setParts((prev) => prev.map((p) => ({ ...p, contours })));
        },
        toolMode,
        setToolMode,
        brushStyle: 'marumoji',
        brushWidth: 40,
        isStraightMode: false,
        pressureSensitivity: 'off',
        eraserMode: 'node',
        eraserRadius: 20,
        isAutoUnionMode: false,
        notify: vi.fn(),
        zoom,
        setZoom,
        pan,
        setPan,
        isSpacePressed: false,
        selectedNodeId,
        setSelectedNodeId,
        selectedContourId,
        setSelectedContourId,
        activeSnapLines,
        setActiveSnapLines,
        setParts,
        isSnapEnabled: false,
        showGrid: false,
        setUndoStack,
        setRedoStack: vi.fn(),
      });

      return <svg ref={api.svgCanvasRef} />;
    }

    act(() => {
      root.render(<Harness />);
    });

    vi.spyOn(api.svgCanvasRef.current!, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 1000,
      height: 1000,
      right: 1000,
      bottom: 1000,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    act(() => {
      api.handlePointerDown(makePointerEvent('pointerdown', 100, 100));
      api.handlePointerUp(makePointerEvent('pointerup', 100, 100));
    });

    expect(latestParts[0].contours.length).toBe(1);
    expect(latestParts[0].contours[0].nodes.length).toBe(3);
    expect(setUndoStack).toHaveBeenCalledTimes(1);

    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('clears touch pinch tracking on pointercancel so subsequent single-pointer strokes work, supports rounded_rect, and cancels rAF on unmount', () => {
    const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame');
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 4242);

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    let api!: ReturnType<typeof useRadicalCanvas>;
    let committedContours: PathContour[] = [];

    function Harness({ tool }: { tool: ToolMode }) {
      const [parts, setParts] = React.useState<CustomPart[]>([createRectPart()]);
      const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(null);
      const [selectedContourId, setSelectedContourId] = React.useState<string | null>(null);
      const [zoom, setZoom] = React.useState(1);
      const [pan, setPan] = React.useState({ x: 0, y: 0 });
      const [activeSnapLines, setActiveSnapLines] = React.useState<{ x: number | null; y: number | null }>({ x: null, y: null });

      api = useRadicalCanvas({
        activePart: parts[0],
        commitPartChange: (contours) => {
          committedContours = contours;
          setParts((prev) => prev.map((p) => ({ ...p, contours })));
        },
        toolMode: tool,
        setToolMode: vi.fn(),
        brushStyle: 'marumoji',
        brushWidth: 40,
        isStraightMode: false,
        pressureSensitivity: 'off',
        eraserMode: 'stroke',
        eraserRadius: 20,
        isAutoUnionMode: false,
        notify: vi.fn(),
        zoom,
        setZoom,
        pan,
        setPan,
        isSpacePressed: false,
        selectedNodeId,
        setSelectedNodeId,
        selectedContourId,
        setSelectedContourId,
        activeSnapLines,
        setActiveSnapLines,
        setParts,
        isSnapEnabled: false,
        showGrid: false,
        setUndoStack: vi.fn(),
        setRedoStack: vi.fn(),
      });

      return <svg ref={api.svgCanvasRef} />;
    }

    act(() => {
      root.render(<Harness tool="rounded_rect" />);
    });

    vi.spyOn(api.svgCanvasRef.current!, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 1000,
      height: 1000,
      right: 1000,
      bottom: 1000,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    // Verify rounded_rect generates smooth Bezier corner nodes (more than 4 rectangle corners)
    const roundedContours = api.getShapeContours('rounded_rect', { x: 100, y: 100 }, { x: 300, y: 300 });
    expect(roundedContours.length).toBe(1);
    expect(roundedContours[0].nodes.length).toBeGreaterThan(4);

    // Enter two-touch pinch then cancel both pointers via pointercancel
    act(() => {
      api.handlePointerDown(makePointerEvent('pointerdown', 100, 100, { pointerId: 10, pointerType: 'touch' }));
      api.handlePointerDown(makePointerEvent('pointerdown', 200, 200, { pointerId: 11, pointerType: 'touch' }));
      api.handlePointerCancel(makePointerEvent('pointercancel', 100, 100, { pointerId: 10, pointerType: 'touch' }));
      api.handlePointerCancel(makePointerEvent('pointercancel', 200, 200, { pointerId: 11, pointerType: 'touch' }));
    });

    // Single touch shape creation in same frame should commit properly without stuck pinch state
    act(() => {
      api.handlePointerDown(makePointerEvent('pointerdown', 150, 150, { pointerId: 12, pointerType: 'touch' }));
      api.handlePointerMove(makePointerEvent('pointermove', 350, 350, { pointerId: 12, pointerType: 'touch' }));
      api.handlePointerUp(makePointerEvent('pointerup', 350, 350, { pointerId: 12, pointerType: 'touch' }));
    });
    expect(committedContours.length).toBe(2);

    // Start brush stroke to schedule rAF, then unmount to verify cancelAnimationFrame
    act(() => {
      root.render(<Harness tool="brush" />);
    });
    vi.spyOn(api.svgCanvasRef.current!, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 1000,
      height: 1000,
      right: 1000,
      bottom: 1000,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    act(() => {
      api.handlePointerDown(makePointerEvent('pointerdown', 100, 100));
      api.handlePointerMove(makePointerEvent('pointermove', 150, 150));
    });

    act(() => {
      root.unmount();
    });
    expect(cancelSpy).toHaveBeenCalledWith(4242);
    container.remove();
  });
});
