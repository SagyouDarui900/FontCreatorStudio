// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TraceSettingsModal } from '../TraceSettingsModal';
import { SvgVectorizerModal } from '../SvgVectorizerModal';
import { GlyphSynthesisModal } from '../GlyphSynthesisModal';
import { PenPresetsModal } from '../penpresets/PenPresetsModal';
import { PixelFontStudioModal } from '../pixelfont/PixelFontStudioModal';
import { RadicalStudioModal } from '../RadicalStudioModal';
import { BatchRadicalModal } from '../radicalStudio/BatchRadicalModal';
import { FontProject, TraceSettings } from '../../types';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

function createSampleProject(): FontProject {
  return {
    id: 'test-proj',
    name: 'TestFont',
    metadata: {
      familyName: 'TestFont',
      styleName: 'Regular',
      designer: 'Tester',
      copyright: 'Copyright (c) 2026 Tester',
      license: 'SIL Open Font License 1.1',
      licenseUrl: 'https://openfontlicense.org/',
      version: '1.000',
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
        lsb: 50,
        contours: [
          {
            id: 'c1',
            closed: true,
            nodes: [
              { id: 'p1', x: 200, y: 200, type: 'corner' },
              { id: 'p2', x: 800, y: 200, type: 'corner' },
              { id: 'p3', x: 800, y: 800, type: 'corner' },
              { id: 'p4', x: 200, y: 800, type: 'corner' },
            ],
          },
        ],
      },
    },
    kerning: {},
    createdAt: 1000,
    updatedAt: 1000,
  };
}

function renderWithRoot(element: React.ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(element);
  });
  return {
    container,
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe('UI unification assigned scope 2026-11-27 (M-06 / M-08 / M-09 / M-10 / M-11 / L-01 / L-04)', () => {
  beforeEach(() => {
    if (typeof globalThis.ResizeObserver === 'undefined') {
      globalThis.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
      } as unknown as typeof ResizeObserver;
    }
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => {
      return {
        clearRect: vi.fn(),
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        bezierCurveTo: vi.fn(),
        quadraticCurveTo: vi.fn(),
        closePath: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        scale: vi.fn(),
        setLineDash: vi.fn(),
        fillText: vi.fn(),
        measureText: vi.fn(() => ({ width: 10 })),
        createImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
        putImageData: vi.fn(),
        getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
        drawImage: vi.fn(),
      } as unknown as RenderingContext;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('TraceSettingsModal uses ModalShell (4xl), SliderRow number inputs, emerald-600 sliders and a 44px position-reset button', () => {
    const { container, unmount } = renderWithRoot(
      <TraceSettingsModal
        isOpen={true}
        onClose={vi.fn()}
        traceSettings={
          {
            enabled: true,
            type: 'image',
            text: 'あ',
            fontFamily: "'Noto Sans JP', sans-serif",
            fontSize: 800,
            opacity: 0.5,
            scale: 1,
            offsetX: 0,
            offsetY: 0,
            rotation: 0,
            contrast: 1,
            brightness: 1,
          } satisfies TraceSettings
        }
        setTraceSettings={vi.fn()}
        activeChar="あ"
        selectedUnicode={0x3042}
        theme="light"
        onShowToast={vi.fn()}
      />
    );

    const dialog = container.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog.className).toContain('sm:max-w-4xl');
    expect(dialog.className).toContain('sm:max-h-[92vh]');
    // SliderRow with showNumberInput renders a number input per slider.
    expect(container.querySelectorAll('input[type="number"]').length).toBeGreaterThan(0);
    // M-08: emerald-700 sliders are gone.
    expect(container.innerHTML).not.toContain('accent-emerald-700');
    expect(container.innerHTML).toContain('accent-emerald-600');
    const resetBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('位置リセット')
    ) as HTMLElement;
    expect(resetBtn).toBeDefined();
    expect(resetBtn.className).toContain('min-h-[44px]');
    // ModalFooter primary action.
    expect(
      Array.from(container.querySelectorAll('button')).some((b) => b.textContent?.trim() === '完了')
    ).toBe(true);
    unmount();
  });

  it('SvgVectorizerModal uses ModalShell (5xl) with the fullscreen toggle', () => {
    const { container, unmount } = renderWithRoot(
      <SvgVectorizerModal
        isOpen={true}
        onClose={vi.fn()}
        onApplyContours={vi.fn()}
        selectedChar="あ"
        theme="light"
      />
    );
    const dialog = container.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog.className).toContain('sm:max-w-5xl');
    expect(dialog.className).toContain('sm:max-h-[92vh]');
    expect(container.querySelector('button[title="全画面表示に拡大 (F)"]')).not.toBeNull();
    expect(container.innerHTML).not.toContain('accent-emerald-700');
    unmount();
  });

  it('GlyphSynthesisModal uses ModalTabs and a ModalFooter execute action (disabled at 0 targets)', () => {
    const project: FontProject = { ...createSampleProject(), glyphs: {} };
    const { container, unmount } = renderWithRoot(
      <GlyphSynthesisModal
        isOpen={true}
        onClose={vi.fn()}
        project={project}
        setProject={vi.fn()}
        theme="light"
        onShowToast={vi.fn()}
      />
    );
    expect(container.querySelector('[role="tablist"]')).not.toBeNull();
    const executeBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('濁音・半濁点を一括合成')
    ) as HTMLButtonElement;
    expect(executeBtn).toBeDefined();
    expect(executeBtn.disabled).toBe(true);
    // ModalFooter cancel on the left.
    expect(
      Array.from(container.querySelectorAll('button')).some((b) => b.textContent?.trim() === 'キャンセル')
    ).toBe(true);
    unmount();
  });

  it('BatchRadicalModal uses ModalShell (3xl) with 44px placement buttons and a ModalFooter', () => {
    const { container, unmount } = renderWithRoot(
      <BatchRadicalModal
        isOpen={true}
        onClose={vi.fn()}
        radicalName="さんずい"
        sourceContours={[]}
        defaultKanjiList={['海', '洋']}
        allGlyphs={{}}
        onBatchInsert={vi.fn()}
        theme="light"
      />
    );
    const dialog = container.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog.className).toContain('sm:max-w-3xl');
    const placementBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('偏 (左)')
    ) as HTMLElement;
    expect(placementBtn).toBeDefined();
    expect(placementBtn.className).toContain('min-h-[44px]');
    expect(
      Array.from(container.querySelectorAll('button')).some((b) =>
        b.textContent?.includes('一括流し込み')
      )
    ).toBe(true);
    unmount();
  });

  it('RadicalStudioModal keeps JSON save/load reachable on mobile and uses the unified header', () => {
    const { container, unmount } = renderWithRoot(
      <RadicalStudioModal
        isOpen={true}
        onClose={vi.fn()}
        project={createSampleProject()}
        selectedChar="あ"
        selectedUnicode={0x3042}
        onInsertToCurrentGlyph={vi.fn()}
        onBatchInsertToGlyphs={vi.fn()}
        theme="light"
        onShowToast={vi.fn()}
      />
    );
    const saveBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.getAttribute('title')?.includes('JSONセーブデータとして書き出し')
    ) as HTMLElement;
    expect(saveBtn).toBeDefined();
    expect(saveBtn.className).not.toContain('hidden sm:flex');
    expect(saveBtn.className).toContain('min-w-[40px]');
    const heading = container.querySelector('h2');
    expect(heading?.textContent).toContain('部首・作字パーツ工房');
    expect(heading?.className).toContain('sm:text-base');
    unmount();
  });

  it('PenPresetsModal keeps the sharp studio shell with select-none, 92vh cap and 44px footer actions', () => {
    const { container, unmount } = renderWithRoot(
      <PenPresetsModal
        isOpen={true}
        onClose={vi.fn()}
        currentParams={{
          brushStyle: 'brush',
          brushWidth: 38,
          pressureSensitivity: 'high',
          autoSmoothBrush: true,
          smoothStrength: 'standard',
          smoothPreserveCorners: true,
          autoUnionBrush: true,
        }}
        onApplyPreset={vi.fn()}
        presets={[]}
        onUpdatePresets={vi.fn()}
        theme="light"
      />
    );
    expect(container.innerHTML).toContain('select-none');
    expect(container.innerHTML).toContain('sm:max-h-[92vh]');
    const applyBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('このペンを適用して閉じる')
    ) as HTMLElement;
    expect(applyBtn).toBeDefined();
    expect(applyBtn.className).toContain('min-h-[44px]');
    unmount();
  });

  it('PixelFontStudioModal keeps the sharp pixel-grid rounded-none concept with a 92vh cap', () => {
    const { container, unmount } = renderWithRoot(
      <PixelFontStudioModal
        isOpen={true}
        onClose={vi.fn()}
        project={createSampleProject()}
        setProject={vi.fn()}
        isLight={false}
        theme="dark"
        selectedUnicode={0x3042}
        onSelectGlyph={vi.fn()}
        onShowToast={vi.fn()}
      />
    );
    expect(container.textContent).toContain('ピクセルフォント・クリエイター');
    expect(container.innerHTML).toContain('rounded-none');
    expect(container.innerHTML).toContain('sm:max-h-[92vh]');
    expect(container.innerHTML).not.toContain('sm:max-h-[920px]');
    unmount();
  });
});
