import React from 'react';
import { FormattedLayoutResult } from '../../utils/mojikumiEngine';
import { getVerticalGlyphStyle, getMojikumiBoxAlignClass } from '../../utils/mojikumiVertical';

interface PoetryTanzakuViewProps {
  layout: FormattedLayoutResult;
  title: string;
  author: string;
  isLight: boolean;
  fontFamily: string;
  fontSizeQ: number;
  lineFeedH: number;
  zoom: number;
  isVertical?: boolean;
  showGrid?: boolean;
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
  isVertical = true,
  showGrid = false,
}) => {
  const emPx = Math.max(15, Math.round(fontSizeQ * 1.4 * zoom));
  const lineGapPx = Math.max(0, Math.round((lineFeedH - fontSizeQ) * 1.8 * zoom));
  const lineGapH = Math.max(0, Math.round((lineFeedH - fontSizeQ) * 10) / 10);

  const paperBg = isLight ? 'bg-[#fcfbf7]' : 'bg-[#18201a]';
  const paperBorder = isLight ? 'border-amber-900/20 shadow-xl' : 'border-emerald-950/60 shadow-xl';
  const textColor = isLight ? 'text-[#2a231b]' : 'text-[#f0f4f1]';
  const gridBorder = isLight ? 'border-amber-900/15' : 'border-emerald-500/20';

  return (
    <div className="w-full flex flex-col items-center justify-start p-1 sm:p-6 select-none">
      {/* Traditional Tanzaku Paper Slip */}
      <div
        className={`w-full max-w-3xl min-h-[460px] sm:min-h-[560px] rounded-2xl border-2 p-4 sm:p-10 md:p-12 flex flex-col justify-between relative overflow-hidden ${paperBg} ${paperBorder} ${textColor}`}
      >
        {/* Subtle gold/vermilion decorative top & bottom borders */}
        <div className="absolute top-2.5 sm:top-3 inset-x-6 sm:inset-x-8 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent pointer-events-none" />
        <div className="absolute bottom-2.5 sm:bottom-3 inset-x-6 sm:inset-x-8 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent pointer-events-none" />

        {/* Tanzaku Header Label */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-serif opacity-65 pb-4 border-b border-amber-900/10 dark:border-emerald-950/40 shrink-0">
          <div className="truncate">『{title}』より</div>
          <div className="font-mono text-[11px] shrink-0">
            {isVertical ? '詩歌・短冊組版（縦書き）' : '詩歌・短冊組版（横書き）'}
          </div>
        </div>

        {/* Poetry Center Stage: Safely contained & scrollable so lines never overflow the slip */}
        <div className="flex-1 w-full flex items-center justify-center py-4 sm:py-6 min-h-0">
          {isVertical ? (
            <div
              dir="rtl"
              className="w-full overflow-x-auto overflow-y-auto max-h-[60vh] custom-scrollbar px-2 py-2"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              <div
                dir="ltr"
                className="flex flex-row-reverse items-start justify-start w-max mx-auto select-text"
                style={{
                  gap: `${lineGapPx}px`,
                  fontFamily,
                  fontFeatureSettings: '"vert" 0, "vrt2" 0',
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
                    {line.glyphs.map((g, gIdx) => {
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
                                className={`absolute inset-0 pointer-events-none border ${gridBorder}`}
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
          ) : (
            <div
              className="w-full overflow-x-auto overflow-y-auto max-h-[60vh] custom-scrollbar px-2 py-2"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              <div
                className="flex flex-col items-start justify-start w-max mx-auto select-text"
                style={{
                  gap: `${lineGapPx}px`,
                  fontFamily,
                  fontFeatureSettings: '"vert" 0, "vrt2" 0',
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
                                className={`absolute inset-0 pointer-events-none border ${gridBorder}`}
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
          )}
        </div>

        {/* Author Signature & Traditional Vermilion Seal (落款印) */}
        <div className="pt-4 flex flex-wrap items-center justify-between gap-2 border-t border-amber-900/10 dark:border-emerald-950/40 font-serif shrink-0">
          <div className="flex items-center space-x-3">
            <span className="text-sm font-bold tracking-wider">{author} 詠</span>
            {/* Red Hanko Stamp */}
            <div className="w-8 h-8 rounded-xs border-2 border-red-700 bg-red-600/10 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center text-[10px] font-bold font-serif shadow-xs">
              雅印
            </div>
          </div>

          <div className="text-[11px] font-mono text-stone-400">
            行送り: {lineFeedH}H（行間 {lineGapH}H） · 平均密度: {layout.averageDensityPercent}%
          </div>
        </div>
      </div>
    </div>
  );
};
