import React, { useState, useCallback, useRef } from 'react';
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

  // H9: deleting a guideline cannot be undone (guidelines are outside
  // glyph history), so confirm first.
  const handleDeleteGuideline = useCallback(
    (guideId: string) => {
      if (!window.confirm('ガイド線を削除しますか？この操作は取り消せません。')) {
        return;
      }
      setCustomGuidelines((prev) => prev.filter((g) => g.id !== guideId));
      showCanvasToast('ガイド線を削除しました');
    },
    [showCanvasToast]
  );

  // M14: clearing all guidelines cannot be undone either. Returns true
  // when the guidelines were actually cleared, so callers that also close
  // a modal (GuidesAndGridModal) can skip closing on cancel.
  const handleClearAllGuidelines = useCallback(() => {
    if (customGuidelines.length === 0) return false;
    if (
      !window.confirm(
        `カスタムガイド線を ${customGuidelines.length} 本すべて消去しますか？この操作は取り消せません。`
      )
    ) {
      return false;
    }
    setCustomGuidelines([]);
    showCanvasToast('すべてのカスタムガイド線を消去しました');
    return true;
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
      // M5: anchor the diagonal-drag delta here so the first move after
      // grab does not jump by a stale delta.
      lastGuidelineDragIdRef.current = guideId;
      lastGuidelineDragPosRef.current = null;
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
      handleDeleteGuideline(guideId);
    },
    [lockGuidelines, toolMode, isShapeTool, handleDeleteGuideline]
  );

  // Last pointer position of the active guideline drag, for the
  // diagonal-guide delta (M5). Horizontal/vertical guides move by
  // absolute position and do not need it.
  const lastGuidelineDragPosRef = useRef<Point | null>(null);
  const lastGuidelineDragIdRef = useRef<string | null>(null);

  const updateDraggingGuideline = useCallback(
    (pos: Point): boolean => {
      if (!draggingGuidelineId) return false;
      // First move of a drag only anchors the delta; moving here would
      // snap the guide to the pointer.
      if (lastGuidelineDragIdRef.current !== draggingGuidelineId) {
        lastGuidelineDragIdRef.current = draggingGuidelineId;
        lastGuidelineDragPosRef.current = pos;
        return true;
      }
      const prevPos = lastGuidelineDragPosRef.current ?? pos;
      const dx = pos.x - prevPos.x;
      const dy = pos.y - prevPos.y;
      lastGuidelineDragPosRef.current = pos;
      setCustomGuidelines((prev) =>
        prev.map((g) => {
          if (g.id !== draggingGuidelineId) return g;
          if (g.type === 'diagonal') {
            // M5: diagonal guides are drawn from p1/p2/angle, not from
            // position, so updating position alone never moved them.
            // Translate p1/p2 by the pointer delta instead, keeping the
            // angle. The delta is clamped so p1 stays in the drawable
            // span; p2 follows with the same delta.
            const p1 = g.p1 ?? { x: 500, y: 500 };
            const p2 = g.p2 ?? { x: p1.x + 1, y: p1.y };
            const min = -300;
            const max = upm + 300;
            const cdx = Math.max(min - p1.x, Math.min(max - p1.x, dx));
            const cdy = Math.max(min - p1.y, Math.min(max - p1.y, dy));
            return {
              ...g,
              p1: { x: p1.x + cdx, y: p1.y + cdy },
              p2: { x: p2.x + cdx, y: p2.y + cdy },
            };
          }
          const min = -300;
          const max = upm + 300;
          return {
            ...g,
            position: g.type === 'v' ? Math.max(min, Math.min(max, pos.x)) : Math.max(min, Math.min(max, pos.y)),
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
