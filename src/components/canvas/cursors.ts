import { PathContour } from '../../types';
import { contoursToSvgPath } from '../../utils/path/svg';

// High-contrast dual-ring + center dot precision reticle SVG cursor (32x32, hotspot 16 16)
// Provides 100% visibility against white canvas, dark glyphs, and grid lines
export const HIGH_CONTRAST_RETICLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <circle cx="16" cy="16" r="7.5" fill="none" stroke="#ffffff" stroke-width="3.2" stroke-opacity="0.95"/>
  <circle cx="16" cy="16" r="7.5" fill="none" stroke="#047857" stroke-width="1.6"/>
  <line x1="16" y1="1" x2="16" y2="6.5" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
  <line x1="16" y1="25.5" x2="16" y2="31" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
  <line x1="1" y1="16" x2="6.5" y2="16" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
  <line x1="25.5" y1="16" x2="31" y2="16" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
  <line x1="16" y1="1.5" x2="16" y2="6.5" stroke="#047857" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="16" y1="25.5" x2="16" y2="30.5" stroke="#047857" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="1.5" y1="16" x2="6.5" y2="16" stroke="#047857" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="25.5" y1="16" x2="30.5" y2="16" stroke="#047857" stroke-width="1.5" stroke-linecap="round"/>
  <circle cx="16" cy="16" r="2.8" fill="#ffffff"/>
  <circle cx="16" cy="16" r="1.5" fill="#047857"/>
</svg>`;

export const HIGH_CONTRAST_NODE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
  <path d="M4 2 L4 18 L8 14 L12 22 L14.5 21 L10.5 13 L16 13 Z" fill="#0f172a" stroke="#ffffff" stroke-width="1.8" stroke-linejoin="round"/>
  <circle cx="18" cy="18" r="4.5" fill="none" stroke="#ffffff" stroke-width="2.5"/>
  <circle cx="18" cy="18" r="4.5" fill="none" stroke="#059669" stroke-width="1.4"/>
  <circle cx="18" cy="18" r="1.8" fill="#10b981"/>
</svg>`;

export const HIGH_CONTRAST_GRAB_CURSOR = 'grab';
export const HIGH_CONTRAST_GRABBING_CURSOR = 'grabbing';
export const HIGH_CONTRAST_PEN_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(HIGH_CONTRAST_RETICLE_SVG)}") 16 16, crosshair`;
export const HIGH_CONTRAST_NODE_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(HIGH_CONTRAST_NODE_SVG)}") 4 2, default`;
export const HIGH_CONTRAST_ANCHOR_ERASER_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(HIGH_CONTRAST_RETICLE_SVG)}") 16 16, crosshair`;
export const HIGH_CONTRAST_ERASER_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(HIGH_CONTRAST_RETICLE_SVG)}") 16 16, crosshair`;
export const HIGH_CONTRAST_CROSSHAIR_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(HIGH_CONTRAST_RETICLE_SVG)}") 16 16, crosshair`;

export const CONTOUR_SVG_CACHE_MAX_ENTRIES = 500;

export const contourSvgCache = new Map<string, string>();

// contoursToSvgPath rounds every coordinate to 2 decimal places, so the
// key uses the same rounding: values differing by less than 0.01 would
// otherwise create separate entries for an identical path.
const fmtCoord = (v: number | undefined | null): string => {
  if (v === undefined || v === null || !Number.isFinite(v)) return '';
  return String(Number(v.toFixed(2)));
};

export const getCachedContourSvgPath = (c: PathContour): string => {
  // The key must cover every value that shapes the SVG path output
  // (contoursToSvgPath uses each node's x/y, handleIn and handleOut, plus
  // closed). The previous key only used the first node's x and the last
  // node's y, so editing any other coordinate or handle returned a stale
  // cached path for hit testing.
  const key = [
    c.id,
    c.closed ? '1' : '0',
    (c.nodes ?? [])
      .map(
        (n) =>
          `${fmtCoord(n.x)},${fmtCoord(n.y)},${fmtCoord(n.handleIn?.x)},${fmtCoord(n.handleIn?.y)},${fmtCoord(n.handleOut?.x)},${fmtCoord(n.handleOut?.y)}`
      )
      .join(';'),
  ].join('|');
  const cached = contourSvgCache.get(key);
  if (cached !== undefined) return cached;
  const path = contoursToSvgPath([c]);
  // Map keeps insertion order: evict the oldest entries first so the
  // cache stays bounded.
  while (contourSvgCache.size >= CONTOUR_SVG_CACHE_MAX_ENTRIES) {
    const oldest = contourSvgCache.keys().next();
    if (oldest.done) break;
    contourSvgCache.delete(oldest.value);
  }
  contourSvgCache.set(key, path);
  return path;
};
