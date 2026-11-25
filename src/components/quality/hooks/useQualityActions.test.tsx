// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FontProject, GlyphData } from '../../../types';
import { useQualityState } from './useQualityState';
import { useQualityActions } from './useQualityActions';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

function makeGlyph(unicode: number, char: string): GlyphData {
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
          { id: 'n1', x: 100, y: 200, type: 'corner' },
          { id: 'n2', x: 600, y: 200, type: 'corner' },
          { id: 'n3', x: 600, y: 800, type: 'corner' },
          { id: 'n4', x: 100, y: 800, type: 'corner' },
        ],
      },
    ],
  };
}

function makeProject(glyphs: GlyphData[]): FontProject {
  const map: Record<number, GlyphData> = {};
  for (const g of glyphs) map[g.unicode] = g;
  return {
    id: 'quality-actions-test',
    name: 'QualityActionsTest',
    metadata: {
      familyName: 'QualityActionsTest',
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
    glyphs: map,
    kerning: {},
    createdAt: 1,
    updatedAt: 1,
  } as unknown as FontProject;
}

type ProbeHandle = ReturnType<typeof useQualityActions> & {
  report: ReturnType<typeof useQualityState>['report'];
  diagReport: ReturnType<typeof useQualityState>['diagReport'];
  isScanning: boolean;
  isDiagScanning: boolean;
};

let latest: ProbeHandle | null = null;

function Probe({ project, isOpen }: { project: FontProject; isOpen: boolean }) {
  const state = useQualityState(project, 'light');
  const actions = useQualityActions({
    project,
    setProject: () => {},
    onClose: () => {},
    state,
    isOpen,
  });
  latest = {
    ...actions,
    report: state.report,
    diagReport: state.diagReport,
    isScanning: state.isScanning,
    isDiagScanning: state.isDiagScanning,
  };
  return null;
}

describe('useQualityActions async scan generation (Q-M5)', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    latest = null;
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function renderProbe(project: FontProject, isOpen: boolean) {
    act(() => {
      root.render(<Probe project={project} isOpen={isOpen} />);
    });
    if (!latest) throw new Error('Probe did not render');
    return latest;
  }

  it('discards a stale scan when a newer scan starts before it finishes', () => {
    const projectA = makeProject([makeGlyph(0x3042, 'あ')]);
    const projectB = makeProject([
      makeGlyph(0x3042, 'あ'),
      makeGlyph(0x3044, 'い'),
      makeGlyph(0x3046, 'う'),
    ]);
    renderProbe(projectA, true);
    act(() => {
      latest!.runScan();
    });
    // 新しいプロジェクトで再検査を開始する。古いタイマーは破棄される。
    renderProbe(projectB, true);
    act(() => {
      latest!.runScan();
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(latest!.report).not.toBeNull();
    expect(latest!.report!.totalGlyphsChecked).toBe(3);
    expect(latest!.isScanning).toBe(false);
  });

  it('does not apply scan results after the modal is closed', () => {
    const project = makeProject([makeGlyph(0x3042, 'あ')]);
    renderProbe(project, true);
    act(() => {
      latest!.runScan();
      latest!.runDiagnostics();
    });
    // 完了前にモーダルを閉じる。
    renderProbe(project, false);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(latest!.report).toBeNull();
    expect(latest!.diagReport).toBeNull();
    expect(latest!.isScanning).toBe(false);
    expect(latest!.isDiagScanning).toBe(false);
  });

  it('applies scan results normally while the modal stays open', () => {
    const project = makeProject([
      makeGlyph(0x3042, 'あ'),
      makeGlyph(0x3044, 'い'),
    ]);
    renderProbe(project, true);
    act(() => {
      latest!.runScan();
      latest!.runDiagnostics();
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(latest!.report).not.toBeNull();
    expect(latest!.report!.totalGlyphsChecked).toBe(2);
    expect(latest!.diagReport).not.toBeNull();
    expect(latest!.isScanning).toBe(false);
    expect(latest!.isDiagScanning).toBe(false);
  });
});
