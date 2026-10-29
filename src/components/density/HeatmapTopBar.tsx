import React from 'react';
import { Sliders, RotateCcw, Zap, Sparkles } from 'lucide-react';

export interface HeatmapTopBarProps {
  isLight: boolean;
  tolerance: number;
  setTolerance: React.Dispatch<React.SetStateAction<number>>;
  undoStackLength: number;
  handleUndo: () => void;
  handleSimplifyAllDense: () => void;
  handleSafeOptimizeAll: () => void;
}

export const HeatmapTopBar: React.FC<HeatmapTopBarProps> = React.memo(({
  isLight,
  tolerance,
  setTolerance,
  undoStackLength,
  handleUndo,
  handleSimplifyAllDense,
  handleSafeOptimizeAll,
}) => {
  return (
    <div
      className={`px-5 py-2.5 border-b flex flex-wrap items-center justify-between gap-3 text-xs ${
        isLight ? 'bg-amber-50/50 border-stone-200' : 'bg-[#121c15] border-[#223528]'
      }`}
    >
      {/* Tolerance controls */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-bold flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
          <Sliders className="w-3.5 h-3.5" />
          <span>単純化強度 (Tolerance):</span>
        </span>

        {/* Presets */}
        <div className="flex items-center space-x-1 bg-stone-200/60 dark:bg-[#18281d] p-0.5 rounded-lg">
          <button
            onClick={() => setTolerance(2.0)}
            className={`px-2 py-1 rounded text-[11px] font-semibold transition-all ${
              tolerance === 2.0
                ? isLight
                  ? 'bg-white text-emerald-800 '
                  : 'bg-emerald-700 text-white '
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
            title="微細（2.0px）: 形状の変化を抑えつつ、近接した不要ノードを間引きます"
          >
            微細 (2.0)
          </button>
          <button
            onClick={() => setTolerance(3.5)}
            className={`px-2 py-1 rounded text-[11px] font-semibold transition-all ${
              tolerance === 3.5
                ? isLight
                  ? 'bg-white text-emerald-800 '
                  : 'bg-emerald-700 text-white '
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
            title="標準（3.5px）: ノード数を削減し曲線を整えます"
          >
            標準 (3.5)
          </button>
          <button
            onClick={() => setTolerance(6.0)}
            className={`px-2 py-1 rounded text-[11px] font-semibold transition-all ${
              tolerance === 6.0
                ? isLight
                  ? 'bg-white text-emerald-800 '
                  : 'bg-emerald-700 text-white '
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
            title="強力（6.0px）: ノード数を削減し、幾何ベジェにします"
          >
            強力 (6.0)
          </button>
        </div>

        {/* Slider */}
        <div className="flex items-center space-x-2">
          <input
            type="range"
            min="1.0"
            max="8.0"
            step="0.5"
            value={tolerance}
            onChange={(e) => setTolerance(parseFloat(e.target.value))}
            className="w-24 sm:w-32 accent-amber-500 cursor-pointer h-1.5 rounded-lg bg-stone-300 dark:bg-stone-700"
          />
          <span className="font-mono font-bold text-amber-600 dark:text-amber-300 min-w-8">
            {tolerance.toFixed(1)}px
          </span>
        </div>
      </div>

      {/* Quick Execution & Undo Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        {undoStackLength > 0 && (
          <button
            onClick={handleUndo}
            className={`px-2.5 py-1.5 rounded-lg font-bold text-xs flex items-center space-x-1 border transition-colors ${
              isLight
                ? 'bg-white border-stone-300 text-stone-700 hover:bg-stone-100'
                : 'bg-[#1a271f] border-[#293d2e] text-stone-200 hover:bg-[#223528]'
            }`}
            title="直前の単純化を取り消す"
          >
            <RotateCcw className="w-3.5 h-3.5 text-stone-500" />
            <span>元に戻す ({undoStackLength})</span>
          </button>
        )}

        <button
          onClick={handleSimplifyAllDense}
          className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center space-x-1.5 border transition-colors ${
            isLight
              ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-700'
              : 'bg-amber-600 hover:bg-amber-500 text-white border-amber-500'
          }`}
          title="過密・密集と判定された全輪郭を一括で即時単純化します"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>過密輪郭を一括単純化</span>
        </button>

        <button
          onClick={handleSafeOptimizeAll}
          className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center space-x-1.5 border transition-colors ${
            isLight
              ? 'bg-emerald-700 hover:bg-emerald-800 text-white border-emerald-800'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500'
          }`}
          title="文字の形・角・筆先を保護しながら全体を安全に最適化します"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>文字全体を安全最適化</span>
        </button>
      </div>
    </div>
  );
});

HeatmapTopBar.displayName = 'HeatmapTopBar';
