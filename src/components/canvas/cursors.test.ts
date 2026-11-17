import { describe, it, expect, beforeEach } from 'vitest';
import {
  contourSvgCache,
  getCachedContourSvgPath,
  CONTOUR_SVG_CACHE_MAX_ENTRIES,
} from './cursors';
import type { PathContour } from '../../types';

function makeContour(id: string, x: number): PathContour {
  return {
    id,
    closed: true,
    nodes: [
      { id: 'n1', x, y: 100, handleIn: null, handleOut: null, type: 'corner' },
      { id: 'n2', x: x + 100, y: 100, handleIn: null, handleOut: null, type: 'corner' },
      { id: 'n3', x: x + 100, y: 200, handleIn: null, handleOut: null, type: 'corner' },
    ],
  };
}

describe('contourSvgCache', () => {
  beforeEach(() => {
    contourSvgCache.clear();
  });

  it('上限を超えたら最も古いエントリから削除し、件数が上限に収まる', () => {
    for (let i = 0; i < CONTOUR_SVG_CACHE_MAX_ENTRIES + 100; i++) {
      getCachedContourSvgPath(makeContour(`c${i}`, i * 10));
    }
    expect(contourSvgCache.size).toBe(CONTOUR_SVG_CACHE_MAX_ENTRIES);
    // 上限に達した状態でさらに追加しても件数は増えない
    getCachedContourSvgPath(makeContour('c-new', 99999));
    expect(contourSvgCache.size).toBe(CONTOUR_SVG_CACHE_MAX_ENTRIES);
  });

  it('0.01 未満の差しかない座標は同じエントリになる', () => {
    const pathA = getCachedContourSvgPath(makeContour('c1', 100));
    const pathB = getCachedContourSvgPath(makeContour('c1', 100.001));
    expect(pathA).toBe(pathB);
    expect(contourSvgCache.size).toBe(1);
  });

  it('0.01 以上の差がある座標は別エントリになる', () => {
    getCachedContourSvgPath(makeContour('c1', 100));
    getCachedContourSvgPath(makeContour('c1', 100.02));
    expect(contourSvgCache.size).toBe(2);
  });
});
