import { BezierNode, PathContour, Point, StrokePoint } from "../../../types";
import { generateId } from "../id";
import { sampleContourPoints, normalizeGlyphContoursWinding, getContourSignedArea } from "../bounds";
import { pointsToBezierContourNodes } from "../../imageVectorizer";

export function snapToStraightAngle(
  startX: number,
  startY: number,
  currentX: number,
  currentY: number
): { x: number; y: number; angleDeg: number } {
  const dx = currentX - startX;
  const dy = currentY - startY;
  const dist = Math.hypot(dx, dy);
  if (dist < 2) {
    return { x: currentX, y: currentY, angleDeg: 0 };
  }

  const angle = Math.atan2(dy, dx);
  const snapStep = Math.PI / 4; // 45 degrees
  const snappedAngle = Math.round(angle / snapStep) * snapStep;
  const angleDeg = Math.round((snappedAngle * 180) / Math.PI);

  return {
    x: Math.round(startX + Math.cos(snappedAngle) * dist),
    y: Math.round(startY + Math.sin(snappedAngle) * dist),
    angleDeg,
  };
}

/**
 * Generate an interpolated sequence of StrokePoints along a straight line between p1 and p2.
 * Preserves pressure and timestamp gradient so brush styles (calligraphy, mincho, etc.) render properly.
 */
export function generateStraightStrokePoints(
  p1: StrokePoint,
  p2: StrokePoint,
  stepSize: number = 8
): StrokePoint[] {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(2, Math.ceil(dist / stepSize));
  const pts: StrokePoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const p1Pres = p1.pressure ?? 0.5;
    const p2Pres = p2.pressure ?? 0.5;
    const p1Time = p1.time ?? 0;
    const p2Time = p2.time ?? 0;
    pts.push({
      x: Math.round(p1.x + dx * t),
      y: Math.round(p1.y + dy * t),
      pressure: p1Pres + (p2Pres - p1Pres) * t,
      time: Math.round(p1Time + (p2Time - p1Time) * t),
    });
  }
  return pts;
}

function resamplePolylineUniform(points: Point[], targetCount: number, closed: boolean): Point[] {
  if (points.length === 0) return [];
  if (points.length === 1 || targetCount <= 1) {
    return Array.from({ length: Math.max(1, targetCount) }, () => ({ ...points[0] }));
  }

  const ring = closed ? [...points, points[0]] : points;
  const segLengths: number[] = [];
  let totalLen = 0;
  for (let i = 1; i < ring.length; i++) {
    const d = Math.hypot(ring[i].x - ring[i - 1].x, ring[i].y - ring[i - 1].y);
    segLengths.push(d);
    totalLen += d;
  }

  if (totalLen < 1e-6) {
    return Array.from({ length: targetCount }, () => ({ ...points[0] }));
  }

  const out: Point[] = [];
  const denom = closed ? targetCount : Math.max(1, targetCount - 1);
  let segIdx = 0;
  let accLen = 0;

  for (let k = 0; k < targetCount; k++) {
    const targetDist = (k / denom) * totalLen;
    while (segIdx < segLengths.length - 1 && accLen + segLengths[segIdx] < targetDist) {
      accLen += segLengths[segIdx];
      segIdx++;
    }
    const segLen = segLengths[segIdx];
    const localT = segLen > 1e-6 ? Math.max(0, Math.min(1, (targetDist - accLen) / segLen)) : 0;
    const p0 = ring[segIdx];
    const p1 = ring[segIdx + 1];
    out.push({
      x: p0.x + (p1.x - p0.x) * localT,
      y: p0.y + (p1.y - p0.y) * localT,
    });
  }
  return out;
}

function alignClosedRingStart(refRing: Point[], candRing: Point[]): Point[] {
  const n = Math.min(refRing.length, candRing.length);
  if (n <= 1) return candRing;

  let bestOffset = 0;
  let bestDistSq = Infinity;
  // Evaluate shift candidates cleanly without O(N^2) overhead on typical 24-64 points
  for (let offset = 0; offset < n; offset++) {
    let distSq = 0;
    for (let i = 0; i < n; i++) {
      const a = refRing[i];
      const b = candRing[(i + offset) % n];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      distSq += dx * dx + dy * dy;
    }
    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      bestOffset = offset;
    }
  }

  if (bestOffset === 0) return candRing;
  return [...candRing.slice(bestOffset), ...candRing.slice(0, bestOffset)];
}

function cloneContoursWithFreshIds(contours: PathContour[], prefix: string): PathContour[] {
  return (contours || []).map((c, cIdx) => ({
    ...c,
    id: `${prefix}-contour-${cIdx}`,
    nodes: (c.nodes || []).map((n, i) => ({
      ...n,
      id: `${prefix}-${cIdx}-${i}`,
      handleIn: n.handleIn ? { x: n.handleIn.x, y: n.handleIn.y } : null,
      handleOut: n.handleOut ? { x: n.handleOut.x, y: n.handleOut.y } : null,
    })),
  }));
}

/**
 * Perform vector point-by-point geometric interpolation between Master Contours A and B.
 * @param masterA Starting master contours (t = 0)
 * @param masterB Target master contours (t = 1)
 * @param t Interpolation factor (0.0 to 1.0)
 */
export function interpolateContours(
  masterA: PathContour[],
  masterB: PathContour[],
  t: number
): PathContour[] {
  const clampedT = Math.max(0, Math.min(1, t));
  if (clampedT === 0 || !masterB || masterB.length === 0) {
    return cloneContoursWithFreshIds(masterA, 'interp');
  }
  if (clampedT === 1 || !masterA || masterA.length === 0) {
    return cloneContoursWithFreshIds(masterB, 'interp');
  }

  // Contour order cannot safely be inferred when the masters have different
  // contour counts (for example, a counter exists in only one master).
  // Returning a clone of the nearer master avoids creating a hybrid with
  // dropped contours or sharing mutable references with master glyphs.
  if (masterA.length !== masterB.length) {
    return cloneContoursWithFreshIds(clampedT < 0.5 ? masterA : masterB, 'interp');
  }

  const count = Math.min(masterA.length, masterB.length);
  const result: PathContour[] = [];

  for (let cIdx = 0; cIdx < count; cIdx++) {
    const cA = masterA[cIdx];
    const cB = masterB[cIdx];

    if (!cA || !cB) continue;

    const nodesA = cA.nodes;
    const nodesB = cB.nodes;

    // Direct 1:1 node matching if topology aligns
    if (nodesA.length === nodesB.length) {
      const interpolatedNodes: BezierNode[] = nodesA.map((nA, i) => {
        const nB = nodesB[i];
        const x = Math.round(nA.x * (1 - clampedT) + nB.x * clampedT);
        const y = Math.round(nA.y * (1 - clampedT) + nB.y * clampedT);

        let handleIn: Point | null = null;
        if (nA.handleIn || nB.handleIn) {
          const hInAx = nA.handleIn ? nA.handleIn.x : nA.x;
          const hInAy = nA.handleIn ? nA.handleIn.y : nA.y;
          const hInBx = nB.handleIn ? nB.handleIn.x : nB.x;
          const hInBy = nB.handleIn ? nB.handleIn.y : nB.y;
          handleIn = {
            x: Math.round(hInAx * (1 - clampedT) + hInBx * clampedT),
            y: Math.round(hInAy * (1 - clampedT) + hInBy * clampedT),
          };
        }

        let handleOut: Point | null = null;
        if (nA.handleOut || nB.handleOut) {
          const hOutAx = nA.handleOut ? nA.handleOut.x : nA.x;
          const hOutAy = nA.handleOut ? nA.handleOut.y : nA.y;
          const hOutBx = nB.handleOut ? nB.handleOut.x : nB.x;
          const hOutBy = nB.handleOut ? nB.handleOut.y : nB.y;
          handleOut = {
            x: Math.round(hOutAx * (1 - clampedT) + hOutBx * clampedT),
            y: Math.round(hOutAy * (1 - clampedT) + hOutBy * clampedT),
          };
        }

        return {
          id: `interp-${cIdx}-${i}`,
          x,
          y,
          handleIn,
          handleOut,
          type: nA.type || nB.type,
        };
      });

      result.push({
        id: `interp-contour-${cIdx}`,
        nodes: interpolatedNodes,
        closed: cA.closed && cB.closed,
      });
    } else {
      // Unequal node count: uniformly arc-length resample both contours to a shared
      // sample count, align closed winding/start vertex, and morph continuously toward Master B.
      const closed = Boolean(cA.closed && cB.closed);
      const rawA = sampleContourPoints(cA, 8);
      const rawB = sampleContourPoints(cB, 8);
      const sampleCount = Math.max(24, Math.min(64, Math.max(rawA.length, rawB.length)));

      const resampledA = resamplePolylineUniform(rawA, sampleCount, closed);
      let resampledB = resamplePolylineUniform(rawB, sampleCount, closed);

      if (closed) {
        const areaA = getContourSignedArea(cA);
        const areaB = getContourSignedArea(cB);
        if ((areaA > 0 && areaB < 0) || (areaA < 0 && areaB > 0)) {
          resampledB = [...resampledB].reverse();
        }
        resampledB = alignClosedRingStart(resampledA, resampledB);
      }

      const blendedPts: Point[] = resampledA.map((pA, i) => {
        const pB = resampledB[i] ?? pA;
        return {
          x: pA.x * (1 - clampedT) + pB.x * clampedT,
          y: pA.y * (1 - clampedT) + pB.y * clampedT,
        };
      });

      // M21: open contours get smooth handles rebuilt from the blended
      // points just like closed ones, instead of a corner-only polyline.
      const morphedNodes: BezierNode[] = closed
        ? pointsToBezierContourNodes(blendedPts)
        : pointsToBezierContourNodes(blendedPts, false);

      result.push({
        id: `interp-contour-${cIdx}`,
        nodes: morphedNodes,
        closed,
      });
    }
  }

  return result;
}

/**
 * Detect near-straight or wobbly segments in a PathContour and straighten/snap them to clean vectors
 */
export function straightenWobblyContour(contour: PathContour, devThreshold: number = 24): PathContour {
  if (!contour.nodes || contour.nodes.length < 3) return contour;

  const nodes = [...contour.nodes];
  const n = nodes.length;
  const newNodes: BezierNode[] = [];

  for (let i = 0; i < n; i++) {
    // L8: on an open contour the end nodes have only one real neighbour,
    // so there is no chord to straighten against. Keep them as-is instead
    // of measuring against the opposite end.
    const prev = contour.closed ? nodes[(i - 1 + n) % n] : nodes[i - 1];
    const curr = nodes[i];
    const next = contour.closed ? nodes[(i + 1) % n] : nodes[i + 1];
    if (!prev || !next) {
      newNodes.push(curr);
      continue;
    }

    // Check distance of curr from chord line (prev -> next)
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const segLen = Math.hypot(dx, dy);

    if (segLen > 5) {
      const dev = Math.abs(dy * curr.x - dx * curr.y + next.x * prev.y - next.y * prev.x) / segLen;
      // If node is nearly collinear with its neighbors, straighten it along chord line
      if (dev < devThreshold) {
        const t = ((curr.x - prev.x) * dx + (curr.y - prev.y) * dy) / (segLen * segLen);
        const projX = prev.x + dx * t;
        const projY = prev.y + dy * t;

        newNodes.push({
          ...curr,
          x: Math.round(projX),
          y: Math.round(projY),
          handleIn: null,
          handleOut: null,
          type: 'corner',
        });
        continue;
      }
    }
    newNodes.push(curr);
  }

  return {
    ...contour,
    nodes: newNodes,
  };
}

/**
 * Expand stroke of contours into closed filled outlines (FontForge "Expand Stroke" command)
 */
export function expandStrokeContours(
  contours: PathContour[],
  strokeWidth: number = 20,
  capStyle: 'round' | 'butt' | 'square' = 'round'
): PathContour[] {
  if (!contours || contours.length === 0) return [];
  const expandedList: PathContour[] = [];

  for (const c of contours) {
    if (!c.nodes || c.nodes.length < 2) {
      expandedList.push(c);
      continue;
    }
    const sampled = sampleContourPoints(c, 8);
    if (sampled.length < 2) {
      expandedList.push(c);
      continue;
    }

    const halfW = Math.max(1, strokeWidth / 2);
    const leftPoints: Point[] = [];
    const rightPoints: Point[] = [];
    const tangents: Point[] = [];

    for (let i = 0; i < sampled.length; i++) {
      const curr = sampled[i];
      let dx = 0;
      let dy = 0;

      if (i === 0) {
        if (c.closed) {
          const prev = sampled[sampled.length - 1];
          dx = curr.x - prev.x;
          dy = curr.y - prev.y;
        } else {
          const next = sampled[1];
          dx = next.x - curr.x;
          dy = next.y - curr.y;
        }
      } else if (i === sampled.length - 1) {
        if (c.closed) {
          const next = sampled[0];
          dx = next.x - curr.x;
          dy = next.y - curr.y;
        } else {
          const prev = sampled[i - 1];
          dx = curr.x - prev.x;
          dy = curr.y - prev.y;
        }
      } else {
        const prev = sampled[i - 1];
        const next = sampled[i + 1];
        dx = next.x - prev.x;
        dy = next.y - prev.y;
      }

      const len = Math.hypot(dx, dy);
      if (len < 0.0001) continue;
      const tx = dx / len;
      const ty = dy / len;
      const nx = -ty;
      const ny = tx;

      tangents.push({ x: tx, y: ty });
      leftPoints.push({ x: curr.x + nx * halfW, y: curr.y + ny * halfW });
      rightPoints.push({ x: curr.x - nx * halfW, y: curr.y - ny * halfW });
    }

    if (leftPoints.length < 2) {
      expandedList.push(c);
      continue;
    }

    if (c.closed) {
      const outerNodes = pointsToBezierContourNodes(leftPoints);
      const innerNodes = pointsToBezierContourNodes(rightPoints.slice().reverse());
      expandedList.push({ id: generateId(), nodes: outerNodes, closed: true });
      expandedList.push({ id: generateId(), nodes: innerNodes, closed: true });
    } else {
      const endPt = sampled[sampled.length - 1];
      const startPt = sampled[0];
      const endTangent = tangents[tangents.length - 1] || { x: 1, y: 0 };
      const startTangent = tangents[0] || { x: 1, y: 0 };

      const endNormal = { x: -endTangent.y, y: endTangent.x };
      const startNormal = { x: -startTangent.y, y: startTangent.x };

      const endL = leftPoints[leftPoints.length - 1];
      const endR = rightPoints[rightPoints.length - 1];
      const startL = leftPoints[0];
      const startR = rightPoints[0];

      let endCap: Point[] = [];
      let startCap: Point[] = [];

      if (capStyle === 'round') {
        // End cap: sweep smoothly from endL to endR in forward semicircle
        const endCapSteps = 12;
        const endAngleStart = Math.atan2(endNormal.y, endNormal.x);
        for (let s = 1; s < endCapSteps; s++) {
          const a = endAngleStart - (Math.PI * s) / endCapSteps;
          endCap.push({
            x: endPt.x + Math.cos(a) * halfW,
            y: endPt.y + Math.sin(a) * halfW,
          });
        }

        // Start cap: sweep smoothly from startR to startL in backward semicircle
        const startCapSteps = 12;
        const startAngleStart = Math.atan2(-startNormal.y, -startNormal.x);
        for (let s = 1; s < startCapSteps; s++) {
          const a = startAngleStart - (Math.PI * s) / startCapSteps;
          startCap.push({
            x: startPt.x + Math.cos(a) * halfW,
            y: startPt.y + Math.sin(a) * halfW,
          });
        }
      } else if (capStyle === 'square') {
        endCap = [
          { x: endL.x + endTangent.x * halfW, y: endL.y + endTangent.y * halfW },
          { x: endR.x + endTangent.x * halfW, y: endR.y + endTangent.y * halfW },
        ];

        startCap = [
          { x: startR.x - startTangent.x * halfW, y: startR.y - startTangent.y * halfW },
          { x: startL.x - startTangent.x * halfW, y: startL.y - startTangent.y * halfW },
        ];
      }

      const combinedPoints = [
        ...leftPoints,
        ...endCap,
        ...rightPoints.slice().reverse(),
        ...startCap,
      ];
      const outlineNodes = pointsToBezierContourNodes(combinedPoints);
      const strokeContour: PathContour = { id: generateId(), nodes: outlineNodes, closed: true };
      expandedList.push(strokeContour);
    }
  }

  return normalizeGlyphContoursWinding(expandedList);
}

