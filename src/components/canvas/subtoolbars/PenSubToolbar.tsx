import React from 'react';
import {
  Spline,
  Square,
  Sliders,
} from 'lucide-react';

interface PenSubToolbarProps {
  penMode: 'bezier' | 'corner';
  setPenMode: (mode: 'bezier' | 'corner') => void;
  penStrokeWidth: number;
  handleSetPenStrokeWidth: (w: number) => void;
  penCapStyle: 'round' | 'butt' | 'square';
  handleSetPenCapStyle: (cap: 'round' | 'butt' | 'square') => void;
  onOpenPenPresetsModal?: () => void;
}

export const PenSubToolbar: React.FC<PenSubToolbarProps> = ({
  penMode,
  setPenMode,
  penStrokeWidth,
  handleSetPenStrokeWidth,
  penCapStyle,
  handleSetPenCapStyle,
  onOpenPenPresetsModal,
}) => {
  return (
    <div className="flex items-center gap-1 ml-1 pl-1.5 border-l border-stone-200 dark:border-stone-700 shrink-0">
      {/* Curve / Corner Toggle */}
      <div className="flex items-center bg-stone-100 dark:bg-stone-800 p-0.5 rounded-lg border border-stone-200 dark:border-stone-700">
        <button
          type="button"
          onClick={() => setPenMode('bezier')}
          className={`px-1.5 py-0.5 rounded text-xs font-bold flex items-center space-x-1 transition-colors cursor-pointer ${
            penMode === 'bezier'
              ? 'bg-emerald-700 text-white'
              : 'text-stone-600 dark:text-stone-300 hover:text-stone-900'
          }`}
          title="ベジェ曲線モード (滑らかな曲線を描画)"
        >
          <Spline className="w-3 h-3" />
          <span className="hidden xs:inline">曲線</span>
        </button>
        <button
          type="button"
          onClick={() => setPenMode('corner')}
          className={`px-1.5 py-0.5 rounded text-xs font-bold flex items-center space-x-1 transition-colors cursor-pointer ${
            penMode === 'corner'
              ? 'bg-emerald-700 text-white'
              : 'text-stone-600 dark:text-stone-300 hover:text-stone-900'
          }`}
          title="折れ線モード (直線的な角を描画)"
        >
          <Square className="w-3 h-3" />
          <span className="hidden xs:inline">折線</span>
        </button>
      </div>

      {/* Pen Stroke Width Controls */}
      <div className="flex items-center space-x-1 px-1.5 py-0.5 rounded-lg bg-stone-100/90 dark:bg-stone-800/90 border border-stone-200 dark:border-stone-700">
        <span className="text-[10px] font-semibold text-stone-500 dark:text-stone-400 whitespace-nowrap hidden sm:inline">
          太さ:
        </span>

        {/* Stepper Down */}
        <button
          type="button"
          onClick={() => handleSetPenStrokeWidth(penStrokeWidth - (penStrokeWidth > 20 ? 5 : 2))}
          disabled={penStrokeWidth <= 2}
          className="w-5 h-5 rounded bg-white dark:bg-stone-700 text-stone-700 dark:text-stone-200 font-bold text-xs flex items-center justify-center hover:bg-stone-200 dark:hover:bg-stone-600 disabled:opacity-30 transition-colors cursor-pointer"
          title="線の太さを減らす (-5px)"
        >
          -
        </button>

        {/* Input / display */}
        <div className="flex items-center">
          <input
            type="number"
            min={2}
            max={300}
            value={penStrokeWidth}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val)) handleSetPenStrokeWidth(val);
            }}
            className="w-10 h-5 text-center text-xs font-mono font-bold bg-white dark:bg-stone-700 rounded border border-stone-300 dark:border-stone-600 text-stone-900 dark:text-stone-100 focus:outline-emerald-500"
          />
          <span className="text-[9px] text-stone-400 font-mono ml-0.5">px</span>
        </div>

        {/* Stepper Up */}
        <button
          type="button"
          onClick={() => handleSetPenStrokeWidth(penStrokeWidth + (penStrokeWidth >= 20 ? 5 : 2))}
          disabled={penStrokeWidth >= 300}
          className="w-5 h-5 rounded bg-white dark:bg-stone-700 text-stone-700 dark:text-stone-200 font-bold text-xs flex items-center justify-center hover:bg-stone-200 dark:hover:bg-stone-600 disabled:opacity-30 transition-colors cursor-pointer"
          title="線の太さを増やす (+5px)"
        >
          +
        </button>

        {/* Quick Preset Dropdown */}
        <select
          value={[15, 30, 45, 60, 80].includes(penStrokeWidth) ? penStrokeWidth : ''}
          onChange={(e) => {
            const w = parseInt(e.target.value, 10);
            if (!isNaN(w)) handleSetPenStrokeWidth(w);
          }}
          className="text-[10px] font-mono font-bold px-1 py-0.5 bg-white dark:bg-stone-700 rounded border border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-200 cursor-pointer outline-none ml-0.5"
          title="太さプリセット選択"
        >
          <option value="" disabled hidden>プリセット</option>
          {[15, 30, 45, 60, 80].map((w) => (
            <option key={w} value={w}>{w}px</option>
          ))}
        </select>

        {/* Single Cyclic Cap Style Toggle Button */}
        <button
          type="button"
          onClick={() => {
            const next = penCapStyle === 'round' ? 'butt' : penCapStyle === 'butt' ? 'square' : 'round';
            handleSetPenCapStyle(next);
          }}
          className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-800 hover:bg-sky-200 transition-colors cursor-pointer flex items-center gap-0.5"
          title={`端点の形状: 現在「${penCapStyle === 'round' ? '丸 (Round)' : penCapStyle === 'butt' ? '平 (Butt)' : '角 (Square)'}」（クリックで切替）`}
        >
          <span>端:</span>
          <span>{penCapStyle === 'round' ? '丸' : penCapStyle === 'butt' ? '平' : '角'}</span>
        </button>
      </div>

      {/* Studio Launch Icon Button */}
      {onOpenPenPresetsModal && (
        <button
          type="button"
          onClick={onOpenPenPresetsModal}
          className="p-1.5 rounded-lg text-xs font-bold flex items-center bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 border border-stone-300 dark:border-stone-700 transition-colors cursor-pointer"
          title="ペン作成・ブラシカスタマイズスタジオを開く"
        >
          <Sliders className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
