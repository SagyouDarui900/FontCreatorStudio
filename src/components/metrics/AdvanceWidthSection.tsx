import React from 'react';
import { ChevronDown, ChevronUp, MoveHorizontal } from 'lucide-react';
import { PathContour, ThemeClasses } from '../../types';

export interface AdvanceWidthSectionProps {
  advanceWidth: number;
  lsb: number;
  upm: number;
  contours: PathContour[];
  bbox: { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number };
  isExpanded: boolean;
  onToggle: () => void;
  isLight: boolean;
  themeClasses: ThemeClasses;
  onChangeAdvanceWidth: (val: number) => void;
  onChangeLsb: (val: number) => void;
  onCommitHistory: () => void;
  onStepAdvance: (delta: number) => void;
  onStepLsb: (delta: number) => void;
  onSetAdvancePreset: (val: number) => void;
  onSetLsbPreset: (val: number) => void;
  onCenterWithinAdvance: () => void;
}

export const AdvanceWidthSection: React.FC<AdvanceWidthSectionProps> = ({
  advanceWidth,
  lsb,
  upm,
  contours,
  bbox,
  isExpanded,
  onToggle,
  isLight,
  themeClasses,
  onChangeAdvanceWidth,
  onChangeLsb,
  onCommitHistory,
  onStepAdvance,
  onStepLsb,
  onSetAdvancePreset,
  onSetLsbPreset,
  onCenterWithinAdvance,
}) => {
  return (
    <div
      className={`flex flex-col rounded-xl border overflow-hidden transition-colors ${themeClasses.cardBg} ${themeClasses.border} shadow-xs`}
    >
      <div
        onClick={onToggle}
        className={`flex items-center justify-between p-2.5 cursor-pointer transition-colors ${themeClasses.activeToolHover}`}
      >
        <div className="flex flex-wrap items-center gap-1.5 min-w-0 pr-1">
          <span className={`text-xs font-bold uppercase tracking-wider whitespace-nowrap ${themeClasses.textPrimary}`}>
            メトリクス数値指定
          </span>
          <span className={`text-[10px] font-mono tabular-nums font-bold px-1.5 py-0.5 rounded shrink-0 whitespace-nowrap border ${themeClasses.accentBadge}`}>
            幅:{advanceWidth ?? 1000} / LSB:{lsb ?? 50}
          </span>
        </div>
        <div className="shrink-0 p-0.5 text-stone-400">
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {isExpanded && (
        <div className={`p-3 pt-0 space-y-3 border-t ${themeClasses.border}`}>
          {/* Advance Width Section */}
          <div
            className={`p-2.5 rounded-lg border space-y-2 mt-2 ${themeClasses.toolbarBg} ${themeClasses.border}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-1 min-w-0">
              <label className={`text-xs font-bold truncate ${themeClasses.textPrimary}`}>
                送り幅 (Advance)
              </label>
              <span className={`text-[10px] font-mono tabular-nums whitespace-nowrap shrink-0 ${themeClasses.textMuted}`}>
                標準: {upm} (全角)
              </span>
            </div>

            {/* Input Row with Large +/- buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onStepAdvance(-10)}
                className={`w-9 h-9 rounded-lg border text-sm font-bold flex items-center justify-center transition-colors active:scale-95 cursor-pointer shrink-0 ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.activeToolHover}`}
                title="10px 減らす"
              >
                -
              </button>
              <div className="relative flex-1 min-w-0 flex items-center">
                <input
                  type="number"
                  value={advanceWidth ?? upm}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    onChangeAdvanceWidth(Number.isFinite(value) ? Math.max(0, Math.round(value)) : upm);
                  }}
                  onBlur={onCommitHistory}
                  className={`w-full border rounded-lg px-2.5 py-1.5 pr-7 text-sm font-mono tabular-nums font-bold text-center focus:outline-hidden focus:ring-1 focus:ring-emerald-500/40 ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary}`}
                  step={10}
                />
                <span className={`absolute right-2 text-[10px] font-mono pointer-events-none font-bold ${themeClasses.textMuted}`}>
                  px
                </span>
              </div>
              <button
                type="button"
                onClick={() => onStepAdvance(10)}
                className={`w-9 h-9 rounded-lg border text-sm font-bold flex items-center justify-center transition-colors active:scale-95 cursor-pointer shrink-0 ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.activeToolHover}`}
                title="10px 増やす"
              >
                +
              </button>
            </div>

            {/* Step Increment Row (Clean 4-column distribution) */}
            <div className="grid grid-cols-4 gap-1">
              {[-50, -10, 10, 50].map((step) => (
                <button
                  key={step}
                  type="button"
                  onClick={() => onStepAdvance(step)}
                  className={`py-1 rounded-md border text-[11px] font-mono tabular-nums font-bold text-center transition-colors active:scale-95 cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.activeToolHover}`}
                >
                  {step > 0 ? `+${step}` : `${step}`}
                </button>
              ))}
            </div>

            {/* Preset Width Chips */}
            <div className="flex flex-wrap gap-1 pt-0.5">
              {[
                { label: `全角 ${upm}`, val: upm },
                { label: `半角 ${Math.round(upm / 2)}`, val: Math.round(upm / 2) },
                { label: `${Math.round(upm * 0.6)}`, val: Math.round(upm * 0.6) },
                { label: `${Math.round(upm * 0.75)}`, val: Math.round(upm * 0.75) },
                { label: `${Math.round(upm * 0.8)}`, val: Math.round(upm * 0.8) },
              ].map((p) => (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => onSetAdvancePreset(p.val)}
                  className={`px-2 py-1 rounded-md border text-[10.5px] font-bold transition-colors cursor-pointer ${
                    advanceWidth === p.val
                      ? `${themeClasses.activeTool} border`
                      : `${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.activeToolHover}`
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Left Sidebearing (LSB) Section */}
          <div
            className={`p-2.5 rounded-lg border space-y-2 ${themeClasses.toolbarBg} ${themeClasses.border}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-1 min-w-0">
              <label className={`text-xs font-bold truncate ${themeClasses.textPrimary}`}>
                左余白 (LSB)
              </label>
              <span className={`text-[10px] font-mono tabular-nums whitespace-nowrap shrink-0 ${themeClasses.textMuted}`}>
                標準: 50px
              </span>
            </div>

            {/* Input Row with Large +/- buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onStepLsb(-5)}
                className={`w-9 h-9 rounded-lg border text-sm font-bold flex items-center justify-center transition-colors active:scale-95 cursor-pointer shrink-0 ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.activeToolHover}`}
                title="5px 減らす"
              >
                -
              </button>
              <div className="relative flex-1 min-w-0 flex items-center">
                <input
                  type="number"
                  value={lsb ?? 50}
                  onChange={(e) => {
                    onChangeLsb(Number(e.target.value) || 0);
                  }}
                  onBlur={onCommitHistory}
                  className={`w-full border rounded-lg px-2.5 py-1.5 pr-7 text-sm font-mono tabular-nums font-bold text-center focus:outline-hidden focus:ring-1 focus:ring-emerald-500/40 ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary}`}
                  step={5}
                />
                <span className={`absolute right-2 text-[10px] font-mono pointer-events-none font-bold ${themeClasses.textMuted}`}>
                  px
                </span>
              </div>
              <button
                type="button"
                onClick={() => onStepLsb(5)}
                className={`w-9 h-9 rounded-lg border text-sm font-bold flex items-center justify-center transition-colors active:scale-95 cursor-pointer shrink-0 ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.activeToolHover}`}
                title="5px 増やす"
              >
                +
              </button>
            </div>

            {/* Step Increment Row (Clean 4-column distribution) */}
            <div className="grid grid-cols-4 gap-1">
              {[-20, -5, 5, 20].map((step) => (
                <button
                  key={step}
                  type="button"
                  onClick={() => onStepLsb(step)}
                  className={`py-1 rounded-md border text-[11px] font-mono tabular-nums font-bold text-center transition-colors active:scale-95 cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.activeToolHover}`}
                >
                  {step > 0 ? `+${step}` : `${step}`}
                </button>
              ))}
            </div>

            {/* Preset LSB Chips */}
            <div className="flex flex-wrap gap-1 pt-0.5">
              {[
                { label: '0px (密着)', val: 0 },
                { label: '25px', val: 25 },
                { label: '50px (標準)', val: 50 },
                { label: '80px', val: 80 },
              ].map((p) => (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => onSetLsbPreset(p.val)}
                  className={`px-2 py-1 rounded-md border text-[10.5px] font-bold transition-colors cursor-pointer ${
                    lsb === p.val
                      ? `${themeClasses.activeTool} border`
                      : `${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.activeToolHover}`
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bounding Box & Margin Balance Readout */}
          {contours.length > 0 && bbox.width > 0 && (() => {
            const actualLsb = Math.round(bbox.minX);
            const actualRsb = Math.round(advanceWidth - bbox.maxX);
            const diff = actualLsb - actualRsb;
            const isLeftLeaning = diff < -15;
            const isRightLeaning = diff > 15;
            const isBalanced = !isLeftLeaning && !isRightLeaning;

            return (
              <div
                className={`p-2.5 rounded-lg border space-y-2 ${themeClasses.toolbarBg} ${themeClasses.border}`}
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className={themeClasses.textPrimary}>余白バランス</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-bold tabular-nums border ${
                      isBalanced
                        ? themeClasses.accentBadge
                        : isLeftLeaning
                        ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                        : 'bg-indigo-100 text-indigo-900 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800'
                    }`}
                  >
                    {isBalanced ? '✓ 左右均等' : isLeftLeaning ? `左寄り (${Math.abs(Math.round(diff / 2))}px)` : `右寄り (${Math.round(diff / 2)}px)`}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-xs font-mono">
                  <div className={`p-2 rounded-md border ${themeClasses.cardBg} ${themeClasses.border}`}>
                    <div className={`text-[10px] ${themeClasses.textMuted}`}>実測 LSB (左余白)</div>
                    <div className={`font-bold text-sm ${themeClasses.accentText}`}>{actualLsb} px</div>
                  </div>
                  <div className={`p-2 rounded-md border ${themeClasses.cardBg} ${themeClasses.border}`}>
                    <div className={`text-[10px] ${themeClasses.textMuted}`}>実測 RSB (右余白)</div>
                    <div className={`font-bold text-sm ${themeClasses.accentText}`}>{actualRsb} px</div>
                  </div>
                </div>

                {/* 1-Tap Horizontal Center Button */}
                <button
                  type="button"
                  onClick={onCenterWithinAdvance}
                  className={`w-full min-h-[38px] py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 border transition-colors active:scale-95 cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.activeToolHover}`}
                  title="送り幅の中で文字を左右中央にセンタリングして余白を均等化"
                >
                  <MoveHorizontal className="w-3.5 h-3.5" />
                  <span>左右中央に自動センタリング</span>
                </button>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};
