import React, { useState, useMemo, useCallback, memo, useEffect, useRef } from 'react';
import {
  Copy,
  Clipboard,
  Trash2,
} from 'lucide-react';
import { isLightTheme, getThemeClasses } from '../utils/theme';
import {
  ContextMenuState,
  GlyphGridProps,
  GlyphGridCard,
  GlyphGridContextMenu,
  GlyphGridToolbar,
  GlyphGridPagination,
  useGlyphGridFilter,
} from './glyphgrid';

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

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    if (contextMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
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
  });

  const handleOpenContextMenu = useCallback(
    (
      e: React.MouseEvent,
      item: { char: string; code: number; name?: string }
    ) => {
      e.preventDefault();
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setContextMenu({
        x: Math.min(window.innerWidth - 220, Math.max(10, rect.left)),
        y: Math.min(window.innerHeight - 240, Math.max(10, rect.bottom + 4)),
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

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile/Overlay Click-Outside Dismiss */}
      {effectiveIsOverlay && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-transparent sm:hidden z-35 pointer-events-auto"
        />
      )}

      <aside
        style={{
          width: effectiveIsOverlay ? undefined : `${sidebarWidth}px`,
        }}
        className={`${
          effectiveIsOverlay
            ? 'fixed inset-y-0 left-0 z-40 w-full sm:w-80 md:w-[340px] shadow-2xl animate-in slide-in-from-left duration-200'
            : 'relative z-10 shadow-none shrink-0'
        } border-r flex flex-col h-full select-none ${isResizing ? '' : 'transition-[width] duration-150'} ${themeClasses.sidebarBg} ${themeClasses.border}`}
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
            title={`左右にドラッグしてサイドバー幅を調整 (${sidebarWidth}px) / ダブルクリックで初期値(330px)にリセット`}
            onDoubleClick={() => {
              setSidebarWidth(330);
              try {
                localStorage.setItem('fontforge_sidebar_width', '330');
              } catch (error) {
                console.warn('Failed to persist sidebar width:', error);
              }
            }}
          >
            <div
              className={`w-1 h-14 rounded-full transition-all flex items-center justify-center ${
                isResizing
                  ? 'bg-emerald-500 scale-110'
                  : 'bg-stone-300 dark:bg-stone-600 group-hover:bg-emerald-500 group-hover:scale-105'
              }`}
            >
              <div className="w-0.5 h-6 rounded-full bg-white/50 dark:bg-black/40" />
            </div>
          </div>
        )}

        {/* Toolbar & Filter Component */}
        <GlyphGridToolbar
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
            gridDensity === 'large'
              ? 'grid-cols-3'
              : gridDensity === 'medium'
              ? 'grid-cols-4'
              : 'grid-cols-5'
          } ${themeClasses.canvasOuterBg}`}
          style={{
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

        {/* Selected Glyph Quick Action Dock */}
        {currentSelectedGlyph && (
          <div
            className={`px-3 py-1.5 border-t flex items-center justify-between text-xs shrink-0 ${themeClasses.subtoolbarBg} ${themeClasses.border}`}
          >
            <div className="flex items-center space-x-1.5 min-w-0">
              <span className={`font-bold text-sm ${themeClasses.accentText}`}>
                {currentSelectedGlyph.char || String.fromCodePoint(currentSelectedGlyph.unicode)}
              </span>
              <span className={`text-[10px] font-mono ${themeClasses.textMuted}`}>
                U+{currentSelectedGlyph.unicode.toString(16).toUpperCase().padStart(4, '0')}
              </span>
              {currentSelectedHasContours && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${themeClasses.accentBadge}`}>
                  {currentSelectedGlyph.contours.length}画
                </span>
              )}
            </div>

            <div className="flex items-center space-x-1 shrink-0">
              {currentSelectedHasContours && (
                <button
                  onClick={() => onCopyGlyph(currentSelectedGlyph.unicode)}
                  className={`p-1 rounded text-[10px] font-bold flex items-center gap-0.5 border cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} hover:${themeClasses.activeToolHover}`}
                  title="選択中の字形をコピー"
                >
                  <Copy className="w-3 h-3" />
                  <span className="hidden sm:inline">コピー</span>
                </button>
              )}

              {hasClipboard && (
                <button
                  onClick={() => onPasteGlyph(currentSelectedGlyph.unicode)}
                  className={`px-1.5 py-1 rounded text-[10px] font-bold ${themeClasses.accentBtn} flex items-center gap-0.5 cursor-pointer`}
                  title="コピーした形をこの文字に貼り付け"
                >
                  <Clipboard className="w-3 h-3" />
                  <span>貼付</span>
                </button>
              )}

              {currentSelectedHasContours && (
                <button
                  onClick={() => onClearGlyph(currentSelectedGlyph.unicode)}
                  className="p-1 rounded text-[10px] font-bold hover:bg-rose-100 dark:hover:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-transparent hover:border-rose-300 transition-colors cursor-pointer"
                  title="この文字のパスを消去"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div
            className={`p-2 border-t flex flex-col gap-1.5 shrink-0 pb-[max(env(safe-area-inset-bottom),10px)] ${themeClasses.toolbarBg} ${themeClasses.border}`}
          >
            <div className="flex items-center justify-between text-[11px] px-0.5">
              <span className={`font-medium ${themeClasses.textMuted}`}>
                全<strong className={`font-bold ${themeClasses.textPrimary}`}>{charList.length.toLocaleString()}字</strong>中{' '}
                <span className="font-mono">{Math.min(charList.length, (validPage - 1) * pageSize + 1)}〜{Math.min(charList.length, validPage * pageSize)}字</span>
              </span>
              <span
                className={`font-mono text-[11px] font-bold px-1.5 py-0.2 rounded border ${themeClasses.accentBadge}`}
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
