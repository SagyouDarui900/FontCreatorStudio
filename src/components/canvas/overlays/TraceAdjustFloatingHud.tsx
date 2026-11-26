import React from 'react';
import { Move, Minus, Plus, Type, RotateCcw, Check } from 'lucide-react';
import { ToolMode, TraceSettings } from '../../../types';
import {
  TRACE_FONT_OPTIONS,
  TRACE_SCALE_MAX,
  TRACE_SCALE_MIN,
} from '../traceOptions';

export interface TraceAdjustFloatingHudProps {
  toolMode: ToolMode;
  traceSettings: TraceSettings;
  onChangeTraceSettings?: React.Dispatch<React.SetStateAction<TraceSettings>>;
  handleResetTracePosition: () => void;
  handleResetTraceAll: () => void;
  onSetToolMode?: (mode: ToolMode) => void;
  showCanvasToast: (msg: string, sub?: string) => void;
  isLight: boolean;
}

export const TraceAdjustFloatingHud: React.FC<TraceAdjustFloatingHudProps> = React.memo(({
  toolMode,
  traceSettings,
  onChangeTraceSettings,
  handleResetTracePosition,
  handleResetTraceAll,
  onSetToolMode,
  showCanvasToast,
  isLight,
}) => {
  if (toolMode !== 'trace_adjust') return null;

  return (
    <div
      data-allow-native-scroll="true"
      className={`absolute top-7 sm:top-8 left-1/2 -translate-x-1/2 z-30 px-2.5 sm:px-3.5 py-1.5 rounded-xl border shadow-lg flex items-center gap-2 max-sm:flex-wrap max-sm:justify-center text-xs font-medium pointer-events-auto max-w-[96vw] overflow-x-auto overscroll-contain touch-pan-x no-scrollbar ${
        isLight
          ? 'bg-white/95 border-stone-200/90 text-stone-800 '
          : 'bg-[#141e17]/95 border-emerald-800/60 text-emerald-100 '
      }`}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Status & Icon */}
      <div className={`flex items-center space-x-1.5 font-bold shrink-0 ${isLight ? 'text-emerald-800' : 'text-emerald-400'}`}>
        <Move className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        <span className="text-xs">下絵位置・サイズ調整</span>
      </div>

      <div className={`h-3.5 w-[1px] shrink-0 ${isLight ? 'bg-stone-200' : 'bg-[#25362b]'}`} />

      {/* Scale Step Buttons & Slider */}
      <div className="flex items-center space-x-1 shrink-0">
        <span className={`text-[10.5px] ${isLight ? 'text-stone-500' : 'text-stone-400'}`}>サイズ:</span>
        <button
          onClick={() => {
            const cur = traceSettings.scale ?? 1;
            const next = Math.round(Math.max(TRACE_SCALE_MIN, cur - 0.05) * 100) / 100;
            onChangeTraceSettings?.({ ...traceSettings, scale: next });
          }}
          className={`w-5 h-5 rounded flex items-center justify-center ${
            isLight ? 'bg-stone-100 hover:bg-stone-200 text-stone-700' : 'bg-[#1c2a20] hover:bg-[#25382b] text-emerald-200'
          }`}
          title="縮小 (-5%)"
        >
          <Minus className="w-2.5 h-2.5" />
        </button>
        <input
          type="range"
          min={TRACE_SCALE_MIN}
          max={TRACE_SCALE_MAX}
          step="0.01"
          value={traceSettings.scale ?? 1}
          onChange={(e) => {
            onChangeTraceSettings?.({
              ...traceSettings,
              scale: parseFloat(e.target.value),
            });
          }}
          className={`w-16 sm:w-20 cursor-pointer h-1 rounded-lg touch-pan-x ${
            isLight ? 'bg-stone-200 accent-emerald-600' : 'bg-[#25362b] accent-emerald-500'
          }`}
          title="下絵サイズ（青枠ハンドルやホイールでも調整可能）"
        />
        <button
          onClick={() => {
            const cur = traceSettings.scale ?? 1;
            const next = Math.round(Math.min(TRACE_SCALE_MAX, cur + 0.05) * 100) / 100;
            onChangeTraceSettings?.({ ...traceSettings, scale: next });
          }}
          className={`w-5 h-5 rounded flex items-center justify-center ${
            isLight ? 'bg-stone-100 hover:bg-stone-200 text-stone-700' : 'bg-[#1c2a20] hover:bg-[#25382b] text-emerald-200'
          }`}
          title="拡大 (+5%)"
        >
          <Plus className="w-2.5 h-2.5" />
        </button>
        <span className={`font-mono text-[11px] w-9 text-right font-bold ${isLight ? 'text-emerald-800' : 'text-emerald-300'}`}>
          {Math.round((traceSettings.scale ?? 1) * 100)}%
        </span>
      </div>

      <div className={`h-3.5 w-[1px] shrink-0 ${isLight ? 'bg-stone-200' : 'bg-[#25362b]'}`} />

      {/* Quick Fit Size Presets */}
      <div className="flex items-center space-x-1 shrink-0">
        <button
          onClick={() => onChangeTraceSettings?.((prev) => ({ ...prev, scale: 0.78 }))}
          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
            Math.abs((traceSettings.scale ?? 1) - 0.78) < 0.02
              ? 'bg-amber-600 text-white '
              : isLight
              ? 'bg-stone-100 hover:bg-stone-200 text-stone-700'
              : 'bg-[#1c2a20] hover:bg-[#25382b] text-amber-300'
          }`}
          title="仮名字面枠 (78%) にフィット"
        >
          仮名 78%
        </button>
        <button
          onClick={() => onChangeTraceSettings?.((prev) => ({ ...prev, scale: 0.85 }))}
          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
            Math.abs((traceSettings.scale ?? 1) - 0.85) < 0.02
              ? 'bg-emerald-600 text-white '
              : isLight
              ? 'bg-stone-100 hover:bg-stone-200 text-stone-700'
              : 'bg-[#1c2a20] hover:bg-[#25382b] text-emerald-300'
          }`}
          title="漢字字面枠 (85%) にフィット"
        >
          漢字 85%
        </button>
        <button
          onClick={() => onChangeTraceSettings?.((prev) => ({ ...prev, scale: 1.0 }))}
          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
            Math.abs((traceSettings.scale ?? 1) - 1.0) < 0.02
              ? 'bg-sky-600 text-white '
              : isLight
              ? 'bg-stone-100 hover:bg-stone-200 text-stone-700'
              : 'bg-[#1c2a20] hover:bg-[#25382b] text-sky-300'
          }`}
          title="標準 100% (仮想ボディ枠基準)"
        >
          100%
        </button>
      </div>

      {/* Font choice if text trace */}
      {traceSettings.type === 'char' && (
        <>
          <div className={`h-3.5 w-[1px] shrink-0 ${isLight ? 'bg-stone-200' : 'bg-[#25362b]'}`} />
          <div className="flex items-center space-x-1 shrink-0">
            <Type className="w-3 h-3 text-stone-400" />
            <select
              value={traceSettings.fontFamily || "'Noto Sans JP', sans-serif"}
              onChange={(e) =>
                onChangeTraceSettings?.((prev) => ({
                  ...prev,
                  fontFamily: e.target.value,
                }))
              }
              className={`text-[10px] rounded px-1.5 py-0.5 border focus:outline-none ${
                isLight
                  ? 'bg-stone-100 text-stone-800 border-stone-300 focus:border-emerald-600'
                  : 'bg-[#1c2a20] text-emerald-200 border-[#2b3e30] focus:border-emerald-500'
              }`}
            >
              {TRACE_FONT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      <div className={`h-3.5 w-[1px] shrink-0 ${isLight ? 'bg-stone-200' : 'bg-[#25362b]'}`} />

      {/* Position Offset Status & Reset position & Exit Done Button */}
      <div className="flex items-center space-x-1.5 shrink-0 max-sm:basis-full max-sm:justify-center">
        {/* Position Reset Button */}
        <button
          onClick={handleResetTracePosition}
          className={`px-2 py-1 rounded text-[10.5px] font-bold flex items-center space-x-1 border ${
            (traceSettings.offsetX !== 0 || traceSettings.offsetY !== 0)
              ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-600'
              : isLight
              ? 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-300'
              : 'bg-[#1c2a20] hover:bg-[#25382b] text-emerald-200 border-[#2b3e30]'
          }`}
          title="下絵の位置を中央 (X:0, Y:0) にリセット (Rキーまたは下絵ダブルクリックでも可)"
        >
          <RotateCcw className="w-2.5 h-2.5" />
          <span>位置リセット</span>
        </button>

        {/* Reset All */}
        <button
          onClick={handleResetTraceAll}
          className={`px-1.5 py-1 rounded text-[10px] flex items-center space-x-0.5 ${
            isLight ? 'text-stone-500 hover:bg-stone-200' : 'text-stone-400 hover:bg-[#25382b]'
          }`}
          title="位置とサイズを推奨初期値にリセット"
        >
          <span>全リセット</span>
        </button>

        <button
          onClick={() => {
            onSetToolMode?.('brush');
            showCanvasToast('下絵調整を完了しました');
          }}
          className={`px-2.5 py-1 rounded font-bold text-[10.5px] flex items-center space-x-1 ${
            isLight
              ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
          }`}
          title="調整を完了して描画ツールに戻る"
        >
          <Check className="w-3 h-3" />
          <span>完了</span>
        </button>
      </div>
    </div>
  );
});

TraceAdjustFloatingHud.displayName = 'TraceAdjustFloatingHud';
