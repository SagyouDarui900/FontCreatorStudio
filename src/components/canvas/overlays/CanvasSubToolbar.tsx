import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Sliders,
  ChevronDown,
  Lock,
  Unlock,
  ChevronUp,
  Trash2,
  CircleDot,
  X,
} from 'lucide-react';
import {
  CanvasSubToolbarProps,
  ViewControlsSubToolbar,
  BrushSubToolbar,
  PenSubToolbar,
  EraserSubToolbar,
  RulerSubToolbar,
  NodeAndShapeSubToolbar,
  SelectionSubToolbar,
} from '../subtoolbars';

export type { CanvasSubToolbarProps };

export const CanvasSubToolbar: React.FC<CanvasSubToolbarProps> = React.memo(({
  isMobileFocusMode,
  showSubToolbar,
  handleToggleSubToolbar,
  themeClasses,
  isLight,
  onSelectPrevGlyph,
  onSelectNextGlyph,
  activeChar,
  selectedUnicode,
  onGenerateDakutenTarget,
  showCanvasToast,
  showNodes,
  setShowNodes,
  isOutlineMode,
  setOutlineOnly,
  gridSettings,
  onChangeGridSettings,
  toolMode,
  setShowMobileBrushSheet,
  brushStyle,
  brushWidth,
  onChangeBrushStyle,
  onChangeBrushWidth,
  onOpenPenPresetsModal,
  pressureSensitivity,
  onChangePressureSensitivity,
  brushStraightMode,
  setBrushStraightMode,
  autoSmoothBrush,
  setAutoSmoothBrush,
  smoothStrength,
  setSmoothStrength,
  handleStraightenWobblySelected,
  penMode,
  setPenMode,
  penStrokeWidth,
  handleSetPenStrokeWidth,
  penCapStyle,
  handleSetPenCapStyle,
  eraserMode,
  setEraserMode,
  eraserSize,
  setEraserSize,
  isShapeTool,
  rulerMeasurement,
  handleDrawRulerAsStroke,
  handleConvertRulerToGuideline,
  setRulerMeasurement,
  customGuidelines,
  setCustomGuidelines,
  lockGuidelines,
  setLockGuidelines,
  contours,
  handleClearAll,
  selectedContourIds,
  setSelectedContourIds,
  setSelectedContourId,
  selectedNodeId,
  setSelectedNodeId,
  setSelectedHandleType,
  handleRotateSelected,
  handleFlipHSelected,
  handleFlipVSelected,
  handleMergeSelectedContours,
  handleDuplicateSelected,
  handleDeleteSelected,
  handleSmoothStrokeSelected,
  handleExpandStrokeSelected,
  handleSubtractSelectedContours,
  handleIntersectSelectedContours,
  handleSlantSelected,
  handleReverseWindingSelected,
  handleConvertToSmoothSelected,
  handleConvertToCornersSelected,
  handleToggleNodeType,
  handleDeleteSelectedNode,
  handleClearAllGuidelines,
  isGuideEraserActive,
  setIsGuideEraserActive,
  nodeStyle,
  setNodeStyle,
  smoothPreserveCorners,
  isShiftLockRatio,
  setIsShiftLockRatio,
  isAltFromCenter,
  setIsAltFromCenter,
}) => {
  const subToolbarRef = useRef<HTMLDivElement>(null);
  const [subToolbarCanScrollLeft, setSubToolbarCanScrollLeft] = useState(false);
  const [subToolbarCanScrollRight, setSubToolbarCanScrollRight] = useState(false);

  const checkSubToolbarScroll = useCallback(() => {
    const el = subToolbarRef.current;
    if (!el) return;
    setSubToolbarCanScrollLeft(el.scrollLeft > 6);
    setSubToolbarCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 6);
  }, []);

  const handleSubToolbarScrollLeft = useCallback(() => {
    if (subToolbarRef.current) {
      subToolbarRef.current.scrollBy({ left: -260, behavior: 'smooth' });
    }
  }, []);

  const handleSubToolbarScrollRight = useCallback(() => {
    if (subToolbarRef.current) {
      subToolbarRef.current.scrollBy({ left: 260, behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    const el = subToolbarRef.current;
    if (!el || !showSubToolbar) return;

    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth > el.clientWidth) {
        if (!e.ctrlKey && !e.metaKey) {
          if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && e.deltaY !== 0) {
            e.preventDefault();
            let delta = e.deltaY;
            if (e.deltaMode === 1) delta *= 33;
            else if (e.deltaMode === 2) delta *= 400;
            el.scrollLeft += delta;
            checkSubToolbarScroll();
          }
        }
      }
    };

    let isDown = false;
    let startX = 0;
    let scrollStart = 0;

    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('button, input, select, textarea, a, label, [role="button"], [role="slider"]')) {
        return;
      }
      isDown = true;
      startX = e.pageX - el.offsetLeft;
      scrollStart = el.scrollLeft;
      el.style.cursor = 'grab';
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - el.offsetLeft;
      const walk = (x - startX) * 1.3;
      el.scrollLeft = scrollStart - walk;
      el.style.cursor = 'grabbing';
      checkSubToolbarScroll();
    };

    const onMouseUp = () => {
      if (isDown) {
        isDown = false;
        if (el) el.style.cursor = '';
      }
    };

    const onScroll = () => {
      checkSubToolbarScroll();
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    el.addEventListener('scroll', onScroll, { passive: true });

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        checkSubToolbarScroll();
      });
      ro.observe(el);
    }

    checkSubToolbarScroll();

    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      el.removeEventListener('scroll', onScroll);
      if (ro) ro.disconnect();
    };
  }, [showSubToolbar, toolMode, activeChar, checkSubToolbarScroll]);

  return (
    <>
      {!isMobileFocusMode && showSubToolbar ? (
        <div
          ref={subToolbarRef}
          onWheel={(e) => {
            if (e.currentTarget.scrollWidth > e.currentTarget.clientWidth) {
              if (!e.ctrlKey && !e.metaKey && Math.abs(e.deltaY) > Math.abs(e.deltaX) && e.deltaY !== 0) {
                const delta = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY;
                e.currentTarget.scrollLeft += delta;
                checkSubToolbarScroll();
              }
            }
          }}
          className={`h-11 border-b flex items-center justify-between px-2.5 sm:px-3 shrink-0 z-20 select-none overflow-x-auto touch-scroll-x custom-scrollbar gap-2 relative transition-colors ${themeClasses.subtoolbarBg}`}
        >
          {/* Sticky Left Scroll Jump Button */}
          {subToolbarCanScrollLeft && (
            <button
              type="button"
              onClick={handleSubToolbarScrollLeft}
              className="sticky left-0 z-30 shrink-0 flex items-center justify-center w-6 h-8 -my-1 rounded bg-stone-200/95 dark:bg-stone-800/95 hover:bg-emerald-100 dark:hover:bg-emerald-950/80 text-stone-700 dark:text-emerald-300 shadow-md border border-stone-300/80 dark:border-stone-700/80 transition-colors cursor-pointer"
              title="ツールバーを左へスクロール"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Left: Quick Character Switcher & Context Tool Settings */}
          <div className="flex items-center space-x-1.5 shrink-0">
            <ViewControlsSubToolbar
              onSelectPrevGlyph={onSelectPrevGlyph}
              onSelectNextGlyph={onSelectNextGlyph}
              activeChar={activeChar}
              selectedUnicode={selectedUnicode}
              onGenerateDakutenTarget={onGenerateDakutenTarget}
              showCanvasToast={showCanvasToast}
              showNodes={showNodes}
              setShowNodes={setShowNodes}
              isOutlineMode={isOutlineMode}
              setOutlineOnly={setOutlineOnly}
              gridSettings={gridSettings}
              onChangeGridSettings={onChangeGridSettings}
              isLight={isLight}
            />

            {/* Brush Tool Options */}
            {toolMode === 'brush' && (
              <BrushSubToolbar
                brushStyle={brushStyle}
                onChangeBrushStyle={onChangeBrushStyle}
                brushWidth={brushWidth}
                onChangeBrushWidth={onChangeBrushWidth}
                onOpenPenPresetsModal={onOpenPenPresetsModal}
                pressureSensitivity={pressureSensitivity}
                onChangePressureSensitivity={onChangePressureSensitivity}
                setShowMobileBrushSheet={setShowMobileBrushSheet}
                brushStraightMode={brushStraightMode}
                setBrushStraightMode={setBrushStraightMode}
                autoSmoothBrush={autoSmoothBrush}
                setAutoSmoothBrush={setAutoSmoothBrush}
                smoothStrength={smoothStrength}
                setSmoothStrength={setSmoothStrength}
                handleStraightenWobblySelected={handleStraightenWobblySelected}
                showCanvasToast={showCanvasToast}
                isLight={isLight}
              />
            )}

            {/* Pen Tool options */}
            {toolMode === 'pen' && (
              <PenSubToolbar
                penMode={penMode}
                setPenMode={setPenMode}
                penStrokeWidth={penStrokeWidth}
                handleSetPenStrokeWidth={handleSetPenStrokeWidth}
                penCapStyle={penCapStyle}
                handleSetPenCapStyle={handleSetPenCapStyle}
                onOpenPenPresetsModal={onOpenPenPresetsModal}
              />
            )}

            {/* Eraser Tool Options */}
            {toolMode === 'eraser' && (
              <EraserSubToolbar
                eraserMode={eraserMode}
                setEraserMode={setEraserMode}
                eraserSize={eraserSize}
                setEraserSize={setEraserSize}
                handleClearAll={handleClearAll}
              />
            )}

            {/* Ruler / Dimension Measurement Options */}
            {toolMode === 'ruler' && (
              <RulerSubToolbar
                rulerMeasurement={rulerMeasurement}
                handleDrawRulerAsStroke={handleDrawRulerAsStroke}
                handleConvertRulerToGuideline={handleConvertRulerToGuideline}
                setRulerMeasurement={setRulerMeasurement}
                customGuidelines={customGuidelines}
                isGuideEraserActive={isGuideEraserActive}
                setIsGuideEraserActive={setIsGuideEraserActive}
                handleClearAllGuidelines={handleClearAllGuidelines}
              />
            )}

            {/* Node Tool & Shape Tool Options */}
            <NodeAndShapeSubToolbar
              toolMode={toolMode}
              nodeStyle={nodeStyle}
              setNodeStyle={setNodeStyle}
              selectedNodeId={selectedNodeId}
              selectedContourId={selectedContourIds[0] || null}
              handleToggleNodeType={handleToggleNodeType}
              handleDeleteSelectedNode={handleDeleteSelectedNode}
              isShapeTool={isShapeTool}
              isShiftLockRatio={isShiftLockRatio}
              setIsShiftLockRatio={setIsShiftLockRatio}
              isAltFromCenter={isAltFromCenter}
              setIsAltFromCenter={setIsAltFromCenter}
              showCanvasToast={showCanvasToast}
              isLight={isLight}
            />
          </div>

          {/* Center: Selected Part Actions / Quick Transform Strip */}
          <div className="flex items-center space-x-1 shrink-0">
            <SelectionSubToolbar
              toolMode={toolMode}
              selectedContourIds={selectedContourIds}
              setSelectedContourIds={setSelectedContourIds}
              setSelectedContourId={setSelectedContourId}
              setSelectedNodeId={setSelectedNodeId}
              setSelectedHandleType={setSelectedHandleType}
              showCanvasToast={showCanvasToast}
              handleMergeSelectedContours={handleMergeSelectedContours}
              handleSubtractSelectedContours={handleSubtractSelectedContours}
              handleIntersectSelectedContours={handleIntersectSelectedContours}
              handleSmoothStrokeSelected={handleSmoothStrokeSelected}
              handleConvertToCornersSelected={handleConvertToCornersSelected}
              handleConvertToSmoothSelected={handleConvertToSmoothSelected}
              handleExpandStrokeSelected={handleExpandStrokeSelected}
              handleReverseWindingSelected={handleReverseWindingSelected}
              handleFlipHSelected={handleFlipHSelected}
              handleFlipVSelected={handleFlipVSelected}
              handleRotateSelected={handleRotateSelected}
              handleSlantSelected={handleSlantSelected}
              handleDuplicateSelected={handleDuplicateSelected}
              handleDeleteSelected={handleDeleteSelected}
              penStrokeWidth={penStrokeWidth}
              smoothStrength={smoothStrength}
              smoothPreserveCorners={smoothPreserveCorners}
            />
          </div>

          {/* Right: Actions & Custom Guidelines */}
          <div className="flex items-center space-x-1.5 shrink-0">
            {/* Custom Guidelines Lock & Clear */}
            {customGuidelines.length > 0 && (
              <div className="hidden sm:flex items-center space-x-1 pl-1 border-l border-stone-200 dark:border-stone-700">
                <button
                  type="button"
                  onClick={() => {
                    const nextLocked = !lockGuidelines;
                    setLockGuidelines(nextLocked);
                    showCanvasToast(
                      nextLocked ? 'ガイド線をロックしました' : 'ガイド線のロックを解除しました (移動可能)'
                    );
                  }}
                  className={`p-1.5 rounded border transition-colors flex items-center space-x-1 text-xs font-bold cursor-pointer ${
                    lockGuidelines
                      ? isLight
                        ? 'bg-stone-100 border-stone-300 text-stone-600'
                        : 'bg-stone-800 border-stone-700 text-stone-300'
                      : 'bg-amber-100 dark:bg-amber-950 border-amber-400 text-amber-900 dark:text-amber-200'
                  }`}
                  title={
                    lockGuidelines
                      ? 'ガイド線ロック中 (クリックで移動可能に解除)'
                      : 'ガイド線移動可能 (クリックでロック)'
                  }
                >
                  {lockGuidelines ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  <span className="text-[10px]">{lockGuidelines ? 'ガイド固定' : '移動可能'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCustomGuidelines([]);
                    showCanvasToast('カスタムガイド線を消去しました');
                  }}
                  className="p-1.5 rounded hover:bg-rose-100 dark:hover:bg-rose-950 text-stone-400 hover:text-rose-600 transition-colors cursor-pointer"
                  title="カスタムガイド線を全消去"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Clear All button if has contours */}
            {contours.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="p-1.5 rounded hover:bg-rose-100 dark:hover:bg-rose-950 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                title="全パスを消去"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Collapse Subtoolbar button */}
            <button
              type="button"
              onClick={handleToggleSubToolbar}
              className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-[#202e24] text-stone-400 hover:text-stone-700 dark:hover:text-emerald-300 transition-colors ml-0.5 cursor-pointer"
              title="サブツールバーを折りたたむ (作図キャンバスを広く使う)"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Sticky Right Scroll Jump Button */}
          {subToolbarCanScrollRight && (
            <button
              type="button"
              onClick={handleSubToolbarScrollRight}
              className="sticky right-0 z-30 shrink-0 flex items-center justify-center w-6 h-8 -my-1 rounded bg-stone-200/95 dark:bg-stone-800/95 hover:bg-emerald-100 dark:hover:bg-emerald-950/80 text-stone-700 dark:text-emerald-300 shadow-md border border-stone-300/80 dark:border-stone-700/80 transition-colors cursor-pointer"
              title="ツールバーを右へスクロール"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ) : (
        /* Collapsed Floating Minimal Trigger */
        !isMobileFocusMode && (
          <div
            className="absolute top-2 left-2 z-20 pointer-events-auto flex items-center space-x-1 bg-white/95 dark:bg-[#121c15]/95 px-2 py-1 rounded-full border border-stone-200/80 dark:border-emerald-800/60 text-xs select-none shadow-sm"
            onPointerDown={(e) => e.stopPropagation()}
          >
            {onSelectPrevGlyph && (
              <button
                type="button"
                onClick={onSelectPrevGlyph}
                className="p-0.5 rounded-full hover:bg-stone-200 dark:hover:bg-emerald-950 text-stone-600 dark:text-emerald-300 cursor-pointer"
                title="前の文字"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            )}
            <span className="font-bold text-emerald-900 dark:text-emerald-200 px-1 font-sans">{activeChar}</span>
            {onSelectNextGlyph && (
              <button
                type="button"
                onClick={onSelectNextGlyph}
                className="p-0.5 rounded-full hover:bg-stone-200 dark:hover:bg-emerald-950 text-stone-600 dark:text-emerald-300 cursor-pointer"
                title="次の文字"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
            <div className="w-[1px] h-3 bg-stone-300 dark:bg-emerald-800 mx-0.5" />
            <button
              type="button"
              onClick={handleToggleSubToolbar}
              className="flex items-center space-x-1 px-1.5 py-0.5 rounded-full hover:bg-emerald-100 dark:hover:bg-emerald-950 text-[10.5px] font-bold text-emerald-800 dark:text-emerald-300 transition-colors cursor-pointer"
              title="サブツールバーを展開"
            >
              <Sliders className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden xs:inline">詳細バー</span>
              <ChevronDown className="w-3 h-3" />
            </button>
            {onChangeGridSettings && (
              <>
                <div className="w-[1px] h-3 bg-stone-300 dark:bg-emerald-800 mx-0.5" />
                <button
                  type="button"
                  onClick={() => {
                    const next = !gridSettings.showCursorCrosshair;
                    onChangeGridSettings((prev) => ({
                      ...prev,
                      showCursorCrosshair: next,
                      highContrastCursor: next,
                    }));
                    showCanvasToast(
                      next ? '照準ポインター・十字線: ON' : '照準ポインター・十字線: OFF',
                      next ? '高視認性照準リング＆十字線ガイドを表示' : 'OS標準の軽量カーソルのみ表示'
                    );
                  }}
                  className={`p-1 rounded-full transition-colors cursor-pointer ${
                    gridSettings.showCursorCrosshair
                      ? isLight
                        ? 'bg-amber-100 text-amber-900 font-bold'
                        : 'bg-emerald-800 text-amber-300 font-bold'
                      : 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'
                  }`}
                  title={`照準ポインター切替 [Hキー]: ${gridSettings.showCursorCrosshair ? 'ON' : 'OFF'}`}
                >
                  <CircleDot className="w-3 h-3" />
                </button>
              </>
            )}
          </div>
        )
      )}
    </>
  );
});

CanvasSubToolbar.displayName = 'CanvasSubToolbar';

export default CanvasSubToolbar;
