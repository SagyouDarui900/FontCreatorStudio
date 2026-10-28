import React from 'react';
import { FontProject, PixelDotShape } from '../../types';

export type PixelGridPreset = '4x4' | '5x7' | '8x8' | '12x12' | '16x16' | '24x24' | '32x32' | '64x64' | '128x128' | 'custom';
export type PixelDrawTool = 'pencil' | 'eraser' | 'bucket' | 'line' | 'rect' | 'rect_filled' | 'circle' | 'circle_filled';
export type { PixelDotShape };
export type BrushStampShape = 'square' | 'round';

export interface PixelFontStudioModalProps {
  project: FontProject;
  setProject: React.Dispatch<React.SetStateAction<FontProject>>;
  isOpen: boolean;
  onClose: () => void;
  isLight: boolean;
  selectedUnicode: number;
  onSelectGlyph?: (unicode: number) => void;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}
