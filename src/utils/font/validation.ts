import { FontProject } from '../../types';
import { DEFAULT_ASCENDER, DEFAULT_DESCENDER } from './constants';

/** 検証や復元で除外・置き換えた件数。 */
export interface RemovedValidationCounts {
  glyphs: number;
  nodes: number;
  contours: number;
  replacedAdvanceWidth: number;
  replacedLsb: number;
  removedPixelData: number;
}

export function createEmptyRemovedCounts(): RemovedValidationCounts {
  return {
    glyphs: 0,
    nodes: 0,
    contours: 0,
    replacedAdvanceWidth: 0,
    replacedLsb: 0,
    removedPixelData: 0,
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

/** カーニングペアのキーから左右の Unicode 値を取り出す。 */
function parseKerningPairKey(pairKey: string): { left: number | null; right: number | null } {
  const parseToken = (token: string | undefined): number | null => {
    if (!token) return null;
    if (token.startsWith('U+') || token.startsWith('0x')) {
      const code = parseInt(token.replace(/^U\+|^0x/, ''), 16);
      return Number.isFinite(code) ? code : null;
    }
    const code = token.codePointAt(0);
    return code === undefined ? null : code;
  };
  if (pairKey.includes(',')) {
    const parts = pairKey.split(',');
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
      g.pixelData.data.some((d) => d === 1);
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
          warnings.push(`文字「${label}」に頂点が2つだけの輪郭があります。線として書き出されます。`);
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
    }
  }

  const validatedGlyphs: Record<number, any> = {};

  for (const [key, rawGlyph] of Object.entries(proj.glyphs)) {
    const unicodeNum = Number(key);
    if (!Number.isFinite(unicodeNum) || unicodeNum < 0) {
      removed.glyphs++;
      continue;
    }
    if (!rawGlyph || typeof rawGlyph !== 'object' || Array.isArray(rawGlyph)) {
      removed.glyphs++;
      continue;
    }

    const g = rawGlyph as Record<string, any>;
    if (typeof g.unicode !== 'number' || !Number.isFinite(g.unicode)) {
      removed.glyphs++;
      continue;
    }

    // AdvanceWidth & LSB
    const advValid = typeof g.advanceWidth === 'number' && Number.isFinite(g.advanceWidth);
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
          data: p.data.map((d: any) => (d === 1 ? 1 : 0)),
          shape: p.shape,
          advanceWidthCells: typeof p.advanceWidthCells === 'number' ? p.advanceWidthCells : undefined,
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

  const project = {
    ...proj,
    metadata: sanitizedMetadata,
    glyphs: validatedGlyphs,
    ...(sanitizedKerning !== undefined ? { kerning: sanitizedKerning } : {}),
  } as unknown as FontProject;

  return { project, removed, warnings };
}
