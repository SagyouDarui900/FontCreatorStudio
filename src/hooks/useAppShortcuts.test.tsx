// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { useAppShortcuts, UseAppShortcutsOptions } from './useAppShortcuts';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

function AppShortcutsHarness(props: UseAppShortcutsOptions) {
  useAppShortcuts(props);
  return null;
}

function makeOptions(overrides: Partial<UseAppShortcutsOptions> = {}): UseAppShortcutsOptions {
  return {
    isAnyModalOpen: false,
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
    setToolMode: vi.fn(),
    ...overrides,
  };
}

function mount(options: UseAppShortcutsOptions) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(<AppShortcutsHarness {...options} />);
  });
  return {
    unmount() {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

function pressCtrlS() {
  act(() => {
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 's', ctrlKey: true, metaKey: true, bubbles: true })
    );
  });
}

describe('useAppShortcuts Ctrl+S quick save (M2)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("Ctrl+S calls the quick save handler once and nothing else", () => {
    const options = makeOptions();
    const h = mount(options);
    try {
      pressCtrlS();
      expect(options.handleQuickSaveCurrentGlyph).toHaveBeenCalledTimes(1);
      expect(options.handleUndo).not.toHaveBeenCalled();
      expect(options.handleRedo).not.toHaveBeenCalled();
      expect(options.handleCopyGlyph).not.toHaveBeenCalled();
    } finally {
      h.unmount();
    }
  });

  it('Ctrl+S does nothing while a modal is open', () => {
    const options = makeOptions({ isAnyModalOpen: true });
    const h = mount(options);
    try {
      pressCtrlS();
      expect(options.handleQuickSaveCurrentGlyph).not.toHaveBeenCalled();
    } finally {
      h.unmount();
    }
  });

  it('Ctrl+S always calls the latest handler', () => {
    const first = vi.fn();
    const second = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    try {
      act(() => {
        root.render(<AppShortcutsHarness {...makeOptions({ handleQuickSaveCurrentGlyph: first })} />);
      });
      pressCtrlS();
      expect(first).toHaveBeenCalledTimes(1);
      expect(second).not.toHaveBeenCalled();

      act(() => {
        root.render(<AppShortcutsHarness {...makeOptions({ handleQuickSaveCurrentGlyph: second })} />);
      });
      pressCtrlS();
      expect(first).toHaveBeenCalledTimes(1);
      expect(second).toHaveBeenCalledTimes(1);
    } finally {
      act(() => {
        root.unmount();
      });
      container.remove();
    }
  });
});
