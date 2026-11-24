import React, { useState, useMemo, useEffect, useRef } from 'react';
import { FontProject, GlyphData } from '../../types';
import { UNICODE_CATEGORIES, getCategoryCharList } from '../../data/unicodeTables';
import { STORAGE_KEYS, getStorageItem, setStorageItem } from '../../utils/storageKeys';
import { GridDensity } from './types';

export interface UseGlyphGridFilterProps {
  project: FontProject;
  onSelectGlyph: (unicode: number, char: string) => void;
  onClose: () => void;
  isOverlay?: boolean;
}

const CATEGORY_COUNT_MAP: Record<string, number> = (() => {
  const map: Record<string, number> = {};
  for (const cat of UNICODE_CATEGORIES) {
    map[cat.id] = getCategoryCharList(cat).length;
  }
  return map;
})();

const formatCategoryCount = (id: string): string =>
  `${(CATEGORY_COUNT_MAP[id] ?? 0).toLocaleString()}字`;

export const isGlyphCompleted = (g?: GlyphData | null): boolean => {
  if (!g) return false;
  const hasVector = Array.isArray(g.contours) && g.contours.length > 0;
  if (hasVector) return true;
  return Boolean(
    g.pixelData && Array.isArray(g.pixelData.data) && g.pixelData.data.some((d) => d === 1)
  );
};

const getDefaultSidebarWidth = () => {
  if (typeof window !== 'undefined' && window.innerWidth >= 1280) {
    return 304;
  }
  return 264;
};

const clampSidebarWidth = (width: number) => {
  const maxW =
    typeof window !== 'undefined'
      ? Math.max(320, Math.min(window.innerWidth * 0.65, 760))
      : 760;
  return Math.max(232, Math.min(maxW, Math.round(width)));
};

export function useGlyphGridFilter({
  project,
  onSelectGlyph,
  onClose,
  isOverlay = false,
}: UseGlyphGridFilterProps) {
  const [activeCategoryId, setActiveCategoryId] = useState<string>('hiragana');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const [customCharInput, setCustomCharInput] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [gridDensity, setGridDensity] = useState<GridDensity>('medium');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState<boolean>(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategoryId, searchQuery, statusFilter, gridDensity]);

  // Close custom category dropdown on outside pointerdown or Escape
  useEffect(() => {
    const handleCategoryClickOutside = (e: PointerEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
    };
    const handleDropdownKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCategoryDropdownOpen(false);
      }
    };
    if (isCategoryDropdownOpen) {
      document.addEventListener('pointerdown', handleCategoryClickOutside);
      window.addEventListener('keydown', handleDropdownKeyDown);
      return () => {
        document.removeEventListener('pointerdown', handleCategoryClickOutside);
        window.removeEventListener('keydown', handleDropdownKeyDown);
      };
    }
  }, [isCategoryDropdownOpen]);

  // Resizable sidebar width with LocalStorage persistence
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    const saved = getStorageItem(STORAGE_KEYS.SIDEBAR_WIDTH);
    if (saved) {
      const val = Number.parseInt(saved, 10);
      if (Number.isFinite(val) && val >= 220 && val <= 800) {
        return clampSidebarWidth(val);
      }
    }
    return getDefaultSidebarWidth();
  });
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [isFilterExpanded, setIsFilterExpanded] = useState<boolean>(false);
  const [isSearchHeaderExpanded, setIsSearchHeaderExpanded] = useState<boolean>(true);
  const cleanupDragRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      cleanupDragRef.current?.();
      cleanupDragRef.current = null;
    };
  }, []);

  // Drag resizer handler for left sidebar
  const handleResizeStart = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();

    cleanupDragRef.current?.();

    const target = e.currentTarget as HTMLElement;
    const pointerId = e.pointerId;
    try {
      target.setPointerCapture?.(pointerId);
    } catch {
      // ignore unsupported pointer capture
    }

    setIsResizing(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const startX = e.clientX;
    const startWidth = sidebarWidth;
    let rafId: number | null = null;
    let latestClientX = startX;

    const finishDrag = (persist: boolean) => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';

      try {
        if (target.hasPointerCapture?.(pointerId)) {
          target.releasePointerCapture(pointerId);
        }
      } catch {
        // ignore
      }

      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerCancel);
      cleanupDragRef.current = null;

      if (persist) {
        const finalWidth = clampSidebarWidth(startWidth + (latestClientX - startX));
        setSidebarWidth(finalWidth);
        setStorageItem(STORAGE_KEYS.SIDEBAR_WIDTH, String(finalWidth));
      }
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      moveEvent.preventDefault();
      latestClientX = moveEvent.clientX;
      const newWidth = clampSidebarWidth(startWidth + (latestClientX - startX));

      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setSidebarWidth(newWidth);
      });
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      if (upEvent.pointerId !== pointerId) return;
      latestClientX = upEvent.clientX;
      finishDrag(true);
    };

    const handlePointerCancel = (cancelEvent: PointerEvent) => {
      if (cancelEvent.pointerId !== pointerId) return;
      finishDrag(true);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerCancel);

    cleanupDragRef.current = () => finishDrag(false);
  };

  const activeCategory = useMemo(() => {
    return UNICODE_CATEGORIES.find((c) => c.id === activeCategoryId) || UNICODE_CATEGORIES[0];
  }, [activeCategoryId]);

  // Compute character list for current category
  const rawCategoryList = useMemo(() => {
    if (activeCategoryId === 'modified') {
      const glyphs = (Object.values(project.glyphs) as GlyphData[])
        .filter((g) => isGlyphCompleted(g))
        .sort((a, b) => a.unicode - b.unicode);
      return glyphs.map((g) => {
        let displayChar = g.char;
        if (!displayChar) {
          try {
            displayChar = g.unicode > 0 && g.unicode <= 0x10ffff ? String.fromCodePoint(g.unicode) : '';
          } catch {
            displayChar = '';
          }
        }
        return {
          char: displayChar,
          code: g.unicode,
          name: `U+${g.unicode.toString(16).toUpperCase().padStart(4, '0')}`,
        };
      });
    }
    return getCategoryCharList(activeCategory);
  }, [activeCategory, activeCategoryId, project.glyphs]);

  // Stable key representing which glyphs are completed (vector contours or pixel grid data)
  const completedGlyphKeys = useMemo(() => {
    const completedCodes: number[] = [];
    for (const [codeStr, item] of Object.entries(project.glyphs)) {
      const g = item as GlyphData | undefined;
      if (isGlyphCompleted(g)) {
        completedCodes.push(Number(codeStr));
      }
    }
    return completedCodes.sort((a, b) => a - b).join(',');
  }, [project.glyphs]);

  const completedSet = useMemo(() => {
    const set = new Set<number>();
    if (!completedGlyphKeys) return set;
    for (const codeStr of completedGlyphKeys.split(',')) {
      if (codeStr) set.add(Number(codeStr));
    }
    return set;
  }, [completedGlyphKeys]);

  // Category completion statistics
  const categoryStats = useMemo(() => {
    const total = rawCategoryList.length;
    let completed = 0;
    for (const item of rawCategoryList) {
      if (completedSet.has(item.code)) {
        completed++;
      }
    }
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percent };
  }, [rawCategoryList, completedSet]);

  // Filtered by search & status
  const charList = useMemo(() => {
    let list = rawCategoryList;

    if (statusFilter === 'completed') {
      list = list.filter((item) => completedSet.has(item.code));
    } else if (statusFilter === 'pending') {
      list = list.filter((item) => !completedSet.has(item.code));
    }

    if (!searchQuery.trim()) {
      return list;
    }

    const query = searchQuery.trim().toLowerCase();
    return list.filter((item) => {
      const hex = item.code.toString(16).toLowerCase();
      const hexPadded = hex.padStart(4, '0');
      const uHex = `u+${hex}`;
      const uHexPadded = `u+${hexPadded}`;
      const oxHex = `0x${hex}`;
      const oxHexPadded = `0x${hexPadded}`;
      const char = item.char.toLowerCase();
      const name = (item.name || '').toLowerCase();
      return (
        char.includes(query) ||
        hex.includes(query) ||
        hexPadded.includes(query) ||
        uHex.includes(query) ||
        uHexPadded.includes(query) ||
        oxHex.includes(query) ||
        oxHexPadded.includes(query) ||
        name.includes(query) ||
        (query === '全角' && (item.code === 0x3000 || (item.code >= 0xff01 && item.code <= 0xff5e))) ||
        (query === '空白' && (item.code === 0x3000 || item.code === 0x0020)) ||
        (query === 'スペース' && (item.code === 0x3000 || item.code === 0x0020))
      );
    });
  }, [rawCategoryList, statusFilter, searchQuery, completedSet]);

  const pageSize = useMemo(() => {
    if (charList.length <= 120) {
      return 150;
    }
    return gridDensity === 'large' ? 90 : gridDensity === 'medium' ? 120 : 150;
  }, [charList.length, gridDensity]);

  const totalPages = Math.max(1, Math.ceil(charList.length / pageSize));
  const validPage = Math.max(1, Math.min(currentPage, totalPages));

  // Automatically keep currentPage synchronized when filtered list or totalPages shrinks
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    } else if (currentPage < 1) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  const paginatedList = useMemo(() => {
    const start = (validPage - 1) * pageSize;
    return charList.slice(start, start + pageSize);
  }, [charList, validPage, pageSize]);

  const handleAddCustomChar = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customCharInput.trim();
    if (!trimmed) return;
    const char = [...trimmed][0];
    const code = char ? (char.codePointAt(0) ?? 0) : 0;
    if (code > 0) {
      onSelectGlyph(code, char);
    }
    setCustomCharInput('');
    if (isOverlay || window.innerWidth < 640) {
      onClose();
    }
  };

  const modifiedCount = completedSet.size;

  const categoryGroups = useMemo(() => [
    {
      groupName: '作成状況',
      items: [
        { id: 'modified', name: '作成済み文字', count: `${modifiedCount.toLocaleString()}字` },
      ],
    },
    {
      groupName: 'かな',
      items: [
        { id: 'hiragana', name: 'ひらがな', count: formatCategoryCount('hiragana') },
        { id: 'katakana', name: 'カタカナ', count: formatCategoryCount('katakana') },
      ],
    },
    {
      groupName: '英数・記号',
      items: [
        { id: 'basic_latin_alnum', name: '半角英数', count: formatCategoryCount('basic_latin_alnum') },
        { id: 'ascii_symbols', name: '半角記号', count: formatCategoryCount('ascii_symbols') },
        { id: 'fullwidth_alnum', name: '全角英数', count: formatCategoryCount('fullwidth_alnum') },
        { id: 'symbols', name: '和文約物・全角記号', count: formatCategoryCount('symbols') },
        { id: 'vertical_forms', name: '縦書き約物・記号', count: formatCategoryCount('vertical_forms') },
      ],
    },
    {
      groupName: '小学校配当漢字 (教育漢字)',
      items: [
        { id: 'grade1', name: '小学1年漢字', count: formatCategoryCount('grade1') },
        { id: 'grade2', name: '小学2年漢字', count: formatCategoryCount('grade2') },
        { id: 'grade3', name: '小学3年漢字', count: formatCategoryCount('grade3') },
        { id: 'grade4', name: '小学4年漢字', count: formatCategoryCount('grade4') },
        { id: 'grade5', name: '小学5年漢字', count: formatCategoryCount('grade5') },
        { id: 'grade6', name: '小学6年漢字', count: formatCategoryCount('grade6') },
      ],
    },
    {
      groupName: '常用・JIS水準漢字',
      items: [
        { id: 'jouyou', name: '常用漢字', count: formatCategoryCount('jouyou') },
        { id: 'jis_1', name: 'JIS第1水準漢字', count: formatCategoryCount('jis_1') },
        { id: 'jis_2', name: 'JIS第2水準漢字', count: formatCategoryCount('jis_2') },
        { id: 'jis_3', name: 'JIS第3水準漢字', count: formatCategoryCount('jis_3') },
        { id: 'jis_4', name: 'JIS第4水準漢字', count: formatCategoryCount('jis_4') },
      ],
    },
    {
      groupName: 'その他',
      items: [
        { id: 'halfwidth', name: '半角カタカナ', count: formatCategoryCount('halfwidth') },
        { id: 'gaiji', name: '外字 (私用領域)', count: formatCategoryCount('gaiji') },
      ],
    },
  ], [modifiedCount]);

  const activeCategoryDisplayName = useMemo(() => {
    if (activeCategoryId === 'modified') {
      return `作成済み (${modifiedCount.toLocaleString()}字)`;
    }
    const found = UNICODE_CATEGORIES.find((c) => c.id === activeCategoryId);
    if (!found) return `ひらがな (${formatCategoryCount('hiragana')})`;
    if (found.id === 'hiragana') return `ひらがな (${formatCategoryCount('hiragana')})`;
    if (found.id === 'katakana') return `カタカナ (${formatCategoryCount('katakana')})`;
    if (found.id === 'basic_latin_alnum') return `半角英数 (${formatCategoryCount('basic_latin_alnum')})`;
    if (found.id === 'ascii_symbols') return `半角記号 (${formatCategoryCount('ascii_symbols')})`;
    if (found.id === 'fullwidth_alnum') return `全角英数 (${formatCategoryCount('fullwidth_alnum')})`;
    if (found.id === 'symbols') return `和文約物・記号 (${formatCategoryCount('symbols')})`;
    if (found.id === 'vertical_forms') return `縦書き約物 (${formatCategoryCount('vertical_forms')})`;
    if (found.id === 'grade1') return `小学1年漢字 (${formatCategoryCount('grade1')})`;
    if (found.id === 'grade2') return `小学2年漢字 (${formatCategoryCount('grade2')})`;
    if (found.id === 'grade3') return `小学3年漢字 (${formatCategoryCount('grade3')})`;
    if (found.id === 'grade4') return `小学4年漢字 (${formatCategoryCount('grade4')})`;
    if (found.id === 'grade5') return `小学5年漢字 (${formatCategoryCount('grade5')})`;
    if (found.id === 'grade6') return `小学6年漢字 (${formatCategoryCount('grade6')})`;
    if (found.id === 'jouyou') return `常用漢字 (${formatCategoryCount('jouyou')})`;
    if (found.id === 'jis_1') return `JIS第1水準 (${formatCategoryCount('jis_1')})`;
    if (found.id === 'jis_2') return `JIS第2水準 (${formatCategoryCount('jis_2')})`;
    if (found.id === 'jis_3') return `JIS第3水準 (${formatCategoryCount('jis_3')})`;
    if (found.id === 'jis_4') return `JIS第4水準 (${formatCategoryCount('jis_4')})`;
    if (found.id === 'halfwidth') return `半角カタカナ (${formatCategoryCount('halfwidth')})`;
    if (found.id === 'gaiji') return `外字・私用領域 (${formatCategoryCount('gaiji')})`;
    return found.name;
  }, [activeCategoryId, modifiedCount]);

  const quickCategoryTabs = useMemo(() => [
    { id: 'modified', label: `作成済 (${modifiedCount})` },
    { id: 'hiragana', label: 'ひらがな' },
    { id: 'katakana', label: 'カタカナ' },
    { id: 'basic_latin_alnum', label: '半角英数' },
    { id: 'symbols', label: '記号' },
    { id: 'grade1', label: '小1' },
    { id: 'grade2', label: '小2' },
    { id: 'grade3', label: '小3' },
    { id: 'grade4', label: '小4' },
    { id: 'grade5', label: '小5' },
    { id: 'grade6', label: '小6' },
    { id: 'jouyou', label: '常用' },
    { id: 'jis_1', label: 'JIS第1' },
    { id: 'jis_2', label: 'JIS第2' },
    { id: 'jis_3', label: 'JIS第3' },
    { id: 'jis_4', label: 'JIS第4' },
    { id: 'halfwidth', label: '半角カナ' },
    { id: 'gaiji', label: '外字' },
  ], [modifiedCount]);

  return {
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
    completedSet,
    categoryStats,
    charList,
    pageSize,
    totalPages,
    validPage,
    paginatedList,
    modifiedCount,
    categoryGroups,
    activeCategoryDisplayName,
    quickCategoryTabs,
  };
}
