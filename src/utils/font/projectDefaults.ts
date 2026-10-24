import { FontMetadata, FontProject, GlyphData } from '../../types';
import { DEFAULT_SAMPLE_GLYPHS } from '../../data/defaultSampleGlyphs';
import { getContoursBoundingBox, transformContours } from '../pathUtils';
import { DEFAULT_UPM, isAsymmetricOrPunctuationGlyph } from './constants';

/**
 * Create default new FontProject with standard ASCII & basic Japanese setup
 */
export function createDefaultProject(): FontProject {
  const defaultMeta: FontMetadata = {
    familyName: '手書きフォント',
    styleName: 'Regular',
    designer: '手書きフォント作者',
    copyright: '© 2026 手書きフォント作者. All rights reserved.',
    version: 'Version 1.000',
    unitsPerEm: 1000,
    ascender: 800,
    descender: -200,
    lineGap: 100,
    capHeight: 700,
    xHeight: 500,
  };

  // Pre-seed starter glyphs with authentic Japanese & Latin outlines
  const sampleGlyphs: Record<number, GlyphData> = {};
  for (const [key, glyph] of Object.entries(DEFAULT_SAMPLE_GLYPHS)) {
    sampleGlyphs[Number(key)] = JSON.parse(JSON.stringify(glyph));
  }

  return {
    id: `project-${Date.now()}`,
    name: '新規フォントプロジェクト (OTEdit Web)',
    metadata: defaultMeta,
    glyphs: sampleGlyphs,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/**
 * Center all glyph contours inside their advanceWidth and balance side bearings (LSB == RSB)
 * Fixes hand-drawn glyphs that lean left or right.
 */
export function balanceProjectGlyphMargins(project: FontProject): { project: FontProject; modifiedCount: number } {
  const updatedGlyphs = { ...project.glyphs };
  let modifiedCount = 0;

  for (const [key, g] of Object.entries(updatedGlyphs)) {
    if (!g.contours || g.contours.length === 0) continue;
    if (isAsymmetricOrPunctuationGlyph(g.unicode, g.char)) continue;
    const bbox = getContoursBoundingBox(g.contours);
    if (bbox.width <= 0) continue;

    const adv = Math.round(
      Number.isFinite(g.advanceWidth) && (g.advanceWidth ?? 0) > 0
        ? (g.advanceWidth ?? 1000)
        : (g.unicode > 255 ? (project.metadata.unitsPerEm || DEFAULT_UPM) : Math.round((project.metadata.unitsPerEm || DEFAULT_UPM) / 2))
    );

    const targetCenter = adv / 2;
    const dx = Math.round(targetCenter - bbox.centerX);

    if (Math.abs(dx) > 0) {
      const centeredContours = transformContours(g.contours, (p) => ({
        x: p.x + dx,
        y: p.y,
      }));
      const newBbox = getContoursBoundingBox(centeredContours);
      updatedGlyphs[Number(key)] = {
        ...g,
        contours: centeredContours,
        lsb: Math.max(0, Math.round(newBbox.minX)),
        modified: true,
      };
      modifiedCount++;
    }
  }

  return {
    project: {
      ...project,
      glyphs: updatedGlyphs,
      updatedAt: Date.now(),
    },
    modifiedCount,
  };
}
