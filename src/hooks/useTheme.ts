import { useState, useEffect, useCallback } from 'react';
import { ThemeMode, isLightTheme, getThemeClasses, getThemePreset } from '../utils/theme';
import { STORAGE_KEYS, getStorageItem } from '../utils/storageKeys';

export const THEME_STORAGE_KEY = STORAGE_KEYS.THEME_MODE.primary;

const VALID_THEMES: ThemeMode[] = ['light', 'dark', 'sepia', 'warm', 'nord', 'monochrome'];

export interface UseThemeOptions {
  // Called when saving the theme setting fails, so the caller can notify
  // the user. Load failure needs no notification: the light theme is used.
  onSaveError?: () => void;
}

export function useTheme(options?: UseThemeOptions) {
  const onSaveError = options?.onSaveError;
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = getStorageItem(STORAGE_KEYS.THEME_MODE);
    return saved && VALID_THEMES.includes(saved as ThemeMode) ? (saved as ThemeMode) : 'light';
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.THEME_MODE.primary, theme);
    } catch (e) {
      console.warn('Failed to save theme:', e);
      onSaveError?.();
    }
    const preset = getThemePreset(theme);
    // Disable all CSS transitions during theme switch for instantaneous crisp swap
    document.documentElement.setAttribute('data-theme-switching', 'true');
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.toggle('dark', preset.base === 'dark');

    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', preset.previewBg);
    }

    // Force instantaneous style recalculation then remove switching guard on next frame
    const rafId = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.documentElement.removeAttribute('data-theme-switching');
      });
    });
    return () => cancelAnimationFrame(rafId);
  }, [theme, onSaveError]);

  const isLight = isLightTheme(theme);
  const themeClasses = getThemeClasses(theme);
  const currentPreset = getThemePreset(theme);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (isLightTheme(prev) ? 'dark' : 'light'));
  }, []);

  return {
    theme,
    setTheme,
    changeTheme: setTheme,
    toggleTheme,
    isLight,
    themeClasses,
    currentPreset,
  };
}
