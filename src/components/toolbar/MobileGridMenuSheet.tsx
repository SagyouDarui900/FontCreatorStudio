import React from 'react';
import { X, Grid, Magnet, Eye, Move, Bookmark, Save, Download, Ruler, Crosshair, Layers } from 'lucide-react';
import { GridSettings, JapaneseGuidePattern } from '../../types';
import { VERTICAL_GUIDES, JAPANESE_GUIDES } from '../ToolBar';

export interface MobileGridMenuSheetProps {
  isOpen: boolean;
  onClose: () => void;
  sheetRef: React.RefObject<HTMLDivElement | null>;
  themeClasses: any;
  isLight: boolean;
  gridSettings: GridSettings;
  setGridSettings: React.Dispatch<React.SetStateAction<GridSettings>>;
  onOpenTraceModal?: () => void;
  onOpenPixelStudio?: () => void;
  onQuickSaveGlyph?: () => void;
  onOpenExportModal?: () => void;
}

export const MobileGridMenuSheet: React.FC<MobileGridMenuSheetProps> = React.memo(({
  isOpen,
  onClose,
  sheetRef,
  themeClasses,
  isLight,
  gridSettings,
  setGridSettings,
  onOpenTraceModal,
  onOpenPixelStudio,
  onQuickSaveGlyph,
  onOpenExportModal,
}) => {
  if (!isOpen) return null;

  return (
 <div className="sm:hidden fixed inset-0 z-50 flex flex-col justify-end" ref={sheetRef}>
 <div
 className="fixed inset-0 bg-black/60 animate-fadeIn"
 onClick={() => onClose()}
 />
 <div
 className={`relative z-10 w-full rounded-t-3xl p-4 border-t shadow-2xl max-h-[85vh] flex flex-col animate-slideUp pb-[max(env(safe-area-inset-bottom),16px)] overflow-hidden ${themeClasses.cardBg}`}
 >
 {/* Header */}
 <div className="flex items-center justify-between pb-2.5 border-b border-stone-200 dark:border-stone-800 mb-2.5 shrink-0">
 <div className="flex items-center space-x-2">
 <Grid className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
 <span className="font-extrabold text-sm text-emerald-800 dark:text-emerald-300">方眼グリッド・ガイド設定</span>
 </div>
 <button
 onClick={() => onClose()}
 className="p-1.5 rounded-full text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 bg-stone-100 dark:bg-[#202d24]"
 title="閉じる"
 >
 <X className="w-5 h-5" />
 </button>
 </div>

 {/* Scrollable Body Container - Ensures all buttons and sliders are easily reachable */}
 <div className="overflow-y-auto pr-1 flex-1 min-h-0 space-y-3 pb-8 touch-pan-y">

 {/* Grid ON/OFF and Snap Toggles */}
 <div className="grid grid-cols-2 gap-2 mb-3 shrink-0">
 <button
 type="button"
 onClick={() => setGridSettings((s) => ({ ...s, showGrid: !s.showGrid }))}
 className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between transition-colors ${
 gridSettings.showGrid
 ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
 : isLight
 ? 'bg-stone-50 border-stone-200 text-stone-600'
 : 'bg-stone-900 border-stone-800 text-stone-400'
 }`}
 >
 <span>方眼グリッド</span>
 <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-black/10 dark:bg-white/10">
 {gridSettings.showGrid ? 'ON' : 'OFF'}
 </span>
 </button>
 <button
 type="button"
 onClick={() => setGridSettings((s) => ({ ...s, snapToGrid: !s.snapToGrid }))}
 className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between transition-colors ${
 gridSettings.snapToGrid
 ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
 : isLight
 ? 'bg-stone-50 border-stone-200 text-stone-600'
 : 'bg-stone-900 border-stone-800 text-stone-400'
 }`}
 >
 <span>吸着 (Snap)</span>
 <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-black/10 dark:bg-white/10">
 {gridSettings.snapToGrid ? 'ON' : 'OFF'}
 </span>
 </button>
 </div>

 {/* Grid Size Adjustment */}
 <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 space-y-3 mb-3 shrink-0">
 <div className="flex items-center justify-between">
 <span className="font-bold text-xs text-stone-700 dark:text-stone-300">
 グリッドサイズ
 </span>
 <div className="flex items-center gap-1.5">
 <button
 type="button"
 onClick={() =>
 setGridSettings((prev) => {
 const current = prev.gridSize || 50;
 const step = current > 100 ? 10 : current <= 20 ? 2 : 5;
 return { ...prev, gridSize: Math.max(5, current - step) };
 })
 }
 className="w-8 h-8 rounded-lg flex items-center justify-center border border-stone-300 dark:border-stone-700 active:bg-stone-200 dark:active:bg-stone-800 text-base font-bold select-none"
 >
 -
 </button>
 <div className="flex items-center bg-white dark:bg-stone-800 rounded-lg px-2.5 py-1 border border-stone-300 dark:border-stone-700">
 <input
 type="number"
 min="5"
 max="250"
 value={gridSettings.gridSize || 50}
 onChange={(e) => {
 const val = parseInt(e.target.value, 10);
 if (!isNaN(val)) {
 setGridSettings((prev) => ({
 ...prev,
 gridSize: Math.max(5, Math.min(250, val)),
 }));
 }
 }}
 className="w-12 text-center font-mono font-bold text-emerald-700 dark:text-emerald-300 text-sm bg-transparent focus:outline-hidden"
 />
 <span className="text-xs font-mono text-stone-500 font-bold">px</span>
 </div>
 <button
 type="button"
 onClick={() =>
 setGridSettings((prev) => {
 const current = prev.gridSize || 50;
 const step = current >= 100 ? 10 : current < 20 ? 2 : 5;
 return { ...prev, gridSize: Math.min(250, current + step) };
 })
 }
 className="w-8 h-8 rounded-lg flex items-center justify-center border border-stone-300 dark:border-stone-700 active:bg-stone-200 dark:active:bg-stone-800 text-base font-bold select-none"
 >
 +
 </button>
 </div>
 </div>

 {/* Range Slider */}
 <div className="flex items-center gap-2 pt-1">
 <span className="text-xs font-mono text-stone-400 font-bold">5</span>
 <input
 type="range"
 min="5"
 max="200"
 step="5"
 value={gridSettings.gridSize || 50}
 onChange={(e) => {
 const val = parseInt(e.target.value, 10);
 setGridSettings((prev) => ({
 ...prev,
 gridSize: val,
 }));
 }}
 className="flex-1 h-2 bg-stone-200 dark:bg-stone-700 rounded-lg appearance-none cursor-pointer accent-emerald-600 focus:outline-hidden"
 />
 <span className="text-xs font-mono text-stone-400 font-bold">200</span>
 </div>

 {/* Quick Presets */}
 <div className="grid grid-cols-5 gap-1.5 pt-1">
 {[10, 25, 50, 100, 128].map((size) => (
 <button
 key={size}
 type="button"
 onClick={() =>
 setGridSettings((prev) => ({
 ...prev,
 gridSize: size,
 }))
 }
 className={`py-1.5 rounded-lg text-xs font-mono font-bold border transition-colors ${
 (gridSettings.gridSize || 50) === size
 ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
 : isLight
 ? 'bg-white border-stone-200 text-stone-700 hover:bg-stone-100'
 : 'bg-stone-800 border-stone-700 text-stone-300 hover:bg-stone-700'
 }`}
 >
 {size}px
 </button>
 ))}
 </div>

 {/* Mobile Grid Opacity (濃さ・透明度) */}
 <div className="pt-2 mt-1 border-t border-stone-200 dark:border-stone-800">
 <div className="flex items-center justify-between mb-1">
 <span className="text-xs font-bold text-stone-600 dark:text-stone-300">
 グリッド線の濃さ
 </span>
 <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
 {gridSettings.gridOpacity ?? 30}%
 </span>
 </div>
 <div className="flex items-center gap-2">
 <span className="text-[10px] text-stone-400 font-bold">10%</span>
 <input
 type="range"
 min="10"
 max="100"
 step="5"
 value={gridSettings.gridOpacity ?? 30}
 onChange={(e) => {
 const val = parseInt(e.target.value, 10);
 setGridSettings((prev) => ({
 ...prev,
 gridOpacity: val,
 }));
 }}
 className="flex-1 h-2 bg-stone-200 dark:bg-stone-700 rounded-lg appearance-none cursor-pointer accent-emerald-600 focus:outline-hidden"
 />
 <span className="text-[10px] text-stone-400 font-bold">100%</span>
 </div>
 <div className="grid grid-cols-4 gap-1 pt-1.5">
 {[
 { label: '極薄', val: 15 },
 { label: '淡め', val: 25 },
 { label: '標準', val: 35 },
 { label: 'くっきり', val: 60 },
 ].map((p) => (
 <button
 key={p.val}
 type="button"
 onClick={() =>
 setGridSettings((prev) => ({
 ...prev,
 gridOpacity: p.val,
 }))
 }
 className={`py-1 rounded-lg text-xs font-bold border transition-colors ${
 (gridSettings.gridOpacity ?? 30) === p.val
 ? 'bg-emerald-600 text-white border-emerald-600 '
 : isLight
 ? 'bg-white border-stone-200 text-stone-600 hover:bg-stone-100'
 : 'bg-stone-800 border-stone-700 text-stone-300 hover:bg-stone-700'
 }`}
 >
 {p.label}
 </button>
 ))}
 </div>
 </div>
 </div>

 {/* Mobile Vertical Guides Section */}
 <div className="space-y-1.5 mb-2.5 p-2 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-900/40 shrink-0">
 <div className="flex items-center justify-between">
 <span className="font-bold text-xs text-purple-900 dark:text-purple-300">
 縦グリッド・縦分割ガイド
 </span>
 <span className="text-[10px] text-purple-700 dark:text-purple-400 font-medium">偏・旁・ステム</span>
 </div>
 <div className="grid grid-cols-5 gap-1">
 {VERTICAL_GUIDES.map((vg) => (
 <button
 key={vg.id}
 type="button"
 onClick={() =>
 setGridSettings((prev) => ({
 ...prev,
 verticalGuide: vg.id,
 }))
 }
 className={`py-1 rounded text-[11px] font-bold border transition-colors ${
 (gridSettings.verticalGuide || 'none') === vg.id
 ? 'bg-purple-600 text-white border-purple-600 '
 : isLight
 ? 'bg-white border-purple-200 text-stone-700 hover:bg-purple-50'
 : 'bg-stone-800 border-purple-900/50 text-stone-300 hover:bg-purple-900/30'
 }`}
 >
 {vg.label}
 </button>
 ))}
 </div>
 </div>

 {/* Mobile Japanese Guide Pattern Section */}
 <div className="space-y-1.5 mb-2.5 p-2 rounded-xl bg-stone-50/80 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 shrink-0">
 <div className="flex items-center justify-between">
 <span className="font-bold text-xs text-stone-700 dark:text-stone-300">
 和文目安ガイド (作字格)
 </span>
 </div>
 <div className="grid grid-cols-3 gap-1">
 {JAPANESE_GUIDES.map((g) => (
 <button
 key={g.id}
 type="button"
 onClick={() =>
 setGridSettings((prev) => ({
 ...prev,
 japaneseGuide: g.id,
 }))
 }
 className={`py-1 rounded text-[11px] font-bold border transition-colors ${
 (gridSettings.japaneseGuide || 'tian') === g.id
 ? 'bg-emerald-600 text-white border-emerald-600 '
 : isLight
 ? 'bg-white border-stone-200 text-stone-700 hover:bg-stone-100'
 : 'bg-stone-800 border-stone-700 text-stone-300 hover:bg-stone-700'
 }`}
 >
 {g.label}
 </button>
 ))}
 </div>
 </div>

 {/* Guidelines & Auxiliary Displays */}
 <div className="grid grid-cols-3 gap-1.5 mb-3 shrink-0">
 <button
 type="button"
 onClick={() => setGridSettings((s) => ({ ...s, showMetrics: !s.showMetrics }))}
 className={`p-2.5 rounded-xl border text-[11px] font-bold flex flex-col items-center gap-1 transition-colors ${
 gridSettings.showMetrics
 ? 'bg-emerald-600 text-white border-emerald-600'
 : isLight
 ? 'bg-stone-50 border-stone-200 text-stone-600'
 : 'bg-stone-900 border-stone-800 text-stone-400'
 }`}
 >
 <Eye className="w-4 h-4" />
 <span>基準線・枠</span>
 </button>

 <button
 type="button"
 onClick={() => setGridSettings((s) => ({ ...s, showRulers: !s.showRulers }))}
 className={`p-2.5 rounded-xl border text-[11px] font-bold flex flex-col items-center gap-1 transition-colors ${
 gridSettings.showRulers !== false
 ? 'bg-emerald-600 text-white border-emerald-600'
 : isLight
 ? 'bg-stone-50 border-stone-200 text-stone-600'
 : 'bg-stone-900 border-stone-800 text-stone-400'
 }`}
 >
 <Ruler className="w-4 h-4" />
 <span>目盛定規</span>
 </button>

 <button
 type="button"
 onClick={() =>
 setGridSettings((s) => {
  const next = !s.showCursorCrosshair;
  return { ...s, showCursorCrosshair: next, highContrastCursor: next };
 })
 }
 className={`p-2.5 rounded-xl border text-[11px] font-bold flex flex-col items-center gap-1 transition-colors ${
 gridSettings.showCursorCrosshair
 ? 'bg-emerald-600 text-white border-emerald-600'
 : isLight
 ? 'bg-stone-50 border-stone-200 text-stone-600'
 : 'bg-stone-900 border-stone-800 text-stone-400'
 }`}
 >
 <Crosshair className="w-4 h-4" />
 <span>照準ポインター</span>
 </button>
 </div>

 {/* Quick Actions Footer (Trace & Save) */}
 <div className="grid grid-cols-2 gap-2 shrink-0">
 {onOpenTraceModal && (
 <button
 type="button"
 onClick={() => {
 onClose();
 onOpenTraceModal();
 }}
 className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
 isLight
 ? 'bg-stone-100 hover:bg-stone-200 text-stone-800 border-stone-300'
 : 'bg-stone-850 hover:bg-stone-800 text-emerald-200 border-stone-700'
 }`}
 >
 <Layers className="w-4 h-4" />
 <span>下絵写真トレース</span>
 </button>
 )}

 {onQuickSaveGlyph && (
 <button
 type="button"
 onClick={() => {
 onClose();
 onQuickSaveGlyph();
 }}
 className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
 >
 <Save className="w-4 h-4" />
 <span>文字の即時保存</span>
 </button>
 )}

 {onOpenExportModal && (
 <button
 type="button"
 onClick={() => {
 onClose();
 onOpenExportModal();
 }}
 className="p-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all col-span-2 shadow-sm"
 >
 <Download className="w-4 h-4" />
 <span>フォントを出力 (TTF / OTF / WOFF)</span>
 </button>
 )}
 </div>

 {/* Bottom Quick Close Button */}
 <button
 type="button"
 onClick={() => onClose()}
 className="w-full py-2.5 bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 rounded-xl text-xs font-bold transition-colors text-center"
 >
 設定を閉じて作図へ
 </button>
 </div>
 </div>
 </div>

  );
});

MobileGridMenuSheet.displayName = 'MobileGridMenuSheet';
