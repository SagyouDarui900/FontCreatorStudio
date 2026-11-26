// @vitest-environment jsdom
import React, { useRef, useState } from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GlyphGrid } from './GlyphGrid';
import { GlyphGridCard } from './glyphgrid/GlyphGridCard';
import { ModalProvider } from '../contexts/ModalContext';
import { useUndoRedo } from '../hooks/useUndoRedo';
import { useGlyphActions } from '../hooks/useGlyphActions';
import { FontProject, GlyphData } from '../types';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

function createBaseProject(glyphs: Record<number, GlyphData> = {}): FontProject {
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

const sampleContour = {
  id: 'c1',
  closed: true,
  nodes: [
    { id: 'n1', x: 100, y: 100, type: 'corner' as const },
    { id: 'n2', x: 500, y: 100, type: 'corner' as const },
    { id: 'n3', x: 500, y: 500, type: 'corner' as const },
  ],
};

function renderWithRoot(el: React.ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(el);
  });
  return {
    container,
    rerender: (next: React.ReactElement) => {
      act(() => {
        root.render(next);
      });
    },
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe('GlyphGrid bug fixes', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('omits h-full in overlay mode so top/bottom fixed bounds are respected, and renders Paste dock for uncreated glyphs', () => {
    const project = createBaseProject({
      0x3042: {
        unicode: 0x3042,
        char: 'あ',
        name: 'uni3042',
        advanceWidth: 1000,
        lsb: 50,
        contours: [sampleContour],
      },
    });
    const onPasteGlyph = vi.fn();

    // Select U+3044 ('い'), which is NOT in project.glyphs yet
    const { container, unmount } = renderWithRoot(
      <ModalProvider>
        <GlyphGrid
          project={project}
          selectedUnicode={0x3044}
          onSelectGlyph={vi.fn()}
          onClearGlyph={vi.fn()}
          onCopyGlyph={vi.fn()}
          onPasteGlyph={onPasteGlyph}
          hasClipboard={true}
          isOpen={true}
          onClose={vi.fn()}
          theme="light"
          isOverlay={true}
        />
      </ModalProvider>
    );

    const aside = container.querySelector('aside')!;
    expect(aside.className).toContain('fixed');
    expect(aside.className).not.toContain('h-full');

    // Quick Action Dock should show U+3044 ('い') and the Paste button
    expect(aside.textContent).toContain('U+3044');
    const pasteBtn = Array.from(aside.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('貼付')
    );
    expect(pasteBtn).toBeDefined();
    expect(pasteBtn!.disabled).toBe(false);

    act(() => {
      pasteBtn!.click();
    });
    expect(onPasteGlyph).toHaveBeenCalledWith(0x3044);

    unmount();
  });

  it('filters out empty-contour glyphs from modified category and displays accurate counts for symbols (85) and vertical_forms (27)', () => {
    const project = createBaseProject({
      0x3042: {
        unicode: 0x3042,
        char: 'あ',
        name: 'uni3042',
        advanceWidth: 1000,
        lsb: 50,
        contours: [sampleContour],
      },
      // Metrics-only / locked-only glyph with 0 contours
      0x3044: {
        unicode: 0x3044,
        char: 'い',
        name: 'uni3044',
        advanceWidth: 900,
        lsb: 40,
        contours: [],
        locked: true,
      },
    });

    const { container, unmount } = renderWithRoot(
      <ModalProvider>
        <GlyphGrid
          project={project}
          selectedUnicode={0x3042}
          onSelectGlyph={vi.fn()}
          onClearGlyph={vi.fn()}
          onCopyGlyph={vi.fn()}
          onPasteGlyph={vi.fn()}
          hasClipboard={false}
          isOpen={true}
          onClose={vi.fn()}
          theme="light"
          isOverlay={false}
        />
      </ModalProvider>
    );

    // Quick tab should say 作成済 (1), not (2)
    expect(container.textContent).toContain('作成済 (1)');

    // Click '作成済 (1)' tab
    const modifiedTab = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('作成済 (1)')
    )!;
    act(() => {
      modifiedTab.click();
    });

    // Stats should be 1 / 1 字 (100%)
    expect(container.textContent).toContain('1 / 1 字');
    expect(container.textContent).toContain('100%');
    // Empty glyph 'い' (3044) must NOT appear in modified list
    const cards = container.querySelectorAll('[role="button"][aria-pressed]');
    expect(cards.length).toBe(1);
    expect(cards[0].textContent).toContain('3042');

    // Open category dropdown and verify accurate counts for symbols (85) and vertical_forms (27)
    const dropdownBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('分類選択')
    )!;
    act(() => {
      dropdownBtn.click();
    });

    expect(container.textContent).toContain('和文約物・全角記号85字');
    expect(container.textContent).toContain('縦書き約物・記号27字');
    expect(container.textContent).not.toContain('和文約物・全角記号65字');
    expect(container.textContent).not.toContain('縦書き約物・記号23字');

    unmount();
  });

  it('stops Alt+ArrowLeft/ArrowRight propagation even on page 1 so window shortcuts do not fire', () => {
    const project = createBaseProject();
    const windowKeySpy = vi.fn();
    window.addEventListener('keydown', windowKeySpy);

    const { container, unmount } = renderWithRoot(
      <ModalProvider>
        <GlyphGrid
          project={project}
          selectedUnicode={0x3042}
          onSelectGlyph={vi.fn()}
          onClearGlyph={vi.fn()}
          onCopyGlyph={vi.fn()}
          onPasteGlyph={vi.fn()}
          hasClipboard={false}
          isOpen={true}
          onClose={vi.fn()}
          theme="light"
          isOverlay={false}
        />
      </ModalProvider>
    );

    const aside = container.querySelector('aside')!;
    act(() => {
      aside.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowLeft', altKey: true, bubbles: true, cancelable: true })
      );
      aside.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', altKey: true, bubbles: true, cancelable: true })
      );
    });

    expect(windowKeySpy).not.toHaveBeenCalled();
    window.removeEventListener('keydown', windowKeySpy);
    unmount();
  });

  it('re-renders GlyphGridCard viewBox when unitsPerEm changes and supports Enter/Space activation', () => {
    const glyphData: GlyphData = {
      unicode: 0x3042,
      char: 'あ',
      name: 'uni3042',
      advanceWidth: 1000,
      lsb: 50,
      contours: [sampleContour],
    };
    const onSelectGlyph = vi.fn();

    const { container, rerender, unmount } = renderWithRoot(
      <GlyphGridCard
        item={{ char: 'あ', code: 0x3042 }}
        isSelected={false}
        glyphData={glyphData}
        isLight={true}
        density="medium"
        unitsPerEm={1000}
        onSelectGlyph={onSelectGlyph}
        onContextMenu={vi.fn()}
      />
    );

    const initialViewBox = container.querySelector('svg')!.getAttribute('viewBox');

    rerender(
      <GlyphGridCard
        item={{ char: 'あ', code: 0x3042 }}
        isSelected={false}
        glyphData={glyphData}
        isLight={true}
        density="medium"
        unitsPerEm={2048}
        onSelectGlyph={onSelectGlyph}
        onContextMenu={vi.fn()}
      />
    );

    const updatedViewBox = container.querySelector('svg')!.getAttribute('viewBox');
    expect(updatedViewBox).not.toBe(initialViewBox);

    const card = container.querySelector('[role="button"]')!;
    act(() => {
      card.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    });
    expect(onSelectGlyph).toHaveBeenCalledWith(0x3042, 'あ');

    unmount();
  });

  it('context menu paste/dakuten actions do not trigger onSelectGlyph (overlay drawer stays open) and respect locked state', () => {
    const project = createBaseProject({
      0x304b: {
        unicode: 0x304b,
        char: 'か',
        name: 'uni304B',
        advanceWidth: 1000,
        lsb: 50,
        contours: [sampleContour],
      },
      0x304d: {
        unicode: 0x304d,
        char: 'き',
        name: 'uni304D',
        advanceWidth: 1000,
        lsb: 50,
        contours: [sampleContour],
        locked: true,
      },
    });
    const onSelectGlyph = vi.fn();
    const onPasteGlyph = vi.fn();
    const onGenerateDakutenTarget = vi.fn();

    const { container, unmount } = renderWithRoot(
      <ModalProvider>
        <GlyphGrid
          project={project}
          selectedUnicode={0x3042}
          onSelectGlyph={onSelectGlyph}
          onClearGlyph={vi.fn()}
          onCopyGlyph={vi.fn()}
          onPasteGlyph={onPasteGlyph}
          onGenerateDakutenTarget={onGenerateDakutenTarget}
          hasClipboard={true}
          isOpen={true}
          onClose={vi.fn()}
          theme="light"
          isOverlay={true}
        />
      </ModalProvider>
    );

    // Open context menu on 'か' (U+304B)
    const kaCard = Array.from(container.querySelectorAll('[role="button"][aria-pressed]')).find((el) =>
      el.textContent?.includes('304B')
    )!;
    act(() => {
      kaCard.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 50, clientY: 50 }));
    });

    const dakuBtn = Array.from(document.body.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('濁音「が」を生成')
    )!;
    expect(dakuBtn).toBeDefined();
    act(() => {
      dakuBtn.click();
    });

    expect(onGenerateDakutenTarget).toHaveBeenCalledWith('が', false, 'か');
    expect(onSelectGlyph).not.toHaveBeenCalled();

    // Open context menu on locked 'き' (U+304D)
    const kiCard = Array.from(container.querySelectorAll('[role="button"][aria-pressed]')).find((el) =>
      el.textContent?.includes('304D')
    )!;
    act(() => {
      kiCard.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 50, clientY: 50 }));
    });

    const lockedPasteBtn = Array.from(document.body.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('貼り付け (ロック中)')
    ) as HTMLButtonElement | undefined;
    const lockedClearBtn = Array.from(document.body.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('パスを消去 (ロック中)')
    ) as HTMLButtonElement | undefined;
    expect(lockedPasteBtn?.disabled).toBe(true);
    expect(lockedClearBtn?.disabled).toBe(true);

    unmount();
  });

  it('clearing a non-selected glyph switches selection to it so Ctrl+Z (handleUndo) restores it', () => {
    let latestState: {
      selectedUnicode: number;
      project: FontProject;
      handleClearGlyph: (u: number) => void;
      handleUndo: () => void;
    } | null = null;

    function Harness() {
      const [project, setProject] = useState<FontProject>(() =>
        createBaseProject({
          0x3042: {
            unicode: 0x3042,
            char: 'あ',
            name: 'uni3042',
            advanceWidth: 1000,
            lsb: 50,
            contours: [sampleContour],
          },
          0x3044: {
            unicode: 0x3044,
            char: 'い',
            name: 'uni3044',
            advanceWidth: 1000,
            lsb: 50,
            contours: [sampleContour],
          },
        })
      );
      const [selectedUnicode, setSelectedUnicode] = useState(0x3042);
      const [selectedChar, setSelectedChar] = useState('あ');
      const projectRef = useRef(project);
      projectRef.current = project;

      const currentGlyph: GlyphData = project.glyphs[selectedUnicode] || {
        unicode: selectedUnicode,
        char: selectedChar,
        name: `uni${selectedUnicode.toString(16).toUpperCase().padStart(4, '0')}`,
        advanceWidth: 1000,
        lsb: 50,
        contours: [],
      };
      const currentGlyphRef = useRef(currentGlyph);
      currentGlyphRef.current = currentGlyph;

      const { commitHistory, handleUndo, setUndoStack } = useUndoRedo({
        projectRef,
        currentGlyphRef,
        selectedUnicode,
        selectedChar,
        setSelectedUnicode,
        setSelectedChar,
        setProject,
      });

      const { handleClearGlyph } = useGlyphActions({
        project,
        setProject,
        selectedUnicode,
        selectedChar,
        setSelectedUnicode,
        setSelectedChar,
        currentGlyph,
        currentGlyphRef,
        commitHistory,
        setUndoStack,
        setToolMode: vi.fn(),
        onShowToast: vi.fn(),
        handleUpdateContours: vi.fn(),
      });

      latestState = { selectedUnicode, project, handleClearGlyph, handleUndo };
      return null;
    }

    const { unmount } = renderWithRoot(<Harness />);

    // Currently selected is 'あ' (0x3042); clear non-selected 'い' (0x3044)
    act(() => {
      latestState!.handleClearGlyph(0x3044);
    });

    expect(latestState!.project.glyphs[0x3044]).toBeUndefined();
    expect(latestState!.selectedUnicode).toBe(0x3044);

    // Undo should now restore 'い' (0x3044)
    act(() => {
      latestState!.handleUndo();
    });

    expect(latestState!.project.glyphs[0x3044]?.contours.length).toBe(1);
    unmount();
  });

  it('preserves CharacterListTab group and search query across panel tab switches and keeps width presets accessible', () => {
    const project = createBaseProject();
    const { container, unmount } = renderWithRoot(
      <ModalProvider>
        <GlyphGrid
          project={project}
          selectedUnicode={0x3042}
          onSelectGlyph={vi.fn()}
          onClearGlyph={vi.fn()}
          onCopyGlyph={vi.fn()}
          onPasteGlyph={vi.fn()}
          hasClipboard={false}
          isOpen={true}
          onClose={vi.fn()}
          theme="light"
          isOverlay={false}
        />
      </ModalProvider>
    );

    // Width presets should be visible in creation grid
    const wideBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.trim() === '広');
    expect(wideBtn).toBeDefined();

    // Switch to 見本一覧, choose カタカナ, filter by ア
    const listTab = Array.from(container.querySelectorAll<HTMLButtonElement>('button[role="tab"]')).find((b) =>
      b.textContent?.includes('見本一覧')
    )!;
    act(() => {
      listTab.click();
    });

    // Width presets remain visible in 見本一覧
    expect(Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.trim() === '広')).toBeDefined();

    const katakanaTab = Array.from(container.querySelectorAll<HTMLButtonElement>('button[role="tab"]')).find(
      (b) => b.textContent?.trim() === 'カタカナ'
    )!;
    act(() => {
      katakanaTab.click();
    });

    const listSearch = container.querySelector('input[aria-label="文字を検索"]') as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
    act(() => {
      setter.call(listSearch, 'ア');
      listSearch.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(container.textContent).toContain('一致 1件');

    // Switch back to 作字グリッド then return to 見本一覧
    const createTab = Array.from(container.querySelectorAll<HTMLButtonElement>('button[role="tab"]')).find((b) =>
      b.textContent?.includes('作字グリッド')
    )!;
    act(() => {
      createTab.click();
    });
    const listTabAgain = Array.from(container.querySelectorAll<HTMLButtonElement>('button[role="tab"]')).find((b) =>
      b.textContent?.includes('見本一覧')
    )!;
    act(() => {
      listTabAgain.click();
    });

    const restoredKatakana = Array.from(container.querySelectorAll<HTMLButtonElement>('button[role="tab"]')).find(
      (b) => b.textContent?.trim() === 'カタカナ'
    )!;
    expect(restoredKatakana.getAttribute('aria-selected')).toBe('true');
    const restoredSearch = container.querySelector('input[aria-label="文字を検索"]') as HTMLInputElement;
    expect(restoredSearch.value).toBe('ア');
    expect(container.textContent).toContain('一致 1件');

    unmount();
  });

  it('positions GlyphGrid context menu near the trigger button when activated via keyboard (clientX=0, clientY=0)', () => {
    const project = createBaseProject({
      0x3042: {
        unicode: 0x3042,
        char: 'あ',
        name: 'uni3042',
        advanceWidth: 1000,
        lsb: 50,
        contours: [sampleContour],
      },
    });

    const { container, unmount } = renderWithRoot(
      <ModalProvider>
        <GlyphGrid
          project={project}
          selectedUnicode={0x3042}
          onSelectGlyph={vi.fn()}
          onClearGlyph={vi.fn()}
          onCopyGlyph={vi.fn()}
          onPasteGlyph={vi.fn()}
          hasClipboard={false}
          isOpen={true}
          onClose={vi.fn()}
          theme="light"
          isOverlay={false}
        />
      </ModalProvider>
    );

    const menuButton = container.querySelector<HTMLButtonElement>('button[aria-label="「あ」のメニューを開く"]');
    expect(menuButton).not.toBeNull();
    vi.spyOn(menuButton!, 'getBoundingClientRect').mockReturnValue({
      left: 120,
      top: 200,
      right: 140,
      bottom: 220,
      width: 20,
      height: 20,
      x: 120,
      y: 200,
      toJSON: () => ({}),
    });

    act(() => {
      menuButton!.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          clientX: 0,
          clientY: 0,
        })
      );
    });

    const copyBtn = Array.from(document.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('形をコピー')
    );
    expect(copyBtn).toBeDefined();
    const menuRoot = copyBtn!.closest('div.fixed') as HTMLElement | null;
    expect(menuRoot).not.toBeNull();
    expect(parseFloat(menuRoot!.style.left)).toBeGreaterThan(0);
    expect(parseFloat(menuRoot!.style.top)).toBeGreaterThan(0);

    unmount();
  });
});
