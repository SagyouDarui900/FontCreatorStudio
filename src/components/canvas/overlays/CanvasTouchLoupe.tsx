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

    const vvWidth = typeof window !== 'undefined' ? (window.visualViewport?.width ?? window.innerWidth) : 375;
    const vvHeight = typeof window !== 'undefined' ? (window.visualViewport?.height ?? window.innerHeight) : 667;
    const vvOffsetLeft = typeof window !== 'undefined' ? (window.visualViewport?.offsetLeft ?? 0) : 0;
    const vvOffsetTop = typeof window !== 'undefined' ? (window.visualViewport?.offsetTop ?? 0) : 0;

    const leftPos = Math.max(vvOffsetLeft + 12, Math.min(vvOffsetLeft + vvWidth - 132, touchLoupeState.screenX - 60));
    const topPos = Math.max(vvOffsetTop + 12, Math.min(vvOffsetTop + vvHeight - 132, touchLoupeState.screenY - 145));

    return (
      <div
        style={{
          position: 'fixed',
          left: leftPos,
          top: topPos,
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
