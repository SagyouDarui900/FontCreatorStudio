import { describe, it, expect } from 'vitest';
import { calculateAutoKernOffset, batchAdjustSidebearings } from './metricsHelper';
import { getContoursBoundingBox } from './path';
import type { GlyphData, PathContour } from '../types';

function makeRect(id: string, minX: number, minY: number, maxX: number, maxY: number): PathContour {
  return {
    id,
    closed: true,
    nodes: [
      { id: `${id}-1`, x: minX, y: minY, handleIn: null, handleOut: null, type: 'corner' },
      { id: `${id}-2`, x: maxX, y: minY, handleIn: null, handleOut: null, type: 'corner' },
      { id: `${id}-3`, x: maxX, y: maxY, handleIn: null, handleOut: null, type: 'corner' },
      { id: `${id}-4`, x: minX, y: maxY, handleIn: null, handleOut: null, type: 'corner' },
    ],
  };
}

function makeGlyph(
  unicode: number,
  char: string,
  contours: PathContour[],
  advanceWidth = 1000,
  lsb = 100,
  locked = false
): GlyphData {
  return {
    unicode,
    char,
    name: `uni${unicode.toString(16).toUpperCase()}`,
    advanceWidth,
    lsb,
    locked,
    contours,
  };
}

describe('calculateAutoKernOffset scanline & UPM accuracy', () => {
  it('measures sparse straight vertical edges accurately against a small middle crossbar', () => {
    // Left glyph 'L-stem' with nodes only at y=100 and y=900 (no intermediate nodes around y=500)
    const left = makeGlyph(0x49, 'I', [makeRect('stem', 100, 100, 450, 900)], 500, 100);
    // Right glyph: small bar positioned only in middle y=420..580 starting at x=200
    // Actual gap at y=420..580 is (500 + 200) - 450 = 250 units.
    // With default targetGap=40, optical gap ~250 -> offset = 40 - 250 = -210.
    const right = makeGlyph(0x4f, 'O', [makeRect('bar', 200, 420, 400, 580)], 500, 200);

    const offset = calculateAutoKernOffset(left, right, undefined, 1000);
    expect(offset).toBe(-210);
  });

  it('samples Bezier curves accurately on round contours', () => {
    // Curved arch on the right side of left glyph bulging out to x=480 at y=500
    // Nodes at x=200, handles pulling X out to 480 at mid-height
    const curvedLeft: PathContour = {
      id: 'curve-left',
      closed: true,
      nodes: [
        { id: 'c1', x: 100, y: 100, handleIn: null, handleOut: null, type: 'corner' },
        {
          id: 'c2',
          x: 200,
          y: 100,
          handleIn: null,
          handleOut: { x: 580, y: 300 },
          type: 'corner',
        },
        {
          id: 'c3',
          x: 200,
          y: 900,
          handleIn: { x: 580, y: 700 },
          handleOut: null,
          type: 'corner',
        },
        { id: 'c4', x: 100, y: 900, handleIn: null, handleOut: null, type: 'corner' },
      ],
    };
    const leftGlyph = makeGlyph(0x44, 'D', [curvedLeft], 600, 100);
    const rightGlyph = makeGlyph(0x49, 'I', [makeRect('r', 100, 420, 250, 580)], 350, 100);

    // At y=500, curve reaches x ≈ 200*(1-0.5)^3 + 3*580*0.25*0.5*2 + ... = 0.25*200 + 0.75*580 = 485!
    // Next glyph starts at 600 + 100 = 700. So gap ≈ 700 - 485 = 215, NOT 700 - 200 = 500!
    // Expected offset ≈ 40 - 215 = -175 (much less aggressive than -350 clamp).
    const offset = calculateAutoKernOffset(leftGlyph, rightGlyph, undefined, 1000);
    expect(offset).toBeGreaterThan(-210);
    expect(offset).toBeLessThan(-140);
  });

  it('scales default targetGap and bounds with unitsPerEm=2048', () => {
    const left = makeGlyph(0x41, 'A', [makeRect('l', 200, 200, 400, 1600)], 2048, 200);
    const right = makeGlyph(0x56, 'V', [makeRect('r', 600, 200, 1400, 1600)], 2048, 600);
    // Huge empty gap (2048+600 - 400 = 2248) hits negative clamp scaled by 2.048: -350 * 2.048 = -717
    const offset = calculateAutoKernOffset(left, right, undefined, 2048);
    expect(offset).toBe(Math.round(-350 * 2.048));
  });
});

describe('batchAdjustSidebearings edge cases', () => {
  it('skips locked glyphs and reports accurate lockedSkippedCount', () => {
    const glyphs: Record<number, GlyphData> = {
      0x3042: makeGlyph(0x3042, 'あ', [makeRect('a', 100, 200, 700, 800)], 1000, 100, false),
      0x3044: makeGlyph(0x3044, 'い', [makeRect('i', 100, 200, 700, 800)], 1000, 100, true),
    };

    const res = batchAdjustSidebearings(glyphs, {
      scope: 'all',
      mode: 'center',
      unitsPerEm: 1000,
    });

    expect(res.modifiedCount).toBe(1);
    expect(res.lockedSkippedCount).toBe(1);
    expect(res.updatedGlyphs[0x3042].lsb).toBe(200); // shifted right by +100 to center
    expect(res.updatedGlyphs[0x3044]).toBe(glyphs[0x3044]); // untouched locked reference
  });

  it('recomputes lsb from shifted bbox in offset-lsb and treats delta=0 as no-op', () => {
    const glyphs: Record<number, GlyphData> = {
      // Stale lsb=10 while contour minX=150
      0x3042: makeGlyph(0x3042, 'あ', [makeRect('a', 150, 200, 750, 800)], 1000, 10),
    };

    const noop = batchAdjustSidebearings(glyphs, {
      scope: 'all',
      mode: 'offset-lsb',
      offsetDelta: 0,
      unitsPerEm: 1000,
    });
    expect(noop.modifiedCount).toBe(0);
    expect(noop.updatedGlyphs[0x3042]).toBe(glyphs[0x3042]);

    const shifted = batchAdjustSidebearings(glyphs, {
      scope: 'all',
      mode: 'offset-lsb',
      offsetDelta: -50,
      unitsPerEm: 1000,
    });
    expect(shifted.modifiedCount).toBe(1);
    expect(getContoursBoundingBox(shifted.updatedGlyphs[0x3042].contours).minX).toBe(100);
    expect(shifted.updatedGlyphs[0x3042].lsb).toBe(100);
  });

  it('clamps advanceWidth >= 1 in offset-rsb, proportional, and uniform-advance', () => {
    const glyphs: Record<number, GlyphData> = {
      0x41: makeGlyph(0x41, 'A', [makeRect('a', 10, 100, 20, 800)], 50, 10),
    };

    const rsbRes = batchAdjustSidebearings(glyphs, {
      scope: 'all',
      mode: 'offset-rsb',
      offsetDelta: -500,
    });
    expect(rsbRes.updatedGlyphs[0x41].advanceWidth).toBe(1);

    const propRes = batchAdjustSidebearings(glyphs, {
      scope: 'all',
      mode: 'proportional',
      lsb: -50,
      rsb: -50,
    });
    expect(propRes.updatedGlyphs[0x41].advanceWidth).toBe(1);

    const uniformRes = batchAdjustSidebearings(glyphs, {
      scope: 'all',
      mode: 'uniform-advance',
      targetAdvance: 0,
    });
    expect(uniformRes.updatedGlyphs[0x41].advanceWidth).toBe(1);
  });

  it('respects unitsPerEm=2048 in smart-auto fullwidth centering', () => {
    const glyphs: Record<number, GlyphData> = {
      0x3042: makeGlyph(0x3042, 'あ', [makeRect('a', 100, 200, 900, 1400)], 1000, 100),
    };
    const res = batchAdjustSidebearings(glyphs, {
      scope: 'all',
      mode: 'smart-auto',
      unitsPerEm: 2048,
    });
    expect(res.modifiedCount).toBe(1);
    expect(res.updatedGlyphs[0x3042].advanceWidth).toBe(2048);
    expect(res.updatedGlyphs[0x3042].lsb).toBe(624);
  });
});
