import React from 'react';
import { FontProject } from '../../types';
import { ThemeMode } from '../../utils/theme';

export interface OpenTypeFeaturesModalProps {
  project: FontProject;
  setProject: React.Dispatch<React.SetStateAction<FontProject>>;
  isOpen: boolean;
  onClose: () => void;
  isLight: boolean;
  theme?: ThemeMode;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  /** Commit project-level config history before feature changes. */
  commitProjectHistory?: () => void;
}

export type OpenTypeTab = 'vert' | 'liga' | 'gpos' | 'palt' | 'preview';

export const isOpenTypeTab = (value: string): value is OpenTypeTab =>
  value === 'vert' || value === 'liga' || value === 'gpos' || value === 'palt' || value === 'preview';

export interface VertPresetInfo {
  name: string;
  char: string;
  sourceUnicode: number;
  vertUnicode: number;
  vertChar: string;
}

export interface LigaturePresetInfo {
  id: string;
  name: string;
  type: 'liga' | 'dlig';
  inputChars: string[];
  substituteUnicode: number;
}
