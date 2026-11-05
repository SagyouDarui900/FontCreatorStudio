import { FontProject } from '../../types';

export interface FontValidationResult {
  valid: boolean;
  glyphCount: number;
  warnings: string[];
  errors: string[];
}

/**
 * Validate a font project before export to detect issues early
 */
export function validateFontProject(project: FontProject): FontValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const glyphs = Object.values(project.glyphs || {});
  const glyphCount = glyphs.length;

  if (glyphCount === 0) {
    warnings.push('作成されたグリフがまだありません。空白フォントとして出力されます。');
  }

  for (const g of glyphs) {
    if (!g || typeof g.unicode !== 'number' || isNaN(g.unicode)) {
      errors.push(`無効なUnicode値を持つグリフが存在します`);
      continue;
    }
    const label = g.char || `U+${g.unicode.toString(16).toUpperCase()}`;
    if (g.contours) {
      let glyphNodeCount = 0;
      for (let ci = 0; ci < g.contours.length; ci++) {
        const c = g.contours[ci];
        if (!c.nodes || c.nodes.length === 0) continue;
        glyphNodeCount += c.nodes.length;
        if (c.nodes.length === 1) {
          warnings.push(`文字「${label}」に頂点が1つだけの孤立輪郭があります（自動除外されます）。`);
        }
        for (const n of c.nodes) {
          if (!Number.isFinite(n.x) || !Number.isFinite(n.y)) {
            errors.push(`文字「${label}」に無効な数値座標を持つ頂点があります。`);
            break;
          }
        }
      }
      if (glyphNodeCount > 350) {
        warnings.push(`文字「${label}」のノード数が過剰です（${glyphNodeCount}個）。描画負荷やファイル容量削減のため簡略化を推奨します。`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    glyphCount,
    warnings,
    errors,
  };
}

/**
 * Validate and sanitize a stored FontProject loaded from LocalStorage or IndexedDB.
 * Returns the sanitized FontProject or null if corrupted.
 */
export function validateStoredFontProject(data: unknown): FontProject | null {
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

  const validatedGlyphs: Record<number, any> = {};

  for (const [key, rawGlyph] of Object.entries(proj.glyphs)) {
    const unicodeNum = Number(key);
    if (!Number.isFinite(unicodeNum) || unicodeNum < 0) continue;
    if (!rawGlyph || typeof rawGlyph !== 'object' || Array.isArray(rawGlyph)) continue;

    const g = rawGlyph as Record<string, any>;
    if (typeof g.unicode !== 'number' || !Number.isFinite(g.unicode)) {
      continue;
    }

    // AdvanceWidth & LSB
    const advWidth = typeof g.advanceWidth === 'number' && Number.isFinite(g.advanceWidth) ? g.advanceWidth : upm;
    const lsb = typeof g.lsb === 'number' && Number.isFinite(g.lsb) ? g.lsb : 50;

    // Contours check
    const rawContours = Array.isArray(g.contours) ? g.contours : [];
    const validContours = [];

    for (let ci = 0; ci < rawContours.length; ci++) {
      const c = rawContours[ci];
      if (!c || typeof c !== 'object' || Array.isArray(c)) continue;
      const rawNodes = Array.isArray(c.nodes) ? c.nodes : [];
      const validNodes = [];

      for (let ni = 0; ni < rawNodes.length; ni++) {
        const n = rawNodes[ni];
        if (!n || typeof n !== 'object' || Array.isArray(n)) continue;
        if (!Number.isFinite(n.x) || !Number.isFinite(n.y)) continue;

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
        Array.isArray(p.data)
      ) {
        validPixelData = {
          width: p.width,
          height: p.height,
          data: p.data.map((d: any) => (d === 1 ? 1 : 0)),
          shape: p.shape,
          advanceWidthCells: typeof p.advanceWidthCells === 'number' ? p.advanceWidthCells : undefined,
        };
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

  return {
    ...proj,
    metadata: proj.metadata,
    glyphs: validatedGlyphs,
  } as FontProject;
}
