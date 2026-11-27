// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { GlyphGridContextMenu } from './GlyphGridContextMenu';
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

function makeGlyph(unicode: number, char: string, overrides: Partial<GlyphData> = {}): GlyphData {
  return {
    unicode,
    char,
    name: `uni${unicode.toString(16).toUpperCase().padStart(4, '0')}`,
    advanceWidth: 1000,
    lsb: 50,
    contours: [],
    ...overrides,
  };
}

function makeProject(glyphs: Record<number, GlyphData>): FontProject {
  return {
    id: 'test-proj',
    name: 'TestFont',
    metadata: {
      familyName: 'TestFont',
      styleName: 'Regular',
      designer: 'Tester',
      copyright: 'Copyright',
      license: 'OFL',
      licenseUrl: '',
      version: '1.0',
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

function findOptimizeButton(): HTMLButtonElement | undefined {
  return Array.from(document.body.querySelectorAll('button')).find((b) =>
    b.textContent?.includes('パス最適化')
  ) as HTMLButtonElement | undefined;
}

function renderMenu(project: FontProject, onOptimizeGlyph = vi.fn()) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const contextMenuRef = React.createRef<HTMLDivElement>();
  act(() => {
    root.render(
      <GlyphGridContextMenu
        contextMenu={{ x: 100, y: 100, item: { char: 'あ', code: 0x3042 } }}
        onClose={() => {}}
        isLight
        project={project}
        hasClipboard={false}
        contextMenuRef={contextMenuRef}
        onSelectGlyph={() => {}}
        onCopyGlyph={() => {}}
        onPasteGlyph={() => {}}
        onClearGlyph={() => {}}
        onOptimizeGlyph={onOptimizeGlyph}
      />
    );
  });
  return {
    onOptimizeGlyph,
    unmount() {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe('GlyphGridContextMenu path optimization item', () => {
  it('shows the item for a glyph with contours', () => {
    const glyph = makeGlyph(0x3042, 'あ', { contours: [sampleContour] });
    const h = renderMenu(makeProject({ [0x3042]: glyph }));
    try {
      const button = findOptimizeButton();
      expect(button).toBeDefined();
      expect(button?.disabled).toBe(false);
      expect(button?.textContent).toContain('パス最適化');
    } finally {
      h.unmount();
    }
  });

  it('hides the item for a glyph without contours', () => {
    const glyph = makeGlyph(0x3042, 'あ', { contours: [] });
    const h = renderMenu(makeProject({ [0x3042]: glyph }));
    try {
      expect(findOptimizeButton()).toBeUndefined();
    } finally {
      h.unmount();
    }
  });

  it('disables the item for a locked glyph', () => {
    const glyph = makeGlyph(0x3042, 'あ', { contours: [sampleContour], locked: true });
    const h = renderMenu(makeProject({ [0x3042]: glyph }));
    try {
      const button = findOptimizeButton();
      expect(button).toBeDefined();
      expect(button?.disabled).toBe(true);
      expect(button?.title).toBe('編集ロック中のため最適化できません');
      expect(button?.textContent).toContain('パス最適化 (ロック中)');
    } finally {
      h.unmount();
    }
  });

  it('calls onOptimizeGlyph with the glyph code when clicked', () => {
    const glyph = makeGlyph(0x3042, 'あ', { contours: [sampleContour] });
    const onOptimizeGlyph = vi.fn();
    const h = renderMenu(makeProject({ [0x3042]: glyph }), onOptimizeGlyph);
    try {
      const button = findOptimizeButton();
      expect(button).toBeDefined();
      act(() => {
        button?.click();
      });
      expect(onOptimizeGlyph).toHaveBeenCalledWith(0x3042);
    } finally {
      h.unmount();
    }
  });
});
