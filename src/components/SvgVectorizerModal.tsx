import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Upload,
  FileCode,
  Wand2,
  Clipboard,
  Sliders,
  Eye,
  Download,
  Check,
  RefreshCw,
  Image as ImageIcon,
  RotateCw,
  Plus,
  Info,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { PathContour } from '../types';
import { parseSvgStringToContours, SvgFitMode } from '../utils/svgParser';
import { vectorizeImage, VectorizeOptions } from '../utils/imageVectorizer';
import { contoursToSvgPath, getSafeGlyphViewBox } from '../utils/path';
import { ThemeMode, isLightTheme, getThemeClasses } from '../utils/theme';

/** Maximum SVG text size accepted for parsing (1 MB). */
const SVG_TEXT_MAX_BYTES = 1024 * 1024;

/**
 * Decodes an SVG file buffer, following the encoding declared in the XML
 * declaration when it is not UTF-8. Returns a warning when the declared
 * encoding cannot be used and UTF-8 fallback decoding is applied.
 */
function decodeSvgFile(buffer: ArrayBuffer): { text: string; warning: string | null } {
  const head = new TextDecoder('utf-8').decode(new Uint8Array(buffer).slice(0, 2048));
  const match = head.match(/<\?xml[^>]*encoding\s*=\s*["']([^"']+)["']/i);
  const encoding = match?.[1]?.trim();
  if (encoding && !/^utf-?8$/i.test(encoding)) {
    try {
      return { text: new TextDecoder(encoding).decode(buffer), warning: null };
    } catch {
      return {
        text: new TextDecoder('utf-8').decode(buffer),
        warning: `XML宣言の encoding "${encoding}" でデコードできなかったため、UTF-8 として読み込みました。文字化けする場合は UTF-8 で保存し直してください。`,
      };
    }
  }
  return { text: new TextDecoder('utf-8').decode(buffer), warning: null };
}

interface SvgVectorizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyContours: (contours: PathContour[], append: boolean) => void;
  selectedChar: string;
  theme: ThemeMode;
  onShowToast?: (text: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const SvgVectorizerModal: React.FC<SvgVectorizerModalProps> = ({
  isOpen,
  onClose,
  onApplyContours,
  selectedChar,
  theme,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'vectorizer' | 'svg_import'>('vectorizer');
  const isLight = isLightTheme(theme);
  const themeClasses = getThemeClasses(theme);

  // SVG Direct Import states
  const svgFileInputRef = useRef<HTMLInputElement>(null);
  const [svgText, setSvgText] = useState<string>('');
  const [svgParsedContours, setSvgParsedContours] = useState<PathContour[]>([]);
  const [svgParseError, setSvgParseError] = useState<string | null>(null);
  const [svgWarnings, setSvgWarnings] = useState<string[]>([]);
  const [svgFileWarning, setSvgFileWarning] = useState<string | null>(null);
  const [fitToEm, setFitToEm] = useState<boolean>(true);
  const [fitMode, setFitMode] = useState<SvgFitMode>('center');

  // Image Vectorizer states
  const imgFileInputRef = useRef<HTMLInputElement>(null);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [vectorContours, setVectorContours] = useState<PathContour[]>([]);
  const [generatedSvgString, setGeneratedSvgString] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [showOriginalOverlay, setShowOriginalOverlay] = useState<boolean>(true);
  // True when the latest vectorization finished with zero contours.
  const [vectorizeEmpty, setVectorizeEmpty] = useState<boolean>(false);
  // Latest vectorization request id. Results from older requests are
  // discarded so a slow earlier run cannot overwrite a newer one.
  const vectorizeRequestIdRef = useRef(0);

  // Vectorizer parameters
  const [threshold, setThreshold] = useState<number>(128);
  const [smoothing, setSmoothing] = useState<number>(2.5);
  const [contrast, setContrast] = useState<number>(1.1);
  const [brightness, setBrightness] = useState<number>(0);
  const [invert, setInvert] = useState<boolean>(false);
  const [minArea, setMinArea] = useState<number>(8);

  // Fullscreen mode state
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

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

  // Debounced auto-vectorization
  const runVectorize = useCallback(async () => {
    if (!rawImageSrc) return;
    const requestId = ++vectorizeRequestIdRef.current;
    setIsProcessing(true);
    setVectorizeEmpty(false);
    try {
      const result = await vectorizeImage(rawImageSrc, {
        threshold,
        smoothing,
        contrast,
        brightness,
        invert,
        minArea,
        fitMargin: 80,
      });
      // Discard results from an older request that finished after a newer one started.
      if (requestId !== vectorizeRequestIdRef.current) return;
      setVectorContours(result.contours);
      setGeneratedSvgString(result.svgString);
      setVectorizeEmpty(result.contours.length === 0);
    } catch (err: any) {
      if (requestId !== vectorizeRequestIdRef.current) return;
      console.error('Vectorization error:', err);
      setVectorContours([]);
      setGeneratedSvgString('');
      setVectorizeEmpty(false);
      onShowToast?.('ベクター化に失敗しました。画像を確認して再度お試しください', 'error');
    } finally {
      if (requestId === vectorizeRequestIdRef.current) {
        setIsProcessing(false);
      }
    }
  }, [rawImageSrc, threshold, smoothing, contrast, brightness, invert, minArea, onShowToast]);

  useEffect(() => {
    if (rawImageSrc) {
      const timer = setTimeout(runVectorize, 100);
      return () => clearTimeout(timer);
    }
  }, [rawImageSrc, runVectorize]);

  // Parse SVG text with the current fit settings. Called from the debounced
  // effect below, so toggling the fit checkbox or fit mode always re-parses
  // with the new values instead of the stale state.
  const parseSvgText = useCallback((text: string, fit: boolean, mode: SvgFitMode) => {
    if (!text.trim()) {
      setSvgParsedContours([]);
      setSvgParseError(null);
      setSvgWarnings([]);
      return;
    }
    if (new TextEncoder().encode(text).length > SVG_TEXT_MAX_BYTES) {
      setSvgParseError('SVGテキストが 1MB を超えているため解析しませんでした。');
      setSvgParsedContours([]);
      setSvgWarnings([]);
      return;
    }
    try {
      const res = parseSvgStringToContours(text, fit, { fitMode: mode });
      if (res.contours.length === 0) {
        setSvgParseError('ベクターパス（path / rect / polygon等）が見つかりませんでした。');
        setSvgParsedContours([]);
      } else {
        setSvgParsedContours(res.contours);
        setSvgParseError(null);
      }
      setSvgWarnings(res.warnings);
    } catch (e: any) {
      setSvgParseError(e.message || 'SVGの解析に失敗しました。');
      setSvgParsedContours([]);
      setSvgWarnings([]);
    }
  }, []);

  // Debounced SVG parsing (300ms) so every keystroke does not re-parse.
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => parseSvgText(svgText, fitToEm, fitMode), 300);
    return () => clearTimeout(timer);
  }, [svgText, fitToEm, fitMode, isOpen, parseSvgText]);

  if (!isOpen) return null;

  // Handle SVG text parsing
  const handleSvgTextChange = (text: string) => {
    setSvgText(text);
    setSvgFileWarning(null);
  };

  const handleSvgFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const buffer = e.target?.result as ArrayBuffer | null;
      if (!buffer) return;
      const decoded = decodeSvgFile(buffer);
      setSvgText(decoded.text);
      setSvgFileWarning(decoded.warning);
    };
    reader.onerror = () => {
      setSvgParseError('SVGファイルの読み込みに失敗しました。');
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImageFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setRawImageSrc(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Paste image from clipboard
  const handlePasteClipboard = async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            const blob = await item.getType(type);
            handleImageFileUpload(blob as File);
            return;
          }
          if (type === 'text/plain') {
            const blob = await item.getType(type);
            const text = await blob.text();
            if (text.includes('<svg') || text.includes('d="M')) {
              setActiveTab('svg_import');
              handleSvgTextChange(text);
              return;
            }
          }
        }
      }
      if (onShowToast) {
        onShowToast('クリップボードに画像またはSVGデータが見つかりませんでした。', 'warning');
      }
    } catch {
      if (onShowToast) {
        onShowToast('クリップボードの読み取りが拒否されたか、非対応です。ファイル選択から読み込んでください。', 'warning');
      }
    }
  };

  // Download generated SVG
  const handleDownloadSvg = () => {
    if (!generatedSvgString) return;
    const blob = new Blob([generatedSvgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `glyph_${selectedChar || 'vector'}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="SVGインポート & 画像ベクター化スタジオ"
      className={`fixed inset-0 z-[60] anim-fade ${
        isFullscreen
          ? 'p-0 w-screen h-[100dvh] bg-black/85 flex flex-col'
          : 'flex flex-col sm:items-center sm:justify-center p-0 sm:p-4 bg-black/75 select-none'
      }`}
    >
      <div
        className={`flex flex-col overflow-hidden ${themeClasses.modalBg} ${themeClasses.textPrimary} ${
          isFullscreen
            ? 'w-screen h-[100dvh] rounded-none border-none shadow-none'
            : `w-full h-[100dvh] sm:h-auto sm:max-w-2xl xl:max-w-4xl border-0 sm:border rounded-none sm:rounded-2xl shadow-none sm:shadow-2xl sm:max-h-[92vh] ${themeClasses.border}`
        }`}
      >
        {/* Header */}
        <div
          className={`px-3.5 py-2.5 pt-[calc(0.625rem+env(safe-area-inset-top,0px))] sm:px-5 sm:py-3.5 sm:pt-3.5 border-b flex items-center justify-between gap-2 shrink-0 ${themeClasses.headerBg} ${themeClasses.border}`}
        >
          <div className="flex items-center space-x-2.5 min-w-0 flex-1 pr-2">
            <div className={`p-2 rounded-xl border shrink-0 ${themeClasses.accentBadge}`}>
              <Wand2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm sm:text-base font-bold tracking-tight flex items-center gap-2">
                <span className="truncate">SVGインポート & 画像ベクター化</span>
                {isFullscreen && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${themeClasses.accentBtn}`}>
                    全画面
                  </span>
                )}
              </h2>
              <p className={`hidden sm:block text-[11px] truncate ${themeClasses.textMuted}`}>
                手書きスキャン画像からの自動ベクター変換・SVGパスの直接取り込み
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1.5 shrink-0">
            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className={`hidden sm:flex p-1.5 px-2.5 rounded-lg border text-xs font-semibold items-center space-x-1.5 transition-colors cursor-pointer ${
                isFullscreen
                  ? themeClasses.activeTool
                  : `${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.activeToolHover}`
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
              className={`p-1.5 rounded-lg min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 flex items-center justify-center border transition-colors cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textMuted} ${themeClasses.activeToolHover}`}
              title="閉じる (Esc)"
              aria-label="閉じる"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div
          className={`grid grid-cols-2 p-2 gap-1.5 border-b text-xs font-semibold shrink-0 ${themeClasses.subtoolbarBg} ${themeClasses.border}`}
        >
          <button
            type="button"
            onClick={() => setActiveTab('vectorizer')}
            className={`py-2 px-2.5 sm:px-3 rounded-xl border flex items-center justify-center space-x-1.5 sm:space-x-2 transition-colors cursor-pointer ${
              activeTab === 'vectorizer'
                ? `${themeClasses.cardBg} ${themeClasses.accentBorder} ${themeClasses.accentText} font-bold shadow-xs`
                : `border-transparent ${themeClasses.textMuted} ${themeClasses.activeToolHover}`
            }`}
          >
            <ImageIcon className={`w-4 h-4 shrink-0 ${activeTab === 'vectorizer' ? themeClasses.accentText : ''}`} />
            <span className="truncate max-sm:hidden">手書き画像 → SVG変換</span>
            <span className="hidden max-sm:inline">画像 → SVG</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('svg_import')}
            className={`py-2 px-2.5 sm:px-3 rounded-xl border flex items-center justify-center space-x-1.5 sm:space-x-2 transition-colors cursor-pointer ${
              activeTab === 'svg_import'
                ? `${themeClasses.cardBg} ${themeClasses.accentBorder} ${themeClasses.accentText} font-bold shadow-xs`
                : `border-transparent ${themeClasses.textMuted} ${themeClasses.activeToolHover}`
            }`}
          >
            <FileCode className={`w-4 h-4 shrink-0 ${activeTab === 'svg_import' ? themeClasses.accentText : ''}`} />
            <span className="truncate max-sm:hidden">SVGファイル / コード読込</span>
            <span className="hidden max-sm:inline">SVG読込</span>
          </button>
        </div>

        {/* CONTENT 1: IMAGE VECTORIZER */}
        {activeTab === 'vectorizer' && (
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3.5 sm:p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:pb-5 space-y-4 text-xs">
            {/* Upload Toolbar */}
            <div className="flex flex-wrap gap-2 items-center">
              <input
                ref={imgFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleImageFileUpload(f);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                onClick={() => imgFileInputRef.current?.click()}
                className={`py-2 px-3.5 rounded-xl border border-transparent flex items-center space-x-1.5 font-bold min-h-[40px] sm:min-h-0 transition-colors cursor-pointer ${themeClasses.accentBtn}`}
              >
                <Upload className="w-3.5 h-3.5 shrink-0" />
                <span>画像ファイルを選択</span>
              </button>

              <button
                type="button"
                onClick={handlePasteClipboard}
                className={`py-2 px-3 rounded-xl border flex items-center space-x-1.5 font-semibold min-h-[40px] sm:min-h-0 transition-colors cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.activeToolHover}`}
              >
                <Clipboard className={`w-3.5 h-3.5 shrink-0 ${themeClasses.textMuted}`} />
                <span>クリップボード貼り付け</span>
              </button>

              {rawImageSrc && (
                <button
                  type="button"
                  onClick={() => setShowOriginalOverlay(!showOriginalOverlay)}
                  className={`py-2 px-3 rounded-xl border flex items-center space-x-1.5 min-h-[40px] sm:min-h-0 transition-colors cursor-pointer ${
                    showOriginalOverlay
                      ? `${themeClasses.accentBadge} font-bold`
                      : `${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textMuted} ${themeClasses.activeToolHover}`
                  }`}
                >
                  <Eye className="w-3.5 h-3.5 shrink-0" />
                  <span>元画像と重ねる</span>
                </button>
              )}
            </div>

            {!rawImageSrc ? (
              <div className="space-y-3.5">
                <div
                  onClick={() => imgFileInputRef.current?.click()}
                  className={`p-6 sm:p-8 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center space-y-3 cursor-pointer text-center transition-colors ${themeClasses.cardBg} ${themeClasses.accentBorder} hover:opacity-90`}
                >
                  <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center ${themeClasses.accentBadge}`}>
                    <ImageIcon className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">手書き文字の写真やスケッチ画像をアップロード</p>
                    <p className={`text-[11px] mt-1 ${themeClasses.textMuted}`}>
                      高精度な輪郭抽出アルゴリズムによりベクター輪郭（SVGベジェ曲線）へ自動変換します
                    </p>
                  </div>
                </div>

                {/* Recommended Image Specification Guide */}
                <div
                  className={`p-3.5 sm:p-4 rounded-xl border text-[11px] space-y-2 ${themeClasses.subtoolbarBg} ${themeClasses.border}`}
                >
                  <div className={`flex items-center space-x-1.5 font-bold text-xs ${themeClasses.accentText}`}>
                    <Info className="w-4 h-4 shrink-0" />
                    <span>フォント作成・ベクター変換の推奨画像規格</span>
                  </div>
                  <ul className={`space-y-1.5 pl-0.5 leading-relaxed ${themeClasses.textMuted}`}>
                    <li className="flex items-start space-x-1.5">
                      <span className={`font-bold shrink-0 ${themeClasses.accentText}`}>・推奨解像度:</span>
                      <span>
                        <strong className={themeClasses.textPrimary}>1000 × 1000 px</strong> 〜 <strong className={themeClasses.textPrimary}>2048 × 2048 px</strong> （正方形 1:1 比率）
                        <span className="block text-[10px] opacity-80 mt-0.5">
                          ※標準EM正方形枠（UnitsPerEm 1000/1024）と1:1で対応し、高精度のベジェ曲線にトレースされます（最低512px角以上）。
                        </span>
                      </span>
                    </li>
                    <li className="flex items-start space-x-1.5">
                      <span className={`font-bold shrink-0 ${themeClasses.accentText}`}>・コントラスト:</span>
                      <span>
                        <strong className={themeClasses.textPrimary}>白背景に濃い黒文字</strong>（はっきりしたモノクロ・高コントラスト）
                      </span>
                    </li>
                    <li className="flex items-start space-x-1.5">
                      <span className={`font-bold shrink-0 ${themeClasses.accentText}`}>・余白と配置:</span>
                      <span>文字の上下左右に <strong className={themeClasses.textPrimary}>10%〜15% 程度の適度な余白</strong> を確保してください。</span>
                    </li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                {/* Vectorizer Preview */}
                <div
                  className={`relative aspect-square rounded-2xl border overflow-hidden flex items-center justify-center ${
                    isLight ? 'bg-white' : 'bg-black/30'
                  } ${themeClasses.border}`}
                >
                  {/* Grid background */}
                  <div
                    className="absolute inset-0 opacity-15 pointer-events-none"
                    style={{
                      backgroundImage:
                        'radial-gradient(circle, currentColor 1px, transparent 1px)',
                      backgroundSize: '16px 16px',
                    }}
                  />

                  {/* Original Image Overlay */}
                  {showOriginalOverlay && rawImageSrc && (
                    <img
                      src={rawImageSrc}
                      alt="Source"
                      className="absolute inset-0 w-full h-full object-contain opacity-35 filter grayscale pointer-events-none"
                    />
                  )}

                  {/* Generated Vector Contours */}
                  <svg viewBox={getSafeGlyphViewBox(vectorContours, 1000)} className="w-full h-full z-10 p-2">
                    <path
                      d={contoursToSvgPath(vectorContours)}
                      fill={isLight ? '#064e3b' : '#34d399'}
                      fillOpacity={0.85}
                      stroke={isLight ? '#047857' : '#6ee7b7'}
                      strokeWidth={3}
                    />
                  </svg>

                  {isProcessing && (
                    <div className="absolute inset-0 bg-black/45 flex items-center justify-center text-white space-x-2 z-20">
                      <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
                      <span className="text-xs font-bold">ベクター解析中...</span>
                    </div>
                  )}
                </div>

                {/* Parameters Controls */}
                <div className="space-y-3.5">
                  <div
                    className={`p-3.5 rounded-xl border space-y-3 ${themeClasses.cardBg} ${themeClasses.border}`}
                  >
                    <div className={`flex items-center justify-between font-bold text-xs pb-2 border-b ${themeClasses.border}`}>
                      <span className="flex items-center space-x-1.5">
                        <Sliders className={`w-3.5 h-3.5 ${themeClasses.accentText}`} />
                        <span>ベクター化パラメーター調整</span>
                      </span>
                      <span className={`text-[10px] font-mono font-normal ${themeClasses.textMuted}`}>
                        輪郭数: {vectorContours.length}
                      </span>
                    </div>

                    {vectorizeEmpty && !isProcessing && (
                      <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg px-2.5 py-2">
                        輪郭が見つかりませんでした。閾値を調整してください。
                      </p>
                    )}

                    {/* Threshold */}
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span>二値化の閾値 (しきい値):</span>
                        <span className={`font-mono font-bold ${themeClasses.accentText}`}>{threshold}</span>
                      </div>
                      <input
                        type="range"
                        min="20"
                        max="240"
                        value={threshold}
                        onChange={(e) => setThreshold(Number(e.target.value))}
                        className="w-full h-2 bg-black/10 dark:bg-white/10 rounded-lg accent-emerald-600 cursor-pointer"
                      />
                    </div>

                    {/* Smoothing */}
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span>スムージング (滑らかさ / ノイズ除去):</span>
                        <span className={`font-mono font-bold ${themeClasses.accentText}`}>
                          {smoothing.toFixed(1)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="8.0"
                        step="0.5"
                        value={smoothing}
                        onChange={(e) => setSmoothing(Number(e.target.value))}
                        className="w-full h-2 bg-black/10 dark:bg-white/10 rounded-lg accent-emerald-600 cursor-pointer"
                      />
                    </div>

                    {/* Contrast */}
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span>コントラスト強調:</span>
                        <span className={`font-mono font-bold ${themeClasses.accentText}`}>
                          {contrast.toFixed(1)}x
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="2.5"
                        step="0.1"
                        value={contrast}
                        onChange={(e) => setContrast(Number(e.target.value))}
                        className="w-full h-2 bg-black/10 dark:bg-white/10 rounded-lg accent-emerald-600 cursor-pointer"
                      />
                    </div>

                    {/* Invert */}
                    <label className="flex items-center justify-between pt-1 cursor-pointer select-none min-h-[36px]">
                      <span className="text-[11px]">白黒を反転する（黒背景に白文字の場合）:</span>
                      <input
                        type="checkbox"
                        checked={invert}
                        onChange={(e) => setInvert(e.target.checked)}
                        className="w-4 h-4 accent-emerald-600 rounded shrink-0 ml-2"
                      />
                    </label>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        onApplyContours(vectorContours, false);
                        onClose();
                      }}
                      disabled={vectorContours.length === 0}
                      className={`w-full py-2.5 px-3 min-h-[44px] sm:min-h-0 rounded-xl font-bold flex items-center justify-center space-x-1.5 transition-colors border border-transparent cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${themeClasses.accentBtn}`}
                    >
                      <Check className="w-4 h-4 shrink-0" />
                      <span>文字「{selectedChar}」に置き換え適用</span>
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onApplyContours(vectorContours, true);
                          onClose();
                        }}
                        disabled={vectorContours.length === 0}
                        className={`py-2 px-2.5 min-h-[40px] sm:min-h-0 rounded-xl border flex items-center justify-center space-x-1 text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${themeClasses.cardBg} ${themeClasses.accentBorder} ${themeClasses.accentText} ${themeClasses.activeToolHover}`}
                      >
                        <Plus className="w-3.5 h-3.5 shrink-0" />
                        <span>既存輪郭に追加</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadSvg}
                        disabled={!generatedSvgString}
                        className={`py-2 px-2.5 min-h-[40px] sm:min-h-0 rounded-xl border flex items-center justify-center space-x-1 text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.activeToolHover}`}
                      >
                        <Download className={`w-3.5 h-3.5 shrink-0 ${themeClasses.accentText}`} />
                        <span>SVGファイル保存</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* CONTENT 2: DIRECT SVG IMPORT */}
        {activeTab === 'svg_import' && (
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3.5 sm:p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:pb-5 space-y-4 text-xs">
            {/* SVG file upload toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <input
                ref={svgFileInputRef}
                type="file"
                accept=".svg,image/svg+xml"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleSvgFileUpload(f);
                  e.target.value = '';
                }}
              />
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => svgFileInputRef.current?.click()}
                  className={`py-2 px-3.5 rounded-xl border border-transparent flex items-center space-x-1.5 font-bold min-h-[40px] sm:min-h-0 transition-colors cursor-pointer ${themeClasses.accentBtn}`}
                >
                  <Upload className="w-3.5 h-3.5 shrink-0" />
                  <span>SVGファイルを選択</span>
                </button>

                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  className={`py-2 px-3 rounded-xl border flex items-center space-x-1.5 font-semibold min-h-[40px] sm:min-h-0 transition-colors cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.activeToolHover}`}
                >
                  <Clipboard className={`w-3.5 h-3.5 shrink-0 ${themeClasses.textMuted}`} />
                  <span>クリップボード貼り付け</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center space-x-1.5 text-[11px] cursor-pointer min-h-[32px]">
                  <input
                    type="checkbox"
                    checked={fitToEm}
                    onChange={(e) => {
                      setFitToEm(e.target.checked);
                    }}
                    className="w-4 h-4 accent-emerald-600 rounded"
                  />
                  <span>1000×1000 EM枠に自動フィット</span>
                </label>

                {fitToEm && (
                  <label className="flex items-center space-x-1.5 text-[11px]">
                    <span className={themeClasses.textMuted}>配置方法:</span>
                    <select
                      value={fitMode}
                      onChange={(e) => setFitMode(e.target.value as SvgFitMode)}
                      className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-medium outline-hidden ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary}`}
                    >
                      <option value="center">中央配置</option>
                      <option value="baseline">ベースライン合わせ</option>
                      <option value="viewbox">viewBox 基準</option>
                    </select>
                  </label>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Textarea for SVG code */}
              <div className="space-y-1.5 flex flex-col">
                <span className="text-[11px] font-bold">SVG XMLコード貼り付け:</span>
                <textarea
                  value={svgText}
                  onChange={(e) => handleSvgTextChange(e.target.value)}
                  placeholder={`<svg viewBox="0 0 1000 1000">\n  <path d="M 100 100 L 900 100 ..." />\n</svg>`}
                  className={`flex-1 min-h-[200px] sm:min-h-[220px] p-3 rounded-xl border font-mono text-[11px] leading-relaxed resize-none outline-hidden ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary}`}
                />
                {svgParseError && (
                  <p className="text-[11px] text-red-600 dark:text-red-400 font-semibold">{svgParseError}</p>
                )}
                {svgFileWarning && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">{svgFileWarning}</p>
                )}
                {svgWarnings.length > 0 && (
                  <div className="space-y-0.5">
                    {svgWarnings.map((warning, i) => (
                      <p key={i} className="text-[11px] text-amber-600 dark:text-amber-400">
                        {warning}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              {/* Preview */}
              <div className="space-y-3 flex flex-col">
                <span className="text-[11px] font-bold">抽出プレビュー:</span>
                <div
                  className={`flex-1 min-h-[200px] sm:min-h-[220px] rounded-2xl border flex items-center justify-center p-3 relative overflow-hidden ${
                    isLight ? 'bg-white' : 'bg-black/30'
                  } ${themeClasses.border}`}
                >
                  {svgParsedContours.length > 0 ? (
                    <svg viewBox={getSafeGlyphViewBox(svgParsedContours, 1000)} className="w-full h-full">
                      <path
                        d={contoursToSvgPath(svgParsedContours)}
                        fill={isLight ? '#064e3b' : '#34d399'}
                        fillOpacity={0.9}
                      />
                    </svg>
                  ) : (
                    <div className={`text-center text-xs px-4 ${themeClasses.textMuted}`}>
                      SVGデータが入力されるとここにプレビューが表示されます
                    </div>
                  )}
                </div>

                {/* Apply Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onApplyContours(svgParsedContours, false);
                      onClose();
                    }}
                    disabled={svgParsedContours.length === 0}
                    className={`py-2.5 px-3 min-h-[44px] sm:min-h-0 rounded-xl font-bold flex items-center justify-center space-x-1.5 transition-colors border border-transparent cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${themeClasses.accentBtn}`}
                  >
                    <Check className="w-4 h-4 shrink-0" />
                    <span>文字に置き換え適用</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onApplyContours(svgParsedContours, true);
                      onClose();
                    }}
                    disabled={svgParsedContours.length === 0}
                    className={`py-2.5 px-3 min-h-[42px] sm:min-h-0 rounded-xl border flex items-center justify-center space-x-1 font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${themeClasses.cardBg} ${themeClasses.accentBorder} ${themeClasses.accentText} ${themeClasses.activeToolHover}`}
                  >
                    <Plus className="w-3.5 h-3.5 shrink-0" />
                    <span>既存輪郭に追加</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
