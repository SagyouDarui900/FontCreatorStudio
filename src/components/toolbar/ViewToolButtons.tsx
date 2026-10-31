import React from 'react';
import {
  Grid,
  Magnet,
  Eye,
  Ruler,
  Crosshair,
  Save,
  Layers,
} from 'lucide-react';
import { GridSettings } from '../../types';
import { ThemeClasses } from '../../utils/theme';

export interface ViewToolButtonsProps {
  gridSettings: GridSettings;
  setGridSettings: React.Dispatch<React.SetStateAction<GridSettings>>;
  gridMenuRef: React.RefObject<HTMLDivElement | null>;
  showGridMenu: boolean;
  setShowGridMenu: React.Dispatch<React.SetStateAction<boolean>>;
  setShowBrushMenu: React.Dispatch<React.SetStateAction<boolean>>;
  setShowShapeMenu: React.Dispatch<React.SetStateAction<boolean>>;
  setGridAnchorTop: (top: number) => void;
  onQuickSaveGlyph?: () => void;
  onOpenTraceModal?: () => void;
  themeClasses: ThemeClasses;
}

export const ViewToolButtons: React.FC<ViewToolButtonsProps> = React.memo(({
  gridSettings,
  setGridSettings,
  gridMenuRef,
  showGridMenu,
  setShowGridMenu,
  setShowBrushMenu,
  setShowShapeMenu,
  setGridAnchorTop,
  onQuickSaveGlyph,
  onOpenTraceModal,
  themeClasses,
}) => {
  return (
    <>
      {/* Desktop-only View / Guide Toggles */}
      <div className="hidden sm:flex sm:flex-col items-center gap-1 shrink-0 w-full">
        {/* Grid Toggle & Settings Menu */}
        <div className="relative shrink-0 flex flex-col items-center" ref={gridMenuRef}>
          <button
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setGridAnchorTop(Math.max(60, rect.top - 80));
              setGridSettings((s) => ({ ...s, showGrid: !s.showGrid }));
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              const rect = e.currentTarget.getBoundingClientRect();
              setGridAnchorTop(Math.max(60, rect.top - 80));
              setShowGridMenu((prev) => !prev);
            }}
            className={`group w-9 h-9 sm:w-8 sm:h-8 min-w-[36px] sm:min-w-[32px] min-h-[36px] sm:min-h-[32px] rounded-xl transition-colors duration-75 flex items-center justify-center relative shrink-0 cursor-pointer ${
              gridSettings.showGrid || showGridMenu
                ? themeClasses.activeTool
                : themeClasses.activeToolHover
            }`}
            title={`方眼グリッド表示 (クリックで切替 / 右クリックまたは▼で設定開閉: 現在${gridSettings.gridSize || 50}px)`}
          >
            <Grid className="w-4 h-4 sm:w-4 sm:h-4 shrink-0" />
            <span
              onClick={(e) => {
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                setGridAnchorTop(Math.max(50, Math.min(window.innerHeight - 380, rect.top - 80)));
                setShowBrushMenu(false);
                setShowShapeMenu(false);
                setShowGridMenu((prev) => !prev);
              }}
              className="absolute bottom-0.5 right-0.5 text-[7px] font-mono opacity-70 leading-none cursor-pointer hover:opacity-100"
              title="グリッド設定を開く"
            >
              ▾
            </span>
          </button>
        </div>

        {/* Snap to Grid */}
        <button
          onClick={() => setGridSettings((s) => ({ ...s, snapToGrid: !s.snapToGrid }))}
          className={`w-9 h-9 sm:w-8 sm:h-8 min-w-[36px] sm:min-w-[32px] min-h-[36px] sm:min-h-[32px] rounded-xl transition-all flex items-center justify-center relative shrink-0 cursor-pointer ${
            gridSettings.snapToGrid
              ? themeClasses.activeTool
              : themeClasses.activeToolHover
          }`}
          title="グリッドにスナップ（幾何学・デザインフォント作図用）"
        >
          <Magnet className="w-4 h-4 sm:w-4 sm:h-4 shrink-0" />
        </button>

        {/* Metrics Lines Toggle */}
        <button
          onClick={() => setGridSettings((s) => ({ ...s, showMetrics: !s.showMetrics }))}
          className={`w-9 h-9 sm:w-8 sm:h-8 min-w-[36px] sm:min-w-[32px] min-h-[36px] sm:min-h-[32px] rounded-xl transition-colors duration-75 flex items-center justify-center relative shrink-0 cursor-pointer ${
            gridSettings.showMetrics
              ? themeClasses.activeTool
              : themeClasses.activeToolHover
          }`}
          title="メトリクスガイド線（ベースライン等）"
        >
          <Eye className="w-4 h-4 sm:w-4 sm:h-4 shrink-0" />
        </button>

        {/* Ruler Bars Toggle (Top/Left Rulers) */}
        <button
          onClick={() => setGridSettings((s) => ({ ...s, showRulers: !s.showRulers }))}
          className={`w-9 h-9 sm:w-8 sm:h-8 min-w-[36px] sm:min-w-[32px] min-h-[36px] sm:min-h-[32px] rounded-xl transition-colors duration-75 flex items-center justify-center relative shrink-0 cursor-pointer ${
            gridSettings.showRulers !== false
              ? themeClasses.activeTool
              : themeClasses.activeToolHover
          }`}
          title="外枠の目盛定規・ルーラー表示/非表示 (ルーラーからガイド線を引き出せます)"
        >
          <Ruler className="w-4 h-4 sm:w-4 sm:h-4 shrink-0" />
        </button>

        {/* Cursor Crosshair Reticle Toggle */}
        <button
          onClick={() =>
            setGridSettings((s) => {
              const next = !s.showCursorCrosshair;
              return { ...s, showCursorCrosshair: next, highContrastCursor: next };
            })
          }
          className={`w-9 h-9 sm:w-8 sm:h-8 min-w-[36px] sm:min-w-[32px] min-h-[36px] sm:min-h-[32px] rounded-xl transition-colors duration-75 flex items-center justify-center relative shrink-0 cursor-pointer ${
            gridSettings.showCursorCrosshair
              ? themeClasses.activeTool
              : themeClasses.activeToolHover
          }`}
          title="十字ポインター・照準ガイド線 (クリックで表示/非表示)"
        >
          <Crosshair className="w-4 h-4 sm:w-4 sm:h-4 shrink-0" />
        </button>
      </div>

      {/* Quick Actions (Desktop only) */}
      <div className="hidden sm:flex sm:flex-col items-center gap-1 mt-1 shrink-0 pb-1">
        {/* Quick Save Current Glyph */}
        {onQuickSaveGlyph && (
          <button
            onClick={onQuickSaveGlyph}
            className={`w-9 h-9 sm:w-8 sm:h-8 min-w-[36px] sm:min-w-[32px] min-h-[36px] sm:min-h-[32px] rounded-xl transition-colors duration-75 flex items-center justify-center relative shrink-0 active:scale-95 cursor-pointer ${
              themeClasses.activeToolHover
            }`}
            title="現在の文字を保存 (即時永続化 & 単体JSONバックアップ書き出し)"
          >
            <Save className="w-4 h-4 sm:w-4 sm:h-4 shrink-0" />
          </button>
        )}

        {/* Trace Overlay Toggle & Modal Trigger */}
        {onOpenTraceModal && (
          <button
            onClick={onOpenTraceModal}
            className={`w-9 h-9 sm:w-8 sm:h-8 min-w-[36px] sm:min-w-[32px] min-h-[36px] sm:min-h-[32px] rounded-xl transition-colors duration-75 flex items-center justify-center relative shrink-0 cursor-pointer ${
              themeClasses.activeToolHover
            }`}
            title="下絵・看板写真トレース設定"
          >
            <Layers className="w-4 h-4 sm:w-4 sm:h-4 shrink-0" />
          </button>
        )}
      </div>
    </>
  );
});

ViewToolButtons.displayName = 'ViewToolButtons';
