import React from 'react';
import {
  Lock,
  X,
  Layers,
  Wand2,
  PenTool,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  RotateCw,
  Italic,
  Copy,
  Trash2,
} from 'lucide-react';
import { ToolMode } from '../../../types';

interface SelectionSubToolbarProps {
  toolMode: ToolMode;
  selectedContourIds: string[];
  setSelectedContourIds: (ids: string[]) => void;
  setSelectedContourId: (id: string | null) => void;
  setSelectedNodeId: (id: string | null) => void;
  setSelectedHandleType: (t: 'node' | 'handleIn' | 'handleOut' | null) => void;
  showCanvasToast: (msg: string, sub?: string) => void;
  handleMergeSelectedContours: () => void;
  handleSubtractSelectedContours: () => void;
  handleIntersectSelectedContours: () => void;
  handleSmoothStrokeSelected: (strength?: 'mild' | 'standard' | 'strong', keepShape?: boolean) => void;
  handleConvertToCornersSelected: () => void;
  handleConvertToSmoothSelected: () => void;
  handleExpandStrokeSelected: () => void;
  handleReverseWindingSelected: () => void;
  handleFlipHSelected: () => void;
  handleFlipVSelected: () => void;
  handleRotateSelected: (deg: number) => void;
  handleSlantSelected: (deg: number) => void;
  handleDuplicateSelected: () => void;
  handleDeleteSelected: () => void;
  penStrokeWidth: number;
  smoothStrength: 'mild' | 'standard' | 'strong';
  smoothPreserveCorners: boolean;
}

export const SelectionSubToolbar: React.FC<SelectionSubToolbarProps> = ({
  toolMode,
  selectedContourIds,
  setSelectedContourIds,
  setSelectedContourId,
  setSelectedNodeId,
  setSelectedHandleType,
  showCanvasToast,
  handleMergeSelectedContours,
  handleSubtractSelectedContours,
  handleIntersectSelectedContours,
  handleSmoothStrokeSelected,
  handleConvertToCornersSelected,
  handleConvertToSmoothSelected,
  handleExpandStrokeSelected,
  handleReverseWindingSelected,
  handleFlipHSelected,
  handleFlipVSelected,
  handleRotateSelected,
  handleSlantSelected,
  handleDuplicateSelected,
  handleDeleteSelected,
  penStrokeWidth,
  smoothStrength,
  smoothPreserveCorners,
}) => {
  if (!((toolMode === 'select' || toolMode === 'node') && selectedContourIds.length > 0)) {
    return null;
  }

  return (
    <div className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-stone-100 dark:bg-[#18231c] border border-stone-200 dark:border-stone-700">
      <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 pr-0.5">
        選択中{selectedContourIds.length > 1 ? ` (${selectedContourIds.length}個)` : ''}:
      </span>
      <span className="text-[9px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/70 px-1 py-0.5 rounded border border-amber-300 dark:border-amber-700 flex items-center gap-0.5">
        <Lock className="w-2.5 h-2.5" />
        <span>描画ロック中</span>
      </span>
      <button
        type="button"
        onClick={() => {
          setSelectedContourIds([]);
          setSelectedContourId(null);
          setSelectedNodeId(null);
          setSelectedHandleType(null);
          showCanvasToast('選択を解除しました（描画可能）');
        }}
        className="px-1.5 py-0.5 rounded bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 text-[10px] font-bold hover:bg-stone-300 dark:hover:bg-stone-600 flex items-center gap-0.5 mr-0.5 cursor-pointer"
        title="選択を解除してキャンバス描画を再開 (Esc)"
      >
        <X className="w-2.5 h-2.5" />
        <span>解除(Esc)</span>
      </button>

      {selectedContourIds.length >= 1 && (
        <button
          type="button"
          onClick={handleMergeSelectedContours}
          className="px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold flex items-center space-x-1 transition-all active:scale-95 mr-1 cursor-pointer"
          title={
            selectedContourIds.length === 1
              ? '一筆書きの自己交差・ループによる重なり白抜きを自動解消'
              : '選択した複数のパスを合体し、重なり白抜きを解消'
          }
        >
          <Layers className="w-2.5 h-2.5" />
          <span>{selectedContourIds.length === 1 ? '重なり白抜き解消' : '合体・白抜き解消'}</span>
        </button>
      )}

      {selectedContourIds.length >= 2 && (
        <>
          <button
            type="button"
            onClick={handleSubtractSelectedContours}
            className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold flex items-center space-x-1 transition-all active:scale-95 mr-1 cursor-pointer"
            title="前面のパスで背面のパスを型抜き（差分）"
          >
            <span>型抜き</span>
          </button>
          <button
            type="button"
            onClick={handleIntersectSelectedContours}
            className="px-2 py-0.5 rounded bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-bold flex items-center space-x-1 transition-all active:scale-95 mr-1 cursor-pointer"
            title="重なった部分のみを抽出（交差）"
          >
            <span>交差</span>
          </button>
        </>
      )}

      <button
        type="button"
        onClick={() => handleSmoothStrokeSelected(smoothStrength, smoothPreserveCorners)}
        className="px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-bold flex items-center space-x-0.5 hover:bg-emerald-500 cursor-pointer"
        title="スムーズ化"
      >
        <Wand2 className="w-2.5 h-2.5" />
        <span>スムーズ</span>
      </button>
      <button
        type="button"
        onClick={handleConvertToCornersSelected}
        className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-200 text-[10px] font-bold hover:bg-blue-100 cursor-pointer"
        title="角・直線に変換"
      >
        角化
      </button>
      <button
        type="button"
        onClick={handleConvertToSmoothSelected}
        className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 text-[10px] font-bold hover:bg-emerald-100 cursor-pointer"
        title="曲線に変換"
      >
        曲線化
      </button>
      <button
        type="button"
        onClick={handleExpandStrokeSelected}
        className="px-1.5 py-0.5 rounded bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-200 text-[10px] font-bold hover:bg-sky-100 flex items-center space-x-0.5 cursor-pointer"
        title={`選択した線を太さ ${penStrokeWidth}px の輪郭に変換`}
      >
        <PenTool className="w-2.5 h-2.5" />
        <span>線輪郭化({penStrokeWidth}px)</span>
      </button>
      <button
        type="button"
        onClick={handleReverseWindingSelected}
        className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 text-[10px] font-bold hover:bg-amber-100 flex items-center space-x-0.5 cursor-pointer"
        title="向き反転（時計回り/反時計回り）：重なりの白抜きと黒塗りを切り替え"
      >
        <RotateCcw className="w-2.5 h-2.5" />
        <span>向き反転</span>
      </button>
      <button
        type="button"
        onClick={handleFlipHSelected}
        className="p-1 rounded hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 cursor-pointer"
        title="左右反転"
      >
        <FlipHorizontal className="w-3 h-3" />
      </button>
      <button
        type="button"
        onClick={handleFlipVSelected}
        className="p-1 rounded hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 cursor-pointer"
        title="上下反転"
      >
        <FlipVertical className="w-3 h-3" />
      </button>
      <button
        type="button"
        onClick={() => handleRotateSelected(90)}
        className="p-1 rounded hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 cursor-pointer"
        title="90度回転"
      >
        <RotateCw className="w-3 h-3" />
      </button>
      <button
        type="button"
        onClick={() => handleSlantSelected(10)}
        className="p-1 rounded hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 cursor-pointer"
        title="斜体 (+10°)"
      >
        <Italic className="w-3 h-3" />
      </button>
      <button
        type="button"
        onClick={handleDuplicateSelected}
        className="p-1 rounded hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 cursor-pointer"
        title="複製"
      >
        <Copy className="w-3 h-3" />
      </button>
      <button
        type="button"
        onClick={handleDeleteSelected}
        className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-950/60 text-rose-600 dark:text-rose-400 cursor-pointer"
        title="削除 (Delete)"
      >
        <Trash2 className="w-3 h-3" />
      </button>
      <button
        type="button"
        onClick={() => {
          setSelectedContourIds([]);
          setSelectedNodeId(null);
        }}
        className="p-1 rounded hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer"
        title="選択解除 (Esc)"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
};
