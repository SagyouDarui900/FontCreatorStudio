import React from 'react';
import {
  AlertCircle,
  ArrowUpDown,
  BookOpen,
  Columns,
  Download,
  Eye,
  Feather,
  Grid,
  Play,
  Save,
  Type,
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
  });

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="日本語組版・文字組みスタジオ"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-[60] flex flex-col sm:items-center sm:justify-center p-0 sm:p-4 bg-black/75 anim-fade select-none"
    >
      <div
        className={`w-full h-[100dvh] sm:h-auto sm:max-w-[1540px] sm:max-h-[94vh] border-0 sm:border rounded-none sm:rounded-2xl shadow-none sm:shadow-2xl flex flex-col overflow-hidden ${themeClasses.modalBg} ${themeClasses.border} ${themeClasses.textPrimary}`}
      >
        {/* HEADER BAR 1: Brand & Top Quick Action Bar */}
        <header
          className={`px-3.5 py-2.5 pt-[calc(0.625rem+env(safe-area-inset-top,0px))] sm:px-6 sm:py-3 border-b flex items-center justify-between gap-2 shrink-0 ${themeClasses.headerBg}`}
        >
          <div className="flex items-center space-x-3 min-w-0">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 ${
                isLight
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-emerald-950 text-emerald-400 border-emerald-800'
              }`}
            >
              <Type className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold tracking-tight truncate">
                  日本語組版・文字組みスタジオ
                </h2>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-800/60">
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
                className={`hidden md:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors duration-150 ${
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
              className={`flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-colors duration-150 cursor-pointer ${themeClasses.accentBtn}`}
            >
              <Save className="w-3.5 h-3.5" />
              <span>保存</span>
            </button>

            <button
              type="button"
              onClick={state.handleExportJson}
              className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border text-xs transition-colors duration-150 flex items-center space-x-1 cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.activeToolHover}`}
              title="文字組み設定JSONエクスポート"
            >
              <Download className="w-4 h-4" />
              <span className="hidden xl:inline">JSON</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="文字組みスタジオを閉じる"
              className={`min-w-[40px] min-h-[40px] p-2 rounded-lg border flex items-center justify-center transition-colors duration-150 cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textMuted} ${themeClasses.activeToolHover}`}
              title="閉じる (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Compile failure banner: the preview falls back to system fonts */}
        {state.compileError && (
          <div
            className={`mx-4 sm:mx-6 mt-3 p-3 rounded-xl border flex items-start space-x-2 shrink-0 ${
              isLight
                ? 'bg-red-50 border-red-200 text-red-900'
                : 'bg-red-950/40 border-red-800 text-red-200'
            }`}
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
            <div className="min-w-0 text-[11px] leading-relaxed">
              <div className="font-bold">プレビュー用フォントの生成に失敗しました</div>
              <div>{state.compileError}</div>
            </div>
          </div>
        )}

        {/* HEADER BAR 2: Editorial Mode Switcher & Format Controls */}
        <div
          className={`px-3 sm:px-6 py-2 border-b flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 sm:overflow-x-auto custom-scrollbar shrink-0 ${themeClasses.subtoolbarBg} ${themeClasses.border}`}
        >
          <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar max-w-full shrink-0">
            {LAYOUT_MODES.map((m) => {
              const Icon = m.icon;
              const isSel = state.layoutMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => state.setLayoutMode(m.id)}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-colors duration-150 flex items-center space-x-1.5 shrink-0 cursor-pointer ${
                    isSel
                      ? themeClasses.activeTool
                      : `${themeClasses.textMuted} ${themeClasses.activeToolHover}`
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="max-sm:hidden">{m.label}</span>
                  <span className="hidden max-sm:inline">{m.short}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={() => state.setIsVertical(!state.isVertical)}
              className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-colors duration-150 flex items-center space-x-1 cursor-pointer ${
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
                className={`px-2 py-0.5 rounded-md transition-colors duration-150 font-bold cursor-pointer ${
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
                className={`px-2 py-0.5 rounded-md transition-colors duration-150 cursor-pointer ${
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
                className={`px-2 py-0.5 rounded-md transition-colors duration-150 cursor-pointer ${
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
              className={`hidden sm:flex items-center space-x-1 px-2 py-1 rounded-lg border text-xs transition-colors duration-150 cursor-pointer ${
                state.showBodyGrid
                  ? `${themeClasses.accentBadge} font-bold`
                  : `${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.activeToolHover}`
              }`}
              title="文字の仮想ボディマス目を表示"
            >
              <span>マス目</span>
            </button>

            <div className="hidden lg:flex items-center space-x-1 text-xs">
              <button
                type="button"
                onClick={() => state.setZoom((z) => Math.max(0.7, Number((z - 0.1).toFixed(1))))}
                className={`p-1 rounded-lg border transition-colors duration-150 cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.activeToolHover}`}
                title="縮小"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className={`font-mono text-[11px] w-9 text-center ${themeClasses.textMuted}`}>
                {Math.round(state.zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => state.setZoom((z) => Math.min(1.6, Number((z + 0.1).toFixed(1))))}
                className={`p-1 rounded-lg border transition-colors duration-150 cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.activeToolHover}`}
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
            className={`px-3 py-1.5 min-h-[38px] rounded-lg transition-colors cursor-pointer ${
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
            className={`px-3 py-1.5 min-h-[38px] rounded-lg transition-colors cursor-pointer ${
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
            className={`px-3 py-1.5 min-h-[38px] rounded-lg transition-colors cursor-pointer ${
              state.mobileTab === 'settings'
                ? themeClasses.activeTool
                : `${themeClasses.textMuted} ${themeClasses.activeToolHover}`
            }`}
          >
            組版設定 (Q/H)
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
            onChangeCustomText={state.setCustomText}
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
          />

          <main
            className={`${
              state.mobileTab !== 'preview' ? 'hidden md:flex' : 'flex'
            } flex-1 min-h-0 flex-col overflow-y-auto overflow-x-auto relative ${
              isLight ? 'bg-stone-200/50' : 'bg-black/30'
            }`}
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <div
              className={`px-4 sm:px-6 py-2 border-b flex items-center justify-between text-xs font-mono shrink-0 max-sm:flex-col max-sm:items-start max-sm:gap-1 ${
                isLight ? 'bg-white/80 border-stone-200 text-stone-500' : 'bg-black/20 border-white/10 text-stone-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span>
                  作品: <strong>『{state.currentWork.title}』</strong>
                </span>
                <span>·</span>
                <span>
                  著者: <strong>{state.currentWork.author}</strong>
                </span>
              </div>
              <div className="flex items-center space-x-3 text-[11px]">
                <span>行数: {state.currentLayout.lineCount}行</span>
                <span>·</span>
                <span>平均密度: {state.currentLayout.averageDensityPercent}%</span>
              </div>
            </div>

            <div className="flex-1 w-full p-2 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:p-4 md:p-6 flex flex-col items-center justify-start">
              {state.layoutMode === 'book_spread' && (
                <BookSpreadView
                  layout={state.currentLayout}
                  title={state.currentWork.title}
                  author={state.currentWork.author}
                  isLight={isLight}
                  fontFamily={state.effectiveFontFamily}
                  fontSizeQ={state.fontSizeQ}
                  lineFeedH={state.lineFeedH}
                  charsPerLine={state.charsPerLine}
                  showGrid={state.showBodyGrid}
                  isVertical={state.isVertical}
                  zoom={state.zoom}
                />
              )}

              {state.layoutMode === 'manuscript' && (
                <ManuscriptView
                  layout={state.currentLayout}
                  title={state.currentWork.title}
                  author={state.currentWork.author}
                  isLight={isLight}
                  fontFamily={state.effectiveFontFamily}
                  fontSizeQ={state.fontSizeQ}
                  zoom={state.zoom}
                  charsPerLine={state.charsPerLine}
                />
              )}

              {state.layoutMode === 'magazine' && (
                <MagazineLayoutView
                  layout={state.currentLayout}
                  title={state.currentWork.title}
                  author={state.currentWork.author}
                  headline={state.currentWork.headline}
                  lead={state.currentWork.lead}
                  isLight={isLight}
                  fontFamily={state.effectiveFontFamily}
                  fontSizeQ={state.fontSizeQ}
                  lineFeedH={state.lineFeedH}
                  isVertical={state.isVertical}
                  showGrid={state.showBodyGrid}
                  zoom={state.zoom}
                />
              )}

              {state.layoutMode === 'poetry' && (
                <PoetryTanzakuView
                  layout={state.currentLayout}
                  title={state.currentWork.title}
                  author={state.currentWork.author}
                  isLight={isLight}
                  fontFamily={state.effectiveFontFamily}
                  fontSizeQ={state.fontSizeQ}
                  lineFeedH={state.lineFeedH}
                  zoom={state.zoom}
                  isVertical={state.isVertical}
                  showGrid={state.showBodyGrid}
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
                  showGrid={state.showBodyGrid}
                  isVertical={state.isVertical}
                  isLight={isLight}
                  fontFamily={state.effectiveFontFamily}
                  zoom={state.zoom}
                />
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};