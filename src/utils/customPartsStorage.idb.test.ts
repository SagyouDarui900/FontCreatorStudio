import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { CustomPart } from '../types';

// In-memory IndexedDB stub: only the surface customPartsStorage uses.
// Requests resolve on a microtask; transactions complete on a timer, so
// every request scheduled before the transaction finishes first.

class FakeRequest<T = unknown> {
  result: T | undefined = undefined;
  error: unknown = null;
  onsuccess: ((event: unknown) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;

  fireSuccess(result: T): void {
    this.result = result;
    queueMicrotask(() => this.onsuccess?.({ target: this }));
  }

  fireError(error: unknown): void {
    this.error = error;
    queueMicrotask(() => this.onerror?.({ target: this }));
  }
}

class FakeObjectStore {
  constructor(private map: Map<string, unknown>) {}

  getAll(): FakeRequest<unknown[]> {
    const req = new FakeRequest<unknown[]>();
    req.fireSuccess([...this.map.values()]);
    return req;
  }

  getAllKeys(): FakeRequest<unknown[]> {
    const req = new FakeRequest<unknown[]>();
    req.fireSuccess([...this.map.keys()]);
    return req;
  }

  put(value: { id: string }): FakeRequest<void> {
    this.map.set(value.id, value);
    const req = new FakeRequest<void>();
    req.fireSuccess(undefined);
    return req;
  }

  delete(key: string): FakeRequest<void> {
    this.map.delete(key);
    const req = new FakeRequest<void>();
    req.fireSuccess(undefined);
    return req;
  }

  clear(): FakeRequest<void> {
    this.map.clear();
    const req = new FakeRequest<void>();
    req.fireSuccess(undefined);
    return req;
  }
}

class FakeTransaction {
  oncomplete: (() => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onabort: ((event: unknown) => void) | null = null;
  error: unknown = null;

  constructor(
    private db: FakeDatabase,
    private storeName: string,
  ) {
    setTimeout(() => {
      this.oncomplete?.();
    }, 0);
  }

  objectStore(_name: string): FakeObjectStore {
    return this.db.store(this.storeName);
  }
}

class FakeDatabase {
  private stores = new Map<string, Map<string, unknown>>();
  private storeNames = new Set<string>();
  objectStoreNames = {
    contains: (name: string): boolean => this.storeNames.has(name),
  };

  createObjectStore(name: string, _options?: unknown): FakeObjectStore {
    if (!this.stores.has(name)) {
      this.stores.set(name, new Map());
      this.storeNames.add(name);
    }
    return this.store(name);
  }

  store(name: string): FakeObjectStore {
    let map = this.stores.get(name);
    if (!map) {
      map = new Map();
      this.stores.set(name, map);
      this.storeNames.add(name);
    }
    return new FakeObjectStore(map);
  }

  transaction(storeName: string | string[], _mode?: string): FakeTransaction {
    const name = Array.isArray(storeName) ? storeName[0] : storeName;
    return new FakeTransaction(this, name);
  }

  addEventListener(_type: string, _listener: unknown): void {}

  close(): void {}
}

class FakeOpenRequest {
  result: FakeDatabase | undefined = undefined;
  error: unknown = null;
  onupgradeneeded: ((event: unknown) => void) | null = null;
  onsuccess: ((event: unknown) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
}

class FakeIndexedDB {
  failNextOpen = false;
  openError: Error | null = null;
  private db: FakeDatabase | null = null;

  open(_name: string, _version?: number): FakeOpenRequest {
    const req = new FakeOpenRequest();
    if (this.failNextOpen) {
      this.failNextOpen = false;
      const err = this.openError ?? new Error('open failed');
      queueMicrotask(() => {
        req.error = err;
        req.onerror?.({ target: req });
      });
      return req;
    }
    if (!this.db) this.db = new FakeDatabase();
    const db = this.db;
    queueMicrotask(() => {
      if (!db.objectStoreNames.contains('custom_parts')) {
        req.onupgradeneeded?.({ target: { result: db } });
      }
      req.result = db;
      req.onsuccess?.({ target: req });
    });
    return req;
  }
}

function createLocalStorageStub() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string): string | null => store.get(key) ?? null,
    setItem: (key: string, value: string): void => {
      store.set(key, value);
    },
    removeItem: (key: string): void => {
      store.delete(key);
    },
    clear: (): void => {
      store.clear();
    },
  };
}

function makePart(id: string, createdAt: number): CustomPart {
  return {
    id,
    name: `パーツ${id}`,
    category: 'hen',
    contours: [],
    createdAt,
  };
}

type CustomPartsModule = typeof import('./customPartsStorage');

describe('customPartsStorage - IndexedDB (cache audit fixes)', () => {
  let fake: FakeIndexedDB;
  let localStorageStub: ReturnType<typeof createLocalStorageStub>;
  let mod: CustomPartsModule;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.resetModules();
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    fake = new FakeIndexedDB();
    localStorageStub = createLocalStorageStub();
    (globalThis as Record<string, unknown>).window = {
      indexedDB: fake,
      dispatchEvent: () => {},
    };
    (globalThis as Record<string, unknown>).localStorage = localStorageStub;
    mod = await import('./customPartsStorage');
  });

  afterEach(() => {
    errorSpy.mockRestore();
    warnSpy.mockRestore();
    delete (globalThis as Record<string, unknown>).window;
    delete (globalThis as Record<string, unknown>).localStorage;
  });

  it('IndexedDB 保存に成功したとき LocalStorage キーが削除される', async () => {
    localStorageStub.setItem(mod.LOCAL_STORAGE_KEY, JSON.stringify([makePart('old', 100)]));
    const parts = [makePart('p1', 1000), makePart('p2', 2000)];

    const result = await mod.saveCustomParts(parts);

    expect(result.ok).toBe(true);
    expect(result.fallbackSavedCount).toBe(0);
    expect(localStorageStub.getItem(mod.LOCAL_STORAGE_KEY)).toBeNull();
    const loaded = await mod.loadCustomParts();
    expect(loaded.map((p) => p.id).sort()).toEqual(['p1', 'p2']);
  });

  it('初期化済みで IndexedDB が空のとき LocalStorage の古いコピーは復活しない', async () => {
    await mod.saveCustomParts([makePart('p1', 1000)]);
    await mod.saveCustomParts([]);
    expect(mod.isCustomPartsInitialized()).toBe(true);
    // 古いコピーが LocalStorage に残っている状態を再現する
    localStorageStub.setItem(mod.LOCAL_STORAGE_KEY, JSON.stringify([makePart('old', 100)]));

    const loaded = await mod.loadCustomParts();

    expect(loaded).toEqual([]);
  });

  it('deleteCustomParts の後 loadCustomParts は空を返す', async () => {
    await mod.saveCustomParts([makePart('p1', 1000), makePart('p2', 2000)]);
    expect((await mod.loadCustomParts()).length).toBe(2);

    await mod.deleteCustomParts();

    expect(localStorageStub.getItem(mod.LOCAL_STORAGE_KEY)).toBeNull();
    expect(await mod.loadCustomParts()).toEqual([]);
  });

  it('IndexedDB の open 失敗後、次回の呼び出しで再試行できる', async () => {
    fake.failNextOpen = true;
    const parts = [makePart('p1', 1000)];

    const first = await mod.saveCustomParts(parts);
    expect(first.fallbackSavedCount).toBe(1);
    expect(localStorageStub.getItem(mod.LOCAL_STORAGE_KEY)).not.toBeNull();

    const second = await mod.saveCustomParts(parts);
    expect(second.ok).toBe(true);
    expect(second.fallbackSavedCount).toBe(0);
    expect(localStorageStub.getItem(mod.LOCAL_STORAGE_KEY)).toBeNull();
    const loaded = await mod.loadCustomParts();
    expect(loaded.map((p) => p.id)).toEqual(['p1']);
  });

  it('LocalStorage にだけあるパーツは読み込み時に移行され、キーは読み込み完了時に削除される', async () => {
    const parts = [makePart('p1', 1000), makePart('p2', 2000)];
    localStorageStub.setItem(mod.LOCAL_STORAGE_KEY, JSON.stringify(parts));

    const loaded = await mod.loadCustomParts();

    expect(loaded.map((p) => p.id)).toEqual(['p1', 'p2']);
    expect(localStorageStub.getItem(mod.LOCAL_STORAGE_KEY)).toBeNull();
    // 移行先の IndexedDB から読める（新しい順に並ぶ）
    const reloaded = await mod.loadCustomParts();
    expect(reloaded.map((p) => p.id)).toEqual(['p2', 'p1']);
  });
});
