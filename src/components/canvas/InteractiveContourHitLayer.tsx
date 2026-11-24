import React from 'react';
import { PathContour, Point, ToolMode } from '../../types';
import { contoursToSvgPath, insertNodeOnContourAtPoint } from '../../utils/path';
import { useLiveViewportZoom } from './viewportStore';

export interface InteractiveContourHitLayerProps {
  contours: PathContour[];
  contoursRef?: React.MutableRefObject<PathContour[]>;
  selectedContourIds: string[];
  contourSvgMap: Map<string, string>;
  selectionColor: string;
  toolMode: ToolMode;
  screenToCanvas: (clientX: number, clientY: number) => Point;
  onChangeContours: (contours: PathContour[], options?: { skipHistory?: boolean }) => void;
  setSelectedContourId: (id: string | null) => void;
  setSelectedContourIds: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectedNodeId: (id: string | null) => void;
  setSelectedHandleType: (type: 'node' | 'handleIn' | 'handleOut' | null) => void;
  nodeDragSessionRef: React.MutableRefObject<any>;
  handleInsertNodeOnContour?: (e: React.PointerEvent, contour: PathContour) => boolean;
  onCommitHistory?: () => void;
  showCanvasToast: (msg: string, sub?: string) => void;
  handleTransformPointerDown: (e: React.PointerEvent, action: 'move', contourIds: string[]) => void;
  onSetToolMode?: (mode: ToolMode) => void;
  isGlyphLocked?: boolean;
}

export const InteractiveContourHitLayer: React.FC<InteractiveContourHitLayerProps> = React.memo(({
  contours,
  contoursRef,
  selectedContourIds,
  contourSvgMap,
  selectionColor,
  toolMode,
  screenToCanvas,
  onChangeContours,
  setSelectedContourId,
  setSelectedContourIds,
  setSelectedNodeId,
  setSelectedHandleType,
  nodeDragSessionRef,
  handleInsertNodeOnContour,
  onCommitHistory,
  showCanvasToast,
  handleTransformPointerDown,
  onSetToolMode,
  isGlyphLocked = false,
}) => {
  // Keep the hit stroke width a constant screen size during pinch/wheel
  // zoom, like the other layers. Reading zoom from the store also means a
  // zoom commit no longer re-renders this layer via a changed prop.
  const liveZoom = useLiveViewportZoom();
  const zoom = liveZoom && liveZoom > 0 ? liveZoom : 1;
  return (
    <>
      {contours.map((contour) => {
        const isSelected = selectedContourIds.includes(contour.id);
        const pathD = contourSvgMap.get(contour.id) || contoursToSvgPath([contour]);
        return (
          <path
            key={`contour-hit-${contour.id}`}
            d={pathD}
            fill="transparent"
            stroke={isSelected ? selectionColor : 'transparent'}
            strokeWidth={isSelected ? Math.max(2, 2.5 / zoom) : Math.max(14, 18 / zoom)}
            strokeDasharray={isSelected ? '6 4' : undefined}
            className={toolMode === 'select' || toolMode === 'node' ? 'cursor-pointer' : 'pointer-events-none'}
            pointerEvents={toolMode === 'select' ? 'stroke fill' : toolMode === 'node' ? 'stroke' : 'none'}
            onPointerDown={(e) => {
              if (toolMode === 'node') {
                if (handleInsertNodeOnContour) {
                  handleInsertNodeOnContour(e, contour);
                  return;
                }
                e.stopPropagation();
                if (isGlyphLocked) {
                  setSelectedContourId(contour.id);
                  setSelectedContourIds([contour.id]);
                  showCanvasToast('編集ロック中です', 'ヘッダーの鍵アイコンで解除できます');
                  return;
                }
                const clickPos = screenToCanvas(e.clientX, e.clientY);
                const liveContours = contoursRef?.current || contours;
                const liveContour = liveContours.find((c) => c.id === contour.id) || contour;
                const insertResult = insertNodeOnContourAtPoint(liveContour, clickPos, 16 / zoom);
                if (insertResult) {
                  const newContours = liveContours.map((c) => (c.id === contour.id ? insertResult.updatedContour : c));
                  onCommitHistory?.();
                  if (contoursRef) {
                    contoursRef.current = newContours;
                  }
                  onChangeContours(newContours, { skipHistory: true });
                  setSelectedContourId(contour.id);
                  setSelectedContourIds([contour.id]);
                  setSelectedNodeId(insertResult.newNodeId);
                  setSelectedHandleType('node');
                  const insertedNode = insertResult.updatedContour.nodes.find((n) => n.id === insertResult.newNodeId);
                  if (insertedNode) {
                    nodeDragSessionRef.current = {
                      contourId: contour.id,
                      nodeId: insertResult.newNodeId,
                      selectedNodeIds: [insertResult.newNodeId],
                      handleType: 'node',
                      startPos: clickPos,
                      initialNode: { ...insertedNode },
                      initialContour: { ...insertResult.updatedContour },
                      hasCommittedHistory: true,
                    };
                    try {
                      const el = e.currentTarget as Element;
                      (el.closest?.('svg') || el).setPointerCapture?.(e.pointerId);
                    } catch {
                      // Ignored
                    }
                  }
                  showCanvasToast('頂点を追加しました', 'ドラッグして位置を調整できます');
                  return;
                }
                setSelectedContourId(contour.id);
                setSelectedContourIds([contour.id]);
                return;
              }
              if (toolMode === 'select') {
                e.stopPropagation();
                if (e.shiftKey) {
                  setSelectedContourIds((prev) =>
                    prev.includes(contour.id)
                      ? prev.filter((id) => id !== contour.id)
                      : [...prev, contour.id]
                  );
                } else {
                  const nextIds =
                    selectedContourIds.includes(contour.id) && selectedContourIds.length > 1
                      ? selectedContourIds
                      : [contour.id];
                  setSelectedContourIds(nextIds);
                  setSelectedContourId(contour.id);
                  if (!isGlyphLocked) {
                    handleTransformPointerDown(e, 'move', nextIds);
                  }
                }
                setSelectedNodeId(null);
                setSelectedHandleType(null);
              }
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              if (onSetToolMode) {
                onSetToolMode('node');
              }
              setSelectedContourId(contour.id);
              setSelectedContourIds([contour.id]);
              setSelectedNodeId(null);
              setSelectedHandleType(null);
              showCanvasToast('ノード編集モードに切り替えました', 'アンカーポイントとハンドルを直接編集できます');
            }}
          />
        );
      })}
    </>
  );
});
