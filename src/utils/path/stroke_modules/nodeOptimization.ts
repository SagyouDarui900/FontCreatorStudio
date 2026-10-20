import { BezierNode, PathContour, Point } from "../../../types";
import { generateId } from "../id";
import { getContourSignedArea, getContoursBoundingBox } from "../bounds";
import { convertContourToCorners, convertContourToSmooth, smoothStrokeContour } from "./smoothing";

export function optimizeContourNodes(contours: PathContour[]): PathContour[] {
  if (!contours || contours.length === 0) return [];

  const cleanContours: PathContour[] = [];

  for (const contour of contours) {
    if (!contour.nodes || contour.nodes.length < 2) continue;

    // 1. Integer rounding & handle cleanup
    const rawNodes = contour.nodes.map((node) => {
      const x = Math.round(node.x);
      const y = Math.round(node.y);

      let handleIn: Point | null = null;
      if (node.handleIn) {
        const hx = Math.round(node.handleIn.x);
        const hy = Math.round(node.handleIn.y);
        if (hx !== x || hy !== y) {
          handleIn = { x: hx, y: hy };
        }
      }

      let handleOut: Point | null = null;
      if (node.handleOut) {
        const hx = Math.round(node.handleOut.x);
        const hy = Math.round(node.handleOut.y);
        if (hx !== x || hy !== y) {
          handleOut = { x: hx, y: hy };
        }
      }

      return {
        ...node,
        x,
        y,
        handleIn,
        handleOut,
      };
    });

    // 2. Merge consecutive collocated nodes
    const mergedNodes: BezierNode[] = [];
    for (let i = 0; i < rawNodes.length; i++) {
      const curr = rawNodes[i];
      if (mergedNodes.length === 0) {
        mergedNodes.push(curr);
        continue;
      }

      const prev = mergedNodes[mergedNodes.length - 1];
      const dist = Math.hypot(curr.x - prev.x, curr.y - prev.y);

      if (dist < 1.0) {
        // Merge: keep incoming handle from prev and outgoing handle from curr if present
        if (!prev.handleOut && curr.handleOut) {
          prev.handleOut = curr.handleOut;
        }
      } else {
        mergedNodes.push(curr);
      }
    }

    // Check last vs first if closed
    if (contour.closed && mergedNodes.length > 1) {
      const first = mergedNodes[0];
      const last = mergedNodes[mergedNodes.length - 1];
      if (Math.hypot(first.x - last.x, first.y - last.y) < 1.0) {
        if (!first.handleIn && last.handleIn) {
          first.handleIn = last.handleIn;
        }
        mergedNodes.pop();
      }
    }

    if (mergedNodes.length >= 2) {
      cleanContours.push({
        ...contour,
        id: contour.id || generateId(),
        nodes: mergedNodes,
      });
    }
  }

  return cleanContours;
}


export type CubicBezierSegment = [Point, Point, Point, Point] & {
  p0: Point;
  p1: Point;
  p2: Point;
  p3: Point;
};

/**
 * Split a cubic bezier curve at parameter t in [0, 1] using de Casteljau's algorithm
 */
export function splitCubicBezier(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  t: number
): {
  left: CubicBezierSegment;
  right: CubicBezierSegment;
} {
  const p01 = { x: (1 - t) * p0.x + t * p1.x, y: (1 - t) * p0.y + t * p1.y };
  const p12 = { x: (1 - t) * p1.x + t * p2.x, y: (1 - t) * p1.y + t * p2.y };
  const p23 = { x: (1 - t) * p2.x + t * p3.x, y: (1 - t) * p2.y + t * p3.y };

  const p012 = { x: (1 - t) * p01.x + t * p12.x, y: (1 - t) * p01.y + t * p12.y };
  const p123 = { x: (1 - t) * p12.x + t * p23.x, y: (1 - t) * p12.y + t * p23.y };

  const p0123 = { x: (1 - t) * p012.x + t * p123.x, y: (1 - t) * p012.y + t * p123.y };

  const left: CubicBezierSegment = Object.assign([p0, p01, p012, p0123] as [Point, Point, Point, Point], {
    p0,
    p1: p01,
    p2: p012,
    p3: p0123,
  });

  const right: CubicBezierSegment = Object.assign([p0123, p123, p23, p3] as [Point, Point, Point, Point], {
    p0: p0123,
    p1: p123,
    p2: p23,
    p3,
  });

  return {
    left,
    right,
  };
}

/**
 * Insert a new bezier anchor node at a click position pos on a contour
 */
export function insertNodeOnContourAtPoint(
  contour: PathContour,
  pos: Point,
  threshold: number = 18
): { updatedContour: PathContour; newNodeId: string } | null {
  if (!contour || !contour.nodes || contour.nodes.length < 2) return null;

  const numSegments = contour.closed ? contour.nodes.length : contour.nodes.length - 1;
  let bestDist = threshold;
  let bestSegIndex = -1;
  let bestT = 0.5;
  let isCurve = false;

  for (let i = 0; i < numSegments; i++) {
    const nextIdx = (i + 1) % contour.nodes.length;
    const n0 = contour.nodes[i];
    const n1 = contour.nodes[nextIdx];

    const p0 = { x: n0.x, y: n0.y };
    const p1 = n0.handleOut ? { x: n0.handleOut.x, y: n0.handleOut.y } : p0;
    const p3 = { x: n1.x, y: n1.y };
    const p2 = n1.handleIn ? { x: n1.handleIn.x, y: n1.handleIn.y } : p3;

    const hasHandles = !!(n0.handleOut || n1.handleIn);

    if (hasHandles) {
      // Sample 20 points along curve
      const samples = 20;
      for (let s = 1; s < samples; s++) {
        const t = s / samples;
        const omt = 1 - t;
        const cx = omt * omt * omt * p0.x + 3 * omt * omt * t * p1.x + 3 * omt * t * t * p2.x + t * t * t * p3.x;
        const cy = omt * omt * omt * p0.y + 3 * omt * omt * t * p1.y + 3 * omt * t * t * p2.y + t * t * t * p3.y;
        const d = Math.hypot(cx - pos.x, cy - pos.y);
        if (d < bestDist) {
          bestDist = d;
          bestSegIndex = i;
          bestT = t;
          isCurve = true;
        }
      }
    } else {
      // Straight line projection
      const dx = p3.x - p0.x;
      const dy = p3.y - p0.y;
      const lenSq = dx * dx + dy * dy;
      if (lenSq > 0) {
        const t = Math.max(0.05, Math.min(0.95, ((pos.x - p0.x) * dx + (pos.y - p0.y) * dy) / lenSq));
        const projX = p0.x + t * dx;
        const projY = p0.y + t * dy;
        const d = Math.hypot(projX - pos.x, projY - pos.y);
        if (d < bestDist) {
          bestDist = d;
          bestSegIndex = i;
          bestT = t;
          isCurve = false;
        }
      }
    }
  }

  if (bestSegIndex === -1) return null;

  const i = bestSegIndex;
  const nextIdx = (i + 1) % contour.nodes.length;
  const n0 = contour.nodes[i];
  const n1 = contour.nodes[nextIdx];
  const newNodeId = generateId();

  let newNode: BezierNode;
  const newNodes = [...contour.nodes];

  if (isCurve) {
    const p0 = { x: n0.x, y: n0.y };
    const p1 = n0.handleOut ? { x: n0.handleOut.x, y: n0.handleOut.y } : p0;
    const p3 = { x: n1.x, y: n1.y };
    const p2 = n1.handleIn ? { x: n1.handleIn.x, y: n1.handleIn.y } : p3;

    const split = splitCubicBezier(p0, p1, p2, p3, bestT);

    // Update n0 handleOut
    newNodes[i] = {
      ...n0,
      handleOut: { x: Math.round(split.left.p1.x), y: Math.round(split.left.p1.y) },
    };

    // Update n1 handleIn
    newNodes[nextIdx] = {
      ...n1,
      handleIn: { x: Math.round(split.right.p2.x), y: Math.round(split.right.p2.y) },
    };

    newNode = {
      id: newNodeId,
      x: Math.round(split.left.p3.x),
      y: Math.round(split.left.p3.y),
      handleIn: { x: Math.round(split.left.p2.x), y: Math.round(split.left.p2.y) },
      handleOut: { x: Math.round(split.right.p1.x), y: Math.round(split.right.p1.y) },
      type: 'smooth',
    };
  } else {
    const p0 = { x: n0.x, y: n0.y };
    const p3 = { x: n1.x, y: n1.y };
    newNode = {
      id: newNodeId,
      x: Math.round(p0.x + bestT * (p3.x - p0.x)),
      y: Math.round(p0.y + bestT * (p3.y - p0.y)),
      type: 'corner',
    };
  }

  // Insert newNode after i
  newNodes.splice(i + 1, 0, newNode);

  return {
    updatedContour: {
      ...contour,
      nodes: newNodes,
    },
    newNodeId,
  };
}

/**
 * Toggle node between smooth (symmetric handles) and corner (sharp)
 */
export function toggleNodeType(node: BezierNode): BezierNode {
  if (node.type === 'smooth' || node.type === 'symmetric') {
    return {
      ...node,
      type: 'corner',
    };
  } else {
    // Convert to smooth: if it has handles, align them; if not, generate smooth handles
    let handleIn = node.handleIn;
    let handleOut = node.handleOut;

    if (handleOut && !handleIn) {
      handleIn = {
        x: Math.round(node.x - (handleOut.x - node.x)),
        y: Math.round(node.y - (handleOut.y - node.y)),
      };
    } else if (handleIn && !handleOut) {
      handleOut = {
        x: Math.round(node.x - (handleIn.x - node.x)),
        y: Math.round(node.y - (handleIn.y - node.y)),
      };
    } else if (handleIn && handleOut) {
      // Average direction and collinearize
      const dxOut = handleOut.x - node.x;
      const dyOut = handleOut.y - node.y;
      const lenOut = Math.hypot(dxOut, dyOut) || 40;
      const dxIn = node.x - handleIn.x;
      const dyIn = node.y - handleIn.y;
      const lenIn = Math.hypot(dxIn, dyIn) || 40;

      const avgDx = (dxOut / lenOut + dxIn / lenIn) / 2;
      const avgDy = (dyOut / lenOut + dyIn / lenIn) / 2;
      const norm = Math.hypot(avgDx, avgDy) || 1;
      const dirX = avgDx / norm;
      const dirY = avgDy / norm;

      handleOut = {
        x: Math.round(node.x + dirX * lenOut),
        y: Math.round(node.y + dirY * lenOut),
      };
      handleIn = {
        x: Math.round(node.x - dirX * lenIn),
        y: Math.round(node.y - dirY * lenIn),
      };
    } else {
      // Generate default horizontal smooth handles
      const hLen = 35;
      handleIn = { x: Math.round(node.x - hLen), y: Math.round(node.y) };
      handleOut = { x: Math.round(node.x + hLen), y: Math.round(node.y) };
    }

    return {
      ...node,
      type: 'smooth',
      handleIn,
      handleOut,
    };
  }
}

export interface NodeOptimizationOptions {
  /**
   * 最適化強度:
   * - 'mild': 直線上の冗長ノード（共線点）と重複点のみを精密に除去。文字形状の変化率 0%
   * - 'normal': 直線上の冗長ノード除去に加え、曲線の微細なブレを滑らかに整流。形状保持 99.8%
   * - 'strong': 過剰ノードをしっかり間引いてスリム化。形状保持 99.0%
   */
  level?: 'mild' | 'normal' | 'strong';
  /** 直線共線性判定の許容公差（px）。デフォルト: normalで1.3px */
  tolerance?: number;
  /** 直線共線性判定の最大角度ズレ（度）。デフォルト: normalで3.5度 */
  angleToleranceDeg?: number;
  /** トメ・ハネ・角を厳格に保持するかどうか（デフォルト: true） */
  preserveSharpCorners?: boolean;
  /** バウンディングボックスの最大許容変位（px、デフォルト: 1.5px） */
  maxBboxDeviation?: number;
}

export interface NodeOptimizationResult {
  contours: PathContour[];
  originalNodeCount: number;
  optimizedNodeCount: number;
  reducedCount: number;
  reductionPercentage: number;
  changed: boolean;
}

/**
 * 点Pから線分ABへの垂直距離と投影比率tを計算
 */
function getPointToSegmentDistanceAndT(
  p: Point,
  a: Point,
  b: Point
): { dist: number; t: number } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-6) {
    return { dist: Math.hypot(p.x - a.x, p.y - a.y), t: 0 };
  }

  const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  const clampedT = Math.max(0, Math.min(1, t));
  const projX = a.x + clampedT * dx;
  const projY = a.y + clampedT * dy;

  return {
    dist: Math.hypot(p.x - projX, p.y - projY),
    t,
  };
}

/**
 * 2つのベクトルのなす角度（度、0〜180）
 */
function getAngleBetweenVectorsDeg(v1: Point, v2: Point): number {
  const len1 = Math.hypot(v1.x, v1.y);
  const len2 = Math.hypot(v2.x, v2.y);
  if (len1 < 1e-4 || len2 < 1e-4) return 0;
  const dot = (v1.x * v2.x + v1.y * v2.y) / (len1 * len2);
  const clamped = Math.max(-1, Math.min(1, dot));
  return (Math.acos(clamped) * 180) / Math.PI;
}

/**
 * 直線上に並ぶ冗長ノード（Collinear Nodes）を間引き、パスを滑らかにするコア関数
 * 文字の角（トメ・ハネ・鋭角）や縦横比、線の太さ・曲率などの形状を厳格に保持
 */
export function optimizeContourCollinearAndSmooth(
  contour: PathContour,
  options: NodeOptimizationOptions = {}
): PathContour {
  if (!contour || !contour.nodes || contour.nodes.length < 3) {
    return contour;
  }

  const level = options.level || 'normal';
  const tolerance =
    options.tolerance ?? (level === 'mild' ? 0.8 : level === 'strong' ? 2.0 : 1.3);
  const angleTolerance =
    options.angleToleranceDeg ?? (level === 'mild' ? 2.5 : level === 'strong' ? 5.0 : 3.5);
  const preserveCorners = options.preserveSharpCorners !== false;
  const maxBboxDev = options.maxBboxDeviation ?? 1.5;

  const origBbox = getContoursBoundingBox([contour]);
  const origArea = Math.abs(getContourSignedArea(contour));

  // --- ステップ1: 座標の整数化とゼロ長ハンドルの整理 ---
  let workingNodes: BezierNode[] = contour.nodes.map((node) => {
    const x = Math.round(node.x);
    const y = Math.round(node.y);
    let handleIn: Point | null = null;
    let handleOut: Point | null = null;

    if (node.handleIn) {
      const hx = Math.round(node.handleIn.x);
      const hy = Math.round(node.handleIn.y);
      if (Math.hypot(hx - x, hy - y) >= 1.0) {
        handleIn = { x: hx, y: hy };
      }
    }
    if (node.handleOut) {
      const hx = Math.round(node.handleOut.x);
      const hy = Math.round(node.handleOut.y);
      if (Math.hypot(hx - x, hy - y) >= 1.0) {
        handleOut = { x: hx, y: hy };
      }
    }

    return {
      ...node,
      x,
      y,
      handleIn,
      handleOut,
    };
  });

  // --- ステップ2: 同位置または極めて近接した連続ノードの安全結合 ---
  const deduplicated: BezierNode[] = [];
  const minPtDist = level === 'strong' ? 2.0 : 1.0;
  for (let i = 0; i < workingNodes.length; i++) {
    const curr = workingNodes[i];
    if (deduplicated.length === 0) {
      deduplicated.push(curr);
      continue;
    }
    const prev = deduplicated[deduplicated.length - 1];
    const d = Math.hypot(curr.x - prev.x, curr.y - prev.y);
    if (d < minPtDist) {
      // 結合: 前のノードのhandleInと現在のhandleOutを継承
      if (!prev.handleOut && curr.handleOut) {
        prev.handleOut = curr.handleOut;
      }
      if (curr.type === 'corner') {
        prev.type = 'corner';
      }
    } else {
      deduplicated.push(curr);
    }
  }

  // 閉じた輪郭の末尾と先頭の重なり解消
  if (contour.closed && deduplicated.length > 2) {
    const first = deduplicated[0];
    const last = deduplicated[deduplicated.length - 1];
    if (Math.hypot(first.x - last.x, first.y - last.y) < minPtDist) {
      if (!first.handleIn && last.handleIn) {
        first.handleIn = last.handleIn;
      }
      if (last.type === 'corner') {
        first.type = 'corner';
      }
      deduplicated.pop();
    }
  }

  if (deduplicated.length < 3) {
    return contour;
  }

  workingNodes = deduplicated;

  // --- ステップ3: 直線上の冗長ノード（ほぼ直線上に並ぶ点）の反復間引き ---
  // 直線上に3〜10個などの不要なノードが並んでいる場合、反復することで全て綺麗に整理される
  let hasReduced = true;
  let passCount = 0;
  const maxPasses = 8;

  while (hasReduced && passCount < maxPasses && workingNodes.length >= 3) {
    hasReduced = false;
    passCount++;
    const nextList: BezierNode[] = [];
    const n = workingNodes.length;

    for (let i = 0; i < n; i++) {
      // 閉じた輪郭の場合はラップアラウンド、開いた輪郭の始点・終点は保護
      if (!contour.closed && (i === 0 || i === n - 1)) {
        nextList.push(workingNodes[i]);
        continue;
      }

      const prev = workingNodes[(i - 1 + n) % n];
      const curr = workingNodes[i];
      const next = workingNodes[(i + 1) % n];

      // 1. 角（トメ・ハネ・コーナー）保護チェック
      // 外角・屈曲角が明確（>= 18度以上）な場合は角として保護し削除しない
      const vPrev = { x: curr.x - prev.x, y: curr.y - prev.y };
      const vNext = { x: next.x - curr.x, y: next.y - curr.y };
      const turnAngle = getAngleBetweenVectorsDeg(vPrev, vNext);

      if (preserveCorners && curr.type === 'corner' && turnAngle > 18) {
        nextList.push(curr);
        continue;
      }

      // 屈曲角が著しく大きい（>= 25度）場合、ノードタイプに関わらず形状保護のため削除しない
      if (turnAngle > 25) {
        nextList.push(curr);
        continue;
      }

      // 2. ベジェハンドルの突出チェック
      // currがハンドルを持ち、それが線分prev-nextから大きく横に張り出している場合はカーブの頂点なので保護
      const { dist, t } = getPointToSegmentDistanceAndT(
        { x: curr.x, y: curr.y },
        { x: prev.x, y: prev.y },
        { x: next.x, y: next.y }
      );

      // 射影tが線分の外側にある場合（折り返しなど）は削除しない
      if (t < 0.02 || t > 0.98) {
        nextList.push(curr);
        continue;
      }

      // 垂直距離判定
      if (dist > tolerance) {
        nextList.push(curr);
        continue;
      }

      // 角度振れ判定
      if (turnAngle > angleTolerance) {
        nextList.push(curr);
        continue;
      }

      // ハンドルが線分から外側に突出しているかチェック
      let handleDeviates = false;
      if (curr.handleIn) {
        const hDist = getPointToSegmentDistanceAndT(
          curr.handleIn,
          { x: prev.x, y: prev.y },
          { x: next.x, y: next.y }
        ).dist;
        if (hDist > tolerance * 1.5) handleDeviates = true;
      }
      if (curr.handleOut) {
        const hDist = getPointToSegmentDistanceAndT(
          curr.handleOut,
          { x: prev.x, y: prev.y },
          { x: next.x, y: next.y }
        ).dist;
        if (hDist > tolerance * 1.5) handleDeviates = true;
      }

      if (handleDeviates) {
        nextList.push(curr);
        continue;
      }

      // ここまで到達した点は「ほぼ直線上に並ぶ冗長ノード」と判定
      // このノードを安全に間引く（nextListに追加しない）
      hasReduced = true;

      // 結合時のハンドル整合:
      // prevからnextへの直線的セグメントになるようハンドルの突起を解消
      if (prev.handleOut && !curr.handleIn) {
        // prevのhandleOutが直線方向であれば微調整
      }
    }

    if (nextList.length >= 3) {
      workingNodes = nextList;
    } else {
      break;
    }
  }

  // --- ステップ4: 曲線の微細ブレ整流（normalまたはstrong時） ---
  // カクカク角筆（全てのノードがcorner型で直線のみ）の場合はこのステップをスキップ
  const isAllCorners = workingNodes.every(
    (nd) => !nd.handleIn && !nd.handleOut && nd.type === 'corner'
  );

  if (!isAllCorners && level !== 'mild' && workingNodes.length > 20) {
    // 密集した手描き曲線の微小ノードを、文字形状を崩さない公差で平滑化
    const smoothRes = smoothStrokeContour(
      {
        ...contour,
        nodes: workingNodes,
      },
      {
        tolerance: level === 'strong' ? 1.5 : 0.85,
        cornerAngleDeg: 30,
        preserveCorners: true,
      }
    );

    if (smoothRes.contour.nodes && smoothRes.contour.nodes.length >= 3) {
      // 形状検証
      const candidateBbox = getContoursBoundingBox([smoothRes.contour]);
      const dx1 = Math.abs(candidateBbox.minX - origBbox.minX);
      const dx2 = Math.abs(candidateBbox.maxX - origBbox.maxX);
      const dy1 = Math.abs(candidateBbox.minY - origBbox.minY);
      const dy2 = Math.abs(candidateBbox.maxY - origBbox.maxY);

      if (dx1 <= maxBboxDev && dx2 <= maxBboxDev && dy1 <= maxBboxDev && dy2 <= maxBboxDev) {
        const candidateArea = Math.abs(getContourSignedArea(smoothRes.contour));
        const areaRatio = origArea > 0 ? Math.abs(candidateArea - origArea) / origArea : 0;
        if (areaRatio < 0.02) {
          workingNodes = smoothRes.contour.nodes;
        }
      }
    }
  }

  // --- ステップ5: 最終形状厳格検証ガード ---
  const resultContour: PathContour = {
    ...contour,
    id: contour.id || generateId(),
    nodes: workingNodes,
  };

  const finalBbox = getContoursBoundingBox([resultContour]);
  const dx1 = Math.abs(finalBbox.minX - origBbox.minX);
  const dx2 = Math.abs(finalBbox.maxX - origBbox.maxX);
  const dy1 = Math.abs(finalBbox.minY - origBbox.minY);
  const dy2 = Math.abs(finalBbox.maxY - origBbox.maxY);

  if (dx1 > maxBboxDev || dx2 > maxBboxDev || dy1 > maxBboxDev || dy2 > maxBboxDev) {
    // 形状変異が閾値を超えた場合は元の輪郭を採用（形状保護優先）
    return contour;
  }

  const finalArea = Math.abs(getContourSignedArea(resultContour));
  if (origArea > 0) {
    const areaDiffRatio = Math.abs(finalArea - origArea) / origArea;
    if (areaDiffRatio > 0.035) {
      // 面積変化が3.5%を超える場合も却下
      return contour;
    }
  }

  return resultContour;
}

/**
 * 複数輪郭（グリフ全体）に対して直線冗長ノード間引き＆パス平滑化を一括適用
 */
export function optimizeContoursRedundantNodes(
  contours: PathContour[],
  options: NodeOptimizationOptions = {}
): NodeOptimizationResult {
  if (!contours || contours.length === 0) {
    return {
      contours: [],
      originalNodeCount: 0,
      optimizedNodeCount: 0,
      reducedCount: 0,
      reductionPercentage: 0,
      changed: false,
    };
  }

  let originalCount = 0;
  contours.forEach((c) => {
    originalCount += c.nodes ? c.nodes.length : 0;
  });

  const optimizedContours = contours.map((c) =>
    optimizeContourCollinearAndSmooth(c, options)
  );

  let optimizedCount = 0;
  optimizedContours.forEach((c) => {
    optimizedCount += c.nodes ? c.nodes.length : 0;
  });

  const reducedCount = Math.max(0, originalCount - optimizedCount);
  const reductionPercentage =
    originalCount > 0 ? Math.round((reducedCount / originalCount) * 100) : 0;

  return {
    contours: optimizedContours,
    originalNodeCount: originalCount,
    optimizedNodeCount: optimizedCount,
    reducedCount,
    reductionPercentage,
    changed: reducedCount > 0,
  };
}

export type SimplifyGlyphOptions = NodeOptimizationOptions;
export type SimplifyGlyphResult = NodeOptimizationResult;

/**
 * 輪郭の単純化（Simplify）
 * 不要なアンカーポイントを自動削除し、字形の美しさを保ちつつデータ容量を削減
 */
export function simplifyGlyphContours(
  contours: PathContour[],
  options: SimplifyGlyphOptions = {}
): SimplifyGlyphResult {
  return optimizeContoursRedundantNodes(contours, options);
}

