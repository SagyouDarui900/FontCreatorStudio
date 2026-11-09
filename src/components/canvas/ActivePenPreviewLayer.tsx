import React from 'react';
import { PathContour, Point } from '../../types';

export interface ActivePenPreviewLayerProps {
  activePenContour: PathContour | null;
  penSvgPath: string;
  penStrokeWidth: number;
  penCapStyle: 'round' | 'square' | 'butt';
  penMousePos: Point | null;
  hoverCanvasPos: Point | null;
  zoom: number;
  selectionColor: string;
}

export const ActivePenPreviewLayer: React.FC<ActivePenPreviewLayerProps> = React.memo(
  ({
    activePenContour,
    penSvgPath,
    penStrokeWidth,
    penCapStyle,
    penMousePos,
    hoverCanvasPos,
    zoom,
    selectionColor,
  }) => {
    if (!activePenContour) return null;

    return (
      <g className="active-pen-in-progress pointer-events-none select-none">
        {/* Committed segments path */}
        {activePenContour.nodes.length > 1 && (
          <>
            {/* Translucent stroke width preview envelope */}
            <path
              d={penSvgPath}
              fill="none"
              stroke="#0284c7"
              strokeOpacity={0.25}
              strokeWidth={penStrokeWidth}
              strokeLinecap={penCapStyle}
              strokeLinejoin={penCapStyle === 'round' ? 'round' : 'miter'}
            />
            {/* Outer high-contrast white stroke */}
            <path
              d={penSvgPath}
              fill="none"
              stroke="#ffffff"
              strokeWidth={4 / zoom}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Inner vibrant cyan path stroke */}
            <path
              d={penSvgPath}
              fill="none"
              stroke="#0284c7"
              strokeWidth={2.2 / zoom}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        )}

        {/* Rubber-band dynamic guide curve or line from last node to current mouse/hover pos */}
        {(() => {
          const lastNode = activePenContour.nodes[activePenContour.nodes.length - 1];
          const mouseTarget = penMousePos || hoverCanvasPos;
          if (!lastNode || !mouseTarget) return null;

          const firstNode = activePenContour.nodes[0];
          const distToStart = Math.hypot(mouseTarget.x - firstNode.x, mouseTarget.y - firstNode.y);
          const isNearStart = activePenContour.nodes.length >= 2 && distToStart <= 24 / zoom;
          const targetPoint = isNearStart ? { x: firstNode.x, y: firstNode.y } : mouseTarget;

          // Compute cubic bezier rubberband when lastNode has handleOut or when closing with firstNode.handleIn
          const hasBezierRubberband = Boolean(lastNode.handleOut || (isNearStart && firstNode.handleIn));
          const cp1 = lastNode.handleOut ?? { x: lastNode.x, y: lastNode.y };
          const cp2 = isNearStart && firstNode.handleIn ? firstNode.handleIn : targetPoint;
          const curvePathD = hasBezierRubberband
            ? `M ${lastNode.x} ${lastNode.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${targetPoint.x} ${targetPoint.y}`
            : null;

          return (
            <g>
              {/* Rubberband cubic curve or straight line */}
              {curvePathD ? (
                <>
                  <path
                    d={curvePathD}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth={3.5 / zoom}
                    strokeDasharray="5 3"
                  />
                  <path
                    d={curvePathD}
                    fill="none"
                    stroke={isNearStart ? selectionColor : '#0ea5e9'}
                    strokeWidth={2 / zoom}
                    strokeDasharray="5 3"
                  />
                </>
              ) : (
                <>
                  <line
                    x1={lastNode.x}
                    y1={lastNode.y}
                    x2={targetPoint.x}
                    y2={targetPoint.y}
                    stroke="#ffffff"
                    strokeWidth={3.5 / zoom}
                    strokeDasharray="5 3"
                  />
                  <line
                    x1={lastNode.x}
                    y1={lastNode.y}
                    x2={targetPoint.x}
                    y2={targetPoint.y}
                    stroke={isNearStart ? selectionColor : '#0ea5e9'}
                    strokeWidth={2 / zoom}
                    strokeDasharray="5 3"
                  />
                </>
              )}

              {/* Ghost node preview at cursor location */}
              {!isNearStart && (
                <g transform={`translate(${mouseTarget.x}, ${mouseTarget.y})`}>
                  <circle
                    r={8 / zoom}
                    fill="#0ea5e9"
                    fillOpacity={0.2}
                    stroke="#ffffff"
                    strokeWidth={1.5 / zoom}
                    strokeDasharray="3 2"
                  />
                  <circle r={3.5 / zoom} fill="#0284c7" stroke="#ffffff" strokeWidth={1.2 / zoom} />
                </g>
              )}

              {/* Near start / Close path indicator badge */}
              {isNearStart && (
                <g transform={`translate(${firstNode.x}, ${firstNode.y})`}>
                  <circle r={14 / zoom} fill={selectionColor} fillOpacity={0.2} />
                  <circle r={10 / zoom} fill={selectionColor} stroke="#ffffff" strokeWidth={2.5 / zoom} />
                  <g transform={`translate(0, ${-22 / zoom})`}>
                    <rect
                      x={-45 / zoom}
                      y={-10 / zoom}
                      width={90 / zoom}
                      height={18 / zoom}
                      rx={4 / zoom}
                      fill="#022c22"
                      stroke="#34d399"
                      strokeWidth={1 / zoom}
                    />
                    <text
                      x={0}
                      y={3 / zoom}
                      fill="#6ee7b7"
                      fontSize={9.5 / zoom}
                      fontWeight="bold"
                      textAnchor="middle"
                      fontFamily="sans-serif"
                    >
                      クリックで閉じる
                    </text>
                  </g>
                </g>
              )}
            </g>
          );
        })()}

        {/* Real-time Bezier Handle Lines and Anchor Controls for In-Progress Pen Nodes */}
        {activePenContour.nodes.map((node) => {
          return (
            <g key={`pen-handles-${node.id}`}>
              {node.handleIn && (
                <g>
                  <line
                    x1={node.x}
                    y1={node.y}
                    x2={node.handleIn.x}
                    y2={node.handleIn.y}
                    stroke="#0284c7"
                    strokeWidth={1.4 / zoom}
                    strokeDasharray="3 2"
                  />
                  <circle
                    cx={node.handleIn.x}
                    cy={node.handleIn.y}
                    r={3.8 / zoom}
                    fill="#ffffff"
                    stroke="#0284c7"
                    strokeWidth={1.4 / zoom}
                  />
                </g>
              )}
              {node.handleOut && (
                <g>
                  <line
                    x1={node.x}
                    y1={node.y}
                    x2={node.handleOut.x}
                    y2={node.handleOut.y}
                    stroke="#f59e0b"
                    strokeWidth={1.4 / zoom}
                    strokeDasharray="3 2"
                  />
                  <circle
                    cx={node.handleOut.x}
                    cy={node.handleOut.y}
                    r={3.8 / zoom}
                    fill="#ffffff"
                    stroke="#f59e0b"
                    strokeWidth={1.4 / zoom}
                  />
                </g>
              )}
            </g>
          );
        })}

        {/* Nodes on active pen contour */}
        {activePenContour.nodes.map((node, idx) => {
          const isFirst = idx === 0;
          const isLast = idx === activePenContour.nodes.length - 1;
          return (
            <g key={node.id}>
              {/* Outer white ring */}
              <circle
                cx={node.x}
                cy={node.y}
                r={isFirst ? 8.5 / zoom : 7 / zoom}
                fill="#ffffff"
              />
              {/* Inner colored node */}
              <circle
                cx={node.x}
                cy={node.y}
                r={isFirst ? 6.5 / zoom : 5 / zoom}
                fill={isFirst ? selectionColor : isLast ? '#f59e0b' : '#0284c7'}
              />
              {/* First node indicator letter */}
              {isFirst && (
                <text
                  x={node.x}
                  y={node.y - 10 / zoom}
                  fill={selectionColor}
                  fontSize={9.5 / zoom}
                  fontWeight="bold"
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  始点
                </text>
              )}
            </g>
          );
        })}
      </g>
    );
  }
);
