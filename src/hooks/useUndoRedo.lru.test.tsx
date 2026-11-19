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
});
