// @vitest-environment jsdom
import React, { createRef } from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToolsMenuDropdown } from '../header/ToolsMenuDropdown';
import { ModalProvider } from '../../contexts/ModalContext';
import { ExportModal } from '../ExportModal';
import { BatchNormalizeModal } from '../BatchNormalizeModal';
import { BatchOptionsSection } from '../batch/BatchOptionsSection';
import type { FontProject } from '../../types';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

function render(node: React.ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);
  act(() => {
    root.render(node);
  });
  return {
    container,
    cleanup: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

function createSampleProject(): FontProject {
  return {
    id: 'test-proj',
    name: 'TestFont',
    metadata: {
      familyName: 'TestFont',
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
        lsb: 50,
        contours: [
          {
            id: 'c1',
            closed: true,
            nodes: [
              { id: 'p1', x: 200, y: 200, type: 'corner' },
              { id: 'p2', x: 800, y: 200, type: 'corner' },
              { id: 'p3', x: 800, y: 800, type: 'corner' },
              { id: 'p4', x: 200, y: 800, type: 'corner' },
            ],
          },
        ],
      },
      0x6f22: {
        unicode: 0x6f22,
        char: '漢',
        name: 'uni6F22',
        advanceWidth: 1000,
        lsb: 50,
        contours: [
          {
            id: 'c2',
            closed: true,
            nodes: [
              { id: 'p5', x: 150, y: 150, type: 'corner' },
              { id: 'p6', x: 850, y: 150, type: 'corner' },
              { id: 'p7', x: 850, y: 850, type: 'corner' },
              { id: 'p8', x: 150, y: 850, type: 'corner' },
            ],
          },
        ],
      },
    },
    kerning: {},
    createdAt: 1000,
    updatedAt: 1000,
  } as FontProject;
}

describe('ToolsMenuDropdown UI unification (H-1 / H-2 / H-3 / L-01)', () => {
  beforeEach(() => {
    if (typeof window.matchMedia !== 'function') {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
          matches: false,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });
    }
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  function renderMenu() {
    const menuRef = createRef<HTMLDivElement>();
    return render(
      <ModalProvider>
        <ToolsMenuDropdown
          isOpen
          onToggleOpen={vi.fn()}
          onClose={vi.fn()}
          menuRef={menuRef}
          isLight
          theme="light"
          onOpenExportModal={vi.fn()}
          onOpenPixelStudio={vi.fn()}
          onOpenRadicalStudio={vi.fn()}
          onOpenPenPresetsModal={vi.fn()}
          onOpenTraceModal={vi.fn()}
          onOpenSvgModal={vi.fn()}
          onOpenGlyphSynthesisModal={vi.fn()}
          onOpenBatchNormalizeModal={vi.fn()}
          onOpenWeightInterpolationModal={vi.fn()}
          onOpenKerningModal={vi.fn()}
          onOpenQualityModal={vi.fn()}
          onOpenGlyphCompareModal={vi.fn()}
          onOpenOpenTypeFeaturesModal={vi.fn()}
          onOpenMojikumiStudio={vi.fn()}
          onOpenGridFittingModal={vi.fn()}
          onTriggerImportTtf={vi.fn()}
          onTriggerLoadProjectJson={vi.fn()}
          onSaveProjectJson={vi.fn()}
          onOpenFontInfoModal={vi.fn()}
          onOpenStorageManagerModal={vi.fn()}
          onOpenShortcutsModal={vi.fn()}
          onOpenThemeMenu={vi.fn()}
          onStartNewProject={vi.fn()}
        />
      </ModalProvider>
    );
  }

  const TOOL_TITLES = [
    'ピクセルフォント',
    '部首・パーツパレット',
    'カスタムペン',
    '下絵トレース',
    'SVGインポート',
    '濁点・小書き合成',
    'サイズ・太さ統一',
    'ウェイト補間',
    'カーニング調整',
    '品質チェック',
    'グリフ比較',
    '縦書き・合字',
    '文字組み・組版',
    'グリッド整列',
    'JIS規格進捗',
    'IVS 異体字管理',
  ];

  it('shows every tool card title in full without truncation and with equal-height cards', () => {
    const { cleanup } = renderMenu();
    for (const title of TOOL_TITLES) {
      const titleEl = Array.from(document.body.querySelectorAll('div')).find(
        (el) => el.textContent === title
      ) as HTMLElement;
      expect(titleEl, `title ${title}`).not.toBeUndefined();
      expect(titleEl.className).not.toContain('truncate');
      const card = titleEl.closest('button') as HTMLButtonElement;
      expect(card.className).toContain('h-full');
      expect(card.className).not.toContain('truncate');
    }
    cleanup();
  });

  it('wraps card descriptions with jp-wrap and spans SVG import across two columns', () => {
    const { cleanup } = renderMenu();
    for (const desc of [
      '手書きノートや画像からの輪郭抽出',
      '低解像度向けの自動ヒンティング',
      'ベクター画像（SVG）のパス取り込み',
    ]) {
      const descEl = Array.from(document.body.querySelectorAll('div')).find(
        (el) => el.textContent === desc
      ) as HTMLElement;
      expect(descEl.className).toContain('jp-wrap');
    }
    const svgTitle = Array.from(document.body.querySelectorAll('div')).find(
      (el) => el.textContent === 'SVGインポート'
    ) as HTMLElement;
    expect((svgTitle.closest('button') as HTMLButtonElement).className).toContain('sm:col-span-2');
    cleanup();
  });

  it('uses the unified bg-black/75 backdrop, a 40px close button, and a single-column grid below sm', () => {
    const { cleanup } = renderMenu();
    const backdrop = document.body.querySelector('div.fixed.inset-0.z-50') as HTMLElement;
    expect(backdrop.className).toContain('bg-black/75');
    const close = document.body.querySelector('button[title="閉じる"]') as HTMLButtonElement;
    expect(close.className).toContain('min-w-[40px]');
    expect(close.className).toContain('min-h-[40px]');
    const smallTitle = Array.from(document.body.querySelectorAll('span')).find(
      (el) => el.textContent === 'フォント読込 (.ttf/.otf)'
    ) as HTMLElement;
    expect(smallTitle.getAttribute('title')).toBe('フォント読込 (.ttf/.otf)');
    const grid = smallTitle.closest('button')?.parentElement as HTMLElement;
    expect(grid.className).toContain('grid-cols-1');
    expect(grid.className).toContain('sm:grid-cols-2');
    cleanup();
  });
});

describe('ExportModal UI unification (M-01 / M-02 / M-03 / M-06 / M-09 / M-10)', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('uses max-w-3xl, emerald primary button, and ModalSection headings', () => {
    const project = createSampleProject();
    const { container, cleanup } = render(
      <ExportModal isOpen onClose={vi.fn()} project={project} theme="light" />
    );
    const dialog = container.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog.className).toContain('sm:max-w-3xl');
    expect(dialog.className).not.toContain('lg:max-w-5xl');
    const headings = Array.from(container.querySelectorAll('h3')).map((h) => h.textContent);
    expect(headings.some((t) => t?.includes('ファイル形式'))).toBe(true);
    expect(headings.some((t) => t?.includes('ライブプレビュー'))).toBe(true);
    for (const h of container.querySelectorAll('h3')) {
      expect((h as HTMLElement).className).toContain('text-xs');
      expect((h as HTMLElement).className).toContain('font-bold');
    }
    const primary = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('.OTF をダウンロード')
    ) as HTMLButtonElement;
    expect(primary.className).toContain('bg-emerald-600');
    expect(primary.className).not.toContain('bg-amber-400');
    expect(primary.className).toContain('min-h-[44px]');
    const cancel = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === '閉じる'
    ) as HTMLButtonElement;
    expect(cancel).not.toBeUndefined();
    // SliderRow value badge (min-w-[64px]) and emerald slider for preview size
    const slider = container.querySelector('input[type="range"]') as HTMLInputElement;
    expect(slider.className).toContain('accent-emerald-600');
    const badge = container.querySelector('span.min-w-\\[64px\\]') as HTMLElement;
    expect(badge).not.toBeNull();
    cleanup();
  });
});

describe('BatchNormalizeModal UI unification (M-04 / M-05 / M-06 / M-10)', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders each step number once via ModalSection and a tracking-free preview heading', () => {
    const project = createSampleProject();
    const { container, cleanup } = render(
      <BatchNormalizeModal
        isOpen
        onClose={vi.fn()}
        project={project}
        setProject={vi.fn()}
        selectedUnicode={0x3042}
        theme="dark"
        onShowToast={vi.fn()}
      />
    );
    const dialog = container.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog.className).toContain('sm:max-w-5xl');
    expect(dialog.className).not.toContain('xl:max-w-6xl');
    const headingText = Array.from(container.querySelectorAll('h3'))
      .map((h) => h.textContent)
      .join('\n');
    for (const step of ['①', '②', '③', '④', '⑤']) {
      expect(headingText.match(new RegExp(step, 'g'))?.length).toBe(1);
    }
    const previewHeading = Array.from(container.querySelectorAll('h3')).find((h) =>
      h.textContent?.includes('プレビュー確認')
    ) as HTMLElement;
    expect(previewHeading.className).not.toContain('tracking-tight');
    const primary = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('対象 2 文字に一括適用')
    ) as HTMLButtonElement;
    expect(primary).not.toBeUndefined();
    expect(primary.className).toContain('bg-emerald-600');
    cleanup();
  });
});

describe('BatchOptionsSection sliders (M-08)', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('uses SliderRow with a min-w-[64px] badge and accent-emerald-600 sliders', () => {
    const { container, cleanup } = render(
      <BatchOptionsSection
        isLight
        scope="all"
        setScope={vi.fn()}
        targetGlyphsCount={2}
        previewChar="あ"
        sizePreset="standard"
        setSizePreset={vi.fn()}
        handlePresetChange={vi.fn()}
        targetWidth={820}
        setTargetWidth={vi.fn()}
        targetHeight={820}
        setTargetHeight={vi.fn()}
        weightDelta={0}
        setWeightDelta={vi.fn()}
        alignH="center"
        setAlignH={vi.fn()}
        alignV="center"
        setAlignV={vi.fn()}
        unifyAdvance
        setUnifyAdvance={vi.fn()}
        advanceWidth={1000}
        setAdvanceWidth={vi.fn()}
        optimizePoints
        setOptimizePoints={vi.fn()}
        normalizeWinding
        setNormalizeWinding={vi.fn()}
      />
    );
    const sliders = container.querySelectorAll('input[type="range"]');
    expect(sliders.length).toBe(3);
    for (const slider of sliders) {
      expect((slider as HTMLInputElement).className).toContain('accent-emerald-600');
    }
    const badges = container.querySelectorAll('span.min-w-\\[64px\\]');
    expect(badges.length).toBe(3);
    expect(container.textContent).toContain('820px');
    expect(container.textContent).toContain('±0px (維持)');
    cleanup();
  });
});
