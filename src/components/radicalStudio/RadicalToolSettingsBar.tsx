import React from 'react';
import {
  Paintbrush,
  Layers,
  Minus,
  Plus,
  Shapes,
  PenTool,
  Eraser,
  MousePointer,
} from 'lucide-react';
import { CustomPart, ToolMode, BrushStyle, PathContour } from '../../types';

const isPressureSensitivity = (value: string): value is 'high' | 'normal' | 'low' | 'off' =>
  ['high', 'normal', 'low', 'off'].includes(value);

export interface RadicalToolSettingsBarProps {
  toolMode: ToolMode;
  isLight: boolean;
  brushStyle: BrushStyle;
  setBrushStyle: (style: BrushStyle) => void;
  isAutoUnionMode: boolean;
  setIsAutoUnionMode: (mode: boolean) => void;
  brushWidth: number;
  setBrushWidth: React.Dispatch<React.SetStateAction<number>>;
  pressureSensitivity: 'high' | 'normal' | 'low' | 'off';
  setPressureSensitivity: (val: 'high' | 'normal' | 'low' | 'off') => void;
  isStraightMode: boolean;
  setIsStraightMode: (mode: boolean) => void;
  showPenShortcutsHelp: boolean;
  setShowPenShortcutsHelp: (show: boolean) => void;
  eraserMode: 'stroke' | 'cut' | 'node';
  setEraserMode: (mode: 'stroke' | 'cut' | 'node') => void;
  eraserRadius: number;
  setEraserRadius: (radius: number) => void;
  selectedNodeId: string | null;
  selectedContourId: string | null;
  handleToggleSelectedNodeType: () => void;
  handleDeleteSelectedNode: () => void;
  handleDuplicateSelectedContour: () => void;
  handleDeleteSelectedContour: () => void;
  activePart: CustomPart | null;
  handleUnionPart: () => void;
  activePenContour: PathContour | null;
  isPenNearFirstNode: boolean;
}

export const RadicalToolSettingsBar: React.FC<RadicalToolSettingsBarProps> = ({
  toolMode,
  isLight,
  brushStyle,
  setBrushStyle,
  isAutoUnionMode,
  setIsAutoUnionMode,
  brushWidth,
  setBrushWidth,
  pressureSensitivity,
  setPressureSensitivity,
  isStraightMode,
  setIsStraightMode,
  showPenShortcutsHelp,
  setShowPenShortcutsHelp,
  eraserMode,
  setEraserMode,
  eraserRadius,
  setEraserRadius,
  selectedNodeId,
  selectedContourId,
  handleToggleSelectedNodeType,
  handleDeleteSelectedNode,
  handleDuplicateSelectedContour,
  handleDeleteSelectedContour,
  activePart,
  handleUnionPart,
  activePenContour,
  isPenNearFirstNode,
}) => {
  return (
     <div
 className={`px-3 py-1.5 border-b flex items-center justify-between gap-2 shrink-0 overflow-x-auto scrollbar-thin scrollbar-thumb-stone-300 dark:scrollbar-thumb-stone-700 min-w-0 text-xs ${
 isLight ? 'bg-white border-[#d8e6df]' : 'bg-[#121c15] border-[#223627]'
 }`}
 >
 {toolMode === 'brush' ? (
 /* ================= BRUSH TOOL OPTIONS ================= */
 <div className="flex items-center space-x-2.5 sm:space-x-4 shrink-0 w-full justify-between">
 <div className="flex items-center space-x-2 shrink-0">
 <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400 shrink-0 flex items-center space-x-1">
 <Paintbrush className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
 <span>筆スタイル:</span>
 </span>

 {/* Brush Style Selector Pills */}
 <div className="flex items-center space-x-1 bg-stone-100 dark:bg-[#1a281f] p-0.5 rounded-lg border border-stone-200 dark:border-[#25382b] overflow-x-auto">
 {(
 [
 { id: 'brush' as BrushStyle, label: '毛筆 (Calligraphy)' },
 { id: 'mincho' as BrushStyle, label: '明朝体 (Mincho)' },
 { id: 'gothic' as BrushStyle, label: 'ゴシック (Gothic)' },
 { id: 'marker' as BrushStyle, label: 'マーカー (Chisel)' },
 { id: 'sumi' as BrushStyle, label: '墨筆 (Sumi)' },
 { id: 'signpen' as BrushStyle, label: 'サインペン (Signpen)' },
 { id: 'marumoji' as BrushStyle, label: '丸文字 (Marumoji)' },
 { id: 'fountain' as BrushStyle, label: '万年筆 (Fountain)' },
 { id: 'plain' as BrushStyle, label: '標準 (Round)' },
 ] as const
 ).map((b) => (
 <button
 key={b.id}
 onClick={() => setBrushStyle(b.id)}
 className={`px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap transition-all ${
 brushStyle === b.id
 ? 'bg-emerald-800 text-white font-bold '
 : 'text-stone-600 dark:text-stone-300 hover:text-emerald-800 dark:hover:text-white'
 }`}
 >
 {b.label.split(' ')[0]}
 </button>
 ))}
 </div>

 {/* Quick Auto-Union Switch for Brush */}
 <button
 onClick={() => setIsAutoUnionMode(!isAutoUnionMode)}
 className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-all flex items-center space-x-1 shrink-0 ${
 isAutoUnionMode
 ? 'bg-emerald-100 text-emerald-900 border-emerald-400 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-600'
 : 'bg-stone-100 text-stone-500 border-stone-200 dark:bg-[#1a261e] dark:text-stone-400 dark:border-[#25382b]'
 }`}
 title="描画したストロークを既存の部首パーツに自動合成・合体します"
 >
 <Layers className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
 <span>合体加筆: {isAutoUnionMode ? 'ON' : 'OFF'}</span>
 </button>
 </div>

 {/* Brush Width Stepper & Slider */}
              <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0 px-2 py-0.5 rounded-lg bg-stone-100/80 dark:bg-[#16241b] border border-stone-200 dark:border-[#223627]">
                <span className="text-[11px] font-bold text-stone-600 dark:text-stone-300 shrink-0">
                  太さ:
                </span>
                <button
                  type="button"
                  onClick={() => setBrushWidth((w) => Math.max(2, w - (w > 20 ? 4 : 2)))}
                  disabled={brushWidth <= 2}
                  className="w-5 h-5 rounded flex items-center justify-center font-bold bg-white dark:bg-[#1e2e23] border border-stone-200 dark:border-[#2b4030] text-stone-700 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-[#283e2f] disabled:opacity-30 transition-colors shadow-2xs"
                  title="線を細く (-2px / -4px)"
                >
                  <Minus className="w-2.5 h-2.5" />
                </button>
                <input
                  type="range"
                  min={2}
                  max={120}
                  step={2}
                  value={brushWidth}
                  onChange={(e) => setBrushWidth(Number(e.target.value))}
                  className="w-14 sm:w-20 accent-emerald-600 h-1.5 cursor-pointer"
                  title={`太さ: ${brushWidth}px`}
                />
                <button
                  type="button"
                  onClick={() => setBrushWidth((w) => Math.min(120, w + (w >= 20 ? 4 : 2)))}
                  disabled={brushWidth >= 120}
                  className="w-5 h-5 rounded flex items-center justify-center font-bold bg-white dark:bg-[#1e2e23] border border-stone-200 dark:border-[#2b4030] text-stone-700 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-[#283e2f] disabled:opacity-30 transition-colors shadow-2xs"
                  title="線を太く (+2px / +4px)"
                >
                  <Plus className="w-2.5 h-2.5" />
                </button>
                <span className="font-mono tabular-nums font-bold text-[11px] text-emerald-700 dark:text-emerald-300 min-w-[34px] text-center">
                  {brushWidth}px
                </span>

                {/* Quick Preset Selector Dropdown */}
                <select
                  value=""
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) setBrushWidth(val);
                  }}
                  className="text-[10px] font-mono font-bold px-1 py-0.5 rounded border border-stone-200 dark:border-[#283e2f] bg-white dark:bg-[#1c2c21] text-stone-700 dark:text-emerald-200 cursor-pointer outline-hidden hover:border-emerald-500"
                  title="定型太さプリセット"
                >
                  <option value="" disabled hidden>プリセット</option>
                  <option value="8">8px (極細)</option>
                  <option value="16">16px (細)</option>
                  <option value="24">24px (中細)</option>
                  <option value="36">36px (標準)</option>
                  <option value="48">48px (太)</option>
                  <option value="64">64px (特太)</option>
                  <option value="80">80px (極太)</option>
                </select>
              </div>

              {/* Pressure Sensitivity & Straight Mode */}
 <div className="flex items-center space-x-1.5 shrink-0">
 <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400 shrink-0 hidden xl:inline">
 筆圧:
 </span>
 <select
 value={pressureSensitivity}
 onChange={(e) => {
   if (isPressureSensitivity(e.target.value)) {
     setPressureSensitivity(e.target.value);
   }
 }}
 className={`text-[11px] font-semibold px-2 py-0.5 rounded border outline-hidden ${
 isLight
 ? 'bg-white border-stone-300 text-stone-700'
 : 'bg-[#18261e] border-[#2a3e30] text-emerald-200'
 }`}
 title="ペンタブレットの筆圧または描画速度に応じた線の強弱シミュレーション"
 >
 <option value="high">感度: 高 (強弱強)</option>
 <option value="normal">感度: 標準 (自然)</option>
 <option value="low">感度: 低 (穏やか)</option>
 <option value="off">固定幅 (均一)</option>
 </select>

 {/* Straight Mode Toggle */}
 <button
 onClick={() => setIsStraightMode(!isStraightMode)}
 className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-all ${
 isStraightMode
 ? 'bg-emerald-100 dark:bg-emerald-950 border-emerald-400 text-emerald-900 dark:text-emerald-200'
 : 'bg-white dark:bg-[#18261e] border-stone-200 dark:border-[#25382b] text-stone-500 dark:text-stone-400'
 }`}
 title="直線ストロークモード (Shiftキー併用可能)"
 >
 直線: {isStraightMode ? 'ON' : 'OFF'}
 </button>
 </div>
 </div>
 ) : [
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
 ].includes(toolMode) ? (
 /* ================= SHAPE TOOL OPTIONS ================= */
 <div className="flex items-center space-x-2.5 sm:space-x-4 shrink-0 w-full justify-between">
 <div className="flex items-center space-x-2 shrink-0">
 <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400 shrink-0 flex items-center space-x-1">
 <Shapes className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
 <span>図形描画:</span>
 </span>

 {/* Auto-Union Switch for Shape */}
 <button
 onClick={() => setIsAutoUnionMode(!isAutoUnionMode)}
 className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-all flex items-center space-x-1 shrink-0 ${
 isAutoUnionMode
 ? 'bg-emerald-100 text-emerald-900 border-emerald-400 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-600'
 : 'bg-stone-100 text-stone-500 border-stone-200 dark:bg-[#1a261e] dark:text-stone-400 dark:border-[#25382b]'
 }`}
 title="描画した図形を既存の部首パーツに自動合成・合体します"
 >
 <Layers className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
 <span>合体加筆: {isAutoUnionMode ? 'ON' : 'OFF'}</span>
 </button>

 <button
 onClick={handleUnionPart}
 disabled={!activePart || (activePart.contours?.length ?? 0) === 0}
 className="px-2 py-0.5 rounded text-[11px] font-semibold bg-stone-100 hover:bg-emerald-100 dark:bg-[#18261e] dark:hover:bg-[#203428] text-stone-700 dark:text-emerald-200 border border-stone-200 dark:border-[#25382b] transition-all"
 title="現在の部首パーツと合体する"
 >
 既存パーツと合体
 </button>
 </div>

 <div className="flex items-center space-x-2 text-[11px] text-stone-500 dark:text-stone-400">
 <span>ドラッグして図形を配置 (Shiftキーで正形)</span>
 </div>
 </div>
 ) : toolMode === 'pen' ? (
 /* ================= PEN TOOL OPTIONS & TIPS ================= */
 <div className="flex items-center space-x-2 sm:space-x-3 shrink-0 w-full justify-between">
 <div className="flex items-center space-x-2 shrink-0">
 <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center space-x-1">
 <PenTool className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
 <span>ベジェペン操作:</span>
 </span>
 <span className="text-[11px] text-stone-600 dark:text-stone-300">
 クリックで角頂点、ドラッグで滑らかな曲率ハンドル
 </span>
 {/* Auto-Union Switch for Pen */}
 <button
 onClick={() => setIsAutoUnionMode(!isAutoUnionMode)}
 className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-all flex items-center space-x-1 shrink-0 ml-2 ${
 isAutoUnionMode
 ? 'bg-emerald-100 text-emerald-900 border-emerald-400 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-600'
 : 'bg-stone-100 text-stone-500 border-stone-200 dark:bg-[#1a261e] dark:text-stone-400 dark:border-[#25382b]'
 }`}
 title="パス確定時に既存の部首パーツに自動合成・合体します"
 >
 <Layers className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
 <span>合体: {isAutoUnionMode ? 'ON' : 'OFF'}</span>
 </button>
 </div>

 <div className="flex items-center space-x-2 shrink-0">
 {activePenContour ? (
 <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
 {isPenNearFirstNode ? '◎ 始点クリックでパスを閉じます' : `作図中 (${activePenContour.nodes.length}点)`}
 </span>
 ) : (
 <span className="text-[11px] text-stone-400">
 キャンバスをクリックしてパスを開始
 </span>
 )}
 <button
 onClick={() => setShowPenShortcutsHelp(!showPenShortcutsHelp)}
 className="text-[11px] text-emerald-700 dark:text-emerald-400 underline font-medium"
 >
 ショートカット一覧
 </button>
 </div>
 </div>
 ) : toolMode === 'eraser' ? (
 /* ================= ERASER TOOL OPTIONS ================= */
 <div className="flex items-center space-x-2.5 sm:space-x-4 shrink-0 w-full justify-between">
 <div className="flex items-center space-x-2 shrink-0">
 <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 shrink-0 flex items-center space-x-1">
 <Eraser className="w-3.5 h-3.5 text-rose-500" />
 <span>消しゴム:</span>
 </span>

 <div className="flex items-center space-x-1 bg-stone-100 dark:bg-[#1a281f] p-0.5 rounded-lg border border-stone-200 dark:border-[#25382b]">
 <button
 onClick={() => setEraserMode('stroke')}
 className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
 eraserMode === 'stroke'
 ? 'bg-rose-600 text-white shadow-xs'
 : 'text-stone-600 dark:text-stone-300 hover:text-stone-900'
 }`}
 title="交差した輪郭を一括削除"
 >
 輪郭一括
 </button>
 <button
 onClick={() => setEraserMode('cut')}
 className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
 eraserMode === 'cut'
 ? 'bg-rose-600 text-white shadow-xs'
 : 'text-stone-600 dark:text-stone-300 hover:text-stone-900'
 }`}
 title="ドラッグした軌跡でベジェ曲線を切断・削り取り"
 >
 部分割 (Cut)
 </button>
 <button
 onClick={() => setEraserMode('node')}
 className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
 eraserMode === 'node'
 ? 'bg-rose-600 text-white shadow-xs'
 : 'text-stone-600 dark:text-stone-300 hover:text-stone-900'
 }`}
 title="範囲内のアンカーノードのみ削除"
 >
 ノード消去
 </button>
 </div>

 {/* Size Selector */}
 <div className="flex items-center space-x-1.5 ml-2">
 <span className="text-[10px] text-stone-400">半径:</span>
 {[12, 24, 36, 50].map((sz) => (
 <button
 key={sz}
 onClick={() => setEraserRadius(sz)}
 className={`w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center transition-all ${
 eraserRadius === sz
 ? 'bg-rose-500 text-white scale-110 shadow-xs'
 : 'bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-300'
 }`}
 >
 {sz}
 </button>
 ))}
 </div>
 </div>

 <div className="text-[11px] text-stone-400 hidden sm:block">
 {eraserMode === 'cut'
 ? 'なぞった軌跡で輪郭を削り取ります（円形プレビュー表示）'
 : 'ドラッグまたはタップで消去します'}
 </div>
 </div>
 ) : (
 /* ================= SELECT / NODE TOOL OPTIONS ================= */
 <div className="flex items-center space-x-2 sm:space-x-4 shrink-0 w-full justify-between">
 <div className="flex items-center space-x-2 shrink-0">
 <span className="text-[11px] font-bold text-stone-600 dark:text-stone-400 flex items-center space-x-1">
 <MousePointer className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
 <span>選択中:</span>
 </span>

 {selectedNodeId ? (
 <div className="flex items-center space-x-1.5">
 <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950 px-2 py-0.5 rounded">
 ノード選択中
 </span>
 <button
 onClick={handleToggleSelectedNodeType}
 className="px-2 py-0.5 rounded text-[11px] font-semibold bg-stone-100 hover:bg-emerald-100 dark:bg-[#18261e] dark:hover:bg-[#203428] text-stone-700 dark:text-emerald-200 border border-stone-200 dark:border-[#25382b] transition-all"
 title="角頂点(Corner)と滑らかな曲線頂点(Smooth)を切り替え"
 >
 曲率切替 (Smooth/Corner)
 </button>
 <button
 onClick={handleDeleteSelectedNode}
 className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/70 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 transition-all"
 title="選択中のノードを削除 (Delete)"
 >
 ノード削除
 </button>
 </div>
 ) : selectedContourId ? (
 <div className="flex items-center space-x-1.5">
 <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950 px-2 py-0.5 rounded">
 輪郭全体を選択中
 </span>
 <button
 onClick={handleDuplicateSelectedContour}
 className="px-2 py-0.5 rounded text-[11px] font-semibold bg-stone-100 hover:bg-emerald-100 dark:bg-[#18261e] dark:hover:bg-[#203428] text-stone-700 dark:text-emerald-200 border border-stone-200 dark:border-[#25382b] transition-all"
 title="選択した輪郭を複製"
 >
 輪郭を複製
 </button>
 <button
 onClick={handleUnionPart}
 className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/70 dark:hover:bg-emerald-900 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 transition-all"
 title="全輪郭と結合して1つの輪郭に合体"
 >
 部首と合体
 </button>
 <button
 onClick={handleDeleteSelectedContour}
 className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/70 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 transition-all"
 title="選択した輪郭を削除 (Delete)"
 >
 輪郭を削除
 </button>
 </div>
 ) : (
 <span className="text-[11px] text-stone-400">
 頂点や輪郭をクリックして選択・ドラッグ移動
 </span>
 )}
 </div>

 <div className="flex items-center space-x-2 text-[11px] text-stone-400">
 <span>キー: [V]選択 [P]ペン [B]ブラシ [E]消しゴム [Space]移動 [Ctrl+Z]元に戻す</span>
 </div>
 </div>
 )}
 </div>
  );
};
