import React from 'react';
import { FileCode, Check, Copy } from 'lucide-react';

export interface ExportCssSectionProps {
  isLight: boolean;
  cssSnippet: string;
  copiedCss: boolean;
  handleCopyCss: () => void;
}

export const ExportCssSection: React.FC<ExportCssSectionProps> = React.memo(({
  isLight,
  cssSnippet,
  copiedCss,
  handleCopyCss,
}) => {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="font-bold opacity-80 flex items-center space-x-1.5">
          <FileCode className="w-3.5 h-3.5" />
          <span>Webサイト用 CSS (@font-face)</span>
        </label>
        <button
          type="button"
          onClick={handleCopyCss}
          className={`px-2 py-0.5 rounded text-[10.5px] font-bold flex items-center space-x-1 transition-colors ${
            isLight
              ? 'bg-stone-200 hover:bg-stone-300 text-stone-700'
              : 'bg-[#202d24] hover:bg-[#283b2e] text-emerald-200'
          }`}
        >
          {copiedCss ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
          <span>{copiedCss ? 'コピー完了' : 'CSSをコピー'}</span>
        </button>
      </div>
      <pre
        className={`p-2.5 rounded-xl border font-mono text-[10.5px] overflow-x-auto select-all ${
          isLight ? 'bg-stone-50 border-stone-200 text-stone-800' : 'bg-[#101712] border-[#223025] text-emerald-200'
        }`}
      >
        {cssSnippet}
      </pre>
    </div>
  );
});

ExportCssSection.displayName = 'ExportCssSection';
