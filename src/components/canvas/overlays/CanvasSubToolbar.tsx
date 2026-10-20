import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Square,
  CircleDot,
  Paintbrush,
  Sliders,
  Activity,
  ShieldCheck,
  Layers,
  Ruler,
  Wand2,
  Compass,
  Spline,
  PenTool,
  Check,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  RotateCw,
  Copy,
  Trash2,
  Scissors,
  Maximize2,
  Minus,
  Plus,
  Circle,
  Triangle,
  Star,
  Heart,
  Diamond,
  Zap,
  Sparkles,
  Undo,
  Redo,
  Grid,
  CornerDownLeft,
  ChevronDown,
  Lock,
  Unlock,
  Shield,
  Italic,
  ChevronUp,
  Eraser,
  X,
} from 'lucide-react';
import {
  BrushStyle,
  CustomGuideline,
  GridSettings,
  PathContour,
  Point,
  ToolMode,
  UserPenPreset,
} from '../../../types';
import { PEN_PRESETS } from '../../../utils/pathUtils';
import { DAKUTEN_MAPPINGS } from '../../../utils/dakutenHelper';

export interface CanvasSubToolbarProps {
  isMobileFocusMode: boolean;
  showSubToolbar: boolean;
  handleToggleSubToolbar: () => void;
  themeClasses: any;
  isLight: boolean;
  onSelectPrevGlyph?: () => void;
  onSelectNextGlyph?: () => void;
  activeChar: string;
  selectedUnicode?: number;
  onGenerateDakutenTarget?: (targetChar: string, isHandakuten: boolean) => void;
  showCanvasToast: (msg: string, sub?: string) => void;
  showNodes: boolean;
  setShowNodes: React.Dispatch<React.SetStateAction<boolean>>;
  isOutlineMode: boolean;
  setOutlineOnly: React.Dispatch<React.SetStateAction<boolean>>;
  gridSettings: GridSettings;
  onChangeGridSettings?: React.Dispatch<React.SetStateAction<GridSettings>>;
  toolMode: ToolMode;
  setShowMobileBrushSheet: (show: boolean) => void;
  brushStyle: BrushStyle;
  onChangeBrushStyle?: (style: BrushStyle) => void;
  brushWidth: number;
  onChangeBrushWidth?: (w: number) => void;
  onOpenPenPresetsModal?: () => void;
  pressureSensitivity: 'high' | 'normal' | 'low' | 'off';
  onChangePressureSensitivity?: (s: 'high' | 'normal' | 'low' | 'off') => void;
  isStylusActive: boolean;
  liveStylusPressure: number | null;
  autoResolveBrushOverlap: boolean;
  setAutoResolveBrushOverlap: (val: boolean) => void;
  autoUnionBrush: boolean;
  setAutoUnionBrush: (val: boolean) => void;
  brushStraightMode: boolean;
  setBrushStraightMode: (val: boolean) => void;
  autoSmoothBrush: boolean;
  setAutoSmoothBrush: (val: boolean) => void;
  smoothStrength: 'mild' | 'standard' | 'strong';
  setSmoothStrength: (val: 'mild' | 'standard' | 'strong') => void;
  handleStraightenWobblySelected: () => void;
  penMode: 'bezier' | 'corner';
  setPenMode: (mode: 'bezier' | 'corner') => void;
  penStrokeWidth: number;
  handleSetPenStrokeWidth: (w: number) => void;
  penCapStyle: 'round' | 'butt' | 'square';
  handleSetPenCapStyle: (cap: 'round' | 'butt' | 'square') => void;
  eraserMode: 'stroke' | 'cut' | 'all' | 'node';
  setEraserMode: (mode: 'stroke' | 'cut' | 'all' | 'node') => void;
  eraserSize: number;
  setEraserSize: React.Dispatch<React.SetStateAction<number>>;
  isShapeTool: boolean;
  rulerMeasurement: { start: Point; end: Point; active: boolean } | null;
  handleDrawRulerAsStroke: () => void;
  handleConvertRulerToGuideline: (mode?: 'auto' | 'diagonal' | 'h' | 'v') => void;
  setRulerMeasurement: (r: any) => void;
  customGuidelines: CustomGuideline[];
  setCustomGuidelines: React.Dispatch<React.SetStateAction<CustomGuideline[]>>;
  lockGuidelines: boolean;
  setLockGuidelines: React.Dispatch<React.SetStateAction<boolean>>;
  contours: PathContour[];
  handleClearAll: () => void;
  selectedContourIds: string[];
  selectedContourId: string | null;
  setSelectedContourIds: (ids: string[]) => void;
  setSelectedContourId: (id: string | null) => void;
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  setSelectedHandleType: (t: 'node' | 'handleIn' | 'handleOut' | null) => void;
  handleRotateSelected: (deg: number) => void;
  handleFlipHSelected: () => void;
  handleFlipVSelected: () => void;
  handleMergeSelectedContours: () => void;
  handleDuplicateSelected: () => void;
  handleDeleteSelected: () => void;
  handleSmoothStrokeSelected: (strength?: 'mild' | 'standard' | 'strong', keepShape?: boolean) => void;
  handleSimplifySelected: (tol?: number) => void;
  handleExpandStrokeSelected: () => void;
  handleSubtractSelectedContours: () => void;
  handleIntersectSelectedContours: () => void;
  handleSlantSelected: (deg: number) => void;
  handleReverseWindingSelected: () => void;
  handleConvertToSmoothSelected: () => void;
  handleConvertToCornersSelected: () => void;
  handleToggleNodeType: (contourId: string, nodeId: string) => void;
  handleDeleteSelectedNode: () => void;
  handleClearAllGuidelines: () => void;
  isGuideEraserActive: boolean;
  setIsGuideEraserActive: React.Dispatch<React.SetStateAction<boolean>>;
  nodeStyle: 'full' | 'clean' | 'selected_only';
  setNodeStyle: (s: 'full' | 'clean' | 'selected_only') => void;
  smoothPreserveCorners: boolean;
  setSmoothPreserveCorners: (val: boolean) => void;
  isShiftLockRatio: boolean;
  setIsShiftLockRatio: React.Dispatch<React.SetStateAction<boolean>>;
  isAltFromCenter: boolean;
  setIsAltFromCenter: React.Dispatch<React.SetStateAction<boolean>>;
}

export const CanvasSubToolbar: React.FC<CanvasSubToolbarProps> = React.memo(({
  isMobileFocusMode,
  showSubToolbar,
  handleToggleSubToolbar,
  themeClasses,
  isLight,
  onSelectPrevGlyph,
  onSelectNextGlyph,
  activeChar,
  selectedUnicode,
  onGenerateDakutenTarget,
  showCanvasToast,
  showNodes,
  setShowNodes,
  isOutlineMode,
  setOutlineOnly,
  gridSettings,
  onChangeGridSettings,
  toolMode,
  setShowMobileBrushSheet,
  brushStyle,
  brushWidth,
  onChangeBrushStyle,
  onChangeBrushWidth,
  onOpenPenPresetsModal,
  pressureSensitivity,
  onChangePressureSensitivity,
  isStylusActive,
  liveStylusPressure,
  autoResolveBrushOverlap,
  setAutoResolveBrushOverlap,
  autoUnionBrush,
  setAutoUnionBrush,
  brushStraightMode,
  setBrushStraightMode,
  autoSmoothBrush,
  setAutoSmoothBrush,
  smoothStrength,
  setSmoothStrength,
  handleStraightenWobblySelected,
  penMode,
  setPenMode,
  penStrokeWidth,
  handleSetPenStrokeWidth,
  penCapStyle,
  handleSetPenCapStyle,
  eraserMode,
  setEraserMode,
  eraserSize,
  setEraserSize,
  isShapeTool,
  rulerMeasurement,
  handleDrawRulerAsStroke,
  handleConvertRulerToGuideline,
  setRulerMeasurement,
  customGuidelines,
  setCustomGuidelines,
  lockGuidelines,
  setLockGuidelines,
  contours,
  handleClearAll,
  selectedContourIds,
  selectedContourId,
  setSelectedContourIds,
  setSelectedContourId,
  selectedNodeId,
  setSelectedNodeId,
  setSelectedHandleType,
  handleRotateSelected,
  handleFlipHSelected,
  handleFlipVSelected,
  handleMergeSelectedContours,
  handleDuplicateSelected,
  handleDeleteSelected,
  handleSmoothStrokeSelected,
  handleSimplifySelected,
  handleExpandStrokeSelected,
  handleSubtractSelectedContours,
  handleIntersectSelectedContours,
  handleSlantSelected,
  handleReverseWindingSelected,
  handleConvertToSmoothSelected,
  handleConvertToCornersSelected,
  handleToggleNodeType,
  handleDeleteSelectedNode,
  handleClearAllGuidelines,
  isGuideEraserActive,
  setIsGuideEraserActive,
  nodeStyle,
  setNodeStyle,
  smoothPreserveCorners,
  setSmoothPreserveCorners,
  isShiftLockRatio,
  setIsShiftLockRatio,
  isAltFromCenter,
  setIsAltFromCenter,
}) => {
  const subToolbarRef = useRef<HTMLDivElement>(null);
  const [subToolbarCanScrollLeft, setSubToolbarCanScrollLeft] = useState(false);
  const [subToolbarCanScrollRight, setSubToolbarCanScrollRight] = useState(false);

  const checkSubToolbarScroll = useCallback(() => {
    const el = subToolbarRef.current;
    if (!el) return;
    setSubToolbarCanScrollLeft(el.scrollLeft > 6);
    setSubToolbarCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 6);
  }, []);

  const handleSubToolbarScrollLeft = useCallback(() => {
    if (subToolbarRef.current) {
      subToolbarRef.current.scrollBy({ left: -260, behavior: 'smooth' });
    }
  }, []);

  const handleSubToolbarScrollRight = useCallback(() => {
    if (subToolbarRef.current) {
      subToolbarRef.current.scrollBy({ left: 260, behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    const el = subToolbarRef.current;
    if (!el || !showSubToolbar) return;

    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth > el.clientWidth) {
        if (!e.ctrlKey && !e.metaKey) {
          if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && e.deltaY !== 0) {
            e.preventDefault();
            let delta = e.deltaY;
            if (e.deltaMode === 1) delta *= 33;
            else if (e.deltaMode === 2) delta *= 400;
            el.scrollLeft += delta;
            checkSubToolbarScroll();
          }
        }
      }
    };

    let isDown = false;
    let startX = 0;
    let scrollStart = 0;

    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('button, input, select, textarea, a, label, [role="button"], [role="slider"]')) {
        return;
      }
      isDown = true;
      startX = e.pageX - el.offsetLeft;
      scrollStart = el.scrollLeft;
      el.style.cursor = 'grab';
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - el.offsetLeft;
      const walk = (x - startX) * 1.3;
      el.scrollLeft = scrollStart - walk;
      el.style.cursor = 'grabbing';
      checkSubToolbarScroll();
    };

    const onMouseUp = () => {
      if (isDown) {
        isDown = false;
        if (el) el.style.cursor = '';
      }
    };

    const onScroll = () => {
      checkSubToolbarScroll();
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    el.addEventListener('scroll', onScroll, { passive: true });

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        checkSubToolbarScroll();
      });
      ro.observe(el);
    }

    checkSubToolbarScroll();

    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      el.removeEventListener('scroll', onScroll);
      if (ro) ro.disconnect();
    };
  }, [showSubToolbar, toolMode, activeChar, checkSubToolbarScroll]);

  return (
    <>
      {!isMobileFocusMode && showSubToolbar ? (
          <div
            ref={subToolbarRef}
            onWheel={(e) => {
              if (e.currentTarget.scrollWidth > e.currentTarget.clientWidth) {
                if (!e.ctrlKey && !e.metaKey && Math.abs(e.deltaY) > Math.abs(e.deltaX) && e.deltaY !== 0) {
                  const delta = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY;
                  e.currentTarget.scrollLeft += delta;
                  checkSubToolbarScroll();
                }
              }
            }}
            className={`h-11 border-b flex items-center justify-between px-2.5 sm:px-3 shrink-0 z-20 select-none overflow-x-auto touch-scroll-x custom-scrollbar gap-2 relative transition-colors ${themeClasses.subtoolbarBg}`}
          >
            {/* Sticky Left Scroll Jump Button */}
            {subToolbarCanScrollLeft && (
              <button
                type="button"
                onClick={handleSubToolbarScrollLeft}
                className="sticky left-0 z-30 shrink-0 flex items-center justify-center w-6 h-8 -my-1 rounded bg-stone-200/95 dark:bg-stone-800/95 hover:bg-emerald-100 dark:hover:bg-emerald-950/80 text-stone-700 dark:text-emerald-300 shadow-md border border-stone-300/80 dark:border-stone-700/80 transition-colors cursor-pointer"
                title="ツールバーを左へスクロール"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            )}
 {/* Left: Quick Character Switcher & Context Tool Settings */}
 <div className="flex items-center space-x-1.5 shrink-0">
 {onSelectPrevGlyph && (
 <button
 onClick={onSelectPrevGlyph}
 className="p-1.5 rounded hover:bg-emerald-100/70 dark:hover:bg-[#1e2d23] text-stone-600 dark:text-emerald-300 transition-colors"
 title="前の文字 (Shift+Enter)"
 >
 <ChevronLeft className="w-4 h-4" />
 </button>
 )}
 <div className="flex items-center px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300/80 dark:border-emerald-700 font-bold text-xs">
 <span className="text-emerald-950 dark:text-emerald-200 font-sans mr-1.5 text-sm">{activeChar}</span>
 <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400">
 U+{selectedUnicode?.toString(16).toUpperCase().padStart(4, '0')}
 </span>
 </div>
 {onSelectNextGlyph && (
 <button
 onClick={onSelectNextGlyph}
 className="p-1.5 rounded hover:bg-emerald-100/70 dark:hover:bg-[#1e2d23] text-stone-600 dark:text-emerald-300 transition-colors"
 title="次の文字 (Enter)"
 >
 <ChevronRight className="w-4 h-4" />
 </button>
 )}

 {/* Quick Dakuten / Handakuten button if Kana */}
 {(() => {
 const dInfo = DAKUTEN_MAPPINGS[activeChar];
 if (!dInfo) return null;
 return (
 <div className="flex items-center space-x-1 ml-1">
 {dInfo.type === 'seion' && dInfo.daku && onGenerateDakutenTarget && (
 <button
 onClick={() => {
 onGenerateDakutenTarget(dInfo.daku!, false);
 showCanvasToast(`濁音「${dInfo.daku}」を自動生成しました！`);
 }}
 className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-[10.5px] font-bold whitespace-nowrap hover:bg-amber-200 transition-colors"
 title={`濁音「${dInfo.daku}」を自動合成`}
 >
 ＋濁点「{dInfo.daku}」
 </button>
 )}
 {dInfo.type === 'seion' && dInfo.handaku && onGenerateDakutenTarget && (
 <button
 onClick={() => {
 onGenerateDakutenTarget(dInfo.handaku!, true);
 showCanvasToast(`半濁音「${dInfo.handaku}」を自動生成しました！`);
 }}
 className="px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200 text-[10.5px] font-bold whitespace-nowrap hover:bg-rose-200 transition-colors"
 title={`半濁音「${dInfo.handaku}」を自動合成`}
 >
 ＋半濁点「{dInfo.handaku}」
 </button>
 )}
 </div>
 );
 })()}

          {/* Primary View Controls (Moved to Left for immediate visibility) */}
          <div className="flex items-center space-x-1 pl-1 border-l border-stone-200 dark:border-stone-700 shrink-0">
            {/* Node Points Visibility Toggle */}
            <button
              type="button"
              onClick={() => {
                const next = !showNodes;
                setShowNodes(next);
                showCanvasToast(next ? '頂点・ハンドルを表示しました' : '頂点・ハンドルを非表示にしました');
              }}
              className={`p-1.5 sm:px-2 rounded border transition-colors flex items-center space-x-1 cursor-pointer shrink-0 ${
                showNodes
                  ? isLight
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : 'bg-emerald-950 border-emerald-700 text-emerald-200'
                  : 'border-stone-200 dark:border-stone-700 text-stone-400 bg-stone-100 dark:bg-stone-800'
              }`}
              title={showNodes ? '頂点とハンドルを隠して文字の形を確認 (クリックで非表示) [Nキー]' : '頂点とハンドルを表示 (クリックで表示) [Nキー]'}
            >
              {showNodes ? <Eye className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span className="text-[11px] font-bold">
                {showNodes ? '頂点表示' : '頂点隠す'}
              </span>
            </button>

            {/* Outline-Only (Wireframe) Mode Toggle */}
            <button
              type="button"
              onClick={() => {
                const next = !isOutlineMode;
                setOutlineOnly(next);
                showCanvasToast(
                  next
                    ? '輪郭モードを有効にしました（パスの重なりや形状を透過確認）'
                    : '塗りつぶし表示モードに戻しました'
                );
              }}
              className={`p-1.5 sm:px-2 rounded border transition-colors flex items-center space-x-1 cursor-pointer shrink-0 ${
                isOutlineMode
                  ? isLight
                    ? 'bg-sky-50 border-sky-400 text-sky-800'
                    : 'bg-sky-950 border-sky-600 text-sky-200'
                  : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
              }`}
              title={
                isOutlineMode
                  ? '輪郭モードON（クリックで塗りつぶし表示に戻す）[Shift+O / Alt+O]'
                  : '輪郭モード（ワイヤーフレーム：パスの重なりや曲線の形を確認）[Shift+O / Alt+O]'
              }
            >
              {isOutlineMode ? (
                <Square className="w-3.5 h-3.5 stroke-[2.5] text-sky-500 fill-none" />
              ) : (
                <div className="w-3.5 h-3.5 rounded-xs border border-stone-500 bg-stone-700 dark:border-stone-400 dark:bg-stone-300" />
              )}
              <span className="text-[11px] font-bold">
                {isOutlineMode ? '輪郭モード' : '塗り表示'}
              </span>
            </button>

            {/* Pointer / Crosshair Reticle Toggle */}
            {onChangeGridSettings && (
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
                    next ? '照準ポインター十字線: 表示 (ON)' : '照準ポインター十字線: 非表示 (OFF)',
                    next ? '高精度十字線ガイドを作図位置に表示' : '軽量標準ポインターのみ表示'
                  );
                }}
                className={`p-1.5 sm:px-2 rounded border transition-colors flex items-center space-x-1 cursor-pointer shrink-0 ${
                  gridSettings.showCursorCrosshair
                    ? isLight
                      ? 'bg-amber-50 border-amber-400 text-amber-900 font-bold'
                      : 'bg-emerald-950 border-emerald-600 text-emerald-200 font-bold'
                    : 'border-stone-200 dark:border-stone-700 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 bg-stone-100 dark:bg-stone-800'
                }`}
                title={`照準ポインター十字線: ${gridSettings.showCursorCrosshair ? '表示中 (クリックで非表示)' : '非表示 (クリックで表示)'} [Hキー]`}
              >
                <CircleDot className={`w-3.5 h-3.5 ${gridSettings.showCursorCrosshair ? 'text-amber-600 dark:text-emerald-400' : 'text-stone-400'}`} />
                <span className="text-[11px] font-bold">
                  {gridSettings.showCursorCrosshair ? '照準ON' : '照準OFF'}
                </span>
              </button>
            )}
          </div>

          {/* Brush Tool Options in Header */}
          {toolMode === 'brush' && (
            <>
              {/* Mobile Brush Presets Sheet Trigger */}
              <button
                onClick={() => setShowMobileBrushSheet(true)}
                className="sm:hidden px-2 py-1 rounded text-xs font-bold border transition-colors flex items-center space-x-1 bg-emerald-100 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 shrink-0"
                title="ペンの種類と太さを設定"
              >
                <Paintbrush className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-300" />
                <span>{PEN_PRESETS.find((p: any) => p.id === brushStyle)?.name || 'ペン'}</span>
                <span className="font-mono text-[10px]">({brushWidth}px)</span>
              </button>

              {/* Desktop Rich Brush Studio Controls */}
              <div className="hidden sm:flex items-center space-x-1.5 ml-1 pl-1.5 border-l border-stone-200 dark:border-stone-700 overflow-x-auto no-scrollbar">
                {/* All Pens Dropdown */}
                {onChangeBrushStyle && (
                  <select
                    value={brushStyle || 'signpen'}
                    onChange={(e) => {
                      const newStyle = e.target.value as BrushStyle;
                      onChangeBrushStyle(newStyle);
                      const preset = PEN_PRESETS.find((p: any) => p.id === newStyle);
                      if (preset && preset.defaultWidth && onChangeBrushWidth) {
                        onChangeBrushWidth(preset.defaultWidth);
                      }
                    }}
                    className={`text-xs font-bold px-1.5 py-1 rounded border transition-colors cursor-pointer outline-none ${
                      isLight
                        ? 'bg-stone-50 border-stone-300 text-stone-800 focus:border-emerald-600'
                        : 'bg-[#18231c] border-[#25382c] text-emerald-200 focus:border-emerald-500'
                    }`}
                    title="その他全ペンスタイル一覧"
                  >
                    {PEN_PRESETS.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                )}

 {/* Studio Launch Button */}
 {onOpenPenPresetsModal && (
 <button
 onClick={onOpenPenPresetsModal}
 className="px-2.5 py-1 rounded-lg text-xs font-bold border transition-all flex items-center space-x-1.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 border-stone-300 dark:border-stone-700 shrink-0 active:scale-95 cursor-pointer"
 title="ペン作成・ブラシカスタマイズスタジオを開く"
 >
 <Sliders className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
 <span>ペン作成・編集</span>
 </button>
 )}

 {/* Width Stepper */}
          {onChangeBrushWidth && (
            <div className="flex items-center gap-0.5 bg-stone-100 dark:bg-[#18231c] px-1.5 py-0.5 rounded-lg border border-stone-200 dark:border-stone-700 text-xs">
              <button
                onClick={() => onChangeBrushWidth(Math.max(4, brushWidth - 4))}
                className="px-1 py-0.5 font-bold hover:bg-stone-200 dark:hover:bg-stone-700 rounded text-stone-600 dark:text-stone-300"
                title="線を細く"
              >
                -
              </button>
              <span className="font-mono font-bold px-1 min-w-[32px] text-center">{brushWidth}px</span>
              <button
                onClick={() => onChangeBrushWidth(Math.min(150, brushWidth + 4))}
                className="px-1 py-0.5 font-bold hover:bg-stone-200 dark:hover:bg-stone-700 rounded text-stone-600 dark:text-stone-300"
                title="線を太く"
              >
                +
              </button>
            </div>
          )}

          {/* Pressure Sensitivity */}
 {onChangePressureSensitivity && (
 <div className="flex items-center gap-1">
 <button
 onClick={() => {
 if (pressureSensitivity === 'off') {
 onChangePressureSensitivity('high');
 } else {
 onChangePressureSensitivity('off');
 }
 }}
 className={`px-2 py-1 rounded-lg text-xs font-bold border transition-colors flex items-center space-x-1 ${
 pressureSensitivity !== 'off'
 ? 'bg-emerald-600 text-white border-emerald-600 '
 : 'bg-stone-100 dark:bg-stone-800 text-stone-500 border-stone-300 dark:border-stone-700'
 }`}
 title={pressureSensitivity !== 'off' ? '筆圧感知有効 (クリックでOFF)' : '筆圧感知無効 (クリックでON)'}
 >
 <Activity className="w-3 h-3" />
 <span className="hidden sm:inline">筆圧:</span>
 <span>{pressureSensitivity !== 'off' ? 'ON' : 'OFF'}</span>
 </button>

 {pressureSensitivity !== 'off' && (
 <select
 value={pressureSensitivity || 'normal'}
 onChange={(e) =>
 onChangePressureSensitivity(e.target.value as 'high' | 'normal' | 'low' | 'off')
 }
 className={`text-[11px] font-bold px-1.5 py-1 rounded border transition-colors cursor-pointer outline-none ${
 isLight
 ? 'bg-stone-50 border-stone-300 text-stone-800 focus:border-emerald-600'
 : 'bg-[#18231c] border-[#25382c] text-emerald-200 focus:border-emerald-500'
 }`}
 title="筆圧感度の調整"
 >
 <option value="high">感度: 高</option>
 <option value="normal">感度: 標準</option>
 <option value="low">感度: 低</option>
 </select>
 )}

 {pressureSensitivity !== 'off' && isStylusActive && (
 <div
 className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 text-[10.5px] font-bold"
 title="Apple Pencil / スタイラスペン筆圧感知中"
 >
 <Activity className="w-2.5 h-2.5 text-emerald-600" />
 <span>筆圧: {liveStylusPressure != null ? `${liveStylusPressure}%` : '待機中'}</span>
 </div>
 )}
 </div>
 )}

 {/* Anti-Cutout */}
 <button
 onClick={() => {
 const next = !autoResolveBrushOverlap;
 setAutoResolveBrushOverlap(next);
 try {
   localStorage.setItem('fontforge_auto_resolve_brush_overlap', String(next));
 } catch (error) {
   console.warn('Failed to persist brush overlap preference:', error);
 }
 showCanvasToast(
 next
 ? '一筆書きの重なり白抜き防止をONにしました'
 : '白抜き防止をOFFにしました'
 );
 }}
 className={`px-2 py-1 rounded-lg text-xs font-bold border transition-colors flex items-center space-x-1 ${
 autoResolveBrushOverlap
 ? 'bg-amber-600 text-white border-amber-600 '
 : 'bg-stone-100 dark:bg-stone-800 text-stone-500 border-stone-300 dark:border-stone-700'
 }`}
 title="一筆書きの線が交差・重なった部分が白く抜けるのを自動で防止・融解します"
 >
 <ShieldCheck className="w-3 h-3" />
 <span className="hidden sm:inline">白抜き防止:</span>
 <span>{autoResolveBrushOverlap ? 'ON' : 'OFF'}</span>
 </button>

 {/* Auto Union */}
 <button
 onClick={() => {
 const next = !autoUnionBrush;
 setAutoUnionBrush(next);
 try {
   localStorage.setItem('fontforge_auto_union_brush', String(next));
 } catch (error) {
   console.warn('Failed to persist brush union preference:', error);
 }
 showCanvasToast(
 next
 ? 'ストローク描画ごとの自動合体をONにしました'
 : '自動合体をOFFにしました（パスを個別に維持）'
 );
 }}
 className={`px-2 py-1 rounded-lg text-xs font-bold border transition-colors flex items-center space-x-1 ${
 autoUnionBrush
 ? 'bg-emerald-600 text-white border-emerald-600 '
 : 'bg-stone-100 dark:bg-stone-800 text-stone-500 border-stone-300 dark:border-stone-700'
 }`}
 title="描画完了時に重なる線を自動で合体するかどうかを切り替え"
 >
 <Layers className="w-3 h-3" />
 <span className="hidden sm:inline">自動合体:</span>
 <span>{autoUnionBrush ? 'ON' : 'OFF'}</span>
 </button>

 {/* Straight Mode */}
 <button
 onClick={() => {
 const next = !brushStraightMode;
 setBrushStraightMode(next);
 showCanvasToast(
 next
 ? '定規直線モードをONにしました (ドラッグで水平・垂直・45度の直線を引けます)'
 : '定規直線モードをOFFにしました (通常の手書き描画)'
 );
 }}
 className={`px-2 py-1 rounded-lg text-xs font-bold border transition-colors flex items-center space-x-1 ${
 brushStraightMode
 ? 'bg-sky-600 text-white border-sky-600 '
 : 'bg-stone-100 dark:bg-stone-800 text-stone-500 border-stone-300 dark:border-stone-700'
 }`}
 title="定規のように真っ直ぐな線を描画 (Shiftキーを押しながらドラッグでも直線にロック可能)"
 >
 <Ruler className="w-3 h-3" />
 <span className="hidden sm:inline">定規直線:</span>
 <span>{brushStraightMode ? 'ON' : 'OFF'}</span>
 </button>

 {/* Auto Smooth */}
 <div className="flex items-center gap-1">
 <button
 onClick={() => {
 const next = !autoSmoothBrush;
 setAutoSmoothBrush(next);
 showCanvasToast(next ? '手ブレ補正・自動平滑化をONにしました' : '自動平滑化をOFFにしました');
 }}
 className={`px-2 py-1 rounded-lg text-xs font-bold border transition-colors flex items-center space-x-1 ${
 autoSmoothBrush
 ? 'bg-emerald-600 text-white border-emerald-600 '
 : 'bg-stone-100 dark:bg-stone-800 text-stone-500 border-stone-300 dark:border-stone-700'
 }`}
 title="手書きストローク自動平滑化・手ブレ補正"
 >
 <Wand2 className="w-3 h-3" />
 <span className="hidden sm:inline">手ブレ補正:</span>
 <span>{autoSmoothBrush ? 'ON' : 'OFF'}</span>
 </button>

 {autoSmoothBrush && (
 <select
 value={smoothStrength}
 onChange={(e) => {
 const val = e.target.value as 'mild' | 'standard' | 'strong';
 setSmoothStrength(val);
 showCanvasToast(`手ブレ補正レベル: ${val === 'strong' ? '強 (なめらか)' : val === 'standard' ? '標準' : '弱 (そのまま)'}`);
 }}
 className={`text-[11px] font-bold px-1.5 py-1 rounded border transition-colors cursor-pointer outline-none ${
 isLight
 ? 'bg-stone-50 border-stone-300 text-stone-800 focus:border-emerald-600'
 : 'bg-[#18231c] border-[#25382c] text-emerald-200 focus:border-emerald-500'
 }`}
 title="手ブレ補正の強さを変更 (強にするとブレや手の揺れをしっかり平滑化して滑らかな曲線になります)"
 >
 <option value="strong">補正: 強 (なめらか)</option>
 <option value="standard">補正: 標準</option>
 <option value="mild">補正: 弱</option>
 </select>
 )}
 </div>

 {/* Straighten Wobbly Contour Action */}
              <button
                onClick={handleStraightenWobblySelected}
                className="px-2 py-1 rounded-lg text-xs font-bold border transition-colors flex items-center space-x-1 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 border-stone-300 dark:border-stone-700 active:scale-95 cursor-pointer"
                title="描いた線のうねり・ガタガタ歪みを自動でまっすぐ直線化補正します"
              >
                <Compass className="w-3 h-3" />
                <span className="hidden sm:inline">うねり直線補正</span>
                <span className="sm:hidden">直線補正</span>
              </button>
            </div>
          </>
        )}

        {/* Pen Tool options in Header */}
 {toolMode === 'pen' && (
 <div className="flex items-center gap-1 ml-1 pl-1.5 border-l border-stone-200 dark:border-stone-700 shrink-0">
 {/* Curve / Corner Toggle */}
 <div className="flex items-center bg-stone-100 dark:bg-stone-800 p-0.5 rounded-lg border border-stone-200 dark:border-stone-700">
 <button
 onClick={() => setPenMode('bezier')}
 className={`px-1.5 py-0.5 rounded text-xs font-bold flex items-center space-x-1 transition-colors ${
 penMode === 'bezier'
 ? 'bg-emerald-700 text-white'
 : 'text-stone-600 dark:text-stone-300 hover:text-stone-900'
 }`}
 title="ベジェ曲線モード (滑らかな曲線を描画)"
 >
 <Spline className="w-3 h-3" />
 <span className="hidden xs:inline">曲線</span>
 </button>
 <button
 onClick={() => setPenMode('corner')}
 className={`px-1.5 py-0.5 rounded text-xs font-bold flex items-center space-x-1 transition-colors ${
 penMode === 'corner'
 ? 'bg-emerald-700 text-white'
 : 'text-stone-600 dark:text-stone-300 hover:text-stone-900'
 }`}
 title="折れ線モード (直線的な角を描画)"
 >
 <Square className="w-3 h-3" />
 <span className="hidden xs:inline">折線</span>
 </button>
 </div>

 {/* Pen Stroke Width Controls */}
 <div className="flex items-center space-x-1 px-1.5 py-0.5 rounded-lg bg-stone-100/90 dark:bg-stone-800/90 border border-stone-200 dark:border-stone-700">
 <span className="text-[10px] font-semibold text-stone-500 dark:text-stone-400 whitespace-nowrap hidden sm:inline">
 太さ:
 </span>

 {/* Stepper Down */}
 <button
 onClick={() => handleSetPenStrokeWidth(penStrokeWidth - (penStrokeWidth > 20 ? 5 : 2))}
 disabled={penStrokeWidth <= 2}
 className="w-5 h-5 rounded bg-white dark:bg-stone-700 text-stone-700 dark:text-stone-200 font-bold text-xs flex items-center justify-center hover:bg-stone-200 dark:hover:bg-stone-600 disabled:opacity-30 transition-colors cursor-pointer"
 title="線の太さを減らす (-5px)"
 >
 -
 </button>

 {/* Input / display */}
 <div className="flex items-center">
 <input
 type="number"
 min={2}
 max={300}
 value={penStrokeWidth}
 onChange={(e) => {
 const val = parseInt(e.target.value, 10);
 if (!isNaN(val)) handleSetPenStrokeWidth(val);
 }}
 className="w-10 h-5 text-center text-xs font-mono font-bold bg-white dark:bg-stone-700 rounded border border-stone-300 dark:border-stone-600 text-stone-900 dark:text-stone-100 focus:outline-emerald-500"
 />
 <span className="text-[9px] text-stone-400 font-mono ml-0.5">px</span>
 </div>

 {/* Stepper Up */}
 <button
 onClick={() => handleSetPenStrokeWidth(penStrokeWidth + (penStrokeWidth >= 20 ? 5 : 2))}
 disabled={penStrokeWidth >= 300}
 className="w-5 h-5 rounded bg-white dark:bg-stone-700 text-stone-700 dark:text-stone-200 font-bold text-xs flex items-center justify-center hover:bg-stone-200 dark:hover:bg-stone-600 disabled:opacity-30 transition-colors cursor-pointer"
 title="線の太さを増やす (+5px)"
 >
 +
 </button>

 {/* Quick Preset Dropdown (replaces 5 wide buttons) */}
 <select
 value={[15, 30, 45, 60, 80].includes(penStrokeWidth) ? penStrokeWidth : ''}
 onChange={(e) => {
 const w = parseInt(e.target.value, 10);
 if (!isNaN(w)) handleSetPenStrokeWidth(w);
 }}
 className="text-[10px] font-mono font-bold px-1 py-0.5 bg-white dark:bg-stone-700 rounded border border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-200 cursor-pointer outline-none ml-0.5"
 title="太さプリセット選択"
 >
 <option value="" disabled hidden>プリセット</option>
 {[15, 30, 45, 60, 80].map((w) => (
 <option key={w} value={w}>{w}px</option>
 ))}
 </select>

 {/* Single Cyclic Cap Style Toggle Button (Round -> Butt -> Square) */}
 <button
 onClick={() => {
 const next = penCapStyle === 'round' ? 'butt' : penCapStyle === 'butt' ? 'square' : 'round';
 handleSetPenCapStyle(next);
 }}
 className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-800 hover:bg-sky-200 transition-colors cursor-pointer flex items-center gap-0.5"
 title={`端点の形状: 現在「${penCapStyle === 'round' ? '丸 (Round)' : penCapStyle === 'butt' ? '平 (Butt)' : '角 (Square)'}」（クリックで切替）`}
 >
 <span>端:</span>
 <span>{penCapStyle === 'round' ? '丸' : penCapStyle === 'butt' ? '平' : '角'}</span>
 </button>
 </div>

 {/* Studio Launch Icon Button */}
 {onOpenPenPresetsModal && (
 <button
 onClick={onOpenPenPresetsModal}
 className="p-1.5 rounded-lg text-xs font-bold flex items-center bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 border border-stone-300 dark:border-stone-700 transition-colors cursor-pointer"
 title="ペン作成・ブラシカスタマイズスタジオを開く"
 >
 <Sliders className="w-3.5 h-3.5" />
 </button>
 )}
 </div>
 )}

 {/* Eraser Tool Options in Header */}
 {toolMode === 'eraser' && (
 <div className="flex items-center space-x-2 ml-1 pl-1.5 border-l border-stone-200 dark:border-stone-700">
 {/* Eraser Mode Buttons */}
 <div className="flex items-center bg-stone-100 dark:bg-stone-800 p-0.5 rounded-lg border border-stone-300/80 dark:border-stone-700">
 <button
 onClick={() => setEraserMode('stroke')}
 className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition-all ${
 eraserMode === 'stroke'
 ? 'bg-rose-600 text-white shadow-xs'
 : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
 }`}
 title="触れた線・パーツを消去 (標準消しゴム)"
 >
 消しゴム
 </button>
 <button
 onClick={() => setEraserMode('cut')}
 className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition-all ${
 eraserMode === 'cut'
 ? 'bg-rose-600 text-white shadow-xs'
 : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
 }`}
 title="なぞった位置のパスを削り取り・分割"
 >
 部分削り
 </button>
 <button
 onClick={() => setEraserMode('node')}
 className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition-all ${
 eraserMode === 'node'
 ? 'bg-rose-600 text-white shadow-xs'
 : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
 }`}
 title="消しゴム円内の頂点（アンカーポイント）のみ消去"
 >
 アンカー消去
 </button>
 </div>

 {/* Size Controls */}
 <div className="flex items-center space-x-0.5 bg-stone-100 dark:bg-stone-800 p-0.5 rounded border border-stone-300 dark:border-stone-700">
 <button
 onClick={() => {
 setEraserSize((prev) => Math.max(8, prev - 6));
 }}
 className="w-5 h-5 flex items-center justify-center font-bold text-xs rounded hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 cursor-pointer"
 title="消しゴムを小さく ([ キー)"
 >
 -
 </button>
 <span className="font-mono font-bold text-xs px-1 text-rose-700 dark:text-rose-300 w-10 text-center shrink-0">
 {eraserSize}px
 </span>
 <button
 onClick={() => {
 setEraserSize((prev) => Math.min(160, prev + 6));
 }}
 className="w-5 h-5 flex items-center justify-center font-bold text-xs rounded hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 cursor-pointer"
 title="消しゴムを大きく (] キー)"
 >
 +
 </button>
 </div>

 {/* Quick Presets */}
 <div className="hidden lg:flex items-center space-x-1">
 {[16, 32, 60, 96, 140].map((s) => (
 <button
 key={s}
 onClick={() => {
 setEraserSize(s);
 }}
 className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono transition-colors cursor-pointer ${
 eraserSize === s
 ? 'bg-rose-600 text-white'
 : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-rose-100 dark:hover:bg-rose-950'
 }`}
 >
 {s}px
 </button>
 ))}
 </div>

 {/* Clear All Contours button */}
 <button
 onClick={handleClearAll}
 className="px-2.5 py-1 rounded-lg text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 dark:hover:text-white transition-colors flex items-center space-x-1 ml-1 cursor-pointer"
 title="この文字のすべての輪郭を一括消去 (Ctrl+Zで取り消し可能)"
 >
 <Trash2 className="w-3.5 h-3.5" />
 <span>文字を全クリア</span>
 </button>
 </div>
 )}

 {/* Ruler / Dimension Measurement Options in Header */}
 {toolMode === 'ruler' && (
 <div className="flex items-center space-x-2 ml-1 pl-1.5 border-l border-stone-200 dark:border-stone-700 flex-wrap gap-y-1">
 <div className="flex items-center space-x-1.5 text-xs">
 <div className="flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-200 font-medium text-[11px]">
 <Ruler className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
 <span>定規・寸法計測</span>
 </div>

 {rulerMeasurement && !rulerMeasurement.active ? (
 <div className="flex items-center space-x-1.5">
 <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-900/60 text-sky-900 dark:text-sky-100 border border-sky-300 dark:border-sky-700">
 {Math.round(Math.hypot(rulerMeasurement.end.x - rulerMeasurement.start.x, rulerMeasurement.end.y - rulerMeasurement.start.y))}px
 </span>
 <span className="font-mono text-[10px] text-stone-500 dark:text-stone-400 hidden sm:inline">
 ({Math.round(((Math.atan2(-(rulerMeasurement.end.y - rulerMeasurement.start.y), rulerMeasurement.end.x - rulerMeasurement.start.x) * 180 / Math.PI) % 360 + 360) % 360)}°)
 </span>

 {/* Diagonal Guide Button */}
 <button
 onClick={() => handleConvertRulerToGuideline('diagonal')}
 className="px-2 py-0.5 rounded text-[11px] font-bold bg-cyan-600 hover:bg-cyan-700 text-white transition-colors flex items-center space-x-1 cursor-pointer shadow-xs"
 title="定規の角度のまま斜めガイド線を作成"
 >
 <span>斜めガイド化</span>
 </button>

 {/* Orthogonal Guide Button */}
 <button
 onClick={() => handleConvertRulerToGuideline('auto')}
 className="px-2 py-0.5 rounded text-[11px] font-bold bg-sky-600 hover:bg-sky-700 text-white transition-colors flex items-center space-x-1 cursor-pointer shadow-xs"
 title="水平または垂直ガイド線を作成"
 >
 <span>直交ガイド化</span>
 </button>

 <button
 onClick={handleDrawRulerAsStroke}
 className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center space-x-1 cursor-pointer shadow-xs"
 title="計測ラインを直線ストロークとして作図 (Enter)"
 >
 <PenTool className="w-3 h-3" />
 <span>直線化 (Enter)</span>
 </button>

 <button
 onClick={() => setRulerMeasurement(null)}
 className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-800 transition-colors cursor-pointer flex items-center gap-1"
 title="選んだ定規の計測表示を消去 (Esc/Delete)"
 >
 <Trash2 className="w-3 h-3" />
 <span className="hidden sm:inline">定規消去</span>
 </button>
 </div>
 ) : (
 <span className="text-[11px] text-stone-500 dark:text-stone-400 hidden sm:inline">
 2点をドラッグして計測 (Shiftで15°刻みスナップ)
 </span>
 )}

 {/* Guide Eraser Tool Mode Toggle & Clear All */}
 <div className="flex items-center space-x-1 pl-1.5 border-l border-stone-200 dark:border-stone-700">
 <button
 onClick={() => setIsGuideEraserActive((prev) => !prev)}
 className={`px-2 py-0.5 rounded text-[11px] font-bold flex items-center space-x-1 cursor-pointer transition-colors shadow-xs ${
 isGuideEraserActive
 ? 'bg-rose-600 text-white ring-2 ring-rose-400 animate-pulse'
 : 'bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 border border-stone-300 dark:border-stone-600'
 }`}
 title="ガイド線消去モード: ガイド線をクリックで即削除"
 >
 <Eraser className="w-3 h-3" />
 <span>{isGuideEraserActive ? '消去モード作動中' : 'ガイド消去モード'}</span>
 </button>

 {customGuidelines.length > 0 && (
 <button
 onClick={handleClearAllGuidelines}
 className="px-1.5 py-0.5 rounded text-[10px] text-stone-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
 title={`すべてのガイド線を消去 (現在: ${customGuidelines.length}本)`}
 >
 全消去 ({customGuidelines.length})
 </button>
 )}
 </div>
 </div>
 </div>
 )}

 {/* Node Tool options in Header */}
 {toolMode === 'node' && (
 <div className="flex items-center space-x-1.5 ml-1 pl-1.5 border-l border-stone-200 dark:border-stone-700">
 {/* Node Appearance Style Selector */}
 <div className="flex items-center bg-stone-100 dark:bg-stone-800 p-0.5 rounded border border-stone-200 dark:border-stone-700 text-[10px]">
 <button
 onClick={() => {
 setNodeStyle('clean');
 }}
 className={`px-1.5 py-0.5 rounded font-medium transition-colors ${
 nodeStyle === 'clean'
 ? 'bg-white dark:bg-stone-700 text-emerald-700 dark:text-emerald-300 font-bold'
 : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
 }`}
 title="小ドット表示"
 >
 形状優先
 </button>
 <button
 onClick={() => {
 setNodeStyle('selected_only');
 }}
 className={`px-1.5 py-0.5 rounded font-medium transition-colors ${
 nodeStyle === 'selected_only'
 ? 'bg-white dark:bg-stone-700 text-emerald-700 dark:text-emerald-300 font-bold'
 : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
 }`}
 title="選択中のパーツのみ頂点を表示"
 >
 選択のみ
 </button>
 <button
 onClick={() => {
 setNodeStyle('full');
 }}
 className={`px-1.5 py-0.5 rounded font-medium transition-colors ${
 nodeStyle === 'full'
 ? 'bg-white dark:bg-stone-700 text-emerald-700 dark:text-emerald-300 font-bold'
 : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
 }`}
 title="詳細ボックスとハンドルを常時表示"
 >
 詳細
 </button>
 </div>

 {selectedNodeId && selectedContourId && (
 <>
 <button
 onClick={() => handleToggleNodeType(selectedContourId, selectedNodeId)}
 className={`px-2 py-1 rounded text-xs font-bold flex items-center space-x-1 transition-colors ${
 isLight
 ? 'bg-sky-100 text-sky-900 hover:bg-sky-200 border border-sky-300'
 : 'bg-sky-950 text-sky-200 hover:bg-sky-900 border border-sky-700'
 }`}
 title="角ノードと曲線ノードを切り替え (ノードをダブルクリックでも可能)"
 >
 <Activity className="w-3 h-3 text-sky-600 dark:text-sky-400" />
 <span>角 ⇄ 曲線</span>
 </button>
 <button
 onClick={() => handleDeleteSelectedNode()}
 className="px-2 py-1 rounded text-xs font-bold flex items-center space-x-1 transition-colors bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 hover:bg-rose-200 border border-rose-300 dark:border-rose-800"
 title="選択したノードを削除 (Deleteキー)"
 >
 <Trash2 className="w-3 h-3 text-rose-600 dark:text-rose-400" />
 <span>削除</span>
 </button>
            </>
 )}
 </div>
 )}

 {/* Shape Tool modifier options in Header */}
 {isShapeTool && (
 <div className="flex items-center space-x-1.5 ml-1 pl-1.5 border-l border-stone-200 dark:border-stone-700">
 {/* Shape aspect ratio lock toggle */}
 <button
 type="button"
 onClick={() => {
 setIsShiftLockRatio((prev) => !prev);
 showCanvasToast(!isShiftLockRatio ? '正方形・正円比率に固定しました' : '自由比率に切り替えました');
 }}
 className={`px-2 py-1 rounded text-xs font-bold border transition-colors flex items-center space-x-1 cursor-pointer ${
 isShiftLockRatio
 ? 'bg-emerald-600 text-white border-emerald-600'
 : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-300 dark:border-stone-700 hover:bg-stone-200 dark:hover:bg-stone-700'
 }`}
 title="1:1 正方形・正円比率固定 (ドラッグ中Shiftキーでも可能)"
 >
 <span className="hidden sm:inline">比率:</span>
 <span>{isShiftLockRatio ? '正方形/正円固定' : '自由変形'}</span>
 </button>

 {/* Shape center draw toggle */}
 <button
 type="button"
 onClick={() => {
 setIsAltFromCenter((prev) => !prev);
 showCanvasToast(!isAltFromCenter ? '中心基準作図をONにしました' : '中心基準作図をOFFにしました');
 }}
 className={`hidden sm:flex px-2 py-1 rounded text-xs font-bold border transition-colors items-center space-x-1 cursor-pointer ${
 isAltFromCenter
 ? 'bg-emerald-600 text-white border-emerald-600'
 : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-300 dark:border-stone-700 hover:bg-stone-200 dark:hover:bg-stone-700'
 }`}
 title="中心から作図 (ドラッグ中Altキーでも可能)"
 >
 <span>中心基準:</span>
 <span>{isAltFromCenter ? 'ON' : 'OFF'}</span>
 </button>
 </div>
 )}
 </div>

 {/* Center: Selected Part Actions / Quick Transform Strip (Only in Select or Node tool modes) */}
        <div className="flex items-center space-x-1 shrink-0">
 {(toolMode === 'select' || toolMode === 'node') && selectedContourIds.length > 0 && (
 <div className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-stone-100 dark:bg-[#18231c] border border-stone-200 dark:border-stone-700">
 <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 pr-0.5">
 選択中{selectedContourIds.length > 1 ? ` (${selectedContourIds.length}個)` : ''}:
 </span>
 <span className="text-[9px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/70 px-1 py-0.5 rounded border border-amber-300 dark:border-amber-700 flex items-center gap-0.5">
 <Lock className="w-2.5 h-2.5" />
 <span>描画ロック中</span>
 </span>
 <button
 onClick={() => {
 setSelectedContourIds([]);
 setSelectedContourId(null);
 setSelectedNodeId(null);
 setSelectedHandleType(null);
 showCanvasToast('選択を解除しました（描画可能）');
 }}
 className="px-1.5 py-0.5 rounded bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 text-[10px] font-bold hover:bg-stone-300 dark:hover:bg-stone-600 flex items-center gap-0.5 mr-0.5"
 title="選択を解除してキャンバス描画を再開 (Esc)"
 >
 <X className="w-2.5 h-2.5" />
 <span>解除(Esc)</span>
 </button>
 {selectedContourIds.length >= 1 && (
 <button
 onClick={handleMergeSelectedContours}
 className="px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold flex items-center space-x-1 transition-all active:scale-95 mr-1"
 title={
 selectedContourIds.length === 1
 ? '一筆書きの自己交差・ループによる重なり白抜きを自動解消'
 : '選択した複数のパスを合体し、重なり白抜きを解消'
 }
 >
 <Layers className="w-2.5 h-2.5" />
 <span>{selectedContourIds.length === 1 ? '重なり白抜き解消' : '合体・白抜き解消'}</span>
 </button>
 )}
 {selectedContourIds.length >= 2 && (
 <>
 <button
 onClick={handleSubtractSelectedContours}
 className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold flex items-center space-x-1 transition-all active:scale-95 mr-1"
 title="前面のパスで背面のパスを型抜き（差分）"
 >
 <span>型抜き</span>
 </button>
 <button
 onClick={handleIntersectSelectedContours}
 className="px-2 py-0.5 rounded bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-bold flex items-center space-x-1 transition-all active:scale-95 mr-1"
 title="重なった部分のみを抽出（交差）"
 >
 <span>交差</span>
 </button>
            </>
 )}
 <button
 onClick={() => handleSmoothStrokeSelected(smoothStrength, smoothPreserveCorners)}
 className="px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-bold flex items-center space-x-0.5 hover:bg-emerald-500"
 title="スムーズ化"
 >
 <Wand2 className="w-2.5 h-2.5" />
 <span>スムーズ</span>
 </button>
 <button
 onClick={handleConvertToCornersSelected}
 className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-200 text-[10px] font-bold hover:bg-blue-100"
 title="角・直線に変換"
 >
 角化
 </button>
 <button
 onClick={handleConvertToSmoothSelected}
 className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 text-[10px] font-bold hover:bg-emerald-100"
 title="曲線に変換"
 >
 曲線化
 </button>
 <button
 onClick={handleExpandStrokeSelected}
 className="px-1.5 py-0.5 rounded bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-200 text-[10px] font-bold hover:bg-sky-100 flex items-center space-x-0.5"
 title={`選択した線を太さ ${penStrokeWidth}px の輪郭に変換`}
 >
 <PenTool className="w-2.5 h-2.5" />
 <span>線輪郭化({penStrokeWidth}px)</span>
 </button>
 <button
 onClick={handleReverseWindingSelected}
 className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 text-[10px] font-bold hover:bg-amber-100 flex items-center space-x-0.5"
 title="向き反転（時計回り/反時計回り）：重なりの白抜きと黒塗りを切り替え"
 >
 <RotateCcw className="w-2.5 h-2.5" />
 <span>向き反転</span>
 </button>
 <button
 onClick={handleFlipHSelected}
 className="p-1 rounded hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200"
 title="左右反転"
 >
 <FlipHorizontal className="w-3 h-3" />
 </button>
 <button
 onClick={handleFlipVSelected}
 className="p-1 rounded hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200"
 title="上下反転"
 >
 <FlipVertical className="w-3 h-3" />
 </button>
 <button
 onClick={() => handleRotateSelected(90)}
 className="p-1 rounded hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200"
 title="90度回転"
 >
 <RotateCw className="w-3 h-3" />
 </button>
 <button
 onClick={() => handleSlantSelected(10)}
 className="p-1 rounded hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200"
 title="斜体 (+10°)"
 >
 <Italic className="w-3 h-3" />
 </button>
 <button
 onClick={handleDuplicateSelected}
 className="p-1 rounded hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200"
 title="複製"
 >
 <Copy className="w-3 h-3" />
 </button>
 <button
 onClick={handleDeleteSelected}
 className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-950/60 text-rose-600 dark:text-rose-400"
 title="削除 (Delete)"
 >
 <Trash2 className="w-3 h-3" />
 </button>
 <button
 onClick={() => {
 setSelectedContourIds([]);
 setSelectedNodeId(null);
 }}
 className="p-1 rounded hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
 title="選択解除 (Esc)"
 >
 <X className="w-3 h-3" />
 </button>
 </div>
 )}
 </div>

 {/* Right: Actions & Custom Guidelines */}
 <div className="flex items-center space-x-1.5 shrink-0">

 {/* Custom Guidelines Lock & Clear if any exist */}
 {customGuidelines.length > 0 && (
 <div className="hidden sm:flex items-center space-x-1 pl-1 border-l border-stone-200 dark:border-stone-700">
 <button
 onClick={() => {
 const nextLocked = !lockGuidelines;
 setLockGuidelines(nextLocked);
 showCanvasToast(
 nextLocked ? 'ガイド線をロックしました' : 'ガイド線のロックを解除しました (移動可能)'
 );
 }}
 className={`p-1.5 rounded border transition-colors flex items-center space-x-1 text-xs font-bold ${
 lockGuidelines
 ? isLight
 ? 'bg-stone-100 border-stone-300 text-stone-600'
 : 'bg-stone-800 border-stone-700 text-stone-300'
 : 'bg-amber-100 dark:bg-amber-950 border-amber-400 text-amber-900 dark:text-amber-200'
 }`}
 title={
 lockGuidelines
 ? 'ガイド線ロック中 (クリックで移動可能に解除)'
 : 'ガイド線移動可能 (クリックでロック)'
 }
 >
 {lockGuidelines ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
 <span className="text-[10px]">{lockGuidelines ? 'ガイド固定' : '移動可能'}</span>
 </button>
 <button
 onClick={() => {
 setCustomGuidelines([]);
 showCanvasToast('カスタムガイド線を消去しました');
 }}
 className="p-1.5 rounded hover:bg-rose-100 dark:hover:bg-rose-950 text-stone-400 hover:text-rose-600 transition-colors"
 title="カスタムガイド線を全消去"
 >
 <X className="w-3.5 h-3.5" />
 </button>
 </div>
 )}

 {/* Clear All button if has contours */}
 {contours.length > 0 && (
 <button
 onClick={handleClearAll}
 className="p-1.5 rounded hover:bg-rose-100 dark:hover:bg-rose-950 text-rose-600 dark:text-rose-400 transition-colors"
 title="全パスを消去"
 >
 <Trash2 className="w-3.5 h-3.5" />
 </button>
 )}

 {/* Collapse Subtoolbar button */}
 <button
 onClick={handleToggleSubToolbar}
 className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-[#202e24] text-stone-400 hover:text-stone-700 dark:hover:text-emerald-300 transition-colors ml-0.5"
 title="サブツールバーを折りたたむ (作図キャンバスを広く使う)"
 >
 <ChevronUp className="w-3.5 h-3.5" />
 </button>
 </div>

            {/* Sticky Right Scroll Jump Button */}
            {subToolbarCanScrollRight && (
              <button
                type="button"
                onClick={handleSubToolbarScrollRight}
                className="sticky right-0 z-30 shrink-0 flex items-center justify-center w-6 h-8 -my-1 rounded bg-stone-200/95 dark:bg-stone-800/95 hover:bg-emerald-100 dark:hover:bg-emerald-950/80 text-stone-700 dark:text-emerald-300 shadow-md border border-stone-300/80 dark:border-stone-700/80 transition-colors cursor-pointer"
                title="ツールバーを右へスクロール"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
 </div>
 ) : (
 /* Collapsed Floating Minimal Trigger (Zero layout height consumed) */
 !isMobileFocusMode && (
 <div
 className="absolute top-2 left-2 z-20 pointer-events-auto flex items-center space-x-1 bg-white/95 dark:bg-[#121c15]/95 px-2 py-1 rounded-full border border-stone-200/80 dark:border-emerald-800/60 text-xs select-none shadow-sm"
 onPointerDown={(e) => e.stopPropagation()}
 >
 {onSelectPrevGlyph && (
 <button
 onClick={onSelectPrevGlyph}
 className="p-0.5 rounded-full hover:bg-stone-200 dark:hover:bg-emerald-950 text-stone-600 dark:text-emerald-300"
 title="前の文字"
 >
 <ChevronLeft className="w-3.5 h-3.5" />
 </button>
 )}
 <span className="font-bold text-emerald-900 dark:text-emerald-200 px-1 font-sans">{activeChar}</span>
 {onSelectNextGlyph && (
 <button
 onClick={onSelectNextGlyph}
 className="p-0.5 rounded-full hover:bg-stone-200 dark:hover:bg-emerald-950 text-stone-600 dark:text-emerald-300"
 title="次の文字"
 >
 <ChevronRight className="w-3.5 h-3.5" />
 </button>
 )}
 <div className="w-[1px] h-3 bg-stone-300 dark:bg-emerald-800 mx-0.5" />
 <button
 onClick={handleToggleSubToolbar}
 className="flex items-center space-x-1 px-1.5 py-0.5 rounded-full hover:bg-emerald-100 dark:hover:bg-emerald-950 text-[10.5px] font-bold text-emerald-800 dark:text-emerald-300 transition-colors"
 title="サブツールバーを展開"
 >
 <Sliders className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
 <span className="hidden xs:inline">詳細バー</span>
 <ChevronDown className="w-3 h-3" />
 </button>
 {onChangeGridSettings && (
 <>
 <div className="w-[1px] h-3 bg-stone-300 dark:bg-emerald-800 mx-0.5" />
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
 className={`p-1 rounded-full transition-colors ${
  gridSettings.showCursorCrosshair
  ? isLight
   ? 'bg-amber-100 text-amber-900 font-bold'
   : 'bg-emerald-800 text-amber-300 font-bold'
  : 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'
 }`}
 title={`照準ポインター切替 [Hキー]: ${gridSettings.showCursorCrosshair ? 'ON' : 'OFF'}`}
 >
 <CircleDot className="w-3 h-3" />
 </button>
 </>
 )}
 </div>
 )
      )}
    </>

  );
});

CanvasSubToolbar.displayName = 'CanvasSubToolbar';
