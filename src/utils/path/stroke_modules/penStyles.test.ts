import { describe, expect, it } from 'vitest';
import { buildBrushContour, type BrushStrokeConfig } from '../../../hooks/useBrushDrawing';
import { DEFAULT_PRESSURE_CURVES } from '../../presetData';
import { getContourSignedArea } from '../bounds';
import type { BrushStyle, PathContour, StrokePoint, UserPenPreset } from '../../../types';

function curveStroke(): StrokePoint[] {
  const pts: StrokePoint[] = [];
  const n = 41;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    pts.push({
      x: 500 + t * 220,
      y: 500 + 70 * Math.sin(t * Math.PI * 1.2) - 30 * t,
      pressure: 0.3 + 0.6 * Math.sin(t * Math.PI),
      time: i * 16,
      pointerType: 'pen',
    } as StrokePoint);
  }
  return pts;
}

function flatPressureStroke(pressure: number): StrokePoint[] {
  return curveStroke().map((p) => ({ ...p, pressure }));
}

function singlePoint(): StrokePoint[] {
  return [{ x: 500, y: 500, pressure: 0.5, time: 0, pointerType: 'pen' } as StrokePoint];
}

function signature(contour: PathContour): string {
  const s = JSON.stringify(
    contour.nodes.map((nd) => [nd.x, nd.y, nd.type, nd.handleIn ?? null, nd.handleOut ?? null])
  );
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return `${(h >>> 0).toString(16)}:${contour.nodes.length}`;
}

function area(contour: PathContour): number {
  return Math.abs(getContourSignedArea(contour as never));
}

/** Total turning (sum of |angle| between consecutive edges) of the closed loop. */
function totalTurning(nodes: { x: number; y: number }[]): number {
  let sum = 0;
  const n = nodes.length;
  for (let i = 0; i < n; i++) {
    const a = nodes[i];
    const b = nodes[(i + 1) % n];
    const c = nodes[(i + 2) % n];
    const v1x = b.x - a.x;
    const v1y = b.y - a.y;
    const v2x = c.x - b.x;
    const v2y = c.y - b.y;
    const l1 = Math.hypot(v1x, v1y) || 1;
    const l2 = Math.hypot(v2x, v2y) || 1;
    const cos = Math.max(-1, Math.min(1, (v1x * v2x + v1y * v2y) / (l1 * l2)));
    sum += Math.acos(cos);
  }
  return sum;
}

function cfg(style: BrushStyle, preset?: Partial<UserPenPreset>, smoothingIntensity = 50): BrushStrokeConfig {
  return {
    brushWidth: 40,
    brushStyle: style,
    pressureSensitivity: 'normal',
    pressureCurve: DEFAULT_PRESSURE_CURVES.linear,
    smoothingIntensity,
    activePenPreset: preset as never,
  };
}

/** curveStroke geometry with custom per-point times. */
function timedStroke(timeAt: (i: number) => number): StrokePoint[] {
  return curveStroke().map((p, i) => ({ ...p, time: timeAt(i) }));
}

/** First half of the points spans 80% of the 1360 ms duration (slow start). */
function slowStartStroke(): StrokePoint[] {
  return timedStroke((i) => (i <= 20 ? i * 64 : 1280 + (i - 20) * 4));
}

/** First half of the points spans 20% of the 1360 ms duration (fast start). */
function fastStartStroke(): StrokePoint[] {
  return timedStroke((i) => (i <= 20 ? i * 4 : 80 + (i - 20) * 64));
}

/** Last half of the points spans 80% of the 1360 ms duration (slow end). */
function slowEndStroke(): StrokePoint[] {
  return timedStroke((i) => (i <= 20 ? i * 4 : 80 + (i - 20) * 64));
}

/** Last half of the points spans 20% of the 1360 ms duration (fast end). */
function fastEndStroke(): StrokePoint[] {
  return timedStroke((i) => (i <= 20 ? i * 64 : 1280 + (i - 20) * 4));
}

/** Alternating ±6 zigzag, 41 points, x step 6, constant pressure. */
function zigzagStroke(stepMs: number): StrokePoint[] {
  const pts: StrokePoint[] = [];
  const n = 41;
  for (let i = 0; i < n; i++) {
    pts.push({
      x: 500 + i * 6,
      y: 500 + (i % 2 === 0 ? 6 : -6),
      pressure: 0.6,
      time: i * stepMs,
      pointerType: 'pen',
    } as StrokePoint);
  }
  return pts;
}

describe('pen style individuality (regression)', () => {
  it('sharp and polygon produce different outlines at equal settings', () => {
    const pts = curveStroke();
    const sharp = buildBrushContour(pts, cfg('sharp'));
    const polygon = buildBrushContour(pts, cfg('polygon'));
    expect(signature(polygon)).not.toBe(signature(sharp));
    expect(area(polygon)).not.toBeCloseTo(area(sharp), 0);
  });

  it('sharp, sharp_round and polygon respond to pressure', () => {
    for (const style of ['sharp', 'sharp_round', 'polygon'] as BrushStyle[]) {
      const low = area(buildBrushContour(flatPressureStroke(0.2), cfg(style)));
      const high = area(buildBrushContour(flatPressureStroke(0.9), cfg(style)));
      // 0.5 + p factor: (0.5 + 0.9) / (0.5 + 0.2) = 2.0 on the half-width,
      // so the area ratio must be well above 1.
      expect(high / low).toBeGreaterThan(1.5);
    }
  });

  it('sharp and sharp_round reflect custom preset fields', () => {
    const pts = curveStroke();
    for (const style of ['sharp', 'sharp_round'] as BrushStyle[]) {
      const base = signature(buildBrushContour(pts, cfg(style)));
      const taper = signature(
        buildBrushContour(
          pts,
          cfg(style, { taperStartLength: 100, taperEndLength: 100, taperStartWidth: 10, taperEndWidth: 10 })
        )
      );
      const bleed = signature(buildBrushContour(pts, cfg(style, { inkBleed: 80 })));
      const rough = signature(buildBrushContour(pts, cfg(style, { edgeRoughness: 80 })));
      const slant = signature(buildBrushContour(pts, cfg(style, { axisSlant: 30 })));
      expect(taper).not.toBe(base);
      expect(bleed).not.toBe(base);
      expect(rough).not.toBe(base);
      expect(slant).not.toBe(base);
    }
  });

  it('polygon reflects custom preset fields', () => {
    const pts = curveStroke();
    const base = signature(buildBrushContour(pts, cfg('polygon')));
    const taper = signature(
      buildBrushContour(
        pts,
        cfg('polygon', { taperStartLength: 100, taperEndLength: 100, taperStartWidth: 10, taperEndWidth: 10 })
      )
    );
    expect(taper).not.toBe(base);
  });

  it('pixel_dot quantizes the outline to a pixel grid with corner nodes', () => {
    const c = buildBrushContour(curveStroke(), cfg('pixel_dot'));
    // width 40 -> grid 5
    for (const nd of c.nodes) {
      expect(Math.abs(nd.x % 5)).toBeLessThan(0.011);
      expect(Math.abs(nd.y % 5)).toBeLessThan(0.011);
      expect(nd.type).toBe('corner');
      expect(nd.handleIn).toBeNull();
      expect(nd.handleOut).toBeNull();
    }
    expect(c.nodes.length).toBeGreaterThan(4);
  });

  it('pixel_dot responds to pressure and differs from signpen with pressure off', () => {
    const low = area(buildBrushContour(flatPressureStroke(0.2), cfg('pixel_dot')));
    const high = area(buildBrushContour(flatPressureStroke(0.9), cfg('pixel_dot')));
    expect(high / low).toBeGreaterThan(1.5);
    const pixelOff = signature(buildBrushContour(curveStroke(), { ...cfg('pixel_dot'), pressureSensitivity: 'off' }));
    const signOff = signature(buildBrushContour(curveStroke(), { ...cfg('signpen'), pressureSensitivity: 'off' }));
    expect(pixelOff).not.toBe(signOff);
  });

  it('pixel_dot tap dot is a square on the grid', () => {
    const c = buildBrushContour(singlePoint(), cfg('pixel_dot'));
    expect(c.nodes).toHaveLength(4);
    expect(c.nodes.every((nd) => nd.type === 'corner')).toBe(true);
    const xs = c.nodes.map((n) => n.x);
    const ys = c.nodes.map((n) => n.y);
    const w = Math.max(...xs) - Math.min(...xs);
    const h = Math.max(...ys) - Math.min(...ys);
    expect(w).toBe(h);
    expect(area(c)).toBeCloseTo(w * h, 0);
  });

  it('polygon tap dot is a hexagon, sharp tap dot is a square', () => {
    const poly = buildBrushContour(singlePoint(), cfg('polygon'));
    expect(poly.nodes).toHaveLength(6);
    expect(poly.nodes.every((nd) => nd.type === 'corner')).toBe(true);
    const sharp = buildBrushContour(singlePoint(), cfg('sharp'));
    expect(sharp.nodes).toHaveLength(4);
    expect(sharp.nodes.every((nd) => nd.type === 'corner')).toBe(true);
  });

  it('wobbly differs from marker in edge waviness and node count', () => {
    const pts = curveStroke();
    const wobbly = buildBrushContour(pts, cfg('wobbly'));
    const marker = buildBrushContour(pts, cfg('marker'));
    // The wobble is an edge waviness, not an area change: total turning
    // of the outline is an order of magnitude higher than a smooth ribbon.
    expect(totalTurning(wobbly.nodes)).toBeGreaterThan(totalTurning(marker.nodes) * 5);
    expect(wobbly.nodes.length).toBeGreaterThan(marker.nodes.length * 2);
  });

  it('activating a preset with no effective fields does not change the stroke', () => {
    const pts = curveStroke();
    const base = signature(buildBrushContour(pts, cfg('brush')));
    const empty = signature(buildBrushContour(pts, cfg('brush', {})));
    expect(empty).toBe(base);
  });

  it('a preset with only still-unconnected fields matches the empty preset', () => {
    const pts = curveStroke();
    const empty = signature(buildBrushContour(pts, cfg('brush', {})));
    const dead = signature(
      buildBrushContour(
        pts,
        cfg('brush', {
          speedOpacityFactor: 100,
          pressureOpacityFactor: 100,
          antiAlias: false,
        })
      )
    );
    expect(dead).toBe(empty);
  });

  it('a preset with the connected round-C fields at their defaults matches the empty preset', () => {
    const pts = curveStroke();
    const empty = signature(buildBrushContour(pts, cfg('brush', {})));
    const defaults = signature(
      buildBrushContour(
        pts,
        cfg('brush', {
          taperStartTime: 100,
          taperEndTime: 100,
          nibSpacing: 1,
          jitterSpacing: 0,
          stabilizationMethod: 'pre',
          speedStabilization: 0,
          legacyStabilization: false,
        })
      )
    );
    expect(defaults).toBe(empty);
  });
});

describe('round C: previously unconnected preset fields', () => {
  it('taperStartTime caps the entry taper by the distance covered in that time', () => {
    // marker ignores speed, so only the time-based taper zone can differ.
    const taper = { taperStartLength: 40, taperStartWidth: 10 };
    const slow100 = signature(buildBrushContour(slowStartStroke(), cfg('marker', { ...taper, taperStartTime: 100 })));
    const slowUnset = signature(buildBrushContour(slowStartStroke(), cfg('marker', taper)));
    expect(slow100).toBe(slowUnset);
    const slow50 = signature(buildBrushContour(slowStartStroke(), cfg('marker', { ...taper, taperStartTime: 50 })));
    expect(slow50).not.toBe(slow100);
    // The same geometry tapers differently with writing speed at 50%.
    const fast50 = signature(buildBrushContour(fastStartStroke(), cfg('marker', { ...taper, taperStartTime: 50 })));
    expect(fast50).not.toBe(slow50);
    // 0% time removes the entry taper entirely.
    const slow0 = signature(buildBrushContour(slowStartStroke(), cfg('marker', { ...taper, taperStartTime: 0 })));
    const noTaper = signature(buildBrushContour(slowStartStroke(), cfg('marker', {})));
    expect(slow0).toBe(noTaper);
  });

  it('taperEndTime caps the exit taper by the distance covered in that time', () => {
    const taper = { taperEndLength: 40, taperEndWidth: 10 };
    const slow100 = signature(buildBrushContour(slowEndStroke(), cfg('marker', { ...taper, taperEndTime: 100 })));
    const slowUnset = signature(buildBrushContour(slowEndStroke(), cfg('marker', taper)));
    expect(slow100).toBe(slowUnset);
    const slow50 = signature(buildBrushContour(slowEndStroke(), cfg('marker', { ...taper, taperEndTime: 50 })));
    expect(slow50).not.toBe(slow100);
    const fast50 = signature(buildBrushContour(fastEndStroke(), cfg('marker', { ...taper, taperEndTime: 50 })));
    expect(fast50).not.toBe(slow50);
  });

  it('nibSpacing coarsens the outline sampling', () => {
    const pts = curveStroke();
    const fine = buildBrushContour(pts, cfg('brush', { nibSpacing: 1 }));
    const coarse = buildBrushContour(pts, cfg('brush', { nibSpacing: 100 }));
    expect(coarse.nodes.length).toBeLessThan(fine.nodes.length);
    expect(signature(coarse)).not.toBe(signature(fine));
    const unset = signature(buildBrushContour(pts, cfg('brush', {})));
    expect(signature(fine)).toBe(unset);
  });

  it('jitterSpacing varies the sampling interval together with nibSpacing', () => {
    const pts = curveStroke();
    const base = signature(buildBrushContour(pts, cfg('brush', { nibSpacing: 50 })));
    const jittered = signature(
      buildBrushContour(pts, cfg('brush', { nibSpacing: 50, jitterSpacing: 100 }))
    );
    expect(jittered).not.toBe(base);
    const noJitter = signature(buildBrushContour(pts, cfg('brush', { nibSpacing: 50, jitterSpacing: 0 })));
    expect(noJitter).toBe(base);
    const jitterAlone = signature(buildBrushContour(pts, cfg('brush', { jitterSpacing: 100 })));
    const plain = signature(buildBrushContour(pts, cfg('brush', {})));
    expect(jitterAlone).not.toBe(plain);
  });

  it('stabilizationMethod post leaves the centreline raw and smooths widths instead', () => {
    const pts = zigzagStroke(16);
    const pre = signature(buildBrushContour(pts, cfg('brush', { stabilizationMethod: 'pre' })));
    const unset = signature(buildBrushContour(pts, cfg('brush', {})));
    expect(pre).toBe(unset);
    const post = signature(buildBrushContour(pts, cfg('brush', { stabilizationMethod: 'post' })));
    expect(post).not.toBe(pre);
  });

  it('speedStabilization strengthens smoothing only where the stroke is fast', () => {
    const fast = zigzagStroke(8);
    const fastBase = signature(buildBrushContour(fast, cfg('brush', { speedStabilization: 0 })));
    const fastStrong = signature(buildBrushContour(fast, cfg('brush', { speedStabilization: 100 })));
    expect(fastStrong).not.toBe(fastBase);
    const slow = zigzagStroke(64);
    const slowBase = signature(buildBrushContour(slow, cfg('brush', { speedStabilization: 0 })));
    const slowStrong = signature(buildBrushContour(slow, cfg('brush', { speedStabilization: 100 })));
    expect(slowStrong).toBe(slowBase);
  });

  it('legacyStabilization applies the old pre-correction to the centreline', () => {
    const pts = zigzagStroke(16);
    const base = signature(buildBrushContour(pts, cfg('brush', { legacyStabilization: false }, 10)));
    const legacy = signature(buildBrushContour(pts, cfg('brush', { legacyStabilization: true }, 10)));
    expect(legacy).not.toBe(base);
    const unset = signature(buildBrushContour(pts, cfg('brush', {}, 10)));
    expect(unset).toBe(base);
  });
});
