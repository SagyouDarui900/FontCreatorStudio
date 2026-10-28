import React from 'react';
import { FontProject } from '../../types';
import { ThemeMode } from '../../utils/theme';
import { QualityIssueType } from '../../utils/qualityChecker';

export interface FontQualityModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: FontProject;
  setProject: React.Dispatch<React.SetStateAction<FontProject>>;
  onSelectGlyph?: (unicode: number) => void;
  theme: ThemeMode;
  onShowToast?: (text: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  commitHistory?: () => void;
}

export type TabFilter = 'all' | QualityIssueType;

export type { EqualizationMode, EqualizationScope } from './panels/StrokeEqualizerPanel';
export type { OptimizationLevel, OptimizationScope } from './panels/NodeOptimizerPanel';
export type { ExtremaSensitivity, ExtremaScope } from './panels/ExtremaOptimizerPanel';
