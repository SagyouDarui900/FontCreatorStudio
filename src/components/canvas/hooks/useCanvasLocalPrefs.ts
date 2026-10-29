import { useState, useCallback } from 'react';
import {
  STORAGE_KEYS,
  getBooleanStorageItem,
  setBooleanStorageItem,
} from '../../../utils/storageKeys';

export interface UseCanvasLocalPrefsProps {
  propOutlineOnly?: boolean;
  onChangeOutlineOnly?: (enabled: boolean) => void;
}

export function useCanvasLocalPrefs({
  propOutlineOnly,
  onChangeOutlineOnly,
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
  const [autoSmoothBrush, setAutoSmoothBrush] = useState<boolean>(true);

  // 合体 (Auto Union)
  const [autoUnionBrush, setAutoUnionBrush] = useState<boolean>(() => {
    return getBooleanStorageItem(STORAGE_KEYS.AUTO_UNION_BRUSH, true);
  });

  // 一筆書きの線が交差・重なった部分の白抜き防止
  const [autoResolveBrushOverlap, setAutoResolveBrushOverlap] = useState<boolean>(() => {
    return getBooleanStorageItem(STORAGE_KEYS.AUTO_UNION_BRUSH, true);
  });

  const [smoothStrength, setSmoothStrength] = useState<'mild' | 'standard' | 'strong'>('standard');
  const [smoothPreserveCorners, setSmoothPreserveCorners] = useState<boolean>(true);

  // Bottom Floating Bar Compact/Expand State (desktop)
  const [isBottomBarCollapsed, setIsBottomBarCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('mojisaku_bottom_bar_collapsed');
      if (saved !== null) return saved === 'true';
      return false;
    } catch {
      return false;
    }
  });

  const toggleBottomBarCollapse = useCallback(() => {
    setIsBottomBarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('mojisaku_bottom_bar_collapsed', String(next));
      } catch {
        // Ignored
      }
      return next;
    });
  }, []);

  // Palm Rejection Mode
  const [palmRejectionMode, setPalmRejectionMode] = useState<'auto' | 'strict_pen_only' | 'off'>(() => {
    try {
      const saved = localStorage.getItem('mojisaku_palm_rejection_mode');
      if (saved === 'auto' || saved === 'strict_pen_only' || saved === 'off') return saved;
    } catch {
      // fallback
    }
    return 'auto';
  });

  const handleSetPalmRejectionMode = useCallback((mode: 'auto' | 'strict_pen_only' | 'off') => {
    setPalmRejectionMode(mode);
    try {
      localStorage.setItem('mojisaku_palm_rejection_mode', mode);
    } catch {
      // Ignored
    }
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
    setAutoResolveBrushOverlap,
    smoothStrength,
    setSmoothStrength,
    smoothPreserveCorners,
    setSmoothPreserveCorners,
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
