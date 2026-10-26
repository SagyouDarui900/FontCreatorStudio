import { FontProject, PathContour, Point } from '../../types';
import { sampleContourPoints, resolveContourOverlaps } from '../pathUtils';
import { BatchResolveIntersectionsResult } from './types';

function getLineSegmentIntersection(
  p1: Point,
  p2: Point,
  p3: Point,
  p4: Point
): Point | null {
  // バウンディングボックス判定（高速除外）
  if (
    Math.max(p1.x, p2.x) < Math.min(p3.x, p4.x) - 0.01 ||
    Math.min(p1.x, p2.x) > Math.max(p3.x, p4.x) + 0.01 ||
    Math.max(p1.y, p2.y) < Math.min(p3.y, p4.y) - 0.01 ||
    Math.min(p1.y, p2.y) > Math.max(p3.y, p4.y) + 0.01
  ) {
    return null;
  }

  const dx1 = p2.x - p1.x;
  const dy1 = p2.y - p1.y;
  const dx2 = p4.x - p3.x;
  const dy2 = p4.y - p3.y;

  const denom = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(denom) < 1e-6) {
    // 平行または同一直線
    return null;
  }

  const s = ((p3.x - p1.x) * dy2 - (p3.y - p1.y) * dx2) / denom;
  const t = ((p3.x - p1.x) * dy1 - (p3.y - p1.y) * dx1) / denom;

  // 端点付近 (0.01 ~ 0.99) での交差のみを判定（接続端点を交差と誤認させないため）
  if (s > 0.02 && s < 0.98 && t > 0.02 && t < 0.98) {
    return {
      x: Math.round(p1.x + s * dx1),
      y: Math.round(p1.y + s * dy1),
    };
  }

  return null;
}

/**
 * 輪郭群のパス交差（自己交差および輪郭間交差）を検出
 */
export function findContourIntersections(contours: PathContour[]): Point[] {
  const intersections: Point[] = [];
  if (!contours || contours.length === 0) return intersections;

  // 各輪郭のサンプリングされたポリラインセグメントを生成
  interface Segment {
    p1: Point;
    p2: Point;
    contourIdx: number;
    segIdx: number;
  }

  const allSegments: Segment[] = [];

  contours.forEach((contour, cIdx) => {
    if (!contour.nodes || contour.nodes.length < 2) return;
    // 適切な密度でサンプリング (ベジェ曲線部を考慮)
    const points = sampleContourPoints(contour, 6);
    if (points.length < 2) return;

    for (let i = 0; i < points.length - 1; i++) {
      allSegments.push({
        p1: points[i],
        p2: points[i + 1],
        contourIdx: cIdx,
        segIdx: i,
      });
    }

    // 閉じたパスなら末尾から先頭へのセグメントも追加
    if (contour.closed && points.length > 2) {
      allSegments.push({
        p1: points[points.length - 1],
        p2: points[0],
        contourIdx: cIdx,
        segIdx: points.length - 1,
      });
    }
  });

  const segCount = allSegments.length;
  // セグメント数が多すぎる場合は間引いて高負荷を回避
  const maxSegsToCheck = 400;
  const step = segCount > maxSegsToCheck ? Math.ceil(segCount / maxSegsToCheck) : 1;

  for (let i = 0; i < segCount; i += step) {
    const s1 = allSegments[i];
    for (let j = i + step; j < segCount; j += step) {
      const s2 = allSegments[j];

      // 同一輪郭で隣接するセグメントは端点を共有するため除外
      if (s1.contourIdx === s2.contourIdx) {
        const diff = Math.abs(s1.segIdx - s2.segIdx);
        if (diff <= 1) continue;
      }

      const pt = getLineSegmentIntersection(s1.p1, s1.p2, s2.p1, s2.p2);
      if (pt) {
        // 重複する交点を除外して登録 (半径 8px 以内)
        const isNearby = intersections.some(
          (existing) => Math.hypot(existing.x - pt.x, existing.y - pt.y) < 8
        );
        if (!isNearby) {
          intersections.push(pt);
          if (intersections.length >= 15) return intersections; // 上限
        }
      }
    }
  }

  return intersections;
}

/**
 * 輪郭群の幾何ハッシュ・シグネチャを計算（重複検知用）
 */

export function batchResolveProjectIntersections(
  project: FontProject,
  targetUnicodes?: number[]
): BatchResolveIntersectionsResult {
  if (!project.glyphs) {
    return {
      updatedProject: project,
      processedGlyphsCount: 0,
      resolvedGlyphsCount: 0,
    };
  }

  const updatedGlyphs = { ...project.glyphs };
  let processedCount = 0;
  let resolvedCount = 0;
  const targetSet = targetUnicodes ? new Set(targetUnicodes) : null;

  Object.entries(project.glyphs).forEach(([key, glyph]) => {
    const unicode = Number(key);
    if (targetSet && !targetSet.has(unicode)) return;
    if (!glyph || !glyph.contours || glyph.contours.length === 0) return;

    processedCount++;
    const intersections = findContourIntersections(glyph.contours);
    if (intersections.length > 0) {
      const resolved = resolveContourOverlaps(glyph.contours);
      if (resolved && resolved.length > 0) {
        resolvedCount++;
        updatedGlyphs[unicode] = {
          ...glyph,
          contours: resolved,
        };
      }
    }
  });

  return {
    updatedProject: {
      ...project,
      glyphs: updatedGlyphs,
      updatedAt: Date.now(),
    },
    processedGlyphsCount: processedCount,
    resolvedGlyphsCount: resolvedCount,
  };
}
