import React from 'react';
import { Hand, Undo, Redo, Minimize } from 'lucide-react';
import {
  Point,
  ToolMode,
  TraceSettings,
  GridSettings,
  CustomGuideline,
  GlyphOverlaySettings,
  BrushStyle,
  PathContour,
  RulerMeasurement,
} from '../../../types';
import { ThemeMode } from '../../../utils/theme';
import { TraceAdjustFloatingHud } from './TraceAdjustFloatingHud';
import { GuideAssistOverlay } from './GuideAssistOverlay';
import { ActivePenDrawingHud } from './ActivePenDrawingHud';
import { CanvasTouchLoupe } from './CanvasTouchLoupe';
import { CanvasToastNotification } from './CanvasToastNotification';
import { CanvasStatusBar } from './CanvasStatusBar';
import { MobileAuxMenuDrawer } from './MobileAuxMenuDrawer';
import { MobileSelectionActionBar } from './MobileSelectionActionBar';
import { MobilePartTransformSheet } from './MobilePartTransformSheet';
import { MobileBrushSettingsSheet } from './MobileBrushSettingsSheet';
import { GuidesAndGridModal } from './GuidesAndGridModal';

export interface CanvasFloatingOverlaysProps {
  isMobileFocusMode: boolean;
  setIsMobileFocusMode: (val: boolean) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  toolMode: ToolMode;
  isSpacePressed: boolean;
  isLight: boolean;
  theme: ThemeMode;
  upm: number;
  activeChar?: string;
  traceSettings?: TraceSettings;
  onChangeTraceSettings?: React.Dispatch<React.SetStateAction<TraceSettings>>;
  handleResetTracePosition: () => void;
  handleResetTraceAll: () => void;
  onSetToolMode?: (mode: ToolMode) => void;
  showCanvasToast: (msg: string, sub?: string) => void;
  showGuideAssist: boolean;
  handleToggleGuideAssist: (open?: boolean) => void;
  activePenContour: PathContour | null;
  penHudPos: Point;
  handlePenHudPointerDown: (e: React.PointerEvent) => void;
  handlePenHudPointerMove: (e: React.PointerEvent) => void;
  handlePenHudPointerUp: (e: React.PointerEvent) => void;
  handleUndoPenNode: () => void;
  handleFinishPenContour: (closed: boolean) => void;
  penStrokeWidth: number;
  penCapStyle: 'round' | 'butt' | 'square';
  showPenStrokeMenu: boolean;
  setShowPenStrokeMenu: React.Dispatch<React.SetStateAction<boolean>>;
  handleSetPenStrokeWidth: (w: number) => void;
  handleSetPenCapStyle: (cap: 'round' | 'butt' | 'square') => void;
  handleResetPenContour: () => void;
  setPenHudPos: (pos: Point | null) => void;
  touchLoupeState: { visible: boolean; screenX: number; screenY: number; canvasPos: Point | null };
  contours: PathContour[];
  isOutlineMode: boolean;
  canvasToast: { message: string; subText?: string; id: number } | null;
  isBottomBarCollapsed: boolean;
  toggleBottomBarCollapse: () => void;
  hoverCanvasPos: Point | null;
  rulerMeasurement?: RulerMeasurement | null;
  setRulerMeasurement?: (val: RulerMeasurement | null) => void;
  handleDrawRulerAsStroke?: () => void;
  handleConvertRulerToGuideline?: () => void;
  selectedNodeId?: string | null;
  selectedContourId?: string | null;
  handleDeleteSelectedNode?: () => void;
  handleToggleNodeType: (contourId: string, nodeId: string) => void;
  isMobileAuxMenuOpen: boolean;
  setIsMobileAuxMenuOpen: (val: boolean) => void;
  resetView: (target?: '100%' | 'fit' | 'width') => void;
  handleZoomStep: (delta: number) => void;
  zoom: number;
  onChangeGridSettings: (settings: GridSettings | ((prev: GridSettings) => GridSettings)) => void;
  gridSettings: GridSettings;
  palmRejectionMode: 'auto' | 'strict_pen_only' | 'off';
  handleSetPalmRejectionMode: (mode: 'auto' | 'strict_pen_only' | 'off') => void;
  isStylusActive: boolean;
  liveStylusPressure: number | null;
  pressureSensitivity: 'high' | 'normal' | 'low' | 'off';
  onChangePressureSensitivity?: (val: 'high' | 'normal' | 'low' | 'off') => void;
  showQuickGridSlider: boolean;
  setShowQuickGridSlider: (val: boolean | ((prev: boolean) => boolean)) => void;
  quickGridSliderRef: React.RefObject<HTMLDivElement | null>;
  handleClearAllContours: () => void;
  setOutlineOnly: (val: boolean) => void;
  onOpenGlyphCompareModal?: () => void;
  overlaySettings?: GlyphOverlaySettings;
  onToggleZenMode?: () => void;
  isZenMode: boolean;
  selectedContourIds: string[];
  handleMergeSelectedContours: () => void;
  showMobilePartSheet: boolean;
  setShowMobilePartSheet: (val: boolean) => void;
  handleDuplicateSelected: () => void;
  handleDeleteSelected: () => void;
  setSelectedContourIds: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectedNodeId: (id: string | null) => void;
  handleFlipHSelected: () => void;
  handleFlipVSelected: () => void;
  handleRotateSelected: (angleDeg?: number) => void;
  handleSlantSelected: (slantDelta: number) => void;
  handleScaleSelected: (scaleFactor: number) => void;
  handleSmoothStrokeSelected: () => void;
  handleSimplifySelected: () => void;
  showMobileBrushSheet: boolean;
  setShowMobileBrushSheet: (val: boolean) => void;
  brushWidth: number;
  onChangeBrushWidth?: (w: number) => void;
  smoothingIntensity: number;
  onChangeSmoothingIntensity?: (val: number) => void;
  brushStraightMode: boolean;
  setBrushStraightMode: (val: boolean) => void;
  brushStyle: BrushStyle;
  onChangeBrushStyle?: (style: BrushStyle) => void;
  showMobileGuidesSheet: boolean;
  setShowMobileGuidesSheet: (val: boolean) => void;
  nodeStyle: 'clean' | 'full' | 'selected_only';
  setNodeStyle: React.Dispatch<React.SetStateAction<'clean' | 'full' | 'selected_only'>>;
  showNodes: boolean;
  setShowNodes: React.Dispatch<React.SetStateAction<boolean>>;
  customGuidelines: CustomGuideline[];
  setCustomGuidelines: React.Dispatch<React.SetStateAction<CustomGuideline[]>>;
  lockGuidelines: boolean;
  setLockGuidelines: (val: boolean) => void;
}

export const CanvasFloatingOverlays: React.FC<CanvasFloatingOverlaysProps> = React.memo(({
  isMobileFocusMode,
  setIsMobileFocusMode,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  toolMode,
  isSpacePressed,
  isLight,
  theme,
  upm,
  activeChar,
  traceSettings,
  onChangeTraceSettings,
  handleResetTracePosition,
  handleResetTraceAll,
  onSetToolMode,
  showCanvasToast,
  showGuideAssist,
  handleToggleGuideAssist,
  activePenContour,
  penHudPos,
  handlePenHudPointerDown,
  handlePenHudPointerMove,
  handlePenHudPointerUp,
  handleUndoPenNode,
  handleFinishPenContour,
  penStrokeWidth,
  penCapStyle,
  showPenStrokeMenu,
  setShowPenStrokeMenu,
  handleSetPenStrokeWidth,
  handleSetPenCapStyle,
  handleResetPenContour,
  setPenHudPos,
  touchLoupeState,
  contours,
  isOutlineMode,
  canvasToast,
  isBottomBarCollapsed,
  toggleBottomBarCollapse,
  hoverCanvasPos,
  rulerMeasurement,
  setRulerMeasurement,
  handleDrawRulerAsStroke,
  handleConvertRulerToGuideline,
  selectedNodeId,
  selectedContourId,
  handleDeleteSelectedNode,
  handleToggleNodeType,
  isMobileAuxMenuOpen,
  setIsMobileAuxMenuOpen,
  resetView,
  handleZoomStep,
  zoom,
  onChangeGridSettings,
  gridSettings,
  palmRejectionMode,
  handleSetPalmRejectionMode,
  isStylusActive,
  liveStylusPressure,
  pressureSensitivity,
  onChangePressureSensitivity,
  showQuickGridSlider,
  setShowQuickGridSlider,
  quickGridSliderRef,
  handleClearAllContours,
  setOutlineOnly,
  onOpenGlyphCompareModal,
  overlaySettings,
  onToggleZenMode,
  isZenMode,
  selectedContourIds,
  handleMergeSelectedContours,
  showMobilePartSheet,
  setShowMobilePartSheet,
  handleDuplicateSelected,
  handleDeleteSelected,
  setSelectedContourIds,
  setSelectedNodeId,
  handleFlipHSelected,
  handleFlipVSelected,
  handleRotateSelected,
  handleSlantSelected,
  handleScaleSelected,
  handleSmoothStrokeSelected,
  handleSimplifySelected,
  showMobileBrushSheet,
  setShowMobileBrushSheet,
  brushWidth,
  onChangeBrushWidth,
  smoothingIntensity,
  onChangeSmoothingIntensity,
  brushStraightMode,
  setBrushStraightMode,
  brushStyle,
  onChangeBrushStyle,
  showMobileGuidesSheet,
  setShowMobileGuidesSheet,
  nodeStyle,
  setNodeStyle,
  showNodes,
  setShowNodes,
  customGuidelines,
  setCustomGuidelines,
  lockGuidelines,
  setLockGuidelines,
}) => {
  const effectiveTraceSettings: TraceSettings = traceSettings || {
    enabled: false,
    type: 'char',
    text: '',
    fontFamily: 'serif',
    fontSize: 500,
    opacity: 0.3,
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  };

  return (
    <>
      {/* Mobile Focus Mode Top Exit Bar */}
      {isMobileFocusMode && (
        <div className="sm:hidden absolute top-2 right-2 z-30 flex items-center space-x-1 bg-stone-900/90 px-2 py-1 rounded-full border border-white/20 shadow-lg text-white">
          {onUndo && (
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className="p-1 rounded-full hover:bg-white/20 disabled:opacity-30"
              title="1つ戻す"
            >
              <Undo className="w-3.5 h-3.5" />
            </button>
          )}
          {onRedo && (
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className="p-1 rounded-full hover:bg-white/20 disabled:opacity-30"
              title="やり直す"
            >
              <Redo className="w-3.5 h-3.5" />
            </button>
          )}
          <div className="w-[1px] h-3 bg-white/30 mx-0.5" />
          <button
            onClick={() => setIsMobileFocusMode(false)}
            className="flex items-center space-x-1 px-1.5 py-0.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-[10px] font-bold text-white "
          >
            <Minimize className="w-3.5 h-3.5" />
            <span>完了</span>
          </button>
        </div>
      )}

      {/* Hand Tool Active Floating HUD Indicator */}
      {(toolMode === 'hand' || isSpacePressed) && (
        <div
          className={`absolute top-11 left-2 sm:top-2.5 sm:left-2.5 z-30 px-2 py-0.5 rounded-md border flex items-center gap-1.5 text-[10.5px] font-semibold transition-all duration-150 pointer-events-none select-none max-w-fit ${
            isLight
              ? 'bg-white/95 border-emerald-300 text-emerald-900 shadow-sm'
              : 'bg-[#121c15]/95 border-emerald-700/60 text-emerald-200 shadow-sm'
          }`}
        >
          <div className="flex items-center gap-1 shrink-0 font-bold text-emerald-700 dark:text-emerald-300">
            <Hand className="w-3 h-3" />
            <span>手のひら</span>
          </div>
          <span className={`text-[9.5px] font-normal opacity-75 ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
            {isSpacePressed ? 'Space移動' : 'ドラッグ移動'}
          </span>
        </div>
      )}

      {/* Enhanced Trace Adjust Mode Active Floating HUD Bar */}
      {traceSettings && (
        <TraceAdjustFloatingHud
          toolMode={toolMode}
          traceSettings={traceSettings}
          onChangeTraceSettings={onChangeTraceSettings}
          handleResetTracePosition={handleResetTracePosition}
          handleResetTraceAll={handleResetTraceAll}
          onSetToolMode={onSetToolMode}
          showCanvasToast={showCanvasToast}
          isLight={isLight}
        />
      )}

      {/* Typography Guide Assist Card */}
      {showGuideAssist && traceSettings && (
        <GuideAssistOverlay
          showGuideAssist={showGuideAssist}
          handleToggleGuideAssist={handleToggleGuideAssist}
          isLight={isLight}
          activeChar={activeChar || ''}
          traceSettings={traceSettings}
          handleResetTracePosition={handleResetTracePosition}
          onSetToolMode={onSetToolMode}
          onChangeTraceSettings={onChangeTraceSettings}
          showCanvasToast={showCanvasToast}
        />
      )}

      {/* Active Pen Tool Drawing In-Progress Draggable Floating HUD Bar */}
      <ActivePenDrawingHud
        activePenContour={activePenContour}
        penHudPos={penHudPos}
        isLight={isLight}
        handlePenHudPointerDown={handlePenHudPointerDown}
        handlePenHudPointerMove={handlePenHudPointerMove}
        handlePenHudPointerUp={handlePenHudPointerUp}
        handleUndoPenNode={handleUndoPenNode}
        handleFinishPenContour={handleFinishPenContour}
        penStrokeWidth={penStrokeWidth}
        penCapStyle={penCapStyle}
        showPenStrokeMenu={showPenStrokeMenu}
        setShowPenStrokeMenu={setShowPenStrokeMenu}
        handleSetPenStrokeWidth={handleSetPenStrokeWidth}
        handleSetPenCapStyle={handleSetPenCapStyle}
        handleResetPenContour={handleResetPenContour}
        setPenHudPos={setPenHudPos}
      />

      {/* Mobile & Tablet Precision Touch Loupe */}
      <CanvasTouchLoupe
        touchLoupeState={touchLoupeState}
        contours={contours}
        theme={theme}
        isOutlineMode={isOutlineMode}
      />

      {/* Toast Notification */}
      <CanvasToastNotification
        canvasToast={canvasToast}
        isLight={isLight}
      />

      {/* Status Bar */}
      <CanvasStatusBar
        isBottomBarCollapsed={isBottomBarCollapsed}
        toggleBottomBarCollapse={toggleBottomBarCollapse}
        isLight={isLight}
        toolMode={toolMode}
        isSpacePressed={isSpacePressed}
        hoverCanvasPos={hoverCanvasPos}
        rulerMeasurement={rulerMeasurement}
        setRulerMeasurement={setRulerMeasurement}
        handleDrawRulerAsStroke={handleDrawRulerAsStroke}
        handleConvertRulerToGuideline={handleConvertRulerToGuideline}
        selectedNodeId={selectedNodeId}
        selectedContourId={selectedContourId}
        handleDeleteSelectedNode={handleDeleteSelectedNode}
        handleToggleNodeType={handleToggleNodeType}
        setIsMobileAuxMenuOpen={setIsMobileAuxMenuOpen}
        resetView={resetView}
        handleZoomStep={handleZoomStep}
        zoom={zoom}
        onChangeGridSettings={onChangeGridSettings as any}
        gridSettings={gridSettings}
        showCanvasToast={showCanvasToast}
        palmRejectionMode={palmRejectionMode}
        handleSetPalmRejectionMode={handleSetPalmRejectionMode}
        isStylusActive={isStylusActive}
        liveStylusPressure={liveStylusPressure}
        pressureSensitivity={pressureSensitivity}
        onChangePressureSensitivity={onChangePressureSensitivity}
        showQuickGridSlider={showQuickGridSlider}
        setShowQuickGridSlider={setShowQuickGridSlider}
        quickGridSliderRef={quickGridSliderRef}
        traceSettings={effectiveTraceSettings}
        onChangeTraceSettings={onChangeTraceSettings as any}
        handleResetTracePosition={handleResetTracePosition}
        handleClearAllContours={handleClearAllContours}
        contours={contours}
        isOutlineMode={isOutlineMode}
        setOutlineOnly={setOutlineOnly}
        onOpenGlyphCompareModal={onOpenGlyphCompareModal}
        overlaySettings={overlaySettings}
        onToggleZenMode={onToggleZenMode}
        isZenMode={isZenMode}
      />

      {/* Mobile Canvas Bottom Sheet Drawer */}
      <MobileAuxMenuDrawer
        isOpen={isMobileAuxMenuOpen}
        onClose={() => setIsMobileAuxMenuOpen(false)}
        theme={theme}
        isLight={isLight}
        zoom={zoom}
        handleZoomStep={handleZoomStep}
        resetView={resetView}
        isOutlineMode={isOutlineMode}
        setOutlineOnly={setOutlineOnly}
        showCanvasToast={showCanvasToast}
        onToggleZenMode={onToggleZenMode}
        isZenMode={isZenMode}
        gridSettings={gridSettings}
        onChangeGridSettings={onChangeGridSettings as any}
        palmRejectionMode={palmRejectionMode}
        handleSetPalmRejectionMode={handleSetPalmRejectionMode}
        toolMode={toolMode}
        selectedNodeId={selectedNodeId || null}
        selectedContourId={selectedContourId || null}
        handleToggleNodeType={handleToggleNodeType}
        handleDeleteSelectedNode={handleDeleteSelectedNode || (() => {})}
        traceSettings={effectiveTraceSettings}
        onChangeTraceSettings={onChangeTraceSettings}
        handleResetTracePosition={handleResetTracePosition}
        onOpenGlyphCompareModal={onOpenGlyphCompareModal}
        overlaySettings={overlaySettings}
        contours={contours}
        handleClearAllContours={handleClearAllContours}
      />

      {/* Mobile Selected Contour Quick Action Bar */}
      <MobileSelectionActionBar
        toolMode={toolMode}
        selectedContourIds={selectedContourIds}
        isLight={isLight}
        handleMergeSelectedContours={handleMergeSelectedContours}
        setShowMobilePartSheet={setShowMobilePartSheet}
        handleDuplicateSelected={handleDuplicateSelected}
        handleDeleteSelected={handleDeleteSelected}
        setSelectedContourIds={setSelectedContourIds}
        setSelectedNodeId={setSelectedNodeId}
      />

      {/* Mobile Part Transform Bottom Sheet */}
      <MobilePartTransformSheet
        isOpen={showMobilePartSheet}
        onClose={() => setShowMobilePartSheet(false)}
        isLight={isLight}
        selectedContourIds={selectedContourIds}
        handleMergeSelectedContours={handleMergeSelectedContours}
        handleFlipHSelected={handleFlipHSelected}
        handleFlipVSelected={handleFlipVSelected}
        handleRotateSelected={handleRotateSelected}
        handleSlantSelected={handleSlantSelected}
        handleScaleSelected={handleScaleSelected}
        handleDuplicateSelected={handleDuplicateSelected}
        handleSmoothStrokeSelected={handleSmoothStrokeSelected}
        handleSimplifySelected={handleSimplifySelected}
        handleDeleteSelected={handleDeleteSelected}
      />

      {/* Mobile Brush Presets & Width Bottom Sheet */}
      <MobileBrushSettingsSheet
        isOpen={showMobileBrushSheet}
        onClose={() => setShowMobileBrushSheet(false)}
        isLight={isLight}
        brushWidth={brushWidth}
        onChangeBrushWidth={onChangeBrushWidth}
        pressureSensitivity={pressureSensitivity}
        onChangePressureSensitivity={onChangePressureSensitivity}
        smoothingIntensity={smoothingIntensity}
        onChangeSmoothingIntensity={onChangeSmoothingIntensity}
        brushStraightMode={brushStraightMode}
        setBrushStraightMode={setBrushStraightMode}
        showCanvasToast={showCanvasToast}
        brushStyle={brushStyle}
        onChangeBrushStyle={onChangeBrushStyle}
      />

      {/* Guides & Grid Settings Modal / Sheet */}
      <GuidesAndGridModal
        isOpen={showMobileGuidesSheet}
        onClose={() => setShowMobileGuidesSheet(false)}
        isLight={isLight}
        gridSettings={gridSettings}
        onChangeGridSettings={onChangeGridSettings as any}
        upm={upm}
        isOutlineMode={isOutlineMode}
        setOutlineOnly={setOutlineOnly}
        nodeStyle={nodeStyle}
        setNodeStyle={setNodeStyle}
        showNodes={showNodes}
        setShowNodes={setShowNodes}
        customGuidelines={customGuidelines}
        setCustomGuidelines={setCustomGuidelines}
        lockGuidelines={lockGuidelines}
        setLockGuidelines={setLockGuidelines}
        showCanvasToast={showCanvasToast}
      />
    </>
  );
});
