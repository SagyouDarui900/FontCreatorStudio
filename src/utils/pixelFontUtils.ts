import { GlyphData, PathContour, Point, BezierNode, PixelDotShape } from '../types';
import { groupContoursWithHoles } from './path/bounds';

/**
 * Resample pixel grid from source dimensions (srcW, srcH) to destination dimensions (dstW, dstH)
 * using nearest-neighbor interpolation.
 */
export function resamplePixelGrid(
  sourceGrid: Uint8Array | number[],
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number
): Uint8Array {
  const result = new Uint8Array(dstW * dstH);
  if (srcW <= 0 || srcH <= 0 || dstW <= 0 || dstH <= 0 || !sourceGrid || sourceGrid.length === 0) {
    return result;
  }

  for (let dy = 0; dy < dstH; dy++) {
    const sy = Math.min(srcH - 1, Math.floor((dy / dstH) * srcH));
    for (let dx = 0; dx < dstW; dx++) {
      const sx = Math.min(srcW - 1, Math.floor((dx / dstW) * srcW));
      const srcIdx = sy * srcW + sx;
      if (srcIdx < sourceGrid.length) {
        result[dy * dstW + dx] = sourceGrid[srcIdx] ? 1 : 0;
      }
    }
  }
  return result;
}

/**
 * Bresenham Line Drawing Algorithm
 */
export function getBresenhamLine(x0: number, y0: number, x1: number, y1: number): Point[] {
  const points: Point[] = [];
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  let cx = x0;
  let cy = y0;

  while (true) {
    points.push({ x: cx, y: cy });
    if (cx === x1 && cy === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      cx += sx;
    }
    if (e2 < dx) {
      err += dx;
      cy += sy;
    }
  }
  return points;
}

/**
 * Midpoint Circle Drawing Algorithm
 */
export function getMidpointCircle(
  cx: number,
  cy: number,
  radius: number,
  filled: boolean = false
): Point[] {
  const points: Point[] = [];
  const visited = new Set<string>();

  const addPt = (x: number, y: number) => {
    const key = `${x},${y}`;
    if (!visited.has(key)) {
      visited.add(key);
      points.push({ x, y });
    }
  };

  if (radius <= 0) {
    addPt(cx, cy);
    return points;
  }

  let x = radius;
  let y = 0;
  let p = 1 - radius;

  const plotSymmetric = (x: number, y: number) => {
    if (filled) {
      for (let ix = cx - x; ix <= cx + x; ix++) {
        addPt(ix, cy + y);
        addPt(ix, cy - y);
      }
      for (let ix = cx - y; ix <= cx + y; ix++) {
        addPt(ix, cy + x);
        addPt(ix, cy - x);
      }
    } else {
      addPt(cx + x, cy + y);
      addPt(cx - x, cy + y);
      addPt(cx + x, cy - y);
      addPt(cx - x, cy - y);
      addPt(cx + y, cy + x);
      addPt(cx - y, cy + x);
      addPt(cx + y, cy - x);
      addPt(cx - y, cy - x);
    }
  };

  plotSymmetric(x, y);

  while (x > y) {
    y++;
    if (p <= 0) {
      p += 2 * y + 1;
    } else {
      x--;
      p += 2 * (y - x) + 1;
    }
    if (x < y) break;
    plotSymmetric(x, y);
  }

  return points;
}

/**
 * Flood fill algorithm for bucket tool
 */
export function floodFill(
  grid: Uint8Array,
  width: number,
  height: number,
  startX: number,
  startY: number,
  targetVal: number,
  fillVal: number
): void {
  if (targetVal === fillVal) return;
  if (startX < 0 || startX >= width || startY < 0 || startY >= height) return;

  const startIndex = startY * width + startX;
  if (grid[startIndex] !== targetVal) return;

  const queue: [number, number][] = [[startX, startY]];
  grid[startIndex] = fillVal;

  while (queue.length > 0) {
    const [cx, cy] = queue.pop()!;
    const neighbors: [number, number][] = [
      [cx + 1, cy],
      [cx - 1, cy],
      [cx, cy + 1],
      [cx, cy - 1],
    ];

    for (const [nx, ny] of neighbors) {
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const nIndex = ny * width + nx;
        if (grid[nIndex] === targetVal) {
          grid[nIndex] = fillVal;
          queue.push([nx, ny]);
        }
      }
    }
  }
}

/**
 * Convert 2D Pixel Grid into Vector Path Contours (in editor Screen Coordinates: Y=0 top, Y=effectiveEm bottom).
 * Uses integer grid-vertex edge marching to merge adjacent pixels into optimal clockwise outer / CCW hole polygons.
 */
export function pixelGridToContours(
  grid: Uint8Array,
  width: number,
  height: number,
  _unitsPerEm: number = 1000,
  ascender: number = 800,
  descender: number = -200,
  advanceWidth: number = 1000,
  shape: PixelDotShape = 'square',
  mergeOptimized: boolean = true,
  marginPercent: number = 0.08
): PathContour[] {
  const contours: PathContour[] = [];

  if (width <= 0 || height <= 0 || !grid || grid.length === 0) return [];

  const effectiveEm = Math.max(10, ascender - descender);
  const marginY = effectiveEm * marginPercent;
  const marginX = Math.max(10, advanceWidth) * marginPercent;

  const usableWidth = Math.max(10, advanceWidth - 2 * marginX);
  const usableHeight = Math.max(10, effectiveEm - 2 * marginY);

  const cellW = usableWidth / width;
  const cellH = usableHeight / height;

  const originX = marginX;
  const topY = marginY;

  // Screen coordinates: y0 < y1 (top to bottom)
  const getCellBounds = (gx: number, gy: number) => {
    const x0 = originX + gx * cellW;
    const x1 = originX + (gx + 1) * cellW;
    const y0 = topY + gy * cellH;
    const y1 = topY + (gy + 1) * cellH;
    return { x0, x1, y0, y1 };
  };

  // If shape is round/squircle/diamond or merge is disabled, generate individual clockwise dot contours
  if (shape !== 'square' || !mergeOptimized) {
    let dotId = 0;
    for (let gy = 0; gy < height; gy++) {
      for (let gx = 0; gx < width; gx++) {
        if (grid[gy * width + gx] === 1) {
          const { x0, x1, y0, y1 } = getCellBounds(gx, gy);
          const cx = (x0 + x1) / 2;
          const cy = (y0 + y1) / 2;
          const r = Math.min(cellW, cellH) / 2;

          if (shape === 'round') {
            const kappa = 0.5522847498;
            const o = r * kappa;
            const id = dotId++;
            contours.push({
              id: `dot_${id}`,
              closed: true,
              nodes: [
                {
                  id: `d_${id}_0`,
                  x: cx,
                  y: cy - r,
                  type: 'smooth',
                  handleIn: { x: cx - o, y: cy - r },
                  handleOut: { x: cx + o, y: cy - r },
                },
                {
                  id: `d_${id}_1`,
                  x: cx + r,
                  y: cy,
                  type: 'smooth',
                  handleIn: { x: cx + r, y: cy - o },
                  handleOut: { x: cx + r, y: cy + o },
                },
                {
                  id: `d_${id}_2`,
                  x: cx,
                  y: cy + r,
                  type: 'smooth',
                  handleIn: { x: cx + o, y: cy + r },
                  handleOut: { x: cx - o, y: cy + r },
                },
                {
                  id: `d_${id}_3`,
                  x: cx - r,
                  y: cy,
                  type: 'smooth',
                  handleIn: { x: cx - r, y: cy + o },
                  handleOut: { x: cx - r, y: cy - o },
                },
              ],
            });
          } else if (shape === 'squircle') {
            const inset = Math.min(cellW, cellH) * 0.04;
            const sx0 = x0 + inset;
            const sx1 = x1 - inset;
            const sy0 = y0 + inset;
            const sy1 = y1 - inset;
            const cr = Math.min(sx1 - sx0, sy1 - sy0) * 0.28;
            const k = cr * 0.5522847498;
            const id = dotId++;
            contours.push({
              id: `dot_${id}`,
              closed: true,
              nodes: [
                { id: `d_${id}_0`, x: sx0 + cr, y: sy0, type: 'smooth', handleIn: { x: sx0 + cr - k, y: sy0 }, handleOut: null },
                { id: `d_${id}_1`, x: sx1 - cr, y: sy0, type: 'smooth', handleIn: null, handleOut: { x: sx1 - cr + k, y: sy0 } },
                { id: `d_${id}_2`, x: sx1, y: sy0 + cr, type: 'smooth', handleIn: { x: sx1, y: sy0 + cr - k }, handleOut: null },
                { id: `d_${id}_3`, x: sx1, y: sy1 - cr, type: 'smooth', handleIn: null, handleOut: { x: sx1, y: sy1 - cr + k } },
                { id: `d_${id}_4`, x: sx1 - cr, y: sy1, type: 'smooth', handleIn: { x: sx1 - cr + k, y: sy1 }, handleOut: null },
                { id: `d_${id}_5`, x: sx0 + cr, y: sy1, type: 'smooth', handleIn: null, handleOut: { x: sx0 + cr - k, y: sy1 } },
                { id: `d_${id}_6`, x: sx0, y: sy1 - cr, type: 'smooth', handleIn: { x: sx0, y: sy1 - cr + k }, handleOut: null },
                { id: `d_${id}_7`, x: sx0, y: sy0 + cr, type: 'smooth', handleIn: null, handleOut: { x: sx0, y: sy0 + cr - k } },
              ],
            });
          } else if (shape === 'diamond') {
            const id = dotId++;
            contours.push({
              id: `dot_${id}`,
              closed: true,
              nodes: [
                { id: `d_${id}_0`, x: cx, y: y0, type: 'corner' },
                { id: `d_${id}_1`, x: x1, y: cy, type: 'corner' },
                { id: `d_${id}_2`, x: cx, y: y1, type: 'corner' },
                { id: `d_${id}_3`, x: x0, y: cy, type: 'corner' },
              ],
            });
          } else {
            // Square (individual, clockwise in screen space)
            const id = dotId++;
            const rx0 = Math.round(x0);
            const rx1 = Math.round(x1);
            const ry0 = Math.round(y0);
            const ry1 = Math.round(y1);
            contours.push({
              id: `dot_${id}`,
              closed: true,
              nodes: [
                { id: `d_${id}_0`, x: rx0, y: ry0, type: 'corner' },
                { id: `d_${id}_1`, x: rx1, y: ry0, type: 'corner' },
                { id: `d_${id}_2`, x: rx1, y: ry1, type: 'corner' },
                { id: `d_${id}_3`, x: rx0, y: ry1, type: 'corner' },
              ],
            });
          }
        }
      }
    }
    return contours;
  }

  // Merged Square Contours using exact integer Grid-Vertex Edge Marching.
  // In screen coordinates (Y-down), keeping the filled pixel on the RIGHT side of each directed edge
  // produces Clockwise outer contours (signed area > 0) and Counter-Clockwise holes (signed area < 0).
  interface GridEdge {
    gx0: number;
    gy0: number;
    gx1: number;
    gy1: number;
  }
  const edges: GridEdge[] = [];

  const getPixel = (gx: number, gy: number) => {
    if (gx < 0 || gx >= width || gy < 0 || gy >= height) return 0;
    return grid[gy * width + gx] ? 1 : 0;
  };

  for (let gy = 0; gy < height; gy++) {
    for (let gx = 0; gx < width; gx++) {
      if (getPixel(gx, gy) === 1) {
        // Top edge: (gx, gy) -> (gx+1, gy)
        if (getPixel(gx, gy - 1) === 0) {
          edges.push({ gx0: gx, gy0: gy, gx1: gx + 1, gy1: gy });
        }
        // Right edge: (gx+1, gy) -> (gx+1, gy+1)
        if (getPixel(gx + 1, gy) === 0) {
          edges.push({ gx0: gx + 1, gy0: gy, gx1: gx + 1, gy1: gy + 1 });
        }
        // Bottom edge: (gx+1, gy+1) -> (gx, gy+1)
        if (getPixel(gx, gy + 1) === 0) {
          edges.push({ gx0: gx + 1, gy0: gy + 1, gx1: gx, gy1: gy + 1 });
        }
        // Left edge: (gx, gy+1) -> (gx, gy)
        if (getPixel(gx - 1, gy) === 0) {
          edges.push({ gx0: gx, gy0: gy + 1, gx1: gx, gy1: gy });
        }
      }
    }
  }

  if (edges.length === 0) return [];

  const edgeMap = new Map<string, GridEdge[]>();
  const vertexKey = (gx: number, gy: number) => `${gx},${gy}`;

  for (const e of edges) {
    const k = vertexKey(e.gx0, e.gy0);
    let list = edgeMap.get(k);
    if (!list) {
      list = [];
      edgeMap.set(k, list);
    }
    list.push(e);
  }

  const used = new Set<GridEdge>();
  let contourId = 0;

  for (const startEdge of edges) {
    if (used.has(startEdge)) continue;

    const startKey = vertexKey(startEdge.gx0, startEdge.gy0);
    const loopVertices: { gx: number; gy: number }[] = [{ gx: startEdge.gx0, gy: startEdge.gy0 }];
    used.add(startEdge);
    let curr = startEdge;

    while (true) {
      const nextKey = vertexKey(curr.gx1, curr.gy1);
      const candidates = edgeMap.get(nextKey) || [];
      const available = candidates.filter((cand) => !used.has(cand));

      // Include startEdge when back at startKey so we know whether the loop closes onto startEdge
      const turnChoices = nextKey === startKey ? [...available, startEdge] : available;

      if (turnChoices.length === 0) {
        break;
      }

      let nextEdge: GridEdge;
      if (turnChoices.length === 1) {
        nextEdge = turnChoices[0];
      } else {
        // At 4-way diagonal checkerboard vertices, turn as sharply RIGHT (clockwise in screen space)
        // as possible to hug the filled pixel on the right and prevent figure-8 crossings.
        const curDx = curr.gx1 - curr.gx0;
        const curDy = curr.gy1 - curr.gy0;
        let bestEdge = turnChoices[0];
        let maxTurn = -Infinity;

        for (const cand of turnChoices) {
          const candDx = cand.gx1 - cand.gx0;
          const candDy = cand.gy1 - cand.gy0;
          const cross = curDx * candDy - curDy * candDx;
          const dot = curDx * candDx + curDy * candDy;
          const angle = Math.atan2(cross, dot);
          if (angle > maxTurn) {
            maxTurn = angle;
            bestEdge = cand;
          }
        }
        nextEdge = bestEdge;
      }

      if (nextEdge === startEdge) {
        // Closed cleanly back onto startEdge without duplicating the starting vertex
        break;
      }

      loopVertices.push({ gx: curr.gx1, gy: curr.gy1 });
      used.add(nextEdge);
      curr = nextEdge;
    }

    if (loopVertices.length >= 3) {
      // Remove collinear intermediate vertices in exact integer grid space
      const simplified: { gx: number; gy: number }[] = [];
      const numPts = loopVertices.length;

      for (let j = 0; j < numPts; j++) {
        const prev = loopVertices[(j - 1 + numPts) % numPts];
        const v = loopVertices[j];
        const next = loopVertices[(j + 1) % numPts];

        const isHorizontal = prev.gy === v.gy && v.gy === next.gy;
        const isVertical = prev.gx === v.gx && v.gx === next.gx;

        if (!isHorizontal && !isVertical) {
          simplified.push(v);
        }
      }

      if (simplified.length >= 3) {
        const cId = contourId++;
        const nodes: BezierNode[] = simplified.map((v, idx) => ({
          id: `node_px_${cId}_${idx}`,
          x: Math.round(originX + v.gx * cellW),
          y: Math.round(topY + v.gy * cellH),
          type: 'corner',
        }));
        contours.push({
          id: `contour_px_${cId}`,
          nodes,
          closed: true,
        });
      }
    }
  }

  return contours;
}

/**
 * Rasterize Vector Contours (stored in editor Screen Coordinates) onto a Binary Pixel Grid
 */
export function rasterizeGlyphToPixelGrid(
  glyph: GlyphData,
  width: number,
  height: number,
  _unitsPerEm: number = 1000,
  ascender: number = 800,
  descender: number = -200,
  marginPercent: number = 0.08
): Uint8Array {
  if (width <= 0 || height <= 0) return new Uint8Array(0);
  const grid = new Uint8Array(width * height);
  if (!glyph.contours || glyph.contours.length === 0) return grid;

  if (typeof document === 'undefined') return grid;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return grid;

  const effectiveEm = Math.max(10, ascender - descender);
  const marginY = effectiveEm * marginPercent;
  const advWidth = Math.max(10, glyph.advanceWidth || 1000);
  const marginX = advWidth * marginPercent;

  const usableWidth = Math.max(10, advWidth - 2 * marginX);
  const usableHeight = Math.max(10, effectiveEm - 2 * marginY);

  const scaleX = width / usableWidth;
  const scaleY = height / usableHeight;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#000000';

  const groups = groupContoursWithHoles(glyph.contours);

  for (const group of groups) {
    ctx.beginPath();
    for (const contour of group) {
      if (!contour.nodes || contour.nodes.length === 0) continue;
      const nodes = contour.nodes;
      const toPxX = (x: number) => (x - marginX) * scaleX;
      const toPxY = (y: number) => (y - marginY) * scaleY;

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const px = toPxX(node.x);
        const py = toPxY(node.y);

        if (i === 0) {
          ctx.moveTo(px, py);
        } else {
          const prev = nodes[i - 1];
          if (prev.handleOut || node.handleIn) {
            const cp1 = prev.handleOut || prev;
            const cp2 = node.handleIn || node;
            ctx.bezierCurveTo(toPxX(cp1.x), toPxY(cp1.y), toPxX(cp2.x), toPxY(cp2.y), px, py);
          } else {
            ctx.lineTo(px, py);
          }
        }
      }

      if (contour.closed !== false && nodes.length > 1) {
        const last = nodes[nodes.length - 1];
        const first = nodes[0];
        if (last.handleOut || first.handleIn) {
          const cp1 = last.handleOut || last;
          const cp2 = first.handleIn || first;
          ctx.bezierCurveTo(
            toPxX(cp1.x),
            toPxY(cp1.y),
            toPxX(cp2.x),
            toPxY(cp2.y),
            toPxX(first.x),
            toPxY(first.y)
          );
        }
        ctx.closePath();
      }
    }
    ctx.fill('evenodd');
  }

  const imgData = ctx.getImageData(0, 0, width, height).data;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const brightness = imgData[idx]; // 0 is black (filled), 255 is white
      if (brightness < 128) {
        grid[y * width + x] = 1;
      }
    }
  }

  return grid;
}
