import React from 'react';
import { FontProject } from '../../types';
import { ThemeMode } from '../../utils/theme';

export type EditorialLayoutMode =
  | 'book_spread'
  | 'manuscript'
  | 'magazine'
  | 'poetry'
  | 'compare3';

export type MojikumiMobileTab = 'preview' | 'settings' | 'texts';
export type MojikumiSidebarTab = 'text' | 'dimensions' | 'mojikumi' | 'kinsoku';
export type MojikumiFontSource = 'custom' | 'mincho' | 'gothic';

export interface MojikumiStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: FontProject;
  setProject: React.Dispatch<React.SetStateAction<FontProject>>;
  theme: ThemeMode;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  // L19: モーダル内では未使用だが、AppModalsHost がこの prop を渡すため
  // 削除しない。削除する場合は呼び出し側（担当外）も同時に直すこと。
  onOpenOpenTypeModal?: () => void;
  onOpenTestPreview?: () => void;
  /** Commit project-level config history before saving the mojikumi config. */
  commitProjectHistory?: () => void;
}
