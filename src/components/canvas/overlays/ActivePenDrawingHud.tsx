import React from 'react';
import {
  GripVertical,
  PenTool,
  RotateCcw,
  CornerDownLeft,
  ChevronDown,
  Check,
  Trash2,
} from 'lucide-react';
import { PathContour, Point } from '../../../types';

export interface ActivePenDrawingHudProps {
  activePenContour: PathContour | null;
  penHudPos: Point | null;
  isLight: boolean;
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
}

export const ActivePenDrawingHud: React.FC<ActivePenDrawingHudProps> = React.memo(({
  activePenContour,
  penHudPos,
  isLight,
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
}) => {
  if (!activePenContour) {
    return null;
  }

  return (
    <div
      style={
        penHudPos
          ? { left: `${penHudPos.x}px`, top: `${penHudPos.y}px` }
          : { left: '50%', transform: 'translateX(-50%)', top: '12px' }
      }
      className="absolute z-30 pointer-events-auto select-none animate-in fade-in zoom-in-95 duration-100"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        className={`px-2 py-1 rounded-full border shadow-xl flex items-center space-x-1.5 text-xs whitespace-nowrap ${
          isLight
            ? 'bg-white/98 border-emerald-300/80 text-stone-800'
            : 'bg-[#121c15]/98 border-emerald-700/60 text-emerald-100'
        }`}
      >
        {/* Drag Handle */}
        <div
          onPointerDown={handlePenHudPointerDown}
          onPointerMove={handlePenHudPointerMove}
          onPointerUp={handlePenHudPointerUp}
          onPointerCancel={handlePenHudPointerUp}
          className="flex items-center px-1 py-1 -ml-0.5 cursor-grab active:cursor-grabbing text-stone-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          title="ドラッグして好きな場所に移動"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>

        {/* Active Points Count */}
        <div className="flex items-center space-x-1 px-1.5 py-0.5 rounded-full bg-emerald-100/80 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-300 font-bold font-mono text-[11px] shrink-0 whitespace-nowrap">
          <PenTool className="w-3 h-3 text-emerald-700 dark:text-emerald-400" />
          <span>{activePenContour.nodes.length}点</span>
        </div>

        <div className="h-3.5 w-[1px] bg-stone-200 dark:bg-emerald-800/80 shrink-0" />

        {/* Undo Last Point */}
        <button
          onClick={handleUndoPenNode}
          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold flex items-center space-x-1 transition-all active:scale-95 whitespace-nowrap ${
            isLight
              ? 'bg-stone-100 hover:bg-emerald-100 text-stone-700 hover:text-emerald-900'
              : 'bg-[#1e2d23] hover:bg-[#283d30] text-emerald-200'
          }`}
          title="直前の頂点を取り消す (Backspace / ⌫ または Ctrl+Z)"
        >
          <RotateCcw className="w-3 h-3 text-stone-500 dark:text-stone-300 shrink-0" />
          <span>1点戻す</span>
          <span className="text-[9px] opacity-60 font-mono hidden sm:inline">⌫</span>
        </button>

        {/* Finalize as open path / stroke with configurable line thickness */}
        <div className="relative flex items-center">
          <button
            onClick={() => handleFinishPenContour(false)}
            disabled={activePenContour.nodes.length < 2}
            className={`px-2 py-0.5 rounded-l-full text-[11px] font-semibold flex items-center space-x-1 transition-all disabled:opacity-30 active:scale-95 whitespace-nowrap ${
              isLight
                ? 'bg-sky-50 hover:bg-sky-100 text-sky-800 border-r border-sky-200'
                : 'bg-sky-950/70 hover:bg-sky-900/80 text-sky-200 border-r border-sky-800'
            }`}
            title={`開いた線を太さ ${penStrokeWidth}px (${penCapStyle === 'round' ? '丸端' : penCapStyle === 'butt' ? '平端' : '角端'}) で確定する (Enter / ↵)`}
          >
            <CornerDownLeft className="w-3 h-3 text-sky-600 dark:text-sky-400 shrink-0" />
            <span>線で確定</span>
            <span className="text-[9px] opacity-60 font-mono hidden sm:inline">↵</span>
          </button>

          {/* Stroke width quick trigger / badge button */}
          <button
            type="button"
            onClick={() => setShowPenStrokeMenu((prev) => !prev)}
            className={`px-1.5 py-0.5 rounded-r-full text-[10px] font-mono font-bold flex items-center space-x-0.5 transition-all active:scale-95 ${
              isLight
                ? 'bg-sky-100 hover:bg-sky-200 text-sky-900'
                : 'bg-sky-900/90 hover:bg-sky-800 text-sky-100'
            }`}
            title="線の太さ・端点形状を変更"
          >
            <span>{penStrokeWidth}px</span>
            <ChevronDown className="w-2.5 h-2.5 opacity-70" />
          </button>

          {/* Pen Stroke Quick Settings Floating Popover Menu */}
          {showPenStrokeMenu && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent pointer-events-auto"
              onClick={() => setShowPenStrokeMenu(false)}
            >
              <div
                className={`p-3 rounded-2xl shadow-2xl border flex flex-col space-y-2.5 min-w-[240px] text-xs pointer-events-auto animate-in fade-in zoom-in-95 duration-100 ${
                  isLight
                    ? 'bg-white border-sky-200 text-stone-800'
                    : 'bg-[#0f1b14] border-sky-800/80 text-sky-100'
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between pb-1.5 border-b border-stone-200 dark:border-stone-800">
                  <span className="font-bold flex items-center space-x-1.5 text-sky-700 dark:text-sky-300">
                    <PenTool className="w-3.5 h-3.5" />
                    <span>線の太さ設定</span>
                  </span>
                  <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 text-xs">
                    {penStrokeWidth} px
                  </span>
                </div>

                {/* Stepper + Slider */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleSetPenStrokeWidth(penStrokeWidth - (penStrokeWidth > 20 ? 5 : 2))}
                    disabled={penStrokeWidth <= 2}
                    className="w-7 h-7 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 font-bold text-sm flex items-center justify-center disabled:opacity-30 cursor-pointer"
                  >
                    -
                  </button>
                  <input
                    type="range"
                    min={4}
                    max={160}
                    step={2}
                    value={penStrokeWidth}
                    onChange={(e) => handleSetPenStrokeWidth(parseInt(e.target.value, 10))}
                    className="flex-1 h-2 accent-sky-600 dark:accent-sky-500 cursor-pointer"
                  />
                  <button
                    onClick={() => handleSetPenStrokeWidth(penStrokeWidth + (penStrokeWidth >= 20 ? 5 : 2))}
                    disabled={penStrokeWidth >= 300}
                    className="w-7 h-7 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 font-bold text-sm flex items-center justify-center disabled:opacity-30 cursor-pointer"
                  >
                    +
                  </button>
                </div>

                {/* Presets Grid */}
                <div>
                  <span className="text-[10px] text-stone-500 dark:text-stone-400 mb-1 block">クイック太さ:</span>
                  <div className="grid grid-cols-5 gap-1 font-mono text-[11px]">
                    {[15, 25, 40, 60, 80].map((w) => (
                      <button
                        key={w}
                        onClick={() => {
                          handleSetPenStrokeWidth(w);
                        }}
                        className={`py-1 rounded text-center transition-all cursor-pointer ${
                          penStrokeWidth === w
                            ? 'bg-sky-600 text-white font-bold ring-1 ring-sky-400'
                            : 'bg-stone-100 dark:bg-stone-800/80 hover:bg-sky-100 dark:hover:bg-sky-950 text-stone-700 dark:text-stone-300'
                        }`}
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cap Style */}
                <div>
                  <span className="text-[10px] text-stone-500 dark:text-stone-400 mb-1 block">端点の形状:</span>
                  <div className="grid grid-cols-3 gap-1 text-[11px]">
                    {[
                      { id: 'round', label: '丸 (Round)' },
                      { id: 'butt', label: '平 (Butt)' },
                      { id: 'square', label: '角 (Square)' },
                    ].map((cap) => (
                      <button
                        key={cap.id}
                        onClick={() => handleSetPenCapStyle(cap.id as 'round' | 'butt' | 'square')}
                        className={`py-1 rounded text-center transition-all cursor-pointer ${
                          penCapStyle === cap.id
                            ? 'bg-sky-600 text-white font-bold'
                            : 'bg-stone-100 dark:bg-stone-800/80 hover:bg-sky-100 dark:hover:bg-sky-950 text-stone-700 dark:text-stone-300'
                        }`}
                      >
                        {cap.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action button inside popover */}
                <button
                  onClick={() => {
                    setShowPenStrokeMenu(false);
                    handleFinishPenContour(false);
                  }}
                  disabled={activePenContour.nodes.length < 2}
                  className="mt-1 w-full py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-30 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md active:scale-98 transition-all cursor-pointer"
                >
                  <CornerDownLeft className="w-3.5 h-3.5" />
                  <span>この太さ ({penStrokeWidth}px) で線確定</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Finalize as closed path */}
        <button
          onClick={() => handleFinishPenContour(true)}
          disabled={activePenContour.nodes.length < 3}
          className="px-2.5 py-0.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center space-x-1 transition-all disabled:opacity-30 active:scale-95 whitespace-nowrap"
          title="パスを閉じて輪郭として確定する (C または 始点をクリック)"
        >
          <Check className="w-3 h-3 shrink-0" />
          <span>閉じて確定</span>
          <span className="text-[9px] opacity-75 font-mono hidden sm:inline">C</span>
        </button>

        {/* Discard / Reset Path */}
        <button
          onClick={handleResetPenContour}
          className="p-1 rounded-full hover:bg-rose-100 dark:hover:bg-rose-950/60 text-rose-600 dark:text-rose-400 transition-colors"
          title="作図中のパスを破棄・リセットする (Esc)"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>

        {/* Reset Position (only if moved) */}
        {penHudPos && (
          <button
            onClick={() => setPenHudPos(null)}
            className="p-1 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
            title="位置を上部中央にリセット"
          >
            <RotateCcw className="w-2.5 h-2.5" />
          </button>
        )}
      </div>
    </div>
  );
});

ActivePenDrawingHud.displayName = 'ActivePenDrawingHud';
