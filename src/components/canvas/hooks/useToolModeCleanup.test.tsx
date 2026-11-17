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
}: {
  toolMode: ToolMode;
  selectedUnicode: number;
  handleNodeDragEnd: () => boolean;
  finalizeBrushDrawing: () => boolean;
  setActiveSnapGuides: React.Dispatch<React.SetStateAction<any[]>>;
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
    handleTransformPointerUp: vi.fn(() => false),
    handleEraserPointerUp: vi.fn(() => false),
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
});
