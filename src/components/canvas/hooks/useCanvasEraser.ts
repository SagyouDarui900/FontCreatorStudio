import React, { useState, useRef, useCallback, useMemo } from 'react';
import { PathContour, Point, ToolMode } from '../../../types';
import { eraseContoursAtPoint, subtractEraserStrokeFromContours } from '../../../utils/pathUtils';

interface UseCanvasEraserOptions {
  toolMode: ToolMode;
  contours: PathContour[];
  contoursRef: React.MutableRefObject<PathContour[]>;
  hoverCanvasPos: Point | null;
  onChangeContours: (contours: PathContour[], options?: { skipHistory?: boolean }) => void;
  onCommitHistory?: () => void;
  showCanvasToast: (message: string, subText?: string) => void;
  setSelectedContourIds: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectedContourId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedNodeId: React.Dispatch<React.SetStateAction<string | null>>;
}

export function useCanvasEraser({
  toolMode,
  contours,
  contoursRef,
  hoverCanvasPos,
  onChangeContours,
  onCommitHistory,
  showCanvasToast,
  setSelectedContourIds,
  setSelectedContourId,
  setSelectedNodeId,
}: UseCanvasEraserOptions) {
  const [eraserSize, setEraserSize] = useState<number>(36);
  const [eraserMode, setEraserMode] = useState<'stroke' | 'cut' | 'node' | 'all'>('stroke');

  const isErasingRef = useRef<boolean>(false);
  const erasedAnyInSessionRef = useRef<boolean>(false);
  const lastErasePosRef = useRef<Point | null>(null);
  const eraserStrokePointsRef = useRef<Point[]>([]);
  const activeEraserPathRef = useRef<SVGPathElement | null>(null);
  const activeEraserSvgDRef = useRef<string>('');

  const targetedEraserNodeCount = useMemo(() => {
    if (toolMode !== 'eraser' || eraserMode !== 'node' || !hoverCanvasPos) return 0;
    const radius = Math.max(2, eraserSize / 2);
    let count = 0;
    for (const c of contours) {
      for (const n of c.nodes) {
        if (Math.hypot(n.x - hoverCanvasPos.x, n.y - hoverCanvasPos.y) <= radius) {
          count++;
        }
      }
    }
    return count;
  }, [toolMode, eraserMode, hoverCanvasPos, eraserSize, contours]);

  const resetEraserVisuals = useCallback(() => {
    isErasingRef.current = false;
    lastErasePosRef.current = null;
    activeEraserSvgDRef.current = '';
    if (activeEraserPathRef.current) {
      activeEraserPathRef.current.setAttribute('d', '');
    }
    eraserStrokePointsRef.current = [];
    erasedAnyInSessionRef.current = false;
  }, []);

  const handleEraserPointerDown = useCallback(
    (pos: Point, e: React.PointerEvent<SVGSVGElement>) => {
      if (eraserMode === 'all') {
        setEraserMode('stroke');
        return false;
      }
      try {
        (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
      } catch {}

      isErasingRef.current = true;
      erasedAnyInSessionRef.current = false;
      lastErasePosRef.current = pos;
      eraserStrokePointsRef.current = [pos];
      const eraseRadius = Math.max(2, eraserSize / 2);

      if (eraserMode === 'cut') {
        const d = `M ${pos.x} ${pos.y} L ${pos.x + 0.1} ${pos.y}`;
        activeEraserSvgDRef.current = d;
        if (activeEraserPathRef.current) {
          activeEraserPathRef.current.setAttribute('d', d);
        }
      } else {
        const currentContours = contoursRef.current || [];
        const updatedContours = eraseContoursAtPoint(currentContours, pos, eraseRadius, eraserMode);
        if (updatedContours !== currentContours) {
          onCommitHistory?.();
          erasedAnyInSessionRef.current = true;
          contoursRef.current = updatedContours;
          onChangeContours(updatedContours, { skipHistory: true });
          setSelectedContourIds((prev) => prev.filter((id) => updatedContours.some((c) => c.id === id)));
          setSelectedContourId((prev) => (prev && updatedContours.some((c) => c.id === prev) ? prev : null));
          setSelectedNodeId((prev) => {
            if (!prev) return null;
            return updatedContours.some((c) => c.nodes.some((n) => n.id === prev)) ? prev : null;
          });
        }
      }
      return true;
    },
    [
      contoursRef,
      eraserMode,
      eraserSize,
      onChangeContours,
      onCommitHistory,
      setSelectedContourId,
      setSelectedContourIds,
      setSelectedNodeId,
    ]
  );

  const handleEraserPointerMove = useCallback(
    (pos: Point) => {
      if (!isErasingRef.current) return false;
      if (eraserMode === 'all') return true;

      const eraseRadius = Math.max(2, eraserSize / 2);
      const prevPos = lastErasePosRef.current || pos;
      lastErasePosRef.current = pos;
      eraserStrokePointsRef.current.push(pos);

      if (eraserMode === 'cut') {
        if (activeEraserPathRef.current && eraserStrokePointsRef.current.length > 0) {
          const pts = eraserStrokePointsRef.current;
          let d = `M ${pts[0].x} ${pts[0].y}`;
          for (let i = 1; i < pts.length; i++) {
            d += ` L ${pts[i].x} ${pts[i].y}`;
          }
          activeEraserSvgDRef.current = d;
          activeEraserPathRef.current.setAttribute('d', d);
        }
      } else {
        const currentContours = contoursRef.current || [];
        const updatedContours = eraseContoursAtPoint(currentContours, pos, eraseRadius, eraserMode, prevPos);
        if (updatedContours !== currentContours) {
          if (!erasedAnyInSessionRef.current) {
            onCommitHistory?.();
            erasedAnyInSessionRef.current = true;
          }
          contoursRef.current = updatedContours;
          onChangeContours(updatedContours, { skipHistory: true });
          setSelectedContourIds((prev) => prev.filter((id) => updatedContours.some((c) => c.id === id)));
          setSelectedContourId((prev) => (prev && updatedContours.some((c) => c.id === prev) ? prev : null));
          setSelectedNodeId((prev) => {
            if (!prev) return null;
            return updatedContours.some((c) => c.nodes.some((n) => n.id === prev)) ? prev : null;
          });
        }
      }
      return true;
    },
    [
      contoursRef,
      eraserMode,
      eraserSize,
      onChangeContours,
      onCommitHistory,
      setSelectedContourId,
      setSelectedContourIds,
      setSelectedNodeId,
    ]
  );

  const handleEraserPointerUp = useCallback(
    (e?: React.PointerEvent<SVGSVGElement>) => {
      if (!isErasingRef.current) return false;

      try {
        if (e) {
          (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
        }
      } catch {}

      isErasingRef.current = false;
      lastErasePosRef.current = null;
      activeEraserSvgDRef.current = '';
      if (activeEraserPathRef.current) {
        activeEraserPathRef.current.setAttribute('d', '');
      }

      if (eraserMode === 'cut' && eraserStrokePointsRef.current.length > 0) {
        const eraseRadius = Math.max(2, eraserSize / 2);
        const rawPts = eraserStrokePointsRef.current;
        eraserStrokePointsRef.current = [];
        const pts =
          rawPts.length === 1
            ? [rawPts[0], { x: rawPts[0].x + 0.1, y: rawPts[0].y + 0.1 }]
            : rawPts;
        const currentContours = contoursRef.current || [];
        const updated = subtractEraserStrokeFromContours(currentContours, pts, eraseRadius);
        if (updated !== currentContours) {
          onCommitHistory?.();
          contoursRef.current = updated;
          onChangeContours(updated);
          showCanvasToast('パスを削り・分割しました');
        }
      } else if (erasedAnyInSessionRef.current) {
        erasedAnyInSessionRef.current = false;
        setSelectedContourIds((prev) =>
          prev.filter((id) => (contoursRef.current || []).some((c) => c.id === id))
        );
        setSelectedContourId((prev) =>
          prev && (contoursRef.current || []).some((c) => c.id === prev) ? prev : null
        );
        setSelectedNodeId((prev) => {
          if (!prev) return null;
          return (contoursRef.current || []).some((c) => c.nodes.some((n) => n.id === prev)) ? prev : null;
        });
      }
      eraserStrokePointsRef.current = [];
      return true;
    },
    [
      contoursRef,
      eraserMode,
      eraserSize,
      onChangeContours,
      onCommitHistory,
      setSelectedContourId,
      setSelectedContourIds,
      setSelectedNodeId,
      showCanvasToast,
    ]
  );

  return {
    eraserSize,
    setEraserSize,
    eraserMode,
    setEraserMode,
    isErasingRef,
    lastErasePosRef,
    eraserStrokePointsRef,
    activeEraserPathRef,
    activeEraserSvgDRef,
    targetedEraserNodeCount,
    resetEraserVisuals,
    handleEraserPointerDown,
    handleEraserPointerMove,
    handleEraserPointerUp,
  };
}
