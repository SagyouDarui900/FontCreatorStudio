import { FontProject } from '../types';

const DB_NAME = 'FontStudioIndexedDB_v1';
const DB_VERSION = 1;
const STORE_PROJECTS = 'projects';
const STORE_AUTOSAVE = 'autosave_history';

export interface IndexedDBAutoSaveEntry {
  id: string;
  timestamp: number;
  projectName: string;
  glyphCount: number;
  project: FontProject;
}

export interface IndexedDBLoadResult {
  status: 'ok' | 'empty' | 'error';
  project: FontProject | null;
  updatedAt: number;
}

// Shared IndexedDB connection (1-11): opening a new connection for every
// save/load is wasteful and can hit connection limits. Keep one connection
// per module and reconnect only after it closes or fails to open.
let sharedDbPromise: Promise<IDBDatabase> | null = null;

function forgetSharedDb(): void {
  sharedDbPromise = null;
}

/**
 * Open or upgrade the IndexedDB database
 */
export function openFontStudioDB(): Promise<IDBDatabase> {
  if (sharedDbPromise) return sharedDbPromise;

  sharedDbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      sharedDbPromise = null;
      reject(new Error('IndexedDB is not supported in this browser.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Primary project store
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
      }

      // Autosave history rolling snapshots store
      if (!db.objectStoreNames.contains(STORE_AUTOSAVE)) {
        const autoStore = db.createObjectStore(STORE_AUTOSAVE, { keyPath: 'id' });
        autoStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      // Drop the cached connection when it closes or another tab triggers
      // a version change, so the next call opens a fresh one.
      db.addEventListener('close', forgetSharedDb);
      db.addEventListener('versionchange', () => {
        db.close();
        forgetSharedDb();
      });
      resolve(db);
    };

    request.onerror = () => {
      sharedDbPromise = null;
      reject(request.error || new Error('Failed to open IndexedDB.'));
    };
  });

  return sharedDbPromise;
}

/**
 * Save active FontProject to IndexedDB asynchronously.
 * The primary project save and the rolling autosave-history save use
 * separate transactions (1-7): a history failure must not block the
 * primary save. Returns true when the primary save succeeded.
 */
export async function saveProjectToIndexedDB(project: FontProject): Promise<boolean> {
  try {
    const db = await openFontStudioDB();

    const now = Date.now();
    const projectUpdatedAt =
      typeof project.updatedAt === 'number' && Number.isFinite(project.updatedAt) && project.updatedAt > 0
        ? project.updatedAt
        : now;
    const glyphCount = Object.keys(project.glyphs || {}).length;

    // 1. Put primary current project (its own transaction).
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORE_PROJECTS], 'readwrite');
      tx.objectStore(STORE_PROJECTS).put({
        id: 'active_project',
        updatedAt: projectUpdatedAt,
        project,
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('Primary project save was aborted.'));
    });

    // 2. Put rolling autosave entry (separate transaction, best effort).
    // A failure here is logged and ignored: the primary save above
    // already succeeded.
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction([STORE_AUTOSAVE], 'readwrite');
        const autoStore = tx.objectStore(STORE_AUTOSAVE);
        const autoEntry: IndexedDBAutoSaveEntry = {
          id: `auto_${now}_${Math.random().toString(36).substring(2, 6)}`,
          timestamp: projectUpdatedAt,
          projectName: project.name || project.metadata?.familyName || '無題フォント',
          glyphCount,
          project,
        };
        autoStore.put(autoEntry);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error('Autosave history save was aborted.'));
      });
      // Keep only last 15 rolling autosave entries to prevent infinite growth
      void cleanupOldAutosaves(db, 15);
    } catch (historyErr) {
      console.warn('IndexedDB autosave history save failed (primary save succeeded):', historyErr);
    }

    return true;
  } catch (err) {
    console.warn('IndexedDB auto-save failed:', err);
    return false;
  }
}

/**
 * Load active FontProject from IndexedDB.
 * The result distinguishes a read failure from "no data" (1-1):
 * status 'ok' means a project was loaded, 'empty' means no project is
 * stored, and 'error' means the read itself failed. Callers must not
 * treat 'error' as 'empty'.
 */
export async function loadProjectFromIndexedDB(): Promise<IndexedDBLoadResult> {
  try {
    const db = await openFontStudioDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_PROJECTS, 'readonly');
      const store = tx.objectStore(STORE_PROJECTS);
      const request = store.get('active_project');

      request.onsuccess = () => {
        if (request.result && request.result.project) {
          const rawProject = request.result.project as FontProject;
          const fallbackUpdatedAt =
            typeof rawProject?.updatedAt === 'number' && Number.isFinite(rawProject.updatedAt) && rawProject.updatedAt > 0
              ? rawProject.updatedAt
              : (typeof request.result.updatedAt === 'number' && Number.isFinite(request.result.updatedAt)
                  ? request.result.updatedAt
                  : 0);
          resolve({
            status: 'ok',
            project: rawProject,
            updatedAt: fallbackUpdatedAt,
          });
        } else {
          resolve({ status: 'empty', project: null, updatedAt: 0 });
        }
      };

      request.onerror = () => {
        console.warn('Failed to read project from IndexedDB:', request.error);
        resolve({ status: 'error', project: null, updatedAt: 0 });
      };
    });
  } catch (err) {
    console.warn('Failed to read from IndexedDB:', err);
    return { status: 'error', project: null, updatedAt: 0 };
  }
}

/**
 * List rolling autosave history entries from IndexedDB
 */
export async function listAutosaveHistoryFromIndexedDB(): Promise<IndexedDBAutoSaveEntry[]> {
  try {
    const db = await openFontStudioDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_AUTOSAVE, 'readonly');
      const store = tx.objectStore(STORE_AUTOSAVE);
      const index = store.index('timestamp');
      const request = index.getAll();

      request.onsuccess = () => {
        const results: IndexedDBAutoSaveEntry[] = request.result || [];
        // Sort descending by timestamp
        results.sort((a, b) => b.timestamp - a.timestamp);
        resolve(results);
      };

      request.onerror = () => {
        resolve([]);
      };
    });
  } catch (err) {
    console.warn('Failed to list IndexedDB autosave history:', err);
    return [];
  }
}

/**
 * Load specific autosave snapshot from IndexedDB
 */
export async function loadAutosaveEntryFromIndexedDB(id: string): Promise<FontProject | null> {
  try {
    const db = await openFontStudioDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_AUTOSAVE, 'readonly');
      const store = tx.objectStore(STORE_AUTOSAVE);
      const request = store.get(id);

      request.onsuccess = () => {
        if (request.result && request.result.project) {
          resolve(request.result.project as FontProject);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        resolve(null);
      };
    });
  } catch (err) {
    console.warn('Failed to load entry from IndexedDB:', err);
    return null;
  }
}

/**
 * Cleanup old rolling autosaves exceeding maxCount
 */
async function cleanupOldAutosaves(db: IDBDatabase, maxCount: number = 15): Promise<void> {
  if (!db || typeof db.transaction !== 'function') return;
  try {
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_AUTOSAVE, 'readwrite');
      const store = tx.objectStore(STORE_AUTOSAVE);
      const index = store.index('timestamp');
      const request = index.getAll();

      request.onsuccess = () => {
        try {
          const entries: IndexedDBAutoSaveEntry[] = request.result || [];
          if (entries.length > maxCount) {
            entries.sort((a, b) => b.timestamp - a.timestamp);
            const toDelete = entries.slice(maxCount);
            for (const entry of toDelete) {
              store.delete(entry.id);
            }
          }
        } catch (err) {
          console.warn('Error deleting old autosave entry:', err);
        }
      };

      request.onerror = (e) => {
        console.warn('Failed to fetch autosave index for cleanup:', e);
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    });
  } catch (err) {
    console.warn('Error during IndexedDB autosave cleanup:', err);
  }
}

/**
 * Clear all IndexedDB project and autosave data
 */
export async function clearIndexedDBStorage(): Promise<boolean> {
  try {
    const db = await openFontStudioDB();
    return new Promise((resolve) => {
      const tx = db.transaction([STORE_PROJECTS, STORE_AUTOSAVE], 'readwrite');
      tx.objectStore(STORE_PROJECTS).clear();
      tx.objectStore(STORE_AUTOSAVE).clear();

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (err) {
    console.warn('Failed to clear IndexedDB:', err);
    return false;
  }
}
