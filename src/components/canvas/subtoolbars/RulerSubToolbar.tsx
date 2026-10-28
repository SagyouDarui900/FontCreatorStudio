import React from 'react';
import { Ruler, PenTool, Trash2, Eraser } from 'lucide-react';
import { RulerMeasurement, CustomGuideline } from '../../../types';

interface RulerSubToolbarProps {
  rulerMeasurement: RulerMeasurement | null;
  handleDrawRulerAsStroke: () => void;
  handleConvertRulerToGuideline: (mode?: 'auto' | 'diagonal' | 'h' | 'v') => void;
  setRulerMeasurement: (r: RulerMeasurement | null) => void;
  customGuidelines: CustomGuideline[];
  isGuideEraserActive: boolean;
  setIsGuideEraserActive: React.Dispatch<React.SetStateAction<boolean>>;
  handleClearAllGuidelines: () => void;
}

export const RulerSubToolbar: React.FC<RulerSubToolbarProps> = ({
  rulerMeasurement,
  handleDrawRulerAsStroke,
  handleConvertRulerToGuideline,
  setRulerMeasurement,
  customGuidelines,
  isGuideEraserActive,
  setIsGuideEraserActive,
  handleClearAllGuidelines,
}) => {
  return (
    <div className="flex items-center space-x-2 ml-1 pl-1.5 border-l border-stone-200 dark:border-stone-700 flex-wrap gap-y-1">
      <div className="flex items-center space-x-1.5 text-xs">
        <div className="flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-200 font-medium text-[11px]">
          <Ruler className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
          <span>定規・寸法計測</span>
        </div>

        {rulerMeasurement && !rulerMeasurement.active ? (
          <div className="flex items-center space-x-1.5">
            <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-900/60 text-sky-900 dark:text-sky-100 border border-sky-300 dark:border-sky-700">
              {Math.round(Math.hypot(rulerMeasurement.end.x - rulerMeasurement.start.x, rulerMeasurement.end.y - rulerMeasurement.start.y))}px
            </span>
            <span className="font-mono text-[10px] text-stone-500 dark:text-stone-400 hidden sm:inline">
              ({Math.round(((Math.atan2(-(rulerMeasurement.end.y - rulerMeasurement.start.y), rulerMeasurement.end.x - rulerMeasurement.start.x) * 180 / Math.PI) % 360 + 360) % 360)}°)
            </span>

            {/* Diagonal Guide Button */}
            <button
              type="button"
              onClick={() => handleConvertRulerToGuideline('diagonal')}
              className="px-2 py-0.5 rounded text-[11px] font-bold bg-cyan-600 hover:bg-cyan-700 text-white transition-colors flex items-center space-x-1 cursor-pointer shadow-xs"
              title="定規の角度のまま斜めガイド線を作成"
            >
              <span>斜めガイド化</span>
            </button>

            {/* Orthogonal Guide Button */}
            <button
              type="button"
              onClick={() => handleConvertRulerToGuideline('auto')}
              className="px-2 py-0.5 rounded text-[11px] font-bold bg-sky-600 hover:bg-sky-700 text-white transition-colors flex items-center space-x-1 cursor-pointer shadow-xs"
              title="水平または垂直ガイド線を作成"
            >
              <span>直交ガイド化</span>
            </button>

            <button
              type="button"
              onClick={handleDrawRulerAsStroke}
              className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center space-x-1 cursor-pointer shadow-xs"
              title="計測ラインを直線ストロークとして作図 (Enter)"
            >
              <PenTool className="w-3 h-3" />
              <span>直線化 (Enter)</span>
            </button>

            <button
              type="button"
              onClick={() => setRulerMeasurement(null)}
              className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-800 transition-colors cursor-pointer flex items-center gap-1"
              title="選んだ定規の計測表示を消去 (Esc/Delete)"
            >
              <Trash2 className="w-3 h-3" />
              <span className="hidden sm:inline">定規消去</span>
            </button>
          </div>
        ) : (
          <span className="text-[11px] text-stone-500 dark:text-stone-400 hidden sm:inline">
            2点をドラッグして計測 (Shiftで15°刻みスナップ)
          </span>
        )}

        {/* Guide Eraser Tool Mode Toggle & Clear All */}
        <div className="flex items-center space-x-1 pl-1.5 border-l border-stone-200 dark:border-stone-700">
          <button
            type="button"
            onClick={() => setIsGuideEraserActive((prev) => !prev)}
            className={`px-2 py-0.5 rounded text-[11px] font-bold flex items-center space-x-1 cursor-pointer transition-colors shadow-xs ${
              isGuideEraserActive
                ? 'bg-rose-600 text-white ring-2 ring-rose-400 animate-pulse'
                : 'bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 border border-stone-300 dark:border-stone-600'
            }`}
            title="ガイド線消去モード: ガイド線をクリックで即削除"
          >
            <Eraser className="w-3 h-3" />
            <span>{isGuideEraserActive ? '消去モード作動中' : 'ガイド消去モード'}</span>
          </button>

          {customGuidelines.length > 0 && (
            <button
              type="button"
              onClick={handleClearAllGuidelines}
              className="px-1.5 py-0.5 rounded text-[10px] text-stone-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
              title={`すべてのガイド線を消去 (現在: ${customGuidelines.length}本)`}
            >
              全消去 ({customGuidelines.length})
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
