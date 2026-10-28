import React, { useEffect, useRef, useState } from 'react';
import {
  Download,
  Play,
  Settings,
  Undo2,
  Redo2,
  Grid,
  Layers,
  SlidersHorizontal,
  Maximize,
  Minimize,
  BookOpen,
  Lock,
  Unlock,
  HardDrive,
  Type,
} from 'lucide-react';
import { isLightTheme, getThemeClasses } from '../utils/theme';
import { PWAInstallButton } from './PWAInstallButton';
import { useFullscreen } from '../hooks/useFullscreen';
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
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(target)) {
        setShowToolsMenu(false);
      }
      if (themeMenuRef.current && !themeMenuRef.current.contains(target)) {
        setShowThemeMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const glyphCount = Object.keys(project.glyphs).length;
  const isLight = isLightTheme(theme);
  const themeClasses = getThemeClasses(theme);

  return (
    <header
      className={`min-h-[44px] h-[calc(2.75rem+env(safe-area-inset-top,0px))] sm:h-[calc(3rem+env(safe-area-inset-top,0px))] pt-[env(safe-area-inset-top,0px)] border-b flex items-center justify-between px-2 sm:px-3 shrink-0 z-40 select-none relative transition-colors overflow-x-auto no-scrollbar gap-1.5 sm:gap-2 ${themeClasses.headerBg}`}
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
          className={`h-8 px-2 sm:px-2.5 rounded-lg sm:rounded-xl transition-colors inline-flex items-center gap-1 text-xs font-bold shrink-0 border cursor-pointer ${
            showGridDrawer
              ? isLight
                ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                : 'bg-emerald-950 text-emerald-300 border-emerald-700/60'
              : isLight
              ? 'text-stone-600 hover:bg-stone-100 border-stone-200/80'
              : 'text-stone-300 hover:bg-[#1d2720] border-[#222e25]'
          }`}
          title="文字一覧（コード表）の表示/非表示"
        >
          <Grid className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline leading-none">文字一覧</span>
        </button>

        <div className={`h-4 w-[1px] hidden sm:block ${isLight ? 'bg-stone-200' : 'bg-[#222e25]'}`} />

        {/* Brand & Project Info (Compact on tablet/mobile) */}
        <div className="flex items-center gap-1.5 shrink min-w-0">
          <div className="flex flex-col min-w-0 justify-center">
            <span className="text-xs font-bold tracking-tight flex items-center gap-1.5 min-w-0 leading-tight whitespace-nowrap">
              <span
                className="truncate max-w-[85px] xs:max-w-[120px] sm:max-w-[150px] md:max-w-[180px] lg:max-w-[220px] whitespace-nowrap"
                title={project.metadata.familyName || 'FontCreator'}
              >
                {project.metadata.familyName && project.metadata.familyName !== 'OTEdit-Style Font' && project.metadata.familyName !== '新規フォント'
                  ? project.metadata.familyName
                  : 'FontCreator'}
              </span>
              {project.metadata.styleName && project.metadata.styleName !== 'Regular' && (
                <span
                  className={`text-[8.5px] px-1 py-0.2 rounded font-mono hidden md:inline-block leading-none shrink-0 ${
                    isLight ? 'bg-stone-100 text-stone-700 border border-stone-200' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  }`}
                  title={`スタイル: ${project.metadata.styleName}`}
                >
                  {project.metadata.styleName}
                </span>
              )}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`text-[9.5px] font-mono tabular-nums hidden lg:inline truncate leading-tight ${
                  isLight ? 'text-stone-500' : 'text-emerald-400'
                }`}
                title={`編集中: ${selectedChar || 'なし'} (U+${selectedUnicode.toString(16).toUpperCase().padStart(4, '0')}) · 全${glyphCount}字`}
              >
                編集中: <strong className={isLight ? 'text-emerald-700 font-sans' : 'text-amber-300 font-sans'}>{selectedChar || 'なし'}</strong>{' '}
                (U+{selectedUnicode.toString(16).toUpperCase().padStart(4, '0')}) · {glyphCount}字
              </span>
              {onToggleLockGlyph && (
                <button
                  id="btn-header-lock-glyph"
                  onClick={onToggleLockGlyph}
                  className={`h-6 px-1.5 rounded-md sm:rounded-lg transition-all inline-flex items-center gap-1 border text-[10px] font-bold shrink-0 whitespace-nowrap cursor-pointer ${
                    isGlyphLocked
                      ? isLight
                        ? 'bg-amber-100 text-amber-900 border-amber-300 ring-1 ring-amber-400/30'
                        : 'bg-amber-950/80 text-amber-300 border-amber-700 ring-1 ring-amber-500/30'
                      : isLight
                      ? 'bg-stone-50 hover:bg-stone-100 text-stone-500 hover:text-stone-800 border-stone-200'
                      : 'bg-[#18241d] hover:bg-[#202f26] text-stone-400 hover:text-emerald-300 border-[#25362b]'
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
                      <Unlock className="w-2.5 h-2.5 text-stone-400 shrink-0" />
                      <span className="hidden sm:inline leading-none whitespace-nowrap">ロック</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Center: Undo/Redo & Essential Preview / Guide */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Undo / Redo Group */}
        <div
          className={`flex items-center h-8 rounded-lg border p-0.5 gap-0.5 ${
            isLight ? 'bg-stone-100/80 border-stone-200' : 'bg-[#18241d] border-[#223025]'
          }`}
        >
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`w-7 h-7 rounded-md transition-colors inline-flex items-center justify-center cursor-pointer ${
              canUndo
                ? isLight
                  ? 'text-stone-700 hover:bg-white active:scale-95'
                  : 'text-emerald-200 hover:bg-[#202f26] active:scale-95'
                : isLight
                ? 'text-stone-300 cursor-not-allowed'
                : 'text-stone-600 cursor-not-allowed'
            }`}
            title="元に戻す (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5 shrink-0" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`w-7 h-7 rounded-md transition-colors inline-flex items-center justify-center cursor-pointer ${
              canRedo
                ? isLight
                  ? 'text-stone-700 hover:bg-white active:scale-95'
                  : 'text-emerald-200 hover:bg-[#202f26] active:scale-95'
                : isLight
                ? 'text-stone-300 cursor-not-allowed'
                : 'text-stone-600 cursor-not-allowed'
            }`}
            title="やり直す (Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5 shrink-0" />
          </button>
        </div>

        <div className={`h-4 w-[1px] hidden sm:block ${isLight ? 'bg-stone-200' : 'bg-[#222e25]'}`} />

        {/* Test Waterfall Modal */}
        <button
          onClick={onOpenTestModal}
          className={`h-8 px-2 sm:px-2.5 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-all active:scale-95 border shrink-0 cursor-pointer ${
            isLight
              ? 'bg-stone-100/90 text-stone-800 hover:bg-stone-200/90 border-stone-200'
              : 'bg-[#18241d] text-emerald-200 hover:bg-[#202f26] border-[#25362b]'
          }`}
          title="フォント試し打ち・文章リアルタイムプレビュー"
        >
          <Play className="w-3.5 h-3.5 fill-current text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="hidden sm:inline leading-none">試し打ち</span>
        </button>

        {/* Mojikumi Studio Button */}
        {onOpenMojikumiStudio && (
          <button
            onClick={onOpenMojikumiStudio}
            className={`h-8 px-2 sm:px-2.5 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-all active:scale-95 border shrink-0 cursor-pointer ${
              isLight
                ? 'bg-emerald-50/90 text-emerald-950 hover:bg-emerald-100 border-emerald-300'
                : 'bg-[#1b2b20] text-emerald-300 hover:bg-[#23382a] border-[#2b4032]'
            }`}
            title="日本語組版・文字組みスタジオ（ベタ組み・ツメ組み・アケ組み比較・アキ量設定）"
          >
            <Type className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="hidden sm:inline leading-none">文字組み</span>
          </button>
        )}

        {/* Manual & Tutorial & Shortcuts Guide Button */}
        {onOpenShortcutsModal && (
          <button
            onClick={onOpenShortcutsModal}
            className={`h-8 px-2 rounded-lg text-xs font-bold hidden lg:inline-flex items-center gap-1 transition-all border active:scale-95 cursor-pointer ${
              isLight
                ? 'bg-emerald-50/80 hover:bg-emerald-100/80 text-emerald-900 border-emerald-200 hover:border-emerald-300'
                : 'bg-[#1a2d21] hover:bg-[#223b2c] text-emerald-200 border-emerald-800/60 hover:border-emerald-700'
            }`}
            title="説明書・チュートリアル・ショートカット集 [?]"
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="leading-none">説明書・ガイド</span>
            <kbd className="hidden xl:inline-block px-1 py-0.2 rounded text-[10px] font-mono font-bold bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 leading-none">
              ?
            </kbd>
          </button>
        )}

        {/* Kanji Radicals palette toggle */}
        <button
          id="btn-header-radicals"
          onClick={onToggleRadicals}
          className={`h-8 hidden xl:inline-flex px-2 rounded-lg text-xs font-semibold items-center gap-1 transition-all active:scale-95 border cursor-pointer ${
            showRadicals
              ? isLight
                ? 'bg-emerald-100 text-emerald-950 font-bold border-emerald-300'
                : 'bg-emerald-700 text-white font-bold border-emerald-600'
              : isLight
              ? 'text-stone-600 hover:bg-stone-100 border-stone-200/80'
              : 'text-stone-300 hover:bg-[#1d2720] border-[#222e25]'
          }`}
          title="部首パレット (康熙214部首・高品質パーツ)"
        >
          <Layers className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="leading-none">部首</span>
        </button>
      </div>

      {/* Right: Clean Tools Dropdown & Theme & Settings & TTF Export */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {/* Metrics Panel toggle (Desktop & Tablet) */}
        {onToggleMetricsDrawer && (
          <button
            id="btn-header-metrics"
            onClick={onToggleMetricsDrawer}
            className={`px-2 py-1 h-8 rounded-lg text-xs font-bold hidden md:inline-flex items-center gap-1 transition-all border active:scale-95 cursor-pointer shrink-0 ${
              showMetricsDrawer
                ? isLight
                  ? 'bg-emerald-100 text-emerald-950 border-emerald-300 ring-2 ring-emerald-500/20'
                  : 'bg-emerald-950 text-emerald-200 border-emerald-700/60 ring-2 ring-emerald-400/20'
                : isLight
                ? 'bg-white hover:bg-emerald-50/70 text-stone-700 hover:text-emerald-900 border-stone-200 hover:border-emerald-300'
                : 'bg-[#151f19] hover:bg-[#1d2b22] text-emerald-200 border-[#25362b] hover:border-emerald-700/60'
            }`}
            title="メトリクス・文字ツール（送り幅・字面枠・変形など）"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
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

        {/* Fullscreen Mode Toggle */}
        <button
          onClick={toggleFullscreen}
          className={`hidden md:flex p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all border shrink-0 active:scale-95 items-center justify-center cursor-pointer ${
            isFullscreen
              ? isLight
                ? 'bg-emerald-100 text-emerald-950 border-emerald-300 '
                : 'bg-emerald-950 text-emerald-200 border-emerald-700/60 '
              : isLight
              ? 'bg-white hover:bg-stone-100 text-stone-700 border-stone-200/80'
              : 'bg-[#151f19] hover:bg-[#1d2720] text-emerald-300 border-[#222e25]'
          }`}
          title={isFullscreen ? '全画面モードを解除 (Esc)' : '全画面モード（画面いっぱいに広げて集中制作）'}
        >
          {isFullscreen ? (
            <Minimize className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-700 dark:text-emerald-300" />
          ) : (
            <Maximize className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          )}
        </button>

        {/* Storage & Backup Manager */}
        {onOpenStorageManagerModal && (
          <button
            onClick={onOpenStorageManagerModal}
            className={`hidden xl:inline-flex p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-colors shrink-0 cursor-pointer ${
              isLight ? 'text-stone-600 hover:bg-stone-100' : 'text-emerald-300 hover:bg-[#1d2720]'
            }`}
            title="保存管理・バックアップ（localStorage容量・スナップショット）"
          >
            <HardDrive className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        )}

        {/* Font Info / Settings */}
        <button
          onClick={onOpenFontInfoModal}
          className={`hidden lg:inline-flex p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-colors shrink-0 cursor-pointer ${
            isLight ? 'text-stone-600 hover:bg-stone-100' : 'text-emerald-300 hover:bg-[#1d2720]'
          }`}
          title="フォント詳細情報・メトリクス設定"
        >
          <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* Export Font Modal Prominent Trigger */}
        <button
          onClick={handleExportTtf}
          className={`px-2.5 sm:px-3 py-1 sm:py-1.5 h-8 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shrink-0 shadow-xs cursor-pointer ${themeClasses.accentBtn}`}
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
