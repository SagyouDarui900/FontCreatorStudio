import {
  Sliders,
  CornerDownLeft,
  RotateCcw,
  X,
} from 'lucide-react';
import { PathContour } from '../../../types';

interface PenSubToolbarProps {
  penMode?: 'bezier' | 'corner';
  setPenMode?: (mode: 'bezier' | 'corner') => void;
  penStrokeWidth: number;
  handleSetPenStrokeWidth: (w: number) => void;
  penCapStyle: 'round' | 'butt' | 'square';
  handleSetPenCapStyle: (cap: 'round' | 'butt' | 'square') => void;
  onOpenPenPresetsModal?: () => void;
  activePenContour?: PathContour | null;
  handleFinishPenContour?: (closed: boolean) => void;
  handleUndoPenNode?: () => void;
  handleResetPenContour?: () => void;
}

export const PenSubToolbar: React.FC<PenSubToolbarProps> = ({
  penMode = 'bezier',
  setPenMode,
  penStrokeWidth,
  handleSetPenStrokeWidth,
  penCapStyle,
  handleSetPenCapStyle,
  onOpenPenPresetsModal,
  activePenContour,
  handleFinishPenContour,
  handleUndoPenNode,
  handleResetPenContour,
}) => {
  const hasActiveNodes = Boolean(activePenContour && activePenContour.nodes.length > 0);

  return (
    <div className="flex items-center gap-1.5 ml-1 pl-1.5 border-l border-stone-200 dark:border-stone-700 shrink-0">
      {/* Pen Mode Selector: Bezier Curve vs Straight Corner */}
      {setPenMode && (
        <div className="flex items-center bg-stone-100 dark:bg-stone-800 p-0.5 rounded border border-stone-200 dark:border-stone-700 text-[10px] shrink-0">
          <button
            type="button"
            onClick={() => setPenMode('bezier')}
            className={`px-1.5 py-0.5 rounded font-bold transition-colors cursor-pointer whitespace-nowrap ${
              penMode === 'bezier'
                ? 'bg-emerald-600 text-white'
                : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
            }`}
            title="クリックで角、ドラッグで滑らかなベジェ曲線ハンドルを作成"
          >
            曲線(ベジェ)
          </button>
          <button
            type="button"
            onClick={() => setPenMode('corner')}
            className={`px-1.5 py-0.5 rounded font-bold transition-colors cursor-pointer whitespace-nowrap ${
              penMode === 'corner'
                ? 'bg-emerald-600 text-white'
                : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
            }`}
            title="常に直線・角頂点として配置（多角形・ゴシック骨格向け）"
          >
            直線(角)
          </button>
        </div>
      )}

      {/* In-Progress Pen Action Controls (Compact Inline Toolbar) */}
      {hasActiveNodes && (
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30">
          <span className="text-[10px] font-mono tabular-nums font-bold text-emerald-700 dark:text-emerald-300 px-1 py-0.5 rounded bg-emerald-500/20 whitespace-nowrap">
            {activePenContour!.nodes.length}点
          </span>

          {/* ↵ 閉じて塗り確定 (if >= 3 points) */}
          {activePenContour!.nodes.length >= 3 && (
            <button
              type="button"
              onClick={() => handleFinishPenContour?.(true)}
              className="px-2 py-0.5 text-xs font-bold rounded bg-emerald-700 hover:bg-emerald-600 text-white transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
              title="始点につないで閉じた塗り輪郭（フォント用アウトライン）として確定"
            >
              <CornerDownLeft className="w-3.5 h-3.5" />
              <span>閉じて確定</span>
            </button>
          )}

          {/* ↵ 開いた線として確定 */}
          <button
            type="button"
            onClick={() => handleFinishPenContour?.(false)}
            disabled={activePenContour!.nodes.length < 2}
            className="px-2 py-0.5 text-xs font-semibold rounded bg-sky-600 hover:bg-sky-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
            title={`現在の開いたパスを太さ ${penStrokeWidth}px の線として確定`}
          >
            <span>線で確定({penStrokeWidth}px)</span>
          </button>

          {/* ⌫ 1点戻す */}
          <button
            type="button"
            onClick={handleUndoPenNode}
            className="px-2 py-0.5 text-xs font-medium rounded bg-stone-200 hover:bg-stone-300 dark:bg-stone-700 dark:hover:bg-stone-600 text-stone-800 dark:text-stone-200 transition-colors cursor-pointer flex items-center gap-1"
            title="直前の1点を削除 (Backspace / Delete)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>1点戻す</span>
          </button>

          {/* ✕ 破棄 */}
          <button
            type="button"
            onClick={handleResetPenContour}
            className="px-2 py-0.5 text-xs font-medium rounded hover:bg-rose-100 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer flex items-center gap-0.5"
            title="現在描いているパスを破棄 (Escape)"
          >
            <X className="w-3.5 h-3.5" />
            <span>破棄</span>
          </button>
        </div>
      )}
      {/* Pen Stroke Width Controls */}
      <div className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-stone-100/90 dark:bg-stone-800/90 border border-stone-200 dark:border-stone-700">
        <span className="text-[10px] font-semibold text-stone-500 dark:text-stone-400 whitespace-nowrap hidden sm:inline" title="開いた線（オープンパス）を確定した際のアウトライン展開太さ">
          線幅:
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
            className="w-10 h-5 text-center text-xs font-mono tabular-nums font-bold bg-white dark:bg-stone-700 rounded border border-stone-300 dark:border-stone-600 text-stone-900 dark:text-stone-100 focus:outline-emerald-500"
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
          className="text-[10px] font-mono tabular-nums font-bold px-1 py-0.5 bg-white dark:bg-stone-700 rounded border border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-200 cursor-pointer outline-none ml-0.5"
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
          className="p-1 rounded text-xs font-bold flex items-center bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 border border-stone-300 dark:border-stone-700 transition-colors cursor-pointer"
          title="ペン作成・ブラシカスタマイズスタジオを開く"
        >
          <Sliders className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
