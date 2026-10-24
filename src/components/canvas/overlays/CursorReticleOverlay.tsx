import React from 'react';
import { GridSettings, Point, ToolMode } from '../../../types';

export interface CursorReticleOverlayProps {
  gridSettings: GridSettings;
  hoverCanvasPos: Point | null;
  toolMode: ToolMode;
  zoom: number;
  selectionColor: string;
  drawingReticleRef: React.RefObject<SVGGElement | null>;
  eraserReticleRef: React.RefObject<SVGGElement | null>;
  brushWidth: number;
  eraserMode: 'stroke' | 'cut' | 'all' | 'node';
  eraserSize: number;
}

export const CursorReticleOverlay: React.FC<CursorReticleOverlayProps> = React.memo(({
  gridSettings,
  hoverCanvasPos,
  toolMode,
  zoom,
  selectionColor,
  drawingReticleRef,
  eraserReticleRef,
  brushWidth,
  eraserMode,
  eraserSize,
}) => {
  return (
    <>
      {/* ---------------- HIGH-CONTRAST CURSOR CROSSHAIR OVERLAY ---------------- */}
      {gridSettings.showCursorCrosshair && hoverCanvasPos && toolMode !== 'brush' && (
        <g className="canvas-cursor-crosshair pointer-events-none select-none">
          {/* Horizontal full line with dual-tone white/dark contrast */}
          <line
            x1={-300}
            y1={hoverCanvasPos.y}
            x2={1300}
            y2={hoverCanvasPos.y}
            stroke="#ffffff"
            strokeWidth={2.5 / zoom}
            strokeOpacity={0.6}
          />
          <line
            x1={-300}
            y1={hoverCanvasPos.y}
            x2={1300}
            y2={hoverCanvasPos.y}
            stroke="#059669"
            strokeWidth={1.2 / zoom}
            strokeDasharray="4 3"
          />

          {/* Vertical full line with dual-tone white/dark contrast */}
          <line
            x1={hoverCanvasPos.x}
            y1={-300}
            x2={hoverCanvasPos.x}
            y2={1300}
            stroke="#ffffff"
            strokeWidth={2.5 / zoom}
            strokeOpacity={0.6}
          />
          <line
            x1={hoverCanvasPos.x}
            y1={-300}
            x2={hoverCanvasPos.x}
            y2={1300}
            stroke="#059669"
            strokeWidth={1.2 / zoom}
            strokeDasharray="4 3"
          />

          {/* Central Target Reticle Ring */}
          <circle
            cx={hoverCanvasPos.x}
            cy={hoverCanvasPos.y}
            r={12 / zoom}
            fill="none"
            stroke="#ffffff"
            strokeWidth={2.5 / zoom}
          />
          <circle
            cx={hoverCanvasPos.x}
            cy={hoverCanvasPos.y}
            r={12 / zoom}
            fill="rgba(16, 185, 129, 0.1)"
            stroke={selectionColor}
            strokeWidth={1.5 / zoom}
          />
          <circle
            cx={hoverCanvasPos.x}
            cy={hoverCanvasPos.y}
            r={2.5 / zoom}
            fill="#ffffff"
          />
          <circle
            cx={hoverCanvasPos.x}
            cy={hoverCanvasPos.y}
            r={1.5 / zoom}
            fill={selectionColor}
          />
        </g>
      )}

      {/* ---------------- HARDWARE-ACCELERATED BRUSH DRAWING RETICLE (0ms DIRECT GPU DOM TRACKING) ---------------- */}
      {toolMode === 'brush' && gridSettings.showCursorCrosshair && (
        <g
          ref={drawingReticleRef}
          id="live-drawing-reticle"
          className="brush-drawing-reticle pointer-events-none select-none"
          style={{ display: 'none' }}
        >
          {/* Outer high-contrast white backing circle */}
          <circle
            cx={0}
            cy={0}
            r={Math.max(4, brushWidth / 2)}
            fill="rgba(16, 185, 129, 0.08)"
            stroke="#ffffff"
            strokeWidth={2.8 / zoom}
          />
          {/* Inner high-contrast emerald precision ring */}
          <circle
            cx={0}
            cy={0}
            r={Math.max(4, brushWidth / 2)}
            fill="none"
            stroke="#059669"
            strokeWidth={1.5 / zoom}
          />

          {/* 4 Cardinal Crosshair Ticks across brush boundary */}
          {/* Top tick */}
          <line
            x1={0}
            y1={-Math.max(4, brushWidth / 2) - 5 / zoom}
            x2={0}
            y2={-Math.max(4, brushWidth / 2) + 5 / zoom}
            stroke="#ffffff"
            strokeWidth={2.8 / zoom}
            strokeLinecap="round"
          />
          <line
            x1={0}
            y1={-Math.max(4, brushWidth / 2) - 5 / zoom}
            x2={0}
            y2={-Math.max(4, brushWidth / 2) + 5 / zoom}
            stroke="#059669"
            strokeWidth={1.4 / zoom}
            strokeLinecap="round"
          />

          {/* Bottom tick */}
          <line
            x1={0}
            y1={Math.max(4, brushWidth / 2) - 5 / zoom}
            x2={0}
            y2={Math.max(4, brushWidth / 2) + 5 / zoom}
            stroke="#ffffff"
            strokeWidth={2.8 / zoom}
            strokeLinecap="round"
          />
          <line
            x1={0}
            y1={Math.max(4, brushWidth / 2) - 5 / zoom}
            x2={0}
            y2={Math.max(4, brushWidth / 2) + 5 / zoom}
            stroke="#059669"
            strokeWidth={1.4 / zoom}
            strokeLinecap="round"
          />

          {/* Left tick */}
          <line
            x1={-Math.max(4, brushWidth / 2) - 5 / zoom}
            y1={0}
            x2={-Math.max(4, brushWidth / 2) + 5 / zoom}
            y2={0}
            stroke="#ffffff"
            strokeWidth={2.8 / zoom}
            strokeLinecap="round"
          />
          <line
            x1={-Math.max(4, brushWidth / 2) - 5 / zoom}
            y1={0}
            x2={-Math.max(4, brushWidth / 2) + 5 / zoom}
            y2={0}
            stroke="#059669"
            strokeWidth={1.4 / zoom}
            strokeLinecap="round"
          />

          {/* Right tick */}
          <line
            x1={Math.max(4, brushWidth / 2) - 5 / zoom}
            y1={0}
            x2={Math.max(4, brushWidth / 2) + 5 / zoom}
            y2={0}
            stroke="#ffffff"
            strokeWidth={2.8 / zoom}
            strokeLinecap="round"
          />
          <line
            x1={Math.max(4, brushWidth / 2) - 5 / zoom}
            y1={0}
            x2={Math.max(4, brushWidth / 2) + 5 / zoom}
            y2={0}
            stroke="#059669"
            strokeWidth={1.4 / zoom}
            strokeLinecap="round"
          />

          {/* Center Target Dot: White Outer Ring + Emerald Center */}
          <circle
            cx={0}
            cy={0}
            r={3.2 / zoom}
            fill="#ffffff"
          />
          <circle
            cx={0}
            cy={0}
            r={1.8 / zoom}
            fill="#059669"
          />

          {/* Floating brush size tag badge above cursor */}
          {brushWidth >= 20 && (
            <g transform={`translate(0, ${-Math.max(4, brushWidth / 2) - 13 / zoom})`}>
              <rect
                x={-28 / zoom}
                y={-9 / zoom}
                width={56 / zoom}
                height={16 / zoom}
                rx={8 / zoom}
                fill="#0f172a"
                stroke="#ffffff"
                strokeWidth={1.5 / zoom}
                opacity={0.9}
              />
              <text
                x={0}
                y={0}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#ffffff"
                fontSize={9 / zoom}
                fontWeight="bold"
                fontFamily="system-ui, -apple-system, sans-serif"
              >
                {brushWidth}px
              </text>
            </g>
          )}
        </g>
      )}

      {/* ---------------- HARDWARE-ACCELERATED ERASER RETICLE (0ms DIRECT GPU DOM TRACKING) ---------------- */}
      {toolMode === 'eraser' && gridSettings.showCursorCrosshair && (
        <g
          ref={eraserReticleRef}
          id="live-eraser-reticle"
          className="eraser-sweep-reticle pointer-events-none select-none"
          style={{ display: 'none' }}
        >
          {eraserMode === 'node' ? (
            /* Specialized Anchor Point Eraser (アンカー点消去) Pointer */
            <g className="anchor-eraser-pointer">
              {/* Outer glow & deletion boundary circle */}
              <circle
                cx={0}
                cy={0}
                r={eraserSize / 2}
                fill="rgba(244, 63, 94, 0.12)"
                stroke="#ffffff"
                strokeWidth={3 / zoom}
              />
              {/* Inner high-contrast dashed ring */}
              <circle
                cx={0}
                cy={0}
                r={eraserSize / 2}
                fill="none"
                stroke="#e11d48"
                strokeWidth={1.8 / zoom}
                strokeDasharray={`${5 / zoom} ${3 / zoom}`}
              />

              {/* High-contrast precision crosshair lines */}
              {/* Horizontal white backing */}
              <line
                x1={-eraserSize / 2 - 6 / zoom}
                y1={0}
                x2={eraserSize / 2 + 6 / zoom}
                y2={0}
                stroke="#ffffff"
                strokeWidth={2.8 / zoom}
                strokeLinecap="round"
              />
              {/* Horizontal rose crosshair */}
              <line
                x1={-eraserSize / 2 - 6 / zoom}
                y1={0}
                x2={eraserSize / 2 + 6 / zoom}
                y2={0}
                stroke="#e11d48"
                strokeWidth={1.4 / zoom}
                strokeLinecap="round"
              />
              {/* Vertical white backing */}
              <line
                x1={0}
                y1={-eraserSize / 2 - 6 / zoom}
                x2={0}
                y2={eraserSize / 2 + 6 / zoom}
                stroke="#ffffff"
                strokeWidth={2.8 / zoom}
                strokeLinecap="round"
              />
              {/* Vertical rose crosshair */}
              <line
                x1={0}
                y1={-eraserSize / 2 - 6 / zoom}
                x2={0}
                y2={eraserSize / 2 + 6 / zoom}
                stroke="#e11d48"
                strokeWidth={1.4 / zoom}
                strokeLinecap="round"
              />

              {/* Center Node Target Diamond/Box */}
              <rect
                x={-4 / zoom}
                y={-4 / zoom}
                width={8 / zoom}
                height={8 / zoom}
                fill="#ffffff"
                stroke="#0f172a"
                strokeWidth={1.5 / zoom}
                rx={1 / zoom}
              />
              {/* Minus / Delete symbol inside center diamond */}
              <line
                x1={-2 / zoom}
                y1={0}
                x2={2 / zoom}
                y2={0}
                stroke="#e11d48"
                strokeWidth={1.5 / zoom}
                strokeLinecap="round"
              />

              {/* Floating Tag Badge Above Cursor */}
              <g transform={`translate(0, ${-eraserSize / 2 - 14 / zoom})`}>
                <rect
                  x={-58 / zoom}
                  y={-10 / zoom}
                  width={116 / zoom}
                  height={18 / zoom}
                  rx={9 / zoom}
                  fill="#0f172a"
                  stroke="#ffffff"
                  strokeWidth={1.5 / zoom}
                  opacity={0.95}
                />
                <text
                  x={0}
                  y={0}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#ffffff"
                  fontSize={10 / zoom}
                  fontWeight="bold"
                  fontFamily="system-ui, -apple-system, sans-serif"
                >
                  ⌖ アンカー消去 ({eraserSize}px)
                </text>
              </g>
            </g>
          ) : (
            /* Stroke / Cut Standard Eraser Pointer */
            <g className="standard-eraser-pointer">
              {/* Outer high-contrast ring */}
              <circle
                cx={0}
                cy={0}
                r={eraserSize / 2}
                fill="rgba(239, 68, 68, 0.16)"
                stroke="#ffffff"
                strokeWidth={2.5 / zoom}
              />
              {/* Inner dashed red circle */}
              <circle
                cx={0}
                cy={0}
                r={eraserSize / 2}
                fill="none"
                stroke="#ef4444"
                strokeWidth={1.8 / zoom}
                strokeDasharray={`${4 / zoom} ${3 / zoom}`}
              />
              {/* Center point */}
              <circle
                cx={0}
                cy={0}
                r={2.5 / zoom}
                fill="#ef4444"
                stroke="#ffffff"
                strokeWidth={1 / zoom}
              />
            </g>
          )}
        </g>
      )}
    </>
  );
});

CursorReticleOverlay.displayName = 'CursorReticleOverlay';
