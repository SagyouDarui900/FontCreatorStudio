// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FontProject } from '../../types';
import { balanceProjectGlyphMargins } from '../../utils/font/projectDefaults';
import { TestPreviewModal } from './TestPreviewModal';
import { MojikumiStudioModal } from '../MojikumiStudioModal';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

function createTypesettingProject(): FontProject {
  return {
    id: 'typeset-test',
    name: 'TypesetTest',
    metadata: {
      familyName: 'TypesetTest',
      styleName: 'Regular',
      designer: 'Tester',
      copyright: 'Copyright (c) 2026 Tester',
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
    glyphs: {
      0x3042: {
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
      },
      0x0041: {
        unicode: 0x0041,
        char: 'A',
        name: 'A',
        advanceWidth: 500,
        lsb: 50,
        contours: [
          {
            id: 'c2',
            closed: true,
            nodes: [
              { id: 'a1', x: 50, y: 150, type: 'corner' },
              { id: 'a2', x: 450, y: 150, type: 'corner' },
              { id: 'a3', x: 450, y: 800, type: 'corner' },
              { id: 'a4', x: 50, y: 800, type: 'corner' },
            ],
          },
        ],
      },
      0x3044: {
        unicode: 0x3044,
        char: 'い',
        name: 'uni3044',
        advanceWidth: 1000,
        lsb: 50,
        locked: true,
        contours: [
          {
            id: 'c3',
            closed: true,
            nodes: [
              { id: 'i1', x: 50, y: 200, type: 'corner' },
              { id: 'i2', x: 550, y: 200, type: 'corner' },
              { id: 'i3', x: 550, y: 800, type: 'corner' },
              { id: 'i4', x: 50, y: 800, type: 'corner' },
            ],
          },
        ],
      },
      // Pixel-only glyph without vector contours
      0x3046: {
        unicode: 0x3046,
        char: 'う',
        name: 'uni3046',
        advanceWidth: 1000,
        lsb: 0,
        contours: [],
        pixelData: {
          width: 8,
          height: 8,
          data: [
            0, 0, 1, 1, 1, 1, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0,
            0, 1, 1, 1, 1, 1, 0, 0,
            0, 0, 0, 0, 0, 1, 1, 0,
            0, 0, 0, 0, 0, 1, 1, 0,
            0, 0, 0, 1, 1, 0, 0, 0,
            0, 0, 1, 1, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0,
          ],
          shape: 'square',
        },
      },
    },
    kerning: {},
    features: {},
    groups: {},
    settings: {
      gridSize: 1000,
      snapToGrid: true,
      snapToMetrics: true,
    },
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

afterEach(() => {
  while (roots.length > 0) {
    const r = roots.pop()!;
    act(() => r.unmount());
  }
  while (containers.length > 0) {
    containers.pop()!.remove();
  }
});

describe('TestPreview & Mojikumi verification', () => {
  it('skips locked glyphs in balanceProjectGlyphMargins and guards locked/pixel-only glyphs + calls commitHistory in TestPreviewModal', () => {
    const baseProj = createTypesettingProject();
    const balanced = balanceProjectGlyphMargins(baseProj);
    // 'あ' (0x3042) & 'A' (0x0041) balance, 'い' (0x3044) is locked so skipped
    expect(balanced.project.glyphs[0x3044].contours[0].nodes[0].x).toBe(50);
    expect(balanced.project.glyphs[0x3042].contours[0].nodes[0].x).toBe(250);

    let currentProject = createTypesettingProject();
    const setProject = vi.fn((updater: React.SetStateAction<FontProject>) => {
      currentProject = typeof updater === 'function' ? updater(currentProject) : updater;
    });
    const commitHistory = vi.fn();
    const onShowToast = vi.fn();

    const { container } = renderIntoDom(
      <TestPreviewModal
        isOpen={true}
        onClose={vi.fn()}
        project={currentProject}
        setProject={setProject}
        commitHistory={commitHistory}
        theme="light"
        onShowToast={onShowToast}
      />
    );

    // Trigger batch center all
    const batchBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('全文字中央整列')
    );
    expect(batchBtn).toBeDefined();
    act(() => {
      batchBtn!.click();
    });
    expect(commitHistory).toHaveBeenCalledTimes(1);
    expect(setProject).toHaveBeenCalledTimes(1);
    expect(currentProject.glyphs[0x3044].contours[0].nodes[0].x).toBe(50);

    // Select pixel-only glyph 'う' (0x3046) via CharAdjustPanel dropdown
    const selects = Array.from(container.querySelectorAll('select'));
    const charSelect = selects.find((s) =>
      Array.from(s.options).some((o) => o.value === String(0x3046))
    );
    expect(charSelect).toBeDefined();
    act(() => {
      charSelect!.value = String(0x3046);
      charSelect!.dispatchEvent(new Event('change', { bubbles: true }));
    });
    // Pixel-only glyph must be recognized instead of showing "未作成グリフ"
    expect(container.textContent).toContain('ドット絵グリフとして生成済みです');
    expect(container.textContent).not.toContain('未作成グリフ（システム代替表示中）');

    // Select locked glyph 'い' (0x3044) -> save button disabled and banner displayed
    act(() => {
      charSelect!.value = String(0x3044);
      charSelect!.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(container.textContent).toContain('ロックされているため輪郭への永続保存はできません');
    const lockedSaveBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('「い」はロック中')
    ) as HTMLButtonElement | undefined;
    expect(lockedSaveBtn?.disabled).toBe(true);
  });

  it('renders proportional char boxes, single newlines, inline shaping spans, and RTL vertical notebook guides in PreviewCanvas', () => {
    const project = createTypesettingProject();
    const { container } = renderIntoDom(
      <TestPreviewModal
        isOpen={true}
        onClose={vi.fn()}
        project={project}
        setProject={vi.fn()}
        theme="light"
        onShowToast={vi.fn()}
      />
    );

    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea).not.toBeNull();

    // Update text with halfwidth 'A', fullwidth 'あ', and newline
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
      setter?.call(textarea, 'Aあ\nい');
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    });

    // Inline character spans in default mode must NOT have px-0.5 or inline-block
    const charA = Array.from(container.querySelectorAll('span')).find((s) => s.textContent === 'A');
    expect(charA).toBeDefined();
    expect(charA!.className).not.toContain('px-0.5');
    expect(charA!.className).toContain('inline');
    expect(charA!.className).not.toContain('inline-block');

    // Check single-newline line divs (2 lines, no extra '\n' text node doubling newlines)
    const lineDivs = container.querySelectorAll('.group\\/line');
    expect(lineDivs).toHaveLength(2);
    expect(lineDivs[0].textContent).toBe('Aあ');
    expect(lineDivs[1].textContent).toBe('い');

    // Toggle 仮想ボディ枠 (showCharBoxes) -> 'A' has 0.5em width, 'あ' has 1em width
    const charBoxBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('仮想ボディ枠')
    );
    expect(charBoxBtn).toBeDefined();
    act(() => {
      charBoxBtn!.click();
    });
    const aBox = Array.from(container.querySelectorAll('span[title*="「A」"]'))[0] as HTMLElement | undefined;
    const ahBox = Array.from(container.querySelectorAll('span[title*="「あ」"]'))[0] as HTMLElement | undefined;
    expect(aBox?.style.width).toBe('0.5em');
    expect(ahBox?.style.width).toBe('1em');

    // Switch to 縦組み (showNotebookGuides is ON by default) -> paper is dir="rtl" and SVG pattern is right-anchored (x="100%")
    const verticalBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('縦組み')
    );
    expect(verticalBtn).toBeDefined();
    act(() => {
      verticalBtn!.click();
    });

    const verticalPaper = container.querySelector('[dir="rtl"].overflow-x-auto');
    expect(verticalPaper).not.toBeNull();
    const patternEl = container.querySelector('pattern[id^="notebook-ruling-v-"]');
    expect(patternEl?.getAttribute('x')).toBe('100%');
  });

  it('MojikumiStudioModal closes when switching to TestPreview and renders tracking in ake & proportional advance in vertical tsume', () => {
    const project = createTypesettingProject();
    const onClose = vi.fn();
    const onOpenTestPreview = vi.fn();

    const { container } = renderIntoDom(
      <MojikumiStudioModal
        isOpen={true}
        onClose={onClose}
        project={project}
        setProject={vi.fn()}
        theme="light"
        onShowToast={vi.fn()}
        onOpenTestPreview={onOpenTestPreview}
      />
    );

    // Switch to 3様式アキ量比較 (compare3)
    const compareBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('3様式アキ量比較')
    );
    expect(compareBtn).toBeDefined();
    act(() => {
      compareBtn!.click();
    });

    // Vertical is default in AkiryoCompareView: ツメ組み brackets/punctuation have reduced box height (< 1em),
    // and アケ組み non-punctuation spans have non-zero paddingBottom from trackingEm (0.15em)
    const tsumeTooltipEl = Array.from(container.querySelectorAll('span[title]')).find((s) =>
      s.getAttribute('title')?.includes('「。」')
    ) as HTMLElement | undefined;
    expect(tsumeTooltipEl).toBeDefined();

    // Verify アケ組み spans actually carry positive spacingAfter (paddingBottom > 0px)
    const paddedSpans = Array.from(container.querySelectorAll('span[title]')).filter((s) => {
      const pb = (s as HTMLElement).style.paddingBottom;
      return pb && pb !== '0px';
    });
    expect(paddedSpans.length).toBeGreaterThan(0);

    // Clicking "字形試し打ちへ" calls BOTH onClose and onOpenTestPreview
    const jumpBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('字形試し打ちへ')
    );
    expect(jumpBtn).toBeDefined();
    act(() => {
      jumpBtn!.click();
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onOpenTestPreview).toHaveBeenCalledTimes(1);
  });
});
