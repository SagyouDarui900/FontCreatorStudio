import React from 'react';
import {
  Shapes,
  Layers,
  Sliders,
  BookmarkPlus,
  ChevronLeft,
  ChevronDown,
  Search,
  Plus,
  Copy,
  Trash2,
  RotateCcw,
  RotateCw,
  Italic,
  FlipHorizontal,
  FlipVertical,
  Maximize2,
  Check,
  X,
} from 'lucide-react';
import { CustomPart, PartCategory, PathContour, RadicalPlacement } from '../../types';
import { StudioRadicalPresetItem } from './types';
import { searchRadicalDatabase, RadicalEntry } from '../../data/kanjiRadicalDatabase';
import {
  scaleContours,
  rotateSingleContour,
  slantContours,
  flipContoursHorizontal,
  flipContoursVertical,
} from '../../utils/pathUtils';

export type MobileSheetSnap = 'peek' | 'half' | 'full';
export type MobileSheetTab = 'radicals' | 'parts' | 'transform' | 'compose';

export interface RadicalMobileDrawerProps {
  mobileSheetSnap: MobileSheetSnap;
  setMobileSheetSnap: (snap: MobileSheetSnap) => void;
  mobileSheetTab: MobileSheetTab;
  setMobileSheetTab: (tab: MobileSheetTab) => void;
  isLight: boolean;
  leftSidebarTab: 'presets' | 'kanji_db' | 'custom';
  setLeftSidebarTab: (tab: 'presets' | 'kanji_db' | 'custom') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeCategory: PartCategory;
  filteredPresets: StudioRadicalPresetItem[];
  parts: CustomPart[];
  activePart: CustomPart | null;
  selectedPartId: string;
  setSelectedPartId: (id: string) => void;
  handleLoadPreset: (item: StudioRadicalPresetItem) => void | Promise<void>;
  selectedRadicalDbId: string;
  setSelectedRadicalDbId: React.Dispatch<React.SetStateAction<string>>;
  handleCreateNewPart: (category?: PartCategory) => void;
  handleDuplicatePart: (part: CustomPart, e?: React.MouseEvent) => void;
  handleDeletePart: (id: string, e?: React.MouseEvent) => void;
  handleCenterPartInCanvas: () => void;
  handleScalePart: (factor: number) => void;
  handleRotatePart: (deg: number) => void;
  handleSlantPart: (deg: number) => void;
  handleFlipHPart: () => void;
  handleFlipVPart: () => void;
  handleQuickInsertPlacement: (placement: RadicalPlacement, closeAfter?: boolean) => void;
  selectedChar: string;
  contoursToSvgPath: (contours: PathContour[]) => string;
  setWatermarkChar: (char: string) => void;
  setShowWatermark: (show: boolean) => void;
  notify: (text: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  commitPartChange: (contours: PathContour[]) => void;
}

export const RadicalMobileDrawer: React.FC<RadicalMobileDrawerProps> = ({
  mobileSheetSnap,
  setMobileSheetSnap,
  mobileSheetTab,
  setMobileSheetTab,
  isLight,
  leftSidebarTab,
  setLeftSidebarTab,
  searchQuery,
  setSearchQuery,
  activeCategory,
  filteredPresets,
  parts,
  activePart,
  selectedPartId,
  setSelectedPartId,
  handleLoadPreset,
  selectedRadicalDbId,
  setSelectedRadicalDbId,
  handleCreateNewPart,
  handleDuplicatePart,
  handleDeletePart,
  handleCenterPartInCanvas,
  handleScalePart,
  handleRotatePart,
  handleSlantPart,
  handleFlipHPart,
  handleFlipVPart,
  handleQuickInsertPlacement,
  selectedChar,
  contoursToSvgPath,
  setWatermarkChar,
  setShowWatermark,
  notify,
  commitPartChange,
}) => {
  return (
     <div
 className={`flex md:hidden fixed bottom-0 inset-x-0 z-40 flex-col transition-all duration-300 ease-out shadow-2xl border-t select-none ${
 isLight
 ? 'bg-white/98 border-stone-300 text-stone-800'
 : 'bg-[#121c15]/98 border-[#25362b] text-emerald-100'
 }`}
 style={{
 height:
 mobileSheetSnap === 'peek'
 ? 'calc(54px + env(safe-area-inset-bottom, 0px))'
 : mobileSheetSnap === 'half'
 ? '48vh'
 : '85vh',
 paddingBottom: mobileSheetSnap === 'peek' ? 'max(env(safe-area-inset-bottom, 0px), 2px)' : '0px',
 }}
 >
 {/* Bottom Sheet Grab Handle & Mode Toggle */}
 <div
 className="w-full flex flex-col items-center pt-2 pb-1 cursor-grab active:cursor-grabbing select-none"
 onClick={() => {
 if (mobileSheetSnap === 'peek') setMobileSheetSnap('half');
 else if (mobileSheetSnap === 'half') setMobileSheetSnap('full');
 else setMobileSheetSnap('peek');
 }}
 >
 <div className="w-10 h-1.5 bg-stone-300 dark:bg-stone-600 rounded-full" />
 </div>

 {/* Bottom Sheet 4-Tab Navigation Strip */}
 <div className="flex items-center justify-around px-1 pb-1 border-b border-inherit shrink-0">
 <button
 onClick={() => {
 setMobileSheetTab('radicals');
 if (mobileSheetSnap === 'peek') setMobileSheetSnap('half');
 }}
 className={`flex-1 min-h-[44px] flex flex-col items-center justify-center py-1 rounded-lg transition-all ${
 mobileSheetTab === 'radicals' && mobileSheetSnap !== 'peek'
 ? 'text-emerald-700 dark:text-emerald-400 font-extrabold bg-emerald-50 dark:bg-emerald-950/40'
 : 'text-stone-500 hover:text-stone-900 dark:text-stone-400'
 }`}
 >
 <Shapes className="w-4 h-4" />
 <span className="text-[10px] mt-0.5">部首</span>
 </button>

 <button
 onClick={() => {
 setMobileSheetTab('parts');
 if (mobileSheetSnap === 'peek') setMobileSheetSnap('half');
 }}
 className={`flex-1 min-h-[44px] flex flex-col items-center justify-center py-1 rounded-lg transition-all ${
 mobileSheetTab === 'parts' && mobileSheetSnap !== 'peek'
 ? 'text-emerald-700 dark:text-emerald-400 font-extrabold bg-emerald-50 dark:bg-emerald-950/40'
 : 'text-stone-500 hover:text-stone-900 dark:text-stone-400'
 }`}
 >
 <Layers className="w-4 h-4" />
 <span className="text-[10px] mt-0.5">パーツ ({parts.length})</span>
 </button>

 <button
 onClick={() => {
 setMobileSheetTab('transform');
 if (mobileSheetSnap === 'peek') setMobileSheetSnap('half');
 }}
 className={`flex-1 min-h-[44px] flex flex-col items-center justify-center py-1 rounded-lg transition-all ${
 mobileSheetTab === 'transform' && mobileSheetSnap !== 'peek'
 ? 'text-emerald-700 dark:text-emerald-400 font-extrabold bg-emerald-50 dark:bg-emerald-950/40'
 : 'text-stone-500 hover:text-stone-900 dark:text-stone-400'
 }`}
 >
 <Sliders className="w-4 h-4" />
 <span className="text-[10px] mt-0.5">変形</span>
 </button>

 <button
 onClick={() => {
 setMobileSheetTab('compose');
 if (mobileSheetSnap === 'peek') setMobileSheetSnap('half');
 }}
 className={`flex-1 min-h-[44px] flex flex-col items-center justify-center py-1 rounded-lg transition-all ${
 mobileSheetTab === 'compose' && mobileSheetSnap !== 'peek'
 ? 'text-emerald-700 dark:text-emerald-400 font-extrabold bg-emerald-50 dark:bg-emerald-950/40'
 : 'text-stone-500 hover:text-stone-900 dark:text-stone-400'
 }`}
 >
 <BookmarkPlus className="w-4 h-4" />
 <span className="text-[10px] mt-0.5">合成</span>
 </button>

 {/* Snap expand/collapse toggle button */}
 <button
 onClick={() => {
 if (mobileSheetSnap === 'peek') setMobileSheetSnap('half');
 else if (mobileSheetSnap === 'half') setMobileSheetSnap('peek');
 else setMobileSheetSnap('half');
 }}
 className="px-2 min-h-[44px] flex items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-emerald-300"
 title="シートの展開/縮小"
 >
 {mobileSheetSnap === 'peek' ? (
 <ChevronLeft className="w-4 h-4 -rotate-90" />
 ) : (
 <ChevronDown className="w-4 h-4" />
 )}
 </button>
 </div>

 {/* Bottom Sheet Expandable Content */}
 {mobileSheetSnap !== 'peek' && (
 <div className="flex-1 min-h-0 overflow-y-auto p-3 overscroll-contain">
 {mobileSheetTab === 'radicals' && (
 <div className="space-y-3 pb-8">
 {/* Category switcher */}
 <div className="grid grid-cols-3 gap-1 p-0.5 rounded-lg bg-stone-200/70 dark:bg-[#1b261f]">
 <button
 onClick={() => setLeftSidebarTab('presets')}
 className={`py-1.5 text-xs font-bold rounded-md ${
 leftSidebarTab === 'presets'
 ? 'bg-white dark:bg-[#25362b] text-emerald-900 dark:text-emerald-200 shadow-xs'
 : 'text-stone-600 dark:text-stone-400'
 }`}
 >
 標準部首 214
 </button>
 <button
 onClick={() => setLeftSidebarTab('kanji_db')}
 className={`py-1.5 text-xs font-bold rounded-md ${
 leftSidebarTab === 'kanji_db'
 ? 'bg-white dark:bg-[#25362b] text-emerald-900 dark:text-emerald-200 shadow-xs'
 : 'text-stone-600 dark:text-stone-400'
 }`}
 >
 部首別漢字
 </button>
 <button
 onClick={() => setLeftSidebarTab('custom')}
 className={`py-1.5 text-xs font-bold rounded-md ${
 leftSidebarTab === 'custom'
 ? 'bg-white dark:bg-[#25362b] text-emerald-900 dark:text-emerald-200 shadow-xs'
 : 'text-stone-600 dark:text-stone-400'
 }`}
 >
 マイパーツ ({parts.length})
 </button>
 </div>

 {/* Search box */}
 <div className="relative">
 <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
 <input
 type="text"
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="部首名・読み・漢字で検索..."
 className={`w-full pl-9 pr-8 py-2 rounded-xl text-xs font-bold border outline-hidden ${
 isLight
 ? 'bg-stone-50 border-stone-300 text-stone-800'
 : 'bg-[#18241c] border-stone-700 text-emerald-100'
 }`}
 />
 {searchQuery && (
 <button
 onClick={() => setSearchQuery('')}
 className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-600"
 >
 <X className="w-4 h-4" />
 </button>
 )}
 </div>

 {/* Dynamic Radical Content based on category sub-tab */}
 {leftSidebarTab === 'presets' && (
 <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
 {filteredPresets.map((item) => (
 <button
 key={`m_preset_${item.id}`}
 onClick={() => handleLoadPreset(item)}
 className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 active:scale-95 transition-all min-h-[58px] ${
 isLight
 ? 'bg-stone-50/80 border-stone-200 hover:border-emerald-500 hover:bg-white text-stone-800'
 : 'bg-[#18261e] border-stone-800 hover:border-emerald-500 hover:bg-[#203328] text-emerald-100'
 }`}
 >
 <span className="text-xl font-bold leading-none">{item.char}</span>
 <span className="text-[10px] text-stone-500 dark:text-stone-400 truncate max-w-full">
 {item.name}
 </span>
 </button>
 ))}
 </div>
 )}

 {leftSidebarTab === 'kanji_db' && (
 <div className="space-y-2">
 {searchRadicalDatabase(searchQuery, 'all').slice(0, 40).map((radical) => {
 const isExpanded = selectedRadicalDbId === radical.id;
 return (
 <div
 key={`m_db_${radical.id}`}
 className={`rounded-xl border overflow-hidden ${
 isExpanded
 ? isLight ? 'bg-white border-emerald-600' : 'bg-[#16241b] border-emerald-500'
 : isLight ? 'bg-stone-50/80 border-stone-200' : 'bg-[#18261e] border-stone-800'
 }`}
 >
 <div
 onClick={() => setSelectedRadicalDbId(isExpanded ? '' : radical.id)}
 className="p-2.5 flex items-center justify-between cursor-pointer"
 >
 <div className="flex items-center space-x-2">
 <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-700 text-white font-bold text-sm shrink-0 font-serif">
 {radical.char}
 </span>
 <div>
 <div className="text-xs font-bold text-stone-800 dark:text-emerald-100">
 {radical.name} ({radical.strokes}画)
 </div>
 <div className="text-[10px] text-stone-400">
 {radical.kanjiList.length}字収録
 </div>
 </div>
 </div>
 <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform ${isExpanded ? 'rotate-180 text-emerald-600' : ''}`} />
 </div>

 {isExpanded && (
 <div className="p-2.5 pt-0 border-t border-inherit space-y-2">
 <div className="grid grid-cols-5 gap-1.5 pt-2 max-h-36 overflow-y-auto">
 {radical.kanjiList.map((kanji, kIdx) => (
 <button
 key={`m_k_${radical.id}_${kanji}_${kIdx}`}
 onClick={() => {
 setWatermarkChar(kanji);
 setShowWatermark(true);
 notify(`「${kanji}」を下絵ガイドに設定しました`, 'info');
 }}
 className="p-2 rounded-lg text-sm font-serif font-bold bg-white dark:bg-[#121b14] border border-stone-200 dark:border-stone-700 text-center"
 >
 {kanji}
 </button>
 ))}
 </div>
 </div>
 )}
 </div>
 );
 })}
 </div>
 )}

 {leftSidebarTab === 'custom' && (
 <div className="space-y-2">
 <button
 onClick={() => handleCreateNewPart(activeCategory)}
 className="w-full py-2.5 rounded-xl font-bold text-xs bg-emerald-700 hover:bg-emerald-800 text-white flex items-center justify-center space-x-1.5 shadow-sm"
 >
 <Plus className="w-3.5 h-3.5" />
 <span>新規マイパーツを作成</span>
 </button>
 <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
 {parts.map((p) => (
 <button
 key={`m_custom_p_${p.id}`}
 onClick={() => setSelectedPartId(p.id)}
 className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 ${
 p.id === selectedPartId
 ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-900 dark:text-emerald-200'
 : isLight ? 'bg-white border-stone-200 text-stone-800' : 'bg-[#18261e] border-stone-800 text-emerald-100'
 }`}
 >
 <svg viewBox="0 0 1000 1000" className="w-6 h-6">
 <path d={contoursToSvgPath(p.contours || [])} fill="currentColor" />
 </svg>
 <span className="text-[10px] font-bold truncate max-w-full">{p.name}</span>
 </button>
 ))}
 </div>
 </div>
 )}
 </div>
 )}

 {mobileSheetTab === 'parts' && (
 <div className="space-y-3 pb-8">
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold text-stone-600 dark:text-stone-400">
 パーツ構成 ({parts.length}個)
 </span>
 <button
 onClick={() => handleCreateNewPart(activeCategory)}
 className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white flex items-center space-x-1"
 >
 <Plus className="w-3.5 h-3.5" />
 <span>パーツ追加</span>
 </button>
 </div>

 <div className="space-y-2">
 {parts.map((part) => {
 const isSelected = part.id === selectedPartId;
 return (
 <div
 key={`m_part_${part.id}`}
 onClick={() => setSelectedPartId(part.id)}
 className={`p-3 rounded-xl border flex items-center justify-between gap-2 transition-all cursor-pointer ${
 isSelected
 ? 'bg-emerald-50/90 dark:bg-emerald-950/50 border-emerald-500 ring-1 ring-emerald-500'
 : isLight
 ? 'bg-stone-50 border-stone-200 hover:bg-white'
 : 'bg-[#18261e] border-stone-800 hover:bg-[#203429]'
 }`}
 >
 <div className="flex items-center space-x-2.5 min-w-0">
 <div className="w-8 h-8 rounded-lg bg-white dark:bg-black/30 border border-stone-200 dark:border-stone-700 flex items-center justify-center shrink-0">
 <svg viewBox="0 0 1000 1000" className="w-6 h-6">
 <path
 d={contoursToSvgPath(part.contours || [])}
 fill={isLight ? '#047857' : '#34d399'}
 />
 </svg>
 </div>
 <div className="min-w-0">
 <div className="text-xs font-bold truncate">{part.name}</div>
 <div className="text-[10px] text-stone-400">
 輪郭 {part.contours?.length ?? 0}個
 </div>
 </div>
 </div>

 <div className="flex items-center space-x-1">
 <button
 onClick={(e) => {
 e.stopPropagation();
 handleDuplicatePart(part);
 }}
 className="p-2 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 min-h-[44px] min-w-[44px] flex items-center justify-center"
 title="複製"
 >
 <Copy className="w-4 h-4" />
 </button>
 <button
 onClick={(e) => {
 e.stopPropagation();
 handleDeletePart(part.id);
 }}
 className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 min-h-[44px] min-w-[44px] flex items-center justify-center"
 title="削除"
 >
 <Trash2 className="w-4 h-4" />
 </button>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 )}

 {mobileSheetTab === 'transform' && (
 <div className="space-y-4 pb-8">
 <div className="text-xs font-bold text-stone-600 dark:text-stone-400">
 選択パーツの変形・配置調整
 </div>

 {activePart ? (
 <div className="space-y-3">
 {/* Scale */}
 <div className="p-3 rounded-xl border bg-stone-50 dark:bg-[#16221a] border-stone-200 dark:border-stone-800 space-y-1.5">
 <div className="flex justify-between text-xs font-bold">
 <span>拡大縮小 (Scale)</span>
 <span className="font-mono text-emerald-600">100%</span>
 </div>
 <div className="grid grid-cols-4 gap-2">
 {[0.7, 0.85, 1.15, 1.3].map((sc) => (
 <button
 key={`scale_btn_${sc}`}
 onClick={() => {
 const scaled = scaleContours(activePart.contours, sc, sc);
 commitPartChange(scaled);
 }}
 className="py-2 rounded-lg text-xs font-bold bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 active:scale-95 transition-all min-h-[44px]"
 >
 {sc > 1 ? `+${Math.round((sc - 1) * 100)}%` : `-${Math.round((1 - sc) * 100)}%`}
 </button>
 ))}
 </div>
 </div>

 {/* Rotate & Slant */}
 <div className="p-3 rounded-xl border bg-stone-50 dark:bg-[#16221a] border-stone-200 dark:border-stone-800 space-y-1.5">
 <div className="text-xs font-bold">回転・傾斜 (Rotate / Slant)</div>
 <div className="grid grid-cols-4 gap-2">
 <button
 onClick={() => {
 const firstContour = activePart.contours[0];
 if (!firstContour) return;
 const rotated = rotateSingleContour(firstContour, -15);
 commitPartChange(activePart.contours.map((c, i) => i === 0 ? rotated : c));
 }}
 className="py-2 rounded-lg text-xs font-bold bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 flex items-center justify-center space-x-1 active:scale-95 min-h-[44px]"
 >
 <RotateCcw className="w-3.5 h-3.5" />
 <span>-15°</span>
 </button>
 <button
 onClick={() => {
 const firstContour = activePart.contours[0];
 if (!firstContour) return;
 const rotated = rotateSingleContour(firstContour, 15);
 commitPartChange(activePart.contours.map((c, i) => i === 0 ? rotated : c));
 }}
 className="py-2 rounded-lg text-xs font-bold bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 flex items-center justify-center space-x-1 active:scale-95 min-h-[44px]"
 >
 <RotateCw className="w-3.5 h-3.5" />
 <span>+15°</span>
 </button>
 <button
 onClick={() => {
 const slanted = slantContours(activePart.contours, -0.2);
 commitPartChange(slanted);
 }}
 className="py-2 rounded-lg text-xs font-bold bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 flex items-center justify-center space-x-1 active:scale-95 min-h-[44px]"
 >
 <Italic className="w-3.5 h-3.5" />
 <span>左斜</span>
 </button>
 <button
 onClick={() => {
 const slanted = slantContours(activePart.contours, 0.2);
 commitPartChange(slanted);
 }}
 className="py-2 rounded-lg text-xs font-bold bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 flex items-center justify-center space-x-1 active:scale-95 min-h-[44px]"
 >
 <Italic className="w-3.5 h-3.5" />
 <span>右斜</span>
 </button>
 </div>
 </div>

 {/* Mirror / Flip */}
 <div className="p-3 rounded-xl border bg-stone-50 dark:bg-[#16221a] border-stone-200 dark:border-stone-800 space-y-1.5">
 <div className="text-xs font-bold">反転・配置 (Flip / Center)</div>
 <div className="grid grid-cols-3 gap-2">
 <button
 onClick={() => {
 const flipped = flipContoursHorizontal(activePart.contours);
 commitPartChange(flipped);
 }}
 className="py-2 rounded-lg text-xs font-bold bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 flex items-center justify-center space-x-1 active:scale-95 min-h-[44px]"
 >
 <FlipHorizontal className="w-3.5 h-3.5" />
 <span>左右反転</span>
 </button>
 <button
 onClick={() => {
 const flipped = flipContoursVertical(activePart.contours);
 commitPartChange(flipped);
 }}
 className="py-2 rounded-lg text-xs font-bold bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 flex items-center justify-center space-x-1 active:scale-95 min-h-[44px]"
 >
 <FlipVertical className="w-3.5 h-3.5" />
 <span>上下反転</span>
 </button>
 <button
 onClick={handleCenterPartInCanvas}
 className="py-2 rounded-lg text-xs font-bold bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 flex items-center justify-center space-x-1 active:scale-95 min-h-[44px]"
 >
 <Maximize2 className="w-3.5 h-3.5" />
 <span>中央揃え</span>
 </button>
 </div>
 </div>
 </div>
 ) : (
 <div className="text-stone-400 text-xs text-center py-6">
 パーツを選択してください
 </div>
 )}
 </div>
 )}

 {mobileSheetTab === 'compose' && (
 <div className="space-y-3 pb-8">
 <div className="text-xs font-bold text-stone-600 dark:text-stone-400">
 現在の文字「{selectedChar}」へ部首を適用
 </div>

 <div className="grid grid-cols-3 gap-2">
 {(
 [
 { id: 'hen' as RadicalPlacement, label: '偏 (へん / 左側)' },
 { id: 'tsukuri' as RadicalPlacement, label: '旁 (つくり / 右側)' },
 { id: 'kanmuri' as RadicalPlacement, label: '冠 (かんむり / 上部)' },
 { id: 'ashi' as RadicalPlacement, label: '脚 (あし / 下部)' },
 { id: 'kamae' as RadicalPlacement, label: '構 (かまえ / 外枠)' },
 { id: 'original' as RadicalPlacement, label: '全体 (等倍配置)' },
 ] as const
 ).map((plc) => (
 <button
 key={`m_plc_${plc.id}`}
 onClick={() => handleQuickInsertPlacement(plc.id)}
 disabled={!activePart || (activePart.contours?.length ?? 0) === 0}
 className="p-2.5 rounded-xl border bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 flex flex-col items-center justify-center gap-1 active:scale-95 disabled:opacity-40 min-h-[54px]"
 >
 <span className="text-sm font-bold">{plc.label.split(' ')[0]}</span>
 <span className="text-[10px] text-stone-400">{plc.label.split(' ')[1]}</span>
 </button>
 ))}
 </div>

 <button
 onClick={() => handleQuickInsertPlacement('original', true)}
 disabled={!activePart || (activePart.contours?.length ?? 0) === 0}
 className="w-full py-3 rounded-xl font-bold text-sm bg-emerald-700 hover:bg-emerald-800 text-white flex items-center justify-center space-x-2 shadow-lg shadow-emerald-950/20 active:scale-98 min-h-[48px]"
 >
 <Check className="w-4 h-4" />
 <span>「{selectedChar}」にパーツを保存・反映</span>
 </button>
 </div>
 )}
 </div>
 )}
 </div>
  );
};
