import React from 'react';
import {
  Sliders,
  X,
  Download,
  SlidersHorizontal,
  Grid,
  Shapes,
  Layers,
  FileCode,
  Wand2,
  ArrowLeftRight,
  ShieldCheck,
  Eye,
  Type,
  Upload,
  FolderOpen,
  Save,
  Scale,
  HardDrive,
  BookOpen,
  Palette,
  FilePlus,
  Award,
  Maximize,
  Minimize,
} from 'lucide-react';
import { ThemeMode, getThemePreset, getThemeClasses } from '../../utils/theme';
import { useModalContext } from '../../contexts/ModalContext';

interface ToolsMenuDropdownProps {
  isOpen: boolean;
  onToggleOpen: () => void;
  onClose: () => void;
  menuRef: React.RefObject<HTMLDivElement | null>;
  isLight: boolean;
  theme: ThemeMode;
  onOpenExportModal?: () => void;
  showMetricsDrawer?: boolean;
  onToggleMetricsDrawer?: () => void;
  onOpenPixelStudio?: () => void;
  onOpenRadicalStudio: () => void;
  onOpenPenPresetsModal?: () => void;
  onOpenTraceModal: () => void;
  onOpenSvgModal: () => void;
  onOpenGlyphSynthesisModal?: () => void;
  onOpenBatchNormalizeModal: () => void;
  onOpenWeightInterpolationModal?: () => void;
  onOpenKerningModal?: () => void;
  onOpenQualityModal?: () => void;
  onOpenGlyphCompareModal?: () => void;
  onOpenOpenTypeFeaturesModal?: () => void;
  onOpenMojikumiStudio?: () => void;
  onOpenGridFittingModal?: () => void;
  onTriggerImportTtf: () => void;
  onTriggerLoadProjectJson: () => void;
  onSaveProjectJson: () => void;
  onOpenFontInfoModal: () => void;
  onOpenStorageManagerModal?: () => void;
  onOpenShortcutsModal?: () => void;
  onOpenThemeMenu: () => void;
  onStartNewProject: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export const ToolsMenuDropdown: React.FC<ToolsMenuDropdownProps> = ({
  isOpen,
  onToggleOpen,
  onClose,
  menuRef,
  isLight,
  theme,
  onOpenExportModal,
  showMetricsDrawer,
  onToggleMetricsDrawer,
  onOpenPixelStudio,
  onOpenRadicalStudio,
  onOpenPenPresetsModal,
  onOpenTraceModal,
  onOpenSvgModal,
  onOpenGlyphSynthesisModal,
  onOpenBatchNormalizeModal,
  onOpenWeightInterpolationModal,
  onOpenKerningModal,
  onOpenQualityModal,
  onOpenGlyphCompareModal,
  onOpenOpenTypeFeaturesModal,
  onOpenMojikumiStudio,
  onOpenGridFittingModal,
  onTriggerImportTtf,
  onTriggerLoadProjectJson,
  onSaveProjectJson,
  onOpenFontInfoModal,
  onOpenStorageManagerModal,
  onOpenShortcutsModal,
  onOpenThemeMenu,
  onStartNewProject,
  isFullscreen = false,
  onToggleFullscreen,
}) => {
  const { openModal } = useModalContext();
  const themeClasses = getThemeClasses(theme);
  const toolItemClass = `text-left p-2 rounded-xl border transition-colors flex items-start space-x-2 group cursor-pointer ${themeClasses.cardBg} ${themeClasses.activeToolHover}`;
  const smallItemClass = `text-left p-2 rounded-xl border transition-colors flex items-center space-x-2 cursor-pointer ${themeClasses.cardBg} ${themeClasses.activeToolHover}`;

  return (
    <div className="relative shrink-0" ref={menuRef}>
      <button
        onClick={onToggleOpen}
        className={`px-2 h-7 rounded-md text-xs font-bold flex items-center gap-1 transition-colors border shrink-0 cursor-pointer ${
          isOpen
            ? themeClasses.activeTool
            : `${themeClasses.cardBg} ${themeClasses.activeToolHover}`
        }`}
        title="機能メニュー"
      >
        <Sliders className={`w-3.5 h-3.5 shrink-0 ${themeClasses.accentText}`} />
        <span className="font-bold leading-none">機能</span>
        <span
          className={`text-[9px] opacity-70 transition-transform duration-150 leading-none ${
            isOpen ? 'rotate-180' : ''
          }`}
        >
          ▾
        </span>
      </button>

      {isOpen && (
        <>
          {/* Invisible click-away backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/40"
            onClick={onClose}
          />
          <div
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            style={{
              maxHeight: 'calc(100vh - 50px)',
              paddingBottom: 'max(env(safe-area-inset-bottom, 16px), 24px)',
            }}
            className={`fixed right-1 sm:right-3 top-[42px] sm:top-[44px] w-[calc(100vw-8px)] sm:w-[460px] md:w-[480px] overflow-y-auto overscroll-contain rounded-xl border p-3 sm:p-3.5 z-50 flex flex-col gap-3 shadow-xl anim-pop ${themeClasses.modalBg}`}
          >
            {/* Menu Header */}
            <div className={`flex items-center justify-between px-0.5 pb-2 border-b ${themeClasses.border}`}>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
                  <Sliders className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold tracking-tight">機能メニュー</span>
              </div>
              <button
                onClick={onClose}
                className={`p-1 rounded-lg transition-colors cursor-pointer ${themeClasses.textMuted} ${themeClasses.activeToolHover}`}
                title="閉じる"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Primary Action: Font Export Banner */}
            <button
              onClick={() => {
                onClose();
                onOpenExportModal?.();
              }}
              className={`w-full text-left p-2.5 rounded-xl border flex items-center justify-between transition-colors cursor-pointer group ${
                isLight
                  ? 'bg-emerald-50/80 hover:bg-emerald-100/80 border-emerald-200 text-emerald-950'
                  : 'bg-emerald-950/40 hover:bg-emerald-900/50 border-emerald-800/60 text-emerald-200'
              }`}
            >
              <div className="flex items-center space-x-2.5 min-w-0 flex-1 mr-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Download className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold truncate">フォントを出力 (TTF / OTF)</div>
                  <div className="text-[10.5px] opacity-75 jp-wrap leading-tight">
                    インストール用・ダウンロード用フォントファイルの書き出し
                  </div>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 pr-1 shrink-0">
                出力 ➔
              </span>
            </button>

            {/* Mobile Metrics Panel Trigger */}
            {onToggleMetricsDrawer && (
              <button
                onClick={() => {
                  onToggleMetricsDrawer();
                  onClose();
                }}
                className={`w-full sm:hidden p-2 rounded-xl border text-left flex items-center justify-between transition-colors cursor-pointer ${
                  showMetricsDrawer
                    ? themeClasses.activeTool
                    : `${themeClasses.cardBg} ${themeClasses.activeToolHover}`
                }`}
              >
                <div className="flex items-center space-x-2 min-w-0 flex-1 mr-2">
                  <SlidersHorizontal className={`w-4 h-4 shrink-0 ${themeClasses.accentText}`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold truncate">メトリクスパネル</div>
                    <div className={`text-[11px] jp-wrap leading-tight ${themeClasses.textMuted}`}>
                      {showMetricsDrawer ? '表示中 (タップで閉じる)' : '文字枠・送り幅の調整'}
                    </div>
                  </div>
                </div>
                <span className={`text-xs font-bold shrink-0 ${themeClasses.accentText}`}>
                  {showMetricsDrawer ? '閉じる' : '開く ➔'}
                </span>
              </button>
            )}

            {/* Section 1: 作字・編集ツール */}
            <div>
              <div className={`px-1 pb-1 text-[11px] font-bold uppercase tracking-wider ${themeClasses.textMuted}`}>
                作字・編集ツール
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-0.5">
                {/* Pixel Font */}
                {onOpenPixelStudio && (
                  <button
                    onClick={() => {
                      onOpenPixelStudio();
                      onClose();
                    }}
                    className={toolItemClass}
                  >
                    <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform text-xs font-bold ${themeClasses.accentBadge}`}>
                      <Grid className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold truncate">ピクセルフォント</div>
                      <div className={`text-[10.5px] leading-snug ${themeClasses.textMuted}`}>
                        ドット絵形式の作字・グリッド編集
                      </div>
                    </div>
                  </button>
                )}

                {/* Radical / Parts */}
                <button
                  onClick={() => {
                    onOpenRadicalStudio();
                    onClose();
                  }}
                  className={toolItemClass}
                >
                  <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform ${themeClasses.accentBadge}`}>
                    <Shapes className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold truncate">部首・パーツパレット</div>
                    <div className={`text-[10.5px] leading-snug ${themeClasses.textMuted}`}>
                      214部首・偏旁冠脚の合成
                    </div>
                  </div>
                </button>

                {/* Custom Pen Creation */}
                {onOpenPenPresetsModal && (
                  <button
                    onClick={() => {
                      onOpenPenPresetsModal();
                      onClose();
                    }}
                    className={toolItemClass}
                  >
                    <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform ${themeClasses.accentBadge}`}>
                      <Sliders className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold truncate">カスタムペン</div>
                      <div className={`text-[10.5px] leading-snug ${themeClasses.textMuted}`}>
                        筆先形状・入り抜き・筆圧設定
                      </div>
                    </div>
                  </button>
                )}

                {/* Image / Photo Trace */}
                <button
                  onClick={() => {
                    onOpenTraceModal();
                    onClose();
                  }}
                  className={toolItemClass}
                >
                  <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform ${themeClasses.accentBadge}`}>
                    <Layers className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold truncate">下絵トレース</div>
                    <div className={`text-[10.5px] leading-snug ${themeClasses.textMuted}`}>
                      手書きノートや画像からの輪郭抽出
                    </div>
                  </div>
                </button>

                {/* SVG Vectorizer Import */}
                <button
                  onClick={() => {
                    onOpenSvgModal();
                    onClose();
                  }}
                  className={`${toolItemClass} col-span-1 sm:col-span-2`}
                >
                  <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform ${themeClasses.accentBadge}`}>
                    <FileCode className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold truncate">SVGインポート</div>
                    <div className={`text-[10.5px] leading-snug ${themeClasses.textMuted}`}>
                      ベクター画像（SVG）のパス取り込み
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Section 2: 自動化・フォント調整 */}
            <div>
              <div className={`px-1 pb-1 text-[11px] font-bold uppercase tracking-wider ${themeClasses.textMuted}`}>
                自動化・フォント調整
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-0.5">
                {/* Glyph Synthesis */}
                {onOpenGlyphSynthesisModal && (
                  <button
                    onClick={() => {
                      onOpenGlyphSynthesisModal();
                      onClose();
                    }}
                    className={toolItemClass}
                  >
                    <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform ${themeClasses.accentBadge}`}>
                      <Wand2 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold truncate">濁点・小書き合成</div>
                      <div className={`text-[10.5px] leading-snug ${themeClasses.textMuted}`}>
                        清音から濁音・促音・拗音を一括生成
                      </div>
                    </div>
                  </button>
                )}

                {/* Batch Normalize */}
                <button
                  onClick={() => {
                    onOpenBatchNormalizeModal();
                    onClose();
                  }}
                  className={toolItemClass}
                >
                  <div className="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold truncate">サイズ・太さ統一</div>
                    <div className={`text-[10.5px] leading-snug ${themeClasses.textMuted}`}>
                      字面枠や線の太さの一括正規化
                    </div>
                  </div>
                </button>

                {/* Weight Interpolation */}
                {onOpenWeightInterpolationModal && (
                  <button
                    onClick={() => {
                      onOpenWeightInterpolationModal();
                      onClose();
                    }}
                    className={toolItemClass}
                  >
                    <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform ${themeClasses.accentBadge}`}>
                      <Sliders className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold truncate">ウェイト補間</div>
                      <div className={`text-[10.5px] leading-snug ${themeClasses.textMuted}`}>
                        太さの異なるファミリー書体を生成
                      </div>
                    </div>
                  </button>
                )}

                {/* Kerning & Side Bearings */}
                {onOpenKerningModal && (
                  <button
                    onClick={() => {
                      onOpenKerningModal();
                      onClose();
                    }}
                    className={toolItemClass}
                  >
                    <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform ${themeClasses.accentBadge}`}>
                      <ArrowLeftRight className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold truncate">カーニング調整</div>
                      <div className={`text-[10.5px] leading-snug ${themeClasses.textMuted}`}>
                        文字ペアの間隔・余白設定
                      </div>
                    </div>
                  </button>
                )}

                {/* Quality Check */}
                {onOpenQualityModal && (
                  <button
                    onClick={() => {
                      onOpenQualityModal();
                      onClose();
                    }}
                    className={toolItemClass}
                  >
                    <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform ${themeClasses.accentBadge}`}>
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold truncate">品質チェック</div>
                      <div className={`text-[10.5px] leading-snug ${themeClasses.textMuted}`}>
                        重複ノード・極点・パス交差の検査
                      </div>
                    </div>
                  </button>
                )}

                {/* Glyph Overlay Compare */}
                {onOpenGlyphCompareModal && (
                  <button
                    onClick={() => {
                      onOpenGlyphCompareModal();
                      onClose();
                    }}
                    className={toolItemClass}
                  >
                    <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform ${themeClasses.accentBadge}`}>
                      <Eye className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold truncate">グリフ比較</div>
                      <div className={`text-[10.5px] leading-snug ${themeClasses.textMuted}`}>
                        複数文字の重ね合わせバランス確認
                      </div>
                    </div>
                  </button>
                )}

                {/* OpenType Features */}
                {onOpenOpenTypeFeaturesModal && (
                  <button
                    onClick={() => {
                      onOpenOpenTypeFeaturesModal();
                      onClose();
                    }}
                    className={toolItemClass}
                  >
                    <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform ${themeClasses.accentBadge}`}>
                      <FileCode className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold truncate">縦書き・合字</div>
                      <div className={`text-[10.5px] leading-snug ${themeClasses.textMuted}`}>
                        縦書き用グリフと合字 (OpenType) 設定
                      </div>
                    </div>
                  </button>
                )}

                {/* Mojikumi Studio */}
                {onOpenMojikumiStudio && (
                  <button
                    onClick={() => {
                      onOpenMojikumiStudio();
                      onClose();
                    }}
                    className={toolItemClass}
                  >
                    <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform ${themeClasses.accentBadge}`}>
                      <Type className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold truncate">文字組み・組版</div>
                      <div className={`text-[10.5px] leading-snug ${themeClasses.textMuted}`}>
                        ベタ/ツメ/アケ比較・アキ量・禁則
                      </div>
                    </div>
                  </button>
                )}

                {/* Grid Fitting */}
                {onOpenGridFittingModal && (
                  <button
                    onClick={() => {
                      onOpenGridFittingModal();
                      onClose();
                    }}
                    className={toolItemClass}
                  >
                    <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform ${themeClasses.accentBadge}`}>
                      <Grid className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold truncate">グリッド整列</div>
                      <div className={`text-[10.5px] leading-snug ${themeClasses.textMuted}`}>
                        低解像度向けの自動ヒンティング
                      </div>
                    </div>
                  </button>
                )}

                {/* JIS Progress Dashboard */}
                <button
                  onClick={() => {
                    openModal('jisProgress');
                    onClose();
                  }}
                  className={toolItemClass}
                >
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                    <Award className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold truncate">JIS規格進捗</div>
                    <div className={`text-[10.5px] leading-snug ${themeClasses.textMuted}`}>
                      常用・JIS第1・第2水準の達成率メーター
                    </div>
                  </div>
                </button>

                {/* IVS Variant Manager */}
                <button
                  onClick={() => {
                    openModal('ivsManager');
                    onClose();
                  }}
                  className={toolItemClass}
                >
                  <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold truncate">IVS 異体字管理</div>
                    <div className={`text-[10.5px] leading-snug ${themeClasses.textMuted}`}>
                      辻・葛・辺などの異体字セレクタ
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Section 3: ファイル・設定 */}
            <div className={`pt-1 border-t ${themeClasses.border}`}>
              <div className={`px-1 pb-1 text-[11px] font-bold uppercase tracking-wider ${themeClasses.textMuted}`}>
                ファイル・設定
              </div>
              <div className="grid grid-cols-2 gap-1.5 mt-0.5">
                <button
                  onClick={() => {
                    onTriggerImportTtf();
                    onClose();
                  }}
                  className={smallItemClass}
                >
                  <Upload className={`w-3.5 h-3.5 shrink-0 ${themeClasses.textMuted}`} />
                  <span className="text-xs font-medium truncate">フォント読込 (.ttf)</span>
                </button>

                <button
                  onClick={() => {
                    onTriggerLoadProjectJson();
                    onClose();
                  }}
                  className={smallItemClass}
                >
                  <FolderOpen className={`w-3.5 h-3.5 shrink-0 ${themeClasses.textMuted}`} />
                  <span className="text-xs font-medium truncate">セーブ読込 (.json)</span>
                </button>

                <button
                  onClick={() => {
                    onSaveProjectJson();
                    onClose();
                  }}
                  className={smallItemClass}
                >
                  <Save className={`w-3.5 h-3.5 shrink-0 ${themeClasses.textMuted}`} />
                  <span className="text-xs font-medium truncate">セーブ保存 (.json)</span>
                </button>

                <button
                  onClick={() => {
                    onOpenFontInfoModal();
                    onClose();
                  }}
                  className={smallItemClass}
                >
                  <Scale className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="text-xs font-medium truncate">フォント情報・設定</span>
                </button>

                {onOpenStorageManagerModal && (
                  <button
                    onClick={() => {
                      onOpenStorageManagerModal();
                      onClose();
                    }}
                    className={`${smallItemClass} col-span-2`}
                  >
                    <HardDrive className={`w-3.5 h-3.5 shrink-0 ${themeClasses.accentText}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">保存管理・バックアップ</div>
                      <div className={`text-[11px] truncate ${themeClasses.textMuted}`}>
                        ストレージ容量・履歴スナップショット
                      </div>
                    </div>
                  </button>
                )}

                {onOpenShortcutsModal && (
                  <button
                    onClick={() => {
                      onOpenShortcutsModal();
                      onClose();
                    }}
                    className={`${smallItemClass} col-span-2`}
                  >
                    <BookOpen className={`w-3.5 h-3.5 shrink-0 ${themeClasses.accentText}`} />
                    <span className="text-xs font-medium truncate">ショートカット・操作ガイド</span>
                  </button>
                )}

                {/* Theme switcher option for mobile & accessibility */}
                <button
                  onClick={() => {
                    onClose();
                    onOpenThemeMenu();
                  }}
                  className={`${smallItemClass} col-span-2`}
                >
                  <Palette className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">カラーテーマ・目の保護</div>
                    <div className={`text-[11px] truncate ${themeClasses.textMuted}`}>
                      現在のテーマ: {getThemePreset(theme).name}
                    </div>
                  </div>
                </button>
                {onToggleFullscreen && (
                  <button
                    onClick={() => {
                      onToggleFullscreen();
                      onClose();
                    }}
                    className={`${smallItemClass} col-span-2`}
                  >
                    {isFullscreen ? (
                      <Minimize className={`w-3.5 h-3.5 shrink-0 ${themeClasses.accentText}`} />
                    ) : (
                      <Maximize className={`w-3.5 h-3.5 shrink-0 ${themeClasses.accentText}`} />
                    )}
                    <span className="text-xs font-medium truncate">
                      {isFullscreen ? '全画面モードを解除 (Esc)' : '全画面モードで集中制作'}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Reset / New Project */}
            <div className={`pt-1 border-t ${themeClasses.border}`}>
              <button
                onClick={() => {
                  onClose();
                  onStartNewProject();
                }}
                className="w-full text-left px-2.5 py-1.5 text-xs rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center space-x-2 font-medium transition-colors cursor-pointer"
              >
                <FilePlus className="w-3.5 h-3.5 shrink-0" />
                <span>新規プロジェクト作成</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
