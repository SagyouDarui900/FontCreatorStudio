import {
  EqualizationMode,
  EqualizationScope,
} from './panels/StrokeEqualizerPanel';
import {
  OptimizationLevel,
  OptimizationScope,
} from './panels/NodeOptimizerPanel';
import {
  ExtremaSensitivity,
  ExtremaScope,
} from './panels/ExtremaOptimizerPanel';

export const isEqualizationMode = (value: string): value is EqualizationMode =>
  value === 'balanced' || value === 'boost_thin' || value === 'shrink_thick';

export const isOptimizationScope = (value: string): value is OptimizationScope =>
  value === 'all' || value === 'excessive' || value === 'filtered';

export const isEqualizationScope = (value: string): value is EqualizationScope =>
  value === 'all' || value === 'uneven' || value === 'filtered';

export const isOptimizationLevel = (value: string): value is OptimizationLevel =>
  value === 'mild' || value === 'normal' || value === 'strong';

export const isExtremaSensitivity = (value: string): value is ExtremaSensitivity =>
  value === 'normal' || value === 'strict' || value === 'fine';

export const isExtremaScope = (value: string): value is ExtremaScope =>
  value === 'all' || value === 'missing' || value === 'filtered';
