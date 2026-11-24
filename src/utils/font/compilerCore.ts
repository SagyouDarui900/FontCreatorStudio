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
import { validateFontProject, stripInvalidPixelData, parseKerningPairKey } from './validation';
import { contoursToOpenTypePath } from './paths';
import { deriveProjectPaltMetrics, deriveProjectVpalMetrics } from './metrics';
import { injectKernTable, injectSfntTables, type KernPair } from './kernTable';
import {
  buildGposTableBytes,
  buildHheaTableBytes,
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
 * FNV-1a 32-bit hash, rendered as 8 lowercase hex digits. Used for the
 * deterministic `uniqueID`: same project content always yields the same
 * value, and no clock or random input is involved.
 */
function fnv1aHex(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/**
 * Horizontal extent of an opentype.js path: the minimum and maximum x
 * over all command points, including bezier control points (the same
 * convention opentype.js `Glyph.getMetrics` uses, so the hmtx side
 * bearing and the hhea values derived from it agree). Returns null for
 * an empty path.
 */
function getOpenTypePathXBounds(path: opentype.Path): { xMin: number; xMax: number } | null {
  let xMin = Number.POSITIVE_INFINITY;
  let xMax = Number.NEGATIVE_INFINITY;
  for (const cmd of path.commands || []) {
    // PathCommand is a union (Z has no coordinates, M/L lack control
    // points); read through an optional view instead.
    const coords = cmd as { x?: number; x1?: number; x2?: number };
    for (const x of [coords.x, coords.x1, coords.x2]) {
      if (typeof x === 'number' && Number.isFinite(x)) {
        if (x < xMin) xMin = x;
        if (x > xMax) xMax = x;
      }
    }
  }
  return xMin === Number.POSITIVE_INFINITY ? null : { xMin, xMax };
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
      }
    }
  }

  // Horizontal metrics from the actual outlines (OpenType spec: the
  // minLeftSideBearing / minRightSideBearing / xMaxExtent values are
  // computed using only glyphs that have contours).
  // - advanceWidthMax: maximum advance width over all glyphs.
  // - minLeftSideBearing: minimum hmtx left side bearing (outline xMin).
  // - minRightSideBearing: Min(aw - lsb - (xMax - xMin)).
  // - xMaxExtent: Max(lsb + (xMax - xMin)).
  // Each glyph's `leftSideBearing` is set here as well: opentype.js
  // leaves it undefined for constructed glyphs, which made its own
  // hmtx / hhea computation produce NaN (written as 0) for every
  // side bearing. Setting it also fixes the hmtx side bearings.
  let hheaAdvanceWidthMax = 0;
  let hheaMinLeftSideBearing = Number.POSITIVE_INFINITY;
  let hheaMinRightSideBearing = Number.POSITIVE_INFINITY;
  let hheaXMaxExtent = 0;
  for (const glyph of glyphsList) {
    const adv = glyph.advanceWidth;
    if (typeof adv === 'number' && Number.isFinite(adv) && adv > hheaAdvanceWidthMax) {
      hheaAdvanceWidthMax = adv;
    }
    const bounds = glyph.path ? getOpenTypePathXBounds(glyph.path) : null;
    (glyph as unknown as { leftSideBearing: number }).leftSideBearing = bounds ? bounds.xMin : 0;
    if (bounds && typeof adv === 'number' && Number.isFinite(adv)) {
      const lsb = bounds.xMin;
      const extent = bounds.xMax - bounds.xMin;
      if (lsb < hheaMinLeftSideBearing) hheaMinLeftSideBearing = lsb;
      const rsb = adv - lsb - extent;
      if (rsb < hheaMinRightSideBearing) hheaMinRightSideBearing = rsb;
      const xExtent = lsb + extent;
      if (xExtent > hheaXMaxExtent) hheaXMaxExtent = xExtent;
    }
  }
  if (hheaMinLeftSideBearing === Number.POSITIVE_INFINITY) hheaMinLeftSideBearing = 0;
  if (hheaMinRightSideBearing === Number.POSITIVE_INFINITY) hheaMinRightSideBearing = 0;

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

  // OpenType OS/2 ulUnicodeRange bit assignments (OpenType spec 1.9.1):
  // bit -> Unicode ranges that set it. Each bit is set only when a
  // glyph in one of its ranges is actually present; nothing is forced
  // on. Bit numbers confirmed against the spec: Hiragana 49, Katakana
  // 50, CJK Unified Ideographs (incl. Ext A / Ext B) 59, Halfwidth and
  // Fullwidth Forms 68.
  const UNICODE_RANGE_BITS: { bit: number; ranges: [number, number][] }[] = [
    { bit: 0, ranges: [[0x0000, 0x007f]] }, // Basic Latin
    { bit: 1, ranges: [[0x0080, 0x00ff]] }, // Latin-1 Supplement
    { bit: 2, ranges: [[0x0100, 0x017f]] }, // Latin Extended-A
    { bit: 3, ranges: [[0x0180, 0x024f]] }, // Latin Extended-B
    { bit: 4, ranges: [[0x0250, 0x02af], [0x1d00, 0x1d7f], [0x1d80, 0x1dbf]] }, // IPA Extensions
    { bit: 5, ranges: [[0x02b0, 0x02ff], [0xa700, 0xa71f]] }, // Spacing Modifier Letters
    { bit: 6, ranges: [[0x0300, 0x036f], [0x1dc0, 0x1dff]] }, // Combining Diacritical Marks
    { bit: 7, ranges: [[0x0370, 0x03ff]] }, // Greek and Coptic
    { bit: 8, ranges: [[0x2c80, 0x2cff]] }, // Coptic
    { bit: 9, ranges: [[0x0400, 0x04ff], [0x0500, 0x052f], [0x2de0, 0x2dff], [0xa640, 0xa69f]] }, // Cyrillic
    { bit: 10, ranges: [[0x0530, 0x058f]] }, // Armenian
    { bit: 11, ranges: [[0x0590, 0x05ff]] }, // Hebrew
    { bit: 12, ranges: [[0xa500, 0xa63f]] }, // Vai
    { bit: 13, ranges: [[0x0600, 0x06ff], [0x0750, 0x077f]] }, // Arabic
    { bit: 14, ranges: [[0x07c0, 0x07ff]] }, // NKo
    { bit: 15, ranges: [[0x0900, 0x097f]] }, // Devanagari
    { bit: 16, ranges: [[0x0980, 0x09ff]] }, // Bangla
    { bit: 17, ranges: [[0x0a00, 0x0a7f]] }, // Gurmukhi
    { bit: 18, ranges: [[0x0a80, 0x0aff]] }, // Gujarati
    { bit: 19, ranges: [[0x0b00, 0x0b7f]] }, // Odia
    { bit: 20, ranges: [[0x0b80, 0x0bff]] }, // Tamil
    { bit: 21, ranges: [[0x0c00, 0x0c7f]] }, // Telugu
    { bit: 22, ranges: [[0x0c80, 0x0cff]] }, // Kannada
    { bit: 23, ranges: [[0x0d00, 0x0d7f]] }, // Malayalam
    { bit: 24, ranges: [[0x0e00, 0x0e7f]] }, // Thai
    { bit: 25, ranges: [[0x0e80, 0x0eff]] }, // Lao
    { bit: 26, ranges: [[0x10a0, 0x10ff], [0x2d00, 0x2d2f]] }, // Georgian
    { bit: 27, ranges: [[0x1b00, 0x1b7f]] }, // Balinese
    { bit: 28, ranges: [[0x1100, 0x11ff]] }, // Hangul Jamo
    { bit: 29, ranges: [[0x1e00, 0x1eff], [0x2c60, 0x2c7f], [0xa720, 0xa7ff]] }, // Latin Extended Additional
    { bit: 30, ranges: [[0x1f00, 0x1fff]] }, // Greek Extended
    { bit: 31, ranges: [[0x2000, 0x206f], [0x2e00, 0x2e7f]] }, // General Punctuation
    { bit: 32, ranges: [[0x2070, 0x209f]] }, // Superscripts and Subscripts
    { bit: 33, ranges: [[0x20a0, 0x20cf]] }, // Currency Symbols
    { bit: 34, ranges: [[0x20d0, 0x20ff]] }, // Combining Diacritical Marks for Symbols
    { bit: 35, ranges: [[0x2100, 0x214f]] }, // Letterlike Symbols
    { bit: 36, ranges: [[0x2150, 0x218f]] }, // Number Forms
    { bit: 37, ranges: [[0x2190, 0x21ff], [0x27f0, 0x27ff], [0x2900, 0x297f], [0x2b00, 0x2bff]] }, // Arrows
    { bit: 38, ranges: [[0x2200, 0x22ff], [0x2a00, 0x2aff], [0x27c0, 0x27ef], [0x2980, 0x29ff]] }, // Mathematical Operators
    { bit: 39, ranges: [[0x2300, 0x23ff]] }, // Miscellaneous Technical
    { bit: 40, ranges: [[0x2400, 0x243f]] }, // Control Pictures
    { bit: 41, ranges: [[0x2440, 0x245f]] }, // Optical Character Recognition
    { bit: 42, ranges: [[0x2460, 0x24ff]] }, // Enclosed Alphanumerics
    { bit: 43, ranges: [[0x2500, 0x257f]] }, // Box Drawing
    { bit: 44, ranges: [[0x2580, 0x259f]] }, // Block Elements
    { bit: 45, ranges: [[0x25a0, 0x25ff]] }, // Geometric Shapes
    { bit: 46, ranges: [[0x2600, 0x26ff]] }, // Miscellaneous Symbols
    { bit: 47, ranges: [[0x2700, 0x27bf]] }, // Dingbats
    { bit: 48, ranges: [[0x3000, 0x303f]] }, // CJK Symbols and Punctuation
    { bit: 49, ranges: [[0x3040, 0x309f]] }, // Hiragana
    { bit: 50, ranges: [[0x30a0, 0x30ff], [0x31f0, 0x31ff]] }, // Katakana
    { bit: 51, ranges: [[0x3100, 0x312f], [0x31a0, 0x31bf]] }, // Bopomofo
    { bit: 52, ranges: [[0x3130, 0x318f]] }, // Hangul Compatibility Jamo
    { bit: 53, ranges: [[0xa840, 0xa87f]] }, // Phags-pa
    { bit: 54, ranges: [[0x3200, 0x32ff]] }, // Enclosed CJK Letters and Months
    { bit: 55, ranges: [[0x3300, 0x33ff]] }, // CJK Compatibility
    { bit: 56, ranges: [[0xac00, 0xd7af]] }, // Hangul Syllables
    { bit: 57, ranges: [[0x10000, 0x10ffff]] }, // Non-Plane 0
    { bit: 58, ranges: [[0x10900, 0x1091f]] }, // Phoenician
    { bit: 59, ranges: [[0x4e00, 0x9fff], [0x2e80, 0x2eff], [0x2f00, 0x2fdf], [0x2ff0, 0x2fff], [0x3400, 0x4dbf], [0x20000, 0x2a6df], [0x3190, 0x319f]] }, // CJK Unified Ideographs
    { bit: 60, ranges: [[0xe000, 0xf8ff]] }, // Private Use Area (plane 0)
    { bit: 61, ranges: [[0x31c0, 0x31ef], [0xf900, 0xfaff], [0x2f800, 0x2fa1f]] }, // CJK Strokes / Compatibility Ideographs
    { bit: 62, ranges: [[0xfb00, 0xfb4f]] }, // Alphabetic Presentation Forms
    { bit: 63, ranges: [[0xfb50, 0xfdff]] }, // Arabic Presentation Forms-A
    { bit: 64, ranges: [[0xfe20, 0xfe2f]] }, // Combining Half Marks
    { bit: 65, ranges: [[0xfe10, 0xfe1f], [0xfe30, 0xfe4f]] }, // Vertical Forms / CJK Compatibility Forms
    { bit: 66, ranges: [[0xfe50, 0xfe6f]] }, // Small Form Variants
    { bit: 67, ranges: [[0xfe70, 0xfeff]] }, // Arabic Presentation Forms-B
    { bit: 68, ranges: [[0xff00, 0xffef]] }, // Halfwidth and Fullwidth Forms
    { bit: 69, ranges: [[0xfff0, 0xffff]] }, // Specials
    { bit: 70, ranges: [[0x0f00, 0x0fff]] }, // Tibetan
    { bit: 71, ranges: [[0x0700, 0x074f]] }, // Syriac
    { bit: 72, ranges: [[0x0780, 0x07bf]] }, // Thaana
    { bit: 73, ranges: [[0x0d80, 0x0dff]] }, // Sinhala
    { bit: 74, ranges: [[0x1000, 0x109f]] }, // Myanmar
    { bit: 75, ranges: [[0x1200, 0x137f], [0x1380, 0x139f], [0x2d80, 0x2ddf]] }, // Ethiopic
    { bit: 76, ranges: [[0x13a0, 0x13ff]] }, // Cherokee
    { bit: 77, ranges: [[0x1400, 0x167f]] }, // Unified Canadian Aboriginal Syllabics
    { bit: 78, ranges: [[0x1680, 0x169f]] }, // Ogham
    { bit: 79, ranges: [[0x16a0, 0x16ff]] }, // Runic
    { bit: 80, ranges: [[0x1780, 0x17ff], [0x19e0, 0x19ff]] }, // Khmer
    { bit: 81, ranges: [[0x1800, 0x18af]] }, // Mongolian
    { bit: 82, ranges: [[0x2800, 0x28ff]] }, // Braille Patterns
    { bit: 83, ranges: [[0xa000, 0xa48f], [0xa490, 0xa4cf]] }, // Yi Syllables / Yi Radicals
    { bit: 84, ranges: [[0x1700, 0x171f], [0x1720, 0x173f], [0x1740, 0x175f], [0x1760, 0x177f]] }, // Tagalog / Hanunoo / Buhid / Tagbanwa
    { bit: 85, ranges: [[0x10300, 0x1032f]] }, // Old Italic
    { bit: 86, ranges: [[0x10330, 0x1034f]] }, // Gothic
    { bit: 87, ranges: [[0x10400, 0x1044f]] }, // Deseret
    { bit: 88, ranges: [[0x1d000, 0x1d0ff], [0x1d100, 0x1d1ff], [0x1d200, 0x1d24f]] }, // Musical Symbols
    { bit: 89, ranges: [[0x1d400, 0x1d7ff]] }, // Mathematical Alphanumeric Symbols
    { bit: 90, ranges: [[0xf0000, 0xffffd], [0x100000, 0x10fffd]] }, // Private Use (planes 15-16)
    { bit: 91, ranges: [[0xfe00, 0xfe0f], [0xe0100, 0xe01ef]] }, // Variation Selectors
    { bit: 92, ranges: [[0xe0000, 0xe007f]] }, // Tags
    { bit: 93, ranges: [[0x1900, 0x194f]] }, // Limbu
    { bit: 94, ranges: [[0x1950, 0x197f]] }, // Tai Le
    { bit: 95, ranges: [[0x1980, 0x19df]] }, // New Tai Lue
    { bit: 96, ranges: [[0x1a00, 0x1a1f]] }, // Buginese
    { bit: 97, ranges: [[0x2c00, 0x2c5f]] }, // Glagolitic
    { bit: 98, ranges: [[0x2d30, 0x2d7f]] }, // Tifinagh
    { bit: 99, ranges: [[0x4dc0, 0x4dff]] }, // Yijing Hexagram Symbols
    { bit: 100, ranges: [[0xa800, 0xa82f]] }, // Syloti Nagri
    { bit: 101, ranges: [[0x10000, 0x1007f], [0x10080, 0x100ff], [0x10100, 0x1013f]] }, // Linear B
    { bit: 102, ranges: [[0x10140, 0x1018f]] }, // Ancient Greek Numbers
    { bit: 103, ranges: [[0x10380, 0x1039f]] }, // Ugaritic
    { bit: 104, ranges: [[0x103a0, 0x103df]] }, // Old Persian
    { bit: 105, ranges: [[0x10450, 0x1047f]] }, // Shavian
    { bit: 106, ranges: [[0x10480, 0x104af]] }, // Osmanya
    { bit: 107, ranges: [[0x10800, 0x1083f]] }, // Cypriot Syllabary
    { bit: 108, ranges: [[0x10a00, 0x10a5f]] }, // Kharoshthi
    { bit: 109, ranges: [[0x1d300, 0x1d35f]] }, // Tai Xuan Jing Symbols
    { bit: 110, ranges: [[0x12000, 0x123ff], [0x12400, 0x1247f]] }, // Cuneiform
    { bit: 111, ranges: [[0x1d360, 0x1d37f]] }, // Counting Rod Numerals
    { bit: 112, ranges: [[0x1b80, 0x1bbf]] }, // Sundanese
    { bit: 113, ranges: [[0x1c00, 0x1c4f]] }, // Lepcha
    { bit: 114, ranges: [[0x1c50, 0x1c7f]] }, // Ol Chiki
    { bit: 115, ranges: [[0xa880, 0xa8df]] }, // Saurashtra
    { bit: 116, ranges: [[0xa900, 0xa92f]] }, // Kayah Li
    { bit: 117, ranges: [[0xa930, 0xa95f]] }, // Rejang
    { bit: 118, ranges: [[0xaa00, 0xaa5f]] }, // Cham
    { bit: 119, ranges: [[0x10190, 0x101cf]] }, // Ancient Symbols
    { bit: 120, ranges: [[0x101d0, 0x101ff]] }, // Phaistos Disc
    { bit: 121, ranges: [[0x102a0, 0x102df], [0x10280, 0x1029f], [0x10920, 0x1093f]] }, // Carian / Lycian / Lydian
    { bit: 122, ranges: [[0x1f030, 0x1f09f], [0x1f000, 0x1f02f]] }, // Domino / Mahjong Tiles
  ];

  // Calculate accurate OpenType OS/2 ulUnicodeRange flags from glyphs in project
  const unicodeRangeBits = new Set<number>();
  for (const glyph of glyphsList) {
    const u = typeof glyph.unicode === 'number' ? glyph.unicode : 0;
    if (u <= 0) continue; // .notdef (unicode 0) is not a real character
    for (const { bit, ranges } of UNICODE_RANGE_BITS) {
      if (unicodeRangeBits.has(bit)) continue;
      for (const [start, end] of ranges) {
        if (u >= start && u <= end) {
          unicodeRangeBits.add(bit);
          break;
        }
      }
    }
  }
  let uRange1 = 0;
  let uRange2 = 0;
  let uRange3 = 0;
  let uRange4 = 0;
  for (const bit of unicodeRangeBits) {
    if (bit < 32) uRange1 |= 1 << bit;
    else if (bit < 64) uRange2 |= 1 << (bit - 32);
    else if (bit < 96) uRange3 |= 1 << (bit - 64);
    else uRange4 |= 1 << (bit - 96);
  }
  // Bitwise OR keeps the sign bit as a negative number (e.g. bit 31);
  // normalize to unsigned 32-bit values for the ULONG fields.
  uRange1 >>>= 0;
  uRange2 >>>= 0;
  uRange3 >>>= 0;
  uRange4 >>>= 0;

  // OS/2 Table: Code Page Ranges (OpenType spec). Each bit is set only
  // when glyphs encodable in that code page are present. In particular
  // Shift-JIS (932, bit 17) is set only for Japanese glyphs (kana,
  // kanji, vertical forms, halfwidth/fullwidth forms), never
  // unconditionally.
  const hasUnicodeBit = (...bits: number[]): boolean => bits.some((b) => unicodeRangeBits.has(b));
  let ulCodePageRange1 = 0;
  if (hasUnicodeBit(0)) ulCodePageRange1 |= 1 << 0; // 1252 Latin 1
  if (hasUnicodeBit(2, 3)) ulCodePageRange1 |= 1 << 1; // 1250 Latin 2
  if (hasUnicodeBit(9)) ulCodePageRange1 |= 1 << 2; // 1251 Cyrillic
  if (hasUnicodeBit(7)) ulCodePageRange1 |= 1 << 3; // 1253 Greek
  if (hasUnicodeBit(11)) ulCodePageRange1 |= 1 << 5; // 1255 Hebrew
  if (hasUnicodeBit(13)) ulCodePageRange1 |= 1 << 6; // 1256 Arabic
  if (hasUnicodeBit(24)) ulCodePageRange1 |= 1 << 16; // 874 Thai
  // Bit 48 (CJK Symbols and Punctuation) is deliberately not enough on
  // its own: the synthetic fullwidth space (U+3000) always sets it, so
  // it would claim Shift-JIS for every font. Kana, kanji, vertical
  // forms and halfwidth/fullwidth forms are the Japanese signal.
  if (hasUnicodeBit(49, 50, 59, 61, 65, 68)) ulCodePageRange1 |= 1 << 17; // 932 JIS/Japan
  if (hasUnicodeBit(59, 61)) ulCodePageRange1 |= 1 << 18; // 936 Chinese Simplified
  if (hasUnicodeBit(28, 52, 56)) ulCodePageRange1 |= 1 << 19; // 949 Korean Wansung
  if (hasUnicodeBit(59, 61)) ulCodePageRange1 |= 1 << 20; // 950 Chinese Traditional
  const ulCodePageRange2 = 0; // No OEM code pages are claimed.
  font.tables.os2.ulCodePageRange1 = ulCodePageRange1;
  font.tables.os2.ulCodePageRange2 = ulCodePageRange2;

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
  // hhea metrics from the actual outlines (computed above). The same
  // values are also injected as raw `hhea` bytes after serialization,
  // because opentype.js recomputes hhea when writing and ignores this
  // object (see the extraTables injection below).
  font.tables.hhea.advanceWidthMax = hheaAdvanceWidthMax;
  font.tables.hhea.minLeftSideBearing = hheaMinLeftSideBearing;
  font.tables.hhea.minRightSideBearing = hheaMinRightSideBearing;
  font.tables.hhea.xMaxExtent = hheaXMaxExtent;
  font.tables.hhea.caretSlopeRise = 1;
  font.tables.hhea.caretSlopeRun = 0;
  font.tables.hhea.caretOffset = 0;

  // Deterministic uniqueID: a content hash (version, UPM, glyph count,
  // advances, outlines, kerning) instead of Date.now(), so the same
  // project content always produces the same value and repeated exports
  // are byte-identical in the name table.
  const versionMatch = /(\d+(?:\.\d+)?)/.exec(project.metadata.version || '');
  const uniqueIdVersion = versionMatch ? versionMatch[1] : '1.000';
  const contentHash = fnv1aHex(
    [
      project.metadata.version || 'Version 1.000',
      postScriptName,
      String(upm),
      String(glyphsList.length),
      ...glyphsList.map((glyph) => {
        const commands = (glyph.path?.commands || [])
          .map((cmd) => {
            const c = cmd as { type: string; x?: number; y?: number; x1?: number; y1?: number; x2?: number; y2?: number };
            return [c.type, c.x, c.y, c.x1, c.y1, c.x2, c.y2].join(',');
          })
          .join(';');
        return `${glyph.unicode}:${glyph.advanceWidth}:${commands}`;
      }),
      ...Object.entries(configuredKerning)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([key, value]) => `${key}=${value}`),
    ].join('|')
  );

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
    platNames.uniqueID = { en: `${uniqueIdVersion};${postScriptName};${contentHash}` };

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
    // Dedupe by glyph-index pair: the same pair given once as characters
    // ("A,V") and once as code points ("U+0041,U+0056") must produce a
    // single entry. The last entry wins, matching font.kerningPairs.
    const kerningPairByIndex = new Map<string, KernPair>();

    for (const [pairKey, val] of Object.entries(configuredKerning)) {
      if (typeof val !== 'number' || Math.abs(val) < 0.1) continue;

      // Shared with validateFontProject: "char1,char2", "U+XXXX,0xXXXX"
      // hex, or "44,65" decimal code points. A key whose left or right
      // side is "," itself (`,,X`, `A,,`) cannot be split unambiguously
      // and is rejected here; validation warns about it before compile.
      const { left, right } = parseKerningPairKey(pairKey);
      if (left === null || right === null) {
        console.warn(`カーニング「${pairKey}」の文字指定が無効なため、書き出し時に除外されます。`);
        continue;
      }
      const leftChar = safeFromCodePoint(left);
      const rightChar = safeFromCodePoint(right);
      if (leftChar === null || rightChar === null) continue;

      // Resolve glyph indices
      const leftIdx =
        (font as any).hasChar?.(leftChar) ? (font as any).charToGlyphIndex(leftChar) : -1;
      const rightIdx =
        (font as any).hasChar?.(rightChar) ? (font as any).charToGlyphIndex(rightChar) : -1;

      if (leftIdx > 0 && rightIdx > 0) {
        // Register in opentype.js font.kerningPairs map for in-browser rendering / metrics
        font.kerningPairs[`${leftIdx},${rightIdx}`] = Math.round(val);
        kerningPairByIndex.set(`${leftIdx},${rightIdx}`, {
          leftIndex: leftIdx,
          rightIndex: rightIdx,
          value: Math.round(val),
        });
      } else {
        console.warn(`カーニング「${pairKey}」の対象グリフが存在しないため、書き出し時に除外されます。`);
      }
    }
    validKerningPairs = [...kerningPairByIndex.values()];

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

      // Registration failures are collected and thrown after all
      // features are registered, so one bad entry fails the compile
      // instead of silently dropping a feature. Duplicates do not
      // reach this list: opentype.js overwrites a duplicate Single
      // substitution and ignores a duplicate ligature without throwing.
      const gsubFailures: string[] = [];
      const recordGsubFailure = (what: string, script: string, err: unknown): void => {
        gsubFailures.push(
          `${what} (${script}): ${err instanceof Error ? err.message : '不明なエラー'}`
        );
      };

      // Ligatures are registered before the vertical singles: opentype.js
      // requires features to be created in alphabetical order
      // (getFeatureTable asserts `feature >= last created feature`), and
      // 'liga' / 'dlig' / 'rlig' sort before 'vert' / 'vrt2'. Registering
      // ligatures after vert made every ligature throw and be swallowed
      // by the catch below whenever any vertical pair existed, so the
      // font was exported with no ligatures and no error. Within the
      // ligatures, entries are sorted by feature tag for the same reason;
      // types sorting at or after 'vert' go after the vertical singles.
      const enabledLigatures = openTypeFeaturesEnabled
        ? [...(featureConfig?.ligatures || [])]
            .filter((ligature) => ligature.enabled && ligature.inputChars.length >= 2)
            .sort((a, b) => (a.type < b.type ? -1 : a.type > b.type ? 1 : 0))
        : [];
      const registerLigature = (
        ligature: NonNullable<typeof featureConfig>['ligatures'][number]
      ): void => {
        const sourceIndices = ligature.inputChars
          .map((char) => char.codePointAt(0))
          .map((unicode) => (unicode === undefined ? undefined : unicodeToGlyphIndex.get(unicode)));
        const targetIndex = unicodeToGlyphIndex.get(ligature.substituteUnicode);
        if (sourceIndices.some((index) => index === undefined) || targetIndex === undefined) return;
        for (const script of scripts) {
          try {
            substitutionApi.add?.(
              ligature.type,
              { sub: sourceIndices as number[], by: targetIndex },
              script
            );
          } catch (err) {
            recordGsubFailure(`合字 ${ligature.type} (${ligature.inputChars.join('')})`, script, err);
          }
        }
      };
      if (typeof substitutionApi.add === 'function') {
        for (const ligature of enabledLigatures) {
          if (ligature.type < 'vert') registerLigature(ligature);
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
              } catch (err) {
                recordGsubFailure(
                  `縦書き置換 ${feature} (${entry.srcIndex}→${entry.vertIndex})`,
                  script,
                  err
                );
              }
            }
          }
        }
      }

      if (typeof substitutionApi.add === 'function') {
        for (const ligature of enabledLigatures) {
          if (ligature.type >= 'vert') registerLigature(ligature);
        }
      }

      if (gsubFailures.length > 0) {
        throw new Error(`GSUB 登録に失敗しました: ${gsubFailures.join(' / ')}`);
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
  // Corrected `hhea` (real outline metrics, computed above): opentype.js
  // recomputes hhea from glyph metrics when serializing and ignores
  // `font.tables.hhea`, so the corrected table is injected here to
  // reach the written font. It is always injected, so every compile
  // goes through injectSfntTables (and the self-validation parse below).
  extraTables.push({
    tag: 'hhea',
    data: buildHheaTableBytes({
      ascender: asc,
      descender: desc,
      lineGap,
      advanceWidthMax: hheaAdvanceWidthMax,
      minLeftSideBearing: hheaMinLeftSideBearing,
      minRightSideBearing: hheaMinRightSideBearing,
      xMaxExtent: hheaXMaxExtent,
      numberOfHMetrics: font.glyphs.length,
    }),
  });
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
