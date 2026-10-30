import { useEffect } from 'react';
import { GlyphData, PathContour, ToolMode } from '../types';

export interface UseAppShortcutsOptions {
  isAnyModalOpen: boolean;
  handleUndo: () => void;
  handleRedo: () => void;
  handleQuickSaveCurrentGlyph: () => void;
  handleCopyGlyph: (unicode: number) => void;
  handlePasteGlyph: (unicode: number) => void;
  selectedUnicode: number;
  currentGlyph: GlyphData;
  clipboardContours: PathContour[] | null;
  handleSelectPrevGlyph: () => void;
  handleSelectNextGlyph: () => void;
  toggleZenMode: () => void;
  setToolMode: (mode: ToolMode) => void;
}

export function useAppShortcuts({
  isAnyModalOpen,
  handleUndo,
  handleRedo,
  handleQuickSaveCurrentGlyph,
  handleCopyGlyph,
  handlePasteGlyph,
  selectedUnicode,
  currentGlyph,
  clipboardContours,
  handleSelectPrevGlyph,
  handleSelectNextGlyph,
  toggleZenMode,
  setToolMode,
}: UseAppShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isInput =
        activeElement &&
        (activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.tagName === 'SELECT' ||
          activeElement.getAttribute('contenteditable') === 'true');

      if (isInput) return;
      if (isAnyModalOpen) return;

      const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

      if (ctrlOrCmd && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }

      if (ctrlOrCmd && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      if (ctrlOrCmd && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleQuickSaveCurrentGlyph();
        return;
      }

      if (ctrlOrCmd && e.key.toLowerCase() === 'c') {
        if (currentGlyph.contours && currentGlyph.contours.length > 0) {
          e.preventDefault();
          handleCopyGlyph(selectedUnicode);
        }
        return;
      }

      if (ctrlOrCmd && e.key.toLowerCase() === 'v') {
        if (clipboardContours && clipboardContours.length > 0) {
          e.preventDefault();
          handlePasteGlyph(selectedUnicode);
        }
        return;
      }

      if (e.key === 'ArrowLeft' && e.altKey) {
        e.preventDefault();
        handleSelectPrevGlyph();
        return;
      }

      if (e.key === 'ArrowRight' && e.altKey) {
        e.preventDefault();
        handleSelectNextGlyph();
        return;
      }

      if (e.key === 'f' || e.key === 'F') {
        if (!e.ctrlKey && !e.altKey && !e.metaKey) {
          e.preventDefault();
          toggleZenMode();
          return;
        }
      }

      if (e.key === 'v' || e.key === 'V') {
        if (!ctrlOrCmd) setToolMode('select');
      } else if (e.key === 'p' || e.key === 'P') {
        if (!ctrlOrCmd) setToolMode('pen');
      } else if (e.key === 'b' || e.key === 'B') {
        if (!ctrlOrCmd) setToolMode('brush');
      } else if (e.key === 'e' || e.key === 'E') {
        if (!ctrlOrCmd) setToolMode('eraser');
      } else if (e.key === 'r' || e.key === 'R') {
        if (!ctrlOrCmd) setToolMode('rect');
      } else if (e.key === 'o' || e.key === 'O') {
        if (!ctrlOrCmd) setToolMode('ellipse');
      } else if (e.key === 'm' || e.key === 'M') {
        if (!ctrlOrCmd) setToolMode('ruler');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isAnyModalOpen,
    handleUndo,
    handleRedo,
    handleQuickSaveCurrentGlyph,
    handleCopyGlyph,
    handlePasteGlyph,
    selectedUnicode,
    currentGlyph,
    clipboardContours,
    handleSelectPrevGlyph,
    handleSelectNextGlyph,
    toggleZenMode,
    setToolMode,
  ]);
}
