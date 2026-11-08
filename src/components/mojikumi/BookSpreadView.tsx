import React, { useState } from 'react';
import { FormattedLayoutResult } from '../../utils/mojikumiEngine';
import { getVerticalGlyphStyle } from '../../utils/mojikumiVertical';
import { ChevronRight, ChevronLeft, BookOpen } from 'lucide-react';

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
  // Mobile page mode: 'p1' (Page 1) | 'p2' (Page 2) | 'both' (Both pages stacked)
  const [mobilePageView, setMobilePageView] = useState<'p1' | 'p2' | 'both'>('p1');

  // Approximate scale for screen rendering
  const emPx = Math.max(13, Math.round(fontSizeQ * 1.35 * zoom));
  const lineGapPx = Math.max(6, Math.round((lineFeedH - fontSizeQ) * 1.35 * zoom));

  // Split lines across two pages
  const linesPerPage = Math.max(6, Math.min(18, Math.floor(layout.lines.length / 2) || 8));
  const firstPageLines = layout.lines.slice(0, linesPerPage);
  const secondPageLines = layout.lines.slice(linesPerPage, linesPerPage * 2);

  // Background and paper colors (static colors, no heavy transitions)
  const paperBg = isLight ? 'bg-[#fcfaf2]' : 'bg-[#18231a]';
  const paperBorder = isLight ? 'border-amber-200/80 shadow-md' : 'border-emerald-950/80 shadow-md';
  const textColor = isLight ? 'text-[#2b241d]' : 'text-[#e8efe9]';
  const subtleColor = isLight ? 'text-stone-400' : 'text-stone-500';
  const gridBorder = isLight ? 'border-amber-900/15' : 'border-emerald-500/20';

  const renderPageLines = (lines: typeof layout.lines) => {
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
          className="flex flex-row-reverse items-start justify-start h-full select-text overflow-hidden"
          style={{
            gap: `${lineGapPx}px`,
            fontFamily,
            fontFeatureSettings: '"vert" 1, "vrt2" 1',
            contain: 'content',
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
              {line.glyphs.map((g, gIdx) => {
                const vertStyle = getVerticalGlyphStyle(g.char, true);
                return (
                  <span
                    key={gIdx}
                    className={`inline-flex items-center justify-center relative ${
                      g.isHanging
                        ? 'text-amber-600 dark:text-amber-400 font-bold bg-amber-500/15 rounded-xs'
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
                  >
                    {showGrid && (
                      <span
                        className={`absolute inset-0 pointer-events-none border ${gridBorder}`}
                        style={{ width: `${emPx}px`, height: `${emPx}px` }}
                      />
                    )}
                    <span style={vertStyle}>{g.char}</span>
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      );
    }

    // Horizontal Book Layout
    return (
      <div
        className="flex flex-col items-start justify-start h-full select-text overflow-hidden"
        style={{
          gap: `${lineGapPx}px`,
          fontFamily,
          contain: 'content',
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
                    ? 'text-amber-600 dark:text-amber-400 font-bold bg-amber-500/15 rounded-xs'
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

  // Reusable Page Component
  const renderSinglePage = (
    pageLines: typeof layout.lines,
    pageNum: number,
    chapterLabel: string,
    isSecondPage: boolean
  ) => (
    <div className="p-4 sm:p-8 md:p-10 flex flex-col justify-between border-b md:border-b-0 border-amber-900/10 dark:border-emerald-950/30 relative min-h-[380px] sm:min-h-[460px]">
      <div className="flex-1 flex items-start justify-start overflow-hidden">
        {renderPageLines(pageLines)}
      </div>

      {/* Folio (ノンブル) */}
      <div className="pt-3 sm:pt-4 flex items-center justify-between text-[11px] font-mono opacity-60 shrink-0">
        <span className="hidden sm:inline">{chapterLabel}</span>
        <span className="font-bold">- {pageNum} -</span>
        <span className="hidden sm:inline">{isSecondPage ? '文庫組版見本' : '青空文庫'}</span>
      </div>

      {/* Mobile Page Navigation Hint Button */}
      <div className="md:hidden pt-3 border-t border-amber-900/10 dark:border-emerald-950/20 flex justify-end">
        {!isSecondPage && secondPageLines.length > 0 && (
          <button
            type="button"
            onClick={() => setMobilePageView('p2')}
            className="flex items-center space-x-1 text-xs text-emerald-700 dark:text-emerald-400 font-bold hover:underline py-1"
          >
            <span>次の頁（P.13）へ進む</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
        {isSecondPage && (
          <button
            type="button"
            onClick={() => setMobilePageView('p1')}
            className="flex items-center space-x-1 text-xs text-stone-500 dark:text-stone-400 hover:underline py-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>前の頁（P.12）に戻る</span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="w-full flex flex-col items-center justify-start p-2 sm:p-4 select-none">
      {/* Book Spread Frame */}
      <div
        className={`w-full max-w-5xl rounded-2xl border overflow-hidden flex flex-col ${paperBg} ${paperBorder} ${textColor}`}
      >
        {/* Book Running Head (柱) */}
        <div className="px-4 sm:px-12 py-2.5 sm:py-3 border-b border-amber-900/10 dark:border-emerald-950/40 flex items-center justify-between text-xs tracking-widest font-serif opacity-70">
          <div className="font-bold truncate">『{title}』</div>
          <div className="text-[11px] font-mono tracking-normal text-stone-500">{author} 著</div>
          <div className="hidden sm:block text-[11px] font-mono">
            {isVertical ? '文庫判 · 縦組見開き' : '文庫判 · 横組見開き'}
          </div>
        </div>

        {/* Mobile Page Tab Switcher (Visible only on small screens) */}
        <div className="flex md:hidden items-center justify-between px-3 py-1.5 border-b border-amber-900/10 dark:border-emerald-950/30 text-xs shrink-0">
          <div className="flex items-center space-x-1 text-[11px] text-stone-500 font-medium">
            <BookOpen className="w-3.5 h-3.5" />
            <span>頁切替:</span>
          </div>
          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={() => setMobilePageView('p1')}
              className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                mobilePageView === 'p1'
                  ? isLight
                    ? 'bg-amber-200/90 text-amber-950 font-bold shadow-xs'
                    : 'bg-emerald-800 text-white font-bold shadow-xs'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              1頁目 (P.12)
            </button>
            <button
              type="button"
              onClick={() => setMobilePageView('p2')}
              className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                mobilePageView === 'p2'
                  ? isLight
                    ? 'bg-amber-200/90 text-amber-950 font-bold shadow-xs'
                    : 'bg-emerald-800 text-white font-bold shadow-xs'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              2頁目 (P.13)
            </button>
            <button
              type="button"
              onClick={() => setMobilePageView('both')}
              className={`px-2 py-1 rounded-md text-[11px] ${
                mobilePageView === 'both'
                  ? isLight
                    ? 'bg-amber-200/90 text-amber-950 font-bold shadow-xs'
                    : 'bg-emerald-800 text-white font-bold shadow-xs'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              見開き(全)
            </button>
          </div>
        </div>

        {/* Spread Two-Page Container
            - On Desktop (md:grid-cols-2):
                If isVertical: Page 2 (P.13) on Left, Page 1 (P.12) on Right (Right-to-Left vertical book reading)
                If horizontal: Page 1 (P.12) on Left, Page 2 (P.13) on Right
            - On Mobile:
                Natural top-to-bottom reading: Page 1 (P.12) ALWAYS appears first, Page 2 (P.13) second!
        */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 relative min-h-[380px] sm:min-h-[520px]">
          {/* Central Book Gutter & Spine Fold Shadow (ノドの影, Desktop only) */}
          <div className="hidden md:block absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-8 pointer-events-none z-10 bg-gradient-to-r from-black/5 via-black/15 to-black/5 dark:from-black/20 dark:via-black/50 dark:to-black/20 border-x border-amber-950/10 dark:border-black/40" />

          {/* Desktop Left Slot / Mobile Slot */}
          {/* In vertical: Desktop Left Slot is Page 2 (P.13). On mobile, it's hidden if mobilePageView === 'p1'.
              Order on mobile is 2 (so Page 1 is always read first on mobile). */}
          <div
            className={`md:border-r border-amber-900/10 dark:border-emerald-950/30 ${
              isVertical
                ? 'order-2 md:order-1'
                : 'order-1 md:order-1'
            } ${
              isVertical
                ? mobilePageView === 'p1' ? 'hidden md:block' : 'block'
                : mobilePageView === 'p2' ? 'hidden md:block' : 'block'
            }`}
          >
            {isVertical
              ? renderSinglePage(secondPageLines, 13, '第壱章 承前', true)
              : renderSinglePage(firstPageLines, 12, '第壱章', false)}
          </div>

          {/* Desktop Right Slot / Mobile Slot */}
          {/* In vertical: Desktop Right Slot is Page 1 (P.12). On mobile, it's hidden if mobilePageView === 'p2'.
              Order on mobile is 1 (so Page 1 is always read first on mobile). */}
          <div
            className={`${
              isVertical
                ? 'order-1 md:order-2'
                : 'order-2 md:order-2'
            } ${
              isVertical
                ? mobilePageView === 'p2' ? 'hidden md:block' : 'block'
                : mobilePageView === 'p1' ? 'hidden md:block' : 'block'
            }`}
          >
            {isVertical
              ? renderSinglePage(firstPageLines, 12, '第壱章', false)
              : renderSinglePage(secondPageLines, 13, '第壱章 承前', true)}
          </div>
        </div>

        {/* Book Bottom Margin Footer */}
        <div className="px-4 sm:px-6 py-2 bg-amber-900/5 dark:bg-black/20 border-t border-amber-900/10 dark:border-emerald-950/40 text-[11px] flex items-center justify-between text-stone-500 font-mono">
          <div className="flex items-center space-x-2 sm:space-x-3 flex-wrap">
            <span>文字サイズ: <strong>{fontSizeQ}Q</strong></span>
            <span>·</span>
            <span>行送り: <strong>{lineFeedH}H</strong></span>
            <span>·</span>
            <span>字詰め: <strong>{charsPerLine}字</strong></span>
          </div>
          <div className="hidden sm:block">JIS X 4051 文庫本フォーマット</div>
        </div>
      </div>
    </div>
  );
};
