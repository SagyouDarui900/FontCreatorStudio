import React from 'react';
import { Eye, Info, Layers, RotateCcw, Sliders } from 'lucide-react';
import { ModalSection } from '../modals/ModalSection';
import { KANA_PAIRS } from '../../data/unicodeTables';
import { SmallKanaOptions } from '../../utils/path';
import { ThemeClasses } from '../../utils/theme';
import { KanaScope, SmallKanaSourceItem } from './types';

interface SmallKanaSynthesisPanelProps {
  isLight: boolean;
  themeClasses: ThemeClasses;
  smallScope: KanaScope;
  onChangeSmallScope: (scope: KanaScope) => void;
  smallOverwrite: boolean;
  onChangeSmallOverwrite: (overwrite: boolean) => void;
  smallScale: number;
  onChangeSmallScale: (scale: number) => void;
  smallWeightBoost: number;
  onChangeSmallWeightBoost: (weight: number) => void;
  smallPlacement: SmallKanaOptions['placement'];
  onChangeSmallPlacement: (placement: SmallKanaOptions['placement']) => void;
  smallOffsetX: number;
  onChangeSmallOffsetX: (val: number) => void;
  smallOffsetY: number;
  onChangeSmallOffsetY: (val: number) => void;
  onResetOffsets: () => void;
  availableSmallSources: SmallKanaSourceItem[];
  smallPreviewChar: string;
  onSelectPreviewChar: (char: string) => void;
  smallKanaPreviewPaths: { basePath: string; smallPath: string };
  unitsPerEm?: number;
}

const SCOPE_OPTIONS: { id: KanaScope; label: string }[] = [
  { id: 'all', label: 'ひらがな＋カタカナ' },
  { id: 'hiragana', label: 'ひらがな' },
  { id: 'katakana', label: 'カタカナ' },
];

const PLACEMENT_OPTIONS: { id: NonNullable<SmallKanaOptions['placement']>; name: string }[] = [
  { id: 'bottom-left', name: '左下 (標準)' },
  { id: 'center', name: '中央' },
  { id: 'bottom-center', name: '下中央' },
  { id: 'baseline', name: 'ベースライン' },
];

// Larger slider thumb below the lg breakpoint, so the thumb is easier to
// grab on touch screens. The trailing ! is needed because the global
// range-thumb rules in index.css have higher specificity.
const MOBILE_THUMB_CLASSES =
  'max-lg:[&::-webkit-slider-thumb]:h-6! max-lg:[&::-webkit-slider-thumb]:w-6! max-lg:[&::-webkit-slider-thumb]:-mt-2! max-lg:[&::-moz-range-thumb]:h-6! max-lg:[&::-moz-range-thumb]:w-6!';

export const SmallKanaSynthesisPanel: React.FC<SmallKanaSynthesisPanelProps> = ({
  isLight,
  themeClasses,
  smallScope,
  onChangeSmallScope,
  smallOverwrite,
  onChangeSmallOverwrite,
  smallScale,
  onChangeSmallScale,
  smallWeightBoost,
  onChangeSmallWeightBoost,
  smallPlacement,
  onChangeSmallPlacement,
  smallOffsetX,
  onChangeSmallOffsetX,
  smallOffsetY,
  onChangeSmallOffsetY,
  onResetOffsets,
  availableSmallSources,
  smallPreviewChar,
  onSelectPreviewChar,
  smallKanaPreviewPaths,
  unitsPerEm = 1000,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4">
      {/* Left Controls */}
      <div className="lg:col-span-7 flex flex-col gap-2.5 order-last lg:order-first">
        {/* Scope & Overwrite Card */}
        <ModalSection
          title="対象範囲"
          icon={<Layers className={`w-3.5 h-3.5 ${themeClasses.accentText}`} />}
          themeClasses={themeClasses}
        >
          <div className="flex flex-col gap-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
            <div className="flex items-center gap-1 overflow-x-auto max-w-full pb-0.5 sm:pb-0">
              {SCOPE_OPTIONS.map((option) => (
                <button
                  type="button"
                  key={option.id}
                  onClick={() => onChangeSmallScope(option.id)}
                  className={`px-2.5 py-1.5 sm:py-1 text-[11px] rounded font-bold transition-colors whitespace-nowrap cursor-pointer ${
                    smallScope === option.id
                      ? themeClasses.accentBtn
                      : `${themeClasses.cardBg} border ${themeClasses.border} ${themeClasses.textMuted} ${themeClasses.activeToolHover}`
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <label className={`flex items-center justify-between text-xs cursor-pointer pt-2 border-t ${themeClasses.border}`}>
            <span className={themeClasses.textMuted}>作成済みの小書き文字を上書き</span>
            <input
              type="checkbox"
              checked={smallOverwrite}
              onChange={(e) => onChangeSmallOverwrite(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 accent-emerald-600 focus:ring-emerald-500"
            />
          </label>
          </div>
        </ModalSection>

        {/* Scale & Placement Options */}
        <ModalSection
          title="スケール・配置・太さ補正"
          icon={<Sliders className={`w-3.5 h-3.5 ${themeClasses.accentText}`} />}
          themeClasses={themeClasses}
        >
          <div className="flex flex-col gap-2.5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs">
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className={`${themeClasses.textMuted} font-bold`}>縮小倍率:</span>
                <span className={`min-w-[64px] px-2 py-0.5 rounded-md border text-center font-mono tabular-nums text-[11px] font-bold ${themeClasses.accentBadge}`}>
                  {Math.round(smallScale * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.60"
                max="0.85"
                step="0.02"
                value={smallScale}
                onChange={(e) => onChangeSmallScale(Number(e.target.value))}
                className={`w-full h-2 sm:h-1.5 touch-pan-x accent-emerald-600 bg-black/10 dark:bg-white/10 rounded-lg cursor-pointer ${MOBILE_THUMB_CLASSES}`}
              />
              <div className={`flex justify-between text-[9px] mt-0.5 ${themeClasses.textMuted}`}>
                <span>60% (小さめ)</span>
                <span>72% (標準)</span>
                <span>85% (大きめ)</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className={`${themeClasses.textMuted} font-bold`}>太さ補正:</span>
                <span className={`min-w-[64px] px-2 py-0.5 rounded-md border text-center font-mono tabular-nums text-[11px] font-bold ${themeClasses.accentBadge}`}>
                  +{smallWeightBoost}U
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="12"
                step="1"
                value={smallWeightBoost}
                onChange={(e) => onChangeSmallWeightBoost(Number(e.target.value))}
                className={`w-full h-2 sm:h-1.5 touch-pan-x accent-emerald-600 bg-black/10 dark:bg-white/10 rounded-lg cursor-pointer ${MOBILE_THUMB_CLASSES}`}
              />
              <div className={`flex justify-between text-[9px] mt-0.5 ${themeClasses.textMuted}`}>
                <span>0U</span>
                <span>+4U (標準)</span>
                <span>+12U</span>
              </div>
            </div>
          </div>

          {/* Placement Mode */}
          <div className="text-xs">
            <label className={`block text-[11px] font-bold mb-1 ${themeClasses.textMuted}`}>
              配置位置
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-1">
              {PLACEMENT_OPTIONS.map((pl) => (
                <button
                  type="button"
                  key={pl.id}
                  onClick={() => onChangeSmallPlacement(pl.id)}
                  className={`p-2 sm:p-1.5 text-[11px] sm:text-[10px] rounded border font-medium text-center transition-colors cursor-pointer ${
                    smallPlacement === pl.id
                      ? `${themeClasses.accentBadge} font-bold`
                      : `${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.activeToolHover}`
                  }`}
                >
                  {pl.name}
                </button>
              ))}
            </div>
          </div>

          {/* Position Fine Tuning */}
          <div className={`grid grid-cols-1 lg:grid-cols-2 gap-3 pt-2 border-t text-xs ${themeClasses.border}`}>
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className={themeClasses.textMuted}>左右オフセット (X):</span>
                <span className={`min-w-[64px] px-2 py-0.5 rounded-md border text-center font-mono tabular-nums text-[11px] font-bold ${themeClasses.accentBadge}`}>
                  {smallOffsetX > 0 ? `+${smallOffsetX}` : smallOffsetX}U
                </span>
              </div>
              <input
                type="range"
                min="-150"
                max="150"
                step="5"
                value={smallOffsetX}
                onChange={(e) => onChangeSmallOffsetX(Number(e.target.value))}
                className={`w-full h-2 sm:h-1.5 touch-pan-x accent-emerald-600 bg-black/10 dark:bg-white/10 rounded-lg cursor-pointer ${MOBILE_THUMB_CLASSES}`}
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className={themeClasses.textMuted}>上下オフセット (Y):</span>
                <span className={`min-w-[64px] px-2 py-0.5 rounded-md border text-center font-mono tabular-nums text-[11px] font-bold ${themeClasses.accentBadge}`}>
                  {smallOffsetY > 0 ? `+${smallOffsetY}` : smallOffsetY}U
                </span>
              </div>
              <input
                type="range"
                min="-150"
                max="150"
                step="5"
                value={smallOffsetY}
                onChange={(e) => onChangeSmallOffsetY(Number(e.target.value))}
                className={`w-full h-2 sm:h-1.5 touch-pan-x accent-emerald-600 bg-black/10 dark:bg-white/10 rounded-lg cursor-pointer ${MOBILE_THUMB_CLASSES}`}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={onResetOffsets}
              className={`min-h-[44px] px-3 py-2 text-[11px] rounded-lg border flex items-center gap-1 cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textMuted} ${themeClasses.activeToolHover}`}
            >
              <RotateCcw className="w-3 h-3" />
              <span>設定リセット</span>
            </button>
          </div>
          </div>
        </ModalSection>

        {/* Source Kana Grid */}
        <ModalSection
          title="対象文字プレビュー"
          badge={
            <span className={`text-[11px] font-bold ${themeClasses.accentText}`}>
              作成済: {availableSmallSources.filter((s) => s.hasContours).length} /{' '}
              {availableSmallSources.length}字
            </span>
          }
          themeClasses={themeClasses}
        >
          <div
            className={`flex flex-wrap gap-1.5 sm:gap-1 max-h-36 sm:max-h-24 overflow-y-auto p-1.5 rounded border ${themeClasses.cardBg} ${themeClasses.border}`}
          >
            {availableSmallSources.map((item) => (
              <button
                type="button"
                key={item.char}
                onClick={() => onSelectPreviewChar(item.char)}
                className={`min-w-[36px] min-h-[36px] sm:min-w-0 sm:min-h-0 sm:w-8 sm:h-8 rounded text-xs font-bold transition-colors flex items-center justify-center cursor-pointer ${
                  smallPreviewChar === item.char
                    ? themeClasses.accentBtn
                    : item.hasContours
                    ? `${themeClasses.accentBadge} hover:opacity-90`
                    : `${themeClasses.cardBg} ${themeClasses.textMuted} hover:opacity-80`
                }`}
                title={`「${item.char}」⇒ 小文字「${item.smallChar}」${
                  item.hasContours ? ' (作図済)' : ' (未作図)'
                }`}
              >
                {item.char}
              </button>
            ))}
          </div>
        </ModalSection>
      </div>

      {/* Right Live Preview Box */}
      <div className="lg:col-span-5 flex flex-col gap-3 order-first lg:order-last">
        <ModalSection
          title="配置プレビュー"
          icon={<Eye className={`w-3.5 h-3.5 ${themeClasses.accentText}`} />}
          badge={
            <span className={`text-[11px] font-mono px-2 py-0.5 rounded-md border font-bold ${themeClasses.accentBadge}`}>
              「{smallPreviewChar}」⇒「{KANA_PAIRS[smallPreviewChar]?.smallChar || ''}」
            </span>
          }
          themeClasses={themeClasses}
        >
          <div className="flex flex-col items-center justify-center">
          <div
            className={`w-44 h-44 sm:w-56 sm:h-56 lg:w-full lg:h-auto lg:aspect-square lg:max-w-[250px] relative rounded-xl border flex items-center justify-center overflow-hidden shadow-inner ${themeClasses.subtoolbarBg} ${themeClasses.border}`}
          >
            <div className="absolute inset-0 pointer-events-none opacity-20">
              <div className="absolute left-1/2 top-0 bottom-0 w-px border-r border-dashed border-current" />
              <div className="absolute top-1/2 left-0 right-0 h-px border-b border-dashed border-current" />
              <div className="absolute top-[78%] left-0 right-0 h-px border-b border-emerald-500 opacity-60" />
              <div className="absolute inset-4 border border-dashed border-current opacity-40" />
            </div>

            {smallKanaPreviewPaths.basePath ? (
              <svg viewBox={`0 0 ${unitsPerEm} ${unitsPerEm}`} className="w-full h-full p-2">
                <path
                  d={smallKanaPreviewPaths.basePath}
                  fill={isLight ? '#cbd5e1' : '#334155'}
                  opacity={0.5}
                  fillRule="nonzero"
                />
                <path
                  d={smallKanaPreviewPaths.smallPath}
                  fill={isLight ? '#0f172a' : '#34d399'}
                  fillRule="nonzero"
                />
              </svg>
            ) : (
              <div className={`text-center p-4 text-xs ${themeClasses.textMuted}`}>
                親文字「{smallPreviewChar}」がまだ作成されていません
              </div>
            )}
          </div>

          <div className={`mt-2 text-[11px] text-center flex items-center gap-1.5 ${themeClasses.textMuted}`}>
            <Info className={`w-3.5 h-3.5 shrink-0 ${themeClasses.accentText}`} />
            <span>薄い点線背景は原字（通常サイズ）です</span>
          </div>
          </div>
        </ModalSection>

      </div>
    </div>
  );
};
