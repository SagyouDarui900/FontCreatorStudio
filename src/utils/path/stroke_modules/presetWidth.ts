import type { UserPenPreset } from "../../../types";

/**
 * Shared width helpers for the round-D preset fields, used by both the
 * subdivided outline path (outlineSubdivided.ts) and the geometric
 * sharp / polygon / sharp_round path (sharpContours.ts).
 *
 * Every helper is the identity at the field's default value, so an
 * existing preset without the field draws exactly as before.
 */

/**
 * Clamp one half-width to the preset's minWidth / maxWidth (full widths
 * in px, the same unit as brushWidth). minWidth 0 means no lower limit;
 * maxWidth undefined or 0 means no upper limit. Each side is clamped
 * to half of the limit, so the total width stays within [minWidth,
 * maxWidth] for symmetric strokes and within the same bounds for
 * asymmetric ones.
 */
export function clampHalfWidth(
  halfWidth: number,
  cp?: Partial<UserPenPreset>
): number {
  let w = halfWidth;
  const minW = cp?.minWidth ?? 0;
  if (typeof minW === "number" && minW > 0) {
    w = Math.max(w, minW / 2);
  }
  const maxW = cp?.maxWidth ?? 0;
  if (typeof maxW === "number" && maxW > 0) {
    w = Math.min(w, maxW / 2);
  }
  return w;
}

/**
 * Warp the taper progress (0 at the tip, 1 at full width) by the
 * taperCurve. 'linear' is the identity: the existing interpolation
 * (the cosine curve, or pow(t, 1.5) for a sharp tip) is used unchanged,
 * so 'linear' — the default — draws exactly as before. 'gentle' rises
 * more slowly (the stroke stays thin longer), 'steep' rises faster
 * (the stroke reaches full width sooner).
 */
export function applyTaperCurve(
  progress: number,
  curve?: UserPenPreset["taperCurve"]
): number {
  if (curve === "gentle") return Math.pow(progress, 1.5);
  if (curve === "steep") return Math.pow(progress, 0.6);
  return progress;
}

/**
 * Ink-pooling width multiplier at one stroke position: wider near the
 * start of the stroke and near sharp turns, mirroring the built-in
 * sumi pooling shape. At inkPooling 0 the multiplier is exactly 1.
 */
export function inkPoolingMultiplier(
  normDist: number,
  absTurn: number,
  inkPooling?: number
): number {
  const p =
    typeof inkPooling === "number"
      ? Math.max(0, Math.min(100, inkPooling)) / 100
      : 0;
  if (p <= 0) return 1;
  let m = 1;
  if (normDist < 0.12) {
    m += p * 0.35 * Math.sin(((0.12 - normDist) / 0.12) * Math.PI * 0.5);
  }
  if (absTurn > 0.4) {
    m += p * Math.min(0.25, (absTurn / Math.PI) * 0.25);
  }
  return m;
}

/**
 * Spatial-frequency factor for the edgeRoughness boundary noise.
 * roughnessScale 50 (the default) is 1, so the existing grain is
 * unchanged. A larger scale means larger grains (lower frequency);
 * scale 0 means the finest grains.
 */
export function roughnessGrainFrequency(
  roughnessScale?: number
): number {
  const s = typeof roughnessScale === "number" ? roughnessScale : 50;
  if (s <= 0) return 4;
  return 50 / s;
}

/**
 * Brush flex: lag the width changes in stroke order with a causal
 * one-pole low-pass (exponential moving average). A pressure rise
 * reaches the width later, which is the temporal delay of a flexing
 * brush. At brushFlex 0 the widths are left untouched.
 */
export function applyBrushFlex(
  widths: Float64Array | number[],
  brushFlex?: number
): void {
  const f =
    typeof brushFlex === "number"
      ? Math.max(0, Math.min(100, brushFlex))
      : 0;
  if (f <= 0 || widths.length < 2) return;
  const alpha = 1 - (0.85 * f) / 100;
  let prev = widths[0];
  for (let i = 1; i < widths.length; i++) {
    const next = alpha * widths[i] + (1 - alpha) * prev;
    widths[i] = next;
    prev = next;
  }
}
