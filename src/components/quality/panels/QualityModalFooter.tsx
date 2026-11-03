import React from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

export interface QualityModalFooterProps {
  isLight: boolean;
  isFullscreen: boolean;
  setIsFullscreen: (fn: (prev: boolean) => boolean) => void;
  onClose: () => void;
}

export const QualityModalFooter: React.FC<QualityModalFooterProps> = ({
  isLight,
  isFullscreen,
  setIsFullscreen,
  onClose,
}) => {
  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between px-5 py-3 border-t text-xs gap-3 shrink-0 ${
        isLight ? 'bg-stone-50/80 border-stone-200' : 'bg-[#111a14] border-[#25362b]'
      }`}
    >
      <div className="flex items-center space-x-2 text-stone-500 dark:text-stone-400 text-[11px] leading-relaxed">
        <span className="hidden md:inline">
          ※ 赤破線はベースライン (Y=800)。「元に戻す (Ctrl+Z)」でいつでも取り消せます。
        </span>
        <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-stone-200/60 dark:bg-stone-800/80 font-mono text-[10px] text-stone-600 dark:text-stone-300">
          <kbd className="font-bold">D</kbd>: 診断切替
        </span>
        <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-stone-200/60 dark:bg-stone-800/80 font-mono text-[10px] text-stone-600 dark:text-stone-300">
          <kbd className="font-bold">R</kbd>: 再検査
        </span>
        <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-stone-200/60 dark:bg-stone-800/80 font-mono text-[10px] text-stone-600 dark:text-stone-300">
          <kbd className="font-bold">H</kbd>: ヒートマップ
        </span>
        <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-stone-200/60 dark:bg-stone-800/80 font-mono text-[10px] text-stone-600 dark:text-stone-300">
          <kbd className="font-bold">/</kbd>: 検索
        </span>
        <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-stone-200/60 dark:bg-stone-800/80 font-mono text-[10px] text-stone-600 dark:text-stone-300">
          <kbd className="font-bold">F</kbd>: 全画面切替
        </span>
        <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-stone-200/60 dark:bg-stone-800/80 font-mono text-[10px] text-stone-600 dark:text-stone-300">
          <kbd className="font-bold">Esc</kbd>: 閉じる
        </span>
      </div>
      <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
        <button
          onClick={() => setIsFullscreen((prev) => !prev)}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors flex items-center space-x-1.5 cursor-pointer ${
            isLight
              ? 'bg-white border-stone-200 text-stone-700 hover:bg-stone-100'
              : 'bg-[#1a261f] border-[#25362b] text-emerald-200 hover:bg-[#223328]'
          }`}
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
          className={`px-4 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
            isLight
              ? 'bg-stone-800 text-white hover:bg-stone-900'
              : 'bg-emerald-600 text-white hover:bg-emerald-500'
          }`}
        >
          閉じる
        </button>
      </div>
    </div>
  );
};
