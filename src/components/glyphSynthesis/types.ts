import React from 'react';
import { FontProject } from '../../types';
import { ThemeMode } from '../../utils/theme';

export type SynthesisTab = 'dakuten' | 'smallKana';
export type KanaScope = 'all' | 'hiragana' | 'katakana';

export interface GlyphSynthesisModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: FontProject;
  setProject?: React.Dispatch<React.SetStateAction<FontProject>>;
  onUpdateProject?: (updater: (prev: FontProject) => FontProject) => void;
  commitHistory?: (targetUnicode?: number) => void;
  showToast?: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  onShowToast?: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  theme: ThemeMode;
}

export interface DakutenSourceItem {
  char: string;
  code: number;
  daku?: string;
  handaku?: string;
  hasContours: boolean;
}

export interface SmallKanaSourceItem {
  char: string;
  code: number;
  smallChar: string;
  smallUnicode: number;
  hasContours: boolean;
}
