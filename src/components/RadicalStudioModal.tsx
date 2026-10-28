import React, { useEffect, useCallback, useMemo, useRef } from 'react';
import {
  X,
  Shapes,
  Sliders,
  Download,
  Upload,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { BundledFontsModal } from './BundledFontsModal';
import { GlyphData } from '../types';
import { contoursToSvgPath } from '../utils/pathUtils';
import { isLightTheme } from '../utils/theme';
import { INITIAL_STUDIO_RADICAL_DEFS } from '../utils/radicalExtractor';
import {
  STUDIO_RADICAL_PRESETS,
  RadicalStudioModalProps,
  KANJI_PRESETS_BY_CATEGORY,
} from './radicalStudio/types';
import { RADICAL_KANJI_DATABASE } from '../data/kanjiRadicalDatabase';
import {
  useRadicalStudioState,
  useRadicalOperations,
  useRadicalCanvas,
  RadicalLeftSidebar,
  RadicalRightSidebar,
  RadicalMobileDrawer,
  RadicalShortcutsHelpModal,
  RadicalExtractContoursModal,
  RadicalTopRibbon,
  RadicalCanvasToolbar,
  RadicalToolSettingsBar,
  RadicalCanvasArea,
} from './radicalStudio';

export type { RadicalStudioModalProps };

export const RadicalStudioModal: React.FC<RadicalStudioModalProps> = ({
  isOpen,
  onClose,
  project,
  selectedChar,
  selectedUnicode,
  onInsertToCurrentGlyph,
  onBatchInsertToGlyphs,
  theme,
  onShowToast,
}) => {
  const isLight = isLightTheme(theme);

  const {
    parts,
    setParts,
    selectedPartId,
    setSelectedPartId,
    activePart,
    leftSidebarTab,
    setLeftSidebarTab,
    activeCategory,
    setActiveCategory,
    searchQuery,
    setSearchQuery,
    kanjiDbCategory,
    setKanjiDbCategory,
    kanjiDbSearch,
    setKanjiDbSearch,
    selectedRadicalDbId,
    setSelectedRadicalDbId,
    selectedFontStyle,
    setSelectedFontStyle,
    isLoadingPreset,
    setIsLoadingPreset,
    isImportingAll,
    setIsImportingAll,
    isLicenseModalOpen,
    setIsLicenseModalOpen,
    toolMode,
    setToolMode,
    brushWidth,
    setBrushWidth,
    brushStyle,
    setBrushStyle,
    pressureSensitivity,
    setPressureSensitivity,
    isStraightMode,
    setIsStraightMode,
    isAutoUnionMode,
    setIsAutoUnionMode,
    showPenShortcutsHelp,
    setShowPenShortcutsHelp,
    zoom,
    setZoom,
    pan,
    setPan,
    showGrid,
    setShowGrid,
    showKanjiGuides,
    setShowKanjiGuides,
    isWireframeMode,
    setIsWireframeMode,
    showNineBoxes,
    setShowNineBoxes,
    showMetrics,
    setShowMetrics,
    showWatermark,
    setShowWatermark,
    watermarkChar,
    setWatermarkChar,
    watermarkOpacity,
    setWatermarkOpacity,
    watermarkScale,
    setWatermarkScale,
    showWatermarkPicker,
    setShowWatermarkPicker,
    isSnapEnabled,
    setIsSnapEnabled,
    activeSnapLines,
    setActiveSnapLines,
    insertMode,
    setInsertMode,
    batchCharsInput,
    setBatchCharsInput,
    selectedBatchChars,
    setSelectedBatchChars,
    insertingPresetId,
    setInsertingPresetId,
    selectedContourId,
    setSelectedContourId,
    selectedNodeId,
    setSelectedNodeId,
    isSpacePressed,
    setIsSpacePressed,
    undoStack,
    setUndoStack,
    redoStack,
    setRedoStack,
    eraserMode,
    setEraserMode,
    eraserRadius,
    setEraserRadius,
    targetChar,
    insertPlacement,
    setInsertPlacement,
    showExtractModal,
    setShowExtractModal,
    extractSearch,
    setExtractSearch,
    isFullscreen,
    setIsFullscreen,
    isLeftSidebarOpen,
    setIsLeftSidebarOpen,
    isRightSidebarOpen,
    setIsRightSidebarOpen,
    rightTab,
    setRightTab,
    mobileSheetSnap,
    setMobileSheetSnap,
    mobileSheetTab,
    setMobileSheetTab,
    notify,
    commitPartChange,
    handleUndo,
    handleRedo,
    handleCreateNewPart,
    handleDuplicatePart,
    handleDeletePart,
  } = useRadicalStudioState({
    selectedChar,
    onShowToast,
  });

  const {
    svgCanvasRef,
    canvasContainerRef,
    isPanning,
    isMoveAllPart,
    setIsMoveAllPart,
    activeBrushPathRef,
    activeEraserPathRef,
    activePenContour,
    setActivePenContour,
    penMousePos,
    penHudPos,
    setPenHudPos,
    isPenNearFirstNode,
    eraserHoverPos,
    setEraserHoverPos,
    shapeStartPoint,
    shapeCurrentPoint,
    activeShapeType,
    setActiveShapeType,
    showShapeMenu,
    setShowShapeMenu,
    penStrokeWidth,
    setPenStrokeWidth,
    showPenStrokeMenu,
    setShowPenStrokeMenu,
    brushSvgPath,
    penSvgPath,
    getShapeContours,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    handleWheel,
    handleUndoPartPenNode,
    handleResetPartPenContour,
    handleFinishPartPenContour,
    handlePartPenHudPointerDown,
    handlePartPenHudPointerMove,
    handlePartPenHudPointerUp,
  } = useRadicalCanvas({
    activePart,
    commitPartChange,
    toolMode,
    setToolMode,
    brushStyle,
    brushWidth,
    isStraightMode,
    pressureSensitivity,
    eraserMode,
    eraserRadius,
    isAutoUnionMode,
    notify,
    zoom,
    setZoom,
    pan,
    setPan,
    isSpacePressed,
    selectedNodeId,
    setSelectedNodeId,
    selectedContourId,
    setSelectedContourId,
    activeSnapLines,
    setActiveSnapLines,
    setParts,
    isSnapEnabled,
    showGrid,
    setUndoStack,
    setRedoStack,
  });

  const {
    svgFileInputRef,
    jsonFileInputRef,
    handleDeleteSelectedNode,
    handleToggleSelectedNodeType,
    handleDeleteSelectedContour,
    handleDuplicateSelectedContour,
    handleFlipSelectedContour,
    handleSmoothSelectedContour,
    handleExtractFromGlyph,
    handleInsertToGlyph,
    handleBatchInsertToGlyphs,
    handleBatchInsertRadicalEntry,
    handleExtractFromCurrentGlyph,
    handleLoadPreset,
    handleInsertPresetDirectly,
    handleQuickInsertPlacement,
    handleUpgradeDefaultParts,
    handleImportDefaultRadicals,
    handleExportLibraryJson,
    handleImportLibraryJson,
    handleExportPartSvg,
    handleImportSvgFile,
    handleSlantPart,
    handleRotatePart,
    handleFlipHPart,
    handleFlipVPart,
    handleScalePart,
    handleFitToPlacement,
    handleUnionPart,
    handleNormalizeWinding,
    handleSimplifyPart,
    handleCenterPartInCanvas,
    handleClearCanvas,
    handleNudgePart,
  } = useRadicalOperations({
    activePart,
    parts,
    setParts,
    selectedPartId,
    setSelectedPartId,
    selectedContourId,
    setSelectedContourId,
    selectedNodeId,
    setSelectedNodeId,
    commitPartChange,
    notify,
    activeBrushPathRef,
    setActivePenContour,
    targetChar,
    selectedChar,
    selectedUnicode,
    insertPlacement,
    batchCharsInput,
    selectedBatchChars,
    selectedFontStyle,
    insertingPresetId,
    setInsertingPresetId,
    setIsLoadingPreset,
    setIsImportingAll,
    setShowExtractModal,
    setLeftSidebarTab,
    onInsertToCurrentGlyph,
    onBatchInsertToGlyphs,
    onClose,
    project,
  });

  const resetView = useCallback(() => {
    const el = canvasContainerRef.current;
    if (!el) {
      setZoom(0.55);
      setPan({ x: 180, y: 140 });
      return;
    }
    const rect = el.getBoundingClientRect();
    const fitZoom = Math.min((rect.width - 60) / 1000, (rect.height - 60) / 1000);
    const clampedZoom = Math.max(0.2, Math.min(1.5, Number(fitZoom.toFixed(2))));
    setZoom(clampedZoom);
    setPan({
      x: (rect.width - 1000 * clampedZoom) / 2,
      y: (rect.height - 1000 * clampedZoom) / 2,
    });
  }, [canvasContainerRef, setZoom, setPan]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        resetView();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, resetView]);

  useEffect(() => {
    setUndoStack([]);
    setRedoStack([]);
    setSelectedContourId(null);
    setSelectedNodeId(null);
    setActivePenContour(null);
  }, [selectedPartId, setUndoStack, setRedoStack, setSelectedContourId, setSelectedNodeId, setActivePenContour]);

  // Related Kanji list containing current radical for watermark tracing guide picker
  const relatedKanjiList = useMemo(() => {
    if (!activePart) return ['休', '体', '保', '信', '作', '使', '個', '倍', '値', '倶'];

    const partName = activePart.name || '';
    const matchEntry = RADICAL_KANJI_DATABASE.find(
      (r) =>
        (partName && (partName.includes(r.name) || r.name.includes(partName))) ||
        (activePart.char && r.char === activePart.char) ||
        r.id === activePart.id
    );

    if (matchEntry && matchEntry.kanjiList.length > 0) {
      return matchEntry.kanjiList;
    }

    const categoryPresets = (activePart?.category ? KANJI_PRESETS_BY_CATEGORY[activePart.category] : null) || KANJI_PRESETS_BY_CATEGORY.other;
    const projectChars = (Object.values(project.glyphs || {}) as GlyphData[]).map((g) => g.char);
    const combined = Array.from(new Set([...categoryPresets, ...projectChars])).filter(Boolean);
    return combined.length > 0 ? combined.slice(0, 20) : ['休', '体', '保', '信', '作', '使', '個', '倍'];
  }, [activePart, project.glyphs]);

  // Global Keyboard Shortcuts within Studio Modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      // Undo / Redo
      const isZ = e.code === 'KeyZ' || e.key === 'z' || e.key === 'Z';
      const isY = e.code === 'KeyY' || e.key === 'y' || e.key === 'Y';
      if ((e.ctrlKey || e.metaKey) && isZ) {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else if (activePenContour && activePenContour.nodes.length > 0) {
          handleUndoPartPenNode();
        } else {
          handleUndo();
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && isY) {
        e.preventDefault();
        handleRedo();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyA' || e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        setIsMoveAllPart(true);
        setSelectedContourId(null);
        setSelectedNodeId(null);
        notify('部首の全ストロークを選択しました（全体移動可能）', 'info');
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyS' || e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        handleExportLibraryJson();
        return;
      }

      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setIsSpacePressed(true);
        return;
      }

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        let dx = 0;
        let dy = 0;
        if (e.key === 'ArrowLeft') dx = -step;
        if (e.key === 'ArrowRight') dx = step;
        if (e.key === 'ArrowUp') dy = -step;
        if (e.key === 'ArrowDown') dy = step;

        handleNudgePart(dx, dy);
        return;
      }

      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.code === 'KeyV' || e.key === 'v' || e.key === 'V') {
          e.preventDefault();
          setToolMode('select');
        } else if (e.code === 'KeyP' || e.key === 'p' || e.key === 'P') {
          e.preventDefault();
          setToolMode('pen');
        } else if (e.code === 'KeyB' || e.key === 'b' || e.key === 'B') {
          e.preventDefault();
          setToolMode('brush');
        } else if (e.code === 'KeyE' || e.key === 'e' || e.key === 'E') {
          e.preventDefault();
          setToolMode('eraser');
        } else if (e.code === 'KeyH' || e.key === 'h' || e.key === 'H') {
          e.preventDefault();
          setToolMode('hand');
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          if (activePenContour) {
            handleUndoPartPenNode();
          } else if (selectedNodeId) {
            handleDeleteSelectedNode();
          } else if (selectedContourId) {
            handleDeleteSelectedContour();
          }
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (activePenContour && activePenContour.nodes.length >= 2) {
            handleFinishPartPenContour(true);
          }
        } else if (e.key === 'Escape') {
          e.preventDefault();
          if (activePenContour) {
            handleResetPartPenContour();
          } else {
            setSelectedNodeId(null);
            setSelectedContourId(null);
            setIsMoveAllPart(false);
          }
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    isOpen,
    activePenContour,
    selectedNodeId,
    selectedContourId,
    handleUndo,
    handleRedo,
    handleUndoPartPenNode,
    handleResetPartPenContour,
    handleFinishPartPenContour,
    handleDeleteSelectedNode,
    handleDeleteSelectedContour,
    handleExportLibraryJson,
    handleNudgePart,
    setIsMoveAllPart,
    setIsSpacePressed,
    setToolMode,
    setSelectedContourId,
    setSelectedNodeId,
    notify,
  ]);

  const hasUpgradedDefaultsRef = useRef(false);

  useEffect(() => {
    if (!isOpen || hasUpgradedDefaultsRef.current) return;
    hasUpgradedDefaultsRef.current = true;

    const hasLowQualityDefaults = parts.some((p) => {
      const isInitialPart = INITIAL_STUDIO_RADICAL_DEFS.some(
        (d) => p.name === d.name || p.name.startsWith(d.name.split(' ')[0])
      );
      if (!isInitialPart || !p.contours || p.contours.length === 0) return false;
      const totalNodes = p.contours.reduce((acc, c) => acc + (c.nodes?.length || 0), 0);
      const hasSmooth = p.contours.some((c) =>
        c.nodes?.some((n) => n.type === 'smooth' && (n.handleIn || n.handleOut))
      );
      return totalNodes < 30 || !hasSmooth;
    });

    if (hasLowQualityDefaults) {
      handleUpgradeDefaultParts(selectedFontStyle, true);
    }
  }, [isOpen, parts, selectedFontStyle, handleUpgradeDefaultParts]);

  const filteredPresets = useMemo(() => {
    return STUDIO_RADICAL_PRESETS.filter((radical) => {
      const matchesCat = activeCategory === 'all' || radical.category === activeCategory;
      const matchesSearch =
        searchQuery.trim() === '' ||
        radical.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (radical.char && radical.char.includes(searchQuery.trim())) ||
        (radical.description && radical.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCat && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  const modifiedGlyphs = useMemo(() => {
    return (Object.values(project?.glyphs || {}) as GlyphData[]).filter(
      (g) => g && g.contours && g.contours.length > 0
    );
  }, [project?.glyphs]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 select-none animate-fadeIn">
      <input
        type="file"
        ref={svgFileInputRef}
        onChange={handleImportSvgFile}
        accept=".svg"
        className="hidden"
      />
      <input
        type="file"
        ref={jsonFileInputRef}
        onChange={handleImportLibraryJson}
        accept=".json"
        className="hidden"
      />

      <div
        className={`w-full h-full flex flex-col overflow-hidden transition-all ${
          isFullscreen
            ? isLight
              ? 'fixed inset-0 z-50 w-screen h-screen bg-[#f4f8f5] text-stone-800'
              : 'fixed inset-0 z-50 w-screen h-screen bg-[#121b15] text-emerald-100'
            : isLight
            ? 'w-full sm:w-[98vw] h-[100vh] sm:h-[94vh] max-w-[1720px] rounded-none sm:rounded-xl border border-stone-200/60 shadow-xl bg-[#f4f8f5] text-stone-800'
            : 'w-full sm:w-[98vw] h-[100vh] sm:h-[94vh] max-w-[1720px] rounded-none sm:rounded-xl border border-stone-800/60 shadow-xl bg-[#121b15] text-emerald-100'
        }`}
      >
        {/* MODAL TOP HEADER */}
        <div
          className={`px-3 sm:px-4 py-2 border-b flex items-center justify-between shrink-0 gap-2 ${
            isLight ? 'bg-white border-stone-200/60' : 'bg-[#18241c] border-stone-800/60'
          }`}
        >
          <div className="flex items-center space-x-2.5 min-w-0">
            <div
              className={`p-1.5 rounded-lg shrink-0 ${
                isLight ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-950/80 text-emerald-300'
              }`}
            >
              <Shapes className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold tracking-wide truncate">
                  部首・作字パーツ工房
                </h2>
                <span className="text-xs text-stone-500 font-mono font-medium truncate shrink-0">
                  パーツ数 {parts.length}
                </span>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate hidden md:block">
                偏旁・冠脚・筆画を設計し、漢字や文字へワンクリック合成
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-1.5 shrink-0">
            <button
              onClick={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                isLeftSidebarOpen
                  ? isLight
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-2xs'
                    : 'bg-[#1e2d22] border-emerald-700 text-emerald-200 shadow-2xs'
                  : isLight
                  ? 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                  : 'bg-[#18231c] border-[#25362b] text-stone-400 hover:bg-[#202e25]'
              }`}
              title={isLeftSidebarOpen ? 'ライブラリを収納' : 'ライブラリを展開'}
            >
              <Shapes className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">ライブラリ</span>
            </button>

            <button
              onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                isRightSidebarOpen
                  ? isLight
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-2xs'
                    : 'bg-[#1e2d22] border-emerald-700 text-emerald-200 shadow-2xs'
                  : isLight
                  ? 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                  : 'bg-[#18231c] border-[#25362b] text-stone-400 hover:bg-[#202e25]'
              }`}
              title={isRightSidebarOpen ? '詳細パネルを収納' : '詳細パネルを展開'}
            >
              <Sliders className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">詳細・変形</span>
            </button>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0">
            <button
              onClick={handleExportLibraryJson}
              className={`p-1.5 px-2 rounded-md border text-xs font-semibold hidden sm:flex items-center space-x-1 transition-all cursor-pointer ${
                isLight
                  ? 'bg-white border-[#d8e6df] text-stone-700 hover:bg-emerald-50 hover:text-emerald-900'
                  : 'bg-[#1c2920] border-[#25362b] text-emerald-200 hover:bg-[#25362b]'
              }`}
              title="全パーツライブラリをJSONセーブデータとして書き出し"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">保存</span>
            </button>
            <button
              onClick={() => jsonFileInputRef.current?.click()}
              className={`p-1.5 px-2 rounded-md border text-xs font-semibold hidden sm:flex items-center space-x-1 transition-all cursor-pointer ${
                isLight
                  ? 'bg-white border-[#d8e6df] text-stone-700 hover:bg-emerald-50 hover:text-emerald-900'
                  : 'bg-[#1c2920] border-[#25362b] text-emerald-200 hover:bg-[#25362b]'
              }`}
              title="JSONセーブデータからパーツライブラリを読み込み"
            >
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">読込</span>
            </button>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className={`p-1.5 px-2 rounded-md border text-xs font-semibold flex items-center space-x-1 transition-all cursor-pointer ${
                isFullscreen
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : isLight
                  ? 'bg-white border-[#d8e6df] text-stone-700 hover:bg-emerald-50 hover:text-emerald-900'
                  : 'bg-[#1c2920] border-[#25362b] text-emerald-200 hover:bg-[#25362b]'
              }`}
              title={isFullscreen ? '通常表示に戻す' : '工房を全画面で広々と使う'}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">縮小</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">全画面</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                isLight ? 'text-stone-600 hover:bg-emerald-100' : 'text-stone-400 hover:bg-[#223126]'
              }`}
              title="工房を閉じる"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 3-COLUMN WORKSPACE */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          <RadicalLeftSidebar
            isLeftSidebarOpen={isLeftSidebarOpen}
            setIsLeftSidebarOpen={setIsLeftSidebarOpen}
            leftSidebarTab={leftSidebarTab}
            setLeftSidebarTab={setLeftSidebarTab}
            isLight={isLight}
            parts={parts}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
            selectedFontStyle={selectedFontStyle}
            setSelectedFontStyle={setSelectedFontStyle}
            onUpgradeDefaultParts={handleUpgradeDefaultParts}
            onImportDefaultRadicals={handleImportDefaultRadicals}
            onOpenBundledFontsModal={() => setIsLicenseModalOpen(true)}
            kanjiDbSearch={kanjiDbSearch}
            setKanjiDbSearch={setKanjiDbSearch}
            kanjiDbCategory={kanjiDbCategory}
            setKanjiDbCategory={setKanjiDbCategory}
            selectedRadicalDbId={selectedRadicalDbId}
            setSelectedRadicalDbId={setSelectedRadicalDbId}
            watermarkChar={watermarkChar}
            onSetWatermarkChar={setWatermarkChar}
            selectedChar={selectedChar}
            project={project}
            onBatchInsertRadicalEntry={handleBatchInsertRadicalEntry}
            onLoadPreset={handleLoadPreset}
            onInsertPresetDirectly={handleInsertPresetDirectly}
            insertPlacement={insertPlacement}
            activePart={activePart}
            selectedPartId={selectedPartId}
            setSelectedPartId={setSelectedPartId}
            onCreateNewPart={handleCreateNewPart}
            onExtractFromCurrentGlyph={handleExtractFromCurrentGlyph}
            onOpenExtractModal={() => setShowExtractModal(true)}
            onDuplicatePart={handleDuplicatePart}
            onDeletePart={handleDeletePart}
            contoursToSvgPath={contoursToSvgPath}
            setShowWatermark={setShowWatermark}
            notify={notify}
            isLoadingPreset={isLoadingPreset}
            isImportingAll={isImportingAll}
          />

          <div className="flex-1 flex flex-col min-w-0 min-h-0 relative overflow-hidden pb-14 md:pb-0">
            <RadicalTopRibbon
              isLight={isLight}
              selectedChar={selectedChar}
              activePart={activePart}
              handleQuickInsertPlacement={handleQuickInsertPlacement}
              handleExtractFromCurrentGlyph={handleExtractFromCurrentGlyph}
            />

            <RadicalCanvasToolbar
              toolMode={toolMode}
              setToolMode={setToolMode}
              activeShapeType={activeShapeType}
              setActiveShapeType={setActiveShapeType}
              showShapeMenu={showShapeMenu}
              setShowShapeMenu={setShowShapeMenu}
              isLight={isLight}
              isAutoUnionMode={isAutoUnionMode}
              setIsAutoUnionMode={setIsAutoUnionMode}
              notify={notify}
              handleUnionPart={handleUnionPart}
              handleNormalizeWinding={handleNormalizeWinding}
              handleSimplifyPart={handleSimplifyPart}
              handleCenterPartInCanvas={handleCenterPartInCanvas}
              handleFlipHPart={handleFlipHPart}
              handleFlipVPart={handleFlipVPart}
              zoom={zoom}
              setZoom={setZoom}
              resetView={resetView}
              undoStack={undoStack}
              redoStack={redoStack}
              handleUndo={handleUndo}
              handleRedo={handleRedo}
              showKanjiGuides={showKanjiGuides}
              setShowKanjiGuides={setShowKanjiGuides}
              isWireframeMode={isWireframeMode}
              setIsWireframeMode={setIsWireframeMode}
              showNineBoxes={showNineBoxes}
              setShowNineBoxes={setShowNineBoxes}
              isSnapEnabled={isSnapEnabled}
              setIsSnapEnabled={setIsSnapEnabled}
              showWatermark={showWatermark}
              setShowWatermark={setShowWatermark}
              watermarkChar={watermarkChar}
              setWatermarkChar={setWatermarkChar}
              selectedChar={selectedChar}
              watermarkOpacity={watermarkOpacity}
              setWatermarkOpacity={setWatermarkOpacity}
              showWatermarkPicker={showWatermarkPicker}
              setShowWatermarkPicker={setShowWatermarkPicker}
              relatedKanjiList={relatedKanjiList}
              watermarkScale={watermarkScale}
              setWatermarkScale={setWatermarkScale}
              handleClearCanvas={handleClearCanvas}
              activePart={activePart}
            />

            <RadicalToolSettingsBar
              toolMode={toolMode}
              isLight={isLight}
              brushStyle={brushStyle}
              setBrushStyle={setBrushStyle}
              isAutoUnionMode={isAutoUnionMode}
              setIsAutoUnionMode={setIsAutoUnionMode}
              brushWidth={brushWidth}
              setBrushWidth={setBrushWidth}
              pressureSensitivity={pressureSensitivity}
              setPressureSensitivity={setPressureSensitivity}
              isStraightMode={isStraightMode}
              setIsStraightMode={setIsStraightMode}
              showPenShortcutsHelp={showPenShortcutsHelp}
              setShowPenShortcutsHelp={setShowPenShortcutsHelp}
              eraserMode={eraserMode}
              setEraserMode={setEraserMode}
              eraserRadius={eraserRadius}
              setEraserRadius={setEraserRadius}
              selectedNodeId={selectedNodeId}
              selectedContourId={selectedContourId}
              handleToggleSelectedNodeType={handleToggleSelectedNodeType}
              handleDeleteSelectedNode={handleDeleteSelectedNode}
              handleDuplicateSelectedContour={handleDuplicateSelectedContour}
              handleDeleteSelectedContour={handleDeleteSelectedContour}
              activePart={activePart}
              handleUnionPart={handleUnionPart}
              activePenContour={activePenContour}
              isPenNearFirstNode={isPenNearFirstNode}
            />

            <RadicalCanvasArea
              canvasContainerRef={canvasContainerRef}
              svgCanvasRef={svgCanvasRef}
              isLight={isLight}
              toolMode={toolMode}
              activePart={activePart}
              activePenContour={activePenContour}
              penHudPos={penHudPos}
              setPenHudPos={setPenHudPos}
              handlePartPenHudPointerDown={handlePartPenHudPointerDown}
              handlePartPenHudPointerMove={handlePartPenHudPointerMove}
              handlePartPenHudPointerUp={handlePartPenHudPointerUp}
              handleUndoPartPenNode={handleUndoPartPenNode}
              handleFinishPartPenContour={handleFinishPartPenContour}
              showPenStrokeMenu={showPenStrokeMenu}
              setShowPenStrokeMenu={setShowPenStrokeMenu}
              penStrokeWidth={penStrokeWidth}
              setPenStrokeWidth={setPenStrokeWidth}
              handleResetPartPenContour={handleResetPartPenContour}
              selectedNodeId={selectedNodeId}
              selectedContourId={selectedContourId}
              handleToggleSelectedNodeType={handleToggleSelectedNodeType}
              handleDeleteSelectedNode={handleDeleteSelectedNode}
              handleDuplicateSelectedContour={handleDuplicateSelectedContour}
              handleFlipSelectedContour={handleFlipSelectedContour}
              handleSmoothSelectedContour={handleSmoothSelectedContour}
              handleDeleteSelectedContour={handleDeleteSelectedContour}
              isMoveAllPart={isMoveAllPart}
              isSpacePressed={isSpacePressed}
              isPanning={isPanning}
              handlePointerDown={handlePointerDown}
              handlePointerMove={handlePointerMove}
              handlePointerUp={handlePointerUp}
              handlePointerCancel={handlePointerCancel}
              setEraserHoverPos={setEraserHoverPos}
              handleWheel={handleWheel}
              pan={pan}
              zoom={zoom}
              setZoom={setZoom}
              resetView={resetView}
              showGrid={showGrid}
              showMetrics={showMetrics}
              showKanjiGuides={showKanjiGuides}
              showNineBoxes={showNineBoxes}
              showWatermark={showWatermark}
              watermarkChar={watermarkChar}
              watermarkOpacity={watermarkOpacity}
              watermarkScale={watermarkScale}
              project={project}
              isSnapEnabled={isSnapEnabled}
              activeSnapLines={activeSnapLines}
              isWireframeMode={isWireframeMode}
              eraserRadius={eraserRadius}
              eraserHoverPos={eraserHoverPos}
              activeBrushPathRef={activeBrushPathRef}
              brushSvgPath={brushSvgPath}
              activeEraserPathRef={activeEraserPathRef}
              penSvgPath={penSvgPath}
              penMousePos={penMousePos}
              isPenNearFirstNode={isPenNearFirstNode}
              shapeStartPoint={shapeStartPoint}
              shapeCurrentPoint={shapeCurrentPoint}
              getShapeContours={getShapeContours}
              handleUndo={handleUndo}
              handleRedo={handleRedo}
              undoStack={undoStack}
              redoStack={redoStack}
            />
          </div>

          <RadicalRightSidebar
            isRightSidebarOpen={isRightSidebarOpen}
            setIsRightSidebarOpen={setIsRightSidebarOpen}
            rightTab={rightTab}
            setRightTab={setRightTab}
            isLight={isLight}
            activePart={activePart}
            setParts={setParts}
            handleUnionPart={handleUnionPart}
            handleNormalizeWinding={handleNormalizeWinding}
            handleScalePart={handleScalePart}
            handleNudgePart={handleNudgePart}
            handleCenterPartInCanvas={handleCenterPartInCanvas}
            handleFlipHPart={handleFlipHPart}
            handleFlipVPart={handleFlipVPart}
            handleRotatePart={handleRotatePart}
            handleSlantPart={handleSlantPart}
            handleFitToPlacement={handleFitToPlacement}
            handleExportPartSvg={handleExportPartSvg}
            svgFileInputRef={svgFileInputRef}
            handleDuplicatePart={handleDuplicatePart}
            handleDeletePart={handleDeletePart}
            insertMode={insertMode}
            setInsertMode={setInsertMode}
            insertPlacement={insertPlacement}
            setInsertPlacement={setInsertPlacement}
            handleInsertToGlyph={handleInsertToGlyph}
            selectedBatchChars={selectedBatchChars}
            setSelectedBatchChars={setSelectedBatchChars}
            batchCharsInput={batchCharsInput}
            setBatchCharsInput={setBatchCharsInput}
            handleBatchInsertToGlyphs={handleBatchInsertToGlyphs}
            project={project}
            selectedChar={selectedChar}
            selectedUnicode={selectedUnicode}
            notify={notify}
          />
        </div>

        <RadicalMobileDrawer
          mobileSheetSnap={mobileSheetSnap}
          setMobileSheetSnap={setMobileSheetSnap}
          mobileSheetTab={mobileSheetTab}
          setMobileSheetTab={setMobileSheetTab}
          isLight={isLight}
          leftSidebarTab={leftSidebarTab}
          setLeftSidebarTab={setLeftSidebarTab}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          activeCategory={activeCategory}
          filteredPresets={filteredPresets}
          parts={parts}
          activePart={activePart}
          selectedPartId={selectedPartId}
          setSelectedPartId={setSelectedPartId}
          handleLoadPreset={handleLoadPreset}
          selectedRadicalDbId={selectedRadicalDbId}
          setSelectedRadicalDbId={setSelectedRadicalDbId}
          handleCreateNewPart={handleCreateNewPart}
          handleDuplicatePart={handleDuplicatePart}
          handleDeletePart={handleDeletePart}
          handleCenterPartInCanvas={handleCenterPartInCanvas}
          handleScalePart={handleScalePart}
          handleRotatePart={handleRotatePart}
          handleSlantPart={handleSlantPart}
          handleFlipHPart={handleFlipHPart}
          handleFlipVPart={handleFlipVPart}
          handleQuickInsertPlacement={handleQuickInsertPlacement}
          selectedChar={selectedChar}
          contoursToSvgPath={contoursToSvgPath}
          setWatermarkChar={setWatermarkChar}
          setShowWatermark={setShowWatermark}
          notify={notify}
          commitPartChange={commitPartChange}
        />
      </div>

      <RadicalShortcutsHelpModal
        isOpen={showPenShortcutsHelp}
        onClose={() => setShowPenShortcutsHelp(false)}
        isLight={isLight}
      />
      <RadicalExtractContoursModal
        isOpen={showExtractModal}
        onClose={() => setShowExtractModal(false)}
        isLight={isLight}
        glyphs={modifiedGlyphs}
        onExtractFromGlyph={handleExtractFromGlyph}
        contoursToSvgPath={contoursToSvgPath}
      />
      <BundledFontsModal
        isOpen={isLicenseModalOpen}
        onClose={() => setIsLicenseModalOpen(false)}
        theme={theme}
      />
    </div>
  );
};
