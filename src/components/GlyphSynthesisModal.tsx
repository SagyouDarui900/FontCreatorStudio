import React from 'react';
import { ArrowRightLeft, Maximize2, Minimize2, Sparkles, Wand2, X } from 'lucide-react';
import { getThemeClasses, isLightTheme } from '../utils/theme';
import {
  DakutenSynthesisPanel,
  GlyphSynthesisModalProps,
  SmallKanaSynthesisPanel,
  useGlyphSynthesisState,
} from './glyphSynthesis';

export type { GlyphSynthesisModalProps } from './glyphSynthesis';

export const GlyphSynthesisModal: React.FC<GlyphSynthesisModalProps> = ({
  isOpen,
  onClose,
  project,
  setProject,
  onUpdateProject,
  commitHistory,
  showToast,
  onShowToast,
  theme,
}) => {
  const isLight = isLightTheme(theme);
  const themeClasses = getThemeClasses(theme);

  const state = useGlyphSynthesisState({
    isOpen,
    onClose,
    project,
    setProject,
    onUpdateProject,
    commitHistory,
    showToast,
    onShowToast,
  });

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="かな自動合成"
      className={`fixed inset-0 z-[60] anim-fade ${
        state.isFullscreen
          ? 'p-0 w-screen h-[100dvh] bg-black/85 flex flex-col'
          : 'flex flex-col sm:items-center sm:justify-center p-0 sm:p-4 bg-black/75 select-none'
      }`}
    >
      <div
        className={`flex flex-col overflow-hidden ${themeClasses.modalBg} ${themeClasses.textPrimary} ${
          state.isFullscreen
            ? 'w-screen h-[100dvh] rounded-none border-none shadow-none'
            : `w-full h-[100dvh] sm:h-auto sm:max-w-5xl xl:max-w-6xl border-0 sm:border rounded-none sm:rounded-2xl shadow-none sm:shadow-2xl sm:max-h-[92vh] ${themeClasses.border}`
        }`}
      >
        {/* Modal Header */}
        <div
          className={`flex items-center justify-between px-3.5 py-2.5 pt-[calc(0.625rem+env(safe-area-inset-top,0px))] sm:px-5 sm:py-2.5 sm:pt-2.5 border-b shrink-0 ${themeClasses.headerBg} ${themeClasses.border}`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-lg bg-emerald-700 text-white shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold flex items-center gap-2 truncate">
                <span>かな自動合成</span>
                {state.isFullscreen && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-emerald-700 text-white shrink-0">
                    全画面
                  </span>
                )}
              </h2>
              <p className={`hidden sm:block text-xs truncate ${themeClasses.textMuted}`}>
                清音から濁音・半濁音、通常かなから小書き文字を一括生成
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1.5 shrink-0">
            <button
              type="button"
              onClick={() => state.setIsFullscreen(!state.isFullscreen)}
              className={`hidden sm:flex p-1.5 px-2.5 rounded-lg border text-xs font-semibold items-center space-x-1.5 transition-colors cursor-pointer ${
                state.isFullscreen
                  ? themeClasses.accentBadge
                  : `${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.activeToolHover}`
              }`}
              title={state.isFullscreen ? '通常表示に戻す (F または Esc)' : '全画面表示に拡大 (F)'}
            >
              {state.isFullscreen ? (
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
              className={`p-1.5 min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 flex items-center justify-center rounded-lg border transition-colors cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textMuted} ${themeClasses.activeToolHover}`}
              title="閉じる (Esc)"
              aria-label="閉じる"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div
          className={`flex border-b px-3 sm:px-5 pt-1.5 gap-1.5 text-xs font-bold shrink-0 overflow-x-auto no-scrollbar whitespace-nowrap ${themeClasses.subtoolbarBg} ${themeClasses.border}`}
        >
          <button
            type="button"
            onClick={() => state.setActiveTab('dakuten')}
            className={`flex items-center gap-1.5 px-3.5 py-2 border-b-2 transition-colors cursor-pointer ${
              state.activeTab === 'dakuten'
                ? `${themeClasses.accentBorder} ${themeClasses.accentText}`
                : `border-transparent ${themeClasses.textMuted} hover:opacity-80`
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>濁点・半濁点合成 (が・ざ・だ・ば・ぱ等)</span>
          </button>

          <button
            type="button"
            onClick={() => state.setActiveTab('smallKana')}
            className={`flex items-center gap-1.5 px-3.5 py-2 border-b-2 transition-colors cursor-pointer ${
              state.activeTab === 'smallKana'
                ? `${themeClasses.accentBorder} ${themeClasses.accentText}`
                : `border-transparent ${themeClasses.textMuted} hover:opacity-80`
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>小書き文字合成 (っ・ゃ・ゅ・ょ・ぁ等)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 sm:p-4">
          {state.activeTab === 'dakuten' ? (
            <DakutenSynthesisPanel
              isLight={isLight}
              themeClasses={themeClasses}
              unitsPerEm={state.unitsPerEm}
              dakuScope={state.dakuScope}
              onChangeDakuScope={state.setDakuScope}
              dakuOverwrite={state.dakuOverwrite}
              onChangeDakuOverwrite={state.setDakuOverwrite}
              dakuStyle={state.dakuStyle}
              onChangeDakuStyle={state.setDakuStyle}
              handakuStyle={state.handakuStyle}
              onChangeHandakuStyle={state.setHandakuStyle}
              dakuOffsetX={state.dakuOffsetX}
              onChangeDakuOffsetX={state.setDakuOffsetX}
              dakuOffsetY={state.dakuOffsetY}
              onChangeDakuOffsetY={state.setDakuOffsetY}
              dakuScale={state.dakuScale}
              onChangeDakuScale={state.setDakuScale}
              onResetOffsets={state.resetDakutenOffsets}
              availableDakutenSources={state.availableDakutenSources}
              dakuPreviewChar={state.dakuPreviewChar}
              onSelectPreviewChar={state.setDakuPreviewChar}
              dakuPreviewKind={state.dakuPreviewKind}
              onChangeDakuPreviewKind={state.setDakuPreviewKind}
              dakutenPreviewSvgPath={state.dakutenPreviewSvgPath}
              dakutenTargetCount={state.dakutenTargetCount}
              onExecuteBatch={state.handleExecuteDakutenBatch}
            />
          ) : (
            <SmallKanaSynthesisPanel
              isLight={isLight}
              themeClasses={themeClasses}
              unitsPerEm={state.unitsPerEm}
              smallScope={state.smallScope}
              onChangeSmallScope={state.setSmallScope}
              smallOverwrite={state.smallOverwrite}
              onChangeSmallOverwrite={state.setSmallOverwrite}
              smallScale={state.smallScale}
              onChangeSmallScale={state.setSmallScale}
              smallWeightBoost={state.smallWeightBoost}
              onChangeSmallWeightBoost={state.setSmallWeightBoost}
              smallPlacement={state.smallPlacement}
              onChangeSmallPlacement={state.setSmallPlacement}
              smallOffsetX={state.smallOffsetX}
              onChangeSmallOffsetX={state.setSmallOffsetX}
              smallOffsetY={state.smallOffsetY}
              onChangeSmallOffsetY={state.setSmallOffsetY}
              onResetOffsets={state.resetSmallKanaOffsets}
              availableSmallSources={state.availableSmallSources}
              smallPreviewChar={state.smallPreviewChar}
              onSelectPreviewChar={state.setSmallPreviewChar}
              smallKanaPreviewPaths={state.smallKanaPreviewPaths}
              smallKanaTargetCount={state.smallKanaTargetCount}
              onExecuteBatch={state.handleExecuteSmallKanaBatch}
            />
          )}
        </div>

        {/* Sticky Mobile Bottom Execute Bar */}
        <div
          className={`lg:hidden shrink-0 px-3 py-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom,0px))] border-t ${themeClasses.headerBg} ${themeClasses.border}`}
        >
          {state.activeTab === 'dakuten' ? (
            <button
              type="button"
              onClick={state.handleExecuteDakutenBatch}
              className={`w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:opacity-85 transition-colors duration-100 cursor-pointer ${themeClasses.accentBtn}`}
            >
              <Wand2 className="w-4 h-4 shrink-0" />
              <span>濁音・半濁点を一括合成 ({state.dakutenTargetCount}字)</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={state.handleExecuteSmallKanaBatch}
              className={`w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:opacity-85 transition-colors duration-100 cursor-pointer ${themeClasses.accentBtn}`}
            >
              <Wand2 className="w-4 h-4 shrink-0" />
              <span>小書き文字を一括生成 ({state.smallKanaTargetCount}字)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};