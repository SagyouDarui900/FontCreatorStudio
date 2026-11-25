// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CHARACTER_LIST_CELL_MIN_WIDTH,
  CHARACTER_LIST_GRID_GAP,
  CHARACTER_LIST_LIST_PADDING,
  CHARACTER_LIST_OVERSCAN_ROWS,
  CHARACTER_LIST_SECTION_GAP,
  CHARACTER_LIST_SECTION_HEADER_HEIGHT,
  CharacterListTab,
  computeVirtualLayout,
  getSectionScrollOffset,
  getVisibleRowRange,
  type VirtualListSection,
} from './CharacterListTab';
import {
  CHARACTER_LIST_GROUPS,
  countWritten,
  filterCharacterListChars,
  filterRadicalSections,
  getCharacterListChars,
  getRadicalSections,
  isGlyphWritten,
  matchesCharacterListItem,
  matchesRadicalSection,
  toHiragana,
} from './characterListData';
import type { FontProject, GlyphData } from '../../types';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const sampleContour = {
  id: 'c1',
  closed: true,
  nodes: [
    { id: 'n1', x: 100, y: 100, type: 'corner' as const },
    { id: 'n2', x: 500, y: 100, type: 'corner' as const },
    { id: 'n3', x: 500, y: 500, type: 'corner' as const },
  ],
};

function glyph(char: string, withContours: boolean): GlyphData {
  return {
    unicode: char.codePointAt(0) || 0,
    char,
    name: char,
    advanceWidth: 1000,
    lsb: 50,
    contours: withContours ? [sampleContour] : [],
  };
}

function createProject(glyphs: Record<number, GlyphData> = {}): FontProject {
  return {
    id: 'test-proj',
    name: 'TestFont',
    metadata: {
      familyName: 'TestFont',
      styleName: 'Regular',
      designer: 'Tester',
      copyright: 'Copyright (c) 2026',
      license: 'SIL Open Font License 1.1',
      licenseUrl: 'https://openfontlicense.org/',
      version: '1.000',
      unitsPerEm: 1000,
      ascender: 800,
      descender: -200,
      lineGap: 0,
      capHeight: 700,
      xHeight: 500,
    },
    glyphs,
    createdAt: 1000,
    updatedAt: 1000,
  };
}

function renderTab(project: FontProject, onSelectGlyph = vi.fn()) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(
      <CharacterListTab
        project={project}
        selectedUnicode={0}
        onSelectGlyph={onSelectGlyph}
        theme="dark"
      />
    );
  });
  return {
    container,
    onSelectGlyph,
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

function clickButton(container: HTMLElement, label: string) {
  const button = Array.from(container.querySelectorAll('button')).find(
    (b) => b.textContent?.trim() === label
  );
  expect(button).toBeDefined();
  act(() => {
    button!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('characterListData', () => {
  it('has the eight expected groups', () => {
    expect(CHARACTER_LIST_GROUPS.map((g) => g.id)).toEqual([
      'hiragana',
      'katakana',
      'alphabet',
      'fullwidth_alnum',
      'ascii_symbols',
      'symbols',
      'joyo',
      'radical',
    ]);
  });

  it('returns the documented character counts', () => {
    expect(getCharacterListChars('hiragana')).toHaveLength(86);
    expect(getCharacterListChars('katakana')).toHaveLength(90);
    expect(getCharacterListChars('alphabet')).toHaveLength(62);
    expect(getCharacterListChars('fullwidth_alnum')).toHaveLength(62);
    expect(getCharacterListChars('ascii_symbols')).toHaveLength(33);
    expect(getCharacterListChars('symbols')).toHaveLength(85);
    expect(getCharacterListChars('joyo')).toHaveLength(2136);
    expect(getCharacterListChars('hiragana')[0].char).toBe('ぁ');
    expect(getCharacterListChars('alphabet')[0].char).toBe('0');
    expect(getCharacterListChars('fullwidth_alnum')[0].char).toBe('０');
    expect(getCharacterListChars('symbols')[1].char).toBe('、');
    expect(getCharacterListChars('joyo')[0].char).toBe('亜');
  });

  it('radical sections cover every JIS level 1 / 2 kanji exactly once', () => {
    const sections = getRadicalSections();
    expect(sections.length).toBeLessThanOrEqual(214);
    expect(sections.length).toBeGreaterThan(200);
    const all = sections.flatMap((s) => s.chars);
    expect(all).toHaveLength(10050);
    const codes = all.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const section of sections) {
      expect(section.chars.length).toBeGreaterThan(0);
    }
    const ninben = sections.find((s) => s.id === 'kangxi_9');
    expect(ninben).toBeDefined();
    expect(ninben!.chars.map((c) => c.char)).toContain('休');
    const sanzui = sections.find((s) => s.id === 'kangxi_85');
    expect(sanzui).toBeDefined();
    expect(sanzui!.chars.map((c) => c.char)).toContain('海');
  });

  it('isGlyphWritten only counts glyphs with contours', () => {
    expect(isGlyphWritten(undefined)).toBe(false);
    expect(isGlyphWritten(glyph('あ', false))).toBe(false);
    expect(isGlyphWritten(glyph('あ', true))).toBe(true);
    const chars = getCharacterListChars('hiragana').slice(0, 3);
    const glyphs = { [chars[0].code]: glyph(chars[0].char, true) };
    expect(countWritten(chars, glyphs)).toBe(1);
  });

  it('filters flat characters by character and by code', () => {
    const hiragana = getCharacterListChars('hiragana');
    expect(filterCharacterListChars(hiragana, '')).toBe(hiragana);
    expect(filterCharacterListChars(hiragana, '   ')).toBe(hiragana);
    expect(filterCharacterListChars(hiragana, 'あ').map((c) => c.char)).toEqual(['あ']);
    expect(filterCharacterListChars(hiragana, 'U+3042').map((c) => c.char)).toEqual(['あ']);
    expect(filterCharacterListChars(hiragana, '0x3042').map((c) => c.char)).toEqual(['あ']);
    expect(filterCharacterListChars(hiragana, '3042').map((c) => c.char)).toEqual(['あ']);
    expect(filterCharacterListChars(hiragana, 'zzz')).toEqual([]);
    // Case-insensitive: 'a' finds the uppercase 'A' in the alphabet group.
    const alphabet = getCharacterListChars('alphabet');
    expect(filterCharacterListChars(alphabet, 'a').map((c) => c.char)).toContain('A');
    // Special words, same as the creation grid filter.
    const symbols = getCharacterListChars('symbols');
    expect(filterCharacterListChars(symbols, '全角').map((c) => c.code)).toContain(0x3000);
    expect(filterCharacterListChars(symbols, '空白').map((c) => c.code)).toEqual([0x3000]);
    expect(filterCharacterListChars(getCharacterListChars('ascii_symbols'), 'スペース').map((c) => c.code)).toEqual([0x0020]);
    expect(matchesCharacterListItem({ char: 'あ', code: 0x3042 }, '3042')).toBe(true);
  });

  it('filters radical sections by radical name, reading, and variant form', () => {
    const sections = getRadicalSections();
    const sanzui = sections.find((s) => s.id === 'kangxi_85')!;
    // 'さんずい' matches only the 水部, which keeps all its kanji.
    const byName = filterRadicalSections(sections, 'さんずい');
    expect(byName).toEqual([sanzui]);
    expect(byName[0].chars.map((c) => c.char)).toContain('海');
    // The variant form '氵' matches the same section.
    expect(filterRadicalSections(sections, '氵').map((s) => s.id)).toEqual(['kangxi_85']);
    // Hiragana queries match katakana readings: 'すい' finds the four
    // sections whose name or reading contains it (冫・夊・水・隹).
    expect(filterRadicalSections(sections, 'すい').map((s) => s.id)).toEqual([
      'kangxi_15',
      'kangxi_35',
      'kangxi_85',
      'kangxi_172',
    ]);
    expect(toHiragana('スイ')).toBe('すい');
    expect(matchesRadicalSection(sanzui, 'さんずい')).toBe(true);
    expect(matchesRadicalSection(sanzui, 'みず')).toBe(true);
    // A kanji query keeps only that kanji, under its own section.
    const ai = filterRadicalSections(sections, '愛');
    expect(ai).toHaveLength(1);
    expect(ai[0].id).toBe('kangxi_61');
    expect(ai[0].chars).toEqual([{ char: '愛', code: 0x611b }]);
    const aiByCode = filterRadicalSections(sections, '611b');
    expect(aiByCode).toHaveLength(1);
    expect(aiByCode[0].chars).toEqual([{ char: '愛', code: 0x611b }]);
    expect(filterRadicalSections(sections, 'zzz')).toEqual([]);
  });
});

describe('computeVirtualLayout', () => {
  const flatSections = (count: number): VirtualListSection[] => [
    {
      id: 'flat',
      header: null,
      chars: Array.from({ length: count }, (_, i) => ({
        char: String.fromCodePoint(0x3041 + i),
        code: 0x3041 + i,
      })),
    },
  ];

  it('lays out a flat group in rows matching the CSS grid', () => {
    // innerWidth 400: columns = floor((400 + 4) / 40) = 10,
    // cellWidth = (400 - 9 * 4) / 10 = 36.4.
    const layout = computeVirtualLayout(flatSections(86), 400);
    expect(layout.columns).toBe(10);
    expect(layout.cellWidth).toBeCloseTo(36.4, 6);
    expect(layout.rows).toHaveLength(9);
    expect(layout.rows[0]).toMatchObject({ kind: 'cells', start: 0, count: 10, top: 0 });
    expect(layout.rows[8]).toMatchObject({ kind: 'cells', start: 80, count: 6 });
    expect(layout.rows[1].top).toBeCloseTo(36.4 + 4, 6);
    // 9 rows of 36.4 + 8 gaps of 4 + the 12px section gap.
    expect(layout.totalHeight).toBeCloseTo(9 * 36.4 + 8 * 4 + 12, 6);
  });

  it('lays out the radical group with one header row per section', () => {
    const sections: VirtualListSection[] = getRadicalSections().map((s) => ({
      id: s.id,
      header: { char: s.char, name: s.name, strokes: s.strokes, count: s.chars.length },
      chars: s.chars,
    }));
    const layout = computeVirtualLayout(sections, 384);
    expect(layout.columns).toBe(9);
    const headerRows = layout.rows.filter((r) => r.kind === 'header');
    expect(headerRows).toHaveLength(sections.length);
    const cellChars = layout.rows
      .filter((r) => r.kind === 'cells')
      .reduce((sum, r) => sum + (r.kind === 'cells' ? r.count : 0), 0);
    expect(cellChars).toBe(10050);
    // Total height is the exact sum of the section blocks.
    const cellWidth = (384 - 8 * CHARACTER_LIST_GRID_GAP) / 9;
    const expected = sections.reduce((sum, s) => {
      const rows = Math.ceil(s.chars.length / 9);
      return (
        sum +
        CHARACTER_LIST_SECTION_HEADER_HEIGHT +
        rows * cellWidth +
        (rows - 1) * CHARACTER_LIST_GRID_GAP +
        CHARACTER_LIST_SECTION_GAP
      );
    }, 0);
    expect(layout.totalHeight).toBeCloseTo(expected, 6);
    // Sections appear in order: every header row sits above the next one.
    for (let i = 1; i < headerRows.length; i++) {
      expect(headerRows[i].top).toBeGreaterThan(headerRows[i - 1].top);
    }
    // The '人' section offset is the sum of the blocks before it.
    const before = sections.slice(0, sections.findIndex((s) => s.id === 'kangxi_9'));
    const expectedOffset = before.reduce((sum, s) => {
      const rows = Math.ceil(s.chars.length / 9);
      return (
        sum +
        CHARACTER_LIST_SECTION_HEADER_HEIGHT +
        rows * cellWidth +
        (rows - 1) * CHARACTER_LIST_GRID_GAP +
        CHARACTER_LIST_SECTION_GAP
      );
    }, 0);
    expect(getSectionScrollOffset(layout.rows, 'kangxi_9')).toBeCloseTo(expectedOffset, 6);
    expect(getSectionScrollOffset(layout.rows, 'kangxi_999')).toBeUndefined();
    // Narrow widths still lay out one column.
    expect(computeVirtualLayout(flatSections(3), 20).columns).toBe(1);
    expect(computeVirtualLayout(flatSections(3), 20).rows).toHaveLength(3);
  });
});

describe('getVisibleRowRange', () => {
  it('covers the viewport plus overscan rows on both sides', () => {
    // 86 chars at innerWidth 400: 9 rows, 36.4px cells, 40.4px pitch.
    const layout = computeVirtualLayout(
      [
        {
          id: 'flat',
          header: null,
          chars: Array.from({ length: 86 }, (_, i) => ({
            char: String.fromCodePoint(0x3041 + i),
            code: 0x3041 + i,
          })),
        },
      ],
      400
    );
    // Viewport 0..100 shows rows 0-2; overscan 2 adds rows 3-4.
    expect(getVisibleRowRange(layout.rows, 0, 100)).toEqual({ start: 0, end: 5 });
    // Viewport 200..300 shows rows 5-7; overscan adds rows 3-4 and 8.
    expect(getVisibleRowRange(layout.rows, 200, 100)).toEqual({ start: 3, end: 9 });
    // No overscan returns exactly the visible rows.
    expect(getVisibleRowRange(layout.rows, 0, 100, 0)).toEqual({ start: 0, end: 3 });
    // Past the end clamps to the last rows.
    expect(getVisibleRowRange(layout.rows, 10000, 100)).toEqual({
      start: 9 - 1 - CHARACTER_LIST_OVERSCAN_ROWS,
      end: 9,
    });
    expect(getVisibleRowRange([], 0, 100)).toEqual({ start: 0, end: 0 });
    expect(CHARACTER_LIST_CELL_MIN_WIDTH).toBe(36);
    expect(CHARACTER_LIST_GRID_GAP).toBe(4);
    expect(CHARACTER_LIST_LIST_PADDING).toBe(8);
  });
});

describe('CharacterListTab virtualization', () => {
  const originalWidth = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'clientWidth'
  );
  const originalHeight = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'clientHeight'
  );
  const originalRO = (globalThis as Record<string, unknown>).ResizeObserver;

  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      get: () => 400,
    });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      get: () => 300,
    });
    (globalThis as Record<string, unknown>).ResizeObserver = class {
      constructor(private callback: ResizeObserverCallback) {}
      observe() {
        this.callback([], this as unknown as ResizeObserver);
      }
      unobserve() {}
      disconnect() {}
    };
  });

  afterEach(() => {
    if (originalWidth) {
      Object.defineProperty(HTMLElement.prototype, 'clientWidth', originalWidth);
    } else {
      delete (HTMLElement.prototype as unknown as Record<string, unknown>).clientWidth;
    }
    if (originalHeight) {
      Object.defineProperty(HTMLElement.prototype, 'clientHeight', originalHeight);
    } else {
      delete (HTMLElement.prototype as unknown as Record<string, unknown>).clientHeight;
    }
    if (originalRO === undefined) {
      delete (globalThis as Record<string, unknown>).ResizeObserver;
    } else {
      (globalThis as Record<string, unknown>).ResizeObserver = originalRO;
    }
  });

  function getScroller(container: HTMLElement): HTMLElement {
    const scroller = container.querySelector('.flex-1.min-h-0.overflow-y-auto');
    expect(scroller).not.toBeNull();
    return scroller as HTMLElement;
  }

  it('mounts only the visible rows of the joyo list', () => {
    const project = createProject();
    const { container, unmount } = renderTab(project);
    try {
      clickButton(container, '漢字（常用）');
      // innerWidth 384 -> 9 columns, 39.1px cells, 43.1px pitch:
      // viewport 300 shows rows 0-6, plus 2 overscan rows = 9 rows x 9.
      const cells = container.querySelectorAll('button[aria-pressed]');
      expect(cells).toHaveLength(81);
      expect(container.querySelector('button[aria-label^="亜 "]')).not.toBeNull();
      const far = getCharacterListChars('joyo')[1500];
      expect(
        container.querySelector(`button[aria-label^="${far.char} "]`)
      ).toBeNull();
      expect(container.textContent).toContain('作成済み 0 / 2136字');
    } finally {
      unmount();
    }
  });

  it('renders a different window after scrolling', () => {
    const project = createProject();
    const { container, unmount } = renderTab(project);
    try {
      clickButton(container, '漢字（常用）');
      const scroller = getScroller(container);
      act(() => {
        scroller.scrollTop = 5000;
        scroller.dispatchEvent(new Event('scroll', { bubbles: true }));
      });
      expect(container.querySelector('button[aria-label^="亜 "]')).toBeNull();
      // First visible row is ~116, so the character at index 116 * 9 is shown.
      const shown = getCharacterListChars('joyo')[116 * 9];
      expect(
        container.querySelector(`button[aria-label^="${shown.char} "]`)
      ).not.toBeNull();
      const cells = container.querySelectorAll('button[aria-pressed]');
      expect(cells.length).toBeGreaterThan(0);
      expect(cells.length).toBeLessThan(200);
    } finally {
      unmount();
    }
  });

  it('scrolls to a radical section in virtualized mode', () => {
    const project = createProject();
    const { container, unmount } = renderTab(project);
    try {
      clickButton(container, '漢字（部首別）');
      const indexButton = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === '人'
      );
      expect(indexButton).toBeDefined();
      act(() => {
        indexButton!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
      const sections: VirtualListSection[] = getRadicalSections().map((s) => ({
        id: s.id,
        header: { char: s.char, name: s.name, strokes: s.strokes, count: s.chars.length },
        chars: s.chars,
      }));
      const layout = computeVirtualLayout(sections, 384);
      const offset = getSectionScrollOffset(layout.rows, 'kangxi_9');
      expect(offset).toBeDefined();
      expect(getScroller(container).scrollTop).toBeCloseTo(
        CHARACTER_LIST_LIST_PADDING + offset!,
        6
      );
    } finally {
      unmount();
    }
  });

  it('re-attaches ResizeObserver and updates columns when clearing an empty search and resizing', () => {
    let observedCallbacks: ResizeObserverCallback[] = [];
    (globalThis as Record<string, unknown>).ResizeObserver = class {
      constructor(private callback: ResizeObserverCallback) {
        observedCallbacks.push(callback);
      }
      observe() {
        this.callback([], this as unknown as ResizeObserver);
      }
      unobserve() {}
      disconnect() {}
    };

    let currentWidth = 400;
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      get: () => currentWidth,
    });

    const rafQueue: FrameRequestCallback[] = [];
    let nextRafId = 1;
    const rafStub = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      rafQueue.push(cb);
      return nextRafId++;
    });
    const flushRaf = () => {
      while (rafQueue.length > 0) {
        const cb = rafQueue.shift()!;
        cb(0);
      }
    };
    const project = createProject();
    const { container, unmount } = renderTab(project);
    try {
      act(() => {
        flushRaf();
      });
      clickButton(container, '漢字（常用）');
      const input = container.querySelector('input[aria-label="文字を検索"]') as HTMLInputElement;
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
      act(() => {
        setter.call(input, 'zzz');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        flushRaf();
      });
      expect(container.textContent).toContain('一致する文字がありません');

      // Clear empty search
      const clear = container.querySelector('button[aria-label="検索をクリア"]') as HTMLButtonElement;
      act(() => {
        clear.click();
        flushRaf();
      });
      expect(container.querySelectorAll('button[aria-pressed]').length).toBeGreaterThan(0);

      // Simulate sidebar resize narrower after recovery
      currentWidth = 240;
      act(() => {
        observedCallbacks.forEach((cb) => cb([], {} as ResizeObserver));
        flushRaf();
      });

      const gridRow = container.querySelector('.absolute.grid');
      expect(gridRow).not.toBeNull();
      expect((gridRow as HTMLElement).style.gridTemplateColumns).toContain('repeat(5,');
    } finally {
      rafStub.mockRestore();
      unmount();
    }
  });
});

describe('CharacterListTab', () => {
  it('shows written glyphs as SVG and unwritten ones as faint text', () => {
    const a = glyph('あ', true);
    const project = createProject({ [a.unicode]: a });
    const { container, unmount } = renderTab(project);
    try {
      // One written glyph renders an SVG; the rest render faint text.
      expect(container.querySelectorAll('svg').length).toBe(1);
      const faint = container.querySelectorAll('span.opacity-30');
      expect(faint.length).toBe(85);
      expect(container.textContent).toContain('作成済み 1 / 86字');
      // Unwritten cells are labelled as 未作成.
      const unwritten = container.querySelector('[aria-label*="未作成"]');
      expect(unwritten).not.toBeNull();
    } finally {
      unmount();
    }
  });

  it('selects the clicked character', () => {
    const project = createProject();
    const { container, onSelectGlyph, unmount } = renderTab(project);
    try {
      const cell = container.querySelector('button[aria-label^="ぁ "]');
      expect(cell).not.toBeNull();
      act(() => {
        cell!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
      expect(onSelectGlyph).toHaveBeenCalledWith(0x3041, 'ぁ');
    } finally {
      unmount();
    }
  });

  it('switches to the joyo kanji group', () => {
    const project = createProject();
    const { container, unmount } = renderTab(project);
    try {
      clickButton(container, '漢字（常用）');
      expect(container.textContent).toContain('作成済み 0 / 2136字');
      expect(container.querySelector('button[aria-label^="亜 "]')).not.toBeNull();
    } finally {
      unmount();
    }
  });

  it('switches to the full-width alphanumeric group', () => {
    const project = createProject();
    const { container, unmount } = renderTab(project);
    try {
      clickButton(container, '全角英数字');
      expect(container.textContent).toContain('作成済み 0 / 62字');
      expect(container.querySelector('button[aria-label^="Ａ "]')).not.toBeNull();
    } finally {
      unmount();
    }
  });

  it('filters the hiragana list by character and shows the match count', () => {
    const project = createProject();
    const { container, unmount } = renderTab(project);
    try {
      const input = container.querySelector(
        'input[aria-label="文字を検索"]'
      ) as HTMLInputElement;
      expect(input).not.toBeNull();
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )!.set!;
      act(() => {
        setter.call(input, 'あ');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      // Only 'あ' remains, but progress still covers the whole group.
      expect(container.querySelectorAll('button[aria-pressed]')).toHaveLength(1);
      expect(container.querySelector('button[aria-label^="あ "]')).not.toBeNull();
      expect(container.querySelector('button[aria-label^="い "]')).toBeNull();
      expect(container.textContent).toContain('一致 1件');
      expect(container.textContent).toContain('作成済み 0 / 86字');
    } finally {
      unmount();
    }
  });

  it('filters by code and shows an empty state for no matches', () => {
    const project = createProject();
    const { container, unmount } = renderTab(project);
    try {
      const input = container.querySelector(
        'input[aria-label="文字を検索"]'
      ) as HTMLInputElement;
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )!.set!;
      act(() => {
        setter.call(input, 'U+3042');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      expect(container.querySelectorAll('button[aria-pressed]')).toHaveLength(1);
      expect(container.textContent).toContain('一致 1件');
      act(() => {
        setter.call(input, 'zzz');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      expect(container.querySelectorAll('button[aria-pressed]')).toHaveLength(0);
      expect(container.textContent).toContain('一致 0件');
      expect(container.textContent).toContain('一致する文字がありません');
      // The clear button restores the full list.
      const clear = container.querySelector(
        'button[aria-label="検索をクリア"]'
      ) as HTMLButtonElement;
      expect(clear).not.toBeNull();
      act(() => {
        clear.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
      expect(container.querySelectorAll('button[aria-pressed]')).toHaveLength(86);
      expect(container.textContent).not.toContain('一致');
    } finally {
      unmount();
    }
  });

  it('filters the radical group by radical name', () => {
    const project = createProject();
    const { container, unmount } = renderTab(project);
    try {
      clickButton(container, '漢字（部首別）');
      const input = container.querySelector(
        'input[aria-label="文字を検索"]'
      ) as HTMLInputElement;
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )!.set!;
      act(() => {
        setter.call(input, 'さんずい');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      const sanzui = getRadicalSections().find((s) => s.id === 'kangxi_85')!;
      expect(container.textContent).toContain('みず・さんずい・したみず');
      expect(container.textContent).not.toContain('にんべん');
      expect(container.textContent).toContain(`一致 ${sanzui.chars.length}件`);
      expect(container.textContent).toContain('作成済み 0 / 10050字');
    } finally {
      unmount();
    }
  });

  it('groups kanji by radical with an index that scrolls to the section', () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView as never;
    const project = createProject();
    const { container, unmount } = renderTab(project);
    try {
      clickButton(container, '漢字（部首別）');
      expect(container.textContent).toContain('にんべん');
      expect(container.textContent).toContain('作成済み 0 / 10050字');
      const indexButton = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === '人'
      );
      expect(indexButton).toBeDefined();
      act(() => {
        indexButton!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
      expect(scrollIntoView).toHaveBeenCalled();
    } finally {
      unmount();
      delete (Element.prototype as unknown as Record<string, unknown>).scrollIntoView;
    }
  });
});
