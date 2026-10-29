import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface GlyphGridPaginationProps {
  validPage: number;
  totalPages: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  isLight: boolean;
}

export const GlyphGridPagination: React.FC<GlyphGridPaginationProps> = React.memo(({
  validPage,
  totalPages,
  setCurrentPage,
  isLight,
}) => {
  if (totalPages <= 1) return null;

  return (
    <div
      className={`p-2 border-t flex items-center justify-between text-xs shrink-0 select-none ${
        isLight ? 'bg-white border-[#c8ded3]' : 'bg-[#121c15] border-[#25362b]'
      }`}
    >
      <div className="flex items-center space-x-1">
        <button
          disabled={validPage <= 1}
          onClick={() => setCurrentPage(1)}
          title="最初のページへ"
          className={`px-1.5 py-1 rounded disabled:opacity-30 border text-[10px] font-bold ${
            isLight
              ? 'bg-white border-[#c8ded3] text-stone-700 hover:bg-emerald-50'
              : 'bg-[#1f2d24] border-[#2d4034] text-emerald-200 hover:bg-[#283b2f]'
          }`}
        >
          « 1
        </button>
        <button
          disabled={validPage <= 1}
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          className={`px-2 py-1 rounded flex items-center space-x-1 disabled:opacity-30 border transition-colors ${
            isLight
              ? 'bg-white border-[#c8ded3] text-stone-700 hover:bg-emerald-50'
              : 'bg-[#1f2d24] border-[#2d4034] text-emerald-200 hover:bg-[#283b2f]'
          }`}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="text-[11px]">前へ</span>
        </button>
      </div>

      {totalPages > 5 && (
        <div className="flex items-center gap-1">
          {validPage > 3 && (
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 5))}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                isLight ? 'bg-stone-50 border-stone-200 text-stone-600' : 'bg-[#151f18] border-[#25362b] text-emerald-400'
              }`}
              title="5ページ前へ"
            >
              -5p
            </button>
          )}
          {validPage < totalPages - 2 && (
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 5))}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                isLight ? 'bg-stone-50 border-stone-200 text-stone-600' : 'bg-[#151f18] border-[#25362b] text-emerald-400'
              }`}
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
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          className={`px-2 py-1 rounded flex items-center space-x-1 disabled:opacity-30 border transition-colors ${
            isLight
              ? 'bg-white border-[#c8ded3] text-stone-700 hover:bg-emerald-50'
              : 'bg-[#1f2d24] border-[#2d4034] text-emerald-200 hover:bg-[#283b2f]'
          }`}
        >
          <span className="text-[11px]">次へ</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
        <button
          disabled={validPage >= totalPages}
          onClick={() => setCurrentPage(totalPages)}
          title="最後のページへ"
          className={`px-1.5 py-1 rounded disabled:opacity-30 border text-[10px] font-bold ${
            isLight
              ? 'bg-white border-[#c8ded3] text-stone-700 hover:bg-emerald-50'
              : 'bg-[#1f2d24] border-[#2d4034] text-emerald-200 hover:bg-[#283b2f]'
          }`}
        >
          {totalPages} »
        </button>
      </div>
    </div>
  );
});
