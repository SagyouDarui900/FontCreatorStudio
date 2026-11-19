// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ViewControlsSubToolbar } from './ViewControlsSubToolbar';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

describe('ViewControlsSubToolbar icon alignment', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('uses flex gap-1 + justify-center (never space-x-*) on node visibility and outline toggles', () => {
    const root = createRoot(container);

    act(() => {
      root.render(
        <ViewControlsSubToolbar
          activeChar="あ"
          selectedUnicode={0x3042}
          showCanvasToast={vi.fn()}
          showNodes={true}
          setShowNodes={vi.fn()}
          isOutlineMode={false}
          setOutlineOnly={vi.fn()}
          isLight={true}
        />
      );
    });

    const nodeToggle = container.querySelector('button[title*="頂点とハンドル"]');
    const outlineToggle = container.querySelector('button[title*="輪郭モード"]');

    expect(nodeToggle).not.toBeNull();
    expect(outlineToggle).not.toBeNull();

    for (const btn of [nodeToggle!, outlineToggle!]) {
      expect(btn.className).toContain('justify-center');
      expect(btn.className).toContain('gap-1');
      expect(btn.className).not.toMatch(/\bspace-x-/);

      const icon = btn.firstElementChild;
      expect(icon).not.toBeNull();
      expect(icon?.getAttribute('class') || '').toContain('shrink-0');
    }

    act(() => {
      root.unmount();
    });
  });
});
