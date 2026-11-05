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
    (mode: 'fit' | 'width' | '100%' = 'fit', explicitW?: number, explicitH?: number) => {
      let cWidth = explicitW && explicitW > 0 ? explicitW : 0;
      let cHeight = explicitH && explicitH > 0 ? explicitH : 0;

      if (cWidth <= 0 || cHeight <= 0) {
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
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

      if (mode === '100%') {
        setZoom(1.0);
        setPan({
          x: Math.round((cWidth - upm) / 2),
          y: Math.round((cHeight - upm) / 2),
        });
        return;
      }

      if (mode === 'width') {
        const margin = cWidth < 640 ? 12 : 24;
        const widthZoom = Math.max(0.35, Math.min(3.5, (cWidth - margin) / upm));
        setZoom(widthZoom);
        setPan({
          x: Math.round((cWidth - upm * widthZoom) / 2),
          y: Math.round(Math.max(16, (cHeight - upm * widthZoom) / 2)),
        });
        return;
      }

      // Default 'fit': comfortable, optimal margin (12px on mobile, 28px on desktop/iPad)
      const margin = cWidth < 640 ? 12 : 28;
      const idealZoom = Math.min(
        Math.max(0.1, (cWidth - margin) / upm),
        Math.max(0.1, (cHeight - margin) / upm)
      );
      const clampedZoom = Math.max(0.35, Math.min(3.5, idealZoom));
      setZoom(clampedZoom);
      setPan({
        x: Math.round((cWidth - upm * clampedZoom) / 2),
        y: Math.round((cHeight - upm * clampedZoom) / 2),
      });
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

  // Screen to Canvas Coordinates Converter (Always fresh rect with exact subpixel mapping and zero drift)
  const screenToCanvas = useCallback((clientX: number, clientY: number): Point => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    containerRectRef.current = rect;
    const currentZoom = zoomRef.current || 1;
    const currentPan = panRef.current || { x: 0, y: 0 };
    const x = (clientX - rect.left - currentPan.x) / currentZoom;
    const y = (clientY - rect.top - currentPan.y) / currentZoom;
    return { x, y };
  }, []);

  // Canvas to Screen Coordinates Converter
  const canvasToScreen = useCallback((canvasX: number, canvasY: number): Point => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    containerRectRef.current = rect;
    const currentZoom = zoomRef.current || 1;
    const currentPan = panRef.current || { x: 0, y: 0 };
    return {
      x: rect.left + currentPan.x + canvasX * currentZoom,
      y: rect.top + currentPan.y + canvasY * currentZoom,
    };
  }, []);

  // Invalidate cached container rect on window resize/orientation change or scrolling
  useEffect(() => {
    const handleInvalidateContainerRect = () => {
      containerRectRef.current = null;
    };
    const handleWindowResize = () => {
      containerRectRef.current = null;
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          resetView('fit', rect.width, rect.height);
        }
      }
    };
    window.addEventListener('resize', handleWindowResize);
    window.addEventListener('scroll', handleInvalidateContainerRect);
    return () => {
      window.removeEventListener('resize', handleWindowResize);
      window.removeEventListener('scroll', handleInvalidateContainerRect);
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
          if (prev.width === 0 || prev.height === 0 || Math.abs(prev.width - width) > 100) {
            resetView('fit', width, height);
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
