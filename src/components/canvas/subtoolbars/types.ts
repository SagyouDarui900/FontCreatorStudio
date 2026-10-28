import React from 'react';
import {
  BrushStyle,
  CustomGuideline,
  GridSettings,
  PathContour,
  RulerMeasurement,
  ToolMode,
} from '../../../types';
import { ThemeClasses } from '../../../utils/theme';

export interface CanvasSubToolbarProps {
  isMobileFocusMode: boolean;
  showSubToolbar: boolean;
  handleToggleSubToolbar: () => void;
  themeClasses: ThemeClasses;
  isLight: boolean;
  onSelectPrevGlyph?: () => void;
  onSelectNextGlyph?: () => void;
  activeChar: string;
  selectedUnicode?: number;
  onGenerateDakutenTarget?: (targetChar: string, isHandakuten: boolean) => void;
  showCanvasToast: (msg: string, sub?: string) => void;
  showNodes: boolean;
  setShowNodes: React.Dispatch<React.SetStateAction<boolean>>;
  isOutlineMode: boolean;
  setOutlineOnly: React.Dispatch<React.SetStateAction<boolean>>;
  gridSettings: GridSettings;
  onChangeGridSettings?: React.Dispatch<React.SetStateAction<GridSettings>>;
  toolMode: ToolMode;
  setShowMobileBrushSheet: (show: boolean) => void;
  brushStyle: BrushStyle;
  onChangeBrushStyle?: (style: BrushStyle) => void;
  brushWidth: number;
  onChangeBrushWidth?: (w: number) => void;
  onOpenPenPresetsModal?: () => void;
  pressureSensitivity: 'high' | 'normal' | 'low' | 'off';
  onChangePressureSensitivity?: (s: 'high' | 'normal' | 'low' | 'off') => void;
  isStylusActive: boolean;
  liveStylusPressure: number | null;
  autoResolveBrushOverlap: boolean;
  setAutoResolveBrushOverlap: (val: boolean) => void;
  autoUnionBrush: boolean;
  setAutoUnionBrush: (val: boolean) => void;
  brushStraightMode: boolean;
  setBrushStraightMode: (val: boolean) => void;
  autoSmoothBrush: boolean;
  setAutoSmoothBrush: (val: boolean) => void;
  smoothStrength: 'mild' | 'standard' | 'strong';
  setSmoothStrength: (val: 'mild' | 'standard' | 'strong') => void;
  handleStraightenWobblySelected: () => void;
  penMode: 'bezier' | 'corner';
  setPenMode: (mode: 'bezier' | 'corner') => void;
  penStrokeWidth: number;
  handleSetPenStrokeWidth: (w: number) => void;
  penCapStyle: 'round' | 'butt' | 'square';
  handleSetPenCapStyle: (cap: 'round' | 'butt' | 'square') => void;
  eraserMode: 'stroke' | 'cut' | 'all' | 'node';
  setEraserMode: (mode: 'stroke' | 'cut' | 'all' | 'node') => void;
  eraserSize: number;
  setEraserSize: React.Dispatch<React.SetStateAction<number>>;
  isShapeTool: boolean;
  rulerMeasurement: RulerMeasurement | null;
  handleDrawRulerAsStroke: () => void;
  handleConvertRulerToGuideline: (mode?: 'auto' | 'diagonal' | 'h' | 'v') => void;
  setRulerMeasurement: (r: RulerMeasurement | null) => void;
  customGuidelines: CustomGuideline[];
  setCustomGuidelines: React.Dispatch<React.SetStateAction<CustomGuideline[]>>;
  lockGuidelines: boolean;
  setLockGuidelines: React.Dispatch<React.SetStateAction<boolean>>;
  contours: PathContour[];
  handleClearAll: () => void;
  selectedContourIds: string[];
  selectedContourId: string | null;
  setSelectedContourIds: (ids: string[]) => void;
  setSelectedContourId: (id: string | null) => void;
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  setSelectedHandleType: (t: 'node' | 'handleIn' | 'handleOut' | null) => void;
  handleRotateSelected: (deg: number) => void;
  handleFlipHSelected: () => void;
  handleFlipVSelected: () => void;
  handleMergeSelectedContours: () => void;
  handleDuplicateSelected: () => void;
  handleDeleteSelected: () => void;
  handleSmoothStrokeSelected: (strength?: 'mild' | 'standard' | 'strong', keepShape?: boolean) => void;
  handleSimplifySelected: (tol?: number) => void;
  handleExpandStrokeSelected: () => void;
  handleSubtractSelectedContours: () => void;
  handleIntersectSelectedContours: () => void;
  handleSlantSelected: (deg: number) => void;
  handleReverseWindingSelected: () => void;
  handleConvertToSmoothSelected: () => void;
  handleConvertToCornersSelected: () => void;
  handleToggleNodeType: (contourId: string, nodeId: string) => void;
  handleDeleteSelectedNode: () => void;
  handleClearAllGuidelines: () => void;
  isGuideEraserActive: boolean;
  setIsGuideEraserActive: React.Dispatch<React.SetStateAction<boolean>>;
  nodeStyle: 'full' | 'clean' | 'selected_only';
  setNodeStyle: (s: 'full' | 'clean' | 'selected_only') => void;
  smoothPreserveCorners: boolean;
  setSmoothPreserveCorners: (val: boolean) => void;
  isShiftLockRatio: boolean;
  setIsShiftLockRatio: React.Dispatch<React.SetStateAction<boolean>>;
  isAltFromCenter: boolean;
  setIsAltFromCenter: React.Dispatch<React.SetStateAction<boolean>>;
}
