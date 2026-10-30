export type ToolMode =
  | 'select'
  | 'node'
  | 'pen'
  | 'brush'
  | 'eraser'
  | 'ruler'
  | 'rect'
  | 'square'
  | 'ellipse'
  | 'circle'
  | 'rounded_rect'
  | 'triangle'
  | 'triangle_down'
  | 'right_triangle'
  | 'semicircle'
  | 'ring'
  | 'pill'
  | 'parallelogram'
  | 'crescent'
  | 'star'
  | 'heart'
  | 'sparkle'
  | 'starburst'
  | 'diamond'
  | 'polygon'
  | 'hexagon'
  | 'line'
  | 'hand'
  | 'trace_adjust';

export type ShapeType =
  | 'circle'
  | 'ellipse'
  | 'square'
  | 'rect'
  | 'rounded_rect'
  | 'triangle'
  | 'triangle_down'
  | 'right_triangle'
  | 'star'
  | 'heart'
  | 'sparkle'
  | 'starburst'
  | 'diamond'
  | 'hexagon'
  | 'polygon'
  | 'semicircle'
  | 'ring'
  | 'pill'
  | 'parallelogram'
  | 'crescent';

export interface ShapePreset {
  id: ShapeType;
  name: string;
  category: 'basic' | 'polygon' | 'symbol' | 'decorative';
  description: string;
  iconSvgPath?: string;
}

export interface GlyphOverlaySettings {
  enabled: boolean;
  referenceChar?: string;
  referenceUnicode?: number;
  opacity: number; // 0.1 to 1.0
  color: string; // Hex color code
  renderMode: 'outline' | 'fill' | 'difference';
  offsetX: number;
  offsetY: number;
  scale: number;
  showMetrics: boolean;
}

export interface TraceSettings {
  enabled: boolean;
  type: 'char' | 'image';
  text: string;
  fontFamily: string;
  fontSize: number;
  imageSrc?: string;
  charImages?: Record<number, string>; // Per-glyph individual reference photos
  opacity: number;
  scale: number;
  offsetX: number;
  offsetY: number;
  rotation?: number; // In degrees
  contrast?: number; // 0.5 to 3.0
  brightness?: number; // 0.5 to 2.0
  grayscale?: boolean;
  invert?: boolean;
  flipH?: boolean;
  flipV?: boolean;
}

export type JapaneseGuidePattern = 'none' | 'cross' | 'tian' | 'jiugong' | 'mi' | 'sixteen';
export type VerticalGuidePattern = 'none' | 'center' | 'thirds' | 'quarters' | 'eighths';

export interface GridSettings {
  showGrid: boolean;
  gridSize: number;
  snapToGrid: boolean;
  snapToPoints: boolean;
  snapToGuides?: boolean;
  showMetrics: boolean;
  showPoints: boolean;
  showHandles: boolean;
  showRulers?: boolean;
  japaneseGuide?: JapaneseGuidePattern; // 'cross' (十), 'tian' (田), 'jiugong' (九宮格 3x3), 'mi' (米字格), 'sixteen' (十六宮格 4x4)
  verticalGuide?: VerticalGuidePattern; // 'center' (X=500), 'thirds' (1/3, 2/3), 'quarters' (1/4, 2/4, 3/4), 'eighths' (8等分)
  showVerticalCenter?: boolean; // 左右中心線 (X=500)
  showVerticalGuides?: boolean; // 縦分割線 (1/4, 1/3, 1/8等)
  showBodyFrame?: boolean; // 漢字字面枠 85% (850x850)
  showKanaFrame?: boolean; // 仮名字面枠 78% (780x780)
  gridOpacity?: number; // グリッド・ガイド線の濃度 (10〜100%、デフォルト30%)
  highContrastCursor?: boolean; // 高コントラストカーソル (二重輪郭・見失い防止)
  showCursorCrosshair?: boolean; // カーソル追従照準線・照準リング
}
