// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import App from './App';
import { createDefaultProject } from './utils/font/projectDefaults';
import { sanitizeStoredTraceSettings } from './utils/traceSettings';
import { LOCAL_STORAGE_PROJECT_KEY } from './utils/storageManager';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

// The full editor uses browser APIs jsdom does not provide.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as Record<string, unknown>).ResizeObserver = ResizeObserverStub;
if (typeof window.matchMedia !== 'function') {
  (window as unknown as Record<string, unknown>).matchMedia = () => ({
    matches: false,
    media: '',
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [false, () => {}],
    updateServiceWorker: async () => {},
  }),
}));

function traceTexts(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('text')).map((t) => t.textContent || '');
}

describe('switching glyphs does not trigger an auto-save (L2)', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it('clears the underdrawing text without rewriting the stored project', { timeout: 30000 }, async () => {
    // Seed storage with a project whose underdrawing display character
    // was manually set to 'X' for the current glyph ('あ').
    const seed = createDefaultProject();
    seed.id = 'test-proj-low2';
    seed.createdAt = 1000;
    seed.updatedAt = 1000;
    seed.traceSettings = sanitizeStoredTraceSettings({ text: 'X' });
    const seededJson = JSON.stringify(seed);
    window.localStorage.setItem(LOCAL_STORAGE_PROJECT_KEY, seededJson);

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    try {
      act(() => {
        root.render(<App />);
      });
      await vi.waitFor(
        () => {
          expect(container.textContent).toContain('U+3042');
        },
        { timeout: 10000, interval: 100 }
      );

      // Hydration used the seeded copy; nothing has rewritten storage yet.
      expect(window.localStorage.getItem(LOCAL_STORAGE_PROJECT_KEY)).toBe(seededJson);

      // Wait for the mount effect to flush: the underdrawing stops showing
      // the stored 'X' and follows the selected character ('あ'). Waiting
      // for this also guarantees the keyboard-shortcut listener (a passive
      // effect flushed in the same cycle) is registered before dispatching.
      await vi.waitFor(
        () => {
          expect(traceTexts(container)).toContain('あ');
          expect(traceTexts(container)).not.toContain('X');
        },
        { timeout: 10000, interval: 100 }
      );

      const storedBefore = window.localStorage.getItem(LOCAL_STORAGE_PROJECT_KEY);

      // Switch to the next glyph (Alt+ArrowRight; next after 'あ' is 'ぃ').
      act(() => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'ArrowRight', altKey: true, bubbles: true, cancelable: true })
        );
      });
      await vi.waitFor(
        () => {
          expect(container.textContent).toContain('U+3043');
        },
        { timeout: 10000, interval: 100 }
      );

      // The underdrawing now follows the newly selected character instead
      // of keeping the manually entered 'X'.
      expect(traceTexts(container)).toContain('ぃ');
      expect(traceTexts(container)).not.toContain('X');

      // Wait past the 2000 ms auto-save debounce: a project change caused
      // by the glyph switch would have rewritten storage by now.
      await act(async () => {
        await new Promise((r) => setTimeout(r, 2600));
      });

      const storedAfter = window.localStorage.getItem(LOCAL_STORAGE_PROJECT_KEY);
      expect(storedAfter).toBe(storedBefore);
      expect(JSON.parse(storedAfter as string).updatedAt).toBe(1000);
      expect(JSON.parse(storedAfter as string).traceSettings.text).toBe('X');
    } finally {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    }
  });
});
