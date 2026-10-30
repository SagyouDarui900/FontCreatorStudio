import { PathContour } from './geometry';
import { GlyphData } from './glyph';
import { OpenTypeFeaturesConfig, MojikumiConfig } from './mojikumi';

export interface FontMetadata {
  familyName: string;
  styleName: string;
  designer: string;
  designerUrl?: string;
  manufacturer?: string;
  copyright: string;
  license?: string;
  licenseUrl?: string;
  version: string;
  description?: string;
  unitsPerEm: number;
  ascender: number;
  descender: number;
  lineGap: number;
  capHeight: number;
  xHeight: number;
  // FontForge OS/2 & hhea & post Table Metadata
  usWeightClass?: number; // 100-900 (400=Regular, 700=Bold)
  usWidthClass?: number;  // 1-9 (5=Normal)
  typoAscender?: number;  // OS/2 sTypoAscender
  typoDescender?: number; // OS/2 sTypoDescender
  typoLineGap?: number;   // OS/2 sTypoLineGap
  winAscent?: number;     // OS/2 usWinAscent
  winDescent?: number;    // OS/2 usWinDescent
  italicAngle?: number;   // post italicAngle
  isFixedPitch?: boolean; // post isFixedPitch
  vendorId?: string;      // OS/2 achVendID (e.g. "FTCG")
}

export interface KanjiRadical {
  id: string;
  name: string;
  char: string;
  category: 'hen' | 'tsukuri' | 'kanmuri' | 'ashi' | 'tare' | 'nyo' | 'kamae' | 'basic';
  contours: PathContour[];
}

export type RadicalPlacement = 'auto' | 'original' | 'hen' | 'tsukuri' | 'kanmuri' | 'ashi' | 'center_small';

export type PartCategory =
  | 'all'
  | 'hen'
  | 'tsukuri'
  | 'kanmuri'
  | 'ashi'
  | 'tare'
  | 'nyo'
  | 'kamae'
  | 'stroke'
  | 'geometric'
  | 'kana'
  | 'other';

export interface CustomPart {
  id: string;
  name: string;
  char?: string;
  category?: PartCategory;
  description?: string;
  contours: PathContour[];
  createdAt: number;
  updatedAt?: number;
  tags?: string[];
}

export interface CharCategory {
  id: string;
  name: string;
  nameEn: string;
  range?: [number, number];
  chars?: string[];
  charList?: { char: string; code: number; name?: string }[];
}

export interface PixelFontProjectSettings {
  isPixelFontProject?: boolean;
  defaultWidth: number;
  defaultHeight: number;
  dotShape: 'square' | 'round' | 'squircle' | 'diamond';
  mergeContours: boolean;
  proportionalSpacing?: boolean;
}

export interface FontProject {
  id: string;
  name: string;
  metadata: FontMetadata;
  glyphs: Record<number, GlyphData>;
  kerning?: Record<string, number>; // Pair string "char1,char2" or "unicode1,unicode2" -> offset in font units
  openTypeFeatures?: OpenTypeFeaturesConfig;
  pixelFontSettings?: PixelFontProjectSettings;
  /** @deprecated Alias for backwards compatibility; prefer openTypeFeatures.mojikumi */
  mojikumiSettings?: MojikumiConfig;
  createdAt: number;
  updatedAt: number;
}
