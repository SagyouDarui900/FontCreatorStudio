import React from 'react';
import { SnapGuideLine } from '../../types';
import { useLiveViewportZoom } from './viewportStore';

export interface SmartSnapGuidesLayerProps {
  activeSnapGuides: SnapGuideLine[];
  selectionColor: string;
  unitsPerEm?: number;
}

export const SmartSnapGuidesLayer: React.FC<SmartSnapGuidesLayerProps> = React.memo(
  ({ activeSnapGuides, selectionColor, unitsPerEm = 1000 }) => {
    const liveZoom = useLiveViewportZoom();
    const zoom = liveZoom && liveZoom > 0 ? liveZoom : 1;
    if (!activeSnapGuides || activeSnapGuides.length === 0) return null;

    const upm = unitsPerEm && unitsPerEm > 0 ? unitsPerEm : 1000;
    const spanStart = -Math.round(upm * 0.3);
    const spanEnd = Math.round(upm * 1.3);
    const diagonalSpan = Math.max(2000, upm * 2);
    const badgeMaxX = Math.max(30, upm - 150);
    const badgeMaxY = Math.max(30, upm - 60);
    const halfUpm = upm / 2;

    return (
      <g className="smart-snap-guidelines select-none pointer-events-none">
        {activeSnapGuides.map((guide) => {
          const isBaseline = guide.targetType === 'baseline';
          const isLsb = guide.targetType === 'lsb';
          const lineColor = guide.color || (isBaseline ? '#ef4444' : isLsb ? selectionColor : '#06b6d4');
          const strokeW = (isBaseline || isLsb ? 2.5 : 2) / zoom;

          return (
            <g key={guide.id}>
              {guide.type === 'diagonal' ? (
                (() => {
                  const origin = guide.p1 || guide.snapPoint || { x: halfUpm, y: halfUpm };
                  let dx = 1;
                  let dy = 0;
                  if (
                    guide.p2 &&
                    (Math.abs(guide.p2.x - origin.x) > 0.001 || Math.abs(guide.p2.y - origin.y) > 0.001)
                  ) {
                    dx = guide.p2.x - origin.x;
                    dy = guide.p2.y - origin.y;
                  } else if (guide.angle !== undefined) {
                    const rad = (guide.angle * Math.PI) / 180;
                    dx = Math.cos(rad);
                    dy = Math.sin(rad);
                  }
                  const len = Math.hypot(dx, dy) || 1;
                  const ux = dx / len;
                  const uy = dy / len;
                  const span = diagonalSpan;
                  const x1 = origin.x - ux * span;
                  const y1 = origin.y - uy * span;
                  const x2 = origin.x + ux * span;
                  const y2 = origin.y + uy * span;
                  const badgeAnchor = guide.snapPoint || origin;

                  return (
                    <>
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke={lineColor}
                        strokeWidth={strokeW * 3}
                        strokeOpacity={0.35}
                      />
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke={lineColor}
                        strokeWidth={strokeW}
                        strokeDasharray={`${6 / zoom} ${4 / zoom}`}
                      />
                      {guide.snapPoint && (
                        <g transform={`translate(${guide.snapPoint.x}, ${guide.snapPoint.y})`}>
                          <circle r={8 / zoom} fill={lineColor} fillOpacity={0.35} />
                          <circle r={4.5 / zoom} fill="#ffffff" stroke={lineColor} strokeWidth={2 / zoom} />
                          <line x1={-12 / zoom} y1={0} x2={12 / zoom} y2={0} stroke={lineColor} strokeWidth={1.8 / zoom} />
                          <line x1={0} y1={-12 / zoom} x2={0} y2={12 / zoom} stroke={lineColor} strokeWidth={1.8 / zoom} />
                        </g>
                      )}
                      <g
                        transform={`translate(${
                          Math.max(30, Math.min(badgeMaxX, badgeAnchor.x + 10 / zoom))
                        }, ${Math.max(30, Math.min(badgeMaxY, badgeAnchor.y - 16 / zoom))})`}
                      >
                        <rect
                          x={-4 / zoom}
                          y={-12 / zoom}
                          width={(guide.targetName.length * 11 + 28) / zoom}
                          height={18 / zoom}
                          rx={4 / zoom}
                          fill="#082f49"
                          fillOpacity={0.94}
                          stroke={lineColor}
                          strokeWidth={1.2 / zoom}
                        />
                        <text
                          x={5 / zoom}
                          y={1 / zoom}
                          fill="#7dd3fc"
                          fontSize={10.5 / zoom}
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          {guide.targetName}
                        </text>
                      </g>
                    </>
                  );
                })()
              ) : guide.type === 'h' ? (
                <>
                  {/* Outer Glow line */}
                  <line
                    x1={spanStart}
                    y1={guide.position}
                    x2={spanEnd}
                    y2={guide.position}
                    stroke={lineColor}
                    strokeWidth={strokeW * 3}
                    strokeOpacity={0.35}
                  />
                  {/* Main Crisp Snap Line */}
                  <line
                    x1={spanStart}
                    y1={guide.position}
                    x2={spanEnd}
                    y2={guide.position}
                    stroke={lineColor}
                    strokeWidth={strokeW}
                    strokeDasharray={isBaseline ? undefined : `${6 / zoom} ${4 / zoom}`}
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
                        ? Math.max(30, Math.min(badgeMaxX, guide.snapPoint.x - (guide.targetName.length * 5) / zoom))
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
                    y1={spanStart}
                    x2={guide.position}
                    y2={spanEnd}
                    stroke={lineColor}
                    strokeWidth={strokeW * 3}
                    strokeOpacity={0.35}
                  />
                  {/* Main Crisp Snap Line */}
                  <line
                    x1={guide.position}
                    y1={spanStart}
                    x2={guide.position}
                    y2={spanEnd}
                    stroke={lineColor}
                    strokeWidth={strokeW}
                    strokeDasharray={isLsb ? undefined : `${6 / zoom} ${4 / zoom}`}
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
                      guide.snapPoint ? Math.max(30, Math.min(badgeMaxY, guide.snapPoint.y - 10 / zoom)) : 60
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
