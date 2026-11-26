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
  Scissors,
  Combine,
  CornerDownRight,
  Spline,
  Expand,
  RefreshCw,
  BookmarkPlus,
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
  handleSubtractSelectedContours?: () => void;
  handleIntersectSelectedContours?: () => void;
  handleConvertToCornersSelected?: () => void;
  handleConvertToSmoothSelected?: () => void;
  handleExpandStrokeSelected?: () => void;
  handleReverseWindingSelected?: () => void;
  handleRegisterSelectedAsCustomPart?: () => void;
  handleDeleteSelected: () => void;
  isGlyphLocked?: boolean;
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
    handleSubtractSelectedContours,
    handleIntersectSelectedContours,
    handleConvertToCornersSelected,
    handleConvertToSmoothSelected,
    handleExpandStrokeSelected,
    handleReverseWindingSelected,
    handleRegisterSelectedAsCustomPart,
    handleDeleteSelected,
    isGlyphLocked = false,
  }) => {
    if (!isOpen || typeof document === 'undefined') return null;
    const disabledCls = isGlyphLocked ? 'opacity-45 cursor-not-allowed' : '';

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
              {isGlyphLocked && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold">
                  ロック中
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] space-y-3 text-xs">
            {/* Merge paths or boolean ops */}
            {selectedContourIds.length >= 1 && (
              <div className="space-y-1.5">
                <div className="font-bold text-stone-500 dark:text-stone-400">
                  {selectedContourIds.length === 1 ? '一筆書き重なり白抜きの解消' : 'パスの結合・論理演算'}
                </div>
                <button
                  disabled={isGlyphLocked}
                  onClick={() => {
                    handleMergeSelectedContours();
                    onClose();
                  }}
                  className={`w-full p-2.5 rounded-lg border flex items-center justify-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 border-indigo-200 dark:border-indigo-800 font-bold transition-colors ${disabledCls}`}
                >
                  <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>
                    {selectedContourIds.length === 1
                      ? '重なり部分を自動結合して中抜きを消去'
                      : '選択した全パーツをベクター結合'}
                  </span>
                </button>
                {selectedContourIds.length >= 2 && (handleSubtractSelectedContours || handleIntersectSelectedContours) && (
                  <div className="grid grid-cols-2 gap-1.5">
                    {handleSubtractSelectedContours && (
                      <button
                        disabled={isGlyphLocked}
                        onClick={() => {
                          handleSubtractSelectedContours();
                          onClose();
                        }}
                        className={`p-2 rounded-lg border flex items-center justify-center gap-1.5 bg-stone-50 dark:bg-stone-900/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 font-medium ${disabledCls}`}
                      >
                        <Scissors className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>型抜き (差分)</span>
                      </button>
                    )}
                    {handleIntersectSelectedContours && (
                      <button
                        disabled={isGlyphLocked}
                        onClick={() => {
                          handleIntersectSelectedContours();
                          onClose();
                        }}
                        className={`p-2 rounded-lg border flex items-center justify-center gap-1.5 bg-stone-50 dark:bg-stone-900/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 font-medium ${disabledCls}`}
                      >
                        <Combine className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>交差 (重なり)</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Flip and Rotate */}
            <div>
              <div className="font-bold text-stone-500 dark:text-stone-400 mb-1.5">反転・回転</div>
              <div className="grid grid-cols-5 gap-1.5">
                <button
                  disabled={isGlyphLocked}
                  onClick={handleFlipHSelected}
                  className={`p-2 rounded-lg border flex flex-col items-center gap-1 bg-stone-50 dark:bg-stone-900/60 hover:bg-emerald-50 dark:hover:bg-[#1f2f24] font-medium ${disabledCls}`}
                >
                  <FlipHorizontal className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>左右反転</span>
                </button>
                <button
                  disabled={isGlyphLocked}
                  onClick={handleFlipVSelected}
                  className={`p-2 rounded-lg border flex flex-col items-center gap-1 bg-stone-50 dark:bg-stone-900/60 hover:bg-emerald-50 dark:hover:bg-[#1f2f24] font-medium ${disabledCls}`}
                >
                  <FlipVertical className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>上下反転</span>
                </button>
                <button
                  disabled={isGlyphLocked}
                  onClick={() => handleRotateSelected(90)}
                  className={`p-2 rounded-lg border flex flex-col items-center gap-1 bg-stone-50 dark:bg-stone-900/60 hover:bg-emerald-50 dark:hover:bg-[#1f2f24] font-medium ${disabledCls}`}
                >
                  <RotateCw className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>+90°回転</span>
                </button>
                <button
                  disabled={isGlyphLocked}
                  onClick={() => handleRotateSelected(-90)}
                  className={`p-2 rounded-lg border flex flex-col items-center gap-1 bg-stone-50 dark:bg-stone-900/60 hover:bg-emerald-50 dark:hover:bg-[#1f2f24] font-medium ${disabledCls}`}
                >
                  <RotateCcw className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>-90°回転</span>
                </button>
                <button
                  disabled={isGlyphLocked}
                  onClick={() => handleSlantSelected(10)}
                  className={`p-2 rounded-lg border flex flex-col items-center gap-1 bg-stone-50 dark:bg-stone-900/60 hover:bg-emerald-50 dark:hover:bg-[#1f2f24] font-medium ${disabledCls}`}
                >
                  <Italic className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>斜体</span>
                </button>
              </div>
            </div>

            {/* Align (1+ selected for emBoxCenterH, 2+ for contour-to-contour align)
                and Distribute (3+ selected). */}
            {selectedContourIds.length >= 1 && handleAlignSelected && (
              <div>
                <div className="font-bold text-stone-500 dark:text-stone-400 mb-1.5">整列</div>
                <div className="grid grid-cols-4 gap-1.5">
                  {selectedContourIds.length >= 2 && (
                    <>
                      <button
                        disabled={isGlyphLocked}
                        onClick={() => handleAlignSelected('left')}
                        className={`p-2 rounded-lg border flex flex-col items-center gap-1 bg-stone-50 dark:bg-stone-900/60 hover:bg-emerald-50 dark:hover:bg-[#1f2f24] font-medium ${disabledCls}`}
                      >
                        <AlignLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>左揃え</span>
                      </button>
                      <button
                        disabled={isGlyphLocked}
                        onClick={() => handleAlignSelected('centerH')}
                        className={`p-2 rounded-lg border flex flex-col items-center gap-1 bg-stone-50 dark:bg-stone-900/60 hover:bg-emerald-50 dark:hover:bg-[#1f2f24] font-medium ${disabledCls}`}
                      >
                        <AlignCenter className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>水平中央</span>
                      </button>
                      <button
                        disabled={isGlyphLocked}
                        onClick={() => handleAlignSelected('right')}
                        className={`p-2 rounded-lg border flex flex-col items-center gap-1 bg-stone-50 dark:bg-stone-900/60 hover:bg-emerald-50 dark:hover:bg-[#1f2f24] font-medium ${disabledCls}`}
                      >
                        <AlignRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>右揃え</span>
                      </button>
                      <button
                        disabled={isGlyphLocked}
                        onClick={() => handleAlignSelected('top')}
                        className={`p-2 rounded-lg border flex flex-col items-center gap-1 bg-stone-50 dark:bg-stone-900/60 hover:bg-emerald-50 dark:hover:bg-[#1f2f24] font-medium ${disabledCls}`}
                      >
                        <AlignStartVertical className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>上揃え</span>
                      </button>
                      <button
                        disabled={isGlyphLocked}
                        onClick={() => handleAlignSelected('centerV')}
                        className={`p-2 rounded-lg border flex flex-col items-center gap-1 bg-stone-50 dark:bg-stone-900/60 hover:bg-emerald-50 dark:hover:bg-[#1f2f24] font-medium ${disabledCls}`}
                      >
                        <AlignCenterVertical className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>垂直中央</span>
                      </button>
                      <button
                        disabled={isGlyphLocked}
                        onClick={() => handleAlignSelected('bottom')}
                        className={`p-2 rounded-lg border flex flex-col items-center gap-1 bg-stone-50 dark:bg-stone-900/60 hover:bg-emerald-50 dark:hover:bg-[#1f2f24] font-medium ${disabledCls}`}
                      >
                        <AlignEndVertical className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>下揃え</span>
                      </button>
                    </>
                  )}
                  <button
                    disabled={isGlyphLocked}
                    onClick={() => handleAlignSelected('emBoxCenterH')}
                    className={`p-2 rounded-lg border flex flex-col items-center gap-1 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold ${disabledCls}`}
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
                    disabled={isGlyphLocked}
                    onClick={() => handleDistributeSelected('horizontal')}
                    className={`p-2 rounded-lg border flex items-center justify-center gap-1 bg-stone-50 dark:bg-stone-900/60 hover:bg-emerald-50 dark:hover:bg-[#1f2f24] font-medium ${disabledCls}`}
                  >
                    <span>水平等間隔</span>
                  </button>
                  <button
                    disabled={isGlyphLocked}
                    onClick={() => handleDistributeSelected('vertical')}
                    className={`p-2 rounded-lg border flex items-center justify-center gap-1 bg-stone-50 dark:bg-stone-900/60 hover:bg-emerald-50 dark:hover:bg-[#1f2f24] font-medium ${disabledCls}`}
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
                  disabled={isGlyphLocked}
                  onClick={() => handleScaleSelected(1.1)}
                  className={`p-2 rounded-lg border flex items-center justify-center gap-1 bg-stone-50 dark:bg-stone-900/60 hover:bg-emerald-50 dark:hover:bg-[#1f2f24] font-medium ${disabledCls}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>拡大 +10%</span>
                </button>
                <button
                  disabled={isGlyphLocked}
                  onClick={() => handleScaleSelected(0.9)}
                  className={`p-2 rounded-lg border flex items-center justify-center gap-1 bg-stone-50 dark:bg-stone-900/60 hover:bg-emerald-50 dark:hover:bg-[#1f2f24] font-medium ${disabledCls}`}
                >
                  <Minus className="w-3.5 h-3.5" />
                  <span>縮小 -10%</span>
                </button>
                <button
                  disabled={isGlyphLocked}
                  onClick={handleDuplicateSelected}
                  className={`p-2 rounded-lg border flex items-center justify-center gap-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800 font-bold ${disabledCls}`}
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>パーツ複製</span>
                </button>
              </div>
            </div>

            {/* Smoothing and Optimization */}
            <div>
              <div className="font-bold text-stone-500 dark:text-stone-400 mb-1.5">ストローク最適化・パス変換</div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  disabled={isGlyphLocked}
                  onClick={() => handleSmoothStrokeSelected('standard', true)}
                  className={`p-2 rounded-lg border flex items-center justify-center gap-1.5 bg-stone-50 dark:bg-stone-900/60 hover:bg-emerald-50 dark:hover:bg-[#1f2f24] font-medium ${disabledCls}`}
                >
                  <Wand2 className="w-3.5 h-3.5 text-stone-600 dark:text-stone-300" />
                  <span>筆跡スムーズ化</span>
                </button>
                <button
                  disabled={isGlyphLocked}
                  onClick={() => handleSimplifySelected(6)}
                  className={`p-2 rounded-lg border flex items-center justify-center gap-1.5 bg-stone-50 dark:bg-stone-900/60 hover:bg-emerald-50 dark:hover:bg-[#1f2f24] font-medium ${disabledCls}`}
                >
                  <Wand2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>アンカー点削減</span>
                </button>
                {handleConvertToCornersSelected && (
                  <button
                    disabled={isGlyphLocked}
                    onClick={handleConvertToCornersSelected}
                    className={`p-2 rounded-lg border flex items-center justify-center gap-1.5 bg-stone-50 dark:bg-stone-900/60 hover:bg-emerald-50 dark:hover:bg-[#1f2f24] font-medium ${disabledCls}`}
                  >
                    <CornerDownRight className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                    <span>全点角化</span>
                  </button>
                )}
                {handleConvertToSmoothSelected && (
                  <button
                    disabled={isGlyphLocked}
                    onClick={handleConvertToSmoothSelected}
                    className={`p-2 rounded-lg border flex items-center justify-center gap-1.5 bg-stone-50 dark:bg-stone-900/60 hover:bg-emerald-50 dark:hover:bg-[#1f2f24] font-medium ${disabledCls}`}
                  >
                    <Spline className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                    <span>全点曲線化</span>
                  </button>
                )}
                {handleExpandStrokeSelected && (
                  <button
                    disabled={isGlyphLocked}
                    onClick={handleExpandStrokeSelected}
                    className={`p-2 rounded-lg border flex items-center justify-center gap-1.5 bg-stone-50 dark:bg-stone-900/60 hover:bg-emerald-50 dark:hover:bg-[#1f2f24] font-medium ${disabledCls}`}
                  >
                    <Expand className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>線輪郭化</span>
                  </button>
                )}
                {handleReverseWindingSelected && (
                  <button
                    disabled={isGlyphLocked}
                    onClick={handleReverseWindingSelected}
                    className={`p-2 rounded-lg border flex items-center justify-center gap-1.5 bg-stone-50 dark:bg-stone-900/60 hover:bg-emerald-50 dark:hover:bg-[#1f2f24] font-medium ${disabledCls}`}
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>向き反転 (中抜き)</span>
                  </button>
                )}
                {handleRegisterSelectedAsCustomPart && (
                  <button
                    type="button"
                    onClick={() => {
                      handleRegisterSelectedAsCustomPart();
                      onClose();
                    }}
                    className="col-span-2 p-2 rounded-lg border flex items-center justify-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800 font-bold"
                  >
                    <BookmarkPlus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>部首パーツとして登録</span>
                  </button>
                )}
              </div>
            </div>

            {/* Delete button */}
            <div className="pt-2 border-t border-stone-200 dark:border-stone-800">
              <button
                disabled={isGlyphLocked}
                onClick={() => {
                  handleDeleteSelected();
                  onClose();
                }}
                className={`w-full py-2 rounded-lg bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/80 dark:hover:bg-rose-900 text-rose-800 dark:text-rose-200 font-bold flex items-center justify-center gap-1.5 transition-colors ${disabledCls}`}
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
