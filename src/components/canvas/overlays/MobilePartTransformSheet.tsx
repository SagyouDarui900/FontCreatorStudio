import React from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Layers,
  FlipHorizontal,
  FlipVertical,
  RotateCw,
  RotateCcw,
  Italic,
  Plus,
  Minus,
  Copy,
  Wand2,
  Trash2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
} from 'lucide-react';
import type { AlignDirection, DistributeDirection } from '../../../utils/geometry/alignment';

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
  handleAlignSelected?: (direction: AlignDirection) => void;
  handleDistributeSelected?: (direction: DistributeDirection) => void;
  handleDuplicateSelected: () => void;
  handleSmoothStrokeSelected: (strength?: 'mild' | 'standard' | 'strong', keepShape?: boolean) => void;
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
    handleAlignSelected,
    handleDistributeSelected,
    handleDuplicateSelected,
    handleSmoothStrokeSelected,
    handleSimplifySelected,
    handleDeleteSelected,
  }) => {
    if (!isOpen || typeof document === 'undefined') return null;

    return createPortal(
      <div className="sm:hidden fixed inset-0 z-50 flex flex-col justify-end">
        <div className="fixed inset-0 bg-black/60 anim-fade" onClick={onClose} />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="選択輪郭パーツの変形・調整"
          data-allow-native-scroll="true"
          className={`relative z-10 w-full rounded-t-2xl border-t shadow-2xl max-h-[85dvh] flex flex-col overflow-hidden anim-slide-up ${
            isLight ? 'bg-white border-[#c8ded3] text-stone-800' : 'bg-[#151f19] border-[#25362b] text-emerald-100'
          }`}
        >
          <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-stone-200 dark:border-stone-800 shrink-0">
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

          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] space-y-3 text-xs">
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
                  className="w-full p-2.5 rounded-lg border flex items-center justify-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 border-indigo-200 dark:border-indigo-800 font-bold transition-colors"
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
              <div className="grid grid-cols-5 gap-1.5">
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
                  onClick={() => handleRotateSelected(-90)}
                  className="p-2 rounded-lg border flex flex-col items-center gap-1 bg-stone-50 dark:bg-stone-900/60 hover:bg-emerald-50 dark:hover:bg-[#1f2f24] font-medium"
                >
                  <RotateCcw className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>-90°回転</span>
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

            {/* Align (2+ selected) and Distribute (3+ selected).
                Same handlers as the desktop SelectionSubToolbar; the
                subtoolbar itself is hidden below 640px, so without
                these the operations were unreachable on mobile. */}
            {selectedContourIds.length >= 2 && handleAlignSelected && (
              <div>
                <div className="font-bold text-stone-500 dark:text-stone-400 mb-1.5">整列</div>
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    onClick={() => handleAlignSelected('left')}
                    className="p-2 rounded-lg border flex flex-col items-center gap-1 bg-stone-50 dark:bg-stone-900/60 hover:bg-emerald-50 dark:hover:bg-[#1f2f24] font-medium"
                  >
                    <AlignLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>左揃え</span>
                  </button>
                  <button
                    onClick={() => handleAlignSelected('centerH')}
                    className="p-2 rounded-lg border flex flex-col items-center gap-1 bg-stone-50 dark:bg-stone-900/60 hover:bg-emerald-50 dark:hover:bg-[#1f2f24] font-medium"
                  >
                    <AlignCenter className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>水平中央</span>
                  </button>
                  <button
                    onClick={() => handleAlignSelected('right')}
                    className="p-2 rounded-lg border flex flex-col items-center gap-1 bg-stone-50 dark:bg-stone-900/60 hover:bg-emerald-50 dark:hover:bg-[#1f2f24] font-medium"
                  >
                    <AlignRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>右揃え</span>
                  </button>
                  <button
                    onClick={() => handleAlignSelected('top')}
                    className="p-2 rounded-lg border flex flex-col items-center gap-1 bg-stone-50 dark:bg-stone-900/60 hover:bg-emerald-50 dark:hover:bg-[#1f2f24] font-medium"
                  >
                    <AlignStartVertical className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>上揃え</span>
                  </button>
                  <button
                    onClick={() => handleAlignSelected('centerV')}
                    className="p-2 rounded-lg border flex flex-col items-center gap-1 bg-stone-50 dark:bg-stone-900/60 hover:bg-emerald-50 dark:hover:bg-[#1f2f24] font-medium"
                  >
                    <AlignCenterVertical className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>垂直中央</span>
                  </button>
                  <button
                    onClick={() => handleAlignSelected('bottom')}
                    className="p-2 rounded-lg border flex flex-col items-center gap-1 bg-stone-50 dark:bg-stone-900/60 hover:bg-emerald-50 dark:hover:bg-[#1f2f24] font-medium"
                  >
                    <AlignEndVertical className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>下揃え</span>
                  </button>
                  <button
                    onClick={() => handleAlignSelected('emBoxCenterH')}
                    className="p-2 rounded-lg border flex flex-col items-center gap-1 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold"
                  >
                    <AlignCenter className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>全角中央</span>
                  </button>
                </div>
              </div>
            )}

            {selectedContourIds.length >= 3 && handleDistributeSelected && (
              <div>
                <div className="font-bold text-stone-500 dark:text-stone-400 mb-1.5">等間隔</div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => handleDistributeSelected('horizontal')}
                    className="p-2 rounded-lg border flex items-center justify-center gap-1 bg-stone-50 dark:bg-stone-900/60 hover:bg-emerald-50 dark:hover:bg-[#1f2f24] font-medium"
                  >
                    <span>水平等間隔</span>
                  </button>
                  <button
                    onClick={() => handleDistributeSelected('vertical')}
                    className="p-2 rounded-lg border flex items-center justify-center gap-1 bg-stone-50 dark:bg-stone-900/60 hover:bg-emerald-50 dark:hover:bg-[#1f2f24] font-medium"
                  >
                    <span>垂直等間隔</span>
                  </button>
                </div>
              </div>
            )}

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
      </div>,
      document.body
    );
  }
);
