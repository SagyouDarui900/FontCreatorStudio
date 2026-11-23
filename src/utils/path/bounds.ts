import {
  BezierNode,
  PathContour,
  Point,
} from "../../types";
import { contoursToSvgPath } from "./svg";

function getCubicExtremaValues(p0: number, p1: number, p2: number, p3: number): number[] {
  const results: number[] = [];
  const a = -p0 + 3 * p1 - 3 * p2 + p3;
  const b = 2 * (p0 - 2 * p1 + p2);
  const c = p1 - p0;

  const evalCubic = (t: number) => {
    const mt = 1 - t;
    return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3;
  };

  if (Math.abs(a) < 1e-9) {
    if (Math.abs(b) > 1e-9) {
      const t = -c / b;
      if (t > 0 && t < 1) results.push(evalCubic(t));
    }
    return results;
  }

  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return results;

  const sqrtDisc = Math.sqrt(discriminant);
  const t1 = (-b + sqrtDisc) / (2 * a);
  const t2 = (-b - sqrtDisc) / (2 * a);
  if (t1 > 0 && t1 < 1) results.push(evalCubic(t1));
  if (t2 > 0 && t2 < 1 && Math.abs(t2 - t1) > 1e-9) results.push(evalCubic(t2));
  return results;
}

export function getContoursBoundingBox(contours: PathContour[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
} {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  let hasPoints = false;

  const expandPoint = (x: number, y: number) => {
    // Ignore non-finite coordinates so one invalid node cannot poison
    // the whole bounding box with NaN.
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    hasPoints = true;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  };

  for (const contour of contours) {
    const nodes = contour.nodes;
    const len = nodes.length;
    if (len === 0) continue;

    for (let i = 0; i < len; i++) {
      const p0 = nodes[i];
      expandPoint(p0.x, p0.y);

      const hasNext = i < len - 1 || contour.closed;
      if (!hasNext || len < 2) continue;

      const p3 = nodes[(i + 1) % len];
      if (!p0.handleOut && !p3.handleIn) continue;

      const p1 = p0.handleOut || p0;
      const p2 = p3.handleIn || p3;

      for (const ex of getCubicExtremaValues(p0.x, p1.x, p2.x, p3.x)) {
        if (ex < minX) minX = ex;
        if (ex > maxX) maxX = ex;
      }
      for (const ey of getCubicExtremaValues(p0.y, p1.y, p2.y, p3.y)) {
        if (ey < minY) minY = ey;
        if (ey > maxY) maxY = ey;
      }
    }
  }

  if (!hasPoints) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0, centerX: 0, centerY: 0 };
  }

  const width = Math.max(0, maxX - minX);
  const height = Math.max(0, maxY - minY);
  return {
    minX,
    minY,
    maxX,
    maxY,
    width,
    height,
    centerX: minX + width / 2,
    centerY: minY + height / 2,
  };
}

export function getContourBoundingBox(contour: PathContour) {
  return getContoursBoundingBox([contour]);
}

/**
 * Check that every node coordinate and every Bézier handle coordinate in
 * the given contours is a finite number. Returns false when any contour
 * is missing a node list, any node coordinate is not finite, or any
 * handle coordinate is not finite. Use before inserting contours into a
 * glyph so invalid data never reaches the canvas.
 */
export function contoursHaveFiniteCoordinates(
  contours: PathContour[] | null | undefined
): boolean {
  if (!contours || contours.length === 0) return false;
  for (const contour of contours) {
    if (!contour || !Array.isArray(contour.nodes)) return false;
    for (const node of contour.nodes) {
      if (!node || !Number.isFinite(node.x) || !Number.isFinite(node.y)) {
        return false;
      }
      for (const handle of [node.handleIn, node.handleOut]) {
        if (handle && (!Number.isFinite(handle.x) || !Number.isFinite(handle.y))) {
          return false;
        }
      }
    }
  }
  return true;
}

/**
 * Compute an SVG viewBox string that covers `[0, 0, unitsPerEm, unitsPerEm]` and
 * dynamically expands if any glyph contours extend beyond the EM box boundaries.
 */
export function getSafeGlyphViewBox(
  contours: PathContour[] | undefined | null,
  unitsPerEm: number = 1000,
  padding: number = 24
): string {
  const upm = unitsPerEm > 0 ? unitsPerEm : 1000;
  if (!contours || contours.length === 0) {
    return `0 0 ${upm} ${upm}`;
  }
  const bbox = getContoursBoundingBox(contours);
  if (bbox.width <= 0 && bbox.height <= 0) {
    return `0 0 ${upm} ${upm}`;
  }
  if (bbox.minX >= 0 && bbox.minY >= 0 && bbox.maxX <= upm && bbox.maxY <= upm) {
    return `0 0 ${upm} ${upm}`;
  }
  const minX = Math.floor(Math.min(0, bbox.minX - padding));
  const minY = Math.floor(Math.min(0, bbox.minY - padding));
  const maxX = Math.ceil(Math.max(upm, bbox.maxX + padding));
  const maxY = Math.ceil(Math.max(upm, bbox.maxY + padding));
  return `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;
}

/**
 * Smooth and re-align transformed contours to eliminate jaggedness and handle kinks
 */

function sampleCubicBezier(
  p0: Point,
  cp1: Point,
  cp2: Point,
  p3: Point,
  numSamples: number = 10
): Point[] {
  const pts: Point[] = [];
  for (let i = 1; i <= numSamples; i++) {
    const t = i / numSamples;
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    const t2 = t * t;
    const t3 = t2 * t;

    const x = mt3 * p0.x + 3 * mt2 * t * cp1.x + 3 * mt * t2 * cp2.x + t3 * p3.x;
    const y = mt3 * p0.y + 3 * mt2 * t * cp1.y + 3 * mt * t2 * cp2.y + t3 * p3.y;
    pts.push({ x, y });
  }
  return pts;
}

/**
 * Sample dense polyline points from any PathContour (including Bézier curves)
 */
export function sampleContourPoints(contour: PathContour, samplesPerSegment: number = 8): Point[] {
  if (!contour.nodes || contour.nodes.length === 0) return [];
  const nodes = contour.nodes;
  const densePoints: Point[] = [{ x: nodes[0].x, y: nodes[0].y }];

  for (let i = 0; i < nodes.length; i++) {
    const curr = nodes[i];
    const isLast = i === nodes.length - 1;
    const next = isLast ? (contour.closed ? nodes[0] : null) : nodes[i + 1];
    if (!next) break;

    const cp1 = curr.handleOut || { x: curr.x, y: curr.y };
    const cp2 = next.handleIn || { x: next.x, y: next.y };

    const isStraight =
      cp1.x === curr.x && cp1.y === curr.y && cp2.x === next.x && cp2.y === next.y;

    if (isStraight) {
      // Subdivide straight line if long
      const dist = Math.hypot(next.x - curr.x, next.y - curr.y);
      const steps = Math.max(2, Math.min(samplesPerSegment, Math.floor(dist / 20)));
      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        densePoints.push({
          x: curr.x + (next.x - curr.x) * t,
          y: curr.y + (next.y - curr.y) * t,
        });
      }
    } else {
      const chordLen = Math.hypot(next.x - curr.x, next.y - curr.y);
      const ctrlNetLen =
        Math.hypot(cp1.x - curr.x, cp1.y - curr.y) +
        Math.hypot(cp2.x - cp1.x, cp2.y - cp1.y) +
        Math.hypot(next.x - cp2.x, next.y - cp2.y);
      const approxCurveLen = (chordLen + ctrlNetLen) / 2;
      const adaptiveSteps = Math.max(
        samplesPerSegment,
        Math.min(32, Math.ceil(approxCurveLen / 12))
      );
      const sampled = sampleCubicBezier(
        { x: curr.x, y: curr.y },
        cp1,
        cp2,
        { x: next.x, y: next.y },
        adaptiveSteps
      );
      densePoints.push(...sampled);
    }
  }

  return densePoints;
}

/**
 * Helper to compute distance from a point to a line segment
 */

export function distToSegment(pt: Point, p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(pt.x - p1.x, pt.y - p1.y);
  const t = Math.max(0, Math.min(1, ((pt.x - p1.x) * dx + (pt.y - p1.y) * dy) / lenSq));
  const projX = p1.x + t * dx;
  const projY = p1.y + t * dy;
  return Math.hypot(pt.x - projX, pt.y - projY);
}

/**
 * Check if two line segments (p1-p2 and q1-q2) intersect
 */
function doSegmentsIntersect(p1: Point, p2: Point, q1: Point, q2: Point): boolean {
  const ccw = (a: Point, b: Point, c: Point) => (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
  return (
    ccw(p1, q1, q2) !== ccw(p2, q1, q2) &&
    ccw(p1, p2, q1) !== ccw(p1, p2, q2)
  );
}

/**
 * Compute the shortest distance between two 2D line segments
 */
function distSegmentToSegment(p1: Point, p2: Point, q1: Point, q2: Point): number {
  if (doSegmentsIntersect(p1, p2, q1, q2)) return 0;
  return Math.min(
    distToSegment(p1, q1, q2),
    distToSegment(p2, q1, q2),
    distToSegment(q1, p1, p2),
    distToSegment(q2, p1, p2)
  );
}

/**
 * Point in polygon test using ray-casting
 */
export function isPointInPolygon(pt: Point, poly: Point[]): boolean {
  if (!poly || poly.length < 3) return false;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;
    const intersect =
      yi > pt.y !== yj > pt.y && pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi || 0.0000001) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Test whether a canvas point is within a given distance of a contour (nodes or outline/segment).
 * Supports swept trajectory when prevPoint is provided.
 */
export function isPointNearContour(
  point: Point,
  contour: PathContour,
  threshold: number = 25,
  prevPoint?: Point | null
): boolean {
  if (!contour || !contour.nodes || contour.nodes.length === 0) return false;

  const p1 = prevPoint || point;
  const p2 = point;

  // Quick bounding box check with threshold margin for the swept capsule
  const capMinX = Math.min(p1.x, p2.x) - threshold;
  const capMaxX = Math.max(p1.x, p2.x) + threshold;
  const capMinY = Math.min(p1.y, p2.y) - threshold;
  const capMaxY = Math.max(p1.y, p2.y) + threshold;

  const bbox = getContoursBoundingBox([contour]);
  if (
    bbox.maxX < capMinX ||
    bbox.minX > capMaxX ||
    bbox.maxY < capMinY ||
    bbox.minY > capMaxY
  ) {
    return false;
  }

  // 1. Sample dense polyline representation along the contour with high curve fidelity
  const samples = sampleContourPoints(contour, 16);
  if (samples.length < 2) return false;

  // 1.5. Direct distance check from eraser points to any sample point on the contour
  for (const q of samples) {
    if (Math.hypot(p2.x - q.x, p2.y - q.y) <= threshold) return true;
    if (prevPoint && Math.hypot(p1.x - q.x, p1.y - q.y) <= threshold) return true;
  }

  // 2. If closed contour, check if either eraser point (or swept samples) is inside the filled body
  if (contour.closed) {
    if (isPointInPolygon(p2, samples)) return true;
    if (prevPoint && isPointInPolygon(p1, samples)) return true;
    if (prevPoint) {
      const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      if (isPointInPolygon(mid, samples)) return true;
      const q1 = { x: (p1.x * 3 + p2.x) / 4, y: (p1.y * 3 + p2.y) / 4 };
      if (isPointInPolygon(q1, samples)) return true;
      const q3 = { x: (p1.x + p2.x * 3) / 4, y: (p1.y + p2.y * 3) / 4 };
      if (isPointInPolygon(q3, samples)) return true;
    }
  }

  // 3. Check point-to-segment distance and swept segment-to-segment distance along contour boundary
  for (let i = 1; i < samples.length; i++) {
    const q1 = samples[i - 1];
    const q2 = samples[i];
    if (distToSegment(p2, q1, q2) <= threshold) {
      return true;
    }
    if (prevPoint && distToSegment(p1, q1, q2) <= threshold) {
      return true;
    }
    if (distSegmentToSegment(p1, p2, q1, q2) <= threshold) {
      return true;
    }
  }
  if (contour.closed && samples.length > 2) {
    const q1 = samples[samples.length - 1];
    const q2 = samples[0];
    if (distToSegment(p2, q1, q2) <= threshold) {
      return true;
    }
    if (prevPoint && distToSegment(p1, q1, q2) <= threshold) {
      return true;
    }
    if (distSegmentToSegment(p1, p2, q1, q2) <= threshold) {
      return true;
    }
  }

  // 4. Check anchor nodes directly
  for (const node of contour.nodes) {
    if (distToSegment(node, p1, p2) <= threshold) {
      return true;
    }
  }

  return false;
}

/**
 * Subtracts the eraser circle / capsule from one or more closed contours.
 * Uses evenodd fill rule so compound glyphs with counter-contours/holes (like O, A, 日, 国)
 * are carved cleanly without inverting inner holes into solid shapes.
 * Returns an array of remaining closed contours.
 */
/**
 * Subtracts an eraser path / stroke (or single point) from closed contours.
 * Uses high-resolution rendering with evenodd fill rule and smooth Bézier curve reconstruction.
 * Non-hit contours are guaranteed 100% untouched.
 */

export function getContourSignedArea(contour: PathContour): number {
  if (!contour || !contour.nodes || contour.nodes.length < 3) return 0;
  const hasCurves = contour.nodes.some((n) => n.handleIn != null || n.handleOut != null);
  const pts = hasCurves ? sampleContourPoints(contour, 6) : contour.nodes;
  if (!pts || pts.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const p1 = pts[i];
    const p2 = pts[(i + 1) % pts.length];
    area += p1.x * p2.y - p2.x * p1.y;
  }
  return area / 2;
}

/**
 * Reverse the winding order of a contour.
 * Inverts the node sequence and swaps handleIn and handleOut.
 */
export function reverseContour(contour: PathContour): PathContour {
  if (!contour.nodes || contour.nodes.length <= 1) return contour;
  const reversedNodes: BezierNode[] = [...contour.nodes].reverse().map((n) => ({
    ...n,
    handleIn: n.handleOut ? { ...n.handleOut } : null,
    handleOut: n.handleIn ? { ...n.handleIn } : null,
  }));
  return {
    ...contour,
    nodes: reversedNodes,
  };
}

/**
 * Test whether a point is inside a contour using ray-casting algorithm
 */
export function isPointInContour(pt: Point, contour: PathContour): boolean {
  if (!contour || !contour.nodes || contour.nodes.length < 3) return false;
  const hasCurves = contour.nodes.some((n) => n.handleIn != null || n.handleOut != null);
  const poly = hasCurves ? sampleContourPoints(contour, 8) : contour.nodes;
  return isPointInPolygon(pt, poly);
}

export function getContourPolygon(contour: PathContour, samplesPerSegment: number = 8): Point[] {
  if (!contour || !contour.nodes || contour.nodes.length < 3) return [];
  const hasCurves = contour.nodes.some((n) => n.handleIn != null || n.handleOut != null);
  return hasCurves ? sampleContourPoints(contour, samplesPerSegment) : contour.nodes;
}

export function isPrecomputedContourContained(
  innerBbox: ReturnType<typeof getContoursBoundingBox>,
  innerArea: number,
  innerPoly: Point[],
  outerBbox: ReturnType<typeof getContoursBoundingBox>,
  outerArea: number,
  outerPoly: Point[]
): boolean {
  if (
    innerBbox.minX < outerBbox.minX - 2 ||
    innerBbox.maxX > outerBbox.maxX + 2 ||
    innerBbox.minY < outerBbox.minY - 2 ||
    innerBbox.maxY > outerBbox.maxY + 2
  ) {
    return false;
  }
  if (innerArea >= outerArea * 0.95) return false;
  if (innerPoly.length === 0 || outerPoly.length < 3) return false;

  const centerPt = { x: innerBbox.centerX, y: innerBbox.centerY };
  if (!isPointInPolygon(centerPt, outerPoly)) return false;

  const requiredInside = Math.ceil(innerPoly.length * 0.92);
  let insideCount = 0;
  for (let i = 0; i < innerPoly.length; i++) {
    if (isPointInPolygon(innerPoly[i], outerPoly)) {
      insideCount++;
    } else if (innerPoly.length - (i + 1) + insideCount < requiredInside) {
      return false;
    }
  }
  return insideCount >= requiredInside;
}

/**
 * Check if inner contour is entirely enclosed by outer contour
 */
export function isContourContained(inner: PathContour, outer: PathContour): boolean {
  if (!inner?.nodes?.length || !outer?.nodes || outer.nodes.length < 3) return false;
  const innerBbox = getContoursBoundingBox([inner]);
  const outerBbox = getContoursBoundingBox([outer]);
  if (
    innerBbox.minX < outerBbox.minX - 2 ||
    innerBbox.maxX > outerBbox.maxX + 2 ||
    innerBbox.minY < outerBbox.minY - 2 ||
    innerBbox.maxY > outerBbox.maxY + 2
  ) {
    return false;
  }

  const innerArea = Math.abs(getContourSignedArea(inner));
  const outerArea = Math.abs(getContourSignedArea(outer));
  if (innerArea >= outerArea * 0.95) return false;

  // Dense polyline check: for a TRUE hole, sampled points along inner must be strictly inside outer
  const sampled = sampleContourPoints(inner, 8);
  if (!sampled || sampled.length === 0) return false;
  const outerPoly = getContourPolygon(outer, 8);
  if (outerPoly.length < 3) return false;

  const centerPt = { x: innerBbox.centerX, y: innerBbox.centerY };
  if (!isPointInPolygon(centerPt, outerPoly)) return false;

  let insideCount = 0;
  for (const pt of sampled) {
    if (isPointInPolygon(pt, outerPoly)) {
      insideCount++;
    }
  }

  // For a true enclosed counter-hole (e.g. eye of 日, 口, O, loop of あ), virtually all sampled points (>= 92%)
  // and center must be inside outer: crossing strokes that exit or span across will be correctly rejected!
  return insideCount >= sampled.length * 0.92;
}

/**
 * Group contours so that outer contours and their enclosed inner holes (e.g. inside of 日, 口, O, あ)
 * are kept together in the same group, while independent overlapping strokes (e.g. stroke 1 and stroke 2 of あ)
 * remain in separate groups.
 *
 * When each group is rendered with evenodd fillRule:
 * 1. Independent overlapping strokes paint additively on top of each other without creating white cutout defects!
 * 2. Nested inner holes punch out clean transparent windows!
 */
const HOLE_GROUPS_CACHE = new WeakMap<PathContour[], PathContour[][]>();

export function groupContoursWithHoles(contours: PathContour[]): PathContour[][] {
  if (!contours || contours.length === 0) return [];
  if (contours.length === 1) return [[contours[0]]];

  const cached = HOLE_GROUPS_CACHE.get(contours);
  if (cached !== undefined) return cached;

  const n = contours.length;
  const bboxes = new Array<ReturnType<typeof getContoursBoundingBox>>(n);
  const absAreas = new Float64Array(n);
  const sampledPolys = new Array<Point[]>(n);
  const hitPolys = new Array<Point[]>(n);

  for (let i = 0; i < n; i++) {
    const c = contours[i];
    bboxes[i] = getContoursBoundingBox([c]);
    absAreas[i] = Math.abs(getContourSignedArea(c));
    sampledPolys[i] = c.nodes && c.nodes.length > 0 ? sampleContourPoints(c, 8) : [];
    hitPolys[i] = getContourPolygon(c, 8);
  }

  // Identify which contours are holes contained inside another contour
  // Map child contour index -> parent contour index
  const parentMap = new Map<number, number>();

  for (let i = 0; i < n; i++) {
    const childArea = absAreas[i];
    const childBbox = bboxes[i];
    const childSampled = sampledPolys[i];
    let smallestParentIdx = -1;
    let smallestParentArea = Infinity;

    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const candidateArea = absAreas[j];
      // A parent contour must have strictly larger area than its child
      if (candidateArea <= childArea || candidateArea >= smallestParentArea) continue;

      if (
        isPrecomputedContourContained(
          childBbox,
          childArea,
          childSampled,
          bboxes[j],
          candidateArea,
          hitPolys[j]
        )
      ) {
        smallestParentArea = candidateArea;
        smallestParentIdx = j;
      }
    }

    if (smallestParentIdx !== -1) {
      parentMap.set(i, smallestParentIdx);
    }
  }

  // Root outer groups
  const rootGroups = new Map<number, PathContour[]>();
  for (let i = 0; i < n; i++) {
    if (!parentMap.has(i)) {
      rootGroups.set(i, [contours[i]]);
    }
  }

  for (const [childIdx, parentIdx] of parentMap.entries()) {
    let root = parentIdx;
    const visited = new Set<number>([childIdx]);
    while (parentMap.has(root) && !visited.has(root)) {
      visited.add(root);
      root = parentMap.get(root)!;
    }
    if (!rootGroups.has(root)) {
      rootGroups.set(root, [contours[root]]);
    }
    rootGroups.get(root)!.push(contours[childIdx]);
  }

  const result = Array.from(rootGroups.values());
  HOLE_GROUPS_CACHE.set(contours, result);
  return result;
}

export interface RenderGroup {
  id: string;
  d: string;
  fillRule: 'nonzero' | 'evenodd';
}

const RENDER_GROUP_CACHE = new WeakMap<PathContour[], RenderGroup[]>();

/**
 * Group contours for safe SVG/canvas rendering:
 * Nested counter-holes stay with their parent contour (rendered with evenodd),
 * while independent overlapping strokes remain in separate groups (each rendered with nonzero).
 * This eliminates white holes at stroke crossings while keeping character holes (日, 口, O, あ) transparent!
 */
export function groupContoursForRendering(contours: PathContour[]): RenderGroup[] {
  if (!contours || contours.length === 0) return [];

  const cached = RENDER_GROUP_CACHE.get(contours);
  if (cached !== undefined) return cached;

  if (contours.length === 1) {
    const single = [
      {
        id: contours[0].id || 'contour-0',
        d: contoursToSvgPath(contours),
        fillRule: 'nonzero' as const,
      },
    ];
    RENDER_GROUP_CACHE.set(contours, single);
    return single;
  }

  const groups = groupContoursWithHoles(contours);

  const result: RenderGroup[] = groups.map((group, idx) => ({
    id: group.map((c) => c.id).join('-') || `group-${idx}`,
    d: contoursToSvgPath(group),
    fillRule: 'nonzero',
  }));

  RENDER_GROUP_CACHE.set(contours, result);
  return result;
}

/**
 * Normalize contour winding for TrueType format standard:
 * - Outer contours: Clockwise in font space = Clockwise in screen space (Area > 0)
 * - Inner holes (e.g. inside of O, 日, 口): Counter-Clockwise in screen space (Area < 0)
 * 
 * Crucially, all overlapping strokes that are NOT nested holes are guaranteed to have the
 * identical positive winding, so Non-Zero Winding rasterizers add them together (+1 + 1 = 2)
 * and NEVER cancel them out into white holes!
 */
export function normalizeGlyphContoursWinding(contours: PathContour[]): PathContour[] {
  if (!contours || contours.length === 0) return [];

  const n = contours.length;
  // Precompute bounding boxes, signed areas, and sampled polygons once for O(1) containment checks
  const bboxes = new Array(n);
  const areas = new Float64Array(n);
  const sampledPolys = new Array<Point[] | null>(n);
  const hitPolys = new Array<Point[] | null>(n);
  for (let i = 0; i < n; i++) {
    const c = contours[i];
    if (c.closed && c.nodes && c.nodes.length >= 3) {
      bboxes[i] = getContoursBoundingBox([c]);
      areas[i] = getContourSignedArea(c);
      sampledPolys[i] = sampleContourPoints(c, 8);
      hitPolys[i] = getContourPolygon(c, 8);
    } else {
      sampledPolys[i] = null;
      hitPolys[i] = null;
    }
  }

  return contours.map((c, i) => {
    if (!c.closed || !c.nodes || c.nodes.length < 3) return c;
    const area = areas[i];
    const bboxI = bboxes[i];
    const sampledI = sampledPolys[i];
    if (!bboxI || !sampledI) return c;

    let enclosingCount = 0;
    const absAreaI = Math.abs(area);
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const bboxJ = bboxes[j];
      const hitPolyJ = hitPolys[j];
      if (!bboxJ || !hitPolyJ) continue;

      if (
        isPrecomputedContourContained(
          bboxI,
          absAreaI,
          sampledI,
          bboxJ,
          Math.abs(areas[j]),
          hitPolyJ
        )
      ) {
        enclosingCount++;
      }
    }

    const isHole = enclosingCount % 2 === 1;
    const targetClockwise = !isHole;
    const isCurrentlyClockwise = area > 0;

    if (isCurrentlyClockwise !== targetClockwise) {
      return reverseContour(c);
    }
    return c;
  });
}

/**
 * Flip multiple contours horizontally around their collective center
 */
