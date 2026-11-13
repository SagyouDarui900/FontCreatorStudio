import React from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  SkipBack,
  SkipForward,
  Maximize2,
  Minimize,
  Maximize,
  Grid,
  Magnet,
  Square,
  ArrowRightLeft,
  RotateCcw,
  Trash2,
  Crosshair,
  Shield,
  ShieldCheck,
  PenTool,
  Eye,
  EyeOff,
  ZoomIn,
  ZoomOut,
  Ruler,
  Move,
  HelpCircle,
  Lock,
  Undo,
  Redo,
  SlidersHorizontal,
} from 'lucide-react';
import {
  ToolMode,
  GridSettings,
  TraceSettings,
  GlyphOverlaySettings,
  PathContour,
  Point,
  RulerMeasurement,
} from '../../../types';
import { GuideAssistOverlay } from './GuideAssistOverlay';

export interface CanvasStatusBarProps {
  isLight: boolean;
  toolMode: ToolMode;
  onSetToolMode?: (mode: ToolMode) => void;
  isSpacePressed: boolean;
  hoverCanvasPos: Point | null;
  activeChar?: string;
  selectedUnicode?: number;
  onSelectPrevGlyph?: () => void;
  onSelectNextGlyph?: () => void;
  onSelectPrevUncompletedGlyph?: () => void;
  onSelectNextUncompletedGlyph?: () => void;
  isGlyphLocked?: boolean;
  rulerMeasurement?: RulerMeasurement | null;
  setRulerMeasurement?: (val: RulerMeasurement | null) => void;
  handleDrawRulerAsStroke?: () => void;
  handleConvertRulerToGuideline?: () => void;
  selectedNodeId?: string | null;
  selectedNodeIds?: string[];
  selectedContourId?: string | null;
  handleDeleteSelectedNode?: () => void;
  handleToggleNodeType?: (contourId?: string, nodeId?: string) => void;
  setIsMobileAuxMenuOpen: (val: boolean) => void;
  resetView: (mode?: 'fit' | 'width' | '100%') => void;
  handleZoomStep: (delta: number) => void;
  zoom: number;
  onChangeGridSettings?: (updater: (prev: GridSettings) => GridSettings) => void;
  gridSettings: GridSettings;
  showCanvasToast: (msg: string, desc?: string) => void;
  palmRejectionMode: 'auto' | 'strict_pen_only' | 'off';
  handleSetPalmRejectionMode: (mode: 'auto' | 'strict_pen_only' | 'off') => void;
  isStylusActive?: boolean;
  liveStylusPressure?: number | null;
  pressureSensitivity?: 'high' | 'normal' | 'low' | 'off';
  onChangePressureSensitivity?: (val: 'high' | 'normal' | 'low' | 'off') => void;
  showQuickGridSlider: boolean;
  setShowQuickGridSlider: (val: boolean | ((prev: boolean) => boolean)) => void;
  quickGridSliderRef: React.RefObject<HTMLDivElement | null>;
  traceSettings: TraceSettings;
  onChangeTraceSettings?: React.Dispatch<React.SetStateAction<TraceSettings>>;
  handleResetTracePosition: () => void;
  contours?: PathContour[];
  isOutlineMode: boolean;
  setOutlineOnly: (val: boolean) => void;
  onOpenGlyphCompareModal?: () => void;
  overlaySettings?: GlyphOverlaySettings;
  onToggleZenMode?: () => void;
  isZenMode?: boolean;
  showGuideAssist: boolean;
  handleToggleGuideAssist: (show?: boolean) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

const TOOL_LABELS: Partial<Record<ToolMode, string>> = {
  select: '選択',
  node: 'ノード',
  pen: 'ペン',
  brush: '筆ブラシ',
  eraser: '消去',
  ruler: '定規',
  hand: '手のひら',
  rect: '四角形',
  square: '正方形',
  ellipse: '楕円',
  circle: '正円',
  rounded_rect: '角丸四角',
  triangle: '三角形',
  triangle_down: '下向き三角',
  right_triangle: '直角三角',
  semicircle: '半円',
  ring: 'リング',
  pill: 'カプセル',
  parallelogram: '平行四辺形',
  crescent: '三日月',
  star: '星型',
  heart: 'ハート',
  sparkle: '4芒星',
  starburst: '8芒星',
  diamond: '菱形',
  polygon: '多角形',
  trace_adjust: '下絵調整',
};

export const CanvasStatusBar: React.FC<CanvasStatusBarProps> = React.memo(({
  isLight,
  toolMode,
  onSetToolMode,
  isSpacePressed,
  hoverCanvasPos,
  activeChar = '',
  selectedUnicode,
  onSelectPrevGlyph,
  onSelectNextGlyph,
  onSelectPrevUncompletedGlyph,
  onSelectNextUncompletedGlyph,
  isGlyphLocked = false,
  rulerMeasurement,
  setRulerMeasurement,
  handleDrawRulerAsStroke,
  handleConvertRulerToGuideline,
  selectedNodeId,
  selectedNodeIds,
  selectedContourId,
  handleDeleteSelectedNode,
  handleToggleNodeType,
  setIsMobileAuxMenuOpen,
  resetView,
  handleZoomStep,
  zoom,
  onChangeGridSettings,
  gridSettings,
  showCanvasToast,
  palmRejectionMode,
  handleSetPalmRejectionMode,
  isStylusActive,
  liveStylusPressure,
  pressureSensitivity,
  onChangePressureSensitivity,
  showQuickGridSlider,
  setShowQuickGridSlider,
  quickGridSliderRef,
  traceSettings,
  onChangeTraceSettings,
  handleResetTracePosition,
  contours,
  isOutlineMode,
  setOutlineOnly,
  onOpenGlyphCompareModal,
  overlaySettings,
  onToggleZenMode,
  isZenMode,
  showGuideAssist,
  handleToggleGuideAssist,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}) => {
  const isShapeTool = [
    'rect',
    'square',
    'ellipse',
    'circle',
    'rounded_rect',
    'triangle',
    'triangle_down',
    'right_triangle',
    'semicircle',
    'ring',
    'pill',
    'parallelogram',
    'crescent',
    'star',
    'heart',
    'sparkle',
    'starburst',
    'diamond',
    'polygon',
  ].includes(toolMode);

  const selectedNodeCount =
    selectedNodeIds && selectedNodeIds.length > 0 ? selectedNodeIds.length : selectedNodeId ? 1 : 0;

  const unicodeHex =
    selectedUnicode !== undefined
      ? `U+${selectedUnicode.toString(16).toUpperCase().padStart(4, '0')}`
      : '';

  const barSurface = isLight
    ? 'bg-[#f4f8f5] border-[#c8ded3] text-stone-700'
    : 'bg-[#0f1712] border-[#223328] text-emerald-100';

  const iconBtnClass = isLight
    ? 'hover:bg-emerald-100/70 text-stone-700'
    : 'hover:bg-emerald-900/50 text-emerald-200';

  return (
    <div
      className={`relative w-full h-8 border-t shrink-0 z-30 select-none flex items-center justify-between px-1.5 sm:px-2 gap-1.5 text-[11px] overflow-visible ${barSurface}`}
    >
      {/* Popover: Guide Legend anchored above status bar (shared for desktop & mobile) */}
      {showGuideAssist && (
        <GuideAssistOverlay
          showGuideAssist={showGuideAssist}
          handleToggleGuideAssist={handleToggleGuideAssist}
          isLight={isLight}
          activeChar={activeChar}
          traceSettings={traceSettings}
          handleResetTracePosition={handleResetTracePosition}
          onSetToolMode={onSetToolMode}
          onChangeTraceSettings={onChangeTraceSettings}
          showCanvasToast={showCanvasToast}
        />
      )}

      {/* ==================== DESKTOP DOCKED STATUS BAR ==================== */}
      <div className="hidden sm:flex items-center justify-between w-full min-w-0 gap-2 overflow-visible">
        {/* Left: Glyph Identity, Navigation, Contour Count, Lock Badge */}
        <div className="flex items-center gap-1 shrink-0">
          {activeChar && (
            <span
              className={`w-5 h-5 flex items-center justify-center rounded border text-xs font-bold shrink-0 ${
                isLight
                  ? 'bg-white border-emerald-200 text-stone-900'
                  : 'bg-[#17261c] border-emerald-800/70 text-emerald-100'
              }`}
              title={`選択中の文字: ${activeChar}`}
            >
              {activeChar}
            </span>
          )}
          {unicodeHex && (
            <span className="hidden md:inline font-mono text-[10px] tabular-nums text-stone-500 dark:text-emerald-400/80 px-0.5">
              {unicodeHex}
            </span>
          )}
          {(onSelectPrevGlyph || onSelectNextGlyph) && (
            <div className="flex items-center">
              <button
                type="button"
                onClick={onSelectPrevGlyph}
                className={`h-6 w-5 flex items-center justify-center rounded transition-colors ${iconBtnClass}`}
                title="前の文字 ([ または Alt+←)"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onSelectNextGlyph}
                className={`h-6 w-5 flex items-center justify-center rounded transition-colors ${iconBtnClass}`}
                title="次の文字 (] または Alt+→)"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          {(onSelectPrevUncompletedGlyph || onSelectNextUncompletedGlyph) && (
            <div className="hidden lg:flex items-center">
              <button
                type="button"
                onClick={onSelectPrevUncompletedGlyph}
                className={`h-6 px-1 flex items-center justify-center rounded text-[10px] font-semibold transition-colors ${iconBtnClass}`}
                title="前の未作成グリフへ移動"
              >
                <SkipBack className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={onSelectNextUncompletedGlyph}
                className={`h-6 px-1 flex items-center justify-center rounded text-[10px] font-semibold transition-colors ${iconBtnClass}`}
                title="次の未作成グリフへ移動"
              >
                <SkipForward className="w-3 h-3" />
              </button>
            </div>
          )}

          <div className="h-3.5 w-[1px] bg-stone-300 dark:bg-emerald-800/80 mx-0.5" />

          <span className="font-mono text-[10px] tabular-nums opacity-80 shrink-0">
            {contours?.length ?? 0}パス
          </span>

          {isGlyphLocked && (
            <span
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/40 text-[10px] font-bold shrink-0"
              title="この文字はロック中のため編集できません"
            >
              <Lock className="w-2.5 h-2.5" />
              <span>ロック</span>
            </span>
          )}
        </div>

        {/* Center: Active Tool, Cursor Coordinates, Contextual Actions & Hints */}
        <div className="flex-1 min-w-0 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <div className="h-3.5 w-[1px] bg-stone-300 dark:bg-emerald-800/80 shrink-0" />

          <div className="flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-400 shrink-0">
            <span>{TOOL_LABELS[toolMode] || toolMode}</span>
            {isSpacePressed && (
              <span className="text-[10px] font-normal text-emerald-500">(Space)</span>
            )}
          </div>

          <div className="font-mono text-[10.5px] tabular-nums shrink-0 min-w-[96px]">
            {hoverCanvasPos ? (
              <span>
                X:<strong className="text-emerald-700 dark:text-emerald-300 ml-0.5">{hoverCanvasPos.x}</strong>{' '}
                Y:<strong className="text-emerald-700 dark:text-emerald-300 ml-0.5">{hoverCanvasPos.y}</strong>
              </span>
            ) : (
              <span className="opacity-45">X: --- Y: ---</span>
            )}
          </div>

          {/* Ruler quick actions */}
          {rulerMeasurement ? (
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDrawRulerAsStroke?.();
                }}
                disabled={isGlyphLocked}
                className={`h-5 px-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold flex items-center gap-1 transition-colors ${
                  isGlyphLocked ? 'opacity-45 cursor-not-allowed' : ''
                }`}
                title="定規で測ったラインを直線ストロークとして作成 (Enter)"
              >
                <PenTool className="w-2.5 h-2.5" />
                <span>直線化 (Enter)</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleConvertRulerToGuideline?.();
                }}
                className="h-5 px-1.5 rounded bg-sky-600 hover:bg-sky-700 text-white text-[10px] font-bold flex items-center gap-1 transition-colors"
                title="定規の位置にガイド線を作成"
              >
                <Ruler className="w-2.5 h-2.5" />
                <span>ガイド線</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setRulerMeasurement?.(null);
                }}
                className="h-5 px-1.5 rounded bg-stone-200 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-[10px] font-bold flex items-center gap-0.5 transition-colors"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ) : toolMode === 'node' && selectedNodeCount > 0 ? (
            <div className="flex items-center gap-1 shrink-0">
              <Crosshair className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              {selectedNodeCount > 1 && (
                <span className="font-mono text-[10px] tabular-nums font-bold text-emerald-700 dark:text-emerald-300">
                  {selectedNodeCount}点選択
                </span>
              )}
              <button
                type="button"
                disabled={isGlyphLocked}
                onClick={() =>
                  handleToggleNodeType?.(
                    selectedNodeCount > 1 ? undefined : selectedContourId || undefined,
                    selectedNodeCount > 1 ? undefined : selectedNodeId || undefined
                  )
                }
                className={`h-5 px-1.5 rounded text-[10px] bg-sky-100 hover:bg-sky-200 dark:bg-sky-950 dark:hover:bg-sky-900 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-700 font-bold transition-colors ${
                  isGlyphLocked ? 'opacity-45 cursor-not-allowed' : ''
                }`}
                title="角 ⇄ スムーズ曲線を切替"
              >
                角⇄曲線
              </button>
              <button
                type="button"
                disabled={isGlyphLocked}
                onClick={() => handleDeleteSelectedNode?.()}
                className={`h-5 px-1.5 rounded text-[10px] bg-rose-100 hover:bg-rose-200 dark:bg-rose-950 dark:hover:bg-rose-900 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700 font-bold flex items-center gap-0.5 transition-colors ${
                  isGlyphLocked ? 'opacity-45 cursor-not-allowed' : ''
                }`}
                title="選択頂点を削除 (Delete)"
              >
                <Trash2 className="w-2.5 h-2.5" />
                <span>削除</span>
              </button>
            </div>
          ) : toolMode === 'trace_adjust' ? (
            <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 shrink-0">
              <Move className="w-3 h-3" />
              <span>ドラッグして下絵位置を移動</span>
            </div>
          ) : (
            <div className="hidden xl:flex items-center text-[10px] opacity-65 truncate">
              {toolMode === 'ruler' && 'ドラッグ計測 (Shift: 15° / Enter: 直線化)'}
              {toolMode === 'select' && '輪郭選択 (ドラッグ移動 / Shift: 複数選択)'}
              {toolMode === 'node' && '頂点ドラッグ / 線上クリックで追加 / Alt: 角切替'}
              {toolMode === 'pen' && 'クリック: 頂点 / ドラッグ: ハンドル / 始点: 閉じる'}
              {toolMode === 'brush' && 'ドラッグ描画 (Shift: 水平垂直直線)'}
              {toolMode === 'eraser' && 'ドラッグ消去'}
              {toolMode === 'hand' && 'ドラッグで表示領域を移動 (Space+ドラッグ)'}
              {isShapeTool && 'ドラッグ作成 (Shift: 正比率 / Alt: 中心基準)'}
            </div>
          )}
        </div>

        {/* Right: Palm Rejection, Grid Slider, Snap, Trace, Outline, Compare, Zen, Guide Legend, Zoom */}
        <div className="flex items-center gap-1 shrink-0 overflow-visible">
          {/* Palm Rejection */}
          <button
            type="button"
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
                    ? '自動検知'
                    : nextMode === 'strict_pen_only'
                    ? 'ペン専用'
                    : 'OFF'
                }`
              );
            }}
            className={`hidden lg:inline-flex h-6 px-1.5 rounded text-[10px] font-bold items-center gap-1 border transition-colors ${
              palmRejectionMode === 'strict_pen_only'
                ? isLight
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-amber-950/80 text-amber-300 border-amber-700'
                : palmRejectionMode === 'auto'
                ? isLight
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                  : 'bg-[#16251b] text-emerald-300 border-emerald-700'
                : isLight
                ? 'bg-stone-100 text-stone-500 border-stone-300'
                : 'bg-stone-900 text-stone-500 border-stone-800'
            }`}
            title="パームリジェクション切替"
          >
            {palmRejectionMode === 'strict_pen_only' ? (
              <ShieldCheck className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            ) : (
              <Shield className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            )}
            <span>
              {palmRejectionMode === 'strict_pen_only'
                ? 'ペン専用'
                : palmRejectionMode === 'auto'
                ? 'パーム検知'
                : 'タッチ可'}
            </span>
          </button>

          {/* Stylus Active Indicator */}
          {isStylusActive && (
            <div
              className={`hidden xl:flex h-6 px-1.5 rounded text-[10px] font-bold items-center gap-1 border ${
                isLight
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                  : 'bg-[#16251b] text-emerald-300 border-emerald-700'
              }`}
              title="Apple Pencil / スタイラス入力検知中"
            >
              <span>Pencil</span>
              {liveStylusPressure !== null && (
                <span className="font-mono tabular-nums text-[9.5px] bg-emerald-200/60 dark:bg-emerald-900/60 px-1 rounded">
                  {liveStylusPressure}%
                </span>
              )}
              {onChangePressureSensitivity && (
                <div className="flex items-center gap-0.5 border-l border-emerald-300/60 dark:border-emerald-700/60 pl-1">
                  {(['high', 'normal', 'low', 'off'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => onChangePressureSensitivity(s)}
                      className={`px-1 text-[9px] rounded font-medium ${
                        pressureSensitivity === s
                          ? isLight
                            ? 'bg-emerald-700 text-white font-bold'
                            : 'bg-emerald-400 text-stone-950 font-bold'
                          : 'opacity-60 hover:opacity-100'
                      }`}
                    >
                      {s === 'high' ? '高' : s === 'normal' ? '標' : s === 'low' ? '弱' : '切'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Grid Size Popover */}
          {gridSettings.showGrid && onChangeGridSettings && (
            <div className="relative" ref={quickGridSliderRef}>
              <button
                type="button"
                onClick={() => setShowQuickGridSlider((prev) => !prev)}
                className={`h-6 flex items-center gap-1 px-1.5 rounded border text-[10.5px] font-mono tabular-nums font-semibold transition-colors ${
                  showQuickGridSlider
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : isLight
                    ? 'bg-white hover:bg-emerald-50 border-emerald-300 text-emerald-900'
                    : 'bg-[#17261c] hover:bg-emerald-900 border-emerald-700 text-emerald-200'
                }`}
                title="グリッドサイズ変更 (Alt +/-)"
              >
                <Grid className="w-3 h-3" />
                <span>{gridSettings.gridSize || 50}px</span>
              </button>

              {showQuickGridSlider && (
                <div
                  className={`absolute bottom-full mb-1.5 right-0 w-60 p-2.5 rounded-lg border shadow-xl z-50 ${
                    isLight
                      ? 'bg-white border-[#c8ded3] text-stone-800'
                      : 'bg-[#152119] border-[#25382c] text-emerald-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-xs flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                      <Grid className="w-3.5 h-3.5" />
                      <span>グリッドサイズ</span>
                    </span>
                    <span className="font-mono tabular-nums font-bold text-xs px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800">
                      {gridSettings.gridSize || 50}px
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          onChangeGridSettings((prev) => {
                            const current = prev.gridSize || 50;
                            const step = current > 100 ? 10 : current <= 20 ? 2 : 5;
                            return { ...prev, gridSize: Math.max(5, current - step) };
                          })
                        }
                        className="w-6 h-6 rounded flex items-center justify-center border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-bold shrink-0"
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
                        className="flex-1 h-1.5 bg-stone-200 dark:bg-stone-700 rounded appearance-none cursor-pointer accent-emerald-600"
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
                        className="w-6 h-6 rounded flex items-center justify-center border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-bold shrink-0"
                      >
                        +
                      </button>
                    </div>
                    <div className="flex items-center gap-1 justify-between">
                      {[10, 25, 50, 100, 128].map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() =>
                            onChangeGridSettings((prev) => ({ ...prev, gridSize: size }))
                          }
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono tabular-nums font-bold border transition-colors ${
                            (gridSettings.gridSize || 50) === size
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-stone-100 dark:bg-stone-800 border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-300'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Snap Toggle */}
          {onChangeGridSettings && (
            <button
              type="button"
              onClick={() => {
                const next = !(gridSettings.snapToGrid || gridSettings.snapToGuides);
                onChangeGridSettings((prev) => ({
                  ...prev,
                  snapToGrid: next,
                  snapToGuides: next,
                }));
                showCanvasToast(next ? 'スナップ: ON' : 'スナップ: OFF');
              }}
              title={`スマートスナップ [S]: ${gridSettings.snapToGrid || gridSettings.snapToGuides ? 'ON' : 'OFF'}`}
              className={`h-6 px-1.5 rounded transition-colors flex items-center gap-1 font-bold text-[10.5px] ${
                gridSettings.snapToGrid || gridSettings.snapToGuides
                  ? 'bg-emerald-600 text-white'
                  : iconBtnClass
              }`}
            >
              <Magnet className="w-3 h-3" />
              <span className="hidden lg:inline">スナップ</span>
            </button>
          )}

          {/* Trace Opacity / Reset */}
          {traceSettings.enabled && onChangeTraceSettings && (
            <button
              type="button"
              onClick={() =>
                onChangeTraceSettings((s) => ({
                  ...s,
                  opacity: s.opacity > 0.1 ? 0.05 : 0.4,
                }))
              }
              title="下絵の濃淡を切り替え"
              className={`h-6 w-6 flex items-center justify-center rounded transition-colors ${iconBtnClass}`}
            >
              {traceSettings.opacity > 0.1 ? (
                <Eye className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <EyeOff className="w-3.5 h-3.5 opacity-60" />
              )}
            </button>
          )}
          {traceSettings.enabled &&
            (traceSettings.offsetX !== 0 || traceSettings.offsetY !== 0) &&
            onChangeTraceSettings && (
              <button
                type="button"
                onClick={handleResetTracePosition}
                title="下絵位置を中央にリセット"
                className="h-6 px-1.5 rounded text-[10px] font-bold flex items-center gap-0.5 bg-amber-500 hover:bg-amber-400 text-stone-950 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span className="hidden xl:inline">下絵戻す</span>
              </button>
            )}

          {/* Outline Mode Toggle */}
          <button
            type="button"
            onClick={() => {
              const next = !isOutlineMode;
              setOutlineOnly(next);
              showCanvasToast(next ? '輪郭表示モード: ON' : '塗りつぶし表示に戻しました');
            }}
            title={`輪郭のみ表示 [Shift+O]: ${isOutlineMode ? 'ON' : 'OFF'}`}
            className={`h-6 px-1.5 rounded transition-colors flex items-center gap-1 text-[10.5px] font-bold ${
              isOutlineMode ? 'bg-sky-600 text-white' : iconBtnClass
            }`}
          >
            <Square className={`w-3 h-3 ${isOutlineMode ? 'stroke-[2.5] fill-none' : 'stroke-1.5'}`} />
            <span className="hidden lg:inline">輪郭</span>
          </button>

          {/* Glyph Compare */}
          {onOpenGlyphCompareModal && (
            <button
              type="button"
              onClick={onOpenGlyphCompareModal}
              title={`グリフ重ね合わせ比較: ${overlaySettings?.enabled ? `ON (${overlaySettings.referenceChar})` : 'OFF'}`}
              className={`h-6 px-1.5 rounded transition-colors flex items-center gap-1 text-[10.5px] font-bold ${
                overlaySettings?.enabled ? 'bg-sky-600 text-white' : iconBtnClass
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              {overlaySettings?.enabled && (
                <span className="hidden xl:inline max-w-[28px] truncate">
                  {overlaySettings.referenceChar || '比較'}
                </span>
              )}
            </button>
          )}

          {/* Zen Mode */}
          {onToggleZenMode && (
            <button
              type="button"
              onClick={onToggleZenMode}
              title={`集中モード (Zキー): ${isZenMode ? 'ON' : 'OFF'}`}
              className={`h-6 w-6 flex items-center justify-center rounded transition-colors ${
                isZenMode
                  ? isLight
                    ? 'bg-amber-400 text-emerald-950'
                    : 'bg-emerald-500 text-stone-950'
                  : iconBtnClass
              }`}
            >
              {isZenMode ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
            </button>
          )}

          {/* Guide Legend Popover Button */}
          <button
            type="button"
            onClick={() => handleToggleGuideAssist(!showGuideAssist)}
            title="作図基準ガイド（凡例）を表示"
            className={`h-6 px-1.5 rounded border text-[10.5px] font-bold flex items-center gap-1 transition-colors ${
              showGuideAssist
                ? 'bg-emerald-600 text-white border-emerald-600'
                : isLight
                ? 'bg-white hover:bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-[#17261c] hover:bg-emerald-900 border-emerald-800 text-emerald-300'
            }`}
          >
            <HelpCircle className="w-3 h-3" />
            <span className="hidden md:inline">凡例</span>
          </button>

          <div className="h-3.5 w-[1px] bg-stone-300 dark:bg-emerald-800/80 mx-0.5" />

          {/* Zoom Controls */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => handleZoomStep(1 / 1.25)}
              title="縮小 [-]"
              className={`h-6 w-6 flex items-center justify-center rounded transition-colors ${iconBtnClass}`}
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => resetView('100%')}
              title="等倍 100% [1]"
              className={`h-6 px-1.5 rounded font-mono tabular-nums text-[10.5px] font-bold transition-colors ${iconBtnClass}`}
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              onClick={() => handleZoomStep(1.25)}
              title="拡大 [+]"
              className={`h-6 w-6 flex items-center justify-center rounded transition-colors ${iconBtnClass}`}
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => resetView('fit')}
              title="全体フィット [0]"
              className={`h-6 w-6 flex items-center justify-center rounded transition-colors ${iconBtnClass}`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => resetView('width')}
              title="幅基準で拡大 [W]"
              className={`hidden md:inline-flex h-6 px-1.5 items-center rounded text-[10px] font-bold transition-colors ${iconBtnClass}`}
            >
              幅
            </button>
          </div>
        </div>
      </div>

      {/* ==================== MOBILE DOCKED STATUS BAR ==================== */}
      <div className="flex sm:hidden items-center justify-between w-full min-w-0 gap-1">
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setIsMobileAuxMenuOpen(true)}
            className={`h-6 px-2 rounded text-[10.5px] font-bold flex items-center gap-1 border ${
              isLight
                ? 'bg-white border-emerald-200 text-emerald-800'
                : 'bg-[#17261c] border-emerald-800 text-emerald-300'
            }`}
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>補助</span>
          </button>
          {onUndo && (
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              className={`h-6 w-6 flex items-center justify-center rounded disabled:opacity-30 ${iconBtnClass}`}
              title="元に戻す"
            >
              <Undo className="w-3.5 h-3.5" />
            </button>
          )}
          {onRedo && (
            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo}
              className={`h-6 w-6 flex items-center justify-center rounded disabled:opacity-30 ${iconBtnClass}`}
              title="やり直す"
            >
              <Redo className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => handleToggleGuideAssist(!showGuideAssist)}
            className={`h-6 px-1.5 rounded border text-[10.5px] font-bold flex items-center gap-0.5 ${
              showGuideAssist
                ? 'bg-emerald-600 text-white border-emerald-600'
                : isLight
                ? 'bg-white border-emerald-200 text-emerald-800'
                : 'bg-[#17261c] border-emerald-800 text-emerald-300'
            }`}
          >
            <HelpCircle className="w-3 h-3" />
            <span>凡例</span>
          </button>
          <button
            type="button"
            onClick={() => resetView('100%')}
            className={`h-6 px-1.5 rounded font-mono tabular-nums text-[10.5px] font-bold ${iconBtnClass}`}
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            onClick={() => resetView('fit')}
            className={`h-6 w-6 flex items-center justify-center rounded ${iconBtnClass}`}
            title="全体表示"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => resetView('width')}
            className={`h-6 px-1.5 rounded text-[10px] font-bold ${iconBtnClass}`}
          >
            幅
          </button>
        </div>
      </div>
    </div>
  );
});
