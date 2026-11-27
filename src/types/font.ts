import { PathContour } from './geometry';
import { GlyphData } from './glyph';
import { OpenTypeFeaturesConfig, MojikumiConfig } from './mojikumi';
import { TraceSettings } from './canvas';

/**
 * Trace settings as stored in a project. Underdrawing images (data URLs)
 * are excluded: they are large and are kept only in memory.
 */
export type StoredTraceSettings = Omit<TraceSettings, 'imageSrc' | 'charImages'>;

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

export type RadicalPlacement =
  | 'auto'
  | 'original'
  | 'hen'
  | 'tsukuri'
  | 'kanmuri'
  | 'ashi'
  | 'tare'
  | 'nyo'
  | 'kamae'
  | 'center_small';

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

export interface IvsGlyphVariant {
  /** Key in `${baseHex}_${selectorHex}` format, e.g. "8FBB_E0101" */
  id: string;
  /** Base character Unicode code point, e.g. 0x8FBB ('辻') */
  baseUnicode: number;
  /** Variation selector code point, e.g. 0xE0101 (VS18) or 0xFE00 (VS1) */
  selectorCode: number;
  /** Optional IVD collection or label (e.g. "Adobe-Japan1", "Moji_Joho", "Custom") */
  collection?: string;
  /** Optional user note describing the variant difference */
  note?: string;
  /** Variant glyph contours/pixelData/metrics */
  glyph: GlyphData;
  updatedAt?: number;
}

export function formatIvsVariantKey(baseUnicode: number, selectorCode: number): string {
  const baseHex = Math.max(0, Math.round(baseUnicode)).toString(16).toUpperCase().padStart(4, '0');
  const selHex = Math.max(0, Math.round(selectorCode)).toString(16).toUpperCase().padStart(4, '0');
  return `${baseHex}_${selHex}`;
}

export interface FontProject {
  id: string;
  name: string;
  metadata: FontMetadata;
  glyphs: Record<number, GlyphData>;
  /** OpenType cmap format 14 Unicode/Ideographic Variation Sequence variants */
  ivsVariants?: Record<string, IvsGlyphVariant>;
  kerning?: Record<string, number>; // Pair string "char1,char2", "U+XXXX,U+XXXX", "0xXXXX,0xXXXX" or "decimal1,decimal2" -> offset in font units
  openTypeFeatures?: OpenTypeFeaturesConfig;
  pixelFontSettings?: PixelFontProjectSettings;
  /** Trace underdrawing settings, without image data (see StoredTraceSettings). */
  traceSettings?: StoredTraceSettings;
  /** @deprecated Alias for backwards compatibility; prefer openTypeFeatures.mojikumi */
  mojikumiSettings?: MojikumiConfig;
  createdAt: number;
  updatedAt: number;
}
