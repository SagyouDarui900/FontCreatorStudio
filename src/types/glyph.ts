import { Point, PathContour } from './geometry';

export type PixelDotShape = 'square' | 'round' | 'squircle' | 'diamond';

export interface PixelGlyphData {
  width: number;
  height: number;
  data: number[]; // 0 or 1 binary array of length width * height
  shape?: PixelDotShape;
  advanceWidthCells?: number;
}

export interface GlyphData {
  unicode: number;
  char: string;
  name: string;
  advanceWidth: number;
  lsb: number;
  contours: PathContour[];
  vectorContoursBackup?: PathContour[];
  pixelData?: PixelGlyphData;
  modified?: boolean;
  notes?: string;
  locked?: boolean;
  updatedAt?: number;
}

export interface CustomGuideline {
  id: string;
  type: 'h' | 'v' | 'diagonal';
  position: number;
  p1?: { x: number; y: number };
  p2?: { x: number; y: number };
  angle?: number;
  label?: string;
  color?: string;
}

export interface SnapMetrics {
  lsb: number;
  advanceWidth: number;
  baseline: number;
  ascender: number;
  capHeight: number;
  xHeight: number;
  descender: number;
}

export interface RulerMeasurement {
  start: Point;
  end: Point;
  active: boolean;
}

export interface SnapGuideLine {
  id: string;
  type: 'h' | 'v' | 'diagonal';
  position: number;
  targetName: string;
  targetType: 'baseline' | 'lsb' | 'rsb' | 'metric' | 'contour' | 'center' | 'custom' | 'grid';
  color?: string;
  snapPoint?: Point;
  matchedSource?: string;
  p1?: Point;
  p2?: Point;
  angle?: number;
}
