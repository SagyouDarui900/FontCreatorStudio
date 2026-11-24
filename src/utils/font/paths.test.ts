import { describe, expect, it } from 'vitest';
import { contoursToOpenTypePath } from './paths';
import { contoursToSvgPath } from '../path/svg';
import { PathContour } from '../../types';

function contour(closed: boolean | undefined): PathContour {
  return {
    id: 'c1',
    // Simulate a hand-edited JSON file that omits `closed`.
    ...(closed === undefined ? {} : { closed }),
    nodes: [
      { id: 'n1', x: 100, y: 100, type: 'corner' },
      { id: 'n2', x: 500, y: 100, type: 'corner' },
      { id: 'n3', x: 500, y: 600, type: 'corner' },
    ],
  } as PathContour;
}

describe('contoursToOpenTypePath closed handling (L43)', () => {
  it('treats an omitted `closed` as an open contour, the same as the SVG path', () => {
    const openType = contoursToOpenTypePath([contour(undefined)]);
    const svg = contoursToSvgPath([contour(undefined)]);
    // No close command in the font path, no Z in the SVG path.
    expect(openType.commands.some((cmd) => cmd.type === 'Z')).toBe(false);
    expect(svg).not.toContain('Z');
    // Both draw the same two segments and stop (no closing segment).
    expect(openType.commands.filter((cmd) => cmd.type === 'L').length).toBe(2);
    expect(svg).toBe('M 100 100 L 500 100 L 500 600');
  });

  it('still closes a contour explicitly marked closed, including the final segment', () => {
    const openType = contoursToOpenTypePath([contour(true)]);
    const svg = contoursToSvgPath([contour(true)]);
    expect(openType.commands.some((cmd) => cmd.type === 'Z')).toBe(true);
    expect(svg).toContain('Z');
    // The closing segment back to the first node is drawn (3 lines).
    expect(openType.commands.filter((cmd) => cmd.type === 'L').length).toBe(3);
  });
});
