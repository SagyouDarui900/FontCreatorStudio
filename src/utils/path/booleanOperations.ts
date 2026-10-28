import {
  BezierNode,
  PathContour,
  Point,
} from "../../types";
import {
  booleanUnionContours,
  booleanSubtractContours,
  booleanIntersectContours,
} from "../vectorBoolean";
import { generateId } from "./id";
import { contoursToSvgPath } from "./svg";
import {
  getContoursBoundingBox,
  isPointInContour,
  normalizeGlyphContoursWinding,
  sampleContourPoints,
} from "./bounds";
import { rdpSimplify } from "../imageVectorizer";

export function getLineSegmentIntersection(
  p1: Point,
  p2: Point,
  p3: Point,
  p4: Point
): Point | null {
  const dx1 = p2.x - p1.x;
  const dy1 = p2.y - p1.y;
  const dx2 = p4.x - p3.x;
  const dy2 = p4.y - p3.y;

  const det = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(det) < 1e-6) return null; // 平行または同一直線

  const s = ((p3.x - p1.x) * dy2 - (p3.y - p1.y) * dx2) / det;
  const t = ((p3.x - p1.x) * dy1 - (p3.y - p1.y) * dx1) / det;

  // 線分の内分点（端点のすぐ近傍 0.05〜0.95 での交差のみを判定し、接続ノードの誤検知を防ぐ）
  if (s > 0.05 && s < 0.95 && t > 0.05 && t < 0.95) {
    return {
      x: Math.round(p1.x + s * dx1),
      y: Math.round(p1.y + s * dy1),
    };
  }

  return null;
}

/**
 * 輪郭群のパス交差（自己交差および輪郭間交差）を検出
 */
export function findContourIntersections(contours: PathContour[]): Point[] {
  const intersections: Point[] = [];
  if (!contours || contours.length === 0) return intersections;

  interface FastSegment {
    p1: Point;
    p2: Point;
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    contourIdx: number;
    segIdx: number;
  }

  const allSegments: FastSegment[] = [];

  contours.forEach((contour, cIdx) => {
    if (!contour.nodes || contour.nodes.length < 2) return;
    const points = sampleContourPoints(contour, 3);
    if (points.length < 2) return;

    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      allSegments.push({
        p1,
        p2,
        minX: p1.x < p2.x ? p1.x : p2.x,
        maxX: p1.x > p2.x ? p1.x : p2.x,
        minY: p1.y < p2.y ? p1.y : p2.y,
        maxY: p1.y > p2.y ? p1.y : p2.y,
        contourIdx: cIdx,
        segIdx: i,
      });
    }

    if (contour.closed && points.length > 2) {
      const p1 = points[points.length - 1];
      const p2 = points[0];
      allSegments.push({
        p1,
        p2,
        minX: p1.x < p2.x ? p1.x : p2.x,
        maxX: p1.x > p2.x ? p1.x : p2.x,
        minY: p1.y < p2.y ? p1.y : p2.y,
        maxY: p1.y > p2.y ? p1.y : p2.y,
        contourIdx: cIdx,
        segIdx: points.length - 1,
      });
    }
  });

  const segCount = allSegments.length;
  const maxSegsToCheck = 300;
  const step = segCount > maxSegsToCheck ? Math.ceil(segCount / maxSegsToCheck) : 1;

  for (let i = 0; i < segCount; i += step) {
    const s1 = allSegments[i];
    for (let j = i + step; j < segCount; j += step) {
      const s2 = allSegments[j];

      // 同一輪郭で隣接するセグメントは端点を共有するため除外
      if (s1.contourIdx === s2.contourIdx) {
        const diff = Math.abs(s1.segIdx - s2.segIdx);
        if (diff <= 1) continue;
      }

      // Fast AABB bounding box overlap rejection
      if (
        s1.maxX < s2.minX ||
        s1.minX > s2.maxX ||
        s1.maxY < s2.minY ||
        s1.minY > s2.maxY
      ) {
        continue;
      }

      const pt = getLineSegmentIntersection(s1.p1, s1.p2, s2.p1, s2.p2);
      if (pt) {
        const isNearby = intersections.some(
          (existing) => Math.hypot(existing.x - pt.x, existing.y - pt.y) < 8
        );
        if (!isNearby) {
          intersections.push(pt);
          if (intersections.length >= 25) return intersections;
        }
      }
    }
  }

  return intersections;
}

/**
 * 輪郭群に自己交差または輪郭間の交差が存在するか高速判定（最初の交点が見つかった瞬間に早期脱出）
 */
export function hasContourIntersections(contours: PathContour[]): boolean {
  if (!contours || contours.length === 0) return false;

  interface FastSegment {
    p1: Point;
    p2: Point;
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    contourIdx: number;
    segIdx: number;
  }

  const allSegments: FastSegment[] = [];
  const segCountByContour: number[] = [];

  for (let cIdx = 0; cIdx < contours.length; cIdx++) {
    const contour = contours[cIdx];
    if (!contour.nodes || contour.nodes.length < 2) {
      segCountByContour.push(0);
      continue;
    }
    const points = sampleContourPoints(contour, 3);
    if (points.length < 2) {
      segCountByContour.push(0);
      continue;
    }

    let segCount = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      allSegments.push({
        p1,
        p2,
        minX: p1.x < p2.x ? p1.x : p2.x,
        maxX: p1.x > p2.x ? p1.x : p2.x,
        minY: p1.y < p2.y ? p1.y : p2.y,
        maxY: p1.y > p2.y ? p1.y : p2.y,
        contourIdx: cIdx,
        segIdx: segCount++,
      });
    }

    if (contour.closed && points.length > 2) {
      const p1 = points[points.length - 1];
      const p2 = points[0];
      allSegments.push({
        p1,
        p2,
        minX: p1.x < p2.x ? p1.x : p2.x,
        maxX: p1.x > p2.x ? p1.x : p2.x,
        minY: p1.y < p2.y ? p1.y : p2.y,
        maxY: p1.y > p2.y ? p1.y : p2.y,
        contourIdx: cIdx,
        segIdx: segCount++,
      });
    }
    segCountByContour.push(segCount);
  }

  // 1D Sweep-line sorted by minX for 100% complete intersection check with zero segment skipping
  allSegments.sort((a, b) => a.minX - b.minX);
  const totalSegs = allSegments.length;

  for (let i = 0; i < totalSegs; i++) {
    const s1 = allSegments[i];
    for (let j = i + 1; j < totalSegs; j++) {
      const s2 = allSegments[j];

      // Prune by X: No subsequent segment can overlap in X
      if (s2.minX > s1.maxX) break;

      // Prune by Y: Fast AABB rejection
      if (s1.maxY < s2.minY || s1.minY > s2.maxY) continue;

      // Adjacent segments on the same contour share an endpoint; exclude
      if (s1.contourIdx === s2.contourIdx) {
        const diff = Math.abs(s1.segIdx - s2.segIdx);
        const count = segCountByContour[s1.contourIdx] || 0;
        if (diff <= 1 || (count > 2 && diff >= count - 1)) continue;
      }

      if (getLineSegmentIntersection(s1.p1, s1.p2, s2.p1, s2.p2)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * 2つの輪郭が実際に幾何学的に交差しているか、または接触・重なり合っているかを精密判定
 * （単なる外接矩形AABBの近接判定ではなく、実際の線分交差・内部包含・真の接触を検証）
 */
export function doContoursIntersectOrTouch(c1: PathContour, c2: PathContour): boolean {
  if (!c1?.nodes || c1.nodes.length < 2 || !c2?.nodes || c2.nodes.length < 2) return false;

  // 1. 高速 AABB バウンディングボックス判定（完全に離れている場合は即座に false）
  const b1 = getContoursBoundingBox([c1]);
  const b2 = getContoursBoundingBox([c2]);

  if (
    b1.minX > b2.maxX + 0.5 ||
    b1.maxX < b2.minX - 0.5 ||
    b1.minY > b2.maxY + 0.5 ||
    b1.maxY < b2.minY - 0.5
  ) {
    return false;
  }

  // 2. パス線分サンプリングによる線分交差チェック
  const pts1 = sampleContourPoints(c1, 5);
  const pts2 = sampleContourPoints(c2, 5);
  if (pts1.length < 2 || pts2.length < 2) return false;

  const segs1: { p1: Point; p2: Point; minX: number; maxX: number; minY: number; maxY: number }[] = [];
  for (let i = 0; i < pts1.length - 1; i++) {
    const p1 = pts1[i];
    const p2 = pts1[i + 1];
    segs1.push({
      p1, p2,
      minX: Math.min(p1.x, p2.x), maxX: Math.max(p1.x, p2.x),
      minY: Math.min(p1.y, p2.y), maxY: Math.max(p1.y, p2.y),
    });
  }
  if (c1.closed && pts1.length > 2) {
    const p1 = pts1[pts1.length - 1];
    const p2 = pts1[0];
    segs1.push({
      p1, p2,
      minX: Math.min(p1.x, p2.x), maxX: Math.max(p1.x, p2.x),
      minY: Math.min(p1.y, p2.y), maxY: Math.max(p1.y, p2.y),
    });
  }

  const segs2: { p1: Point; p2: Point; minX: number; maxX: number; minY: number; maxY: number }[] = [];
  for (let i = 0; i < pts2.length - 1; i++) {
    const p1 = pts2[i];
    const p2 = pts2[i + 1];
    segs2.push({
      p1, p2,
      minX: Math.min(p1.x, p2.x), maxX: Math.max(p1.x, p2.x),
      minY: Math.min(p1.y, p2.y), maxY: Math.max(p1.y, p2.y),
    });
  }
  if (c2.closed && pts2.length > 2) {
    const p1 = pts2[pts2.length - 1];
    const p2 = pts2[0];
    segs2.push({
      p1, p2,
      minX: Math.min(p1.x, p2.x), maxX: Math.max(p1.x, p2.x),
      minY: Math.min(p1.y, p2.y), maxY: Math.max(p1.y, p2.y),
    });
  }

  // 線分交差の探索
  for (let i = 0; i < segs1.length; i++) {
    const s1 = segs1[i];
    for (let j = 0; j < segs2.length; j++) {
      const s2 = segs2[j];
      if (
        s1.maxX < s2.minX ||
        s1.minX > s2.maxX ||
        s1.maxY < s2.minY ||
        s1.minY > s2.maxY
      ) {
        continue;
      }
      if (getLineSegmentIntersection(s1.p1, s1.p2, s2.p1, s2.p2)) {
        return true;
      }
    }
  }

  // 3. 内部包含チェック（一方が他方の内部に完全または部分的に食い込んでいる場合）
  if (c1.closed) {
    const testCount = Math.min(10, pts2.length);
    const step = Math.max(1, Math.floor(pts2.length / testCount));
    for (let i = 0; i < pts2.length; i += step) {
      if (isPointInContour(pts2[i], c1)) {
        return true;
      }
    }
  }

  if (c2.closed) {
    const testCount = Math.min(10, pts1.length);
    const step = Math.max(1, Math.floor(pts1.length / testCount));
    for (let i = 0; i < pts1.length; i += step) {
      if (isPointInContour(pts1[i], c2)) {
        return true;
      }
    }
  }

  // 4. 輪郭同士の極小接触チェック（物理的に接触している場合: 距離 <= 0.6px）
  for (let i = 0; i < pts1.length; i += 2) {
    const p = pts1[i];
    if (
      p.x < b2.minX - 1 ||
      p.x > b2.maxX + 1 ||
      p.y < b2.minY - 1 ||
      p.y > b2.maxY + 1
    ) {
      continue;
    }
    for (let j = 0; j < segs2.length; j++) {
      const s = segs2[j];
      const dx = s.p2.x - s.p1.x;
      const dy = s.p2.y - s.p1.y;
      const lenSq = dx * dx + dy * dy;
      if (lenSq < 1e-4) continue;
      const t = Math.max(0, Math.min(1, ((p.x - s.p1.x) * dx + (p.y - s.p1.y) * dy) / lenSq));
      const projX = s.p1.x + t * dx;
      const projY = s.p1.y + t * dy;
      const distSq = (p.x - projX) * (p.x - projX) + (p.y - projY) * (p.y - projY);
      if (distSq <= 0.36) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Boolean Union / Pathfinder Merge (合体・一筆書き白抜き解消):
 * Combines multiple overlapping or intersecting contours into unified outer contour(s),
 * eliminating internal overlapping boundaries and resolving self-intersections with high resolution.
 * Non-intersecting contours are guaranteed to remain 100% untouched with 0% distortion.
 */
export function unionContours(
  contoursToUnion: PathContour[],
  smoothing: number = 1.2,
  forceProcessSingle: boolean = false
): PathContour[] {
  if (!contoursToUnion || contoursToUnion.length === 0) return [];

  // 単独輪郭の場合: 自己交差がなければ絶対に何も変形させずに元輪郭を100%完全返却
  if (contoursToUnion.length === 1) {
    const hasSelf = hasContourIntersections(contoursToUnion);
    if (!hasSelf && !forceProcessSingle) {
      return contoursToUnion;
    }
  }

  // 1. 実際に幾何学的に交差・接触している輪郭のみを連結グラフでクラスタリング
  // 非交差・独立ストロークは絶対にクラスタを分離し、元のベジェ曲線を100%完全保持する
  const n = contoursToUnion.length;
  const adj: number[][] = Array.from({ length: n }, () => []);

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (doContoursIntersectOrTouch(contoursToUnion[i], contoursToUnion[j])) {
        adj[i].push(j);
        adj[j].push(i);
      }
    }
  }

  const visited = new Set<number>();
  const clusters: PathContour[][] = [];

  for (let i = 0; i < n; i++) {
    if (visited.has(i)) continue;
    const clusterIndices: number[] = [];
    const queue = [i];
    visited.add(i);

    while (queue.length > 0) {
      const curr = queue.shift()!;
      clusterIndices.push(curr);
      for (const neighbor of adj[curr]) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }
    clusters.push(clusterIndices.map((idx) => contoursToUnion[idx]));
  }

  const resultContours: PathContour[] = [];

  for (const cluster of clusters) {
    // 独立した単独輪郭の場合: 自己交差がない限り、元のパスを1点たりとも変形させずにそのまま保持
    if (cluster.length === 1) {
      const single = cluster[0];
      const hasSelf = hasContourIntersections(cluster);
      if (!hasSelf && !forceProcessSingle) {
        resultContours.push(single);
        continue;
      }
    }

    const bbox = getContoursBoundingBox(cluster);
    if (bbox.width <= 0 || bbox.height <= 0) {
      resultContours.push(...cluster);
      continue;
    }

    try {
      const united = booleanUnionContours(cluster);
      if (united && united.length > 0) {
        resultContours.push(...united);
        continue;
      }
    } catch {
      // Fallback to raster algorithm below
    }

    const margin = 24;
    const minX = Math.floor(bbox.minX - margin);
    const minY = Math.floor(bbox.minY - margin);
    const maxX = Math.ceil(bbox.maxX + margin);
    const maxY = Math.ceil(bbox.maxY + margin);
    const w = Math.max(32, maxX - minX);
    const h = Math.max(32, maxY - minY);

    // 超高解像度スーパーサンプリング（最大4.0倍、1600px基準）で局所合体時のエッジ精度を保持
    const maxDim = Math.max(w, h);
    const scale = Math.min(4.0, Math.max(2.0, 1600 / maxDim));
    const canvasW = Math.max(32, Math.round(w * scale));
    const canvasH = Math.max(32, Math.round(h * scale));

    const canvas = document.createElement('canvas');
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      resultContours.push(...cluster);
      continue;
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasW, canvasH);

    ctx.scale(scale, scale);
    ctx.translate(-minX, -minY);

    // 輪郭群の包含関係（内外階層）に基づきワインディングを正規化:
    // 外輪郭群は正の向き（Clockwise / +1）、内包される穴（「あ」「日」「口」など）は負の向き（Counter-Clockwise / -1）
    // これによりNon-Zero塗りつぶし時、重なり合う外側ストロークは加算融合（+1 + 1 = 2）され、
    // 内側の穴は(+1 + -1 = 0)として完全に白抜き保持される
    const alignedCluster = normalizeGlyphContoursWinding(cluster);

    ctx.fillStyle = '#000000';
    const clusterSvg = contoursToSvgPath(alignedCluster);
    try {
      const p2d = new Path2D(clusterSvg);
      ctx.fill(p2d, 'nonzero');
    } catch {
      // ignore parse failure
    }

    const imgData = ctx.getImageData(0, 0, canvasW, canvasH);
    const data = imgData.data;
    const binary = new Uint8Array(canvasW * canvasH);

    for (let i = 0; i < data.length; i += 4) {
      const brightness = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      binary[i / 4] = brightness < 128 ? 1 : 0;
    }

    const edgeMap = new Map<string, Point[]>();
    const visitedEdges = new Set<string>();

    const addEdge = (p1: Point, p2: Point) => {
      const key = `${p1.x},${p1.y}`;
      let list = edgeMap.get(key);
      if (!list) {
        list = [];
        edgeMap.set(key, list);
      }
      list.push(p2);
    };

    const getPixel = (px: number, py: number): number => {
      if (px < 0 || px >= canvasW || py < 0 || py >= canvasH) return 0;
      return binary[py * canvasW + px];
    };

    for (let y = 0; y <= canvasH; y++) {
      for (let x = 0; x <= canvasW; x++) {
        const top = getPixel(x, y - 1);
        const bottom = getPixel(x, y);
        if (top !== bottom) {
          if (top === 0 && bottom === 1) addEdge({ x, y }, { x: x + 1, y });
          else addEdge({ x: x + 1, y }, { x, y });
        }
        const left = getPixel(x - 1, y);
        const right = getPixel(x, y);
        if (left !== right) {
          if (left === 1 && right === 0) addEdge({ x, y }, { x, y: y + 1 });
          else addEdge({ x: y + 1, y }, { x, y });
        }
      }
    }

    const loops: Point[][] = [];
    for (const [startKey, targets] of edgeMap.entries()) {
      while (targets.length > 0) {
        const nextP = targets.pop()!;
        const [sx, sy] = startKey.split(',').map(Number);
        const startPt: Point = { x: sx, y: sy };
        const initialEdgeKey = `${startPt.x},${startPt.y}->${nextP.x},${nextP.y}`;
        if (visitedEdges.has(initialEdgeKey)) continue;
        visitedEdges.add(initialEdgeKey);

        const loop: Point[] = [startPt, nextP];
        let curr = nextP;
        let steps = 0;
        const maxSteps = canvasW * canvasH * 2;
        let closed = false;

        while (steps++ < maxSteps) {
          if (curr.x === startPt.x && curr.y === startPt.y) {
            closed = true;
            break;
          }
          const currKey = `${curr.x},${curr.y}`;
          const outList = edgeMap.get(currKey);
          if (!outList || outList.length === 0) break;

          let chosen: Point | null = null;
          let chosenIdx = -1;
          for (let i = 0; i < outList.length; i++) {
            const cand = outList[i];
            const k = `${curr.x},${curr.y}->${cand.x},${cand.y}`;
            if (!visitedEdges.has(k)) {
              chosen = cand;
              chosenIdx = i;
              break;
            }
          }
          if (!chosen) break;
          outList.splice(chosenIdx, 1);
          visitedEdges.add(`${curr.x},${curr.y}->${chosen.x},${chosen.y}`);
          loop.push(chosen);
          curr = chosen;
        }

        // 正常に始点に循環到達したループのみを採用し、末尾の重複始点を削除
        if (closed && loop.length >= 4) {
          loop.pop();
          loops.push(loop);
        }
      }
    }

    const transformedLoops = loops.map((loop) =>
      loop.map((p) => ({
        x: Math.round(minX + p.x / scale),
        y: Math.round(minY + p.y / scale),
      }))
    );

    // 微小ゴミノイズ（面積 < 25 font units）を除去
    const validLoops = transformedLoops.filter((loop) => {
      if (loop.length < 3) return false;
      let a = 0;
      for (let i = 0; i < loop.length; i++) {
        const j = (i + 1) % loop.length;
        a += loop[i].x * loop[j].y - loop[j].x * loop[i].y;
      }
      return Math.abs(a / 2) >= 25;
    });

    const simplified = validLoops
      .map((loop) => {
        if (loop.length <= 4) return loop;
        const half = Math.floor(loop.length / 2);
        const h1 = rdpSimplify(loop.slice(0, half + 1), smoothing);
        const h2 = rdpSimplify([...loop.slice(half), loop[0]], smoothing);
        const merged = [...h1.slice(0, -1), ...h2.slice(0, -1)];
        return merged.length >= 3 ? merged : loop;
      })
      .filter((l) => l.length >= 3);

    if (simplified.length === 0) {
      resultContours.push(...cluster);
      continue;
    }

    // 多角形頂点列を高品位なベジェ曲線ノード列に復元
    const mergedClusterContours = simplified.map((pts) => {
      const numPts = pts.length;
      const nodes: BezierNode[] = [];

      for (let i = 0; i < numPts; i++) {
        const curr = pts[i];
        const prev = pts[(i - 1 + numPts) % numPts];
        const next = pts[(i + 1) % numPts];

        const v1x = curr.x - prev.x;
        const v1y = curr.y - prev.y;
        const d1 = Math.hypot(v1x, v1y);

        const v2x = next.x - curr.x;
        const v2y = next.y - curr.y;
        const d2 = Math.hypot(v2x, v2y);

        if (d1 < 0.001 || d2 < 0.001) {
          nodes.push({ id: generateId(), x: curr.x, y: curr.y, type: 'corner' });
          continue;
        }

        const dot = (v1x * v2x + v1y * v2y) / (d1 * d2);
        // 急峻な折れ角（> 42°）はシャープな角ノードとして保持
        if (dot < 0.74) {
          nodes.push({ id: generateId(), x: curr.x, y: curr.y, type: 'corner' });
        } else {
          // 滑らかな曲線部：オーバーシュート抑制付きCatmull-Rom接線ハンドル
          const dx = (next.x - prev.x) * 0.25;
          const dy = (next.y - prev.y) * 0.25;
          const hLen = Math.hypot(dx, dy);
          const maxAllowed = Math.min(d1, d2) * 0.32;
          const s = hLen > maxAllowed && hLen > 0.001 ? maxAllowed / hLen : 1.0;
          const hx = dx * s;
          const hy = dy * s;

          nodes.push({
            id: generateId(),
            x: curr.x,
            y: curr.y,
            type: 'smooth',
            handleIn: { x: Math.round(curr.x - hx), y: Math.round(curr.y - hy) },
            handleOut: { x: Math.round(curr.x + hx), y: Math.round(curr.y + hy) },
          });
        }
      }

      return {
        id: generateId(),
        closed: true,
        nodes,
      };
    });

    resultContours.push(...normalizeGlyphContoursWinding(mergedClusterContours));
  }

  return resultContours;
}

/**
 * 一筆書きや手書き文字の自己交差・重なりによる白抜きを自動解消（ブーリアン融解）
 */
export function resolveContourOverlaps(
  contours: PathContour[],
  options?: { smoothing?: number; forceProcessSingle?: boolean }
): PathContour[] {
  return unionContours(contours, options?.smoothing ?? 1.2, options?.forceProcessSingle ?? true);
}

export { booleanSubtractContours, booleanIntersectContours } from "../vectorBoolean";
