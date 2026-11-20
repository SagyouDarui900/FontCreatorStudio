import { describe, expect, it } from 'vitest';
import { compileFont } from './compilerCore';
import { loadFontFromFile } from './io';
import { FontProject } from '../../types';

describe('loadFontFromFile baseline & metrics preservation', () => {
  it('preserves custom CJK ascender/descender and screen-space glyph positions across OTF round-trip', async () => {
    const project: FontProject = {
      id: 'roundtrip-cjk',
      name: 'RoundtripCJK',
      metadata: {
        familyName: 'RoundtripCJK',
        styleName: 'Regular',
        designer: 'Tester',
        copyright: 'Copyright (c) 2026',
        license: 'OFL-1.1',
        licenseUrl: 'https://openfontlicense.org/',
        version: '1.000',
        unitsPerEm: 1000,
        ascender: 880,
        descender: -120,
        lineGap: 0,
        capHeight: 740,
        xHeight: 520,
      },
      glyphs: {
        65: {
          unicode: 65,
          char: 'A',
          name: 'A',
          advanceWidth: 800,
          lsb: 100,
          contours: [
            {
              id: 'box',
              closed: true,
              // On-screen baseline is 880 (ascender=880).
              // A box from y=140 (capHeight 740) down to y=880 (baseline 0):
              nodes: [
                { id: 'n1', x: 100, y: 140, type: 'corner' },
                { id: 'n2', x: 600, y: 140, type: 'corner' },
                { id: 'n3', x: 600, y: 880, type: 'corner' },
                { id: 'n4', x: 100, y: 880, type: 'corner' },
              ],
            },
          ],
        },
      },
      createdAt: 1000,
      updatedAt: 1000,
    };

    const { buffer } = compileFont(project, {
      scaleFactor: 1.0,
      balanceSideBearings: false,
      skipBlobUrl: true,
    });
    const mockFile = {
      name: 'RoundtripCJK.otf',
      arrayBuffer: async () => buffer,
    } as unknown as File;

    const imported = await loadFontFromFile(mockFile);

    expect(imported.metadata.unitsPerEm).toBe(1000);
    expect(imported.metadata.ascender).toBe(880);
    expect(imported.metadata.descender).toBe(-120);
    expect(imported.metadata.capHeight).toBe(740);
    expect(imported.metadata.xHeight).toBe(520);

    const glyphA = imported.glyphs[65];
    expect(glyphA).toBeDefined();
    expect(glyphA.advanceWidth).toBe(800);

    const xs = glyphA.contours.flatMap((c) => c.nodes.map((n) => Math.round(n.x)));
    const ys = glyphA.contours.flatMap((c) => c.nodes.map((n) => Math.round(n.y)));
    expect(Math.min(...xs)).toBe(100);
    expect(Math.max(...xs)).toBe(600);
    expect(Math.min(...ys)).toBe(140);
    expect(Math.max(...ys)).toBe(880);
  });
});
