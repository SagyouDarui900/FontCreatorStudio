import { BezierNode, PathContour, Point } from "../../../types";
import { rdpSimplify, pointsToBezierContourNodes } from "../../imageVectorizer";
import { generateId } from "../id";
import { getContourSignedArea, sampleContourPoints } from "../bounds";

export function simplifyPointsRDP(points: Point[], epsilon: number = 4): Point[] {
  const n = points.length;
  if (n <= 2) return points;

  const keep = new Uint8Array(n);
  keep[0] = 1;
  keep[n - 1] = 1;

  const stack: number[] = [0, n - 1];
  const epsilonSq = epsilon * epsilon;

  while (stack.length > 0) {
    const end = stack.pop()!;
    const start = stack.pop()!;

    let maxDistSq = 0;
    let maxIdx = start;

    const pStart = points[start];
    const pEnd = points[end];
    const dx = pEnd.x - pStart.x;
    const dy = pEnd.y - pStart.y;
    const lineLenSq = dx * dx + dy * dy;

    for (let i = start + 1; i < end; i++) {
      const pt = points[i];
      let distSq = 0;
      if (lineLenSq === 0) {
        const ddx = pt.x - pStart.x;
        const ddy = pt.y - pStart.y;
        distSq = ddx * ddx + ddy * ddy;
      } else {
        const t = Math.max(0, Math.min(1, ((pt.x - pStart.x) * dx + (pt.y - pStart.y) * dy) / lineLenSq));
        const projX = pStart.x + t * dx;
        const projY = pStart.y + t * dy;
        const ddx = pt.x - projX;
        const ddy = pt.y - projY;
        distSq = ddx * ddx + ddy * ddy;
      }

      if (distSq > maxDistSq) {
        maxDistSq = distSq;
        maxIdx = i;
      }
    }

    if (maxDistSq > epsilonSq) {
      keep[maxIdx] = 1;
      if (maxIdx - start > 1) {
        stack.push(start, maxIdx);
      }
      if (end - maxIdx > 1) {
        stack.push(maxIdx, end);
      }
    }
  }

  const result: Point[] = [];
  for (let i = 0; i < n; i++) {
    if (keep[i]) result.push(points[i]);
  }
  return result;
}

/**
 * Simplify a PathContour's nodes using Ramer-Douglas-Peucker algorithm while preserving shape
 */
export function simplifyContour(contour: PathContour, tolerance: number = 6): PathContour {
  if (!contour.nodes || contour.nodes.length <= 4) return contour;

  const pts: Point[] = contour.nodes.map((n) => ({ x: n.x, y: n.y }));
  
  let simplifiedPts: Point[];
  if (contour.closed) {
    // For closed loops, split at midpoint and simplify both halves to prevent collapsing
    const mid = Math.floor(pts.length / 2);
    const half1 = simplifyPointsRDP(pts.slice(0, mid + 1), tolerance);
    const half2 = simplifyPointsRDP([...pts.slice(mid), pts[0]], tolerance);
    simplifiedPts = [...half1.slice(0, -1), ...half2.slice(0, -1)];
  } else {
    simplifiedPts = simplifyPointsRDP(pts, tolerance);
  }

  if (simplifiedPts.length < 3 && contour.closed) {
    return contour; // Keep original if oversimplified
  }

  // Re-generate smooth bezier handles
  const newNodes: BezierNode[] = simplifiedPts.map((p) => ({
    id: generateId(),
    x: Math.round(p.x),
    y: Math.round(p.y),
    type: 'smooth',
  }));

  const total = newNodes.length;
  for (let i = 0; i < total; i++) {
    const prev = newNodes[(i - 1 + total) % total];
    const curr = newNodes[i];
    const next = newNodes[(i + 1) % total];

    const dPrev = Math.hypot(curr.x - prev.x, curr.y - prev.y);
    const dNext = Math.hypot(next.x - curr.x, next.y - curr.y);

    if (dPrev < 0.1 || dNext < 0.1) {
      curr.handleIn = { x: curr.x, y: curr.y };
      curr.handleOut = { x: curr.x, y: curr.y };
      continue;
    }

    const uPrevX = (curr.x - prev.x) / dPrev;
    const uPrevY = (curr.y - prev.y) / dPrev;
    const uNextX = (next.x - curr.x) / dNext;
    const uNextY = (next.y - curr.y) / dNext;

    const dot = uPrevX * uNextX + uPrevY * uNextY;
    const cosAngle = Math.max(-1, Math.min(1, dot));

    // Corner preservation (転折・角部分の自然な直線・角ノード処理)
    if (cosAngle < 0.76) {
      curr.type = 'corner';
      const inL = Math.min(dPrev * 0.25, 30);
      const outL = Math.min(dNext * 0.25, 30);
      curr.handleIn = {
        x: Math.round(curr.x - uPrevX * inL),
        y: Math.round(curr.y - uPrevY * inL),
      };
      curr.handleOut = {
        x: Math.round(curr.x + uNextX * outL),
        y: Math.round(curr.y + uNextY * outL),
      };
      continue;
    }

    let tanX = uPrevX + uNextX;
    let tanY = uPrevY + uNextY;
    let tanLen = Math.hypot(tanX, tanY) || 1;
    tanX /= tanLen;
    tanY /= tanLen;

    const cornerDamping = Math.max(0.04, Math.pow((1 + cosAngle) * 0.5, 0.65));
    const hInLen = Math.min(dPrev * 0.35 * cornerDamping, 80);
    const hOutLen = Math.min(dNext * 0.35 * cornerDamping, 80);

    curr.handleIn = { x: Math.round(curr.x - tanX * hInLen), y: Math.round(curr.y - tanY * hInLen) };
    curr.handleOut = { x: Math.round(curr.x + tanX * hOutLen), y: Math.round(curr.y + tanY * hOutLen) };
  }

  return {
    ...contour,
    nodes: newNodes,
  };
}

/**
 * Options for shape-preserving stroke smoothing and anchor point reduction
 */
export interface SmoothStrokeOptions {
  /** Maximum error tolerance in units (default: 5.5). Higher = fewer anchor points, smoother curve. */
  tolerance?: number;
  /** Angle threshold in degrees above which a corner is preserved as sharp (default: 52°). */
  cornerAngleDeg?: number;
  /** Smoothing preset level */
  level?: 'mild' | 'standard' | 'strong';
  /** Whether to detect and preserve intentional sharp corners and stroke tips */
  preserveCorners?: boolean;
}

export interface SmoothStrokeResult {
  contour: PathContour;
  originalPoints: number;
  reducedPoints: number;
  reductionPercent: number;
}

/**
 * Sample dense points along a cubic Bézier curve segment
 */

export function smoothStrokeContour(
  contour: PathContour,
  options: SmoothStrokeOptions = {}
): SmoothStrokeResult {
  const originalPoints = contour.nodes?.length || 0;
  if (!contour.nodes || originalPoints <= 3) {
    return {
      contour,
      originalPoints,
      reducedPoints: originalPoints,
      reductionPercent: 0,
    };
  }

  let tol = options.tolerance ?? 2.4;
  if (options.level === 'mild') tol = 1.2;
  else if (options.level === 'standard') tol = 2.4;
  else if (options.level === 'strong') tol = 4.8;

  const cornerAngleDeg = options.cornerAngleDeg ?? 52;
  const cornerRadThreshold = (cornerAngleDeg * Math.PI) / 180;
  const preserveCorners = options.preserveCorners ?? true;

  // 1. Sample dense polyline representation along the original contour
  const densePts = sampleContourPoints(contour, 10);
  if (densePts.length < 4) {
    return {
      contour,
      originalPoints,
      reducedPoints: originalPoints,
      reductionPercent: 0,
    };
  }

  // 2. Detect critical corner / inflection / cusp vertices that define the silhouette
  const numPts = densePts.length;
  const isCorner: boolean[] = new Array(numPts).fill(false);

  if (preserveCorners && numPts >= 8) {
    // Adaptive stride: ensure sampling arm length is at least ~6px in canvas space so micro-noise is not mistaken for a corner
    const stride = Math.max(3, Math.min(8, Math.floor(numPts / 20)));
    for (let i = 0; i < numPts; i++) {
      if (!contour.closed && (i < stride || i >= numPts - stride)) {
        if (i === 0 || i === numPts - 1) isCorner[i] = true;
        continue;
      }

      const prevIdx = (i - stride + numPts) % numPts;
      const nextIdx = (i + stride) % numPts;

      const pPrev = densePts[prevIdx];
      const pCurr = densePts[i];
      const pNext = densePts[nextIdx];

      const v1x = pCurr.x - pPrev.x;
      const v1y = pCurr.y - pPrev.y;
      const v2x = pNext.x - pCurr.x;
      const v2y = pNext.y - pCurr.y;

      const len1 = Math.hypot(v1x, v1y);
      const len2 = Math.hypot(v2x, v2y);

      // Require minimum physical arm length of 4px to avoid false corner triggers on sub-pixel noise
      if (len1 >= 4.0 && len2 >= 4.0) {
        const dot = (v1x * v2x + v1y * v2y) / (len1 * len2);
        const clampedDot = Math.max(-1, Math.min(1, dot));
        const angleTurn = Math.acos(clampedDot);

        if (angleTurn >= cornerRadThreshold) {
          isCorner[i] = true;
        }
      }
    }
  }

  // 3. Segment the path into smooth sections between identified corners
  const cornerIndices: number[] = [];
  for (let i = 0; i < numPts; i++) {
    if (isCorner[i]) {
      // Suppress nearby redundant corner detections within 4 points
      if (
        cornerIndices.length === 0 ||
        i - cornerIndices[cornerIndices.length - 1] > 3
      ) {
        cornerIndices.push(i);
      }
    }
  }

  let finalSimplifiedPoints: { point: Point; isCorner: boolean }[] = [];

  if (cornerIndices.length === 0) {
    // Single smooth closed loop or open path
    if (contour.closed) {
      const mid = Math.floor(densePts.length / 2);
      const part1 = simplifyPointsRDP(densePts.slice(0, mid + 1), tol);
      const part2 = simplifyPointsRDP([...densePts.slice(mid), densePts[0]], tol);
      const combined = [...part1.slice(0, -1), ...part2.slice(0, -1)];
      finalSimplifiedPoints = combined.map((p) => ({ point: p, isCorner: false }));
    } else {
      const simp = simplifyPointsRDP(densePts, tol);
      finalSimplifiedPoints = simp.map((p, idx) => ({
        point: p,
        isCorner: idx === 0 || idx === simp.length - 1,
      }));
    }
  } else {
    // Process section by section between corners to preserve sharp turns
    const sections: Point[][] = [];
    if (!contour.closed) {
      const allIdx = [0, ...cornerIndices.filter((idx) => idx !== 0 && idx !== numPts - 1), numPts - 1];
      for (let s = 0; s < allIdx.length - 1; s++) {
        const start = allIdx[s];
        const end = allIdx[s + 1];
        sections.push(densePts.slice(start, end + 1));
      }
    } else {
      for (let s = 0; s < cornerIndices.length; s++) {
        const start = cornerIndices[s];
        const end = cornerIndices[(s + 1) % cornerIndices.length];
        if (end > start) {
          sections.push(densePts.slice(start, end + 1));
        } else {
          sections.push([...densePts.slice(start), ...densePts.slice(0, end + 1)]);
        }
      }
    }

    const simplifiedChain: { point: Point; isCorner: boolean }[] = [];
    for (let s = 0; s < sections.length; s++) {
      const sec = sections[s];
      const simpSec = simplifyPointsRDP(sec, tol);
      for (let pIdx = 0; pIdx < simpSec.length; pIdx++) {
        const isLastOfSec = pIdx === simpSec.length - 1;
        const isFirstOfSec = pIdx === 0;
        if (isLastOfSec && s < sections.length - 1) {
          // Shared with next section start, skip duplicate
          continue;
        }
        if (isLastOfSec && s === sections.length - 1 && contour.closed) {
          // Closed loop wrap around, skip duplicate first point
          continue;
        }
        // Only mark as corner if it was genuinely identified as a sharp corner from angular detection
        const origCornerIdx = s < cornerIndices.length ? cornerIndices[s] : -1;
        const isActualCorner = (isFirstOfSec && origCornerIdx >= 0 && isCorner[origCornerIdx]);
        simplifiedChain.push({
          point: simpSec[pIdx],
          isCorner: isActualCorner,
        });
      }
    }
    finalSimplifiedPoints = simplifiedChain;
  }

  // Fallback if oversimplified
  if (finalSimplifiedPoints.length < 3 && contour.closed) {
    finalSimplifiedPoints = densePts
      .filter((_: Point, idx: number) => idx % Math.max(1, Math.floor(densePts.length / 8)) === 0)
      .map((p: Point) => ({ point: p, isCorner: false }));
  }

  // 4. Compute balanced, G1-continuous Bézier control tangents for smooth nodes
  const total = finalSimplifiedPoints.length;
  const newNodes: BezierNode[] = finalSimplifiedPoints.map(({ point, isCorner }) => ({
    id: generateId(),
    x: Math.round(point.x),
    y: Math.round(point.y),
    type: isCorner ? 'corner' : 'smooth',
  }));

  for (let i = 0; i < total; i++) {
    const curr = newNodes[i];
    if (curr.type === 'corner') {
      curr.handleIn = null;
      curr.handleOut = null;
      continue;
    }

    const prev = newNodes[(i - 1 + total) % total];
    const next = newNodes[(i + 1) % total];

    // Distances
    const dPrev = Math.hypot(curr.x - prev.x, curr.y - prev.y);
    const dNext = Math.hypot(next.x - curr.x, next.y - curr.y);

    if (dPrev < 0.1 || dNext < 0.1) continue;

    // Chord-weighted unit tangent directions
    const vPrevX = (curr.x - prev.x) / dPrev;
    const vPrevY = (curr.y - prev.y) / dPrev;
    const vNextX = (next.x - curr.x) / dNext;
    const vNextY = (next.y - curr.y) / dNext;

    let tanX = vPrevX + vNextX;
    let tanY = vPrevY + vNextY;
    let tanLen = Math.hypot(tanX, tanY);

    if (tanLen < 0.001) {
      tanX = -vPrevY;
      tanY = vPrevX;
      tanLen = Math.hypot(tanX, tanY) || 1;
    }

    tanX /= tanLen;
    tanY /= tanLen;

    const dot = vPrevX * vNextX + vPrevY * vNextY;
    const cosAngle = Math.max(-1, Math.min(1, dot));
    const cornerDamping = Math.max(0.04, Math.pow((1 + cosAngle) * 0.5, 0.65));
    const handleRatio = 0.35 * cornerDamping;

    // Handle lengths scaled to segment length with curvature damping
    const hInLen = Math.min(dPrev * handleRatio, 110);
    const hOutLen = Math.min(dNext * handleRatio, 110);

    curr.handleIn = {
      x: Math.round(curr.x - tanX * hInLen),
      y: Math.round(curr.y - tanY * hInLen),
    };
    curr.handleOut = {
      x: Math.round(curr.x + tanX * hOutLen),
      y: Math.round(curr.y + tanY * hOutLen),
    };
  }

  const reducedPoints = newNodes.length;
  const reductionPercent = Math.max(
    0,
    Math.round(((originalPoints - reducedPoints) / originalPoints) * 100)
  );

  return {
    contour: {
      ...contour,
      nodes: newNodes,
    },
    originalPoints,
    reducedPoints,
    reductionPercent,
  };
}

/**
 * Smooth an array of PathContours while preserving shape and reducing anchor points
 */
export function smoothContoursPreservingShape(
  contours: PathContour[],
  options: SmoothStrokeOptions = {}
): {
  contours: PathContour[];
  totalOriginalPoints: number;
  totalReducedPoints: number;
  totalReductionPercent: number;
} {
  if (!contours || contours.length === 0) {
    return {
      contours: [],
      totalOriginalPoints: 0,
      totalReducedPoints: 0,
      totalReductionPercent: 0,
    };
  }

  let totalOrig = 0;
  let totalRed = 0;

  const smoothed = contours.map((c) => {
    const res = smoothStrokeContour(c, options);
    totalOrig += res.originalPoints;
    totalRed += res.reducedPoints;
    return res.contour;
  });

  const totalReductionPercent =
    totalOrig > 0 ? Math.max(0, Math.round(((totalOrig - totalRed) / totalOrig) * 100)) : 0;

  return {
    contours: smoothed,
    totalOriginalPoints: totalOrig,
    totalReducedPoints: totalRed,
    totalReductionPercent,
  };
}

/**
 * Convert all nodes of a contour into sharp corner vertices (removes bezier handles)
 */
export function convertContourToCorners(contour: PathContour): PathContour {
  return {
    ...contour,
    nodes: contour.nodes.map((node) => ({
      ...node,
      type: 'corner',
      handleIn: null,
      handleOut: null,
    })),
  };
}

/**
 * Convert all nodes of a contour into smooth bezier curves with computed tangent handles
 */
export function convertContourToSmooth(contour: PathContour): PathContour {
  const nodes = [...contour.nodes];
  const total = nodes.length;
  if (total < 2) return contour;

  const newNodes = nodes.map((n) => ({
    ...n,
    type: 'smooth' as const,
  }));

  for (let i = 0; i < total; i++) {
    const prev = newNodes[(i - 1 + total) % total];
    const curr = newNodes[i];
    const next = newNodes[(i + 1) % total];

    const vx = (next.x - prev.x) * 0.28;
    const vy = (next.y - prev.y) * 0.28;

    curr.handleIn = { x: Math.round(curr.x - vx), y: Math.round(curr.y - vy) };
    curr.handleOut = { x: Math.round(curr.x + vx), y: Math.round(curr.y + vy) };
  }

  return {
    ...contour,
    nodes: newNodes,
  };
}

/**
 * カクカク角筆（sharp / polygon）専用の幾何学的アウトライン生成
 * 手書きの微小なブレや不要な曲率を力強い直線セグメントに集約し、
 * マイター角（Miter Joint）とスクエアキャップで構成される鮮明な角ばり多角形輪郭を生成
 */
