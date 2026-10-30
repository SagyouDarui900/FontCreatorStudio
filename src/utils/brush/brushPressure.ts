/**
 * Utility functions for stylus hardware calibration and mouse/touch EMA speed-to-pressure dynamics.
 */

/**
 * Calibrate hardware stylus pressure to a comfortable, expressive 0.04 - 1.0 dynamic range.
 */
export function calibrateStylusPressure(rawP: number): number {
  if (rawP <= 0) return 0.15;
  return Math.max(0.04, Math.min(1.0, (rawP - 0.03) / 0.65));
}

/**
 * Calculate dynamic pseudo-pressure for mouse/touch inputs based on gesture velocity EMA.
 */
export function computeMouseSpeedPressure(
  dt: number,
  ds: number,
  currentSmoothSpeed: number
): { smoothSpeed: number; rawPressure: number } {
  const safeDt = Math.max(8, dt);
  const instantSpeed = Math.min(3.0, ds / safeDt);
  const smoothSpeed = currentSmoothSpeed * 0.85 + instantSpeed * 0.15;
  const rawPressure = Math.max(0.35, Math.min(0.80, 0.65 - (smoothSpeed - 0.5) * 0.18));
  return { smoothSpeed, rawPressure };
}

/**
 * Blend instantaneous pressure with prior sample for smooth transition without pulsation.
 * Pen: high responsiveness (88% new, 12% prior).
 * Mouse/touch: high dampening (25% new, 75% prior) to prevent staircase jitter.
 */
export function blendStrokePressure(
  pointerType: string | undefined,
  pressureSensitivity: 'high' | 'normal' | 'low' | 'off',
  rawPres: number,
  lastPressure?: number
): number {
  if (pressureSensitivity === 'off') {
    return 0.5;
  }
  if (lastPressure === undefined || typeof lastPressure !== 'number') {
    return rawPres;
  }
  if (pointerType === 'pen') {
    return lastPressure * 0.12 + rawPres * 0.88;
  }
  return lastPressure * 0.75 + rawPres * 0.25;
}
