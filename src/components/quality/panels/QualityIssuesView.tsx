import React from 'react';
import {
  Sparkles,
  Search,
  Scale,
  Compass,
  Flame,
  Wand2,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { FontProject } from '../../../types';
import {
  FontQualityReport,
  QualityIssue,
  QualityIssueType,
  SeverityFilter,
  TabFilter,
} from '../types';
import { QualityIssueCard } from './QualityIssueCard';

export interface QualityIssuesViewProps {
  project: FontProject;
  isLight: boolean;
  report: FontQualityReport | null;
  filteredIssues: QualityIssue[];
  totalAutoFixableCount: number;
  healthStatus: {
    label: string;
    badgeBg: string;
    icon: React.ComponentType<{ className?: string }>;
  };
  excessiveNodesUnicodes: number[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  severityFilter: SeverityFilter;
  setSeverityFilter: (filter: SeverityFilter) => void;
  activeTab: TabFilter;
  setActiveTab: (tab: TabFilter) => void;
  isExtremaPanelOpen: boolean;
  setIsExtremaPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isEqualizePanelOpen: boolean;
  setIsEqualizePanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isOptimizePanelOpen: boolean;
  setIsOptimizePanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onBatchFix: (category?: QualityIssueType) => void;
  onFixIssue: (issue: QualityIssue) => void;
  onGoToGlyph: (unicode: number) => void;
  onOpenHeatmap: (unicode: number) => void;
  notify: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

export const QualityIssuesView: React.FC<QualityIssuesViewProps> = ({
  project,
  isLight,
  report,
  filteredIssues,
  totalAutoFixableCount,
  healthStatus,
  excessiveNodesUnicodes,
  searchQuery,
  setSearchQuery,
  searchInputRef,
  severityFilter,
  setSeverityFilter,
  activeTab,
  setActiveTab,
  isExtremaPanelOpen,
  setIsExtremaPanelOpen,
  isEqualizePanelOpen,
  setIsEqualizePanelOpen,
  isOptimizePanelOpen,
  setIsOptimizePanelOpen,
  onBatchFix,
  onFixIssue,
  onGoToGlyph,
  onOpenHeatmap,
  notify,
}) => {
  return (
    <>
      {/* Top Quality Health Summary & Compact Controls */}
      <div
        className={`p-2.5 sm:p-3 border-b shrink-0 transition-colors space-y-2 ${
          isLight ? 'bg-stone-50/70 border-stone-200' : 'bg-[#131d16] border-[#223326]'
        }`}
      >
        {/* Health Score & Quick Tool Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 ${
                healthStatus.badgeBg
              }`}
            >
              <healthStatus.icon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <span className="text-xs sm:text-sm font-bold truncate">
                  品質スコア: <span className="font-mono font-black">{report?.score ?? 100}</span>/100
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border ${healthStatus.badgeBg}`}
                >
                  {healthStatus.label}
                </span>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                {report && report.totalIssues > 0
                  ? `${report.totalIssues}件の改善推奨事項（${report.totalGlyphsChecked}字検査済）`
                  : 'すべての品質基準を満たしています'}
              </p>
            </div>
          </div>

          {/* Right side: Global Auto-Fix & Advanced Tools Chips */}
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            {report && totalAutoFixableCount > 0 && (
              <button
                onClick={() => onBatchFix(undefined)}
                title="修正（白抜き解消・極点最適化・線幅均一化・ベースライン整列）を一括実行します"
                className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition-all active:scale-98 cursor-pointer ${
                  isLight
                    ? 'bg-emerald-700 hover:bg-emerald-800 text-white border border-emerald-800'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                <span>全 {totalAutoFixableCount} 件を一括自動修正</span>
              </button>
            )}

            <div className="flex items-center gap-1 border-l pl-2 border-stone-300 dark:border-stone-700">
              <button
                onClick={() => {
                  setIsExtremaPanelOpen((prev) => !prev);
                  if (!isExtremaPanelOpen) {
                    setIsEqualizePanelOpen(false);
                    setIsOptimizePanelOpen(false);
                  }
                }}
                className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold flex items-center space-x-1 transition-all cursor-pointer ${
                  isExtremaPanelOpen
                    ? isLight
                      ? 'bg-cyan-700 text-white border-cyan-800'
                      : 'bg-cyan-600 text-white border-cyan-500'
                    : isLight
                    ? 'bg-white text-cyan-900 border-cyan-200 hover:bg-cyan-50'
                    : 'bg-[#17251d] text-cyan-200 border-cyan-900/60 hover:bg-[#1f3328]'
                }`}
                title="極点ノードの自動追加・軸整列ツールを開く"
              >
                <Compass className="w-3 h-3 text-cyan-500" />
                <span>極点最適化</span>
              </button>

              <button
                onClick={() => {
                  setIsEqualizePanelOpen((prev) => !prev);
                  if (!isEqualizePanelOpen) {
                    setIsOptimizePanelOpen(false);
                    setIsExtremaPanelOpen(false);
                  }
                }}
                className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold flex items-center space-x-1 transition-all cursor-pointer ${
                  isEqualizePanelOpen
                    ? isLight
                      ? 'bg-emerald-700 text-white border-emerald-800'
                      : 'bg-emerald-600 text-white border-emerald-500'
                    : isLight
                    ? 'bg-white text-emerald-900 border-emerald-200 hover:bg-emerald-50'
                    : 'bg-[#17251d] text-emerald-200 border-emerald-900/60 hover:bg-[#1f3328]'
                }`}
                title="線幅均一化・かすれ潰れ補正ツールを開く"
              >
                <Scale className="w-3 h-3 text-emerald-500" />
                <span>線幅均一化</span>
              </button>

              <button
                onClick={() => {
                  setIsOptimizePanelOpen((prev) => !prev);
                  if (!isOptimizePanelOpen) {
                    setIsEqualizePanelOpen(false);
                    setIsExtremaPanelOpen(false);
                  }
                }}
                className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold flex items-center space-x-1 transition-all cursor-pointer ${
                  isOptimizePanelOpen
                    ? isLight
                      ? 'bg-emerald-700 text-white border-emerald-800'
                      : 'bg-emerald-600 text-white border-emerald-500'
                    : isLight
                    ? 'bg-white text-emerald-900 border-emerald-200 hover:bg-emerald-50'
                    : 'bg-[#17251d] text-emerald-200 border-emerald-900/60 hover:bg-[#1f3328]'
                }`}
                title="冗長ノードの間引きツールを開く"
              >
                <Wand2 className="w-3 h-3 text-emerald-500" />
                <span>ノード軽量化</span>
              </button>

              <button
                onClick={() => {
                  if (excessiveNodesUnicodes.length > 0) {
                    onOpenHeatmap(excessiveNodesUnicodes[0]);
                  } else {
                    const firstKey = Object.keys(project.glyphs || {})[0];
                    if (firstKey) {
                      onOpenHeatmap(Number(firstKey));
                    } else {
                      notify('解析可能なグリフがありません', 'warning');
                    }
                  }
                }}
                className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold flex items-center space-x-1 transition-all cursor-pointer ${
                  isLight
                    ? 'bg-white text-amber-900 border-amber-300 hover:bg-amber-50'
                    : 'bg-[#17251d] text-amber-200 border-amber-900/60 hover:bg-[#1f3328]'
                }`}
                title="アンカー密度ヒートマップを開く"
              >
                <Flame className="w-3 h-3 text-amber-500" />
                <span>ヒートマップ</span>
                {excessiveNodesUnicodes.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-amber-500 text-white font-mono font-bold">
                    {excessiveNodesUnicodes.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div
        className={`flex flex-wrap items-center justify-between gap-2 px-3 sm:px-5 py-2 border-b text-xs ${
          isLight ? 'bg-white border-stone-200' : 'bg-[#141e17] border-[#25362b]'
        }`}
      >
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
          {/* Search Input */}
          <div className="relative min-w-[140px] max-w-xs flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="文字、Unicode、指摘内容検索... (/)"
              className={`w-full pl-8 pr-3 py-1.5 rounded-lg border text-xs outline-hidden transition-colors ${
                isLight
                  ? 'bg-stone-50 border-stone-200 focus:border-emerald-600 focus:bg-white text-stone-900'
                  : 'bg-[#111913] border-[#25362b] focus:border-emerald-500 text-emerald-100'
              }`}
            />
          </div>

          {/* Severity Filter Pills */}
          <div className="flex items-center space-x-1 bg-stone-100 dark:bg-[#162119] p-0.5 rounded-lg border border-stone-200 dark:border-[#223326] shrink-0">
            <button
              type="button"
              onClick={() => setSeverityFilter('all')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                severityFilter === 'all'
                  ? isLight
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'bg-[#1e2e23] text-emerald-300'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
              }`}
            >
              全重要度
            </button>
            <button
              type="button"
              onClick={() => setSeverityFilter('error')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center space-x-1 transition-all cursor-pointer ${
                severityFilter === 'error'
                  ? isLight
                    ? 'bg-rose-100 text-rose-900 border border-rose-300'
                    : 'bg-rose-950 text-rose-300 border border-rose-800'
                  : 'text-stone-500 hover:text-rose-600 dark:hover:text-rose-400'
              }`}
            >
              <span>エラー</span>
              {report && report.errorCount > 0 && (
                <span className="px-1 rounded-full text-[9px] bg-rose-500 text-white font-mono">
                  {report.errorCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setSeverityFilter('warning')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center space-x-1 transition-all cursor-pointer ${
                severityFilter === 'warning'
                  ? isLight
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-amber-950 text-amber-300 border border-amber-800'
                  : 'text-stone-500 hover:text-amber-600 dark:hover:text-amber-400'
              }`}
            >
              <span>警告</span>
              {report && report.warningCount > 0 && (
                <span className="px-1 rounded-full text-[9px] bg-amber-500 text-white font-mono">
                  {report.warningCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setSeverityFilter('info')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center space-x-1 transition-all cursor-pointer ${
                severityFilter === 'info'
                  ? isLight
                    ? 'bg-sky-100 text-sky-900 border border-sky-300'
                    : 'bg-sky-950 text-sky-300 border border-sky-800'
                  : 'text-stone-500 hover:text-sky-600 dark:hover:text-sky-400'
              }`}
            >
              <span>情報</span>
              {report && report.infoCount > 0 && (
                <span className="px-1 rounded-full text-[9px] bg-sky-500 text-white font-mono">
                  {report.infoCount}
                </span>
              )}
            </button>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center space-x-1 overflow-x-auto py-0.5 custom-scrollbar touch-scroll-x min-w-0">
            {[
              { id: 'all', label: 'すべて', count: report?.totalIssues ?? 0 },
              { id: 'duplicate_shape', label: '字形重複', count: report?.categoryCounts.duplicate_shape ?? 0 },
              { id: 'path_intersection', label: '重なり白抜き', count: report?.categoryCounts.path_intersection ?? 0 },
              { id: 'missing_extrema', label: '極点ノード', count: report?.categoryCounts.missing_extrema ?? 0 },
              { id: 'uneven_stroke', label: '線幅均一性', count: report?.categoryCounts.uneven_stroke ?? 0 },
              { id: 'excessive_nodes', label: 'ノード数', count: report?.categoryCounts.excessive_nodes ?? 0 },
              { id: 'baseline_deviation', label: 'ベースライン', count: report?.categoryCounts.baseline_deviation ?? 0 },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabFilter)}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors whitespace-nowrap shrink-0 flex items-center space-x-1 cursor-pointer ${
                  activeTab === tab.id
                    ? isLight
                      ? 'bg-emerald-800 text-white'
                      : 'bg-emerald-600 text-white'
                    : isLight
                    ? 'text-stone-600 hover:bg-stone-100'
                    : 'text-stone-400 hover:bg-[#1f2d22]'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold ${
                      activeTab === tab.id
                        ? 'bg-white/20 text-white'
                        : isLight
                        ? 'bg-stone-200 text-stone-700'
                        : 'bg-stone-800 text-stone-300'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Category-Specific Quick Batch Fix Button if filtered */}
        <div className="flex items-center space-x-1.5 shrink-0 ml-auto">
          {activeTab === 'path_intersection' && (report?.categoryCounts.path_intersection ?? 0) > 0 && (
            <button
              onClick={() => onBatchFix('path_intersection')}
              className={`px-3 py-1.5 rounded-lg font-bold text-[11px] flex items-center space-x-1.5 transition-colors border cursor-pointer ${
                isLight
                  ? 'bg-amber-600 text-white border-amber-700 hover:bg-amber-700'
                  : 'bg-amber-600 text-white border-amber-500 hover:bg-amber-500'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-200" />
              <span>白抜き一括解消 ({report?.categoryCounts.path_intersection}件)</span>
            </button>
          )}

          {activeTab === 'missing_extrema' && (report?.categoryCounts.missing_extrema ?? 0) > 0 && (
            <button
              onClick={() => onBatchFix('missing_extrema')}
              className={`px-3 py-1.5 rounded-lg font-bold text-[11px] flex items-center space-x-1.5 transition-colors border cursor-pointer ${
                isLight
                  ? 'bg-cyan-700 text-white border-cyan-800 hover:bg-cyan-800'
                  : 'bg-cyan-600 text-white border-cyan-500 hover:bg-cyan-500'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>極点一括最適化 ({report?.categoryCounts.missing_extrema}件)</span>
            </button>
          )}

          {activeTab === 'uneven_stroke' && (report?.categoryCounts.uneven_stroke ?? 0) > 0 && (
            <button
              onClick={() => onBatchFix('uneven_stroke')}
              className={`px-3 py-1.5 rounded-lg font-bold text-[11px] flex items-center space-x-1.5 transition-colors border cursor-pointer ${
                isLight
                  ? 'bg-emerald-700 text-white border-emerald-800 hover:bg-emerald-800'
                  : 'bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-500'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>線幅一括均一化 ({report?.categoryCounts.uneven_stroke}件)</span>
            </button>
          )}

          {activeTab === 'excessive_nodes' && (report?.categoryCounts.excessive_nodes ?? 0) > 0 && (
            <button
              onClick={() => onBatchFix('excessive_nodes')}
              className={`px-3 py-1.5 rounded-lg font-bold text-[11px] flex items-center space-x-1.5 transition-colors border cursor-pointer ${
                isLight
                  ? 'bg-purple-700 text-white border-purple-800 hover:bg-purple-800'
                  : 'bg-purple-600 text-white border-purple-500 hover:bg-purple-500'
              }`}
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>過剰ノード一括間引き ({report?.categoryCounts.excessive_nodes}件)</span>
            </button>
          )}

          {activeTab === 'baseline_deviation' && (report?.categoryCounts.baseline_deviation ?? 0) > 0 && (
            <button
              onClick={() => onBatchFix('baseline_deviation')}
              className={`px-3 py-1.5 rounded-lg font-bold text-[11px] flex items-center space-x-1.5 transition-colors border cursor-pointer ${
                isLight
                  ? 'bg-blue-700 text-white border-blue-800 hover:bg-blue-800'
                  : 'bg-blue-600 text-white border-blue-500 hover:bg-blue-500'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>ベースライン一括整列 ({report?.categoryCounts.baseline_deviation}件)</span>
            </button>
          )}
        </div>
      </div>

      {/* Issue List View */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 sm:p-5 space-y-3">
        {filteredIssues.length === 0 ? (
          <div className="py-16 text-center">
            <div
              className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center border mb-3 ${
                isLight
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-emerald-950/50 border-emerald-800 text-emerald-400'
              }`}
            >
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold">
              {report && report.totalIssues === 0
                ? '問題は検出されませんでした'
                : '該当する指摘項目はありません'}
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm mx-auto mt-1">
              {report && report.totalIssues === 0
                ? 'すべてのグリフがベースライン、ノード数、ストローク線幅、パス基準を満たしており、フォント出力準備が整っています。'
                : 'フィルタ条件または検索語句を変更して他の項目を確認してください。'}
            </p>
          </div>
        ) : (
          filteredIssues.map((issue) => (
            <QualityIssueCard
              key={issue.id}
              issue={issue}
              project={project}
              isLight={isLight}
              onFixIssue={onFixIssue}
              onGoToGlyph={onGoToGlyph}
              onOpenHeatmap={onOpenHeatmap}
            />
          ))
        )}
      </div>
    </>
  );
};
