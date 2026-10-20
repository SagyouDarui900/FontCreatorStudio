import { useEffect } from 'react';
import { GridSettings, PathContour, Point, ToolMode } from '../../../types';

export interface UseCanvasShortcutsProps {
  isAnyModalOpen: boolean;
  toolMode: ToolMode;
  activePenContour: PathContour | null;
  selectedContourIds: string[];
  selectedNodeId: string | null;
  selectedContourId: string | null;
  rulerMeasurement: { start: Point; end: Point; active: boolean } | null;
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
  handleSmoothStrokeSelected: () => void;
  handleDrawRulerAsStroke: () => void;
  onSelectPrevGlyph?: () => void;
  onSelectNextGlyph?: () => void;
  setShowNodes: React.Dispatch<React.SetStateAction<boolean>>;
  setOutlineOnly: React.Dispatch<React.SetStateAction<boolean>>;
  setEraserSize: React.Dispatch<React.SetStateAction<number>>;
  setRulerMeasurement: (val: any) => void;
  setSelectedContourIds: (ids: string[]) => void;
  setSelectedNodeId: (id: string | null) => void;
  setIsSpacePressed: (pressed: boolean) => void;
  showCanvasToast: (msg: string, sub?: string) => void;
}

export function useCanvasShortcuts({
  isAnyModalOpen,
  toolMode,
  activePenContour,
  selectedContourIds,
  selectedNodeId,
  selectedContourId,
  rulerMeasurement,
  gridSettings,
  onChangeGridSettings,
  resetView,
  handleZoomStep,
  onToggleZenMode,
  handleResetTracePosition,
  handleResetPenContour,
  handleUndoPenNode,
  handleFinishPenContour,
  handleDeleteSelectedNode,
  handleDeleteSelected,
  handleSmoothStrokeSelected,
  handleDrawRulerAsStroke,
  onSelectPrevGlyph,
  onSelectNextGlyph,
  setShowNodes,
  setOutlineOnly,
  setEraserSize,
  setRulerMeasurement,
  setSelectedContourIds,
  setSelectedNodeId,
  setIsSpacePressed,
  showCanvasToast,
}: UseCanvasShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInputActive =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT' ||
          (activeEl as HTMLElement).isContentEditable);
      if (isInputActive || isAnyModalOpen) return;

      // Spacebar panning key trigger
      if (e.code === 'Space' || e.key === ' ') {
        if (!e.repeat) {
          setIsSpacePressed(true);
        }
        return;
      }

      // View & Zoom Navigation shortcuts
      if (e.key === '0' || (e.shiftKey && e.key === '!')) {
        e.preventDefault();
        resetView('fit');
        showCanvasToast('画面にフィット (Fit to Screen)');
        return;
      }
      if (e.key === '1') {
        e.preventDefault();
        resetView('100%');
        showCanvasToast('等倍表示 (100%)');
        return;
      }
      if ((e.key === 'w' || e.key === 'W') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        resetView('width');
        showCanvasToast('幅いっぱいに拡大 (Fit Width)');
        return;
      }
      if ((e.key === '+' || e.key === '=') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleZoomStep(1.25);
        return;
      }
      if ((e.key === '-' || e.key === '_') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleZoomStep(1 / 1.25);
        return;
      }
      if (
        ((e.key === 'f' || e.key === 'F') || (e.key === 'z' || e.key === 'Z')) &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        if (onToggleZenMode) {
          e.preventDefault();
          onToggleZenMode();
        }
        return;
      }

      // Trace Reset shortcut in trace_adjust mode
      if (toolMode === 'trace_adjust' && (e.key === 'r' || e.key === 'R') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleResetTracePosition();
        return;
      }

      // Tool Operation Shortcuts
      if (e.key === 'Escape') {
        if (activePenContour) {
          e.preventDefault();
          handleResetPenContour();
        } else if (selectedContourIds.length > 0) {
          setSelectedContourIds([]);
          setSelectedNodeId(null);
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (toolMode === 'ruler' && rulerMeasurement) {
          e.preventDefault();
          setRulerMeasurement(null);
        } else if (activePenContour) {
          e.preventDefault();
          handleUndoPenNode();
        } else if (selectedNodeId && (selectedContourId || selectedContourIds.length === 1)) {
          e.preventDefault();
          handleDeleteSelectedNode();
        } else if (selectedContourIds.length > 0) {
          e.preventDefault();
          handleDeleteSelected();
        }
      } else if (e.key.toLowerCase() === 'h' && !e.ctrlKey && !e.metaKey && !e.altKey) {
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
      } else if (e.key === '[' || e.key === ']') {
        if (toolMode === 'eraser') {
          e.preventDefault();
          setEraserSize((prev) => {
            const delta = e.key === ']' ? (prev >= 60 ? 10 : 4) : (prev > 60 ? -10 : -4);
            const next = Math.max(8, Math.min(160, prev + delta));
            return next;
          });
        }
      } else if (e.key.toLowerCase() === 'n' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        setShowNodes((prev) => !prev);
      } else if (
        ((e.key === 'o' || e.key === 'O') && (e.shiftKey || e.altKey)) ||
        ((e.key === 'w' || e.key === 'W') && e.altKey)
      ) {
        e.preventDefault();
        setOutlineOnly((prev) => {
          const next = !prev;
          showCanvasToast(
            next
              ? '輪郭表示モードを有効にしました（パスの重なりや形状を透過確認）'
              : '塗りつぶし表示モードに戻しました'
          );
          return next;
        });
      } else if (e.key.toLowerCase() === 'c' && !e.ctrlKey && !e.metaKey && !e.altKey && activePenContour) {
        e.preventDefault();
        handleFinishPenContour(true);
      } else if (e.shiftKey && e.key.toLowerCase() === 's' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        handleSmoothStrokeSelected();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (toolMode === 'ruler' && rulerMeasurement) {
          handleDrawRulerAsStroke();
          return;
        }
        if (activePenContour) {
          handleFinishPenContour(false);
        } else if (e.shiftKey) {
          onSelectPrevGlyph?.();
        } else {
          onSelectNextGlyph?.();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        setIsSpacePressed(false);
      }
    };

    const handleWindowBlur = () => {
      setIsSpacePressed(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [
    isAnyModalOpen,
    toolMode,
    activePenContour,
    selectedContourIds,
    selectedNodeId,
    selectedContourId,
    rulerMeasurement,
    gridSettings,
    onChangeGridSettings,
    resetView,
    handleZoomStep,
    onToggleZenMode,
    handleResetTracePosition,
    handleResetPenContour,
    handleUndoPenNode,
    handleFinishPenContour,
    handleDeleteSelectedNode,
    handleDeleteSelected,
    handleSmoothStrokeSelected,
    handleDrawRulerAsStroke,
    onSelectPrevGlyph,
    onSelectNextGlyph,
    setShowNodes,
    setOutlineOnly,
    setEraserSize,
    setRulerMeasurement,
    setSelectedContourIds,
    setSelectedNodeId,
    setIsSpacePressed,
    showCanvasToast,
  ]);
}
