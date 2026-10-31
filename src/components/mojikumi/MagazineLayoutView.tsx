import React from 'react';
import { FormattedLayoutResult } from '../../utils/mojikumiEngine';
import { getVerticalGlyphStyle } from '../../utils/mojikumiVertical';
import { BookOpen, Feather } from 'lucide-react';

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
  const paperBg = isLight ? 'bg-white' : 'bg-[#141d16]';
  const paperBorder = isLight ? 'border-stone-200 shadow-lg' : 'border-[#25382b] shadow-lg';
  const textColor = isLight ? 'text-stone-900' : 'text-stone-100';
  const accentBorder = isLight ? 'border-emerald-600' : 'border-emerald-500';

  const emPx = Math.max(13, Math.round(fontSizeQ * 1.35 * zoom));
  const lineGapPx = Math.max(6, Math.round((lineFeedH - fontSizeQ) * 1.35 * zoom));

  // Split lines into two columns for magazine spread
  const half = Math.ceil(layout.lines.length / 2);
  const firstHalf = layout.lines.slice(0, half);
  const secondHalf = layout.lines.slice(half);

  // In vertical Japanese reading (右開き), Section 1 is on the Right, Section 2 is on the Left.
  // In horizontal reading (左開き), Section 1 is on the Left, Section 2 is on the Right.
  const col1 = isVertical ? secondHalf : firstHalf;
  const col2 = isVertical ? firstHalf : secondHalf;

  const renderColumn = (lines: typeof layout.lines) => {
    if (isVertical) {
      return (
        <div
          className="flex flex-row-reverse items-start justify-start select-text min-h-[320px] overflow-x-auto custom-scrollbar p-1"
          style={{
            gap: `${lineGapPx}px`,
            fontFamily,
            fontFeatureSettings: '"vert" 1, "vrt2" 1',
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
        className="flex flex-col space-y-2 select-text"
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
    <div className="w-full flex flex-col items-center justify-center p-2 sm:p-6 select-none">
      <div
        className={`w-full max-w-5xl rounded-2xl border transition-all overflow-hidden p-6 sm:p-12 ${paperBg} ${paperBorder} ${textColor}`}
      >
        {/* Magazine Masthead & Kicker */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-200 dark:border-stone-800 text-xs font-mono">
          <div className="flex items-center space-x-2 text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-widest">
            <BookOpen className="w-4 h-4" />
            <span>文芸エディトリアル組版倶楽部</span>
          </div>
          <div className="text-stone-400">青空文庫名作撰 · 第12号</div>
        </div>

        {/* Big Editorial Headline */}
        <div className="pt-6 pb-4 space-y-2">
          <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">
            FEATURE ESSAY / 作品鑑賞
          </div>
          <h1
            className="text-2xl sm:text-4xl font-bold tracking-tight leading-snug"
            style={{ fontFamily }}
          >
            {headline || title}
          </h1>
          <div className="flex items-center space-x-3 text-xs text-stone-500 font-serif pt-1">
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
          className={`my-4 p-4 sm:p-5 rounded-xl border-l-4 ${accentBorder} bg-stone-50 dark:bg-stone-900/60 text-sm sm:text-base leading-relaxed font-serif ${
            isLight ? 'text-stone-800' : 'text-stone-200'
          }`}
          style={{ fontFamily }}
        >
          <div className="flex items-start space-x-2">
            <Feather className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-1" />
            <p className="italic">{lead}</p>
          </div>
        </div>

        {/* 2-Column Body Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 relative">
          {/* Middle column divider line */}
          <div className="hidden md:block absolute top-4 bottom-4 left-1/2 -translate-x-1/2 w-px bg-stone-200 dark:bg-stone-800" />

          {/* Left / Upper Column */}
          <div className="overflow-hidden">
            <div className="text-[11px] font-mono text-stone-400 mb-2 border-b pb-1 flex justify-between">
              <span>{isVertical ? '第 2 段組（左段）' : '第 1 段組（左段）'}</span>
              <span>{col1.length} 行</span>
            </div>
            {renderColumn(col1)}
          </div>

          {/* Right / Lower Column */}
          <div className="overflow-hidden">
            <div className="text-[11px] font-mono text-stone-400 mb-2 border-b pb-1 flex justify-between">
              <span>{isVertical ? '第 1 段組（右段）' : '第 2 段組（右段）'}</span>
              <span>{col2.length} 行</span>
            </div>
            {renderColumn(col2)}
          </div>
        </div>
      </div>
    </div>
  );
};
