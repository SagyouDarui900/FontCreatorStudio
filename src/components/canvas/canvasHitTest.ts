import { PathContour, Point } from '../../types';
import { getCachedContourSvgPath } from './cursors';

// Hit testing for right-click selection on the canvas. The fill/stroke test
// reuses the same cached SVG path that InteractiveContourHitLayer renders
// (getCachedContourSvgPath), through Path2D when a 2D canvas context is
// available. When it is not (for example in a non-DOM test environment),
// the test falls back to a bounding-box check plus a point-in-polygon test
// for closed contours and a distance-to-segment test for open contours.

export function getContourBounds(contour: PathContour): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
} | null {
  if (!contour.nodes || contour.nodes.length === 0) return null;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const n of contour.nodes) {
    if (n.x < minX) minX = n.x;
    if (n.x > maxX) maxX = n.x;
    if (n.y < minY) minY = n.y;
    if (n.y > maxY) maxY = n.y;
  }
  return { minX, maxX, minY, maxY };
}

export function isPointInPolygon(point: Point, vertices: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i].x;
    const yi = vertices[i].y;
    const xj = vertices[j].x;
    const yj = vertices[j].y;
    if (
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
  }
  return inside;
}

function distanceToSegment(point: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  let t = 0;
  if (lenSq > 0) {
    t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lenSq));
  }
  const cx = a.x + t * dx;
  const cy = a.y + t * dy;
  return Math.hypot(point.x - cx, point.y - cy);
}

function isNearContourOutline(point: Point, contour: PathContour, tolerance: number): boolean {
  const nodes = contour.nodes;
  if (!nodes || nodes.length === 0) return false;
  const segments = contour.closed ? nodes.length : nodes.length - 1;
  for (let i = 0; i < segments; i++) {
    const a = nodes[i];
    const b = nodes[(i + 1) % nodes.length];
    if (distanceToSegment(point, a, b) <= tolerance) return true;
  }
  return false;
}

let sharedCtx: CanvasRenderingContext2D | null | undefined;

function getSharedCtx(): CanvasRenderingContext2D | null {
  if (sharedCtx !== undefined) return sharedCtx;
  sharedCtx = null;
  try {
    if (typeof document !== 'undefined' && typeof Path2D !== 'undefined') {
      const canvas = document.createElement('canvas');
      sharedCtx = canvas.getContext('2d');
    }
  } catch {
    sharedCtx = null;
  }
  return sharedCtx;
}

function hitTestWithPath2D(
  contour: PathContour,
  point: Point,
  strokeTolerance: number
): boolean | null {
  const ctx = getSharedCtx();
  if (!ctx) return null;
  try {
    const path = new Path2D(getCachedContourSvgPath(contour));
    if (ctx.isPointInPath(path, point.x, point.y)) return true;
    ctx.lineWidth = strokeTolerance * 2;
    if (ctx.isPointInStroke(path, point.x, point.y)) return true;
    return false;
  } catch {
    return null;
  }
}

export function hitTestContour(
  contour: PathContour,
  point: Point,
  strokeTolerance = 8
): boolean {
  const bounds = getContourBounds(contour);
  if (!bounds) return false;
  if (
    point.x < bounds.minX - strokeTolerance ||
    point.x > bounds.maxX + strokeTolerance ||
    point.y < bounds.minY - strokeTolerance ||
    point.y > bounds.maxY + strokeTolerance
  ) {
    return false;
  }
  const pathResult = hitTestWithPath2D(contour, point, strokeTolerance);
  if (pathResult !== null) return pathResult;
  if (contour.closed && isPointInPolygon(point, contour.nodes)) return true;
  return isNearContourOutline(point, contour, strokeTolerance);
}

// Returns the id of the topmost contour under the point, or null. Contours
// later in the array are drawn on top, so the search runs in reverse order.
export function hitTestContours(
  contours: PathContour[],
  point: Point,
  strokeTolerance = 8
): string | null {
  for (let i = contours.length - 1; i >= 0; i--) {
    if (hitTestContour(contours[i], point, strokeTolerance)) {
      return contours[i].id;
    }
  }
  return null;
}
