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
