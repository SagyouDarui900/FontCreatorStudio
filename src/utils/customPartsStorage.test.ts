import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  saveCustomParts,
  loadCustomParts,
  buildDefaultCustomParts,
  isCustomPartsInitialized,
  sanitizeCustomParts,
  compactCustomParts,
  LOCAL_STORAGE_KEY,
  CUSTOM_PARTS_INITIALIZED_KEY,
} from './customPartsStorage';
import type { CustomPart } from '../types';

// node 環境では window / IndexedDB が存在しないため、saveCustomParts は
// LocalStorage フォールバック経路を通る。その経路を容量制限付きの
// localStorage スタブで検証する。

function createQuotaLocalStorage(limitBytes: number) {
  const store = new Map<string, string>();
  return {
    getItem: (key: string): string | null => store.get(key) ?? null,
    setItem: (key: string, value: string): void => {
      const next = new Map(store);
      next.set(key, value);
      let total = 0;
      next.forEach((v) => {
        total += v.length;
      });
      if (total > limitBytes) {
        const err = new Error('QuotaExceededError');
        err.name = 'QuotaExceededError';
        throw err;
      }
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

function makePart(id: string, createdAt: number, namePad = 0): CustomPart {
  return {
    id,
    name: `パーツ${id}${'あ'.repeat(namePad)}`,
    category: 'hen',
    contours: [],
    createdAt,
  };
}

function getStoredParts(): CustomPart[] | null {
  const raw = (
    (globalThis as Record<string, unknown>).localStorage as {
      getItem: (key: string) => string | null;
    }
  ).getItem(LOCAL_STORAGE_KEY);
  return raw ? (JSON.parse(raw) as CustomPart[]) : null;
}

function getStoredValue(key: string): string | null {
  return (
    (globalThis as Record<string, unknown>).localStorage as {
      getItem: (key: string) => string | null;
    }
  ).getItem(key);
}

describe('customPartsStorage - LocalStorage fallback (R13)', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
    warnSpy.mockRestore();
    delete (globalThis as Record<string, unknown>).localStorage;
  });

  it('容量に収まる場合は全件を LocalStorage に書き、除外は 0 件', async () => {
    (globalThis as Record<string, unknown>).localStorage = createQuotaLocalStorage(100000);
    const parts = [makePart('p1', 1000), makePart('p2', 2000), makePart('p3', 3000)];

    const result = await saveCustomParts(parts);

    expect(result.ok).toBe(true);
    expect(result.fallbackSavedCount).toBe(3);
    expect(result.fallbackDroppedCount).toBe(0);
    const stored = getStoredParts() as CustomPart[];
    // 退避時は新しい順に並べ替えて保存する
    expect(stored.map((p) => p.id)).toEqual(['p3', 'p2', 'p1']);
    expect(isCustomPartsInitialized()).toBe(true);
  });

  it('容量を超える場合は古いパーツから順に除外し、除外件数を返す', async () => {
    // 各パーツの JSON は約 170 文字。5 件で約 850 文字のため上限 400 では 2 件だけ残る。
    (globalThis as Record<string, unknown>).localStorage = createQuotaLocalStorage(400);
    const parts = [
      makePart('p1', 1000, 100),
      makePart('p2', 2000, 100),
      makePart('p3', 3000, 100),
      makePart('p4', 4000, 100),
      makePart('p5', 5000, 100),
    ];

    const result = await saveCustomParts(parts);

    expect(result.ok).toBe(false);
    expect(result.fallbackSavedCount).toBe(2);
    expect(result.fallbackDroppedCount).toBe(3);
    const stored = getStoredParts() as CustomPart[];
    // 新しい 2 件だけが残り、古い 3 件は除外される
    expect(stored.map((p) => p.id)).toEqual(['p5', 'p4']);
    expect(isCustomPartsInitialized()).toBe(true);
  });

  it('1 件も入らない容量の場合は全件除外を報告する', async () => {
    (globalThis as Record<string, unknown>).localStorage = createQuotaLocalStorage(0);
    const parts = [makePart('p1', 1000, 100), makePart('p2', 2000, 100)];

    const result = await saveCustomParts(parts);

    expect(result.ok).toBe(false);
    expect(result.fallbackSavedCount).toBe(0);
    expect(result.fallbackDroppedCount).toBe(2);
    expect(getStoredValue(LOCAL_STORAGE_KEY)).toBeNull();
  });

  it('LocalStorage にだけあるパーツは読み込み時に返し、IndexedDB へ移行する', async () => {
    const storage = createQuotaLocalStorage(100000);
    (globalThis as Record<string, unknown>).localStorage = storage;
    const parts = [makePart('p1', 1000), makePart('p2', 2000)];
    storage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(parts));

    const loaded = await loadCustomParts();

    expect(loaded.map((p) => p.id)).toEqual(['p1', 'p2']);
    // 移行の非同期処理が終わるまで待つ
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(storage.getItem(LOCAL_STORAGE_KEY)).toBeNull();
    expect(storage.getItem(CUSTOM_PARTS_INITIALIZED_KEY)).toBe('1');
  });
});

describe('customPartsStorage - defaults and initialized flag (R3)', () => {
  afterEach(() => {
    delete (globalThis as Record<string, unknown>).localStorage;
  });

  it('既定パーツは 5 件で名前と id が重複しない', () => {
    const defaults = buildDefaultCustomParts();
    expect(defaults).toHaveLength(5);
    expect(defaults.map((p) => p.name)).toEqual([
      'さんずい (氵)',
      'きへん (木)',
      'にんべん (亻)',
      'ごんべん (言)',
      'くさかんむり (艹)',
    ]);
    expect(new Set(defaults.map((p) => p.id)).size).toBe(5);
    for (const p of defaults) {
      expect(Array.isArray(p.contours)).toBe(true);
    }
  });

  it('保存前は初期化済みフラグが立っていない', () => {
    (globalThis as Record<string, unknown>).localStorage = createQuotaLocalStorage(100000);
    expect(isCustomPartsInitialized()).toBe(false);
  });
});

function rawPart(overrides: Record<string, unknown> = {}) {
  return {
    id: 'part-1',
    name: 'test',
    category: 'hen',
    contours: [
      {
        id: 'c1',
        closed: true,
        nodes: [
          { id: 'n1', x: 100, y: 100, handleIn: null, handleOut: null, type: 'corner' },
          { id: 'n2', x: 200, y: 100, handleIn: null, handleOut: null, type: 'corner' },
        ],
      },
    ],
    createdAt: 1000,
    ...overrides,
  };
}

describe('sanitizeCustomParts', () => {
  it('returns an empty array for non-array input', () => {
    expect(sanitizeCustomParts(null)).toEqual([]);
    expect(sanitizeCustomParts({})).toEqual([]);
    expect(sanitizeCustomParts('x')).toEqual([]);
  });

  it('drops nodes with non-finite coordinates and nulls invalid handles', () => {
    const parts = sanitizeCustomParts([
      rawPart({
        contours: [
          {
            id: 'c1',
            closed: true,
            nodes: [
              { id: 'n1', x: 100, y: 100, handleIn: { x: NaN, y: 0 }, handleOut: null, type: 'corner' },
              { id: 'n2', x: NaN, y: 100, handleIn: null, handleOut: null, type: 'corner' },
              { id: 'n3', x: 200, y: 100, handleIn: null, handleOut: { x: 210, y: Infinity }, type: 'corner' },
            ],
          },
        ],
      }),
    ]);
    expect(parts).toHaveLength(1);
    expect(parts[0].contours[0].nodes).toHaveLength(2);
    expect(parts[0].contours[0].nodes[0].handleIn).toBeNull();
    expect(parts[0].contours[0].nodes[1].handleOut).toBeNull();
    expect(parts[0].contours[0].nodes.map((n) => n.x)).toEqual([100, 200]);
  });

  it('falls back to other for an unknown category', () => {
    const parts = sanitizeCustomParts([rawPart({ category: 'bogus' })]);
    expect(parts[0].category).toBe('other');
    const kept = sanitizeCustomParts([rawPart({ category: 'kana' })]);
    expect(kept[0].category).toBe('kana');
  });

  it('normalizes duplicate part, contour, and node ids', () => {
    const parts = sanitizeCustomParts([rawPart(), rawPart()]);
    expect(parts).toHaveLength(2);
    expect(parts[0].id).not.toBe(parts[1].id);
    expect(parts[0].contours[0].id).not.toBe(parts[1].contours[0].id);
    expect(parts[0].contours[0].nodes[0].id).not.toBe(parts[1].contours[0].nodes[0].id);
  });

  it('drops contours left with no valid nodes', () => {
    const parts = sanitizeCustomParts([
      rawPart({
        contours: [
          {
            id: 'c1',
            closed: true,
            nodes: [{ id: 'n1', x: NaN, y: NaN, handleIn: null, handleOut: null, type: 'corner' }],
          },
        ],
      }),
    ]);
    expect(parts[0].contours).toEqual([]);
  });
});

describe('compactCustomParts', () => {
  it('excludes non-finite nodes and never produces NaN coordinates', () => {
    const compacted = compactCustomParts([
      {
        id: 'p1',
        name: 'test',
        contours: [
          {
            id: 'c1',
            closed: true,
            nodes: [
              { id: 'n1', x: 100.123, y: 100.456, handleIn: null, handleOut: null, type: 'corner' },
              { id: 'n2', x: NaN, y: 100, handleIn: null, handleOut: null, type: 'corner' },
              { id: 'n3', x: 200, y: 200, handleIn: { x: NaN, y: 0 }, handleOut: null, type: 'corner' },
            ],
          },
        ],
        createdAt: 1000,
      },
    ]);
    const nodes = compacted[0].contours[0].nodes;
    expect(nodes).toHaveLength(2);
    expect(nodes[0].x).toBe(100.12);
    expect(nodes[1].handleIn).toBeNull();
    for (const node of nodes) {
      expect(Number.isFinite(node.x)).toBe(true);
      expect(Number.isFinite(node.y)).toBe(true);
    }
  });
});
