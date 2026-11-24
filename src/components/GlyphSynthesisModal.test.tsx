// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GlyphSynthesisModal } from './GlyphSynthesisModal';
import { ViewControlsSubToolbar } from './canvas/subtoolbars/ViewControlsSubToolbar';
import { GlyphGridCard } from './glyphgrid/GlyphGridCard';
import { FontProject, PathContour } from '../types';
import { createDefaultProject } from '../utils/font/projectDefaults';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

function makeSquareContour(id: string): PathContour {
  return {
    id,
    closed: true,
    nodes: [
      { id: `${id}-1`, x: 200, y: 200, handleIn: null, handleOut: null, type: 'corner' },
      { id: `${id}-2`, x: 750, y: 200, handleIn: null, handleOut: null, type: 'corner' },
      { id: `${id}-3`, x: 750, y: 800, handleIn: null, handleOut: null, type: 'corner' },
      { id: `${id}-4`, x: 200, y: 800, handleIn: null, handleOut: null, type: 'corner' },
    ],
  };
}

function makeTestProject(): FontProject {
  const haCode = 'は'.codePointAt(0)!;
  const tsuCode = 'つ'.codePointAt(0)!;
  const kkKaCode = 'カ'.codePointAt(0)!;
  const base = createDefaultProject();

  return {
    ...base,
    id: 'test-project',
    glyphs: {
      [haCode]: {
        unicode: haCode,
        char: 'は',
        name: 'uni306F',
        advanceWidth: 1000,
        lsb: 50,
        contours: [makeSquareContour('ha')],
      },
      [tsuCode]: {
        unicode: tsuCode,
        char: 'つ',
        name: 'uni3064',
        advanceWidth: 1000,
        lsb: 50,
        contours: [makeSquareContour('tsu')],
      },
      [kkKaCode]: {
        unicode: kkKaCode,
        char: 'カ',
        name: 'uni30AB',
        advanceWidth: 1000,
        lsb: 50,
        contours: [makeSquareContour('kk-ka')],
      },
    },
  };
}

describe('GlyphSynthesisModal & kana UI entry points', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('filters sources by scope, allows switching to handakuten preview, preserves undrawn char selection, and commits history on batch execute', () => {
    let project = makeTestProject();
    const setProject = vi.fn((updater: React.SetStateAction<FontProject>) => {
      project = typeof updater === 'function' ? updater(project) : updater;
    });
    const commitHistory = vi.fn();
    const onClose = vi.fn();
    const showToast = vi.fn();

    const root = createRoot(container);
    act(() => {
      root.render(
        <GlyphSynthesisModal
          isOpen={true}
          onClose={onClose}
          project={project}
          setProject={setProject}
          commitHistory={commitHistory}
          showToast={showToast}
          theme="light"
        />
      );
    });

    // Scope switching: katakana should filter out hiragana chars like 'は'
    const katakanaBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'カタカナ'
    );
    expect(katakanaBtn).toBeDefined();
    act(() => {
      katakanaBtn!.click();
    });
    const charButtonsAfterKatakana = Array.from(container.querySelectorAll('button')).map((b) =>
      b.textContent?.trim()
    );
    expect(charButtonsAfterKatakana).toContain('カ');
    expect(charButtonsAfterKatakana).not.toContain('は');

    // Switch back to hiragana
    const hiraganaBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'ひらがな'
    );
    act(() => {
      hiraganaBtn!.click();
    });

    // Click 'は', then toggle handakuten preview ('゜ぱ')
    const haBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'は'
    );
    expect(haBtn).toBeDefined();
    act(() => {
      haBtn!.click();
    });
    const handakuPreviewBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('゜ぱ')
    );
    expect(handakuPreviewBtn).toBeDefined();
    act(() => {
      handakuPreviewBtn!.click();
    });
    expect(container.textContent).toContain('「は」⇒「ぱ」');

    // Clicking an undrawn char ('さ') should stay selected and show undrawn message
    const saBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'さ'
    );
    expect(saBtn).toBeDefined();
    act(() => {
      saBtn!.click();
    });
    expect(container.textContent).toContain('親文字「さ」がまだ作成されていません');

    // Execute dakuten batch (desktop or mobile button - both work)
    const executeDakuBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('濁音・半濁点を一括合成')
    );
    expect(executeDakuBtn).toBeDefined();
    act(() => {
      executeDakuBtn!.click();
    });

    expect(commitHistory).toHaveBeenCalledTimes(3);
    expect(commitHistory).toHaveBeenCalledWith('ば'.codePointAt(0)!);
    expect(commitHistory).toHaveBeenCalledWith('ぱ'.codePointAt(0)!);
    expect(commitHistory).toHaveBeenCalledWith('づ'.codePointAt(0)!);
    expect(setProject).toHaveBeenCalledTimes(1);
    expect(project.glyphs['ば'.codePointAt(0)!]?.contours.length).toBe(3);
    expect(project.glyphs['ぱ'.codePointAt(0)!]?.contours.length).toBe(3);
    expect(project.glyphs['づ'.codePointAt(0)!]?.contours.length).toBe(3);
    expect(onClose).toHaveBeenCalledTimes(1);

    // Switch to Small Kana tab and execute batch
    const smallTabBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('小書き文字合成')
    );
    expect(smallTabBtn).toBeDefined();
    act(() => {
      smallTabBtn!.click();
    });

    const executeSmallBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('小書き文字を一括生成')
    );
    expect(executeSmallBtn).toBeDefined();
    act(() => {
      executeSmallBtn!.click();
    });

    // Cumulative: 3 commits from the dakuten batch (ば・ぱ・づ) plus 2
    // from the small-kana batch (っ and the katakana small kana).
    expect(commitHistory).toHaveBeenCalledTimes(5);
    expect(project.glyphs['っ'.codePointAt(0)!]?.contours.length).toBe(1);

    act(() => {
      root.unmount();
    });
  });

  it('ViewControlsSubToolbar triggers small kana, dakuten, and modal actions cleanly and guards empty glyphs', () => {
    const onGenerateDakutenTarget = vi.fn();
    const onDuplicateAsSmallKana = vi.fn();
    const onOpenGlyphSynthesisModal = vi.fn();
    const showCanvasToast = vi.fn();

    const root = createRoot(container);

    // Empty contours should warn instead of claiming synthesis succeeded
    act(() => {
      root.render(
        <ViewControlsSubToolbar
          activeChar="つ"
          selectedUnicode={'つ'.codePointAt(0)}
          hasContours={false}
          onGenerateDakutenTarget={onGenerateDakutenTarget}
          onDuplicateAsSmallKana={onDuplicateAsSmallKana}
          onOpenGlyphSynthesisModal={onOpenGlyphSynthesisModal}
          showCanvasToast={showCanvasToast}
          showNodes={true}
          setShowNodes={vi.fn()}
          isOutlineMode={false}
          setOutlineOnly={vi.fn()}
          isLight={true}
        />
      );
    });

    const smallBtnEmpty = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('小書き「っ」')
    );
    expect(smallBtnEmpty).toBeDefined();
    act(() => {
      smallBtnEmpty!.click();
    });
    expect(onDuplicateAsSmallKana).not.toHaveBeenCalled();
    expect(showCanvasToast).toHaveBeenCalledWith('「つ」にはまだ字形が作図されていません');

    // With contours, buttons call handlers accurately
    showCanvasToast.mockClear();
    act(() => {
      root.render(
        <ViewControlsSubToolbar
          activeChar="つ"
          selectedUnicode={'つ'.codePointAt(0)}
          hasContours={true}
          onGenerateDakutenTarget={onGenerateDakutenTarget}
          onDuplicateAsSmallKana={onDuplicateAsSmallKana}
          onOpenGlyphSynthesisModal={onOpenGlyphSynthesisModal}
          showCanvasToast={showCanvasToast}
          showNodes={true}
          setShowNodes={vi.fn()}
          isOutlineMode={false}
          setOutlineOnly={vi.fn()}
          isLight={true}
        />
      );
    });

    const dakuBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('＋濁点「づ」')
    );
    const smallBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('小書き「っ」')
    );
    const modalBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('一括合成')
    );

    act(() => {
      dakuBtn!.click();
      smallBtn!.click();
      modalBtn!.click();
    });

    expect(onGenerateDakutenTarget).toHaveBeenCalledWith('づ', false);
    expect(onDuplicateAsSmallKana).toHaveBeenCalledWith('つ'.codePointAt(0));
    expect(onOpenGlyphSynthesisModal).toHaveBeenCalledTimes(1);

    act(() => {
      root.unmount();
    });
  });

  it('GlyphGridCard exposes touch-accessible menu button and long-press menu without triggering selection', () => {
    vi.useFakeTimers();
    const onSelectGlyph = vi.fn();
    const onContextMenu = vi.fn();
    const root = createRoot(container);

    const item = { char: 'は', code: 'は'.codePointAt(0)! };
    act(() => {
      root.render(
        <GlyphGridCard
          item={item}
          isSelected={false}
          isLight={true}
          density="medium"
          onSelectGlyph={onSelectGlyph}
          onContextMenu={onContextMenu}
        />
      );
    });

    const menuBtn = container.querySelector('button[aria-label="「は」のメニューを開く"]');
    expect(menuBtn).not.toBeNull();
    expect(menuBtn!.className).toContain('opacity-85');

    act(() => {
      (menuBtn as HTMLButtonElement).click();
    });
    expect(onContextMenu).toHaveBeenCalledTimes(1);
    expect(onSelectGlyph).not.toHaveBeenCalled();

    // Verify long press opens context menu
    onContextMenu.mockClear();
    const cardEl = container.firstElementChild as HTMLElement;
    act(() => {
      cardEl.dispatchEvent(
        new TouchEvent('touchstart', {
          bubbles: true,
          touches: [{ clientX: 50, clientY: 50 } as Touch],
        })
      );
      vi.advanceTimersByTime(500);
    });
    expect(onContextMenu).toHaveBeenCalledTimes(1);

    act(() => {
      cardEl.click();
    });
    expect(onSelectGlyph).not.toHaveBeenCalled();

    vi.useRealTimers();
    act(() => {
      root.unmount();
    });
  });
});
