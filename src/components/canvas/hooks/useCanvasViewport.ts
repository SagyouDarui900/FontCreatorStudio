import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Point } from '../../../types';
import { clampPanToViewport } from './viewportMath';

interface UseCanvasViewportOptions {
  upm: number;
}

export function useCanvasViewport({ upm }: UseCanvasViewportOptions) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const containerRectRef = useRef<DOMRect | null>(null);
  const containerDimensionsRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });

  const [zoom, setZoom] = useState<number>(0.55);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStartRef = useRef<Point>({ x: 0, y: 0 });

  const zoomRef = useRef<number>(zoom);
  zoomRef.current = zoom;

  const panRef = useRef<Point>(pan);
  panRef.current = pan;

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

      if (mode === '100%') {
        const nextPan = {
          x: Math.round((cWidth - upm) / 2),
          y: Math.round((cHeight - upm) / 2),
        };
        zoomRef.current = 1.0;
        panRef.current = nextPan;
        setZoom(1.0);
        setPan(nextPan);
        return;
      }

      if (mode === 'width') {
        const margin = cWidth < 640 ? 12 : 24;
        const widthZoom = Math.max(0.35, Math.min(3.5, (cWidth - margin) / upm));
        const nextPan = {
          x: Math.round((cWidth - upm * widthZoom) / 2),
          y: Math.round(Math.max(16, (cHeight - upm * widthZoom) / 2)),
        };
        zoomRef.current = widthZoom;
        panRef.current = nextPan;
        setZoom(widthZoom);
        setPan(nextPan);
        return;
      }

      // Default 'fit': comfortable, optimal margin (12px on mobile, 28px on desktop/iPad)
      const margin = cWidth < 640 ? 12 : 28;
      const idealZoom = Math.min(
        Math.max(0.1, (cWidth - margin) / upm),
        Math.max(0.1, (cHeight - margin) / upm)
      );
      const clampedZoom = Math.max(0.35, Math.min(3.5, idealZoom));
      const nextPan = {
        x: Math.round((cWidth - upm * clampedZoom) / 2),
        y: Math.round((cHeight - upm * clampedZoom) / 2),
      };
      zoomRef.current = clampedZoom;
      panRef.current = nextPan;
      setZoom(clampedZoom);
      setPan(nextPan);
    },
    [upm]
  );

  // Smooth centered zoom step helper
  const handleZoomStep = useCallback(
    (factor: number) => {
      const rect = getContainerRectFast();
      if (!rect) return;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const prevZoom = zoomRef.current;
      const nextZoom = Math.max(0.35, Math.min(5.0, prevZoom * factor));
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
      setZoom(nextZoom);
      setPan(nextPan);
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

  // Invalidate cached container rect on window resize/orientation change or scrolling
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
  }, [resetView]);

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
          containerDimensionsRef.current = { width, height };
          if (prev.width === 0 || prev.height === 0 || Math.abs(prev.width - width) > 100) {
            resetView('fit', width, height);
          } else {
            const clamped = clampPan(panRef.current, zoomRef.current);
            if (clamped.x !== panRef.current.x || clamped.y !== panRef.current.y) {
              panRef.current = clamped;
              setPan(clamped);
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
