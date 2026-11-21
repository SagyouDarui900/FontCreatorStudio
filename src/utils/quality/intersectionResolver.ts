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

  const len1Sq = dx1 * dx1 + dy1 * dy1;
  const len2Sq = dx2 * dx2 + dy2 * dy2;
  if (len1Sq < 1e-9 || len2Sq < 1e-9) return null;

  const denom = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(denom) <= 1e-6 * Math.sqrt(len1Sq * len2Sq)) {
    const cross = (p3.x - p1.x) * dy1 - (p3.y - p1.y) * dx1;
    if ((cross * cross) / len1Sq > 1e-4) {
      return null;
    }
    const u3 = ((p3.x - p1.x) * dx1 + (p3.y - p1.y) * dy1) / len1Sq;
    const u4 = ((p4.x - p1.x) * dx1 + (p4.y - p1.y) * dy1) / len1Sq;
    const overlapStart = Math.max(0, Math.min(u3, u4));
    const overlapEnd = Math.min(1, Math.max(u3, u4));
    if (overlapEnd < overlapStart - 1e-4) {
      return null;
    }
    const uMid = Math.max(0, Math.min(1, (overlapStart + overlapEnd) / 2));
    return {
      x: Math.round(p1.x + uMid * dx1),
      y: Math.round(p1.y + uMid * dy1),
    };
  }

  const s = ((p3.x - p1.x) * dy2 - (p3.y - p1.y) * dx2) / denom;
  const t = ((p3.x - p1.x) * dy1 - (p3.y - p1.y) * dx1) / denom;

  if (s >= -1e-4 && s <= 1 + 1e-4 && t >= -1e-4 && t <= 1 + 1e-4) {
    const clampedS = Math.max(0, Math.min(1, s));
    return {
      x: Math.round(p1.x + clampedS * dx1),
      y: Math.round(p1.y + clampedS * dy1),
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
  const segCountByContour: number[] = [];
  const isClosedByContour: boolean[] = [];

  contours.forEach((contour, cIdx) => {
    isClosedByContour[cIdx] = Boolean(contour.closed);
    if (!contour.nodes || contour.nodes.length < 2) {
      segCountByContour[cIdx] = 0;
      return;
    }
    // 適切な密度でサンプリング (ベジェ曲線部を考慮)
    const points = sampleContourPoints(contour, 6);
    if (points.length < 2) {
      segCountByContour[cIdx] = 0;
      return;
    }

    let count = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      if (Math.hypot(p2.x - p1.x, p2.y - p1.y) < 1e-4) continue;
      allSegments.push({
        p1,
        p2,
        contourIdx: cIdx,
        segIdx: count++,
      });
    }

    // 閉じたパスで末尾が先頭と離れている場合のみ閉じセグメントを追加
    if (contour.closed && points.length > 2) {
      const p1 = points[points.length - 1];
      const p2 = points[0];
      if (Math.hypot(p2.x - p1.x, p2.y - p1.y) >= 1e-4) {
        allSegments.push({
          p1,
          p2,
          contourIdx: cIdx,
          segIdx: count++,
        });
      }
    }
    segCountByContour[cIdx] = count;
  });

  const segCount = allSegments.length;
  // セグメント数が多すぎる場合は間引いて高負荷を回避
  const maxSegsToCheck = 400;
  const step = segCount > maxSegsToCheck ? Math.ceil(segCount / maxSegsToCheck) : 1;

  for (let i = 0; i < segCount; i += step) {
    const s1 = allSegments[i];
    for (let j = i + step; j < segCount; j += step) {
      const s2 = allSegments[j];

      // 同一輪郭で隣接するセグメントは端点を共有するため除外（閉じた輪郭の先頭・末尾を含む）
      if (s1.contourIdx === s2.contourIdx) {
        const diff = Math.abs(s1.segIdx - s2.segIdx);
        const count = segCountByContour[s1.contourIdx] || 0;
        if (diff <= 1 || (isClosedByContour[s1.contourIdx] && count > 2 && diff >= count - 1)) {
          continue;
        }
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
