export interface OpenTypeFeatureLigature {
  id: string;
  type: 'liga' | 'dlig' | 'rlig';
  name: string;
  inputChars: string[];
  substituteUnicode: number;
  enabled: boolean;
}

export interface VerticalWritingGlyphSub {
  id: string;
  sourceUnicode: number;
  vertUnicode: number;
  yOffset?: number;
  xOffset?: number;
  vertAdvanceHeight?: number;
  enabled: boolean;
}

export type MojikumiPresetId =
  | 'beta'
  | 'tsume'
  | 'gyomatsu_yakumono_hankan'
  | 'yakumono_hankan'
  | 'gyomatsu_yakumono_zenkaku'
  | 'yakumono_zenkaku'
  | 'gyomatsu_zen_han'
  | 'custom';

export type KinsokuSetId = 'strong' | 'weak' | 'weak_v2' | 'none';
export type BurasagariMode = 'none' | 'standard' | 'forced';
export type KinsokuAdjustMode = 'push_in' | 'push_out';
export type ParagraphIndentPresetId = 'none' | 'visual_half' | 'visual_full' | 'visual_full_half';

export interface MojikumiRuleItem {
  min: number;      // % (e.g. 0 = 0% = beta, 50 = 50% = half em)
  optimal: number;  // %
  max: number;      // %
  priority: number; // 0 to 9 (1-9 processed first in ascending order, 0 processed last)
}

export interface MojikumiTable {
  // 行末設定
  endBracket_to_lineEnd: MojikumiRuleItem;
  touten_to_lineEnd: MojikumiRuleItem;
  kuten_to_lineEnd: MojikumiRuleItem;
  middleDot_to_lineEnd: MojikumiRuleItem;
  // 行頭設定
  paraStart_to_startBracket: MojikumiRuleItem;
  paraStart_to_nonYakumono: MojikumiRuleItem;
  lineStart_to_startBracket: MojikumiRuleItem;
  // 行中設定
  nonYakumono_to_startBracket: MojikumiRuleItem;
  endBracket_to_nonYakumono: MojikumiRuleItem;
  endBracket_to_startBracket: MojikumiRuleItem;
  touten_to_startBracket: MojikumiRuleItem;
  touten_to_nonYakumono: MojikumiRuleItem;
  kuten_to_startBracket: MojikumiRuleItem;
  kuten_to_nonYakumono: MojikumiRuleItem;
  middleDot_around: MojikumiRuleItem;
  // 欧文の前後
  halfLatin_around_nonYakumono: MojikumiRuleItem;
  halfDigit_around_nonYakumono: MojikumiRuleItem;
}

export interface MojikumiConfig {
  preset: MojikumiPresetId;
  table: MojikumiTable;
  kinsoku: KinsokuSetId;
  kinsokuAdjust: KinsokuAdjustMode;
  burasagari: BurasagariMode;
  paragraphIndent: ParagraphIndentPresetId;
}

export interface PaltGlyphMetric {
  unicode: number;
  char: string;
  originalAdvance: number;
  proportionalAdvance: number;
  xPlacement: number;
  deltaAdvance: number;
  opticalMarginLeft: number;
  opticalMarginRight: number;
  enabled: boolean;
}

export interface VpalGlyphMetric {
  unicode: number;
  char: string;
  originalAdvance: number;
  proportionalAdvance: number;
  yPlacement: number;
  deltaAdvance: number;
  opticalMarginTop: number;
  opticalMarginBottom: number;
  enabled: boolean;
}

export interface ProportionalMetricsConfig {
  enabled: boolean;
  autoDerivePalt: boolean;
  autoDeriveVpal: boolean;
  opticalSideBearingPercent: number; // Default 5%
  paltList: PaltGlyphMetric[];
  vpalList: VpalGlyphMetric[];
}

export interface OpenTypeFeaturesConfig {
  enabled: boolean;
  verticalWriting: {
    enabled: boolean;
    defaultVertAdvance: number;
    vertOriginY: number;
    substitutions: VerticalWritingGlyphSub[];
  };
  ligatures: OpenTypeFeatureLigature[];
  customKerningPairs: {
    id: string;
    firstUnicode: number;
    secondUnicode: number;
    amount: number;
    enabled: boolean;
  }[];
  palt?: ProportionalMetricsConfig;
  mojikumi?: MojikumiConfig;
}
