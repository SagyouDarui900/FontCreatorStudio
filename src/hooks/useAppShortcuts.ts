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
  /** Open the shortcuts/help modal (bound to the '?' key). */
  onOpenShortcutsHelp?: () => void;
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
        onOpenShortcutsHelp,
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
      const hasAnyCtrlOrMeta = e.ctrlKey || e.metaKey;

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

      if (!hasAnyCtrlOrMeta && e.altKey && (e.key.toLowerCase() === 's' || e.code === 'KeyS')) {
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

      if (!hasAnyCtrlOrMeta && !e.shiftKey && e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        handleSelectPrevGlyph();
        return;
      }

      if (!hasAnyCtrlOrMeta && !e.shiftKey && e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        handleSelectNextGlyph();
        return;
      }

      if ((e.key === 'f' || e.key === 'F') && !hasAnyCtrlOrMeta && !e.altKey && !e.shiftKey && !e.repeat) {
        e.preventDefault();
        toggleZenMode();
        return;
      }

      // H10: '?' (Shift+/) opens the shortcuts/help modal, matching the
      // help text and the modal footer. Ignored while a modal is open
      // (checked above) or while typing.
      if (e.key === '?' && !hasAnyCtrlOrMeta && !e.altKey && !e.repeat) {
        e.preventDefault();
        onOpenShortcutsHelp?.();
        return;
      }

      // Tool switching only runs with no modifier keys. Alt/Shift + letter
      // combinations belong to other shortcuts (for example Shift+O / Alt+O
      // toggles the outline-only display in useCanvasShortcuts), and
      // Ctrl/Cmd + letter combinations belong to edit shortcuts above.
      if (!hasAnyCtrlOrMeta && !e.altKey && !e.shiftKey && !e.repeat) {
        const keyLower = e.key.toLowerCase();
        if (keyLower === 'v') {
          setToolMode('select');
        } else if (keyLower === 'a') {
          setToolMode('node');
        } else if (keyLower === 'p') {
          setToolMode('pen');
        } else if (keyLower === 'b') {
          setToolMode('brush');
        } else if (keyLower === 'e') {
          setToolMode('eraser');
        } else if (keyLower === 'r') {
          setToolMode('rect');
        } else if (keyLower === 'o') {
          setToolMode('ellipse');
        } else if (keyLower === 'm') {
          setToolMode('ruler');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
