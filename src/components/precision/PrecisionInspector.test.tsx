// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { PrecisionInspector } from './PrecisionInspector';
import { MetricsPanel } from '../metrics/MetricsPanel';
import { distributeContours } from '../../utils/geometry/alignment';
import { getContoursBoundingBox } from '../../utils/path';
import { getThemeClasses } from '../../utils/theme';
import { PathContour } from '../../types';

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

/** Three 100x100 squares stacked vertically with unequal gaps (150 and 250 -> 200 and 200 after distribution). */
function makeVerticalStack(): PathContour[] {
  return [
    makeRectContour('v-a', 100, 100, 200, 200),
    makeRectContour('v-b', 100, 350, 200, 450),
    makeRectContour('v-c', 100, 700, 200, 800),
  ];
}

describe('PrecisionInspector low3 fixes', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('disables all section controls while locked, keeps the dimmed look, and shows the lock reason in titles', () => {
    const onChangeContours = vi.fn();
    const onCommitHistory = vi.fn();
    const showToast = vi.fn();
    const contours = [...makeVerticalStack()];

    const root = createRoot(container);
    act(() => {
      root.render(
        <PrecisionInspector
          contours={contours}
          selectedContourIds={['v-a', 'v-b']}
          selectedNodeId="v-a-1"
          selectedHandleType={null}
          onChangeContours={onChangeContours}
          onCommitHistory={onCommitHistory}
          unitsPerEm={1000}
          advanceWidth={1000}
          showToast={showToast}
          isLight={true}
          themeClasses={getThemeClasses('light')}
          isGlyphLocked={true}
        />
      );
    });

    // No section blocks pointer events any more (all 4 locked sections).
    expect(container.querySelectorAll('.pointer-events-none').length).toBe(0);
    // The dimmed look is kept on all 4 sections (node, align, dimensions, offset).
    expect(container.querySelectorAll('.opacity-65').length).toBe(4);

    const buttons = Array.from(container.querySelectorAll('button')) as HTMLButtonElement[];
    // 1 round + 2 node-type + 6 align + 1 em-box + 2 distribute + 5 presets + 3 caps + 1 outline
    expect(buttons.length).toBe(21);
    expect(buttons.every((b) => b.disabled)).toBe(true);
    expect(buttons.every((b) => (b.getAttribute('title') || '').includes('編集ロック中'))).toBe(true);

    const inputs = Array.from(container.querySelectorAll('input')) as HTMLInputElement[];
    // X, Y, keep-aspect checkbox, W, H, stroke-width range
    expect(inputs.length).toBe(6);
    expect(inputs.every((i) => i.disabled)).toBe(true);

    // Clicking a disabled button fires no handler and no toast.
    const emCenterBtn = buttons.find((b) => b.textContent?.includes('全角枠中央揃え'))!;
    act(() => {
      emCenterBtn.click();
    });
    expect(onChangeContours).not.toHaveBeenCalled();
    expect(onCommitHistory).not.toHaveBeenCalled();
    expect(showToast).not.toHaveBeenCalled();

    act(() => root.unmount());
  });

  it('distributes 3 contours equally along the vertical axis', () => {
    const distributed = distributeContours(makeVerticalStack(), ['v-a', 'v-b', 'v-c'], 'vertical');
    const first = distributed.find((c) => c.id === 'v-a')!;
    const mid = distributed.find((c) => c.id === 'v-b')!;
    const last = distributed.find((c) => c.id === 'v-c')!;
    const boxOf = (c: PathContour) => getContoursBoundingBox([c]);

    // First and last contours do not move.
    expect(boxOf(first).minY).toBe(100);
    expect(boxOf(last).minY).toBe(700);
    // Span 100..800, three heights of 100: gap = (700 - 200 - 100) / 2 = 200.
    expect(boxOf(mid).minY).toBe(400);
    const gap1 = boxOf(mid).minY - boxOf(first).maxY;
    const gap2 = boxOf(last).minY - boxOf(mid).maxY;
    expect(gap1).toBe(200);
    expect(gap2).toBe(200);
    expect(gap1).toBe(gap2);
  });

  it('adds a vertical distribute button that equalizes Y gaps', () => {
    const onChangeContours = vi.fn();
    const onCommitHistory = vi.fn();

    const root = createRoot(container);
    act(() => {
      root.render(
        <PrecisionInspector
          contours={makeVerticalStack()}
          selectedContourIds={['v-a', 'v-b', 'v-c']}
          selectedNodeId={null}
          selectedHandleType={null}
          onChangeContours={onChangeContours}
          onCommitHistory={onCommitHistory}
          unitsPerEm={1000}
          advanceWidth={1000}
          isLight={true}
          themeClasses={getThemeClasses('light')}
        />
      );
    });

    const verticalBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('垂直均等分布')
    )!;
    expect(verticalBtn).toBeTruthy();
    expect((verticalBtn as HTMLButtonElement).disabled).toBe(false);
    // The horizontal button is still present next to it.
    expect(
      Array.from(container.querySelectorAll('button')).some((b) => b.textContent?.includes('水平均等分布'))
    ).toBe(true);

    act(() => {
      verticalBtn.click();
    });
    expect(onCommitHistory).toHaveBeenCalledTimes(1);
    expect(onChangeContours).toHaveBeenCalledTimes(1);
    const updated = onChangeContours.mock.calls[0][0] as PathContour[];
    const boxOf = (c: PathContour) => getContoursBoundingBox([c]);
    const first = updated.find((c) => c.id === 'v-a')!;
    const mid = updated.find((c) => c.id === 'v-b')!;
    const last = updated.find((c) => c.id === 'v-c')!;
    expect(boxOf(first).minY).toBe(100);
    expect(boxOf(last).minY).toBe(700);
    expect(boxOf(mid).minY - boxOf(first).maxY).toBe(boxOf(last).minY - boxOf(mid).maxY);

    act(() => root.unmount());
  });

  it('PrecisionInspector updates through MetricsPanel cost a single history commit while syncing LSB', () => {
    const onChangeContours = vi.fn();
    const onChangeLsb = vi.fn();
    const onCommitHistory = vi.fn();

    const root = createRoot(container);
    act(() => {
      root.render(
        <MetricsPanel
          advanceWidth={1000}
          lsb={50}
          onChangeAdvanceWidth={vi.fn()}
          onChangeLsb={onChangeLsb}
          contours={[
            makeRectContour('c1', 100, 100, 300, 300),
            makeRectContour('c2', 400, 200, 500, 400),
          ]}
          onChangeContours={onChangeContours}
          onCommitHistory={onCommitHistory}
          selectedChar="あ"
          selectedUnicode={0x3042}
          theme="light"
          selectedContourIds={['c1', 'c2']}
        />
      );
    });

    // Switch to the precision tab where PrecisionInspector lives.
    const precisionTab = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('精密整列・数値')
    )!;
    act(() => {
      precisionTab.click();
    });

    const leftAlignBtn = container.querySelector('button[title="左揃え"]') as HTMLButtonElement;
    expect(leftAlignBtn).toBeTruthy();
    act(() => {
      leftAlignBtn.click();
    });

    // One history commit for the whole update (contours + LSB sync).
    expect(onCommitHistory).toHaveBeenCalledTimes(1);
    expect(onChangeContours).toHaveBeenCalledTimes(1);
    const [updatedContours, opts] = onChangeContours.mock.calls[0];
    expect(opts).toEqual({ skipHistory: true });
    expect(getContoursBoundingBox(updatedContours).minX).toBe(100);
    // LSB follows the new left edge in the same update.
    expect(onChangeLsb).toHaveBeenCalledTimes(1);
    expect(onChangeLsb).toHaveBeenCalledWith(100, { skipHistory: true });

    act(() => root.unmount());
  });

  it('a MetricsPanel transform costs a single history commit while syncing LSB', () => {
    const onChangeContours = vi.fn();
    const onChangeLsb = vi.fn();
    const onCommitHistory = vi.fn();

    const root = createRoot(container);
    act(() => {
      root.render(
        <MetricsPanel
          advanceWidth={1000}
          lsb={50}
          onChangeAdvanceWidth={vi.fn()}
          onChangeLsb={onChangeLsb}
          contours={[makeRectContour('c1', 100, 100, 500, 800)]}
          onChangeContours={onChangeContours}
          onCommitHistory={onCommitHistory}
          selectedChar="あ"
          selectedUnicode={0x3042}
          theme="light"
        />
      );
    });

    const centerBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('EM枠の中央に配置')
    )!;
    act(() => {
      centerBtn.click();
    });

    expect(onCommitHistory).toHaveBeenCalledTimes(1);
    expect(onChangeContours).toHaveBeenCalledTimes(1);
    const centered = onChangeContours.mock.calls[0][0] as PathContour[];
    // Width 400 centered in a 1000 box -> minX 300.
    expect(getContoursBoundingBox(centered).minX).toBe(300);
    expect(onChangeLsb).toHaveBeenCalledTimes(1);
    expect(onChangeLsb).toHaveBeenCalledWith(300, { skipHistory: true });

    act(() => root.unmount());
  });
});
