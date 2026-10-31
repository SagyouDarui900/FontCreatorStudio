import React from 'react';

/**
 * Japanese Vertical Typography (縦組み) Character Orientation & Positioning Helpers
 * Based on JIS X 4051 and W3C JLReq (Requirements for Japanese Text Layout).
 *
 * In Japanese vertical typesetting:
 * 1. Prolonged sound mark (ー), wave dash (〜), dashes (―, —), ellipses (…, ‥)
 *    must run vertically (rotated 90deg clockwise).
 * 2. Opening brackets (「, 『, （, 【, etc.) rotate 90deg clockwise and align to the top.
 * 3. Closing brackets (」, 』, ）, 】, etc.) rotate 90deg clockwise and align to the bottom.
 * 4. Punctuation marks (、, 。, ，, ．) sit in the top-right quadrant of the em-square.
 * 5. Small kana (っ, ゃ, etc.) shift slightly towards the top-right quadrant.
 */

export const VERTICAL_ROTATE_CHARS = new Set([
  'ー', // U+30FC KATAKANA-HIRAGANA PROLONGED SOUND MARK
  'ｰ', // U+FF70 HALFWIDTH KATAKANA-HIRAGANA PROLONGED SOUND MARK
  '〜', // U+301C WAVE DASH
  '～', // U+FF5E FULLWIDTH TILDE
  '―', // U+2015 HORIZONTAL BAR
  '—', // U+2014 EM DASH
  '–', // U+2013 EN DASH
  '─', // U+2500 BOX DRAWINGS LIGHT HORIZONTAL
  '━', // U+2501 BOX DRAWINGS HEAVY HORIZONTAL
  '…', // U+2026 HORIZONTAL ELLIPSIS
  '‥', // U+2025 TWO DOT LEADER
  '⋮', // U+22EE VERTICAL ELLIPSIS
  '⋯', // U+22EF MIDLINE HORIZONTAL ELLIPSIS
  '＝', // U+FF1D FULLWIDTH EQUALS SIGN
  '=', // U+003D EQUALS SIGN
]);

export const VERTICAL_OPENING_BRACKETS = new Set([
  '「', // U+300C LEFT CORNER BRACKET
  '『', // U+300E LEFT WHITE CORNER BRACKET
  '（', // U+FF08 FULLWIDTH LEFT PARENTHESIS
  '(', // U+0028 LEFT PARENTHESIS
  '〔', // U+3014 LEFT TORTOISE SHELL BRACKET
  '［', // U+FF3B FULLWIDTH LEFT SQUARE BRACKET
  '[', // U+005B LEFT SQUARE BRACKET
  '｛', // U+FF5B FULLWIDTH LEFT CURLY BRACKET
  '{', // U+007B LEFT CURLY BRACKET
  '【', // U+3010 LEFT BLACK LENTICULAR BRACKET
  '〈', // U+3008 LEFT ANGLE BRACKET
  '《', // U+300A LEFT DOUBLE ANGLE BRACKET
  '«', // U+00AB LEFT-POINTING DOUBLE ANGLE QUOTATION MARK
  '‹', // U+2039 SINGLE LEFT-POINTING ANGLE QUOTATION MARK
  '“', // U+201C LEFT DOUBLE QUOTATION MARK
  '‘', // U+2018 LEFT SINGLE QUOTATION MARK
  '｟', // U+FF5F FULLWIDTH LEFT WHITE PARENTHESIS
]);

export const VERTICAL_CLOSING_BRACKETS = new Set([
  '」', // U+300D RIGHT CORNER BRACKET
  '』', // U+300F RIGHT WHITE CORNER BRACKET
  '）', // U+FF09 FULLWIDTH RIGHT PARENTHESIS
  ')', // U+0029 RIGHT PARENTHESIS
  '〕', // U+3015 RIGHT TORTOISE SHELL BRACKET
  '］', // U+FF3D FULLWIDTH RIGHT SQUARE BRACKET
  ']', // U+005D RIGHT SQUARE BRACKET
  '｝', // U+FF5D FULLWIDTH RIGHT CURLY BRACKET
  '}', // U+007D RIGHT CURLY BRACKET
  '】', // U+3011 RIGHT BLACK LENTICULAR BRACKET
  '〉', // U+3009 RIGHT ANGLE BRACKET
  '》', // U+300B RIGHT DOUBLE ANGLE BRACKET
  '»', // U+00BB RIGHT-POINTING DOUBLE ANGLE QUOTATION MARK
  '›', // U+203A SINGLE RIGHT-POINTING ANGLE QUOTATION MARK
  '”', // U+201D RIGHT DOUBLE QUOTATION MARK
  '’', // U+2019 RIGHT SINGLE QUOTATION MARK
  '｠', // U+FF60 FULLWIDTH RIGHT WHITE PARENTHESIS
]);

export const VERTICAL_TOP_RIGHT_PUNCTUATION = new Set([
  '、', // U+3001 IDEOGRAPHIC COMMA
  '。', // U+3002 IDEOGRAPHIC FULL STOP
  '，', // U+FF0C FULLWIDTH COMMA
  '．', // U+FF0E FULLWIDTH FULL STOP
  ',',  // U+002C COMMA
  '.',  // U+002E FULL STOP
]);

export const VERTICAL_SMALL_KANA = new Set([
  'ぁ', 'ぃ', 'ぅ', 'ぇ', 'ぉ',
  'っ', 'ゃ', 'ゅ', 'ょ', 'ゎ',
  'ァ', 'ィ', 'ゥ', 'ェ', 'ォ',
  'ッ', 'ャ', 'ュ', 'ョ', 'ヮ',
  'ヵ', 'ヶ',
]);

/**
 * Returns whether a character needs 90-degree rotation in vertical writing.
 */
export function isVerticalRotatedChar(char: string): boolean {
  return VERTICAL_ROTATE_CHARS.has(char);
}

/**
 * Checks whether a character is an opening or closing bracket in vertical writing.
 */
export function isVerticalBracket(char: string): 'opening' | 'closing' | null {
  if (VERTICAL_OPENING_BRACKETS.has(char)) return 'opening';
  if (VERTICAL_CLOSING_BRACKETS.has(char)) return 'closing';
  return null;
}

/**
 * Checks whether a character is a punctuation mark that sits in the top-right corner in vertical writing.
 */
export function isVerticalCornerPunctuation(char: string): boolean {
  return VERTICAL_TOP_RIGHT_PUNCTUATION.has(char);
}

/**
 * Generates the inline CSS styles for a single character in vertical or horizontal text.
 * Works consistently across custom user-drawn fonts (without GSUB vert) and system fonts.
 */
export function getVerticalGlyphStyle(
  char: string,
  isVertical: boolean
): React.CSSProperties {
  if (!isVertical) {
    return {
      display: 'inline-block',
    };
  }

  // 1. Prolonged sound mark (ー), wave dashes, horizontal lines, ellipses: rotate 90 deg clockwise
  if (VERTICAL_ROTATE_CHARS.has(char)) {
    return {
      display: 'inline-block',
      transform: 'rotate(90deg)',
      transformOrigin: 'center center',
    };
  }

  // 2. Opening brackets: rotate 90 deg clockwise (faces downward) and align to top of em-box
  if (VERTICAL_OPENING_BRACKETS.has(char)) {
    return {
      display: 'inline-block',
      transform: 'rotate(90deg) translateY(-8%)',
      transformOrigin: 'center center',
    };
  }

  // 3. Closing brackets: rotate 90 deg clockwise (faces upward) and align to bottom of em-box
  if (VERTICAL_CLOSING_BRACKETS.has(char)) {
    return {
      display: 'inline-block',
      transform: 'rotate(90deg) translateY(8%)',
      transformOrigin: 'center center',
    };
  }

  // 4. Commas and periods: position at top-right corner of em-square
  if (VERTICAL_TOP_RIGHT_PUNCTUATION.has(char)) {
    return {
      display: 'inline-block',
      transform: 'translate(28%, -28%)',
      transformOrigin: 'center center',
    };
  }

  // 5. Small kana: shift subtly toward top-right in vertical mode
  if (VERTICAL_SMALL_KANA.has(char)) {
    return {
      display: 'inline-block',
      transform: 'translate(10%, -10%) scale(0.92)',
      transformOrigin: 'center center',
    };
  }

  return {
    display: 'inline-block',
  };
}
