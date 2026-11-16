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

// IndexedDB auto-save retry policy: bounded retries, no infinite loop.
const MAX_INDEXEDDB_AUTO_SAVE_RETRIES = 3;
const INDEXEDDB_AUTO_SAVE_RETRY_DELAY_MS = 5000;
const AUTO_SAVE_ERROR_TOAST_THROTTLE_MS = 120000;

interface UseProjectStorageOptions {
  onShowToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export function useProjectStorage({ onShowToast }: UseProjectStorageOptions) {
  const isHydratedRef = useRef(false);
  const lastHydratedUpdatedAtRef = useRef<number | null>(null);
  const [isStorageLoading, setIsStorageLoading] = useState(true);

  // Restore failure state (1-1): set when stored data exists but cannot be
  // loaded or validated. While set, auto-save stays stopped so the stored
  // data is not silently overwritten with a default project. Exposed so
  // App can render it; the failure is also shown with a Toast.
  const [restoreFailed, setRestoreFailed] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const restoreFailedRef = useRef(false);
  const [restoreAttempt, setRestoreAttempt] = useState(0);

  // Auto-save failure state (1-3): retained pending data is kept in
  // pendingIndexedDbProjectRef and can be retried with retryAutoSave.
  const [autoSaveFailed, setAutoSaveFailed] = useState(false);
  const [autoSaveError, setAutoSaveError] = useState<string | null>(null);

  // Initialize with a clean default project while IndexedDB is read
  const [project, setProject] = useState<FontProject>(() => createDefaultProject());
  const projectRef = useRef<FontProject>(project);

  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  // Keep the latest onShowToast in a ref so async callbacks do not capture
  // a stale closure and hydration does not need to re-run when it changes.
  const onShowToastRef = useRef(onShowToast);
  useEffect(() => {
    onShowToastRef.current = onShowToast;
  }, [onShowToast]);

  // Quota warning throttle ref & timers
  const lastQuotaWarningRef = useRef<number>(0);
  const lastAutoSaveErrorToastRef = useRef<number>(0);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const indexedDbSaveInFlightRef = useRef(false);
  const pendingIndexedDbProjectRef = useRef<FontProject | null>(null);
  const autoSaveRetryCountRef = useRef<number>(0);
  const autoSaveRetryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const saveProjectToIndexedDbWhenIdleRef = useRef<(nextProject: FontProject) => Promise<void>>(async () => {});

  const saveProjectToIndexedDbWhenIdle = useCallback(async (nextProject: FontProject) => {
    if (!isHydratedRef.current) return;
    if (restoreFailedRef.current) return;
    pendingIndexedDbProjectRef.current = nextProject;
    if (indexedDbSaveInFlightRef.current) return;

    indexedDbSaveInFlightRef.current = true;
    try {
      while (pendingIndexedDbProjectRef.current) {
        const projectToSave = pendingIndexedDbProjectRef.current;
        pendingIndexedDbProjectRef.current = null;
        const saved = await saveProjectToIndexedDB(projectToSave);
        if (!saved) {
          // Keep the pending data for retry instead of dropping it.
          pendingIndexedDbProjectRef.current = projectToSave;
          autoSaveRetryCountRef.current += 1;
          if (autoSaveRetryCountRef.current <= MAX_INDEXEDDB_AUTO_SAVE_RETRIES) {
            if (!autoSaveRetryTimerRef.current) {
              autoSaveRetryTimerRef.current = setTimeout(() => {
                autoSaveRetryTimerRef.current = null;
                const pending = pendingIndexedDbProjectRef.current;
                if (pending) {
                  void saveProjectToIndexedDbWhenIdleRef.current(pending);
                }
              }, INDEXEDDB_AUTO_SAVE_RETRY_DELAY_MS);
            }
          } else {
            const message = '自動保存に失敗しました。編集内容は保持されています。再試行してください。';
            setAutoSaveFailed(true);
            setAutoSaveError(message);
            onShowToastRef.current(message, 'error');
          }
          break;
        }
        autoSaveRetryCountRef.current = 0;
        setAutoSaveFailed(false);
        setAutoSaveError(null);
      }
    } finally {
      indexedDbSaveInFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    saveProjectToIndexedDbWhenIdleRef.current = saveProjectToIndexedDbWhenIdle;
  }, [saveProjectToIndexedDbWhenIdle]);

  // Clear a pending retry timer on unmount.
  useEffect(() => {
    return () => {
      if (autoSaveRetryTimerRef.current) {
        clearTimeout(autoSaveRetryTimerRef.current);
        autoSaveRetryTimerRef.current = null;
      }
    };
  }, []);

  const retryAutoSave = useCallback(() => {
    autoSaveRetryCountRef.current = 0;
    setAutoSaveFailed(false);
    setAutoSaveError(null);
    if (!isHydratedRef.current || restoreFailedRef.current) return;
    const pending = pendingIndexedDbProjectRef.current ?? projectRef.current;
    void saveProjectToIndexedDbWhenIdle(pending);
  }, [saveProjectToIndexedDbWhenIdle]);

  // Priority 1: Hydrate from IndexedDB (Source of Truth) as top priority on initial mount
  useEffect(() => {
    let isCancelled = false;

    async function hydrateInitialStorage() {
      // Reset the failure flag for a fresh attempt (including retryRestore).
      restoreFailedRef.current = false;
      setRestoreFailed(false);
      setRestoreError(null);
      let storedDataFound = false;
      let restoreFailure: string | null = null;

      try {
        // 1. Try reading from IndexedDB
        const dbData = await loadProjectFromIndexedDB();
        if (dbData && dbData.project) {
          storedDataFound = true;
          const validatedDb = validateStoredFontProject(dbData.project);
          if (validatedDb && !isCancelled) {
            projectRef.current = validatedDb;
            lastHydratedUpdatedAtRef.current = validatedDb.updatedAt ?? null;
            setProject(validatedDb);
            isHydratedRef.current = true;
            setIsStorageLoading(false);
            return;
          }
          restoreFailure = 'IndexedDBに保存されたプロジェクトデータが無効なため、復元できませんでした。';
        }

        // 2. Fallback to LocalStorage if IndexedDB has no existing project
        try {
          const savedLocal = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (savedLocal) {
            storedDataFound = true;
            let parsed: unknown;
            try {
              parsed = JSON.parse(savedLocal);
            } catch (e) {
              console.warn('LocalStorage data failed JSON parsing:', e);
              restoreFailure = 'LocalStorageに保存されたプロジェクトデータの読み込みに失敗しました。';
              parsed = undefined;
            }
            if (parsed !== undefined) {
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
              restoreFailure = 'LocalStorageに保存されたプロジェクトデータが無効なため、復元できませんでした。';
            }
          }
        } catch (e) {
          console.warn('LocalStorage data failed integrity validation:', e);
          storedDataFound = true;
          restoreFailure = 'LocalStorageに保存されたプロジェクトデータの読み込みに失敗しました。';
        }

        // 3. Fallback to fresh default project if nothing was in storage.
        // If stored data existed but could not be restored, do not silently
        // overwrite it with a default project: keep the default only in
        // memory, leave hydration incomplete so auto-save stays stopped,
        // and wait for the user to choose retry or discard.
        if (!isCancelled) {
          if (storedDataFound && restoreFailure) {
            restoreFailedRef.current = true;
            setRestoreFailed(true);
            setRestoreError(restoreFailure);
            setIsStorageLoading(false);
            onShowToastRef.current(
              `${restoreFailure} 新規プロジェクトで開始するか、復元を再試行してください。`,
              'error'
            );
            return;
          }
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
          // Same as above: report the failure and stop auto-save instead of
          // silently starting from a default project.
          const message = '保存されたプロジェクトデータの読み込みに失敗しました。';
          restoreFailedRef.current = true;
          setRestoreFailed(true);
          setRestoreError(message);
          setIsStorageLoading(false);
          onShowToastRef.current(
            `${message} 新規プロジェクトで開始するか、復元を再試行してください。`,
            'error'
          );
        }
      }
    }

    void hydrateInitialStorage();

    return () => {
      isCancelled = true;
    };
  }, [restoreAttempt]);

  // Retry hydration after a restore failure, chosen by the user.
  const retryRestore = useCallback(() => {
    restoreFailedRef.current = false;
    setRestoreFailed(false);
    setRestoreError(null);
    setIsStorageLoading(true);
    setRestoreAttempt((attempt) => attempt + 1);
  }, []);

  // Discard the unrestorable stored data and start from a default project,
  // chosen by the user. Only after this choice does auto-save resume and
  // overwrite the stored data with the default project.
  const discardCorruptDataAndStartFresh = useCallback(() => {
    const defaultProject = createDefaultProject();
    projectRef.current = defaultProject;
    lastHydratedUpdatedAtRef.current = defaultProject.updatedAt ?? null;
    restoreFailedRef.current = false;
    setRestoreFailed(false);
    setRestoreError(null);
    setProject(defaultProject);
    isHydratedRef.current = true;
    setIsStorageLoading(false);
    onShowToastRef.current('破損した保存データを破棄し、新規プロジェクトで開始します。', 'warning');
  }, []);

  // Auto-save effect: ONLY runs after hydration is complete to prevent overwriting IndexedDB with stale/default data
  useEffect(() => {
    if (isStorageLoading || !isHydratedRef.current || restoreFailedRef.current) {
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
      if (!isHydratedRef.current || restoreFailedRef.current) return;

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
          onShowToastRef.current(
            'プロジェクトが大容量のためLocalStorage上限を超過しました。IndexedDBに完全保存されています。',
            'info'
          );
        } else if (!isQuota && Date.now() - lastAutoSaveErrorToastRef.current > AUTO_SAVE_ERROR_TOAST_THROTTLE_MS) {
          lastAutoSaveErrorToastRef.current = Date.now();
          onShowToastRef.current(
            '自動保存の一部（LocalStorageへの書き込み）に失敗しました。編集内容は保持されています。',
            'error'
          );
        }
      }
    }, 2000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [isStorageLoading, project.updatedAt, saveProjectToIndexedDbWhenIdle]);

  // Persist the recovery copy before leaving (guarded against saving pre-hydration)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!isHydratedRef.current || restoreFailedRef.current) return;
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(projectRef.current));
        setLastAutoSaveTimestamp(Date.now());
      } catch (error) {
        console.warn('Final localStorage project save failed:', error);
      }
      // Best-effort IndexedDB save of the latest edits before the page closes.
      // IndexedDB writes are asynchronous and may not complete before unload;
      // the synchronous LocalStorage write above is the copy that is
      // guaranteed to be attempted here.
      void saveProjectToIndexedDbWhenIdleRef.current(projectRef.current);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (!isHydratedRef.current || restoreFailedRef.current) return;
        // Flush any scheduled retry immediately instead of waiting for it.
        if (autoSaveRetryTimerRef.current) {
          clearTimeout(autoSaveRetryTimerRef.current);
          autoSaveRetryTimerRef.current = null;
        }
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(projectRef.current));
          setLastAutoSaveTimestamp(Date.now());
        } catch (error) {
          console.warn('Visibility-change project save failed:', error);
          onShowToastRef.current('終了直前のLocalStorageへの保存に失敗しました。IndexedDBへの保存を試みます。', 'error');
        }
        void saveProjectToIndexedDbWhenIdle(projectRef.current);
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
    restoreFailed,
    restoreError,
    retryRestore,
    discardCorruptDataAndStartFresh,
    autoSaveFailed,
    autoSaveError,
    retryAutoSave,
  };
}
