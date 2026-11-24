import { StrokePoint } from '../../types';

/**
 * Trim terminal jitter at stroke end (e.g., stylus lift-off drift < 1.5px).
 * Modifies the array in-place by popping off jittery terminal points.
 */
export function trimTerminalJitter(pts: StrokePoint[], minDistanceSq: number = 2.25): void {
  while (pts.length > 2) {
    const last = pts[pts.length - 1];
    const prev = pts[pts.length - 2];
    const dx = last.x - prev.x;
    const dy = last.y - prev.y;
    if (dx * dx + dy * dy < minDistanceSq) {
      pts.pop();
    } else {
      break;
    }
  }
}

/** A tap-shaped stroke lasts less than this long (ms). */
export const ACCIDENTAL_TAP_MAX_DURATION_MS = 280;
/** A tap-shaped stroke stays within this distance (canvas units) of its start. */
export const ACCIDENTAL_TAP_MAX_START_DISTANCE = 5.0;
/** A tap-shaped stroke draws less than this total length (canvas units). */
export const ACCIDENTAL_TAP_MAX_TOTAL_LENGTH = 8.0;
/** A stylus tap counts as deliberate when some point exceeds this pressure. */
export const DELIBERATE_PEN_PRESSURE = 0.38;

/**
 * Largest contact dimension (CSS px, PointerEvent width/height) that still
 * counts as a fingertip. A fingertip contact ellipse is roughly 7-12mm
 * (~27-45 CSS px at 96dpi); a palm heel is far larger. Contacts above this
 * are treated as palm. Values <= 1 mean "unknown" (some browsers report 1
 * for touch) and are never treated as palm.
 */
export const PALM_CONTACT_SIZE_PX = 60;

/**
 * True when the reported contact size is positively palm-sized.
 * Unknown sizes (undefined, 0, 1, NaN) return false.
 */
export function isPalmSizedContact(contactSizePx?: number): boolean {
  return typeof contactSizePx === 'number' && contactSizePx > PALM_CONTACT_SIZE_PX;
}

export type BrushTapClassification = 'stroke' | 'tapDot' | 'accidental';

/**
 * Classifies a finished brush stroke.
 *
 * - 'stroke': a real mark (mouse, a firm stylus tap, or anything that moved
 *   far / lasted long enough). Committed through the normal outline path.
 * - 'tapDot': a brief, near-stationary touch tap. The caller stamps a
 *   minimum-size dot at the tap position (a single point, which the outline
 *   builders already turn into a circle/square of at least the brush width).
 * - 'accidental': a brief, near-stationary contact that is not an
 *   intentional tap (a light stylus tap, or a palm-sized touch contact).
 *   Discarded as before.
 *
 * Why a finger tap can be a dot while palm contact stays discarded: a
 * touch that reaches the brush hook is already an isolated single touch.
 * The pointer dispatcher (useCanvasPointerDispatcher, read-only here)
 * rejects touch input while a pen is drawing or was active within 200ms,
 * rejects it under palm rejection (strict_pen_only, or auto mode with a
 * recently active pen), and turns a second touch into a pinch/pan gesture
 * instead of a new stroke. So a palm resting while the user draws with a
 * pen cannot arrive here as a tap. The one case the dispatcher cannot
 * filter is a palm placed *before* the pen, lifted again within 280ms
 * with almost no movement; that is what the contact-size check covers.
 * When the platform does not report contact size, the tap is treated as
 * a fingertip dot rather than discarded, because a finger has no other
 * way to make a dot (unlike a pen, it cannot meet the pressure test).
 */
export function classifyBrushTap(
  pts: StrokePoint[],
  startPos: { x: number; y: number },
  durationMs: number,
  pointerType?: string,
  contactSizePx?: number
): BrushTapClassification {
  if (pts.length === 0) return 'accidental';

  // Mouse input is always intentional user interaction (never palm touch)
  if (pointerType === 'mouse') {
    return 'stroke';
  }

  // Deliberate stylus firm tap check
  const isDeliberatePenTap =
    pointerType === 'pen' && pts.some((p) => (p.pressure || 0) > DELIBERATE_PEN_PRESSURE);

  if (isDeliberatePenTap) {
    return 'stroke';
  }

  let maxDistFromStart = 0;
  let totalStrokeLength = 0;
  for (let i = 0; i < pts.length; i++) {
    const dStart = Math.hypot(pts[i].x - startPos.x, pts[i].y - startPos.y);
    if (dStart > maxDistFromStart) maxDistFromStart = dStart;
    if (i > 0) {
      totalStrokeLength += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    }
  }

  const hasAccidentalShape =
    (pts.length <= 1 ||
      (maxDistFromStart < ACCIDENTAL_TAP_MAX_START_DISTANCE &&
        totalStrokeLength < ACCIDENTAL_TAP_MAX_TOTAL_LENGTH)) &&
    durationMs < ACCIDENTAL_TAP_MAX_DURATION_MS;

  if (!hasAccidentalShape) {
    return 'stroke';
  }

  // Brief, near-stationary contact: a fingertip tap stamps a dot, a
  // palm-sized contact is still discarded.
  if (pointerType === 'touch' && !isPalmSizedContact(contactSizePx)) {
    return 'tapDot';
  }

  return 'accidental';
}

/**
 * Determines whether a stroke is an accidental stray tap / palm brush vs an intentional mark.
 * Mouse clicks and deliberate stylus marks are preserved. A brief,
 * near-stationary finger tap is not accidental: it is a dot (see
 * classifyBrushTap), unless the contact is palm-sized.
 */
export function isAccidentalStrayTap(
  pts: StrokePoint[],
  startPos: { x: number; y: number },
  durationMs: number,
  pointerType?: string,
  contactSizePx?: number
): boolean {
  return (
    classifyBrushTap(pts, startPos, durationMs, pointerType, contactSizePx) === 'accidental'
  );
}
