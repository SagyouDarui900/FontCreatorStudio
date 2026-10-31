import React from 'react';
import { X } from 'lucide-react';
import { ToolMode } from '../../types';
import { ThemeClasses } from '../../utils/theme';
import { SHAPE_TOOLS } from './toolbarConstants';

export interface DesktopShapeMenuPopoverProps {
  isOpen: boolean;
  anchorTop: number;
  onClose: () => void;
  toolMode: ToolMode;
  setToolMode: (mode: ToolMode) => void;
  setLastSelectedShape: (mode: ToolMode) => void;
  themeClasses: ThemeClasses;
  isLight: boolean;
}

export const DesktopShapeMenuPopover: React.FC<DesktopShapeMenuPopoverProps> = React.memo(({
  isOpen,
  anchorTop,
  onClose,
  toolMode,
  setToolMode,
  setLastSelectedShape,
  themeClasses,
  isLight,
}) => {
  if (!isOpen) return null;

  const handleSelectShape = (shapeId: ToolMode) => {
    setLastSelectedShape(shapeId);
    setToolMode(shapeId);
    onClose();
  };

  return (
    <div
      style={{
        top: `${anchorTop}px`,
        maxHeight: `calc(100vh - ${anchorTop}px - 24px)`,
      }}
      className={`fixed inset-x-3 max-w-xs mx-auto sm:inset-x-auto sm:bottom-auto sm:fixed sm:left-13 md:left-14 sm:w-72 z-50 p-2.5 pb-8 rounded-2xl border shadow-2xl animate-in fade-in duration-150 overflow-y-auto ${themeClasses.cardBg}`}
    >
      <div className="px-1 py-0.5 text-[11px] font-bold border-b mb-2 flex items-center justify-between border-stone-200 dark:border-[#223025]">
        <span className={isLight ? 'text-emerald-800' : 'text-emerald-400'}>図形を選択</span>
        <div className="flex items-center space-x-2">
          <span className="text-[10px] font-normal opacity-60">全20種類</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-1 rounded-md hover:bg-stone-200 dark:hover:bg-[#25362b] opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
            title="閉じる"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Basic & Curved Geometrics */}
      <div className="text-[10px] font-bold text-stone-400 dark:text-emerald-500/80 px-1 mb-1">
        基本・角丸・カプセル (6種類)
      </div>
      <div className="grid grid-cols-2 gap-1 mb-2">
        {SHAPE_TOOLS.slice(0, 6).map((shape) => {
          const SIcon = shape.icon;
          const isSelected = toolMode === shape.id;
          return (
            <button
              key={shape.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSelectShape(shape.id);
              }}
              className={`flex items-center space-x-1.5 p-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                isSelected
                  ? isLight
                    ? 'bg-emerald-700 text-white font-bold'
                    : 'bg-emerald-600 text-white font-bold'
                  : isLight
                  ? 'hover:bg-stone-100 text-stone-700'
                  : 'hover:bg-[#1f2b23] text-emerald-200'
              }`}
            >
              <SIcon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{shape.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>

      {/* Polygons & Lines */}
      <div className="text-[10px] font-bold text-stone-400 dark:text-emerald-500/80 px-1 mb-1">
        多角形・直線・幾何学 (9種類)
      </div>
      <div className="grid grid-cols-2 gap-1 mb-2">
        {SHAPE_TOOLS.slice(6, 15).map((shape) => {
          const SIcon = shape.icon;
          const isSelected = toolMode === shape.id;
          return (
            <button
              key={shape.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSelectShape(shape.id);
              }}
              className={`flex items-center space-x-1.5 p-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                isSelected
                  ? isLight
                    ? 'bg-emerald-700 text-white font-bold'
                    : 'bg-emerald-600 text-white font-bold'
                  : isLight
                  ? 'hover:bg-stone-100 text-stone-700'
                  : 'hover:bg-[#1f2b23] text-emerald-200'
              }`}
            >
              <SIcon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{shape.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>

      {/* Ornaments & Stars */}
      <div className="text-[10px] font-bold text-stone-400 dark:text-emerald-500/80 px-1 mb-1">
        記号・星型・三日月 (5種類)
      </div>
      <div className="grid grid-cols-2 gap-1">
        {SHAPE_TOOLS.slice(15).map((shape) => {
          const SIcon = shape.icon;
          const isSelected = toolMode === shape.id;
          return (
            <button
              key={shape.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSelectShape(shape.id);
              }}
              className={`flex items-center space-x-1.5 p-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                isSelected
                  ? isLight
                    ? 'bg-emerald-700 text-white font-bold'
                    : 'bg-emerald-600 text-white font-bold'
                  : isLight
                  ? 'hover:bg-stone-100 text-stone-700'
                  : 'hover:bg-[#1f2b23] text-emerald-200'
              }`}
            >
              <SIcon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{shape.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
});

DesktopShapeMenuPopover.displayName = 'DesktopShapeMenuPopover';
