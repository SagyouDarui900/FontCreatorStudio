import React, { useMemo } from 'react';
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
} from '../../utils/pathUtils';
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
  hoverCanvasPos: Point | null;
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
  isOutlineMode: boolean;
  selectedContourIds: string[];
  onChangeContours: (contours: PathContour[]) => void;
  setSelectedContourId: (id: string | null) => void;
  setSelectedContourIds: React.Dispatch<React.SetStateAction<string[]>>;
  selectedContourId: string | null;
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  selectedHandleType: 'node' | 'handleIn' | 'handleOut' | null;
  setSelectedHandleType: (type: 'node' | 'handleIn' | 'handleOut' | null) => void;
  nodeDragSessionRef: React.MutableRefObject<any>;
  onCommitHistory?: () => void;
  showCanvasToast: (msg: string, sub?: string) => void;
  handleTransformPointerDown: (e: React.PointerEvent, op: any, handle?: any) => void;
  onSetToolMode?: (mode: ToolMode) => void;
  marqueeSelection: { start: Point; current: Point } | null;
  activeBrushPathRef: React.RefObject<SVGPathElement | null>;
  activeEraserPathRef: React.RefObject<SVGPathElement | null>;
  eraserSize: number;
  activeShapeContours: PathContour[];
  rotateDisplayAngle: number;
  handleRotateSelected: (angleDeg?: number) => void;
  handleFlipHSelected: () => void;
  handleFlipVSelected: () => void;
  handleDuplicateSelected: () => void;
  handleMergeSelectedContours: () => void;
  handleDeleteSelected: () => void;
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
  penMousePos: Point | null;
  brushWidth: number;
  activeSnapGuides: SnapGuideLine[];
}

export const CanvasSvgStage: React.FC<CanvasSvgStageProps> = React.memo(({
  canvasGroupRef,
  pan,
  zoom,
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
  hoverCanvasPos,
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
  isOutlineMode,
  selectedContourIds,
  onChangeContours,
  setSelectedContourId,
  setSelectedContourIds,
  selectedContourId,
  selectedNodeId,
  setSelectedNodeId,
  selectedHandleType,
  setSelectedHandleType,
  nodeDragSessionRef,
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
  handleRotateSelected,
  handleFlipHSelected,
  handleFlipVSelected,
  handleDuplicateSelected,
  handleMergeSelectedContours,
  handleDeleteSelected,
  showNodes,
  eraserMode,
  nodeStyle,
  startNodeOrHandleDrag,
  handleToggleNodeType,
  activePenContour,
  penSvgPath,
  penStrokeWidth,
  penCapStyle,
  penMousePos,
  brushWidth,
  activeSnapGuides,
}) => {
  // Memoized SVG Paths using WeakMap cache
  const mainSvgPath = useMemo(() => {
    if (!contours || contours.length === 0) return '';
    return contours.map(getCachedContourSvgPath).join(' ');
  }, [contours]);

  const contourSvgMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of contours) {
      map.set(c.id, getCachedContourSvgPath(c));
    }
    return map;
  }, [contours]);

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

  return (
    <svg
      className="w-full h-full touch-none select-none"
      style={{
        touchAction: 'none',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        cursor: getCanvasCursor(),
      }}
      onPointerDown={handlePointerDown}
      onPointerEnter={(e) => {
        if (
          toolMode === 'brush' &&
          drawingReticleRef.current &&
          !isSpacePressed &&
          !isPanning &&
          gridSettings.showCursorCrosshair
        ) {
          const pos = screenToCanvas(e.clientX, e.clientY);
          drawingReticleRef.current.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
          drawingReticleRef.current.style.display = '';
        }
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerLeave={handlePointerLeave}
      onLostPointerCapture={handleLostPointerCapture}
      onDoubleClick={(e) => {
        if (isAnyModalOpen) return;
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
        transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
      >
        {/* 1. Base Canvas Background & Grid */}
        <CanvasBackgroundLayer
          isLight={isLight}
          theme={theme}
          showGrid={!!gridSettings.showGrid}
          gridSize={gridSettings.gridSize || 50}
          gridOpacity={gridSettings.gridOpacity ?? 30}
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
          gridOpacity={gridSettings.gridOpacity ?? 30}
          unitsPerEm={upm}
        />

        {/* 3. Adjacent Character Context Boxes */}
        <AdjacentGlyphsLayer
          isLight={isLight}
          advanceWidth={advanceWidth}
          unitsPerEm={upm}
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
            onPointerDownImage={handlePointerDownTraceImage}
            onPointerDownResize={handlePointerDownTraceResize}
            onDoubleClickReset={handleResetTracePosition}
            isResizing={isResizingTrace}
          />
        )}

        {/* 5. Top & Left Ruler Scales */}
        <CanvasRulersLayer
          showRulers={gridSettings.showRulers !== false}
          isLight={isLight}
          hoverPos={hoverCanvasPos}
          unitsPerEm={upm}
        />

        {/* 6. Typography Metrics Guidelines */}
        <MetricsGuidesLayer
          showMetrics={!!gridSettings.showMetrics}
          lsb={lsb}
          advanceWidth={advanceWidth}
          activeChar={activeChar}
          isLight={isLight}
          showVerticalCenter={gridSettings.showVerticalCenter !== false}
          gridOpacity={gridSettings.gridOpacity ?? 30}
          unitsPerEm={upm}
        />

        {/* 7. User Custom Guidelines */}
        <CustomGuidelinesLayer
          customGuidelines={customGuidelines}
          zoom={zoom}
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
            zoom={zoom}
            onDrawLine={handleDrawRulerAsStroke}
            onConvertToGuide={handleConvertRulerToGuideline}
            onClear={() => setRulerMeasurement(null)}
          />
        )}

        {/* 9. Main Glyph Vector Contours */}
        <MainGlyphContoursLayer
          contours={contours}
          mainSvgPath={mainSvgPath}
          isLight={isLight}
          theme={theme}
          outlineOnly={isOutlineMode}
        />

        {/* Interactive Contour Hit & Selection Strokes */}
        <InteractiveContourHitLayer
          contours={contours}
          selectedContourIds={selectedContourIds}
          contourSvgMap={contourSvgMap}
          selectionColor={selectionColor}
          zoom={zoom}
          toolMode={toolMode}
          screenToCanvas={screenToCanvas}
          onChangeContours={onChangeContours}
          setSelectedContourId={setSelectedContourId}
          setSelectedContourIds={setSelectedContourIds}
          setSelectedNodeId={setSelectedNodeId}
          setSelectedHandleType={setSelectedHandleType}
          nodeDragSessionRef={nodeDragSessionRef}
          onCommitHistory={onCommitHistory}
          showCanvasToast={showCanvasToast}
          handleTransformPointerDown={handleTransformPointerDown}
          onSetToolMode={onSetToolMode}
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
          zoom={zoom}
          selectionColor={selectionColor}
          selectedContoursSvgPath={selectedContoursSvgPath}
          rotateDisplayAngle={rotateDisplayAngle}
          handleTransformPointerDown={handleTransformPointerDown}
          handleRotateSelected={handleRotateSelected}
          handleFlipHSelected={handleFlipHSelected}
          handleFlipVSelected={handleFlipVSelected}
          handleDuplicateSelected={handleDuplicateSelected}
          handleMergeSelectedContours={handleMergeSelectedContours}
          handleDeleteSelected={handleDeleteSelected}
          setSelectedContourIds={(ids) => setSelectedContourIds(ids)}
          setSelectedNodeId={setSelectedNodeId}
          setSelectedHandleType={setSelectedHandleType}
        />

        {/* Bezier Nodes & Control Handles */}
        <BezierNodeControlsLayer
          showNodes={showNodes}
          toolMode={toolMode}
          eraserMode={eraserMode}
          gridSettings={gridSettings}
          contours={contours}
          selectedContourId={selectedContourId}
          selectedNodeId={selectedNodeId}
          contourSvgMap={contourSvgMap}
          nodeStyle={nodeStyle}
          zoom={zoom}
          isLight={isLight}
          hoverCanvasPos={hoverCanvasPos}
          eraserSize={eraserSize}
          startNodeOrHandleDrag={startNodeOrHandleDrag}
          handleToggleNodeType={handleToggleNodeType}
        />

        {/* Active Pen Contour Path & Rubber-band */}
        <ActivePenPreviewLayer
          activePenContour={activePenContour}
          penSvgPath={penSvgPath}
          penStrokeWidth={penStrokeWidth}
          penCapStyle={penCapStyle}
          penMousePos={penMousePos}
          hoverCanvasPos={hoverCanvasPos}
          zoom={zoom}
          selectionColor={selectionColor}
        />

        {/* High-Contrast Cursor Crosshair & Drawing Reticles */}
        <CursorReticleOverlay
          gridSettings={gridSettings}
          hoverCanvasPos={hoverCanvasPos}
          toolMode={toolMode}
          zoom={zoom}
          selectionColor={selectionColor}
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
          zoom={zoom}
        />
      </g>
    </svg>
  );
});
