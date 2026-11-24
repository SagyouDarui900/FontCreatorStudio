import {
  MojikumiConfig,
  MojikumiPresetId,
  MojikumiTable,
  KinsokuSetId,
  BurasagariMode,
  KinsokuAdjustMode,
  ParagraphIndentPresetId,
  MojikumiRuleItem,
} from '../types';

// ============================================================================
// 1. JIS X 4051 & Illustrator 手引き準拠の 7大文字組みプリセット定義
// ============================================================================

const RULE = (min: number, optimal: number, max: number, priority: number): MojikumiRuleItem => ({
  min,
  optimal,
  max,
  priority,
});

/**
 * 1. 行末約物半角 (Illustratorデフォルト / 伝統的JIS組版)
 * 行末約物は半角(0%)固定。行中約物は半角アキ(50%)、欧文前後は四分(25%)アキ。
 */
export const PRESET_GYOMATSU_YAKUMONO_HANKAN: MojikumiTable = {
  endBracket_to_lineEnd: RULE(0, 0, 0, 0),
  touten_to_lineEnd: RULE(0, 0, 0, 0),
  kuten_to_lineEnd: RULE(0, 0, 0, 0),
  middleDot_to_lineEnd: RULE(0, 0, 0, 0),

  paraStart_to_startBracket: RULE(0, 0, 0, 0),
  paraStart_to_nonYakumono: RULE(0, 0, 0, 0),
  lineStart_to_startBracket: RULE(0, 0, 0, 0),

  nonYakumono_to_startBracket: RULE(0, 50, 50, 3),
  endBracket_to_nonYakumono: RULE(0, 50, 50, 3),
  endBracket_to_startBracket: RULE(0, 50, 50, 3),
  touten_to_startBracket: RULE(0, 50, 50, 2),
  touten_to_nonYakumono: RULE(0, 50, 50, 2),
  kuten_to_startBracket: RULE(0, 50, 50, 3),
  kuten_to_nonYakumono: RULE(0, 50, 50, 0), // 優先度0 (最後につめる)
  middleDot_around: RULE(0, 25, 25, 1),

  halfLatin_around_nonYakumono: RULE(12.5, 25, 50, 4),
  halfDigit_around_nonYakumono: RULE(12.5, 25, 50, 4),
};

/**
 * 2. ベタ組み (手引き第38〜39ページ)
 * 「行末約物全角／半角」を元にカスタマイズ。句点後の最小値を12.5%にして区切り感を保持、
 * 優先順位（中点＞括弧＞読点＞句点）を最適化。
 */
export const PRESET_BETA: MojikumiTable = {
  endBracket_to_lineEnd: RULE(0, 50, 50, 1),
  touten_to_lineEnd: RULE(0, 50, 50, 1),
  kuten_to_lineEnd: RULE(0, 50, 50, 1),
  middleDot_to_lineEnd: RULE(25, 25, 25, 1),

  paraStart_to_startBracket: RULE(0, 0, 0, 0),
  paraStart_to_nonYakumono: RULE(0, 0, 0, 0),
  lineStart_to_startBracket: RULE(0, 0, 0, 0),

  nonYakumono_to_startBracket: RULE(0, 50, 50, 2),
  endBracket_to_nonYakumono: RULE(0, 50, 50, 2),
  endBracket_to_startBracket: RULE(0, 50, 50, 2),
  touten_to_startBracket: RULE(0, 50, 50, 3),
  touten_to_nonYakumono: RULE(0, 50, 50, 3),
  kuten_to_startBracket: RULE(12.5, 50, 50, 4),
  kuten_to_nonYakumono: RULE(12.5, 50, 50, 4),
  middleDot_around: RULE(0, 25, 25, 1),

  halfLatin_around_nonYakumono: RULE(12.5, 12.5, 25, 4),
  halfDigit_around_nonYakumono: RULE(0, 0, 12.5, 4),
};

/**
 * 3. ツメ組み (手引き第40ページ)
 * 不必要なアキを排除（最小・最適値0%基本）。区切りとなる句点のみ最適値12.5%を確保。
 */
export const PRESET_TSUME: MojikumiTable = {
  endBracket_to_lineEnd: RULE(0, 0, 0, 1),
  touten_to_lineEnd: RULE(0, 0, 0, 1),
  kuten_to_lineEnd: RULE(0, 0, 0, 1),
  middleDot_to_lineEnd: RULE(0, 0, 0, 1),

  paraStart_to_startBracket: RULE(0, 0, 0, 0),
  paraStart_to_nonYakumono: RULE(0, 0, 0, 0),
  lineStart_to_startBracket: RULE(0, 0, 0, 0),

  nonYakumono_to_startBracket: RULE(0, 0, 50, 3),
  endBracket_to_nonYakumono: RULE(0, 0, 50, 3),
  endBracket_to_startBracket: RULE(0, 0, 50, 3),
  touten_to_startBracket: RULE(0, 0, 50, 2),
  touten_to_nonYakumono: RULE(0, 0, 50, 2),
  kuten_to_startBracket: RULE(0, 12.5, 50, 1),
  kuten_to_nonYakumono: RULE(0, 12.5, 50, 1),
  middleDot_around: RULE(0, 0, 25, 4),

  halfLatin_around_nonYakumono: RULE(0, 0, 12.5, 1),
  halfDigit_around_nonYakumono: RULE(0, 0, 12.5, 1),
};

/**
 * 4. 行末約物全角／半角
 */
export const PRESET_GYOMATSU_ZEN_HAN: MojikumiTable = {
  endBracket_to_lineEnd: RULE(0, 50, 50, 1),
  touten_to_lineEnd: RULE(0, 50, 50, 1),
  kuten_to_lineEnd: RULE(0, 50, 50, 1),
  middleDot_to_lineEnd: RULE(25, 25, 25, 1),

  paraStart_to_startBracket: RULE(0, 0, 0, 0),
  paraStart_to_nonYakumono: RULE(0, 0, 0, 0),
  lineStart_to_startBracket: RULE(0, 0, 0, 0),

  nonYakumono_to_startBracket: RULE(0, 50, 50, 3),
  endBracket_to_nonYakumono: RULE(0, 50, 50, 3),
  endBracket_to_startBracket: RULE(0, 50, 50, 3),
  touten_to_startBracket: RULE(0, 50, 50, 2),
  touten_to_nonYakumono: RULE(0, 50, 50, 2),
  kuten_to_startBracket: RULE(0, 50, 50, 3),
  kuten_to_nonYakumono: RULE(0, 50, 50, 0),
  middleDot_around: RULE(0, 25, 25, 1),

  halfLatin_around_nonYakumono: RULE(0, 0, 12.5, 4),
  halfDigit_around_nonYakumono: RULE(0, 0, 12.5, 4),
};

/**
 * 5. 約物半角
 */
export const PRESET_YAKUMONO_HANKAN: MojikumiTable = {
  ...PRESET_GYOMATSU_YAKUMONO_HANKAN,
  nonYakumono_to_startBracket: RULE(0, 0, 50, 3),
  endBracket_to_nonYakumono: RULE(0, 0, 50, 3),
};

/**
 * 6. 行末約物全角
 */
export const PRESET_GYOMATSU_YAKUMONO_ZENKAKU: MojikumiTable = {
  ...PRESET_GYOMATSU_YAKUMONO_HANKAN,
  endBracket_to_lineEnd: RULE(0, 50, 50, 1),
  touten_to_lineEnd: RULE(0, 50, 50, 1),
  kuten_to_lineEnd: RULE(0, 50, 50, 1),
};

/**
 * 7. 約物全角
 */
export const PRESET_YAKUMONO_ZENKAKU: MojikumiTable = {
  ...PRESET_GYOMATSU_YAKUMONO_ZENKAKU,
  endBracket_to_lineEnd: RULE(50, 50, 50, 0),
  touten_to_lineEnd: RULE(50, 50, 50, 0),
  kuten_to_lineEnd: RULE(50, 50, 50, 0),
};

export const MOJIKUMI_PRESETS: Record<MojikumiPresetId, { name: string; description: string; table: MojikumiTable }> = {
  beta: {
    name: 'ベタ組み',
    description: '本文などの長文に最適。句点の区切り感を保ち、現代の和欧混植に適した最適値設計。',
    table: PRESET_BETA,
  },
  tsume: {
    name: 'ツメ組み',
    description: '見出しやリード文に最適。不要なアキを排除し、引き締まった一体感を生む現代的設定。',
    table: PRESET_TSUME,
  },
  gyomatsu_yakumono_hankan: {
    name: '行末約物半角',
    description: 'JIS X 4051準拠の標準設定。行末約物を半角で扱い、行中約物は半角アキを確保。',
    table: PRESET_GYOMATSU_YAKUMONO_HANKAN,
  },
  gyomatsu_zen_han: {
    name: '行末約物全角／半角',
    description: '英数字が多用される現代文書向け。和欧文間を0%〜12.5%に縮めた実用設定。',
    table: PRESET_GYOMATSU_ZEN_HAN,
  },
  yakumono_hankan: {
    name: '約物半角',
    description: 'すべての約物を半角基準で並べ、字間を詰めて組む伝統的アキ量設定。',
    table: PRESET_YAKUMONO_HANKAN,
  },
  gyomatsu_yakumono_zenkaku: {
    name: '行末約物全角',
    description: '行末の約物にも全角アキを許容するゆったりとした組版設計。',
    table: PRESET_GYOMATSU_YAKUMONO_ZENKAKU,
  },
  yakumono_zenkaku: {
    name: '約物全角',
    description: 'すべての約物を常に全角スペース扱いで並べる伝統的な組版設定。',
    table: PRESET_YAKUMONO_ZENKAKU,
  },
  custom: {
    name: 'カスタムアキ量',
    description: 'ユーザーが最小・最適・最大・優先順位を自由にカスタマイズした設定。',
    // L34: PRESET_BETA と同一オブジェクトを参照しないよう、各ルールまで複製する。
    // シャローコピーではルールオブジェクトが共有され、custom の編集がベタ組みを汚染する。
    table: Object.fromEntries(
      Object.entries(PRESET_BETA).map(([key, rule]) => [key, { ...rule }])
    ) as MojikumiTable,
  },
};

// ============================================================================
// 2. 段落行頭1字下げプリセット（手引き第48〜52ページ準拠）
// ============================================================================

/**
 * L31: 段落字下げプリセットは、呼び出し側のテーブルに個別の設定がある
 * ルールは上書きしない。個別設定かどうかは値で判断する。3 値 (min /
 * optimal / max) がすべて 0 のルールは未設定とみなし、プリセット値を
 * 適用する。非 0 のルールは呼び出し側が個別に設定したものとして残す。
 * 'none' は何も指定しないため、個別設定を 0 にリセットしない。
 * なお、プリセットの既定テーブル (PRESET_BETA など) では行頭 3 ルールは
 * すべて 0 のため、従来どおりプリセット値が適用される。
 */
export function applyParagraphIndentPreset(
  baseTable: MojikumiTable,
  indentPreset: ParagraphIndentPresetId
): MojikumiTable {
  const table = { ...baseTable };

  // 'none' は字下げを指定しない。個別設定を 0 にリセットしないため何もしない。
  if (indentPreset === 'none') return table;

  const applyIfUnset = (key: keyof MojikumiTable, rule: MojikumiRuleItem): void => {
    const current = table[key];
    if (current.min === 0 && current.optimal === 0 && current.max === 0) {
      table[key] = rule;
    }
  };

  switch (indentPreset) {
    case 'visual_half':
      // 見た目半角下がり（折り返し後アキなし）
      // 段落先頭の括弧類: 50%固定, 非約物: 100%固定, 折り返し後の始め括弧: 0% (天付き)
      applyIfUnset('paraStart_to_startBracket', RULE(50, 50, 50, 0));
      applyIfUnset('paraStart_to_nonYakumono', RULE(100, 100, 100, 0));
      applyIfUnset('lineStart_to_startBracket', RULE(0, 0, 0, 0));
      break;

    case 'visual_full':
      // 見た目全角下がり（折り返し後アキなし）
      // 段落先頭の括弧類: 100%固定, 非約物: 100%固定, 折り返し後の始め括弧: 0% (天付き)
      applyIfUnset('paraStart_to_startBracket', RULE(100, 100, 100, 0));
      applyIfUnset('paraStart_to_nonYakumono', RULE(100, 100, 100, 0));
      applyIfUnset('lineStart_to_startBracket', RULE(0, 0, 0, 0));
      break;

    case 'visual_full_half':
      // 見た目全角半下がり（折り返し後半角下がり）
      // 段落先頭の括弧類: 150%固定, 非約物: 100%固定, 折り返し後の始め括弧: 50% (半角下がり)
      applyIfUnset('paraStart_to_startBracket', RULE(150, 150, 150, 0));
      applyIfUnset('paraStart_to_nonYakumono', RULE(100, 100, 100, 0));
      applyIfUnset('lineStart_to_startBracket', RULE(50, 50, 50, 0));
      break;

    default:
      break;
  }

  return table;
}

// ============================================================================
// 3. 禁則文字クラス & ぶら下がり文字定義（手引き第25・27ページ）
// ============================================================================

export const KINSOKU_CHARS = {
  // 句読点
  kuten: '。．.',
  touten: '、，,',
  // 括弧類
  startBrackets: '「『（(〔［{【〈《«‹“‘',
  endBrackets: '」』）)〕］}】〉》»›”’',
  // 中点類
  middleDots: '・:;：；',
  // 分離禁止文字
  inseparable: '―…‥',
  // 促音・小書き仮名
  smallKana: 'ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮヵヶ',
  // 音引き・長音符
  choon: 'ー~〜',
  // 単位・記号
  units: '％%℃°¢$￥¥€#№',
};

/**
 * 行頭禁則文字リスト
 */
export function getLineStartProhibitedChars(setId: KinsokuSetId): Set<string> {
  const set = new Set<string>();
  if (setId === 'none') return set;

  // 句読点・終わり括弧は全セットで共通
  for (const c of KINSOKU_CHARS.kuten + KINSOKU_CHARS.touten + KINSOKU_CHARS.endBrackets) {
    set.add(c);
  }

  // L33: 「？」「！」は JIS X 4051 の区切り約物であり、行頭禁則文字である。
  // 半角の '?' '!' も同じ区切り約物 (JIS X 4051 の (5) 区切り約物) のため含める。
  for (const c of '？！?!') {
    set.add(c);
  }

  // 中点類・分離禁止記号
  for (const c of KINSOKU_CHARS.middleDots + KINSOKU_CHARS.inseparable) {
    set.add(c);
  }

  if (setId === 'weak_v2') {
    // 弱い禁則 v2: 促音（っッ）も行頭禁則に追加
    set.add('っ');
    set.add('ッ');
  }

  if (setId === 'strong') {
    // 強い禁則: 小書き仮名全体、音引き、単位記号も追加
    for (const c of KINSOKU_CHARS.smallKana + KINSOKU_CHARS.choon + KINSOKU_CHARS.units) {
      set.add(c);
    }
  }

  return set;
}

/**
 * 行末禁則文字リスト
 */
export function getLineEndProhibitedChars(setId: KinsokuSetId): Set<string> {
  const set = new Set<string>();
  if (setId === 'none') return set;

  for (const c of KINSOKU_CHARS.startBrackets) {
    set.add(c);
  }

  if (setId === 'strong') {
    set.add('￥');
    set.add('¥');
    set.add('$');
    set.add('€');
    set.add('#');
  }

  return set;
}

/**
 * ぶら下がり文字（手引き第27ページ）: 句点「。」読点「、」カンマ「，」ピリオド「．」
 */
export const BURASAGARI_CHARS = new Set(['。', '、', '，', '．', '.', ',']);

// ============================================================================
// 4. 文字種の判定ヘルパー
// ============================================================================

export type CharKind =
  | 'start_bracket'
  | 'end_bracket'
  | 'touten'
  | 'kuten'
  | 'middle_dot'
  | 'half_latin'
  | 'half_digit'
  | 'full_space'
  | 'half_space'
  | 'non_yakumono';

export function getCharKind(ch: string): CharKind {
  if (KINSOKU_CHARS.startBrackets.includes(ch)) return 'start_bracket';
  if (KINSOKU_CHARS.endBrackets.includes(ch)) return 'end_bracket';
  if (KINSOKU_CHARS.touten.includes(ch)) return 'touten';
  if (KINSOKU_CHARS.kuten.includes(ch)) return 'kuten';
  if (KINSOKU_CHARS.middleDots.includes(ch)) return 'middle_dot';
  if (ch === '　') return 'full_space';
  if (ch === ' ' || ch === '\t') return 'half_space';
  if (/^[a-zA-Z]$/.test(ch)) return 'half_latin';
  if (/^[0-9]$/.test(ch)) return 'half_digit';
  // L29: アクセント付きラテン文字 (U+00C0〜U+00FF の文字、×÷を除く、
  // および U+0100〜U+017F) は半角として扱う。
  if (/^[\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF\u0100-\u017F]$/.test(ch)) return 'half_latin';
  // L29: 半角カタカナ (U+FF61〜U+FF9F) は半角として扱う。種類名は
  // 送り幅と和欧文間のアキ量の扱いを半角に合わせるため half_latin とする。
  if (/^[\uFF61-\uFF9F]$/.test(ch)) return 'half_latin';
  return 'non_yakumono';
}

// ============================================================================
// 5. Q・H単位系とテキストエリアの計算器（手引き第04・42ページ）
// ============================================================================

export interface TypesettingDimensions {
  fontSizeQ: number;       // 文字サイズ (Q: 1Q = 0.25mm)
  fontSizePt: number;      // pt換算
  lineFeedH: number;       // 行送り (H: 1H = 0.25mm)
  lineFeedPt: number;      // pt換算
  lineGapH: number;        // 行間 (H = 行送り - 文字サイズ)
  lineGapMm: number;       // 行間 (mm = lineGapH * 0.25)
  charsPerLine: number;    // 1行字詰め
  lineCount: number;       // 行数
  widthMm: number;         // テキストエリア幅 (mm)
  heightMm: number;        // テキストエリア高さ (mm)
  // L19: formulaWidth / formulaHeight は計算されていたが UI のどこからも
  // 表示されず、他からの参照もなかったため削除した。表示が必要になれば
  // ここに計算式の文字列を戻すこと。
}

export function calculateTypesettingDimensions(
  fontSizeQ: number,
  lineFeedH: number,
  charsPerLine: number,
  lineCount: number,
  isVertical?: boolean
): TypesettingDimensions {
  const mmPerUnit = 0.25;
  const ptPerUnit = 0.25 / 0.352778; // 1pt ≈ 0.3528mm -> 1Q ≈ 0.7087pt

  // L26: 入力検証。非有限値や 0 未満の値は安全な値に置き換え、行数に
  // 起因する負の高さや NaN が返らないようにする。行数は 1 未満に
  // ならない (0 行では高さが 1 行分になる従来の Math.max(1, lineCount - 1)
  // と同じ結果になる)。なお lineGapH は行送りが文字サイズ未満の場合に
  // 負になるが、それは行送り不足の状態そのものであり、ここでは変えない。
  const safeFontSizeQ = Number.isFinite(fontSizeQ) ? Math.max(0, fontSizeQ) : 0;
  const safeLineFeedH = Number.isFinite(lineFeedH) ? Math.max(0, lineFeedH) : 0;
  const safeCharsPerLine = Number.isFinite(charsPerLine) ? Math.max(1, Math.floor(charsPerLine)) : 1;
  const safeLineCount = Number.isFinite(lineCount) ? Math.max(1, Math.floor(lineCount)) : 1;

  const charAdvanceMm = safeFontSizeQ * safeCharsPerLine * mmPerUnit;
  const lineStackMm = (safeLineFeedH * (safeLineCount - 1) + safeFontSizeQ) * mmPerUnit;
  const lineGapH = safeLineFeedH - safeFontSizeQ;

  const widthMm = isVertical ? lineStackMm : charAdvanceMm;
  const heightMm = isVertical ? charAdvanceMm : lineStackMm;

  return {
    fontSizeQ: safeFontSizeQ,
    fontSizePt: Math.round(safeFontSizeQ * ptPerUnit * 10) / 10,
    lineFeedH: safeLineFeedH,
    lineFeedPt: Math.round(safeLineFeedH * ptPerUnit * 10) / 10,
    lineGapH,
    lineGapMm: Math.round(lineGapH * mmPerUnit * 10) / 10,
    charsPerLine: safeCharsPerLine,
    lineCount: safeLineCount,
    widthMm: Math.round(widthMm * 10) / 10,
    heightMm: Math.round(heightMm * 10) / 10,
  };
}

// ============================================================================
// 6. レイアウトシミュレーター (Adobe 日本語単数行コンポーザー準拠)
// ============================================================================

export interface FormattedGlyph {
  char: string;
  charIndex: number;
  kind: CharKind;
  baseAdvanceEm?: number;  // 仮想ボディ幅/送り幅 (通常1.0, 半角0.5, ツメ等)
  spacingBeforeEm: number; // 前のアキ (1.0 = 1em)
  spacingAfterEm: number;  // 後のアキ
  isHanging: boolean;      // ぶら下がり
  tateChuYoko?: boolean;   // 縦中横
}

export interface FormattedLine {
  lineIndex: number;
  glyphs: FormattedGlyph[];
  text: string;
  isParagraphStart: boolean;
  isParagraphEnd: boolean;
  totalAdvanceEm: number;
  isOverflown: boolean;
  burasagariCount: number;
}

export interface FormattedLayoutResult {
  lines: FormattedLine[];
  totalChars: number;
  lineCount: number;
  burasagariCount: number;
  averageDensityPercent: number;
}

/**
 * 2文字間のアキ量の許容範囲 (em単位)。M23: 従来は optimal だけを使っていたが、
 * min / max / priority も返す。min は追い込み (H3) の圧縮下限、max は
 * 行長揃え (M23) の拡大上限、priority はその処理順に使う。
 */
export interface PairSpacingRange {
  minEm: number;
  optimalEm: number;
  maxEm: number;
  priority: number;
  ruleKey: keyof MojikumiTable | null;
}

const ZERO_SPACING_RANGE: PairSpacingRange = {
  minEm: 0,
  optimalEm: 0,
  maxEm: 0,
  priority: 0,
  ruleKey: null,
};

function toSpacingRange(rule: MojikumiRuleItem, ruleKey: keyof MojikumiTable): PairSpacingRange {
  return {
    minEm: rule.min / 100,
    optimalEm: rule.optimal / 100,
    maxEm: rule.max / 100,
    priority: rule.priority,
    ruleKey,
  };
}

export function getPairSpacingRange(
  leftKind: CharKind,
  rightKind: CharKind,
  table: MojikumiTable,
  isLineStart: boolean,
  isParagraphStart: boolean
): PairSpacingRange {
  // 行頭処理
  if (isLineStart) {
    if (rightKind === 'start_bracket') {
      return toSpacingRange(
        isParagraphStart ? table.paraStart_to_startBracket : table.lineStart_to_startBracket,
        isParagraphStart ? 'paraStart_to_startBracket' : 'lineStart_to_startBracket'
      );
    }
    if (isParagraphStart) {
      // M26: 段落先頭の字下げは非約物だけでなく、半角英数字・半角スペース・
      // 句読点など段落先頭に来るすべての文字種に付ける
      return toSpacingRange(table.paraStart_to_nonYakumono, 'paraStart_to_nonYakumono');
    }
    return ZERO_SPACING_RANGE;
  }

  // 行中処理 (leftKind と rightKind の「間」のアキ)
  if (leftKind === 'non_yakumono' && rightKind === 'start_bracket') {
    return toSpacingRange(table.nonYakumono_to_startBracket, 'nonYakumono_to_startBracket');
  } else if (leftKind === 'end_bracket' && rightKind === 'non_yakumono') {
    return toSpacingRange(table.endBracket_to_nonYakumono, 'endBracket_to_nonYakumono');
  } else if (leftKind === 'end_bracket' && rightKind === 'start_bracket') {
    // 終わり括弧と始め括弧の連続
    return toSpacingRange(table.endBracket_to_startBracket, 'endBracket_to_startBracket');
  } else if (leftKind === 'touten' && rightKind === 'start_bracket') {
    return toSpacingRange(table.touten_to_startBracket, 'touten_to_startBracket');
  } else if (leftKind === 'touten' && rightKind === 'non_yakumono') {
    return toSpacingRange(table.touten_to_nonYakumono, 'touten_to_nonYakumono');
  } else if (leftKind === 'kuten' && rightKind === 'start_bracket') {
    return toSpacingRange(table.kuten_to_startBracket, 'kuten_to_startBracket');
  } else if (leftKind === 'kuten' && rightKind === 'non_yakumono') {
    return toSpacingRange(table.kuten_to_nonYakumono, 'kuten_to_nonYakumono');
  } else if (leftKind === 'middle_dot' || rightKind === 'middle_dot') {
    return toSpacingRange(table.middleDot_around, 'middleDot_around');
  } else if (
    (leftKind === 'half_latin' && rightKind === 'non_yakumono') ||
    (leftKind === 'non_yakumono' && rightKind === 'half_latin')
  ) {
    return toSpacingRange(table.halfLatin_around_nonYakumono, 'halfLatin_around_nonYakumono');
  } else if (
    (leftKind === 'half_digit' && rightKind === 'non_yakumono') ||
    (leftKind === 'non_yakumono' && rightKind === 'half_digit')
  ) {
    return toSpacingRange(table.halfDigit_around_nonYakumono, 'halfDigit_around_nonYakumono');
  }

  return ZERO_SPACING_RANGE;
}

/**
 * 2文字間の最適アキ量（em単位）を取得
 */
export function getPairOptimalSpacing(
  leftKind: CharKind,
  rightKind: CharKind,
  table: MojikumiTable,
  isLineStart: boolean,
  isParagraphStart: boolean
): { beforeEm: number; afterEm: number } {
  return {
    beforeEm: getPairSpacingRange(leftKind, rightKind, table, isLineStart, isParagraphStart).optimalEm,
    afterEm: 0,
  };
}

/**
 * 行末字の種類に対応する行末ルール (M23)。該当するルールがなければ null。
 */
function getLineEndRule(
  kind: CharKind,
  table: MojikumiTable
): { rule: MojikumiRuleItem; key: keyof MojikumiTable } | null {
  switch (kind) {
    case 'end_bracket':
      return { rule: table.endBracket_to_lineEnd, key: 'endBracket_to_lineEnd' };
    case 'touten':
      return { rule: table.touten_to_lineEnd, key: 'touten_to_lineEnd' };
    case 'kuten':
      return { rule: table.kuten_to_lineEnd, key: 'kuten_to_lineEnd' };
    case 'middle_dot':
      return { rule: table.middleDot_to_lineEnd, key: 'middleDot_to_lineEnd' };
    default:
      return null;
  }
}

/**
 * ぶら下がり対象文字 (H4)。句読点に加え、閉じ括弧も対象にする。
 * BURASAGARI_CHARS は ManuscriptView でも使うため変更せず、エンジンの判定は
 * この関数に集約する。
 */
export function isBurasagariChar(ch: string): boolean {
  return BURASAGARI_CHARS.has(ch) || KINSOKU_CHARS.endBrackets.includes(ch);
}

/** 送り幅の下限 (em)。advances に極端に小さい値が指定されても行分割が破綻しないようにする (M27)。 */
export const MIN_ADVANCE_EM = 0.25;
/** 縦中横 1 単位あたりの最大文字数 (M19)。これを超える連続は複数単位に分ける。 */
export const MAX_TATE_CHU_YOKO_RUN = 4;
/** 縦中横 1 単位の送り幅 (em)。単位内の文字数によらず 1em の升に入る。 */
export const TATE_CHU_YOKO_ADVANCE_EM = 1.0;

/**
 * 行分割の単位。縦書き時の縦中横 (M19) は半角英数字の連続を 1 単位として扱う。
 * それ以外は 1 文字が 1 単位。
 */
interface TextUnit {
  chars: string[];
  charIndex: number; // 段落内での文字位置
  kind: CharKind; // 対向アキ量の判定に使う種類
  tateChuYoko: boolean;
}

function isTateChuYokoChar(ch: string, advances?: Record<string, number>): boolean {
  if (!/^[0-9A-Za-z]$/.test(ch)) return false;
  // advances で全角相当 (0.75em 以上) の送り幅が指定された字は縦中横にしない
  const adv = advances?.[ch];
  if (typeof adv === 'number' && Number.isFinite(adv) && adv >= 0.75) return false;
  return true;
}

function splitIntoUnits(chars: string[], isVertical: boolean, advances?: Record<string, number>): TextUnit[] {
  const units: TextUnit[] = [];
  let i = 0;
  while (i < chars.length) {
    const ch = chars[i];
    if (isVertical && isTateChuYokoChar(ch, advances)) {
      let j = i;
      while (j < chars.length && isTateChuYokoChar(chars[j], advances)) j++;
      const run = chars.slice(i, j);
      if (run.length === 1) {
        // 1 字だけの半角英数字は縦中横にしない (縦書きで回転して組む字)
        units.push({ chars: [ch], charIndex: i, kind: getCharKind(ch), tateChuYoko: false });
      } else {
        for (let k = 0; k < run.length; k += MAX_TATE_CHU_YOKO_RUN) {
          const chunk = run.slice(k, k + MAX_TATE_CHU_YOKO_RUN);
          const hasLatin = chunk.some((c) => /^[A-Za-z]$/.test(c));
          units.push({
            chars: chunk,
            charIndex: i + k,
            kind: hasLatin ? 'half_latin' : 'half_digit',
            tateChuYoko: true,
          });
        }
      }
      i = j;
    } else {
      units.push({ chars: [ch], charIndex: i, kind: getCharKind(ch), tateChuYoko: false });
      i++;
    }
  }
  return units;
}

/**
 * 1 単位の送り幅 (M27)。options.advances で指定された文字はその値を
 * (下限 MIN_ADVANCE_EM でクランプして) 使い、指定がない文字は従来の固定値を使う。
 * 縦中横の単位は文字数によらず 1em。
 */
function resolveBaseAdvance(unit: TextUnit, usePalt: boolean, advances?: Record<string, number>): number {
  if (unit.tateChuYoko) return TATE_CHU_YOKO_ADVANCE_EM;
  const ch = unit.chars[0];
  const custom = advances?.[ch];
  if (typeof custom === 'number' && Number.isFinite(custom)) {
    return Math.max(MIN_ADVANCE_EM, custom);
  }
  const kind = unit.kind;
  // L28: 半角ピリオド・カンマは KINSOKU_CHARS の kuten / touten に
  // 含まれるため種類は句読点のままだが、送り幅は半角 (0.5em) とする。
  // 全角の '．' '，' はここに該当せず 1.0em のままである。
  if (ch === '.' || ch === ',') return 0.5;
  if (usePalt) {
    if (kind === 'touten' || kind === 'kuten' || kind === 'start_bracket' || kind === 'end_bracket') {
      return 0.5; // 約物は半角
    } else if (kind === 'middle_dot') {
      return 0.5;
    } else if (kind === 'half_latin' || kind === 'half_digit' || kind === 'half_space') {
      return 0.5;
    } else if (KINSOKU_CHARS.smallKana.includes(ch)) {
      return 0.8;
    } else if (kind === 'full_space') {
      // L27: 全角スペースは palt でも 1.0em のままにする。
      return 1.0;
    } else {
      return 0.95; // 和文もわずかにツメ
    }
  } else if (kind === 'half_latin' || kind === 'half_digit' || kind === 'half_space') {
    return 0.5;
  }
  return 1.0;
}

/** ペアのカーニング (em単位)。キーは "左文字,右文字"。指定がないペアは 0 (M27)。 */
export function getKerningEm(
  kerningEm: Record<string, number> | undefined,
  leftChar: string | undefined,
  rightChar: string
): number {
  if (!kerningEm || leftChar === undefined) return 0;
  const v = kerningEm[`${leftChar},${rightChar}`];
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

interface UnitAdvance {
  baseEm: number;
  beforeEm: number; // ルールの optimal (カーニングを除く)
  kerningEm: number;
  trackingEm: number;
  totalEm: number;
  range: PairSpacingRange;
}

interface AdvanceContext {
  table: MojikumiTable;
  trackingEm: number;
  usePalt: boolean;
  advances?: Record<string, number>;
  kerningEm?: Record<string, number>;
}

function computeUnitAdvance(
  unit: TextUnit,
  prevUnit: TextUnit | null,
  isLineStart: boolean,
  isParagraphStart: boolean,
  ctx: AdvanceContext
): UnitAdvance {
  const baseEm = resolveBaseAdvance(unit, ctx.usePalt, ctx.advances);
  const range = prevUnit
    ? getPairSpacingRange(prevUnit.kind, unit.kind, ctx.table, false, false)
    : getPairSpacingRange('non_yakumono', unit.kind, ctx.table, isLineStart, isParagraphStart);
  const beforeEm = range.optimalEm;
  const kerningEm = prevUnit
    ? getKerningEm(ctx.kerningEm, prevUnit.chars[prevUnit.chars.length - 1], unit.chars[0])
    : 0;
  // L25: トラッキングは字と字の間にだけ入る。行頭の単位には付かない。
  // 行末の字の送り幅にトラッキングが含まれないよう、totalEm に入るのは
  // 直前の字との間の分だけである。
  const trackingEm = prevUnit ? ctx.trackingEm : 0;
  return {
    baseEm,
    beforeEm,
    kerningEm,
    trackingEm,
    totalEm: baseEm + beforeEm + kerningEm + trackingEm,
    range,
  };
}

interface CompressibleGap {
  currentEm: number;
  minEm: number;
  priority: number;
  order: number;
  apply: (valueEm: number) => void;
}

/**
 * 行内のアキを指定量だけ圧縮する (H3 追い込み)。
 * priority の降順 (9→1、0 は最後) に各アキを min まで縮める。
 * 必要量を満たせない場合は何も変更せず false を返す。
 */
function tryCompressGaps(gaps: CompressibleGap[], amountEm: number): boolean {
  const sorted = [...gaps].sort((a, b) => {
    const pa = a.priority === 0 ? -1 : a.priority;
    const pb = b.priority === 0 ? -1 : b.priority;
    if (pb !== pa) return pb - pa;
    return a.order - b.order;
  });
  let remaining = amountEm;
  const plan: { gap: CompressibleGap; valueEm: number }[] = [];
  for (const gap of sorted) {
    if (remaining <= 1e-9) break;
    const compressible = Math.max(0, gap.currentEm - gap.minEm);
    const take = Math.min(compressible, remaining);
    if (take > 1e-9) {
      plan.push({ gap, valueEm: gap.currentEm - take });
      remaining -= take;
    }
  }
  if (remaining > 1e-9) return false;
  for (const { gap, valueEm } of plan) gap.apply(valueEm);
  return true;
}

interface ExpandableGap {
  currentEm: number; // ルール分のみ (カーニング・トラッキングを除く)
  maxEm: number;
  priority: number;
  order: number;
  apply: (valueEm: number) => void;
}

/**
 * 行長揃え (M23)。段落の最終行以外の行について、行末の空きをアキ量の
 * 許容範囲 [optimal, max] 内で広げて埋める。priority の昇順 (1→9、0 は最後)
 * に処理し、行末ルール (*_to_lineEnd) も行末字の後のアキとして参加する。
 * 空きが拡大可能なアキの合計を超える行はそのまま短く残る。
 * 戻り値は揃え後の行送り幅。
 */
function justifyLine(
  lineGlyphs: FormattedGlyph[],
  table: MojikumiTable,
  kerningEm: Record<string, number> | undefined,
  lineAdvanceEm: number,
  safeCharsPerLine: number
): number {
  let slack = safeCharsPerLine - lineAdvanceEm;
  if (lineGlyphs.length === 0 || slack <= 1e-9) return lineAdvanceEm;
  const gaps: ExpandableGap[] = [];
  for (let i = 1; i < lineGlyphs.length; i++) {
    const g = lineGlyphs[i];
    if (g.isHanging) continue;
    const prev = lineGlyphs[i - 1];
    if (prev.isHanging) continue;
    const range = getPairSpacingRange(prev.kind, g.kind, table, false, false);
    if (range.maxEm - range.optimalEm <= 1e-9) continue;
    const kern = getKerningEm(kerningEm, prev.char, g.char);
    const ruleNow = g.spacingBeforeEm - kern;
    gaps.push({
      currentEm: ruleNow,
      maxEm: range.maxEm,
      priority: range.priority,
      order: i,
      apply: (valueEm) => {
        g.spacingBeforeEm += valueEm - ruleNow;
      },
    });
  }
  // 行末ルール: 行末字 (ぶら下がり字を除く) の後のアキ。現在は 0。
  let lastIdx = lineGlyphs.length - 1;
  while (lastIdx >= 0 && lineGlyphs[lastIdx].isHanging) lastIdx--;
  if (lastIdx >= 0) {
    const last = lineGlyphs[lastIdx];
    const lineEnd = getLineEndRule(last.kind, table);
    if (lineEnd && lineEnd.rule.max > 0) {
      // L25: 行末の字の spacingAfterEm にトラッキングは含まれないため、
      // 行末ルールの現在値はそのまま使う。
      const afterNow = last.spacingAfterEm;
      gaps.push({
        currentEm: afterNow,
        maxEm: lineEnd.rule.max / 100,
        priority: lineEnd.rule.priority,
        order: lineGlyphs.length,
        apply: (valueEm) => {
          last.spacingAfterEm += valueEm - afterNow;
        },
      });
    }
  }
  gaps.sort((a, b) => {
    const pa = a.priority === 0 ? Number.POSITIVE_INFINITY : a.priority;
    const pb = b.priority === 0 ? Number.POSITIVE_INFINITY : b.priority;
    if (pa !== pb) return pa - pb;
    return a.order - b.order;
  });
  let expanded = 0;
  for (const gap of gaps) {
    if (slack <= 1e-9) break;
    const headroom = Math.max(0, gap.maxEm - gap.currentEm);
    const take = Math.min(headroom, slack);
    if (take > 1e-9) {
      gap.apply(gap.currentEm + take);
      slack -= take;
      expanded += take;
    }
  }
  return lineAdvanceEm + expanded;
}

/**
 * テキストを指定の文字組み設定と禁則・ぶら下がりで組版整形シミュレート
 */
export function simulateTypesetting(
  text: string,
  charsPerLine: number,
  config: MojikumiConfig,
  options?: {
    isVertical?: boolean;
    trackingEm?: number; // トラッキング (アケ組み用: +0.1em 〜 +0.25em)
    usePalt?: boolean; // プロポーショナルメトリクス (ツメ組み用)
    advances?: Record<string, number>; // M27: 文字ごとの送り幅 (em単位)。指定がない文字は従来の固定値を使う
    kerningEm?: Record<string, number>; // M27: ペアのカーニング (em単位)。キーは "左文字,右文字"。指定がないペアは 0
  }
): FormattedLayoutResult {
  const table = applyParagraphIndentPreset(config.table, config.paragraphIndent);
  const startProhibited = getLineStartProhibitedChars(config.kinsoku);
  const endProhibited = getLineEndProhibitedChars(config.kinsoku);
  const burasagariMode = config.burasagari;
  const trackingEm = options?.trackingEm ?? 0;
  const usePalt = options?.usePalt ?? false;
  const isVertical = options?.isVertical ?? false;
  // Safety guard against <= 0 or NaN charsPerLine to prevent infinite loops
  const safeCharsPerLine = Math.max(1, Math.floor(charsPerLine || 1));
  const ctx: AdvanceContext = {
    table,
    trackingEm,
    usePalt,
    advances: options?.advances,
    kerningEm: options?.kerningEm,
  };

  // L24: 改行で分割する前に \r を除去する。CRLF (\r\n) と LF (\n) の
  // 両方に対応し、単独の \r も改行として扱う。\r を残すと 1em の
  // 不可視グリフになり、改行位置がずれる。
  const paragraphs = text.split(/\r\n|\r|\n/);
  const lines: FormattedLine[] = [];
  let totalBurasagari = 0;
  let totalCharCount = 0;

  for (const para of paragraphs) {
    const chars = Array.from(para);
    if (chars.length === 0) {
      lines.push({
        lineIndex: lines.length,
        glyphs: [],
        text: '',
        isParagraphStart: true,
        isParagraphEnd: true,
        totalAdvanceEm: 0,
        isOverflown: false,
        burasagariCount: 0,
      });
      continue;
    }

    const units = splitIntoUnits(chars, isVertical, options?.advances);
    let unitCursor = 0;
    let isParaStart = true;

    while (unitCursor < units.length) {
      const currentLineGlyphs: FormattedGlyph[] = [];
      // 行内の各単位のグリフ数。追い出しは単位単位で行う。
      const currentLineUnitLens: number[] = [];
      let currentAdvanceEm = 0;
      let lineBurasagari = 0;
      // 行内で最後に配置した、ぶら下がりでない単位。次の単位の前アキと
      // カーニングの左側に使う。ぶら下がり字は版面外のため左側にしない。
      let prevUnitInLine: TextUnit | null = null;

      // 行内に 1 単位を配置する。ぶら下がり字は送り幅に加算しない。
      // 縦中横の単位は先頭グリフが 1em の送り幅を持ち、残りのグリフは 0 とする。
      // L25: トラッキングは字と字の間にだけ入るため、配置する単位の
      // spacingAfterEm には付けず、直前のぶら下がりでない字の
      // spacingAfterEm に付ける。行末の字の spacingAfterEm は 0 のままになる。
      const placeUnit = (unit: TextUnit, adv: UnitAdvance, isHanging: boolean) => {
        if (!isHanging && adv.trackingEm !== 0) {
          for (let i = currentLineGlyphs.length - 1; i >= 0; i--) {
            const prev = currentLineGlyphs[i];
            if (!prev.isHanging) {
              prev.spacingAfterEm = adv.trackingEm;
              break;
            }
          }
        }
        unit.chars.forEach((ch, idx) => {
          currentLineGlyphs.push({
            char: ch,
            charIndex: totalCharCount + unit.charIndex + idx,
            kind: unit.kind,
            baseAdvanceEm: idx === 0 ? adv.baseEm : 0,
            spacingBeforeEm: idx === 0 ? adv.beforeEm + adv.kerningEm : 0,
            spacingAfterEm: 0,
            isHanging,
            tateChuYoko: unit.tateChuYoko ? true : undefined,
          });
        });
        currentLineUnitLens.push(unit.chars.length);
        if (!isHanging) currentAdvanceEm += adv.totalEm;
      };

      // 行内の圧縮可能なアキ (H3 追い込み用)。先頭字の字下げと
      // ぶら下がり字の前アキは圧縮対象にしない。
      const collectLineGaps = (): CompressibleGap[] => {
        const gaps: CompressibleGap[] = [];
        for (let i = 1; i < currentLineGlyphs.length; i++) {
          const g = currentLineGlyphs[i];
          if (g.isHanging) continue;
          const prev = currentLineGlyphs[i - 1];
          if (prev.isHanging) continue;
          const range = getPairSpacingRange(prev.kind, g.kind, table, false, false);
          const kern = getKerningEm(ctx.kerningEm, prev.char, g.char);
          gaps.push({
            currentEm: g.spacingBeforeEm,
            minEm: range.minEm + kern,
            priority: range.priority,
            order: i,
            apply: (valueEm) => {
              const delta = g.spacingBeforeEm - valueEm;
              g.spacingBeforeEm = valueEm;
              currentAdvanceEm -= delta;
            },
          });
        }
        return gaps;
      };

      // 追い込み (H3): 行内のアキを圧縮して、現在の単位と次の単位を行内に収める。
      // 圧縮量の上限は各ルールの min。収まらなければ false を返し、呼び出し側は
      // 追い出しにフォールバックする。失敗時はアキを変更しない。
      const attemptPushIn = (adv: UnitAdvance, nextTotalEm: number): boolean => {
        const deficit = currentAdvanceEm + adv.totalEm + nextTotalEm - (safeCharsPerLine + 0.05);
        if (deficit <= 1e-9) return true;
        const gaps = collectLineGaps();
        gaps.push({
          currentEm: adv.beforeEm + adv.kerningEm,
          minEm: adv.range.minEm + adv.kerningEm,
          priority: adv.range.priority,
          order: currentLineGlyphs.length,
          apply: (valueEm) => {
            const delta = adv.beforeEm + adv.kerningEm - valueEm;
            adv.beforeEm -= delta;
            adv.totalEm -= delta;
          },
        });
        return tryCompressGaps(gaps, deficit);
      };

      // 行末の 1 単位を追い出す。縦中横の単位はまとめて出す。
      // ぶら下がり字は送り幅に加算されていないため currentAdvanceEm から引かない。
      // L25: 追い出した単位の配置時に直前の字に付けたトラッキングも戻す。
      // 新しい行末の字にトラッキングは残らない。
      const popLastUnit = (): void => {
        const len = currentLineUnitLens.pop();
        if (len === undefined) return;
        for (let n = 0; n < len; n++) {
          const g = currentLineGlyphs.pop();
          if (!g) break;
          if (g.isHanging) {
            lineBurasagari--;
            totalBurasagari--;
          } else {
            currentAdvanceEm = Math.max(
              0,
              currentAdvanceEm - ((g.baseAdvanceEm ?? 0) + (g.spacingBeforeEm || 0) + (g.spacingAfterEm || 0))
            );
          }
        }
        for (let i = currentLineGlyphs.length - 1; i >= 0; i--) {
          const g = currentLineGlyphs[i];
          if (!g.isHanging) {
            if (g.spacingAfterEm !== 0) {
              currentAdvanceEm = Math.max(0, currentAdvanceEm - g.spacingAfterEm);
              g.spacingAfterEm = 0;
            }
            break;
          }
        }
        unitCursor--;
      };

      while (unitCursor < units.length) {
        const unit = units[unitCursor];
        const isLineEmpty = currentLineGlyphs.length === 0;
        const adv = computeUnitAdvance(unit, prevUnitInLine, isLineEmpty, isParaStart, ctx);
        const isSingleCharUnit = !unit.tateChuYoko && unit.chars.length === 1;

        // If the line is empty, we MUST place at least one unit to guarantee forward progress
        if (isLineEmpty) {
          placeUnit(unit, adv, false);
          unitCursor++;
          prevUnitInLine = unit;
          continue;
        }

        // 行長判定 (2単位目以降で判定)
        const wouldExceed = currentAdvanceEm + adv.totalEm > safeCharsPerLine + 0.05;

        if (wouldExceed) {
          // ぶら下がり判定 (H4, M25 standard)。半角混在やツメ組みでも正確に
          // なるよう送り幅で判定する。ぶら下がった後は行を終えず次の単位を
          // 処理し、連続するぶら下がり対象 (例: 。」) もまとめてぶら下げる。
          if (
            burasagariMode !== 'none' &&
            isSingleCharUnit &&
            isBurasagariChar(unit.chars[0])
          ) {
            const ch = unit.chars[0];
            const isEndBracket = KINSOKU_CHARS.endBrackets.includes(ch);
            const prevGlyph = currentLineGlyphs[currentLineGlyphs.length - 1];
            // 先頭のぶら下がり: standard は行がほぼ満杯のときだけ、forced は
            // 満杯でなくてもぶら下げる。連続分は直前がぶら下がり字で
            // 現在が閉じ括弧のときにぶら下げる (1 行 1 字の制限を連続処理に置き換えた)。
            const firstHang =
              lineBurasagari === 0 &&
              (burasagariMode === 'forced' || currentAdvanceEm >= safeCharsPerLine - 1.5);
            const runHang =
              lineBurasagari > 0 && prevGlyph?.isHanging === true && isEndBracket;
            if (firstHang || runHang) {
              placeUnit(unit, adv, true);
              unitCursor++;
              lineBurasagari++;
              totalBurasagari++;
              continue;
            }
          }

          // 禁則処理: 追い込みを試み、だめなら追い出す
          let pushInSucceeded = false;
          const isEndProhibitedUnit = isSingleCharUnit && endProhibited.has(unit.chars[0]);
          if (config.kinsoku !== 'none' && config.kinsokuAdjust === 'push_in' && isEndProhibitedUnit) {
            const nextUnit = units[unitCursor + 1];
            if (nextUnit) {
              const nextAdv = computeUnitAdvance(nextUnit, unit, false, false, ctx);
              pushInSucceeded = attemptPushIn(adv, nextAdv.totalEm);
            }
          }
          if (!pushInSucceeded) {
            // 禁則処理: 連続する行頭禁則文字 (例: 。」) や追い出し後の末尾行末禁則 (例: 「) も連鎖的に追い出す。
            // 追い込みで収まらなかった場合のフォールバックもここで行う。
            if (config.kinsoku !== 'none') {
              while (currentLineUnitLens.length > 1) {
                const nextHead = units[unitCursor].chars[0];
                const tailGlyph = currentLineGlyphs[currentLineGlyphs.length - 1];
                const shouldPushStart = startProhibited.has(nextHead);
                const shouldPushEnd = Boolean(tailGlyph && endProhibited.has(tailGlyph.char));
                if (!shouldPushStart && !shouldPushEnd) break;
                popLastUnit();
              }
            }
            break; // 次の行へ
          }
          // 追い込み成功: そのまま配置へ進む
        }

        // 行末禁則チェック (M24: 次単位の実際の送り幅で判定。H3: push_in なら追い込む)
        // 現単位が行末禁則で、かつ続く単位が行内に収まらず現単位が行末に残る場合
        if (
          config.kinsoku !== 'none' &&
          isSingleCharUnit &&
          endProhibited.has(unit.chars[0]) &&
          unitCursor < units.length - 1
        ) {
          const nextUnit = units[unitCursor + 1];
          const nextAdv = computeUnitAdvance(nextUnit, unit, false, false, ctx);
          if (currentAdvanceEm + adv.totalEm + nextAdv.totalEm > safeCharsPerLine + 0.05) {
            let pushInOk = false;
            if (config.kinsokuAdjust === 'push_in') {
              // 追い込み優先: 行内のアキを圧縮して現単位と次単位を収める。
              // 収まらなければ追い出しと同じく現単位を次行へ回す。
              pushInOk = attemptPushIn(adv, nextAdv.totalEm);
            }
            if (!pushInOk) {
              // 追い出し: 現単位を次行へ回す。行末に始め括弧が残らないよう、
              // 末尾の行末禁則文字 (例: 既に置かれた「) も連鎖的に追い出す。
              // (追い込まずに改行するだけだと、行末が「で終わる違反が残る。)
              while (currentLineUnitLens.length > 1) {
                const tailGlyph = currentLineGlyphs[currentLineGlyphs.length - 1];
                if (!tailGlyph || !endProhibited.has(tailGlyph.char)) break;
                popLastUnit();
              }
              break;
            }
          }
        }

        // M25 forced: 行末に来るぶら下がり字は、収まる場合でもぶら下げる。
        // (standard はあふれた場合だけぶら下げる。上記の wouldExceed 分岐で処理済み。)
        if (
          burasagariMode === 'forced' &&
          isSingleCharUnit &&
          isBurasagariChar(unit.chars[0])
        ) {
          const nextUnit = units[unitCursor + 1];
          let endsLine: boolean;
          if (!nextUnit) {
            endsLine = true; // 段落末尾: 行末に来る
          } else {
            const nextAdv = computeUnitAdvance(nextUnit, unit, false, false, ctx);
            endsLine = currentAdvanceEm + adv.totalEm + nextAdv.totalEm > safeCharsPerLine + 0.05;
          }
          if (endsLine) {
            placeUnit(unit, adv, true);
            unitCursor++;
            lineBurasagari++;
            totalBurasagari++;
            continue;
          }
        }

        placeUnit(unit, adv, false);
        unitCursor++;
        prevUnitInLine = unit;
      }

      const isParaEnd = unitCursor >= units.length;
      let lineAdvanceEm = currentAdvanceEm;
      if (!isParaEnd && currentLineGlyphs.length > 0) {
        // M23: 段落の最終行以外は行長揃えで空きを埋める
        lineAdvanceEm = justifyLine(
          currentLineGlyphs,
          table,
          ctx.kerningEm,
          currentAdvanceEm,
          safeCharsPerLine
        );
      }
      lines.push({
        lineIndex: lines.length,
        glyphs: currentLineGlyphs,
        text: currentLineGlyphs.map((g) => g.char).join(''),
        isParagraphStart: isParaStart,
        isParagraphEnd: isParaEnd,
        totalAdvanceEm: lineAdvanceEm,
        isOverflown: lineAdvanceEm > safeCharsPerLine + 0.05 && lineBurasagari === 0,
        burasagariCount: lineBurasagari,
      });

      isParaStart = false;
    }

    totalCharCount += chars.length;
  }

  // L22: 平均密度は字数ベースではなく送り幅ベースで計算する。各行の
  // totalAdvanceEm (ぶら下がり字を除く実際の送り幅の合計) を行長で
  // 割る。半角文字は 0.5em のため、字数で割ると密度が過小になった。
  // 空段落による空行は組まれた行ではないため分母に入れない。あふれた行で
  // 100% を超えないよう上限を 100% とする。
  const nonEmptyLines = lines.filter((l) => l.glyphs.length > 0);
  const averageDensity =
    nonEmptyLines.length > 0
      ? Math.min(
          100,
          (nonEmptyLines.reduce((acc, l) => acc + l.totalAdvanceEm, 0) /
            (nonEmptyLines.length * safeCharsPerLine)) *
            100
        )
      : 0;

  return {
    lines,
    totalChars: totalCharCount,
    lineCount: lines.length,
    burasagariCount: totalBurasagari,
    averageDensityPercent: Math.round(averageDensity * 10) / 10,
  };
}
