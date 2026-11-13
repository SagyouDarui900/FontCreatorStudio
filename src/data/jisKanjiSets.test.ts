import { describe, it, expect } from 'vitest';
import {
  calculateJisProgress,
  getJisKuTenCode,
  JOUYOU_KANJI_2136,
} from './jisKanjiSets';
import { JIS_LEVEL_1_KANJI } from './jisLevel1';
import { JIS_LEVEL_2_KANJI } from './jisLevel2';
import { FontProject } from '../types';

describe('jisKanjiSets', () => {
  it('has exactly 2,136 unique Jouyou Kanji characters', () => {
    expect(JOUYOU_KANJI_2136.length).toBe(2136);
    const uniqueSet = new Set(JOUYOU_KANJI_2136);
    expect(uniqueSet.size).toBe(2136);
  });

  it('correctly maps JIS Level 1 characters to Ku-Ten code', () => {
    // 亜 is the first character in JIS Level 1 (Ku: 16, Ten: 1)
    const sub = getJisKuTenCode('亜');
    expect(sub).not.toBeNull();
    expect(sub?.ku).toBe(16);
    expect(sub?.ten).toBe(1);
    expect(sub?.kuTenStr).toBe('16-01');
    expect(sub?.level).toBe(1);
  });

  it('correctly maps JIS Level 2 characters to Ku-Ten code', () => {
    // 弌 is the first character in JIS Level 2 (Ku: 48, Ten: 1)
    const firstJis2 = JIS_LEVEL_2_KANJI[0];
    const sub = getJisKuTenCode(firstJis2);
    expect(sub).not.toBeNull();
    expect(sub?.ku).toBe(48);
    expect(sub?.ten).toBe(1);
    expect(sub?.kuTenStr).toBe('48-01');
    expect(sub?.level).toBe(2);
  });

  it('calculates progress accurately based on project glyphs', () => {
    const glyphs: FontProject['glyphs'] = {
      0x4e9c: {
        unicode: 0x4e9c,
        char: '亜',
        name: 'uni4E9C',
        advanceWidth: 1000,
        lsb: 50,
        contours: [
          {
            id: 'c1',
            closed: true,
            nodes: [
              { id: 'n1', x: 0, y: 0 },
              { id: 'n2', x: 100, y: 0 },
              { id: 'n3', x: 100, y: 100 },
            ],
          },
        ],
      },
    };

    const progress = calculateJisProgress(glyphs);
    expect(progress.jouyou.completed).toBe(1);
    expect(progress.jis1.completed).toBe(1);
    expect(progress.jis2.completed).toBe(0);
    expect(progress.jouyou.missingChars.includes('亜')).toBe(false);
  });
});
