import { describe, it, expect } from 'vitest';
import { makeUniquePartName } from './customParts';

describe('makeUniquePartName', () => {
  it('returns the base name when it is not taken', () => {
    expect(makeUniquePartName('あパーツ', ['いパーツ', 'うパーツ'])).toBe('あパーツ');
  });

  it('appends 2 when the base name is taken', () => {
    expect(makeUniquePartName('あパーツ', ['あパーツ'])).toBe('あパーツ 2');
  });

  it('increments the suffix until an unused number is found', () => {
    expect(makeUniquePartName('あパーツ', ['あパーツ', 'あパーツ 2', 'あパーツ 3'])).toBe('あパーツ 4');
  });

  it('uses the first unused number when a middle number is free', () => {
    expect(makeUniquePartName('あパーツ', ['あパーツ', 'あパーツ 3'])).toBe('あパーツ 2');
  });

  it('falls back to 新規パーツ when the base name is empty', () => {
    expect(makeUniquePartName('', [])).toBe('新規パーツ');
    expect(makeUniquePartName('   ', ['新規パーツ'])).toBe('新規パーツ 2');
  });

  it('trims surrounding whitespace from the base name', () => {
    expect(makeUniquePartName('  あパーツ  ', [])).toBe('あパーツ');
  });

  it('gives 新規パーツ 2 when 新規パーツ already exists', () => {
    expect(makeUniquePartName('新規パーツ', ['新規パーツ'])).toBe('新規パーツ 2');
  });
});
