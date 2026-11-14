import React from 'react';
import {
  Italic,
  FlipHorizontal,
  FlipVertical,
  Maximize2,
  Minimize2,
  AlignCenter,
  Wand2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Layers,
} from 'lucide-react';
import { PathContour, ThemeClasses } from '../../types';

export interface TransformSectionProps {
  contours: PathContour[];
  upm: number;
  selectedChar: string;
  isExpanded: boolean;
  onToggle: () => void;
  isOutlineExpanded: boolean;
  onToggleOutline: () => void;
  strokeOutlineWidth: number;
  setStrokeOutlineWidth: (w: number) => void;
  onOutlineStrokePaths: () => void;
  onFlipH: () => void;
  onFlipV: () => void;
  onSlant: (degrees: number) => void;
  onScale: (factor: number) => void;
  onAspectScale: (scaleX: number, scaleY: number) => void;
  onSmoothAndFix: () => void;
  onCenter: () => void;
  onFitToEmBox: () => void;
  onConvertToSmallKana: () => void;
  isConfirmingClear: boolean;
  setIsConfirmingClear: (v: boolean) => void;
  onExecuteClear: () => void;
  isLight: boolean;
  themeClasses: ThemeClasses;
}

export const TransformSection: React.FC<TransformSectionProps> = ({
  contours,
  upm,
  isExpanded,
  onToggle,
  isOutlineExpanded,
  onToggleOutline,
  strokeOutlineWidth,
  setStrokeOutlineWidth,
  onOutlineStrokePaths,
  onFlipH,
  onFlipV,
  onSlant,
  onScale,
  onAspectScale,
  onSmoothAndFix,
  onCenter,
  onFitToEmBox,
  onConvertToSmallKana,
  isConfirmingClear,
  setIsConfirmingClear,
  onExecuteClear,
  isLight,
  themeClasses,
}) => {
  return (
    <>
      {/* 5. Transform Tools (Slant, Flip, Scale, Center) */}
      <div
        className={`flex flex-col rounded-xl border overflow-hidden transition-colors ${themeClasses.cardBg} ${themeClasses.border} shadow-xs`}
      >
        <div
          onClick={onToggle}
          className={`flex items-center justify-between p-2.5 cursor-pointer transition-colors ${themeClasses.activeToolHover}`}
        >
          <span className={`text-xs font-bold uppercase tracking-wider ${themeClasses.textPrimary}`}>
            傾斜・変形・配置
          </span>
          <div className="p-0.5 text-stone-400">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>

        {isExpanded && (
          <div className={`p-3 pt-0 space-y-2.5 border-t ${themeClasses.border}`}>
            {/* Slant Quick Presets */}
            <div
              className={`p-2.5 rounded-lg border space-y-1.5 mt-2 ${themeClasses.toolbarBg} ${themeClasses.border}`}
            >
              <div className={`flex items-center space-x-1 text-xs font-bold ${themeClasses.accentText}`}>
                <Italic className="w-4 h-4 shrink-0" />
                <span>傾斜 (Slant / イタリック)</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[-15, -10, -5, 5, 10, 12, 15, 20].map((deg) => (
                  <button
                    key={deg}
                    type="button"
                    onClick={() => onSlant(deg)}
                    className={`min-h-[34px] py-1 rounded-md text-xs font-mono font-bold border transition-colors cursor-pointer active:scale-95 ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.activeToolHover}`}
                  >
                    {deg > 0 ? `+${deg}°` : `${deg}°`}
                  </button>
                ))}
              </div>
            </div>

            {/* Flip & Scale Grid */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onFlipH}
                className={`min-h-[42px] px-3 py-2 rounded-lg border text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer active:scale-95 ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.activeToolHover}`}
              >
                <FlipHorizontal className="w-4 h-4 shrink-0" />
                <span>左右反転</span>
              </button>

              <button
                type="button"
                onClick={onFlipV}
                className={`min-h-[42px] px-3 py-2 rounded-lg border text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer active:scale-95 ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.activeToolHover}`}
              >
                <FlipVertical className="w-4 h-4 shrink-0" />
                <span>上下反転</span>
              </button>

              <button
                type="button"
                onClick={() => onScale(1.1)}
                className={`min-h-[42px] px-3 py-2 rounded-lg border text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer active:scale-95 ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.activeToolHover}`}
              >
                <Maximize2 className="w-4 h-4 shrink-0" />
                <span>拡大 +10%</span>
              </button>

              <button
                type="button"
                onClick={() => onScale(0.9)}
                className={`min-h-[42px] px-3 py-2 rounded-lg border text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer active:scale-95 ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.activeToolHover}`}
              >
                <Minimize2 className="w-4 h-4 shrink-0" />
                <span>縮小 -10%</span>
              </button>

              <button
                type="button"
                onClick={() => onAspectScale(0.85, 1.0)}
                className={`min-h-[38px] px-2.5 py-1.5 rounded-lg border text-xs font-bold flex items-center justify-center space-x-1 transition-colors cursor-pointer active:scale-95 ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.activeToolHover}`}
                title="横幅をスリム化して縦長の長体に変換 (X:85%)"
              >
                <span>長体 (横縮小)</span>
              </button>

              <button
                type="button"
                onClick={() => onAspectScale(1.15, 0.85)}
                className={`min-h-[38px] px-2.5 py-1.5 rounded-lg border text-xs font-bold flex items-center justify-center space-x-1 transition-colors cursor-pointer active:scale-95 ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.activeToolHover}`}
                title="縦幅を抑えて横広の扁平に変換 (X:115%, Y:85%)"
              >
                <span>扁平 (横広化)</span>
              </button>
            </div>

            {/* Smooth & Fix Jaggedness Button */}
            <button
              type="button"
              onClick={onSmoothAndFix}
              disabled={contours.length === 0}
              className={`w-full min-h-[42px] py-2 rounded-lg border text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer active:scale-95 disabled:opacity-40 ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.activeToolHover}`}
              title="変形・拡大縮小時に生じたガタツキやベジェ曲線の折れ曲がり歪みを自動補正"
            >
              <Wand2 className={`w-4 h-4 shrink-0 ${themeClasses.accentText}`} />
              <span>変形後のガタツキ・歪みを滑らかに補正</span>
            </button>

            <button
              type="button"
              onClick={onFitToEmBox}
              className={`w-full min-h-[42px] py-2 rounded-lg border text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer active:scale-95 ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.activeToolHover}`}
              title="はみ出た文字や大きすぎる文字を、キャンバスの字面枠（漢字85%/仮名78%）にぴったり収まるよう自動縮小・中央配置します"
            >
              <Maximize2 className={`w-4 h-4 shrink-0 ${themeClasses.accentText}`} />
              <span>キャンバス枠内に自動収める (字面85%最適化)</span>
            </button>

            <button
              type="button"
              onClick={onCenter}
              className={`w-full min-h-[42px] py-2 rounded-lg border text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer active:scale-95 ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.activeToolHover}`}
            >
              <AlignCenter className="w-4 h-4 shrink-0" />
              <span>EM枠の中央に配置 ({upm}×{upm})</span>
            </button>

            {/* Small Kana Helper */}
            <button
              type="button"
              onClick={onConvertToSmallKana}
              className={`w-full min-h-[42px] py-2 rounded-lg border text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer active:scale-95 ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.activeToolHover}`}
              title="通常の文字を小文字用（ぁ, ッ等）の位置とサイズに自動縮小"
            >
              <Wand2 className={`w-4 h-4 shrink-0 ${themeClasses.accentText}`} />
              <span>小文字サイズ・位置に変換 (ぁ・ッ等)</span>
            </button>
          </div>
        )}
      </div>

      {/* 6. Outline Stroke Paths */}
      <div
        className={`flex flex-col rounded-xl border overflow-hidden transition-colors ${themeClasses.cardBg} ${themeClasses.border} shadow-xs`}
      >
        <div
          onClick={onToggleOutline}
          className={`flex items-center justify-between p-2.5 cursor-pointer transition-colors ${themeClasses.activeToolHover}`}
        >
          <span className={`text-xs font-bold ${themeClasses.textPrimary}`}>
            骨格線の肉付け（アウトライン化）
          </span>
          <div className="p-0.5 text-stone-400">
            {isOutlineExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>

        {isOutlineExpanded && (
          <div className={`p-3 pt-0 space-y-2.5 border-t ${themeClasses.border}`}>
            <div className="flex items-center space-x-2 pt-2">
              <input
                type="range"
                min={20}
                max={140}
                step={5}
                value={strokeOutlineWidth}
                onChange={(e) => setStrokeOutlineWidth(Number(e.target.value))}
                className="flex-1 accent-emerald-700 h-2"
              />
              <span className={`text-xs font-mono font-bold w-12 text-right ${themeClasses.textPrimary}`}>
                {strokeOutlineWidth}px
              </span>
            </div>
            <button
              type="button"
              onClick={onOutlineStrokePaths}
              className={`w-full min-h-[40px] py-2 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer active:scale-95 ${themeClasses.accentBtn}`}
            >
              <Layers className="w-4 h-4 shrink-0" />
              <span>骨格線をアウトライン化</span>
            </button>
          </div>
        )}
      </div>

      {/* 7. Clear Button */}
      <div className="pt-1">
        {isConfirmingClear ? (
          <div className="flex items-center space-x-2 anim-fade">
            <button
              type="button"
              onClick={onExecuteClear}
              className="flex-1 min-h-[44px] py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors bg-rose-600 hover:bg-rose-700 text-white border-rose-700 cursor-pointer active:scale-95"
            >
              <Trash2 className="w-4 h-4 shrink-0" />
              <span>本当に全消去する</span>
            </button>
            <button
              type="button"
              onClick={() => setIsConfirmingClear(false)}
              className={`min-h-[44px] py-2 px-4 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.activeToolHover}`}
            >
              取消
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (contours.length === 0) return;
              setIsConfirmingClear(true);
            }}
            disabled={contours.length === 0}
            className="w-full min-h-[42px] py-2 rounded-lg border border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors disabled:opacity-40 cursor-pointer"
            title="現在のグリフのすべての輪郭を消去 (Ctrl+Zで元に戻せます)"
          >
            <Trash2 className="w-4 h-4 shrink-0" />
            <span>字形を全消去</span>
          </button>
        )}
      </div>
    </>
  );
};
