import { Point } from '../../types';

/**
 * Find closest point on infinite line passing through p1 along p2 or angle
 */
export function projectPointOntoLine(
  point: Point,
  p1: Point,
  p2?: Point,
  angleDeg?: number
): { projected: Point; distance: number } {
  let dx: number;
  let dy: number;

  if (p2 && (Math.abs(p2.x - p1.x) > 0.001 || Math.abs(p2.y - p1.y) > 0.001)) {
    dx = p2.x - p1.x;
    dy = p2.y - p1.y;
  } else if (angleDeg !== undefined) {
    const rad = (angleDeg * Math.PI) / 180;
    dx = Math.cos(rad);
    dy = Math.sin(rad);
  } else {
    return { projected: { ...p1 }, distance: Math.hypot(point.x - p1.x, point.y - p1.y) };
  }

  const length = Math.hypot(dx, dy);
  if (length === 0) {
    return { projected: { ...p1 }, distance: Math.hypot(point.x - p1.x, point.y - p1.y) };
  }

  const ux = dx / length;
  const uy = dy / length;

  const wx = point.x - p1.x;
  const wy = point.y - p1.y;
  const t = wx * ux + wy * uy;

  const projectedX = p1.x + t * ux;
  const projectedY = p1.y + t * uy;

  const distance = Math.hypot(point.x - projectedX, point.y - projectedY);

  return {
    projected: { x: projectedX, y: projectedY },
    distance,
  };
}
