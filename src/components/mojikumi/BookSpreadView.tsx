import React from 'react';
import { FormattedLayoutResult } from '../../utils/mojikumiEngine';

interface BookSpreadViewProps {
  layout: FormattedLayoutResult;
  title: string;
  author: string;
  isLight: boolean;
  fontFamily: string;
  fontSizeQ: number;
  lineFeedH: number;
  charsPerLine: number;
  showGrid: boolean;
  isVertical: boolean;
  zoom: number;
}

export const BookSpreadView: React.FC<BookSpreadViewProps> = ({
  layout,
  title,
  author,
  isLight,
  fontFamily,
  fontSizeQ,
  lineFeedH,
  charsPerLine,
  showGrid,
  isVertical,
  zoom,
}) => {
  // Approximate scale for screen rendering
  const emPx = Math.max(13, Math.round(fontSizeQ * 1.35 * zoom));
  const lineGapPx = Math.max(6, Math.round((lineFeedH - fontSizeQ) * 1.35 * zoom));

  // Split lines across two pages (Right Page = Page 1, Left Page = Page 2 in vertical-rl Japanese books)
  const linesPerPage = Math.max(6, Math.min(18, Math.floor(layout.lines.length / 2) || 8));
  const rightPageLines = layout.lines.slice(0, linesPerPage);
  const leftPageLines = layout.lines.slice(linesPerPage, linesPerPage * 2);

  // Background and paper colors
  const paperBg = isLight ? 'bg-[#fcfaf2]' : 'bg-[#18231a]';
  const paperBorder = isLight ? 'border-amber-200/80 shadow-md' : 'border-emerald-950/80 shadow-md';
  const textColor = isLight ? 'text-[#2b241d]' : 'text-[#e8efe9]';
  const subtleColor = isLight ? 'text-stone-400' : 'text-stone-500';
  const gridBorder = isLight ? 'border-amber-900/15' : 'border-emerald-500/20';

  const renderPageLines = (lines: typeof layout.lines, pageNumber: number) => {
    if (lines.length === 0) {
      return (
        <div className={`h-full flex items-center justify-center text-xs ${subtleColor} italic`}>
          （次項へ続く）
        </div>
      );
    }

    if (isVertical) {
      return (
        <div
          className="flex flex-row-reverse items-start justify-end h-full select-text overflow-hidden"
          style={{
            gap: `${lineGapPx}px`,
            fontFamily,
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
          }}
        >
          {lines.map((line, lIdx) => (
            <div
              key={lIdx}
              className={`flex flex-col items-center relative shrink-0 ${
                line.isOverflown ? 'bg-rose-500/10' : ''
              }`}
              style={{ minWidth: `${emPx}px` }}
            >
              {line.glyphs.map((g, gIdx) => (
                <span
                  key={gIdx}
                  className={`inline-flex items-center justify-center relative ${
                    g.isHanging
                      ? 'text-amber-600 dark:text-amber-400 font-bold bg-amber-500/15 rounded'
                      : ''
                  }`}
                  style={{
                    width: `${emPx}px`,
                    minHeight: `${emPx}px`,
                    fontSize: `${emPx}px`,
                    lineHeight: 1,
                    paddingTop: `${g.spacingBeforeEm * emPx}px`,
                    paddingBottom: `${g.spacingAfterEm * emPx}px`,
                  }}
                  title={`「${g.char}」 前アキ:${Math.round(g.spacingBeforeEm * 100)}% 後アキ:${Math.round(g.spacingAfterEm * 100)}%`}
                >
                  {showGrid && (
                    <span
                      className={`absolute inset-0 pointer-events-none border ${gridBorder}`}
                      style={{ width: `${emPx}px`, height: `${emPx}px` }}
                    />
                  )}
                  {g.char}
                </span>
              ))}
            </div>
          ))}
        </div>
      );
    }

    // Horizontal Book Layout
    return (
      <div
        className="flex flex-col h-full select-text overflow-hidden"
        style={{
          gap: `${lineGapPx}px`,
          fontFamily,
        }}
      >
        {lines.map((line, lIdx) => (
          <div
            key={lIdx}
            className={`flex flex-row items-baseline relative shrink-0 ${
              line.isOverflown ? 'bg-rose-500/10' : ''
            }`}
            style={{ minHeight: `${emPx}px` }}
          >
            {line.glyphs.map((g, gIdx) => (
              <span
                key={gIdx}
                className={`inline-block relative text-center ${
                  g.isHanging
                    ? 'text-amber-600 dark:text-amber-400 font-bold bg-amber-500/15 rounded'
                    : ''
                }`}
                style={{
                  fontSize: `${emPx}px`,
                  lineHeight: 1,
                  paddingLeft: `${g.spacingBeforeEm * emPx}px`,
                  paddingRight: `${g.spacingAfterEm * emPx}px`,
                }}
              >
                {showGrid && (
                  <span
                    className={`absolute inset-0 pointer-events-none border ${gridBorder}`}
                    style={{ width: `${emPx}px`, height: `${emPx}px` }}
                  />
                )}
                {g.char}
              </span>
            ))}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col items-center justify-center p-2 sm:p-6 select-none">
      {/* Book Spread Frame */}
      <div
        className={`w-full max-w-5xl rounded-2xl border transition-all overflow-hidden flex flex-col ${paperBg} ${paperBorder} ${textColor}`}
      >
        {/* Book Running Head (柱) */}
        <div className="px-6 sm:px-12 py-3 border-b border-amber-900/10 dark:border-emerald-950/40 flex items-center justify-between text-xs tracking-widest font-serif opacity-70">
          <div>『{title}』</div>
          <div className="text-[11px] font-mono tracking-normal text-stone-500">{author} 著</div>
          <div className="hidden sm:block text-[11px] font-mono">文庫判 · 本文組版</div>
        </div>

        {/* Spread Two-Page Container */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 relative min-h-[460px] sm:min-h-[520px]">
          {/* Central Book Gutter & Spine Fold Shadow (ノドの影) */}
          <div className="hidden md:block absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-8 pointer-events-none z-10 bg-gradient-to-r from-black/5 via-black/15 to-black/5 dark:from-black/20 dark:via-black/50 dark:to-black/20 border-x border-amber-950/10 dark:border-black/40" />

          {/* Right Page (Page 1 in Japanese vertical books) */}
          <div className="p-6 sm:p-10 flex flex-col justify-between border-b md:border-b-0 md:border-r border-amber-900/10 dark:border-emerald-950/30 relative">
            <div className="flex-1 flex items-start justify-end overflow-hidden">
              {renderPageLines(rightPageLines, 1)}
            </div>
            {/* Folio (ノンブル) */}
            <div className="pt-4 flex items-center justify-between text-[11px] font-mono opacity-60">
              <span className="hidden sm:inline">第壱章</span>
              <span>- 12 -</span>
            </div>
          </div>

          {/* Left Page (Page 2) */}
          <div className="p-6 sm:p-10 flex flex-col justify-between relative">
            <div className="flex-1 flex items-start justify-end overflow-hidden">
              {renderPageLines(leftPageLines, 2)}
            </div>
            {/* Folio (ノンブル) */}
            <div className="pt-4 flex items-center justify-between text-[11px] font-mono opacity-60">
              <span>- 13 -</span>
              <span className="hidden sm:inline">文庫組版見本</span>
            </div>
          </div>
        </div>

        {/* Book Bottom Margin Footer */}
        <div className="px-6 py-2.5 bg-amber-900/5 dark:bg-black/20 border-t border-amber-900/10 dark:border-emerald-950/40 text-[11px] flex items-center justify-between text-stone-500 font-mono">
          <div className="flex items-center space-x-3">
            <span>文字サイズ: <strong>{fontSizeQ}Q</strong> ({(fontSizeQ * 0.25).toFixed(2)}mm)</span>
            <span>·</span>
            <span>行送り: <strong>{lineFeedH}H</strong> ({(lineFeedH * 0.25).toFixed(2)}mm)</span>
            <span>·</span>
            <span>字詰め: <strong>{charsPerLine}字</strong></span>
          </div>
          <div className="hidden sm:block">JIS X 4051 文庫本フォーマット</div>
        </div>
      </div>
    </div>
  );
};
