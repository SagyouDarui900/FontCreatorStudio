import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Download,
  Share2,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import { FontProject } from '../types';
import { ThemeMode, isLightTheme, getThemeClasses } from '../utils/theme';
import {
  FontPreviewSection,
  ExportFormatSection,
  ExportCssSection,
} from './export';
import {
  compileFont,
  downloadFont,
  shareOrDownloadFont,
  buildExportFontFilename,
  validateFontProject,
  stripInvalidPixelData,
  inferWeightClassFromStyleName,
  FontValidationResult,
  CompileFontOptions,
} from '../utils/font';
import { copyTextToClipboard } from '../utils/clipboard';
import { isIOSDevice, isIPadOS } from '../utils/platform';
import { useIsTopModal } from './modals/ModalStackFrame';
import { ModalShell } from './modals/ModalShell';
import { ModalFooter } from './modals/ModalFooter';
import { ModalAlert } from './modals/ModalAlert';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: FontProject;
  theme: ThemeMode;
  onShowToast?: (text: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  onRequestNewProject?: () => void;
  onOpenQualityModal?: () => void;
  // Export settings controlled by the caller (AppModalsHost) so the values
  // survive closing and reopening the modal. When omitted, the modal keeps
  // its own internal state as before.
  // The format is always 'otf': opentype.js writes CFF outlines with sfnt
  // version OTTO and has no TrueType (glyf) writer, so a TTF choice would
  // only relabel the same CFF binary.
  format?: 'otf';
  onFormatChange?: (format: 'otf') => void;
  sizePreset?: 'raw' | 'standard_jp' | 'custom';
  onSizePresetChange?: (preset: 'raw' | 'standard_jp' | 'custom') => void;
  customScale?: number;
  onCustomScaleChange?: (scale: number) => void;
  previewText?: string;
  onPreviewTextChange?: (text: string) => void;
  previewFontSize?: number;
  onPreviewFontSizeChange?: (size: number) => void;
  mergeOverlaps?: boolean;
  onMergeOverlapsChange?: (merge: boolean) => void;
  balanceSideBearings?: boolean;
  onBalanceSideBearingsChange?: (balance: boolean) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  project,
  theme,
  onShowToast,
  onRequestNewProject,
  onOpenQualityModal,
  format: controlledFormat,
  onFormatChange,
  sizePreset: controlledSizePreset,
  onSizePresetChange,
  customScale: controlledCustomScale,
  onCustomScaleChange,
  previewText: controlledPreviewText,
  onPreviewTextChange,
  previewFontSize: controlledPreviewFontSize,
  onPreviewFontSizeChange,
  mergeOverlaps: controlledMergeOverlaps,
  onMergeOverlapsChange,
  balanceSideBearings: controlledBalanceSideBearings,
  onBalanceSideBearingsChange,
}) => {
  const [internalFormat, setInternalFormat] = useState<'otf'>('otf');
  const format = controlledFormat ?? internalFormat;
  const setFormat = (next: 'otf') => {
    if (onFormatChange) onFormatChange(next);
    else setInternalFormat(next);
  };
  // Size Optimization: 'raw' (1.0x キャンバス・下絵通り推奨), 'standard_jp' (1.35x), 'custom'
  const [internalSizePreset, setInternalSizePreset] = useState<'raw' | 'standard_jp' | 'custom'>('raw');
  const sizePreset = controlledSizePreset ?? internalSizePreset;
  const setSizePreset = (next: 'raw' | 'standard_jp' | 'custom') => {
    if (onSizePresetChange) onSizePresetChange(next);
    else setInternalSizePreset(next);
  };
  const [internalCustomScale, setInternalCustomScale] = useState<number>(1.0);
  const customScale = controlledCustomScale ?? internalCustomScale;
  const setCustomScale = (next: number) => {
    if (onCustomScaleChange) onCustomScaleChange(next);
    else setInternalCustomScale(next);
  };
  const isPixelProject = Boolean(project.pixelFontSettings?.isPixelFontProject);
  // Broken pixelData must not stop the whole export: strip it before
  // validating or compiling, and report the excluded glyphs below.
  const { project: exportProject, excluded: excludedPixelGlyphs } = useMemo(
    () => stripInvalidPixelData(project),
    [project]
  );
  // Overlap removal & self-intersection prevention for single-stroke loops.
  // Controlled by AppModalsHost when provided, so the values survive
  // closing and reopening the modal. The internal default is off for pixel
  // projects and on otherwise.
  const [internalMergeOverlaps, setInternalMergeOverlaps] = useState<boolean>(() => !isPixelProject);
  const mergeOverlaps = controlledMergeOverlaps ?? internalMergeOverlaps;
  const setMergeOverlaps = (next: boolean) => {
    if (onMergeOverlapsChange) onMergeOverlapsChange(next);
    else setInternalMergeOverlaps(next);
  };
  const [internalBalanceSideBearings, setInternalBalanceSideBearings] = useState<boolean>(() => !isPixelProject);
  const balanceSideBearings = controlledBalanceSideBearings ?? internalBalanceSideBearings;
  const setBalanceSideBearings = (next: boolean) => {
    if (onBalanceSideBearingsChange) onBalanceSideBearingsChange(next);
    else setInternalBalanceSideBearings(next);
  };
  const [isExporting, setIsExporting] = useState(false);
  const [copiedCss, setCopiedCss] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Dynamic preview font cleanup refs & live preview state
  const previewFontUrlRef = useRef<string | null>(null);
  const activeFontFaceRef = useRef<FontFace | null>(null);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewVersionRef = useRef(0);
  const [previewFontFamily, setPreviewFontFamily] = useState<string>('ExportPreviewFont');
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [internalPreviewText, setInternalPreviewText] = useState<string>('あいう 色は匂へど 漢字 123 ABC');
  const previewText = controlledPreviewText ?? internalPreviewText;
  const setPreviewText = (next: string) => {
    if (onPreviewTextChange) onPreviewTextChange(next);
    else setInternalPreviewText(next);
  };
  const [internalPreviewFontSize, setInternalPreviewFontSize] = useState<number>(28);
  const previewFontSize = controlledPreviewFontSize ?? internalPreviewFontSize;
  const setPreviewFontSize = (next: number) => {
    if (onPreviewFontSizeChange) onPreviewFontSizeChange(next);
    else setInternalPreviewFontSize(next);
  };

  const isLight = isLightTheme(theme);
  const themeClasses = getThemeClasses(theme);
  const isTopModal = useIsTopModal();

  // Keyboard shortcut listener: Escape and F
  useEffect(() => {
    if (!isOpen || !isTopModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      const isInput = activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select';
      if (e.key === 'Escape') {
        e.preventDefault();
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          onClose();
        }
      } else if ((e.key === 'f' || e.key === 'F') && !isInput && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setIsFullscreen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isTopModal, isFullscreen, onClose]);

  // Effective scale factor. Pixel projects always export at 1.0 with no
  // centering: the pixel studio already places dots at their final size,
  // so the standard_jp 1.35x scale and side-bearing balancing would move
  // and resize them.
  const effectiveScale = isPixelProject
    ? 1.0
    : sizePreset === 'standard_jp'
      ? 1.35
      : sizePreset === 'raw'
        ? 1.0
        : customScale;

  // compileOptions does not use `format`: the binary is always CFF-flavored
  // OpenType (OTTO), so there is no per-format recompile.
  const compileOptions: CompileFontOptions = useMemo(
    () => ({
      scaleFactor: effectiveScale,
      mergeOverlaps: isPixelProject ? false : mergeOverlaps,
      balanceSideBearings: isPixelProject ? false : balanceSideBearings,
    }),
    [effectiveScale, mergeOverlaps, balanceSideBearings, isPixelProject]
  );

  const cleanupPreviewFont = useCallback(() => {
    if (previewFontUrlRef.current) {
      URL.revokeObjectURL(previewFontUrlRef.current);
      previewFontUrlRef.current = null;
    }
    if (activeFontFaceRef.current) {
      try {
        document.fonts.delete(activeFontFaceRef.current);
      } catch {
        // Ignored on environments without FontFaceSet.delete
      }
      activeFontFaceRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanupPreviewFont();
    };
  }, [cleanupPreviewFont]);

  // Compile in-memory preview font for the interactive canvas simulator.
  // Debounced by 250ms (same as useTestPreviewState) so continuous edits
  // do not trigger a compile on every change. On failure the old preview
  // font is removed and the error is shown instead of keeping stale glyphs.
  useEffect(() => {
    if (!isOpen) {
      if (previewTimerRef.current) {
        clearTimeout(previewTimerRef.current);
        previewTimerRef.current = null;
      }
      cleanupPreviewFont();
      setPreviewError(null);
      return;
    }

    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
    }

    let isMounted = true;
    const version = ++previewVersionRef.current;
    previewTimerRef.current = setTimeout(() => {
      previewTimerRef.current = null;
      const generatePreviewFont = async () => {
        let createdUrl: string | null = null;
        try {
          const validationResult = validateFontProject(exportProject);
          if (!validationResult.valid) {
            throw new Error(
              `フォントの検証に失敗しました: ${validationResult.errors.join(' / ')}`
            );
          }
          const { blobUrl } = compileFont(exportProject, compileOptions);
          createdUrl = blobUrl;
          if (!isMounted || version !== previewVersionRef.current) {
            URL.revokeObjectURL(blobUrl);
            return;
          }

          const uniqueFamilyName = `PreviewFont_${Date.now()}`;
          const fontFace = new FontFace(uniqueFamilyName, `url(${blobUrl})`);
          await fontFace.load();
          if (!isMounted || version !== previewVersionRef.current) {
            URL.revokeObjectURL(blobUrl);
            return;
          }

          cleanupPreviewFont();
          document.fonts.add(fontFace);
          previewFontUrlRef.current = blobUrl;
          activeFontFaceRef.current = fontFace;
          setPreviewFontFamily(uniqueFamilyName);
          setPreviewError(null);
        } catch (err) {
          if (createdUrl && createdUrl !== previewFontUrlRef.current) {
            URL.revokeObjectURL(createdUrl);
          }
          if (!isMounted || version !== previewVersionRef.current) {
            return;
          }
          // Remove the previous preview so a failed compile never leaves
          // stale glyphs on screen.
          cleanupPreviewFont();
          setPreviewFontFamily('ExportPreviewFont');
          setPreviewError(
            err instanceof Error && err.message
              ? err.message
              : 'プレビュー用フォントの生成に失敗しました。'
          );
        }
      };

      generatePreviewFont();
    }, 250);

    return () => {
      isMounted = false;
      if (previewTimerRef.current) {
        clearTimeout(previewTimerRef.current);
        previewTimerRef.current = null;
      }
    };
  }, [isOpen, exportProject, compileOptions, cleanupPreviewFont]);

  if (!isOpen) return null;

  const glyphCount = Object.keys(exportProject.glyphs).length;
  const baseValidation: FontValidationResult = validateFontProject(exportProject);
  const validation: FontValidationResult =
    excludedPixelGlyphs.length > 0
      ? {
          ...baseValidation,
          warnings: [
            ...baseValidation.warnings,
            `破損したピクセルデータを除外しました（${excludedPixelGlyphs.join('、')}）。この文字は空グリフとして書き出されます。`,
          ],
        }
      : baseValidation;

  const handleExport = async (action: 'download' | 'share') => {
    if (!validation.valid) {
      const firstError = validation.errors[0] || 'フォントデータにエラーがあるため書き出しできません';
      const remaining = validation.errors.length - 1;
      onShowToast?.(
        remaining > 0 ? `${firstError}（他 ${remaining}件のエラーがあります）` : firstError,
        'error'
      );
      return;
    }
    setIsExporting(true);
    try {
      if (action === 'share') {
        const res = await shareOrDownloadFont(exportProject, format, compileOptions);
        if (onShowToast) {
          if (res.method === 'cancelled') {
            onShowToast('フォントの共有・保存をキャンセルしました', 'info');
          } else {
            onShowToast('フォントの共有・保存ダイアログを開きました', 'success');
          }
        }
      } else {
        downloadFont(exportProject, format, compileOptions);
        if (onShowToast) {
          onShowToast(`.${format.toUpperCase()} フォントファイルをダウンロードしました！`, 'success');
        }
      }
    } catch (err) {
      if (onShowToast) {
        onShowToast(
          err instanceof Error && err.message
            ? `フォントの書き出しに失敗しました: ${err.message}`
            : 'フォントの書き出しに失敗しました。パス構成をご確認ください。',
          'error'
        );
      }
    } finally {
      setIsExporting(false);
    }
  };

  const fontFamily = project.metadata.familyName || 'MyFont';
  const escapedFontFamily = fontFamily.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const fileName = buildExportFontFilename(project.metadata, format);
  const rawWeight = project.metadata.usWeightClass;
  // Use the raw weight (1-1000), the same value the compiler writes to
  // OS/2 usWeightClass, instead of rounding to the nearest 100.
  const resolvedWeight =
    typeof rawWeight === 'number' && Number.isFinite(rawWeight)
      ? Math.max(1, Math.min(1000, Math.round(rawWeight)))
      : inferWeightClassFromStyleName(project.metadata.styleName);
  const styleLower = (project.metadata.styleName || '').toLowerCase();
  const isItalicStyle =
    styleLower.includes('italic') ||
    styleLower.includes('oblique') ||
    (typeof project.metadata.italicAngle === 'number' &&
      Number.isFinite(project.metadata.italicAngle) &&
      Math.abs(project.metadata.italicAngle) > 0.01);
  const cssFontWeight =
    resolvedWeight === 400 ? 'normal' : resolvedWeight === 700 ? 'bold' : String(resolvedWeight);
  const cssFontStyle = isItalicStyle ? 'italic' : 'normal';

  const cssSnippet = `@font-face {
  font-family: '${escapedFontFamily}';
  src: url('${fileName}') format('opentype');
  font-weight: ${cssFontWeight};
  font-style: ${cssFontStyle};
  font-display: swap;
}`;

  const handleCopyCss = async () => {
    try {
      const ok = await copyTextToClipboard(cssSnippet);
      if (ok) {
        setCopiedCss(true);
        if (onShowToast) {
          onShowToast('CSSコードをクリップボードにコピーしました', 'info');
        }
        setTimeout(() => setCopiedCss(false), 2000);
      } else {
        throw new Error('Copy returned false');
      }
    } catch {
      if (onShowToast) {
        onShowToast('クリップボードへのコピーに失敗しました', 'error');
      }
    }
  };

  // Detect iOS / iPadOS for specialized touch share workflow
  // (isIPadOS covers iPadOS 13+ Safari with a Macintosh user agent;
  // see src/utils/platform.ts)
  const isIPad = isIPadOS();
  const isAppleTouch = isIOSDevice();

  const primaryActionLabel = isAppleTouch
    ? isIPad
      ? 'iPadの「ファイル」に保存・共有'
      : '「ファイル」に保存・共有'
    : `.${format.toUpperCase()} をダウンロード`;

  return (
    <ModalShell
      title="フォント出力"
      subtitle={
        <>
          <span className="sm:hidden">
            収録文字: {glyphCount}文字 / 倍率: {Math.round(effectiveScale * 100)}%・OTF
          </span>
          <span className="hidden sm:inline">OpenType (CFF) 規格準拠のフォントファイルを生成します</span>
        </>
      }
      theme={theme}
      themeClasses={themeClasses}
      maxWidth="3xl"
      isFullscreen={isFullscreen}
      onToggleFullscreen={() => setIsFullscreen((prev) => !prev)}
      onClose={onClose}
      ariaLabel="フォント出力・ダウンロード"
      bodyClassName="space-y-3 overscroll-contain"
      footer={
        <ModalFooter
          primaryLabel={primaryActionLabel}
          primaryIcon={
            isAppleTouch ? (
              <Share2 className="w-4 h-4 shrink-0" />
            ) : (
              <Download className="w-4 h-4 shrink-0" />
            )
          }
          onPrimary={() => handleExport(isAppleTouch ? 'share' : 'download')}
          primaryDisabled={isExporting || !validation.valid}
          onCancel={onClose}
          cancelLabel="閉じる"
          theme={theme}
          themeClasses={themeClasses}
          leftInfo={
            <>
              {onRequestNewProject && (
                <button
                  type="button"
                  onClick={onRequestNewProject}
                  className={`min-h-[44px] sm:min-h-0 px-3 py-2 rounded-xl text-xs font-bold border flex items-center justify-center space-x-1.5 whitespace-nowrap shrink-0 cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.activeToolHover}`}
                  title="現在のフォント作成を終了し、リセットして新プロジェクトを開きます"
                >
                  <RotateCcw className={`w-3.5 h-3.5 shrink-0 ${themeClasses.accentText}`} />
                  <span className="whitespace-nowrap">新規作成</span>
                </button>
              )}
              <span className="hidden sm:block text-[11px] opacity-85 tabular-nums whitespace-nowrap">
                収録文字:{' '}
                <strong className={`font-mono tabular-nums font-bold ${themeClasses.accentText}`}>{glyphCount}</strong>
                {' '}文字 / 倍率:{' '}
                <strong className={`font-mono tabular-nums font-bold ${themeClasses.accentText}`}>
                  {Math.round(effectiveScale * 100)}%
                </strong>
              </span>
            </>
          }
        />
      }
    >
        {/* Content */}
        <div className="space-y-3">
          {!validation.valid && (
            <ModalAlert
              tone="error"
              title={`書き出し前の検証でエラーが検出されました（${validation.errors.length}件）`}
              items={validation.errors}
              theme={theme}
            />
          )}

          {validation.warnings.length > 0 && (
            <ModalAlert
              tone="warning"
              title={`書き出し前の検証で警告が検出されました（${validation.warnings.length}件）`}
              items={validation.warnings}
              theme={theme}
            />
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* Left Column: Format, Scale & Export Options */}
            <div className="lg:col-span-5 space-y-3">
              <ExportFormatSection
                isLight={isLight}
                themeClasses={themeClasses}
                format={format}
                setFormat={setFormat}
                sizePreset={sizePreset}
                setSizePreset={setSizePreset}
                customScale={customScale}
                setCustomScale={setCustomScale}
                effectiveScale={effectiveScale}
                balanceSideBearings={balanceSideBearings}
                setBalanceSideBearings={setBalanceSideBearings}
                mergeOverlaps={mergeOverlaps}
                setMergeOverlaps={setMergeOverlaps}
              />

              {isPixelProject && (
                <ModalAlert
                  tone="info"
                  title="ピクセルプロジェクトのため、倍率は 1.0 倍、センタリングと重なり結合は無効で書き出します。"
                  theme={theme}
                />
              )}
            </div>

            {/* Right Column: Live Preview, Quality Check & CSS Snippet */}
            <div className="lg:col-span-7 space-y-3">
              {/* Live Render & Size Preview in Modal with Custom Text Input & Presets */}
              {previewError && (
                <ModalAlert tone="error" title="プレビューの生成に失敗しました" theme={theme}>
                  {previewError}
                </ModalAlert>
              )}

              <FontPreviewSection
                isLight={isLight}
                themeClasses={themeClasses}
                previewText={previewText}
                setPreviewText={setPreviewText}
                previewFontSize={previewFontSize}
                setPreviewFontSize={setPreviewFontSize}
                previewFontFamily={previewFontFamily}
                project={project}
              />

              {/* Quality Check Recommendation Banner */}
              {onOpenQualityModal && (
                <div
                  className={`p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-3 ${themeClasses.accentBadge}`}
                >
                  <div className="flex items-start space-x-2.5 min-w-0">
                    <ShieldCheck className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 mt-0.5 ${themeClasses.accentText}`} />
                    <div className="min-w-0">
                      <div className="text-xs font-bold">フォント品質チェック</div>
                      <div className={`text-[11px] leading-relaxed break-words mt-0.5 jp-wrap ${themeClasses.textMuted}`}>
                        出力前に字形の重複・交差やベースライン逸脱を自動検査できます
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenQualityModal();
                    }}
                    className={`w-full sm:w-auto min-h-[40px] sm:min-h-0 px-3 py-2 sm:py-1.5 rounded-lg text-xs font-bold border shrink-0 text-center cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.activeToolHover}`}
                  >
                    品質を検査
                  </button>
                </div>
              )}

              {/* Apple Touch Device Specific Advice */}
              {isAppleTouch && (
                <ModalAlert tone="warning" title={`${isIPad ? 'iPad' : 'iPhone / iPad'}をご利用中`} theme={theme}>
                  下の「{primaryActionLabel}」を押すと、標準の共有メニューから「ファイル」アプリやiCloud Driveに直接保存できます。
                </ModalAlert>
              )}

              <ExportCssSection
                isLight={isLight}
                themeClasses={themeClasses}
                cssSnippet={cssSnippet}
                copiedCss={copiedCss}
                handleCopyCss={handleCopyCss}
              />
            </div>
          </div>
        </div>
    </ModalShell>
  );
};
