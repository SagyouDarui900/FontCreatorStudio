import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Share2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Smartphone,
  Maximize2,
  Minimize2,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import { FontProject, GlyphData } from '../types';
import { ThemeMode, isLightTheme } from '../utils/theme';
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
} from '../utils/fontCompiler';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: FontProject;
  theme: ThemeMode;
  onShowToast?: (text: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  onRequestNewProject?: () => void;
  onOpenQualityModal?: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  project,
  theme,
  onShowToast,
  onRequestNewProject,
  onOpenQualityModal,
}) => {
  const [format, setFormat] = useState<'ttf' | 'otf'>('ttf');
  // Size Optimization: 'raw' (1.0x キャンバス・下絵通り推奨), 'standard_jp' (1.35x), 'custom'
  const [sizePreset, setSizePreset] = useState<'raw' | 'standard_jp' | 'custom'>('raw');
  const [customScale, setCustomScale] = useState<number>(1.0);
  // Overlap removal & self-intersection prevention for single-stroke loops
  const [mergeOverlaps, setMergeOverlaps] = useState<boolean>(true);
  const [balanceSideBearings, setBalanceSideBearings] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState(false);
  const [copiedCss, setCopiedCss] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Dynamic preview font URL for live preview
  const [previewFontUrl, setPreviewFontUrl] = useState<string | null>(null);
  const [previewFontFamily, setPreviewFontFamily] = useState<string>('ExportPreviewFont');
  const [previewText, setPreviewText] = useState<string>('あいう 色は匂へど 漢字 123 ABC');
  const [previewFontSize, setPreviewFontSize] = useState<number>(28);

  const isLight = isLightTheme(theme);

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

  const compileOptions: CompileFontOptions = {
    scaleFactor: effectiveScale,
    mergeOverlaps,
    balanceSideBearings,
  };

  // Compile in-memory preview font for the interactive canvas simulator
  useEffect(() => {
    if (!isOpen) {
      if (previewFontUrl) {
        URL.revokeObjectURL(previewFontUrl);
        setPreviewFontUrl(null);
      }
      return;
    }

    let isMounted = true;
    const generatePreviewFont = async () => {
      try {
        const { blobUrl } = compileFont(project, compileOptions);
        if (!isMounted) return;

        const uniqueFamilyName = `PreviewFont_${Date.now()}`;

        const fontFace = new FontFace(uniqueFamilyName, `url(${blobUrl})`);
        await fontFace.load();
        document.fonts.add(fontFace);

        if (previewFontUrl) {
          URL.revokeObjectURL(previewFontUrl);
        }
        setPreviewFontUrl(blobUrl);
        setPreviewFontFamily(uniqueFamilyName);
      } catch (err) {
        // Fallback silently if preview compilation fails during typing
      }
    };

    generatePreviewFont();

    return () => {
      isMounted = false;
    };
  }, [isOpen, project, format, effectiveScale, mergeOverlaps, balanceSideBearings]);

  if (!isOpen) return null;

  const glyphCount = Object.keys(project.glyphs).length;
  const validation: FontValidationResult = validateFontProject(project);

  const handleExport = async (action: 'download' | 'share') => {
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
        onShowToast('フォントの書き出しに失敗しました。パス構成をご確認ください。', 'error');
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
      await navigator.clipboard.writeText(cssSnippet);
      setCopiedCss(true);
      if (onShowToast) {
        onShowToast('CSSコードをクリップボードにコピーしました', 'info');
      }
      setTimeout(() => setCopiedCss(false), 2000);
    } catch {
      // ignore
    }
  };

  // Detect iOS / iPadOS for specialized touch share workflow
  const isAppleTouch =
    typeof navigator !== 'undefined' &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

  return (
    <div
      className={`fixed inset-0 z-50 transition-all ${
        isFullscreen
          ? 'p-0 w-screen h-screen bg-black/85 flex flex-col'
          : 'flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs select-none'
      }`}
    >
      <div
        className={`flex flex-col transition-all overflow-hidden ${
          isFullscreen
            ? isLight
              ? 'w-screen h-screen rounded-none border-none shadow-none bg-white text-stone-800'
              : 'w-screen h-screen rounded-none border-none shadow-none bg-[#141e17] text-emerald-100'
            : isLight
            ? 'w-full max-w-2xl border rounded-2xl shadow-2xl max-h-[92vh] bg-white border-stone-200 text-stone-800'
            : 'w-full max-w-2xl border rounded-2xl shadow-2xl max-h-[92vh] bg-[#141e17] border-[#223528] text-emerald-100'
        }`}
      >
        {/* Header */}
        <div
          className={`px-5 py-3.5 border-b flex items-center justify-between shrink-0 ${
            isLight ? 'bg-stone-50 border-stone-200' : 'bg-[#18231c] border-[#233327]'
          }`}
        >
          <div className="flex items-center space-x-2.5 min-w-0 flex-1 pr-2">
            <div
              className={`p-2 rounded-xl shrink-0 ${
                isLight ? 'bg-amber-100 text-amber-900' : 'bg-emerald-950 text-emerald-300'
              }`}
            >
              <Download className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2
                className={`text-sm sm:text-base font-bold tracking-wide flex items-center gap-2 ${
                  isLight ? 'text-emerald-950' : 'text-emerald-200'
                }`}
              >
                <span className="truncate">フォント出力・ダウンロード</span>
                {isFullscreen && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-600 text-white font-medium shrink-0">
                    全画面
                  </span>
                )}
              </h2>
              <p className={`text-[11px] truncate ${isLight ? 'text-stone-500' : 'text-emerald-400/80'}`}>
                TrueType / OpenType 規格準拠のフォントファイルを生成します
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1.5">
            {/* Fullscreen Toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className={`p-1.5 px-2.5 rounded-lg border text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
                isFullscreen
                  ? isLight
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    : 'bg-emerald-950 text-emerald-300 border-emerald-700'
                  : isLight
                  ? 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                  : 'bg-[#101813] border-[#25362b] text-emerald-300 hover:bg-[#18231c]'
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
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors ${
                isLight ? 'text-stone-400 hover:bg-stone-200 hover:text-stone-700' : 'text-stone-400 hover:bg-[#202d24] hover:text-emerald-200'
              }`}
              title="閉じる (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 p-4 sm:p-5 overflow-y-auto overscroll-contain space-y-4 text-xs">
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
              className={`p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                isLight
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                  : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-100'
              }`}
            >
              <div className="flex items-start space-x-2.5 min-w-0">
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="text-xs font-bold">フォント品質チェック</div>
                  <div className="text-[11px] text-stone-600 dark:text-emerald-300/80 leading-relaxed break-words mt-0.5">
                    出力前に字形の重複、パスの交差、過剰なノード数、ベースライン逸脱を自動検査・一括修正できます
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenQualityModal();
                }}
                className={`w-full sm:w-auto px-3 py-1.5 rounded-lg text-xs font-bold border shrink-0 transition-colors text-center ${
                  isLight
                    ? 'bg-white border-emerald-300 text-emerald-800 hover:bg-emerald-50 '
                    : 'bg-[#1a271f] border-emerald-700 text-emerald-200 hover:bg-[#23342a]'
                }`}
              >
                品質を検査
              </button>
            </div>
          )}

          {/* iPad Specific Advice */}
          {isAppleTouch && (
            <div
              className={`p-3 rounded-xl border flex items-center space-x-2.5 ${
                isLight ? 'bg-amber-50/70 border-amber-200 text-amber-900' : 'bg-amber-950/30 border-amber-800 text-amber-200'
              }`}
            >
              <Smartphone className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="text-[11px] leading-relaxed">
                <strong>iPad / iPhoneをご利用中:</strong> 下の「iPadの「ファイル」に保存・共有」を押すと、標準の共有メニューが開き、iCloud Driveや本体の「ファイル」アプリに直接保存できます。
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
          className={`px-5 py-3.5 border-t flex flex-col sm:flex-row items-center justify-between gap-2.5 ${
            isLight ? 'bg-stone-50 border-stone-200' : 'bg-[#18231c] border-[#233327]'
          }`}
        >
          <div className="text-[11px] opacity-70 w-full sm:w-auto text-center sm:text-left tabular-nums whitespace-nowrap">
            収録文字: <strong className="font-mono tabular-nums text-emerald-700 dark:text-emerald-400 font-bold">{glyphCount}</strong> 文字 / 倍率:{' '}
            <strong className="font-mono tabular-nums text-emerald-700 dark:text-emerald-400 font-bold">
              {Math.round(effectiveScale * 100)}%
            </strong>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            {onRequestNewProject && (
              <button
                type="button"
                onClick={onRequestNewProject}
                className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center space-x-1.5 transition-colors whitespace-nowrap shrink-0 ${
                  isLight
                    ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-amber-950/60 hover:bg-amber-900/60 text-amber-200 border-amber-800'
                }`}
                title="現在のフォント作成を終了し、リセットして新プロジェクトを開きます"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="whitespace-nowrap">完成！新規作成</span>
              </button>
            )}

            <button
              onClick={onClose}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 ${
                isLight
                  ? 'border-stone-300 hover:bg-stone-200 text-stone-700'
                  : 'border-[#2d4034] hover:bg-[#202d24] text-emerald-200'
              }`}
            >
              閉じる
            </button>

            {/* iPad / iOS Native Share Button */}
            {isAppleTouch ? (
              <button
                onClick={() => handleExport('share')}
                disabled={isExporting}
                className="px-4 py-2 rounded-xl text-xs font-extrabold flex items-center space-x-1.5 transition-all active:scale-95 bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                <Share2 className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">iPadの「ファイル」に保存・共有</span>
              </button>
            ) : (
              <button
                onClick={() => handleExport('download')}
                disabled={isExporting}
                className="px-4 py-2 rounded-xl text-xs font-extrabold flex items-center space-x-1.5 transition-all active:scale-95 bg-amber-400 hover:bg-amber-300 text-emerald-950 disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                <Download className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">.{format.toUpperCase()} をダウンロード</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
