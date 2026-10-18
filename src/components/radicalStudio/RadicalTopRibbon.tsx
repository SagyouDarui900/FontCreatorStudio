import React from 'react';
import { ArrowRight, Scissors } from 'lucide-react';
import { CustomPart, RadicalPlacement } from '../../types';

export interface RadicalTopRibbonProps {
  isLight: boolean;
  selectedChar: string;
  activePart: CustomPart | null;
  handleQuickInsertPlacement: (placement: RadicalPlacement, closeAfter?: boolean) => void;
  handleExtractFromCurrentGlyph: () => void;
}

export const RadicalTopRibbon: React.FC<RadicalTopRibbonProps> = ({
  isLight,
  selectedChar,
  activePart,
  handleQuickInsertPlacement,
  handleExtractFromCurrentGlyph,
}) => {
  const isPartDisabled = !activePart || (activePart.contours?.length ?? 0) === 0;

  return (
    <div
      className={`px-3 py-1.5 border-b flex items-center justify-between gap-2 shrink-0 overflow-x-auto scrollbar-none z-20 ${
        isLight
          ? 'bg-white border-stone-200/60 text-stone-800'
          : 'bg-[#141d16] border-stone-800/60 text-emerald-100'
      }`}
    >
      {/* Placement Insertion Buttons */}
      <div className="flex items-center space-x-1 shrink-0">
        <span className="text-[11px] font-bold shrink-0 mr-1 text-stone-600 dark:text-stone-300 hidden sm:inline">
          文字「{selectedChar}」へ即時挿入:
        </span>
        <button
          onClick={() => handleQuickInsertPlacement('hen')}
          disabled={isPartDisabled}
          className={`px-2 py-1 rounded text-xs font-bold flex items-center space-x-1 transition-all active:scale-95 disabled:opacity-40 ${
            isLight
              ? 'bg-white border border-stone-200 hover:bg-emerald-600 hover:text-white text-stone-800'
              : 'bg-[#1c2e22] border border-stone-700 hover:bg-emerald-500 hover:text-stone-950 text-emerald-200'
          }`}
          title="偏（左側・幅46%）の枠に合わせて文字に挿入"
        >
          <span>偏 (左)</span>
        </button>
        <button
          onClick={() => handleQuickInsertPlacement('tsukuri')}
          disabled={isPartDisabled}
          className={`px-2 py-1 rounded text-xs font-bold flex items-center space-x-1 transition-all active:scale-95 disabled:opacity-40 ${
            isLight
              ? 'bg-white border border-emerald-300 hover:bg-emerald-600 hover:text-white text-emerald-950'
              : 'bg-[#1c2e22] border border-emerald-700/80 hover:bg-emerald-500 hover:text-stone-950 text-emerald-200'
          }`}
          title="旁（右側・幅46%）の枠に合わせて文字に挿入"
        >
          <span>旁 (右)</span>
        </button>
        <button
          onClick={() => handleQuickInsertPlacement('kanmuri')}
          disabled={isPartDisabled}
          className={`px-2 py-1 rounded text-xs font-bold flex items-center space-x-1 transition-all active:scale-95 disabled:opacity-40 ${
            isLight
              ? 'bg-white border border-emerald-300 hover:bg-emerald-600 hover:text-white text-emerald-950'
              : 'bg-[#1c2e22] border border-emerald-700/80 hover:bg-emerald-500 hover:text-stone-950 text-emerald-200'
          }`}
          title="冠（上側・高さ36%）の枠に合わせて文字に挿入"
        >
          <span>冠 (上)</span>
        </button>
        <button
          onClick={() => handleQuickInsertPlacement('ashi')}
          disabled={isPartDisabled}
          className={`px-2 py-1 rounded text-xs font-bold flex items-center space-x-1 transition-all active:scale-95 disabled:opacity-40 ${
            isLight
              ? 'bg-white border border-emerald-300 hover:bg-emerald-600 hover:text-white text-emerald-950'
              : 'bg-[#1c2e22] border border-emerald-700/80 hover:bg-emerald-500 hover:text-stone-950 text-emerald-200'
          }`}
          title="脚（下側・高さ36%）の枠に合わせて文字に挿入"
        >
          <span>脚 (下)</span>
        </button>
        <button
          onClick={() => handleQuickInsertPlacement('original')}
          disabled={isPartDisabled}
          className={`px-2 py-1 rounded text-xs font-bold flex items-center space-x-1 transition-all active:scale-95 disabled:opacity-40 ${
            isLight
              ? 'bg-emerald-800 text-white hover:bg-emerald-900'
              : 'bg-emerald-600 text-white hover:bg-emerald-500'
          }`}
          title="原寸位置のまま現在の文字に挿入"
        >
          <ArrowRight className="w-3 h-3" />
          <span>そのまま挿入</span>
        </button>
      </div>

      {/* Fast Extract from Current Glyph */}
      <div className="flex items-center space-x-1.5 shrink-0">
        <button
          onClick={handleExtractFromCurrentGlyph}
          className={`px-2.5 py-1 rounded-md text-xs font-bold flex items-center space-x-1.5 border transition-all active:scale-95 shadow-2xs ${
            isLight
              ? 'bg-white border-emerald-300 text-emerald-900 hover:bg-emerald-50'
              : 'bg-[#1a2b20] border-emerald-700 text-emerald-200 hover:bg-[#22382a]'
          }`}
          title={`現在編集中の文字「${selectedChar}」の描画輪郭を作字パーツとして取り込みます`}
        >
          <Scissors className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>「{selectedChar}」輪郭を取込</span>
        </button>
      </div>
    </div>
  );
};
