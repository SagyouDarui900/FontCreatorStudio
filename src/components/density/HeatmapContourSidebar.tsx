import React from 'react';
import { Layers, CheckCircle2, HelpCircle, Zap } from 'lucide-react';
import { GlyphDensityAnalysis } from '../../utils/qualityChecker';

export interface HeatmapContourSidebarProps {
  isLight: boolean;
  densityAnalysis: GlyphDensityAnalysis;
  lastActionMessage: string | null;
  selectedContourIndex: number | null;
  setSelectedContourIndex: React.Dispatch<React.SetStateAction<number | null>>;
  setHoveredContourIndex: React.Dispatch<React.SetStateAction<number | null>>;
  handleSimplifyContour: (contourIndex: number) => void;
}

export const HeatmapContourSidebar: React.FC<HeatmapContourSidebarProps> = React.memo(({
  isLight,
  densityAnalysis,
  lastActionMessage,
  selectedContourIndex,
  setSelectedContourIndex,
  setHoveredContourIndex,
  handleSimplifyContour,
}) => {
  return (
    <div
      className={`w-full lg:w-96 border-t lg:border-t-0 lg:border-l flex flex-col overflow-hidden text-xs ${
        isLight ? 'bg-white border-stone-200' : 'bg-[#121d15] border-[#223528]'
      }`}
    >
      {/* Density Overview Card */}
      <div className="p-4 border-b border-stone-200 dark:border-[#223528] space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-bold text-stone-700 dark:text-emerald-300">アンカー密度総合評価</span>
          <span
            className={`px-2.5 py-0.5 rounded-full font-bold text-xs ${
              densityAnalysis.overallDensityScore >= 70
                ? 'bg-rose-500 text-white'
                : densityAnalysis.overallDensityScore >= 40
                ? 'bg-amber-500 text-white'
                : 'bg-emerald-600 text-white'
            }`}
          >
            {densityAnalysis.overallDensityScore >= 70
              ? '極度過密'
              : densityAnalysis.overallDensityScore >= 40
              ? '密集・要整理'
              : '適正・軽量'}
          </span>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2">
          <div
            className={`p-2.5 rounded-xl border ${
              isLight ? 'bg-stone-50 border-stone-200' : 'bg-[#18261c] border-[#253a2b]'
            }`}
          >
            <div className="text-[11px] text-stone-500 dark:text-stone-400">総アンカー数</div>
            <div className="text-lg font-bold font-mono text-stone-900 dark:text-white flex items-baseline gap-1">
              <span>{densityAnalysis.totalNodes}</span>
              <span className="text-xs font-normal text-stone-400">個</span>
            </div>
          </div>

          <div
            className={`p-2.5 rounded-xl border ${
              isLight ? 'bg-stone-50 border-stone-200' : 'bg-[#18261c] border-[#253a2b]'
            }`}
          >
            <div className="text-[11px] text-stone-500 dark:text-stone-400">過密・密集ノード</div>
            <div className="text-lg font-bold font-mono text-rose-600 dark:text-rose-400 flex items-baseline gap-1">
              <span>{densityAnalysis.criticalNodeCount + densityAnalysis.denseNodeCount}</span>
              <span className="text-xs font-normal text-stone-400">
                / {densityAnalysis.totalNodes}
              </span>
            </div>
          </div>
        </div>

        {/* Density Bar Meter */}
        <div>
          <div className="flex justify-between text-[11px] mb-1 font-semibold">
            <span className="text-stone-600 dark:text-stone-300">密度分布</span>
            <span className="text-stone-400 font-mono">
              {densityAnalysis.criticalNodeCount}過密 / {densityAnalysis.denseNodeCount}密集 /{' '}
              {densityAnalysis.optimalNodeCount}適正
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden flex">
            {densityAnalysis.totalNodes > 0 && (
              <>
                <div
                  style={{
                    width: `${(densityAnalysis.criticalNodeCount / densityAnalysis.totalNodes) * 100}%`,
                  }}
                  className="bg-rose-500 h-full"
                  title={`過密: ${densityAnalysis.criticalNodeCount}ノード`}
                />
                <div
                  style={{
                    width: `${(densityAnalysis.denseNodeCount / densityAnalysis.totalNodes) * 100}%`,
                  }}
                  className="bg-amber-500 h-full"
                  title={`密集: ${densityAnalysis.denseNodeCount}ノード`}
                />
                <div
                  style={{
                    width: `${(densityAnalysis.moderateNodeCount / densityAnalysis.totalNodes) * 100}%`,
                  }}
                  className="bg-yellow-400 h-full"
                  title={`中度: ${densityAnalysis.moderateNodeCount}ノード`}
                />
                <div
                  style={{
                    width: `${(densityAnalysis.optimalNodeCount / densityAnalysis.totalNodes) * 100}%`,
                  }}
                  className="bg-emerald-500 h-full"
                  title={`適正: ${densityAnalysis.optimalNodeCount}ノード`}
                />
              </>
            )}
          </div>
        </div>

        {lastActionMessage && (
          <div
            className={`p-2 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 border animate-fade-in ${
              isLight
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-emerald-950/70 border-emerald-800 text-emerald-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="truncate">{lastActionMessage}</span>
          </div>
        )}
      </div>

      {/* Contours List Section */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2.5">
        <div className="flex items-center justify-between font-bold text-stone-700 dark:text-emerald-300 mb-1">
          <span className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            <span>輪郭別ノード内訳 ({densityAnalysis.contours.length} 輪郭)</span>
          </span>
          <span className="text-[10px] text-stone-400 font-normal">
            クリックで輪郭選択 / 単純化
          </span>
        </div>

        {densityAnalysis.contours.map((cAnalysis, cIdx) => {
          const isSelected = selectedContourIndex === cIdx;
          const isOverloaded = cAnalysis.densityScore >= 45 || cAnalysis.criticalCount > 0;

          return (
            <div
              key={`c-item-${cIdx}`}
              onClick={() => setSelectedContourIndex(cIdx)}
              onMouseEnter={() => setHoveredContourIndex(cIdx)}
              onMouseLeave={() => setHoveredContourIndex(null)}
              className={`p-3 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? isLight
                    ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-500/20 '
                    : 'bg-[#182c20] border-emerald-500 ring-2 ring-emerald-500/30 '
                  : isLight
                  ? 'bg-stone-50 border-stone-200 hover:border-stone-300'
                  : 'bg-[#152219] border-[#223528] hover:border-stone-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-xs">輪郭 #{cIdx + 1}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      cAnalysis.level === 'critical'
                        ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                        : cAnalysis.level === 'dense'
                        ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                        : cAnalysis.level === 'moderate'
                        ? 'bg-yellow-100 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-300'
                        : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                    }`}
                  >
                    {cAnalysis.level === 'critical'
                      ? '極度過密'
                      : cAnalysis.level === 'dense'
                      ? '密集'
                      : cAnalysis.level === 'moderate'
                      ? '中度'
                      : '適正'}
                  </span>
                </div>

                <span className="font-mono font-bold text-xs text-stone-700 dark:text-stone-300">
                  {cAnalysis.nodeCount} <span className="font-normal text-[10px] text-stone-400">ノード</span>
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400 mb-2">
                <span>平均間隔: {cAnalysis.avgNodeDistance}px</span>
                {cAnalysis.estimatedReduction > 0 ? (
                  <span className="text-amber-600 dark:text-amber-400 font-semibold">
                    約 -{cAnalysis.estimatedReduction} ノード削減見込み
                  </span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400">最適状態</span>
                )}
              </div>

              {/* Single Contour Simplify Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSimplifyContour(cIdx);
                }}
                className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors border ${
                  isOverloaded
                    ? isLight
                      ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-700'
                      : 'bg-amber-600 hover:bg-amber-500 text-white border-amber-500'
                    : isLight
                    ? 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-300'
                    : 'bg-[#1b2b20] hover:bg-[#253b2d] text-emerald-200 border-[#294231]'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>この輪郭を即時単純化</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Footer / Tip */}
      <div
        className={`p-3 border-t text-[11px] flex flex-col gap-2 ${
          isLight ? 'bg-stone-50 border-stone-200 text-stone-500' : 'bg-[#0e1610] border-[#223528] text-stone-400'
        }`}
      >
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 shrink-0 text-amber-500" />
          <span>
            SVGキャンバス上のアンカー頂点を直接クリックすると、その箇所のみをピンポイントで単純化できます。
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px] text-stone-400 dark:text-stone-500">
          <span className="font-semibold text-stone-500 dark:text-stone-400">ショートカット:</span>
          <span className="px-1.5 py-0.5 rounded bg-stone-200/70 dark:bg-stone-800 font-mono text-stone-700 dark:text-stone-300">Enter: 一括単純化</span>
          <span className="px-1.5 py-0.5 rounded bg-stone-200/70 dark:bg-stone-800 font-mono text-stone-700 dark:text-stone-300">1~3: 強度切替</span>
          <span className="px-1.5 py-0.5 rounded bg-stone-200/70 dark:bg-stone-800 font-mono text-stone-700 dark:text-stone-300">P: ノード点</span>
          <span className="px-1.5 py-0.5 rounded bg-stone-200/70 dark:bg-stone-800 font-mono text-stone-700 dark:text-stone-300">Ctrl+Z: 元に戻す</span>
          <span className="px-1.5 py-0.5 rounded bg-stone-200/70 dark:bg-stone-800 font-mono text-stone-700 dark:text-stone-300">+/-: ズーム</span>
          <span className="px-1.5 py-0.5 rounded bg-stone-200/70 dark:bg-stone-800 font-mono text-stone-700 dark:text-stone-300">F: 全画面</span>
          <span className="px-1.5 py-0.5 rounded bg-stone-200/70 dark:bg-stone-800 font-mono text-stone-700 dark:text-stone-300">Esc: 閉じる</span>
        </div>
      </div>
    </div>
  );
});

HeatmapContourSidebar.displayName = 'HeatmapContourSidebar';
