import React from 'react';
import { Sliders, X, ChevronRight, Paintbrush } from 'lucide-react';
import { BrushStyle, ToolMode, UserPenPreset } from '../../types';
import { PEN_PRESETS } from '../../utils/pathUtils';

export interface MobileBrushMenuSheetProps {
  isOpen: boolean;
  onClose: () => void;
  sheetRef: React.RefObject<HTMLDivElement | null>;
  themeClasses: any;
  isLight: boolean;
  onOpenPenPresetsModal?: () => void;
  customPresets: UserPenPreset[];
  activePenPreset: any;
  onApplyPreset?: (preset: UserPenPreset) => void;
  setToolMode: (mode: ToolMode) => void;
  PEN_ICONS: Record<string, any>;
  brushStyle: BrushStyle;
  setBrushStyle?: (style: BrushStyle) => void;
  brushWidth: number;
  setBrushWidth: (w: number) => void;
  pressureSensitivity: 'high' | 'normal' | 'low' | 'off';
  onChangePressureSensitivity?: (s: 'high' | 'normal' | 'low' | 'off') => void;
  smoothingIntensity?: number;
  onChangeSmoothingIntensity?: (val: number) => void;
}

export const MobileBrushMenuSheet: React.FC<MobileBrushMenuSheetProps> = React.memo(({
  isOpen,
  onClose,
  sheetRef,
  themeClasses,
  isLight,
  onOpenPenPresetsModal,
  customPresets,
  activePenPreset,
  onApplyPreset,
  setToolMode,
  PEN_ICONS,
  brushStyle,
  setBrushStyle,
  brushWidth,
  setBrushWidth,
  pressureSensitivity,
  onChangePressureSensitivity,
  smoothingIntensity,
  onChangeSmoothingIntensity,
}) => {
  if (!isOpen) return null;

  const isCustomPen = Boolean(activePenPreset && customPresets.some((p) => p.id === activePenPreset.id));

  return (
 <div className="sm:hidden fixed inset-0 z-50 flex flex-col justify-end" ref={sheetRef}>
 <div
 className="fixed inset-0 bg-black/60 animate-fadeIn"
 onClick={() => onClose()}
 />
 <div
 className={`relative z-10 w-full rounded-t-2xl p-4 pb-[max(env(safe-area-inset-bottom),24px)] border-t shadow-2xl max-h-[75vh] flex flex-col animate-slideUp ${themeClasses.cardBg}`}
 >
 <div className="flex items-center justify-between pb-2 border-b border-stone-200 dark:border-stone-800 mb-2 shrink-0">
 <span className="font-bold text-sm text-emerald-800 dark:text-emerald-300">手書きペンの種類 (全{PEN_PRESETS.length}種)</span>
 <div className="flex items-center space-x-1">
 {onOpenPenPresetsModal && (
 <button
 onClick={() => {
 onClose();
 onOpenPenPresetsModal();
 }}
 className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center space-x-1 cursor-pointer transition-colors"
 >
 <Sliders className="w-3 h-3" />
 <span>作成</span>
 </button>
 )}
 <button
 onClick={() => onClose()}
 className="p-1 rounded-full text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
 >
 <X className="w-5 h-5" />
 </button>
 </div>
 </div>

 {/* Custom Pen Studio Button on Mobile */}
 {onOpenPenPresetsModal && (
 <button
 onClick={() => {
 onClose();
 onOpenPenPresetsModal();
 }}
 className={`w-full mb-2.5 p-2.5 rounded-xl text-xs font-bold border transition-colors flex items-center justify-between shrink-0 text-left cursor-pointer ${
 isLight
 ? 'bg-stone-100 hover:bg-stone-200/80 border-stone-300 text-stone-900 '
 : 'bg-[#1b2720] hover:bg-[#23352b] border-[#2c4033] text-stone-100 '
 }`}
 >
 <div className="flex items-center space-x-2.5">
 <div
 className={`p-1.5 rounded-lg ${
 isLight ? 'bg-stone-200 text-stone-700' : 'bg-[#25392d] text-emerald-300'
 }`}
 >
 <Sliders className="w-4 h-4" />
 </div>
 <div>
 <div className="font-bold text-xs text-stone-900 dark:text-stone-100">
 カスタムペン作成・設定
 </div>
 <div className="text-[10px] font-normal text-stone-500 dark:text-stone-400">
 入り抜き・筆先形状・角度・手ブレ補正を編集
 </div>
 </div>
 </div>
 <ChevronRight className="w-4 h-4 text-stone-400" />
 </button>
 )}

 <div className="space-y-1.5 overflow-y-auto pr-1 flex-1 pb-20">
 {/* Custom User Pens in Mobile Sheet */}
 {customPresets.length > 0 && (
 <div className="mb-2.5 pb-2 border-b border-stone-200/80 dark:border-[#223025]">
 <div className="px-1.5 pb-1 text-[10px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider flex items-center justify-between">
 <span>自作カスタムペン ({customPresets.length})</span>
 <span className="text-[9px] font-normal opacity-70">マイプリセット</span>
 </div>
 <div className="space-y-1.5">
 {customPresets.map((preset) => {
 const PIcon = PEN_ICONS[preset.brushStyle] || Paintbrush;
 const isSelected = activePenPreset?.id === preset.id;
 return (
 <button
 key={preset.id}
 onClick={(e) => {
 e.stopPropagation();
 onApplyPreset?.(preset);
 setToolMode('brush');
 onClose();
 }}
 className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center space-x-3 ${
 isSelected
 ? isLight
 ? 'bg-emerald-100/90 text-emerald-950 font-bold border border-emerald-300'
 : 'bg-emerald-950/80 text-emerald-200 font-bold border border-emerald-700'
 : isLight
 ? 'hover:bg-emerald-50 text-stone-700'
 : 'hover:bg-[#202d24] text-emerald-300'
 }`}
 >
 <div
 className={`p-2 rounded-lg shrink-0 ${
 isSelected
 ? isLight
 ? 'bg-emerald-700 text-white'
 : 'bg-emerald-500 text-stone-950'
 : isLight
 ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-300'
 : 'bg-[#1a251e] text-emerald-400'
 }`}
 >
 <PIcon className="w-5 h-5" />
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold truncate">{preset.name}</span>
 <span className="text-[10px] font-mono opacity-70 shrink-0 ml-1">
 太さ {preset.brushWidth}px
 </span>
 </div>
 <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 leading-relaxed truncate">
 筆圧: {preset.pressureSensitivity} · 補正: {preset.smoothingIntensity ?? 50}%
 </p>
 </div>
 </button>
 );
 })}
 </div>
 </div>
 )}

 {/* Standard Built-in Pens in Mobile Sheet */}
 {customPresets.length > 0 && (
 <div className="px-1.5 pt-0.5 pb-1 text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">
 標準ペン
 </div>
 )}
 {PEN_PRESETS.map((preset) => {
 const PIcon = PEN_ICONS[preset.id] || Paintbrush;
 const isSelected = (!isCustomPen && brushStyle === preset.id) || activePenPreset?.id === preset.id;
 return (
 <button
 key={preset.id}
 onClick={(e) => {
 e.stopPropagation();
 setBrushStyle?.(preset.id);
 if (preset.defaultWidth) {
 setBrushWidth(preset.defaultWidth);
 }
 setToolMode('brush');
 onClose();
 }}
 className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center space-x-3 ${
 isSelected
 ? isLight
 ? 'bg-emerald-100/90 text-emerald-950 font-bold border border-emerald-300'
 : 'bg-emerald-950/80 text-emerald-200 font-bold border border-emerald-700'
 : isLight
 ? 'hover:bg-emerald-50 text-stone-700'
 : 'hover:bg-[#202d24] text-emerald-300'
 }`}
 >
 <div
 className={`p-2 rounded-lg shrink-0 ${
 isSelected
 ? isLight
 ? 'bg-emerald-700 text-white'
 : 'bg-emerald-500 text-stone-950'
 : isLight
 ? 'bg-stone-100 text-stone-600'
 : 'bg-[#1a251e] text-emerald-400'
 }`}
 >
 <PIcon className="w-5 h-5" />
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold">{preset.name}</span>
 <span className="text-[10px] font-mono opacity-70">太さ {preset.defaultWidth}px</span>
 </div>
 <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 leading-relaxed line-clamp-2">
 {preset.description}
 </p>
 </div>
 </button>
 );
 })}
 </div>

 {/* Mobile Smoothing Intensity Control */}
 <div className="pt-2.5 mt-2 border-t border-stone-200 dark:border-stone-800 shrink-0">
 <div className="flex items-center justify-between text-xs mb-1 font-bold">
 <span>手ブレ補正強度 (Smoothing)</span>
 <span className="font-mono text-emerald-600 dark:text-emerald-400">
 {smoothingIntensity === 0
 ? 'OFF (0%)'
 : `${smoothingIntensity}%`}
 </span>
 </div>
 <div className="flex items-center space-x-2 my-1">
 <span className="text-[10px] opacity-60">OFF</span>
 <input
 type="range"
 min="0"
 max="100"
 step="5"
 value={smoothingIntensity ?? 0}
 onChange={(e) => onChangeSmoothingIntensity?.(Number(e.target.value))}
 className="flex-1 accent-emerald-600 dark:accent-emerald-400 cursor-pointer h-2 bg-stone-200 dark:bg-[#202d24] rounded-lg"
 />
 <span className="text-[10px] opacity-60">100%</span>
 </div>
 <div className="grid grid-cols-5 gap-1.5 mt-1.5">
 {[
 { val: 0, label: 'OFF' },
 { val: 25, label: '弱め' },
 { val: 50, label: '標準' },
 { val: 75, label: '強め' },
 { val: 100, label: '最大' },
 ].map((preset) => (
 <button
 key={preset.val}
 onClick={() => onChangeSmoothingIntensity?.(preset.val)}
 className={`py-1.5 px-1 rounded-lg text-xs font-bold text-center transition-all ${
 smoothingIntensity === preset.val
 ? isLight
 ? 'bg-emerald-700 text-white '
 : 'bg-emerald-500 text-stone-950 '
 : isLight
 ? 'bg-stone-100 hover:bg-stone-200 text-stone-700'
 : 'bg-[#18231c] hover:bg-[#1f2d24] text-emerald-200/80'
 }`}
 >
 {preset.label}
 </button>
 ))}
 </div>
 </div>
 </div>
 </div>

  );
});

MobileBrushMenuSheet.displayName = 'MobileBrushMenuSheet';
