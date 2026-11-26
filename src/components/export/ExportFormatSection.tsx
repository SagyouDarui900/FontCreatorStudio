import React from 'react';
import { Check, Maximize2, ShieldCheck } from 'lucide-react';
import { getThemeClasses, ThemeClasses } from '../../utils/theme';
import { ModalSection } from '../modals/ModalSection';
import { SliderRow } from '../modals/SliderRow';

export interface ExportFormatSectionProps {
  isLight: boolean;
  themeClasses?: ThemeClasses;
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
  themeClasses: propThemeClasses,
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
  const themeClasses = propThemeClasses || getThemeClasses(isLight ? 'light' : 'dark');
  const selectedOption = `${themeClasses.accentBorder} ${themeClasses.accentBadge} font-bold`;
  const unselectedOption = `${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.activeToolHover}`;

  return (
    <div className="space-y-3">
      {/* Format Selection: OTF only. opentype.js writes CFF outlines with
          sfnt version OTTO and has no TrueType (glyf) writer, so offering
          TTF would only relabel the same CFF binary. */}
      <ModalSection
        title="ファイル形式"
        themeClasses={themeClasses}
        badge={
          <span className={`text-[11px] font-normal ${themeClasses.textMuted}`}>
            CFF アウトラインの OpenType 形式で出力します
          </span>
        }
      >
        <button
          type="button"
          onClick={() => setFormat('otf')}
          className={`p-2.5 rounded-xl border text-left min-h-[48px] w-full cursor-pointer ${
            format === 'otf' ? selectedOption : unselectedOption
          }`}
        >
          <div className="flex items-center justify-between gap-1">
            <span className="font-bold text-xs sm:text-sm whitespace-nowrap">.OTF (OpenType)</span>
            {format === 'otf' && <Check className={`w-4 h-4 shrink-0 ${themeClasses.accentText}`} />}
          </div>
          <p className="mt-0.5 text-[10.5px] sm:text-[11px] opacity-75 leading-snug jp-wrap">
            Illustrator・InDesign等のDTPデザイン向け
          </p>
        </button>
      </ModalSection>

      {/* Size & Em-box Optimization */}
      <ModalSection
        title="文字サイズ・出力倍率"
        icon={<Maximize2 className={`w-3.5 h-3.5 ${themeClasses.accentText}`} />}
        themeClasses={themeClasses}
        badge={
          <span className={`text-xs font-mono tabular-nums font-bold shrink-0 ${themeClasses.accentText}`}>
            {Math.round(effectiveScale * 100)}%
          </span>
        }
      >
        <div className="space-y-2">
          <p className="text-[11px] opacity-80 leading-snug sm:leading-relaxed jp-wrap">
            下絵や字面枠どおりに出力する場合は<strong>「原寸 (100%)」</strong>、市販フォント並みの大きさに拡大する場合は「和文拡大 (135%)」をお選びください。
          </p>

          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setSizePreset('raw')}
              className={`py-2 px-1 sm:p-2.5 min-h-[48px] rounded-lg border text-center min-w-0 flex flex-col items-center justify-center cursor-pointer ${
                sizePreset === 'raw' ? selectedOption : unselectedOption
              }`}
            >
              <div className="text-[11px] sm:text-xs font-bold whitespace-nowrap tabular-nums">原寸 100%</div>
              <div className="text-[9.5px] sm:text-[10px] opacity-75 font-normal mt-0.5 truncate max-w-full">枠通り推奨</div>
            </button>

            <button
              type="button"
              onClick={() => setSizePreset('standard_jp')}
              className={`py-2 px-1 sm:p-2.5 min-h-[48px] rounded-lg border text-center min-w-0 flex flex-col items-center justify-center cursor-pointer ${
                sizePreset === 'standard_jp' ? selectedOption : unselectedOption
              }`}
            >
              <div className="text-[11px] sm:text-xs font-bold whitespace-nowrap tabular-nums">拡大 135%</div>
              <div className="text-[9.5px] sm:text-[10px] opacity-75 font-normal mt-0.5 truncate max-w-full">動画・大きめ</div>
            </button>

            <button
              type="button"
              onClick={() => setSizePreset('custom')}
              className={`py-2 px-1 sm:p-2.5 min-h-[48px] rounded-lg border text-center min-w-0 flex flex-col items-center justify-center cursor-pointer ${
                sizePreset === 'custom' ? selectedOption : unselectedOption
              }`}
            >
              <div className="text-[11px] sm:text-xs font-bold whitespace-nowrap">カスタム</div>
              <div className="text-[9.5px] sm:text-[10px] opacity-75 font-normal mt-0.5 tabular-nums whitespace-nowrap">
                {Math.round(customScale * 100)}%
              </div>
            </button>
          </div>

          {sizePreset === 'custom' && (
            <SliderRow
              label="カスタム倍率"
              value={Math.round(customScale * 100)}
              min={80}
              max={180}
              step={5}
              unit="%"
              onChange={(v) => setCustomScale(v / 100)}
              hint="80% 〜 180% の範囲で指定します"
              themeClasses={themeClasses}
            />
          )}
        </div>
      </ModalSection>

      {/* Visual Fidelity & Vector Purity */}
      <ModalSection
        title="出力オプション・輪郭補正"
        icon={<ShieldCheck className={`w-3.5 h-3.5 ${themeClasses.accentText}`} />}
        themeClasses={themeClasses}
        badge={
          <span className={`hidden sm:inline text-[10px] font-semibold shrink-0 ${themeClasses.accentText}`}>
            ベクターデータ保持
          </span>
        }
      >
        <div className="flex flex-col gap-1">
          <label className={`flex items-start gap-2.5 p-2 sm:py-1.5 rounded-lg cursor-pointer min-h-[44px] sm:min-h-0 ${themeClasses.activeToolHover}`}>
            <input
              type="checkbox"
              checked={balanceSideBearings}
              onChange={(e) => setBalanceSideBearings(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded accent-emerald-600 cursor-pointer shrink-0"
            />
            <span className={`text-[11px] leading-snug jp-wrap ${themeClasses.textPrimary}`}>
              文字の左右余白を均等にセンタリング補正（左寄り防止）
            </span>
          </label>

          <label className={`flex items-start gap-2.5 p-2 sm:py-1.5 rounded-lg cursor-pointer min-h-[44px] sm:min-h-0 ${themeClasses.activeToolHover}`}>
            <input
              type="checkbox"
              checked={mergeOverlaps}
              onChange={(e) => setMergeOverlaps(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded accent-emerald-600 cursor-pointer shrink-0"
            />
            <div className="flex flex-col min-w-0">
              <span className={`text-[11px] font-bold leading-snug jp-wrap ${themeClasses.textPrimary}`}>
                一筆書き・重なり白抜き防止（交差輪郭を自動結合）
              </span>
              <span className={`text-[10px] leading-snug mt-0.5 jp-wrap ${themeClasses.textMuted}`}>
                重なったループが白く抜けるのを防ぎ、標準の外輪郭に一体化します
              </span>
            </div>
          </label>
        </div>
      </ModalSection>
    </div>
  );
});

ExportFormatSection.displayName = 'ExportFormatSection';
