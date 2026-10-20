import {
  BezierNode,
  PathContour,
  Point,
  StrokePoint,
  BrushStyle,
  PressureCurveConfig,
  UserPenPreset,
} from "../../../types";
import { generateId } from "../id";
import { solveCubicBezierYForX, evaluatePressureCurve } from "../pressure";
import { contoursToSvgPath } from "../svg";
import {
  getContoursBoundingBox,
  getContourSignedArea,
  reverseContour,
  normalizeGlyphContoursWinding,
} from "../bounds";
import { pointsToBezierContourNodes, rdpSimplify } from "../../imageVectorizer";
import { simplifyPointsRDP } from "./smoothing";
import { createSharpAngularContour, createSharpRoundedContour } from "./sharpContours";

export interface SubdividedStrokeOptions {
  /** Target distance between fine sub-segments in font units (default: 1.25) */
  subdivisionStep?: number;
  /** Density level for sub-segmentation: 'ultra' (0.8px), 'high' (1.25px), 'normal' (1.8px) */
  density?: 'ultra' | 'high' | 'normal';
  /** Whether to use adaptive sub-segmentation that increases density where pressure changes fast */
  adaptiveDensity?: boolean;
  /** Width smoothing passes for pressure transitions */
  widthSmoothingPasses?: number;
  /** Custom Pen / Brush preset parameters (ibisPaint brush parameters) */
  customPreset?: Partial<UserPenPreset>;
  /** Disable automatic straightening for curved preview or delicate calligraphic strokes */
  disableAutoStraight?: boolean;
}

/**
 * Fast SVG path generator for active freehand drawing preview
 */

/**
 * Fast direct SVG path generator for active freehand drawing preview.
 * Bypasses the heavy multi-pass BezierNode fitting and UUID allocation pipeline
 * to achieve sub-millisecond execution (<0.3ms) and 120fps buttery smooth pen tracking.
 */
export function generateFastStrokeSvgPath(
  points: (Point | StrokePoint)[],
  strokeWidth: number = 40,
  style: BrushStyle = 'brush',
  roundCap: boolean = true,
  pressureSensitivity: 'high' | 'normal' | 'low' | 'off' = 'normal',
  pressureCurve?: PressureCurveConfig | null,
  smoothingIntensity: number = 50,
  options?: SubdividedStrokeOptions
): string {
  const n = points.length;
  if (n === 0) return '';
  if (n === 1) {
    const p = points[0];
    const pres =
      'pressure' in p && typeof p.pressure === 'number' && pressureSensitivity !== 'off'
        ? evaluatePressureCurve(p.pressure, pressureCurve, pressureSensitivity)
        : 0.5;
    const r = Math.max(
      1.5,
      Number(((strokeWidth / 2) * (pressureSensitivity === 'off' ? 1.0 : 0.35 + 1.15 * pres)).toFixed(2))
    );
    return `M ${Number((p.x - r).toFixed(2))} ${Number(p.y.toFixed(2))} A ${r} ${r} 0 1 0 ${Number(
      (p.x + r).toFixed(2)
    )} ${Number(p.y.toFixed(2))} A ${r} ${r} 0 1 0 ${Number((p.x - r).toFixed(2))} ${Number(p.y.toFixed(2))} Z`;
  }

  // Pre-filter / smooth points in a single pass to eliminate mouse & digitizer jitter
  const ptsX = new Float64Array(n);
  const ptsY = new Float64Array(n);
  const ptsP = new Float64Array(n);

  for (let i = 0; i < n; i++) {
    const p = points[i];
    ptsX[i] = p.x;
    ptsY[i] = p.y;
    const rawP = 'pressure' in p && typeof p.pressure === 'number' ? p.pressure : 0.5;
    ptsP[i] = pressureSensitivity === 'off' ? 0.5 : evaluatePressureCurve(rawP, pressureCurve, pressureSensitivity);
  }

  const smX = new Float64Array(n);
  const smY = new Float64Array(n);
  const smP = new Float64Array(n);
  smX[0] = ptsX[0];
  smY[0] = ptsY[0];
  smP[0] = ptsP[0];
  smX[n - 1] = ptsX[n - 1];
  smY[n - 1] = ptsY[n - 1];
  smP[n - 1] = ptsP[n - 1];

  for (let i = 1; i < n - 1; i++) {
    smX[i] = ptsX[i - 1] * 0.25 + ptsX[i] * 0.5 + ptsX[i + 1] * 0.25;
    smY[i] = ptsY[i - 1] * 0.25 + ptsY[i] * 0.5 + ptsY[i + 1] * 0.25;
    smP[i] = ptsP[i - 1] * 0.25 + ptsP[i] * 0.5 + ptsP[i + 1] * 0.25;
  }

  // Calculate tangents and normals
  const leftX = new Float64Array(n);
  const leftY = new Float64Array(n);
  const rightX = new Float64Array(n);
  const rightY = new Float64Array(n);

  const halfBaseWidth = strokeWidth / 2;
  const isChisel = style === 'calligraphy' || style === 'highlighter';
  const chiselAngle = style === 'highlighter' ? Math.PI * 0.5 : Math.PI * 0.25;
  const cDx = Math.cos(chiselAngle);
  const cDy = Math.sin(chiselAngle);

  for (let i = 0; i < n; i++) {
    const prevIdx = Math.max(0, i - 1);
    const nextIdx = Math.min(n - 1, i + 1);
    let dx = smX[nextIdx] - smX[prevIdx];
    let dy = smY[nextIdx] - smY[prevIdx];
    if (dx * dx + dy * dy < 0.0001 && n > 2) {
      dx = smX[Math.min(n - 1, i + 2)] - smX[Math.max(0, i - 2)];
      dy = smY[Math.min(n - 1, i + 2)] - smY[Math.max(0, i - 2)];
    }
    const len = Math.hypot(dx, dy) || 1;
    const tx = dx / len;
    const ty = dy / len;
    const nx = -ty;
    const ny = tx;

    const pPres = smP[i];
    let wFactor = 1.0;
    if (pressureSensitivity !== 'off') {
      if (style === 'g_pen') {
        wFactor = 0.15 + 1.65 * Math.pow(pPres, 1.25);
      } else if (style === 'sumi') {
        wFactor = 0.25 + 1.4 * Math.pow(pPres, 1.05);
      } else if (style === 'signpen' || style === 'brush') {
        wFactor = 0.35 + 1.2 * Math.pow(pPres, 1.0);
      } else if (style === 'pencil' || style === 'ballpoint') {
        wFactor = 0.4 + 0.9 * pPres;
      } else {
        wFactor = 0.35 + 1.15 * pPres;
      }
    }

    let hw = Math.max(1.5, halfBaseWidth * wFactor);

    // Apply custom preset tapering if defined
    const cp = options?.customPreset;
    if (cp) {
      const normDist = i / Math.max(1, n - 1);
      const startLen = Math.min(0.4, (cp.taperStartLength ?? 0) / 100);
      const endLen = Math.min(0.4, (cp.taperEndLength ?? 0) / 100);
      const startW = Math.max(0.12, (cp.taperStartWidth ?? 100) / 100);
      const endW = Math.max(0.12, (cp.taperEndWidth ?? 100) / 100);
      if (startLen > 0.001 && normDist < startLen) {
        const t = normDist / startLen;
        hw *= startW + (1.0 - startW) * t;
      }
      if (endLen > 0.001 && normDist > 1.0 - endLen) {
        const t = (1.0 - normDist) / endLen;
        hw *= endW + (1.0 - endW) * t;
      }
    }

    if (isChisel) {
      const dotN = cDx * nx + cDy * ny;
      const sign = dotN >= 0 ? 1 : -1;
      const lx = cDx * sign;
      const ly = cDy * sign;
      leftX[i] = smX[i] + lx * hw + nx * 2;
      leftY[i] = smY[i] + ly * hw + ny * 2;
      rightX[i] = smX[i] - lx * hw - nx * 2;
      rightY[i] = smY[i] - ly * hw - ny * 2;
    } else {
      leftX[i] = smX[i] + nx * hw;
      leftY[i] = smY[i] + ny * hw;
      rightX[i] = smX[i] - nx * hw;
      rightY[i] = smY[i] - ny * hw;
    }
  }

  // Construct closed SVG path: Right side forward -> End cap -> Left side backward -> Start cap -> Z
  // Using quadratic midpoint curves (Q) for organic smoothness
  const fmt = (v: number) => Number(v.toFixed(1));

  let d = `M ${fmt(rightX[0])} ${fmt(rightY[0])}`;

  // Right side forward
  for (let i = 1; i < n; i++) {
    const prevX = rightX[i - 1];
    const prevY = rightY[i - 1];
    const currX = rightX[i];
    const currY = rightY[i];
    const midX = (prevX + currX) / 2;
    const midY = (prevY + currY) / 2;
    d += ` Q ${fmt(prevX)} ${fmt(prevY)} ${fmt(midX)} ${fmt(midY)}`;
  }
  d += ` L ${fmt(rightX[n - 1])} ${fmt(rightY[n - 1])}`;

  // End cap (half circle or line)
  if (roundCap && !isChisel) {
    const endR = Math.hypot(leftX[n - 1] - rightX[n - 1], leftY[n - 1] - rightY[n - 1]) / 2;
    d += ` A ${fmt(endR)} ${fmt(endR)} 0 0 1 ${fmt(leftX[n - 1])} ${fmt(leftY[n - 1])}`;
  } else {
    d += ` L ${fmt(leftX[n - 1])} ${fmt(leftY[n - 1])}`;
  }

  // Left side backward
  for (let i = n - 2; i >= 0; i--) {
    const prevX = leftX[i + 1];
    const prevY = leftY[i + 1];
    const currX = leftX[i];
    const currY = leftY[i];
    const midX = (prevX + currX) / 2;
    const midY = (prevY + currY) / 2;
    d += ` Q ${fmt(prevX)} ${fmt(prevY)} ${fmt(midX)} ${fmt(midY)}`;
  }
  d += ` L ${fmt(leftX[0])} ${fmt(leftY[0])}`;

  // Start cap
  if (roundCap && !isChisel) {
    const startR = Math.hypot(rightX[0] - leftX[0], rightY[0] - leftY[0]) / 2;
    d += ` A ${fmt(startR)} ${fmt(startR)} 0 0 1 ${fmt(rightX[0])} ${fmt(rightY[0])}`;
  } else {
    d += ` L ${fmt(rightX[0])} ${fmt(rightY[0])}`;
  }

  d += ' Z';
  return d;
}

/**
 * Render stroke points into a finely subdivided SVG path string directly
 */
export function renderSubdividedStrokePath(
  points: (Point | StrokePoint)[],
  strokeWidth: number = 40,
  style: BrushStyle = 'brush',
  roundCap: boolean = true,
  pressureSensitivity: 'high' | 'normal' | 'low' | 'off' = 'normal',
  pressureCurve?: PressureCurveConfig | null,
  smoothingIntensity: number = 50,
  options?: SubdividedStrokeOptions
): string {
  return generateFastStrokeSvgPath(
    points,
    strokeWidth,
    style,
    roundCap,
    pressureSensitivity,
    pressureCurve,
    smoothingIntensity,
    options
  );
}

/**
 * Convert freehand stroke points into a closed smoothed vector outline using
 * fine-segment subdivision and monotone cubic Hermite pressure interpolation.
 */

export function strokePointsToSubdividedOutline(
  points: (Point | StrokePoint)[],
  strokeWidth: number = 40,
  style: BrushStyle = 'brush',
  roundCap: boolean = true,
  pressureSensitivity: 'high' | 'normal' | 'low' | 'off' = 'normal',
  pressureCurve?: PressureCurveConfig | null,
  smoothingIntensity: number = 50,
  options?: SubdividedStrokeOptions
): PathContour {
  return strokePointsToOutline(
    points,
    strokeWidth,
    style,
    roundCap,
    pressureSensitivity,
    pressureCurve,
    smoothingIntensity,
    options
  );
}

/**
 * Convert freehand stroke points (with optional stylus pressure & timing) into a closed smoothed or angular vector outline
 */
export function strokePointsToOutline(
  points: (Point | StrokePoint)[],
  strokeWidth: number = 40,
  style: BrushStyle = 'brush',
  roundCap: boolean = true,
  pressureSensitivity: 'high' | 'normal' | 'low' | 'off' = 'normal',
  pressureCurve?: PressureCurveConfig | null,
  smoothingIntensity: number = 50,
  options?: SubdividedStrokeOptions
): PathContour {
  // カクカク角筆・ポリゴン筆は専用の幾何学的マイター角・直線セグメント生成ルーチンを使用
  if (style === 'sharp' || style === 'polygon') {
    return createSharpAngularContour(points, strokeWidth, pressureSensitivity, pressureCurve);
  }

  // カクカク角丸筆は幾何学直線骨格＋角丸フィレット・ラウンドキャップルーチンを使用
  if (style === 'sharp_round') {
    return createSharpRoundedContour(points, strokeWidth, pressureSensitivity, pressureCurve);
  }

  if (points.length < 2) {
    const p = points[0] || { x: 500, y: 500 };
    const r = Math.max(6, strokeWidth / 2);
    // create a smooth circle with 4 bezier nodes
    const kappa = 0.5522847498;
    const ox = r * kappa;
    return {
      id: generateId(),
      closed: true,
      nodes: [
        { id: generateId(), x: p.x, y: p.y - r, handleIn: { x: p.x - ox, y: p.y - r }, handleOut: { x: p.x + ox, y: p.y - r }, type: 'smooth' },
        { id: generateId(), x: p.x + r, y: p.y, handleIn: { x: p.x + r, y: p.y - ox }, handleOut: { x: p.x + r, y: p.y + ox }, type: 'smooth' },
        { id: generateId(), x: p.x, y: p.y + r, handleIn: { x: p.x + ox, y: p.y + r }, handleOut: { x: p.x - ox, y: p.y + r }, type: 'smooth' },
        { id: generateId(), x: p.x - r, y: p.y, handleIn: { x: p.x - r, y: p.y + ox }, handleOut: { x: p.x - r, y: p.y - ox }, type: 'smooth' },
      ],
    };
  }

  // 1. Initial point extraction with jitter filtration
  const intensityNorm = Math.max(0, Math.min(100, smoothingIntensity)) / 100;
  const rawPts: { x: number; y: number; pressure: number; time?: number; pointerType?: string }[] = [];
  const minJitterDistSq = intensityNorm <= 0.05 ? 0.25 : 0.8;

  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    let pres = 0.5;
    if (pressureSensitivity !== 'off' && 'pressure' in pt && typeof pt.pressure === 'number' && pt.pressure > 0) {
      pres = pt.pressure;
    }
    const t = 'time' in pt && typeof pt.time === 'number' ? pt.time : undefined;
    const ptrType = 'pointerType' in pt && typeof pt.pointerType === 'string' ? pt.pointerType : undefined;
    if (rawPts.length === 0) {
      rawPts.push({ x: pt.x, y: pt.y, pressure: pres, time: t, pointerType: ptrType });
    } else {
      const prev = rawPts[rawPts.length - 1];
      const dx = pt.x - prev.x;
      const dy = pt.y - prev.y;
      if (dx * dx + dy * dy >= minJitterDistSq) {
        rawPts.push({ x: pt.x, y: pt.y, pressure: pres, time: t, pointerType: ptrType });
      }
    }
  }

  if (rawPts.length < 2) {
    const p = rawPts[0] || { x: 500, y: 500, pressure: 0.5 };
    return strokePointsToOutline([p], strokeWidth, style, roundCap, pressureSensitivity, pressureCurve, smoothingIntensity);
  }

  const numRaw = rawPts.length;

  // Check if stroke was created using a mouse or touch
  const isMouseInput = rawPts.some((p) => p.pointerType === 'mouse');
  const isTouchInput = rawPts.some((p) => p.pointerType === 'touch');

  // For mouse inputs: gentle 1px sub-pixel noise filtering without cutting sharp corners
  if (isMouseInput && rawPts.length >= 4) {
    const origX = rawPts.map((p) => p.x);
    const origY = rawPts.map((p) => p.y);
    for (let i = 1; i < rawPts.length - 1; i++) {
      rawPts[i].x = origX[i - 1] * 0.10 + origX[i] * 0.80 + origX[i + 1] * 0.10;
      rawPts[i].y = origY[i - 1] * 0.10 + origY[i] * 0.80 + origY[i + 1] * 0.10;
    }
  }

  // Compute cumulative physical arc-length along raw points
  const rawArcLengths = new Float64Array(numRaw);
  for (let i = 1; i < numRaw; i++) {
    const dx = rawPts[i].x - rawPts[i - 1].x;
    const dy = rawPts[i].y - rawPts[i - 1].y;
    rawArcLengths[i] = rawArcLengths[i - 1] + Math.hypot(dx, dy);
  }
  const totalRawArcLen = rawArcLengths[numRaw - 1];

  // Auto-Straight Line Detection:
  // If the user intended to draw a straight line (low deviation from end-to-end chord line),
  // automatically flatten micro-wobbles so the stroke becomes a crisp straight line
  if (numRaw >= 4 && totalRawArcLen > 25) {
    const pStart = rawPts[0];
    const pEnd = rawPts[numRaw - 1];
    const chordDist = Math.hypot(pEnd.x - pStart.x, pEnd.y - pStart.y);
    const straightnessRatio = chordDist / totalRawArcLen;

    if (chordDist > 1) {
      const dx = pEnd.x - pStart.x;
      const dy = pEnd.y - pStart.y;
      let maxDev = 0;
      for (let i = 1; i < numRaw - 1; i++) {
        const dev = Math.abs(dy * rawPts[i].x - dx * rawPts[i].y + pEnd.x * pStart.y - pEnd.y * pStart.x) / chordDist;
        if (dev > maxDev) maxDev = dev;
      }

      // If stroke is genuinely intended as a straight line (high straightness ratio & tiny deviation), straighten raw points
      const isAutoStraight =
        !options?.disableAutoStraight &&
        straightnessRatio > 0.998 &&
        maxDev < Math.min(1.8, totalRawArcLen * 0.012);
      if (isAutoStraight) {
        for (let i = 1; i < numRaw - 1; i++) {
          const t = rawArcLengths[i] / totalRawArcLen;
          rawPts[i].x = pStart.x + dx * t;
          rawPts[i].y = pStart.y + dy * t;
        }
      }
    }
  }

  // Calculate instantaneous velocities (px/ms) along raw points to drive calligraphic ink dynamics
  const rawSpeeds = new Float64Array(numRaw);
  let validTimeCount = 0;
  for (let i = 1; i < numRaw; i++) {
    const t0 = rawPts[i - 1].time;
    const t1 = rawPts[i].time;
    if (typeof t0 === 'number' && typeof t1 === 'number' && t1 > t0) {
      const dt = Math.max(8, t1 - t0);
      const ds = rawArcLengths[i] - rawArcLengths[i - 1];
      rawSpeeds[i] = Math.max(0.08, Math.min(2.5, ds / dt));
      validTimeCount++;
    } else {
      rawSpeeds[i] = rawSpeeds[i - 1] || 0.5;
    }
  }
  if (validTimeCount > 0) {
    rawSpeeds[0] = rawSpeeds[1] || 0.5;
    const speedPasses = isMouseInput ? 4 : 2;
    for (let p = 0; p < speedPasses; p++) {
      for (let i = 1; i < numRaw - 1; i++) {
        rawSpeeds[i] = (rawSpeeds[i - 1] + rawSpeeds[i] * 2 + rawSpeeds[i + 1]) * 0.25;
      }
    }
  } else {
    rawSpeeds.fill(0.5);
  }

  // 2. Continuous Spatial Gaussian smoothing over physical arc-length
  // Eliminates low-speed wobble and sensor tremors uniformly regardless of drawing speed
  // For mouse input, provides an advanced stabilizer bonus to suppress hand tremors and pixel stepping
  const smoothX = new Float64Array(numRaw);
  const smoothY = new Float64Array(numRaw);
  const smoothP = new Float64Array(numRaw);
  const smoothV = new Float64Array(numRaw);

  if (numRaw >= 3 && intensityNorm > 0.05 && totalRawArcLen > 2) {
    // Physical filter radius in font coordinate units
    const baseSigma = isMouseInput ? 2.2 : 1.8;
    const maxSigmaBonus = isMouseInput ? 11.0 : 13.0;
    const sigma = baseSigma + maxSigmaBonus * intensityNorm;
    const filterRadius = sigma * 2.5;
    const twoSigmaSq = 2 * sigma * sigma;

    for (let i = 0; i < numRaw; i++) {
      // Keep exact start and end endpoints anchored
      if (i === 0 || i === numRaw - 1) {
        smoothX[i] = rawPts[i].x;
        smoothY[i] = rawPts[i].y;
        smoothP[i] = isMouseInput ? 0.5 : rawPts[i].pressure;
        smoothV[i] = rawSpeeds[i];
        continue;
      }

      const sCenter = rawArcLengths[i];
      let sumW = 0;
      let sumX = 0;
      let sumY = 0;
      let sumP = 0;
      let sumV = 0;

      // Scan backwards within filterRadius
      for (let j = i; j >= 0; j--) {
        const ds = sCenter - rawArcLengths[j];
        if (ds > filterRadius) break;
        const w = Math.exp(-(ds * ds) / twoSigmaSq);
        sumW += w;
        sumX += rawPts[j].x * w;
        sumY += rawPts[j].y * w;
        sumP += rawPts[j].pressure * w;
        sumV += rawSpeeds[j] * w;
      }
      // Scan forwards within filterRadius
      for (let j = i + 1; j < numRaw; j++) {
        const ds = rawArcLengths[j] - sCenter;
        if (ds > filterRadius) break;
        const w = Math.exp(-(ds * ds) / twoSigmaSq);
        sumW += w;
        sumX += rawPts[j].x * w;
        sumY += rawPts[j].y * w;
        sumP += rawPts[j].pressure * w;
        sumV += rawSpeeds[j] * w;
      }

      if (sumW > 0.0001) {
        // Taper smoothing near stroke endpoints so entry/exit tips remain sharp and responsive
        const distFromEnd = Math.min(sCenter, totalRawArcLen - sCenter);
        const endBlend = Math.min(1.0, distFromEnd / Math.max(3.0, sigma * 0.75));
        smoothX[i] = rawPts[i].x * (1 - endBlend) + (sumX / sumW) * endBlend;
        smoothY[i] = rawPts[i].y * (1 - endBlend) + (sumY / sumW) * endBlend;
        smoothP[i] = rawPts[i].pressure * (1 - endBlend) + (sumP / sumW) * endBlend;
        smoothV[i] = rawSpeeds[i] * (1 - endBlend) + (sumV / sumW) * endBlend;
      } else {
        smoothX[i] = rawPts[i].x;
        smoothY[i] = rawPts[i].y;
        smoothP[i] = rawPts[i].pressure;
        smoothV[i] = rawSpeeds[i];
      }
    }
  } else {
    for (let i = 0; i < numRaw; i++) {
      smoothX[i] = rawPts[i].x;
      smoothY[i] = rawPts[i].y;
      smoothP[i] = rawPts[i].pressure;
      smoothV[i] = rawSpeeds[i];
    }
  }

  // Monotone Cubic Hermite Tangents for continuous C1 pressure interpolation without step artifacts
  const pTangents = new Float64Array(numRaw);
  if (numRaw >= 2) {
    const secants = new Float64Array(numRaw - 1);
    for (let k = 0; k < numRaw - 1; k++) {
      const ds = Math.max(0.001, rawArcLengths[k + 1] - rawArcLengths[k]);
      secants[k] = (smoothP[k + 1] - smoothP[k]) / ds;
    }
    pTangents[0] = secants[0];
    pTangents[numRaw - 1] = secants[numRaw - 2];
    for (let k = 1; k < numRaw - 1; k++) {
      if (secants[k - 1] * secants[k] <= 0) {
        pTangents[k] = 0;
      } else {
        pTangents[k] = (secants[k - 1] + secants[k]) * 0.5;
      }
    }
  }

  const evalHermitePressure = (k: number, u: number, h: number): number => {
    const p0 = smoothP[k];
    const p1 = smoothP[k + 1];
    const m0 = pTangents[k] * h;
    const m1 = pTangents[k + 1] * h;
    const u2 = u * u;
    const u3 = u2 * u;
    const h00 = 2 * u3 - 3 * u2 + 1;
    const h10 = u3 - 2 * u2 + u;
    const h01 = -2 * u3 + 3 * u2;
    const h11 = u3 - u2;
    const val = h00 * p0 + h10 * m0 + h01 * p1 + h11 * m1;
    return Math.max(0.0, Math.min(1.0, val));
  };

  // Centripetal Catmull-Rom spline evaluator: alpha = 0.5 mathematically prevents self-intersections and cusps
  const evalCentripetalCatmullRom = (
    p0x: number, p0y: number,
    p1x: number, p1y: number,
    p2x: number, p2y: number,
    p3x: number, p3y: number,
    u: number
  ): { x: number; y: number } => {
    const d01 = Math.pow(Math.hypot(p1x - p0x, p1y - p0y), 0.5) || 0.0001;
    const d12 = Math.pow(Math.hypot(p2x - p1x, p2y - p1y), 0.5) || 0.0001;
    const d23 = Math.pow(Math.hypot(p3x - p2x, p3y - p2y), 0.5) || 0.0001;

    const t0 = 0;
    const t1 = t0 + d01;
    const t2 = t1 + d12;
    const t3 = t2 + d23;

    const t = t1 + u * (t2 - t1);

    const a1x = ((t1 - t) * p0x + (t - t0) * p1x) / (t1 - t0);
    const a1y = ((t1 - t) * p0y + (t - t0) * p1y) / (t1 - t0);
    const a2x = ((t2 - t) * p1x + (t - t1) * p2x) / (t2 - t1);
    const a2y = ((t2 - t) * p1y + (t - t1) * p2y) / (t2 - t1);
    const a3x = ((t3 - t) * p2x + (t - t2) * p3x) / (t3 - t2);
    const a3y = ((t3 - t) * p2y + (t - t2) * p3y) / (t3 - t2);

    const b1x = ((t2 - t) * a1x + (t - t0) * a2x) / (t2 - t0);
    const b1y = ((t2 - t) * a1y + (t - t0) * a2y) / (t2 - t0);
    const b2x = ((t3 - t) * a2x + (t - t1) * a3x) / (t3 - t1);
    const b2y = ((t3 - t) * a2y + (t - t1) * a3y) / (t3 - t1);

    const cx = ((t2 - t) * b1x + (t - t1) * b2x) / (t2 - t1);
    const cy = ((t2 - t) * b1y + (t - t1) * b2y) / (t2 - t1);

    return { x: cx, y: cy };
  };

  // 3. Resample & Spline-Interpolate centerline at fine sub-segment physical intervals
  // Guarantees silky smooth curves without polygonal chords or pressure discretization jitter
  const densityMultiplier = options?.density === 'ultra' ? 0.75 : options?.density === 'normal' ? 1.4 : 1.0;
  const customStep = options?.subdivisionStep;
  const stepTarget = (customStep || (intensityNorm <= 0.05 ? 1.25 : 1.25 + 0.75 * intensityNorm)) * densityMultiplier;

  const resampled: { x: number; y: number; pressure: number; speed?: number; time?: number }[] = [];
  resampled.push({ x: smoothX[0], y: smoothY[0], pressure: smoothP[0], speed: smoothV[0], time: rawPts[0].time });

  for (let i = 0; i < numRaw - 1; i++) {
    const p0x = i > 0 ? smoothX[i - 1] : smoothX[i];
    const p0y = i > 0 ? smoothY[i - 1] : smoothY[i];
    const p1x = smoothX[i];
    const p1y = smoothY[i];
    const p1v = smoothV[i];
    const p2x = smoothX[i + 1];
    const p2y = smoothY[i + 1];
    const p2v = smoothV[i + 1];
    const p3x = i + 2 < numRaw ? smoothX[i + 2] : p2x;
    const p3y = i + 2 < numRaw ? smoothY[i + 2] : p2y;

    const segDist = Math.hypot(p2x - p1x, p2y - p1y);
    const subSteps = Math.max(1, Math.ceil(segDist / stepTarget));

    for (let s = 1; s <= subSteps; s++) {
      const u = s / subSteps;
      const pt = evalCentripetalCatmullRom(p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y, u);
      const pres = evalHermitePressure(i, u, segDist);
      const vel = p1v + (p2v - p1v) * u;
      resampled.push({ x: pt.x, y: pt.y, pressure: pres, speed: vel });
    }
  }

  const n = resampled.length;
  if (n < 2) {
    return strokePointsToOutline([resampled[0]], strokeWidth, style, roundCap, pressureSensitivity, pressureCurve);
  }

  // 4. Cumulative distance
  const dists = new Float64Array(n);
  for (let i = 1; i < n; i++) {
    const dx = resampled[i].x - resampled[i - 1].x;
    const dy = resampled[i].y - resampled[i - 1].y;
    dists[i] = dists[i - 1] + Math.hypot(dx, dy);
  }
  const totalLength = dists[n - 1] || 1;

  // 5. Continuous Tangents and Normals (with smooth moving window to prevent curve jitter)
  const txArr = new Float64Array(n);
  const tyArr = new Float64Array(n);
  const nxArr = new Float64Array(n);
  const nyArr = new Float64Array(n);
  const turnArr = new Float64Array(n);

  const windowRadius = Math.max(2, Math.min(6, Math.round(16 / stepTarget)));
  for (let i = 0; i < n; i++) {
    const prevIdx = Math.max(0, i - windowRadius);
    const nextIdx = Math.min(n - 1, i + windowRadius);
    let dx = resampled[nextIdx].x - resampled[prevIdx].x;
    let dy = resampled[nextIdx].y - resampled[prevIdx].y;
    if (dx * dx + dy * dy < 0.000001) {
      dx = resampled[Math.min(n - 1, i + 1)].x - resampled[Math.max(0, i - 1)].x;
      dy = resampled[Math.min(n - 1, i + 1)].y - resampled[Math.max(0, i - 1)].y;
    }
    const len = Math.hypot(dx, dy) || 1;
    txArr[i] = dx / len;
    tyArr[i] = dy / len;
  }

  // Smooth tangent vectors along curves to eliminate microscopic direction jitter
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 1; i < n - 1; i++) {
      const avgTx = txArr[i - 1] * 0.25 + txArr[i] * 0.5 + txArr[i + 1] * 0.25;
      const avgTy = tyArr[i - 1] * 0.25 + tyArr[i] * 0.5 + tyArr[i + 1] * 0.25;
      const len = Math.hypot(avgTx, avgTy) || 1;
      txArr[i] = avgTx / len;
      tyArr[i] = avgTy / len;
    }
  }

  for (let i = 0; i < n; i++) {
    nxArr[i] = -tyArr[i];
    nyArr[i] = txArr[i];

    if (i > 0 && i < n - 1) {
      // Signed turn angle (cross product of previous and next tangents)
      const cross = txArr[i - 1] * tyArr[i + 1] - tyArr[i - 1] * txArr[i + 1];
      const dot = txArr[i - 1] * txArr[i + 1] + tyArr[i - 1] * tyArr[i + 1];
      turnArr[i] = Math.atan2(cross, Math.max(-1, Math.min(1, dot)));
    }
  }

  // Detect if the stroke finishes with a dynamic calligraphic flick (払い・跳ね)
  // Evaluates terminal pressure, terminal velocity, and curvature snap
  let isTailFlick = false;
  if (n >= 4 && totalLength > 15) {
    const pEnd = resampled[n - 1].pressure ?? 0.5;
    const pBefore = resampled[Math.max(0, Math.floor(n * 0.7))].pressure ?? 0.5;
    const vEnd = resampled[n - 1].speed ?? 0.5;
    const vBefore = resampled[Math.max(0, Math.floor(n * 0.7))].speed ?? 0.5;

    // A: Pressure dropped significantly towards the end (pen lift on stylus)
    const isStylusStroke = rawPts.some((p) => p.pointerType === 'pen');
    const isPressureDropping = isStylusStroke && pressureSensitivity !== 'off' && (pEnd < 0.38 || (pEnd - pBefore) < -0.12);
    // B: High velocity flick or acceleration towards end (fast deliberate swipe)
    const isSpeedFlick = isStylusStroke ? (vEnd > 1.05 || (vEnd > 0.72 && vEnd > vBefore * 1.25)) : (vEnd > 1.8 && vEnd > vBefore * 1.5);
    // C: Terminal hook / jump (跳ね) with quick release
    const endTurnAngle = Math.abs(turnArr[Math.max(0, n - 2)] || 0);
    const isHookFlick = isStylusStroke && endTurnAngle > 0.32 && (vEnd > 0.60 || pEnd < 0.45);

    isTailFlick = isPressureDropping || isSpeedFlick || isHookFlick;
  }

  // 6. Width Modulation calculation
  const rawLeftWidths = new Float64Array(n);
  const rawRightWidths = new Float64Array(n);

  for (let i = 0; i < n; i++) {
    const normDist = dists[i] / totalLength;

    let pointPressure = 0.5;
    if (pressureSensitivity === 'off') {
      pointPressure = 0.5;
    } else {
      const rawP = resampled[i].pressure ?? 0.5;
      pointPressure = evaluatePressureCurve(rawP, pressureCurve, pressureSensitivity);
    }

    let leftHalfWidth = strokeWidth / 2;
    let rightHalfWidth = strokeWidth / 2;

    if (style === 'signpen') {
      const presFactor = pressureSensitivity === 'off' ? 1.0 : (0.35 + 1.15 * Math.pow(pointPressure, 1.0));
      leftHalfWidth = rightHalfWidth = Math.max(3, (strokeWidth / 2) * presFactor);
    } else if (style === 'sumi') {
      const presFactor = pressureSensitivity === 'off' ? 1.0 : (0.22 + 1.40 * Math.pow(pointPressure, 1.05));
      let sumiPool = 1.0;
      if (normDist < 0.12) {
        const t = (0.12 - normDist) / 0.12;
        sumiPool += 0.35 * Math.sin(t * Math.PI * 0.5);
      } else if (normDist > 0.82) {
        const t = (normDist - 0.82) / 0.18;
        if (isTailFlick) {
          sumiPool = Math.max(0.08, Math.pow(1.0 - t, 1.35));
        } else {
          sumiPool += 0.25 * Math.sin(t * Math.PI);
        }
      }
      const absTurn = Math.abs(turnArr[i]);
      if (absTurn > 0.40) {
        sumiPool += Math.min(0.25, (absTurn / Math.PI) * 0.25);
      }
      leftHalfWidth = rightHalfWidth = Math.max(3, (strokeWidth / 2) * presFactor * sumiPool);
    } else if (style === 'marumoji') {
      const presFactor = pressureSensitivity === 'off' ? 1.0 : (0.45 + 0.95 * pointPressure);
      let bubbleEnd = 1.0;
      if (normDist < 0.12) {
        const t = Math.sin((normDist / 0.12) * Math.PI * 0.5);
        bubbleEnd = 1.25 - 0.25 * t;
      } else if (normDist > 0.88) {
        const t = Math.sin(((normDist - 0.88) / 0.12) * Math.PI * 0.5);
        bubbleEnd = 1.0 + 0.25 * t;
      }
      leftHalfWidth = rightHalfWidth = Math.max(4, (strokeWidth / 2) * presFactor * bubbleEnd);
    } else if (style === 'brush') {
      const ux = txArr[i];
      const uy = tyArr[i];
      const nx = nxArr[i];
      const ny = nyArr[i];

      // 1. 書道の筆運び角と方向性モジュレーション（優雅で滑らかな筆勢）
      const diagRightDown = (ux + uy) * 0.7071;
      let dirWeight = 1.0;
      if (uy > 0.15) {
        if (diagRightDown > 0.35) {
          dirWeight = 1.0 + 0.18 * diagRightDown;
        } else {
          dirWeight = 1.0 + 0.10 * uy;
        }
      } else if (uy < -0.15) {
        dirWeight = Math.max(0.70, 1.0 + 0.20 * uy);
      } else {
        dirWeight = 0.88 + 0.12 * Math.abs(uy);
      }

      // 2. 速度（Velocity）および筆圧による動的インク量
      const localSpeed = resampled[i].speed ?? 0.5;
      const speedMul = Math.max(0.80, Math.min(1.20, 1.08 - localSpeed * 0.16));

      let presFactor = 1.0;
      if (pressureSensitivity === 'off') {
        presFactor = speedMul;
      } else {
        const p = pointPressure;
        const pSens = Math.pow(p, 1.0);
        presFactor = (0.35 + 1.15 * pSens) * (0.90 + 0.15 * speedMul);
      }

      const baseWidth = (strokeWidth / 2) * dirWeight * presFactor;

      // 3. 毛筆の左右非対称性（抑えめにして自然な筆脈を確保）
      const bellyX = 0.7071;
      const bellyY = 0.7071;
      const leftBellyProj = nx * bellyX + ny * bellyY;
      const asymBias = 0.06 * leftBellyProj;
      let leftMul = 1.0 + asymBias;
      let rightMul = 1.0 - asymBias;

      // 4. 転折（Tensetsu - 漢字の折れでのなめらかな張り）
      const localTurn = turnArr[i];
      if (Math.abs(localTurn) > 0.20) {
        const shoulder = Math.min(0.18, Math.abs(localTurn) * 0.15);
        if (localTurn > 0) rightMul += shoulder;
        else leftMul += shoulder;
      }

      // 5. 自然でなめらかな起筆・終筆（急激な太さ段差を排除）
      if (normDist < 0.15) {
        const t = normDist / 0.15;
        const smoothEntry = 0.65 + 0.35 * (0.5 - 0.5 * Math.cos(t * Math.PI));
        leftMul *= smoothEntry;
        rightMul *= smoothEntry;
      } else if (normDist > 0.82) {
        const t = (normDist - 0.82) / 0.18;
        if (isTailFlick) {
          const taper = Math.max(0.12, 1.0 - 0.88 * Math.sin(t * Math.PI * 0.5));
          leftMul *= taper;
          rightMul *= taper;
        } else {
          const smoothExit = 1.0 - 0.28 * (0.5 - 0.5 * Math.cos(t * Math.PI));
          leftMul *= smoothExit;
          rightMul *= smoothExit;
        }
      }

      leftHalfWidth = Math.max(2.0, baseWidth * leftMul);
      rightHalfWidth = Math.max(2.0, baseWidth * rightMul);
    } else if (style === 'fountain') {
      const ux = txArr[i];
      const uy = tyArr[i];
      const angle = Math.atan2(Math.abs(uy), Math.abs(ux) + 0.001);
      const isDownward = uy > 0 ? 0.40 * uy : 0;
      const angleContrast = 0.25 + 0.85 * Math.sin(angle) + isDownward;
      const presFactor = pressureSensitivity === 'off' ? 1.0 : (0.20 + 1.40 * Math.pow(pointPressure, 1.15));
      leftHalfWidth = rightHalfWidth = Math.max(2.0, (strokeWidth / 2) * angleContrast * presFactor);
    } else if (style === 'mincho_nib') {
      const ux = txArr[i];
      const uy = tyArr[i];
      const vertContrast = 0.38 + 1.12 * Math.pow(Math.abs(uy), 0.85);
      const presFactor = pressureSensitivity === 'off' ? 1.0 : (0.35 + 1.15 * Math.pow(pointPressure, 1.1));
      leftHalfWidth = rightHalfWidth = Math.max(2.0, (strokeWidth / 2) * vertContrast * presFactor);
    } else if (style === 'reisho_chisel') {
      const ux = txArr[i];
      const uy = tyArr[i];
      const flatAngle = Math.atan2(Math.abs(uy * 0.9 + ux * 0.25), Math.abs(ux) + 0.001);
      const reishoContrast = 0.32 + 1.05 * Math.sin(flatAngle);
      const presFactor = pressureSensitivity === 'off' ? 1.0 : (0.50 + 0.90 * pointPressure);
      leftHalfWidth = rightHalfWidth = Math.max(3.0, (strokeWidth / 2) * reishoContrast * presFactor);
    } else if (style === 'g_pen') {
      const presFactor = pressureSensitivity === 'off' ? 1.0 : (0.12 + 1.65 * Math.pow(pointPressure, 1.30));
      leftHalfWidth = rightHalfWidth = Math.max(1.5, (strokeWidth / 2) * presFactor);
    } else if (style === 'pixel_dot') {
      leftHalfWidth = rightHalfWidth = Math.max(3.0, strokeWidth / 2);
    } else if (style === 'marker') {
      const presFactor = pressureSensitivity === 'off' ? 1.0 : (0.55 + 0.70 * pointPressure);
      leftHalfWidth = rightHalfWidth = Math.max(3, (strokeWidth / 2) * presFactor);
    } else if (style === 'ballpoint') {
      const presFactor = pressureSensitivity === 'off' ? 1.0 : (0.40 + 1.00 * pointPressure);
      leftHalfWidth = rightHalfWidth = Math.max(2, (strokeWidth / 3.0) * presFactor);
    } else if (style === 'chalk') {
      let bubble = 1.0;
      if (normDist < 0.10 || normDist > 0.90) bubble = 1.12;
      const presFactor = pressureSensitivity === 'off' ? 1.0 : (0.50 + 0.85 * pointPressure);
      leftHalfWidth = rightHalfWidth = Math.max(4, (strokeWidth * 0.54) * presFactor * bubble);
    } else if (style === 'calligraphy') {
      const presFactor = pressureSensitivity === 'off' ? 1.0 : (0.25 + 1.35 * Math.pow(pointPressure, 1.05));
      leftHalfWidth = rightHalfWidth = Math.max(2.5, (strokeWidth / 2) * presFactor);
    } else if (style === 'highlighter') {
      const presFactor = pressureSensitivity === 'off' ? 1.0 : (0.70 + 0.50 * pointPressure);
      leftHalfWidth = rightHalfWidth = Math.max(3.0, (strokeWidth / 2) * presFactor);
    } else if (style === 'pencil') {
      const presFactor = pressureSensitivity === 'off' ? 1.0 : (0.25 + 1.25 * Math.pow(pointPressure, 1.10));
      leftHalfWidth = rightHalfWidth = Math.max(1.8, (strokeWidth / 3.6) * presFactor);
    } else if (style === 'wobbly') {
      const wobbleLeft = Math.sin(normDist * 28 + i * 0.75) * 0.12;
      const wobbleRight = Math.cos(normDist * 32 - i * 0.65) * 0.11;
      const presFactor = pressureSensitivity === 'off' ? 1.0 : (0.50 + 0.80 * pointPressure);
      leftHalfWidth = Math.max(3, (strokeWidth / 2) * (presFactor + wobbleLeft));
      rightHalfWidth = Math.max(3, (strokeWidth / 2) * (presFactor + wobbleRight));
    }

    // Apply custom preset parameters if provided (ibisPaint brush customization)
    const cp = options?.customPreset;
    if (cp) {
      // 1. Tapering (入り抜き) - Continuous S-curve transition to eliminate abrupt width jumps
      const startLen = Math.min(0.40, (cp.taperStartLength ?? 0) / 100);
      const endLen = Math.min(0.40, (cp.taperEndLength ?? 0) / 100);
      const startW = Math.max(0.12, (cp.taperStartWidth ?? 100) / 100);
      const endW = Math.max(0.12, (cp.taperEndWidth ?? 100) / 100);

      let taperMultiplier = 1.0;
      if (startLen > 0.001 && normDist < startLen) {
        const t = Math.max(0, Math.min(1.0, normDist / startLen));
        const smoothT = cp.taperTipShape === 'sharp' ? Math.pow(t, 1.5) : 0.5 - 0.5 * Math.cos(t * Math.PI);
        taperMultiplier *= startW + (1.0 - startW) * smoothT;
      }
      if (endLen > 0.001 && normDist > 1.0 - endLen) {
        const t = Math.max(0, Math.min(1.0, (1.0 - normDist) / endLen));
        const smoothT = cp.taperTipShape === 'sharp' ? Math.pow(t, 1.5) : 0.5 - 0.5 * Math.cos(t * Math.PI);
        taperMultiplier *= endW + (1.0 - endW) * smoothT;
      }

      // 2. Nib Shape (扁平率・角度・回転追従)
      let shapeMultiplier = 1.0;
      const aspect = Math.min(0.85, (cp.nibAspectRatio ?? 0) / 100);
      if (aspect > 0.01) {
        const angleDeg = cp.nibAngle ?? 0;
        const angleRad = (angleDeg * Math.PI) / 180;
        let deltaTheta = 0;
        if (cp.nibFollowDirection) {
          const tanTheta = Math.atan2(tyArr[i], txArr[i]);
          deltaTheta = tanTheta - angleRad;
        } else {
          const normTheta = Math.atan2(nyArr[i], nxArr[i]);
          deltaTheta = normTheta - angleRad;
        }
        const flatRatio = Math.max(0.35, 1.0 - 0.65 * aspect);
        shapeMultiplier = Math.max(0.35, Math.sqrt(Math.pow(Math.cos(deltaTheta), 2) + Math.pow(flatRatio * Math.sin(deltaTheta), 2)));
      }

      // 3. Dynamic Speed Modulation (滑らかな速度変化)
      let speedMultiplier = 1.0;
      if (cp.speedWidthFactor && cp.speedWidthFactor !== 0) {
        const speedVal = resampled[i].speed ?? 0.5;
        const factor = (cp.speedWidthFactor / 100) * 0.35;
        speedMultiplier = Math.max(0.70, Math.min(1.30, 1.0 + factor * (speedVal - 0.5)));
      }

      // 4. Organic Natural Jitter (和紙・自然なかすれテイスト)
      let jitterMultiplier = 1.0;
      if (cp.jitterSize && cp.jitterSize > 0) {
        const organicNoise = Math.sin(i * 0.18) * 0.5 + Math.sin(i * 0.45) * 0.3 + Math.cos(i * 0.85) * 0.2;
        jitterMultiplier = 1.0 + organicNoise * (cp.jitterSize / 100) * 0.15;
      }

      leftHalfWidth *= taperMultiplier * shapeMultiplier * speedMultiplier * jitterMultiplier;
      rightHalfWidth *= taperMultiplier * shapeMultiplier * speedMultiplier * jitterMultiplier;
    }

    // Safety checks for custom brush parameters: prevent NaN, Infinity, or negative width collapse
    if (isNaN(leftHalfWidth) || !isFinite(leftHalfWidth) || leftHalfWidth < 0.5) {
      leftHalfWidth = 1.0;
    }
    if (isNaN(rightHalfWidth) || !isFinite(rightHalfWidth) || rightHalfWidth < 0.5) {
      rightHalfWidth = 1.0;
    }

    rawLeftWidths[i] = leftHalfWidth;
    rawRightWidths[i] = rightHalfWidth;
  }

  // Curvature-based inner edge safety check (applied BEFORE width smoothing)
  // Only activates when the turn radius is genuinely tighter than the stroke half-width,
  // preventing loop knots while width smoothing smoothly diffuses the transition without creating notches or gouges.
  for (let i = 2; i < n - 2; i++) {
    const turn = turnArr[i];
    const absTurn = Math.abs(turn);
    if (absTurn > 0.08) {
      const stepDist = dists[Math.min(n - 1, i + 2)] - dists[Math.max(0, i - 2)];
      const radiusOfCurvature = stepDist / (absTurn * 2);
      if (radiusOfCurvature < strokeWidth * 0.75) {
        const safeInnerW = Math.max(2.5, radiusOfCurvature * 0.95);
        if (turn > 0 && rawLeftWidths[i] > safeInnerW) {
          rawLeftWidths[i] = safeInnerW;
        } else if (turn < 0 && rawRightWidths[i] > safeInnerW) {
          rawRightWidths[i] = safeInnerW;
        }
      }
    }
  }

  // 7. Width Smoothing Pass (Adaptive pass count for silky smooth transitions)
  const smoothedLeftWidths = new Float64Array(n);
  const smoothedRightWidths = new Float64Array(n);
  smoothedLeftWidths.set(rawLeftWidths);
  smoothedRightWidths.set(rawRightWidths);

  const defaultPasses = intensityNorm > 0.05 ? Math.max(2, Math.round(2 + 4 * intensityNorm)) : 2;
  const customPasses = options?.customPreset ? 16 : 0;
  const widthPasses = Math.max(options?.widthSmoothingPasses ?? defaultPasses, customPasses);
  for (let pass = 0; pass < widthPasses; pass++) {
    for (let i = 1; i < n - 1; i++) {
      smoothedLeftWidths[i] = (smoothedLeftWidths[i - 1] + smoothedLeftWidths[i] * 2 + smoothedLeftWidths[i + 1]) * 0.25;
      smoothedRightWidths[i] = (smoothedRightWidths[i - 1] + smoothedRightWidths[i] * 2 + smoothedRightWidths[i + 1]) * 0.25;
    }
    if (n >= 2) {
      smoothedLeftWidths[0] = smoothedLeftWidths[0] * 0.70 + smoothedLeftWidths[1] * 0.30;
      smoothedRightWidths[0] = smoothedRightWidths[0] * 0.70 + smoothedRightWidths[1] * 0.30;
      smoothedLeftWidths[n - 1] = smoothedLeftWidths[n - 1] * 0.70 + smoothedLeftWidths[n - 2] * 0.30;
      smoothedRightWidths[n - 1] = smoothedRightWidths[n - 1] * 0.70 + smoothedRightWidths[n - 2] * 0.30;
    }
  }

  // Width rate of change with respect to arc length for boundary curvature calculations
  const dwL_ds = new Float64Array(n);
  const dwR_ds = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const prevIdx = Math.max(0, i - 1);
    const nextIdx = Math.min(n - 1, i + 1);
    const ds = Math.max(0.001, dists[nextIdx] - dists[prevIdx]);
    dwL_ds[i] = (smoothedLeftWidths[nextIdx] - smoothedLeftWidths[prevIdx]) / ds;
    dwR_ds[i] = (smoothedRightWidths[nextIdx] - smoothedRightWidths[prevIdx]) / ds;
  }

  // 8. Chisel Ribbon vs Normal Offset Coordinates
  const isChiselStyle = style === 'calligraphy' || style === 'highlighter';
  const chiselAngleRad = style === 'highlighter' ? (90 * Math.PI) / 180 : (45 * Math.PI) / 180;
  const chiselDx = Math.cos(chiselAngleRad);
  const chiselDy = Math.sin(chiselAngleRad);

  const rightOffsets: Point[] = new Array(n);
  const leftOffsets: Point[] = new Array(n);

  for (let i = 0; i < n; i++) {
    const nx = nxArr[i];
    const ny = nyArr[i];
    const lw = smoothedLeftWidths[i];
    const rw = smoothedRightWidths[i];

    if (isChiselStyle) {
      // 法線ベクトルとチゼルベクトルの内積により、進行方向に対する「左側」を常に正しく判定
      const dotN = chiselDx * nx + chiselDy * ny;
      const sign = dotN >= 0 ? 1 : -1;
      const cLeftX = chiselDx * sign;
      const cLeftY = chiselDy * sign;

      // チゼル角度とストロークが平行に動いた際のリボンの潰れ・裏返りを防ぐ最小厚み
      const minEdgeThickness = Math.max(2.0, (strokeWidth / 2) * 0.09);

      leftOffsets[i] = {
        x: Number((resampled[i].x + cLeftX * lw + nx * minEdgeThickness).toFixed(2)),
        y: Number((resampled[i].y + cLeftY * lw + ny * minEdgeThickness).toFixed(2)),
      };
      rightOffsets[i] = {
        x: Number((resampled[i].x - cLeftX * rw - nx * minEdgeThickness).toFixed(2)),
        y: Number((resampled[i].y - cLeftY * rw - ny * minEdgeThickness).toFixed(2)),
      };
    } else {
      rightOffsets[i] = {
        x: Number((resampled[i].x - nx * rw).toFixed(2)),
        y: Number((resampled[i].y - ny * rw).toFixed(2)),
      };
      leftOffsets[i] = {
        x: Number((resampled[i].x + nx * lw).toFixed(2)),
        y: Number((resampled[i].y + ny * lw).toFixed(2)),
      };
    }
  }

  // 9. Adaptive Boundary Sampling
  // Subdivides into adaptive segments where thickness or curvature changes dynamically.
  // When smoothing is turned off or lowered, preserves full fidelity with appropriate minimum step
  // to avoid creating redundant microscopic nodes (e.g. 500+ nodes on a single straight line).
  const baseSampleDist = intensityNorm <= 0.05 ? 6.0 : 6.0 + 4.0 * intensityNorm;
  const sampleTurnThreshold = intensityNorm <= 0.05 ? 0.16 : 0.16 + 0.12 * intensityNorm;

  const sampleRight: { pt: Point; idx: number }[] = [{ pt: rightOffsets[0], idx: 0 }];
  let accumDistRight = 0;
  let accumTurnRight = 0;

  for (let i = 1; i < n; i++) {
    const d = Math.hypot(rightOffsets[i].x - rightOffsets[i - 1].x, rightOffsets[i].y - rightOffsets[i - 1].y);
    accumDistRight += d;
    accumTurnRight += Math.abs(turnArr[i]);
    const isEnd = i === n - 1;
    const localGrad = Math.abs(dwR_ds[i]);
    const localTurn = Math.abs(turnArr[i]);
    const dynamicThresh = Math.max(3.0, baseSampleDist / (1.0 + 5.0 * localGrad + 2.5 * localTurn));

    if (accumDistRight >= dynamicThresh || accumTurnRight >= sampleTurnThreshold || isEnd) {
      sampleRight.push({ pt: rightOffsets[i], idx: i });
      accumDistRight = 0;
      accumTurnRight = 0;
    }
  }

  const sampleLeft: { pt: Point; idx: number }[] = [{ pt: leftOffsets[n - 1], idx: n - 1 }];
  let accumDistLeft = 0;
  let accumTurnLeft = 0;

  for (let i = n - 2; i >= 0; i--) {
    const d = Math.hypot(leftOffsets[i].x - leftOffsets[i + 1].x, leftOffsets[i].y - leftOffsets[i + 1].y);
    accumDistLeft += d;
    accumTurnLeft += Math.abs(turnArr[i]);
    const isStart = i === 0;
    const localGrad = Math.abs(dwL_ds[i]);
    const localTurn = Math.abs(turnArr[i]);
    const dynamicThresh = Math.max(3.0, baseSampleDist / (1.0 + 5.0 * localGrad + 2.5 * localTurn));

    if (accumDistLeft >= dynamicThresh || accumTurnLeft >= sampleTurnThreshold || isStart) {
      sampleLeft.push({ pt: leftOffsets[i], idx: i });
      accumDistLeft = 0;
      accumTurnLeft = 0;
    }
  }

  // 10. Assemble Closed Loop with Semicircular / Tapered Caps
  // Simplify open right and left trajectories individually before capping to preserve 100% of both edges
  const cleanRight = sampleRight.length > 4
    ? simplifyPointsRDP(sampleRight.map((s) => s.pt), 0.45)
    : sampleRight.map((s) => s.pt);
  const cleanLeft = sampleLeft.length > 4
    ? simplifyPointsRDP(sampleLeft.map((s) => s.pt), 0.45)
    : sampleLeft.map((s) => s.pt);

  const loopPoints: Point[] = [];

  // Add Right Side Points
  for (let i = 0; i < cleanRight.length; i++) {
    loopPoints.push(cleanRight[i]);
  }

  // End Cap
  const endP = resampled[n - 1];
  const endTx = txArr[n - 1];
  const endTy = tyArr[n - 1];
  const endNx = nxArr[n - 1];
  const endNy = nyArr[n - 1];
  const endLeftW = smoothedLeftWidths[n - 1];
  const endRightW = smoothedRightWidths[n - 1];
  const endHalfW = (endLeftW + endRightW) / 2;

  const cp = options?.customPreset;
  const isCustomPreset = Boolean(cp);
  const tipShape = cp?.taperTipShape || 'round';
  const isSharpEnd = isCustomPreset
    ? tipShape === 'sharp' || Boolean(cp?.forceTaperEnd) || isTailFlick || endHalfW <= 2.5
    : isTailFlick || endHalfW <= 2.5;

  if (isSharpEnd && !isChiselStyle) {
    // 払い・抜き・鋭利先端：先端を進行方向 tangent に向けて端正に抜く
    const tipExt = Math.max(2.0, Math.min(10.0, endHalfW * 1.15));
    loopPoints.push({
      x: Number((endP.x + endTx * tipExt * 0.45 - endNx * endRightW * 0.45).toFixed(2)),
      y: Number((endP.y + endTy * tipExt * 0.45 - endNy * endRightW * 0.45).toFixed(2)),
    });
    loopPoints.push({
      x: Number((endP.x + endTx * tipExt).toFixed(2)),
      y: Number((endP.y + endTy * tipExt).toFixed(2)),
    });
    loopPoints.push({
      x: Number((endP.x + endTx * tipExt * 0.45 + endNx * endLeftW * 0.45).toFixed(2)),
      y: Number((endP.y + endTy * tipExt * 0.45 + endNy * endLeftW * 0.45).toFixed(2)),
    });
  } else if (roundCap && !isChiselStyle) {
    if (endHalfW > 2.0) {
      // 均等角ステップ（-3pi/8から+3pi/8まで22.5度刻み）による真円接続キャップ
      const capAngles = [-1.178, -0.785, -0.393, 0, 0.393, 0.785, 1.178];
      for (const phi of capAngles) {
        const c = Math.cos(phi);
        const s = Math.sin(phi);
        const normalW = phi < 0 ? endRightW : endLeftW;
        loopPoints.push({
          x: Number((endP.x + endTx * c * endHalfW + endNx * s * normalW).toFixed(2)),
          y: Number((endP.y + endTy * c * endHalfW + endNy * s * normalW).toFixed(2)),
        });
      }
    } else {
      loopPoints.push({
        x: Number((endP.x + endTx * Math.max(1.8, endHalfW * 0.9)).toFixed(2)),
        y: Number((endP.y + endTy * Math.max(1.8, endHalfW * 0.9)).toFixed(2)),
      });
    }
  }

  // Add Left Side Points (traversing backwards)
  for (let i = 0; i < cleanLeft.length; i++) {
    loopPoints.push(cleanLeft[i]);
  }

  // Start Cap (筆の入り・起筆)
  const startP = resampled[0];
  const startTx = txArr[0];
  const startTy = tyArr[0];
  const startNx = nxArr[0];
  const startNy = nyArr[0];
  const startLeftW = smoothedLeftWidths[0];
  const startRightW = smoothedRightWidths[0];
  const startHalfW = (startLeftW + startRightW) / 2;

  const isSharpStart = isCustomPreset
    ? tipShape === 'sharp' || Boolean(cp?.forceTaper) || startHalfW <= 2.5
    : startHalfW <= 2.0;

  if (isSharpStart && !isChiselStyle) {
    // 鋭利な入り・細先（先端に向けて自然なカーブで収束）
    const tipExt = Math.max(2.0, Math.min(10.0, startHalfW * 1.15));
    loopPoints.push({
      x: Number((startP.x - startTx * tipExt * 0.45 + startNx * startLeftW * 0.45).toFixed(2)),
      y: Number((startP.y - startTy * tipExt * 0.45 + startNy * startLeftW * 0.45).toFixed(2)),
    });
    loopPoints.push({
      x: Number((startP.x - startTx * tipExt).toFixed(2)),
      y: Number((startP.y - startTy * tipExt).toFixed(2)),
    });
    loopPoints.push({
      x: Number((startP.x - startTx * tipExt * 0.45 - startNx * startRightW * 0.45).toFixed(2)),
      y: Number((startP.y - startTy * tipExt * 0.45 - startNy * startRightW * 0.45).toFixed(2)),
    });
  } else if (roundCap && !isChiselStyle) {
    if (startHalfW > 2.0) {
      // 均等角ステップ（+3pi/8から-3pi/8まで22.5度刻み）による滑らかな起筆キャップ
      // cleanLeftの終端(+Nx * lw)から-Tx頂点を経てcleanRightの始端(-Nx * rw)へ完全に連続接続
      const capAngles = [1.178, 0.785, 0.393, 0, -0.393, -0.785, -1.178];
      for (const phi of capAngles) {
        const c = Math.cos(phi);
        const s = Math.sin(phi);
        const normalW = phi > 0 ? startLeftW : startRightW;
        loopPoints.push({
          x: Number((startP.x - startTx * c * startHalfW + startNx * s * normalW).toFixed(2)),
          y: Number((startP.y - startTy * c * startHalfW + startNy * s * normalW).toFixed(2)),
        });
      }
    } else {
      loopPoints.push({
        x: Number((startP.x - startTx * Math.max(1.8, startHalfW * 0.9)).toFixed(2)),
        y: Number((startP.y - startTy * Math.max(1.8, startHalfW * 0.9)).toFixed(2)),
      });
    }
  }

  // Remove consecutive duplicates and microscopic jitter (minimum 1.2px distance)
  const cleanLoop: Point[] = [];
  for (let i = 0; i < loopPoints.length; i++) {
    if (cleanLoop.length === 0) {
      cleanLoop.push(loopPoints[i]);
      continue;
    }
    const prev = cleanLoop[cleanLoop.length - 1];
    const curr = loopPoints[i];
    if (Math.hypot(curr.x - prev.x, curr.y - prev.y) >= 1.2) {
      cleanLoop.push(curr);
    }
  }

  const simplifiedLoop: Point[] = cleanLoop;

  // 11. Convert to smooth G1-continuous Bézier nodes
  const total = simplifiedLoop.length;
  const nodes: BezierNode[] = simplifiedLoop.map((p) => ({
    id: generateId(),
    x: p.x,
    y: p.y,
    type: 'smooth',
  }));

  for (let i = 0; i < total; i++) {
    const prev = nodes[(i - 1 + total) % total];
    const curr = nodes[i];
    const next = nodes[(i + 1) % total];

    const vPrevX = curr.x - prev.x;
    const vPrevY = curr.y - prev.y;
    const dPrev = Math.hypot(vPrevX, vPrevY);

    const vNextX = next.x - curr.x;
    const vNextY = next.y - curr.y;
    const dNext = Math.hypot(vNextX, vNextY);

    if (dPrev < 0.1 || dNext < 0.1) {
      curr.handleIn = { x: curr.x, y: curr.y };
      curr.handleOut = { x: curr.x, y: curr.y };
      continue;
    }

    // Chord direction vectors
    const uPrevX = vPrevX / dPrev;
    const uPrevY = vPrevY / dPrev;
    const uNextX = vNextX / dNext;
    const uNextY = vNextY / dNext;

    // Harmonic bisector tangent: unbiased by asymmetric segment distances
    let tanX = uPrevX + uNextX;
    let tanY = uPrevY + uNextY;
    let tanLen = Math.hypot(tanX, tanY);

    if (tanLen < 0.001) {
      // Near 180-degree turnaround: fallback to perpendicular chord
      tanX = -uPrevY;
      tanY = uPrevX;
      tanLen = Math.hypot(tanX, tanY) || 1;
    }

    tanX /= tanLen;
    tanY /= tanLen;

    // Cosine of turning angle between the two incoming/outgoing segment chords
    const dot = uPrevX * uNextX + uPrevY * uNextY;
    const cosAngle = Math.max(-1, Math.min(1, dot));

    // Corner / Tensetsu / Sharp turn detection (永の二画目などの折れ・転折部分の自然な角ノード処理)
    if (cosAngle < 0.76) {
      // Turn angle > ~40 degrees: Mark as corner node to eliminate unnatural bulging / wavy loop artifacts
      curr.type = 'corner';
      if (cosAngle < 0.35) {
        // Sharp ~90-degree corner: align handles strictly along incoming/outgoing edges or retract
        const inL = Math.min(dPrev * 0.22, 22);
        const outL = Math.min(dNext * 0.22, 22);
        curr.handleIn = inL > 0.5 ? {
          x: Number((curr.x - uPrevX * inL).toFixed(2)),
          y: Number((curr.y - uPrevY * inL).toFixed(2)),
        } : null;
        curr.handleOut = outL > 0.5 ? {
          x: Number((curr.x + uNextX * outL).toFixed(2)),
          y: Number((curr.y + uNextY * outL).toFixed(2)),
        } : null;
      } else {
        // Moderate turn (40° to 70°): decoupled handles along respective edge chords
        const inL = Math.min(dPrev * 0.25, 35);
        const outL = Math.min(dNext * 0.25, 35);
        curr.handleIn = {
          x: Number((curr.x - uPrevX * inL).toFixed(2)),
          y: Number((curr.y - uPrevY * inL).toFixed(2)),
        };
        curr.handleOut = {
          x: Number((curr.x + uNextX * outL).toFixed(2)),
          y: Number((curr.y + uNextY * outL).toFixed(2)),
        };
      }
      continue;
    }

    // Curvature damping factor: gentle curves maintain full natural 0.35 bezier ratio,
    // while sharp turns smoothly taper handles to prevent loop knots and kinks
    const cornerDamping = Math.max(0.04, Math.pow((1 + cosAngle) * 0.5, 0.65));
    const handleRatio = 0.35 * cornerDamping;

    const hInLen = Math.min(dPrev * handleRatio, 110);
    const hOutLen = Math.min(dNext * handleRatio, 110);

    curr.handleIn = {
      x: Number((curr.x - tanX * hInLen).toFixed(2)),
      y: Number((curr.y - tanY * hInLen).toFixed(2)),
    };
    curr.handleOut = {
      x: Number((curr.x + tanX * hOutLen).toFixed(2)),
      y: Number((curr.y + tanY * hOutLen).toFixed(2)),
    };
  }

  const resultContour: PathContour = {
    id: generateId(),
    closed: true,
    nodes,
  };

  // Guarantee consistent screen Clockwise winding (TrueType standard)
  if (getContourSignedArea(resultContour) < 0) {
    return reverseContour(resultContour);
  }
  return resultContour;
}

/**
 * Create a rectangle contour
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


