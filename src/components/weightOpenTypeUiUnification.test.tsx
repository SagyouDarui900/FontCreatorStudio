// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { WeightInterpolationModal } from './WeightInterpolationModal';
import { OpenTypeFeaturesModal } from './OpenTypeFeaturesModal';
import { LigaturesPanel } from './openTypeFeatures/LigaturesPanel';
import { PaltMetricsPanel } from './openTypeFeatures/PaltMetricsPanel';
import { VertFeaturesPanel } from './openTypeFeatures/VertFeaturesPanel';
import { getThemeClasses } from '../utils/theme';
import type { FontProject, GlyphData } from '../types';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

function makeGlyph(unicode: number, char: string, withContours: boolean): GlyphData {
  return {
    unicode,
    char,
    name: `uni${unicode.toString(16).toUpperCase()}`,
    advanceWidth: 1000,
    lsb: 200,
    contours: withContours
      ? [
          {
            id: `c-${char}`,
            closed: true,
            nodes: [
              { id: 'n1', x: 200, y: 200, handleIn: null, handleOut: null, type: 'corner' },
              { id: 'n2', x: 800, y: 200, handleIn: null, handleOut: null, type: 'corner' },
              { id: 'n3', x: 800, y: 800, handleIn: null, handleOut: null, type: 'corner' },
              { id: 'n4', x: 200, y: 800, handleIn: null, handleOut: null, type: 'corner' },
            ],
          },
        ]
      : [],
  };
}

function makeProject(glyphs: Record<number, GlyphData>): FontProject {
  return {
    id: 'proj-ui-unification-test',
    name: 'UiTest',
    metadata: {
      familyName: 'UiTest',
      styleName: 'Regular',
      usWeightClass: 400,
      designer: 'Tester',
      copyright: 'Copyright 2026',
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
    kerning: {},
    createdAt: 1000,
    updatedAt: 1000,
  };
}

function renderModal(element: React.ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);
  act(() => {
    root.render(element);
  });
  return {
    container,
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

function renderWeight(project: FontProject) {
  return renderModal(
    <WeightInterpolationModal
      isOpen={true}
      onClose={vi.fn()}
      project={project}
      setProject={vi.fn()}
      selectedUnicode={0x3042}
      theme="dark"
      onShowToast={vi.fn()}
      onCommitHistory={vi.fn()}
    />
  );
}

function renderOpenType(project: FontProject) {
  return renderModal(
    <OpenTypeFeaturesModal
      isOpen={true}
      onClose={vi.fn()}
      project={project}
      setProject={vi.fn()}
      isLight={false}
      theme="dark"
      onShowToast={vi.fn()}
    />
  );
}

describe('UI unification: WeightInterpolationModal', () => {
  it('shows an empty-preview explanation when the preview glyph has no contours (H-4)', () => {
    const project = makeProject({ 0x3042: makeGlyph(0x3042, 'あ', false) });
    const { container, unmount } = renderWeight(project);
    expect(container.textContent).toContain('プレビューできる輪郭がありません');
    expect(container.textContent).toContain('まだ作成されていません');
    unmount();
  });

  it('shows an empty-preview explanation when the project has no glyphs at all (H-4)', () => {
    const { container, unmount } = renderWeight(makeProject({}));
    expect(container.textContent).toContain('プレビューできる輪郭がありません');
    expect(container.textContent).toContain('プレビュー対象の文字がありません');
    unmount();
  });

  it('does not show the empty-preview explanation for a glyph with contours', () => {
    const project = makeProject({ 0x3042: makeGlyph(0x3042, 'あ', true) });
    const { container, unmount } = renderWeight(project);
    expect(container.textContent).not.toContain('プレビューできる輪郭がありません');
    unmount();
  });

  it('uses ModalTabs with count badges and a 6xl shell (M-06, M-12)', () => {
    const project = makeProject({
      0x3042: makeGlyph(0x3042, 'あ', true),
      0x3044: makeGlyph(0x3044, 'い', true),
    });
    const { container, unmount } = renderWeight(project);
    const dialog = container.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog.className).toContain('sm:max-w-6xl');
    expect(container.querySelector('button[title="全画面表示に拡大 (F)"]')).not.toBeNull();

    const tabs = container.querySelectorAll('[role="tab"]');
    expect(tabs).toHaveLength(2);
    // Family tab: 2 target glyphs; master tab: 2 non-empty glyphs.
    const badges = Array.from(tabs).map(
      (tab) => tab.querySelector('span.rounded-full')?.textContent
    );
    expect(badges).toEqual(['2', '2']);
    unmount();
  });

  it('uses a 3-column preset grid on tablet widths and 4 columns on desktop', () => {
    const project = makeProject({ 0x3042: makeGlyph(0x3042, 'あ', true) });
    const { container, unmount } = renderWeight(project);
    const regularBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Regular (標準)')
    ) as HTMLElement;
    expect(regularBtn).toBeDefined();
    const grid = regularBtn.closest('.grid') as HTMLElement;
    expect(grid.className).toContain('sm:grid-cols-3');
    expect(grid.className).toContain('lg:grid-cols-4');
    unmount();
  });

  it('notes that the sample preview uses a fixed 36px width (L-05)', () => {
    const project = makeProject({ 0x3042: makeGlyph(0x3042, 'あ', true) });
    const { container, unmount } = renderWeight(project);
    expect(container.textContent).toContain('幅 36px で並べているため、表示上の間隔は実際の送り幅と異なります');
    unmount();
  });

  it('renders the master compatibility status and switches to the master tab', () => {
    const project = makeProject({
      0x3042: makeGlyph(0x3042, 'あ', true),
      0x3044: makeGlyph(0x3044, 'い', true),
    });
    const { container, unmount } = renderWeight(project);
    const masterTabBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('2マスター')
    );
    expect(masterTabBtn).toBeDefined();
    act(() => {
      masterTabBtn!.click();
    });
    expect(container.textContent).toContain('トポロジー一致');
    expect(container.textContent).toContain('補間結果を「あ」に適用');
    unmount();
  });
});

describe('UI unification: OpenTypeFeaturesModal', () => {
  it('uses ModalTabs with counts and a LIVE badge, a 6xl shell and a fullscreen toggle (M-06, M-11, M-12)', () => {
    const project = makeProject({ 0x3042: makeGlyph(0x3042, 'あ', true) });
    const { container, unmount } = renderOpenType(project);
    const dialog = container.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog.className).toContain('sm:max-w-6xl');
    expect(container.querySelector('button[title="全画面表示に拡大 (F)"]')).not.toBeNull();

    const tabs = container.querySelectorAll('[role="tab"]');
    expect(tabs).toHaveLength(5);
    expect(container.textContent).toContain('LIVE');
    unmount();
  });

  it('has a cancel button on the left and the primary close button on the right (M-10)', () => {
    const project = makeProject({ 0x3042: makeGlyph(0x3042, 'あ', true) });
    const { container, unmount } = renderOpenType(project);
    const buttons = Array.from(container.querySelectorAll('button'));
    const cancel = buttons.find((b) => b.textContent === 'キャンセル');
    const primary = buttons.find((b) => b.textContent === '完了・閉じる');
    expect(cancel).toBeDefined();
    expect(primary).toBeDefined();
    expect(buttons.indexOf(cancel!)).toBeLessThan(buttons.indexOf(primary!));
    unmount();
  });
});

describe('UI unification: OpenType rule-card grids (M-14)', () => {
  const themeClasses = getThemeClasses('light');

  it('LigaturesPanel uses the unified grid pattern', () => {
    const { container, unmount } = renderModal(
      <LigaturesPanel
        ligatures={[]}
        existingUnicodes={new Set([0x3042])}
        themeClasses={themeClasses}
        newLigName=""
        newLigType="liga"
        newLigInputs=""
        newLigTargetUnicode=""
        onChangeNewLigName={vi.fn()}
        onChangeNewLigType={vi.fn()}
        onChangeNewLigInputs={vi.fn()}
        onChangeNewLigTargetUnicode={vi.fn()}
        onAddCustomLigature={vi.fn()}
        onToggleLigature={vi.fn()}
        onRemoveLigature={vi.fn()}
      />
    );
    const grids = Array.from(container.querySelectorAll('.grid'));
    // Add form: 1 column until lg, then 4.
    expect(grids[0].className).toContain('lg:grid-cols-4');
    expect(grids[0].className).not.toContain('sm:grid-cols-2');
    // Registered list: the unified 1/2/3/4 pattern.
    expect(grids[1].className).toContain('grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4');
    unmount();
  });

  it('PaltMetricsPanel uses the unified grid pattern and a SliderRow', () => {
    const { container, unmount } = renderModal(
      <PaltMetricsPanel
        paltConfig={{
          enabled: true,
          autoDerivePalt: false,
          autoDeriveVpal: false,
          opticalSideBearingPercent: 5,
          paltList: [
            {
              unicode: 0x3042,
              char: 'あ',
              originalAdvance: 1000,
              proportionalAdvance: 900,
              xPlacement: 0,
              deltaAdvance: -100,
              opticalMarginLeft: 10,
              opticalMarginRight: 10,
              enabled: true,
            },
          ],
          vpalList: [],
        }}
        opticalSideBearingPercent={5}
        themeClasses={themeClasses}
        onChangeOpticalSideBearingPercent={vi.fn()}
        onAutoDerivePalt={vi.fn()}
        onTogglePaltGlobal={vi.fn()}
        onTogglePaltItem={vi.fn()}
        onToggleVpalItem={vi.fn()}
      />
    );
    const grids = Array.from(container.querySelectorAll('.grid'));
    const metricGrid = grids.find((g) => g.className.includes('xl:grid-cols-4')) as HTMLElement;
    expect(metricGrid).toBeDefined();
    expect(metricGrid.className).toContain('grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4');
    const slider = container.querySelector('input[type="range"]') as HTMLInputElement;
    expect(slider.className).toContain('accent-emerald-600');
    expect(container.innerHTML).toContain('min-w-[64px]');
    expect(container.textContent).toContain('5%');
    unmount();
  });

  it('VertFeaturesPanel uses the unified grid pattern and a 64px value badge', () => {
    const { container, unmount } = renderModal(
      <VertFeaturesPanel
        verticalWriting={{
          enabled: true,
          defaultVertAdvance: 1000,
          vertOriginY: 880,
          substitutions: [],
        }}
        existingUnicodes={new Set([0x3042])}
        themeClasses={themeClasses}
        onAutoDetectVerticalGlyphs={vi.fn()}
        onToggleVerticalWriting={vi.fn()}
        onCommitHistory={vi.fn()}
        onUpdateVerticalMetricField={vi.fn()}
        onToggleVertSub={vi.fn()}
      />
    );
    const grids = Array.from(container.querySelectorAll('.grid'));
    const ruleGrid = grids.find((g) => g.className.includes('xl:grid-cols-4')) as HTMLElement;
    expect(ruleGrid).toBeDefined();
    expect(ruleGrid.className).toContain('grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4');
    const metricsGrid = grids.find((g) => g.className.includes('lg:grid-cols-2')) as HTMLElement;
    expect(metricsGrid).toBeDefined();
    expect(metricsGrid.className).not.toContain('sm:grid-cols-2');
    expect(container.textContent).toContain('1000 units');
    expect(container.innerHTML).toContain('min-w-[64px]');
    unmount();
  });
});
