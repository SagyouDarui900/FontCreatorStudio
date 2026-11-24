import * as opentype from 'opentype.js';
import { FontProject, PathContour } from '../../types';
import {
  rotateContours,
  transformContours,
  getContoursBoundingBox,
  normalizeGlyphContoursWinding,
  unionContours,
} from '../path';
import { pixelGridToContours, normalizePixelGrid } from '../pixelFontUtils';
import {
  DEFAULT_UPM,
  DEFAULT_ASCENDER,
  DEFAULT_DESCENDER,
  isAsymmetricOrPunctuationGlyph,
  resolveBaselineY,
} from './constants';
import { validateFontProject, stripInvalidPixelData } from './validation';
import { contoursToOpenTypePath } from './paths';
import { deriveProjectPaltMetrics, deriveProjectVpalMetrics } from './metrics';
import { injectKernTable, injectSfntTables, type KernPair } from './kernTable';
import {
  buildGposTableBytes,
  buildVheaTableBytes,
  buildVmtxTableBytes,
  type GposKernPair,
  type GposSinglePosEntry,
  type VmtxEntry,
} from './gposTable';
import type { PaltGlyphMetric, VpalGlyphMetric } from '../../types';

export interface CompileFontOptions {
  /**
   * Scale factor for exported glyphs.
   * - 1.35: 'standard_jp' (Optimized for Japanese typesetting, AviUtl2, Premiere, Word, where CJK occupies ~88% of em square)
   * - 1.0: 'raw' (Exact 1:1 canvas coordinates)
   * - Custom number: e.g. 1.2, 1.35, 1.5, etc.
   * Default: 1.35
   */
  scaleFactor?: number;
  /**
   * Automatically merge overlapping / intersecting contours into solid outer boundaries.
   * NOTE: TrueType rasterizers (DirectWrite, Windows GDI, FreeType, CoreText) natively render overlapping paths
   * with uniform clockwise winding (Non-Zero Winding) with 100% precision without needing raster boolean union.
   * Default: false (preserves 100% vector curve fidelity)
   */
  mergeOverlaps?: boolean;
  /**
   * Standardize all outer contour windings to TrueType Clockwise orientation.
   * Ensures non-zero winding rasterizers never cancel out intersecting strokes.
   * Default: true
   */
  normalizeWinding?: boolean;
  /**
   * Automatically balance left and right side bearings (LSB == RSB) inside advanceWidth
   * so hand-drawn glyphs are optically centered in their em-box rather than leaning left.
   * Default: true
   */
  balanceSideBearings?: boolean;
  /**
   * When true, skip creating an internal object URL via URL.createObjectURL(blob)
   * to avoid browser memory consumption when only the binary ArrayBuffer is needed.
   * Default: false
   */
  skipBlobUrl?: boolean;
}

/**
 * String.fromCodePoint throws a RangeError for values outside 0x0-0x10FFFF.
 * Return null instead so one invalid code point never aborts compilation.
 */
function safeFromCodePoint(code: number): string | null {
  try {
    return String.fromCodePoint(code);
  } catch {
    return null;
  }
}

/**
 * Infer OpenType OS/2 usWeightClass (100-900) from a style/subfamily name.
 * Multi-word/prefixed tokens (ExtraLight, SemiBold, ExtraBold) are matched
 * before Light/Bold so "SemiBold" resolves to 600 rather than 700.
 */
export function inferWeightClassFromStyleName(styleName?: string): number {
  const normalized = (styleName || 'Regular')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
  if (!normalized) return 400;
  if (normalized.includes('hairline') || normalized.includes('thin')) return 100;
  if (normalized.includes('extralight') || normalized.includes('ultralight')) return 200;
  if (normalized.includes('light')) return 300;
  if (normalized.includes('semibold') || normalized.includes('demibold')) return 600;
  if (normalized.includes('extrabold') || normalized.includes('ultrabold')) return 800;
  if (normalized.includes('bold')) return 700;
  if (normalized.includes('medium')) return 500;
  if (normalized.includes('heavy') || normalized.includes('black') || normalized.includes('extrablack')) return 900;
  return 400;
}

/**
 * Compile the FontProject into an OpenType font object and binary buffer
 */
export function compileFont(
  project: FontProject,
  options?: CompileFontOptions
): {
  font: opentype.Font;
  buffer: ArrayBuffer;
  blobUrl: string;
} {
  // One broken pixelData entry must not stop the whole export: strip
  // invalid pixelData (and normalize values to 0/1) before validating.
  // Callers that can notify the user (ExportModal) strip first as well
  // and report the excluded glyphs.
  project = stripInvalidPixelData(project).project;

  // Run project validation check prior to compilation.
  // Validation errors stop compilation: an invalid outline must not be
  // exported as if it were a valid font.
  const validation = validateFontProject(project);
  if (!validation.valid && validation.errors.length > 0) {
    throw new Error(`フォントの検証に失敗しました: ${validation.errors.join(' / ')}`);
  }

  const glyphsList: opentype.Glyph[] = [];

  // Clamped unitsPerEm, resolved first: .notdef dimensions, advance-width
  // fallbacks and the scale anchor below all derive from it, so the raw
  // metadata value must never leak into a fallback.
  const rawUpm = project.metadata?.unitsPerEm;
  const upm =
    typeof rawUpm === 'number' && Number.isFinite(rawUpm) && rawUpm > 0
      ? Math.max(16, Math.min(16384, Math.round(rawUpm)))
      : DEFAULT_UPM;

  // .notdef glyph is required as the first glyph (index 0)
  const notdefPath = new opentype.Path();
  // Draw standard rectangular box with cross for .notdef. Dimensions are
  // proportional to unitsPerEm (0.5 x 0.7 em, 0.05 em margin, 0.6 em
  // advance) instead of fixed 1000-UPM values.
  const boxWidth = Math.round(upm * 0.5);
  const boxHeight = Math.round(upm * 0.7);
  const margin = Math.round(upm * 0.05);
  const notdefInset = Math.round(upm * 0.04);
  notdefPath.moveTo(margin, 0);
  notdefPath.lineTo(boxWidth - margin, 0);
  notdefPath.lineTo(boxWidth - margin, boxHeight);
  notdefPath.lineTo(margin, boxHeight);
  notdefPath.close();
  // inner cut
  notdefPath.moveTo(margin + notdefInset, notdefInset);
  notdefPath.lineTo(margin + notdefInset, boxHeight - notdefInset);
  notdefPath.lineTo(boxWidth - margin - notdefInset, boxHeight - notdefInset);
  notdefPath.lineTo(boxWidth - margin - notdefInset, notdefInset);
  notdefPath.close();

  const notdefGlyph = new opentype.Glyph({
    name: '.notdef',
    unicode: 0,
    advanceWidth: Math.round(upm * 0.6),
    path: notdefPath,
  });
  glyphsList.push(notdefGlyph);

  // Map to track added unicodes to avoid duplicates
  const addedUnicodes = new Set<number>();
  addedUnicodes.add(0);

  // Track unicode bounds and advance widths. totalAdvanceWidth and
  // countedAdvanceGlyphs cover exactly the same glyph set (user glyphs,
  // the two synthetic spaces and the vertical derivations); .notdef is
  // a placeholder and is excluded from both, so xAvgCharWidth is the
  // mean of the advances actually summed.
  let minUnicode = 0xffff;
  let maxUnicode = 0;
  let totalAdvanceWidth = 0;
  let countedAdvanceGlyphs = 0;
  let maxAdvanceWidth = 0;

  const rawAscender = project.metadata?.ascender;
  const baselineY = resolveBaselineY(rawAscender, upm);
  const featureConfig = project.openTypeFeatures;
  const openTypeFeaturesEnabled = featureConfig?.enabled !== false;
  const verticalWritingEnabled = openTypeFeaturesEnabled && featureConfig?.verticalWriting?.enabled !== false;
  const configuredKerning: Record<string, number> = { ...(project.kerning || {}) };

  // Proportional metrics (palt / vpal). The modal's default is palt
  // enabled, so a project without an openTypeFeatures config (or without
  // a palt section) behaves the same as one saved from the modal:
  // palt is enabled unless it was explicitly turned off. The percent
  // uses ?? so that an explicit 0 (no optical padding) stays 0 instead
  // of falling back to 5.
  const paltConfig = featureConfig?.palt;
  const paltEnabled = openTypeFeaturesEnabled && (paltConfig?.enabled ?? true);
  const opticalSideBearingPercent =
    typeof paltConfig?.opticalSideBearingPercent === 'number' &&
    Number.isFinite(paltConfig.opticalSideBearingPercent)
      ? paltConfig.opticalSideBearingPercent
      : 5;
  let paltItems: PaltGlyphMetric[] = [];
  if (paltEnabled) {
    paltItems =
      paltConfig?.paltList && paltConfig.paltList.length > 0
        ? paltConfig.paltList
        : deriveProjectPaltMetrics(project, opticalSideBearingPercent);
  }
  // vpal items feed the vmtx table (built after the glyph list is final).
  // They are only used when palt is enabled and either a list was saved
  // or automatic derivation was not turned off.
  let vpalItems: VpalGlyphMetric[] = [];
  const vpalEnabled =
    paltEnabled &&
    ((paltConfig?.vpalList?.length ?? 0) > 0 || (paltConfig?.autoDeriveVpal ?? true));
  if (vpalEnabled) {
    vpalItems =
      paltConfig?.vpalList && paltConfig.vpalList.length > 0
        ? paltConfig.vpalList
        : deriveProjectVpalMetrics(project, opticalSideBearingPercent);
  }

  if (openTypeFeaturesEnabled) {
    for (const pair of featureConfig?.customKerningPairs || []) {
      if (!pair.enabled || !Number.isFinite(pair.amount)) continue;
      // Invalid Unicode values are rejected by validateFontProject before
      // compilation; skip them here as well so fromCodePoint never throws.
      const firstChar = safeFromCodePoint(pair.firstUnicode);
      const secondChar = safeFromCodePoint(pair.secondUnicode);
      if (firstChar === null || secondChar === null) continue;
      const key = `${firstChar},${secondChar}`;
      configuredKerning[key] = pair.amount;
    }
    // NOTE: palt is no longer simulated with kern pairs for a few
    // punctuation marks. The per-glyph advance adjustments are written
    // as a real GPOS `palt` / `pkna` table after serialization (see
    // below); the old kern pairs would have applied on top of GPOS and
    // double-counted the tightening.
  }

  // Add all user defined glyphs
  const glyphEntries = Object.values(project.glyphs);

  for (const g of glyphEntries) {
    if (!g || typeof g.unicode !== 'number' || isNaN(g.unicode) || g.unicode <= 0 || g.unicode > 0x10ffff) continue;
    if (addedUnicodes.has(g.unicode)) continue; // Prevent duplicate unicodes

    let glyphContours = g.contours || [];
    const advWidth = Math.round(
      Number.isFinite(g.advanceWidth) && (g.advanceWidth ?? 0) > 0
        ? (g.advanceWidth ?? 1000)
        : (g.unicode > 255 ? upm : Math.round(upm / 2))
    );

    // Fallback: If contours are empty but pixelData exists with filled pixels, generate contours automatically
    if (glyphContours.length === 0 && g.pixelData?.data && g.pixelData.width && g.pixelData.height) {
      const pGrid = normalizePixelGrid(g.pixelData.data);
      if (pGrid.some((val) => val === 1)) {
        glyphContours = pixelGridToContours(
          pGrid,
          g.pixelData.width,
          g.pixelData.height,
          project.metadata.unitsPerEm || DEFAULT_UPM,
          project.metadata.ascender || DEFAULT_ASCENDER,
          project.metadata.descender || DEFAULT_DESCENDER,
          advWidth,
          g.pixelData.shape || project.pixelFontSettings?.dotShape || 'square',
          project.pixelFontSettings?.mergeContours !== false
        );
      }
    }

    const scaleFactor = options?.scaleFactor !== undefined ? options.scaleFactor : 1.35;
    const shouldBalance = options?.balanceSideBearings !== false;
    const shouldMerge = options?.mergeOverlaps === true;

    // Filter degenerate or single-node contours that cannot form a valid polygon/path
    glyphContours = glyphContours.filter((c) => {
      if (!c || !c.nodes || c.nodes.length < 2) return false;
      return true;
    });

    if (glyphContours.length > 0) {
      const origBbox = getContoursBoundingBox(glyphContours);
      if (origBbox.width > 0 && origBbox.height > 0) {
        // 1. Scale around optical center (anchorX, anchorY) so Japanese glyphs expand smoothly
        if (Math.abs(scaleFactor - 1.0) > 0.001) {
          const isAsymmetric = isAsymmetricOrPunctuationGlyph(g.unicode, g.char);
          const anchorX = (shouldBalance && !isAsymmetric) ? origBbox.centerX : advWidth / 2;
          // Scale around the center of the Japanese virtual body, as a
          // fraction of unitsPerEm: the body spans 0.10..0.80 em, so its
          // center is 0.45 em. The clamps keep the expanded outline
          // inside a 0.02..0.98 em band.
          const anchorY = Math.round(upm * 0.45);
          const clampTop = Math.round(upm * 0.02);
          const clampBottom = Math.round(upm * 0.98);

          // Safety boundary clamping: prevent expanding beyond em-box boundaries
          // which would cause vertical clipping or line collision in Word / web renderers
          let safeScale = scaleFactor;
          if (scaleFactor > 1.0) {
            const distTop = anchorY - origBbox.minY;
            const distBottom = origBbox.maxY - anchorY;
            if (distTop > 0) {
              const maxScaleTop = (anchorY - clampTop) / distTop;
              safeScale = Math.min(safeScale, maxScaleTop);
            }
            if (distBottom > 0) {
              const maxScaleBottom = (clampBottom - anchorY) / distBottom;
              safeScale = Math.min(safeScale, maxScaleBottom);
            }
            safeScale = Math.max(1.0, safeScale);
          }

          glyphContours = transformContours(glyphContours, (p) => ({
            x: Math.round(anchorX + (p.x - anchorX) * safeScale),
            y: Math.round(anchorY + (p.y - anchorY) * safeScale),
          }));
        }

        // 2. Optical centering (balance LSB and RSB) for symmetric glyphs only
        if (shouldBalance && !isAsymmetricOrPunctuationGlyph(g.unicode, g.char)) {
          const scaledBbox = getContoursBoundingBox(glyphContours);
          if (scaledBbox.width > 0) {
            const targetCenter = advWidth / 2;
            const dx = Math.round(targetCenter - scaledBbox.centerX);
            if (Math.abs(dx) > 0) {
              glyphContours = transformContours(glyphContours, (p) => ({
                x: p.x + dx,
                y: p.y,
              }));
            }
          }
        }
      }

      // 3. Resolve overlaps & self-intersections (prevents white holes in single-stroke cursive loops & crossing strokes)
      if (shouldMerge && glyphContours.length > 0 && !g.pixelData) {
        try {
          glyphContours = unionContours(glyphContours, 1.2, true);
        } catch (e) {
          console.warn('Auto unionContours fallback for unicode', g.unicode, e);
        }
      }

      // 4. Standard TrueType Clockwise Winding normalization (pure vector math, 0 precision loss)
      if (options?.normalizeWinding !== false) {
        glyphContours = normalizeGlyphContoursWinding(glyphContours);
      }
    }

    const path = contoursToOpenTypePath(glyphContours, baselineY);

    const glyphName = g.name || (g.char ? `uni${g.unicode.toString(16).toUpperCase().padStart(4, '0')}` : `glyph${g.unicode}`);

    const glyph = new opentype.Glyph({
      name: glyphName,
      unicode: g.unicode,
      advanceWidth: advWidth,
      path: path,
    });

    glyphsList.push(glyph);
    addedUnicodes.add(g.unicode);

    if (g.unicode < minUnicode) minUnicode = g.unicode;
    if (g.unicode > maxUnicode) maxUnicode = g.unicode;
    totalAdvanceWidth += advWidth;
    countedAdvanceGlyphs += 1;
    if (advWidth > maxAdvanceWidth) maxAdvanceWidth = advWidth;
  }

  // Ensure ASCII Space (U+0020 / 32) exists with valid width
  if (!addedUnicodes.has(32)) {
    const spaceWidth = Math.round(upm / 2);
    const spaceGlyph = new opentype.Glyph({
      name: 'space',
      unicode: 32,
      advanceWidth: spaceWidth,
      path: new opentype.Path(),
    });
    glyphsList.push(spaceGlyph);
    addedUnicodes.add(32);
    minUnicode = Math.min(minUnicode, 32);
    maxUnicode = Math.max(maxUnicode, 32);
    totalAdvanceWidth += spaceWidth;
    countedAdvanceGlyphs += 1;
  }

  // Ensure Fullwidth Space (U+3000 / 12288 / 全角空白) exists with full em width
  if (!addedUnicodes.has(12288)) {
    const fullSpaceWidth = upm;
    const fullSpaceGlyph = new opentype.Glyph({
      name: 'space.fullwidth',
      unicode: 12288,
      advanceWidth: fullSpaceWidth,
      path: new opentype.Path(),
    });
    glyphsList.push(fullSpaceGlyph);
    addedUnicodes.add(12288);
    minUnicode = Math.min(minUnicode, 12288);
    maxUnicode = Math.max(maxUnicode, 12288);
    totalAdvanceWidth += fullSpaceWidth;
    countedAdvanceGlyphs += 1;
  }

  // Automatic Vertical Writing Alternates (OpenType vert / Unicode Vertical Forms)
  // If user has not explicitly drawn vertical forms, derive them automatically from horizontal counterparts
  // so vertical writing (縦書き) works without missing glyphs or horizontal bar bugs.
  const verticalDerivations: {
    targetUnicode: number;
    sourceUnicode: number;
    action: 'rotate90' | 'shiftTopRight';
    targetName?: string;
  }[] = [
    { targetUnicode: 0xfe31, sourceUnicode: 0x30fc, action: 'rotate90' }, // 長音符 ー -> ︱
    { targetUnicode: 0xfe33, sourceUnicode: 0x2015, action: 'rotate90' }, // ダッシュ ― -> ︳
    { targetUnicode: 0xfe41, sourceUnicode: 0x300c, action: 'rotate90' }, // 鉤括弧 「 -> ﹁
    { targetUnicode: 0xfe42, sourceUnicode: 0x300d, action: 'rotate90' }, // 鉤括弧 」 -> ﹂
    { targetUnicode: 0xfe43, sourceUnicode: 0x300e, action: 'rotate90' }, // 二重鉤括弧 『 -> ﹃
    { targetUnicode: 0xfe44, sourceUnicode: 0x300f, action: 'rotate90' }, // 二重鉤括弧 』 -> ﹄
    { targetUnicode: 0xfe35, sourceUnicode: 0xff08, action: 'rotate90' }, // 丸括弧 （ -> ︵
    { targetUnicode: 0xfe36, sourceUnicode: 0xff09, action: 'rotate90' }, // 丸括弧 ） -> ︶
    { targetUnicode: 0xfe3b, sourceUnicode: 0x3010, action: 'rotate90' }, // 隅付き括弧 【 -> ︻
    { targetUnicode: 0xfe3c, sourceUnicode: 0x3011, action: 'rotate90' }, // 隅付き括弧 】 -> ︼
    { targetUnicode: 0xfe11, sourceUnicode: 0x3001, action: 'shiftTopRight' }, // 読点 、 -> ︑
    { targetUnicode: 0xfe12, sourceUnicode: 0x3002, action: 'shiftTopRight' }, // 句点 。 -> ︒
    { targetUnicode: 0xfe19, sourceUnicode: 0x2026, action: 'rotate90' }, // 三点リーダー … -> ︙
    { targetUnicode: 0xfe4f, sourceUnicode: 0x301c, action: 'rotate90' }, // 波ダッシュ 〜 -> ︴
    { targetUnicode: 0xfe37, sourceUnicode: 0x007b, action: 'rotate90' }, // 波括弧 ｛ -> ︷
    { targetUnicode: 0xfe38, sourceUnicode: 0x007d, action: 'rotate90' }, // 波括弧 ｝ -> ︸
    { targetUnicode: 0xfe37, sourceUnicode: 0xff5b, action: 'rotate90' }, // 全角波括弧 ｛ -> ︷
    { targetUnicode: 0xfe38, sourceUnicode: 0xff5d, action: 'rotate90' }, // 全角波括弧 ｝ -> ︸
    { targetUnicode: 0xfe30, sourceUnicode: 0x2025, action: 'rotate90' }, // 二点リーダー ‥ -> ︰
  ];

  // List of vertical substitution pairs: { srcUnicode, targetUnicode, srcIndex?, vertIndex? }
  const vertSubstPairs: { srcUnicode: number; targetUnicode: number; srcIndex?: number; vertIndex?: number }[] = [];

  // A derivation stays enabled unless the user explicitly turned that
  // exact source:vert pair off in the OpenType settings. The previous
  // condition (any saved substitution list disables every derivation
  // not in the list) dropped derivations whenever the modal was saved,
  // because the preset list and this list disagreed on several pairs.
  const disabledVerticalSubstitutions = new Set(
    (featureConfig?.verticalWriting?.substitutions || [])
      .filter((sub) => !sub.enabled)
      .map((sub) => `${sub.sourceUnicode}:${sub.vertUnicode}`)
  );

  for (const deriv of verticalDerivations) {
    const substitutionKey = `${deriv.sourceUnicode}:${deriv.targetUnicode}`;
    const substitutionEnabled =
      verticalWritingEnabled && !disabledVerticalSubstitutions.has(substitutionKey);

    if (project.glyphs[deriv.sourceUnicode] && substitutionEnabled) {
      vertSubstPairs.push({ srcUnicode: deriv.sourceUnicode, targetUnicode: deriv.targetUnicode });
    }

    if (
      substitutionEnabled &&
      !addedUnicodes.has(deriv.targetUnicode) &&
      project.glyphs[deriv.sourceUnicode]
    ) {
      const srcGlyph = project.glyphs[deriv.sourceUnicode];
      if (srcGlyph.contours && srcGlyph.contours.length > 0) {
        const emCenter = upm / 2;
        let derivedContours: PathContour[] = [];
        if (deriv.action === 'rotate90') {
          derivedContours = rotateContours(srcGlyph.contours, 90, emCenter, emCenter);
        } else if (deriv.action === 'shiftTopRight') {
          const bbox = getContoursBoundingBox(srcGlyph.contours);
          const targetX = Math.round(upm * 0.75);
          const targetY = Math.round(upm * 0.25);
          const dx = targetX - bbox.centerX;
          const dy = targetY - bbox.centerY;
          derivedContours = transformContours(srcGlyph.contours, (p) => ({
            x: Math.round(p.x + dx),
            y: Math.round(p.y + dy),
          }));
        }

        if (options?.mergeOverlaps === true && derivedContours.length > 1) {
          try {
            derivedContours = unionContours(derivedContours);
          } catch (_) {}
        }
        if (options?.normalizeWinding !== false) {
          derivedContours = normalizeGlyphContoursWinding(derivedContours);
        }

        const path = contoursToOpenTypePath(derivedContours, baselineY);
        const vertGlyph = new opentype.Glyph({
          name: `vert_${deriv.targetUnicode.toString(16).toUpperCase()}`,
          unicode: deriv.targetUnicode,
          advanceWidth: upm,
          path: path,
        });
        glyphsList.push(vertGlyph);
        addedUnicodes.add(deriv.targetUnicode);
        maxUnicode = Math.max(maxUnicode, deriv.targetUnicode);
        totalAdvanceWidth += upm;
        countedAdvanceGlyphs += 1;
        if (upm > maxAdvanceWidth) maxAdvanceWidth = upm;
      }
    }
  }

  // Generate safe ASCII PostScript name (no spaces, pure ASCII)
  const rawFamily = project.metadata.familyName || 'CustomFont';
  const rawStyle = project.metadata.styleName || 'Regular';
  const safeAsciiFamily = rawFamily.replace(/[^a-zA-Z0-9]/g, '') || 'CustomJapaneseFont';
  const safeAsciiStyle = rawStyle.replace(/[^a-zA-Z0-9]/g, '') || 'Regular';
  const postScriptName = `${safeAsciiFamily}-${safeAsciiStyle}`;

  const rawWeight = project.metadata.usWeightClass;
  const inferredWeightClass = inferWeightClassFromStyleName(rawStyle);
  let safeWeightClass =
    typeof rawWeight === 'number' && Number.isFinite(rawWeight)
      ? Math.max(1, Math.min(1000, Math.round(rawWeight)))
      : inferredWeightClass;

  const styleLower = rawStyle.toLowerCase();
  const isItalic =
    styleLower.includes('italic') ||
    styleLower.includes('oblique') ||
    (typeof project.metadata.italicAngle === 'number' &&
      Number.isFinite(project.metadata.italicAngle) &&
      Math.abs(project.metadata.italicAngle) > 0.01);
  // In OpenType fsSelection, bit 5 (BOLD = 0x0020) marks Bold+ weights (>= 700) or explicit Bold,
  // excluding SemiBold/DemiBold (600) so Windows DirectWrite & CSS weight matching stays accurate.
  const isBold =
    safeWeightClass >= 700 ||
    (/\bbold\b/i.test(rawStyle) && !/(semi|demi|extra|ultra)/i.test(rawStyle));
  // The style name and the weight class must agree: a style named Bold
  // with usWeightClass still at 400 would set the BOLD bit while
  // reporting weight 400. Raise the weight to 700 in that case.
  if (isBold && safeWeightClass < 700) {
    safeWeightClass = 700;
  }
  // REGULAR (0x0040) is only set for a true regular weight (400) that is
  // neither bold nor italic. Medium (500) and SemiBold (600) must not
  // carry it, or they would be reported as both Regular and weight 500/600.
  const isRegularSelection = safeWeightClass === 400 && !isBold && !isItalic;

  const avgWidth =
    countedAdvanceGlyphs > 0 ? Math.round(totalAdvanceWidth / countedAdvanceGlyphs) : 500;

  // Ascender/descender fallbacks scale with unitsPerEm: the fallback
  // ascender is the baseline position (80% of UPM, same as
  // resolveBaselineY) and the fallback descender is baseline minus UPM,
  // so they agree with the baseline for any UPM instead of the fixed
  // 800 / -200 of a 1000-UPM font.
  const safeAscender =
    typeof project.metadata.ascender === 'number' && Number.isFinite(project.metadata.ascender)
      ? Math.round(project.metadata.ascender)
      : resolveBaselineY(project.metadata.ascender, upm);
  const safeDescender =
    typeof project.metadata.descender === 'number' && Number.isFinite(project.metadata.descender)
      ? Math.round(project.metadata.descender)
      : safeAscender - upm;

  const safeItalicAngle =
    typeof project.metadata.italicAngle === 'number' && Number.isFinite(project.metadata.italicAngle)
      ? project.metadata.italicAngle
      : 0;

  const font = new opentype.Font({
    familyName: rawFamily,
    styleName: rawStyle,
    unitsPerEm: upm,
    ascender: safeAscender,
    descender: safeDescender,
    designer: project.metadata.designer || '',
    designerURL: project.metadata.designerUrl || '',
    manufacturer: project.metadata.manufacturer || '',
    copyright: project.metadata.copyright || '',
    version: project.metadata.version || 'Version 1.000',
    description: project.metadata.description || '',
    glyphs: glyphsList,
  });
  (font as any).weightClass = safeWeightClass;
  (font as any).italicAngle = safeItalicAngle;

  // Windows 11, macOS & Japanese OS/2 Compatibility Configuration
  if (!font.tables) {
    (font as any).tables = {};
  }
  if (!font.tables.os2) {
    font.tables.os2 = {} as any;
  }

  const rawWidth = project.metadata.usWidthClass;
  const safeWidthClass =
    typeof rawWidth === 'number' && Number.isFinite(rawWidth)
      ? Math.max(1, Math.min(9, Math.round(rawWidth)))
      : 5;

  font.tables.os2.version = 4;
  font.tables.os2.xAvgCharWidth = avgWidth;
  font.tables.os2.usWeightClass = safeWeightClass;
  font.tables.os2.usWidthClass = safeWidthClass; // Medium (normal)
  font.tables.os2.fsType = 0x0000; // Installable embedding (no DRM restrictions)
  font.tables.os2.sFamilyClass = 0;
  font.tables.os2.panose = [2, 0, 5, 3, 0, 0, 0, 0, 0, 0];

  // Calculate accurate OpenType OS/2 ulUnicodeRange flags from glyphs in project
  let uRange1 = 0x00000001; // Basic Latin (0x20-0x7E)
  let uRange2 = 0x00000000;
  let uRange3 = 0x00000000;
  let uRange4 = 0x00000000;

  let hasHiragana = false;
  let hasKatakana = false;
  let hasKanji = false;

  for (const glyph of glyphsList) {
    const u = typeof glyph.unicode === 'number' ? glyph.unicode : 0;
    if (u >= 0x0080 && u <= 0x00ff) uRange1 |= 0x00000002; // Latin-1 Supplement
    if (u >= 0x0100 && u <= 0x017f) uRange1 |= 0x00000004; // Latin Extended-A
    if (u >= 0x0180 && u <= 0x024f) uRange1 |= 0x00000008; // Latin Extended-B
    if (u >= 0x3000 && u <= 0x303f) { uRange2 |= 0x00010000; } // Bit 48: CJK Symbols & Punctuation
    if (u >= 0x3040 && u <= 0x309f) { uRange2 |= 0x00020000; hasHiragana = true; } // Bit 49: Hiragana
    if (u >= 0x30a0 && u <= 0x30ff) { uRange2 |= 0x00040000; hasKatakana = true; } // Bit 50: Katakana
    if (u >= 0x31f0 && u <= 0x31ff) { uRange2 |= 0x01000000; } // Bit 56: Katakana Phonetic Extensions
    if (u >= 0x3200 && u <= 0x32ff) { uRange2 |= 0x02000000; } // Bit 57: Enclosed CJK Letters and Months
    if (u >= 0x3300 && u <= 0x33ff) { uRange2 |= 0x04000000; } // Bit 58: CJK Compatibility
    if (u >= 0x3400 && u <= 0x4dbf) { uRange2 |= 0x08000000; hasKanji = true; } // Bit 59: CJK Unified Ideographs Ext A
    if (u >= 0x4e00 && u <= 0x9fff) { uRange2 |= 0x08000000; hasKanji = true; } // Bit 59: CJK Unified Ideographs
    if (u >= 0xf900 && u <= 0xfaff) { uRange2 |= 0x20000000; } // Bit 61: CJK Compatibility Ideographs
    if (u >= 0x20000 && u <= 0x2a6df) { uRange2 |= 0x00002000; hasKanji = true; } // Bit 45: CJK Unified Ideographs Ext B
    if (u >= 0xff00 && u <= 0xffef) { uRange3 |= 0x00000010; } // Bit 68: Halfwidth and Fullwidth Forms
  }

  // Always enable Japanese script bitflags by default so OS treats font as Japanese
  uRange2 |= 0x00030000; // Hiragana & CJK Symbols
  if (hasKatakana || !hasHiragana) uRange2 |= 0x00040000; // Katakana
  if (hasKanji) uRange2 |= 0x08000000; // Kanji

  // OS/2 Table: Code Page Ranges (Crucial for Windows Japanese IME, DirectWrite & Font Selection)
  font.tables.os2.ulCodePageRange1 = 0x00020001;
  font.tables.os2.ulCodePageRange2 = 0x00000000;

  // OS/2 Table: Unicode Ranges
  font.tables.os2.ulUnicodeRange1 = uRange1;
  font.tables.os2.ulUnicodeRange2 = uRange2;
  font.tables.os2.ulUnicodeRange3 = uRange3;
  font.tables.os2.ulUnicodeRange4 = uRange4;
  const safeVendorId = (project.metadata.vendorId || 'OTED')
    .replace(/[^\x20-\x7e]/g, ' ')
    .padEnd(4, ' ')
    .slice(0, 4);
  font.tables.os2.achVendID = safeVendorId;

  // OS/2 Table: Windows & Typographic Line Metrics
  const asc = safeAscender;
  const desc = safeDescender;
  const lineGap =
    typeof project.metadata.lineGap === 'number' && Number.isFinite(project.metadata.lineGap)
      ? Math.round(project.metadata.lineGap)
      : 0;

  const rawWinAscent = project.metadata.winAscent;
  const rawWinDescent = project.metadata.winDescent;
  font.tables.os2.usWinAscent = Math.max(
    0,
    Math.round(
      typeof rawWinAscent === 'number' && Number.isFinite(rawWinAscent)
        ? rawWinAscent
        : Math.max(asc, 800)
    )
  );
  font.tables.os2.usWinDescent = Math.max(
    0,
    Math.round(
      typeof rawWinDescent === 'number' && Number.isFinite(rawWinDescent)
        ? rawWinDescent
        : Math.abs(desc)
    )
  );
  font.tables.os2.sTypoAscender =
    typeof project.metadata.typoAscender === 'number' && Number.isFinite(project.metadata.typoAscender)
      ? Math.round(project.metadata.typoAscender)
      : asc;
  font.tables.os2.sTypoDescender =
    typeof project.metadata.typoDescender === 'number' && Number.isFinite(project.metadata.typoDescender)
      ? Math.round(project.metadata.typoDescender)
      : desc;
  font.tables.os2.sTypoLineGap =
    typeof project.metadata.typoLineGap === 'number' && Number.isFinite(project.metadata.typoLineGap)
      ? Math.round(project.metadata.typoLineGap)
      : lineGap;
  font.tables.os2.sCapHeight =
    typeof project.metadata.capHeight === 'number' && Number.isFinite(project.metadata.capHeight)
      ? Math.round(project.metadata.capHeight)
      : 700;
  font.tables.os2.sxHeight =
    typeof project.metadata.xHeight === 'number' && Number.isFinite(project.metadata.xHeight)
      ? Math.round(project.metadata.xHeight)
      : 500;
  // bit 7 (0x0080) = USE_TYPO_METRICS (essential for Windows DirectWrite/AviUtl2/GDI consistent line metrics)
  font.tables.os2.fsSelection =
    (isBold ? 0x0020 : 0) |
    (isItalic ? 0x0001 : 0) |
    (isRegularSelection ? 0x0040 : 0) |
    0x0080;
  font.tables.os2.usFirstCharIndex = minUnicode < 0xffff ? minUnicode : 32;
  font.tables.os2.usLastCharIndex = Math.min(0xffff, maxUnicode > 0 ? maxUnicode : 32);

  // Ensure hhea table metrics match
  if (!font.tables.hhea) {
    font.tables.hhea = {} as any;
  }
  font.tables.hhea.ascender = asc;
  font.tables.hhea.descender = desc;
  font.tables.hhea.lineGap = lineGap;

  // Post table metadata
  if (!font.tables.post) {
    font.tables.post = {} as any;
  }
  if (typeof project.metadata.italicAngle === 'number' && Number.isFinite(project.metadata.italicAngle)) {
    // opentype.js makePostTable writes font.tables.post.italicAngle directly as a 16.16 Fixed integer
    font.tables.post.italicAngle = Math.round(project.metadata.italicAngle * 65536);
  }
  if (typeof project.metadata.isFixedPitch === 'boolean') {
    font.tables.post.isFixedPitch = project.metadata.isFixedPitch ? 1 : 0;
  }
  font.tables.hhea.advanceWidthMax = Math.max(maxAdvanceWidth, 1000);
  font.tables.hhea.minLeftSideBearing = 0;
  font.tables.hhea.minRightSideBearing = 0;
  font.tables.hhea.xMaxExtent = Math.max(maxAdvanceWidth, 1000);
  font.tables.hhea.caretSlopeRise = 1;
  font.tables.hhea.caretSlopeRun = 0;
  font.tables.hhea.caretOffset = 0;

  // Name table: bilingual support for Windows, Mac, and Unicode
  if (!font.names) {
    (font as any).names = {};
  }
  const allowedPlatforms = ['windows', 'macintosh', 'unicode'] as const;
  for (const key of Object.keys(font.names)) {
    if (!allowedPlatforms.includes(key as any)) {
      delete (font.names as any)[key];
    }
  }

  for (const plat of allowedPlatforms) {
    if (!(font.names as any)[plat]) {
      (font.names as any)[plat] = {};
    }
    const platNames = (font.names as any)[plat];
    platNames.fontFamily = { en: safeAsciiFamily, ...(rawFamily ? { ja: rawFamily } : {}) };
    platNames.fontSubfamily = { en: safeAsciiStyle, ...(rawStyle ? { ja: rawStyle } : {}) };
    platNames.fullName = {
      en: `${safeAsciiFamily} ${safeAsciiStyle}`,
      ...(rawFamily ? { ja: `${rawFamily} ${rawStyle}` } : {}),
    };
    platNames.postScriptName = { en: postScriptName };
    platNames.preferredFamily = { en: safeAsciiFamily, ...(rawFamily ? { ja: rawFamily } : {}) };
    platNames.preferredSubfamily = { en: safeAsciiStyle, ...(rawStyle ? { ja: rawStyle } : {}) };
    platNames.version = { en: project.metadata.version || 'Version 1.000' };
    platNames.uniqueID = { en: `1.000;${postScriptName};${Date.now()}` };

    if (project.metadata.copyright) {
      platNames.copyright = { en: project.metadata.copyright, ja: project.metadata.copyright };
    }
    if (project.metadata.license) {
      platNames.license = { en: project.metadata.license, ja: project.metadata.license };
    }
    if (project.metadata.licenseUrl) {
      platNames.licenseURL = { en: project.metadata.licenseUrl };
    }
    if (project.metadata.designer) {
      platNames.designer = { en: project.metadata.designer, ja: project.metadata.designer };
    }
    if (project.metadata.description) {
      platNames.description = { en: project.metadata.description, ja: project.metadata.description };
    }

    // Name ID 19 (Sample Text): Used by Windows 11 Font Settings & macOS Font Book preview
    const sampleJaChars = Object.values(project.glyphs)
      .map((g) => g.char)
      .filter((c) => c && c.trim() && /[ぁ-んァ-ヶー\u4e00-\u9faf]/.test(c))
      .slice(0, 12)
      .join('');
    const sampleJa = sampleJaChars.length >= 3 ? sampleJaChars : 'あいうえお かきくけこ';
    platNames.sampleText = {
      ja: sampleJa,
      en: 'The quick brown fox jumps over the lazy dog',
    };
  }

  // -------------------------------------------------------------
  // Kerning Pairs Processing (TrueType / OpenType kern table)
  // -------------------------------------------------------------
  // Hoisted: the binary kern table is injected after serialization (see
  // below), because opentype.js 2.0.0 never writes one.
  let validKerningPairs: KernPair[] = [];
  if (Object.keys(configuredKerning).length > 0) {
    if (!font.kerningPairs) {
      font.kerningPairs = {};
    }

    validKerningPairs = [];

    for (const [pairKey, val] of Object.entries(configuredKerning)) {
      if (typeof val !== 'number' || Math.abs(val) < 0.1) continue;

      let leftChar = '';
      let rightChar = '';

      if (pairKey.includes(',')) {
        const parts = pairKey.split(',');
        leftChar = parts[0];
        rightChar = parts[1];
      } else if ([...pairKey].length === 2) {
        const chars = [...pairKey];
        leftChar = chars[0];
        rightChar = chars[1];
      }

      if (!leftChar || !rightChar) continue;

      // Resolve glyph indices
      let leftIdx = -1;
      let rightIdx = -1;

      // If hex codes like "U+0041" or "0x0041"
      if (leftChar.startsWith('U+') || leftChar.startsWith('0x')) {
        const code = parseInt(leftChar.replace(/^U\+|^0x/, ''), 16);
        const leftCharFromCode = safeFromCodePoint(code);
        leftIdx =
          leftCharFromCode !== null && (font as any).hasChar?.(leftCharFromCode)
            ? (font as any).charToGlyphIndex(leftCharFromCode)
            : -1;
      } else {
        leftIdx = (font as any).hasChar?.(leftChar)
          ? (font as any).charToGlyphIndex(leftChar)
          : -1;
      }

      if (rightChar.startsWith('U+') || rightChar.startsWith('0x')) {
        const code = parseInt(rightChar.replace(/^U\+|^0x/, ''), 16);
        const rightCharFromCode = safeFromCodePoint(code);
        rightIdx =
          rightCharFromCode !== null && (font as any).hasChar?.(rightCharFromCode)
            ? (font as any).charToGlyphIndex(rightCharFromCode)
            : -1;
      } else {
        rightIdx = (font as any).hasChar?.(rightChar)
          ? (font as any).charToGlyphIndex(rightChar)
          : -1;
      }

      if (leftIdx > 0 && rightIdx > 0) {
        // Register in opentype.js font.kerningPairs map for in-browser rendering / metrics
        font.kerningPairs[`${leftIdx},${rightIdx}`] = Math.round(val);
        validKerningPairs.push({
          leftIndex: leftIdx,
          rightIndex: rightIdx,
          value: Math.round(val),
        });
      }
    }

    // The binary kern table is injected into the serialized font below
    // (injectKernTable): opentype.js 2.0.0 only parses kern tables and
    // never writes one, so building it here through its Table API was
    // impossible even before that API stopped being exported. The
    // in-memory font.kerningPairs map above is kept for in-browser
    // rendering and metrics.
  }

  // OpenType GSUB Layout Tables: consolidated vertical writing ('vert', 'vrt2') and ligature features
  const substitutionApi = (font as unknown as {
    substitution?: {
      add?: (
        feature: string,
        substitution: { sub: number[]; by: number },
        script: string
      ) => void;
      addSingle?: (feature: string, substitution: { sub: number; by: number }, script: string) => void;
    };
  }).substitution;

  // Configured substitutions that would be lost if the GSUB API is unavailable.
  const hasConfiguredSubstitutions =
    vertSubstPairs.length > 0 ||
    (openTypeFeaturesEnabled &&
      ((featureConfig?.verticalWriting?.substitutions || []).some((sub) => sub.enabled) ||
        (featureConfig?.ligatures || []).some(
          (ligature) => ligature.enabled && ligature.inputChars.length >= 2
        )));
  if (!substitutionApi && hasConfiguredSubstitutions) {
    throw new Error(
      'OpenType GSUB テーブルの生成に失敗しました: substitution API が利用できません'
    );
  }

  if (substitutionApi) {
    try {
      const unicodeToGlyphIndex = new Map<number, number>();
      for (let i = 0; i < font.glyphs.length; i++) {
        const g = font.glyphs.get(i);
        if (typeof g.unicode === 'number' && g.unicode > 0) {
          unicodeToGlyphIndex.set(g.unicode, i);
        }
        if (Array.isArray(g.unicodes)) {
          for (const u of g.unicodes) {
            if (typeof u === 'number' && u > 0) {
              unicodeToGlyphIndex.set(u, i);
            }
          }
        }
      }

      const scripts = ['DFLT', 'hani', 'kana', 'latn'];

      // Gather consolidated single substitutions for 'vert' and 'vrt2' without duplicates
      const registeredVertKeys = new Set<string>();
      const vertPairsToRegister: { srcIndex: number; vertIndex: number; features: ('vert' | 'vrt2')[] }[] = [];

      for (const pair of vertSubstPairs) {
        const srcIndex = pair.srcIndex ?? unicodeToGlyphIndex.get(pair.srcUnicode);
        const vertIndex = pair.vertIndex ?? unicodeToGlyphIndex.get(pair.targetUnicode);
        if (
          typeof srcIndex === 'number' &&
          typeof vertIndex === 'number' &&
          srcIndex >= 0 &&
          vertIndex >= 0 &&
          srcIndex !== vertIndex
        ) {
          vertPairsToRegister.push({ srcIndex, vertIndex, features: ['vert', 'vrt2'] });
        }
      }

      if (openTypeFeaturesEnabled) {
        for (const sub of featureConfig?.verticalWriting?.substitutions || []) {
          if (!sub.enabled) continue;
          const srcIndex = unicodeToGlyphIndex.get(sub.sourceUnicode);
          const vertIndex = unicodeToGlyphIndex.get(sub.vertUnicode);
          if (
            typeof srcIndex === 'number' &&
            typeof vertIndex === 'number' &&
            srcIndex >= 0 &&
            vertIndex >= 0 &&
            srcIndex !== vertIndex
          ) {
            vertPairsToRegister.push({ srcIndex, vertIndex, features: ['vert'] });
          }
        }
      }

      // Feature tags MUST be registered in alphabetical order in opentype.js ('vert' before 'vrt2')
      if (typeof substitutionApi.addSingle === 'function' && vertPairsToRegister.length > 0) {
        for (const feature of ['vert', 'vrt2'] as const) {
          for (const script of scripts) {
            for (const entry of vertPairsToRegister) {
              if (!entry.features.includes(feature)) continue;
              const dedupeKey = `${feature}:${script}:${entry.srcIndex}:${entry.vertIndex}`;
              if (registeredVertKeys.has(dedupeKey)) continue;
              registeredVertKeys.add(dedupeKey);
              try {
                substitutionApi.addSingle(feature, { sub: entry.srcIndex, by: entry.vertIndex }, script);
              } catch {
                // Ignore any duplicate or subtable collision
              }
            }
          }
        }
      }

      // Apply user-configured ligatures to the exported GSUB table
      if (openTypeFeaturesEnabled && typeof substitutionApi.add === 'function') {
        for (const ligature of featureConfig?.ligatures || []) {
          if (!ligature.enabled || ligature.inputChars.length < 2) continue;
          const sourceIndices = ligature.inputChars
            .map((char) => char.codePointAt(0))
            .map((unicode) => (unicode === undefined ? undefined : unicodeToGlyphIndex.get(unicode)));
          const targetIndex = unicodeToGlyphIndex.get(ligature.substituteUnicode);
          if (sourceIndices.some((index) => index === undefined) || targetIndex === undefined) continue;
          for (const script of scripts) {
            try {
              substitutionApi.add(
                ligature.type,
                { sub: sourceIndices as number[], by: targetIndex },
                script
              );
            } catch {
              // Ignore subtable collision for unsupported/duplicate ligature feature entries
            }
          }
        }
      }
    } catch (gsubErr) {
      // A missing GSUB table must not be treated as success: vertical
      // writing substitutions and ligatures would silently disappear.
      throw new Error(
        `OpenType GSUB テーブルの生成に失敗しました: ${gsubErr instanceof Error ? gsubErr.message : '不明なエラー'}`
      );
    }
  }

  let buffer = font.toArrayBuffer();

  // Insert the binary kern table into the serialized font. opentype.js
  // never writes a kern table, so it has to be injected here; the
  // self-validation parse below then covers the injected bytes too.
  if (validKerningPairs.length > 0) {
    try {
      buffer = injectKernTable(buffer, validKerningPairs);
    } catch (kernErr) {
      // A missing binary kern table must not be treated as success:
      // the in-memory kerningPairs fallback does not reach the file.
      throw new Error(
        `カーニングテーブルの生成に失敗しました: ${kernErr instanceof Error ? kernErr.message : '不明なエラー'}`
      );
    }
  }

  // -------------------------------------------------------------
  // GPOS (palt / pkna) and vertical metrics (vmtx / vhea)
  // -------------------------------------------------------------
  // opentype.js never writes these tables, so they are built as raw
  // bytes (gposTable.ts) and injected into the serialized font with the
  // same SFNT mechanism as the kern table. The injection happens before
  // the self-validation parse below, so the parse covers these bytes too.
  const glyphIndexByUnicode = new Map<number, number>();
  const glyphUnicodeByIndex = new Map<number, number>();
  for (let i = 0; i < font.glyphs.length; i++) {
    const g = font.glyphs.get(i);
    if (typeof g.unicode === 'number' && g.unicode > 0) {
      glyphIndexByUnicode.set(g.unicode, i);
      glyphUnicodeByIndex.set(i, g.unicode);
    }
  }

  const extraTables: { tag: string; data: Uint8Array }[] = [];
  const gposEntries: GposSinglePosEntry[] = [];
  if (paltEnabled && paltItems.length > 0) {
    for (const p of paltItems) {
      if (!p.enabled) continue;
      const glyphIndex = glyphIndexByUnicode.get(p.unicode);
      if (typeof glyphIndex !== 'number') continue;
      const glyph = font.glyphs.get(glyphIndex);
      const compiledAdvance =
        typeof glyph.advanceWidth === 'number' && Number.isFinite(glyph.advanceWidth)
          ? Math.round(glyph.advanceWidth)
          : p.originalAdvance;
      // The advance change is measured against the compiled glyph's own
      // advance width (hmtx), not the stored originalAdvance, so a
      // palt list saved from different metadata still lands correctly.
      const deltaAdvance = Math.round(p.proportionalAdvance) - compiledAdvance;
      if (deltaAdvance !== 0) {
        gposEntries.push({ glyphIndex, xAdvance: deltaAdvance });
      }
    }
  }
  // Kerning pairs are also written as a GPOS `kern` PairPos lookup (in
  // addition to the legacy kern table): once any GPOS table exists,
  // opentype.js reads kerning from GPOS only, so a palt-only GPOS would
  // otherwise make getKerningValue return 0 for every pair.
  const gposKernPairs: GposKernPair[] = validKerningPairs.map((pair) => ({
    leftGlyph: pair.leftIndex,
    rightGlyph: pair.rightIndex,
    value: pair.value,
  }));
  if (gposEntries.length > 0 || gposKernPairs.length > 0) {
    const gposBytes = buildGposTableBytes(gposEntries, glyphUnicodeByIndex, gposKernPairs);
    if (gposBytes !== null) {
      extraTables.push({ tag: 'GPOS', data: gposBytes });
    }
  }

  if (verticalWritingEnabled) {
    const configuredVertAdvance = featureConfig?.verticalWriting?.defaultVertAdvance;
    const defaultVertAdvance =
      typeof configuredVertAdvance === 'number' &&
      Number.isFinite(configuredVertAdvance) &&
      configuredVertAdvance > 0
        ? Math.round(configuredVertAdvance)
        : upm;
    const configuredVertOriginY = featureConfig?.verticalWriting?.vertOriginY;
    const vertOriginY =
      typeof configuredVertOriginY === 'number' && Number.isFinite(configuredVertOriginY)
        ? Math.round(configuredVertOriginY)
        : safeAscender;
    const vpalByUnicode = new Map<number, VpalGlyphMetric>();
    if (vpalEnabled) {
      for (const v of vpalItems) {
        if (v.enabled) vpalByUnicode.set(v.unicode, v);
      }
    }
    const numGlyphs = font.glyphs.length;
    const vmtxEntries: VmtxEntry[] = [];
    let advanceHeightMax = 0;
    let minTopSideBearing = Number.POSITIVE_INFINITY;
    let minBottomSideBearing = Number.POSITIVE_INFINITY;
    let xMaxExtent = 0;
    for (let i = 0; i < numGlyphs; i++) {
      const glyph = font.glyphs.get(i);
      const vpal = typeof glyph.unicode === 'number' ? vpalByUnicode.get(glyph.unicode) : undefined;
      const advanceHeight = vpal
        ? Math.max(1, Math.round(vpal.proportionalAdvance))
        : defaultVertAdvance;
      let topSideBearing = 0;
      let glyphHeight = 0;
      let glyphWidth = 0;
      if (glyph.path && glyph.path.commands && glyph.path.commands.length > 0) {
        try {
          const bbox = glyph.getBoundingBox();
          if (
            Number.isFinite(bbox.y1) &&
            Number.isFinite(bbox.y2) &&
            Number.isFinite(bbox.x1) &&
            Number.isFinite(bbox.x2)
          ) {
            // Font Y grows upward from the baseline; the vertical origin
            // sits vertOriginY above the baseline, so the top side
            // bearing is the origin minus the outline's top.
            topSideBearing = vertOriginY - Math.round(bbox.y2);
            glyphHeight = Math.round(bbox.y2 - bbox.y1);
            glyphWidth = Math.round(bbox.x2 - bbox.x1);
          }
        } catch {
          // A glyph whose bounding box cannot be read keeps tsb 0.
        }
      }
      vmtxEntries.push({ glyphIndex: i, advanceHeight, topSideBearing });
      if (advanceHeight > advanceHeightMax) advanceHeightMax = advanceHeight;
      if (topSideBearing < minTopSideBearing) minTopSideBearing = topSideBearing;
      const bottomSideBearing = advanceHeight - topSideBearing - glyphHeight;
      if (bottomSideBearing < minBottomSideBearing) minBottomSideBearing = bottomSideBearing;
      if (glyphWidth > xMaxExtent) xMaxExtent = glyphWidth;
    }
    extraTables.push({
      tag: 'vmtx',
      data: buildVmtxTableBytes(vmtxEntries, numGlyphs, defaultVertAdvance),
    });
    extraTables.push({
      tag: 'vhea',
      data: buildVheaTableBytes({
        ascender: safeAscender,
        descender: safeDescender,
        lineGap,
        advanceHeightMax,
        minTopSideBearing:
          minTopSideBearing === Number.POSITIVE_INFINITY ? 0 : minTopSideBearing,
        minBottomSideBearing:
          minBottomSideBearing === Number.POSITIVE_INFINITY ? 0 : minBottomSideBearing,
        xMaxExtent,
        numberOfVMetrics: numGlyphs,
      }),
    });
  }

  if (extraTables.length > 0) {
    try {
      buffer = injectSfntTables(buffer, extraTables);
    } catch (tableErr) {
      // A missing GPOS / vmtx / vhea table must not be treated as
      // success: the in-memory metrics do not reach the file.
      throw new Error(
        `GPOS / 垂直メトリクステーブルの生成に失敗しました: ${tableErr instanceof Error ? tableErr.message : '不明なエラー'}`
      );
    }
  }

  // Self-Validation: Verify binary OpenType (CFF outlines, sfnt version
  // OTTO) can be parsed cleanly by OpenType parser. opentype.js has no
  // TrueType (glyf) writer, so the compiled binary is always CFF-flavored
  // OpenType regardless of the requested filename extension.
  try {
    opentype.parse(buffer);
  } catch (parseErr: any) {
    console.error('OpenType sanity parse failed after compilation:', parseErr);
    throw new Error(
      `生成されたフォントバイナリの検証に失敗しました: ${parseErr?.message || '破損したOpenTypeデータです'}`
    );
  }

  let blobUrl = '';
  if (!options?.skipBlobUrl) {
    const blob = new Blob([buffer], { type: 'font/otf' });
    blobUrl = URL.createObjectURL(blob);
  }

  return { font, buffer, blobUrl };
}
