import { FontProject } from '../../types';
import {
  equalizeContoursStrokeWidth,
  StrokeEqualizationOptions,
} from '../pathUtils';
import {
  BatchStrokeEqualizationDetail,
  BatchStrokeEqualizationResult,
} from './types';

export function batchEqualizeProjectStrokes(
  project: FontProject,
  targetUnicodes?: number[],
  options?: StrokeEqualizationOptions
): BatchStrokeEqualizationResult {
  if (!project.glyphs) {
    return {
      updatedProject: project,
      processedGlyphsCount: 0,
      equalizedGlyphsCount: 0,
      totalThinFixed: 0,
      totalThickFixed: 0,
      details: [],
    };
  }

  const updatedGlyphs = { ...project.glyphs };
  let processedCount = 0;
  let equalizedCount = 0;
  let totalThin = 0;
  let totalThick = 0;
  const details: BatchStrokeEqualizationDetail[] = [];

  const targetSet = targetUnicodes ? new Set(targetUnicodes) : null;

  Object.entries(project.glyphs).forEach(([key, glyph]) => {
    const unicode = Number(key);
    if (targetSet && !targetSet.has(unicode)) return;
    if (!glyph || !glyph.contours || glyph.contours.length === 0) return;

    processedCount++;
    const res = equalizeContoursStrokeWidth(glyph.contours, options);

    if (res.adjusted) {
      equalizedCount++;
      totalThin += res.thinFixedCount;
      totalThick += res.thickFixedCount;
      updatedGlyphs[unicode] = {
        ...glyph,
        contours: res.contours,
        modified: true,
      };

      details.push({
        unicode,
        char: glyph.char || String.fromCodePoint(unicode),
        originalMin: res.originalAnalysis.minWidth,
        originalMax: res.originalAnalysis.maxWidth,
        newMin: res.newAnalysis.minWidth,
        newMax: res.newAnalysis.maxWidth,
        thinFixed: res.thinFixedCount,
        thickFixed: res.thickFixedCount,
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
    equalizedGlyphsCount: equalizedCount,
    totalThinFixed: totalThin,
    totalThickFixed: totalThick,
    details,
  };
}

/**
 * 複数・全項目の自動一括修正
 */
