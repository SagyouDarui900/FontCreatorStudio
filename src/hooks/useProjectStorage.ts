import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FontProject } from '../types';
import { createDefaultProject, validateStoredFontProject } from '../utils/font';
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
  const isHydratedRef = useRef(false);
  const lastHydratedUpdatedAtRef = useRef<number | null>(null);
  const [isStorageLoading, setIsStorageLoading] = useState(true);

  // Initialize with a clean default project while IndexedDB is read
  const [project, setProject] = useState<FontProject>(() => createDefaultProject());
  const projectRef = useRef<FontProject>(project);

  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  // Quota warning throttle ref & timers
  const lastQuotaWarningRef = useRef<number>(0);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const indexedDbSaveInFlightRef = useRef(false);
  const pendingIndexedDbProjectRef = useRef<FontProject | null>(null);

  const saveProjectToIndexedDbWhenIdle = useCallback(async (nextProject: FontProject) => {
    if (!isHydratedRef.current) return;
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

  // Priority 1: Hydrate from IndexedDB (Source of Truth) as top priority on initial mount
  useEffect(() => {
    let isCancelled = false;

    async function hydrateInitialStorage() {
      try {
        // 1. Try reading from IndexedDB
        const dbData = await loadProjectFromIndexedDB();
        if (dbData && dbData.project) {
          const validatedDb = validateStoredFontProject(dbData.project);
          if (validatedDb && !isCancelled) {
            projectRef.current = validatedDb;
            lastHydratedUpdatedAtRef.current = validatedDb.updatedAt ?? null;
            setProject(validatedDb);
            isHydratedRef.current = true;
            setIsStorageLoading(false);
            return;
          }
        }

        // 2. Fallback to LocalStorage if IndexedDB has no existing project
        try {
          const savedLocal = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (savedLocal) {
            const parsed = JSON.parse(savedLocal);
            const validatedLocal = validateStoredFontProject(parsed);
            if (validatedLocal && !isCancelled) {
              projectRef.current = validatedLocal;
              lastHydratedUpdatedAtRef.current = validatedLocal.updatedAt ?? null;
              setProject(validatedLocal);
              isHydratedRef.current = true;
              setIsStorageLoading(false);
              // Migrate LocalStorage project to IndexedDB for safety
              void saveProjectToIndexedDB(validatedLocal);
              return;
            }
          }
        } catch (e) {
          console.warn('LocalStorage data failed integrity validation:', e);
        }

        // 3. Fallback to fresh default project if nothing was in storage
        if (!isCancelled) {
          const defaultProject = createDefaultProject();
          projectRef.current = defaultProject;
          lastHydratedUpdatedAtRef.current = defaultProject.updatedAt ?? null;
          setProject(defaultProject);
          isHydratedRef.current = true;
          setIsStorageLoading(false);
        }
      } catch (err) {
        console.warn('Failed to load project from storage:', err);
        if (!isCancelled) {
          isHydratedRef.current = true;
          setIsStorageLoading(false);
        }
      }
    }

    void hydrateInitialStorage();

    return () => {
      isCancelled = true;
    };
  }, []);

  // Auto-save effect: ONLY runs after hydration is complete to prevent overwriting IndexedDB with stale/default data
  useEffect(() => {
    if (isStorageLoading || !isHydratedRef.current) {
      return;
    }
    if (lastHydratedUpdatedAtRef.current !== null && project.updatedAt === lastHydratedUpdatedAtRef.current) {
      return;
    }
    lastHydratedUpdatedAtRef.current = null;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      if (!isHydratedRef.current) return;

      // 1. Write to IndexedDB (Primary Source of Truth, no 5MB quota constraint)
      void saveProjectToIndexedDbWhenIdle(projectRef.current);

      // 2. Best-effort mirror to LocalStorage (may fail gracefully on quota exceeded)
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(projectRef.current));
        setLastAutoSaveTimestamp(Date.now());
      } catch (e: any) {
        const isQuota =
          e?.name === 'QuotaExceededError' ||
          e?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
          e?.code === 22 ||
          e?.code === 1014;
        if (isQuota && Date.now() - lastQuotaWarningRef.current > 120000) {
          lastQuotaWarningRef.current = Date.now();
          onShowToast(
            'プロジェクトが大容量のためLocalStorage上限を超過しました。IndexedDBに完全保存されています。',
            'info'
          );
        }
      }
    }, 2000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [isStorageLoading, project.updatedAt, onShowToast, saveProjectToIndexedDbWhenIdle]);

  // Persist the recovery copy before leaving (guarded against saving pre-hydration)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!isHydratedRef.current) return;
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(projectRef.current));
        setLastAutoSaveTimestamp(Date.now());
      } catch (error) {
        console.warn('Final localStorage project save failed:', error);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (!isHydratedRef.current) return;
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
    isStorageLoading,
  };
}
