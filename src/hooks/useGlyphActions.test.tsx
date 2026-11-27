// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
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

function makeProject(id: string, glyphs: Record<number, GlyphData>): FontProject {
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
      unitsPerEm: 1000,
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

describe('glyph copy & paste (review H4, M16, M17, M18)', () => {
  it('regenerates contour and node ids on glyph paste and carries metrics and pixel data', () => {
    const source = makeGlyph(0x3042, 'あ', {
      advanceWidth: 800,
      lsb: 60,
      contours: [makeContour('c1', 100)],
      pixelData: { width: 2, height: 2, data: [1, 0, 0, 0], shape: 'square' },
    });
    const h = mount(makeProject('proj-1', { [0x3042]: source }));
    try {
      act(() => {
        h.ctx.handleCopyGlyph(0x3042);
      });
      act(() => {
        h.ctx.handlePasteGlyph(0x3044);
      });
      const pasted = h.ctx.project.glyphs[0x3044];
      expect(pasted).toBeDefined();
      expect(pasted.contours.length).toBe(1);
      expect(pasted.contours[0].id).not.toBe('c1');
      expect(pasted.contours[0].nodes.map((n) => n.id)).not.toContain('c1-n1');
      expect(pasted.contours[0].nodes[0].x).toBe(100);
      expect(pasted.advanceWidth).toBe(800);
      expect(pasted.lsb).toBe(60);
      expect(pasted.pixelData).toEqual({ width: 2, height: 2, data: [1, 0, 0, 0], shape: 'square' });
      expect(pasted.pixelData).not.toBe(source.pixelData);

      // Pasting the same copy again regenerates ids a second time.
      const firstIds = [pasted.contours[0].id, ...pasted.contours[0].nodes.map((n) => n.id)];
      act(() => {
        h.ctx.handlePasteGlyph(0x3044);
      });
      const repasted = h.ctx.project.glyphs[0x3044];
      const secondIds = [repasted.contours[0].id, ...repasted.contours[0].nodes.map((n) => n.id)];
      expect(secondIds).not.toEqual(firstIds);
    } finally {
      h.unmount();
    }
  });

  it('uses UPM-based defaults for a new glyph instead of fixed 1000/50', () => {
    const source = makeGlyph(0x3042, 'あ', {
      contours: [makeContour('c1', 100)],
    });
    const project = makeProject('proj-1', { [0x3042]: source });
    project.metadata.unitsPerEm = 2048;
    const h = mount(project);
    try {
      act(() => {
        h.ctx.handleCopySelectedContours(['c1']);
      });
      act(() => {
        h.ctx.handlePasteGlyph(0x3046);
      });
      const pasted = h.ctx.project.glyphs[0x3046];
      expect(pasted).toBeDefined();
      expect(pasted.contours.length).toBe(1);
      // UPM 2048 defaults: advanceWidth 2048, lsb 50 * 2048 / 1000 = 102.
      expect(pasted.advanceWidth).toBe(2048);
      expect(pasted.lsb).toBe(102);
    } finally {
      h.unmount();
    }
  });

  it('copies a pixel-only glyph, and a selected-contours copy appends instead of replacing', () => {
    const pixelOnly = makeGlyph(0x3042, 'あ', {
      contours: [],
      pixelData: { width: 2, height: 2, data: [0, 1, 0, 0], shape: 'square' },
    });
    const target = makeGlyph(0x3046, 'う', { contours: [makeContour('cU', 300)] });
    const h = mount(makeProject('proj-1', { [0x3042]: pixelOnly, [0x3046]: target }));
    try {
      act(() => {
        h.ctx.handleCopyGlyph(0x3042);
      });
      expect(h.toasts.some((t) => t.includes('ピクセルデータ'))).toBe(true);
      act(() => {
        h.ctx.handlePasteGlyph(0x3048);
      });
      const pixelPasted = h.ctx.project.glyphs[0x3048];
      expect(pixelPasted.pixelData).toEqual({ width: 2, height: 2, data: [0, 1, 0, 0], shape: 'square' });
      expect(pixelPasted.contours).toEqual([]);

      // Contour copy: paste appends to the target glyph, keeping its contour.
      act(() => {
        h.ctx.handleSelectGlyph(0x3046);
      });
      act(() => {
        h.ctx.handleCopySelectedContours(['cU']);
      });
      act(() => {
        h.ctx.handlePasteGlyph(0x3046);
      });
      const appended = h.ctx.project.glyphs[0x3046];
      expect(appended.contours.length).toBe(2);
      expect(appended.contours[0].id).toBe('cU');
      expect(appended.contours[1].id).not.toBe('cU');
      expect(appended.advanceWidth).toBe(1000);
    } finally {
      h.unmount();
    }
  });

  it('clears the clipboard when the project is replaced and refuses cross-project paste', () => {
    const source = makeGlyph(0x3042, 'あ', { contours: [makeContour('c1', 100)] });
    const h = mount(makeProject('proj-1', { [0x3042]: source }));
    try {
      act(() => {
        h.ctx.handleCopyGlyph(0x3042);
      });
      expect(h.ctx.clipboardContours).not.toBeNull();
      act(() => {
        h.ctx.setProject((prev) => ({ ...prev, id: 'proj-2' }));
      });
      expect(h.ctx.clipboardContours).toBeNull();
    } finally {
      h.unmount();
    }
  });

  it('creates only a single undo history entry when pasting contours onto the active glyph', () => {
    const target = makeGlyph(0x3046, 'う', { contours: [makeContour('cU', 300)] });
    const h = mount(makeProject('proj-1', { [0x3046]: target }));
    try {
      act(() => {
        h.ctx.handleSelectGlyph(0x3046);
      });
      act(() => {
        h.ctx.handleCopySelectedContours(['cU']);
      });
      act(() => {
        h.ctx.handlePasteGlyph(0x3046);
      });
      expect(h.ctx.project.glyphs[0x3046].contours.length).toBe(2);
      expect(h.ctx.undoStack.length).toBe(1);

      act(() => {
        h.ctx.handleUndo();
      });
      expect(h.ctx.project.glyphs[0x3046].contours.length).toBe(1);
      expect(h.ctx.undoStack.length).toBe(0);
    } finally {
      h.unmount();
    }
  });
});

describe('glyph path optimization (grid context menu)', () => {
  // Closed square with a redundant node in the middle of the top edge:
  // (50, 100) lies exactly on the straight line from (0, 100) to (100, 100).
  function makeCollinearContour(): PathContour {
    return {
      id: 'c-opt',
      closed: true,
      nodes: [
        { id: 'c-opt-n1', x: 0, y: 100, type: 'corner' },
        { id: 'c-opt-n2', x: 50, y: 100, type: 'corner' },
        { id: 'c-opt-n3', x: 100, y: 100, type: 'corner' },
        { id: 'c-opt-n4', x: 100, y: 200, type: 'corner' },
        { id: 'c-opt-n5', x: 0, y: 200, type: 'corner' },
      ],
    };
  }

  it('removes the redundant node, marks the glyph modified, and records one undo entry', () => {
    const glyph = makeGlyph(0x3042, 'あ', { contours: [makeCollinearContour()] });
    const h = mount(makeProject('proj-1', { [0x3042]: glyph }));
    try {
      act(() => {
        h.ctx.handleOptimizeGlyph(0x3042);
      });
      const optimized = h.ctx.project.glyphs[0x3042];
      expect(optimized.contours[0].nodes.length).toBe(4);
      expect(optimized.contours[0].nodes.map((n) => n.x)).toEqual([0, 100, 100, 0]);
      expect(optimized.modified).toBe(true);
      expect(h.toasts).toContain(
        '文字「あ」のパスを最適化しました（5頂点 → 4頂点） (Ctrl+Zで復元可能)'
      );
      expect(h.ctx.undoStack.length).toBe(1);

      act(() => {
        h.ctx.handleUndo();
      });
      expect(h.ctx.project.glyphs[0x3042].contours[0].nodes.length).toBe(5);
    } finally {
      h.unmount();
    }
  });

  it('changes nothing and reports no reducible nodes when the contours are already optimal', () => {
    const glyph = makeGlyph(0x3042, 'あ', { contours: [makeContour('c1', 100)] });
    const h = mount(makeProject('proj-1', { [0x3042]: glyph }));
    try {
      act(() => {
        h.ctx.handleOptimizeGlyph(0x3042);
      });
      const kept = h.ctx.project.glyphs[0x3042];
      expect(kept.contours[0].nodes.length).toBe(3);
      expect(kept.modified).not.toBe(true);
      expect(h.toasts).toContain('文字「あ」のパスに削減できる頂点はありませんでした');
      expect(h.ctx.undoStack.length).toBe(0);
    } finally {
      h.unmount();
    }
  });

  it('does not change a locked glyph', () => {
    const glyph = makeGlyph(0x3042, 'あ', {
      contours: [makeCollinearContour()],
      locked: true,
    });
    const h = mount(makeProject('proj-1', { [0x3042]: glyph }));
    try {
      act(() => {
        h.ctx.handleOptimizeGlyph(0x3042);
      });
      expect(h.ctx.project.glyphs[0x3042].contours[0].nodes.length).toBe(5);
      expect(h.toasts).toContain('この文字は編集ロックされています');
      expect(h.ctx.undoStack.length).toBe(0);
    } finally {
      h.unmount();
    }
  });

  it('does nothing for a glyph without contours', () => {
    const glyph = makeGlyph(0x3042, 'あ', { contours: [] });
    const h = mount(makeProject('proj-1', { [0x3042]: glyph }));
    try {
      act(() => {
        h.ctx.handleOptimizeGlyph(0x3042);
      });
      expect(h.ctx.project.glyphs[0x3042].contours).toEqual([]);
      expect(h.toasts.length).toBe(0);
      expect(h.ctx.undoStack.length).toBe(0);
    } finally {
      h.unmount();
    }
  });

  it('does nothing for a missing glyph', () => {
    const glyph = makeGlyph(0x3042, 'あ', { contours: [makeCollinearContour()] });
    const h = mount(makeProject('proj-1', { [0x3042]: glyph }));
    try {
      act(() => {
        h.ctx.handleOptimizeGlyph(0x9999);
      });
      expect(h.ctx.project.glyphs[0x3042].contours[0].nodes.length).toBe(5);
      expect(h.toasts.length).toBe(0);
    } finally {
      h.unmount();
    }
  });
});
