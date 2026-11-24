import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Point } from '../../../types';
import { clampPanToViewport, MIN_CANVAS_ZOOM, MAX_CANVAS_ZOOM } from './viewportMath';
import { setLiveViewport, clearLiveViewport, getLiveViewport } from '../viewportStore';

interface UseCanvasViewportOptions {
  upm: number;
  showRulers?: boolean;
}

const RULER_BAR_SIZE = 28;

export function useCanvasViewport({ upm, showRulers = true }: UseCanvasViewportOptions) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const containerRectRef = useRef<DOMRect | null>(null);
  const containerDimensionsRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });

  const [zoom, setZoomState] = useState<number>(0.55);
  const [pan, setPanState] = useState<Point>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStartRef = useRef<Point>({ x: 0, y: 0 });
  const hasUserAdjustedRef = useRef<boolean>(false);

  const setZoom: React.Dispatch<React.SetStateAction<number>> = useCallback((value) => {
    hasUserAdjustedRef.current = true;
    setZoomState(value);
  }, []);

  const setPan: React.Dispatch<React.SetStateAction<Point>> = useCallback((value) => {
    hasUserAdjustedRef.current = true;
    setPanState(value);
  }, []);

  const zoomRef = useRef<number>(zoom);
  zoomRef.current = zoom;

  const panRef = useRef<Point>(pan);
  panRef.current = pan;

  const showRulersRef = useRef<boolean>(showRulers);
  showRulersRef.current = showRulers;

  useEffect(() => {
    setLiveViewport(zoom, pan);
  }, [zoom, pan]);

  // Initialize the live viewport store synchronously on first render so
  // subscribed layers read the correct zoom/pan before the first paint and
  // never need a zoom/pan prop fallback. Idempotent: only writes while the
  // store is empty (fresh mount); the values are the current React state,
  // so a discarded concurrent render leaves exactly what the next render
  // would produce. Later renders are synced by the [zoom, pan] effect above.
  if (getLiveViewport() === null) {
    setLiveViewport(zoom, pan);
  }

  useEffect(() => {
    return () => {
      clearLiveViewport();
    };
  }, []);

  const invalidateContainerRect = useCallback(() => {
    containerRectRef.current = null;
  }, []);

  const getContainerRectFast = useCallback((): { left: number; top: number; width: number; height: number } | null => {
    if (containerRectRef.current) {
      return containerRectRef.current;
    }
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    containerRectRef.current = rect;
    if (rect.width > 0 && rect.height > 0) {
      containerDimensionsRef.current = { width: rect.width, height: rect.height };
    }
    return rect;
  }, []);

  // Boundary Clamping for Viewport Panning (uses cached dimensions to avoid forced reflows during 60-120fps pinch/pan)
  const clampPan = useCallback(
    (p: Point, currentZoom: number): Point => {
      let cWidth = containerDimensionsRef.current.width;
      let cHeight = containerDimensionsRef.current.height;
      if (cWidth <= 0 || cHeight <= 0) {
        const rect = getContainerRectFast();
        if (!rect) return p;
        cWidth = rect.width;
        cHeight = rect.height;
      }
      return clampPanToViewport(p, currentZoom, upm, cWidth, cHeight);
    },
    [upm, getContainerRectFast]
  );

  // Auto-center canvas on initial mount, resize, or drawer toggle with optimal zoom
  const resetView = useCallback(
    (mode: 'fit' | 'width' | '100%' = 'fit', explicitW?: number, explicitH?: number) => {
      let cWidth = explicitW && explicitW > 0 ? explicitW : 0;
      let cHeight = explicitH && explicitH > 0 ? explicitH : 0;

      if (cWidth <= 0 || cHeight <= 0) {
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          containerRectRef.current = rect;
          if (rect.width > 0) cWidth = rect.width;
          if (rect.height > 0) cHeight = rect.height;
        }
      }

      // Safe fallback if measured in an unlaid-out iframe container
      if (cWidth <= 0) {
        cWidth = containerRef.current?.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 800) || 800;
      }
      if (cHeight <= 0) {
        cHeight = containerRef.current?.clientHeight || (typeof window !== 'undefined' ? window.innerHeight - 100 : 600) || 600;
      }

      if (cWidth > 0 && cHeight > 0) {
        containerDimensionsRef.current = { width: cWidth, height: cHeight };
      }

      const rulerInset = showRulersRef.current ? RULER_BAR_SIZE : 0;
      const availW = Math.max(120, cWidth - rulerInset);
      const availH = Math.max(120, cHeight - rulerInset);

      if (mode === '100%') {
        hasUserAdjustedRef.current = true;
        const nextPan = {
          x: Math.round(rulerInset + (availW - upm) / 2),
          y: Math.round(rulerInset + (availH - upm) / 2),
        };
        zoomRef.current = 1.0;
        panRef.current = nextPan;
        setLiveViewport(1.0, nextPan);
        setZoomState((prev) => (prev === 1.0 ? prev : 1.0));
        setPanState((prev) => (prev.x === nextPan.x && prev.y === nextPan.y ? prev : nextPan));
        return;
      }

      if (mode === 'width') {
        hasUserAdjustedRef.current = true;
        const margin = cWidth < 640 ? 16 : 36;
        const widthZoom = Math.max(MIN_CANVAS_ZOOM, Math.min(3.5, (availW - margin) / upm));
        const nextPan = {
          x: Math.round(rulerInset + (availW - upm * widthZoom) / 2),
          y: Math.round(rulerInset + Math.max(16, (availH - upm * widthZoom) / 2)),
        };
        zoomRef.current = widthZoom;
        panRef.current = nextPan;
        setLiveViewport(widthZoom, nextPan);
        setZoomState((prev) => (prev === widthZoom ? prev : widthZoom));
        setPanState((prev) => (prev.x === nextPan.x && prev.y === nextPan.y ? prev : nextPan));
        return;
      }

      // Default 'fit': center in the non-ruler viewport area with comfortable margin
      hasUserAdjustedRef.current = false;
      const margin = cWidth < 640 ? 20 : 44;
      const idealZoom = Math.min(
        Math.max(MIN_CANVAS_ZOOM, (availW - margin) / upm),
        Math.max(MIN_CANVAS_ZOOM, (availH - margin) / upm)
      );
      const clampedZoom = Math.max(MIN_CANVAS_ZOOM, Math.min(3.5, idealZoom));
      const nextPan = {
        x: Math.round(rulerInset + (availW - upm * clampedZoom) / 2),
        y: Math.round(rulerInset + (availH - upm * clampedZoom) / 2),
      };
      zoomRef.current = clampedZoom;
      panRef.current = nextPan;
      setLiveViewport(clampedZoom, nextPan);
      setZoomState((prev) => (prev === clampedZoom ? prev : clampedZoom));
      setPanState((prev) => (prev.x === nextPan.x && prev.y === nextPan.y ? prev : nextPan));
    },
    [upm]
  );

  // Smooth centered zoom step helper
  const handleZoomStep = useCallback(
    (factor: number) => {
      const rect = getContainerRectFast();
      if (!rect) return;
      hasUserAdjustedRef.current = true;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const prevZoom = zoomRef.current;
      const nextZoom = Math.max(MIN_CANVAS_ZOOM, Math.min(MAX_CANVAS_ZOOM, prevZoom * factor));
      const scale = nextZoom / prevZoom;
      const prevPan = panRef.current;
      const nextPan = clampPan(
        {
          x: centerX - (centerX - prevPan.x) * scale,
          y: centerY - (centerY - prevPan.y) * scale,
        },
        nextZoom
      );
      zoomRef.current = nextZoom;
      panRef.current = nextPan;
      setLiveViewport(nextZoom, nextPan);
      setZoomState(nextZoom);
      setPanState(nextPan);
    },
    [clampPan, getContainerRectFast]
  );

  // Screen to Canvas Coordinates Converter (uses cached rect during active gestures)
  const screenToCanvas = useCallback((clientX: number, clientY: number): Point => {
    const rect = getContainerRectFast();
    if (!rect) return { x: 0, y: 0 };
    const currentZoom = zoomRef.current || 1;
    const currentPan = panRef.current || { x: 0, y: 0 };
    const x = (clientX - rect.left - currentPan.x) / currentZoom;
    const y = (clientY - rect.top - currentPan.y) / currentZoom;
    return { x, y };
  }, [getContainerRectFast]);

  // Canvas to Screen Coordinates Converter
  const canvasToScreen = useCallback((canvasX: number, canvasY: number): Point => {
    const rect = getContainerRectFast();
    if (!rect) return { x: 0, y: 0 };
    const currentZoom = zoomRef.current || 1;
    const currentPan = panRef.current || { x: 0, y: 0 };
    return {
      x: rect.left + currentPan.x + canvasX * currentZoom,
      y: rect.top + currentPan.y + canvasY * currentZoom,
    };
  }, [getContainerRectFast]);

  // Invalidate cached container rect on window resize/orientation change or scrolling.
  // A5: a resize keeps the current zoom and pan. Fit is only applied when
  // the container has no size yet (initial layout); the initial mount
  // effect below handles the first fit.
  useEffect(() => {
    const handleInvalidateContainerRect = () => {
      containerRectRef.current = null;
    };
    const handleWindowResize = () => {
      containerRectRef.current = null;
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        containerRectRef.current = rect;
        if (rect.width > 0 && rect.height > 0) {
          containerDimensionsRef.current = { width: rect.width, height: rect.height };
          if (!hasUserAdjustedRef.current) {
            resetView('fit', rect.width, rect.height);
          } else {
            const clamped = clampPan(panRef.current, zoomRef.current);
            if (clamped.x !== panRef.current.x || clamped.y !== panRef.current.y) {
              panRef.current = clamped;
              setLiveViewport(zoomRef.current, clamped);
              setPanState(clamped);
            }
          }
        } else {
          resetView('fit', rect.width, rect.height);
        }
      }
    };
    window.addEventListener('resize', handleWindowResize);
    window.addEventListener('scroll', handleInvalidateContainerRect, { capture: true, passive: true });
    return () => {
      window.removeEventListener('resize', handleWindowResize);
      window.removeEventListener('scroll', handleInvalidateContainerRect, { capture: true });
    };
  }, [resetView, clampPan]);

  // Auto-recenter and fit canvas whenever project UPM (canvas size) changes
  const prevUpmRef = useRef<number>(upm);
  useEffect(() => {
    if (prevUpmRef.current !== upm) {
      prevUpmRef.current = upm;
      resetView('fit');
    }
  }, [upm, resetView]);

  // Auto-fit on initial mount with rAF and timeouts to handle iframe layout delays
  useEffect(() => {
    resetView('fit');
    const rafId = requestAnimationFrame(() => {
      resetView('fit');
    });
    const t1 = setTimeout(() => {
      resetView('fit');
    }, 60);
    const t2 = setTimeout(() => {
      resetView('fit');
    }, 240);
    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [resetView]);

  // ResizeObserver to adapt cleanly when sidebar drawers slide open or close, or orientation changes
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      containerRectRef.current = null;
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          const prev = containerDimensionsRef.current;
          const sizeChanged = Math.abs(prev.width - width) > 1 || Math.abs(prev.height - height) > 1;
          containerDimensionsRef.current = { width, height };
          // Re-fit when container gets its first layout OR changes size before
          // the user manually pans/zooms (e.g. sidebar drawer opening on mount).
          if (prev.width === 0 || prev.height === 0 || (!hasUserAdjustedRef.current && sizeChanged)) {
            resetView('fit', width, height);
          } else {
            const clamped = clampPan(panRef.current, zoomRef.current);
            if (clamped.x !== panRef.current.x || clamped.y !== panRef.current.y) {
              panRef.current = clamped;
              setLiveViewport(zoomRef.current, clamped);
              setPanState(clamped);
            }
          }
        }
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [resetView, clampPan]);

  return {
    containerRef,
    containerRectRef,
    containerDimensionsRef,
    getContainerRectFast,
    invalidateContainerRect,
    zoom,
    setZoom,
    zoomRef,
    pan,
    setPan,
    panRef,
    panStartRef,
    isPanning,
    setIsPanning,
    clampPan,
    resetView,
    handleZoomStep,
    screenToCanvas,
    canvasToScreen,
  };
}
