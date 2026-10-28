import {
  BrushStyle,
  UserPenPreset,
  PressureCurveConfig,
} from '../../types';
import { ThemeMode } from '../../utils/theme';

export type StudioTab =
  | 'basic'
  | 'taper'
  | 'shape'
  | 'random'
  | 'type'
  | 'dynamic'
  | 'texture'
  | 'settings';

export interface PenPresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentParams: {
    brushStyle: BrushStyle;
    brushWidth: number;
    pressureSensitivity: 'high' | 'normal' | 'low' | 'off';
    pressureCurve?: PressureCurveConfig;
    smoothingIntensity?: number;
    autoSmoothBrush: boolean;
    smoothStrength: 'mild' | 'standard' | 'strong';
    smoothPreserveCorners: boolean;
    autoUnionBrush: boolean;
    taperStartLength?: number;
    taperEndLength?: number;
    taperStartWidth?: number;
    taperEndWidth?: number;
    forceTaper?: boolean;
    forceTaperEnd?: boolean;
    taperTipShape?: 'round' | 'sharp';
    nibAngle?: number;
    nibAspectRatio?: number;
    nibFollowDirection?: boolean;
    nibSpacing?: number;
    constantWidth?: boolean;
    antiAlias?: boolean;
    speedWidthFactor?: number;
    speedOpacityFactor?: number;
    speedFeatherFactor?: number;
    pressureWidthFactor?: number;
    pressureOpacityFactor?: number;
    pressureFeatherFactor?: number;
    jitterSize?: number;
    jitterPosition?: number;
    jitterConstrainPerp?: boolean;
    jitterOpacity?: number;
    jitterAngle?: number;
    jitterSpacing?: number;
    taperStartOpacity?: number;
    taperEndOpacity?: number;
    taperStartTime?: number;
    taperEndTime?: number;
    stabilizationMethod?: 'pre' | 'post';
    speedStabilization?: number;
    legacyStabilization?: boolean;
    inkBleed?: number;
    axisSlant?: number;
    edgeRoughness?: number;
    tipSharpness?: number;
    pressureGamma?: number;
  };
  onApplyPreset: (preset: UserPenPreset) => void;
  onChangePressureCurve?: (curve: PressureCurveConfig) => void;
  presets: UserPenPreset[];
  onUpdatePresets: (newPresets: UserPenPreset[]) => void;
  theme?: ThemeMode;
}
