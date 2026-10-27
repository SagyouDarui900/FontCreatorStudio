import React from 'react';
import {
  Type,
  Sparkles,
  Info,
  Columns,
  Rows,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  ChevronUp,
  Sliders,
  Maximize2,
  Minimize2,
  X,
} from 'lucide-react';
import { FontProject } from '../../types';
import { TestPreviewState } from './hooks/useTestPreviewState';

interface PreviewToolbarProps {
  project: FontProject;
  state: TestPreviewState;
  onClose: () => void;
  setProject?: React.Dispatch<React.SetStateAction<FontProject>>;
  onOpenMojikumiStudio?: () => void;
}

export const PreviewToolbar: React.FC<PreviewToolbarProps> = ({
  project,
  state,
  onClose,
  setProject,
  onOpenMojikumiStudio,
}) => {
  const {
    layoutMode,
    setLayoutMode,
    isSidebarOpen,
    setIsSidebarOpen,
    isTopControlsCollapsed,
    setIsTopControlsCollapsed,
    isSideAdjusterOpen,
    setIsSideAdjusterOpen,
    showHintBanner,
    setShowHintBanner,
    isFullscreen,
    setIsFullscreen,
    isLight,
    handleBatchCenterAll,
  } = state;

  return (
    <>
      {/* Header Bar */}
      <div
        className={`px-3 sm:px-4 py-2 sm:py-2.5 border-b flex items-center justify-between shrink-0 gap-2 ${
          isLight ? 'bg-[#edf5f0] border-[#d8e6df]' : 'bg-[#18231c] border-[#25362b]'
        }`}
      >
        <div className="flex items-center space-x-2 min-w-0">
          <Type className="w-5 h-5 shrink-0 text-emerald-700 dark:text-emerald-400" />
          <h2 className={`font-bold text-sm sm:text-base truncate ${isLight ? 'text-emerald-950' : 'text-emerald-200'}`}>
            <span className="sm:hidden">組版テスト</span>
            <span className="hidden sm:inline">組版テスト・試し打ちシミュレーター</span>
          </h2>
          <span
            className={`hidden md:inline-flex text-[11px] px-2 py-0.5 rounded-full font-mono shrink-0 ${
              isLight ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-950 text-emerald-300'
            }`}
          >
            {Object.keys(project.glyphs || {}).length} グリフ
          </span>
        </div>

        <div className="flex items-center space-x-1 sm:space-x-1.5 shrink-0">
          {setProject && (
            <button
              type="button"
              onClick={handleBatchCenterAll}
              className={`h-7 px-2.5 rounded-md text-xs font-semibold border transition-colors hidden lg:flex items-center space-x-1 cursor-pointer ${
                isLight
                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-amber-950/70 hover:bg-amber-900/70 text-amber-200 border-amber-800'
              }`}
              title="フォント内の全文字の左右余白を中央に整列してプロジェクトに反映します (※小文字・記号は自動保護)"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>全文字中央整列</span>
            </button>
          )}

          {/* Link to Mojikumi Studio */}
          {onOpenMojikumiStudio && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenMojikumiStudio();
              }}
              className={`h-7 px-2.5 rounded-md text-xs font-semibold border transition-colors flex items-center space-x-1.5 cursor-pointer ${
                isLight
                  ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-950 border-emerald-300'
                  : 'bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 border-emerald-700'
              }`}
              title="ベタ組み・ツメ組み・アケ組み比較やJISアキ量・禁則スタジオを開く"
            >
              <Type className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
              <span>文字組みスタジオ (ベタ/ツメ/アケ)</span>
            </button>
          )}

          {/* Hint toggle */}
          <button
            type="button"
            onClick={() => setShowHintBanner(!showHintBanner)}
            className={`h-7 px-2 sm:px-2.5 rounded-md text-xs font-medium border transition-colors flex items-center space-x-1 cursor-pointer ${
              showHintBanner
                ? isLight
                  ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                  : 'bg-emerald-950 border-emerald-700 text-emerald-300'
                : isLight
                ? 'bg-white border-[#d8e6df] text-stone-600 hover:bg-emerald-50'
                : 'bg-[#1a251e] border-[#25362b] text-stone-300 hover:bg-[#223027]'
            }`}
            title="配置・余白設定のヒントを表示/非表示"
          >
            <Info className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">ヒント</span>
          </button>

          {/* Desktop Layout switch: Split vs Top */}
          <div
            className={`hidden md:flex items-center h-7 p-0.5 rounded-md border ${
              isLight ? 'bg-white border-[#d8e6df]' : 'bg-[#101712] border-[#25362b]'
            }`}
          >
            <button
              type="button"
              onClick={() => {
                setLayoutMode('split');
                setIsSidebarOpen(true);
              }}
              className={`h-6 px-2 rounded text-xs font-semibold flex items-center space-x-1 transition-all cursor-pointer ${
                layoutMode === 'split'
                  ? isLight
                    ? 'bg-emerald-800 text-white'
                    : 'bg-emerald-500 text-stone-950'
                  : isLight
                  ? 'text-stone-600 hover:text-stone-900'
                  : 'text-emerald-400 hover:text-emerald-200'
              }`}
              title="左右分割モード: 左に設定、右に縦フルハイトの広大な文字プレビュー用紙を表示"
            >
              <Columns className="w-3.5 h-3.5" />
              <span>左右分割</span>
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('top')}
              className={`h-6 px-2 rounded text-xs font-semibold flex items-center space-x-1 transition-all cursor-pointer ${
                layoutMode === 'top'
                  ? isLight
                    ? 'bg-emerald-800 text-white'
                    : 'bg-emerald-500 text-stone-950'
                  : isLight
                  ? 'text-stone-600 hover:text-stone-900'
                  : 'text-emerald-400 hover:text-emerald-200'
              }`}
              title="上下配置モード: 上にツールバー、下にプレビュー用紙を表示"
            >
              <Rows className="w-3.5 h-3.5" />
              <span>上下配置</span>
            </button>
          </div>

          {/* Desktop Sidebar toggle or Top Collapse toggle */}
          {layoutMode === 'split' ? (
            <button
              type="button"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`hidden md:flex h-7 px-2.5 rounded-md border text-xs font-semibold items-center space-x-1 transition-all cursor-pointer ${
                !isSidebarOpen
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : isLight
                  ? 'bg-white border-[#d8e6df] text-stone-700 hover:bg-emerald-50'
                  : 'bg-[#1c2920] border-[#25362b] text-emerald-200 hover:bg-[#25362b]'
              }`}
              title={isSidebarOpen ? '設定パネルを隠して文字プレビューを全幅表示' : '設定パネルを表示'}
            >
              {isSidebarOpen ? (
                <>
                  <PanelLeftClose className="w-3.5 h-3.5" />
                  <span>パネル収納</span>
                </>
              ) : (
                <>
                  <PanelLeftOpen className="w-3.5 h-3.5" />
                  <span>設定パネル</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsTopControlsCollapsed(!isTopControlsCollapsed)}
              className={`hidden md:flex h-7 px-2.5 rounded-md border text-xs font-semibold items-center space-x-1 transition-all cursor-pointer ${
                isTopControlsCollapsed
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : isLight
                  ? 'bg-white border-[#d8e6df] text-stone-700 hover:bg-emerald-50'
                  : 'bg-[#1c2920] border-[#25362b] text-emerald-200 hover:bg-[#25362b]'
              }`}
              title={isTopControlsCollapsed ? '上部設定バーを展開' : '上部バーを最小化'}
            >
              {isTopControlsCollapsed ? (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>設定展開</span>
                </>
              ) : (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>文字集中表示</span>
                </>
              )}
            </button>
          )}

          {/* Desktop Fine-Tuning Side Adjuster Toggle */}
          <button
            type="button"
            onClick={() => setIsSideAdjusterOpen(!isSideAdjusterOpen)}
            className={`hidden md:flex h-7 px-2.5 rounded-md border text-xs font-semibold items-center space-x-1 transition-all cursor-pointer ${
              isSideAdjusterOpen
                ? 'bg-emerald-600 text-white border-emerald-600'
                : isLight
                ? 'bg-white border-[#d8e6df] text-stone-700 hover:bg-emerald-50'
                : 'bg-[#1c2920] border-[#25362b] text-emerald-200 hover:bg-[#25362b]'
            }`}
            title={isSideAdjusterOpen ? '文字微調整パネルを閉じる' : '文字微調整パネルを表示'}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>微調整パネル</span>
          </button>

          {/* Fullscreen Toggle Button */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className={`h-7 px-2 sm:px-2.5 rounded-md border text-xs font-semibold flex items-center space-x-1 transition-all cursor-pointer ${
              isFullscreen
                ? 'bg-emerald-600 text-white border-emerald-600'
                : isLight
                ? 'bg-white border-[#d8e6df] text-stone-700 hover:bg-emerald-50 hover:text-emerald-900'
                : 'bg-[#1c2920] border-[#25362b] text-emerald-200 hover:bg-[#25362b]'
            }`}
            title={isFullscreen ? '通常表示に戻す (F / Esc)' : '全画面表示モードに切り替え (F)'}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">通常</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">全画面</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="h-7 w-7 rounded-md hover:bg-emerald-100 dark:hover:bg-[#25362b] text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 transition-colors inline-flex items-center justify-center cursor-pointer"
            title="閉じる (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Informational Guidance Banner */}
      {showHintBanner && (
        <div
          className={`px-3.5 py-2 text-[11px] border-b flex items-center justify-between shrink-0 ${
            isLight
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
              : 'bg-emerald-950/60 border-emerald-900 text-emerald-200'
          }`}
        >
          <div className="flex items-start space-x-2 min-w-0 pr-2">
            <Info className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
            <span className="leading-relaxed break-words">
              <strong>【配置・余白設定のヒント】</strong> ガイド枠に合わせて書いた文字は、<strong>『配置: ガイド描画位置優先』</strong>で手書きした通りの自然な軸・字間になります。文字の偏りを整えたい場合のみ<strong>『左右センタリング補正』</strong>をご利用ください。（※小文字・句読点・括弧はレイアウト崩れを防ぐためセンタリング補正から自動除外されます）
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowHintBanner(false)}
            className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer"
            title="バナーを閉じる"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </>
  );
};
