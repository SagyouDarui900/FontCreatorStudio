import React, { useEffect, useRef } from 'react';
import { GlyphDensityHeatmapModal } from '../GlyphDensityHeatmapModal';
import { ProjectDiagnosticsPanel } from '../ProjectDiagnosticsPanel';
import {
  StrokeEqualizerPanel,
  NodeOptimizerPanel,
  ExtremaOptimizerPanel,
  QualityModalHeader,
  QualityIssuesView,
  QualityModalFooter,
} from './panels';
import { FontQualityModalProps, TabFilter } from './types';
import { useQualityState } from './hooks/useQualityState';
import { useQualityActions } from './hooks/useQualityActions';
import { getThemeClasses } from '../../utils/theme';
import { useIsTopModal } from '../modals/ModalStackFrame';

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

  const themeClasses = getThemeClasses(theme);
  const state = useQualityState(project, theme);
  const actions = useQualityActions({
    project,
    setProject,
    onSelectGlyph,
    onClose,
    onShowToast,
    commitHistory,
    state,
    isOpen,
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

  const isTopModal = useIsTopModal();

  // Keyboard shortcuts: Escape, F (fullscreen), R (rescan), H (heatmap), D (diagnostics toggle), / (search focus), 1-7 (tabs)
  const shortcutsRef = useRef({
    isFullscreen,
    heatmapModalUnicode,
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
  });
  shortcutsRef.current = {
    isFullscreen,
    heatmapModalUnicode,
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
  };

  useEffect(() => {
    if (!isOpen || !isTopModal) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing || e.keyCode === 229 || e.defaultPrevented) return;
      const {
        isFullscreen: fullscreen,
        heatmapModalUnicode: activeHeatmapUnicode,
        onClose: closeModal,
        runScan: triggerScan,
        runDiagnostics: triggerDiagnostics,
        excessiveNodesUnicodes: denseUnicodes,
        mainView: view,
        notify: showNotice,
        setIsFullscreen: updateFullscreen,
        setMainView: updateMainView,
        setHeatmapModalUnicode: openHeatmap,
        searchInputRef: searchRef,
        setActiveTab: updateActiveTab,
      } = shortcutsRef.current;

      if (activeHeatmapUnicode !== null) return;

      const activeTag = document.activeElement?.tagName.toLowerCase();
      const isInput = activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select';

      if (e.key === 'Escape') {
        if (e.repeat) return;
        e.preventDefault();
        if (fullscreen) {
          updateFullscreen(false);
        } else {
          closeModal();
        }
        return;
      }

      if (!isInput) {
        if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          updateFullscreen((prev) => !prev);
        } else if ((e.key === 'r' || e.key === 'R') && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          triggerScan();
          triggerDiagnostics();
          showNotice('再検査およびプロジェクト診断を実行しました', 'info');
        } else if ((e.key === 'd' || e.key === 'D') && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          updateMainView((prev) => (prev === 'quality' ? 'diagnostics' : 'quality'));
        } else if ((e.key === 'h' || e.key === 'H') && !e.ctrlKey && !e.metaKey && !e.altKey) {
          if (denseUnicodes.length > 0) {
            e.preventDefault();
            openHeatmap(denseUnicodes[0]);
          }
        } else if (e.key === '/') {
          e.preventDefault();
          if (view === 'diagnostics') {
            const diagInput = document.querySelector<HTMLInputElement>('input[data-diag-search]');
            if (diagInput) {
              diagInput.focus();
            }
          } else {
            searchRef.current?.focus();
          }
        } else if (!e.ctrlKey && !e.metaKey && !e.altKey && view === 'quality') {
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
            updateActiveTab(tabMap[e.key]);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isTopModal]);

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
      role="dialog"
      aria-modal="true"
      aria-label="フォント品質・構造チェック & 一括最適化"
      className={`fixed inset-0 z-[60] ${
        isFullscreen
          ? 'p-0 w-screen h-[100dvh] bg-black/85 flex flex-col'
          : 'flex flex-col sm:items-center sm:justify-center p-0 sm:p-4 bg-black/75 anim-fade'
      }`}
    >
      <div
        className={`flex flex-col overflow-hidden ${themeClasses.modalBg} ${
          isFullscreen
            ? 'w-screen h-[100dvh] rounded-none border-none shadow-none'
            : `w-full h-[100dvh] sm:h-auto sm:max-w-4xl xl:max-w-5xl rounded-none sm:rounded-2xl border-0 sm:border ${themeClasses.border} shadow-none sm:shadow-2xl sm:max-h-[90vh]`
        }`}
      >
        {/* Header Bar */}
        <QualityModalHeader
          isLight={isLight}
          themeClasses={themeClasses}
          mainView={mainView}
          setMainView={setMainView}
          report={report}
          diagReport={diagReport}
          isScanning={isScanning}
          isFullscreen={isFullscreen}
          setIsFullscreen={setIsFullscreen}
          onRescan={() => runScan()}
          onClose={onClose}
        />

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
          <QualityIssuesView
            project={project}
            isLight={isLight}
            themeClasses={themeClasses}
            report={report}
            filteredIssues={filteredIssues}
            totalAutoFixableCount={totalAutoFixableCount}
            healthStatus={healthStatus}
            excessiveNodesUnicodes={excessiveNodesUnicodes}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchInputRef={searchInputRef}
            severityFilter={severityFilter}
            setSeverityFilter={setSeverityFilter}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isExtremaPanelOpen={isExtremaPanelOpen}
            setIsExtremaPanelOpen={setIsExtremaPanelOpen}
            isEqualizePanelOpen={isEqualizePanelOpen}
            setIsEqualizePanelOpen={setIsEqualizePanelOpen}
            isOptimizePanelOpen={isOptimizePanelOpen}
            setIsOptimizePanelOpen={setIsOptimizePanelOpen}
            onBatchFix={handleBatchFix}
            onFixIssue={handleFixIssue}
            onGoToGlyph={handleGoToGlyph}
            onOpenHeatmap={(u) => setHeatmapModalUnicode(u)}
            notify={notify}
          />
        )}

        {/* Footer info and close button */}
        <QualityModalFooter
          isLight={isLight}
          themeClasses={themeClasses}
          isFullscreen={isFullscreen}
          setIsFullscreen={setIsFullscreen}
          onClose={onClose}
        />
      </div>

      {/* Glyph Density Heatmap Inspector Modal */}
      {heatmapModalUnicode !== null && (
        <GlyphDensityHeatmapModal
          isOpen={true}
          onClose={() => setHeatmapModalUnicode(null)}
          unicode={heatmapModalUnicode}
          onSelectUnicode={(u) => setHeatmapModalUnicode(u)}
          allProblemUnicodes={excessiveNodesUnicodes}
          project={project}
          setProject={setProject}
          onSelectGlyph={onSelectGlyph}
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
