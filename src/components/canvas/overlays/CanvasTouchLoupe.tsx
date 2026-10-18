import React from 'react';
import { PathContour, Point } from '../../../types';
import { ThemeMode } from '../../../utils/theme';
import { MainGlyphContoursLayer } from '../MainGlyphContoursLayer';

export interface TouchLoupeState {
  visible: boolean;
  screenX: number;
  screenY: number;
  canvasPos: Point | null;
}

export interface CanvasTouchLoupeProps {
  touchLoupeState: TouchLoupeState;
  contours: PathContour[];
  theme: ThemeMode;
  isOutlineMode: boolean;
}

export const CanvasTouchLoupe: React.FC<CanvasTouchLoupeProps> = React.memo(
  ({ touchLoupeState, contours, theme, isOutlineMode }) => {
    if (!touchLoupeState.visible || !touchLoupeState.canvasPos) return null;

    return (
      <div
        style={{
          position: 'fixed',
          left: Math.max(12, Math.min(window.innerWidth - 132, touchLoupeState.screenX - 60)),
          top: Math.max(12, touchLoupeState.screenY - 145),
          width: 120,
          height: 120,
          pointerEvents: 'none',
        }}
        className="z-50 rounded-full border-2 border-emerald-500 shadow-2xl bg-stone-900/95 overflow-hidden flex flex-col items-center justify-center select-none ring-4 ring-emerald-500/20"
      >
        <svg
          width="120"
          height="120"
          viewBox={`${touchLoupeState.canvasPos.x - 30} ${touchLoupeState.canvasPos.y - 30} 60 60`}
          className="w-full h-full bg-stone-950"
        >
          <MainGlyphContoursLayer
            contours={contours}
            isLight={false}
            theme={theme}
            outlineOnly={isOutlineMode}
          />
          {/* Precision Crosshairs */}
          <line
            x1={touchLoupeState.canvasPos.x - 25}
            y1={touchLoupeState.canvasPos.y}
            x2={touchLoupeState.canvasPos.x + 25}
            y2={touchLoupeState.canvasPos.y}
            stroke="#10b981"
            strokeWidth="0.75"
            strokeDasharray="2 1"
          />
          <line
            x1={touchLoupeState.canvasPos.x}
            y1={touchLoupeState.canvasPos.y - 25}
            x2={touchLoupeState.canvasPos.x}
            y2={touchLoupeState.canvasPos.y + 25}
            stroke="#10b981"
            strokeWidth="0.75"
            strokeDasharray="2 1"
          />
          {/* Target Reticle */}
          <circle
            cx={touchLoupeState.canvasPos.x}
            cy={touchLoupeState.canvasPos.y}
            r="2.5"
            fill="#10b981"
            stroke="#ffffff"
            strokeWidth="0.6"
          />
        </svg>
        <div className="absolute bottom-1 bg-black/85 text-[9.5px] font-mono font-bold text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30 shadow-xs tabular-nums">
          X:{Math.round(touchLoupeState.canvasPos.x)} Y:{Math.round(touchLoupeState.canvasPos.y)}
        </div>
      </div>
    );
  }
);
