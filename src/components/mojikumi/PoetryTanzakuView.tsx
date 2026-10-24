import React from 'react';
import { FormattedLayoutResult } from '../../utils/mojikumiEngine';

interface PoetryTanzakuViewProps {
  layout: FormattedLayoutResult;
  title: string;
  author: string;
  isLight: boolean;
  fontFamily: string;
  fontSizeQ: number;
  lineFeedH: number;
  zoom: number;
}

export const PoetryTanzakuView: React.FC<PoetryTanzakuViewProps> = ({
  layout,
  title,
  author,
  isLight,
  fontFamily,
  fontSizeQ,
  lineFeedH,
  zoom,
}) => {
  const emPx = Math.max(16, Math.round(fontSizeQ * 1.5 * zoom));
  const lineGapPx = Math.max(16, Math.round((lineFeedH - fontSizeQ) * 2.2 * zoom));

  const paperBg = isLight ? 'bg-[#fcfbf7]' : 'bg-[#18201a]';
  const paperBorder = isLight ? 'border-amber-900/20 shadow-xl' : 'border-emerald-950/60 shadow-xl';
  const textColor = isLight ? 'text-[#2a231b]' : 'text-[#f0f4f1]';

  return (
    <div className="w-full flex flex-col items-center justify-center p-4 sm:p-8 select-none overflow-x-auto custom-scrollbar">
      {/* Traditional Tanzaku Paper Slip */}
      <div
        className={`w-full max-w-2xl min-h-[580px] rounded-2xl border-2 transition-all p-8 sm:p-14 flex flex-col justify-between relative ${paperBg} ${paperBorder} ${textColor}`}
      >
        {/* Subtle gold/vermilion decorative top & bottom borders */}
        <div className="absolute top-3 inset-x-8 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
        <div className="absolute bottom-3 inset-x-8 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />

        {/* Tanzaku Header Label */}
        <div className="flex items-center justify-between text-xs font-serif opacity-60 pb-6 border-b border-amber-900/10 dark:border-emerald-950/40">
          <div>『{title}』より</div>
          <div className="font-mono text-[11px]">詩歌・短冊組版</div>
        </div>

        {/* Vertical Poetry Center Stage */}
        <div className="flex-1 flex items-center justify-center py-8">
          <div
            className="flex flex-row-reverse items-start justify-center select-text"
            style={{
              gap: `${lineGapPx}px`,
              fontFamily,
              writingMode: 'vertical-rl',
              textOrientation: 'mixed',
            }}
          >
            {layout.lines.map((line, lIdx) => (
              <div
                key={lIdx}
                className="flex flex-col items-center relative shrink-0 tracking-widest leading-loose"
                style={{ minWidth: `${emPx}px` }}
              >
                {line.glyphs.map((g, gIdx) => (
                  <span
                    key={gIdx}
                    className="inline-flex items-center justify-center relative my-0.5"
                    style={{
                      width: `${emPx}px`,
                      minHeight: `${emPx}px`,
                      fontSize: `${emPx}px`,
                      lineHeight: 1.2,
                    }}
                  >
                    {g.char}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Author Signature & Traditional Vermilion Seal (落款印) */}
        <div className="pt-6 flex items-center justify-between border-t border-amber-900/10 dark:border-emerald-950/40 font-serif">
          <div className="flex items-center space-x-3">
            <span className="text-sm font-bold tracking-wider">{author} 詠</span>
            {/* Red Hanko Stamp */}
            <div className="w-8 h-8 rounded border-2 border-red-700 bg-red-600/10 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center text-[10px] font-bold font-serif shadow-xs">
              雅印
            </div>
          </div>

          <div className="text-[11px] font-mono text-stone-400">
            行送り: {lineFeedH}H · 余白比率: 68%
          </div>
        </div>
      </div>
    </div>
  );
};
