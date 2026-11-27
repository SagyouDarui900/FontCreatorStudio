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
  | 'polygon'
  | 'double_line'
  | 'dotted'
  | 'bristle'
  | 'reed'
  | 'round_nib'
  | 'fine_brush';

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

/**
 * Extended preset fields and their drawing connection (strokePointsToOutline):
 * Connected: taperStartOpacity, taperEndOpacity, jitterOpacity (width
 * approximation, because a filled vector outline has no opacity channel),
 * jitterPosition, jitterConstrainPerp, jitterAngle, speedFeatherFactor,
 * pressureWidthFactor, pressureFeatherFactor, pressureGamma, constantWidth,
 * inkBleed, axisSlant, edgeRoughness, tipSharpness, taperStartTime,
 * taperEndTime (the taper zone is capped by the distance covered in the
 * first/last X% of the stroke duration), nibSpacing (the outline sampling
 * interval), jitterSpacing (per-segment variation of that interval),
 * stabilizationMethod (pre: smooth the centreline before resampling;
 * post: carry the correction in the width smoothing instead),
 * speedStabilization (extra smoothing where the stroke is fast),
 * legacyStabilization (the old 3-point box pre-correction),
 * lineCap (round: the existing semicircular cap; square: a flat cap
 * extended by half the width; butt: no cap extension),
 * lineJoin (miter: the existing pointed corner at sharp turns; round:
 * a smoothed corner; bevel: a flat-cut corner),
 * taperCurve (linear: the existing interpolation unchanged; gentle /
 * steep warp the taper progress),
 * minWidth / maxWidth (per-side clamp of the half-widths),
 * inkPooling (extra width near the start and at sharp turns),
 * roughnessScale (grain size of the edgeRoughness noise; 50 keeps the
 * existing grain), brushFlex (causal lag of width changes).
 * Not connected, kept in the type for import compatibility and shown in
 * the modal with a note instead of an editor: speedOpacityFactor,
 * pressureOpacityFactor (a filled vector outline has no opacity channel,
 * and the width channel is already covered by the speed/pressure width
 * and feather factors, so mapping them to width would duplicate those
 * controls), antiAlias (vector outline data only; a display matter).
 * doubleLineGap / dottedSpacing are used by the round-B double-line and
 * dotted pens (double_line / dotted). For other styles they have no
 * drawing effect. When the style is double_line / dotted and the field
 * is absent, the drawing uses 30 (% of the stroke width) as the style
 * default; an explicit 0 draws a single solid line.
 * Smoothing itself is applied through smoothingIntensity / autoSmoothBrush.
 */
export interface UserPenPreset {
  id: string;
  name: string;
  isCustom?: boolean;
  brushStyle: BrushStyle;
  brushWidth: number;
  // 太さの最小・最大の直接指定 (px, brushWidth と同じ単位)。
  // minWidth 0 = 制限なし。maxWidth undefined または 0 = 制限なし。
  minWidth?: number;
  maxWidth?: number;
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
  // 入り抜きの細り方の曲線。'linear' (既定) は既存の補間 (taperTipShape
  // による曲線) をそのまま使う。'gentle' は細り方を緩やかに、'steep'
  // は急にする。
  taperCurve?: 'linear' | 'gentle' | 'steep';

  // 形状 (Shape & Nib)
  nibAngle?: number;          // 0 - 180°
  nibAspectRatio?: number;    // 0 (丸) - 100% (極平筆・リボン)
  nibFollowDirection?: boolean; // 回転の追従 (進行方向に合わせる)
  nibSpacing?: number;        // 間隔 (1% - 100%)
  constantWidth?: boolean;    // 太さを固定
  antiAlias?: boolean;        // アンチエイリアス
  // 線端の形状。既定 'round' (既存の半円キャップ)。
  lineCap?: 'round' | 'square' | 'butt';
  // 角の接合。既定 'miter' (既存の尖った角と同じ)。
  lineJoin?: 'miter' | 'round' | 'bevel';
  // 二重線の間隔 (0 - 100)。既定 0。ラウンドBの二重線ペンで使用。
  doubleLineGap?: number;
  // 点線の間隔 (0 - 100)。既定 0。ラウンドBの点線・破線ペンで使用。
  dottedSpacing?: number;

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
  // 筆のしなり: 筆圧の変化に対する太さの追従の遅れ (0 - 100%)。
  // 既定 0 (遅れなし)。
  brushFlex?: number;

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
  // 墨だまりの強さ (0 - 100%)。既定 0。書き始めと角の付近の太さを増やす。
  inkPooling?: number;
  // 荒れの粒の大きさ (0 - 100)。既定 50 (既存の粒の大きさと同じ)。
  // 大きいほど粒が大きい。edgeRoughness が 0 のときは効果がない。
  roughnessScale?: number;
}
