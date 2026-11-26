import React from 'react';
import { Eye, Info, Layers, RotateCcw, Sliders } from 'lucide-react';
import { ModalSection } from '../modals/ModalSection';
import {
  DAKUTEN_MAPPINGS,
  DakutenStyle,
  HandakutenStyle,
} from '../../utils/dakutenHelper';
import { ThemeClasses } from '../../utils/theme';
import { DakutenSourceItem, KanaScope } from './types';

interface DakutenSynthesisPanelProps {
  isLight: boolean;
  themeClasses: ThemeClasses;
  dakuScope: KanaScope;
  onChangeDakuScope: (scope: KanaScope) => void;
  dakuOverwrite: boolean;
  onChangeDakuOverwrite: (overwrite: boolean) => void;
  dakuStyle: DakutenStyle;
  onChangeDakuStyle: (style: DakutenStyle) => void;
  handakuStyle: HandakutenStyle;
  onChangeHandakuStyle: (style: HandakutenStyle) => void;
  dakuOffsetX: number;
  onChangeDakuOffsetX: (val: number) => void;
  dakuOffsetY: number;
  onChangeDakuOffsetY: (val: number) => void;
  dakuScale: number;
  onChangeDakuScale: (val: number) => void;
  onResetOffsets: () => void;
  availableDakutenSources: DakutenSourceItem[];
  dakuPreviewChar: string;
  onSelectPreviewChar: (char: string) => void;
  dakuPreviewKind: 'daku' | 'handaku';
  onChangeDakuPreviewKind: (kind: 'daku' | 'handaku') => void;
  dakutenPreviewSvgPath: string;
  unitsPerEm?: number;
}

const SCOPE_OPTIONS: { id: KanaScope; label: string }[] = [
  { id: 'all', label: 'ひらがな＋カタカナ' },
  { id: 'hiragana', label: 'ひらがな' },
  { id: 'katakana', label: 'カタカナ' },
];

// Larger slider thumb below the lg breakpoint, so the thumb is easier to
// grab on touch screens. The trailing ! is needed because the global
// range-thumb rules in index.css have higher specificity.
const MOBILE_THUMB_CLASSES =
  'max-lg:[&::-webkit-slider-thumb]:h-6! max-lg:[&::-webkit-slider-thumb]:w-6! max-lg:[&::-webkit-slider-thumb]:-mt-2! max-lg:[&::-moz-range-thumb]:h-6! max-lg:[&::-moz-range-thumb]:w-6!';

const DAKUTEN_STYLES: { id: DakutenStyle; name: string }[] = [
  { id: 'standard', name: '標準' },
  { id: 'brush', name: '毛筆' },
  { id: 'round', name: '丸' },
  { id: 'square', name: '四角' },
];

const HANDAKUTEN_STYLES: { id: HandakutenStyle; name: string }[] = [
  { id: 'standard', name: '標準' },
  { id: 'brush', name: '手書き' },
  { id: 'solid', name: '塗り丸' },
];

export const DakutenSynthesisPanel: React.FC<DakutenSynthesisPanelProps> = ({
  isLight,
  themeClasses,
  dakuScope,
  onChangeDakuScope,
  dakuOverwrite,
  onChangeDakuOverwrite,
  dakuStyle,
  onChangeDakuStyle,
  handakuStyle,
  onChangeHandakuStyle,
  dakuOffsetX,
  onChangeDakuOffsetX,
  dakuOffsetY,
  onChangeDakuOffsetY,
  dakuScale,
  onChangeDakuScale,
  onResetOffsets,
  availableDakutenSources,
  dakuPreviewChar,
  onSelectPreviewChar,
  dakuPreviewKind,
  onChangeDakuPreviewKind,
  dakutenPreviewSvgPath,
  unitsPerEm = 1000,
}) => {
  const previewMapping = DAKUTEN_MAPPINGS[dakuPreviewChar];
  const isHandakuPreview = Boolean(
    previewMapping?.handaku && (dakuPreviewKind === 'handaku' || !previewMapping?.daku)
  );
  const previewTargetChar = isHandakuPreview
    ? previewMapping?.handaku || ''
    : previewMapping?.daku || previewMapping?.handaku || '';

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
                  onClick={() => onChangeDakuScope(option.id)}
                  className={`px-2.5 py-1.5 sm:py-1 text-[11px] rounded font-bold transition-colors whitespace-nowrap cursor-pointer ${
                    dakuScope === option.id
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
            <span className={themeClasses.textMuted}>作成済みの濁音・半濁音を上書き</span>
            <input
              type="checkbox"
              checked={dakuOverwrite}
              onChange={(e) => onChangeDakuOverwrite(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 accent-emerald-600 focus:ring-emerald-500"
            />
          </label>
          </div>
        </ModalSection>

        {/* Style Options */}
        <ModalSection
          title="濁点・半濁点のスタイル"
          icon={<Sliders className={`w-3.5 h-3.5 ${themeClasses.accentText}`} />}
          themeClasses={themeClasses}
        >
          <div className="flex flex-col gap-2.5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs">
            <div>
              <label className={`block text-[11px] font-bold mb-1 ${themeClasses.textMuted}`}>
                濁点「゛」スタイル
              </label>
              <div className="grid grid-cols-2 gap-1.5 sm:gap-1">
                {DAKUTEN_STYLES.map((st) => (
                  <button
                    type="button"
                    key={st.id}
                    onClick={() => onChangeDakuStyle(st.id)}
                    className={`p-2 sm:p-1.5 text-[11px] rounded border font-medium text-center transition-colors cursor-pointer ${
                      dakuStyle === st.id
                        ? `${themeClasses.accentBadge} font-bold`
                        : `${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.activeToolHover}`
                    }`}
                  >
                    {st.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={`block text-[11px] font-bold mb-1 ${themeClasses.textMuted}`}>
                半濁点「゜」スタイル
              </label>
              <div className="grid grid-cols-3 gap-1.5 sm:gap-1">
                {HANDAKUTEN_STYLES.map((st) => (
                  <button
                    type="button"
                    key={st.id}
                    onClick={() => onChangeHandakuStyle(st.id)}
                    className={`p-2 sm:p-1.5 text-[11px] rounded border font-medium text-center transition-colors cursor-pointer ${
                      handakuStyle === st.id
                        ? `${themeClasses.accentBadge} font-bold`
                        : `${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.activeToolHover}`
                    }`}
                  >
                    {st.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Position Fine Tuning */}
          <div className={`grid grid-cols-1 lg:grid-cols-3 gap-3 pt-2 border-t text-xs ${themeClasses.border}`}>
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className={themeClasses.textMuted}>左右位置 (X):</span>
                <span className={`min-w-[64px] px-2 py-0.5 rounded-md border text-center font-mono tabular-nums text-[11px] font-bold ${themeClasses.accentBadge}`}>
                  {dakuOffsetX > 0 ? `+${dakuOffsetX}` : dakuOffsetX}U
                </span>
              </div>
              <input
                type="range"
                min="-150"
                max="150"
                step="5"
                value={dakuOffsetX}
                onChange={(e) => onChangeDakuOffsetX(Number(e.target.value))}
                className={`w-full h-2 sm:h-1.5 touch-pan-x accent-emerald-600 bg-black/10 dark:bg-white/10 rounded-lg cursor-pointer ${MOBILE_THUMB_CLASSES}`}
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className={themeClasses.textMuted}>上下位置 (Y):</span>
                <span className={`min-w-[64px] px-2 py-0.5 rounded-md border text-center font-mono tabular-nums text-[11px] font-bold ${themeClasses.accentBadge}`}>
                  {dakuOffsetY > 0 ? `+${dakuOffsetY}` : dakuOffsetY}U
                </span>
              </div>
              <input
                type="range"
                min="-150"
                max="150"
                step="5"
                value={dakuOffsetY}
                onChange={(e) => onChangeDakuOffsetY(Number(e.target.value))}
                className={`w-full h-2 sm:h-1.5 touch-pan-x accent-emerald-600 bg-black/10 dark:bg-white/10 rounded-lg cursor-pointer ${MOBILE_THUMB_CLASSES}`}
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className={themeClasses.textMuted}>濁点サイズ:</span>
                <span className={`min-w-[64px] px-2 py-0.5 rounded-md border text-center font-mono tabular-nums text-[11px] font-bold ${themeClasses.accentBadge}`}>{Math.round(dakuScale * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.6"
                max="1.5"
                step="0.05"
                value={dakuScale}
                onChange={(e) => onChangeDakuScale(Number(e.target.value))}
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

        {/* Parent Char Quick Selectors */}
        <ModalSection
          title="対象文字プレビュー"
          badge={
            <span className={`text-[11px] font-bold ${themeClasses.accentText}`}>
              作成済: {availableDakutenSources.filter((s) => s.hasContours).length} /{' '}
              {availableDakutenSources.length}字
            </span>
          }
          themeClasses={themeClasses}
        >
          <div
            className={`flex flex-wrap gap-1.5 sm:gap-1 max-h-36 sm:max-h-24 overflow-y-auto p-1.5 rounded border ${themeClasses.cardBg} ${themeClasses.border}`}
          >
            {availableDakutenSources.map((item) => (
              <button
                type="button"
                key={item.char}
                onClick={() => onSelectPreviewChar(item.char)}
                className={`min-w-[36px] min-h-[36px] sm:min-w-0 sm:min-h-0 sm:w-8 sm:h-8 rounded text-xs font-bold transition-colors flex items-center justify-center cursor-pointer ${
                  dakuPreviewChar === item.char
                    ? themeClasses.accentBtn
                    : item.hasContours
                    ? `${themeClasses.accentBadge} hover:opacity-90`
                    : `${themeClasses.cardBg} ${themeClasses.textMuted} hover:opacity-80`
                }`}
                title={`「${item.char}」→ 濁音:「${item.daku || ''}」${
                  item.handaku ? ` 半濁音:「${item.handaku}」` : ''
                }${item.hasContours ? ' (作図済)' : ' (未作図)'}`}
              >
                {item.char}
              </button>
            ))}
          </div>
        </ModalSection>
      </div>

      {/* Right Live Preview Box (shown first on mobile for immediate feedback) */}
      <div className="lg:col-span-5 flex flex-col gap-3 order-first lg:order-last">
        <ModalSection
          title="合成プレビュー"
          icon={<Eye className={`w-3.5 h-3.5 ${themeClasses.accentText}`} />}
          badge={
            <span className="flex items-center gap-1.5">
              {previewMapping?.daku && previewMapping?.handaku && (
                <span className="flex items-center rounded-md border overflow-hidden text-[10px]">
                  <button
                    type="button"
                    onClick={() => onChangeDakuPreviewKind('daku')}
                    className={`px-1.5 py-0.5 font-bold cursor-pointer transition-colors ${
                      !isHandakuPreview
                        ? themeClasses.accentBtn
                        : `${themeClasses.subtoolbarBg} ${themeClasses.textMuted}`
                    }`}
                    title={`濁音「${previewMapping.daku}」をプレビュー`}
                  >
                    ゛{previewMapping.daku}
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeDakuPreviewKind('handaku')}
                    className={`px-1.5 py-0.5 font-bold cursor-pointer transition-colors ${
                      isHandakuPreview
                        ? themeClasses.accentBtn
                        : `${themeClasses.subtoolbarBg} ${themeClasses.textMuted}`
                    }`}
                    title={`半濁音「${previewMapping.handaku}」をプレビュー`}
                  >
                    ゜{previewMapping.handaku}
                  </button>
                </span>
              )}
              <span className={`text-[11px] font-mono px-2 py-0.5 rounded-md border font-bold ${themeClasses.accentBadge}`}>
                「{dakuPreviewChar}」⇒「{previewTargetChar}」
              </span>
            </span>
          }
          themeClasses={themeClasses}
        >
          <div className="flex flex-col items-center justify-center">
          <div
            className={`w-44 h-44 sm:w-56 sm:h-56 lg:w-full lg:h-auto lg:aspect-square lg:max-w-[250px] relative rounded-xl border flex items-center justify-center overflow-hidden ${themeClasses.subtoolbarBg} ${themeClasses.border}`}
          >
            <div className="absolute inset-0 pointer-events-none opacity-20">
              <div className="absolute left-1/2 top-0 bottom-0 w-px border-r border-dashed border-current" />
              <div className="absolute top-1/2 left-0 right-0 h-px border-b border-dashed border-current" />
              <div className="absolute inset-4 border border-dashed border-current opacity-40" />
            </div>

            {dakutenPreviewSvgPath ? (
              <svg viewBox={`0 0 ${unitsPerEm} ${unitsPerEm}`} className="w-full h-full p-2">
                <path
                  d={dakutenPreviewSvgPath}
                  fill={isLight ? '#0f172a' : '#34d399'}
                  fillRule="nonzero"
                />
              </svg>
            ) : (
              <div className={`text-center p-4 text-xs ${themeClasses.textMuted}`}>
                親文字「{dakuPreviewChar}」がまだ作成されていません
              </div>
            )}
          </div>

          <div className={`mt-2 text-[11px] text-center flex items-center gap-1.5 ${themeClasses.textMuted}`}>
            <Info className={`w-3.5 h-3.5 shrink-0 ${themeClasses.accentText}`} />
            <span>親文字に選択した濁点・半濁点を合成します</span>
          </div>
          </div>
        </ModalSection>
      </div>
    </div>
  );
};
