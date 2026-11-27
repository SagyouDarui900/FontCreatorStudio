// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { useUndoRedo, MAX_HISTORY_GLYPHS } from './useUndoRedo';
import { ProjectProvider, useProjectContext } from '../contexts/ProjectContext';
import { FontProject, GlyphData } from '../types';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

function makeProject(): FontProject {
  return {
    id: 'proj-test',
    name: 'TestFont',
    metadata: {
      familyName: 'TestFont',
      styleName: 'Regular',
      designer: 'Tester',
      copyright: 'Copyright',
      license: 'OFL',
      licenseUrl: '',
      version: '1.0',
      unitsPerEm: 1000,
      ascender: 800,
      descender: -200,
      lineGap: 0,
      capHeight: 700,
      xHeight: 500,
    },
    glyphs: {},
    createdAt: 1000,
    updatedAt: 1000,
  };
}

describe('useUndoRedo LRU eviction & ProjectContext same-frame Undo/Redo sync', () => {
  it('evicts oldest unused Unicode stacks beyond MAX_HISTORY_GLYPHS while preserving MRU glyphs', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const projectRef = { current: makeProject() };
    const currentGlyphRef: { current: GlyphData } = {
      current: {
        unicode: 0x3042,
        char: 'あ',
        name: 'uni3042',
        advanceWidth: 1000,
        lsb: 50,
        contours: [],
      },
    };
    let api!: ReturnType<typeof useUndoRedo>;

    function Harness() {
      const [, setProject] = React.useState<FontProject>(projectRef.current);
      api = useUndoRedo({
        projectRef,
        currentGlyphRef,
        selectedUnicode: 0x3042,
        selectedChar: 'あ',
        setProject,
      });
      return null;
    }

    act(() => {
      root.render(<Harness />);
    });

    // Push snapshots across MAX_HISTORY_GLYPHS + 10 distinct glyphs
    const total = MAX_HISTORY_GLYPHS + 10;
    act(() => {
      for (let i = 0; i < total; i++) {
        const code = 0x4e00 + i;
        api.pushSnapshot({
          unicode: code,
          char: String.fromCodePoint(code),
          name: `uni${code.toString(16)}`,
          advanceWidth: 1000,
          lsb: 50,
          contours: [],
        }, code);
      }
    });

    const keys = Object.keys(api.undoStacks).map(Number);
    expect(keys.length).toBe(MAX_HISTORY_GLYPHS);
    // Earliest 10 glyphs were evicted
    for (let i = 0; i < 10; i++) {
      expect(api.undoStacks[0x4e00 + i]).toBeUndefined();
    }
    // Latest glyph is retained
    expect(api.undoStacks[0x4e00 + total - 1]?.length).toBe(1);

    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('captures post-edit snapshot in redoStack when handleUndo runs in the same frame after handleUpdateContours', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    let ctx!: ReturnType<typeof useProjectContext>;
    function Consumer() {
      ctx = useProjectContext();
      return null;
    }

    function Wrapper() {
      const [project, setProject] = React.useState<FontProject>(() => makeProject());
      const projectRef = React.useRef(project);
      projectRef.current = project;
      return (
        <ProjectProvider
          project={project}
          setProject={setProject}
          projectRef={projectRef}
          saveProjectToIndexedDbWhenIdle={async () => true}
          showToast={vi.fn()}
        >
          <Consumer />
        </ProjectProvider>
      );
    }

    act(() => {
      root.render(<Wrapper />);
    });

    const editedContours = [
      {
        id: 'edited-c1',
        closed: true,
        nodes: [
          { id: 'n1', x: 100, y: 100, type: 'corner' as const },
          { id: 'n2', x: 200, y: 100, type: 'corner' as const },
          { id: 'n3', x: 200, y: 200, type: 'corner' as const },
        ],
      },
    ];

    // Edit then immediately Undo in the same synchronous act block
    act(() => {
      ctx.handleUpdateContours(editedContours);
      ctx.handleUndo();
    });

    expect(ctx.currentGlyph.contours.length).toBe(0);
    expect(ctx.canRedo).toBe(true);

    // Redo must restore the editedContours (not the pre-edit empty contours)
    act(() => {
      ctx.handleRedo();
    });

    expect(ctx.currentGlyph.contours.length).toBe(1);
    expect(ctx.currentGlyph.contours[0].id).toBe('edited-c1');

    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('resets undo and redo stacks automatically when project.id changes', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    let ctx!: ReturnType<typeof useProjectContext>;
    function Consumer() {
      ctx = useProjectContext();
      return null;
    }

    function Wrapper() {
      const [project, setProject] = React.useState<FontProject>(() => makeProject());
      const projectRef = React.useRef(project);
      projectRef.current = project;
      return (
        <ProjectProvider
          project={project}
          setProject={setProject}
          projectRef={projectRef}
          saveProjectToIndexedDbWhenIdle={async () => true}
          showToast={vi.fn()}
        >
          <Consumer />
        </ProjectProvider>
      );
    }

    act(() => {
      root.render(<Wrapper />);
    });

    act(() => {
      ctx.handleUpdateContours([
        {
          id: 'c-old',
          closed: true,
          nodes: [
            { id: 'n1', x: 50, y: 50, type: 'corner' },
            { id: 'n2', x: 150, y: 50, type: 'corner' },
            { id: 'n3', x: 150, y: 150, type: 'corner' },
          ],
        },
      ]);
    });
    expect(ctx.canUndo).toBe(true);

    // Replace project with a different ID
    act(() => {
      ctx.setProject({
        ...makeProject(),
        id: 'proj-new',
        name: 'NewFont',
      });
    });

    expect(ctx.canUndo).toBe(false);
    expect(ctx.canRedo).toBe(false);
    expect(ctx.undoStack).toEqual([]);
    expect(ctx.redoStack).toEqual([]);

    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('evicts oldest inactive glyphs first when byte budget is exceeded and protects active unicode', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const projectRef = { current: makeProject() };
    const currentGlyphRef: { current: GlyphData } = {
      current: {
        unicode: 0x3042,
        char: 'あ',
        name: 'uni3042',
        advanceWidth: 1000,
        lsb: 50,
        contours: [],
      },
    };
    let api!: ReturnType<typeof useUndoRedo>;

    // Pixel data with 100 pixels -> 128 + 800 + 256 = 1184 bytes per snapshot
    const makePixelGlyph = (unicode: number): GlyphData => ({
      unicode,
      char: String.fromCodePoint(unicode),
      name: `uni${unicode.toString(16)}`,
      advanceWidth: 1000,
      lsb: 50,
      contours: [],
      pixelData: { width: 10, height: 10, data: new Array(100).fill(1) },
    });

    function Harness() {
      const [, setProject] = React.useState<FontProject>(projectRef.current);
      api = useUndoRedo({
        projectRef,
        currentGlyphRef,
        selectedUnicode: 0x3042,
        selectedChar: 'あ',
        setProject,
        maxHistoryBytes: 2600,
      });
      return null;
    }

    act(() => {
      root.render(<Harness />);
    });

    act(() => {
      api.pushSnapshot(makePixelGlyph(0x3042), 0x3042); // active glyph (~1184B)
      api.pushSnapshot(makePixelGlyph(0x3044), 0x3044); // older inactive (~1184B -> total ~2368B)
      api.pushSnapshot(makePixelGlyph(0x3046), 0x3046); // pushes over 2600B -> 0x3044 evicted, 0x3042 protected
    });

    expect(api.undoStacks[0x3042]?.length).toBe(1);
    expect(api.undoStacks[0x3044]).toBeUndefined();
    expect(api.undoStacks[0x3046]?.length).toBe(1);

    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('derives selectedChar from selectedUnicode and keeps glyph action handler identities stable across unrelated updates', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const contexts: Array<ReturnType<typeof useProjectContext>> = [];
    function Consumer() {
      const ctx = useProjectContext();
      contexts.push(ctx);
      return null;
    }

    function Wrapper() {
      const [project, setProject] = React.useState<FontProject>(() => makeProject());
      const [tick, setTick] = React.useState(0);
      const projectRef = React.useRef(project);
      projectRef.current = project;
      const saveFn = React.useCallback(async () => true, []);
      const toastFn = React.useCallback(() => {}, []);
      return (
        <ProjectProvider
          project={project}
          setProject={setProject}
          projectRef={projectRef}
          saveProjectToIndexedDbWhenIdle={saveFn}
          showToast={toastFn}
        >
          <button type="button" onClick={() => setTick((t) => t + 1)} data-tick={tick}>
            rerender
          </button>
          <Consumer />
        </ProjectProvider>
      );
    }

    act(() => {
      root.render(<Wrapper />);
    });

    const first = contexts[contexts.length - 1];
    expect(first.selectedChar).toBe('あ');

    // Trigger parent re-render without changing project or selection
    act(() => {
      container.querySelector('button')?.click();
    });
    const afterRerender = contexts[contexts.length - 1];
    expect(afterRerender).toBe(first);
    expect(afterRerender.handleClearGlyph).toBe(first.handleClearGlyph);

    // Selecting a new glyph updates selectedChar automatically without needing separate setSelectedChar
    act(() => {
      afterRerender.handleSelectGlyph(0x6f22); // '漢'
    });
    const afterSelect = contexts[contexts.length - 1];
    expect(afterSelect.selectedUnicode).toBe(0x6f22);
    expect(afterSelect.selectedChar).toBe('漢');

    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('isolates IVS variant editing and Undo/Redo from base glyph history and supports commitBatchHistory', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    let ctx!: ReturnType<typeof useProjectContext>;
    function Consumer() {
      ctx = useProjectContext();
      return null;
    }

    function Wrapper() {
      const [project, setProject] = React.useState<FontProject>(() => ({
        ...makeProject(),
        glyphs: {
          [0x8fbb]: {
            unicode: 0x8fbb,
            char: '辻',
            name: 'uni8FBB',
            advanceWidth: 1000,
            lsb: 50,
            contours: [
              {
                id: 'base-c1',
                closed: true,
                nodes: [
                  { id: 'b1', x: 100, y: 100, type: 'corner' },
                  { id: 'b2', x: 300, y: 100, type: 'corner' },
                  { id: 'b3', x: 300, y: 300, type: 'corner' },
                ],
              },
            ],
          },
        },
        ivsVariants: {
          '8FBB_E0101': {
            id: '8FBB_E0101',
            baseUnicode: 0x8fbb,
            selectorCode: 0xe0101,
            glyph: {
              unicode: 0x8fbb,
              char: '辻',
              name: 'uni8FBB.uE0101',
              advanceWidth: 1000,
              lsb: 50,
              contours: [],
            },
          },
        },
      }));
      const projectRef = React.useRef(project);
      projectRef.current = project;
      return (
        <ProjectProvider
          project={project}
          setProject={setProject}
          projectRef={projectRef}
          saveProjectToIndexedDbWhenIdle={async () => true}
          showToast={vi.fn()}
        >
          <Consumer />
        </ProjectProvider>
      );
    }

    act(() => {
      root.render(<Wrapper />);
    });

    // Switch to IVS variant and edit contours
    act(() => {
      ctx.handleSelectIvsVariant('8FBB_E0101');
    });
    expect(ctx.activeIvsKey).toBe('8FBB_E0101');
    expect(ctx.currentGlyph.contours).toHaveLength(0);

    act(() => {
      ctx.handleUpdateContours([
        {
          id: 'ivs-c1',
          closed: true,
          nodes: [
            { id: 'i1', x: 200, y: 200, type: 'corner' },
            { id: 'i2', x: 400, y: 200, type: 'corner' },
            { id: 'i3', x: 400, y: 400, type: 'corner' },
          ],
        },
      ]);
    });

    expect(ctx.project.ivsVariants?.['8FBB_E0101'].glyph.contours[0].id).toBe('ivs-c1');
    // Base glyph remained untouched
    expect(ctx.project.glyphs[0x8fbb].contours[0].id).toBe('base-c1');

    act(() => {
      ctx.handleUndo();
    });
    expect(ctx.currentGlyph.contours).toHaveLength(0);
    expect(ctx.project.glyphs[0x8fbb].contours[0].id).toBe('base-c1');

    act(() => {
      ctx.handleRedo();
    });
    expect(ctx.currentGlyph.contours[0].id).toBe('ivs-c1');

    // Return to base glyph and test commitBatchHistory
    act(() => {
      ctx.handleSelectGlyph(0x8fbb);
    });
    expect(ctx.activeIvsKey).toBeNull();

    act(() => {
      ctx.commitBatchHistory([0x8fbb]);
      ctx.setProject((prev) => ({
        ...prev,
        glyphs: {
          ...prev.glyphs,
          [0x8fbb]: {
            ...prev.glyphs[0x8fbb],
            advanceWidth: 900,
          },
        },
      }));
    });

    act(() => {
      ctx.handleUndo();
    });
    expect(ctx.project.glyphs[0x8fbb].advanceWidth).toBe(1000);

    act(() => {
      root.unmount();
    });
    container.remove();
  });
});
