import React from 'react';
import {
  Scale,
  ShieldCheck,
  X,
  SlidersHorizontal,
  Layers,
  Sliders,
  Check,
  RefreshCw,
} from 'lucide-react';
import { BatchStrokeEqualizationResult } from '../../../utils/qualityChecker';

export type EqualizationMode = 'balanced' | 'boost_thin' | 'shrink_thick';
export type EqualizationScope = 'all' | 'uneven' | 'filtered';

interface StrokeEqualizerPanelProps {
  isOpen: boolean;
  isLight: boolean;
  onClose: () => void;
  eqMode: EqualizationMode;
  setEqMode: (mode: EqualizationMode) => void;
  eqScope: EqualizationScope;
  setEqScope: (scope: EqualizationScope) => void;
  eqStrength: number;
  setEqStrength: (val: number) => void;
  isEqualizing: boolean;
  onRunEqualization: () => void;
  lastEqualizationResult: BatchStrokeEqualizationResult | null;
  totalGlyphsChecked: number;
  unevenStrokeCount: number;
  filteredCount: number;
}

export const StrokeEqualizerPanel: React.FC<StrokeEqualizerPanelProps> = ({
  isOpen,
  isLight,
  onClose,
  eqMode,
  setEqMode,
  eqScope,
  setEqScope,
  eqStrength,
  setEqStrength,
  isEqualizing,
  onRunEqualization,
  lastEqualizationResult,
  totalGlyphsChecked,
  unevenStrokeCount,
  filteredCount,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className={`px-5 py-4 border-b transition-all text-xs ${
        isLight
          ? 'bg-emerald-50/70 border-emerald-200 text-stone-800'
          : 'bg-[#102016] border-[#223d2b] text-emerald-100'
      }`}
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center space-x-2.5">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center border shrink-0 ${
              isLight
                ? 'bg-emerald-700 text-white border-emerald-800'
                : 'bg-emerald-500 text-black border-emerald-400'
            }`}
          >
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-sm text-stone-900 dark:text-white">
                ストローク均一化（線幅分析 &amp; かすれ・潰れ自動補正）
              </h3>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 ${
                  isLight
                    ? 'bg-emerald-100/80 text-emerald-800 border-emerald-300'
                    : 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                }`}
              >
                <ShieldCheck className="w-3 h-3" />
                角・形状保護
              </span>
            </div>
            <p className="text-xs text-stone-600 dark:text-stone-300 mt-0.5 leading-relaxed">
              文字全体のストローク線幅（太さ）を幾何学的に測定し、過度に細い箇所（かすれ）や太い箇所（潰れ）を自動調整して均等なストローク感に仕上げます。
              トメ・ハネなどの鋭角コーナーは保護されます。
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className={`p-1.5 rounded-lg border transition-colors ${
            isLight
              ? 'bg-white border-stone-200 text-stone-400 hover:text-stone-700'
              : 'bg-[#16271c] border-[#253f2c] text-stone-400 hover:text-white'
          }`}
          title="パネルを閉じる"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
        {/* Option 1: Equalization Mode */}
        <div
          className={`p-3 rounded-xl border flex flex-col justify-between ${
            isLight ? 'bg-white border-emerald-200/80' : 'bg-[#142319] border-[#223d2b]'
          }`}
        >
          <div className="text-[11px] font-bold text-stone-500 dark:text-stone-400 mb-1.5 flex items-center space-x-1">
            <SlidersHorizontal className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span>均一化モード</span>
          </div>
          <div className="space-y-1">
            {[
              {
                id: 'balanced' as EqualizationMode,
                label: 'バランス調整（推奨）',
                desc: '中央値に合わせて、過度な細線を補強しつつ太線部をスリム化',
              },
              {
                id: 'boost_thin' as EqualizationMode,
                label: '細線・かすれ補強のみ',
                desc: '太線は維持し、かすれや欠落リスクのある細い箇所のみ太く補強',
              },
              {
                id: 'shrink_thick' as EqualizationMode,
                label: '太線・潰れスリム化のみ',
                desc: '細線は維持し、黒く潰れやすい太い箇所のみシェイプアップ',
              },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setEqMode(m.id)}
                className={`w-full text-left p-2 rounded-lg border transition-all text-xs ${
                  eqMode === m.id
                    ? isLight
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold ring-1 ring-emerald-500/20'
                      : 'bg-emerald-950/60 border-emerald-500 text-emerald-200 font-bold ring-1 ring-emerald-500/30'
                    : isLight
                    ? 'border-transparent hover:bg-stone-50 text-stone-700'
                    : 'border-transparent hover:bg-[#1a2c20] text-stone-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{m.label}</span>
                  {eqMode === m.id && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                </div>
                <div className="text-[10px] text-stone-500 dark:text-stone-400 font-normal mt-0.5 leading-snug">
                  {m.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Option 2: Target Scope */}
        <div
          className={`p-3 rounded-xl border flex flex-col justify-between ${
            isLight ? 'bg-white border-emerald-200/80' : 'bg-[#142319] border-[#223d2b]'
          }`}
        >
          <div className="text-[11px] font-bold text-stone-500 dark:text-stone-400 mb-1.5 flex items-center space-x-1">
            <Layers className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span>対象文字の範囲</span>
          </div>
          <div className="space-y-1">
            {[
              {
                id: 'all' as EqualizationScope,
                label: 'すべての文字（全文字一括）',
                desc: `フォントプロジェクト内の全登録グリフ（${totalGlyphsChecked} 文字）`,
              },
              {
                id: 'uneven' as EqualizationScope,
                label: '線幅の偏り・問題検出文字のみ',
                desc: `品質検査でかすれ/潰れが指摘された文字（${unevenStrokeCount} 文字）`,
              },
              {
                id: 'filtered' as EqualizationScope,
                label: '現在表示・検索中の文字',
                desc: `リストに表示されている指摘文字（${filteredCount} 件）`,
              },
            ].map((sc) => (
              <button
                key={sc.id}
                type="button"
                onClick={() => setEqScope(sc.id)}
                className={`w-full text-left p-2 rounded-lg border transition-all text-xs ${
                  eqScope === sc.id
                    ? isLight
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold ring-1 ring-emerald-500/20'
                      : 'bg-emerald-950/60 border-emerald-500 text-emerald-200 font-bold ring-1 ring-emerald-500/30'
                    : isLight
                    ? 'border-transparent hover:bg-stone-50 text-stone-700'
                    : 'border-transparent hover:bg-[#1a2c20] text-stone-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{sc.label}</span>
                  {eqScope === sc.id && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                </div>
                <div className="text-[10px] text-stone-500 dark:text-stone-400 font-normal mt-0.5 leading-snug">
                  {sc.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Option 3: Strength & Action */}
        <div
          className={`p-3 rounded-xl border flex flex-col justify-between ${
            isLight ? 'bg-white border-emerald-200/80' : 'bg-[#142319] border-[#223d2b]'
          }`}
        >
          <div>
            <div className="text-[11px] font-bold text-stone-500 dark:text-stone-400 mb-1.5 flex items-center justify-between">
              <span className="flex items-center space-x-1">
                <Sliders className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span>補正の強さ</span>
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                {Math.round(eqStrength * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.2"
              max="1.0"
              step="0.05"
              value={eqStrength}
              onChange={(e) => setEqStrength(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-stone-200 dark:bg-stone-700 rounded-lg appearance-none cursor-pointer accent-emerald-600 mb-2"
            />
            <ul className="text-[11px] text-stone-600 dark:text-stone-300 space-y-1 leading-relaxed">
              <li className="flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>角・筆先の角度 &gt; 35° は鋭さを自動保護</span>
              </li>
              <li className="flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>輪郭の自己反転・交差歪みを自動防止</span>
              </li>
            </ul>
          </div>

          <div className="mt-3 space-y-2">
            <button
              onClick={onRunEqualization}
              disabled={isEqualizing}
              className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all ${
                isLight
                  ? 'bg-emerald-700 text-white hover:bg-emerald-800 active:scale-98'
                  : 'bg-emerald-500 text-black hover:bg-emerald-400 active:scale-98'
              }`}
            >
              {isEqualizing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>線幅均一化処理中...</span>
                </>
              ) : (
                <>
                  <Scale className="w-3.5 h-3.5" />
                  <span>
                    {eqScope === 'all'
                      ? '全文字のストロークを均一化'
                      : eqScope === 'uneven'
                      ? '線幅偏り文字を均一化'
                      : '表示中文字のストロークを均一化'}
                  </span>
                </>
              )}
            </button>

            {lastEqualizationResult && (
              <div
                className={`text-[10px] p-2 rounded-lg text-center font-medium border ${
                  isLight
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                }`}
              >
                直近の実行結果: {lastEqualizationResult.equalizedGlyphsCount} 文字を均一化（細線補強:{' '}
                <span className="font-bold">{lastEqualizationResult.totalThinFixed}</span> 箇所 / 太線調整:{' '}
                <span className="font-bold">{lastEqualizationResult.totalThickFixed}</span> 箇所）
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
