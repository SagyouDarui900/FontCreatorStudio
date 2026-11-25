import { describe, expect, it } from 'vitest';
import { deriveProjectPaltMetrics, deriveProjectVpalMetrics } from './metrics';
import { FontProject, PathContour } from '../../types';

function makeProject(glyphs: FontProject['glyphs']): FontProject {
  return {
    id: 'test-project',
    name: 'Test Project',
    createdAt: 0,
    updatedAt: 0,
    metadata: {
      familyName: 'TestFont',
      styleName: 'Regular',
      designer: '',
      copyright: '',
      version: '1.0',
      unitsPerEm: 1000,
      ascender: 800,
      descender: -200,
      lineGap: 100,
      capHeight: 700,
      xHeight: 500,
    },
    glyphs,
  };
}

const rect: PathContour = {
  id: 'c1',
  closed: true,
  nodes: [
    { id: 'n1', x: 100, y: 100, type: 'corner' },
    { id: 'n2', x: 500, y: 100, type: 'corner' },
    { id: 'n3', x: 500, y: 600, type: 'corner' },
    { id: 'n4', x: 100, y: 600, type: 'corner' },
  ],
};

describe('deriveProjectPaltMetrics / deriveProjectVpalMetrics scaleFactor (E-H1)', () => {
  it('scales the proportional advance to the exported outline scale', () => {
    const project = makeProject({
      65: { char: 'A', name: 'A', unicode: 65, advanceWidth: 1000, lsb: 50, contours: [rect] },
    });
    // Outline 400 wide, 5% padding (50 each side): 1.0 -> 500.
    expect(deriveProjectPaltMetrics(project).map((m) => m.proportionalAdvance)).toEqual([500]);
    // 1.35 -> outline 540 wide plus scaled padding 67.5 each side: 675.
    expect(deriveProjectPaltMetrics(project, 5, 1.35).map((m) => m.proportionalAdvance)).toEqual([
      675,
    ]);
    expect(deriveProjectPaltMetrics(project, 5, 1.35).map((m) => m.deltaAdvance)).toEqual([-325]);
    // Outline 500 high: 1.0 -> 600, 1.35 -> 810.
    expect(deriveProjectVpalMetrics(project).map((m) => m.proportionalAdvance)).toEqual([600]);
    expect(deriveProjectVpalMetrics(project, 5, 1.35).map((m) => m.proportionalAdvance)).toEqual([
      810,
    ]);
  });

  it('treats an invalid scaleFactor as 1.0', () => {
    const project = makeProject({
      65: { char: 'A', name: 'A', unicode: 65, advanceWidth: 1000, lsb: 50, contours: [rect] },
    });
    for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(deriveProjectPaltMetrics(project, 5, bad).map((m) => m.proportionalAdvance)).toEqual([
        500,
      ]);
      expect(deriveProjectVpalMetrics(project, 5, bad).map((m) => m.proportionalAdvance)).toEqual([
        600,
      ]);
    }
  });

  it('never scales the proportional advance past the advance width', () => {
    const project = makeProject({
      65: { char: 'A', name: 'A', unicode: 65, advanceWidth: 1000, lsb: 50, contours: [rect] },
    });
    // A 10x scale would give 5000, but palt only tightens within the advance.
    expect(deriveProjectPaltMetrics(project, 5, 10).map((m) => m.proportionalAdvance)).toEqual([
      1000,
    ]);
  });
});

describe('deriveProjectPaltMetrics / deriveProjectVpalMetrics invalid Unicode (L41)', () => {
  it('skips a glyph whose Unicode is above 0x10FFFF instead of throwing RangeError', () => {
    const project = makeProject({
      65: { char: 'A', name: 'A', unicode: 65, advanceWidth: 1000, lsb: 50, contours: [rect] },
      0x110000: { char: '', name: 'bad', unicode: 0x110000, advanceWidth: 1000, lsb: 50, contours: [rect] },
    });
    expect(() => deriveProjectPaltMetrics(project)).not.toThrow();
    expect(() => deriveProjectVpalMetrics(project)).not.toThrow();
    expect(deriveProjectPaltMetrics(project).map((m) => m.unicode)).toEqual([65]);
    expect(deriveProjectVpalMetrics(project).map((m) => m.unicode)).toEqual([65]);
  });

  it('does not throw when metadata is missing', () => {
    const project = makeProject({
      65: { char: 'A', name: 'A', unicode: 65, advanceWidth: 1000, lsb: 50, contours: [rect] },
    });
    delete (project as any).metadata;
    expect(() => deriveProjectPaltMetrics(project)).not.toThrow();
    expect(() => deriveProjectVpalMetrics(project)).not.toThrow();
  });
});
