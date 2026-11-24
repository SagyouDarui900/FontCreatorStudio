// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CharacterListTab } from './CharacterListTab';
import {
  CHARACTER_LIST_GROUPS,
  countWritten,
  getCharacterListChars,
  getRadicalSections,
  isGlyphWritten,
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
  it('has the five expected groups', () => {
    expect(CHARACTER_LIST_GROUPS.map((g) => g.id)).toEqual([
      'hiragana',
      'katakana',
      'alphabet',
      'joyo',
      'radical',
    ]);
  });

  it('returns the documented character counts', () => {
    expect(getCharacterListChars('hiragana')).toHaveLength(86);
    expect(getCharacterListChars('katakana')).toHaveLength(90);
    expect(getCharacterListChars('alphabet')).toHaveLength(62);
    expect(getCharacterListChars('joyo')).toHaveLength(2136);
    expect(getCharacterListChars('hiragana')[0].char).toBe('ぁ');
    expect(getCharacterListChars('alphabet')[0].char).toBe('0');
    expect(getCharacterListChars('joyo')[0].char).toBe('亜');
  });

  it('radical sections are non-empty and deduplicated within each section', () => {
    const sections = getRadicalSections();
    expect(sections.length).toBeGreaterThan(200);
    for (const section of sections) {
      expect(section.chars.length).toBeGreaterThan(0);
      const codes = section.chars.map((c) => c.code);
      expect(new Set(codes).size).toBe(codes.length);
    }
    const ninben = sections.find((s) => s.id === 'rad_ninben');
    expect(ninben).toBeDefined();
    expect(ninben!.chars.map((c) => c.char)).toContain('休');
  });

  it('isGlyphWritten only counts glyphs with contours', () => {
    expect(isGlyphWritten(undefined)).toBe(false);
    expect(isGlyphWritten(glyph('あ', false))).toBe(false);
    expect(isGlyphWritten(glyph('あ', true))).toBe(true);
    const chars = getCharacterListChars('hiragana').slice(0, 3);
    const glyphs = { [chars[0].code]: glyph(chars[0].char, true) };
    expect(countWritten(chars, glyphs)).toBe(1);
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

  it('groups kanji by radical with an index that scrolls to the section', () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView as never;
    const project = createProject();
    const { container, unmount } = renderTab(project);
    try {
      clickButton(container, '漢字（部首別）');
      expect(container.textContent).toContain('にんべん');
      const indexButton = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === '亻'
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
