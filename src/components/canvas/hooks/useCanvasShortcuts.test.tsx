// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { useCanvasShortcuts, UseCanvasShortcutsProps } from './useCanvasShortcuts';
import { GridSettings } from '../../../types';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const gridSettings = {
  showGrid: true,
  gridSize: 100,
  snapToGrid: false,
  snapToPoints: false,
  snapToGuides: false,
  showMetrics: false,
  showPoints: true,
  showHandles: true,
} as GridSettings;

function baseProps(overrides: Partial<UseCanvasShortcutsProps> = {}): UseCanvasShortcutsProps {
  return {
    isAnyModalOpen: false,
    toolMode: 'select',
    activePenContour: null,
    selectedContourIds: [],
    selectedNodeId: null,
    selectedContourId: null,
    rulerMeasurement: null,
    gridSettings,
    resetView: vi.fn(),
    handleZoomStep: vi.fn(),
    handleResetTracePosition: vi.fn(),
    handleResetPenContour: vi.fn(),
    handleUndoPenNode: vi.fn(),
    handleFinishPenContour: vi.fn(),
    handleDeleteSelectedNode: vi.fn(),
    handleDeleteSelected: vi.fn(),
    handleSmoothStrokeSelected: vi.fn(),
    handleDrawRulerAsStroke: vi.fn(),
    setShowNodes: vi.fn(),
    setOutlineOnly: vi.fn(),
    setEraserSize: vi.fn(),
    brushWidth: 40,
    setRulerMeasurement: vi.fn(),
    setSelectedContourIds: vi.fn(),
    setSelectedNodeId: vi.fn(),
    setIsSpacePressed: vi.fn(),
    showCanvasToast: vi.fn(),
    ...overrides,
  };
}

function renderShortcuts(props: UseCanvasShortcutsProps) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  function Harness() {
    useCanvasShortcuts(props);
    return null;
  }
  act(() => {
    root.render(<Harness />);
  });
  const cleanup = () => {
    act(() => {
      root.unmount();
    });
    container.remove();
  };
  return { cleanup };
}

const pressEscape = () => {
  act(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  });
};

describe('useCanvasShortcuts (Round 3, L14)', () => {
  it('Escape cancels the marquee selection instead of clearing the contour selection', () => {
    const setMarqueeSelection = vi.fn();
    const setSelectedContourIds = vi.fn();
    const { cleanup } = renderShortcuts(
      baseProps({
        selectedContourIds: ['c1'],
        marqueeSelection: { start: { x: 0, y: 0 }, current: { x: 10, y: 10 } },
        setMarqueeSelection,
        setSelectedContourIds,
      })
    );
    try {
      pressEscape();
      expect(setMarqueeSelection).toHaveBeenCalledWith(null);
      expect(setSelectedContourIds).not.toHaveBeenCalled();
    } finally {
      cleanup();
    }
  });

  it('Escape cancels an in-progress node drag and keeps the selection', () => {
    const handleCancelNodeDrag = vi.fn(() => true);
    const setSelectedContourIds = vi.fn();
    const { cleanup } = renderShortcuts(
      baseProps({
        selectedContourIds: ['c1'],
        handleCancelNodeDrag,
        setSelectedContourIds,
      })
    );
    try {
      pressEscape();
      expect(handleCancelNodeDrag).toHaveBeenCalledTimes(1);
      expect(setSelectedContourIds).not.toHaveBeenCalled();
    } finally {
      cleanup();
    }
  });

  it('Escape cancels an in-progress transform drag when no node drag is active', () => {
    const handleCancelNodeDrag = vi.fn(() => false);
    const cancelTransformSession = vi.fn();
    const setSelectedContourIds = vi.fn();
    const { cleanup } = renderShortcuts(
      baseProps({
        selectedContourIds: ['c1'],
        handleCancelNodeDrag,
        isTransformActive: true,
        cancelTransformSession,
        setSelectedContourIds,
      })
    );
    try {
      pressEscape();
      expect(handleCancelNodeDrag).toHaveBeenCalledTimes(1);
      expect(cancelTransformSession).toHaveBeenCalledTimes(1);
      expect(setSelectedContourIds).not.toHaveBeenCalled();
    } finally {
      cleanup();
    }
  });

  it('Escape with nothing in progress clears the contour selection', () => {
    const setSelectedContourIds = vi.fn();
    const setSelectedNodeId = vi.fn();
    const { cleanup } = renderShortcuts(
      baseProps({
        selectedContourIds: ['c1'],
        setSelectedContourIds,
        setSelectedNodeId,
      })
    );
    try {
      pressEscape();
      expect(setSelectedContourIds).toHaveBeenCalledWith([]);
      expect(setSelectedNodeId).toHaveBeenCalledWith(null);
    } finally {
      cleanup();
    }
  });

  it('handles JIS zoom out (Shift + Minus => =) without zooming in and ignores Shift+1 (!) for fit view', () => {
    const handleZoomStep = vi.fn();
    const resetView = vi.fn();
    const { cleanup } = renderShortcuts(
      baseProps({
        handleZoomStep,
        resetView,
      })
    );
    try {
      act(() => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', { key: '=', code: 'Minus', shiftKey: true, bubbles: true, cancelable: true })
        );
      });
      expect(handleZoomStep).toHaveBeenCalledWith(1 / 1.25);

      act(() => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', { key: '!', code: 'Digit1', shiftKey: true, bubbles: true, cancelable: true })
        );
      });
      expect(resetView).not.toHaveBeenCalled();
    } finally {
      cleanup();
    }
  });

  it('does not hijack Enter when an interactive button has focus, but navigates on canvas/body focus', () => {
    const onSelectNextGlyph = vi.fn();
    const onSelectPrevGlyph = vi.fn();
    const button = document.createElement('button');
    document.body.appendChild(button);
    button.focus();

    const { cleanup } = renderShortcuts(
      baseProps({
        onSelectNextGlyph,
        onSelectPrevGlyph,
      })
    );
    try {
      act(() => {
        button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
      });
      expect(onSelectNextGlyph).not.toHaveBeenCalled();

      button.blur();
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
        window.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true, cancelable: true })
        );
      });
      expect(onSelectNextGlyph).toHaveBeenCalledTimes(1);
      expect(onSelectPrevGlyph).toHaveBeenCalledTimes(1);
    } finally {
      button.remove();
      cleanup();
    }
  });
});
