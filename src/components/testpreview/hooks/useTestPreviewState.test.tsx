// @vitest-environment jsdom
import React, { act, useState } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FontProject, GlyphData } from '../../../types';
import {
  buildPreviewProject,
  clampAdjustOffset,
  clampAdjustScale,
  collectPreviewGlyphUnicodes,
  extractPreviewUnicodes,
  isEquivalentPreviewProject,
  resolvePreviewAdvanceWidth,
  useTestPreviewState,
} from './useTestPreviewState';
import { CharAdjustPanel } from '../CharAdjustPanel';
import { PreviewCanvas } from '../PreviewCanvas';
import {
  createDefaultTestPreviewPersistedState,
  TestPreviewPersistedState,
} from '../persistedState';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const mockCompileFont = vi.hoisted(() =>
  vi.fn(() => ({
    blobUrl: 'blob:mock-preview-font',
    font: {},
    buffer: new ArrayBuffer(0),
  }))
);

// The hook compiles through '../../../utils/font'; mock only compileFont so
// validation / pixel stripping in the hook still run for real. The
// equivalence test below imports the real compileFont from compilerCore
// directly, so it is unaffected by this mock.
vi.mock('../../../utils/font', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../utils/font')>();
  return { ...actual, compileFont: mockCompileFont };
});

// Count real pixelGridToContours calls for the M13 cache test.
const pixelGridToContoursSpy = vi.hoisted(() => vi.fn());

vi.mock('../../../utils/pixelFontUtils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../utils/pixelFontUtils')>();
  pixelGridToContoursSpy.mockImplementation((...args: unknown[]) =>
    (actual.pixelGridToContours as (...a: never[]) => unknown)(...(args as never[]))
  );
  return { ...actual, pixelGridToContours: pixelGridToContoursSpy };
});

function makeGlyph(unicode: number, char: string, x = 100): GlyphData {
  return {
    unicode,
    char,
    name: `uni${unicode.toString(16).toUpperCase()}`,
    advanceWidth: 1000,
    lsb: 100,
    contours: [
      {
        id: `c${unicode}`,
        closed: true,
        nodes: [
          { id: 'n1', x, y: 200, type: 'corner' },
          { id: 'n2', x: 600, y: 200, type: 'corner' },
          { id: 'n3', x: 600, y: 800, type: 'corner' },
          { id: 'n4', x: 100, y: 800, type: 'corner' },
        ],
      },
    ],
  };
}

function makeProject(extraGlyphs: GlyphData[] = []): FontProject {
  const glyphs: Record<number, GlyphData> = {
    0x3042: makeGlyph(0x3042, 'あ'),
    0x3044: makeGlyph(0x3044, 'い'),
    0x3046: makeGlyph(0x3046, 'う'),
  };
  for (const g of extraGlyphs) glyphs[g.unicode] = g;
  return {
    id: 'preview-test',
    name: 'PreviewTest',
    metadata: {
      familyName: 'PreviewTest',
      styleName: 'Regular',
      designer: '',
      copyright: '',
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
    createdAt: 1,
    updatedAt: 1,
  } as unknown as FontProject;
}

describe('extractPreviewUnicodes', () => {
  it('collects code points and counts a surrogate pair as one', () => {
    expect([...extractPreviewUnicodes('Aあ𐮷')].sort((a, b) => a - b)).toEqual([
      0x41, 0x3042, 0x10bb7,
    ]);
    expect(extractPreviewUnicodes('').size).toBe(0);
  });
});

describe('collectPreviewGlyphUnicodes', () => {
  it('adds both sides of a vertical derivation when either side is in the text', () => {
    const project = makeProject();
    // 長音符 ー (source) -> vertical form ︱ (target)
    expect(collectPreviewGlyphUnicodes('ー', project).has(0xfe31)).toBe(true);
    expect(collectPreviewGlyphUnicodes('︱', project).has(0x30fc)).toBe(true);
    expect(collectPreviewGlyphUnicodes('あ', project).has(0xfe31)).toBe(false);
  });

  it('adds the vertical substitute of a configured substitution, but not when disabled', () => {
    const project = makeProject();
    project.openTypeFeatures = {
      enabled: true,
      verticalWriting: {
        enabled: true,
        defaultVertAdvance: 1000,
        vertOriginY: 800,
        substitutions: [
          { id: 'v1', sourceUnicode: 0x3042, vertUnicode: 0x3044, enabled: true },
        ],
      },
      ligatures: [],
      customKerningPairs: [],
    } as unknown as FontProject['openTypeFeatures'];
    expect(collectPreviewGlyphUnicodes('あ', project).has(0x3044)).toBe(true);

    project.openTypeFeatures!.verticalWriting.substitutions[0].enabled = false;
    expect(collectPreviewGlyphUnicodes('あ', project).has(0x3044)).toBe(false);
  });

  it('adds a ligature substitute only when every input char is in the text', () => {
    const project = makeProject();
    project.openTypeFeatures = {
      enabled: true,
      verticalWriting: { enabled: true, defaultVertAdvance: 1000, vertOriginY: 800, substitutions: [] },
      ligatures: [
        { id: 'l1', type: 'liga', name: 'fi', inputChars: ['f', 'i'], substituteUnicode: 0xfb01, enabled: true },
        { id: 'l2', type: 'liga', name: 'fl', inputChars: ['f', 'l'], substituteUnicode: 0xfb02, enabled: false },
      ],
      customKerningPairs: [],
    } as unknown as FontProject['openTypeFeatures'];
    expect(collectPreviewGlyphUnicodes('fi', project).has(0xfb01)).toBe(true);
    expect(collectPreviewGlyphUnicodes('f', project).has(0xfb01)).toBe(false);
    expect(collectPreviewGlyphUnicodes('fl', project).has(0xfb02)).toBe(false);
  });

  it('does not add glyphs for kerning pairs', () => {
    const project = makeProject();
    project.kerning = { 'あ,い': -50 };
    const needed = collectPreviewGlyphUnicodes('あ', project);
    expect(needed.has(0x3044)).toBe(false);
  });
});

describe('buildPreviewProject', () => {
  it('keeps only the glyphs in the preview text and preserves metadata by reference', () => {
    const project = makeProject();
    const preview = buildPreviewProject(project, 'あ');
    expect(Object.keys(preview.glyphs).map(Number)).toEqual([0x3042]);
    expect(preview.glyphs[0x3042]).toBe(project.glyphs[0x3042]);
    expect(preview.metadata).toBe(project.metadata);
    expect(preview.pixelFontSettings).toBe(project.pixelFontSettings);
  });

  it('returns an empty glyph set for empty text', () => {
    const preview = buildPreviewProject(makeProject(), '');
    expect(Object.keys(preview.glyphs)).toEqual([]);
  });

  it('falls back to the whole project when the preview needs almost all glyphs', () => {
    const project = makeProject([
      makeGlyph(0x3048, 'え'),
      makeGlyph(0x304a, 'お'),
    ]);
    // 4 of 5 glyphs = 80% -> full compile, no saving.
    expect(buildPreviewProject(project, 'あいうえ')).toBe(project);
    // 3 of 5 glyphs = 60% -> subset.
    const subset = buildPreviewProject(project, 'あいう');
    expect(subset).not.toBe(project);
    expect(Object.keys(subset.glyphs).map(Number).sort((a, b) => a - b)).toEqual([
      0x3042, 0x3044, 0x3046,
    ]);
  });

  it('keeps only kerning pairs whose sides are both in the preview text', () => {
    const project = makeProject();
    project.kerning = {
      'あ,い': -50,
      'あ,う': -30,
      'い,う': -10,
      'U+3042,U+3044': -20,
      '???': -5, // unparseable key: kept as-is, compileFont skips it
    };
    const preview = buildPreviewProject(project, 'あい');
    expect(preview.kerning).toEqual({ 'あ,い': -50, 'U+3042,U+3044': -20, '???': -5 });
  });

  it('filters custom kerning pairs, ligatures and vertical substitutions to the preview text', () => {
    // Extra glyphs え/お keep the needed set (あ/い/う) below the 80%
    // full-compile fallback threshold.
    const project = makeProject([makeGlyph(0x3048, 'え'), makeGlyph(0x304a, 'お')]);
    project.openTypeFeatures = {
      enabled: true,
      verticalWriting: {
        enabled: true,
        defaultVertAdvance: 1000,
        vertOriginY: 800,
        substitutions: [
          { id: 'v1', sourceUnicode: 0x3042, vertUnicode: 0x3044, enabled: true },
          { id: 'v2', sourceUnicode: 0x3048, vertUnicode: 0x304a, enabled: true },
          { id: 'v3', sourceUnicode: 0x3046, vertUnicode: 0x3048, enabled: false },
        ],
      },
      ligatures: [
        { id: 'l1', type: 'liga', name: 'ai', inputChars: ['あ', 'い'], substituteUnicode: 0x3046, enabled: true },
        { id: 'l2', type: 'liga', name: 'ae', inputChars: ['あ', 'え'], substituteUnicode: 0x3048, enabled: true },
      ],
      customKerningPairs: [
        { id: 'k1', firstUnicode: 0x3042, secondUnicode: 0x3044, amount: -50, enabled: true },
        { id: 'k2', firstUnicode: 0x3042, secondUnicode: 0x3048, amount: -30, enabled: true },
        { id: 'k3', firstUnicode: 0x3042, secondUnicode: 0x3046, amount: -10, enabled: false },
      ],
    } as unknown as FontProject['openTypeFeatures'];
    const preview = buildPreviewProject(project, 'あい');
    const features = preview.openTypeFeatures!;
    expect(features.customKerningPairs.map((p) => p.id)).toEqual(['k1', 'k3']);
    expect(features.ligatures.map((l) => l.id)).toEqual(['l1']);
    expect(features.verticalWriting.substitutions.map((s) => s.id)).toEqual(['v1', 'v3']);
    // The ligature substitute う is pulled in, so it is compiled too.
    expect(Object.keys(preview.glyphs).map(Number).sort((a, b) => a - b)).toEqual([
      0x3042, 0x3044, 0x3046,
    ]);
  });
});

describe('isEquivalentPreviewProject', () => {
  it('ignores edits to glyphs outside the preview and timestamps, but not preview glyphs or metadata', () => {
    const p1 = makeProject();
    const prev = buildPreviewProject(p1, 'あ');
    // Only glyph い (outside the preview) changed.
    const p2: FontProject = {
      ...p1,
      glyphs: { ...p1.glyphs, [0x3044]: makeGlyph(0x3044, 'い', 120) },
      updatedAt: 2,
    };
    expect(isEquivalentPreviewProject(prev, buildPreviewProject(p2, 'あ'))).toBe(true);
    // Glyph あ (in the preview) changed.
    const p3: FontProject = {
      ...p1,
      glyphs: { ...p1.glyphs, [0x3042]: makeGlyph(0x3042, 'あ', 120) },
      updatedAt: 3,
    };
    expect(isEquivalentPreviewProject(prev, buildPreviewProject(p3, 'あ'))).toBe(false);
    // Metadata changed.
    const p4: FontProject = { ...p1, metadata: { ...p1.metadata, ascender: 850 }, updatedAt: 4 };
    expect(isEquivalentPreviewProject(prev, buildPreviewProject(p4, 'あ'))).toBe(false);
    // Irrelevant kerning (both sides outside the preview) changed: no recompile.
    const p5: FontProject = { ...p1, kerning: { 'い,う': -10 }, updatedAt: 5 };
    expect(isEquivalentPreviewProject(prev, buildPreviewProject(p5, 'あ'))).toBe(true);
  });
});

describe('useTestPreviewState preview compilation', () => {
  const roots: Root[] = [];
  const containers: HTMLElement[] = [];
  let originalFontFace: unknown;

  function Harness({
    project,
    persistedState,
  }: {
    project: FontProject;
    persistedState: TestPreviewPersistedState;
  }) {
    useTestPreviewState({
      isOpen: true,
      onClose: () => {},
      project,
      setProject: () => {},
      theme: 'light',
      persistedState,
      onPersistedStateChange: () => {},
    });
    return null;
  }

  function renderHarness(project: FontProject, persistedState: TestPreviewPersistedState) {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(<Harness project={project} persistedState={persistedState} />);
    });
    roots.push(root);
    containers.push(container);
    return {
      rerender(nextProject: FontProject, nextPersistedState: TestPreviewPersistedState) {
        act(() => {
          root.render(<Harness project={nextProject} persistedState={nextPersistedState} />);
        });
      },
    };
  }

  beforeEach(() => {
    vi.useFakeTimers();
    mockCompileFont.mockClear();
    // Force the hook's no-FontFace branch: jsdom's FontFace.load() would
    // otherwise leave a pending promise and warn on state updates.
    originalFontFace = (globalThis as Record<string, unknown>).FontFace;
    (globalThis as Record<string, unknown>).FontFace = undefined;
  });

  afterEach(() => {
    while (roots.length > 0) {
      const r = roots.pop()!;
      act(() => r.unmount());
    }
    while (containers.length > 0) {
      containers.pop()!.remove();
    }
    vi.useRealTimers();
    (globalThis as Record<string, unknown>).FontFace = originalFontFace;
  });

  function advanceCompile() {
    act(() => {
      vi.advanceTimersByTime(300);
    });
  }

  function compiledGlyphs(callIndex: number): number[] {
    const calls = mockCompileFont.mock.calls as unknown as [FontProject, ...unknown[]][];
    const arg = calls[callIndex][0];
    return Object.keys(arg.glyphs).map(Number);
  }

  it('compiles only the preview glyphs and skips recompiles for off-preview edits', () => {
    const p1 = makeProject();
    const persisted = { ...createDefaultTestPreviewPersistedState(), testText: 'あ' };
    const { rerender } = renderHarness(p1, persisted);
    expect(mockCompileFont).not.toHaveBeenCalled();
    advanceCompile();
    expect(mockCompileFont).toHaveBeenCalledTimes(1);
    expect(compiledGlyphs(0)).toEqual([0x3042]);

    // Edit a glyph outside the preview text: no recompile.
    const p2: FontProject = {
      ...p1,
      glyphs: { ...p1.glyphs, [0x3044]: makeGlyph(0x3044, 'い', 120) },
      updatedAt: 2,
    };
    rerender(p2, persisted);
    advanceCompile();
    expect(mockCompileFont).toHaveBeenCalledTimes(1);

    // Edit a glyph in the preview text: recompile.
    const p3: FontProject = {
      ...p2,
      glyphs: { ...p2.glyphs, [0x3042]: makeGlyph(0x3042, 'あ', 120) },
      updatedAt: 3,
    };
    rerender(p3, persisted);
    advanceCompile();
    expect(mockCompileFont).toHaveBeenCalledTimes(2);
    expect(compiledGlyphs(1)).toEqual([0x3042]);

    // Project-wide metadata change: recompile (with the subset project).
    const p4: FontProject = {
      ...p3,
      metadata: { ...p3.metadata, ascender: 850 },
      updatedAt: 4,
    };
    rerender(p4, persisted);
    advanceCompile();
    expect(mockCompileFont).toHaveBeenCalledTimes(3);
    const calls = mockCompileFont.mock.calls as unknown as [FontProject, ...unknown[]][];
    expect(calls[2][0].metadata.ascender).toBe(850);

    // Preview text grows to include い: recompile with both glyphs.
    rerender(p4, { ...persisted, testText: 'あい' });
    advanceCompile();
    expect(mockCompileFont).toHaveBeenCalledTimes(4);
    expect(compiledGlyphs(3).sort((a, b) => a - b)).toEqual([0x3042, 0x3044]);
  });
});

describe('clampAdjustOffset / clampAdjustScale (M6)', () => {
  it('clamps offsets to -200..200 and scales to 40..200', () => {
    expect(clampAdjustOffset(10000)).toBe(200);
    expect(clampAdjustOffset(-10000)).toBe(-200);
    expect(clampAdjustOffset(200)).toBe(200);
    expect(clampAdjustOffset(-200)).toBe(-200);
    expect(clampAdjustOffset(0)).toBe(0);
    expect(clampAdjustOffset(Number.NaN)).toBe(0);
    expect(clampAdjustScale(10000)).toBe(200);
    expect(clampAdjustScale(0)).toBe(40);
    expect(clampAdjustScale(39)).toBe(40);
    expect(clampAdjustScale(100)).toBe(100);
    expect(clampAdjustScale(Number.NaN)).toBe(100);
  });
});

describe('adjust drafts, auto-center, glyph entries and metric cache (M3, M5, M10, M12, M13)', () => {
  const roots: Root[] = [];
  const containers: HTMLElement[] = [];
  let originalFontFace: unknown;
  let latestState: ReturnType<typeof useTestPreviewState> | null = null;
  const toastFn = vi.fn();

  function makeRectGlyph(
    unicode: number,
    char: string,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number
  ): GlyphData {
    return {
      unicode,
      char,
      name: `uni${unicode.toString(16).toUpperCase()}`,
      advanceWidth: 1000,
      lsb: minX,
      contours: [
        {
          id: `c${unicode}`,
          closed: true,
          nodes: [
            { id: 'n1', x: minX, y: minY, type: 'corner' },
            { id: 'n2', x: maxX, y: minY, type: 'corner' },
            { id: 'n3', x: maxX, y: maxY, type: 'corner' },
            { id: 'n4', x: minX, y: maxY, type: 'corner' },
          ],
        },
      ],
    };
  }

  function makePixelGlyph(unicode: number, char: string): GlyphData {
    return {
      unicode,
      char,
      name: `uni${unicode.toString(16).toUpperCase()}`,
      advanceWidth: 1000,
      lsb: 0,
      contours: [],
      pixelData: {
        width: 4,
        height: 4,
        data: [1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      },
    } as unknown as GlyphData;
  }

  function Harness({ project }: { project: FontProject }) {
    latestState = useTestPreviewState({
      isOpen: true,
      onClose: () => {},
      project,
      setProject: () => {},
      theme: 'light',
      onShowToast: toastFn,
    });
    return null;
  }

  function renderHarness(project: FontProject) {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(<Harness project={project} />);
    });
    roots.push(root);
    containers.push(container);
    return {
      rerender(nextProject: FontProject) {
        act(() => {
          root.render(<Harness project={nextProject} />);
        });
      },
    };
  }

  beforeEach(() => {
    vi.useFakeTimers();
    mockCompileFont.mockClear();
    pixelGridToContoursSpy.mockClear();
    toastFn.mockClear();
    latestState = null;
    originalFontFace = (globalThis as Record<string, unknown>).FontFace;
    (globalThis as Record<string, unknown>).FontFace = undefined;
  });

  afterEach(() => {
    while (roots.length > 0) {
      const r = roots.pop()!;
      act(() => r.unmount());
    }
    while (containers.length > 0) {
      containers.pop()!.remove();
    }
    vi.useRealTimers();
    (globalThis as Record<string, unknown>).FontFace = originalFontFace;
  });

  it('keeps an unsaved draft per character across switches (M3)', () => {
    renderHarness(makeProject());
    const state = () => latestState!;
    act(() => {
      state().selectCharForAdjust({ char: 'あ', unicode: 0x3042, lineIndex: 0, charIndex: 0 });
    });
    expect(state().selectedCharInfo?.unicode).toBe(0x3042);
    act(() => {
      state().setAdjustDx(50);
      state().setAdjustDy(-30);
      state().setAdjustScaleX(120);
      state().setAdjustScaleY(90);
    });
    // Switch to another character: the new character starts from defaults.
    act(() => {
      state().selectCharForAdjust({ char: 'い', unicode: 0x3044, lineIndex: 0, charIndex: 1 });
    });
    expect(state().adjustDx).toBe(0);
    expect(state().adjustDy).toBe(0);
    expect(state().adjustScaleX).toBe(100);
    expect(state().adjustScaleY).toBe(100);
    // Change the second character, then switch back: the first draft returns.
    act(() => {
      state().setAdjustDx(10);
    });
    act(() => {
      state().selectCharForAdjust({ char: 'あ', unicode: 0x3042, lineIndex: 0, charIndex: 0 });
    });
    expect(state().adjustDx).toBe(50);
    expect(state().adjustDy).toBe(-30);
    expect(state().adjustScaleX).toBe(120);
    expect(state().adjustScaleY).toBe(90);
  });

  it('auto-center accounts for scale on both axes and says the result is unsaved (M10)', () => {
    // え: x 200..600 (centre 400, dx 100 at 100%), y 200..800 (centre 500, dy 0).
    // お: x 100..600 (centre 350, dx 150), y 100..500 (centre 300, dy -200 at 100%).
    const project = makeProject([
      makeRectGlyph(0x3048, 'え', 200, 200, 600, 800),
      makeRectGlyph(0x304a, 'お', 100, 100, 600, 500),
    ]);
    renderHarness(project);
    const state = () => latestState!;
    act(() => {
      state().selectCharForAdjust({ char: 'え', unicode: 0x3048, lineIndex: -1, charIndex: -1 });
    });
    act(() => {
      state().handleAutoCenterGlyph();
    });
    expect(state().adjustDx).toBe(100);
    expect(state().adjustDy).toBe(0);
    expect(toastFn).toHaveBeenCalledWith(
      expect.stringContaining('保存すると確定します'),
      'info'
    );

    // At 150% width the horizontal offset grows with the scale.
    act(() => {
      state().setAdjustScaleX(150);
    });
    act(() => {
      state().handleAutoCenterGlyph();
    });
    expect(state().adjustDx).toBe(150);

    // At 50% height the vertical offset shrinks with the scale.
    act(() => {
      state().selectCharForAdjust({ char: 'お', unicode: 0x304a, lineIndex: -1, charIndex: -1 });
      state().setAdjustScaleX(100);
      state().setAdjustScaleY(50);
    });
    act(() => {
      state().handleAutoCenterGlyph();
    });
    expect(state().adjustDx).toBe(150);
    expect(state().adjustDy).toBe(-100);
  });

  it('auto-centers a dot-only glyph from its pixel contours and says it cannot be saved (M5)', () => {
    const project = makeProject([makePixelGlyph(0x3048, 'え')]);
    renderHarness(project);
    const state = () => latestState!;
    act(() => {
      state().selectCharForAdjust({ char: 'え', unicode: 0x3048, lineIndex: -1, charIndex: -1 });
    });
    expect(state().isPixelOnlyActiveGlyph).toBe(true);
    act(() => {
      state().handleAutoCenterGlyph();
    });
    expect(toastFn).toHaveBeenCalledWith(
      expect.stringContaining('ドット絵グリフのためここから保存できません'),
      'info'
    );
    expect(state().adjustDx).not.toBe(0);
  });

  it('includes blank glyphs in the dropdown entries (M12)', () => {
    const spaceGlyph = (unicode: number, char: string): GlyphData =>
      ({
        unicode,
        char,
        name: char,
        advanceWidth: unicode === 0x20 ? 500 : 1000,
        lsb: 0,
        contours: [],
      } as unknown as GlyphData);
    const project = makeProject([spaceGlyph(0x20, ' '), spaceGlyph(0x3000, '　')]);
    renderHarness(project);
    const unicodes = latestState!.glyphEntries.map((e) => e.unicode);
    expect(unicodes).toContain(0x20);
    expect(unicodes).toContain(0x3000);
  });

  it('converts dot-only contours and computes metrics once per glyph (M13)', () => {
    const project = makeProject([makePixelGlyph(0x3048, 'え')]);
    const { rerender } = renderHarness(project);
    const state = () => latestState!;
    const m1 = state().getGlyphMetric('え');
    const m2 = state().getGlyphMetric('え');
    expect(m1).not.toBeNull();
    expect(m2).toBe(m1);
    expect(pixelGridToContoursSpy).toHaveBeenCalledTimes(1);

    // Replacing the glyph object invalidates the cache.
    const p2: FontProject = {
      ...project,
      glyphs: { ...project.glyphs, [0x3048]: makePixelGlyph(0x3048, 'え') },
    };
    rerender(p2);
    state().getGlyphMetric('え');
    expect(pixelGridToContoursSpy).toHaveBeenCalledTimes(2);
  });
});

describe('low review items (L2, L4, L7, L8, L9, L10, L11, L39, L42)', () => {
  const roots: Root[] = [];
  const containers: HTMLElement[] = [];
  let originalFontFace: unknown;
  let latestState: ReturnType<typeof useTestPreviewState> | null = null;

  function Harness({
    project,
    isOpen = true,
    onClose = () => {},
    persistedState,
    onPersistedStateChange,
  }: {
    project: FontProject;
    isOpen?: boolean;
    onClose?: () => void;
    persistedState?: TestPreviewPersistedState;
    onPersistedStateChange?: React.Dispatch<React.SetStateAction<TestPreviewPersistedState>>;
  }) {
    latestState = useTestPreviewState({
      isOpen,
      onClose,
      project,
      setProject: () => {},
      theme: 'light',
      ...(persistedState && onPersistedStateChange
        ? { persistedState, onPersistedStateChange }
        : {}),
    });
    return null;
  }

  // Harness with a real persisted store, so persisted fields (testText,
  // knownGlyphUnicodes, showLivePreviewBox) survive across rerenders.
  function StoredHarness({
    project,
    testText = 'あ',
  }: {
    project: FontProject;
    testText?: string;
  }) {
    const [persisted, setPersisted] = useState(() => ({
      ...createDefaultTestPreviewPersistedState(),
      testText,
    }));
    latestState = useTestPreviewState({
      isOpen: true,
      onClose: () => {},
      project,
      setProject: () => {},
      theme: 'light',
      persistedState: persisted,
      onPersistedStateChange: setPersisted,
    });
    return null;
  }

  function mount(node: React.ReactNode) {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(node);
    });
    roots.push(root);
    containers.push(container);
    return {
      container,
      rerender(nextNode: React.ReactNode) {
        act(() => {
          root.render(nextNode);
        });
      },
    };
  }

  beforeEach(() => {
    vi.useFakeTimers();
    mockCompileFont.mockClear();
    latestState = null;
    originalFontFace = (globalThis as Record<string, unknown>).FontFace;
    (globalThis as Record<string, unknown>).FontFace = undefined;
  });

  afterEach(() => {
    while (roots.length > 0) {
      const r = roots.pop()!;
      act(() => r.unmount());
    }
    while (containers.length > 0) {
      containers.pop()!.remove();
    }
    document.querySelectorAll('body > select, body > input').forEach((el) => el.remove());
    vi.useRealTimers();
    (globalThis as Record<string, unknown>).FontFace = originalFontFace;
  });

  function advanceCompile() {
    act(() => {
      vi.advanceTimersByTime(300);
    });
  }

  it('resets the compile error and font family name when the modal closes (L2)', () => {
    const onClose = vi.fn();
    const persisted = createDefaultTestPreviewPersistedState();
    const { rerender } = mount(
      <Harness
        project={makeProject()}
        isOpen
        onClose={onClose}
        persistedState={persisted}
        onPersistedStateChange={() => {}}
      />
    );
    advanceCompile();
    expect(latestState!.errorMsg).toBeNull();
    expect(latestState!.fontFamilyName).toMatch(/^CustomTestFont_v\d+_/);

    // A failed compile sets an error; closing clears it.
    mockCompileFont.mockImplementationOnce(() => {
      throw new Error('compile boom');
    });
    rerender(
      <Harness
        project={{ ...makeProject(), updatedAt: 2 }}
        isOpen
        onClose={onClose}
        persistedState={persisted}
        onPersistedStateChange={() => {}}
      />
    );
    advanceCompile();
    expect(latestState!.errorMsg).toContain('compile boom');

    rerender(
      <Harness
        project={makeProject()}
        isOpen={false}
        onClose={onClose}
        persistedState={persisted}
        onPersistedStateChange={() => {}}
      />
    );
    expect(latestState!.errorMsg).toBeNull();
    expect(latestState!.fontFamilyName).toBe('CustomTestFont');
  });

  it('ignores f / z / Escape while a select or input has focus (L4)', () => {
    const onClose = vi.fn();
    mount(<Harness project={makeProject()} isOpen onClose={onClose} />);

    const select = document.createElement('select');
    document.body.appendChild(select);
    act(() => {
      select.focus();
    });
    expect(document.activeElement).toBe(select);
    act(() => {
      window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'f' }));
    });
    expect(latestState!.isFullscreen).toBe(false);
    act(() => {
      window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'z' }));
    });
    expect(latestState!.isSidebarOpen).toBe(true);
    act(() => {
      window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(onClose).not.toHaveBeenCalled();

    const input = document.createElement('input');
    document.body.appendChild(input);
    act(() => {
      input.focus();
    });
    act(() => {
      window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(onClose).not.toHaveBeenCalled();

    act(() => {
      input.blur();
    });
    act(() => {
      window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('drops CR characters and renders tabs as marker spans, not character spans (L7)', () => {
    const project = makeProject([
      makeGlyph(0x61, 'a'),
      makeGlyph(0x62, 'b'),
      makeGlyph(0x63, 'c'),
    ]);
    const persisted = {
      ...createDefaultTestPreviewPersistedState(),
      testText: 'a\r\nb\tc',
      showSpaceMarkers: true,
    };
    mount(
      <Harness
        project={project}
        persistedState={persisted}
        onPersistedStateChange={() => {}}
      />
    );
    const { container } = mount(<PreviewCanvas project={project} state={latestState!} />);
    expect(container.textContent).not.toContain('\r');
    expect(container.textContent).toContain('a');
    expect(container.textContent).toContain('b');
    expect(container.textContent).toContain('c');
    // The tab is a dedicated marker span, not a shaped character.
    expect(container.textContent).toContain('→');
  });

  it('opens the vector outline preview by default, unless a persisted setting says otherwise (L8)', () => {
    mount(<Harness project={makeProject()} />);
    expect(latestState!.showLivePreviewBox).toBe(true);

    const persisted = {
      ...createDefaultTestPreviewPersistedState(),
      showLivePreviewBox: false,
    };
    mount(
      <Harness
        project={makeProject()}
        persistedState={persisted}
        onPersistedStateChange={() => {}}
      />
    );
    expect(latestState!.showLivePreviewBox).toBe(false);
  });

  it('gives the floating adjust panel a width resize handle (L9)', () => {
    mount(<Harness project={makeProject()} />);
    const { container } = mount(
      <CharAdjustPanel
        project={makeProject()}
        state={{ ...latestState!, isDocked: false, floatingPos: { x: 10, y: 10 } }}
      />
    );
    expect(container.querySelector('[title*="小窓の幅を調整"]')).not.toBeNull();
  });

  it('tells a deleted glyph apart from one that was never created (L10)', () => {
    const p1 = makeProject();
    const { rerender } = mount(<StoredHarness project={p1} />);
    const state = () => latestState!;
    act(() => {
      state().selectCharForAdjust({ char: 'あ', unicode: 0x3042, lineIndex: 0, charIndex: 0 });
    });
    expect(state().isSelectedGlyphDeleted).toBe(false);

    // Delete あ from the project and reopen the selection.
    const { [0x3042]: _removed, ...restGlyphs } = p1.glyphs;
    const p2: FontProject = { ...p1, glyphs: restGlyphs };
    rerender(<StoredHarness project={p2} />);
    expect(state().isSelectedGlyphDeleted).toBe(true);
    const { container } = mount(<CharAdjustPanel project={p2} state={state()} />);
    expect(container.textContent).toContain('削除されたグリフ');
    expect(container.textContent).not.toContain('未作成グリフ');

    // A character that never had a glyph is still "uncreated", not deleted.
    act(() => {
      state().selectCharForAdjust({ char: 'え', unicode: 0x3048, lineIndex: -1, charIndex: -1 });
    });
    expect(state().isSelectedGlyphDeleted).toBe(false);
  });

  it('does not rebuild the preview project on adjust-only rerenders (L11)', () => {
    let glyphOwnKeysReads = 0;
    const glyphs = new Proxy(
      {
        0x3042: makeGlyph(0x3042, 'あ'),
        0x3044: makeGlyph(0x3044, 'い'),
        0x3046: makeGlyph(0x3046, 'う'),
        // Extra glyphs keep the preview subset below the 80%
        // full-compile fallback, so buildPreviewProject builds a new
        // plain object instead of returning the project itself.
        0x3048: makeGlyph(0x3048, 'え'),
        0x304a: makeGlyph(0x304a, 'お'),
      } as Record<number, GlyphData>,
      {
        ownKeys(target) {
          glyphOwnKeysReads++;
          return Reflect.ownKeys(target);
        },
      }
    );
    const project = {
      ...makeProject(),
      glyphs,
    } as unknown as FontProject;
    mount(<StoredHarness project={project} testText="あ" />);
    advanceCompile();
    const readsAfterMount = glyphOwnKeysReads;
    act(() => {
      latestState!.setAdjustDx(10);
    });
    act(() => {
      latestState!.setAdjustDy(-5);
    });
    act(() => {
      latestState!.setAdjustScaleX(120);
    });
    expect(glyphOwnKeysReads).toBe(readsAfterMount);
  });

  it('falls back for a negative advance and reports zero-width glyphs instead of null (L39)', () => {
    expect(resolvePreviewAdvanceWidth({ unicode: 0x3042, advanceWidth: -100 } as GlyphData, 1000)).toBe(1000);
    expect(resolvePreviewAdvanceWidth({ unicode: 0x41, advanceWidth: -100 } as GlyphData, 1000)).toBe(500);
    expect(resolvePreviewAdvanceWidth({ unicode: 0x3042, advanceWidth: 0 } as GlyphData, 1000)).toBe(1000);
    expect(resolvePreviewAdvanceWidth({ unicode: 0x3042, advanceWidth: 700 } as GlyphData, 1000)).toBe(700);

    const negativeAdvGlyph: GlyphData = {
      ...makeGlyph(0x3042, 'あ'),
      advanceWidth: -100,
    };
    const verticalLineGlyph: GlyphData = {
      unicode: 0x3044,
      char: 'い',
      name: 'uni3044',
      advanceWidth: 1000,
      lsb: 300,
      contours: [
        {
          id: 'c3044',
          closed: true,
          nodes: [
            { id: 'n1', x: 300, y: 200, type: 'corner' },
            { id: 'n2', x: 300, y: 800, type: 'corner' },
          ],
        },
      ],
    };
    const project = makeProject([negativeAdvGlyph, verticalLineGlyph]);
    // makeProject already contains あ/い; replace them with the variants.
    project.glyphs[0x3042] = negativeAdvGlyph;
    project.glyphs[0x3044] = verticalLineGlyph;
    mount(<Harness project={project} />);
    const state = () => latestState!;
    const negMetric = state().getGlyphMetric('あ');
    expect(negMetric).not.toBeNull();
    expect(negMetric!.adv).toBe(1000);
    expect(negMetric!.lsb).toBe(100);
    expect(negMetric!.rsb).toBe(400);
    const lineMetric = state().getGlyphMetric('い');
    expect(lineMetric).not.toBeNull();
    expect(lineMetric!.zeroWidth).toBe(true);
    expect(lineMetric!.lsb).toBe(300);
    expect(lineMetric!.rsb).toBe(700);
  });

  it('uses the opentype format in the no-FontFace @font-face fallback (L42)', () => {
    mount(<Harness project={makeProject()} />);
    advanceCompile();
    const styleTag = document.getElementById('dynamic-preview-font-face');
    expect(styleTag).not.toBeNull();
    expect(styleTag!.textContent).toContain("format('opentype')");
    expect(styleTag!.textContent).not.toContain("format('truetype')");
  });
});
