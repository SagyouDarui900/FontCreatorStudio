// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import {
  parseSvgStringToContours,
  parseSvgPathData,
  parseSvgTransform,
  SVG_MAX_CONTOURS,
} from './svgParser';
import { getContoursBoundingBox } from './path/bounds';

const wrap = (inner: string, attrs = 'viewBox="0 0 1000 1000"') =>
  `<svg xmlns="http://www.w3.org/2000/svg" ${attrs}>${inner}</svg>`;

describe('parseSvgPathData (S-B1: S / T reflection)', () => {
  it('S after C reflects, S after L does not reflect', () => {
    const contours = parseSvgPathData('M0 0 C10 0 20 10 30 0 S50 10 60 0 L70 0 S90 10 100 0');
    expect(contours).toHaveLength(1);
    const nodes = contours[0].nodes;
    expect(nodes.map((n) => [n.x, n.y])).toEqual([
      [0, 0],
      [30, 0],
      [60, 0],
      [70, 0],
      [100, 0],
    ]);
    // S after C: cp1 reflected from (20, 10) around (30, 0) -> (40, -10)
    expect(nodes[1].handleOut).toEqual({ x: 40, y: -10 });
    // S after L: cp1 is the current point (70, 0), not a reflection
    expect(nodes[3].handleOut).toEqual({ x: 70, y: 0 });
  });

  it('T after Q reflects, T after L does not reflect', () => {
    const contours = parseSvgPathData('M0 0 Q10 20 20 0 T40 0 L50 0 T70 0');
    expect(contours).toHaveLength(1);
    const nodes = contours[0].nodes;
    expect(nodes.map((n) => [n.x, n.y])).toEqual([
      [0, 0],
      [20, 0],
      [40, 0],
      [50, 0],
      [70, 0],
    ]);
    // T after Q: reflected control point (30, -20) elevated to cubic,
    // cp1 = (20, 0) + (2/3) * ((30, -20) - (20, 0))
    expect(nodes[1].handleOut?.x).toBeCloseTo(26.67, 2);
    expect(nodes[1].handleOut?.y).toBeCloseTo(-13.33, 2);
    // T after L: control point is the current point (50, 0)
    expect(nodes[3].handleOut).toEqual({ x: 50, y: 0 });
  });
});

describe('parseSvgPathData (S-B2: arc flags without separators)', () => {
  it('reads large-arc and sweep flags one character at a time', () => {
    const contours = parseSvgPathData('M100 100 A30 50 0 01162.55 162.45');
    expect(contours).toHaveLength(1);
    const nodes = contours[0].nodes;
    expect(nodes.length).toBeGreaterThan(1);
    const last = nodes[nodes.length - 1];
    expect(last.x).toBeCloseTo(162.55, 2);
    expect(last.y).toBeCloseTo(162.45, 2);
  });
});

describe('parseSvgTransform (S-A3 / S-A4: matrix composition)', () => {
  it('applies translate then scale as scale-first per the SVG spec', () => {
    const m = parseSvgTransform('translate(100,0) scale(2)');
    expect(m).toEqual([2, 0, 0, 2, 100, 0]);
  });

  it('supports rotate, matrix, skewX and skewY', () => {
    const rot = parseSvgTransform('rotate(90)');
    expect(rot).not.toBeNull();
    expect(rot![0]).toBeCloseTo(0, 10);
    expect(rot![1]).toBeCloseTo(1, 10);
    expect(rot![2]).toBeCloseTo(-1, 10);
    expect(rot![3]).toBeCloseTo(0, 10);
    expect(parseSvgTransform('matrix(2,0,0,2,5,5)')).toEqual([2, 0, 0, 2, 5, 5]);
    const skewX = parseSvgTransform('skewX(45)');
    expect(skewX).not.toBeNull();
    expect(skewX![2]).toBeCloseTo(1, 10);
    const skewY = parseSvgTransform('skewY(45)');
    expect(skewY).not.toBeNull();
    expect(skewY![1]).toBeCloseTo(1, 10);
  });
});

describe('parseSvgStringToContours transforms (S-A2 / S-A3 / S-A4)', () => {
  it('applies ancestor g transforms to children', () => {
    const res = parseSvgStringToContours(
      wrap('<g transform="translate(10,20)"><g transform="scale(2)"><path d="M0 0 L10 0"/></g></g>'),
      false
    );
    expect(res.contours).toHaveLength(1);
    expect(res.contours[0].nodes.map((n) => [n.x, n.y])).toEqual([
      [10, 20],
      [30, 20],
    ]);
  });

  it('applies the svg element transform', () => {
    const res = parseSvgStringToContours(
      `<svg xmlns="http://www.w3.org/2000/svg" transform="translate(5,5)"><path d="M0 0 L10 0"/></svg>`,
      false
    );
    expect(res.contours).toHaveLength(1);
    expect(res.contours[0].nodes.map((n) => [n.x, n.y])).toEqual([
      [5, 5],
      [15, 5],
    ]);
  });

  it('translate + scale applies scale first', () => {
    const res = parseSvgStringToContours(
      wrap('<path d="M10 0 L20 0" transform="translate(100,0) scale(2)"/>'),
      false
    );
    expect(res.contours[0].nodes.map((n) => [n.x, n.y])).toEqual([
      [120, 0],
      [140, 0],
    ]);
  });

  it('rotate, matrix and skew transform points', () => {
    const rot = parseSvgStringToContours(
      wrap('<path d="M10 0 L10 10" transform="rotate(90)"/>'),
      false
    );
    expect(rot.contours[0].nodes.map((n) => [Math.round(n.x), Math.round(n.y)])).toEqual([
      [0, 10],
      [-10, 10],
    ]);
    const mat = parseSvgStringToContours(
      wrap('<path d="M10 10 L20 10" transform="matrix(2,0,0,2,5,5)"/>'),
      false
    );
    expect(mat.contours[0].nodes.map((n) => [n.x, n.y])).toEqual([
      [25, 25],
      [45, 25],
    ]);
    const skew = parseSvgStringToContours(
      wrap('<path d="M10 10 L20 10" transform="skewX(45)"/>'),
      false
    );
    expect(skew.contours[0].nodes.map((n) => [Math.round(n.x), Math.round(n.y)])).toEqual([
      [20, 10],
      [30, 10],
    ]);
  });
});

describe('parseSvgStringToContours fill / defs / use (S-A5 / S-A6)', () => {
  it('excludes stroke-only paths with a warning, and invisible paths', () => {
    const strokeOnly = parseSvgStringToContours(
      wrap('<path d="M0 0 L10 0 L10 10 Z" fill="none" stroke="black" stroke-width="2"/>'),
      false
    );
    expect(strokeOnly.contours).toHaveLength(0);
    expect(strokeOnly.warnings.join(' ')).toContain('fill="none"');
    const invisible = parseSvgStringToContours(
      wrap('<path d="M0 0 L10 0 L10 10 Z" fill="none"/>'),
      false
    );
    expect(invisible.contours).toHaveLength(0);
    const filled = parseSvgStringToContours(
      wrap('<path d="M0 0 L10 0 L10 10 Z" fill="red"/>'),
      false
    );
    expect(filled.contours).toHaveLength(1);
  });

  it('skips defs content unless referenced by use', () => {
    const defsOnly = parseSvgStringToContours(
      wrap('<defs><path id="p1" d="M0 0 L10 0 L10 10 Z"/></defs>'),
      false
    );
    expect(defsOnly.contours).toHaveLength(0);
    const used = parseSvgStringToContours(
      wrap('<defs><path id="p1" d="M0 0 L10 0 L10 10 Z"/></defs><use href="#p1" x="5" y="7"/>'),
      false
    );
    expect(used.contours).toHaveLength(1);
    expect(used.contours[0].nodes.map((n) => [n.x, n.y])).toEqual([
      [5, 7],
      [15, 7],
      [15, 17],
    ]);
  });

  it('warns when a use reference cannot be resolved', () => {
    const res = parseSvgStringToContours(wrap('<use href="#missing"/>'), false);
    expect(res.contours).toHaveLength(0);
    expect(res.warnings.join(' ')).toContain('#missing');
  });
});

describe('parseSvgStringToContours fit (S-B5 / S-C2)', () => {
  it('centers contours in the EM box by default', () => {
    const res = parseSvgStringToContours(
      wrap('<rect x="0" y="0" width="100" height="100"/>'),
      true
    );
    const bbox = getContoursBoundingBox(res.contours);
    expect(bbox.minX).toBe(80);
    expect(bbox.minY).toBe(80);
    expect(bbox.width).toBe(840);
    expect(bbox.height).toBe(840);
  });

  it('baseline mode aligns the bottom edge to y=800', () => {
    const res = parseSvgStringToContours(
      wrap('<rect x="0" y="100" width="100" height="200"/>'),
      true,
      { fitMode: 'baseline' }
    );
    const bbox = getContoursBoundingBox(res.contours);
    expect(bbox.maxY).toBe(800);
    expect(bbox.minX).toBe(290);
  });

  it('viewbox mode maps the viewBox rect into the EM box', () => {
    const res = parseSvgStringToContours(
      wrap('<rect x="50" y="50" width="10" height="10"/>', 'viewBox="0 0 100 100"'),
      true,
      { fitMode: 'viewbox' }
    );
    const bbox = getContoursBoundingBox(res.contours);
    expect(bbox.minX).toBe(500);
    expect(bbox.minY).toBe(500);
    expect(bbox.width).toBe(84);
    expect(bbox.height).toBe(84);
  });

  it('viewbox mode keeps the viewBox origin', () => {
    const res = parseSvgStringToContours(
      wrap('<rect x="100" y="100" width="200" height="200"/>', 'viewBox="100 100 200 200"'),
      true,
      { fitMode: 'viewbox' }
    );
    const bbox = getContoursBoundingBox(res.contours);
    expect(bbox.minX).toBe(80);
    expect(bbox.minY).toBe(80);
    expect(bbox.width).toBe(840);
    expect(bbox.height).toBe(840);
  });

  it('zero-width bbox fits height only and notifies', () => {
    const res = parseSvgStringToContours(wrap('<path d="M100 100 L100 500"/>'), true);
    expect(res.contours).toHaveLength(1);
    const nodes = res.contours[0].nodes;
    expect(nodes.every((n) => n.x === 500)).toBe(true);
    expect(nodes[0].y).toBe(80);
    expect(nodes[1].y).toBe(920);
    expect(res.warnings.join(' ')).toContain('幅が 0');
  });
});

describe('parseSvgStringToContours degenerate contours and Z merge (S-B9 / S-B11)', () => {
  it('drops single-node contours from consecutive M commands', () => {
    const res = parseSvgStringToContours(wrap('<path d="M10 10 M20 20 L30 30"/>'), false);
    expect(res.contours).toHaveLength(1);
    expect(res.contours[0].nodes.map((n) => [n.x, n.y])).toEqual([
      [20, 20],
      [30, 30],
    ]);
  });

  it('starts a path without M at its first coordinate, not at the origin', () => {
    const res = parseSvgStringToContours(wrap('<path d="L10 10 L20 20"/>'), false);
    expect(res.contours).toHaveLength(1);
    expect(res.contours[0].nodes.map((n) => [n.x, n.y])).toEqual([
      [10, 10],
      [20, 20],
    ]);
    expect(res.warnings.join(' ')).toContain('Mコマンドなし');
  });

  it('merges Z endpoints using fitted units', () => {
    // Last point is 5 units from the start before fitting (> 2), but only
    // 0.42 units after fitting to the EM box (< 2), so it must merge.
    const res = parseSvgStringToContours(
      wrap('<path d="M0 0 L10000 0 L10000 10000 L5 0 Z"/>'),
      true
    );
    expect(res.contours).toHaveLength(1);
    expect(res.contours[0].closed).toBe(true);
    expect(res.contours[0].nodes).toHaveLength(3);
  });
});

describe('parseSvgStringToContours limits and validation (S-B3 / S-C3)', () => {
  it('caps contours at 1000 and reports the dropped count', () => {
    const rects = Array.from(
      { length: SVG_MAX_CONTOURS + 1 },
      (_, i) => `<rect x="${i}" y="0" width="1" height="1"/>`
    ).join('');
    const res = parseSvgStringToContours(wrap(rects), false);
    expect(res.contours).toHaveLength(SVG_MAX_CONTOURS);
    expect(res.rawPathCount).toBe(SVG_MAX_CONTOURS + 1);
    expect(res.truncatedContourCount).toBe(1);
    expect(res.warnings.join(' ')).toContain('上限');
  });

  it('rejects non-finite path coordinates', () => {
    expect(() =>
      parseSvgStringToContours(wrap('<path d="M0 0 L1e999 0"/>'), false)
    ).toThrow(/非有限/);
  });

  it('excludes shapes with non-finite attributes', () => {
    const res = parseSvgStringToContours(
      wrap('<rect x="0" y="0" width="1e999" height="10"/>'),
      false
    );
    expect(res.contours).toHaveLength(0);
    expect(res.warnings.join(' ')).toContain('rect');
  });
});

describe('parseSvgStringToContours document handling (S-C1)', () => {
  it('parses SVG with a DOCTYPE declaration', () => {
    const res = parseSvgStringToContours(
      '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">' +
        wrap('<path d="M10 10 L90 10 L90 90 Z"/>'),
      false
    );
    expect(res.contours).toHaveLength(1);
  });

  it('throws on malformed XML', () => {
    expect(() => parseSvgStringToContours('<svg><path d="M0 0"></svg>', false)).toThrow();
  });
});
