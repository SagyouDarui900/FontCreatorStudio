// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest';
import { compileFont } from './compilerCore';
import {
  buildExportFontFilename,
  loadFontFromFile,
  MAX_IMPORT_FONT_BYTES,
  sanitizeFontFilenamePart,
  shareOrDownloadFont,
} from './io';
import { FontProject } from '../../types';

function makeMinimalProject(familyName = 'RoundtripCJK', styleName = 'Regular'): FontProject {
  return {
    id: 'roundtrip-cjk',
    name: familyName,
    metadata: {
      familyName,
      styleName,
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
}

describe('loadFontFromFile & export I/O safety', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('preserves custom CJK ascender/descender and screen-space glyph positions across OTF round-trip', async () => {
    const project = makeMinimalProject();
    const { buffer } = compileFont(project, {
      scaleFactor: 1.0,
      balanceSideBearings: false,
      skipBlobUrl: true,
    });
    const mockFile = {
      name: 'RoundtripCJK.otf',
      size: buffer.byteLength,
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

  it('sanitizes path traversal and illegal characters from export filenames', () => {
    expect(sanitizeFontFilenamePart('../../evil/font', 'CustomFont')).toBe('evil_font');
    expect(sanitizeFontFilenamePart('   ', 'Fallback')).toBe('Fallback');
    expect(buildExportFontFilename({ familyName: '../My\\Font', styleName: 'Bold/Italic' }, 'otf')).toBe(
      'My_Font-Bold_Italic.otf'
    );
  });

  it('returns method cancelled when Web Share is aborted by the user (AbortError)', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15'
    );
    const abortErr = Object.assign(new Error('Share aborted'), { name: 'AbortError' });
    const shareSpy = vi.fn().mockRejectedValue(abortErr);
    Object.defineProperty(navigator, 'share', { value: shareSpy, configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const res = await shareOrDownloadFont(makeMinimalProject('MyFont', 'Regular'), 'otf', {
      skipBlobUrl: true,
    });

    expect(res).toEqual({ method: 'cancelled', filename: 'MyFont-Regular.otf' });
    expect(shareSpy).toHaveBeenCalledTimes(1);
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it('rejects oversized font files exceeding MAX_IMPORT_FONT_BYTES', async () => {
    const oversizedFile = {
      name: 'huge.otf',
      size: MAX_IMPORT_FONT_BYTES + 1,
      arrayBuffer: vi.fn(),
    } as unknown as File;

    await expect(loadFontFromFile(oversizedFile)).rejects.toThrow(/ファイルサイズが大きすぎます/);
    expect((oversizedFile.arrayBuffer as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });

  it('preserves styleName, usWeightClass, usWidthClass, vendorId, and post flags across OTF round-trip', async () => {
    const project = makeMinimalProject('FamilyRoundtrip', 'SemiBold');
    project.metadata.usWeightClass = 600;
    project.metadata.usWidthClass = 7;
    project.metadata.vendorId = 'OTST';
    project.metadata.italicAngle = -12;
    project.metadata.isFixedPitch = true;

    const { buffer } = compileFont(project, {
      scaleFactor: 1.0,
      balanceSideBearings: false,
      skipBlobUrl: true,
    });
    const mockFile = {
      name: 'FamilyRoundtrip-SemiBold.otf',
      size: buffer.byteLength,
      arrayBuffer: async () => buffer,
    } as unknown as File;

    const imported = await loadFontFromFile(mockFile);
    expect(imported.metadata.familyName).toBe('FamilyRoundtrip');
    expect(imported.metadata.styleName).toBe('SemiBold');
    expect(imported.metadata.usWeightClass).toBe(600);
    expect(imported.metadata.usWidthClass).toBe(7);
    expect(imported.metadata.vendorId).toBe('OTST');
    expect(imported.metadata.italicAngle).toBe(-12);
    expect(imported.metadata.isFixedPitch).toBe(true);
  });
});
