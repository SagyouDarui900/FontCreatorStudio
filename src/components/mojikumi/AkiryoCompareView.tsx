import React, { useState } from 'react';
import { FormattedLayoutResult } from '../../utils/mojikumiEngine';
import { getVerticalGlyphStyle } from '../../utils/mojikumiVertical';

interface AkiryoCompareViewProps {
  betaLayout: FormattedLayoutResult;
  tsumeLayout: FormattedLayoutResult;
  akeLayout: FormattedLayoutResult;
  charsPerLine: number;
  fontSizeQ: number;
  lineFeedH: number;
  showGrid: boolean;
  isVertical: boolean;
  isLight: boolean;
  fontFamily: string;
  zoom: number;
}

export const AkiryoCompareView: React.FC<AkiryoCompareViewProps> = ({
  betaLayout,
  tsumeLayout,
  akeLayout,
  charsPerLine,
  fontSizeQ,
  lineFeedH,
  showGrid,
  isVertical,
  isLight,
  fontFamily,
  zoom,
}) => {
  const [mobileTab, setMobileTab] = useState<'all' | 'beta' | 'tsume' | 'ake'>('all');

  const emPx = Math.max(13, Math.round(fontSizeQ * 1.35 * zoom));
  const lineGapPx = Math.max(6, Math.round((lineFeedH - fontSizeQ) * 1.35 * zoom));

  const renderLines = (layout: FormattedLayoutResult) => {
    if (isVertical) {
      return (
        <div
          className="flex flex-row-reverse items-start justify-start h-full select-text p-2 overflow-x-auto custom-scrollbar"
          style={{
            gap: `${lineGapPx}px`,
            fontFamily,
            fontFeatureSettings: '"vert" 1, "vrt2" 1',
          }}
        >
          {layout.lines.map((line, lIdx) => (
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
                    title={`「${g.char}」 前アキ:${Math.round(g.spacingBeforeEm * 100)}% 後アキ:${Math.round(g.spacingAfterEm * 100)}%`}
                  >
                    {showGrid && (
                      <span
                        className="absolute inset-0 pointer-events-none border border-stone-200/60 dark:border-stone-800/60"
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
        className="flex flex-col h-full select-text p-2"
        style={{
          gap: `${lineGapPx}px`,
          fontFamily,
        }}
      >
        {layout.lines.map((line, lIdx) => (
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
                    className="absolute inset-0 pointer-events-none border border-stone-200/60 dark:border-stone-800/60"
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
          className={`flex-1 py-1 rounded-md font-bold transition-all ${
            mobileTab === 'all'
              ? 'bg-white dark:bg-stone-800 text-emerald-800 dark:text-emerald-300 shadow-xs'
              : 'text-stone-500'
          }`}
        >
          全様式
        </button>
        <button
          onClick={() => setMobileTab('beta')}
          className={`flex-1 py-1 rounded-md font-bold transition-all ${
            mobileTab === 'beta'
              ? 'bg-white dark:bg-stone-800 text-emerald-800 dark:text-emerald-300 shadow-xs'
              : 'text-stone-500'
          }`}
        >
          ベタ組み
        </button>
        <button
          onClick={() => setMobileTab('tsume')}
          className={`flex-1 py-1 rounded-md font-bold transition-all ${
            mobileTab === 'tsume'
              ? 'bg-white dark:bg-stone-800 text-blue-800 dark:text-blue-300 shadow-xs'
              : 'text-stone-500'
          }`}
        >
          ツメ組み
        </button>
        <button
          onClick={() => setMobileTab('ake')}
          className={`flex-1 py-1 rounded-md font-bold transition-all ${
            mobileTab === 'ake'
              ? 'bg-white dark:bg-stone-800 text-purple-800 dark:text-purple-300 shadow-xs'
              : 'text-stone-500'
          }`}
        >
          アケ組み
        </button>
      </div>

      {/* 3 Columns Grid */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3 gap-4 overflow-y-auto custom-scrollbar">
        {columns.map((col) => {
          const isVisible = mobileTab === 'all' || mobileTab === col.id;
          if (!isVisible) return null;

          return (
            <div
              key={col.id}
              className={`flex flex-col rounded-2xl border overflow-hidden transition-all shadow-sm ${col.borderActive} ${
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
                {renderLines(col.layout)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
