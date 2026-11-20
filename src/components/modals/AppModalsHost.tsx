import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import {
  FontProject,
  PathContour,
  TraceSettings,
  UserPenPreset,
  GlyphOverlaySettings,
  BrushStyle,
  PressureCurveConfig,
  ThemeClasses,
} from '../../types';
import { ThemeMode, THEME_PRESETS } from '../../utils/theme';
import { useModalContext } from '../../contexts/ModalContext';
import { Palette, Check, X } from 'lucide-react';
// [group d] Lifted Test Preview / Mojikumi Studio editing state (3-A1).
// Imported from the small persistedState files (no compileFont dependency)
// so this host does not pull opentype.js into the startup bundle.
import {
  createDefaultTestPreviewPersistedState,
  type TestPreviewPersistedState,
} from '../testpreview/persistedState';
import {
  createDefaultMojikumiPersistedState,
  type MojikumiPersistedState,
} from '../mojikumi/persistedState';

const TestPreviewModal = lazy(() =>
  import('../testpreview').then((module) => ({ default: module.TestPreviewModal }))
);
const SvgVectorizerModal = lazy(() =>
  import('../SvgVectorizerModal').then((module) => ({ default: module.SvgVectorizerModal }))
);
const FontQualityModal = lazy(() =>
  import('../quality').then((module) => ({ default: module.FontQualityModal }))
);
const WeightInterpolationModal = lazy(() =>
  import('../WeightInterpolationModal').then((module) => ({ default: module.WeightInterpolationModal }))
);
const GlyphCompareModal = lazy(() =>
  import('../GlyphCompareModal').then((module) => ({ default: module.GlyphCompareModal }))
);
const PixelFontStudioModal = lazy(() =>
  import('../pixelfont').then((module) => ({ default: module.PixelFontStudioModal }))
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
  import('../penpresets').then((module) => ({ default: module.PenPresetsModal }))
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
const JisProgressDashboardModal = lazy(() =>
  import('../progress/JisProgressDashboardModal').then((module) => ({ default: module.JisProgressDashboardModal }))
);
const IvsVariantManagerModal = lazy(() =>
  import('../ivs/IvsVariantManagerModal').then((module) => ({ default: module.IvsVariantManagerModal }))
);

export interface AppModalsHostProps {
  project: FontProject;
  setProject: React.Dispatch<React.SetStateAction<FontProject>>;
  onProjectReplaced?: () => void;
  selectedChar: string;
  selectedUnicode: number;
  onSelectGlyph: (unicode: number, char?: string) => void;
  theme: ThemeMode;
  themeClasses: ThemeClasses;
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
  onClearActivePenPreset?: () => void;
  onResetCanvasPrefs?: () => void;
  // Passed through to ExportModal. Optional: when omitted, ExportModal hides
  // its new-project button. AppModalsHost does not define a handler itself;
  // the caller (App) must supply the existing new-project handler.
  onRequestNewProject?: () => void;
}

export const AppModalsHost: React.FC<AppModalsHostProps> = ({
  project,
  setProject,
  onProjectReplaced,
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
  onClearActivePenPreset,
  onResetCanvasPrefs,
  onRequestNewProject,
}) => {
  const { activeModal, openModal, closeModal } = useModalContext();

  // Export modal settings kept here so they survive closing and reopening
  // the modal (ExportModal unmounts when activeModal changes).
  const [exportFormat, setExportFormat] = useState<'otf'>('otf');
  const [exportSizePreset, setExportSizePreset] = useState<'raw' | 'standard_jp' | 'custom'>('raw');
  const [exportCustomScale, setExportCustomScale] = useState<number>(1.0);
  const [exportPreviewText, setExportPreviewText] = useState<string>('あいう 色は匂へど 漢字 123 ABC');
  const [exportPreviewFontSize, setExportPreviewFontSize] = useState<number>(28);
  // 2-A2: overlap merging and side-bearing balancing live here too, using
  // the same pattern as the five settings above. The initial values follow
  // the project at mount time (off for pixel projects, on otherwise);
  // after that the user's choice persists across reopening the modal.
  const [exportMergeOverlaps, setExportMergeOverlaps] = useState<boolean>(
    () => !project.pixelFontSettings?.isPixelFontProject
  );
  const [exportBalanceSideBearings, setExportBalanceSideBearings] = useState<boolean>(
    () => !project.pixelFontSettings?.isPixelFontProject
  );

  // [group d] Test Preview / Mojikumi Studio editing state kept here so it
  // survives switching between the two modals (each modal unmounts when
  // activeModal changes, which previously reset its useState to defaults).
  const [testPreviewPersisted, setTestPreviewPersisted] = useState<TestPreviewPersistedState>(
    () => createDefaultTestPreviewPersistedState()
  );
  const [mojikumiPersisted, setMojikumiPersisted] = useState<MojikumiPersistedState>(() =>
    createDefaultMojikumiPersistedState(project)
  );

  // [group d] A different project starts from defaults again.
  const prevProjectIdRef = useRef(project.id);
  useEffect(() => {
    if (prevProjectIdRef.current !== project.id) {
      prevProjectIdRef.current = project.id;
      setTestPreviewPersisted(createDefaultTestPreviewPersistedState());
      setMojikumiPersisted(createDefaultMojikumiPersistedState(project));
      // Export settings also restart from the new project's defaults:
      // pixel projects export raw (1.0x, no centering, no overlap merge),
      // other projects use the standard defaults.
      const isPixel = Boolean(project.pixelFontSettings?.isPixelFontProject);
      setExportSizePreset('raw');
      setExportCustomScale(1.0);
      setExportMergeOverlaps(!isPixel);
      setExportBalanceSideBearings(!isPixel);
    }
  }, [project]);

  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60" role="status" aria-label="読み込み中">
          <div className={`relative flex items-center gap-3 px-4 py-3 rounded-xl border ${themeClasses.modalBg} ${themeClasses.border}`}>
            <div
              className="w-5 h-5 border-2 rounded-full animate-spin"
              style={{ borderColor: themeClasses.accentHex, borderTopColor: 'transparent' }}
            />
            <span className="text-xs font-medium">読み込み中...</span>
            <button
              type="button"
              onClick={closeModal}
              className={`p-1 rounded-lg cursor-pointer transition-colors ${themeClasses.textMuted} ${themeClasses.activeToolHover}`}
              title="読み込みを中止して閉じる"
              aria-label="閉じる"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      }
    >
      {/* Mobile Theme Selection Drawer */}
      {activeModal === 'mobileTheme' && (
        <div className="sm:hidden fixed inset-0 z-[60] flex flex-col justify-end">
          <div
            className="fixed inset-0 bg-black/60 anim-fade"
            onClick={closeModal}
          />
          <div
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className={`relative z-10 w-full rounded-t-2xl p-4 border-t shadow-2xl max-h-[85dvh] flex flex-col anim-slide-up pb-[calc(1rem+env(safe-area-inset-bottom,0px))] ${themeClasses.modalBg} ${themeClasses.border}`}
          >
            <div className={`flex items-center justify-between pb-2.5 border-b mb-3 shrink-0 ${themeClasses.border}`}>
              <div className="flex items-center space-x-2">
                <Palette className="w-5 h-5 text-amber-500" />
                <span className="font-extrabold text-sm">カラーテーマ設定</span>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className={`p-1.5 rounded-lg cursor-pointer transition-colors ${themeClasses.textMuted} ${themeClasses.activeToolHover}`}
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
                      closeModal();
                    }}
                    className={`w-full text-left p-2.5 rounded-xl border flex items-start space-x-3 transition-colors cursor-pointer ${
                      isActive
                        ? `${themeClasses.activeTool} border-transparent`
                        : `${themeClasses.cardBg} ${themeClasses.activeToolHover}`
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
                        <span className={`text-[11px] px-1.5 py-0.5 rounded border font-semibold ${p.badgeClass}`}>
                          {p.badge}
                        </span>
                      </div>
                      <p className={`text-xs leading-snug mt-0.5 ${isActive ? 'opacity-85' : themeClasses.textMuted}`}>
                        {p.description}
                      </p>
                    </div>

                    {isActive && (
                      <Check className="w-4 h-4 shrink-0 mt-1" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Test Preview Modal */}
      {activeModal === 'test' && (
        <TestPreviewModal
          isOpen
          onClose={closeModal}
          project={project}
          setProject={setProject}
          onSelectGlyphForEdit={(unicode) => {
            const g = project.glyphs?.[unicode];
            const char = g?.char || String.fromCodePoint(unicode);
            onSelectGlyph(unicode, char);
            closeModal();
          }}
          theme={theme}
          onShowToast={showToast}
          onOpenMojikumiStudio={() => openModal('mojikumi')}
          persistedState={testPreviewPersisted}
          onPersistedStateChange={setTestPreviewPersisted}
        />
      )}

      {/* Font Info Modal */}
      {activeModal === 'fontInfo' && (
        <FontInfoModal
          isOpen
          onClose={closeModal}
          project={project}
          setProject={setProject}
          theme={theme}
          onShowToast={showToast}
        />
      )}

      {/* Trace Settings Modal */}
      {activeModal === 'trace' && (
        <TraceSettingsModal
          isOpen
          onClose={closeModal}
          traceSettings={traceSettings}
          setTraceSettings={setTraceSettings}
          activeChar={selectedChar}
          selectedUnicode={selectedUnicode}
          theme={theme}
          onShowToast={showToast}
        />
      )}

      {/* SVG Vectorizer Modal */}
      {activeModal === 'svg' && (
        <SvgVectorizerModal
          isOpen
          onClose={closeModal}
          onApplyContours={onApplySvgContours}
          selectedChar={selectedChar}
          theme={theme}
          onShowToast={showToast}
        />
      )}

      {/* Batch Normalize Modal */}
      {activeModal === 'batchNormalize' && (
        <BatchNormalizeModal
          isOpen
          onClose={closeModal}
          project={project}
          setProject={setProject}
          selectedUnicode={selectedUnicode}
          theme={theme}
          onShowToast={showToast}
        />
      )}

      {/* Font Quality Modal */}
      {activeModal === 'quality' && (
        <FontQualityModal
          isOpen
          onClose={closeModal}
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
      {activeModal === 'synthesis' && (
        <GlyphSynthesisModal
          isOpen
          onClose={closeModal}
          project={project}
          setProject={setProject}
          onUpdateProject={setProject}
          commitHistory={commitHistory}
          theme={theme}
          onShowToast={showToast}
          showToast={showToast}
        />
      )}

      {/* Kerning Modal */}
      {activeModal === 'kerning' && (
        <KerningModal
          isOpen
          onClose={closeModal}
          project={project}
          setProject={setProject}
          onUpdateProject={setProject}
          theme={theme}
          onShowToast={showToast}
          showToast={showToast}
        />
      )}

      {/* Weight Interpolation Modal */}
      {activeModal === 'weightInterp' && (
        <WeightInterpolationModal
          isOpen
          onClose={closeModal}
          project={project}
          setProject={setProject}
          selectedUnicode={selectedUnicode}
          theme={theme}
          onShowToast={showToast}
        />
      )}

      {/* Glyph Compare Modal */}
      {activeModal === 'glyphCompare' && (
        <GlyphCompareModal
          isOpen
          onClose={closeModal}
          project={project}
          activeChar={selectedChar}
          activeUnicode={selectedUnicode}
          overlaySettings={overlaySettings}
          onChangeOverlaySettings={setOverlaySettings}
          theme={theme}
          onShowToast={showToast}
        />
      )}

      {/* Pen Presets Modal */}
      {activeModal === 'penPresets' && (
        <PenPresetsModal
          isOpen
          onClose={closeModal}
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
            inkBleed: activePenPreset?.inkBleed,
            axisSlant: activePenPreset?.axisSlant,
            edgeRoughness: activePenPreset?.edgeRoughness,
            tipSharpness: activePenPreset?.tipSharpness,
            pressureGamma: activePenPreset?.pressureGamma,
          }}
          onApplyPreset={onApplyPenPreset}
          onChangePressureCurve={onChangePressureCurve}
          presets={penPresets}
          onUpdatePresets={setPenPresets}
          activePenPreset={activePenPreset}
          onClearActivePenPreset={onClearActivePenPreset}
          onResetCanvasPrefs={onResetCanvasPrefs}
          theme={theme}
        />
      )}

      {/* Shortcuts Help Modal */}
      {activeModal === 'shortcuts' && (
        <ShortcutsHelpModal
          isOpen
          onClose={closeModal}
          theme={theme}
        />
      )}

      {/* Storage Manager Modal */}
      {activeModal === 'storageManager' && (
        <StorageManagerModal
          isOpen
          onClose={closeModal}
          project={project}
          setProject={setProject}
          onProjectReplaced={onProjectReplaced}
          theme={theme}
          onShowToast={showToast}
        />
      )}

      {/* Export Modal */}
      {activeModal === 'export' && (
        <ExportModal
          isOpen
          onClose={closeModal}
          project={project}
          theme={theme}
          onShowToast={showToast}
          onRequestNewProject={onRequestNewProject}
          onOpenQualityModal={() => openModal('quality')}
          format={exportFormat}
          onFormatChange={setExportFormat}
          sizePreset={exportSizePreset}
          onSizePresetChange={setExportSizePreset}
          customScale={exportCustomScale}
          onCustomScaleChange={setExportCustomScale}
          previewText={exportPreviewText}
          onPreviewTextChange={setExportPreviewText}
          previewFontSize={exportPreviewFontSize}
          onPreviewFontSizeChange={setExportPreviewFontSize}
          mergeOverlaps={exportMergeOverlaps}
          onMergeOverlapsChange={setExportMergeOverlaps}
          balanceSideBearings={exportBalanceSideBearings}
          onBalanceSideBearingsChange={setExportBalanceSideBearings}
        />
      )}

      {/* OpenType Features Modal */}
      {activeModal === 'openTypeFeatures' && (
        <OpenTypeFeaturesModal
          isOpen
          onClose={closeModal}
          project={project}
          setProject={setProject}
          isLight={isLight}
          theme={theme}
          onShowToast={showToast}
        />
      )}

      {/* Grid Fitting Modal */}
      {activeModal === 'gridFitting' && (
        <GridFittingModal
          isOpen
          onClose={closeModal}
          project={project}
          setProject={setProject}
          isLight={isLight}
          theme={theme}
          onShowToast={showToast}
        />
      )}

      {/* Pixel Font Studio Modal */}
      {activeModal === 'pixelStudio' && (
        <PixelFontStudioModal
          project={project}
          setProject={setProject}
          isOpen
          onClose={closeModal}
          isLight={isLight}
          theme={theme}
          selectedUnicode={selectedUnicode}
          onSelectGlyph={(u) => onSelectGlyph(u)}
          onShowToast={showToast}
        />
      )}

      {/* Mojikumi Studio Modal */}
      {activeModal === 'mojikumi' && (
        <MojikumiStudioModal
          isOpen
          onClose={closeModal}
          project={project}
          setProject={setProject}
          theme={theme}
          onShowToast={showToast}
          onOpenOpenTypeModal={() => openModal('openTypeFeatures')}
          onOpenTestPreview={() => openModal('test')}
          persistedState={mojikumiPersisted}
          onPersistedStateChange={setMojikumiPersisted}
        />
      )}

      {/* JIS Progress Dashboard Modal */}
      {activeModal === 'jisProgress' && (
        <JisProgressDashboardModal
          isOpen
          onClose={closeModal}
          project={project}
          theme={theme}
          onSelectGlyph={(u) => onSelectGlyph(u)}
          onShowToast={showToast}
        />
      )}

      {/* IVS Variant Manager Modal */}
      {activeModal === 'ivsManager' && (
        <IvsVariantManagerModal
          isOpen
          onClose={closeModal}
          selectedUnicode={selectedUnicode}
          selectedChar={selectedChar}
          glyphs={project.glyphs || {}}
          onSelectGlyph={(u) => onSelectGlyph(u)}
          onShowToast={showToast}
          theme={theme}
        />
      )}
    </Suspense>
  );
};
