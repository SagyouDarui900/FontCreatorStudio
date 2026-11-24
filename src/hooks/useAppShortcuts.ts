import { useEffect, useRef } from 'react';
import { isMacDevice } from '../utils/platform';
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
  /** True when the clipboard holds anything (contours or pixel data). */
  hasClipboard?: boolean;
  handleSelectPrevGlyph: () => void;
  handleSelectNextGlyph: () => void;
  toggleZenMode: () => void;
  setToolMode: (mode: ToolMode) => void;
  handleAutoSpaceCurrentGlyph?: () => void;
  handleSimplifyCurrentGlyph?: () => void;
}

export function useAppShortcuts(options: UseAppShortcutsOptions) {
  const optionsRef = useRef<UseAppShortcutsOptions>(options);
  optionsRef.current = options;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing || e.keyCode === 229) return;
      if (e.defaultPrevented) return;
      const {
        isAnyModalOpen,
        handleUndo,
        handleRedo,
        handleQuickSaveCurrentGlyph,
        handleCopyGlyph,
        handlePasteGlyph,
        selectedUnicode,
        currentGlyph,
        clipboardContours,
        hasClipboard,
        handleSelectPrevGlyph,
        handleSelectNextGlyph,
        toggleZenMode,
        setToolMode,
        handleAutoSpaceCurrentGlyph,
        handleSimplifyCurrentGlyph,
      } = optionsRef.current;

      const activeElement = document.activeElement;
      const isInput =
        activeElement &&
        (activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.tagName === 'SELECT' ||
          activeElement.getAttribute('contenteditable') === 'true');

      if (isInput) return;
      if (isAnyModalOpen) return;

      // iPadOS 13+ Safari reports a Macintosh user agent, which /mac/
      // already matches, so an iPad is treated as a Mac here and the Cmd
      // key of an external keyboard is the modifier key (see
      // src/utils/platform.ts).
      const isMac = isMacDevice();
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

      if (!ctrlOrCmd && e.altKey && (e.key.toLowerCase() === 's' || e.code === 'KeyS')) {
        e.preventDefault();
        if (e.shiftKey) {
          handleAutoSpaceCurrentGlyph?.();
        } else {
          handleSimplifyCurrentGlyph?.();
        }
        return;
      }

      if (ctrlOrCmd && e.key.toLowerCase() === 'c') {
        const hasPixelData = currentGlyph.pixelData?.data?.some((d) => d !== 0);
        if ((currentGlyph.contours && currentGlyph.contours.length > 0) || hasPixelData) {
          e.preventDefault();
          handleCopyGlyph(selectedUnicode);
        }
        return;
      }

      if (ctrlOrCmd && e.key.toLowerCase() === 'v') {
        const hasAnyClipboard = hasClipboard ?? (clipboardContours && clipboardContours.length > 0);
        if (hasAnyClipboard) {
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

      // Tool switching only runs with no modifier keys. Alt/Shift + letter
      // combinations belong to other shortcuts (for example Shift+O / Alt+O
      // toggles the outline-only display in useCanvasShortcuts), and
      // Ctrl/Cmd + letter combinations belong to edit shortcuts above.
      if (e.key === 'v' || e.key === 'V') {
        if (!ctrlOrCmd && !e.altKey && !e.shiftKey) setToolMode('select');
      } else if (e.key === 'p' || e.key === 'P') {
        if (!ctrlOrCmd && !e.altKey && !e.shiftKey) setToolMode('pen');
      } else if (e.key === 'b' || e.key === 'B') {
        if (!ctrlOrCmd && !e.altKey && !e.shiftKey) setToolMode('brush');
      } else if (e.key === 'e' || e.key === 'E') {
        if (!ctrlOrCmd && !e.altKey && !e.shiftKey) setToolMode('eraser');
      } else if (e.key === 'r' || e.key === 'R') {
        if (!ctrlOrCmd && !e.altKey && !e.shiftKey) setToolMode('rect');
      } else if (e.key === 'o' || e.key === 'O') {
        if (!ctrlOrCmd && !e.altKey && !e.shiftKey) setToolMode('ellipse');
      } else if (e.key === 'm' || e.key === 'M') {
        if (!ctrlOrCmd && !e.altKey && !e.shiftKey) setToolMode('ruler');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
