import { useEffect, useRef } from 'react';
import { GridSettings, PathContour, Point, RulerMeasurement, ToolMode } from '../../../types';

export interface UseCanvasShortcutsProps {
  isAnyModalOpen: boolean;
  toolMode: ToolMode;
  activePenContour: PathContour | null;
  selectedContourIds: string[];
  selectedNodeId: string | null;
  selectedNodeIds?: string[];
  selectedContourId: string | null;
  rulerMeasurement: RulerMeasurement | null;
  gridSettings: GridSettings;
  onChangeGridSettings?: React.Dispatch<React.SetStateAction<GridSettings>>;
  resetView: (mode?: 'fit' | '100%' | 'width') => void;
  handleZoomStep: (factor: number) => void;
  onToggleZenMode?: () => void;
  handleResetTracePosition: () => void;
  handleResetPenContour: () => void;
  handleUndoPenNode: () => void;
  handleFinishPenContour: (closed: boolean) => void;
  handleDeleteSelectedNode: () => void;
  handleDeleteSelected: () => void;
  handleToggleNodeType?: (contourId?: string, nodeId?: string) => void;
  handleSmoothStrokeSelected: () => void;
  handleDrawRulerAsStroke: () => void;
  onSelectPrevGlyph?: () => void;
  onSelectNextGlyph?: () => void;
  setShowNodes: React.Dispatch<React.SetStateAction<boolean>>;
  setOutlineOnly: React.Dispatch<React.SetStateAction<boolean>>;
  setEraserSize: React.Dispatch<React.SetStateAction<number>>;
  brushWidth: number;
  onChangeBrushWidth?: (w: number) => void;
  // Preferred brush-size adjuster (handleAdjustBrushSize from useToolState).
  // When provided, '[' / ']' call it instead of onChangeBrushWidth so the
  // change is saved to the sticky brush config. useAppShortcuts does not
  // handle '[' / ']' to avoid double adjustment.
  onAdjustBrushSize?: (delta: number) => void;
  setRulerMeasurement: (val: RulerMeasurement | null) => void;
  setSelectedContourIds: (ids: string[]) => void;
  setSelectedNodeId: (id: string | null) => void;
  setIsSpacePressed: (pressed: boolean) => void;
  showCanvasToast: (msg: string, sub?: string) => void;
  onNudgeSelection?: (dx: number, dy: number) => void;
  isGlyphLocked?: boolean;
  // L14: Escape cancels in-progress drags before falling through to
  // clearing the selection.
  marqueeSelection?: { start: Point; current: Point } | null;
  setMarqueeSelection?: (val: { start: Point; current: Point } | null) => void;
  // Returns true when a node drag was actually cancelled.
  handleCancelNodeDrag?: () => boolean | void;
  cancelTransformSession?: () => void;
  isTransformActive?: boolean;
}

export function useCanvasShortcuts(props: UseCanvasShortcutsProps) {
  const propsRef = useRef<UseCanvasShortcutsProps>(props);
  propsRef.current = props;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing || e.keyCode === 229) return;
      const {
        isAnyModalOpen,
        toolMode,
        activePenContour,
        selectedContourIds,
        selectedNodeId,
        selectedNodeIds,
        rulerMeasurement,
        gridSettings,
        onChangeGridSettings,
        resetView,
        handleZoomStep,
        handleResetTracePosition,
        handleResetPenContour,
        handleUndoPenNode,
        handleFinishPenContour,
        handleDeleteSelectedNode,
        handleDeleteSelected,
        handleToggleNodeType,
        handleSmoothStrokeSelected,
        handleDrawRulerAsStroke,
        onSelectPrevGlyph,
        onSelectNextGlyph,
        setShowNodes,
        setOutlineOnly,
        setEraserSize,
        brushWidth,
        onChangeBrushWidth,
        onAdjustBrushSize,
        setRulerMeasurement,
        setSelectedContourIds,
        setSelectedNodeId,
        setIsSpacePressed,
        showCanvasToast,
        onNudgeSelection,
        isGlyphLocked = false,
        marqueeSelection,
        setMarqueeSelection,
        handleCancelNodeDrag,
        cancelTransformSession,
        isTransformActive,
      } = propsRef.current;

      const activeEl = document.activeElement;
      const isInputActive =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT' ||
          (activeEl as HTMLElement).isContentEditable);
      if (isInputActive || isAnyModalOpen) return;

      // In-progress Pen Drawing Shortcuts
      if (toolMode === 'pen' && activePenContour) {
        // Ctrl+Z / Cmd+Z: undo last placed node (prevents triggering full glyph history undo)
        // Block Redo (Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y) while drawing a pen path so glyph redo
        // cannot replace contours beneath an uncommitted pen contour.
        // stopImmediatePropagation() is required here: stopPropagation() does not
        // stop the separate window keydown listener in useAppShortcuts, which
        // would otherwise run the full glyph history undo/redo as well.
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
          e.preventDefault();
          e.stopImmediatePropagation();
          if (!e.shiftKey) {
            handleUndoPenNode();
          }
          return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
          e.preventDefault();
          e.stopImmediatePropagation();
          return;
        }

        // Backspace / Delete: undo last placed node
        if (e.key === 'Backspace' || e.key === 'Delete') {
          e.preventDefault();
          e.stopPropagation();
          handleUndoPenNode();
          return;
        }

        // Escape: cancel and discard in-progress pen path
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          handleResetPenContour();
          return;
        }

        // Enter: finish and commit open path
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          handleFinishPenContour(false);
          return;
        }
      }

      // Illustrator-style Arrow Key Nudging for selected nodes and contours
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (selectedNodeId || (selectedNodeIds && selectedNodeIds.length > 0) || selectedContourIds.length > 0) {
          e.preventDefault();
          // Stop the separate window keydown listener in useAppShortcuts so that
          // Alt+Arrow only nudges the selection instead of also changing glyphs.
          e.stopImmediatePropagation();
          if (isGlyphLocked) {
            showCanvasToast('編集ロック中です', 'ヘッダーの鍵アイコンで解除できます');
            return;
          }
          const step = e.shiftKey ? 10 : (e.altKey ? 0.1 : 1);
          let dx = 0;
          let dy = 0;
          if (e.key === 'ArrowLeft') dx = -step;
          if (e.key === 'ArrowRight') dx = step;
          if (e.key === 'ArrowUp') dy = -step;
          if (e.key === 'ArrowDown') dy = step;

          onNudgeSelection?.(dx, dy);
          return;
        }
      }

      // Toggle Grid with 'G' key
      if (
        e.key.toLowerCase() === 'g' &&
        !e.shiftKey &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        !e.repeat &&
        !(toolMode === 'pen' && activePenContour)
      ) {
        e.preventDefault();
        if (onChangeGridSettings) {
          onChangeGridSettings((prev) => {
            const next = !prev.showGrid;
            showCanvasToast(next ? 'グリッド表示: ON' : 'グリッド表示: OFF');
            return { ...prev, showGrid: next };
          });
        }
        return;
      }

      // Spacebar panning key trigger
      // B5: preventDefault stops a focused button from also being activated
      // by Space while panning starts. Input focus already returns early
      // above, so typing in inputs is unaffected.
      if ((e.code === 'Space' || e.key === ' ') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        if (!e.repeat) {
          setIsSpacePressed(true);
        }
        return;
      }

      // View & Zoom Navigation shortcuts
      // Ctrl/Meta/Alt + 0/1 is left to the browser (zoom reset, tab switch, etc.).
      if (e.key === '0' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && !e.repeat) {
        e.preventDefault();
        resetView('fit');
        showCanvasToast('画面にフィット (Fit to Screen)');
        return;
      }
      if (e.key === '1' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && !e.repeat) {
        e.preventDefault();
        resetView('100%');
        showCanvasToast('等倍表示 (100%)');
        return;
      }
      if ((e.key === 'w' || e.key === 'W') && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && !e.repeat) {
        e.preventDefault();
        resetView('width');
        showCanvasToast('幅いっぱいに拡大 (Fit Width)');
        return;
      }
      if ((e.key === '+' || (!e.shiftKey && e.key === '=')) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        handleZoomStep(1.25);
        return;
      }
      if (
        (e.key === '-' || e.key === '_' || (e.shiftKey && e.code === 'Minus')) &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        e.preventDefault();
        handleZoomStep(1 / 1.25);
        return;
      }

      // Trace Reset shortcut in trace_adjust mode
      // stopImmediatePropagation() keeps the app-level tool switch (R -> rect)
      // in useAppShortcuts from running as well.
      if (toolMode === 'trace_adjust' && (e.key === 'r' || e.key === 'R') && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && !e.repeat) {
        e.preventDefault();
        e.stopImmediatePropagation();
        handleResetTracePosition();
        return;
      }

      // Brush size with '[' / ']' (brush tool only; glyph navigation is Alt+Arrow)
      if (
        toolMode === 'brush' &&
        (e.key === '[' || e.key === ']') &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        !e.shiftKey
      ) {
        e.preventDefault();
        const delta = e.key === ']' ? 4 : -4;
        if (onAdjustBrushSize) {
          onAdjustBrushSize(delta);
        } else if (onChangeBrushWidth) {
          onChangeBrushWidth(Math.max(4, Math.min(150, brushWidth + delta)));
        }
        return;
      }

      // Tool Operation Shortcuts
      if (e.key === 'Escape') {
        if (toolMode === 'pen' && activePenContour) {
          e.preventDefault();
          handleResetPenContour();
        } else if (marqueeSelection) {
          // L14: cancel the marquee selection drag in progress.
          e.preventDefault();
          setMarqueeSelection?.(null);
        } else if (handleCancelNodeDrag?.()) {
          // L14: cancel the node/handle drag in progress (the contour
          // is restored to its pre-drag state).
          e.preventDefault();
        } else if (isTransformActive) {
          // L14: cancel the transform drag in progress (the contours
          // are restored to their pre-drag state).
          e.preventDefault();
          cancelTransformSession?.();
        } else if (selectedContourIds.length > 0) {
          setSelectedContourIds([]);
          setSelectedNodeId(null);
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (toolMode === 'ruler' && rulerMeasurement) {
          e.preventDefault();
          setRulerMeasurement(null);
        } else if (isGlyphLocked) {
          e.preventDefault();
          showCanvasToast('編集ロック中です', 'ヘッダーの鍵アイコンで解除できます');
        } else if (toolMode === 'pen' && activePenContour) {
          e.preventDefault();
          handleUndoPenNode();
        } else if (selectedNodeId || (selectedNodeIds && selectedNodeIds.length > 0)) {
          e.preventDefault();
          handleDeleteSelectedNode();
        } else if (selectedContourIds.length > 0) {
          e.preventDefault();
          handleDeleteSelected();
        }
      } else if (e.key.toLowerCase() === 'h' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && !e.repeat) {
        e.preventDefault();
        if (onChangeGridSettings) {
          const next = !gridSettings.showCursorCrosshair;
          onChangeGridSettings((prev) => ({
            ...prev,
            showCursorCrosshair: next,
            highContrastCursor: next,
          }));
          showCanvasToast(
            next ? '照準ポインター・十字線: ON' : '照準ポインター・十字線: OFF',
            next ? '高視認性照準リング＆十字線ガイドを表示' : 'OS標準の軽量カーソルのみ表示'
          );
        }
      } else if (
        e.shiftKey &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        (e.key === '{' || e.key === '}' || e.key === '[' || e.key === ']' || e.key === '「' || e.key === '」')
      ) {
        if (toolMode === 'eraser') {
          e.preventDefault();
          const isGrow = e.key === '}' || e.key === ']' || e.key === '」';
          setEraserSize((prev) => {
            const delta = isGrow ? (prev >= 60 ? 10 : 4) : (prev > 60 ? -10 : -4);
            const next = Math.max(8, Math.min(160, prev + delta));
            return next;
          });
        }
      } else if (e.key.toLowerCase() === 'n' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && !e.repeat) {
        setShowNodes((prev) => !prev);
      } else if (
        (((e.key === 'o' || e.key === 'O') && (e.shiftKey || e.altKey)) ||
          ((e.key === 'w' || e.key === 'W') && e.altKey)) &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.repeat
      ) {
        e.preventDefault();
        // Stop the app-level tool switch (O -> ellipse) in useAppShortcuts so
        // that Shift+O / Alt+O only toggles the outline-only display.
        e.stopImmediatePropagation();
        setOutlineOnly((prev) => {
          const next = !prev;
          showCanvasToast(
            next
              ? '輪郭表示モードを有効にしました（パスの重なりや形状を透過確認）'
              : '塗りつぶし表示モードに戻しました'
          );
          return next;
        });
      } else if (e.key.toLowerCase() === 'c' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && !e.repeat) {
        if (toolMode === 'pen' && activePenContour) {
          e.preventDefault();
          if (isGlyphLocked) {
            showCanvasToast('編集ロック中です', 'ヘッダーの鍵アイコンで解除できます');
            return;
          }
          handleFinishPenContour(true);
        } else if (selectedNodeId || (selectedNodeIds && selectedNodeIds.length > 0)) {
          e.preventDefault();
          if (isGlyphLocked) {
            showCanvasToast('編集ロック中です', 'ヘッダーの鍵アイコンで解除できます');
            return;
          }
          handleToggleNodeType?.();
        }
      } else if (e.shiftKey && e.key.toLowerCase() === 's' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.repeat) {
        e.preventDefault();
        if (isGlyphLocked) {
          showCanvasToast('編集ロック中です', 'ヘッダーの鍵アイコンで解除できます');
          return;
        }
        handleSmoothStrokeSelected();
      } else if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.repeat) {
        if (toolMode === 'ruler' && rulerMeasurement) {
          e.preventDefault();
          if (isGlyphLocked) {
            showCanvasToast('編集ロック中です', 'ヘッダーの鍵アイコンで解除できます');
            return;
          }
          handleDrawRulerAsStroke();
          return;
        }
        if (toolMode === 'pen' && activePenContour) {
          e.preventDefault();
          if (isGlyphLocked) {
            showCanvasToast('編集ロック中です', 'ヘッダーの鍵アイコンで解除できます');
            return;
          }
          handleFinishPenContour(false);
          return;
        }
        const isInteractiveButtonFocused = Boolean(
          activeEl instanceof HTMLElement &&
            activeEl.closest('button, a[href], [role="button"], [role="menuitem"], [role="tab"]')
        );
        if (isInteractiveButtonFocused) {
          return;
        }
        e.preventDefault();
        if (e.shiftKey) {
          onSelectPrevGlyph?.();
        } else {
          onSelectNextGlyph?.();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        propsRef.current.setIsSpacePressed(false);
      }
    };

    const handleWindowBlur = () => {
      propsRef.current.setIsSpacePressed(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, []);
}
