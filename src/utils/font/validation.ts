import { FontProject } from '../../types';
import { DEFAULT_ASCENDER, DEFAULT_DESCENDER } from './constants';
import { sanitizeStoredTraceSettings } from '../traceSettings';
import { normalizePixelDataValues, isPixelDataLengthValid } from '../pixelFontUtils';

/** 検証や復元で除外・置き換えた件数。 */
export interface RemovedValidationCounts {
  glyphs: number;
  nodes: number;
  contours: number;
  replacedAdvanceWidth: number;
  replacedLsb: number;
  removedPixelData: number;
  replacedMetadata: number;
  droppedKerning: number;
}

export function createEmptyRemovedCounts(): RemovedValidationCounts {
  return {
    glyphs: 0,
    nodes: 0,
    contours: 0,
    replacedAdvanceWidth: 0,
    replacedLsb: 0,
    removedPixelData: 0,
    replacedMetadata: 0,
    droppedKerning: 0,
  };
}

export interface FontValidationResult {
  valid: boolean;
  glyphCount: number;
  warnings: string[];
  errors: string[];
  removed: RemovedValidationCounts;
}

const DEFAULT_CAP_HEIGHT = 700;
const DEFAULT_X_HEIGHT = 500;
const DEFAULT_LINE_GAP = 100;

function isValidUnicode(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value > 0 &&
    value <= 0x10ffff
  );
}

/**
 * カーニングペアのキーから左右の Unicode 値を取り出す。キーの形式は
 * `"char1,char2"`（1文字ずつ）、`"U+XXXX,0xXXXX"`（16進数）、
 * `"44,65"`（10進数コードポイント）のいずれか。カンマ区切りでない
 * 場合は2文字の並びとして読む。
 *
 * 10進数形式の判定：区切りで分けた各辺が1文字でなければならないため、
 * 2文字以上の数字だけのトークンは1文字にはならず、10進数コードポイント
 * として読む。1桁の数字（例："4"）は文字 `4` として読む。
 * 左字・右字が `,` 自体の場合（キー `,,X` や `A,,`）は、区切りと文字の
 * カンマを区別できないため無効とし、null を返す。呼び出し側は警告を
 * 出してそのペアを除外する。
 */
export function parseKerningPairKey(pairKey: string): { left: number | null; right: number | null } {
  const parseToken = (token: string | undefined): number | null => {
    if (!token) return null;
    if (token.startsWith('U+') || token.startsWith('0x')) {
      const code = parseInt(token.replace(/^U\+|^0x/, ''), 16);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? code : null;
    }
    if (/^\d+$/.test(token) && token.length > 1) {
      const code = parseInt(token, 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? code : null;
    }
    const code = token.codePointAt(0);
    return code === undefined ? null : code;
  };
  if (pairKey.includes(',')) {
    const parts = pairKey.split(',');
    // Exactly one separator comma: `,,X` or `A,,` split into 3 parts,
    // so the comma character itself cannot be told apart from the
    // separator and the key is rejected as invalid.
    if (parts.length !== 2) return { left: null, right: null };
    return { left: parseToken(parts[0]), right: parseToken(parts[1]) };
  }
  const chars = [...pairKey];
  if (chars.length === 2) {
    return { left: parseToken(chars[0]), right: parseToken(chars[1]) };
  }
  return { left: null, right: null };
}

function checkMetadata(
  metadata: FontProject['metadata'] | undefined,
  warnings: string[]
): void {
  if (!metadata) return;
  const fields: { key: 'ascender' | 'descender' | 'capHeight' | 'xHeight' | 'lineGap'; label: string }[] = [
    { key: 'ascender', label: 'アセンダ' },
    { key: 'descender', label: 'ディセンダ' },
    { key: 'capHeight', label: 'キャップハイト' },
    { key: 'xHeight', label: 'xハイト' },
    { key: 'lineGap', label: '行間' },
  ];
  for (const { key, label } of fields) {
    const value = (metadata as unknown as Record<string, unknown>)[key];
    if (value !== undefined && (typeof value !== 'number' || !Number.isFinite(value))) {
      warnings.push(`メタデータの${label}が無効な値です。書き出し時に代替値が使われます。`);
    }
  }
  const asc = metadata.ascender;
  const desc = metadata.descender;
  const cap = metadata.capHeight;
  const xh = metadata.xHeight;
  const gap = metadata.lineGap;
  if (typeof asc === 'number' && Number.isFinite(asc) && asc <= 0) {
    warnings.push('メタデータのアセンダが 0 以下です。');
  }
  if (typeof desc === 'number' && Number.isFinite(desc) && desc >= 0) {
    warnings.push('メタデータのディセンダが 0 以上です。');
  }
  if (
    typeof asc === 'number' &&
    Number.isFinite(asc) &&
    typeof desc === 'number' &&
    Number.isFinite(desc) &&
    asc <= desc
  ) {
    warnings.push('メタデータのアセンダがディセンダ以下です。');
  }
  if (
    typeof cap === 'number' &&
    Number.isFinite(cap) &&
    typeof asc === 'number' &&
    Number.isFinite(asc) &&
    cap > asc
  ) {
    warnings.push('メタデータのキャップハイトがアセンダより大きいです。');
  }
  if (
    typeof xh === 'number' &&
    Number.isFinite(xh) &&
    typeof cap === 'number' &&
    Number.isFinite(cap) &&
    xh > cap
  ) {
    warnings.push('メタデータのxハイトがキャップハイトより大きいです。');
  }
  if (typeof gap === 'number' && Number.isFinite(gap) && gap < 0) {
    warnings.push('メタデータの行間が負の値です。');
  }
  const upm = metadata.unitsPerEm;
  if (typeof upm !== 'number' || !Number.isFinite(upm) || upm < 16 || upm > 16384) {
    warnings.push('メタデータの UPM (unitsPerEm) が範囲外のため、書き出し時に補正されます。');
  }
  if (
    metadata.usWeightClass !== undefined &&
    (typeof metadata.usWeightClass !== 'number' ||
      !Number.isFinite(metadata.usWeightClass) ||
      metadata.usWeightClass < 1 ||
      metadata.usWeightClass > 1000)
  ) {
    warnings.push('メタデータのウェイトクラス (usWeightClass) が範囲外（1〜1000）のため、書き出し時に補正されます。');
  }
  if (
    metadata.usWidthClass !== undefined &&
    (typeof metadata.usWidthClass !== 'number' ||
      !Number.isFinite(metadata.usWidthClass) ||
      metadata.usWidthClass < 1 ||
      metadata.usWidthClass > 9)
  ) {
    warnings.push('メタデータの幅クラス (usWidthClass) が範囲外（1〜9）のため、書き出し時に補正されます。');
  }
  if (
    (metadata.winAscent !== undefined &&
      (typeof metadata.winAscent !== 'number' || !Number.isFinite(metadata.winAscent) || metadata.winAscent < 0)) ||
    (metadata.winDescent !== undefined &&
      (typeof metadata.winDescent !== 'number' || !Number.isFinite(metadata.winDescent) || metadata.winDescent < 0))
  ) {
    warnings.push('メタデータの Win Ascent / Win Descent が負または無効な値のため、書き出し時に補正されます。');
  }
  if (typeof metadata.vendorId === 'string' && /[^\x20-\x7e]/.test(metadata.vendorId)) {
    warnings.push('メタデータのベンダーID (vendorId) に非ASCII文字が含まれているため、書き出し時に置換されます。');
  }
}

/**
 * Validate a font project before export to detect issues early
 */
export function validateFontProject(project: FontProject): FontValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const removed = createEmptyRemovedCounts();
  const glyphEntries = Object.entries(project.glyphs || {});
  const glyphs = glyphEntries.map(([, g]) => g);
  const glyphCount = glyphs.length;

  if (glyphCount === 0) {
    warnings.push('作成されたグリフがまだありません。空白フォントとして出力されます。');
  }

  // Metadata is read without `?.` throughout compilation, so a project
  // without it would fail later with a TypeError. Stop here with a
  // clear error instead.
  if (!project.metadata || typeof project.metadata !== 'object') {
    errors.push('メタデータがありません。フォント情報（フォント名・UPMなど）を設定してください。');
    return {
      valid: false,
      glyphCount,
      warnings,
      errors,
      removed,
    };
  }

  checkMetadata(project.metadata, warnings);

  const seenUnicodes = new Set<number>();
  const existingUnicodes = new Set<number>();
  for (const g of glyphs) {
    if (g && typeof g.unicode === 'number' && Number.isFinite(g.unicode)) {
      existingUnicodes.add(g.unicode);
    }
  }

  for (const [key, g] of glyphEntries) {
    if (!g || typeof g.unicode !== 'number' || isNaN(g.unicode)) {
      errors.push(`無効なUnicode値を持つグリフが存在します`);
      removed.glyphs++;
      continue;
    }
    const unicodeLabel = `U+${g.unicode.toString(16).toUpperCase()}`;
    if (!isValidUnicode(g.unicode)) {
      errors.push(
        `文字「${g.char || unicodeLabel}」のUnicode値が範囲外です（0x1〜0x10FFFFの範囲で指定してください）。`
      );
      removed.glyphs++;
      continue;
    }
    const keyUnicode = Number(key);
    if (Number.isFinite(keyUnicode) && keyUnicode !== g.unicode) {
      errors.push(
        `文字「${g.char || `U+${g.unicode.toString(16).toUpperCase()}`}」の格納キー（${key}）とUnicode値（${g.unicode}）が一致しません。`
      );
      removed.glyphs++;
      continue;
    }
    if (seenUnicodes.has(g.unicode)) {
      errors.push(`Unicode値 U+${g.unicode.toString(16).toUpperCase()} が重複しています。`);
      removed.glyphs++;
      continue;
    }
    seenUnicodes.add(g.unicode);

    const label = g.char || `U+${g.unicode.toString(16).toUpperCase()}`;

    if (typeof g.advanceWidth !== 'number' || !Number.isFinite(g.advanceWidth) || g.advanceWidth <= 0) {
      warnings.push(`文字「${label}」の送り幅が無効なため、書き出し時に代替値が使われます。`);
      removed.replacedAdvanceWidth++;
    }
    if (typeof g.lsb !== 'number' || !Number.isFinite(g.lsb)) {
      warnings.push(`文字「${label}」の左余白（LSB）が無効なため、書き出し時に代替値が使われます。`);
      removed.replacedLsb++;
    }

    const hasFilledPixelData =
      !!g.pixelData?.data &&
      Array.isArray(g.pixelData.data) &&
      g.pixelData.data.some((d) => d !== 0);
    if (!g.contours || g.contours.length === 0) {
      if (hasFilledPixelData) {
        warnings.push(`文字「${label}」はピクセルデータのみのグリフです。輪郭に変換して書き出します。`);
      } else {
        warnings.push(`文字「${label}」は輪郭がありません（空グリフとして書き出します）。`);
      }
    }

    if (g.pixelData) {
      const p = g.pixelData;
      const sizeValid =
        typeof p.width === 'number' &&
        Number.isFinite(p.width) &&
        p.width > 0 &&
        typeof p.height === 'number' &&
        Number.isFinite(p.height) &&
        p.height > 0;
      if (!sizeValid || !Array.isArray(p.data)) {
        errors.push(`文字「${label}」のピクセルデータが無効です。`);
        removed.removedPixelData++;
      } else if (p.data.length !== p.width * p.height) {
        errors.push(
          `文字「${label}」のピクセルデータの長さが幅×高さと一致しません（${p.data.length}件、期待値は${p.width * p.height}件）。`
        );
        removed.removedPixelData++;
      }
    }

    if (g.contours) {
      let glyphNodeCount = 0;
      let handleWarned = false;
      for (let ci = 0; ci < g.contours.length; ci++) {
        const c = g.contours[ci];
        if (!c.nodes || c.nodes.length === 0) {
          errors.push(`文字「${label}」に頂点が無い空の輪郭があります。`);
          removed.contours++;
          continue;
        }
        glyphNodeCount += c.nodes.length;
        if (c.nodes.length === 1) {
          errors.push(`文字「${label}」に頂点が1つだけの孤立輪郭があります。`);
          removed.contours++;
        } else if (c.nodes.length === 2) {
          // A 2-node contour has no enclosed area: an open one is a
          // degenerate path (fill area 0) and is not drawn, and a closed
          // one made of straight lines is the same. It is not a visible
          // line, because font outlines have no stroke.
          if (c.closed === true) {
            warnings.push(`文字「${label}」に頂点が2つだけの閉じた輪郭があります。直線だけでは囲む面積がなく、表示されません。`);
          } else {
            warnings.push(`文字「${label}」に頂点が2つだけの開いた輪郭があります。線としてではなく塗りつぶしの輪郭として書き出されるため面積がなく、表示されません。`);
          }
        }
        if (c.nodes.length >= 2 && c.nodes.every((n) => n.x === c.nodes[0].x && n.y === c.nodes[0].y)) {
          warnings.push(`文字「${label}」に全頂点が同一座標の輪郭があります。表示されないグリフとして書き出されます。`);
        }
        if (c.closed === false) {
          warnings.push(`文字「${label}」に閉じていない輪郭があります。`);
        }
        for (const n of c.nodes) {
          if (!Number.isFinite(n.x) || !Number.isFinite(n.y)) {
            errors.push(`文字「${label}」に無効な数値座標を持つ頂点があります。`);
            removed.nodes++;
            break;
          }
          for (const handle of [n.handleIn, n.handleOut]) {
            if (
              !handleWarned &&
              handle &&
              typeof handle === 'object' &&
              (!Number.isFinite((handle as { x: unknown }).x) ||
                !Number.isFinite((handle as { y: unknown }).y))
            ) {
              warnings.push(`文字「${label}」に無効な数値を持つハンドルがあります。書き出し時に頂点座標で置き換えられます。`);
              handleWarned = true;
              break;
            }
          }
        }
      }
      if (glyphNodeCount > 350) {
        warnings.push(`文字「${label}」のノード数が過剰です（${glyphNodeCount}個）。描画負荷やファイル容量削減のため簡略化を推奨します。`);
      }
    }
  }

  // Pixel grid sizes differ per glyph: dots end up with different sizes
  // in the same em box. Warn instead of blocking the export.
  const pixelSizes = new Set<string>();
  for (const g of glyphs) {
    if (g.pixelData && typeof g.pixelData.width === 'number' && typeof g.pixelData.height === 'number') {
      pixelSizes.add(`${g.pixelData.width}x${g.pixelData.height}`);
    }
  }
  if (pixelSizes.size > 1) {
    warnings.push(
      `ピクセルグリフのグリッドサイズが混在しています（${[...pixelSizes].join('、')}）。ドットの寸法が文字ごとに異なります。`
    );
  }

  // Kerning: project.kerning entries (char-pair keys -> offset)
  for (const [pairKey, value] of Object.entries(project.kerning || {})) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      warnings.push(`カーニング「${pairKey}」の値が無効なため、書き出し時に除外されます。`);
      continue;
    }
    const { left, right } = parseKerningPairKey(pairKey);
    if (left === null || right === null) {
      warnings.push(`カーニング「${pairKey}」の文字指定が無効なため、書き出し時に除外されます。`);
      continue;
    }
    if (!existingUnicodes.has(left) || !existingUnicodes.has(right)) {
      warnings.push(`カーニング「${pairKey}」の対象グリフが存在しないため、書き出し時に除外されます。`);
    }
  }

  // Kerning: custom kerning pairs in OpenType features
  for (const pair of project.openTypeFeatures?.customKerningPairs || []) {
    if (!pair.enabled) continue;
    const unicodeLabel = (value: unknown): string =>
      typeof value === 'number' && Number.isFinite(value)
        ? `U+${value.toString(16).toUpperCase()}`
        : String(value);
    const label = `カーニングペア（${unicodeLabel(pair.firstUnicode)} / ${unicodeLabel(pair.secondUnicode)}）`;
    if (!isValidUnicode(pair.firstUnicode) || !isValidUnicode(pair.secondUnicode)) {
      errors.push(`${label}のUnicode値が無効です（0x1〜0x10FFFFの範囲で指定してください）。`);
      continue;
    }
    if (typeof pair.amount !== 'number' || !Number.isFinite(pair.amount)) {
      warnings.push(`${label}のカーニング値が無効なため、書き出し時に除外されます。`);
    }
    if (!existingUnicodes.has(pair.firstUnicode) || !existingUnicodes.has(pair.secondUnicode)) {
      warnings.push(`${label}の対象グリフが存在しないため、書き出し時に除外されます。`);
    }
  }

  // OpenType Vertical Writing & Ligatures
  if (project.openTypeFeatures && project.openTypeFeatures.enabled !== false) {
    const vw = project.openTypeFeatures.verticalWriting;
    if (vw && vw.enabled !== false) {
      if (
        typeof vw.defaultVertAdvance !== 'number' ||
        !Number.isFinite(vw.defaultVertAdvance) ||
        vw.defaultVertAdvance <= 0
      ) {
        warnings.push('縦書き設定のデフォルト縦送り幅 (defaultVertAdvance) が無効なため、書き出し時にUPM値が使われます。');
      }
      if (typeof vw.vertOriginY !== 'number' || !Number.isFinite(vw.vertOriginY)) {
        warnings.push('縦書き設定の縦書きY原点 (vertOriginY) が無効なため、書き出し時にアセンダ値が使われます。');
      }
      for (const sub of vw.substitutions || []) {
        if (!sub.enabled) continue;
        if (!isValidUnicode(sub.sourceUnicode) || !isValidUnicode(sub.vertUnicode)) {
          errors.push(`縦書き置換ルール（${sub.id}）のUnicode値が無効です（0x1〜0x10FFFFの範囲で指定してください）。`);
        }
      }
    }

    for (const lig of project.openTypeFeatures.ligatures || []) {
      if (!lig.enabled) continue;
      const ligLabel = lig.name || lig.inputChars.join('');
      if (!isValidUnicode(lig.substituteUnicode)) {
        errors.push(`合字「${ligLabel}」の変換先Unicode値が無効です（0x1〜0x10FFFFの範囲で指定してください）。`);
        continue;
      }
      if (!Array.isArray(lig.inputChars) || lig.inputChars.length < 2) {
        warnings.push(`合字「${ligLabel}」の入力文字が2文字未満のため、書き出し時に除外されます。`);
        continue;
      }
      const missingInputs = lig.inputChars.filter((ch) => {
        const code = ch.codePointAt(0);
        return code === undefined || !existingUnicodes.has(code);
      });
      const missingTarget = !existingUnicodes.has(lig.substituteUnicode);
      if (missingInputs.length > 0 || missingTarget) {
        const targetCodeStr = `U+${lig.substituteUnicode.toString(16).toUpperCase()}`;
        warnings.push(
          `合字「${ligLabel}」の対象グリフ（${
            missingTarget ? `${targetCodeStr}未作成` : ''
          }${missingTarget && missingInputs.length > 0 ? '・' : ''}${
            missingInputs.length > 0 ? `入力「${missingInputs.join('')}」未作成` : ''
          }）が不足しているため、書き出し時に登録されません。`
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    glyphCount,
    warnings,
    errors,
    removed,
  };
}

export interface StoredValidationReport {
  project: FontProject;
  removed: RemovedValidationCounts;
  warnings: string[];
  /** Labels (char or U+XXXX) of the glyphs dropped during sanitization, in file order. */
  removedGlyphLabels: string[];
}

/**
 * Remove broken pixelData (invalid size or data length mismatch) from a
 * copy of the project so one broken glyph does not stop the whole export.
 * Valid pixelData values are normalized to 0 or 1. Glyphs whose pixelData
 * is removed keep their vector contours, if any; otherwise they export
 * as empty glyphs. Returns the cleaned project and the labels of the
 * glyphs whose pixelData was removed.
 */
export function stripInvalidPixelData(project: FontProject): {
  project: FontProject;
  excluded: string[];
} {
  const excluded: string[] = [];
  let changed = false;
  const glyphs: Record<number, FontProject['glyphs'][number]> = {};
  for (const [key, g] of Object.entries(project.glyphs || {})) {
    const unicode = Number(key);
    if (!g || !g.pixelData) {
      glyphs[unicode] = g;
      continue;
    }
    const p = g.pixelData;
    if (!isPixelDataLengthValid(p)) {
      excluded.push(g.char || `U+${g.unicode.toString(16).toUpperCase()}`);
      changed = true;
      const { pixelData: _removed, ...rest } = g;
      glyphs[unicode] = { ...rest, contours: g.contours || [] };
      continue;
    }
    const normalized = normalizePixelDataValues(p.data);
    if (normalized.some((v, i) => v !== p.data[i])) {
      changed = true;
      glyphs[unicode] = { ...g, pixelData: { ...p, data: normalized } };
    } else {
      glyphs[unicode] = g;
    }
  }
  if (!changed && excluded.length === 0) return { project, excluded };
  return { project: { ...project, glyphs }, excluded };
}

/**
 * Validate and sanitize a stored FontProject loaded from LocalStorage or IndexedDB.
 * Returns the sanitized FontProject or null if corrupted.
 * The sanitized project keeps the FontProject shape; use
 * validateStoredFontProjectWithReport when the caller also needs the
 * counts of removed or replaced items and the warnings.
 */
export function validateStoredFontProject(data: unknown): FontProject | null {
  return validateStoredFontProjectWithReport(data)?.project ?? null;
}

/**
 * Validate and sanitize a stored FontProject, with a report of what was
 * removed or replaced during sanitization. Returns null if corrupted.
 */
export function validateStoredFontProjectWithReport(data: unknown): StoredValidationReport | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return null;
  }

  const proj = data as Record<string, any>;

  // Metadata check
  if (!proj.metadata || typeof proj.metadata !== 'object' || Array.isArray(proj.metadata)) {
    return null;
  }
  const upm = proj.metadata.unitsPerEm;
  if (typeof upm !== 'number' || !Number.isFinite(upm) || upm <= 0) {
    return null;
  }

  // Glyphs check
  if (!proj.glyphs || typeof proj.glyphs !== 'object' || Array.isArray(proj.glyphs)) {
    return null;
  }

  const removed = createEmptyRemovedCounts();
  const warnings: string[] = [];
  const removedGlyphLabels: string[] = [];
  // Label a dropped glyph for the notice: prefer the stored char, else the
  // key / unicode as U+XXXX, so the user can tell which glyph was lost.
  const glyphLabel = (raw: Record<string, any> | null, key: string): string => {
    if (raw && typeof raw.char === 'string' && raw.char) return raw.char;
    const code = raw && typeof raw.unicode === 'number' && Number.isFinite(raw.unicode)
      ? raw.unicode
      : Number(key);
    if (Number.isInteger(code) && code > 0) {
      return `U+${code.toString(16).toUpperCase()}`;
    }
    return key;
  };

  // Metadata: replace non-finite values with defaults and notify.
  const sanitizedMetadata: Record<string, unknown> = { ...proj.metadata };
  const metadataDefaults: Record<string, number> = {
    ascender: DEFAULT_ASCENDER,
    descender: DEFAULT_DESCENDER,
    capHeight: DEFAULT_CAP_HEIGHT,
    xHeight: DEFAULT_X_HEIGHT,
    lineGap: DEFAULT_LINE_GAP,
  };
  const metadataLabels: Record<string, string> = {
    ascender: 'アセンダ',
    descender: 'ディセンダ',
    capHeight: 'キャップハイト',
    xHeight: 'xハイト',
    lineGap: '行間',
  };
  for (const [key, fallback] of Object.entries(metadataDefaults)) {
    const value = sanitizedMetadata[key];
    if (value !== undefined && (typeof value !== 'number' || !Number.isFinite(value))) {
      warnings.push(`メタデータの${metadataLabels[key]}が無効だったため、既定値（${fallback}）に置き換えました。`);
      sanitizedMetadata[key] = fallback;
      removed.replacedMetadata++;
    }
  }
  // String fields: the defaults match createDefaultProject so a loaded
  // project does not silently get different values from a new project.
  // Replacements are warned about instead of happening silently.
  const stringFieldDefaults: Record<string, string> = {
    familyName: '手書きフォント',
    styleName: 'Regular',
    designer: '',
    copyright: '',
    version: 'Version 1.000',
  };
  const stringFieldLabels: Record<string, string> = {
    familyName: 'フォント名',
    styleName: 'スタイル名',
    designer: '作者名',
    copyright: '著作権表示',
    version: 'バージョン',
  };
  for (const [key, fallback] of Object.entries(stringFieldDefaults)) {
    if (typeof sanitizedMetadata[key] !== 'string') {
      warnings.push(
        `メタデータの${stringFieldLabels[key]}が無効だったため、既定値（${fallback || '（空）'}）に置き換えました。`
      );
      sanitizedMetadata[key] = fallback;
      removed.replacedMetadata++;
    }
  }

  // Kerning: drop entries whose value is not a finite number and notify.
  let sanitizedKerning: Record<string, number> | undefined;
  if (proj.kerning && typeof proj.kerning === 'object' && !Array.isArray(proj.kerning)) {
    sanitizedKerning = {};
    let droppedKerning = 0;
    for (const [pairKey, value] of Object.entries(proj.kerning)) {
      if (typeof value === 'number' && Number.isFinite(value)) {
        sanitizedKerning[pairKey] = value;
      } else {
        droppedKerning++;
      }
    }
    if (droppedKerning > 0) {
      warnings.push(`無効なカーニング値を ${droppedKerning}件除外しました。`);
      removed.droppedKerning += droppedKerning;
    }
  }

  const validatedGlyphs: Record<number, any> = {};
  const seenUnicodes = new Set<number>();

  for (const [key, rawGlyph] of Object.entries(proj.glyphs)) {
    const unicodeNum = Number(key);
    if (!Number.isInteger(unicodeNum) || unicodeNum <= 0) {
      removed.glyphs++;
      removedGlyphLabels.push(glyphLabel(rawGlyph as Record<string, any> | null, key));
      continue;
    }
    if (!rawGlyph || typeof rawGlyph !== 'object' || Array.isArray(rawGlyph)) {
      removed.glyphs++;
      removedGlyphLabels.push(glyphLabel(null, key));
      continue;
    }

    const g = rawGlyph as Record<string, any>;
    if (!isValidUnicode(g.unicode)) {
      removed.glyphs++;
      removedGlyphLabels.push(glyphLabel(g, key));
      continue;
    }
    if (unicodeNum !== g.unicode) {
      removed.glyphs++;
      removedGlyphLabels.push(glyphLabel(g, key));
      warnings.push(
        `格納キー（${key}）とUnicode値（${g.unicode}）が一致しないグリフデータを除外しました。`
      );
      continue;
    }
    if (seenUnicodes.has(g.unicode)) {
      removed.glyphs++;
      removedGlyphLabels.push(glyphLabel(g, key));
      warnings.push(
        `重複しているUnicode（U+${g.unicode.toString(16).toUpperCase()}）のグリフデータを除外しました。`
      );
      continue;
    }
    seenUnicodes.add(g.unicode);

    // AdvanceWidth & LSB
    const advValid = typeof g.advanceWidth === 'number' && Number.isFinite(g.advanceWidth) && g.advanceWidth > 0;
    const lsbValid = typeof g.lsb === 'number' && Number.isFinite(g.lsb);
    if (!advValid) removed.replacedAdvanceWidth++;
    if (!lsbValid) removed.replacedLsb++;
    const advWidth = advValid ? g.advanceWidth : upm;
    const lsb = lsbValid ? g.lsb : 50;

    // Contours check
    const rawContours = Array.isArray(g.contours) ? g.contours : [];
    const validContours = [];

    for (let ci = 0; ci < rawContours.length; ci++) {
      const c = rawContours[ci];
      if (!c || typeof c !== 'object' || Array.isArray(c)) {
        removed.contours++;
        continue;
      }
      const rawNodes = Array.isArray(c.nodes) ? c.nodes : [];
      const validNodes = [];

      for (let ni = 0; ni < rawNodes.length; ni++) {
        const n = rawNodes[ni];
        if (!n || typeof n !== 'object' || Array.isArray(n)) {
          removed.nodes++;
          continue;
        }
        if (!Number.isFinite(n.x) || !Number.isFinite(n.y)) {
          removed.nodes++;
          continue;
        }

        let handleIn = null;
        if (n.handleIn && typeof n.handleIn === 'object' && Number.isFinite(n.handleIn.x) && Number.isFinite(n.handleIn.y)) {
          handleIn = { x: n.handleIn.x, y: n.handleIn.y };
        }

        let handleOut = null;
        if (n.handleOut && typeof n.handleOut === 'object' && Number.isFinite(n.handleOut.x) && Number.isFinite(n.handleOut.y)) {
          handleOut = { x: n.handleOut.x, y: n.handleOut.y };
        }

        validNodes.push({
          id: typeof n.id === 'string' ? n.id : `node_${ci}_${ni}`,
          x: n.x,
          y: n.y,
          type: n.type === 'smooth' || n.type === 'symmetric' ? n.type : 'corner',
          handleIn,
          handleOut,
        });
      }

      if (validNodes.length < 2) {
        removed.contours++;
        continue;
      }

      validContours.push({
        id: typeof c.id === 'string' ? c.id : `contour_${ci}`,
        nodes: validNodes,
        closed: Boolean(c.closed),
      });
    }

    // PixelData check
    let validPixelData = undefined;
    if (g.pixelData && typeof g.pixelData === 'object' && !Array.isArray(g.pixelData)) {
      const p = g.pixelData;
      if (
        typeof p.width === 'number' &&
        Number.isFinite(p.width) &&
        p.width > 0 &&
        typeof p.height === 'number' &&
        Number.isFinite(p.height) &&
        p.height > 0 &&
        Array.isArray(p.data) &&
        p.data.length === p.width * p.height
      ) {
        validPixelData = {
          width: p.width,
          height: p.height,
          data: p.data.map((d: any) => (d ? 1 : 0)),
          shape: p.shape,
        };
      } else {
        removed.removedPixelData++;
      }
    }

    validatedGlyphs[unicodeNum] = {
      ...g,
      unicode: g.unicode,
      char: typeof g.char === 'string' ? g.char : String.fromCodePoint(g.unicode),
      name: typeof g.name === 'string' ? g.name : `uni${g.unicode.toString(16).toUpperCase().padStart(4, '0')}`,
      advanceWidth: advWidth,
      lsb: lsb,
      contours: validContours,
      pixelData: validPixelData,
    };
  }

  const sanitizedTraceSettings = sanitizeStoredTraceSettings(proj.traceSettings);

  const project = {
    ...proj,
    metadata: sanitizedMetadata,
    glyphs: validatedGlyphs,
    ...(sanitizedKerning !== undefined ? { kerning: sanitizedKerning } : {}),
    // Trace settings: keep the image-free settings, drop any stored image
    // data URLs and sanitize the values.
    ...(sanitizedTraceSettings !== undefined ? { traceSettings: sanitizedTraceSettings } : {}),
  } as unknown as FontProject;

  return { project, removed, warnings, removedGlyphLabels };
}
