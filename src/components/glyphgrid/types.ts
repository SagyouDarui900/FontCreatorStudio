import { FontProject, GlyphData } from '../../types';
import { ThemeMode } from '../../utils/theme';

export type GridDensity = 'large' | 'medium' | 'compact';

export interface ContextMenuItem {
  char: string;
  code: number;
  name?: string;
}

export interface ContextMenuState {
  x: number;
  y: number;
  item: ContextMenuItem;
}

export interface GlyphGridProps {
  project: FontProject;
  selectedUnicode: number;
  onSelectGlyph: (unicode: number, char: string) => void;
  onClearGlyph: (unicode: number) => void;
  onCopyGlyph: (unicode: number) => void;
  onPasteGlyph: (unicode: number) => void;
  onDuplicateAsSmallKana?: (sourceUnicode: number) => void;
  onGenerateDakutenTarget?: (targetChar: string, isHandakuten: boolean) => void;
  onOpenGlyphSynthesisModal?: () => void;
  onOpenKerningModal?: () => void;
  onOpenQualityModal?: () => void;
  hasClipboard: boolean;
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeMode;
  isOverlay?: boolean;
}
