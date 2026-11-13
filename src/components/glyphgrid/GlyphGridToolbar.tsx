import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Search,
  Plus,
  Sliders,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  X,
  Layers,
  Check,
  CheckCircle2,
  CircleDashed,
  Wand2,
  ArrowLeftRight,
  ShieldCheck,
  Award,
} from 'lucide-react';
import { GridDensity } from './types';
import { ThemeClasses, getThemeClasses } from '../../utils/theme';
import { useModalContext } from '../../contexts/ModalContext';

export interface GlyphGridToolbarProps {
  themeClasses?: ThemeClasses;
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
  themeClasses: propThemeClasses,
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
  const themeClasses = propThemeClasses ?? getThemeClasses(isLight ? 'light' : 'dark');
  const { openModal } = useModalContext();
  const quickTabsRef = useRef<HTMLDivElement>(null);
  const suppressTabClickRef = useRef<boolean>(false);
  const [tabsCanScrollLeft, setTabsCanScrollLeft] = useState(false);
  const [tabsCanScrollRight, setTabsCanScrollRight] = useState(false);

  const checkQuickTabsScroll = useCallback(() => {
    const el = quickTabsRef.current;
    if (!el) return;
    setTabsCanScrollLeft(el.scrollLeft > 4);
    setTabsCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = quickTabsRef.current;
    if (!el || !isSearchHeaderExpanded) return;

    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return;
      if (!e.ctrlKey && !e.metaKey) {
        const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
        if (delta !== 0) {
          e.preventDefault();
          const multiplier = e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 200 : 1;
          el.scrollLeft += delta * multiplier;
          checkQuickTabsScroll();
        }
      }
    };

    let isDragging = false;
    let hasDragged = false;
    let startX = 0;
    let startScrollLeft = 0;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      isDragging = true;
      hasDragged = false;
      suppressTabClickRef.current = false;
      startX = e.pageX;
      startScrollLeft = el.scrollLeft;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.pageX - startX;
      if (!hasDragged && Math.abs(dx) >= 5) {
        hasDragged = true;
        suppressTabClickRef.current = true;
        el.style.cursor = 'grabbing';
      }
      if (hasDragged) {
        e.preventDefault();
        el.scrollLeft = startScrollLeft - dx;
        checkQuickTabsScroll();
      }
    };

    const onMouseUp = () => {
      if (isDragging) {
        isDragging = false;
        el.style.cursor = '';
        if (hasDragged) {
          setTimeout(() => {
            suppressTabClickRef.current = false;
          }, 0);
        }
      }
    };

    const onScroll = () => checkQuickTabsScroll();

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    el.addEventListener('scroll', onScroll, { passive: true });

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => checkQuickTabsScroll());
      ro.observe(el);
    }

    checkQuickTabsScroll();

    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      el.removeEventListener('scroll', onScroll);
      if (ro) ro.disconnect();
    };
  }, [isSearchHeaderExpanded, sidebarWidth, quickCategoryTabs.length, checkQuickTabsScroll]);

  return (
    <>
      {/* Header with Title, Count, Density Toggles and Close */}
      <div
        className={`p-2 border-b flex flex-col space-y-1.5 shrink-0 min-w-0 ${themeClasses.headerBg} ${themeClasses.border}`}
      >
        {/* Row 1: Title, Count, Density control, and Collapse button */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center space-x-1.5 min-w-0">
            <span
              className={`text-xs font-bold uppercase tracking-wider truncate ${themeClasses.textPrimary}`}
            >
              文字一覧
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 border tabular-nums ${themeClasses.accentBadge}`}
            >
              {charListLength.toLocaleString()}字
              {totalPages > 1 && (
                <span className="opacity-75 font-normal ml-1 tabular-nums">
                  ({validPage}/{totalPages}頁)
                </span>
              )}
            </span>
          </div>

          {/* Density switch and close button */}
          <div className="flex items-center space-x-1 shrink-0">
            {/* Width Presets (狭: 230px, 標: 264px, 広: 380px) */}
            {!effectiveIsOverlay && (
              <div
                className={`hidden sm:flex items-center p-0.5 rounded border ${themeClasses.cardBg} ${themeClasses.border}`}
                title="サイドバーの幅プリセット（右端を直接ドラッグして任意幅に微調整も可能）"
              >
                <button
                  onClick={() => {
                    setSidebarWidth(230);
                    try {
                      localStorage.setItem('fontforge_sidebar_width', '230');
                    } catch (error) {
                      console.warn('Failed to persist sidebar width:', error);
                    }
                  }}
                  title="幅: 狭め (230px) - キャンバス重視"
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                    sidebarWidth <= 245
                      ? themeClasses.activeTool
                      : `${themeClasses.textMuted} hover:${themeClasses.textPrimary}`
                  }`}
                >
                  狭
                </button>
                <button
                  onClick={() => {
                    setSidebarWidth(264);
                    try {
                      localStorage.setItem('fontforge_sidebar_width', '264');
                    } catch (error) {
                      console.warn('Failed to persist sidebar width:', error);
                    }
                  }}
                  title="幅: 標準 (264px)"
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                    sidebarWidth > 245 && sidebarWidth < 321
                      ? themeClasses.activeTool
                      : `${themeClasses.textMuted} hover:${themeClasses.textPrimary}`
                  }`}
                >
                  標
                </button>
                <button
                  onClick={() => {
                    setSidebarWidth(380);
                    try {
                      localStorage.setItem('fontforge_sidebar_width', '380');
                    } catch (error) {
                      console.warn('Failed to persist sidebar width:', error);
                    }
                  }}
                  title="幅: 広め (380px) - 一覧性重視"
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                    sidebarWidth >= 321
                      ? themeClasses.activeTool
                      : `${themeClasses.textMuted} hover:${themeClasses.textPrimary}`
                  }`}
                >
                  広
                </button>
              </div>
            )}

            {/* Density Segmented Control */}
            <div
              className={`flex items-center p-0.5 rounded border ${themeClasses.cardBg} ${themeClasses.border}`}
            >
              <button
                onClick={() => setGridDensity('large')}
                title="大 (3列・見やすい)"
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                  gridDensity === 'large'
                    ? themeClasses.activeTool
                    : `${themeClasses.textMuted} hover:${themeClasses.textPrimary}`
                }`}
              >
                大
              </button>
              <button
                onClick={() => setGridDensity('medium')}
                title="中 (4列・標準)"
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                  gridDensity === 'medium'
                    ? themeClasses.activeTool
                    : `${themeClasses.textMuted} hover:${themeClasses.textPrimary}`
                }`}
              >
                中
              </button>
              <button
                onClick={() => setGridDensity('compact')}
                title="小 (5列・一覧性重視)"
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                  gridDensity === 'compact'
                    ? themeClasses.activeTool
                    : `${themeClasses.textMuted} hover:${themeClasses.textPrimary}`
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
                  ? `${themeClasses.textMuted} hover:${themeClasses.activeToolHover}`
                  : `${themeClasses.cardBg} border ${themeClasses.border} ${themeClasses.textPrimary} font-bold`
              }`}
              title={isSearchHeaderExpanded ? '分類・検索バーを折りたたんで一覧領域を拡大' : '分類・検索バーを展開'}
            >
              <Sliders className="w-3.5 h-3.5" />
              {isSearchHeaderExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            <button
              onClick={onClose}
              className={`p-1.5 sm:px-2 sm:py-1 rounded text-xs font-semibold flex items-center gap-0.5 transition-all ${themeClasses.accentBtn}`}
              title="文字一覧を収納して作図キャンバスを広げる"
            >
              <span className="hidden sm:inline">収納</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className={`p-1 rounded sm:hidden ${themeClasses.textMuted} hover:${themeClasses.activeToolHover}`}
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
            <div className="space-y-1.5 relative min-w-0">
              <div className="relative" ref={categoryDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsCategoryDropdownOpen((prev) => !prev)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                    isCategoryDropdownOpen
                      ? `${themeClasses.cardBg} ${themeClasses.accentBorder} ${themeClasses.textPrimary} ring-2 ring-emerald-600/30`
                      : `${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} hover:${themeClasses.activeToolHover}`
                  }`}
                  title="カテゴリー一覧メニューを開く（タップで全分類から選択）"
                >
                  <div className="flex items-center gap-1.5 min-w-0 truncate">
                    <Layers className={`w-3.5 h-3.5 shrink-0 ${themeClasses.accentText}`} />
                    <span className="truncate">{activeCategoryDisplayName}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-1">
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-bold border ${themeClasses.accentBadge}`}
                    >
                      分類選択
                    </span>
                    {isCategoryDropdownOpen ? (
                      <ChevronUp className={`w-3.5 h-3.5 ${themeClasses.textMuted}`} />
                    ) : (
                      <ChevronDown className={`w-3.5 h-3.5 ${themeClasses.textMuted}`} />
                    )}
                  </div>
                </button>

                {isCategoryDropdownOpen && (
                  <div
                    className={`absolute top-full left-0 right-0 z-50 mt-1 max-h-72 overflow-y-auto rounded-md shadow-2xl border p-1.5 animate-in fade-in zoom-in-95 duration-150 ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary}`}
                  >
                    {categoryGroups.map((group) => (
                      <div key={group.groupName} className="mb-2 last:mb-0">
                        <div
                          className={`text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider ${themeClasses.accentText}`}
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
                                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors text-left ${
                                  isSelected
                                    ? `${themeClasses.activeTool} font-bold`
                                    : `hover:${themeClasses.activeToolHover} ${themeClasses.textPrimary}`
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
                                  className={`text-[10px] px-1.5 py-0.5 rounded font-mono tabular-nums shrink-0 ml-1.5 border ${
                                    isSelected
                                      ? 'bg-black/20 text-current'
                                      : `${themeClasses.toolbarBg} ${themeClasses.border} ${themeClasses.textMuted}`
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
                className={`p-1 rounded-md flex items-center gap-1 min-w-0 border ${themeClasses.toolbarBg} ${themeClasses.border}`}
              >
                {tabsCanScrollLeft && (
                  <button
                    type="button"
                    onClick={() => {
                      quickTabsRef.current?.scrollBy({ left: -140, behavior: 'smooth' });
                    }}
                    className={`shrink-0 w-5 h-6 rounded flex items-center justify-center border transition-colors cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} hover:${themeClasses.activeToolHover}`}
                    title="左へスクロール"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                )}
                <div
                  ref={quickTabsRef}
                  className="flex-1 min-w-0 flex items-center gap-1 overflow-x-auto touch-scroll-x custom-scrollbar pb-0.5 select-none whitespace-nowrap"
                >
                  {quickCategoryTabs.map((pill) => (
                    <button
                      key={pill.id}
                      type="button"
                      onClick={() => {
                        if (suppressTabClickRef.current) return;
                        setActiveCategoryId(pill.id);
                        setSearchQuery('');
                        setCurrentPage(1);
                        setIsCategoryDropdownOpen(false);
                      }}
                      className={`px-2.5 py-1 rounded text-xs font-bold shrink-0 transition-all cursor-pointer whitespace-nowrap tabular-nums ${
                        activeCategoryId === pill.id
                          ? `${themeClasses.activeTool} shadow-xs border`
                          : `${themeClasses.textMuted} hover:${themeClasses.textPrimary} hover:${themeClasses.activeToolHover} active:scale-95`
                      }`}
                    >
                      {pill.label}
                    </button>
                  ))}
                </div>
                {tabsCanScrollRight && (
                  <button
                    type="button"
                    onClick={() => {
                      quickTabsRef.current?.scrollBy({ left: 140, behavior: 'smooth' });
                    }}
                    className={`shrink-0 w-5 h-6 rounded flex items-center justify-center border transition-colors cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} hover:${themeClasses.activeToolHover}`}
                    title="右へスクロール"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Row 3: Search input & Direct character input */}
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1 min-w-0">
                <Search
                  className={`w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 ${themeClasses.accentText}`}
                />
                <input
                  type="text"
                  placeholder="文字・Unicode (あ, 3042, 学)..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className={`w-full border rounded-md pl-8 pr-7 py-1 text-xs focus:outline-hidden transition-colors ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} focus:${themeClasses.accentBorder}`}
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setCurrentPage(1);
                    }}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 ${themeClasses.textMuted} hover:${themeClasses.textPrimary} text-xs p-0.5`}
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
                  className={`w-16 border rounded-md px-1.5 py-1 text-xs text-center focus:outline-hidden ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} focus:${themeClasses.accentBorder}`}
                  title="任意の文字を直接入力して即座に開く (例: 龍)"
                />
                <button
                  type="submit"
                  disabled={!customCharInput.trim()}
                  className={`px-2 py-1 rounded-md disabled:opacity-40 text-xs font-bold flex items-center transition-colors shrink-0 ${themeClasses.accentBtn}`}
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
            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} hover:${themeClasses.activeToolHover}`}
            title="クリックして検索・分類バーを展開"
          >
            <div className="flex items-center gap-1.5 min-w-0 truncate text-[11px] font-bold">
              <Layers className={`w-3.5 h-3.5 shrink-0 ${themeClasses.accentText}`} />
              <span className="truncate">{activeCategoryDisplayName}</span>
              {searchQuery && (
                <span className={`px-1.5 py-0.2 rounded border text-[10px] font-mono truncate ${themeClasses.accentBadge}`}>
                  「{searchQuery}」
                </span>
              )}
            </div>
            <div className={`flex items-center gap-1 shrink-0 text-[10px] ${themeClasses.textMuted}`}>
              <span>展開</span>
              <ChevronDown className="w-3 h-3" />
            </div>
          </div>
        )}
      </div>

      {/* Category Progress & Status Filter Bar */}
      <div
        className={`px-2.5 py-1.5 border-b flex flex-col gap-1.5 shrink-0 ${themeClasses.subtoolbarBg} ${themeClasses.border}`}
      >
        {/* Progress header */}
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-bold flex items-center gap-1.5 truncate">
            <span className={themeClasses.textPrimary}>
              {activeCategoryName}:
            </span>
            <span className={`font-mono font-bold tabular-nums shrink-0 ${themeClasses.accentText}`}>
              {categoryStats.completed} / {categoryStats.total} 字
            </span>
          </span>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => openModal('jisProgress')}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors flex items-center gap-1 cursor-pointer mr-0.5 ${themeClasses.cardBg} ${themeClasses.border} hover:${themeClasses.activeToolHover}`}
              title="常用漢字・JIS第1・第2水準の進捗ダッシュボードを開く"
            >
              <Award className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">JIS進捗</span>
            </button>
            <span className={`font-mono font-bold tabular-nums text-[10px] px-1.5 py-0.5 rounded border ${themeClasses.accentBadge}`}>
              {categoryStats.percent}%
            </span>
            <button
              type="button"
              onClick={() => setIsFilterExpanded((prev) => !prev)}
              className={`p-0.5 rounded transition-colors ${themeClasses.textMuted} hover:${themeClasses.activeToolHover}`}
              title={isFilterExpanded ? '詳細フィルターを折りたたんで一覧領域を拡大' : '詳細フィルターを展開'}
            >
              {isFilterExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {isFilterExpanded && (
          <>
            {/* Progress track */}
            <div className={`w-full h-1.5 rounded-xs overflow-hidden border ${themeClasses.toolbarBg} ${themeClasses.border}`}>
              <div
                className="h-full bg-emerald-600 rounded-xs transition-all duration-300"
                style={{ width: `${categoryStats.percent}%` }}
              />
            </div>

            {/* Status Filter Segmented Control */}
            <div
              className={`grid grid-cols-3 gap-1 p-1 rounded-md text-xs font-bold border ${themeClasses.toolbarBg} ${themeClasses.border}`}
            >
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setCurrentPage(1);
                }}
                className={`py-1 px-1 rounded text-center truncate whitespace-nowrap tabular-nums transition-all ${
                  statusFilter === 'all'
                    ? `${themeClasses.activeTool} shadow-xs border`
                    : `${themeClasses.textMuted} hover:${themeClasses.textPrimary}`
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
                className={`py-1 px-1 rounded text-center flex items-center justify-center gap-1 truncate whitespace-nowrap tabular-nums transition-all ${
                  statusFilter === 'completed'
                    ? `${themeClasses.activeTool} shadow-xs border`
                    : `${themeClasses.textMuted} hover:${themeClasses.textPrimary}`
                }`}
                title="作成済みのみ表示"
              >
                <CheckCircle2 className={`w-3 h-3 shrink-0 ${themeClasses.accentText}`} />
                <span className="truncate">済 ({categoryStats.completed})</span>
              </button>
              <button
                onClick={() => {
                  setStatusFilter('pending');
                  setCurrentPage(1);
                }}
                className={`py-1 px-1 rounded text-center flex items-center justify-center gap-1 truncate whitespace-nowrap tabular-nums transition-all ${
                  statusFilter === 'pending'
                    ? `${themeClasses.activeTool} shadow-xs border`
                    : `${themeClasses.textMuted} hover:${themeClasses.textPrimary}`
                }`}
                title="未作成のみ表示"
              >
                <CircleDashed className={`w-3 h-3 shrink-0 ${themeClasses.textMuted}`} />
                <span className="truncate">未 ({categoryStats.total - categoryStats.completed})</span>
              </button>
            </div>

            {/* Quick Batch Studios Action Buttons */}
            {(onOpenGlyphSynthesisModal || onOpenKerningModal || onOpenQualityModal) && (
              <div className={`grid grid-cols-2 gap-1 pt-1 border-t ${themeClasses.border}`}>
                {onOpenGlyphSynthesisModal && (
                  <button
                    type="button"
                    onClick={onOpenGlyphSynthesisModal}
                    className={`py-1 px-1.5 rounded text-[10px] font-bold flex items-center justify-center gap-1 transition-all truncate border ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} hover:${themeClasses.activeToolHover}`}
                    title="濁点・半濁点・小書き文字を一括自動生成"
                  >
                    <Wand2 className="w-3 h-3 text-amber-500 shrink-0" />
                    <span className="truncate">濁点・小文字生成</span>
                  </button>
                )}
                {onOpenKerningModal && (
                  <button
                    type="button"
                    onClick={onOpenKerningModal}
                    className={`py-1 px-1.5 rounded text-[10px] font-bold flex items-center justify-center gap-1 transition-all truncate border ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} hover:${themeClasses.activeToolHover}`}
                    title="ペアごとの字間・サイドベアリング一括設定"
                  >
                    <ArrowLeftRight className={`w-3 h-3 shrink-0 ${themeClasses.accentText}`} />
                    <span className="truncate">カーニング調整</span>
                  </button>
                )}
                {onOpenQualityModal && (
                  <button
                    type="button"
                    onClick={onOpenQualityModal}
                    className={`col-span-2 py-1 px-1.5 rounded text-[10px] font-bold flex items-center justify-center gap-1 transition-all truncate border ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} hover:${themeClasses.activeToolHover}`}
                    title="字形重複・パス交差・過剰ノード・ベースライン逸脱の品質検査"
                  >
                    <ShieldCheck className={`w-3 h-3 shrink-0 ${themeClasses.accentText}`} />
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
