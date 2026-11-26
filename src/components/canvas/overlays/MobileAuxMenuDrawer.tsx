import React from 'react';
import { createPortal } from 'react-dom';
import {
  Sliders,
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Square,
  Maximize,
  Minimize,
  Shield,
  Trash2,
  Eye,
  EyeOff,
  RotateCcw,
  ArrowRightLeft,
  Sparkles,
  Wand2,
  SkipBack,
  SkipForward,
} from 'lucide-react';
import { TraceSettings, GlyphOverlaySettings, PathContour, ToolMode } from '../../../types';
import { ThemeMode, getThemeClasses } from '../../../utils/theme';
import { DAKUTEN_MAPPINGS } from '../../../utils/dakutenHelper';
import { KANA_PAIRS } from '../../../data/unicodeTables';

export interface MobileAuxMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: ThemeMode;
  isLight: boolean;
  zoom: number;
  handleZoomStep: (factor: number) => void;
  resetView: (target: '100%' | 'fit' | 'width') => void;
  isOutlineMode: boolean;
  setOutlineOnly: (val: boolean) => void;
  showCanvasToast: (msg: string, sub?: string) => void;
  onToggleZenMode?: () => void;
  isZenMode?: boolean;
  palmRejectionMode: 'auto' | 'strict_pen_only' | 'off';
  handleSetPalmRejectionMode: (mode: 'auto' | 'strict_pen_only' | 'off') => void;
  toolMode: ToolMode;
  selectedNodeId: string | null;
  selectedNodeIds?: string[];
  selectedContourId: string | null;
  handleToggleNodeType: (contourId?: string, nodeId?: string) => void;
  handleDeleteSelectedNode: () => void;
  isGlyphLocked?: boolean;
  traceSettings: TraceSettings;
  onChangeTraceSettings?: React.Dispatch<React.SetStateAction<TraceSettings>>;
  handleResetTracePosition: () => void;
  onOpenGlyphCompareModal?: () => void;
  overlaySettings?: GlyphOverlaySettings;
  contours: PathContour[];
  handleClearAllContours: () => void;
  activeChar?: string;
  selectedUnicode?: number;
  onGenerateDakutenTarget?: (targetChar: string, isHandakuten?: boolean) => void;
  onDuplicateAsSmallKana?: (sourceUnicode: number) => void;
  onOpenGlyphSynthesisModal?: () => void;
  onSelectPrevUncompletedGlyph?: () => void;
  onSelectNextUncompletedGlyph?: () => void;
}

export const MobileAuxMenuDrawer: React.FC<MobileAuxMenuDrawerProps> = React.memo(
  ({
    isOpen,
    onClose,
    theme,
    isLight,
    zoom,
    handleZoomStep,
    resetView,
    isOutlineMode,
    setOutlineOnly,
    showCanvasToast,
    onToggleZenMode,
    isZenMode,
    palmRejectionMode,
    handleSetPalmRejectionMode,
    toolMode,
    selectedNodeId,
    selectedNodeIds,
    selectedContourId,
    handleToggleNodeType,
    handleDeleteSelectedNode,
    isGlyphLocked = false,
    traceSettings,
    onChangeTraceSettings,
    handleResetTracePosition,
    onOpenGlyphCompareModal,
    overlaySettings,
    contours,
    handleClearAllContours,
    activeChar,
    selectedUnicode,
    onGenerateDakutenTarget,
    onDuplicateAsSmallKana,
    onOpenGlyphSynthesisModal,
    onSelectPrevUncompletedGlyph,
    onSelectNextUncompletedGlyph,
  }) => {
    if (!isOpen || typeof document === 'undefined') return null;

    const themeClasses = getThemeClasses(theme || (isLight ? 'light' : 'dark'));
    const selectedNodeCount =
      selectedNodeIds && selectedNodeIds.length > 0 ? selectedNodeIds.length : selectedNodeId ? 1 : 0;
    const dakuInfo = activeChar ? DAKUTEN_MAPPINGS[activeChar] : undefined;
    const smallPair = activeChar ? KANA_PAIRS[activeChar] : undefined;
    const hasContours = contours.length > 0;

    return createPortal(
      <div className="sm:hidden fixed inset-0 z-50 flex flex-col justify-end">
        <div
          className="fixed inset-0 bg-black/75 anim-fade"
          onClick={onClose}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="キャンバス操作・補助メニュー"
          data-allow-native-scroll="true"
          onClick={(e) => e.stopPropagation()}
          className={`relative z-10 w-full max-h-[85dvh] flex flex-col overflow-hidden rounded-t-2xl shadow-2xl border-t anim-slide-up ${themeClasses.modalBg} ${themeClasses.border} ${themeClasses.textPrimary}`}
        >
          {/* Drawer Handle & Pinned Header */}
          <div className="flex flex-col items-center px-4 pt-3 pb-2.5 border-b border-stone-200 dark:border-[#25382c] shrink-0">
            <div className="w-10 h-1 bg-stone-300 dark:bg-stone-600 rounded mb-2" />
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="font-bold text-sm">キャンバス操作・補助メニュー</span>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-md hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-500 transition-colors"
                aria-label="閉じる"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y p-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] space-y-4">

          {/* Group 1: 表示 & ズーム倍率 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-stone-600 dark:text-emerald-400">
              <span>表示・ズーム倍率</span>
              <span className="font-mono tabular-nums text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800">
                {Math.round(zoom * 100)}%
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              <button
                onClick={() => handleZoomStep(1.25)}
                className={`py-2 px-1.5 rounded-lg border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-colors ${
                  isLight
                    ? 'bg-white border-stone-200 hover:bg-stone-100 text-stone-800'
                    : 'bg-[#1a2b20] border-[#2a4030] hover:bg-[#22382a] text-emerald-200'
                }`}
              >
                <ZoomIn className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>拡大 (+)</span>
              </button>
              <button
                onClick={() => handleZoomStep(1 / 1.25)}
                className={`py-2 px-1.5 rounded-lg border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-colors ${
                  isLight
                    ? 'bg-white border-stone-200 hover:bg-stone-100 text-stone-800'
                    : 'bg-[#1a2b20] border-[#2a4030] hover:bg-[#22382a] text-emerald-200'
                }`}
              >
                <ZoomOut className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>縮小 (-)</span>
              </button>
              <button
                onClick={() => resetView('100%')}
                className={`py-2 px-1.5 rounded-lg border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-colors ${
                  isLight
                    ? 'bg-white border-stone-200 hover:bg-stone-100 text-stone-800'
                    : 'bg-[#1a2b20] border-[#2a4030] hover:bg-[#22382a] text-emerald-200'
                }`}
              >
                <span className="font-mono text-sm leading-none mt-0.5">100%</span>
                <span>等倍</span>
              </button>
              <button
                onClick={() => resetView('fit')}
                className={`py-2 px-1.5 rounded-lg border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-colors ${
                  isLight
                    ? 'bg-white border-stone-200 hover:bg-stone-100 text-stone-800'
                    : 'bg-[#1a2b20] border-[#2a4030] hover:bg-[#22382a] text-emerald-200'
                }`}
              >
                <Maximize2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>全体表示</span>
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => resetView('width')}
                className={`py-2 px-1.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                  isLight
                    ? 'bg-white border-stone-200 hover:bg-stone-100 text-stone-800'
                    : 'bg-[#1a2b20] border-[#2a4030] hover:bg-[#22382a] text-emerald-200'
                }`}
              >
                <span>幅基準</span>
              </button>
              <button
                onClick={() => {
                  const next = !isOutlineMode;
                  setOutlineOnly(next);
                  showCanvasToast(next ? '輪郭表示モードを有効にしました' : '塗りつぶし表示モードに戻しました');
                }}
                className={`py-2 px-1.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                  isOutlineMode
                    ? 'bg-sky-500 text-white border-sky-600 font-bold'
                    : isLight
                    ? 'bg-white border-stone-200 hover:bg-stone-100 text-stone-800'
                    : 'bg-[#1a2b20] border-[#2a4030] hover:bg-[#22382a] text-emerald-200'
                }`}
              >
                <Square className={`w-3.5 h-3.5 ${isOutlineMode ? 'stroke-[2.5] fill-none' : 'stroke-1.5'}`} />
                <span>{isOutlineMode ? '輪郭中' : '輪郭表示'}</span>
              </button>
              {onToggleZenMode && (
                <button
                  onClick={onToggleZenMode}
                  className={`py-2 px-1.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                    isZenMode
                      ? 'bg-amber-400 text-stone-950 border-amber-500 font-bold'
                      : isLight
                      ? 'bg-white border-stone-200 hover:bg-stone-100 text-stone-800'
                      : 'bg-[#1a2b20] border-[#2a4030] hover:bg-[#22382a] text-emerald-200'
                  }`}
                >
                  {isZenMode ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
                  <span>{isZenMode ? '集中解除' : '集中モード'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Group 2: 作図補助 */}
          <div className="space-y-2 pt-1 border-t border-stone-200 dark:border-[#25382c]">
            <div className="text-xs font-bold text-stone-600 dark:text-emerald-400">作図補助</div>
            {/* パームリジェクション */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const nextMode =
                    palmRejectionMode === 'auto'
                      ? 'strict_pen_only'
                      : palmRejectionMode === 'strict_pen_only'
                      ? 'off'
                      : 'auto';
                  handleSetPalmRejectionMode(nextMode);
                  showCanvasToast(
                    `パームリジェクション: ${
                      nextMode === 'auto'
                        ? '自動検知（手のひら無効化）'
                        : nextMode === 'strict_pen_only'
                        ? 'ペン専用（指作図無効）'
                        : 'OFF（タッチ有効）'
                    }`
                  );
                }}
                className={`flex-1 p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                  palmRejectionMode === 'strict_pen_only'
                    ? isLight
                      ? 'bg-amber-100 text-amber-950 border-amber-300'
                      : 'bg-amber-950 text-amber-300 border-amber-700'
                    : palmRejectionMode === 'auto'
                    ? isLight
                      ? 'bg-emerald-50 text-emerald-950 border-emerald-300'
                      : 'bg-[#16251b] text-emerald-300 border-emerald-700'
                    : isLight
                    ? 'bg-white text-stone-600 border-stone-200'
                    : 'bg-[#1a2b20] text-stone-400 border-[#2a4030]'
                }`}
              >
                <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>
                  手のひら誤作図防止:{' '}
                  {palmRejectionMode === 'strict_pen_only' ? 'ペン専用' : palmRejectionMode === 'auto' ? '自動検知' : 'OFF'}
                </span>
              </button>
            </div>
          </div>

          {/* Group 3: ツール補助 & アクション */}
          <div className="space-y-2 pt-1 border-t border-stone-200 dark:border-[#25382c]">
            <div className="text-xs font-bold text-stone-600 dark:text-emerald-400">編集・管理アクション</div>
            <div className="grid grid-cols-2 gap-2">
              {/* Node Edit buttons if in node tool */}
              {toolMode === 'node' && selectedNodeCount > 0 && (
                <>
                  <button
                    disabled={isGlyphLocked}
                    onClick={() =>
                      handleToggleNodeType(
                        selectedNodeCount > 1 ? undefined : selectedContourId || undefined,
                        selectedNodeCount > 1 ? undefined : selectedNodeId || undefined
                      )
                    }
                    className={`p-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border-sky-300 dark:border-sky-700 ${
                      isGlyphLocked ? 'opacity-45 cursor-not-allowed' : ''
                    }`}
                  >
                    <span>{selectedNodeCount > 1 ? `角⇄曲線 (${selectedNodeCount}点)` : '角 ⇄ スムーズ曲線'}</span>
                  </button>
                  <button
                    disabled={isGlyphLocked}
                    onClick={handleDeleteSelectedNode}
                    className={`p-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-700 ${
                      isGlyphLocked ? 'opacity-45 cursor-not-allowed' : ''
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{selectedNodeCount > 1 ? `選択削除 (${selectedNodeCount}点)` : '選択ノード削除'}</span>
                  </button>
                </>
              )}

              {/* Trace adjust */}
              {traceSettings.enabled && onChangeTraceSettings && (
                <button
                  onClick={() =>
                    onChangeTraceSettings((s) => ({
                      ...s,
                      opacity: s.opacity > 0.1 ? 0.05 : 0.4,
                    }))
                  }
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 ${
                    isLight ? 'bg-white border-stone-200 text-stone-800' : 'bg-[#1a2b20] border-[#2a4030] text-emerald-200'
                  }`}
                >
                  {traceSettings.opacity > 0.1 ? (
                    <Eye className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-stone-400" />
                  )}
                  <span>下絵濃淡切替</span>
                </button>
              )}

              {/* Reset Trace Pos */}
              {traceSettings.enabled && (traceSettings.offsetX !== 0 || traceSettings.offsetY !== 0) && onChangeTraceSettings && (
                <button
                  onClick={handleResetTracePosition}
                  className="p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 bg-amber-500 text-stone-950 border-amber-600"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>下絵位置リセット</span>
                </button>
              )}

              {/* Glyph Compare */}
              {onOpenGlyphCompareModal && (
                <button
                  onClick={onOpenGlyphCompareModal}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 ${
                    overlaySettings?.enabled
                      ? 'bg-sky-500 text-white border-sky-600'
                      : isLight
                      ? 'bg-white border-stone-200 text-stone-800'
                      : 'bg-[#1a2b20] border-[#2a4030] text-emerald-200'
                  }`}
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  <span className="max-sm:hidden">グリフ重ね合わせ比較</span>
                  <span className="hidden max-sm:inline">重ね合わせ比較</span>
                </button>
              )}

              {/* Clear Contours */}
              {contours.length > 0 && (
                <button
                  disabled={isGlyphLocked}
                  onClick={handleClearAllContours}
                  className={`p-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-800 ${
                    isGlyphLocked ? 'opacity-45 cursor-not-allowed' : ''
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                  <span className="max-sm:hidden">全パス消去 (Ctrl+Z可)</span>
                  <span className="hidden max-sm:inline">全パス消去</span>
                </button>
              )}

              {/* Prev / Next Uncompleted Glyph Navigation */}
              {onSelectPrevUncompletedGlyph && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectPrevUncompletedGlyph();
                    onClose();
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 ${
                    isLight ? 'bg-white border-stone-200 text-stone-800' : 'bg-[#1a2b20] border-[#2a4030] text-emerald-200'
                  }`}
                >
                  <SkipBack className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>前の未作成へ</span>
                </button>
              )}
              {onSelectNextUncompletedGlyph && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectNextUncompletedGlyph();
                    onClose();
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 ${
                    isLight ? 'bg-white border-stone-200 text-stone-800' : 'bg-[#1a2b20] border-[#2a4030] text-emerald-200'
                  }`}
                >
                  <SkipForward className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>次の未作成へ</span>
                </button>
              )}
            </div>
          </div>

          {/* Group 4: かな合成 (濁音・半濁音・小書き文字) */}
          {(onOpenGlyphSynthesisModal ||
            (dakuInfo?.type === 'seion' && onGenerateDakutenTarget) ||
            (smallPair && onDuplicateAsSmallKana && selectedUnicode !== undefined)) && (
            <div className="space-y-2 pt-1 border-t border-stone-200 dark:border-[#25382c]">
              <div className="text-xs font-bold text-stone-600 dark:text-emerald-400">
                かな自動合成（濁点・小書き）
              </div>
              <div className="grid grid-cols-2 gap-2">
                {dakuInfo?.type === 'seion' && dakuInfo.daku && onGenerateDakutenTarget && (
                  <button
                    type="button"
                    disabled={!hasContours}
                    onClick={() => {
                      onGenerateDakutenTarget(dakuInfo.daku!, false);
                      onClose();
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 bg-amber-50 text-amber-900 dark:bg-amber-950/70 dark:text-amber-200 border-amber-300 dark:border-amber-800 ${
                      !hasContours ? 'opacity-45 cursor-not-allowed' : ''
                    }`}
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>＋濁点「{dakuInfo.daku}」</span>
                  </button>
                )}

                {dakuInfo?.type === 'seion' && dakuInfo.handaku && onGenerateDakutenTarget && (
                  <button
                    type="button"
                    disabled={!hasContours}
                    onClick={() => {
                      onGenerateDakutenTarget(dakuInfo.handaku!, true);
                      onClose();
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 bg-rose-50 text-rose-900 dark:bg-rose-950/70 dark:text-rose-200 border-rose-300 dark:border-rose-800 ${
                      !hasContours ? 'opacity-45 cursor-not-allowed' : ''
                    }`}
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>＋半濁点「{dakuInfo.handaku}」</span>
                  </button>
                )}

                {smallPair && onDuplicateAsSmallKana && selectedUnicode !== undefined && (
                  <button
                    type="button"
                    disabled={!hasContours}
                    onClick={() => {
                      onDuplicateAsSmallKana(selectedUnicode);
                      onClose();
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 bg-indigo-50 text-indigo-900 dark:bg-indigo-950/70 dark:text-indigo-200 border-indigo-300 dark:border-indigo-800 ${
                      !hasContours ? 'opacity-45 cursor-not-allowed' : ''
                    }`}
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>小書き「{smallPair.smallChar}」生成</span>
                  </button>
                )}

                {onOpenGlyphSynthesisModal && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenGlyphSynthesisModal();
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700 ${
                      !(dakuInfo?.type === 'seion' || smallPair) ? 'col-span-2' : ''
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>濁点・小書き一括合成</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Close button */}
          <div className="pt-2">
            <button
              onClick={onClose}
              className={`w-full py-3 rounded-xl text-xs font-bold transition-colors ${
                isLight ? 'bg-stone-200 hover:bg-stone-300 text-stone-800' : 'bg-[#1f3526] hover:bg-[#284532] text-emerald-200'
              }`}
            >
              メニューを閉じる
            </button>
          </div>
          </div>
        </div>
      </div>,
      document.body
    );
  }
);
