import { useCallback } from 'react';
import { PathContour, RulerMeasurement, CustomPart, ToolMode } from '../../../types';
import { createLineContour, generateId } from '../../../utils/path';
import { convertContourToQuadratic, convertContourToCubic } from '../../../utils/bezierConversion';
import { loadCustomParts, saveCustomParts } from '../../../utils/customPartsStorage';
import { makeUniquePartName } from '../../../utils/customParts';

export interface UseCanvasContourActionsOptions {
  contours: PathContour[];
  contoursRef: React.MutableRefObject<PathContour[]>;
  onChangeContours: (contours: PathContour[], options?: { skipHistory?: boolean }) => void;
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
  setSelectedNodeIds?: (ids: string[]) => void;
  setSelectedHandleType: (handle: any) => void;
  setTouchLoupeState: (state: any) => void;
  setEraserMode: (mode: any) => void;
  selectedContourIds?: string[];
  activeChar?: string;
  handleNudgeSelectedNode?: (dx: number, dy: number) => boolean;
  onSetToolMode?: (mode: ToolMode) => void;
  isGlyphLocked?: boolean;
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
    setSelectedNodeIds,
    setSelectedHandleType,
    setTouchLoupeState,
    setEraserMode,
    selectedContourIds = [],
    activeChar = '',
    handleNudgeSelectedNode,
    onSetToolMode,
    isGlyphLocked = false,
  } = options;

  // Draw straight stroke directly from ruler measurement line
  const handleDrawRulerAsStroke = useCallback(() => {
    if (isGlyphLocked) {
      showCanvasToast('編集ロック中です', 'ヘッダーの鍵アイコンで解除できます');
      return;
    }
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
    onCommitHistory?.();
    contoursRef.current = updated;
    onChangeContours(updated, { skipHistory: true });
    setRulerMeasurement(null);
    showCanvasToast('定規のラインから直線ストロークを作成しました', `長さ: ${Math.round(dist)}px / 太さ: ${brushWidth}px`);
  }, [
    isGlyphLocked,
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
    if (isGlyphLocked) {
      showCanvasToast('編集ロック中です', 'ヘッダーの鍵アイコンで解除できます');
      return;
    }
    if (!contours || contours.length === 0) {
      showCanvasToast('キャンバスは既に空です');
      return;
    }
    // Destructive action: confirm before clearing, like the grid-size
    // change in the pixel font editor. Undo still restores the contours.
    const label = activeChar ? `「${activeChar}」の` : '文字の';
    if (
      !window.confirm(
        `${label}全パーツを消去しますか？消去した内容は Ctrl+Z で取り消せます。`
      )
    ) {
      return;
    }
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

    onCommitHistory?.();
    contoursRef.current = [];
    onChangeContours([], { skipHistory: true });
    showCanvasToast('文字の全パーツ（輪郭）を消去しました', 'Ctrl+Z で取り消し可能');
  }, [
    isGlyphLocked,
    contours,
    contoursRef,
    onChangeContours,
    onCommitHistory,
    activeChar,
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

  const handleNudgeSelection = useCallback(
    (dx: number, dy: number) => {
      if (isGlyphLocked) {
        showCanvasToast('この文字は編集ロックされています', '解除してから移動してください');
        return;
      }
      const handled = handleNudgeSelectedNode?.(dx, dy);
      if (!handled && selectedContourIds.length > 0) {
        const updated = contours.map((c) => {
          if (!selectedContourIds.includes(c.id)) return c;
          return {
            ...c,
            nodes: c.nodes.map((n) => ({
              ...n,
              x: Math.round((n.x + dx) * 10) / 10,
              y: Math.round((n.y + dy) * 10) / 10,
              handleIn: n.handleIn
                ? {
                    x: Math.round((n.handleIn.x + dx) * 10) / 10,
                    y: Math.round((n.handleIn.y + dy) * 10) / 10,
                  }
                : undefined,
              handleOut: n.handleOut
                ? {
                    x: Math.round((n.handleOut.x + dx) * 10) / 10,
                    y: Math.round((n.handleOut.y + dy) * 10) / 10,
                  }
                : undefined,
            })),
          };
        });
        onCommitHistory?.();
        onChangeContours(updated, { skipHistory: true });
      }
    },
    [isGlyphLocked, showCanvasToast, handleNudgeSelectedNode, contours, selectedContourIds, onChangeContours, onCommitHistory]
  );

  const handleConvertToQuadraticSelected = useCallback(() => {
    if (isGlyphLocked) {
      showCanvasToast('この文字は編集ロックされています', '解除してから変換してください');
      return;
    }
    if (selectedContourIds.length === 0) return;
    onCommitHistory?.();
    const updated = contours.map((c) => {
      if (selectedContourIds.includes(c.id)) {
        return convertContourToQuadratic(c, 1.0);
      }
      return c;
    });
    onChangeContours(updated, { skipHistory: true });
    showCanvasToast('2次ベジェ化 (TTEdit互換) 完了', '選択輪郭をTrueType規格の2次ベジェ曲線に変換しました');
  }, [isGlyphLocked, selectedContourIds, onCommitHistory, contours, onChangeContours, showCanvasToast]);

  const handleConvertToCubicSelected = useCallback(() => {
    if (isGlyphLocked) {
      showCanvasToast('この文字は編集ロックされています', '解除してから変換してください');
      return;
    }
    if (selectedContourIds.length === 0) return;
    onCommitHistory?.();
    const updated = contours.map((c) => {
      if (selectedContourIds.includes(c.id)) {
        return convertContourToCubic(c, 1.5);
      }
      return c;
    });
    onChangeContours(updated, { skipHistory: true });
    showCanvasToast('3次ベジェ化 (OTEdit互換) 完了', '選択輪郭をOpenType規格の3次ベジェ曲線に統合しました');
  }, [isGlyphLocked, selectedContourIds, onCommitHistory, contours, onChangeContours, showCanvasToast]);

  const handleRegisterSelectedAsCustomPart = useCallback(async () => {
    if (isGlyphLocked) {
      showCanvasToast('この文字は編集ロックされています', '解除してから登録してください');
      return;
    }
    const selected = contours.filter((c) => selectedContourIds.includes(c.id));
    if (selected.length === 0) return;
    let existing: CustomPart[] = [];
    try {
      existing = (await loadCustomParts()) || [];
    } catch {
      // 読み込みに失敗した場合は空の一覧として登録を試みる
    }
    const partName = makeUniquePartName(
      `${activeChar || '字形'}パーツ`,
      existing.map((p) => p.name)
    );
    const newPart: CustomPart = {
      id: generateId(),
      name: partName,
      category: 'other',
      description: `文字「${activeChar || ''}」から保存されたパーツ`,
      contours: selected.map((c) => ({
        ...c,
        id: generateId(),
        nodes: c.nodes.map((n) => ({
          ...n,
          id: generateId(),
          handleIn: n.handleIn ? { ...n.handleIn } : null,
          handleOut: n.handleOut ? { ...n.handleOut } : null,
        })),
      })),
      createdAt: Date.now(),
    };
    try {
      const saved = await saveCustomParts([newPart, ...existing]);
      if (!saved.ok) {
        showCanvasToast('登録に失敗しました', 'ストレージエラー');
        return;
      }
      window.dispatchEvent(new CustomEvent('font_custom_parts_updated'));
      showCanvasToast('マイ部首パーツに登録しました', `「${partName}」を部首パレットに追加しました`);
    } catch {
      showCanvasToast('登録に失敗しました', 'ストレージエラー');
    }
  }, [contours, selectedContourIds, activeChar, isGlyphLocked, showCanvasToast]);

  const handleSelectAllNodes = useCallback(() => {
    if (contours.length === 0) return;
    const allNodeIds: string[] = [];
    contours.forEach((c) => {
      c.nodes.forEach((n) => allNodeIds.push(n.id));
    });
    setSelectedContourIds(contours.map((c) => c.id));
    setSelectedNodeIds?.(allNodeIds);
    onSetToolMode?.('node');
    showCanvasToast('ノード全選択', `${allNodeIds.length}個のノードを選択しました`);
  }, [contours, setSelectedContourIds, setSelectedNodeIds, onSetToolMode, showCanvasToast]);

  return {
    handleDrawRulerAsStroke,
    handleClearAllContours,
    handleNudgeSelection,
    handleConvertToQuadraticSelected,
    handleConvertToCubicSelected,
    handleRegisterSelectedAsCustomPart,
    handleSelectAllNodes,
  };
}
