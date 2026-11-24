// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { useToolModeCleanup } from './useToolModeCleanup';
import { BatchRadicalModal } from '../../radicalStudio/BatchRadicalModal';
import { ToolMode } from '../../../types';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

function CleanupHarness({
  toolMode,
  selectedUnicode,
  handleNodeDragEnd,
  finalizeBrushDrawing,
  setActiveSnapGuides,
  setIsGuideEraserActive,
  activePenContour,
  finalizePenContour,
  handleNodeDragCancel,
}: {
  toolMode: ToolMode;
  selectedUnicode: number;
  handleNodeDragEnd: () => boolean;
  finalizeBrushDrawing: () => boolean;
  setActiveSnapGuides: React.Dispatch<React.SetStateAction<any[]>>;
  setIsGuideEraserActive?: (active: boolean) => void;
  activePenContour?: any;
  finalizePenContour?: () => void;
  handleNodeDragCancel?: () => boolean;
}) {
  const emptyRef = React.useRef<any>(null);
  const falseRef = React.useRef<boolean>(false);
  const strRef = React.useRef<string>('');
  const numRef = React.useRef<number | null>(null);

  useToolModeCleanup({
    toolMode,
    selectedUnicode,
    gridSettingsShowRulers: true,
    setShowMobilePartSheet: vi.fn(),
    setMarqueeSelection: vi.fn(),
    resetShapeCreation: vi.fn(),
    resetEraserVisuals: vi.fn(),
    setRulerMeasurement: vi.fn(),
    cancelTransformSession: vi.fn(),
    setActiveSnapGuides,
    setTouchLoupeState: vi.fn(),
    resetBrushDrawing: vi.fn(),
    finalizeBrushDrawing,
    setActivePenContour: vi.fn(),
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
    isPenDrawingRef: falseRef,
    isTwoFingerGestureRef: falseRef,
    setIsPanning: vi.fn(),
    resetTraceDragState: vi.fn(),
    nodeDragSessionRef: emptyRef,
    drawingReticleRef: emptyRef,
    isErasingRef: falseRef,
    activeDrawingPointerIdRef: numRef,
    handleNodeDragEnd,
    handleNodeDragCancel,
    handleTransformPointerUp: vi.fn(() => false),
    handleEraserPointerUp: vi.fn(() => false),
    setIsGuideEraserActive,
    activePenContour,
    finalizePenContour,
  });

  return null;
}

describe('useToolModeCleanup & modal render loop guards', () => {
  it('does not re-run tool-switch cleanup when callback identities change on the same toolMode', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const handleNodeDragEnd1 = vi.fn(() => false);
    const handleNodeDragEnd2 = vi.fn(() => false);
    const finalizeBrush1 = vi.fn(() => false);
    const finalizeBrush2 = vi.fn(() => false);
    const setActiveSnapGuides = vi.fn();

    act(() => {
      root.render(
        <CleanupHarness
          toolMode="select"
          selectedUnicode={0x3042}
          handleNodeDragEnd={handleNodeDragEnd1}
          finalizeBrushDrawing={finalizeBrush1}
          setActiveSnapGuides={setActiveSnapGuides}
        />
      );
    });

    expect(handleNodeDragEnd1).toHaveBeenCalledTimes(1);
    expect(finalizeBrush1).toHaveBeenCalledTimes(1);

    // Re-render with new callback identities on the SAME toolMode/selectedUnicode
    act(() => {
      root.render(
        <CleanupHarness
          toolMode="select"
          selectedUnicode={0x3042}
          handleNodeDragEnd={handleNodeDragEnd2}
          finalizeBrushDrawing={finalizeBrush2}
          setActiveSnapGuides={setActiveSnapGuides}
        />
      );
    });

    expect(handleNodeDragEnd2).not.toHaveBeenCalled();
    expect(finalizeBrush2).not.toHaveBeenCalled();
    expect(setActiveSnapGuides).toHaveBeenCalledTimes(2); // only initial mount effects

    // Switching toolMode SHOULD trigger the updated callback ref once
    act(() => {
      root.render(
        <CleanupHarness
          toolMode="pen"
          selectedUnicode={0x3042}
          handleNodeDragEnd={handleNodeDragEnd2}
          finalizeBrushDrawing={finalizeBrush2}
          setActiveSnapGuides={setActiveSnapGuides}
        />
      );
    });

    expect(handleNodeDragEnd2).toHaveBeenCalledTimes(1);
    expect(finalizeBrush2).toHaveBeenCalledTimes(1);

    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('does not loop when BatchRadicalModal renders open without defaultKanjiList', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    expect(() => {
      act(() => {
        root.render(
          <BatchRadicalModal
            isOpen={true}
            onClose={vi.fn()}
            radicalName="テスト部首"
            sourceContours={[]}
            allGlyphs={{}}
            onBatchInsert={vi.fn()}
            theme="dark"
          />
        );
      });
    }).not.toThrow();

    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('H9: switching tools resets the guide-eraser mode', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const setIsGuideEraserActive = vi.fn();

    act(() => {
      root.render(
        <CleanupHarness
          toolMode="ruler"
          selectedUnicode={0x3042}
          handleNodeDragEnd={vi.fn(() => false)}
          finalizeBrushDrawing={vi.fn(() => false)}
          setActiveSnapGuides={vi.fn()}
          setIsGuideEraserActive={setIsGuideEraserActive}
        />
      );
    });
    expect(setIsGuideEraserActive).toHaveBeenCalledWith(false);
    setIsGuideEraserActive.mockClear();

    act(() => {
      root.render(
        <CleanupHarness
          toolMode="select"
          selectedUnicode={0x3042}
          handleNodeDragEnd={vi.fn(() => false)}
          finalizeBrushDrawing={vi.fn(() => false)}
          setActiveSnapGuides={vi.fn()}
          setIsGuideEraserActive={setIsGuideEraserActive}
        />
      );
    });
    expect(setIsGuideEraserActive).toHaveBeenCalledWith(false);

    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('L13: switching away from pen finalizes an uncommitted path with 2+ nodes, like the brush', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const finalizePenContour = vi.fn();
    const penContour = {
      id: 'pen1',
      closed: false,
      nodes: [
        { id: 'n1', x: 100, y: 100, type: 'corner' },
        { id: 'n2', x: 200, y: 100, type: 'corner' },
      ],
    };

    act(() => {
      root.render(
        <CleanupHarness
          toolMode="pen"
          selectedUnicode={0x3042}
          handleNodeDragEnd={vi.fn(() => false)}
          finalizeBrushDrawing={vi.fn(() => false)}
          setActiveSnapGuides={vi.fn()}
          activePenContour={penContour}
          finalizePenContour={finalizePenContour}
        />
      );
    });
    // Mounting in pen mode must not finalize the path being drawn.
    expect(finalizePenContour).not.toHaveBeenCalled();

    act(() => {
      root.render(
        <CleanupHarness
          toolMode="select"
          selectedUnicode={0x3042}
          handleNodeDragEnd={vi.fn(() => false)}
          finalizeBrushDrawing={vi.fn(() => false)}
          setActiveSnapGuides={vi.fn()}
          activePenContour={penContour}
          finalizePenContour={finalizePenContour}
        />
      );
    });
    expect(finalizePenContour).toHaveBeenCalledTimes(1);

    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('L13: a single-point pen path is not finalized on tool switch', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const finalizePenContour = vi.fn();
    const penContour = {
      id: 'pen1',
      closed: false,
      nodes: [{ id: 'n1', x: 100, y: 100, type: 'corner' }],
    };

    act(() => {
      root.render(
        <CleanupHarness
          toolMode="pen"
          selectedUnicode={0x3042}
          handleNodeDragEnd={vi.fn(() => false)}
          finalizeBrushDrawing={vi.fn(() => false)}
          setActiveSnapGuides={vi.fn()}
          activePenContour={penContour}
          finalizePenContour={finalizePenContour}
        />
      );
    });
    act(() => {
      root.render(
        <CleanupHarness
          toolMode="select"
          selectedUnicode={0x3042}
          handleNodeDragEnd={vi.fn(() => false)}
          finalizeBrushDrawing={vi.fn(() => false)}
          setActiveSnapGuides={vi.fn()}
          activePenContour={penContour}
          finalizePenContour={finalizePenContour}
        />
      );
    });
    expect(finalizePenContour).not.toHaveBeenCalled();

    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('L16: switching glyphs cancels an in-progress node drag instead of dropping the session', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const handleNodeDragCancel = vi.fn(() => true);

    act(() => {
      root.render(
        <CleanupHarness
          toolMode="select"
          selectedUnicode={0x3042}
          handleNodeDragEnd={vi.fn(() => false)}
          finalizeBrushDrawing={vi.fn(() => false)}
          setActiveSnapGuides={vi.fn()}
          handleNodeDragCancel={handleNodeDragCancel}
        />
      );
    });
    // The glyph-switch effect also runs on mount.
    expect(handleNodeDragCancel).toHaveBeenCalledTimes(1);

    act(() => {
      root.render(
        <CleanupHarness
          toolMode="select"
          selectedUnicode={0x3044}
          handleNodeDragEnd={vi.fn(() => false)}
          finalizeBrushDrawing={vi.fn(() => false)}
          setActiveSnapGuides={vi.fn()}
          handleNodeDragCancel={handleNodeDragCancel}
        />
      );
    });
    expect(handleNodeDragCancel).toHaveBeenCalledTimes(2);

    act(() => {
      root.unmount();
    });
    container.remove();
  });
});
