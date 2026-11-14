import React from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { ThemeClasses, getThemeClasses } from '../../../utils/theme';

export interface QualityModalFooterProps {
  isLight: boolean;
  themeClasses?: ThemeClasses;
  isFullscreen: boolean;
  setIsFullscreen: (fn: (prev: boolean) => boolean) => void;
  onClose: () => void;
}

export const QualityModalFooter: React.FC<QualityModalFooterProps> = ({
  isLight,
  themeClasses: passedThemeClasses,
  isFullscreen,
  setIsFullscreen,
  onClose,
}) => {
  const themeClasses = passedThemeClasses ?? getThemeClasses(isLight ? 'light' : 'dark');
  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between px-5 py-3 border-t text-xs gap-3 shrink-0 ${themeClasses.headerBg}`}
    >
      <div className={`flex flex-wrap items-center gap-2 text-[11px] leading-relaxed ${themeClasses.textMuted}`}>
        <span className="hidden md:inline">
          ※ 赤破線はベースライン (Y=800)。「元に戻す (Ctrl+Z)」でいつでも取り消せます。
        </span>
        <span className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded border font-mono text-[10px] ${themeClasses.cardBg}`}>
          <kbd className="font-bold">D</kbd>: 診断切替
        </span>
        <span className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded border font-mono text-[10px] ${themeClasses.cardBg}`}>
          <kbd className="font-bold">R</kbd>: 再検査
        </span>
        <span className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded border font-mono text-[10px] ${themeClasses.cardBg}`}>
          <kbd className="font-bold">H</kbd>: ヒートマップ
        </span>
        <span className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded border font-mono text-[10px] ${themeClasses.cardBg}`}>
          <kbd className="font-bold">/</kbd>: 検索
        </span>
        <span className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded border font-mono text-[10px] ${themeClasses.cardBg}`}>
          <kbd className="font-bold">F</kbd>: 全画面切替
        </span>
        <span className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded border font-mono text-[10px] ${themeClasses.cardBg}`}>
          <kbd className="font-bold">Esc</kbd>: 閉じる
        </span>
      </div>
      <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
        <button
          onClick={() => setIsFullscreen((prev) => !prev)}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors flex items-center space-x-1.5 cursor-pointer ${themeClasses.cardBg} ${themeClasses.activeToolHover}`}
        >
          {isFullscreen ? (
            <>
              <Minimize2 className="w-3.5 h-3.5" />
              <span>通常表示</span>
            </>
          ) : (
            <>
              <Maximize2 className="w-3.5 h-3.5" />
              <span>全画面</span>
            </>
          )}
        </button>
        <button
          onClick={onClose}
          className={`px-4 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${themeClasses.accentBtn}`}
        >
          閉じる
        </button>
      </div>
    </div>
  );
};
