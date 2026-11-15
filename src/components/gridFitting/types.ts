import React from 'react';
import { FontProject } from '../../types';
import { ThemeMode } from '../../utils/theme';

export interface GridFittingModalProps {
  project: FontProject;
  setProject: React.Dispatch<React.SetStateAction<FontProject>>;
  isOpen: boolean;
  onClose: () => void;
  isLight: boolean;
  theme?: ThemeMode;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export interface StemInfo {
  id: string;
  type: 'v' | 'h';
  pos: number;
  width: number;
  alignedPos?: number;
  shiftDelta?: number;
}

export interface GridFittingConfig {
  snapStrength: number;
  minStemWidthPx: number;
  snapVertical: boolean;
  snapHorizontal: boolean;
  snapMetrics: boolean;
  adjustHandles: boolean;
}

export type RenderingMode = 'grayscale' | 'mono' | 'subpixel_lcd';
export type GridFittingTab = 'preview' | 'stems' | 'settings';
export type MobilePreviewDisplay = 'raster' | 'vector' | 'both';
export type GridFittingPresetType = 'retro' | 'web_ui' | 'soft';
