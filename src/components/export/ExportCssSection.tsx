import React, { useState } from 'react';
import { FileCode, Check, Copy, ChevronDown, ChevronRight } from 'lucide-react';
import { getThemeClasses, ThemeClasses } from '../../utils/theme';

export interface ExportCssSectionProps {
  isLight: boolean;
  themeClasses?: ThemeClasses;
  cssSnippet: string;
  copiedCss: boolean;
  handleCopyCss: () => void;
}

export const ExportCssSection: React.FC<ExportCssSectionProps> = React.memo(({
  isLight,
  themeClasses: propThemeClasses,
  cssSnippet,
  copiedCss,
  handleCopyCss,
}) => {
  const themeClasses = propThemeClasses || getThemeClasses(isLight ? 'light' : 'dark');
  const [isExpanded, setIsExpanded] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 640 : true
  );

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="text-xs font-bold flex items-center gap-1.5 py-1.5 sm:py-0.5 cursor-pointer text-left min-h-[36px] sm:min-h-0"
          aria-expanded={isExpanded}
        >
          {isExpanded ? (
            <ChevronDown className={`w-3.5 h-3.5 shrink-0 opacity-70 ${themeClasses.accentText}`} />
          ) : (
            <ChevronRight className={`w-3.5 h-3.5 shrink-0 opacity-70 ${themeClasses.accentText}`} />
          )}
          <FileCode className={`w-3.5 h-3.5 shrink-0 ${themeClasses.accentText}`} />
          <span>Webサイト用 CSS (@font-face)</span>
        </button>
        <button
          type="button"
          onClick={handleCopyCss}
          className={`px-2.5 py-1.5 sm:px-2 sm:py-0.5 min-h-[34px] sm:min-h-0 rounded-md border text-[11px] sm:text-[10.5px] font-bold flex items-center space-x-1 shrink-0 cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.activeToolHover}`}
        >
          {copiedCss ? <Check className={`w-3.5 h-3.5 ${themeClasses.accentText}`} /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copiedCss ? 'コピー完了' : 'CSSをコピー'}</span>
        </button>
      </div>
      {isExpanded && (
        <pre
          className={`p-3 rounded-xl border font-mono text-[10.5px] overflow-x-auto select-all ${themeClasses.subtoolbarBg}`}
        >
          {cssSnippet}
        </pre>
      )}
    </div>
  );
});

ExportCssSection.displayName = 'ExportCssSection';
