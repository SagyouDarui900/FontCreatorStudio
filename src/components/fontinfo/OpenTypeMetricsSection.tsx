import React from 'react';
import { Database } from 'lucide-react';
import { FontMetadata } from '../../types';

export interface OpenTypeMetricsSectionProps {
  formData: FontMetadata;
  setFormData: React.Dispatch<React.SetStateAction<FontMetadata>>;
  isLight: boolean;
}

export const OpenTypeMetricsSection: React.FC<OpenTypeMetricsSectionProps> = React.memo(({
  formData,
  setFormData,
  isLight,
}) => {
  return (
    <div className="space-y-4 animate-fadeIn">
      <div
        className={`p-3 sm:p-3.5 rounded-xl border space-y-1.5 ${
          isLight ? 'bg-indigo-50/70 border-indigo-200 text-slate-800' : 'bg-indigo-950/40 border-indigo-800/60 text-slate-200'
        }`}
      >
        <div className="flex items-center gap-2 font-bold text-xs">
          <Database className="w-4 h-4 text-indigo-500 shrink-0" />
          <span>OpenType OS/2・hhea・post 詳細メタデータ</span>
        </div>
        <p className="text-[11px] opacity-85 leading-relaxed">
          Windows DirectWrite, macOS CoreText, AviUtl2 等の描画エンジンでの互換性やウエイト（太さ）、タイポグラフィ行間を決定づけるテーブル数値です。
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs">
        {/* Weight Class */}
        <div className="flex flex-col space-y-1">
          <label className={`font-bold text-[11px] sm:text-xs ${isLight ? 'text-emerald-950' : 'text-emerald-300'}`}>
            usWeightClass (ウェイト数値)
          </label>
          <select
            value={formData.usWeightClass ?? 400}
            onChange={(e) => setFormData({ ...formData, usWeightClass: Number(e.target.value) })}
            className={`w-full border rounded-lg px-3 py-2 sm:py-2 text-sm sm:text-xs transition-colors focus:outline-none focus:ring-1 ${
              isLight
                ? 'bg-white border-[#c8ded3] text-stone-800 focus:border-emerald-700 focus:ring-emerald-700'
                : 'bg-[#101813] border-[#2d4034] text-emerald-100 focus:border-emerald-500 focus:ring-emerald-500'
            }`}
          >
            <option value={100}>100 - Thin (極細)</option>
            <option value={200}>200 - Extra Light</option>
            <option value={300}>300 - Light (細字)</option>
            <option value={400}>400 - Regular (標準・通常)</option>
            <option value={500}>500 - Medium (中字)</option>
            <option value={600}>600 - Semi Bold (半太字)</option>
            <option value={700}>700 - Bold (太字)</option>
            <option value={800}>800 - Heavy / Extra Bold</option>
            <option value={900}>900 - Black (極太)</option>
          </select>
        </div>

        {/* Vendor ID */}
        <div className="flex flex-col space-y-1">
          <label className={`font-bold text-[11px] sm:text-xs ${isLight ? 'text-emerald-950' : 'text-emerald-300'}`}>
            achVendID (ベンダーID / 4文字)
          </label>
          <input
            type="text"
            maxLength={4}
            value={formData.vendorId || 'OTED'}
            onChange={(e) => setFormData({ ...formData, vendorId: e.target.value.toUpperCase() })}
            placeholder="OTED"
            className={`w-full border rounded-lg px-3 py-2 sm:py-2 text-sm sm:text-xs font-mono transition-colors focus:outline-none focus:ring-1 ${
              isLight
                ? 'bg-white border-[#c8ded3] text-stone-800 focus:border-emerald-700 focus:ring-emerald-700'
                : 'bg-[#101813] border-[#2d4034] text-emerald-100 focus:border-emerald-500 focus:ring-emerald-500'
            }`}
          />
        </div>

        {/* Typo Ascender */}
        <div className="flex flex-col space-y-1">
          <label className={`font-bold text-[11px] sm:text-xs ${isLight ? 'text-emerald-950' : 'text-emerald-300'}`}>
            sTypoAscender (OS/2 アセンダ)
          </label>
          <input
            type="number"
            value={formData.typoAscender ?? formData.ascender ?? 880}
            onChange={(e) => setFormData({ ...formData, typoAscender: Number(e.target.value) })}
            className={`w-full border rounded-lg px-3 py-2 sm:py-2 text-sm sm:text-xs font-mono transition-colors focus:outline-none focus:ring-1 ${
              isLight
                ? 'bg-white border-[#c8ded3] text-stone-800 focus:border-emerald-700 focus:ring-emerald-700'
                : 'bg-[#101813] border-[#2d4034] text-emerald-100 focus:border-emerald-500 focus:ring-emerald-500'
            }`}
          />
        </div>

        {/* Typo Descender */}
        <div className="flex flex-col space-y-1">
          <label className={`font-bold text-[11px] sm:text-xs ${isLight ? 'text-emerald-950' : 'text-emerald-300'}`}>
            sTypoDescender (OS/2 ディセンダ)
          </label>
          <input
            type="number"
            value={formData.typoDescender ?? formData.descender ?? -120}
            onChange={(e) => setFormData({ ...formData, typoDescender: Number(e.target.value) })}
            className={`w-full border rounded-lg px-3 py-2 sm:py-2 text-sm sm:text-xs font-mono transition-colors focus:outline-none focus:ring-1 ${
              isLight
                ? 'bg-white border-[#c8ded3] text-stone-800 focus:border-emerald-700 focus:ring-emerald-700'
                : 'bg-[#101813] border-[#2d4034] text-emerald-100 focus:border-emerald-500 focus:ring-emerald-500'
            }`}
          />
        </div>

        {/* Win Ascent */}
        <div className="flex flex-col space-y-1">
          <label className={`font-bold text-[11px] sm:text-xs ${isLight ? 'text-emerald-950' : 'text-emerald-300'}`}>
            usWinAscent (Windows 上部限界)
          </label>
          <input
            type="number"
            value={formData.winAscent ?? Math.max(formData.ascender ?? 880, 800)}
            onChange={(e) => setFormData({ ...formData, winAscent: Number(e.target.value) })}
            className={`w-full border rounded-lg px-3 py-2 sm:py-2 text-sm sm:text-xs font-mono transition-colors focus:outline-none focus:ring-1 ${
              isLight
                ? 'bg-white border-[#c8ded3] text-stone-800 focus:border-emerald-700 focus:ring-emerald-700'
                : 'bg-[#101813] border-[#2d4034] text-emerald-100 focus:border-emerald-500 focus:ring-emerald-500'
            }`}
          />
        </div>

        {/* Win Descent */}
        <div className="flex flex-col space-y-1">
          <label className={`font-bold text-[11px] sm:text-xs ${isLight ? 'text-emerald-950' : 'text-emerald-300'}`}>
            usWinDescent (Windows 下部限界)
          </label>
          <input
            type="number"
            value={formData.winDescent ?? Math.abs(formData.descender ?? -120)}
            onChange={(e) => setFormData({ ...formData, winDescent: Number(e.target.value) })}
            className={`w-full border rounded-lg px-3 py-2 sm:py-2 text-sm sm:text-xs font-mono transition-colors focus:outline-none focus:ring-1 ${
              isLight
                ? 'bg-white border-[#c8ded3] text-stone-800 focus:border-emerald-700 focus:ring-emerald-700'
                : 'bg-[#101813] border-[#2d4034] text-emerald-100 focus:border-emerald-500 focus:ring-emerald-500'
            }`}
          />
        </div>

        {/* Typo LineGap */}
        <div className="flex flex-col space-y-1">
          <label className={`font-bold text-[11px] sm:text-xs ${isLight ? 'text-emerald-950' : 'text-emerald-300'}`}>
            sTypoLineGap (追加行間)
          </label>
          <input
            type="number"
            value={formData.typoLineGap ?? formData.lineGap ?? 0}
            onChange={(e) => setFormData({ ...formData, typoLineGap: Number(e.target.value) })}
            className={`w-full border rounded-lg px-3 py-2 sm:py-2 text-sm sm:text-xs font-mono transition-colors focus:outline-none focus:ring-1 ${
              isLight
                ? 'bg-white border-[#c8ded3] text-stone-800 focus:border-emerald-700 focus:ring-emerald-700'
                : 'bg-[#101813] border-[#2d4034] text-emerald-100 focus:border-emerald-500 focus:ring-emerald-500'
            }`}
          />
        </div>

        {/* Italic Angle */}
        <div className="flex flex-col space-y-1">
          <label className={`font-bold text-[11px] sm:text-xs ${isLight ? 'text-emerald-950' : 'text-emerald-300'}`}>
            italicAngle (イタリック傾斜角)
          </label>
          <input
            type="number"
            step="0.5"
            value={formData.italicAngle ?? 0}
            onChange={(e) => setFormData({ ...formData, italicAngle: Number(e.target.value) })}
            className={`w-full border rounded-lg px-3 py-2 sm:py-2 text-sm sm:text-xs font-mono transition-colors focus:outline-none focus:ring-1 ${
              isLight
                ? 'bg-white border-[#c8ded3] text-stone-800 focus:border-emerald-700 focus:ring-emerald-700'
                : 'bg-[#101813] border-[#2d4034] text-emerald-100 focus:border-emerald-500 focus:ring-emerald-500'
            }`}
          />
        </div>
      </div>
    </div>
  );
});
