import React from 'react';
import {
  MousePointer,
  PenTool,
  Paintbrush,
  Square,
  Circle,
  Triangle,
  CircleDot,
  Disc,
  Slash,
  Diamond,
  Hexagon,
  Star,
  Sparkles,
  Heart,
  Moon,
  ChevronDown,
  Eraser,
  Hand,
  Layers,
  Wand2,
  RefreshCw,
  Move,
  FlipHorizontal,
  FlipVertical,
  ZoomOut,
  ZoomIn,
  Maximize2,
  Undo2,
  Redo2,
  BookOpen,
  Minus,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { CustomPart, ToolMode, ShapeType, PathContour } from '../../types';

export interface RadicalCanvasToolbarProps {
  toolMode: ToolMode;
  setToolMode: (mode: ToolMode) => void;
  activeShapeType: ShapeType;
  setActiveShapeType: (type: ShapeType) => void;
  showShapeMenu: boolean;
  setShowShapeMenu: React.Dispatch<React.SetStateAction<boolean>>;
  isLight: boolean;
  isAutoUnionMode: boolean;
  setIsAutoUnionMode: (mode: boolean) => void;
  notify: (text: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  handleUnionPart: () => void;
  handleNormalizeWinding: () => void;
  handleSimplifyPart: () => void;
  handleCenterPartInCanvas: () => void;
  handleFlipHPart: () => void;
  handleFlipVPart: () => void;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  resetView: () => void;
  undoStack: any[];
  redoStack: any[];
  handleUndo: () => void;
  handleRedo: () => void;
  showKanjiGuides: boolean;
  setShowKanjiGuides: (show: boolean) => void;
  isWireframeMode: boolean;
  setIsWireframeMode: (wire: boolean) => void;
  showNineBoxes: boolean;
  setShowNineBoxes: (show: boolean) => void;
  isSnapEnabled: boolean;
  setIsSnapEnabled: (snap: boolean) => void;
  showWatermark: boolean;
  setShowWatermark: (show: boolean) => void;
  watermarkChar: string;
  setWatermarkChar: (char: string) => void;
  selectedChar: string;
  watermarkOpacity: number;
  setWatermarkOpacity: (op: number) => void;
  showWatermarkPicker: boolean;
  setShowWatermarkPicker: (show: boolean) => void;
  relatedKanjiList: string[];
  watermarkScale: number;
  setWatermarkScale: React.Dispatch<React.SetStateAction<number>>;
  handleClearCanvas: () => void;
  activePart: CustomPart | null;
}

export const RadicalCanvasToolbar: React.FC<RadicalCanvasToolbarProps> = ({
  toolMode,
  setToolMode,
  activeShapeType,
  setActiveShapeType,
  showShapeMenu,
  setShowShapeMenu,
  isLight,
  isAutoUnionMode,
  setIsAutoUnionMode,
  notify,
  handleUnionPart,
  handleNormalizeWinding,
  handleSimplifyPart,
  handleCenterPartInCanvas,
  handleFlipHPart,
  handleFlipVPart,
  zoom,
  setZoom,
  resetView,
  undoStack,
  redoStack,
  handleUndo,
  handleRedo,
  showKanjiGuides,
  setShowKanjiGuides,
  isWireframeMode,
  setIsWireframeMode,
  showNineBoxes,
  setShowNineBoxes,
  isSnapEnabled,
  setIsSnapEnabled,
  showWatermark,
  setShowWatermark,
  watermarkChar,
  setWatermarkChar,
  selectedChar,
  watermarkOpacity,
  setWatermarkOpacity,
  showWatermarkPicker,
  setShowWatermarkPicker,
  relatedKanjiList,
  watermarkScale,
  setWatermarkScale,
  handleClearCanvas,
  activePart,
}) => {
  return (
            <div
          onWheel={(e) => {
            if (e.currentTarget.scrollWidth > e.currentTarget.clientWidth) {
              if (!e.ctrlKey && !e.metaKey && Math.abs(e.deltaY) > Math.abs(e.deltaX) && e.deltaY !== 0) {
                const delta = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY;
                e.currentTarget.scrollLeft += delta;
              }
            }
          }}
          className={`px-2 sm:px-2.5 py-1 border-b flex items-center justify-between gap-1 sm:gap-1.5 shrink-0 overflow-x-auto touch-scroll-x custom-scrollbar scrollbar-thin scrollbar-thumb-stone-300 dark:scrollbar-thumb-stone-700 min-w-0 relative z-10 ${
            isLight ? "bg-white border-stone-200/60" : "bg-[#141d16] border-stone-800/60"
          }`}
        >
 {/* Primary Tool Buttons */}
 <div className="flex items-center space-x-1 shrink-0">
 <button
 onClick={() => setToolMode('select')}
 className={`p-1.5 px-2 rounded text-xs font-semibold flex items-center space-x-1 transition-all shrink-0 ${
 toolMode === 'select'
 ? isLight
 ? 'bg-emerald-800 text-white font-bold '
 : 'bg-emerald-600 text-white font-bold '
 : isLight
 ? 'hover:bg-emerald-100 text-stone-700'
 : 'hover:bg-[#202d24] text-emerald-200'
 }`}
 title="選択・ノード編集 (V)"
 >
 <MousePointer className="w-3.5 h-3.5" />
 <span className="hidden lg:inline">選択</span>
 </button>

 <button
 onClick={() => setToolMode('pen')}
 className={`p-1.5 px-2 rounded text-xs font-semibold flex items-center space-x-1 transition-all shrink-0 ${
 toolMode === 'pen'
 ? isLight
 ? 'bg-emerald-800 text-white font-bold '
 : 'bg-emerald-600 text-white font-bold '
 : isLight
 ? 'hover:bg-emerald-100 text-stone-700'
 : 'hover:bg-[#202d24] text-emerald-200'
 }`}
 title="ベジェペンツール (P)"
 >
 <PenTool className="w-3.5 h-3.5" />
 <span className="hidden lg:inline">ペン</span>
 </button>

 <button
 onClick={() => setToolMode('brush')}
 className={`p-1.5 px-2 rounded text-xs font-semibold flex items-center space-x-1 transition-all shrink-0 ${
 toolMode === 'brush'
 ? isLight
 ? 'bg-emerald-800 text-white font-bold '
 : 'bg-emerald-600 text-white font-bold '
 : isLight
 ? 'hover:bg-emerald-100 text-stone-700'
 : 'hover:bg-[#202d24] text-emerald-200'
 }`}
 title="手書き筆・ストローク加筆 (B)"
 >
 <Paintbrush className="w-3.5 h-3.5" />
 <span className="hidden lg:inline">ブラシ</span>
 </button>

 {/* Compact Shape Tool with Dropdown */}
 <div className="relative shrink-0">
 <div
 className={`flex items-center rounded text-xs font-semibold border transition-all ${
 [
 'rect',
 'square',
 'ellipse',
 'circle',
 'rounded_rect',
 'pill',
 'triangle',
 'triangle_down',
 'right_triangle',
 'semicircle',
 'ring',
 'parallelogram',
 'star',
 'sparkle',
 'starburst',
 'heart',
 'diamond',
 'polygon',
 'crescent',
 ].includes(toolMode)
 ? isLight
 ? 'bg-emerald-800 text-white border-emerald-900 '
 : 'bg-emerald-600 text-white border-emerald-700 '
 : isLight
 ? 'bg-white border-stone-200 hover:bg-emerald-50 text-stone-700'
 : 'bg-[#18261e] border-[#283e2f] hover:bg-[#203428] text-emerald-200'
 }`}
 >
 <button
 onClick={() => setToolMode(activeShapeType)}
 className="p-1.5 pl-2 pr-1 flex items-center space-x-1"
 title="図形描画ツール"
 >
 {activeShapeType === 'rect' && <Square className="w-3.5 h-3.5" />}
 {activeShapeType === 'square' && <Square className="w-3.5 h-3.5" />}
 {activeShapeType === 'ellipse' && <Circle className="w-3.5 h-3.5" />}
 {activeShapeType === 'circle' && <Circle className="w-3.5 h-3.5" />}
 {activeShapeType === 'triangle' && <Triangle className="w-3.5 h-3.5" />}
 {activeShapeType === 'right_triangle' && <Triangle className="w-3.5 h-3.5" />}
 {activeShapeType === 'pill' && <CircleDot className="w-3.5 h-3.5" />}
 {activeShapeType === 'semicircle' && <Circle className="w-3.5 h-3.5" />}
 {activeShapeType === 'ring' && <Disc className="w-3.5 h-3.5" />}
 {activeShapeType === 'parallelogram' && <Slash className="w-3.5 h-3.5" />}
 {activeShapeType === 'diamond' && <Diamond className="w-3.5 h-3.5" />}
 {activeShapeType === 'polygon' && <Hexagon className="w-3.5 h-3.5" />}
 {activeShapeType === 'star' && <Star className="w-3.5 h-3.5" />}
 {activeShapeType === 'sparkle' && <Sparkles className="w-3.5 h-3.5" />}
 {activeShapeType === 'starburst' && <Sparkles className="w-3.5 h-3.5" />}
 {activeShapeType === 'heart' && <Heart className="w-3.5 h-3.5" />}
 {activeShapeType === 'crescent' && <Moon className="w-3.5 h-3.5" />}
 <span className="hidden xl:inline text-[11px]">
 {activeShapeType === 'rect' ? '四角' : activeShapeType === 'ellipse' ? '円' : activeShapeType === 'triangle' ? '三角' : activeShapeType === 'pill' ? 'カプセル' : activeShapeType === 'star' ? '星' : activeShapeType === 'heart' ? 'ハート' : activeShapeType === 'diamond' ? 'ダイヤ' : '図形'}
 </span>
 </button>
 <button
 onClick={(e) => {
 e.stopPropagation();
 setShowShapeMenu((prev) => !prev);
 }}
 className="p-1.5 pr-1.5 pl-0.5 opacity-70 hover:opacity-100 transition-opacity"
 title="図形の種類を選択"
 >
 <ChevronDown className="w-3 h-3" />
 </button>
 </div>

 {/* Dropdown Menu for Shapes */}
 {showShapeMenu && (
 <div
 className={`absolute top-full left-0 mt-1.5 p-1 rounded-lg border shadow-xl z-50 grid grid-cols-4 sm:grid-cols-6 gap-1 animate-in fade-in zoom-in-95 duration-100 ${
 isLight
 ? 'bg-white/95 border-stone-200 '
 : 'bg-[#152219]/95 border-[#283e2f] '
 }`}
 >
 {[
 { id: 'rect' as ShapeType, label: '四角形 (Rect)', icon: <Square className="w-3.5 h-3.5" /> },
 { id: 'square' as ShapeType, label: '正方形 (Square)', icon: <Square className="w-3.5 h-3.5" /> },
 { id: 'ellipse' as ShapeType, label: '楕円 (Ellipse)', icon: <Circle className="w-3.5 h-3.5" /> },
 { id: 'circle' as ShapeType, label: '正円 (Circle)', icon: <Circle className="w-3.5 h-3.5" /> },
 { id: 'pill' as ShapeType, label: 'カプセル (Pill)', icon: <CircleDot className="w-3.5 h-3.5" /> },
 { id: 'triangle' as ShapeType, label: '三角形 (Triangle)', icon: <Triangle className="w-3.5 h-3.5" /> },
 { id: 'right_triangle' as ShapeType, label: '直角三角形', icon: <Triangle className="w-3.5 h-3.5" /> },
 { id: 'semicircle' as ShapeType, label: '半円 (Semicircle)', icon: <Circle className="w-3.5 h-3.5" /> },
 { id: 'ring' as ShapeType, label: 'ドーナツ (Ring)', icon: <Disc className="w-3.5 h-3.5" /> },
 { id: 'parallelogram' as ShapeType, label: '平行四辺形', icon: <Slash className="w-3.5 h-3.5" /> },
 { id: 'diamond' as ShapeType, label: '菱形 (Diamond)', icon: <Diamond className="w-3.5 h-3.5" /> },
 { id: 'polygon' as ShapeType, label: '六角形 (Hexagon)', icon: <Hexagon className="w-3.5 h-3.5" /> },
 { id: 'star' as ShapeType, label: '星型 (Star)', icon: <Star className="w-3.5 h-3.5" /> },
 { id: 'sparkle' as ShapeType, label: '4芒星 (Sparkle)', icon: <Sparkles className="w-3.5 h-3.5" /> },
 { id: 'starburst' as ShapeType, label: '8芒星 (Starburst)', icon: <Sparkles className="w-3.5 h-3.5" /> },
 { id: 'heart' as ShapeType, label: 'ハート (Heart)', icon: <Heart className="w-3.5 h-3.5" /> },
 { id: 'crescent' as ShapeType, label: '三日月 (Crescent)', icon: <Moon className="w-3.5 h-3.5" /> },
 ].map((s) => (
 <button
 key={s.id}
 onClick={(e) => {
 e.stopPropagation();
 setActiveShapeType(s.id);
 setToolMode(s.id);
 setShowShapeMenu(false);
 }}
 className={`p-1.5 rounded flex items-center justify-center transition-all ${
 toolMode === s.id
 ? 'bg-emerald-800 text-white '
 : isLight
 ? 'hover:bg-emerald-100 text-stone-700'
 : 'hover:bg-[#203225] text-emerald-200'
 }`}
 title={s.label}
 >
 {s.icon}
 </button>
 ))}
 </div>
 )}
 </div>

 <button
 onClick={() => setToolMode('eraser')}
 className={`p-1.5 px-2 rounded text-xs font-semibold flex items-center space-x-1 transition-all shrink-0 ${
 toolMode === 'eraser'
 ? isLight
 ? 'bg-emerald-800 text-white font-bold '
 : 'bg-emerald-600 text-white font-bold '
 : isLight
 ? 'hover:bg-emerald-100 text-stone-700'
 : 'hover:bg-[#202d24] text-emerald-200'
 }`}
 title="消しゴム (E)"
 >
 <Eraser className="w-3.5 h-3.5" />
 <span className="hidden lg:inline">消去</span>
 </button>

 <button
 onClick={() => setToolMode('hand')}
 className={`p-1.5 px-2 rounded text-xs font-semibold flex items-center space-x-1 transition-all shrink-0 ${
 toolMode === 'hand'
 ? isLight
 ? 'bg-emerald-800 text-white font-bold '
 : 'bg-emerald-600 text-white font-bold '
 : isLight
 ? 'hover:bg-emerald-100 text-stone-700'
 : 'hover:bg-[#202d24] text-emerald-200'
 }`}
 title="手のひら・画面移動 (H)"
 >
 <Hand className="w-3.5 h-3.5" />
 <span className="hidden lg:inline">移動</span>
 </button>
 </div>

 {/* Auto-Union Toggle & Pathfinder Section */}
 <div className="flex items-center space-x-1 border-l pl-1.5 sm:pl-2 ml-0.5 sm:ml-1 border-stone-300 dark:border-stone-700 shrink-0">
 {/* Auto-Union Mode Toggle Switch */}
 <button
 onClick={() => {
 const next = !isAutoUnionMode;
 setIsAutoUnionMode(next);
 notify(
 next
 ? '合体モード ON: ブラシ描画・図形・パスが既存の部首パーツに自動合成されます'
 : '合体モード OFF: 各ストローク・図形が独立した輪郭として追加されます',
 'info'
 );
 }}
 className={`p-1.5 px-2 rounded text-xs font-semibold flex items-center space-x-1.5 transition-all shrink-0 border ${
 isAutoUnionMode
 ? isLight
 ? 'bg-emerald-700 text-white border-emerald-800 ring-1 ring-emerald-500/40 font-bold'
 : 'bg-emerald-600 text-white border-emerald-500 ring-1 ring-emerald-400/40 font-bold'
 : isLight
 ? 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
 : 'bg-[#18261e] border-[#283e2f] text-emerald-300 hover:bg-[#203428]'
 }`}
 title="【合体モード】ONのとき、手書きブラシや図形追加時に既存の部首パーツと自動的にブーリアン結合（合体）して一体化します"
 >
 <Layers className={`w-3.5 h-3.5 ${isAutoUnionMode ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}`} />
 <span className="text-[11px] font-bold">合体: {isAutoUnionMode ? 'ON' : 'OFF'}</span>
 </button>

 <button
 onClick={handleUnionPart}
 disabled={!activePart || activePart.contours.length === 0}
 className={`p-1.5 px-2 rounded text-xs font-semibold flex items-center space-x-1 transition-all shrink-0 ${
 isLight
 ? 'bg-emerald-50 text-emerald-950 border border-emerald-300 hover:bg-emerald-100 disabled:opacity-30'
 : 'bg-[#18261e] text-emerald-300 border border-emerald-800 hover:bg-[#203429] disabled:opacity-30'
 }`}
 title="【重なり合体】交差・重なり合うストロークを1つの輪郭に合体し、白抜けを解消します"
 >
 <Wand2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
 <span className="hidden xl:inline">手動合体</span>
 </button>

 <button
 onClick={handleNormalizeWinding}
 disabled={!activePart || activePart.contours.length === 0}
 className={`p-1.5 px-2 rounded text-xs font-semibold flex items-center space-x-1 transition-all shrink-0 ${
 isLight
 ? 'bg-white border border-stone-300 text-stone-700 hover:bg-stone-50 disabled:opacity-30'
 : 'bg-[#18241c] border border-[#25362b] text-emerald-200 hover:bg-[#202e24] disabled:opacity-30'
 }`}
 title="【向き統一】フォント規格に準拠して外側輪郭と穴あき輪郭のWinding方向を自動修正"
 >
 <RefreshCw className="w-3.5 h-3.5" />
 <span className="hidden xl:inline">向き統一</span>
 </button>

 <button
 onClick={handleSimplifyPart}
 disabled={!activePart || activePart.contours.length === 0}
 className={`p-1.5 px-2 rounded text-xs font-semibold flex items-center space-x-1 transition-all shrink-0 ${
 isLight
 ? 'bg-white border border-stone-300 text-stone-700 hover:bg-stone-50 disabled:opacity-30'
 : 'bg-[#18241c] border border-[#25362b] text-emerald-200 hover:bg-[#202e24] disabled:opacity-30'
 }`}
 title="【パス単純化】余分なアンカーポイントを削減して滑らかな曲線に最適化"
 >
 <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
 <span className="hidden xl:inline">単純化</span>
 </button>

 <button
 onClick={handleCenterPartInCanvas}
 disabled={!activePart || activePart.contours.length === 0}
 className={`p-1.5 rounded text-xs transition-colors shrink-0 ${
 isLight ? 'hover:bg-emerald-100 text-stone-700' : 'hover:bg-[#202d24] text-emerald-200'
 }`}
 title="パーツをキャンバス中央(500,500)に配置"
 >
 <Move className="w-3.5 h-3.5" />
 </button>

 <button
 onClick={handleFlipHPart}
 disabled={!activePart || (activePart.contours?.length ?? 0) === 0}
 className={`p-1.5 rounded text-xs transition-colors shrink-0 ${
 isLight ? 'hover:bg-emerald-100 text-stone-700' : 'hover:bg-[#202d24] text-emerald-200'
 }`}
 title="左右反転"
 >
 <FlipHorizontal className="w-3.5 h-3.5" />
 </button>

 <button
 onClick={handleFlipVPart}
 disabled={!activePart || (activePart.contours?.length ?? 0) === 0}
 className={`p-1.5 rounded text-xs transition-colors shrink-0 ${
 isLight ? 'hover:bg-emerald-100 text-stone-700' : 'hover:bg-[#202d24] text-emerald-200'
 }`}
 title="上下反転"
 >
 <FlipVertical className="w-3.5 h-3.5" />
 </button>
 </div>

 {/* Undo / Redo, Zoom & Guide Toggles */}
 <div className="flex items-center space-x-0.5 sm:space-x-1 shrink-0 ml-auto">
 {/* Zoom Controls */}
 <div className="flex items-center space-x-0.5 border-r pr-1 mr-0.5 border-stone-300 dark:border-stone-700 shrink-0">
 <button
 onClick={() => setZoom((z) => Math.max(0.2, Number((z * 0.8).toFixed(2))))}
 className={`p-1.5 rounded text-xs transition-colors ${
 isLight ? 'hover:bg-emerald-100 text-stone-700' : 'hover:bg-[#202d24] text-emerald-200'
 }`}
 title="縮小"
 >
 <ZoomOut className="w-3.5 h-3.5" />
 </button>
 <span className="text-[10.5px] font-mono font-bold px-1 min-w-[36px] text-center text-stone-600 dark:text-stone-300">
 {Math.round(zoom * 100)}%
 </span>
 <button
 onClick={() => setZoom((z) => Math.min(5, Number((z * 1.25).toFixed(2))))}
 className={`p-1.5 rounded text-xs transition-colors ${
 isLight ? 'hover:bg-emerald-100 text-stone-700' : 'hover:bg-[#202d24] text-emerald-200'
 }`}
 title="拡大"
 >
 <ZoomIn className="w-3.5 h-3.5" />
 </button>
 <button
 onClick={resetView}
 className={`p-1.5 rounded text-xs transition-colors ${
 isLight ? 'hover:bg-emerald-100 text-stone-600' : 'hover:bg-[#202d24] text-stone-300'
 }`}
 title="全体表示 (フィット)"
 >
 <Maximize2 className="w-3.5 h-3.5" />
 </button>
 </div>

 {/* Undo / Redo */}
 <button
 onClick={handleUndo}
 disabled={undoStack.length === 0}
 className={`p-1.5 rounded text-xs transition-colors shrink-0 ${
 undoStack.length > 0
 ? isLight
 ? 'hover:bg-emerald-100 text-stone-700'
 : 'hover:bg-[#202d24] text-emerald-200'
 : 'opacity-30 cursor-not-allowed'
 }`}
 title="元に戻す (Undo)"
 >
 <Undo2 className="w-3.5 h-3.5" />
 </button>
 <button
 onClick={handleRedo}
 disabled={redoStack.length === 0}
 className={`p-1.5 rounded text-xs transition-colors shrink-0 ${
 redoStack.length > 0
 ? isLight
 ? 'hover:bg-emerald-100 text-stone-700'
 : 'hover:bg-[#202d24] text-emerald-200'
 : 'opacity-30 cursor-not-allowed'
 }`}
 title="やり直し (Redo)"
 >
 <Redo2 className="w-3.5 h-3.5" />
 </button>

 <div className="w-[1px] h-4 bg-stone-300 dark:bg-stone-700 mx-0.5 shrink-0" />

 {/* Guides Toggles */}
 <button
 onClick={() => setShowKanjiGuides(!showKanjiGuides)}
 className={`p-1 px-1.5 sm:px-2 rounded text-[11px] font-bold border transition-colors shrink-0 ${
 showKanjiGuides
 ? isLight
 ? 'bg-emerald-100 border-emerald-400 text-emerald-900'
 : 'bg-emerald-950 border-emerald-600 text-emerald-300'
 : isLight
 ? 'bg-white border-[#d8e6df] text-stone-500 hover:bg-stone-50'
 : 'bg-[#1a261f] border-[#25362b] text-stone-400 hover:bg-[#223328]'
 }`}
 title="偏旁分割・配置ガイド線の表示切替"
 >
 偏旁
 </button>

 <button
 onClick={() => setIsWireframeMode(!isWireframeMode)}
 className={`p-1 px-1.5 sm:px-2 rounded text-[11px] font-bold border transition-colors shrink-0 ${
 isWireframeMode
 ? isLight
 ? 'bg-emerald-100 border-emerald-400 text-emerald-900'
 : 'bg-emerald-950 border-emerald-600 text-emerald-300'
 : isLight
 ? 'bg-white border-[#d8e6df] text-stone-500 hover:bg-stone-50'
 : 'bg-[#1a261f] border-[#25362b] text-stone-400 hover:bg-[#223328]'
 }`}
 title="パス輪郭のみ表示（ワイヤーフレーム表示 / 塗りつぶし切替）"
 >
 輪郭のみ
 </button>

 <button
 onClick={() => setShowNineBoxes(!showNineBoxes)}
 className={`p-1 px-1.5 sm:px-2 rounded text-[11px] font-bold border transition-colors shrink-0 ${
 showNineBoxes
 ? isLight
 ? 'bg-emerald-100 border-emerald-400 text-emerald-900'
 : 'bg-emerald-950 border-emerald-600 text-emerald-300'
 : isLight
 ? 'bg-white border-[#d8e6df] text-stone-500 hover:bg-stone-50'
 : 'bg-[#1a261f] border-[#25362b] text-stone-400 hover:bg-[#223328]'
 }`}
 title="九宮格（3x3グリッド）ガイドの表示切替"
 >
 九宮
 </button>

 {/* Magnetic Snapping Toggle */}
 <button
 onClick={() => setIsSnapEnabled(!isSnapEnabled)}
 className={`p-1 px-1.5 sm:px-2 rounded text-[11px] font-bold border transition-colors shrink-0 flex items-center space-x-1 ${
 isSnapEnabled
 ? isLight
 ? 'bg-cyan-100 border-cyan-400 text-cyan-950'
 : 'bg-cyan-950 border-cyan-600 text-cyan-200'
 : isLight
 ? 'bg-white border-[#d8e6df] text-stone-500 hover:bg-stone-50'
 : 'bg-[#1a261f] border-[#25362b] text-stone-400 hover:bg-[#223328]'
 }`}
 title="ガイド線・グリッド交点への磁気自動スナップ吸着 (ON/OFF)"
 >
 <CircleDot className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
 <span>吸着</span>
 </button>

 {/* Target Character Watermark Guide & Related Kanji Picker */}
          <div className="relative flex items-center space-x-1 shrink-0">
            <button
              onClick={() => setShowWatermark(!showWatermark)}
              className={`p-1 px-2 rounded text-[11px] font-bold border transition-colors shrink-0 flex items-center space-x-1 ${
                showWatermark
                  ? isLight
                    ? 'bg-emerald-100 border-emerald-400 text-emerald-950 shadow-2xs'
                    : 'bg-emerald-950/80 border-emerald-600 text-emerald-200 shadow-2xs'
                  : isLight
                  ? 'bg-white border-[#d8e6df] text-stone-500 hover:bg-stone-50'
                  : 'bg-[#1a261f] border-[#25362b] text-stone-400 hover:bg-[#223328]'
              }`}
              title={showWatermark ? '下絵ガイドを非表示にする' : '下絵ガイド（背景透かし文字）を表示する'}
            >
              <BookOpen className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span>下絵: {showWatermark ? `「${watermarkChar || selectedChar}」` : 'OFF'}</span>
              {showWatermark && (
                <span className="font-mono text-[10px] opacity-75 tabular-nums">
                  {Math.round(watermarkOpacity * 100)}%
                </span>
              )}
            </button>
            {showWatermark && (
              <>
                <input
                  type="text"
                  maxLength={1}
                  value={watermarkChar || ''}
                  onChange={(e) => setWatermarkChar(e.target.value.slice(-1) || selectedChar)}
                  className={`w-6 h-6 text-center text-xs font-bold rounded border outline-hidden transition-colors ${
                    isLight
                      ? 'bg-white border-emerald-300 text-emerald-950 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500'
                      : 'bg-[#121c15] border-emerald-700 text-emerald-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-400'
                  }`}
                  title="透かし表示する参照文字を直接入力（例: 休）"
                />
                <button
                  onClick={() => setShowWatermarkPicker(!showWatermarkPicker)}
                  className={`px-1.5 py-0.5 rounded text-[11px] font-semibold border transition-colors flex items-center space-x-0.5 ${
                    showWatermarkPicker
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : isLight
                      ? 'bg-white border-stone-300 text-stone-700 hover:bg-emerald-50'
                      : 'bg-[#18261e] border-emerald-800 text-emerald-200 hover:bg-[#22382b]'
                  }`}
                  title="この部首が含まれる漢字を選んで下絵に設定・濃さスケール調整"
                >
                  <span>調整</span>
                  <ChevronDown className="w-3 h-3" />
                </button>

                {/* Floating Watermark Related Kanji Picker Panel */}
                {showWatermarkPicker && (
                  <div
                    className={`absolute top-full right-0 mt-1.5 z-40 p-3 rounded-xl border shadow-2xl w-72 sm:w-80 space-y-2.5 animate-in fade-in zoom-in-95 ${
                      isLight
                        ? 'bg-white/95 border-emerald-300 text-stone-800 '
                        : 'bg-[#121d15]/95 border-emerald-700 text-emerald-100 '
                    }`}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between border-b pb-1.5 border-stone-200 dark:border-stone-800">
                      <span className="text-xs font-bold flex items-center space-x-1 text-emerald-800 dark:text-emerald-300">
                        <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                        <span>参照下絵（透かし漢字）の調整</span>
                      </span>
                      <button
                        onClick={() => setShowWatermarkPicker(false)}
                        className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-0.5 rounded"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div>
                      <label className="text-[10.5px] font-bold block mb-1 text-stone-600 dark:text-stone-300">
                        「{activePart?.name || '部首'}」を含む漢字から選択:
                      </label>
                      <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto p-1.5 rounded-lg border bg-stone-50 dark:bg-[#0c140e] border-stone-200 dark:border-stone-800">
                        {relatedKanjiList.map((kanji, idx) => (
                          <button
                            key={`wm_kanji_${kanji}_${idx}`}
                            onClick={() => {
                              setWatermarkChar(kanji);
                              setShowWatermark(true);
                              notify(`下絵ガイドを「${kanji}」に設定しました`, 'info');
                            }}
                            className={`w-7 h-7 rounded-md font-bold text-xs flex items-center justify-center transition-all ${
                              watermarkChar === kanji
                                ? 'bg-emerald-700 text-white scale-105 ring-2 ring-emerald-400 font-extrabold'
                                : isLight
                                ? 'bg-white border border-stone-200 text-stone-800 hover:border-emerald-400'
                                : 'bg-[#1a2820] border border-stone-800 text-stone-200 hover:border-emerald-600'
                            }`}
                            title={`「${kanji}」を下絵文字に設定`}
                          >
                            {kanji}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-stone-200 dark:border-stone-800 text-[11px]">
                      <div>
                        <label className="block text-[10px] font-bold text-stone-500 dark:text-stone-400 mb-0.5">
                          下絵不透明度: <span className="font-mono tabular-nums">{Math.round(watermarkOpacity * 100)}%</span>
                        </label>
                        <input
                          type="range"
                          min={0.05}
                          max={0.6}
                          step={0.05}
                          value={watermarkOpacity}
                          onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
                          className="w-full accent-emerald-600 h-1.5 cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-stone-500 dark:text-stone-400 mb-0.5">
                          倍率: <span className="font-mono tabular-nums">{Math.round(watermarkScale * 100)}%</span>
                        </label>
                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => setWatermarkScale((s) => Math.max(0.5, Number((s - 0.1).toFixed(1))))}
                            className="px-1.5 py-0.5 rounded border text-[10px] font-bold bg-stone-100 dark:bg-[#1a2820] hover:bg-emerald-100 dark:hover:bg-[#253a2c]"
                            title="倍率縮小 (-10%)"
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </button>
                          <span className="font-mono tabular-nums text-[11px] px-1 text-center font-bold min-w-[34px]">
                            {Math.round(watermarkScale * 100)}%
                          </span>
                          <button
                            type="button"
                            onClick={() => setWatermarkScale((s) => Math.min(1.8, Number((s + 0.1).toFixed(1))))}
                            className="px-1.5 py-0.5 rounded border text-[10px] font-bold bg-stone-100 dark:bg-[#1a2820] hover:bg-emerald-100 dark:hover:bg-[#253a2c]"
                            title="倍率拡大 (+10%)"
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Clear All */}
 <button
 onClick={handleClearCanvas}
 disabled={!activePart || (activePart.contours?.length ?? 0) === 0}
 className={`p-1.5 rounded text-xs transition-colors shrink-0 ${
 activePart && (activePart.contours?.length ?? 0) > 0
 ? 'text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50'
 : 'opacity-30 cursor-not-allowed text-stone-400'
 }`}
 title="輪郭を全消去"
 >
 <Trash2 className="w-3.5 h-3.5" />
 </button>
 </div>
 </div>
  );
};
