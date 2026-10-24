import React from 'react';
import { PathContour, Point, ToolMode } from '../../types';
import { contoursToSvgPath, insertNodeOnContourAtPoint } from '../../utils/pathUtils';

export interface InteractiveContourHitLayerProps {
  contours: PathContour[];
  selectedContourIds: string[];
  contourSvgMap: Map<string, string>;
  selectionColor: string;
  zoom: number;
  toolMode: ToolMode;
  screenToCanvas: (clientX: number, clientY: number) => Point;
  onChangeContours: (contours: PathContour[]) => void;
  setSelectedContourId: (id: string | null) => void;
  setSelectedContourIds: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectedNodeId: (id: string | null) => void;
  setSelectedHandleType: (type: 'node' | 'handleIn' | 'handleOut' | null) => void;
  nodeDragSessionRef: React.MutableRefObject<any>;
  onCommitHistory?: () => void;
  showCanvasToast: (msg: string, sub?: string) => void;
  handleTransformPointerDown: (e: React.PointerEvent, action: 'move', contourIds: string[]) => void;
  onSetToolMode?: (mode: ToolMode) => void;
}

export const InteractiveContourHitLayer: React.FC<InteractiveContourHitLayerProps> = React.memo(({
  contours,
  selectedContourIds,
  contourSvgMap,
  selectionColor,
  zoom,
  toolMode,
  screenToCanvas,
  onChangeContours,
  setSelectedContourId,
  setSelectedContourIds,
  setSelectedNodeId,
  setSelectedHandleType,
  nodeDragSessionRef,
  onCommitHistory,
  showCanvasToast,
  handleTransformPointerDown,
  onSetToolMode,
}) => {
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
                e.stopPropagation();
                const clickPos = screenToCanvas(e.clientX, e.clientY);
                const insertResult = insertNodeOnContourAtPoint(contour, clickPos, 16 / zoom);
                if (insertResult) {
                  const newContours = contours.map((c) => (c.id === contour.id ? insertResult.updatedContour : c));
                  onChangeContours(newContours);
                  setSelectedContourId(contour.id);
                  setSelectedContourIds([contour.id]);
                  setSelectedNodeId(insertResult.newNodeId);
                  setSelectedHandleType('node');
                  const insertedNode = insertResult.updatedContour.nodes.find((n) => n.id === insertResult.newNodeId);
                  if (insertedNode) {
                    nodeDragSessionRef.current = {
                      contourId: contour.id,
                      nodeId: insertResult.newNodeId,
                      handleType: 'node',
                      startPos: clickPos,
                      initialNode: { ...insertedNode },
                      initialContour: { ...insertResult.updatedContour },
                    };
                    try {
                      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
                    } catch {
                      // Ignored
                    }
                  }
                  onCommitHistory?.();
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
                  handleTransformPointerDown(e, 'move', nextIds);
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
