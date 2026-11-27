import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  loadUserPenPresets,
  saveUserPenPresets,
  isValidPenPresetShape,
  validateImportedPenPresets,
  makeUniquePresetName,
  clampBrushWidth,
  DEFAULT_PEN_PRESETS,
} from './presetData';
import { PEN_PRESETS } from './path/pressure';
import type { UserPenPreset } from '../types';

const PRESETS_KEY = 'mojisaku_user_pen_presets';

function createMemoryLocalStorage() {
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

function makePreset(id: string, name: string, brushWidth = 38): UserPenPreset {
  return {
    id,
    name,
    isCustom: true,
    brushStyle: 'brush',
    brushWidth,
    pressureSensitivity: 'high',
    autoSmoothBrush: true,
    smoothStrength: 'standard',
    smoothPreserveCorners: true,
    autoUnionBrush: true,
  };
}

describe('presetData - pen preset validation and storage', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    (globalThis as Record<string, unknown>).localStorage = createMemoryLocalStorage();
  });

  afterEach(() => {
    warnSpy.mockRestore();
    delete (globalThis as Record<string, unknown>).localStorage;
  });

  it('clamps brush width to 4-150', () => {
    expect(clampBrushWidth(1)).toBe(4);
    expect(clampBrushWidth(200)).toBe(150);
    expect(clampBrushWidth(38)).toBe(38);
    expect(clampBrushWidth(NaN)).toBe(38);
  });

  it('rejects non-object, missing id, and missing name preset shapes', () => {
    expect(isValidPenPresetShape(null)).toBe(false);
    expect(isValidPenPresetShape('preset')).toBe(false);
    expect(isValidPenPresetShape({ name: 'x' })).toBe(false);
    expect(isValidPenPresetShape({ id: 'a' })).toBe(false);
    expect(isValidPenPresetShape({ id: 1, name: 'x' })).toBe(false);
    expect(isValidPenPresetShape(makePreset('a', 'x'))).toBe(true);
  });

  it('validates imported presets, drops invalid entries, and remaps duplicate ids', () => {
    const { valid, invalidCount, remappedCount } = validateImportedPenPresets(
      [
        makePreset('a', 'A', 300),
        { id: 'b' },
        'not-an-object',
        makePreset('a', 'A duplicate'),
      ],
      new Set(['a'])
    );
    expect(invalidCount).toBe(2);
    expect(remappedCount).toBe(2);
    expect(valid).toHaveLength(2);
    expect(valid[0].brushWidth).toBe(150);
    expect(new Set(valid.map((p) => p.id)).size).toBe(2);
  });

  it('keeps a saved empty preset list instead of restoring defaults', () => {
    expect(saveUserPenPresets([])).toBe(true);
    expect(loadUserPenPresets()).toEqual([]);
  });

  it('returns default presets when no preset key is saved', () => {
    expect(loadUserPenPresets()).toEqual(DEFAULT_PEN_PRESETS);
  });

  it('drops invalid entries when loading saved presets', () => {
    const storage = (globalThis as Record<string, unknown>).localStorage as {
      setItem: (key: string, value: string) => void;
    };
    storage.setItem(PRESETS_KEY, JSON.stringify([makePreset('a', 'A'), { id: 'b' }, null]));
    const loaded = loadUserPenPresets();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('a');
  });

  it('clamps the round-C fields of imported presets to their ranges', () => {
    const { valid } = validateImportedPenPresets(
      [
        {
          ...makePreset('a', 'A'),
          taperStartTime: 150,
          taperEndTime: -5,
          nibSpacing: 0,
          jitterSpacing: 200,
          stabilizationMethod: 'sideways',
          speedStabilization: 140,
          legacyStabilization: 'yes',
          speedOpacityFactor: -150,
          pressureOpacityFactor: 120,
        },
      ],
      new Set()
    );
    expect(valid).toHaveLength(1);
    const p = valid[0];
    expect(p.taperStartTime).toBe(100);
    expect(p.taperEndTime).toBe(0);
    expect(p.nibSpacing).toBe(1);
    expect(p.jitterSpacing).toBe(100);
    expect(p.stabilizationMethod).toBe('pre');
    expect(p.speedStabilization).toBe(100);
    expect(p.legacyStabilization).toBe(false);
    expect(p.speedOpacityFactor).toBe(-100);
    expect(p.pressureOpacityFactor).toBe(100);
  });

  it('leaves absent round-C fields absent when importing', () => {
    const { valid } = validateImportedPenPresets([makePreset('b', 'B')], new Set());
    expect(valid).toHaveLength(1);
    expect(valid[0].taperStartTime).toBeUndefined();
    expect(valid[0].nibSpacing).toBeUndefined();
    expect(valid[0].stabilizationMethod).toBeUndefined();
  });

  it('numbers duplicate preset names', () => {
    const names = new Set(['カスタムペン', 'カスタムペン 2']);
    expect(makeUniquePresetName('カスタムペン', names)).toBe('カスタムペン 3');
    expect(makeUniquePresetName('新しい名前', names)).toBe('新しい名前');
  });

  it('covers all 19 brush styles with unique ids and PEN_PRESETS default widths', () => {
    expect(DEFAULT_PEN_PRESETS).toHaveLength(19);
    const ids = DEFAULT_PEN_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    const byStyle = new Map(DEFAULT_PEN_PRESETS.map((p) => [p.brushStyle, p]));
    const expectedStyles = [
      'mincho_nib',
      'g_pen',
      'reisho_chisel',
      'marker',
      'ballpoint',
      'chalk',
      'highlighter',
      'pixel_dot',
      'polygon',
      'wobbly',
    ] as const;
    for (const style of expectedStyles) {
      const preset = byStyle.get(style);
      expect(preset).toBeDefined();
      const penInfo = PEN_PRESETS.find((p) => p.id === style);
      expect(penInfo).toBeDefined();
      expect(preset!.brushWidth).toBe(penInfo!.defaultWidth);
    }
  });
});
