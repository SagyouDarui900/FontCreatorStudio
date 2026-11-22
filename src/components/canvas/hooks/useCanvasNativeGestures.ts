import { useEffect } from 'react';
import { Point, ToolMode, TraceSettings } from '../../../types';
import { computeWheelZoomTransform } from './viewportMath';
import { clampTraceScale } from '../traceOptions';
import { setLiveViewport } from '../viewportStore';

export interface UseCanvasNativeGesturesProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  canvasGroupRef: React.RefObject<SVGGElement | null>;
  getContainerRectFast: () => { left: number; top: number; width: number; height: number } | null;
  upm: number;
  isAnyModalOpenRef: React.RefObject<boolean>;
  toolModeRef: React.RefObject<ToolMode>;
  brushWidthRef: React.RefObject<number>;
  eraserSizeRef: React.RefObject<number>;
  onChangeBrushWidthRef: React.RefObject<((w: number) => void) | undefined>;
  onChangeTraceSettingsRef: React.RefObject<React.Dispatch<React.SetStateAction<TraceSettings>> | undefined>;
  setEraserSize: React.Dispatch<React.SetStateAction<number>>;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  setPan: React.Dispatch<React.SetStateAction<Point>>;
  zoomRef: React.MutableRefObject<number>;
  panRef: React.MutableRefObject<Point>;
  clampPan: (p: Point, z: number) => Point;
  showCanvasToast: (msg: string, sub?: string) => void;
  setTouchLoupeState: React.Dispatch<React.SetStateAction<{ visible: boolean; screenX: number; screenY: number; canvasPos: Point | null }>>;
  isErasingRef: React.MutableRefObject<boolean>;
  resetEraserVisuals: () => void;
  touchPointersRef: React.MutableRefObject<Map<number, Point>>;
  pointerTypesRef: React.MutableRefObject<Map<number, string>>;
  isTwoFingerGestureRef: React.MutableRefObject<boolean>;
  twoFingerCooldownUntilRef: React.MutableRefObject<number>;
  isPenDrawingRef: React.MutableRefObject<boolean>;
  lastPenActiveTimeRef: React.MutableRefObject<number>;
  onWindowPointerEndRef?: React.RefObject<(() => void) | undefined>;
}

export function useCanvasNativeGestures({
  containerRef,
  canvasGroupRef,
  getContainerRectFast,
  upm,
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
  onWindowPointerEndRef,
}: UseCanvasNativeGesturesProps) {
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let wheelRafId: number | null = null;
    let wheelCommitTimer: ReturnType<typeof setTimeout> | null = null;

    const setSvgGesturing = (active: boolean) => {
      const svgEl = canvasGroupRef.current?.ownerSVGElement;
      if (!svgEl) return;
      if (active) {
        if (svgEl.getAttribute('data-gesturing') !== 'true') {
          svgEl.setAttribute('data-gesturing', 'true');
        }
      } else {
        svgEl.removeAttribute('data-gesturing');
      }
    };

    const applyDirectViewportTransform = () => {
      setLiveViewport(zoomRef.current, panRef.current);
      const g = canvasGroupRef.current;
      if (!g) {
        setZoom(zoomRef.current);
        setPan(panRef.current);
        return;
      }
      setSvgGesturing(true);
      g.setAttribute('transform', `translate(${panRef.current.x}, ${panRef.current.y}) scale(${zoomRef.current})`);
    };

    const commitWheelViewport = () => {
      wheelCommitTimer = null;
      if (wheelRafId !== null) {
        cancelAnimationFrame(wheelRafId);
        wheelRafId = null;
      }
      setSvgGesturing(false);
      setLiveViewport(zoomRef.current, panRef.current);
      setZoom(zoomRef.current);
      setPan(panRef.current);
    };

    const scheduleWheelTransform = () => {
      if (wheelRafId === null) {
        wheelRafId = requestAnimationFrame(() => {
          wheelRafId = null;
          applyDirectViewportTransform();
        });
      }
      if (wheelCommitTimer !== null) {
        clearTimeout(wheelCommitTimer);
      }
      wheelCommitTimer = setTimeout(commitWheelViewport, 100);
    };

    const shouldBypassNativePreventDefault = (target: EventTarget | null) => {
      if (isAnyModalOpenRef.current) return true;
      if (target instanceof Element) {
        return Boolean(target.closest('[role="dialog"], [data-allow-native-scroll="true"]'));
      }
      return false;
    };

    const preventAll = (e: Event) => {
      if (shouldBypassNativePreventDefault(e.target)) return;
      if (e.cancelable) {
        e.preventDefault();
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (shouldBypassNativePreventDefault(e.target)) return;
      // Prevent browser native zoom & multi-touch gestures when touching canvas
      if (e.touches.length >= 2 && e.cancelable) {
        e.preventDefault();
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (shouldBypassNativePreventDefault(e.target)) return;
      // Inside canvas area, touches are strictly for drawing or 2-finger panning. Always prevent page scrolling/bouncing.
      if (e.cancelable) {
        e.preventDefault();
      }
    };

    const handleWheelNative = (e: WheelEvent) => {
      if (shouldBypassNativePreventDefault(e.target)) return;
      if (e.cancelable) {
        e.preventDefault();
      }

      if (isAnyModalOpenRef.current) return;
      const rect = getContainerRectFast();
      if (!rect) return;
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
          const nextScale = Math.round(clampTraceScale(currentScale + delta) * 100) / 100;
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

      // 3. Ctrl / Cmd + Wheel (including Trackpad two-finger pinch): Smooth GPU-batched Zoom
      if (e.ctrlKey || e.metaKey) {
        const result = computeWheelZoomTransform({
          currentZoom: zoomRef.current,
          currentPan: panRef.current,
          deltaY,
          mouseX,
          mouseY,
          upm,
          viewportWidth: rect.width,
          viewportHeight: rect.height,
        });
        zoomRef.current = result.zoom;
        panRef.current = result.pan;
        scheduleWheelTransform();
        return;
      }

      // 4. Shift + Wheel: Horizontal Scroll (Pan X)
      if (e.shiftKey) {
        const scrollAmount = Math.abs(deltaY) > Math.abs(deltaX) ? deltaY : deltaX;
        const nextPan = clampPan(
          {
            x: panRef.current.x - scrollAmount,
            y: panRef.current.y,
          },
          zoomRef.current
        );
        panRef.current = nextPan;
        scheduleWheelTransform();
        return;
      }

      // 5. Default Wheel (No modifier): Vertical Scroll (Pan Y) + Horizontal Scroll (deltaX)
      const nextPan = clampPan(
        {
          x: panRef.current.x - deltaX,
          y: panRef.current.y - deltaY,
        },
        zoomRef.current
      );
      panRef.current = nextPan;
      scheduleWheelTransform();
    };

    el.addEventListener('gesturestart', preventAll, { passive: false });
    el.addEventListener('gesturechange', preventAll, { passive: false });
    el.addEventListener('gestureend', preventAll, { passive: false });
    el.addEventListener('touchstart', handleTouchStart, { passive: false });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('wheel', handleWheelNative, { passive: false });

    // Window level safety release: if finger, mouse, or pen is lifted outside canvas window or interrupted
    const handleWindowPointerUpOrCancel = (e: PointerEvent) => {
      const wasTwoFinger = isTwoFingerGestureRef.current;
      setTouchLoupeState((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      if (e.type === 'pointercancel' && isErasingRef.current) {
        resetEraserVisuals();
      }
      if (e.pointerType === 'touch') {
        touchPointersRef.current.delete(e.pointerId);
        pointerTypesRef.current.delete(e.pointerId);
        if (touchPointersRef.current.size === 0) {
          if (wasTwoFinger) {
            twoFingerCooldownUntilRef.current = Date.now() + 150;
            setSvgGesturing(false);
            setZoom(zoomRef.current);
            setPan(panRef.current);
          }
          isTwoFingerGestureRef.current = false;
        }
      } else if (e.pointerType === 'pen') {
        isPenDrawingRef.current = false;
        lastPenActiveTimeRef.current = Date.now();
      }
      if (!wasTwoFinger) {
        onWindowPointerEndRef?.current?.();
      }
      if (isErasingRef.current) {
        resetEraserVisuals();
      }
    };

    window.addEventListener('pointerup', handleWindowPointerUpOrCancel);
    window.addEventListener('pointercancel', handleWindowPointerUpOrCancel);

    return () => {
      if (wheelRafId !== null) cancelAnimationFrame(wheelRafId);
      if (wheelCommitTimer !== null) clearTimeout(wheelCommitTimer);
      setSvgGesturing(false);
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
    containerRef,
    canvasGroupRef,
    getContainerRectFast,
    upm,
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
    onWindowPointerEndRef,
  ]);
}
