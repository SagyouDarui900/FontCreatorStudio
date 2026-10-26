import React, { useState, useCallback } from 'react';
import { CustomGuideline, Point, ToolMode } from '../../../types';

interface UseCustomGuidelinesOptions {
  upm: number;
  toolMode: ToolMode;
  isShapeTool: boolean;
  showCanvasToast: (message: string, subText?: string) => void;
}

export function useCustomGuidelines({
  upm,
  toolMode,
  isShapeTool,
  showCanvasToast,
}: UseCustomGuidelinesOptions) {
  const [customGuidelines, setCustomGuidelines] = useState<CustomGuideline[]>([]);
  const [lockGuidelines, setLockGuidelines] = useState<boolean>(true);
  const [draggingGuidelineId, setDraggingGuidelineId] = useState<string | null>(null);
  const [newGuidelineType, setNewGuidelineType] = useState<'h' | 'v' | null>(null);
  const [isGuideEraserActive, setIsGuideEraserActive] = useState<boolean>(false);

  const handleDeleteGuideline = useCallback(
    (guideId: string) => {
      setCustomGuidelines((prev) => prev.filter((g) => g.id !== guideId));
      showCanvasToast('ガイド線を削除しました');
    },
    [showCanvasToast]
  );

  const handleClearAllGuidelines = useCallback(() => {
    if (customGuidelines.length === 0) return;
    setCustomGuidelines([]);
    showCanvasToast('すべてのカスタムガイド線を消去しました');
  }, [customGuidelines.length, showCanvasToast]);

  const handlePointerDownGuide = useCallback(
    (e: React.PointerEvent, guideId: string) => {
      if (
        lockGuidelines ||
        toolMode === 'brush' ||
        toolMode === 'pen' ||
        toolMode === 'eraser' ||
        isShapeTool
      ) {
        return;
      }
      e.stopPropagation();
      setDraggingGuidelineId(guideId);
    },
    [lockGuidelines, toolMode, isShapeTool]
  );

  const handleDoubleClickGuide = useCallback(
    (e: React.MouseEvent, guideId: string) => {
      if (
        lockGuidelines ||
        toolMode === 'brush' ||
        toolMode === 'pen' ||
        toolMode === 'eraser' ||
        isShapeTool
      ) {
        return;
      }
      e.stopPropagation();
      setCustomGuidelines((prev) => prev.filter((g) => g.id !== guideId));
    },
    [lockGuidelines, toolMode, isShapeTool]
  );

  const updateDraggingGuideline = useCallback(
    (pos: Point): boolean => {
      if (!draggingGuidelineId) return false;
      setCustomGuidelines((prev) =>
        prev.map((g) => {
          if (g.id !== draggingGuidelineId) return g;
          return {
            ...g,
            position: g.type === 'v' ? Math.max(0, Math.min(upm, pos.x)) : Math.max(0, Math.min(upm, pos.y)),
          };
        })
      );
      return true;
    },
    [draggingGuidelineId, upm]
  );

  return {
    customGuidelines,
    setCustomGuidelines,
    lockGuidelines,
    setLockGuidelines,
    draggingGuidelineId,
    setDraggingGuidelineId,
    newGuidelineType,
    setNewGuidelineType,
    isGuideEraserActive,
    setIsGuideEraserActive,
    handleDeleteGuideline,
    handleClearAllGuidelines,
    handlePointerDownGuide,
    handleDoubleClickGuide,
    updateDraggingGuideline,
  };
}
