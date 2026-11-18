// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { useAppShortcuts, UseAppShortcutsOptions } from './useAppShortcuts';
import { useCanvasShortcuts, UseCanvasShortcutsProps } from '../components/canvas/hooks/useCanvasShortcuts';
import { FontInfoModal } from '../components/FontInfoModal';
import { FontProject, GridSettings } from '../types';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

function AppShortcutsHarness(props: UseAppShortcutsOptions) {
  useAppShortcuts(props);
  return null;
}

function CanvasShortcutsHarness(props: UseCanvasShortcutsProps) {
  useCanvasShortcuts(props);
  return null;
}

const baseGridSettings: GridSettings = {
  showGrid: true,
  gridSize: 50,
  snapToGrid: false,
  snapToPoints: false,
  showMetrics: true,
  showPoints: true,
  showHandles: true,
};

function makeProject(familyName: string): FontProject {
  return {
    id: 'proj-1',
    name: familyName,
    metadata: {
      familyName,
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
    glyphs: {},
    createdAt: 1000,
    updatedAt: 1000,
  };
}

describe('Residual useEffect fixes (R2 & R4)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('useAppShortcuts registers window keydown listener once and always calls latest handlers', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const setToolMode1 = vi.fn();
    const setToolMode2 = vi.fn();

    const makeOptions = (setToolMode: (m: any) => void, isAnyModalOpen = false): UseAppShortcutsOptions => ({
      isAnyModalOpen,
      handleUndo: vi.fn(),
      handleRedo: vi.fn(),
      handleQuickSaveCurrentGlyph: vi.fn(),
      handleCopyGlyph: vi.fn(),
      handlePasteGlyph: vi.fn(),
      selectedUnicode: 0x3042,
      currentGlyph: { unicode: 0x3042, char: 'あ', name: 'uni3042', contours: [], advanceWidth: 1000, lsb: 0 },
      clipboardContours: null,
      handleSelectPrevGlyph: vi.fn(),
      handleSelectNextGlyph: vi.fn(),
      toggleZenMode: vi.fn(),
      setToolMode,
    });

    act(() => {
      root.render(<AppShortcutsHarness {...makeOptions(setToolMode1)} />);
    });

    const initialKeydownAdds = addSpy.mock.calls.filter(([type]) => type === 'keydown').length;
    expect(initialKeydownAdds).toBe(1);

    // Re-render with new callback identity
    act(() => {
      root.render(<AppShortcutsHarness {...makeOptions(setToolMode2)} />);
    });

    const totalKeydownAdds = addSpy.mock.calls.filter(([type]) => type === 'keydown').length;
    const totalKeydownRemoves = removeSpy.mock.calls.filter(([type]) => type === 'keydown').length;
    expect(totalKeydownAdds).toBe(1);
    expect(totalKeydownRemoves).toBe(0);

    // Pressing 'p' should call setToolMode2 (latest ref), not setToolMode1
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', bubbles: true }));
    });
    expect(setToolMode1).not.toHaveBeenCalled();
    expect(setToolMode2).toHaveBeenCalledWith('pen');

    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('useCanvasShortcuts registers window listeners once and always calls latest handlers', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const nudge1 = vi.fn();
    const nudge2 = vi.fn();

    const makeProps = (onNudgeSelection: (dx: number, dy: number) => void): UseCanvasShortcutsProps => ({
      isAnyModalOpen: false,
      toolMode: 'select',
      activePenContour: null,
      selectedContourIds: ['c1'],
      selectedNodeId: null,
      selectedContourId: 'c1',
      rulerMeasurement: null,
      gridSettings: baseGridSettings,
      resetView: vi.fn(),
      handleZoomStep: vi.fn(),
      handleResetTracePosition: vi.fn(),
      handleResetPenContour: vi.fn(),
      handleUndoPenNode: vi.fn(),
      handleFinishPenContour: vi.fn(),
      handleDeleteSelectedNode: vi.fn(),
      handleDeleteSelected: vi.fn(),
      handleSmoothStrokeSelected: vi.fn(),
      handleDrawRulerAsStroke: vi.fn(),
      setShowNodes: vi.fn(),
      setOutlineOnly: vi.fn(),
      setEraserSize: vi.fn(),
      brushWidth: 20,
      setRulerMeasurement: vi.fn(),
      setSelectedContourIds: vi.fn(),
      setSelectedNodeId: vi.fn(),
      setIsSpacePressed: vi.fn(),
      showCanvasToast: vi.fn(),
      onNudgeSelection,
    });

    act(() => {
      root.render(<CanvasShortcutsHarness {...makeProps(nudge1)} />);
    });

    const initialKeydownAdds = addSpy.mock.calls.filter(([type]) => type === 'keydown').length;
    expect(initialKeydownAdds).toBe(1);

    // Re-render with new callback identity
    act(() => {
      root.render(<CanvasShortcutsHarness {...makeProps(nudge2)} />);
    });

    expect(addSpy.mock.calls.filter(([type]) => type === 'keydown').length).toBe(1);
    expect(removeSpy.mock.calls.filter(([type]) => type === 'keydown').length).toBe(0);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', shiftKey: true, bubbles: true }));
    });
    expect(nudge1).not.toHaveBeenCalled();
    expect(nudge2).toHaveBeenCalledWith(10, 0);

    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('FontInfoModal preserves unsaved edits when project.metadata changes while open, and re-syncs when re-opened', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const setProject = vi.fn();
    const onClose = vi.fn();

    act(() => {
      root.render(
        <FontInfoModal
          isOpen={true}
          onClose={onClose}
          project={makeProject('InitialFont')}
          setProject={setProject}
          theme="dark"
        />
      );
    });

    const getFamilyInput = () =>
      container.querySelector<HTMLInputElement>('input[placeholder="例: MyCustomFont"]');

    expect(getFamilyInput()?.value).toBe('InitialFont');

    // Simulate user typing an unsaved family name
    act(() => {
      const input = getFamilyInput()!;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      setter.call(input, 'UnsavedUserEdit');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(getFamilyInput()?.value).toBe('UnsavedUserEdit');

    // Update project.metadata externally while modal stays open
    act(() => {
      root.render(
        <FontInfoModal
          isOpen={true}
          onClose={onClose}
          project={makeProject('ExternalProjectUpdate')}
          setProject={setProject}
          theme="dark"
        />
      );
    });

    // Unsaved edit must NOT be clobbered while modal remains open
    expect(getFamilyInput()?.value).toBe('UnsavedUserEdit');

    // Close modal, then re-open with latest project.metadata
    act(() => {
      root.render(
        <FontInfoModal
          isOpen={false}
          onClose={onClose}
          project={makeProject('ExternalProjectUpdate')}
          setProject={setProject}
          theme="dark"
        />
      );
    });
    act(() => {
      root.render(
        <FontInfoModal
          isOpen={true}
          onClose={onClose}
          project={makeProject('ExternalProjectUpdate')}
          setProject={setProject}
          theme="dark"
        />
      );
    });

    expect(getFamilyInput()?.value).toBe('ExternalProjectUpdate');

    act(() => {
      root.unmount();
    });
    container.remove();
  });
});
