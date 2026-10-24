import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  X,
  Type,
  Sliders,
  Eye,
  Columns,
  Grid,
  Sparkles,
  Check,
  RotateCcw,
  Download,
  Save,
  BookOpen,
  ArrowRight,
  Info,
  Layers,
  ArrowUpDown,
  AlignLeft,
  ChevronRight,
  Maximize2,
  Copy,
  Play,
  Feather,
  ZoomIn,
  ZoomOut,
  FileText,
  Bookmark,
  Share2,
} from 'lucide-react';
import {
  FontProject,
  MojikumiConfig,
  MojikumiPresetId,
  MojikumiTable,
  KinsokuSetId,
  BurasagariMode,
  KinsokuAdjustMode,
  ParagraphIndentPresetId,
} from '../types';
import {
  MOJIKUMI_PRESETS,
  PRESET_BETA,
  PRESET_TSUME,
  PRESET_GYOMATSU_YAKUMONO_HANKAN,
  PRESET_GYOMATSU_ZEN_HAN,
  PRESET_YAKUMONO_HANKAN,
  PRESET_GYOMATSU_YAKUMONO_ZENKAKU,
  PRESET_YAKUMONO_ZENKAKU,
  applyParagraphIndentPreset,
  simulateTypesetting,
  calculateTypesettingDimensions,
  KINSOKU_CHARS,
  BURASAGARI_CHARS,
  FormattedLayoutResult,
} from '../utils/mojikumiEngine';
import { compileFont } from '../utils/fontCompiler';
import { ThemeMode, isLightTheme } from '../utils/theme';
import { AOZORA_TEXTS, AozoraWork } from './mojikumi/aozoraTexts';
import { BookSpreadView } from './mojikumi/BookSpreadView';
import { ManuscriptView } from './mojikumi/ManuscriptView';
import { MagazineLayoutView } from './mojikumi/MagazineLayoutView';
import { PoetryTanzakuView } from './mojikumi/PoetryTanzakuView';
import { AkiryoCompareView } from './mojikumi/AkiryoCompareView';

export type EditorialLayoutMode =
  | 'book_spread'
  | 'manuscript'
  | 'magazine'
  | 'poetry'
  | 'compare3';

interface MojikumiStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: FontProject;
  setProject: React.Dispatch<React.SetStateAction<FontProject>>;
  theme: ThemeMode;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  onOpenOpenTypeModal?: () => void;
  onOpenTestPreview?: () => void;
}

export const MojikumiStudioModal: React.FC<MojikumiStudioModalProps> = ({
  isOpen,
  onClose,
  project,
  setProject,
  theme,
  onShowToast,
  onOpenOpenTypeModal,
  onOpenTestPreview,
}) => {
  const isLight = isLightTheme(theme);

  // Active Editorial Layout Mode
  const [layoutMode, setLayoutMode] = useState<EditorialLayoutMode>('book_spread');

  // Mobile navigation tabs: 'preview' | 'styles' | 'settings' | 'texts'
  const [mobileTab, setMobileTab] = useState<'preview' | 'styles' | 'settings' | 'texts'>('preview');

  // Sidebar settings category (Desktop)
  const [sidebarTab, setSidebarTab] = useState<'text' | 'dimensions' | 'mojikumi' | 'kinsoku'>('text');

  // Selected Aozora Bunko Literary Work
  const [selectedWorkId, setSelectedWorkId] = useState<string>(AOZORA_TEXTS[0].id);
  const currentWork = useMemo(() => {
    return AOZORA_TEXTS.find((w) => w.id === selectedWorkId) || AOZORA_TEXTS[0];
  }, [selectedWorkId]);

  // Editable sample text
  const [customText, setCustomText] = useState<string>(AOZORA_TEXTS[0].text);

  // Direction: vertical-rl (縦組み) vs horizontal-tb (横組み)
  const [isVertical, setIsVertical] = useState<boolean>(true);

  // Font Source Selection ('custom' | 'mincho' | 'gothic')
  const [fontSource, setFontSource] = useState<'custom' | 'mincho' | 'gothic'>('custom');
  const [compiledFontName, setCompiledFontName] = useState<string>('CustomMojikumiFont');
  const compiledBlobUrlRef = useRef<string | null>(null);

  // Zoom scale for canvas rendering
  const [zoom, setZoom] = useState<number>(1.0);

  // Typesetting parameters (Q・H単位系)
  const [fontSizeQ, setFontSizeQ] = useState<number>(14); // 14Q ≈ 10pt
  const [lineFeedH, setLineFeedH] = useState<number>(24); // 24H ≈ 171% line feed
  const [charsPerLine, setCharsPerLine] = useState<number>(20); // 20字詰め
  const [lineCount, setLineCount] = useState<number>(14); // 14行

  // Show visual grids (仮想ボディマス目 & ガイド)
  const [showBodyGrid, setShowBodyGrid] = useState<boolean>(false);

  // Sidebar collapsible state on desktop
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  // Handle ESC key to dismiss modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Dynamically compile user's custom font
  useEffect(() => {
    if (!isOpen) return;
    try {
      const { blobUrl } = compileFont(project, {
        mergeOverlaps: true,
        normalizeWinding: true,
      });
      const newFontName = `CustomMojikumiFont_${Date.now()}`;
      if (typeof FontFace !== 'undefined') {
        const ff = new FontFace(newFontName, `url('${blobUrl}')`);
        ff.load()
          .then((loaded) => {
            document.fonts.add(loaded);
            setCompiledFontName(newFontName);
            if (compiledBlobUrlRef.current && compiledBlobUrlRef.current !== blobUrl) {
              URL.revokeObjectURL(compiledBlobUrlRef.current);
            }
            compiledBlobUrlRef.current = blobUrl;
          })
          .catch(() => {});
      }
    } catch {
      // Graceful fallback to system font
    }
  }, [isOpen, project.updatedAt]);

  const effectiveFontFamily = useMemo(() => {
    if (fontSource === 'custom') {
      return `'${compiledFontName}', 'Hiragino Mincho ProN', 'Yu Mincho', 'Noto Serif JP', serif`;
    }
    if (fontSource === 'mincho') {
      return `'Hiragino Mincho ProN', 'Yu Mincho', 'Noto Serif JP', serif`;
    }
    return `'Hiragino Sans', 'Yu Gothic', 'Noto Sans JP', sans-serif`;
  }, [fontSource, compiledFontName]);

  // Mojikumi configuration state
  const initialConfig: MojikumiConfig = useMemo(() => {
    return (
      project.mojikumiSettings || {
        preset: 'beta',
        table: PRESET_BETA,
        kinsoku: 'weak_v2',
        kinsokuAdjust: 'push_out',
        burasagari: 'standard',
        paragraphIndent: 'visual_half',
      }
    );
  }, [project.mojikumiSettings]);

  const [currentConfig, setCurrentConfig] = useState<MojikumiConfig>(initialConfig);

  // Change literary work
  const handleSelectWork = (work: AozoraWork) => {
    setSelectedWorkId(work.id);
    setCustomText(work.text);
    setIsVertical(work.defaultDirection === 'vertical');
    setLayoutMode(work.recommendedMode);
    onShowToast(`青空文庫『${work.title}』（${work.author}）を読み込みました`, 'info');
  };

  // Update preset
  const handleSelectPreset = (presetId: MojikumiPresetId) => {
    const table = MOJIKUMI_PRESETS[presetId].table;
    setCurrentConfig((prev) => ({
      ...prev,
      preset: presetId,
      table: { ...table },
    }));
    onShowToast(`文字組みアキ量「${MOJIKUMI_PRESETS[presetId].name}」を適用しました`, 'info');
  };

  // Dimensions math
  const dimensions = useMemo(() => {
    return calculateTypesettingDimensions(fontSizeQ, lineFeedH, charsPerLine, lineCount);
  }, [fontSizeQ, lineFeedH, charsPerLine, lineCount]);

  // Simulated layouts
  const currentLayout = useMemo(() => {
    return simulateTypesetting(customText, charsPerLine, currentConfig, {
      isVertical,
      usePalt: currentConfig.preset === 'tsume',
      trackingEm: 0,
    });
  }, [customText, charsPerLine, currentConfig, isVertical]);

  const betaLayout = useMemo(() => {
    const betaConfig: MojikumiConfig = {
      ...currentConfig,
      preset: 'beta',
      table: PRESET_BETA,
    };
    return simulateTypesetting(customText, charsPerLine, betaConfig, {
      isVertical,
      usePalt: false,
      trackingEm: 0,
    });
  }, [customText, charsPerLine, currentConfig, isVertical]);

  const tsumeLayout = useMemo(() => {
    const tsumeConfig: MojikumiConfig = {
      ...currentConfig,
      preset: 'tsume',
      table: PRESET_TSUME,
    };
    return simulateTypesetting(customText, charsPerLine, tsumeConfig, {
      isVertical,
      usePalt: true,
      trackingEm: 0,
    });
  }, [customText, charsPerLine, currentConfig, isVertical]);

  const akeLayout = useMemo(() => {
    const akeConfig: MojikumiConfig = {
      ...currentConfig,
      preset: 'beta',
      table: PRESET_BETA,
    };
    return simulateTypesetting(customText, charsPerLine, akeConfig, {
      isVertical,
      usePalt: false,
      trackingEm: 0.15,
    });
  }, [customText, charsPerLine, currentConfig, isVertical]);

  // Save to project
  const handleSaveToProject = () => {
    setProject((prev) => ({
      ...prev,
      mojikumiSettings: currentConfig,
      updatedAt: Date.now(),
    }));
    onShowToast('フォントプロジェクトに文字組み設定を保存しました', 'success');
  };

  // Export JSON
  const handleExportJson = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(currentConfig, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `${project.name || 'font'}_mojikumi_settings.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
    onShowToast('文字組み設定JSONをエクスポートしました', 'success');
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        // Close when clicking directly on the dark backdrop
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in select-none"
    >
      <div
        className={`w-full max-w-[1540px] h-[96vh] sm:h-[94vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden border ${
          isLight
            ? 'bg-stone-100 border-stone-300 text-stone-900'
            : 'bg-[#0f1712] border-[#25382b] text-stone-100'
        }`}
      >
        {/* =========================================================================
            HEADER BAR 1: Brand & Top Quick Action Bar
           ========================================================================= */}
        <header
          className={`px-4 sm:px-6 py-2.5 sm:py-3 border-b flex items-center justify-between gap-2 shrink-0 ${
            isLight ? 'bg-white border-stone-200' : 'bg-[#152319] border-[#25382b]'
          }`}
        >
          {/* Left: Title & Literary Attribution */}
          <div className="flex items-center space-x-3 min-w-0">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 ${
                isLight
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-emerald-950 text-emerald-400 border-emerald-800'
              }`}
            >
              <Type className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold tracking-tight truncate">
                  日本語組版・文字組みスタジオ
                </h2>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-800/60">
                  青空文庫収録 · 著作権満了
                </span>
              </div>
              <p className="text-[11px] text-stone-500 truncate hidden sm:block">
                文庫見開き・四百字詰原稿用紙・雑誌段組・詩歌短冊・JIS X 4051アキ量精密検証
              </p>
            </div>
          </div>

          {/* Right: Actions and PROMINENT CLOSE BUTTON */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
            {/* Jump to TestPreviewModal (試し打ちへ) */}
            {onOpenTestPreview && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenTestPreview();
                }}
                className={`hidden md:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                  isLight
                    ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-950'
                    : 'bg-emerald-950/70 hover:bg-emerald-900 border-emerald-700 text-emerald-200'
                }`}
                title="フォント試し打ち・字形調整モーダルへ移動"
              >
                <Play className="w-3.5 h-3.5 fill-current text-emerald-600 dark:text-emerald-400" />
                <span>字形試し打ちへ</span>
              </button>
            )}

            {/* Save to Project Button */}
            <button
              type="button"
              onClick={handleSaveToProject}
              className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span>設定を保存</span>
            </button>

            {/* Export JSON Button */}
            <button
              type="button"
              onClick={handleExportJson}
              className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border text-xs transition-all flex items-center space-x-1 ${
                isLight
                  ? 'bg-stone-100 border-stone-200 hover:bg-stone-200 text-stone-700'
                  : 'bg-[#1b2b20] border-[#2b4032] hover:bg-[#23382a] text-stone-300'
              }`}
              title="文字組み設定JSONエクスポート"
            >
              <Download className="w-4 h-4" />
              <span className="hidden xl:inline">JSON</span>
            </button>

            {/* GUARANTEED PROMINENT CLOSE BUTTON */}
            <button
              type="button"
              onClick={onClose}
              aria-label="文字組みスタジオを閉じる"
              className={`min-w-[40px] min-h-[40px] p-2 rounded-xl border flex items-center justify-center transition-all ${
                isLight
                  ? 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-300 hover:border-stone-400'
                  : 'bg-[#1b2b20] hover:bg-[#23382a] text-stone-200 border-[#2b4032]'
              }`}
              title="閉じる (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* =========================================================================
            HEADER BAR 2: Editorial Mode Switcher & Format Controls
           ========================================================================= */}
        <div
          className={`px-4 sm:px-6 py-2 border-b flex items-center justify-between gap-2 overflow-x-auto custom-scrollbar shrink-0 ${
            isLight ? 'bg-stone-50 border-stone-200' : 'bg-[#121c15] border-[#25382b]'
          }`}
        >
          {/* Mode Switcher Tabs */}
          <div className="flex items-center space-x-1 shrink-0">
            {[
              { id: 'book_spread', label: '文庫見開き', icon: BookOpen },
              { id: 'manuscript', label: '400字原稿用紙', icon: Grid },
              { id: 'magazine', label: '雑誌・段組', icon: Columns },
              { id: 'poetry', label: '短冊・詩歌', icon: Feather },
              { id: 'compare3', label: '3様式アキ量比較', icon: Eye },
            ].map((m) => {
              const Icon = m.icon;
              const isSel = layoutMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setLayoutMode(m.id as EditorialLayoutMode)}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 shrink-0 ${
                    isSel
                      ? isLight
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-emerald-600 text-white shadow-xs'
                      : isLight
                      ? 'text-stone-600 hover:bg-stone-200/60'
                      : 'text-stone-400 hover:bg-[#1a281e]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Format Toggles */}
          <div className="flex items-center space-x-2 shrink-0">
            {/* Direction Toggle */}
            <button
              type="button"
              onClick={() => setIsVertical(!isVertical)}
              className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all flex items-center space-x-1 ${
                isVertical
                  ? isLight
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : 'bg-emerald-950 border-emerald-800 text-emerald-300'
                  : isLight
                  ? 'bg-white border-stone-200 text-stone-700'
                  : 'bg-[#1b2b20] border-[#2b4032] text-stone-300'
              }`}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>{isVertical ? '縦組み' : '横組み'}</span>
            </button>

            {/* Font Source Switcher */}
            <div
              className={`flex items-center p-0.5 rounded-lg border text-xs ${
                isLight ? 'bg-stone-200/60 border-stone-300' : 'bg-[#1b2b20] border-[#2b4032]'
              }`}
            >
              <button
                type="button"
                onClick={() => setFontSource('custom')}
                className={`px-2 py-0.5 rounded transition-all font-bold ${
                  fontSource === 'custom'
                    ? isLight
                      ? 'bg-white text-emerald-950 shadow-xs'
                      : 'bg-emerald-700 text-white'
                    : 'text-stone-500'
                }`}
                title="現在制作中のグリフ"
              >
                制作中
              </button>
              <button
                type="button"
                onClick={() => setFontSource('mincho')}
                className={`px-2 py-0.5 rounded transition-all ${
                  fontSource === 'mincho'
                    ? isLight
                      ? 'bg-white text-emerald-950 font-bold shadow-xs'
                      : 'bg-emerald-700 text-white'
                    : 'text-stone-500'
                }`}
              >
                明朝
              </button>
              <button
                type="button"
                onClick={() => setFontSource('gothic')}
                className={`px-2 py-0.5 rounded transition-all ${
                  fontSource === 'gothic'
                    ? isLight
                      ? 'bg-white text-emerald-950 font-bold shadow-xs'
                      : 'bg-emerald-700 text-white'
                    : 'text-stone-500'
                }`}
              >
                ゴシック
              </button>
            </div>

            {/* Virtual Body Grid Toggle */}
            <button
              type="button"
              onClick={() => setShowBodyGrid(!showBodyGrid)}
              className={`hidden sm:flex items-center space-x-1 px-2 py-1 rounded-lg border text-xs transition-all ${
                showBodyGrid
                  ? isLight
                    ? 'bg-emerald-100 border-emerald-300 text-emerald-900 font-bold'
                    : 'bg-emerald-900 border-emerald-700 text-emerald-200 font-bold'
                  : isLight
                  ? 'bg-white border-stone-200 text-stone-600'
                  : 'bg-[#1b2b20] border-[#2b4032] text-stone-400'
              }`}
              title="文字の仮想ボディマス目を表示"
            >
              <span>マス目</span>
            </button>

            {/* Zoom Controls */}
            <div className="hidden lg:flex items-center space-x-1 text-xs">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.7, Number((z - 0.1).toFixed(1))))}
                className={`p-1 rounded border ${isLight ? 'bg-white border-stone-200 text-stone-600' : 'bg-[#1b2b20] border-[#2b4032] text-stone-400'}`}
                title="縮小"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono text-[11px] w-9 text-center text-stone-500">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(1.6, Number((z + 0.1).toFixed(1))))}
                className={`p-1 rounded border ${isLight ? 'bg-white border-stone-200 text-stone-600' : 'bg-[#1b2b20] border-[#2b4032] text-stone-400'}`}
                title="拡大"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* =========================================================================
            MOBILE SEGMENTED NAVIGATION (Only visible on small screens)
           ========================================================================= */}
        <div
          className={`flex md:hidden items-center justify-around border-b py-1.5 px-2 text-xs font-bold shrink-0 ${
            isLight ? 'bg-stone-200/60 border-stone-300' : 'bg-[#141e17] border-[#25382b]'
          }`}
        >
          <button
            type="button"
            onClick={() => setMobileTab('preview')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              mobileTab === 'preview'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-stone-500'
            }`}
          >
            プレビュー
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('texts')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              mobileTab === 'texts'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-stone-500'
            }`}
          >
            青空文庫選択
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('settings')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              mobileTab === 'settings'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-stone-500'
            }`}
          >
            組版設定 (Q/H)
          </button>
        </div>

        {/* =========================================================================
            MAIN WORKSPACE BODY
           ========================================================================= */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden relative">
          {/* -----------------------------------------------------------------------
              LEFT SIDEBAR: Editorial Parameters & Aozora Bunko Controls
             ----------------------------------------------------------------------- */}
          <aside
            className={`${
              mobileTab === 'preview' ? 'hidden md:flex' : 'flex'
            } w-full md:w-[360px] xl:w-[400px] flex-col border-r shrink-0 min-h-0 overflow-hidden ${
              isLight ? 'bg-white border-stone-200' : 'bg-[#121c15] border-[#25382b]'
            }`}
          >
            {/* Sidebar Navigation Tabs */}
            <div
              className={`grid grid-cols-4 items-center px-2 py-2 border-b text-xs font-bold gap-1 shrink-0 ${
                isLight ? 'bg-stone-50 border-stone-200' : 'bg-[#152319] border-[#25382b]'
              }`}
            >
              {[
                { id: 'text', label: '文学作品' },
                { id: 'dimensions', label: 'Q・H設計' },
                { id: 'mojikumi', label: 'アキ量' },
                { id: 'kinsoku', label: '禁則設定' },
              ].map((tab) => {
                const isSel = sidebarTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSidebarTab(tab.id as any)}
                    className={`py-1.5 px-1 rounded-md text-[11px] text-center transition-all truncate ${
                      isSel
                        ? isLight
                          ? 'bg-white text-emerald-900 shadow-xs border border-stone-200 font-bold'
                          : 'bg-emerald-800 text-white font-bold shadow-xs'
                        : isLight
                        ? 'text-stone-500 hover:text-stone-900'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Sidebar Scrollable Body */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-5 custom-scrollbar text-xs">
              {/* TAB 1: 青空文庫 文学作品セレクター */}
              {sidebarTab === 'text' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="font-bold flex items-center justify-between text-stone-700 dark:text-stone-300">
                      <span>青空文庫 著作権満了名作</span>
                      <Bookmark className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    </label>

                    <div className="space-y-1.5 max-h-[320px] overflow-y-auto custom-scrollbar pr-1">
                      {AOZORA_TEXTS.map((work) => {
                        const isSelected = work.id === selectedWorkId;
                        return (
                          <div
                            key={work.id}
                            onClick={() => handleSelectWork(work)}
                            className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                              isSelected
                                ? isLight
                                  ? 'bg-emerald-50/80 border-emerald-500 text-emerald-950 font-medium ring-1 ring-emerald-500'
                                  : 'bg-emerald-950/60 border-emerald-500 text-emerald-100 font-medium ring-1 ring-emerald-500'
                                : isLight
                                ? 'bg-white border-stone-200 hover:bg-stone-50 text-stone-700'
                                : 'bg-[#17241b] border-[#25382b] hover:bg-[#1d2f23] text-stone-300'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs truncate">『{work.title}』</span>
                              <span className="text-[10px] font-mono opacity-60 shrink-0 ml-1">
                                {work.author}
                              </span>
                            </div>
                            <div className="text-[10px] text-stone-500 pt-0.5 line-clamp-1">
                              {work.genreName} · {work.publishedYear}
                            </div>
                            <div className="text-[10px] text-stone-400 italic pt-1 line-clamp-1">
                              {work.summary}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom Text Area */}
                  <div className="space-y-1.5 pt-2 border-t border-stone-200 dark:border-stone-800">
                    <label className="font-bold text-stone-700 dark:text-stone-300 flex items-center justify-between">
                      <span>組版テキストの編集</span>
                      <span className="text-[10px] font-mono text-stone-400">
                        {customText.length} 文字
                      </span>
                    </label>
                    <textarea
                      value={customText}
                      onChange={(e) => setCustomText(e.target.value)}
                      rows={5}
                      className={`w-full p-2.5 rounded-xl border text-xs resize-none font-sans leading-relaxed ${
                        isLight
                          ? 'bg-white border-stone-300 text-stone-900 focus:ring-1 focus:ring-emerald-500'
                          : 'bg-[#1a281e] border-[#2b4032] text-stone-100 focus:ring-1 focus:ring-emerald-400'
                      }`}
                      placeholder="組版を検証する文章を入力..."
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: Q・H寸法設計 */}
              {sidebarTab === 'dimensions' && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="font-bold">文字サイズ（Q数）</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {fontSizeQ}Q ({dimensions.fontSizePt}pt / {(fontSizeQ * 0.25).toFixed(2)}mm)
                      </span>
                    </div>
                    <input
                      type="range"
                      min="8"
                      max="40"
                      step="0.5"
                      value={fontSizeQ}
                      onChange={(e) => setFontSizeQ(Number(e.target.value))}
                      className="w-full accent-emerald-600"
                    />
                    <div className="text-[10px] text-stone-400 flex justify-between">
                      <span>最小: 8Q (本文小注)</span>
                      <span>標準: 13〜15Q (書籍本文)</span>
                      <span>最大: 40Q</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="font-bold">行送り（歯数 / H）</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {lineFeedH}H ({dimensions.lineFeedPt}pt / {(lineFeedH * 0.25).toFixed(2)}mm)
                      </span>
                    </div>
                    <input
                      type="range"
                      min="12"
                      max="60"
                      step="0.5"
                      value={lineFeedH}
                      onChange={(e) => setLineFeedH(Number(e.target.value))}
                      className="w-full accent-emerald-600"
                    />
                    <div className="text-[10px] text-stone-400 flex justify-between">
                      <span>行間: {dimensions.lineGapH}H ({(dimensions.lineGapH * 0.25).toFixed(2)}mm)</span>
                      <span>行送り比率: {Math.round((lineFeedH / fontSizeQ) * 100)}%</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="font-bold">1行字詰め（字数）</span>
                      <span className="font-mono font-bold">{charsPerLine} 文字</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="45"
                      step="1"
                      value={charsPerLine}
                      onChange={(e) => setCharsPerLine(Number(e.target.value))}
                      className="w-full accent-emerald-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="font-bold">1ページ行数</span>
                      <span className="font-mono font-bold">{lineCount} 行</span>
                    </div>
                    <input
                      type="range"
                      min="4"
                      max="24"
                      step="1"
                      value={lineCount}
                      onChange={(e) => setLineCount(Number(e.target.value))}
                      className="w-full accent-emerald-600"
                    />
                  </div>

                  {/* Calculated Box Dimensions Card */}
                  <div
                    className={`p-3.5 rounded-xl border space-y-2 ${
                      isLight
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                        : 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center space-x-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>JIS X 4051 規範版面寸法計算</span>
                    </div>
                    <div className="space-y-1 font-mono text-[11px]">
                      <div>
                        <span className="font-sans text-stone-500">版面幅: </span>
                        <strong>{dimensions.widthMm} mm</strong>
                      </div>
                      <div>
                        <span className="font-sans text-stone-500">版面高: </span>
                        <strong>{dimensions.heightMm} mm</strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: 文字組みアキ量プリセット */}
              {sidebarTab === 'mojikumi' && (
                <div className="space-y-4">
                  <label className="font-bold text-stone-700 dark:text-stone-300">
                    JIS & DTP準拠アキ量プリセット
                  </label>
                  <div className="grid grid-cols-1 gap-1.5">
                    {(Object.keys(MOJIKUMI_PRESETS) as MojikumiPresetId[]).map((pid) => {
                      const p = MOJIKUMI_PRESETS[pid];
                      const isSelected = currentConfig.preset === pid;
                      return (
                        <button
                          key={pid}
                          type="button"
                          onClick={() => handleSelectPreset(pid)}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            isSelected
                              ? isLight
                                ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold ring-1 ring-emerald-500'
                                : 'bg-emerald-950/60 border-emerald-500 text-emerald-200 font-bold ring-1 ring-emerald-500'
                              : isLight
                              ? 'bg-white border-stone-200 hover:bg-stone-50 text-stone-700'
                              : 'bg-[#17241b] border-[#25382b] hover:bg-[#1d2f23] text-stone-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold">{p.name}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                          </div>
                          <p className="text-[10px] text-stone-500 pt-0.5 line-clamp-1">{p.description}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 4: 禁則処理 & ぶら下がり */}
              {sidebarTab === 'kinsoku' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="font-bold text-stone-700 dark:text-stone-300">
                      禁則処理セット（JIS基準）
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { id: 'weak_v2', name: '弱い禁則 v2 (推奨)' },
                        { id: 'strong', name: '強い禁則' },
                        { id: 'weak', name: '弱い禁則' },
                        { id: 'none', name: '禁則なし' },
                      ].map((ks) => (
                        <button
                          key={ks.id}
                          type="button"
                          onClick={() => setCurrentConfig((prev) => ({ ...prev, kinsoku: ks.id as any }))}
                          className={`p-2 rounded-xl border text-left text-xs transition-all ${
                            currentConfig.kinsoku === ks.id
                              ? isLight
                                ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold'
                                : 'bg-emerald-950/60 border-emerald-500 text-emerald-200 font-bold'
                              : isLight
                              ? 'bg-white border-stone-200 hover:bg-stone-50 text-stone-700'
                              : 'bg-[#17241b] border-[#25382b] hover:bg-[#1d2f23] text-stone-300'
                          }`}
                        >
                          {ks.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-stone-200 dark:border-stone-800">
                    <label className="font-bold text-stone-700 dark:text-stone-300">
                      句読点ぶら下がり設定
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: 'standard', name: 'あり (標準)' },
                        { id: 'force', name: '強制ぶら下がり' },
                        { id: 'none', name: 'なし' },
                      ].map((bg) => (
                        <button
                          key={bg.id}
                          type="button"
                          onClick={() => setCurrentConfig((prev) => ({ ...prev, burasagari: bg.id as any }))}
                          className={`p-2 rounded-xl border text-center text-xs transition-all ${
                            currentConfig.burasagari === bg.id
                              ? isLight
                                ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold'
                                : 'bg-emerald-950/60 border-emerald-500 text-emerald-200 font-bold'
                              : isLight
                              ? 'bg-white border-stone-200 hover:bg-stone-50 text-stone-700'
                              : 'bg-[#17241b] border-[#25382b] hover:bg-[#1d2f23] text-stone-300'
                          }`}
                        >
                          {bg.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Done / Close drawer button */}
            <div className="p-3 border-t border-stone-200 dark:border-stone-800 md:hidden bg-stone-50 dark:bg-stone-900">
              <button
                type="button"
                onClick={() => setMobileTab('preview')}
                className="w-full py-2.5 rounded-xl bg-emerald-700 text-white font-bold text-xs flex items-center justify-center space-x-1 shadow-sm"
              >
                <span>プレビューに戻る</span>
              </button>
            </div>
          </aside>

          {/* -----------------------------------------------------------------------
              MAIN EDITORIAL STAGE (CENTER / RIGHT)
             ----------------------------------------------------------------------- */}
          <main
            className={`${
              mobileTab !== 'preview' ? 'hidden md:flex' : 'flex'
            } flex-1 min-h-0 flex-col overflow-auto custom-scrollbar relative ${
              isLight ? 'bg-stone-200/50' : 'bg-[#0a100c]'
            }`}
          >
            {/* STAGE HEADER STRIP */}
            <div
              className={`px-4 sm:px-6 py-2 border-b flex items-center justify-between text-xs font-mono shrink-0 ${
                isLight ? 'bg-white/80 border-stone-200 text-stone-500' : 'bg-[#101912]/80 border-[#25382b] text-stone-400'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span>作品: <strong>『{currentWork.title}』</strong></span>
                <span>·</span>
                <span>著者: <strong>{currentWork.author}</strong></span>
              </div>
              <div className="flex items-center space-x-3 text-[11px]">
                <span>行数: {currentLayout.lineCount}行</span>
                <span>·</span>
                <span>平均密度: {currentLayout.averageDensityPercent}%</span>
              </div>
            </div>

            {/* RENDER THE SELECTED EDITORIAL FORMAT */}
            <div className="flex-1 p-2 sm:p-6 flex items-center justify-center">
              {layoutMode === 'book_spread' && (
                <BookSpreadView
                  layout={currentLayout}
                  title={currentWork.title}
                  author={currentWork.author}
                  isLight={isLight}
                  fontFamily={effectiveFontFamily}
                  fontSizeQ={fontSizeQ}
                  lineFeedH={lineFeedH}
                  charsPerLine={charsPerLine}
                  showGrid={showBodyGrid}
                  isVertical={isVertical}
                  zoom={zoom}
                />
              )}

              {layoutMode === 'manuscript' && (
                <ManuscriptView
                  layout={currentLayout}
                  title={currentWork.title}
                  author={currentWork.author}
                  isLight={isLight}
                  fontFamily={effectiveFontFamily}
                  fontSizeQ={fontSizeQ}
                  zoom={zoom}
                  charsPerLine={charsPerLine}
                />
              )}

              {layoutMode === 'magazine' && (
                <MagazineLayoutView
                  layout={currentLayout}
                  title={currentWork.title}
                  author={currentWork.author}
                  headline={currentWork.headline}
                  lead={currentWork.lead}
                  isLight={isLight}
                  fontFamily={effectiveFontFamily}
                  fontSizeQ={fontSizeQ}
                  lineFeedH={lineFeedH}
                  isVertical={isVertical}
                  showGrid={showBodyGrid}
                  zoom={zoom}
                />
              )}

              {layoutMode === 'poetry' && (
                <PoetryTanzakuView
                  layout={currentLayout}
                  title={currentWork.title}
                  author={currentWork.author}
                  isLight={isLight}
                  fontFamily={effectiveFontFamily}
                  fontSizeQ={fontSizeQ}
                  lineFeedH={lineFeedH}
                  zoom={zoom}
                />
              )}

              {layoutMode === 'compare3' && (
                <AkiryoCompareView
                  betaLayout={betaLayout}
                  tsumeLayout={tsumeLayout}
                  akeLayout={akeLayout}
                  charsPerLine={charsPerLine}
                  fontSizeQ={fontSizeQ}
                  lineFeedH={lineFeedH}
                  showGrid={showBodyGrid}
                  isVertical={isVertical}
                  isLight={isLight}
                  fontFamily={effectiveFontFamily}
                  zoom={zoom}
                />
              )}
            </div>

            {/* Mobile Bottom Dismiss Bar (Always Available on Phone screens) */}
            <div className="md:hidden sticky bottom-2 mx-auto z-40 bg-stone-900/90 text-white rounded-full px-4 py-2 shadow-2xl border border-white/20 flex items-center space-x-3 text-xs backdrop-blur-md">
              <button
                type="button"
                onClick={onClose}
                className="flex items-center space-x-1 text-stone-300 hover:text-white"
              >
                <X className="w-4 h-4" />
                <span>スタジオを閉じる</span>
              </button>
              <span className="text-stone-500">|</span>
              <button
                type="button"
                onClick={handleSaveToProject}
                className="text-emerald-400 font-bold"
              >
                設定保存
              </button>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};