import React from 'react';
import {
  X,
  Layers,
  FlipHorizontal,
  FlipVertical,
  RotateCw,
  Italic,
  Plus,
  Minus,
  Copy,
  Wand2,
  Trash2,
} from 'lucide-react';

export interface MobilePartTransformSheetProps {
  isOpen: boolean;
  onClose: () => void;
  isLight: boolean;
  selectedContourIds: string[];
  handleMergeSelectedContours: () => void;
  handleFlipHSelected: () => void;
  handleFlipVSelected: () => void;
  handleRotateSelected: (deg: number) => void;
  handleSlantSelected: (amt: number) => void;
  handleScaleSelected: (factor: number) => void;
  handleDuplicateSelected: () => void;
  handleSmoothStrokeSelected: (strength?: 'light' | 'standard' | 'strong', keepShape?: boolean) => void;
  handleSimplifySelected: (tol?: number) => void;
  handleDeleteSelected: () => void;
}

export const MobilePartTransformSheet: React.FC<MobilePartTransformSheetProps> = React.memo(
  ({
    isOpen,
    onClose,
    isLight,
    selectedContourIds,
    handleMergeSelectedContours,
    handleFlipHSelected,
    handleFlipVSelected,
    handleRotateSelected,
    handleSlantSelected,
    handleScaleSelected,
    handleDuplicateSelected,
    handleSmoothStrokeSelected,
    handleSimplifySelected,
    handleDeleteSelected,
  }) => {
    if (!isOpen) return null;

    return (
      <div className="sm:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/60 animate-fadeIn">
        <div className="fixed inset-0" onClick={onClose} />
        <div
          className={`relative z-10 w-full rounded-t-2xl p-4 border-t shadow-2xl max-h-[75vh] overflow-y-auto ${
            isLight ? 'bg-white border-[#c8ded3] text-stone-800' : 'bg-[#151f19] border-[#25362b] text-emerald-100'
          }`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800 mb-3">
            <div className="font-bold text-sm text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
              <span>選択輪郭パーツの変形・調整</span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3 text-xs">
            {/* Merge paths or resolve cursive loops */}
            {selectedContourIds.length >= 1 && (
              <div>
                <div className="font-bold text-stone-500 dark:text-stone-400 mb-1.5">
                  {selectedContourIds.length === 1 ? '一筆書き重なり白抜きの解消' : 'パスの合体・白抜き解消'}
                </div>
                <button
                  onClick={() => {
                    handleMergeSelectedContours();
                    onClose();
                  }}
                  className="w-full p-2.5 rounded-lg border flex items-center justify-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 border-indigo-200 dark:border-indigo-800 font-bold transition-colors active:scale-98"
                >
                  <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>
                    {selectedContourIds.length === 1
                      ? '重なり部分を自動結合して中抜きを消去'
                      : '選択した全パーツをベクター結合'}
                  </span>
                </button>
              </div>
            )}

            {/* Flip and Rotate */}
            <div>
              <div className="font-bold text-stone-500 dark:text-stone-400 mb-1.5">反転・回転</div>
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  onClick={handleFlipHSelected}
                  className="p-2 rounded-lg border flex flex-col items-center gap-1 bg-stone-50 dark:bg-stone-900/60 hover:bg-emerald-50 dark:hover:bg-[#1f2f24] font-medium"
                >
                  <FlipHorizontal className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>左右反転</span>
                </button>
                <button
                  onClick={handleFlipVSelected}
                  className="p-2 rounded-lg border flex flex-col items-center gap-1 bg-stone-50 dark:bg-stone-900/60 hover:bg-emerald-50 dark:hover:bg-[#1f2f24] font-medium"
                >
                  <FlipVertical className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>上下反転</span>
                </button>
                <button
                  onClick={() => handleRotateSelected(90)}
                  className="p-2 rounded-lg border flex flex-col items-center gap-1 bg-stone-50 dark:bg-stone-900/60 hover:bg-emerald-50 dark:hover:bg-[#1f2f24] font-medium"
                >
                  <RotateCw className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>+90°回転</span>
                </button>
                <button
                  onClick={() => handleSlantSelected(0.2)}
                  className="p-2 rounded-lg border flex flex-col items-center gap-1 bg-stone-50 dark:bg-stone-900/60 hover:bg-emerald-50 dark:hover:bg-[#1f2f24] font-medium"
                >
                  <Italic className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>斜体</span>
                </button>
              </div>
            </div>

            {/* Scale and Duplicate */}
            <div>
              <div className="font-bold text-stone-500 dark:text-stone-400 mb-1.5">サイズ伸縮・複製</div>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => handleScaleSelected(1.1)}
                  className="p-2 rounded-lg border flex items-center justify-center gap-1 bg-stone-50 dark:bg-stone-900/60 hover:bg-emerald-50 dark:hover:bg-[#1f2f24] font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>拡大 +10%</span>
                </button>
                <button
                  onClick={() => handleScaleSelected(0.9)}
                  className="p-2 rounded-lg border flex items-center justify-center gap-1 bg-stone-50 dark:bg-stone-900/60 hover:bg-emerald-50 dark:hover:bg-[#1f2f24] font-medium"
                >
                  <Minus className="w-3.5 h-3.5" />
                  <span>縮小 -10%</span>
                </button>
                <button
                  onClick={handleDuplicateSelected}
                  className="p-2 rounded-lg border flex items-center justify-center gap-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800 font-bold"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>パーツ複製</span>
                </button>
              </div>
            </div>

            {/* Smoothing and Optimization */}
            <div>
              <div className="font-bold text-stone-500 dark:text-stone-400 mb-1.5">ストローク最適化</div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => handleSmoothStrokeSelected('standard', true)}
                  className="p-2 rounded-lg border flex items-center justify-center gap-1.5 bg-stone-50 dark:bg-stone-900/60 hover:bg-emerald-50 dark:hover:bg-[#1f2f24] font-medium"
                >
                  <Wand2 className="w-3.5 h-3.5 text-stone-600 dark:text-stone-300" />
                  <span>筆跡スムーズ化</span>
                </button>
                <button
                  onClick={() => handleSimplifySelected(6)}
                  className="p-2 rounded-lg border flex items-center justify-center gap-1.5 bg-stone-50 dark:bg-stone-900/60 hover:bg-emerald-50 dark:hover:bg-[#1f2f24] font-medium"
                >
                  <Wand2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>アンカー点削減</span>
                </button>
              </div>
            </div>

            {/* Delete button */}
            <div className="pt-2 border-t border-stone-200 dark:border-stone-800">
              <button
                onClick={() => {
                  handleDeleteSelected();
                  onClose();
                }}
                className="w-full py-2 rounded-lg bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/80 dark:hover:bg-rose-900 text-rose-800 dark:text-rose-200 font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>選択した輪郭パーツを削除</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
);
