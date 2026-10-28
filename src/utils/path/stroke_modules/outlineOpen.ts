import { PathContour, Point } from "../../../types";
import { strokePointsToOutline } from "./outlineSubdivided";

/**
 * Outline an open contour into a closed stroked contour
 */
export function outlineOpenContour(contour: PathContour, strokeWidth: number = 60): PathContour {
  if (!contour.nodes || contour.nodes.length === 0) return contour;
  if (contour.closed) return contour;

  const pts: Point[] = [];
  // Sample points along contour
  for (let i = 0; i < contour.nodes.length; i++) {
    const node = contour.nodes[i];
    pts.push({ x: node.x, y: node.y });
  }

  return strokePointsToOutline(pts, strokeWidth, 'brush', true);
}
