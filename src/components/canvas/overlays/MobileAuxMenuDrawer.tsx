import React from 'react';
import {
  Sliders,
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Square,
  Maximize,
  Minimize,
  CircleDot,
  Magnet,
  Grid,
  Shield,
  Trash2,
  Eye,
  EyeOff,
  RotateCcw,
  ArrowRightLeft,
} from 'lucide-react';
import { GridSettings, TraceSettings, GlyphOverlaySettings, PathContour, ToolMode } from '../../../types';

export interface MobileAuxMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isLight: boolean;
  zoom: number;
  handleZoomStep: (factor: number) => void;
  resetView: (target: '100%' | 'fit' | 'width') => void;
  isOutlineMode: boolean;
  setOutlineOnly: (val: boolean) => void;
  showCanvasToast: (msg: string, sub?: string) => void;
  onToggleZenMode?: () => void;
  isZenMode?: boolean;
  gridSettings: GridSettings;
  onChangeGridSettings?: React.Dispatch<React.SetStateAction<GridSettings>>;
  palmRejectionMode: 'auto' | 'strict_pen_only' | 'off';
  handleSetPalmRejectionMode: (mode: 'auto' | 'strict_pen_only' | 'off') => void;
  toolMode: ToolMode;
  selectedNodeId: string | null;
  selectedContourId: string | null;
  handleToggleNodeType: (contourId: string, nodeId: string) => void;
  handleDeleteSelectedNode: () => void;
  traceSettings: TraceSettings;
  onChangeTraceSettings?: React.Dispatch<React.SetStateAction<TraceSettings>>;
  handleResetTracePosition: () => void;
  onOpenGlyphCompareModal?: () => void;
  overlaySettings?: GlyphOverlaySettings;
  contours: PathContour[];
  handleClearAllContours: () => void;
}

export const MobileAuxMenuDrawer: React.FC<MobileAuxMenuDrawerProps> = React.memo(
  ({
    isOpen,
    onClose,
    isLight,
    zoom,
    handleZoomStep,
    resetView,
    isOutlineMode,
    setOutlineOnly,
    showCanvasToast,
    onToggleZenMode,
    isZenMode,
    gridSettings,
    onChangeGridSettings,
    palmRejectionMode,
    handleSetPalmRejectionMode,
    toolMode,
    selectedNodeId,
    selectedContourId,
    handleToggleNodeType,
    handleDeleteSelectedNode,
    traceSettings,
    onChangeTraceSettings,
    handleResetTracePosition,
    onOpenGlyphCompareModal,
    overlaySettings,
    contours,
    handleClearAllContours,
  }) => {
    if (!isOpen) return null;

    return (
      <div
        className="sm:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className={`w-full max-h-[82vh] overflow-y-auto rounded-t-2xl shadow-2xl border-t p-4 pb-8 space-y-4 animate-in slide-in-from-bottom duration-250 ${
            isLight ? 'bg-stone-50 border-stone-200 text-stone-800' : 'bg-[#152319] border-[#25382c] text-emerald-100'
          }`}
        >
          {/* Drawer Handle & Header */}
          <div className="flex flex-col items-center pb-2.5 border-b border-stone-200 dark:border-[#25382c]">
            <div className="w-10 h-1 bg-stone-300 dark:bg-stone-600 rounded-full mb-2" />
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="font-bold text-sm">キャンバス操作・補助メニュー</span>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-500 transition-colors"
                aria-label="閉じる"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Group 1: 表示 & ズーム倍率 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-stone-600 dark:text-emerald-400">
              <span>表示・ズーム倍率</span>
              <span className="font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800">
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

          {/* Group 2: 作図補助・ガイド */}
          <div className="space-y-2 pt-1 border-t border-stone-200 dark:border-[#25382c]">
            <div className="text-xs font-bold text-stone-600 dark:text-emerald-400">作図補助・ガイド</div>
            <div className="grid grid-cols-2 gap-2">
              {/* 照準ポインター切替 */}
              {onChangeGridSettings && (
                <button
                  onClick={() => {
                    const next = !gridSettings.showCursorCrosshair;
                    onChangeGridSettings((prev) => ({
                      ...prev,
                      showCursorCrosshair: next,
                      highContrastCursor: next,
                    }));
                    showCanvasToast(
                      next ? '照準ポインター・十字線: ON' : '照準ポインター・十字線: OFF',
                      next ? '高視認性照準リング＆十字線ガイドを表示' : 'OS標準の軽量カーソルのみ表示'
                    );
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-colors ${
                    gridSettings.showCursorCrosshair
                      ? isLight
                        ? 'bg-amber-50 border-amber-400 text-amber-950'
                        : 'bg-emerald-950 border-emerald-600 text-emerald-200'
                      : isLight
                      ? 'bg-white border-stone-200 text-stone-600 hover:bg-stone-100'
                      : 'bg-[#1a2b20] border-[#2a4030] text-stone-400 hover:bg-[#22382a]'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <CircleDot
                      className={`w-4 h-4 ${
                        gridSettings.showCursorCrosshair ? 'text-amber-600 dark:text-emerald-400' : 'text-stone-400'
                      }`}
                    />
                    <span>照準ポインター</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      gridSettings.showCursorCrosshair
                        ? 'bg-amber-600 text-white'
                        : 'bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300'
                    }`}
                  >
                    {gridSettings.showCursorCrosshair ? 'ON' : 'OFF'}
                  </span>
                </button>
              )}

              {/* スマートスナップ切替 */}
              {onChangeGridSettings && (
                <button
                  onClick={() => {
                    const next = !(gridSettings.snapToGrid || gridSettings.snapToGuides);
                    onChangeGridSettings((prev) => ({
                      ...prev,
                      snapToGrid: next,
                      snapToGuides: next,
                    }));
                    showCanvasToast(next ? 'スナップ: ON (吸着有効)' : 'スナップ: OFF (自由配置)');
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-colors ${
                    gridSettings.snapToGrid || gridSettings.snapToGuides
                      ? isLight
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900'
                        : 'bg-emerald-950 border-emerald-600 text-emerald-200'
                      : isLight
                      ? 'bg-white border-stone-200 text-stone-600 hover:bg-stone-100'
                      : 'bg-[#1a2b20] border-[#2a4030] text-stone-400 hover:bg-[#22382a]'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Magnet
                      className={`w-4 h-4 ${
                        gridSettings.snapToGrid || gridSettings.snapToGuides
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-stone-400'
                      }`}
                    />
                    <span>スナップ吸着</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      gridSettings.snapToGrid || gridSettings.snapToGuides
                        ? 'bg-emerald-600 text-white'
                        : 'bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300'
                    }`}
                  >
                    {gridSettings.snapToGrid || gridSettings.snapToGuides ? 'ON' : 'OFF'}
                  </span>
                </button>
              )}
            </div>

            {/* 方眼グリッド調整 */}
            {gridSettings.showGrid && onChangeGridSettings && (
              <div
                className={`p-3 rounded-xl border space-y-2 ${
                  isLight ? 'bg-white border-stone-200' : 'bg-[#1a2b20] border-[#2a4030]'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                    <Grid className="w-3.5 h-3.5" />
                    <span>方眼グリッドサイズ</span>
                  </span>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800">
                    {gridSettings.gridSize || 50}px
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onChangeGridSettings((prev) => {
                        const current = prev.gridSize || 50;
                        const step = current > 100 ? 10 : current <= 20 ? 2 : 5;
                        return { ...prev, gridSize: Math.max(5, current - step) };
                      })
                    }
                    className="w-7 h-7 rounded-lg flex items-center justify-center border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-bold"
                  >
                    -
                  </button>
                  <input
                    type="range"
                    min="5"
                    max="200"
                    step="5"
                    value={gridSettings.gridSize || 50}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      onChangeGridSettings((prev) => ({ ...prev, gridSize: val }));
                    }}
                    className="flex-1 h-2 bg-stone-200 dark:bg-stone-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      onChangeGridSettings((prev) => {
                        const current = prev.gridSize || 50;
                        const step = current >= 100 ? 10 : current < 20 ? 2 : 5;
                        return { ...prev, gridSize: Math.min(250, current + step) };
                      })
                    }
                    className="w-7 h-7 rounded-lg flex items-center justify-center border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-bold"
                  >
                    +
                  </button>
                </div>
                <div className="flex items-center gap-1.5 justify-between pt-1">
                  {[10, 25, 50, 100, 128].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => onChangeGridSettings((prev) => ({ ...prev, gridSize: size }))}
                      className={`flex-1 py-1 rounded text-[10px] font-mono font-bold border transition-colors ${
                        (gridSettings.gridSize || 50) === size
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-stone-100 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300'
                      }`}
                    >
                      {size}px
                    </button>
                  ))}
                </div>
              </div>
            )}

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
              {toolMode === 'node' && selectedNodeId && selectedContourId && (
                <>
                  <button
                    onClick={() => handleToggleNodeType(selectedContourId, selectedNodeId)}
                    className="p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border-sky-300 dark:border-sky-700"
                  >
                    <span>角 ⇄ スムーズ曲線</span>
                  </button>
                  <button
                    onClick={handleDeleteSelectedNode}
                    className="p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-700"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>選択ノード削除</span>
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
                  <span>グリフ重ね合わせ比較</span>
                </button>
              )}

              {/* Clear Contours */}
              {contours.length > 0 && (
                <button
                  onClick={handleClearAllContours}
                  className="p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-800"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                  <span>全パス消去 (Ctrl+Z可)</span>
                </button>
              )}
            </div>
          </div>

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
    );
  }
);
