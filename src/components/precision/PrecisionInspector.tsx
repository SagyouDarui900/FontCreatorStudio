import React, { useState, useMemo, useEffect } from 'react';
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  Sparkles,
  Move,
  Sliders,
  Split,
  Box,
  Hash,
  Lock,
} from 'lucide-react';
import { PathContour, ThemeClasses } from '../../types';
import { getContoursBoundingBox } from '../../utils/path';
import {
  alignContours,
  distributeContours,
  setContoursExactDimensions,
  AlignDirection,
  DistributeDirection,
} from '../../utils/geometry/alignment';
import { expandContoursOffset } from '../../utils/geometry/offset';

export interface PrecisionInspectorProps {
  contours: PathContour[];
  selectedContourIds: string[];
  selectedNodeId: string | null;
  selectedHandleType: 'node' | 'handleIn' | 'handleOut' | null;
  onChangeContours: (contours: PathContour[], options?: { skipHistory?: boolean }) => void;
  onCommitHistory: () => void;
  unitsPerEm?: number;
  advanceWidth?: number;
  showToast?: (title: string, desc?: string) => void;
  isLight: boolean;
  themeClasses: ThemeClasses;
  isGlyphLocked?: boolean;
}

export const PrecisionInspector: React.FC<PrecisionInspectorProps> = ({
  contours,
  selectedContourIds,
  selectedNodeId,
  selectedHandleType,
  onChangeContours,
  onCommitHistory,
  unitsPerEm = 1000,
  advanceWidth = 1000,
  showToast,
  isLight,
  themeClasses,
  isGlyphLocked = false,
}) => {
  const [keepAspect, setKeepAspect] = useState<boolean>(true);
  const [offsetStrokeWidth, setOffsetStrokeWidth] = useState<number>(40);
  const [offsetCapStyle, setOffsetCapStyle] = useState<'round' | 'butt' | 'square'>('round');

  // Selected contours
  const selectedContours = useMemo(
    () => contours.filter((c) => selectedContourIds.includes(c.id)),
    [contours, selectedContourIds]
  );

  // Active selected node & parent contour
  const { activeNode, activeParentContour } = useMemo(() => {
    if (!selectedNodeId) return { activeNode: null, activeParentContour: null };
    for (const c of contours) {
      const node = c.nodes.find((n) => n.id === selectedNodeId);
      if (node) return { activeNode: node, activeParentContour: c };
    }
    return { activeNode: null, activeParentContour: null };
  }, [contours, selectedNodeId]);

  // Bounding box of selection
  const selBBox = useMemo(() => {
    if (selectedContours.length === 0) return null;
    return getContoursBoundingBox(selectedContours);
  }, [selectedContours]);

  // Draft input states to prevent premature clamping / 1px crush on live keystrokes
  const [nodeXDraft, setNodeXDraft] = useState<string>('');
  const [nodeYDraft, setNodeYDraft] = useState<string>('');
  const [widthDraft, setWidthDraft] = useState<string>('');
  const [heightDraft, setHeightDraft] = useState<string>('');

  const activeNodeRoundedX = activeNode ? Math.round(activeNode.x) : null;
  const activeNodeRoundedY = activeNode ? Math.round(activeNode.y) : null;

  useEffect(() => {
    setNodeXDraft(activeNodeRoundedX !== null ? String(activeNodeRoundedX) : '');
    setNodeYDraft(activeNodeRoundedY !== null ? String(activeNodeRoundedY) : '');
  }, [activeNode?.id, activeNodeRoundedX, activeNodeRoundedY]);

  const selWidthRounded = selBBox ? Math.round(selBBox.width) : null;
  const selHeightRounded = selBBox ? Math.round(selBBox.height) : null;
  const selectedContourIdsKey = selectedContourIds.join(',');

  useEffect(() => {
    setWidthDraft(selWidthRounded !== null ? String(selWidthRounded) : '');
    setHeightDraft(selHeightRounded !== null ? String(selHeightRounded) : '');
  }, [selWidthRounded, selHeightRounded, selectedContourIdsKey]);

  // Update a single node property
  const handleUpdateNodeProp = (key: 'x' | 'y' | 'type', value: any) => {
    if (isGlyphLocked) {
      showToast?.('編集ロック中です', 'ヘッダーの鍵アイコンで解除できます');
      return;
    }
    if (!activeParentContour || !activeNode) return;
    if (key === 'x' || key === 'y') {
      const numVal = Math.round(Number(value));
      if (!Number.isFinite(numVal) || numVal === Math.round(activeNode[key])) return;
    } else if (activeNode.type === value) {
      return;
    }

    onCommitHistory();
    const updated = contours.map((c) => {
      if (c.id !== activeParentContour.id) return c;
      return {
        ...c,
        nodes: c.nodes.map((n) => {
          if (n.id !== activeNode.id) return n;
          if (key === 'x' || key === 'y') {
            const numVal = Math.round(Number(value));
            const delta = numVal - n[key];
            return {
              ...n,
              [key]: numVal,
              handleIn: n.handleIn ? { ...n.handleIn, [key]: Math.round(n.handleIn[key] + delta) } : null,
              handleOut: n.handleOut ? { ...n.handleOut, [key]: Math.round(n.handleOut[key] + delta) } : null,
            };
          }
          if (key === 'type' && value === 'smooth' && n.handleIn && n.handleOut) {
            const dxIn = n.handleIn.x - n.x;
            const dyIn = n.handleIn.y - n.y;
            const dxOut = n.handleOut.x - n.x;
            const dyOut = n.handleOut.y - n.y;
            const lenIn = Math.hypot(dxIn, dyIn);
            const lenOut = Math.hypot(dxOut, dyOut);
            if (lenIn > 0.01 && lenOut > 0.01) {
              // Align along the chord between handleIn and handleOut so both become collinear
              const chordX = n.handleOut.x - n.handleIn.x;
              const chordY = n.handleOut.y - n.handleIn.y;
              const chordLen = Math.hypot(chordX, chordY);
              const angle =
                chordLen > 0.01 ? Math.atan2(chordY, chordX) : Math.atan2(dyOut, dxOut);
              return {
                ...n,
                type: 'smooth' as const,
                handleIn: {
                  x: Math.round(n.x - Math.cos(angle) * lenIn),
                  y: Math.round(n.y - Math.sin(angle) * lenIn),
                },
                handleOut: {
                  x: Math.round(n.x + Math.cos(angle) * lenOut),
                  y: Math.round(n.y + Math.sin(angle) * lenOut),
                },
              };
            }
          }
          return { ...n, [key]: value };
        }),
      };
    });
    onChangeContours(updated, { skipHistory: true });
  };

  const commitNodeCoordDraft = (axis: 'x' | 'y') => {
    if (!activeNode) return;
    const raw = (axis === 'x' ? nodeXDraft : nodeYDraft).trim();
    const currentRounded = Math.round(activeNode[axis]);
    if (!raw || raw === '-') {
      if (axis === 'x') setNodeXDraft(String(currentRounded));
      else setNodeYDraft(String(currentRounded));
      return;
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      if (axis === 'x') setNodeXDraft(String(currentRounded));
      else setNodeYDraft(String(currentRounded));
      return;
    }
    const rounded = Math.round(parsed);
    if (axis === 'x') setNodeXDraft(String(rounded));
    else setNodeYDraft(String(rounded));
    if (rounded !== currentRounded) {
      handleUpdateNodeProp(axis, rounded);
    }
  };

  // Align actions
  const handleAlign = (direction: AlignDirection) => {
    if (isGlyphLocked) {
      showToast?.('編集ロック中です', 'ヘッダーの鍵アイコンで解除できます');
      return;
    }
    if (selectedContourIds.length === 0) {
      showToast?.('整列するパスを選択してください');
      return;
    }
    onCommitHistory();
    const updated = alignContours(contours, selectedContourIds, direction, {
      width: direction === 'emBoxCenterH' ? unitsPerEm : advanceWidth,
      height: unitsPerEm,
    });
    onChangeContours(updated, { skipHistory: true });
    showToast?.('パスを整列しました');
  };

  // Distribute actions
  const handleDistribute = (direction: DistributeDirection) => {
    if (isGlyphLocked) {
      showToast?.('編集ロック中です', 'ヘッダーの鍵アイコンで解除できます');
      return;
    }
    if (selectedContourIds.length < 3) {
      showToast?.('等間隔分布には3つ以上のパスが必要です');
      return;
    }
    onCommitHistory();
    const updated = distributeContours(contours, selectedContourIds, direction);
    onChangeContours(updated, { skipHistory: true });
    showToast?.('パスを等間隔に分布しました');
  };

  // Exact Dimension Update (W / H)
  const handleSetExactDimension = (targetW: number, targetH: number) => {
    if (isGlyphLocked) {
      showToast?.('編集ロック中です', 'ヘッダーの鍵アイコンで解除できます');
      return;
    }
    if (selectedContours.length === 0) return;
    const clampedW = Math.max(1, Math.round(targetW));
    const clampedH = Math.max(1, Math.round(targetH));
    const updated = setContoursExactDimensions(
      contours,
      selectedContourIds,
      clampedW,
      clampedH,
      false
    );
    const changed = updated.some((c, idx) => c !== contours[idx]);
    if (!changed) {
      showToast?.('サイズを変更できませんでした（退化した点または無効な輪郭です）');
      return;
    }
    onCommitHistory();
    onChangeContours(updated, { skipHistory: true });
    showToast?.(`サイズを W:${clampedW} H:${clampedH} に変更しました`);
  };

  const commitDimensionDraft = (axis: 'w' | 'h') => {
    if (!selBBox) return;
    const currentW = Math.max(1, Math.round(selBBox.width));
    const currentH = Math.max(1, Math.round(selBBox.height));
    const raw = (axis === 'w' ? widthDraft : heightDraft).trim();

    if (!raw) {
      setWidthDraft(String(currentW));
      setHeightDraft(String(currentH));
      return;
    }

    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setWidthDraft(String(currentW));
      setHeightDraft(String(currentH));
      return;
    }

    const clampedVal = Math.max(1, Math.round(parsed));
    if (axis === 'w') {
      if (clampedVal === currentW) {
        setWidthDraft(String(currentW));
        return;
      }
      const nextH =
        keepAspect && selBBox.width > 0
          ? Math.max(1, Math.round((clampedVal / selBBox.width) * selBBox.height))
          : currentH;
      setWidthDraft(String(clampedVal));
      setHeightDraft(String(nextH));
      handleSetExactDimension(clampedVal, nextH);
    } else {
      if (clampedVal === currentH) {
        setHeightDraft(String(currentH));
        return;
      }
      const nextW =
        keepAspect && selBBox.height > 0
          ? Math.max(1, Math.round((clampedVal / selBBox.height) * selBBox.width))
          : currentW;
      setHeightDraft(String(clampedVal));
      setWidthDraft(String(nextW));
      handleSetExactDimension(nextW, clampedVal);
    }
  };

  // Path Offset / Stroke-to-outline expansion
  const handleExpandOffset = () => {
    if (isGlyphLocked) {
      showToast?.('編集ロック中です', 'ヘッダーの鍵アイコンで解除できます');
      return;
    }
    if (contours.length === 0 || selectedContourIds.length === 0) {
      showToast?.('展開するパスを選択してください');
      return;
    }
    const { updatedContours, newContourIds } = expandContoursOffset(contours, selectedContourIds, {
      strokeWidth: offsetStrokeWidth,
      capStyle: offsetCapStyle,
    });
    if (newContourIds.length === 0) {
      showToast?.('選択パスを展開できませんでした');
      return;
    }
    onCommitHistory();
    onChangeContours(updatedContours, { skipHistory: true });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('font_editor_select_contours', { detail: { ids: newContourIds } })
      );
    }
    showToast?.(`線幅 ${offsetStrokeWidth}px でアウトライン化しました`);
  };

  // Snap selected node coordinates to integer / whole number
  const handleRoundNodeCoords = () => {
    if (isGlyphLocked) {
      showToast?.('編集ロック中です', 'ヘッダーの鍵アイコンで解除できます');
      return;
    }
    if (!activeParentContour || !activeNode) return;
    onCommitHistory();
    const updated = contours.map((c) => {
      if (c.id !== activeParentContour.id) return c;
      return {
        ...c,
        nodes: c.nodes.map((n) => {
          if (n.id !== activeNode.id) return n;
          return {
            ...n,
            x: Math.round(n.x),
            y: Math.round(n.y),
            handleIn: n.handleIn ? { x: Math.round(n.handleIn.x), y: Math.round(n.handleIn.y) } : null,
            handleOut: n.handleOut ? { x: Math.round(n.handleOut.x), y: Math.round(n.handleOut.y) } : null,
          };
        }),
      };
    });
    onChangeContours(updated, { skipHistory: true });
    showToast?.('座標を整数に丸めました');
  };

  return (
    <div className="space-y-3 text-xs select-none">
      {isGlyphLocked && (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-300 text-[11px] font-semibold">
          <Lock className="w-3.5 h-3.5 shrink-0" />
          <span>編集ロック中（読み取り専用）</span>
        </div>
      )}
      {/* 1. NODE INSPECTOR SECTION */}
      {activeNode && (
        <div className={`p-3 rounded-lg border ${isGlyphLocked ? 'opacity-65 pointer-events-none' : ''} ${isLight ? 'bg-white border-stone-200 shadow-xs' : 'bg-stone-900/60 border-stone-800'}`}>
          <div className="flex items-center justify-between gap-1 mb-2">
            <span className="font-bold flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 min-w-0">
              <Move className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                {selectedHandleType === 'handleIn' || selectedHandleType === 'handleOut'
                  ? '親アンカー座標'
                  : '選択ノード座標'}
              </span>
              {(selectedHandleType === 'handleIn' || selectedHandleType === 'handleOut') && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30 shrink-0">
                  {selectedHandleType === 'handleIn' ? '入力ハンドル選択中' : '出力ハンドル選択中'}
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={handleRoundNodeCoords}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono border cursor-pointer shrink-0 ${
                isLight ? 'bg-stone-100 hover:bg-stone-200 border-stone-300' : 'bg-stone-800 hover:bg-stone-700 border-stone-700'
              }`}
              title="座標を整数値にスナップ"
            >
              整数丸め
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="min-w-0">
              <label className="text-[10px] text-stone-500 block mb-0.5 font-mono">X 座標</label>
              <input
                type="text"
                inputMode="numeric"
                aria-label="X 座標"
                value={nodeXDraft}
                onChange={(e) => setNodeXDraft(e.target.value)}
                onBlur={() => commitNodeCoordDraft('x')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  } else if (e.key === 'Escape') {
                    setNodeXDraft(String(Math.round(activeNode.x)));
                    e.currentTarget.blur();
                  }
                }}
                className={`w-full min-w-0 px-2 py-1 border rounded font-mono tabular-nums text-xs ${
                  isLight ? 'bg-stone-50 border-stone-300 text-stone-900' : 'bg-stone-800 border-stone-700 text-stone-100'
                }`}
              />
            </div>
            <div className="min-w-0">
              <label className="text-[10px] text-stone-500 block mb-0.5 font-mono">Y 座標</label>
              <input
                type="text"
                inputMode="numeric"
                aria-label="Y 座標"
                value={nodeYDraft}
                onChange={(e) => setNodeYDraft(e.target.value)}
                onBlur={() => commitNodeCoordDraft('y')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  } else if (e.key === 'Escape') {
                    setNodeYDraft(String(Math.round(activeNode.y)));
                    e.currentTarget.blur();
                  }
                }}
                className={`w-full min-w-0 px-2 py-1 border rounded font-mono tabular-nums text-xs ${
                  isLight ? 'bg-stone-50 border-stone-300 text-stone-900' : 'bg-stone-800 border-stone-700 text-stone-100'
                }`}
              />
            </div>
          </div>

          {/* Node Type: Corner vs Smooth */}
          <div className="flex items-center justify-between pt-1 border-t border-stone-200 dark:border-stone-800">
            <span className="text-[10px] text-stone-500">ハンドル連結</span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => handleUpdateNodeProp('type', 'corner')}
                className={`px-2 py-0.5 rounded text-[10px] font-medium border cursor-pointer ${
                  activeNode.type === 'corner'
                    ? 'bg-emerald-600 text-white border-transparent'
                    : isLight
                    ? 'bg-stone-100 text-stone-700 border-stone-300'
                    : 'bg-stone-800 text-stone-300 border-stone-700'
                }`}
              >
                角 (Corner)
              </button>
              <button
                type="button"
                onClick={() => handleUpdateNodeProp('type', 'smooth')}
                className={`px-2 py-0.5 rounded text-[10px] font-medium border cursor-pointer ${
                  activeNode.type === 'smooth'
                    ? 'bg-emerald-600 text-white border-transparent'
                    : isLight
                    ? 'bg-stone-100 text-stone-700 border-stone-300'
                    : 'bg-stone-800 text-stone-300 border-stone-700'
                }`}
              >
                滑らか (Smooth)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. ALIGNMENT & DISTRIBUTION SECTION */}
      <div className={`p-3 rounded-lg border ${isGlyphLocked ? 'opacity-65 pointer-events-none' : ''} ${isLight ? 'bg-white border-stone-200 shadow-xs' : 'bg-stone-900/60 border-stone-800'}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold flex items-center gap-1.5 text-stone-800 dark:text-stone-200">
            <AlignCenter className="w-3.5 h-3.5 text-emerald-500" />
            <span>整列 & 等間隔分布</span>
          </span>
          <span className="text-[10px] text-stone-400 font-mono">
            {selectedContourIds.length} 個選択
          </span>
        </div>

        {/* Alignment Grid */}
        <div className="grid grid-cols-3 gap-1.5 mb-2.5">
          <button
            type="button"
            onClick={() => handleAlign('left')}
            className={`min-h-[36px] py-2 px-1.5 rounded flex items-center justify-center border cursor-pointer transition-colors ${
              isLight ? 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-700' : 'bg-stone-800 hover:bg-stone-700 border-stone-700 text-stone-300'
            }`}
            title="左揃え"
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleAlign('centerH')}
            className={`min-h-[36px] py-2 px-1.5 rounded flex items-center justify-center border cursor-pointer transition-colors ${
              isLight ? 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-700' : 'bg-stone-800 hover:bg-stone-700 border-stone-700 text-stone-300'
            }`}
            title="水平方向中央揃え"
          >
            <AlignCenter className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleAlign('right')}
            className={`min-h-[36px] py-2 px-1.5 rounded flex items-center justify-center border cursor-pointer transition-colors ${
              isLight ? 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-700' : 'bg-stone-800 hover:bg-stone-700 border-stone-700 text-stone-300'
            }`}
            title="右揃え"
          >
            <AlignRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleAlign('top')}
            className={`min-h-[36px] py-2 px-1.5 rounded flex items-center justify-center border cursor-pointer transition-colors ${
              isLight ? 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-700' : 'bg-stone-800 hover:bg-stone-700 border-stone-700 text-stone-300'
            }`}
            title="上揃え"
          >
            <AlignStartVertical className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleAlign('centerV')}
            className={`min-h-[36px] py-2 px-1.5 rounded flex items-center justify-center border cursor-pointer transition-colors ${
              isLight ? 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-700' : 'bg-stone-800 hover:bg-stone-700 border-stone-700 text-stone-300'
            }`}
            title="垂直方向中央揃え"
          >
            <AlignCenterVertical className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleAlign('bottom')}
            className={`min-h-[36px] py-2 px-1.5 rounded flex items-center justify-center border cursor-pointer transition-colors ${
              isLight ? 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-700' : 'bg-stone-800 hover:bg-stone-700 border-stone-700 text-stone-300'
            }`}
            title="下揃え"
          >
            <AlignEndVertical className="w-4 h-4" />
          </button>
        </div>

        {/* Em-box Centering & Distribution Buttons */}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => handleAlign('emBoxCenterH')}
            className={`px-2 py-1.5 rounded border text-[11px] font-medium flex items-center justify-center gap-1 cursor-pointer ${
              isLight ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border-emerald-800'
            }`}
            title="フォント仮想ボディ（全角枠）の中央に揃える"
          >
            <Box className="w-3 h-3" />
            <span>全角枠中央揃え</span>
          </button>
          <button
            type="button"
            onClick={() => handleDistribute('horizontal')}
            className={`px-2 py-1.5 rounded border text-[11px] font-medium flex items-center justify-center gap-1 cursor-pointer ${
              isLight ? 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200' : 'bg-stone-800 hover:bg-stone-700 text-stone-300 border-stone-700'
            }`}
            title="水平方向に均等配分 (3個以上)"
          >
            <Split className="w-3 h-3 rotate-90" />
            <span>水平均等分布</span>
          </button>
        </div>
      </div>

      {/* 3. DIMENSIONS & NUMERIC RESIZE (When contour is selected) */}
      {selBBox && (
        <div className={`p-3 rounded-lg border ${isGlyphLocked ? 'opacity-65 pointer-events-none' : ''} ${isLight ? 'bg-white border-stone-200 shadow-xs' : 'bg-stone-900/60 border-stone-800'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold flex items-center gap-1.5 text-stone-800 dark:text-stone-200">
              <Hash className="w-3.5 h-3.5 text-indigo-500" />
              <span>幾何学サイズ指定</span>
            </span>
            <label className="flex items-center gap-1 text-[10px] text-stone-500 cursor-pointer">
              <input
                type="checkbox"
                checked={keepAspect}
                onChange={(e) => setKeepAspect(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-0"
              />
              <span>比率固定</span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="min-w-0">
              <label className="text-[10px] text-stone-500 block mb-0.5 font-mono">幅 (W)</label>
              <input
                type="text"
                inputMode="numeric"
                aria-label="幅 (W)"
                value={widthDraft}
                onChange={(e) => setWidthDraft(e.target.value)}
                onBlur={() => commitDimensionDraft('w')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  } else if (e.key === 'Escape') {
                    setWidthDraft(String(Math.max(1, Math.round(selBBox.width))));
                    e.currentTarget.blur();
                  }
                }}
                className={`w-full min-w-0 px-2 py-1 border rounded font-mono tabular-nums text-xs ${
                  isLight ? 'bg-stone-50 border-stone-300 text-stone-900' : 'bg-stone-800 border-stone-700 text-stone-100'
                }`}
              />
            </div>
            <div className="min-w-0">
              <label className="text-[10px] text-stone-500 block mb-0.5 font-mono">高さ (H)</label>
              <input
                type="text"
                inputMode="numeric"
                aria-label="高さ (H)"
                value={heightDraft}
                onChange={(e) => setHeightDraft(e.target.value)}
                onBlur={() => commitDimensionDraft('h')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  } else if (e.key === 'Escape') {
                    setHeightDraft(String(Math.max(1, Math.round(selBBox.height))));
                    e.currentTarget.blur();
                  }
                }}
                className={`w-full min-w-0 px-2 py-1 border rounded font-mono tabular-nums text-xs ${
                  isLight ? 'bg-stone-50 border-stone-300 text-stone-900' : 'bg-stone-800 border-stone-700 text-stone-100'
                }`}
              />
            </div>
          </div>
        </div>
      )}

      {/* 4. PATH OFFSET / STROKE EXPANSION */}
      <div className={`p-3 rounded-lg border ${isGlyphLocked ? 'opacity-65 pointer-events-none' : ''} ${isLight ? 'bg-white border-stone-200 shadow-xs' : 'bg-stone-900/60 border-stone-800'}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold flex items-center gap-1.5 text-stone-800 dark:text-stone-200">
            <Sliders className="w-3.5 h-3.5 text-amber-500" />
            <span>パスオフセット（線幅均一展開）</span>
          </span>
        </div>
        <p className="text-[10px] text-stone-500 mb-2 leading-relaxed">
          骨格のパスから指定した太さの均一な輪郭を自動生成します（ゴシック体・幾何学フォント制作に最適）。
        </p>

        <div className="flex items-center gap-2 mb-2 min-w-0">
          <label className="text-[10px] text-stone-500 font-mono shrink-0">太さ:</label>
          <input
            type="range"
            min={10}
            max={160}
            step={5}
            value={offsetStrokeWidth}
            onChange={(e) => setOffsetStrokeWidth(Number(e.target.value))}
            className="flex-1 min-w-0 accent-emerald-600 touch-pan-x"
          />
          <span className="font-mono tabular-nums text-xs font-bold w-12 text-right shrink-0">{offsetStrokeWidth}px</span>
        </div>

        {/* Quick Presets */}
        <div className="flex gap-1 mb-2 min-w-0">
          {[20, 40, 60, 80, 100].map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setOffsetStrokeWidth(w)}
              className={`flex-1 min-w-0 py-1.5 rounded text-[10px] font-mono tabular-nums border cursor-pointer ${
                offsetStrokeWidth === w
                  ? 'bg-emerald-600 text-white border-transparent'
                  : isLight
                  ? 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-700'
                  : 'bg-stone-800 hover:bg-stone-700 border-stone-700 text-stone-300'
              }`}
            >
              {w}
            </button>
          ))}
        </div>

        {/* Cap Style Selector */}
        <div className="flex items-center justify-between gap-2 mb-2.5 min-w-0">
          <span className="text-[10px] text-stone-500 shrink-0">端点の形状:</span>
          <div className="flex gap-1 flex-1 min-w-0">
            {([
              { id: 'round', label: '丸 (Round)' },
              { id: 'butt', label: '平 (Butt)' },
              { id: 'square', label: '角 (Square)' },
            ] as const).map((cap) => (
              <button
                key={cap.id}
                type="button"
                onClick={() => setOffsetCapStyle(cap.id)}
                className={`flex-1 min-w-0 py-1.5 px-1 rounded text-[10px] font-medium border cursor-pointer truncate ${
                  offsetCapStyle === cap.id
                    ? 'bg-emerald-600 text-white border-transparent'
                    : isLight
                    ? 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-700'
                    : 'bg-stone-800 hover:bg-stone-700 border-stone-700 text-stone-300'
                }`}
              >
                {cap.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handleExpandOffset}
          className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>選択パスを均一線幅でアウトライン化</span>
        </button>
      </div>
    </div>
  );
};
