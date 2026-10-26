import React, { useState, useRef, useCallback } from 'react';
import { TraceSettings } from '../../../types';
import { TraceResizeHandle } from '../TraceReferenceLayer';

interface UseTraceTransformOptions {
  upm: number;
  zoom: number;
  pan: { x: number; y: number };
  containerRef: React.RefObject<HTMLDivElement | null>;
  traceSettings: TraceSettings;
  onChangeTraceSettings?: React.Dispatch<React.SetStateAction<TraceSettings>>;
  activeChar?: string;
  showCanvasToast: (message: string, subText?: string) => void;
}

export function useTraceTransform({
  upm,
  zoom,
  pan,
  containerRef,
  traceSettings,
  onChangeTraceSettings,
  activeChar,
  showCanvasToast,
}: UseTraceTransformOptions) {
  const [isDraggingTrace, setIsDraggingTrace] = useState<boolean>(false);
  const [isResizingTrace, setIsResizingTrace] = useState<boolean>(false);

  const traceDragStartRef = useRef<{
    clientX: number;
    clientY: number;
    initOffsetX: number;
    initOffsetY: number;
  }>({
    clientX: 0,
    clientY: 0,
    initOffsetX: 0,
    initOffsetY: 0,
  });

  const traceResizeStartRef = useRef<{
    clientX: number;
    clientY: number;
    initScale: number;
    initDist: number;
    centerScreenX: number;
    centerScreenY: number;
  }>({
    clientX: 0,
    clientY: 0,
    initScale: 1,
    initDist: 1,
    centerScreenX: 0,
    centerScreenY: 0,
  });

  const handlePointerDownTraceImage = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      setIsDraggingTrace(true);
      traceDragStartRef.current = {
        clientX: e.clientX,
        clientY: e.clientY,
        initOffsetX: traceSettings.offsetX || 0,
        initOffsetY: traceSettings.offsetY || 0,
      };
    },
    [traceSettings.offsetX, traceSettings.offsetY]
  );

  const handlePointerDownTraceResize = useCallback(
    (e: React.PointerEvent, _handle: TraceResizeHandle) => {
      e.stopPropagation();
      setIsResizingTrace(true);
      const rect = containerRef.current?.getBoundingClientRect();
      const currentZoom = zoom;
      const currentPan = pan;
      const centerCanvasX = upm / 2 + (traceSettings.offsetX || 0);
      const centerCanvasY = upm / 2 + (traceSettings.offsetY || 0);
      const centerScreenX = (rect ? rect.left : 0) + currentPan.x + centerCanvasX * currentZoom;
      const centerScreenY = (rect ? rect.top : 0) + currentPan.y + centerCanvasY * currentZoom;
      const initDist = Math.hypot(e.clientX - centerScreenX, e.clientY - centerScreenY);

      traceResizeStartRef.current = {
        clientX: e.clientX,
        clientY: e.clientY,
        initScale: traceSettings.scale ?? 1,
        initDist: Math.max(10, initDist),
        centerScreenX,
        centerScreenY,
      };
    },
    [zoom, pan, traceSettings.offsetX, traceSettings.offsetY, traceSettings.scale, upm, containerRef]
  );

  const handleResetTracePosition = useCallback(() => {
    if (!onChangeTraceSettings) return;
    onChangeTraceSettings((prev) => ({
      ...prev,
      offsetX: 0,
      offsetY: 0,
      rotation: 0,
    }));
    showCanvasToast('下絵の位置を中央(X:0, Y:0)にリセットしました');
  }, [onChangeTraceSettings, showCanvasToast]);

  const handleResetTraceAll = useCallback(() => {
    if (!onChangeTraceSettings) return;
    const isKana = /[ぁ-んァ-ヶー]/.test(traceSettings.text || activeChar || '');
    const isKanji = /[\u4e00-\u9faf\u3400-\u4dbf]/.test(traceSettings.text || activeChar || '');
    const defaultScale = isKana ? 0.78 : isKanji ? 0.85 : 1.0;
    onChangeTraceSettings((prev) => ({
      ...prev,
      offsetX: 0,
      offsetY: 0,
      scale: defaultScale,
      rotation: 0,
    }));
    showCanvasToast(`下絵の位置とサイズ(${Math.round(defaultScale * 100)}%)をリセットしました`);
  }, [onChangeTraceSettings, showCanvasToast, traceSettings.text, activeChar]);

  const handleTracePointerMove = useCallback(
    (e: React.PointerEvent): boolean => {
      if (isDraggingTrace && onChangeTraceSettings) {
        const deltaX = (e.clientX - traceDragStartRef.current.clientX) / zoom;
        const deltaY = (e.clientY - traceDragStartRef.current.clientY) / zoom;
        onChangeTraceSettings((prev) => ({
          ...prev,
          offsetX: Math.round(traceDragStartRef.current.initOffsetX + deltaX),
          offsetY: Math.round(traceDragStartRef.current.initOffsetY + deltaY),
        }));
        return true;
      }

      if (isResizingTrace && onChangeTraceSettings) {
        const { centerScreenX, centerScreenY, initDist, initScale } = traceResizeStartRef.current;
        const currentDist = Math.hypot(e.clientX - centerScreenX, e.clientY - centerScreenY);
        const ratio = currentDist / initDist;
        const rawScale = initScale * ratio;
        const nextScale = Math.round(Math.max(0.2, Math.min(3.0, rawScale)) * 100) / 100;
        onChangeTraceSettings((prev) => ({
          ...prev,
          scale: nextScale,
        }));
        return true;
      }

      return false;
    },
    [isDraggingTrace, isResizingTrace, onChangeTraceSettings, zoom]
  );

  const resetTraceDragState = useCallback(() => {
    setIsDraggingTrace(false);
    setIsResizingTrace(false);
  }, []);

  return {
    isDraggingTrace,
    isResizingTrace,
    handlePointerDownTraceImage,
    handlePointerDownTraceResize,
    handleResetTracePosition,
    handleResetTraceAll,
    handleTracePointerMove,
    resetTraceDragState,
  };
}
