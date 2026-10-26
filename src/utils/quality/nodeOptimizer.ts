import { FontProject, PathContour } from '../../types';
import {
  optimizeContoursRedundantNodes,
  NodeOptimizationOptions,
  simplifyContour,
} from '../pathUtils';
import { BatchNodeOptimizationResult } from './types';

export function safePreservingNodeOptimization(
  contours: PathContour[],
  options?: NodeOptimizationOptions
): PathContour[] {
  if (!contours || contours.length === 0) return [];

  // 直線上の冗長ノード（共線点）の間引き ＋ 形状を崩さない微細ブレ平滑化
  const res = optimizeContoursRedundantNodes(contours, {
    level: options?.level || 'normal',
    preserveSharpCorners: true,
    maxBboxDeviation: options?.maxBboxDeviation ?? 1.5,
    ...options,
  });

  return res.contours;
}

// ============================================================================

export function batchOptimizeProjectNodes(
  project: FontProject,
  targetUnicodes?: number[],
  options?: NodeOptimizationOptions
): BatchNodeOptimizationResult {
  const glyphs = project.glyphs || {};
  const updatedGlyphs = { ...glyphs };

  const unicodes = targetUnicodes && targetUnicodes.length > 0
    ? targetUnicodes
    : Object.keys(glyphs).map((k) => Number(k)).filter((u) => !isNaN(u));

  let totalOriginal = 0;
  let totalOptimized = 0;
  let optimizedGlyphsCount = 0;
  let processedGlyphsCount = 0;

  const details: BatchNodeOptimizationResult['details'] = [];

  for (const unicode of unicodes) {
    const glyph = glyphs[unicode];
    if (!glyph || !glyph.contours || glyph.contours.length === 0) continue;

    processedGlyphsCount++;

    const res = optimizeContoursRedundantNodes(glyph.contours, {
      level: options?.level || 'normal',
      preserveSharpCorners: true,
      maxBboxDeviation: options?.maxBboxDeviation ?? 1.5,
      ...options,
    });

    totalOriginal += res.originalNodeCount;
    totalOptimized += res.optimizedNodeCount;

    if (res.changed && res.reducedCount > 0) {
      optimizedGlyphsCount++;
      updatedGlyphs[unicode] = {
        ...glyph,
        contours: res.contours,
      };
      details.push({
        unicode,
        char: glyph.char || String.fromCodePoint(unicode),
        originalNodes: res.originalNodeCount,
        optimizedNodes: res.optimizedNodeCount,
        reduced: res.reducedCount,
      });
    }
  }

  const totalReduced = Math.max(0, totalOriginal - totalOptimized);
  const reductionPercentage =
    totalOriginal > 0 ? Math.round((totalReduced / totalOriginal) * 100) : 0;

  return {
    updatedProject: {
      ...project,
      glyphs: updatedGlyphs,
      updatedAt: Date.now(),
    },
    processedGlyphsCount,
    optimizedGlyphsCount,
    totalOriginalNodes: totalOriginal,
    totalOptimizedNodes: totalOptimized,
    totalReducedNodes: totalReduced,
    reductionPercentage,
    details,
  };
}

/**
 * 2つの線分 (p1, p2) と (p3, p4) が交差するか判定し、交点を返す
 */
