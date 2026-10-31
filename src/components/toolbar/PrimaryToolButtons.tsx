import React from 'react';
import {
  MousePointer,
  PenTool,
  Eraser,
  Ruler,
  Hand,
  Grid,
  Crosshair,
} from 'lucide-react';
import { ToolMode, GridSettings, UserPenPreset } from '../../types';
import { ThemeClasses } from '../../utils/theme';

export interface PrimaryToolButtonsProps {
  toolMode: ToolMode;
  setToolMode: (mode: ToolMode) => void;
  isCurrentToolShape: boolean;
  showBrushMenu: boolean;
  setShowBrushMenu: React.Dispatch<React.SetStateAction<boolean>>;
  showShapeMenu: boolean;
  setShowShapeMenu: React.Dispatch<React.SetStateAction<boolean>>;
  showGridMenu: boolean;
  setShowGridMenu: React.Dispatch<React.SetStateAction<boolean>>;
  brushMenuRef: React.RefObject<HTMLDivElement | null>;
  shapeMenuRef: React.RefObject<HTMLDivElement | null>;
  setBrushAnchorTop: (top: number) => void;
  setShapeAnchorTop: (top: number) => void;
  currentPenPreset: UserPenPreset | { name: string; id: string };
  isCustomPen: boolean;
  CurrentPenIcon: React.FC<{ className?: string }>;
  currentShapeTool: { id: ToolMode; label: string; icon: React.FC<{ className?: string }> };
  CurrentShapeIcon: React.FC<{ className?: string }>;
  lastSelectedShape: ToolMode;
  gridSettings: GridSettings;
  themeClasses: ThemeClasses;
}

export const PrimaryToolButtons: React.FC<PrimaryToolButtonsProps> = React.memo(({
  toolMode,
  setToolMode,
  isCurrentToolShape,
  showBrushMenu,
  setShowBrushMenu,
  showShapeMenu,
  setShowShapeMenu,
  showGridMenu,
  setShowGridMenu,
  brushMenuRef,
  shapeMenuRef,
  setBrushAnchorTop,
  setShapeAnchorTop,
  currentPenPreset,
  isCustomPen,
  CurrentPenIcon,
  currentShapeTool,
  CurrentShapeIcon,
  lastSelectedShape,
  gridSettings,
  themeClasses,
}) => {
  return (
    <div className="flex sm:flex-col items-center justify-start gap-1 shrink-0 w-max min-w-full sm:w-auto sm:min-w-0">
      {/* Select Tool (Object & Contour Transform) */}
      <button
        onClick={() => setToolMode('select')}
        className={`group w-9 h-9 sm:w-8 sm:h-8 min-w-[36px] sm:min-w-[32px] min-h-[36px] sm:min-h-[32px] rounded-xl transition-colors duration-75 flex items-center justify-center relative shrink-0 cursor-pointer ${
          toolMode === 'select'
            ? themeClasses.activeTool
            : themeClasses.activeToolHover
        }`}
        title="選択・全体移動・変形 (V)"
      >
        <MousePointer className="w-4 h-4 sm:w-4 sm:h-4 shrink-0" />
        <span className="hidden sm:block absolute bottom-0.5 right-0.5 text-[6.5px] font-mono font-bold opacity-60 leading-none pointer-events-none">
          V
        </span>
      </button>

      {/* Node / Direct Selection Tool (Path vertex & handle editor) */}
      <button
        onClick={() => setToolMode('node')}
        className={`group w-9 h-9 sm:w-8 sm:h-8 min-w-[36px] sm:min-w-[32px] min-h-[36px] sm:min-h-[32px] rounded-xl transition-colors duration-75 flex items-center justify-center relative shrink-0 cursor-pointer ${
          toolMode === 'node'
            ? themeClasses.activeTool
            : themeClasses.activeToolHover
        }`}
        title="パス・頂点編集ツール (A) - アンカーポイントとベジェ曲線の直接編集"
      >
        <Crosshair className="w-4 h-4 sm:w-4 sm:h-4 shrink-0" />
        <span className="hidden sm:block absolute bottom-0.5 right-0.5 text-[6.5px] font-mono font-bold opacity-60 leading-none pointer-events-none">
          A
        </span>
      </button>

      {/* Pen Tool (Bezier) */}
      <button
        onClick={() => setToolMode('pen')}
        className={`group w-9 h-9 sm:w-8 sm:h-8 min-w-[36px] sm:min-w-[32px] min-h-[36px] sm:min-h-[32px] rounded-xl transition-colors duration-75 flex items-center justify-center relative shrink-0 cursor-pointer ${
          toolMode === 'pen'
            ? themeClasses.activeTool
            : themeClasses.activeToolHover
        }`}
        title="ベジェ曲線ペン・パス作成 (P)"
      >
        <PenTool className="w-4 h-4 sm:w-4 sm:h-4 shrink-0" />
        <span className="hidden sm:block absolute bottom-0.5 right-0.5 text-[6.5px] font-mono font-bold opacity-60 leading-none pointer-events-none">
          P
        </span>
      </button>

      {/* Brush Multi-Tool with Full Pen Types Palette */}
      <div className="relative shrink-0 flex items-center justify-center" ref={brushMenuRef}>
        <button
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setBrushAnchorTop(Math.max(50, Math.min(window.innerHeight - 560, rect.top)));
            setShowShapeMenu(false);
            setShowGridMenu(false);
            if (toolMode === 'brush') {
              setShowBrushMenu(!showBrushMenu);
            } else {
              setToolMode('brush');
              setShowBrushMenu(true);
            }
          }}
          className={`group w-9 h-9 sm:w-8 sm:h-8 min-w-[36px] sm:min-w-[32px] min-h-[36px] sm:min-h-[32px] rounded-xl transition-colors duration-75 flex items-center justify-center relative shrink-0 cursor-pointer ${
            toolMode === 'brush' || showBrushMenu
              ? themeClasses.activeTool
              : themeClasses.activeToolHover
          }`}
          title={`手書きペン (${currentPenPreset.name})${isCustomPen ? ' [カスタムペン]' : ''} (B) - クリックでペンの種類を変更`}
        >
          <CurrentPenIcon className="w-4 h-4 sm:w-4 sm:h-4 shrink-0" />
          {isCustomPen && (
            <span className="absolute -top-1 -right-1 px-1 py-0.2 bg-emerald-500 text-stone-950 font-bold text-[8px] rounded-full shadow-xs leading-none">
              自
            </span>
          )}
          <span className="absolute bottom-0.5 right-0.5 text-[7px] font-mono opacity-70 leading-none pointer-events-none">
            ▾
          </span>
        </button>
      </div>

      {/* Geometric Shapes Multi-Tool */}
      <div className="relative shrink-0 flex items-center justify-center" ref={shapeMenuRef}>
        <button
          id="shape-tool-main-button"
          type="button"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setShapeAnchorTop(Math.max(10, Math.min(window.innerHeight - 380, rect.top - 10)));
            setShowBrushMenu(false);
            setShowGridMenu(false);
            if (isCurrentToolShape) {
              setShowShapeMenu((prev) => !prev);
            } else {
              setToolMode(lastSelectedShape);
              setShowShapeMenu(true);
            }
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            const rect = e.currentTarget.getBoundingClientRect();
            setShapeAnchorTop(Math.max(10, Math.min(window.innerHeight - 380, rect.top - 10)));
            setShowBrushMenu(false);
            setShowGridMenu(false);
            setShowShapeMenu(true);
          }}
          className={`group w-9 h-9 sm:w-8 sm:h-8 min-w-[36px] sm:min-w-[32px] min-h-[36px] sm:min-h-[32px] rounded-xl transition-colors duration-75 flex items-center justify-center relative shrink-0 cursor-pointer ${
            isCurrentToolShape || showShapeMenu
              ? themeClasses.activeTool
              : themeClasses.activeToolHover
          }`}
          title={`幾何学図形ツール (${currentShapeTool.label}) (U) - クリックで全20種類の図形パレットを開閉 (右クリックでも開閉可能)`}
        >
          <CurrentShapeIcon className="w-4 h-4 sm:w-4 sm:h-4 shrink-0" />
          <span className="absolute bottom-0.5 right-0.5 text-[7px] font-mono opacity-70 leading-none pointer-events-none">
            ▾
          </span>
        </button>
      </div>

      {/* Eraser Tool */}
      <button
        onClick={() => setToolMode('eraser')}
        className={`group w-9 h-9 sm:w-8 sm:h-8 min-w-[36px] sm:min-w-[32px] min-h-[36px] sm:min-h-[32px] rounded-xl transition-colors duration-75 flex items-center justify-center relative shrink-0 cursor-pointer ${
          toolMode === 'eraser'
            ? themeClasses.activeTool
            : themeClasses.activeToolHover
        }`}
        title="消しゴム (E)"
      >
        <Eraser className="w-4 h-4 sm:w-4 sm:h-4 shrink-0" />
        <span className="hidden sm:block absolute bottom-0.5 right-0.5 text-[6.5px] font-mono font-bold opacity-60 leading-none pointer-events-none">
          E
        </span>
      </button>

      {/* Ruler / Dimension & Measure Tool */}
      <button
        id="btn-toolbar-ruler"
        onClick={() => setToolMode('ruler')}
        className={`group w-9 h-9 sm:w-8 sm:h-8 min-w-[36px] sm:min-w-[32px] min-h-[36px] sm:min-h-[32px] rounded-xl transition-colors duration-75 flex items-center justify-center relative shrink-0 cursor-pointer ${
          toolMode === 'ruler'
            ? themeClasses.activeTool
            : themeClasses.activeToolHover
        }`}
        title="定規・寸法計測ツール (R) - ドラッグして距離・字幅・角度を計測 (Shiftで水平/垂直固定)"
      >
        <Ruler className="w-4 h-4 sm:w-4 sm:h-4 shrink-0" />
        <span className="hidden sm:block absolute bottom-0.5 right-0.5 text-[6.5px] font-mono font-bold opacity-60 leading-none pointer-events-none">
          R
        </span>
      </button>

      {/* Hand Tool (Desktop only in main toolbar) */}
      <button
        onClick={() => setToolMode('hand')}
        className={`hidden sm:flex group w-9 h-9 sm:w-8 sm:h-8 min-w-[36px] sm:min-w-[32px] min-h-[36px] sm:min-h-[32px] rounded-xl transition-colors duration-75 items-center justify-center relative shrink-0 cursor-pointer ${
          toolMode === 'hand'
            ? themeClasses.activeTool
            : themeClasses.activeToolHover
        }`}
        title="手のひら・画面移動 (H) / Spaceドラッグでも移動可能"
      >
        <Hand className="w-4 h-4 sm:w-4 sm:h-4 shrink-0" />
        <span className="hidden sm:block absolute bottom-0.5 right-0.5 text-[6.5px] font-mono font-bold opacity-60 leading-none pointer-events-none">
          H
        </span>
      </button>

      {/* Mobile Unified Grid & Guides Bottom Sheet Trigger */}
      <div className="sm:hidden relative flex items-center shrink-0">
        <button
          onClick={() => {
            setShowBrushMenu(false);
            setShowShapeMenu(false);
            setShowGridMenu((prev) => !prev);
          }}
          className={`group w-9 h-9 min-w-[36px] min-h-[36px] rounded-xl transition-colors duration-75 flex items-center justify-center relative shrink-0 cursor-pointer ${
            gridSettings.showGrid || showGridMenu
              ? themeClasses.activeTool
              : themeClasses.activeToolHover
          }`}
          title="方眼・ガイド・下絵・保存メニュー"
        >
          <Grid className="w-4 h-4 shrink-0" />
          <span className="absolute bottom-0.5 right-0.5 text-[6.5px] font-mono font-bold text-emerald-600 dark:text-emerald-400 leading-none pointer-events-none">
            {gridSettings.gridSize || 50}
          </span>
        </button>
      </div>
    </div>
  );
});

PrimaryToolButtons.displayName = 'PrimaryToolButtons';
