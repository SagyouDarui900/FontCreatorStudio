import React, { useCallback, useEffect, useRef, useState } from 'react';
import { STORAGE_KEYS, getStorageItem, setStorageItem } from '../../utils/storageKeys';
import { RadicalsDensity } from './types';

const getDefaultRadicalsWidth = () => {
  if (typeof window !== 'undefined' && window.innerWidth >= 1280) {
    return 352;
  }
  return 320;
};

const clampRadicalsWidth = (width: number) => {
  const maxW =
    typeof window !== 'undefined'
      ? Math.max(320, Math.min(window.innerWidth * 0.68, 760))
      : 760;
  return Math.max(260, Math.min(maxW, Math.round(width)));
};

export function useRadicalsResize() {
  const [drawerWidth, setDrawerWidth] = useState<number>(() => {
    const saved = getStorageItem(STORAGE_KEYS.RADICALS_WIDTH);
    if (saved) {
      const parsed = Number.parseInt(saved, 10);
      if (Number.isFinite(parsed) && parsed >= 260 && parsed <= 760) {
        return parsed;
      }
    }
    return getDefaultRadicalsWidth();
  });

  const [gridDensity, setGridDensity] = useState<RadicalsDensity>(() => {
    const saved = getStorageItem(STORAGE_KEYS.RADICALS_DENSITY);
    if (saved === 'large' || saved === 'medium' || saved === 'compact') {
      return saved;
    }
    return 'medium';
  });

  const [isResizing, setIsResizing] = useState<boolean>(false);
  const cleanupDragRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      cleanupDragRef.current?.();
      cleanupDragRef.current = null;
    };
  }, []);

  const updateDrawerWidth = useCallback((width: number, persist = true) => {
    const clamped = clampRadicalsWidth(width);
    setDrawerWidth(clamped);
    if (persist) {
      setStorageItem(STORAGE_KEYS.RADICALS_WIDTH, String(clamped));
    }
    return clamped;
  }, []);

  const updateGridDensity = useCallback((density: RadicalsDensity) => {
    setGridDensity(density);
    setStorageItem(STORAGE_KEYS.RADICALS_DENSITY, density);
  }, []);

  const resetDrawerWidth = useCallback(() => {
    updateDrawerWidth(getDefaultRadicalsWidth(), true);
  }, [updateDrawerWidth]);

  const handleResizeStart = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();

      cleanupDragRef.current?.();

      const target = e.currentTarget as HTMLElement;
      const pointerId = e.pointerId;
      try {
        target.setPointerCapture?.(pointerId);
      } catch {
        // ignore unsupported capture
      }

      setIsResizing(true);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      const startX = e.clientX;
      const startWidth = drawerWidth;
      let rafId: number | null = null;
      let latestClientX = startX;

      const finishDrag = (persist: boolean) => {
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        setIsResizing(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';

        try {
          if (target.hasPointerCapture?.(pointerId)) {
            target.releasePointerCapture(pointerId);
          }
        } catch {
          // ignore
        }

        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        window.removeEventListener('pointercancel', handlePointerCancel);
        cleanupDragRef.current = null;

        if (persist) {
          const delta = startX - latestClientX;
          updateDrawerWidth(startWidth + delta, true);
        }
      };

      const handlePointerMove = (moveEvent: PointerEvent) => {
        if (moveEvent.pointerId !== pointerId) return;
        moveEvent.preventDefault();
        latestClientX = moveEvent.clientX;
        const delta = startX - latestClientX;
        const nextWidth = clampRadicalsWidth(startWidth + delta);

        if (rafId !== null) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          setDrawerWidth(nextWidth);
        });
      };

      const handlePointerUp = (upEvent: PointerEvent) => {
        if (upEvent.pointerId !== pointerId) return;
        latestClientX = upEvent.clientX;
        finishDrag(true);
      };

      const handlePointerCancel = (cancelEvent: PointerEvent) => {
        if (cancelEvent.pointerId !== pointerId) return;
        finishDrag(true);
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointercancel', handlePointerCancel);

      cleanupDragRef.current = () => finishDrag(false);
    },
    [drawerWidth, updateDrawerWidth]
  );

  return {
    drawerWidth,
    isResizing,
    gridDensity,
    setDrawerWidth: updateDrawerWidth,
    setGridDensity: updateGridDensity,
    resetDrawerWidth,
    handleResizeStart,
  };
}
