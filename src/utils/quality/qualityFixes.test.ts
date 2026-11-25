import { describe, it, expect } from 'vitest';
import { FontProject, GlyphData, PathContour } from '../../types';
import { simplifyContourClusterInGlyph } from './densityAnalyzer';
import { batchOptimizeProjectNodes } from './nodeOptimizer';
import { batchOptimizeProjectExtrema } from './extremaOptimizer';
import { batchResolveProjectIntersections } from './intersectionResolver';

function makeGlyph(unicode: number, char: string, contours: PathContour[]): GlyphData {
  return {
    unicode,
    char,
    name: `uni${unicode.toString(16).toUpperCase()}`,
    advanceWidth: 1000,
    lsb: 100,
    contours,
  };
}

function makeProject(glyphs: GlyphData[]): FontProject {
  const map: Record<number, GlyphData> = {};
  for (const g of glyphs) map[g.unicode] = g;
  return {
    id: 'quality-test',
    name: 'QualityTest',
    metadata: {
      familyName: 'QualityTest',
      styleName: 'Regular',
      designer: '',
      copyright: '',
      version: '1.000',
      unitsPerEm: 1000,
      ascender: 800,
      descender: -200,
      lineGap: 0,
      capHeight: 700,
      xHeight: 500,
    },
    glyphs: map,
    kerning: {},
    createdAt: 1,
    updatedAt: 1,
  } as unknown as FontProject;
}

function rectContour(id: string, x1: number, y1: number, x2: number, y2: number): PathContour {
  return {
    id,
    closed: true,
    nodes: [
      { id: `${id}-n1`, x: x1, y: y1, type: 'corner' },
      { id: `${id}-n2`, x: x2, y: y1, type: 'corner' },
      { id: `${id}-n3`, x: x2, y: y2, type: 'corner' },
      { id: `${id}-n4`, x: x1, y: y2, type: 'corner' },
    ],
  };
}

/** 上辺だけが細かく分割された矩形。中心ノードは x=200 のノード。 */
function denseTopEdgeContour(): PathContour {
  const nodes = [];
  for (let x = 100; x <= 500; x += 25) {
    nodes.push({ id: `top-${x}`, x, y: 100, type: 'corner' as const });
  }
  nodes.push({ id: 'br', x: 500, y: 500, type: 'corner' as const });
  nodes.push({ id: 'bl', x: 100, y: 500, type: 'corner' as const });
  return { id: 'dense-rect', closed: true, nodes };
}

describe('simplifyContourClusterInGlyph (Q-L1)', () => {
  it('simplifies only nodes within radius of the center node', () => {
    const contour = denseTopEdgeContour();
    // 中心ノードは x=200 (index 4)。radius 60 の範囲は x=150..250 の5ノード。
    const result = simplifyContourClusterInGlyph([contour], 0, 4, 60, 4.0);

    expect(result.reducedCount).toBeGreaterThan(0);
    expect(result.simplifiedContourIndices).toEqual([0]);
    const out = result.updatedContours[0];
    const points = out.nodes.map((n) => `${n.x},${n.y}`);
    // 範囲外のノードは座標も個数も変わらない。
    for (const x of [100, 125, 275, 300, 325, 350, 375, 400, 425, 450, 475, 500]) {
      expect(points).toContain(`${x},100`);
    }
    expect(points).toContain('500,500');
    expect(points).toContain('100,500');
    // 範囲内の両端は元の位置に固定される。
    expect(points).toContain('150,100');
    expect(points).toContain('250,100');
    // 削減は範囲内だけのはずで、全体の削減数は範囲内の削減数と一致する。
    expect(result.beforeNodeCount - result.afterNodeCount).toBe(result.reducedCount);
  });

  it('does nothing for an out-of-range node index', () => {
    const contour = denseTopEdgeContour();
    const result = simplifyContourClusterInGlyph([contour], 0, 99, 60, 4.0);
    expect(result.reducedCount).toBe(0);
    expect(result.updatedContours[0]).toBe(contour);
    expect(result.updatedContours[0].nodes).toHaveLength(contour.nodes.length);
  });

  it('does nothing when the window has too few nodes to simplify', () => {
    const contour = rectContour('r', 100, 100, 500, 500);
    const result = simplifyContourClusterInGlyph([contour], 0, 0, 10, 4.0);
    expect(result.reducedCount).toBe(0);
  });
});

describe('batch optimizers set GlyphData.modified only when changed (Q-L2)', () => {
  it('batchOptimizeProjectNodes sets modified only on changed glyphs', () => {
    const project = makeProject([
      makeGlyph(0x3042, 'あ', [denseTopEdgeContour()]),
      makeGlyph(0x3044, 'い', [rectContour('tri', 100, 100, 500, 500)]),
    ]);
    const res = batchOptimizeProjectNodes(project);
    expect(res.totalReducedNodes).toBeGreaterThan(0);
    expect(res.updatedProject.glyphs[0x3042].modified).toBe(true);
    expect(res.updatedProject.glyphs[0x3044].modified).toBeFalsy();
  });

  it('batchOptimizeProjectExtrema sets modified only on changed glyphs', () => {
    // 上向きに膨らむベジェ曲線。内側の y 極値にノードが無い。
    const arch: PathContour = {
      id: 'arch',
      closed: true,
      nodes: [
        { id: 'a1', x: 100, y: 500, type: 'corner', handleOut: { x: 100, y: 100 } },
        { id: 'a2', x: 500, y: 500, type: 'corner', handleIn: { x: 500, y: 100 } },
      ],
    };
    const project = makeProject([
      makeGlyph(0x3042, 'あ', [arch]),
      makeGlyph(0x3044, 'い', [rectContour('tri', 100, 100, 500, 500)]),
    ]);
    const res = batchOptimizeProjectExtrema(project, undefined, {
      alignHandlesToAxis: true,
      minDistanceThreshold: 5,
      minParameterThreshold: 0.03,
    });
    expect(res.totalNodesAdded).toBeGreaterThan(0);
    expect(res.updatedProject.glyphs[0x3042].modified).toBe(true);
    expect(res.updatedProject.glyphs[0x3044].modified).toBeFalsy();
  });

  it('batchResolveProjectIntersections sets modified only on changed glyphs', () => {
    const overlapping = makeGlyph(0x3042, 'あ', [
      rectContour('r1', 100, 100, 400, 400),
      rectContour('r2', 300, 300, 600, 600),
    ]);
    const separate = makeGlyph(0x3044, 'い', [rectContour('r3', 100, 100, 400, 400)]);
    const project = makeProject([overlapping, separate]);
    const res = batchResolveProjectIntersections(project);
    expect(res.resolvedGlyphsCount).toBe(1);
    expect(res.updatedProject.glyphs[0x3042].modified).toBe(true);
    expect(res.updatedProject.glyphs[0x3044].modified).toBeFalsy();
  });
});
