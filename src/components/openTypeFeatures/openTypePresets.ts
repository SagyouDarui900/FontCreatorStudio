import { OpenTypeFeaturesConfig, VerticalWritingGlyphSub } from '../../types';
import { LigaturePresetInfo, VertPresetInfo } from './types';

// Preset Japanese Vertical Substitutions (Standard GSUB 'vert' / 'vrt2' tables)
export const DEFAULT_VERT_PRESETS: readonly VertPresetInfo[] = [
  { name: '句点', char: '。', sourceUnicode: 0x3002, vertUnicode: 0xFE12, vertChar: '︒' },
  { name: '読点', char: '、', sourceUnicode: 0x3001, vertUnicode: 0xFE11, vertChar: '︑' },
  { name: '鍵括弧（開）', char: '「', sourceUnicode: 0x300C, vertUnicode: 0xFE41, vertChar: '﹁' },
  { name: '鍵括弧（閉）', char: '」', sourceUnicode: 0x300D, vertUnicode: 0xFE42, vertChar: '﹂' },
  { name: '二重鍵括弧（開）', char: '『', sourceUnicode: 0x300E, vertUnicode: 0xFE43, vertChar: '﹃' },
  { name: '二重鍵括弧（閉）', char: '』', sourceUnicode: 0x300F, vertUnicode: 0xFE44, vertChar: '﹄' },
  { name: '丸括弧（開）', char: '（', sourceUnicode: 0xFF08, vertUnicode: 0xFE35, vertChar: '︵' },
  { name: '丸括弧（閉）', char: '）', sourceUnicode: 0xFF09, vertUnicode: 0xFE36, vertChar: '︶' },
  { name: '隅付き括弧（開）', char: '【', sourceUnicode: 0x3010, vertUnicode: 0xFE3B, vertChar: '︻' },
  { name: '隅付き括弧（閉）', char: '】', sourceUnicode: 0x3011, vertUnicode: 0xFE3C, vertChar: '︼' },
  { name: '亀甲括弧（開）', char: '〔', sourceUnicode: 0x3014, vertUnicode: 0xFE39, vertChar: '︹' },
  { name: '亀甲括弧（閉）', char: '〕', sourceUnicode: 0x3015, vertUnicode: 0xFE3A, vertChar: '︺' },
  { name: '山括弧（開）', char: '〈', sourceUnicode: 0x3008, vertUnicode: 0xFE3F, vertChar: '︿' },
  { name: '山括弧（閉）', char: '〉', sourceUnicode: 0x3009, vertUnicode: 0xFE40, vertChar: '﹀' },
  { name: '二重山括弧（開）', char: '《', sourceUnicode: 0x300A, vertUnicode: 0xFE3D, vertChar: '︽' },
  { name: '二重山括弧（閉）', char: '》', sourceUnicode: 0x300B, vertUnicode: 0xFE3E, vertChar: '︾' },
  { name: '波括弧（開）', char: '｛', sourceUnicode: 0xFF5B, vertUnicode: 0xFE37, vertChar: '︷' },
  { name: '波括弧（閉）', char: '｝', sourceUnicode: 0xFF5D, vertUnicode: 0xFE38, vertChar: '︸' },
  { name: '長音記号 (ー)', char: 'ー', sourceUnicode: 0x30FC, vertUnicode: 0xFE31, vertChar: '︱' },
  { name: 'ダッシュ (―)', char: '―', sourceUnicode: 0x2015, vertUnicode: 0xFE33, vertChar: '︳' },
  { name: '波ダッシュ (〜)', char: '〜', sourceUnicode: 0x301C, vertUnicode: 0xFE4F, vertChar: '﹏' },
  { name: '三点リーダー (…)', char: '…', sourceUnicode: 0x2026, vertUnicode: 0xFE19, vertChar: '︙' },
  { name: '二点リーダー (‥)', char: '‥', sourceUnicode: 0x2025, vertUnicode: 0xFE30, vertChar: '︰' },
  { name: '促音 小文字つ', char: 'っ', sourceUnicode: 0x3063, vertUnicode: 0x3063, vertChar: 'っ(縦位置)' },
  { name: '促音 小文字ツ', char: 'ッ', sourceUnicode: 0x30C3, vertUnicode: 0x30C3, vertChar: 'ッ(縦位置)' },
  { name: '小文字や', char: 'ゃ', sourceUnicode: 0x3083, vertUnicode: 0x3083, vertChar: 'ゃ(縦位置)' },
  { name: '小文字ゆ', char: 'ゅ', sourceUnicode: 0x3085, vertUnicode: 0x3085, vertChar: 'ゅ(縦位置)' },
  { name: '小文字よ', char: 'ょ', sourceUnicode: 0x3087, vertUnicode: 0x3087, vertChar: 'ょ(縦位置)' },
];

// Preset Ligatures (Standard GSUB 'liga' / 'dlig' tables)
// Longest sequences (ffi/ffl) come first so OpenType lookups never short-circuit on 'ff'.
export const DEFAULT_LIGATURE_PRESETS: readonly LigaturePresetInfo[] = [
  { id: 'liga_ffi', name: 'ffi 合字', type: 'liga', inputChars: ['f', 'f', 'i'], substituteUnicode: 0xFB03 },
  { id: 'liga_ffl', name: 'ffl 合字', type: 'liga', inputChars: ['f', 'f', 'l'], substituteUnicode: 0xFB04 },
  { id: 'liga_fi', name: 'fi 合字', type: 'liga', inputChars: ['f', 'i'], substituteUnicode: 0xFB01 },
  { id: 'liga_fl', name: 'fl 合字', type: 'liga', inputChars: ['f', 'l'], substituteUnicode: 0xFB02 },
  { id: 'liga_ff', name: 'ff 合字', type: 'liga', inputChars: ['f', 'f'], substituteUnicode: 0xFB00 },
  { id: 'liga_st', name: 'st 合字', type: 'dlig', inputChars: ['s', 't'], substituteUnicode: 0xFB06 },
];

export function buildDefaultOpenTypeFeaturesConfig(
  unitsPerEm = 1000,
  ascender = 880
): OpenTypeFeaturesConfig {
  return {
    enabled: true,
    verticalWriting: {
      enabled: true,
      defaultVertAdvance: unitsPerEm || 1000,
      vertOriginY: ascender || 880,
      substitutions: DEFAULT_VERT_PRESETS.map((p, idx) => ({
        id: `vsub_${idx}`,
        sourceUnicode: p.sourceUnicode,
        vertUnicode: p.vertUnicode,
        enabled: true,
      })),
    },
    ligatures: DEFAULT_LIGATURE_PRESETS.map((p) => ({
      id: p.id,
      type: p.type,
      name: p.name,
      inputChars: [...p.inputChars],
      substituteUnicode: p.substituteUnicode,
      enabled: true,
    })),
    customKerningPairs: [],
    palt: {
      enabled: true,
      autoDerivePalt: true,
      autoDeriveVpal: true,
      opticalSideBearingPercent: 5,
      paltList: [],
      vpalList: [],
    },
  };
}

export function safeFromCodePoint(unicode: number): string {
  if (!Number.isInteger(unicode) || unicode < 0 || unicode > 0x10ffff) {
    return '';
  }
  return String.fromCodePoint(unicode);
}

export function findVertPresetInfo(
  sub: VerticalWritingGlyphSub,
  idx: number
): VertPresetInfo | undefined {
  const indexed = DEFAULT_VERT_PRESETS[idx];
  if (
    indexed &&
    indexed.sourceUnicode === sub.sourceUnicode &&
    indexed.vertUnicode === sub.vertUnicode
  ) {
    return indexed;
  }
  return DEFAULT_VERT_PRESETS.find(
    (p) => p.sourceUnicode === sub.sourceUnicode && p.vertUnicode === sub.vertUnicode
  );
}

export function parseUnicodeCodePoint(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const hexMatch = /^U\+([0-9a-f]+)$/i.exec(trimmed);
  if (hexMatch) {
    const parsed = Number.parseInt(hexMatch[1], 16);
    return Number.isInteger(parsed) && parsed >= 0 && parsed <= 0x10ffff ? parsed : null;
  }

  const decMatch = /^([0-9]+)$/.exec(trimmed);
  if (decMatch) {
    const parsed = Number.parseInt(decMatch[1], 10);
    return Number.isInteger(parsed) && parsed >= 0 && parsed <= 0x10ffff ? parsed : null;
  }

  return null;
}
