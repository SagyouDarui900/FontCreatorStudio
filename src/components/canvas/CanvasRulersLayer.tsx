import React, { useMemo } from 'react';
import { Point } from '../../types';
import { useHoverCanvasPos } from './hoverStore';

interface CanvasRulersLayerProps {
  showRulers: boolean;
  isLight: boolean;
  unitsPerEm?: number;
  /** Pan and zoom of the canvas, in screen coordinates. */
  pan: Point;
  zoom: number;
  /** Viewport size in screen pixels. */
  width: number;
  height: number;
}

const RULER_SIZE = 36;

/**
 * Top and left ruler scales, drawn in screen space.
 *
 * The layer deliberately lives outside the panning/zooming <g> of the SVG
 * stage, so the rulers stay fixed at the viewport edges instead of
 * scrolling off-screen with the glyph. Tick positions are computed from
 * the glyph coordinates (screen = pan + glyph * zoom), while line widths
 * and label sizes are plain screen pixels and never scale with zoom.
 * The hover indicator reads the external hoverStore, so moving the
 * pointer does not re-render the stage.
 */
export const CanvasRulersLayer: React.FC<CanvasRulersLayerProps> = React.memo(
  ({ showRulers, isLight, unitsPerEm = 1000, pan, zoom, width, height }) => {
    const hoverPos = useHoverCanvasPos();
    const upm = unitsPerEm || 1000;

    const rulerTicks = useMemo(() => {
      const ticks: { value: number; minor: number }[] = [];
      const step = upm > 1500 ? 200 : upm > 1000 ? 150 : 100;
      for (let i = 0; i <= upm; i += step) {
        ticks.push({ value: i, minor: i + step / 2 });
      }
      if (ticks[ticks.length - 1]?.value !== upm) {
        ticks.push({ value: upm, minor: upm + step / 2 });
      }
      return ticks;
    }, [upm]);

    if (!showRulers) return null;

    const strokePrimary = isLight ? '#065f46' : '#34d399';
    const fillText = isLight ? '#065f46' : '#6ee7b7';
    const strokeMinor = isLight ? '#64748b' : '#475569';
    const barFill = isLight ? '#f1f5f3' : '#142018';
    const barStroke = isLight ? '#cbdad2' : '#25382c';

    const toScreenX = (glyphX: number) => pan.x + glyphX * zoom;
    const toScreenY = (glyphY: number) => pan.y + glyphY * zoom;
    const hoverScreenX = hoverPos ? toScreenX(hoverPos.x) : null;
    const hoverScreenY = hoverPos ? toScreenY(hoverPos.y) : null;

    return (
      <g className="canvas-rulers-layer select-none font-mono pointer-events-none">
        {/* Top Ruler Bar Background */}
        <rect x={0} y={0} width={width} height={RULER_SIZE} fill={barFill} stroke={barStroke} strokeWidth={1} />
        {/* Left Ruler Bar Background */}
        <rect x={0} y={0} width={RULER_SIZE} height={height} fill={barFill} stroke={barStroke} strokeWidth={1} />

        {/* Top Ruler Ticks & Numbers */}
        {rulerTicks.map(({ value: x, minor }) => {
          const sx = toScreenX(x);
          if (sx < -40 || sx > width + 40) return null;
          const minorSx = toScreenX(minor);
          return (
            <g key={`top-tick-${x}`}>
              <line x1={sx} y1={RULER_SIZE - 18} x2={sx} y2={RULER_SIZE} stroke={strokePrimary} strokeWidth={1.5} />
              <text x={sx + 3} y={14} fill={fillText} fontWeight="bold" fontSize={9}>
                {x}
              </text>
              {/* Minor tick at the midpoint of the step */}
              {x < upm && minor < upm && minorSx >= 0 && minorSx <= width && (
                <line
                  x1={minorSx}
                  y1={RULER_SIZE - 10}
                  x2={minorSx}
                  y2={RULER_SIZE}
                  stroke={strokeMinor}
                  strokeWidth={1}
                />
              )}
            </g>
          );
        })}

        {/* Left Ruler Ticks & Numbers */}
        {rulerTicks.map(({ value: y, minor }) => {
          const sy = toScreenY(y);
          if (sy < -40 || sy > height + 40) return null;
          const minorSy = toScreenY(minor);
          return (
            <g key={`left-tick-${y}`}>
              <line x1={RULER_SIZE - 18} y1={sy} x2={RULER_SIZE} y2={sy} stroke={strokePrimary} strokeWidth={1.5} />
              <text x={4} y={sy + 3} fill={fillText} fontWeight="bold" fontSize={9}>
                {y}
              </text>
              {/* Minor tick at the midpoint of the step */}
              {y < upm && minor < upm && minorSy >= 0 && minorSy <= height && (
                <line
                  x1={RULER_SIZE - 10}
                  y1={minorSy}
                  x2={RULER_SIZE}
                  y2={minorSy}
                  stroke={strokeMinor}
                  strokeWidth={1}
                />
              )}
            </g>
          );
        })}

        {/* Real-time Cursor Indicator on Rulers (Red tracking ticks) */}
        {hoverScreenX !== null && hoverScreenX >= 0 && hoverScreenX <= width && (
          <line x1={hoverScreenX} y1={0} x2={hoverScreenX} y2={RULER_SIZE} stroke="#ef4444" strokeWidth={2} />
        )}
        {hoverScreenY !== null && hoverScreenY >= 0 && hoverScreenY <= height && (
          <line x1={0} y1={hoverScreenY} x2={RULER_SIZE} y2={hoverScreenY} stroke="#ef4444" strokeWidth={2} />
        )}
      </g>
    );
  }
);
