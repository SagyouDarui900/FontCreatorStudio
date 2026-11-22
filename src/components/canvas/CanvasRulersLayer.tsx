import React, { useEffect, useMemo, useRef } from 'react';
import { Point } from '../../types';
import { getHoverCanvasPos, subscribeHoverCanvasPos } from './hoverStore';
import { useLiveViewport } from './viewportStore';

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

const RULER_SIZE = 28;
const STEP_CANDIDATES = [10, 20, 25, 50, 100, 200, 250, 500, 1000];

/**
 * Top and left ruler scales, drawn in screen space.
 *
 * Subscribes to liveViewport so ticks track wheel/pinch zoom at 60fps.
 * Hover cursor marks update directly via DOM refs so pointer movement never
 * triggers React re-renders.
 */
export const CanvasRulersLayer: React.FC<CanvasRulersLayerProps> = React.memo(
  ({ showRulers, isLight, unitsPerEm = 1000, pan: propPan, zoom: propZoom, width, height }) => {
    const { zoom, pan } = useLiveViewport(propZoom, propPan);
    const upm = unitsPerEm || 1000;
    const safeZoom = zoom && zoom > 0 ? zoom : 1;

    const hoverXLineRef = useRef<SVGLineElement | null>(null);
    const hoverYLineRef = useRef<SVGLineElement | null>(null);
    const viewRef = useRef({ showRulers, pan, safeZoom, width, height });
    viewRef.current = { showRulers, pan, safeZoom, width, height };

    useEffect(() => {
      const updateHoverMarkers = () => {
        const { showRulers: shown, pan: p, safeZoom: z, width: w, height: h } = viewRef.current;
        const pos = shown ? getHoverCanvasPos() : null;

        const xLine = hoverXLineRef.current;
        if (xLine) {
          if (pos) {
            const sx = p.x + pos.x * z;
            if (sx >= RULER_SIZE && sx <= w) {
              xLine.setAttribute('x1', String(sx));
              xLine.setAttribute('x2', String(sx));
              xLine.style.display = '';
            } else {
              xLine.style.display = 'none';
            }
          } else {
            xLine.style.display = 'none';
          }
        }

        const yLine = hoverYLineRef.current;
        if (yLine) {
          if (pos) {
            const sy = p.y + pos.y * z;
            if (sy >= RULER_SIZE && sy <= h) {
              yLine.setAttribute('y1', String(sy));
              yLine.setAttribute('y2', String(sy));
              yLine.style.display = '';
            } else {
              yLine.style.display = 'none';
            }
          } else {
            yLine.style.display = 'none';
          }
        }
      };

      updateHoverMarkers();
      return subscribeHoverCanvasPos(updateHoverMarkers);
    }, [showRulers, pan.x, pan.y, safeZoom, width, height]);

    const step = useMemo(() => {
      return STEP_CANDIDATES.find((c) => c * safeZoom >= 56) ?? 1000;
    }, [safeZoom]);

    const xTicks = useMemo(() => {
      if (!showRulers || width <= 0) return [];
      const minCanvas = Math.max(-upm, Math.floor((RULER_SIZE - pan.x) / safeZoom / step) * step - step);
      const maxCanvas = Math.min(upm * 2, Math.ceil((width - pan.x) / safeZoom / step) * step + step);
      const ticks: { value: number; minor: number }[] = [];
      for (let v = minCanvas; v <= maxCanvas; v += step) {
        ticks.push({ value: v, minor: v + step / 2 });
      }
      return ticks;
    }, [showRulers, width, pan.x, safeZoom, step, upm]);

    const yTicks = useMemo(() => {
      if (!showRulers || height <= 0) return [];
      const minCanvas = Math.max(-upm, Math.floor((RULER_SIZE - pan.y) / safeZoom / step) * step - step);
      const maxCanvas = Math.min(upm * 2, Math.ceil((height - pan.y) / safeZoom / step) * step + step);
      const ticks: { value: number; minor: number }[] = [];
      for (let v = minCanvas; v <= maxCanvas; v += step) {
        ticks.push({ value: v, minor: v + step / 2 });
      }
      return ticks;
    }, [showRulers, height, pan.y, safeZoom, step, upm]);

    if (!showRulers) return null;

    const strokePrimary = isLight ? '#64748b' : '#94a3b8';
    const fillText = isLight ? '#475569' : '#94a3b8';
    const strokeMinor = isLight ? '#cbd5e1' : '#334155';
    const barFill = isLight ? '#f4f6f5' : '#111a15';
    const barStroke = isLight ? '#d5ddd9' : '#233329';

    return (
      <g className="canvas-rulers-layer select-none font-mono pointer-events-none">
        <defs>
          <clipPath id="topRulerClip">
            <rect x={RULER_SIZE} y={0} width={Math.max(0, width - RULER_SIZE)} height={RULER_SIZE} />
          </clipPath>
          <clipPath id="leftRulerClip">
            <rect x={0} y={RULER_SIZE} width={RULER_SIZE} height={Math.max(0, height - RULER_SIZE)} />
          </clipPath>
        </defs>

        {/* Top Ruler Bar Background */}
        <rect x={RULER_SIZE} y={0} width={Math.max(0, width - RULER_SIZE)} height={RULER_SIZE} fill={barFill} stroke={barStroke} strokeWidth={1} />
        {/* Left Ruler Bar Background */}
        <rect x={0} y={RULER_SIZE} width={RULER_SIZE} height={Math.max(0, height - RULER_SIZE)} fill={barFill} stroke={barStroke} strokeWidth={1} />

        {/* Top Ruler Ticks & Numbers */}
        <g clipPath="url(#topRulerClip)">
          {xTicks.map(({ value: x, minor }) => {
            const sx = pan.x + x * safeZoom;
            const minorSx = pan.x + minor * safeZoom;
            return (
              <g key={`top-tick-${x}`}>
                <line x1={sx} y1={RULER_SIZE - 10} x2={sx} y2={RULER_SIZE} stroke={strokePrimary} strokeWidth={1} />
                <text x={sx + 3} y={12} fill={fillText} fontSize={9}>
                  {x}
                </text>
                {minorSx >= RULER_SIZE && minorSx <= width && (
                  <line
                    x1={minorSx}
                    y1={RULER_SIZE - 5}
                    x2={minorSx}
                    y2={RULER_SIZE}
                    stroke={strokeMinor}
                    strokeWidth={1}
                  />
                )}
              </g>
            );
          })}
          <line
            ref={hoverXLineRef}
            x1={0}
            y1={0}
            x2={0}
            y2={RULER_SIZE}
            stroke="#ef4444"
            strokeWidth={1.5}
            style={{ display: 'none' }}
          />
        </g>

        {/* Left Ruler Ticks & Numbers */}
        <g clipPath="url(#leftRulerClip)">
          {yTicks.map(({ value: y, minor }) => {
            const sy = pan.y + y * safeZoom;
            const minorSy = pan.y + minor * safeZoom;
            return (
              <g key={`left-tick-${y}`}>
                <line x1={RULER_SIZE - 10} y1={sy} x2={RULER_SIZE} y2={sy} stroke={strokePrimary} strokeWidth={1} />
                <text x={3} y={sy - 3} fill={fillText} fontSize={8.5}>
                  {y}
                </text>
                {minorSy >= RULER_SIZE && minorSy <= height && (
                  <line
                    x1={RULER_SIZE - 5}
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
          <line
            ref={hoverYLineRef}
            x1={0}
            y1={0}
            x2={RULER_SIZE}
            y2={0}
            stroke="#ef4444"
            strokeWidth={1.5}
            style={{ display: 'none' }}
          />
        </g>

        {/* Top-Left Corner Intersection Cap */}
        <rect x={0} y={0} width={RULER_SIZE} height={RULER_SIZE} fill={barFill} stroke={barStroke} strokeWidth={1} />
      </g>
    );
  }
);
