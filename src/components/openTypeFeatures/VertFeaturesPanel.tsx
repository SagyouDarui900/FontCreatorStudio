import React from 'react';
import {
  AlignVerticalJustifyCenter,
  ArrowRight,
  Check,
  Sparkles,
} from 'lucide-react';
import { OpenTypeFeaturesConfig } from '../../types';
import { ThemeClasses } from '../../utils/theme';
import { findVertPresetInfo, safeFromCodePoint } from './openTypePresets';

interface VertFeaturesPanelProps {
  verticalWriting: OpenTypeFeaturesConfig['verticalWriting'];
  themeClasses: ThemeClasses;
  onAutoDetectVerticalGlyphs: () => void;
  onToggleVerticalWriting: () => void;
  onUpdateVerticalMetricField: (
    field: 'defaultVertAdvance' | 'vertOriginY',
    value: number
  ) => void;
  onToggleVertSub: (id: string) => void;
}

export const VertFeaturesPanel: React.FC<VertFeaturesPanelProps> = ({
  verticalWriting,
  themeClasses,
  onAutoDetectVerticalGlyphs,
  onToggleVerticalWriting,
  onUpdateVerticalMetricField,
  onToggleVertSub,
}) => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Vertical Writing Main Controls Card */}
      <div
        className={`p-4 sm:p-5 rounded-2xl border transition-colors space-y-4 ${themeClasses.subtoolbarBg} ${themeClasses.border}`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${
                verticalWriting.enabled
                  ? themeClasses.accentBadge
                  : `${themeClasses.cardBg} ${themeClasses.textMuted} ${themeClasses.border}`
              }`}
            >
              <AlignVerticalJustifyCenter className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base">
                日本語縦書き (OpenType `vert` &amp; `vhea` Table)
              </h3>
              <p className={`text-xs mt-0.5 ${themeClasses.textMuted}`}>
                縦書き時に句読点・鍵括弧・長音記号（ー）等を自動的に縦向きグリフに置換・配置します
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onAutoDetectVerticalGlyphs}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.accentText} ${themeClasses.activeToolHover}`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>既存グリフから全自動バインド</span>
            </button>

            <button
              onClick={onToggleVerticalWriting}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                verticalWriting.enabled
                  ? themeClasses.accentBtn
                  : `${themeClasses.cardBg} border ${themeClasses.border} ${themeClasses.textMuted}`
              }`}
            >
              {verticalWriting.enabled ? '縦書き機能 ON' : '縦書き機能 OFF'}
            </button>
          </div>
        </div>

        {/* Vertical Metrics Global Settings */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t ${themeClasses.border}`}>
          <div className="space-y-1">
            <label className="text-xs font-bold flex items-center justify-between">
              <span>デフォルト縦向き全角送り幅 (`vertAdvanceHeight`)</span>
              <span className={`font-mono ${themeClasses.accentText}`}>
                {verticalWriting.defaultVertAdvance} units
              </span>
            </label>
            <input
              type="range"
              min={500}
              max={2000}
              step={10}
              value={verticalWriting.defaultVertAdvance}
              onChange={(e) =>
                onUpdateVerticalMetricField('defaultVertAdvance', Number(e.target.value))
              }
              className="w-full accent-emerald-600"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold flex items-center justify-between">
              <span>縦書きY原点 (`VORG` Table Origin)</span>
              <span className={`font-mono ${themeClasses.accentText}`}>
                {verticalWriting.vertOriginY} units
              </span>
            </label>
            <input
              type="range"
              min={0}
              max={1200}
              step={10}
              value={verticalWriting.vertOriginY}
              onChange={(e) => onUpdateVerticalMetricField('vertOriginY', Number(e.target.value))}
              className="w-full accent-emerald-600"
            />
          </div>
        </div>
      </div>

      {/* Vertical Glyph Replacement Rules List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4
            className={`text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 ${themeClasses.textMuted}`}
          >
            <AlignVerticalJustifyCenter className={`w-3.5 h-3.5 ${themeClasses.accentText}`} />
            <span>標準縦書き置換ルール一覧 (`vert` GSUB Table)</span>
          </h4>
          <span className={`text-xs ${themeClasses.textMuted}`}>
            有効: {verticalWriting.substitutions.filter((s) => s.enabled).length} /{' '}
            {verticalWriting.substitutions.length} 件
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {verticalWriting.substitutions.map((sub, idx) => {
            const presetInfo = findVertPresetInfo(sub, idx);
            const srcChar = presetInfo?.char || safeFromCodePoint(sub.sourceUnicode);
            const vertChar = presetInfo?.vertChar || safeFromCodePoint(sub.vertUnicode);

            return (
              <div
                key={sub.id}
                className={`p-3 rounded-xl border transition-colors flex items-center justify-between ${
                  sub.enabled
                    ? `${themeClasses.cardBg} ${themeClasses.accentBorder}`
                    : `${themeClasses.subtoolbarBg} ${themeClasses.border} opacity-60`
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <button
                    onClick={() => onToggleVertSub(sub.id)}
                    className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors cursor-pointer ${
                      sub.enabled
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : themeClasses.border
                    }`}
                  >
                    {sub.enabled && <Check className="w-3.5 h-3.5" />}
                  </button>

                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm truncate">
                        {presetInfo?.name || srcChar}
                      </span>
                    </div>
                    <div
                      className={`flex items-center space-x-1.5 text-[11px] font-mono mt-0.5 ${themeClasses.textMuted}`}
                    >
                      <span
                        className={`px-1 py-0.2 rounded border ${themeClasses.subtoolbarBg} ${themeClasses.border}`}
                      >
                        {srcChar} (U+{sub.sourceUnicode.toString(16).toUpperCase()})
                      </span>
                      <ArrowRight className="w-3 h-3 shrink-0" />
                      <span className={`px-1 py-0.2 rounded border font-bold ${themeClasses.accentBadge}`}>
                        {vertChar}
                      </span>
                    </div>
                  </div>
                </div>

                <span className={`text-[10px] font-bold shrink-0 ml-2 ${themeClasses.textMuted}`}>
                  `vert`
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
