import React from 'react';
import {
  X,
  ChevronUp,
  ChevronDown,
  Maximize2,
  Minimize,
  Maximize,
  Grid,
  Magnet,
  Compass,
  Square,
  ArrowRightLeft,
  RotateCcw,
  Trash2,
  Sliders,
  Crosshair,
  Shield,
  ShieldCheck,
  CircleDot,
  PenTool,
  Pencil,
  Eye,
  EyeOff,
  ZoomIn,
  ZoomOut,
  Ruler,
  Move,
} from 'lucide-react';
import {
  ToolMode,
  GridSettings,
  TraceSettings,
  GlyphOverlaySettings,
  PathContour,
  Point,
} from '../../../types';

export interface CanvasStatusBarProps {
  isBottomBarCollapsed: boolean;
  toggleBottomBarCollapse: () => void;
  isLight: boolean;
  toolMode: ToolMode;
  isSpacePressed: boolean;
  hoverCanvasPos: Point | null;
  rulerMeasurement?: {
    start: Point;
    end: Point;
    active: boolean;
  } | null;
  setRulerMeasurement?: (val: any) => void;
  handleDrawRulerAsStroke?: () => void;
  handleConvertRulerToGuideline?: () => void;
  selectedNodeId?: string | null;
  selectedContourId?: string | null;
  handleDeleteSelectedNode?: () => void;
  handleToggleNodeType?: (contourId: string, nodeId: string) => void;
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
  onChangeTraceSettings?: (updater: (prev: TraceSettings) => TraceSettings) => void;
  handleResetTracePosition: () => void;
  handleClearAllContours: () => void;
  contours?: PathContour[];
  isOutlineMode: boolean;
  setOutlineOnly: (val: boolean) => void;
  onOpenGlyphCompareModal?: () => void;
  overlaySettings?: GlyphOverlaySettings;
  onToggleZenMode?: () => void;
  isZenMode?: boolean;
}

export const CanvasStatusBar: React.FC<CanvasStatusBarProps> = React.memo(({
  isBottomBarCollapsed,
  toggleBottomBarCollapse,
  isLight,
  toolMode,
  isSpacePressed,
  hoverCanvasPos,
  rulerMeasurement,
  setRulerMeasurement,
  handleDrawRulerAsStroke,
  handleConvertRulerToGuideline,
  selectedNodeId,
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
  handleClearAllContours,
  contours,
  isOutlineMode,
  setOutlineOnly,
  onOpenGlyphCompareModal,
  overlaySettings,
  onToggleZenMode,
  isZenMode,
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

  return (
    
 <div className="absolute bottom-2 left-2 right-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-1.5 z-20 select-none pointer-events-none">
 {/* Left: Real-time Coordinates & Active Tool Tips (Desktop only) */}
 {!isBottomBarCollapsed && (
 <div
 className={`hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-xs pointer-events-auto transition-colors ${
 isLight
 ? 'bg-white/95 border-[#c8ded3] text-stone-800'
 : 'bg-[#142018]/95 border-[#25382c] text-emerald-100'
 }`}
 >
 {/* Tool Icon & Name */}
 <div className="flex items-center space-x-1.5 font-bold text-emerald-700 dark:text-emerald-400 shrink-0">
 {toolMode === 'select' && <span>選択モード</span>}
 {toolMode === 'node' && <span>ノード編集</span>}
 {toolMode === 'pen' && <span>ペンツール</span>}
 {toolMode === 'brush' && <span>筆ストローク</span>}
 {toolMode === 'eraser' && <span>消しゴム</span>}
 {toolMode === 'ruler' && <span>定規計測</span>}
 {toolMode === 'hand' && <span>画面移動</span>}
 {toolMode === 'rect' && <span>四角形</span>}
 {toolMode === 'square' && <span>正方形</span>}
 {toolMode === 'ellipse' && <span>楕円</span>}
 {toolMode === 'circle' && <span>正円</span>}
 {toolMode === 'rounded_rect' && <span>角丸四角形</span>}
 {toolMode === 'triangle' && <span>三角形</span>}
 {toolMode === 'star' && <span>星型</span>}
 {toolMode === 'heart' && <span>ハート</span>}
 {toolMode === 'sparkle' && <span>4芒星</span>}
 {toolMode === 'starburst' && <span>8芒星</span>}
 {toolMode === 'diamond' && <span>菱形</span>}
 {toolMode === 'polygon' && <span>正六角形</span>}
 {toolMode === 'trace_adjust' && <span>下絵位置調整</span>}
 {isSpacePressed && <span className="text-emerald-500 font-normal ml-1">(Spaceドラッグ移動)</span>}
 </div>

 <div className="h-3.5 w-[1px] bg-stone-300 dark:bg-emerald-800 shrink-0" />

 {/* Real-time Cursor Coordinates */}
 <div className="font-mono text-[11px] text-stone-600 dark:text-emerald-300 shrink-0">
 {hoverCanvasPos ? (
 <span>
 X: <strong className="text-emerald-700 dark:text-emerald-300">{hoverCanvasPos.x}</strong> Y:{' '}
 <strong className="text-emerald-700 dark:text-emerald-300">{hoverCanvasPos.y}</strong>
 </span>
 ) : (
 <span className="text-stone-400">キャンバス内</span>
 )}
 </div>

 <div className="h-3.5 w-[1px] bg-stone-300 dark:bg-emerald-800 hidden md:block shrink-0" />

 {/* Contextual Operation Hints */}
 <div className="text-[11px] text-stone-500 dark:text-emerald-400/80 hidden md:block truncate max-w-[280px]">
 {toolMode === 'ruler' &&
 'ドラッグして寸法・角度を計測 (Shiftで15°刻みスナップ、斜め/直交ガイド化、Enterで直線化)'}
 {toolMode === 'select' && '輪郭をクリックして移動・8方向変形・回転'}
 {toolMode === 'node' && 'ノードやハンドルをクリック・ドラッグして編集'}
 {toolMode === 'pen' && 'クリックで頂点追加 / 始点クリックでパスを閉じる'}
 {toolMode === 'brush' && 'ドラッグでストローク (Shiftで定規のように水平/垂直/45度の直線を引く)'}
 {toolMode === 'eraser' && 'ドラッグまたはクリックで不要な輪郭を消去'}
 {toolMode === 'trace_adjust' && 'ドラッグして下絵の位置を移動'}
 {toolMode === 'hand' && 'ドラッグしてキャンバスを自由に移動'}
 {isShapeTool && 'ドラッグして図形を描画 (Shiftで1:1、Altで中心基準)'}
 </div>

 {/* Ruler Actions if measured */}
 {rulerMeasurement && (
 <div className="ml-auto flex items-center gap-1.5 shrink-0">
 <button
 onClick={(e) => {
 e.stopPropagation();
 handleDrawRulerAsStroke?.();
 }}
 className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold flex items-center gap-1 transition-colors "
 title="定規で測ったラインを直線ストロークとしてキャンバスに作成 (Enterキーでも作図可能)"
 >
 <PenTool className="w-3 h-3" />
 <span>直線を作図 (Enter)</span>
 </button>
 <button
 onClick={(e) => {
 e.stopPropagation();
 handleConvertRulerToGuideline?.();
 }}
 className="px-2 py-0.5 rounded bg-sky-600 hover:bg-sky-700 text-white text-[10px] font-bold flex items-center gap-1 transition-colors "
 title="定規の位置にガイド線（水平または垂直）を作成"
 >
 <Ruler className="w-3 h-3" />
 <span>ガイド線</span>
 </button>
 <button
 onClick={(e) => {
 e.stopPropagation();
 setRulerMeasurement?.(null);
 }}
 className="px-1.5 py-0.5 rounded bg-stone-200 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-[10px] font-bold flex items-center gap-1 transition-colors"
 title="定規の計測表示を消去"
 >
 <X className="w-3 h-3" />
 <span>クリア</span>
 </button>
 </div>
 )}
 </div>
 )}

 {/* Right: Floating Canvas Controls (Compactable) */}
 <div className="flex items-center space-x-1.5 pointer-events-auto self-end sm:self-auto flex-nowrap ml-auto max-w-full overflow-x-auto touch-scroll-x no-scrollbar py-0.5">
  {/* Mobile Dedicated Compact Mini Bar (sm:hidden) */}
  <div className="sm:hidden">
   <div
    className={`flex items-center p-1 rounded-xl border shadow-md space-x-1 transition-all ${
     isLight
      ? 'bg-white/98 border-[#c8ded3] text-stone-700'
      : 'bg-[#142018]/98 border-[#25382c] text-emerald-200'
    }`}
   >
    <button
     onClick={() => setIsMobileAuxMenuOpen(true)}
     title="キャンバス操作メニュー・下部シートを展開"
     className={`flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-bold transition-all ${
      isLight
       ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
       : 'bg-emerald-950 hover:bg-emerald-900 text-emerald-300'
     }`}
    >
     <ChevronUp className="w-3.5 h-3.5" />
     <span className="text-[11px]">操作バー展開</span>
    </button>
    <div className="h-3 w-[1px] bg-stone-300 dark:bg-emerald-800" />
    <button
     onClick={() => resetView('100%')}
     title="等倍 100% 表示"
     className="text-[10px] font-mono px-1.5 py-0.5 rounded hover:bg-emerald-100/60 dark:hover:bg-emerald-900/60 font-bold"
    >
     {Math.round(zoom * 100)}%
    </button>
    <button
     onClick={() => resetView('fit')}
     title="画面全体に最適フィット"
     className="p-1 rounded hover:bg-emerald-100/50"
    >
     <Maximize2 className="w-3.5 h-3.5" />
    </button>
    <button
     onClick={() => resetView('width')}
     title="幅基準で拡大"
     className="text-[10px] font-bold px-1.5 py-0.5 rounded hover:bg-emerald-100/60 dark:hover:bg-emerald-900/60"
    >
     幅
    </button>
    {onChangeGridSettings && (
     <>
      <div className="h-3 w-[1px] bg-stone-300 dark:bg-emerald-800" />
      <button
       type="button"
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
       className={`p-1 rounded transition-colors ${
        gridSettings.showCursorCrosshair
         ? isLight
          ? 'bg-amber-100 text-amber-900 font-bold'
          : 'bg-emerald-800 text-amber-300 font-bold'
         : 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'
       }`}
       title={`照準ポインター切替 [Hキー]: ${gridSettings.showCursorCrosshair ? 'ON' : 'OFF'}`}
      >
       <CircleDot className="w-3.5 h-3.5" />
      </button>
     </>
    )}
   </div>
  </div>

  {/* Desktop Collapsible Bar (hidden sm:flex) */}
  <div className="hidden sm:flex items-center space-x-1.5">
   {/* Collapsed Compact Mini Bar */}
   {isBottomBarCollapsed ? (
 <div
 className={`flex items-center p-1 rounded-xl border shadow-md space-x-1 transition-all ${
 isLight
 ? 'bg-white/98 border-[#c8ded3] text-stone-700'
 : 'bg-[#142018]/98 border-[#25382c] text-emerald-200'
 }`}
 >
 <button
 onClick={toggleBottomBarCollapse}
 title="ミニバーを展開"
 className={`flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-bold transition-all ${
 isLight
 ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
 : 'bg-emerald-950 hover:bg-emerald-900 text-emerald-300'
 }`}
 >
 <ChevronUp className="w-3.5 h-3.5" />
 <span className="text-[11px]">操作バー展開</span>
 </button>
 <div className="h-3 w-[1px] bg-stone-300 dark:bg-emerald-800" />
 <button
 onClick={() => resetView('100%')}
 title="等倍 100% 表示"
 className="text-[10px] font-mono px-1.5 py-0.5 rounded hover:bg-emerald-100/60 dark:hover:bg-emerald-900/60 font-bold"
 >
 {Math.round(zoom * 100)}%
 </button>
 <button
 onClick={() => resetView('fit')}
 title="画面全体に最適フィット"
 className="p-1 rounded hover:bg-emerald-100/50"
 >
 <Maximize2 className="w-3.5 h-3.5" />
 </button>
 <button
 onClick={() => resetView('width')}
 title="幅基準で拡大"
 className="text-[10px] font-bold px-1.5 py-0.5 rounded hover:bg-emerald-100/60 dark:hover:bg-emerald-900/60"
 >
 幅
 </button>
 {onChangeGridSettings && (
 <>
 <div className="h-3 w-[1px] bg-stone-300 dark:bg-emerald-800" />
 <button
 type="button"
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
 className={`p-1 rounded transition-colors ${
  gridSettings.showCursorCrosshair
  ? isLight
   ? 'bg-amber-100 text-amber-900 font-bold'
   : 'bg-emerald-800 text-amber-300 font-bold'
  : 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'
 }`}
 title={`照準ポインター切替 [Hキー]: ${gridSettings.showCursorCrosshair ? 'ON' : 'OFF'}`}
 >
 <CircleDot className="w-3.5 h-3.5" />
 </button>
 </>
 )}
 </div>
 ) : (
 <>
 {/* Palm Rejection Mode Quick Indicator & Toggle */}
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
 ? '自動検知（ペン使用時に手のひら無効化）'
 : nextMode === 'strict_pen_only'
 ? 'ペン専用（指作図を無効化）'
 : 'OFF（指でも作図可能）'
 }`
 );
 }}
 className={`hidden md:flex px-2 py-1 rounded-lg text-[10px] font-bold items-center space-x-1 border transition-all ${
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
 title="パームリジェクション設定（クリックで切替: 自動検知 / ペン専用 / OFF）"
 >
 {palmRejectionMode === 'strict_pen_only' ? (
 <ShieldCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
 ) : (
 <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
 )}
 <span>
 {palmRejectionMode === 'strict_pen_only'
 ? 'ペン専用'
 : palmRejectionMode === 'auto'
 ? 'パーム検知'
 : 'タッチ有効'}
 </span>
 </button>

 {isStylusActive && (
 <div
 className={`flex px-2 py-1 rounded-lg text-[10px] font-bold items-center space-x-1.5 border transition-all ${
 isLight
 ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
 : 'bg-[#16251b] text-emerald-300 border-emerald-700'
 }`}
 title="Apple Pencil / スタイラスペン入力検知中（筆圧・筆致自動反映）"
 >
 <span className="flex items-center space-x-1">
 <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
 <span>Apple Pencil</span>
 </span>
 {liveStylusPressure !== null && (
 <span className="font-mono text-[9px] bg-emerald-200/50 dark:bg-emerald-900/50 px-1 py-0.2 rounded">
 {liveStylusPressure}%
 </span>
 )}
 {onChangePressureSensitivity && (
 <div className="flex items-center space-x-0.5 border-l border-emerald-300/60 dark:border-emerald-700/60 pl-1">
 {(['high', 'normal', 'low', 'off'] as const).map((s) => (
 <button
 key={s}
 onClick={() => onChangePressureSensitivity(s)}
 className={`px-1 py-0.2 text-[8.5px] rounded font-medium transition-colors ${
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

 {toolMode === 'node' && (
 <div
 className={`px-2 py-1 rounded-lg text-[10.5px] font-bold flex items-center space-x-1.5 border shadow-sm ${
 isLight
 ? 'bg-emerald-50 text-emerald-950 border-emerald-300'
 : 'bg-[#15231a] text-emerald-300 border-emerald-800'
 }`}
 >
 <Crosshair className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
 <span>パス頂点編集</span>
 {selectedNodeId && selectedContourId ? (
  <>
  <span className="w-px h-3 bg-emerald-400/40 mx-0.5" />
  <button
  onClick={() => handleToggleNodeType?.(selectedContourId, selectedNodeId)}
  className="px-1.5 py-0.5 rounded text-[10px] bg-sky-100 hover:bg-sky-200 dark:bg-sky-950 dark:hover:bg-sky-900 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-700 font-bold flex items-center gap-1 transition-colors"
  title="角 ⇄ スムーズ曲線を切替 (頂点をダブルクリックでも可能)"
  >
  <span>角⇄曲線</span>
  </button>
  <button
  onClick={() => handleDeleteSelectedNode?.()}
  className="px-1.5 py-0.5 rounded text-[10px] bg-rose-100 hover:bg-rose-200 dark:bg-rose-950 dark:hover:bg-rose-900 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700 font-bold flex items-center gap-1 transition-colors"
  title="選択した頂点を削除 (Delete/Backspaceキー)"
  >
  <Trash2 className="w-3 h-3 text-rose-600 dark:text-rose-400" />
  <span>削除</span>
  </button>
  </>
 ) : (
  <span className="text-[9.5px] opacity-75 font-normal ml-0.5">
  (頂点・ハンドルをドラッグ / 線上クリックで追加)
  </span>
 )}
 </div>
 )}

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
 className={`px-2 py-1 rounded-lg text-[10.5px] font-bold flex items-center space-x-1.5 transition-all border shadow-sm shrink-0 ${
  gridSettings.showCursorCrosshair
  ? isLight
   ? 'bg-amber-100 text-amber-950 border-amber-400 hover:bg-amber-200'
   : 'bg-emerald-950 text-emerald-300 border-emerald-600 hover:bg-emerald-900'
  : isLight
   ? 'bg-stone-100 text-stone-600 border-stone-300 hover:bg-stone-200'
   : 'bg-stone-800 text-stone-400 border-stone-700 hover:bg-stone-700'
 }`}
 title={`照準ポインター切替 [Hキー]: ${gridSettings.showCursorCrosshair ? '表示中 (クリックでOFF)' : '非表示 (クリックでON)'}`}
 >
 <CircleDot className={`w-3.5 h-3.5 ${gridSettings.showCursorCrosshair ? 'text-amber-600 dark:text-emerald-400' : 'text-stone-400'}`} />
 <span className="hidden xs:inline">照準:</span>
 <span className={`px-1 py-0.2 rounded text-[9.5px] font-mono font-black ${
  gridSettings.showCursorCrosshair
  ? 'bg-amber-600 dark:bg-emerald-600 text-white'
  : 'bg-stone-300 dark:bg-stone-700 text-stone-700 dark:text-stone-300'
 }`}>
  {gridSettings.showCursorCrosshair ? 'ON' : 'OFF'}
 </span>
 </button>
 )}

 {toolMode === 'trace_adjust' && (
 <div
 className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center space-x-1.5 ${
 isLight ? 'bg-blue-600 text-white' : 'bg-blue-500 text-stone-950'
 }`}
 >
 <Move className="w-3.5 h-3.5" />
 <span>ドラッグして下絵写真を移動中</span>
 </div>
 )}

 <div
 className={`flex items-center p-1 rounded-lg border shadow-md space-x-1 ${
 isLight
 ? 'bg-white/98 border-[#c8ded3] text-stone-700'
 : 'bg-[#142018]/98 border-[#25382c] text-emerald-200'
 }`}
 >
 {/* Grid Size Quick Indicator & Slider Popover */}
 {gridSettings.showGrid && onChangeGridSettings && (
 <div className="relative" ref={quickGridSliderRef}>
 <div
 onClick={() => setShowQuickGridSlider((prev) => !prev)}
 className={`cursor-pointer flex items-center space-x-1 px-2 py-0.5 rounded border text-[11px] font-mono font-medium mr-1 select-none transition-colors ${
 showQuickGridSlider
 ? 'bg-emerald-600 text-white border-emerald-600 '
 : isLight
 ? 'bg-emerald-50/90 hover:bg-emerald-100 border-emerald-300 text-emerald-900'
 : 'bg-emerald-950/90 hover:bg-emerald-900 border-emerald-700 text-emerald-200'
 }`}
 title="クリックでグリッドサイズ調整スライダーを開く (Alt +/- でも微調整可能)"
 >
 <Grid className="w-3 h-3" />
 <span className="font-sans font-bold text-[10.5px]">方眼</span>
 <span className="font-bold">{gridSettings.gridSize || 50}px</span>
 <ChevronDown className={`w-3 h-3 transition-transform ${showQuickGridSlider ? 'rotate-180' : ''}`} />
 </div>

 {/* Quick Grid Slider Popover */}
 {showQuickGridSlider && (
 <div
 className={`absolute bottom-full mb-2 right-0 sm:left-0 sm:right-auto w-64 p-3 rounded-xl border shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100 ${
 isLight
 ? 'bg-white border-[#c8ded3] text-stone-800'
 : 'bg-[#152119] border-[#25382c] text-emerald-100'
 }`}
 >
 <div className="flex items-center justify-between mb-2">
 <span className="font-bold text-xs flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
 <Grid className="w-3.5 h-3.5" />
 <span>グリッドサイズ変更</span>
 </span>
 <span className="font-mono font-bold text-xs px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800">
 {gridSettings.gridSize || 50}px
 </span>
 </div>

 {/* Slider Control */}
 <div className="space-y-2">
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
 className="w-6 h-6 rounded flex items-center justify-center border border-stone-300 dark:border-stone-700 hover:bg-stone-200 dark:hover:bg-stone-800 text-xs font-bold transition-colors shrink-0"
 title="サイズ縮小 (-)"
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
 onChangeGridSettings((prev) => ({
 ...prev,
 gridSize: val,
 }));
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
 className="w-6 h-6 rounded flex items-center justify-center border border-stone-300 dark:border-stone-700 hover:bg-stone-200 dark:hover:bg-stone-800 text-xs font-bold transition-colors shrink-0"
 title="サイズ拡大 (+)"
 >
 +
 </button>
 </div>

 {/* Quick Presets */}
 <div className="flex items-center gap-1 justify-between pt-1">
 {[10, 25, 50, 100, 128].map((size) => (
 <button
 key={size}
 type="button"
 onClick={() =>
 onChangeGridSettings((prev) => ({
 ...prev,
 gridSize: size,
 }))
 }
 className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors ${
 (gridSettings.gridSize || 50) === size
 ? 'bg-emerald-600 text-white border-emerald-600'
 : 'bg-stone-100 dark:bg-stone-800 border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
 }`}
 >
 {size}px
 </button>
 ))}
 </div>

 {/* Shortcut hint */}
 <div className="text-[10px] text-stone-500 dark:text-stone-400 text-center pt-1 border-t border-stone-200 dark:border-stone-800 flex items-center justify-center gap-1">
 <span>ショートカット:</span>
 <kbd className="px-1 py-0.2 bg-stone-100 dark:bg-stone-800 rounded border border-stone-300 dark:border-stone-700 font-mono font-bold">Alt</kbd>
 <span>+</span>
 <kbd className="px-1 py-0.2 bg-stone-100 dark:bg-stone-800 rounded border border-stone-300 dark:border-stone-700 font-mono font-bold">+/-</kbd>
 </div>
 </div>
 </div>
 )}
 </div>
 )}

 {traceSettings.enabled && onChangeTraceSettings && (
 <button
 onClick={() =>
 onChangeTraceSettings((s) => ({
 ...s,
 opacity: s.opacity > 0.1 ? 0.05 : 0.4,
 }))
 }
 title="下絵の濃淡を素早く切り替え"
 className={`p-1.5 rounded hover:bg-emerald-100/50 ${
 isLight ? 'text-stone-600' : 'text-emerald-300'
 }`}
 >
 {traceSettings.opacity > 0.1 ? (
 <Eye className="w-4 h-4 text-emerald-600" />
 ) : (
 <EyeOff className="w-4 h-4 text-stone-400" />
 )}
 </button>
 )}

 {/* Quick Trace Position Reset in Canvas Footer when offset is nonzero */}
 {traceSettings.enabled && (traceSettings.offsetX !== 0 || traceSettings.offsetY !== 0) && onChangeTraceSettings && (
 <button
 onClick={handleResetTracePosition}
 title={`下絵位置がずれています (X:${traceSettings.offsetX || 0}, Y:${traceSettings.offsetY || 0})。クリックで中央(0, 0)にリセット`}
 className="px-2 py-0.5 rounded text-[10.5px] font-bold flex items-center space-x-1 bg-amber-500 hover:bg-amber-400 text-stone-950 transition-colors "
 >
 <RotateCcw className="w-3 h-3" />
 <span>下絵位置リセット</span>
 </button>
 )}

 {/* Cursor Crosshair Reticle Quick Toggle */}
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
 title={`照準ポインター・十字線: ${gridSettings.showCursorCrosshair ? '表示中 (クリックでOFF)' : '非表示 (クリックでON)'} [Hキー]`}
 className={`p-1.5 rounded transition-colors ${
 gridSettings.showCursorCrosshair
 ? isLight
 ? 'bg-amber-100 text-amber-900 border border-amber-300 font-bold'
 : 'bg-emerald-800 text-amber-300 font-bold'
 : isLight
 ? 'text-stone-600 hover:bg-emerald-100/50'
 : 'text-emerald-400 hover:bg-emerald-900/40'
 }`}
 >
 <Crosshair className="w-3.5 h-3.5" />
 </button>
 )}

 {/* Snap To Grid & Guides Quick Toggle */}
 {onChangeGridSettings && (
 <button
 onClick={() => {
 const next = !(gridSettings.snapToGrid || gridSettings.snapToGuides);
 onChangeGridSettings((prev) => ({
 ...prev,
 snapToGrid: next,
 snapToGuides: next,
 }));
 showCanvasToast(
 next
 ? 'スナップ (マグネット): ON (吸着有効)'
 : 'スナップ (マグネット): OFF (自由配置)'
 );
 }}
 title={`スマートスナップ: ${gridSettings.snapToGrid || gridSettings.snapToGuides ? 'ON (クリックでOFF)' : 'OFF (クリックでON)'} [Sキーで切替 / Alt長押しで一時解除]`}
 className={`p-1.5 rounded transition-colors flex items-center space-x-1 font-bold text-[11px] ${
 gridSettings.snapToGrid || gridSettings.snapToGuides
 ? isLight
 ? 'bg-emerald-600 text-white '
 : 'bg-emerald-600 text-white '
 : isLight
 ? 'text-stone-500 hover:bg-emerald-100/50'
 : 'text-emerald-400 hover:bg-emerald-900/40'
 }`}
 >
 <Magnet className="w-3.5 h-3.5" />
 <span className="text-[10px] hidden sm:inline">
 {gridSettings.snapToGrid || gridSettings.snapToGuides ? 'スナップON' : 'スナップOFF'}
 </span>
 </button>
 )}

 {/* Clear all contours of current character */}
 {(contours?.length ?? 0) > 0 && (
 <button
 onClick={handleClearAllContours}
 title="この文字の全パスをリセット・クリア (Ctrl+Zで復元可能)"
 className={`p-1.5 rounded transition-colors text-rose-600 hover:bg-rose-100/60 dark:text-rose-400 dark:hover:bg-rose-950/40`}
 >
 <RotateCcw className="w-3.5 h-3.5" />
 </button>
 )}

 <button
 onClick={() => handleZoomStep(1.25)}
 title="拡大 (Zoom In) [+]"
 className={`p-1.5 rounded hover:bg-emerald-100/50 ${
 isLight ? 'text-stone-700' : 'text-emerald-200'
 }`}
 >
 <ZoomIn className="w-4 h-4" />
 </button>

 <button
 onClick={() => resetView('100%')}
 title="等倍 100% 表示 (1キー)"
 className="text-[10px] font-mono px-1.5 py-0.5 rounded hover:bg-emerald-100/60 dark:hover:bg-emerald-900/60 font-bold transition-colors cursor-pointer"
 >
 {Math.round(zoom * 100)}%
 </button>

 <button
 onClick={() => handleZoomStep(1 / 1.25)}
 title="縮小 (Zoom Out) [-]"
 className={`p-1.5 rounded hover:bg-emerald-100/50 ${
 isLight ? 'text-stone-700' : 'text-emerald-200'
 }`}
 >
 <ZoomOut className="w-4 h-4" />
 </button>

 <button
 onClick={() => resetView('fit')}
 title="画面全体に最適フィット (0キー)"
 className={`p-1.5 rounded hover:bg-emerald-100/50 ${
 isLight ? 'text-stone-700' : 'text-emerald-200'
 }`}
 >
 <Maximize2 className="w-4 h-4" />
 </button>

 <button
 onClick={() => resetView('width')}
 title="余白なし・幅いっぱいに拡大 (Wキー)"
 className={`hidden md:inline-flex text-[10px] font-bold px-1.5 py-0.5 rounded hover:bg-emerald-100/60 dark:hover:bg-emerald-900/60 transition-colors ${
 isLight ? 'text-emerald-800' : 'text-emerald-300'
 }`}
 >
 幅基準
 </button>

 {/* Outline Mode (Wireframe) Toggle in Floating Bar */}
 <button
 onClick={() => {
 const next = !isOutlineMode;
 setOutlineOnly(next);
 showCanvasToast(
 next
 ? '輪郭表示モードを有効にしました（パスの重なりや形状を透過確認）'
 : '塗りつぶし表示モードに戻しました'
 );
 }}
 title={`輪郭のみ表示（ワイヤーフレーム）: ${isOutlineMode ? 'ON' : 'OFF'} [Shift+O / Alt+O]`}
 className={`p-1.5 rounded transition-all flex items-center gap-1 text-xs ${
 isOutlineMode
 ? isLight
 ? 'bg-sky-500 text-white font-bold'
 : 'bg-sky-600 text-white font-bold'
 : isLight
 ? 'text-stone-700 hover:bg-emerald-100/50'
 : 'text-emerald-300 hover:bg-emerald-900/40'
 }`}
 >
 <Square className={`w-3.5 h-3.5 ${isOutlineMode ? 'stroke-[2.5] fill-none' : 'stroke-1.5'}`} />
 <span className="text-[10px] hidden lg:inline font-bold">
 {isOutlineMode ? '輪郭中' : '輪郭'}
 </span>
 </button>

 {/* Glyph Overlay Comparison Button */}
 {onOpenGlyphCompareModal && (
 <button
 onClick={onOpenGlyphCompareModal}
 title={`グリフ重ね合わせ比較: ${overlaySettings?.enabled ? `ON (「${overlaySettings?.referenceChar || ''}」)` : 'OFF'}`}
 className={`p-1.5 rounded transition-all flex items-center gap-1 text-xs ${
 overlaySettings?.enabled
 ? isLight
 ? 'bg-sky-500 text-white font-bold'
 : 'bg-sky-600 text-white font-bold'
 : isLight
 ? 'text-stone-700 hover:bg-emerald-100/50'
 : 'text-emerald-300 hover:bg-emerald-900/40'
 }`}
 >
 <ArrowRightLeft className="w-4 h-4" />
 {overlaySettings?.enabled && (
 <span className="text-[10px] hidden lg:inline max-w-[32px] truncate">
 {overlaySettings?.referenceChar || '比較'}
 </span>
 )}
 </button>
 )}

 {/* Zen / Wide Canvas Mode Toggle */}
 {onToggleZenMode && (
 <button
 onClick={onToggleZenMode}
 title={`全面作図・集中モード (サイドバー収納): ${isZenMode ? 'ON' : 'OFF'} (Zキー)`}
 className={`p-1.5 rounded transition-all ${
 isZenMode
 ? isLight
 ? 'bg-amber-400 text-emerald-950 font-bold '
 : 'bg-emerald-500 text-stone-950 font-bold '
 : isLight
 ? 'text-stone-700 hover:bg-emerald-100/50'
 : 'text-emerald-300 hover:bg-emerald-900/40'
 }`}
 >
 {isZenMode ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
 </button>
 )}

 {/* Compact Bar Toggle Button */}
 <div className="h-4 w-[1px] bg-stone-300 dark:bg-emerald-800 mx-0.5" />
 <button
 onClick={toggleBottomBarCollapse}
 title="フローティングバーをコンパクト化（画面を広く使う）"
 className={`p-1.5 rounded transition-colors ${
 isLight ? 'text-stone-500 hover:bg-stone-100' : 'text-emerald-400 hover:bg-emerald-900/40'
 }`}
 >
 <ChevronDown className="w-4 h-4" />
 </button>
 </div>
            </>
 )}
  </div>
 </div>

 </div>
  );
});
