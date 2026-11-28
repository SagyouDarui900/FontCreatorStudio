import React, { useEffect, useCallback, useRef } from 'react';
import { ToolMode, Point, PathContour, SnapGuideLine } from '../../../types';
import type { TouchLoupeState } from '../overlays/CanvasTouchLoupe';
import { isShapeToolMode } from './useShapeCreation';
import { setPenMousePos } from '../penMouseStore';

export type { TouchLoupeState };

export interface UseToolModeCleanupOptions {
  toolMode: ToolMode;
  selectedUnicode: number;
  gridSettingsShowRulers?: boolean;
  setShowMobilePartSheet: (open: boolean) => void;
  setMarqueeSelection: (val: { start: Point; current: Point } | null) => void;
  resetShapeCreation: () => void;
  resetEraserVisuals: () => void;
  setRulerMeasurement: (val: any) => void;
  cancelTransformSession: () => void;
  setActiveSnapGuides: React.Dispatch<React.SetStateAction<SnapGuideLine[]>>;
  setTouchLoupeState: React.Dispatch<React.SetStateAction<TouchLoupeState>>;
  resetBrushDrawing: () => void;
  finalizeBrushDrawing?: () => boolean;
  setActivePenContour: (val: any) => void;
  setShapeStartPoint: (pt: Point | null) => void;
  setShapeCurrentPoint: (pt: Point | null) => void;
  setTransformSession: (val: any) => void;
  setSelectedContourIds: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectedNodeId: (id: string | null) => void;
  setSelectedHandleType: (type: 'node' | 'handleIn' | 'handleOut' | null) => void;
  setDraggingMetric: (metric: 'lsb' | 'rsb' | null) => void;
  setDraggingGuidelineId: (id: string | null) => void;
  activeBrushPathRef: React.RefObject<SVGPathElement | null>;
  activeBrushSvgDRef: React.MutableRefObject<string>;
  pendingTransformContoursRef: React.MutableRefObject<any>;
  isPenDrawingRef: React.MutableRefObject<boolean>;
  isTwoFingerGestureRef: React.MutableRefObject<boolean>;
  setIsPanning: (panning: boolean) => void;
  resetTraceDragState: () => void;
  nodeDragSessionRef: React.MutableRefObject<any>;
  drawingReticleRef: React.RefObject<SVGGElement | null>;
  isErasingRef: React.MutableRefObject<boolean>;
  activeDrawingPointerIdRef?: React.MutableRefObject<number | null>;
  handleNodeDragEnd?: () => boolean | void;
  handleNodeDragCancel?: () => boolean | void;
  handleTransformPointerUp?: () => boolean;
  handleEraserPointerUp?: (e?: any) => boolean | void;
  handleRulerPointerUp?: (e?: any) => boolean | void;
  // H9: reset the guide-eraser mode when the tool changes, so it cannot
  // survive into another tool and delete guides on click there.
  setIsGuideEraserActive?: (active: boolean) => void;
  // L13: the uncommitted pen path, to finalize it on tool switch instead
  // of discarding it like the brush stroke is finalized.
  activePenContour?: PathContour | null;
  finalizePenContour?: () => void;
}

export function useToolModeCleanup(options: UseToolModeCleanupOptions) {
  const { toolMode, selectedUnicode, gridSettingsShowRulers } = options;
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // 1. Tool Switch Cleanup: Clean uncommitted work strictly when switching tools
  useEffect(() => {
    const opts = optionsRef.current;
    if (opts.activeDrawingPointerIdRef) {
      opts.activeDrawingPointerIdRef.current = null;
    }
    opts.handleNodeDragEnd?.();
    if (toolMode !== 'select' && toolMode !== 'node') {
      opts.setShowMobilePartSheet(false);
      opts.setMarqueeSelection(null);
      opts.setSelectedNodeId(null);
      opts.setSelectedHandleType(null);
    }
    if (!isShapeToolMode(toolMode)) {
      opts.resetShapeCreation();
    }
    if (toolMode !== 'eraser') {
      opts.resetEraserVisuals();
      opts.isErasingRef.current = false;
    }
    if (toolMode !== 'brush') {
      opts.finalizeBrushDrawing?.();
      opts.resetBrushDrawing();
    }
    if (toolMode !== 'pen') {
      // L13: finalize the uncommitted pen path (as a line, like Enter)
      // instead of discarding it, so switching tools treats the pen
      // like the brush, whose in-progress stroke is also finalized.
      // A single point cannot form a path and is dropped.
      if (opts.activePenContour && opts.activePenContour.nodes.length >= 2) {
        opts.finalizePenContour?.();
      }
      opts.isPenDrawingRef.current = false;
      opts.setActivePenContour(null);
      setPenMousePos(null);
    }
    // H9: the guide-eraser mode belongs to the ruler tool only.
    opts.setIsGuideEraserActive?.(false);
    if (toolMode !== 'ruler' || opts.gridSettingsShowRulers === false) {
      opts.setRulerMeasurement(null);
    }
    opts.cancelTransformSession();
    opts.setDraggingMetric(null);
    opts.setDraggingGuidelineId(null);
    opts.setIsPanning(false);
    opts.resetTraceDragState();
    opts.setActiveSnapGuides((prev) => (prev.length === 0 ? prev : []));
    opts.setTouchLoupeState((prev: TouchLoupeState) => (prev.visible ? { ...prev, visible: false } : prev));
  }, [toolMode]);

  useEffect(() => {
    if (gridSettingsShowRulers === false) {
      optionsRef.current.setRulerMeasurement(null);
    }
  }, [gridSettingsShowRulers]);

  // 2. Switching glyphs hygiene: Clear all transient canvas interactions across glyphs
  useEffect(() => {
    const opts = optionsRef.current;
    if (opts.activeDrawingPointerIdRef) {
      opts.activeDrawingPointerIdRef.current = null;
    }
    opts.resetBrushDrawing();
    opts.resetEraserVisuals();
    opts.isErasingRef.current = false;
    opts.isPenDrawingRef.current = false;
    opts.setActivePenContour(null);
    setPenMousePos(null);
    opts.setShapeStartPoint(null);
    opts.setShapeCurrentPoint(null);
    opts.setMarqueeSelection(null);
    opts.setTransformSession(null);
    opts.setSelectedContourIds((prev) => (prev.length === 0 ? prev : []));
    opts.setSelectedNodeId(null);
    opts.setSelectedHandleType(null);
    opts.setDraggingMetric(null);
    opts.setDraggingGuidelineId(null);
    opts.setIsPanning(false);
    opts.resetTraceDragState();
    opts.setRulerMeasurement(null);
    opts.setActiveSnapGuides((prev) => (prev.length === 0 ? prev : []));
    opts.setTouchLoupeState((prev) =>
      !prev.visible && prev.screenX === 0 && prev.screenY === 0 && prev.canvasPos === null
        ? prev
        : { visible: false, screenX: 0, screenY: 0, canvasPos: null }
    );
    // H9: switching glyphs also ends the ruler-only guide-eraser mode.
    opts.setIsGuideEraserActive?.(false);
    // L16: cancel any in-progress node drag instead of just dropping the
    // session ref: the pending RAF update must not fire after the glyph
    // changed and apply the old glyph's contours to the new one.
    if (opts.handleNodeDragCancel) {
      opts.handleNodeDragCancel();
    } else {
      opts.nodeDragSessionRef.current = null;
    }
    if (opts.activeBrushPathRef.current) {
      opts.activeBrushPathRef.current.setAttribute('d', '');
    }
    opts.pendingTransformContoursRef.current = null;
    opts.activeBrushSvgDRef.current = '';
  }, [selectedUnicode]);

  // 3. Pointer capture loss handler
  const handleLostPointerCapture = useCallback(() => {
    const opts = optionsRef.current;
    if (opts.isTwoFingerGestureRef.current) {
      return;
    }
    if (opts.activeDrawingPointerIdRef) {
      opts.activeDrawingPointerIdRef.current = null;
    }
    opts.finalizeBrushDrawing?.();
    if (opts.drawingReticleRef.current) opts.drawingReticleRef.current.style.display = 'none';
    if (opts.isErasingRef.current) {
      opts.handleEraserPointerUp?.();
      opts.resetEraserVisuals();
    }
    opts.handleRulerPointerUp?.();
    opts.resetShapeCreation();
    opts.handleTransformPointerUp?.();
    opts.handleNodeDragEnd?.();
    opts.isPenDrawingRef.current = false;
    opts.setIsPanning(false);
    opts.resetTraceDragState();
    opts.setDraggingMetric(null);
    opts.setDraggingGuidelineId(null);
    opts.setMarqueeSelection(null);
    opts.setActiveSnapGuides((prev) => (prev.length === 0 ? prev : []));
    opts.setTouchLoupeState((prev: TouchLoupeState) => (prev.visible ? { ...prev, visible: false } : prev));
    opts.nodeDragSessionRef.current = null;
  }, []);

  return {
    handleLostPointerCapture,
  };
}
