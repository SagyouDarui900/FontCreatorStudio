import { useCallback } from 'react';
import { Point } from '../../../types';

export interface UsePointerGuidelineDragOptions {
  draggingGuidelineId: string | null;
  setDraggingGuidelineId: (id: string | null) => void;
  updateDraggingGuideline: (pos: Point) => boolean;
}

export function usePointerGuidelineDrag({
  setDraggingGuidelineId,
  updateDraggingGuideline,
}: UsePointerGuidelineDragOptions) {
  // Update guideline drag position on pointer move
  const handleGuidelinePointerMove = useCallback(
    (pos: Point): boolean => {
      return updateDraggingGuideline(pos);
    },
    [updateDraggingGuideline]
  );

  // Terminate guideline drag on pointer up
  const handleGuidelinePointerUp = useCallback(() => {
    setDraggingGuidelineId(null);
  }, [setDraggingGuidelineId]);

  return {
    handleGuidelinePointerMove,
    handleGuidelinePointerUp,
  };
}
