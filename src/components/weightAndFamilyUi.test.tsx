// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { FontInfoModal } from './FontInfoModal';
import { ExportModal } from './ExportModal';
import { WeightInterpolationModal } from './WeightInterpolationModal';
import { FontProject } from '../types';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

function makeProject(): FontProject {
  return {
    id: 'proj-weight-test',
    name: 'FamilyTest',
    metadata: {
      familyName: 'FamilyTest',
      styleName: 'Regular',
      usWeightClass: 400,
      designer: 'Tester',
      copyright: 'Copyright 2026',
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
        lsb: 200,
        contours: [
          {
            id: 'c-a',
            closed: true,
            nodes: [
              { id: 'a1', x: 200, y: 200, handleIn: null, handleOut: null, type: 'corner' },
              { id: 'a2', x: 800, y: 200, handleIn: null, handleOut: null, type: 'corner' },
              { id: 'a3', x: 800, y: 800, handleIn: null, handleOut: null, type: 'corner' },
              { id: 'a4', x: 200, y: 800, handleIn: null, handleOut: null, type: 'corner' },
            ],
          },
        ],
      },
      0x3044: {
        unicode: 0x3044,
        char: 'い',
        name: 'uni3044',
        advanceWidth: 1000,
        lsb: 250,
        locked: true,
        contours: [
          {
            id: 'c-i',
            closed: true,
            nodes: [
              { id: 'i1', x: 250, y: 250, handleIn: null, handleOut: null, type: 'corner' },
              { id: 'i2', x: 750, y: 250, handleIn: null, handleOut: null, type: 'corner' },
              { id: 'i3', x: 750, y: 750, handleIn: null, handleOut: null, type: 'corner' },
              { id: 'i4', x: 250, y: 750, handleIn: null, handleOut: null, type: 'corner' },
            ],
          },
        ],
      },
    },
    createdAt: 1000,
    updatedAt: 1000,
  };
}

function renderModal(element: React.ReactElement) {
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

// Set the value of a React-controlled text input the way a user typing would.
function typeIntoInput(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
  act(() => {
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('Weight Interpolation & Family Settings Audit Fixes', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('FontInfoModal syncs usWeightClass when style preset chip is clicked or typed', () => {
    let savedProject = makeProject();
    const setProject = vi.fn((updater) => {
      savedProject = typeof updater === 'function' ? updater(savedProject) : updater;
    });

    const { container, unmount } = renderModal(
      <FontInfoModal
        isOpen={true}
        onClose={vi.fn()}
        project={savedProject}
        setProject={setProject}
        theme="dark"
      />
    );

    const semiBoldBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'SemiBold'
    );
    expect(semiBoldBtn).toBeDefined();

    act(() => {
      semiBoldBtn!.click();
    });
    expect(container.textContent).toContain('Weight: 600');

    const submitBtn = container.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    act(() => {
      submitBtn.click();
    });

    expect(setProject).toHaveBeenCalledTimes(1);
    expect(savedProject.metadata.styleName).toBe('SemiBold');
    expect(savedProject.metadata.usWeightClass).toBe(600);
    unmount();
  });

  it('FontInfoModal typing a style name does not reset usWeightClass, and ExtraLight chip sets 200', () => {
    let savedProject = makeProject();
    const setProject = vi.fn((updater) => {
      savedProject = typeof updater === 'function' ? updater(savedProject) : updater;
    });

    const { container, unmount } = renderModal(
      <FontInfoModal
        isOpen={true}
        onClose={vi.fn()}
        project={savedProject}
        setProject={setProject}
        theme="dark"
      />
    );

    // Pick Bold (700) via chip, then type a custom Japanese style name:
    // the weight must stay 700 instead of being inferred back to 400.
    const boldBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Bold'
    );
    expect(boldBtn).toBeDefined();
    act(() => {
      boldBtn!.click();
    });
    expect(container.textContent).toContain('Weight: 700');

    const styleInput = container.querySelector<HTMLInputElement>('input[value="Bold"]');
    expect(styleInput).not.toBeNull();
    typeIntoInput(styleInput!, '太字');
    expect(container.textContent).toContain('Weight: 700');

    // ExtraLight chip (200) exists and syncs both fields.
    const extraLightBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'ExtraLight'
    );
    expect(extraLightBtn).toBeDefined();
    act(() => {
      extraLightBtn!.click();
    });
    expect(container.textContent).toContain('Weight: 200');

    const submitBtn = container.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    act(() => {
      submitBtn.click();
    });
    expect(savedProject.metadata.styleName).toBe('ExtraLight');
    expect(savedProject.metadata.usWeightClass).toBe(200);
    unmount();
  });

  it('ExportModal @font-face snippet uses project usWeightClass and italic style', () => {
    const proj = makeProject();
    proj.metadata.styleName = 'SemiBold Italic';
    proj.metadata.usWeightClass = 600;

    const { container, unmount } = renderModal(
      <ExportModal
        isOpen={true}
        onClose={vi.fn()}
        project={proj}
        theme="dark"
      />
    );

    const pre = container.querySelector('pre');
    expect(pre).not.toBeNull();
    expect(pre!.textContent).toContain('font-weight: 600;');
    expect(pre!.textContent).toContain('font-style: italic;');
    unmount();
  });

  it('ExportModal @font-face snippet uses the raw usWeightClass (1-1000) like the compiler', () => {
    const proj = makeProject();
    proj.metadata.styleName = 'Custom';
    proj.metadata.usWeightClass = 450;

    const { container, unmount } = renderModal(
      <ExportModal isOpen={true} onClose={vi.fn()} project={proj} theme="dark" />
    );
    const pre = container.querySelector('pre');
    expect(pre).not.toBeNull();
    expect(pre!.textContent).toContain('font-weight: 450;');
    unmount();

    const proj1000 = makeProject();
    proj1000.metadata.styleName = 'Custom';
    proj1000.metadata.usWeightClass = 1000;
    const second = renderModal(
      <ExportModal isOpen={true} onClose={vi.fn()} project={proj1000} theme="dark" />
    );
    const pre2 = second.container.querySelector('pre');
    expect(pre2).not.toBeNull();
    expect(pre2!.textContent).toContain('font-weight: 1000;');
    second.unmount();
  });

  it('WeightInterpolationModal commits undo history, skips locked glyphs, updates lsb, and sets usWeightClass on new weight project', () => {
    let currentProj = makeProject();
    const setProject = vi.fn((updater) => {
      currentProj = typeof updater === 'function' ? updater(currentProj) : updater;
    });
    const onCommitHistory = vi.fn();
    const onShowToast = vi.fn();

    const { container, unmount } = renderModal(
      <WeightInterpolationModal
        isOpen={true}
        onClose={vi.fn()}
        project={currentProj}
        setProject={setProject}
        selectedUnicode={0x3042}
        theme="dark"
        onShowToast={onShowToast}
        onCommitHistory={onCommitHistory}
      />
    );

    // Scope badge should show 1 editable target & 1 locked excluded
    expect(container.textContent).toContain('対象: 1 文字 (ロック除外 1)');

    const applyBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('現在のプロジェクトに適用')
    );
    expect(applyBtn).toBeDefined();
    act(() => {
      applyBtn!.click();
    });

    expect(onCommitHistory).toHaveBeenCalledTimes(1);
    expect(setProject).toHaveBeenCalledTimes(1);
    // 'あ' (unlocked) shifted outward by default Bold (+70) => minX shrinks from 200 to 130
    expect(currentProj.glyphs[0x3042].lsb).toBe(130);
    // Applying also syncs the font metadata so the exported OTF is Bold, not Regular
    expect(currentProj.metadata.styleName).toBe('Bold');
    expect(currentProj.metadata.usWeightClass).toBe(700);
    // 'い' (locked) remained untouched
    expect(currentProj.glyphs[0x3044].contours[0].id).toBe('c-i');
    expect(currentProj.glyphs[0x3044].lsb).toBe(250);

    unmount();

    // Test creating a new weight project updates styleName + usWeightClass
    // (confirming the replacement, and snapshotting the original first)
    const baseProj = makeProject();
    let newWeightProj = baseProj;
    const setNewProj = vi.fn((updater) => {
      newWeightProj = typeof updater === 'function' ? updater(newWeightProj) : updater;
    });
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const modal2 = renderModal(
      <WeightInterpolationModal
        isOpen={true}
        onClose={vi.fn()}
        project={baseProj}
        setProject={setNewProj}
        selectedUnicode={0x3042}
        theme="dark"
      />
    );

    const createNewBtn = Array.from(modal2.container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('新規ウェイトプロジェクト作成')
    );
    expect(createNewBtn).toBeDefined();
    act(() => {
      createNewBtn!.click();
    });

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(newWeightProj.metadata.styleName).toBe('Bold');
    expect(newWeightProj.metadata.usWeightClass).toBe(700);
    expect(newWeightProj.id).not.toBe(baseProj.id);

    modal2.unmount();
    confirmSpy.mockRestore();
  });

  it('WeightInterpolationModal apply button is disabled at ±0px and new-project creation can be cancelled', () => {
    const proj = makeProject();
    const setProject = vi.fn();
    const onShowToast = vi.fn();

    const { container, unmount } = renderModal(
      <WeightInterpolationModal
        isOpen={true}
        onClose={vi.fn()}
        project={proj}
        setProject={setProject}
        selectedUnicode={0x3042}
        theme="dark"
        onShowToast={onShowToast}
        onCommitHistory={vi.fn()}
      />
    );

    const applyBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('現在のプロジェクトに適用')
    ) as HTMLButtonElement;
    expect(applyBtn).toBeDefined();
    expect(applyBtn.disabled).toBe(false);

    // Select the Regular preset (±0px): applying must be disabled so no
    // history entry is pushed and no lsb is rewritten for a no-op.
    const regularBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Regular (標準)')
    );
    expect(regularBtn).toBeDefined();
    act(() => {
      regularBtn!.click();
    });
    expect(applyBtn.disabled).toBe(true);
    expect(setProject).not.toHaveBeenCalled();

    unmount();

    // Declining the replacement confirm leaves the project untouched.
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const modal2 = renderModal(
      <WeightInterpolationModal
        isOpen={true}
        onClose={vi.fn()}
        project={makeProject()}
        setProject={setProject}
        selectedUnicode={0x3042}
        theme="dark"
      />
    );
    const createNewBtn = Array.from(modal2.container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('新規ウェイトプロジェクト作成')
    );
    expect(createNewBtn).toBeDefined();
    act(() => {
      createNewBtn!.click();
    });
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(setProject).not.toHaveBeenCalled();
    modal2.unmount();
    confirmSpy.mockRestore();
  });

  it('WeightInterpolationModal Master tab labels target glyph consistently with selectedUnicode', () => {
    const proj = makeProject();
    const { container, unmount } = renderModal(
      <WeightInterpolationModal
        isOpen={true}
        onClose={vi.fn()}
        project={proj}
        setProject={vi.fn()}
        selectedUnicode={0x3042}
        theme="dark"
      />
    );

    // Switch preview chip on Family tab to 'い' (different from selectedUnicode 'あ')
    const chipI = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'い'
    );
    expect(chipI).toBeDefined();
    act(() => {
      chipI!.click();
    });

    // Switch to Master interpolation tab
    const masterTabBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('2マスター')
    );
    expect(masterTabBtn).toBeDefined();
    act(() => {
      masterTabBtn!.click();
    });

    // Button label must target selectedUnicode ('あ'), NOT previewUnicode ('い')
    expect(container.textContent).toContain('補間結果を「あ」に適用');
    expect(container.textContent).toContain('トポロジー一致');

    unmount();
  });
});
