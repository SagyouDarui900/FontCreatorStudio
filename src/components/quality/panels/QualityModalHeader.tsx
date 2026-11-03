import React from 'react';
import {
  X,
  ShieldCheck,
  Activity,
  RefreshCw,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { FontQualityReport, MainQualityView } from '../types';
import { ProjectDiagnosticsReport } from '../../../utils/projectDiagnostics';

export interface QualityModalHeaderProps {
  isLight: boolean;
  mainView: MainQualityView;
  setMainView: (view: MainQualityView) => void;
  report: FontQualityReport | null;
  diagReport: ProjectDiagnosticsReport | null;
  isScanning: boolean;
  isFullscreen: boolean;
  setIsFullscreen: (fn: (prev: boolean) => boolean) => void;
  onRescan: () => void;
  onClose: () => void;
}

export const QualityModalHeader: React.FC<QualityModalHeaderProps> = ({
  isLight,
  mainView,
  setMainView,
  report,
  diagReport,
  isScanning,
  isFullscreen,
  setIsFullscreen,
  onRescan,
  onClose,
}) => {
  return (
    <div
      className={`flex flex-col md:flex-row md:items-center justify-between gap-2 px-3 py-2.5 sm:px-4 sm:py-3 border-b ${
        isLight ? 'bg-stone-50/80 border-stone-200' : 'bg-[#111a14] border-[#25362b]'
      }`}
    >
      <div className="flex items-center justify-between md:justify-start space-x-3 min-w-0">
        <div className="flex items-center space-x-2 min-w-0">
          <div
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center border shrink-0 transition-colors ${
              mainView === 'diagnostics'
                ? isLight
                  ? 'bg-amber-100 border-amber-300 text-amber-800'
                  : 'bg-amber-950/80 border-amber-800 text-amber-300'
                : isLight
                ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                : 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
            }`}
          >
            {mainView === 'diagnostics' ? (
              <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
            ) : (
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {/* View Switcher Segment */}
              <div className="flex items-center bg-stone-200/80 dark:bg-[#1c2920] p-0.5 rounded-lg border border-stone-300/80 dark:border-[#2a3c2e]">
                <button
                  type="button"
                  onClick={() => setMainView('quality')}
                  className={`px-2 py-1 sm:px-2.5 sm:py-1 rounded-md text-[11px] sm:text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                    mainView === 'quality'
                      ? isLight
                        ? 'bg-white text-emerald-950'
                        : 'bg-[#152319] text-emerald-300'
                      : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>品質検査</span>
                  {report && report.totalIssues > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-mono font-bold">
                      {report.totalIssues}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setMainView('diagnostics')}
                  className={`px-2 py-1 sm:px-2.5 sm:py-1 rounded-md text-[11px] sm:text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                    mainView === 'diagnostics'
                      ? isLight
                        ? 'bg-white text-amber-950'
                        : 'bg-[#152319] text-amber-300'
                      : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5 text-amber-600" />
                  <span>プロジェクト診断</span>
                  {diagReport && diagReport.totalAttentionCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-mono font-bold">
                      {diagReport.totalAttentionCount}
                    </span>
                  )}
                </button>
              </div>

              {mainView === 'quality' && report && (
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold border ${
                    report.score >= 90
                      ? isLight
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      : report.score >= 70
                      ? isLight
                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                        : 'bg-amber-950 text-amber-300 border-amber-800'
                      : isLight
                      ? 'bg-rose-100 text-rose-900 border-rose-300'
                      : 'bg-rose-950 text-rose-300 border-rose-800'
                  }`}
                >
                  スコア: {report.score}/100
                </span>
              )}

              {mainView === 'diagnostics' && diagReport && (
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold border ${
                    isLight
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : 'bg-amber-950 text-amber-300 border-amber-800'
                  }`}
                >
                  完成率: {diagReport.overallCompletionRate}%
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Mobile close button */}
        <button
          onClick={onClose}
          className={`md:hidden p-1.5 rounded-xl border transition-colors shrink-0 cursor-pointer ${
            isLight
              ? 'bg-white border-stone-200 text-stone-500 hover:bg-stone-100'
              : 'bg-[#1a261f] border-[#25362b] text-stone-400 hover:bg-[#223328]'
          }`}
          title="閉じる (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center space-x-1.5 shrink-0">
        <button
          onClick={onRescan}
          disabled={isScanning}
          className={`px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl border text-[11px] sm:text-xs font-semibold flex items-center space-x-1.5 transition-colors shrink-0 cursor-pointer ${
            isLight
              ? 'bg-white border-stone-200 text-stone-700 hover:bg-stone-100'
              : 'bg-[#1a261f] border-[#25362b] text-emerald-200 hover:bg-[#223328]'
          }`}
          title="フォント全体を再検査 (R)"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">再検査</span>
        </button>

        {/* Fullscreen Toggle Button */}
        <button
          onClick={() => setIsFullscreen((prev) => !prev)}
          className={`hidden sm:flex p-2 sm:px-2.5 sm:py-2 rounded-xl border text-xs font-semibold items-center space-x-1.5 transition-colors shrink-0 cursor-pointer ${
            isFullscreen
              ? isLight
                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                : 'bg-emerald-950 text-emerald-300 border-emerald-700'
              : isLight
              ? 'bg-white border-stone-200 text-stone-700 hover:bg-stone-100'
              : 'bg-[#1a261f] border-[#25362b] text-emerald-200 hover:bg-[#223328]'
          }`}
          title={isFullscreen ? '通常表示に戻す (F または Esc)' : '全画面表示に拡大 (F)'}
        >
          {isFullscreen ? (
            <>
              <Minimize2 className="w-3.5 h-3.5" />
              <span>通常</span>
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
          className={`hidden md:block p-2 rounded-xl border transition-colors shrink-0 cursor-pointer ${
            isLight
              ? 'bg-white border-stone-200 text-stone-500 hover:bg-stone-100'
              : 'bg-[#1a261f] border-[#25362b] text-stone-400 hover:bg-[#223328]'
          }`}
          title="閉じる (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
