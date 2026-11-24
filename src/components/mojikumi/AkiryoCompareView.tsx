import React, { useEffect, useState } from 'react';
import { FormattedLayoutResult } from '../../utils/mojikumiEngine';
import { getVerticalGlyphStyle, getMojikumiBoxAlignClass } from '../../utils/mojikumiVertical';
import { groupTateChuYoko } from './BookSpreadView';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface AkiryoCompareViewProps {
  betaLayout: FormattedLayoutResult;
  tsumeLayout: FormattedLayoutResult;
  akeLayout: FormattedLayoutResult;
  charsPerLine: number;
  fontSizeQ: number;
  lineFeedH: number;
  lineCount: number;
  showGrid: boolean;
  isVertical: boolean;
  isLight: boolean;
  fontFamily: string;
  zoom: number;
  /** M20: changes when the layout, work or text switches; resets the page position. */
  pageResetKey?: string;
}

export const AkiryoCompareView: React.FC<AkiryoCompareViewProps> = ({
  betaLayout,
  tsumeLayout,
  akeLayout,
  charsPerLine,
  fontSizeQ,
  lineFeedH,
  lineCount,
  showGrid,
  isVertical,
  isLight,
  fontFamily,
  zoom,
  pageResetKey,
}) => {
  const [mobileTab, setMobileTab] = useState<'all' | 'beta' | 'tsume' | 'ake'>('all');
  const [pageIdx, setPageIdx] = useState(0);

  const emPx = Math.max(13, Math.round(fontSizeQ * 1.35 * zoom));
  const lineGapPx = Math.max(0, Math.round((lineFeedH - fontSizeQ) * 1.35 * zoom));

  // M14: one page shows lineCount lines of each style; M20: switching the
  // layout, work or text returns to the first page.
  const linesPerPage = Math.max(1, Math.min(24, Math.round(lineCount) || 12));
  const totalPages = Math.max(
    1,
    Math.ceil(betaLayout.lines.length / linesPerPage),
    Math.ceil(tsumeLayout.lines.length / linesPerPage),
    Math.ceil(akeLayout.lines.length / linesPerPage)
  );
  useEffect(() => {
    setPageIdx(0);
  }, [pageResetKey]);
  const safePageIdx = Math.min(pageIdx, totalPages - 1);
  const pageLines = (layout: FormattedLayoutResult) =>
    layout.lines.slice(safePageIdx * linesPerPage, safePageIdx * linesPerPage + linesPerPage);

  const renderLines = (layout: FormattedLayoutResult) => {
    if (isVertical) {
      return (
        <div
          dir="rtl"
          className="w-full h-full overflow-x-auto custom-scrollbar p-2"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div
            dir="ltr"
            className="flex flex-row-reverse items-start justify-start w-max ml-auto select-text"
            style={{
              gap: `${lineGapPx}px`,
              fontFamily,
              fontFeatureSettings: '"vert" 0, "vrt2" 0',
              contain: 'content',
            }}
          >
            {layout.lines.map((line, lIdx) => (
              <div
                key={lIdx}
                className={`flex flex-col items-center relative shrink-0 ${
                  line.isOverflown ? 'bg-rose-500/10 rounded-xs' : ''
                }`}
                style={{ minWidth: `${emPx}px`, minHeight: `${emPx}px` }}
              >
                {groupTateChuYoko(line.glyphs).map((group, gIdx) => {
                  // M19: a tate-chu-yoko run is drawn as one cell with its
                  // characters side by side horizontally.
                  if (group.tateChuYoko) {
                    const first = group.glyphs[0];
                    const last = group.glyphs[group.glyphs.length - 1];
                    const text = group.glyphs.map((g) => g.char).join('');
                    return (
                      <span
                        key={gIdx}
                        className="inline-flex items-center justify-center relative"
                        style={{
                          paddingTop: `${first.spacingBeforeEm * emPx}px`,
                          paddingBottom: `${last.spacingAfterEm * emPx}px`,
                        }}
                        title={`縦中横「${text}」 前アキ:${Math.round(first.spacingBeforeEm * 100)}% 後アキ:${Math.round(last.spacingAfterEm * 100)}%`}
                      >
                        <span
                          data-tate-chu-yoko="true"
                          className={`inline-flex items-center justify-center relative ${
                            group.glyphs.some((g) => g.isHanging)
                              ? 'text-amber-600 dark:text-amber-400 font-bold bg-amber-500/15 rounded-xs'
                              : ''
                          }`}
                          style={{
                            width: `${emPx}px`,
                            height: `${emPx}px`,
                            fontSize: `${Math.max(6, Math.floor(emPx / group.glyphs.length))}px`,
                            lineHeight: 1,
                          }}
                        >
                          {showGrid && (
                            <span className="absolute inset-0 pointer-events-none border border-stone-200/60 dark:border-stone-800/60" />
                          )}
                          <span className="inline-flex items-center justify-center whitespace-nowrap">
                            {group.glyphs.map((g, i) => (
                              <span key={i}>{g.char}</span>
                            ))}
                          </span>
                        </span>
                      </span>
                    );
                  }
                  const g = group.glyphs[0];
                  const vertStyle = getVerticalGlyphStyle(g.char, true);
                  const boxHeightPx = (g.baseAdvanceEm ?? 1.0) * emPx;
                  const alignClass = getMojikumiBoxAlignClass(g.kind, g.baseAdvanceEm, true);
                  return (
                    <span
                      key={gIdx}
                      className="inline-flex items-center justify-center relative"
                      style={{
                        paddingTop: `${g.spacingBeforeEm * emPx}px`,
                        paddingBottom: `${g.spacingAfterEm * emPx}px`,
                      }}
                      title={`「${g.char}」 前アキ:${Math.round(g.spacingBeforeEm * 100)}% 後アキ:${Math.round(g.spacingAfterEm * 100)}%`}
                    >
                      <span
                        className={`inline-flex ${alignClass} relative ${
                          g.isHanging
                            ? 'text-amber-600 dark:text-amber-400 font-bold bg-amber-500/15 rounded-xs'
                            : ''
                        }`}
                        style={{
                          width: `${emPx}px`,
                          height: `${boxHeightPx}px`,
                          fontSize: `${emPx}px`,
                          lineHeight: 1,
                        }}
                      >
                        {showGrid && (
                          <span
                            className="absolute inset-0 pointer-events-none border border-stone-200/60 dark:border-stone-800/60"
                          />
                        )}
                        <span style={vertStyle}>{g.char}</span>
                      </span>
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div
        className="w-full h-full overflow-x-auto custom-scrollbar p-2"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div
          className="flex flex-col items-start justify-start w-max select-text"
          style={{
            gap: `${lineGapPx}px`,
            fontFamily,
            fontFeatureSettings: '"vert" 0, "vrt2" 0',
            contain: 'content',
          }}
        >
          {layout.lines.map((line, lIdx) => (
            <div
              key={lIdx}
              className={`flex flex-row items-center relative shrink-0 ${
                line.isOverflown ? 'bg-rose-500/10 rounded-xs' : ''
              }`}
              style={{ minHeight: `${emPx}px` }}
            >
              {line.glyphs.map((g, gIdx) => {
                const boxWidthPx = (g.baseAdvanceEm ?? 1.0) * emPx;
                const alignClass = getMojikumiBoxAlignClass(g.kind, g.baseAdvanceEm, false);
                return (
                  <span
                    key={gIdx}
                    className="inline-flex items-center justify-center relative"
                    style={{
                      paddingLeft: `${g.spacingBeforeEm * emPx}px`,
                      paddingRight: `${g.spacingAfterEm * emPx}px`,
                    }}
                  >
                    <span
                      className={`inline-flex ${alignClass} relative text-center ${
                        g.isHanging
                          ? 'text-amber-600 dark:text-amber-400 font-bold bg-amber-500/15 rounded-xs'
                          : ''
                      }`}
                      style={{
                        width: `${boxWidthPx}px`,
                        height: `${emPx}px`,
                        fontSize: `${emPx}px`,
                        lineHeight: 1,
                      }}
                    >
                      {showGrid && (
                        <span
                          className="absolute inset-0 pointer-events-none border border-stone-200/60 dark:border-stone-800/60"
                        />
                      )}
                      <span>{g.char}</span>
                    </span>
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const columns = [
    {
      id: 'beta',
      title: 'ベタ組み (Solid)',
      badge: 'JIS X 4051 規範',
      badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
      desc: '全角仮想ボディ均等配置。句読点後の最小アキを確保し、一定のリズム感で読ませる本文標準。',
      layout: betaLayout,
      borderActive: 'border-emerald-500/40',
    },
    {
      id: 'tsume',
      title: 'ツメ組み (Tight / palt)',
      badge: 'プロポーショナル',
      badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
      desc: 'OpenType palt適用。約物・仮名の余白を詰め、凝縮感とスピード感を生む見出し・広告組版。',
      layout: tsumeLayout,
      borderActive: 'border-blue-500/40',
    },
    {
      id: 'ake',
      title: 'アケ組み (Spaced / Tracking)',
      badge: 'トラッキング +150',
      badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
      desc: '字間を一様にアケて配置。格調と余韻、呼吸感を持たせるタイトル・リード向け組版。',
      layout: akeLayout,
      borderActive: 'border-purple-500/40',
    },
  ];

  return (
    <div className="w-full h-full flex flex-col p-2 sm:p-4 select-none">
      {/* Mobile sub tabs switcher */}
      <div className="flex md:hidden items-center justify-center p-1 mb-3 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-900 text-xs">
        <button
          onClick={() => setMobileTab('all')}
          className={`flex-1 py-1 rounded-md font-bold transition-colors ${
            mobileTab === 'all'
              ? 'bg-white dark:bg-stone-800 text-emerald-800 dark:text-emerald-300 shadow-xs'
              : 'text-stone-500'
          }`}
        >
          全様式
        </button>
        <button
          onClick={() => setMobileTab('beta')}
          className={`flex-1 py-1 rounded-md font-bold transition-colors ${
            mobileTab === 'beta'
              ? 'bg-white dark:bg-stone-800 text-emerald-800 dark:text-emerald-300 shadow-xs'
              : 'text-stone-500'
          }`}
        >
          ベタ組み
        </button>
        <button
          onClick={() => setMobileTab('tsume')}
          className={`flex-1 py-1 rounded-md font-bold transition-colors ${
            mobileTab === 'tsume'
              ? 'bg-white dark:bg-stone-800 text-blue-800 dark:text-blue-300 shadow-xs'
              : 'text-stone-500'
          }`}
        >
          ツメ組み
        </button>
        <button
          onClick={() => setMobileTab('ake')}
          className={`flex-1 py-1 rounded-md font-bold transition-colors ${
            mobileTab === 'ake'
              ? 'bg-white dark:bg-stone-800 text-purple-800 dark:text-purple-300 shadow-xs'
              : 'text-stone-500'
          }`}
        >
          アケ組み
        </button>
      </div>

      {/* M14: page navigation (lineCount lines per style per page) */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1 pb-1 text-xs shrink-0">
          <span className="font-mono text-[11px] text-stone-500">
            {safePageIdx + 1} / {totalPages} 頁（各様式 {linesPerPage} 行）
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={safePageIdx === 0}
              onClick={() => setPageIdx((v) => Math.max(0, v - 1))}
              className="px-2 py-1 rounded-md border border-stone-300 dark:border-stone-700 disabled:opacity-35 flex items-center gap-0.5 text-[11px] font-bold cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>前頁</span>
            </button>
            <button
              type="button"
              disabled={safePageIdx >= totalPages - 1}
              onClick={() => setPageIdx((v) => Math.min(totalPages - 1, v + 1))}
              className="px-2 py-1 rounded-md border border-stone-300 dark:border-stone-700 disabled:opacity-35 flex items-center gap-0.5 text-[11px] font-bold cursor-pointer"
            >
              <span>次頁</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 3 Columns Grid */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3 gap-4 overflow-y-auto custom-scrollbar">
        {columns.map((col) => {
          const isVisible = mobileTab === 'all' || mobileTab === col.id;
          if (!isVisible) return null;

          return (
            <div
              key={col.id}
              className={`flex flex-col rounded-2xl border overflow-hidden shadow-sm ${col.borderActive} ${
                isLight ? 'bg-white border-stone-200' : 'bg-[#152319] border-[#25382b]'
              }`}
            >
              {/* Header */}
              <div className={`p-3.5 border-b shrink-0 ${isLight ? 'bg-stone-50' : 'bg-[#18281d]'}`}>
                <div className="flex items-center justify-between pb-1">
                  <h3 className="font-bold text-sm tracking-tight">{col.title}</h3>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-medium ${col.badgeColor}`}>
                    {col.badge}
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 leading-tight">{col.desc}</p>
                <div className="flex items-center justify-between text-[10px] font-mono text-stone-400 pt-2 border-t mt-2 border-stone-200/60 dark:border-stone-800/60">
                  <span>行数: {col.layout.lineCount}行</span>
                  <span>平均密度: {col.layout.averageDensityPercent}%</span>
                  {col.layout.burasagariCount > 0 && (
                    <span className="text-amber-500 font-bold">ぶら下がり: {col.layout.burasagariCount}字</span>
                  )}
                </div>
              </div>

              {/* Text Render Area */}
              <div
                className={`flex-1 min-h-[320px] p-4 overflow-auto custom-scrollbar relative ${
                  isLight ? 'bg-stone-50/50' : 'bg-[#0f1712]'
                }`}
              >
                {renderLines({ ...col.layout, lines: pageLines(col.layout) })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
