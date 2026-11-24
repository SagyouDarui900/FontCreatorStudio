// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { ProjectProvider, useProjectContext } from '../contexts/ProjectContext';
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

function mount() {
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

describe('useUndoRedo round 2 (review M11, H5 project history)', () => {
  it('discardLastHistoryEntry removes a phantom entry matching the restored contours', () => {
    const h = mount();
    try {
      const original = makeContours(100);
      const dragged = makeContours(150);
      // A transform drag committed the pre-drag glyph, applied the drag,
      // then cancelled and restored the pre-drag contours.
      act(() => {
        h.ctx.commitHistory();
      });
      act(() => {
        h.ctx.setProject((prev) => ({
          ...prev,
          glyphs: {
            ...prev.glyphs,
            [0x3042]: { ...prev.glyphs[0x3042], contours: dragged },
          },
          updatedAt: Date.now(),
        }));
      });
      act(() => {
        h.ctx.setProject((prev) => ({
          ...prev,
          glyphs: {
            ...prev.glyphs,
            [0x3042]: { ...prev.glyphs[0x3042], contours: original },
          },
          updatedAt: Date.now(),
        }));
      });
      expect(h.ctx.canUndo).toBe(true);
      let removed = false;
      act(() => {
        removed = h.ctx.discardLastHistoryEntry(original);
      });
      expect(removed).toBe(true);
      expect(h.ctx.canUndo).toBe(false);
    } finally {
      h.unmount();
    }
  });

  it('discardLastHistoryEntry keeps the entry when the contours do not match', () => {
    const h = mount();
    try {
      act(() => {
        h.ctx.commitHistory();
      });
      let removed = true;
      act(() => {
        removed = h.ctx.discardLastHistoryEntry(makeContours(999));
      });
      expect(removed).toBe(false);
      expect(h.ctx.canUndo).toBe(true);
    } finally {
      h.unmount();
    }
  });

  it('undoes a project-level metadata change when the glyph stack is empty', () => {
    const h = mount();
    try {
      expect(h.ctx.canUndo).toBe(false);
      act(() => {
        h.ctx.commitProjectHistory();
      });
      act(() => {
        h.ctx.setProject((prev) => ({
          ...prev,
          metadata: { ...prev.metadata, familyName: 'Changed' },
          updatedAt: Date.now(),
        }));
      });
      expect(h.ctx.project.metadata.familyName).toBe('Changed');
      expect(h.ctx.canUndo).toBe(true);
      act(() => {
        h.ctx.handleUndo();
      });
      expect(h.ctx.project.metadata.familyName).toBe('TestFont');
      act(() => {
        h.ctx.handleRedo();
      });
      expect(h.ctx.project.metadata.familyName).toBe('Changed');
    } finally {
      h.unmount();
    }
  });

  it('does not push duplicate project history for an unchanged config', () => {
    const h = mount();
    try {
      act(() => {
        h.ctx.commitProjectHistory();
        h.ctx.commitProjectHistory();
      });
      // One undo restores the same config, a second undo is a no-op.
      act(() => {
        h.ctx.handleUndo();
      });
      expect(h.ctx.project.metadata.familyName).toBe('TestFont');
      expect(h.ctx.canUndo).toBe(false);
    } finally {
      h.unmount();
    }
  });
});
