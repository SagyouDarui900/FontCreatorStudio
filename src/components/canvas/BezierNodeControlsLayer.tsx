import React, { useRef, useSyncExternalStore } from 'react';
import { PathContour, BezierNode, Point, ToolMode, GridSettings } from '../../types';
import { contoursToSvgPath } from '../../utils/path';
import { getHoverCanvasPos, subscribeHoverCanvasPos } from './hoverStore';
import { useLiveViewportZoom } from './viewportStore';

const NOOP_UNSUB = () => () => {};
const NULL_POS = (): Point | null => null;

/**
 * Quantized 1/zoom, rounded in log space to 2% steps. Node and handle sizes
 * are derived from this value instead of the raw zoom so that a memoized
 * node subtree can skip re-rendering while the zoom drifts within one step
 * (at most ~1% size error, under 0.15 screen px for the largest 14px hit
 * area). Handles keep a constant screen size during pinch zoom.
 */
const ZOOM_QUANT_STEP = Math.log(1.02);

export function quantizeInverseZoom(zoom: number): number {
  if (!zoom || zoom <= 0 || !Number.isFinite(zoom)) return 1;
  const inv = 1 / zoom;
  return Math.exp(Math.round(Math.log(inv) / ZOOM_QUANT_STEP) * ZOOM_QUANT_STEP);
}

type StartNodeOrHandleDrag = (
  e: React.PointerEvent,
  contour: PathContour,
  node: BezierNode,
  handleType: 'node' | 'handleIn' | 'handleOut'
) => void;

type HandleToggleNodeType = (contourId: string, nodeId: string) => void;

interface NodeControlsProps {
  node: BezierNode;
  contour: PathContour;
  /** Quantized 1/zoom; all sizes are `k * invZoom` so they stay constant on screen. */
  invZoom: number;
  isSelected: boolean;
  isContourActive: boolean;
  isEraserNodeMode: boolean;
  isInsideEraser: boolean;
  isNodeInteractive: boolean;
  isHandleInteractive: boolean;
  nodeStyle: 'clean' | 'full' | 'selected_only';
  showHandles: boolean;
  isLight: boolean;
  isGlyphLocked: boolean;
  dragRef: React.MutableRefObject<StartNodeOrHandleDrag>;
  toggleRef: React.MutableRefObject<HandleToggleNodeType>;
}

/**
 * One node's controls (anchor dot, handle lines/dots, eraser ring). Memoized
 * so a layer re-render caused by a zoom tick or a hover move only reconciles
 * the nodes whose props actually changed. All props are scalars or stable
 * references; callbacks are read through refs so their identity never breaks
 * the memo. The rendered output is purely derived from props.
 */
const NodeControls: React.FC<NodeControlsProps> = React.memo(
  ({
    node,
    contour,
    invZoom,
    isSelected,
    isContourActive,
    isEraserNodeMode,
    isInsideEraser,
    isNodeInteractive,
    isHandleInteractive,
    nodeStyle,
    showHandles,
    isLight,
    isGlyphLocked,
    dragRef,
    toggleRef,
  }) => {
    const z = invZoom;

    if (isEraserNodeMode) {
      const eraseDotRadius = isInsideEraser ? 6.5 * z : 3.8 * z;
      return (
        <g>
          {/* Targeted deletion ring when inside eraser sweep area */}
          {isInsideEraser && (
            <>
              <circle
                cx={node.x}
                cy={node.y}
                r={11 * z}
                fill="rgba(244, 63, 94, 0.25)"
                stroke="#f43f5e"
                strokeWidth={2 * z}
                strokeDasharray={`${4 * z} ${2 * z}`}
              />
              {/* High-contrast deletion indicator */}
              <line
                x1={node.x - 4 * z}
                y1={node.y - 4 * z}
                x2={node.x + 4 * z}
                y2={node.y + 4 * z}
                stroke="#ffffff"
                strokeWidth={2 * z}
                strokeLinecap="round"
              />
              <line
                x1={node.x + 4 * z}
                y1={node.y - 4 * z}
                x2={node.x - 4 * z}
                y2={node.y + 4 * z}
                stroke="#ffffff"
                strokeWidth={2 * z}
                strokeLinecap="round"
              />
              <line
                x1={node.x - 4 * z}
                y1={node.y - 4 * z}
                x2={node.x + 4 * z}
                y2={node.y + 4 * z}
                stroke="#e11d48"
                strokeWidth={1.2 * z}
                strokeLinecap="round"
              />
              <line
                x1={node.x + 4 * z}
                y1={node.y - 4 * z}
                x2={node.x - 4 * z}
                y2={node.y + 4 * z}
                stroke="#e11d48"
                strokeWidth={1.2 * z}
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
            strokeWidth={1.5 * z}
            className="pointer-events-none"
          />
        </g>
      );
    }

    if (!isContourActive) {
      // Unselected contour: render crisp, tiny unobtrusive dot with generous invisible hit area
      const dotRadius = nodeStyle === 'full' ? 3.5 * z : 2.5 * z;
      return (
        <g>
          {/* Invisible expanded hit area for touch/mouse ease */}
          <circle
            cx={node.x}
            cy={node.y}
            r={10 * z}
            fill="transparent"
            className={isNodeInteractive ? 'cursor-pointer' : 'pointer-events-none'}
            pointerEvents={isNodeInteractive ? 'all' : 'none'}
            onPointerDown={(e) => {
              if (!isNodeInteractive || (e.pointerType === 'mouse' && e.button !== 0)) return;
              dragRef.current(e, contour, node, 'node');
            }}
            onDoubleClick={(e) => {
              if (!isNodeInteractive) return;
              e.stopPropagation();
              toggleRef.current(contour.id, node.id);
            }}
          />
          {/* Visual small anchor dot with subtle white border */}
          <circle
            cx={node.x}
            cy={node.y}
            r={dotRadius}
            fill="#0ea5e9"
            stroke="#ffffff"
            strokeWidth={1 * z}
            className="pointer-events-none opacity-60"
          />
        </g>
      );
    }

    // Active / Selected contour nodes
    const isClean = nodeStyle === 'clean';
    const isSmooth = node.type === 'smooth' || node.type === 'symmetric';

    // Node point visual dimensions (Clean vs Full)
    const anchorRadius = isSelected
      ? isClean
        ? 4.5 * z
        : 5.5 * z
      : isClean
      ? 3.5 * z
      : 4.5 * z;

    const handleDotRadius = isClean ? 3.2 * z : 4.5 * z;

    return (
      <g>
        {/* Anchor Node: Invisible generous hit box rendered underneath handle hit boxes so short handles remain grabbable */}
        <circle
          cx={node.x}
          cy={node.y}
          r={14 * z}
          fill="transparent"
          className={isNodeInteractive ? 'cursor-pointer' : 'pointer-events-none'}
          pointerEvents={isNodeInteractive ? 'all' : 'none'}
          onPointerDown={(e) => {
            if (!isNodeInteractive || (e.pointerType === 'mouse' && e.button !== 0)) return;
            dragRef.current(e, contour, node, 'node');
          }}
          onDoubleClick={(e) => {
            if (!isNodeInteractive) return;
            e.stopPropagation();
            toggleRef.current(contour.id, node.id);
          }}
        />

        {/* Control Handle Lines (handles shown if showHandles, or in node tool, or node is selected) */}
        {showHandles && (
          <>
            {node.handleIn && (
              <g>
                <line
                  x1={node.x}
                  y1={node.y}
                  x2={node.handleIn.x}
                  y2={node.handleIn.y}
                  stroke={isSelected ? '#0284c7' : '#38bdf8'}
                  strokeWidth={1.2 * z}
                  strokeOpacity={isSelected ? 0.9 : 0.6}
                  strokeDasharray={isClean ? '3 2' : undefined}
                />
                {/* HandleIn Touch target */}
                <circle
                  cx={node.handleIn.x}
                  cy={node.handleIn.y}
                  r={12 * z}
                  fill="transparent"
                  className={isHandleInteractive ? (isGlyphLocked ? 'cursor-default' : 'cursor-move') : 'pointer-events-none'}
                  pointerEvents={isHandleInteractive ? 'all' : 'none'}
                  onPointerDown={(e) => {
                    if (!isHandleInteractive || (e.pointerType === 'mouse' && e.button !== 0)) return;
                    dragRef.current(e, contour, node, 'handleIn');
                  }}
                />
                {/* HandleIn Circle dot */}
                <circle
                  cx={node.handleIn.x}
                  cy={node.handleIn.y}
                  r={handleDotRadius}
                  fill="#38bdf8"
                  stroke="#ffffff"
                  strokeWidth={1.2 * z}
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
                  strokeWidth={1.2 * z}
                  strokeOpacity={isSelected ? 0.9 : 0.6}
                  strokeDasharray={isClean ? '3 2' : undefined}
                />
                {/* HandleOut Touch target */}
                <circle
                  cx={node.handleOut.x}
                  cy={node.handleOut.y}
                  r={12 * z}
                  fill="transparent"
                  className={isHandleInteractive ? (isGlyphLocked ? 'cursor-default' : 'cursor-move') : 'pointer-events-none'}
                  pointerEvents={isHandleInteractive ? 'all' : 'none'}
                  onPointerDown={(e) => {
                    if (!isHandleInteractive || (e.pointerType === 'mouse' && e.button !== 0)) return;
                    dragRef.current(e, contour, node, 'handleOut');
                  }}
                />
                {/* HandleOut Circle dot */}
                <circle
                  cx={node.handleOut.x}
                  cy={node.handleOut.y}
                  r={handleDotRadius}
                  fill="#38bdf8"
                  stroke="#ffffff"
                  strokeWidth={1.2 * z}
                  className="pointer-events-none"
                />
              </g>
            )}
          </>
        )}

        {/* Anchor Node Point Visual: Sleek rounded dot with clear selection ring & geometric differentiation */}
        {isClean ? (
          <g className="pointer-events-none">
            {/* Outer high-contrast highlight ring for selected node (retains shape) */}
            {isSelected &&
              (isSmooth ? (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={anchorRadius + 3 * z}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth={1.8 * z}
                  strokeDasharray={`${3 * z} ${2 * z}`}
                />
              ) : (
                <rect
                  x={node.x - anchorRadius - 2.5 * z}
                  y={node.y - anchorRadius - 2.5 * z}
                  width={(anchorRadius + 2.5 * z) * 2}
                  height={(anchorRadius + 2.5 * z) * 2}
                  rx={1.5 * z}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth={1.8 * z}
                  strokeDasharray={`${3 * z} ${2 * z}`}
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
                strokeWidth={1.4 * z}
              />
            ) : (
              <rect
                x={node.x - anchorRadius}
                y={node.y - anchorRadius}
                width={anchorRadius * 2}
                height={anchorRadius * 2}
                rx={0.8 * z}
                fill={isSelected ? '#ef4444' : '#d97706'}
                stroke="#ffffff"
                strokeWidth={1.4 * z}
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
                  r={7.5 * z}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth={1.8 * z}
                  strokeDasharray={`${3 * z} ${2 * z}`}
                />
              ) : (
                <rect
                  x={node.x - 7.5 * z}
                  y={node.y - 7.5 * z}
                  width={15 * z}
                  height={15 * z}
                  rx={1.5 * z}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth={1.8 * z}
                  strokeDasharray={`${3 * z} ${2 * z}`}
                />
              ))}
            {isSmooth ? (
              <circle
                cx={node.x}
                cy={node.y}
                r={5 * z}
                fill={isSelected ? '#ef4444' : '#38bdf8'}
                stroke={isLight ? '#0f172a' : '#ffffff'}
                strokeWidth={1.5 * z}
              />
            ) : (
              <rect
                x={node.x - 5 * z}
                y={node.y - 5 * z}
                width={10 * z}
                height={10 * z}
                rx={1 * z}
                fill={isSelected ? '#ef4444' : '#d97706'}
                stroke={isLight ? '#0f172a' : '#ffffff'}
                strokeWidth={1.5 * z}
              />
            )}
          </g>
        )}
      </g>
    );
  }
);

export interface BezierNodeControlsLayerProps {
  showNodes?: boolean;
  contours: PathContour[];
  contourSvgMap: Map<string, string>;
  toolMode: ToolMode;
  eraserMode: 'stroke' | 'cut' | 'all' | 'node' | 'point';
  eraserSize: number;
  selectedContourId: string | null;
  selectedContourIds?: string[];
  selectedNodeId: string | null;
  selectedNodeIds?: string[];
  nodeStyle: 'clean' | 'full' | 'selected_only';
  gridSettings: GridSettings;
  isLight: boolean;
  startNodeOrHandleDrag: StartNodeOrHandleDrag;
  handleToggleNodeType: HandleToggleNodeType;
  isGlyphLocked?: boolean;
}

export const BezierNodeControlsLayer: React.FC<BezierNodeControlsLayerProps> = React.memo(
  ({
    showNodes = true,
    contours,
    contourSvgMap,
    toolMode,
    eraserMode,
    eraserSize,
    selectedContourId,
    selectedContourIds,
    selectedNodeId,
    selectedNodeIds,
    nodeStyle,
    gridSettings,
    isLight,
    startNodeOrHandleDrag,
    handleToggleNodeType,
    isGlyphLocked = false,
  }) => {
    const isEraserNodeActive = toolMode === 'eraser' && eraserMode === 'node';
    const hoverCanvasPos = useSyncExternalStore(
      isEraserNodeActive ? subscribeHoverCanvasPos : NOOP_UNSUB,
      isEraserNodeActive ? getHoverCanvasPos : NULL_POS
    );
    // M6: keep node handles a constant screen size during pinch zoom.
    const zoom = useLiveViewportZoom();
    const safeZoom = zoom && zoom > 0 && Number.isFinite(zoom) ? zoom : 1;
    const invZoom = quantizeInverseZoom(safeZoom);
    // Callbacks are passed to memoized node children through refs so their
    // identity never breaks the memo; handlers read the latest callback.
    const dragRef = useRef(startNodeOrHandleDrag);
    dragRef.current = startNodeOrHandleDrag;
    const toggleRef = useRef(handleToggleNodeType);
    toggleRef.current = handleToggleNodeType;
    if (!showNodes && !isEraserNodeActive) {
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
          const isContourActive =
            selectedContourIds && selectedContourIds.length > 0
              ? selectedContourIds.includes(contour.id)
              : contour.id === selectedContourId;
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
                const isSelected = selectedNodeIds ? selectedNodeIds.includes(node.id) : selectedNodeId === node.id;

                // In Anchor Eraser Mode: Check if node falls inside the eraser sweep circle
                const isInsideEraser =
                  isEraserNodeMode &&
                  hoverCanvasPos &&
                  Math.hypot(node.x - hoverCanvasPos.x, node.y - hoverCanvasPos.y) <= Math.max(2, eraserSize / 2);

                return (
                  <NodeControls
                    key={node.id}
                    node={node}
                    contour={contour}
                    invZoom={invZoom}
                    isSelected={isSelected}
                    isContourActive={isContourActive}
                    isEraserNodeMode={isEraserNodeMode}
                    isInsideEraser={Boolean(isInsideEraser)}
                    isNodeInteractive={isNodeInteractive}
                    isHandleInteractive={isHandleInteractive}
                    nodeStyle={nodeStyle}
                    showHandles={
                      gridSettings.showHandles || isSelected || (toolMode === 'node' && isContourActive)
                    }
                    isLight={isLight}
                    isGlyphLocked={isGlyphLocked}
                    dragRef={dragRef}
                    toggleRef={toggleRef}
                  />
                );
              })}
            </g>
          );
        })}
      </g>
    );
  }
);
