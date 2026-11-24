// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { MobilePartTransformSheet } from './MobilePartTransformSheet';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

function findButton(label: string): HTMLButtonElement | undefined {
  return Array.from(document.body.querySelectorAll('button')).find((b) =>
    b.textContent?.includes(label)
  ) as HTMLButtonElement | undefined;
}

describe('MobilePartTransformSheet align / distribute (item 6)', () => {
  let root: Root | null = null;

  afterEach(() => {
    if (root) {
      act(() => root?.unmount());
      root = null;
    }
    document.body.innerHTML = '';
  });

  function renderSheet(selectedIds: string[], handlers: Record<string, unknown> = {}) {
    const container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    const noop = () => {};
    act(() => {
      root?.render(
        <MobilePartTransformSheet
          isOpen
          onClose={noop}
          isLight
          selectedContourIds={selectedIds}
          handleMergeSelectedContours={noop}
          handleFlipHSelected={noop}
          handleFlipVSelected={noop}
          handleRotateSelected={(handlers.handleRotateSelected as (deg: number) => void) || noop}
          handleSlantSelected={(handlers.handleSlantSelected as (amt: number) => void) || noop}
          handleScaleSelected={noop}
          handleAlignSelected={
            (handlers.handleAlignSelected as (d: string) => void) || undefined
          }
          handleDistributeSelected={
            (handlers.handleDistributeSelected as (d: string) => void) || undefined
          }
          handleDuplicateSelected={noop}
          handleSmoothStrokeSelected={noop}
          handleSimplifySelected={noop}
          handleDeleteSelected={noop}
        />
      );
    });
  }

  it('shows no align section for a single selected contour', () => {
    renderSheet(['a']);
    expect(findButton('左揃え')).toBeUndefined();
    expect(findButton('左右反転')).toBeDefined();
    expect(findButton('+90°回転')).toBeDefined();
  });

  it('align buttons call the desktop handler with the right direction', () => {
    const handleAlignSelected = vi.fn();
    renderSheet(['a', 'b'], { handleAlignSelected });
    const left = findButton('左揃え');
    expect(left).toBeDefined();
    act(() => {
      left?.click();
    });
    expect(handleAlignSelected).toHaveBeenCalledWith('left');
    act(() => {
      findButton('全角中央')?.click();
    });
    expect(handleAlignSelected).toHaveBeenCalledWith('emBoxCenterH');
    // Distribute needs 3+ contours.
    expect(findButton('水平等間隔')).toBeUndefined();
  });

  it('distribute buttons appear for 3+ contours and call the handler', () => {
    const handleDistributeSelected = vi.fn();
    renderSheet(['a', 'b', 'c'], { handleDistributeSelected });
    act(() => {
      findButton('水平等間隔')?.click();
    });
    expect(handleDistributeSelected).toHaveBeenCalledWith('horizontal');
    act(() => {
      findButton('垂直等間隔')?.click();
    });
    expect(handleDistributeSelected).toHaveBeenCalledWith('vertical');
  });

  it('adds a -90° rotate button reusing the rotate handler', () => {
    const handleRotateSelected = vi.fn();
    renderSheet(['a'], { handleRotateSelected });
    act(() => {
      findButton('-90°回転')?.click();
    });
    expect(handleRotateSelected).toHaveBeenCalledWith(-90);
  });

  it('slant button uses 10 degrees instead of 0.2 radians/degrees and single selection exposes emBoxCenterH', () => {
    const handleSlantSelected = vi.fn();
    const handleAlignSelected = vi.fn();
    renderSheet(['a'], { handleSlantSelected, handleAlignSelected });
    act(() => {
      findButton('斜体')?.click();
      findButton('全角中央')?.click();
    });
    expect(handleSlantSelected).toHaveBeenCalledWith(10);
    expect(handleAlignSelected).toHaveBeenCalledWith('emBoxCenterH');
  });
});
