import React, { useEffect, useRef, useState } from 'react';
import {
  Download,
  Play,
  Undo2,
  Redo2,
  Grid,
  Layers,
  SlidersHorizontal,
  Lock,
  Unlock,
} from 'lucide-react';
import { isLightTheme, getThemeClasses } from '../utils/theme';
import { PWAInstallButton } from './PWAInstallButton';
import { useFullscreen } from '../hooks/useFullscreen';
import { useModalContext } from '../contexts/ModalContext';
import { ProgressSummaryPill } from './progress/ProgressSummaryPill';
import {
  HeaderProps,
  useProjectFileIO,
  NewProjectModal,
  ThemeMenuDropdown,
  ToolsMenuDropdown,
} from './header';

export type { HeaderProps };

export const Header: React.FC<HeaderProps> = React.memo(({
  project,
  setProject,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onOpenTestModal,
  onOpenFontInfoModal,
  onOpenTraceModal,
  onOpenSvgModal,
  onOpenBatchNormalizeModal,
  onOpenQualityModal,
  onOpenGlyphSynthesisModal,
  onOpenKerningModal,
  onOpenWeightInterpolationModal,
  onOpenGlyphCompareModal,
  onOpenRadicalStudio,
  onOpenPixelStudio,
  onOpenOpenTypeFeaturesModal,
  onOpenMojikumiStudio,
  onOpenGridFittingModal,
  onOpenStorageManagerModal,
  onOpenExportModal,
  onToggleRadicals,
  showRadicals,
  onToggleGridDrawer,
  showGridDrawer,
  onToggleMetricsDrawer,
  showMetricsDrawer,
  onToggleZenMode,
  isZenMode = false,
  onApplyHandwritingPreset,
  onOpenShortcutsModal,
  onOpenPenPresetsModal,
  selectedChar,
  selectedUnicode,
  isGlyphLocked = false,
  onToggleLockGlyph,
  theme,
  onToggleTheme,
  onChangeTheme,
  onShowToast,
}) => {
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const toolsMenuRef = useRef<HTMLDivElement>(null);
  const themeMenuRef = useRef<HTMLDivElement>(null);

  const { openModal } = useModalContext();

  const { isFullscreen, toggleFullscreen } = useFullscreen(onToggleZenMode, isZenMode);

  const {
    fileInputRef,
    projectInputRef,
    isConfirmingNew,
    setIsConfirmingNew,
    newProjectName,
    setNewProjectName,
    handleNewProjectWithCustomName,
    handleSaveProjectJson,
    handleLoadProjectJson,
    handleImportTtf,
    handleExportTtf,
    notify,
  } = useProjectFileIO({
    project,
    setProject,
    onShowToast,
    onOpenExportModal,
  });

  useEffect(() => {
    if (!showToolsMenu && !showThemeMenu) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent | PointerEvent) => {
      const target = e.target as Node;
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(target)) {
        setShowToolsMenu(false);
      }
      if (themeMenuRef.current && !themeMenuRef.current.contains(target)) {
        setShowThemeMenu(false);
      }
    };
    document.addEventListener('pointerdown', handleClickOutside);
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
    };
  }, [showToolsMenu, showThemeMenu]);

  const glyphCount = Object.keys(project.glyphs).length;
  const isLight = isLightTheme(theme);
  const themeClasses = getThemeClasses(theme);

  return (
    <header
      className={`min-h-[40px] h-[calc(2.5rem+env(safe-area-inset-top,0px))] pt-[env(safe-area-inset-top,0px)] border-b flex items-center justify-between px-2 shrink-0 z-40 select-none relative transition-colors overflow-visible gap-1.5 ${themeClasses.headerBg}`}
    >
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".ttf,.otf,.woff"
        className="hidden"
        onChange={handleImportTtf}
      />
      <input
        ref={projectInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleLoadProjectJson}
      />

      {/* Left: Sidebar Toggle & Brand & Project Info */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink min-w-0">
        <button
          onClick={onToggleGridDrawer}
          className={`h-7 px-2 rounded-md transition-colors inline-flex items-center gap-1 text-xs font-bold shrink-0 border cursor-pointer ${
            showGridDrawer
              ? themeClasses.activeTool
              : `${themeClasses.cardBg} ${themeClasses.activeToolHover}`
          }`}
          title="文字一覧（コード表）の表示/非表示"
        >
          <Grid className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline leading-none">文字一覧</span>
        </button>

        <div className={`h-4 w-[1px] hidden sm:block ${themeClasses.border}`} />

        {/* Brand & Project Info (Single-line compact CAD header) */}
        <div className="flex items-center gap-1.5 shrink min-w-0">
          <span
            className="text-xs font-bold tracking-tight truncate max-w-[70px] xs:max-w-[110px] sm:max-w-[140px] md:max-w-[170px] whitespace-nowrap"
            title={project.metadata.familyName || 'FontCreator'}
          >
            {project.metadata.familyName && project.metadata.familyName !== 'OTEdit-Style Font' && project.metadata.familyName !== '新規フォント'
              ? project.metadata.familyName
              : 'FontCreator'}
          </span>
          {project.metadata.styleName && project.metadata.styleName !== 'Regular' && (
            <span
              className={`text-[9px] px-1 py-0.5 rounded font-mono hidden lg:inline-block leading-none shrink-0 border ${themeClasses.accentBadge}`}
              title={`スタイル: ${project.metadata.styleName}`}
            >
              {project.metadata.styleName}
            </span>
          )}
          <span
            className={`text-[10px] font-mono tabular-nums hidden xl:inline truncate leading-none ${themeClasses.textMuted}`}
            title={`編集中: ${selectedChar || 'なし'} (U+${selectedUnicode.toString(16).toUpperCase().padStart(4, '0')}) · 全${glyphCount}字`}
          >
            <strong className={`${themeClasses.accentText} font-sans`}>{selectedChar || 'なし'}</strong>{' '}
            · {glyphCount}字
          </span>
          {onToggleLockGlyph && (
            <button
              id="btn-header-lock-glyph"
              onClick={onToggleLockGlyph}
              className={`h-6 px-1.5 rounded-md transition-colors inline-flex items-center gap-1 border text-[10px] font-bold shrink-0 whitespace-nowrap cursor-pointer ${
                isGlyphLocked
                  ? isLight
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-amber-950/80 text-amber-300 border-amber-700'
                  : `${themeClasses.cardBg} ${themeClasses.activeToolHover}`
              }`}
              title={
                isGlyphLocked
                  ? `「${selectedChar}」は編集ロック（保護）されています。クリックでロック解除`
                  : `「${selectedChar}」を編集ロック（誤操作や意図しない変更を防止）`
              }
            >
              {isGlyphLocked ? (
                <>
                  <Lock className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="hidden sm:inline text-amber-800 dark:text-amber-300 leading-none whitespace-nowrap">ロック中</span>
                </>
              ) : (
                <>
                  <Unlock className="w-2.5 h-2.5 opacity-60 shrink-0" />
                  <span className="hidden sm:inline leading-none whitespace-nowrap">ロック</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Center: Undo/Redo & Essential Preview / Radicals */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Undo / Redo Group */}
        <div
          className={`flex items-center h-7 rounded-md border p-0.5 gap-0.5 ${themeClasses.subtoolbarBg}`}
        >
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`w-6 h-6 rounded transition-colors inline-flex items-center justify-center ${
              canUndo
                ? `${themeClasses.activeToolHover} cursor-pointer`
                : 'opacity-30 cursor-not-allowed'
            }`}
            title="元に戻す (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5 shrink-0" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`w-6 h-6 rounded transition-colors inline-flex items-center justify-center ${
              canRedo
                ? `${themeClasses.activeToolHover} cursor-pointer`
                : 'opacity-30 cursor-not-allowed'
            }`}
            title="やり直す (Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5 shrink-0" />
          </button>
        </div>

        {/* Test Waterfall Modal */}
        <button
          onClick={onOpenTestModal}
          className={`h-7 px-2 rounded-md text-xs font-bold inline-flex items-center gap-1 transition-colors border shrink-0 cursor-pointer ${themeClasses.cardBg} ${themeClasses.activeToolHover}`}
          title="フォント試し打ち・文章リアルタイムプレビュー"
        >
          <Play className={`w-3.5 h-3.5 fill-current shrink-0 ${themeClasses.accentText}`} />
          <span className="hidden sm:inline leading-none">試し打ち</span>
        </button>

        {/* Kanji Radicals palette toggle */}
        <button
          id="btn-header-radicals"
          onClick={onToggleRadicals}
          className={`h-7 hidden lg:inline-flex px-2 rounded-md text-xs font-semibold items-center gap-1 transition-colors border cursor-pointer ${
            showRadicals
              ? `${themeClasses.activeTool} font-bold`
              : `${themeClasses.cardBg} ${themeClasses.activeToolHover}`
          }`}
          title="部首パレット (康熙214部首・高品質パーツ)"
        >
          <Layers className={`w-3.5 h-3.5 shrink-0 ${themeClasses.accentText}`} />
          <span className="leading-none">部首</span>
        </button>
      </div>

      {/* Right: Clean Tools Dropdown & Theme & Settings & TTF Export */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {/* JIS / 常用漢字 進捗メーター */}
        <ProgressSummaryPill
          project={project}
          theme={theme}
          onOpenDashboard={() => openModal('jisProgress')}
        />

        {/* Metrics Panel toggle (Desktop & Tablet) */}
        {onToggleMetricsDrawer && (
          <button
            id="btn-header-metrics"
            onClick={onToggleMetricsDrawer}
            className={`px-2 h-7 rounded-md text-xs font-bold hidden md:inline-flex items-center gap-1 transition-colors border cursor-pointer shrink-0 ${
              showMetricsDrawer
                ? themeClasses.activeTool
                : `${themeClasses.cardBg} ${themeClasses.activeToolHover}`
            }`}
            title="メトリクス・文字ツール（送り幅・字面枠・変形など）"
          >
            <SlidersHorizontal className={`w-3.5 h-3.5 shrink-0 ${themeClasses.accentText}`} />
            <span className="font-bold leading-none hidden xl:inline">メトリクス</span>
          </button>
        )}

        {/* Unified Tools Dropdown */}
        <ToolsMenuDropdown
          isOpen={showToolsMenu}
          onToggleOpen={() => setShowToolsMenu(!showToolsMenu)}
          onClose={() => setShowToolsMenu(false)}
          menuRef={toolsMenuRef}
          isLight={isLight}
          theme={theme}
          onOpenExportModal={onOpenExportModal}
          showMetricsDrawer={showMetricsDrawer}
          onToggleMetricsDrawer={onToggleMetricsDrawer}
          onOpenPixelStudio={onOpenPixelStudio}
          onOpenRadicalStudio={onOpenRadicalStudio}
          onOpenPenPresetsModal={onOpenPenPresetsModal}
          onOpenTraceModal={onOpenTraceModal}
          onOpenSvgModal={onOpenSvgModal}
          onOpenGlyphSynthesisModal={onOpenGlyphSynthesisModal}
          onOpenBatchNormalizeModal={onOpenBatchNormalizeModal}
          onOpenWeightInterpolationModal={onOpenWeightInterpolationModal}
          onOpenKerningModal={onOpenKerningModal}
          onOpenQualityModal={onOpenQualityModal}
          onOpenGlyphCompareModal={onOpenGlyphCompareModal}
          onOpenOpenTypeFeaturesModal={onOpenOpenTypeFeaturesModal}
          onOpenMojikumiStudio={onOpenMojikumiStudio}
          onOpenGridFittingModal={onOpenGridFittingModal}
          onTriggerImportTtf={() => fileInputRef.current?.click()}
          onTriggerLoadProjectJson={() => projectInputRef.current?.click()}
          onSaveProjectJson={handleSaveProjectJson}
          onOpenFontInfoModal={onOpenFontInfoModal}
          onOpenStorageManagerModal={onOpenStorageManagerModal}
          onOpenShortcutsModal={onOpenShortcutsModal}
          onOpenThemeMenu={() => setShowThemeMenu(true)}
          onStartNewProject={() => setIsConfirmingNew(true)}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
        />

        {/* In-App PWA Install Button (Desktop & Tablet) */}
        <div className="hidden sm:flex items-center">
          <PWAInstallButton isLight={isLight} />
        </div>

        {/* Theme Preset Selector Dropdown Trigger */}
        <ThemeMenuDropdown
          theme={theme}
          isLight={isLight}
          cardBgClass={themeClasses.cardBg}
          isOpen={showThemeMenu}
          onToggleOpen={() => setShowThemeMenu((prev) => !prev)}
          onClose={() => setShowThemeMenu(false)}
          onChangeTheme={onChangeTheme}
          onToggleTheme={onToggleTheme}
          notify={notify}
          menuRef={themeMenuRef}
        />

        {/* Export Font Modal Prominent Trigger */}
        <button
          onClick={handleExportTtf}
          className={`px-2.5 h-7 rounded-md text-xs font-bold flex items-center gap-1 transition-colors shrink-0 cursor-pointer ${themeClasses.accentBtn}`}
          title="OSやiPad・アプリで使えるフォントを出力 (TTF/OTF/WOFF)"
        >
          <Download className="w-3.5 h-3.5 shrink-0" />
          <span className="leading-none whitespace-nowrap">
            <span className="hidden sm:inline">フォント</span>出力
          </span>
        </button>
      </div>

      {/* In-app New Project / Reset Confirmation Modal */}
      <NewProjectModal
        isOpen={isConfirmingNew}
        onClose={() => setIsConfirmingNew(false)}
        isLight={isLight}
        project={project}
        glyphCount={glyphCount}
        newProjectName={newProjectName}
        setNewProjectName={setNewProjectName}
        onSaveAndReset={() => {
          handleSaveProjectJson();
          handleNewProjectWithCustomName(newProjectName);
        }}
        onResetWithoutSave={() => handleNewProjectWithCustomName(newProjectName)}
      />
    </header>
  );
});
