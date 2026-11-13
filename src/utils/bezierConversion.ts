import { Point, BezierNode, PathContour } from '../types';
import { generateId } from './path';

/**
 * 2次ベジェ曲線 (Quadratic Bezier: TrueType) と 3次ベジェ曲線 (Cubic Bezier: PostScript/OpenType) の相互変換
 */

/**
 * 2次ベジェ曲線を3次ベジェ曲線へ厳密に次数引き上げ (Degree Elevation)
 * 数学的に完全無損失 (誤差 0)
 */
export function quadraticToCubic(
  p0: Point,
  q: Point,
  p2: Point
): { c1: Point; c2: Point } {
  return {
    c1: {
      x: p0.x + (2 / 3) * (q.x - p0.x),
      y: p0.y + (2 / 3) * (q.y - p0.y),
    },
    c2: {
      x: p2.x + (2 / 3) * (q.x - p2.x),
      y: p2.y + (2 / 3) * (q.y - p2.y),
    },
  };
}

/**
 * 3次ベジェ曲線を2つに再帰分割 (De Casteljau's algorithm at t = 0.5)
 */
export function splitCubicAtHalf(
  p0: Point,
  c1: Point,
  c2: Point,
  p3: Point
): [
  { p0: Point; c1: Point; c2: Point; p3: Point },
  { p0: Point; c1: Point; c2: Point; p3: Point }
] {
  const p01 = { x: (p0.x + c1.x) / 2, y: (p0.y + c1.y) / 2 };
  const p12 = { x: (c1.x + c2.x) / 2, y: (c1.y + c2.y) / 2 };
  const p23 = { x: (c2.x + p3.x) / 2, y: (c2.y + p3.y) / 2 };

  const p012 = { x: (p01.x + p12.x) / 2, y: (p01.y + p12.y) / 2 };
  const p123 = { x: (p12.x + p23.x) / 2, y: (p12.y + p23.y) / 2 };

  const p0123 = { x: (p012.x + p123.x) / 2, y: (p012.y + p123.y) / 2 };

  return [
    { p0, c1: p01, c2: p012, p3: p0123 },
    { p0: p0123, c1: p123, c2: p23, p3 },
  ];
}

/**
 * 3次ベジェ曲線を2次ベジェ曲線列へ最適分割近似 (Cubic to Quadratic Subdivision)
 * TrueType (TTEdit) のフォント規格に適合
 */
export function cubicToQuadratics(
  p0: Point,
  c1: Point,
  c2: Point,
  p3: Point,
  tolerance = 1.0,
  maxDepth = 6
): Array<{ p0: Point; q: Point; p2: Point }> {
  // 1. 直線判定（制御点が両端点にほぼ一致している場合）
  const d1 = Math.hypot(c1.x - p0.x, c1.y - p0.y);
  const d2 = Math.hypot(c2.x - p3.x, c2.y - p3.y);
  if (d1 < 0.1 && d2 < 0.1) {
    const mid = { x: (p0.x + p3.x) / 2, y: (p0.y + p3.y) / 2 };
    return [{ p0, q: mid, p2: p3 }];
  }

  // 2. 1本の2次ベジェで近似できるか評価
  // Q の推定: Q = (3 * (C1 + C2) - (P0 + P3)) / 4
  const qEst: Point = {
    x: (3 * (c1.x + c2.x) - (p0.x + p3.x)) / 4,
    y: (3 * (c1.y + c2.y) - (p0.y + p3.y)) / 4,
  };

  // 3次ベジェ B3(t) と Q = qEst を用いた2次ベジェ B2(t) の差は
  // 厳密に E * t * (t - 0.5) * (t - 1) となり、最大誤差は |E| / (12 * sqrt(3))
  const ex = p3.x - 3 * c2.x + 3 * c1.x - p0.x;
  const ey = p3.y - 3 * c2.y + 3 * c1.y - p0.y;
  const maxError = Math.hypot(ex, ey) / (12 * Math.sqrt(3));

  if (maxError <= tolerance || maxDepth <= 0) {
    return [{ p0, q: qEst, p2: p3 }];
  }

  // 許容誤差を超える場合は半分に分割して再帰近似
  const [left, right] = splitCubicAtHalf(p0, c1, c2, p3);
  const leftQuads = cubicToQuadratics(left.p0, left.c1, left.c2, left.p3, tolerance, maxDepth - 1);
  const rightQuads = cubicToQuadratics(right.p0, right.c1, right.c2, right.p3, tolerance, maxDepth - 1);
  return [...leftQuads, ...rightQuads];
}

/**
 * 輪郭（PathContour）全体を TrueType 2次ベジェ形式へ変換
 * 各2次ベジェセグメントを、OpenType/SVG互換のハンドル表現へマッピング
 */
export function convertContourToQuadratic(
  contour: PathContour,
  tolerance = 1.0
): PathContour {
  if (!contour || !contour.nodes || contour.nodes.length < 2) return contour;

  const originalNodes = contour.nodes;
  const newNodes: BezierNode[] = [];
  const count = originalNodes.length;

  for (let i = 0; i < count; i++) {
    const isLast = i === count - 1;
    if (isLast && !contour.closed) {
      break;
    }

    const currNode = originalNodes[i];
    const nextNode = isLast ? originalNodes[0] : originalNodes[i + 1];

    const p0: Point = { x: currNode.x, y: currNode.y };
    const p3: Point = { x: nextNode.x, y: nextNode.y };
    const c1: Point = currNode.handleOut || p0;
    const c2: Point = nextNode.handleIn ? nextNode.handleIn : p3;

    // 3次から2次へ分割近似
    const quads = cubicToQuadratics(p0, c1, c2, p3, tolerance);

    if (i === 0) {
      // 始点
      const firstQuad = quads[0];
      const cubicHandles = quadraticToCubic(firstQuad.p0, firstQuad.q, firstQuad.p2);
      newNodes.push({
        id: generateId(),
        x: p0.x,
        y: p0.y,
        handleIn: currNode.handleIn ? { ...currNode.handleIn } : null,
        handleOut: cubicHandles.c1,
        type: 'smooth',
      });
    }

    // 中間分割点群を追加
    for (let k = 0; k < quads.length; k++) {
      const qSeg = quads[k];
      const cubicHandles = quadraticToCubic(qSeg.p0, qSeg.q, qSeg.p2);

      // 直前ノードの handleOut を設定
      if (newNodes.length > 0) {
        newNodes[newNodes.length - 1].handleOut = cubicHandles.c1;
      }

      if (k === quads.length - 1) {
        // セグメント終点
        if (!isLast || !contour.closed) {
          newNodes.push({
            id: generateId(),
            x: p3.x,
            y: p3.y,
            handleIn: cubicHandles.c2,
            handleOut: nextNode.handleOut ? { ...nextNode.handleOut } : null,
            type: nextNode.type || 'smooth',
          });
        } else {
          // 閉曲線の先頭ノードの handleIn を更新
          newNodes[0].handleIn = cubicHandles.c2;
        }
      } else {
        // 分割点
        newNodes.push({
          id: generateId(),
          x: qSeg.p2.x,
          y: qSeg.p2.y,
          handleIn: cubicHandles.c2,
          handleOut: null,
          type: 'smooth',
        });
      }
    }
  }

  return {
    ...contour,
    id: generateId(),
    nodes: newNodes.length > 0 ? newNodes : originalNodes,
  };
}

/**
 * 2本の連続する3次ベジェセグメント (P0->P1->P2) を1本の3次ベジェに統合近似できるか評価し、
 * 許容誤差内であれば統合したハンドル (c1, c2) を返す
 */
function tryMergeCubicPair(
  p0: Point,
  c1Left: Point,
  c2Left: Point,
  pMid: Point,
  c1Right: Point,
  c2Right: Point,
  p2: Point,
  tolerance = 1.5
): { c1: Point; c2: Point } | null {
  // 中間点での接線方向が連続しているか確認
  const inDx = pMid.x - c2Left.x;
  const inDy = pMid.y - c2Left.y;
  const outDx = c1Right.x - pMid.x;
  const outDy = c1Right.y - pMid.y;
  const inLen = Math.hypot(inDx, inDy);
  const outLen = Math.hypot(outDx, outDy);

  if (inLen < 0.01 || outLen < 0.01) return null;
  const dot = (inDx * outDx + inDy * outDy) / (inLen * outLen);
  // 角度差が大きい角点（コーナー）は統合しない
  if (dot < 0.96) return null;

  // 2つのセグメントのハンドルを2倍に延長して1本の3次ベジェの候補ハンドルを算出
  const c1: Point = {
    x: p0.x + 2 * (c1Left.x - p0.x),
    y: p0.y + 2 * (c1Left.y - p0.y),
  };
  const c2: Point = {
    x: p2.x + 2 * (c2Right.x - p2.x),
    y: p2.y + 2 * (c2Right.y - p2.y),
  };

  // t=0.5 での誤差チェック
  const mergedMid: Point = {
    x: (p0.x + 3 * c1.x + 3 * c2.x + p2.x) / 8,
    y: (p0.y + 3 * c1.y + 3 * c2.y + p2.y) / 8,
  };
  const err = Math.hypot(mergedMid.x - pMid.x, mergedMid.y - pMid.y);
  if (err <= tolerance) {
    return { c1, c2 };
  }
  return null;
}

/**
 * 輪郭（PathContour）全体を PostScript 3次ベジェ形式（滑らかな最小アンカー表現）へ再統合
 */
export function convertContourToCubic(contour: PathContour, tolerance = 1.5): PathContour {
  if (!contour || !contour.nodes || contour.nodes.length < 3) return contour;

  let nodes: BezierNode[] = contour.nodes.map((n) => ({
    ...n,
    id: generateId(),
    handleIn: n.handleIn ? { ...n.handleIn } : null,
    handleOut: n.handleOut ? { ...n.handleOut } : null,
  }));

  // 反復的に統合可能な中間ノードを3次ベジェへマージ
  let changed = true;
  let pass = 0;
  while (changed && nodes.length >= 3 && pass < 6) {
    changed = false;
    pass++;
    let i = 0;
    while (i < nodes.length && nodes.length >= 3) {
      const nextIdx = (i + 1) % nodes.length;
      const afterIdx = (i + 2) % nodes.length;

      // 開いたパスの終端を跨ぐ統合はスキップ
      if (!contour.closed && (i >= nodes.length - 2)) {
        break;
      }

      const n0 = nodes[i];
      const nMid = nodes[nextIdx];
      const n2 = nodes[afterIdx];

      const p0 = { x: n0.x, y: n0.y };
      const c1L = n0.handleOut || p0;
      const pMid = { x: nMid.x, y: nMid.y };
      const c2L = nMid.handleIn || pMid;
      const c1R = nMid.handleOut || pMid;
      const p2 = { x: n2.x, y: n2.y };
      const c2R = n2.handleIn || p2;

      const merged = tryMergeCubicPair(p0, c1L, c2L, pMid, c1R, c2R, p2, tolerance);
      if (merged) {
        n0.handleOut = merged.c1;
        n2.handleIn = merged.c2;
        nodes.splice(nextIdx, 1);
        changed = true;
        // 同じ位置からさらに統合できるか再評価しないよう1つ進める
        i++;
      } else {
        i++;
      }
    }
  }

  return {
    ...contour,
    id: generateId(),
    nodes,
  };
}
