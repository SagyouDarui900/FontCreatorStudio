// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { KerningModal } from './KerningModal';
import { OpenTypeFeaturesModal } from './OpenTypeFeaturesModal';
import { FontProject, GlyphData, PathContour } from '../types';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

function rectContour(id: string, minX: number, minY: number, maxX: number, maxY: number): PathContour {
  return {
    id,
    closed: true,
    nodes: [
      { id: `${id}-1`, x: minX, y: minY, handleIn: null, handleOut: null, type: 'corner' },
      { id: `${id}-2`, x: maxX, y: minY, handleIn: null, handleOut: null, type: 'corner' },
      { id: `${id}-3`, x: maxX, y: maxY, handleIn: null, handleOut: null, type: 'corner' },
      { id: `${id}-4`, x: minX, y: maxY, handleIn: null, handleOut: null, type: 'corner' },
    ],
  };
}

function makeGlyph(
  unicode: number,
  char: string,
  contours: PathContour[],
  advanceWidth = 1000,
  lsb = 100,
  locked = false
): GlyphData {
  return {
    unicode,
    char,
    name: `uni${unicode.toString(16).toUpperCase()}`,
    advanceWidth,
    lsb,
    locked,
    contours,
  };
}

function makeProject(overrides: Partial<FontProject> = {}): FontProject {
  return {
    id: 'proj-kern-test',
    name: 'KernTest',
    metadata: {
      familyName: 'KernTest',
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
    glyphs: {
      0x41: makeGlyph(0x41, 'A', [rectContour('c-a', 100, 100, 500, 800)], 600, 100),
      0x56: makeGlyph(0x56, 'V', [rectContour('c-v', 100, 100, 500, 800)], 600, 100),
      0x2c: makeGlyph(0x2c, ',', [rectContour('c-comma', 150, 650, 260, 820)], 400, 150),
      0x3042: makeGlyph(0x3042, 'あ', [rectContour('c-aa', 200, 200, 800, 800)], 1000, 200),
    },
    kerning: {},
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}

function renderWithRoot(element: React.ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(element);
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

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  setter.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('KerningModal & OpenType Kerning Audit Fixes', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows warning and disables slider when selected pair glyphs are missing', () => {
    // Project has no glyphs matching presets ('「,「' fallback has no '「')
    const proj = makeProject({
      glyphs: {
        0x3042: makeGlyph(0x3042, 'あ', [rectContour('c-aa', 200, 200, 800, 800)]),
      },
    });
    const { container, unmount } = renderWithRoot(
      <KerningModal
        isOpen={true}
        onClose={vi.fn()}
        project={proj}
        setProject={vi.fn()}
        showToast={vi.fn()}
        theme="dark"
      />
    );

    expect(container.textContent).toContain('作図されていない文字が含まれています');
    const slider = container.querySelector('input[type="range"]') as HTMLInputElement;
    expect(slider).not.toBeNull();
    expect(slider.disabled).toBe(true);
    unmount();
  });

  it('commits project history ONCE per drag session across multiple slider updates', () => {
    let proj = makeProject({ kerning: { 'A,V': -50 } });
    const setProject = vi.fn((updater) => {
      proj = typeof updater === 'function' ? updater(proj) : updater;
    });
    const commitProjectHistory = vi.fn();

    const { container, unmount } = renderWithRoot(
      <KerningModal
        isOpen={true}
        onClose={vi.fn()}
        project={proj}
        setProject={setProject}
        showToast={vi.fn()}
        theme="dark"
        commitProjectHistory={commitProjectHistory}
      />
    );

    const slider = container.querySelector('input[type="range"]') as HTMLInputElement;
    expect(slider.disabled).toBe(false);

    // Drag start -> multiple changes -> pointerup
    act(() => {
      slider.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    });
    act(() => {
      setInputValue(slider, '-75');
      setInputValue(slider, '-90');
      setInputValue(slider, '-110');
    });

    expect(commitProjectHistory).toHaveBeenCalledTimes(1);
    expect(proj.kerning?.['A,V']).toBe(-110);

    // End drag session and start a second drag -> commits a second history entry
    act(() => {
      window.dispatchEvent(new Event('pointerup'));
    });
    act(() => {
      slider.dispatchEvent(new Event('pointerdown', { bubbles: true }));
      setInputValue(slider, '-130');
    });
    expect(commitProjectHistory).toHaveBeenCalledTimes(2);
    expect(proj.kerning?.['A,V']).toBe(-130);

    unmount();
  });

  it('adds comma character pair as U+002C,U+0041, displays cleanly, and syncs customKerningPairs', () => {
    let proj = makeProject({
      openTypeFeatures: {
        enabled: true,
        verticalWriting: { enabled: false, defaultVertAdvance: 1000, vertOriginY: 880, substitutions: [] },
        ligatures: [],
        customKerningPairs: [
          {
            id: 'ck-1',
            firstUnicode: 0x2c,
            secondUnicode: 0x41,
            amount: -40,
            enabled: true,
          },
        ],
        palt: {
          enabled: false,
          autoDerivePalt: false,
          autoDeriveVpal: false,
          opticalSideBearingPercent: 5,
          paltList: [],
          vpalList: [],
        },
      },
    });
    const setProject = vi.fn((updater) => {
      proj = typeof updater === 'function' ? updater(proj) : updater;
    });

    const { container, rerender, unmount } = renderWithRoot(
      <KerningModal
        isOpen={true}
        onClose={vi.fn()}
        project={proj}
        setProject={setProject}
        showToast={vi.fn()}
        theme="dark"
        commitProjectHistory={vi.fn()}
      />
    );

    const leftInput = container.querySelector('input[placeholder="左 (A)"]') as HTMLInputElement;
    const rightInput = container.querySelector('input[placeholder="右 (V)"]') as HTMLInputElement;
    const valInput = container.querySelector('input[placeholder="-100"]') as HTMLInputElement;
    act(() => {
      setInputValue(leftInput, ',');
      setInputValue(rightInput, 'A');
      setInputValue(valInput, '-85');
    });

    const addBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === '追加'
    )!;
    act(() => {
      addBtn.click();
    });

    expect(proj.kerning?.['U+002C,U+0041']).toBe(-85);
    expect(proj.openTypeFeatures!.customKerningPairs[0].amount).toBe(-85);

    // Rerender with updated project and confirm pair list shows ", A" and remove disables customKerningPairs override
    rerender(
      <KerningModal
        isOpen={true}
        onClose={vi.fn()}
        project={proj}
        setProject={setProject}
        showToast={vi.fn()}
        theme="dark"
        commitProjectHistory={vi.fn()}
      />
    );
    expect(container.textContent).toContain(', A');

    const delBtn = container.querySelector('button[aria-label=", A を削除"]') as HTMLButtonElement;
    expect(delBtn).not.toBeNull();
    act(() => {
      delBtn.click();
    });
    expect(proj.kerning?.['U+002C,U+0041']).toBeUndefined();
    expect(proj.openTypeFeatures!.customKerningPairs[0].enabled).toBe(false);

    unmount();
  });

  it('AutoKern preserves existing manual pairs unless overwrite is checked', () => {
    // Use wide horizontal separation on A+V so AutoKern computes a large negative value != -25
    let proj = makeProject({
      glyphs: {
        0x41: makeGlyph(0x41, 'A', [rectContour('a', 100, 100, 300, 800)], 600, 100),
        0x56: makeGlyph(0x56, 'V', [rectContour('v', 300, 100, 500, 800)], 600, 300),
      },
      kerning: { 'A,V': -25 },
    });
    const setProject = vi.fn((updater) => {
      proj = typeof updater === 'function' ? updater(proj) : updater;
    });
    const showToast = vi.fn();

    const { container, rerender, unmount } = renderWithRoot(
      <KerningModal
        isOpen={true}
        onClose={vi.fn()}
        project={proj}
        setProject={setProject}
        showToast={showToast}
        theme="dark"
        commitProjectHistory={vi.fn()}
      />
    );

    const autoBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('自動カーニング')
    )!;
    act(() => {
      autoBtn.click();
    });

    // With overwrite unchecked (default), -25 is preserved while unregistered 'V,A' gets computed
    expect(proj.kerning?.['A,V']).toBe(-25);
    expect(proj.kerning?.['V,A']).toBeDefined();
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('調整済み 1件は保持'), 'success');

    // Check overwrite checkbox -> now AutoKern overwrites 'A,V'
    const overwriteCheckbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(overwriteCheckbox.checked).toBe(false);
    act(() => {
      overwriteCheckbox.click();
    });
    rerender(
      <KerningModal
        isOpen={true}
        onClose={vi.fn()}
        project={proj}
        setProject={setProject}
        showToast={showToast}
        theme="dark"
        commitProjectHistory={vi.fn()}
      />
    );
    const autoBtn2 = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('自動カーニング')
    )!;
    act(() => {
      autoBtn2.click();
    });
    expect(proj.kerning?.['A,V']).not.toBe(-25);

    unmount();
  });

  it('Sidebearings tab exposes all 6 modes, skips locked glyphs, and commits batch history once', () => {
    let proj = makeProject({
      glyphs: {
        0x3042: makeGlyph(0x3042, 'あ', [rectContour('a', 100, 200, 700, 800)], 1000, 100, false),
        0x3044: makeGlyph(0x3044, 'い', [rectContour('i', 100, 200, 700, 800)], 1000, 100, true),
      },
    });
    const setProject = vi.fn((updater) => {
      proj = typeof updater === 'function' ? updater(proj) : updater;
    });
    const commitBatchHistory = vi.fn();
    const showToast = vi.fn();

    const { container, unmount } = renderWithRoot(
      <KerningModal
        isOpen={true}
        onClose={vi.fn()}
        project={proj}
        setProject={setProject}
        showToast={showToast}
        theme="dark"
        commitBatchHistory={commitBatchHistory}
      />
    );

    const sbTab = Array.from(container.querySelectorAll('[role="tab"]')).find((b) =>
      b.textContent?.includes('サイドベアリング')
    ) as HTMLButtonElement;
    act(() => {
      sbTab.click();
    });

    // All 6 modes are exposed
    expect(container.textContent).toContain('⑤ 右余白(RSB)の加減算');
    expect(container.textContent).toContain('⑥ スマート自動スペーシング');

    const execBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('選択カテゴリのサイドベアリングを一括調整')
    )!;
    act(() => {
      execBtn.click();
    });

    expect(commitBatchHistory).toHaveBeenCalledTimes(1);
    expect(commitBatchHistory).toHaveBeenCalledWith([0x3042]);
    expect(proj.glyphs[0x3042].lsb).toBe(200);
    expect(proj.glyphs[0x3044].lsb).toBe(100);
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('ロック保護 1件除外'), 'success');

    unmount();
  });

  it('OpenTypeFeaturesModal GPOS tab badge combines project.kerning and customKerningPairs without duplicates', () => {
    const proj = makeProject({
      kerning: { 'A,V': -90 },
      openTypeFeatures: {
        enabled: true,
        verticalWriting: { enabled: false, defaultVertAdvance: 1000, vertOriginY: 880, substitutions: [] },
        ligatures: [],
        customKerningPairs: [
          // Duplicate of A,V -> should not double-count
          { id: 'c1', firstUnicode: 0x41, secondUnicode: 0x56, amount: -80, enabled: true },
          // Distinct enabled pair -> +1 (total 2)
          { id: 'c2', firstUnicode: 0x2c, secondUnicode: 0x41, amount: -50, enabled: true },
          // Disabled pair -> ignored
          { id: 'c3', firstUnicode: 0x56, secondUnicode: 0x41, amount: -50, enabled: false },
        ],
        palt: {
          enabled: false,
          autoDerivePalt: false,
          autoDeriveVpal: false,
          opticalSideBearingPercent: 5,
          paltList: [],
          vpalList: [],
        },
      },
    });

    const { container, unmount } = renderWithRoot(
      <OpenTypeFeaturesModal
        isOpen={true}
        onClose={vi.fn()}
        project={proj}
        setProject={vi.fn()}
        isLight={false}
        theme="dark"
        onShowToast={vi.fn()}
      />
    );

    const gposTab = Array.from(container.querySelectorAll('[role="tab"]')).find((t) =>
      t.textContent?.includes('カーニング')
    );
    expect(gposTab).toBeDefined();
    expect(gposTab!.querySelector('span.rounded-full')?.textContent).toBe('2');

    act(() => {
      (gposTab as HTMLElement).click();
    });
    expect(container.textContent).toContain('2 件 のアクティブなカーニングペア');

    unmount();
  });
});
