import React, { useCallback } from 'react';
import { Point, ToolMode } from '../../../types';

export interface UsePointerMetricsDragOptions {
  zoom: number;
  lsb: number;
  advanceWidth: number;
  onChangeLsb: (val: number) => void;
  onChangeAdvanceWidth: (val: number) => void;
  draggingMetric: 'lsb' | 'rsb' | null;
  setDraggingMetric: (m: 'lsb' | 'rsb' | null) => void;
  lockGuidelines: boolean;
  toolMode: ToolMode;
  isDrawingTool: boolean;
  showCanvasToast: (msg: string, desc?: string) => void;
}

export function usePointerMetricsDrag({
  zoom,
  lsb,
  advanceWidth,
  onChangeLsb,
  onChangeAdvanceWidth,
  draggingMetric,
  setDraggingMetric,
  lockGuidelines,
  toolMode,
  isDrawingTool,
  showCanvasToast,
}: UsePointerMetricsDragOptions) {
  // Hit-test and start dragging LSB or RSB line on pointer down
  const handleMetricsPointerDown = useCallback(
    (pos: Point, e: React.PointerEvent<SVGSVGElement>): boolean => {
      const isTouch = e.pointerType === 'touch';
      const metricHitDist = isTouch ? Math.max(30 / zoom, 26) : 18 / zoom;
      const isMetricDragAllowed = !lockGuidelines && !isDrawingTool && (toolMode === 'select' || toolMode === 'ruler');

      if (isMetricDragAllowed) {
        if (Math.abs(pos.x - lsb) <= metricHitDist) {
          setDraggingMetric('lsb');
          return true;
        }
        if (Math.abs(pos.x - advanceWidth) <= metricHitDist) {
          setDraggingMetric('rsb');
          return true;
        }
      } else if (
        lockGuidelines &&
        toolMode === 'select' &&
        (Math.abs(pos.x - lsb) <= metricHitDist || Math.abs(pos.x - advanceWidth) <= metricHitDist)
      ) {
        showCanvasToast('ガイド・文字幅線はロックされています', 'ヘッダーの鍵アイコンでロック解除できます');
      }

      return false;
    },
    [zoom, lsb, advanceWidth, lockGuidelines, isDrawingTool, toolMode, setDraggingMetric, showCanvasToast]
  );

  // Update LSB or RSB position while dragging
  const handleMetricsPointerMove = useCallback(
    (pos: Point): boolean => {
      if (draggingMetric === 'lsb') {
        onChangeLsb(Math.max(0, Math.min(pos.x, advanceWidth - 50)));
        return true;
      }
      if (draggingMetric === 'rsb') {
        onChangeAdvanceWidth(Math.max(lsb + 50, Math.min(2000, pos.x)));
        return true;
      }
      return false;
    },
    [draggingMetric, advanceWidth, lsb, onChangeLsb, onChangeAdvanceWidth]
  );

  // Terminate metric drag on pointer up
  const handleMetricsPointerUp = useCallback(() => {
    setDraggingMetric(null);
  }, [setDraggingMetric]);

  return {
    handleMetricsPointerDown,
    handleMetricsPointerMove,
    handleMetricsPointerUp,
  };
}
