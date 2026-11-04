import React from 'react';
import { AlignCenter, ChevronDown, ChevronUp, Sliders } from 'lucide-react';
import { AutoSpacingPreset } from '../../utils/metricsHelper';
import { PathContour, ThemeClasses } from '../../types';

export interface AutoSpaceSectionProps {
  contours: PathContour[];
  upm: number;
  spacingPreset: AutoSpacingPreset;
  setSpacingPreset: (preset: AutoSpacingPreset) => void;
  onExecuteAutoSpacing: (preset?: AutoSpacingPreset) => void;
  isExpanded: boolean;
  onToggle: () => void;
  themeClasses: ThemeClasses;
}

export const AutoSpaceSection: React.FC<AutoSpaceSectionProps> = ({
  contours,
  upm,
  spacingPreset,
  setSpacingPreset,
  onExecuteAutoSpacing,
  isExpanded,
  onToggle,
  themeClasses,
}) => {
  return (
    <div
      className={`flex flex-col rounded-xl border overflow-hidden transition-colors ${themeClasses.cardBg} ${themeClasses.border} shadow-xs`}
    >
      <div
        onClick={onToggle}
        className={`flex items-center justify-between p-2.5 cursor-pointer transition-colors hover:${themeClasses.activeToolHover}`}
      >
        <span className={`text-xs font-bold flex items-center space-x-1.5 ${themeClasses.accentText}`}>
          <AlignCenter className="w-4 h-4 shrink-0" />
          <span>オートスペーシング (自動余白)</span>
        </span>
        <div className="p-0.5 text-stone-400">
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {isExpanded && (
        <div className={`p-3 pt-0 space-y-2.5 border-t ${themeClasses.border}`}>
          <p className={`text-[11px] leading-relaxed ${themeClasses.textMuted} pt-1`}>
            文字の実幅と形状の光学バランスに応じて、最適な送り幅(Advance)と左右余白(LSB/RSB)を一括計算します。
          </p>

          {/* Preset Selector Grid */}
          <div className="grid grid-cols-1 gap-1.5 text-xs">
            {[
              { id: 'smart' as AutoSpacingPreset, label: '自動計算 (和欧最適化)', desc: `和文:全角${upm}EM / 欧文:光学余白`, icon: Sliders },
              { id: 'japanese-fullwidth' as AutoSpacingPreset, label: `和文全角センタリング (${upm}EM)`, desc: '枠の中心に正確に配置' },
              { id: 'proportional-balanced' as AutoSpacingPreset, label: '欧文プロポーショナル', desc: '字形ごとの光学余白' },
              { id: 'proportional-tight' as AutoSpacingPreset, label: '欧文タイト (詰まり気味)', desc: '余白を狭めて配置' },
            ].map((preset) => {
              const PIcon = preset.icon;
              const isSelected = spacingPreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setSpacingPreset(preset.id);
                    onExecuteAutoSpacing(preset.id);
                  }}
                  className={`p-2 rounded-lg border text-left flex items-start justify-between transition-all cursor-pointer active:scale-98 ${
                    isSelected
                      ? `${themeClasses.activeTool} border`
                      : `${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} hover:${themeClasses.activeToolHover}`
                  }`}
                >
                  <div className="min-w-0 pr-1">
                    <div className="font-extrabold flex items-center gap-1">
                      {PIcon && <PIcon className="w-3.5 h-3.5 shrink-0" />}
                      <span>{preset.label}</span>
                    </div>
                    <div className="text-[10px] opacity-75 font-normal mt-0.5">
                      {preset.desc}
                    </div>
                  </div>
                  {isSelected && (
                    <span className="text-[10px] font-bold shrink-0 mt-0.5">
                      ✓ 適用中
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Trigger Button */}
          <button
            type="button"
            onClick={() => onExecuteAutoSpacing(spacingPreset)}
            disabled={contours.length === 0}
            className={`w-full min-h-[42px] py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center space-x-2 transition-all active:scale-95 disabled:opacity-40 cursor-pointer ${themeClasses.accentBtn}`}
            title="サイドベアリングを自動適用 (ショートカット: Shift+Alt+S)"
          >
            <AlignCenter className="w-4 h-4 shrink-0" />
            <span>オートスペーシング適用 (Shift+Alt+S)</span>
          </button>
        </div>
      )}
    </div>
  );
};
