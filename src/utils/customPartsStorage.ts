import { CustomPart, NodeType, PartCategory } from '../types';
import { KANJI_RADICALS } from '../data/kanjiRadicals';
import { generateId } from './path';

const DB_NAME = 'FontEditorPartsDB';
const DB_VERSION = 1;
const STORE_NAME = 'custom_parts';
export const LOCAL_STORAGE_KEY = 'font_editor_custom_parts_v1';

/**
 * カスタムパーツの保存が一度でも成功したことを示す LocalStorage フラグ。
 * 保存データが存在しない状態と、ユーザーが全パーツを削除して空になった状態を
 * 区別するために使う。フラグがない場合だけ初回起動とみなし、既定パーツを表示する。
 */
export const CUSTOM_PARTS_INITIALIZED_KEY = 'font_editor_custom_parts_initialized_v1';

export function isCustomPartsInitialized(): boolean {
  try {
    return localStorage.getItem(CUSTOM_PARTS_INITIALIZED_KEY) === '1';
  } catch {
    return false;
  }
}

export function markCustomPartsInitialized(): void {
  try {
    localStorage.setItem(CUSTOM_PARTS_INITIALIZED_KEY, '1');
  } catch {
    // ignore
  }
}

/**
 * 初回起動時に表示する既定の 5 件のパーツ。
 * ドロワーと radicalStudio で同じ内容を使う。
 */
export function buildDefaultCustomParts(): CustomPart[] {
  return [
    {
      id: generateId(),
      name: 'さんずい (氵)',
      category: 'hen',
      description: '三水・水に関する偏',
      contours: KANJI_RADICALS.find((r) => r.id === 'rad_sanzui')?.contours || [],
      createdAt: Date.now() - 5000,
    },
    {
      id: generateId(),
      name: 'きへん (木)',
      category: 'hen',
      description: '木偏・樹木に関する偏',
      contours: KANJI_RADICALS.find((r) => r.id === 'rad_kihen')?.contours || [],
      createdAt: Date.now() - 4000,
    },
    {
      id: generateId(),
      name: 'にんべん (亻)',
      category: 'hen',
      description: '人偏・人間に関する偏',
      contours: KANJI_RADICALS.find((r) => r.id === 'rad_ninben')?.contours || [],
      createdAt: Date.now() - 3000,
    },
    {
      id: generateId(),
      name: 'ごんべん (言)',
      category: 'hen',
      description: '言偏・言葉に関する偏',
      contours: KANJI_RADICALS.find((r) => r.id === 'rad_gonben')?.contours || [],
      createdAt: Date.now() - 2000,
    },
    {
      id: generateId(),
      name: 'くさかんむり (艹)',
      category: 'kanmuri',
      description: '草冠・植物に関する冠',
      contours: KANJI_RADICALS.find((r) => r.id === 'rad_kusakanmuri')?.contours || [],
      createdAt: Date.now() - 1000,
    },
  ];
}

const VALID_PART_CATEGORIES: PartCategory[] = [
  'all',
  'hen',
  'tsukuri',
  'kanmuri',
  'ashi',
  'tare',
  'nyo',
  'kamae',
  'stroke',
  'geometric',
  'kana',
  'other',
];

function isFinitePoint(p: unknown): p is { x: number; y: number } {
  return (
    !!p &&
    typeof p === 'object' &&
    Number.isFinite((p as { x: unknown }).x) &&
    Number.isFinite((p as { y: unknown }).y)
  );
}

function sanitizeHandle(handle: unknown): { x: number; y: number } | null {
  return isFinitePoint(handle) ? { x: handle.x, y: handle.y } : null;
}

/**
 * Validate and normalize raw custom-part data from any load or import route.
 * - Node x/y must be finite numbers; nodes with non-finite coordinates are dropped.
 * - handleIn / handleOut x/y must be finite numbers; invalid handles become null.
 * - category must be one of the PartCategory values; anything else becomes 'other'.
 * - Duplicate ids (part, contour, or node) are replaced with a new id.
 * - Non-object entries, parts without a usable name, and contours left with
 *   no valid nodes are dropped.
 */
export function sanitizeCustomParts(rawParts: unknown): CustomPart[] {
  if (!Array.isArray(rawParts)) return [];
  const seenIds = new Set<string>();
  const uniqueId = (rawId: unknown): string => {
    const id = typeof rawId === 'string' && rawId.length > 0 ? rawId : generateId();
    if (seenIds.has(id)) return generateId();
    seenIds.add(id);
    return id;
  };

  const sanitized: CustomPart[] = [];
  for (const raw of rawParts) {
    if (!raw || typeof raw !== 'object') continue;
    const p = raw as Record<string, unknown>;
    const contours: CustomPart['contours'] = [];
    if (Array.isArray(p.contours)) {
      for (const rawContour of p.contours) {
        if (!rawContour || typeof rawContour !== 'object') continue;
        const c = rawContour as Record<string, unknown>;
        if (!Array.isArray(c.nodes)) continue;
        const nodes = [];
        for (const rawNode of c.nodes) {
          if (!isFinitePoint(rawNode)) continue;
          const n = rawNode as Record<string, unknown>;
          nodes.push({
            id: uniqueId(n.id),
            x: (rawNode as { x: number }).x,
            y: (rawNode as { y: number }).y,
            handleIn: sanitizeHandle(n.handleIn),
            handleOut: sanitizeHandle(n.handleOut),
            type: (n.type === 'smooth' || n.type === 'symmetric' ? n.type : 'corner') as NodeType,
          });
        }
        if (nodes.length === 0) continue;
        contours.push({
          id: uniqueId(c.id),
          closed: Boolean(c.closed),
          nodes,
        });
      }
    }
    sanitized.push({
      id: uniqueId(p.id),
      name: typeof p.name === 'string' && p.name.length > 0 ? p.name : 'パーツ',
      char: typeof p.char === 'string' ? p.char : undefined,
      category: VALID_PART_CATEGORIES.includes(p.category as PartCategory)
        ? (p.category as PartCategory)
        : 'other',
      description: typeof p.description === 'string' ? p.description : '',
      contours,
      createdAt: typeof p.createdAt === 'number' && Number.isFinite(p.createdAt) ? p.createdAt : Date.now(),
      updatedAt:
        typeof p.updatedAt === 'number' && Number.isFinite(p.updatedAt) ? p.updatedAt : undefined,
      tags: Array.isArray(p.tags)
        ? (p.tags as unknown[]).filter((t): t is string => typeof t === 'string')
        : undefined,
    });
  }
  return sanitized;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function forgetDb(): void {
  dbPromise = null;
}

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      dbPromise = null;
      reject(new Error('IndexedDB is not supported'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      // Drop the cached connection when it closes or another tab triggers
      // a version change, so the next call opens a fresh one.
      db.addEventListener('close', forgetDb);
      db.addEventListener('versionchange', () => {
        db.close();
        forgetDb();
      });
      resolve(db);
    };

    request.onerror = () => {
      console.error('IndexedDB open error:', request.error);
      // Forget the rejected promise so the next call retries opening
      // the database instead of reusing the rejection.
      dbPromise = null;
      reject(request.error);
    };
  });

  return dbPromise;
}

function dispatchCustomPartsUpdated(): void {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('font_custom_parts_updated'));
  }
}

/**
 * Optimize / compact custom parts contours (round node coordinates to 2 decimal places)
 * to drastically reduce memory footprint and payload size.
 * Nodes with non-finite coordinates are excluded instead of being rounded,
 * and invalid handles are dropped, so Math.round never receives NaN.
 */
export function compactCustomParts(parts: CustomPart[]): CustomPart[] {
  if (!parts) return [];
  return parts.map((p) => ({
    ...p,
    contours: (p.contours || [])
      .map((c) => ({
        ...c,
        nodes: (c.nodes || []).filter((n) => Number.isFinite(n.x) && Number.isFinite(n.y)).map((n) => ({
          ...n,
          x: Math.round(n.x * 100) / 100,
          y: Math.round(n.y * 100) / 100,
          handleIn:
            n.handleIn && Number.isFinite(n.handleIn.x) && Number.isFinite(n.handleIn.y)
              ? {
                  x: Math.round(n.handleIn.x * 100) / 100,
                  y: Math.round(n.handleIn.y * 100) / 100,
                }
              : null,
          handleOut:
            n.handleOut && Number.isFinite(n.handleOut.x) && Number.isFinite(n.handleOut.y)
              ? {
                  x: Math.round(n.handleOut.x * 100) / 100,
                  y: Math.round(n.handleOut.y * 100) / 100,
                }
              : null,
        })),
      }))
      .filter((c) => c.nodes.length > 0),
  }));
}

/**
 * Load custom parts from IndexedDB with fallback & automatic migration from localStorage
 */
export async function loadCustomParts(): Promise<CustomPart[]> {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    const parts = await new Promise<CustomPart[]>((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result as CustomPart[]);
      req.onerror = () => reject(req.error);
    });

    if (parts && parts.length > 0) {
      return sanitizeCustomParts(parts).sort(
        (a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt)
      );
    }

    // IndexedDB is empty but already initialized: the user deleted all
    // parts (or saved an empty list). Do not read the LocalStorage
    // fallback, or the old copy would come back.
    if (isCustomPartsInitialized()) {
      return [];
    }
  } catch (err) {
    console.warn('Failed to load from IndexedDB, trying localStorage fallback:', err);
  }

  // Fallback & automatic migration from localStorage. This runs only when
  // IndexedDB has never been initialized, or when the IndexedDB read
  // itself failed and the stored state is unknown.
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed: CustomPart[] = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const sanitized = sanitizeCustomParts(parsed);
        if (sanitized.length === 0) return [];
        // Migrate to IndexedDB and wait for it to finish, so the
        // LocalStorage copy is not left behind when the tab closes
        // before the asynchronous migration runs.
        await saveCustomParts(sanitized);
        try {
          // Remove from localStorage to clear quota
          localStorage.removeItem(LOCAL_STORAGE_KEY);
        } catch {
          // ignore
        }
        return sanitized;
      }
    }
  } catch (e) {
    console.error('LocalStorage load error:', e);
  }

  return [];
}

export interface SaveCustomPartsResult {
  /** 全件が IndexedDB または LocalStorage のいずれかに保存された場合 true */
  ok: boolean;
  /** IndexedDB 保存に失敗し LocalStorage へ退避した件数（IndexedDB 保存成功時は 0） */
  fallbackSavedCount: number;
  /** 容量超過で LocalStorage への退避から除外した件数 */
  fallbackDroppedCount: number;
}

function getPartRecency(p: CustomPart): number {
  return p.updatedAt || p.createdAt || 0;
}

/**
 * IndexedDB 保存に失敗した場合の LocalStorage への退避。
 * 全件の書き込みを試み、容量を超える場合は古いパーツから順に除外して書き直す。
 * 除外した件数は戻り値に含める。
 */
function saveToLocalStorageFallback(compacted: CustomPart[]): SaveCustomPartsResult {
  // 新しい順に並べ、末尾（最も古いもの）から除外できるようにする
  const byRecency = [...compacted].sort((a, b) => getPartRecency(b) - getPartRecency(a));
  let remaining = byRecency;
  let dropped = 0;

  while (remaining.length > 0) {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(remaining));
      markCustomPartsInitialized();
      dispatchCustomPartsUpdated();
      return {
        ok: dropped === 0,
        fallbackSavedCount: remaining.length,
        fallbackDroppedCount: dropped,
      };
    } catch {
      // 容量超過などの書き込み失敗時は最も古い 1 件を除外して書き直す
      remaining = remaining.slice(0, remaining.length - 1);
      dropped += 1;
    }
  }

  return {
    ok: false,
    fallbackSavedCount: 0,
    fallbackDroppedCount: compacted.length,
  };
}

/**
 * Save custom parts asynchronously to IndexedDB (bypasses 5MB localStorage limit)
 */
export async function saveCustomParts(parts: CustomPart[]): Promise<SaveCustomPartsResult> {
  const compacted = compactCustomParts(parts);

  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const existingKeys = await new Promise<IDBValidKey[]>((resolve, reject) => {
      const keysReq = store.getAllKeys();
      keysReq.onsuccess = () => resolve(keysReq.result);
      keysReq.onerror = () => reject(keysReq.error);
    });
    const nextIds = new Set(compacted.map((item) => item.id));
    for (const key of existingKeys) {
      if (typeof key === 'string' && !nextIds.has(key)) {
        store.delete(key);
      }
    }

    for (const item of compacted) {
      store.put(item);
    }

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    markCustomPartsInitialized();
    // A copy written to LocalStorage as a fallback while IndexedDB
    // saving failed must not remain after a later successful save.
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch {
      // ignore
    }
    dispatchCustomPartsUpdated();
    return { ok: true, fallbackSavedCount: 0, fallbackDroppedCount: 0 };
  } catch (err) {
    console.error('Failed to save to IndexedDB:', err);

    // Emergency fallback to localStorage: write all parts, dropping the oldest
    // first when the quota is exceeded. The dropped count is reported to the caller.
    try {
      return saveToLocalStorageFallback(compacted);
    } catch {
      return { ok: false, fallbackSavedCount: 0, fallbackDroppedCount: compacted.length };
    }
  }
}

/**
 * Delete all custom parts from IndexedDB and LocalStorage.
 * The initialized flag is kept: an empty store with the flag set means
 * the user deleted all parts, and loadCustomParts must return an empty
 * array instead of falling back to an old LocalStorage copy or showing
 * the default parts again.
 */
export async function deleteCustomParts(): Promise<boolean> {
  try {
    const db = await getDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('Custom parts clear was aborted.'));
    });
  } catch (err) {
    console.warn('Failed to clear custom parts from IndexedDB:', err);
  }
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  } catch {
    // ignore
  }
  dispatchCustomPartsUpdated();
  return true;
}
