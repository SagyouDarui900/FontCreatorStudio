import { PathContour, GlyphData } from '../../types';
import { ThemeMode } from '../../utils/theme';

export const CUSTOM_PARTS_STORAGE_KEY = 'font_editor_custom_parts_v1';

export type DrawerTab = 'preset' | 'extract' | 'kangxi' | 'shapes' | 'from_glyph' | 'custom';

export interface RadicalsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertRadical: (contours: PathContour[]) => void;
  currentContours: PathContour[];
  selectedChar: string;
  allGlyphs: Record<number, GlyphData>;
  theme: ThemeMode;
  onOpenRadicalStudio?: () => void;
}
