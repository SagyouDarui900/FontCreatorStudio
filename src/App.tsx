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
import { KANA_PAIRS } from './data/unicodeTables';
import { Undo2, Redo2, X, PenTool, Grid, Ruler, Shapes } from 'lucide-react';
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

  // Responsive layout tracking
  const [viewportWidth, setViewportWidth] = useState<number>(() => {
    return typeof window !== 'undefined' ? window.innerWidth : 1280;
  });

  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isGridOverlay = viewportWidth < 1024;
  const isMetricsOverlay = viewportWidth < 1280 || (viewportWidth < 1440 && showGridDrawer);

  const isZenMode = !showGridDrawer && !showMetricsDrawer && !showRadicals;
  const toggleZenMode = useCallback(() => {
    if (showGridDrawer || showMetricsDrawer || showRadicals) {
      setShowGridDrawer(false);
      setShowMetricsDrawer(false);
      setShowRadicals(false);
      showToast('全面作図・集中モード（サイドバー収納）', 'info');
    } else {
      setShowGridDrawer(true);
      showToast('標準レイアウトに戻しました', 'info');
    }
  }, [showGridDrawer, showMetricsDrawer, showRadicals, setShowGridDrawer, setShowMetricsDrawer, setShowRadicals, showToast]);

  const toggleGridDrawer = useCallback(() => setShowGridDrawer((prev) => !prev), [setShowGridDrawer]);
  const toggleMetricsDrawer = useCallback(() => setShowMetricsDrawer((prev) => !prev), [setShowMetricsDrawer]);
  const toggleRadicals = useCallback(() => setShowRadicals((prev) => !prev), [setShowRadicals]);
  const openPenPresetsModal = useCallback(() => setIsPenPresetsModalOpen(true), [setIsPenPresetsModalOpen]);

  // Mobile Tab switching logic (UI-10)
  const mobileActiveTab = useMemo(() => {
    if (showGridDrawer) return 'grid';
    if (showMetricsDrawer) return 'metrics';
    if (showRadicals) return 'radicals';
    return 'canvas';
  }, [showGridDrawer, showMetricsDrawer, showRadicals]);

  const handleSwitchMobileTab = useCallback(
    (tab: 'canvas' | 'grid' | 'metrics' | 'radicals') => {
      if (tab === 'canvas') {
        setShowGridDrawer(false);
        setShowMetricsDrawer(false);
        setShowRadicals(false);
      } else if (tab === 'grid') {
        setShowGridDrawer(true);
        setShowMetricsDrawer(false);
        setShowRadicals(false);
      } else if (tab === 'metrics') {
        setShowMetricsDrawer(true);
        setShowGridDrawer(false);
        setShowRadicals(false);
      } else if (tab === 'radicals') {
        setShowRadicals(true);
        setShowGridDrawer(false);
        setShowMetricsDrawer(false);
      }
    },
    [setShowGridDrawer, setShowMetricsDrawer, setShowRadicals]
  );

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
  const handleCloseGridDrawer = useCallback(() => setShowGridDrawer(false), [setShowGridDrawer]);
  const handleCloseMetricsDrawer = useCallback(() => setShowMetricsDrawer(false), [setShowMetricsDrawer]);
  const handleCloseRadicalsDrawer = useCallback(() => setShowRadicals(false), [setShowRadicals]);
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
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isInput =
        activeElement &&
        (activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.tagName === 'SELECT' ||
          activeElement.getAttribute('contenteditable') === 'true');

      if (isInput) return;
      if (isAnyModalOpen) return;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

      if (ctrlOrCmd && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }

      if (ctrlOrCmd && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      if (ctrlOrCmd && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleQuickSaveCurrentGlyph();
        return;
      }

      if (ctrlOrCmd && e.key.toLowerCase() === 'c') {
        if (currentGlyph.contours && currentGlyph.contours.length > 0) {
          e.preventDefault();
          handleCopyGlyph(selectedUnicode);
        }
        return;
      }

      if (ctrlOrCmd && e.key.toLowerCase() === 'v') {
        if (clipboardContours && clipboardContours.length > 0) {
          e.preventDefault();
          handlePasteGlyph(selectedUnicode);
        }
        return;
      }

      if (e.key === 'ArrowLeft' && e.altKey) {
        e.preventDefault();
        handleSelectPrevGlyph();
        return;
      }

      if (e.key === 'ArrowRight' && e.altKey) {
        e.preventDefault();
        handleSelectNextGlyph();
        return;
      }

      if (e.key === 'f' || e.key === 'F') {
        if (!e.ctrlKey && !e.altKey && !e.metaKey) {
          e.preventDefault();
          toggleZenMode();
          return;
        }
      }

      if (e.key === 'v' || e.key === 'V') {
        if (!ctrlOrCmd) setToolMode('select');
      } else if (e.key === 'p' || e.key === 'P') {
        if (!ctrlOrCmd) setToolMode('pen');
      } else if (e.key === 'b' || e.key === 'B') {
        if (!ctrlOrCmd) setToolMode('brush');
      } else if (e.key === 'e' || e.key === 'E') {
        if (!ctrlOrCmd) setToolMode('eraser');
      } else if (e.key === 'r' || e.key === 'R') {
        if (!ctrlOrCmd) setToolMode('rect');
      } else if (e.key === 'o' || e.key === 'O') {
        if (!ctrlOrCmd) setToolMode('ellipse');
      } else if (e.key === 'm' || e.key === 'M') {
        if (!ctrlOrCmd) setToolMode('ruler');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
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
  ]);

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
          <div
            className={`${
              isGridOverlay
                ? 'absolute left-0 top-0 bottom-0 z-30 shadow-2xl w-80 max-w-[85vw]'
                : 'w-72 border-r flex flex-col shrink-0 min-h-0'
            } ${themeClasses.sidebarBg} ${themeClasses.border}`}
          >
            {isGridOverlay && (
              <div className={`p-2 border-b flex justify-between items-center ${themeClasses.border}`}>
                <span className="font-semibold text-xs text-stone-700 dark:text-stone-300">文字一覧（グリッド）</span>
                <button
                  onClick={handleCloseGridDrawer}
                  className="p-1 rounded hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
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
          </div>
        )}

        {/* BackDrop for Left Drawer when in overlay mode */}
        {showGridDrawer && isGridOverlay && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-20"
            onClick={handleCloseGridDrawer}
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
                ? 'absolute right-0 top-0 bottom-0 z-30 shadow-2xl w-80 max-w-[85vw]'
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
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-20"
            onClick={handleCloseMetricsDrawer}
          />
        )}
      </div>

      {/* Desktop/Tablet Bottom Floating Navigation Toolbar & Quick Navigation Bar */}
      <div className={`hidden sm:flex h-9 border-t items-center justify-between px-3 text-xs shrink-0 ${themeClasses.toolbarBg} ${themeClasses.border}`}>
        <div className="flex items-center space-x-2">
          <span className="font-mono text-stone-500 dark:text-stone-400">
            {selectedChar} (U+
            {selectedUnicode.toString(16).toUpperCase().padStart(4, '0')})
          </span>
          <span className="text-stone-300 dark:text-stone-600">|</span>
          <button
            onClick={handleSelectPrevGlyph}
            className="px-1.5 py-0.5 rounded hover:bg-stone-200 dark:hover:bg-stone-700 font-mono text-[11px]"
            title="前の文字へ (Alt+Left)"
          >
            &lt; 前の文字
          </button>
          <button
            onClick={handleSelectNextGlyph}
            className="px-1.5 py-0.5 rounded hover:bg-stone-200 dark:hover:bg-stone-700 font-mono text-[11px]"
            title="次の文字へ (Alt+Right)"
          >
            次の文字 &gt;
          </button>
          <span className="text-stone-300 dark:text-stone-600">|</span>
          <button
            onClick={handleSelectPrevUncompletedGlyph}
            className="px-1.5 py-0.5 rounded hover:bg-stone-200 dark:hover:bg-stone-700 text-[11px] text-amber-600 dark:text-amber-400 font-medium"
            title="前の未作成文字へジャンプ"
          >
            &lt; 前の未作成
          </button>
          <button
            onClick={handleSelectNextUncompletedGlyph}
            className="px-1.5 py-0.5 rounded hover:bg-stone-200 dark:hover:bg-stone-700 text-[11px] text-amber-600 dark:text-amber-400 font-medium"
            title="次の未作成文字へジャンプ"
          >
            次の未作成 &gt;
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-stone-400 text-[11px]">
            輪郭数: {currentGlyph.contours?.length || 0} パス
          </span>
          <span className="text-stone-300 dark:text-stone-600">|</span>
          <button
            onClick={handleUndo}
            disabled={!canUndo}
            className="p-1 rounded disabled:opacity-30 hover:bg-stone-100 dark:hover:bg-stone-800"
            title="元に戻す (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleRedo}
            disabled={!canRedo}
            className="p-1 rounded disabled:opacity-30 hover:bg-stone-100 dark:hover:bg-stone-800"
            title="やり直し (Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Accessible Mobile Bottom Navigation Bar (UI-10) */}
      <nav
        role="tablist"
        aria-label="モバイル主要ナビゲーション"
        className={`sm:hidden fixed bottom-0 left-0 right-0 z-40 border-t flex items-center justify-around h-14 pb-[env(safe-area-inset-bottom,0px)] shadow-lg ${themeClasses.toolbarBg} ${themeClasses.border}`}
      >
        <button
          role="tab"
          aria-selected={mobileActiveTab === 'canvas'}
          aria-label="作図キャンバス画面に切り替え"
          onClick={() => handleSwitchMobileTab('canvas')}
          className={`flex-1 h-full flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
            mobileActiveTab === 'canvas'
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200'
          }`}
        >
          <PenTool className="w-5 h-5" />
          <span>作図</span>
        </button>

        <button
          role="tab"
          aria-selected={mobileActiveTab === 'grid'}
          aria-label="文字一覧（グリッド）画面を開く"
          onClick={() => handleSwitchMobileTab('grid')}
          className={`flex-1 h-full flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
            mobileActiveTab === 'grid'
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200'
          }`}
        >
          <Grid className="w-5 h-5" />
          <span>文字一覧</span>
        </button>

        <button
          role="tab"
          aria-selected={mobileActiveTab === 'metrics'}
          aria-label="メトリクス・文字ガイド設定を開く"
          onClick={() => handleSwitchMobileTab('metrics')}
          className={`flex-1 h-full flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
            mobileActiveTab === 'metrics'
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200'
          }`}
        >
          <Ruler className="w-5 h-5" />
          <span>メトリクス</span>
        </button>

        <button
          role="tab"
          aria-selected={mobileActiveTab === 'radicals'}
          aria-label="部首・パーツライブラリを開く"
          onClick={() => handleSwitchMobileTab('radicals')}
          className={`flex-1 h-full flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
            mobileActiveTab === 'radicals'
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200'
          }`}
        >
          <Shapes className="w-5 h-5" />
          <span>部首</span>
        </button>
      </nav>

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
