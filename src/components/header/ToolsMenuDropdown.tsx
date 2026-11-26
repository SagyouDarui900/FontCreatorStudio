import React from 'react';
import { createPortal } from 'react-dom';
import {
  Sliders,
  Smartphone,
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
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { PWAInstallButton } from '../PWAInstallButton';
import { ToolMenuCard } from '../modals/ToolMenuCard';

interface ToolsMenuDropdownProps {
  isOpen: boolean;
  onToggleOpen: () => void;
  onClose: () => void;
  menuRef: React.RefObject<HTMLDivElement | null>;
  panelRef?: React.RefObject<HTMLDivElement | null>;
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
  panelRef,
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
  const { isInstalled } = usePWAInstall();
  const themeClasses = getThemeClasses(theme);
  const smallItemClass = `text-left p-2 rounded-xl border flex items-center space-x-2 h-full cursor-pointer ${themeClasses.cardBg} ${themeClasses.activeToolHover}`;

  return (
    <div className="relative shrink-0" ref={menuRef}>
      <button
        onClick={onToggleOpen}
        className={`px-2 h-7 rounded-md text-xs font-bold flex items-center gap-1 border shrink-0 cursor-pointer ${
          isOpen
            ? themeClasses.activeTool
            : `${themeClasses.cardBg} ${themeClasses.activeToolHover}`
        }`}
        title="機能メニュー"
      >
        <Sliders className={`w-3.5 h-3.5 shrink-0 ${themeClasses.accentText}`} />
        <span className="font-bold leading-none">機能</span>
        <span
          className={`text-[9px] opacity-70 leading-none ${
            isOpen ? 'rotate-180' : ''
          }`}
        >
          ▾
        </span>
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <>
          {/* Click-away backdrop rendered at root stacking context above drawers */}
          <div
            className="fixed inset-0 z-50 bg-black/75"
            onClick={onClose}
          />
          <div
            ref={panelRef}
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            style={{
              maxHeight: 'calc(100dvh - 56px - env(safe-area-inset-top, 0px))',
              paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
            }}
            className={`fixed right-1 sm:right-3 top-[calc(2.65rem+env(safe-area-inset-top,0px))] w-[calc(100vw-8px)] sm:w-[460px] md:w-[480px] overflow-y-auto overscroll-contain rounded-xl border p-3 sm:p-3.5 z-[51] flex flex-col gap-3 shadow-xl ${themeClasses.modalBg}`}
          >
            {/* Menu Header */}
            <div className={`flex items-center justify-between px-0.5 pb-2 border-b ${themeClasses.border}`}>
              <div className="flex items-center space-x-2">
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold ${themeClasses.accentBtn}`}>
                  <Sliders className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold tracking-tight">機能メニュー</span>
              </div>
              <button
                onClick={onClose}
                className={`min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 p-1.5 rounded-lg flex items-center justify-center cursor-pointer ${themeClasses.textMuted} ${themeClasses.activeToolHover}`}
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
              className={`w-full text-left p-2.5 rounded-xl border flex items-center justify-between cursor-pointer group ${themeClasses.accentBadge} ${themeClasses.activeToolHover}`}
            >
              <div className="flex items-center space-x-2.5 min-w-0 flex-1 mr-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${themeClasses.accentBtn}`}>
                  <Download className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold truncate" title="フォントを出力 (OTF)">フォントを出力 (OTF)</div>
                  <div className="text-[10.5px] opacity-80 jp-wrap leading-tight">
                    インストール用・ダウンロード用フォントファイルの書き出し
                  </div>
                </div>
              </div>
              <span className={`text-xs font-bold pr-1 shrink-0 ${themeClasses.accentText}`}>
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
                className={`w-full md:hidden p-2 rounded-xl border text-left flex items-center justify-between cursor-pointer ${
                  showMetricsDrawer
                    ? themeClasses.activeTool
                    : `${themeClasses.cardBg} ${themeClasses.activeToolHover}`
                }`}
              >
                <div className="flex items-center space-x-2 min-w-0 flex-1 mr-2">
                  <SlidersHorizontal className={`w-4 h-4 shrink-0 ${themeClasses.accentText}`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold truncate" title="メトリクスパネル">メトリクスパネル</div>
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
                  <ToolMenuCard
                    icon={<Grid className="w-4 h-4" />}
                    title="ピクセルフォント"
                    description="ドット絵形式の作字・グリッド編集"
                    onClick={() => {
                      onOpenPixelStudio();
                      onClose();
                    }}
                    theme={theme}
                    themeClasses={themeClasses}
                  />
                )}

                {/* Radical / Parts */}
                <ToolMenuCard
                  icon={<Shapes className="w-4 h-4" />}
                  title="部首・パーツパレット"
                  description="214部首・偏旁冠脚の合成"
                  onClick={() => {
                    onOpenRadicalStudio();
                    onClose();
                  }}
                  theme={theme}
                  themeClasses={themeClasses}
                />

                {/* Custom Pen Creation */}
                {onOpenPenPresetsModal && (
                  <ToolMenuCard
                    icon={<Sliders className="w-4 h-4" />}
                    title="カスタムペン"
                    description="筆先形状・入り抜き・筆圧設定"
                    onClick={() => {
                      onOpenPenPresetsModal();
                      onClose();
                    }}
                    theme={theme}
                    themeClasses={themeClasses}
                  />
                )}

                {/* Image / Photo Trace */}
                <ToolMenuCard
                  icon={<Layers className="w-4 h-4" />}
                  title="下絵トレース"
                  description="手書きノートや画像からの輪郭抽出"
                  onClick={() => {
                    onOpenTraceModal();
                    onClose();
                  }}
                  theme={theme}
                  themeClasses={themeClasses}
                />

                {/* SVG Vectorizer Import */}
                <ToolMenuCard
                  icon={<FileCode className="w-4 h-4" />}
                  title="SVGインポート"
                  description="ベクター画像（SVG）のパス取り込み"
                  onClick={() => {
                    onOpenSvgModal();
                    onClose();
                  }}
                  span={2}
                  theme={theme}
                  themeClasses={themeClasses}
                />
              </div>
            </div>

            {/* Section 2: 自動化・フォント調整 */}
            <div className={`pt-1 border-t ${themeClasses.border}`}>
              <div className={`px-1 pb-1 text-[11px] font-bold uppercase tracking-wider ${themeClasses.textMuted}`}>
                自動化・フォント調整
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-0.5">
                {/* Glyph Synthesis */}
                {onOpenGlyphSynthesisModal && (
                  <ToolMenuCard
                    icon={<Wand2 className="w-4 h-4" />}
                    title="濁点・小書き合成"
                    description="清音から濁音・促音・拗音を一括生成"
                    onClick={() => {
                      onOpenGlyphSynthesisModal();
                      onClose();
                    }}
                    theme={theme}
                    themeClasses={themeClasses}
                  />
                )}

                {/* Batch Normalize */}
                <ToolMenuCard
                  icon={<Sliders className="w-4 h-4" />}
                  title="サイズ・太さ統一"
                  description="字面枠や線の太さの一括正規化"
                  onClick={() => {
                    onOpenBatchNormalizeModal();
                    onClose();
                  }}
                  accent="violet"
                  theme={theme}
                  themeClasses={themeClasses}
                />

                {/* Weight Interpolation */}
                {onOpenWeightInterpolationModal && (
                  <ToolMenuCard
                    icon={<Sliders className="w-4 h-4" />}
                    title="ウェイト補間"
                    description="太さの異なるファミリー書体を生成"
                    onClick={() => {
                      onOpenWeightInterpolationModal();
                      onClose();
                    }}
                    theme={theme}
                    themeClasses={themeClasses}
                  />
                )}

                {/* Kerning & Side Bearings */}
                {onOpenKerningModal && (
                  <ToolMenuCard
                    icon={<ArrowLeftRight className="w-4 h-4" />}
                    title="カーニング調整"
                    description="文字ペアの間隔・余白設定"
                    onClick={() => {
                      onOpenKerningModal();
                      onClose();
                    }}
                    theme={theme}
                    themeClasses={themeClasses}
                  />
                )}

                {/* Quality Check */}
                {onOpenQualityModal && (
                  <ToolMenuCard
                    icon={<ShieldCheck className="w-4 h-4" />}
                    title="品質チェック"
                    description="重複ノード・極点・パス交差の検査"
                    onClick={() => {
                      onOpenQualityModal();
                      onClose();
                    }}
                    theme={theme}
                    themeClasses={themeClasses}
                  />
                )}

                {/* Glyph Overlay Compare */}
                {onOpenGlyphCompareModal && (
                  <ToolMenuCard
                    icon={<Eye className="w-4 h-4" />}
                    title="グリフ比較"
                    description="複数文字の重ね合わせバランス確認"
                    onClick={() => {
                      onOpenGlyphCompareModal();
                      onClose();
                    }}
                    theme={theme}
                    themeClasses={themeClasses}
                  />
                )}

                {/* OpenType Features */}
                {onOpenOpenTypeFeaturesModal && (
                  <ToolMenuCard
                    icon={<FileCode className="w-4 h-4" />}
                    title="縦書き・合字"
                    description="縦書き用グリフと合字 (OpenType) 設定"
                    onClick={() => {
                      onOpenOpenTypeFeaturesModal();
                      onClose();
                    }}
                    theme={theme}
                    themeClasses={themeClasses}
                  />
                )}

                {/* Mojikumi Studio */}
                {onOpenMojikumiStudio && (
                  <ToolMenuCard
                    icon={<Type className="w-4 h-4" />}
                    title="文字組み・組版"
                    description="ベタ/ツメ/アケ比較・アキ量・禁則"
                    onClick={() => {
                      onOpenMojikumiStudio();
                      onClose();
                    }}
                    theme={theme}
                    themeClasses={themeClasses}
                  />
                )}

                {/* Grid Fitting */}
                {onOpenGridFittingModal && (
                  <ToolMenuCard
                    icon={<Grid className="w-4 h-4" />}
                    title="グリッド整列"
                    description="低解像度向けの自動ヒンティング"
                    onClick={() => {
                      onOpenGridFittingModal();
                      onClose();
                    }}
                    accent="amber"
                    theme={theme}
                    themeClasses={themeClasses}
                  />
                )}

                {/* JIS Progress Dashboard */}
                <ToolMenuCard
                  icon={<Award className="w-4 h-4" />}
                  title="JIS規格進捗"
                  description="常用・JIS第1・第2水準の達成率メーター"
                  onClick={() => {
                    openModal('jisProgress');
                    onClose();
                  }}
                  theme={theme}
                  themeClasses={themeClasses}
                />

                {/* IVS Variant Manager */}
                <ToolMenuCard
                  icon={<Layers className="w-4 h-4" />}
                  title="IVS 異体字管理"
                  description="辻・葛・辺などの異体字セレクタ"
                  onClick={() => {
                    openModal('ivsManager');
                    onClose();
                  }}
                  accent="purple"
                  theme={theme}
                  themeClasses={themeClasses}
                />
              </div>
            </div>

            {/* Section 3: ファイル・設定 */}
            <div className={`pt-1 border-t ${themeClasses.border}`}>
              <div className={`px-1 pb-1 text-[11px] font-bold uppercase tracking-wider ${themeClasses.textMuted}`}>
                ファイル・設定
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-0.5">
                <button
                  onClick={() => {
                    onTriggerImportTtf();
                    onClose();
                  }}
                  className={smallItemClass}
                >
                  <Upload className={`w-3.5 h-3.5 shrink-0 ${themeClasses.textMuted}`} />
                  <span className="text-xs font-medium truncate" title="フォント読込 (.ttf/.otf)">フォント読込 (.ttf/.otf)</span>
                </button>

                <button
                  onClick={() => {
                    onTriggerLoadProjectJson();
                    onClose();
                  }}
                  className={smallItemClass}
                >
                  <FolderOpen className={`w-3.5 h-3.5 shrink-0 ${themeClasses.textMuted}`} />
                  <span className="text-xs font-medium truncate" title="セーブ読込 (.json)">セーブ読込 (.json)</span>
                </button>

                <button
                  onClick={() => {
                    onSaveProjectJson();
                    onClose();
                  }}
                  className={smallItemClass}
                >
                  <Save className={`w-3.5 h-3.5 shrink-0 ${themeClasses.textMuted}`} />
                  <span className="text-xs font-medium truncate" title="セーブ保存 (.json)">セーブ保存 (.json)</span>
                </button>

                <button
                  onClick={() => {
                    onOpenFontInfoModal();
                    onClose();
                  }}
                  className={smallItemClass}
                >
                  <Scale className={`w-3.5 h-3.5 shrink-0 ${themeClasses.accentText}`} />
                  <span className="text-xs font-medium truncate" title="フォント情報・設定">フォント情報・設定</span>
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
                      <div className="text-xs font-medium truncate" title="保存管理・バックアップ">保存管理・バックアップ</div>
                      <div className={`text-[11px] truncate ${themeClasses.textMuted}`} title="ストレージ容量・履歴スナップショット">
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
                    <span className="text-xs font-medium truncate" title="ショートカット・操作ガイド">ショートカット・操作ガイド</span>
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
                  <Palette className={`w-3.5 h-3.5 shrink-0 ${themeClasses.accentText}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate" title="カラーテーマ・目の保護">カラーテーマ・目の保護</div>
                    <div className={`text-[11px] truncate ${themeClasses.textMuted}`} title={`現在のテーマ: ${getThemePreset(theme).name}`}>
                      現在のテーマ: {getThemePreset(theme).name}
                    </div>
                  </div>
                </button>
                {/* PWA install entry (the header install button is hidden below 640px) */}
                {!isInstalled && (
                  <div className={`${smallItemClass} col-span-2`}>
                    <Smartphone className={`w-3.5 h-3.5 shrink-0 ${themeClasses.accentText}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate" title="アプリとしてインストール">アプリとしてインストール</div>
                      <div className={`text-[11px] truncate ${themeClasses.textMuted}`} title="ホーム画面に追加してオフラインで使う">
                        ホーム画面に追加してオフラインで使う
                      </div>
                    </div>
                    <PWAInstallButton isLight={isLight} />
                  </div>
                )}
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
                    <span className="text-xs font-medium truncate" title={isFullscreen ? '全画面モードを解除 (Esc)' : '全画面モードで集中制作'}>
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
                className="w-full text-left px-2.5 py-1.5 text-xs rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center space-x-2 font-medium cursor-pointer"
              >
                <FilePlus className="w-3.5 h-3.5 shrink-0" />
                <span>新規プロジェクト作成</span>
              </button>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
};
