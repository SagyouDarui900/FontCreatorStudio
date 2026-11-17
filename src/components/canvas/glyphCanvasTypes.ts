import React from 'react';
import {
  PathContour,
  BrushStyle,
  ToolMode,
  TraceSettings,
  GridSettings,
  GlyphOverlaySettings,
  FontProject,
  PressureCurveConfig,
  UserPenPreset,
} from '../../types';
import { ThemeMode } from '../../utils/theme';

export interface GlyphCanvasProps {
  contours: PathContour[];
  onChangeContours: (contours: PathContour[], options?: { skipHistory?: boolean }) => void;
  advanceWidth: number;
  lsb: number;
  onChangeAdvanceWidth: (w: number, options?: { skipHistory?: boolean }) => void;
  onChangeLsb: (lsb: number, options?: { skipHistory?: boolean }) => void;
  toolMode: ToolMode;
  onSetToolMode?: (mode: ToolMode) => void;
  brushWidth: number;
  brushStyle?: BrushStyle;
  onChangeBrushStyle?: (style: BrushStyle) => void;
  onChangeBrushWidth?: (w: number) => void;
  onAdjustBrushSize?: (delta: number) => void;
  // Smoothing / union settings. When provided, App (useToolState) is the
  // source of truth and these values drive drawing through
  // useCanvasLocalPrefs. When omitted, useCanvasLocalPrefs falls back to
  // its own localStorage-backed state.
  autoSmoothBrush?: boolean;
  onChangeAutoSmoothBrush?: (enabled: boolean) => void;
  smoothStrength?: 'mild' | 'standard' | 'strong';
  onChangeSmoothStrength?: (strength: 'mild' | 'standard' | 'strong') => void;
  smoothPreserveCorners?: boolean;
  onChangeSmoothPreserveCorners?: (enabled: boolean) => void;
  autoUnionBrush?: boolean;
  onChangeAutoUnionBrush?: (enabled: boolean) => void;
  // Called with a reset function that restores the drawing-side smoothing
  // settings and the pen stroke width to defaults.
  onRegisterResetCanvasPrefs?: (reset: () => void) => void;
  pressureSensitivity?: 'high' | 'normal' | 'low' | 'off';
  onChangePressureSensitivity?: (val: 'high' | 'normal' | 'low' | 'off') => void;
  pressureCurve?: PressureCurveConfig;
  smoothingIntensity?: number;
  onChangeSmoothingIntensity?: (val: number) => void;
  traceSettings: TraceSettings;
  onChangeTraceSettings?: React.Dispatch<React.SetStateAction<TraceSettings>>;
  selectedUnicode: number;
  gridSettings: GridSettings;
  onChangeGridSettings?: React.Dispatch<React.SetStateAction<GridSettings>>;
  activeChar: string;
  onSelectPrevGlyph?: () => void;
  onSelectNextGlyph?: () => void;
  onSelectPrevUncompletedGlyph?: () => void;
  onSelectNextUncompletedGlyph?: () => void;
  isGlyphLocked?: boolean;
  onCommitHistory?: () => void;
  theme: ThemeMode;
  onCopyFromChar?: (char: string) => void;
  onGenerateDakutenTarget?: (char: string, isHandaku?: boolean) => void;
  onDuplicateAsSmallKana?: (sourceUnicode: number) => void;
  onOpenGlyphSynthesisModal?: () => void;
  onCopySelectedContours?: (contourIds: string[]) => void;
  onPasteSelectedContours?: () => void;
  hasClipboard?: boolean;
  onToggleGridDrawer?: () => void;
  showGridDrawer?: boolean;
  onToggleMetricsDrawer?: () => void;
  showMetricsDrawer?: boolean;
  onToggleRadicals?: () => void;
  showRadicals?: boolean;
  onToggleZenMode?: () => void;
  isZenMode?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onOpenPenPresetsModal?: () => void;
  activePenPreset?: UserPenPreset;
  isAnyModalOpen?: boolean;
  overlaySettings?: GlyphOverlaySettings;
  project: FontProject;
  onOpenGlyphCompareModal?: () => void;
  outlineOnly?: boolean;
  onChangeOutlineOnly?: (val: boolean) => void;
  onSelectionChange?: (selection: {
    contourIds: string[];
    nodeId: string | null;
    handleType: 'node' | 'handleIn' | 'handleOut' | null;
  }) => void;
}
