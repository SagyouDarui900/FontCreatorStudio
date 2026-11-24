// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { MobileAuxMenuDrawer } from './MobileAuxMenuDrawer';
import { useCanvasNativeGestures } from '../hooks/useCanvasNativeGestures';
import { TraceSettings } from '../../../types';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

function NativeGestureHarness({ isAnyModalOpen = false }: { isAnyModalOpen?: boolean }) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const canvasGroupRef = React.useRef<SVGGElement | null>(null);
  const isAnyModalOpenRef = React.useRef(isAnyModalOpen);
  isAnyModalOpenRef.current = isAnyModalOpen;
  const toolModeRef = React.useRef<'brush'>('brush');
  const brushWidthRef = React.useRef(28);
  const eraserSizeRef = React.useRef(24);
  const onChangeBrushWidthRef = React.useRef<((w: number) => void) | undefined>(undefined);
  const onChangeTraceSettingsRef = React.useRef<undefined>(undefined);
  const zoomRef = React.useRef(1);
  const panRef = React.useRef({ x: 0, y: 0 });
  const isErasingRef = React.useRef(false);
  const touchPointersRef = React.useRef(new Map());
  const pointerTypesRef = React.useRef(new Map());
  const isTwoFingerGestureRef = React.useRef(false);
  const twoFingerCooldownUntilRef = React.useRef(0);
  const isPenDrawingRef = React.useRef(false);
  const lastPenActiveTimeRef = React.useRef(0);

  useCanvasNativeGestures({
    containerRef,
    canvasGroupRef,
    getContainerRectFast: () => ({ left: 0, top: 0, width: 400, height: 600 }),
    upm: 1000,
    isAnyModalOpenRef,
    toolModeRef,
    brushWidthRef,
    eraserSizeRef,
    onChangeBrushWidthRef,
    onChangeTraceSettingsRef,
    setEraserSize: vi.fn(),
    setZoom: vi.fn(),
    setPan: vi.fn(),
    zoomRef,
    panRef,
    clampPan: (p) => p,
    showCanvasToast: vi.fn(),
    setTouchLoupeState: vi.fn(),
    isErasingRef,
    resetEraserVisuals: vi.fn(),
    touchPointersRef,
    pointerTypesRef,
    isTwoFingerGestureRef,
    twoFingerCooldownUntilRef,
    isPenDrawingRef,
    lastPenActiveTimeRef,
  });

  return (
    <div ref={containerRef} data-testid="canvas-container">
      <div data-testid="canvas-surface" />
      <div data-allow-native-scroll="true">
        <div data-testid="scrollable-child" />
      </div>
      <div role="dialog">
        <div data-testid="dialog-child" />
      </div>
    </div>
  );
}

describe('MobileAuxMenuDrawer & mobile native scroll behavior', () => {
  it('portals MobileAuxMenuDrawer to document.body with dedicated touch-pan-y scroll container', () => {
    const host = document.createElement('div');
    host.className = 'touch-none';
    document.body.appendChild(host);
    const root = createRoot(host);

    act(() => {
      root.render(
        <MobileAuxMenuDrawer
          isOpen={true}
          onClose={vi.fn()}
          theme="dark"
          isLight={false}
          zoom={1}
          handleZoomStep={vi.fn()}
          resetView={vi.fn()}
          isOutlineMode={false}
          setOutlineOnly={vi.fn()}
          showCanvasToast={vi.fn()}
          palmRejectionMode="auto"
          handleSetPalmRejectionMode={vi.fn()}
          toolMode="brush"
          selectedNodeId={null}
          selectedContourId={null}
          handleToggleNodeType={vi.fn()}
          handleDeleteSelectedNode={vi.fn()}
          traceSettings={{
            enabled: false,
            type: 'char',
            text: '',
            fontFamily: 'sans-serif',
            fontSize: 800,
            opacity: 0.3,
            scale: 1,
            offsetX: 0,
            offsetY: 0,
          } satisfies TraceSettings}
          handleResetTracePosition={vi.fn()}
          contours={[]}
          handleClearAllContours={vi.fn()}
        />
      );
    });

    // Must portal outside host's touch-none wrapper
    expect(host.querySelector('[role="dialog"]')).toBeNull();

    const dialog = document.body.querySelector('[role="dialog"][aria-label="キャンバス操作・補助メニュー"]');
    expect(dialog).not.toBeNull();
    expect(dialog?.getAttribute('data-allow-native-scroll')).toBe('true');
    expect(dialog?.className).toContain('max-h-[85dvh]');
    expect(dialog?.className).toContain('overflow-hidden');

    const scrollBody = dialog?.querySelector('.overflow-y-auto');
    expect(scrollBody).not.toBeNull();
    expect(scrollBody?.className).toContain('flex-1');
    expect(scrollBody?.className).toContain('min-h-0');
    expect(scrollBody?.className).toContain('overscroll-contain');
    expect(scrollBody?.className).toContain('touch-pan-y');

    // Grid / guide settings live only in the toolbar grid menu now:
    // the aux menu must not duplicate them, but keeps palm rejection.
    expect(dialog?.textContent).not.toContain('方眼グリッドサイズ');
    expect(dialog?.textContent).not.toContain('照準ポインター');
    expect(dialog?.textContent).not.toContain('スナップ吸着');
    expect(dialog?.textContent).toContain('手のひら誤作図防止');

    act(() => {
      root.unmount();
    });
    host.remove();
  });

  it('bypasses preventDefault on touchmove/wheel inside native-scroll and dialog containers while preserving canvas gesture blocking', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);

    act(() => {
      root.render(<NativeGestureHarness isAnyModalOpen={false} />);
    });

    const canvasSurface = host.querySelector('[data-testid="canvas-surface"]') as HTMLElement;
    const scrollableChild = host.querySelector('[data-testid="scrollable-child"]') as HTMLElement;
    const dialogChild = host.querySelector('[data-testid="dialog-child"]') as HTMLElement;

    const canvasTouchMove = new Event('touchmove', { bubbles: true, cancelable: true });
    canvasSurface.dispatchEvent(canvasTouchMove);
    expect(canvasTouchMove.defaultPrevented).toBe(true);

    const scrollTouchMove = new Event('touchmove', { bubbles: true, cancelable: true });
    scrollableChild.dispatchEvent(scrollTouchMove);
    expect(scrollTouchMove.defaultPrevented).toBe(false);

    const dialogTouchMove = new Event('touchmove', { bubbles: true, cancelable: true });
    dialogChild.dispatchEvent(dialogTouchMove);
    expect(dialogTouchMove.defaultPrevented).toBe(false);

    const scrollWheel = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 120 });
    scrollableChild.dispatchEvent(scrollWheel);
    expect(scrollWheel.defaultPrevented).toBe(false);

    act(() => {
      root.unmount();
    });
    host.remove();
  });
});
