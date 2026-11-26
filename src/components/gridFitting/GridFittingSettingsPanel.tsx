import React from 'react';
import { Settings2, Check, Sparkles } from 'lucide-react';
import { ThemeClasses } from '../../utils/theme';
import { SliderRow } from '../modals/SliderRow';
import { GridFittingConfig, GridFittingTab } from './types';

interface GridFittingSettingsPanelProps {
  themeClasses: ThemeClasses;
  activeTab: GridFittingTab;
  config: GridFittingConfig;
  setConfig: React.Dispatch<React.SetStateAction<GridFittingConfig>>;
  currentGlyphChar: string;
  onApplyCurrent: () => void;
  onBatchApply: () => void;
}

const MIN_STEM_OPTIONS = [
  { value: 0, label: 'なし' },
  { value: 1.0, label: '1px' },
  { value: 1.5, label: '1.5px' },
  { value: 2.0, label: '2px' },
] as const;

export const GridFittingSettingsPanel: React.FC<GridFittingSettingsPanelProps> = ({
  themeClasses,
  activeTab,
  config,
  setConfig,
  currentGlyphChar,
  onApplyCurrent,
  onBatchApply,
}) => {
  return (
    <div
      className={`w-full md:w-80 shrink-0 p-3 sm:p-4 pb-24 sm:pb-4 space-y-3 sm:space-y-4 overflow-y-auto ${
        activeTab !== 'settings' ? 'hidden sm:block' : ''
      }`}
    >
      <div className="flex items-center space-x-2 border-b pb-2 border-stone-200 dark:border-[#223326]">
        <Settings2 className={`w-4 h-4 ${themeClasses.accentText}`} />
        <h3 className="text-xs font-bold">
          ヒンティング補正調整パラメータ
        </h3>
      </div>

      {/* Snap Strength Slider */}
      <SliderRow
        label="スナップ引き寄せ強度"
        value={Math.round((Number.isFinite(config.snapStrength) ? config.snapStrength : 1) * 100)}
        min={0}
        max={100}
        step={5}
        unit="%"
        formatValue={(v) => `${v}`}
        onChange={(v) => setConfig((prev) => ({ ...prev, snapStrength: v / 100 }))}
        hint="100%に近づくほど各ノードが格子境界へ吸着し、ボケを抑えます。"
        themeClasses={themeClasses}
      />

      {/* Minimum Stem Width Protection */}
      <div className="space-y-2">
        <label className="text-xs font-bold block">最小線幅（Stroke）の保護:</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
          {MIN_STEM_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setConfig((prev) => ({ ...prev, minStemWidthPx: opt.value }))}
              className={`py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                config.minStemWidthPx === opt.value
                  ? `${themeClasses.activeTool} border-transparent`
                  : `${themeClasses.cardBg} ${themeClasses.activeToolHover}`
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className={`text-[10px] ${themeClasses.textMuted}`}>
          漢字や複雑な文字で横線が消えないよう、最低線幅を補正保持します。
        </p>
      </div>

      {/* Toggles */}
      <div className={`space-y-2.5 pt-2 border-t ${themeClasses.border}`}>
        <label className="flex items-center justify-between text-xs font-bold cursor-pointer">
          <span>垂直ステム (縦線) スナップ</span>
          <input
            type="checkbox"
            checked={Boolean(config.snapVertical)}
            onChange={(e) =>
              setConfig((prev) => ({ ...prev, snapVertical: e.target.checked }))
            }
            className="w-4 h-4 accent-emerald-600 rounded"
          />
        </label>

        <label className="flex items-center justify-between text-xs font-bold cursor-pointer">
          <span>水平ステム (横線) スナップ</span>
          <input
            type="checkbox"
            checked={Boolean(config.snapHorizontal)}
            onChange={(e) =>
              setConfig((prev) => ({ ...prev, snapHorizontal: e.target.checked }))
            }
            className="w-4 h-4 accent-emerald-600 rounded"
          />
        </label>

        <label className="flex items-center justify-between text-xs font-bold cursor-pointer">
          <span>ベースライン・CapHeight吸着</span>
          <input
            type="checkbox"
            checked={Boolean(config.snapMetrics)}
            onChange={(e) =>
              setConfig((prev) => ({ ...prev, snapMetrics: e.target.checked }))
            }
            className="w-4 h-4 accent-emerald-600 rounded"
          />
        </label>

        <label className="flex items-center justify-between text-xs font-bold cursor-pointer">
          <span>ベジェハンドルの追従補正</span>
          <input
            type="checkbox"
            checked={Boolean(config.adjustHandles)}
            onChange={(e) =>
              setConfig((prev) => ({ ...prev, adjustHandles: e.target.checked }))
            }
            className="w-4 h-4 accent-emerald-600 rounded"
          />
        </label>
      </div>

      {/* Desktop Apply Actions */}
      <div className={`pt-4 space-y-2 border-t hidden sm:block ${themeClasses.border}`}>
        <button
          onClick={onApplyCurrent}
          className={`w-full py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center justify-center space-x-2 cursor-pointer ${themeClasses.accentBtn}`}
        >
          <Check className="w-4 h-4" />
          <span>「{currentGlyphChar}」に整列適用</span>
        </button>

        <button
          onClick={onBatchApply}
          className={`w-full py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center justify-center space-x-2 cursor-pointer ${themeClasses.accentBtn}`}
        >
          <Sparkles className="w-4 h-4 opacity-90" />
          <span>全文字一括ヒンティング適用</span>
        </button>
      </div>
    </div>
  );
};
