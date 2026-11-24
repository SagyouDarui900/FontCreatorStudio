import { JOUYOU_KANJI_2136 } from '../../data/jisKanjiSets';
import { RADICAL_KANJI_DATABASE } from '../../data/kanjiRadicalDatabase';
import { UNICODE_CATEGORIES, getCategoryCharList } from '../../data/unicodeTables';
import type { GlyphData } from '../../types/glyph';

export interface CharacterListItem {
  char: string;
  code: number;
}

export type CharacterListGroupId =
  | 'hiragana'
  | 'katakana'
  | 'alphabet'
  | 'joyo'
  | 'radical';

export const CHARACTER_LIST_GROUPS: {
  id: CharacterListGroupId;
  label: string;
  hint: string;
}[] = [
  { id: 'hiragana', label: 'ひらがな', hint: '86字' },
  { id: 'katakana', label: 'カタカナ', hint: '90字' },
  { id: 'alphabet', label: 'アルファベット', hint: 'A-Z a-z 0-9' },
  { id: 'joyo', label: '漢字（常用）', hint: '2,136字' },
  { id: 'radical', label: '漢字（部首別）', hint: '部首ごと' },
];

function categoryChars(categoryId: string): CharacterListItem[] {
  const category = UNICODE_CATEGORIES.find((c) => c.id === categoryId);
  if (!category) return [];
  return getCategoryCharList(category).map(({ char, code }) => ({ char, code }));
}

/**
 * Characters of one flat group, in display order. The radical group is
 * sectioned, so use getRadicalSections() for it instead; this returns its
 * flattened characters (with cross-section duplicates) for counting.
 */
export function getCharacterListChars(
  groupId: CharacterListGroupId
): CharacterListItem[] {
  switch (groupId) {
    case 'hiragana':
      return categoryChars('hiragana');
    case 'katakana':
      return categoryChars('katakana');
    case 'alphabet':
      return categoryChars('basic_latin_alnum');
    case 'joyo':
      return JOUYOU_KANJI_2136.map((char) => ({
        char,
        code: char.codePointAt(0) || 0,
      }));
    case 'radical':
      return getRadicalSections().flatMap((section) => section.chars);
  }
}

export interface RadicalSection {
  id: string;
  char: string;
  name: string;
  reading: string;
  strokes: number;
  chars: CharacterListItem[];
}

/**
 * Kanji grouped by radical, in database order. Sections with no kanji are
 * dropped, and duplicates inside one section are removed (the database
 * contains repeats such as 儀 twice under にんべん).
 */
export function getRadicalSections(): RadicalSection[] {
  const sections: RadicalSection[] = [];
  for (const entry of RADICAL_KANJI_DATABASE) {
    const seen = new Set<string>();
    const chars: CharacterListItem[] = [];
    for (const char of entry.kanjiList) {
      if (seen.has(char)) continue;
      seen.add(char);
      const code = char.codePointAt(0);
      if (code) chars.push({ char, code });
    }
    if (chars.length === 0) continue;
    sections.push({
      id: entry.id,
      char: entry.char,
      name: entry.name,
      reading: entry.reading,
      strokes: entry.strokes,
      chars,
    });
  }
  return sections;
}

/** A glyph counts as written when it has at least one contour. */
export function isGlyphWritten(glyph: GlyphData | undefined | null): boolean {
  return Boolean(glyph && Array.isArray(glyph.contours) && glyph.contours.length > 0);
}

export function countWritten(
  chars: CharacterListItem[],
  glyphs: Record<number, GlyphData> | undefined
): number {
  if (!glyphs) return 0;
  let count = 0;
  for (const item of chars) {
    if (isGlyphWritten(glyphs[item.code])) count++;
  }
  return count;
}

/** Deduplicated characters, used for progress totals in the radical view. */
export function uniqueChars(chars: CharacterListItem[]): CharacterListItem[] {
  const seen = new Set<number>();
  const result: CharacterListItem[] = [];
  for (const item of chars) {
    if (seen.has(item.code)) continue;
    seen.add(item.code);
    result.push(item);
  }
  return result;
}
