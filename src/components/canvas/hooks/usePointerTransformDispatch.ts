import React, { useCallback } from 'react';
import { Point } from '../../../types';

export interface UsePointerTransformDispatchOptions {
  handleTransformPointerMove: (pos: Point, e: React.PointerEvent<SVGSVGElement>) => boolean;
  handleTransformPointerUp: () => boolean;
}

export function usePointerTransformDispatch({
  handleTransformPointerMove,
  handleTransformPointerUp,
}: UsePointerTransformDispatchOptions) {
  // Delegate move event to active transform bounding box session
  const dispatchTransformMove = useCallback(
    (pos: Point, e: React.PointerEvent<SVGSVGElement>): boolean => {
      return handleTransformPointerMove(pos, e);
    },
    [handleTransformPointerMove]
  );

  // Delegate up event to finalize transform bounding box session
  const dispatchTransformUp = useCallback((): boolean => {
    return handleTransformPointerUp();
  }, [handleTransformPointerUp]);

  return {
    dispatchTransformMove,
    dispatchTransformUp,
  };
}
