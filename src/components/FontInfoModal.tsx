import React, { useCallback, useRef, useState } from 'react';
import {
  X,
  Settings,
  Check,
  Download,
  Layers,
  ShieldCheck,
  Scale,
  HelpCircle,
  Sparkles,
  Info,
  ExternalLink,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { FontMetadata, FontProject, GlyphData } from '../types';
import { DEFAULT_ASCENDER } from '../utils/font/constants';
import { inferWeightClassFromStyleName } from '../utils/font';
import { ThemeMode, isLightTheme, getThemeClasses } from '../utils/theme';
import { exportProjectJsonFile } from '../utils/storageManager';
import { BundledFontsModal } from './BundledFontsModal';
import { LicensePresetSection, LICENSE_PRESETS } from './fontinfo/LicensePresetSection';
import { MetricsSettingsSection } from './fontinfo/MetricsSettingsSection';
import { OpenTypeMetricsSection } from './fontinfo/OpenTypeMetricsSection';
import { JsonBackupSection } from './fontinfo/JsonBackupSection';
import { useIsTopModal } from './modals/ModalStackFrame';
import { ModalFooter } from './modals/ModalFooter';

interface FontInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: FontProject;
  setProject: React.Dispatch<React.SetStateAction<FontProject>>;
  theme: ThemeMode;
  onShowToast?: (text: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  /** Commit history for one glyph (target unicode) before UPM scaling. */
  commitHistory?: (targetUnicode?: number) => void;
  /** Commit project-level config history before metadata changes. */
  commitProjectHistory?: () => void;
}

type ModalTab = 'info' | 'license' | 'opentype' | 'guide';

/** The form's starting metadata: stored defaults with an inferred weight class. */
function toFormMetadata(meta: FontMetadata): FontMetadata {
  return {
    license: meta.license || 'SIL Open Font License 1.1',
    licenseUrl: meta.licenseUrl || 'https://openfontlicense.org/',
    usWeightClass: meta.usWeightClass ?? inferWeightClassFromStyleName(meta.styleName),
    ...meta,
  };
}

const STYLE_PRESET_CHIPS: { styleName: string; usWeightClass: number }[] = [
  { styleName: 'Thin', usWeightClass: 100 },
  { styleName: 'ExtraLight', usWeightClass: 200 },
  { styleName: 'Light', usWeightClass: 300 },
  { styleName: 'Regular', usWeightClass: 400 },
  { styleName: 'Medium', usWeightClass: 500 },
  { styleName: 'SemiBold', usWeightClass: 600 },
  { styleName: 'Bold', usWeightClass: 700 },
  { styleName: 'ExtraBold', usWeightClass: 800 },
  { styleName: 'Heavy', usWeightClass: 900 },
];

export const FontInfoModal: React.FC<FontInfoModalProps> = ({
  isOpen,
  onClose,
  project,
  setProject,
  theme,
  onShowToast,
  commitHistory,
  commitProjectHistory,
}) => {
  const [activeTab, setActiveTab] = useState<ModalTab>('info');
  const [formData, setFormData] = useState<FontMetadata>(() => toFormMetadata(project.metadata));

  // Sync formData only when modal opens (false -> true) so unsaved edits are preserved
  const prevIsOpenRef = React.useRef(false);
  const metadataRef = React.useRef(project.metadata);
  metadataRef.current = project.metadata;
  // M2: last saved metadata, for the unsaved-changes check on close.
  // Stored in the same normalized form as formData, so the initial state
  // (e.g. an inferred usWeightClass) does not count as an edit.
  const savedMetadataRef = useRef<FontMetadata>(toFormMetadata(project.metadata));
  const formDataRef = useRef<FontMetadata>(formData);
  formDataRef.current = formData;
  const isFormDirty = useCallback(
    () => JSON.stringify(formDataRef.current) !== JSON.stringify(savedMetadataRef.current),
    []
  );
  const handleRequestClose = useCallback(() => {
    if (
      isFormDirty() &&
      !window.confirm('保存されていない変更があります。閉じると変更は破棄されます。閉じますか？')
    ) {
      return;
    }
    onClose();
  }, [isFormDirty, onClose]);
  React.useEffect(() => {
    const justOpened = isOpen && !prevIsOpenRef.current;
    prevIsOpenRef.current = isOpen;
    if (justOpened) {
      const meta = metadataRef.current;
      const normalized = toFormMetadata(meta);
      savedMetadataRef.current = normalized;
      setFormData(normalized);
    }
  }, [isOpen]);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isBundledFontsModalOpen, setIsBundledFontsModalOpen] = useState(false);
  const [scaleGlyphsOnResize, setScaleGlyphsOnResize] = useState<boolean>(true);
  const isLight = isLightTheme(theme);
  const themeClasses = getThemeClasses(theme);

  const isTopModal = useIsTopModal();

  // Keyboard shortcut listener: Escape and F
  React.useEffect(() => {
    if (!isOpen || !isTopModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isBundledFontsModalOpen) return;
      const activeTag = document.activeElement?.tagName.toLowerCase();
      const isInput = activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select';
      if (e.key === 'Escape') {
        e.preventDefault();
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          handleRequestClose();
        }
      } else if ((e.key === 'f' || e.key === 'F') && !isInput && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setIsFullscreen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isTopModal, isFullscreen, isBundledFontsModalOpen, handleRequestClose]);

  if (!isOpen) return null;

  const glyphCount = Object.keys(project.glyphs || {}).length;
  const radicalCount = Object.keys((project as any).radicals || {}).length;

  const handleApplyPreset = (presetId: string) => {
    const p = LICENSE_PRESETS.find((x) => x.id === presetId);
    if (!p) return;

    const currentYear = new Date().getFullYear();
    const designerName = formData.designer || 'Author';

    setFormData((prev) => ({
      ...prev,
      license: p.license || prev.license,
      licenseUrl: p.licenseUrl || prev.licenseUrl,
      copyright:
        prev.copyright || `Copyright (c) ${currentYear} by ${designerName}. All rights reserved.`,
    }));

    if (onShowToast) {
      onShowToast(`ライセンス「${p.name}」の設定を適用しました`, 'success');
    }
  };

  const handleDownloadJsonBackup = () => {
    try {
      const exportProject: FontProject = {
        ...project,
        metadata: {
          ...project.metadata,
          ...formData,
        },
        updatedAt: Date.now(),
      };

      const res = exportProjectJsonFile(exportProject);

      if (res.success) {
        setIsDownloaded(true);
        setTimeout(() => setIsDownloaded(false), 3000);

        if (onShowToast) {
          onShowToast(`バックアップ『${res.filename}』を保存しました`, 'success');
        }
      } else if (onShowToast) {
        onShowToast('JSONバックアップの出力に失敗しました', 'error');
      }
    } catch (err) {
      console.error('Failed to export project JSON:', err);
      if (onShowToast) {
        onShowToast('JSONバックアップの出力に失敗しました', 'error');
      }
    }
  };

  const handleUpmChange = (newUpmVal: number) => {
    const oldVal = formData.unitsPerEm || 1000;
    const ratio = newUpmVal > 0 && oldVal > 0 ? newUpmVal / oldVal : 1;
    setFormData((prev) => ({
      ...prev,
      unitsPerEm: newUpmVal,
      ascender: Math.round((prev.ascender ?? DEFAULT_ASCENDER) * ratio),
      descender: Math.round((prev.descender ?? -200) * ratio),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const oldUpm = project.metadata.unitsPerEm || 1000;
    const newUpm = formData.unitsPerEm || 1000;
    const shouldScale = scaleGlyphsOnResize && oldUpm !== newUpm && oldUpm > 0 && newUpm > 0;
    const scale = shouldScale ? newUpm / oldUpm : 1;

    // Metadata changes are undoable via the project-level history.
    // When UPM scaling rewrites every glyph's coordinates, register
    // history for every glyph first so each one can be undone.
    commitProjectHistory?.();
    if (shouldScale) {
      for (const key of Object.keys(project.glyphs || {})) {
        commitHistory?.(Number(key));
      }
    }

    setProject((prev) => {
      const updatedGlyphs: Record<number, any> = {};

      for (const [key, rawG] of Object.entries(prev.glyphs || {})) {
        const unicode = Number(key);
        const g = rawG as GlyphData;
        if (!g) continue;

        if (shouldScale) {
          updatedGlyphs[unicode] = {
            ...g,
            advanceWidth: Math.round((g.advanceWidth || oldUpm) * scale),
            lsb: g.lsb !== undefined ? Math.round(g.lsb * scale) : undefined,
            contours: (g.contours || []).map((c: any) => ({
              ...c,
              nodes: (c.nodes || []).map((n: any) => ({
                ...n,
                x: Math.round(n.x * scale),
                y: Math.round(n.y * scale),
                handleIn: n.handleIn
                  ? { x: Math.round(n.handleIn.x * scale), y: Math.round(n.handleIn.y * scale) }
                  : null,
                handleOut: n.handleOut
                  ? { x: Math.round(n.handleOut.x * scale), y: Math.round(n.handleOut.y * scale) }
                  : null,
              })),
            })),
          };
        } else {
          updatedGlyphs[unicode] = g;
        }
      }

      return {
        ...prev,
        metadata: {
          ...formData,
        },
        glyphs: updatedGlyphs,
        updatedAt: Date.now(),
      };
    });

    if (onShowToast) {
      if (shouldScale) {
        onShowToast(`UPM（キャンバスサイズ ${newUpm}）を保存し、既存輪郭を比率に合わせて自動拡大縮小しました`, 'success');
      } else if (oldUpm !== newUpm) {
        onShowToast(`UPM（キャンバスサイズ ${newUpm}）を変更しました（既存輪郭の座標は維持）`, 'success');
      } else {
        onShowToast('フォント情報を保存しました', 'success');
      }
    }
    savedMetadataRef.current = formData;
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="フォント情報・ライセンス"
      className={`fixed inset-0 z-[60] ${
        isFullscreen
          ? 'p-0 w-screen h-[100dvh] bg-black/85 flex flex-col'
          : 'flex flex-col sm:items-center sm:justify-center p-0 sm:p-4 bg-black/75 select-none anim-fade'
      }`}
    >
      <div
        className={`flex flex-col overflow-hidden ${themeClasses.modalBg} ${themeClasses.textPrimary} ${
          isFullscreen
            ? 'w-screen h-[100dvh] rounded-none border-none shadow-none'
            : `w-full h-[100dvh] sm:h-auto sm:max-w-3xl border-0 sm:border ${themeClasses.border} rounded-none sm:rounded-2xl shadow-none sm:shadow-2xl sm:max-h-[92vh]`
        }`}
      >
        {/* Header */}
        <div
          className={`px-3.5 py-2.5 pt-[calc(0.625rem+env(safe-area-inset-top,0px))] sm:px-4 sm:py-3 border-b flex items-center justify-between shrink-0 ${themeClasses.headerBg} ${themeClasses.border}`}
        >
          <div className="flex items-center space-x-2 min-w-0 flex-1 pr-2">
            <div className={`hidden sm:flex w-8 h-8 rounded-xl border items-center justify-center shrink-0 ${themeClasses.accentBadge}`}>
              <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <h2 className="text-sm sm:text-base font-bold flex items-center gap-2 min-w-0">
              <span className="truncate">フォント情報・ライセンス</span>
              {isFullscreen && (
                <span className={`text-[11px] px-2 py-0.5 rounded-md font-medium shrink-0 ${themeClasses.accentBtn}`}>
                  全画面
                </span>
              )}
            </h2>
          </div>
          <div className="flex items-center space-x-1.5">
            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className={`hidden sm:flex p-1 px-2 rounded-lg border text-xs font-semibold items-center space-x-1 transition-colors cursor-pointer ${
                isFullscreen
                  ? themeClasses.activeTool
                  : `${themeClasses.cardBg} ${themeClasses.activeToolHover}`
              }`}
              title={isFullscreen ? '通常表示に戻す (F または Esc)' : '全画面表示に拡大 (F)'}
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
              onClick={handleRequestClose}
              aria-label="閉じる"
              className={`p-1 max-sm:min-w-[40px] max-sm:min-h-[40px] max-sm:flex max-sm:items-center max-sm:justify-center rounded-lg border transition-colors cursor-pointer ${themeClasses.cardBg} ${themeClasses.textMuted} ${themeClasses.activeToolHover}`}
              title="閉じる (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div
          className={`flex border-b text-xs font-semibold overflow-x-auto no-scrollbar shrink-0 p-1.5 sm:p-2 gap-1 sm:gap-1.5 ${themeClasses.subtoolbarBg} ${themeClasses.border}`}
        >
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`shrink-0 px-3 py-2 sm:py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer select-none text-[11px] sm:text-xs ${
              activeTab === 'info'
                ? themeClasses.activeTool
                : `${themeClasses.textMuted} ${themeClasses.activeToolHover}`
            }`}
          >
            <Settings className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">基本・情報</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('license')}
            className={`shrink-0 px-3 py-2 sm:py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer select-none text-[11px] sm:text-xs ${
              activeTab === 'license'
                ? themeClasses.activeTool
                : `${themeClasses.textMuted} ${themeClasses.activeToolHover}`
            }`}
          >
            <Scale className={`w-3.5 h-3.5 shrink-0 ${themeClasses.accentText}`} />
            <span className="truncate">ライセンス</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('opentype')}
            className={`shrink-0 px-3 py-2 sm:py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer select-none text-[11px] sm:text-xs ${
              activeTab === 'opentype'
                ? themeClasses.activeTool
                : `${themeClasses.textMuted} ${themeClasses.activeToolHover}`
            }`}
          >
            <Layers className={`w-3.5 h-3.5 shrink-0 ${themeClasses.accentText}`} />
            <span className="truncate">OpenType</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={`shrink-0 px-3 py-2 sm:py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer select-none text-[11px] sm:text-xs ${
              activeTab === 'guide'
                ? themeClasses.activeTool
                : `${themeClasses.textMuted} ${themeClasses.activeToolHover}`
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">権利ガイド</span>
          </button>
        </div>

        {/* Form */}
        <form id="font-info-form" onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3.5 sm:p-4 space-y-3 text-xs no-scrollbar">
          {/* TAB 1: BASIC INFO & METRICS */}
          {activeTab === 'info' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start anim-fade">
              {/* Left column: Basic identity + Backup */}
              <div className="lg:col-span-6 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col space-y-1">
                    <label className="font-bold text-[11px] sm:text-xs flex items-center justify-between">
                      <span>フォント名 (Family Name)</span>
                      <span className={`text-[10px] font-normal ${themeClasses.accentText}`}>必須</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.familyName || ''}
                      onChange={(e) => setFormData({ ...formData, familyName: e.target.value })}
                      placeholder="例: MyCustomFont"
                      className={`w-full border rounded-lg px-3 py-2 sm:py-1.5 text-sm sm:text-xs transition-colors focus:outline-none focus:ring-1 focus:ring-emerald-500/40 ${themeClasses.cardBg}`}
                    />
                  </div>

                  <div className="flex flex-col space-y-1">
                    <label className="font-bold text-[11px] sm:text-xs flex items-center justify-between">
                      <span>
                        スタイル名 (Subfamily){' '}
                        <span className={`text-[10px] font-normal ${themeClasses.accentText}`}>必須</span>
                      </span>
                      <span className={`text-[10px] font-mono tabular-nums ${themeClasses.textMuted}`}>
                        Weight: {formData.usWeightClass ?? inferWeightClassFromStyleName(formData.styleName)}
                      </span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.styleName || ''}
                      onChange={(e) => {
                        setFormData({ ...formData, styleName: e.target.value });
                      }}
                      placeholder="Regular, Bold, Medium など"
                      className={`w-full border rounded-lg px-3 py-2 sm:py-1.5 text-sm sm:text-xs transition-colors focus:outline-none focus:ring-1 focus:ring-emerald-500/40 ${themeClasses.cardBg}`}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-1">
                  {STYLE_PRESET_CHIPS.map((preset) => {
                    const isActive = (formData.styleName || '').trim().toLowerCase() === preset.styleName.toLowerCase();
                    return (
                      <button
                        key={preset.styleName}
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            styleName: preset.styleName,
                            usWeightClass: preset.usWeightClass,
                          })
                        }
                        className={`px-1.5 py-0.5 rounded border text-[10px] font-medium transition-colors cursor-pointer ${
                          isActive
                            ? themeClasses.activeTool
                            : `${themeClasses.subtoolbarBg} ${themeClasses.border} ${themeClasses.textMuted} ${themeClasses.activeToolHover}`
                        }`}
                      >
                        {preset.styleName}
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col space-y-1">
                    <label className="font-bold text-[11px] sm:text-xs">
                      作者・制作者名 (Designer)
                    </label>
                    <input
                      type="text"
                      value={formData.designer || ''}
                      onChange={(e) => setFormData({ ...formData, designer: e.target.value })}
                      placeholder="あなたのペンネーム / 組織名"
                      className={`w-full border rounded-lg px-3 py-2 sm:py-1.5 text-sm sm:text-xs transition-colors focus:outline-none focus:ring-1 focus:ring-emerald-500/40 ${themeClasses.cardBg}`}
                    />
                  </div>

                  <div className="flex flex-col space-y-1">
                    <label className="font-bold text-[11px] sm:text-xs">
                      バージョン (Version)
                    </label>
                    <input
                      type="text"
                      value={formData.version || ''}
                      onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                      placeholder="1.000"
                      className={`w-full border rounded-lg px-3 py-2 sm:py-1.5 text-sm sm:text-xs transition-colors focus:outline-none focus:ring-1 focus:ring-emerald-500/40 ${themeClasses.cardBg}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col space-y-1">
                    <label className="font-bold text-[11px] sm:text-xs">
                      Webサイト / ポートフォリオ URL
                    </label>
                    <input
                      type="text"
                      value={formData.designerUrl || ''}
                      onChange={(e) => setFormData({ ...formData, designerUrl: e.target.value })}
                      placeholder="https://..."
                      className={`w-full border rounded-lg px-3 py-2 sm:py-1.5 text-sm sm:text-xs transition-colors focus:outline-none focus:ring-1 focus:ring-emerald-500/40 ${themeClasses.cardBg}`}
                    />
                  </div>

                  <div className="flex flex-col space-y-1">
                    <label className="font-bold text-[11px] sm:text-xs">
                      フォント説明 (Description)
                    </label>
                    <input
                      type="text"
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="自作の日本語手書き風フォントです"
                      className={`w-full border rounded-lg px-3 py-2 sm:py-1.5 text-sm sm:text-xs transition-colors focus:outline-none focus:ring-1 focus:ring-emerald-500/40 ${themeClasses.cardBg}`}
                    />
                  </div>
                </div>

                <JsonBackupSection
                  isLight={isLight}
                  themeClasses={themeClasses}
                  glyphCount={glyphCount}
                  radicalCount={radicalCount}
                  handleDownloadJsonBackup={handleDownloadJsonBackup}
                  isDownloaded={isDownloaded}
                />
              </div>

              {/* Right column: EM Metrics */}
              <div className="lg:col-span-6">
                <MetricsSettingsSection
                  isLight={isLight}
                  themeClasses={themeClasses}
                  formData={formData}
                  setFormData={setFormData}
                  project={project}
                  scaleGlyphsOnResize={scaleGlyphsOnResize}
                  setScaleGlyphsOnResize={setScaleGlyphsOnResize}
                  handleUpmChange={handleUpmChange}
                />
              </div>
            </div>
          )}

          {/* TAB 2: LICENSE & COPYRIGHT SETTINGS */}
          {activeTab === 'license' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start anim-fade">
              <div className="lg:col-span-7">
                <LicensePresetSection
                  isLight={isLight}
                  themeClasses={themeClasses}
                  formData={formData}
                  onApplyPreset={handleApplyPreset}
                  onOpenBundledFontsModal={() => setIsBundledFontsModalOpen(true)}
                />
              </div>

              {/* Editable License Fields */}
              <div className="lg:col-span-5 space-y-3">
                <div className="flex flex-col space-y-1">
                  <label className="font-bold text-[11px] sm:text-xs">
                    著作権表記 (Copyright String - Name ID 0)
                  </label>
                  <input
                    type="text"
                    value={formData.copyright || ''}
                    onChange={(e) => setFormData({ ...formData, copyright: e.target.value })}
                    placeholder={`Copyright (c) ${new Date().getFullYear()} by ${formData.designer || 'Your Name'}. All rights reserved.`}
                    className={`w-full border rounded-lg px-3 py-2 sm:py-1.5 text-sm sm:text-xs transition-colors focus:outline-none focus:ring-1 focus:ring-emerald-500/40 break-all ${themeClasses.cardBg}`}
                  />
                </div>

                <div className="flex flex-col space-y-1">
                  <label className="font-bold text-[11px] sm:text-xs">
                    ライセンス規約文 (License Description - Name ID 13)
                  </label>
                  <textarea
                    rows={6}
                    value={formData.license || ''}
                    onChange={(e) => setFormData({ ...formData, license: e.target.value })}
                    placeholder="フォントの利用規約文・配布条件を入力..."
                    className={`w-full border rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 font-mono text-[11px] sm:text-xs leading-relaxed break-all resize-y min-h-[120px] ${themeClasses.cardBg}`}
                  />
                </div>

                <div className="flex flex-col space-y-1">
                  <label className="font-bold text-[11px] sm:text-xs">
                    ライセンス案内 URL (License Info URL - Name ID 14)
                  </label>
                  <input
                    type="text"
                    value={formData.licenseUrl || ''}
                    onChange={(e) => setFormData({ ...formData, licenseUrl: e.target.value })}
                    placeholder="https://..."
                    className={`w-full border rounded-lg px-3 py-2 sm:py-1.5 text-sm sm:text-xs transition-colors focus:outline-none focus:ring-1 focus:ring-emerald-500/40 break-all ${themeClasses.cardBg}`}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2.5: OPENTYPE OS/2 & HHEA TABLE METRICS */}
          {activeTab === 'opentype' && (
            <OpenTypeMetricsSection
              formData={formData}
              setFormData={setFormData}
              isLight={isLight}
              themeClasses={themeClasses}
            />
          )}

          {/* TAB 3: COPYRIGHT & COMMERCIAL USE FAQ GUIDE */}
          {activeTab === 'guide' && (
            <div className="space-y-3 anim-fade text-[11px]">
              <div className={`p-3 rounded-xl border ${themeClasses.accentBadge}`}>
                <div className="flex items-center gap-1.5 font-bold text-xs mb-1">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>作成フォントの著作権・商用利用についての保証</span>
                </div>
                <p className="leading-relaxed opacity-90">
                  本フォント作成ツールで作成されたすべての文字・ベクター輪郭・書き出されたフォントファイル（OTF / SVG）の権利は、<strong>100%作成者であるあなたに帰属します</strong>。
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <div className={`p-3 rounded-xl border ${themeClasses.cardBg}`}>
                  <h4 className={`font-bold flex items-center gap-1 text-xs ${themeClasses.accentText}`}>
                    <Check className="w-3.5 h-3.5 shrink-0" />
                    <span>Q. 作成したフォントは商用利用できますか？</span>
                  </h4>
                  <p className="mt-1.5 opacity-85 leading-relaxed">
                    <strong>A. はい、商用利用可能です。</strong>
                    同人誌や商業出版、ポスター・チラシ、WebサイトでのWebフォント利用、YouTubeやTV番組のテロップ、ゲームやスマートフォンアプリ、LINEスタンプ、グッズ販売、社名・ブランドロゴなど、あらゆる用途で自由に無制限にご活用いただけます。
                  </p>
                </div>

                <div className={`p-3 rounded-xl border ${themeClasses.cardBg}`}>
                  <h4 className={`font-bold flex items-center gap-1 text-xs ${themeClasses.accentText}`}>
                    <Check className="w-3.5 h-3.5 shrink-0" />
                    <span>Q. 作成したフォントを有料で販売・無償配布できますか？</span>
                  </h4>
                  <p className="mt-1.5 opacity-85 leading-relaxed">
                    <strong>A. はい、Boothや自サイト等での有料販売・無償配布も自由に行えます。</strong>
                    当ツール運営側がロイヤリティや利用料を請求することは一切ございません。
                  </p>
                </div>

                <div className={`p-3 rounded-xl border ${themeClasses.cardBg}`}>
                  <h4 className={`font-bold flex items-center gap-1 text-xs ${themeClasses.accentText}`}>
                    <Info className={`w-3.5 h-3.5 shrink-0 ${themeClasses.accentText}`} />
                    <span>Q. 下絵（トレース機能）を使う場合の注意点はありますか？</span>
                  </h4>
                  <p className="mt-1.5 opacity-85 leading-relaxed">
                    <strong>A. ご自身の手書き文字・スケッチ、または権利のクリアな素材をご利用ください。</strong>
                    他者が制作した著作権のあるフォントをトレースして再配布する行為は権利侵害となります。独自の手書き原稿またはパブリックドメイン資料から作成してください。
                  </p>
                </div>
              </div>
            </div>
          )}

        </form>

        {/* Sticky Footer */}
        <ModalFooter
          onCancel={handleRequestClose}
          cancelLabel="閉じる"
          primaryLabel="設定を保存"
          primaryIcon={<Check className="w-4 h-4" />}
          primaryType="submit"
          primaryForm="font-info-form"
          // submit はフォームのネイティブ送信に任せる（requestSubmit の二重送信を避ける）
          onPrimary={() => {}}
          leftInfo={
            <span className={`text-[11px] text-center sm:text-left ${themeClasses.textMuted}`}>
              {activeTab === 'info' && 'フォント名やEMメトリクスを設定'}
              {activeTab === 'license' && 'ライセンス・著作権情報を埋め込み'}
              {activeTab === 'opentype' && 'OS/2 & hhea メタデータを設定'}
              {activeTab === 'guide' && '商用利用・著作権ガイド'}
            </span>
          }
          theme={theme}
          themeClasses={themeClasses}
        />
      </div>

      <BundledFontsModal
        isOpen={isBundledFontsModalOpen}
        onClose={() => setIsBundledFontsModalOpen(false)}
        theme={theme}
      />
    </div>
  );
};
