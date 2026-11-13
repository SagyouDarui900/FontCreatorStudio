import React, { useMemo } from 'react';
import { Award, ChevronRight } from 'lucide-react';
import { FontProject } from '../../types';
import { calculateJisProgress } from '../../data/jisKanjiSets';
import { isLightTheme, ThemeMode } from '../../utils/theme';

export interface ProgressSummaryPillProps {
  project: FontProject;
  theme: ThemeMode;
  onOpenDashboard: () => void;
  compact?: boolean;
}

export const ProgressSummaryPill: React.FC<ProgressSummaryPillProps> = ({
  project,
  theme,
  onOpenDashboard,
  compact = false,
}) => {
  const isLight = isLightTheme(theme);

  const progress = useMemo(() => {
    return calculateJisProgress(project?.glyphs || {});
  }, [project?.glyphs]);

  return (
    <button
      onClick={onOpenDashboard}
      className={`group h-7 flex items-center gap-1.5 px-2 rounded-md border text-[11px] font-medium transition-colors active:scale-95 cursor-pointer shrink-0 ${
        isLight
          ? 'bg-emerald-50/80 hover:bg-emerald-100/70 border-emerald-200/90 hover:border-emerald-400 text-stone-800'
          : 'bg-[#15221a] hover:bg-[#1a2b20] border-emerald-800/60 hover:border-emerald-600 text-emerald-200'
      }`}
      title="JIS規格・常用漢字の制作進捗ダッシュボードを開く"
    >
      <div className="flex items-center gap-1 shrink-0">
        <Award className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        <span className="font-bold hidden sm:inline">進捗</span>
      </div>

      <div className="flex items-center gap-1.5">
        {/* 常用漢字 */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-stone-500 dark:text-emerald-400/70 font-mono">常用</span>
          <span className="font-mono tabular-nums font-bold text-emerald-700 dark:text-emerald-300 text-[11px]">
            {progress.jouyou.percent}%
          </span>
          <div className="w-9 sm:w-11 h-1.5 rounded-xs bg-stone-200 dark:bg-stone-800 overflow-hidden hidden md:block">
            <div
              className="h-full bg-emerald-500 rounded-xs transition-all duration-300"
              style={{ width: `${progress.jouyou.percent}%` }}
            />
          </div>
        </div>

        {/* JIS第1水準 */}
        {!compact && (
          <div className="flex items-center gap-1 hidden lg:flex border-l border-emerald-200 dark:border-emerald-800/80 pl-1.5">
            <span className="text-[10px] text-stone-500 dark:text-emerald-400/70 font-mono">JIS1</span>
            <span className="font-mono tabular-nums font-bold text-teal-700 dark:text-teal-300 text-[11px]">
              {progress.jis1.percent}%
            </span>
            <div className="w-9 sm:w-11 h-1.5 rounded-xs bg-stone-200 dark:bg-stone-800 overflow-hidden">
              <div
                className="h-full bg-teal-500 rounded-xs transition-all duration-300"
                style={{ width: `${progress.jis1.percent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <ChevronRight className="w-3 h-3 text-stone-400 dark:text-emerald-500 group-hover:translate-x-0.5 transition-transform" />
    </button>
  );
};
