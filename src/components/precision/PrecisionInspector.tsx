import React, { useState, useMemo } from 'react';
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  Maximize2,
  Minimize2,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Layers,
  Sparkles,
  Move,
  CornerUpRight,
  Sliders,
  Scissors,
  Check,
  Split,
  Box,
  Hash,
} from 'lucide-react';
import { PathContour, BezierNode, ThemeClasses } from '../../types';
import { getContoursBoundingBox, getContourBoundingBox } from '../../utils/path';
import {
  alignContours,
  distributeContours,
  setContourExactDimensions,
  AlignDirection,
  DistributeDirection,
} from '../../utils/geometry/alignment';
import { expandContoursOffset } from '../../utils/geometry/offset';

export interface PrecisionInspectorProps {
  contours: PathContour[];
  selectedContourIds: string[];
  selectedNodeId: string | null;
  selectedHandleType: 'node' | 'handleIn' | 'handleOut' | null;
  onChangeContours: (contours: PathContour[]) => void;
  onCommitHistory: () => void;
  unitsPerEm?: number;
  advanceWidth?: number;
  showToast?: (title: string, desc?: string) => void;
  isLight: boolean;
  themeClasses: ThemeClasses;
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
}) => {
  const [keepAspect, setKeepAspect] = useState<boolean>(true);
  const [offsetStrokeWidth, setOffsetStrokeWidth] = useState<number>(40);
  const [offsetCapStyle, setOffsetCapStyle] = useState<'round' | 'butt' | 'square'>('round');
  const [customRotateAngle, setCustomRotateAngle] = useState<number>(45);

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

  // Update a single node property
  const handleUpdateNodeProp = (key: 'x' | 'y' | 'type', value: any) => {
    if (!activeParentContour || !activeNode) return;
    const updated = contours.map((c) => {
      if (c.id !== activeParentContour.id) return c;
      return {
        ...c,
        nodes: c.nodes.map((n) => {
          if (n.id !== activeNode.id) return n;
          if (key === 'x' || key === 'y') {
            const numVal = Math.round(Number(value) || 0);
            const delta = numVal - n[key];
            return {
              ...n,
              [key]: numVal,
              handleIn: n.handleIn ? { ...n.handleIn, [key]: Math.round(n.handleIn[key] + delta) } : undefined,
              handleOut: n.handleOut ? { ...n.handleOut, [key]: Math.round(n.handleOut[key] + delta) } : undefined,
            };
          }
          return { ...n, [key]: value };
        }),
      };
    });
    onChangeContours(updated);
    onCommitHistory();
  };

  // Align actions
  const handleAlign = (direction: AlignDirection) => {
    if (selectedContourIds.length === 0) {
      showToast?.('整列するパスを選択してください');
      return;
    }
    const updated = alignContours(contours, selectedContourIds, direction, {
      width: advanceWidth,
      height: unitsPerEm,
    });
    onChangeContours(updated);
    onCommitHistory();
    showToast?.('パスを整列しました');
  };

  // Distribute actions
  const handleDistribute = (direction: DistributeDirection) => {
    if (selectedContourIds.length < 3) {
      showToast?.('等間隔分布には3つ以上のパスが必要です');
      return;
    }
    const updated = distributeContours(contours, selectedContourIds, direction);
    onChangeContours(updated);
    onCommitHistory();
    showToast?.('パスを等間隔に分布しました');
  };

  // Exact Dimension Update (W / H)
  const handleSetExactDimension = (targetW: number, targetH: number) => {
    if (selectedContours.length !== 1) return;
    const targetContour = selectedContours[0];
    const scaled = setContourExactDimensions(targetContour, targetW, targetH, keepAspect);
    const updated = contours.map((c) => (c.id === targetContour.id ? scaled : c));
    onChangeContours(updated);
    onCommitHistory();
    showToast?.(`サイズを W:${targetW} H:${targetH} に変更しました`);
  };

  // Path Offset / Stroke-to-outline expansion
  const handleExpandOffset = () => {
    if (selectedContourIds.length === 0) {
      showToast?.('展開するパスを選択してください');
      return;
    }
    const { updatedContours } = expandContoursOffset(contours, selectedContourIds, {
      strokeWidth: offsetStrokeWidth,
      capStyle: offsetCapStyle,
    });
    onChangeContours(updatedContours);
    onCommitHistory();
    showToast?.(`線幅 ${offsetStrokeWidth}px でアウトライン化しました`);
  };

  // Snap selected node coordinates to integer / whole number
  const handleRoundNodeCoords = () => {
    if (!activeParentContour || !activeNode) return;
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
            handleIn: n.handleIn ? { x: Math.round(n.handleIn.x), y: Math.round(n.handleIn.y) } : undefined,
            handleOut: n.handleOut ? { x: Math.round(n.handleOut.x), y: Math.round(n.handleOut.y) } : undefined,
          };
        }),
      };
    });
    onChangeContours(updated);
    onCommitHistory();
    showToast?.('座標を整数に丸めました');
  };

  return (
    <div className="space-y-4 text-xs select-none">
      {/* 1. NODE INSPECTOR SECTION */}
      {activeNode && (
        <div className={`p-3 rounded-lg border ${isLight ? 'bg-white border-stone-200 shadow-xs' : 'bg-stone-900/60 border-stone-800'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <Move className="w-3.5 h-3.5" />
              <span>選択ノード座標</span>
            </span>
            <button
              type="button"
              onClick={handleRoundNodeCoords}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono border cursor-pointer ${
                isLight ? 'bg-stone-100 hover:bg-stone-200 border-stone-300' : 'bg-stone-800 hover:bg-stone-700 border-stone-700'
              }`}
              title="座標を整数値にスナップ"
            >
              整数丸め
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="text-[10px] text-stone-500 block mb-0.5 font-mono">X 座標</label>
              <input
                type="number"
                value={Math.round(activeNode.x)}
                onChange={(e) => handleUpdateNodeProp('x', e.target.value)}
                className={`w-full px-2 py-1 border rounded font-mono text-xs ${
                  isLight ? 'bg-stone-50 border-stone-300 text-stone-900' : 'bg-stone-800 border-stone-700 text-stone-100'
                }`}
              />
            </div>
            <div>
              <label className="text-[10px] text-stone-500 block mb-0.5 font-mono">Y 座標</label>
              <input
                type="number"
                value={Math.round(activeNode.y)}
                onChange={(e) => handleUpdateNodeProp('y', e.target.value)}
                className={`w-full px-2 py-1 border rounded font-mono text-xs ${
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
      <div className={`p-3 rounded-lg border ${isLight ? 'bg-white border-stone-200 shadow-xs' : 'bg-stone-900/60 border-stone-800'}`}>
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
        <div className="grid grid-cols-6 gap-1 mb-2.5">
          <button
            type="button"
            onClick={() => handleAlign('left')}
            className={`p-1.5 rounded flex items-center justify-center border cursor-pointer transition-colors ${
              isLight ? 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-700' : 'bg-stone-800 hover:bg-stone-700 border-stone-700 text-stone-300'
            }`}
            title="左揃え"
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleAlign('centerH')}
            className={`p-1.5 rounded flex items-center justify-center border cursor-pointer transition-colors ${
              isLight ? 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-700' : 'bg-stone-800 hover:bg-stone-700 border-stone-700 text-stone-300'
            }`}
            title="水平方向中央揃え"
          >
            <AlignCenter className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleAlign('right')}
            className={`p-1.5 rounded flex items-center justify-center border cursor-pointer transition-colors ${
              isLight ? 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-700' : 'bg-stone-800 hover:bg-stone-700 border-stone-700 text-stone-300'
            }`}
            title="右揃え"
          >
            <AlignRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleAlign('top')}
            className={`p-1.5 rounded flex items-center justify-center border cursor-pointer transition-colors ${
              isLight ? 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-700' : 'bg-stone-800 hover:bg-stone-700 border-stone-700 text-stone-300'
            }`}
            title="上揃え"
          >
            <AlignStartVertical className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleAlign('centerV')}
            className={`p-1.5 rounded flex items-center justify-center border cursor-pointer transition-colors ${
              isLight ? 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-700' : 'bg-stone-800 hover:bg-stone-700 border-stone-700 text-stone-300'
            }`}
            title="垂直方向中央揃え"
          >
            <AlignCenterVertical className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleAlign('bottom')}
            className={`p-1.5 rounded flex items-center justify-center border cursor-pointer transition-colors ${
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
        <div className={`p-3 rounded-lg border ${isLight ? 'bg-white border-stone-200 shadow-xs' : 'bg-stone-900/60 border-stone-800'}`}>
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
            <div>
              <label className="text-[10px] text-stone-500 block mb-0.5 font-mono">幅 (W)</label>
              <input
                type="number"
                value={Math.round(selBBox.width)}
                onChange={(e) => {
                  const val = Math.max(1, Number(e.target.value) || 1);
                  const h = keepAspect && selBBox.width > 0 ? (val / selBBox.width) * selBBox.height : selBBox.height;
                  handleSetExactDimension(val, Math.round(h));
                }}
                className={`w-full px-2 py-1 border rounded font-mono text-xs ${
                  isLight ? 'bg-stone-50 border-stone-300 text-stone-900' : 'bg-stone-800 border-stone-700 text-stone-100'
                }`}
              />
            </div>
            <div>
              <label className="text-[10px] text-stone-500 block mb-0.5 font-mono">高さ (H)</label>
              <input
                type="number"
                value={Math.round(selBBox.height)}
                onChange={(e) => {
                  const val = Math.max(1, Number(e.target.value) || 1);
                  const w = keepAspect && selBBox.height > 0 ? (val / selBBox.height) * selBBox.width : selBBox.width;
                  handleSetExactDimension(Math.round(w), val);
                }}
                className={`w-full px-2 py-1 border rounded font-mono text-xs ${
                  isLight ? 'bg-stone-50 border-stone-300 text-stone-900' : 'bg-stone-800 border-stone-700 text-stone-100'
                }`}
              />
            </div>
          </div>
        </div>
      )}

      {/* 4. PATH OFFSET / STROKE EXPANSION */}
      <div className={`p-3 rounded-lg border ${isLight ? 'bg-white border-stone-200 shadow-xs' : 'bg-stone-900/60 border-stone-800'}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold flex items-center gap-1.5 text-stone-800 dark:text-stone-200">
            <Sliders className="w-3.5 h-3.5 text-amber-500" />
            <span>パスオフセット（線幅均一展開）</span>
          </span>
        </div>
        <p className="text-[10px] text-stone-500 mb-2 leading-relaxed">
          骨格のパスから指定した太さの均一な輪郭を自動生成します（ゴシック体・幾何学フォント制作に最適）。
        </p>

        <div className="flex items-center gap-2 mb-2">
          <label className="text-[10px] text-stone-500 font-mono shrink-0">太さ:</label>
          <input
            type="range"
            min={10}
            max={160}
            step={5}
            value={offsetStrokeWidth}
            onChange={(e) => setOffsetStrokeWidth(Number(e.target.value))}
            className="flex-1 accent-emerald-600"
          />
          <span className="font-mono text-xs font-bold w-12 text-right">{offsetStrokeWidth}px</span>
        </div>

        {/* Quick Presets */}
        <div className="flex gap-1 mb-2.5">
          {[20, 40, 60, 80, 100].map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setOffsetStrokeWidth(w)}
              className={`flex-1 py-1 rounded text-[10px] font-mono border cursor-pointer ${
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
