import { useEffect } from 'react';
import { Point, ToolMode, TraceSettings } from '../../../types';

export interface UseCanvasNativeGesturesProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  isAnyModalOpenRef: React.RefObject<boolean>;
  toolModeRef: React.RefObject<ToolMode>;
  brushWidthRef: React.RefObject<number>;
  eraserSizeRef: React.RefObject<number>;
  onChangeBrushWidthRef: React.RefObject<((w: number) => void) | undefined>;
  onChangeTraceSettingsRef: React.RefObject<React.Dispatch<React.SetStateAction<TraceSettings>> | undefined>;
  setEraserSize: React.Dispatch<React.SetStateAction<number>>;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  setPan: React.Dispatch<React.SetStateAction<Point>>;
  zoomRef: React.RefObject<number>;
  panRef: React.RefObject<Point>;
  zoom: number;
  pan: Point;
  clampPan: (p: Point, z: number) => Point;
  showCanvasToast: (msg: string, sub?: string) => void;
  setTouchLoupeState: React.Dispatch<React.SetStateAction<{ visible: boolean; screenX: number; screenY: number; canvasPos: Point | null }>>;
  isErasingRef: React.RefObject<boolean>;
  resetEraserVisuals: () => void;
  touchPointersRef: React.RefObject<Map<number, Point>>;
  pointerTypesRef: React.RefObject<Map<number, string>>;
  isTwoFingerGestureRef: React.RefObject<boolean>;
  twoFingerCooldownUntilRef: React.RefObject<number>;
  isPenDrawingRef: React.RefObject<boolean>;
  lastPenActiveTimeRef: React.RefObject<number>;
}

export function useCanvasNativeGestures({
  containerRef,
  isAnyModalOpenRef,
  toolModeRef,
  brushWidthRef,
  eraserSizeRef,
  onChangeBrushWidthRef,
  onChangeTraceSettingsRef,
  setEraserSize,
  setZoom,
  setPan,
  zoomRef,
  panRef,
  zoom,
  pan,
  clampPan,
  showCanvasToast,
  setTouchLoupeState,
  isErasingRef,
  resetEraserVisuals,
  touchPointersRef,
  pointerTypesRef,
  isTwoFingerGestureRef,
  twoFingerCooldownUntilRef,
  isPenDrawingRef,
  lastPenActiveTimeRef,
}: UseCanvasNativeGesturesProps) {
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const preventAll = (e: Event) => {
      if (e.cancelable) {
        e.preventDefault();
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      // Prevent browser native zoom & multi-touch gestures when touching canvas
      if (e.touches.length >= 2 && e.cancelable) {
        e.preventDefault();
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      // Inside canvas area, touches are strictly for drawing or 2-finger panning. Always prevent page scrolling/bouncing.
      if (e.cancelable) {
        e.preventDefault();
      }
    };

    const handleWheelNative = (e: WheelEvent) => {
      if (e.cancelable) {
        e.preventDefault();
      }

      if (isAnyModalOpenRef.current) return;
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      let deltaX = e.deltaX;
      let deltaY = e.deltaY;
      if (e.deltaMode === 1) {
        deltaX *= 20;
        deltaY *= 20;
      } else if (e.deltaMode === 2) {
        deltaX *= 400;
        deltaY *= 400;
      }

      // 1. Trace Adjust Mode (when not holding Ctrl / Cmd)
      if (toolModeRef.current === 'trace_adjust' && onChangeTraceSettingsRef.current && !e.ctrlKey && !e.metaKey) {
        const delta = -Math.sign(deltaY) * 0.05;
        onChangeTraceSettingsRef.current((prev) => {
          const currentScale = prev.scale ?? 1;
          const nextScale = Math.round(Math.max(0.2, Math.min(3.0, currentScale + delta)) * 100) / 100;
          return { ...prev, scale: nextScale };
        });
        return;
      }

      // 2. Alt + Wheel: Quick Brush / Eraser Size adjustment
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const sizeDelta = -Math.sign(deltaY) * (e.shiftKey ? 10 : 2);
        if (toolModeRef.current === 'eraser') {
          setEraserSize((prev) => {
            const next = Math.max(2, Math.min(160, prev + sizeDelta));
            showCanvasToast(`消しゴムサイズ: ${next}px`);
            return next;
          });
        } else {
          if (onChangeBrushWidthRef.current) {
            const currentW = brushWidthRef.current || 28;
            const nextW = Math.max(1, Math.min(200, currentW + sizeDelta));
            onChangeBrushWidthRef.current(nextW);
            showCanvasToast(`筆太さ: ${nextW}px`);
          }
        }
        return;
      }

      // 3. Ctrl / Cmd + Wheel: Smooth Zoom centered at mouse pointer (10% to 3200%)
      if (e.ctrlKey || e.metaKey) {
        const zoomFactor = Math.pow(1.12, -deltaY / 100);
        setZoom((prevZoom) => {
          const nextZoom = Math.max(0.1, Math.min(32.0, prevZoom * zoomFactor));
          const scale = nextZoom / prevZoom;

          setPan((prevPan) => {
            const newPan = {
              x: mouseX - (mouseX - prevPan.x) * scale,
              y: mouseY - (mouseY - prevPan.y) * scale,
            };
            return clampPan(newPan, nextZoom);
          });

          return nextZoom;
        });
        return;
      }

      // 4. Shift + Wheel: Horizontal Scroll (Pan X)
      if (e.shiftKey) {
        const scrollAmount = Math.abs(deltaY) > Math.abs(deltaX) ? deltaY : deltaX;
        setPan((prevPan) => {
          const newPan = {
            x: prevPan.x - scrollAmount,
            y: prevPan.y,
          };
          return clampPan(newPan, zoomRef.current);
        });
        return;
      }

      // 5. Default Wheel (No modifier): Vertical Scroll (Pan Y) + Horizontal Scroll (deltaX)
      setPan((prevPan) => {
        const newPan = {
          x: prevPan.x - deltaX,
          y: prevPan.y - deltaY,
        };
        return clampPan(newPan, zoomRef.current);
      });
    };

    el.addEventListener('gesturestart', preventAll, { passive: false });
    el.addEventListener('gesturechange', preventAll, { passive: false });
    el.addEventListener('gestureend', preventAll, { passive: false });
    el.addEventListener('touchstart', handleTouchStart, { passive: false });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('wheel', handleWheelNative, { passive: false });

    // Window level safety release: if finger, mouse, or pen is lifted outside canvas window or interrupted
    const handleWindowPointerUpOrCancel = (e: PointerEvent) => {
      setTouchLoupeState((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      if (isErasingRef.current) {
        resetEraserVisuals();
      }
      if (e.pointerType === 'touch') {
        touchPointersRef.current.delete(e.pointerId);
        pointerTypesRef.current.delete(e.pointerId);
        if (touchPointersRef.current.size === 0) {
          if (isTwoFingerGestureRef.current) {
            twoFingerCooldownUntilRef.current = Date.now() + 150;
            if (
              Math.abs(zoomRef.current - zoom) > 0.001 ||
              Math.abs(panRef.current.x - pan.x) > 0.5 ||
              Math.abs(panRef.current.y - pan.y) > 0.5
            ) {
              setZoom(zoomRef.current);
              setPan(panRef.current);
            }
          }
          isTwoFingerGestureRef.current = false;
        }
      } else if (e.pointerType === 'pen') {
        isPenDrawingRef.current = false;
        lastPenActiveTimeRef.current = Date.now();
      }
    };

    window.addEventListener('pointerup', handleWindowPointerUpOrCancel);
    window.addEventListener('pointercancel', handleWindowPointerUpOrCancel);

    return () => {
      el.removeEventListener('gesturestart', preventAll);
      el.removeEventListener('gesturechange', preventAll);
      el.removeEventListener('gestureend', preventAll);
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('wheel', handleWheelNative);
      window.removeEventListener('pointerup', handleWindowPointerUpOrCancel);
      window.removeEventListener('pointercancel', handleWindowPointerUpOrCancel);
    };
  }, [
    clampPan,
    showCanvasToast,
    zoom,
    pan,
    containerRef,
    isAnyModalOpenRef,
    toolModeRef,
    brushWidthRef,
    eraserSizeRef,
    onChangeBrushWidthRef,
    onChangeTraceSettingsRef,
    setEraserSize,
    setZoom,
    setPan,
    zoomRef,
    panRef,
    setTouchLoupeState,
    isErasingRef,
    resetEraserVisuals,
    touchPointersRef,
    pointerTypesRef,
    isTwoFingerGestureRef,
    twoFingerCooldownUntilRef,
    isPenDrawingRef,
    lastPenActiveTimeRef,
  ]);
}
