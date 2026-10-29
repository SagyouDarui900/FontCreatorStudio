import React from 'react';
import { Check, Maximize2, ShieldCheck } from 'lucide-react';

export interface ExportFormatSectionProps {
  isLight: boolean;
  format: 'ttf' | 'otf';
  setFormat: (format: 'ttf' | 'otf') => void;
  sizePreset: 'raw' | 'standard_jp' | 'custom';
  setSizePreset: (preset: 'raw' | 'standard_jp' | 'custom') => void;
  customScale: number;
  setCustomScale: (scale: number) => void;
  effectiveScale: number;
  balanceSideBearings: boolean;
  setBalanceSideBearings: (balance: boolean) => void;
  mergeOverlaps: boolean;
  setMergeOverlaps: (merge: boolean) => void;
}

export const ExportFormatSection: React.FC<ExportFormatSectionProps> = React.memo(({
  isLight,
  format,
  setFormat,
  sizePreset,
  setSizePreset,
  customScale,
  setCustomScale,
  effectiveScale,
  balanceSideBearings,
  setBalanceSideBearings,
  mergeOverlaps,
  setMergeOverlaps,
}) => {
  return (
    <>
      {/* Format Selection */}
      <div className="space-y-1.5">
        <label className="font-bold opacity-80 flex items-center justify-between">
          <span>ファイル形式を選択</span>
          <span className="font-normal opacity-70">AviUtl・動画編集・一般利用: TTF推奨</span>
        </label>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setFormat('ttf')}
            className={`p-2.5 rounded-xl border text-left transition-all ${
              format === 'ttf'
                ? isLight
                  ? 'border-emerald-600 bg-emerald-50/80 text-emerald-950 ring-2 ring-emerald-500/20'
                  : 'border-emerald-500 bg-emerald-950/60 text-emerald-100 ring-2 ring-emerald-500/30'
                : isLight
                ? 'border-stone-200 hover:bg-stone-50 text-stone-700'
                : 'border-[#25362b] hover:bg-[#1c2920] text-emerald-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm">.TTF (TrueType)</span>
              {format === 'ttf' && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
            </div>
            <p className="mt-0.5 text-[11px] opacity-75 leading-relaxed jp-wrap">
              AviUtl2、Premiere、Windows、Mac、iPad、Android全対応（最も確実）
            </p>
          </button>

          <button
            type="button"
            onClick={() => setFormat('otf')}
            className={`p-2.5 rounded-xl border text-left transition-all ${
              format === 'otf'
                ? isLight
                  ? 'border-emerald-600 bg-emerald-50/80 text-emerald-950 ring-2 ring-emerald-500/20'
                  : 'border-emerald-500 bg-emerald-950/60 text-emerald-100 ring-2 ring-emerald-500/30'
                : isLight
                ? 'border-stone-200 hover:bg-stone-50 text-stone-700'
                : 'border-[#25362b] hover:bg-[#1c2920] text-emerald-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm">.OTF (OpenType)</span>
              {format === 'otf' && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
            </div>
            <p className="mt-0.5 text-[11px] opacity-75 leading-relaxed jp-wrap">
              InDesign、Illustrator等のDTP・グラフィックデザインソフト向け
            </p>
          </button>
        </div>
      </div>

      {/* Size & Em-box Optimization */}
      <div
        className={`p-3.5 rounded-xl border space-y-3 ${
          isLight ? 'bg-stone-50/90 border-stone-200' : 'bg-[#18241d] border-[#25362b]'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Maximize2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-bold text-xs text-stone-900 dark:text-emerald-200">
              文字サイズ・仮想ボディ比率の最適化
            </span>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
            倍率: {Math.round(effectiveScale * 100)}%
          </span>
        </div>

        <p className="text-[11px] opacity-80 leading-relaxed jp-wrap">
          キャンバス上の下絵（手本フォント）や字面枠に合わせて描いた場合は、<strong>「原寸のまま (100%)」</strong>を選ぶとキャンバスの見た目と全く同じ位置・サイズで正確に出力されます。キャンバス上で小さめに描いた文字を市販フォント同等の大粒サイズに自動拡大したい場合は「和文拡大 (135%)」をお選びください。
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setSizePreset('raw')}
            className={`p-2.5 rounded-lg border text-center transition-all min-w-0 flex flex-col items-center justify-center ${
              sizePreset === 'raw'
                ? isLight
                  ? 'border-emerald-600 bg-emerald-100/70 text-emerald-950 font-bold ring-1 ring-emerald-500'
                  : 'border-emerald-500 bg-emerald-900/60 text-emerald-100 font-bold ring-1 ring-emerald-500'
                : isLight
                ? 'border-stone-200 hover:bg-white text-stone-700'
                : 'border-[#283b2e] hover:bg-[#202d24] text-emerald-300'
            }`}
          >
            <div className="text-xs font-bold">原寸 (100%)</div>
            <div className="text-[10px] opacity-75 font-normal mt-0.5 truncate">下絵・枠通り【推奨】</div>
          </button>

          <button
            type="button"
            onClick={() => setSizePreset('standard_jp')}
            className={`p-2.5 rounded-lg border text-center transition-all min-w-0 flex flex-col items-center justify-center ${
              sizePreset === 'standard_jp'
                ? isLight
                  ? 'border-emerald-600 bg-emerald-100/70 text-emerald-950 font-bold ring-1 ring-emerald-500'
                  : 'border-emerald-500 bg-emerald-900/60 text-emerald-100 font-bold ring-1 ring-emerald-500'
                : isLight
                ? 'border-stone-200 hover:bg-white text-stone-700'
                : 'border-[#283b2e] hover:bg-[#202d24] text-emerald-300'
            }`}
          >
            <div className="text-xs font-bold">和文拡大 (135%)</div>
            <div className="text-[10px] opacity-75 font-normal mt-0.5 truncate">動画・AviUtl等</div>
          </button>

          <button
            type="button"
            onClick={() => setSizePreset('custom')}
            className={`p-2.5 rounded-lg border text-center transition-all min-w-0 flex flex-col items-center justify-center ${
              sizePreset === 'custom'
                ? isLight
                  ? 'border-emerald-600 bg-emerald-100/70 text-emerald-950 font-bold ring-1 ring-emerald-500'
                  : 'border-emerald-500 bg-emerald-900/60 text-emerald-100 font-bold ring-1 ring-emerald-500'
                : isLight
                ? 'border-stone-200 hover:bg-white text-stone-700'
                : 'border-[#283b2e] hover:bg-[#202d24] text-emerald-300'
            }`}
          >
            <div className="text-xs font-bold">カスタム倍率</div>
            <div className="text-[10px] opacity-75 font-normal mt-0.5">{Math.round(customScale * 100)}%</div>
          </button>
        </div>

        {sizePreset === 'custom' && (
          <div className="pt-2 flex items-center space-x-3">
            <span className="text-[11px] opacity-70 shrink-0">縮小 (80%)</span>
            <input
              type="range"
              min="0.8"
              max="1.8"
              step="0.05"
              value={customScale}
              onChange={(e) => setCustomScale(parseFloat(e.target.value))}
              className="flex-1 accent-emerald-600 cursor-pointer"
            />
            <span className="text-[11px] opacity-70 shrink-0">拡大 (180%)</span>
          </div>
        )}
      </div>

      {/* Visual Fidelity & Vector Purity */}
      <div
        className={`p-3.5 rounded-xl border space-y-2.5 ${
          isLight ? 'bg-stone-50/90 border-stone-200' : 'bg-[#18241d] border-[#25362b]'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-bold text-xs text-stone-900 dark:text-emerald-200">
              ベクター原画の忠実再現（筆跡・カーブ保持）
            </span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
            ベクターデータ保持
          </span>
        </div>
        <p className="text-[11px] opacity-80 leading-relaxed">
          TrueType標準のNon-Zero Winding規則に準拠し、描いた時の筆圧、止め・はね・はらい、滑らかな曲線をラスター劣化させずにそのままフォントファイルへ直接コンパイルします。
        </p>

        <div className="pt-1 flex flex-col space-y-2">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={balanceSideBearings}
              onChange={(e) => setBalanceSideBearings(e.target.checked)}
              className="w-4 h-4 rounded accent-emerald-600 cursor-pointer"
            />
            <span className="text-[11px] text-stone-800 dark:text-emerald-200">
              文字の左右余白（LSB/RSB）を均等にセンタリング補正（左寄りを解消）
            </span>
          </label>

          <label className="flex items-start space-x-2 cursor-pointer p-1.5 rounded-lg hover:bg-emerald-500/10 transition-colors">
            <input
              type="checkbox"
              checked={mergeOverlaps}
              onChange={(e) => setMergeOverlaps(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded accent-emerald-600 cursor-pointer shrink-0"
            />
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-stone-800 dark:text-emerald-200">
                一筆書き・重なり白抜き防止（交差輪郭を自動結合して中抜けを解消）
              </span>
              <span className="text-[10px] text-stone-500 dark:text-stone-400">
                手書き文字や一筆書きでループが重なった部分が白く抜けるのを防ぎ、TrueType標準の外輪郭に一体化します
              </span>
            </div>
          </label>
        </div>
      </div>
    </>
  );
});

ExportFormatSection.displayName = 'ExportFormatSection';
