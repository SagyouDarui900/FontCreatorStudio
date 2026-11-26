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
} from '../../../types';
import { ThemeMode } from '../../../utils/theme';
import type { AlignDirection, DistributeDirection } from '../../../utils/geometry/alignment';
import { TraceAdjustFloatingHud } from './TraceAdjustFloatingHud';
import { CanvasTouchLoupe } from './CanvasTouchLoupe';
import { CanvasToastNotification } from './CanvasToastNotification';
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
  traceSettings?: TraceSettings;
  onChangeTraceSettings?: React.Dispatch<React.SetStateAction<TraceSettings>>;
  handleResetTracePosition: () => void;
  handleResetTraceAll: () => void;
  onSetToolMode?: (mode: ToolMode) => void;
  showCanvasToast: (msg: string, sub?: string) => void;
  touchLoupeState: { visible: boolean; screenX: number; screenY: number; canvasPos: Point | null };
  contours: PathContour[];
  isOutlineMode: boolean;
  canvasToast: { message: string; subText?: string; id: number } | null;
  selectedNodeId?: string | null;
  selectedNodeIds?: string[];
  selectedContourId?: string | null;
  handleDeleteSelectedNode?: () => void;
  handleToggleNodeType: (contourId?: string, nodeId?: string) => void;
  isGlyphLocked?: boolean;
  isMobileAuxMenuOpen: boolean;
  setIsMobileAuxMenuOpen: (val: boolean) => void;
  resetView: (target?: '100%' | 'fit' | 'width') => void;
  handleZoomStep: (delta: number) => void;
  zoom: number;
  onChangeGridSettings: (settings: GridSettings | ((prev: GridSettings) => GridSettings)) => void;
  gridSettings: GridSettings;
  palmRejectionMode: 'auto' | 'strict_pen_only' | 'off';
  handleSetPalmRejectionMode: (mode: 'auto' | 'strict_pen_only' | 'off') => void;
  pressureSensitivity: 'high' | 'normal' | 'low' | 'off';
  onChangePressureSensitivity?: (val: 'high' | 'normal' | 'low' | 'off') => void;
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
  setSelectedContourId?: (id: string | null) => void;
  setSelectedNodeId: (id: string | null) => void;
  setSelectedHandleType?: (t: 'node' | 'handleIn' | 'handleOut' | null) => void;
  handleFlipHSelected: () => void;
  handleFlipVSelected: () => void;
  handleRotateSelected: (angleDeg?: number) => void;
  handleSlantSelected: (slantDelta: number) => void;
  handleScaleSelected: (scaleFactor: number) => void;
  handleAlignSelected?: (direction: AlignDirection) => void;
  handleDistributeSelected?: (direction: DistributeDirection) => void;
  handleSmoothStrokeSelected: () => void;
  handleSimplifySelected: () => void;
  handleSubtractSelectedContours?: () => void;
  handleIntersectSelectedContours?: () => void;
  handleConvertToCornersSelected?: () => void;
  handleConvertToSmoothSelected?: () => void;
  handleExpandStrokeSelected?: () => void;
  handleReverseWindingSelected?: () => void;
  handleRegisterSelectedAsCustomPart?: () => void;
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
  // M14: shared clear-all handler (asks for confirmation; guidelines
  // have no Undo). Returns true when the clear actually happened.
  handleClearAllGuidelines?: () => boolean;
  lockGuidelines: boolean;
  setLockGuidelines: (val: boolean) => void;
  activeChar?: string;
  selectedUnicode?: number;
  onGenerateDakutenTarget?: (targetChar: string, isHandakuten?: boolean) => void;
  onDuplicateAsSmallKana?: (sourceUnicode: number) => void;
  onOpenGlyphSynthesisModal?: () => void;
  onSelectPrevUncompletedGlyph?: () => void;
  onSelectNextUncompletedGlyph?: () => void;
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
  traceSettings,
  onChangeTraceSettings,
  handleResetTracePosition,
  handleResetTraceAll,
  onSetToolMode,
  showCanvasToast,
  touchLoupeState,
  contours,
  isOutlineMode,
  canvasToast,
  selectedNodeId,
  selectedNodeIds,
  selectedContourId,
  handleDeleteSelectedNode,
  handleToggleNodeType,
  isGlyphLocked = false,
  isMobileAuxMenuOpen,
  setIsMobileAuxMenuOpen,
  resetView,
  handleZoomStep,
  zoom,
  onChangeGridSettings,
  gridSettings,
  palmRejectionMode,
  handleSetPalmRejectionMode,
  pressureSensitivity,
  onChangePressureSensitivity,
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
  setSelectedContourId,
  setSelectedNodeId,
  setSelectedHandleType,
  handleFlipHSelected,
  handleFlipVSelected,
  handleRotateSelected,
  handleSlantSelected,
  handleScaleSelected,
  handleAlignSelected,
  handleDistributeSelected,
  handleSmoothStrokeSelected,
  handleSimplifySelected,
  handleSubtractSelectedContours,
  handleIntersectSelectedContours,
  handleConvertToCornersSelected,
  handleConvertToSmoothSelected,
  handleExpandStrokeSelected,
  handleReverseWindingSelected,
  handleRegisterSelectedAsCustomPart,
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
  handleClearAllGuidelines,
  lockGuidelines,
  setLockGuidelines,
  activeChar,
  selectedUnicode,
  onGenerateDakutenTarget,
  onDuplicateAsSmallKana,
  onOpenGlyphSynthesisModal,
  onSelectPrevUncompletedGlyph,
  onSelectNextUncompletedGlyph,
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
        <div className="sm:hidden absolute top-2 right-2 z-30 flex items-center space-x-1 bg-stone-900/90 px-1.5 py-1 rounded-md border border-white/20 shadow-lg text-white">
          {onUndo && (
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className="p-1 rounded hover:bg-white/20 disabled:opacity-30"
              title="1つ戻す"
            >
              <Undo className="w-3.5 h-3.5" />
            </button>
          )}
          {onRedo && (
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className="p-1 rounded hover:bg-white/20 disabled:opacity-30"
              title="やり直す"
            >
              <Redo className="w-3.5 h-3.5" />
            </button>
          )}
          <div className="w-[1px] h-3 bg-white/30 mx-0.5" />
          <button
            onClick={() => setIsMobileFocusMode(false)}
            className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-[10px] font-bold text-white"
          >
            <Minimize className="w-3.5 h-3.5" />
            <span>完了</span>
          </button>
        </div>
      )}

      {/* Hand Tool Active Floating HUD Indicator */}
      {(toolMode === 'hand' || isSpacePressed) && (
        <div
          className={`absolute top-2 left-2 z-30 px-2 py-0.5 rounded-md border flex items-center gap-1.5 text-[10.5px] font-semibold pointer-events-none select-none max-w-fit ${
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

      {/* Mobile & Tablet Precision Touch Loupe */}
      <CanvasTouchLoupe
        touchLoupeState={touchLoupeState}
        contours={contours}
        theme={theme}
        isOutlineMode={isOutlineMode}
        selectedContourIds={selectedContourIds}
        selectedNodeId={selectedNodeId}
      />

      {/* Toast Notification */}
      <CanvasToastNotification
        canvasToast={canvasToast}
        isLight={isLight}
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
        palmRejectionMode={palmRejectionMode}
        handleSetPalmRejectionMode={handleSetPalmRejectionMode}
        toolMode={toolMode}
        selectedNodeId={selectedNodeId || null}
        selectedNodeIds={selectedNodeIds}
        selectedContourId={selectedContourId || null}
        handleToggleNodeType={handleToggleNodeType}
        handleDeleteSelectedNode={handleDeleteSelectedNode || (() => {})}
        isGlyphLocked={isGlyphLocked}
        traceSettings={effectiveTraceSettings}
        onChangeTraceSettings={onChangeTraceSettings}
        handleResetTracePosition={handleResetTracePosition}
        onOpenGlyphCompareModal={onOpenGlyphCompareModal}
        overlaySettings={overlaySettings}
        contours={contours}
        handleClearAllContours={handleClearAllContours}
        activeChar={activeChar}
        selectedUnicode={selectedUnicode}
        onGenerateDakutenTarget={onGenerateDakutenTarget}
        onDuplicateAsSmallKana={onDuplicateAsSmallKana}
        onOpenGlyphSynthesisModal={onOpenGlyphSynthesisModal}
        onSelectPrevUncompletedGlyph={onSelectPrevUncompletedGlyph}
        onSelectNextUncompletedGlyph={onSelectNextUncompletedGlyph}
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
        setSelectedContourId={setSelectedContourId}
        setSelectedNodeId={setSelectedNodeId}
        setSelectedHandleType={setSelectedHandleType}
        isGlyphLocked={isGlyphLocked}
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
        handleAlignSelected={handleAlignSelected}
        handleDistributeSelected={handleDistributeSelected}
        handleDuplicateSelected={handleDuplicateSelected}
        handleSmoothStrokeSelected={handleSmoothStrokeSelected}
        handleSimplifySelected={handleSimplifySelected}
        handleSubtractSelectedContours={handleSubtractSelectedContours}
        handleIntersectSelectedContours={handleIntersectSelectedContours}
        handleConvertToCornersSelected={handleConvertToCornersSelected}
        handleConvertToSmoothSelected={handleConvertToSmoothSelected}
        handleExpandStrokeSelected={handleExpandStrokeSelected}
        handleReverseWindingSelected={handleReverseWindingSelected}
        handleRegisterSelectedAsCustomPart={handleRegisterSelectedAsCustomPart}
        handleDeleteSelected={handleDeleteSelected}
        isGlyphLocked={isGlyphLocked}
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
        handleClearAllGuidelines={handleClearAllGuidelines}
        lockGuidelines={lockGuidelines}
        setLockGuidelines={setLockGuidelines}
        showCanvasToast={showCanvasToast}
      />
    </>
  );
});
