import {
  BezierNode,
  PathContour,
  Point,
} from "../../types";
import {
  subtractEraserStrokeVector,
} from "../vectorBoolean";
import { generateId } from "./id";
import { contoursToSvgPath } from "./svg";
import {
  getContoursBoundingBox,
  isPointNearContour,
  isContourContained,
  normalizeGlyphContoursWinding,
  distToSegment,
} from "./bounds";
import { rdpSimplify } from "../imageVectorizer";

export function subtractEraserStrokeFromClosedContours(
  contours: PathContour[],
  strokePoints: Point[],
  radius: number
): PathContour[] {
  if (!contours || contours.length === 0 || !strokePoints || strokePoints.length === 0) {
    return contours || [];
  }
  const validContours = contours.filter((c) => c.nodes && c.nodes.length >= 3);
  if (validContours.length === 0) return [];

  const bbox = getContoursBoundingBox(validContours);
  if (bbox.width <= 0 || bbox.height <= 0) return [];

  let ptsMinX = Infinity;
  let ptsMaxX = -Infinity;
  let ptsMinY = Infinity;
  let ptsMaxY = -Infinity;

  for (const pt of strokePoints) {
    if (pt.x < ptsMinX) ptsMinX = pt.x;
    if (pt.x > ptsMaxX) ptsMaxX = pt.x;
    if (pt.y < ptsMinY) ptsMinY = pt.y;
    if (pt.y > ptsMaxY) ptsMaxY = pt.y;
  }

  const margin = Math.ceil(Math.max(radius * 2 + 16, 40));
  const minX = Math.floor(Math.min(bbox.minX, ptsMinX - radius) - margin);
  const minY = Math.floor(Math.min(bbox.minY, ptsMinY - radius) - margin);
  const maxX = Math.ceil(Math.max(bbox.maxX, ptsMaxX + radius) + margin);
  const maxY = Math.ceil(Math.max(bbox.maxY, ptsMaxY + radius) + margin);

  const w = Math.max(32, maxX - minX);
  const h = Math.max(32, maxY - minY);

  // High-resolution supersampling (up to 4x, max 1800px) for razor-sharp vector carve
  const scale = Math.min(4.0, Math.max(2.0, 1800 / Math.max(w, h)));
  const canvasW = Math.max(32, Math.round(w * scale));
  const canvasH = Math.max(32, Math.round(h * scale));

  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return contours;

  // Background white
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasW, canvasH);

  ctx.scale(scale, scale);
  ctx.translate(-minX, -minY);

  // Draw contours in solid black with evenodd fill rule
  ctx.fillStyle = '#000000';
  const contourSvg = contoursToSvgPath(normalizeGlyphContoursWinding(validContours));
  try {
    const p2d = new Path2D(contourSvg);
    ctx.fill(p2d, 'evenodd');
  } catch {
    return contours;
  }

  // Carve out eraser stroke in solid white
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = radius * 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (strokePoints.length === 1) {
    const p = strokePoints[0];
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(strokePoints[0].x, strokePoints[0].y);
    for (let i = 1; i < strokePoints.length; i++) {
      ctx.lineTo(strokePoints[i].x, strokePoints[i].y);
    }
    ctx.stroke();

    for (let i = 0; i < strokePoints.length; i++) {
      ctx.beginPath();
      ctx.arc(strokePoints[i].x, strokePoints[i].y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const imgData = ctx.getImageData(0, 0, canvasW, canvasH);
  const data = imgData.data;
  const binary = new Uint8Array(canvasW * canvasH);
  let blackPixelCount = 0;

  for (let i = 0; i < data.length; i += 4) {
    const brightness = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    if (brightness < 128) {
      binary[i / 4] = 1;
      blackPixelCount++;
    } else {
      binary[i / 4] = 0;
    }
  }

  if (blackPixelCount < 16) {
    return [];
  }

  const edgeMap = new Map<string, Point[]>();
  const visitedEdges = new Set<string>();

  const addEdge = (pA: Point, pB: Point) => {
    const key = `${pA.x},${pA.y}`;
    if (!edgeMap.has(key)) edgeMap.set(key, []);
    edgeMap.get(key)!.push(pB);
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
        else addEdge({ x, y: y + 1 }, { x, y });
      }
    }
  }

  const loops: Point[][] = [];
  for (const [startKey, targets] of edgeMap.entries()) {
    while (targets.length > 0) {
      const nextP = targets.pop()!;
      const [sx, sy] = startKey.split(',').map(Number);
      const startPt: Point = { x: sx, y: sy };
      const edgeKey = `${startPt.x},${startPt.y}->${nextP.x},${nextP.y}`;
      if (visitedEdges.has(edgeKey)) continue;
      visitedEdges.add(edgeKey);

      const loop: Point[] = [startPt, nextP];
      let curr = nextP;
      let steps = 0;
      const maxSteps = canvasW * canvasH * 4;
      let isClosedLoop = false;

      while (steps++ < maxSteps) {
        const currKey = `${curr.x},${curr.y}`;
        const outList = edgeMap.get(currKey);
        if (!outList || outList.length === 0) break;

        let nextIdx = 0;
        let chosen: Point | null = null;
        for (let i = 0; i < outList.length; i++) {
          const cand = outList[i];
          const k = `${curr.x},${curr.y}->${cand.x},${cand.y}`;
          if (!visitedEdges.has(k)) {
            chosen = cand;
            nextIdx = i;
            break;
          }
        }
        if (!chosen) break;
        outList.splice(nextIdx, 1);
        visitedEdges.add(`${curr.x},${curr.y}->${chosen.x},${chosen.y}`);
        loop.push(chosen);
        curr = chosen;
        if (curr.x === startPt.x && curr.y === startPt.y) {
          isClosedLoop = true;
          break;
        }
      }

      if (isClosedLoop && loop.length >= 6) {
        let cleanLoop = loop;
        if (cleanLoop.length >= 2) {
          const first = cleanLoop[0];
          const last = cleanLoop[cleanLoop.length - 1];
          if (first.x === last.x && first.y === last.y) {
            cleanLoop = cleanLoop.slice(0, -1);
          }
        }
        if (cleanLoop.length >= 3) {
          loops.push(cleanLoop);
        }
      }
    }
  }

  const transformedLoops = loops.map((loop) =>
    loop.map((p) => ({
      x: Math.round(minX + p.x / scale),
      y: Math.round(minY + p.y / scale),
    }))
  );

  // Filter out tiny micro-loops (< 20 font units area)
  const validLoops = transformedLoops.filter((loop) => {
    let a = 0;
    for (let i = 0; i < loop.length; i++) {
      const j = (i + 1) % loop.length;
      a += loop[i].x * loop[j].y - loop[j].x * loop[i].y;
    }
    return Math.abs(a / 2) >= 20;
  });

  if (validLoops.length === 0) {
    return [];
  }

  const simplified = validLoops
    .map((loop) => rdpSimplify(loop, 0.75))
    .filter((l) => l.length >= 3);

  if (simplified.length === 0) {
    return [];
  }

  // Convert simplified polygon loops to high-quality Bézier contours
  const resultingContours: PathContour[] = simplified.map((pts) => {
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
      // Sharp corners (> 45°) are kept as corner nodes
      if (dot < 0.70) {
        nodes.push({ id: generateId(), x: curr.x, y: curr.y, type: 'corner' });
      } else {
        const dx = (next.x - prev.x) * 0.28;
        const dy = (next.y - prev.y) * 0.28;
        const hLen = Math.hypot(dx, dy);
        const maxAllowed = Math.min(d1, d2) * 0.35;
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

  return normalizeGlyphContoursWinding(resultingContours);
}

export function subtractEraserFromClosedContours(
  contours: PathContour[],
  point: Point,
  radius: number,
  prevPoint?: Point | null
): PathContour[] {
  const pts = prevPoint ? [prevPoint, point] : [point];
  return subtractEraserStrokeFromClosedContours(contours, pts, radius);
}

export function subtractEraserFromClosedContour(
  contour: PathContour,
  point: Point,
  radius: number,
  prevPoint?: Point | null
): PathContour[] {
  return subtractEraserFromClosedContours([contour], point, radius, prevPoint);
}

const round1 = (v: number) => Math.round(v * 10) / 10;

function lerpPoint(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function cubicPoint(p0: Point, cp1: Point, cp2: Point, p3: Point, t: number): Point {
  const mt = 1 - t;
  return {
    x:
      mt * mt * mt * p0.x +
      3 * mt * mt * t * cp1.x +
      3 * mt * t * t * cp2.x +
      t * t * t * p3.x,
    y:
      mt * mt * mt * p0.y +
      3 * mt * mt * t * cp1.y +
      3 * mt * t * t * cp2.y +
      t * t * t * p3.y,
  };
}

/** Split a cubic at t into [left, right] sub-curves (de Casteljau). */
function splitCubic(
  p0: Point,
  cp1: Point,
  cp2: Point,
  p3: Point,
  t: number
): [{ p0: Point; cp1: Point; cp2: Point; p3: Point }, { p0: Point; cp1: Point; cp2: Point; p3: Point }] {
  const a = lerpPoint(p0, cp1, t);
  const b = lerpPoint(cp1, cp2, t);
  const c = lerpPoint(cp2, p3, t);
  const d = lerpPoint(a, b, t);
  const e = lerpPoint(b, c, t);
  const m = lerpPoint(d, e, t);
  return [
    { p0, cp1: a, cp2: d, p3: m },
    { p0: m, cp1: e, cp2: c, p3 },
  ];
}

/** Sub-curve of a cubic over [t0, t1] (de Casteljau). */
function subCubic(
  p0: Point,
  cp1: Point,
  cp2: Point,
  p3: Point,
  t0: number,
  t1: number
): { p0: Point; cp1: Point; cp2: Point; p3: Point } {
  if (t0 <= 0 && t1 >= 1) return { p0, cp1, cp2, p3 };
  if (t0 <= 0) return splitCubic(p0, cp1, cp2, p3, t1)[0];
  if (t1 >= 1) return splitCubic(p0, cp1, cp2, p3, t0)[1];
  const left = splitCubic(p0, cp1, cp2, p3, t1)[0];
  return splitCubic(left.p0, left.cp1, left.cp2, left.p3, t0 / t1)[1];
}

interface SlicePiece {
  segIndex: number;
  t0: number;
  t1: number;
  p0: Point;
  p1: Point;
  isCubic: boolean;
  cp1?: Point;
  cp2?: Point;
}

/**
 * Slices an open contour (contour.closed === false) by removing the part
 * inside the eraser capsule (segment prevPoint -> point, radius).
 *
 * Cut ends are the exact capsule-boundary crossings, found by bisection on
 * each original segment, not the nearest sampled point. Kept runs are built
 * from the original nodes — with their handles preserved, split at the cut
 * ends by de Casteljau — instead of re-sampling the whole run and losing
 * the handles. Run end nodes are open ends (no handleIn at the start, no
 * handleOut at the end); they are never treated as a closed loop.
 */
export function sliceOpenContourWithEraser(
  contour: PathContour,
  point: Point,
  radius: number,
  prevPoint?: Point | null
): PathContour[] {
  if (!contour.nodes || contour.nodes.length < 2) return [];

  const p1 = prevPoint || point;
  const p2 = point;
  const inside = (pt: Point) => distToSegment(pt, p1, p2) <= radius;

  // Split each original segment into the outside intervals, with exact
  // crossing points at the capsule boundary.
  const pieces: SlicePiece[] = [];
  for (let k = 0; k < contour.nodes.length - 1; k++) {
    const curr = contour.nodes[k];
    const next = contour.nodes[k + 1];
    const isCubic = Boolean(curr.handleOut || next.handleIn);
    const cp1 = curr.handleOut || { x: curr.x, y: curr.y };
    const cp2 = next.handleIn || { x: next.x, y: next.y };
    const pointAt = (t: number): Point =>
      isCubic
        ? cubicPoint(curr, cp1, cp2, next, t)
        : { x: curr.x + (next.x - curr.x) * t, y: curr.y + (next.y - curr.y) * t };
    const steps = isCubic ? 24 : 12;

    // Find the crossing parameter between two samples by bisection.
    const findCrossing = (ta: number, tb: number): number => {
      let lo = ta;
      let hi = tb;
      const fa = distToSegment(pointAt(lo), p1, p2) - radius;
      if (fa === 0) return lo;
      for (let i = 0; i < 24; i++) {
        const mid = (lo + hi) / 2;
        const fm = distToSegment(pointAt(mid), p1, p2) - radius;
        if (fm === 0) return mid;
        if ((fm > 0) === (fa > 0)) lo = mid;
        else hi = mid;
      }
      return (lo + hi) / 2;
    };

    let intervalStart: number | null = inside(pointAt(0)) ? null : 0;
    let prevT = 0;
    let prevInside = inside(pointAt(0));
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      const curInside = inside(pointAt(t));
      if (curInside !== prevInside) {
        const tc = findCrossing(prevT, t);
        if (prevInside) {
          // Leaving the eraser: an outside interval starts here.
          intervalStart = tc;
        } else if (intervalStart !== null) {
          // Entering the eraser: the outside interval ends here.
          pieces.push(makePiece(k, intervalStart, tc));
          intervalStart = null;
        }
        prevInside = curInside;
      }
      prevT = t;
    }
    if (intervalStart !== null) {
      pieces.push(makePiece(k, intervalStart, 1));
    }

    function makePiece(segIndex: number, t0: number, t1: number): SlicePiece {
      if (t1 - t0 < 1e-6) {
        return {
          segIndex,
          t0,
          t1,
          p0: pointAt(t0),
          p1: pointAt(t1),
          isCubic,
        };
      }
      if (!isCubic) {
        return { segIndex, t0, t1, p0: pointAt(t0), p1: pointAt(t1), isCubic };
      }
      const sub = subCubic(curr, cp1, cp2, next, t0, t1);
      return {
        segIndex,
        t0,
        t1,
        p0: { x: round1(sub.p0.x), y: round1(sub.p0.y) },
        p1: { x: round1(sub.p3.x), y: round1(sub.p3.y) },
        isCubic,
        cp1: { x: round1(sub.cp1.x), y: round1(sub.cp1.y) },
        cp2: { x: round1(sub.cp2.x), y: round1(sub.cp2.y) },
      };
    }
  }

  // Group consecutive pieces into runs. Pieces join at an original node
  // only when the previous piece ends at t=1 and the next starts at t=0.
  const runs: SlicePiece[][] = [];
  let currentRun: SlicePiece[] = [];
  for (const piece of pieces) {
    if (piece.t1 - piece.t0 < 1e-6) continue;
    const last = currentRun[currentRun.length - 1];
    if (
      last &&
      last.segIndex + 1 === piece.segIndex &&
      last.t1 >= 1 - 1e-9 &&
      piece.t0 <= 1e-9
    ) {
      currentRun.push(piece);
    } else {
      if (currentRun.length > 0) runs.push(currentRun);
      currentRun = [piece];
    }
  }
  if (currentRun.length > 0) runs.push(currentRun);

  const result: PathContour[] = [];
  for (const run of runs) {
    const nodes: BezierNode[] = [];
    for (let j = 0; j < run.length; j++) {
      const piece = run[j];
      const isFirst = j === 0;
      const isLast = j === run.length - 1;

      if (isFirst) {
        if (piece.t0 <= 1e-9) {
          const orig = contour.nodes[piece.segIndex];
          nodes.push({
            id: generateId(),
            x: orig.x,
            y: orig.y,
            type: orig.type,
            handleIn: null,
            handleOut: piece.isCubic && piece.cp1 ? piece.cp1 : null,
          });
        } else {
          nodes.push({
            id: generateId(),
            x: piece.p0.x,
            y: piece.p0.y,
            type: 'corner',
            handleIn: null,
            handleOut: piece.isCubic && piece.cp1 ? piece.cp1 : null,
          });
        }
      }

      if (isLast) {
        if (piece.t1 >= 1 - 1e-9) {
          const orig = contour.nodes[piece.segIndex + 1];
          nodes.push({
            id: generateId(),
            x: orig.x,
            y: orig.y,
            type: orig.type,
            handleIn: piece.isCubic && piece.cp2 ? piece.cp2 : null,
            handleOut: null,
          });
        } else {
          nodes.push({
            id: generateId(),
            x: piece.p1.x,
            y: piece.p1.y,
            type: 'corner',
            handleIn: piece.isCubic && piece.cp2 ? piece.cp2 : null,
            handleOut: null,
          });
        }
      } else {
        const orig = contour.nodes[piece.segIndex + 1];
        const nextPiece = run[j + 1];
        nodes.push({
          id: generateId(),
          x: orig.x,
          y: orig.y,
          type: orig.type,
          handleIn: piece.isCubic && piece.cp2 ? piece.cp2 : null,
          handleOut: nextPiece.isCubic && nextPiece.cp1 ? nextPiece.cp1 : null,
        });
      }
    }
    if (nodes.length < 2) continue;
    result.push({
      id: generateId(),
      closed: false,
      nodes,
    });
  }

  return result;
}

/**
 * Erase / carve a full stroke of points across contours (for 'cut' mode on mouse up or sweep)
 */
export function subtractEraserStrokeFromContours(
  contours: PathContour[],
  strokePoints: Point[],
  radius: number
): PathContour[] {
  if (!contours || contours.length === 0 || !strokePoints || strokePoints.length === 0) {
    return contours || [];
  }

  const hitClosedContours: PathContour[] = [];
  const nonHitContours: PathContour[] = [];
  const hitOpenContours: PathContour[] = [];

  for (const contour of contours) {
    let hit = false;
    for (let i = 0; i < strokePoints.length; i++) {
      const pt = strokePoints[i];
      const prev = i > 0 ? strokePoints[i - 1] : null;
      if (isPointNearContour(pt, contour, radius, prev)) {
        hit = true;
        break;
      }
    }

    if (!hit) {
      nonHitContours.push(contour);
      continue;
    }

    if (contour.closed) {
      hitClosedContours.push(contour);
    } else {
      hitOpenContours.push(contour);
    }
  }

  if (hitClosedContours.length === 0 && hitOpenContours.length === 0) {
    return contours;
  }

  let newClosed: PathContour[] = [];
  if (hitClosedContours.length > 0) {
    try {
      newClosed = subtractEraserStrokeVector(hitClosedContours, strokePoints, radius);
    } catch (err) {
      console.warn('Vector eraser subtraction encountered an error, falling back to bitmap carve:', err);
      newClosed = subtractEraserStrokeFromClosedContours(hitClosedContours, strokePoints, radius);
    }
  }

  let currentOpen = hitOpenContours;
  for (let i = 0; i < strokePoints.length; i++) {
    const pt = strokePoints[i];
    const prev = i > 0 ? strokePoints[i - 1] : null;
    const nextOpen: PathContour[] = [];
    for (const openC of currentOpen) {
      nextOpen.push(...sliceOpenContourWithEraser(openC, pt, radius, prev));
    }
    currentOpen = nextOpen;
  }

  return [...nonHitContours, ...newClosed, ...currentOpen];
}

/**
 * Erase contours at a given canvas point with specified radius and eraser mode.
 * - 'stroke': Deletes any contour that intersects with the eraser radius.
 *   Uses topological grouping so outer outlines and all counter-holes (e.g. O, A, 日, 国, あ)
 *   are erased together without leaving solid orphan hole artifacts!
 * - 'cut': Cuts/splits contours by carving out eraser areas from closed shapes (Boolean difference)
 *   or slicing open paths at eraser boundaries into separate segments.
 * - 'node': Removes individual anchor nodes falling within the eraser circle.
 */
export function eraseContoursAtPoint(
  contours: PathContour[],
  point: Point,
  radius: number,
  mode: 'all' | 'stroke' | 'cut' | 'node' = 'stroke',
  prevPoint?: Point | null
): PathContour[] {
  if (!contours || contours.length === 0) return [];

  if (mode === 'all') {
    return [];
  }

  if (mode === 'cut') {
    const strokePts = prevPoint ? [prevPoint, point] : [point];
    return subtractEraserStrokeFromContours(contours, strokePts, radius);
  }

  if (mode === 'stroke') {
    let hasChanged = false;
    const erasedIds = new Set<string>();

    // 1. Direct hit test on each individual contour
    for (const contour of contours) {
      if (isPointNearContour(point, contour, radius, prevPoint)) {
        erasedIds.add(contour.id);
        hasChanged = true;
      }
    }

    if (!hasChanged) {
      return contours;
    }

    // 2. If an outer contour is erased, also remove any dependent counter-holes
    // that were fully enclosed by that specific outer contour so orphan inner holes don't invert.
    for (const contour of contours) {
      if (erasedIds.has(contour.id) && contour.closed) {
        for (const other of contours) {
          if (!erasedIds.has(other.id) && other.closed && other.id !== contour.id) {
            // If other is fully inside contour, remove it with its deleted parent
            if (isContourContained(other, contour)) {
              erasedIds.add(other.id);
            }
          }
        }
      }
    }

    return contours.filter((c) => !erasedIds.has(c.id));
  }

  if (mode === 'node') {
    let hasChanged = false;
    const result: PathContour[] = [];

    for (const contour of contours) {
      const remainingNodes = contour.nodes.filter(
        (n) => distToSegment(n, prevPoint || point, point) > radius
      );
      if (remainingNodes.length !== contour.nodes.length) {
        hasChanged = true;
        const minNodes = contour.closed ? 3 : 2;
        if (remainingNodes.length >= minNodes) {
          result.push({
            ...contour,
            nodes: remainingNodes,
          });
        }
      } else {
        result.push(contour);
      }
    }

    if (!hasChanged) {
      return contours;
    }
    return result;
  }

  return contours;
}
