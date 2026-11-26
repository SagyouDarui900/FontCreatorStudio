import React, { useCallback, useState } from 'react';
import {
  Sparkles,
  Zap,
} from 'lucide-react';
import { getThemeClasses } from '../utils/theme';
import { ModalShell } from './modals/ModalShell';
import { ModalTabs, type ModalTabItem } from './modals/ModalTabs';
import { ModalFooter } from './modals/ModalFooter';
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
  commitProjectHistory,
}) => {
  const themeClasses = getThemeClasses(theme ?? (isLight ? 'light' : 'dark'));
  const resolvedTheme = theme ?? (isLight ? 'light' : 'dark');

  // Fullscreen mode (M-11): same toggle as the other studio modals.
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const toggleFullscreen = useCallback(() => setIsFullscreen((v) => !v), []);

  const {
    activeTab,
    setActiveTab,
    config,
    existingUnicodes,
    opticalSideBearingPercent,
    setOpticalSideBearingPercent,
    newLigName,
    setNewLigName,
    newLigType,
    setNewLigType,
    newLigInputs,
    setNewLigInputs,
    newLigTargetUnicode,
    setNewLigTargetUnicode,
    previewText,
    setPreviewText,
    previewWritingMode,
    togglePreviewWritingMode,
    previewUsePalt,
    togglePreviewPalt,
    toggleFeaturesGlobal,
    toggleVerticalWriting,
    commitVerticalMetricHistory,
    updateVerticalMetricField,
    toggleVertSub,
    handleAutoDetectVerticalGlyphs,
    toggleLigature,
    handleAddCustomLigature,
    handleRemoveLigature,
    togglePaltGlobal,
    handleAutoDerivePalt,
    togglePaltItem,
    toggleVpalItem,
  } = useOpenTypeFeaturesState({
    project,
    setProject,
    isOpen,
    onClose,
    onShowToast,
    commitProjectHistory,
    isFullscreen,
    onToggleFullscreen: toggleFullscreen,
  });

  if (!isOpen) return null;

  const tabs: ModalTabItem[] = [
    {
      id: 'vert',
      label: '縦書き設定 (`vert`/`vhea`)',
      shortLabel: '縦書き',
      count: config.verticalWriting.substitutions.filter((s) => s.enabled).length,
    },
    {
      id: 'liga',
      label: '合字・リガチャー (`liga`/`dlig`)',
      shortLabel: '合字',
      count: config.ligatures.filter((l) => l.enabled).length,
    },
    {
      id: 'gpos',
      label: 'カーニング・ペア調整 (GPOS)',
      shortLabel: 'カーニング',
      count: Object.keys(project.kerning || {}).length,
    },
    {
      id: 'palt',
      label: 'プロポーショナルメトリクス (`palt`/`vpal`)',
      shortLabel: '文字ツメ(palt)',
      count: (config.palt?.paltList || []).filter((p) => p.enabled).length,
    },
    {
      id: 'preview',
      label: 'リアルタイム縦書き・合字プレビュー',
      shortLabel: 'プレビュー',
      badge: (
        <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${themeClasses.accentBadge}`}>
          LIVE
        </span>
      ),
    },
  ];

  return (
    <ModalShell
      title="縦書き・合字スタジオ"
      subtitle="日本語縦書き・合字・ペア調整のビジュアル設計と検証"
      theme={resolvedTheme}
      themeClasses={themeClasses}
      maxWidth="6xl"
      isFullscreen={isFullscreen}
      onToggleFullscreen={toggleFullscreen}
      onClose={onClose}
      headerExtra={
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border shrink-0 ${
              config.enabled
                ? themeClasses.accentBadge
                : `${themeClasses.cardBg} ${themeClasses.textMuted} ${themeClasses.border}`
            }`}
          >
            {config.enabled ? 'ON' : 'OFF'}
          </span>
          <button
            type="button"
            onClick={toggleFeaturesGlobal}
            className={`px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer ${
              config.enabled
                ? `${themeClasses.accentBtn} border-transparent`
                : `${themeClasses.cardBg} ${themeClasses.textMuted} ${themeClasses.border} ${themeClasses.activeToolHover}`
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{config.enabled ? '有効' : '無効'}</span>
          </button>
        </div>
      }
      footer={
        <ModalFooter
          primaryLabel="完了・閉じる"
          onPrimary={onClose}
          onCancel={onClose}
          theme={resolvedTheme}
          themeClasses={themeClasses}
          leftInfo={
            <div className={`hidden sm:flex items-center gap-2 min-w-0 ${themeClasses.textMuted}`}>
              <Sparkles className={`w-4 h-4 shrink-0 ${themeClasses.accentText}`} />
              <span className="truncate text-xs">
                フォント出力（OTF/TTF/WOFF/WOFF2）時に縦書き・合字・GPOSテーブルが自動バインドされます
              </span>
            </div>
          }
        />
      }
    >
      {/* Tab bar: sticky so it stays visible while the body scrolls.
          The negative margins cancel the ModalShell body padding (p-3.5
          sm:p-4) so the bar spans the full modal width like before. */}
      <div className="sticky top-0 z-10 -mx-3.5 -mt-3.5 sm:-mx-4 sm:-mt-4 mb-3.5 sm:mb-4">
        <ModalTabs
          tabs={tabs}
          activeId={activeTab}
          onChange={(id) => {
            if (isOpenTypeTab(id)) {
              setActiveTab(id);
            }
          }}
          theme={resolvedTheme}
          themeClasses={themeClasses}
          ariaLabel="縦書き・合字スタジオのタブ"
        />
      </div>

      {activeTab === 'vert' && (
        <VertFeaturesPanel
          verticalWriting={config.verticalWriting}
          existingUnicodes={existingUnicodes}
          themeClasses={themeClasses}
          onAutoDetectVerticalGlyphs={handleAutoDetectVerticalGlyphs}
          onToggleVerticalWriting={toggleVerticalWriting}
          onCommitHistory={commitVerticalMetricHistory}
          onUpdateVerticalMetricField={updateVerticalMetricField}
          onToggleVertSub={toggleVertSub}
        />
      )}

      {activeTab === 'liga' && (
        <LigaturesPanel
          ligatures={config.ligatures}
          existingUnicodes={existingUnicodes}
          themeClasses={themeClasses}
          newLigName={newLigName}
          newLigType={newLigType}
          newLigInputs={newLigInputs}
          newLigTargetUnicode={newLigTargetUnicode}
          onChangeNewLigName={setNewLigName}
          onChangeNewLigType={setNewLigType}
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
          onToggleVpalItem={toggleVpalItem}
        />
      )}

      {activeTab === 'preview' && (
        <OpenTypePreviewPanel
          project={project}
          previewText={previewText}
          previewWritingMode={previewWritingMode}
          previewUsePalt={previewUsePalt}
          themeClasses={themeClasses}
          theme={resolvedTheme}
          onChangePreviewText={setPreviewText}
          onToggleWritingMode={togglePreviewWritingMode}
          onTogglePreviewPalt={togglePreviewPalt}
        />
      )}
    </ModalShell>
  );
};
