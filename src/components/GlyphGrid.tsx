import React, { useState, useMemo, useCallback, memo, useEffect, useRef } from 'react';
import {
  Copy,
  Clipboard,
  Trash2,
  Lock,
} from 'lucide-react';
import { isLightTheme, getThemeClasses } from '../utils/theme';
import { STORAGE_KEYS, setStorageItem } from '../utils/storageKeys';
import {
  ContextMenuState,
  GlyphGridProps,
  GlyphGridCard,
  GlyphGridContextMenu,
  GlyphGridToolbar,
  GlyphGridPagination,
  useGlyphGridFilter,
} from './glyphgrid/index';
import { CharacterListTab } from './glyphgrid/CharacterListTab';

export type { GlyphGridProps };

export const GlyphGrid: React.FC<GlyphGridProps> = memo(({
  project,
  selectedUnicode,
  onSelectGlyph,
  onClearGlyph,
  onCopyGlyph,
  onPasteGlyph,
  onDuplicateAsSmallKana,
  onGenerateDakutenTarget,
  onOpenGlyphSynthesisModal,
  onOpenKerningModal,
  onOpenQualityModal,
  hasClipboard,
  isOpen,
  onClose,
  theme,
  isOverlay,
}) => {
  const effectiveIsOverlay = isOverlay !== undefined ? isOverlay : false;
  const isLight = isLightTheme(theme);
  const themeClasses = getThemeClasses(theme);

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  // Timestamp of the pointerdown on the overlay backdrop that closed the
  // context menu. The click that follows that pointerdown must not also
  // close the drawer (C5). The timestamp expires so a later unrelated
  // backdrop click still closes the drawer.
  const backdropMenuCloseAtRef = useRef(0);

  // Panel tab: the creation grid (boxes with editing actions) or the
  // plain character list (specimen view, unwritten glyphs as faint text).
  const [panelTab, setPanelTab] = useState<'create' | 'list'>('create');

  // Close context menu on outside pointerdown / touch, on Escape, and on
  // scroll or resize (the menu position is not updated, so it closes).
  useEffect(() => {
    const handlePointerDownOutside = (e: MouseEvent | TouchEvent | PointerEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        if (backdropRef.current?.contains(e.target as Node)) {
          backdropMenuCloseAtRef.current = Date.now();
        }
        setContextMenu(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu(null);
      }
    };
    const handleDismiss = (e: Event) => {
      if (e.type === 'scroll' && contextMenuRef.current?.contains(e.target as Node)) {
        return;
      }
      setContextMenu(null);
    };
    if (contextMenu) {
      document.addEventListener('pointerdown', handlePointerDownOutside);
      document.addEventListener('touchstart', handlePointerDownOutside);
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('scroll', handleDismiss, true);
      window.addEventListener('resize', handleDismiss);
      return () => {
        document.removeEventListener('pointerdown', handlePointerDownOutside);
        document.removeEventListener('touchstart', handlePointerDownOutside);
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('scroll', handleDismiss, true);
        window.removeEventListener('resize', handleDismiss);
      };
    }
  }, [contextMenu]);

  // Filtering, Category & Pagination Hook
  const {
    activeCategoryId,
    setActiveCategoryId,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    customCharInput,
    setCustomCharInput,
    currentPage,
    setCurrentPage,
    gridDensity,
    setGridDensity,
    isCategoryDropdownOpen,
    setIsCategoryDropdownOpen,
    categoryDropdownRef,
    sidebarWidth,
    setSidebarWidth,
    isResizing,
    isFilterExpanded,
    setIsFilterExpanded,
    isSearchHeaderExpanded,
    setIsSearchHeaderExpanded,
    handleResizeStart,
    handleAddCustomChar,
    rawCategoryList,
    categoryStats,
    charList,
    pageSize,
    totalPages,
    validPage,
    paginatedList,
    categoryGroups,
    activeCategoryDisplayName,
    quickCategoryTabs,
  } = useGlyphGridFilter({
    project,
    onSelectGlyph,
    onClose,
    isOverlay: effectiveIsOverlay,
  });

  const handleOpenContextMenu = useCallback(
    (
      e: React.MouseEvent,
      item: { char: string; code: number; name?: string }
    ) => {
      e.preventDefault();
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        anchorTop: rect.top - 4,
        item,
      });
    },
    []
  );

  const handleCardSelect = useCallback(
    (c: number, ch: string) => {
      onSelectGlyph(c, ch);
      if (window.innerWidth < 640) {
        onClose();
      }
    },
    [onSelectGlyph, onClose]
  );

  const currentSelectedGlyph = project.glyphs[selectedUnicode];
  const currentSelectedHasContours = Boolean(
    currentSelectedGlyph && currentSelectedGlyph.contours && currentSelectedGlyph.contours.length > 0
  );
  const currentSelectedLocked = Boolean(currentSelectedGlyph?.locked);
  const currentSelectedChar = useMemo(() => {
    if (currentSelectedGlyph?.char) return currentSelectedGlyph.char;
    try {
      return selectedUnicode > 0 && selectedUnicode <= 0x10ffff
        ? String.fromCodePoint(selectedUnicode)
        : '';
    } catch {
      return '';
    }
  }, [currentSelectedGlyph?.char, selectedUnicode]);

  // Keyboard paging shortcuts (PageUp / PageDown or Alt+Arrow)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'PageDown' || (e.altKey && e.key === 'ArrowRight')) {
        e.preventDefault();
        // Always stop the event here (even on the last page) so window
        // keydown listeners do not change the active canvas glyph.
        e.stopPropagation();
        if (validPage < totalPages) {
          setCurrentPage(Math.min(totalPages, validPage + 1));
        }
      } else if (e.key === 'PageUp' || (e.altKey && e.key === 'ArrowLeft')) {
        e.preventDefault();
        e.stopPropagation();
        if (validPage > 1) {
          setCurrentPage(Math.max(1, validPage - 1));
        }
      }
    },
    [validPage, totalPages, setCurrentPage]
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile/Overlay Click-Outside Dismiss Backdrop */}
      {effectiveIsOverlay && (
        <div
          ref={backdropRef}
          onClick={() => {
            // C5: when this click follows the pointerdown that closed the
            // context menu, only the menu closes and the drawer stays open.
            if (
              backdropMenuCloseAtRef.current > 0 &&
              Date.now() - backdropMenuCloseAtRef.current < 1000
            ) {
              backdropMenuCloseAtRef.current = 0;
              return;
            }
            backdropMenuCloseAtRef.current = 0;
            onClose();
          }}
          className="fixed top-[calc(2.5rem+env(safe-area-inset-top,0px))] inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))] sm:bottom-0 bg-black/40 z-30 pointer-events-auto"
        />
      )}

      <aside
        onKeyDown={handleKeyDown}
        tabIndex={0}
        style={{
          width: effectiveIsOverlay ? undefined : `${sidebarWidth}px`,
        }}
        className={`${
          effectiveIsOverlay
            ? 'fixed top-[calc(2.5rem+env(safe-area-inset-top,0px))] bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))] sm:bottom-0 left-0 z-40 w-full sm:w-80 md:w-[340px] shadow-2xl anim-slide-left outline-none'
            : 'relative z-10 shadow-none shrink-0 h-full outline-none'
        } border-r flex flex-col select-none ${isResizing ? '' : 'transition-[width] duration-150'} ${themeClasses.sidebarBg} ${themeClasses.border}`}
      >
        {/* Left Sidebar Drag Resizer Handle */}
        {!effectiveIsOverlay && (
          <div
            id="sidebar-resizer-handle"
            onPointerDown={handleResizeStart}
            style={{ touchAction: 'none' }}
            className={`absolute top-0 -right-2 w-4 h-full cursor-col-resize z-30 flex items-center justify-center group select-none transition-colors ${
              isResizing ? 'bg-emerald-500/15' : 'hover:bg-emerald-500/10'
            }`}
            title={`左右にドラッグしてサイドバー幅を調整 (${sidebarWidth}px) / ダブルクリックで初期値にリセット`}
            onDoubleClick={() => {
              const defaultWidth = typeof window !== 'undefined' && window.innerWidth >= 1280 ? 304 : 264;
              setSidebarWidth(defaultWidth);
              setStorageItem(STORAGE_KEYS.SIDEBAR_WIDTH, String(defaultWidth));
            }}
          >
            <div
              className={`w-1 h-14 rounded transition-[transform,background-color] flex items-center justify-center ${
                isResizing
                  ? 'bg-emerald-500 scale-110'
                  : 'bg-stone-300 dark:bg-stone-600 group-hover:bg-emerald-500 group-hover:scale-105'
              }`}
            >
              <div className="w-0.5 h-6 rounded bg-white/50 dark:bg-black/40" />
            </div>
          </div>
        )}

        {/* Panel Tabs: creation grid / plain character list */}
        <div
          className={`flex gap-1 px-2 pt-2 pb-1 shrink-0 border-b ${themeClasses.border}`}
          role="tablist"
          aria-label="文字パネルの表示切り替え"
        >
          <button
            type="button"
            role="tab"
            aria-selected={panelTab === 'create'}
            onClick={() => setPanelTab('create')}
            className={`flex-1 px-2 py-1 rounded text-xs font-bold cursor-pointer border transition-colors ${
              panelTab === 'create'
                ? themeClasses.activeTool
                : `${themeClasses.cardBg} ${themeClasses.activeToolHover}`
            }`}
          >
            作成
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={panelTab === 'list'}
            onClick={() => setPanelTab('list')}
            className={`flex-1 px-2 py-1 rounded text-xs font-bold cursor-pointer border transition-colors ${
              panelTab === 'list'
                ? themeClasses.activeTool
                : `${themeClasses.cardBg} ${themeClasses.activeToolHover}`
            }`}
          >
            一覧
          </button>
        </div>

        {panelTab === 'create' ? (
          <>
            {/* Toolbar & Filter Component */}
            <GlyphGridToolbar
          themeClasses={themeClasses}
          charListLength={charList.length}
          validPage={validPage}
          totalPages={totalPages}
          effectiveIsOverlay={effectiveIsOverlay}
          sidebarWidth={sidebarWidth}
          setSidebarWidth={setSidebarWidth}
          gridDensity={gridDensity}
          setGridDensity={setGridDensity}
          isSearchHeaderExpanded={isSearchHeaderExpanded}
          setIsSearchHeaderExpanded={setIsSearchHeaderExpanded}
          onClose={onClose}
          isLight={isLight}
          categoryDropdownRef={categoryDropdownRef}
          isCategoryDropdownOpen={isCategoryDropdownOpen}
          setIsCategoryDropdownOpen={setIsCategoryDropdownOpen}
          activeCategoryDisplayName={activeCategoryDisplayName}
          categoryGroups={categoryGroups}
          activeCategoryId={activeCategoryId}
          setActiveCategoryId={setActiveCategoryId}
          quickCategoryTabs={quickCategoryTabs}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          setCurrentPage={setCurrentPage}
          handleAddCustomChar={handleAddCustomChar}
          customCharInput={customCharInput}
          setCustomCharInput={setCustomCharInput}
          activeCategoryName={activeCategoryDisplayName.split(' ')[0]}
          categoryStats={categoryStats}
          isFilterExpanded={isFilterExpanded}
          setIsFilterExpanded={setIsFilterExpanded}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          rawCategoryListLength={rawCategoryList.length}
          onOpenGlyphSynthesisModal={onOpenGlyphSynthesisModal}
          onOpenKerningModal={onOpenKerningModal}
          onOpenQualityModal={onOpenQualityModal}
        />

        {/* Glyphs Grid Matrix */}
        <div
          className={`flex-1 min-h-0 overflow-y-auto overscroll-contain p-2 sm:p-2.5 pb-24 sm:pb-8 grid gap-2 content-start ${
            effectiveIsOverlay
              ? gridDensity === 'large'
                ? 'grid-cols-3'
                : gridDensity === 'medium'
                ? 'grid-cols-4'
                : 'grid-cols-5'
              : ''
          } ${themeClasses.canvasOuterBg}`}
          style={{
            gridTemplateColumns: !effectiveIsOverlay
              ? `repeat(auto-fill, minmax(${
                  gridDensity === 'large' ? 82 : gridDensity === 'medium' ? 62 : 48
                }px, 1fr))`
              : undefined,
            gridAutoRows: gridDensity === 'large' ? '92px' : gridDensity === 'medium' ? '76px' : '62px',
            paddingBottom: effectiveIsOverlay ? 'max(env(safe-area-inset-bottom, 0px) + 40px, 40px)' : undefined,
          }}
        >
          {charList.length === 0 ? (
            <div
              className={`col-span-full py-12 text-center text-xs ${themeClasses.textMuted}`}
            >
              該当する文字が見つかりません
            </div>
          ) : (
            paginatedList.map((item) => (
              <GlyphGridCard
                key={item.code}
                item={item}
                isSelected={selectedUnicode === item.code}
                glyphData={project.glyphs[item.code]}
                isLight={isLight}
                themeClasses={themeClasses}
                density={gridDensity}
                unitsPerEm={project.metadata.unitsPerEm || 1000}
                onSelectGlyph={handleCardSelect}
                onContextMenu={handleOpenContextMenu}
              />
            ))
          )}
        </div>
          </>
        ) : (
          <CharacterListTab
            project={project}
            selectedUnicode={selectedUnicode}
            onSelectGlyph={handleCardSelect}
            theme={theme}
          />
        )}

        {/* Selected Glyph Quick Action Dock */}
        {selectedUnicode > 0 && (
          <div
            className={`px-3 py-1.5 border-t flex items-center justify-between text-xs shrink-0 ${themeClasses.subtoolbarBg} ${themeClasses.border}`}
          >
            <div className="flex items-center space-x-1.5 min-w-0">
              <span className={`font-bold text-sm ${themeClasses.accentText}`}>
                {currentSelectedChar}
              </span>
              <span className={`text-[10px] font-mono tabular-nums ${themeClasses.textMuted}`}>
                U+{selectedUnicode.toString(16).toUpperCase().padStart(4, '0')}
              </span>
              {currentSelectedHasContours && currentSelectedGlyph && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold tabular-nums ${themeClasses.accentBadge}`}>
                  {currentSelectedGlyph.contours.length}画
                </span>
              )}
              {currentSelectedLocked && (
                <span title="編集ロック中">
                  <Lock className="w-3 h-3 text-amber-500 shrink-0" />
                </span>
              )}
            </div>

            <div className="flex items-center space-x-1 shrink-0">
              {currentSelectedHasContours && (
                <button
                  type="button"
                  onClick={() => onCopyGlyph(selectedUnicode)}
                  className={`min-w-[36px] min-h-[36px] sm:min-w-0 sm:min-h-0 px-2 py-1.5 sm:p-1 rounded text-[10px] font-bold flex items-center justify-center gap-0.5 border transition-colors cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.activeToolHover}`}
                  title="選択中の字形をコピー"
                >
                  <Copy className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                  <span className="hidden sm:inline">コピー</span>
                </button>
              )}

              {hasClipboard && (
                <button
                  type="button"
                  disabled={currentSelectedLocked}
                  onClick={() => onPasteGlyph(selectedUnicode)}
                  className={`min-w-[36px] min-h-[36px] sm:min-w-0 sm:min-h-0 px-2 py-1.5 sm:px-1.5 sm:py-1 rounded text-[10px] font-bold ${themeClasses.accentBtn} flex items-center justify-center gap-0.5 cursor-pointer disabled:opacity-40 disabled:pointer-events-none disabled:cursor-not-allowed`}
                  title={
                    currentSelectedLocked
                      ? '編集ロック中のため貼り付けできません'
                      : 'コピーした形をこの文字に貼り付け'
                  }
                >
                  <Clipboard className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                  <span>貼付</span>
                </button>
              )}

              {currentSelectedHasContours && (
                <button
                  type="button"
                  disabled={currentSelectedLocked}
                  onClick={() => onClearGlyph(selectedUnicode)}
                  aria-label="この文字のパスを消去"
                  className="min-w-[36px] min-h-[36px] sm:min-w-0 sm:min-h-0 px-2 py-1.5 sm:p-1 flex items-center justify-center rounded text-[10px] font-bold hover:bg-rose-100 dark:hover:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-transparent hover:border-rose-300 transition-colors cursor-pointer disabled:opacity-40 disabled:pointer-events-none disabled:cursor-not-allowed"
                  title={
                    currentSelectedLocked
                      ? '編集ロック中のため消去できません'
                      : 'この文字のパスを消去'
                  }
                >
                  <Trash2 className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Pagination Footer (creation grid only) */}
        {panelTab === 'create' && totalPages > 1 && (
          <div
            className={`p-2 border-t flex flex-col gap-1.5 shrink-0 pb-[max(env(safe-area-inset-bottom),10px)] ${themeClasses.toolbarBg} ${themeClasses.border}`}
          >
            <div className="flex items-center justify-between text-[11px] px-0.5">
              <span className={`font-medium tabular-nums ${themeClasses.textMuted}`}>
                全<strong className={`font-bold ${themeClasses.textPrimary}`}>{charList.length.toLocaleString()}字</strong>中{' '}
                <span className="font-mono tabular-nums">{Math.min(charList.length, (validPage - 1) * pageSize + 1)}〜{Math.min(charList.length, validPage * pageSize)}字</span>
              </span>
              <span
                className={`font-mono tabular-nums text-[11px] font-bold px-1.5 py-0.5 rounded border ${themeClasses.accentBadge}`}
              >
                {validPage} / {totalPages} ページ
              </span>
            </div>

            <GlyphGridPagination
              validPage={validPage}
              totalPages={totalPages}
              setCurrentPage={setCurrentPage}
              isLight={isLight}
              themeClasses={themeClasses}
            />
          </div>
        )}
      </aside>

      {/* Floating Right-Click Context Menu */}
      <GlyphGridContextMenu
        contextMenu={contextMenu}
        onClose={() => setContextMenu(null)}
        isLight={isLight}
        theme={theme}
        project={project}
        hasClipboard={hasClipboard}
        contextMenuRef={contextMenuRef}
        onSelectGlyph={onSelectGlyph}
        onCopyGlyph={onCopyGlyph}
        onPasteGlyph={onPasteGlyph}
        onClearGlyph={onClearGlyph}
        onGenerateDakutenTarget={onGenerateDakutenTarget}
        onDuplicateAsSmallKana={onDuplicateAsSmallKana}
      />
    </>
  );
});