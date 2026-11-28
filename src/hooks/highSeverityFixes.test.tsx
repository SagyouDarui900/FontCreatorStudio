// @vitest-environment jsdom
import React, { StrictMode } from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { useToolState } from './useToolState';
import { useProjectStorage, LOCAL_STORAGE_KEY } from './useProjectStorage';
import { BatchNormalizeModal } from '../components/BatchNormalizeModal';
import { ModalProvider } from '../contexts/ModalContext';
import { STORAGE_KEYS } from '../utils/storageKeys';
import { saveStickyBrushConfig, loadStickyBrushConfigs, DEFAULT_PEN_PRESETS } from '../utils/presetData';
import * as storageManager from '../utils/storageManager';
import { FontProject, GlyphData, PathContour } from '../types';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

function makeContour(id: string, x: number, y = 100, size = 100): PathContour {
  return {
    id,
    closed: true,
    nodes: [
      { id: `${id}-n1`, x, y, type: 'corner' },
      { id: `${id}-n2`, x: x + size, y, type: 'corner' },
      { id: `${id}-n3`, x: x + size, y: y + size, type: 'corner' },
      { id: `${id}-n4`, x, y: y + size, type: 'corner' },
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
    contours: [makeContour(`c-${unicode}`, 100)],
    ...overrides,
  };
}

function makeProject(id: string, glyphs: Record<number, GlyphData>, unitsPerEm = 1000): FontProject {
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
      unitsPerEm,
      ascender: Math.round(unitsPerEm * 0.8),
      descender: Math.round(unitsPerEm * -0.2),
      lineGap: 0,
      capHeight: Math.round(unitsPerEm * 0.7),
      xHeight: Math.round(unitsPerEm * 0.5),
    },
    glyphs,
    createdAt: 1000,
    updatedAt: 1000,
  };
}

describe('High-severity fixes verification', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('Fix #1: useToolState hydrates sticky config for persisted brushStyle, persists active preset selection, and adjusts size cleanly under StrictMode', () => {
    localStorage.setItem(STORAGE_KEYS.BRUSH_STYLE.primary, 'fountain');
    localStorage.setItem(STORAGE_KEYS.ACTIVE_PEN_PRESET_ID.primary, '');
    saveStickyBrushConfig('brush', { brushWidth: 44, smoothingIntensity: 50 });
    saveStickyBrushConfig('fountain', {
      brushWidth: 22,
      pressureSensitivity: 'low',
      smoothingIntensity: 35,
    });

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    let api!: ReturnType<typeof useToolState>;
    function Harness() {
      api = useToolState();
      return null;
    }

    act(() => {
      root.render(
        <StrictMode>
          <Harness />
        </StrictMode>
      );
    });

    expect(api.brushStyle).toBe('fountain');
    expect(api.brushWidth).toBe(22);
    expect(api.pressureSensitivity).toBe('low');
    expect(api.smoothingIntensity).toBe(35);
    expect(api.activePenPreset).toBeUndefined();

    // Adjusting size under StrictMode updates both state and sticky storage without double-incrementing
    act(() => {
      api.handleAdjustBrushSize(4);
    });
    expect(api.brushWidth).toBe(26);
    expect(loadStickyBrushConfigs().fountain?.brushWidth).toBe(26);

    // Selecting a preset persists its id so reload restores it
    const preset = DEFAULT_PEN_PRESETS.find((p) => p.brushStyle === 'sumi')!;
    act(() => {
      api.handleApplyPenPreset(preset);
    });
    expect(localStorage.getItem(STORAGE_KEYS.ACTIVE_PEN_PRESET_ID.primary)).toBe(preset.id);

    act(() => {
      root.unmount();
    });

    const container2 = document.createElement('div');
    document.body.appendChild(container2);
    const root2 = createRoot(container2);
    act(() => {
      root2.render(<Harness />);
    });
    expect(api.activePenPreset?.id).toBe(preset.id);

    act(() => {
      root2.unmount();
    });
    container.remove();
    container2.remove();
  });

  it('Fix #4: BatchNormalizeModal commits batch undo history, skips locked glyphs, and scales presets/centers by unitsPerEm', () => {
    const unlockedGlyph = makeGlyph(0x3042, 'あ', {
      contours: [makeContour('c-a', 100, 100, 400)],
      advanceWidth: 2048,
    });
    const lockedGlyph = makeGlyph(0x3044, 'い', {
      contours: [makeContour('c-i', 200, 200, 300)],
      advanceWidth: 2048,
      locked: true,
    });

    const initialProject = makeProject(
      'proj-2048',
      {
        [0x3042]: unlockedGlyph,
        [0x3044]: lockedGlyph,
      },
      2048
    );

    const commitBatchHistorySpy = vi.fn();
    const toasts: string[] = [];
    const onCloseSpy = vi.fn();
    let currentProject = initialProject;

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    function Harness() {
      const [project, setProject] = React.useState(initialProject);
      currentProject = project;
      return (
        <ModalProvider>
          <BatchNormalizeModal
            isOpen={true}
            onClose={onCloseSpy}
            project={project}
            setProject={setProject}
            selectedUnicode={0x3042}
            commitBatchHistory={commitBatchHistorySpy}
            theme="dark"
            onShowToast={(msg) => toasts.push(msg)}
          />
        </ModalProvider>
      );
    }

    act(() => {
      root.render(<Harness />);
    });

    // Shows UPM 2048 label and disables locked exclusion count clearly
    expect(container.textContent).toContain('UPM: 2048基準');
    const applyBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('一括適用')
    );
    expect(applyBtn).toBeTruthy();

    act(() => {
      applyBtn!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(commitBatchHistorySpy).toHaveBeenCalledTimes(1);
    expect(commitBatchHistorySpy).toHaveBeenCalledWith([0x3042]);

    // Locked glyph must stay untouched
    expect(currentProject.glyphs[0x3044]).toEqual(lockedGlyph);
    // Unlocked glyph must be centered around halfUpm (1024) rather than 500
    const normalizedA = currentProject.glyphs[0x3042];
    expect(normalizedA.advanceWidth).toBe(2048);
    const xs = normalizedA.contours[0].nodes.map((n) => n.x);
    const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
    expect(Math.abs(centerX - 1024)).toBeLessThanOrEqual(1);
    expect(toasts.some((t) => t.includes('ロック中の1文字をスキップ'))).toBe(true);
    expect(onCloseSpy).toHaveBeenCalledTimes(1);

    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('Fix #5: useProjectStorage preserves newer queued saves when an older write fails and saves on pagehide', async () => {
    const p0 = makeProject('proj-storage', { [0x3042]: makeGlyph(0x3042, 'あ') });
    p0.updatedAt = 5000;

    vi.spyOn(storageManager, 'loadProjectFromIndexedDB').mockResolvedValue({
      status: 'ok',
      project: p0,
      updatedAt: p0.updatedAt,
    });

    let resolveFirstSave!: (ok: boolean) => void;
    const firstSavePromise = new Promise<boolean>((resolve) => {
      resolveFirstSave = resolve;
    });
    const saveCalls: string[] = [];
    const saveSpy = vi
      .spyOn(storageManager, 'saveProjectToIndexedDB')
      .mockImplementation((proj) => {
        saveCalls.push(proj.name);
        if (proj.name === 'P1-stale') {
          return firstSavePromise;
        }
        return Promise.resolve(true);
      });

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    let storageApi!: ReturnType<typeof useProjectStorage>;
    function Harness() {
      storageApi = useProjectStorage({ onShowToast: vi.fn() });
      return null;
    }

    await act(async () => {
      root.render(<Harness />);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(storageApi.isStorageLoading).toBe(false);

    const p1: FontProject = { ...p0, name: 'P1-stale', updatedAt: 5001 };
    const p2: FontProject = { ...p0, name: 'P2-latest', updatedAt: 5001 };

    let p1ResultPromise!: Promise<boolean>;
    let p2ResultPromise!: Promise<boolean>;
    await act(async () => {
      p1ResultPromise = storageApi.saveProjectToIndexedDbWhenIdle(p1);
      await Promise.resolve();
      await Promise.resolve();
      expect(saveCalls).toEqual(['P1-stale']);
      p2ResultPromise = storageApi.saveProjectToIndexedDbWhenIdle(p2);
    });

    // Fail P1 while P2 is already queued
    await act(async () => {
      resolveFirstSave(false);
      await p1ResultPromise;
      await p2ResultPromise;
    });

    expect(saveCalls).toEqual(['P1-stale', 'P2-latest']);
    await expect(p1ResultPromise).resolves.toBe(false);
    await expect(p2ResultPromise).resolves.toBe(true);

    // Same-ms edit + pagehide persists latest projectRef snapshot
    const p3: FontProject = { ...p2, name: 'P3-pagehide', updatedAt: 5001 };
    act(() => {
      storageApi.setProject(p3);
    });

    await act(async () => {
      window.dispatchEvent(new Event('pagehide'));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(saveSpy).toHaveBeenCalledWith(expect.objectContaining({ name: 'P3-pagehide' }));
    expect(localStorage.getItem(LOCAL_STORAGE_KEY)).toContain('P3-pagehide');

    act(() => {
      root.unmount();
    });
    container.remove();
  });
});
