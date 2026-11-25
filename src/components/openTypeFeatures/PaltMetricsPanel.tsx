import React, { useState } from 'react';
import { Check, Sparkles, Type } from 'lucide-react';
import { ProportionalMetricsConfig } from '../../types';
import { ThemeClasses } from '../../utils/theme';

interface PaltMetricsPanelProps {
  paltConfig?: ProportionalMetricsConfig;
  opticalSideBearingPercent: number;
  themeClasses: ThemeClasses;
  onChangeOpticalSideBearingPercent: (value: number) => void;
  onAutoDerivePalt: () => void;
  onTogglePaltGlobal: () => void;
  onTogglePaltItem: (unicode: number) => void;
  onToggleVpalItem?: (unicode: number) => void;
}

export const PaltMetricsPanel: React.FC<PaltMetricsPanelProps> = ({
  paltConfig,
  opticalSideBearingPercent,
  themeClasses,
  onChangeOpticalSideBearingPercent,
  onAutoDerivePalt,
  onTogglePaltGlobal,
  onTogglePaltItem,
  onToggleVpalItem,
}) => {
  const [metricsView, setMetricsView] = useState<'palt' | 'vpal'>('palt');
  const safePercent =
    typeof opticalSideBearingPercent === 'number' && Number.isFinite(opticalSideBearingPercent)
      ? opticalSideBearingPercent
      : 5;
  const paltList = paltConfig?.paltList || [];
  const vpalList = paltConfig?.vpalList || [];
  const activeList = metricsView === 'palt' ? paltList : vpalList;

  return (
    <div className="space-y-4">
      <div
        className={`p-3.5 sm:p-4 rounded-xl border transition-colors space-y-3 ${themeClasses.subtoolbarBg} ${themeClasses.border}`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${
                paltConfig?.enabled
                  ? themeClasses.accentBadge
                  : `${themeClasses.cardBg} ${themeClasses.textMuted} ${themeClasses.border}`
              }`}
            >
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base">
                プロポーショナルメトリクス (`palt` / `vpal` GPOS Table)
              </h3>
              <p className={`text-xs mt-0.5 ${themeClasses.textMuted}`}>
                全角仮想ボディから字面外の余白を詰め、ツメ組み時のみGPOSの横 (`palt`)・縦 (`vpal`) で字送りを調整します
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onAutoDerivePalt}
              className={`flex-1 sm:flex-none justify-center px-3 py-2 sm:py-1.5 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.accentText} ${themeClasses.activeToolHover}`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>全グリフの字面から一括自動算出</span>
            </button>

            <button
              onClick={onTogglePaltGlobal}
              className={`flex-1 sm:flex-none justify-center px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                paltConfig?.enabled
                  ? themeClasses.accentBtn
                  : `${themeClasses.cardBg} border ${themeClasses.border} ${themeClasses.textMuted}`
              }`}
            >
              {paltConfig?.enabled ? 'palt/vpal 機能 ON' : 'palt/vpal 機能 OFF'}
            </button>
          </div>
        </div>

        {/* Optical Padding slider */}
        <div
          className={`pt-3 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${themeClasses.border}`}
        >
          <div className="space-y-0.5">
            <span className="font-bold">
              光学サイドベアリング余白比率（字面の上下左右に確保する最小余白）
            </span>
            <p className={`text-[11px] ${themeClasses.textMuted}`}>
              字面輪郭（インク領域）の外側に付与する均等マージン率（横 `palt`・縦 `vpal` 共通）
            </p>
          </div>
          <div className="flex items-center space-x-3 shrink-0">
            <input
              type="range"
              min="1"
              max="15"
              step="1"
              value={safePercent}
              onChange={(e) => onChangeOpticalSideBearingPercent(Number(e.target.value))}
              className="w-32 accent-emerald-600"
            />
            <span className={`font-mono font-bold w-12 text-right ${themeClasses.accentText}`}>
              {safePercent}%
            </span>
          </div>
        </div>
      </div>

      {/* Registered / Derived Palt & Vpal Glyph Metrics List */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <h4
              className={`text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 ${themeClasses.textMuted}`}
            >
              <Type className={`w-3.5 h-3.5 ${themeClasses.accentText}`} />
              <span>登録済みツメ量一覧</span>
            </h4>
            <div className={`inline-flex rounded-lg border p-0.5 ${themeClasses.subtoolbarBg} ${themeClasses.border}`}>
              <button
                onClick={() => setMetricsView('palt')}
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                  metricsView === 'palt'
                    ? themeClasses.accentBtn
                    : themeClasses.textMuted
                }`}
              >
                横 (palt: {paltList.length})
              </button>
              <button
                onClick={() => setMetricsView('vpal')}
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                  metricsView === 'vpal'
                    ? themeClasses.accentBtn
                    : themeClasses.textMuted
                }`}
              >
                縦 (vpal: {vpalList.length})
              </button>
            </div>
          </div>
          <span className={`text-[11px] font-mono ${themeClasses.textMuted}`}>
            有効: {activeList.filter((p) => p.enabled).length} / {activeList.length} 件
          </span>
        </div>

        {activeList.length === 0 ? (
          <div
            className={`p-8 rounded-xl border text-center space-y-3 ${themeClasses.subtoolbarBg} ${themeClasses.border}`}
          >
            <Sparkles className="w-8 h-8 text-amber-500 mx-auto" />
            <div className="space-y-1">
              <p className="font-bold text-sm">
                {metricsView === 'palt'
                  ? '横書きプロポーショナルメトリクス (palt) がまだ算出されていません'
                  : '縦書きプロポーショナルメトリクス (vpal) がまだ算出されていません'}
              </p>
              <p className={`text-xs ${themeClasses.textMuted}`}>
                「全グリフの字面から一括自動算出」をクリックすると、作成した文字のインク境界から横・縦のツメ幅を自動生成します。
              </p>
            </div>
            <button
              onClick={onAutoDerivePalt}
              className={`px-4 py-2 rounded-xl font-bold text-xs transition-colors cursor-pointer ${themeClasses.accentBtn}`}
            >
              今すぐ自動算出する
            </button>
          </div>
        ) : metricsView === 'palt' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
            {paltList.map((metric) => (
              <div
                key={metric.unicode}
                className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                  metric.enabled
                    ? `${themeClasses.cardBg} ${themeClasses.accentBorder}`
                    : `${themeClasses.subtoolbarBg} ${themeClasses.border} opacity-60`
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <button
                    onClick={() => onTogglePaltItem(metric.unicode)}
                    className={`w-6 h-6 sm:w-4 sm:h-4 rounded border flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
                      metric.enabled
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : themeClasses.border
                    }`}
                  >
                    {metric.enabled && <Check className="w-3 h-3" />}
                  </button>

                  <div
                    className={`w-8 h-8 rounded-lg border flex items-center justify-center text-lg font-bold shrink-0 ${themeClasses.subtoolbarBg} ${themeClasses.border}`}
                  >
                    {metric.char}
                  </div>

                  <div className="min-w-0 font-mono text-[11px]">
                    <div className="font-sans font-bold truncate">
                      U+{metric.unicode.toString(16).toUpperCase()}
                    </div>
                    <div className={`text-[10px] ${themeClasses.textMuted}`}>
                      {metric.originalAdvance} →{' '}
                      <strong className={themeClasses.accentText}>
                        {metric.proportionalAdvance}
                      </strong>{' '}
                      ({metric.deltaAdvance})
                    </div>
                  </div>
                </div>

                <div className={`text-right text-[10px] font-mono ${themeClasses.textMuted}`}>
                  <div>L:{metric.opticalMarginLeft}</div>
                  <div>R:{metric.opticalMarginRight}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
            {vpalList.map((metric) => (
              <div
                key={metric.unicode}
                className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                  metric.enabled
                    ? `${themeClasses.cardBg} ${themeClasses.accentBorder}`
                    : `${themeClasses.subtoolbarBg} ${themeClasses.border} opacity-60`
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <button
                    onClick={() => onToggleVpalItem?.(metric.unicode)}
                    disabled={!onToggleVpalItem}
                    className={`w-6 h-6 sm:w-4 sm:h-4 rounded border flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
                      metric.enabled
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : themeClasses.border
                    }`}
                  >
                    {metric.enabled && <Check className="w-3 h-3" />}
                  </button>

                  <div
                    className={`w-8 h-8 rounded-lg border flex items-center justify-center text-lg font-bold shrink-0 ${themeClasses.subtoolbarBg} ${themeClasses.border}`}
                  >
                    {metric.char}
                  </div>

                  <div className="min-w-0 font-mono text-[11px]">
                    <div className="font-sans font-bold truncate">
                      U+{metric.unicode.toString(16).toUpperCase()}
                    </div>
                    <div className={`text-[10px] ${themeClasses.textMuted}`}>
                      {metric.originalAdvance} →{' '}
                      <strong className={themeClasses.accentText}>
                        {metric.proportionalAdvance}
                      </strong>{' '}
                      ({metric.deltaAdvance})
                    </div>
                  </div>
                </div>

                <div className={`text-right text-[10px] font-mono ${themeClasses.textMuted}`}>
                  <div>T:{metric.opticalMarginTop}</div>
                  <div>B:{metric.opticalMarginBottom}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
