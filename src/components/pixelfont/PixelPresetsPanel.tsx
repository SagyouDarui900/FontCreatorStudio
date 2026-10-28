import React from 'react';
import {
  Grid,
  Check,
  Minus,
  Plus,
  ImageIcon,
  Type,
  Upload,
  RotateCcw,
  Sparkles,
  Pencil,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { PixelGridPreset, PixelDotShape } from './types';
import { PRESET_SIZES } from './constants';

interface PixelPresetsPanelProps {
  preset: PixelGridPreset;
  onPresetSelect: (p: PixelGridPreset) => void;
  gridWidth: number;
  setGridWidth: (w: number) => void;
  gridHeight: number;
  setGridHeight: (h: number) => void;
  loadGlyphPixelGrid: (u: number, w: number, h: number) => void;
  currentUnicode: number;
  dotShape: PixelDotShape;
  setDotShape: (s: PixelDotShape) => void;
  autoSaveGlyph: (g: Uint8Array, u?: number) => void;
  grid: Uint8Array;
  isLight: boolean;
  isMobile?: boolean;
  onReturnToCanvas?: () => void;
  showTrace?: boolean;
  setShowTrace?: (val: boolean) => void;
  traceSource?: 'font' | 'image';
  setTraceSource?: (src: 'font' | 'image') => void;
  traceChar?: string;
  setTraceChar?: (c: string) => void;
  traceFontFamily?: string;
  setTraceFontFamily?: (f: string) => void;
  traceImageSrc?: string | null;
  setTraceImageSrc?: (s: string | null) => void;
  traceOpacity?: number;
  setTraceOpacity?: (val: number) => void;
  traceScale?: number;
  setTraceScale?: (val: number) => void;
  traceOffsetX?: number;
  setTraceOffsetX?: React.Dispatch<React.SetStateAction<number>>;
  traceOffsetY?: number;
  setTraceOffsetY?: React.Dispatch<React.SetStateAction<number>>;
  traceThreshold?: number;
  setTraceThreshold?: (val: number) => void;
  handleAutoBinarizeTrace?: () => void;
  fileInputRef?: React.RefObject<HTMLInputElement | null>;
  traceImageRef?: React.MutableRefObject<HTMLImageElement | null>;
  showGridLines?: boolean;
  setShowGridLines?: (val: boolean) => void;
  showSubdivisions?: boolean;
  setShowSubdivisions?: (val: boolean) => void;
  symmetryH?: boolean;
  setSymmetryH?: (val: boolean) => void;
  symmetryV?: boolean;
  setSymmetryV?: (val: boolean) => void;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const PixelPresetsPanel: React.FC<PixelPresetsPanelProps> = ({
  preset,
  onPresetSelect,
  gridWidth,
  setGridWidth,
  gridHeight,
  setGridHeight,
  loadGlyphPixelGrid,
  currentUnicode,
  dotShape,
  setDotShape,
  autoSaveGlyph,
  grid,
  isLight,
  isMobile = false,
  onReturnToCanvas,
  showTrace = false,
  setShowTrace,
  traceSource = 'font',
  setTraceSource,
  traceChar = '',
  setTraceChar,
  traceFontFamily = 'sans-serif',
  setTraceFontFamily,
  traceImageSrc = null,
  setTraceImageSrc,
  traceOpacity = 35,
  setTraceOpacity,
  traceScale = 100,
  setTraceScale,
  traceOffsetX = 0,
  setTraceOffsetX,
  traceOffsetY = 0,
  setTraceOffsetY,
  traceThreshold = 128,
  setTraceThreshold,
  handleAutoBinarizeTrace,
  fileInputRef,
  traceImageRef,
  showGridLines = true,
  setShowGridLines,
  showSubdivisions = true,
  setShowSubdivisions,
  symmetryH = false,
  setSymmetryH,
  symmetryV = false,
  setSymmetryV,
  onShowToast,
}) => {
  if (isMobile) {
    return (
      <div
        className={`flex md:hidden flex-1 flex-col overflow-y-auto overflow-x-auto p-3 sm:p-4 pb-24 touch-pan-x touch-pan-y ${
          isLight ? 'bg-stone-50 text-stone-900' : 'bg-[#0c130f] text-emerald-100'
        }`}
      >
        <div className="w-full min-w-[320px] sm:min-w-[360px] max-w-2xl mx-auto space-y-3.5">
          {/* Top Quick Status & Return to Canvas Bar */}
          <div
            className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 shrink-0 ${
              isLight ? 'bg-white border-stone-200' : 'bg-[#142018] border-[#25382b]'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-mono font-extrabold text-xs text-emerald-700 dark:text-emerald-400 shrink-0">
                {gridWidth}×{gridHeight}
              </span>
              <span className="text-[11px] opacity-60 shrink-0">|</span>
              <span className="text-[11px] font-bold truncate">
                {dotShape === 'square'
                  ? '■ 正方形'
                  : dotShape === 'round'
                  ? '● 円形'
                  : dotShape === 'squircle'
                  ? '▢ 角丸'
                  : '◆ 菱形'}
              </span>
              <span className="text-[11px] opacity-60 shrink-0">|</span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${
                  showTrace
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-500'
                }`}
              >
                {showTrace ? '下絵ON' : '下絵OFF'}
              </span>
            </div>

            {onReturnToCanvas && (
              <button
                onClick={onReturnToCanvas}
                className="px-2.5 py-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-1 shrink-0 active:scale-95 transition-all cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>作図へ</span>
              </button>
            )}
          </div>

          {/* 1. Resolution Presets */}
          <div
            className={`p-3 rounded-xl border space-y-2.5 ${
              isLight ? 'bg-white border-stone-200 text-stone-900' : 'bg-[#142018] border-[#25382b] text-emerald-100'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-400">
              <span className="flex items-center gap-1.5">
                <Grid className="w-4 h-4 shrink-0" />
                <span>制作グリッド規格プリセット</span>
              </span>
              <span className="font-mono text-[11px] shrink-0 font-bold">
                現在: {gridWidth}×{gridHeight} ({gridWidth * gridHeight}px)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PRESET_SIZES.map((p) => {
                const isSelected = preset === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      onPresetSelect(p.id);
                      onShowToast(`解像度を ${p.label} に変更しました`, 'info');
                    }}
                    className={`p-2.5 border text-left flex flex-col justify-between min-h-[58px] rounded-xl transition-all active:scale-95 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-500 font-bold'
                        : isLight
                        ? 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-800'
                        : 'bg-[#18271e] hover:bg-[#203427] border-stone-800 text-emerald-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-xs sm:text-sm">{p.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                    </div>
                    <span className="text-[10px] opacity-75 truncate mt-1">{p.desc}</span>
                  </button>
                );
              })}
            </div>

            {/* Custom Resolution Controls */}
            {preset === 'custom' && (
              <div className="pt-2.5 border-t border-stone-200 dark:border-stone-800 space-y-2.5">
                <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  カスタム寸法指定 (幅 × 高さ)
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-[#101812] space-y-1">
                    <span className="text-[10.5px] font-bold opacity-70">幅 (Width):</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          const val = Math.max(3, gridWidth - 1);
                          setGridWidth(val);
                          loadGlyphPixelGrid(currentUnicode, val, gridHeight);
                        }}
                        className="w-7 h-7 flex items-center justify-center rounded bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-xs font-bold active:scale-95 cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        min="3"
                        max="128"
                        value={gridWidth}
                        onChange={(e) => {
                          const val = Math.max(3, Math.min(128, parseInt(e.target.value, 10) || 12));
                          setGridWidth(val);
                          loadGlyphPixelGrid(currentUnicode, val, gridHeight);
                        }}
                        className="flex-1 text-center font-mono font-bold text-xs py-1 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#18261f]"
                      />
                      <button
                        onClick={() => {
                          const val = Math.min(128, gridWidth + 1);
                          setGridWidth(val);
                          loadGlyphPixelGrid(currentUnicode, val, gridHeight);
                        }}
                        className="w-7 h-7 flex items-center justify-center rounded bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-xs font-bold active:scale-95 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="p-2 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-[#101812] space-y-1">
                    <span className="text-[10.5px] font-bold opacity-70">高さ (Height):</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          const val = Math.max(3, gridHeight - 1);
                          setGridHeight(val);
                          loadGlyphPixelGrid(currentUnicode, gridWidth, val);
                        }}
                        className="w-7 h-7 flex items-center justify-center rounded bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-xs font-bold active:scale-95 cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        min="3"
                        max="128"
                        value={gridHeight}
                        onChange={(e) => {
                          const val = Math.max(3, Math.min(128, parseInt(e.target.value, 10) || 12));
                          setGridHeight(val);
                          loadGlyphPixelGrid(currentUnicode, gridWidth, val);
                        }}
                        className="flex-1 text-center font-mono font-bold text-xs py-1 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#18261f]"
                      />
                      <button
                        onClick={() => {
                          const val = Math.min(128, gridHeight + 1);
                          setGridHeight(val);
                          loadGlyphPixelGrid(currentUnicode, gridWidth, val);
                        }}
                        className="w-7 h-7 flex items-center justify-center rounded bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-xs font-bold active:scale-95 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10.5px] opacity-70 font-bold mr-1">クイック正方形:</span>
                  {[8, 12, 16, 20, 24, 32, 48, 64].map((sz) => (
                    <button
                      key={sz}
                      onClick={() => {
                        setGridWidth(sz);
                        setGridHeight(sz);
                        loadGlyphPixelGrid(currentUnicode, sz, sz);
                      }}
                      className={`px-2 py-0.5 rounded text-[10.5px] font-mono font-bold border transition-colors cursor-pointer ${
                        gridWidth === sz && gridHeight === sz
                          ? 'bg-emerald-600 text-white border-emerald-500'
                          : 'bg-white dark:bg-[#18261f] border-stone-300 dark:border-stone-700 hover:bg-emerald-50 dark:hover:bg-emerald-950'
                      }`}
                    >
                      {sz}×{sz}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 2. Dot Shape */}
          <div
            className={`p-3 rounded-xl border space-y-2.5 ${
              isLight ? 'bg-white border-stone-200 text-stone-900' : 'bg-[#142018] border-[#25382b] text-emerald-100'
            }`}
          >
            <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
              ドット形状 (Pixel Dot Shape)
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'square', label: '正方形 (Classic)', icon: '■', desc: '標準的な矩形ドット' },
                { id: 'round', label: '円形 (LED Matrix)', icon: '●', desc: 'LED掲示板・丸ドット' },
                { id: 'squircle', label: '角丸 (Squircle)', icon: '▢', desc: '柔らかな角丸ドット' },
                { id: 'diamond', label: '菱形 (Diamond)', icon: '◆', desc: '幾何学・アーケード調' },
              ].map((shape) => (
                <button
                  key={shape.id}
                  onClick={() => {
                    setDotShape(shape.id as PixelDotShape);
                    autoSaveGlyph(grid, currentUnicode);
                    onShowToast(`ドット形状を「${shape.label}」に設定しました`, 'info');
                  }}
                  className={`p-2.5 border text-left rounded-xl transition-all active:scale-95 cursor-pointer ${
                    dotShape === shape.id
                      ? 'bg-emerald-600 text-white border-emerald-500 font-bold'
                      : isLight
                      ? 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-800'
                      : 'bg-[#18271e] hover:bg-[#203427] border-stone-800 text-emerald-200'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-base font-bold shrink-0">{shape.icon}</span>
                    <span className="font-bold text-xs truncate">{shape.label}</span>
                  </div>
                  <div className="text-[10px] opacity-75 mt-1 truncate">{shape.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Trace & Underlay Reference */}
          {setShowTrace && (
            <div
              className={`p-3 rounded-xl border space-y-3 ${
                isLight ? 'bg-white border-stone-200 text-stone-900' : 'bg-[#142018] border-[#25382b] text-emerald-100'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-400">
                <span className="flex items-center gap-1.5 min-w-0">
                  <ImageIcon className="w-4 h-4 shrink-0" />
                  <span className="truncate">下絵・トレース参照レイヤー</span>
                </span>
                <label className="flex items-center gap-1.5 cursor-pointer font-bold text-xs shrink-0 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <input
                    type="checkbox"
                    checked={showTrace}
                    onChange={(e) => setShowTrace(e.target.checked)}
                    className="accent-emerald-600 cursor-pointer w-4 h-4"
                  />
                  <span>下絵を表示</span>
                </label>
              </div>

              {setTraceSource && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setTraceSource('font')}
                    className={`flex-1 py-2 px-2 text-xs font-bold border rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                      traceSource === 'font'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : isLight
                        ? 'bg-stone-50 border-stone-300 hover:bg-stone-100 text-stone-700'
                        : 'bg-[#18261f] border-stone-700 hover:bg-[#203429] text-stone-300'
                    }`}
                  >
                    <Type className="w-3.5 h-3.5" />
                    <span>システム文字</span>
                  </button>
                  <button
                    onClick={() => {
                      setTraceSource('image');
                      fileInputRef?.current?.click();
                    }}
                    className={`flex-1 py-2 px-2 text-xs font-bold border rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                      traceSource === 'image'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : isLight
                        ? 'bg-stone-50 border-stone-300 hover:bg-stone-100 text-stone-700'
                        : 'bg-[#18261f] border-stone-700 hover:bg-[#203429] text-stone-300'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>画像ファイル読込</span>
                  </button>
                </div>
              )}

              {traceSource === 'font' ? (
                <div className="space-y-2 p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-[#101812]">
                  <span className="text-[11px] font-bold opacity-75">参照文字 & フォント書体:</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={traceChar}
                      onChange={(e) => setTraceChar?.(e.target.value)}
                      placeholder="文字"
                      className="w-14 text-center font-bold text-sm py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                    />
                    <select
                      value={traceFontFamily}
                      onChange={(e) => setTraceFontFamily?.(e.target.value)}
                      className="flex-1 text-xs py-1.5 px-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-medium"
                    >
                      <option value="sans-serif">ゴシック体 (Sans-serif)</option>
                      <option value="serif">明朝体 (Serif)</option>
                      <option value="monospace">等幅フォント (Monospace)</option>
                      <option value="cursive">筆記・手書き風 (Cursive)</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-[#101812] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold opacity-75">読み込み中の画像:</span>
                    <span
                      className={`text-[10.5px] font-bold px-2 py-0.5 rounded-md ${
                        traceImageSrc
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {traceImageSrc ? '画像セット済み' : '未選択'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => fileInputRef?.current?.click()}
                      className="flex-1 py-1.5 px-2.5 text-xs font-bold border border-emerald-600 bg-emerald-600 text-white rounded-lg flex items-center justify-center gap-1 active:scale-95 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>画像を変更・再選択</span>
                    </button>
                    {traceImageSrc && setTraceImageSrc && (
                      <button
                        onClick={() => {
                          setTraceImageSrc(null);
                          if (traceImageRef) traceImageRef.current = null;
                          onShowToast('下絵画像をクリアしました', 'info');
                        }}
                        className="px-2.5 py-1.5 text-xs font-bold border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg active:scale-95 cursor-pointer"
                      >
                        クリア
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Sliders */}
              {setTraceOpacity && setTraceScale && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold opacity-75">下絵の透明度:</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {traceOpacity}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={traceOpacity}
                      onChange={(e) => setTraceOpacity(parseInt(e.target.value, 10))}
                      className="w-full accent-emerald-600 cursor-pointer h-2"
                    />
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold opacity-75">下絵の拡大率:</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {traceScale}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="150"
                      value={traceScale}
                      onChange={(e) => setTraceScale(parseInt(e.target.value, 10))}
                      className="w-full accent-emerald-600 cursor-pointer h-2"
                    />
                  </div>
                </div>
              )}

              {/* Position Offset Controls */}
              {setTraceOffsetX && setTraceOffsetY && (
                <div className="p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-[#101812] space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold opacity-75">下絵位置の微調整 (X/Y):</span>
                    <span className="font-mono text-[11px]">
                      X: {traceOffsetX > 0 ? `+${traceOffsetX}` : traceOffsetX}, Y:{' '}
                      {traceOffsetY > 0 ? `+${traceOffsetY}` : traceOffsetY}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setTraceOffsetX((prev) => prev - 1)}
                        className="w-8 h-8 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 flex items-center justify-center font-bold text-xs active:scale-95 cursor-pointer"
                        title="左へ移動"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setTraceOffsetX((prev) => prev + 1)}
                        className="w-8 h-8 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 flex items-center justify-center font-bold text-xs active:scale-95 cursor-pointer"
                        title="右へ移動"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setTraceOffsetY((prev) => prev - 1)}
                        className="w-8 h-8 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 flex items-center justify-center font-bold text-xs active:scale-95 cursor-pointer"
                        title="上へ移動"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setTraceOffsetY((prev) => prev + 1)}
                        className="w-8 h-8 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 flex items-center justify-center font-bold text-xs active:scale-95 cursor-pointer"
                        title="下へ移動"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {(traceOffsetX !== 0 || traceOffsetY !== 0) && (
                      <button
                        onClick={() => {
                          setTraceOffsetX(0);
                          setTraceOffsetY(0);
                        }}
                        className="px-2 py-1 text-xs font-bold border border-stone-300 dark:border-stone-700 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-800 flex items-center gap-1 active:scale-95 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>中央揃え</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Binarization & Auto Convert */}
              {setTraceThreshold && handleAutoBinarizeTrace && (
                <div className="space-y-2 pt-1">
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold opacity-75">自動ドット化の抽出感度 (閾値):</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {traceThreshold} / 255
                      </span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="245"
                      value={traceThreshold}
                      onChange={(e) => setTraceThreshold(parseInt(e.target.value, 10))}
                      className="w-full accent-emerald-600 cursor-pointer h-2"
                    />
                  </div>

                  <button
                    onClick={() => {
                      handleAutoBinarizeTrace();
                      if (onReturnToCanvas) onReturnToCanvas();
                      onShowToast('下絵から自動ドット化して作図キャンバスに配置しました', 'success');
                    }}
                    className="w-full py-3 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl flex items-center justify-center space-x-2 active:scale-95 cursor-pointer border border-emerald-500 transition-all"
                  >
                    <Sparkles className="w-4 h-4 shrink-0" />
                    <span>下絵から自動ドット化してキャンバスへ</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 4. Canvas Visual Guides */}
          {setShowGridLines && setShowSubdivisions && setSymmetryH && setSymmetryV && (
            <div
              className={`p-3 rounded-xl border space-y-2.5 text-xs ${
                isLight ? 'bg-white border-stone-200 text-stone-900' : 'bg-[#142018] border-[#25382b] text-emerald-100'
              }`}
            >
              <div className="font-bold text-emerald-700 dark:text-emerald-400">
                ガイド線 & 対称描画設定
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center space-x-2 p-2 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-[#101812] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showGridLines}
                    onChange={(e) => setShowGridLines(e.target.checked)}
                    className="accent-emerald-600 cursor-pointer w-4 h-4"
                  />
                  <span className="font-bold text-xs">方眼グリッド線</span>
                </label>

                <label className="flex items-center space-x-2 p-2 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-[#101812] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showSubdivisions}
                    onChange={(e) => setShowSubdivisions(e.target.checked)}
                    className="accent-emerald-600 cursor-pointer w-4 h-4"
                  />
                  <span className="font-bold text-xs">中心分割線</span>
                </label>

                <label className="flex items-center space-x-2 p-2 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-[#101812] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={symmetryH}
                    onChange={(e) => setSymmetryH(e.target.checked)}
                    className="accent-emerald-600 cursor-pointer w-4 h-4"
                  />
                  <span className="font-bold text-xs">左右対称描画</span>
                </label>

                <label className="flex items-center space-x-2 p-2 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-[#101812] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={symmetryV}
                    onChange={(e) => setSymmetryV(e.target.checked)}
                    className="accent-emerald-600 cursor-pointer w-4 h-4"
                  />
                  <span className="font-bold text-xs">上下対称描画</span>
                </label>
              </div>
            </div>
          )}

          {/* 5. Bottom Return Button */}
          {onReturnToCanvas && (
            <button
              onClick={onReturnToCanvas}
              className="w-full py-3 bg-stone-800 hover:bg-stone-900 text-white dark:bg-stone-700 dark:hover:bg-stone-600 font-bold text-xs rounded-xl flex items-center justify-center space-x-2 active:scale-95 transition-all cursor-pointer"
            >
              <Pencil className="w-4 h-4" />
              <span>作図キャンバスに戻る</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Desktop Resolution Preset Bar
  return (
    <div
      className={`hidden md:flex items-center justify-between px-3 sm:px-4 py-1.5 border-b text-xs overflow-x-auto no-scrollbar gap-2 shrink-0 ${
        isLight ? 'bg-stone-50 border-stone-300' : 'bg-[#101913] border-[#294232]'
      }`}
    >
      <div className="flex items-center gap-1 shrink-0">
        <span className="font-bold text-[11px] opacity-70 mr-1 flex items-center gap-1">
          <Grid className="w-3.5 h-3.5 text-emerald-600" />
          <span>制作グリッド規格:</span>
        </span>
        {PRESET_SIZES.map((p) => {
          const isSelected = preset === p.id;
          return (
            <button
              key={p.id}
              onClick={() => onPresetSelect(p.id)}
              className={`px-2 py-0.5 font-mono font-bold text-xs border transition-all flex items-center space-x-1 cursor-pointer ${
                isSelected
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : isLight
                  ? 'bg-white text-stone-700 hover:bg-stone-100 border-stone-300'
                  : 'bg-[#142018] text-emerald-200 hover:bg-[#1c2c22] border-stone-800'
              }`}
              title={`${p.label} - ${p.desc}`}
            >
              <span>{p.label}</span>
            </button>
          );
        })}
      </div>

      {preset === 'custom' && (
        <div className="flex items-center gap-1.5 bg-white dark:bg-[#142018] px-2 py-0.5 border border-stone-300 dark:border-stone-800 shrink-0">
          <span className="font-bold text-[10px] opacity-70">W:</span>
          <input
            type="number"
            min="3"
            max="128"
            value={gridWidth}
            onChange={(e) => {
              const val = Math.max(3, Math.min(128, parseInt(e.target.value, 10) || 12));
              setGridWidth(val);
              loadGlyphPixelGrid(currentUnicode, val, gridHeight);
            }}
            className="w-10 text-center font-mono font-bold text-xs bg-transparent border-b border-emerald-500 focus:outline-hidden"
          />
          <span className="font-bold text-[10px] opacity-70">× H:</span>
          <input
            type="number"
            min="3"
            max="128"
            value={gridHeight}
            onChange={(e) => {
              const val = Math.max(3, Math.min(128, parseInt(e.target.value, 10) || 12));
              setGridHeight(val);
              loadGlyphPixelGrid(currentUnicode, gridWidth, val);
            }}
            className="w-10 text-center font-mono font-bold text-xs bg-transparent border-b border-emerald-500 focus:outline-hidden"
          />
        </div>
      )}

      {/* Dot Shape Selector */}
      <div className="flex items-center gap-1 shrink-0 ml-auto">
        <span className="font-bold text-[11px] opacity-70 mr-1">ドット形状:</span>
        {[
          { id: 'square', label: '正方形', icon: '■' },
          { id: 'round', label: '円形(LED)', icon: '●' },
          { id: 'squircle', label: '角丸', icon: '▢' },
          { id: 'diamond', label: '菱形', icon: '◆' },
        ].map((shape) => (
          <button
            key={shape.id}
            onClick={() => {
              setDotShape(shape.id as PixelDotShape);
              autoSaveGlyph(grid, currentUnicode);
            }}
            className={`px-1.5 py-0.5 text-[11px] font-bold border transition-colors cursor-pointer ${
              dotShape === shape.id
                ? 'bg-emerald-600 text-white border-emerald-600'
                : isLight
                ? 'bg-white border-stone-300 text-stone-700 hover:bg-stone-100'
                : 'bg-[#142018] border-stone-800 text-emerald-200 hover:bg-[#1a2920]'
            }`}
          >
            <span>{shape.icon}</span>
            <span className="ml-1 hidden md:inline">{shape.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
