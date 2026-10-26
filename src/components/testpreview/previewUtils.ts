import { PathContour, Point } from '../../types';
import { getContoursBoundingBox, smoothAndFixTransformedContours } from '../../utils/pathUtils';

/**
 * Converts a PathContour into an SVG path data string ('M ... C ... Z')
 */
export function contourToSvgPathData(contour: PathContour): string {
  if (!contour || !contour.nodes || contour.nodes.length === 0) return '';
  let d = '';
  const first = contour.nodes[0];
  d += `M ${first.x} ${first.y}`;
  for (let i = 0; i < contour.nodes.length; i++) {
    const curr = contour.nodes[i];
    const nextIndex = (i + 1) % contour.nodes.length;
    if (nextIndex === 0 && !contour.closed) break;
    const next = contour.nodes[nextIndex];
    if (curr.handleOut || next.handleIn) {
      const h1x = curr.handleOut ? curr.handleOut.x : curr.x;
      const h1y = curr.handleOut ? curr.handleOut.y : curr.y;
      const h2x = next.handleIn ? next.handleIn.x : next.x;
      const h2y = next.handleIn ? next.handleIn.y : next.y;
      d += ` C ${h1x} ${h1y}, ${h2x} ${h2y}, ${next.x} ${next.y}`;
    } else {
      d += ` L ${next.x} ${next.y}`;
    }
  }
  if (contour.closed) d += ' Z';
  return d;
}

/**
 * Transforms glyph contours by shifting center dx, dy and scaling around center by scaleX, scaleY ratios.
 * High subpixel precision and handle-protection to prevent Bezier curve collapsing or path distortion.
 */
export function transformGlyphContours(
  contours: PathContour[],
  dx: number,
  dy: number,
  scaleXRatio: number,
  scaleYRatio: number
): PathContour[] {
  if (!contours || contours.length === 0) return contours;
  const bbox = getContoursBoundingBox(contours);
  const cx = bbox.centerX;
  const cy = bbox.centerY;

  const transformPt = (p: Point): Point => {
    const relX = p.x - cx;
    const relY = p.y - cy;
    return {
      x: Math.round((cx + dx + relX * scaleXRatio) * 100) / 100,
      y: Math.round((cy - dy + relY * scaleYRatio) * 100) / 100,
    };
  };

  const transformed = contours.map((c) => ({
    ...c,
    nodes: c.nodes.map((n) => {
      const newPt = transformPt({ x: n.x, y: n.y });
      let handleIn: Point | null = null;
      if (n.handleIn) {
        if (Math.abs(n.handleIn.x - n.x) < 0.01 && Math.abs(n.handleIn.y - n.y) < 0.01) {
          handleIn = { x: newPt.x, y: newPt.y };
        } else {
          handleIn = transformPt(n.handleIn);
        }
      }
      let handleOut: Point | null = null;
      if (n.handleOut) {
        if (Math.abs(n.handleOut.x - n.x) < 0.01 && Math.abs(n.handleOut.y - n.y) < 0.01) {
          handleOut = { x: newPt.x, y: newPt.y };
        } else {
          handleOut = transformPt(n.handleOut);
        }
      }
      return {
        ...n,
        x: newPt.x,
        y: newPt.y,
        handleIn,
        handleOut,
      };
    }),
  }));

  return smoothAndFixTransformedContours(transformed);
}
