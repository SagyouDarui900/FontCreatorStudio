import React from 'react';
import { Sliders, ShieldCheck, CheckCircle2 } from 'lucide-react';
import {
  AlignHorizontal,
  AlignVertical,
  SizePreset,
  isAlignHorizontal,
  isAlignVertical,
  isSizePreset,
} from './types';

export interface BatchOptionsSectionProps {
  isLight: boolean;
  sizePreset: SizePreset;
  setSizePreset: (preset: SizePreset) => void;
  handlePresetChange: (preset: SizePreset) => void;
  targetWidth: number;
  setTargetWidth: (w: number) => void;
  targetHeight: number;
  setTargetHeight: (h: number) => void;
  weightDelta: number;
  setWeightDelta: (d: number) => void;
  alignH: AlignHorizontal;
  setAlignH: (a: AlignHorizontal) => void;
  alignV: AlignVertical;
  setAlignV: (a: AlignVertical) => void;
  unifyAdvance: boolean;
  setUnifyAdvance: (u: boolean) => void;
  advanceWidth: number;
  setAdvanceWidth: (w: number) => void;
  optimizePoints: boolean;
  setOptimizePoints: (o: boolean) => void;
  normalizeWinding: boolean;
  setNormalizeWinding: (w: boolean) => void;
}

export const BatchOptionsSection: React.FC<BatchOptionsSectionProps> = React.memo(({
  isLight,
  sizePreset,
  setSizePreset,
  handlePresetChange,
  targetWidth,
  setTargetWidth,
  targetHeight,
  setTargetHeight,
  weightDelta,
  setWeightDelta,
  alignH,
  setAlignH,
  alignV,
  setAlignV,
  unifyAdvance,
  setUnifyAdvance,
  advanceWidth,
  setAdvanceWidth,
  optimizePoints,
  setOptimizePoints,
  normalizeWinding,
  setNormalizeWinding,
}) => {
  return (
    <>
      {/* Section 2: Presets & Sizing */}
      <div
        className={`p-3 rounded-lg border space-y-3 ${
          isLight ? 'bg-white border-[#d8e6df]' : 'bg-[#101813] border-[#25362b]'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="font-semibold flex items-center space-x-1.5">
            <Sliders className="w-3.5 h-3.5 text-emerald-600" />
            <span>② 文字サイズ・枠プリセット</span>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5">
          {[
            { id: 'standard', label: '標準 (820px)', sub: '推奨バランス' },
            { id: 'large', label: '大振り (890px)', sub: '見出し・漢字' },
            { id: 'kana', label: 'かな (780px)', sub: '適度な字間' },
            { id: 'compact', label: '小振り (740px)', sub: '長文・本文' },
            { id: 'custom', label: 'カスタム', sub: '自由指定' },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => {
                if (isSizePreset(p.id)) {
                  handlePresetChange(p.id);
                }
              }}
              className={`p-2 rounded border text-center flex flex-col justify-center items-center min-w-0 transition-all ${
                sizePreset === p.id
                  ? isLight
                    ? 'bg-emerald-800 text-white font-bold'
                    : 'bg-emerald-600 text-white font-bold'
                  : isLight
                  ? 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                  : 'bg-[#18231c] border-[#25362b] text-emerald-300 hover:bg-[#202d24]'
              }`}
            >
              <div className="text-[11px] truncate w-full">{p.label}</div>
              <div className="text-[9px] opacity-75 truncate w-full">{p.sub}</div>
            </button>
          ))}
        </div>

        {/* Custom Sliders */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span>目標幅 (Width)</span>
              <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">{targetWidth} px</span>
            </div>
            <input
              type="range"
              min={500}
              max={960}
              step={10}
              value={targetWidth}
              onChange={(e) => {
                setTargetWidth(Number(e.target.value));
                setSizePreset('custom');
              }}
              className="w-full accent-emerald-700"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span>目標高さ (Height)</span>
              <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">{targetHeight} px</span>
            </div>
            <input
              type="range"
              min={500}
              max={960}
              step={10}
              value={targetHeight}
              onChange={(e) => {
                setTargetHeight(Number(e.target.value));
                setSizePreset('custom');
              }}
              className="w-full accent-emerald-700"
            />
          </div>
        </div>

        {/* Stroke Weight Normalization Slider */}
        <div className="pt-2 border-t space-y-1">
          <div className="flex justify-between text-[11px]">
            <span className="font-medium">線の太さ（ウェイト）一括調整:</span>
            <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
              {weightDelta > 0 ? `+${weightDelta}px (太く)` : weightDelta < 0 ? `${weightDelta}px (細く)` : '0px (現状維持)'}
            </span>
          </div>
          <input
            type="range"
            min={-20}
            max={20}
            step={2}
            value={weightDelta}
            onChange={(e) => setWeightDelta(Number(e.target.value))}
            className="w-full accent-emerald-700"
          />
          <div className="flex justify-between text-[9px] text-stone-400">
            <span>-20px (スリム化)</span>
            <span>±0px (維持)</span>
            <span>+20px (ボールド化)</span>
          </div>
        </div>
      </div>

      {/* Section 3: Alignment, Advance Width, & Quality Optimization */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Position & Metric Controls */}
        <div
          className={`p-3 rounded-lg border space-y-2.5 ${
            isLight ? 'bg-white border-[#d8e6df]' : 'bg-[#101813] border-[#25362b]'
          }`}
        >
          <span className="font-semibold block text-[11px]">③ 位置揃え・送り幅</span>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-stone-500 dark:text-emerald-400 block mb-1">水平揃え</label>
              <select
                value={alignH}
                onChange={(e) => {
                  if (isAlignHorizontal(e.target.value)) {
                    setAlignH(e.target.value);
                  }
                }}
                className={`w-full border rounded p-1.5 text-xs ${
                  isLight ? 'bg-stone-50 border-[#c8ded3]' : 'bg-[#18231c] border-[#25362b]'
                }`}
              >
                <option value="center">枠の中央揃え (推奨)</option>
                <option value="keep">現在のX位置を維持</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-stone-500 dark:text-emerald-400 block mb-1">垂直揃え</label>
              <select
                value={alignV}
                onChange={(e) => {
                  if (isAlignVertical(e.target.value)) {
                    setAlignV(e.target.value);
                  }
                }}
                className={`w-full border rounded p-1.5 text-xs ${
                  isLight ? 'bg-stone-50 border-[#c8ded3]' : 'bg-[#18231c] border-[#25362b]'
                }`}
              >
                <option value="center">枠の中央揃え (全角向け)</option>
                <option value="baseline">ベースライン基準 (欧文向け)</option>
                <option value="keep">現在のY位置を維持</option>
              </select>
            </div>
          </div>

          <div className="pt-2 border-t flex items-center justify-between">
            <label className="flex items-center space-x-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={unifyAdvance}
                onChange={(e) => setUnifyAdvance(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-[11px] font-medium">送り幅(advanceWidth)を一括統一</span>
            </label>
            <input
              type="number"
              disabled={!unifyAdvance}
              value={advanceWidth}
              onChange={(e) => setAdvanceWidth(Number(e.target.value))}
              className={`w-20 border rounded p-1 text-right font-mono text-xs ${
                isLight ? 'bg-stone-50 border-[#c8ded3]' : 'bg-[#18231c] border-[#25362b]'
              } ${!unifyAdvance && 'opacity-40'}`}
            />
          </div>
        </div>

        {/* Quality & Size Optimization (容量削減・バグ防止) */}
        <div
          className={`p-3 rounded-lg border space-y-2.5 ${
            isLight ? 'bg-white border-[#d8e6df]' : 'bg-[#101813] border-[#25362b]'
          }`}
        >
          <span className="font-semibold flex items-center space-x-1 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>④ フォント容量肥大化防止＆バグ防止</span>
          </span>

          <div className="space-y-1.5 text-[10px] text-stone-600 dark:text-emerald-300/90">
            <label className="flex items-start space-x-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={optimizePoints}
                onChange={(e) => setOptimizePoints(e.target.checked)}
                className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span>
                <strong>ベジェ制御点の重複・ゴミ取り（容量削減）</strong>
                <br />
                微小な重複アンカーポイントの統合、不要なハンドル除去、整数座標クランプを行いファイルサイズを最小化します。
              </span>
            </label>

            <label className="flex items-start space-x-1.5 cursor-pointer pt-1 border-t border-stone-100 dark:border-stone-800">
              <input
                type="checkbox"
                checked={normalizeWinding}
                onChange={(e) => setNormalizeWinding(e.target.checked)}
                className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span>
                <strong>TrueType標準ワインディング（輪郭方向）の統一</strong>
                <br />
                外輪郭を時計回り、中抜き穴を反時計回りに統一し、レンダラーでの黒塗りつぶれバグを防ぎます。
              </span>
            </label>
          </div>

          <div
            className={`p-2 rounded text-[10px] space-y-0.5 border ${
              isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
            }`}
          >
            <div className="font-semibold flex items-center space-x-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Windows 11 日本語フォント規格適合</span>
            </div>
            <p className="text-[9px] opacity-80">
              TTF出力時に自動でShift-JIS 932コードページフラグ、Windows行間メトリクス、縦書き代替グリフが設定されます。
            </p>
          </div>
        </div>
      </div>
    </>
  );
});

BatchOptionsSection.displayName = 'BatchOptionsSection';
