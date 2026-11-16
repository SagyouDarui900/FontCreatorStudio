import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  X,
  Download,
  Share2,
  AlertCircle,
  Smartphone,
  Maximize2,
  Minimize2,
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
  validateFontProject,
  FontValidationResult,
  CompileFontOptions,
} from '../utils/font';
import { copyTextToClipboard } from '../utils/clipboard';

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
  format?: 'ttf' | 'otf';
  onFormatChange?: (format: 'ttf' | 'otf') => void;
  sizePreset?: 'raw' | 'standard_jp' | 'custom';
  onSizePresetChange?: (preset: 'raw' | 'standard_jp' | 'custom') => void;
  customScale?: number;
  onCustomScaleChange?: (scale: number) => void;
  previewText?: string;
  onPreviewTextChange?: (text: string) => void;
  previewFontSize?: number;
  onPreviewFontSizeChange?: (size: number) => void;
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
}) => {
  const [internalFormat, setInternalFormat] = useState<'ttf' | 'otf'>('ttf');
  const format = controlledFormat ?? internalFormat;
  const setFormat = (next: 'ttf' | 'otf') => {
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
  // Overlap removal & self-intersection prevention for single-stroke loops
  const [mergeOverlaps, setMergeOverlaps] = useState<boolean>(() => !isPixelProject);
  const [balanceSideBearings, setBalanceSideBearings] = useState<boolean>(() => !isPixelProject);
  const [isExporting, setIsExporting] = useState(false);
  const [copiedCss, setCopiedCss] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const pixelProj = Boolean(project.pixelFontSettings?.isPixelFontProject);
      setMergeOverlaps(!pixelProj);
      setBalanceSideBearings(!pixelProj);
    }
  }, [isOpen, project.pixelFontSettings?.isPixelFontProject]);

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

  // Keyboard shortcut listener: Escape and F
  useEffect(() => {
    if (!isOpen) return;
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
  }, [isOpen, isFullscreen, onClose]);

  // Effective scale factor
  const effectiveScale =
    sizePreset === 'standard_jp' ? 1.35 : sizePreset === 'raw' ? 1.0 : customScale;

  // compileOptions does not use `format`: changing ttf/otf only changes the
  // download filename and MIME type, so it must not trigger a recompile.
  const compileOptions: CompileFontOptions = useMemo(
    () => ({
      scaleFactor: effectiveScale,
      mergeOverlaps,
      balanceSideBearings,
    }),
    [effectiveScale, mergeOverlaps, balanceSideBearings]
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
          const validationResult = validateFontProject(project);
          if (!validationResult.valid) {
            throw new Error(
              `フォントの検証に失敗しました: ${validationResult.errors.join(' / ')}`
            );
          }
          const { blobUrl } = compileFont(project, compileOptions);
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
  }, [isOpen, project, compileOptions, cleanupPreviewFont]);

  if (!isOpen) return null;

  const glyphCount = Object.keys(project.glyphs).length;
  const validation: FontValidationResult = validateFontProject(project);

  const handleExport = async (action: 'download' | 'share') => {
    if (!validation.valid) {
      onShowToast?.(validation.errors[0] || 'フォントデータにエラーがあるため書き出しできません', 'error');
      return;
    }
    setIsExporting(true);
    try {
      if (action === 'share') {
        await shareOrDownloadFont(project, format, compileOptions);
        if (onShowToast) {
          onShowToast('フォントの共有・保存ダイアログを開きました', 'success');
        }
      } else {
        downloadFont(project, format, compileOptions);
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
  const fileName = `${fontFamily.toLowerCase().replace(/\s+/g, '-')}.${format}`;

  const cssSnippet = `@font-face {
  font-family: '${fontFamily}';
  src: url('${fileName}') format('${format === 'ttf' ? 'truetype' : 'opentype'}');
  font-weight: normal;
  font-style: normal;
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
  const isIPad =
    typeof navigator !== 'undefined' &&
    (/iPad/.test(navigator.userAgent) ||
      (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1));
  const isAppleTouch =
    isIPad || (typeof navigator !== 'undefined' && /iPhone|iPod/.test(navigator.userAgent));

  const primaryActionLabel = isAppleTouch
    ? isIPad
      ? 'iPadの「ファイル」に保存・共有'
      : '「ファイル」に保存・共有'
    : `.${format.toUpperCase()} をダウンロード`;

  return (
    <div
      className={`fixed inset-0 z-[60] ${
        isFullscreen
          ? 'p-0 w-screen h-[100dvh] bg-black/85 flex flex-col'
          : 'flex flex-col sm:items-center sm:justify-center p-0 sm:p-4 bg-black/75 select-none'
      }`}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="フォント出力・ダウンロード"
        className={`flex flex-col overflow-hidden ${themeClasses.modalBg} ${
          isFullscreen
            ? 'w-screen h-[100dvh] rounded-none border-none shadow-none'
            : `w-full h-[100dvh] sm:h-auto sm:max-w-2xl border-0 sm:border ${themeClasses.border} rounded-none sm:rounded-2xl shadow-none sm:shadow-2xl sm:max-h-[92vh]`
        }`}
      >
        {/* Header */}
        <div
          className={`px-3.5 py-2.5 pt-[calc(0.625rem+env(safe-area-inset-top,0px))] sm:px-5 sm:py-3.5 sm:pt-3.5 border-b flex items-center justify-between shrink-0 ${themeClasses.headerBg}`}
        >
          <div className="flex items-center space-x-2.5 min-w-0 flex-1 pr-2">
            <div className={`hidden sm:flex p-2 rounded-xl shrink-0 border ${themeClasses.accentBadge}`}>
              <Download className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm sm:text-base font-bold tracking-wide flex items-center gap-2">
                <span className="truncate">フォント出力</span>
                {isFullscreen && (
                  <span className={`hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${themeClasses.accentBtn}`}>
                    全画面
                  </span>
                )}
              </h2>
              <p className={`sm:hidden text-[11px] font-mono tabular-nums truncate ${themeClasses.textMuted}`}>
                {glyphCount}文字収録 · 倍率 {Math.round(effectiveScale * 100)}% · .{format.toUpperCase()}
              </p>
              <p className={`hidden sm:block text-[11px] truncate ${themeClasses.textMuted}`}>
                TrueType / OpenType 規格準拠のフォントファイルを生成します
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1.5 shrink-0">
            {/* Fullscreen Toggle (Desktop / Tablet only; mobile always uses full viewport) */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className={`hidden sm:flex p-1.5 px-2.5 rounded-lg border text-xs font-semibold items-center space-x-1.5 cursor-pointer ${
                isFullscreen
                  ? themeClasses.activeTool
                  : `${themeClasses.cardBg} ${themeClasses.activeToolHover}`
              }`}
              title={isFullscreen ? '通常表示に戻す (F または Esc)' : '全画面表示に拡大 (F)'}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>通常</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>全画面</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="閉じる"
              className={`w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg border cursor-pointer ${themeClasses.cardBg} ${themeClasses.textMuted} ${themeClasses.activeToolHover}`}
              title="閉じる (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 px-3.5 py-3 sm:p-5 overflow-y-auto overscroll-contain space-y-3 sm:space-y-4 text-xs">
          {!validation.valid && (
            <div
              className={`p-3 rounded-xl border flex items-start space-x-2 ${
                isLight
                  ? 'bg-red-50 border-red-200 text-red-900'
                  : 'bg-red-950/40 border-red-800 text-red-200'
              }`}
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
              <div className="min-w-0 space-y-0.5 text-[11px] leading-relaxed">
                <div className="font-bold">書き出し前の検証でエラーが検出されました</div>
                <ul className="list-disc pl-4 space-y-0.5">
                  {validation.errors.slice(0, 3).map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <ExportFormatSection
            isLight={isLight}
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

          {/* Live Render & Size Preview in Modal with Custom Text Input & Presets */}
          {previewError && (
            <div
              className={`p-3 rounded-xl border flex items-start space-x-2 ${
                isLight
                  ? 'bg-red-50 border-red-200 text-red-900'
                  : 'bg-red-950/40 border-red-800 text-red-200'
              }`}
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
              <div className="min-w-0 space-y-0.5 text-[11px] leading-relaxed">
                <div className="font-bold">プレビューの生成に失敗しました</div>
                <div>{previewError}</div>
              </div>
            </div>
          )}

          <FontPreviewSection
            isLight={isLight}
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
              className={`p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-3 ${
                isLight
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                  : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-100'
              }`}
            >
              <div className="flex items-start space-x-2.5 min-w-0">
                <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="text-xs font-bold">フォント品質チェック</div>
                  <div className="text-[11px] text-stone-600 dark:text-emerald-300/80 leading-relaxed break-words mt-0.5">
                    出力前に字形の重複・交差やベースライン逸脱を自動検査できます
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenQualityModal();
                }}
                className={`w-full sm:w-auto min-h-[40px] sm:min-h-0 px-3 py-2 sm:py-1.5 rounded-lg text-xs font-bold border shrink-0 text-center cursor-pointer ${
                  isLight
                    ? 'bg-white border-emerald-300 text-emerald-800 hover:bg-emerald-50'
                    : 'bg-[#1a271f] border-emerald-700 text-emerald-200 hover:bg-[#23342a]'
                }`}
              >
                品質を検査
              </button>
            </div>
          )}

          {/* Apple Touch Device Specific Advice */}
          {isAppleTouch && (
            <div
              className={`p-3 rounded-xl border flex items-start space-x-2.5 ${
                isLight ? 'bg-amber-50/70 border-amber-200 text-amber-900' : 'bg-amber-950/30 border-amber-800 text-amber-200'
              }`}
            >
              <Smartphone className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div className="text-[11px] leading-relaxed jp-wrap">
                <strong>{isIPad ? 'iPad' : 'iPhone / iPad'}をご利用中:</strong> 下の「{primaryActionLabel}」を押すと、標準の共有メニューから「ファイル」アプリやiCloud Driveに直接保存できます。
              </div>
            </div>
          )}

          <ExportCssSection
            isLight={isLight}
            cssSnippet={cssSnippet}
            copiedCss={copiedCss}
            handleCopyCss={handleCopyCss}
          />
        </div>

        {/* Footer Actions */}
        <div
          className={`px-3.5 py-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom,0px))] sm:px-5 sm:py-3.5 sm:pb-3.5 border-t flex items-center justify-between gap-2.5 shrink-0 ${themeClasses.headerBg}`}
        >
          <div className="hidden sm:block text-[11px] opacity-85 tabular-nums whitespace-nowrap">
            収録文字: <strong className={`font-mono tabular-nums font-bold ${themeClasses.accentText}`}>{glyphCount}</strong> 文字 / 倍率:{' '}
            <strong className={`font-mono tabular-nums font-bold ${themeClasses.accentText}`}>
              {Math.round(effectiveScale * 100)}%
            </strong>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto sm:justify-end">
            {onRequestNewProject && (
              <button
                type="button"
                onClick={onRequestNewProject}
                className={`min-h-[44px] sm:min-h-0 px-3 py-2 rounded-xl text-xs font-bold border flex items-center justify-center space-x-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                  isLight
                    ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-amber-950/60 hover:bg-amber-900/60 text-amber-200 border-amber-800'
                }`}
                title="現在のフォント作成を終了し、リセットして新プロジェクトを開きます"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="whitespace-nowrap">新規作成</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className={`hidden sm:inline-flex px-3.5 py-2 rounded-xl text-xs font-semibold border whitespace-nowrap shrink-0 cursor-pointer ${themeClasses.cardBg} ${themeClasses.activeToolHover}`}
            >
              閉じる
            </button>

            {/* Primary Download / Share Action */}
            {isAppleTouch ? (
              <button
                type="button"
                onClick={() => handleExport('share')}
                disabled={isExporting || !validation.valid}
                className={`flex-1 sm:flex-initial min-h-[44px] sm:min-h-0 px-4 py-2.5 sm:py-2 rounded-xl text-xs font-extrabold flex items-center justify-center space-x-1.5 disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer ${themeClasses.accentBtn}`}
              >
                <Share2 className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">{primaryActionLabel}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleExport('download')}
                disabled={isExporting || !validation.valid}
                className="flex-1 sm:flex-initial min-h-[44px] sm:min-h-0 px-4 py-2.5 sm:py-2 rounded-xl text-xs font-extrabold flex items-center justify-center space-x-1.5 bg-amber-400 hover:bg-amber-300 text-emerald-950 disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Download className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">{primaryActionLabel}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
