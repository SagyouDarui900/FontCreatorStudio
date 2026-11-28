// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { ProjectProvider, useProjectContext } from '../contexts/ProjectContext';
import { FontProject, GlyphData, PathContour } from '../types';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

function makeContour(id: string, x: number): PathContour {
  return {
    id,
    closed: true,
    nodes: [
      { id: `${id}-n1`, x, y: 100, type: 'corner' },
      { id: `${id}-n2`, x: x + 100, y: 100, type: 'corner' },
      { id: `${id}-n3`, x: x + 100, y: 200, type: 'corner' },
    ],
  };
}

function makeGlyph(unicode: number, char: string, overrides: Partial<GlyphData> = {}): GlyphData {
  return {
    unicode,
    char,
    name: `uni${unicode.toString(16).toUpperCase().padStart(4, '0')}`,
    advanceWidth: 1000,
    lsb: 50,
    contours: [],
    ...overrides,
  };
}

function makeProject(id: string, glyphs: Record<number, GlyphData>, upm = 1000): FontProject {
  return {
    id,
    name: 'TestFont',
    metadata: {
      familyName: 'TestFont',
      styleName: 'Regular',
      designer: 'Tester',
      copyright: 'Copyright',
      license: 'OFL',
      licenseUrl: '',
      version: '1.0',
      unitsPerEm: upm,
      ascender: 800,
      descender: -200,
      lineGap: 0,
      capHeight: 700,
      xHeight: 500,
    },
    glyphs,
    createdAt: 1000,
    updatedAt: 1000,
  };
}

function mount(initial: FontProject) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const toasts: string[] = [];
  let ctx!: ReturnType<typeof useProjectContext>;
  function Consumer() {
    ctx = useProjectContext();
    return null;
  }
  function Wrapper() {
    const [project, setProject] = React.useState<FontProject>(initial);
    const projectRef = React.useRef(project);
    projectRef.current = project;
    return (
      <ProjectProvider
        project={project}
        setProject={setProject}
        projectRef={projectRef}
        saveProjectToIndexedDbWhenIdle={async () => true}
        showToast={(msg) => {
          toasts.push(msg);
        }}
      >
        <Consumer />
      </ProjectProvider>
    );
  }
  act(() => {
    root.render(<Wrapper />);
  });
  return {
    get ctx() {
      return ctx;
    },
    toasts,
    unmount() {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

function findButton(label: string): HTMLButtonElement | undefined {
  return Array.from(document.querySelectorAll('button')).find(
    (b) => b.textContent === label
  ) as HTMLButtonElement | undefined;
}

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));
  });
}

describe('overwrite confirmations use a custom dialog instead of window.confirm', () => {
  it('small-kana generation asks before overwriting, and proceeds on OK', async () => {
    const tsu = makeGlyph(0x3064, 'つ', { contours: [makeContour('tsu-c', 100)] });
    const smallTsu = makeGlyph(0x3063, 'っ', { contours: [makeContour('old-c', 300)] });
    const h = mount(makeProject('proj-1', { [0x3064]: tsu, [0x3063]: smallTsu }));
    try {
      act(() => {
        h.ctx.handleDuplicateAsSmallKana(0x3064);
      });
      await flush();

      // The custom dialog shows the same message window.confirm used.
      expect(document.body.textContent).toContain(
        '「っ」には既に字形があります。上書きしますか？'
      );
      const ok = findButton('OK');
      expect(ok).toBeDefined();
      act(() => {
        ok!.click();
      });
      await flush();

      const generated = h.ctx.project.glyphs[0x3063];
      expect(generated.contours.length).toBeGreaterThan(0);
      expect(generated.contours[0].id).not.toBe('old-c');
      expect(h.ctx.selectedUnicode).toBe(0x3063);
    } finally {
      h.unmount();
    }
  });

  it('small-kana generation keeps the existing glyph when Cancel is chosen', async () => {
    const tsu = makeGlyph(0x3064, 'つ', { contours: [makeContour('tsu-c', 100)] });
    const smallTsu = makeGlyph(0x3063, 'っ', { contours: [makeContour('old-c', 300)] });
    const h = mount(makeProject('proj-1', { [0x3064]: tsu, [0x3063]: smallTsu }));
    try {
      act(() => {
        h.ctx.handleDuplicateAsSmallKana(0x3064);
      });
      await flush();

      const cancel = findButton('キャンセル');
      expect(cancel).toBeDefined();
      act(() => {
        cancel!.click();
      });
      await flush();

      const kept = h.ctx.project.glyphs[0x3063];
      expect(kept.contours).toHaveLength(1);
      expect(kept.contours[0].id).toBe('old-c');
      // Cancel leaves the selection unchanged (still the default 'あ').
      expect(h.ctx.selectedUnicode).toBe(0x3042);
    } finally {
      h.unmount();
    }
  });

  it('dakuten generation proceeds on OK and keeps the existing glyph on Cancel', async () => {
    const ka = makeGlyph(0x304b, 'か', { contours: [makeContour('ka-c', 100)] });
    const ga = makeGlyph(0x304c, 'が', { contours: [makeContour('old-ga', 300)] });
    const h = mount(makeProject('proj-1', { [0x304b]: ka, [0x304c]: ga }));
    try {
      act(() => {
        h.ctx.handleGenerateDakutenTarget('が', false, 'か');
      });
      await flush();

      expect(document.body.textContent).toContain(
        '「が」には既に字形があります。上書きしますか？'
      );
      act(() => {
        findButton('キャンセル')!.click();
      });
      await flush();

      const kept = h.ctx.project.glyphs[0x304c];
      expect(kept.contours).toHaveLength(1);
      expect(kept.contours[0].id).toBe('old-ga');

      // A second attempt, this time confirming, overwrites the glyph.
      act(() => {
        h.ctx.handleGenerateDakutenTarget('が', false, 'か');
      });
      await flush();
      act(() => {
        findButton('OK')!.click();
      });
      await flush();

      const generated = h.ctx.project.glyphs[0x304c];
      expect(generated.contours.length).toBeGreaterThan(0);
      expect(generated.contours[0].id).not.toBe('old-ga');
      expect(h.ctx.selectedUnicode).toBe(0x304c);
    } finally {
      h.unmount();
    }
  });

  it('does not show a confirm dialog when the target has no contours', async () => {
    const tsu = makeGlyph(0x3064, 'つ', { contours: [makeContour('tsu-c', 100)] });
    const h = mount(makeProject('proj-1', { [0x3064]: tsu }));
    try {
      act(() => {
        h.ctx.handleDuplicateAsSmallKana(0x3064);
      });
      await flush();

      expect(document.body.textContent).not.toContain('上書きしますか？');
      const generated = h.ctx.project.glyphs[0x3063];
      expect(generated).toBeDefined();
      expect(generated.contours.length).toBeGreaterThan(0);
    } finally {
      h.unmount();
    }
  });
});

describe('batch radical insert defaults follow unitsPerEm', () => {
  it('uses UPM 2048 defaults (advanceWidth 2048, lsb 102) for a new glyph', () => {
    const h = mount(makeProject('proj-1', {}, 2048));
    try {
      act(() => {
        h.ctx.handleBatchInsertRadical([makeContour('rad-c', 100)], ['日']);
      });
      const inserted = h.ctx.project.glyphs['日'.codePointAt(0)!];
      expect(inserted).toBeDefined();
      expect(inserted.contours).toHaveLength(1);
      expect(inserted.advanceWidth).toBe(2048);
      // lsb is 5% of UPM: 50 * 2048 / 1000 = 102.4 -> 102.
      expect(inserted.lsb).toBe(102);
    } finally {
      h.unmount();
    }
  });

  it('uses UPM 1000 defaults (advanceWidth 1000, lsb 50) for a new glyph', () => {
    const h = mount(makeProject('proj-1', {}, 1000));
    try {
      act(() => {
        h.ctx.handleBatchInsertRadical([makeContour('rad-c', 100)], ['日']);
      });
      const inserted = h.ctx.project.glyphs['日'.codePointAt(0)!];
      expect(inserted).toBeDefined();
      expect(inserted.advanceWidth).toBe(1000);
      expect(inserted.lsb).toBe(50);
    } finally {
      h.unmount();
    }
  });
});
