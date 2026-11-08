import React, { useState } from 'react';
import { FormattedLayoutResult } from '../../utils/mojikumiEngine';
import { getVerticalGlyphStyle } from '../../utils/mojikumiVertical';
import { BookOpen, Feather, Columns } from 'lucide-react';

interface MagazineLayoutViewProps {
  layout: FormattedLayoutResult;
  title: string;
  author: string;
  headline: string;
  lead: string;
  isLight: boolean;
  fontFamily: string;
  fontSizeQ: number;
  lineFeedH: number;
  isVertical: boolean;
  showGrid: boolean;
  zoom: number;
}

export const MagazineLayoutView: React.FC<MagazineLayoutViewProps> = ({
  layout,
  title,
  author,
  headline,
  lead,
  isLight,
  fontFamily,
  fontSizeQ,
  lineFeedH,
  isVertical,
  showGrid,
  zoom,
}) => {
  const [mobileColView, setMobileColView] = useState<'col1' | 'col2' | 'both'>('col1');

  const paperBg = isLight ? 'bg-white' : 'bg-[#141d16]';
  const paperBorder = isLight ? 'border-stone-200 shadow-md' : 'border-[#25382b] shadow-md';
  const textColor = isLight ? 'text-stone-900' : 'text-stone-100';
  const accentBorder = isLight ? 'border-emerald-600' : 'border-emerald-500';

  const emPx = Math.max(13, Math.round(fontSizeQ * 1.35 * zoom));
  const lineGapPx = Math.max(6, Math.round((lineFeedH - fontSizeQ) * 1.35 * zoom));

  // Split lines into two columns for magazine spread
  const half = Math.ceil(layout.lines.length / 2);
  const firstHalf = layout.lines.slice(0, half);
  const secondHalf = layout.lines.slice(half);

  // Column 1 is always the beginning of the article
  // Column 2 is always the continuation
  const colFirst = {
    lines: firstHalf,
    title: isVertical ? '第 1 段組（右段）' : '第 1 段組（左段）',
  };
  const colSecond = {
    lines: secondHalf,
    title: isVertical ? '第 2 段組（左段）' : '第 2 段組（右段）',
  };

  const renderColumn = (lines: typeof layout.lines) => {
    if (isVertical) {
      return (
        <div
          className="flex flex-row-reverse items-start justify-start select-text min-h-[280px] sm:min-h-[320px] overflow-x-auto custom-scrollbar p-1"
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
                        className="absolute inset-0 pointer-events-none border border-stone-200/50 dark:border-stone-800/60"
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

    return (
      <div
        className="flex flex-col items-start justify-start select-text min-h-[280px] sm:min-h-[320px] overflow-hidden p-1"
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
                    className="absolute inset-0 pointer-events-none border border-stone-200/50 dark:border-stone-800/60"
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
    <div className="w-full flex flex-col items-center justify-start p-2 sm:p-4 select-none">
      <div
        className={`w-full max-w-5xl rounded-2xl border overflow-hidden p-4 sm:p-8 md:p-12 ${paperBg} ${paperBorder} ${textColor}`}
      >
        {/* Magazine Masthead & Kicker */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-stone-200 dark:border-stone-800 text-xs font-mono">
          <div className="flex items-center space-x-2 text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-widest">
            <BookOpen className="w-4 h-4" />
            <span>文芸エディトリアル組版倶楽部</span>
          </div>
          <div className="text-stone-400">青空文庫名作撰 · 第12号</div>
        </div>

        {/* Big Editorial Headline */}
        <div className="pt-4 sm:pt-6 pb-3 space-y-2">
          <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">
            FEATURE ESSAY / 作品鑑賞
          </div>
          <h1
            className="text-xl sm:text-3xl md:text-4xl font-bold tracking-tight leading-snug"
            style={{ fontFamily }}
          >
            {headline || title}
          </h1>
          <div className="flex items-center space-x-2 sm:space-x-3 text-xs text-stone-500 font-serif pt-1 flex-wrap">
            <span className="font-bold">{author}</span>
            <span>·</span>
            <span>出典：『{title}』</span>
            <span>·</span>
            <span className="text-[11px] font-mono text-stone-400">
              {isVertical ? 'JIS X 4051 雑誌縦組段組' : 'JIS X 4051 雑誌横組段組'}
            </span>
          </div>
        </div>

        {/* Lead In / Intro Paragraph with drop-border */}
        <div
          className={`my-3 sm:my-4 p-3.5 sm:p-5 rounded-xl border-l-4 ${accentBorder} bg-stone-50 dark:bg-stone-900/60 text-xs sm:text-sm md:text-base leading-relaxed font-serif ${
            isLight ? 'text-stone-800' : 'text-stone-200'
          }`}
          style={{ fontFamily }}
        >
          <div className="flex items-start space-x-2">
            <Feather className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <p className="italic">{lead}</p>
          </div>
        </div>

        {/* Mobile Column Switcher (Visible only on phone screens) */}
        <div className="flex md:hidden items-center justify-between py-2 border-b border-stone-200 dark:border-stone-800 text-xs mb-3">
          <div className="flex items-center space-x-1 text-[11px] text-stone-500 font-medium">
            <Columns className="w-3.5 h-3.5" />
            <span>段組切替:</span>
          </div>
          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={() => setMobileColView('col1')}
              className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                mobileColView === 'col1'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              第1段組
            </button>
            <button
              type="button"
              onClick={() => setMobileColView('col2')}
              className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                mobileColView === 'col2'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              第2段組
            </button>
            <button
              type="button"
              onClick={() => setMobileColView('both')}
              className={`px-2 py-1 rounded-md text-[11px] ${
                mobileColView === 'both'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              全段組
            </button>
          </div>
        </div>

        {/* 2-Column Body Layout
            - On Desktop (md:grid-cols-2):
                If isVertical: colSecond on Left (md:order-1), colFirst on Right (md:order-2)
                If horizontal: colFirst on Left (md:order-1), colSecond on Right (md:order-2)
            - On Mobile:
                colFirst is ALWAYS order-1 (at top), colSecond is ALWAYS order-2 (at bottom)!
        */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 pt-2 sm:pt-4 relative">
          {/* Middle column divider line (Desktop only) */}
          <div className="hidden md:block absolute top-4 bottom-4 left-1/2 -translate-x-1/2 w-px bg-stone-200 dark:bg-stone-800" />

          {/* Column A (Desktop Left Slot) */}
          <div
            className={`overflow-hidden ${
              isVertical ? 'order-2 md:order-1' : 'order-1 md:order-1'
            } ${
              isVertical
                ? mobileColView === 'col1' ? 'hidden md:block' : 'block'
                : mobileColView === 'col2' ? 'hidden md:block' : 'block'
            }`}
          >
            <div className="text-[11px] font-mono text-stone-400 mb-2 border-b pb-1 flex justify-between">
              <span>{isVertical ? colSecond.title : colFirst.title}</span>
              <span>{isVertical ? colSecond.lines.length : colFirst.lines.length} 行</span>
            </div>
            {renderColumn(isVertical ? colSecond.lines : colFirst.lines)}
          </div>

          {/* Column B (Desktop Right Slot) */}
          <div
            className={`overflow-hidden ${
              isVertical ? 'order-1 md:order-2' : 'order-2 md:order-2'
            } ${
              isVertical
                ? mobileColView === 'col2' ? 'hidden md:block' : 'block'
                : mobileColView === 'col1' ? 'hidden md:block' : 'block'
            }`}
          >
            <div className="text-[11px] font-mono text-stone-400 mb-2 border-b pb-1 flex justify-between">
              <span>{isVertical ? colFirst.title : colSecond.title}</span>
              <span>{isVertical ? colFirst.lines.length : colSecond.lines.length} 行</span>
            </div>
            {renderColumn(isVertical ? colFirst.lines : colSecond.lines)}
          </div>
        </div>
      </div>
    </div>
  );
};
