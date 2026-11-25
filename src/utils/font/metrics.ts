import { FontProject, PaltGlyphMetric, VpalGlyphMetric } from '../../types';
import { getContoursBoundingBox } from '../path';
import { DEFAULT_UPM } from './constants';

/**
 * Calculate Proportional Metrics ('palt' table) for all drawn glyphs in project.
 * Derives optical sidebearing compression by analyzing contour bounding boxes against full em advance.
 *
 * `scaleFactor` is the export scale applied to the outlines at compile
 * time (default 1.35 in compileFont). The proportional advance is
 * derived from the scaled outline (scaled width plus scaled optical
 * padding), so the GPOS advance matches the outline that is actually
 * written. With scaleFactor 1 the result is identical to the unscaled
 * derivation. xPlacement and the optical margins describe the stored
 * (unscaled) outline and are not written to GPOS (only xAdvance is),
 * so they are left unscaled.
 */
export function deriveProjectPaltMetrics(
  project: FontProject,
  sideBearingPercent: number = 5,
  scaleFactor: number = 1
): PaltGlyphMetric[] {
  const upm = project.metadata?.unitsPerEm || DEFAULT_UPM;
  // 0 is a valid value (no optical padding); only clamp the upper bound.
  const padding = Math.round(upm * (Math.max(0, Math.min(25, sideBearingPercent)) / 100));
  const scale =
    typeof scaleFactor === 'number' && Number.isFinite(scaleFactor) && scaleFactor > 0
      ? scaleFactor
      : 1;
  const list: PaltGlyphMetric[] = [];

  for (const g of Object.values(project.glyphs || {})) {
    if (
      !g ||
      typeof g.unicode !== 'number' ||
      !Number.isInteger(g.unicode) ||
      g.unicode <= 32 ||
      g.unicode > 0x10ffff
    ) {
      // An out-of-range Unicode would make String.fromCodePoint throw
      // a RangeError below; such a glyph cannot be compiled anyway, so
      // skip it instead of aborting the whole derivation.
      continue;
    }
    if (!g.contours || g.contours.length === 0) continue;

    const bbox = getContoursBoundingBox(g.contours);
    if (bbox.width <= 0) continue;

    const origAdv = g.advanceWidth || upm;
    // Scaled outline width plus scaled optical padding on both sides,
    // clamped to the (unscaled) advance width: palt only tightens.
    const propAdv = Math.max(
      100,
      Math.min(origAdv, Math.round(bbox.width * scale + padding * scale * 2))
    );
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
 * `scaleFactor` is the export scale applied to the outlines at compile
 * time; the proportional advance is derived from the scaled outline
 * height plus scaled optical padding (see deriveProjectPaltMetrics).
 * With scaleFactor 1 the result is identical to the unscaled derivation.
 */
export function deriveProjectVpalMetrics(
  project: FontProject,
  sideBearingPercent: number = 5,
  scaleFactor: number = 1
): VpalGlyphMetric[] {
  const upm = project.metadata?.unitsPerEm || DEFAULT_UPM;
  // 0 is a valid value (no optical padding); only clamp the upper bound.
  const padding = Math.round(upm * (Math.max(0, Math.min(25, sideBearingPercent)) / 100));
  const scale =
    typeof scaleFactor === 'number' && Number.isFinite(scaleFactor) && scaleFactor > 0
      ? scaleFactor
      : 1;
  const list: VpalGlyphMetric[] = [];

  for (const g of Object.values(project.glyphs || {})) {
    if (
      !g ||
      typeof g.unicode !== 'number' ||
      !Number.isInteger(g.unicode) ||
      g.unicode <= 32 ||
      g.unicode > 0x10ffff
    ) {
      // See deriveProjectPaltMetrics: skip instead of throwing RangeError.
      continue;
    }
    if (!g.contours || g.contours.length === 0) continue;

    const bbox = getContoursBoundingBox(g.contours);
    if (bbox.height <= 0) continue;

    const configuredAdvance = project.openTypeFeatures?.verticalWriting?.defaultVertAdvance;
    const origAdv =
      typeof configuredAdvance === 'number' && Number.isFinite(configuredAdvance) && configuredAdvance > 0
        ? configuredAdvance
        : upm;
    // Scaled outline height plus scaled optical padding on both sides,
    // clamped to the (unscaled) advance height: vpal only tightens.
    const propAdv = Math.max(
      100,
      Math.min(origAdv, Math.round(bbox.height * scale + padding * scale * 2))
    );
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
