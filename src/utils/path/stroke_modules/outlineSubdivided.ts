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
import { evaluatePressureCurve } from "../pressure";
import {
  getContourSignedArea,
  reverseContour,
} from "../bounds";
import { simplifyPointsRDP } from "./smoothing";
import { createSharpAngularContour, createPolygonContour, createSharpRoundedContour } from "./sharpContours";
import {
  applyBrushFlex,
  applyTaperCurve,
  clampHalfWidth,
  inkPoolingMultiplier,
  roughnessGrainFrequency,
} from "./presetWidth";

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
 * Pixel grid step for pixel_dot: about 8 steps across the stroke width,
 * so the stair-steps stay visible at any width.
 */
function pixelGridSize(strokeWidth: number): number {
  return Math.max(2, Math.round(strokeWidth / 8));
}

/**
 * Round B: double-line and dotted pens.
 *
 * doubleLineGap / dottedSpacing are 0-100 values on the preset. They are
 * read as a percentage of the stroke width, so a gap of 30 at width 40 is
 * 12px. An explicit 0 draws a single solid line (the caller falls through
 * to the normal path). When the field is absent, the double-line / dotted
 * style itself supplies 30, so selecting the pen without a preset still
 * draws its characteristic shape; other styles default to 0.
 */
const DOUBLE_LINE_DEFAULT_GAP = 30;
const DOTTED_DEFAULT_SPACING = 30;

function resolveDoubleLineGapPx(
  strokeWidth: number,
  style: BrushStyle,
  cp?: Partial<UserPenPreset>
): number {
  const raw = cp?.doubleLineGap ?? (style === 'double_line' ? DOUBLE_LINE_DEFAULT_GAP : 0);
  const pct = Math.max(0, Math.min(100, raw));
  // The two rails keep at least 1px each, so the gap never exceeds
  // strokeWidth - 2.
  return Math.min((pct / 100) * strokeWidth, Math.max(0, strokeWidth - 2));
}

function resolveDottedSpacingPx(
  strokeWidth: number,
  style: BrushStyle,
  cp?: Partial<UserPenPreset>
): number {
  const raw = cp?.dottedSpacing ?? (style === 'dotted' ? DOTTED_DEFAULT_SPACING : 0);
  const pct = Math.max(0, Math.min(100, raw));
  return (pct / 100) * strokeWidth;
}

/** Keep points at least minDist apart along a polyline run, always keeping the first and last point. */
function subsampleRun(pts: Point[], minDist: number): Point[] {
  if (pts.length <= 2) return pts.slice();
  const kept: Point[] = [pts[0]];
  let last = pts[0];
  for (let i = 1; i < pts.length - 1; i++) {
    if (Math.hypot(pts[i].x - last.x, pts[i].y - last.y) >= minDist) {
      kept.push(pts[i]);
      last = pts[i];
    }
  }
  kept.push(pts[pts.length - 1]);
  return kept;
}

/**
 * Double-line outline as one folded closed loop: the two rails are
 * traced in a single loop, so the filled region (nonzero rule, the rule
 * the canvas uses) is exactly the two rails and the gap between them
 * stays empty. The loop is: left outer edge forward, end cap, left inner
 * edge backward, start jump across the gap, right inner edge forward, end
 * cap, right outer edge backward, and the closing segment is the start
 * cap. The two segments across the gap are traversed in opposite
 * directions, so they cancel in the winding and enclose no area.
 */
function buildDoubleLineLoop(
  resampled: { x: number; y: number }[],
  nxArr: Float64Array,
  nyArr: Float64Array,
  leftHalf: Float64Array,
  rightHalf: Float64Array,
  gapPx: number
): Point[] {
  const n = resampled.length;
  const gapHalf = gapPx / 2;
  const leftOuter: Point[] = new Array(n);
  const leftInner: Point[] = new Array(n);
  const rightOuter: Point[] = new Array(n);
  const rightInner: Point[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const cx = resampled[i].x;
    const cy = resampled[i].y;
    const nx = nxArr[i];
    const ny = nyArr[i];
    const oL = leftHalf[i];
    const oR = rightHalf[i];
    // Each rail keeps at least 1px, so a gap wider than the stroke
    // still leaves two thin rails instead of inverting them.
    const iL = Math.min(gapHalf, Math.max(0, oL - 1));
    const iR = Math.min(gapHalf, Math.max(0, oR - 1));
    leftOuter[i] = { x: Number((cx + nx * oL).toFixed(2)), y: Number((cy + ny * oL).toFixed(2)) };
    leftInner[i] = { x: Number((cx + nx * iL).toFixed(2)), y: Number((cy + ny * iL).toFixed(2)) };
    rightOuter[i] = { x: Number((cx - nx * oR).toFixed(2)), y: Number((cy - ny * oR).toFixed(2)) };
    rightInner[i] = { x: Number((cx - nx * iR).toFixed(2)), y: Number((cy - ny * iR).toFixed(2)) };
  }
  const loop: Point[] = [];
  const pushRun = (run: Point[]) => {
    for (const p of subsampleRun(run, 4)) loop.push(p);
  };
  pushRun(leftOuter);
  pushRun(leftInner.slice().reverse());
  pushRun(rightInner);
  pushRun(rightOuter.slice().reverse());
  return loop;
}

/**
 * Dotted outline as one folded closed loop: each dash is a small ribbon,
 * and consecutive dashes are joined by segments along the centreline. The
 * closing segment retraces the centreline backwards, so every centreline
 * segment is traversed once in each direction and encloses no area: the
 * filled region is exactly the dashes and the gaps stay empty. Dashes have
 * flat ends; the dash length is the stroke width, so each dash is about as
 * long as it is wide. The centreline jumps use the resampled centreline
 * points themselves (not a subsampled copy) so the forward and backward
 * passes go through exactly the same coordinates.
 */
function buildDottedLoop(
  resampled: { x: number; y: number }[],
  leftOffsets: Point[],
  rightOffsets: Point[],
  dists: Float64Array,
  totalLength: number,
  dashLen: number,
  gapLen: number
): Point[] {
  const n = resampled.length;
  // Dash intervals in arc length: [0, dashLen], [dashLen+gapLen, ...].
  const dashes: Array<{ start: number; end: number }> = [];
  let s = 0;
  while (s < totalLength) {
    const e = Math.min(s + dashLen, totalLength);
    // A trailing sliver shorter than a quarter dash is dropped so the
    // stroke does not end in a speck.
    if (e - s >= Math.max(4, dashLen * 0.25) || dashes.length === 0) {
      dashes.push({ start: s, end: e });
    }
    s = e + gapLen;
  }
  // Index of the first resampled point at or after arc position pos.
  const indexAt = (pos: number): number => {
    let lo = 0;
    let hi = n - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (dists[mid] < pos) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };
  const loop: Point[] = [];
  const pushRun = (run: Point[]) => {
    for (const p of subsampleRun(run, 4)) loop.push(p);
  };
  for (let k = 0; k < dashes.length; k++) {
    const d = dashes[k];
    const i0 = indexAt(d.start);
    const i1 = Math.max(i0, indexAt(d.end));
    const leftRun: Point[] = [];
    const rightRun: Point[] = [];
    for (let i = i0; i <= i1; i++) {
      leftRun.push(leftOffsets[i]);
      rightRun.push(rightOffsets[i]);
    }
    // Every dash is traced the same way round (left edge forward, end
    // cap, right edge backward), so all dash areas add instead of
    // cancelling. The jump after the dash starts from the right edge
    // start on the centreline, whatever the dash index is. (Tracing
    // alternate dashes the other way round made the signed area of the
    // whole loop cancel to near zero.)
    pushRun(leftRun);
    pushRun(rightRun.slice().reverse());
    if (k < dashes.length - 1) {
      // Centreline jump forward to the next dash start. The first
      // point is the centreline point under the current dash start
      // edge point (the radial segment from the edge point to it is
      // the dash start cap); the last is the centreline point under
      // the next dash start.
      const j1 = indexAt(dashes[k + 1].start);
      for (let i = i0; i <= j1; i++) loop.push(resampled[i]);
    }
  }
  // Closing centreline jump backwards to the stroke start. It retraces
  // every forward jump in the opposite direction, so the jumps cancel
  // in the winding. The loop then closes with the short radial segment
  // from the stroke start centreline point to the first loop point.
  const lastStart = indexAt(dashes[dashes.length - 1].start);
  for (let i = lastStart; i >= 0; i--) loop.push(resampled[i]);
  return loop;
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
  // 多角形ペンは角筆と別ルーチン（以前は同じ関数で輪郭が同一だった）。
  // 3種とも筆圧とカスタム設定が反映される。
  if (style === 'sharp') {
    return createSharpAngularContour(points, strokeWidth, pressureSensitivity, pressureCurve, {
      customPreset: options?.customPreset,
    });
  }
  if (style === 'polygon') {
    return createPolygonContour(points, strokeWidth, pressureSensitivity, pressureCurve, {
      customPreset: options?.customPreset,
    });
  }

  // カクカク角丸筆は幾何学直線骨格＋角丸フィレット・ラウンドキャップルーチンを使用
  if (style === 'sharp_round') {
    return createSharpRoundedContour(points, strokeWidth, pressureSensitivity, pressureCurve, {
      customPreset: options?.customPreset,
    });
  }

  const cp = options?.customPreset;

  // Stabilization method: 'pre' (default) smooths the raw centreline
  // before resampling; 'post' leaves the centreline raw and carries the
  // correction in the width smoothing after the outline is computed.
  const isPostStabilization = cp?.stabilizationMethod === 'post';
  // speedStabilization: extra smoothing strength applied where the stroke
  // is fast (0 at the default, so existing strokes are unchanged).
  const speedStabNorm = Math.max(0, Math.min(1, (cp?.speedStabilization ?? 0) / 100));

  if (points.length < 2) {
    const p = points[0] || { x: 500, y: 500 };
    const r = clampHalfWidth(Math.max(6, strokeWidth / 2), cp);
    if (style === 'pixel_dot') {
      // Pixel dot: a square on the pixel grid, not a smooth circle.
      const grid = pixelGridSize(strokeWidth);
      const cx = Math.round(p.x / grid) * grid;
      const cy = Math.round(p.y / grid) * grid;
      const rGrid = Math.max(grid, Math.round(r / grid) * grid);
      return {
        id: generateId(),
        closed: true,
        nodes: [
          { id: generateId(), x: cx - rGrid, y: cy - rGrid, type: 'corner' },
          { id: generateId(), x: cx + rGrid, y: cy - rGrid, type: 'corner' },
          { id: generateId(), x: cx + rGrid, y: cy + rGrid, type: 'corner' },
          { id: generateId(), x: cx - rGrid, y: cy + rGrid, type: 'corner' },
        ],
      };
    }
    if (style === 'double_line') {
      const gapPx = resolveDoubleLineGapPx(strokeWidth, style, cp);
      const innerR = Math.min(gapPx / 2, r - 1);
      if (innerR > 1) {
        // Tap dot as a ring: the outer circle and the inner circle are
        // one loop, joined by two radial slits traversed in opposite
        // directions, so the filled region is the ring and the centre
        // stays empty. The inner circle runs the opposite way round,
        // so its winding cancels the outer circle's inside the hole.
        const kappa = 0.5522847498;
        const ox = r * kappa;
        const ix = innerR * kappa;
        const nodes: BezierNode[] = [
          { id: generateId(), x: p.x, y: p.y - r, handleIn: { x: p.x - ox, y: p.y - r }, handleOut: { x: p.x + ox, y: p.y - r }, type: 'smooth' },
          { id: generateId(), x: p.x + r, y: p.y, handleIn: { x: p.x + r, y: p.y - ox }, handleOut: { x: p.x + r, y: p.y + ox }, type: 'smooth' },
          { id: generateId(), x: p.x, y: p.y + r, handleIn: { x: p.x + ox, y: p.y + r }, handleOut: { x: p.x - ox, y: p.y + r }, type: 'smooth' },
          { id: generateId(), x: p.x - r, y: p.y, handleIn: { x: p.x - r, y: p.y + ox }, handleOut: { x: p.x - r, y: p.y - ox }, type: 'smooth' },
          // Inner circle, opposite direction: left, bottom, right, top.
          { id: generateId(), x: p.x - innerR, y: p.y, handleIn: { x: p.x - innerR, y: p.y - ix }, handleOut: { x: p.x - innerR, y: p.y + ix }, type: 'smooth' },
          { id: generateId(), x: p.x, y: p.y + innerR, handleIn: { x: p.x - ix, y: p.y + innerR }, handleOut: { x: p.x + ix, y: p.y + innerR }, type: 'smooth' },
          { id: generateId(), x: p.x + innerR, y: p.y, handleIn: { x: p.x + innerR, y: p.y + ix }, handleOut: { x: p.x + innerR, y: p.y - ix }, type: 'smooth' },
          { id: generateId(), x: p.x, y: p.y - innerR, handleIn: { x: p.x + ix, y: p.y - innerR }, handleOut: { x: p.x - ix, y: p.y - innerR }, type: 'smooth' },
        ];
        const ring: PathContour = { id: generateId(), closed: true, nodes };
        if (getContourSignedArea(ring) < 0) return reverseContour(ring);
        return ring;
      }
    }
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

  // For mouse inputs: gentle 1px sub-pixel noise filtering without cutting sharp corners
  if (isMouseInput && rawPts.length >= 4) {
    const origX = rawPts.map((p) => p.x);
    const origY = rawPts.map((p) => p.y);
    for (let i = 1; i < rawPts.length - 1; i++) {
      rawPts[i].x = origX[i - 1] * 0.10 + origX[i] * 0.80 + origX[i + 1] * 0.10;
      rawPts[i].y = origY[i - 1] * 0.10 + origY[i] * 0.80 + origY[i + 1] * 0.10;
    }
  }

  // legacyStabilization: the old pre-correction, one 3-point box pass over
  // the raw centreline before arc lengths are computed. Off by default,
  // so existing strokes are unchanged.
  if (cp?.legacyStabilization && rawPts.length >= 3) {
    const origX = rawPts.map((p) => p.x);
    const origY = rawPts.map((p) => p.y);
    for (let i = 1; i < rawPts.length - 1; i++) {
      rawPts[i].x = origX[i - 1] * 0.25 + origX[i] * 0.5 + origX[i + 1] * 0.25;
      rawPts[i].y = origY[i - 1] * 0.25 + origY[i] * 0.5 + origY[i + 1] * 0.25;
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

  // Auto-Straight Line Detection
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

  // Calculate instantaneous velocities (px/ms)
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

  // 2. Continuous Spatial Gaussian smoothing
  const smoothX = new Float64Array(numRaw);
  const smoothY = new Float64Array(numRaw);
  const smoothP = new Float64Array(numRaw);
  const smoothV = new Float64Array(numRaw);

  // Mean speed of the stroke (px/ms, normalized to 0-1), used by the
  // 'post' stabilization width passes below.
  let meanSpeedNorm = 0;
  if (numRaw > 0) {
    let speedSum = 0;
    for (let i = 0; i < numRaw; i++) speedSum += rawSpeeds[i];
    meanSpeedNorm = Math.max(0, Math.min(1, speedSum / numRaw / 2.5));
  }

  if (numRaw >= 3 && intensityNorm > 0.05 && totalRawArcLen > 2 && !isPostStabilization) {
    const baseSigma = isMouseInput ? 2.2 : 1.8;
    const maxSigmaBonus = isMouseInput ? 11.0 : 13.0;
    const sigma = baseSigma + maxSigmaBonus * intensityNorm;

    for (let i = 0; i < numRaw; i++) {
      // speedStabilization widens the smoothing kernel where the stroke
      // is fast; at the default 0 the kernel is the previous one.
      const localSpeedNorm = Math.max(0, Math.min(1, (rawSpeeds[i] - 0.5) / 2.0));
      const sigmaI = sigma * (1 + speedStabNorm * localSpeedNorm);
      const filterRadius = sigmaI * 2.5;
      const twoSigmaSq = 2 * sigmaI * sigmaI;

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
        const distFromEnd = Math.min(sCenter, totalRawArcLen - sCenter);
        const endBlend = Math.min(1.0, distFromEnd / Math.max(3.0, sigmaI * 0.75));
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

  // Monotone Cubic Hermite Tangents
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

  // 3. Resample & Spline-Interpolate centerline
  const densityMultiplier = options?.density === 'ultra' ? 0.75 : options?.density === 'normal' ? 1.4 : 1.0;
  const customStep = options?.subdivisionStep;
  const stepTarget = (customStep || (intensityNorm <= 0.05 ? 1.25 : 1.25 + 0.75 * intensityNorm)) * densityMultiplier;

  // nibSpacing: the pen-tip spacing used as the outline sampling
  // interval. 1% is the default and leaves the step unchanged; 100%
  // quadruples it, so the outline is sampled more coarsely.
  const nibSpacingFactor = cp
    ? 1 + ((Math.max(1, Math.min(100, cp.nibSpacing ?? 1)) - 1) / 99) * 3
    : 1;
  const baseStepTarget = stepTarget * nibSpacingFactor;
  // jitterSpacing: deterministic per-segment variation of the sampling
  // interval, combined with nibSpacing. 0% is the default (no variation).
  const jitterSpacingNorm = cp ? Math.max(0, Math.min(100, cp.jitterSpacing ?? 0)) / 100 : 0;

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
    let segStep = baseStepTarget;
    if (jitterSpacingNorm > 0) {
      const spacingNoise1 = Math.sin(i * 12.9898) * 43758.5453;
      const spacingNoise = (spacingNoise1 - Math.floor(spacingNoise1) - 0.5) * 2;
      segStep = baseStepTarget * Math.max(0.5, 1 + jitterSpacingNorm * 0.5 * spacingNoise);
    }
    const subSteps = Math.max(1, Math.ceil(segDist / segStep));

    for (let s = 1; s <= subSteps; s++) {
      const u = s / subSteps;
      const pt = evalCentripetalCatmullRom(p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y, u);
      const pres = evalHermitePressure(i, u, segDist);
      const vel = p1v + (p2v - p1v) * u;
      const t0seg = rawPts[i].time;
      const t1seg = rawPts[i + 1].time;
      const segTime =
        typeof t0seg === 'number' && typeof t1seg === 'number'
          ? t0seg + (t1seg - t0seg) * u
          : undefined;
      resampled.push({ x: pt.x, y: pt.y, pressure: pres, speed: vel, time: segTime });
    }
  }

  const n = resampled.length;
  if (n < 2) {
    return strokePointsToOutline([resampled[0]], strokeWidth, style, roundCap, pressureSensitivity, pressureCurve);
  }

  // jitterPosition: deterministic centreline offset. When
  // jitterConstrainPerp is true the offset is perpendicular to the stroke
  // (normal direction); otherwise it uses a pseudo-random direction.
  // Applied before cumulative distances are computed.
  if (cp?.jitterPosition && cp.jitterPosition > 0) {
    const amp = (cp.jitterPosition / 100) * Math.max(1, strokeWidth * 0.08);
    const constrainPerp = cp.jitterConstrainPerp !== false;
    for (let i = 1; i < n - 1; i++) {
      const prevP = resampled[i - 1];
      const nextP = resampled[i + 1];
      let dx = nextP.x - prevP.x;
      let dy = nextP.y - prevP.y;
      const len = Math.hypot(dx, dy) || 1;
      dx /= len;
      dy /= len;
      const noise1 = Math.sin(i * 12.9898) * 43758.5453;
      const noise2 = Math.sin(i * 78.233) * 12543.21;
      const r1 = noise1 - Math.floor(noise1) - 0.5;
      const r2 = noise2 - Math.floor(noise2) - 0.5;
      if (constrainPerp) {
        resampled[i].x += -dy * r1 * 2 * amp;
        resampled[i].y += dx * r1 * 2 * amp;
      } else {
        resampled[i].x += r1 * 2 * amp;
        resampled[i].y += r2 * 2 * amp;
      }
    }
  }

  // 4. Cumulative distance
  const dists = new Float64Array(n);
  for (let i = 1; i < n; i++) {
    const dx = resampled[i].x - resampled[i - 1].x;
    const dy = resampled[i].y - resampled[i - 1].y;
    dists[i] = dists[i - 1] + Math.hypot(dx, dy);
  }
  const totalLength = dists[n - 1] || 1;

  // Time-based taper (taperStartTime / taperEndTime): the taper zone is
  // the distance covered during the first/last X% of the stroke duration,
  // capped by the length-based taper zone. At the default 100% the whole
  // duration is covered, so the length-based zone applies unchanged, and
  // without timestamps the length zone applies as before. Writing speed
  // therefore changes how the entry and exit taper appear: a slow start
  // covers little distance in the same time, so the entry taper is
  // shorter in space than a fast start.
  let timeStartLen = 1;
  let timeEndLen = 1;
  const timeFirst = resampled[0].time;
  const timeLast = resampled[n - 1].time;
  if (typeof timeFirst === 'number' && typeof timeLast === 'number' && timeLast > timeFirst) {
    const startTimeFrac = Math.max(0, Math.min(1, (cp?.taperStartTime ?? 100) / 100));
    const endTimeFrac = Math.max(0, Math.min(1, (cp?.taperEndTime ?? 100) / 100));
    for (let i = 0; i < n; i++) {
      const ti = resampled[i].time;
      const frac = typeof ti === 'number' ? (ti - timeFirst) / (timeLast - timeFirst) : dists[i] / totalLength;
      if (frac >= startTimeFrac) {
        timeStartLen = dists[i] / totalLength;
        break;
      }
    }
    for (let i = n - 1; i >= 0; i--) {
      const ti = resampled[i].time;
      const frac = typeof ti === 'number' ? (ti - timeFirst) / (timeLast - timeFirst) : dists[i] / totalLength;
      if (frac <= 1 - endTimeFrac) {
        timeEndLen = 1 - dists[i] / totalLength;
        break;
      }
    }
  }

  // 5. Continuous Tangents and Normals
  const txArr = new Float64Array(n);
  const tyArr = new Float64Array(n);
  const nxArr = new Float64Array(n);
  const nyArr = new Float64Array(n);
  const turnArr = new Float64Array(n);

  const windowRadius = Math.max(2, Math.min(6, Math.round(16 / baseStepTarget)));
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
      const cross = txArr[i - 1] * tyArr[i + 1] - tyArr[i - 1] * txArr[i + 1];
      const dot = txArr[i - 1] * txArr[i + 1] + tyArr[i - 1] * tyArr[i + 1];
      turnArr[i] = Math.atan2(cross, Math.max(-1, Math.min(1, dot)));
    }
  }

  let isTailFlick = false;
  if (n >= 4 && totalLength > 15) {
    const pEnd = resampled[n - 1].pressure ?? 0.5;
    const pBefore = resampled[Math.max(0, Math.floor(n * 0.7))].pressure ?? 0.5;
    const vEnd = resampled[n - 1].speed ?? 0.5;
    const vBefore = resampled[Math.max(0, Math.floor(n * 0.7))].speed ?? 0.5;

    const isStylusStroke = rawPts.some((p) => p.pointerType === 'pen');
    const isPressureDropping = isStylusStroke && pressureSensitivity !== 'off' && (pEnd < 0.38 || (pEnd - pBefore) < -0.12);
    const isSpeedFlick = isStylusStroke ? (vEnd > 1.05 || (vEnd > 0.72 && vEnd > vBefore * 1.25)) : (vEnd > 1.8 && vEnd > vBefore * 1.5);
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
      // pressureGamma: additional response exponent (0.5 - 2.5, 1.0 = neutral).
      if (cp?.pressureGamma && cp.pressureGamma !== 1.0) {
        const gamma = Math.max(0.5, Math.min(2.5, cp.pressureGamma));
        pointPressure = Math.max(0.02, Math.min(1.0, Math.pow(pointPressure, gamma)));
      }
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

      const bellyX = 0.7071;
      const bellyY = 0.7071;
      const leftBellyProj = nx * bellyX + ny * bellyY;
      const asymBias = 0.06 * leftBellyProj;
      let leftMul = 1.0 + asymBias;
      let rightMul = 1.0 - asymBias;

      const localTurn = turnArr[i];
      if (Math.abs(localTurn) > 0.20) {
        const shoulder = Math.min(0.18, Math.abs(localTurn) * 0.15);
        if (localTurn > 0) rightMul += shoulder;
        else leftMul += shoulder;
      }

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
      // Pixel pen: width follows pressure; the bitmap look comes from
      // grid quantization of the outline below, not from a constant width.
      const presFactor = pressureSensitivity === 'off' ? 1.0 : (0.35 + 1.15 * pointPressure);
      leftHalfWidth = rightHalfWidth = Math.max(3.0, (strokeWidth / 2) * presFactor);
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
      const wobbleLeft = Math.sin(normDist * 28 + i * 0.75) * 0.22;
      const wobbleRight = Math.cos(normDist * 32 - i * 0.65) * 0.20;
      const presFactor = pressureSensitivity === 'off' ? 1.0 : (0.50 + 0.80 * pointPressure);
      leftHalfWidth = Math.max(3, (strokeWidth / 2) * (presFactor + wobbleLeft));
      rightHalfWidth = Math.max(3, (strokeWidth / 2) * (presFactor + wobbleRight));
    } else if (style === 'double_line' || style === 'dotted') {
      // Uniform marker-like width; the hollow / divided shape comes from
      // the folded loop assembly below, not from the width.
      const presFactor = pressureSensitivity === 'off' ? 1.0 : (0.55 + 0.70 * pointPressure);
      leftHalfWidth = rightHalfWidth = Math.max(3, (strokeWidth / 2) * presFactor);
    } else if (style === 'bristle') {
      const presFactor = pressureSensitivity === 'off' ? 1.0 : (0.60 + 0.75 * pointPressure);
      // Bristle grooves: deterministic width modulation along the arc
      // length, separate from edgeRoughness (which is index-based xy
      // noise on the finished loop). The wavelengths (12px / 23px)
      // survive the width smoothing passes, and a deeper notch every
      // 41px reads as a separated bristle.
      const s = dists[i];
      const groove =
        1 +
        0.09 * Math.sin(s * 0.5236 + 1.3) +
        0.05 * Math.sin(s * 0.2732 + 4.1) -
        0.14 * Math.pow(Math.max(0, Math.sin(s * 0.1532 + 0.7)), 6);
      leftHalfWidth = rightHalfWidth = Math.max(3, (strokeWidth / 2) * presFactor * groove);
    } else if (style === 'reed') {
      const presFactor = pressureSensitivity === 'off' ? 1.0 : (0.15 + 1.60 * Math.pow(pointPressure, 1.3));
      // Kasuri (feather): periodic deep narrowings along the arc length,
      // plus a moderate-frequency width noise for the rough edge. The
      // kasuri wavelength (25px) survives the width smoothing passes;
      // the dips use sin^2 (not a sharper power) so they stay wide
      // enough not to be smoothed away.
      const s = dists[i];
      const kasuri = Math.pow(Math.max(0, Math.sin(s * 0.2513 + 0.9)), 2);
      const rough = 1 + 0.06 * Math.sin(s * 0.5712 + 2.0) + 0.04 * Math.sin(s * 0.3702 + 5.0);
      leftHalfWidth = rightHalfWidth = Math.max(2, (strokeWidth / 2) * presFactor * (1 - 0.65 * kasuri) * rough);
    } else if (style === 'round_nib') {
      // Fine uniform round nib: less pressure response than ballpoint
      // (a smaller width change) and a harder tip, so the line stays thin
      // and even. The width is strokeWidth / 3.2 against ballpoint's / 3.0.
      const presFactor = pressureSensitivity === 'off' ? 1.0 : (0.70 + 0.55 * pointPressure);
      leftHalfWidth = rightHalfWidth = Math.max(2, (strokeWidth / 3.2) * presFactor);
    } else if (style === 'fine_brush') {
      const presFactor = pressureSensitivity === 'off' ? 1.0 : (0.22 + 1.55 * Math.pow(pointPressure, 1.25));
      // A thin small brush: narrower than brush (0.85 factor) with a
      // stronger entry and exit taper, so the tip reads as pointed.
      let fineMul = 1.0;
      if (normDist < 0.15) {
        const t = normDist / 0.15;
        fineMul *= 0.55 + 0.45 * (0.5 - 0.5 * Math.cos(t * Math.PI));
      } else if (normDist > 0.85) {
        const t = (normDist - 0.85) / 0.15;
        if (isTailFlick) {
          fineMul *= Math.max(0.12, 1.0 - 0.88 * Math.sin(t * Math.PI * 0.5));
        } else {
          fineMul *= 1.0 - 0.65 * (0.5 - 0.5 * Math.cos(t * Math.PI));
        }
      }
      leftHalfWidth = rightHalfWidth = Math.max(1.5, (strokeWidth / 2) * presFactor * 0.85 * fineMul);
    }

    if (cp) {
      const startLen = Math.min(0.40, (cp.taperStartLength ?? 0) / 100, timeStartLen);
      const endLen = Math.min(0.40, (cp.taperEndLength ?? 0) / 100, timeEndLen);
      const startW = Math.max(0.12, (cp.taperStartWidth ?? 100) / 100);
      const endW = Math.max(0.12, (cp.taperEndWidth ?? 100) / 100);

      let taperMultiplier = 1.0;
      if (startLen > 0.001 && normDist < startLen) {
        const t = Math.max(0, Math.min(1.0, normDist / startLen));
        const smoothT = applyTaperCurve(
          cp.taperTipShape === 'sharp' ? Math.pow(t, 1.5) : 0.5 - 0.5 * Math.cos(t * Math.PI),
          cp.taperCurve
        );
        taperMultiplier *= startW + (1.0 - startW) * smoothT;
      }
      if (endLen > 0.001 && normDist > 1.0 - endLen) {
        const t = Math.max(0, Math.min(1.0, (1.0 - normDist) / endLen));
        const smoothT = applyTaperCurve(
          cp.taperTipShape === 'sharp' ? Math.pow(t, 1.5) : 0.5 - 0.5 * Math.cos(t * Math.PI),
          cp.taperCurve
        );
        taperMultiplier *= endW + (1.0 - endW) * smoothT;
      }

      let shapeMultiplier = 1.0;
      const aspect = Math.min(0.85, (cp.nibAspectRatio ?? 0) / 100);
      if (aspect > 0.01) {
        // jitterAngle: deterministic variation of the nib angle.
        const angleJitter = cp.jitterAngle
          ? (Math.sin(i * 0.53) * 0.5 + Math.cos(i * 0.29) * 0.5) * (cp.jitterAngle / 100) * 30
          : 0;
        const angleDeg = (cp.nibAngle ?? 0) + angleJitter;
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

      let speedMultiplier = 1.0;
      if (cp.speedWidthFactor && cp.speedWidthFactor !== 0) {
        const speedVal = resampled[i].speed ?? 0.5;
        const factor = (cp.speedWidthFactor / 100) * 0.35;
        speedMultiplier = Math.max(0.70, Math.min(1.30, 1.0 + factor * (speedVal - 0.5)));
      }

      let jitterMultiplier = 1.0;
      if (cp.jitterSize && cp.jitterSize > 0) {
        const organicNoise = Math.sin(i * 0.18) * 0.5 + Math.sin(i * 0.45) * 0.3 + Math.cos(i * 0.85) * 0.2;
        jitterMultiplier = 1.0 + organicNoise * (cp.jitterSize / 100) * 0.15;
      }
      // jitterOpacity: a vector outline has no per-point opacity channel, so
      // opacity jitter is approximated as a small deterministic width
      // variation, the same channel used for jitterSize.
      if (cp.jitterOpacity && cp.jitterOpacity > 0) {
        const opacityNoise = Math.sin(i * 0.31) * 0.5 + Math.sin(i * 0.77) * 0.5;
        jitterMultiplier *= 1.0 + opacityNoise * (cp.jitterOpacity / 100) * 0.15;
      }

      // Taper opacity: approximated as a width factor (0.7 at 0% opacity to
      // 1.0 at 100%), because a filled vector outline cannot carry opacity.
      let opacityMultiplier = 1.0;
      const startOpacity = cp.taperStartOpacity !== undefined ? Math.max(0, Math.min(100, cp.taperStartOpacity)) / 100 : 1;
      const endOpacity = cp.taperEndOpacity !== undefined ? Math.max(0, Math.min(100, cp.taperEndOpacity)) / 100 : 1;
      if (startLen > 0.001 && normDist < startLen) {
        const t = Math.max(0, Math.min(1.0, normDist / startLen));
        const opacityAt = startOpacity + (1 - startOpacity) * t;
        opacityMultiplier *= 0.7 + 0.3 * opacityAt;
      }
      if (endLen > 0.001 && normDist > 1.0 - endLen) {
        const t = Math.max(0, Math.min(1.0, (1.0 - normDist) / endLen));
        const opacityAt = endOpacity + (1 - endOpacity) * t;
        opacityMultiplier *= 0.7 + 0.3 * opacityAt;
      }

      // speedFeatherFactor / pressureFeatherFactor: kasuri simulated by
      // narrowing the stroke at high speed or light pressure.
      let featherMultiplier = 1.0;
      if (cp.speedFeatherFactor && cp.speedFeatherFactor > 0) {
        const speedVal = resampled[i].speed ?? 0.5;
        if (speedVal > 0.5) {
          featherMultiplier *= 1.0 - (cp.speedFeatherFactor / 100) * 0.35 * Math.min(1, speedVal - 0.5);
        }
      }
      if (cp.pressureFeatherFactor && cp.pressureFeatherFactor > 0) {
        featherMultiplier *= 1.0 - (cp.pressureFeatherFactor / 100) * 0.35 * (1 - pointPressure);
      }

      // pressureWidthFactor: extra width change driven by pressure.
      let pressureWidthMultiplier = 1.0;
      if (cp.pressureWidthFactor && cp.pressureWidthFactor !== 0) {
        pressureWidthMultiplier = 1.0 + (cp.pressureWidthFactor / 100) * (pointPressure - 0.5);
      }

      // inkBleed: bleed widens the stroke slightly.
      const inkBleedMultiplier = cp.inkBleed ? 1.0 + (cp.inkBleed / 100) * 0.15 : 1.0;

      // tipSharpness: extra narrowing in the last 10% of the stroke.
      let tipMultiplier = 1.0;
      if (cp.tipSharpness && cp.tipSharpness > 0 && normDist > 0.9) {
        tipMultiplier = 1.0 - (cp.tipSharpness / 100) * 0.5 * ((normDist - 0.9) / 0.1);
      }

      // inkPooling: extra width near the start of the stroke and at
      // sharp turns, mirroring the built-in sumi pooling shape. At the
      // default 0 the multiplier is exactly 1, so existing strokes are
      // unchanged (including sumi, whose built-in pooling stays as is
      // and stacks with this field).
      const poolMultiplier = inkPoolingMultiplier(normDist, Math.abs(turnArr[i]), cp.inkPooling);

      leftHalfWidth *= taperMultiplier * shapeMultiplier * speedMultiplier * jitterMultiplier * opacityMultiplier * featherMultiplier * pressureWidthMultiplier * inkBleedMultiplier * tipMultiplier * poolMultiplier;
      rightHalfWidth *= taperMultiplier * shapeMultiplier * speedMultiplier * jitterMultiplier * opacityMultiplier * featherMultiplier * pressureWidthMultiplier * inkBleedMultiplier * tipMultiplier * poolMultiplier;

      // constantWidth: uniform width along the stroke. The taper tip
      // narrowing is kept, all other width variation is discarded.
      if (cp.constantWidth) {
        const uniform = (strokeWidth / 2) * taperMultiplier;
        leftHalfWidth = uniform;
        rightHalfWidth = uniform;
      }
    }

    // minWidth / maxWidth: clamp each half-width to half of the
    // full-width limit, so the total width stays within the limits.
    // At the defaults (minWidth 0, maxWidth undefined or 0) this is
    // the identity. Applied after constantWidth as well, and before
    // the width smoothing passes (which preserve the bounds, being
    // convex combinations).
    leftHalfWidth = clampHalfWidth(leftHalfWidth, cp);
    rightHalfWidth = clampHalfWidth(rightHalfWidth, cp);

    if (isNaN(leftHalfWidth) || !isFinite(leftHalfWidth) || leftHalfWidth < 0.5) {
      leftHalfWidth = 1.0;
    }
    if (isNaN(rightHalfWidth) || !isFinite(rightHalfWidth) || rightHalfWidth < 0.5) {
      rightHalfWidth = 1.0;
    }

    rawLeftWidths[i] = leftHalfWidth;
    rawRightWidths[i] = rightHalfWidth;
  }

  // brushFlex: lag the width changes in stroke order (a causal
  // low-pass over the per-point widths), so a pressure rise reaches
  // the width later. At the default 0 the widths are left untouched.
  // Applied before the curvature safety check and the width smoothing
  // passes, so both see the flexed widths.
  if (cp?.brushFlex && cp.brushFlex > 0) {
    applyBrushFlex(rawLeftWidths, cp.brushFlex);
    applyBrushFlex(rawRightWidths, cp.brushFlex);
  }

  // Curvature-based inner edge safety check
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

  // 7. Width Smoothing Pass
  const smoothedLeftWidths = new Float64Array(n);
  const smoothedRightWidths = new Float64Array(n);
  smoothedLeftWidths.set(rawLeftWidths);
  smoothedRightWidths.set(rawRightWidths);

  const defaultPasses = intensityNorm > 0.05 ? Math.max(2, Math.round(2 + 4 * intensityNorm)) : 2;
  // Extra width smoothing only when the preset adds high-frequency width
  // variation (jitterSize / jitterOpacity). Previously any active preset
  // forced 16 passes, so merely selecting a preset changed the stroke
  // even with every field at its default, and it halved the wobbly
  // wobble detail.
  const hasWidthJitter =
    Boolean(cp) && ((cp?.jitterSize ?? 0) > 0 || (cp?.jitterOpacity ?? 0) > 0);
  const customPasses = hasWidthJitter ? 16 : 0;
  // 'post' stabilization: the centreline was not pre-smoothed, so the
  // width smoothing after the outline is computed carries the correction
  // instead, with more passes at higher intensity. At the default 'pre'
  // method this adds nothing. speedStabilization adds passes where the
  // stroke is fast; at its default 0 it adds none.
  const postPasses = isPostStabilization
    ? Math.round(2 + 10 * intensityNorm + 6 * speedStabNorm * meanSpeedNorm)
    : 0;
  const widthPasses = Math.max(options?.widthSmoothingPasses ?? defaultPasses, customPasses, postPasses);
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
      const dotN = chiselDx * nx + chiselDy * ny;
      const sign = dotN >= 0 ? 1 : -1;
      const cLeftX = chiselDx * sign;
      const cLeftY = chiselDy * sign;
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

  // Round B: double-line and dotted pens use a folded closed loop
  // (buildDoubleLineLoop / buildDottedLoop) instead of the sampled
  // single-line loop with caps below. An explicit gap / spacing of 0
  // falls through to the normal path, so the result is exactly the
  // single line.
  const doubleLineGapPx = style === 'double_line' ? resolveDoubleLineGapPx(strokeWidth, style, cp) : 0;
  const dottedSpacingPx = style === 'dotted' ? resolveDottedSpacingPx(strokeWidth, style, cp) : 0;
  const useDoubleLineLoop = style === 'double_line' && doubleLineGapPx > 0.5;
  const useDottedLoop = style === 'dotted' && dottedSpacingPx > 0.5;

  let loopPoints: Point[];
  if (useDoubleLineLoop) {
    loopPoints = buildDoubleLineLoop(resampled, nxArr, nyArr, smoothedLeftWidths, smoothedRightWidths, doubleLineGapPx);
  } else if (useDottedLoop) {
    loopPoints = buildDottedLoop(resampled, leftOffsets, rightOffsets, dists, totalLength, strokeWidth, dottedSpacingPx);
  } else {
  // 9. Adaptive Boundary Sampling
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

  // 10. Assemble Closed Loop with Caps
  const cleanRight = sampleRight.length > 4
    ? simplifyPointsRDP(sampleRight.map((s) => s.pt), 0.45)
    : sampleRight.map((s) => s.pt);
  const cleanLeft = sampleLeft.length > 4
    ? simplifyPointsRDP(sampleLeft.map((s) => s.pt), 0.45)
    : sampleLeft.map((s) => s.pt);

  loopPoints = [];

  for (let i = 0; i < cleanRight.length; i++) {
    loopPoints.push(cleanRight[i]);
  }

  // lineCap: the preset field overrides the roundCap parameter.
  // 'round' (the default) is the existing semicircular cap. 'square'
  // is a flat cap extended by half the width along the stroke
  // direction. 'butt' adds no cap points, so the loop closes straight
  // across the end. A sharp tip (taperTipShape 'sharp', forceTaper /
  // forceTaperEnd, or a tail flick) still takes precedence over the
  // cap, as before, and chisel styles keep their ribbon ends.
  const lineCap = cp?.lineCap ?? (roundCap ? 'round' : 'butt');

  // End Cap
  const endP = resampled[n - 1];
  const endTx = txArr[n - 1];
  const endTy = tyArr[n - 1];
  const endNx = nxArr[n - 1];
  const endNy = nyArr[n - 1];
  const endLeftW = smoothedLeftWidths[n - 1];
  const endRightW = smoothedRightWidths[n - 1];
  const endHalfW = (endLeftW + endRightW) / 2;

  const tipShape = cp?.taperTipShape || 'round';
  const isSharpEnd = Boolean(cp)
    ? tipShape === 'sharp' || Boolean(cp?.forceTaperEnd) || isTailFlick || endHalfW <= 2.5
    : isTailFlick || endHalfW <= 2.5;

  if (isSharpEnd && !isChiselStyle) {
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
  } else if (lineCap === 'round' && !isChiselStyle) {
    if (endHalfW > 2.0) {
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
  } else if (lineCap === 'square' && !isChiselStyle) {
    loopPoints.push({
      x: Number((endP.x + endTx * endHalfW - endNx * endRightW).toFixed(2)),
      y: Number((endP.y + endTy * endHalfW - endNy * endRightW).toFixed(2)),
    });
    loopPoints.push({
      x: Number((endP.x + endTx * endHalfW + endNx * endLeftW).toFixed(2)),
      y: Number((endP.y + endTy * endHalfW + endNy * endLeftW).toFixed(2)),
    });
  }

  for (let i = 0; i < cleanLeft.length; i++) {
    loopPoints.push(cleanLeft[i]);
  }

  // Start Cap
  const startP = resampled[0];
  const startTx = txArr[0];
  const startTy = tyArr[0];
  const startNx = nxArr[0];
  const startNy = nyArr[0];
  const startLeftW = smoothedLeftWidths[0];
  const startRightW = smoothedRightWidths[0];
  const startHalfW = (startLeftW + startRightW) / 2;

  const isSharpStart = Boolean(cp)
    ? tipShape === 'sharp' || Boolean(cp?.forceTaper) || startHalfW <= 2.5
    : startHalfW <= 2.0;

  if (isSharpStart && !isChiselStyle) {
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
  } else if (lineCap === 'round' && !isChiselStyle) {
    if (startHalfW > 2.0) {
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
  } else if (lineCap === 'square' && !isChiselStyle) {
    loopPoints.push({
      x: Number((startP.x - startTx * startHalfW + startNx * startLeftW).toFixed(2)),
      y: Number((startP.y - startTy * startHalfW + startNy * startLeftW).toFixed(2)),
    });
    loopPoints.push({
      x: Number((startP.x - startTx * startHalfW - startNx * startRightW).toFixed(2)),
      y: Number((startP.y - startTy * startHalfW - startNy * startRightW).toFixed(2)),
    });
  }
  } // else: single-line loop with caps

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

  // pixel_dot: snap the outline to a pixel grid so the stroke reads as
  // bitmap-like steps. The corner nodes forced below keep the steps from
  // being smoothed back into curves by the bezier conversion.
  if (style === 'pixel_dot') {
    const grid = pixelGridSize(strokeWidth);
    for (const p of simplifiedLoop) {
      p.x = Math.round(p.x / grid) * grid;
      p.y = Math.round(p.y / grid) * grid;
    }
    for (let i = simplifiedLoop.length - 1; i > 0; i--) {
      if (
        simplifiedLoop[i].x === simplifiedLoop[i - 1].x &&
        simplifiedLoop[i].y === simplifiedLoop[i - 1].y
      ) {
        simplifiedLoop.splice(i, 1);
      }
    }
    if (
      simplifiedLoop.length > 1 &&
      simplifiedLoop[0].x === simplifiedLoop[simplifiedLoop.length - 1].x &&
      simplifiedLoop[0].y === simplifiedLoop[simplifiedLoop.length - 1].y
    ) {
      simplifiedLoop.pop();
    }
  }

  // axisSlant / edgeRoughness: applied to the closed outline loop.
  // axisSlant shears the loop around its centroid (positive angle leans
  // the top to the right, as in italic). edgeRoughness adds deterministic
  // boundary noise.
  if (cp) {
    if (cp.axisSlant && cp.axisSlant !== 0) {
      const slantRad = (Math.max(-45, Math.min(45, cp.axisSlant)) * Math.PI) / 180;
      const tanSlant = Math.tan(slantRad);
      let cx = 0;
      let cy = 0;
      for (const p of simplifiedLoop) {
        cx += p.x;
        cy += p.y;
      }
      cx /= Math.max(1, simplifiedLoop.length);
      cy /= Math.max(1, simplifiedLoop.length);
      for (const p of simplifiedLoop) {
        p.x = Number((p.x + (cy - p.y) * tanSlant).toFixed(2));
      }
    }
    // Double-line and dotted pens skip the edge roughness: the noise
    // is a function of the loop index, so the forward and backward
    // centreline jumps would get different noise and stop coinciding,
    // which would fill the gaps with thin slivers. axisSlant above is
    // a linear map, so it keeps the jumps coincident and still applies.
    if (cp.edgeRoughness && cp.edgeRoughness > 0 && style !== 'double_line' && style !== 'dotted') {
      const amp = (cp.edgeRoughness / 100) * 2.5;
      // roughnessScale: the grain size of the noise. 50 (the default)
      // keeps the existing grain; a larger scale stretches the noise
      // pattern along the outline (larger grains).
      const grainFreq = roughnessGrainFrequency(cp.roughnessScale);
      for (let i = 0; i < simplifiedLoop.length; i++) {
        const n1 = Math.sin(i * 12.9898 * grainFreq) * 43758.5453;
        const n2 = Math.sin(i * 78.233 * grainFreq) * 12543.21;
        const r1 = n1 - Math.floor(n1) - 0.5;
        const r2 = n2 - Math.floor(n2) - 0.5;
        simplifiedLoop[i].x = Number((simplifiedLoop[i].x + r1 * 2 * amp).toFixed(2));
        simplifiedLoop[i].y = Number((simplifiedLoop[i].y + r2 * 2 * amp).toFixed(2));
      }
    }
  }

  // lineJoin: how sharp turns of the outline are joined. 'miter'
  // (the default) is the existing pointed corner. 'round' smooths the
  // turn with tangent handles instead, 'bevel' cuts it flat with no
  // handles. Gentle turns stay smooth as before, whatever the join is.
  const lineJoin = cp?.lineJoin ?? 'miter';

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

    const uPrevX = vPrevX / dPrev;
    const uPrevY = vPrevY / dPrev;
    const uNextX = vNextX / dNext;
    const uNextY = vNextY / dNext;

    let tanX = uPrevX + uNextX;
    let tanY = uPrevY + uNextY;
    let tanLen = Math.hypot(tanX, tanY);

    if (tanLen < 0.001) {
      tanX = -uPrevY;
      tanY = uPrevX;
      tanLen = Math.hypot(tanX, tanY) || 1;
    }

    tanX /= tanLen;
    tanY /= tanLen;

    const dot = uPrevX * uNextX + uPrevY * uNextY;
    const cosAngle = Math.max(-1, Math.min(1, dot));

    if (cosAngle < 0.76 && lineJoin !== 'round') {
      curr.type = 'corner';
      if (lineJoin === 'bevel') {
        curr.handleIn = null;
        curr.handleOut = null;
      } else if (cosAngle < 0.35) {
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

  // pixel_dot: straight stair-step edges. Corner nodes with no handles
  // render as straight segments between grid points.
  if (style === 'pixel_dot') {
    for (const node of nodes) {
      node.type = 'corner';
      node.handleIn = null;
      node.handleOut = null;
    }
  }

  const resultContour: PathContour = {
    id: generateId(),
    closed: true,
    nodes,
  };

  if (getContourSignedArea(resultContour) < 0) {
    return reverseContour(resultContour);
  }
  return resultContour;
}
