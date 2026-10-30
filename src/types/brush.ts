export type BrushStyle =
  | 'brush'
  | 'signpen'
  | 'sumi'
  | 'marumoji'
  | 'fountain'
  | 'mincho_nib'
  | 'reisho_chisel'
  | 'g_pen'
  | 'pixel_dot'
  | 'marker'
  | 'ballpoint'
  | 'calligraphy'
  | 'highlighter'
  | 'pencil'
  | 'chalk'
  | 'sharp'
  | 'sharp_round'
  | 'wobbly'
  | 'polygon';

export interface PenPresetInfo {
  id: BrushStyle;
  name: string;
  shortName: string;
  category: 'natural' | 'pen' | 'chisel' | 'special';
  description: string;
  defaultWidth: number;
}

export interface PressureCurvePoint {
  x: number; // 0.0 to 1.0 (input pressure fraction)
  y: number; // 0.0 to 1.0 (output thickness fraction)
}

export interface PressureCurveConfig {
  enabled: boolean;
  p1: PressureCurvePoint; // First cubic Bezier control handle (default 0.33, 0.33)
  p2: PressureCurvePoint; // Second cubic Bezier control handle (default 0.67, 0.67)
  minThreshold: number;   // Minimum deadzone below which pressure is 0 (0.0 to 0.3)
  maxThreshold: number;   // Maximum saturation above which pressure is 1 (0.7 to 1.0)
  presetId?: 'linear' | 'soft' | 'hard' | 's-curve' | 'delicate' | 'custom';
}

export interface UserPenPreset {
  id: string;
  name: string;
  isCustom?: boolean;
  brushStyle: BrushStyle;
  brushWidth: number;
  pressureSensitivity: 'high' | 'normal' | 'low' | 'off';
  pressureCurve?: PressureCurveConfig;
  autoSmoothBrush: boolean;
  smoothStrength: 'mild' | 'standard' | 'strong';
  smoothPreserveCorners: boolean;
  autoUnionBrush: boolean;
  smoothingIntensity?: number; // 0 (OFF / Raw) to 100 (Max stabilization)
  createdAt?: number;

  // 入り抜き (Tapering)
  taperStartLength?: number;  // 0 - 100%
  taperEndLength?: number;    // 0 - 100%
  taperStartWidth?: number;   // 0 - 100%
  taperEndWidth?: number;     // 0 - 100%
  taperStartOpacity?: number; // 0 - 100%
  taperEndOpacity?: number;   // 0 - 100%
  taperStartTime?: number;    // 0 - 100%
  taperEndTime?: number;      // 0 - 100%
  forceTaper?: boolean;       // 強制入り抜き
  forceTaperEnd?: boolean;    // 強制抜き
  taperTipShape?: 'round' | 'sharp'; // 入り抜きの形状: 丸まり / 尖り

  // 形状 (Shape & Nib)
  nibAngle?: number;          // 0 - 180°
  nibAspectRatio?: number;    // 0 (丸) - 100% (極平筆・リボン)
  nibFollowDirection?: boolean; // 回転の追従 (進行方向に合わせる)
  nibSpacing?: number;        // 間隔 (1% - 100%)
  constantWidth?: boolean;    // 太さを固定
  antiAlias?: boolean;        // アンチエイリアス

  // ランダム (Random Jitter)
  jitterPosition?: number;    // 位置ランダム (0 - 100%)
  jitterConstrainPerp?: boolean; // 位置ランダムは上下に拘束
  jitterSize?: number;        // 太さランダム (0 - 100%)
  jitterOpacity?: number;     // 不透明度ランダム (0 - 100%)
  jitterAngle?: number;       // 回転ランダム (0 - 100%)
  jitterSpacing?: number;     // 間隔ランダム (0 - 100%)

  // 動的 (Dynamics)
  speedWidthFactor?: number;  // 速度による太さ変化 (-100% to +100%)
  speedOpacityFactor?: number; // 速度による不透明度変化 (-100% to +100%)
  speedFeatherFactor?: number; // 速度によるかすれ (0 - 100%)
  pressureWidthFactor?: number; // 筆圧による太さ変化 (0 - 100%)
  pressureOpacityFactor?: number; // 筆圧による不透明度変化 (0 - 100%)
  pressureFeatherFactor?: number; // 筆圧によるかすれ (0 - 100%)

  // 設定 (Settings & Stabilization)
  stabilizationMethod?: 'pre' | 'post'; // 事前補正 / 事後補正
  speedStabilization?: number; // 高速時補正強度 (0 - 100)
  legacyStabilization?: boolean; // 旧方式の事前補正

  // 質感・インク効果 (Texture & Ink Effects)
  inkBleed?: number;          // 墨にじみ (0 - 100%)
  axisSlant?: number;         // 軸の傾斜角 (-45° to +45°)
  edgeRoughness?: number;     // 輪郭の荒れ (0 - 100%)
  tipSharpness?: number;      // 尖端の鋭利さ (0 - 100%)
  pressureGamma?: number;     // 筆圧ガンマ補正 (0.5 - 2.5)
}
