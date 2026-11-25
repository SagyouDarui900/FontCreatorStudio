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
import { AkiryoCompareView } from './AkiryoCompareView';
import { MojikumiSidebar } from './MojikumiSidebar';
import { AOZORA_TEXTS } from './aozoraTexts';
import { getThemeClasses } from '../../utils/theme';
import { MojikumiStudioModal } from '../MojikumiStudioModal';
import {
  calculateTypesettingDimensions,
  PRESET_BETA,
} from '../../utils/mojikumiEngine';

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

  it('says the collected work is an excerpt of its opening part (L12)', () => {
    const { container } = renderModal();
    expect(container.textContent).toContain('冒頭部分の抜粋');
  });

  it('wraps header bar 2 controls without clipping and provides Q/H stepper buttons', () => {
    const { container } = renderModal();
    // Header bar 2 should wrap rather than clip on desktop widths
    const zoomInBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.getAttribute('title') === '拡大'
    );
    expect(zoomInBtn).toBeDefined();
    const headerBar2 = zoomInBtn!.closest('.flex-wrap');
    expect(headerBar2).not.toBeNull();
    expect(headerBar2!.className).not.toContain('overflow-x-auto');

    // Q・H設計 tab exposes +/- steppers for 文字サイズ
    clickButton(container, 'Q・H設計');
    const incQBtn = container.querySelector('button[aria-label="文字サイズを0.5Q上げる"]') as HTMLButtonElement | null;
    expect(incQBtn).not.toBeNull();
    act(() => {
      incQBtn!.click();
    });
    expect(container.textContent).toContain('14.5Q');
  });
});

describe('Low findings L13 / L14 / L15 / L16 / L18 / L21 / L23', () => {
  const bookProps = {
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

  it('drops the ruby note from みだれ髪 instead of typesetting it as body text (L13)', () => {
    const work = AOZORA_TEXTS.find((w) => w.id === 'midaregami');
    expect(work).toBeDefined();
    expect(work!.text).not.toContain('（はたち）');
    expect(work!.text).toContain('その子二十櫛にながるる黒髪の');
  });

  it('numbers the first spread 1-2 (L14)', () => {
    const layout = makeLayout([['あ'], ['い']]);
    const { container } = renderIntoDom(
      <BookSpreadView layout={layout} {...bookProps} lineCount={14} />
    );
    expect(container.textContent).toContain('- 1 -');
    expect(container.textContent).toContain('- 2 -');
    expect(container.textContent).not.toContain('- 12 -');
    expect(container.textContent).not.toContain('- 13 -');
  });

  it('uses the same Q-to-px size in the poetry view as in the book view (L15)', () => {
    const layout = makeLayout([['あ']]);
    const { container } = renderIntoDom(
      <PoetryTanzakuView
        layout={layout}
        title="月に吠える"
        author="萩原朔太郎"
        isLight={true}
        fontFamily="serif"
        fontSizeQ={14}
        lineFeedH={24}
        lineCount={14}
        zoom={1}
        isVertical={true}
        showGrid={false}
      />
    );
    // 14Q at the shared 1.35 factor is 19px (the old 1.4 factor gave 20px).
    const sizes = Array.from(container.querySelectorAll('span')).map((s) => s.style.fontSize);
    expect(sizes).toContain('19px');
    expect(sizes).not.toContain('20px');
  });

  it('explains the pale-red overflown lines in every view that uses them (L16)', () => {
    const overflown = makeLayout([['あ']]);
    overflown.lines[0].isOverflown = true;
    const book = renderIntoDom(
      <BookSpreadView layout={overflown} {...bookProps} lineCount={14} />
    );
    expect(book.container.textContent).toContain('薄赤の行は行長を超えたはみ出し行');
    const magazine = renderIntoDom(
      <MagazineLayoutView
        layout={overflown}
        title="吾輩は猫である"
        author="夏目漱石"
        headline="見出し"
        lead="リード"
        isLight={true}
        fontFamily="serif"
        fontSizeQ={14}
        lineFeedH={24}
        lineCount={14}
        isVertical={true}
        showGrid={false}
        zoom={1}
      />
    );
    expect(magazine.container.textContent).toContain('薄赤の行は行長を超えたはみ出し行');
    const poetry = renderIntoDom(
      <PoetryTanzakuView
        layout={overflown}
        title="月に吠える"
        author="萩原朔太郎"
        isLight={true}
        fontFamily="serif"
        fontSizeQ={14}
        lineFeedH={24}
        lineCount={14}
        zoom={1}
        isVertical={true}
        showGrid={false}
      />
    );
    expect(poetry.container.textContent).toContain('薄赤の行は行長を超えたはみ出し行');
    const compare = renderIntoDom(
      <AkiryoCompareView
        betaLayout={overflown}
        tsumeLayout={overflown}
        akeLayout={overflown}
        charsPerLine={20}
        fontSizeQ={14}
        lineFeedH={24}
        lineCount={14}
        showGrid={false}
        isVertical={true}
        isLight={true}
        fontFamily="serif"
        zoom={1}
      />
    );
    expect(compare.container.textContent).toContain('薄赤の行は行長を超えたはみ出し行');
  });

  it('shows the aki-amount tooltip in the horizontal compare branch too (L18)', () => {
    const layout = makeLayout([['あ', '、']]);
    const { container } = renderIntoDom(
      <AkiryoCompareView
        betaLayout={layout}
        tsumeLayout={layout}
        akeLayout={layout}
        charsPerLine={20}
        fontSizeQ={14}
        lineFeedH={24}
        lineCount={14}
        showGrid={false}
        isVertical={false}
        isLight={true}
        fontFamily="serif"
        zoom={1}
      />
    );
    const titled = Array.from(container.querySelectorAll('[title*="前アキ"]'));
    expect(titled.length).toBeGreaterThan(0);
    expect(titled[0].getAttribute('title')).toContain('後アキ');
  });

  it('does not put an engine hanging mark in a normal manuscript cell (L21)', () => {
    const layout = makeLayout([['あ', 'い', '。']]);
    layout.lines[0].glyphs[2].isHanging = true;
    const viewProps = {
      title: '銀河鉄道の夜',
      author: '宮沢賢治',
      isLight: true,
      fontFamily: 'serif',
      fontSizeQ: 14,
      zoom: 1,
      lineFeedH: 24,
      showGrid: true,
    };
    const vertical = renderIntoDom(
      <ManuscriptView layout={layout} {...viewProps} isVertical={true} />
    );
    expect(
      vertical.container.querySelector('[title="ぶら下がり約物「。」"]')
    ).not.toBeNull();
    const horizontal = renderIntoDom(
      <ManuscriptView layout={layout} {...viewProps} isVertical={false} />
    );
    expect(
      horizontal.container.querySelector('[title="ぶら下がり約物「。」"]')
    ).not.toBeNull();
  });

  it('clamps a negative line gap to 0 in the sidebar but keeps the warning (L23)', () => {
    const dimensions = calculateTypesettingDimensions(14, 10, 20, 14, true);
    expect(dimensions.lineGapH).toBe(-4);
    const { container } = renderIntoDom(
      <MojikumiSidebar
        isLight={true}
        themeClasses={getThemeClasses('light')}
        mobileTab="preview"
        onChangeMobileTab={vi.fn()}
        sidebarTab="dimensions"
        onChangeSidebarTab={vi.fn()}
        selectedWorkId="wagahai"
        onSelectWork={vi.fn()}
        customText="あ"
        onChangeCustomText={vi.fn()}
        fontSizeQ={14}
        onChangeFontSizeQ={vi.fn()}
        lineFeedH={10}
        onChangeLineFeedH={vi.fn()}
        charsPerLine={20}
        onChangeCharsPerLine={vi.fn()}
        lineCount={14}
        onChangeLineCount={vi.fn()}
        dimensions={dimensions}
        currentConfig={{
          preset: 'beta',
          table: PRESET_BETA,
          kinsoku: 'weak_v2',
          kinsokuAdjust: 'push_out',
          burasagari: 'standard',
          paragraphIndent: 'visual_half',
        }}
        onSelectPreset={vi.fn()}
        onChangeKinsoku={vi.fn()}
        onChangeBurasagari={vi.fn()}
        onChangeParagraphIndent={vi.fn()}
        onChangeKinsokuAdjust={vi.fn()}
      />
    );
    expect(container.textContent).toContain('行間: 0H');
    expect(container.textContent).not.toContain('行間: -4H');
    expect(container.textContent).toContain('行送りが文字サイズ未満です');
  });
});
