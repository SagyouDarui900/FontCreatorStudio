import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Point } from '../../../types';

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
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  const panRef = useRef<Point>(pan);
  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  // Boundary Clamping for Viewport Panning (prevents canvas from drifting into infinite empty space)
  const clampPan = useCallback(
    (p: Point, currentZoom: number): Point => {
      if (!containerRef.current) return p;
      const rect = containerRef.current.getBoundingClientRect();
      const cWidth = rect.width;
      const cHeight = rect.height;
      if (cWidth <= 0 || cHeight <= 0) return p;

      const canvasWidth = upm * currentZoom;
      const canvasHeight = upm * currentZoom;

      // Minimum visible overlap: keep at least 35% or 180px in view
      const minVisibleX = Math.min(canvasWidth * 0.35, 180);
      const minVisibleY = Math.min(canvasHeight * 0.35, 180);

      const minX = -canvasWidth + minVisibleX;
      const maxX = cWidth - minVisibleX;
      const minY = -canvasHeight + minVisibleY;
      const maxY = cHeight - minVisibleY;

      return {
        x: Math.min(maxX, Math.max(minX, p.x)),
        y: Math.min(maxY, Math.max(minY, p.y)),
      };
    },
    [upm]
  );

  // Auto-center canvas on initial mount, resize, or drawer toggle with optimal zoom
  const resetView = useCallback(
    (mode: 'fit' | 'width' | '100%' = 'fit') => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;

        if (mode === '100%') {
          setZoom(1.0);
          setPan({
            x: (rect.width - upm) / 2,
            y: (rect.height - upm) / 2,
          });
          return;
        }

        if (mode === 'width') {
          const margin = rect.width < 640 ? 12 : 24;
          const widthZoom = Math.max(0.35, Math.min(3.5, (rect.width - margin) / upm));
          setZoom(widthZoom);
          setPan({
            x: (rect.width - upm * widthZoom) / 2,
            y: Math.max(16, (rect.height - upm * widthZoom) / 2),
          });
          return;
        }

        // Default 'fit': comfortable, optimal margin (12px on mobile, 28px on desktop/iPad)
        const margin = rect.width < 640 ? 12 : 28;
        const idealZoom = Math.min((rect.width - margin) / upm, (rect.height - margin) / upm);
        const clampedZoom = Math.max(0.35, Math.min(3.5, idealZoom));
        setZoom(clampedZoom);
        setPan({
          x: (rect.width - upm * clampedZoom) / 2,
          y: (rect.height - upm * clampedZoom) / 2,
        });
      }
    },
    [upm]
  );

  // Smooth centered zoom step helper
  const handleZoomStep = useCallback(
    (factor: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      setZoom((prevZoom) => {
        const nextZoom = Math.max(0.35, Math.min(5.0, prevZoom * factor));
        const scale = nextZoom / prevZoom;
        setPan((prevPan) => {
          const newPan = {
            x: centerX - (centerX - prevPan.x) * scale,
            y: centerY - (centerY - prevPan.y) * scale,
          };
          return clampPan(newPan, nextZoom);
        });
        return nextZoom;
      });
    },
    [clampPan]
  );

  // Screen to Canvas Coordinates Converter (Pure geometric mapping with zero drift & zero layout thrashing)
  const screenToCanvas = useCallback((clientX: number, clientY: number): Point => {
    let rect = containerRectRef.current;
    if (!rect) {
      rect = containerRef.current?.getBoundingClientRect() || null;
      if (rect) {
        containerRectRef.current = rect;
      }
    }
    if (!rect) return { x: 0, y: 0 };
    const currentZoom = zoomRef.current || 1;
    const currentPan = panRef.current || { x: 0, y: 0 };
    const x = (clientX - rect.left - currentPan.x) / currentZoom;
    const y = (clientY - rect.top - currentPan.y) / currentZoom;
    return { x: Math.round(x), y: Math.round(y) };
  }, []);

  // Canvas to Screen Coordinates Converter
  const canvasToScreen = useCallback((canvasX: number, canvasY: number): Point => {
    let rect = containerRectRef.current;
    if (!rect) {
      rect = containerRef.current?.getBoundingClientRect() || null;
      if (rect) {
        containerRectRef.current = rect;
      }
    }
    if (!rect) return { x: 0, y: 0 };
    const currentZoom = zoomRef.current || 1;
    const currentPan = panRef.current || { x: 0, y: 0 };
    return {
      x: Math.round(rect.left + currentPan.x + canvasX * currentZoom),
      y: Math.round(rect.top + currentPan.y + canvasY * currentZoom),
    };
  }, []);

  // Invalidate cached container rect on window resize/orientation change or scrolling
  useEffect(() => {
    const handleInvalidateContainerRect = () => {
      containerRectRef.current = null;
    };
    window.addEventListener('resize', handleInvalidateContainerRect);
    window.addEventListener('scroll', handleInvalidateContainerRect);
    return () => {
      window.removeEventListener('resize', handleInvalidateContainerRect);
      window.removeEventListener('scroll', handleInvalidateContainerRect);
    };
  }, []);

  // Auto-recenter and fit canvas whenever project UPM (canvas size) changes
  const prevUpmRef = useRef<number>(upm);
  useEffect(() => {
    if (prevUpmRef.current !== upm) {
      prevUpmRef.current = upm;
      resetView('fit');
    }
  }, [upm, resetView]);

  // Auto-fit on initial mount
  useEffect(() => {
    resetView('fit');
  }, [resetView]);

  // ResizeObserver to adapt cleanly when sidebar drawers slide open or close, or orientation changes
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          const prev = containerDimensionsRef.current;
          if (prev.width === 0) {
            resetView('fit');
          } else {
            setPan((prevPan) => clampPan(prevPan, zoomRef.current));
          }
          containerDimensionsRef.current = { width, height };
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
