import React, { useState, useRef, useCallback, useMemo } from 'react';
import { PathContour, Point, BezierNode } from '../../../types';
import { contoursToSvgPath, unionContours, hasContourIntersections, expandStrokeContours } from '../../../utils/pathUtils';

interface UsePenToolOptions {
  contours: PathContour[];
  autoResolveBrushOverlap: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onChangeContours: (contours: PathContour[]) => void;
  onCommitHistory?: () => void;
  showCanvasToast: (message: string, subText?: string) => void;
  setSelectedContourId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedContourIds: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectedNodeId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedHandleType: React.Dispatch<React.SetStateAction<'handleIn' | 'handleOut' | 'node' | null>>;
}

export function usePenTool({
  contours,
  autoResolveBrushOverlap,
  containerRef,
  onChangeContours,
  onCommitHistory,
  showCanvasToast,
  setSelectedContourId,
  setSelectedContourIds,
  setSelectedNodeId,
  setSelectedHandleType,
}: UsePenToolOptions) {
  const [penStrokeWidth, setPenStrokeWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('glyph_pen_stroke_width');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 2 && parsed <= 300) return parsed;
      }
    } catch {}
    return 36;
  });

  const [penCapStyle, setPenCapStyle] = useState<'round' | 'butt' | 'square'>(() => {
    try {
      const saved = localStorage.getItem('glyph_pen_cap_style');
      if (saved === 'round' || saved === 'butt' || saved === 'square') return saved;
    } catch {}
    return 'round';
  });

  const [showPenStrokeMenu, setShowPenStrokeMenu] = useState<boolean>(false);

  const handleSetPenStrokeWidth = useCallback((width: number) => {
    const clamped = Math.max(2, Math.min(300, Math.round(width)));
    setPenStrokeWidth(clamped);
    try {
      localStorage.setItem('glyph_pen_stroke_width', String(clamped));
    } catch {}
  }, []);

  const handleSetPenCapStyle = useCallback((style: 'round' | 'butt' | 'square') => {
    setPenCapStyle(style);
    try {
      localStorage.setItem('glyph_pen_cap_style', style);
    } catch {}
  }, []);

  const [activePenContour, setActivePenContour] = useState<PathContour | null>(null);
  const [penMousePos, setPenMousePos] = useState<Point | null>(null);
  const [penHudPos, setPenHudPos] = useState<{ x: number; y: number } | null>(null);
  const isDraggingPenHudRef = useRef(false);
  const penHudDragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Undo the last placed node in the active pen path
  const handleUndoPenNode = useCallback(() => {
    if (!activePenContour) return;
    if (activePenContour.nodes.length <= 1) {
      setActivePenContour(null);
      setSelectedNodeId(null);
    } else {
      const remainingNodes = activePenContour.nodes.slice(0, -1);
      setActivePenContour({
        ...activePenContour,
        nodes: remainingNodes,
      });
      setSelectedNodeId(remainingNodes[remainingNodes.length - 1].id);
    }
  }, [activePenContour, setSelectedNodeId]);

  // Reset/Discard the entire in-progress pen path
  const handleResetPenContour = useCallback(() => {
    if (activePenContour) {
      const count = activePenContour.nodes.length;
      setActivePenContour(null);
      setSelectedNodeId(null);
      setSelectedHandleType(null);
      showCanvasToast('作図中のパスをリセット・破棄しました', `${count} 点を消去`);
    }
  }, [activePenContour, setSelectedHandleType, setSelectedNodeId, showCanvasToast]);

  // Finish and commit the in-progress pen path
  const handleFinishPenContour = useCallback(
    (closed: boolean = false, customStrokeWidth?: number) => {
      if (!activePenContour || activePenContour.nodes.length === 0) return;
      if (activePenContour.nodes.length === 1) {
        showCanvasToast('パスには2点以上の頂点が必要です', '作図を継続またはEscでキャンセル');
        return;
      }
      setShowPenStrokeMenu(false);

      const targetWidth = customStrokeWidth ?? penStrokeWidth;

      if (!closed) {
        try {
          const rawContour: PathContour = {
            ...activePenContour,
            closed: false,
          };
          const expanded = expandStrokeContours([rawContour], targetWidth, penCapStyle);
          if (expanded && expanded.length > 0) {
            let resultContours = expanded;
            if (autoResolveBrushOverlap && hasContourIntersections(expanded)) {
              try {
                const selfMerged = unionContours(expanded, 1.2, false);
                if (selfMerged && selfMerged.length > 0) {
                  resultContours = selfMerged;
                }
              } catch (e) {
                console.warn('Stroke self-merge fallback:', e);
              }
            }

            onChangeContours([...contours, ...resultContours]);
            setSelectedContourId(null);
            setSelectedContourIds([]);
            setActivePenContour(null);
            setSelectedNodeId(null);
            onCommitHistory?.();
            showCanvasToast(
              `太さ ${targetWidth}px の線として確定しました`,
              `${resultContours.length} 個の輪郭 (端点: ${penCapStyle === 'round' ? '丸' : penCapStyle === 'butt' ? '平' : '角'})`
            );
            return;
          }
        } catch (err) {
          console.warn('Pen stroke expansion fallback:', err);
        }
      }

      const finalized: PathContour = {
        ...activePenContour,
        closed,
      };

      if (closed && autoResolveBrushOverlap) {
        try {
          const selfMerged = unionContours([finalized], 1.2, true);
          if (selfMerged && selfMerged.length > 0) {
            onChangeContours([...contours, ...selfMerged]);
            setSelectedContourId(null);
            setSelectedContourIds([]);
            setActivePenContour(null);
            setSelectedNodeId(null);
            onCommitHistory?.();
            showCanvasToast(
              selfMerged.length > 1
                ? '交差を自動結合し、輪郭を確定しました'
                : '閉じた輪郭として確定しました',
              `${selfMerged.length} 個の輪郭`
            );
            return;
          }
        } catch (err) {
          console.warn('Pen self-merge fallback:', err);
        }
      }

      onChangeContours([...contours, finalized]);
      setSelectedContourId(null);
      setSelectedContourIds([]);
      setActivePenContour(null);
      setSelectedNodeId(null);
      onCommitHistory?.();
      showCanvasToast(
        closed ? '閉じた輪郭として確定しました' : `開いた線 (太さ: ${targetWidth}px) として確定しました`,
        `${finalized.nodes.length} 頂点`
      );
    },
    [
      activePenContour,
      autoResolveBrushOverlap,
      contours,
      onChangeContours,
      onCommitHistory,
      penCapStyle,
      penStrokeWidth,
      setSelectedContourId,
      setSelectedContourIds,
      setSelectedNodeId,
      showCanvasToast,
    ]
  );

  const handlePenHudPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      isDraggingPenHudRef.current = true;
      const target = e.currentTarget as HTMLElement;
      try {
        target.setPointerCapture?.(e.pointerId);
      } catch {}

      const containerRect = containerRef.current?.getBoundingClientRect();
      const currentLeft =
        penHudPos?.x ?? (containerRect ? Math.max(16, (containerRect.width - 340) / 2) : 60);
      const currentTop = penHudPos?.y ?? 56;

      penHudDragOffsetRef.current = {
        x: e.clientX - currentLeft,
        y: e.clientY - currentTop,
      };
    },
    [containerRef, penHudPos]
  );

  const handlePenHudPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDraggingPenHudRef.current) return;
      e.stopPropagation();
      e.preventDefault();
      if (!containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      let newX = e.clientX - penHudDragOffsetRef.current.x;
      let newY = e.clientY - penHudDragOffsetRef.current.y;

      newX = Math.max(8, Math.min(containerRect.width - 260, newX));
      newY = Math.max(8, Math.min(containerRect.height - 44, newY));

      setPenHudPos({ x: newX, y: newY });
    },
    [containerRef]
  );

  const handlePenHudPointerUp = useCallback((e: React.PointerEvent) => {
    if (isDraggingPenHudRef.current) {
      isDraggingPenHudRef.current = false;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
      } catch {}
    }
  }, []);

  const penSvgPath = useMemo(
    () => (activePenContour ? contoursToSvgPath([activePenContour]) : ''),
    [activePenContour]
  );

  return {
    penStrokeWidth,
    setPenStrokeWidth,
    handleSetPenStrokeWidth,
    penCapStyle,
    setPenCapStyle,
    handleSetPenCapStyle,
    showPenStrokeMenu,
    setShowPenStrokeMenu,
    activePenContour,
    setActivePenContour,
    penMousePos,
    setPenMousePos,
    penHudPos,
    setPenHudPos,
    handleUndoPenNode,
    handleResetPenContour,
    handleFinishPenContour,
    handlePenHudPointerDown,
    handlePenHudPointerMove,
    handlePenHudPointerUp,
    penSvgPath,
  };
}
