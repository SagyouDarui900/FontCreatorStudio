import React, { useCallback, useRef } from 'react';
import { Point, ToolMode } from '../../../types';

export interface UsePointerMetricsDragOptions {
  zoom: number;
  lsb: number;
  advanceWidth: number;
  onChangeLsb: (val: number, options?: { skipHistory?: boolean }) => void;
  onChangeAdvanceWidth: (val: number, options?: { skipHistory?: boolean }) => void;
  onCommitHistory?: () => void;
  draggingMetric: 'lsb' | 'rsb' | null;
  setDraggingMetric: (m: 'lsb' | 'rsb' | null) => void;
  lockGuidelines: boolean;
  toolMode: ToolMode;
  isDrawingTool: boolean;
  upm?: number;
  showCanvasToast: (msg: string, desc?: string) => void;
}

export function usePointerMetricsDrag({
  zoom,
  lsb,
  advanceWidth,
  onChangeLsb,
  onChangeAdvanceWidth,
  onCommitHistory,
  draggingMetric,
  setDraggingMetric,
  lockGuidelines,
  toolMode,
  isDrawingTool,
  upm = 1000,
  showCanvasToast,
}: UsePointerMetricsDragOptions) {
  const hasCommittedMetricHistoryRef = useRef<boolean>(false);

  // Hit-test and start dragging LSB or RSB line on pointer down
  const handleMetricsPointerDown = useCallback(
    (pos: Point, e: React.PointerEvent<SVGSVGElement>): boolean => {
      const isTouch = e.pointerType === 'touch';
      const metricHitDist = isTouch ? Math.max(30 / zoom, 26) : 18 / zoom;
      const isMetricDragAllowed = !lockGuidelines && !isDrawingTool && (toolMode === 'select' || toolMode === 'ruler');

      if (isMetricDragAllowed) {
        if (Math.abs(pos.x - lsb) <= metricHitDist) {
          hasCommittedMetricHistoryRef.current = false;
          setDraggingMetric('lsb');
          return true;
        }
        if (Math.abs(pos.x - advanceWidth) <= metricHitDist) {
          hasCommittedMetricHistoryRef.current = false;
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
      const roundedX = Math.round(pos.x);
      const maxAdv = Math.max(2000, upm * 3);
      if (draggingMetric === 'lsb') {
        if (!hasCommittedMetricHistoryRef.current) {
          onCommitHistory?.();
          hasCommittedMetricHistoryRef.current = true;
        }
        onChangeLsb(Math.max(0, Math.min(roundedX, advanceWidth - 50)), { skipHistory: true });
        return true;
      }
      if (draggingMetric === 'rsb') {
        if (!hasCommittedMetricHistoryRef.current) {
          onCommitHistory?.();
          hasCommittedMetricHistoryRef.current = true;
        }
        onChangeAdvanceWidth(Math.max(lsb + 50, Math.min(maxAdv, roundedX)), { skipHistory: true });
        return true;
      }
      return false;
    },
    [draggingMetric, advanceWidth, lsb, upm, onChangeLsb, onChangeAdvanceWidth, onCommitHistory]
  );

  // Terminate metric drag on pointer up
  const handleMetricsPointerUp = useCallback(() => {
    hasCommittedMetricHistoryRef.current = false;
    setDraggingMetric(null);
  }, [setDraggingMetric]);

  return {
    handleMetricsPointerDown,
    handleMetricsPointerMove,
    handleMetricsPointerUp,
  };
}
