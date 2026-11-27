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

/** Straight horizontal stroke, 21 points, constant pressure, mouse input. */
function straightStroke(): StrokePoint[] {
  const pts: StrokePoint[] = [];
  for (let i = 0; i < 21; i++) {
    pts.push({
      x: 500 + i * 10,
      y: 500,
      pressure: 0.6,
      time: i * 16,
      pointerType: 'mouse',
    } as StrokePoint);
  }
  return pts;
}

/** L-shaped stroke with one sharp 90-degree corner, mouse input. */
function lStroke(): StrokePoint[] {
  const pts: StrokePoint[] = [];
  for (let i = 0; i < 16; i++) {
    pts.push({
      x: 500 + i * 10,
      y: 500,
      pressure: 0.6,
      time: i * 16,
      pointerType: 'mouse',
    } as StrokePoint);
  }
  for (let i = 1; i < 16; i++) {
    pts.push({
      x: 650,
      y: 500 + i * 10,
      pressure: 0.6,
      time: (15 + i) * 16,
      pointerType: 'mouse',
    } as StrokePoint);
  }
  return pts;
}

/** Staircase stroke: four 100px segments with 90-degree corners, mouse input. */
function staircaseStroke(): StrokePoint[] {
  const corners: Array<[number, number]> = [
    [500, 500],
    [600, 500],
    [600, 600],
    [700, 600],
    [700, 700],
  ];
  const pts: StrokePoint[] = [];
  let t = 0;
  for (let s = 0; s < corners.length - 1; s++) {
    const [x0, y0] = corners[s];
    const [x1, y1] = corners[s + 1];
    for (let i = 0; i < 10; i++) {
      pts.push({
        x: x0 + ((x1 - x0) * i) / 10,
        y: y0 + ((y1 - y0) * i) / 10,
        pressure: 0.6,
        time: t * 16,
        pointerType: 'mouse',
      } as StrokePoint);
      t += 1;
    }
  }
  pts.push({ x: 700, y: 700, pressure: 0.6, time: t * 16, pointerType: 'mouse' } as StrokePoint);
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

describe('round D: new preset fields', () => {
  const roundDDefaults: Partial<UserPenPreset> = {
    lineCap: 'round',
    lineJoin: 'miter',
    taperCurve: 'linear',
    minWidth: 0,
    maxWidth: 0,
    inkPooling: 0,
    roughnessScale: 50,
    brushFlex: 0,
    doubleLineGap: 0,
    dottedSpacing: 0,
  };

  it('a preset with the round-D fields at their defaults matches the empty preset', () => {
    const pts = curveStroke();
    for (const style of ['brush', 'marker', 'sumi', 'sharp', 'sharp_round', 'polygon'] as BrushStyle[]) {
      const empty = signature(buildBrushContour(pts, cfg(style)));
      const defaults = signature(buildBrushContour(pts, cfg(style, roundDDefaults)));
      expect(defaults).toBe(empty);
    }
  });

  it('lineCap square extends the ends flat, butt does not extend them', () => {
    // marker with pressure off: constant width 40, no taper, no tail flick.
    const markerOff = { ...cfg('marker'), pressureSensitivity: 'off' as const };
    const round = buildBrushContour(straightStroke(), { ...markerOff, activePenPreset: { lineCap: 'round' } as never });
    const unset = buildBrushContour(straightStroke(), markerOff);
    expect(signature(round)).toBe(signature(unset));
    const xs = (c: PathContour) => c.nodes.map((n) => n.x);
    expect(Math.max(...xs(round))).toBeCloseTo(720, 0);
    expect(Math.min(...xs(round))).toBeCloseTo(480, 0);
    const square = buildBrushContour(straightStroke(), { ...markerOff, activePenPreset: { lineCap: 'square' } as never });
    expect(Math.max(...xs(square))).toBeCloseTo(720, 0);
    expect(Math.min(...xs(square))).toBeCloseTo(480, 0);
    expect(signature(square)).not.toBe(signature(round));
    // A square cap has corner nodes at the extended ends; a round cap
    // has its extreme node at the centre of the end instead.
    const hasNode = (c: PathContour, x: number, y: number) =>
      c.nodes.some((n) => Math.abs(n.x - x) < 0.011 && Math.abs(n.y - y) < 0.011);
    expect(hasNode(square, 720, 480)).toBe(true);
    expect(hasNode(square, 720, 520)).toBe(true);
    expect(hasNode(square, 480, 480)).toBe(true);
    expect(hasNode(square, 480, 520)).toBe(true);
    expect(hasNode(round, 720, 500)).toBe(true);
    expect(hasNode(round, 480, 500)).toBe(true);
    expect(hasNode(round, 720, 480)).toBe(false);
    const butt = buildBrushContour(straightStroke(), { ...markerOff, activePenPreset: { lineCap: 'butt' } as never });
    expect(Math.max(...xs(butt))).toBeCloseTo(700, 0);
    expect(Math.min(...xs(butt))).toBeCloseTo(500, 0);
    expect(area(butt)).toBeLessThan(area(round));
  });

  it('lineJoin miter matches the unset drawing; round and bevel differ at a sharp corner', () => {
    const pts = lStroke();
    const unset = signature(buildBrushContour(pts, cfg('marker', {}, 0)));
    const miter = signature(buildBrushContour(pts, cfg('marker', { lineJoin: 'miter' }, 0)));
    expect(miter).toBe(unset);
    const round = signature(buildBrushContour(pts, cfg('marker', { lineJoin: 'round' }, 0)));
    expect(round).not.toBe(unset);
    const bevel = signature(buildBrushContour(pts, cfg('marker', { lineJoin: 'bevel' }, 0)));
    expect(bevel).not.toBe(unset);
    expect(bevel).not.toBe(round);
  });

  it('taperCurve linear matches the unset taper; gentle and steep differ', () => {
    const taper = { taperStartLength: 40, taperStartWidth: 10, taperEndLength: 40, taperEndWidth: 10 };
    const pts = curveStroke();
    const unset = signature(buildBrushContour(pts, cfg('marker', taper)));
    const linear = signature(buildBrushContour(pts, cfg('marker', { ...taper, taperCurve: 'linear' })));
    expect(linear).toBe(unset);
    const gentle = signature(buildBrushContour(pts, cfg('marker', { ...taper, taperCurve: 'gentle' })));
    expect(gentle).not.toBe(unset);
    const steep = signature(buildBrushContour(pts, cfg('marker', { ...taper, taperCurve: 'steep' })));
    expect(steep).not.toBe(unset);
    expect(steep).not.toBe(gentle);
  });

  it('minWidth raises thin strokes and maxWidth caps thick strokes', () => {
    const markerOff = { ...cfg('marker'), pressureSensitivity: 'off' as const };
    const base = area(buildBrushContour(straightStroke(), markerOff));
    const min = area(
      buildBrushContour(straightStroke(), { ...markerOff, activePenPreset: { minWidth: 60 } as never })
    );
    expect(min).toBeGreaterThan(base * 1.3);
    const max = area(
      buildBrushContour(straightStroke(), { ...markerOff, activePenPreset: { maxWidth: 20 } as never })
    );
    expect(max).toBeLessThan(base * 0.7);
    const noMin = signature(
      buildBrushContour(straightStroke(), { ...markerOff, activePenPreset: { minWidth: 0 } as never })
    );
    expect(noMin).toBe(signature(buildBrushContour(straightStroke(), markerOff)));
    const noMax = signature(
      buildBrushContour(straightStroke(), { ...markerOff, activePenPreset: { maxWidth: 0 } as never })
    );
    expect(noMax).toBe(signature(buildBrushContour(straightStroke(), markerOff)));
  });

  it('inkPooling widens the start and the corner of a stroke', () => {
    const base = buildBrushContour(lStroke(), cfg('marker', { inkPooling: 0 }, 0));
    const unset = buildBrushContour(lStroke(), cfg('marker', {}, 0));
    expect(signature(base)).toBe(signature(unset));
    const pooled = buildBrushContour(lStroke(), cfg('marker', { inkPooling: 100 }, 0));
    expect(signature(pooled)).not.toBe(signature(base));
    expect(area(pooled)).toBeGreaterThan(area(base));
  });

  it('roughnessScale changes the grain of the edge roughness, 50 keeps it', () => {
    const pts = curveStroke();
    const unset = signature(buildBrushContour(pts, cfg('brush', { edgeRoughness: 80 })));
    const scale50 = signature(buildBrushContour(pts, cfg('brush', { edgeRoughness: 80, roughnessScale: 50 })));
    expect(scale50).toBe(unset);
    const coarse = signature(buildBrushContour(pts, cfg('brush', { edgeRoughness: 80, roughnessScale: 100 })));
    expect(coarse).not.toBe(unset);
    const fine = signature(buildBrushContour(pts, cfg('brush', { edgeRoughness: 80, roughnessScale: 0 })));
    expect(fine).not.toBe(unset);
    // Without any roughness there is nothing to scale.
    const plain = signature(buildBrushContour(pts, cfg('brush', { roughnessScale: 100 })));
    expect(plain).toBe(signature(buildBrushContour(pts, cfg('brush', {}))));
  });

  it('brushFlex lags width changes; 0 leaves the stroke unchanged', () => {
    const pts = curveStroke();
    const unset = signature(buildBrushContour(pts, cfg('brush', {})));
    const flex0 = signature(buildBrushContour(pts, cfg('brush', { brushFlex: 0 })));
    expect(flex0).toBe(unset);
    const flexed = signature(buildBrushContour(pts, cfg('brush', { brushFlex: 100 })));
    expect(flexed).not.toBe(unset);
  });

  it('doubleLineGap and dottedSpacing alone do not change the drawing', () => {
    const pts = curveStroke();
    const empty = signature(buildBrushContour(pts, cfg('brush', {})));
    const gaps = signature(
      buildBrushContour(pts, cfg('brush', { doubleLineGap: 100, dottedSpacing: 100 }))
    );
    expect(gaps).toBe(empty);
  });

  it('sharp styles apply taperCurve, minWidth, inkPooling, brushFlex and roughnessScale', () => {
    const pts = curveStroke();
    // The taper curve needs backbone vertices inside the taper zones:
    // a smooth curve is simplified to a few vertices, so a staircase
    // stroke (corners at 0.25 / 0.5 / 0.75 of the length) is used.
    const stairs = staircaseStroke();
    for (const style of ['sharp', 'sharp_round', 'polygon'] as BrushStyle[]) {
      const base = signature(buildBrushContour(pts, cfg(style)));
      const taper = { taperStartLength: 100, taperEndLength: 100, taperStartWidth: 10, taperEndWidth: 10 };
      expect(signature(buildBrushContour(stairs, cfg(style, { ...taper, taperCurve: 'gentle' })))).not.toBe(
        signature(buildBrushContour(stairs, cfg(style, taper)))
      );
      expect(signature(buildBrushContour(pts, cfg(style, { minWidth: 60 })))).not.toBe(base);
      expect(signature(buildBrushContour(pts, cfg(style, { inkPooling: 100 })))).not.toBe(base);
      expect(signature(buildBrushContour(pts, cfg(style, { brushFlex: 100 })))).not.toBe(base);
      expect(
        signature(buildBrushContour(pts, cfg(style, { edgeRoughness: 80, roughnessScale: 100 })))
      ).not.toBe(signature(buildBrushContour(pts, cfg(style, { edgeRoughness: 80 }))));
    }
  });

  it('sharp styles keep their own caps and joints regardless of lineCap and lineJoin', () => {
    const pts = curveStroke();
    for (const style of ['sharp', 'sharp_round', 'polygon'] as BrushStyle[]) {
      const base = signature(buildBrushContour(pts, cfg(style)));
      expect(signature(buildBrushContour(pts, cfg(style, { lineCap: 'square' })))).toBe(base);
      expect(signature(buildBrushContour(pts, cfg(style, { lineCap: 'butt' })))).toBe(base);
      expect(signature(buildBrushContour(pts, cfg(style, { lineJoin: 'round' })))).toBe(base);
      expect(signature(buildBrushContour(pts, cfg(style, { lineJoin: 'bevel' })))).toBe(base);
    }
  });
});
