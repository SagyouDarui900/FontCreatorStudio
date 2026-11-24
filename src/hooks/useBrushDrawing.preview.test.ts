import { describe, expect, it } from 'vitest';
import {
  buildBrushContour,
  buildLiveBrushPreviewSvgPath,
  type BrushStrokeConfig,
} from './useBrushDrawing';
import { contoursToSvgPath } from '../utils/path';
import { getContourBoundingBox } from '../utils/path/bounds';
import { getDecimatedPointsForLivePreview } from '../utils/brush/brushOutlinePreview';
import type { StrokePoint, UserPenPreset } from '../types';

function makeCurvedStroke(n: number, wobble = 30): StrokePoint[] {
  const pts: StrokePoint[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / Math.max(1, n - 1);
    pts.push({
      x: 100 + t * 800 + Math.sin(t * 7) * wobble,
      y: 300 + Math.sin(t * 4) * 100 + t * 120,
      pressure: 0.35 + 0.45 * Math.sin(t * Math.PI),
      time: i * 8,
      pointerType: 'pen',
    });
  }
  return pts;
}

function makeNearStraightStroke(): StrokePoint[] {
  // Wobble of +/-1.2 units: inside the auto-straight limits (max deviation
  // under 1.8, straightness ratio over 0.998), so the finalize path snaps
  // the centreline onto the chord. The preview must do the same.
  const pts: StrokePoint[] = [];
  for (let i = 0; i < 60; i++) {
    const t = i / 59;
    pts.push({
      x: 100 + t * 600,
      y: 300 + Math.sin(t * Math.PI * 4) * 1.2,
      pressure: 0.5,
      time: i * 8,
      pointerType: 'pen',
    });
  }
  return pts;
}

const preset = {
  taperStartLength: 20,
  taperEndLength: 30,
  taperStartWidth: 40,
  taperEndWidth: 30,
  tipSharpness: 40,
  pressureWidthFactor: 30,
  edgeRoughness: 20,
  jitterSize: 10,
  inkBleed: 20,
} as unknown as UserPenPreset;

function cfgFor(style: BrushStrokeConfig['brushStyle']): BrushStrokeConfig {
  return {
    brushWidth: 40,
    brushStyle: style,
    pressureSensitivity: 'normal',
    pressureCurve: null,
    smoothingIntensity: 50,
    activePenPreset: preset,
  };
}

/** The finalize output for the same points: outline + SVG path. */
function finalizeSvgPath(pts: StrokePoint[], cfg: BrushStrokeConfig): string {
  return contoursToSvgPath([buildBrushContour(pts, cfg)]);
}

describe('brush preview matches finalize (live preview uses the same outline)', () => {
  it('short brush stroke with a custom preset: preview is byte-identical to finalize', () => {
    const pts = makeCurvedStroke(40);
    const cfg = cfgFor('brush');
    expect(buildLiveBrushPreviewSvgPath(pts, cfg)).toBe(finalizeSvgPath(pts, cfg));
  });

  it('short calligraphy stroke with a custom preset: preview is byte-identical to finalize', () => {
    const pts = makeCurvedStroke(40);
    const cfg = cfgFor('calligraphy');
    expect(buildLiveBrushPreviewSvgPath(pts, cfg)).toBe(finalizeSvgPath(pts, cfg));
  });

  it('short sharp (angular) stroke: preview is byte-identical to finalize', () => {
    const pts = makeCurvedStroke(40);
    const cfg = cfgFor('sharp');
    expect(buildLiveBrushPreviewSvgPath(pts, cfg)).toBe(finalizeSvgPath(pts, cfg));
  });

  it('near-straight wobbly stroke: preview and finalize apply the same auto-straight', () => {
    const pts = makeNearStraightStroke();
    const cfg = cfgFor('brush');
    expect(buildLiveBrushPreviewSvgPath(pts, cfg)).toBe(finalizeSvgPath(pts, cfg));
  });

  it('long stroke: decimated preview stays close to the full-point finalize', () => {
    const pts = makeCurvedStroke(300);
    const cfg = cfgFor('brush');
    const preview = buildLiveBrushPreviewSvgPath(pts, cfg);
    expect(preview.length).toBeGreaterThan(0);

    const decimated = getDecimatedPointsForLivePreview(pts);
    expect(decimated.length).toBeLessThanOrEqual(160);
    const previewBox = getContourBoundingBox(buildBrushContour(decimated, cfg));
    const finalizeBox = getContourBoundingBox(buildBrushContour(pts, cfg));
    expect(Math.abs(previewBox.width - finalizeBox.width)).toBeLessThan(5);
    expect(Math.abs(previewBox.height - finalizeBox.height)).toBeLessThan(5);
    expect(Math.abs(previewBox.centerX - finalizeBox.centerX)).toBeLessThan(5);
    expect(Math.abs(previewBox.centerY - finalizeBox.centerY)).toBeLessThan(5);
  });

  it('empty input produces an empty preview path', () => {
    expect(buildLiveBrushPreviewSvgPath([], cfgFor('brush'))).toBe('');
  });
});
