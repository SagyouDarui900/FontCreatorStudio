import * as opentype from 'opentype.js';
import { FontMetadata, FontProject, GlyphData } from '../../types';
import { compileFont, CompileFontOptions } from './compilerCore';
import { validateFontProject, stripInvalidPixelData } from './validation';
import { openTypePathToContours } from './paths';
import { SCREEN_BASELINE_Y, resolveBaselineY } from './constants';
import { isIOSDevice } from '../platform';

/**
 * Throw when the project fails validation, so callers never receive a
 * font built from invalid outlines. compileFont throws the same error,
 * but the explicit check keeps the failure visible at the export entry point.
 */
function assertValidFontProject(project: FontProject): void {
  // Strip broken pixelData first so one broken glyph does not block the
  // export of the remaining glyphs.
  const validation = validateFontProject(stripInvalidPixelData(project).project);
  if (!validation.valid) {
    throw new Error(`フォントの検証に失敗しました: ${validation.errors.join(' / ')}`);
  }
}

/**
 * Share or download the generated font file (.otf).
 * The format is always OTF: opentype.js writes CFF outlines with sfnt
 * version OTTO and has no TrueType (glyf) writer, so a .ttf filename
 * would mislabel the binary. The `format` parameter is kept as 'otf'
 * so call sites keep a single format argument.
 * Supports iPadOS/iOS native Share Sheet (ファイルに保存 / AirDrop) and direct download fallback.
 */
export async function shareOrDownloadFont(
  project: FontProject,
  format: 'otf' = 'otf',
  options?: CompileFontOptions
): Promise<{ method: 'share' | 'download'; filename: string }> {
  assertValidFontProject(project);
  const { buffer } = compileFont(project, { ...options, skipBlobUrl: true });
  const rawName = project.metadata.familyName || 'CustomFont';
  const safeName = rawName.replace(/[^a-zA-Z0-9_\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff-]/g, '_');
  const filename = `${safeName}-${project.metadata.styleName || 'Regular'}.${format}`;
  const mimeType = 'font/otf';
  const blob = new Blob([buffer], { type: mimeType });

  // Check for iPad / iPhone / Safari touch device (isIOSDevice covers
  // iPadOS 13+ Safari with a Macintosh user agent; see src/utils/platform.ts)
  const isAppleDevice = isIOSDevice();

  if (isAppleDevice && typeof navigator.share === 'function') {
    try {
      const file = new File([blob], filename, { type: mimeType });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${project.metadata.familyName || 'フォント'} (${format.toUpperCase()})`,
          text: `フォントファイル: ${filename}`,
        });
        return { method: 'share', filename };
      }
    } catch (shareErr: any) {
      if (shareErr.name === 'AbortError') {
        return { method: 'share', filename };
      }
      console.warn('Web Share failed, falling back to download:', shareErr);
    }
  }

  // Standard safe download link with delayed revocation for Safari
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    try {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (_) {}
  }, 60000);

  return { method: 'download', filename };
}

/**
 * Download the generated font file (.otf, CFF outlines)
 */
export function downloadFont(
  project: FontProject,
  format: 'otf' = 'otf',
  options?: CompileFontOptions
) {
  try {
    assertValidFontProject(project);
    const { buffer } = compileFont(project, { ...options, skipBlobUrl: true });
    const mimeType = 'font/otf';
    const blob = new Blob([buffer], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeName = (project.metadata.familyName || 'CustomFont').replace(/[^a-zA-Z0-9_-]/g, '_');
    a.href = url;
    a.download = `${safeName}-${project.metadata.styleName || 'Regular'}.${format}`;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      try {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (_) {}
    }, 60000);
  } catch (err) {
    console.error('Failed to export font:', err);
    throw err;
  }
}

/**
 * Parse an uploaded font file (TTF/OTF) into project glyphs
 */
export async function loadFontFromFile(
  file: File
): Promise<{ metadata: Partial<FontMetadata>; glyphs: Record<number, GlyphData> }> {
  const arrayBuffer = await file.arrayBuffer();
  const font = opentype.parse(arrayBuffer);

  const upm = font.unitsPerEm || 1000;
  const scale = 1000 / upm;
  const os2 = font.tables?.os2 as Record<string, unknown> | undefined;
  const rawAscender =
    typeof font.ascender === 'number' && Number.isFinite(font.ascender) && font.ascender > 0
      ? font.ascender
      : typeof os2?.sTypoAscender === 'number' && Number.isFinite(os2.sTypoAscender) && os2.sTypoAscender > 0
        ? os2.sTypoAscender
        : (SCREEN_BASELINE_Y / 1000) * upm;
  const rawDescender =
    typeof font.descender === 'number' && Number.isFinite(font.descender) && font.descender < 0
      ? font.descender
      : typeof os2?.sTypoDescender === 'number' && Number.isFinite(os2.sTypoDescender) && os2.sTypoDescender < 0
        ? os2.sTypoDescender
        : ((SCREEN_BASELINE_Y - 1000) / 1000) * upm;

  const scaledAscender = Math.round(rawAscender * scale);
  const importBaselineY = resolveBaselineY(scaledAscender, 1000);
  const scaledDescender = Math.round(rawDescender * scale);
  const resolvedDescender = scaledDescender < 0 ? scaledDescender : importBaselineY - 1000;
  const scaledCapHeight =
    typeof os2?.sCapHeight === 'number' && Number.isFinite(os2.sCapHeight) && os2.sCapHeight > 0
      ? Math.round(os2.sCapHeight * scale)
      : undefined;
  const scaledXHeight =
    typeof os2?.sxHeight === 'number' && Number.isFinite(os2.sxHeight) && os2.sxHeight > 0
      ? Math.round(os2.sxHeight * scale)
      : undefined;

  const metadata: Partial<FontMetadata> = {
    familyName:
      (font.names as any)?.windows?.fontFamily?.ja ||
      (font.names as any)?.windows?.fontFamily?.en ||
      (font.names as any)?.unicode?.fontFamily?.en ||
      (font.names as any)?.macintosh?.fontFamily?.en ||
      font.names.fontFamily?.en ||
      font.names.fontFamily?.ja ||
      file.name.replace(/\.[^/.]+$/, ''),
    styleName:
      (font.names as any)?.windows?.fontSubfamily?.en ||
      (font.names as any)?.unicode?.fontSubfamily?.en ||
      (font.names as any)?.macintosh?.fontSubfamily?.en ||
      font.names.fontSubfamily?.en ||
      'Regular',
    designer:
      (font.names as any)?.windows?.designer?.en ||
      (font.names as any)?.unicode?.designer?.en ||
      font.names.designer?.en ||
      font.names.designer?.ja ||
      '',
    designerUrl:
      (font.names as any)?.windows?.designerURL?.en ||
      (font.names as any)?.unicode?.designerURL?.en ||
      font.names.designerURL?.en ||
      font.names.designerURL?.ja ||
      '',
    copyright:
      (font.names as any)?.windows?.copyright?.en ||
      (font.names as any)?.unicode?.copyright?.en ||
      font.names.copyright?.en ||
      font.names.copyright?.ja ||
      '',
    license:
      (font.names as any)?.windows?.license?.en ||
      (font.names as any)?.unicode?.license?.en ||
      font.names.license?.en ||
      font.names.license?.ja ||
      '',
    licenseUrl:
      (font.names as any)?.windows?.licenseURL?.en ||
      (font.names as any)?.unicode?.licenseURL?.en ||
      font.names.licenseURL?.en ||
      font.names.licenseURL?.ja ||
      '',
    version:
      (font.names as any)?.windows?.version?.en ||
      (font.names as any)?.unicode?.version?.en ||
      font.names.version?.en ||
      '1.000',
    unitsPerEm: 1000,
    ascender: importBaselineY,
    descender: resolvedDescender,
    ...(scaledCapHeight !== undefined ? { capHeight: scaledCapHeight } : {}),
    ...(scaledXHeight !== undefined ? { xHeight: scaledXHeight } : {}),
  };

  const glyphs: Record<number, GlyphData> = {};

  for (let i = 0; i < font.glyphs.length; i++) {
    const g = font.glyphs.get(i);
    if (!g) continue;

    const unicodes: number[] = [];
    if (typeof g.unicode === 'number' && g.unicode > 0) {
      unicodes.push(g.unicode);
    }
    if (Array.isArray(g.unicodes)) {
      for (const u of g.unicodes) {
        if (typeof u === 'number' && u > 0 && !unicodes.includes(u)) {
          unicodes.push(u);
        }
      }
    }
    if (unicodes.length === 0) continue;

    // Retrieve normalized 1000 UPM path from opentype.js at the font's resolved baseline
    const path = g.getPath(0, importBaselineY, 1000);
    const contours = openTypePathToContours(path, importBaselineY, true);
    const normalizedAdvance = Math.round((g.advanceWidth ?? upm) * scale);
    const normalizedLsb =
      typeof g.leftSideBearing === 'number' && Number.isFinite(g.leftSideBearing)
        ? Math.round(g.leftSideBearing * scale)
        : 50;

    for (const u of unicodes) {
      if (u <= 0 || u > 0x10ffff) continue;
      let charStr = '';
      try {
        charStr = String.fromCodePoint(u);
      } catch {
        charStr = '';
      }

      glyphs[u] = {
        unicode: u,
        char: charStr,
        name: g.name || (charStr ? `uni${u.toString(16).toUpperCase().padStart(4, '0')}` : `glyph${u}`),
        advanceWidth: normalizedAdvance > 0 ? normalizedAdvance : 1000,
        lsb: normalizedLsb,
        contours: JSON.parse(JSON.stringify(contours)),
        modified: true,
      };
    }
  }

  return { metadata, glyphs };
}
