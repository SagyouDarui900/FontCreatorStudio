import { useCallback } from 'react';
import { PathContour, RulerMeasurement } from '../../../types';
import { createLineContour } from '../../../utils/pathUtils';

export interface UseCanvasContourActionsOptions {
  contours: PathContour[];
  contoursRef: React.MutableRefObject<PathContour[]>;
  onChangeContours: (contours: PathContour[]) => void;
  onCommitHistory?: () => void;
  brushWidth: number;
  rulerMeasurement: RulerMeasurement | null;
  setRulerMeasurement: (ruler: RulerMeasurement | null) => void;
  showCanvasToast: (msg: string, sub?: string) => void;
  resetBrushDrawing: () => void;
  resetEraserVisuals: () => void;
  setActivePenContour: (c: any) => void;
  setShapeStartPoint: (pt: any) => void;
  setShapeCurrentPoint: (pt: any) => void;
  setTransformSession: (session: any) => void;
  setMarqueeSelection: (sel: any) => void;
  setSelectedContourIds: (ids: string[]) => void;
  setSelectedContourId: (id: string | null) => void;
  setSelectedNodeId: (id: string | null) => void;
  setSelectedHandleType: (handle: any) => void;
  setTouchLoupeState: (state: any) => void;
  setEraserMode: (mode: any) => void;
}

export function useCanvasContourActions(options: UseCanvasContourActionsOptions) {
  const {
    contours,
    contoursRef,
    onChangeContours,
    onCommitHistory,
    brushWidth,
    rulerMeasurement,
    setRulerMeasurement,
    showCanvasToast,
    resetBrushDrawing,
    resetEraserVisuals,
    setActivePenContour,
    setShapeStartPoint,
    setShapeCurrentPoint,
    setTransformSession,
    setMarqueeSelection,
    setSelectedContourIds,
    setSelectedContourId,
    setSelectedNodeId,
    setSelectedHandleType,
    setTouchLoupeState,
    setEraserMode,
  } = options;

  // Draw straight stroke directly from ruler measurement line
  const handleDrawRulerAsStroke = useCallback(() => {
    if (!rulerMeasurement) return;
    const { start, end } = rulerMeasurement;
    const dist = Math.hypot(end.x - start.x, end.y - start.y);
    if (dist < 4) return;

    const strokeContour = createLineContour(
      start.x,
      start.y,
      end.x,
      end.y,
      brushWidth || 32
    );
    const updated = [...contours, strokeContour];
    contoursRef.current = updated;
    onChangeContours(updated);
    onCommitHistory?.();
    setRulerMeasurement(null);
    showCanvasToast('定規のラインから直線ストロークを作成しました', `長さ: ${Math.round(dist)}px / 太さ: ${brushWidth}px`);
  }, [
    rulerMeasurement,
    brushWidth,
    contours,
    contoursRef,
    onChangeContours,
    onCommitHistory,
    showCanvasToast,
    setRulerMeasurement,
  ]);

  // Clear / Reset all contours of current character
  const handleClearAllContours = useCallback(() => {
    resetBrushDrawing();
    resetEraserVisuals();
    setActivePenContour(null);
    setShapeStartPoint(null);
    setShapeCurrentPoint(null);
    setRulerMeasurement(null);
    setTransformSession(null);
    setMarqueeSelection(null);
    setSelectedContourIds([]);
    setSelectedContourId(null);
    setSelectedNodeId(null);
    setSelectedHandleType(null);
    setTouchLoupeState({ visible: false, screenX: 0, screenY: 0, canvasPos: null });
    setEraserMode('stroke');

    if (!contours || contours.length === 0) {
      showCanvasToast('キャンバスは既に空です');
      return;
    }
    onCommitHistory?.();
    contoursRef.current = [];
    onChangeContours([]);
    showCanvasToast('文字の全パーツ（輪郭）を消去しました', 'Ctrl+Z で取り消し可能');
  }, [
    contours,
    contoursRef,
    onChangeContours,
    onCommitHistory,
    resetBrushDrawing,
    resetEraserVisuals,
    setActivePenContour,
    setEraserMode,
    setRulerMeasurement,
    setSelectedContourId,
    setSelectedContourIds,
    setSelectedHandleType,
    setSelectedNodeId,
    setShapeCurrentPoint,
    setShapeStartPoint,
    setTouchLoupeState,
    setTransformSession,
    setMarqueeSelection,
    showCanvasToast,
  ]);

  return {
    handleDrawRulerAsStroke,
    handleClearAllContours,
  };
}
