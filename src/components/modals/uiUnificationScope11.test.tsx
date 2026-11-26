// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { KerningModal } from '../KerningModal';
import { GlyphCompareModal } from '../GlyphCompareModal';
import { FontInfoModal } from '../FontInfoModal';
import { IvsVariantManagerModal } from '../ivs/IvsVariantManagerModal';
import { JisProgressDashboardModal } from '../progress/JisProgressDashboardModal';
import { StorageManagerModal } from '../StorageManagerModal';
import { GridFittingModal } from '../GridFittingModal';
import { MojikumiStudioModal } from '../MojikumiStudioModal';
import { ShortcutsHelpModal } from '../ShortcutsHelpModal';
import { FontQualityModal } from '../quality/FontQualityModal';
import { TestPreviewModal } from '../testpreview';
import { FontProject, GlyphOverlaySettings } from '../../types';

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
    kerning: { '「,「': -120 },
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
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe('UI unification scope 11 modals (2026-11-27 audit)', () => {
  it('KerningModal uses ModalTabs and SliderRow with a 64px value badge', () => {
    const project = createSampleProject();
    const { container, unmount } = renderWithRoot(
      <KerningModal
        isOpen={true}
        onClose={vi.fn()}
        project={project}
        setProject={vi.fn()}
        showToast={vi.fn()}
        theme="light"
      />
    );
    expect(container.querySelector('[role="tablist"]')).not.toBeNull();
    expect(container.innerHTML).toContain('min-w-[64px]');
    expect(container.innerHTML).not.toContain('accent-sky-600');
    const h2 = container.querySelector('h2');
    expect(h2?.className).toContain('text-sm');
    expect(h2?.className).toContain('sm:text-base');
    unmount();
  });

  it('GlyphCompareModal has no sky-600 chrome and uses ModalFooter', () => {
    const project = createSampleProject();
    const { container, unmount } = renderWithRoot(
      <GlyphCompareModal
        isOpen={true}
        onClose={vi.fn()}
        project={project}
        activeChar="あ"
        activeUnicode={0x3042}
        overlaySettings={defaultOverlay}
        onChangeOverlaySettings={vi.fn()}
        theme="light"
        onShowToast={vi.fn()}
      />
    );
    expect(container.innerHTML).not.toContain('accent-sky-600');
    expect(container.innerHTML).not.toContain('bg-sky-600');
    expect(container.innerHTML).toContain('min-w-[64px]');
    expect(container.textContent).toContain('完了 (キャンバスに反映)');
    unmount();
  });

  it('FontInfoModal heading follows the standard size and footer saves via ModalFooter', () => {
    const project = createSampleProject();
    const { container, unmount } = renderWithRoot(
      <FontInfoModal
        isOpen={true}
        onClose={vi.fn()}
        project={project}
        setProject={vi.fn()}
        theme="light"
        onShowToast={vi.fn()}
      />
    );
    const h2 = container.querySelector('h2');
    expect(h2?.className).toContain('text-sm');
    expect(h2?.className).toContain('sm:text-base');
    expect(h2?.className).not.toContain('uppercase');
    expect(container.innerHTML).not.toContain('min-w-[120px]');
    expect(container.textContent).toContain('設定を保存');
    unmount();
  });

  it('IvsVariantManagerModal uses ModalTabs, has a fullscreen button and no purple chrome', () => {
    const project = createSampleProject();
    const { container, unmount } = renderWithRoot(
      <IvsVariantManagerModal
        isOpen={true}
        onClose={vi.fn()}
        selectedUnicode={0x3042}
        selectedChar="あ"
        glyphs={project.glyphs}
        onSelectGlyph={vi.fn()}
        onShowToast={vi.fn()}
        theme="light"
      />
    );
    expect(container.querySelector('[role="tablist"]')).not.toBeNull();
    expect(container.innerHTML).not.toContain('purple-500');
    expect(container.textContent).toContain('全画面');
    expect(container.innerHTML).toContain('select-none');
    unmount();
  });

  it('JisProgressDashboardModal uses 6xl width, 92vh height and standard body padding', () => {
    const project = createSampleProject();
    const { container, unmount } = renderWithRoot(
      <JisProgressDashboardModal
        isOpen={true}
        onClose={vi.fn()}
        project={project}
        theme="light"
        onSelectGlyph={vi.fn()}
        onShowToast={vi.fn()}
      />
    );
    expect(container.innerHTML).toContain('sm:max-w-6xl');
    expect(container.innerHTML).not.toContain('1440px');
    expect(container.innerHTML).toContain('sm:max-h-[92vh]');
    expect(container.innerHTML).toContain('p-3.5 sm:p-4');
    expect(container.textContent).toContain('全画面');
    unmount();
  });

  it('StorageManagerModal shows the guide warning via ModalAlert and a unified footer', () => {
    const project = createSampleProject();
    const { container, unmount } = renderWithRoot(
      <StorageManagerModal
        isOpen={true}
        onClose={vi.fn()}
        project={project}
        setProject={vi.fn()}
        theme="light"
        onShowToast={vi.fn()}
      />
    );
    expect(container.innerHTML).toContain('select-none');
    expect(container.textContent).toContain('全画面');
    const guideBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('保存仕様')
    );
    expect(guideBtn).toBeDefined();
    act(() => {
      guideBtn!.click();
    });
    expect(container.textContent).toContain('ブラウザの保存領域（localStorage）に関する注意点');
    expect(container.textContent).toContain('約 5MB の容量上限');
    unmount();
  });

  it('GridFittingModal has one unified footer and no amber-600 chrome', () => {
    const project = createSampleProject();
    const { container, unmount } = renderWithRoot(
      <GridFittingModal
        isOpen={true}
        onClose={vi.fn()}
        project={project}
        setProject={vi.fn()}
        isLight={true}
        theme="light"
        onShowToast={vi.fn()}
      />
    );
    expect(container.innerHTML).not.toContain('bg-amber-600');
    expect(container.innerHTML).not.toContain('accent-amber-600');
    expect(container.innerHTML).not.toContain('全文字一括適用');
    expect(container.textContent).toContain('全文字一括');
    expect(container.textContent).toContain('全画面');
    expect(container.innerHTML).toContain('sm:max-h-[92vh]');
    unmount();
  });

  it('MojikumiStudioModal uses ModalTabs and a 40px close button', () => {
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
    expect(container.querySelector('[role="tablist"]')).not.toBeNull();
    expect(container.innerHTML).not.toContain('min-w-[38px]');
    expect(container.innerHTML).toContain('min-w-[40px]');
    expect(container.innerHTML).toContain('sm:max-h-[92vh]');
    unmount();
  });

  it('ShortcutsHelpModal has anim-fade, select-none and a 40px close button', () => {
    const { container, unmount } = renderWithRoot(
      <ShortcutsHelpModal isOpen={true} onClose={vi.fn()} theme="light" initialTab="tutorial" />
    );
    expect(container.innerHTML).toContain('anim-fade');
    expect(container.innerHTML).toContain('select-none');
    expect(container.innerHTML).toContain('min-w-[40px]');
    expect(container.textContent).toContain('閉じる');
    unmount();
  });

  it('FontQualityModal uses 4xl width, 92vh height and select-none', () => {
    const project = createSampleProject();
    const { container, unmount } = renderWithRoot(
      <FontQualityModal
        isOpen={true}
        onClose={vi.fn()}
        project={project}
        setProject={vi.fn()}
        onSelectGlyph={vi.fn()}
        theme="light"
        onShowToast={vi.fn()}
      />
    );
    expect(container.innerHTML).toContain('sm:max-w-4xl');
    expect(container.innerHTML).not.toContain('xl:max-w-5xl');
    expect(container.innerHTML).toContain('sm:max-h-[92vh]');
    expect(container.innerHTML).toContain('select-none');
    unmount();
  });

  it('TestPreviewModal uses bg-black/85 fullscreen backdrop and 92vh height', () => {
    const project = createSampleProject();
    const { container, unmount } = renderWithRoot(
      <TestPreviewModal
        isOpen={true}
        onClose={vi.fn()}
        project={project}
        setProject={vi.fn()}
        theme="light"
        onShowToast={vi.fn()}
      />
    );
    expect(container.innerHTML).not.toContain('bg-black/90');
    expect(container.innerHTML).toContain('sm:max-h-[92vh]');
    expect(container.innerHTML).not.toContain('accent-emerald-700');
    unmount();
  });
});
