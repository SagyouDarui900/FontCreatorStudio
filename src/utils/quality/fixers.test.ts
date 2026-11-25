import { describe, it, expect } from 'vitest';
import { fixQualityIssue } from './fixers';
import { FontProject, GlyphData, PathContour } from '../../types';
import { QualityIssue } from './types';

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

function makeIssue(overrides: Partial<QualityIssue>): QualityIssue {
  return {
    id: 'base-float-28450',
    unicode: 0x6f22,
    char: '漢',
    glyphName: 'uni6F22',
    type: 'baseline_deviation',
    severity: 'warning',
    title: '文字がベースラインから浮いています',
    description: 'test',
    canAutoFix: true,
    autoFixType: 'align_baseline',
    ...overrides,
  };
}

function bboxYs(contours: PathContour[]) {
  const ys = contours.flatMap((c) => c.nodes.map((n) => n.y));
  return { minY: Math.min(...ys), maxY: Math.max(...ys) };
}

describe('Q-M2 align_baseline with UPM scaling', () => {
  it('moves a UPM 1000 glyph to the 800 baseline (unchanged behavior)', () => {
    const project = makeProject({
      0x6f22: {
        unicode: 0x6f22, char: '漢', name: 'uni6F22', advanceWidth: 1000, lsb: 0,
        contours: [rectContour('c1', 100, 100, 900, 650)],
      },
    });
    const issue = makeIssue({ details: { targetBaselineY: 800, deviationType: 'floating' } });
    const res = fixQualityIssue(project, issue);
    expect(res.success).toBe(true);
    expect(bboxYs(res.updatedProject.glyphs[0x6f22].contours)).toEqual({ minY: 250, maxY: 800 });
  });

  it('moves a UPM 2000 glyph to the 1600 baseline', () => {
    const project = makeProject(
      {
        0x6f22: {
          unicode: 0x6f22, char: '漢', name: 'uni6F22', advanceWidth: 2000, lsb: 0,
          contours: [rectContour('c1', 200, 200, 1800, 1300)],
        },
      },
      { unitsPerEm: 2000, ascender: 1600, descender: -400 }
    );
    const issue = makeIssue({ details: { targetBaselineY: 1600, deviationType: 'floating' } });
    const res = fixQualityIssue(project, issue);
    expect(res.success).toBe(true);
    expect(bboxYs(res.updatedProject.glyphs[0x6f22].contours)).toEqual({ minY: 500, maxY: 1600 });
  });

  it('falls back to the UPM-scaled baseline when the issue has no target', () => {
    const project = makeProject(
      {
        0x6f22: {
          unicode: 0x6f22, char: '漢', name: 'uni6F22', advanceWidth: 2000, lsb: 0,
          contours: [rectContour('c1', 200, 200, 1800, 1300)],
        },
      },
      { unitsPerEm: 2000, ascender: 1600, descender: -400 }
    );
    const issue = makeIssue({ details: undefined });
    const res = fixQualityIssue(project, issue);
    expect(res.success).toBe(true);
    expect(bboxYs(res.updatedProject.glyphs[0x6f22].contours)).toEqual({ minY: 500, maxY: 1600 });
  });

  it('clamps overflow_bottom to 96% of UPM', () => {
    const project = makeProject(
      {
        0x6f22: {
          unicode: 0x6f22, char: '漢', name: 'uni6F22', advanceWidth: 2000, lsb: 0,
          contours: [rectContour('c1', 200, 200, 1800, 2100)],
        },
      },
      { unitsPerEm: 2000, ascender: 1600, descender: -400 }
    );
    const issue = makeIssue({ details: { targetBaselineY: 1600, deviationType: 'overflow_bottom' } });
    const res = fixQualityIssue(project, issue);
    expect(res.success).toBe(true);
    // delta would be -180 (maxY to 1920), but that pushes minY to 20 < 60,
    // so the top clamp takes precedence: delta -140, minY 60, maxY 1960.
    // This matches the pre-existing UPM 1000 logic, scaled by 2.
    expect(bboxYs(res.updatedProject.glyphs[0x6f22].contours)).toEqual({ minY: 60, maxY: 1960 });
  });

  it('clamps overflow_top to 3% / 97% of UPM', () => {
    const project = makeProject(
      {
        0x6f22: {
          unicode: 0x6f22, char: '漢', name: 'uni6F22', advanceWidth: 2000, lsb: 0,
          contours: [rectContour('c1', 200, -100, 1800, 1800)],
        },
      },
      { unitsPerEm: 2000, ascender: 1600, descender: -400 }
    );
    const issue = makeIssue({ details: { targetBaselineY: 1600, deviationType: 'overflow_top' } });
    const res = fixQualityIssue(project, issue);
    expect(res.success).toBe(true);
    // delta would be 160 (top to 60), but that pushes maxY to 1960 > 1940,
    // so it is clamped to 140: minY 40, maxY 1940.
    expect(bboxYs(res.updatedProject.glyphs[0x6f22].contours)).toEqual({ minY: 40, maxY: 1940 });
  });
});
