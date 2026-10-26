import { FontProject } from '../../types';
import {
  optimizeContoursExtrema,
  ExtremaOptimizationOptions,
} from '../pathUtils';
import {
  BatchExtremaOptimizationDetail,
  BatchExtremaOptimizationResult,
} from './types';

export function batchOptimizeProjectExtrema(
  project: FontProject,
  targetUnicodes?: number[],
  options?: ExtremaOptimizationOptions
): BatchExtremaOptimizationResult {
  if (!project.glyphs) {
    return {
      updatedProject: project,
      processedGlyphsCount: 0,
      optimizedGlyphsCount: 0,
      totalNodesAdded: 0,
      details: [],
    };
  }

  const updatedGlyphs = { ...project.glyphs };
  let processedCount = 0;
  let optimizedCount = 0;
  let totalAdded = 0;
  const details: BatchExtremaOptimizationDetail[] = [];

  const targetSet = targetUnicodes ? new Set(targetUnicodes) : null;

  Object.entries(project.glyphs).forEach(([key, glyph]) => {
    const unicode = Number(key);
    if (targetSet && !targetSet.has(unicode)) return;
    if (!glyph || !glyph.contours || glyph.contours.length === 0) return;

    processedCount++;
    const res = optimizeContoursExtrema(glyph.contours, options);

    if (res.adjusted && res.addedNodesCount > 0) {
      optimizedCount++;
      totalAdded += res.addedNodesCount;
      updatedGlyphs[unicode] = {
        ...glyph,
        contours: res.contours,
      };

      details.push({
        unicode,
        char: glyph.char || String.fromCodePoint(unicode),
        missingBefore: res.originalAnalysis.missingExtremaCount,
        missingAfter: res.newAnalysis.missingExtremaCount,
        nodesAdded: res.addedNodesCount,
      });
    }
  });

  return {
    updatedProject: {
      ...project,
      glyphs: updatedGlyphs,
      updatedAt: Date.now(),
    },
    processedGlyphsCount: processedCount,
    optimizedGlyphsCount: optimizedCount,
    totalNodesAdded: totalAdded,
    details,
  };
}
