// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FontProject, GlyphData } from '../../../types';
import {
  buildPreviewProject,
  collectPreviewGlyphUnicodes,
  extractPreviewUnicodes,
  isEquivalentPreviewProject,
  useTestPreviewState,
} from './useTestPreviewState';
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
