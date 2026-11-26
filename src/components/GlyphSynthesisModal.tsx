import React from 'react';
import { Sparkles, Wand2 } from 'lucide-react';
import { getThemeClasses, isLightTheme } from '../utils/theme';
import {
  DakutenSynthesisPanel,
  GlyphSynthesisModalProps,
  SmallKanaSynthesisPanel,
  useGlyphSynthesisState,
} from './glyphSynthesis';
import { ModalFooter } from './modals/ModalFooter';
import { ModalShell } from './modals/ModalShell';
import { ModalTabs } from './modals/ModalTabs';

export type { GlyphSynthesisModalProps } from './glyphSynthesis';

export const GlyphSynthesisModal: React.FC<GlyphSynthesisModalProps> = ({
  isOpen,
  onClose,
  project,
  setProject,
  onUpdateProject,
  commitHistory,
  commitProjectHistory,
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
    commitProjectHistory,
    showToast,
    onShowToast,
  });

  if (!isOpen) return null;

  const isDakutenTab = state.activeTab === 'dakuten';
  const targetCount = isDakutenTab ? state.dakutenTargetCount : state.smallKanaTargetCount;

  return (
    <ModalShell
      title="かな自動合成"
      subtitle="清音から濁音・半濁音、通常かなから小書き文字を一括生成"
      icon={<Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />}
      theme={theme}
      themeClasses={themeClasses}
      maxWidth="6xl"
      isFullscreen={state.isFullscreen}
      onToggleFullscreen={() => state.setIsFullscreen(!state.isFullscreen)}
      onClose={onClose}
      ariaLabel="かな自動合成"
      footer={
        <ModalFooter
          primaryLabel={
            isDakutenTab
              ? `濁音・半濁点を一括合成 (${state.dakutenTargetCount}字)`
              : `小書き文字を一括生成 (${state.smallKanaTargetCount}字)`
          }
          primaryIcon={<Wand2 className="w-4 h-4 shrink-0" />}
          onPrimary={
            isDakutenTab ? state.handleExecuteDakutenBatch : state.handleExecuteSmallKanaBatch
          }
          primaryDisabled={targetCount === 0 || state.isExecuting}
          onCancel={onClose}
          theme={theme}
          themeClasses={themeClasses}
        />
      }
    >
      {/* Tab Navigation (sticky within the scrollable body) */}
      <div className="sticky top-0 z-10 -mx-3.5 -mt-3.5 sm:-mx-4 sm:-mt-4 mb-3">
        <ModalTabs
          tabs={[
            {
              id: 'dakuten',
              label: '濁点・半濁点合成 (が・ざ・だ・ば・ぱ等)',
              shortLabel: '濁点合成',
            },
            {
              id: 'smallKana',
              label: '小書き文字合成 (っ・ゃ・ゅ・ょ・ぁ等)',
              shortLabel: '小書き合成',
            },
          ]}
          activeId={state.activeTab}
          onChange={(id) => state.setActiveTab(id as 'dakuten' | 'smallKana')}
          theme={theme}
          themeClasses={themeClasses}
          ariaLabel="合成の種類"
        />
      </div>

      {/* Modal Body */}
      {isDakutenTab ? (
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
        />
      )}
    </ModalShell>
  );
};
