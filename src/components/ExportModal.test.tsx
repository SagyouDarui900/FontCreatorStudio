// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ExportModal } from './ExportModal';
import { FontProject, GlyphData } from '../types';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const validateCalls = vi.hoisted(() => ({ count: 0 }));

vi.mock('../utils/font', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/font')>();
  return {
    ...actual,
    validateFontProject: (project: FontProject) => {
      validateCalls.count += 1;
      return actual.validateFontProject(project);
    },
  };
});

function makeGlyph(unicode: number, char: string): GlyphData {
  return {
    unicode,
    char,
    name: `uni${unicode.toString(16).toUpperCase().padStart(4, '0')}`,
    advanceWidth: 1000,
    lsb: 50,
    contours: [],
  };
}

function makeProject(glyphs: Record<number, GlyphData>): FontProject {
  return {
    id: 'proj-1',
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

function mount(project: FontProject, previewText: string, previewFontSize: number) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const render = (p: FontProject, text: string, size: number) => {
    act(() => {
      root.render(
        <ExportModal
          isOpen
          onClose={() => {}}
          project={p}
          theme="light"
          previewText={text}
          onPreviewTextChange={() => {}}
          previewFontSize={size}
          onPreviewFontSizeChange={() => {}}
        />
      );
    });
  };
  render(project, previewText, previewFontSize);
  return {
    container,
    render,
    unmount() {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe('ExportModal validation is memoized (L1)', () => {
  beforeEach(() => {
    validateCalls.count = 0;
  });

  it('does not re-validate when only the preview text or size changes', () => {
    // No glyphs: validation yields the "no glyphs yet" warning, which the
    // modal must keep showing unchanged.
    const project = makeProject({});
    const h = mount(project, 'あいう', 28);
    try {
      expect(validateCalls.count).toBe(1);
      expect(h.container.textContent).toContain('作成されたグリフがまだありません');

      // Typing preview text and moving the size slider re-render the modal.
      h.render(project, 'あいうえお', 28);
      h.render(project, 'あいうえお', 40);
      h.render(project, '漢字 123 ABC', 40);

      expect(validateCalls.count).toBe(1);
      expect(h.container.textContent).toContain('作成されたグリフがまだありません');
    } finally {
      h.unmount();
    }
  });

  it('re-validates when the project itself changes', () => {
    const emptyProject = makeProject({});
    const oneGlyphProject = makeProject({ [0x3042]: makeGlyph(0x3042, 'あ') });
    const h = mount(emptyProject, 'あいう', 28);
    try {
      expect(validateCalls.count).toBe(1);
      expect(h.container.textContent).toContain('作成されたグリフがまだありません');

      h.render(oneGlyphProject, 'あいう', 28);
      expect(validateCalls.count).toBe(2);
      expect(h.container.textContent).not.toContain('作成されたグリフがまだありません');
      expect(h.container.textContent).toContain('収録文字: 1文字');
    } finally {
      h.unmount();
    }
  });
});
