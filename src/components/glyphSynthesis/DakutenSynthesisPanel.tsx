import React from 'react';
import { Eye, Info, Layers, RotateCcw, Sliders, Wand2 } from 'lucide-react';
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
  dakutenPreviewSvgPath: string;
  onExecuteBatch: () => void;
}

const SCOPE_OPTIONS: { id: KanaScope; label: string }[] = [
  { id: 'all', label: 'ひらがな＋カタカナ' },
  { id: 'hiragana', label: 'ひらがな' },
  { id: 'katakana', label: 'カタカナ' },
];

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
  dakutenPreviewSvgPath,
  onExecuteBatch,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
      {/* Left Controls */}
      <div className="lg:col-span-7 flex flex-col gap-3.5">
        {/* Scope & Overwrite Card */}
        <div
          className={`p-3.5 rounded-lg border flex flex-col gap-3 ${themeClasses.subtoolbarBg} ${themeClasses.border}`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
            <span className="font-bold flex items-center gap-1.5">
              <Layers className={`w-3.5 h-3.5 ${themeClasses.accentText}`} />
              <span>対象範囲</span>
            </span>
            <div className="flex items-center gap-1 overflow-x-auto max-w-full pb-0.5 sm:pb-0">
              {SCOPE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => onChangeDakuScope(option.id)}
                  className={`px-2.5 py-1 text-[11px] rounded font-bold transition-colors whitespace-nowrap cursor-pointer ${
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

          <label className="flex items-center justify-between text-xs cursor-pointer pt-1 border-t border-stone-200 dark:border-stone-800">
            <span className="text-stone-600 dark:text-emerald-400">作成済みの濁音・半濁音を上書き</span>
            <input
              type="checkbox"
              checked={dakuOverwrite}
              onChange={(e) => onChangeDakuOverwrite(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 accent-emerald-600 focus:ring-emerald-500"
            />
          </label>
        </div>

        {/* Style Options */}
        <div
          className={`p-3.5 rounded-lg border flex flex-col gap-3.5 ${themeClasses.subtoolbarBg} ${themeClasses.border}`}
        >
          <span className="text-xs font-bold flex items-center gap-1.5">
            <Sliders className={`w-3.5 h-3.5 ${themeClasses.accentText}`} />
            <span>濁点・半濁点のスタイル</span>
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className={`block text-[11px] font-bold mb-1 ${themeClasses.textMuted}`}>
                濁点「゛」スタイル
              </label>
              <div className="grid grid-cols-2 gap-1">
                {DAKUTEN_STYLES.map((st) => (
                  <button
                    key={st.id}
                    onClick={() => onChangeDakuStyle(st.id)}
                    className={`p-1.5 text-[11px] rounded border font-medium text-center transition-colors cursor-pointer ${
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
              <div className="grid grid-cols-3 gap-1">
                {HANDAKUTEN_STYLES.map((st) => (
                  <button
                    key={st.id}
                    onClick={() => onChangeHandakuStyle(st.id)}
                    className={`p-1.5 text-[11px] rounded border font-medium text-center transition-colors cursor-pointer ${
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
          <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t text-xs ${themeClasses.border}`}>
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className={themeClasses.textMuted}>左右位置 (X):</span>
                <span className="font-mono font-bold">
                  {dakuOffsetX > 0 ? `+${dakuOffsetX}` : dakuOffsetX}px
                </span>
              </div>
              <input
                type="range"
                min="-150"
                max="150"
                step="5"
                value={dakuOffsetX}
                onChange={(e) => onChangeDakuOffsetX(Number(e.target.value))}
                className="w-full h-1.5 accent-emerald-600 bg-black/10 dark:bg-white/10 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className={themeClasses.textMuted}>上下位置 (Y):</span>
                <span className="font-mono font-bold">
                  {dakuOffsetY > 0 ? `+${dakuOffsetY}` : dakuOffsetY}px
                </span>
              </div>
              <input
                type="range"
                min="-150"
                max="150"
                step="5"
                value={dakuOffsetY}
                onChange={(e) => onChangeDakuOffsetY(Number(e.target.value))}
                className="w-full h-1.5 accent-emerald-600 bg-black/10 dark:bg-white/10 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className={themeClasses.textMuted}>濁点サイズ:</span>
                <span className="font-mono font-bold">{Math.round(dakuScale * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.6"
                max="1.5"
                step="0.05"
                value={dakuScale}
                onChange={(e) => onChangeDakuScale(Number(e.target.value))}
                className="w-full h-1.5 accent-emerald-600 bg-black/10 dark:bg-white/10 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={onResetOffsets}
              className={`text-[11px] flex items-center gap-1 cursor-pointer ${themeClasses.textMuted} hover:opacity-80`}
            >
              <RotateCcw className="w-3 h-3" />
              <span>位置リセット</span>
            </button>
          </div>
        </div>

        {/* Parent Char Quick Selectors */}
        <div className={`p-3 rounded-lg border ${themeClasses.subtoolbarBg} ${themeClasses.border}`}>
          <div className={`flex items-center justify-between text-[11px] mb-2 font-bold ${themeClasses.textMuted}`}>
            <span>対象文字プレビュー:</span>
            <span className={themeClasses.accentText}>
              作成済: {availableDakutenSources.filter((s) => s.hasContours).length} /{' '}
              {availableDakutenSources.length}字
            </span>
          </div>
          <div
            className={`flex flex-wrap gap-1 max-h-28 overflow-y-auto p-1 rounded border ${themeClasses.cardBg} ${themeClasses.border}`}
          >
            {availableDakutenSources.map((item) => (
              <button
                key={item.char}
                onClick={() => onSelectPreviewChar(item.char)}
                className={`w-7 h-7 rounded text-xs font-bold transition-colors flex items-center justify-center ${
                  dakuPreviewChar === item.char
                    ? `${themeClasses.accentBtn} ring-2 ring-emerald-500`
                    : item.hasContours
                    ? `${themeClasses.accentBadge} cursor-pointer hover:opacity-90`
                    : 'bg-black/5 dark:bg-white/5 text-stone-400 dark:text-stone-600 cursor-not-allowed'
                }`}
                title={`「${item.char}」→ 濁音:「${item.daku || ''}」${
                  item.handaku ? ` 半濁音:「${item.handaku}」` : ''
                }${item.hasContours ? ' (作図済)' : ' (未作図)'}`}
              >
                {item.char}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right Live Preview Box */}
      <div className="lg:col-span-5 flex flex-col gap-3">
        <div
          className={`p-4 rounded-2xl border flex flex-col items-center justify-center ${themeClasses.cardBg} ${themeClasses.border}`}
        >
          <div className="w-full flex items-center justify-between text-xs font-bold mb-2 pb-1.5 border-b">
            <span className="flex items-center gap-1.5">
              <Eye className={`w-3.5 h-3.5 ${themeClasses.accentText}`} />
              <span>合成プレビュー</span>
            </span>
            <span className={`text-[11px] font-mono px-2 py-0.5 rounded-md border font-bold ${themeClasses.accentBadge}`}>
              「{dakuPreviewChar}」⇒「
              {DAKUTEN_MAPPINGS[dakuPreviewChar]?.daku ||
                DAKUTEN_MAPPINGS[dakuPreviewChar]?.handaku ||
                ''}
              」
            </span>
          </div>

          <div
            className={`w-full aspect-square max-w-[280px] relative rounded-2xl border flex items-center justify-center overflow-hidden ${themeClasses.subtoolbarBg} ${themeClasses.border}`}
          >
            <div className="absolute inset-0 pointer-events-none opacity-20">
              <div className="absolute left-1/2 top-0 bottom-0 w-px border-r border-dashed border-current" />
              <div className="absolute top-1/2 left-0 right-0 h-px border-b border-dashed border-current" />
              <div className="absolute inset-4 border border-dashed border-current opacity-40" />
            </div>

            {dakutenPreviewSvgPath ? (
              <svg viewBox="0 0 1000 1000" className="w-full h-full p-2">
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

          <div className={`mt-2.5 text-[11px] text-center flex items-center gap-1.5 ${themeClasses.textMuted}`}>
            <Info className={`w-3.5 h-3.5 shrink-0 ${themeClasses.accentText}`} />
            <span>親文字に選択した濁点・半濁点を合成します</span>
          </div>
        </div>

        <button
          onClick={onExecuteBatch}
          className={`w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 active:opacity-85 transition-colors duration-100 cursor-pointer ${themeClasses.accentBtn}`}
        >
          <Wand2 className="w-4 h-4 shrink-0" />
          <span>濁音・半濁点を一括合成</span>
        </button>
      </div>
    </div>
  );
};
