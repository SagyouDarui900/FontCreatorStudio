// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { ShortcutsHelpModal } from './ShortcutsHelpModal';
import { RadicalShortcutsHelpModal } from './radicalStudio/RadicalShortcutsHelpModal';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

describe('ShortcutsHelpModal & RadicalShortcutsHelpModal', () => {
  it('switches tabs and filters shortcuts and glossary terms accurately', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const onClose = vi.fn();

    act(() => {
      root.render(
        <ShortcutsHelpModal
          isOpen={true}
          onClose={onClose}
          theme="light"
          initialTab="tutorial"
        />
      );
    });

    expect(container.textContent).toContain('作字と書き出しの基本手順');
    expect(container.textContent).toContain('.otf');

    // Switch to Shortcuts tab and filter by keyword
    const shortcutsTabBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('ショートカット')
    );
    expect(shortcutsTabBtn).toBeTruthy();

    act(() => {
      shortcutsTabBtn?.click();
    });

    const input = container.querySelector<HTMLInputElement>('input[type="text"]');
    expect(input).toBeTruthy();

    act(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      setter?.call(input, '単純化');
      input?.dispatchEvent(new Event('input', { bubbles: true }));
      input?.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(container.textContent).toContain('パスの単純化を実行');
    expect(container.textContent).toContain('3 件');

    const drawingCatBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent === '描画・編集'
    );
    act(() => {
      drawingCatBtn?.click();
    });
    expect(container.textContent).toContain('1 件');

    // Switch to Glossary tab
    const glossaryTabBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('用語辞典')
    );
    act(() => {
      glossaryTabBtn?.click();
    });
    expect(container.textContent).toContain('フォント用語辞典');
    expect(container.textContent).toContain('仮想ボディ');

    // Escape closes modal
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(onClose).toHaveBeenCalledTimes(1);

    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('closes RadicalShortcutsHelpModal on Escape', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const onClose = vi.fn();

    act(() => {
      root.render(
        <RadicalShortcutsHelpModal isOpen={true} onClose={onClose} isLight={true} />
      );
    });

    expect(container.textContent).toContain('部首工房 操作ガイド');
    expect(container.querySelector('[role="dialog"]')).toBeTruthy();

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(onClose).toHaveBeenCalledTimes(1);

    act(() => {
      root.unmount();
    });
    container.remove();
  });
});
