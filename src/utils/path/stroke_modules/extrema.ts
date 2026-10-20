import { BezierNode, PathContour, Point } from "../../../types";
import { generateId } from "../id";
import { getContourSignedArea } from "../bounds";
import { splitCubicBezier } from "./nodeOptimization";

export interface ExtremumPoint {
  x: number;
  y: number;
  axis: 'x' | 'y';
  t: number;
  contourIndex: number;
  nodeIndex: number;
}

export interface ExtremaAnalysis {
  missingExtremaCount: number;
  extremaPoints: ExtremumPoint[];
  contoursAffected: number;
  hasMissingExtrema: boolean;
}

export interface ExtremaOptimizationOptions {
  /** 新規追加された極点ノードのハンドルを水平・垂直軸に完全スナップ（デフォルト: true） */
  alignHandlesToAxis?: boolean;
  /** 既存ノードとの最小距離閾値（px）。これより近い場合は既存ノードが極点とみなす（デフォルト: 5） */
  minDistanceThreshold?: number;
  /** 曲線の端点パラメータ t からの最小離れ（デフォルト: 0.03） */
  minParameterThreshold?: number;
}

export interface ExtremaOptimizationResult {
  contours: PathContour[];
  addedNodesCount: number;
  adjusted: boolean;
  originalAnalysis: ExtremaAnalysis;
  newAnalysis: ExtremaAnalysis;
  message: string;
}

/**
 * 3次ベジェ曲線上の特定パラメータ t (0 <= t <= 1) における座標を計算
 */
export function evaluateCubicBezier(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
    y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y,
  };
}

/**
 * 3次ベジェ曲線区間の 1階導関数 B'(t) = 0 となる極点パラメータ t を探索
 * dx/dt = 0 (垂直極点) および dy/dt = 0 (水平極点)
 */
export function findCubicExtremaParameters(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  minParam: number = 0.03,
  minDist: number = 5
): { t: number; axis: 'x' | 'y'; pt: Point }[] {
  // 直線または微小セグメントは除外
  const isStraight =
    Math.hypot(p1.x - p0.x, p1.y - p0.y) < 0.8 &&
    Math.hypot(p2.x - p3.x, p2.y - p3.y) < 0.8;
  if (isStraight) return [];

  const solveAxisRoots = (c0: number, c1: number, c2: number, c3: number): number[] => {
    // B'(t)/3 = a*t^2 + b*t + c
    const a = c3 - 3 * c2 + 3 * c1 - c0;
    const b = 2 * (c2 - 2 * c1 + c0);
    const c = c1 - c0;
    const EPS = 1e-7;
    const roots: number[] = [];

    if (Math.abs(a) < EPS) {
      if (Math.abs(b) > EPS) {
        const t = -c / b;
        if (t > minParam && t < 1 - minParam) {
          roots.push(t);
        }
      }
    } else {
      const disc = b * b - 4 * a * c;
      if (disc >= 0) {
        const sqrtDisc = Math.sqrt(disc);
        const t1 = (-b + sqrtDisc) / (2 * a);
        const t2 = (-b - sqrtDisc) / (2 * a);
        if (t1 > minParam && t1 < 1 - minParam) roots.push(t1);
        if (t2 > minParam && t2 < 1 - minParam && Math.abs(t2 - t1) > 0.02) roots.push(t2);
      }
    }
    return roots;
  };

  const xRoots = solveAxisRoots(p0.x, p1.x, p2.x, p3.x);
  const yRoots = solveAxisRoots(p0.y, p1.y, p2.y, p3.y);

  const results: { t: number; axis: 'x' | 'y'; pt: Point }[] = [];

  for (const t of xRoots) {
    const pt = evaluateCubicBezier(p0, p1, p2, p3, t);
    const distStart = Math.hypot(pt.x - p0.x, pt.y - p0.y);
    const distEnd = Math.hypot(pt.x - p3.x, pt.y - p3.y);
    if (distStart >= minDist && distEnd >= minDist) {
      results.push({ t, axis: 'x', pt });
    }
  }

  for (const t of yRoots) {
    const pt = evaluateCubicBezier(p0, p1, p2, p3, t);
    const distStart = Math.hypot(pt.x - p0.x, pt.y - p0.y);
    const distEnd = Math.hypot(pt.x - p3.x, pt.y - p3.y);
    if (distStart >= minDist && distEnd >= minDist) {
      const existsNear = results.some(
        (r) => Math.abs(r.t - t) < 0.02 || Math.hypot(r.pt.x - pt.x, r.pt.y - pt.y) < minDist
      );
      if (!existsNear) {
        results.push({ t, axis: 'y', pt });
      }
    }
  }

  return results.sort((a, b) => a.t - b.t);
}

/**
 * グリフ全体の輪郭について、ノードが欠落しているベジェ曲線の極点を幾何学的に分析
 */
export function analyzeGlyphExtrema(
  contours: PathContour[],
  minDist: number = 5
): ExtremaAnalysis {
  if (!contours || contours.length === 0) {
    return {
      missingExtremaCount: 0,
      extremaPoints: [],
      contoursAffected: 0,
      hasMissingExtrema: false,
    };
  }

  const extremaPoints: ExtremumPoint[] = [];
  const affectedContourIndices = new Set<number>();

  contours.forEach((contour, cIdx) => {
    const nodes = contour.nodes;
    if (!nodes || nodes.length < 2) return;

    for (let i = 0; i < nodes.length; i++) {
      const curr = nodes[i];
      const isLast = i === nodes.length - 1;
      const next = isLast ? (contour.closed ? nodes[0] : null) : nodes[i + 1];
      if (!next) break;

      const p0 = { x: curr.x, y: curr.y };
      const p1 = curr.handleOut || { x: curr.x, y: curr.y };
      const p2 = next.handleIn || { x: next.x, y: next.y };
      const p3 = { x: next.x, y: next.y };

      const roots = findCubicExtremaParameters(p0, p1, p2, p3, 0.03, minDist);
      for (const r of roots) {
        extremaPoints.push({
          x: Math.round(r.pt.x),
          y: Math.round(r.pt.y),
          axis: r.axis,
          t: r.t,
          contourIndex: cIdx,
          nodeIndex: i,
        });
        affectedContourIndices.add(cIdx);
      }
    }
  });

  return {
    missingExtremaCount: extremaPoints.length,
    extremaPoints,
    contoursAffected: affectedContourIndices.size,
    hasMissingExtrema: extremaPoints.length > 0,
  };
}

/**
 * 輪郭のベジェ曲線極点（水平・垂直の最外端）にノードを自動追加し、
 * ハンドルを軸方向に数学的に正しく最適化（TrueType / OpenType 規格準拠）
 */
export function optimizeContoursExtrema(
  contours: PathContour[],
  options: ExtremaOptimizationOptions = {}
): ExtremaOptimizationResult {
  const originalAnalysis = analyzeGlyphExtrema(contours, options.minDistanceThreshold ?? 5);

  if (!contours || contours.length === 0 || !originalAnalysis.hasMissingExtrema) {
    return {
      contours,
      addedNodesCount: 0,
      adjusted: false,
      originalAnalysis,
      newAnalysis: originalAnalysis,
      message: '極点ノードの不足は検出されませんでした（すでに最適化されています）',
    };
  }

  const alignHandlesToAxis = options.alignHandlesToAxis ?? true;
  const minDist = options.minDistanceThreshold ?? 5;
  const minParam = options.minParameterThreshold ?? 0.03;

  let totalAddedCount = 0;

  const newContours = contours.map((contour) => {
    const nodes = contour.nodes;
    if (!nodes || nodes.length < 2) return contour;

    const origArea = getContourSignedArea(contour);

    // 作業用コピー
    const workingNodes: BezierNode[] = nodes.map((n) => ({
      ...n,
      handleIn: n.handleIn ? { ...n.handleIn } : null,
      handleOut: n.handleOut ? { ...n.handleOut } : null,
    }));

    const insertionsAfter = new Map<number, BezierNode[]>();

    for (let i = 0; i < workingNodes.length; i++) {
      const curr = workingNodes[i];
      const isLast = i === workingNodes.length - 1;
      const nextIdx = isLast ? 0 : i + 1;
      const next = workingNodes[nextIdx];

      if (isLast && !contour.closed) break;

      const p0 = { x: curr.x, y: curr.y };
      const p1 = curr.handleOut || { x: curr.x, y: curr.y };
      const p2 = next.handleIn || { x: next.x, y: next.y };
      const p3 = { x: next.x, y: next.y };

      const extrema = findCubicExtremaParameters(p0, p1, p2, p3, minParam, minDist);
      if (extrema.length === 0) continue;

      let remaining: [Point, Point, Point, Point] = [p0, p1, p2, p3];
      let u0 = 0;
      const inserted: BezierNode[] = [];

      for (const ext of extrema) {
        const tRel = (ext.t - u0) / (1 - u0);
        if (tRel <= 0.005 || tRel >= 0.995) continue;

        const { left, right } = splitCubicBezier(
          remaining[0],
          remaining[1],
          remaining[2],
          remaining[3],
          tRel
        );

        if (inserted.length === 0) {
          curr.handleOut = { x: Math.round(left[1].x), y: Math.round(left[1].y) };
        } else {
          inserted[inserted.length - 1].handleOut = {
            x: Math.round(left[1].x),
            y: Math.round(left[1].y),
          };
        }

        const nodeX = Math.round(left[3].x);
        const nodeY = Math.round(left[3].y);
        const handleIn: Point = { x: Math.round(left[2].x), y: Math.round(left[2].y) };
        const handleOut: Point = { x: Math.round(right[1].x), y: Math.round(right[1].y) };

        if (alignHandlesToAxis) {
          if (ext.axis === 'x') {
            handleIn.x = nodeX;
            handleOut.x = nodeX;
          } else if (ext.axis === 'y') {
            handleIn.y = nodeY;
            handleOut.y = nodeY;
          }
        }

        inserted.push({
          id: generateId(),
          x: nodeX,
          y: nodeY,
          handleIn,
          handleOut,
          type: 'smooth',
        });

        remaining = right;
        u0 = ext.t;
      }

      if (inserted.length > 0) {
        next.handleIn = { x: Math.round(remaining[2].x), y: Math.round(remaining[2].y) };
        inserted[inserted.length - 1].handleOut = {
          x: Math.round(remaining[1].x),
          y: Math.round(remaining[1].y),
        };

        if (alignHandlesToAxis) {
          const lastExt = extrema[extrema.length - 1];
          if (lastExt.axis === 'x') {
            inserted[inserted.length - 1].handleOut!.x = inserted[inserted.length - 1].x;
          } else if (lastExt.axis === 'y') {
            inserted[inserted.length - 1].handleOut!.y = inserted[inserted.length - 1].y;
          }
        }

        insertionsAfter.set(i, inserted);
        totalAddedCount += inserted.length;
      }
    }

    const finalNodes: BezierNode[] = [];
    for (let i = 0; i < workingNodes.length; i++) {
      finalNodes.push(workingNodes[i]);
      const ins = insertionsAfter.get(i);
      if (ins && ins.length > 0) {
        finalNodes.push(...ins);
      }
    }

    const candidateContour: PathContour = {
      ...contour,
      nodes: finalNodes,
    };

    // 面積反転の検証
    const newArea = getContourSignedArea(candidateContour);
    if ((origArea > 0 && newArea <= 0) || (origArea < 0 && newArea >= 0)) {
      return contour; // 反転した場合は元に戻す
    }

    return candidateContour;
  });

  const newAnalysis = analyzeGlyphExtrema(newContours, minDist);
  const adjusted = totalAddedCount > 0;

  return {
    contours: newContours,
    addedNodesCount: totalAddedCount,
    adjusted,
    originalAnalysis,
    newAnalysis,
    message: adjusted
      ? `ベジェ曲線の極点にノードを ${totalAddedCount} 箇所追加し、軸整列を完了しました`
      : '極点ノードの追加対象はありませんでした',
  };
}

/**
 * Snap a 2D vector (startX, startY) -> (currentX, currentY) to nearest straight angles:
 * 0° (horizontal right), 45°, 90° (vertical down), 135°, 180° (horizontal left), -135°, -90° (vertical up), -45°
 */
