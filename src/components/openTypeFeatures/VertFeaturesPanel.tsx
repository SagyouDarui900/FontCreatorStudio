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
  existingUnicodes?: Set<number>;
  themeClasses: ThemeClasses;
  onAutoDetectVerticalGlyphs: () => void;
  onToggleVerticalWriting: () => void;
  onCommitHistory?: () => void;
  onUpdateVerticalMetricField: (
    field: 'defaultVertAdvance' | 'vertOriginY',
    value: number
  ) => void;
  onToggleVertSub: (id: string) => void;
}

export const VertFeaturesPanel: React.FC<VertFeaturesPanelProps> = ({
  verticalWriting,
  existingUnicodes,
  themeClasses,
  onAutoDetectVerticalGlyphs,
  onToggleVerticalWriting,
  onCommitHistory,
  onUpdateVerticalMetricField,
  onToggleVertSub,
}) => {
  const defaultVertAdvance =
    typeof verticalWriting?.defaultVertAdvance === 'number' && Number.isFinite(verticalWriting.defaultVertAdvance)
      ? verticalWriting.defaultVertAdvance
      : 1000;
  const vertOriginY =
    typeof verticalWriting?.vertOriginY === 'number' && Number.isFinite(verticalWriting.vertOriginY)
      ? verticalWriting.vertOriginY
      : 880;
  const substitutions = verticalWriting?.substitutions ?? [];

  return (
    <div className="space-y-4">
      {/* Vertical Writing Main Controls Card */}
      <div
        className={`p-3.5 sm:p-4 rounded-xl border transition-colors space-y-3 ${themeClasses.subtoolbarBg} ${themeClasses.border}`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${
                verticalWriting?.enabled
                  ? themeClasses.accentBadge
                  : `${themeClasses.cardBg} ${themeClasses.textMuted} ${themeClasses.border}`
              }`}
            >
              <AlignVerticalJustifyCenter className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base">
                日本語縦書き (OpenType `vert`/`vrt2` &amp; `vhea`/`vmtx`/`VORG`)
              </h3>
              <p className={`text-xs mt-0.5 ${themeClasses.textMuted}`}>
                縦書き時に句読点・鍵括弧・長音記号（ー）・小書きかなを縦向きグリフ（専用または自動派生・`.vert`）へ置換・配置します
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onAutoDetectVerticalGlyphs}
              className={`flex-1 sm:flex-none justify-center px-3 py-2 sm:py-1.5 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.accentText} ${themeClasses.activeToolHover}`}
            >
              <Sparkles className={`w-3.5 h-3.5 ${themeClasses.accentText}`} />
              <span>既存グリフから全自動バインド</span>
            </button>

            <button
              onClick={onToggleVerticalWriting}
              className={`flex-1 sm:flex-none justify-center px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                verticalWriting?.enabled
                  ? themeClasses.accentBtn
                  : `${themeClasses.cardBg} border ${themeClasses.border} ${themeClasses.textMuted}`
              }`}
            >
              {verticalWriting?.enabled ? '縦書き機能 ON' : '縦書き機能 OFF'}
            </button>
          </div>
        </div>

        {/* Vertical Metrics Global Settings */}
        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-4 pt-3 border-t ${themeClasses.border}`}>
          <div className="space-y-1">
            <label className="text-xs font-bold flex items-center justify-between">
              <span>デフォルト縦向き全角送り幅 (`vertAdvanceHeight`)</span>
              <span
                className={`min-w-[64px] px-2 py-0.5 rounded-md border text-center font-mono tabular-nums text-[11px] font-bold shrink-0 ${themeClasses.accentBadge}`}
              >
                {defaultVertAdvance} units
              </span>
            </label>
            <input
              type="range"
              min={500}
              max={2000}
              step={10}
              value={defaultVertAdvance}
              onPointerDown={onCommitHistory}
              onFocus={onCommitHistory}
              onChange={(e) =>
                onUpdateVerticalMetricField('defaultVertAdvance', Number(e.target.value))
              }
              className="w-full accent-emerald-600"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold flex items-center justify-between">
              <span>縦書きY原点 (`VORG` / `vmtx` Baseline Origin)</span>
              <span
                className={`min-w-[64px] px-2 py-0.5 rounded-md border text-center font-mono tabular-nums text-[11px] font-bold shrink-0 ${themeClasses.accentBadge}`}
              >
                {vertOriginY} units
              </span>
            </label>
            <input
              type="range"
              min={0}
              max={1200}
              step={10}
              value={vertOriginY}
              onPointerDown={onCommitHistory}
              onFocus={onCommitHistory}
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
            <span>標準縦書き置換ルール一覧 (`vert` / `vrt2` GSUB Table)</span>
          </h4>
          <span className={`text-xs ${themeClasses.textMuted}`}>
            有効: {substitutions.filter((s) => s.enabled).length} /{' '}
            {substitutions.length} 件
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
          {substitutions.map((sub, idx) => {
            const presetInfo = findVertPresetInfo(sub, idx);
            const srcChar = presetInfo?.char || safeFromCodePoint(sub.sourceUnicode);
            const vertChar = presetInfo?.vertChar || safeFromCodePoint(sub.vertUnicode);
            const hasSource = existingUnicodes ? existingUnicodes.has(sub.sourceUnicode) : true;
            const hasTarget = existingUnicodes ? existingUnicodes.has(sub.vertUnicode) : true;
            const isSameCodepoint = sub.sourceUnicode === sub.vertUnicode;
            const statusBadge = !existingUnicodes
              ? null
              : isSameCodepoint
              ? hasSource
                ? { text: '自動.vert', cls: 'bg-sky-500/10 text-sky-600 border-sky-500/30' }
                : { text: '未作成', cls: 'bg-stone-500/10 text-stone-500 border-stone-500/20' }
              : hasTarget
              ? { text: '専用字形', cls: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' }
              : hasSource
              ? { text: '自動派生', cls: 'bg-sky-500/10 text-sky-600 border-sky-500/30' }
              : { text: '未作成', cls: 'bg-stone-500/10 text-stone-500 border-stone-500/20' };

            return (
              <div
                key={sub.id}
                className={`p-2.5 rounded-xl border transition-colors flex items-center justify-between ${
                  sub.enabled
                    ? `${themeClasses.cardBg} ${themeClasses.accentBorder}`
                    : `${themeClasses.subtoolbarBg} ${themeClasses.border} opacity-60`
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <button
                    onClick={() => onToggleVertSub(sub.id)}
                    className={`w-8 h-8 sm:w-5 sm:h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                      sub.enabled
                        ? `${themeClasses.accentBtn} border-transparent`
                        : themeClasses.border
                    }`}
                  >
                    {sub.enabled && <Check className="w-3.5 h-3.5" />}
                  </button>

                  <div className="min-w-0">
                    <div className="flex items-center space-x-1.5">
                      <span className="font-bold text-sm truncate">
                        {presetInfo?.name || srcChar}
                      </span>
                      {statusBadge && (
                        <span
                          className={`px-1 py-0.5 rounded text-[9px] font-bold border shrink-0 ${statusBadge.cls}`}
                        >
                          {statusBadge.text}
                        </span>
                      )}
                    </div>
                    <div
                      className={`flex items-center space-x-1.5 text-[11px] font-mono mt-0.5 ${themeClasses.textMuted}`}
                    >
                      <span
                        className={`px-1 py-0.5 rounded border ${themeClasses.subtoolbarBg} ${themeClasses.border}`}
                      >
                        {srcChar} (U+{sub.sourceUnicode.toString(16).toUpperCase()})
                      </span>
                      <ArrowRight className="w-3 h-3 shrink-0" />
                      <span className={`px-1 py-0.5 rounded border font-bold ${themeClasses.accentBadge}`}>
                        {vertChar}
                      </span>
                    </div>
                  </div>
                </div>

                <span className={`text-[10px] font-bold shrink-0 ml-2 ${themeClasses.textMuted}`}>
                  vert
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
