import React from 'react';
import {
  ArrowUpDown,
  BookOpen,
  Columns,
  Download,
  Eye,
  Feather,
  Grid,
  Play,
  Save,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { getThemeClasses, isLightTheme } from '../utils/theme';
import { AkiryoCompareView } from './mojikumi/AkiryoCompareView';
import { BookSpreadView } from './mojikumi/BookSpreadView';
import { MagazineLayoutView } from './mojikumi/MagazineLayoutView';
import { ManuscriptView } from './mojikumi/ManuscriptView';
import { MojikumiSidebar } from './mojikumi/MojikumiSidebar';
import { PoetryTanzakuView } from './mojikumi/PoetryTanzakuView';
import { EditorialLayoutMode, MojikumiStudioModalProps } from './mojikumi/types';
import { ModalAlert } from './modals/ModalAlert';
import { ModalTabs } from './modals/ModalTabs';
import { useMojikumiStudioState, type MojikumiPersistedState } from './mojikumi/useMojikumiStudioState';

export type { EditorialLayoutMode, MojikumiStudioModalProps } from './mojikumi/types';

const LAYOUT_MODES: { id: EditorialLayoutMode; label: string; short: string; icon: typeof BookOpen }[] = [
  { id: 'book_spread', label: '文庫見開き', short: '文庫', icon: BookOpen },
  { id: 'manuscript', label: '400字原稿用紙', short: '原稿', icon: Grid },
  { id: 'magazine', label: '雑誌・段組', short: '雑誌', icon: Columns },
  { id: 'poetry', label: '短冊・詩歌', short: '短冊', icon: Feather },
  { id: 'compare3', label: '3様式アキ量比較', short: '比較', icon: Eye },
];

export interface MojikumiStudioModalWithPersistedProps extends MojikumiStudioModalProps {
  // Lifted editing state held by AppModalsHost so it survives switching to
  // the Test Preview modal and back. Omitted for standalone use.
  persistedState?: MojikumiPersistedState;
  onPersistedStateChange?: React.Dispatch<React.SetStateAction<MojikumiPersistedState>>;
}

export const MojikumiStudioModal: React.FC<MojikumiStudioModalWithPersistedProps> = ({
  isOpen,
  onClose,
  project,
  setProject,
  theme,
  onShowToast,
  onOpenTestPreview,
  persistedState,
  onPersistedStateChange,
  commitProjectHistory,
}) => {
  const isLight = isLightTheme(theme);
  const themeClasses = getThemeClasses(theme);

  const state = useMojikumiStudioState({
    isOpen,
    onClose,
    project,
    setProject,
    onShowToast,
    persistedState,
    onPersistedStateChange,
    commitProjectHistory,
  });

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-[60] flex flex-col sm:items-center sm:justify-center p-0 sm:p-4 bg-black/75 anim-fade select-none"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="日本語組版・文字組みスタジオ"
        className={`w-full h-[100dvh] sm:h-[min(92dvh,920px)] sm:max-w-[1540px] sm:max-h-[92vh] border-0 sm:border rounded-none sm:rounded-2xl shadow-none sm:shadow-2xl flex flex-col overflow-hidden ${themeClasses.modalBg} ${themeClasses.border} ${themeClasses.textPrimary}`}
      >
        {/* HEADER BAR 1: Brand & Top Quick Action Bar */}
        <header
          className={`px-3.5 py-2.5 pt-[calc(0.625rem+env(safe-area-inset-top,0px))] sm:px-5 sm:py-2.5 border-b flex items-center justify-between gap-2 shrink-0 ${themeClasses.headerBg}`}
        >
          <div className="flex items-center space-x-3 min-w-0">

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold tracking-tight truncate">
                  日本語組版・文字組みスタジオ
                </h2>
                <span className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-medium border ${themeClasses.accentBadge}`}>
                  青空文庫収録 · 著作権満了
                </span>
              </div>
              <p className={`text-[11px] ${themeClasses.textMuted} truncate hidden sm:block`}>
                JIS X 4051準拠の約物アキ量・組版プレビュー
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
            {onOpenTestPreview && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenTestPreview();
                }}
                className={`hidden md:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors duration-150 cursor-pointer whitespace-nowrap ${
                  isLight
                    ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-950'
                    : 'bg-emerald-950/70 hover:bg-emerald-900 border-emerald-700 text-emerald-200'
                }`}
                title="フォント試し打ち・字形調整モーダルへ移動"
              >
                <Play className="w-3.5 h-3.5 fill-current text-emerald-600 dark:text-emerald-400" />
                <span>字形試し打ちへ</span>
              </button>
            )}

            <button
              type="button"
              onClick={state.handleSaveToProject}
              title="文字組み設定（プリセット・禁則・ぶら下がり・段落字下げ）を保存。Q数・H数・字詰め・行数・カスタムテキスト・レイアウト種別・縦横は保存されません"
              className={`flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-colors duration-150 cursor-pointer whitespace-nowrap ${themeClasses.accentBtn}`}
            >
              <Save className="w-3.5 h-3.5" />
              <span>設定を保存</span>
            </button>

            <button
              type="button"
              onClick={state.handleExportJson}
              className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border text-xs transition-colors duration-150 flex items-center space-x-1 cursor-pointer whitespace-nowrap ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.activeToolHover}`}
              title="文字組み設定JSONエクスポート"
            >
              <Download className="w-4 h-4" />
              <span className="hidden xl:inline">JSON</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="文字組みスタジオを閉じる"
              className={`min-w-[40px] min-h-[40px] p-1.5 rounded-lg border flex items-center justify-center transition-colors duration-150 cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textMuted} ${themeClasses.activeToolHover}`}
              title="閉じる (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Compile failure banner: the preview falls back to system fonts */}
        {state.compileError && (
          <div className="mx-4 sm:mx-6 mt-2.5 shrink-0">
            <ModalAlert tone="error" title="プレビュー用フォントの生成に失敗しました" theme={theme}>
              {state.compileError}
            </ModalAlert>
          </div>
        )}

        {/* Editorial Mode Switcher (ModalTabs, horizontal scroll) */}
        <ModalTabs
          tabs={LAYOUT_MODES.map((m) => ({ id: m.id, label: m.label, shortLabel: m.short }))}
          activeId={state.layoutMode}
          onChange={(id) => state.setLayoutMode(id as EditorialLayoutMode)}
          theme={theme}
          themeClasses={themeClasses}
          ariaLabel="組版レイアウト種別"
        />

        {/* HEADER BAR 2: Editorial Mode Switcher & Format Controls */}
        <div
          className={`px-3 sm:px-5 py-1.5 border-b flex flex-wrap items-center justify-between gap-2 shrink-0 ${themeClasses.subtoolbarBg} ${themeClasses.border}`}
        >

          <div className="flex items-center flex-wrap gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => state.setIsVertical(!state.isVertical)}
              className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-colors duration-150 flex items-center space-x-1 cursor-pointer whitespace-nowrap ${
                state.isVertical
                  ? themeClasses.accentBadge
                  : `${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.activeToolHover}`
              }`}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>{state.isVertical ? '縦組み' : '横組み'}</span>
            </button>

            <div
              className={`flex items-center p-0.5 rounded-lg border text-xs ${themeClasses.cardBg} ${themeClasses.border}`}
            >
              <button
                type="button"
                onClick={() => state.setFontSource('custom')}
                className={`px-2 py-0.5 rounded-md transition-colors duration-150 font-bold cursor-pointer whitespace-nowrap ${
                  state.fontSource === 'custom'
                    ? themeClasses.activeTool
                    : `${themeClasses.textMuted} ${themeClasses.activeToolHover}`
                }`}
                title={
                  state.drawnGlyphsCount === 0
                    ? '現在制作中のフォント（未描画の文字は明朝体で自動補完）'
                    : `現在制作中のフォント（描画済み: ${state.drawnGlyphsCount} 字）`
                }
              >
                制作中
              </button>
              <button
                type="button"
                onClick={() => state.setFontSource('mincho')}
                className={`px-2 py-0.5 rounded-md transition-colors duration-150 cursor-pointer whitespace-nowrap ${
                  state.fontSource === 'mincho'
                    ? themeClasses.activeTool
                    : `${themeClasses.textMuted} ${themeClasses.activeToolHover}`
                }`}
              >
                明朝
              </button>
              <button
                type="button"
                onClick={() => state.setFontSource('gothic')}
                className={`px-2 py-0.5 rounded-md transition-colors duration-150 cursor-pointer whitespace-nowrap ${
                  state.fontSource === 'gothic'
                    ? themeClasses.activeTool
                    : `${themeClasses.textMuted} ${themeClasses.activeToolHover}`
                }`}
              >
                ゴシック
              </button>
            </div>

            <button
              type="button"
              onClick={() => state.setShowBodyGrid(!state.showBodyGrid)}
              className={`flex items-center space-x-1 px-2 py-1 rounded-lg border text-xs transition-colors duration-150 cursor-pointer whitespace-nowrap ${
                state.showBodyGrid
                  ? `${themeClasses.accentBadge} font-bold`
                  : `${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.activeToolHover}`
              }`}
              title="文字の仮想ボディマス目を表示"
            >
              <span>マス目</span>
            </button>

            {/* L17: zoom must stay usable at mobile widths too. */}
            <div className="flex items-center space-x-1 text-xs">
              <button
                type="button"
                onClick={() => state.setZoom((z) => Math.max(0.7, Number((z - 0.1).toFixed(1))))}
                className={`p-1 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg border transition-colors duration-150 cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.activeToolHover}`}
                title="縮小"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className={`font-mono tabular-nums text-[11px] w-9 text-center ${themeClasses.textMuted}`}>
                {Math.round(state.zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => state.setZoom((z) => Math.min(1.6, Number((z + 0.1).toFixed(1))))}
                className={`p-1 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg border transition-colors duration-150 cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.activeToolHover}`}
                title="拡大"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* MOBILE SEGMENTED NAVIGATION */}
        <div
          className={`flex md:hidden items-center justify-around border-b py-1.5 px-2 text-xs font-bold shrink-0 ${themeClasses.subtoolbarBg} ${themeClasses.border}`}
        >
          <button
            type="button"
            onClick={() => state.setMobileTab('preview')}
            className={`px-3 py-1.5 min-h-[44px] rounded-lg transition-colors cursor-pointer ${
              state.mobileTab === 'preview'
                ? themeClasses.activeTool
                : `${themeClasses.textMuted} ${themeClasses.activeToolHover}`
            }`}
          >
            プレビュー
          </button>
          <button
            type="button"
            onClick={() => {
              state.setMobileTab('texts');
              state.setSidebarTab('text');
            }}
            className={`px-3 py-1.5 min-h-[44px] rounded-lg transition-colors cursor-pointer ${
              state.mobileTab === 'texts'
                ? themeClasses.activeTool
                : `${themeClasses.textMuted} ${themeClasses.activeToolHover}`
            }`}
          >
            青空文庫選択
          </button>
          <button
            type="button"
            onClick={() => {
              state.setMobileTab('settings');
              state.setSidebarTab('dimensions');
            }}
            className={`px-3 py-1.5 min-h-[44px] rounded-lg transition-colors cursor-pointer ${
              state.mobileTab === 'settings'
                ? themeClasses.activeTool
                : `${themeClasses.textMuted} ${themeClasses.activeToolHover}`
            }`}
          >
            設定 (Q・アキ・禁則)
          </button>
        </div>

        {/* MAIN WORKSPACE BODY */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden relative">
          <MojikumiSidebar
            isLight={isLight}
            themeClasses={themeClasses}
            mobileTab={state.mobileTab}
            onChangeMobileTab={state.setMobileTab}
            sidebarTab={state.sidebarTab}
            onChangeSidebarTab={state.setSidebarTab}
            selectedWorkId={state.selectedWorkId}
            onSelectWork={state.handleSelectWork}
            customText={state.customText}
            onChangeCustomText={state.handleChangeCustomText}
            isCustomText={state.isCustomText}
            fontSizeQ={state.fontSizeQ}
            onChangeFontSizeQ={state.setFontSizeQ}
            lineFeedH={state.lineFeedH}
            onChangeLineFeedH={state.setLineFeedH}
            charsPerLine={state.charsPerLine}
            onChangeCharsPerLine={state.setCharsPerLine}
            lineCount={state.lineCount}
            onChangeLineCount={state.setLineCount}
            dimensions={state.dimensions}
            currentConfig={state.currentConfig}
            onSelectPreset={state.handleSelectPreset}
            onChangeKinsoku={(kinsoku) =>
              state.setCurrentConfig((prev) => ({ ...prev, kinsoku }))
            }
            onChangeBurasagari={(burasagari) =>
              state.setCurrentConfig((prev) => ({ ...prev, burasagari }))
            }
            onChangeParagraphIndent={(paragraphIndent) =>
              state.setCurrentConfig((prev) => ({ ...prev, paragraphIndent }))
            }
            onChangeKinsokuAdjust={(kinsokuAdjust) =>
              state.setCurrentConfig((prev) => ({ ...prev, kinsokuAdjust }))
            }
            isManuscriptMode={state.layoutMode === 'manuscript'}
          />

          <main
            className={`${
              state.mobileTab !== 'preview' ? 'hidden md:flex' : 'flex'
            } flex-1 min-h-0 flex-col overflow-y-auto overflow-x-auto overscroll-contain touch-pan-both relative ${
              isLight ? 'bg-stone-200/50' : 'bg-black/30'
            }`}
            style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x pan-y' }}
            title="組版プレビュー（幅が足りない場合は横にスクロールできます）"
          >
            <div
              className={`px-4 sm:px-6 py-2 border-b flex flex-wrap items-center justify-between gap-2 text-xs font-mono tabular-nums shrink-0 ${
                isLight ? 'bg-white/80 border-stone-200 text-stone-500' : 'bg-black/20 border-white/10 text-stone-300'
              }`}
            >
              <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 min-w-0">
                <span>
                  作品: <strong>『{state.displayWork.title}』</strong>
                </span>
                <span>·</span>
                <span>
                  著者: <strong>{state.displayWork.author}</strong>
                </span>
                {/* L12: the collected texts are excerpts of the opening
                    part, not the full work. Not shown for custom text. */}
                {!state.isCustomText && (
                  <>
                    <span>·</span>
                    <span>冒頭部分の抜粋</span>
                  </>
                )}
              </div>
              <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 text-[11px]">
                {state.fontSource === 'custom' && (
                  <span className="text-emerald-700 dark:text-emerald-400">
                    制作中 {state.drawnGlyphsCount}字{state.drawnGlyphsCount === 0 ? ' (明朝補完)' : ''}
                  </span>
                )}
                <span>行数: {state.currentLayout.lineCount}行</span>
                <span>·</span>
                <span>平均密度: {state.currentLayout.averageDensityPercent}%</span>
              </div>
            </div>

            <div className="flex-1 w-full p-2 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:p-4 md:p-6 flex flex-col items-center justify-start">
              {state.layoutMode === 'book_spread' && (
                <BookSpreadView
                  layout={state.currentLayout}
                  title={state.displayWork.title}
                  author={state.displayWork.author}
                  isLight={isLight}
                  fontFamily={state.effectiveFontFamily}
                  fontSizeQ={state.fontSizeQ}
                  lineFeedH={state.lineFeedH}
                  charsPerLine={state.charsPerLine}
                  lineCount={state.lineCount}
                  showGrid={state.showBodyGrid}
                  isVertical={state.isVertical}
                  zoom={state.zoom}
                  pageResetKey={`${state.selectedWorkId}:${state.layoutMode}`}
                />
              )}

              {state.layoutMode === 'manuscript' && (
                <ManuscriptView
                  layout={state.currentLayout}
                  title={state.displayWork.title}
                  author={state.displayWork.author}
                  isLight={isLight}
                  fontFamily={state.effectiveFontFamily}
                  fontSizeQ={state.fontSizeQ}
                  zoom={state.zoom}
                  isVertical={state.isVertical}
                  lineFeedH={state.lineFeedH}
                  showGrid={state.showBodyGrid}
                  pageResetKey={`${state.selectedWorkId}:${state.layoutMode}`}
                />
              )}

              {state.layoutMode === 'magazine' && (
                <MagazineLayoutView
                  layout={state.currentLayout}
                  title={state.displayWork.title}
                  author={state.displayWork.author}
                  headline={state.displayWork.headline}
                  lead={state.displayWork.lead}
                  isLight={isLight}
                  fontFamily={state.effectiveFontFamily}
                  fontSizeQ={state.fontSizeQ}
                  lineFeedH={state.lineFeedH}
                  lineCount={state.lineCount}
                  isVertical={state.isVertical}
                  showGrid={state.showBodyGrid}
                  zoom={state.zoom}
                  pageResetKey={`${state.selectedWorkId}:${state.layoutMode}`}
                />
              )}

              {state.layoutMode === 'poetry' && (
                <PoetryTanzakuView
                  layout={state.currentLayout}
                  title={state.displayWork.title}
                  author={state.displayWork.author}
                  isLight={isLight}
                  fontFamily={state.effectiveFontFamily}
                  fontSizeQ={state.fontSizeQ}
                  lineFeedH={state.lineFeedH}
                  lineCount={state.lineCount}
                  zoom={state.zoom}
                  isVertical={state.isVertical}
                  showGrid={state.showBodyGrid}
                  pageResetKey={`${state.selectedWorkId}:${state.layoutMode}`}
                />
              )}

              {state.layoutMode === 'compare3' && (
                <AkiryoCompareView
                  betaLayout={state.betaLayout}
                  tsumeLayout={state.tsumeLayout}
                  akeLayout={state.akeLayout}
                  charsPerLine={state.charsPerLine}
                  fontSizeQ={state.fontSizeQ}
                  lineFeedH={state.lineFeedH}
                  lineCount={state.lineCount}
                  showGrid={state.showBodyGrid}
                  isVertical={state.isVertical}
                  isLight={isLight}
                  fontFamily={state.effectiveFontFamily}
                  zoom={state.zoom}
                  pageResetKey={`${state.selectedWorkId}:${state.layoutMode}`}
                />
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};