// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { MetricsPanel } from './MetricsPanel';
import { PrecisionInspector } from '../precision/PrecisionInspector';
import { useAppShortcuts } from '../../hooks/useAppShortcuts';
import { usePointerMetricsDrag } from '../canvas/hooks/usePointerMetricsDrag';
import { outlineOpenContour } from '../../utils/path/stroke_modules/outlineOpen';
import { getContoursBoundingBox, getContourSignedArea } from '../../utils/path';
import { calculateOptimalSpacing } from '../../utils/metricsHelper';
import { getThemeClasses } from '../../utils/theme';
import { GlyphData, PathContour } from '../../types';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

function makeRectContour(id: string, minX: number, minY: number, maxX: number, maxY: number): PathContour {
  return {
    id,
    closed: true,
    nodes: [
      { id: `${id}-1`, x: minX, y: minY, type: 'corner' },
      { id: `${id}-2`, x: maxX, y: minY, type: 'corner' },
      { id: `${id}-3`, x: maxX, y: maxY, type: 'corner' },
      { id: `${id}-4`, x: minX, y: maxY, type: 'corner' },
    ],
  };
}

function makeCurvedOpenContour(id: string): PathContour {
  return {
    id,
    closed: false,
    nodes: [
      {
        id: `${id}-1`,
        x: 100,
        y: 500,
        type: 'corner',
        handleOut: { x: 250, y: 150 },
      },
      {
        id: `${id}-2`,
        x: 500,
        y: 500,
        type: 'corner',
        handleIn: { x: 350, y: 150 },
      },
    ],
  };
}

function setNativeInputValue(input: HTMLInputElement, value: string) {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  descriptor?.set?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function blurInput(input: HTMLInputElement) {
  input.focus();
  input.blur();
}

describe('MetricsPanel & PrecisionInspector fixes', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('commits AdvanceWidth on blur/Enter without resetting mid-typing and allows stepping down to 50', () => {
    const onChangeAdvanceWidth = vi.fn();
    const onChangeLsb = vi.fn();
    const onChangeContours = vi.fn();
    const onCommitHistory = vi.fn();

    const root = createRoot(container);
    act(() => {
      root.render(
        <MetricsPanel
          advanceWidth={600}
          lsb={50}
          onChangeAdvanceWidth={onChangeAdvanceWidth}
          onChangeLsb={onChangeLsb}
          contours={[makeRectContour('c1', 50, 100, 550, 800)]}
          onChangeContours={onChangeContours}
          onCommitHistory={onCommitHistory}
          selectedChar="A"
          selectedUnicode={65}
          theme="light"
        />
      );
    });

    const advInput = container.querySelector('input[aria-label="送り幅 (Advance)"]') as HTMLInputElement;
    expect(advInput).toBeTruthy();
    expect(advInput.value).toBe('600');

    // Clearing the input mid-edit must not immediately commit or snap to 1000
    act(() => {
      setNativeInputValue(advInput, '');
    });
    expect(advInput.value).toBe('');
    expect(onChangeAdvanceWidth).not.toHaveBeenCalled();
    expect(onCommitHistory).not.toHaveBeenCalled();

    // Typing new value and blurring commits once with skipHistory: true after 1 onCommitHistory
    act(() => {
      setNativeInputValue(advInput, '720');
    });
    expect(onChangeAdvanceWidth).not.toHaveBeenCalled();

    act(() => {
      blurInput(advInput);
    });
    expect(onCommitHistory).toHaveBeenCalledTimes(1);
    expect(onChangeAdvanceWidth).toHaveBeenCalledTimes(1);
    expect(onChangeAdvanceWidth).toHaveBeenCalledWith(720, { skipHistory: true });

    // Re-render at 70 and step -50 -> should clamp at 50 (not 100)
    onCommitHistory.mockClear();
    onChangeAdvanceWidth.mockClear();
    act(() => {
      root.render(
        <MetricsPanel
          advanceWidth={70}
          lsb={50}
          onChangeAdvanceWidth={onChangeAdvanceWidth}
          onChangeLsb={onChangeLsb}
          contours={[makeRectContour('c1', 50, 100, 550, 800)]}
          onChangeContours={onChangeContours}
          onCommitHistory={onCommitHistory}
          selectedChar="A"
          selectedUnicode={65}
          theme="light"
        />
      );
    });

    const stepMinus50 = Array.from(container.querySelectorAll('button')).find((b) => b.textContent === '-50')!;
    act(() => {
      stepMinus50.click();
    });
    expect(onCommitHistory).toHaveBeenCalledTimes(1);
    expect(onChangeAdvanceWidth).toHaveBeenCalledWith(50, { skipHistory: true });

    act(() => root.unmount());
  });

  it('shifts glyph contours horizontally when LSB is edited or preset, keeping a single atomic history commit', () => {
    const onChangeAdvanceWidth = vi.fn();
    const onChangeLsb = vi.fn();
    const onChangeContours = vi.fn();
    const onCommitHistory = vi.fn();

    const root = createRoot(container);
    act(() => {
      root.render(
        <MetricsPanel
          advanceWidth={1000}
          lsb={50}
          onChangeAdvanceWidth={onChangeAdvanceWidth}
          onChangeLsb={onChangeLsb}
          contours={[makeRectContour('c1', 100, 100, 700, 800)]}
          onChangeContours={onChangeContours}
          onCommitHistory={onCommitHistory}
          selectedChar="あ"
          selectedUnicode={0x3042}
          theme="light"
        />
      );
    });

    const lsbInput = container.querySelector('input[aria-label="左余白 (LSB)"]') as HTMLInputElement;
    act(() => {
      setNativeInputValue(lsbInput, '-20');
    });
    expect(onChangeContours).not.toHaveBeenCalled();

    act(() => {
      blurInput(lsbInput);
    });

    expect(onCommitHistory).toHaveBeenCalledTimes(1);
    expect(onChangeContours).toHaveBeenCalledTimes(1);
    const [shiftedContours, contourOpts] = onChangeContours.mock.calls[0];
    expect(contourOpts).toEqual({ skipHistory: true });
    expect(getContoursBoundingBox(shiftedContours).minX).toBe(-20);
    expect(onChangeLsb).toHaveBeenCalledWith(-20, { skipHistory: true });

    // Preset 80px button also shifts contours
    onCommitHistory.mockClear();
    onChangeContours.mockClear();
    onChangeLsb.mockClear();
    const preset80 = Array.from(container.querySelectorAll('button')).find((b) => b.textContent === '80px')!;
    act(() => {
      preset80.click();
    });
    expect(onCommitHistory).toHaveBeenCalledTimes(1);
    expect(getContoursBoundingBox(onChangeContours.mock.calls[0][0]).minX).toBe(80);
    expect(onChangeLsb).toHaveBeenCalledWith(80, { skipHistory: true });

    act(() => root.unmount());
  });

  it('disables transform/outline buttons on empty contours and applies touch scroll classes', () => {
    const root = createRoot(container);
    act(() => {
      root.render(
        <MetricsPanel
          advanceWidth={1000}
          lsb={50}
          onChangeAdvanceWidth={vi.fn()}
          onChangeLsb={vi.fn()}
          contours={[]}
          onChangeContours={vi.fn()}
          onCommitHistory={vi.fn()}
          selectedChar="あ"
          selectedUnicode={0x3042}
          theme="light"
        />
      );
    });

    const flipBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('左右反転')
    ) as HTMLButtonElement;
    const centerBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('EM枠の中央に配置')
    ) as HTMLButtonElement;
    expect(flipBtn.disabled).toBe(true);
    expect(centerBtn.disabled).toBe(true);

    const scrollBody = container.querySelector('.overflow-y-auto') as HTMLDivElement;
    expect(scrollBody.className).toContain('min-h-0');
    expect(scrollBody.className).toContain('touch-pan-y');

    act(() => root.unmount());
  });

  it('no-ops gracefully when outlining closed-only contours and preserves curves on open contours', () => {
    const curved = makeCurvedOpenContour('open-curve');
    const outlined = outlineOpenContour(curved, 40);
    const bbox = getContoursBoundingBox([outlined]);
    // Control handles pull the curve up toward y=150 (midpoint ~237.5), far above baseline y=500
    expect(bbox.minY).toBeLessThan(350);
    expect(outlined.closed).toBe(true);
    expect(outlined.nodes.length).toBeGreaterThan(8);

    const onChangeContours = vi.fn();
    const onCommitHistory = vi.fn();
    const onShowToast = vi.fn();
    const root = createRoot(container);

    act(() => {
      root.render(
        <MetricsPanel
          advanceWidth={1000}
          lsb={50}
          onChangeAdvanceWidth={vi.fn()}
          onChangeLsb={vi.fn()}
          contours={[makeRectContour('closed-1', 100, 100, 400, 400)]}
          onChangeContours={onChangeContours}
          onCommitHistory={onCommitHistory}
          onShowToast={onShowToast}
          selectedChar="あ"
          selectedUnicode={0x3042}
          theme="light"
        />
      );
    });

    // Expand outline accordion
    const outlineHeader = Array.from(container.querySelectorAll('span')).find((el) =>
      el.textContent?.includes('骨格線の肉付け')
    )!;
    act(() => {
      outlineHeader.click();
    });

    const outlineBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('骨格線をアウトライン化')
    )!;
    act(() => {
      outlineBtn.click();
    });

    expect(onCommitHistory).not.toHaveBeenCalled();
    expect(onChangeContours).not.toHaveBeenCalled();
    expect(onShowToast).toHaveBeenCalledWith(expect.stringContaining('開いた骨格線'), 'info');

    act(() => root.unmount());
  });

  it('passes unitsPerEm to createSmallKanaContours for UPM=2048 projects', () => {
    const onChangeContours = vi.fn();
    const onChangeLsb = vi.fn();
    const onCommitHistory = vi.fn();
    const root = createRoot(container);

    act(() => {
      root.render(
        <MetricsPanel
          advanceWidth={2048}
          lsb={100}
          unitsPerEm={2048}
          onChangeAdvanceWidth={vi.fn()}
          onChangeLsb={onChangeLsb}
          contours={[makeRectContour('c1', 200, 200, 1800, 1800)]}
          onChangeContours={onChangeContours}
          onCommitHistory={onCommitHistory}
          selectedChar="っ"
          selectedUnicode={0x3063}
          theme="light"
        />
      );
    });

    const smallKanaBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('小文字サイズ・位置に変換')
    )!;
    act(() => {
      smallKanaBtn.click();
    });

    expect(onCommitHistory).toHaveBeenCalledTimes(1);
    const smallContours = onChangeContours.mock.calls[0][0] as PathContour[];
    const smallBBox = getContoursBoundingBox(smallContours);
    // At UPM=2048, bottom-left placement puts minX at Math.round(110 * 2.048) = 225, maxY around 780 * 2.048 = 1597
    expect(smallBBox.minX).toBeGreaterThan(200);
    expect(smallBBox.maxY).toBeGreaterThan(1500);
    expect(onChangeLsb).toHaveBeenCalledWith(Math.round(smallBBox.minX), { skipHistory: true });

    act(() => root.unmount());
  });

  it('PrecisionInspector commits W/H on blur without 1px crush, supports multi-select resize, fixes emBoxCenterH, and selects offset output', () => {
    const c1 = makeRectContour('c1', 100, 100, 300, 300); // 200x200
    const c2 = makeRectContour('c2', 400, 200, 500, 400); // 100x200 -> combined 400x300
    const c3 = makeRectContour('c3', 700, 700, 800, 800); // unselected
    const onChangeContours = vi.fn();
    const onCommitHistory = vi.fn();
    const selectListener = vi.fn();
    window.addEventListener('font_editor_select_contours', selectListener);

    const root = createRoot(container);
    act(() => {
      root.render(
        <PrecisionInspector
          contours={[c1, c2, c3]}
          selectedContourIds={['c1', 'c2']}
          selectedNodeId={null}
          selectedHandleType={null}
          onChangeContours={onChangeContours}
          onCommitHistory={onCommitHistory}
          unitsPerEm={1000}
          advanceWidth={500}
          isLight={true}
          themeClasses={getThemeClasses('light')}
        />
      );
    });

    const wInput = container.querySelector('input[aria-label="幅 (W)"]') as HTMLInputElement;
    expect(wInput.value).toBe('400');

    // Backspace/clearing W must NOT crush contours to 1px
    act(() => {
      setNativeInputValue(wInput, '');
    });
    expect(onChangeContours).not.toHaveBeenCalled();

    // Typing 200 and blurring resizes both c1 & c2 proportionally while leaving c3 intact
    act(() => {
      setNativeInputValue(wInput, '200');
    });
    act(() => {
      blurInput(wInput);
    });

    expect(onCommitHistory).toHaveBeenCalledTimes(1);
    expect(onChangeContours).toHaveBeenCalledTimes(1);
    const [resizedContours, resizeOpts] = onChangeContours.mock.calls[0];
    expect(resizeOpts).toEqual({ skipHistory: true });
    const selBoxAfter = getContoursBoundingBox(resizedContours.slice(0, 2));
    expect(selBoxAfter.width).toBe(200);
    expect(selBoxAfter.height).toBe(150);
    expect(resizedContours[2]).toEqual(c3);

    // emBoxCenterH aligns to unitsPerEm (1000 -> center 500), NOT advanceWidth (500 -> center 250)
    onCommitHistory.mockClear();
    onChangeContours.mockClear();
    const emCenterBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('全角枠中央揃え')
    )!;
    act(() => {
      emCenterBtn.click();
    });
    const aligned = onChangeContours.mock.calls[0][0] as PathContour[];
    expect(getContoursBoundingBox([aligned[0]]).centerX).toBe(500);

    // Expand offset dispatches selection event with new IDs
    onCommitHistory.mockClear();
    onChangeContours.mockClear();
    const offsetBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('選択パスを均一線幅でアウトライン化')
    )!;
    act(() => {
      offsetBtn.click();
    });
    expect(onCommitHistory).toHaveBeenCalledTimes(1);
    expect(selectListener).toHaveBeenCalledTimes(1);
    const customEvt = selectListener.mock.calls[0][0] as CustomEvent<{ ids: string[] }>;
    expect(customEvt.detail.ids.length).toBeGreaterThan(0);

    window.removeEventListener('font_editor_select_contours', selectListener);
    act(() => root.unmount());
  });

  it('useAppShortcuts handles Shift+Alt+S (Auto-Spacing) and Alt+S (Simplify, including macOS Option+S)', () => {
    const handleAutoSpace = vi.fn();
    const handleSimplify = vi.fn();
    const glyph: GlyphData = {
      unicode: 65,
      char: 'A',
      name: 'A',
      advanceWidth: 1000,
      lsb: 50,
      contours: [makeRectContour('c1', 100, 100, 500, 800)],
    };

    function ShortcutHarness() {
      useAppShortcuts({
        isAnyModalOpen: false,
        handleUndo: vi.fn(),
        handleRedo: vi.fn(),
        handleQuickSaveCurrentGlyph: vi.fn(),
        handleCopyGlyph: vi.fn(),
        handlePasteGlyph: vi.fn(),
        selectedUnicode: 65,
        currentGlyph: glyph,
        clipboardContours: null,
        handleSelectPrevGlyph: vi.fn(),
        handleSelectNextGlyph: vi.fn(),
        toggleZenMode: vi.fn(),
        setToolMode: vi.fn(),
        handleAutoSpaceCurrentGlyph: handleAutoSpace,
        handleSimplifyCurrentGlyph: handleSimplify,
      });
      return null;
    }

    const root = createRoot(container);
    act(() => {
      root.render(<ShortcutHarness />);
    });

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'S', code: 'KeyS', altKey: true, shiftKey: true, bubbles: true }));
    });
    expect(handleAutoSpace).toHaveBeenCalledTimes(1);
    expect(handleSimplify).not.toHaveBeenCalled();

    // Simulate macOS Option+S producing e.key === 'ß' with e.code === 'KeyS'
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ß', code: 'KeyS', altKey: true, shiftKey: false, bubbles: true }));
    });
    expect(handleSimplify).toHaveBeenCalledTimes(1);

    act(() => root.unmount());
  });

  it('usePointerMetricsDrag rounds dragged LSB/Adv to integers and respects UPM > 2000', () => {
    const onChangeLsb = vi.fn();
    const onChangeAdvanceWidth = vi.fn();
    const onCommitHistory = vi.fn();
    let draggingMetric: 'lsb' | 'rsb' | null = 'lsb';
    let hookApi!: ReturnType<typeof usePointerMetricsDrag>;

    function DragHarness({ metric }: { metric: 'lsb' | 'rsb' | null }) {
      hookApi = usePointerMetricsDrag({
        zoom: 1,
        lsb: 50,
        advanceWidth: 2048,
        onChangeLsb,
        onChangeAdvanceWidth,
        onCommitHistory,
        draggingMetric: metric,
        setDraggingMetric: (m) => {
          draggingMetric = m;
        },
        lockGuidelines: false,
        toolMode: 'select',
        isDrawingTool: false,
        upm: 2048,
        showCanvasToast: vi.fn(),
      });
      return null;
    }

    const root = createRoot(container);
    act(() => {
      root.render(<DragHarness metric="lsb" />);
    });
    act(() => {
      hookApi.handleMetricsPointerMove({ x: 123.7, y: 400 });
    });
    expect(onChangeLsb).toHaveBeenCalledWith(124, { skipHistory: true });

    act(() => {
      root.render(<DragHarness metric="rsb" />);
    });
    act(() => {
      hookApi.handleMetricsPointerMove({ x: 2560.4, y: 400 });
    });
    expect(onChangeAdvanceWidth).toHaveBeenCalledWith(2560, { skipHistory: true });
    expect(draggingMetric).toBe('lsb');

    act(() => root.unmount());
  });

  it('preserves winding order on FlipH/V, centers both X and Y in EM box, and syncs LSB without jumping on 1D or desynced contours', () => {
    const asym: PathContour = {
      id: 'asym',
      closed: true,
      nodes: [
        { id: 'n1', x: 120, y: 100, type: 'corner' },
        { id: 'n2', x: 420, y: 120, type: 'corner' },
        { id: 'n3', x: 360, y: 380, type: 'corner' },
      ],
    };
    const origArea = getContourSignedArea(asym);
    const onChangeContours = vi.fn();
    const onChangeLsb = vi.fn();
    const onCommitHistory = vi.fn();

    const root = createRoot(container);
    act(() => {
      root.render(
        <MetricsPanel
          advanceWidth={1000}
          lsb={50} // intentionally stale relative to minX=120
          onChangeAdvanceWidth={vi.fn()}
          onChangeLsb={onChangeLsb}
          contours={[asym]}
          onChangeContours={onChangeContours}
          onCommitHistory={onCommitHistory}
          selectedChar="あ"
          selectedUnicode={0x3042}
          theme="light"
        />
      );
    });

    // FlipH preserves signed area sign (winding)
    const flipHBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('左右反転')
    )!;
    act(() => {
      flipHBtn.click();
    });
    const flippedContours = onChangeContours.mock.calls[0][0] as PathContour[];
    expect(Math.sign(getContourSignedArea(flippedContours[0]))).toBe(Math.sign(origArea));

    // EM center centers both X and Y
    onChangeContours.mockClear();
    onChangeLsb.mockClear();
    const centerBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('EM枠の中央に配置')
    )!;
    act(() => {
      centerBtn.click();
    });
    const centered = onChangeContours.mock.calls[0][0] as PathContour[];
    const centeredBox = getContoursBoundingBox(centered);
    expect(centeredBox.centerX).toBe(500);
    expect(centeredBox.centerY).toBe(500);

    // +5 LSB step uses actual bbox.minX (120 -> 125), NOT stale lsb=50 -> 55
    onChangeContours.mockClear();
    onChangeLsb.mockClear();
    const stepPlus5 = Array.from(container.querySelectorAll('button')).find((b) => b.textContent === '+5')!;
    act(() => {
      stepPlus5.click();
    });
    const steppedContours = onChangeContours.mock.calls[0][0] as PathContour[];
    expect(getContoursBoundingBox(steppedContours).minX).toBe(125);
    expect(onChangeLsb).toHaveBeenCalledWith(125, { skipHistory: true });

    // 1D vertical line (width === 0) also shifts properly on LSB preset
    const vLine: PathContour = {
      id: 'vline',
      closed: false,
      nodes: [
        { id: 'v1', x: 300, y: 100, type: 'corner' },
        { id: 'v2', x: 300, y: 800, type: 'corner' },
      ],
    };
    act(() => {
      root.render(
        <MetricsPanel
          advanceWidth={1000}
          lsb={300}
          onChangeAdvanceWidth={vi.fn()}
          onChangeLsb={onChangeLsb}
          contours={[vLine]}
          onChangeContours={onChangeContours}
          onCommitHistory={onCommitHistory}
          selectedChar="丨"
          selectedUnicode={0x4e28}
          theme="light"
        />
      );
    });
    onChangeContours.mockClear();
    onChangeLsb.mockClear();
    const preset80 = Array.from(container.querySelectorAll('button')).find((b) => b.textContent === '80px')!;
    act(() => {
      preset80.click();
    });
    const shiftedLine = onChangeContours.mock.calls[0][0] as PathContour[];
    expect(getContoursBoundingBox(shiftedLine).minX).toBe(80);
    expect(onChangeLsb).toHaveBeenCalledWith(80, { skipHistory: true });

    act(() => root.unmount());
  });

  it('PrecisionInspector aligns handles when switching to smooth and scales 1D vertical lines', () => {
    const contour: PathContour = {
      id: 'c-node',
      closed: true,
      nodes: [
        {
          id: 'n1',
          x: 200,
          y: 200,
          type: 'corner',
          handleIn: { x: 150, y: 200 },
          handleOut: { x: 200, y: 260 },
        },
        { id: 'n2', x: 200, y: 500, type: 'corner' },
        { id: 'n3', x: 400, y: 500, type: 'corner' },
      ],
    };
    const onChangeContours = vi.fn();
    const onCommitHistory = vi.fn();

    const root = createRoot(container);
    act(() => {
      root.render(
        <PrecisionInspector
          contours={[contour]}
          selectedContourIds={['c-node']}
          selectedNodeId="n1"
          selectedHandleType="handleOut"
          onChangeContours={onChangeContours}
          onCommitHistory={onCommitHistory}
          unitsPerEm={1000}
          advanceWidth={1000}
          isLight={true}
          themeClasses={getThemeClasses('light')}
        />
      );
    });

    expect(container.textContent).toContain('出力ハンドル選択中');

    const smoothBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('滑らか (Smooth)')
    )!;
    act(() => {
      smoothBtn.click();
    });
    const updatedNode = (onChangeContours.mock.calls[0][0] as PathContour[])[0].nodes[0];
    expect(updatedNode.type).toBe('smooth');
    // handleIn -> anchor -> handleOut should be collinear (cross product near 0)
    const vIn = { x: updatedNode.handleIn!.x - updatedNode.x, y: updatedNode.handleIn!.y - updatedNode.y };
    const vOut = { x: updatedNode.handleOut!.x - updatedNode.x, y: updatedNode.handleOut!.y - updatedNode.y };
    const cross = Math.abs(vIn.x * vOut.y - vIn.y * vOut.x);
    expect(cross).toBeLessThan(120); // integer rounding tolerance

    act(() => root.unmount());
  });

  it('calculateOptimalSpacing treats halfwidth katakana proportionally and scales optical margins by UPM', () => {
    const sample = [makeRectContour('hw', 100, 100, 300, 700)]; // width 200
    const hwRes = calculateOptimalSpacing(0xff71, sample, 'smart', 1000); // 'ｱ'
    expect(hwRes.advanceWidth).toBeLessThan(500);

    const a2048 = calculateOptimalSpacing(65, [makeRectContour('a', 100, 100, 900, 1400)], 'proportional-balanced', 2048);
    expect(a2048.lsb).toBe(Math.round(40 * 2.048));
    const k2048 = calculateOptimalSpacing(107, [makeRectContour('k', 100, 100, 900, 1400)], 'proportional-balanced', 2048);
    expect(k2048.lsb).toBe(Math.round(60 * 2.048));
  });

  it('uses the combined contours+lsb handler for EM centering and LSB preset, with one history commit', () => {
    const onChangeAdvanceWidth = vi.fn();
    const onChangeLsb = vi.fn();
    const onChangeContours = vi.fn();
    const onChangeContoursAndLsb = vi.fn();
    const onCommitHistory = vi.fn();

    const root = createRoot(container);
    act(() => {
      root.render(
        <MetricsPanel
          advanceWidth={1000}
          lsb={50}
          onChangeAdvanceWidth={onChangeAdvanceWidth}
          onChangeLsb={onChangeLsb}
          contours={[makeRectContour('c1', 50, 100, 550, 800)]}
          onChangeContours={onChangeContours}
          onChangeContoursAndLsb={onChangeContoursAndLsb}
          onCommitHistory={onCommitHistory}
          selectedChar="A"
          selectedUnicode={65}
          theme="light"
        />
      );
    });

    // EM centering moves minX from 50 to 250, so contours and lsb change together.
    // (FlipH would not work here: it mirrors around the bbox center, so minX stays.)
    const centerBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('EM枠の中央に配置')
    )!;
    act(() => {
      centerBtn.click();
    });
    expect(onCommitHistory).toHaveBeenCalledTimes(1);
    expect(onChangeContoursAndLsb).toHaveBeenCalledTimes(1);
    expect(onChangeContours).not.toHaveBeenCalled();
    expect(onChangeLsb).not.toHaveBeenCalled();
    const [centeredContours, centeredLsb, centeredOpts] = onChangeContoursAndLsb.mock.calls[0];
    expect(centeredOpts).toEqual({ skipHistory: true });
    // The combined lsb matches the centered contours' bounding box.
    expect(centeredLsb).toBe(Math.round(getContoursBoundingBox(centeredContours).minX));
    expect(centeredLsb).toBe(250);

    // LSB preset 80px also shifts contours and lsb together.
    onCommitHistory.mockClear();
    onChangeContoursAndLsb.mockClear();
    const preset80 = Array.from(container.querySelectorAll('button')).find((b) => b.textContent === '80px')!;
    act(() => {
      preset80.click();
    });
    expect(onCommitHistory).toHaveBeenCalledTimes(1);
    expect(onChangeContoursAndLsb).toHaveBeenCalledTimes(1);
    expect(onChangeContours).not.toHaveBeenCalled();
    expect(onChangeLsb).not.toHaveBeenCalled();
    const [shiftedContours, shiftedLsb] = onChangeContoursAndLsb.mock.calls[0];
    expect(getContoursBoundingBox(shiftedContours).minX).toBe(80);
    expect(shiftedLsb).toBe(80);

    act(() => root.unmount());
  });

  it('falls back to the contours-only callback when a transform leaves lsb unchanged', () => {
    const onChangeLsb = vi.fn();
    const onChangeContours = vi.fn();
    const onChangeContoursAndLsb = vi.fn();
    const onCommitHistory = vi.fn();

    const root = createRoot(container);
    act(() => {
      root.render(
        <MetricsPanel
          advanceWidth={1000}
          lsb={50}
          onChangeAdvanceWidth={vi.fn()}
          onChangeLsb={onChangeLsb}
          contours={[makeRectContour('c1', 50, 100, 550, 800)]}
          onChangeContours={onChangeContours}
          onChangeContoursAndLsb={onChangeContoursAndLsb}
          onCommitHistory={onCommitHistory}
          selectedChar="A"
          selectedUnicode={65}
          theme="light"
        />
      );
    });

    // FlipV does not change minX, so only the contours callback runs.
    const flipVBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('上下反転')
    )!;
    act(() => {
      flipVBtn.click();
    });
    expect(onCommitHistory).toHaveBeenCalledTimes(1);
    expect(onChangeContours).toHaveBeenCalledTimes(1);
    expect(onChangeContoursAndLsb).not.toHaveBeenCalled();
    expect(onChangeLsb).not.toHaveBeenCalled();
    const [flippedContours] = onChangeContours.mock.calls[0];
    expect(getContoursBoundingBox(flippedContours).minX).toBe(50);

    act(() => root.unmount());
  });
});
