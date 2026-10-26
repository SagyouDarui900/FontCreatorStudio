import { FontProject, GlyphData, PathContour, Point } from '../../types';
import {
  getContoursBoundingBox,
  sampleContourPoints,
  analyzeGlyphStrokeWidths,
  analyzeGlyphExtrema,
} from '../pathUtils';
import {
  FontQualityReport,
  QualityCheckOptions,
  QualityIssue,
  QualitySeverity,
} from './types';
import { findContourIntersections } from './intersectionResolver';
import { analyzeGlyphContourDensity } from './densityAnalyzer';

export const DEFAULT_BASELINE_Y = 800;
const DEFAULT_MAX_NODES_PER_CONTOUR = 90;
const DEFAULT_MAX_NODES_PER_GLYPH = 220;

// Helper: Check if character has expected descender in Latin
const LATIN_DESCENDERS = new Set(['g', 'j', 'p', 'q', 'y', 'ç']);

// Helper: Check if character is small kana (legitimately smaller and off-center)
const SMALL_KANA_CODES = new Set([
  0x3041, 0x3043, 0x3045, 0x3047, 0x3049, 0x3063, 0x3083, 0x3085, 0x3087, 0x308e, 0x3095, 0x3096,
  0x30a1, 0x30a3, 0x30a5, 0x30a7, 0x30a9, 0x30c3, 0x30e3, 0x30e5, 0x30e7, 0x30ee, 0x30f5, 0x30f6,
]);

// Helper: Symbols, marks, and punctuation that naturally float or have variable baseline
const EXCLUDED_BASELINE_FLOAT_CODES = new Set([
  // Japanese marks & diacritics
  0x309b, 0x309c, // ゛, ゜
  0x309d, 0x309e, // ゝ, ゞ
  0x30fd, 0x30fe, // ヽ, ヾ
  0x30fc, 0x30fb, 0x30a0, // ー, ・, ゠
  // Punctuation, brackets, quotes
  0x3001, 0x3002, 0x3003, 0x3005, 0x3008, 0x3009, 0x300a, 0x300b, 0x300c, 0x300d, 0x300e, 0x300f,
  0x3010, 0x3011, 0x3012, 0x3014, 0x3015, 0x301c, 0xff5e,
]);

function getGlyphGeometrySignature(contours: PathContour[]): string {
  if (!contours || contours.length === 0) return '';
  const bbox = getContoursBoundingBox(contours);
  const totalNodes = contours.reduce((sum, c) => sum + (c.nodes ? c.nodes.length : 0), 0);

  // 幅・高さおよび相対位置のサンプリングによるシグネチャ
  const relativeSample: string[] = [];
  contours.forEach((c) => {
    (c.nodes || []).slice(0, 10).forEach((n) => {
      const rx = Math.round(n.x - bbox.minX);
      const ry = Math.round(n.y - bbox.minY);
      relativeSample.push(`${rx},${ry}`);
    });
  });

  return `${contours.length}_${totalNodes}_${Math.round(bbox.width)}x${Math.round(bbox.height)}_${relativeSample.slice(0, 8).join(';')}`;
}

/**
 * フォントプロジェクト全体の品質チェックを実行
 */
export function checkFontQuality(
  project: FontProject,
  options: QualityCheckOptions = {}
): FontQualityReport {
  const baselineY = options.baselineY ?? DEFAULT_BASELINE_Y;
  const maxNodesContour = options.maxNodesPerContour ?? DEFAULT_MAX_NODES_PER_CONTOUR;
  const maxNodesGlyph = options.maxNodesPerGlyph ?? DEFAULT_MAX_NODES_PER_GLYPH;
  const checkDuplicates = options.checkDuplicates ?? true;
  const checkIntersections = options.checkIntersections ?? true;

  const glyphs = (Object.values(project.glyphs || {}) as GlyphData[]).filter(
    (g) => g && typeof g.unicode === 'number'
  );

  const issues: QualityIssue[] = [];

  // ================= 1. 字形の重複チェック (Duplicate Glyph Shapes) =================
  if (checkDuplicates) {
    const signatureMap = new Map<string, GlyphData[]>();

    glyphs.forEach((g) => {
      if (!g.contours || g.contours.length === 0) return;
      // 孤立した空グリフは除外
      const hasRealNodes = g.contours.some((c) => c.nodes && c.nodes.length > 1);
      if (!hasRealNodes) return;

      const sig = getGlyphGeometrySignature(g.contours);
      if (!sig) return;

      if (!signatureMap.has(sig)) {
        signatureMap.set(sig, []);
      }
      signatureMap.get(sig)!.push(g);
    });

    const seenDupPairs = new Set<string>();

    signatureMap.forEach((group) => {
      if (group.length > 1) {
        for (let i = 0; i < group.length; i++) {
          const g1 = group[i];
          for (let j = i + 1; j < group.length; j++) {
            const g2 = group[j];
            const pairKey = [g1.unicode, g2.unicode].sort().join('-');
            if (seenDupPairs.has(pairKey)) continue;
            seenDupPairs.add(pairKey);

            // 二重チェック: 点座標が極めて高い一致度を持つか検証
            const b1 = getContoursBoundingBox(g1.contours);
            const b2 = getContoursBoundingBox(g2.contours);
            const dx = Math.abs(b1.width - b2.width);
            const dy = Math.abs(b1.height - b2.height);

            if (dx <= 4 && dy <= 4 && g1.contours.length === g2.contours.length) {
              issues.push({
                id: `dup-${g1.unicode}-${g2.unicode}`,
                unicode: g1.unicode,
                char: g1.char || String.fromCodePoint(g1.unicode),
                glyphName: g1.name || `uni${g1.unicode.toString(16).toUpperCase()}`,
                type: 'duplicate_shape',
                severity: 'warning',
                title: '字形の重複を検出',
                description: `文字「${g1.char}」(U+${g1.unicode.toString(16).toUpperCase()}) と文字「${g2.char}」(U+${g2.unicode.toString(16).toUpperCase()}) の輪郭形状が一致しています。重複登録や未編集のグリフでないか確認してください。`,
                recommendation: `別の文字からコピーされたままの場合は、文字「${g1.char}」または「${g2.char}」のグリフ固有の形状に編集してください。`,
                details: {
                  duplicateWithUnicode: g2.unicode,
                  duplicateWithChar: g2.char,
                },
                canAutoFix: false,
              });
            }
          }
        }
      }
    });
  }

  // ================= 各グリフの詳細検査 =================
  glyphs.forEach((g) => {
    const unicode = g.unicode;
    const char = g.char || (unicode ? String.fromCodePoint(unicode) : '');
    const glyphName = g.name || `uni${unicode.toString(16).toUpperCase()}`;
    const contours = g.contours || [];

    // 空グリフは未制作状態（プロジェクト診断で管理）のため品質検査の幾何異常からは除外
    if (contours.length === 0) {
      return;
    }

    // 孤立ノード (1頂点のみの輪郭)
    const isolatedCount = contours.filter((c) => c.nodes && c.nodes.length === 1).length;
    if (isolatedCount > 0) {
      issues.push({
        id: `iso-${unicode}`,
        unicode,
        char,
        glyphName,
        type: 'isolated_node',
        severity: 'warning',
        title: '孤立ノード（単一頂点）を検出',
        description: `輪郭パスの中に頂点が1つだけの孤立要素が ${isolatedCount} 箇所あります。閉じた面として描画されず、フォント規格違反の原因となります。`,
        recommendation: '「自動修正」をクリックして無効な孤立ノードを除去してください。',
        canAutoFix: true,
        autoFixType: 'remove_isolated',
      });
    }

    // ================= 2. 過剰なノード数チェック (Excessive Nodes) =================
    let totalNodes = 0;
    let maxContourNodes = 0;

    contours.forEach((c) => {
      const count = c.nodes ? c.nodes.length : 0;
      totalNodes += count;
      if (count > maxContourNodes) {
        maxContourNodes = count;
      }
    });

    if (totalNodes > maxNodesGlyph || maxContourNodes > maxNodesContour) {
      const isSevere = totalNodes > maxNodesGlyph * 1.8 || maxContourNodes > maxNodesContour * 1.8;
      const densityAnalysis = analyzeGlyphContourDensity(contours, unicode, char);
      issues.push({
        id: `nodes-${unicode}`,
        unicode,
        char,
        glyphName,
        type: 'excessive_nodes',
        severity: isSevere ? 'error' : 'warning',
        title: isSevere ? 'ノード数が極度に過剰' : 'ノード数が過剰',
        description: `総ノード数が ${totalNodes} 個（推奨: ${maxNodesGlyph}個以下）、単一輪郭の最大ノード数が ${maxContourNodes} 個（推奨: ${maxNodesContour}個以下）です。手書きストロークの微小な頂点密集によりフォント容量が肥大化し、表示レンダリングが遅くなる原因になります。`,
        recommendation: '「ヒートマップ診断」で過密箇所を確認してクリック単純化するか、「自動修正」で形状を保護したまま最適化してください。',
        details: {
          nodeCount: totalNodes,
          maxContourNodes,
          densityAnalysis,
        },
        canAutoFix: true,
        autoFixType: 'simplify_nodes',
      });
    }

    // ================= 3. パスの交差チェック (Path Intersections) =================
    if (checkIntersections && contours.length > 0) {
      const intersectionPts = findContourIntersections(contours);
      if (intersectionPts.length > 0) {
        issues.push({
          id: `intersect-${unicode}`,
          unicode,
          char,
          glyphName,
          type: 'path_intersection',
          severity: 'warning',
          title: '一筆書き交差・ストローク重なり（白抜きリスク）',
          description: `輪郭の線分同士が交差している箇所が ${intersectionPts.length} 箇所あります。一筆書きのループや画線の交差部分は、描画環境やフォント出力時に重なりが白抜け（中抜き）する原因となります。「白抜き解消」を実行すると、形状を維持したまま交差・重なりをブーリアン結合して白抜きを防止できます。`,
          recommendation: '「自動修正」を実行すると、一筆書きの自己交差や重なり部分を自動結合して白抜きを防止します。',
          details: {
            intersectionCount: intersectionPts.length,
            intersectionPoints: intersectionPts,
          },
          canAutoFix: true,
          autoFixType: 'merge_intersection',
        });
      }
    }

    // ================= 4. ベースライン逸脱チェック (Baseline Deviation) =================
    const bbox = getContoursBoundingBox(contours);
    if (bbox.width > 0 && bbox.height > 0) {
      const isAscii = unicode >= 0x0020 && unicode <= 0x007e;
      const isDescenderChar = LATIN_DESCENDERS.has(char);
      const isSmallKana = SMALL_KANA_CODES.has(unicode);
      const isExcludedFloat = EXCLUDED_BASELINE_FLOAT_CODES.has(unicode);
      const isFullwidth =
        (unicode >= 0x4e00 && unicode <= 0x9fff) ||
        (unicode >= 0x3040 && unicode <= 0x30ff) ||
        (unicode >= 0x3400 && unicode <= 0x4dbf);

      // 上端のはみ出し (仮想ボディ上限 Y=0 を大きく超える)
      if (bbox.minY < -40) {
        issues.push({
          id: `bound-top-${unicode}`,
          unicode,
          char,
          glyphName,
          type: 'baseline_deviation',
          severity: 'warning',
          title: '仮想ボディ上端（アセンダ）はみ出し',
          description: `輪郭の上端 (Y=${Math.round(bbox.minY)}) が em-box 上限 (Y=0) を超えています。複数行組版で行間クリッピングが発生します。`,
          recommendation: 'メトリクスパネルで高さを縮小するか、ベースラインへ収まるよう下へ移動してください。',
          details: {
            currentBaselineY: Math.round(bbox.maxY),
            targetBaselineY: baselineY,
            deviationPx: Math.round(-bbox.minY),
            deviationType: 'overflow_top',
          },
          canAutoFix: true,
          autoFixType: 'align_baseline',
        });
      }

      // 下端のはみ出し (em-box 下限 Y=1000 を超える)
      if (bbox.maxY > 1030) {
        issues.push({
          id: `bound-btm-${unicode}`,
          unicode,
          char,
          glyphName,
          type: 'baseline_deviation',
          severity: 'warning',
          title: '仮想ボディ下端（ディセンダ）はみ出し',
          description: `輪郭の下端 (Y=${Math.round(bbox.maxY)}) がフォント枠の床面 (Y=1000) を超えています。`,
          recommendation: 'ベースラインに合わせて文字全体を上に引き上げてください。',
          details: {
            currentBaselineY: Math.round(bbox.maxY),
            targetBaselineY: baselineY,
            deviationPx: Math.round(bbox.maxY - 1000),
            deviationType: 'overflow_bottom',
          },
          canAutoFix: true,
          autoFixType: 'align_baseline',
        });
      }

      // 和文漢字・かな（小書き・約物・記号除く）のベースライン浮遊または沈み
      if (isFullwidth && !isSmallKana && !isExcludedFloat && bbox.height > 120) {
        // 和文の標準下端目安: 760 ~ 850
        if (bbox.maxY < 680) {
          issues.push({
            id: `base-float-${unicode}`,
            unicode,
            char,
            glyphName,
            type: 'baseline_deviation',
            severity: 'warning',
            title: '文字がベースラインから浮いています',
            description: `文字「${char}」の下端が Y=${Math.round(bbox.maxY)} の位置にあり、基準下端（標準目安: 780〜840）より上方に配置されています。`,
            recommendation: '「自動整列」でベースライン基準位置に移動するか、キャンバスで配置を調整してください。',
            details: {
              currentBaselineY: Math.round(bbox.maxY),
              targetBaselineY: baselineY,
              deviationPx: Math.round(baselineY - bbox.maxY),
              deviationType: 'floating',
            },
            canAutoFix: true,
            autoFixType: 'align_baseline',
          });
        } else if (bbox.maxY > 920) {
          issues.push({
            id: `base-drop-${unicode}`,
            unicode,
            char,
            glyphName,
            type: 'baseline_deviation',
            severity: 'warning',
            title: '文字がベースラインを過度に下回っています',
            description: `文字「${char}」の下端が Y=${Math.round(bbox.maxY)} とベースライン (Y=${baselineY}) を深く突き抜けています。`,
            recommendation: '「自動整列」でベースライン位置に下端を合わせるか、全体を上に移動してください。',
            details: {
              currentBaselineY: Math.round(bbox.maxY),
              targetBaselineY: baselineY,
              deviationPx: Math.round(bbox.maxY - baselineY),
              deviationType: 'dropped',
            },
            canAutoFix: true,
            autoFixType: 'align_baseline',
          });
        }
      }

      // 欧文アルファベットのベースライン検査
      if (isAscii && char.match(/[a-zA-Z0-9]/)) {
        if (isDescenderChar) {
          // ディセンダ付き文字 (g, p, yなど) は baselineY (800) より下に来るのが正常
          if (bbox.maxY < 760) {
            issues.push({
              id: `base-desc-float-${unicode}`,
              unicode,
              char,
              glyphName,
              type: 'baseline_deviation',
              severity: 'warning',
              title: 'ディセンダ（降下部分）の不足',
              description: `欧文文字「${char}」はディセンダ（下向きの突き出し）を持つべき文字ですが、下端が Y=${Math.round(bbox.maxY)} とベースラインより上に浮いています。`,
              recommendation: 'ベースライン (Y=${baselineY}) を適度に下回るように作図してください。',
              details: {
                currentBaselineY: Math.round(bbox.maxY),
                targetBaselineY: 920,
                deviationPx: Math.round(920 - bbox.maxY),
                deviationType: 'floating',
              },
              canAutoFix: false,
            });
          }
        } else {
          // ディセンダを持たない文字 (A-Z, b, d, f, h, k, l, etc.)
          if (bbox.maxY < 680) {
            issues.push({
              id: `base-latin-float-${unicode}`,
              unicode,
              char,
              glyphName,
              type: 'baseline_deviation',
              severity: 'warning',
              title: '欧文文字のベースライン浮遊',
              description: `欧文文字「${char}」の下端 (Y=${Math.round(bbox.maxY)}) がベースライン (Y=${baselineY}) から大きく浮いています。`,
              recommendation: '「自動整列」で下端をベースライン Y=${baselineY} に設置してください。',
              details: {
                currentBaselineY: Math.round(bbox.maxY),
                targetBaselineY: baselineY,
                deviationPx: Math.round(baselineY - bbox.maxY),
                deviationType: 'floating',
              },
              canAutoFix: true,
              autoFixType: 'align_baseline',
            });
          } else if (bbox.maxY > 870) {
            issues.push({
              id: `base-latin-drop-${unicode}`,
              unicode,
              char,
              glyphName,
              type: 'baseline_deviation',
              severity: 'warning',
              title: '欧文文字の不適切なベースライン突破',
              description: `文字「${char}」はディセンダを持たない文字ですが、下端が Y=${Math.round(bbox.maxY)} とベースライン (Y=${baselineY}) より沈んでいます。`,
              recommendation: '「自動整列」で下端をベースラインに合わせてください。',
              details: {
                currentBaselineY: Math.round(bbox.maxY),
                targetBaselineY: baselineY,
                deviationPx: Math.round(bbox.maxY - baselineY),
                deviationType: 'dropped',
              },
              canAutoFix: true,
              autoFixType: 'align_baseline',
            });
          }
        }
      }

      // ================= 5. 線幅の偏り・かすれ・潰れチェック (Uneven Stroke Widths) =================
      const strokeAnalysis = analyzeGlyphStrokeWidths(contours);
      if (strokeAnalysis.sampleCount >= 4) {
        if (strokeAnalysis.isExcessivelyThin || strokeAnalysis.isExcessivelyThick || strokeAnalysis.hasInconsistency) {
          let title = 'ストローク線幅の不均一';
          let desc = `線幅の測定値: 最小 ${strokeAnalysis.minWidth}px / 最大 ${strokeAnalysis.maxWidth}px (中央値 ${strokeAnalysis.medianWidth}px)。`;
          let severity: QualitySeverity = 'info';

          if (strokeAnalysis.isExcessivelyThin) {
            title = '線幅のかすれ（細線）を検出';
            desc = `文字「${char}」の最小線幅が ${strokeAnalysis.minWidth}px です（中央値: ${strokeAnalysis.medianWidth}px）。印刷や画面表示時にかすれや線の欠落が発生します。`;
            severity = 'warning';
          } else if (strokeAnalysis.isExcessivelyThick) {
            title = '線幅の太まり（線の潰れ）を検出';
            desc = `文字「${char}」の最大線幅が ${strokeAnalysis.maxWidth}px です（中央値: ${strokeAnalysis.medianWidth}px）。交差部や画数の密集部が黒く潰れます。`;
            severity = 'warning';
          } else {
            desc += '文字内での線の太さの差が大きく、線幅が不均一です。';
          }

          issues.push({
            id: `stroke-${unicode}`,
            unicode,
            char,
            glyphName,
            type: 'uneven_stroke',
            severity,
            title,
            description: desc,
            recommendation: '「ストローク均一化」を実行して、細い箇所の補強と太い箇所の線幅調整を行います。',
            details: {
              minStrokeWidth: strokeAnalysis.minWidth,
              maxStrokeWidth: strokeAnalysis.maxWidth,
              medianStrokeWidth: strokeAnalysis.medianWidth,
              avgStrokeWidth: strokeAnalysis.avgWidth,
              stdDevStrokeWidth: strokeAnalysis.stdDev,
              thinPoints: strokeAnalysis.thinPoints,
              thickPoints: strokeAnalysis.thickPoints,
            },
            canAutoFix: true,
            autoFixType: 'equalize_strokes',
          });
        }
      }

      // 6. ベジェ曲線の極点（Extrema）チェック
      const extremaAnalysis = analyzeGlyphExtrema(contours, 6);
      if (extremaAnalysis.missingExtremaCount > 0) {
        issues.push({
          id: `extrema-${unicode}`,
          unicode,
          char,
          glyphName,
          type: 'missing_extrema',
          severity: 'info',
          title: 'ベジェ曲線の極点ノード不足',
          description: `輪郭のベジェ曲線上に、水平または垂直の極点（曲線の最外端・方向転換点）となるノードが ${extremaAnalysis.missingExtremaCount} 箇所不足しています。極点にノードを配置することで、TrueType/OpenType規格に準拠し、フォント出力時のヒンティング精度やラスタライズ表示が数学的に最適化されます。`,
          recommendation: '「極点最適化」を実行して、ベジェ曲線の形状を保ったまま極点へノードを自動配置・軸整列します。',
          details: {
            missingExtremaCount: extremaAnalysis.missingExtremaCount,
            extremaPoints: extremaAnalysis.extremaPoints.map((p) => ({ x: p.x, y: p.y })),
          },
          canAutoFix: true,
          autoFixType: 'optimize_extrema',
        });
      }
    }
  });

  // カテゴリごとの集計
  let errorCount = 0;
  let warningCount = 0;
  let infoCount = 0;

  const categoryCounts = {
    duplicate_shape: 0,
    path_intersection: 0,
    excessive_nodes: 0,
    baseline_deviation: 0,
    uneven_stroke: 0,
    missing_extrema: 0,
    other: 0,
  };

  issues.forEach((iss) => {
    if (iss.severity === 'error') errorCount++;
    else if (iss.severity === 'warning') warningCount++;
    else infoCount++;

    if (iss.type === 'isolated_node') {
      categoryCounts.excessive_nodes++;
    } else if (iss.type in categoryCounts) {
      categoryCounts[iss.type as keyof typeof categoryCounts]++;
    } else {
      categoryCounts.other++;
    }
  });

  // 品質スコア計算 (100点満点)
  const totalGlyphsChecked = glyphs.length;
  let score = 100;
  if (totalGlyphsChecked > 0) {
    const penalty = (errorCount * 12 + warningCount * 4 + infoCount * 1) / Math.max(1, totalGlyphsChecked * 0.4);
    score = Math.max(20, Math.round(100 - penalty));
  }

  return {
    timestamp: Date.now(),
    totalGlyphsChecked,
    totalIssues: issues.length,
    errorCount,
    warningCount,
    infoCount,
    score,
    categoryCounts,
    issues,
  };
}

/**
 * 単一の品質問題を自動修正
 */
