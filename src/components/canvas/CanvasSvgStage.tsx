import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_GRID_OPACITY, DEFAULT_GRID_SIZE } from '../../utils/gridDefaults';
import {
  PathContour,
  BezierNode,
  Point,
  ToolMode,
  TraceSettings,
  GridSettings,
  SnapGuideLine,
  CustomGuideline,
  GlyphOverlaySettings,
  FontProject,
  RulerMeasurement,
} from '../../types';
import { ThemeMode } from '../../utils/theme';
import {
  contoursToSvgPath,
  getContoursBoundingBox,
  isPointNearContour,
} from '../../utils/path';
import { getCachedContourSvgPath } from './cursors';
import { CanvasBackgroundLayer } from './CanvasBackgroundLayer';
import { JapaneseGuidesLayer } from './JapaneseGuidesLayer';
import { AdjacentGlyphsLayer } from './AdjacentGlyphsLayer';
import { GlyphComparisonLayer } from './GlyphComparisonLayer';
import { TraceReferenceLayer, TraceResizeHandle } from './TraceReferenceLayer';
import { CanvasRulersLayer } from './CanvasRulersLayer';
import { MetricsGuidesLayer } from './MetricsGuidesLayer';
import { CustomGuidelinesLayer } from './CustomGuidelinesLayer';
import { RulerMeasurementLayer } from './RulerMeasurementLayer';
import { MainGlyphContoursLayer } from './MainGlyphContoursLayer';
import { InteractiveContourHitLayer } from './InteractiveContourHitLayer';
import { TransformBoundingBoxLayer } from './TransformBoundingBoxLayer';
import { BezierNodeControlsLayer } from './BezierNodeControlsLayer';
import { ActivePenPreviewLayer } from './ActivePenPreviewLayer';
import { CursorReticleOverlay } from './overlays/CursorReticleOverlay';
import { SmartSnapGuidesLayer } from './SmartSnapGuidesLayer';

export interface CanvasSvgStageProps {
  canvasGroupRef: React.RefObject<SVGGElement | null>;
  pan: Point;
  zoom: number;
  panRef?: React.RefObject<Point>;
  zoomRef?: React.RefObject<number>;
  upm: number;
  theme: ThemeMode;
  isLight: boolean;
  selectionColor: string;
  inkFillColor: string;
  getCanvasCursor: () => string;
  handlePointerDown: (e: React.PointerEvent<SVGSVGElement>) => void;
  handlePointerMove: (e: React.PointerEvent<SVGSVGElement>) => void;
  handlePointerUp: (e: React.PointerEvent<SVGSVGElement>) => void;
  handlePointerCancel: (e: React.PointerEvent<SVGSVGElement>) => void;
  handlePointerLeave: () => void;
  handleLostPointerCapture: () => void;
  isAnyModalOpen: boolean;
  screenToCanvas: (x: number, y: number) => Point;
  toolMode: ToolMode;
  generalCrosshairRef?: React.RefObject<SVGGElement | null>;
  drawingReticleRef: React.RefObject<SVGGElement | null>;
  eraserReticleRef: React.RefObject<SVGGElement | null>;
  isSpacePressed: boolean;
  isPanning: boolean;
  gridSettings: GridSettings;
  activeChar?: string;
  selectedUnicode?: number;
  advanceWidth: number;
  lsb: number;
  overlaySettings?: GlyphOverlaySettings;
  project?: FontProject;
  traceSettings?: TraceSettings;
  handlePointerDownTraceImage: (e: React.PointerEvent) => void;
  handlePointerDownTraceResize: (e: React.PointerEvent, handle: TraceResizeHandle) => void;
  handleResetTracePosition: () => void;
  isResizingTrace: boolean;
  onTraceImageError?: () => void;
  customGuidelines: CustomGuideline[];
  isGuideEraserActive: boolean;
  lockGuidelines: boolean;
  isShapeTool: boolean;
  handlePointerDownGuide: (e: React.PointerEvent, guideId: string) => void;
  handleDoubleClickGuide: (e: React.MouseEvent, guideId: string) => void;
  handleDeleteGuideline: (id: string) => void;
  rulerMeasurement: RulerMeasurement | null;
  handleDrawRulerAsStroke: () => void;
  handleConvertRulerToGuideline: () => void;
  setRulerMeasurement: React.Dispatch<React.SetStateAction<any>>;
  contours: PathContour[];
  contoursRef?: React.MutableRefObject<PathContour[]>;
  isOutlineMode: boolean;
  selectedContourIds: string[];
  onChangeContours: (contours: PathContour[], options?: { skipHistory?: boolean }) => void;
  setSelectedContourId: (id: string | null) => void;
  setSelectedContourIds: React.Dispatch<React.SetStateAction<string[]>>;
  selectedContourId: string | null;
  selectedNodeId: string | null;
  selectedNodeIds?: string[];
  setSelectedNodeId: (id: string | null) => void;
  selectedHandleType: 'node' | 'handleIn' | 'handleOut' | null;
  setSelectedHandleType: (type: 'node' | 'handleIn' | 'handleOut' | null) => void;
  nodeDragSessionRef: React.MutableRefObject<any>;
  handleInsertNodeOnContour?: (e: React.PointerEvent, contour: PathContour) => boolean;
  onCommitHistory?: () => void;
  showCanvasToast: (msg: string, sub?: string) => void;
  handleTransformPointerDown: (e: React.PointerEvent, op: any, handle?: any) => void;
  onSetToolMode?: (mode: ToolMode) => void;
  marqueeSelection: { start: Point; current: Point } | null;
  activeBrushPathRef: React.RefObject<SVGPathElement | null>;
  activeEraserPathRef: React.RefObject<SVGPathElement | null>;
  eraserSize: number;
  activeShapeContours: PathContour[];
  rotateDisplayAngle: number | null;
  showNodes: boolean;
  eraserMode: 'stroke' | 'cut' | 'all' | 'node';
  nodeStyle: 'clean' | 'full' | 'selected_only';
  startNodeOrHandleDrag: (
    e: React.PointerEvent,
    contour: PathContour,
    node: BezierNode,
    handleType: 'node' | 'handleIn' | 'handleOut'
  ) => void;
  handleToggleNodeType: (contourId: string, nodeId: string) => void;
  activePenContour: PathContour | null;
  penSvgPath: string;
  penStrokeWidth: number;
  penCapStyle: 'round' | 'butt' | 'square';
  brushWidth: number;
  activeSnapGuides: SnapGuideLine[];
  isGlyphLocked?: boolean;
}

export const CanvasSvgStage: React.FC<CanvasSvgStageProps> = React.memo(({
  canvasGroupRef,
  pan,
  zoom,
  panRef,
  zoomRef,
  upm,
  theme,
  isLight,
  selectionColor,
  inkFillColor,
  getCanvasCursor,
  handlePointerDown,
  handlePointerMove,
  handlePointerUp,
  handlePointerCancel,
  handlePointerLeave,
  handleLostPointerCapture,
  isAnyModalOpen,
  screenToCanvas,
  toolMode,
  generalCrosshairRef,
  drawingReticleRef,
  eraserReticleRef,
  isSpacePressed,
  isPanning,
  gridSettings,
  activeChar,
  selectedUnicode,
  advanceWidth,
  lsb,
  overlaySettings,
  project,
  traceSettings,
  handlePointerDownTraceImage,
  handlePointerDownTraceResize,
  handleResetTracePosition,
  isResizingTrace,
  onTraceImageError,
  customGuidelines,
  isGuideEraserActive,
  lockGuidelines,
  isShapeTool,
  handlePointerDownGuide,
  handleDoubleClickGuide,
  handleDeleteGuideline,
  rulerMeasurement,
  handleDrawRulerAsStroke,
  handleConvertRulerToGuideline,
  setRulerMeasurement,
  contours,
  contoursRef,
  isOutlineMode,
  selectedContourIds,
  onChangeContours,
  setSelectedContourId,
  setSelectedContourIds,
  selectedContourId,
  selectedNodeId,
  selectedNodeIds,
  setSelectedNodeId,
  selectedHandleType,
  setSelectedHandleType,
  nodeDragSessionRef,
  handleInsertNodeOnContour,
  onCommitHistory,
  showCanvasToast,
  handleTransformPointerDown,
  onSetToolMode,
  marqueeSelection,
  activeBrushPathRef,
  activeEraserPathRef,
  eraserSize,
  activeShapeContours,
  rotateDisplayAngle,
  showNodes,
  eraserMode,
  nodeStyle,
  startNodeOrHandleDrag,
  handleToggleNodeType,
  activePenContour,
  penSvgPath,
  penStrokeWidth,
  penCapStyle,
  brushWidth,
  activeSnapGuides,
  isGlyphLocked = false,
}) => {
  const contourSvgMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of contours) {
      map.set(c.id, getCachedContourSvgPath(c));
    }
    return map;
  }, [contours]);

  // Stable callbacks for memoized layers: inline arrows here would create a
  // new reference on every stage render and defeat the layers' React.memo.
  const handleClearRulerMeasurement = useCallback(() => {
    setRulerMeasurement(null);
  }, [setRulerMeasurement]);

  const selContours = useMemo(
    () => contours.filter((c) => selectedContourIds.includes(c.id) && c.nodes.length > 0),
    [contours, selectedContourIds]
  );

  const selectedContoursSvgPath = useMemo(
    () => (selContours.length > 0 ? contoursToSvgPath(selContours) : ''),
    [selContours]
  );

  const selContoursBBox = useMemo(
    () => (selContours.length > 0 ? getContoursBoundingBox(selContours) : null),
    [selContours]
  );

  // Viewport size for the rulers, which live outside the panning/zooming
  // <g> below so they stay fixed at the top and left edges of the screen.
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const update = () => setViewportSize({ width: el.clientWidth, height: el.clientHeight });
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 w-full h-full touch-none select-none block"
      style={{
        touchAction: 'none',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        cursor: getCanvasCursor(),
      }}
      onPointerDown={handlePointerDown}
      onPointerEnter={(e) => {
        if (!gridSettings.showCursorCrosshair || isSpacePressed || isPanning) return;
        const pos = screenToCanvas(e.clientX, e.clientY);
        if (toolMode === 'brush' && drawingReticleRef.current) {
          drawingReticleRef.current.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
          drawingReticleRef.current.style.display = '';
        } else if (toolMode === 'eraser' && eraserReticleRef.current) {
          eraserReticleRef.current.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
          eraserReticleRef.current.style.display = '';
        } else if (generalCrosshairRef?.current && toolMode !== 'brush' && toolMode !== 'eraser') {
          generalCrosshairRef.current.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
          generalCrosshairRef.current.style.display = '';
        }
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerLeave={handlePointerLeave}
      onLostPointerCapture={handleLostPointerCapture}
      onDoubleClick={(e) => {
        if (isAnyModalOpen || e.button !== 0) return;
        const clickPos = screenToCanvas(e.clientX, e.clientY);
        const hitContour = contours.find((c) => isPointNearContour(clickPos, c, 24 / zoom));
        if (hitContour) {
          if (onSetToolMode) {
            onSetToolMode('node');
          }
          setSelectedContourId(hitContour.id);
          setSelectedContourIds([hitContour.id]);
          setSelectedNodeId(null);
          setSelectedHandleType(null);
          showCanvasToast('ノード編集モードに切り替えました', 'アンカーポイントとハンドルを直接編集できます');
        }
      }}
    >
      <g
        ref={canvasGroupRef}
        transform={`translate(${(panRef?.current ?? pan).x}, ${(panRef?.current ?? pan).y}) scale(${zoomRef?.current ?? zoom})`}
      >
        {/* 1. Base Canvas Background & Grid */}
        <CanvasBackgroundLayer
          isLight={isLight}
          theme={theme}
          showGrid={!!gridSettings.showGrid}
          gridSize={gridSettings.gridSize || DEFAULT_GRID_SIZE}
          gridOpacity={gridSettings.gridOpacity ?? DEFAULT_GRID_OPACITY}
          unitsPerEm={upm}
        />

        {/* 2. Japanese Calligraphy / Layout Guides */}
        <JapaneseGuidesLayer
          guideType={gridSettings.japaneseGuide}
          verticalGuide={gridSettings.verticalGuide}
          showBodyFrame={gridSettings.showBodyFrame}
          showKanaFrame={gridSettings.showKanaFrame}
          isLight={isLight}
          theme={theme}
          activeChar={activeChar}
          gridOpacity={gridSettings.gridOpacity ?? DEFAULT_GRID_OPACITY}
          unitsPerEm={upm}
        />

        {/* 3. Adjacent Character Context Boxes */}
        <AdjacentGlyphsLayer
          isLight={isLight}
          advanceWidth={advanceWidth}
          unitsPerEm={upm}
          zoom={zoom}
        />

        {/* 3.5 Glyph Overlay Comparison Layer */}
        <GlyphComparisonLayer
          overlaySettings={overlaySettings}
          project={project}
          isLight={isLight}
          activeChar={activeChar}
          activeUnicode={selectedUnicode}
          unitsPerEm={upm}
        />

        {/* 4. Trace Reference Image / Char Template Layer */}
        {traceSettings && (
          <TraceReferenceLayer
            traceSettings={traceSettings}
            isLight={isLight}
            activeChar={activeChar || ''}
            selectedUnicode={selectedUnicode != null ? String(selectedUnicode) : undefined}
            toolMode={toolMode}
            unitsPerEm={upm}
            ascender={project?.metadata?.ascender}
            advanceWidth={advanceWidth}
            onPointerDownImage={handlePointerDownTraceImage}
            onPointerDownResize={handlePointerDownTraceResize}
            onDoubleClickReset={handleResetTracePosition}
            isResizing={isResizingTrace}
            onTraceImageError={onTraceImageError}
          />
        )}

        {/* 6. Typography Metrics Guidelines */}
        <MetricsGuidesLayer
          showMetrics={!!gridSettings.showMetrics}
          lsb={lsb}
          advanceWidth={advanceWidth}
          activeChar={activeChar}
          isLight={isLight}
          showVerticalCenter={gridSettings.showVerticalCenter !== false}
          suppressCenterLine={Boolean(
            (gridSettings.japaneseGuide &&
              ['cross', 'tian', 'sixteen', 'mi'].includes(gridSettings.japaneseGuide)) ||
              (gridSettings.verticalGuide &&
                ['center', 'quarters', 'eighths'].includes(gridSettings.verticalGuide))
          )}
          gridOpacity={gridSettings.gridOpacity ?? DEFAULT_GRID_OPACITY}
          unitsPerEm={upm}
          ascender={project?.metadata?.ascender}
          descender={project?.metadata?.descender}
          capHeight={project?.metadata?.capHeight}
          xHeight={project?.metadata?.xHeight}
        />

        {/* 7. User Custom Guidelines */}
        <CustomGuidelinesLayer
          customGuidelines={customGuidelines}
          unitsPerEm={upm}
          locked={
            (!isGuideEraserActive && lockGuidelines) ||
            toolMode === 'brush' ||
            toolMode === 'pen' ||
            toolMode === 'eraser' ||
            isShapeTool
          }
          interactive={isGuideEraserActive || (!lockGuidelines && (toolMode === 'select' || toolMode === 'ruler'))}
          isGuideEraserActive={isGuideEraserActive}
          onPointerDownGuide={handlePointerDownGuide}
          onDoubleClickGuide={handleDoubleClickGuide}
          onDeleteGuide={handleDeleteGuideline}
        />

        {/* 8. Interactive Measurement Tool Overlay */}
        {toolMode === 'ruler' && gridSettings.showRulers !== false && Boolean(rulerMeasurement) && (
          <RulerMeasurementLayer
            rulerMeasurement={rulerMeasurement!}
            onDrawLine={handleDrawRulerAsStroke}
            onConvertToGuide={handleConvertRulerToGuideline}
            onClear={handleClearRulerMeasurement}
          />
        )}

        {/* 9. Main Glyph Vector Contours */}
        <MainGlyphContoursLayer
          contours={contours}
          isLight={isLight}
          theme={theme}
          outlineOnly={isOutlineMode}
        />

        {/* Interactive Contour Hit & Selection Strokes */}
        <InteractiveContourHitLayer
          contours={contours}
          contoursRef={contoursRef}
          selectedContourIds={selectedContourIds}
          contourSvgMap={contourSvgMap}
          selectionColor={selectionColor}
          toolMode={toolMode}
          screenToCanvas={screenToCanvas}
          onChangeContours={onChangeContours}
          setSelectedContourId={setSelectedContourId}
          setSelectedContourIds={setSelectedContourIds}
          setSelectedNodeId={setSelectedNodeId}
          setSelectedHandleType={setSelectedHandleType}
          nodeDragSessionRef={nodeDragSessionRef}
          handleInsertNodeOnContour={handleInsertNodeOnContour}
          onCommitHistory={onCommitHistory}
          showCanvasToast={showCanvasToast}
          handleTransformPointerDown={handleTransformPointerDown}
          onSetToolMode={onSetToolMode}
          isGlyphLocked={isGlyphLocked}
        />

        {/* Marquee Selection Box */}
        {marqueeSelection && (
          <rect
            x={Math.min(marqueeSelection.start.x, marqueeSelection.current.x)}
            y={Math.min(marqueeSelection.start.y, marqueeSelection.current.y)}
            width={Math.abs(marqueeSelection.current.x - marqueeSelection.start.x)}
            height={Math.abs(marqueeSelection.current.y - marqueeSelection.start.y)}
            fill="rgba(16, 185, 129, 0.14)"
            stroke={selectionColor}
            strokeWidth={1.5 / zoom}
            strokeDasharray="4 2"
            pointerEvents="none"
          />
        )}

        {/* Active Brush Stroke in-progress */}
        <path
          ref={activeBrushPathRef}
          d=""
          fill={isOutlineMode ? 'none' : inkFillColor}
          stroke={isOutlineMode ? (isLight ? '#0284c7' : '#38bdf8') : 'none'}
          strokeWidth={isOutlineMode ? 1.5 : 0}
          vectorEffect={isOutlineMode ? 'non-scaling-stroke' : undefined}
          fillRule="nonzero"
          pointerEvents="none"
        />

        {/* Active Cut Eraser Stroke in-progress */}
        <path
          ref={activeEraserPathRef}
          d=""
          fill="none"
          stroke="#f43f5e"
          strokeWidth={Math.max(8, eraserSize)}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity={0.65}
          pointerEvents="none"
        />

        {/* Active Shape in-progress */}
        {isShapeTool && activeShapeContours.length > 0 && (
          <path
            d={contoursToSvgPath(activeShapeContours)}
            fill={isOutlineMode ? 'none' : '#f59e0b'}
            fillOpacity={isOutlineMode ? 0 : 0.35}
            stroke="#f59e0b"
            strokeWidth={2}
            vectorEffect={isOutlineMode ? 'non-scaling-stroke' : undefined}
            fillRule="nonzero"
            pointerEvents="none"
          />
        )}

        {/* Selected Contour Highlight & Interactive Bounding Box Transform UI */}
        <TransformBoundingBoxLayer
          toolMode={toolMode}
          selectedContourIds={selectedContourIds}
          selContoursBBox={selContoursBBox}
          selectionColor={selectionColor}
          selectedContoursSvgPath={selectedContoursSvgPath}
          rotateDisplayAngle={rotateDisplayAngle}
          handleTransformPointerDown={handleTransformPointerDown}
          isGlyphLocked={isGlyphLocked}
        />

        {/* Bezier Nodes & Control Handles */}
        <BezierNodeControlsLayer
          showNodes={showNodes}
          toolMode={toolMode}
          eraserMode={eraserMode}
          gridSettings={gridSettings}
          contours={contours}
          selectedContourId={selectedContourId}
          selectedContourIds={selectedContourIds}
          selectedNodeId={selectedNodeId}
          selectedNodeIds={selectedNodeIds}
          contourSvgMap={contourSvgMap}
          nodeStyle={nodeStyle}
          isLight={isLight}
          eraserSize={eraserSize}
          startNodeOrHandleDrag={startNodeOrHandleDrag}
          handleToggleNodeType={handleToggleNodeType}
          isGlyphLocked={isGlyphLocked}
        />

        {/* Active Pen Contour Path & Rubber-band */}
        {activePenContour && (
          <ActivePenPreviewLayer
            activePenContour={activePenContour}
            penSvgPath={penSvgPath}
            penStrokeWidth={penStrokeWidth}
            penCapStyle={penCapStyle}
            zoom={zoom}
            selectionColor={selectionColor}
          />
        )}

        {/* High-Contrast Cursor Crosshair & Drawing Reticles */}
        <CursorReticleOverlay
          gridSettings={gridSettings}
          toolMode={toolMode}
          selectionColor={selectionColor}
          generalCrosshairRef={generalCrosshairRef}
          drawingReticleRef={drawingReticleRef}
          eraserReticleRef={eraserReticleRef}
          brushWidth={brushWidth}
          eraserMode={eraserMode}
          eraserSize={eraserSize}
        />

        {/* Active Smart Snap Guidelines */}
        <SmartSnapGuidesLayer
          activeSnapGuides={activeSnapGuides}
          selectionColor={selectionColor}
        />
      </g>

      {/* Top & Left Ruler Scales — outside the panning/zooming <g> so the
          rulers stay fixed at the viewport edges instead of scrolling away
          with the glyph. Positions are computed in screen coordinates. */}
      <CanvasRulersLayer
        showRulers={gridSettings.showRulers !== false}
        isLight={isLight}
        unitsPerEm={upm}
        width={viewportSize.width}
        height={viewportSize.height}
      />
    </svg>
  );
});
