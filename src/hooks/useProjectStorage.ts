import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FontProject } from '../types';
import { createDefaultProject, validateStoredFontProject } from '../utils/font';
import { DEFAULT_SAMPLE_GLYPHS, isLegacyMockGlyph } from '../data/defaultSampleGlyphs';
import {
  setLastAutoSaveTimestamp,
  LOCAL_STORAGE_PROJECT_KEY,
  saveProjectToIndexedDB,
  loadProjectFromIndexedDB,
} from '../utils/storageManager';

export const LOCAL_STORAGE_KEY = LOCAL_STORAGE_PROJECT_KEY;

interface UseProjectStorageOptions {
  onShowToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export function useProjectStorage({ onShowToast }: UseProjectStorageOptions) {
  const corruptedStorageDetectedRef = useRef(false);

  // Main Project State with LocalStorage hydration and input validation
  const [project, setProject] = useState<FontProject>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const validated = validateStoredFontProject(parsed);
        if (validated) {
          // Detect legacy/deformed mock sample glyphs and seamlessly upgrade them to authentic outlines
          let upgraded = false;
          const updatedGlyphs = { ...validated.glyphs };
          for (const u of [65, 12354, 26085]) {
            if (updatedGlyphs[u] && isLegacyMockGlyph(updatedGlyphs[u])) {
              updatedGlyphs[u] = JSON.parse(JSON.stringify(DEFAULT_SAMPLE_GLYPHS[u]));
              upgraded = true;
            }
          }
          if (upgraded) {
            validated.glyphs = updatedGlyphs;
          }
          return validated;
        } else {
          corruptedStorageDetectedRef.current = true;
          console.warn('LocalStorage data failed integrity validation; falling back to default project.');
        }
      }
    } catch (e) {
      corruptedStorageDetectedRef.current = true;
      console.warn('Failed to load project from localStorage:', e);
    }
    return createDefaultProject();
  });

  const projectRef = useRef<FontProject>(project);
  const initialUpdatedAtRef = useRef<number>(project.updatedAt || 0);
  const hasUserEditedSinceMountRef = useRef(false);

  useEffect(() => {
    projectRef.current = project;
    if ((project.updatedAt || 0) !== initialUpdatedAtRef.current) {
      hasUserEditedSinceMountRef.current = true;
    }
  }, [project]);

  // Show warning if corrupted localStorage was detected and sanitized
  useEffect(() => {
    if (corruptedStorageDetectedRef.current) {
      onShowToast('保存データが破損していたため、安全な初期プロジェクトを読み込みました', 'warning');
      corruptedStorageDetectedRef.current = false;
    }
  }, [onShowToast]);

  // Quota warning throttle ref & timers
  const lastQuotaWarningRef = useRef<number>(0);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const indexedDbSaveInFlightRef = useRef(false);
  const pendingIndexedDbProjectRef = useRef<FontProject | null>(null);

  const saveProjectToIndexedDbWhenIdle = useCallback(async (nextProject: FontProject) => {
    pendingIndexedDbProjectRef.current = nextProject;
    if (indexedDbSaveInFlightRef.current) return;

    indexedDbSaveInFlightRef.current = true;
    try {
      while (pendingIndexedDbProjectRef.current) {
        const projectToSave = pendingIndexedDbProjectRef.current;
        pendingIndexedDbProjectRef.current = null;
        const saved = await saveProjectToIndexedDB(projectToSave);
        if (!saved) {
          console.warn('Background IndexedDB auto-save did not complete.');
        }
      }
    } finally {
      indexedDbSaveInFlightRef.current = false;
    }
  }, []);

  // Check IndexedDB for a newer auto-saved version on initial mount
  useEffect(() => {
    loadProjectFromIndexedDB()
      .then((dbData) => {
        // If user already edited while IndexedDB was loading, ABORT restore to avoid overwriting edits
        if (hasUserEditedSinceMountRef.current) {
          return;
        }

        if (dbData && dbData.project) {
          const validated = validateStoredFontProject(dbData.project);
          if (!validated) {
            console.warn('IndexedDB auto-save data failed integrity validation; recovery skipped.');
            return;
          }

          const localUpdatedAt = projectRef.current?.updatedAt || 0;
          const dbUpdatedAt = dbData.updatedAt || validated.updatedAt || 0;

          // Only restore if IndexedDB data is strictly newer than current local project
          if (dbUpdatedAt > localUpdatedAt + 1000) {
            // Check once more that no user edit occurred in between
            if (hasUserEditedSinceMountRef.current) return;
            setProject(validated);
            onShowToast('IndexedDBから最新の自動保存プロジェクトを復元しました', 'success');
          }
        }
      })
      .catch((err) => {
        console.warn('IndexedDB initial recovery check failed:', err);
      });
  }, [onShowToast]);

  // LocalStorage is the synchronous recovery copy; IndexedDB is written in the background.
  useEffect(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      // 1. Write to LocalStorage
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(projectRef.current));
        setLastAutoSaveTimestamp(Date.now());
      } catch (e: any) {
        console.warn('Auto-save to localStorage failed:', e);
        const isQuota =
          e?.name === 'QuotaExceededError' ||
          e?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
          e?.code === 22 ||
          e?.code === 1014;
        if (isQuota && Date.now() - lastQuotaWarningRef.current > 120000) {
          lastQuotaWarningRef.current = Date.now();
          onShowToast(
            'LocalStorage容量上限に達しました。IndexedDBへのバックグラウンド保存を試行しています。',
            'warning'
          );
        }
      }

      void saveProjectToIndexedDbWhenIdle(projectRef.current);
    }, 2000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [project.updatedAt, onShowToast, saveProjectToIndexedDbWhenIdle]);

  // Persist the synchronous recovery copy before leaving
  useEffect(() => {
    const handleBeforeUnload = () => {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(projectRef.current));
        setLastAutoSaveTimestamp(Date.now());
      } catch (error) {
        console.warn('Final localStorage project save failed:', error);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(projectRef.current));
          setLastAutoSaveTimestamp(Date.now());
          void saveProjectToIndexedDbWhenIdle(projectRef.current);
        } catch (error) {
          console.warn('Visibility-change project save failed:', error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [saveProjectToIndexedDbWhenIdle]);

  return {
    project,
    setProject,
    projectRef,
    saveProjectToIndexedDbWhenIdle,
  };
}
