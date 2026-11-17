import { useState, useCallback, useEffect } from 'react';
import {
  ToolMode,
  BrushStyle,
  PressureCurveConfig,
  UserPenPreset,
} from '../types';
import {
  DEFAULT_PRESSURE_CURVES,
  DEFAULT_PEN_PRESETS,
  loadStickyBrushConfigs,
  saveStickyBrushConfig,
  loadUserPenPresets,
  clampBrushWidth,
} from '../utils/presetData';
import {
  STORAGE_KEYS,
  getBooleanStorageItem,
  setBooleanStorageItem,
  getStorageItem,
  setStorageItem,
} from '../utils/storageKeys';

const ALL_BRUSH_STYLES: BrushStyle[] = [
  'brush', 'signpen', 'sumi', 'marumoji', 'fountain', 'mincho_nib',
  'reisho_chisel', 'g_pen', 'pixel_dot', 'marker', 'ballpoint',
  'calligraphy', 'highlighter', 'pencil', 'chalk', 'sharp',
  'sharp_round', 'wobbly', 'polygon',
];

function loadSavedBrushStyle(): BrushStyle {
  const saved = getStorageItem(STORAGE_KEYS.BRUSH_STYLE);
  if (saved && (ALL_BRUSH_STYLES as string[]).includes(saved)) {
    return saved as BrushStyle;
  }
  return 'brush';
}

function loadSavedSmoothStrength(): 'mild' | 'standard' | 'strong' {
  const saved = getStorageItem(STORAGE_KEYS.SMOOTH_STRENGTH);
  if (saved === 'mild' || saved === 'standard' || saved === 'strong') return saved;
  return 'standard';
}

export function useToolState() {
  // Tool Modes & Canvas Options (Default tuned for smooth natural handwriting font creation)
  const [toolMode, setToolMode] = useState<ToolMode>('brush');
  const [brushStyle, setBrushStyle] = useState<BrushStyle>(() => loadSavedBrushStyle());
  const [brushWidth, setBrushWidth] = useState<number>(() => {
    const saved = loadStickyBrushConfigs();
    return clampBrushWidth(saved.brush?.brushWidth ?? 38);
  });
  const [pressureSensitivity, setPressureSensitivity] = useState<'high' | 'normal' | 'low' | 'off'>(() => {
    const saved = loadStickyBrushConfigs();
    return saved.brush?.pressureSensitivity ?? 'high';
  });
  const [pressureCurve, setPressureCurve] = useState<PressureCurveConfig>(() => {
    const saved = loadStickyBrushConfigs();
    return saved.brush?.pressureCurve ?? DEFAULT_PRESSURE_CURVES.soft;
  });
  const [smoothingIntensity, setSmoothingIntensity] = useState<number>(() => {
    const saved = loadStickyBrushConfigs();
    return saved.brush?.smoothingIntensity ?? 50;
  });

  // Advanced Writing Feeling Parameters
  // These values are the source of truth. GlyphCanvas receives them through
  // App and passes them into useCanvasLocalPrefs, so the drawing path uses
  // the same values. They are persisted to localStorage so a preset or
  // style change is reflected in drawing after a restart.
  const [autoSmoothBrush, setAutoSmoothBrush] = useState<boolean>(() => {
    const saved = loadStickyBrushConfigs();
    const stored = getStorageItem(STORAGE_KEYS.AUTO_SMOOTH_BRUSH);
    if (stored !== null) return stored === 'true';
    return saved.brush?.autoSmoothBrush ?? true;
  });
  const [smoothStrength, setSmoothStrength] = useState<'mild' | 'standard' | 'strong'>(() => {
    const saved = loadStickyBrushConfigs();
    const stored = loadSavedSmoothStrength();
    if (getStorageItem(STORAGE_KEYS.SMOOTH_STRENGTH) !== null) return stored;
    return saved.brush?.smoothStrength ?? 'standard';
  });
  const [smoothPreserveCorners, setSmoothPreserveCorners] = useState<boolean>(() => {
    const saved = loadStickyBrushConfigs();
    const stored = getStorageItem(STORAGE_KEYS.SMOOTH_PRESERVE_CORNERS);
    if (stored !== null) return stored === 'true';
    return saved.brush?.smoothPreserveCorners ?? true;
  });
  const [autoUnionBrush, setAutoUnionBrush] = useState<boolean>(() => {
    const saved = loadStickyBrushConfigs();
    return getBooleanStorageItem(STORAGE_KEYS.AUTO_UNION_BRUSH, saved.brush?.autoUnionBrush ?? true);
  });

  // Persist brush style and smoothing settings to localStorage on change.
  useEffect(() => {
    setStorageItem(STORAGE_KEYS.BRUSH_STYLE, brushStyle);
  }, [brushStyle]);
  useEffect(() => {
    setBooleanStorageItem(STORAGE_KEYS.AUTO_SMOOTH_BRUSH, autoSmoothBrush);
  }, [autoSmoothBrush]);
  useEffect(() => {
    setStorageItem(STORAGE_KEYS.SMOOTH_STRENGTH, smoothStrength);
  }, [smoothStrength]);
  useEffect(() => {
    setBooleanStorageItem(STORAGE_KEYS.SMOOTH_PRESERVE_CORNERS, smoothPreserveCorners);
  }, [smoothPreserveCorners]);
  useEffect(() => {
    setBooleanStorageItem(STORAGE_KEYS.AUTO_UNION_BRUSH, autoUnionBrush);
  }, [autoUnionBrush]);

  // User Writing Presets
  const [penPresets, setPenPresets] = useState<UserPenPreset[]>(() => loadUserPenPresets());
  const [activePenPreset, setActivePenPreset] = useState<UserPenPreset | undefined>(() => {
    const loaded = loadUserPenPresets();
    return loaded[0] || DEFAULT_PEN_PRESETS[0];
  });

  // Sticky Brush Settings: Change style and automatically restore saved parameters
  const handleChangeBrushStyle = useCallback((newStyle: BrushStyle) => {
    setActivePenPreset(undefined);
    setBrushStyle(newStyle);
    const configs = loadStickyBrushConfigs();
    const targetConfig = configs[newStyle];
    if (targetConfig) {
      if (typeof targetConfig.brushWidth === 'number') {
        setBrushWidth(targetConfig.brushWidth);
      }
      if (targetConfig.pressureSensitivity) {
        setPressureSensitivity(targetConfig.pressureSensitivity);
      }
      if (targetConfig.pressureCurve) {
        setPressureCurve(targetConfig.pressureCurve);
      }
      if (typeof targetConfig.smoothingIntensity === 'number') {
        setSmoothingIntensity(targetConfig.smoothingIntensity);
      }
      if (typeof targetConfig.autoSmoothBrush === 'boolean') {
        setAutoSmoothBrush(targetConfig.autoSmoothBrush);
      }
      if (targetConfig.smoothStrength) {
        setSmoothStrength(targetConfig.smoothStrength);
      }
      if (typeof targetConfig.smoothPreserveCorners === 'boolean') {
        setSmoothPreserveCorners(targetConfig.smoothPreserveCorners);
      }
      if (typeof targetConfig.autoUnionBrush === 'boolean') {
        setAutoUnionBrush(targetConfig.autoUnionBrush);
      }
    }
  }, []);

  const handleChangeBrushWidth = useCallback((newWidth: number) => {
    const clamped = clampBrushWidth(newWidth);
    setBrushWidth(clamped);
    saveStickyBrushConfig(brushStyle, { brushWidth: clamped });
  }, [brushStyle]);

  const handleChangePressureSensitivity = useCallback((newSensitivity: 'high' | 'normal' | 'low' | 'off') => {
    setPressureSensitivity(newSensitivity);
    saveStickyBrushConfig(brushStyle, { pressureSensitivity: newSensitivity });
  }, [brushStyle]);

  const handleChangePressureCurve = useCallback((newCurve: PressureCurveConfig) => {
    setPressureCurve(newCurve);
    saveStickyBrushConfig(brushStyle, { pressureCurve: newCurve });
  }, [brushStyle]);

  const handleChangeSmoothingIntensity = useCallback((newIntensity: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(newIntensity)));
    setSmoothingIntensity(clamped);
    saveStickyBrushConfig(brushStyle, { smoothingIntensity: clamped });
  }, [brushStyle]);

  // Adjust brush size via [ / ] keys
  const handleAdjustBrushSize = useCallback((delta: number) => {
    setBrushWidth((current: number) => {
      const next = clampBrushWidth(current + delta);
      saveStickyBrushConfig(brushStyle, { brushWidth: next });
      return next;
    });
  }, [brushStyle]);

  const handleApplyPenPreset = useCallback((preset: UserPenPreset) => {
    const clampedWidth = clampBrushWidth(preset.brushWidth);
    setActivePenPreset(preset);
    setBrushStyle(preset.brushStyle);
    setBrushWidth(clampedWidth);
    setPressureSensitivity(preset.pressureSensitivity);
    if (preset.pressureCurve) {
      setPressureCurve(preset.pressureCurve);
    }
    if (typeof preset.smoothingIntensity === 'number') {
      setSmoothingIntensity(preset.smoothingIntensity);
    }
    setAutoSmoothBrush(preset.autoSmoothBrush);
    setSmoothStrength(preset.smoothStrength);
    setSmoothPreserveCorners(preset.smoothPreserveCorners);
    setAutoUnionBrush(preset.autoUnionBrush);
    saveStickyBrushConfig(preset.brushStyle, {
      brushWidth: clampedWidth,
      pressureSensitivity: preset.pressureSensitivity,
      pressureCurve: preset.pressureCurve,
      smoothingIntensity: preset.smoothingIntensity,
      autoSmoothBrush: preset.autoSmoothBrush,
      smoothStrength: preset.smoothStrength,
      smoothPreserveCorners: preset.smoothPreserveCorners,
      autoUnionBrush: preset.autoUnionBrush,
    });
  }, []);

  return {
    toolMode,
    setToolMode,
    brushStyle,
    setBrushStyle,
    brushWidth,
    setBrushWidth,
    pressureSensitivity,
    setPressureSensitivity,
    pressureCurve,
    setPressureCurve,
    smoothingIntensity,
    setSmoothingIntensity,
    autoSmoothBrush,
    setAutoSmoothBrush,
    smoothStrength,
    setSmoothStrength,
    smoothPreserveCorners,
    setSmoothPreserveCorners,
    autoUnionBrush,
    setAutoUnionBrush,
    penPresets,
    setPenPresets,
    activePenPreset,
    setActivePenPreset,
    handleChangeBrushStyle,
    handleChangeBrushWidth,
    handleChangePressureSensitivity,
    handleChangePressureCurve,
    handleChangeSmoothingIntensity,
    handleAdjustBrushSize,
    handleApplyPenPreset,
  };
}
