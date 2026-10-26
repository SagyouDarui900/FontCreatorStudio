import React from 'react';
import { FontMetadata, FontProject } from '../../types';

interface MetricsSettingsSectionProps {
  isLight: boolean;
  formData: FontMetadata;
  setFormData: React.Dispatch<React.SetStateAction<FontMetadata>>;
  project: FontProject;
  scaleGlyphsOnResize: boolean;
  setScaleGlyphsOnResize: (val: boolean) => void;
  handleUpmChange: (newUpm: number) => void;
}

export const MetricsSettingsSection: React.FC<MetricsSettingsSectionProps> = ({
  isLight,
  formData,
  setFormData,
  project,
  scaleGlyphsOnResize,
  setScaleGlyphsOnResize,
  handleUpmChange,
}) => {
  return (
    <div className={`border-t pt-3 sm:pt-3.5 ${isLight ? 'border-[#d8e6df]' : 'border-[#25362b]'}`}>
      <div className="flex items-center justify-between mb-2">
        <span
          className={`text-[11px] font-bold uppercase tracking-wider block ${
            isLight ? 'text-emerald-950' : 'text-emerald-300'
          }`}
        >
          EMメトリクス (単位: FUnit)
        </span>
        <span className="text-[10px] text-stone-500 dark:text-stone-400">標準UPM: 1000</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
        <div className="flex flex-col space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-1">
            <label className={`text-xs font-medium truncate ${isLight ? 'text-stone-600' : 'text-emerald-400'}`}>
              UPM (サイズ)
            </label>
            <div className="flex items-center gap-1 shrink-0">
              {[1000, 1200, 1500, 2048].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleUpmChange(val)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition-all ${
                    (formData.unitsPerEm ?? 1000) === val
                      ? 'bg-emerald-600 text-white font-bold border-emerald-600'
                      : isLight
                      ? 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                      : 'bg-[#152119] border-[#2d4034] text-emerald-300 hover:bg-[#1d2d23]'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>
          <input
            type="number"
            value={formData.unitsPerEm ?? 1000}
            onChange={(e) => handleUpmChange(Number(e.target.value) || 1000)}
            className={`border rounded-lg p-2.5 sm:p-2 text-sm font-mono focus:outline-none focus:ring-1 ${
              isLight
                ? 'bg-white border-[#c8ded3] text-stone-800 focus:border-emerald-700 focus:ring-emerald-700'
                : 'bg-[#101813] border-[#2d4034] text-emerald-100 focus:border-emerald-500 focus:ring-emerald-500'
            }`}
          />
        </div>

        <div className="flex flex-col space-y-1">
          <label className={`text-xs font-medium ${isLight ? 'text-stone-600' : 'text-emerald-400'}`}>
            アセンダ (Ascender)
          </label>
          <input
            type="number"
            value={formData.ascender ?? 800}
            onChange={(e) => setFormData({ ...formData, ascender: Number(e.target.value) || 800 })}
            className={`border rounded-lg p-2.5 sm:p-2 text-sm font-mono focus:outline-none focus:ring-1 ${
              isLight
                ? 'bg-white border-[#c8ded3] text-stone-800 focus:border-emerald-700 focus:ring-emerald-700'
                : 'bg-[#101813] border-[#2d4034] text-emerald-100 focus:border-emerald-500 focus:ring-emerald-500'
            }`}
          />
        </div>

        <div className="flex flex-col space-y-1">
          <label className={`text-xs font-medium ${isLight ? 'text-stone-600' : 'text-emerald-400'}`}>
            ディセンダ (Descender)
          </label>
          <input
            type="number"
            value={formData.descender ?? -200}
            onChange={(e) => setFormData({ ...formData, descender: Number(e.target.value) || -200 })}
            className={`border rounded-lg p-2.5 sm:p-2 text-sm font-mono focus:outline-none focus:ring-1 ${
              isLight
                ? 'bg-white border-[#c8ded3] text-stone-800 focus:border-emerald-700 focus:ring-emerald-700'
                : 'bg-[#101813] border-[#2d4034] text-emerald-100 focus:border-emerald-500 focus:ring-emerald-500'
            }`}
          />
        </div>
      </div>

      {/* Dynamic Scaling Option when UPM is modified */}
      {(formData.unitsPerEm ?? 1000) !== (project.metadata.unitsPerEm || 1000) && (
        <div
          className={`mt-2 p-3 rounded-lg border text-xs space-y-1.5 transition-all ${
            isLight
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
              : 'bg-[#15231a] border-emerald-800 text-emerald-200'
          }`}
        >
          <label className="flex items-start gap-2 cursor-pointer font-medium">
            <input
              type="checkbox"
              checked={scaleGlyphsOnResize}
              onChange={(e) => setScaleGlyphsOnResize(e.target.checked)}
              className="mt-0.5 accent-emerald-600 rounded"
            />
            <div>
              <span className="font-bold">
                既存グリフの輪郭・送り幅もキャンバス比率に合わせて自動拡大縮小する
              </span>
              <div className="text-[11px] opacity-80 mt-0.5 font-normal">
                {scaleGlyphsOnResize
                  ? `現在の倍率: ×${(
                      (formData.unitsPerEm ?? 1000) / (project.metadata.unitsPerEm || 1000)
                    ).toFixed(3)} （全頂点・ベジェ制御点ハンドル・送り幅を比例変換）`
                  : 'チェックOFF: 既存グリフの座標・サイズは維持し、外枠キャンバス領域（余白）のみを変更します'}
              </div>
            </div>
          </label>
        </div>
      )}

      {/* Windows 11 & Japanese OS/2 Compatibility Note */}
      <div
        className={`p-3 rounded-xl border text-[11px] space-y-1 mt-3.5 ${
          isLight
            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
            : 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
        }`}
      >
        <div className="font-bold flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shrink-0" />
          <span>Windows 11 / Mac 日本語フォント規格適合設定</span>
        </div>
        <p className="text-[10.5px] opacity-85 leading-relaxed">
          エクスポート時に、OS/2テーブル（Shift-JIS 932コードページフラグ）、DirectWrite行間クリップ防止メトリクス、縦書き代替グリフ、および日・英バイリンガル名テーブルが自動構成されます。
        </p>
      </div>
    </div>
  );
};
