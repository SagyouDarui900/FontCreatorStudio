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
  resetShapeCreation: () => void;
  resetEraserVisuals: () => void;
  setRulerMeasurement: (val: any) => void;
  cancelTransformSession: () => void;
  setActiveSnapGuides: (guides: SnapGuideLine[]) => void;
  setTouchLoupeState: React.Dispatch<React.SetStateAction<TouchLoupeState>>;
  resetBrushDrawing: () => void;
  finalizeBrushDrawing?: () => boolean;
  setActivePenContour: (val: any) => void;
  setPenMousePos?: (pos: Point | null) => void;
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
  handleNodeDragEnd?: () => boolean | void;
  handleTransformPointerUp?: () => boolean;
  handleEraserPointerUp?: (e?: any) => boolean | void;
}

export function useToolModeCleanup(options: UseToolModeCleanupOptions) {
  const {
    toolMode,
    selectedUnicode,
    gridSettingsShowRulers,
    setShowMobilePartSheet,
    setMarqueeSelection,
    resetShapeCreation,
    resetEraserVisuals,
    setRulerMeasurement,
    cancelTransformSession,
    setActiveSnapGuides,
    setTouchLoupeState,
    resetBrushDrawing,
    finalizeBrushDrawing,
    setActivePenContour,
    setPenMousePos,
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
    handleNodeDragEnd,
    handleTransformPointerUp,
    handleEraserPointerUp,
  } = options;

  // 1. Tool Switch Cleanup: Clean uncommitted work when switching away from a tool
  useEffect(() => {
    if (activeDrawingPointerIdRef) {
      activeDrawingPointerIdRef.current = null;
    }
    handleNodeDragEnd?.();
    if (toolMode !== 'select' && toolMode !== 'node') {
      setShowMobilePartSheet(false);
      setMarqueeSelection(null);
      setSelectedNodeId(null);
      setSelectedHandleType(null);
    }
    if (!isShapeToolMode(toolMode)) {
      resetShapeCreation();
    }
    if (toolMode !== 'eraser') {
      resetEraserVisuals();
      isErasingRef.current = false;
    }
    if (toolMode !== 'brush') {
      finalizeBrushDrawing?.();
      resetBrushDrawing();
    }
    if (toolMode !== 'pen') {
      setPenMousePos?.(null);
    }
    if (toolMode !== 'ruler' || gridSettingsShowRulers === false) {
      setRulerMeasurement(null);
    }
    cancelTransformSession();
    setDraggingMetric(null);
    setDraggingGuidelineId(null);
    setIsPanning(false);
    resetTraceDragState();
    setActiveSnapGuides([]);
    setTouchLoupeState((prev: TouchLoupeState) => (prev.visible ? { ...prev, visible: false } : prev));
  }, [
    toolMode,
    gridSettingsShowRulers,
    activeDrawingPointerIdRef,
    handleNodeDragEnd,
    resetShapeCreation,
    resetEraserVisuals,
    isErasingRef,
    finalizeBrushDrawing,
    resetBrushDrawing,
    setPenMousePos,
    cancelTransformSession,
    setDraggingMetric,
    setDraggingGuidelineId,
    setIsPanning,
    resetTraceDragState,
    setActiveSnapGuides,
    setTouchLoupeState,
    setShowMobilePartSheet,
    setRulerMeasurement,
    setMarqueeSelection,
    setSelectedNodeId,
    setSelectedHandleType,
  ]);

  // 2. Switching glyphs hygiene: Clear all transient canvas interactions across glyphs
  useEffect(() => {
    if (activeDrawingPointerIdRef) {
      activeDrawingPointerIdRef.current = null;
    }
    resetBrushDrawing();
    resetEraserVisuals();
    isErasingRef.current = false;
    isPenDrawingRef.current = false;
    setActivePenContour(null);
    setPenMousePos?.(null);
    setShapeStartPoint(null);
    setShapeCurrentPoint(null);
    setMarqueeSelection(null);
    setTransformSession(null);
    setSelectedContourIds([]);
    setSelectedNodeId(null);
    setSelectedHandleType(null);
    setDraggingMetric(null);
    setDraggingGuidelineId(null);
    setIsPanning(false);
    resetTraceDragState();
    setRulerMeasurement(null);
    setActiveSnapGuides([]);
    setTouchLoupeState({ visible: false, screenX: 0, screenY: 0, canvasPos: null });
    nodeDragSessionRef.current = null;
    if (activeBrushPathRef.current) {
      activeBrushPathRef.current.setAttribute('d', '');
    }
    pendingTransformContoursRef.current = null;
    activeBrushSvgDRef.current = '';
  }, [
    selectedUnicode,
    resetBrushDrawing,
    resetEraserVisuals,
    isErasingRef,
    isPenDrawingRef,
    setActivePenContour,
    setPenMousePos,
    setDraggingGuidelineId,
    setDraggingMetric,
    setIsPanning,
    resetTraceDragState,
    setRulerMeasurement,
    setActiveSnapGuides,
    setTouchLoupeState,
    setSelectedContourIds,
    setSelectedHandleType,
    setSelectedNodeId,
    setShapeCurrentPoint,
    setShapeStartPoint,
    setTransformSession,
    setMarqueeSelection,
    nodeDragSessionRef,
    activeBrushPathRef,
    activeBrushSvgDRef,
    pendingTransformContoursRef,
    activeDrawingPointerIdRef,
  ]);

  // 3. Pointer capture loss handler
  const handleLostPointerCapture = useCallback(() => {
    if (isTwoFingerGestureRef.current) {
      return;
    }
    if (activeDrawingPointerIdRef) {
      activeDrawingPointerIdRef.current = null;
    }
    finalizeBrushDrawing?.();
    if (drawingReticleRef.current) drawingReticleRef.current.style.display = 'none';
    if (isErasingRef.current) {
      handleEraserPointerUp?.();
      resetEraserVisuals();
    }
    handleTransformPointerUp?.();
    handleNodeDragEnd?.();
    isPenDrawingRef.current = false;
    setIsPanning(false);
    resetTraceDragState();
    setDraggingMetric(null);
    setDraggingGuidelineId(null);
    setMarqueeSelection(null);
    setActiveSnapGuides([]);
    setTouchLoupeState((prev: TouchLoupeState) => (prev.visible ? { ...prev, visible: false } : prev));
    nodeDragSessionRef.current = null;
  }, [
    finalizeBrushDrawing,
    isErasingRef,
    handleEraserPointerUp,
    resetEraserVisuals,
    handleTransformPointerUp,
    handleNodeDragEnd,
    isPenDrawingRef,
    isTwoFingerGestureRef,
    setIsPanning,
    resetTraceDragState,
    setDraggingMetric,
    setDraggingGuidelineId,
    nodeDragSessionRef,
    setMarqueeSelection,
    setActiveSnapGuides,
    setTouchLoupeState,
    drawingReticleRef,
    activeDrawingPointerIdRef,
  ]);

  return {
    handleLostPointerCapture,
  };
}
