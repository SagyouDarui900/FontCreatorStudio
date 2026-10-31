import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ThemeClasses } from '../../utils/theme';

export interface GlyphGridPaginationProps {
  validPage: number;
  totalPages: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  isLight: boolean;
  themeClasses?: ThemeClasses;
}

export const GlyphGridPagination: React.FC<GlyphGridPaginationProps> = React.memo(({
  validPage,
  totalPages,
  setCurrentPage,
  isLight,
  themeClasses,
}) => {
  if (totalPages <= 1) return null;

  const btnClass = `px-2 py-1 rounded flex items-center space-x-1 border transition-colors cursor-pointer ${
    themeClasses
      ? `${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} hover:${themeClasses.activeToolHover}`
      : isLight
      ? 'bg-white border-[#c8ded3] text-stone-700 hover:bg-emerald-50'
      : 'bg-[#1f2d24] border-[#2d4034] text-emerald-200 hover:bg-[#283b2f]'
  } disabled:opacity-30 disabled:pointer-events-none disabled:cursor-not-allowed`;

  const smallBtnClass = `px-1.5 py-1 rounded border text-[10px] font-bold cursor-pointer ${
    themeClasses
      ? `${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} hover:${themeClasses.activeToolHover}`
      : isLight
      ? 'bg-white border-[#c8ded3] text-stone-700 hover:bg-emerald-50'
      : 'bg-[#1f2d24] border-[#2d4034] text-emerald-200 hover:bg-[#283b2f]'
  } disabled:opacity-30 disabled:pointer-events-none disabled:cursor-not-allowed`;

  const jumpBtnClass = `px-1.5 py-0.5 rounded text-[10px] font-mono border cursor-pointer ${
    themeClasses
      ? `${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.accentText} hover:${themeClasses.activeToolHover}`
      : isLight ? 'bg-stone-50 border-stone-200 text-stone-600' : 'bg-[#151f18] border-[#25362b] text-emerald-400'
  }`;

  return (
    <div className="flex items-center justify-between text-xs shrink-0 select-none pt-0.5">
      <div className="flex items-center space-x-1">
        <button
          disabled={validPage <= 1}
          onClick={() => setCurrentPage(1)}
          title="最初のページへ"
          className={smallBtnClass}
        >
          « 1
        </button>
        <button
          disabled={validPage <= 1}
          onClick={() => setCurrentPage(Math.max(1, validPage - 1))}
          className={btnClass}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="text-[11px]">前へ</span>
        </button>
      </div>

      {totalPages > 5 && (
        <div className="flex items-center gap-1">
          {validPage > 3 && (
            <button
              onClick={() => setCurrentPage(Math.max(1, validPage - 5))}
              className={jumpBtnClass}
              title="5ページ前へ"
            >
              -5p
            </button>
          )}
          {validPage < totalPages - 2 && (
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, validPage + 5))}
              className={jumpBtnClass}
              title="5ページ先へ"
            >
              +5p
            </button>
          )}
        </div>
      )}

      <div className="flex items-center space-x-1">
        <button
          disabled={validPage >= totalPages}
          onClick={() => setCurrentPage(Math.min(totalPages, validPage + 1))}
          className={btnClass}
        >
          <span className="text-[11px]">次へ</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
        <button
          disabled={validPage >= totalPages}
          onClick={() => setCurrentPage(totalPages)}
          title="最後のページへ"
          className={smallBtnClass}
        >
          {totalPages} »
        </button>
      </div>
    </div>
  );
});
