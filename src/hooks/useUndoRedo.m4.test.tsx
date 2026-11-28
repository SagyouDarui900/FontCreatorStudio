// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { ProjectProvider, useProjectContext } from '../contexts/ProjectContext';
import { useUndoRedo, MAX_HISTORY_GLYPHS } from './useUndoRedo';
import { FontProject, GlyphData, PathContour } from '../types';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

function makeContours(x: number): PathContour[] {
  return [
    {
      id: 'c1',
      closed: true,
      nodes: [
        { id: 'n1', x, y: 100, type: 'corner' },
        { id: 'n2', x: x + 100, y: 100, type: 'corner' },
        { id: 'n3', x: x + 100, y: 200, type: 'corner' },
      ],
    },
  ];
}

function makeProject(): FontProject {
  const glyph: GlyphData = {
    unicode: 0x3042,
    char: 'あ',
    name: 'uni3042',
    advanceWidth: 1000,
    lsb: 50,
    contours: makeContours(100),
  };
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
    glyphs: { [0x3042]: glyph },
    createdAt: 1000,
    updatedAt: 1000,
  };
}

function mount(projectFactory: () => FontProject = makeProject) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  let ctx!: ReturnType<typeof useProjectContext>;
  function Consumer() {
    ctx = useProjectContext();
    return null;
  }
  function Wrapper() {
    const [project, setProject] = React.useState<FontProject>(() => projectFactory());
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
  return {
    get ctx() {
      return ctx;
    },
    unmount() {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

function setGlyphContours(ctx: ReturnType<typeof useProjectContext>, x: number) {
  act(() => {
    ctx.setProject((prev) => ({
      ...prev,
      glyphs: {
        ...prev.glyphs,
        [0x3042]: { ...prev.glyphs[0x3042], contours: makeContours(x) },
      },
      updatedAt: Date.now(),
    }));
  });
}

function setFamilyName(ctx: ReturnType<typeof useProjectContext>, familyName: string) {
  act(() => {
    ctx.setProject((prev) => ({
      ...prev,
      metadata: { ...prev.metadata, familyName },
      updatedAt: Date.now(),
    }));
  });
}

describe('useUndoRedo M4: most-recent-first Undo/Redo across glyph and project history', () => {
  it('undoes a newer FontInfo change before an older glyph edit, and redoes in reverse undo order', () => {
    const h = mount();
    try {
      // Glyph edit, then a FontInfo change.
      act(() => {
        h.ctx.commitHistory();
      });
      setGlyphContours(h.ctx, 200);
      act(() => {
        h.ctx.commitProjectHistory();
      });
      setFamilyName(h.ctx, 'Changed');
      expect(h.ctx.project.glyphs[0x3042].contours[0].nodes[0].x).toBe(200);
      expect(h.ctx.project.metadata.familyName).toBe('Changed');

      // First Ctrl+Z reverts the FontInfo change; the drawn glyph stays.
      act(() => {
        h.ctx.handleUndo();
      });
      expect(h.ctx.project.metadata.familyName).toBe('TestFont');
      expect(h.ctx.project.glyphs[0x3042].contours[0].nodes[0].x).toBe(200);

      // Second Ctrl+Z reverts the glyph edit.
      act(() => {
        h.ctx.handleUndo();
      });
      expect(h.ctx.project.glyphs[0x3042].contours[0].nodes[0].x).toBe(100);
      expect(h.ctx.canUndo).toBe(false);

      // Redo restores the most recently undone operation first (glyph),
      // then the FontInfo change.
      act(() => {
        h.ctx.handleRedo();
      });
      expect(h.ctx.project.glyphs[0x3042].contours[0].nodes[0].x).toBe(200);
      expect(h.ctx.project.metadata.familyName).toBe('TestFont');
      act(() => {
        h.ctx.handleRedo();
      });
      expect(h.ctx.project.metadata.familyName).toBe('Changed');
      expect(h.ctx.canRedo).toBe(false);
    } finally {
      h.unmount();
    }
  });

  it('undoes a newer glyph edit before an older FontInfo change, and redoes the FontInfo change first', () => {
    const h = mount();
    try {
      // FontInfo change first, then a glyph edit.
      act(() => {
        h.ctx.commitProjectHistory();
      });
      setFamilyName(h.ctx, 'Changed');
      act(() => {
        h.ctx.commitHistory();
      });
      setGlyphContours(h.ctx, 200);

      act(() => {
        h.ctx.handleUndo();
      });
      expect(h.ctx.project.glyphs[0x3042].contours[0].nodes[0].x).toBe(100);
      expect(h.ctx.project.metadata.familyName).toBe('Changed');
      act(() => {
        h.ctx.handleUndo();
      });
      expect(h.ctx.project.metadata.familyName).toBe('TestFont');
      expect(h.ctx.canUndo).toBe(false);

      // Undo order was glyph, then FontInfo, so Redo restores FontInfo
      // first, then the glyph edit.
      act(() => {
        h.ctx.handleRedo();
      });
      expect(h.ctx.project.metadata.familyName).toBe('Changed');
      expect(h.ctx.project.glyphs[0x3042].contours[0].nodes[0].x).toBe(100);
      act(() => {
        h.ctx.handleRedo();
      });
      expect(h.ctx.project.glyphs[0x3042].contours[0].nodes[0].x).toBe(200);
      expect(h.ctx.canRedo).toBe(false);
    } finally {
      h.unmount();
    }
  });

  it('redoes in reverse undo order when a glyph edit, a FontInfo change and another glyph edit interleave', () => {
    const h = mount();
    try {
      // Glyph edit 1, FontInfo change, glyph edit 2.
      act(() => {
        h.ctx.commitHistory();
      });
      setGlyphContours(h.ctx, 200);
      act(() => {
        h.ctx.commitProjectHistory();
      });
      setFamilyName(h.ctx, 'Changed');
      act(() => {
        h.ctx.commitHistory();
      });
      setGlyphContours(h.ctx, 300);

      // Undo: glyph edit 2, then the FontInfo change.
      act(() => {
        h.ctx.handleUndo();
      });
      expect(h.ctx.project.glyphs[0x3042].contours[0].nodes[0].x).toBe(200);
      expect(h.ctx.project.metadata.familyName).toBe('Changed');
      act(() => {
        h.ctx.handleUndo();
      });
      expect(h.ctx.project.metadata.familyName).toBe('TestFont');
      expect(h.ctx.project.glyphs[0x3042].contours[0].nodes[0].x).toBe(200);

      // Redo must restore the FontInfo change first (it was undone last),
      // even though the glyph edit 2 has the larger operation number.
      act(() => {
        h.ctx.handleRedo();
      });
      expect(h.ctx.project.metadata.familyName).toBe('Changed');
      expect(h.ctx.project.glyphs[0x3042].contours[0].nodes[0].x).toBe(200);
      act(() => {
        h.ctx.handleRedo();
      });
      expect(h.ctx.project.glyphs[0x3042].contours[0].nodes[0].x).toBe(300);
      expect(h.ctx.canRedo).toBe(false);
    } finally {
      h.unmount();
    }
  });
});

describe('useUndoRedo M4: project Undo while an IVS variant is being edited', () => {
  function makeIvsProject(): FontProject {
    return {
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
    };
  }

  function ivsContours(): PathContour[] {
    return [
      {
        id: 'ivs-c1',
        closed: true,
        nodes: [
          { id: 'i1', x: 200, y: 200, type: 'corner' },
          { id: 'i2', x: 400, y: 200, type: 'corner' },
          { id: 'i3', x: 400, y: 400, type: 'corner' },
        ],
      },
    ];
  }

  it('undoes a newer project change before an IVS edit, keeps IVS Undo, and redoes in reverse undo order', () => {
    const h = mount(makeIvsProject);
    try {
      act(() => {
        h.ctx.handleSelectGlyph(0x8fbb);
      });
      act(() => {
        h.ctx.handleSelectIvsVariant('8FBB_E0101');
      });
      expect(h.ctx.activeIvsKey).toBe('8FBB_E0101');
      act(() => {
        h.ctx.handleUpdateContours(ivsContours());
      });
      expect(h.ctx.project.ivsVariants?.['8FBB_E0101'].glyph.contours[0].id).toBe('ivs-c1');
      act(() => {
        h.ctx.commitProjectHistory();
      });
      setFamilyName(h.ctx, 'Changed');

      // First Ctrl+Z reverts the project change, not the IVS edit.
      act(() => {
        h.ctx.handleUndo();
      });
      expect(h.ctx.project.metadata.familyName).toBe('TestFont');
      expect(h.ctx.project.ivsVariants?.['8FBB_E0101'].glyph.contours[0].id).toBe('ivs-c1');

      // Second Ctrl+Z reverts the IVS edit; the base glyph is untouched.
      act(() => {
        h.ctx.handleUndo();
      });
      expect(h.ctx.currentGlyph.contours).toHaveLength(0);
      expect(h.ctx.project.glyphs[0x8fbb].contours[0].id).toBe('base-c1');
      expect(h.ctx.canUndo).toBe(false);

      // Redo restores the IVS edit first, then the project change.
      act(() => {
        h.ctx.handleRedo();
      });
      expect(h.ctx.currentGlyph.contours[0].id).toBe('ivs-c1');
      expect(h.ctx.project.metadata.familyName).toBe('TestFont');
      act(() => {
        h.ctx.handleRedo();
      });
      expect(h.ctx.project.metadata.familyName).toBe('Changed');
      expect(h.ctx.canRedo).toBe(false);
    } finally {
      h.unmount();
    }
  });

  it('undoes a project change while an IVS variant is active even when the IVS stack is empty', () => {
    const h = mount(makeIvsProject);
    try {
      act(() => {
        h.ctx.handleSelectGlyph(0x8fbb);
      });
      act(() => {
        h.ctx.handleSelectIvsVariant('8FBB_E0101');
      });
      expect(h.ctx.canUndo).toBe(false);
      act(() => {
        h.ctx.commitProjectHistory();
      });
      setFamilyName(h.ctx, 'Changed');
      expect(h.ctx.canUndo).toBe(true);
      act(() => {
        h.ctx.handleUndo();
      });
      expect(h.ctx.project.metadata.familyName).toBe('TestFont');
      expect(h.ctx.canUndo).toBe(false);
      act(() => {
        h.ctx.handleRedo();
      });
      expect(h.ctx.project.metadata.familyName).toBe('Changed');
    } finally {
      h.unmount();
    }
  });
});

describe('useUndoRedo M4: IVS history under the shared eviction budget', () => {
  function makeIvsGlyph(key: string, pixel: boolean): GlyphData {
    return {
      unicode: 0x8fbb,
      char: '辻',
      name: `uni8FBB.${key}`,
      advanceWidth: 1000,
      lsb: 50,
      contours: [],
      pixelData: pixel ? { width: 10, height: 10, data: new Array(100).fill(1) } : undefined,
    };
  }

  function mountHook(keys: string[], options: { maxHistoryBytes?: number; activeIvsKey?: string }) {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const ivsVariants: Record<string, { id: string; baseUnicode: number; selectorCode: number; glyph: GlyphData }> = {};
    for (const key of keys) {
      ivsVariants[key] = {
        id: key,
        baseUnicode: 0x8fbb,
        selectorCode: 0xe0101,
        glyph: makeIvsGlyph(key, options.maxHistoryBytes !== undefined),
      };
    }
    const projectRef = {
      current: {
        ...makeProject(),
        ivsVariants,
      },
    };
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
        activeIvsKey: options.activeIvsKey ?? null,
        setProject,
        maxHistoryBytes: options.maxHistoryBytes,
      });
      return null;
    }
    act(() => {
      root.render(<Harness />);
    });
    return {
      get api() {
        return api;
      },
      unmount() {
        act(() => {
          root.unmount();
        });
        container.remove();
      },
    };
  }

  it('evicts the oldest IVS stacks when the shared byte budget is exceeded and protects the active variant', () => {
    // Each pixel glyph snapshot is ~1184 bytes; three of them exceed 2600.
    const h = mountHook(['K1', 'K2', 'K3'], { maxHistoryBytes: 2600, activeIvsKey: 'K3' });
    try {
      act(() => {
        h.api.commitBatchHistory([], ['K1', 'K2', 'K3']);
      });
      expect(h.api.ivsUndoStacks['K1']).toBeUndefined();
      expect(h.api.ivsUndoStacks['K2']?.length).toBe(1);
      expect(h.api.ivsUndoStacks['K3']?.length).toBe(1);
    } finally {
      h.unmount();
    }
  });

  it('caps IVS history at MAX_HISTORY_GLYPHS keys, evicting the oldest first', () => {
    const keys = Array.from({ length: MAX_HISTORY_GLYPHS + 10 }, (_, i) => `K${i}`);
    const h = mountHook(keys, { activeIvsKey: `K${keys.length - 1}` });
    try {
      for (let start = 0; start < keys.length; start += 20) {
        const chunk = keys.slice(start, start + 20);
        act(() => {
          h.api.commitBatchHistory([], chunk);
        });
      }
      const kept = Object.keys(h.api.ivsUndoStacks);
      expect(kept.length).toBe(MAX_HISTORY_GLYPHS);
      for (let i = 0; i < 10; i++) {
        expect(h.api.ivsUndoStacks[`K${i}`]).toBeUndefined();
      }
      expect(h.api.ivsUndoStacks[`K${keys.length - 1}`]?.length).toBe(1);
    } finally {
      h.unmount();
    }
  });
});
