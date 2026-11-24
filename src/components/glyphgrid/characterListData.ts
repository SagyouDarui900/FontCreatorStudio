import { JOUYOU_KANJI_2136 } from '../../data/jisKanjiSets';
import { JIS_LEVEL_1_KANJI } from '../../data/jisLevel1';
import { JIS_LEVEL_2_KANJI } from '../../data/jisLevel2';
import { JIS_LEVEL_3_KANJI } from '../../data/jisLevel3';
import { JIS_LEVEL_4_KANJI } from '../../data/jisLevel4';
import { KANGXI_214_RADICALS } from '../../data/kangxi214Radicals';
import { getKangxiRadicalForKanji } from '../../data/kanjiKangxiRadicals';
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
  | 'fullwidth_alnum'
  | 'ascii_symbols'
  | 'symbols'
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
  { id: 'fullwidth_alnum', label: '全角英数字', hint: '62字' },
  { id: 'ascii_symbols', label: '半角記号', hint: '33字' },
  { id: 'symbols', label: '和文約物', hint: '85字' },
  { id: 'joyo', label: '漢字（常用）', hint: '2,136字' },
  { id: 'radical', label: '漢字（部首別）', hint: 'JIS第1〜第4水準' },
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
    case 'fullwidth_alnum':
      return categoryChars('fullwidth_alnum');
    case 'ascii_symbols':
      return categoryChars('ascii_symbols');
    case 'symbols':
      return categoryChars('symbols');
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
  /** Variant form shown in section headers, e.g. '氵' for the 水部. */
  displayChar: string;
  /** Other variant forms of the radical, e.g. ['氵', '氺']. */
  altChars?: string[];
  name: string;
  reading: string;
  strokes: number;
  chars: CharacterListItem[];
}

/**
 * Kanji grouped by Kangxi radical (214 sections, in radical-number order).
 * Every JIS X 0208 level 1 / level 2 and JIS X 0213 level 3 / level 4
 * kanji (10,050) appears in exactly one section, assigned by its
 * kRSUnicode primary radical from the Unicode Unihan database (see
 * src/data/kanjiKangxiRadicals.ts). Sections with no JIS kanji are
 * dropped. Within a section, kanji are in JIS order (level 1, then
 * level 2, then level 3, then level 4).
 */
export function getRadicalSections(): RadicalSection[] {
  const byRadical = new Map<number, CharacterListItem[]>();
  // One Set for the whole pass: each kanji belongs to exactly one radical
  // section, so a global seen-set keeps first-seen (JIS) order. The
  // previous per-section Array.some scan was O(n^2) over 10,050 kanji and
  // took seconds on every switch to the radical view.
  const seenCodes = new Set<number>();
  for (const char of [...JIS_LEVEL_1_KANJI, ...JIS_LEVEL_2_KANJI, ...JIS_LEVEL_3_KANJI, ...JIS_LEVEL_4_KANJI]) {
    const code = char.codePointAt(0);
    const radical = getKangxiRadicalForKanji(char);
    if (!code || radical === undefined) continue;
    if (seenCodes.has(code)) continue;
    seenCodes.add(code);
    const list = byRadical.get(radical);
    if (list) {
      list.push({ char, code });
    } else {
      byRadical.set(radical, [{ char, code }]);
    }
  }
  const sections: RadicalSection[] = [];
  for (const entry of KANGXI_214_RADICALS) {
    const chars = byRadical.get(entry.number);
    if (!chars || chars.length === 0) continue;
    sections.push({
      id: `kangxi_${entry.number}`,
      char: entry.char,
      displayChar: entry.displayChar,
      altChars: entry.altChars,
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

/** Katakana (U+30A1–U+30F6) to hiragana, for kana-insensitive matching. */
export function toHiragana(text: string): string {
  return text.replace(/[ァ-ヶ]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60)
  );
}

/**
 * Normalize a search query the same way the creation grid does:
 * trim and lowercase. An empty result means "no search".
 */
export function normalizeCharacterSearchQuery(query: string): string {
  return query.trim().toLowerCase();
}

/**
 * Does one list character match a normalized search query?
 * Same rules as the creation grid filter: the character itself, the
 * code point as hex (plain, U+..., 0x..., zero-padded to 4 digits), and
 * the special words 全角 / 空白 / スペース. There is no per-kanji
 * reading data, so a kanji cannot be found by its reading.
 */
export function matchesCharacterListItem(
  item: CharacterListItem,
  normalizedQuery: string
): boolean {
  if (!normalizedQuery) return true;
  const query = normalizedQuery;
  const hex = item.code.toString(16).toLowerCase();
  const hexPadded = hex.padStart(4, '0');
  return (
    item.char.toLowerCase().includes(query) ||
    hex.includes(query) ||
    hexPadded.includes(query) ||
    `u+${hex}`.includes(query) ||
    `u+${hexPadded}`.includes(query) ||
    `0x${hex}`.includes(query) ||
    `0x${hexPadded}`.includes(query) ||
    (query === '全角' &&
      (item.code === 0x3000 || (item.code >= 0xff01 && item.code <= 0xff5e))) ||
    (query === '空白' && (item.code === 0x3000 || item.code === 0x0020)) ||
    (query === 'スペース' && (item.code === 0x3000 || item.code === 0x0020))
  );
}

/**
 * Filter a flat character list by a raw (unnormalized) query.
 * An empty query returns the list unchanged.
 */
export function filterCharacterListChars(
  chars: CharacterListItem[],
  query: string
): CharacterListItem[] {
  const normalized = normalizeCharacterSearchQuery(query);
  if (!normalized) return chars;
  return chars.filter((item) => matchesCharacterListItem(item, normalized));
}

/**
 * Does a radical section match a normalized query by the radical itself:
 * the radical character, its variant form (displayChar / altChars), its
 * name, or its reading. Name and reading are compared hiragana-normalized,
 * so 'すい' finds the reading 'スイ' and 'さんずい' finds the name
 * 'みず・さんずい・したみず (水部)'.
 */
export function matchesRadicalSection(
  section: RadicalSection,
  normalizedQuery: string
): boolean {
  if (!normalizedQuery) return true;
  const query = toHiragana(normalizedQuery);
  const haystacks = [
    section.char,
    section.displayChar,
    ...(section.altChars ?? []),
    section.name,
    section.reading,
  ];
  return haystacks.some((text) =>
    toHiragana(text.toLowerCase()).includes(query)
  );
}

/**
 * Filter radical sections by a raw query. A section whose radical itself
 * matches keeps all its kanji; otherwise only the kanji matching the
 * query are kept, and sections with no matching kanji are dropped.
 */
export function filterRadicalSections(
  sections: RadicalSection[],
  query: string
): RadicalSection[] {
  const normalized = normalizeCharacterSearchQuery(query);
  if (!normalized) return sections;
  const result: RadicalSection[] = [];
  for (const section of sections) {
    if (matchesRadicalSection(section, normalized)) {
      result.push(section);
      continue;
    }
    const chars = section.chars.filter((item) =>
      matchesCharacterListItem(item, normalized)
    );
    if (chars.length > 0) {
      result.push({ ...section, chars });
    }
  }
  return result;
}
