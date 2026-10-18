import React, { memo } from 'react';
import { SnapGuideLine } from '../../types';

export interface SmartSnapGuidesLayerProps {
  activeSnapGuides: SnapGuideLine[];
  selectionColor: string;
  zoom: number;
}

export const SmartSnapGuidesLayer: React.FC<SmartSnapGuidesLayerProps> = memo(
  ({ activeSnapGuides, selectionColor, zoom }) => {
    if (!activeSnapGuides || activeSnapGuides.length === 0) return null;

    return (
      <g className="smart-snap-guidelines select-none pointer-events-none">
        {activeSnapGuides.map((guide) => {
          const isBaseline = guide.targetType === 'baseline';
          const isLsb = guide.targetType === 'lsb';
          const lineColor = guide.color || (isBaseline ? '#ef4444' : isLsb ? selectionColor : '#06b6d4');
          const strokeW = (isBaseline || isLsb ? 2.5 : 2) / zoom;

          return (
            <g key={guide.id}>
              {guide.type === 'h' ? (
                <>
                  {/* Outer Glow line */}
                  <line
                    x1={-300}
                    y1={guide.position}
                    x2={1300}
                    y2={guide.position}
                    stroke={lineColor}
                    strokeWidth={strokeW * 3}
                    strokeOpacity={0.35}
                  />
                  {/* Main Crisp Snap Line */}
                  <line
                    x1={-300}
                    y1={guide.position}
                    x2={1300}
                    y2={guide.position}
                    stroke={lineColor}
                    strokeWidth={strokeW}
                    strokeDasharray={isBaseline ? undefined : '6 4'}
                  />
                  {/* Snap Target Contact Marker */}
                  {guide.snapPoint && (
                    <g transform={`translate(${guide.snapPoint.x}, ${guide.position})`}>
                      <circle r={8 / zoom} fill={lineColor} fillOpacity={0.35} />
                      <circle r={4.5 / zoom} fill="#ffffff" stroke={lineColor} strokeWidth={2 / zoom} />
                      <line x1={-12 / zoom} y1={0} x2={12 / zoom} y2={0} stroke={lineColor} strokeWidth={1.8 / zoom} />
                      <line x1={0} y1={-12 / zoom} x2={0} y2={12 / zoom} stroke={lineColor} strokeWidth={1.8 / zoom} />
                    </g>
                  )}
                  {/* HUD Label Badge */}
                  <g
                    transform={`translate(${
                      guide.snapPoint
                        ? Math.max(30, Math.min(850, guide.snapPoint.x - (guide.targetName.length * 5) / zoom))
                        : 40
                    }, ${guide.position - 16 / zoom})`}
                  >
                    <rect
                      x={-6 / zoom}
                      y={-12 / zoom}
                      width={(guide.targetName.length * 11 + 28) / zoom}
                      height={18 / zoom}
                      rx={4 / zoom}
                      fill={isBaseline ? '#450a0a' : isLsb ? '#022c22' : '#082f49'}
                      fillOpacity={0.94}
                      stroke={lineColor}
                      strokeWidth={1.2 / zoom}
                    />
                    <text
                      x={3 / zoom}
                      y={1 / zoom}
                      fill={isBaseline ? '#fca5a5' : isLsb ? '#6ee7b7' : '#7dd3fc'}
                      fontSize={10.5 / zoom}
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {guide.targetName}
                    </text>
                  </g>
                </>
              ) : (
                <>
                  {/* Outer Glow line */}
                  <line
                    x1={guide.position}
                    y1={-300}
                    x2={guide.position}
                    y2={1300}
                    stroke={lineColor}
                    strokeWidth={strokeW * 3}
                    strokeOpacity={0.35}
                  />
                  {/* Main Crisp Snap Line */}
                  <line
                    x1={guide.position}
                    y1={-300}
                    x2={guide.position}
                    y2={1300}
                    stroke={lineColor}
                    strokeWidth={strokeW}
                    strokeDasharray={isLsb ? undefined : '6 4'}
                  />
                  {/* Snap Target Contact Marker */}
                  {guide.snapPoint && (
                    <g transform={`translate(${guide.position}, ${guide.snapPoint.y})`}>
                      <circle r={8 / zoom} fill={lineColor} fillOpacity={0.35} />
                      <circle r={4.5 / zoom} fill="#ffffff" stroke={lineColor} strokeWidth={2 / zoom} />
                      <line x1={-12 / zoom} y1={0} x2={12 / zoom} y2={0} stroke={lineColor} strokeWidth={1.8 / zoom} />
                      <line x1={0} y1={-12 / zoom} x2={0} y2={12 / zoom} stroke={lineColor} strokeWidth={1.8 / zoom} />
                    </g>
                  )}
                  {/* HUD Label Badge */}
                  <g
                    transform={`translate(${guide.position + 10 / zoom}, ${
                      guide.snapPoint
                        ? Math.max(30, Math.min(940, guide.snapPoint.y - 10 / zoom))
                        : 60
                    })`}
                  >
                    <rect
                      x={-4 / zoom}
                      y={-12 / zoom}
                      width={(guide.targetName.length * 11 + 28) / zoom}
                      height={18 / zoom}
                      rx={4 / zoom}
                      fill={isLsb ? '#022c22' : '#082f49'}
                      fillOpacity={0.94}
                      stroke={lineColor}
                      strokeWidth={1.2 / zoom}
                    />
                    <text
                      x={5 / zoom}
                      y={1 / zoom}
                      fill={isLsb ? '#6ee7b7' : '#7dd3fc'}
                      fontSize={10.5 / zoom}
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {guide.targetName}
                    </text>
                  </g>
                </>
              )}
            </g>
          );
        })}
      </g>
    );
  }
);

SmartSnapGuidesLayer.displayName = 'SmartSnapGuidesLayer';
