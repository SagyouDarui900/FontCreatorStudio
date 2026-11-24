import React from 'react';
import { Point } from '../../types';
import { useLiveViewportZoom } from './viewportStore';

interface RulerMeasurementLayerProps {
  rulerMeasurement: { start: Point; end: Point; active?: boolean } | null;
  onDrawLine?: () => void;
  onConvertToGuide?: (type?: 'auto' | 'diagonal' | 'h' | 'v') => void;
  onClear?: () => void;
}

export const RulerMeasurementLayer: React.FC<RulerMeasurementLayerProps> = React.memo(
  ({ rulerMeasurement, onDrawLine, onConvertToGuide, onClear }) => {
    // M6: keep the measurement label a constant screen size during pinch zoom.
    const zoom = useLiveViewportZoom();
    if (!rulerMeasurement) return null;

    const { start, end, active } = rulerMeasurement;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 2) return null;
    const angleDeg = Math.round((Math.atan2(-dy, dx) * 180) / Math.PI);
    const positiveAngle = (angleDeg % 360 + 360) % 360;
    const isOrthogonal = Math.abs(dx) < 2 || Math.abs(dy) < 2;
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    // Offset compact readout label perpendicular to the ruler line so it stays clear of measured strokes
    const nx = -dy / dist;
    const ny = dx / dist;
    const labelOffset = 18 / zoom;
    const labelX = midX + nx * labelOffset;
    const labelY = midY + ny * labelOffset;

    return (
      <g className="ruler-measurement-layer select-none pointer-events-none">
        {/* Delta X / Delta Y Projection lines */}
        {Math.abs(dx) > 10 && Math.abs(dy) > 10 && (
          <g>
            <line
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={start.y}
              stroke="#0ea5e9"
              strokeWidth={1 / zoom}
              strokeDasharray="4 4"
              strokeOpacity={0.6}
            />
            <line
              x1={end.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              stroke="#0ea5e9"
              strokeWidth={1 / zoom}
              strokeDasharray="4 4"
              strokeOpacity={0.6}
            />
            <text
              x={(start.x + end.x) / 2}
              y={start.y - 4 / zoom}
              fill="#0284c7"
              fontSize={9.5 / zoom}
              fontFamily="monospace"
              textAnchor="middle"
            >
              ΔX: {Math.round(Math.abs(dx))}px
            </text>
            <text
              x={end.x + (dx >= 0 ? 6 : -6) / zoom}
              y={(start.y + end.y) / 2}
              fill="#0284c7"
              fontSize={9.5 / zoom}
              fontFamily="monospace"
              textAnchor={dx >= 0 ? 'start' : 'end'}
            >
              ΔY: {Math.round(Math.abs(dy))}px
            </text>
          </g>
        )}

        {/* Main Ruler Measurement Vector Line */}
        <line
          x1={start.x}
          y1={start.y}
          x2={end.x}
          y2={end.y}
          stroke="#0284c7"
          strokeWidth={2 / zoom}
        />

        {/* Start Point Marker */}
        <circle
          cx={start.x}
          cy={start.y}
          r={4 / zoom}
          fill="#0284c7"
          stroke="#ffffff"
          strokeWidth={1.5 / zoom}
        />

        {/* End Point Marker */}
        <circle
          cx={end.x}
          cy={end.y}
          r={4 / zoom}
          fill="#0369a1"
          stroke="#ffffff"
          strokeWidth={1.5 / zoom}
        />

        {/* Lightweight Non-Interactive Measurement Readout */}
        <g transform={`translate(${labelX}, ${labelY})`}>
          <rect
            x={-48 / zoom}
            y={-9 / zoom}
            width={96 / zoom}
            height={18 / zoom}
            rx={4 / zoom}
            fill="#0f172a"
            fillOpacity={0.85}
          />
          <text
            x={0}
            y={0.5 / zoom}
            fill="#e0f2fe"
            fontSize={9.5 / zoom}
            fontWeight="bold"
            fontFamily="monospace"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {Math.round(dist)}px {positiveAngle}°{isOrthogonal ? '・直' : ''}
          </text>
        </g>
      </g>
    );
  }
);
RulerMeasurementLayer.displayName = 'RulerMeasurementLayer';
