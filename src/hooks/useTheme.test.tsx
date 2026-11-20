// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { useTheme } from './useTheme';
import { STORAGE_KEYS } from '../utils/storageKeys';
import { getThemePreset, ThemeMode } from '../utils/theme';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

describe('useTheme persistence and DOM synchronization', () => {
  let metaEl: HTMLMetaElement;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.classList.remove('dark');
    metaEl = document.createElement('meta');
    metaEl.name = 'theme-color';
    metaEl.content = '#f4f7f5';
    document.head.appendChild(metaEl);
  });

  afterEach(() => {
    metaEl.remove();
    localStorage.clear();
  });

  it('migrates legacy font_editor_theme_mode key and syncs html.dark + theme-color across all 6 themes', () => {
    localStorage.setItem(STORAGE_KEYS.THEME_MODE.legacy![0], 'nord');

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    let api!: ReturnType<typeof useTheme>;
    function Harness() {
      api = useTheme();
      return null;
    }

    act(() => {
      root.render(<Harness />);
    });

    expect(api.theme).toBe('nord');
    expect(document.documentElement.getAttribute('data-theme')).toBe('nord');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem(STORAGE_KEYS.THEME_MODE.primary)).toBe('nord');
    expect(metaEl.getAttribute('content')).toBe(getThemePreset('nord').previewBg);

    const expectedDark: Record<ThemeMode, boolean> = {
      light: false,
      sepia: false,
      warm: false,
      monochrome: false,
      dark: true,
      nord: true,
    };

    for (const mode of Object.keys(expectedDark) as ThemeMode[]) {
      act(() => {
        api.changeTheme(mode);
      });
      expect(document.documentElement.getAttribute('data-theme')).toBe(mode);
      expect(document.documentElement.classList.contains('dark')).toBe(expectedDark[mode]);
      expect(metaEl.getAttribute('content')).toBe(getThemePreset(mode).previewBg);
      expect(localStorage.getItem(STORAGE_KEYS.THEME_MODE.primary)).toBe(mode);
    }

    act(() => {
      root.unmount();
    });
    container.remove();
  });
});
