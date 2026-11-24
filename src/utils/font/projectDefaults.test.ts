import { describe, it, expect } from 'vitest';
import { balanceProjectGlyphMargins, createDefaultProject } from './projectDefaults';
import type { FontProject, PathContour } from '../../types';

function rectContour(id: string, minX: number, maxX: number): PathContour {
  return {
    id,
    closed: true,
    nodes: [
      { id: `${id}n1`, x: minX, y: 100, type: 'corner' },
      { id: `${id}n2`, x: maxX, y: 100, type: 'corner' },
      { id: `${id}n3`, x: maxX, y: 600, type: 'corner' },
      { id: `${id}n4`, x: minX, y: 600, type: 'corner' },
    ],
  };
}

describe('balanceProjectGlyphMargins (M7)', () => {
  it('leaves halfwidth lowercase letters unmoved while centering uppercase letters', () => {
    const project: FontProject = {
      ...createDefaultProject(),
      glyphs: {
        // 'A' outline spans 100..500 in a 1000 advance: center 300 -> moves +200.
        65: {
          char: 'A',
          name: 'A',
          unicode: 65,
          advanceWidth: 1000,
          lsb: 100,
          contours: [rectContour('cA', 100, 500)],
        },
        // 'a' has the identical off-center outline and must be protected.
        97: {
          char: 'a',
          name: 'a',
          unicode: 97,
          advanceWidth: 1000,
          lsb: 100,
          contours: [rectContour('ca', 100, 500)],
        },
      },
    };
    const { project: balanced, modifiedCount } = balanceProjectGlyphMargins(project);
    expect(modifiedCount).toBe(1);
    expect(balanced.glyphs[65].contours[0].nodes[0].x).toBe(300);
    expect(balanced.glyphs[97].contours[0].nodes[0].x).toBe(100);
  });
});
