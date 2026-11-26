import React from 'react';
import { PathContour, Point } from '../../../types';
import { ThemeMode, isLightTheme } from '../../../utils/theme';
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
  selectedContourIds?: string[];
  selectedNodeId?: string | null;
}

export const CanvasTouchLoupe: React.FC<CanvasTouchLoupeProps> = React.memo(
  ({
    touchLoupeState,
    contours,
    theme,
    isOutlineMode,
    selectedContourIds = [],
    selectedNodeId = null,
  }) => {
    if (!touchLoupeState.visible || !touchLoupeState.canvasPos) return null;

    const isLight = isLightTheme(theme);
    const vvWidth = typeof window !== 'undefined' ? (window.visualViewport?.width ?? window.innerWidth) : 375;
    const vvHeight = typeof window !== 'undefined' ? (window.visualViewport?.height ?? window.innerHeight) : 667;
    const vvOffsetLeft = typeof window !== 'undefined' ? (window.visualViewport?.offsetLeft ?? 0) : 0;
    const vvOffsetTop = typeof window !== 'undefined' ? (window.visualViewport?.offsetTop ?? 0) : 0;

    const leftPos = Math.max(vvOffsetLeft + 12, Math.min(vvOffsetLeft + vvWidth - 132, touchLoupeState.screenX - 60));
    const topPos = Math.max(vvOffsetTop + 48, Math.min(vvOffsetTop + vvHeight - 132, touchLoupeState.screenY - 145));

    const cx = touchLoupeState.canvasPos.x;
    const cy = touchLoupeState.canvasPos.y;
    const minX = cx - 30;
    const minY = cy - 30;
    const gridStartX = Math.floor(minX / 10) * 10;
    const gridStartY = Math.floor(minY / 10) * 10;
    const gridLinesX: number[] = [];
    const gridLinesY: number[] = [];
    for (let x = gridStartX; x <= cx + 30; x += 10) gridLinesX.push(x);
    for (let y = gridStartY; y <= cy + 30; y += 10) gridLinesY.push(y);

    const visibleNodeContours =
      selectedContourIds.length > 0
        ? contours.filter((c) => selectedContourIds.includes(c.id))
        : contours;

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
        className={`z-50 rounded-full border-2 border-emerald-500 shadow-md overflow-hidden flex flex-col items-center justify-center select-none ${
          isLight ? 'bg-white' : 'bg-stone-900'
        }`}
      >
        <svg
          width="120"
          height="120"
          viewBox={`${minX} ${minY} 60 60`}
          className={`w-full h-full ${isLight ? 'bg-[#fafdfb]' : 'bg-stone-950'}`}
        >
          {/* Subtle 10-unit reference grid */}
          {gridLinesX.map((gx) => (
            <line
              key={`lgx-${gx}`}
              x1={gx}
              y1={minY}
              x2={gx}
              y2={cy + 30}
              stroke={isLight ? 'rgba(16,185,129,0.14)' : 'rgba(52,211,153,0.14)'}
              strokeWidth="0.4"
            />
          ))}
          {gridLinesY.map((gy) => (
            <line
              key={`lgy-${gy}`}
              x1={minX}
              y1={gy}
              x2={cx + 30}
              y2={gy}
              stroke={isLight ? 'rgba(16,185,129,0.14)' : 'rgba(52,211,153,0.14)'}
              strokeWidth="0.4"
            />
          ))}

          <MainGlyphContoursLayer
            contours={contours}
            isLight={isLight}
            theme={theme}
            outlineOnly={isOutlineMode}
          />

          {/* Active Bezier Nodes & Handles */}
          {visibleNodeContours.map((contour) =>
            contour.nodes.map((node) => {
              if (Math.abs(node.x - cx) > 45 || Math.abs(node.y - cy) > 45) return null;
              const isSelected = node.id === selectedNodeId;
              return (
                <g key={`ln-${node.id}`}>
                  {node.handleIn && (
                    <>
                      <line
                        x1={node.x}
                        y1={node.y}
                        x2={node.handleIn.x}
                        y2={node.handleIn.y}
                        stroke={isLight ? '#0284c7' : '#38bdf8'}
                        strokeWidth="0.5"
                      />
                      <circle
                        cx={node.handleIn.x}
                        cy={node.handleIn.y}
                        r="1.1"
                        fill={isLight ? '#ffffff' : '#0f172a'}
                        stroke={isLight ? '#0284c7' : '#38bdf8'}
                        strokeWidth="0.5"
                      />
                    </>
                  )}
                  {node.handleOut && (
                    <>
                      <line
                        x1={node.x}
                        y1={node.y}
                        x2={node.handleOut.x}
                        y2={node.handleOut.y}
                        stroke={isLight ? '#0284c7' : '#38bdf8'}
                        strokeWidth="0.5"
                      />
                      <circle
                        cx={node.handleOut.x}
                        cy={node.handleOut.y}
                        r="1.1"
                        fill={isLight ? '#ffffff' : '#0f172a'}
                        stroke={isLight ? '#0284c7' : '#38bdf8'}
                        strokeWidth="0.5"
                      />
                    </>
                  )}
                  <rect
                    x={node.x - (isSelected ? 1.8 : 1.3)}
                    y={node.y - (isSelected ? 1.8 : 1.3)}
                    width={isSelected ? 3.6 : 2.6}
                    height={isSelected ? 3.6 : 2.6}
                    fill={isSelected ? '#10b981' : isLight ? '#ffffff' : '#1c2920'}
                    stroke={isSelected ? '#ffffff' : '#10b981'}
                    strokeWidth="0.6"
                  />
                </g>
              );
            })
          )}

          {/* Precision Crosshairs */}
          <line
            x1={cx - 25}
            y1={cy}
            x2={cx + 25}
            y2={cy}
            stroke="#10b981"
            strokeWidth="0.75"
            strokeDasharray="2 1"
          />
          <line
            x1={cx}
            y1={cy - 25}
            x2={cx}
            y2={cy + 25}
            stroke="#10b981"
            strokeWidth="0.75"
            strokeDasharray="2 1"
          />
          {/* Target Reticle */}
          <circle
            cx={cx}
            cy={cy}
            r="2.2"
            fill="#10b981"
            stroke="#ffffff"
            strokeWidth="0.6"
          />
        </svg>
        <div
          className={`absolute bottom-1 text-[9.5px] font-mono font-bold px-2 py-0.5 rounded-full border shadow-xs tabular-nums ${
            isLight
              ? 'bg-white/90 text-emerald-700 border-emerald-400/50'
              : 'bg-black/85 text-emerald-400 border-emerald-500/30'
          }`}
        >
          X:{Math.round(cx)} Y:{Math.round(cy)}
        </div>
      </div>
    );
  }
);
