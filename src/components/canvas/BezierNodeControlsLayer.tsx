import React from 'react';
import { PathContour, BezierNode, Point, ToolMode, GridSettings } from '../../types';
import { contoursToSvgPath } from '../../utils/pathUtils';

export interface BezierNodeControlsLayerProps {
  showNodes?: boolean;
  contours: PathContour[];
  contourSvgMap: Map<string, string>;
  toolMode: ToolMode;
  eraserMode: 'stroke' | 'cut' | 'all' | 'node' | 'point';
  eraserSize: number;
  hoverCanvasPos: Point | null;
  selectedContourId: string | null;
  selectedNodeId: string | null;
  nodeStyle: 'clean' | 'full' | 'selected_only';
  gridSettings: GridSettings;
  zoom: number;
  isLight: boolean;
  startNodeOrHandleDrag: (
    e: React.PointerEvent,
    contour: PathContour,
    node: BezierNode,
    handleType: 'node' | 'handleIn' | 'handleOut'
  ) => void;
  handleToggleNodeType: (contourId: string, nodeId: string) => void;
}

export const BezierNodeControlsLayer: React.FC<BezierNodeControlsLayerProps> = React.memo(
  ({
    showNodes = true,
    contours,
    contourSvgMap,
    toolMode,
    eraserMode,
    eraserSize,
    hoverCanvasPos,
    selectedContourId,
    selectedNodeId,
    nodeStyle,
    gridSettings,
    zoom,
    isLight,
    startNodeOrHandleDrag,
    handleToggleNodeType,
  }) => {
    if (!showNodes && !(toolMode === 'eraser' && eraserMode === 'node')) {
      return null;
    }

    return (
      <g className="bezier-controls select-none">
        {/* When in Anchor Point Eraser Mode, render high-contrast path trajectory guide lines connecting all nodes */}
        {toolMode === 'eraser' && eraserMode === 'node' && (
          <g className="eraser-path-trajectory-guides pointer-events-none">
            {contours.map((contour) => {
              const pathD = contourSvgMap.get(contour.id) || contoursToSvgPath([contour]);
              return (
                <path
                  key={`eraser-guide-contour-${contour.id}`}
                  d={pathD}
                  fill="none"
                  stroke="#0ea5e9"
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                  vectorEffect="non-scaling-stroke"
                  className="opacity-80"
                />
              );
            })}
          </g>
        )}

        {contours.map((contour) => {
          const isContourActive = contour.id === selectedContourId;
          const isEraserNodeMode = toolMode === 'eraser' && eraserMode === 'node';

          // When in selected_only style, skip unselected contours entirely (unless in eraser node mode where all nodes must be visible for deletion)
          if (nodeStyle === 'selected_only' && !isContourActive && !isEraserNodeMode) {
            return null;
          }

          // For inactive contours, if not in node mode or eraser node mode and showPoints is false, don't overwhelm screen
          if (!isContourActive && toolMode !== 'node' && !isEraserNodeMode && !gridSettings.showPoints) {
            return null;
          }

          const isNodeInteractive = toolMode === 'select' || toolMode === 'node';
          const isHandleInteractive = toolMode === 'select' || toolMode === 'node' || toolMode === 'pen';

          return (
            <g key={contour.id}>
              {contour.nodes.map((node) => {
                const isSelected = selectedNodeId === node.id;

                // In Anchor Eraser Mode: Check if node falls inside the eraser sweep circle
                const isInsideEraser =
                  isEraserNodeMode &&
                  hoverCanvasPos &&
                  Math.hypot(node.x - hoverCanvasPos.x, node.y - hoverCanvasPos.y) <= Math.max(2, eraserSize / 2);

                if (isEraserNodeMode) {
                  const eraseDotRadius = isInsideEraser ? 6.5 / zoom : 3.8 / zoom;
                  return (
                    <g key={`eraser-node-${node.id}`}>
                      {/* Targeted deletion ring when inside eraser sweep area */}
                      {isInsideEraser && (
                        <>
                          <circle
                            cx={node.x}
                            cy={node.y}
                            r={11 / zoom}
                            fill="rgba(244, 63, 94, 0.25)"
                            stroke="#f43f5e"
                            strokeWidth={2 / zoom}
                            strokeDasharray={`${4 / zoom} ${2 / zoom}`}
                          />
                          {/* High-contrast deletion indicator */}
                          <line
                            x1={node.x - 4 / zoom}
                            y1={node.y - 4 / zoom}
                            x2={node.x + 4 / zoom}
                            y2={node.y + 4 / zoom}
                            stroke="#ffffff"
                            strokeWidth={2 / zoom}
                            strokeLinecap="round"
                          />
                          <line
                            x1={node.x + 4 / zoom}
                            y1={node.y - 4 / zoom}
                            x2={node.x - 4 / zoom}
                            y2={node.y + 4 / zoom}
                            stroke="#ffffff"
                            strokeWidth={2 / zoom}
                            strokeLinecap="round"
                          />
                          <line
                            x1={node.x - 4 / zoom}
                            y1={node.y - 4 / zoom}
                            x2={node.x + 4 / zoom}
                            y2={node.y + 4 / zoom}
                            stroke="#e11d48"
                            strokeWidth={1.2 / zoom}
                            strokeLinecap="round"
                          />
                          <line
                            x1={node.x + 4 / zoom}
                            y1={node.y - 4 / zoom}
                            x2={node.x - 4 / zoom}
                            y2={node.y + 4 / zoom}
                            stroke="#e11d48"
                            strokeWidth={1.2 / zoom}
                            strokeLinecap="round"
                          />
                        </>
                      )}
                      {/* Anchor point dot */}
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={eraseDotRadius}
                        fill={isInsideEraser ? '#e11d48' : '#0284c7'}
                        stroke="#ffffff"
                        strokeWidth={1.5 / zoom}
                        className="pointer-events-none"
                      />
                    </g>
                  );
                }

                if (!isContourActive) {
                  // Unselected contour: render crisp, tiny unobtrusive dot with generous invisible hit area
                  const dotRadius = nodeStyle === 'full' ? 3.5 / zoom : 2.5 / zoom;
                  return (
                    <g key={node.id}>
                      {/* Invisible expanded hit area for touch/mouse ease */}
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={10 / zoom}
                        fill="transparent"
                        className={isNodeInteractive ? 'cursor-pointer' : 'pointer-events-none'}
                        pointerEvents={isNodeInteractive ? 'all' : 'none'}
                        onPointerDown={(e) => {
                          if (!isNodeInteractive) return;
                          startNodeOrHandleDrag(e, contour, node, 'node');
                        }}
                        onDoubleClick={(e) => {
                          if (!isNodeInteractive) return;
                          e.stopPropagation();
                          handleToggleNodeType(contour.id, node.id);
                        }}
                      />
                      {/* Visual small anchor dot with subtle white border */}
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={dotRadius}
                        fill="#0ea5e9"
                        stroke="#ffffff"
                        strokeWidth={1 / zoom}
                        className="pointer-events-none opacity-60"
                      />
                    </g>
                  );
                }

                // Active / Selected contour nodes
                const isClean = nodeStyle === 'clean';
                const isSmooth = node.type === 'smooth';

                // Node point visual dimensions (Clean vs Full)
                const anchorRadius = isSelected
                  ? isClean
                    ? 4.5 / zoom
                    : 5.5 / zoom
                  : isClean
                  ? 3.5 / zoom
                  : 4.5 / zoom;

                const handleDotRadius = isClean ? 3.2 / zoom : 4.5 / zoom;

                return (
                  <g key={node.id}>
                    {/* Control Handle Lines (handles shown if showHandles, or in node tool, or node is selected) */}
                    {(gridSettings.showHandles || isSelected || (toolMode === 'node' && isContourActive)) && (
                      <>
                        {node.handleIn && (
                          <g>
                            <line
                              x1={node.x}
                              y1={node.y}
                              x2={node.handleIn.x}
                              y2={node.handleIn.y}
                              stroke={isSelected ? '#0284c7' : '#38bdf8'}
                              strokeWidth={1.2 / zoom}
                              strokeOpacity={isSelected ? 0.9 : 0.6}
                              strokeDasharray={isClean ? '3 2' : undefined}
                            />
                            {/* HandleIn Touch target */}
                            <circle
                              cx={node.handleIn.x}
                              cy={node.handleIn.y}
                              r={12 / zoom}
                              fill="transparent"
                              className={isHandleInteractive ? 'cursor-move' : 'pointer-events-none'}
                              pointerEvents={isHandleInteractive ? 'all' : 'none'}
                              onPointerDown={(e) => {
                                if (!isHandleInteractive) return;
                                startNodeOrHandleDrag(e, contour, node, 'handleIn');
                              }}
                            />
                            {/* HandleIn Circle dot */}
                            <circle
                              cx={node.handleIn.x}
                              cy={node.handleIn.y}
                              r={handleDotRadius}
                              fill="#38bdf8"
                              stroke="#ffffff"
                              strokeWidth={1.2 / zoom}
                              className="pointer-events-none"
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
                              stroke={isSelected ? '#0284c7' : '#38bdf8'}
                              strokeWidth={1.2 / zoom}
                              strokeOpacity={isSelected ? 0.9 : 0.6}
                              strokeDasharray={isClean ? '3 2' : undefined}
                            />
                            {/* HandleOut Touch target */}
                            <circle
                              cx={node.handleOut.x}
                              cy={node.handleOut.y}
                              r={12 / zoom}
                              fill="transparent"
                              className={isHandleInteractive ? 'cursor-move' : 'pointer-events-none'}
                              pointerEvents={isHandleInteractive ? 'all' : 'none'}
                              onPointerDown={(e) => {
                                if (!isHandleInteractive) return;
                                startNodeOrHandleDrag(e, contour, node, 'handleOut');
                              }}
                            />
                            {/* HandleOut Circle dot */}
                            <circle
                              cx={node.handleOut.x}
                              cy={node.handleOut.y}
                              r={handleDotRadius}
                              fill="#38bdf8"
                              stroke="#ffffff"
                              strokeWidth={1.2 / zoom}
                              className="pointer-events-none"
                            />
                          </g>
                        )}
                      </>
                    )}

                    {/* Anchor Node: Invisible generous hit box for effortless clicking */}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={14 / zoom}
                      fill="transparent"
                      className={isNodeInteractive ? 'cursor-pointer' : 'pointer-events-none'}
                      pointerEvents={isNodeInteractive ? 'all' : 'none'}
                      onPointerDown={(e) => {
                        if (!isNodeInteractive) return;
                        startNodeOrHandleDrag(e, contour, node, 'node');
                      }}
                      onDoubleClick={(e) => {
                        if (!isNodeInteractive) return;
                        e.stopPropagation();
                        handleToggleNodeType(contour.id, node.id);
                      }}
                    />

                    {/* Anchor Node Point Visual: Sleek rounded dot with clear selection ring & geometric differentiation */}
                    {isClean ? (
                      <g className="pointer-events-none">
                        {/* Outer high-contrast highlight ring for selected node (retains shape) */}
                        {isSelected &&
                          (isSmooth ? (
                            <circle
                              cx={node.x}
                              cy={node.y}
                              r={anchorRadius + 3 / zoom}
                              fill="none"
                              stroke="#ef4444"
                              strokeWidth={1.8 / zoom}
                              strokeDasharray={`${3 / zoom} ${2 / zoom}`}
                            />
                          ) : (
                            <rect
                              x={node.x - anchorRadius - 2.5 / zoom}
                              y={node.y - anchorRadius - 2.5 / zoom}
                              width={(anchorRadius + 2.5 / zoom) * 2}
                              height={(anchorRadius + 2.5 / zoom) * 2}
                              rx={1.5 / zoom}
                              fill="none"
                              stroke="#ef4444"
                              strokeWidth={1.8 / zoom}
                              strokeDasharray={`${3 / zoom} ${2 / zoom}`}
                            />
                          ))}
                        {/* Clean Anchor Dot (Smooth = Circle, Corner = Square) */}
                        {isSmooth ? (
                          <circle
                            cx={node.x}
                            cy={node.y}
                            r={anchorRadius}
                            fill={isSelected ? '#ef4444' : '#0284c7'}
                            stroke="#ffffff"
                            strokeWidth={1.4 / zoom}
                          />
                        ) : (
                          <rect
                            x={node.x - anchorRadius}
                            y={node.y - anchorRadius}
                            width={anchorRadius * 2}
                            height={anchorRadius * 2}
                            rx={0.8 / zoom}
                            fill={isSelected ? '#ef4444' : '#d97706'}
                            stroke="#ffffff"
                            strokeWidth={1.4 / zoom}
                          />
                        )}
                      </g>
                    ) : (
                      <g className="pointer-events-none">
                        {/* Classic/Full representation with strict geometric shape distinction (Smooth = Circle, Corner = Square) */}
                        {isSelected &&
                          (isSmooth ? (
                            <circle
                              cx={node.x}
                              cy={node.y}
                              r={7.5 / zoom}
                              fill="none"
                              stroke="#ef4444"
                              strokeWidth={1.8 / zoom}
                              strokeDasharray={`${3 / zoom} ${2 / zoom}`}
                            />
                          ) : (
                            <rect
                              x={node.x - 7.5 / zoom}
                              y={node.y - 7.5 / zoom}
                              width={15 / zoom}
                              height={15 / zoom}
                              rx={1.5 / zoom}
                              fill="none"
                              stroke="#ef4444"
                              strokeWidth={1.8 / zoom}
                              strokeDasharray={`${3 / zoom} ${2 / zoom}`}
                            />
                          ))}
                        {isSmooth ? (
                          <circle
                            cx={node.x}
                            cy={node.y}
                            r={5 / zoom}
                            fill={isSelected ? '#ef4444' : '#38bdf8'}
                            stroke={isLight ? '#0f172a' : '#ffffff'}
                            strokeWidth={1.5 / zoom}
                          />
                        ) : (
                          <rect
                            x={node.x - 5 / zoom}
                            y={node.y - 5 / zoom}
                            width={10 / zoom}
                            height={10 / zoom}
                            rx={1 / zoom}
                            fill={isSelected ? '#ef4444' : '#d97706'}
                            stroke={isLight ? '#0f172a' : '#ffffff'}
                            strokeWidth={1.5 / zoom}
                          />
                        )}
                      </g>
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}
      </g>
    );
  }
);
