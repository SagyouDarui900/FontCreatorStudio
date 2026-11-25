import React from 'react';
import { Check, Maximize2, ShieldCheck } from 'lucide-react';

export interface ExportFormatSectionProps {
  isLight: boolean;
  // The output is always OTF (CFF outlines). The format props stay so the
  // section keeps the same interface as before; only 'otf' is offered.
  format: 'otf';
  setFormat: (format: 'otf') => void;
  sizePreset: 'raw' | 'standard_jp' | 'custom';
  setSizePreset: (preset: 'raw' | 'standard_jp' | 'custom') => void;
  customScale: number;
  setCustomScale: (scale: number) => void;
  effectiveScale: number;
  balanceSideBearings: boolean;
  setBalanceSideBearings: (balance: boolean) => void;
  mergeOverlaps: boolean;
  setMergeOverlaps: (merge: boolean) => void;
}

export const ExportFormatSection: React.FC<ExportFormatSectionProps> = React.memo(({
  isLight,
  format,
  setFormat,
  sizePreset,
  setSizePreset,
  customScale,
  setCustomScale,
  effectiveScale,
  balanceSideBearings,
  setBalanceSideBearings,
  mergeOverlaps,
  setMergeOverlaps,
}) => {
  return (
    <>
      {/* Format Selection: OTF only. opentype.js writes CFF outlines with
          sfnt version OTTO and has no TrueType (glyf) writer, so offering
          TTF would only relabel the same CFF binary. */}
      <div className="space-y-1.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5">
          <span className="font-bold opacity-85">ファイル形式</span>
          <span className="text-[11px] font-normal opacity-70">CFF アウトラインの OpenType 形式で出力します</span>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:gap-2.5">
          <button
            type="button"
            onClick={() => setFormat('otf')}
            className={`p-2.5 rounded-xl border text-left min-h-[48px] cursor-pointer ${
              format === 'otf'
                ? isLight
                  ? 'border-emerald-600 bg-emerald-50/80 text-emerald-950 ring-2 ring-emerald-500/20'
                  : 'border-emerald-500 bg-emerald-950/60 text-emerald-100 ring-2 ring-emerald-500/30'
                : isLight
                ? 'border-stone-200 hover:bg-stone-50 text-stone-700'
                : 'border-[#25362b] hover:bg-[#1c2920] text-emerald-300'
            }`}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="font-bold text-xs sm:text-sm whitespace-nowrap">.OTF (OpenType)</span>
              {format === 'otf' && <Check className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />}
            </div>
            <p className="mt-0.5 text-[10.5px] sm:text-[11px] opacity-75 leading-snug jp-wrap">
              Illustrator・InDesign等のDTPデザイン向け
            </p>
          </button>
        </div>
      </div>

      {/* Size & Em-box Optimization */}
      <div
        className={`p-2.5 sm:p-3 rounded-xl border space-y-2 ${
          isLight ? 'bg-stone-50/90 border-stone-200' : 'bg-[#18241d] border-[#25362b]'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center space-x-1.5 sm:space-x-2 min-w-0">
            <Maximize2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-bold text-xs text-stone-900 dark:text-emerald-200 truncate">
              文字サイズ・出力倍率
            </span>
          </div>
          <span className="text-xs font-mono tabular-nums font-bold text-emerald-700 dark:text-emerald-300 shrink-0">
            {Math.round(effectiveScale * 100)}%
          </span>
        </div>

        <p className="text-[11px] opacity-80 leading-snug sm:leading-relaxed jp-wrap">
          下絵や字面枠どおりに出力する場合は<strong>「原寸 (100%)」</strong>、市販フォント並みの大きさに拡大する場合は「和文拡大 (135%)」をお選びください。
        </p>

        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setSizePreset('raw')}
            className={`py-2 px-1 sm:p-2.5 min-h-[48px] rounded-lg border text-center min-w-0 flex flex-col items-center justify-center cursor-pointer ${
              sizePreset === 'raw'
                ? isLight
                  ? 'border-emerald-600 bg-emerald-100/70 text-emerald-950 font-bold ring-1 ring-emerald-500'
                  : 'border-emerald-500 bg-emerald-900/60 text-emerald-100 font-bold ring-1 ring-emerald-500'
                : isLight
                ? 'border-stone-200 hover:bg-white text-stone-700'
                : 'border-[#283b2e] hover:bg-[#202d24] text-emerald-300'
            }`}
          >
            <div className="text-[11px] sm:text-xs font-bold whitespace-nowrap tabular-nums">原寸 100%</div>
            <div className="text-[9.5px] sm:text-[10px] opacity-75 font-normal mt-0.5 truncate max-w-full">枠通り推奨</div>
          </button>

          <button
            type="button"
            onClick={() => setSizePreset('standard_jp')}
            className={`py-2 px-1 sm:p-2.5 min-h-[48px] rounded-lg border text-center min-w-0 flex flex-col items-center justify-center cursor-pointer ${
              sizePreset === 'standard_jp'
                ? isLight
                  ? 'border-emerald-600 bg-emerald-100/70 text-emerald-950 font-bold ring-1 ring-emerald-500'
                  : 'border-emerald-500 bg-emerald-900/60 text-emerald-100 font-bold ring-1 ring-emerald-500'
                : isLight
                ? 'border-stone-200 hover:bg-white text-stone-700'
                : 'border-[#283b2e] hover:bg-[#202d24] text-emerald-300'
            }`}
          >
            <div className="text-[11px] sm:text-xs font-bold whitespace-nowrap tabular-nums">拡大 135%</div>
            <div className="text-[9.5px] sm:text-[10px] opacity-75 font-normal mt-0.5 truncate max-w-full">動画・大きめ</div>
          </button>

          <button
            type="button"
            onClick={() => setSizePreset('custom')}
            className={`py-2 px-1 sm:p-2.5 min-h-[48px] rounded-lg border text-center min-w-0 flex flex-col items-center justify-center cursor-pointer ${
              sizePreset === 'custom'
                ? isLight
                  ? 'border-emerald-600 bg-emerald-100/70 text-emerald-950 font-bold ring-1 ring-emerald-500'
                  : 'border-emerald-500 bg-emerald-900/60 text-emerald-100 font-bold ring-1 ring-emerald-500'
                : isLight
                ? 'border-stone-200 hover:bg-white text-stone-700'
                : 'border-[#283b2e] hover:bg-[#202d24] text-emerald-300'
            }`}
          >
            <div className="text-[11px] sm:text-xs font-bold whitespace-nowrap">カスタム</div>
            <div className="text-[9.5px] sm:text-[10px] opacity-75 font-normal mt-0.5 tabular-nums whitespace-nowrap">
              {Math.round(customScale * 100)}%
            </div>
          </button>
        </div>

        {sizePreset === 'custom' && (
          <div className="pt-1 flex items-center space-x-2.5">
            <span className="text-[11px] font-mono tabular-nums opacity-70 shrink-0">80%</span>
            <input
              type="range"
              min="0.8"
              max="1.8"
              step="0.05"
              value={customScale}
              onChange={(e) => setCustomScale(parseFloat(e.target.value))}
              className="flex-1 min-h-[32px] accent-emerald-600 cursor-pointer"
            />
            <span className="text-[11px] font-mono tabular-nums opacity-70 shrink-0">180%</span>
          </div>
        )}
      </div>

      {/* Visual Fidelity & Vector Purity */}
      <div
        className={`p-2.5 sm:p-3 rounded-xl border space-y-1.5 ${
          isLight ? 'bg-stone-50/90 border-stone-200' : 'bg-[#18241d] border-[#25362b]'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center space-x-1.5 sm:space-x-2 min-w-0">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-bold text-xs text-stone-900 dark:text-emerald-200 truncate">
              出力オプション・輪郭補正
            </span>
          </div>
          <span className="hidden sm:inline text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 shrink-0">
            ベクターデータ保持
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <label className="flex items-start gap-2.5 p-2 sm:py-1.5 rounded-lg hover:bg-emerald-500/10 cursor-pointer min-h-[44px] sm:min-h-0">
            <input
              type="checkbox"
              checked={balanceSideBearings}
              onChange={(e) => setBalanceSideBearings(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded accent-emerald-600 cursor-pointer shrink-0"
            />
            <span className="text-[11px] leading-snug text-stone-800 dark:text-emerald-200 jp-wrap">
              文字の左右余白を均等にセンタリング補正（左寄り防止）
            </span>
          </label>

          <label className="flex items-start gap-2.5 p-2 sm:py-1.5 rounded-lg hover:bg-emerald-500/10 cursor-pointer min-h-[44px] sm:min-h-0">
            <input
              type="checkbox"
              checked={mergeOverlaps}
              onChange={(e) => setMergeOverlaps(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded accent-emerald-600 cursor-pointer shrink-0"
            />
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-bold leading-snug text-stone-800 dark:text-emerald-200 jp-wrap">
                一筆書き・重なり白抜き防止（交差輪郭を自動結合）
              </span>
              <span className="text-[10px] text-stone-500 dark:text-stone-400 leading-snug mt-0.5 jp-wrap">
                重なったループが白く抜けるのを防ぎ、標準の外輪郭に一体化します
              </span>
            </div>
          </label>
        </div>
      </div>
    </>
  );
});

ExportFormatSection.displayName = 'ExportFormatSection';
