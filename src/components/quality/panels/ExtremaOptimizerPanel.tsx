import React from 'react';
import {
  Compass,
  ShieldCheck,
  X,
  SlidersHorizontal,
  Sliders,
  Layers,
  Check,
  RefreshCw,
} from 'lucide-react';
import { BatchExtremaOptimizationResult } from '../../../utils/qualityChecker';

export type ExtremaSensitivity = 'normal' | 'strict' | 'fine';
export type ExtremaScope = 'all' | 'missing' | 'filtered';

interface ExtremaOptimizerPanelProps {
  isOpen: boolean;
  isLight: boolean;
  onClose: () => void;
  extAlignAxis: boolean;
  setExtAlignAxis: (align: boolean) => void;
  extSensitivity: ExtremaSensitivity;
  setExtSensitivity: (sens: ExtremaSensitivity) => void;
  extScope: ExtremaScope;
  setExtScope: (scope: ExtremaScope) => void;
  isOptimizingExtrema: boolean;
  onRunExtremaOptimization: () => void;
  lastExtremaResult: BatchExtremaOptimizationResult | null;
  totalGlyphsChecked: number;
  missingExtremaCount: number;
  filteredCount: number;
}

export const ExtremaOptimizerPanel: React.FC<ExtremaOptimizerPanelProps> = ({
  isOpen,
  isLight,
  onClose,
  extAlignAxis,
  setExtAlignAxis,
  extSensitivity,
  setExtSensitivity,
  extScope,
  setExtScope,
  isOptimizingExtrema,
  onRunExtremaOptimization,
  lastExtremaResult,
  totalGlyphsChecked,
  missingExtremaCount,
  filteredCount,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className={`px-5 py-4 border-b transition-all text-xs ${
        isLight
          ? 'bg-cyan-50/70 border-cyan-200 text-stone-800'
          : 'bg-[#0e1c20] border-[#1d3840] text-cyan-100'
      }`}
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center space-x-2.5">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center border shrink-0 ${
              isLight
                ? 'bg-cyan-700 text-white border-cyan-800'
                : 'bg-cyan-500 text-black border-cyan-400'
            }`}
          >
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-sm text-stone-900 dark:text-white">
                極点最適化（ベジェ曲線 Extrema ノード自動追加 &amp; 軸整列）
              </h3>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 ${
                  isLight
                    ? 'bg-cyan-100/80 text-cyan-900 border-cyan-300'
                    : 'bg-cyan-950/80 text-cyan-200 border-cyan-700'
                }`}
              >
                <ShieldCheck className="w-3 h-3" />
                TrueType / OpenType 規格準拠
              </span>
            </div>
            <p className="text-xs text-stone-600 dark:text-stone-300 mt-0.5 leading-relaxed">
              3次ベジェ曲線の水平・垂直極点（dx/dt = 0 または dy/dt = 0）を幾何学的に検出し、輪郭形状を 100% 保持したまま極点上にノードを追加します。
              制御ハンドルを軸（水平・垂直）に数学的に正しく整列させることで、フォントレンダリングやヒンティングの精度を最大化します。
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className={`p-1.5 rounded-lg border transition-colors ${
            isLight
              ? 'bg-white border-stone-200 text-stone-400 hover:text-stone-700'
              : 'bg-[#142327] border-[#223f49] text-stone-400 hover:text-white'
          }`}
          title="パネルを閉じる"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
        {/* Option 1: Handle Axis Alignment */}
        <div
          className={`p-3 rounded-xl border flex flex-col justify-between ${
            isLight ? 'bg-white border-cyan-200/80' : 'bg-[#112126] border-[#1d3840]'
          }`}
        >
          <div className="text-[11px] font-bold text-stone-500 dark:text-stone-400 mb-1.5 flex items-center space-x-1">
            <SlidersHorizontal className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
            <span>ハンドル軸整列</span>
          </div>
          <div className="space-y-1">
            {[
              {
                val: true,
                label: '水平・垂直スナップ（推奨）',
                desc: '極点ノードの制御ハンドルを水平または垂直に揃えます。フォント規格準拠',
              },
              {
                val: false,
                label: '元の接線角度を維持',
                desc: '極点位置にノードを追加しつつ、分割前の微小な接線傾きをそのまま保ちます',
              },
            ].map((opt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setExtAlignAxis(opt.val)}
                className={`w-full text-left p-2 rounded-lg border transition-all text-xs ${
                  extAlignAxis === opt.val
                    ? isLight
                      ? 'bg-cyan-50 border-cyan-500 text-cyan-950 font-bold ring-1 ring-cyan-500/20'
                      : 'bg-cyan-950/60 border-cyan-500 text-cyan-200 font-bold ring-1 ring-cyan-500/30'
                    : isLight
                    ? 'border-transparent hover:bg-stone-50 text-stone-700'
                    : 'border-transparent hover:bg-[#162a30] text-stone-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{opt.label}</span>
                  {extAlignAxis === opt.val && <Check className="w-3.5 h-3.5 text-cyan-600" />}
                </div>
                <div className="text-[10px] text-stone-500 dark:text-stone-400 font-normal mt-0.5 leading-snug">
                  {opt.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Option 2: Sensitivity / Distance threshold */}
        <div
          className={`p-3 rounded-xl border flex flex-col justify-between ${
            isLight ? 'bg-white border-cyan-200/80' : 'bg-[#112126] border-[#1d3840]'
          }`}
        >
          <div className="text-[11px] font-bold text-stone-500 dark:text-stone-400 mb-1.5 flex items-center space-x-1">
            <Sliders className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
            <span>検出感度（最小ノード間隔）</span>
          </div>
          <div className="space-y-1">
            {[
              {
                id: 'normal' as ExtremaSensitivity,
                label: '標準（5px・推奨）',
                desc: '端点から5px以上離れた極点にノードを追加。適正なノード数を維持',
              },
              {
                id: 'strict' as ExtremaSensitivity,
                label: '厳格（8px）',
                desc: '明瞭な外端・大きな曲線のみを対象とし、過度なノード追加を防止',
              },
              {
                id: 'fine' as ExtremaSensitivity,
                label: '高精度（3px）',
                desc: '微小なハネや装飾の極点も網羅的にノード化（緻密な字形向け）',
              },
            ].map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setExtSensitivity(s.id)}
                className={`w-full text-left p-2 rounded-lg border transition-all text-xs ${
                  extSensitivity === s.id
                    ? isLight
                      ? 'bg-cyan-50 border-cyan-500 text-cyan-950 font-bold ring-1 ring-cyan-500/20'
                      : 'bg-cyan-950/60 border-cyan-500 text-cyan-200 font-bold ring-1 ring-cyan-500/30'
                    : isLight
                    ? 'border-transparent hover:bg-stone-50 text-stone-700'
                    : 'border-transparent hover:bg-[#162a30] text-stone-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{s.label}</span>
                  {extSensitivity === s.id && <Check className="w-3.5 h-3.5 text-cyan-600" />}
                </div>
                <div className="text-[10px] text-stone-500 dark:text-stone-400 font-normal mt-0.5 leading-snug">
                  {s.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Option 3: Target Scope & Execution */}
        <div
          className={`p-3 rounded-xl border flex flex-col justify-between ${
            isLight ? 'bg-white border-cyan-200/80' : 'bg-[#112126] border-[#1d3840]'
          }`}
        >
          <div>
            <div className="text-[11px] font-bold text-stone-500 dark:text-stone-400 mb-1.5 flex items-center space-x-1">
              <Layers className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
              <span>対象文字の範囲</span>
            </div>
            <div className="space-y-1">
              {[
                {
                  id: 'all' as ExtremaScope,
                  label: '全文字一括（全グリフ）',
                  desc: `全文字（${totalGlyphsChecked} 文字）の極点を最適化`,
                },
                {
                  id: 'missing' as ExtremaScope,
                  label: '極点ノード不足が検出された文字のみ',
                  desc: `指摘を受けた文字（${missingExtremaCount} 文字）`,
                },
                {
                  id: 'filtered' as ExtremaScope,
                  label: '現在表示・検索中の文字',
                  desc: `リスト表示中の文字（${filteredCount} 件）`,
                },
              ].map((sc) => (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => setExtScope(sc.id)}
                  className={`w-full text-left p-1.5 rounded-lg border transition-all text-xs ${
                    extScope === sc.id
                      ? isLight
                        ? 'bg-cyan-50 border-cyan-500 text-cyan-950 font-bold ring-1 ring-cyan-500/20'
                        : 'bg-cyan-950/60 border-cyan-500 text-cyan-200 font-bold ring-1 ring-cyan-500/30'
                      : isLight
                      ? 'border-transparent hover:bg-stone-50 text-stone-700'
                      : 'border-transparent hover:bg-[#162a30] text-stone-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{sc.label}</span>
                    {extScope === sc.id && <Check className="w-3.5 h-3.5 text-cyan-600" />}
                  </div>
                  <div className="text-[10px] text-stone-500 dark:text-stone-400 font-normal mt-0.5 leading-snug">
                    {sc.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 space-y-2">
            <button
              onClick={onRunExtremaOptimization}
              disabled={isOptimizingExtrema}
              className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all ${
                isLight
                  ? 'bg-cyan-700 text-white hover:bg-cyan-800 active:scale-98'
                  : 'bg-cyan-500 text-black hover:bg-cyan-400 active:scale-98'
              }`}
            >
              {isOptimizingExtrema ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>極点最適化処理中...</span>
                </>
              ) : (
                <>
                  <Compass className="w-3.5 h-3.5" />
                  <span>
                    {extScope === 'all'
                      ? '全文字の極点を最適化'
                      : extScope === 'missing'
                      ? '極点不足文字を最適化'
                      : '表示中文字の極点を最適化'}
                  </span>
                </>
              )}
            </button>

            {lastExtremaResult && (
              <div
                className={`text-[10px] p-2 rounded-lg text-center font-medium border ${
                  isLight
                    ? 'bg-cyan-50 text-cyan-900 border-cyan-200'
                    : 'bg-cyan-950/60 text-cyan-200 border-cyan-800'
                }`}
              >
                直近の実行結果: {lastExtremaResult.optimizedGlyphsCount} 文字の極点に{' '}
                <span className="font-bold">{lastExtremaResult.totalNodesAdded}</span> 箇所のノードを追加・最適化
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
