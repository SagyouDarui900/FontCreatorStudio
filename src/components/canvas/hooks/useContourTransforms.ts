import React, { useCallback } from 'react';
import { PathContour } from '../../../types';

export type BezierHandleType = 'node' | 'handleIn' | 'handleOut';

import {
  slantSingleContour,
  rotateSingleContour,
  rotateMultipleContours,
  scaleSingleContour,
  scaleMultipleContours,
  flipSingleContourH,
  flipMultipleContoursH,
  flipSingleContourV,
  flipMultipleContoursV,
  duplicateContour,
  duplicateMultipleContours,
  unionContours,
  booleanSubtractContours,
  booleanIntersectContours,
  reverseContour,
  smoothStrokeContour,
  smoothContoursPreservingShape,
  straightenWobblyContour,
  simplifyContour,
  convertContourToCorners,
  convertContourToSmooth,
  expandStrokeContours,
} from '../../../utils/pathUtils';

export interface UseContourTransformsOptions {
  contours: PathContour[];
  selectedContourIds: string[];
  setSelectedContourIds: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectedContourId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedNodeId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedHandleType: React.Dispatch<React.SetStateAction<BezierHandleType | null>>;
  onChangeContours: (contours: PathContour[]) => void;
  onCommitHistory?: () => void;
  showCanvasToast: (title: string, desc?: string) => void;
  smoothStrength: 'light' | 'standard' | 'strong' | 'mild';
  smoothPreserveCorners: boolean;
  penStrokeWidth: number;
  penCapStyle: 'round' | 'butt' | 'square';
  activeBrushPathRef: React.RefObject<SVGPathElement | null>;
  activeBrushSvgDRef: React.MutableRefObject<string>;
  activeEraserPathRef: React.RefObject<SVGPathElement | null>;
  activeEraserSvgDRef: React.MutableRefObject<string>;
  brushStrokePointsRef: React.MutableRefObject<any[]>;
}

export function useContourTransforms({
  contours,
  selectedContourIds,
  setSelectedContourIds,
  setSelectedContourId,
  setSelectedNodeId,
  setSelectedHandleType,
  onChangeContours,
  onCommitHistory,
  showCanvasToast,
  smoothStrength,
  smoothPreserveCorners,
  penStrokeWidth,
  penCapStyle,
  activeBrushPathRef,
  activeBrushSvgDRef,
  activeEraserPathRef,
  activeEraserSvgDRef,
  brushStrokePointsRef,
}: UseContourTransformsOptions) {
  // Transform operations for active selection (single or batch)
  const handleSlantSelected = useCallback(
    (angleDeg: number) => {
      if (selectedContourIds.length === 0) return;
      const updated = contours.map((c) =>
        selectedContourIds.includes(c.id) ? slantSingleContour(c, angleDeg) : c
      );
      onChangeContours(updated);
      onCommitHistory?.();
    },
    [contours, selectedContourIds, onChangeContours, onCommitHistory]
  );

  const handleRotateSelected = useCallback(
    (angleDeg: number) => {
      if (selectedContourIds.length === 0) return;
      if (selectedContourIds.length === 1) {
        const updated = contours.map((c) =>
          selectedContourIds.includes(c.id) ? rotateSingleContour(c, angleDeg) : c
        );
        onChangeContours(updated);
      } else {
        const selected = contours.filter((c) => selectedContourIds.includes(c.id));
        const rotated = rotateMultipleContours(selected, angleDeg);
        const rotatedMap = new Map(rotated.map((c) => [c.id, c]));
        onChangeContours(contours.map((c) => rotatedMap.get(c.id) || c));
      }
      onCommitHistory?.();
    },
    [contours, selectedContourIds, onChangeContours, onCommitHistory]
  );

  const handleScaleSelected = useCallback(
    (factor: number) => {
      if (selectedContourIds.length === 0) return;
      if (selectedContourIds.length === 1) {
        const updated = contours.map((c) =>
          selectedContourIds.includes(c.id) ? scaleSingleContour(c, factor, factor) : c
        );
        onChangeContours(updated);
      } else {
        const selected = contours.filter((c) => selectedContourIds.includes(c.id));
        const scaled = scaleMultipleContours(selected, factor, factor);
        const scaledMap = new Map(scaled.map((c) => [c.id, c]));
        onChangeContours(contours.map((c) => scaledMap.get(c.id) || c));
      }
      onCommitHistory?.();
    },
    [contours, selectedContourIds, onChangeContours, onCommitHistory]
  );

  const handleFlipHSelected = useCallback(() => {
    if (selectedContourIds.length === 0) return;
    if (selectedContourIds.length === 1) {
      const updated = contours.map((c) =>
        selectedContourIds.includes(c.id) ? flipSingleContourH(c) : c
      );
      onChangeContours(updated);
    } else {
      const selected = contours.filter((c) => selectedContourIds.includes(c.id));
      const flipped = flipMultipleContoursH(selected);
      const flippedMap = new Map(flipped.map((c) => [c.id, c]));
      onChangeContours(contours.map((c) => flippedMap.get(c.id) || c));
    }
    onCommitHistory?.();
  }, [contours, selectedContourIds, onChangeContours, onCommitHistory]);

  const handleFlipVSelected = useCallback(() => {
    if (selectedContourIds.length === 0) return;
    if (selectedContourIds.length === 1) {
      const updated = contours.map((c) =>
        selectedContourIds.includes(c.id) ? flipSingleContourV(c) : c
      );
      onChangeContours(updated);
    } else {
      const selected = contours.filter((c) => selectedContourIds.includes(c.id));
      const flipped = flipMultipleContoursV(selected);
      const flippedMap = new Map(flipped.map((c) => [c.id, c]));
      onChangeContours(contours.map((c) => flippedMap.get(c.id) || c));
    }
    onCommitHistory?.();
  }, [contours, selectedContourIds, onChangeContours, onCommitHistory]);

  const handleDuplicateSelected = useCallback(() => {
    if (selectedContourIds.length === 0) return;
    if (selectedContourIds.length === 1) {
      const target = contours.find((c) => c.id === selectedContourIds[0]);
      if (!target) return;
      const dup = duplicateContour(target, 40, 40);
      onChangeContours([...contours, dup]);
      setSelectedContourIds([dup.id]);
    } else {
      const selected = contours.filter((c) => selectedContourIds.includes(c.id));
      const dups = duplicateMultipleContours(selected, 40, 40);
      onChangeContours([...contours, ...dups]);
      setSelectedContourIds(dups.map((d) => d.id));
    }
    onCommitHistory?.();
  }, [contours, selectedContourIds, onChangeContours, setSelectedContourIds, onCommitHistory]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedContourIds.length === 0) return;
    const remaining = contours.filter((c) => !selectedContourIds.includes(c.id));
    if (remaining.length === 0) {
      if (activeBrushPathRef.current) {
        activeBrushPathRef.current.setAttribute('d', '');
      }
      activeBrushSvgDRef.current = '';
      if (activeEraserPathRef.current) {
        activeEraserPathRef.current.setAttribute('d', '');
      }
      activeEraserSvgDRef.current = '';
      brushStrokePointsRef.current = [];
    }
    onChangeContours(remaining);
    setSelectedContourIds([]);
    setSelectedNodeId(null);
    setSelectedHandleType(null);
    onCommitHistory?.();
  }, [
    contours,
    selectedContourIds,
    onChangeContours,
    setSelectedContourIds,
    setSelectedNodeId,
    setSelectedHandleType,
    onCommitHistory,
    activeBrushPathRef,
    activeBrushSvgDRef,
    activeEraserPathRef,
    activeEraserSvgDRef,
    brushStrokePointsRef,
  ]);

  // Merge / Union selected contours into a single path or resolve single-stroke cursive overlaps
  const handleMergeSelectedContours = useCallback(() => {
    const isExplicit = selectedContourIds.length > 0;
    const targets = isExplicit
      ? contours.filter((c) => selectedContourIds.includes(c.id))
      : contours;

    if (targets.length === 0) {
      showCanvasToast('対象となる輪郭がありません');
      return;
    }

    const merged = unionContours(targets, 1.2, true);
    if (merged.length === 0) {
      showCanvasToast('重なり白抜き解消に失敗しました');
      return;
    }

    const otherContours = isExplicit
      ? contours.filter((c) => !selectedContourIds.includes(c.id))
      : [];
    const newContours = [...otherContours, ...merged];
    onChangeContours(newContours);
    setSelectedContourIds(merged.map((m) => m.id));
    onCommitHistory?.();

    if (targets.length === 1) {
      showCanvasToast(
        '一筆書きの交差・重なり白抜きを解消しました',
        '交差ループが融解され、滑らかな単一輪郭になりました'
      );
    } else {
      showCanvasToast(
        `${targets.length}個のパスを結合し、白抜きを解消しました`,
        `重なりが結合され、${merged.length}個の輪郭になりました`
      );
    }
  }, [
    contours,
    selectedContourIds,
    onChangeContours,
    setSelectedContourIds,
    onCommitHistory,
    showCanvasToast,
  ]);

  // Boolean Difference (型抜き): Subtract cutter paths from base path
  const handleSubtractSelectedContours = useCallback(() => {
    if (selectedContourIds.length < 2) {
      showCanvasToast('型抜きには2つ以上のパスを選択してください');
      return;
    }
    const selected = contours.filter((c) => selectedContourIds.includes(c.id));
    const base = [selected[0]];
    const cutters = selected.slice(1);
    const result = booleanSubtractContours(base, cutters);
    if (result.length === 0) {
      showCanvasToast('型抜き結果が空になりました');
      return;
    }
    const other = contours.filter((c) => !selectedContourIds.includes(c.id));
    const updated = [...other, ...result];
    onChangeContours(updated);
    setSelectedContourIds(result.map((r) => r.id));
    onCommitHistory?.();
    showCanvasToast('パスを型抜き（前面で背面を切り抜き）しました');
  }, [
    contours,
    selectedContourIds,
    onChangeContours,
    setSelectedContourIds,
    onCommitHistory,
    showCanvasToast,
  ]);

  // Boolean Intersection (交差): Keep only overlapping region
  const handleIntersectSelectedContours = useCallback(() => {
    if (selectedContourIds.length < 2) {
      showCanvasToast('交差には2つ以上のパスを選択してください');
      return;
    }
    const selected = contours.filter((c) => selectedContourIds.includes(c.id));
    const base = [selected[0]];
    const cutters = selected.slice(1);
    const result = booleanIntersectContours(base, cutters);
    if (result.length === 0) {
      showCanvasToast('交差部分がありませんでした');
      return;
    }
    const other = contours.filter((c) => !selectedContourIds.includes(c.id));
    const updated = [...other, ...result];
    onChangeContours(updated);
    setSelectedContourIds(result.map((r) => r.id));
    onCommitHistory?.();
    showCanvasToast('パスの交差重なり部分を抽出しました');
  }, [
    contours,
    selectedContourIds,
    onChangeContours,
    setSelectedContourIds,
    onCommitHistory,
    showCanvasToast,
  ]);

  // Reverse / Flip Winding Order (時計回り ⇄ 反時計回り) to fix transparent overlaps or create holes
  const handleReverseWindingSelected = useCallback(() => {
    if (selectedContourIds.length === 0) return;
    const updated = contours.map((c) => {
      if (!selectedContourIds.includes(c.id)) return c;
      return reverseContour(c);
    });
    onChangeContours(updated);
    onCommitHistory?.();
    showCanvasToast(
      '輪郭の向き（回転方向）を反転しました',
      '重なりが白抜き/黒塗りに反転します'
    );
  }, [contours, selectedContourIds, onChangeContours, onCommitHistory, showCanvasToast]);

  const defaultLevel: 'mild' | 'standard' | 'strong' =
    smoothStrength === 'light' ? 'mild' : smoothStrength;

  const handleSmoothStrokeAll = useCallback(
    (
      level: 'mild' | 'standard' | 'strong' = defaultLevel,
      preserveCorners: boolean = smoothPreserveCorners
    ) => {
      if (contours.length === 0) return;
      const result = smoothContoursPreservingShape(contours, { level, preserveCorners });
      onChangeContours(result.contours);
      onCommitHistory?.();

      const levelName = level === 'mild' ? 'マイルド' : level === 'strong' ? '強力' : '標準';
      showCanvasToast(
        `全ストロークを一括平滑化 (${levelName})`,
        `全パーツ合計: ${result.totalOriginalPoints}点 → ${result.totalReducedPoints}点 (-${result.totalReductionPercent}% 削減)`
      );
    },
    [contours, onChangeContours, onCommitHistory, showCanvasToast, defaultLevel, smoothPreserveCorners]
  );

  // Shape-Preserving Stroke Smoothing & Anchor Point Reduction
  const handleSmoothStrokeSelected = useCallback(
    (
      level: 'mild' | 'standard' | 'strong' = defaultLevel,
      preserveCorners: boolean = smoothPreserveCorners
    ) => {
      if (selectedContourIds.length === 0) {
        handleSmoothStrokeAll(level, preserveCorners);
        return;
      }
      const updated = contours.map((c) => {
        if (!selectedContourIds.includes(c.id)) return c;
        return smoothStrokeContour(c, { level, preserveCorners }).contour;
      });
      onChangeContours(updated);
      onCommitHistory?.();

      const levelName = level === 'mild' ? 'マイルド' : level === 'strong' ? '強力' : '標準';
      showCanvasToast(
        `選択パスを平滑化 (${levelName})`,
        `${selectedContourIds.length}個のパスのアンカーポイント最適化完了`
      );
    },
    [
      contours,
      selectedContourIds,
      handleSmoothStrokeAll,
      onChangeContours,
      onCommitHistory,
      showCanvasToast,
      defaultLevel,
      smoothPreserveCorners,
    ]
  );

  const handleStraightenWobblyAll = useCallback(() => {
    if (contours.length === 0) return;
    const updated = contours.map((c) => straightenWobblyContour(c));
    onChangeContours(updated);
    onCommitHistory?.();
    showCanvasToast('全ストロークの歪み・うねりを直線化補正しました', `${contours.length}個のパーツ`);
  }, [contours, onChangeContours, onCommitHistory, showCanvasToast]);

  // 1-Click Straighten & De-wobble wobbly strokes
  const handleStraightenWobblySelected = useCallback(() => {
    if (selectedContourIds.length === 0) {
      handleStraightenWobblyAll();
      return;
    }
    const updated = contours.map((c) => {
      if (!selectedContourIds.includes(c.id)) return c;
      return straightenWobblyContour(c);
    });
    onChangeContours(updated);
    onCommitHistory?.();
    showCanvasToast('選択パスの歪み・うねりを直線化補正しました', `${selectedContourIds.length}個のパーツ`);
  }, [contours, selectedContourIds, handleStraightenWobblyAll, onChangeContours, onCommitHistory, showCanvasToast]);

  // Path Simplification & Curvature Conversions
  const handleSimplifyAll = useCallback(
    (tolerance: number = 6) => {
      if (contours.length === 0) return;
      const simplified = contours.map((c) => simplifyContour(c, tolerance));
      onChangeContours(simplified);
      onCommitHistory?.();
    },
    [contours, onChangeContours, onCommitHistory]
  );

  const handleSimplifySelected = useCallback(
    (tolerance: number = 6) => {
      if (selectedContourIds.length === 0) return;
      const updated = contours.map((c) =>
        selectedContourIds.includes(c.id) ? simplifyContour(c, tolerance) : c
      );
      onChangeContours(updated);
      onCommitHistory?.();
    },
    [contours, selectedContourIds, onChangeContours, onCommitHistory]
  );

  const handleConvertToCornersSelected = useCallback(() => {
    if (selectedContourIds.length === 0) return;
    const updated = contours.map((c) =>
      selectedContourIds.includes(c.id) ? convertContourToCorners(c) : c
    );
    onChangeContours(updated);
    onCommitHistory?.();
  }, [contours, selectedContourIds, onChangeContours, onCommitHistory]);

  const handleConvertToSmoothSelected = useCallback(() => {
    if (selectedContourIds.length === 0) return;
    const updated = contours.map((c) =>
      selectedContourIds.includes(c.id) ? convertContourToSmooth(c) : c
    );
    onChangeContours(updated);
    onCommitHistory?.();
  }, [contours, selectedContourIds, onChangeContours, onCommitHistory]);

  const handleToggleClosedSelected = useCallback(() => {
    if (selectedContourIds.length === 0) return;
    const updated = contours.map((c) =>
      selectedContourIds.includes(c.id) ? { ...c, closed: !c.closed } : c
    );
    onChangeContours(updated);
    onCommitHistory?.();
  }, [contours, selectedContourIds, onChangeContours, onCommitHistory]);

  const handleExpandStrokeSelected = useCallback(() => {
    if (selectedContourIds.length === 0) return;
    const targetContours = contours.filter((c) => selectedContourIds.includes(c.id));
    const nonTargetContours = contours.filter((c) => !selectedContourIds.includes(c.id));
    const expanded = expandStrokeContours(targetContours, penStrokeWidth, penCapStyle);
    if (expanded && expanded.length > 0) {
      onChangeContours([...nonTargetContours, ...expanded]);
      setSelectedContourIds(expanded.map((e) => e.id));
      setSelectedContourId(expanded[0].id);
      onCommitHistory?.();
      showCanvasToast(
        `選択パスを太さ ${penStrokeWidth}px の線輪郭に変換しました`,
        `${expanded.length} 個の輪郭 (端点: ${penCapStyle === 'round' ? '丸' : penCapStyle === 'butt' ? '平' : '角'})`
      );
    }
  }, [
    contours,
    selectedContourIds,
    penStrokeWidth,
    penCapStyle,
    onChangeContours,
    setSelectedContourIds,
    setSelectedContourId,
    onCommitHistory,
    showCanvasToast,
  ]);

  return {
    handleSlantSelected,
    handleRotateSelected,
    handleScaleSelected,
    handleFlipHSelected,
    handleFlipVSelected,
    handleDuplicateSelected,
    handleDeleteSelected,
    handleMergeSelectedContours,
    handleSubtractSelectedContours,
    handleIntersectSelectedContours,
    handleReverseWindingSelected,
    handleSmoothStrokeAll,
    handleSmoothStrokeSelected,
    handleStraightenWobblyAll,
    handleStraightenWobblySelected,
    handleSimplifyAll,
    handleSimplifySelected,
    handleConvertToCornersSelected,
    handleConvertToSmoothSelected,
    handleToggleClosedSelected,
    handleExpandStrokeSelected,
  };
}
