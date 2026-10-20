import React from 'react';
import { HelpCircle, X, RotateCcw, Move } from 'lucide-react';
import { ToolMode, TraceSettings } from '../../../types';

export interface GuideAssistOverlayProps {
  showGuideAssist: boolean;
  handleToggleGuideAssist: (show: boolean) => void;
  isLight: boolean;
  activeChar: string;
  traceSettings: TraceSettings;
  handleResetTracePosition: () => void;
  onSetToolMode?: (mode: ToolMode) => void;
  onChangeTraceSettings?: React.Dispatch<React.SetStateAction<TraceSettings>>;
  showCanvasToast: (msg: string, sub?: string) => void;
}

export const GuideAssistOverlay: React.FC<GuideAssistOverlayProps> = React.memo(({
  showGuideAssist,
  handleToggleGuideAssist,
  isLight,
  activeChar,
  traceSettings,
  handleResetTracePosition,
  onSetToolMode,
  onChangeTraceSettings,
  showCanvasToast,
}) => {
  return (
    <div
      className="absolute top-12 sm:top-14 right-2 sm:right-4 z-20 pointer-events-auto select-none transition-all duration-200"
      onPointerDown={(e) => e.stopPropagation()}
    >
      {!showGuideAssist ? (
        <button
          onClick={() => handleToggleGuideAssist(true)}
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full border text-[11px] sm:text-xs font-semibold transition-all hover:scale-105 active:scale-95 ${
            isLight
              ? 'bg-white/85 hover:bg-white border-emerald-200/90 text-emerald-800 '
              : 'bg-[#121c15]/85 hover:bg-[#121c15] border-emerald-800/60 text-emerald-300 '
          }`}
          title="フォント作図の基準線ガイド（凡例）を表示"
        >
          <HelpCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="hidden xs:inline">ガイド凡例</span>
        </button>
      ) : (
        <div
          className={`w-[calc(100vw-24px)] sm:w-[380px] md:w-[400px] max-h-[calc(100vh-120px)] overflow-y-auto rounded-xl border p-3.5 sm:p-4 shadow-xl transition-all text-left ${
            isLight
              ? 'bg-white/95 border-emerald-200/90 text-stone-800 '
              : 'bg-[#101712]/95 border-emerald-800/70 text-emerald-100 '
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-stone-200 dark:border-emerald-900/60 mb-2.5">
            <div className="flex items-center space-x-2 font-bold text-sm sm:text-base text-emerald-700 dark:text-emerald-300">
              <HelpCircle className="w-4 h-4 shrink-0" />
              <span>作図基準ガイド</span>
              <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                {/[ぁ-んァ-ヶー]/.test(activeChar)
                  ? '仮名'
                  : /[\u4e00-\u9faf\u3400-\u4dbf]/.test(activeChar)
                  ? '漢字'
                  : '欧文'}
              </span>
            </div>
            <button
              onClick={() => handleToggleGuideAssist(false)}
              className="p-1 rounded-md hover:bg-stone-100 dark:hover:bg-emerald-950 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
              title="ガイドカードを閉じる"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Contextual Recommendation based on active character */}
          <div
            className={`p-2.5 sm:p-3 rounded-lg mb-3 text-xs sm:text-[13px] leading-relaxed text-left ${
              /[ぁ-んァ-ヶー]/.test(activeChar)
                ? isLight
                  ? 'bg-amber-50 text-amber-900 border border-amber-200'
                  : 'bg-amber-950/40 text-amber-200 border border-amber-800/60'
                : /[\u4e00-\u9faf\u3400-\u4dbf]/.test(activeChar)
                ? isLight
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                  : 'bg-emerald-950/40 text-emerald-200 border border-emerald-800/60'
                : isLight
                ? 'bg-sky-50 text-sky-900 border border-sky-200'
                : 'bg-sky-950/40 text-sky-200 border border-sky-800/60'
            }`}
          >
            {/[ぁ-んァ-ヶー]/.test(activeChar) ? (
              <>
                <div className="font-bold text-xs sm:text-sm text-amber-800 dark:text-amber-300 mb-1">
                  現在の文字: 「{activeChar}」（和文仮名）
                </div>
                <div>
                  オレンジ色の<strong>仮名字面枠 (78%)</strong>の内側に収まるよう作図します。欧文底線（赤線）ではなく、<strong>マスの中央</strong>を基準として配置してください。
                </div>
              </>
            ) : /[\u4e00-\u9faf\u3400-\u4dbf]/.test(activeChar) ? (
              <>
                <div className="font-bold text-xs sm:text-sm text-emerald-800 dark:text-emerald-300 mb-1">
                  現在の文字: 「{activeChar}」（漢字）
                </div>
                <div>
                  緑色の<strong>漢字字面枠 (85%)</strong>の内側に収まるよう作図します。外枠（1000UPM）いっぱいまで描かず周囲に余白を残すことで、組版時の字間バランスが保たれます。
                </div>
              </>
            ) : (
              <>
                <div className="font-bold text-xs sm:text-sm text-sky-800 dark:text-sky-300 mb-1">
                  現在の文字: 「{activeChar}」（欧文 / 記号）
                </div>
                <div>
                  赤色の<strong>Baseline (底線)</strong>の上に文字の底部を揃えて作図します。大文字はCap Height、小文字はx-Heightを目安にしてください。
                </div>
              </>
            )}
          </div>

          {/* Line Legend with Dual Cues (Shape, Dash Pattern, & Color) */}
          <div className="space-y-2 text-xs sm:text-[13px] text-left">
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <span className="w-3.5 h-3.5 border-2 border-dotted border-amber-500 bg-amber-500/20 rounded-xs flex items-center justify-center shrink-0">
                  <span className="w-1 h-1 bg-amber-600 rounded-full" />
                </span>
                <span className="font-medium">仮名字面枠 (78%・点線)</span>
              </span>
              <span className="text-stone-500 dark:text-stone-400 text-xs">かな用</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <span className="w-3.5 h-3.5 border-2 border-dashed border-emerald-600 bg-emerald-500/20 rounded-xs flex items-center justify-center shrink-0">
                  <span className="w-1.5 h-0.5 bg-emerald-600" />
                </span>
                <span className="font-medium">漢字字面枠 (85%・破線)</span>
              </span>
              <span className="text-stone-500 dark:text-stone-400 text-xs">漢字推奨</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0 text-red-500 font-bold text-[11px] leading-none">
                  ▶─
                </span>
                <span className="font-medium">Baseline (欧文底線・実線)</span>
              </span>
              <span className="text-stone-500 dark:text-stone-400 text-xs">欧文(A-Z)整列</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <span className="w-3.5 h-3.5 border border-teal-500 bg-teal-500/10 rounded-xs flex items-center justify-center shrink-0 text-[10px] text-teal-600 font-bold leading-none">
                  ┼
                </span>
                <span className="font-medium">中心十字格 (田字格)</span>
              </span>
              <span className="text-stone-500 dark:text-stone-400 text-xs">重心バランス</span>
            </div>
          </div>

          {/* Direct Tool Switch Button */}
          <div className="mt-3 pt-2.5 border-t border-stone-200 dark:border-emerald-900/60 flex items-center justify-between text-xs">
            <span className="text-xs text-stone-500 dark:text-stone-400">下絵位置:</span>
            <div className="flex items-center gap-1.5">
              {(traceSettings.offsetX !== 0 || traceSettings.offsetY !== 0) && (
                <button
                  onClick={handleResetTracePosition}
                  className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center space-x-1 transition-colors "
                  title="下絵の位置を中央(0, 0)にリセット"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>位置リセット</span>
                </button>
              )}
              <button
                onClick={() => {
                  onSetToolMode?.('trace_adjust');
                  onChangeTraceSettings?.((prev: TraceSettings) => ({ ...prev, enabled: true }));
                  showCanvasToast('下絵調整モードに切り替えました');
                }}
                className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-1 transition-colors "
              >
                <Move className="w-3.5 h-3.5" />
                <span>下絵の位置調整</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

GuideAssistOverlay.displayName = 'GuideAssistOverlay';
