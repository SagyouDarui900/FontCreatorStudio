import { GlyphData, PathContour } from '../types';
import { KANA_PAIRS } from '../data/unicodeTables';
import { createSmallKanaContours, getContoursBoundingBox, SmallKanaOptions } from './pathUtils';
import { pixelGridToContours, normalizePixelGrid } from './pixelFontUtils';
import { DEFAULT_UPM } from './font/constants';

export interface BatchSmallKanaOptions extends SmallKanaOptions {
  overwriteExisting?: boolean;
  scope?: 'all' | 'hiragana' | 'katakana';
  descender?: number;
}

/**
 * pixelData のみを持つグリフの輪郭を返す。contours がある場合はそれを
 * そのまま返す。品質チェック（checker.ts）とコンパイラと同じ方法で
 * pixelGridToContours により変換する。upm / ascender / descender は
 * 正規化した値を渡す（未指定時は upm の 80% / -20% を既定値とする）。
 */
function resolveSourceContours(
  glyph: GlyphData,
  upm: number,
  ascender?: number,
  descender?: number
): PathContour[] {
  const contours = glyph.contours || [];
  if (contours.length > 0) return contours;
  const pixelData = glyph.pixelData;
  if (!pixelData || !pixelData.width || !pixelData.height) return [];
  if (!Array.isArray(pixelData.data) || !pixelData.data.some((d) => d !== 0)) return [];
  const normalizedUpm = Number.isFinite(upm) && upm > 0 ? upm : DEFAULT_UPM;
  const normalizedAscender =
    typeof ascender === 'number' && Number.isFinite(ascender) && ascender > 0
      ? ascender
      : Math.round(normalizedUpm * 0.8);
  const normalizedDescender =
    typeof descender === 'number' && Number.isFinite(descender)
      ? descender
      : Math.round(-normalizedUpm * 0.2);
  const advWidth = Math.round(
    Number.isFinite(glyph.advanceWidth) && (glyph.advanceWidth ?? 0) > 0
      ? (glyph.advanceWidth ?? DEFAULT_UPM)
      : glyph.unicode > 255
        ? normalizedUpm
        : Math.round(normalizedUpm / 2)
  );
  const pGrid = normalizePixelGrid(pixelData.data);
  if (!pGrid.some((val) => val === 1)) return [];
  return pixelGridToContours(
    pGrid,
    pixelData.width,
    pixelData.height,
    normalizedUpm,
    normalizedAscender,
    normalizedDescender,
    advWidth,
    pixelData.shape || 'square',
    true
  );
}

/**
 * 生成先グリフから補助データを除く。contours を置き換えるときに古い
 * pixelData と vectorContoursBackup が残らないようにする。
 */
function withoutAuxData(existing: GlyphData | undefined): Omit<GlyphData, 'pixelData' | 'vectorContoursBackup'> {
  const rest = { ...(existing || {}) } as Partial<GlyphData>;
  delete rest.pixelData;
  delete rest.vectorContoursBackup;
  return rest as Omit<GlyphData, 'pixelData' | 'vectorContoursBackup'>;
}

/**
 * プロジェクト内のすべての親文字から対応する小書き文字を一括自動生成
 */
export function batchGenerateSmallKana(
  glyphs: Record<number, GlyphData>,
  options?: BatchSmallKanaOptions
): {
  updatedGlyphs: Record<number, GlyphData>;
  generatedCount: number;
  details: { sourceChar: string; targetChar: string; targetUnicode: number }[];
} {
  const updatedGlyphs = { ...glyphs };
  let generatedCount = 0;
  const details: { sourceChar: string; targetChar: string; targetUnicode: number }[] = [];

  const overwrite = options?.overwriteExisting ?? false;
  const scope = options?.scope ?? 'all';
  const upm = options?.unitsPerEm && options.unitsPerEm > 0 ? options.unitsPerEm : 1000;

  for (const [sourceChar, pair] of Object.entries(KANA_PAIRS)) {
    const sourceUnicode = sourceChar.codePointAt(0);
    if (!sourceUnicode) continue;

    const isHiragana = sourceUnicode >= 0x3041 && sourceUnicode <= 0x3096;
    const isKatakana = sourceUnicode >= 0x30a1 && sourceUnicode <= 0x30fa;

    if (scope === 'hiragana' && !isHiragana) continue;
    if (scope === 'katakana' && !isKatakana) continue;

    const sourceGlyph = glyphs[sourceUnicode];
    if (!sourceGlyph) continue;
    // contours が空でも pixelData がある親文字は対象に含める。
    const sourceContours = resolveSourceContours(
      sourceGlyph,
      upm,
      options?.ascender,
      options?.descender
    );
    if (sourceContours.length === 0) {
      // 親文字が未作図ならスキップ
      continue;
    }

    const targetUnicode = pair.smallUnicode;
    const existing = glyphs[targetUnicode];
    if (existing?.locked) continue;

    const hasExistingContours = existing && existing.contours && existing.contours.length > 0;

    if (!hasExistingContours || overwrite) {
      const smallContours = createSmallKanaContours(sourceContours, options);
      const bbox = getContoursBoundingBox(smallContours);

      updatedGlyphs[targetUnicode] = {
        ...withoutAuxData(existing),
        unicode: targetUnicode,
        char: pair.smallChar,
        name: `uni${targetUnicode.toString(16).toUpperCase().padStart(4, '0')}`,
        advanceWidth: sourceGlyph.advanceWidth || existing?.advanceWidth || upm,
        lsb: Math.max(0, Math.round(bbox.minX)),
        contours: smallContours,
        modified: true,
      };

      generatedCount++;
      details.push({
        sourceChar,
        targetChar: pair.smallChar,
        targetUnicode,
      });
    }
  }

  return { updatedGlyphs, generatedCount, details };
}
