import { describe, it, expect } from 'vitest';
import { checkFontQuality } from './checker';
import { FontProject, GlyphData, PathContour } from '../../types';

function makeProject(
  glyphs: Record<number, GlyphData>,
  metadataOverrides: Partial<FontProject['metadata']> = {}
): FontProject {
  return {
    id: 'test-project',
    name: 'Test Project',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    metadata: {
      familyName: 'TestFont',
      styleName: 'Regular',
      designer: 'Tester',
      copyright: 'Copyright 2026',
      version: '1.0',
      unitsPerEm: 1000,
      ascender: 800,
      descender: -200,
      lineGap: 100,
      capHeight: 700,
      xHeight: 500,
      ...metadataOverrides,
    },
    glyphs,
  };
}

function rectContour(id: string, x0: number, y0: number, x1: number, y1: number): PathContour {
  const node = (nid: string, x: number, y: number) => ({ id: nid, x, y, type: 'corner' as const });
  return {
    id,
    closed: true,
    nodes: [node(`${id}-0`, x0, y0), node(`${id}-1`, x1, y0), node(`${id}-2`, x1, y1), node(`${id}-3`, x0, y1)],
  };
}

function makeGlyph(unicode: number, char: string, contours: PathContour[]): GlyphData {
  return {
    unicode,
    char,
    name: `uni${unicode.toString(16).toUpperCase()}`,
    advanceWidth: 1000,
    lsb: 0,
    contours,
  };
}

function baselineIssues(project: FontProject) {
  return checkFontQuality(project).issues.filter((i) => i.type === 'baseline_deviation');
}

describe('Q-M1 template literal in recommendations', () => {
  it('expands ${baselineY} in the descender recommendation', () => {
    // 'g' with maxY 700 (< 760): descender float issue
    const project = makeProject({ 0x67: makeGlyph(0x67, 'g', [rectContour('c1', 100, 100, 300, 700)]) });
    const issues = baselineIssues(project);
    const issue = issues.find((i) => i.id === 'base-desc-float-103');
    expect(issue).toBeDefined();
    expect(issue!.recommendation).toContain('Y=800');
    expect(issue!.recommendation).not.toContain('${baselineY}');
  });

  it('expands ${baselineY} in the latin float recommendation', () => {
    // 'A' with maxY 600 (< 680): latin float issue
    const project = makeProject({ 0x41: makeGlyph(0x41, 'A', [rectContour('c1', 100, 100, 300, 600)]) });
    const issues = baselineIssues(project);
    const issue = issues.find((i) => i.id === 'base-latin-float-65');
    expect(issue).toBeDefined();
    expect(issue!.recommendation).toContain('Y=800');
    expect(issue!.recommendation).not.toContain('${baselineY}');
  });
});

describe('Q-M2 UPM-scaled baseline thresholds', () => {
  it('gives identical baseline results for UPM 1000 and geometrically doubled UPM 2000 glyphs', () => {
    const p1000 = makeProject(
      { 0x6f22: makeGlyph(0x6f22, '漢', [rectContour('c1', 100, 100, 900, 650)]) },
      { unitsPerEm: 1000, ascender: 800, descender: -200 }
    );
    const p2000 = makeProject(
      { 0x6f22: makeGlyph(0x6f22, '漢', [rectContour('c1', 200, 200, 1800, 1300)]) },
      { unitsPerEm: 2000, ascender: 1600, descender: -400 }
    );
    const ids1000 = baselineIssues(p1000).map((i) => i.id);
    const ids2000 = baselineIssues(p2000).map((i) => i.id);
    expect(ids1000).toEqual(['base-float-28450']);
    expect(ids2000).toEqual(ids1000);
  });

  it('does not flag a UPM 2000 glyph at 75% em as dropped (old fixed 920 threshold would)', () => {
    const project = makeProject(
      { 0x6f22: makeGlyph(0x6f22, '漢', [rectContour('c1', 200, 200, 1800, 1500)]) },
      { unitsPerEm: 2000, ascender: 1600, descender: -400 }
    );
    expect(baselineIssues(project)).toEqual([]);
  });

  it('scales the bottom-overflow threshold and deviation to UPM', () => {
    const p2000 = makeProject(
      { 0x6f22: makeGlyph(0x6f22, '漢', [rectContour('c1', 200, 200, 1800, 2100)]) },
      { unitsPerEm: 2000, ascender: 1600, descender: -400 }
    );
    const issue = baselineIssues(p2000).find((i) => i.id === 'bound-btm-28450');
    expect(issue).toBeDefined();
    expect(issue!.details?.deviationPx).toBe(100);
    expect(issue!.details?.targetBaselineY).toBe(1600);
  });

  it('scales the top-overflow threshold to UPM', () => {
    const p2000 = makeProject(
      { 0x6f22: makeGlyph(0x6f22, '漢', [rectContour('c1', 200, -100, 1800, 1500)]) },
      { unitsPerEm: 2000, ascender: 1600, descender: -400 }
    );
    expect(baselineIssues(p2000).some((i) => i.id === 'bound-top-28450')).toBe(true);
    const p1000 = makeProject(
      { 0x6f22: makeGlyph(0x6f22, '漢', [rectContour('c1', 100, -50, 900, 750)]) },
      { unitsPerEm: 1000, ascender: 800, descender: -200 }
    );
    expect(baselineIssues(p1000).some((i) => i.id === 'bound-top-28450')).toBe(true);
  });

  it('scales the descender target baseline to UPM', () => {
    const project = makeProject(
      { 0x67: makeGlyph(0x67, 'g', [rectContour('c1', 200, 200, 600, 1400)]) },
      { unitsPerEm: 2000, ascender: 1600, descender: -400 }
    );
    const issue = baselineIssues(project).find((i) => i.id === 'base-desc-float-103');
    expect(issue).toBeDefined();
    expect(issue!.details?.targetBaselineY).toBe(1840);
  });
});

describe('Q-M3 pixel-only glyphs in quality checks', () => {
  it('checks a pixel-only glyph instead of skipping it', () => {
    // 8x8 grid, only the top two rows filled: converted outline floats
    // (maxY well above the baseline), so a fullwidth float issue is expected.
    const data = new Array(64).fill(0);
    for (let i = 0; i < 16; i++) data[i] = 1;
    const glyph: GlyphData = {
      unicode: 0x3042,
      char: 'あ',
      name: 'uni3042',
      advanceWidth: 1000,
      lsb: 0,
      contours: [],
      pixelData: { width: 8, height: 8, data },
    };
    const project = makeProject({ 0x3042: glyph });
    const issues = baselineIssues(project);
    expect(issues.some((i) => i.id === 'base-float-12354')).toBe(true);
  });

  it('skips a pixel glyph with no filled pixels', () => {
    const glyph: GlyphData = {
      unicode: 0x3042,
      char: 'あ',
      name: 'uni3042',
      advanceWidth: 1000,
      lsb: 0,
      contours: [],
      pixelData: { width: 8, height: 8, data: new Array(64).fill(0) },
    };
    const project = makeProject({ 0x3042: glyph });
    expect(checkFontQuality(project).issues).toEqual([]);
  });
});

describe('Q-L3 duplicate detection with full signature', () => {
  function polyContour(id: string, points: Array<[number, number]>): PathContour {
    return {
      id,
      closed: true,
      nodes: points.map(([x, y], i) => ({ id: `${id}-${i}`, x, y, type: 'corner' as const })),
    };
  }

  it('does not flag glyphs that share only their first 8 points', () => {
    // Same bbox (0..900 x 0..900), same contour/node counts, first 8 points
    // identical, 9th point differs. The old first-8-points signature collided.
    const shared: Array<[number, number]> = [
      [100, 100], [300, 100], [500, 100], [700, 100],
      [900, 100], [900, 300], [900, 500], [900, 700],
    ];
    const g1 = makeGlyph(0x41, 'A', [
      polyContour('c1', [...shared, [500, 900], [100, 900]]),
    ]);
    const g2 = makeGlyph(0x42, 'B', [
      polyContour('c1', [...shared, [650, 900], [100, 900]]),
    ]);
    const project = makeProject({ 0x41: g1, 0x42: g2 });
    const dups = checkFontQuality(project).issues.filter((i) => i.type === 'duplicate_shape');
    expect(dups).toEqual([]);
  });

  it('still flags glyphs with exactly identical shapes', () => {
    const contours = [rectContour('c1', 100, 100, 900, 800)];
    const g1 = makeGlyph(0x41, 'A', contours);
    const g2 = makeGlyph(0x42, 'B', [rectContour('c1', 100, 100, 900, 800)]);
    const project = makeProject({ 0x41: g1, 0x42: g2 });
    const dups = checkFontQuality(project).issues.filter((i) => i.type === 'duplicate_shape');
    expect(dups.length).toBe(1);
    expect(dups[0].details?.duplicateWithUnicode).toBe(0x42);
  });

  it('does not flag glyphs that differ only in a bezier handle', () => {
    const withHandle = (hoX: number): PathContour => ({
      id: 'c1',
      closed: true,
      nodes: [
        { id: 'n0', x: 100, y: 100, type: 'smooth', handleOut: { x: hoX, y: 100 } },
        { id: 'n1', x: 900, y: 100, type: 'corner' },
        { id: 'n2', x: 900, y: 800, type: 'corner' },
        { id: 'n3', x: 100, y: 800, type: 'corner' },
      ],
    });
    const g1 = makeGlyph(0x41, 'A', [withHandle(300)]);
    const g2 = makeGlyph(0x42, 'B', [withHandle(600)]);
    const project = makeProject({ 0x41: g1, 0x42: g2 });
    const dups = checkFontQuality(project).issues.filter((i) => i.type === 'duplicate_shape');
    expect(dups).toEqual([]);
  });
});
