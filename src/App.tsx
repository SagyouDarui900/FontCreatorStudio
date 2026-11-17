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
  ThemeClasses,
  ToolbarPosition,
} from './types';
import { createDefaultProject } from './utils/font/projectDefaults';
import { DEFAULT_SAMPLE_GLYPHS } from './data/defaultSampleGlyphs';
import { loadUserPenPresets, loadStickyBrushConfigs, saveStickyBrushConfig, DEFAULT_PRESSURE_CURVES, DEFAULT_PEN_PRESETS } from './utils/presetData';
import { Header } from './components/Header';
import { GlyphGrid } from './components/GlyphGrid';
import { ToolBar } from './components/ToolBar';
import { GlyphCanvas } from './components/GlyphCanvas';
import { MetricsPanel } from './components/MetricsPanel';
import { RadicalsDrawer } from './components/RadicalsDrawer';
import { OfflineIndicator } from './components/OfflineIndicator';
import { Toast, ToastMessage, ToastAction } from './components/Toast';
import { ThemeMode, isLightTheme, getThemeClasses, THEME_PRESETS, getThemePreset } from './utils/theme';
import { useToolState } from './hooks/useToolState';
import { useTheme } from './hooks/useTheme';
import { useProjectStorage } from './hooks/useProjectStorage';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useAppLayout } from './hooks/useAppLayout';
import { useAppShortcuts } from './hooks/useAppShortcuts';
import { AppMobileNav } from './components/navigation';
import { KANA_PAIRS } from './data/unicodeTables';
import { ModalProvider, useModalContext } from './contexts/ModalContext';
import { ProjectProvider, useProjectContext } from './contexts/ProjectContext';
import { STORAGE_KEYS, getStorageItem, setStorageItem } from './utils/storageKeys';
import { contoursHaveFiniteCoordinates } from './utils/path';
import { AppModalsHost } from './components/modals/AppModalsHost';
import { toStoredTraceSettings } from './utils/traceSettings';

interface AppMainProps {
  theme: ThemeMode;
  themeClasses: ThemeClasses;
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
  // Service Worker update notice (PWA-2): with registerType 'autoUpdate'
  // the new service worker activates on its own, but the open page keeps
  // running the old JS until it reloads. Prompt the user to reload
  // instead of reloading automatically, so editing data is not lost.
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

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
    handleCopySelectedContours,
    handlePasteClipboardContours,
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
    setActivePenPreset,
    handleChangeBrushStyle,
    handleChangeBrushWidth,
    handleChangePressureSensitivity,
    handleChangePressureCurve,
    handleChangeSmoothingIntensity,
    handleAdjustBrushSize,
    handleApplyPenPreset,
  } = useToolState();

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

  // Clear a manually entered display character when the selected glyph
  // changes, so the underdrawing follows the new character. While staying
  // on one glyph, a manual entry is kept; an empty text falls back to the
  // selected character in the reference layer and the settings modal.
  useEffect(() => {
    setTraceSettings((prev) => (prev.text ? { ...prev, text: '' } : prev));
  }, [selectedUnicode]);

  // Persist trace settings in the project, without image data (data URLs
  // are large and stay in memory only). Restoring applies stored settings
  // once per stored value; later edits write back through this effect.
  const appliedTraceSettingsRef = useRef<string | null>(null);
  useEffect(() => {
    const stored = toStoredTraceSettings(traceSettings);
    setProject((prev) => {
      if (JSON.stringify(prev.traceSettings ?? null) === JSON.stringify(stored)) return prev;
      return { ...prev, traceSettings: stored };
    });
  }, [traceSettings, setProject]);

  useEffect(() => {
    const stored = project.traceSettings;
    if (!stored) return;
    const key = JSON.stringify(stored);
    if (key === appliedTraceSettingsRef.current) return;
    if (key === JSON.stringify(toStoredTraceSettings(traceSettings))) {
      appliedTraceSettingsRef.current = key;
      return;
    }
    appliedTraceSettingsRef.current = key;
    setTraceSettings((prev) => ({ ...prev, ...stored }));
  }, [project.traceSettings]);

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
    showToast('手書きプリセットを適用しました', 'success');
  }, [
    setToolMode,
    setBrushStyle,
    setBrushWidth,
    setPressureSensitivity,
    setPressureCurve,
    setSmoothingIntensity,
    setAutoSmoothBrush,
    setSmoothStrength,
    setSmoothPreserveCorners,
    setAutoUnionBrush,
    setGridSettings,
    setTraceSettings,
    showToast,
  ]);

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
    setIsPenPresetsModalOpen,
    closeModal,
    isAnyModalOpen,
    activeModal,
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

  // Warn once per glyph when a pixel-data glyph is opened on the normal
  // canvas: edits there are overwritten the next time the pixel studio
  // opens, because pixelData takes priority on load.
  const warnedPixelGlyphsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (activeModal !== null) return;
    const g = project.glyphs[selectedUnicode];
    if (!g?.pixelData) return;
    const key = `${project.id}:${selectedUnicode}`;
    if (warnedPixelGlyphsRef.current.has(key)) return;
    warnedPixelGlyphsRef.current.add(key);
    showToast(
      `「${g.char || ''}」はピクセルデータを編集中の文字です。通常キャンバスでの編集はピクセルスタジオで上書きされます`,
      'warning'
    );
  }, [activeModal, project, selectedUnicode, showToast]);

  // Responsive layout tracking & navigation state
  const {
    viewportWidth,
    isGridOverlay,
    isMetricsOverlay,
    isRadicalsOverlay,
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

  // Canvas selection state for precision inspector sync
  const [canvasSelection, setCanvasSelection] = useState<{
    contourIds: string[];
    nodeId: string | null;
    handleType: 'node' | 'handleIn' | 'handleOut' | null;
  }>({
    contourIds: [],
    nodeId: null,
    handleType: null,
  });

  // Toolbar Dock Position (top / left / right)
  const [toolbarPosition, setToolbarPosition] = useState<ToolbarPosition>(() => {
    try {
      const saved = getStorageItem(STORAGE_KEYS.TOOLBAR_POSITION);
      if (saved === 'top' || saved === 'left' || saved === 'right') return saved;
    } catch (e) {}
    return 'top';
  });

  useEffect(() => {
    try {
      setStorageItem(STORAGE_KEYS.TOOLBAR_POSITION, toolbarPosition);
    } catch (e) {}
  }, [toolbarPosition]);

  const effectiveToolbarPosition: ToolbarPosition = viewportWidth >= 640 ? toolbarPosition : 'top';

  const openPenPresetsModal = useCallback(() => setIsPenPresetsModalOpen(true), [setIsPenPresetsModalOpen]);

  // Drawing-side reset (canvas smoothing settings + pen stroke width),
  // registered by GlyphCanvas and invoked from the pen presets modal.
  const canvasPrefsResetRef = useRef<(() => void) | null>(null);
  const handleRegisterResetCanvasPrefs = useCallback((reset: () => void) => {
    canvasPrefsResetRef.current = reset;
  }, []);
  const handleResetCanvasPrefs = useCallback(() => {
    canvasPrefsResetRef.current?.();
  }, []);
  const handleClearActivePenPreset = useCallback(() => {
    setActivePenPreset(undefined);
  }, [setActivePenPreset]);

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
  const handleOpenRadicalStudio = useCallback(() => {
    setShowMetricsDrawer(false);
    if (viewportWidth < 640) {
      setShowGridDrawer(false);
    }
    setShowRadicals(true);
  }, [viewportWidth, setShowMetricsDrawer, setShowGridDrawer, setShowRadicals]);
  const handleOpenPixelStudio = useCallback(() => setIsPixelStudioOpen(true), [setIsPixelStudioOpen]);
  const handleOpenStorageManagerModal = useCallback(() => setIsStorageManagerOpen(true), [setIsStorageManagerOpen]);
  const handleOpenShortcutsModal = useCallback(() => setIsShortcutsModalOpen(true), [setIsShortcutsModalOpen]);
  const handleOpenExportModal = useCallback(() => setIsExportModalOpen(true), [setIsExportModalOpen]);

  // 2-2: ExportModal's new-project button. The confirmation dialog lives in
  // Header (useProjectFileIO), so Header registers its opener in this ref.
  // Close the export modal first: it and the confirmation dialog both use
  // z-60, and the export modal is later in the DOM, so the dialog would
  // otherwise be hidden behind it.
  const requestNewProjectRef = useRef<(() => void) | null>(null);
  const registerRequestNewProject = useCallback((request: () => void) => {
    requestNewProjectRef.current = request;
  }, []);
  const handleRequestNewProject = useCallback(() => {
    closeModal();
    requestNewProjectRef.current?.();
  }, [closeModal]);
  const handleOpenRadicalStudioFromDrawer = useCallback(() => {
    setShowMetricsDrawer(false);
    if (viewportWidth < 640) {
      setShowGridDrawer(false);
    }
    setShowRadicals(true);
  }, [viewportWidth, setShowMetricsDrawer, setShowGridDrawer, setShowRadicals]);

  // Apply SVG vector contours to current glyph
  const handleApplySvgContours = useCallback(
    (svgContours: PathContour[], append: boolean = false) => {
      if (isGlyphLocked) {
        showToast('この文字は編集ロックされています', 'warning');
        return;
      }
      if (svgContours.length === 0) return;
      if (!contoursHaveFiniteCoordinates(svgContours)) {
        showToast('非有限の座標（Infinity / NaN）を含むため適用しませんでした', 'error');
        return;
      }
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
    [isGlyphLocked, currentGlyph, commitHistory, handleUpdateContours, showToast]
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
    <div className={`h-full w-full max-h-full max-w-full flex flex-col font-sans select-none overflow-hidden pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] sm:pb-0 ${themeClasses.appBg} ${themeClasses.textPrimary}`}>
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
        onRegisterRequestNewProject={registerRequestNewProject}
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

        {/* Center Canvas Workspace Area */}
        <div
          className={`flex-1 min-h-0 w-full flex ${
            effectiveToolbarPosition === 'top'
              ? 'flex-col'
              : effectiveToolbarPosition === 'left'
              ? 'flex-row'
              : 'flex-row-reverse'
          } overflow-hidden relative`}
        >
          <ToolBar
            position={effectiveToolbarPosition}
            onPositionChange={setToolbarPosition}
            toolMode={toolMode}
            setToolMode={setToolMode}
            brushStyle={brushStyle}
            setBrushStyle={handleChangeBrushStyle}
            brushWidth={brushWidth}
            setBrushWidth={handleChangeBrushWidth}
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
            traceEnabled={traceSettings.enabled}
            theme={theme}
            activePenPreset={activePenPreset}
          />

          <div className="flex-1 min-h-0 h-full w-full relative overflow-hidden">
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
              onChangeBrushStyle={handleChangeBrushStyle}
              onChangeBrushWidth={handleChangeBrushWidth}
              onAdjustBrushSize={handleAdjustBrushSize}
              autoSmoothBrush={autoSmoothBrush}
              onChangeAutoSmoothBrush={setAutoSmoothBrush}
              smoothStrength={smoothStrength}
              onChangeSmoothStrength={setSmoothStrength}
              smoothPreserveCorners={smoothPreserveCorners}
              onChangeSmoothPreserveCorners={setSmoothPreserveCorners}
              autoUnionBrush={autoUnionBrush}
              onChangeAutoUnionBrush={setAutoUnionBrush}
              onRegisterResetCanvasPrefs={handleRegisterResetCanvasPrefs}
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
              onSelectPrevUncompletedGlyph={handleSelectPrevUncompletedGlyph}
              onSelectNextUncompletedGlyph={handleSelectNextUncompletedGlyph}
              isGlyphLocked={isGlyphLocked}
              onCommitHistory={commitHistory}
              onCopyFromChar={(char) => handleCopyGlyph(char.charCodeAt(0))}
              onGenerateDakutenTarget={handleGenerateDakutenTarget}
              onCopySelectedContours={handleCopySelectedContours}
              onPasteSelectedContours={handlePasteClipboardContours}
              hasClipboard={Boolean(clipboardContours && clipboardContours.length > 0)}
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
              onSelectionChange={setCanvasSelection}
            />
          </div>
        </div>

        {/* Right Side: Radical Library & Kanji Composition Parts Drawer */}
        <RadicalsDrawer
          isOpen={showRadicals}
          onClose={handleCloseRadicalsDrawer}
          onInsertRadical={(contours) => {
            handleInsertRadical(contours);
            if (viewportWidth < 1024) handleCloseRadicalsDrawer();
          }}
          onBatchInsertRadical={handleBatchInsertRadical}
          currentContours={currentGlyph.contours || []}
          selectedChar={selectedChar}
          allGlyphs={project.glyphs || {}}
          theme={theme}
          isOverlay={isRadicalsOverlay}
          ascender={project.metadata?.ascender}
          unitsPerEm={project.metadata?.unitsPerEm}
          onOpenRadicalStudio={handleOpenRadicalStudioFromDrawer}
        />

        {/* Right Side: Metrics & Font Metrics Control Sidebar */}
        {showMetricsDrawer && (
          <div
            className={`${
              isMetricsOverlay
                ? 'fixed top-[calc(2.5rem+env(safe-area-inset-top,0px))] bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))] sm:bottom-0 right-0 z-40 shadow-2xl w-72 sm:w-80 max-w-[85vw] border-l flex flex-col min-h-0'
                : 'w-64 xl:w-72 border-l flex flex-col shrink-0 min-h-0'
            } ${themeClasses.sidebarBg} ${themeClasses.border}`}
          >
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
              selectedContourIds={canvasSelection.contourIds}
              selectedNodeId={canvasSelection.nodeId}
              selectedHandleType={canvasSelection.handleType}
              isGlyphLocked={isGlyphLocked}
            />
          </div>
        )}

        {/* BackDrop for Right Drawer when in overlay mode */}
        {showMetricsDrawer && isMetricsOverlay && (
          <div
            className="fixed top-[calc(2.5rem+env(safe-area-inset-top,0px))] inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))] sm:bottom-0 bg-black/40 z-30"
            onClick={handleCloseMetricsDrawer}
          />
        )}
      </div>

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
        onClearActivePenPreset={handleClearActivePenPreset}
        onResetCanvasPrefs={handleResetCanvasPrefs}
        onRequestNewProject={handleRequestNewProject}
      />

      {/* Floating Toast Notification System */}
      <Toast toasts={toasts} onDismiss={dismissToast} theme={theme} />

      {/* Offline Connectivity Status Indicator */}
      <OfflineIndicator />

      {/* Service Worker update notice: a new version is ready, reload to use it */}
      {needRefresh && (
        <div
          role="alert"
          className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] sm:bottom-4 right-4 z-[70] flex items-center gap-2 rounded-lg bg-slate-900 border border-emerald-500/40 text-emerald-100 px-3 py-2 text-xs font-medium shadow-md"
        >
          <span>新しいバージョンが利用できます。再読み込みすると更新が反映されます。</span>
          <button
            type="button"
            onClick={() => void updateServiceWorker(true)}
            className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold shrink-0 cursor-pointer"
          >
            再読み込み
          </button>
          <button
            type="button"
            onClick={() => setNeedRefresh(false)}
            className="px-2 py-1 rounded text-slate-300 hover:bg-slate-800 shrink-0 cursor-pointer"
          >
            後で
          </button>
        </div>
      )}
    </div>
  );
}

function AppContent() {
  // Toasts System
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const toastTextToIdRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    const timers = toastTimersRef.current;
    const textMap = toastTextToIdRef.current;
    return () => {
      timers.forEach((timerId) => clearTimeout(timerId));
      timers.clear();
      textMap.clear();
    };
  }, []);

  const showToast = useCallback((text: string, type: 'success' | 'info' | 'warning' | 'error' = 'info', action?: ToastAction) => {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const existingId = toastTextToIdRef.current.get(text);
    if (existingId) {
      const existingTimer = toastTimersRef.current.get(existingId);
      if (existingTimer) {
        clearTimeout(existingTimer);
        toastTimersRef.current.delete(existingId);
      }
    }

    toastTextToIdRef.current.set(text, id);
    setToasts((prev) => {
      const exists = prev.some((t) => t.text === text);
      if (exists) {
        return prev.map((t) => (t.text === text ? { id, text, type, action } : t));
      }
      return [...prev.slice(-2), { id, text, type, action }];
    });

    const timerId = setTimeout(() => {
      toastTimersRef.current.delete(id);
      if (toastTextToIdRef.current.get(text) === id) {
        toastTextToIdRef.current.delete(text);
      }
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
    toastTimersRef.current.set(id, timerId);
  }, []);

  const dismissToast = useCallback((id: string) => {
    const timerId = toastTimersRef.current.get(id);
    if (timerId) {
      clearTimeout(timerId);
      toastTimersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Theme Mode
  const { theme, changeTheme, isLight, themeClasses } = useTheme({
    onSaveError: () => showToast('テーマ設定の保存に失敗しました', 'error'),
  });

  // Project Storage Manager
  const { project, setProject, projectRef, saveProjectToIndexedDbWhenIdle, isStorageLoading, restoreFailed, restoreError, retryRestore, discardCorruptDataAndStartFresh, autoSaveFailed, autoSaveError, retryAutoSave } = useProjectStorage({
    onShowToast: showToast,
  });

  if (isStorageLoading) {
    return (
      <div className={`w-screen h-screen flex flex-col items-center justify-center ${themeClasses.canvasOuterBg}`}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono font-medium text-stone-500 dark:text-stone-400">
            プロジェクトを読み込み中...
          </span>
        </div>
      </div>
    );
  }

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
      {(restoreFailed || autoSaveFailed) && (
        <div
          role="alert"
          className="fixed left-1/2 top-3 z-[80] w-[min(92vw,560px)] -translate-x-1/2 rounded-xl border border-red-300 bg-red-50 p-3 text-xs text-red-900 shadow-lg dark:border-red-800 dark:bg-red-950 dark:text-red-100"
        >
          <div className="font-bold">
            {restoreFailed ? '保存データの復元に失敗しました' : '自動保存に失敗しました'}
          </div>
          <div className="mt-1">
            {restoreFailed ? restoreError || '保存されたプロジェクトを読み込めませんでした。' : autoSaveError || '自動保存に失敗しました。'}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {restoreFailed ? (
              <>
                <button type="button" onClick={retryRestore} className="rounded-lg bg-red-600 px-3 py-2 font-bold text-white">
                  復元を再試行する
                </button>
                <button type="button" onClick={discardCorruptDataAndStartFresh} className="rounded-lg border border-red-300 bg-white px-3 py-2 font-bold dark:bg-red-900">
                  破損データを破棄して新規開始する
                </button>
              </>
            ) : (
              <button type="button" onClick={retryAutoSave} className="rounded-lg bg-red-600 px-3 py-2 font-bold text-white">
                自動保存を再試行する
              </button>
            )}
          </div>
          {restoreFailed && (
            <div className="mt-1">自動保存は止まっています。選択するまで保存データは上書きされません。</div>
          )}
        </div>
      )}
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
