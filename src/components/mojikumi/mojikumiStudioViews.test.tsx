// @vitest-environment jsdom
// View and modal tests for the mojikumi fixes (review 2026-11-24):
// M14 (lineCount pagination), M15 (manuscript horizontal / line feed / grid),
// M16 (work switch confirm), M17 (custom text display), M18 (indent /
// kinsoku-adjust UI), M19 (tate-chu-yoko), M20 (page reset).
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FontProject, GlyphData } from '../../types';
import {
  FormattedGlyph,
  FormattedLayoutResult,
} from '../../utils/mojikumiEngine';
import { BookSpreadView } from './BookSpreadView';
import { MagazineLayoutView } from './MagazineLayoutView';
import { ManuscriptView } from './ManuscriptView';
import { PoetryTanzakuView } from './PoetryTanzakuView';
import { MojikumiStudioModal } from '../MojikumiStudioModal';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

function makeGlyph(char: string, index: number, tateChuYoko = false): FormattedGlyph {
  return {
    char,
    charIndex: index,
    kind: 'non_yakumono',
    baseAdvanceEm: 1,
    spacingBeforeEm: 0,
    spacingAfterEm: 0,
    isHanging: false,
    tateChuYoko: tateChuYoko || undefined,
  };
}

function makeLayout(lineTexts: string[][], tateChars = new Set<string>()): FormattedLayoutResult {
  let index = 0;
  const lines = lineTexts.map((chars, lineIndex) => ({
    lineIndex,
    glyphs: chars.map((char) => makeGlyph(char, index++, tateChars.has(char))),
    text: chars.join(''),
    isParagraphStart: lineIndex === 0,
    isParagraphEnd: false,
    totalAdvanceEm: chars.length,
    isOverflown: false,
    burasagariCount: 0,
  }));
  return {
    lines,
    totalChars: index,
    lineCount: lines.length,
    burasagariCount: 0,
    averageDensityPercent: 100,
  };
}

function makeProject(): FontProject {
  const glyph: GlyphData = {
    unicode: 0x3042,
    char: 'あ',
    name: 'uni3042',
    advanceWidth: 1000,
    lsb: 100,
    contours: [
      {
        id: 'c1',
        closed: true,
        nodes: [
          { id: 'n1', x: 100, y: 200, type: 'corner' },
          { id: 'n2', x: 600, y: 200, type: 'corner' },
          { id: 'n3', x: 600, y: 800, type: 'corner' },
          { id: 'n4', x: 100, y: 800, type: 'corner' },
        ],
      },
    ],
  };
  return {
    id: 'mojikumi-view-test',
    name: 'MojikumiViewTest',
    metadata: {
      familyName: 'MojikumiViewTest',
      styleName: 'Regular',
      designer: 'Tester',
      copyright: 'Copyright (c) 2026 Tester',
      version: '1.000',
      unitsPerEm: 1000,
      ascender: 800,
      descender: -200,
      lineGap: 0,
      capHeight: 700,
      xHeight: 500,
    },
    glyphs: { 0x3042: glyph },
    kerning: {},
    createdAt: 1,
    updatedAt: 1,
  } as unknown as FontProject;
}

const roots: Root[] = [];
const containers: HTMLElement[] = [];

function renderIntoDom(element: React.ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(element);
  });
  roots.push(root);
  containers.push(container);
  return { container, root };
}

function rerender(root: Root, element: React.ReactElement) {
  act(() => {
    root.render(element);
  });
}

afterEach(() => {
  while (roots.length > 0) {
    const r = roots.pop()!;
    act(() => r.unmount());
  }
  while (containers.length > 0) {
    containers.pop()!.remove();
  }
  vi.unstubAllGlobals();
});

function setTextareaValue(textarea: HTMLTextAreaElement, value: string) {
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value'
    )?.set;
    setter?.call(textarea, value);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function clickButton(container: HTMLElement, label: string): HTMLElement {
  const btn = Array.from(container.querySelectorAll('button')).find((b) =>
    b.textContent?.includes(label)
  );
  expect(btn).toBeDefined();
  act(() => {
    btn!.click();
  });
  return btn!;
}

describe('BookSpreadView (M14 / M19 / M20)', () => {
  const viewProps = {
    title: '吾輩は猫である',
    author: '夏目漱石',
    isLight: true,
    fontFamily: 'serif',
    fontSizeQ: 14,
    lineFeedH: 24,
    charsPerLine: 20,
    showGrid: false,
    isVertical: true,
    zoom: 1,
  };

  it('paginates by lineCount instead of a fixed 12 lines per page (M14)', () => {
    const layout = makeLayout(Array.from({ length: 30 }, () => ['あ']));
    const { container } = renderIntoDom(
      <BookSpreadView layout={layout} {...viewProps} lineCount={5} />
    );
    // 5 lines per page = 10 per spread; 30 lines = 3 spreads.
    expect(container.textContent).toContain('1/3');
    expect(container.textContent).toContain('1頁行数: 5行');
  });

  it('shows a single spread when lineCount covers all lines (M14)', () => {
    const layout = makeLayout(Array.from({ length: 30 }, () => ['あ']));
    const { container } = renderIntoDom(
      <BookSpreadView layout={layout} {...viewProps} lineCount={15} />
    );
    expect(container.textContent).not.toContain('1/3');
  });

  it('draws a tate-chu-yoko run as one horizontal cell (M19)', () => {
    const tate = new Set(['2', '0', '6']);
    const layout = makeLayout([['あ', '2', '0', '2', '6', '年']], tate);
    const { container } = renderIntoDom(
      <BookSpreadView layout={layout} {...viewProps} lineCount={14} />
    );
    const group = container.querySelector('[data-tate-chu-yoko="true"]');
    expect(group).not.toBeNull();
    expect(group!.textContent).toBe('2026');
    expect(container.querySelectorAll('[data-tate-chu-yoko="true"]')).toHaveLength(1);
  });

  it('returns to the first spread when pageResetKey changes (M20)', () => {
    const layout = makeLayout(Array.from({ length: 30 }, () => ['あ']));
    const { container, root } = renderIntoDom(
      <BookSpreadView layout={layout} {...viewProps} lineCount={5} pageResetKey="wagahai:book_spread" />
    );
    clickButton(container, '次見開き');
    expect(container.textContent).toContain('2/3');
    rerender(
      root,
      <BookSpreadView layout={layout} {...viewProps} lineCount={5} pageResetKey="ginga:book_spread" />
    );
    expect(container.textContent).toContain('1/3');
  });
});

describe('ManuscriptView (M15 / M19 / M20)', () => {
  const viewProps = {
    title: '銀河鉄道の夜',
    author: '宮沢賢治',
    isLight: true,
    fontFamily: 'serif',
    fontSizeQ: 14,
    zoom: 1,
    charsPerLine: 20,
    lineFeedH: 24,
    showGrid: true,
  };

  it('renders horizontally when isVertical is false (M15)', () => {
    const layout = makeLayout([['あ', 'い', 'う'], ['か', 'き', 'く']]);
    const { container } = renderIntoDom(
      <ManuscriptView layout={layout} {...viewProps} isVertical={false} />
    );
    expect(container.textContent).toContain('横書き');
    expect(container.textContent).toContain('あ');
    expect(container.textContent).toContain('行送り: 24H');
  });

  it('draws a tate-chu-yoko run as one cell in vertical mode (M19)', () => {
    const tate = new Set(['2', '0', '6']);
    const layout = makeLayout([['あ', '2', '0', '2', '6', '年']], tate);
    const { container } = renderIntoDom(
      <ManuscriptView layout={layout} {...viewProps} isVertical={true} />
    );
    const group = container.querySelector('[data-tate-chu-yoko="true"]');
    expect(group).not.toBeNull();
    expect(group!.textContent).toBe('2026');
  });

  it('returns to the first sheet when pageResetKey changes (M20)', () => {
    const layout = makeLayout(Array.from({ length: 25 }, () => ['あ']));
    const { container, root } = renderIntoDom(
      <ManuscriptView layout={layout} {...viewProps} isVertical={true} pageResetKey="wagahai:manuscript" />
    );
    expect(container.textContent).toContain('第 1 枚 / 2 枚');
    clickButton(container, '次枚');
    expect(container.textContent).toContain('第 2 枚 / 2 枚');
    rerender(
      root,
      <ManuscriptView layout={layout} {...viewProps} isVertical={true} pageResetKey="ginga:manuscript" />
    );
    expect(container.textContent).toContain('第 1 枚 / 2 枚');
  });

  it('hides the cell ruling when showGrid is false (M15)', () => {
    const layout = makeLayout([['あ']]);
    const { container } = renderIntoDom(
      <ManuscriptView layout={layout} {...viewProps} isVertical={true} showGrid={false} />
    );
    expect(container.textContent).toContain('マス目非表示');
  });
});

describe('MagazineLayoutView and PoetryTanzakuView (M14)', () => {
  it('paginates magazine columns by lineCount (M14)', () => {
    const layout = makeLayout(Array.from({ length: 30 }, () => ['あ']));
    const { container } = renderIntoDom(
      <MagazineLayoutView
        layout={layout}
        title="吾輩は猫である"
        author="夏目漱石"
        headline="見出し"
        lead="リード"
        isLight={true}
        fontFamily="serif"
        fontSizeQ={14}
        lineFeedH={24}
        lineCount={5}
        isVertical={true}
        showGrid={false}
        zoom={1}
      />
    );
    // 5 lines per column = 10 per page; 30 lines = 3 pages.
    expect(container.textContent).toContain('1 / 3 頁');
  });

  it('paginates poetry slips by lineCount (M14)', () => {
    const layout = makeLayout(Array.from({ length: 30 }, () => ['あ']));
    const { container } = renderIntoDom(
      <PoetryTanzakuView
        layout={layout}
        title="吾輩は猫である"
        author="夏目漱石"
        isLight={true}
        fontFamily="serif"
        fontSizeQ={14}
        lineFeedH={24}
        lineCount={5}
        zoom={1}
        isVertical={true}
        showGrid={false}
      />
    );
    expect(container.textContent).toContain('短冊 1 / 6');
  });
});

describe('MojikumiStudioModal (M16 / M17 / M18)', () => {
  function renderModal() {
    const onShowToast = vi.fn();
    const project = makeProject();
    const rendered = renderIntoDom(
      <MojikumiStudioModal
        isOpen={true}
        onClose={vi.fn()}
        project={project}
        setProject={vi.fn()}
        theme="light"
        onShowToast={onShowToast}
      />
    );
    return { ...rendered, onShowToast };
  }

  it('shows the custom state after editing the text (M17) and notes it is not saved (M16)', () => {
    const { container } = renderModal();
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea).not.toBeNull();
    setTextareaValue(textarea, 'これはカスタムの文章です。');
    expect(container.textContent).toContain('カスタムテキスト');
    expect(container.textContent).toContain('カスタム編集中');
    expect(container.textContent).toContain('カスタムテキストはプロジェクトに保存されません');
  });

  it('confirms before a work switch discards edited custom text (M16)', () => {
    const confirmMock = vi.fn(() => false);
    vi.stubGlobal('confirm', confirmMock);
    const { container } = renderModal();
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    setTextareaValue(textarea, 'これはカスタムの文章です。');

    const gingaCard = Array.from(container.querySelectorAll('div')).find(
      (d) => d.className.includes('cursor-pointer') && d.textContent?.includes('銀河鉄道の夜')
    );
    expect(gingaCard).toBeDefined();
    act(() => {
      gingaCard!.click();
    });
    expect(confirmMock).toHaveBeenCalledTimes(1);
    // Declined: the edited text stays and the header still shows custom.
    expect((container.querySelector('textarea') as HTMLTextAreaElement).value).toBe(
      'これはカスタムの文章です。'
    );
    expect(container.textContent).toContain('カスタムテキスト');

    confirmMock.mockReturnValue(true);
    act(() => {
      gingaCard!.click();
    });
    expect(confirmMock).toHaveBeenCalledTimes(2);
    expect(container.textContent).toContain('銀河鉄道の夜');
    expect(container.textContent).not.toContain('カスタム編集中');
  });

  it('offers paragraph indent and kinsoku adjust controls that show the current value (M18)', () => {
    const { container } = renderModal();
    clickButton(container, '禁則設定');
    expect(container.textContent).toContain('段落字下げ');
    expect(container.textContent).toContain('禁則の追い出し・追い込み');
    expect(container.textContent).toContain('現在：見た目半角下がり（既定）');
    expect(container.textContent).toContain('現在：追い出し');

    const pushIn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === '追い込み'
    );
    expect(pushIn).toBeDefined();
    act(() => {
      pushIn!.click();
    });
    expect(pushIn!.getAttribute('aria-pressed')).toBe('true');
    expect(container.textContent).toContain('現在：追い込み');

    const fullIndent = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === '見た目全角下がり'
    );
    expect(fullIndent).toBeDefined();
    act(() => {
      fullIndent!.click();
    });
    expect(fullIndent!.getAttribute('aria-pressed')).toBe('true');
    expect(container.textContent).toContain('現在：見た目全角下がり');
  });

  it('labels the save button with its scope (M22)', () => {
    const { container } = renderModal();
    const saveBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('設定を保存')
    );
    expect(saveBtn).toBeDefined();
    expect(saveBtn!.getAttribute('title')).toContain('プリセット・禁則・ぶら下がり・段落字下げ');
  });
});
