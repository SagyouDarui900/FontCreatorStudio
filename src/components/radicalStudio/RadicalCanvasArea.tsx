import React, { useMemo } from 'react';
import {
  GripVertical,
  PenTool,
  RotateCcw,
  CornerDownLeft,
  ChevronDown,
  Check,
  Trash2,
  CircleDot,
  Copy,
  FlipHorizontal,
  FlipVertical,
  Wand2,
  Undo2,
  Redo2,
  ZoomOut,
  ZoomIn,
} from 'lucide-react';
import { CustomPart, ToolMode, PathContour, FontProject, GlyphData, Point, NodeType } from '../../types';
import {
  contoursToSvgPath,
  getContoursBoundingBox,
  groupContoursForRendering,
} from '../../utils/pathUtils';
import { SCREEN_BASELINE_Y } from '../../utils/fontCompiler';

export interface RadicalCanvasAreaProps {
  canvasContainerRef: React.RefObject<HTMLDivElement | null>;
  svgCanvasRef: React.RefObject<SVGSVGElement | null>;
  isLight: boolean;
  toolMode: ToolMode;
  activePart: CustomPart | null;
  activePenContour: PathContour | null;
  penHudPos: Point | null;
  setPenHudPos: (pos: Point | null) => void;
  handlePartPenHudPointerDown: (e: React.PointerEvent) => void;
  handlePartPenHudPointerMove: (e: React.PointerEvent) => void;
  handlePartPenHudPointerUp: (e: React.PointerEvent) => void;
  handleUndoPartPenNode: () => void;
  handleFinishPartPenContour: (closed?: boolean, customWidth?: number) => void;
  showPenStrokeMenu: boolean;
  setShowPenStrokeMenu: React.Dispatch<React.SetStateAction<boolean>>;
  penStrokeWidth: number;
  setPenStrokeWidth: React.Dispatch<React.SetStateAction<number>>;
  handleResetPartPenContour: () => void;
  selectedNodeId: string | null;
  selectedContourId: string | null;
  handleToggleSelectedNodeType: () => void;
  handleDeleteSelectedNode: () => void;
  handleDuplicateSelectedContour: () => void;
  handleFlipSelectedContour: (axis: 'h' | 'v') => void;
  handleSmoothSelectedContour: () => void;
  handleDeleteSelectedContour: () => void;
  isMoveAllPart: boolean;
  isSpacePressed: boolean;
  isPanning: boolean;
  handlePointerDown: (e: React.PointerEvent<SVGSVGElement>) => void;
  handlePointerMove: (e: React.PointerEvent<SVGSVGElement>) => void;
  handlePointerUp: (e: React.PointerEvent<SVGSVGElement>) => void;
  handlePointerCancel: (e: React.PointerEvent<SVGSVGElement>) => void;
  setEraserHoverPos: (pos: Point | null) => void;
  handleWheel: (e: React.WheelEvent<SVGSVGElement>) => void;
  pan: Point;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  resetView: () => void;
  showGrid: boolean;
  showMetrics: boolean;
  showKanjiGuides: boolean;
  showNineBoxes: boolean;
  showWatermark: boolean;
  watermarkChar: string;
  watermarkOpacity: number;
  watermarkScale: number;
  project: FontProject;
  isSnapEnabled: boolean;
  activeSnapLines: { x: number | null; y: number | null };
  isWireframeMode: boolean;
  eraserRadius: number;
  eraserHoverPos: Point | null;
  activeBrushPathRef: React.RefObject<SVGPathElement | null>;
  brushSvgPath: string;
  activeEraserPathRef: React.RefObject<SVGPathElement | null>;
  penSvgPath: string;
  penMousePos: Point | null;
  isPenNearFirstNode: boolean;
  shapeStartPoint: Point | null;
  shapeCurrentPoint: Point | null;
  getShapeContours: (mode: ToolMode, p1: Point, p2: Point) => PathContour[];
  handleUndo: () => void;
  handleRedo: () => void;
  undoStack: any[];
  redoStack: any[];
}

export const RadicalCanvasArea: React.FC<RadicalCanvasAreaProps> = ({
  canvasContainerRef,
  svgCanvasRef,
  isLight,
  toolMode,
  activePart,
  activePenContour,
  penHudPos,
  setPenHudPos,
  handlePartPenHudPointerDown,
  handlePartPenHudPointerMove,
  handlePartPenHudPointerUp,
  handleUndoPartPenNode,
  handleFinishPartPenContour,
  showPenStrokeMenu,
  setShowPenStrokeMenu,
  penStrokeWidth,
  setPenStrokeWidth,
  handleResetPartPenContour,
  selectedNodeId,
  selectedContourId,
  handleToggleSelectedNodeType,
  handleDeleteSelectedNode,
  handleDuplicateSelectedContour,
  handleFlipSelectedContour,
  handleSmoothSelectedContour,
  handleDeleteSelectedContour,
  isMoveAllPart,
  isSpacePressed,
  isPanning,
  handlePointerDown,
  handlePointerMove,
  handlePointerUp,
  handlePointerCancel,
  setEraserHoverPos,
  handleWheel,
  pan,
  zoom,
  setZoom,
  resetView,
  showGrid,
  showMetrics,
  showKanjiGuides,
  showNineBoxes,
  showWatermark,
  watermarkChar,
  watermarkOpacity,
  watermarkScale,
  project,
  isSnapEnabled,
  activeSnapLines,
  isWireframeMode,
  eraserRadius,
  eraserHoverPos,
  activeBrushPathRef,
  brushSvgPath,
  activeEraserPathRef,
  penSvgPath,
  penMousePos,
  isPenNearFirstNode,
  shapeStartPoint,
  shapeCurrentPoint,
  getShapeContours,
  handleUndo,
  handleRedo,
  undoStack,
  redoStack,
}) => {
  const getSelectedNodeType = (): NodeType | null => {
    if (!activePart || !selectedContourId || !selectedNodeId) return null;
    const contour = activePart.contours.find((c) => c.id === selectedContourId);
    const node = contour?.nodes.find((n) => n.id === selectedNodeId);
    return node?.type || null;
  };

  const getContourNodeCount = (): number => {
    if (!activePart || !selectedContourId) return 0;
    const contour = activePart.contours.find((c) => c.id === selectedContourId);
    return contour?.nodes.length || 0;
  };

  const mainRenderGroups = useMemo(() => {
    if (!activePart || !activePart.contours || activePart.contours.length === 0) return [];
    return groupContoursForRendering(activePart.contours);
  }, [activePart?.contours]);

  return (
     <div ref={canvasContainerRef} className="flex-1 min-h-0 relative overflow-hidden bg-[#eaf2ec] dark:bg-[#0c130e]">
 {/* Active Pen Tool Drawing In-Progress Draggable Floating HUD Bar */}
 {activePenContour && (
 <div
 style={
 penHudPos
 ? { left: `${penHudPos.x}px`, top: `${penHudPos.y}px` }
 : { left: '50%', transform: 'translateX(-50%)', top: '20px' }
 }
 className="absolute z-30 pointer-events-auto select-none animate-in fade-in zoom-in-95 duration-100"
 onPointerDown={(e) => e.stopPropagation()}
 >
 <div
 className={`px-2 py-1 rounded-full border shadow-xl flex items-center space-x-1.5 text-xs whitespace-nowrap ${
 isLight
 ? 'bg-white/95 border-emerald-300/80 text-stone-800 '
 : 'bg-[#121c15]/95 border-emerald-700/60 text-emerald-100 '
 }`}
 >
 {/* Drag Handle */}
 <div
 onPointerDown={handlePartPenHudPointerDown}
 onPointerMove={handlePartPenHudPointerMove}
 onPointerUp={handlePartPenHudPointerUp}
 onPointerCancel={handlePartPenHudPointerUp}
 className="flex items-center px-1 py-1 -ml-0.5 cursor-grab active:cursor-grabbing text-stone-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
 title="ドラッグして好きな場所に移動"
 >
 <GripVertical className="w-3.5 h-3.5" />
 </div>

 {/* Active Points Count */}
 <div className="flex items-center space-x-1 px-1.5 py-0.5 rounded-full bg-emerald-100/80 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-300 font-bold font-mono text-[11px] shrink-0 whitespace-nowrap">
 <PenTool className="w-3 h-3 text-emerald-700 dark:text-emerald-400" />
 <span>{activePenContour.nodes.length}点</span>
 </div>

 <div className="h-3.5 w-[1px] bg-stone-200 dark:bg-emerald-800/80 shrink-0" />

 {/* Undo Last Point */}
 <button
 type="button"
 onClick={handleUndoPartPenNode}
 className={`px-2 py-0.5 rounded-full text-[11px] font-semibold flex items-center space-x-1 transition-all active:scale-95 whitespace-nowrap ${
 isLight
 ? 'bg-stone-100 hover:bg-emerald-100 text-stone-700 hover:text-emerald-900'
 : 'bg-[#1e2d23] hover:bg-[#283d30] text-emerald-200'
 }`}
 title="直前の頂点を取り消す (Backspace)"
 >
 <RotateCcw className="w-3 h-3 text-stone-500 dark:text-stone-300 shrink-0" />
 <span>1点戻す</span>
 </button>

 {/* Finalize as open path / stroke with configurable line thickness */}
 <div className="relative flex items-center">
 <button
 type="button"
 onClick={() => handleFinishPartPenContour(false)}
 disabled={activePenContour.nodes.length < 2}
 className={`px-2 py-0.5 rounded-l-full text-[11px] font-semibold flex items-center space-x-1 transition-all disabled:opacity-30 active:scale-95 whitespace-nowrap ${
 isLight
 ? 'bg-sky-50 hover:bg-sky-100 text-sky-800 border-r border-sky-200'
 : 'bg-sky-950/70 hover:bg-sky-900/80 text-sky-200 border-r border-sky-800'
 }`}
 title={`開いた線を太さ ${penStrokeWidth}px で確定する`}
 >
 <CornerDownLeft className="w-3 h-3 text-sky-600 dark:text-sky-400 shrink-0" />
 <span>線で確定</span>
 </button>

 <button
 type="button"
 onClick={() => setShowPenStrokeMenu((prev) => !prev)}
 className={`px-1.5 py-0.5 rounded-r-full text-[10px] font-mono font-bold flex items-center space-x-0.5 transition-all active:scale-95 ${
 isLight
 ? 'bg-sky-100 hover:bg-sky-200 text-sky-900'
 : 'bg-sky-900/90 hover:bg-sky-800 text-sky-100'
 }`}
 title="線の太さを変更"
 >
 <span>{penStrokeWidth}px</span>
 <ChevronDown className="w-2.5 h-2.5 opacity-70" />
 </button>

 {showPenStrokeMenu && (
 <div
 className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent pointer-events-auto"
 onClick={() => setShowPenStrokeMenu(false)}
 >
 <div
 className={`p-3 rounded-2xl shadow-2xl border flex flex-col space-y-2.5 min-w-[240px] text-xs pointer-events-auto animate-in fade-in zoom-in-95 duration-100 ${
 isLight
 ? 'bg-white/95 border-sky-200 text-stone-800 '
 : 'bg-[#0f1b14]/95 border-sky-800/80 text-sky-100 '
 }`}
 onClick={(e) => e.stopPropagation()}
 >
 <div className="flex items-center justify-between pb-1.5 border-b border-stone-200 dark:border-stone-800">
 <span className="font-bold flex items-center space-x-1.5 text-sky-700 dark:text-sky-300">
 <PenTool className="w-3.5 h-3.5" />
 <span>線の太さ設定</span>
 </span>
 <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 text-xs">
 {penStrokeWidth} px
 </span>
 </div>

 <div className="flex items-center space-x-2">
 <button
 type="button"
 onClick={() => setPenStrokeWidth((prev) => Math.max(2, prev - 5))}
 disabled={penStrokeWidth <= 2}
 className="w-7 h-7 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 font-bold text-sm flex items-center justify-center disabled:opacity-30 cursor-pointer"
 >
 -
 </button>
 <input
 type="range"
 min={4}
 max={160}
 step={2}
 value={penStrokeWidth}
 onChange={(e) => setPenStrokeWidth(parseInt(e.target.value, 10))}
 className="flex-1 h-2 accent-sky-600 dark:accent-sky-500 cursor-pointer"
 />
 <button
 type="button"
 onClick={() => setPenStrokeWidth((prev) => Math.min(300, prev + 5))}
 disabled={penStrokeWidth >= 300}
 className="w-7 h-7 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 font-bold text-sm flex items-center justify-center disabled:opacity-30 cursor-pointer"
 >
 +
 </button>
 </div>

 <div>
 <span className="text-[10px] text-stone-500 dark:text-stone-400 mb-1 block">クイック太さ:</span>
 <div className="grid grid-cols-5 gap-1 font-mono text-[11px]">
 {[15, 25, 40, 60, 80].map((w) => (
 <button
 key={w}
 type="button"
 onClick={() => setPenStrokeWidth(w)}
 className={`py-1 rounded text-center transition-all cursor-pointer ${
 penStrokeWidth === w
 ? 'bg-sky-600 text-white font-bold ring-1 ring-sky-400'
 : 'bg-stone-100 dark:bg-stone-800/80 hover:bg-sky-100 dark:hover:bg-sky-950 text-stone-700 dark:text-stone-300'
 }`}
 >
 {w}
 </button>
 ))}
 </div>
 </div>

 <button
 type="button"
 onClick={() => {
 setShowPenStrokeMenu(false);
 handleFinishPartPenContour(false);
 }}
 disabled={activePenContour.nodes.length < 2}
 className="mt-1 w-full py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-30 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md active:scale-98 transition-all cursor-pointer"
 >
 <CornerDownLeft className="w-3.5 h-3.5" />
 <span>この太さ ({penStrokeWidth}px) で線確定</span>
 </button>
 </div>
 </div>
 )}
 </div>

 {/* Finalize as closed path */}
 <button
 type="button"
 onClick={() => handleFinishPartPenContour(true)}
 disabled={activePenContour.nodes.length < 3}
 className="px-2.5 py-0.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center space-x-1 transition-all disabled:opacity-30 active:scale-95 whitespace-nowrap"
 title="パスを閉じて輪郭として確定する (Enter)"
 >
 <Check className="w-3 h-3 shrink-0" />
 <span>閉じて確定</span>
 </button>

 {/* Discard / Reset Path */}
 <button
 onClick={handleResetPartPenContour}
 className="p-1 rounded-full hover:bg-rose-100 dark:hover:bg-rose-950/60 text-rose-600 dark:text-rose-400 transition-colors"
 title="作図中のパスを破棄・リセットする (Esc)"
 >
 <Trash2 className="w-3.5 h-3.5" />
 </button>

 {/* Reset Position (only if moved) */}
 {penHudPos && (
 <button
 onClick={() => setPenHudPos(null)}
 className="p-1 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
 title="位置を上部中央にリセット"
 >
 <RotateCcw className="w-2.5 h-2.5" />
 </button>
 )}
 </div>
 </div>
 )}

 {/* Floating Path / Node Direct Editing Mini Toolbar Overlay */}
 {toolMode === 'select' && (selectedContourId || selectedNodeId) && activePart && (
 <div
 className="absolute z-20 top-4 left-1/2 -translate-x-1/2 pointer-events-auto select-none animate-in fade-in zoom-in-95 duration-100"
 onPointerDown={(e) => e.stopPropagation()}
 >
 <div
 className={`px-2.5 py-1.5 rounded-full border shadow-xl flex items-center space-x-1.5 text-xs ${
 isLight
 ? 'bg-white/95 border-emerald-300 text-stone-800 '
 : 'bg-[#121c15]/95 border-emerald-700 text-emerald-100 '
 }`}
 >
 {selectedNodeId && (
 <>
 <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold px-1.5 border-r border-stone-200 dark:border-stone-700">
 選択頂点
 </span>
 <button
 onClick={handleToggleSelectedNodeType}
 className="px-2 py-0.5 rounded-full bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/70 dark:hover:bg-emerald-900 text-emerald-900 dark:text-emerald-200 font-semibold flex items-center space-x-1 transition-all"
 title="直線角 ↔ Smooth曲線を切り替え"
 >
 <CircleDot className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
 <span>{getSelectedNodeType() === 'smooth' ? '角に変更' : '曲線に変更'}</span>
 </button>
 <button
 onClick={handleDeleteSelectedNode}
 className="px-2 py-0.5 rounded-full bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 font-semibold flex items-center space-x-1 transition-all"
 title="選択した頂点を削除 (Delete)"
 >
 <Trash2 className="w-3 h-3 text-rose-500" />
 <span>頂点削除</span>
 </button>
 <div className="w-px h-3.5 bg-stone-300 dark:bg-stone-700 mx-0.5" />
 </>
 )}

 {selectedContourId && (
 <>
 <span className="text-[10px] text-sky-600 dark:text-sky-400 font-bold px-1.5 border-r border-stone-200 dark:border-stone-700">
 輪郭 ({getContourNodeCount()}点)
 </span>
 <button
 onClick={handleDuplicateSelectedContour}
 className="px-2 py-0.5 rounded-full bg-stone-100 hover:bg-emerald-100 dark:bg-[#1e2d22] dark:hover:bg-[#283e2e] text-stone-800 dark:text-emerald-200 font-semibold flex items-center space-x-1 transition-all"
 title="選択した輪郭を複製"
 >
 <Copy className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
 <span>複製</span>
 </button>
 <button
 onClick={() => handleFlipSelectedContour('h')}
 className="px-2 py-0.5 rounded-full bg-stone-100 hover:bg-emerald-100 dark:bg-[#1e2d22] dark:hover:bg-[#283e2e] text-stone-800 dark:text-emerald-200 font-semibold flex items-center space-x-1 transition-all"
 title="左右反転"
 >
 <FlipHorizontal className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
 <span>左右反転</span>
 </button>
 <button
 onClick={() => handleFlipSelectedContour('v')}
 className="px-2 py-0.5 rounded-full bg-stone-100 hover:bg-emerald-100 dark:bg-[#1e2d22] dark:hover:bg-[#283e2e] text-stone-800 dark:text-emerald-200 font-semibold flex items-center space-x-1 transition-all"
 title="上下反転"
 >
 <FlipVertical className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
 <span>上下反転</span>
 </button>
 <button
 onClick={handleSmoothSelectedContour}
 className="px-2 py-0.5 rounded-full bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/70 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-200 font-semibold flex items-center space-x-1 transition-all"
 title="パスの頂点数を減らしてなめらかにする"
 >
 <Wand2 className="w-3 h-3 text-stone-600 dark:text-stone-300" />
 <span>滑らか化</span>
 </button>
 <button
 onClick={handleDeleteSelectedContour}
 className="px-2 py-0.5 rounded-full bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 font-semibold flex items-center space-x-1 transition-all"
 title="選択した輪郭を削除 (Delete)"
 >
 <Trash2 className="w-3 h-3 text-rose-500" />
 <span>削除</span>
 </button>
 </>
 )}
 </div>
 </div>
 )}
 <svg
 ref={svgCanvasRef}
 style={{ touchAction: 'none' }}
 className={`w-full h-full select-none ${
 toolMode === 'select'
 ? isMoveAllPart
 ? 'cursor-move'
 : 'cursor-default'
 : toolMode === 'hand' || isSpacePressed
 ? (isPanning ? 'cursor-grabbing' : 'cursor-grab')
 : 'cursor-crosshair'
 }`}
 onPointerDown={handlePointerDown}
 onPointerMove={handlePointerMove}
 onPointerUp={handlePointerUp}
 onPointerCancel={handlePointerCancel}
 onPointerLeave={() => {
 setEraserHoverPos(null);
 }}
 onWheel={handleWheel}
 >
 <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
 {/* EM Square Background / Body (1000x1000) */}
 <rect
 x={0}
 y={0}
 width={1000}
 height={1000}
 fill={isLight ? '#ffffff' : '#141d17'}
 stroke={isLight ? '#99b8a8' : '#2d4334'}
 strokeWidth={2}
 />

 {/* Grid Lines */}
 {showGrid && (
 <g opacity={isLight ? 0.35 : 0.25}>
 {Array.from({ length: 19 }).map((_, i) => {
 const pos = (i + 1) * 50;
 return (
 <React.Fragment key={pos}>
 <line
 x1={pos}
 y1={0}
 x2={pos}
 y2={1000}
 stroke={isLight ? '#c0d6cb' : '#223629'}
 strokeWidth={1}
 />
 <line
 x1={0}
 y1={pos}
 x2={1000}
 y2={pos}
 stroke={isLight ? '#c0d6cb' : '#223629'}
 strokeWidth={1}
 />
 </React.Fragment>
 );
 })}
 </g>
 )}

 {/* Nine Boxes (九宮格) */}
 {showNineBoxes && (
 <g opacity={0.65} strokeDasharray="6 4">
 <line x1={333} y1={0} x2={333} y2={1000} stroke="#3b82f6" strokeWidth={1.5} />
 <line x1={666} y1={0} x2={666} y2={1000} stroke="#3b82f6" strokeWidth={1.5} />
 <line x1={0} y1={333} x2={1000} y2={333} stroke="#3b82f6" strokeWidth={1.5} />
 <line x1={0} y1={666} x2={1000} y2={666} stroke="#3b82f6" strokeWidth={1.5} />
 </g>
 )}

 {/* Kanji Hen / Tsukuri & Kanmuri / Ashi Split Guide Boxes */}
 {showKanjiGuides && (
 <g opacity={0.7}>
 {/* Hen Guide Box (Left 46%) */}
 <rect
 x={40}
 y={40}
 width={420}
 height={920}
 fill="#10b981"
 fillOpacity={0.03}
 stroke="#10b981"
 strokeWidth={1.5}
 strokeDasharray="5 5"
 />
 <text x={50} y={80} fill="#10b981" fontSize={26} fontWeight="bold" opacity={0.6}>
 偏 (HEN)
 </text>

 {/* Tsukuri Guide Box (Right 46%) */}
 <rect
 x={540}
 y={40}
 width={420}
 height={920}
 fill="#3b82f6"
 fillOpacity={0.03}
 stroke="#3b82f6"
 strokeWidth={1.5}
 strokeDasharray="5 5"
 />
 <text x={550} y={80} fill="#3b82f6" fontSize={26} fontWeight="bold" opacity={0.6}>
 旁 (TSUKURI)
 </text>

 {/* Kanmuri Guide Box (Top 36%) */}
 <rect
 x={40}
 y={40}
 width={920}
 height={340}
 fill="#f59e0b"
 fillOpacity={0.02}
 stroke="#f59e0b"
 strokeWidth={1.5}
 strokeDasharray="4 6"
 />
 <text x={840} y={80} fill="#f59e0b" fontSize={26} fontWeight="bold" opacity={0.6}>
 冠
 </text>

 {/* Ashi Guide Box (Bottom 36%) */}
 <rect
 x={40}
 y={620}
 width={920}
 height={340}
 fill="#ec4899"
 fillOpacity={0.02}
 stroke="#ec4899"
 strokeWidth={1.5}
 strokeDasharray="4 6"
 />
 <text x={840} y={660} fill="#ec4899" fontSize={26} fontWeight="bold" opacity={0.6}>
 脚
 </text>

 {/* Center Crosshairs */}
 <line
 x1={500}
 y1={0}
 x2={500}
 y2={1000}
 stroke="#10b981"
 strokeWidth={1.5}
 strokeDasharray="4 4"
 />
 <line
 x1={0}
 y1={500}
 x2={1000}
 y2={500}
 stroke="#10b981"
 strokeWidth={1.5}
 strokeDasharray="4 4"
 />
 </g>
 )}

 {/* Standard Metrics Line */}
 {showMetrics && (
 <g opacity={0.7}>
 <line
 x1={0}
 y1={SCREEN_BASELINE_Y}
 x2={1000}
 y2={SCREEN_BASELINE_Y}
 stroke="#ef4444"
 strokeWidth={1.5}
 />
 <text
 x={10}
 y={SCREEN_BASELINE_Y - 8}
 fill="#ef4444"
 fontSize={22}
 fontWeight="bold"
 >
 Baseline (y=800)
 </text>
 </g>
 )}

 {/* Target Character Watermark Background */}
 {showWatermark && (
 <g
 transform={
 watermarkScale !== 1.0
 ? `translate(${500 * (1 - watermarkScale)}, ${500 * (1 - watermarkScale)}) scale(${watermarkScale})`
 : undefined
 }
 >
 {(() => {
 const allGlyphs = Object.values(project.glyphs || {}) as GlyphData[];
 const bgGlyph = allGlyphs.find((g) => g.char === watermarkChar || (watermarkChar && g.unicode === watermarkChar.codePointAt(0)));
 if (bgGlyph && bgGlyph.contours && bgGlyph.contours.length > 0) {
 return (
   <>
     {groupContoursForRendering(bgGlyph.contours).map((group) => (
       <path
         key={group.id}
         d={group.d}
         fill={isLight ? '#047857' : '#34d399'}
         fillOpacity={watermarkOpacity}
         fillRule={group.fillRule}
         stroke={isLight ? '#059669' : '#10b981'}
         strokeWidth={1.5}
         strokeDasharray="4 4"
         pointerEvents="none"
       />
     ))}
   </>
 );
 }
 return (
 <text
 x={500}
 y={720}
 textAnchor="middle"
 fill={isLight ? '#10b981' : '#34d399'}
 fillOpacity={watermarkOpacity}
 fontSize={680}
 fontWeight="bold"
 pointerEvents="none"
 style={{ fontFamily: 'sans-serif' }}
 >
 {watermarkChar}
 </text>
 );
 })()}
 </g>
 )}

 {/* Active Magnetic Snap Lines Overlay */}
 {isSnapEnabled && activeSnapLines.x !== null && (
 <g pointerEvents="none">
 <line
 x1={activeSnapLines.x}
 y1={0}
 x2={activeSnapLines.x}
 y2={1000}
 stroke="#06b6d4"
 strokeWidth={2}
 strokeDasharray="4 2"
 />
 <circle cx={activeSnapLines.x} cy={500} r={5} fill="#06b6d4" />
 </g>
 )}
 {isSnapEnabled && activeSnapLines.y !== null && (
 <g pointerEvents="none">
 <line
 x1={0}
 y1={activeSnapLines.y}
 x2={1000}
 y2={activeSnapLines.y}
 stroke="#06b6d4"
 strokeWidth={2}
 strokeDasharray="4 2"
 />
 <circle cx={500} cy={activeSnapLines.y} r={5} fill="#06b6d4" />
 </g>
 )}

 {/* ================= DRAWN GLYPH PATHS ================= */}
 {/* Main Part Contours */}
 {mainRenderGroups.length > 0 &&
  mainRenderGroups.map((group) => (
   <path
    key={group.id}
    d={group.d}
    fill={isWireframeMode ? 'none' : (isLight ? '#1c2920' : '#ecfdf5')}
    fillRule={group.fillRule}
    stroke={isLight ? '#047857' : '#34d399'}
    strokeWidth={isWireframeMode ? 2.5 : 1}
   />
  ))}

 {/* Selected Contour Highlight */}
 {selectedContourId && activePart && (
 (() => {
 const sel = activePart.contours.find((c) => c.id === selectedContourId);
 if (!sel) return null;
 return (
 <path
 d={contoursToSvgPath([sel])}
 fill="none"
 stroke="#10b981"
 strokeWidth={3}
 strokeDasharray="6 4"
 />
 );
 })()
 )}

 {/* Real-time High-Performance Live Brush Path */}
 <path
 ref={activeBrushPathRef}
 d={brushSvgPath || ''}
 fill={isLight ? '#047857' : '#34d399'}
 fillOpacity={0.88}
 />

 {/* Real-time Cut Eraser Ribbon Preview Path */}
 <path
 ref={activeEraserPathRef}
 d=""
 fill="none"
 stroke="#f43f5e"
 strokeWidth={eraserRadius * 2}
 strokeLinecap="round"
 strokeLinejoin="round"
 opacity={0.45}
 pointerEvents="none"
 />

 {/* Real-time Circular Touch & Mouse Reticle */}
 {toolMode === 'eraser' && eraserHoverPos && (
 <g pointerEvents="none">
 <circle
 cx={eraserHoverPos.x}
 cy={eraserHoverPos.y}
 r={eraserRadius}
 fill="#f43f5e"
 fillOpacity={0.16}
 stroke="#f43f5e"
 strokeWidth={2 / zoom}
 strokeDasharray={`${4 / zoom} ${3 / zoom}`}
 />
 <circle
 cx={eraserHoverPos.x}
 cy={eraserHoverPos.y}
 r={Math.max(2, 3 / zoom)}
 fill="#f43f5e"
 />
 </g>
 )}

 {/* Active Pen Path in-progress */}
 {penSvgPath && (
 <path
 d={penSvgPath}
 fill="none"
 stroke="#10b981"
 strokeWidth={3}
 />
 )}

 {/* In-progress Pen Ghost Segment to current cursor */}
 {toolMode === 'pen' && activePenContour && penMousePos && activePenContour.nodes.length > 0 && (
 (() => {
 const lastNode = activePenContour.nodes[activePenContour.nodes.length - 1];
 return (
 <g pointerEvents="none" opacity={0.65}>
 <line
 x1={lastNode.x}
 y1={lastNode.y}
 x2={penMousePos.x}
 y2={penMousePos.y}
 stroke="#10b981"
 strokeWidth={2}
 strokeDasharray="4 4"
 />
 {isPenNearFirstNode && activePenContour.nodes.length >= 2 && (
 <circle
 cx={activePenContour.nodes[0].x}
 cy={activePenContour.nodes[0].y}
 r={10}
 fill="none"
 stroke="#10b981"
 strokeWidth={2.5}
 />
 )}
 </g>
 );
 })()
 )}

 {/* Active Shape in-progress */}
 {shapeStartPoint && shapeCurrentPoint && (
 <path
 d={contoursToSvgPath(
 getShapeContours(toolMode, shapeStartPoint, shapeCurrentPoint)
 )}
 fill="#f59e0b"
 fillOpacity={0.35}
 stroke="#f59e0b"
 strokeWidth={2}
 fillRule="evenodd"
 pointerEvents="none"
 />
 )}

 {/* Bezier Nodes, Bounding Box & Interactive Tangent Handles */}
 {activePart &&
 activePart.contours.map((contour) => {
 const isContourSelected = selectedContourId === contour.id;
 return (
 <g key={contour.id}>
 {/* Selected Contour Bounding Box Overlay */}
 {isContourSelected && (
 (() => {
 const bbox = getContoursBoundingBox([contour]);
 return (
 <g pointerEvents="none">
 <rect
 x={bbox.minX - 6}
 y={bbox.minY - 6}
 width={bbox.width + 12}
 height={bbox.height + 12}
 fill="none"
 stroke="#10b981"
 strokeWidth={Math.max(1, 1.5 / zoom)}
 strokeDasharray="4 4"
 />
 </g>
 );
 })()
 )}

 {contour.nodes.map((node) => {
 const isNodeSelected = selectedNodeId === node.id;
 const showHandles = isNodeSelected || isContourSelected;
 const isContourActive = isContourSelected || (activePart && activePart.contours.length === 1);
 
 // Clean, subtle, high-precision node sizing
 const nodeRadius = isNodeSelected
 ? Math.max(2.8, Math.min(4.8, 3.8 / Math.sqrt(Math.max(0.3, zoom))))
 : isContourActive
 ? Math.max(1.8, Math.min(3.2, 2.4 / Math.sqrt(Math.max(0.3, zoom))))
 : Math.max(1.2, Math.min(2.0, 1.6 / Math.sqrt(Math.max(0.3, zoom))));
 const handleRadius = Math.max(1.5, Math.min(2.8, 2.0 / Math.sqrt(Math.max(0.3, zoom))));
 const strokeW = Math.max(0.6, Math.min(1.2, 0.9 / Math.sqrt(Math.max(0.3, zoom))));
 const nodeOpacity = isNodeSelected ? 1.0 : isContourActive ? 0.9 : 0.45;

 return (
 <g key={node.id} opacity={nodeOpacity}>
 {/* Tangent Handles for selected node / contour */}
 {showHandles && (
 <g pointerEvents="none">
 {node.handleIn && (
 <g>
 <line
 x1={node.x}
 y1={node.y}
 x2={node.handleIn.x}
 y2={node.handleIn.y}
 stroke="#3b82f6"
 strokeWidth={strokeW}
 strokeDasharray={isNodeSelected ? undefined : '2 2'}
 opacity={isNodeSelected ? 0.9 : 0.5}
 />
 <circle
 cx={node.handleIn.x}
 cy={node.handleIn.y}
 r={handleRadius}
 fill="#3b82f6"
 stroke="#ffffff"
 strokeWidth={strokeW}
 />
 </g>
 )}
 {node.handleOut && (
 <g>
 <line
 x1={node.x}
 y1={node.y}
 x2={node.handleOut.x}
 y2={node.handleOut.y}
 stroke="#f59e0b"
 strokeWidth={strokeW}
 strokeDasharray={isNodeSelected ? undefined : '2 2'}
 opacity={isNodeSelected ? 0.9 : 0.5}
 />
 <circle
 cx={node.handleOut.x}
 cy={node.handleOut.y}
 r={handleRadius}
 fill="#f59e0b"
 stroke="#ffffff"
 strokeWidth={strokeW}
 />
 </g>
 )}
 </g>
 )}

 {/* Anchor Point Node */}
 {node.type === 'smooth' ? (
 <circle
 cx={node.x}
 cy={node.y}
 r={nodeRadius}
 fill={isNodeSelected ? '#ef4444' : isContourSelected ? '#10b981' : '#059669'}
 stroke="#ffffff"
 strokeWidth={strokeW}
 />
 ) : (
 <rect
 x={node.x - nodeRadius}
 y={node.y - nodeRadius}
 width={nodeRadius * 2}
 height={nodeRadius * 2}
 rx={1}
 fill={isNodeSelected ? '#ef4444' : isContourSelected ? '#10b981' : '#059669'}
 stroke="#ffffff"
 strokeWidth={strokeW}
 />
 )}
 </g>
 );
 })}
 </g>
 );
 })}

 {/* Active Pen Contour Nodes */}
 {activePenContour &&
 activePenContour.nodes.map((node, idx) => (
 <g key={node.id}>
 {idx === 0 && (
 <circle
 cx={node.x}
 cy={node.y}
 r={7}
 fill="#f59e0b"
 stroke="#ffffff"
 strokeWidth={2}
 />
 )}
 <circle
 cx={node.x}
 cy={node.y}
 r={idx === 0 ? 5 : 4.5}
 fill={idx === 0 ? '#ef4444' : '#10b981'}
 stroke="#ffffff"
 strokeWidth={1.5}
 />
 {node.handleOut && (
 <g>
 <line
 x1={node.x}
 y1={node.y}
 x2={node.handleOut.x}
 y2={node.handleOut.y}
 stroke="#3b82f6"
 strokeWidth={1.5}
 />
 <circle
 cx={node.handleOut.x}
 cy={node.handleOut.y}
 r={4}
 fill="#3b82f6"
 stroke="#ffffff"
 strokeWidth={1.5}
 />
 </g>
 )}
 </g>
 ))}
 </g>
 </svg>

 {/* Mobile Floating Canvas Quick Controls (Zoom, Fit, Undo, Redo) */}
 <div className="md:hidden absolute top-3 right-3 z-30 flex items-center space-x-1 bg-white/95 dark:bg-[#152019]/95 px-2 py-1 rounded-full border border-stone-200 dark:border-stone-700 shadow-lg text-xs">
 <button
 onClick={handleUndo}
 disabled={undoStack.length === 0}
 className="p-1 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-30 text-stone-700 dark:text-stone-300"
 title="元に戻す"
 >
 <Undo2 className="w-3.5 h-3.5" />
 </button>
 <button
 onClick={handleRedo}
 disabled={redoStack.length === 0}
 className="p-1 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-30 text-stone-700 dark:text-stone-300"
 title="やり直す"
 >
 <Redo2 className="w-3.5 h-3.5" />
 </button>
 <div className="w-[1px] h-3 bg-stone-300 dark:bg-stone-700 mx-0.5" />
 <button
 onClick={() => setZoom((z) => Math.max(0.2, Number((z * 0.8).toFixed(2))))}
 className="p-1 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300"
 title="縮小"
 >
 <ZoomOut className="w-3.5 h-3.5" />
 </button>
 <button
 onClick={resetView}
 className="px-1 text-[10px] font-mono font-bold text-stone-700 dark:text-emerald-300"
 title="全体表示 (フィット)"
 >
 {Math.round(zoom * 100)}%
 </button>
 <button
 onClick={() => setZoom((z) => Math.min(5, Number((z * 1.25).toFixed(2))))}
 className="p-1 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300"
 title="拡大"
 >
 <ZoomIn className="w-3.5 h-3.5" />
 </button>
 </div>
 </div>
  );
};
