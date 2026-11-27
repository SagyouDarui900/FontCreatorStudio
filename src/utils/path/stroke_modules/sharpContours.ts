import { BezierNode, PathContour, Point, StrokePoint, PressureCurveConfig, UserPenPreset } from "../../../types";
import { generateId } from "../id";
import { simplifyPointsRDP } from "./smoothing";
import { getContourSignedArea, reverseContour } from "../bounds";
import { evaluatePressureCurve } from "../pressure";
import {
  applyBrushFlex,
  applyTaperCurve,
  clampHalfWidth,
  inkPoolingMultiplier,
  roughnessGrainFrequency,
} from "./presetWidth";

/**
 * Options for the geometric (sharp / sharp_round / polygon) contour
 * builders. `customPreset` carries the user pen preset fields that have
 * a meaning for a geometric ribbon; see `sharpCustomWidthMultiplier`
 * and `applySharpOutlineEffects` for the supported set.
 * lineCap and lineJoin are intentionally not supported here: the cap
 * and joint are what define each geometric style (sharp: square caps
 * and miter joints; polygon: pointed caps and always-beveled joints;
 * sharp_round: round caps and round joints).
 */
export interface SharpContourOptions {
  customPreset?: Partial<UserPenPreset>;
}

// ---------------------------------------------------------------------------
// Shared backbone
// ---------------------------------------------------------------------------

/** Remove near-duplicate points (keeps the first point). */
function dedupPoints(rawPoints: (Point | StrokePoint)[]): Point[] {
  const cleanPoints: Point[] = [{ x: rawPoints[0].x, y: rawPoints[0].y }];
  for (let i = 1; i < rawPoints.length; i++) {
    const prev = cleanPoints[cleanPoints.length - 1];
    const curr = rawPoints[i];
    if (Math.hypot(curr.x - prev.x, curr.y - prev.y) >= 2.5) {
      cleanPoints.push({ x: curr.x, y: curr.y });
    }
  }
  return cleanPoints;
}

/**
 * Straight-segment skeleton (Ramer-Douglas-Peucker), micro-bend cleanup
 * and snapping of near-horizontal / vertical / 45-degree segments.
 * Returns at least the first and last point.
 */
function buildGeometricBackbone(cleanPoints: Point[], strokeWidth: number): Point[] {
  // 直線セグメント骨格化（Ramer-Douglas-Peucker）
  // カクカク感を際立たせるため、手ブレの曲率を直線に整理
  const backboneEpsilon = Math.max(14, strokeWidth * 0.42);
  let backbone = simplifyPointsRDP(cleanPoints, backboneEpsilon);
  if (backbone.length < 2) {
    backbone = [cleanPoints[0], cleanPoints[cleanPoints.length - 1]];
  }

  // 微小な屈曲のクレンジング & 幾何学角度（水平・垂直・45度）のスナップ整流
  const refinedBackbone: Point[] = [backbone[0]];
  for (let i = 1; i < backbone.length - 1; i++) {
    const pPrev = refinedBackbone[refinedBackbone.length - 1];
    const pCurr = backbone[i];
    const pNext = backbone[i + 1];

    const v1x = pCurr.x - pPrev.x;
    const v1y = pCurr.y - pPrev.y;
    const v2x = pNext.x - pCurr.x;
    const v2y = pNext.y - pCurr.y;
    const len1 = Math.hypot(v1x, v1y);
    const len2 = Math.hypot(v2x, v2y);

    if (len1 < 1 || len2 < 1) continue;

    // 2セグメント間の折れ曲がり角
    const cosAngle = Math.max(-1, Math.min(1, (v1x * v2x + v1y * v2y) / (len1 * len2)));
    const turnAngleDeg = (Math.acos(cosAngle) * 180) / Math.PI;

    // 屈曲が12度未満の極めて緩やかな角度は1本の直線として統合（角として残さない）
    if (turnAngleDeg < 12) {
      continue;
    }
    refinedBackbone.push(pCurr);
  }
  refinedBackbone.push(backbone[backbone.length - 1]);

  // 45度/水平/垂直へのマイルドなスナップ（セグメントがほぼ直線・直角・対角線のときに端正な角を強調）
  const snappedBackbone: Point[] = [{ ...refinedBackbone[0] }];
  for (let i = 1; i < refinedBackbone.length; i++) {
    const prev = snappedBackbone[i - 1];
    const curr = refinedBackbone[i];
    const dx = curr.x - prev.x;
    const dy = curr.y - prev.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 2) continue;

    const angleDeg = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
    // 0, 45, 90, 135, 180, 225, 270, 315 度に近いかチェック
    const nearestOct = Math.round(angleDeg / 45) * 45;
    const diff = Math.abs(angleDeg - nearestOct);

    if (diff <= 8 && i === refinedBackbone.length - 1) {
      // 最終点のスナップ
      const targetRad = (nearestOct * Math.PI) / 180;
      snappedBackbone.push({
        x: Math.round(prev.x + Math.cos(targetRad) * dist),
        y: Math.round(prev.y + Math.sin(targetRad) * dist),
      });
    } else {
      snappedBackbone.push({ x: Math.round(curr.x), y: Math.round(curr.y) });
    }
  }

  return snappedBackbone.length >= 2 ? snappedBackbone : backbone;
}

/** Cumulative arc-length fractions along a backbone, for taper effects. */
function backboneNormDists(backbone: Point[]): number[] {
  const dists: number[] = [0];
  for (let i = 1; i < backbone.length; i++) {
    dists.push(
      dists[i - 1] + Math.hypot(backbone[i].x - backbone[i - 1].x, backbone[i].y - backbone[i - 1].y)
    );
  }
  const total = dists[dists.length - 1] || 1;
  return dists.map((d) => d / total);
}

// ---------------------------------------------------------------------------
// Pressure and custom-preset width effects
// ---------------------------------------------------------------------------

/**
 * Effective pressure per backbone vertex, from the nearest raw point.
 * With pressureSensitivity 'off', evaluatePressureCurve returns 0.5,
 * so the width factor below becomes 1.0 and the stroke is unchanged.
 */
function backbonePressures(
  rawPoints: (Point | StrokePoint)[],
  backbone: Point[],
  pressureSensitivity: 'high' | 'normal' | 'low' | 'off',
  pressureCurve?: PressureCurveConfig | null,
  pressureGamma?: number
): number[] {
  return backbone.map((bp) => {
    let nearest = rawPoints[0];
    let nearestDist = Infinity;
    for (const rp of rawPoints) {
      const d = (rp.x - bp.x) * (rp.x - bp.x) + (rp.y - bp.y) * (rp.y - bp.y);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = rp;
      }
    }
    const rawP =
      'pressure' in nearest && typeof nearest.pressure === 'number' && nearest.pressure > 0
        ? nearest.pressure
        : 0.5;
    let p = evaluatePressureCurve(rawP, pressureCurve, pressureSensitivity);
    if (pressureGamma && pressureGamma !== 1.0) {
      const gamma = Math.max(0.5, Math.min(2.5, pressureGamma));
      p = Math.max(0.02, Math.min(1.0, Math.pow(p, gamma)));
    }
    return p;
  });
}

/**
 * Width factor from pressure. Neutral at p = 0.5 (factor 1.0), 0.5x at
 * p = 0, 1.5x at p = 1. The same neutral generic factor the old fast
 * preview used, so a pressure-off stroke keeps its previous width.
 */
function pressureWidthFactor(pressure: number): number {
  return 0.5 + pressure;
}

/** Taper multiplier at a normalized backbone distance (same formulas as the subdivided path). */
function sharpTaperMultiplier(normDist: number, cp: Partial<UserPenPreset>): number {
  const startLen = Math.min(0.40, (cp.taperStartLength ?? 0) / 100);
  const endLen = Math.min(0.40, (cp.taperEndLength ?? 0) / 100);
  const startW = Math.max(0.12, (cp.taperStartWidth ?? 100) / 100);
  const endW = Math.max(0.12, (cp.taperEndWidth ?? 100) / 100);
  let m = 1.0;
  if (startLen > 0.001 && normDist < startLen) {
    const t = Math.max(0, Math.min(1.0, normDist / startLen));
    const smoothT = applyTaperCurve(
      cp.taperTipShape === 'sharp' ? Math.pow(t, 1.5) : 0.5 - 0.5 * Math.cos(t * Math.PI),
      cp.taperCurve
    );
    m *= startW + (1.0 - startW) * smoothT;
  }
  if (endLen > 0.001 && normDist > 1.0 - endLen) {
    const t = Math.max(0, Math.min(1.0, (1.0 - normDist) / endLen));
    const smoothT = applyTaperCurve(
      cp.taperTipShape === 'sharp' ? Math.pow(t, 1.5) : 0.5 - 0.5 * Math.cos(t * Math.PI),
      cp.taperCurve
    );
    m *= endW + (1.0 - endW) * smoothT;
  }
  // Taper opacity is approximated as a width factor (0.7 at 0% opacity to
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
  return m * opacityMultiplier;
}

/**
 * Combined custom-preset width multiplier for one backbone vertex.
 * Mirrors the subdivided path, except the speed-driven effects: the
 * geometric path does not track speed, so speedWidthFactor and
 * speedFeatherFactor have no effect here. The nib-shape fields
 * (nibAngle / nibAspectRatio / jitterAngle) also have no effect: the
 * geometric ribbon has no nib model. lineCap and lineJoin have no
 * effect either: the cap and joint are what define each geometric
 * style (sharp: square caps and miter joints; polygon: pointed caps
 * and always-beveled joints; sharp_round: round caps and round
 * joints), so overriding them would erase the distinction between
 * the styles.
 */
function sharpCustomWidthMultiplier(
  index: number,
  pressure: number,
  normDist: number,
  cp: Partial<UserPenPreset>,
  absTurn: number
): number {
  let m = sharpTaperMultiplier(normDist, cp);
  if (cp.pressureWidthFactor && cp.pressureWidthFactor !== 0) {
    m *= 1.0 + (cp.pressureWidthFactor / 100) * (pressure - 0.5);
  }
  if (cp.pressureFeatherFactor && cp.pressureFeatherFactor > 0) {
    m *= 1.0 - (cp.pressureFeatherFactor / 100) * 0.35 * (1 - pressure);
  }
  if (cp.tipSharpness && cp.tipSharpness > 0 && normDist > 0.9) {
    m *= 1.0 - (cp.tipSharpness / 100) * 0.5 * ((normDist - 0.9) / 0.1);
  }
  if (cp.inkBleed) m *= 1.0 + (cp.inkBleed / 100) * 0.15;
  if (cp.jitterSize && cp.jitterSize > 0) {
    const organicNoise = Math.sin(index * 0.18) * 0.5 + Math.sin(index * 0.45) * 0.3 + Math.cos(index * 0.85) * 0.2;
    m *= 1.0 + organicNoise * (cp.jitterSize / 100) * 0.15;
  }
  if (cp.jitterOpacity && cp.jitterOpacity > 0) {
    const opacityNoise = Math.sin(index * 0.31) * 0.5 + Math.sin(index * 0.77) * 0.5;
    m *= 1.0 + opacityNoise * (cp.jitterOpacity / 100) * 0.15;
  }
  // inkPooling: extra width near the start and at sharp turns, the
  // same shape as in the subdivided path. At the default 0 the
  // multiplier is exactly 1.
  m *= inkPoolingMultiplier(normDist, absTurn, cp.inkPooling);
  return m;
}

/**
 * Per-vertex half-widths for a geometric stroke: pressure factor, then
 * the custom-preset width effects. With no custom preset and neutral
 * pressure this is exactly the previous constant half-width.
 */
function computeSharpHalfWidths(
  backbone: Point[],
  pressures: number[],
  normDists: number[],
  strokeWidth: number,
  minHalf: number,
  cp?: Partial<UserPenPreset>
): number[] {
  // Turn angle at each backbone vertex, for the ink-pooling corner
  // widening (0 at the ends and on straight runs).
  const turns: number[] = backbone.map((_, i) => {
    if (i === 0 || i === backbone.length - 1) return 0;
    const v1x = backbone[i].x - backbone[i - 1].x;
    const v1y = backbone[i].y - backbone[i - 1].y;
    const v2x = backbone[i + 1].x - backbone[i].x;
    const v2y = backbone[i + 1].y - backbone[i].y;
    const l1 = Math.hypot(v1x, v1y) || 1;
    const l2 = Math.hypot(v2x, v2y) || 1;
    const cos = Math.max(-1, Math.min(1, (v1x * v2x + v1y * v2y) / (l1 * l2)));
    return Math.acos(cos);
  });
  return backbone.map((_, i) => {
    let w = Math.max(minHalf, (strokeWidth / 2) * pressureWidthFactor(pressures[i]));
    if (cp) {
      if (cp.constantWidth) {
        // Uniform width along the stroke; the taper narrowing is kept.
        w = (strokeWidth / 2) * sharpTaperMultiplier(normDists[i], cp);
      } else {
        w *= sharpCustomWidthMultiplier(i, pressures[i], normDists[i], cp, turns[i]);
      }
    }
    // minWidth / maxWidth: clamp the half-width to half of the
    // full-width limit. At the defaults this is the identity.
    w = clampHalfWidth(w, cp);
    return Math.max(1.0, w);
  });
}

/** jitterPosition: deterministic centreline offset of the backbone interior points. */
function jitterBackbone(
  backbone: Point[],
  strokeWidth: number,
  cp: Partial<UserPenPreset>
): Point[] {
  if (!cp.jitterPosition || cp.jitterPosition <= 0) return backbone;
  const amp = (cp.jitterPosition / 100) * Math.max(1, strokeWidth * 0.08);
  const constrainPerp = cp.jitterConstrainPerp !== false;
  return backbone.map((p, i) => {
    if (i === 0 || i === backbone.length - 1) return { ...p };
    const prevP = backbone[i - 1];
    const nextP = backbone[i + 1];
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
      return { x: p.x + -dy * r1 * 2 * amp, y: p.y + dx * r1 * 2 * amp };
    }
    return { x: p.x + r1 * 2 * amp, y: p.y + r2 * 2 * amp };
  });
}

/**
 * Outline-level custom effects, applied to the finished node list.
 * Same formulas as the subdivided path: axisSlant shears the loop
 * around its centroid, edgeRoughness adds deterministic boundary noise.
 */
function applySharpOutlineEffects(nodes: BezierNode[], cp?: Partial<UserPenPreset>): void {
  if (!cp) return;
  if (cp.axisSlant && cp.axisSlant !== 0) {
    const slantRad = (Math.max(-45, Math.min(45, cp.axisSlant)) * Math.PI) / 180;
    const tanSlant = Math.tan(slantRad);
    let cx = 0;
    let cy = 0;
    for (const p of nodes) {
      cx += p.x;
      cy += p.y;
    }
    cx /= Math.max(1, nodes.length);
    cy /= Math.max(1, nodes.length);
    for (const p of nodes) {
      p.x = Number((p.x + (cy - p.y) * tanSlant).toFixed(2));
    }
  }
  if (cp.edgeRoughness && cp.edgeRoughness > 0) {
    const amp = (cp.edgeRoughness / 100) * 2.5;
    // roughnessScale: the grain size of the noise. 50 (the default)
    // keeps the existing grain.
    const grainFreq = roughnessGrainFrequency(cp.roughnessScale);
    for (let i = 0; i < nodes.length; i++) {
      const n1 = Math.sin(i * 12.9898 * grainFreq) * 43758.5453;
      const n2 = Math.sin(i * 78.233 * grainFreq) * 12543.21;
      const r1 = n1 - Math.floor(n1) - 0.5;
      const r2 = n2 - Math.floor(n2) - 0.5;
      nodes[i].x = Number((nodes[i].x + r1 * 2 * amp).toFixed(2));
      nodes[i].y = Number((nodes[i].y + r2 * 2 * amp).toFixed(2));
    }
  }
}

function finishContour(nodes: BezierNode[], cp?: Partial<UserPenPreset>): PathContour {
  applySharpOutlineEffects(nodes, cp);
  const contour: PathContour = { id: generateId(), closed: true, nodes };
  return getContourSignedArea(contour) < 0 ? reverseContour(contour) : contour;
}

/** 1点のみ（ドット打ち・タップ）の場合は完全な正方形 */
function squareDot(p: Point, halfWidth: number): PathContour {
  const r = Math.round(halfWidth);
  return {
    id: generateId(),
    closed: true,
    nodes: [
      { id: generateId(), x: p.x - r, y: p.y - r, type: 'corner' },
      { id: generateId(), x: p.x + r, y: p.y - r, type: 'corner' },
      { id: generateId(), x: p.x + r, y: p.y + r, type: 'corner' },
      { id: generateId(), x: p.x - r, y: p.y + r, type: 'corner' },
    ],
  };
}

/** 1点のみの場合は完全な正六角形（多角形ペンのドット） */
function hexagonDot(p: Point, halfWidth: number): PathContour {
  const r = Math.round(halfWidth);
  const nodes: BezierNode[] = [];
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3;
    nodes.push({
      id: generateId(),
      x: Math.round(p.x + r * Math.cos(a)),
      y: Math.round(p.y + r * Math.sin(a)),
      type: 'corner',
    });
  }
  return { id: generateId(), closed: true, nodes };
}

/** Prepare backbone, pressures and half-widths for a geometric stroke. */
function prepareGeometricStroke(
  rawPoints: (Point | StrokePoint)[],
  strokeWidth: number,
  minHalf: number,
  pressureSensitivity: 'high' | 'normal' | 'low' | 'off',
  pressureCurve?: PressureCurveConfig | null,
  options?: SharpContourOptions
): { backbone: Point[]; halfWidths: number[] } {
  const cp = options?.customPreset;
  const cleanPoints = dedupPoints(rawPoints);
  let backbone = buildGeometricBackbone(cleanPoints, strokeWidth);
  if (cp) backbone = jitterBackbone(backbone, strokeWidth, cp);
  const pressures = backbonePressures(
    rawPoints,
    backbone,
    pressureSensitivity,
    pressureCurve,
    cp?.pressureGamma
  );
  const normDists = backboneNormDists(backbone);
  const halfWidths = computeSharpHalfWidths(backbone, pressures, normDists, strokeWidth, minHalf, cp);
  // brushFlex: lag the width changes in backbone order, the same
  // causal low-pass as in the subdivided path. At the default 0 the
  // widths are left untouched.
  if (cp?.brushFlex && cp.brushFlex > 0) {
    applyBrushFlex(halfWidths, cp.brushFlex);
  }
  return { backbone, halfWidths };
}

// ---------------------------------------------------------------------------
// Miter-joint outline (sharp / polygon)
// ---------------------------------------------------------------------------

interface MiterOutlineOptions {
  /** Pointed (hexagonal) end caps instead of square-cut caps. */
  pointedCaps: boolean;
  /** Always bevel the outer side of joints instead of mitering it. */
  bevelJoints: boolean;
}

/**
 * Build a closed corner-node outline from a backbone with per-vertex
 * half-widths. The sharp pen uses square caps and miter joints (with a
 * bevel fallback for very sharp outer corners); the polygon pen uses
 * pointed caps and always-beveled joints, so the two no longer share
 * one identical outline.
 */
function buildMiterOutline(
  backbone: Point[],
  halfWidths: number[],
  opts: MiterOutlineOptions
): BezierNode[] {
  const m = backbone.length;

  // セグメントの方向・法線ベクトル
  const segDirs: Point[] = [];
  const segNorms: Point[] = [];
  for (let i = 0; i < m - 1; i++) {
    const dx = backbone[i + 1].x - backbone[i].x;
    const dy = backbone[i + 1].y - backbone[i].y;
    const len = Math.hypot(dx, dy) || 1;
    const vx = dx / len;
    const vy = dy / len;
    segDirs.push({ x: vx, y: vy });
    segNorms.push({ x: -vy, y: vx });
  }

  // Single segment: rectangle (sharp) or hexagon (polygon).
  if (m === 2) {
    const p0 = backbone[0];
    const p1 = backbone[1];
    const nx = segNorms[0].x;
    const ny = segNorms[0].y;
    const vx = segDirs[0].x;
    const vy = segDirs[0].y;
    const w0 = halfWidths[0];
    const w1 = halfWidths[1];
    const pts: Point[] = [
      { x: Math.round(p0.x + nx * w0), y: Math.round(p0.y + ny * w0) },
      { x: Math.round(p1.x + nx * w1), y: Math.round(p1.y + ny * w1) },
    ];
    if (opts.pointedCaps) {
      pts.push({ x: Math.round(p1.x + vx * w1 * 0.9), y: Math.round(p1.y + vy * w1 * 0.9) });
    }
    pts.push(
      { x: Math.round(p1.x - nx * w1), y: Math.round(p1.y - ny * w1) },
      { x: Math.round(p0.x - nx * w0), y: Math.round(p0.y - ny * w0) }
    );
    if (opts.pointedCaps) {
      pts.push({ x: Math.round(p0.x - vx * w0 * 0.9), y: Math.round(p0.y - vy * w0 * 0.9) });
    }
    return pts.map((p) => ({ id: generateId(), x: p.x, y: p.y, type: 'corner' as const }));
  }

  // マイター結合（Miter Joint）による左右の角ばり境界点列の生成
  const leftPoints: Point[] = [];
  const rightPoints: Point[] = [];

  // 始点（スクエアカット）
  leftPoints.push({
    x: Math.round(backbone[0].x + segNorms[0].x * halfWidths[0]),
    y: Math.round(backbone[0].y + segNorms[0].y * halfWidths[0]),
  });
  rightPoints.push({
    x: Math.round(backbone[0].x - segNorms[0].x * halfWidths[0]),
    y: Math.round(backbone[0].y - segNorms[0].y * halfWidths[0]),
  });

  // 中間頂点におけるマイター角の計算
  for (let i = 1; i < m - 1; i++) {
    const pt = backbone[i];
    const w = halfWidths[i];
    const nPrev = segNorms[i - 1];
    const nCurr = segNorms[i];
    const vPrev = segDirs[i - 1];
    const vCurr = segDirs[i];

    const cross = vPrev.x * vCurr.y - vPrev.y * vCurr.x;
    const sumNx = nPrev.x + nCurr.x;
    const sumNy = nPrev.y + nCurr.y;
    const sumLen = Math.hypot(sumNx, sumNy);

    if (sumLen < 0.05) {
      // 180°折り返し
      leftPoints.push(
        { x: Math.round(pt.x + nPrev.x * w), y: Math.round(pt.y + nPrev.y * w) },
        { x: Math.round(pt.x + nCurr.x * w), y: Math.round(pt.y + nCurr.y * w) }
      );
      rightPoints.push(
        { x: Math.round(pt.x - nPrev.x * w), y: Math.round(pt.y - nPrev.y * w) },
        { x: Math.round(pt.x - nCurr.x * w), y: Math.round(pt.y - nCurr.y * w) }
      );
      continue;
    }

    const uNx = sumNx / sumLen;
    const uNy = sumNy / sumLen;
    const miter = 2 / sumLen; // 1 / cos(theta/2)

    // 内角側はストローク突き抜けを防ぐ安全なクランプ（innerMiter <= 1.4）
    const innerMiter = Math.min(1.4, miter);
    // 外角側のベベル（斜めカット2点）
    const bevel = (side: 1 | -1): Point[] => [
      { x: Math.round(pt.x + side * nPrev.x * w), y: Math.round(pt.y + side * nPrev.y * w) },
      { x: Math.round(pt.x + side * nCurr.x * w), y: Math.round(pt.y + side * nCurr.y * w) },
    ];

    if (cross > 0.05) {
      // 左に折れ曲がる（左側が内角、右側が外角）
      leftPoints.push({
        x: Math.round(pt.x + uNx * w * innerMiter),
        y: Math.round(pt.y + uNy * w * innerMiter),
      });

      // マイターリミット: 鋭すぎる外角（miter > 2.0）はベベル（斜めカット2点）
      if (opts.bevelJoints || miter > 2.0) {
        rightPoints.push(...bevel(-1));
      } else {
        rightPoints.push({
          x: Math.round(pt.x - uNx * w * miter),
          y: Math.round(pt.y - uNy * w * miter),
        });
      }
    } else if (cross < -0.05) {
      // 右に折れ曲がる（右側が内角、左側が外角）
      rightPoints.push({
        x: Math.round(pt.x - uNx * w * innerMiter),
        y: Math.round(pt.y - uNy * w * innerMiter),
      });

      if (opts.bevelJoints || miter > 2.0) {
        leftPoints.push(...bevel(1));
      } else {
        leftPoints.push({
          x: Math.round(pt.x + uNx * w * miter),
          y: Math.round(pt.y + uNy * w * miter),
        });
      }
    } else {
      // ほぼ直線
      leftPoints.push({
        x: Math.round(pt.x + uNx * w),
        y: Math.round(pt.y + uNy * w),
      });
      rightPoints.push({
        x: Math.round(pt.x - uNx * w),
        y: Math.round(pt.y - uNy * w),
      });
    }
  }

  // 終点（スクエアカット）
  const lastNorm = segNorms[segNorms.length - 1];
  leftPoints.push({
    x: Math.round(backbone[m - 1].x + lastNorm.x * halfWidths[m - 1]),
    y: Math.round(backbone[m - 1].y + lastNorm.y * halfWidths[m - 1]),
  });
  rightPoints.push({
    x: Math.round(backbone[m - 1].x - lastNorm.x * halfWidths[m - 1]),
    y: Math.round(backbone[m - 1].y - lastNorm.y * halfWidths[m - 1]),
  });

  // 時計回りの閉多角形ループを構築
  const allCorners: Point[] = [...rightPoints];
  if (opts.pointedCaps) {
    const vLast = segDirs[segDirs.length - 1];
    allCorners.push({
      x: Math.round(backbone[m - 1].x + vLast.x * halfWidths[m - 1] * 0.9),
      y: Math.round(backbone[m - 1].y + vLast.y * halfWidths[m - 1] * 0.9),
    });
  }
  allCorners.push(...leftPoints.reverse());
  if (opts.pointedCaps) {
    const v0 = segDirs[0];
    allCorners.push({
      x: Math.round(backbone[0].x - v0.x * halfWidths[0] * 0.9),
      y: Math.round(backbone[0].y - v0.y * halfWidths[0] * 0.9),
    });
  }

  // 近すぎる連続重複点を除去
  const deduplicatedCorners: Point[] = [];
  for (let i = 0; i < allCorners.length; i++) {
    if (deduplicatedCorners.length === 0) {
      deduplicatedCorners.push(allCorners[i]);
      continue;
    }
    const prev = deduplicatedCorners[deduplicatedCorners.length - 1];
    const curr = allCorners[i];
    if (Math.hypot(curr.x - prev.x, curr.y - prev.y) > 1.5) {
      deduplicatedCorners.push(curr);
    }
  }

  return deduplicatedCorners.map((p) => ({
    id: generateId(),
    x: p.x,
    y: p.y,
    type: 'corner' as const,
  }));
}

/**
 * カクカク角筆（sharp）専用の幾何学的マイター角・直線セグメント生成
 * 筆圧で太さが変わり、入り抜き・にじみ・輪郭の荒れなどのカスタム設定も
 * 反映される。筆圧OFFでは従来どおり一定幅になる。
 */
export function createSharpAngularContour(
  rawPoints: (Point | StrokePoint)[],
  strokeWidth: number = 35,
  pressureSensitivity: 'high' | 'normal' | 'low' | 'off' = 'normal',
  pressureCurve?: PressureCurveConfig | null,
  options?: SharpContourOptions
): PathContour {
  if (!rawPoints || rawPoints.length === 0) {
    return { id: generateId(), closed: true, nodes: [] };
  }

  // minWidth / maxWidth also apply to a tap dot. At the defaults
  // this is the identity.
  const halfWidth = clampHalfWidth(Math.max(2, strokeWidth / 2), options?.customPreset);

  if (rawPoints.length === 1) {
    return squareDot(rawPoints[0], halfWidth);
  }
  const cleanPoints = dedupPoints(rawPoints);
  if (cleanPoints.length < 2) {
    return squareDot(cleanPoints[0] || rawPoints[0], halfWidth);
  }

  const { backbone, halfWidths } = prepareGeometricStroke(
    rawPoints,
    strokeWidth,
    2,
    pressureSensitivity,
    pressureCurve,
    options
  );
  const nodes = buildMiterOutline(backbone, halfWidths, { pointedCaps: false, bevelJoints: false });
  return finishContour(nodes, options?.customPreset);
}

/**
 * 多角形ペン（polygon）専用の幾何学アウトライン生成
 * 角筆と同じ骨格を使うが、端は六角形の尖り、折れ角の外側は常にベベル
 * （斜めカット）になるため、角筆とは異なる面取り状の輪郭になる。
 * 筆圧とカスタム設定は角筆と同じく反映される。
 */
export function createPolygonContour(
  rawPoints: (Point | StrokePoint)[],
  strokeWidth: number = 35,
  pressureSensitivity: 'high' | 'normal' | 'low' | 'off' = 'normal',
  pressureCurve?: PressureCurveConfig | null,
  options?: SharpContourOptions
): PathContour {
  if (!rawPoints || rawPoints.length === 0) {
    return { id: generateId(), closed: true, nodes: [] };
  }

  // minWidth / maxWidth also apply to a tap dot. At the defaults
  // this is the identity.
  const halfWidth = clampHalfWidth(Math.max(2, strokeWidth / 2), options?.customPreset);

  if (rawPoints.length === 1) {
    return hexagonDot(rawPoints[0], halfWidth);
  }
  const cleanPoints = dedupPoints(rawPoints);
  if (cleanPoints.length < 2) {
    return hexagonDot(cleanPoints[0] || rawPoints[0], halfWidth);
  }

  const { backbone, halfWidths } = prepareGeometricStroke(
    rawPoints,
    strokeWidth,
    2,
    pressureSensitivity,
    pressureCurve,
    options
  );
  const nodes = buildMiterOutline(backbone, halfWidths, { pointedCaps: true, bevelJoints: true });
  return finishContour(nodes, options?.customPreset);
}

// ---------------------------------------------------------------------------
// Sharp-round (filleted) outline
// ---------------------------------------------------------------------------

/**
 * カクカク角丸筆（sharp_round）専用の幾何学的角丸アウトライン生成
 * 直線セグメントと45°/90°/水平垂直スナップの幾何学骨格をベースに、
 * 各コーナーのターンに滑らかな角丸フィレット（Round Join）および
 * ストローク両端に綺麗な半円ラウンドキャップ（Round Cap）を適用したモダン角丸文字用のアウトラインを生成
 * 筆圧で太さが変わり、入り抜き・にじみ・輪郭の荒れなどのカスタム設定も
 * 反映される。筆圧OFFでは従来どおり一定幅になる。
 */
export function createSharpRoundedContour(
  rawPoints: (Point | StrokePoint)[],
  strokeWidth: number = 35,
  pressureSensitivity: 'high' | 'normal' | 'low' | 'off' = 'normal',
  pressureCurve?: PressureCurveConfig | null,
  options?: SharpContourOptions
): PathContour {
  if (!rawPoints || rawPoints.length === 0) {
    return { id: generateId(), closed: true, nodes: [] };
  }

  // minWidth / maxWidth also apply to a tap dot. At the defaults
  // this is the identity.
  const halfWidth = clampHalfWidth(Math.max(3, strokeWidth / 2), options?.customPreset);
  const kappa = 0.5522847498;
  const ox = halfWidth * kappa;

  // 1点のみ（ドット打ち・タップ）の場合は完全な円（4つのsmoothノード）
  if (rawPoints.length === 1) {
    const p = rawPoints[0];
    return {
      id: generateId(),
      closed: true,
      nodes: [
        { id: generateId(), x: p.x, y: p.y - halfWidth, handleIn: { x: p.x - ox, y: p.y - halfWidth }, handleOut: { x: p.x + ox, y: p.y - halfWidth }, type: 'smooth' },
        { id: generateId(), x: p.x + halfWidth, y: p.y, handleIn: { x: p.x + halfWidth, y: p.y - ox }, handleOut: { x: p.x + halfWidth, y: p.y + ox }, type: 'smooth' },
        { id: generateId(), x: p.x, y: p.y + halfWidth, handleIn: { x: p.x + ox, y: p.y + halfWidth }, handleOut: { x: p.x - ox, y: p.y + halfWidth }, type: 'smooth' },
        { id: generateId(), x: p.x - halfWidth, y: p.y, handleIn: { x: p.x - halfWidth, y: p.y + ox }, handleOut: { x: p.x - halfWidth, y: p.y - ox }, type: 'smooth' },
      ],
    };
  }

  const cleanPoints = dedupPoints(rawPoints);
  if (cleanPoints.length < 2) {
    const p = cleanPoints[0] || rawPoints[0];
    return {
      id: generateId(),
      closed: true,
      nodes: [
        { id: generateId(), x: p.x, y: p.y - halfWidth, handleIn: { x: p.x - ox, y: p.y - halfWidth }, handleOut: { x: p.x + ox, y: p.y - halfWidth }, type: 'smooth' },
        { id: generateId(), x: p.x + halfWidth, y: p.y, handleIn: { x: p.x + halfWidth, y: p.y - ox }, handleOut: { x: p.x + halfWidth, y: p.y + ox }, type: 'smooth' },
        { id: generateId(), x: p.x, y: p.y + halfWidth, handleIn: { x: p.x + ox, y: p.y + halfWidth }, handleOut: { x: p.x - ox, y: p.y + halfWidth }, type: 'smooth' },
        { id: generateId(), x: p.x - halfWidth, y: p.y, handleIn: { x: p.x - halfWidth, y: p.y + ox }, handleOut: { x: p.x - halfWidth, y: p.y - ox }, type: 'smooth' },
      ],
    };
  }

  const { backbone: finalBackbone, halfWidths } = prepareGeometricStroke(
    rawPoints,
    strokeWidth,
    3,
    pressureSensitivity,
    pressureCurve,
    options
  );
  const m = finalBackbone.length;

  // 単一セグメント（2点間の直線）の場合: カプセル／ピル形状（丸端の長方形）
  if (m === 2) {
    const p0 = finalBackbone[0];
    const p1 = finalBackbone[1];
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const len = Math.hypot(dx, dy) || 1;
    const vx = dx / len;
    const vy = dy / len;
    const nx = -vy;
    const ny = vx;
    const w0 = halfWidths[0];
    const w1 = halfWidths[1];

    const capOffset1 = w1 * kappa;
    const capOffset0 = w0 * kappa;

    const nodes: BezierNode[] = [
      // 終端ラウンドキャップ (p1)
      {
        id: generateId(),
        x: Math.round(p1.x + nx * w1),
        y: Math.round(p1.y + ny * w1),
        handleOut: {
          x: Math.round(p1.x + nx * w1 + vx * capOffset1),
          y: Math.round(p1.y + ny * w1 + vy * capOffset1),
        },
        type: 'smooth',
      },
      {
        id: generateId(),
        x: Math.round(p1.x + vx * w1),
        y: Math.round(p1.y + vy * w1),
        handleIn: {
          x: Math.round(p1.x + vx * w1 + nx * capOffset1),
          y: Math.round(p1.y + vy * w1 + ny * capOffset1),
        },
        handleOut: {
          x: Math.round(p1.x + vx * w1 - nx * capOffset1),
          y: Math.round(p1.y + vy * w1 - ny * capOffset1),
        },
        type: 'smooth',
      },
      {
        id: generateId(),
        x: Math.round(p1.x - nx * w1),
        y: Math.round(p1.y - ny * w1),
        handleIn: {
          x: Math.round(p1.x - nx * w1 + vx * capOffset1),
          y: Math.round(p1.y - ny * w1 + vy * capOffset1),
        },
        type: 'smooth',
      },
      // 始端ラウンドキャップ (p0)
      {
        id: generateId(),
        x: Math.round(p0.x - nx * w0),
        y: Math.round(p0.y - ny * w0),
        handleOut: {
          x: Math.round(p0.x - nx * w0 - vx * capOffset0),
          y: Math.round(p0.y - ny * w0 - vy * capOffset0),
        },
        type: 'smooth',
      },
      {
        id: generateId(),
        x: Math.round(p0.x - vx * w0),
        y: Math.round(p0.y - vy * w0),
        handleIn: {
          x: Math.round(p0.x - vx * w0 - nx * capOffset0),
          y: Math.round(p0.y - vy * w0 - ny * capOffset0),
        },
        handleOut: {
          x: Math.round(p0.x - vx * w0 + nx * capOffset0),
          y: Math.round(p0.y - vy * w0 + ny * capOffset0),
        },
        type: 'smooth',
      },
      {
        id: generateId(),
        x: Math.round(p0.x + nx * w0),
        y: Math.round(p0.y + ny * w0),
        handleIn: {
          x: Math.round(p0.x + nx * w0 - vx * capOffset0),
          y: Math.round(p0.y + ny * w0 - vy * capOffset0),
        },
        type: 'smooth',
      },
    ];

    return finishContour(nodes, options?.customPreset);
  }

  // マルチセグメントの方向・法線ベクトル
  const segDirs: Point[] = [];
  const segNorms: Point[] = [];
  for (let i = 0; i < m - 1; i++) {
    const dx = finalBackbone[i + 1].x - finalBackbone[i].x;
    const dy = finalBackbone[i + 1].y - finalBackbone[i].y;
    const len = Math.hypot(dx, dy) || 1;
    const vx = dx / len;
    const vy = dy / len;
    segDirs.push({ x: vx, y: vy });
    segNorms.push({ x: -vy, y: vx });
  }

  const nodes: BezierNode[] = [];

  // 始端（p0）の半円ラウンドキャップ
  const v0 = segDirs[0];
  const n0 = segNorms[0];
  const capOffset0 = halfWidths[0] * kappa;
  const p0 = finalBackbone[0];

  // 始端キャップの頂点（-v0方向）
  nodes.push({
    id: generateId(),
    x: Math.round(p0.x - v0.x * halfWidths[0]),
    y: Math.round(p0.y - v0.y * halfWidths[0]),
    handleIn: {
      x: Math.round(p0.x - v0.x * halfWidths[0] - n0.x * capOffset0),
      y: Math.round(p0.y - v0.y * halfWidths[0] - n0.y * capOffset0),
    },
    handleOut: {
      x: Math.round(p0.x - v0.x * halfWidths[0] + n0.x * capOffset0),
      y: Math.round(p0.y - v0.y * halfWidths[0] + n0.y * capOffset0),
    },
    type: 'smooth',
  });

  // 始端の左側境界点
  nodes.push({
    id: generateId(),
    x: Math.round(p0.x + n0.x * halfWidths[0]),
    y: Math.round(p0.y + n0.y * halfWidths[0]),
    handleIn: {
      x: Math.round(p0.x + n0.x * halfWidths[0] - v0.x * capOffset0),
      y: Math.round(p0.y + n0.y * halfWidths[0] - v0.y * capOffset0),
    },
    type: 'smooth',
  });

  // 左側サイドのセグメント & 角丸ターン処理
  for (let i = 1; i < m - 1; i++) {
    const pt = finalBackbone[i];
    const w = halfWidths[i];
    const nPrev = segNorms[i - 1];
    const nCurr = segNorms[i];
    const vPrev = segDirs[i - 1];
    const vCurr = segDirs[i];

    const cross = vPrev.x * vCurr.y - vPrev.y * vCurr.x;
    const cosAngle = Math.max(-1, Math.min(1, vPrev.x * vCurr.x + vPrev.y * vCurr.y));
    const turnAngle = Math.acos(cosAngle);

    const sumNx = nPrev.x + nCurr.x;
    const sumNy = nPrev.y + nCurr.y;
    const sumLen = Math.hypot(sumNx, sumNy) || 1;
    const uNx = sumNx / sumLen;
    const uNy = sumNy / sumLen;

    if (cross < -0.05) {
      // 右に曲がる（左側は外角！円弧フィレットで丸める）
      const arcHandleLen = (4 / 3) * Math.tan(turnAngle / 4) * w;

      const qIn: Point = {
        x: Math.round(pt.x + nPrev.x * w),
        y: Math.round(pt.y + nPrev.y * w),
      };
      const qOut: Point = {
        x: Math.round(pt.x + nCurr.x * w),
        y: Math.round(pt.y + nCurr.y * w),
      };

      if (turnAngle > 1.4) {
        const apex: Point = {
          x: Math.round(pt.x + uNx * w),
          y: Math.round(pt.y + uNy * w),
        };
        const halfTan = (4 / 3) * Math.tan(turnAngle / 8) * w;
        const uVx = (vPrev.x + vCurr.x);
        const uVy = (vPrev.y + vCurr.y);
        const uVLen = Math.hypot(uVx, uVy) || 1;
        const tangX = uVx / uVLen;
        const tangY = uVy / uVLen;

        nodes.push({
          id: generateId(),
          x: qIn.x,
          y: qIn.y,
          handleOut: {
            x: Math.round(qIn.x + vPrev.x * halfTan),
            y: Math.round(qIn.y + vPrev.y * halfTan),
          },
          type: 'smooth',
        });
        nodes.push({
          id: generateId(),
          x: apex.x,
          y: apex.y,
          handleIn: {
            x: Math.round(apex.x - tangX * halfTan),
            y: Math.round(apex.y - tangY * halfTan),
          },
          handleOut: {
            x: Math.round(apex.x + tangX * halfTan),
            y: Math.round(apex.y + tangY * halfTan),
          },
          type: 'smooth',
        });
        nodes.push({
          id: generateId(),
          x: qOut.x,
          y: qOut.y,
          handleIn: {
            x: Math.round(qOut.x - vCurr.x * halfTan),
            y: Math.round(qOut.y - vCurr.y * halfTan),
          },
          type: 'smooth',
        });
      } else {
        nodes.push({
          id: generateId(),
          x: qIn.x,
          y: qIn.y,
          handleOut: {
            x: Math.round(qIn.x + vPrev.x * arcHandleLen),
            y: Math.round(qIn.y + vPrev.y * arcHandleLen),
          },
          type: 'smooth',
        });
        nodes.push({
          id: generateId(),
          x: qOut.x,
          y: qOut.y,
          handleIn: {
            x: Math.round(qOut.x - vCurr.x * arcHandleLen),
            y: Math.round(qOut.y - vCurr.y * arcHandleLen),
          },
          type: 'smooth',
        });
      }
    } else if (cross > 0.05) {
      // 左に曲がる（左側は内角！内角交点）
      const innerMiter = Math.min(1.4, 2 / sumLen);
      nodes.push({
        id: generateId(),
        x: Math.round(pt.x + uNx * w * innerMiter),
        y: Math.round(pt.y + uNy * w * innerMiter),
        type: 'corner',
      });
    } else {
      nodes.push({
        id: generateId(),
        x: Math.round(pt.x + nCurr.x * w),
        y: Math.round(pt.y + nCurr.y * w),
        type: 'smooth',
      });
    }
  }

  // 終端（pLast）の半円ラウンドキャップ
  const pLast = finalBackbone[m - 1];
  const vLast = segDirs[segDirs.length - 1];
  const nLast = segNorms[segNorms.length - 1];
  const capOffsetLast = halfWidths[m - 1] * kappa;

  nodes.push({
    id: generateId(),
    x: Math.round(pLast.x + nLast.x * halfWidths[m - 1]),
    y: Math.round(pLast.y + nLast.y * halfWidths[m - 1]),
    handleOut: {
      x: Math.round(pLast.x + nLast.x * halfWidths[m - 1] + vLast.x * capOffsetLast),
      y: Math.round(pLast.y + nLast.y * halfWidths[m - 1] + vLast.y * capOffsetLast),
    },
    type: 'smooth',
  });

  nodes.push({
    id: generateId(),
    x: Math.round(pLast.x + vLast.x * halfWidths[m - 1]),
    y: Math.round(pLast.y + vLast.y * halfWidths[m - 1]),
    handleIn: {
      x: Math.round(pLast.x + vLast.x * halfWidths[m - 1] + nLast.x * capOffsetLast),
      y: Math.round(pLast.y + vLast.y * halfWidths[m - 1] + nLast.y * capOffsetLast),
    },
    handleOut: {
      x: Math.round(pLast.x + vLast.x * halfWidths[m - 1] - nLast.x * capOffsetLast),
      y: Math.round(pLast.y + vLast.y * halfWidths[m - 1] - nLast.y * capOffsetLast),
    },
    type: 'smooth',
  });

  nodes.push({
    id: generateId(),
    x: Math.round(pLast.x - nLast.x * halfWidths[m - 1]),
    y: Math.round(pLast.y - nLast.y * halfWidths[m - 1]),
    handleIn: {
      x: Math.round(pLast.x - nLast.x * halfWidths[m - 1] + vLast.x * capOffsetLast),
      y: Math.round(pLast.y - nLast.y * halfWidths[m - 1] + vLast.y * capOffsetLast),
    },
    type: 'smooth',
  });

  // 右側サイドのセグメント & 角丸ターン処理（逆順に走査）
  for (let i = m - 2; i >= 1; i--) {
    const pt = finalBackbone[i];
    const w = halfWidths[i];
    const nPrev = segNorms[i - 1];
    const nCurr = segNorms[i];
    const vPrev = segDirs[i - 1];
    const vCurr = segDirs[i];

    const cross = vPrev.x * vCurr.y - vPrev.y * vCurr.x;
    const cosAngle = Math.max(-1, Math.min(1, vPrev.x * vCurr.x + vPrev.y * vCurr.y));
    const turnAngle = Math.acos(cosAngle);

    const sumNx = nPrev.x + nCurr.x;
    const sumNy = nPrev.y + nCurr.y;
    const sumLen = Math.hypot(sumNx, sumNy) || 1;
    const uNx = sumNx / sumLen;
    const uNy = sumNy / sumLen;

    if (cross > 0.05) {
      // 左に曲がる（右側は外角！円弧フィレットで丸める。逆方向）
      const arcHandleLen = (4 / 3) * Math.tan(turnAngle / 4) * w;

      const qIn: Point = {
        x: Math.round(pt.x - nCurr.x * w),
        y: Math.round(pt.y - nCurr.y * w),
      };
      const qOut: Point = {
        x: Math.round(pt.x - nPrev.x * w),
        y: Math.round(pt.y - nPrev.y * w),
      };

      if (turnAngle > 1.4) {
        const apex: Point = {
          x: Math.round(pt.x - uNx * w),
          y: Math.round(pt.y - uNy * w),
        };
        const halfTan = (4 / 3) * Math.tan(turnAngle / 8) * w;
        const uVx = (vPrev.x + vCurr.x);
        const uVy = (vPrev.y + vCurr.y);
        const uVLen = Math.hypot(uVx, uVy) || 1;
        const tangX = -uVx / uVLen;
        const tangY = -uVy / uVLen;

        nodes.push({
          id: generateId(),
          x: qIn.x,
          y: qIn.y,
          handleOut: {
            x: Math.round(qIn.x - vCurr.x * halfTan),
            y: Math.round(qIn.y - vCurr.y * halfTan),
          },
          type: 'smooth',
        });
        nodes.push({
          id: generateId(),
          x: apex.x,
          y: apex.y,
          handleIn: {
            x: Math.round(apex.x - tangX * halfTan),
            y: Math.round(apex.y - tangY * halfTan),
          },
          handleOut: {
            x: Math.round(apex.x + tangX * halfTan),
            y: Math.round(apex.y + tangY * halfTan),
          },
          type: 'smooth',
        });
        nodes.push({
          id: generateId(),
          x: qOut.x,
          y: qOut.y,
          handleIn: {
            x: Math.round(qOut.x + vPrev.x * halfTan),
            y: Math.round(qOut.y + vPrev.y * halfTan),
          },
          type: 'smooth',
        });
      } else {
        nodes.push({
          id: generateId(),
          x: qIn.x,
          y: qIn.y,
          handleOut: {
            x: Math.round(qIn.x - vCurr.x * arcHandleLen),
            y: Math.round(qIn.y - vCurr.y * arcHandleLen),
          },
          type: 'smooth',
        });
        nodes.push({
          id: generateId(),
          x: qOut.x,
          y: qOut.y,
          handleIn: {
            x: Math.round(qOut.x + vPrev.x * arcHandleLen),
            y: Math.round(qOut.y + vPrev.y * arcHandleLen),
          },
          type: 'smooth',
        });
      }
    } else if (cross < -0.05) {
      // 右に曲がる（右側は内角！内角交点）
      const innerMiter = Math.min(1.4, 2 / sumLen);
      nodes.push({
        id: generateId(),
        x: Math.round(pt.x - uNx * w * innerMiter),
        y: Math.round(pt.y - uNy * w * innerMiter),
        type: 'corner',
      });
    } else {
      nodes.push({
        id: generateId(),
        x: Math.round(pt.x - nPrev.x * w),
        y: Math.round(pt.y - nPrev.y * w),
        type: 'smooth',
      });
    }
  }

  // 始端の右側境界点と接続
  nodes.push({
    id: generateId(),
    x: Math.round(p0.x - n0.x * halfWidths[0]),
    y: Math.round(p0.y - n0.y * halfWidths[0]),
    handleOut: {
      x: Math.round(p0.x - n0.x * halfWidths[0] - v0.x * capOffset0),
      y: Math.round(p0.y - n0.y * halfWidths[0] - v0.y * capOffset0),
    },
    type: 'smooth',
  });

  // 近すぎる連続重複ノードを除去
  const deduplicatedNodes: BezierNode[] = [];
  for (let i = 0; i < nodes.length; i++) {
    if (deduplicatedNodes.length === 0) {
      deduplicatedNodes.push(nodes[i]);
      continue;
    }
    const prev = deduplicatedNodes[deduplicatedNodes.length - 1];
    const curr = nodes[i];
    if (Math.hypot(curr.x - prev.x, curr.y - prev.y) > 2) {
      deduplicatedNodes.push(curr);
    }
  }

  return finishContour(deduplicatedNodes, options?.customPreset);
}

/**
 * Options for Subdivided Fine-Segment Stroke generation
 */
