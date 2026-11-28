// @vitest-environment jsdom
import React, { act, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GlyphSynthesisModal } from './GlyphSynthesisModal';
import { ViewControlsSubToolbar } from './canvas/subtoolbars/ViewControlsSubToolbar';
import { GlyphGridCard } from './glyphgrid/GlyphGridCard';
import { useGlyphSynthesisState } from './glyphSynthesis';
import { useGlyphActions } from '../hooks/useGlyphActions';
import { FontProject, GlyphData, PathContour } from '../types';
import { createDefaultProject } from '../utils/font/projectDefaults';
import { getThemeClasses } from '../utils/theme';

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

function makePixelOnlyGlyph(char: string, code: number): GlyphData {
  return {
    unicode: code,
    char,
    name: `uni${code.toString(16).toUpperCase().padStart(4, '0')}`,
    advanceWidth: 1000,
    lsb: 50,
    contours: [],
    pixelData: { width: 16, height: 16, data: Array.from({ length: 256 }, () => 1) },
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

function SynthesisStateHarness({
  project,
  setProject,
  commitHistory,
  commitProjectHistory,
  showToast,
  onClose,
  execute,
}: {
  project: FontProject;
  setProject: React.Dispatch<React.SetStateAction<FontProject>>;
  commitHistory?: (targetUnicode?: number) => void;
  commitProjectHistory?: () => void;
  showToast?: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  onClose: () => void;
  execute: 'dakuten' | 'smallKana';
}) {
  const state = useGlyphSynthesisState({
    isOpen: true,
    onClose,
    project,
    setProject,
    commitHistory,
    commitProjectHistory,
    showToast,
  });
  return (
    <button
      type="button"
      onClick={
        execute === 'dakuten' ? state.handleExecuteDakutenBatch : state.handleExecuteSmallKanaBatch
      }
    >
      exec
    </button>
  );
}

function GlyphActionsHarness({
  project,
  setProject,
  selectedUnicode,
  selectedChar,
  commitHistory,
  onShowToast,
}: {
  project: FontProject;
  setProject: React.Dispatch<React.SetStateAction<FontProject>>;
  selectedUnicode: number;
  selectedChar: string;
  commitHistory: (targetUnicode?: number) => void;
  onShowToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}) {
  const currentGlyphRef = useRef<GlyphData>(
    project.glyphs[selectedUnicode] ?? {
      unicode: selectedUnicode,
      char: selectedChar,
      name: `uni${selectedUnicode.toString(16).toUpperCase().padStart(4, '0')}`,
      advanceWidth: 1000,
      lsb: 50,
      contours: [],
    }
  );
  const currentGlyph = project.glyphs[selectedUnicode] ?? currentGlyphRef.current;
  const actions = useGlyphActions({
    project,
    setProject,
    selectedUnicode,
    selectedChar,
    setSelectedUnicode: vi.fn(),
    setSelectedChar: vi.fn(),
    currentGlyph,
    currentGlyphRef,
    commitHistory,
    setUndoStack: vi.fn(),
    setToolMode: vi.fn(),
    onShowToast,
    handleUpdateContours: vi.fn(),
  });
  return (
    <div>
      <button
        type="button"
        onClick={() => actions.handleDuplicateAsSmallKana(selectedUnicode)}
      >
        make-small
      </button>
      <button type="button" onClick={() => actions.handleGenerateDakutenTarget('づ')}>
        make-daku
      </button>
    </div>
  );
}

describe('GlyphSynthesisModal & kana UI entry points', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    vi.restoreAllMocks();
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

    // H1: the second batch run in the same mount keeps the first
    // batch's results (glyphs are merged, not replaced).
    expect(project.glyphs['ば'.codePointAt(0)!]?.contours.length).toBe(3);
    expect(project.glyphs['ぱ'.codePointAt(0)!]?.contours.length).toBe(3);
    expect(project.glyphs['づ'.codePointAt(0)!]?.contours.length).toBe(3);

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
    // L15: with no contours the single-generation button is disabled
    // (like on mobile), instead of showing a toast on click.
    expect((smallBtnEmpty as HTMLButtonElement).disabled).toBe(true);
    act(() => {
      smallBtnEmpty!.click();
    });
    expect(onDuplicateAsSmallKana).not.toHaveBeenCalled();
    expect(showCanvasToast).not.toHaveBeenCalled();

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

  it('calls commitProjectHistory before applying a batch (M8)', () => {
    let project = makeTestProject();
    const setProject = vi.fn((updater: React.SetStateAction<FontProject>) => {
      project = typeof updater === 'function' ? updater(project) : updater;
    });
    const commitHistory = vi.fn();
    const commitProjectHistory = vi.fn();
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
          commitProjectHistory={commitProjectHistory}
          showToast={showToast}
          theme="light"
        />
      );
    });

    const executeBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('濁音・半濁点を一括合成')
    );
    act(() => {
      executeBtn!.click();
    });

    expect(commitProjectHistory).toHaveBeenCalledTimes(1);
    expect(commitProjectHistory.mock.invocationCallOrder[0]).toBeLessThan(
      setProject.mock.invocationCallOrder[0]
    );
    expect(project.glyphs['ば'.codePointAt(0)!]?.contours.length).toBe(3);

    act(() => {
      root.unmount();
    });
  });

  it('warns when commitHistory is missing (L14)', () => {
    const project = makeTestProject();
    const setProject = vi.fn();
    const onClose = vi.fn();
    const showToast = vi.fn();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const root = createRoot(container);
    act(() => {
      root.render(
        <SynthesisStateHarness
          project={project}
          setProject={setProject}
          onClose={onClose}
          showToast={showToast}
          execute="dakuten"
        />
      );
    });

    const execBtn = container.querySelector('button')!;
    act(() => {
      execBtn.click();
    });

    expect(setProject).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(
      expect.stringContaining('Undo できません'),
      'success'
    );

    act(() => {
      root.unmount();
    });
  });

  it('counts a pixel-only parent as drawn and generates from it (H4)', () => {
    const kaCode = 'か'.codePointAt(0)!;
    const tsuCode = 'つ'.codePointAt(0)!;
    const base = createDefaultProject();
    let project: FontProject = {
      ...base,
      id: 'test-project-pixel',
      metadata: { ...base.metadata, ascender: 900, descender: -100 },
      glyphs: {
        [kaCode]: makePixelOnlyGlyph('か', kaCode),
        [tsuCode]: makePixelOnlyGlyph('つ', tsuCode),
      },
    };
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

    // The pixel-only か and つ count as drawn parents: 2 dakuten targets
    // (か→が、つ→づ).
    const executeDakuBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('濁音・半濁点を一括合成')
    );
    expect(executeDakuBtn?.textContent).toContain('(2字)');
    expect(executeDakuBtn?.textContent).not.toContain('(0字)');

    act(() => {
      executeDakuBtn!.click();
    });
    expect(project.glyphs['が'.codePointAt(0)!]?.contours.length).toBe(3);
    expect(project.glyphs['づ'.codePointAt(0)!]?.contours.length).toBe(3);
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('2 文字'), 'success');

    // The pixel-only つ and か also count for small kana: 2 targets
    // (つ→っ、か→ヵ).
    const smallTabBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('小書き文字合成')
    );
    act(() => {
      smallTabBtn!.click();
    });
    const executeSmallBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('小書き文字を一括生成')
    );
    expect(executeSmallBtn?.textContent).toContain('(2字)');

    act(() => {
      root.unmount();
    });
  });

  it('names the skip reason when nothing can be generated (M10)', () => {
    const haCode = 'は'.codePointAt(0)!;
    const base = createDefaultProject();
    const project: FontProject = {
      ...base,
      id: 'test-project-m10',
      glyphs: {
        [haCode]: {
          unicode: haCode,
          char: 'は',
          name: 'uni306F',
          advanceWidth: 1000,
          lsb: 50,
          contours: [makeSquareContour('ha')],
        },
        ['ば'.codePointAt(0)!]: {
          unicode: 'ば'.codePointAt(0)!,
          char: 'ば',
          name: 'uni3070',
          advanceWidth: 1000,
          lsb: 50,
          contours: [makeSquareContour('ba')],
        },
        ['ぱ'.codePointAt(0)!]: {
          unicode: 'ぱ'.codePointAt(0)!,
          char: 'ぱ',
          name: 'uni3071',
          advanceWidth: 1000,
          lsb: 50,
          contours: [makeSquareContour('pa')],
        },
      },
    };
    const setProject = vi.fn();
    const commitHistory = vi.fn();
    const onClose = vi.fn();
    const showToast = vi.fn();

    const root = createRoot(container);
    act(() => {
      root.render(
        <SynthesisStateHarness
          project={project}
          setProject={setProject}
          commitHistory={commitHistory}
          showToast={showToast}
          onClose={onClose}
          execute="dakuten"
        />
      );
    });

    act(() => {
      container.querySelector('button')!.click();
    });

    expect(setProject).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(
      expect.stringContaining('生成先が作成済み: 2字'),
      'warning'
    );

    act(() => {
      root.unmount();
    });
  });

  it('disables the execute buttons when the target count is 0 (L6)', () => {
    const base = createDefaultProject();
    const project: FontProject = { ...base, id: 'test-project-empty', glyphs: {} };

    const root = createRoot(container);
    act(() => {
      root.render(
        <GlyphSynthesisModal
          isOpen={true}
          onClose={vi.fn()}
          project={project}
          setProject={vi.fn()}
          commitHistory={vi.fn()}
          showToast={vi.fn()}
          theme="light"
        />
      );
    });

    const dakuBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('濁音・半濁点を一括合成')
    );
    expect(dakuBtn).toBeDefined();
    expect((dakuBtn as HTMLButtonElement).disabled).toBe(true);

    const smallTabBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('小書き文字合成')
    );
    act(() => {
      smallTabBtn!.click();
    });
    const smallBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('小書き文字を一括生成')
    );
    expect(smallBtn).toBeDefined();
    expect((smallBtn as HTMLButtonElement).disabled).toBe(true);

    act(() => {
      root.unmount();
    });
  });

  it('resets scope and tab when the modal is closed and reopened (L7)', () => {
    const project = makeTestProject();
    const root = createRoot(container);
    const renderModal = (isOpen: boolean) => {
      act(() => {
        root.render(
          <GlyphSynthesisModal
            isOpen={isOpen}
            onClose={vi.fn()}
            project={project}
            setProject={vi.fn()}
            commitHistory={vi.fn()}
            showToast={vi.fn()}
            theme="light"
          />
        );
      });
    };

    renderModal(true);
    const katakanaBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'カタカナ'
    );
    act(() => {
      katakanaBtn!.click();
    });
    const smallTabBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('小書き文字合成')
    );
    act(() => {
      smallTabBtn!.click();
    });
    expect(
      Array.from(container.querySelectorAll('button')).some((b) =>
        b.textContent?.includes('小書き文字を一括生成')
      )
    ).toBe(true);

    renderModal(false);
    renderModal(true);

    // Scope is back to all (は is listed again) and the tab is back to dakuten.
    expect(
      Array.from(container.querySelectorAll('button')).some(
        (b) => b.textContent?.trim() === 'は'
      )
    ).toBe(true);
    expect(
      Array.from(container.querySelectorAll('button')).some((b) =>
        b.textContent?.includes('小書き文字を一括生成')
      )
    ).toBe(false);

    act(() => {
      root.unmount();
    });
  });

  it('keeps a hand-picked undrawn preview character across scope changes (L11)', () => {
    const project = makeTestProject();
    const root = createRoot(container);
    act(() => {
      root.render(
        <GlyphSynthesisModal
          isOpen={true}
          onClose={vi.fn()}
          project={project}
          setProject={vi.fn()}
          commitHistory={vi.fn()}
          showToast={vi.fn()}
          theme="light"
        />
      );
    });

    const saBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'さ'
    );
    act(() => {
      saBtn!.click();
    });
    expect(container.textContent).toContain('親文字「さ」がまだ作成されていません');

    const katakanaBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'カタカナ'
    );
    act(() => {
      katakanaBtn!.click();
    });
    expect(container.textContent).toContain('親文字「さ」がまだ作成されていません');

    const hiraganaBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'ひらがな'
    );
    act(() => {
      hiraganaBtn!.click();
    });
    expect(container.textContent).toContain('親文字「さ」がまだ作成されていません');

    act(() => {
      root.unmount();
    });
  });

  it('dakuten reset restores offsets and style (L10)', () => {
    const project = makeTestProject();
    const root = createRoot(container);
    act(() => {
      root.render(
        <GlyphSynthesisModal
          isOpen={true}
          onClose={vi.fn()}
          project={project}
          setProject={vi.fn()}
          commitHistory={vi.fn()}
          showToast={vi.fn()}
          theme="light"
        />
      );
    });

    // Move the X offset slider to +50.
    const slider = container.querySelectorAll('input[type="range"]')[0] as HTMLInputElement;
    const valueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    )!.set!;
    act(() => {
      valueSetter.call(slider, '50');
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(container.textContent).toContain('+50U');

    // Pick the round style, then reset.
    const roundBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === '丸'
    );
    act(() => {
      roundBtn!.click();
    });
    const accentBadge = getThemeClasses('light').accentBadge;
    expect(roundBtn!.className).toContain(accentBadge);

    const resetBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === '設定リセット'
    );
    expect(resetBtn).toBeDefined();
    act(() => {
      resetBtn!.click();
    });
    expect(container.textContent).not.toContain('+50U');
    const standardBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === '標準'
    );
    expect(standardBtn!.className).toContain(accentBadge);
    expect(roundBtn!.className).not.toContain(accentBadge);

    act(() => {
      root.unmount();
    });
  });

  it('shows the batch button for characters without single-generation actions (M7)', () => {
    const onOpenGlyphSynthesisModal = vi.fn();
    const root = createRoot(container);
    act(() => {
      root.render(
        <ViewControlsSubToolbar
          activeChar="ん"
          selectedUnicode={'ん'.codePointAt(0)}
          hasContours={true}
          onGenerateDakutenTarget={vi.fn()}
          onDuplicateAsSmallKana={vi.fn()}
          onOpenGlyphSynthesisModal={onOpenGlyphSynthesisModal}
          showCanvasToast={vi.fn()}
          showNodes={true}
          setShowNodes={vi.fn()}
          isOutlineMode={false}
          setOutlineOnly={vi.fn()}
          isLight={true}
        />
      );
    });

    const modalBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('一括合成')
    );
    expect(modalBtn).toBeDefined();
    expect(
      Array.from(container.querySelectorAll('button')).some((b) =>
        b.textContent?.includes('濁点')
      )
    ).toBe(false);

    act(() => {
      root.unmount();
    });
  });

  it('small-kana preview follows the project ascender', () => {
    const readSmallPreviewPath = (ascender: number): string => {
      const base = createDefaultProject();
      const project: FontProject = {
        ...base,
        id: `test-project-asc-${ascender}`,
        metadata: { ...base.metadata, ascender },
        glyphs: makeTestProject().glyphs,
      };
      const el = document.createElement('div');
      document.body.appendChild(el);
      const r = createRoot(el);
      act(() => {
        r.render(
          <GlyphSynthesisModal
            isOpen={true}
            onClose={vi.fn()}
            project={project}
            setProject={vi.fn()}
            commitHistory={vi.fn()}
            showToast={vi.fn()}
            theme="light"
          />
        );
      });
      const smallTabBtn = Array.from(el.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('小書き文字合成')
      );
      act(() => {
        smallTabBtn!.click();
      });
      const paths = el.querySelectorAll('svg[viewBox="0 0 1000 1000"] path');
      const d = paths[1]?.getAttribute('d') ?? '';
      act(() => {
        r.unmount();
      });
      el.remove();
      return d;
    };

    const path700 = readSmallPreviewPath(700);
    const path900 = readSmallPreviewPath(900);
    expect(path700.length).toBeGreaterThan(0);
    expect(path900.length).toBeGreaterThan(0);
    expect(path700).not.toBe(path900);
  });

  it('single small-kana generation confirms overwrite and drops stale pixel data (H5/H6)', async () => {
    const tsuCode = 'つ'.codePointAt(0)!;
    const smallCode = 'っ'.codePointAt(0)!;
    const base = createDefaultProject();
    let project: FontProject = {
      ...base,
      id: 'test-project-single-small',
      glyphs: {
        [tsuCode]: {
          unicode: tsuCode,
          char: 'つ',
          name: 'uni3064',
          advanceWidth: 1000,
          lsb: 50,
          contours: [makeSquareContour('tsu')],
        },
        [smallCode]: {
          unicode: smallCode,
          char: 'っ',
          name: 'uni3063',
          advanceWidth: 1000,
          lsb: 50,
          contours: [makeSquareContour('small-tsu')],
          pixelData: { width: 4, height: 4, data: Array.from({ length: 16 }, () => 1) },
          vectorContoursBackup: [makeSquareContour('backup')],
        },
      },
    };
    const setProject = vi.fn((updater: React.SetStateAction<FontProject>) => {
      project = typeof updater === 'function' ? updater(project) : updater;
    });
    const commitHistory = vi.fn();
    const onShowToast = vi.fn();
    const findDialogButton = (label: string) =>
      Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === label
      );
    const flush = async () => {
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
    };

    const root = createRoot(container);
    act(() => {
      root.render(
        <GlyphActionsHarness
          project={project}
          setProject={setProject}
          selectedUnicode={tsuCode}
          selectedChar="つ"
          commitHistory={commitHistory}
          onShowToast={onShowToast}
        />
      );
    });

    const makeSmallBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'make-small'
    );
    act(() => {
      makeSmallBtn!.click();
    });
    await flush();
    // The custom confirm dialog shows the same message window.confirm used.
    expect(document.body.textContent).toContain(
      '「っ」には既に字形があります。上書きしますか？'
    );
    expect(setProject).not.toHaveBeenCalled();

    act(() => {
      findDialogButton('キャンセル')!.click();
    });
    await flush();
    expect(setProject).not.toHaveBeenCalled();

    act(() => {
      makeSmallBtn!.click();
    });
    await flush();
    act(() => {
      findDialogButton('OK')!.click();
    });
    await flush();
    expect(setProject).toHaveBeenCalledTimes(1);
    const target = project.glyphs[smallCode];
    expect(target?.contours.length).toBe(1);
    expect(target?.pixelData).toBeUndefined();
    expect(target?.vectorContoursBackup).toBeUndefined();

    act(() => {
      root.unmount();
    });
  });

  it('single dakuten generation confirms overwrite and drops stale pixel data (H5/H6)', async () => {
    const haCode = 'は'.codePointAt(0)!;
    const dakuCode = 'づ'.codePointAt(0)!;
    const base = createDefaultProject();
    let project: FontProject = {
      ...base,
      id: 'test-project-single-daku',
      glyphs: {
        [haCode]: {
          unicode: haCode,
          char: 'は',
          name: 'uni306F',
          advanceWidth: 1000,
          lsb: 50,
          contours: [makeSquareContour('ha')],
        },
        [dakuCode]: {
          unicode: dakuCode,
          char: 'づ',
          name: 'uni3065',
          advanceWidth: 1000,
          lsb: 50,
          contours: [makeSquareContour('du')],
          pixelData: { width: 4, height: 4, data: Array.from({ length: 16 }, () => 1) },
          vectorContoursBackup: [makeSquareContour('backup')],
        },
      },
    };
    const setProject = vi.fn((updater: React.SetStateAction<FontProject>) => {
      project = typeof updater === 'function' ? updater(project) : updater;
    });
    const commitHistory = vi.fn();
    const onShowToast = vi.fn();
    const findDialogButton = (label: string) =>
      Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === label
      );
    const flush = async () => {
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
    };

    const root = createRoot(container);
    act(() => {
      root.render(
        <GlyphActionsHarness
          project={project}
          setProject={setProject}
          selectedUnicode={haCode}
          selectedChar="は"
          commitHistory={commitHistory}
          onShowToast={onShowToast}
        />
      );
    });

    const makeDakuBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'make-daku'
    );
    act(() => {
      makeDakuBtn!.click();
    });
    await flush();
    // The custom confirm dialog shows the same message window.confirm used.
    expect(document.body.textContent).toContain(
      '「づ」には既に字形があります。上書きしますか？'
    );
    expect(setProject).not.toHaveBeenCalled();

    act(() => {
      findDialogButton('キャンセル')!.click();
    });
    await flush();
    expect(setProject).not.toHaveBeenCalled();

    act(() => {
      makeDakuBtn!.click();
    });
    await flush();
    act(() => {
      findDialogButton('OK')!.click();
    });
    await flush();
    expect(setProject).toHaveBeenCalledTimes(1);
    const target = project.glyphs[dakuCode];
    expect(target?.contours.length).toBe(3);
    expect(target?.pixelData).toBeUndefined();
    expect(target?.vectorContoursBackup).toBeUndefined();

    act(() => {
      root.unmount();
    });
  });

  it('M12: locked targets are excluded from a batch while free targets are generated and marked modified', () => {
    const haCode = 'は'.codePointAt(0)!;
    const baCode = 'ば'.codePointAt(0)!;
    const paCode = 'ぱ'.codePointAt(0)!;
    const base = createDefaultProject();
    let project: FontProject = {
      ...base,
      id: 'test-project-locked-batch',
      glyphs: {
        [haCode]: {
          unicode: haCode,
          char: 'は',
          name: 'uni306F',
          advanceWidth: 1000,
          lsb: 50,
          contours: [makeSquareContour('ha')],
        },
        [baCode]: {
          unicode: baCode,
          char: 'ば',
          name: 'uni3070',
          advanceWidth: 1000,
          lsb: 50,
          contours: [makeSquareContour('ba-locked')],
          locked: true,
        },
      },
    };
    const setProject = vi.fn((updater: React.SetStateAction<FontProject>) => {
      project = typeof updater === 'function' ? updater(project) : updater;
    });
    const commitHistory = vi.fn();
    const onClose = vi.fn();
    const showToast = vi.fn();

    const root = createRoot(container);
    act(() => {
      root.render(
        <SynthesisStateHarness
          project={project}
          setProject={setProject}
          commitHistory={commitHistory}
          showToast={showToast}
          onClose={onClose}
          execute="dakuten"
        />
      );
    });

    act(() => {
      container.querySelector('button')!.click();
    });

    // Only ぱ is generated; the locked ば keeps its original contour.
    expect(commitHistory).toHaveBeenCalledTimes(1);
    expect(commitHistory).toHaveBeenCalledWith(paCode);
    expect(commitHistory).not.toHaveBeenCalledWith(baCode);
    expect(project.glyphs[paCode]?.contours.length).toBe(3);
    expect(project.glyphs[paCode]?.modified).toBe(true);
    expect(project.glyphs[baCode]?.contours[0].id).toBe('ba-locked');
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('1 文字'), 'success');
    expect(onClose).toHaveBeenCalledTimes(1);

    act(() => {
      root.unmount();
    });
  });

  it('M12: small-kana batch with generatedCount 0 warns with the existing-target reason and applies nothing', () => {
    const tsuCode = 'つ'.codePointAt(0)!;
    const smallCode = 'っ'.codePointAt(0)!;
    const base = createDefaultProject();
    const project: FontProject = {
      ...base,
      id: 'test-project-small-zero',
      glyphs: {
        [tsuCode]: {
          unicode: tsuCode,
          char: 'つ',
          name: 'uni3064',
          advanceWidth: 1000,
          lsb: 50,
          contours: [makeSquareContour('tsu')],
        },
        [smallCode]: {
          unicode: smallCode,
          char: 'っ',
          name: 'uni3063',
          advanceWidth: 1000,
          lsb: 50,
          contours: [makeSquareContour('small-tsu')],
        },
      },
    };
    const setProject = vi.fn();
    const commitHistory = vi.fn();
    const onClose = vi.fn();
    const showToast = vi.fn();

    const root = createRoot(container);
    act(() => {
      root.render(
        <SynthesisStateHarness
          project={project}
          setProject={setProject}
          commitHistory={commitHistory}
          showToast={showToast}
          onClose={onClose}
          execute="smallKana"
        />
      );
    });

    act(() => {
      container.querySelector('button')!.click();
    });

    expect(setProject).not.toHaveBeenCalled();
    expect(commitHistory).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(
      expect.stringContaining('生成先が作成済み: 1字'),
      'warning'
    );

    act(() => {
      root.unmount();
    });
  });

  it('M12: reopening the modal resets offsets, style, and tab (L7)', () => {
    const project = makeTestProject();
    const root = createRoot(container);
    const renderModal = (isOpen: boolean) => {
      act(() => {
        root.render(
          <GlyphSynthesisModal
            isOpen={isOpen}
            onClose={vi.fn()}
            project={project}
            setProject={vi.fn()}
            commitHistory={vi.fn()}
            showToast={vi.fn()}
            theme="light"
          />
        );
      });
    };

    renderModal(true);

    // Move the X offset slider to +50 and pick the round style.
    const slider = container.querySelectorAll('input[type="range"]')[0] as HTMLInputElement;
    const valueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    )!.set!;
    act(() => {
      valueSetter.call(slider, '50');
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(container.textContent).toContain('+50U');
    const roundBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === '丸'
    );
    act(() => {
      roundBtn!.click();
    });

    // Switch to the small-kana tab, then close and reopen.
    const smallTabBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('小書き文字合成')
    );
    act(() => {
      smallTabBtn!.click();
    });
    expect(
      Array.from(container.querySelectorAll('button')).some((b) =>
        b.textContent?.includes('小書き文字を一括生成')
      )
    ).toBe(true);

    renderModal(false);
    renderModal(true);

    // Offset and style are back to defaults and the tab is back to dakuten.
    expect(container.textContent).not.toContain('+50U');
    const accentBadge = getThemeClasses('light').accentBadge;
    const standardBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === '標準'
    );
    expect(standardBtn!.className).toContain(accentBadge);
    expect(
      Array.from(container.querySelectorAll('button')).some((b) =>
        b.textContent?.includes('小書き文字を一括生成')
      )
    ).toBe(false);
    expect(
      Array.from(container.querySelectorAll('button')).some((b) =>
        b.textContent?.includes('濁音・半濁点を一括合成')
      )
    ).toBe(true);

    act(() => {
      root.unmount();
    });
  });

  it('single dakuten generation does not ask when the target is locked (H6)', () => {
    const haCode = 'は'.codePointAt(0)!;
    const dakuCode = 'づ'.codePointAt(0)!;
    const base = createDefaultProject();
    const project: FontProject = {
      ...base,
      id: 'test-project-single-locked',
      glyphs: {
        [haCode]: {
          unicode: haCode,
          char: 'は',
          name: 'uni306F',
          advanceWidth: 1000,
          lsb: 50,
          contours: [makeSquareContour('ha')],
        },
        [dakuCode]: {
          unicode: dakuCode,
          char: 'づ',
          name: 'uni3065',
          advanceWidth: 1000,
          lsb: 50,
          contours: [makeSquareContour('du')],
          locked: true,
        },
      },
    };
    const setProject = vi.fn();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    const root = createRoot(container);
    act(() => {
      root.render(
        <GlyphActionsHarness
          project={project}
          setProject={setProject}
          selectedUnicode={haCode}
          selectedChar="は"
          commitHistory={vi.fn()}
          onShowToast={vi.fn()}
        />
      );
    });

    const makeDakuBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'make-daku'
    );
    act(() => {
      makeDakuBtn!.click();
    });
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(setProject).not.toHaveBeenCalled();

    act(() => {
      root.unmount();
    });
  });
});
