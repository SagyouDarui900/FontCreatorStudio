import { FontProject, PaltGlyphMetric, VpalGlyphMetric } from '../../types';
import { getContoursBoundingBox } from '../pathUtils';
import { DEFAULT_UPM } from './constants';

/**
 * Calculate Proportional Metrics ('palt' table) for all drawn glyphs in project.
 * Derives optical sidebearing compression by analyzing contour bounding boxes against full em advance.
 */
export function deriveProjectPaltMetrics(
  project: FontProject,
  sideBearingPercent: number = 5
): PaltGlyphMetric[] {
  const upm = project.metadata.unitsPerEm || DEFAULT_UPM;
  const padding = Math.round(upm * (Math.max(1, Math.min(25, sideBearingPercent)) / 100));
  const list: PaltGlyphMetric[] = [];

  for (const g of Object.values(project.glyphs || {})) {
    if (!g || typeof g.unicode !== 'number' || g.unicode <= 32) continue;
    if (!g.contours || g.contours.length === 0) continue;

    const bbox = getContoursBoundingBox(g.contours);
    if (bbox.width <= 0) continue;

    const origAdv = g.advanceWidth || upm;
    const propAdv = Math.max(100, Math.min(origAdv, Math.round(bbox.width + padding * 2)));
    const xPlacement = Math.round(padding - bbox.minX);
    const deltaAdv = propAdv - origAdv;

    list.push({
      unicode: g.unicode,
      char: g.char || String.fromCodePoint(g.unicode),
      originalAdvance: origAdv,
      proportionalAdvance: propAdv,
      xPlacement,
      deltaAdvance: deltaAdv,
      opticalMarginLeft: Math.max(0, Math.round(bbox.minX)),
      opticalMarginRight: Math.max(0, Math.round(origAdv - bbox.maxX)),
      enabled: true,
    });
  }

  return list;
}

/**
 * Calculate Vertical Proportional Metrics ('vpal' table) for glyphs.
 */
export function deriveProjectVpalMetrics(
  project: FontProject,
  sideBearingPercent: number = 5
): VpalGlyphMetric[] {
  const upm = project.metadata.unitsPerEm || DEFAULT_UPM;
  const padding = Math.round(upm * (Math.max(1, Math.min(25, sideBearingPercent)) / 100));
  const list: VpalGlyphMetric[] = [];

  for (const g of Object.values(project.glyphs || {})) {
    if (!g || typeof g.unicode !== 'number' || g.unicode <= 32) continue;
    if (!g.contours || g.contours.length === 0) continue;

    const bbox = getContoursBoundingBox(g.contours);
    if (bbox.height <= 0) continue;

    const origAdv = project.openTypeFeatures?.verticalWriting?.defaultVertAdvance || upm;
    const propAdv = Math.max(100, Math.min(origAdv, Math.round(bbox.height + padding * 2)));
    const yPlacement = Math.round(padding - bbox.minY);
    const deltaAdv = propAdv - origAdv;

    list.push({
      unicode: g.unicode,
      char: g.char || String.fromCodePoint(g.unicode),
      originalAdvance: origAdv,
      proportionalAdvance: propAdv,
      yPlacement,
      deltaAdvance: deltaAdv,
      opticalMarginTop: Math.max(0, Math.round(bbox.minY)),
      opticalMarginBottom: Math.max(0, Math.round(origAdv - bbox.maxY)),
      enabled: true,
    });
  }

  return list;
}
