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

  it('WeightInterpolationModal batch apply commits history for every changed glyph and for the project metadata', () => {
    const proj = makeProject();
    // Add a second unlocked glyph so the batch apply changes two glyphs
    // while the locked 'い' stays untouched.
    proj.glyphs[0x3046] = {
      unicode: 0x3046,
      char: 'う',
      name: 'uni3046',
      advanceWidth: 1000,
      lsb: 220,
      contours: [
        {
          id: 'c-u',
          closed: true,
          nodes: [
            { id: 'u1', x: 220, y: 220, handleIn: null, handleOut: null, type: 'corner' },
            { id: 'u2', x: 780, y: 220, handleIn: null, handleOut: null, type: 'corner' },
            { id: 'u3', x: 780, y: 780, handleIn: null, handleOut: null, type: 'corner' },
            { id: 'u4', x: 220, y: 780, handleIn: null, handleOut: null, type: 'corner' },
          ],
        },
      ],
    };
    let currentProj = proj;
    const setProject = vi.fn((updater) => {
      currentProj = typeof updater === 'function' ? updater(currentProj) : updater;
    });
    const onCommitHistory = vi.fn();
    const onCommitProjectHistory = vi.fn();

    const { container, unmount } = renderModal(
      <WeightInterpolationModal
        isOpen={true}
        onClose={vi.fn()}
        project={currentProj}
        setProject={setProject}
        selectedUnicode={0x3042}
        theme="dark"
        onShowToast={vi.fn()}
        onCommitHistory={onCommitHistory}
        onCommitProjectHistory={onCommitProjectHistory}
      />
    );

    expect(container.textContent).toContain('対象: 2 文字 (ロック除外 1)');

    const applyBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('現在のプロジェクトに適用')
    );
    expect(applyBtn).toBeDefined();
    act(() => {
      applyBtn!.click();
    });

    // Both changed glyphs get their own pre-change history entry, and the
    // locked glyph gets none. The metadata change gets a project-level
    // entry, so Ctrl+Z can restore the previous styleName/usWeightClass.
    expect(onCommitHistory).toHaveBeenCalledTimes(2);
    expect(onCommitHistory).toHaveBeenCalledWith(0x3042);
    expect(onCommitHistory).toHaveBeenCalledWith(0x3046);
    expect(onCommitHistory).not.toHaveBeenCalledWith(0x3044);
    expect(onCommitProjectHistory).toHaveBeenCalledTimes(1);
    // All history commits happen before the project is replaced.
    for (const callOrder of onCommitHistory.mock.invocationCallOrder) {
      expect(callOrder).toBeLessThan(setProject.mock.invocationCallOrder[0]);
    }
    expect(onCommitProjectHistory.mock.invocationCallOrder[0]).toBeLessThan(
      setProject.mock.invocationCallOrder[0]
    );
    expect(setProject).toHaveBeenCalledTimes(1);
    expect(currentProj.glyphs[0x3042].lsb).toBe(130);
    expect(currentProj.glyphs[0x3046].lsb).toBe(150);
    expect(currentProj.metadata.styleName).toBe('Bold');
    expect(currentProj.metadata.usWeightClass).toBe(700);
    unmount();
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

  it('WeightInterpolationModal preserves metadata on partial scope, scales delta for 2048 UPM, supports ExtraLight preset, and prefers onCommitBatchHistory with IVS', () => {
    const proj = makeProject();
    proj.metadata.unitsPerEm = 2048;
    proj.glyphs[0x3042].advanceWidth = 2048;
    proj.glyphs[0x3042].lsb = 400;
    proj.glyphs[0x3042].contours = [
      {
        id: 'c-a-2048',
        closed: true,
        nodes: [
          { id: 'a1', x: 400, y: 400, handleIn: null, handleOut: null, type: 'corner' },
          { id: 'a2', x: 1600, y: 400, handleIn: null, handleOut: null, type: 'corner' },
          { id: 'a3', x: 1600, y: 1600, handleIn: null, handleOut: null, type: 'corner' },
          { id: 'a4', x: 400, y: 1600, handleIn: null, handleOut: null, type: 'corner' },
        ],
      },
    ];
    proj.glyphs[0x0041] = {
      unicode: 0x0041,
      char: 'A',
      name: 'A',
      advanceWidth: 1200,
      lsb: 100,
      contours: [
        {
          id: 'c-lat',
          closed: true,
          nodes: [
            { id: 'l1', x: 100, y: 200, handleIn: null, handleOut: null, type: 'corner' },
            { id: 'l2', x: 1000, y: 200, handleIn: null, handleOut: null, type: 'corner' },
            { id: 'l3', x: 1000, y: 1400, handleIn: null, handleOut: null, type: 'corner' },
            { id: 'l4', x: 100, y: 1400, handleIn: null, handleOut: null, type: 'corner' },
          ],
        },
      ],
    };
    proj.ivsVariants = {
      '3042_E0100': {
        id: '3042_E0100',
        baseUnicode: 0x3042,
        selectorCode: 0xe0100,
        updatedAt: 1000,
        glyph: {
          unicode: 0x3042,
          char: 'あ',
          name: 'uni3042.E0100',
          advanceWidth: 2048,
          lsb: 400,
          contours: [
            {
              id: 'c-ivs',
              closed: true,
              nodes: [
                { id: 'v1', x: 400, y: 400, handleIn: null, handleOut: null, type: 'corner' },
                { id: 'v2', x: 1600, y: 400, handleIn: null, handleOut: null, type: 'corner' },
                { id: 'v3', x: 1600, y: 1600, handleIn: null, handleOut: null, type: 'corner' },
                { id: 'v4', x: 400, y: 1600, handleIn: null, handleOut: null, type: 'corner' },
              ],
            },
          ],
        },
      },
    };

    let currentProj = proj;
    const setProject = vi.fn((updater) => {
      currentProj = typeof updater === 'function' ? updater(currentProj) : updater;
    });
    const onCommitBatchHistory = vi.fn();
    const onCommitProjectHistory = vi.fn();
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
        onCommitBatchHistory={onCommitBatchHistory}
        onCommitProjectHistory={onCommitProjectHistory}
      />
    );

    // ExtraLight preset exists
    const extraLightBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('ExtraLight')
    );
    expect(extraLightBtn).toBeDefined();

    // Switch scope to 'かなのみ'
    const kanaScopeBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('かなのみ')
    );
    expect(kanaScopeBtn).toBeDefined();
    act(() => {
      kanaScopeBtn!.click();
    });

    // Badge shows 1 kana glyph + 1 IVS variant + 1 locked kana excluded ('い')
    expect(container.textContent).toContain('対象: 1 文字 + IVS 1件 (ロック除外 1)');

    const applyBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('現在のプロジェクトに適用')
    );
    act(() => {
      applyBtn!.click();
    });

    // Single batched history commit including both unicode & IVS key; NO project metadata commit on partial scope
    expect(onCommitBatchHistory).toHaveBeenCalledTimes(1);
    expect(onCommitBatchHistory).toHaveBeenCalledWith([0x3042], ['3042_E0100']);
    expect(onCommitProjectHistory).not.toHaveBeenCalled();

    // Bold (+70) at 2048 UPM scales to 70 * 2.048 = 143.36 => minX goes from 400 to ~257
    expect(currentProj.glyphs[0x3042].lsb).toBe(257);
    expect(currentProj.ivsVariants!['3042_E0100'].glyph.lsb).toBe(257);
    // Latin 'A' outside kana scope remained untouched
    expect(currentProj.glyphs[0x0041].contours[0].id).toBe('c-lat');
    // Metadata remains Regular (400) because scope was partial ('kana')
    expect(currentProj.metadata.styleName).toBe('Regular');
    expect(currentProj.metadata.usWeightClass).toBe(400);

    unmount();
  });

  it('WeightInterpolationModal supports pixelData glyphs, clickable sample strip, and Master advanceWidth/same-master guard', () => {
    const proj = makeProject();
    // Replace 'い' lock with unlocked second glyph having different advanceWidth, and add pixelData-only 'う'
    proj.glyphs[0x3044].locked = false;
    proj.glyphs[0x3044].advanceWidth = 800;
    proj.glyphs[0x3046] = {
      unicode: 0x3046,
      char: 'う',
      name: 'uni3046',
      advanceWidth: 1000,
      lsb: 100,
      contours: [],
      pixelData: {
        width: 8,
        height: 8,
        data: [
          0, 0, 1, 1, 1, 1, 0, 0,
          0, 1, 1, 0, 0, 1, 1, 0,
          0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0,
        ],
      },
    };

    let currentProj = proj;
    const setProject = vi.fn((updater) => {
      currentProj = typeof updater === 'function' ? updater(currentProj) : updater;
    });
    const onSelectGlyphForEdit = vi.fn();

    const { container, unmount } = renderModal(
      <WeightInterpolationModal
        isOpen={true}
        onClose={vi.fn()}
        project={currentProj}
        setProject={setProject}
        selectedUnicode={0x3042}
        theme="dark"
        onShowToast={vi.fn()}
        onCommitHistory={vi.fn()}
        onSelectGlyphForEdit={onSelectGlyphForEdit}
      />
    );

    // Click 'あ' in sample strip -> triggers onSelectGlyphForEdit(0x3042)
    const stripBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.getAttribute('title')?.includes('「あ」をエディタで直接編集')
    );
    expect(stripBtn).toBeDefined();
    act(() => {
      stripBtn!.click();
    });
    expect(onSelectGlyphForEdit).toHaveBeenCalledWith(0x3042);

    // Master tab tests
    const masterTabBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('2マスター')
    )!;
    act(() => {
      masterTabBtn.click();
    });

    // Apply button interpolates advanceWidth between 1000 ('あ') and 800 ('い') at 50% -> 900
    const masterApplyBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('補間結果を「あ」に適用')
    ) as HTMLButtonElement;
    expect(masterApplyBtn.disabled).toBe(false);
    act(() => {
      masterApplyBtn.click();
    });
    expect(currentProj.glyphs[0x3042].advanceWidth).toBe(900);
    expect(currentProj.glyphs[0x3042].lsb).toBe(225);

    unmount();

    // Same master selected for A and B disables Apply and shows warning
    const singleGlyphProj = makeProject();
    delete singleGlyphProj.glyphs[0x3044]; // only 'あ' is non-empty -> both dropdowns default to 'あ'
    const singleModal = renderModal(
      <WeightInterpolationModal
        isOpen={true}
        onClose={vi.fn()}
        project={singleGlyphProj}
        setProject={vi.fn()}
        selectedUnicode={0x3042}
        theme="dark"
      />
    );
    const masterBtn2 = Array.from(singleModal.container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('2マスター')
    )!;
    act(() => {
      masterBtn2.click();
    });
    expect(singleModal.container.textContent).toContain('マスター A と B に同じ文字が選択されています');
    const disabledApply = Array.from(singleModal.container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('補間結果を「あ」に適用')
    ) as HTMLButtonElement;
    expect(disabledApply.disabled).toBe(true);
    singleModal.unmount();

    // Applying weight to pixelData-only glyph materializes contours and clears pixelData
    const pixelOnlyProj = makeProject();
    delete pixelOnlyProj.glyphs[0x3042];
    delete pixelOnlyProj.glyphs[0x3044];
    pixelOnlyProj.glyphs[0x3046] = proj.glyphs[0x3046];
    let updatedPixelProj = pixelOnlyProj;
    const pixelModal = renderModal(
      <WeightInterpolationModal
        isOpen={true}
        onClose={vi.fn()}
        project={updatedPixelProj}
        setProject={(u) => {
          updatedPixelProj = typeof u === 'function' ? u(updatedPixelProj) : u;
        }}
        selectedUnicode={0x3046}
        theme="dark"
        onShowToast={vi.fn()}
      />
    );
    expect(pixelModal.container.textContent).toContain('対象: 1 文字');
    const pixelApplyBtn = Array.from(pixelModal.container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('現在のプロジェクトに適用')
    )!;
    act(() => {
      pixelApplyBtn.click();
    });
    expect(updatedPixelProj.glyphs[0x3046].contours.length).toBeGreaterThan(0);
    expect(updatedPixelProj.glyphs[0x3046].pixelData).toBeUndefined();
    pixelModal.unmount();
  });
});
