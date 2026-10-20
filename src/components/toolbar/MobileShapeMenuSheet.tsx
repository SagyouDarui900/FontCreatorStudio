import React from 'react';
import { X } from 'lucide-react';
import { ToolMode } from '../../types';

export interface MobileShapeMenuSheetProps {
  isOpen: boolean;
  onClose: () => void;
  sheetRef: React.RefObject<HTMLDivElement | null>;
  themeClasses: any;
  isLight: boolean;
  toolMode: ToolMode;
  setToolMode: (mode: ToolMode) => void;
  setLastSelectedShape: (shape: ToolMode) => void;
  SHAPE_TOOLS: { id: ToolMode; label: string; icon: any }[];
}

export const MobileShapeMenuSheet: React.FC<MobileShapeMenuSheetProps> = React.memo(({
  isOpen,
  onClose,
  sheetRef,
  themeClasses,
  isLight,
  toolMode,
  setToolMode,
  setLastSelectedShape,
  SHAPE_TOOLS,
}) => {
  if (!isOpen) return null;

  return (
 <div className="sm:hidden fixed inset-0 z-50 flex flex-col justify-end" ref={sheetRef}>
 <div
 className="fixed inset-0 bg-black/60 animate-fadeIn"
 onClick={() => onClose()}
 />
 <div
 className={`relative z-10 w-full rounded-t-3xl p-4 border-t shadow-2xl max-h-[82vh] flex flex-col animate-slideUp pb-[max(env(safe-area-inset-bottom),20px)] ${themeClasses.cardBg}`}
 >
 {/* Header */}
 <div className="flex items-center justify-between pb-2.5 border-b border-stone-200 dark:border-stone-800 mb-2.5 shrink-0">
 <div className="flex items-center space-x-2">
 <span className="font-extrabold text-sm text-emerald-800 dark:text-emerald-300">幾何学図形ツールを選択</span>
 <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold">全20種類</span>
 </div>
 <button
 onClick={() => onClose()}
 className="p-1.5 rounded-full text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 bg-stone-100 dark:bg-[#202d24]"
 title="閉じる"
 >
 <X className="w-5 h-5" />
 </button>
 </div>

 {/* Scrollable Shape Grid with Categorized Headers and Bottom Padding (pb-24) */}
 <div className="overflow-y-auto pr-1 flex-1 min-h-0 space-y-4 pb-24">
 {/* Category 1 */}
 <div>
 <div className="text-[11px] font-bold text-stone-500 dark:text-emerald-400/90 mb-1.5 px-1">
 基本・角丸・カプセル (6種類)
 </div>
 <div className="grid grid-cols-2 gap-2">
 {SHAPE_TOOLS.slice(0, 6).map((shape) => {
 const SIcon = shape.icon;
 const isSelected = toolMode === shape.id;
 return (
 <button
 key={shape.id}
 onClick={(e) => {
 e.stopPropagation();
 setLastSelectedShape(shape.id);
 setToolMode(shape.id);
 onClose();
 }}
 className={`flex items-center space-x-2.5 p-3 rounded-xl text-xs font-medium transition-all ${
 isSelected
 ? isLight
 ? 'bg-emerald-800 text-white font-bold '
 : 'bg-emerald-600 text-white font-bold '
 : isLight
 ? 'bg-stone-50 hover:bg-emerald-100/80 text-stone-800 border border-stone-200/80'
 : 'bg-[#1a261f] hover:bg-[#223328] text-emerald-100 border border-stone-800'
 }`}
 >
 <SIcon className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
 <span className="truncate">{shape.label.split(' ')[0]}</span>
 </button>
 );
 })}
 </div>
 </div>

 {/* Category 2 */}
 <div>
 <div className="text-[11px] font-bold text-stone-500 dark:text-emerald-400/90 mb-1.5 px-1">
 多角形・直線・幾何学 (9種類)
 </div>
 <div className="grid grid-cols-2 gap-2">
 {SHAPE_TOOLS.slice(6, 15).map((shape) => {
 const SIcon = shape.icon;
 const isSelected = toolMode === shape.id;
 return (
 <button
 key={shape.id}
 onClick={(e) => {
 e.stopPropagation();
 setLastSelectedShape(shape.id);
 setToolMode(shape.id);
 onClose();
 }}
 className={`flex items-center space-x-2.5 p-3 rounded-xl text-xs font-medium transition-all ${
 isSelected
 ? isLight
 ? 'bg-emerald-800 text-white font-bold '
 : 'bg-emerald-600 text-white font-bold '
 : isLight
 ? 'bg-stone-50 hover:bg-emerald-100/80 text-stone-800 border border-stone-200/80'
 : 'bg-[#1a261f] hover:bg-[#223328] text-emerald-100 border border-stone-800'
 }`}
 >
 <SIcon className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
 <span className="truncate">{shape.label.split(' ')[0]}</span>
 </button>
 );
 })}
 </div>
 </div>

 {/* Category 3 */}
 <div>
 <div className="text-[11px] font-bold text-stone-500 dark:text-emerald-400/90 mb-1.5 px-1">
 記号・星型・三日月 (5種類)
 </div>
 <div className="grid grid-cols-2 gap-2">
 {SHAPE_TOOLS.slice(15).map((shape) => {
 const SIcon = shape.icon;
 const isSelected = toolMode === shape.id;
 return (
 <button
 key={shape.id}
 onClick={(e) => {
 e.stopPropagation();
 setLastSelectedShape(shape.id);
 setToolMode(shape.id);
 onClose();
 }}
 className={`flex items-center space-x-2.5 p-3 rounded-xl text-xs font-medium transition-all ${
 isSelected
 ? isLight
 ? 'bg-emerald-800 text-white font-bold '
 : 'bg-emerald-600 text-white font-bold '
 : isLight
 ? 'bg-stone-50 hover:bg-emerald-100/80 text-stone-800 border border-stone-200/80'
 : 'bg-[#1a261f] hover:bg-[#223328] text-emerald-100 border border-stone-800'
 }`}
 >
 <SIcon className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
 <span className="truncate">{shape.label.split(' ')[0]}</span>
 </button>
 );
 })}
 </div>
 </div>
 </div>
 </div>
 </div>

  );
});

MobileShapeMenuSheet.displayName = 'MobileShapeMenuSheet';
