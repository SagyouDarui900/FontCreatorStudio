// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SvgVectorizerModal } from './SvgVectorizerModal';
import { ErrorBoundary } from './ErrorBoundary';
import { PixelFontStudioModal } from './PixelFontStudioModal';
import { KerningModal } from './KerningModal';
import { FontQualityModal } from './quality/FontQualityModal';
import { JisProgressDashboardModal } from './progress/JisProgressDashboardModal';
import { IvsVariantManagerModal } from './ivs/IvsVariantManagerModal';
import { BatchNormalizeModal } from './BatchNormalizeModal';
import { OpenTypeFeaturesModal } from './OpenTypeFeaturesModal';
import { GlyphCompareModal } from './GlyphCompareModal';
import { WeightInterpolationModal } from './WeightInterpolationModal';
import { GlyphDensityHeatmapModal } from './GlyphDensityHeatmapModal';
import { GridFittingModal } from './GridFittingModal';
import { MojikumiStudioModal } from './MojikumiStudioModal';
import { FontInfoModal } from './FontInfoModal';
import { TraceSettingsModal } from './TraceSettingsModal';
import { StorageManagerModal } from './StorageManagerModal';
import { BundledFontsModal } from './BundledFontsModal';
import { GlyphSynthesisModal } from './GlyphSynthesisModal';
import { PenPresetsModal } from './PenPresetsModal';
import { TestPreviewModal } from './testpreview';
import { RadicalStudioModal } from './RadicalStudioModal';
import { FontProject, GlyphOverlaySettings, TraceSettings } from '../types';

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
      0x6f22: {
        unicode: 0x6f22,
        char: '漢',
        name: 'uni6F22',
        advanceWidth: 1000,
        lsb: 50,
        contours: [
          {
            id: 'c2',
            closed: true,
            nodes: [
              { id: 'p5', x: 150, y: 150, type: 'corner' },
              { id: 'p6', x: 850, y: 150, type: 'corner' },
              { id: 'p7', x: 850, y: 850, type: 'corner' },
              { id: 'p8', x: 150, y: 850, type: 'corner' },
            ],
          },
        ],
      },
    },
    kerning: {
      '「,「': -120,
    },
    createdAt: 1000,
    updatedAt: 1000,
  };
}

const defaultOverlay: GlyphOverlaySettings = {
  enabled: true,
  referenceChar: '漢',
  referenceUnicode: 0x6f22,
  opacity: 0.4,
  color: '#0284c7',
  renderMode: 'outline',
  offsetX: 0,
  offsetY: 0,
  scale: 1,
  showMetrics: true,
};

function renderWithRoot(element: React.ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(element);
  });
  return {
    container,
    rerender: (next: React.ReactElement) => {
      act(() => {
        root.render(next);
      });
    },
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe('SVG Import UI & Mobile-Optimized Studio Modals', () => {
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
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('SvgVectorizerModal uses rounded corners & theme classes, parses SVG input after debounce, and applies contours', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    const onApplyContours = vi.fn();

    const { container, rerender, unmount } = renderWithRoot(
      <SvgVectorizerModal
        isOpen={true}
        onClose={onClose}
        onApplyContours={onApplyContours}
        selectedChar="あ"
        theme="light"
      />
    );

    const dialog = container.querySelector('[role="dialog"]')!;
    expect(dialog).not.toBeNull();

    // Inner modal panel must have rounded-2xl (at sm+) and light theme modalBg (bg-white)
    const panel = dialog.firstElementChild as HTMLElement;
    expect(panel.className).toContain('sm:rounded-2xl');
    expect(panel.className).toContain('h-[100dvh]');
    expect(panel.className).toContain('bg-white');

    // Re-render with dark theme to verify theme integration
    rerender(
      <SvgVectorizerModal
        isOpen={true}
        onClose={onClose}
        onApplyContours={onApplyContours}
        selectedChar="あ"
        theme="dark"
      />
    );
    expect((dialog.firstElementChild as HTMLElement).className).not.toContain('bg-white');

    // Switch to SVG import tab
    const buttons = Array.from(container.querySelectorAll('button'));
    const svgTabBtn = buttons.find((b) => b.textContent?.includes('SVG読込'));
    expect(svgTabBtn).toBeDefined();
    expect(svgTabBtn!.className).toContain('rounded-xl');

    act(() => {
      svgTabBtn!.click();
    });

    const textarea = container.querySelector('textarea')!;
    expect(textarea).not.toBeNull();
    expect(textarea.className).toContain('rounded-xl');

    const svgSample = '<svg viewBox="0 0 100 100"><path d="M 10 10 L 90 10 L 90 90 Z" /></svg>';
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
      setter.call(textarea, svgSample);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Advance past 300ms parse debounce
    act(() => {
      vi.advanceTimersByTime(350);
    });

    const applyBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('文字に置き換え適用')
    );
    expect(applyBtn).toBeDefined();
    expect(applyBtn!.disabled).toBe(false);
    expect(applyBtn!.className).toContain('rounded-xl');

    act(() => {
      applyBtn!.click();
    });

    expect(onApplyContours).toHaveBeenCalledTimes(1);
    expect(onApplyContours.mock.calls[0][0].length).toBeGreaterThan(0);
    expect(onApplyContours.mock.calls[0][1]).toBe(false);
    expect(onClose).toHaveBeenCalledTimes(1);

    unmount();
  });

  it('ErrorBoundary preserves intentional sharp corners without rounded-* classes', () => {
    const consoleErr = vi.spyOn(console, 'error').mockImplementation(() => {});
    const ThrowingChild = () => {
      throw new Error('Intentional crash for boundary check');
    };

    const { container, unmount } = renderWithRoot(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>
    );

    expect(container.textContent).toContain('エラーが発生しました');
    const roundedElements = container.querySelectorAll('[class*="rounded-"]');
    expect(roundedElements.length).toBe(0);

    consoleErr.mockRestore();
    unmount();
  });

  it('PixelFontStudioModal preserves sharp pixel-grid rounded-none concept', () => {
    const project = createSampleProject();
    const { container, unmount } = renderWithRoot(
      <PixelFontStudioModal
        isOpen={true}
        onClose={vi.fn()}
        project={project}
        setProject={vi.fn()}
        isLight={false}
        theme="dark"
        selectedUnicode={0x3042}
        onSelectGlyph={vi.fn()}
        onShowToast={vi.fn()}
      />
    );

    expect(container.textContent).toContain('ピクセルフォント・クリエイター');
    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(container.innerHTML).toContain('100dvh');
    const modalBox = container.querySelector('.rounded-none');
    expect(modalBox).not.toBeNull();
    unmount();
  });

  it('Renders all mobile-optimized Automation & Font Adjustment modals cleanly with mobile sheet ergonomics', () => {
    const project = createSampleProject();
    const setProject = vi.fn();
    const onClose = vi.fn();
    const onShowToast = vi.fn();

    const modals: Array<{ name: string; element: React.ReactElement; expectFullHeightSheet: boolean }> = [
      {
        name: 'KerningModal',
        expectFullHeightSheet: true,
        element: (
          <KerningModal
            isOpen={true}
            onClose={onClose}
            project={project}
            setProject={setProject}
            showToast={onShowToast}
            theme="dark"
          />
        ),
      },
      {
        name: 'FontQualityModal',
        expectFullHeightSheet: true,
        element: (
          <FontQualityModal
            isOpen={true}
            onClose={onClose}
            project={project}
            setProject={setProject}
            onSelectGlyph={vi.fn()}
            theme="dark"
            onShowToast={onShowToast}
          />
        ),
      },
      {
        name: 'JisProgressDashboardModal',
        expectFullHeightSheet: true,
        element: (
          <JisProgressDashboardModal
            isOpen={true}
            onClose={onClose}
            project={project}
            theme="dark"
            onSelectGlyph={vi.fn()}
            onShowToast={onShowToast}
          />
        ),
      },
      {
        name: 'IvsVariantManagerModal',
        expectFullHeightSheet: true,
        element: (
          <IvsVariantManagerModal
            isOpen={true}
            onClose={onClose}
            selectedUnicode={0x3042}
            selectedChar="あ"
            glyphs={project.glyphs}
            onSelectGlyph={vi.fn()}
            onShowToast={onShowToast}
            theme="dark"
          />
        ),
      },
      {
        name: 'BatchNormalizeModal',
        expectFullHeightSheet: true,
        element: (
          <BatchNormalizeModal
            isOpen={true}
            onClose={onClose}
            project={project}
            setProject={setProject}
            selectedUnicode={0x3042}
            theme="dark"
            onShowToast={onShowToast}
          />
        ),
      },
      {
        name: 'OpenTypeFeaturesModal',
        expectFullHeightSheet: true,
        element: (
          <OpenTypeFeaturesModal
            isOpen={true}
            onClose={onClose}
            project={project}
            setProject={setProject}
            isLight={false}
            theme="dark"
            onShowToast={onShowToast}
          />
        ),
      },
      {
        name: 'GlyphCompareModal',
        expectFullHeightSheet: true,
        element: (
          <GlyphCompareModal
            isOpen={true}
            onClose={onClose}
            project={project}
            activeChar="あ"
            activeUnicode={0x3042}
            overlaySettings={defaultOverlay}
            onChangeOverlaySettings={vi.fn()}
            theme="dark"
            onShowToast={onShowToast}
          />
        ),
      },
      {
        name: 'WeightInterpolationModal',
        expectFullHeightSheet: true,
        element: (
          <WeightInterpolationModal
            isOpen={true}
            onClose={onClose}
            project={project}
            setProject={setProject}
            selectedUnicode={0x3042}
            theme="dark"
            onShowToast={onShowToast}
          />
        ),
      },
      {
        name: 'GlyphDensityHeatmapModal',
        expectFullHeightSheet: true,
        element: (
          <GlyphDensityHeatmapModal
            isOpen={true}
            onClose={onClose}
            unicode={0x3042}
            project={project}
            setProject={setProject}
            theme="dark"
            onShowToast={onShowToast}
          />
        ),
      },
      {
        name: 'GridFittingModal',
        expectFullHeightSheet: true,
        element: (
          <GridFittingModal
            isOpen={true}
            onClose={onClose}
            project={project}
            setProject={setProject}
            isLight={false}
            theme="dark"
            onShowToast={onShowToast}
          />
        ),
      },
      {
        name: 'MojikumiStudioModal',
        expectFullHeightSheet: true,
        element: (
          <MojikumiStudioModal
            isOpen={true}
            onClose={onClose}
            project={project}
            setProject={setProject}
            theme="dark"
            onShowToast={onShowToast}
          />
        ),
      },
      {
        name: 'FontInfoModal',
        expectFullHeightSheet: true,
        element: (
          <FontInfoModal
            isOpen={true}
            onClose={onClose}
            project={project}
            setProject={setProject}
            theme="dark"
            onShowToast={onShowToast}
          />
        ),
      },
      {
        name: 'TraceSettingsModal',
        expectFullHeightSheet: true,
        element: (
          <TraceSettingsModal
            isOpen={true}
            onClose={onClose}
            traceSettings={{
              enabled: true,
              type: 'char',
              text: 'あ',
              fontFamily: "'Noto Sans JP', sans-serif",
              fontSize: 800,
              opacity: 0.2,
              scale: 1,
              offsetX: 0,
              offsetY: 0,
            } satisfies TraceSettings}
            setTraceSettings={vi.fn()}
            activeChar="あ"
            selectedUnicode={0x3042}
            theme="dark"
            onShowToast={onShowToast}
          />
        ),
      },
      {
        name: 'StorageManagerModal',
        expectFullHeightSheet: true,
        element: (
          <StorageManagerModal
            isOpen={true}
            onClose={onClose}
            project={project}
            setProject={setProject}
            theme="dark"
            onShowToast={onShowToast}
          />
        ),
      },
      {
        name: 'BundledFontsModal',
        expectFullHeightSheet: true,
        element: (
          <BundledFontsModal
            isOpen={true}
            onClose={onClose}
            theme="dark"
          />
        ),
      },
      {
        name: 'GlyphSynthesisModal',
        expectFullHeightSheet: true,
        element: (
          <GlyphSynthesisModal
            isOpen={true}
            onClose={onClose}
            project={project}
            setProject={setProject}
            theme="dark"
            onShowToast={onShowToast}
          />
        ),
      },
      {
        name: 'PenPresetsModal',
        expectFullHeightSheet: true,
        element: (
          <PenPresetsModal
            isOpen={true}
            onClose={onClose}
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
            theme="dark"
          />
        ),
      },
      {
        name: 'TestPreviewModal',
        expectFullHeightSheet: true,
        element: (
          <TestPreviewModal
            isOpen={true}
            onClose={onClose}
            project={project}
            setProject={setProject}
            theme="dark"
            onShowToast={onShowToast}
          />
        ),
      },
      {
        name: 'RadicalStudioModal',
        expectFullHeightSheet: true,
        element: (
          <RadicalStudioModal
            isOpen={true}
            onClose={onClose}
            project={project}
            selectedChar="あ"
            selectedUnicode={0x3042}
            onInsertToCurrentGlyph={vi.fn()}
            onBatchInsertToGlyphs={vi.fn()}
            theme="dark"
            onShowToast={onShowToast}
          />
        ),
      },
    ];

    for (const modal of modals) {
      const { container, unmount } = renderWithRoot(modal.element);
      const dialog = container.querySelector('[role="dialog"]');
      expect(dialog, `${modal.name} should render a dialog`).not.toBeNull();

      if (modal.expectFullHeightSheet) {
        const html = container.innerHTML;
        expect(html, `${modal.name} should use mobile 100dvh sheet sizing`).toContain('100dvh');
      }
      unmount();
    }
  });

  it('GlyphSynthesisModal scales SVG preview viewBox to project.metadata.unitsPerEm and BundledFontsModal handles Escape', () => {
    const project2048 = createSampleProject();
    project2048.metadata.unitsPerEm = 2048;
    project2048.glyphs[0x304b] = {
      unicode: 0x304b,
      char: 'か',
      name: 'uni304B',
      advanceWidth: 2048,
      lsb: 100,
      contours: [
        {
          id: 'ka-1',
          closed: true,
          nodes: [
            { id: 'k1', x: 400, y: 400, type: 'corner' },
            { id: 'k2', x: 1400, y: 400, type: 'corner' },
            { id: 'k3', x: 1400, y: 1400, type: 'corner' },
            { id: 'k4', x: 400, y: 1400, type: 'corner' },
          ],
        },
      ],
    };

    const { container: synthContainer, unmount: unmountSynth } = renderWithRoot(
      <GlyphSynthesisModal
        isOpen={true}
        onClose={vi.fn()}
        project={project2048}
        setProject={vi.fn()}
        theme="dark"
        onShowToast={vi.fn()}
      />
    );
    const scaledSvg = synthContainer.querySelector('svg[viewBox="0 0 2048 2048"]');
    expect(scaledSvg).not.toBeNull();
    unmountSynth();

    const onBundledClose = vi.fn();
    const { unmount: unmountBundled } = renderWithRoot(
      <BundledFontsModal isOpen={true} onClose={onBundledClose} theme="dark" />
    );
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(onBundledClose).toHaveBeenCalledTimes(1);
    unmountBundled();
  });

  it('MojikumiStudioModal PoetryTanzakuView contains long lines safely and ManuscriptView paginates without dropping characters', () => {
    const project = createSampleProject();
    const { container, unmount } = renderWithRoot(
      <MojikumiStudioModal
        isOpen={true}
        onClose={vi.fn()}
        project={project}
        setProject={vi.fn()}
        theme="light"
        onShowToast={vi.fn()}
      />
    );

    // 1. Switch to 短冊・詩歌 (poetry)
    const poetryBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('短冊・詩歌')
    );
    expect(poetryBtn).toBeDefined();
    act(() => {
      poetryBtn!.click();
    });

    expect(container.textContent).toContain('詩歌・短冊組版（縦書き）');
    expect(container.textContent).toContain('平均密度:');
    expect(container.textContent).not.toContain('余白比率: 68%');

    // Outer slip prevents overflow, inner RTL scroll stage keeps line 1 visible
    const rtlScroller = container.querySelector('[dir="rtl"].overflow-x-auto');
    expect(rtlScroller).not.toBeNull();
    // Prevents OpenType vert + CSS rotate double transformation
    expect(container.innerHTML).not.toContain('&quot;vert&quot; 1');

    // Tanzaku paper itself keeps rounded corners (rounded-2xl), not rounded-none
    const tanzakuSlip = rtlScroller!.closest('.rounded-2xl');
    expect(tanzakuSlip).not.toBeNull();
    expect(tanzakuSlip!.className).toContain('overflow-hidden');

    // 2. Switch to 400字原稿用紙 (manuscript) — default Wagahai work has > 400 chars so pager appears
    const manuscriptBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('400字原稿用紙')
    );
    expect(manuscriptBtn).toBeDefined();
    act(() => {
      manuscriptBtn!.click();
    });

    expect(container.textContent).toContain('四百字詰原稿用紙');
    expect(container.textContent).toContain('原稿用紙 第 1 枚 /');
    const manuscriptRtl = container.querySelector('[dir="rtl"].overflow-x-auto');
    expect(manuscriptRtl).not.toBeNull();

    unmount();
  });
});
