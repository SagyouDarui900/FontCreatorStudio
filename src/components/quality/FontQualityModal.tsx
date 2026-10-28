import React, { useEffect } from 'react';
import {
  X,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Sliders,
  Sparkles,
  Search,
  ExternalLink,
  Wand2,
  Maximize2,
  Minimize2,
  Activity,
  Scale,
  Compass,
  Flame,
} from 'lucide-react';
import { GlyphDensityHeatmapModal } from '../GlyphDensityHeatmapModal';
import {
  contoursToSvgPath,
  normalizeGlyphContoursWinding,
} from '../../utils/pathUtils';
import { ProjectDiagnosticsPanel } from '../ProjectDiagnosticsPanel';
import { StrokeEqualizerPanel } from './panels/StrokeEqualizerPanel';
import { NodeOptimizerPanel } from './panels/NodeOptimizerPanel';
import { ExtremaOptimizerPanel } from './panels/ExtremaOptimizerPanel';
import { FontQualityModalProps, TabFilter } from './types';
import { useQualityState } from './hooks/useQualityState';
import { useQualityActions } from './hooks/useQualityActions';

export const FontQualityModal: React.FC<FontQualityModalProps> = (props) => {
  const {
    isOpen,
    onClose,
    project,
    setProject,
    onSelectGlyph,
    theme,
    onShowToast,
    commitHistory,
  } = props;

  const state = useQualityState(project, theme);
  const actions = useQualityActions({
    project,
    setProject,
    onSelectGlyph,
    onClose,
    onShowToast,
    commitHistory,
    state,
  });

  const {
    isLight,
    activeTab,
    setActiveTab,
    severityFilter,
    setSeverityFilter,
    searchQuery,
    setSearchQuery,
    isScanning,
    report,
    isOptimizePanelOpen,
    setIsOptimizePanelOpen,
    optLevel,
    setOptLevel,
    optScope,
    setOptScope,
    isOptimizing,
    lastOptimizationResult,
    isEqualizePanelOpen,
    setIsEqualizePanelOpen,
    eqMode,
    setEqMode,
    eqStrength,
    setEqStrength,
    eqScope,
    setEqScope,
    isEqualizing,
    lastEqualizationResult,
    isExtremaPanelOpen,
    setIsExtremaPanelOpen,
    extAlignAxis,
    setExtAlignAxis,
    extSensitivity,
    setExtSensitivity,
    extScope,
    setExtScope,
    isOptimizingExtrema,
    lastExtremaResult,
    heatmapModalUnicode,
    setHeatmapModalUnicode,
    mainView,
    setMainView,
    diagScope,
    setDiagScope,
    diagFilter,
    setDiagFilter,
    diagCategoryFilter,
    setDiagCategoryFilter,
    diagSortBy,
    setDiagSortBy,
    diagSearchQuery,
    setDiagSearchQuery,
    diagReport,
    isDiagScanning,
    isFullscreen,
    setIsFullscreen,
    searchInputRef,
    scanTimerRef,
    excessiveNodesUnicodes,
    filteredIssues,
    totalAutoFixableCount,
    healthStatus,
  } = state;

  const {
    notify,
    runScan,
    runDiagnostics,
    handleFixIssue,
    handleBatchFix,
    handleRunNodeOptimization,
    handleRunStrokeEqualization,
    handleRunExtremaOptimization,
    handleGoToGlyph,
  } = actions;

  // Keyboard shortcuts: Escape, F (fullscreen), R (rescan), H (heatmap), D (diagnostics toggle), / (search focus), 1-7 (tabs)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      const isInput = activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select';

      if (e.key === 'Escape') {
        e.preventDefault();
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          onClose();
        }
        return;
      }

      if (!isInput) {
        if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          setIsFullscreen((prev) => !prev);
        } else if ((e.key === 'r' || e.key === 'R') && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          runScan();
          runDiagnostics();
          notify('再検査およびプロジェクト診断を実行しました', 'info');
        } else if ((e.key === 'd' || e.key === 'D') && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          setMainView((prev) => (prev === 'quality' ? 'diagnostics' : 'quality'));
        } else if ((e.key === 'h' || e.key === 'H') && !e.ctrlKey && !e.metaKey && !e.altKey) {
          if (excessiveNodesUnicodes.length > 0) {
            e.preventDefault();
            setHeatmapModalUnicode(excessiveNodesUnicodes[0]);
          }
        } else if (e.key === '/') {
          e.preventDefault();
          if (mainView === 'diagnostics') {
            const diagInput = document.querySelector<HTMLInputElement>('input[data-diag-search]');
            if (diagInput) {
              diagInput.focus();
            }
          } else {
            searchInputRef.current?.focus();
          }
        } else if (!e.ctrlKey && !e.metaKey && !e.altKey && mainView === 'quality') {
          const tabMap: Record<string, TabFilter> = {
            '1': 'all',
            '2': 'duplicate_shape',
            '3': 'path_intersection',
            '4': 'excessive_nodes',
            '5': 'missing_extrema',
            '6': 'uneven_stroke',
            '7': 'baseline_deviation',
          };
          if (tabMap[e.key]) {
            e.preventDefault();
            setActiveTab(tabMap[e.key]);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isOpen,
    isFullscreen,
    onClose,
    runScan,
    runDiagnostics,
    excessiveNodesUnicodes,
    mainView,
    notify,
    setIsFullscreen,
    setMainView,
    setHeatmapModalUnicode,
    searchInputRef,
    setActiveTab,
  ]);

  useEffect(() => {
    if (!isOpen) {
      if (scanTimerRef.current) {
        clearTimeout(scanTimerRef.current);
        scanTimerRef.current = null;
      }
      return;
    }

    if (scanTimerRef.current) {
      clearTimeout(scanTimerRef.current);
    }
    scanTimerRef.current = setTimeout(() => {
      scanTimerRef.current = null;
      runScan();
      runDiagnostics();
    }, 350);

    return () => {
      if (scanTimerRef.current) {
        clearTimeout(scanTimerRef.current);
        scanTimerRef.current = null;
      }
    };
  }, [isOpen, project.updatedAt, diagScope, runScan, runDiagnostics, scanTimerRef]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 transition-all ${
        isFullscreen
          ? 'p-0 w-screen h-screen bg-black/85 flex flex-col'
          : 'flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150'
      }`}
    >
      <div
        className={`flex flex-col transition-all overflow-hidden ${
          isFullscreen
            ? isLight
              ? 'w-screen h-screen rounded-none border-none shadow-none bg-white text-stone-900'
              : 'w-screen h-screen rounded-none border-none shadow-none bg-[#151f18] text-emerald-100'
            : isLight
            ? 'w-full max-w-4xl xl:max-w-5xl rounded-xl border border-stone-200 shadow-xl max-h-[90vh] bg-white text-stone-900'
            : 'w-full max-w-4xl xl:max-w-5xl rounded-xl border border-[#25362b] shadow-xl max-h-[90vh] bg-[#151f18] text-emerald-100'
        }`}
      >
        {/* Header */}
        <div
          className={`flex flex-col md:flex-row md:items-center justify-between gap-2 px-3 py-2.5 sm:px-4 sm:py-3 border-b ${
            isLight ? 'bg-stone-50/80 border-stone-200' : 'bg-[#111a14] border-[#25362b]'
          }`}
        >
          <div className="flex items-center justify-between md:justify-start space-x-3 min-w-0">
            <div className="flex items-center space-x-2 min-w-0">
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center border shrink-0 transition-colors ${
                  mainView === 'diagnostics'
                    ? isLight
                      ? 'bg-amber-100 border-amber-300 text-amber-800'
                      : 'bg-amber-950/80 border-amber-800 text-amber-300'
                    : isLight
                    ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                    : 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
                }`}
              >
                {mainView === 'diagnostics' ? (
                  <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  {/* View Switcher Segment */}
                  <div className="flex items-center bg-stone-200/80 dark:bg-[#1c2920] p-0.5 rounded-lg border border-stone-300/80 dark:border-[#2a3c2e]">
                    <button
                      type="button"
                      onClick={() => setMainView('quality')}
                      className={`px-2 py-1 sm:px-2.5 sm:py-1 rounded-md text-[11px] sm:text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                        mainView === 'quality'
                          ? isLight
                            ? 'bg-white text-emerald-950'
                            : 'bg-[#152319] text-emerald-300'
                          : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>品質検査</span>
                      {report && report.totalIssues > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-mono font-bold">
                          {report.totalIssues}
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setMainView('diagnostics')}
                      className={`px-2 py-1 sm:px-2.5 sm:py-1 rounded-md text-[11px] sm:text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                        mainView === 'diagnostics'
                          ? isLight
                            ? 'bg-white text-amber-950'
                            : 'bg-[#152319] text-amber-300'
                          : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                      }`}
                    >
                      <Activity className="w-3.5 h-3.5 text-amber-600" />
                      <span>プロジェクト診断</span>
                      {diagReport && diagReport.totalAttentionCount > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-mono font-bold">
                          {diagReport.totalAttentionCount}
                        </span>
                      )}
                    </button>
                  </div>

                  {mainView === 'quality' && report && (
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold border ${
                        report.score >= 90
                          ? isLight
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          : report.score >= 70
                          ? isLight
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : 'bg-amber-950 text-amber-300 border-amber-800'
                          : isLight
                          ? 'bg-rose-100 text-rose-900 border-rose-300'
                          : 'bg-rose-950 text-rose-300 border-rose-800'
                      }`}
                    >
                      スコア: {report.score}/100
                    </span>
                  )}

                  {mainView === 'diagnostics' && diagReport && (
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold border ${
                        isLight
                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                          : 'bg-amber-950 text-amber-300 border-amber-800'
                      }`}
                    >
                      完成率: {diagReport.overallCompletionRate}%
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Mobile close button */}
            <button
              onClick={onClose}
              className={`md:hidden p-1.5 rounded-xl border transition-colors shrink-0 cursor-pointer ${
                isLight
                  ? 'bg-white border-stone-200 text-stone-500 hover:bg-stone-100'
                  : 'bg-[#1a261f] border-[#25362b] text-stone-400 hover:bg-[#223328]'
              }`}
              title="閉じる (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0">
            <button
              onClick={() => runScan()}
              disabled={isScanning}
              className={`px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl border text-[11px] sm:text-xs font-semibold flex items-center space-x-1.5 transition-colors shrink-0 cursor-pointer ${
                isLight
                  ? 'bg-white border-stone-200 text-stone-700 hover:bg-stone-100'
                  : 'bg-[#1a261f] border-[#25362b] text-emerald-200 hover:bg-[#223328]'
              }`}
              title="フォント全体を再検査 (R)"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">再検査</span>
            </button>

            {/* Fullscreen Toggle Button */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className={`hidden sm:flex p-2 sm:px-2.5 sm:py-2 rounded-xl border text-xs font-semibold items-center space-x-1.5 transition-colors shrink-0 cursor-pointer ${
                isFullscreen
                  ? isLight
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    : 'bg-emerald-950 text-emerald-300 border-emerald-700'
                  : isLight
                  ? 'bg-white border-stone-200 text-stone-700 hover:bg-stone-100'
                  : 'bg-[#1a261f] border-[#25362b] text-emerald-200 hover:bg-[#223328]'
              }`}
              title={isFullscreen ? '通常表示に戻す (F または Esc)' : '全画面表示に拡大 (F)'}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>通常</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>全画面</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className={`hidden md:block p-2 rounded-xl border transition-colors shrink-0 cursor-pointer ${
                isLight
                  ? 'bg-white border-stone-200 text-stone-500 hover:bg-stone-100'
                  : 'bg-[#1a261f] border-[#25362b] text-stone-400 hover:bg-[#223328]'
              }`}
              title="閉じる (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stroke Equalization Panel */}
        <StrokeEqualizerPanel
          isOpen={isEqualizePanelOpen}
          isLight={isLight}
          onClose={() => setIsEqualizePanelOpen(false)}
          eqMode={eqMode}
          setEqMode={setEqMode}
          eqScope={eqScope}
          setEqScope={setEqScope}
          eqStrength={eqStrength}
          setEqStrength={setEqStrength}
          isEqualizing={isEqualizing}
          onRunEqualization={handleRunStrokeEqualization}
          lastEqualizationResult={lastEqualizationResult}
          totalGlyphsChecked={report?.totalGlyphsChecked || 0}
          unevenStrokeCount={report?.categoryCounts.uneven_stroke || 0}
          filteredCount={filteredIssues.length}
        />

        {/* Node Optimization Panel */}
        <NodeOptimizerPanel
          isOpen={isOptimizePanelOpen}
          isLight={isLight}
          onClose={() => setIsOptimizePanelOpen(false)}
          optLevel={optLevel}
          setOptLevel={setOptLevel}
          optScope={optScope}
          setOptScope={setOptScope}
          isOptimizing={isOptimizing}
          onRunOptimization={handleRunNodeOptimization}
          lastOptimizationResult={lastOptimizationResult}
          totalGlyphsChecked={report?.totalGlyphsChecked || 0}
          excessiveNodesCount={report?.categoryCounts.excessive_nodes || 0}
          filteredCount={filteredIssues.length}
        />

        {/* Extrema Optimization Panel */}
        <ExtremaOptimizerPanel
          isOpen={isExtremaPanelOpen}
          isLight={isLight}
          onClose={() => setIsExtremaPanelOpen(false)}
          extAlignAxis={extAlignAxis}
          setExtAlignAxis={setExtAlignAxis}
          extSensitivity={extSensitivity}
          setExtSensitivity={setExtSensitivity}
          extScope={extScope}
          setExtScope={setExtScope}
          isOptimizingExtrema={isOptimizingExtrema}
          onRunExtremaOptimization={handleRunExtremaOptimization}
          lastExtremaResult={lastExtremaResult}
          totalGlyphsChecked={report?.totalGlyphsChecked || 0}
          missingExtremaCount={report?.categoryCounts.missing_extrema || 0}
          filteredCount={filteredIssues.length}
        />

        {/* Main View Mode: Project Diagnostics or Quality Issues */}
        {mainView === 'diagnostics' ? (
          <ProjectDiagnosticsPanel
            project={project}
            setProject={setProject}
            isLight={isLight}
            diagReport={diagReport}
            diagScope={diagScope}
            setDiagScope={setDiagScope}
            diagFilter={diagFilter}
            setDiagFilter={setDiagFilter}
            diagCategoryFilter={diagCategoryFilter}
            setDiagCategoryFilter={setDiagCategoryFilter}
            diagSortBy={diagSortBy}
            setDiagSortBy={setDiagSortBy}
            diagSearchQuery={diagSearchQuery}
            setDiagSearchQuery={setDiagSearchQuery}
            isDiagScanning={isDiagScanning}
            onRescan={runDiagnostics}
            onSelectGlyph={onSelectGlyph}
            onCloseModal={onClose}
            onShowToast={onShowToast}
            commitHistory={commitHistory}
          />
        ) : (
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
                      onClick={() => handleBatchFix(undefined)}
                      title="安全な修正（白抜き解消・極点最適化・線幅均一化・ベースライン整列）を一括実行します"
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
                          setHeatmapModalUnicode(excessiveNodesUnicodes[0]);
                        } else {
                          const firstKey = Object.keys(project.glyphs || {})[0];
                          if (firstKey) {
                            setHeatmapModalUnicode(Number(firstKey));
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
                    onClick={() => handleBatchFix('path_intersection')}
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
                    onClick={() => handleBatchFix('missing_extrema')}
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
                    onClick={() => handleBatchFix('uneven_stroke')}
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
                    onClick={() => handleBatchFix('excessive_nodes')}
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
                    onClick={() => handleBatchFix('baseline_deviation')}
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
                filteredIssues.map((issue) => {
                  const glyphData = project.glyphs?.[issue.unicode];
                  const contours = glyphData?.contours || [];
                  const svgPath = contoursToSvgPath(normalizeGlyphContoursWinding(contours));

                  return (
                    <div
                      key={issue.id}
                      className={`p-3.5 sm:p-4 rounded-xl border flex flex-col sm:flex-row gap-4 transition-all ${
                        isLight
                          ? 'bg-white border-stone-200 hover:border-stone-300'
                          : 'bg-[#162119] border-[#25362b] hover:border-stone-700'
                      }`}
                    >
                      {/* Glyph Preview Tile */}
                      <div className="flex sm:flex-col items-center justify-between sm:justify-start gap-2 shrink-0">
                        <div
                          className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl border overflow-hidden flex items-center justify-center ${
                            isLight ? 'bg-stone-50 border-stone-200' : 'bg-[#0f1611] border-[#223025]'
                          }`}
                        >
                          {/* Grid / Metrics Guide Overlay */}
                          <svg
                            viewBox="0 0 1000 1000"
                            className="w-full h-full pointer-events-none absolute inset-0"
                          >
                            {/* Baseline Guide (Y = 800) */}
                            <line
                              x1="0"
                              y1="800"
                              x2="1000"
                              y2="800"
                              stroke={isLight ? '#ef4444' : '#f87171'}
                              strokeWidth="12"
                              strokeDasharray="24 24"
                              opacity="0.65"
                            />
                            {/* Ascender / Descender Lines */}
                            <line
                              x1="0"
                              y1="200"
                              x2="1000"
                              y2="200"
                              stroke={isLight ? '#94a3b8' : '#475569'}
                              strokeWidth="8"
                              strokeDasharray="16 16"
                              opacity="0.4"
                            />
                            {/* Render Glyph Contour Path */}
                            {svgPath && (
                              <path
                                d={svgPath}
                                fill={isLight ? '#1c1917' : '#ecfdf5'}
                                fillRule="nonzero"
                              />
                            )}
                            {/* Intersection Marker Points */}
                            {issue.details?.intersectionPoints?.map((pt, pIdx) => (
                              <circle
                                key={pIdx}
                                cx={pt.x}
                                cy={pt.y}
                                r="32"
                                fill="#ef4444"
                                stroke="#ffffff"
                                strokeWidth="8"
                              />
                            ))}
                            {/* Thin stroke marker points */}
                            {issue.details?.thinPoints?.map((pt, pIdx) => (
                              <circle
                                key={`thin-${pIdx}`}
                                cx={pt.x}
                                cy={pt.y}
                                r="28"
                                fill="#f59e0b"
                                stroke="#ffffff"
                                strokeWidth="6"
                              />
                            ))}
                            {/* Thick stroke marker points */}
                            {issue.details?.thickPoints?.map((pt, pIdx) => (
                              <circle
                                key={`thick-${pIdx}`}
                                cx={pt.x}
                                cy={pt.y}
                                r="28"
                                fill="#8b5cf6"
                                stroke="#ffffff"
                                strokeWidth="6"
                              />
                            ))}
                            {/* Extrema marker points */}
                            {issue.details?.extremaPoints?.map((pt, pIdx) => (
                              <g key={`ext-${pIdx}`}>
                                <circle
                                  cx={pt.x}
                                  cy={pt.y}
                                  r="26"
                                  fill="#06b6d4"
                                  stroke="#ffffff"
                                  strokeWidth="6"
                                />
                                <line
                                  x1={pt.x - 14}
                                  y1={pt.y}
                                  x2={pt.x + 14}
                                  y2={pt.y}
                                  stroke="#ffffff"
                                  strokeWidth="4"
                                />
                                <line
                                  x1={pt.x}
                                  y1={pt.y - 14}
                                  x2={pt.x}
                                  y2={pt.y + 14}
                                  stroke="#ffffff"
                                  strokeWidth="4"
                                />
                              </g>
                            ))}
                            {/* Excessive Nodes / Density Heatmap Dots in Mini Preview */}
                            {issue.type === 'excessive_nodes' && issue.details?.densityAnalysis && (
                              <g>
                                {issue.details.densityAnalysis.contours.flatMap((c) =>
                                  c.nodes.map((n, nIdx) => (
                                    <circle
                                      key={`dn-${c.contourIndex}-${nIdx}`}
                                      cx={n.x}
                                      cy={n.y}
                                      r={n.level === 'critical' ? 24 : n.level === 'dense' ? 18 : 12}
                                      fill={n.color}
                                      opacity={n.level === 'optimal' ? 0.6 : 0.95}
                                    />
                                  ))
                                )}
                              </g>
                            )}
                          </svg>
                        </div>

                        <div className="text-center sm:w-20">
                          <div className="text-xs font-bold truncate">{issue.char}</div>
                          <div className="text-[10px] text-stone-400 font-mono">
                            U+{issue.unicode.toString(16).toUpperCase()}
                          </div>
                        </div>
                      </div>

                      {/* Issue Information Body */}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {/* Severity Badge */}
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              issue.severity === 'error'
                                ? isLight
                                  ? 'bg-rose-100 text-rose-900 border-rose-200'
                                  : 'bg-rose-950 text-rose-300 border-rose-800'
                                : issue.severity === 'warning'
                                ? isLight
                                  ? 'bg-amber-100 text-amber-900 border-amber-200'
                                  : 'bg-amber-950 text-amber-300 border-amber-800'
                                : isLight
                                ? 'bg-sky-100 text-sky-900 border-sky-200'
                                : 'bg-sky-950 text-sky-300 border-sky-800'
                            }`}
                          >
                            {issue.severity === 'error'
                              ? 'エラー'
                              : issue.severity === 'warning'
                              ? '警告'
                              : '情報'}
                          </span>

                          {/* Issue Category Pill */}
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                              isLight
                                ? 'bg-stone-100 text-stone-700 border-stone-200'
                                : 'bg-[#1e2a21] text-stone-300 border-[#25362b]'
                            }`}
                          >
                            {issue.type === 'duplicate_shape'
                              ? '字形の重複'
                              : issue.type === 'path_intersection'
                              ? 'パス交差'
                              : issue.type === 'excessive_nodes'
                              ? '過剰ノード数'
                              : issue.type === 'missing_extrema'
                              ? '極点ノード不足'
                              : issue.type === 'uneven_stroke'
                              ? '線幅の偏り'
                              : issue.type === 'baseline_deviation'
                              ? 'ベースライン逸脱'
                              : issue.type === 'isolated_node'
                              ? '孤立頂点'
                              : '境界逸脱'}
                          </span>

                          {/* Issue Title */}
                          <h4 className="text-xs font-bold text-stone-900 dark:text-white">
                            {issue.title}
                          </h4>
                        </div>

                        <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                          {issue.description}
                        </p>

                        {/* Density Heatmap Statistics details if excessive_nodes */}
                        {issue.type === 'excessive_nodes' && issue.details?.densityAnalysis && (
                          <div className="flex flex-wrap items-center gap-2 text-[11px] pt-0.5">
                            <div
                              className={`px-2 py-1 rounded-md border font-mono flex items-center gap-1.5 ${
                                isLight
                                  ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                                  : 'bg-amber-950/40 border-amber-800/80 text-amber-200'
                              }`}
                            >
                              <Flame className="w-3 h-3 text-amber-500" />
                              <span>総アンカー: <strong>{issue.details.nodeCount || 0}個</strong></span>
                              <span className="text-stone-300 dark:text-stone-600">/</span>
                              <span>
                                過密箇所: <strong className="text-rose-500 font-bold">{issue.details.densityAnalysis.criticalNodeCount}点</strong>
                              </span>
                              <span className="text-stone-300 dark:text-stone-600">/</span>
                              <span>単一輪郭最大: <strong>{issue.details.maxContourNodes}点</strong></span>
                            </div>
                          </div>
                        )}

                        {/* Stroke Width Stats details if available */}
                        {issue.details?.minStrokeWidth !== undefined && (
                          <div className="flex flex-wrap items-center gap-2 text-[11px] pt-0.5">
                            <div
                              className={`px-2 py-1 rounded-md border font-mono flex items-center gap-1.5 ${
                                isLight
                                  ? 'bg-stone-50 border-stone-200 text-stone-700'
                                  : 'bg-[#101912] border-[#223326] text-emerald-200'
                              }`}
                            >
                              <Scale className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              <span>
                                最小: <strong className="text-amber-600 dark:text-amber-400">{issue.details.minStrokeWidth}px</strong>
                              </span>
                              <span className="text-stone-300 dark:text-stone-600">/</span>
                              <span>
                                中央値: <strong>{issue.details.medianStrokeWidth}px</strong>
                              </span>
                              <span className="text-stone-300 dark:text-stone-600">/</span>
                              <span>
                                最大: <strong className="text-purple-600 dark:text-purple-400">{issue.details.maxStrokeWidth}px</strong>
                              </span>
                            </div>
                          </div>
                        )}

                        {issue.recommendation && (
                          <p className="text-[11px] text-stone-500 dark:text-stone-400 bg-stone-50 dark:bg-[#111913] p-2 rounded-lg border border-stone-200/60 dark:border-[#223025]">
                            <span className="font-bold text-stone-700 dark:text-stone-300">改善指針: </span>
                            {issue.recommendation}
                          </p>
                        )}
                      </div>

                      {/* Actions Column */}
                      <div className="flex flex-row sm:flex-col items-center sm:items-end justify-end gap-1.5 w-full sm:w-auto shrink-0 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-stone-100 dark:border-[#223025]">
                        {/* Primary Auto-Fix Action */}
                        {issue.canAutoFix && (
                          <button
                            onClick={() => handleFixIssue(issue)}
                            title="文字の形や角・曲率を崩さずに安全に修正します"
                            className={`w-full sm:w-auto px-3.5 py-1.5 rounded-lg font-bold text-xs flex items-center justify-center space-x-1.5 transition-all shrink-0 cursor-pointer ${
                              issue.autoFixType === 'merge_intersection'
                                ? isLight
                                  ? 'bg-amber-600 hover:bg-amber-700 text-white border border-amber-700'
                                  : 'bg-amber-600 hover:bg-amber-500 text-white border border-amber-500'
                                : issue.autoFixType === 'optimize_extrema'
                                ? isLight
                                  ? 'bg-cyan-700 hover:bg-cyan-800 text-white border border-cyan-800'
                                  : 'bg-cyan-600 hover:bg-cyan-500 text-white border border-cyan-500'
                                : isLight
                                ? 'bg-emerald-700 text-white hover:bg-emerald-800 border border-emerald-800'
                                : 'bg-emerald-600 text-white hover:bg-emerald-500 border border-emerald-500'
                            }`}
                          >
                            {issue.autoFixType === 'equalize_strokes' ? (
                              <>
                                <Scale className="w-3.5 h-3.5" />
                                <span>線幅を均一化</span>
                              </>
                            ) : issue.autoFixType === 'optimize_extrema' ? (
                              <>
                                <Compass className="w-3.5 h-3.5" />
                                <span>極点を最適化</span>
                              </>
                            ) : issue.autoFixType === 'merge_intersection' ? (
                              <>
                                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                                <span>白抜きを解消</span>
                              </>
                            ) : issue.autoFixType === 'simplify_nodes' ? (
                              <>
                                <Wand2 className="w-3.5 h-3.5" />
                                <span>ノード間引き</span>
                              </>
                            ) : (
                              <>
                                <Wand2 className="w-3.5 h-3.5" />
                                <span>安全修正</span>
                              </>
                            )}
                          </button>
                        )}

                        {/* Density Heatmap Modal Button if excessive nodes */}
                        {issue.type === 'excessive_nodes' && (
                          <button
                            onClick={() => setHeatmapModalUnicode(issue.unicode)}
                            title="この文字の輪郭密度ヒートマップを開き、過密アンカー箇所を可視化してクリックで即時単純化します"
                            className={`w-full sm:w-auto px-2.5 py-1.5 rounded-lg font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors border shrink-0 cursor-pointer ${
                              isLight
                                ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                                : 'bg-amber-950/60 text-amber-300 border-amber-800 hover:bg-amber-900'
                            }`}
                          >
                            <Flame className="w-3.5 h-3.5 text-amber-500" />
                            <span>ヒートマップ診断</span>
                          </button>
                        )}

                        {/* Open in Canvas button */}
                        <button
                          onClick={() => handleGoToGlyph(issue.unicode)}
                          className={`w-full sm:w-auto px-3 py-1.5 rounded-lg font-semibold text-xs flex items-center justify-center space-x-1.5 transition-colors border shrink-0 cursor-pointer ${
                            isLight
                              ? 'bg-white border-stone-200 text-stone-700 hover:bg-stone-100'
                              : 'bg-[#1b261f] border-[#25362b] text-emerald-200 hover:bg-[#233329]'
                          }`}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>キャンバスで開く</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* Footer info and close button */}
        <div
          className={`flex flex-col sm:flex-row items-center justify-between px-5 py-3 border-t text-xs gap-3 shrink-0 ${
            isLight ? 'bg-stone-50/80 border-stone-200' : 'bg-[#111a14] border-[#25362b]'
          }`}
        >
          <div className="flex items-center space-x-2 text-stone-500 dark:text-stone-400 text-[11px] leading-relaxed">
            <span className="hidden md:inline">
              ※ 赤破線はベースライン (Y=800)。形状保護モードで安全に最適化。「元に戻す (Ctrl+Z)」でいつでも取り消せます。
            </span>
            <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-stone-200/60 dark:bg-stone-800/80 font-mono text-[10px] text-stone-600 dark:text-stone-300">
              <kbd className="font-bold">D</kbd>: 診断切替
            </span>
            <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-stone-200/60 dark:bg-stone-800/80 font-mono text-[10px] text-stone-600 dark:text-stone-300">
              <kbd className="font-bold">R</kbd>: 再検査
            </span>
            <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-stone-200/60 dark:bg-stone-800/80 font-mono text-[10px] text-stone-600 dark:text-stone-300">
              <kbd className="font-bold">H</kbd>: ヒートマップ
            </span>
            <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-stone-200/60 dark:bg-stone-800/80 font-mono text-[10px] text-stone-600 dark:text-stone-300">
              <kbd className="font-bold">/</kbd>: 検索
            </span>
            <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-stone-200/60 dark:bg-stone-800/80 font-mono text-[10px] text-stone-600 dark:text-stone-300">
              <kbd className="font-bold">F</kbd>: 全画面切替
            </span>
            <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-stone-200/60 dark:bg-stone-800/80 font-mono text-[10px] text-stone-600 dark:text-stone-300">
              <kbd className="font-bold">Esc</kbd>: 閉じる
            </span>
          </div>
          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors flex items-center space-x-1.5 cursor-pointer ${
                isLight
                  ? 'bg-white border-stone-200 text-stone-700 hover:bg-stone-100'
                  : 'bg-[#1a261f] border-[#25362b] text-emerald-200 hover:bg-[#223328]'
              }`}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>通常表示</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>全画面</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className={`px-4 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                isLight
                  ? 'bg-stone-800 text-white hover:bg-stone-900'
                  : 'bg-emerald-600 text-white hover:bg-emerald-500'
              }`}
            >
              閉じる
            </button>
          </div>
        </div>
      </div>

      {/* Glyph Density Heatmap Inspector Modal */}
      {heatmapModalUnicode !== null && (
        <GlyphDensityHeatmapModal
          isOpen={true}
          onClose={() => setHeatmapModalUnicode(null)}
          unicode={heatmapModalUnicode}
          project={project}
          setProject={setProject}
          theme={theme}
          onShowToast={onShowToast}
          commitHistory={commitHistory}
          onRefreshQualityReport={runScan}
        />
      )}
    </div>
  );
};

export default FontQualityModal;
