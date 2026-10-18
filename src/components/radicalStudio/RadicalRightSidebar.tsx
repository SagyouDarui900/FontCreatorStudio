import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Sliders,
  Layers,
  RefreshCw,
  FlipHorizontal,
  FlipVertical,
  RotateCw,
  Italic,
  FileCode,
  Upload,
  Copy,
  Trash2,
  BookmarkPlus,
  Plus,
  Shapes,
} from 'lucide-react';
import { CustomPart, PartCategory, PathContour, FontProject, RadicalPlacement } from '../../types';
import { CATEGORY_TABS, KANJI_PRESETS_BY_CATEGORY } from './types';
import {
  transformContoursForPlacement,
  contoursToSvgPath,
  normalizeGlyphContoursWinding,
  groupContoursForRendering,
} from '../../utils/pathUtils';
import { KANJI_RADICALS } from '../../data/kanjiRadicals';
import { RADICAL_KANJI_DATABASE } from '../../data/kanjiRadicalDatabase';

export interface RadicalRightSidebarProps {
  isRightSidebarOpen: boolean;
  setIsRightSidebarOpen: (open: boolean) => void;
  rightTab: 'transform' | 'compose';
  setRightTab: (tab: 'transform' | 'compose') => void;
  isLight: boolean;
  activePart: CustomPart | null;
  setParts: React.Dispatch<React.SetStateAction<CustomPart[]>>;
  handleUnionPart: () => void;
  handleNormalizeWinding: () => void;
  handleScalePart: (factor: number) => void;
  handleNudgePart: (dx: number, dy: number) => void;
  handleCenterPartInCanvas: () => void;
  handleFlipHPart: () => void;
  handleFlipVPart: () => void;
  handleRotatePart: (deg: number) => void;
  handleSlantPart: (deg: number) => void;
  handleFitToPlacement: (preset: RadicalPlacement) => void;
  handleExportPartSvg: () => void;
  svgFileInputRef: React.RefObject<HTMLInputElement | null>;
  handleDuplicatePart: (part: CustomPart, e: React.MouseEvent) => void;
  handleDeletePart: (id: string, e: React.MouseEvent) => void;
  insertMode: 'single' | 'batch';
  setInsertMode: (mode: 'single' | 'batch') => void;
  insertPlacement: RadicalPlacement;
  setInsertPlacement: (placement: RadicalPlacement) => void;
  handleInsertToGlyph: (asBackground: boolean) => void;
  selectedBatchChars: string[];
  setSelectedBatchChars: React.Dispatch<React.SetStateAction<string[]>>;
  batchCharsInput: string;
  setBatchCharsInput: (val: string) => void;
  handleBatchInsertToGlyphs: (asBackground: boolean) => void;
  project: FontProject;
  selectedChar: string;
  selectedUnicode: number;
  notify: (text: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const RadicalRightSidebar: React.FC<RadicalRightSidebarProps> = ({
  isRightSidebarOpen,
  setIsRightSidebarOpen,
  rightTab,
  setRightTab,
  isLight,
  activePart,
  setParts,
  handleUnionPart,
  handleNormalizeWinding,
  handleScalePart,
  handleNudgePart,
  handleCenterPartInCanvas,
  handleFlipHPart,
  handleFlipVPart,
  handleRotatePart,
  handleSlantPart,
  handleFitToPlacement,
  handleExportPartSvg,
  svgFileInputRef,
  handleDuplicatePart,
  handleDeletePart,
  insertMode,
  setInsertMode,
  insertPlacement,
  setInsertPlacement,
  handleInsertToGlyph,
  selectedBatchChars,
  setSelectedBatchChars,
  batchCharsInput,
  setBatchCharsInput,
  handleBatchInsertToGlyphs,
  project,
  selectedChar,
  selectedUnicode,
  notify,
}) => {
  return (
    <>
              {!isRightSidebarOpen ? (
          <div
            className={`hidden md:flex w-9 sm:w-10 border-l flex-col items-center py-2.5 shrink-0 cursor-pointer select-none transition-colors group ${
              isLight
                ? 'bg-stone-50/80 border-stone-200/80 hover:bg-emerald-50/80 text-stone-600'
                : 'bg-[#131d16] border-[#223326] hover:bg-[#1a2820] text-emerald-300'
            }`}
            onClick={() => setIsRightSidebarOpen(true)}
            title="詳細・合成パネルを展開 (クリックで開く)"
          >
            <button
              type="button"
              className="p-1.5 rounded-md hover:bg-emerald-100 dark:hover:bg-[#25382b] text-emerald-700 dark:text-emerald-400 transition-colors shadow-2xs"
              title="パネルを展開"
            >
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            </button>
            <div className="mt-5 flex flex-col items-center space-y-2">
              <Sliders className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-[10px] font-bold [writing-mode:vertical-rl] tracking-wider opacity-85">
                {rightTab === 'compose' ? '漢字合成・挿入' : '変形・詳細設定'}
              </span>
            </div>
          </div>
        ) : (
          <div
            className={`hidden md:flex static inset-y-0 right-0 w-80 lg:w-88 xl:w-96 border-l flex-col shrink-0 min-h-0 relative overflow-hidden transition-all ${
              isLight ? 'bg-white border-[#d8e6df]' : 'bg-[#162119] border-[#25362b]'
            }`}
          >
            {/* Right Column Header with Tab Switcher & Collapse */}
 <div
 className={`p-2 px-3 border-b flex items-center justify-between gap-2 shrink-0 ${
 isLight ? 'bg-stone-50/80 border-[#d8e6df]' : 'bg-[#131d16] border-[#25362b]'
 }`}
 >
 <div
 className={`flex items-center p-0.5 rounded-lg border text-xs font-semibold shrink-0 ${
 isLight ? 'bg-stone-200/70 border-stone-200' : 'bg-[#18231c] border-[#25362b]'
 }`}
 >
 <button
 onClick={() => setRightTab('transform')}
 className={`px-2.5 sm:px-3 py-1 rounded-md transition-all whitespace-nowrap ${
 rightTab === 'transform'
 ? isLight
 ? 'bg-white text-emerald-950 font-bold '
 : 'bg-[#25362b] text-emerald-200 font-bold '
 : 'text-stone-500 hover:text-stone-900 dark:text-stone-400'
 }`}
 >
 変形・設定
 </button>
 <button
 onClick={() => setRightTab('compose')}
 className={`px-2.5 sm:px-3 py-1 rounded-md transition-all whitespace-nowrap ${
 rightTab === 'compose'
 ? isLight
 ? 'bg-white text-emerald-950 font-bold '
 : 'bg-[#25362b] text-emerald-200 font-bold '
 : 'text-stone-500 hover:text-stone-900 dark:text-stone-400'
 }`}
 >
 漢字合成・挿入
 </button>
 </div>

 <button
 type="button"
 onClick={() => setIsRightSidebarOpen(false)}
 className="p-1 rounded text-stone-400 hover:text-stone-700 dark:hover:text-emerald-200 shrink-0"
 title="サイドバーを畳んでキャンバスを最大化"
 >
 <ChevronRight className="w-4 h-4" />
 </button>
 </div>

 {activePart ? (
 <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-2.5 space-y-2.5">
 {/* TAB 1: TRANSFORM & SETTINGS */}
 {rightTab === 'transform' && (
 <>
 {/* Part Info Form */}
 <div className="space-y-2.5">
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold text-emerald-950 dark:text-emerald-300">
 パーツ基本情報
 </span>
 <div className="flex items-center justify-end">
 <span className="text-[10px] text-stone-400 font-mono">
 ID: {activePart.id.slice(0, 8)}
 </span>
 </div>

 <div>
 <label className="text-[11px] font-semibold block text-stone-500 mb-1">
 パーツ名
 </label>
 <input
 type="text"
 value={activePart.name || ''}
 onChange={(e) => {
 const val = e.target.value;
 setParts((prev) =>
 prev.map((p) => (p.id === activePart.id ? { ...p, name: val } : p))
 );
 }}
 className={`w-full px-2.5 py-1.5 rounded-md text-xs font-bold border outline-hidden ${
 isLight
 ? 'bg-[#f7faf8] border-[#c8ded3] focus:border-emerald-700'
 : 'bg-[#101712] border-[#25362b] focus:border-emerald-500 text-emerald-100'
 }`}
 />
 </div>

 <div>
 <label className="text-[11px] font-semibold block text-stone-500 mb-1">
 部位・カテゴリ分類
 </label>
 <select
 value={activePart.category || 'other'}
 onChange={(e) => {
 const cat = e.target.value as PartCategory;
 setParts((prev) =>
 prev.map((p) => (p.id === activePart.id ? { ...p, category: cat } : p))
 );
 }}
 className={`w-full px-2.5 py-1.5 rounded-md text-xs font-medium border outline-hidden ${
 isLight
 ? 'bg-[#f7faf8] border-[#c8ded3]'
 : 'bg-[#101712] border-[#25362b] text-emerald-100'
 }`}
 >
 {CATEGORY_TABS.filter((c) => c.id !== 'all').map((cat) => (
 <option key={cat.id} value={cat.id}>
 {cat.label}
 </option>
 ))}
 </select>
 </div>

 <div>
 <label className="text-[11px] font-semibold block text-stone-500 mb-1">
 説明・メモ
 </label>
 <textarea
 value={activePart.description || ''}
 placeholder="使い回し用のメモや構成要素..."
 rows={2}
 onChange={(e) => {
 const val = e.target.value;
 setParts((prev) =>
 prev.map((p) => (p.id === activePart.id ? { ...p, description: val } : p))
 );
 }}
 className={`w-full px-2.5 py-1.5 rounded-md text-xs border outline-hidden resize-none ${
 isLight
 ? 'bg-[#f7faf8] border-[#c8ded3]'
 : 'bg-[#101712] border-[#25362b] text-emerald-100'
 }`}
 />
 </div>
 </div>
 </div>

 {/* Overlap & White Gap Resolver Section */}
 <div className="border-t border-stone-200/60 dark:border-stone-800/60 pt-3 space-y-2">
 <div className="flex items-center space-x-1.5">
 <Layers className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
 <span className="text-xs font-bold text-stone-800 dark:text-stone-200">
 重なり・白抜け防止ツール
 </span>
 </div>
 <p className="text-[10.5px] text-stone-500 dark:text-stone-400 leading-relaxed">
 手書き筆ストロークやパーツ交差時の白抜けを、ブール演算合体で防止します。
 </p>
 <div className="space-y-1.5 pt-1">
 <button
 onClick={handleUnionPart}
 className={`w-full py-2 px-2.5 rounded-lg font-bold text-xs flex items-center justify-center space-x-1.5 transition-all ${
 isLight
 ? 'bg-emerald-800 text-white hover:bg-emerald-900'
 : 'bg-emerald-600 text-white hover:bg-emerald-500'
 }`}
 >
 <Layers className="w-4 h-4" />
 <span>重なり合う線を合体 (白抜け解消)</span>
 </button>
 <button
 onClick={handleNormalizeWinding}
 className={`w-full py-1.5 px-2.5 rounded-lg font-semibold text-xs flex items-center justify-center space-x-1.5 border transition-all ${
 isLight
 ? 'bg-white border-stone-300 text-stone-800 hover:bg-stone-50'
 : 'bg-[#1b2b20] border-stone-700 text-stone-200 hover:bg-[#23382a]'
 }`}
 >
 <RefreshCw className="w-3.5 h-3.5" />
 <span>輪郭の向き（Winding）をTrueType規格に統一</span>
 </button>
 </div>
 </div>

 {/* Transform & Geometry Manipulation Section */}
 <div className="border-t border-stone-200/60 dark:border-stone-800/60 pt-3 space-y-3">
 <span className="text-xs font-bold block text-stone-800 dark:text-stone-200">
 形状・位置の精密変形
 </span>

 {/* Scaling Controls */}
 <div>
 <div className="flex items-center justify-between text-[11px] font-semibold text-stone-500 mb-1">
 <span>拡大 / 縮小</span>
 <div className="flex items-center space-x-1">
 <button
 onClick={() => handleScalePart(0.9)}
 className="px-2 py-0.5 rounded border text-[10px] hover:bg-emerald-100 dark:hover:bg-[#23382a]"
 >
 -10%
 </button>
 <button
 onClick={() => handleScalePart(1.1)}
 className="px-2 py-0.5 rounded border text-[10px] hover:bg-emerald-100 dark:hover:bg-[#23382a]"
 >
 +10%
 </button>
 </div>
 </div>
 <div className="grid grid-cols-4 gap-1">
 {[0.5, 0.75, 1.25, 1.5].map((fac) => (
 <button
 key={fac}
 onClick={() => handleScalePart(fac)}
 className={`py-1 rounded text-center text-[10px] font-semibold border transition-all ${
 isLight ? 'bg-stone-50 border-stone-200 hover:bg-emerald-50' : 'bg-[#1a261e] border-[#2a3c2f] hover:bg-[#203025]'
 }`}
 >
 {fac * 100}%
 </button>
 ))}
 </div>
 </div>

 {/* Nudge & Position Arrow Pad */}
 <div>
 <label className="text-[11px] font-semibold block text-stone-500 mb-1.5">
 位置微調整 (矢印で移動)
 </label>
 <div className="flex flex-col items-center space-y-1">
 <button
 onClick={() => handleNudgePart(0, -25)}
 className="w-16 py-1 rounded border text-xs flex justify-center hover:bg-emerald-50 dark:hover:bg-[#203025]"
 title="上に移動"
 >
 ▲
 </button>
 <div className="flex items-center space-x-2">
 <button
 onClick={() => handleNudgePart(-25, 0)}
 className="w-14 py-1 rounded border text-xs flex justify-center hover:bg-emerald-50 dark:hover:bg-[#203025]"
 title="左に移動"
 >
 ◀
 </button>
 <button
 onClick={handleCenterPartInCanvas}
 className="px-3 py-1 rounded font-bold text-[10.5px] bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
 title="キャンバス中央に揃える"
 >
 中央揃え
 </button>
 <button
 onClick={() => handleNudgePart(25, 0)}
 className="w-14 py-1 rounded border text-xs flex justify-center hover:bg-emerald-50 dark:hover:bg-[#203025]"
 title="右に移動"
 >
 ▶
 </button>
 </div>
 <button
 onClick={() => handleNudgePart(0, 25)}
 className="w-16 py-1 rounded border text-xs flex justify-center hover:bg-emerald-50 dark:hover:bg-[#203025]"
 title="下に移動"
 >
 ▼
 </button>
 </div>
 </div>

 {/* Rotation & Flip */}
 <div>
 <label className="text-[11px] font-semibold block text-stone-500 mb-1.5">
 反転・回転・傾斜
 </label>
 <div className="grid grid-cols-4 gap-1.5">
 <button
 onClick={handleFlipHPart}
 className={`py-1.5 rounded text-[10.5px] font-semibold border flex flex-col items-center justify-center ${
 isLight ? 'bg-stone-50 hover:bg-emerald-50' : 'bg-[#1a261e] hover:bg-[#223328]'
 }`}
 title="左右反転"
 >
 <FlipHorizontal className="w-3.5 h-3.5 mb-0.5" />
 <span>左右反転</span>
 </button>
 <button
 onClick={handleFlipVPart}
 className={`py-1.5 rounded text-[10.5px] font-semibold border flex flex-col items-center justify-center ${
 isLight ? 'bg-stone-50 hover:bg-emerald-50' : 'bg-[#1a261e] hover:bg-[#223328]'
 }`}
 title="上下反転"
 >
 <FlipVertical className="w-3.5 h-3.5 mb-0.5" />
 <span>上下反転</span>
 </button>
 <button
 onClick={() => handleRotatePart(90)}
 className={`py-1.5 rounded text-[10.5px] font-semibold border flex flex-col items-center justify-center ${
 isLight ? 'bg-stone-50 hover:bg-emerald-50' : 'bg-[#1a261e] hover:bg-[#223328]'
 }`}
 title="90度時計回りに回転"
 >
 <RotateCw className="w-3.5 h-3.5 mb-0.5" />
 <span>90°回転</span>
 </button>
 <button
 onClick={() => handleSlantPart(10)}
 className={`py-1.5 rounded text-[10.5px] font-semibold border flex flex-col items-center justify-center ${
 isLight ? 'bg-stone-50 hover:bg-emerald-50' : 'bg-[#1a261e] hover:bg-[#223328]'
 }`}
 title="右に10度傾斜（イタリック）"
 >
 <Italic className="w-3.5 h-3.5 mb-0.5" />
 <span>傾斜 10°</span>
 </button>
 </div>
 </div>

 {/* Fit to Slot Presets */}
 <div>
 <label className="text-[11px] font-semibold block text-stone-500 mb-1.5">
 偏旁枠への自動変形フィット
 </label>
 <div className="grid grid-cols-4 gap-1.5 text-[10px]">
 <button
 onClick={() => handleFitToPlacement('hen')}
 className="py-1.5 rounded font-bold border bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 hover:bg-emerald-100"
 >
 偏枠へ
 </button>
 <button
 onClick={() => handleFitToPlacement('tsukuri')}
 className="py-1.5 rounded font-bold border bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 hover:bg-emerald-100"
 >
 旁枠へ
 </button>
 <button
 onClick={() => handleFitToPlacement('kanmuri')}
 className="py-1.5 rounded font-bold border bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 hover:bg-emerald-100"
 >
 冠枠へ
 </button>
 <button
 onClick={() => handleFitToPlacement('ashi')}
 className="py-1.5 rounded font-bold border bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 hover:bg-emerald-100"
 >
 脚枠へ
 </button>
 </div>
 </div>
 </div>

 {/* SVG Single Export / Import for this part */}
 <div className="grid grid-cols-2 gap-2 pt-1">
 <button
 onClick={handleExportPartSvg}
 className={`py-2 px-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all ${
 isLight
 ? 'bg-white border-[#d8e6df] text-stone-700 hover:bg-emerald-50 hover:text-emerald-900'
 : 'bg-[#18231c] border-[#25362b] text-emerald-200 hover:bg-[#202e24]'
 }`}
 title="このパーツを単体SVGファイルとして書き出し"
 >
 <FileCode className="w-3.5 h-3.5" />
 <span>単体SVG出力</span>
 </button>
 <button
 onClick={() => svgFileInputRef.current?.click()}
 className={`py-2 px-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all ${
 isLight
 ? 'bg-white border-[#d8e6df] text-stone-700 hover:bg-emerald-50 hover:text-emerald-900'
 : 'bg-[#18231c] border-[#25362b] text-emerald-200 hover:bg-[#202e24]'
 }`}
 title="外部SVGファイルをこのパーツにインポート"
 >
 <Upload className="w-3.5 h-3.5" />
 <span>単体SVG読込</span>
 </button>
 </div>

 {/* Duplicate & Delete Part */}
 <div className="flex items-center space-x-2 pt-2 border-t border-stone-200 dark:border-stone-800">
 <button
 onClick={(e) => handleDuplicatePart(activePart, e)}
 className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold flex items-center justify-center space-x-1 ${
 isLight ? 'bg-stone-50 hover:bg-emerald-50' : 'bg-[#1a261e] hover:bg-[#203025]'
 }`}
 >
 <Copy className="w-3.5 h-3.5" />
 <span>パーツを複製</span>
 </button>
 <button
 onClick={(e) => handleDeletePart(activePart.id, e)}
 className="py-1.5 px-3 rounded-lg border text-xs font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 border-rose-200 dark:border-rose-900"
 >
 <Trash2 className="w-3.5 h-3.5" />
 </button>
 </div>
 </>
 )}

 {/* TAB 2: KANJI COMPOSITION & INSERTION */}
 {rightTab === 'compose' && (
 <>
 {/* Target Glyph Info */}
 <div
 className={`p-3 rounded-xl border flex items-center justify-between ${
 isLight ? 'bg-emerald-50/90 border-emerald-300' : 'bg-[#142319] border-emerald-800'
 }`}
 >
 <div>
 <span className="text-[11px] font-semibold text-stone-500 block">合成対象の文字</span>
 <span className="text-xl font-bold font-serif text-emerald-950 dark:text-emerald-200">
 「{selectedChar}」
 </span>
 </div>
 <div className="text-right">
 <span className="text-[10px] text-stone-400 block">パーツ名</span>
 <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400">
 {activePart.name}
 </span>
 </div>
 </div>

 {/* Spacious Live Kanji Composition Simulator */}
 <div
 className={`p-3.5 rounded-xl border space-y-2.5 ${
 isLight ? 'bg-white border-[#d8e6df] ' : 'bg-[#131d16] border-[#25362b]'
 }`}
 >
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold text-emerald-950 dark:text-emerald-300">
 漢字合成シミュレータ
 </span>
 <span className="text-[10.5px] text-stone-400 font-medium">1000×1000 仮想漢字枠</span>
 </div>

 {/* Large Composite Preview Frame */}
 <div
 className={`w-full aspect-square max-w-[280px] mx-auto rounded-xl border-2 flex items-center justify-center relative p-3 transition-all ${
 isLight
 ? 'bg-[#fafcfb] border-emerald-200 shadow-inner'
 : 'bg-[#0b120d] border-emerald-900/60 shadow-inner'
 }`}
 >
 <svg viewBox="0 0 1000 1000" className="w-full h-full">
 {/* Nine-box grid guide in preview */}
 <line x1={333} y1={0} x2={333} y2={1000} stroke="#3b82f6" strokeWidth={1} strokeDasharray="4 4" opacity={0.3} />
 <line x1={666} y1={0} x2={666} y2={1000} stroke="#3b82f6" strokeWidth={1} strokeDasharray="4 4" opacity={0.3} />
 <line x1={0} y1={333} x2={1000} y2={333} stroke="#3b82f6" strokeWidth={1} strokeDasharray="4 4" opacity={0.3} />
 <line x1={0} y1={666} x2={1000} y2={666} stroke="#3b82f6" strokeWidth={1} strokeDasharray="4 4" opacity={0.3} />

 {/* Center Crosshair */}
 <line x1={500} y1={0} x2={500} y2={1000} stroke="#10b981" strokeWidth={1.5} strokeDasharray="4 4" opacity={0.4} />
 <line x1={0} y1={500} x2={1000} y2={500} stroke="#10b981" strokeWidth={1.5} strokeDasharray="4 4" opacity={0.4} />

 {/* Companion ghost radical to simulate actual character balance */}
 {activePart.category === 'hen' && (
 <g opacity={0.3}>
 <path
 d={contoursToSvgPath(
 transformContoursForPlacement(
 KANJI_RADICALS.find((r) => r.id === 'rad_kihen')?.contours || [],
 'tsukuri'
 )
 )}
 fill={isLight ? '#475569' : '#94a3b8'}
 />
 </g>
 )}
 {activePart.category === 'tsukuri' && (
 <g opacity={0.3}>
 <path
 d={contoursToSvgPath(
 transformContoursForPlacement(
 KANJI_RADICALS.find((r) => r.id === 'rad_ninben')?.contours || [],
 'hen'
 )
 )}
 fill={isLight ? '#475569' : '#94a3b8'}
 />
 </g>
 )}

 {/* Render Current Part positioned per insertPlacement */}
 {groupContoursForRendering(
   transformContoursForPlacement(activePart.contours, insertPlacement, activePart.category)
 ).map((group) => (
   <path
     key={group.id}
     d={group.d}
     fill={isLight ? '#064e3b' : '#34d399'}
     fillRule={group.fillRule}
   />
 ))}
 </svg>
 </div>
 <p className="text-[10.5px] text-stone-500 leading-relaxed text-center break-words">
 選択中の配置設定（{insertPlacement}）に従って自動変形・配置された姿をプレビューしています
 </p>
 </div>

 {/* Insertion Mode Switcher: Single vs Batch */}
 <div className="flex rounded-xl p-1 border border-emerald-300 dark:border-emerald-800 bg-stone-100 dark:bg-[#121c15]">
 <button
 onClick={() => setInsertMode('single')}
 className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
 insertMode === 'single'
 ? isLight
 ? 'bg-white text-emerald-950 '
 : 'bg-emerald-700 text-white '
 : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
 }`}
 >
 単一文字へ挿入
 </button>
 <button
 onClick={() => setInsertMode('batch')}
 className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
 insertMode === 'batch'
 ? isLight
 ? 'bg-white text-emerald-950 '
 : 'bg-emerald-700 text-white '
 : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
 }`}
 >
 複数文字へ一括挿入
 </button>
 </div>

 {/* Placement Preset Selector */}
 <div
 className={`p-3 rounded-xl border space-y-2 ${
 isLight ? 'bg-white border-[#d8e6df]' : 'bg-[#152018] border-[#25362b]'
 }`}
 >
 <label className="text-xs font-bold block text-stone-800 dark:text-stone-200">
 文字への自動配置位置を選択
 </label>
 <div className="grid grid-cols-3 gap-1.5 text-[11px]">
 {[
 { id: 'original', label: 'そのまま (原寸)' },
 { id: 'hen', label: '偏 (左46%)' },
 { id: 'tsukuri', label: '旁 (右46%)' },
 { id: 'kanmuri', label: '冠 (上36%)' },
 { id: 'ashi', label: '脚 (下36%)' },
 { id: 'center_small', label: '中央縮小 (60%)' },
 ].map((p) => (
 <button
 key={p.id}
 onClick={() => setInsertPlacement(p.id as RadicalPlacement)}
 className={`py-2 rounded-lg text-center font-bold border transition-all ${
 insertPlacement === p.id
 ? isLight
 ? 'bg-emerald-800 text-white border-emerald-800 '
 : 'bg-emerald-600 text-white border-emerald-600 '
 : isLight
 ? 'bg-stone-50 border-[#c8ded3] text-stone-700 hover:bg-emerald-50'
 : 'bg-[#1a2820] border-[#25362b] text-stone-300 hover:bg-[#223328]'
 }`}
 >
 {p.label}
 </button>
 ))}
 </div>
 </div>

 {/* Single Insert Mode Controls */}
 {insertMode === 'single' ? (
 <div className="space-y-2 pt-2">
 <button
 onClick={() => handleInsertToGlyph(true)}
 className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center space-x-2 shadow-lg transition-all ${
 isLight
 ? 'bg-emerald-800 text-white hover:bg-emerald-900 active:scale-[0.99]'
 : 'bg-emerald-600 text-white hover:bg-emerald-500 active:scale-[0.99]'
 }`}
 >
 <BookmarkPlus className="w-4 h-4" />
 <span>文字「{selectedChar}」に挿入して閉じる</span>
 </button>
 <button
 onClick={() => handleInsertToGlyph(false)}
 className={`w-full py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center space-x-1.5 border transition-all ${
 isLight
 ? 'bg-white border-emerald-300 text-emerald-900 hover:bg-emerald-50'
 : 'bg-[#1a2920] border-emerald-800 text-emerald-300 hover:bg-[#22352a]'
 }`}
 >
 <Plus className="w-3.5 h-3.5" />
 <span>工房を開いたまま文字に挿入</span>
 </button>
 </div>
 ) : (
 /* Batch Insert Mode Controls */
 <div className={`p-3 rounded-xl border space-y-3 ${
 isLight ? 'bg-white border-[#d8e6df]' : 'bg-[#152018] border-[#25362b]'
 }`}>
 {(() => {
 if (!activePart) {
 return (
 <div className="text-xs text-stone-500 py-1">
 パーツが選択されていません
 </div>
 );
 }
 const partName = activePart.name || '';
 const partCategory = activePart.category || 'other';
 const matchingDbEntry = RADICAL_KANJI_DATABASE.find(
 (r) =>
 (partName && (partName.includes(r.name) || r.name.includes(partName))) ||
 (activePart.char && r.char === activePart.char) ||
 r.id === activePart.id
 );

 const categoryPresets = KANJI_PRESETS_BY_CATEGORY[partCategory] || KANJI_PRESETS_BY_CATEGORY.other;

 return (
 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <label className="text-xs font-bold text-stone-800 dark:text-stone-200">
 一括挿入の対象漢字を選択
 </label>
 <button
 onClick={() => setSelectedBatchChars([])}
 className="text-[10.5px] text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 font-semibold"
 >
 選択解除
 </button>
 </div>

 {/* Quick selection action buttons */}
 <div className="flex flex-wrap gap-1.5 text-[11px]">
 {matchingDbEntry && matchingDbEntry.kanjiList.length > 0 && (
 <button
 onClick={() => {
 setSelectedBatchChars(matchingDbEntry.kanjiList);
 notify(`「${matchingDbEntry.name}」の部首DB全${matchingDbEntry.kanjiList.length}字を選択しました`, 'info');
 }}
 className={`px-2.5 py-1 rounded-lg font-bold flex items-center space-x-1 border transition-all ${
 isLight
 ? 'bg-emerald-50 border-emerald-300 text-emerald-900 hover:bg-emerald-100'
 : 'bg-[#18291e] border-emerald-700 text-emerald-200 hover:bg-[#203628]'
 }`}
 title={`部首DB「${matchingDbEntry.name}」に属する${matchingDbEntry.kanjiList.length}文字すべてを選択`}
 >
 <BookmarkPlus className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
 <span>部首DB全{matchingDbEntry.kanjiList.length}字を選択</span>
 </button>
 )}
 <button
 onClick={() => {
 setSelectedBatchChars(categoryPresets);
 }}
 className={`px-2 py-1 rounded-lg font-semibold border transition-all ${
 isLight
 ? 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
 : 'bg-[#152018] border-stone-800 text-stone-300 hover:bg-[#1a291f]'
 }`}
 >
 カテゴリー推奨({categoryPresets.length}字)
 </button>
 </div>
 </div>
 );
 })()}

 {/* Preset Kanji Chips */}
 <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto p-1.5 rounded-lg border bg-stone-50 dark:bg-[#0f1711] border-stone-200 dark:border-stone-800">
 {((activePart?.category ? KANJI_PRESETS_BY_CATEGORY[activePart.category] : null) || KANJI_PRESETS_BY_CATEGORY.other).map((kanji: string, kIdx: number) => {
 const isSelected = selectedBatchChars.includes(kanji);
 return (
 <button
 key={`batch_preset_${activePart?.category || 'other'}_${kanji}_${kIdx}`}
 onClick={() => {
 setSelectedBatchChars((prev) =>
 prev.includes(kanji) ? prev.filter((k) => k !== kanji) : [...prev, kanji]
 );
 }}
 className={`w-7 h-7 rounded-md font-bold text-xs flex items-center justify-center transition-all ${
 isSelected
 ? 'bg-emerald-700 text-white scale-105'
 : isLight
 ? 'bg-white border border-stone-200 text-stone-700 hover:border-emerald-400'
 : 'bg-[#18261e] border border-stone-800 text-stone-300 hover:border-emerald-600'
 }`}
 >
 {kanji}
 </button>
 );
 })}
 </div>

 {/* Custom Kanji Input */}
 <div>
 <span className="text-[11px] font-semibold text-stone-600 dark:text-stone-300 block mb-1">
 追加の対象漢字を直接入力（連続入力OK）:
 </span>
 <input
 type="text"
 value={batchCharsInput}
 onChange={(e) => setBatchCharsInput(e.target.value)}
 placeholder="例: 休体位作保信"
 className={`w-full px-3 py-1.5 rounded-lg text-xs font-bold border outline-hidden transition-colors ${
 isLight
 ? 'bg-[#f7faf8] border-[#c8ded3] focus:border-emerald-700'
 : 'bg-[#101712] border-[#25362b] focus:border-emerald-500 text-emerald-100'
 }`}
 />
 </div>

 {/* Primary Batch Action Button */}
 <div className="space-y-1.5 pt-1">
 <button
 onClick={() => handleBatchInsertToGlyphs(true)}
 className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center space-x-2 shadow-lg transition-all ${
 isLight
 ? 'bg-emerald-800 text-white hover:bg-emerald-900 active:scale-[0.99]'
 : 'bg-emerald-600 text-white hover:bg-emerald-500 active:scale-[0.99]'
 }`}
 >
 <BookmarkPlus className="w-4 h-4" />
 <span>
 選択された {Array.from(new Set([...selectedBatchChars, ...batchCharsInput.split('').filter((c) => c.trim())])).length} 文字に一括挿入して閉じる
 </span>
 </button>
 <button
 onClick={() => handleBatchInsertToGlyphs(false)}
 className={`w-full py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center space-x-1.5 border transition-all ${
 isLight
 ? 'bg-white border-emerald-300 text-emerald-900 hover:bg-emerald-50'
 : 'bg-[#1a2920] border-emerald-800 text-emerald-300 hover:bg-[#22352a]'
 }`}
 >
 <Plus className="w-3.5 h-3.5" />
 <span>工房を開いたまま一括挿入</span>
 </button>
 </div>
 </div>
 )}
 </>
 )}
 </div>
 ) : (
 <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-xs text-stone-400 space-y-2">
 <Shapes className="w-8 h-8 text-stone-300 dark:text-stone-700" />
 <p>左側のライブラリからパーツを選択するか、新規パーツを作成してください</p>
 </div>
 )}
 </div>
 )}
    </>
  );
};
