import { FontProject } from '../types';

/**
 * Unicodes whose glyph entry changed between two project snapshots.
 * Batch utilities in this codebase keep the same glyph object reference
 * for untouched glyphs (they spread the glyphs map and only replace the
 * entries they modify), so a reference comparison identifies exactly the
 * glyphs a batch operation touched. Deleted glyphs are included too, so
 * Undo can restore them.
 */
export function collectChangedGlyphUnicodes(prev: FontProject, next: FontProject): number[] {
  const changed: number[] = [];
  const prevGlyphs = prev.glyphs || {};
  const nextGlyphs = next.glyphs || {};
  for (const [key, nextGlyph] of Object.entries(nextGlyphs)) {
    if (prevGlyphs[Number(key)] !== nextGlyph) {
      changed.push(Number(key));
    }
  }
  for (const key of Object.keys(prevGlyphs)) {
    if (!(Number(key) in nextGlyphs)) {
      changed.push(Number(key));
    }
  }
  return changed.sort((a, b) => a - b);
}

/**
 * Register history for every glyph a batch operation changed, before the
 * changed project is applied. `commitHistory` snapshots the glyph as it
 * currently is in the project, so it must be called while the previous
 * project is still current.
 */
export function commitChangedGlyphHistory(
  prev: FontProject,
  next: FontProject,
  commitHistory: (targetUnicode?: number) => void
): number[] {
  const changed = collectChangedGlyphUnicodes(prev, next);
  for (const unicode of changed) {
    commitHistory(unicode);
  }
  return changed;
}
