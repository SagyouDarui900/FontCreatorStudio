import React, { memo, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Lock } from 'lucide-react';
import { GlyphPreviewSvg } from '../GlyphPreviewSvg';
import { getThemeClasses, type ThemeMode } from '../../utils/theme';
import type { FontProject, GlyphData } from '../../types';
import {
  CHARACTER_LIST_GROUPS,
  countWritten,
  filterCharacterListChars,
  filterRadicalSections,
  getCharacterListChars,
  getRadicalSections,
  isGlyphWritten,
  uniqueChars,
  type CharacterListGroupId,
  type CharacterListItem,
} from './characterListData';

export interface CharacterListTabProps {
  project: FontProject;
  selectedUnicode: number;
  onSelectGlyph: (unicode: number, char: string) => void;
  onContextMenu?: (e: React.MouseEvent, item: CharacterListItem) => void;
  theme: ThemeMode;
  activeGroup?: CharacterListGroupId;
  onChangeActiveGroup?: (group: CharacterListGroupId) => void;
  searchQuery?: string;
  onChangeSearchQuery?: (query: string) => void;
}

type ThemeClasses = ReturnType<typeof getThemeClasses>;

interface CharacterCellProps {
  item: CharacterListItem;
  glyph: GlyphData | undefined;
  unitsPerEm: number;
  isSelected: boolean;
  onSelect: (code: number, char: string) => void;
  onContextMenu?: (e: React.MouseEvent, item: CharacterListItem) => void;
  themeClasses: ThemeClasses;
}

/**
 * One character in the specimen list. A written glyph shows its own
 * outlines; an unwritten glyph shows the character itself in a faint
 * semi-transparent system font, so missing characters stay visible.
 */
const CharacterCell = memo(
  ({ item, glyph, unitsPerEm, isSelected, onSelect, onContextMenu, themeClasses }: CharacterCellProps) => {
    const written = isGlyphWritten(glyph);
    const codeLabel = `U+${item.code.toString(16).toUpperCase().padStart(4, '0')}`;
    return (
      <button
        type="button"
        onClick={() => onSelect(item.code, item.char)}
        onContextMenu={(e) => {
          if (onContextMenu) {
            e.stopPropagation();
            onContextMenu(e, item);
          }
        }}
        title={written ? `${item.char} ${codeLabel}` : `${item.char} ${codeLabel}（未作成）`}
        aria-label={written ? `${item.char} ${codeLabel}` : `${item.char} ${codeLabel} 未作成`}
        aria-pressed={isSelected}
        className={`relative w-full aspect-square min-w-0 rounded flex items-center justify-center cursor-pointer border transition-colors ${
          isSelected
            ? `${themeClasses.accentBadge} border-current`
            : `${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.activeToolHover}`
        }`}
      >
        {glyph?.locked && (
          <Lock
            className="w-2.5 h-2.5 text-amber-500 absolute top-0.5 right-0.5 pointer-events-none"
            aria-hidden="true"
          />
        )}
        {written && glyph ? (
          <GlyphPreviewSvg
            contours={glyph.contours}
            unitsPerEm={unitsPerEm}
            className="w-full h-full p-[3px]"
          />
        ) : (
          <span className="opacity-30 text-[20px] leading-none select-none">
            {item.char}
          </span>
        )}
      </button>
    );
  }
);

function CharacterCells({
  chars,
  glyphs,
  unitsPerEm,
  selectedUnicode,
  onSelect,
  onContextMenu,
  themeClasses,
}: {
  chars: CharacterListItem[];
  glyphs: Record<number, GlyphData>;
  unitsPerEm: number;
  selectedUnicode: number;
  onSelect: (code: number, char: string) => void;
  onContextMenu?: (e: React.MouseEvent, item: CharacterListItem) => void;
  themeClasses: ThemeClasses;
}) {
  return (
    <div
      className="grid gap-1 content-start"
      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(36px, 1fr))' }}
    >
      {chars.map((item) => (
        <CharacterCell
          key={item.code}
          item={item}
          glyph={glyphs[item.code]}
          unitsPerEm={unitsPerEm}
          isSelected={selectedUnicode === item.code}
          onSelect={onSelect}
          onContextMenu={onContextMenu}
          themeClasses={themeClasses}
        />
      ))}
    </div>
  );
}

/**
 * Lightweight virtualization for the character list.
 *
 * The radical group holds 10,050 characters; rendering them all puts
 * 10,050 cells in the DOM. Instead the list is laid out as rows (one
 * header row per radical section plus fixed-height grid rows) and only
 * the rows intersecting the viewport — plus a few overscan rows above
 * and below — are mounted. Row geometry is computed from the measured
 * list width, so it must match the rendered CSS exactly:
 * - cells are square with a 36px minimum width and a 4px gap
 *   (the same `minmax(36px, 1fr)` / `gap-1` as the non-virtualized grid),
 * - a section header is a fixed 28px (`h-7`) row,
 * - sections are separated by a 12px gap (`mb-3`).
 * When the container cannot be measured (width or height is 0, e.g. in
 * jsdom or while hidden) virtualization is off and the whole list is
 * rendered, so the list stays usable without a measurable layout.
 */
export const CHARACTER_LIST_CELL_MIN_WIDTH = 36;
export const CHARACTER_LIST_GRID_GAP = 4;
export const CHARACTER_LIST_LIST_PADDING = 8;
export const CHARACTER_LIST_SECTION_HEADER_HEIGHT = 28;
export const CHARACTER_LIST_SECTION_GAP = 12;
export const CHARACTER_LIST_OVERSCAN_ROWS = 2;

export interface VirtualListSection {
  id: string;
  header: { char: string; name: string; strokes: number; count: number } | null;
  chars: CharacterListItem[];
}

export type VirtualRow =
  | {
      kind: 'header';
      sectionId: string;
      sectionIndex: number;
      top: number;
      height: number;
    }
  | {
      kind: 'cells';
      sectionId: string;
      sectionIndex: number;
      start: number;
      count: number;
      top: number;
      height: number;
    };

export interface VirtualLayout {
  rows: VirtualRow[];
  totalHeight: number;
  columns: number;
  cellWidth: number;
}

/**
 * Lay out sections as rows for the given available grid width
 * (the list width minus the 8px side insets). `totalHeight` excludes
 * the outer 8px top/bottom padding, which the caller adds.
 */
export function computeVirtualLayout(
  sections: VirtualListSection[],
  innerWidth: number
): VirtualLayout {
  const columns = Math.max(
    1,
    Math.floor(
      (innerWidth + CHARACTER_LIST_GRID_GAP) /
        (CHARACTER_LIST_CELL_MIN_WIDTH + CHARACTER_LIST_GRID_GAP)
    )
  );
  const cellWidth =
    (innerWidth - (columns - 1) * CHARACTER_LIST_GRID_GAP) / columns;
  const rowPitch = cellWidth + CHARACTER_LIST_GRID_GAP;
  const rows: VirtualRow[] = [];
  let top = 0;
  sections.forEach((section, sectionIndex) => {
    if (section.header) {
      rows.push({
        kind: 'header',
        sectionId: section.id,
        sectionIndex,
        top,
        height: CHARACTER_LIST_SECTION_HEADER_HEIGHT,
      });
      top += CHARACTER_LIST_SECTION_HEADER_HEIGHT;
    }
    const rowCount = Math.ceil(section.chars.length / columns);
    for (let r = 0; r < rowCount; r++) {
      const start = r * columns;
      rows.push({
        kind: 'cells',
        sectionId: section.id,
        sectionIndex,
        start,
        count: Math.min(columns, section.chars.length - start),
        top,
        height: cellWidth,
      });
      top += rowPitch;
    }
    // The last grid row has no trailing gap; the section gap follows.
    if (rowCount > 0) top -= CHARACTER_LIST_GRID_GAP;
    top += CHARACTER_LIST_SECTION_GAP;
  });
  return { rows, totalHeight: top, columns, cellWidth };
}

/** Half-open row range [start, end) covering the viewport plus overscan. */
export function getVisibleRowRange(
  rows: VirtualRow[],
  scrollTop: number,
  viewportHeight: number,
  overscanRows: number = CHARACTER_LIST_OVERSCAN_ROWS
): { start: number; end: number } {
  if (rows.length === 0) return { start: 0, end: 0 };
  const viewTop = scrollTop;
  const viewBottom = scrollTop + viewportHeight;
  let first = rows.length - 1;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].top + rows[i].height > viewTop) {
      first = i;
      break;
    }
  }
  let last = first;
  for (let i = first; i < rows.length; i++) {
    if (rows[i].top >= viewBottom) break;
    last = i;
  }
  return {
    start: Math.max(0, first - overscanRows),
    end: Math.min(rows.length, last + 1 + overscanRows),
  };
}

/** Top offset of a section header within the laid-out list, if present. */
export function getSectionScrollOffset(
  rows: VirtualRow[],
  sectionId: string
): number | undefined {
  for (const row of rows) {
    if (row.kind === 'header' && row.sectionId === sectionId) return row.top;
  }
  return undefined;
}

function SectionHeader({
  section,
  themeClasses,
}: {
  section: VirtualListSection;
  themeClasses: ThemeClasses;
}) {
  const header = section.header;
  if (!header) return null;
  return (
    <div
      className={`flex items-center gap-1.5 px-1 h-7 text-xs ${themeClasses.textMuted}`}
    >
      <span className={`text-base font-bold leading-none ${themeClasses.textPrimary}`}>
        {header.char}
      </span>
      <span className="font-bold truncate">{header.name}</span>
      <span className="shrink-0 tabular-nums">
        {header.strokes}画・{header.count}字
      </span>
    </div>
  );
}

export const CharacterListTab: React.FC<CharacterListTabProps> = ({
  project,
  selectedUnicode,
  onSelectGlyph,
  onContextMenu,
  theme,
  activeGroup: controlledActiveGroup,
  onChangeActiveGroup,
  searchQuery: controlledSearchQuery,
  onChangeSearchQuery,
}) => {
  const themeClasses = getThemeClasses(theme);
  const [internalActiveGroup, setInternalActiveGroup] = useState<CharacterListGroupId>('hiragana');
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const [isRadicalIndexOpen, setIsRadicalIndexOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 640 && window.innerHeight >= 760 : true
  );
  const activeGroup = controlledActiveGroup ?? internalActiveGroup;
  const setActiveGroup = onChangeActiveGroup ?? setInternalActiveGroup;
  const searchQuery = controlledSearchQuery ?? internalSearchQuery;
  const setSearchQuery = onChangeSearchQuery ?? setInternalSearchQuery;
  const scrollRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [scrollTop, setScrollTop] = useState(0);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const unitsPerEm = project.metadata?.unitsPerEm || 1000;
  const glyphs = project.glyphs || {};

  const flatChars = useMemo(
    () => (activeGroup === 'radical' ? [] : getCharacterListChars(activeGroup)),
    [activeGroup]
  );
  const radicalSections = useMemo(
    () => (activeGroup === 'radical' ? getRadicalSections() : []),
    [activeGroup]
  );
  const isSearching = searchQuery.trim() !== '';
  // Filtering happens before the layout calculation. In the radical
  // group a matching radical keeps all its kanji; otherwise only the
  // matching kanji are kept (see filterRadicalSections).
  const filteredFlatChars = useMemo(
    () => filterCharacterListChars(flatChars, searchQuery),
    [flatChars, searchQuery]
  );
  const filteredRadicalSections = useMemo(
    () => filterRadicalSections(radicalSections, searchQuery),
    [radicalSections, searchQuery]
  );
  // Progress always covers the whole group, not the search result.
  const progressChars = useMemo(() => {
    if (activeGroup === 'radical') {
      return uniqueChars(radicalSections.flatMap((section) => section.chars));
    }
    return flatChars;
  }, [activeGroup, flatChars, radicalSections]);
  const writtenCount = useMemo(
    () => countWritten(progressChars, glyphs),
    [progressChars, glyphs]
  );
  const totalCount = progressChars.length;
  const progressPercent = totalCount > 0 ? Math.round((writtenCount / totalCount) * 100) : 0;
  const matchCount = useMemo(() => {
    if (activeGroup === 'radical') {
      return filteredRadicalSections.reduce((sum, section) => sum + section.chars.length, 0);
    }
    return filteredFlatChars.length;
  }, [activeGroup, filteredFlatChars, filteredRadicalSections]);

  const sections = useMemo<VirtualListSection[]>(() => {
    if (activeGroup === 'radical') {
      return filteredRadicalSections.map((section) => ({
        id: section.id,
        header: {
          char: section.char,
          name: section.name,
          strokes: section.strokes,
          count: section.chars.length,
        },
        chars: section.chars,
      }));
    }
    return [{ id: activeGroup, header: null, chars: filteredFlatChars }];
  }, [activeGroup, filteredFlatChars, filteredRadicalSections]);

  // Measure the list area. The spacer's clientWidth (minus the side
  // insets) is the exact width the grid rows get, so the computed row
  // heights match the rendered cells even with a scrollbar present.
  const isEmptySearch = isSearching && matchCount === 0;
  const virtualized = containerSize.width > 0 && containerSize.height > 0;
  useLayoutEffect(() => {
    const updateSize = () => {
      const scroller = scrollRef.current;
      if (!scroller) return;
      const spacer = spacerRef.current;
      const measuredWidth = (spacer ? spacer.clientWidth : scroller.clientWidth) - 2 * CHARACTER_LIST_LIST_PADDING;
      const width = Math.max(0, measuredWidth);
      const height = scroller.clientHeight;
      setContainerSize((prev) =>
        prev.width === width && prev.height === height ? prev : { width, height }
      );
    };
    updateSize();
    if (typeof ResizeObserver === 'undefined') return;
    let rafId: number | null = null;
    const scheduleUpdateSize = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        updateSize();
      });
    };
    const observer = new ResizeObserver(scheduleUpdateSize);
    if (spacerRef.current) observer.observe(spacerRef.current);
    if (scrollRef.current) observer.observe(scrollRef.current);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [virtualized, isEmptySearch]);

  // Switching groups or changing the search starts at the top of the list.
  useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    setScrollTop(0);
  }, [activeGroup, searchQuery]);

  const layout = useMemo(
    () => computeVirtualLayout(sections, containerSize.width),
    [sections, containerSize.width]
  );
  const visibleRange = virtualized
    ? getVisibleRowRange(layout.rows, scrollTop, containerSize.height)
    : { start: 0, end: layout.rows.length };

  const scrollToSection = (sectionId: string) => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    if (virtualized) {
      const offset = getSectionScrollOffset(layout.rows, sectionId);
      if (offset !== undefined) {
        scroller.scrollTop = CHARACTER_LIST_LIST_PADDING + offset;
      }
      return;
    }
    const el = sectionRefs.current.get(sectionId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Group selector */}
      <div
        className={`flex flex-wrap gap-1 px-2 py-1.5 border-b shrink-0 ${themeClasses.border}`}
        role="tablist"
        aria-label="文字の種類"
      >
        {CHARACTER_LIST_GROUPS.map((group) => (
          <button
            key={group.id}
            type="button"
            role="tab"
            aria-selected={activeGroup === group.id}
            onClick={() => setActiveGroup(group.id)}
            title={`${group.label}（${group.hint}）`}
            className={`px-1.5 py-0.5 rounded text-[11px] font-bold cursor-pointer border transition-colors ${
              activeGroup === group.id
                ? themeClasses.activeTool
                : `${themeClasses.cardBg} ${themeClasses.activeToolHover}`
            }`}
          >
            {group.label}
          </button>
        ))}
      </div>

      {/* Search & Progress */}
      <div className={`px-2 py-1.5 border-b shrink-0 space-y-1 ${themeClasses.border}`}>
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="検索: あ・U+3042・さんずい"
            aria-label="文字を検索"
            className={`w-full border rounded-md pl-2 pr-7 py-1 text-xs focus:outline-hidden focus:ring-1 focus:ring-emerald-500/40 transition-colors ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary}`}
          />
          {searchQuery !== '' && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="検索をクリア"
              className={`absolute right-2 top-1/2 -translate-y-1/2 ${themeClasses.textMuted} hover:opacity-80 text-xs p-0.5 cursor-pointer`}
            >
              ×
            </button>
          )}
        </div>

        <div className={`flex items-center justify-between gap-2 text-[11px] ${themeClasses.textMuted}`}>
          <span className="tabular-nums truncate">
            作成済み {writtenCount} / {totalCount}字
          </span>
          <div className="flex items-center gap-2 shrink-0 tabular-nums">
            {isSearching && (
              <span className={`font-semibold ${themeClasses.accentText}`}>
                一致 {matchCount}件
              </span>
            )}
            <span>{progressPercent}%</span>
          </div>
        </div>
        <div
          className={`h-[3px] rounded-xs overflow-hidden ${themeClasses.canvasOuterBg}`}
          role="progressbar"
          aria-valuenow={writtenCount}
          aria-valuemin={0}
          aria-valuemax={totalCount}
          aria-label="作成済みの文字の割合"
        >
          <div
            className="h-full bg-emerald-500 transition-[width] duration-200"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Radical index (collapsible) */}
      {activeGroup === 'radical' && (
        <div className={`border-b shrink-0 ${themeClasses.border}`}>
          <button
            type="button"
            onClick={() => setIsRadicalIndexOpen((prev) => !prev)}
            className={`w-full px-2 py-1 flex items-center justify-between text-[10.5px] font-bold cursor-pointer ${themeClasses.textMuted} ${themeClasses.activeToolHover}`}
          >
            <span>部首索引 ({filteredRadicalSections.length}部首)</span>
            {isRadicalIndexOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {isRadicalIndexOpen && (
            <div
              className="flex flex-wrap gap-0.5 px-2 pb-1.5 max-h-[68px] overflow-y-auto"
              aria-label="部首の一覧"
            >
              {filteredRadicalSections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => scrollToSection(section.id)}
                  title={`${section.name}（${section.strokes}画）`}
                  className={`w-6 h-6 rounded text-xs leading-none cursor-pointer border ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.activeToolHover}`}
                >
                  {section.char}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Character list */}
      <div
        ref={scrollRef}
        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
        className={`flex-1 min-h-0 overflow-y-auto overscroll-contain ${themeClasses.canvasOuterBg}`}
      >
        {isEmptySearch ? (
          <div
            className={`flex items-center justify-center px-3 py-8 text-sm ${themeClasses.textMuted}`}
          >
            一致する文字がありません
          </div>
        ) : virtualized ? (
          <div
            ref={spacerRef}
            className="relative"
            style={{
              height: layout.totalHeight + 2 * CHARACTER_LIST_LIST_PADDING,
            }}
          >
            {layout.rows.slice(visibleRange.start, visibleRange.end).map((row) => {
              const section = sections[row.sectionIndex];
              if (row.kind === 'header') {
                return (
                  <div
                    key={`${row.sectionId}-header`}
                    className="absolute"
                    style={{
                      top: CHARACTER_LIST_LIST_PADDING + row.top,
                      left: CHARACTER_LIST_LIST_PADDING,
                      right: CHARACTER_LIST_LIST_PADDING,
                      height: row.height,
                    }}
                  >
                    <SectionHeader section={section} themeClasses={themeClasses} />
                  </div>
                );
              }
              const items = section.chars.slice(row.start, row.start + row.count);
              return (
                <div
                  key={`${row.sectionId}-row-${row.start}`}
                  className="absolute grid gap-1 content-start"
                  style={{
                    top: CHARACTER_LIST_LIST_PADDING + row.top,
                    left: CHARACTER_LIST_LIST_PADDING,
                    right: CHARACTER_LIST_LIST_PADDING,
                    height: row.height,
                    gridTemplateColumns: `repeat(${layout.columns}, minmax(0, 1fr))`,
                  }}
                >
                  {items.map((item) => (
                    <CharacterCell
                      key={item.code}
                      item={item}
                      glyph={glyphs[item.code]}
                      unitsPerEm={unitsPerEm}
                      isSelected={selectedUnicode === item.code}
                      onSelect={onSelectGlyph}
                      onContextMenu={onContextMenu}
                      themeClasses={themeClasses}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        ) : (
          <div ref={spacerRef} className="p-2">
            {activeGroup === 'radical' ? (
              sections.map((section) => (
                <div
                  key={section.id}
                  ref={(el) => {
                    if (el) sectionRefs.current.set(section.id, el);
                    else sectionRefs.current.delete(section.id);
                  }}
                  className="mb-3 scroll-mt-2"
                >
                  <SectionHeader section={section} themeClasses={themeClasses} />
                  <CharacterCells
                    chars={section.chars}
                    glyphs={glyphs}
                    unitsPerEm={unitsPerEm}
                    selectedUnicode={selectedUnicode}
                    onSelect={onSelectGlyph}
                    onContextMenu={onContextMenu}
                    themeClasses={themeClasses}
                  />
                </div>
              ))
            ) : (
              <CharacterCells
                chars={filteredFlatChars}
                glyphs={glyphs}
                unitsPerEm={unitsPerEm}
                selectedUnicode={selectedUnicode}
                onSelect={onSelectGlyph}
                onContextMenu={onContextMenu}
                themeClasses={themeClasses}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};
