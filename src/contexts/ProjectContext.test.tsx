// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ProjectProvider, useProjectContext } from './ProjectContext';
import { FontProject, GlyphData } from '../types';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const exportGlyphJsonFileMock = vi.hoisted(() =>
  vi.fn(() => ({ success: true, filename: 'TestFont_あ_U+3042.glyph.json', sizeBytes: 10 }))
);

vi.mock('../utils/storageManager', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/storageManager')>();
  return {
    ...actual,
    exportGlyphJsonFile: exportGlyphJsonFileMock,
  };
});

function makeGlyph(unicode: number, char: string): GlyphData {
  return {
    unicode,
    char,
    name: `uni${unicode.toString(16).toUpperCase().padStart(4, '0')}`,
    advanceWidth: 1000,
    lsb: 50,
    contours: [],
  };
}

function makeProject(): FontProject {
  return {
    id: 'proj-1',
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
    glyphs: { [0x3042]: makeGlyph(0x3042, 'あ') },
    createdAt: 1000,
    updatedAt: 1000,
  };
}

function mount(saveToIndexedDb: () => Promise<boolean>) {
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
    const [project, setProject] = React.useState<FontProject>(makeProject());
    const projectRef = React.useRef(project);
    projectRef.current = project;
    return (
      <ProjectProvider
        project={project}
        setProject={setProject}
        projectRef={projectRef}
        saveProjectToIndexedDbWhenIdle={saveToIndexedDb}
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

describe('quick save no longer downloads a glyph JSON (M2)', () => {
  beforeEach(() => {
    exportGlyphJsonFileMock.mockClear();
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it('Ctrl+S handler saves to the browser and does not download a JSON file', async () => {
    const saveToIndexedDb = vi.fn(async () => true);
    const h = mount(saveToIndexedDb);
    try {
      await act(async () => {
        h.ctx.handleQuickSaveCurrentGlyph();
        await vi.waitFor(() => {
          expect(h.toasts.length).toBe(1);
        });
      });

      expect(exportGlyphJsonFileMock).not.toHaveBeenCalled();
      expect(saveToIndexedDb).toHaveBeenCalledTimes(1);
      const stored = window.localStorage.getItem('font_editor_project_data_v2');
      expect(stored).not.toBeNull();
      expect(JSON.parse(stored as string).id).toBe('proj-1');
      expect(h.toasts[0]).toContain('ブラウザに即時永続化しました');
    } finally {
      h.unmount();
    }
  });

  it('quick save reports a failure when neither browser destination works', async () => {
    const saveToIndexedDb = vi.fn(async () => false);
    const h = mount(saveToIndexedDb);
    // Spy on the prototype: jsdom's localStorage.setItem does not go
    // through a spy installed on the instance.
    const setItemSpy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('quota');
      });
    try {
      await act(async () => {
        h.ctx.handleQuickSaveCurrentGlyph();
        await vi.waitFor(() => {
          expect(h.toasts.length).toBe(1);
        });
      });

      expect(exportGlyphJsonFileMock).not.toHaveBeenCalled();
      expect(h.toasts[0]).toContain('保存できませんでした');
    } finally {
      setItemSpy.mockRestore();
      h.unmount();
    }
  });

  it('the separate glyph JSON export still downloads the file', () => {
    const h = mount(async () => true);
    try {
      act(() => {
        h.ctx.handleExportCurrentGlyphJson();
      });

      expect(exportGlyphJsonFileMock).toHaveBeenCalledTimes(1);
      const args = exportGlyphJsonFileMock.mock.calls[0] as unknown as [unknown, number, string];
      expect(args[1]).toBe(0x3042);
      expect(args[2]).toBe('あ');
      expect(h.toasts[0]).toContain('ダウンロードしました');
      expect(h.toasts[0]).toContain('TestFont_あ_U+3042.glyph.json');
    } finally {
      h.unmount();
    }
  });

  it('the separate glyph JSON export reports a download failure', () => {
    exportGlyphJsonFileMock.mockReturnValueOnce({ success: false, filename: '', sizeBytes: 0 });
    const h = mount(async () => true);
    try {
      act(() => {
        h.ctx.handleExportCurrentGlyphJson();
      });

      expect(exportGlyphJsonFileMock).toHaveBeenCalledTimes(1);
      expect(h.toasts[0]).toContain('ダウンロードに失敗しました');
    } finally {
      h.unmount();
    }
  });
});
