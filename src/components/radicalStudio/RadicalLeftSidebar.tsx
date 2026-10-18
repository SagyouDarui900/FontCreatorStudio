import React, { useMemo } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  Shapes,
  BookOpen,
  FolderOpen,
  Search,
  Download,
  Plus,
  Scissors,
  Copy,
  Trash2,
  Database,
  ChevronDown,
  RefreshCw,
  ShieldCheck,
  PenTool,
  BookmarkPlus,
  ArrowRight,
} from 'lucide-react';
import { CustomPart, PartCategory, PathContour, FontProject, RadicalPlacement } from '../../types';
import { StudioRadicalPresetItem, CATEGORY_TABS, STUDIO_RADICAL_PRESETS } from './types';
import { RADICAL_FONT_OPTIONS, FontStyleOption } from '../../utils/radicalExtractor';
import {
  searchRadicalDatabase,
  KANJI_RADICAL_CATEGORIES,
  RadicalEntry,
} from '../../data/kanjiRadicalDatabase';

export interface RadicalLeftSidebarProps {
  isLeftSidebarOpen: boolean;
  setIsLeftSidebarOpen: (open: boolean) => void;
  leftSidebarTab: 'presets' | 'kanji_db' | 'custom';
  setLeftSidebarTab: (tab: 'presets' | 'kanji_db' | 'custom') => void;
  isLight: boolean;
  parts: CustomPart[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeCategory: PartCategory;
  setActiveCategory: (cat: PartCategory) => void;
  selectedFontStyle: FontStyleOption;
  setSelectedFontStyle: (style: FontStyleOption) => void;
  onUpgradeDefaultParts: (style: FontStyleOption) => void;
  onImportDefaultRadicals: () => void;
  onOpenBundledFontsModal: () => void;
  kanjiDbSearch: string;
  setKanjiDbSearch: (search: string) => void;
  kanjiDbCategory: string;
  setKanjiDbCategory: (cat: string) => void;
  selectedRadicalDbId: string;
  setSelectedRadicalDbId: React.Dispatch<React.SetStateAction<string>>;
  watermarkChar: string;
  onSetWatermarkChar: (char: string) => void;
  selectedChar: string;
  project: FontProject;
  onBatchInsertRadicalEntry: (radical: RadicalEntry) => void;
  onLoadPreset: (preset: StudioRadicalPresetItem) => void | Promise<void>;
  onInsertPresetDirectly: (preset: StudioRadicalPresetItem, placement?: RadicalPlacement, isBackground?: boolean) => void | Promise<void>;
  insertPlacement: RadicalPlacement;
  activePart: CustomPart | null;
  selectedPartId: string;
  setSelectedPartId: (id: string) => void;
  onCreateNewPart: (category?: PartCategory) => void;
  onExtractFromCurrentGlyph: () => void;
  onOpenExtractModal: () => void;
  onDuplicatePart: (part: CustomPart, e: React.MouseEvent) => void;
  onDeletePart: (id: string, e: React.MouseEvent) => void;
  contoursToSvgPath: (contours: PathContour[]) => string;
  setShowWatermark: (show: boolean) => void;
  notify: (text: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  isLoadingPreset: boolean;
  isImportingAll: boolean;
}

export const RadicalLeftSidebar: React.FC<RadicalLeftSidebarProps> = ({
  isLeftSidebarOpen,
  setIsLeftSidebarOpen,
  leftSidebarTab,
  setLeftSidebarTab,
  isLight,
  parts,
  searchQuery,
  setSearchQuery,
  activeCategory,
  setActiveCategory,
  selectedFontStyle,
  setSelectedFontStyle,
  onUpgradeDefaultParts,
  onImportDefaultRadicals,
  onOpenBundledFontsModal,
  kanjiDbSearch,
  setKanjiDbSearch,
  kanjiDbCategory,
  setKanjiDbCategory,
  selectedRadicalDbId,
  setSelectedRadicalDbId,
  watermarkChar,
  onSetWatermarkChar,
  selectedChar,
  project,
  onBatchInsertRadicalEntry,
  onLoadPreset,
  onInsertPresetDirectly,
  insertPlacement,
  activePart,
  selectedPartId,
  setSelectedPartId,
  onCreateNewPart,
  onExtractFromCurrentGlyph,
  onOpenExtractModal,
  onDuplicatePart,
  onDeletePart,
  contoursToSvgPath,
  setShowWatermark,
  notify,
  isLoadingPreset,
  isImportingAll,
}) => {
  const filteredParts = useMemo(() => {
    return parts.filter((part) => {
      const matchesCat = activeCategory === 'all' || part.category === activeCategory;
      const matchesSearch =
        searchQuery.trim() === '' ||
        part.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (part.description && part.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCat && matchesSearch;
    });
  }, [parts, activeCategory, searchQuery]);

  const filteredPresets = useMemo(() => {
    return STUDIO_RADICAL_PRESETS.filter((radical) => {
      const matchesCat = activeCategory === 'all' || radical.category === activeCategory;
      const matchesSearch =
        searchQuery.trim() === '' ||
        radical.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (radical.char && radical.char.includes(searchQuery.trim())) ||
        (radical.description && radical.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCat && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  return (
    <>
              {!isLeftSidebarOpen ? (
          <div
            className={`hidden md:flex w-9 sm:w-10 border-r flex-col items-center py-2.5 shrink-0 cursor-pointer select-none transition-colors group ${
              isLight
                ? 'bg-stone-50/80 border-stone-200/80 hover:bg-emerald-50/80 text-stone-600'
                : 'bg-[#131d16] border-[#223326] hover:bg-[#1a2820] text-emerald-300'
            }`}
            onClick={() => setIsLeftSidebarOpen(true)}
            title="部首・パーツライブラリを展開 (クリックで開く)"
          >
            <button
              type="button"
              className="p-1.5 rounded-md hover:bg-emerald-100 dark:hover:bg-[#25382b] text-emerald-700 dark:text-emerald-400 transition-colors shadow-2xs"
              title="ライブラリを展開"
            >
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <div className="mt-5 flex flex-col items-center space-y-2">
              <Shapes className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-[10px] font-bold [writing-mode:vertical-rl] tracking-wider opacity-85">
                {leftSidebarTab === 'presets'
                  ? `標準部首 (${filteredPresets.length})`
                  : leftSidebarTab === 'kanji_db'
                  ? '部首別漢字'
                  : `マイパーツ (${parts.length})`}
              </span>
            </div>
          </div>
        ) : (
          <div
            className={`hidden md:flex static inset-y-0 left-0 w-64 xl:w-72 border-r flex-col shrink-0 min-h-0 relative overflow-hidden transition-all ${
              isLight ? 'bg-white border-stone-200/60' : 'bg-[#162119] border-stone-800/60'
            }`}
          >
            {/* Left Column Header with collapse button */}
 <div
 className={`p-2 px-3 border-b flex items-center justify-between shrink-0 ${
 isLight ? 'bg-stone-50/80 border-stone-200/60' : 'bg-[#131d16] border-stone-800/60'
 }`}
 >
 <div className="flex items-center space-x-1.5">
 <Shapes className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
 <span className="text-xs font-bold">部首・パーツライブラリ</span>
 </div>
 <button
 type="button"
 onClick={() => setIsLeftSidebarOpen(false)}
 className="p-1 rounded text-stone-400 hover:text-stone-700 dark:hover:text-emerald-200"
 title="サイドバーを畳んでキャンバスを最大化"
 >
 <ChevronLeft className="w-4 h-4" />
 </button>
 </div>

 {/* Main Triple-Tab Switcher: Presets vs Kanji Database vs My Custom Parts */}
 <div className="p-1 border-b bg-stone-50/50 dark:bg-[#111913] shrink-0 border-stone-200/60 dark:border-stone-800/60">
 <div className="grid grid-cols-3 gap-0.5 p-0.5 rounded-md bg-stone-200/70 dark:bg-[#1b261f]">
 <button
 type="button"
 onClick={() => setLeftSidebarTab('presets')}
 className={`py-1.5 px-1 rounded-md text-[11px] font-bold flex items-center justify-center space-x-1 transition-all ${
 leftSidebarTab === 'presets'
 ? isLight
 ? 'bg-white text-emerald-950 ring-1 ring-emerald-700/20'
 : 'bg-[#25362b] text-emerald-200 ring-1 ring-emerald-400/20'
 : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
 }`}
 >
 <Shapes className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
 <span className="truncate">標準部首</span>
 </button>

 <button
 type="button"
 onClick={() => setLeftSidebarTab('kanji_db')}
 className={`py-1.5 px-1 rounded-md text-[11px] font-bold flex items-center justify-center space-x-1 transition-all ${
 leftSidebarTab === 'kanji_db'
 ? isLight
 ? 'bg-white text-emerald-950 ring-1 ring-emerald-700/20'
 : 'bg-[#25362b] text-emerald-200 ring-1 ring-emerald-400/20'
 : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
 }`}
 title="部首に紐づく常用・JIS漢字一覧データベース"
 >
 <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
 <span className="truncate">部首別漢字</span>
 </button>

 <button
 type="button"
 onClick={() => setLeftSidebarTab('custom')}
 className={`py-1.5 px-1 rounded-md text-[11px] font-bold flex items-center justify-center space-x-1 transition-all ${
 leftSidebarTab === 'custom'
 ? isLight
 ? 'bg-white text-emerald-950 ring-1 ring-emerald-700/20'
 : 'bg-[#25362b] text-emerald-200 ring-1 ring-emerald-400/20'
 : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
 }`}
 >
 <Shapes className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
 <span className="truncate">マイパーツ</span>
 </button>
 </div>
 </div>

 {/* Top Action Controls for current tab */}
 <div className="p-2 border-b space-y-1.5 shrink-0 border-inherit">
 {leftSidebarTab === 'custom' ? (
 <div className="space-y-1.5">
 <div className="grid grid-cols-2 gap-1">
 <button
 onClick={() => onCreateNewPart(activeCategory)}
 className={`py-1.5 px-2 rounded-md font-bold text-xs flex items-center justify-center space-x-1 transition-all ${
 isLight
 ? 'bg-emerald-800 text-white hover:bg-emerald-900'
 : 'bg-emerald-600 text-white hover:bg-emerald-500'
 }`}
 >
 <Plus className="w-3.5 h-3.5" />
 <span>新規パーツ</span>
 </button>
 <button
 onClick={onExtractFromCurrentGlyph}
 className={`py-1.5 px-2 rounded-md font-bold text-[11px] flex items-center justify-center space-x-1 border transition-all ${
 isLight
 ? 'bg-emerald-50/80 border-emerald-300 text-emerald-900 hover:bg-emerald-100'
 : 'bg-[#1e2d23] border-emerald-800 text-emerald-300 hover:bg-[#273a2e]'
 }`}
 title={`現在編集中文字「${selectedChar}」の輪郭をパーツとして取り込みます`}
 >
 <Scissors className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
 <span>「{selectedChar}」取込</span>
 </button>
 </div>

 <div className="grid grid-cols-2 gap-1">
 <button
 onClick={() => onOpenExtractModal()}
 className={`py-1 px-2 rounded-md text-[11px] font-semibold flex items-center justify-center space-x-1 border transition-all ${
 isLight
 ? 'bg-white border-[#d8e6df] text-stone-700 hover:bg-emerald-50'
 : 'bg-[#18261e] border-[#25362b] text-stone-300 hover:bg-[#203227]'
 }`}
 >
 <FolderOpen className="w-3 h-3 text-stone-500" />
 <span>全文字から抽出</span>
 </button>
 <button
 onClick={() => onUpgradeDefaultParts(selectedFontStyle)}
 className={`py-1 px-2 rounded-md text-[11px] font-semibold flex items-center justify-center space-x-1 border transition-all ${
 isLight
 ? 'bg-emerald-50 border-emerald-300 text-emerald-900 hover:bg-emerald-100'
 : 'bg-[#1b2f21] border-emerald-700 text-emerald-300 hover:bg-[#233f2c]'
 }`}
 title="初期部首パーツを高精度ベクターに刷新・更新します"
 >
 <RefreshCw className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
 <span>初期部首を高品質化</span>
 </button>
 </div>
 </div>
 ) : leftSidebarTab === 'kanji_db' ? (
 <div className="space-y-1.5">
 <div className="flex items-center justify-between text-[11px]">
 <span className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center space-x-1">
 <Database className="w-3.5 h-3.5 text-emerald-600" />
 <span>部首別 漢字データベース</span>
 </span>
 <button
 type="button"
 onClick={() => {
 onSetWatermarkChar(selectedChar);
 setShowWatermark(true);
 notify(`下絵ガイドを「${selectedChar}」にリセットしました`, 'info');
 }}
 className="text-[10.5px] text-emerald-700 dark:text-emerald-400 hover:underline"
 title="下絵を現在編集中文字に戻す"
 >
 下絵「{selectedChar}」に戻す
 </button>
 </div>

 {/* Search Bar for Kanji DB */}
 <div className="relative">
 <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-stone-400" />
 <input
 type="text"
 placeholder="部首名・読み・漢字で検索 (例: さんずい, 海, 艹)..."
 value={kanjiDbSearch}
 onChange={(e) => setKanjiDbSearch(e.target.value)}
 className={`w-full pl-8 pr-3 py-1.5 rounded-md text-xs border outline-hidden transition-colors ${
 isLight
 ? 'bg-[#f7faf8] border-[#c8ded3] focus:border-emerald-700'
 : 'bg-[#101712] border-[#25362b] focus:border-emerald-500 text-emerald-100'
 }`}
 />
 </div>
 </div>
 ) : (
 <div className="space-y-1.5">
 <div className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center justify-between">
 <div className="flex items-center space-x-1.5">
 <span className="font-semibold">フォントスタイル選択</span>
 <button
 type="button"
 onClick={() => onOpenBundledFontsModal()}
 className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
 >
 <ShieldCheck className="w-3 h-3" />
 <span>OFL</span>
 </button>
 </div>
 <button
 onClick={onImportDefaultRadicals}
 disabled={isImportingAll}
 className="text-emerald-700 dark:text-emerald-400 font-bold hover:underline text-[11px] disabled:opacity-50 flex items-center space-x-1"
 >
 <Download className="w-3 h-3" />
 <span>{isImportingAll ? '取込中…' : '全部首を一括取込'}</span>
 </button>
 </div>

 {/* Font Style Selector Pills */}
 <div className="grid grid-cols-3 gap-1 p-0.5 rounded-lg border text-center text-xs font-semibold bg-stone-100/70 dark:bg-[#101712] border-stone-200 dark:border-[#25362b]">
 {RADICAL_FONT_OPTIONS.map((style) => (
 <button
 key={style.id}
 onClick={() => setSelectedFontStyle(style)}
 className={`py-1 px-1.5 rounded-md transition-all text-[11px] flex items-center justify-center space-x-1 ${
 selectedFontStyle.id === style.id
 ? isLight
 ? 'bg-white text-emerald-900 font-bold'
 : 'bg-[#1e2d22] text-emerald-300 font-bold'
 : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
 }`}
 >
 <span style={{ fontFamily: style.fontFamily }}>{style.label}</span>
 </button>
 ))}
 </div>
 </div>
 )}

 {/* Search Bar for presets or custom parts */}
 {leftSidebarTab !== 'kanji_db' && (
 <div className="relative">
 <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-stone-400" />
 <input
 type="text"
 placeholder={leftSidebarTab === 'presets' ? '部首名・文字で検索（例: さんずい, 木, 艹）...' : 'パーツ名で検索...'}
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className={`w-full pl-8 pr-3 py-1.5 rounded-md text-xs border outline-hidden transition-colors ${
 isLight
 ? 'bg-[#f7faf8] border-[#c8ded3] focus:border-emerald-700'
 : 'bg-[#101712] border-[#25362b] focus:border-emerald-500 text-emerald-100'
 }`}
 />
 </div>
 )}
 </div>

 {/* Category Filter Pills */}
 <div
 className={`p-1 border-b flex space-x-1 overflow-x-auto custom-scrollbar touch-scroll-x min-w-0 text-[11px] shrink-0 ${
 isLight ? 'bg-[#f4f8f5] border-[#d8e6df]' : 'bg-[#131d16] border-[#25362b]'
 }`}
 >
 {leftSidebarTab === 'kanji_db'
 ? KANJI_RADICAL_CATEGORIES.map((cat) => (
 <button
 key={cat.id}
 onClick={() => setKanjiDbCategory(cat.id)}
 className={`px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 text-[10px] transition-colors ${
 kanjiDbCategory === cat.id
 ? isLight
 ? 'bg-emerald-800 text-white font-bold'
 : 'bg-emerald-600 text-white font-bold'
 : isLight
 ? 'bg-white text-stone-700 hover:bg-emerald-100'
 : 'bg-[#1b261f] text-stone-300 hover:bg-[#25362b]'
 }`}
 >
 {cat.label}
 </button>
 ))
 : CATEGORY_TABS.map((cat) => {
 const count = leftSidebarTab === 'presets'
 ? cat.id === 'all'
 ? STUDIO_RADICAL_PRESETS.length
 : STUDIO_RADICAL_PRESETS.filter((p) => p.category === cat.id).length
 : cat.id === 'all'
 ? parts.length
 : parts.filter((p) => p.category === cat.id).length;
 return (
 <button
 key={cat.id}
 onClick={() => setActiveCategory(cat.id)}
 className={`px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 text-[10px] transition-colors flex items-center space-x-1 ${
 activeCategory === cat.id
 ? isLight
 ? 'bg-emerald-800 text-white font-bold'
 : 'bg-emerald-600 text-white font-bold'
 : isLight
 ? 'bg-white text-stone-700 hover:bg-emerald-100'
 : 'bg-[#1b261f] text-stone-300 hover:bg-[#25362b]'
 }`}
 >
 <span>{cat.label}</span>
 <span
 className={`px-1 rounded-full text-[9px] font-mono ${
 activeCategory === cat.id
 ? 'bg-white/20 text-white'
 : isLight
 ? 'bg-stone-100 text-stone-600'
 : 'bg-[#25362b] text-emerald-300'
 }`}
 >
 {count}
 </span>
 </button>
 );
 })}
 </div>

 {/* Main List Area */}
 <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-1.5 space-y-1">
 {leftSidebarTab === 'kanji_db' ? (
 /* ================= KANJI RADICAL DATABASE VIEW ================= */
 (() => {
 const dbResults = searchRadicalDatabase(kanjiDbSearch, kanjiDbCategory);
 if (dbResults.length === 0) {
 return (
 <div className="py-12 text-center text-xs text-stone-400 space-y-2">
 <BookOpen className="w-8 h-8 mx-auto opacity-40" />
 <p>該当する部首または漢字が見つかりません</p>
 <button
 onClick={() => {
 setKanjiDbCategory('all');
 setKanjiDbSearch('');
 }}
 className="text-emerald-700 dark:text-emerald-400 underline font-semibold text-[11px]"
 >
 検索条件をリセット
 </button>
 </div>
 );
 }

 return (
 <div className="space-y-3">
 <div className="text-[10.5px] text-stone-500 dark:text-stone-400 px-1">
 部首をクリックで展開し、漢字をクリックでキャンバスの下絵ガイドに設定できます
 </div>

 {dbResults.map((radical) => {
 const isExpanded = selectedRadicalDbId === radical.id;
 return (
 <div
 key={radical.id}
 className={`rounded-xl border transition-all overflow-hidden ${
 isExpanded
 ? isLight
 ? 'bg-white border-emerald-600 ring-1 ring-emerald-600/30'
 : 'bg-[#16241b] border-emerald-500 ring-1 ring-emerald-500/30'
 : isLight
 ? 'bg-stone-50/60 border-stone-200 hover:border-emerald-300'
 : 'bg-[#121c15] border-[#223326] hover:border-emerald-700'
 }`}
 >
 {/* Radical Header Item */}
 <div
 onClick={() => setSelectedRadicalDbId(isExpanded ? '' : radical.id)}
 className="p-2.5 flex items-center justify-between cursor-pointer select-none"
 >
 <div className="flex items-center space-x-2.5 min-w-0">
 <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-700 text-white font-bold text-base shrink-0 font-serif">
 {radical.char}
 </span>
 <div className="min-w-0">
 <div className="flex items-center space-x-1.5">
 <span className="text-xs font-bold truncate text-stone-900 dark:text-emerald-100">
 {radical.name}
 </span>
 <span className="text-[9px] px-1.5 py-0.2 rounded font-medium bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-300 shrink-0">
 {radical.strokes}画
 </span>
 </div>
 <div className="text-[10px] text-stone-500 dark:text-stone-400 truncate">
 {radical.description}
 </div>
 </div>
 </div>

 <div className="flex items-center space-x-1 shrink-0 ml-2">
 <span className="text-[10px] font-bold font-mono text-stone-500 dark:text-stone-400">
 {radical.kanjiList.length}字
 </span>
 <ChevronDown
 className={`w-3.5 h-3.5 text-stone-400 transition-transform duration-200 ${
 isExpanded ? 'rotate-180 text-emerald-600' : ''
 }`}
 />
 </div>
 </div>

 {/* Expanded Kanji Grid & Action Controls */}
 {isExpanded && (
 <div className={`p-2.5 pt-0 border-t space-y-2 ${isLight ? 'border-stone-100' : 'border-[#223326]'}`}>
 <div className="pt-2 flex items-center justify-between text-[10.5px]">
 <span className="font-semibold text-stone-600 dark:text-stone-300">
 収録漢字 ({radical.kanjiList.length}字):
 </span>
 {/* Load this radical into studio canvas for editing */}
 <button
 onClick={() => {
 const preset = STUDIO_RADICAL_PRESETS.find(
 (p) => p.char === radical.char || p.id === radical.id
 );
 if (preset) {
 onLoadPreset(preset);
 } else {
 onCreateNewPart(
 radical.category === 'basic' ? 'other' : (radical.category as PartCategory)
 );
 }
 }}
 className="text-stone-600 dark:text-stone-300 hover:text-emerald-700 dark:hover:text-emerald-400 font-bold hover:underline flex items-center space-x-1"
 title="この部首をキャンバスに読み込んで作図編集"
 >
 <PenTool className="w-3 h-3" />
 <span>部首作字編集</span>
 </button>
 </div>

 {/* Primary 1-Click Batch Insert Action Button */}
 <button
 onClick={() => onBatchInsertRadicalEntry(radical)}
 className={`w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all ${
 isLight
 ? 'bg-emerald-800 hover:bg-emerald-900 text-white active:scale-[0.99]'
 : 'bg-emerald-700 hover:bg-emerald-600 text-white active:scale-[0.99]'
 }`}
 title={`部首「${radical.name}」をこの部首の漢字 ${radical.kanjiList.length} 文字すべてに一括配置（既存文字は輪郭を追加合成）`}
 >
 <BookmarkPlus className="w-3.5 h-3.5" />
 <span>全 {radical.kanjiList.length} 文字に部首を一括配置</span>
 </button>

 {/* Kanji Character Buttons Grid */}
 <div className="grid grid-cols-5 sm:grid-cols-6 gap-1.5 max-h-48 overflow-y-auto p-1 rounded-lg border bg-white dark:bg-[#0c140f] border-stone-200 dark:border-stone-800">
 {radical.kanjiList.map((kanji, kIdx) => {
 const isWatermark = watermarkChar === kanji;
 const hasProjectGlyph =
 project.glyphs && project.glyphs[kanji.codePointAt(0) || 0] !== undefined;

 return (
 <button
 key={`${radical.id}_${kanji}_${kIdx}`}
 onClick={() => {
 onSetWatermarkChar(kanji);
 setShowWatermark(true);
 notify(`漢字「${kanji}」を下絵ガイドに設定しました`, 'info');
 }}
 className={`relative p-1.5 rounded-md text-base font-serif font-bold transition-all flex flex-col items-center justify-center group/k ${
 isWatermark
 ? 'bg-emerald-700 text-white scale-105 ring-2 ring-emerald-500'
 : isLight
 ? 'bg-stone-50 hover:bg-emerald-100 text-stone-800 border border-stone-200 hover:border-emerald-400'
 : 'bg-[#152018] hover:bg-[#203628] text-emerald-100 border border-[#25382b] hover:border-emerald-500'
 }`}
 title={`「${kanji}」を下絵ガイドに設定 (U+${(kanji.codePointAt(0) || 0).toString(16).toUpperCase()})`}
 >
 <span>{kanji}</span>
 {hasProjectGlyph && (
 <span
 className="w-1.5 h-1.5 rounded-full bg-emerald-400 absolute top-0.5 right-0.5"
 title="作成済みグリフ"
 />
 )}
 </button>
 );
 })}
 </div>
 </div>
 )}
 </div>
 );
 })}
 </div>
 );
 })()
 ) : leftSidebarTab === 'presets' ? (
 /* ================= RADICAL PRESETS VIEW ================= */
 filteredPresets.length === 0 ? (
 <div className="py-12 text-center text-xs text-stone-400 space-y-2">
 <Search className="w-8 h-8 mx-auto opacity-40" />
 <p>該当する部首プリセットがありません</p>
 <button
 onClick={() => {
 setActiveCategory('all');
 setSearchQuery('');
 }}
 className="text-emerald-700 dark:text-emerald-400 underline font-semibold text-[11px]"
 >
 フィルターをリセット
 </button>
 </div>
 ) : (
 filteredPresets.map((radical) => {
 const isLoadedInCanvas =
 activePart?.name === radical.name ||
 activePart?.name === `${radical.name} (${selectedFontStyle.label})`;

 return (
 <div
 key={radical.id || radical.name}
 className={`p-2 rounded-lg border flex items-center space-x-2.5 transition-all ${
 isLoadedInCanvas
 ? isLight
 ? 'bg-emerald-50/90 border-emerald-600 ring-1 ring-emerald-600/30'
 : 'bg-[#1e2d22] border-emerald-500 ring-1 ring-emerald-500/30'
 : isLight
 ? 'bg-white border-[#d8e6df] hover:border-emerald-600 hover:bg-[#fbfdfc]'
 : 'bg-[#18231c] border-[#25362b] hover:border-emerald-600 hover:bg-[#202e25]'
 }`}
 >
 {/* High-fidelity Typographic Thumbnail Preview */}
 <div
 onClick={() => onLoadPreset(radical)}
 className={`w-12 h-12 rounded-md border shrink-0 flex items-center justify-center cursor-pointer transition-transform hover:scale-105 ${
 isLoadedInCanvas
 ? isLight
 ? 'bg-emerald-100 border-emerald-500'
 : 'bg-[#1a3324] border-emerald-600'
 : isLight
 ? 'bg-white border-stone-200 hover:border-emerald-400'
 : 'bg-[#111c14] border-[#2a3c30] hover:border-emerald-600'
 }`}
 title={`クリックして「${radical.name}」を高精度ベクターとして読み込む`}
 >
 <span
 className="text-2xl leading-none select-none flex items-center justify-center font-normal"
 style={{
 fontFamily: selectedFontStyle.fontFamily,
 fontWeight: selectedFontStyle.fontWeight,
 color: isLoadedInCanvas
 ? (isLight ? '#064e3b' : '#34d399')
 : (isLight ? '#1f2937' : '#f0fdf4'),
 }}
 >
 {radical.char}
 </span>
 </div>

 {/* Info */}
 <div className="flex-1 min-w-0">
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold truncate">
 {radical.name}
 <span className="font-normal text-[10px] text-stone-400 ml-1">({radical.char})</span>
 </span>
 <span
 className={`text-[9px] px-1.5 py-0.2 rounded font-medium shrink-0 ml-1 ${
 isLight
 ? 'bg-stone-100 text-stone-600'
 : 'bg-[#25362b] text-emerald-300'
 }`}
 >
 {CATEGORY_TABS.find((c) => c.id === radical.category)?.label.split(' ')[0] || radical.category}
 </span>
 </div>
 <div className="text-[10px] text-stone-400 mt-0.5 truncate" title={radical.description}>
 {radical.description}
 </div>

 {/* Action Buttons: Edit / Insert Directly */}
 <div className="mt-1.5 flex items-center space-x-1.5">
 <button
 onClick={() => onLoadPreset(radical)}
 disabled={isLoadingPreset}
 className={`flex-1 py-1 px-1.5 rounded text-[10.5px] font-bold flex items-center justify-center space-x-1 transition-all ${
 isLoadedInCanvas
 ? isLight
 ? 'bg-emerald-700 text-white'
 : 'bg-emerald-600 text-white'
 : isLight
 ? 'bg-emerald-100/80 text-emerald-950 hover:bg-emerald-200'
 : 'bg-[#203427] text-emerald-200 hover:bg-[#2a4533]'
 }`}
 >
 <PenTool className="w-3 h-3" />
 <span>{isLoadedInCanvas ? '編集中' : '工房で編集'}</span>
 </button>
 <button
 onClick={() => onInsertPresetDirectly(radical, insertPlacement, false)}
 className={`py-1 px-2 rounded text-[10.5px] font-bold flex items-center justify-center space-x-1 transition-all ${
 isLight
 ? 'bg-stone-100 hover:bg-emerald-600 hover:text-white text-stone-800 border border-stone-200'
 : 'bg-[#18261e] hover:bg-emerald-500 hover:text-stone-950 text-emerald-200 border border-[#25362b]'
 }`}
 title={`現在の文字「${selectedChar}」に高精度ベクターを挿入`}
 >
 <ArrowRight className="w-3 h-3" />
 <span>「{selectedChar}」へ挿入</span>
 </button>
 </div>
 </div>
 </div>
 );
 })
 )
 ) : (
 /* ================= MY CUSTOM PARTS VIEW ================= */
 filteredParts.length === 0 ? (
 <div className="py-12 text-center text-xs text-stone-400 space-y-2">
 <Shapes className="w-8 h-8 mx-auto opacity-40" />
 <p>該当するパーツがありません</p>
 <button
 onClick={() => onCreateNewPart(activeCategory)}
 className="text-emerald-700 dark:text-emerald-400 underline font-semibold text-[11px]"
 >
 このカテゴリで新規作成
 </button>
 </div>
 ) : (
 filteredParts.map((part) => {
 const isSelected = activePart?.id === part.id;
 const svgPath = contoursToSvgPath(part.contours);

 return (
 <div
 key={part.id}
 onClick={() => setSelectedPartId(part.id)}
 className={`group p-2 rounded-lg border flex items-center space-x-2.5 cursor-pointer transition-all ${
 isSelected
 ? isLight
 ? 'bg-emerald-50 border-emerald-700 ring-1 ring-emerald-700/30'
 : 'bg-[#1e2d22] border-emerald-500 ring-1 ring-emerald-500/30'
 : isLight
 ? 'bg-white border-[#d8e6df] hover:border-emerald-600 hover:bg-[#fbfdfc]'
 : 'bg-[#18231c] border-[#25362b] hover:border-emerald-600 hover:bg-[#202e25]'
 }`}
 >
 {/* SVG Thumbnail Preview */}
 <div
 className={`w-12 h-12 rounded-md border shrink-0 flex items-center justify-center p-0.5 ${
 isLight ? 'bg-white border-stone-200' : 'bg-[#0f1711] border-[#2a3c30]'
 }`}
 >
 {part.contours && part.contours.length > 0 ? (
 <svg viewBox="0 0 1000 1000" className="w-full h-full">
 <path
 d={svgPath}
 fill={isSelected ? (isLight ? '#064e3b' : '#34d399') : isLight ? '#1f2937' : '#ecfdf5'}
 />
 </svg>
 ) : (
 <span className="text-[9px] text-stone-400 italic">空白</span>
 )}
 </div>

 {/* Part Name & Meta */}
 <div className="flex-1 min-w-0">
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold truncate">{part.name}</span>
 {part.category && (
 <span
 className={`text-[9px] px-1.5 py-0.2 rounded font-medium ${
 isLight
 ? 'bg-stone-100 text-stone-600'
 : 'bg-[#25362b] text-emerald-300'
 }`}
 >
 {CATEGORY_TABS.find((c) => c.id === part.category)?.label.split(' ')[0] ||
 part.category}
 </span>
 )}
 </div>
 <div className="text-[10px] text-stone-400 mt-0.5 flex items-center justify-between">
 <span>輪郭: {part.contours?.length || 0}本</span>
 <span>
 {new Date(part.updatedAt || part.createdAt).toLocaleDateString('ja-JP', {
 month: 'numeric',
 day: 'numeric',
 })}
 </span>
 </div>
 </div>

 {/* Quick Actions (Duplicate / Delete) on hover */}
 <div className="flex flex-col space-y-1 opacity-0 group-hover:opacity-100 transition-opacity">
 <button
 onClick={(e) => onDuplicatePart(part, e)}
 className="p-1 rounded hover:bg-emerald-100 dark:hover:bg-[#2d4032] text-stone-500 dark:text-stone-300"
 title="パーツを複製"
 >
 <Copy className="w-3 h-3" />
 </button>
 <button
 onClick={(e) => onDeletePart(part.id, e)}
 className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-950/70 text-rose-500"
 title="パーツを削除"
 >
 <Trash2 className="w-3 h-3" />
 </button>
 </div>
 </div>
 );
 })
 )
 )}
 </div>
 </div>
 )}
    </>
  );
};
