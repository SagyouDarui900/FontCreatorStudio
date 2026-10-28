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
  onChangeAdvanceWidth: (w: number) => void;
  onChangeLsb: (lsb: number) => void;
  toolMode: ToolMode;
  onSetToolMode?: (mode: ToolMode) => void;
  brushWidth: number;
  brushStyle?: BrushStyle;
  onChangeBrushStyle?: (style: BrushStyle) => void;
  onChangeBrushWidth?: (w: number) => void;
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
  onCommitHistory?: () => void;
  theme: ThemeMode;
  onCopyFromChar?: (char: string) => void;
  onGenerateDakutenTarget?: (char: string, isHandaku?: boolean) => void;
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
}
