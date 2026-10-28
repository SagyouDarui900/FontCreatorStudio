/**
 * Storage keys management for Font Creator Studio (FCS).
 * Provides dual-read fallback: reads the new fcs_* key, falls back to legacy keys,
 * and always writes strictly to the new fcs_* key.
 */

export interface StorageKeyDefinition {
  primary: string;
  legacy?: readonly string[];
}

export const STORAGE_KEYS = {
  OUTLINE_MODE: {
    primary: 'fcs_outline_mode',
    legacy: ['glyph_canvas_outline_mode'],
  },
  GUIDE_ASSIST_OPEN: {
    primary: 'fcs_guide_assist_open',
    legacy: ['mojisaku_guide_assist_open'],
  },
  SHOW_SUBTOOLBAR: {
    primary: 'fcs_show_subtoolbar',
    legacy: ['mojisaku_show_subtoolbar'],
  },
  AUTO_UNION_BRUSH: {
    primary: 'fcs_auto_union_brush',
    legacy: ['fontforge_auto_union_brush', 'fontforge_auto_resolve_brush_overlap'],
  },
  PALM_REJECTION_MODE: {
    primary: 'fcs_palm_rejection_mode',
    legacy: ['mojisaku_palm_rejection_mode'],
  },
  BOTTOM_BAR_COLLAPSED: {
    primary: 'fcs_bottom_bar_collapsed',
    legacy: ['mojisaku_bottom_bar_collapsed'],
  },
  GLYPH_OVERLAY: {
    primary: 'fcs_glyph_overlay',
    legacy: ['font_editor_glyph_overlay_v1'],
  },
  SIDEBAR_WIDTH: {
    primary: 'fcs_sidebar_width',
    legacy: ['fontforge_sidebar_width'],
  },
  PEN_STROKE_WIDTH: {
    primary: 'fcs_pen_stroke_width',
    legacy: ['glyph_pen_stroke_width'],
  },
  PEN_CAP_STYLE: {
    primary: 'fcs_pen_cap_style',
    legacy: ['glyph_pen_cap_style'],
  },
  THEME_MODE: {
    primary: 'fcs_theme_mode',
    legacy: ['font_editor_theme_mode'],
  },
  PROJECT_DATA: {
    primary: 'fcs_project_data',
    legacy: ['font_editor_project_data_v2'],
  },
} as const;

export function getStorageItem(keyDef: StorageKeyDefinition, defaultValue: string | null = null): string | null {
  try {
    const val = localStorage.getItem(keyDef.primary);
    if (val !== null) return val;
    if (keyDef.legacy) {
      for (const legacyKey of keyDef.legacy) {
        const legVal = localStorage.getItem(legacyKey);
        if (legVal !== null) return legVal;
      }
    }
  } catch {
    // localStorage not accessible
  }
  return defaultValue;
}

export function getBooleanStorageItem(keyDef: StorageKeyDefinition, defaultValue: boolean): boolean {
  const val = getStorageItem(keyDef);
  if (val === null) return defaultValue;
  return val === 'true';
}

export function setStorageItem(keyDef: StorageKeyDefinition, value: string): void {
  try {
    localStorage.setItem(keyDef.primary, value);
  } catch {
    // quota exceeded or private mode
  }
}

export function setBooleanStorageItem(keyDef: StorageKeyDefinition, value: boolean): void {
  setStorageItem(keyDef, String(value));
}
