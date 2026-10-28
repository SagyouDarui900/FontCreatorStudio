import React from 'react';
import { Trash2 } from 'lucide-react';

interface EraserSubToolbarProps {
  eraserMode: 'stroke' | 'cut' | 'all' | 'node';
  setEraserMode: (mode: 'stroke' | 'cut' | 'all' | 'node') => void;
  eraserSize: number;
  setEraserSize: React.Dispatch<React.SetStateAction<number>>;
  handleClearAll: () => void;
}

export const EraserSubToolbar: React.FC<EraserSubToolbarProps> = ({
  eraserMode,
  setEraserMode,
  eraserSize,
  setEraserSize,
  handleClearAll,
}) => {
  return (
    <div className="flex items-center space-x-2 ml-1 pl-1.5 border-l border-stone-200 dark:border-stone-700">
      {/* Eraser Mode Buttons */}
      <div className="flex items-center bg-stone-100 dark:bg-stone-800 p-0.5 rounded-lg border border-stone-300/80 dark:border-stone-700">
        <button
          type="button"
          onClick={() => setEraserMode('stroke')}
          className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
            eraserMode === 'stroke'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
          }`}
          title="触れた線・パーツを消去 (標準消しゴム)"
        >
          消しゴム
        </button>
        <button
          type="button"
          onClick={() => setEraserMode('cut')}
          className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
            eraserMode === 'cut'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
          }`}
          title="なぞった位置のパスを削り取り・分割"
        >
          部分削り
        </button>
        <button
          type="button"
          onClick={() => setEraserMode('node')}
          className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
            eraserMode === 'node'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
          }`}
          title="消しゴム円内の頂点（アンカーポイント）のみ消去"
        >
          アンカー消去
        </button>
      </div>

      {/* Size Controls */}
      <div className="flex items-center space-x-0.5 bg-stone-100 dark:bg-stone-800 p-0.5 rounded border border-stone-300 dark:border-stone-700">
        <button
          type="button"
          onClick={() => {
            setEraserSize((prev) => Math.max(8, prev - 6));
          }}
          className="w-5 h-5 flex items-center justify-center font-bold text-xs rounded hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 cursor-pointer"
          title="消しゴムを小さく ([ キー)"
        >
          -
        </button>
        <span className="font-mono font-bold text-xs px-1 text-rose-700 dark:text-rose-300 w-10 text-center shrink-0">
          {eraserSize}px
        </span>
        <button
          type="button"
          onClick={() => {
            setEraserSize((prev) => Math.min(160, prev + 6));
          }}
          className="w-5 h-5 flex items-center justify-center font-bold text-xs rounded hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 cursor-pointer"
          title="消しゴムを大きく (] キー)"
        >
          +
        </button>
      </div>

      {/* Quick Presets */}
      <div className="hidden lg:flex items-center space-x-1">
        {[16, 32, 60, 96, 140].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setEraserSize(s);
            }}
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono transition-colors cursor-pointer ${
              eraserSize === s
                ? 'bg-rose-600 text-white'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-rose-100 dark:hover:bg-rose-950'
            }`}
          >
            {s}px
          </button>
        ))}
      </div>

      {/* Clear All Contours button */}
      <button
        type="button"
        onClick={handleClearAll}
        className="px-2.5 py-1 rounded-lg text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 dark:hover:text-white transition-colors flex items-center space-x-1 ml-1 cursor-pointer"
        title="この文字のすべての輪郭を一括消去 (Ctrl+Zで取り消し可能)"
      >
        <Trash2 className="w-3.5 h-3.5" />
        <span>文字を全クリア</span>
      </button>
    </div>
  );
};
