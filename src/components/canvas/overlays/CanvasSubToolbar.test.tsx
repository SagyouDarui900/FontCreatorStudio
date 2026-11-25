// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CanvasSubToolbar } from './CanvasSubToolbar';
import { getThemeClasses } from '../../../utils/theme';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

describe('CanvasSubToolbar ResizeObserver scheduling', () => {
  let container: HTMLDivElement;
  let resizeCallback: ResizeObserverCallback | null = null;
  let disconnectSpy: ReturnType<typeof vi.fn<() => void>>;
  let rafQueue: Array<{ id: number; cb: FrameRequestCallback }>;
  let nextRafId: number;
  let cancelRafSpy: ReturnType<typeof vi.fn<(id: number) => void>>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    resizeCallback = null;
    disconnectSpy = vi.fn<() => void>();
    rafQueue = [];
    nextRafId = 1;
    cancelRafSpy = vi.fn<(id: number) => void>((id: number) => {
      rafQueue = rafQueue.filter((item) => item.id !== id);
    });

    vi.stubGlobal(
      'ResizeObserver',
      class MockResizeObserver {
        constructor(cb: ResizeObserverCallback) {
          resizeCallback = cb;
        }
        observe() {}
        unobserve() {}
        disconnect() {
          disconnectSpy();
        }
      }
    );

    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      const id = nextRafId++;
      rafQueue.push({ id, cb });
      return id;
    });
    vi.stubGlobal('cancelAnimationFrame', cancelRafSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    container.remove();
  });

  function flushRaf() {
    const items = [...rafQueue];
    rafQueue = [];
    for (const item of items) {
      item.cb(16);
    }
  }

  function renderSubToolbar() {
    const root = createRoot(container);
    act(() => {
      root.render(
        <CanvasSubToolbar
          isMobileFocusMode={false}
          showSubToolbar={true}
          handleToggleSubToolbar={vi.fn()}
          themeClasses={getThemeClasses('light')}
          isLight={true}
          activeChar="あ"
          selectedUnicode={0x3042}
          showCanvasToast={vi.fn()}
          showNodes={true}
          setShowNodes={vi.fn()}
          isOutlineMode={false}
          setOutlineOnly={vi.fn()}
          gridSettings={{
            showGrid: true,
            gridSize: 100,
            gridOpacity: 0.5,
            snapToGrid: false,
            snapToPoints: false,
            snapToGuides: false,
            showMetrics: true,
            showPoints: true,
            showHandles: true,
          }}
          toolMode="brush"
          setShowMobileBrushSheet={vi.fn()}
          brushStyle="brush"
          brushWidth={48}
          pressureSensitivity="normal"
          isStylusActive={false}
          liveStylusPressure={null}
          autoResolveBrushOverlap={false}
          setAutoResolveBrushOverlap={vi.fn()}
          autoUnionBrush={false}
          setAutoUnionBrush={vi.fn()}
          brushStraightMode={false}
          setBrushStraightMode={vi.fn()}
          autoSmoothBrush={true}
          setAutoSmoothBrush={vi.fn()}
          smoothStrength="standard"
          setSmoothStrength={vi.fn()}
          handleStraightenWobblySelected={vi.fn()}
          penMode="bezier"
          penStrokeWidth={40}
          handleSetPenStrokeWidth={vi.fn()}
          penCapStyle="round"
          handleSetPenCapStyle={vi.fn()}
          eraserMode="stroke"
          setEraserMode={vi.fn()}
          eraserSize={40}
          setEraserSize={vi.fn()}
          isShapeTool={false}
          rulerMeasurement={null}
          handleDrawRulerAsStroke={vi.fn()}
          handleConvertRulerToGuideline={vi.fn()}
          setRulerMeasurement={vi.fn()}
          customGuidelines={[]}
          setCustomGuidelines={vi.fn()}
          lockGuidelines={false}
          setLockGuidelines={vi.fn()}
          contours={[]}
          handleClearAll={vi.fn()}
          selectedContourIds={[]}
          selectedContourId={null}
          setSelectedContourIds={vi.fn()}
          setSelectedContourId={vi.fn()}
          selectedNodeId={null}
          setSelectedNodeId={vi.fn()}
          setSelectedHandleType={vi.fn()}
          handleRotateSelected={vi.fn()}
          handleFlipHSelected={vi.fn()}
          handleFlipVSelected={vi.fn()}
          handleMergeSelectedContours={vi.fn()}
          handleDuplicateSelected={vi.fn()}
          handleDeleteSelected={vi.fn()}
          handleSmoothStrokeSelected={vi.fn()}
          handleSimplifySelected={vi.fn()}
          handleExpandStrokeSelected={vi.fn()}
          handleSubtractSelectedContours={vi.fn()}
          handleIntersectSelectedContours={vi.fn()}
          handleSlantSelected={vi.fn()}
          handleReverseWindingSelected={vi.fn()}
          handleConvertToSmoothSelected={vi.fn()}
          handleConvertToCornersSelected={vi.fn()}
          handleToggleNodeType={vi.fn()}
          handleDeleteSelectedNode={vi.fn()}
          handleClearAllGuidelines={vi.fn()}
          isGuideEraserActive={false}
          setIsGuideEraserActive={vi.fn()}
          nodeStyle="clean"
          setNodeStyle={vi.fn()}
          smoothPreserveCorners={true}
          setSmoothPreserveCorners={vi.fn()}
          isShiftLockRatio={false}
          setIsShiftLockRatio={vi.fn()}
          isAltFromCenter={false}
          setIsAltFromCenter={vi.fn()}
        />
      );
    });
    return root;
  }

  it('defers scroll-button state updates from ResizeObserver until requestAnimationFrame and cancels on unmount', () => {
    const root = renderSubToolbar();

    const track = container.querySelector('.overflow-x-auto') as HTMLElement | null;
    expect(track).not.toBeNull();

    Object.defineProperty(track!, 'clientWidth', { configurable: true, value: 400 });
    Object.defineProperty(track!, 'scrollWidth', { configurable: true, value: 800 });
    Object.defineProperty(track!, 'scrollLeft', { configurable: true, value: 0 });

    // Trigger ResizeObserver notifications multiple times before next animation frame
    act(() => {
      resizeCallback?.([], {} as ResizeObserver);
      resizeCallback?.([], {} as ResizeObserver);
    });

    // Should be deduplicated to a single rAF and NOT mutate scroll buttons synchronously
    expect(rafQueue).toHaveLength(1);
    expect(container.querySelector('button[title="ツールバーを右へスクロール"]')).toBeNull();

    // Flushing rAF applies the updated scroll button state
    act(() => {
      flushRaf();
    });
    expect(container.querySelector('button[title="ツールバーを右へスクロール"]')).not.toBeNull();

    // Queue another resize and unmount before rAF runs
    act(() => {
      resizeCallback?.([], {} as ResizeObserver);
    });
    expect(rafQueue).toHaveLength(1);

    act(() => {
      root.unmount();
    });
    expect(cancelRafSpy).toHaveBeenCalledTimes(1);
    expect(disconnectSpy).toHaveBeenCalledTimes(1);
  });
});
