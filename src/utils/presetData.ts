import { UserPenPreset, BrushStyle, PressureCurveConfig } from '../types';

export const DEFAULT_PRESSURE_CURVES: Record<string, PressureCurveConfig> = {
  linear: {
    enabled: true,
    p1: { x: 0.33, y: 0.33 },
    p2: { x: 0.67, y: 0.67 },
    minThreshold: 0.0,
    maxThreshold: 1.0,
    presetId: 'linear',
  },
  soft: {
    enabled: true,
    p1: { x: 0.22, y: 0.38 },
    p2: { x: 0.50, y: 0.85 },
    minThreshold: 0.0,
    maxThreshold: 0.95,
    presetId: 'soft',
  },
  hard: {
    enabled: true,
    p1: { x: 0.50, y: 0.10 },
    p2: { x: 0.85, y: 0.45 },
    minThreshold: 0.05,
    maxThreshold: 1.0,
    presetId: 'hard',
  },
  's-curve': {
    enabled: true,
    p1: { x: 0.40, y: 0.10 },
    p2: { x: 0.60, y: 0.90 },
    minThreshold: 0.0,
    maxThreshold: 1.0,
    presetId: 's-curve',
  },
  delicate: {
    enabled: true,
    p1: { x: 0.30, y: 0.15 },
    p2: { x: 0.75, y: 0.60 },
    minThreshold: 0.02,
    maxThreshold: 1.0,
    presetId: 'delicate',
  },
};

export const DEFAULT_PEN_PRESETS: UserPenPreset[] = [
  {
    id: 'preset-brush-standard',
    name: '毛筆・かな用（高感度・標準補正）',
    brushStyle: 'brush',
    brushWidth: 42,
    pressureSensitivity: 'high',
    pressureCurve: DEFAULT_PRESSURE_CURVES.soft,
    autoSmoothBrush: true,
    smoothStrength: 'standard',
    smoothPreserveCorners: true,
    autoUnionBrush: true,
    smoothingIntensity: 55,
  },
  {
    id: 'preset-fountain-nib',
    name: '高級万年筆（繊細・細字）',
    brushStyle: 'fountain',
    brushWidth: 26,
    pressureSensitivity: 'high',
    pressureCurve: DEFAULT_PRESSURE_CURVES.delicate,
    autoSmoothBrush: true,
    smoothStrength: 'mild',
    smoothPreserveCorners: true,
    autoUnionBrush: true,
    smoothingIntensity: 45,
  },
  {
    id: 'preset-calligraphy-chisel',
    name: '西洋カリグラフィー（固定45°）',
    brushStyle: 'calligraphy',
    brushWidth: 38,
    pressureSensitivity: 'normal',
    pressureCurve: DEFAULT_PRESSURE_CURVES.linear,
    autoSmoothBrush: true,
    smoothStrength: 'mild',
    smoothPreserveCorners: true,
    autoUnionBrush: true,
    smoothingIntensity: 40,
  },
  {
    id: 'preset-sumi-thick',
    name: '和風・墨だまり筆（力強い太字）',
    brushStyle: 'sumi',
    brushWidth: 54,
    pressureSensitivity: 'high',
    pressureCurve: DEFAULT_PRESSURE_CURVES['s-curve'],
    autoSmoothBrush: true,
    smoothStrength: 'standard',
    smoothPreserveCorners: true,
    autoUnionBrush: true,
    smoothingIntensity: 60,
  },
  {
    id: 'preset-signpen-uniform',
    name: '均一サインペン（筆圧OFF・強力補正）',
    brushStyle: 'signpen',
    brushWidth: 22,
    pressureSensitivity: 'off',
    pressureCurve: DEFAULT_PRESSURE_CURVES.linear,
    autoSmoothBrush: true,
    smoothStrength: 'strong',
    smoothPreserveCorners: false,
    autoUnionBrush: true,
    smoothingIntensity: 75,
  },
  {
    id: 'preset-marumoji-pop',
    name: '丸文字ポップペン（筆圧OFF・丸角）',
    brushStyle: 'marumoji',
    brushWidth: 36,
    pressureSensitivity: 'off',
    pressureCurve: DEFAULT_PRESSURE_CURVES.linear,
    autoSmoothBrush: true,
    smoothStrength: 'strong',
    smoothPreserveCorners: false,
    autoUnionBrush: true,
    smoothingIntensity: 80,
  },
  {
    id: 'preset-pencil-sketch',
    name: 'スケッチ鉛筆（高感度・ナチュラル）',
    brushStyle: 'pencil',
    brushWidth: 16,
    pressureSensitivity: 'high',
    pressureCurve: DEFAULT_PRESSURE_CURVES.soft,
    autoSmoothBrush: false,
    smoothStrength: 'mild',
    smoothPreserveCorners: true,
    autoUnionBrush: true,
    smoothingIntensity: 20,
  },
  {
    id: 'preset-sharp-angular',
    name: 'カクカク角筆（直線・幾何学ピクセル調）',
    brushStyle: 'sharp',
    brushWidth: 36,
    pressureSensitivity: 'off',
    pressureCurve: DEFAULT_PRESSURE_CURVES.linear,
    autoSmoothBrush: false,
    smoothStrength: 'mild',
    smoothPreserveCorners: true,
    autoUnionBrush: true,
    smoothingIntensity: 0,
  },
  {
    id: 'preset-sharp-round',
    name: 'カクカク角丸筆（幾何学骨格・モダン角丸）',
    brushStyle: 'sharp_round',
    brushWidth: 36,
    pressureSensitivity: 'off',
    pressureCurve: DEFAULT_PRESSURE_CURVES.linear,
    autoSmoothBrush: false,
    smoothStrength: 'mild',
    smoothPreserveCorners: true,
    autoUnionBrush: true,
    smoothingIntensity: 0,
  },
];

const PRESETS_STORAGE_KEY = 'mojisaku_user_pen_presets';
const STICKY_BRUSH_MEMORY_KEY = 'mojisaku_sticky_brush_configs';

export interface StickyBrushConfig {
  brushWidth: number;
  pressureSensitivity: 'high' | 'normal' | 'low' | 'off';
  pressureCurve?: PressureCurveConfig;
  autoSmoothBrush?: boolean;
  smoothStrength?: 'mild' | 'standard' | 'strong';
  smoothPreserveCorners?: boolean;
  autoUnionBrush?: boolean;
  smoothingIntensity?: number;
}

export const DEFAULT_BRUSH_CONFIGS: Record<BrushStyle, StickyBrushConfig> = {
  brush: { brushWidth: 42, pressureSensitivity: 'high', pressureCurve: DEFAULT_PRESSURE_CURVES.soft, autoSmoothBrush: true, smoothStrength: 'standard', smoothPreserveCorners: true, autoUnionBrush: true, smoothingIntensity: 55 },
  fountain: { brushWidth: 26, pressureSensitivity: 'high', pressureCurve: DEFAULT_PRESSURE_CURVES.delicate, autoSmoothBrush: true, smoothStrength: 'mild', smoothPreserveCorners: true, autoUnionBrush: true, smoothingIntensity: 45 },
  calligraphy: { brushWidth: 38, pressureSensitivity: 'normal', pressureCurve: DEFAULT_PRESSURE_CURVES.linear, autoSmoothBrush: true, smoothStrength: 'mild', smoothPreserveCorners: true, autoUnionBrush: true, smoothingIntensity: 40 },
  sumi: { brushWidth: 54, pressureSensitivity: 'high', pressureCurve: DEFAULT_PRESSURE_CURVES['s-curve'], autoSmoothBrush: true, smoothStrength: 'standard', smoothPreserveCorners: true, autoUnionBrush: true, smoothingIntensity: 60 },
  signpen: { brushWidth: 22, pressureSensitivity: 'off', pressureCurve: DEFAULT_PRESSURE_CURVES.linear, autoSmoothBrush: true, smoothStrength: 'strong', smoothPreserveCorners: false, autoUnionBrush: true, smoothingIntensity: 75 },
  marumoji: { brushWidth: 36, pressureSensitivity: 'off', pressureCurve: DEFAULT_PRESSURE_CURVES.linear, autoSmoothBrush: true, smoothStrength: 'strong', smoothPreserveCorners: false, autoUnionBrush: true, smoothingIntensity: 80 },
  mincho_nib: { brushWidth: 42, pressureSensitivity: 'high', pressureCurve: DEFAULT_PRESSURE_CURVES.delicate, autoSmoothBrush: true, smoothStrength: 'standard', smoothPreserveCorners: true, autoUnionBrush: true, smoothingIntensity: 50 },
  reisho_chisel: { brushWidth: 48, pressureSensitivity: 'normal', pressureCurve: DEFAULT_PRESSURE_CURVES.linear, autoSmoothBrush: true, smoothStrength: 'mild', smoothPreserveCorners: true, autoUnionBrush: true, smoothingIntensity: 40 },
  g_pen: { brushWidth: 32, pressureSensitivity: 'high', pressureCurve: DEFAULT_PRESSURE_CURVES['s-curve'], autoSmoothBrush: true, smoothStrength: 'mild', smoothPreserveCorners: true, autoUnionBrush: true, smoothingIntensity: 45 },
  pixel_dot: { brushWidth: 28, pressureSensitivity: 'off', pressureCurve: DEFAULT_PRESSURE_CURVES.linear, autoSmoothBrush: false, smoothStrength: 'mild', smoothPreserveCorners: true, autoUnionBrush: true, smoothingIntensity: 0 },
  marker: { brushWidth: 32, pressureSensitivity: 'off', pressureCurve: DEFAULT_PRESSURE_CURVES.linear, autoSmoothBrush: true, smoothStrength: 'standard', smoothPreserveCorners: false, autoUnionBrush: true, smoothingIntensity: 50 },
  ballpoint: { brushWidth: 14, pressureSensitivity: 'normal', pressureCurve: DEFAULT_PRESSURE_CURVES.linear, autoSmoothBrush: true, smoothStrength: 'mild', smoothPreserveCorners: true, autoUnionBrush: true, smoothingIntensity: 45 },
  highlighter: { brushWidth: 40, pressureSensitivity: 'off', pressureCurve: DEFAULT_PRESSURE_CURVES.linear, autoSmoothBrush: true, smoothStrength: 'mild', smoothPreserveCorners: true, autoUnionBrush: true, smoothingIntensity: 35 },
  pencil: { brushWidth: 16, pressureSensitivity: 'high', pressureCurve: DEFAULT_PRESSURE_CURVES.soft, autoSmoothBrush: false, smoothStrength: 'mild', smoothPreserveCorners: true, autoUnionBrush: true, smoothingIntensity: 20 },
  chalk: { brushWidth: 28, pressureSensitivity: 'normal', pressureCurve: DEFAULT_PRESSURE_CURVES.linear, autoSmoothBrush: false, smoothStrength: 'mild', smoothPreserveCorners: true, autoUnionBrush: true, smoothingIntensity: 30 },
  sharp: { brushWidth: 36, pressureSensitivity: 'off', pressureCurve: DEFAULT_PRESSURE_CURVES.linear, autoSmoothBrush: false, smoothStrength: 'mild', smoothPreserveCorners: true, autoUnionBrush: true, smoothingIntensity: 0 },
  sharp_round: { brushWidth: 36, pressureSensitivity: 'off', pressureCurve: DEFAULT_PRESSURE_CURVES.linear, autoSmoothBrush: false, smoothStrength: 'mild', smoothPreserveCorners: true, autoUnionBrush: true, smoothingIntensity: 0 },
  wobbly: { brushWidth: 24, pressureSensitivity: 'normal', pressureCurve: DEFAULT_PRESSURE_CURVES.linear, autoSmoothBrush: false, smoothStrength: 'mild', smoothPreserveCorners: true, autoUnionBrush: true, smoothingIntensity: 15 },
  polygon: { brushWidth: 32, pressureSensitivity: 'off', pressureCurve: DEFAULT_PRESSURE_CURVES.linear, autoSmoothBrush: false, smoothStrength: 'mild', smoothPreserveCorners: true, autoUnionBrush: true, smoothingIntensity: 0 },
};

export function loadStickyBrushConfigs(): Record<BrushStyle, StickyBrushConfig> {
  try {
    const stored = localStorage.getItem(STICKY_BRUSH_MEMORY_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_BRUSH_CONFIGS, ...parsed };
    }
  } catch (e) {
    console.warn('Failed to load sticky brush configs from localStorage', e);
  }
  return { ...DEFAULT_BRUSH_CONFIGS };
}

export function saveStickyBrushConfig(style: BrushStyle, config: Partial<StickyBrushConfig>): boolean {
  try {
    const current = loadStickyBrushConfigs();
    current[style] = {
      ...(current[style] || DEFAULT_BRUSH_CONFIGS[style] || { brushWidth: 30, pressureSensitivity: 'normal' }),
      ...config,
    };
    localStorage.setItem(STICKY_BRUSH_MEMORY_KEY, JSON.stringify(current));
    return true;
  } catch (e) {
    console.warn('Failed to save sticky brush config', e);
    return false;
  }
}

/** ブラシ幅の範囲。モーダル、ツールバー、ステッパー、適用、インポートで統一する。 */
export const BRUSH_WIDTH_MIN = 4;
export const BRUSH_WIDTH_MAX = 150;

export function clampBrushWidth(width: number): number {
  if (typeof width !== 'number' || !isFinite(width)) return 38;
  return Math.max(BRUSH_WIDTH_MIN, Math.min(BRUSH_WIDTH_MAX, Math.round(width)));
}

/**
 * インポート要素の検証。要素がオブジェクトであること、id と name が
 * 文字列であることを確認する。brushWidth が数値の場合は範囲内に収める。
 * brushWidth が数値でない場合は既定値 38 を入れる。
 */
export function isValidPenPresetShape(value: unknown): value is UserPenPreset {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.id === 'string' && candidate.id.length > 0
    && typeof candidate.name === 'string' && candidate.name.length > 0;
}

export function sanitizeImportedPenPreset(value: unknown): UserPenPreset | null {
  if (!isValidPenPresetShape(value)) return null;
  const brushWidth = typeof value.brushWidth === 'number'
    ? clampBrushWidth(value.brushWidth)
    : 38;
  return { ...value, brushWidth };
}

/**
 * インポートした配列を検証する。有効な要素だけを返し、既存の一覧や
 * インポート内での id の重複には新しい id を振り直す。
 * 戻り値は { valid, invalidCount, remappedCount }。
 */
export function validateImportedPenPresets(
  parsed: unknown,
  existingIds: Set<string>
): { valid: UserPenPreset[]; invalidCount: number; remappedCount: number } {
  const valid: UserPenPreset[] = [];
  let invalidCount = 0;
  let remappedCount = 0;
  if (!Array.isArray(parsed)) return { valid, invalidCount: 0, remappedCount: 0 };
  const seen = new Set<string>(existingIds);
  parsed.forEach((item, index) => {
    const preset = sanitizeImportedPenPreset(item);
    if (!preset) {
      invalidCount += 1;
      return;
    }
    if (seen.has(preset.id)) {
      preset.id = `preset-imported-${Date.now()}-${index}`;
      remappedCount += 1;
    }
    seen.add(preset.id);
    valid.push(preset);
  });
  return { valid, invalidCount, remappedCount };
}

/** 名前の重複を避ける。重複する場合は「名前 2」「名前 3」のように番号を付ける。 */
export function makeUniquePresetName(name: string, existingNames: Set<string>, selfId?: string, presets?: UserPenPreset[]): string {
  const base = name.trim() || 'カスタムペン';
  const taken = new Set<string>();
  for (const n of existingNames) taken.add(n);
  if (presets && selfId) {
    const self = presets.find((p) => p.id === selfId);
    if (self) taken.delete(self.name);
  }
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base} ${n}`)) n += 1;
  return `${base} ${n}`;
}

export function loadUserPenPresets(): UserPenPreset[] {
  try {
    const stored = localStorage.getItem(PRESETS_STORAGE_KEY);
    if (stored === null) {
      return DEFAULT_PEN_PRESETS;
    }
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return DEFAULT_PEN_PRESETS;
    }
    // 保存された空配列は空の一覧として維持する。キーが存在しない場合だけ
    // 既定プリセットを返す。
    return parsed.filter((item): item is UserPenPreset => isValidPenPresetShape(item));
  } catch (e) {
    console.warn('Failed to load pen presets from localStorage', e);
  }
  return DEFAULT_PEN_PRESETS;
}

export function saveUserPenPresets(presets: UserPenPreset[]): boolean {
  try {
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
    return true;
  } catch (e) {
    console.warn('Failed to save pen presets to localStorage', e);
    return false;
  }
}
