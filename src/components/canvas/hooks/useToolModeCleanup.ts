import React, { useEffect, useCallback } from 'react';
import { ToolMode, Point, SnapGuideLine } from '../../../types';
import { isShapeToolMode } from './useShapeCreation';

export interface TouchLoupeState {
  visible: boolean;
  screenX: number;
  screenY: number;
  canvasPos: Point | null;
}

export interface UseToolModeCleanupOptions {
  toolMode: ToolMode;
  selectedUnicode: number;
  gridSettingsShowRulers?: boolean;
  setShowMobilePartSheet: (open: boolean) => void;
  setMarqueeSelection: (val: { start: Point; current: Point } | null) => void;
  handleResetPenContour: () => void;
  resetShapeCreation: () => void;
  resetEraserVisuals: () => void;
  setRulerMeasurement: (val: any) => void;
  cancelTransformSession: () => void;
  setActiveSnapGuides: (guides: SnapGuideLine[]) => void;
  setTouchLoupeState: React.Dispatch<React.SetStateAction<TouchLoupeState>>;
  resetBrushDrawing: () => void;
  setActivePenContour: (val: any) => void;
  setShapeStartPoint: (pt: Point | null) => void;
  setShapeCurrentPoint: (pt: Point | null) => void;
  setTransformSession: (val: any) => void;
  setSelectedContourIds: (ids: string[]) => void;
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
}

export function useToolModeCleanup(options: UseToolModeCleanupOptions) {
  const {
    toolMode,
    selectedUnicode,
    gridSettingsShowRulers,
    setShowMobilePartSheet,
    setMarqueeSelection,
    handleResetPenContour,
    resetShapeCreation,
    resetEraserVisuals,
    setRulerMeasurement,
    cancelTransformSession,
    setActiveSnapGuides,
    setTouchLoupeState,
    resetBrushDrawing,
    setActivePenContour,
    setShapeStartPoint,
    setShapeCurrentPoint,
    setTransformSession,
    setSelectedContourIds,
    setSelectedNodeId,
    setSelectedHandleType,
    setDraggingMetric,
    setDraggingGuidelineId,
    activeBrushPathRef,
    activeBrushSvgDRef,
    pendingTransformContoursRef,
    isPenDrawingRef,
    isTwoFingerGestureRef,
    setIsPanning,
    resetTraceDragState,
    nodeDragSessionRef,
    drawingReticleRef,
    isErasingRef,
    activeDrawingPointerIdRef,
  } = options;

  // 1. Tool Switch Cleanup: Clean uncommitted work when switching away from a tool
  useEffect(() => {
    if (activeDrawingPointerIdRef) {
      activeDrawingPointerIdRef.current = null;
    }
    if (toolMode !== 'select' && toolMode !== 'node') {
      setShowMobilePartSheet(false);
      setMarqueeSelection(null);
    }
    if (toolMode !== 'pen') {
      handleResetPenContour();
    }
    if (!isShapeToolMode(toolMode)) {
      resetShapeCreation();
    }
    if (toolMode !== 'eraser') {
      resetEraserVisuals();
    }
    if (toolMode !== 'brush') {
      resetBrushDrawing();
    }
    if (toolMode !== 'ruler' || gridSettingsShowRulers === false) {
      setRulerMeasurement(null);
    }
    cancelTransformSession();
    setActiveSnapGuides([]);
    setTouchLoupeState((prev: TouchLoupeState) => (prev.visible ? { ...prev, visible: false } : prev));
  }, [
    toolMode,
    gridSettingsShowRulers,
    handleResetPenContour,
    resetShapeCreation,
    resetEraserVisuals,
    resetBrushDrawing,
    cancelTransformSession,
    setActiveSnapGuides,
    setTouchLoupeState,
    setShowMobilePartSheet,
    setRulerMeasurement,
    setMarqueeSelection,
  ]);

  // 2. Switching glyphs hygiene: Clear all transient canvas interactions across glyphs
  useEffect(() => {
    if (activeDrawingPointerIdRef) {
      activeDrawingPointerIdRef.current = null;
    }
    resetBrushDrawing();
    resetEraserVisuals();
    setActivePenContour(null);
    setShapeStartPoint(null);
    setShapeCurrentPoint(null);
    setMarqueeSelection(null);
    setTransformSession(null);
    setSelectedContourIds([]);
    setSelectedNodeId(null);
    setSelectedHandleType(null);
    setDraggingMetric(null);
    setDraggingGuidelineId(null);
    if (activeBrushPathRef.current) {
      activeBrushPathRef.current.setAttribute('d', '');
    }
    pendingTransformContoursRef.current = null;
    activeBrushSvgDRef.current = '';
  }, [
    selectedUnicode,
    resetBrushDrawing,
    resetEraserVisuals,
    setActivePenContour,
    setDraggingGuidelineId,
    setDraggingMetric,
    setSelectedContourIds,
    setSelectedHandleType,
    setSelectedNodeId,
    setShapeCurrentPoint,
    setShapeStartPoint,
    setTransformSession,
    setMarqueeSelection,
    activeBrushPathRef,
    activeBrushSvgDRef,
    pendingTransformContoursRef,
    activeDrawingPointerIdRef,
  ]);

  // 3. Pointer capture loss handler
  const handleLostPointerCapture = useCallback(() => {
    if (activeDrawingPointerIdRef) {
      activeDrawingPointerIdRef.current = null;
    }
    if (drawingReticleRef.current) drawingReticleRef.current.style.display = 'none';
    if (isErasingRef.current) resetEraserVisuals();
    isPenDrawingRef.current = false;
    isTwoFingerGestureRef.current = false;
    setIsPanning(false);
    resetTraceDragState();
    setDraggingMetric(null);
    setDraggingGuidelineId(null);
    setMarqueeSelection(null);
    nodeDragSessionRef.current = null;
  }, [
    isErasingRef,
    resetEraserVisuals,
    isPenDrawingRef,
    isTwoFingerGestureRef,
    setIsPanning,
    resetTraceDragState,
    setDraggingMetric,
    setDraggingGuidelineId,
    nodeDragSessionRef,
    setMarqueeSelection,
    drawingReticleRef,
    activeDrawingPointerIdRef,
  ]);

  return {
    handleLostPointerCapture,
  };
}
