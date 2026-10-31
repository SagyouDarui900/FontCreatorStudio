import React, { lazy, Suspense, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  FontProject,
  GlyphData,
  PathContour,
  ToolMode,
  BrushStyle,
  TraceSettings,
  GridSettings,
  UserPenPreset,
  GlyphOverlaySettings,
  PressureCurveConfig,
} from './types';
import { createDefaultProject } from './utils/fontCompiler';
import { DEFAULT_SAMPLE_GLYPHS } from './data/defaultSampleGlyphs';
import { loadUserPenPresets, loadStickyBrushConfigs, saveStickyBrushConfig, DEFAULT_PRESSURE_CURVES, DEFAULT_PEN_PRESETS } from './utils/presetData';
import { Header } from './components/Header';
import { GlyphGrid } from './components/GlyphGrid';
import { ToolBar } from './components/ToolBar';
import { GlyphCanvas } from './components/GlyphCanvas';
import { MetricsPanel } from './components/MetricsPanel';
import { RadicalsDrawer } from './components/RadicalsDrawer';
import { OfflineIndicator } from './components/OfflineIndicator';
import { Toast, ToastMessage } from './components/Toast';
import { ThemeMode, isLightTheme, getThemeClasses, THEME_PRESETS, getThemePreset } from './utils/theme';
import { useToolState } from './hooks/useToolState';
import { useTheme } from './hooks/useTheme';
import { useProjectStorage } from './hooks/useProjectStorage';
import { useAppLayout } from './hooks/useAppLayout';
import { useAppShortcuts } from './hooks/useAppShortcuts';
import { AppBottomBar, AppMobileNav } from './components/navigation';
import { KANA_PAIRS } from './data/unicodeTables';
import { X } from 'lucide-react';
import { ModalProvider, useModalContext } from './contexts/ModalContext';
import { ProjectProvider, useProjectContext } from './contexts/ProjectContext';
import { STORAGE_KEYS, getStorageItem, setStorageItem } from './utils/storageKeys';
import { AppModalsHost } from './components/modals/AppModalsHost';

interface AppMainProps {
  theme: ThemeMode;
  themeClasses: any;
  isLight: boolean;
  changeTheme: (mode: ThemeMode) => void;
  toasts: ToastMessage[];
  showToast: (text: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  dismissToast: (id: string) => void;
}

function AppMain({
  theme,
  themeClasses,
  isLight,
  changeTheme,
  toasts,
  showToast,
  dismissToast,
}: AppMainProps) {
  const {
    project,
    setProject,
    selectedUnicode,
    selectedChar,
    currentGlyph,
    handleSelectGlyph,
    handleSelectPrevGlyph,
    handleSelectNextGlyph,
    handleSelectPrevUncompletedGlyph,
    handleSelectNextUncompletedGlyph,
    handleUpdateContours,
    handleUpdateAdvanceWidth,
    handleUpdateLsb,
    handleToggleLockGlyph,
    isGlyphLocked,
    canUndo,
    canRedo,
    handleUndo,
    handleRedo,
    commitHistory,
    clipboardContours,
    handleQuickSaveCurrentGlyph,
    handleSimplifyCurrentGlyph,
    handleAutoSpaceCurrentGlyph,
    handleClearGlyph,
    handleCopyGlyph,
    handlePasteGlyph,
    handleDuplicateAsSmallKana,
    handleGenerateDakutenTarget,
    handleInsertRadical,
    handleBatchInsertRadical,
  } = useProjectContext();

  // Tool Modes, Brush and Pen Presets
  const {
    toolMode,
    setToolMode,
    brushStyle,
    setBrushStyle,
    brushWidth,
    setBrushWidth,
    pressureSensitivity,
    setPressureSensitivity,
    pressureCurve,
    setPressureCurve,
    smoothingIntensity,
    setSmoothingIntensity,
    autoSmoothBrush,
    setAutoSmoothBrush,
    smoothStrength,
    setSmoothStrength,
    smoothPreserveCorners,
    setSmoothPreserveCorners,
    autoUnionBrush,
    setAutoUnionBrush,
    penPresets,
    setPenPresets,
    activePenPreset,
    setIsPenPresetsModalOpen,
    handleChangeBrushStyle,
    handleChangeBrushWidth,
    handleChangePressureSensitivity,
    handleChangePressureCurve,
    handleChangeSmoothingIntensity,
    handleApplyPenPreset,
  } = useToolState();

  // Quick profile for handwriting-optimized settings
  const handleApplyHandwritingPreset = useCallback(() => {
    setToolMode('brush');
    setBrushStyle('brush');
    setBrushWidth(38);
    setPressureSensitivity('high');
    setPressureCurve(DEFAULT_PRESSURE_CURVES.soft);
    setSmoothingIntensity(60);
    setAutoSmoothBrush(true);
    setSmoothStrength('standard');
    setSmoothPreserveCorners(true);
    setAutoUnionBrush(false);
    setGridSettings((prev) => ({
      ...prev,
      snapToGrid: false,
      snapToPoints: false,
      japaneseGuide: 'cross',
      showBodyFrame: true,
      showKanaFrame: true,
      showMetrics: true,
      highContrastCursor: true,
    }));
    setTraceSettings((prev) => ({
      ...prev,
      enabled: true,
      opacity: 0.18,
      fontSize: 1000,
    }));
    showToast('手書きフォント推奨プリセット（毛筆38px・高感度筆圧・十文字字面枠・手振れ補正）を適用しました', 'success');
  }, [setToolMode, setBrushStyle, setBrushWidth, setPressureSensitivity, setPressureCurve, setSmoothingIntensity, setAutoSmoothBrush, setSmoothStrength, setSmoothPreserveCorners, setAutoUnionBrush, showToast]);

  // Trace Guidelines Settings
  const [traceSettings, setTraceSettings] = useState<TraceSettings>({
    enabled: true,
    type: 'char',
    text: '',
    fontFamily: "'Noto Sans JP', sans-serif",
    fontSize: 1000,
    opacity: 0.18,
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  });

  // Grid & Guideline Settings
  const [gridSettings, setGridSettings] = useState<GridSettings>({
    showGrid: true,
    gridSize: 50,
    snapToGrid: false,
    snapToPoints: false,
    snapToGuides: false,
    showMetrics: true,
    showPoints: true,
    showHandles: true,
    japaneseGuide: 'cross',
    showBodyFrame: true,
    showKanaFrame: true,
    highContrastCursor: true,
    showCursorCrosshair: false,
  });

  // Modals & Drawers Visibility
  const {
    setIsMobileThemeModalOpen,
    showRadicals,
    setShowRadicals,
    showGridDrawer,
    setShowGridDrawer,
    showMetricsDrawer,
    setShowMetricsDrawer,
    setIsTestModalOpen,
    setIsFontInfoModalOpen,
    setIsTraceModalOpen,
    setIsSvgModalOpen,
    setIsBatchNormalizeModalOpen,
    setIsQualityModalOpen,
    setIsSynthesisModalOpen,
    setIsKerningModalOpen,
    setIsWeightInterpModalOpen,
    setIsGlyphCompareModalOpen,
    setIsRadicalStudioOpen,
    setIsStorageManagerOpen,
    setIsShortcutsModalOpen,
    setIsExportModalOpen,
    setIsOpenTypeFeaturesModalOpen,
    setIsGridFittingModalOpen,
    setIsPixelStudioOpen,
    setIsMojikumiStudioOpen,
    isAnyModalOpen,
  } = useModalContext();

  // Glyph Overlay Comparison Settings
  const [overlaySettings, setOverlaySettings] = useState<GlyphOverlaySettings>(() => {
    try {
      const saved = getStorageItem(STORAGE_KEYS.GLYPH_OVERLAY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      enabled: false,
      referenceChar: '日',
      referenceUnicode: 0x65e5,
      opacity: 0.45,
      color: '#0284c7',
      renderMode: 'outline',
      offsetX: 0,
      offsetY: 0,
      scale: 1.0,
      showMetrics: true,
    };
  });

  useEffect(() => {
    try {
      setStorageItem(STORAGE_KEYS.GLYPH_OVERLAY, JSON.stringify(overlaySettings));
    } catch (e) {}
  }, [overlaySettings]);

  // Responsive layout tracking & navigation state
  const {
    viewportWidth,
    isGridOverlay,
    isMetricsOverlay,
    isZenMode,
    toggleZenMode,
    toggleGridDrawer,
    toggleMetricsDrawer,
    toggleRadicals,
    handleCloseGridDrawer,
    handleCloseMetricsDrawer,
    handleCloseRadicalsDrawer,
    mobileActiveTab,
    handleSwitchMobileTab,
  } = useAppLayout({
    showGridDrawer,
    setShowGridDrawer,
    showMetricsDrawer,
    setShowMetricsDrawer,
    showRadicals,
    setShowRadicals,
    showToast,
  });

  const openPenPresetsModal = useCallback(() => setIsPenPresetsModalOpen(true), [setIsPenPresetsModalOpen]);

  const handleOpenTestModal = useCallback(() => setIsTestModalOpen(true), [setIsTestModalOpen]);
  const handleOpenFontInfoModal = useCallback(() => setIsFontInfoModalOpen(true), [setIsFontInfoModalOpen]);
  const handleOpenTraceModal = useCallback(() => setIsTraceModalOpen(true), [setIsTraceModalOpen]);
  const handleOpenSvgModal = useCallback(() => setIsSvgModalOpen(true), [setIsSvgModalOpen]);
  const handleOpenBatchNormalizeModal = useCallback(() => setIsBatchNormalizeModalOpen(true), [setIsBatchNormalizeModalOpen]);
  const handleOpenQualityModal = useCallback(() => setIsQualityModalOpen(true), [setIsQualityModalOpen]);
  const handleOpenSynthesisModal = useCallback(() => setIsSynthesisModalOpen(true), [setIsSynthesisModalOpen]);
  const handleOpenKerningModal = useCallback(() => setIsKerningModalOpen(true), [setIsKerningModalOpen]);
  const handleOpenWeightInterpModal = useCallback(() => setIsWeightInterpModalOpen(true), [setIsWeightInterpModalOpen]);
  const handleOpenGlyphCompareModal = useCallback(() => setIsGlyphCompareModalOpen(true), [setIsGlyphCompareModalOpen]);
  const handleOpenRadicalStudio = useCallback(() => setIsRadicalStudioOpen(true), [setIsRadicalStudioOpen]);
  const handleOpenPixelStudio = useCallback(() => setIsPixelStudioOpen(true), [setIsPixelStudioOpen]);
  const handleOpenStorageManagerModal = useCallback(() => setIsStorageManagerOpen(true), [setIsStorageManagerOpen]);
  const handleOpenShortcutsModal = useCallback(() => setIsShortcutsModalOpen(true), [setIsShortcutsModalOpen]);
  const handleOpenExportModal = useCallback(() => setIsExportModalOpen(true), [setIsExportModalOpen]);
  const handleOpenRadicalStudioFromDrawer = useCallback(() => {
    setShowRadicals(false);
    setIsRadicalStudioOpen(true);
  }, [setShowRadicals, setIsRadicalStudioOpen]);

  // Apply SVG vector contours to current glyph
  const handleApplySvgContours = useCallback(
    (svgContours: PathContour[], append: boolean = false) => {
      if (svgContours.length === 0) return;
      commitHistory();
      if (append) {
        const existing = currentGlyph.contours || [];
        handleUpdateContours([...existing, ...svgContours]);
        showToast(`SVGベクトル輪郭 (${svgContours.length}パス) を追加統合しました`, 'success');
      } else {
        handleUpdateContours(svgContours);
        showToast(`SVGベクトル輪郭 (${svgContours.length}パス) に置換しました`, 'success');
      }
    },
    [currentGlyph, commitHistory, handleUpdateContours, showToast]
  );

  // Global Keyboard Shortcuts
  useAppShortcuts({
    isAnyModalOpen,
    handleUndo,
    handleRedo,
    handleQuickSaveCurrentGlyph,
    handleCopyGlyph,
    handlePasteGlyph,
    selectedUnicode,
    currentGlyph,
    clipboardContours,
    handleSelectPrevGlyph,
    handleSelectNextGlyph,
    toggleZenMode,
    setToolMode,
  });

  return (
    <div className={`h-screen w-screen flex flex-col font-sans select-none overflow-hidden pb-14 sm:pb-0 ${themeClasses.appBg} ${themeClasses.textPrimary}`}>
      {/* Top Main Navigation Header */}
      <Header
        project={project}
        setProject={setProject}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        selectedUnicode={selectedUnicode}
        selectedChar={selectedChar}
        isGlyphLocked={isGlyphLocked}
        onToggleLockGlyph={handleToggleLockGlyph}
        onOpenTestModal={handleOpenTestModal}
        onOpenFontInfoModal={handleOpenFontInfoModal}
        onOpenTraceModal={handleOpenTraceModal}
        onOpenSvgModal={handleOpenSvgModal}
        onOpenBatchNormalizeModal={handleOpenBatchNormalizeModal}
        onOpenQualityModal={handleOpenQualityModal}
        onOpenGlyphSynthesisModal={handleOpenSynthesisModal}
        onOpenKerningModal={handleOpenKerningModal}
        onOpenWeightInterpolationModal={handleOpenWeightInterpModal}
        onOpenGlyphCompareModal={handleOpenGlyphCompareModal}
        onOpenRadicalStudio={handleOpenRadicalStudio}
        onOpenPixelStudio={handleOpenPixelStudio}
        onOpenStorageManagerModal={handleOpenStorageManagerModal}
        onOpenShortcutsModal={handleOpenShortcutsModal}
        onOpenExportModal={handleOpenExportModal}
        onOpenOpenTypeFeaturesModal={() => setIsOpenTypeFeaturesModalOpen(true)}
        onOpenGridFittingModal={() => setIsGridFittingModalOpen(true)}
        onOpenMojikumiStudio={() => setIsMojikumiStudioOpen(true)}
        onToggleRadicals={toggleRadicals}
        showRadicals={showRadicals}
        showGridDrawer={showGridDrawer}
        onToggleGridDrawer={toggleGridDrawer}
        showMetricsDrawer={showMetricsDrawer}
        onToggleMetricsDrawer={toggleMetricsDrawer}
        isZenMode={isZenMode}
        onToggleZenMode={toggleZenMode}
        onApplyHandwritingPreset={handleApplyHandwritingPreset}
        onOpenPenPresetsModal={openPenPresetsModal}
        theme={theme}
        onToggleTheme={() => changeTheme(isLight ? 'dark' : 'light')}
        onChangeTheme={changeTheme}
        onShowToast={showToast}
      />

      {/* Main Workspace Workspace area */}
      <div className="flex-1 min-h-0 flex overflow-hidden relative">
        {/* Left Side: Glyph Select Matrix */}
        {showGridDrawer && (
          <GlyphGrid
            project={project}
            selectedUnicode={selectedUnicode}
            onSelectGlyph={(u, c) => {
              handleSelectGlyph(u, c);
              if (isGridOverlay) handleCloseGridDrawer();
            }}
            onClearGlyph={handleClearGlyph}
            onCopyGlyph={handleCopyGlyph}
            onPasteGlyph={handlePasteGlyph}
            onDuplicateAsSmallKana={handleDuplicateAsSmallKana}
            onGenerateDakutenTarget={handleGenerateDakutenTarget}
            hasClipboard={Boolean(clipboardContours && clipboardContours.length > 0)}
            isOpen={showGridDrawer}
            onClose={handleCloseGridDrawer}
            theme={theme}
            isOverlay={isGridOverlay}
          />
        )}

        {/* Left Side 2: Radical Library & Kanji Composition Parts Drawer */}
        <RadicalsDrawer
          isOpen={showRadicals}
          onClose={handleCloseRadicalsDrawer}
          onInsertRadical={(contours) => {
            handleInsertRadical(contours);
            if (viewportWidth < 1024) handleCloseRadicalsDrawer();
          }}
          currentContours={currentGlyph.contours || []}
          selectedChar={selectedChar}
          allGlyphs={project.glyphs || {}}
          theme={theme}
          onOpenRadicalStudio={handleOpenRadicalStudioFromDrawer}
        />

        {/* Center Canvas Workspace Area */}
        <div className="flex-1 min-h-0 h-full flex flex-col overflow-hidden relative">
          <ToolBar
            toolMode={toolMode}
            setToolMode={setToolMode}
            brushStyle={brushStyle}
            setBrushStyle={setBrushStyle}
            brushWidth={brushWidth}
            setBrushWidth={setBrushWidth}
            pressureSensitivity={pressureSensitivity}
            onChangePressureSensitivity={handleChangePressureSensitivity}
            smoothingIntensity={smoothingIntensity}
            onChangeSmoothingIntensity={handleChangeSmoothingIntensity}
            gridSettings={gridSettings}
            setGridSettings={setGridSettings}
            onOpenTraceModal={handleOpenTraceModal}
            onOpenPenPresetsModal={openPenPresetsModal}
            onOpenPixelStudio={handleOpenPixelStudio}
            onQuickSaveGlyph={handleQuickSaveCurrentGlyph}
            onOpenExportModal={handleOpenExportModal}
            theme={theme}
            activePenPreset={activePenPreset}
          />

          <div className="flex-1 min-h-0 h-full relative overflow-hidden">
            <GlyphCanvas
              contours={currentGlyph.contours || []}
              onChangeContours={handleUpdateContours}
              advanceWidth={currentGlyph.advanceWidth || 1000}
              lsb={currentGlyph.lsb ?? 50}
              onChangeAdvanceWidth={handleUpdateAdvanceWidth}
              onChangeLsb={handleUpdateLsb}
              toolMode={toolMode}
              onSetToolMode={setToolMode}
              brushWidth={brushWidth}
              brushStyle={brushStyle}
              onChangeBrushStyle={setBrushStyle}
              onChangeBrushWidth={setBrushWidth}
              pressureSensitivity={pressureSensitivity}
              onChangePressureSensitivity={setPressureSensitivity}
              pressureCurve={pressureCurve}
              smoothingIntensity={smoothingIntensity}
              onChangeSmoothingIntensity={handleChangeSmoothingIntensity}
              traceSettings={traceSettings}
              onChangeTraceSettings={setTraceSettings}
              selectedUnicode={selectedUnicode}
              activeChar={selectedChar}
              gridSettings={gridSettings}
              onChangeGridSettings={setGridSettings}
              overlaySettings={overlaySettings}
              theme={theme}
              project={project}
              onSelectPrevGlyph={handleSelectPrevGlyph}
              onSelectNextGlyph={handleSelectNextGlyph}
              onCommitHistory={commitHistory}
              onCopyFromChar={(char) => handleCopyGlyph(char.charCodeAt(0))}
              onGenerateDakutenTarget={handleGenerateDakutenTarget}
              onToggleGridDrawer={toggleGridDrawer}
              showGridDrawer={showGridDrawer}
              onToggleMetricsDrawer={toggleMetricsDrawer}
              showMetricsDrawer={showMetricsDrawer}
              onToggleRadicals={toggleRadicals}
              showRadicals={showRadicals}
              onToggleZenMode={toggleZenMode}
              isZenMode={isZenMode}
              onUndo={handleUndo}
              onRedo={handleRedo}
              canUndo={canUndo}
              canRedo={canRedo}
              onOpenPenPresetsModal={openPenPresetsModal}
              activePenPreset={activePenPreset}
              isAnyModalOpen={isAnyModalOpen}
              onOpenGlyphCompareModal={handleOpenGlyphCompareModal}
            />
          </div>
        </div>

        {/* Right Side: Metrics & Font Metrics Control Sidebar */}
        {showMetricsDrawer && (
          <div
            className={`${
              isMetricsOverlay
                ? 'fixed top-0 bottom-14 sm:bottom-0 right-0 z-40 shadow-2xl w-80 max-w-[85vw]'
                : 'w-72 border-l flex flex-col shrink-0 min-h-0'
            } ${themeClasses.sidebarBg} ${themeClasses.border}`}
          >
            {isMetricsOverlay && (
              <div className={`p-2 border-b flex justify-between items-center ${themeClasses.border}`}>
                <span className="font-semibold text-xs text-stone-700 dark:text-stone-300">メトリクス・文字ガイド</span>
                <button
                  onClick={handleCloseMetricsDrawer}
                  className="p-1 rounded hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <MetricsPanel
              advanceWidth={currentGlyph.advanceWidth || 1000}
              lsb={currentGlyph.lsb ?? 50}
              onChangeAdvanceWidth={handleUpdateAdvanceWidth}
              onChangeLsb={handleUpdateLsb}
              contours={currentGlyph.contours || []}
              onChangeContours={handleUpdateContours}
              onCommitHistory={commitHistory}
              selectedChar={selectedChar}
              selectedUnicode={selectedUnicode}
              isOpen={showMetricsDrawer}
              onClose={handleCloseMetricsDrawer}
              theme={theme}
              isOverlay={isMetricsOverlay}
              unitsPerEm={project.metadata?.unitsPerEm || 1000}
              onSelectPrevGlyph={handleSelectPrevGlyph}
              onSelectNextGlyph={handleSelectNextGlyph}
              onSelectPrevUncompletedGlyph={handleSelectPrevUncompletedGlyph}
              onSelectNextUncompletedGlyph={handleSelectNextUncompletedGlyph}
              onAutoSpaceGlyph={handleAutoSpaceCurrentGlyph}
              onSimplifyGlyph={handleSimplifyCurrentGlyph}
              onShowToast={showToast}
            />
          </div>
        )}

        {/* BackDrop for Right Drawer when in overlay mode */}
        {showMetricsDrawer && isMetricsOverlay && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-35"
            onClick={handleCloseMetricsDrawer}
          />
        )}
      </div>

      {/* Desktop/Tablet Bottom Floating Navigation Toolbar & Quick Navigation Bar */}
      <AppBottomBar
        selectedChar={selectedChar}
        selectedUnicode={selectedUnicode}
        handleSelectPrevGlyph={handleSelectPrevGlyph}
        handleSelectNextGlyph={handleSelectNextGlyph}
        handleSelectPrevUncompletedGlyph={handleSelectPrevUncompletedGlyph}
        handleSelectNextUncompletedGlyph={handleSelectNextUncompletedGlyph}
        contourCount={currentGlyph.contours?.length || 0}
        handleUndo={handleUndo}
        handleRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        themeClasses={themeClasses}
      />

      {/* Accessible Mobile Bottom Navigation Bar (UI-10) */}
      <AppMobileNav
        mobileActiveTab={mobileActiveTab}
        handleSwitchMobileTab={handleSwitchMobileTab}
        themeClasses={themeClasses}
      />

      {/* Centralized Modal Manager Host */}
      <AppModalsHost
        project={project}
        setProject={setProject}
        selectedChar={selectedChar}
        selectedUnicode={selectedUnicode}
        onSelectGlyph={handleSelectGlyph}
        theme={theme}
        themeClasses={themeClasses}
        isLight={isLight}
        changeTheme={changeTheme}
        showToast={showToast}
        commitHistory={commitHistory}
        traceSettings={traceSettings}
        setTraceSettings={setTraceSettings}
        overlaySettings={overlaySettings}
        setOverlaySettings={setOverlaySettings}
        onApplySvgContours={handleApplySvgContours}
        onInsertRadical={handleInsertRadical}
        onBatchInsertRadical={handleBatchInsertRadical}
        brushStyle={brushStyle}
        brushWidth={brushWidth}
        pressureSensitivity={pressureSensitivity}
        pressureCurve={pressureCurve}
        smoothingIntensity={smoothingIntensity}
        autoSmoothBrush={autoSmoothBrush}
        smoothStrength={smoothStrength}
        smoothPreserveCorners={smoothPreserveCorners}
        autoUnionBrush={autoUnionBrush}
        activePenPreset={activePenPreset}
        penPresets={penPresets}
        setPenPresets={setPenPresets}
        onApplyPenPreset={handleApplyPenPreset}
        onChangePressureCurve={handleChangePressureCurve}
      />

      {/* Floating Toast Notification System */}
      <Toast toasts={toasts} onDismiss={dismissToast} theme={theme} />

      {/* Offline Connectivity Status Indicator */}
      <OfflineIndicator />
    </div>
  );
}

function AppContent() {
  // Toasts System
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((text: string, type: 'success' | 'info' | 'warning' | 'error' = 'info') => {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    setToasts((prev) => {
      const exists = prev.some((t) => t.text === text);
      if (exists) {
        return prev.map((t) => (t.text === text ? { id, text, type } : t));
      }
      return [...prev.slice(-2), { id, text, type }];
    });
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Theme Mode
  const { theme, changeTheme, isLight, themeClasses } = useTheme();

  // Project Storage Manager
  const { project, setProject, projectRef, saveProjectToIndexedDbWhenIdle } = useProjectStorage({
    onShowToast: showToast,
  });

  return (
    <ProjectProvider
      project={project}
      setProject={setProject}
      projectRef={projectRef}
      saveProjectToIndexedDbWhenIdle={saveProjectToIndexedDbWhenIdle}
      showToast={showToast}
    >
      <AppMain
        theme={theme}
        themeClasses={themeClasses}
        isLight={isLight}
        changeTheme={changeTheme}
        toasts={toasts}
        showToast={showToast}
        dismissToast={dismissToast}
      />
    </ProjectProvider>
  );
}

export default function App() {
  return (
    <ModalProvider>
      <AppContent />
    </ModalProvider>
  );
}
