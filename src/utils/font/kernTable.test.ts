import { describe, it, expect } from 'vitest';
import * as opentype from 'opentype.js';
import {
  buildKernTableBytes,
  injectKernTable,
  MAX_FORMAT0_PAIRS,
  type KernPair,
} from './kernTable';
import { compileFont } from './compilerCore';
import type { FontProject } from '../../types';

function makePairs(count: number): KernPair[] {
  return Array.from({ length: count }, (_, i) => ({
    leftIndex: i + 1,
    rightIndex: 2,
    value: -5,
  }));
}

function kernPairCount(bytes: Uint8Array): number {
  return new DataView(bytes.buffer).getUint16(10, false);
}

describe('buildKernTableBytes format 0 pair limit (E-M1)', () => {
  it('keeps all pairs and reports no warning under the limit', () => {
    const warnings: string[] = [];
    const bytes = buildKernTableBytes(makePairs(3), (message) => warnings.push(message));
    expect(kernPairCount(bytes)).toBe(3);
    expect(warnings).toEqual([]);
  });

  it('caps the pairs at MAX_FORMAT0_PAIRS and warns about the dropped pairs', () => {
    const warnings: string[] = [];
    const bytes = buildKernTableBytes(makePairs(MAX_FORMAT0_PAIRS + 80), (message) =>
      warnings.push(message)
    );
    expect(kernPairCount(bytes)).toBe(MAX_FORMAT0_PAIRS);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain(String(MAX_FORMAT0_PAIRS + 80));
    expect(warnings[0]).toContain(String(MAX_FORMAT0_PAIRS));
    expect(warnings[0]).toContain('80');
  });
});

describe('injectKernTable truncation warning (E-M1)', () => {
  it('passes the truncation warning to the caller and still writes a parseable font', () => {
    const project: FontProject = {
      id: 'kern-test',
      name: 'Kern Test',
      createdAt: 0,
      updatedAt: 0,
      metadata: {
        familyName: 'KernTest',
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
      glyphs: {},
    };
    const compiled = compileFont(project, { skipBlobUrl: true });
    const warnings: string[] = [];
    const buffer = injectKernTable(compiled.buffer, makePairs(MAX_FORMAT0_PAIRS + 1), (message) =>
      warnings.push(message)
    );
    expect(warnings).toHaveLength(1);
    expect(() => opentype.parse(buffer)).not.toThrow();
  });
});
