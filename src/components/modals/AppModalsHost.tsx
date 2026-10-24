import React, { lazy, Suspense } from 'react';
import {
  FontProject,
  PathContour,
  TraceSettings,
  UserPenPreset,
  GlyphOverlaySettings,
  BrushStyle,
  PressureCurveConfig,
} from '../../types';
import { ThemeMode, THEME_PRESETS } from '../../utils/theme';
import { useModalContext } from '../../contexts/ModalContext';
import { Palette, Check, X } from 'lucide-react';

const TestPreviewModal = lazy(() =>
  import('../TestPreviewModal').then((module) => ({ default: module.TestPreviewModal }))
);
const SvgVectorizerModal = lazy(() =>
  import('../SvgVectorizerModal').then((module) => ({ default: module.SvgVectorizerModal }))
);
const FontQualityModal = lazy(() =>
  import('../FontQualityModal').then((module) => ({ default: module.FontQualityModal }))
);
const WeightInterpolationModal = lazy(() =>
  import('../WeightInterpolationModal').then((module) => ({ default: module.WeightInterpolationModal }))
);
const GlyphCompareModal = lazy(() =>
  import('../GlyphCompareModal').then((module) => ({ default: module.GlyphCompareModal }))
);
const RadicalStudioModal = lazy(() =>
  import('../RadicalStudioModal').then((module) => ({ default: module.RadicalStudioModal }))
);
const PixelFontStudioModal = lazy(() =>
  import('../PixelFontStudioModal').then((module) => ({ default: module.PixelFontStudioModal }))
);
const MojikumiStudioModal = lazy(() =>
  import('../MojikumiStudioModal').then((module) => ({ default: module.MojikumiStudioModal }))
);
const FontInfoModal = lazy(() =>
  import('../FontInfoModal').then((module) => ({ default: module.FontInfoModal }))
);
const TraceSettingsModal = lazy(() =>
  import('../TraceSettingsModal').then((module) => ({ default: module.TraceSettingsModal }))
);
const BatchNormalizeModal = lazy(() =>
  import('../BatchNormalizeModal').then((module) => ({ default: module.BatchNormalizeModal }))
);
const GlyphSynthesisModal = lazy(() =>
  import('../GlyphSynthesisModal').then((module) => ({ default: module.GlyphSynthesisModal }))
);
const KerningModal = lazy(() =>
  import('../KerningModal').then((module) => ({ default: module.KerningModal }))
);
const StorageManagerModal = lazy(() =>
  import('../StorageManagerModal').then((module) => ({ default: module.StorageManagerModal }))
);
const PenPresetsModal = lazy(() =>
  import('../PenPresetsModal').then((module) => ({ default: module.PenPresetsModal }))
);
const ShortcutsHelpModal = lazy(() =>
  import('../ShortcutsHelpModal').then((module) => ({ default: module.ShortcutsHelpModal }))
);
const ExportModal = lazy(() =>
  import('../ExportModal').then((module) => ({ default: module.ExportModal }))
);
const OpenTypeFeaturesModal = lazy(() =>
  import('../OpenTypeFeaturesModal').then((module) => ({ default: module.OpenTypeFeaturesModal }))
);
const GridFittingModal = lazy(() =>
  import('../GridFittingModal').then((module) => ({ default: module.GridFittingModal }))
);

export interface AppModalsHostProps {
  project: FontProject;
  setProject: React.Dispatch<React.SetStateAction<FontProject>>;
  selectedChar: string;
  selectedUnicode: number;
  onSelectGlyph: (unicode: number, char?: string) => void;
  theme: ThemeMode;
  themeClasses: any;
  isLight: boolean;
  changeTheme: (mode: ThemeMode) => void;
  showToast: (text: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  commitHistory: () => void;
  traceSettings: TraceSettings;
  setTraceSettings: React.Dispatch<React.SetStateAction<TraceSettings>>;
  overlaySettings: GlyphOverlaySettings;
  setOverlaySettings: React.Dispatch<React.SetStateAction<GlyphOverlaySettings>>;
  onApplySvgContours: (contours: PathContour[], append: boolean) => void;
  onInsertRadical: (radicalContours: PathContour[]) => void;
  onBatchInsertRadical: (radicalContours: PathContour[], targetChars: string[]) => void;

  // Pen preset parameters
  brushStyle: BrushStyle;
  brushWidth: number;
  pressureSensitivity: 'off' | 'low' | 'normal' | 'high';
  pressureCurve: PressureCurveConfig;
  smoothingIntensity: number;
  autoSmoothBrush: boolean;
  smoothStrength: 'mild' | 'standard' | 'strong';
  smoothPreserveCorners: boolean;
  autoUnionBrush: boolean;
  activePenPreset?: UserPenPreset | null;
  penPresets: UserPenPreset[];
  setPenPresets: React.Dispatch<React.SetStateAction<UserPenPreset[]>>;
  onApplyPenPreset: (preset: UserPenPreset) => void;
  onChangePressureCurve: (curve: PressureCurveConfig) => void;
}

export const AppModalsHost: React.FC<AppModalsHostProps> = ({
  project,
  setProject,
  selectedChar,
  selectedUnicode,
  onSelectGlyph,
  theme,
  themeClasses,
  isLight,
  changeTheme,
  showToast,
  commitHistory,
  traceSettings,
  setTraceSettings,
  overlaySettings,
  setOverlaySettings,
  onApplySvgContours,
  onInsertRadical,
  onBatchInsertRadical,
  brushStyle,
  brushWidth,
  pressureSensitivity,
  pressureCurve,
  smoothingIntensity,
  autoSmoothBrush,
  smoothStrength,
  smoothPreserveCorners,
  autoUnionBrush,
  activePenPreset,
  penPresets,
  setPenPresets,
  onApplyPenPreset,
  onChangePressureCurve,
}) => {
  const {
    isMobileThemeModalOpen,
    setIsMobileThemeModalOpen,
    isTestModalOpen,
    setIsTestModalOpen,
    isFontInfoModalOpen,
    setIsFontInfoModalOpen,
    isTraceModalOpen,
    setIsTraceModalOpen,
    isSvgModalOpen,
    setIsSvgModalOpen,
    isBatchNormalizeModalOpen,
    setIsBatchNormalizeModalOpen,
    isQualityModalOpen,
    setIsQualityModalOpen,
    isSynthesisModalOpen,
    setIsSynthesisModalOpen,
    isKerningModalOpen,
    setIsKerningModalOpen,
    isWeightInterpModalOpen,
    setIsWeightInterpModalOpen,
    isGlyphCompareModalOpen,
    setIsGlyphCompareModalOpen,
    isRadicalStudioOpen,
    setIsRadicalStudioOpen,
    isStorageManagerOpen,
    setIsStorageManagerOpen,
    isShortcutsModalOpen,
    setIsShortcutsModalOpen,
    isExportModalOpen,
    setIsExportModalOpen,
    isOpenTypeFeaturesModalOpen,
    setIsOpenTypeFeaturesModalOpen,
    isGridFittingModalOpen,
    setIsGridFittingModalOpen,
    isPixelStudioOpen,
    setIsPixelStudioOpen,
    isMojikumiStudioOpen,
    setIsMojikumiStudioOpen,
    isPenPresetsModalOpen,
    setIsPenPresetsModalOpen,
  } = useModalContext();

  return (
    <Suspense fallback={null}>
      {/* Mobile Theme Selection Drawer */}
      {isMobileThemeModalOpen && (
        <div className="sm:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="fixed inset-0 bg-black/60 animate-in fade-in duration-150"
            onClick={() => setIsMobileThemeModalOpen(false)}
          />
          <div
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className={`relative z-10 w-full rounded-t-3xl p-4 border-t shadow-2xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-200 pb-[max(env(safe-area-inset-bottom),20px)] ${themeClasses.cardBg}`}
          >
            <div className="flex items-center justify-between pb-2.5 border-b border-stone-200/80 dark:border-stone-800/80 mb-3 shrink-0">
              <div className="flex items-center space-x-2">
                <Palette className="w-5 h-5 text-amber-500" />
                <span className="font-extrabold text-sm">カラーテーマ・目の保護設定</span>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileThemeModalOpen(false)}
                className="p-1.5 rounded-full text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 bg-stone-100 dark:bg-stone-800 cursor-pointer"
                title="閉じる"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 overflow-y-auto pr-0.5 flex-1 min-h-0">
              {THEME_PRESETS.map((p) => {
                const isActive = theme === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      changeTheme(p.id);
                      showToast(`テーマを「${p.name}」に変更しました`, 'info');
                      setIsMobileThemeModalOpen(false);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl border flex items-start space-x-3 transition-colors cursor-pointer active:scale-[0.98] ${
                      isActive
                        ? isLight
                          ? 'bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-400/50'
                          : 'bg-[#1c2c22] border-emerald-500 ring-2 ring-emerald-500/50'
                        : isLight
                        ? 'bg-stone-50/70 hover:bg-stone-100 border-stone-200/80'
                        : 'bg-[#18231c]/70 hover:bg-[#202f26] border-[#25362b]'
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-lg border shrink-0 flex items-center justify-center relative overflow-hidden mt-0.5"
                      style={{
                        backgroundColor: p.previewBg,
                        borderColor: p.previewBorder,
                      }}
                    >
                      <div
                        className="w-4 h-4 rounded-sm border"
                        style={{
                          backgroundColor: p.previewCard,
                          borderColor: p.previewAccent,
                        }}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold truncate">{p.name}</span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded border font-semibold ${p.badgeClass}`}>
                          {p.badge}
                        </span>
                      </div>
                      <p className="text-[10.5px] text-stone-500 dark:text-stone-400 leading-snug mt-0.5">
                        {p.description}
                      </p>
                    </div>

                    {isActive && (
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-1" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Test Preview Modal */}
      {isTestModalOpen && (
        <TestPreviewModal
          isOpen={isTestModalOpen}
          onClose={() => setIsTestModalOpen(false)}
          project={project}
          setProject={setProject}
          onSelectGlyphForEdit={(unicode) => {
            const g = project.glyphs?.[unicode];
            const char = g?.char || String.fromCodePoint(unicode);
            onSelectGlyph(unicode, char);
            setIsTestModalOpen(false);
          }}
          theme={theme}
          onShowToast={showToast}
          onOpenMojikumiStudio={() => {
            setIsTestModalOpen(false);
            setIsMojikumiStudioOpen(true);
          }}
        />
      )}

      {/* Font Info Modal */}
      {isFontInfoModalOpen && (
        <FontInfoModal
          isOpen={isFontInfoModalOpen}
          onClose={() => setIsFontInfoModalOpen(false)}
          project={project}
          setProject={setProject}
          theme={theme}
          onShowToast={showToast}
        />
      )}

      {/* Trace Settings Modal */}
      {isTraceModalOpen && (
        <TraceSettingsModal
          isOpen={isTraceModalOpen}
          onClose={() => setIsTraceModalOpen(false)}
          traceSettings={traceSettings}
          setTraceSettings={setTraceSettings}
          activeChar={selectedChar}
          selectedUnicode={selectedUnicode}
          theme={theme}
          onShowToast={showToast}
        />
      )}

      {/* SVG Vectorizer Modal */}
      {isSvgModalOpen && (
        <SvgVectorizerModal
          isOpen={isSvgModalOpen}
          onClose={() => setIsSvgModalOpen(false)}
          onApplyContours={onApplySvgContours}
          selectedChar={selectedChar}
          theme={theme}
          onShowToast={showToast}
        />
      )}

      {/* Batch Normalize Modal */}
      {isBatchNormalizeModalOpen && (
        <BatchNormalizeModal
          isOpen={isBatchNormalizeModalOpen}
          onClose={() => setIsBatchNormalizeModalOpen(false)}
          project={project}
          setProject={setProject}
          selectedUnicode={selectedUnicode}
          theme={theme}
          onShowToast={showToast}
        />
      )}

      {/* Font Quality Modal */}
      {isQualityModalOpen && (
        <FontQualityModal
          isOpen={isQualityModalOpen}
          onClose={() => setIsQualityModalOpen(false)}
          project={project}
          setProject={setProject}
          onSelectGlyph={(unicode) => {
            const g = project.glyphs?.[unicode];
            const char = g?.char || String.fromCodePoint(unicode);
            onSelectGlyph(unicode, char);
          }}
          theme={theme}
          onShowToast={showToast}
          commitHistory={commitHistory}
        />
      )}

      {/* Glyph Synthesis Modal */}
      {isSynthesisModalOpen && (
        <GlyphSynthesisModal
          isOpen={isSynthesisModalOpen}
          onClose={() => setIsSynthesisModalOpen(false)}
          project={project}
          setProject={setProject}
          onUpdateProject={setProject}
          theme={theme}
          onShowToast={showToast}
          showToast={showToast}
        />
      )}

      {/* Kerning Modal */}
      {isKerningModalOpen && (
        <KerningModal
          isOpen={isKerningModalOpen}
          onClose={() => setIsKerningModalOpen(false)}
          project={project}
          setProject={setProject}
          onUpdateProject={setProject}
          theme={theme}
          onShowToast={showToast}
          showToast={showToast}
        />
      )}

      {/* Weight Interpolation Modal */}
      {isWeightInterpModalOpen && (
        <WeightInterpolationModal
          isOpen={isWeightInterpModalOpen}
          onClose={() => setIsWeightInterpModalOpen(false)}
          project={project}
          setProject={setProject}
          selectedUnicode={selectedUnicode}
          theme={theme}
          onShowToast={showToast}
        />
      )}

      {/* Glyph Compare Modal */}
      {isGlyphCompareModalOpen && (
        <GlyphCompareModal
          isOpen={isGlyphCompareModalOpen}
          onClose={() => setIsGlyphCompareModalOpen(false)}
          project={project}
          activeChar={selectedChar}
          activeUnicode={selectedUnicode}
          overlaySettings={overlaySettings}
          onChangeOverlaySettings={setOverlaySettings}
          theme={theme}
          onShowToast={showToast}
        />
      )}

      {/* Radical Studio Modal */}
      {isRadicalStudioOpen && (
        <RadicalStudioModal
          isOpen={isRadicalStudioOpen}
          onClose={() => setIsRadicalStudioOpen(false)}
          project={project}
          selectedChar={selectedChar}
          selectedUnicode={selectedUnicode}
          onInsertToCurrentGlyph={onInsertRadical}
          onBatchInsertToGlyphs={onBatchInsertRadical}
          theme={theme}
          onShowToast={showToast}
        />
      )}

      {/* Pen Presets Modal */}
      {isPenPresetsModalOpen && (
        <PenPresetsModal
          isOpen={isPenPresetsModalOpen}
          onClose={() => setIsPenPresetsModalOpen(false)}
          currentParams={{
            brushStyle,
            brushWidth,
            pressureSensitivity,
            pressureCurve,
            smoothingIntensity,
            autoSmoothBrush,
            smoothStrength,
            smoothPreserveCorners,
            autoUnionBrush,
            taperStartLength: activePenPreset?.taperStartLength,
            taperEndLength: activePenPreset?.taperEndLength,
            taperStartWidth: activePenPreset?.taperStartWidth,
            taperEndWidth: activePenPreset?.taperEndWidth,
            taperStartOpacity: activePenPreset?.taperStartOpacity,
            taperEndOpacity: activePenPreset?.taperEndOpacity,
            taperStartTime: activePenPreset?.taperStartTime,
            taperEndTime: activePenPreset?.taperEndTime,
            forceTaper: activePenPreset?.forceTaper,
            forceTaperEnd: activePenPreset?.forceTaperEnd,
            taperTipShape: activePenPreset?.taperTipShape,
            nibAngle: activePenPreset?.nibAngle,
            nibAspectRatio: activePenPreset?.nibAspectRatio,
            nibFollowDirection: activePenPreset?.nibFollowDirection,
            nibSpacing: activePenPreset?.nibSpacing,
            constantWidth: activePenPreset?.constantWidth,
            antiAlias: activePenPreset?.antiAlias,
            jitterPosition: activePenPreset?.jitterPosition,
            jitterConstrainPerp: activePenPreset?.jitterConstrainPerp,
            jitterSize: activePenPreset?.jitterSize,
            jitterOpacity: activePenPreset?.jitterOpacity,
            jitterAngle: activePenPreset?.jitterAngle,
            jitterSpacing: activePenPreset?.jitterSpacing,
            speedWidthFactor: activePenPreset?.speedWidthFactor,
            speedOpacityFactor: activePenPreset?.speedOpacityFactor,
            speedFeatherFactor: activePenPreset?.speedFeatherFactor,
            pressureWidthFactor: activePenPreset?.pressureWidthFactor,
            pressureOpacityFactor: activePenPreset?.pressureOpacityFactor,
            pressureFeatherFactor: activePenPreset?.pressureFeatherFactor,
            stabilizationMethod: activePenPreset?.stabilizationMethod,
            speedStabilization: activePenPreset?.speedStabilization,
            legacyStabilization: activePenPreset?.legacyStabilization,
          }}
          onApplyPreset={onApplyPenPreset}
          onChangePressureCurve={onChangePressureCurve}
          presets={penPresets}
          onUpdatePresets={setPenPresets}
          theme={theme}
        />
      )}

      {/* Shortcuts Help Modal */}
      {isShortcutsModalOpen && (
        <ShortcutsHelpModal
          isOpen={isShortcutsModalOpen}
          onClose={() => setIsShortcutsModalOpen(false)}
          theme={theme}
        />
      )}

      {/* Storage Manager Modal */}
      {isStorageManagerOpen && (
        <StorageManagerModal
          isOpen={isStorageManagerOpen}
          onClose={() => setIsStorageManagerOpen(false)}
          project={project}
          setProject={setProject}
          theme={theme}
          onShowToast={showToast}
        />
      )}

      {/* Export Modal */}
      {isExportModalOpen && (
        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          project={project}
          theme={theme}
          onShowToast={showToast}
          onOpenQualityModal={() => setIsQualityModalOpen(true)}
        />
      )}

      {/* OpenType Features Modal */}
      {isOpenTypeFeaturesModalOpen && (
        <OpenTypeFeaturesModal
          isOpen={isOpenTypeFeaturesModalOpen}
          onClose={() => setIsOpenTypeFeaturesModalOpen(false)}
          project={project}
          setProject={setProject}
          isLight={isLight}
          onShowToast={showToast}
        />
      )}

      {/* Grid Fitting Modal */}
      {isGridFittingModalOpen && (
        <GridFittingModal
          isOpen={isGridFittingModalOpen}
          onClose={() => setIsGridFittingModalOpen(false)}
          project={project}
          setProject={setProject}
          isLight={isLight}
          onShowToast={showToast}
        />
      )}

      {/* Pixel Font Studio Modal */}
      {isPixelStudioOpen && (
        <PixelFontStudioModal
          project={project}
          setProject={setProject}
          isOpen={isPixelStudioOpen}
          onClose={() => setIsPixelStudioOpen(false)}
          isLight={isLight}
          selectedUnicode={selectedUnicode}
          onSelectGlyph={(u) => onSelectGlyph(u)}
          onShowToast={showToast}
        />
      )}

      {/* Mojikumi Studio Modal */}
      {isMojikumiStudioOpen && (
        <MojikumiStudioModal
          isOpen={isMojikumiStudioOpen}
          onClose={() => setIsMojikumiStudioOpen(false)}
          project={project}
          setProject={setProject}
          theme={theme}
          onShowToast={showToast}
          onOpenOpenTypeModal={() => {
            setIsMojikumiStudioOpen(false);
            setIsOpenTypeFeaturesModalOpen(true);
          }}
          onOpenTestPreview={() => {
            setIsMojikumiStudioOpen(false);
            setIsTestModalOpen(true);
          }}
        />
      )}
    </Suspense>
  );
};
