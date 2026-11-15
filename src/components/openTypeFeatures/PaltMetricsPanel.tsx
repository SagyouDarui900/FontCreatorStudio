import React from 'react';
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
}

export const PaltMetricsPanel: React.FC<PaltMetricsPanelProps> = ({
  paltConfig,
  opticalSideBearingPercent,
  themeClasses,
  onChangeOpticalSideBearingPercent,
  onAutoDerivePalt,
  onTogglePaltGlobal,
  onTogglePaltItem,
}) => {
  const paltList = paltConfig?.paltList || [];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div
        className={`p-5 rounded-2xl border transition-colors space-y-4 ${themeClasses.subtoolbarBg} ${themeClasses.border}`}
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
                全角（1000 UPM）の仮想ボディから字面外の余白を詰め、ツメ組み時に文字固有の字幅で送る機能です
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onAutoDerivePalt}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.accentText} ${themeClasses.activeToolHover}`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>全グリフの字面から一括自動算出</span>
            </button>

            <button
              onClick={onTogglePaltGlobal}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                paltConfig?.enabled
                  ? themeClasses.accentBtn
                  : `${themeClasses.cardBg} border ${themeClasses.border} ${themeClasses.textMuted}`
              }`}
            >
              {paltConfig?.enabled ? 'palt機能 ON' : 'palt機能 OFF'}
            </button>
          </div>
        </div>

        {/* Optical Padding slider */}
        <div
          className={`pt-3 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${themeClasses.border}`}
        >
          <div className="space-y-0.5">
            <span className="font-bold">
              光学サイドベアリング余白比率（字面の左右に確保する最小余白）
            </span>
            <p className={`text-[11px] ${themeClasses.textMuted}`}>
              手引き第12・14ページ準拠：字面輪郭（インク領域）の外側に付与する均等マージン率
            </p>
          </div>
          <div className="flex items-center space-x-3 shrink-0">
            <input
              type="range"
              min="1"
              max="15"
              step="1"
              value={opticalSideBearingPercent}
              onChange={(e) => onChangeOpticalSideBearingPercent(Number(e.target.value))}
              className="w-32 accent-emerald-600"
            />
            <span className={`font-mono font-bold w-12 text-right ${themeClasses.accentText}`}>
              {opticalSideBearingPercent}%
            </span>
          </div>
        </div>
      </div>

      {/* Registered / Derived Palt Glyph Metrics List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4
            className={`text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 ${themeClasses.textMuted}`}
          >
            <Type className={`w-3.5 h-3.5 ${themeClasses.accentText}`} />
            <span>登録済みグリフのツメ量一覧 ({paltList.length} 件)</span>
          </h4>
          <span className={`text-[11px] font-mono ${themeClasses.textMuted}`}>
            有効: {paltList.filter((p) => p.enabled).length} 件
          </span>
        </div>

        {paltList.length === 0 ? (
          <div
            className={`p-8 rounded-2xl border text-center space-y-3 ${themeClasses.subtoolbarBg} ${themeClasses.border}`}
          >
            <Sparkles className="w-8 h-8 text-amber-500 mx-auto" />
            <div className="space-y-1">
              <p className="font-bold text-sm">プロポーショナルメトリクス情報がまだ算出されていません</p>
              <p className={`text-xs ${themeClasses.textMuted}`}>
                「全グリフの字面から一括自動算出」をクリックすると、作成した漢字・かなのインク境界から自動でツメ幅を生成します。
              </p>
            </div>
            <button
              onClick={onAutoDerivePalt}
              className={`px-4 py-2 rounded-xl font-bold text-xs transition-colors cursor-pointer ${themeClasses.accentBtn}`}
            >
              今すぐ自動算出する
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {paltList.map((metric) => (
              <div
                key={metric.unicode}
                className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                  metric.enabled
                    ? `${themeClasses.cardBg} ${themeClasses.accentBorder}`
                    : `${themeClasses.subtoolbarBg} ${themeClasses.border} opacity-60`
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <button
                    onClick={() => onTogglePaltItem(metric.unicode)}
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
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
        )}
      </div>
    </div>
  );
};
