import { BezierNode, PathContour, Point } from "../../../types";
import { sampleContourPoints, getContoursBoundingBox, getContourSignedArea } from "../bounds";
import { transformContours } from "../transform";

export interface StrokeWidthAnalysis {
  minWidth: number;
  maxWidth: number;
  avgWidth: number;
  medianWidth: number;
  stdDev: number;
  isExcessivelyThin: boolean;
  isExcessivelyThick: boolean;
  hasInconsistency: boolean;
  sampleCount: number;
  thinPoints: Point[];
  thickPoints: Point[];
}

export interface StrokeEqualizationOptions {
  targetWidth?: number;
  mode?: 'balanced' | 'boost_thin' | 'shrink_thick';
  strength?: number; // 0.1 ~ 1.0 (default: 0.65)
  minThreshold?: number; // default: 22px
  maxThreshold?: number; // default: 110px
  preserveSharpCorners?: boolean; // default: true
  maxDeviation?: number; // default: 16px
}

export interface StrokeEqualizationResult {
  contours: PathContour[];
  adjusted: boolean;
  originalAnalysis: StrokeWidthAnalysis;
  newAnalysis: StrokeWidthAnalysis;
  thinFixedCount: number;
  thickFixedCount: number;
  message: string;
}

/**
 * 輪郭群（グリフ全体）の線幅（ストローク太さ）を幾何学的にサンプリング・詳細分析
 */
export function analyzeGlyphStrokeWidths(contours: PathContour[]): StrokeWidthAnalysis {
  const emptyResult: StrokeWidthAnalysis = {
    minWidth: 0,
    maxWidth: 0,
    avgWidth: 0,
    medianWidth: 0,
    stdDev: 0,
    isExcessivelyThin: false,
    isExcessivelyThick: false,
    hasInconsistency: false,
    sampleCount: 0,
    thinPoints: [],
    thickPoints: [],
  };

  if (!contours || contours.length === 0) return emptyResult;

  // 全輪郭のサンプリング点とセグメントを抽出
  interface SampleWithNormal {
    pt: Point;
    normal: Point; // 輪郭の外側・内側直交ベクトル
    contourIdx: number;
    nodeIdx: number;
    isCorner: boolean;
  }

  const allSamples: SampleWithNormal[] = [];
  const allSegments: { p1: Point; p2: Point; contourIdx: number }[] = [];

  contours.forEach((contour, cIdx) => {
    if (!contour.nodes || contour.nodes.length < 2) return;
    const n = contour.nodes.length;

    // 輪郭のサンプリング点列（ベジェ曲線を含む）
    const sampledPoints = sampleContourPoints(contour, 6);
    if (sampledPoints.length < 2) return;

    for (let i = 0; i < sampledPoints.length - 1; i++) {
      allSegments.push({
        p1: sampledPoints[i],
        p2: sampledPoints[i + 1],
        contourIdx: cIdx,
      });
    }
    if (contour.closed && sampledPoints.length > 2) {
      allSegments.push({
        p1: sampledPoints[sampledPoints.length - 1],
        p2: sampledPoints[0],
        contourIdx: cIdx,
      });
    }

    // 各ノードでの法線と位置を抽出
    for (let i = 0; i < n; i++) {
      const curr = contour.nodes[i];
      const prev = contour.nodes[(i - 1 + n) % n];
      const next = contour.nodes[(i + 1) % n];

      const v1x = curr.x - prev.x;
      const v1y = curr.y - prev.y;
      const len1 = Math.hypot(v1x, v1y) || 1;

      const v2x = next.x - curr.x;
      const v2y = next.y - curr.y;
      const len2 = Math.hypot(v2x, v2y) || 1;

      // 角度変化チェック（鋭角コーナーか否か）
      const dot = (v1x * v2x + v1y * v2y) / (len1 * len2);
      const angleDeg = Math.acos(Math.max(-1, Math.min(1, dot))) * (180 / Math.PI);
      const isCorner = angleDeg > 35;

      // 法線（右回転: (vy, -vx)）
      const n1x = v1y / len1;
      const n1y = -v1x / len1;
      const n2x = v2y / len2;
      const n2y = -v2x / len2;

      let nx = (n1x + n2x) / 2;
      let ny = (n1y + n2y) / 2;
      const nLen = Math.hypot(nx, ny) || 1;
      nx /= nLen;
      ny /= nLen;

      allSamples.push({
        pt: { x: curr.x, y: curr.y },
        normal: { x: nx, y: ny },
        contourIdx: cIdx,
        nodeIdx: i,
        isCorner,
      });
    }
  });

  if (allSamples.length === 0 || allSegments.length === 0) return emptyResult;

  // 各サンプル点から反対側の輪郭までの距離（局所線幅）を測定
  const widths: number[] = [];
  const thinPoints: Point[] = [];
  const thickPoints: Point[] = [];

  for (const sample of allSamples) {
    let minOppositeDist = Infinity;
    const px = sample.pt.x;
    const py = sample.pt.y;
    const nx = sample.normal.x;
    const ny = sample.normal.y;

    // 前後直交方向（法線に沿ったレイと各セグメントの交差）
    for (const seg of allSegments) {
      // 同じ輪郭の隣接ノード同士の距離測定は除外
      const segDx = seg.p2.x - seg.p1.x;
      const segDy = seg.p2.y - seg.p1.y;
      const segLenSq = segDx * segDx + segDy * segDy;
      if (segLenSq < 1) continue;

      // 点と線分の最短距離
      const t = Math.max(0, Math.min(1, ((px - seg.p1.x) * segDx + (py - seg.p1.y) * segDy) / segLenSq));
      const projX = seg.p1.x + t * segDx;
      const projY = seg.p1.y + t * segDy;
      const dist = Math.hypot(px - projX, py - projY);

      if (dist < 4) continue; // 同一点付近はスキップ

      // 法線方向との整合性チェック（法線ベクトルと投影ベクトルの内積）
      const dirX = (projX - px) / dist;
      const dirY = (projY - py) / dist;
      const align = Math.abs(dirX * nx + dirY * ny);

      // 法線と大まかに揃っている（対向面である）場合
      if (align > 0.45) {
        if (dist < minOppositeDist) {
          minOppositeDist = dist;
        }
      }
    }

    if (minOppositeDist > 3 && minOppositeDist < 350) {
      widths.push(minOppositeDist);
      if (minOppositeDist < 18) {
        thinPoints.push(sample.pt);
      } else if (minOppositeDist > 140) {
        thickPoints.push(sample.pt);
      }
    }
  }

  if (widths.length === 0) return emptyResult;

  widths.sort((a, b) => a - b);
  const minWidth = Math.round(widths[0]);
  const maxWidth = Math.round(widths[widths.length - 1]);
  const medianWidth = Math.round(widths[Math.floor(widths.length / 2)]);
  const sum = widths.reduce((acc, v) => acc + v, 0);
  const avgWidth = Math.round(sum / widths.length);

  // 標準偏差
  const variance = widths.reduce((acc, v) => acc + Math.pow(v - avgWidth, 2), 0) / widths.length;
  const stdDev = Math.round(Math.sqrt(variance) * 10) / 10;

  // かすれ判定: 極端に細い（< 15px または 中央値の40%未満）
  const isExcessivelyThin = minWidth < 15 || (medianWidth >= 28 && minWidth < medianWidth * 0.42);
  // 潰れ判定: 極端に太い（> 170px または 中央値の2.6倍以上）
  const isExcessivelyThick = maxWidth > 175 || (medianWidth <= 70 && maxWidth > medianWidth * 2.6);
  // 線幅のばらつき判定: max/min比率 > 4.2 または 標準偏差 > 22px
  const hasInconsistency =
    (maxWidth / Math.max(1, minWidth) > 3.8 && (minWidth < 20 || maxWidth > 120)) ||
    stdDev > 24;

  return {
    minWidth,
    maxWidth,
    avgWidth,
    medianWidth,
    stdDev,
    isExcessivelyThin,
    isExcessivelyThick,
    hasInconsistency,
    sampleCount: widths.length,
    thinPoints: thinPoints.slice(0, 8),
    thickPoints: thickPoints.slice(0, 8),
  };
}

/**
 * 文字のストローク線幅を均一化（かすれ・細線の補強および過度な太線のスリム化）
 */
export function equalizeContoursStrokeWidth(
  contours: PathContour[],
  options: StrokeEqualizationOptions = {}
): StrokeEqualizationResult {
  const originalAnalysis = analyzeGlyphStrokeWidths(contours);

  if (!contours || contours.length === 0) {
    return {
      contours: [],
      adjusted: false,
      originalAnalysis,
      newAnalysis: originalAnalysis,
      thinFixedCount: 0,
      thickFixedCount: 0,
      message: '輪郭が存在しません',
    };
  }

  const mode = options.mode || 'balanced';
  const strength = Math.max(0.1, Math.min(1.0, options.strength ?? 0.65));
  const preserveSharpCorners = options.preserveSharpCorners ?? true;
  const maxDeviation = options.maxDeviation ?? 16;

  // 目標線幅の自動算出（中央値が妥当なら中央値を基準、極端なら標準的な45~65pxにクランプ）
  const autoTarget =
    originalAnalysis.medianWidth > 0
      ? Math.max(32, Math.min(75, originalAnalysis.medianWidth))
      : 48;
  const targetWidth = options.targetWidth ?? autoTarget;

  const minThreshold = options.minThreshold ?? Math.max(18, Math.round(targetWidth * 0.65));
  const maxThreshold = options.maxThreshold ?? Math.min(130, Math.round(targetWidth * 1.55));

  let thinFixedCount = 0;
  let thickFixedCount = 0;

  // 輪郭ごとのセグメント情報を収集
  const allSegments: { p1: Point; p2: Point; contourIdx: number }[] = [];
  contours.forEach((contour, cIdx) => {
    if (!contour.nodes || contour.nodes.length < 2) return;
    const sampled = sampleContourPoints(contour, 5);
    for (let i = 0; i < sampled.length - 1; i++) {
      allSegments.push({ p1: sampled[i], p2: sampled[i + 1], contourIdx: cIdx });
    }
    if (contour.closed && sampled.length > 2) {
      allSegments.push({ p1: sampled[sampled.length - 1], p2: sampled[0], contourIdx: cIdx });
    }
  });

  const adjustedContours = contours.map((contour, cIdx) => {
    if (!contour.nodes || contour.nodes.length < 3) return contour;
    const n = contour.nodes.length;

    const origArea = getContourSignedArea(contour);
    const isOuter = origArea > 0;
    // 外輪郭は外側(+)が太くなる向き、穴輪郭は内側(-)が太くなる向き
    const outwardSign = isOuter ? 1 : -1;

    const newNodes = contour.nodes.map((node, i) => {
      const prev = contour.nodes[(i - 1 + n) % n];
      const next = contour.nodes[(i + 1) % n];

      // ベクトルと法線
      const v1x = node.x - prev.x;
      const v1y = node.y - prev.y;
      const len1 = Math.hypot(v1x, v1y) || 1;

      const v2x = next.x - node.x;
      const v2y = next.y - node.y;
      const len2 = Math.hypot(v2x, v2y) || 1;

      // コーナー角度判定
      const dot = (v1x * v2x + v1y * v2y) / (len1 * len2);
      const angleDeg = Math.acos(Math.max(-1, Math.min(1, dot))) * (180 / Math.PI);
      const isSharpCorner = angleDeg > 35;

      // 法線
      const n1x = v1y / len1;
      const n1y = -v1x / len1;
      const n2x = v2y / len2;
      const n2y = -v2x / len2;

      let nx = (n1x + n2x) / 2;
      let ny = (n1y + n2y) / 2;
      const nLen = Math.hypot(nx, ny) || 1;
      nx /= nLen;
      ny /= nLen;

      // 局所線幅測定
      let localDist = Infinity;
      for (const seg of allSegments) {
        const segDx = seg.p2.x - seg.p1.x;
        const segDy = seg.p2.y - seg.p1.y;
        const segLenSq = segDx * segDx + segDy * segDy;
        if (segLenSq < 1) continue;

        const t = Math.max(0, Math.min(1, ((node.x - seg.p1.x) * segDx + (node.y - seg.p1.y) * segDy) / segLenSq));
        const projX = seg.p1.x + t * segDx;
        const projY = seg.p1.y + t * segDy;
        const dist = Math.hypot(node.x - projX, node.y - projY);

        if (dist < 4) continue;
        const dirX = (projX - node.x) / dist;
        const dirY = (projY - node.y) / dist;
        const align = Math.abs(dirX * nx + dirY * ny);

        if (align > 0.45 && dist < localDist) {
          localDist = dist;
        }
      }

      let deltaOffset = 0;

      if (localDist < Infinity && localDist > 2) {
        if (localDist < minThreshold && (mode === 'balanced' || mode === 'boost_thin')) {
          // 細すぎる箇所を太く補強
          const diff = minThreshold - localDist;
          deltaOffset = diff * strength * 0.55;
          thinFixedCount++;
        } else if (localDist > maxThreshold && (mode === 'balanced' || mode === 'shrink_thick')) {
          // 太すぎる箇所をスリム化
          const diff = localDist - maxThreshold;
          deltaOffset = -diff * strength * 0.45;
          thickFixedCount++;
        }
      }

      // 鋭角コーナーや先端の保護（角を潰さないよう移動量を大きく減衰）
      if (preserveSharpCorners && isSharpCorner) {
        deltaOffset *= 0.15;
      }

      // 許容最大移動量にクランプ
      deltaOffset = Math.max(-maxDeviation, Math.min(maxDeviation, deltaOffset));

      const shiftX = Math.round(nx * outwardSign * deltaOffset);
      const shiftY = Math.round(ny * outwardSign * deltaOffset);

      if (shiftX === 0 && shiftY === 0) {
        return node;
      }

      return {
        ...node,
        x: node.x + shiftX,
        y: node.y + shiftY,
        handleIn: node.handleIn
          ? { x: node.handleIn.x + shiftX, y: node.handleIn.y + shiftY }
          : null,
        handleOut: node.handleOut
          ? { x: node.handleOut.x + shiftX, y: node.handleOut.y + shiftY }
          : null,
      };
    });

    // 形状妥当性チェック（符号付き面積が反転していないか）
    const candidateContour: PathContour = { ...contour, nodes: newNodes };
    const newArea = getContourSignedArea(candidateContour);
    if ((origArea > 0 && newArea <= 0) || (origArea < 0 && newArea >= 0)) {
      return contour; // 反転した場合は元を維持
    }

    return candidateContour;
  });

  const newAnalysis = analyzeGlyphStrokeWidths(adjustedContours);
  const adjusted = thinFixedCount > 0 || thickFixedCount > 0;

  return {
    contours: adjustedContours,
    adjusted,
    originalAnalysis,
    newAnalysis,
    thinFixedCount,
    thickFixedCount,
    message: adjusted
      ? `線幅を均一化しました (補強箇所: ${thinFixedCount}, 調整箇所: ${thickFixedCount})`
      : '目立った線幅の偏りは検出されませんでした',
  };
}

// =========================================================================
// ベジェ曲線 極点最適化（Extrema Optimization）
// =========================================================================


