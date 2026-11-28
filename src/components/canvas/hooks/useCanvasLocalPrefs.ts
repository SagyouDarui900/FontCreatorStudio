import { useState, useCallback } from 'react';
import {
  STORAGE_KEYS,
  getBooleanStorageItem,
  setBooleanStorageItem,
  getStorageItem,
  setStorageItem,
} from '../../../utils/storageKeys';

export interface UseCanvasLocalPrefsProps {
  propOutlineOnly?: boolean;
  onChangeOutlineOnly?: (enabled: boolean) => void;
  // Smoothing / union settings controlled by App (useToolState is the
  // source of truth). When a prop is provided, the prop value is used and
  // changes are reported through the matching onChange callback; the
  // internal state is only a fallback when the prop is absent. Every
  // change is also written to localStorage so the value survives restart.
  propAutoSmoothBrush?: boolean;
  onChangeAutoSmoothBrush?: (enabled: boolean) => void;
  propSmoothStrength?: 'mild' | 'standard' | 'strong';
  onChangeSmoothStrength?: (strength: 'mild' | 'standard' | 'strong') => void;
  propSmoothPreserveCorners?: boolean;
  onChangeSmoothPreserveCorners?: (enabled: boolean) => void;
  propAutoUnionBrush?: boolean;
  onChangeAutoUnionBrush?: (enabled: boolean) => void;
}

export function useCanvasLocalPrefs({
  propOutlineOnly,
  onChangeOutlineOnly,
  propAutoSmoothBrush,
  onChangeAutoSmoothBrush,
  propSmoothStrength,
  onChangeSmoothStrength,
  propSmoothPreserveCorners,
  onChangeSmoothPreserveCorners,
  propAutoUnionBrush,
  onChangeAutoUnionBrush,
}: UseCanvasLocalPrefsProps) {
  // Pen Mode: 'bezier' (smooth bezier curves) or 'corner' (sharp angular polyline)
  const [penMode, setPenMode] = useState<'bezier' | 'corner'>('bezier');

  // Node Points Visibility Toggle
  const [showNodes, setShowNodes] = useState<boolean>(true);

  // Node appearance style: 'clean', 'full', 'selected_only'
  const [nodeStyle, setNodeStyle] = useState<'clean' | 'full' | 'selected_only'>('clean');

  // Outline-Only (Wireframe) Mode (輪郭表示)
  const [internalOutlineOnly, setInternalOutlineOnly] = useState<boolean>(() => {
    return getBooleanStorageItem(STORAGE_KEYS.OUTLINE_MODE, false);
  });

  const isOutlineMode = propOutlineOnly !== undefined ? propOutlineOnly : internalOutlineOnly;

  const setOutlineOnly = useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      const nextVal = typeof value === 'function' ? value(isOutlineMode) : value;
      if (onChangeOutlineOnly) {
        onChangeOutlineOnly(nextVal);
      }
      setInternalOutlineOnly(nextVal);
      setBooleanStorageItem(STORAGE_KEYS.OUTLINE_MODE, nextVal);
    },
    [isOutlineMode, onChangeOutlineOnly]
  );

  // Typography Writing Guide Assist Card state
  const [showGuideAssist, setShowGuideAssist] = useState<boolean>(() => {
    return getBooleanStorageItem(STORAGE_KEYS.GUIDE_ASSIST_OPEN, false);
  });

  const handleToggleGuideAssist = useCallback((open?: boolean) => {
    setShowGuideAssist((prev) => {
      const next = typeof open === 'boolean' ? open : !prev;
      setBooleanStorageItem(STORAGE_KEYS.GUIDE_ASSIST_OPEN, next);
      return next;
    });
  }, []);

  // Sub-toolbar visibility (collapsible)
  const [showSubToolbar, setShowSubToolbar] = useState<boolean>(() => {
    return getBooleanStorageItem(STORAGE_KEYS.SHOW_SUBTOOLBAR, true);
  });

  const handleToggleSubToolbar = useCallback(() => {
    setShowSubToolbar((prev) => {
      const next = !prev;
      setBooleanStorageItem(STORAGE_KEYS.SHOW_SUBTOOLBAR, next);
      return next;
    });
  }, []);

  // Stroke Smoothing Options & Real-time Auto-Smooth
  const [internalAutoSmoothBrush, setInternalAutoSmoothBrush] = useState<boolean>(() => {
    return getBooleanStorageItem(STORAGE_KEYS.AUTO_SMOOTH_BRUSH, true);
  });
  const autoSmoothBrush = propAutoSmoothBrush !== undefined ? propAutoSmoothBrush : internalAutoSmoothBrush;
  const setAutoSmoothBrush = useCallback((value: boolean | ((prev: boolean) => boolean)) => {
    const nextVal = typeof value === 'function' ? value(autoSmoothBrush) : value;
    setBooleanStorageItem(STORAGE_KEYS.AUTO_SMOOTH_BRUSH, nextVal);
    if (onChangeAutoSmoothBrush) {
      onChangeAutoSmoothBrush(nextVal);
    } else {
      setInternalAutoSmoothBrush(nextVal);
    }
  }, [autoSmoothBrush, onChangeAutoSmoothBrush]);

  // 合体 (Auto Union)
  const [internalAutoUnionBrush, setInternalAutoUnionBrush] = useState<boolean>(() => {
    return getBooleanStorageItem(STORAGE_KEYS.AUTO_UNION_BRUSH, true);
  });
  const autoUnionBrush = propAutoUnionBrush !== undefined ? propAutoUnionBrush : internalAutoUnionBrush;
  const setAutoUnionBrush = useCallback((value: boolean | ((prev: boolean) => boolean)) => {
    const nextVal = typeof value === 'function' ? value(autoUnionBrush) : value;
    setBooleanStorageItem(STORAGE_KEYS.AUTO_UNION_BRUSH, nextVal);
    if (onChangeAutoUnionBrush) {
      onChangeAutoUnionBrush(nextVal);
    } else {
      setInternalAutoUnionBrush(nextVal);
    }
  }, [autoUnionBrush, onChangeAutoUnionBrush]);

  // 一筆書きの線が交差・重なった部分の白抜き防止
  // autoUnionBrush とは別の保存キーを使う。以前は両方が同じ
  // fcs_auto_union_brush を読んでいたため、片方の変更がもう片方に反映された。
  const [autoResolveBrushOverlap, setAutoResolveBrushOverlap] = useState<boolean>(() => {
    return getBooleanStorageItem(STORAGE_KEYS.AUTO_RESOLVE_BRUSH_OVERLAP, true);
  });
  const handleSetAutoResolveBrushOverlap = useCallback((value: boolean | ((prev: boolean) => boolean)) => {
    setAutoResolveBrushOverlap((prev) => {
      const nextVal = typeof value === 'function' ? value(prev) : value;
      setBooleanStorageItem(STORAGE_KEYS.AUTO_RESOLVE_BRUSH_OVERLAP, nextVal);
      return nextVal;
    });
  }, []);

  const [internalSmoothStrength, setInternalSmoothStrength] = useState<'mild' | 'standard' | 'strong'>(() => {
    const saved = getStorageItem(STORAGE_KEYS.SMOOTH_STRENGTH);
    if (saved === 'mild' || saved === 'standard' || saved === 'strong') return saved;
    return 'standard';
  });
  const smoothStrength = propSmoothStrength !== undefined ? propSmoothStrength : internalSmoothStrength;
  const setSmoothStrength = useCallback((value: 'mild' | 'standard' | 'strong' | ((prev: 'mild' | 'standard' | 'strong') => 'mild' | 'standard' | 'strong')) => {
    const nextVal = typeof value === 'function' ? value(smoothStrength) : value;
    setStorageItem(STORAGE_KEYS.SMOOTH_STRENGTH, nextVal);
    if (onChangeSmoothStrength) {
      onChangeSmoothStrength(nextVal);
    } else {
      setInternalSmoothStrength(nextVal);
    }
  }, [smoothStrength, onChangeSmoothStrength]);

  const [internalSmoothPreserveCorners, setInternalSmoothPreserveCorners] = useState<boolean>(() => {
    return getBooleanStorageItem(STORAGE_KEYS.SMOOTH_PRESERVE_CORNERS, true);
  });
  const smoothPreserveCorners = propSmoothPreserveCorners !== undefined ? propSmoothPreserveCorners : internalSmoothPreserveCorners;
  const setSmoothPreserveCorners = useCallback((value: boolean | ((prev: boolean) => boolean)) => {
    const nextVal = typeof value === 'function' ? value(smoothPreserveCorners) : value;
    setBooleanStorageItem(STORAGE_KEYS.SMOOTH_PRESERVE_CORNERS, nextVal);
    if (onChangeSmoothPreserveCorners) {
      onChangeSmoothPreserveCorners(nextVal);
    } else {
      setInternalSmoothPreserveCorners(nextVal);
    }
  }, [smoothPreserveCorners, onChangeSmoothPreserveCorners]);

  // Reset the drawing-side smoothing / union settings to defaults.
  const resetCanvasLocalPrefs = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEYS.AUTO_SMOOTH_BRUSH.primary);
      localStorage.removeItem(STORAGE_KEYS.SMOOTH_STRENGTH.primary);
      localStorage.removeItem(STORAGE_KEYS.SMOOTH_PRESERVE_CORNERS.primary);
      localStorage.removeItem(STORAGE_KEYS.AUTO_UNION_BRUSH.primary);
      localStorage.removeItem(STORAGE_KEYS.AUTO_RESOLVE_BRUSH_OVERLAP.primary);
    } catch {
      // Ignored
    }
    setInternalAutoSmoothBrush(true);
    setInternalSmoothStrength('standard');
    setInternalSmoothPreserveCorners(true);
    setInternalAutoUnionBrush(true);
    setAutoResolveBrushOverlap(true);
    onChangeAutoSmoothBrush?.(true);
    onChangeSmoothStrength?.('standard');
    onChangeSmoothPreserveCorners?.(true);
    onChangeAutoUnionBrush?.(true);
  }, [onChangeAutoSmoothBrush, onChangeSmoothStrength, onChangeSmoothPreserveCorners, onChangeAutoUnionBrush]);

  // Bottom Floating Bar Compact/Expand State (desktop)
  const [isBottomBarCollapsed, setIsBottomBarCollapsed] = useState<boolean>(() => {
    return getBooleanStorageItem(STORAGE_KEYS.BOTTOM_BAR_COLLAPSED, false);
  });

  const toggleBottomBarCollapse = useCallback(() => {
    setIsBottomBarCollapsed((prev) => {
      const next = !prev;
      setBooleanStorageItem(STORAGE_KEYS.BOTTOM_BAR_COLLAPSED, next);
      return next;
    });
  }, []);

  // Palm Rejection Mode
  const [palmRejectionMode, setPalmRejectionMode] = useState<'auto' | 'strict_pen_only' | 'off'>(() => {
    const saved = getStorageItem(STORAGE_KEYS.PALM_REJECTION_MODE);
    if (saved === 'auto' || saved === 'strict_pen_only' || saved === 'off') return saved;
    return 'auto';
  });

  const handleSetPalmRejectionMode = useCallback((mode: 'auto' | 'strict_pen_only' | 'off') => {
    setPalmRejectionMode(mode);
    setStorageItem(STORAGE_KEYS.PALM_REJECTION_MODE, mode);
  }, []);

  // Mobile UI View Modes & Bottom Action Sheets
  const [isMobileFocusMode, setIsMobileFocusMode] = useState<boolean>(false);
  const [isMobileAuxMenuOpen, setIsMobileAuxMenuOpen] = useState<boolean>(false);
  const [showMobilePartSheet, setShowMobilePartSheet] = useState<boolean>(false);
  const [showMobileBrushSheet, setShowMobileBrushSheet] = useState<boolean>(false);
  const [showMobileGuidesSheet, setShowMobileGuidesSheet] = useState<boolean>(false);

  return {
    penMode,
    setPenMode,
    showNodes,
    setShowNodes,
    nodeStyle,
    setNodeStyle,
    isOutlineMode,
    setOutlineOnly,
    showGuideAssist,
    setShowGuideAssist,
    handleToggleGuideAssist,
    showSubToolbar,
    setShowSubToolbar,
    handleToggleSubToolbar,
    autoSmoothBrush,
    setAutoSmoothBrush,
    autoUnionBrush,
    setAutoUnionBrush,
    autoResolveBrushOverlap,
    setAutoResolveBrushOverlap: handleSetAutoResolveBrushOverlap,
    smoothStrength,
    setSmoothStrength,
    smoothPreserveCorners,
    setSmoothPreserveCorners,
    resetCanvasLocalPrefs,
    isBottomBarCollapsed,
    setIsBottomBarCollapsed,
    toggleBottomBarCollapse,
    palmRejectionMode,
    setPalmRejectionMode,
    handleSetPalmRejectionMode,
    isMobileFocusMode,
    setIsMobileFocusMode,
    isMobileAuxMenuOpen,
    setIsMobileAuxMenuOpen,
    showMobilePartSheet,
    setShowMobilePartSheet,
    showMobileBrushSheet,
    setShowMobileBrushSheet,
    showMobileGuidesSheet,
    setShowMobileGuidesSheet,
  };
}
