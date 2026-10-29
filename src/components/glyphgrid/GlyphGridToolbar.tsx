import React from 'react';
import {
  Search,
  Plus,
  Sliders,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  X,
  Layers,
  Check,
  CheckCircle2,
  CircleDashed,
  Wand2,
  ArrowLeftRight,
  ShieldCheck,
} from 'lucide-react';
import { GridDensity } from './types';

export interface GlyphGridToolbarProps {
  charListLength: number;
  validPage: number;
  totalPages: number;
  effectiveIsOverlay: boolean;
  sidebarWidth: number;
  setSidebarWidth: (w: number) => void;
  gridDensity: GridDensity;
  setGridDensity: (d: GridDensity) => void;
  isSearchHeaderExpanded: boolean;
  setIsSearchHeaderExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  onClose: () => void;
  isLight: boolean;
  categoryDropdownRef: React.RefObject<HTMLDivElement | null>;
  isCategoryDropdownOpen: boolean;
  setIsCategoryDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
  activeCategoryDisplayName: string;
  categoryGroups: Array<{ groupName: string; items: Array<{ id: string; name: string; count: string }> }>;
  activeCategoryId: string;
  setActiveCategoryId: (id: string) => void;
  quickCategoryTabs: Array<{ id: string; label: string }>;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  handleAddCustomChar: (e: React.FormEvent) => void;
  customCharInput: string;
  setCustomCharInput: (val: string) => void;
  activeCategoryName: string;
  categoryStats: { completed: number; total: number; percent: number };
  isFilterExpanded: boolean;
  setIsFilterExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  statusFilter: 'all' | 'completed' | 'pending';
  setStatusFilter: (f: 'all' | 'completed' | 'pending') => void;
  rawCategoryListLength: number;
  onOpenGlyphSynthesisModal?: () => void;
  onOpenKerningModal?: () => void;
  onOpenQualityModal?: () => void;
}

export const GlyphGridToolbar: React.FC<GlyphGridToolbarProps> = React.memo(({
  charListLength,
  validPage,
  totalPages,
  effectiveIsOverlay,
  sidebarWidth,
  setSidebarWidth,
  gridDensity,
  setGridDensity,
  isSearchHeaderExpanded,
  setIsSearchHeaderExpanded,
  onClose,
  isLight,
  categoryDropdownRef,
  isCategoryDropdownOpen,
  setIsCategoryDropdownOpen,
  activeCategoryDisplayName,
  categoryGroups,
  activeCategoryId,
  setActiveCategoryId,
  quickCategoryTabs,
  searchQuery,
  setSearchQuery,
  setCurrentPage,
  handleAddCustomChar,
  customCharInput,
  setCustomCharInput,
  activeCategoryName,
  categoryStats,
  isFilterExpanded,
  setIsFilterExpanded,
  statusFilter,
  setStatusFilter,
  rawCategoryListLength,
  onOpenGlyphSynthesisModal,
  onOpenKerningModal,
  onOpenQualityModal,
}) => {
  return (
    <>
      {/* Header with Title, Count, Density Toggles and Close */}
      <div
        className={`p-2.5 sm:p-3 border-b flex flex-col space-y-2 shrink-0 ${
          isLight ? 'bg-stone-50 border-stone-200' : 'bg-[#141d17] border-stone-800'
        }`}
      >
        {/* Row 1: Title, Count, Density control, and Collapse button */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center space-x-1.5 min-w-0">
            <span
              className={`text-xs font-bold uppercase tracking-wider truncate ${
                isLight ? 'text-stone-900' : 'text-emerald-300'
              }`}
            >
              文字一覧
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 ${
                isLight
                  ? 'bg-stone-200 text-stone-800 font-mono'
                  : 'bg-stone-800 text-emerald-300 font-mono border border-stone-700'
              }`}
            >
              {charListLength.toLocaleString()}字
              {totalPages > 1 && (
                <span className="opacity-75 font-normal ml-1">
                  ({validPage}/{totalPages}頁)
                </span>
              )}
            </span>
          </div>

          {/* Density switch and close button */}
          <div className="flex items-center space-x-1 shrink-0">
            {/* Width Presets (狭: 250px, 標: 330px, 広: 440px) */}
            {!effectiveIsOverlay && (
              <div
                className={`hidden sm:flex items-center p-0.5 rounded border ${
                  isLight ? 'bg-white border-stone-200' : 'bg-[#101813] border-stone-800'
                }`}
                title="サイドバーの幅プリセット（右端を直接ドラッグして任意幅に微調整も可能）"
              >
                <button
                  onClick={() => {
                    setSidebarWidth(250);
                    try {
                      localStorage.setItem('fontforge_sidebar_width', '250');
                    } catch (error) {
                      console.warn('Failed to persist sidebar width:', error);
                    }
                  }}
                  title="幅: 狭め (250px) - キャンバス重視"
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                    sidebarWidth <= 270
                      ? isLight
                        ? 'bg-emerald-700 text-white'
                        : 'bg-emerald-500 text-stone-950 font-bold'
                      : isLight
                      ? 'text-stone-600 hover:text-emerald-800'
                      : 'text-emerald-400 hover:text-emerald-200'
                  }`}
                >
                  狭
                </button>
                <button
                  onClick={() => {
                    setSidebarWidth(330);
                    try {
                      localStorage.setItem('fontforge_sidebar_width', '330');
                    } catch (error) {
                      console.warn('Failed to persist sidebar width:', error);
                    }
                  }}
                  title="幅: 標準 (330px)"
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                    sidebarWidth > 270 && sidebarWidth < 390
                      ? isLight
                        ? 'bg-emerald-700 text-white'
                        : 'bg-emerald-500 text-stone-950 font-bold'
                      : isLight
                      ? 'text-stone-600 hover:text-emerald-800'
                      : 'text-emerald-400 hover:text-emerald-200'
                  }`}
                >
                  標
                </button>
                <button
                  onClick={() => {
                    setSidebarWidth(440);
                    try {
                      localStorage.setItem('fontforge_sidebar_width', '440');
                    } catch (error) {
                      console.warn('Failed to persist sidebar width:', error);
                    }
                  }}
                  title="幅: 広め (440px) - 一覧性重視"
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                    sidebarWidth >= 390
                      ? isLight
                        ? 'bg-emerald-700 text-white'
                        : 'bg-emerald-500 text-stone-950 font-bold'
                      : isLight
                      ? 'text-stone-600 hover:text-emerald-800'
                      : 'text-emerald-400 hover:text-emerald-200'
                  }`}
                >
                  広
                </button>
              </div>
            )}

            {/* Density Segmented Control */}
            <div
              className={`flex items-center p-0.5 rounded border ${
                isLight ? 'bg-white border-[#c8ded3]' : 'bg-[#101813] border-[#2d4034]'
              }`}
            >
              <button
                onClick={() => setGridDensity('large')}
                title="大 (3列・見やすい)"
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                  gridDensity === 'large'
                    ? isLight
                      ? 'bg-emerald-700 text-white'
                      : 'bg-emerald-500 text-stone-950 font-bold'
                    : isLight
                    ? 'text-stone-600 hover:text-emerald-800'
                    : 'text-emerald-400 hover:text-emerald-200'
                }`}
              >
                大
              </button>
              <button
                onClick={() => setGridDensity('medium')}
                title="中 (4列・標準)"
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                  gridDensity === 'medium'
                    ? isLight
                      ? 'bg-emerald-700 text-white'
                      : 'bg-emerald-500 text-stone-950 font-bold'
                    : isLight
                    ? 'text-stone-600 hover:text-emerald-800'
                    : 'text-emerald-400 hover:text-emerald-200'
                }`}
              >
                中
              </button>
              <button
                onClick={() => setGridDensity('compact')}
                title="小 (5列・一覧性重視)"
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                  gridDensity === 'compact'
                    ? isLight
                      ? 'bg-emerald-700 text-white'
                      : 'bg-emerald-500 text-stone-950 font-bold'
                    : isLight
                    ? 'text-stone-600 hover:text-emerald-800'
                    : 'text-emerald-400 hover:text-emerald-200'
                }`}
              >
                小
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsSearchHeaderExpanded((prev) => !prev)}
              className={`p-1.5 rounded text-xs font-semibold flex items-center gap-0.5 transition-all ${
                isSearchHeaderExpanded
                  ? isLight
                    ? 'text-stone-600 hover:bg-emerald-100'
                    : 'text-emerald-300 hover:bg-[#202d24]'
                  : isLight
                  ? 'bg-emerald-100 text-emerald-950 font-bold'
                  : 'bg-emerald-950 text-emerald-300 font-bold border border-emerald-800'
              }`}
              title={isSearchHeaderExpanded ? '分類・検索バーを折りたたんで一覧領域を拡大' : '分類・検索バーを展開'}
            >
              <Sliders className="w-3.5 h-3.5" />
              {isSearchHeaderExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            <button
              onClick={onClose}
              className={`p-1.5 sm:px-2 sm:py-1 rounded text-xs font-semibold flex items-center gap-0.5 transition-all ${
                isLight
                  ? 'bg-emerald-800 hover:bg-emerald-900 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
              title="文字一覧を収納して作図キャンバスを広げる"
            >
              <span className="hidden sm:inline">収納</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className={`p-1 rounded sm:hidden ${
                isLight ? 'text-stone-500 hover:bg-emerald-100' : 'text-emerald-400 hover:bg-[#202d24]'
              }`}
              title="閉じる"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Collapsible Header Controls */}
        {isSearchHeaderExpanded ? (
          <>
            {/* Row 2: Custom Category Popover & Category Tabs */}
            <div className="space-y-1.5 relative">
              <div className="relative" ref={categoryDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsCategoryDropdownOpen((prev) => !prev)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                    isLight
                      ? isCategoryDropdownOpen
                        ? 'bg-emerald-50 border-emerald-600 text-emerald-950 ring-2 ring-emerald-600/30'
                        : 'bg-white border-[#c8ded3] text-stone-800 hover:border-emerald-600 hover:bg-emerald-50/50'
                      : isCategoryDropdownOpen
                      ? 'bg-emerald-950/80 border-emerald-400 text-emerald-200 ring-2 ring-emerald-500/30'
                      : 'bg-[#0f1712] border-[#2d4034] text-emerald-200 hover:border-emerald-500 hover:bg-[#141f18]'
                  }`}
                  title="カテゴリー一覧メニューを開く（タップで全分類から選択）"
                >
                  <div className="flex items-center gap-1.5 min-w-0 truncate">
                    <Layers className={`w-3.5 h-3.5 shrink-0 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`} />
                    <span className="truncate">{activeCategoryDisplayName}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-1">
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isLight
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      }`}
                    >
                      分類選択
                    </span>
                    {isCategoryDropdownOpen ? (
                      <ChevronUp className="w-3.5 h-3.5 text-stone-500" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-stone-500" />
                    )}
                  </div>
                </button>

                {isCategoryDropdownOpen && (
                  <div
                    className={`absolute top-full left-0 right-0 z-50 mt-1 max-h-72 overflow-y-auto rounded-xl shadow-2xl border backdrop-blur-md p-1.5 animate-in fade-in zoom-in-95 duration-150 ${
                      isLight
                        ? 'bg-white/98 border-emerald-200 text-stone-800'
                        : 'bg-[#121c15]/98 border-[#2d4034] text-emerald-100'
                    }`}
                  >
                    {categoryGroups.map((group) => (
                      <div key={group.groupName} className="mb-2 last:mb-0">
                        <div
                          className={`text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider ${
                            isLight ? 'text-emerald-900/60' : 'text-emerald-400/60'
                          }`}
                        >
                          {group.groupName}
                        </div>
                        <div className="space-y-0.5 mt-0.5">
                          {group.items.map((item) => {
                            const isSelected = activeCategoryId === item.id;
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => {
                                  setActiveCategoryId(item.id);
                                  setSearchQuery('');
                                  setCurrentPage(1);
                                  setIsCategoryDropdownOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left ${
                                  isSelected
                                    ? isLight
                                      ? 'bg-emerald-600 text-white font-bold'
                                      : 'bg-emerald-500 text-stone-950 font-bold'
                                    : isLight
                                    ? 'hover:bg-emerald-50 text-stone-800'
                                    : 'hover:bg-[#1a281e] text-emerald-200'
                                }`}
                              >
                                <div className="flex items-center gap-1.5 truncate">
                                  {isSelected ? (
                                    <Check className="w-3.5 h-3.5 shrink-0" />
                                  ) : (
                                    <div className="w-3.5 h-3.5 shrink-0" />
                                  )}
                                  <span className="truncate">{item.name}</span>
                                </div>
                                <span
                                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono shrink-0 ml-1.5 ${
                                    isSelected
                                      ? isLight
                                        ? 'bg-white/25 text-white'
                                        : 'bg-stone-950/30 text-stone-950'
                                      : isLight
                                      ? 'bg-stone-100 text-stone-600'
                                      : 'bg-[#1c2a21] text-emerald-400'
                                  }`}
                                >
                                  {item.count}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick 1-Tap Category Tabs */}
              <div
                className={`p-1 rounded-xl flex items-center gap-1 overflow-x-auto no-scrollbar touch-scroll-x min-w-0 select-none whitespace-nowrap ${
                  isLight ? 'bg-stone-100/90' : 'bg-[#121c15]'
                }`}
              >
                {quickCategoryTabs.map((pill) => (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => {
                      setActiveCategoryId(pill.id);
                      setSearchQuery('');
                      setCurrentPage(1);
                      setIsCategoryDropdownOpen(false);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer whitespace-nowrap ${
                      activeCategoryId === pill.id
                        ? isLight
                          ? 'bg-white text-emerald-950 shadow-xs ring-1 ring-emerald-600/20'
                          : 'bg-[#1e2f23] text-emerald-100 shadow-xs ring-1 ring-emerald-500/30'
                        : isLight
                        ? 'text-stone-600 hover:text-stone-900 hover:bg-white/60 active:scale-95'
                        : 'text-emerald-400/80 hover:text-emerald-200 hover:bg-[#1a281e] active:scale-95'
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Row 3: Search input & Direct character input */}
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1 min-w-0">
                <Search
                  className={`w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 ${
                    isLight ? 'text-emerald-700' : 'text-emerald-400'
                  }`}
                />
                <input
                  type="text"
                  placeholder="文字・Unicode (あ, 3042, 学)..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className={`w-full border rounded-md pl-8 pr-7 py-1 text-xs placeholder-emerald-700/40 focus:outline-none transition-colors ${
                    isLight
                      ? 'bg-white border-[#c8ded3] text-stone-800 focus:border-emerald-700'
                      : 'bg-[#0f1712] border-[#2d4034] text-emerald-100 placeholder-emerald-600 focus:border-emerald-500'
                  }`}
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setCurrentPage(1);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs p-0.5"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Quick Custom Character Jumper */}
              <form onSubmit={handleAddCustomChar} className="flex items-center gap-1 shrink-0">
                <input
                  type="text"
                  maxLength={4}
                  placeholder="文字直接"
                  value={customCharInput}
                  onChange={(e) => setCustomCharInput(e.target.value)}
                  className={`w-16 border rounded-md px-1.5 py-1 text-xs text-center focus:outline-none ${
                    isLight
                      ? 'bg-white border-[#c8ded3] text-stone-800 focus:border-emerald-700'
                      : 'bg-[#0f1712] border-[#2d4034] text-emerald-100 focus:border-emerald-500'
                  }`}
                  title="任意の文字を直接入力して即座に開く (例: 龍)"
                />
                <button
                  type="submit"
                  disabled={!customCharInput.trim()}
                  className={`px-2 py-1 rounded-md disabled:opacity-40 text-xs font-bold flex items-center transition-colors shrink-0 ${
                    isLight
                      ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                      : 'bg-emerald-800 hover:bg-emerald-700 text-emerald-100'
                  }`}
                  title="入力文字を開く"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          /* Compact 1-line bar when header is folded */
          <div
            onClick={() => setIsSearchHeaderExpanded(true)}
            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${
              isLight
                ? 'bg-white/80 border-[#c8ded3] text-stone-700 hover:bg-emerald-50'
                : 'bg-[#101813] border-[#2d4034] text-emerald-300 hover:bg-[#18231c]'
            }`}
            title="クリックして検索・分類バーを展開"
          >
            <div className="flex items-center gap-1.5 min-w-0 truncate text-[11px] font-bold">
              <Layers className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span className="truncate">{activeCategoryDisplayName}</span>
              {searchQuery && (
                <span className="px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 text-[10px] font-mono truncate">
                  「{searchQuery}」
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0 text-[10px] text-stone-400 dark:text-stone-500">
              <span>展開</span>
              <ChevronDown className="w-3 h-3" />
            </div>
          </div>
        )}
      </div>

      {/* Category Progress & Status Filter Bar */}
      <div
        className={`px-3 py-2 border-b flex flex-col gap-1.5 shrink-0 ${
          isLight ? 'bg-white border-[#d4e5dc]' : 'bg-[#16201a] border-[#25362b]'
        }`}
      >
        {/* Progress header */}
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-bold flex items-center gap-1.5 truncate">
            <span className={isLight ? 'text-stone-700' : 'text-emerald-300'}>
              {activeCategoryName}:
            </span>
            <span className="font-mono text-emerald-700 dark:text-emerald-400 font-bold shrink-0">
              {categoryStats.completed} / {categoryStats.total} 字
            </span>
          </span>
          <div className="flex items-center gap-1 shrink-0">
            <span className="font-mono font-bold text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-300">
              {categoryStats.percent}%
            </span>
            <button
              type="button"
              onClick={() => setIsFilterExpanded((prev) => !prev)}
              className={`p-0.5 rounded transition-colors ${
                isLight ? 'hover:bg-emerald-100 text-stone-600' : 'hover:bg-[#223328] text-emerald-300'
              }`}
              title={isFilterExpanded ? '詳細フィルターを折りたたんで一覧領域を拡大' : '詳細フィルターを展開'}
            >
              {isFilterExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {isFilterExpanded && (
          <>
            {/* Progress track */}
            <div className="w-full h-1.5 rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden">
              <div
                className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                style={{ width: `${categoryStats.percent}%` }}
              />
            </div>

            {/* Status Filter Segmented Control */}
            <div
              className={`grid grid-cols-3 gap-1 p-1 rounded-xl text-xs font-bold ${
                isLight ? 'bg-stone-100/90' : 'bg-[#121c15]'
              }`}
            >
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setCurrentPage(1);
                }}
                className={`py-1.5 px-1 rounded-lg text-center truncate whitespace-nowrap transition-all ${
                  statusFilter === 'all'
                    ? isLight
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'bg-[#1e2f23] text-emerald-100 shadow-xs'
                    : isLight
                    ? 'text-stone-600 hover:text-stone-900'
                    : 'text-emerald-400/80 hover:text-emerald-200'
                }`}
                title="すべて表示"
              >
                すべて ({rawCategoryListLength})
              </button>
              <button
                onClick={() => {
                  setStatusFilter('completed');
                  setCurrentPage(1);
                }}
                className={`py-1.5 px-1 rounded-lg text-center flex items-center justify-center gap-1 truncate whitespace-nowrap transition-all ${
                  statusFilter === 'completed'
                    ? isLight
                      ? 'bg-white text-emerald-900 shadow-xs ring-1 ring-emerald-600/20'
                      : 'bg-[#1e2f23] text-emerald-100 shadow-xs ring-1 ring-emerald-500/30'
                    : isLight
                    ? 'text-stone-600 hover:text-stone-900'
                    : 'text-emerald-400/80 hover:text-emerald-200'
                }`}
                title="作成済みのみ表示"
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                <span className="truncate">済 ({categoryStats.completed})</span>
              </button>
              <button
                onClick={() => {
                  setStatusFilter('pending');
                  setCurrentPage(1);
                }}
                className={`py-1.5 px-1 rounded-lg text-center flex items-center justify-center gap-1 truncate whitespace-nowrap transition-all ${
                  statusFilter === 'pending'
                    ? isLight
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'bg-[#1e2f23] text-emerald-100 shadow-xs'
                    : isLight
                    ? 'text-stone-600 hover:text-stone-900'
                    : 'text-emerald-400/80 hover:text-emerald-200'
                }`}
                title="未作成のみ表示"
              >
                <CircleDashed className="w-3 h-3 text-stone-400 shrink-0" />
                <span className="truncate">未 ({categoryStats.total - categoryStats.completed})</span>
              </button>
            </div>

            {/* Quick Batch Studios Action Buttons */}
            {(onOpenGlyphSynthesisModal || onOpenKerningModal || onOpenQualityModal) && (
              <div className="grid grid-cols-2 gap-1 pt-1 border-t border-stone-100 dark:border-[#223328]">
                {onOpenGlyphSynthesisModal && (
                  <button
                    type="button"
                    onClick={onOpenGlyphSynthesisModal}
                    className={`py-1 px-1.5 rounded text-[10px] font-bold flex items-center justify-center gap-1 transition-all truncate border ${
                      isLight
                        ? 'bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100'
                        : 'bg-amber-950/40 border-amber-800/80 text-amber-200 hover:bg-amber-900/60'
                    }`}
                    title="濁点・半濁点・小書き文字を一括自動生成"
                  >
                    <Wand2 className="w-3 h-3 text-amber-600 shrink-0" />
                    <span className="truncate">濁点・小文字生成</span>
                  </button>
                )}
                {onOpenKerningModal && (
                  <button
                    type="button"
                    onClick={onOpenKerningModal}
                    className={`py-1 px-1.5 rounded text-[10px] font-bold flex items-center justify-center gap-1 transition-all truncate border ${
                      isLight
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900 hover:bg-emerald-100'
                        : 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200 hover:bg-emerald-900/60'
                    }`}
                    title="ペアごとの字間・サイドベアリング一括設定"
                  >
                    <ArrowLeftRight className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span className="truncate">カーニング調整</span>
                  </button>
                )}
                {onOpenQualityModal && (
                  <button
                    type="button"
                    onClick={onOpenQualityModal}
                    className={`col-span-2 py-1 px-1.5 rounded text-[10px] font-bold flex items-center justify-center gap-1 transition-all truncate border ${
                      isLight
                        ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900 hover:bg-emerald-100'
                        : 'bg-emerald-950/30 border-emerald-800/70 text-emerald-200 hover:bg-emerald-900/50'
                    }`}
                    title="字形重複・パス交差・過剰ノード・ベースライン逸脱の品質検査"
                  >
                    <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="truncate">フォント品質チェック</span>
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
});
