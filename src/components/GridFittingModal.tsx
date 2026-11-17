import React from 'react';
import { X, Grid, Zap, Sparkles, Check, Info, Monitor } from 'lucide-react';
import { getThemeClasses } from '../utils/theme';
import {
  GridFittingModalProps,
  useGridFittingState,
  GridFittingSidebar,
  GridFittingPreviewStage,
  GridFittingSettingsPanel,
} from './gridFitting';

export type { StemInfo, GridFittingConfig } from './gridFitting';
export {
  contourToSvgPath,
  contoursToSvgPath,
  detectGlyphStems,
  applyGridFittingToGlyph,
} from './gridFitting';

export const GridFittingModal: React.FC<GridFittingModalProps> = ({
  project,
  setProject,
  isOpen,
  onClose,
  isLight,
  theme,
  onShowToast,
}) => {
  const themeClasses = getThemeClasses(theme ?? (isLight ? 'light' : 'dark'));

  const {
    targetSizes,
    selectedPpem,
    setSelectedPpem,
    renderingMode,
    setRenderingMode,
    showStemOverlay,
    setShowStemOverlay,
    hoveredStemId,
    setHoveredStemId,
    mobilePreviewDisplay,
    setMobilePreviewDisplay,
    config,
    setConfig,
    enablePreview,
    setEnablePreview,
    selectedUnicode,
    setSelectedUnicode,
    searchQuery,
    setSearchQuery,
    activeTab,
    setActiveTab,
    canvasRef,
    upm,
    currentGlyph,
    fittedGlyph,
    detectedStems,
    glyphList,
    handleApplyToCurrentGlyph,
    handleBatchApplyHinting,
    applyPreset,
  } = useGridFittingState({
    project,
    setProject,
    isOpen,
    onClose,
    isLight,
    onShowToast,
  });

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="グリッド整列 & ヒンティング工房"
      className="fixed inset-0 z-[60] anim-fade flex flex-col sm:items-center sm:justify-center p-0 sm:p-4 bg-black/75 select-none"
    >
      <div
        className={`w-full h-[100dvh] sm:h-auto sm:max-w-6xl sm:max-h-[94vh] border-0 sm:border rounded-none sm:rounded-2xl shadow-none sm:shadow-2xl flex flex-col overflow-hidden ${themeClasses.modalBg} ${themeClasses.border}`}
      >
        {/* Header Bar */}
        <div
          className={`flex items-center justify-between px-3.5 py-2.5 pt-[calc(0.625rem+env(safe-area-inset-top,0px))] sm:px-6 sm:py-3.5 sm:pt-3.5 border-b shrink-0 ${themeClasses.headerBg}`}
        >
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
            <div
              className="hidden sm:flex w-9 h-9 sm:w-10 sm:h-10 rounded-xl items-center justify-center border bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400 shrink-0"
            >
              <Grid className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <h2 className="text-sm sm:text-lg font-extrabold tracking-tight truncate">
                  グリッド整列 & ヒンティング
                </h2>
              </div>
              <p className={`hidden sm:block text-xs mt-0.5 ${themeClasses.textMuted}`}>
                9px〜24pxの小サイズ表示で文字線がボケたりかすれないよう、ステム・境界座標をピクセル格子に整数整列します
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
            <button
              onClick={handleApplyToCurrentGlyph}
              className="hidden sm:flex px-3.5 py-2 rounded-xl text-xs font-bold items-center space-x-1.5 transition-[transform,background-color] active:scale-[0.98] bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
              title="選択中の1文字のみにヒンティングを適用します"
            >
              <Check className="w-4 h-4" />
              <span>「{currentGlyph.char}」に適用</span>
            </button>

            <button
              onClick={handleBatchApplyHinting}
              className={`hidden sm:flex px-3.5 py-2 rounded-xl text-xs font-bold items-center space-x-1.5 transition-[transform,background-color] active:scale-[0.98] cursor-pointer ${themeClasses.accentBtn}`}
              title="すべての文字のステムを選択中のグリッド条件で一括整列します"
            >
              <Sparkles className="w-4 h-4 opacity-90" />
              <span>全文字一括 {selectedPpem}px 適用</span>
            </button>

            <button
              onClick={onClose}
              className={`p-1.5 sm:p-2 rounded-xl transition-colors cursor-pointer ${themeClasses.textMuted} ${themeClasses.activeToolHover}`}
              title="閉じる (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar: PPEM Selector & View Controls */}
        <div
          className={`flex items-center justify-between gap-2 px-3 sm:px-6 py-1.5 sm:py-2.5 border-b shrink-0 text-xs font-bold overflow-x-auto whitespace-nowrap scrollbar-none max-sm:flex-wrap ${themeClasses.subtoolbarBg}`}
        >
          <div className="flex items-center space-x-1.5 shrink-0">
            <span className={`shrink-0 flex items-center space-x-1 text-[11px] sm:text-xs ${themeClasses.textMuted}`}>
              <Monitor className="w-3.5 h-3.5 text-amber-500 hidden sm:inline-block" />
              <span className="hidden sm:inline">検証解像度 (PPEM):</span>
              <span className="sm:hidden text-amber-500 font-bold">PPEM:</span>
            </span>
            <div className="flex items-center space-x-1">
              {targetSizes.map((sz) => (
                <button
                  key={sz}
                  onClick={() => setSelectedPpem(sz)}
                  className={`px-2 max-sm:px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-lg border transition-colors font-mono text-[10px] sm:text-[11px] cursor-pointer ${
                    selectedPpem === sz
                      ? 'bg-amber-600 text-white border-amber-600 font-black'
                      : `${themeClasses.cardBg} ${themeClasses.activeToolHover}`
                  }`}
                >
                  {sz}px
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0">
            <div className="flex items-center space-x-0.5 bg-black/5 dark:bg-white/5 p-0.5 sm:p-1 rounded-xl">
              {(
                [
                  { id: 'grayscale', label: 'Anti-Alias' },
                  { id: 'mono', label: '1-Bit' },
                  { id: 'subpixel_lcd', label: 'LCD' },
                ] as const
              ).map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setRenderingMode(mode.id)}
                  className={`px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg text-[9px] sm:text-[10px] font-bold transition-colors cursor-pointer ${
                    renderingMode === mode.id
                      ? themeClasses.activeTool
                      : `${themeClasses.textMuted} ${themeClasses.activeToolHover}`
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setEnablePreview((prev) => !prev)}
              className={`px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-xl border text-[10px] sm:text-[11px] font-bold flex items-center space-x-1 transition-colors shrink-0 cursor-pointer ${
                enablePreview
                  ? `${themeClasses.accentBtn} border-transparent`
                  : `${themeClasses.cardBg} ${themeClasses.activeToolHover}`
              }`}
            >
              <Zap className="w-3 h-3 text-amber-300" />
              <span>{enablePreview ? 'ON (整列後)' : 'OFF (元パス)'}</span>
            </button>
          </div>
        </div>

        {/* Mobile Tab Navigation */}
        <div className={`flex sm:hidden border-b shrink-0 ${themeClasses.subtoolbarBg}`}>
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex-1 py-1.5 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'preview'
                ? 'border-amber-500 text-amber-600'
                : `border-transparent ${themeClasses.textMuted}`
            }`}
          >
            プレビュー
          </button>
          <button
            onClick={() => setActiveTab('stems')}
            className={`flex-1 py-1.5 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'stems'
                ? 'border-amber-500 text-amber-600'
                : `border-transparent ${themeClasses.textMuted}`
            }`}
          >
            ステム解析 ({detectedStems.length})
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 py-1.5 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'settings'
                ? 'border-amber-500 text-amber-600'
                : `border-transparent ${themeClasses.textMuted}`
            }`}
          >
            ヒンティング設定
          </button>
        </div>

        {/* Main Body Grid */}
        <div className={`flex-1 min-h-0 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x ${themeClasses.border}`}>
          <GridFittingSidebar
            themeClasses={themeClasses}
            activeTab={activeTab}
            searchQuery={searchQuery}
            onChangeSearchQuery={setSearchQuery}
            onApplyPreset={applyPreset}
            glyphList={glyphList}
            selectedUnicode={selectedUnicode}
            onSelectUnicode={setSelectedUnicode}
            detectedStems={detectedStems}
            hoveredStemId={hoveredStemId}
            onHoverStem={setHoveredStemId}
          />

          <GridFittingPreviewStage
            themeClasses={themeClasses}
            isLight={isLight}
            activeTab={activeTab}
            selectedUnicode={selectedUnicode}
            selectedPpem={selectedPpem}
            upm={upm}
            currentGlyph={currentGlyph}
            fittedGlyph={fittedGlyph}
            enablePreview={enablePreview}
            renderingMode={renderingMode}
            showStemOverlay={showStemOverlay}
            onToggleStemOverlay={() => setShowStemOverlay((prev) => !prev)}
            detectedStems={detectedStems}
            hoveredStemId={hoveredStemId}
            mobilePreviewDisplay={mobilePreviewDisplay}
            onChangeMobilePreviewDisplay={setMobilePreviewDisplay}
            canvasRef={canvasRef}
          />

          <GridFittingSettingsPanel
            themeClasses={themeClasses}
            activeTab={activeTab}
            config={config}
            setConfig={setConfig}
            currentGlyphChar={currentGlyph.char}
            onApplyCurrent={handleApplyToCurrentGlyph}
            onBatchApply={handleBatchApplyHinting}
          />
        </div>

        {/* Mobile Sticky Action Bar */}
        <div className={`flex sm:hidden items-center justify-between gap-2 px-3 py-2 border-t shrink-0 ${themeClasses.subtoolbarBg}`}>
          <button
            onClick={handleApplyToCurrentGlyph}
            className="flex-1 py-2 rounded-xl bg-amber-600 active:bg-amber-700 text-white font-bold text-xs flex items-center justify-center space-x-1 transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            <span>「{currentGlyph.char}」に適用</span>
          </button>
          <button
            onClick={handleBatchApplyHinting}
            className={`flex-1 py-2 rounded-xl font-bold text-xs flex items-center justify-center space-x-1 transition-colors ${themeClasses.accentBtn}`}
          >
            <Sparkles className="w-3.5 h-3.5 opacity-90" />
            <span>全文字一括適用</span>
          </button>
        </div>

        {/* Modal Footer (Desktop) */}
        <div
          className={`hidden sm:flex items-center justify-between px-4 sm:px-6 py-3 border-t shrink-0 text-xs ${themeClasses.headerBg}`}
        >
          <div className={`flex items-center space-x-2 ${themeClasses.textMuted}`}>
            <Info className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              ヒンティング処理を行うことで、Webブラウザ、ゲームUI、AviUtl、各種Wordで小サイズ表示時の文字掠れが劇的に改善します
            </span>
          </div>

          <button
            onClick={onClose}
            className={`px-5 py-2 rounded-xl border font-bold text-xs transition-colors cursor-pointer ${themeClasses.cardBg} ${themeClasses.activeToolHover}`}
          >
            完了・閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
