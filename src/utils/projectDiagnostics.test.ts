import { describe, it, expect } from 'vitest';
import { runProjectDiagnostics } from './projectDiagnostics';
import { FontProject, GlyphData } from '../types';

function makeProject(glyphs: Record<number, GlyphData>): FontProject {
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
    },
    glyphs,
  };
}

function pixelGlyph(unicode: number, char: string, data: number[]): GlyphData {
  return {
    unicode,
    char,
    name: `uni${unicode.toString(16).toUpperCase()}`,
    advanceWidth: 1000,
    lsb: 0,
    contours: [],
    pixelData: { width: 8, height: 8, data },
  };
}

describe('Q-M3 pixel-only glyphs in project diagnostics', () => {
  it('treats a pixel-only glyph as created, not empty', () => {
    // Rows 1, 3, 5 filled: three separate bands, enough nodes/complexity
    // for a hiragana glyph to count as complete.
    const data = new Array(64).fill(0);
    for (const row of [1, 3, 5]) {
      for (let x = 0; x < 8; x++) data[row * 8 + x] = 1;
    }
    const project = makeProject({ 0x3042: pixelGlyph(0x3042, 'あ', data) });
    const report = runProjectDiagnostics(project, { scope: 'registered_only' });
    expect(report.emptyCount).toBe(0);
    expect(report.completedCount).toBe(1);
    const item = report.items.find((i) => i.unicode === 0x3042);
    expect(item).toBeDefined();
    expect(item!.status).toBe('complete');
  });

  it('counts a pixel-only glyph as completed in the hiragana category stats', () => {
    const data = new Array(64).fill(0);
    for (const row of [1, 3, 5]) {
      for (let x = 0; x < 8; x++) data[row * 8 + x] = 1;
    }
    const project = makeProject({ 0x3042: pixelGlyph(0x3042, 'あ', data) });
    const report = runProjectDiagnostics(project, { scope: 'standard_japanese' });
    const hiragana = report.categoryStats.find((s) => s.id === 'hiragana');
    expect(hiragana).toBeDefined();
    expect(hiragana!.completedChars).toBe(1);
    expect(hiragana!.emptyChars).toBe(hiragana!.totalChars - 1);
  });

  it('still classifies a vector-empty glyph as empty', () => {
    const glyph: GlyphData = {
      unicode: 0x3042, char: 'あ', name: 'uni3042', advanceWidth: 1000, lsb: 0, contours: [],
    };
    const project = makeProject({ 0x3042: glyph });
    const report = runProjectDiagnostics(project, { scope: 'registered_only' });
    expect(report.emptyCount).toBe(1);
    expect(report.items.find((i) => i.unicode === 0x3042)?.status).toBe('empty');
  });

  it('still classifies a pixel glyph with no filled pixels as empty', () => {
    const project = makeProject({ 0x3042: pixelGlyph(0x3042, 'あ', new Array(64).fill(0)) });
    const report = runProjectDiagnostics(project, { scope: 'registered_only' });
    expect(report.emptyCount).toBe(1);
    expect(report.items.find((i) => i.unicode === 0x3042)?.status).toBe('empty');
  });
});
