import React from 'react';
import { FontProject, PathContour } from '../../types';
import { ThemeMode } from '../../utils/theme';

export interface TestPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: FontProject;
  setProject?: React.Dispatch<React.SetStateAction<FontProject>>;
  onSelectGlyphForEdit?: (unicode: number) => void;
  theme: ThemeMode;
  onShowToast?: (msg: string, type?: 'success' | 'info' | 'error') => void;
  onOpenMojikumiStudio?: () => void;
}

export interface SelectedCharInfo {
  char: string;
  unicode: number;
  lineIndex: number;
  charIndex: number;
}

export type WritingMode = 'horizontal' | 'vertical';
export type TextAlignMode = 'left' | 'center' | 'right' | 'justify';

export interface SamplePreset {
  name: string;
  mode: WritingMode;
  text: string;
}
