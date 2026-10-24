import * as opentype from 'opentype.js';
import { PathContour } from '../../types';
import { generateId, optimizeContourNodes } from '../pathUtils';
import { SCREEN_BASELINE_Y } from './constants';

/**
 * Convert screen coordinate contours into opentype.Path
 */
export function contoursToOpenTypePath(
  contours: PathContour[],
  baselineY: number = SCREEN_BASELINE_Y
): opentype.Path {
  const path = new opentype.Path();

  // Run node optimization & integer rounding to eliminate decimal table bloat
  const cleanContours = optimizeContourNodes(contours);

  for (const contour of cleanContours) {
    const nodes = contour.nodes;
    if (!nodes || nodes.length === 0) continue;

    const first = nodes[0];
    // Convert Y: Font Y = baselineY - Screen Y with strict NaN sanitization
    const startX = Math.round(Number.isFinite(first.x) ? first.x : 0);
    const startY = Math.round(Number.isFinite(first.y) ? baselineY - first.y : 0);

    path.moveTo(startX, startY);

    for (let i = 0; i < nodes.length; i++) {
      const current = nodes[i];
      const isLast = i === nodes.length - 1;
      const next = isLast ? (contour.closed ? nodes[0] : null) : nodes[i + 1];

      if (!next) break;

      const cp1 = current.handleOut || { x: current.x, y: current.y };
      const cp2 = next.handleIn || { x: next.x, y: next.y };

      const isCp1Default = cp1.x === current.x && cp1.y === current.y;
      const isCp2Default = cp2.x === next.x && cp2.y === next.y;

      const nextX = Math.round(Number.isFinite(next.x) ? next.x : 0);
      const nextY = Math.round(Number.isFinite(next.y) ? baselineY - next.y : 0);

      if (isCp1Default && isCp2Default) {
        path.lineTo(nextX, nextY);
      } else {
        const cp1x = Math.round(Number.isFinite(cp1.x) ? cp1.x : current.x);
        const cp1y = Math.round(Number.isFinite(cp1.y) ? baselineY - cp1.y : baselineY - current.y);
        const cp2x = Math.round(Number.isFinite(cp2.x) ? cp2.x : next.x);
        const cp2y = Math.round(Number.isFinite(cp2.y) ? baselineY - cp2.y : baselineY - next.y);
        path.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, nextX, nextY);
      }
    }

    if (contour.closed !== false) {
      path.close();
    }
  }

  return path;
}

/**
 * Convert opentype.Path commands back to PathContour[] for editor
 */
export function openTypePathToContours(
  otPath: opentype.Path,
  baselineY: number = SCREEN_BASELINE_Y,
  isScreenCoords: boolean = true
): PathContour[] {
  const contours: PathContour[] = [];
  let currentContour: PathContour | null = null;
  let lastPoint = { x: 0, y: 0 };

  const commands = otPath.commands || [];

  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i];

    if (cmd.type === 'M') {
      if (currentContour && currentContour.nodes.length > 0) {
        contours.push(currentContour);
      }
      const nodeX = Math.round(cmd.x);
      const nodeY = isScreenCoords ? Math.round(cmd.y) : Math.round(baselineY - cmd.y);
      currentContour = {
        id: generateId(),
        closed: false,
        nodes: [
          {
            id: generateId(),
            x: nodeX,
            y: nodeY,
            type: 'corner',
          },
        ],
      };
      lastPoint = { x: nodeX, y: nodeY };
    } else if (cmd.type === 'L') {
      if (!currentContour) {
        currentContour = { id: generateId(), closed: false, nodes: [] };
      }
      const nodeX = Math.round(cmd.x);
      const nodeY = isScreenCoords ? Math.round(cmd.y) : Math.round(baselineY - cmd.y);
      currentContour.nodes.push({
        id: generateId(),
        x: nodeX,
        y: nodeY,
        type: 'corner',
      });
      lastPoint = { x: nodeX, y: nodeY };
    } else if (cmd.type === 'C') {
      if (!currentContour) {
        currentContour = { id: generateId(), closed: false, nodes: [] };
      }
      const cp1 = {
        x: Math.round(cmd.x1),
        y: isScreenCoords ? Math.round(cmd.y1) : Math.round(baselineY - cmd.y1),
      };
      const cp2 = {
        x: Math.round(cmd.x2),
        y: isScreenCoords ? Math.round(cmd.y2) : Math.round(baselineY - cmd.y2),
      };
      const nodeX = Math.round(cmd.x);
      const nodeY = isScreenCoords ? Math.round(cmd.y) : Math.round(baselineY - cmd.y);

      if (currentContour.nodes.length > 0) {
        currentContour.nodes[currentContour.nodes.length - 1].handleOut = cp1;
      }

      currentContour.nodes.push({
        id: generateId(),
        x: nodeX,
        y: nodeY,
        handleIn: cp2,
        type: 'smooth',
      });
      lastPoint = { x: nodeX, y: nodeY };
    } else if (cmd.type === 'Q') {
      if (!currentContour) {
        currentContour = { id: generateId(), closed: false, nodes: [] };
      }
      const qx = Math.round(cmd.x1);
      const qy = isScreenCoords ? Math.round(cmd.y1) : Math.round(baselineY - cmd.y1);
      const nodeX = Math.round(cmd.x);
      const nodeY = isScreenCoords ? Math.round(cmd.y) : Math.round(baselineY - cmd.y);

      const cp1x = lastPoint.x + (2 / 3) * (qx - lastPoint.x);
      const cp1y = lastPoint.y + (2 / 3) * (qy - lastPoint.y);
      const cp2x = nodeX + (2 / 3) * (qx - nodeX);
      const cp2y = nodeY + (2 / 3) * (qy - nodeY);

      if (currentContour.nodes.length > 0) {
        currentContour.nodes[currentContour.nodes.length - 1].handleOut = { x: Math.round(cp1x), y: Math.round(cp1y) };
      }

      currentContour.nodes.push({
        id: generateId(),
        x: nodeX,
        y: nodeY,
        handleIn: { x: Math.round(cp2x), y: Math.round(cp2y) },
        type: 'smooth',
      });
      lastPoint = { x: nodeX, y: nodeY };
    } else if (cmd.type === 'Z') {
      if (currentContour) {
        currentContour.closed = true;
        contours.push(currentContour);
        currentContour = null;
      }
    }
  }

  if (currentContour && currentContour.nodes.length > 0) {
    contours.push(currentContour);
  }

  return contours;
}
