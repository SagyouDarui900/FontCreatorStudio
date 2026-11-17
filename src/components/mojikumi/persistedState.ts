// Persisted editing state for the Mojikumi Studio modal (3-A1).
// Kept in a file with no heavy imports so AppModalsHost can hold this state
// without pulling compileFont / opentype.js into the startup bundle.
// The modal itself stays lazy-loaded; only this small state shape is shared.
import type { FontProject, MojikumiConfig } from '../../types';
import { PRESET_BETA } from '../../utils/mojikumiEngine';
import { AOZORA_TEXTS } from './aozoraTexts';
import type {
  EditorialLayoutMode,
  MojikumiFontSource,
  MojikumiMobileTab,
  MojikumiSidebarTab,
} from './types';

export interface MojikumiPersistedState {
  layoutMode: EditorialLayoutMode;
  mobileTab: MojikumiMobileTab;
  sidebarTab: MojikumiSidebarTab;
  selectedWorkId: string;
  customText: string;
  isVertical: boolean;
  fontSource: MojikumiFontSource;
  zoom: number;
  fontSizeQ: number;
  lineFeedH: number;
  charsPerLine: number;
  lineCount: number;
  showBodyGrid: boolean;
  currentConfig: MojikumiConfig;
}

export function createDefaultMojikumiPersistedState(project: FontProject): MojikumiPersistedState {
  return {
    layoutMode: 'book_spread',
    mobileTab: 'preview',
    sidebarTab: 'text',
    selectedWorkId: AOZORA_TEXTS[0].id,
    customText: AOZORA_TEXTS[0].text,
    isVertical: true,
    fontSource: 'custom',
    zoom: 1.0,
    fontSizeQ: 14,
    lineFeedH: 24,
    charsPerLine: 20,
    lineCount: 14,
    showBodyGrid: false,
    currentConfig: project.mojikumiSettings || {
      preset: 'beta',
      table: PRESET_BETA,
      kinsoku: 'weak_v2',
      kinsokuAdjust: 'push_out',
      burasagari: 'standard',
      paragraphIndent: 'visual_half',
    },
  };
}
