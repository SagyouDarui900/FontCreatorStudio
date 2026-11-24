// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { useProjectFileIO } from './useProjectFileIO';
import { createLocalSnapshot, exportProjectJsonFile } from '../../utils/storageManager';
import { FontProject } from '../../types';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../../utils/storageManager', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../utils/storageManager')>();
  return {
    ...actual,
    exportProjectJsonFile: vi.fn(),
    createLocalSnapshot: vi.fn(),
  };
});

const mockedExportProjectJsonFile = vi.mocked(exportProjectJsonFile);
const mockedCreateLocalSnapshot = vi.mocked(createLocalSnapshot);

function makeProject(): FontProject {
  return {
    id: 'proj-io-test',
    name: 'IOTest',
    metadata: {
      familyName: 'IOTest',
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
    glyphs: {
      0x3042: {
        unicode: 0x3042,
        char: 'あ',
        name: 'uni3042',
        advanceWidth: 1000,
        lsb: 200,
        contours: [],
      },
    },
    createdAt: 1000,
    updatedAt: 1000,
  };
}

function renderHook(project: FontProject) {
  let currentProj = project;
  const setProject = vi.fn((updater: React.SetStateAction<FontProject>) => {
    currentProj = typeof updater === 'function' ? updater(currentProj) : updater;
  });
  const onShowToast = vi.fn();
  const onProjectReplaced = vi.fn();
  let api!: ReturnType<typeof useProjectFileIO>;

  function Harness() {
    api = useProjectFileIO({
      project: currentProj,
      setProject,
      onProjectReplaced,
      onShowToast,
    });
    return null;
  }

  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(<Harness />);
  });
  return {
    get api() {
      return api;
    },
    get currentProj() {
      return currentProj;
    },
    setProject,
    onShowToast,
    onProjectReplaced,
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe('useProjectFileIO backup-and-reset', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedExportProjectJsonFile.mockReturnValue({
      success: true,
      filename: '2026-11-24-IOTest.fontproj.json',
      sizeBytes: 10,
    });
    mockedCreateLocalSnapshot.mockReturnValue({ success: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('handleSaveProjectJson returns true on success and false when the export fails', () => {
    const h = renderHook(makeProject());

    let ok: boolean;
    act(() => {
      ok = h.api.handleSaveProjectJson();
    });
    expect(ok!).toBe(true);
    expect(h.onShowToast).toHaveBeenCalledWith(expect.stringContaining('保存しました'), 'success');

    mockedExportProjectJsonFile.mockReturnValue({ success: false, filename: '', sizeBytes: 0 });
    act(() => {
      ok = h.api.handleSaveProjectJson();
    });
    expect(ok!).toBe(false);
    expect(h.onShowToast).toHaveBeenCalledWith('プロジェクトの保存に失敗しました', 'error');
    h.unmount();
  });

  it('handleSaveProjectJson returns false when the export throws', () => {
    const h = renderHook(makeProject());
    mockedExportProjectJsonFile.mockImplementation(() => {
      throw new Error('disk full');
    });

    let ok: boolean;
    act(() => {
      ok = h.api.handleSaveProjectJson();
    });
    expect(ok!).toBe(false);
    expect(h.onShowToast).toHaveBeenCalledWith('プロジェクトの保存に失敗しました', 'error');
    h.unmount();
  });

  it('handleBackupAndResetProject aborts the reset when the JSON backup fails', () => {
    const h = renderHook(makeProject());
    mockedExportProjectJsonFile.mockReturnValue({ success: false, filename: '', sizeBytes: 0 });

    let ok: boolean;
    act(() => {
      ok = h.api.handleBackupAndResetProject('新しいフォント');
    });
    expect(ok!).toBe(false);
    // No snapshot attempt and, above all, no reset of the current project.
    expect(mockedCreateLocalSnapshot).not.toHaveBeenCalled();
    expect(h.setProject).not.toHaveBeenCalled();
    expect(h.onProjectReplaced).not.toHaveBeenCalled();
    expect(h.currentProj.id).toBe('proj-io-test');
    h.unmount();
  });

  it('handleBackupAndResetProject aborts the reset when the pre-reset snapshot fails', () => {
    const h = renderHook(makeProject());
    mockedCreateLocalSnapshot.mockReturnValue({
      success: false,
      error: 'スナップショットの作成に失敗しました。',
    });

    let ok: boolean;
    act(() => {
      ok = h.api.handleBackupAndResetProject('新しいフォント');
    });
    expect(ok!).toBe(false);
    expect(mockedExportProjectJsonFile).toHaveBeenCalledTimes(1);
    expect(h.setProject).not.toHaveBeenCalled();
    expect(h.onProjectReplaced).not.toHaveBeenCalled();
    expect(h.currentProj.id).toBe('proj-io-test');
    h.unmount();
  });

  it('handleBackupAndResetProject snapshots the current project, then resets with the given name', () => {
    const project = makeProject();
    const h = renderHook(project);

    let ok: boolean;
    act(() => {
      ok = h.api.handleBackupAndResetProject('新しいフォント');
    });
    expect(ok!).toBe(true);
    expect(mockedCreateLocalSnapshot).toHaveBeenCalledWith(
      project,
      'manual',
      expect.stringContaining('新規リセット前のバックアップ')
    );
    // Snapshot happens before the reset replaces the project.
    expect(
      mockedCreateLocalSnapshot.mock.invocationCallOrder[0]
    ).toBeLessThan(h.setProject.mock.invocationCallOrder[0]);
    expect(h.setProject).toHaveBeenCalledTimes(1);
    expect(h.onProjectReplaced).toHaveBeenCalledTimes(1);
    expect(h.currentProj.name).toBe('新しいフォント');
    expect(h.currentProj.metadata.familyName).toBe('新しいフォント');
    expect(h.currentProj.id).not.toBe('proj-io-test');
    h.unmount();
  });
});
