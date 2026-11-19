import { PathContour, Point } from "../../../types";
import { sampleContourPoints } from "../bounds";
import { strokePointsToOutline } from "./outlineSubdivided";

/**
 * Outline an open contour into a closed stroked contour (preserving Bezier curves)
 */
export function outlineOpenContour(contour: PathContour, strokeWidth: number = 60): PathContour {
  if (!contour.nodes || contour.nodes.length === 0) return contour;
  if (contour.closed) return contour;

  const hasCurves = contour.nodes.some((n) => n.handleIn != null || n.handleOut != null);
  const pts: Point[] = hasCurves
    ? sampleContourPoints(contour, 10)
    : contour.nodes.map((node) => ({ x: node.x, y: node.y }));

  if (pts.length === 0) return contour;
  return strokePointsToOutline(pts, strokeWidth, 'brush', true);
}

