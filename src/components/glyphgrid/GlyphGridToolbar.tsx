import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Search,
  Plus,
  Sliders,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
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
  charListLength?: number;
  validPage: number;
  totalPages: number;
  effectiveIsOverlay?: boolean;
  sidebarWidth: number;
  setSidebarWidth?: (w: number) => void;
  gridDensity: GridDensity;
  setGridDensity: (d: GridDensity) => void;
  isSearchHeaderExpanded: boolean;
  setIsSearchHeaderExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  onClose?: () => void;
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
  validPage,
  totalPages,
  sidebarWidth,
  gridDensity,
  setGridDensity,
  isSearchHeaderExpanded,
  setIsSearchHeaderExpanded,
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

    let rafId: number | null = null;
    const scheduleScrollCheck = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        checkQuickTabsScroll();
      });
    };

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(scheduleScrollCheck);
      ro.observe(el);
    }

    checkQuickTabsScroll();

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
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
      {/* Header Controls: Compact Category + Density + Search Toggle + Quick Tabs + Search */}
      <div
        className={`px-2 py-1.5 border-b flex flex-col gap-1.5 shrink-0 min-w-0 ${themeClasses.headerBg} ${themeClasses.border}`}
      >
        {/* Row 1: Category Selector + Density Switch + Search Collapse Toggle */}
        <div className="flex items-center gap-1 min-w-0 relative" ref={categoryDropdownRef}>
          <button
            type="button"
            onClick={() => setIsCategoryDropdownOpen((prev) => !prev)}
            className={`flex-1 min-w-0 flex items-center justify-between px-2 py-1 rounded-md border text-xs font-bold transition-colors cursor-pointer ${
              isCategoryDropdownOpen
                ? `${themeClasses.cardBg} ${themeClasses.accentBorder} ${themeClasses.textPrimary} ring-2 ring-emerald-600/30`
                : `${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.activeToolHover}`
            }`}
            title="カテゴリー一覧メニューを開く（タップで全分類から選択）"
          >
            <div className="flex items-center gap-1 min-w-0 truncate">
              <Layers className={`w-3.5 h-3.5 shrink-0 ${themeClasses.accentText}`} />
              <span className="truncate text-[11px]">{activeCategoryDisplayName}</span>
            </div>
            <div className="flex items-center gap-0.5 shrink-0 ml-1">
              <span className={`text-[9px] font-bold ${themeClasses.accentText} whitespace-nowrap`}>
                分類選択
              </span>
              {isCategoryDropdownOpen ? (
                <ChevronUp className={`w-3 h-3 ${themeClasses.textMuted}`} />
              ) : (
                <ChevronDown className={`w-3 h-3 ${themeClasses.textMuted}`} />
              )}
            </div>
          </button>

          {/* Density Segmented Control */}
          <div
            className={`flex items-center p-0.5 rounded border shrink-0 ${themeClasses.cardBg} ${themeClasses.border}`}
          >
            <button
              type="button"
              onClick={() => setGridDensity('large')}
              title="大 (見やすい)"
              className={`px-1 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                gridDensity === 'large'
                  ? themeClasses.activeTool
                  : `${themeClasses.textMuted} hover:bg-black/5 dark:hover:bg-white/10`
              }`}
            >
              大
            </button>
            <button
              type="button"
              onClick={() => setGridDensity('medium')}
              title="中 (標準)"
              className={`px-1 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                gridDensity === 'medium'
                  ? themeClasses.activeTool
                  : `${themeClasses.textMuted} hover:bg-black/5 dark:hover:bg-white/10`
              }`}
            >
              中
            </button>
            <button
              type="button"
              onClick={() => setGridDensity('compact')}
              title="小 (一覧性重視)"
              className={`px-1 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                gridDensity === 'compact'
                  ? themeClasses.activeTool
                  : `${themeClasses.textMuted} hover:bg-black/5 dark:hover:bg-white/10`
              }`}
            >
              小
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsSearchHeaderExpanded((prev) => !prev)}
            className={`px-1.5 py-1 rounded text-[10px] font-semibold flex items-center gap-0.5 transition-colors cursor-pointer shrink-0 ${
              isSearchHeaderExpanded
                ? `${themeClasses.textMuted} ${themeClasses.activeToolHover}`
                : `${themeClasses.cardBg} border ${themeClasses.border} ${themeClasses.textPrimary} font-bold`
            }`}
            title={isSearchHeaderExpanded ? '分類タブ・検索バーを折りたたんで一覧領域を拡大' : '分類タブ・検索バーを展開'}
          >
            <Sliders className="w-3 h-3" />
            {isSearchHeaderExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {isCategoryDropdownOpen && (
            <div
              className={`absolute top-full left-0 right-0 z-50 mt-1 max-h-72 overflow-y-auto rounded-md shadow-2xl border p-1.5 anim-pop ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary}`}
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
                              : `${themeClasses.activeToolHover} ${themeClasses.textPrimary}`
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

        {/* Collapsible Quick Category Strip & Search Input */}
        {isSearchHeaderExpanded && (
          <>
            {/* Quick 1-Tap Category Tabs (single-elevation slim strip) */}
            <div className="flex items-center gap-0.5 min-w-0">
              {tabsCanScrollLeft && (
                <button
                  type="button"
                  onClick={() => {
                    quickTabsRef.current?.scrollBy({ left: -120, behavior: 'smooth' });
                  }}
                  className={`shrink-0 w-5 h-6 max-sm:min-w-[26px] max-sm:min-h-[26px] rounded flex items-center justify-center border transition-colors cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.activeToolHover}`}
                  title="左へスクロール"
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
              )}
              <div
                ref={quickTabsRef}
                className="flex-1 min-w-0 flex items-center gap-1 overflow-x-auto touch-scroll-x no-scrollbar select-none whitespace-nowrap"
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
                    title={
                      pill.id === 'modified'
                        ? 'プロジェクト全体で作成済みの文字一覧'
                        : `${pill.label}を表示`
                    }
                    className={`px-2 py-0.5 rounded text-[11px] font-bold shrink-0 transition-colors cursor-pointer whitespace-nowrap tabular-nums ${
                      activeCategoryId === pill.id
                        ? `${themeClasses.activeTool} shadow-xs border`
                        : `${themeClasses.textMuted} ${themeClasses.activeToolHover}`
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
                    quickTabsRef.current?.scrollBy({ left: 120, behavior: 'smooth' });
                  }}
                  className={`shrink-0 w-5 h-6 max-sm:min-w-[26px] max-sm:min-h-[26px] rounded flex items-center justify-center border transition-colors cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.activeToolHover}`}
                  title="右へスクロール"
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Row 3: Search input & Direct character input */}
            <div className="flex items-center gap-1 min-w-0">
              <div className="relative flex-1 min-w-0">
                <Search
                  className={`w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 ${themeClasses.accentText}`}
                />
                <input
                  type="text"
                  placeholder="検索: あ, 3042..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className={`w-full border rounded-md pl-7 pr-6 py-1 text-xs focus:outline-hidden focus:ring-1 focus:ring-emerald-500/40 transition-colors ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary}`}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setCurrentPage(1);
                    }}
                    className={`absolute right-1.5 top-1/2 -translate-y-1/2 ${themeClasses.textMuted} hover:opacity-80 text-xs p-0.5 cursor-pointer`}
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
                  placeholder="直接"
                  value={customCharInput}
                  onChange={(e) => setCustomCharInput(e.target.value)}
                  className={`w-14 min-w-[56px] border rounded-md px-1 py-1 text-xs text-center focus:outline-hidden focus:ring-1 focus:ring-emerald-500/40 ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary}`}
                  title="任意の文字を直接入力して即座に開く (例: 龍)"
                />
                <button
                  type="submit"
                  disabled={!customCharInput.trim()}
                  className={`px-1.5 py-1 rounded-md disabled:opacity-40 text-xs font-bold flex items-center transition-colors shrink-0 cursor-pointer ${themeClasses.accentBtn}`}
                  title="入力文字を開く"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </>
        )}
      </div>

      {/* Category Progress & Status Filter Bar */}
      <div
        className={`px-2 py-1 border-b flex flex-col gap-1 shrink-0 ${themeClasses.subtoolbarBg} ${themeClasses.border}`}
      >
        {/* Progress header + JIS/Tools buttons */}
        <div className="flex items-center justify-between text-[11px] gap-1 min-w-0">
          <span className="font-bold flex items-center gap-1 min-w-0 truncate">
            <span className={`truncate ${themeClasses.textPrimary}`}>
              {activeCategoryName}:
            </span>
            <span className={`font-mono font-bold tabular-nums shrink-0 ${themeClasses.accentText}`}>
              {categoryStats.completed} / {categoryStats.total} 字
            </span>
            <span className={`font-mono tabular-nums text-[10px] shrink-0 ${themeClasses.textMuted}`}>
              ({categoryStats.percent}%)
            </span>
          </span>
          <div className="flex items-center gap-1 shrink-0">
            {totalPages > 1 && (
              <span
                className={`text-[9.5px] px-1 py-0.5 rounded font-mono font-bold border tabular-nums ${themeClasses.accentBadge}`}
              >
                {validPage}/{totalPages}
              </span>
            )}
            <button
              type="button"
              onClick={() => openModal('jisProgress')}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors flex items-center gap-0.5 cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.activeToolHover}`}
              title="常用漢字・JIS第1・第2水準の進捗ダッシュボードを開く"
            >
              <Award className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="sm:hidden">進捗</span>
              <span className="hidden sm:inline">JIS進捗</span>
            </button>
            {(onOpenGlyphSynthesisModal || onOpenKerningModal || onOpenQualityModal) && (
              <button
                type="button"
                onClick={() => setIsFilterExpanded((prev) => !prev)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border flex items-center gap-0.5 transition-colors cursor-pointer ${
                  isFilterExpanded
                    ? themeClasses.activeTool
                    : `${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textMuted} ${themeClasses.activeToolHover}`
                }`}
                title={isFilterExpanded ? '補助ツールショートカットを隠す' : '一括生成・カーニング・品質チェックを表示'}
              >
                <span>ツール</span>
                {isFilterExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
          </div>
        </div>

        {/* Thin progress track */}
        <div className={`w-full h-[3px] rounded-xs overflow-hidden ${themeClasses.toolbarBg}`}>
          <div
            className="h-full bg-emerald-600 rounded-xs transition-[width] duration-300"
            style={{ width: `${categoryStats.percent}%` }}
          />
        </div>

        {/* Compact Status Filter Segmented Control */}
        <div
          className={`grid grid-cols-3 gap-0.5 p-0.5 rounded-md text-[10.5px] font-bold border ${themeClasses.toolbarBg} ${themeClasses.border}`}
        >
          <button
            type="button"
            onClick={() => {
              setStatusFilter('all');
              setCurrentPage(1);
            }}
            className={`py-0.5 px-1 rounded text-center truncate whitespace-nowrap tabular-nums transition-colors cursor-pointer ${
              statusFilter === 'all'
                ? `${themeClasses.activeTool} shadow-xs border`
                : `${themeClasses.textMuted} hover:bg-black/5 dark:hover:bg-white/10`
            }`}
            title="すべて表示"
          >
            すべて ({rawCategoryListLength})
          </button>
          <button
            type="button"
            onClick={() => {
              setStatusFilter('completed');
              setCurrentPage(1);
            }}
            className={`py-0.5 px-1 rounded text-center flex items-center justify-center gap-1 truncate whitespace-nowrap tabular-nums transition-colors cursor-pointer ${
              statusFilter === 'completed'
                ? `${themeClasses.activeTool} shadow-xs border`
                : `${themeClasses.textMuted} hover:bg-black/5 dark:hover:bg-white/10`
            }`}
            title="作成済みのみ表示"
          >
            <CheckCircle2 className={`w-3 h-3 shrink-0 ${themeClasses.accentText}`} />
            <span className="truncate">済 ({categoryStats.completed})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setStatusFilter('pending');
              setCurrentPage(1);
            }}
            className={`py-0.5 px-1 rounded text-center flex items-center justify-center gap-1 truncate whitespace-nowrap tabular-nums transition-colors cursor-pointer ${
              statusFilter === 'pending'
                ? `${themeClasses.activeTool} shadow-xs border`
                : `${themeClasses.textMuted} hover:bg-black/5 dark:hover:bg-white/10`
            }`}
            title="未作成のみ表示"
          >
            <CircleDashed className={`w-3 h-3 shrink-0 ${themeClasses.textMuted}`} />
            <span className="truncate">未 ({categoryStats.total - categoryStats.completed})</span>
          </button>
        </div>

        {/* Collapsible Quick Batch Studios Action Buttons */}
        {isFilterExpanded && (onOpenGlyphSynthesisModal || onOpenKerningModal || onOpenQualityModal) && (
          <div
            className={`grid gap-1 pt-1 border-t ${themeClasses.border} ${
              sidebarWidth >= 290 ? 'grid-cols-3' : 'grid-cols-2'
            }`}
          >
            {onOpenGlyphSynthesisModal && (
              <button
                type="button"
                onClick={onOpenGlyphSynthesisModal}
                className={`py-1 px-1 rounded text-[10px] font-bold flex items-center justify-center gap-0.5 transition-colors truncate border cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.activeToolHover}`}
                title="濁点・半濁点・小書き文字を一括自動生成"
              >
                <Wand2 className="w-3 h-3 text-amber-500 shrink-0" />
                <span className="truncate">濁点・小文字</span>
              </button>
            )}
            {onOpenKerningModal && (
              <button
                type="button"
                onClick={onOpenKerningModal}
                className={`py-1 px-1 rounded text-[10px] font-bold flex items-center justify-center gap-0.5 transition-colors truncate border cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.activeToolHover}`}
                title="ペアごとの字間・サイドベアリング一括設定"
              >
                <ArrowLeftRight className={`w-3 h-3 shrink-0 ${themeClasses.accentText}`} />
                <span className="truncate">カーニング</span>
              </button>
            )}
            {onOpenQualityModal && (
              <button
                type="button"
                onClick={onOpenQualityModal}
                className={`${
                  sidebarWidth >= 290 ? '' : 'col-span-2'
                } py-1 px-1 rounded text-[10px] font-bold flex items-center justify-center gap-0.5 transition-colors truncate border cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.activeToolHover}`}
                title="字形重複・パス交差・過剰ノード・ベースライン逸脱の品質検査"
              >
                <ShieldCheck className={`w-3 h-3 shrink-0 ${themeClasses.accentText}`} />
                <span className="truncate">品質検査</span>
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
});
