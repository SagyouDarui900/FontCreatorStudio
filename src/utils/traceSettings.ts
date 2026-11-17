import { StoredTraceSettings, TraceSettings } from '../types';
import { TRACE_DEFAULT_OPACITY, TRACE_SCALE_MAX, TRACE_SCALE_MIN } from '../components/canvas/traceOptions';

/**
 * Trace settings persistence.
 *
 * Underdrawing images are data URLs and can be megabytes in size, so they
 * are never stored in the project. Only the image-free settings are saved
 * and restored; a restored project shows the character underdrawing (or no
 * image) until the user loads an image again.
 */

export function toStoredTraceSettings(settings: TraceSettings): StoredTraceSettings {
  const { imageSrc: _imageSrc, charImages: _charImages, ...rest } = settings;
  return rest;
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clampedNumber(value: unknown, fallback: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, finiteNumber(value, fallback)));
}

/** Validate and sanitize stored trace settings; returns undefined for non-objects. */
export function sanitizeStoredTraceSettings(raw: unknown): StoredTraceSettings | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const s = raw as Record<string, unknown>;
  return {
    enabled: typeof s.enabled === 'boolean' ? s.enabled : true,
    type: s.type === 'image' ? 'image' : 'char',
    text: typeof s.text === 'string' ? s.text.slice(0, 1) : '',
    fontFamily: typeof s.fontFamily === 'string' ? s.fontFamily : "'Noto Sans JP', sans-serif",
    fontSize: clampedNumber(s.fontSize, 1000, 200, 2000),
    opacity: clampedNumber(s.opacity, TRACE_DEFAULT_OPACITY, 0, 1),
    scale: clampedNumber(s.scale, 1, TRACE_SCALE_MIN, TRACE_SCALE_MAX),
    offsetX: finiteNumber(s.offsetX, 0),
    offsetY: finiteNumber(s.offsetY, 0),
    rotation: finiteNumber(s.rotation, 0),
    contrast: clampedNumber(s.contrast, 1, 0.5, 3),
    brightness: clampedNumber(s.brightness, 1, 0.5, 2),
    grayscale: Boolean(s.grayscale),
    invert: Boolean(s.invert),
    flipH: Boolean(s.flipH),
    flipV: Boolean(s.flipV),
  };
}

export function areStoredTraceSettingsEqual(
  a?: StoredTraceSettings | null,
  b?: StoredTraceSettings | null
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof StoredTraceSettings>;
  for (const key of keys) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}
