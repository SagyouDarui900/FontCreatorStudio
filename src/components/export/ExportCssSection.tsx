import React, { useState } from 'react';
import { FileCode, Check, Copy, ChevronDown, ChevronRight } from 'lucide-react';

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
  const [isExpanded, setIsExpanded] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 640 : true
  );

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="font-bold opacity-85 flex items-center space-x-1.5 py-1.5 sm:py-0.5 cursor-pointer text-left min-h-[36px] sm:min-h-0"
          aria-expanded={isExpanded}
        >
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-70" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-70" />
          )}
          <FileCode className="w-3.5 h-3.5 shrink-0" />
          <span>Webサイト用 CSS (@font-face)</span>
        </button>
        <button
          type="button"
          onClick={handleCopyCss}
          className={`px-2.5 py-1.5 sm:px-2 sm:py-0.5 min-h-[34px] sm:min-h-0 rounded-md text-[11px] sm:text-[10.5px] font-bold flex items-center space-x-1 shrink-0 cursor-pointer ${
            isLight
              ? 'bg-stone-200 hover:bg-stone-300 text-stone-700'
              : 'bg-[#202d24] hover:bg-[#283b2e] text-emerald-200'
          }`}
        >
          {copiedCss ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copiedCss ? 'コピー完了' : 'CSSをコピー'}</span>
        </button>
      </div>
      {isExpanded && (
        <pre
          className={`p-2.5 rounded-xl border font-mono text-[10.5px] overflow-x-auto select-all ${
            isLight ? 'bg-stone-50 border-stone-200 text-stone-800' : 'bg-[#101712] border-[#223025] text-emerald-200'
          }`}
        >
          {cssSnippet}
        </pre>
      )}
    </div>
  );
});

ExportCssSection.displayName = 'ExportCssSection';
