import * as opentype from 'opentype.js';
import { FontProject, PathContour } from '../../types';
import {
  rotateContours,
  transformContours,
  getContoursBoundingBox,
  normalizeGlyphContoursWinding,
  unionContours,
} from '../pathUtils';
import { pixelGridToContours } from '../pixelFontUtils';
import {
  DEFAULT_UPM,
  DEFAULT_ASCENDER,
  DEFAULT_DESCENDER,
  isAsymmetricOrPunctuationGlyph,
} from './constants';
import { contoursToOpenTypePath } from './paths';
import { deriveProjectPaltMetrics } from './metrics';

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
  const glyphsList: opentype.Glyph[] = [];

  // .notdef glyph is required as the first glyph (index 0)
  const notdefPath = new opentype.Path();
  // Draw standard rectangular box with cross for .notdef
  const boxWidth = 500;
  const boxHeight = 700;
  const margin = 50;
  notdefPath.moveTo(margin, 0);
  notdefPath.lineTo(boxWidth - margin, 0);
  notdefPath.lineTo(boxWidth - margin, boxHeight);
  notdefPath.lineTo(margin, boxHeight);
  notdefPath.close();
  // inner cut
  notdefPath.moveTo(margin + 40, 40);
  notdefPath.lineTo(margin + 40, boxHeight - 40);
  notdefPath.lineTo(boxWidth - margin - 40, boxHeight - 40);
  notdefPath.lineTo(boxWidth - margin - 40, 40);
  notdefPath.close();

  const notdefGlyph = new opentype.Glyph({
    name: '.notdef',
    unicode: 0,
    advanceWidth: 600,
    path: notdefPath,
  });
  glyphsList.push(notdefGlyph);

  // Map to track added unicodes to avoid duplicates
  const addedUnicodes = new Set<number>();
  addedUnicodes.add(0);

  // Track unicode bounds and advance widths
  let minUnicode = 0xffff;
  let maxUnicode = 0;
  let totalAdvanceWidth = 0;
  let maxAdvanceWidth = 0;

  const upm = project.metadata.unitsPerEm || DEFAULT_UPM;
  const baselineY = project.metadata.ascender || Math.round(upm * 0.8);
  const featureConfig = project.openTypeFeatures;
  const openTypeFeaturesEnabled = featureConfig?.enabled !== false;
  const verticalWritingEnabled = openTypeFeaturesEnabled && featureConfig?.verticalWriting?.enabled !== false;
  const enabledVerticalSubstitutions = new Set(
    (featureConfig?.verticalWriting?.substitutions || [])
      .filter((sub) => sub.enabled)
      .map((sub) => `${sub.sourceUnicode}:${sub.vertUnicode}`)
  );
  const configuredKerning: Record<string, number> = { ...(project.kerning || {}) };

  if (openTypeFeaturesEnabled) {
    for (const pair of featureConfig?.customKerningPairs || []) {
      if (!pair.enabled || !Number.isFinite(pair.amount)) continue;
      const key = `${String.fromCodePoint(pair.firstUnicode)},${String.fromCodePoint(pair.secondUnicode)}`;
      configuredKerning[key] = pair.amount;
    }

    // Embed Proportional Metrics (palt) adjustments into kerning / GPOS if enabled
    if (featureConfig?.palt?.enabled) {
      const paltItems =
        featureConfig.palt.paltList && featureConfig.palt.paltList.length > 0
          ? featureConfig.palt.paltList
          : deriveProjectPaltMetrics(project, featureConfig.palt.opticalSideBearingPercent || 5);

      for (const p of paltItems) {
        if (!p.enabled) continue;
        // Punctuation and bracket pairs kerning adjustment
        if (p.char === '」' || p.char === '）' || p.char === '、' || p.char === '。') {
          // Add tighter kern pair with following non-yakumono
          const followCandidates = ['「', '（', 'あ', 'い', 'う', 'え', 'お', '日', '本', '語'];
          for (const fc of followCandidates) {
            const pairKey = `${p.char},${fc}`;
            if (!configuredKerning[pairKey]) {
              configuredKerning[pairKey] = Math.round(p.deltaAdvance / 2);
            }
          }
        }
      }
    }
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
        : (g.unicode > 255 ? (project.metadata.unitsPerEm || DEFAULT_UPM) : Math.round((project.metadata.unitsPerEm || DEFAULT_UPM) / 2))
    );

    // Fallback: If contours are empty but pixelData exists with filled pixels, generate contours automatically
    if (glyphContours.length === 0 && g.pixelData?.data && g.pixelData.width && g.pixelData.height) {
      const pGrid = new Uint8Array(g.pixelData.data);
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
    const shouldMerge = options?.mergeOverlaps !== false;

    if (glyphContours.length > 0) {
      const origBbox = getContoursBoundingBox(glyphContours);
      if (origBbox.width > 0 && origBbox.height > 0) {
        // 1. Scale around optical center (anchorX, anchorY) so Japanese glyphs expand smoothly
        if (Math.abs(scaleFactor - 1.0) > 0.001) {
          const isAsymmetric = isAsymmetricOrPunctuationGlyph(g.unicode, g.char);
          const anchorX = (shouldBalance && !isAsymmetric) ? origBbox.centerX : advWidth / 2;
          // In screen coords (0..1000), Japanese 仮想ボディ (100..800) center is 450
          const anchorY = 450;

          // Safety boundary clamping: prevent expanding beyond em-box boundaries (0..1000)
          // which would cause vertical clipping or line collision in Word / web renderers
          let safeScale = scaleFactor;
          if (scaleFactor > 1.0) {
            const distTop = anchorY - origBbox.minY;
            const distBottom = origBbox.maxY - anchorY;
            if (distTop > 0) {
              const maxScaleTop = (anchorY - 20) / distTop;
              safeScale = Math.min(safeScale, maxScaleTop);
            }
            if (distBottom > 0) {
              const maxScaleBottom = (980 - anchorY) / distBottom;
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
      if (shouldMerge && glyphContours.length > 0) {
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
    if (advWidth > maxAdvanceWidth) maxAdvanceWidth = advWidth;
  }

  // Ensure ASCII Space (U+0020 / 32) exists with valid width
  if (!addedUnicodes.has(32)) {
    const spaceWidth = Math.round((project.metadata.unitsPerEm || DEFAULT_UPM) / 2);
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
  }

  // Ensure Fullwidth Space (U+3000 / 12288 / 全角空白) exists with full em width
  if (!addedUnicodes.has(12288)) {
    const fullSpaceWidth = project.metadata.unitsPerEm || DEFAULT_UPM;
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
  }

  // Automatic Vertical Writing Alternates (OpenType vert / Unicode Vertical Forms)
  // If user has not explicitly drawn vertical forms, derive them automatically from horizontal counterparts
  // so vertical writing (縦書き) works without missing glyphs or horizontal bar bugs.
  const verticalDerivations: {
    targetUnicode: number;
    sourceUnicode: number;
    action: 'rotate90' | 'shiftTopRight' | 'shiftTopRight_smallKana';
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
  ];

  // List of vertical substitution pairs: { srcUnicode, targetUnicode, srcIndex?, vertIndex? }
  const vertSubstPairs: { srcUnicode: number; targetUnicode: number; srcIndex?: number; vertIndex?: number }[] = [];

  for (const deriv of verticalDerivations) {
    const substitutionKey = `${deriv.sourceUnicode}:${deriv.targetUnicode}`;
    const explicitlyConfigured = (featureConfig?.verticalWriting?.substitutions?.length ?? 0) > 0;
    const substitutionEnabled =
      verticalWritingEnabled &&
      (!explicitlyConfigured || enabledVerticalSubstitutions.has(substitutionKey));

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
        const upm = project.metadata.unitsPerEm || DEFAULT_UPM;
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

        if (options?.mergeOverlaps !== false && derivedContours.length > 1) {
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
          advanceWidth: project.metadata.unitsPerEm || DEFAULT_UPM,
          path: path,
        });
        glyphsList.push(vertGlyph);
        addedUnicodes.add(deriv.targetUnicode);
        maxUnicode = Math.max(maxUnicode, deriv.targetUnicode);
      }
    }
  }

  // Generate safe ASCII PostScript name (no spaces, pure ASCII)
  const rawFamily = project.metadata.familyName || 'CustomFont';
  const rawStyle = project.metadata.styleName || 'Regular';
  const safeAsciiFamily = rawFamily.replace(/[^a-zA-Z0-9]/g, '') || 'CustomJapaneseFont';
  const safeAsciiStyle = rawStyle.replace(/[^a-zA-Z0-9]/g, '') || 'Regular';
  const postScriptName = `${safeAsciiFamily}-${safeAsciiStyle}`;

  const isBold = rawStyle.toLowerCase().includes('bold');
  const isItalic = rawStyle.toLowerCase().includes('italic');
  const avgWidth = glyphsList.length > 0 ? Math.round(totalAdvanceWidth / glyphsList.length) : 500;

  const font = new opentype.Font({
    familyName: rawFamily,
    styleName: rawStyle,
    unitsPerEm: project.metadata.unitsPerEm || DEFAULT_UPM,
    ascender: project.metadata.ascender || DEFAULT_ASCENDER,
    descender: project.metadata.descender || DEFAULT_DESCENDER,
    designer: project.metadata.designer || '',
    designerURL: project.metadata.designerUrl || '',
    manufacturer: project.metadata.manufacturer || '',
    copyright: project.metadata.copyright || '',
    version: project.metadata.version || 'Version 1.000',
    description: project.metadata.description || '',
    glyphs: glyphsList,
  });

  // Windows 11, macOS & Japanese OS/2 Compatibility Configuration
  if (!font.tables) {
    (font as any).tables = {};
  }
  if (!font.tables.os2) {
    font.tables.os2 = {} as any;
  }

  font.tables.os2.version = 4;
  font.tables.os2.xAvgCharWidth = avgWidth;
  font.tables.os2.usWeightClass = project.metadata.usWeightClass ?? (isBold ? 700 : 400);
  font.tables.os2.usWidthClass = project.metadata.usWidthClass ?? 5; // Medium (normal)
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
  font.tables.os2.achVendID = (project.metadata.vendorId || 'OTED').padEnd(4, ' ').slice(0, 4);

  // OS/2 Table: Windows & Typographic Line Metrics
  const asc = project.metadata.ascender || DEFAULT_ASCENDER;
  const desc = project.metadata.descender || DEFAULT_DESCENDER;
  const lineGap = project.metadata.lineGap ?? 0;

  font.tables.os2.usWinAscent = project.metadata.winAscent ?? Math.max(asc, 800);
  font.tables.os2.usWinDescent = project.metadata.winDescent ?? Math.abs(desc);
  font.tables.os2.sTypoAscender = project.metadata.typoAscender ?? asc;
  font.tables.os2.sTypoDescender = project.metadata.typoDescender ?? desc;
  font.tables.os2.sTypoLineGap = project.metadata.typoLineGap ?? lineGap;
  font.tables.os2.sCapHeight = project.metadata.capHeight || 700;
  font.tables.os2.sxHeight = project.metadata.xHeight || 500;
  // bit 7 (0x0080) = USE_TYPO_METRICS (essential for Windows DirectWrite/AviUtl2/GDI consistent line metrics)
  font.tables.os2.fsSelection =
    (isBold ? (isItalic ? 0x0021 : 0x0020) : isItalic ? 0x0001 : 0x0040) | 0x0080;
  font.tables.os2.usFirstCharIndex = minUnicode < 0xffff ? minUnicode : 32;
  font.tables.os2.usLastCharIndex = Math.min(0xffff, maxUnicode > 0 ? maxUnicode : 65535);

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
  if (typeof project.metadata.italicAngle === 'number') {
    font.tables.post.italicAngle = project.metadata.italicAngle;
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
  if (Object.keys(configuredKerning).length > 0) {
    if (!font.kerningPairs) {
      font.kerningPairs = {};
    }

    const validKerningPairs: { leftIndex: number; rightIndex: number; value: number }[] = [];

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
        leftIdx = (font as any).hasChar?.(String.fromCodePoint(code))
          ? (font as any).charToGlyphIndex(String.fromCodePoint(code))
          : -1;
      } else {
        leftIdx = (font as any).hasChar?.(leftChar)
          ? (font as any).charToGlyphIndex(leftChar)
          : -1;
      }

      if (rightChar.startsWith('U+') || rightChar.startsWith('0x')) {
        const code = parseInt(rightChar.replace(/^U\+|^0x/, ''), 16);
        rightIdx = (font as any).hasChar?.(String.fromCodePoint(code))
          ? (font as any).charToGlyphIndex(String.fromCodePoint(code))
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

    // Build standard OpenType kern table if pairs exist
    if (validKerningPairs.length > 0) {
      try {
        validKerningPairs.sort((a, b) =>
          a.leftIndex === b.leftIndex ? a.rightIndex - b.rightIndex : a.leftIndex - b.leftIndex
        );

        const nPairs = validKerningPairs.length;
        let entrySelector = 0;
        let searchRange = 1;
        while (searchRange * 2 <= nPairs) {
          searchRange *= 2;
          entrySelector++;
        }
        searchRange *= 6;
        const rangeShift = nPairs * 6 - searchRange;
        const subtableLength = 14 + nPairs * 6;

        const subtableFields: any[] = [
          { name: 'version', type: 'USHORT', value: 0 },
          { name: 'length', type: 'USHORT', value: subtableLength },
          { name: 'coverage', type: 'USHORT', value: 1 }, // Format 0 horizontal kerning
          { name: 'nPairs', type: 'USHORT', value: nPairs },
          { name: 'searchRange', type: 'USHORT', value: searchRange },
          { name: 'entrySelector', type: 'USHORT', value: entrySelector },
          { name: 'rangeShift', type: 'USHORT', value: rangeShift },
        ];

        for (let i = 0; i < nPairs; i++) {
          const pair = validKerningPairs[i];
          subtableFields.push({ name: `left_${i}`, type: 'USHORT', value: pair.leftIndex });
          subtableFields.push({ name: `right_${i}`, type: 'USHORT', value: pair.rightIndex });
          subtableFields.push({ name: `value_${i}`, type: 'SHORT', value: pair.value });
        }

        const opentypeRuntime = opentype as unknown as {
          ['Table']?: new (name: string, fields: unknown[]) => unknown;
        };
        const OpentypeTable = opentypeRuntime['Table'];
        if (!OpentypeTable) {
          throw new Error('opentype.js Table API is unavailable; retaining kerningPairs fallback');
        }
        const subtable = new OpentypeTable('kernSubtable', subtableFields);
        (font as any).tables.kern = new OpentypeTable('kern', [
          { name: 'version', type: 'USHORT', value: 0 },
          { name: 'nTables', type: 'USHORT', value: 1 },
          { name: 'subtable_0', type: 'TABLE', value: subtable },
        ]);
      } catch (kernErr) {
        console.warn('Failed to build binary kern table, kerning kept in font.kerningPairs:', kernErr);
      }
    }
  }

  // OpenType GSUB Layout Tables: 'vert' and 'vrt2' vertical writing substitution features
  if (font.substitution && typeof (font.substitution as any).addSingle === 'function' && vertSubstPairs.length > 0) {
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

      // Feature tags MUST be registered in alphabetical order in opentype.js ('vert' before 'vrt2')
      const features = ['vert', 'vrt2'];
      const scripts = ['DFLT', 'hani', 'kana', 'latn'];

      for (const feature of features) {
        for (const script of scripts) {
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
              try {
                (font.substitution as any).addSingle(feature, { sub: srcIndex, by: vertIndex }, script);
              } catch {
                // Ignore any duplicate or subtable collision
              }
            }
          }
        }
      }
    } catch (gsubErr) {
      console.warn('Failed to generate OpenType GSUB vertical writing table:', gsubErr);
    }
  }

  // Apply user-configured ligatures and vertical substitutions to the exported GSUB table.
  if (font.substitution && openTypeFeaturesEnabled) {
    const substitutionApi = font.substitution as unknown as {
      add?: (
        feature: string,
        substitution: { sub: number[]; by: number },
        script: string
      ) => void;
      addSingle?: (feature: string, substitution: { sub: number; by: number }, script: string) => void;
    };
    const glyphIndexByUnicode = new Map<number, number>();
    for (let i = 0; i < font.glyphs.length; i++) {
      const glyph = font.glyphs.get(i);
      if (typeof glyph.unicode === 'number' && glyph.unicode > 0) {
        glyphIndexByUnicode.set(glyph.unicode, i);
      }
      for (const unicode of glyph.unicodes || []) {
        if (typeof unicode === 'number' && unicode > 0) {
          glyphIndexByUnicode.set(unicode, i);
        }
      }
    }

    const scripts = ['DFLT', 'latn', 'hani', 'kana'];
    if (typeof substitutionApi.addSingle === 'function') {
      for (const sub of featureConfig?.verticalWriting?.substitutions || []) {
        if (!sub.enabled) continue;
        const sourceIndex = glyphIndexByUnicode.get(sub.sourceUnicode);
        const targetIndex = glyphIndexByUnicode.get(sub.vertUnicode);
        if (sourceIndex === undefined || targetIndex === undefined || sourceIndex === targetIndex) continue;
        for (const script of scripts) {
          substitutionApi.addSingle('vert', { sub: sourceIndex, by: targetIndex }, script);
        }
      }
    }

    if (typeof substitutionApi.add === 'function') {
      for (const ligature of featureConfig?.ligatures || []) {
        if (!ligature.enabled || ligature.inputChars.length < 2) continue;
        const sourceIndices = ligature.inputChars
          .map((char) => char.codePointAt(0))
          .map((unicode) => (unicode === undefined ? undefined : glyphIndexByUnicode.get(unicode)));
        const targetIndex = glyphIndexByUnicode.get(ligature.substituteUnicode);
        if (sourceIndices.some((index) => index === undefined) || targetIndex === undefined) continue;
        for (const script of scripts) {
          substitutionApi.add(
            ligature.type,
            { sub: sourceIndices as number[], by: targetIndex },
            script
          );
        }
      }
    }
  }

  const buffer = font.toArrayBuffer();

  // Self-Validation: Verify binary TrueType can be parsed cleanly by OpenType parser
  try {
    opentype.parse(buffer);
  } catch (parseErr) {
    console.warn('OpenType sanity parse warning:', parseErr);
  }

  let blobUrl = '';
  if (!options?.skipBlobUrl) {
    const blob = new Blob([buffer], { type: 'font/ttf' });
    blobUrl = URL.createObjectURL(blob);
  }

  return { font, buffer, blobUrl };
}
