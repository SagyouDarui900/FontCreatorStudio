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
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  Star,
} from 'lucide-react';
import { ToolMode, PathContour, CustomPart } from '../../../types';
import { AlignDirection, DistributeDirection } from '../../../utils/geometry/alignment';
import { generateId } from '../../../utils/path';
import { loadCustomParts, saveCustomParts } from '../../../utils/customPartsStorage';

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
  handleAlignSelected?: (direction: AlignDirection) => void;
  handleDistributeSelected?: (direction: DistributeDirection) => void;
  contours?: PathContour[];
  activeChar?: string;
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
  handleAlignSelected,
  handleDistributeSelected,
  contours,
  activeChar,
}) => {
  if (!((toolMode === 'select' || toolMode === 'node') && selectedContourIds.length > 0)) {
    return null;
  }

  const handleRegisterAsCustomPart = async () => {
    if (!contours || selectedContourIds.length === 0) return;
    const selectedContours = contours.filter((c) => selectedContourIds.includes(c.id));
    if (selectedContours.length === 0) return;

    const cloned: PathContour[] = selectedContours.map((c) => ({
      ...c,
      id: generateId(),
      nodes: c.nodes.map((n) => ({
        ...n,
        id: generateId(),
        handleIn: n.handleIn ? { ...n.handleIn } : null,
        handleOut: n.handleOut ? { ...n.handleOut } : null,
      })),
    }));

    try {
      const existingParts = await loadCustomParts();
      const partName = activeChar ? `「${activeChar}」のパーツ` : `自作パーツ_${existingParts.length + 1}`;
      const newPart: CustomPart = {
        id: generateId(),
        name: partName,
        contours: cloned,
        createdAt: Date.now(),
      };

      const updated = [newPart, ...existingParts];
      await saveCustomParts(updated);
      window.dispatchEvent(new CustomEvent('font_custom_parts_updated'));
      showCanvasToast(`「${partName}」を部首パーツに登録しました`, '右側の「部首」ドロワー＞「マイパーツ」からいつでも再利用・合成できます');
    } catch (e) {
      console.error('Failed to register custom part:', e);
      showCanvasToast('パーツの登録に失敗しました');
    }
  };

  return (
    <div className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-stone-100 dark:bg-[#18231c] border border-stone-200 dark:border-stone-700 shrink-0">
      <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 pr-0.5 tabular-nums">
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

      {/* 1-Click Register to Custom Parts */}
      {contours && contours.length > 0 && (
        <button
          type="button"
          onClick={handleRegisterAsCustomPart}
          className="px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-600 text-stone-950 text-[10px] font-bold flex items-center space-x-1 transition-all active:scale-95 mr-1 cursor-pointer shadow-xs"
          title="選択した輪郭を「マイ部首パーツ」として1クリック登録（他の文字で再利用可能）"
        >
          <Star className="w-2.5 h-2.5 fill-stone-950 text-stone-950" />
          <span>部首パーツに登録</span>
        </button>
      )}

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

      {selectedContourIds.length >= 2 && handleAlignSelected && (
        <div className="flex items-center space-x-0.5 border-l border-stone-300 dark:border-stone-600 pl-1 mr-1">
          <button
            type="button"
            onClick={() => handleAlignSelected('left')}
            className="p-1 rounded hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition-colors"
            title="左揃え"
          >
            <AlignLeft className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => handleAlignSelected('centerH')}
            className="p-1 rounded hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition-colors"
            title="水平中央揃え"
          >
            <AlignCenter className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => handleAlignSelected('right')}
            className="p-1 rounded hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition-colors"
            title="右揃え"
          >
            <AlignRight className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => handleAlignSelected('top')}
            className="p-1 rounded hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition-colors"
            title="上揃え"
          >
            <AlignStartVertical className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => handleAlignSelected('centerV')}
            className="p-1 rounded hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition-colors"
            title="垂直中央揃え"
          >
            <AlignCenterVertical className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => handleAlignSelected('bottom')}
            className="p-1 rounded hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition-colors"
            title="下揃え"
          >
            <AlignEndVertical className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => handleAlignSelected('emBoxCenterH')}
            className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100"
            title="全角仮想ボディの中央に配置"
          >
            全角中央
          </button>
          {selectedContourIds.length >= 3 && handleDistributeSelected && (
            <>
              <button
                type="button"
                onClick={() => handleDistributeSelected('horizontal')}
                className="px-1 py-0.5 rounded text-[9px] font-bold bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-300"
                title="水平等間隔に分布"
              >
                等間隔H
              </button>
              <button
                type="button"
                onClick={() => handleDistributeSelected('vertical')}
                className="px-1 py-0.5 rounded text-[9px] font-bold bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-300"
                title="垂直等間隔に分布"
              >
                等間隔V
              </button>
            </>
          )}
        </div>
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
