// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { usePixelDrawing } from './usePixelDrawing';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

function makeCanvasPointerEvent(
  type: string,
  clientX: number,
  clientY: number,
  pointerId = 1,
  button = 0
): React.PointerEvent<HTMLCanvasElement> {
  const el = document.createElement('canvas');
  el.setPointerCapture = () => {
    throw new DOMException('Invalid pointer', 'NotFoundError');
  };
  el.hasPointerCapture = () => false;
  el.releasePointerCapture = () => {};
  return {
    type,
    clientX,
    clientY,
    pointerId,
    button,
    target: el,
    currentTarget: el,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  } as unknown as React.PointerEvent<HTMLCanvasElement>;
}

describe('usePixelDrawing synchronous ref & pointer capture fixes', () => {
  it('commits same-frame shape drag and pencil strokes reliably even when setPointerCapture throws', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const gridWidth = 16;
    const gridHeight = 16;
    const currentGridRef = { current: new Uint8Array(gridWidth * gridHeight) };
    const pushHistory = vi.fn();
    let api!: ReturnType<typeof usePixelDrawing>;

    function Harness() {
      const [grid, setGrid] = React.useState<Uint8Array>(currentGridRef.current);
      const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
      api = usePixelDrawing({
        gridWidth,
        gridHeight,
        grid,
        setGrid,
        currentGridRef,
        pushHistory,
        canvasRef,
      });
      return <canvas ref={canvasRef} width={160} height={160} />;
    }

    act(() => {
      root.render(<Harness />);
    });

    const canvas = container.querySelector('canvas')!;
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 160,
      height: 160,
      right: 160,
      bottom: 160,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    // Switch to rect tool
    act(() => {
      api.setTool('rect_filled');
    });

    // Fire pointerdown + pointermove + pointerup within the same act() batch before React re-renders isDrawing/drawStartPos
    act(() => {
      api.handlePointerDown(makeCanvasPointerEvent('pointerdown', 15, 15)); // cell (1, 1)
      api.handlePointerMove(makeCanvasPointerEvent('pointermove', 35, 35)); // cell (3, 3)
      api.handlePointerUp(makeCanvasPointerEvent('pointerup', 35, 35));
    });

    expect(pushHistory).toHaveBeenCalledTimes(1);
    const committed = pushHistory.mock.calls[0][0] as Uint8Array;
    // 3x3 filled rect from (1,1) to (3,3) = 9 pixels
    const filledCount = committed.reduce((acc, v) => acc + v, 0);
    expect(filledCount).toBe(9);

    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('ignores middle mouse clicks and resets erase state after pointercancel on right-click strokes', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const gridWidth = 16;
    const gridHeight = 16;
    const currentGridRef = { current: new Uint8Array(gridWidth * gridHeight) };
    const pushHistory = vi.fn();
    let api!: ReturnType<typeof usePixelDrawing>;

    function Harness() {
      const [grid, setGrid] = React.useState<Uint8Array>(currentGridRef.current);
      const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
      api = usePixelDrawing({
        gridWidth,
        gridHeight,
        grid,
        setGrid,
        currentGridRef,
        pushHistory,
        canvasRef,
      });
      return <canvas ref={canvasRef} width={160} height={160} />;
    }

    act(() => {
      root.render(<Harness />);
    });

    const canvas = container.querySelector('canvas')!;
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 160,
      height: 160,
      right: 160,
      bottom: 160,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    // Middle mouse button must not draw
    act(() => {
      api.handlePointerDown(makeCanvasPointerEvent('pointerdown', 15, 15, 1, 1));
      api.handlePointerUp(makeCanvasPointerEvent('pointerup', 15, 15, 1, 1));
    });
    expect(pushHistory).not.toHaveBeenCalled();

    // Right-click erase followed by pointercancel must reset erase flag so next left-click draws 1
    act(() => {
      api.handlePointerDown(makeCanvasPointerEvent('pointerdown', 25, 25, 2, 2));
      api.handlePointerCancel(makeCanvasPointerEvent('pointercancel', 25, 25, 2, 2));
    });

    act(() => {
      api.handlePointerDown(makeCanvasPointerEvent('pointerdown', 15, 15, 3, 0));
      api.handlePointerMove(makeCanvasPointerEvent('pointermove', 25, 15, 3, 0));
      api.handlePointerUp(makeCanvasPointerEvent('pointerup', 25, 15, 3, 0));
    });

    expect(pushHistory).toHaveBeenCalledTimes(1);
    const committed = pushHistory.mock.calls[0][0] as Uint8Array;
    expect(committed[1 * gridWidth + 1]).toBe(1);
    expect(committed[1 * gridWidth + 2]).toBe(1);

    act(() => {
      root.unmount();
    });
    container.remove();
  });
});
