import React from 'react';
import {
  AlignVerticalJustifyCenter,
  ArrowUpDown,
  Eye,
  Layers,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import { getThemeClasses } from '../utils/theme';
import {
  GposKerningPanel,
  LigaturesPanel,
  OpenTypeFeaturesModalProps,
  OpenTypePreviewPanel,
  PaltMetricsPanel,
  VertFeaturesPanel,
  isOpenTypeTab,
  useOpenTypeFeaturesState,
} from './openTypeFeatures';

export type { OpenTypeFeaturesModalProps } from './openTypeFeatures';

export const OpenTypeFeaturesModal: React.FC<OpenTypeFeaturesModalProps> = ({
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
    activeTab,
    setActiveTab,
    config,
    opticalSideBearingPercent,
    setOpticalSideBearingPercent,
    newLigName,
    setNewLigName,
    newLigInputs,
    setNewLigInputs,
    newLigTargetUnicode,
    setNewLigTargetUnicode,
    previewText,
    setPreviewText,
    previewWritingMode,
    togglePreviewWritingMode,
    toggleFeaturesGlobal,
    toggleVerticalWriting,
    updateVerticalMetricField,
    toggleVertSub,
    handleAutoDetectVerticalGlyphs,
    toggleLigature,
    handleAddCustomLigature,
    handleRemoveLigature,
    togglePaltGlobal,
    handleAutoDerivePalt,
    togglePaltItem,
  } = useOpenTypeFeaturesState({
    project,
    setProject,
    isOpen,
    onClose,
    onShowToast,
  });

  if (!isOpen) return null;

  const tabs = [
    {
      id: 'vert',
      label: '縦書き設定 (`vert`/`vhea`)',
      shortLabel: '縦書き',
      icon: AlignVerticalJustifyCenter,
      count: config.verticalWriting.substitutions.filter((s) => s.enabled).length,
    },
    {
      id: 'liga',
      label: '合字・リガチャー (`liga`/`dlig`)',
      shortLabel: '合字',
      icon: Layers,
      count: config.ligatures.filter((l) => l.enabled).length,
    },
    {
      id: 'gpos',
      label: 'カーニング・ペア調整 (GPOS)',
      shortLabel: 'カーニング',
      icon: ArrowUpDown,
      count: Object.keys(project.kerning || {}).length,
    },
    {
      id: 'palt',
      label: 'プロポーショナルメトリクス (`palt`/`vpal`)',
      shortLabel: '文字ツメ(palt)',
      icon: Sparkles,
      count: (config.palt?.paltList || []).filter((p) => p.enabled).length,
    },
    {
      id: 'preview',
      label: 'リアルタイム縦書き・合字プレビュー',
      shortLabel: 'プレビュー',
      icon: Eye,
      badge: 'LIVE',
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="縦書き・合字スタジオ"
      className="fixed inset-0 z-[60] anim-fade flex flex-col sm:items-center sm:justify-center p-0 sm:p-4 bg-black/75 select-none"
    >
      <div
        className={`w-full h-[100dvh] sm:h-auto sm:max-w-5xl border-0 sm:border rounded-none sm:rounded-2xl shadow-none sm:shadow-2xl sm:max-h-[92vh] flex flex-col overflow-hidden transition-colors ${themeClasses.modalBg} ${themeClasses.border}`}
      >
        {/* Header Bar */}
        <div
          className={`flex flex-col sm:flex-row sm:items-center justify-between px-3.5 py-2.5 pt-[calc(0.625rem+env(safe-area-inset-top,0px))] sm:px-5 sm:py-3.5 sm:pt-3.5 border-b shrink-0 gap-3 ${themeClasses.headerBg} ${themeClasses.border}`}
        >
          <div className="flex items-center space-x-3 min-w-0">
            <div
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center border shrink-0 ${themeClasses.accentBadge}`}
            >
              <AlignVerticalJustifyCenter className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h2 className="text-sm sm:text-lg font-extrabold tracking-tight truncate">
                  縦書き・合字スタジオ
                </h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                    config.enabled
                      ? themeClasses.accentBadge
                      : `${themeClasses.cardBg} ${themeClasses.textMuted} ${themeClasses.border}`
                  }`}
                >
                  {config.enabled ? 'ON' : 'OFF'}
                </span>
              </div>
              <p className={`text-[11px] sm:text-xs mt-0.5 truncate ${themeClasses.textMuted}`}>
                日本語縦書き・合字・ペア調整のビジュアル設計と検証
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end space-x-2 shrink-0">
            <button
              onClick={toggleFeaturesGlobal}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer ${
                config.enabled
                  ? `${themeClasses.accentBtn} border-transparent`
                  : `${themeClasses.cardBg} ${themeClasses.textMuted} ${themeClasses.border} ${themeClasses.activeToolHover}`
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{config.enabled ? '有効' : '無効'}</span>
            </button>

            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${themeClasses.textMuted} ${themeClasses.activeToolHover}`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div
          className={`flex items-center px-3 sm:px-5 py-2 border-b shrink-0 text-xs font-bold gap-1 overflow-x-auto custom-scrollbar touch-scroll-x min-w-0 ${themeClasses.subtoolbarBg} ${themeClasses.border}`}
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (isOpenTypeTab(tab.id)) {
                    setActiveTab(tab.id);
                  }
                }}
                className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl flex items-center space-x-1.5 sm:space-x-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isSelected
                    ? themeClasses.accentBtn
                    : `${themeClasses.textMuted} ${themeClasses.activeToolHover}`
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.shortLabel}</span>
                {tab.count !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-black/10 dark:bg-white/10'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
                {tab.badge && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-500 text-white">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-6">
          {activeTab === 'vert' && (
            <VertFeaturesPanel
              verticalWriting={config.verticalWriting}
              themeClasses={themeClasses}
              onAutoDetectVerticalGlyphs={handleAutoDetectVerticalGlyphs}
              onToggleVerticalWriting={toggleVerticalWriting}
              onUpdateVerticalMetricField={updateVerticalMetricField}
              onToggleVertSub={toggleVertSub}
            />
          )}

          {activeTab === 'liga' && (
            <LigaturesPanel
              ligatures={config.ligatures}
              themeClasses={themeClasses}
              newLigName={newLigName}
              newLigInputs={newLigInputs}
              newLigTargetUnicode={newLigTargetUnicode}
              onChangeNewLigName={setNewLigName}
              onChangeNewLigInputs={setNewLigInputs}
              onChangeNewLigTargetUnicode={setNewLigTargetUnicode}
              onAddCustomLigature={handleAddCustomLigature}
              onToggleLigature={toggleLigature}
              onRemoveLigature={handleRemoveLigature}
            />
          )}

          {activeTab === 'gpos' && (
            <GposKerningPanel
              kerningPairCount={Object.keys(project.kerning || {}).length}
              themeClasses={themeClasses}
            />
          )}

          {activeTab === 'palt' && (
            <PaltMetricsPanel
              paltConfig={config.palt}
              opticalSideBearingPercent={opticalSideBearingPercent}
              themeClasses={themeClasses}
              onChangeOpticalSideBearingPercent={setOpticalSideBearingPercent}
              onAutoDerivePalt={handleAutoDerivePalt}
              onTogglePaltGlobal={togglePaltGlobal}
              onTogglePaltItem={togglePaltItem}
            />
          )}

          {activeTab === 'preview' && (
            <OpenTypePreviewPanel
              projectName={project.name}
              previewText={previewText}
              previewWritingMode={previewWritingMode}
              themeClasses={themeClasses}
              onChangePreviewText={setPreviewText}
              onToggleWritingMode={togglePreviewWritingMode}
            />
          )}
        </div>

        {/* Modal Footer */}
        <div
          className={`flex items-center justify-between px-5 py-3 border-t shrink-0 text-xs ${
            isLight ? 'bg-stone-50 border-stone-200' : 'bg-[#141e17] border-[#223326]'
          }`}
        >
          <div className="flex items-center space-x-2 text-stone-500 dark:text-stone-400 max-sm:hidden">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <span>フォント出力（TTF/OTF/WOFF/WOFF2）時に OpenType 機能テーブルが自動バインドされます</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition-colors"
          >
            完了・閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
