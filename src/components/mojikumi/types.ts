import React from 'react';
import { FontProject } from '../../types';
import { ThemeMode } from '../../utils/theme';

export type EditorialLayoutMode =
  | 'book_spread'
  | 'manuscript'
  | 'magazine'
  | 'poetry'
  | 'compare3';

export type MojikumiMobileTab = 'preview' | 'styles' | 'settings' | 'texts';
export type MojikumiSidebarTab = 'text' | 'dimensions' | 'mojikumi' | 'kinsoku';
export type MojikumiFontSource = 'custom' | 'mincho' | 'gothic';

export interface MojikumiStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: FontProject;
  setProject: React.Dispatch<React.SetStateAction<FontProject>>;
  theme: ThemeMode;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  onOpenOpenTypeModal?: () => void;
  onOpenTestPreview?: () => void;
}
