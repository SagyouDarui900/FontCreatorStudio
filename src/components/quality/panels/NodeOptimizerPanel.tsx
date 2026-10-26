import React from 'react';
import {
  Sparkles,
  ShieldCheck,
  X,
  SlidersHorizontal,
  Layers,
  Check,
  RefreshCw,
} from 'lucide-react';
import { BatchNodeOptimizationResult } from '../../../utils/qualityChecker';

export type OptimizationLevel = 'mild' | 'normal' | 'strong';
export type OptimizationScope = 'all' | 'excessive' | 'filtered';

interface NodeOptimizerPanelProps {
  isOpen: boolean;
  isLight: boolean;
  onClose: () => void;
  optLevel: OptimizationLevel;
  setOptLevel: (lvl: OptimizationLevel) => void;
  optScope: OptimizationScope;
  setOptScope: (scope: OptimizationScope) => void;
  isOptimizing: boolean;
  onRunOptimization: () => void;
  lastOptimizationResult: BatchNodeOptimizationResult | null;
  totalGlyphsChecked: number;
  excessiveNodesCount: number;
  filteredCount: number;
}

export const NodeOptimizerPanel: React.FC<NodeOptimizerPanelProps> = ({
  isOpen,
  isLight,
  onClose,
  optLevel,
  setOptLevel,
  optScope,
  setOptScope,
  isOptimizing,
  onRunOptimization,
  lastOptimizationResult,
  totalGlyphsChecked,
  excessiveNodesCount,
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
                ? 'bg-emerald-600 text-white border-emerald-700'
                : 'bg-emerald-500 text-black border-emerald-400'
            }`}
          >
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-sm text-stone-900 dark:text-white">
                ノード最適化（冗長点の間引き &amp; パス平滑化）
              </h3>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 ${
                  isLight
                    ? 'bg-emerald-100/80 text-emerald-800 border-emerald-300'
                    : 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                }`}
              >
                <ShieldCheck className="w-3 h-3" />
                形状保護保証
              </span>
            </div>
            <p className="text-xs text-stone-600 dark:text-stone-300 mt-0.5 leading-relaxed">
              ほぼ直線上に並ぶ不要な中間点や重複ノードを間引き、文字の輪郭パスを美しく滑らかに整流します。
              角（トメ・ハネ・コーナー）や直線の張り、縦横比、曲率は厳格に保護されます。
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
        {/* Option 1: Optimization Strength (Level) */}
        <div
          className={`p-3 rounded-xl border flex flex-col justify-between ${
            isLight ? 'bg-white border-emerald-200/80' : 'bg-[#142319] border-[#223d2b]'
          }`}
        >
          <div className="text-[11px] font-bold text-stone-500 dark:text-stone-400 mb-1.5 flex items-center space-x-1">
            <SlidersHorizontal className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span>最適化の強度</span>
          </div>
          <div className="space-y-1">
            {[
              {
                id: 'mild' as OptimizationLevel,
                label: 'マイルド（形状変化 0%）',
                desc: '直線上の共線ノードと重複点のみを除去し、文字形状を保持します。',
              },
              {
                id: 'normal' as OptimizationLevel,
                label: '標準（推奨・形状保持 99.8%）',
                desc: '直線上の冗長ノード除去および曲線の手ブレを整流',
              },
              {
                id: 'strong' as OptimizationLevel,
                label: '強力（形状保持 99.0%）',
                desc: '密集したノードを間引き、パスを軽量化します。',
              },
            ].map((lvl) => (
              <button
                key={lvl.id}
                type="button"
                onClick={() => setOptLevel(lvl.id)}
                className={`w-full text-left p-2 rounded-lg border transition-all text-xs ${
                  optLevel === lvl.id
                    ? isLight
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold ring-1 ring-emerald-500/20'
                      : 'bg-emerald-950/60 border-emerald-500 text-emerald-200 font-bold ring-1 ring-emerald-500/30'
                    : isLight
                    ? 'border-transparent hover:bg-stone-50 text-stone-700'
                    : 'border-transparent hover:bg-[#1a2c20] text-stone-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{lvl.label}</span>
                  {optLevel === lvl.id && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                </div>
                <div className="text-[10px] text-stone-500 dark:text-stone-400 font-normal mt-0.5 leading-snug">
                  {lvl.desc}
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
                id: 'all' as OptimizationScope,
                label: 'すべての文字（全文字一括）',
                desc: `フォントプロジェクト内の全登録グリフ（${totalGlyphsChecked} 文字）`,
              },
              {
                id: 'excessive' as OptimizationScope,
                label: '過剰ノードが検出された文字のみ',
                desc: `品質検査でノード数過剰と判定された文字（${excessiveNodesCount} 文字）`,
              },
              {
                id: 'filtered' as OptimizationScope,
                label: '現在表示・検索中の文字',
                desc: `リストに表示されている指摘文字（${filteredCount} 件）`,
              },
            ].map((sc) => (
              <button
                key={sc.id}
                type="button"
                onClick={() => setOptScope(sc.id)}
                className={`w-full text-left p-2 rounded-lg border transition-all text-xs ${
                  optScope === sc.id
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
                  {optScope === sc.id && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                </div>
                <div className="text-[10px] text-stone-500 dark:text-stone-400 font-normal mt-0.5 leading-snug">
                  {sc.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Action Column & Guarantees */}
        <div
          className={`p-3 rounded-xl border flex flex-col justify-between ${
            isLight ? 'bg-white border-emerald-200/80' : 'bg-[#142319] border-[#223d2b]'
          }`}
        >
          <div>
            <div className="text-[11px] font-bold text-stone-500 dark:text-stone-400 mb-1.5 flex items-center space-x-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span>形状保護セーフガード</span>
            </div>
            <ul className="text-[11px] text-stone-600 dark:text-stone-300 space-y-1 leading-relaxed">
              <li className="flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>トメ・ハネ・鋭角コーナーを 100% 保持</span>
              </li>
              <li className="flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>バウンディングボックスのズレ ≤ 1.5px (0.15%)</span>
              </li>
              <li className="flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>角筆などの直線図形は角ノードのみ保持</span>
              </li>
              <li className="flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>いつでも元に戻す (Ctrl+Z) 可能</span>
              </li>
            </ul>
          </div>

          <div className="mt-3 space-y-2">
            <button
              onClick={onRunOptimization}
              disabled={isOptimizing}
              className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all ${
                isLight
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-98'
                  : 'bg-emerald-500 text-black hover:bg-emerald-400 active:scale-98'
              }`}
            >
              {isOptimizing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>最適化処理中...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {optScope === 'all'
                      ? '全文字のノードを最適化'
                      : optScope === 'excessive'
                      ? '過剰ノード文字を最適化'
                      : '表示中文字のノードを最適化'}
                  </span>
                </>
              )}
            </button>

            {lastOptimizationResult && (
              <div
                className={`text-[10px] p-2 rounded-lg text-center font-medium border ${
                  isLight
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                }`}
              >
                直近の実行結果: {lastOptimizationResult.optimizedGlyphsCount} 文字で{' '}
                <span className="font-bold">{lastOptimizationResult.totalReducedNodes}</span> 個のノードを削減（-
                {lastOptimizationResult.reductionPercentage}%）
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
