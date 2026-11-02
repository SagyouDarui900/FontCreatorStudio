import { BezierNode, PathContour, Point } from '../types';
import { generateId, getContoursBoundingBox, transformContours } from './pathUtils';

export interface SvgParseResult {
  contours: PathContour[];
  width: number;
  height: number;
  rawPathCount: number;
}

/**
 * Parses SVG XML string and extracts all vector paths, polygons, rectangles, circles
 * and converts them into the app's internal PathContour[] cubic Bezier format.
 */
export function parseSvgStringToContours(
  svgString: string,
  fitTo1000Em: boolean = true
): SvgParseResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');

  const parserError = doc.querySelector('parsererror');
  if (parserError) {
    throw new Error('SVGファイルの解析に失敗しました: XML構文エラー');
  }

  const svgEl = doc.querySelector('svg');
  let viewBoxW = 1000;
  let viewBoxH = 1000;

  if (svgEl) {
    const viewBoxAttr = svgEl.getAttribute('viewBox');
    if (viewBoxAttr) {
      const parts = viewBoxAttr.trim().split(/[\s,]+/).map(Number);
      if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
        viewBoxW = parts[2];
        viewBoxH = parts[3];
      }
    } else {
      const w = parseFloat(svgEl.getAttribute('width') || '1000');
      const h = parseFloat(svgEl.getAttribute('height') || '1000');
      if (!isNaN(w) && w > 0) viewBoxW = w;
      if (!isNaN(h) && h > 0) viewBoxH = h;
    }
  }

  const contours: PathContour[] = [];

  // 1. Process <path> elements
  const pathElements = doc.querySelectorAll('path');
  pathElements.forEach((path) => {
    const d = path.getAttribute('d');
    if (d) {
      let parsed = parseSvgPathData(d);
      const transformAttr = path.getAttribute('transform');
      if (transformAttr) {
        parsed = applyElementTransform(parsed, transformAttr);
      }
      contours.push(...parsed);
    }
  });

  // 2. Process <rect> elements
  const rectElements = doc.querySelectorAll('rect');
  rectElements.forEach((rect) => {
    const x = parseFloat(rect.getAttribute('x') || '0');
    const y = parseFloat(rect.getAttribute('y') || '0');
    const width = parseFloat(rect.getAttribute('width') || '0');
    const height = parseFloat(rect.getAttribute('height') || '0');
    if (width > 0 && height > 0) {
      let rectContour = [createRectContourDirect(x, y, width, height)];
      const transformAttr = rect.getAttribute('transform');
      if (transformAttr) {
        rectContour = applyElementTransform(rectContour, transformAttr);
      }
      contours.push(...rectContour);
    }
  });

  // 3. Process <circle> and <ellipse> elements
  const circleElements = doc.querySelectorAll('circle');
  circleElements.forEach((c) => {
    const cx = parseFloat(c.getAttribute('cx') || '0');
    const cy = parseFloat(c.getAttribute('cy') || '0');
    const r = parseFloat(c.getAttribute('r') || '0');
    if (r > 0) {
      let circleContour = [createEllipseContourDirect(cx, cy, r, r)];
      const transformAttr = c.getAttribute('transform');
      if (transformAttr) {
        circleContour = applyElementTransform(circleContour, transformAttr);
      }
      contours.push(...circleContour);
    }
  });

  const ellipseElements = doc.querySelectorAll('ellipse');
  ellipseElements.forEach((el) => {
    const cx = parseFloat(el.getAttribute('cx') || '0');
    const cy = parseFloat(el.getAttribute('cy') || '0');
    const rx = parseFloat(el.getAttribute('rx') || '0');
    const ry = parseFloat(el.getAttribute('ry') || '0');
    if (rx > 0 && ry > 0) {
      let ellipseContour = [createEllipseContourDirect(cx, cy, rx, ry)];
      const transformAttr = el.getAttribute('transform');
      if (transformAttr) {
        ellipseContour = applyElementTransform(ellipseContour, transformAttr);
      }
      contours.push(...ellipseContour);
    }
  });

  // 4. Process <polygon> and <polyline> elements
  const polyElements = doc.querySelectorAll('polygon, polyline');
  polyElements.forEach((poly) => {
    const pointsAttr = poly.getAttribute('points');
    if (pointsAttr) {
      const nums = pointsAttr.trim().split(/[\s,]+/).map(Number);
      const isClosed = poly.tagName.toLowerCase() === 'polygon';
      const nodes: BezierNode[] = [];
      for (let i = 0; i + 1 < nums.length; i += 2) {
        nodes.push({
          id: generateId(),
          x: nums[i],
          y: nums[i + 1],
          type: 'corner',
        });
      }
      if (nodes.length > 1) {
        let polyContour = [{
          id: generateId(),
          closed: isClosed,
          nodes,
        }];
        const transformAttr = poly.getAttribute('transform');
        if (transformAttr) {
          polyContour = applyElementTransform(polyContour, transformAttr);
        }
        contours.push(...polyContour);
      }
    }
  });

  if (contours.length === 0) {
    return {
      contours: [],
      width: viewBoxW,
      height: viewBoxH,
      rawPathCount: 0,
    };
  }

  // 5. Fit contours into standard 1000x1000 coordinate system if requested
  let finalContours = contours;
  if (fitTo1000Em) {
    const bbox = getContoursBoundingBox(contours);
    if (bbox.width > 0 && bbox.height > 0) {
      const margin = 80;
      const targetSize = 1000 - margin * 2;
      const scale = Math.min(targetSize / bbox.width, targetSize / bbox.height);
      const targetX = margin + (targetSize - bbox.width * scale) / 2;
      const targetY = margin + (targetSize - bbox.height * scale) / 2;

      finalContours = transformContours(contours, (p) => ({
        x: Math.round(targetX + (p.x - bbox.minX) * scale),
        y: Math.round(targetY + (p.y - bbox.minY) * scale),
      }));
    }
  }

  return {
    contours: finalContours,
    width: viewBoxW,
    height: viewBoxH,
    rawPathCount: contours.length,
  };
}

/**
 * Parses standard SVG `d` attribute into PathContour[]
 * Supports M, m, L, l, H, h, V, v, C, c, S, s, Q, q, T, t, A, a, Z, z
 */
export function parseSvgPathData(d: string): PathContour[] {
  const contours: PathContour[] = [];
  const commandRegex = /([a-df-z])([^a-df-z]*)/gi;
  let match: RegExpExecArray | null;

  let currentPos: Point = { x: 0, y: 0 };
  let startPos: Point = { x: 0, y: 0 };
  let currentContour: PathContour | null = null;
  let prevControlPoint: Point | null = null;

  const ensureContour = () => {
    if (!currentContour) {
      currentContour = {
        id: generateId(),
        closed: false,
        nodes: [{ id: generateId(), x: currentPos.x, y: currentPos.y, type: 'corner' }],
      };
    }
  };

  while ((match = commandRegex.exec(d)) !== null) {
    const cmd = match[1];
    const isRelative = cmd === cmd.toLowerCase();
    const upperCmd = cmd.toUpperCase();
    const args = parseNumbers(match[2]);
    let argIdx = 0;

    switch (upperCmd) {
      case 'M': {
        // Move to
        if (currentContour && currentContour.nodes.length > 0) {
          contours.push(currentContour);
          currentContour = null;
        }
        if (args.length >= 2) {
          const x = isRelative ? currentPos.x + args[0] : args[0];
          const y = isRelative ? currentPos.y + args[1] : args[1];
          currentPos = { x, y };
          startPos = { x, y };
          currentContour = {
            id: generateId(),
            closed: false,
            nodes: [{ id: generateId(), x, y, type: 'corner' }],
          };
          prevControlPoint = null;
          argIdx = 2;

          // Subsequent coordinates are implicit L / l
          while (argIdx + 1 < args.length) {
            const lx = isRelative ? currentPos.x + args[argIdx++] : args[argIdx++];
            const ly = isRelative ? currentPos.y + args[argIdx++] : args[argIdx++];
            currentContour.nodes.push({ id: generateId(), x: lx, y: ly, type: 'corner' });
            currentPos = { x: lx, y: ly };
          }
        }
        break;
      }

      case 'L': {
        // Line to
        ensureContour();
        while (argIdx + 1 < args.length) {
          const x = isRelative ? currentPos.x + args[argIdx++] : args[argIdx++];
          const y = isRelative ? currentPos.y + args[argIdx++] : args[argIdx++];
          currentContour!.nodes.push({ id: generateId(), x, y, type: 'corner' });
          currentPos = { x, y };
          prevControlPoint = null;
        }
        break;
      }

      case 'H': {
        // Horizontal Line to
        ensureContour();
        while (argIdx < args.length) {
          const x = isRelative ? currentPos.x + args[argIdx++] : args[argIdx++];
          currentContour!.nodes.push({
            id: generateId(),
            x,
            y: currentPos.y,
            type: 'corner',
          });
          currentPos = { x, y: currentPos.y };
          prevControlPoint = null;
        }
        break;
      }

      case 'V': {
        // Vertical Line to
        ensureContour();
        while (argIdx < args.length) {
          const y = isRelative ? currentPos.y + args[argIdx++] : args[argIdx++];
          currentContour!.nodes.push({
            id: generateId(),
            x: currentPos.x,
            y,
            type: 'corner',
          });
          currentPos = { x: currentPos.x, y };
          prevControlPoint = null;
        }
        break;
      }

      case 'C': {
        // Cubic Bezier curve
        ensureContour();
        while (argIdx + 5 < args.length) {
          const cp1x = isRelative ? currentPos.x + args[argIdx++] : args[argIdx++];
          const cp1y = isRelative ? currentPos.y + args[argIdx++] : args[argIdx++];
          const cp2x = isRelative ? currentPos.x + args[argIdx++] : args[argIdx++];
          const cp2y = isRelative ? currentPos.y + args[argIdx++] : args[argIdx++];
          const x = isRelative ? currentPos.x + args[argIdx++] : args[argIdx++];
          const y = isRelative ? currentPos.y + args[argIdx++] : args[argIdx++];

          const lastNode = currentContour!.nodes[currentContour!.nodes.length - 1];
          if (lastNode) {
            lastNode.handleOut = { x: cp1x, y: cp1y };
          }

          const newNode: BezierNode = {
            id: generateId(),
            x,
            y,
            type: 'smooth',
            handleIn: { x: cp2x, y: cp2y },
          };
          currentContour!.nodes.push(newNode);

          prevControlPoint = { x: cp2x, y: cp2y };
          currentPos = { x, y };
        }
        break;
      }

      case 'S': {
        // Smooth Cubic Bezier
        ensureContour();
        while (argIdx + 3 < args.length) {
          let cp1x = currentPos.x;
          let cp1y = currentPos.y;
          if (prevControlPoint) {
            cp1x = 2 * currentPos.x - prevControlPoint.x;
            cp1y = 2 * currentPos.y - prevControlPoint.y;
          }

          const cp2x = isRelative ? currentPos.x + args[argIdx++] : args[argIdx++];
          const cp2y = isRelative ? currentPos.y + args[argIdx++] : args[argIdx++];
          const x = isRelative ? currentPos.x + args[argIdx++] : args[argIdx++];
          const y = isRelative ? currentPos.y + args[argIdx++] : args[argIdx++];

          const lastNode = currentContour!.nodes[currentContour!.nodes.length - 1];
          if (lastNode) {
            lastNode.handleOut = { x: cp1x, y: cp1y };
          }

          const newNode: BezierNode = {
            id: generateId(),
            x,
            y,
            type: 'smooth',
            handleIn: { x: cp2x, y: cp2y },
          };
          currentContour!.nodes.push(newNode);

          prevControlPoint = { x: cp2x, y: cp2y };
          currentPos = { x, y };
        }
        break;
      }

      case 'Q': {
        // Quadratic Bezier -> Elevate to Cubic Bezier
        ensureContour();
        while (argIdx + 3 < args.length) {
          const qpx = isRelative ? currentPos.x + args[argIdx++] : args[argIdx++];
          const qpy = isRelative ? currentPos.y + args[argIdx++] : args[argIdx++];
          const x = isRelative ? currentPos.x + args[argIdx++] : args[argIdx++];
          const y = isRelative ? currentPos.y + args[argIdx++] : args[argIdx++];

          // Elevate Quadratic (p0, qp, p1) to Cubic (cp1, cp2)
          const cp1x = currentPos.x + (2 / 3) * (qpx - currentPos.x);
          const cp1y = currentPos.y + (2 / 3) * (qpy - currentPos.y);
          const cp2x = x + (2 / 3) * (qpx - x);
          const cp2y = y + (2 / 3) * (qpy - y);

          const lastNode = currentContour!.nodes[currentContour!.nodes.length - 1];
          if (lastNode) {
            lastNode.handleOut = { x: cp1x, y: cp1y };
          }

          const newNode: BezierNode = {
            id: generateId(),
            x,
            y,
            type: 'smooth',
            handleIn: { x: cp2x, y: cp2y },
          };
          currentContour!.nodes.push(newNode);

          prevControlPoint = { x: qpx, y: qpy };
          currentPos = { x, y };
        }
        break;
      }

      case 'T': {
        // Smooth Quadratic Bezier -> Elevate to Cubic Bezier
        ensureContour();
        while (argIdx + 1 < args.length) {
          let qpx = currentPos.x;
          let qpy = currentPos.y;
          if (prevControlPoint) {
            qpx = 2 * currentPos.x - prevControlPoint.x;
            qpy = 2 * currentPos.y - prevControlPoint.y;
          }

          const x = isRelative ? currentPos.x + args[argIdx++] : args[argIdx++];
          const y = isRelative ? currentPos.y + args[argIdx++] : args[argIdx++];

          const cp1x = currentPos.x + (2 / 3) * (qpx - currentPos.x);
          const cp1y = currentPos.y + (2 / 3) * (qpy - currentPos.y);
          const cp2x = x + (2 / 3) * (qpx - x);
          const cp2y = y + (2 / 3) * (qpy - y);

          const lastNode = currentContour!.nodes[currentContour!.nodes.length - 1];
          if (lastNode) {
            lastNode.handleOut = { x: cp1x, y: cp1y };
          }

          const newNode: BezierNode = {
            id: generateId(),
            x,
            y,
            type: 'smooth',
            handleIn: { x: cp2x, y: cp2y },
          };
          currentContour!.nodes.push(newNode);

          prevControlPoint = { x: qpx, y: qpy };
          currentPos = { x, y };
        }
        break;
      }

      case 'A': {
        // Elliptical Arc -> Convert to Cubic Bezier segments
        ensureContour();
        while (argIdx + 6 < args.length) {
          const rx = args[argIdx++];
          const ry = args[argIdx++];
          const angle = args[argIdx++];
          const largeArcFlag = Boolean(args[argIdx++]);
          const sweepFlag = Boolean(args[argIdx++]);
          const endX = isRelative ? currentPos.x + args[argIdx++] : args[argIdx++];
          const endY = isRelative ? currentPos.y + args[argIdx++] : args[argIdx++];

          const segments = arcToBeziers(
            currentPos.x,
            currentPos.y,
            rx,
            ry,
            angle,
            largeArcFlag,
            sweepFlag,
            endX,
            endY
          );

          for (const seg of segments) {
            const lastNode = currentContour!.nodes[currentContour!.nodes.length - 1];
            if (lastNode) {
              lastNode.handleOut = { x: seg.cp1.x, y: seg.cp1.y };
            }
            const newNode: BezierNode = {
              id: generateId(),
              x: seg.end.x,
              y: seg.end.y,
              type: 'smooth',
              handleIn: { x: seg.cp2.x, y: seg.cp2.y },
            };
            currentContour!.nodes.push(newNode);
          }

          currentPos = { x: endX, y: endY };
          prevControlPoint = null;
        }
        break;
      }

      case 'Z': {
        // Close Path
        if (currentContour) {
          currentContour.closed = true;
          // If first and last node are very close, merge handles
          if (currentContour.nodes.length > 1) {
            const first = currentContour.nodes[0];
            const last = currentContour.nodes[currentContour.nodes.length - 1];
            if (Math.hypot(first.x - last.x, first.y - last.y) < 2) {
              if (last.handleIn && !first.handleIn) {
                first.handleIn = last.handleIn;
              }
              currentContour.nodes.pop();
            }
          }
          contours.push(currentContour);
          currentContour = null;
        }
        currentPos = { ...startPos };
        prevControlPoint = null;
        break;
      }
    }
  }

  if (currentContour && currentContour.nodes.length > 0) {
    contours.push(currentContour);
  }

  return contours;
}

function parseNumbers(str: string): number[] {
  if (!str) return [];
  const matches = str.match(/-?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?/g);
  return matches ? matches.map(Number) : [];
}

function createRectContourDirect(x: number, y: number, w: number, h: number): PathContour {
  return {
    id: generateId(),
    closed: true,
    nodes: [
      { id: generateId(), x, y, type: 'corner' },
      { id: generateId(), x: x + w, y, type: 'corner' },
      { id: generateId(), x: x + w, y: y + h, type: 'corner' },
      { id: generateId(), x, y: y + h, type: 'corner' },
    ],
  };
}

function createEllipseContourDirect(cx: number, cy: number, rx: number, ry: number): PathContour {
  const kx = rx * 0.5522847498;
  const ky = ry * 0.5522847498;
  return {
    id: generateId(),
    closed: true,
    nodes: [
      {
        id: generateId(),
        x: cx,
        y: cy - ry,
        type: 'smooth',
        handleIn: { x: cx - kx, y: cy - ry },
        handleOut: { x: cx + kx, y: cy - ry },
      },
      {
        id: generateId(),
        x: cx + rx,
        y: cy,
        type: 'smooth',
        handleIn: { x: cx + rx, y: cy - ky },
        handleOut: { x: cx + rx, y: cy + ky },
      },
      {
        id: generateId(),
        x: cx,
        y: cy + ry,
        type: 'smooth',
        handleIn: { x: cx + kx, y: cy + ry },
        handleOut: { x: cx - kx, y: cy + ry },
      },
      {
        id: generateId(),
        x: cx - rx,
        y: cy,
        type: 'smooth',
        handleIn: { x: cx - rx, y: cy + ky },
        handleOut: { x: cx - rx, y: cy - ky },
      },
    ],
  };
}

interface BezierArcSegment {
  cp1: Point;
  cp2: Point;
  end: Point;
}

function arcToBeziers(
  x1: number,
  y1: number,
  rx: number,
  ry: number,
  angleDeg: number,
  largeArcFlag: boolean,
  sweepFlag: boolean,
  x2: number,
  y2: number
): BezierArcSegment[] {
  if (x1 === x2 && y1 === y2) return [];

  let radX = Math.abs(rx);
  let radY = Math.abs(ry);
  if (radX === 0 || radY === 0) {
    return [{
      cp1: { x: x1, y: y1 },
      cp2: { x: x2, y: y2 },
      end: { x: x2, y: y2 },
    }];
  }

  const phi = (angleDeg * Math.PI) / 180;
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);

  const dx = (x1 - x2) / 2;
  const dy = (y1 - y2) / 2;
  const x1p = cosPhi * dx + sinPhi * dy;
  const y1p = -sinPhi * dx + cosPhi * dy;

  const lambda = (x1p * x1p) / (radX * radX) + (y1p * y1p) / (radY * radY);
  if (lambda > 1) {
    const s = Math.sqrt(lambda);
    radX *= s;
    radY *= s;
  }

  const rxSq = radX * radX;
  const rySq = radY * radY;
  const x1pSq = x1p * x1p;
  const y1pSq = y1p * y1p;

  const num = rxSq * rySq - rxSq * y1pSq - rySq * x1pSq;
  const denom = rxSq * y1pSq + rySq * x1pSq;
  let factor = 0;
  if (denom > 0 && num > 0) {
    factor = Math.sqrt(num / denom);
  }
  if (largeArcFlag === sweepFlag) {
    factor = -factor;
  }

  const cxp = factor * ((radX * y1p) / radY);
  const cyp = factor * (-(radY * x1p) / radX);

  const cx = cosPhi * cxp - sinPhi * cyp + (x1 + x2) / 2;
  const cy = sinPhi * cxp + cosPhi * cyp + (y1 + y2) / 2;

  const v1x = (x1p - cxp) / radX;
  const v1y = (y1p - cyp) / radY;
  const v2x = (-x1p - cxp) / radX;
  const v2y = (-y1p - cyp) / radY;

  const vectorAngle = (ux: number, uy: number, vx: number, vy: number) => {
    const dot = ux * vx + uy * vy;
    const len = Math.sqrt(ux * ux + uy * uy) * Math.sqrt(vx * vx + vy * vy);
    let a = Math.acos(Math.max(-1, Math.min(1, dot / (len || 1))));
    if (ux * vy - uy * vx < 0) a = -a;
    return a;
  };

  const theta1 = vectorAngle(1, 0, v1x, v1y);
  let dTheta = vectorAngle(v1x, v1y, v2x, v2y);

  if (!sweepFlag && dTheta > 0) {
    dTheta -= 2 * Math.PI;
  } else if (sweepFlag && dTheta < 0) {
    dTheta += 2 * Math.PI;
  }

  const segments = Math.max(1, Math.ceil(Math.abs(dTheta) / (Math.PI / 2)));
  const segDelta = dTheta / segments;
  const result: BezierArcSegment[] = [];

  for (let i = 0; i < segments; i++) {
    const startAng = theta1 + i * segDelta;
    const endAng = startAng + segDelta;
    const halfDelta = segDelta / 2;
    const alpha = (Math.sin(segDelta) * (Math.sqrt(4 + 3 * Math.tan(halfDelta) * Math.tan(halfDelta)) - 1)) / 3;

    const cosS = Math.cos(startAng);
    const sinS = Math.sin(startAng);
    const cosE = Math.cos(endAng);
    const sinE = Math.sin(endAng);

    const ep1x = cosPhi * radX * cosS - sinPhi * radY * sinS + cx;
    const ep1y = sinPhi * radX * cosS + cosPhi * radY * sinS + cy;
    const ep2x = cosPhi * radX * cosE - sinPhi * radY * sinE + cx;
    const ep2y = sinPhi * radX * cosE + cosPhi * radY * sinE + cy;

    const dxS = -cosPhi * radX * sinS - sinPhi * radY * cosS;
    const dyS = -sinPhi * radX * sinS + cosPhi * radY * cosS;
    const dxE = -cosPhi * radX * sinE - sinPhi * radY * cosE;
    const dyE = -sinPhi * radX * sinE + cosPhi * radY * cosE;

    result.push({
      cp1: { x: Math.round((ep1x + alpha * dxS) * 100) / 100, y: Math.round((ep1y + alpha * dyS) * 100) / 100 },
      cp2: { x: Math.round((ep2x - alpha * dxE) * 100) / 100, y: Math.round((ep2y - alpha * dyE) * 100) / 100 },
      end: { x: Math.round(ep2x * 100) / 100, y: Math.round(ep2y * 100) / 100 },
    });
  }

  return result;
}

function applyElementTransform(contours: PathContour[], transformStr: string | null): PathContour[] {
  if (!transformStr) return contours;
  let t = contours;

  // Support translate(tx, [ty])
  const translateMatch = transformStr.match(/translate\(\s*([-\d.]+)(?:[,\s]+([-\d.]+))?\s*\)/);
  if (translateMatch) {
    const tx = parseFloat(translateMatch[1]);
    const ty = translateMatch[2] ? parseFloat(translateMatch[2]) : 0;
    if (!isNaN(tx) && !isNaN(ty)) {
      t = transformContours(t, (p) => ({ x: p.x + tx, y: p.y + ty }));
    }
  }

  // Support scale(sx, [sy])
  const scaleMatch = transformStr.match(/scale\(\s*([-\d.]+)(?:[,\s]+([-\d.]+))?\s*\)/);
  if (scaleMatch) {
    const sx = parseFloat(scaleMatch[1]);
    const sy = scaleMatch[2] ? parseFloat(scaleMatch[2]) : sx;
    if (!isNaN(sx) && !isNaN(sy)) {
      t = transformContours(t, (p) => ({ x: p.x * sx, y: p.y * sy }));
    }
  }

  return t;
}
