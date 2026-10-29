export type AlignHorizontal = 'center' | 'keep';
export type AlignVertical = 'center' | 'baseline' | 'keep';
export type SizePreset = 'standard' | 'large' | 'kana' | 'compact' | 'custom';
export type TargetScope = 'all' | 'hiragana' | 'katakana' | 'kanji' | 'latin' | 'current';

export const isAlignHorizontal = (value: string): value is AlignHorizontal =>
  value === 'center' || value === 'keep';

export const isAlignVertical = (value: string): value is AlignVertical =>
  value === 'center' || value === 'baseline' || value === 'keep';

export const isSizePreset = (value: string): value is SizePreset =>
  value === 'standard' ||
  value === 'large' ||
  value === 'kana' ||
  value === 'compact' ||
  value === 'custom';
