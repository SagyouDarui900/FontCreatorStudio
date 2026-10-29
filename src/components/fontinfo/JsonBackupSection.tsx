import React from 'react';
import { FileJson, HardDriveDownload, Check } from 'lucide-react';

export interface JsonBackupSectionProps {
  isLight: boolean;
  glyphCount: number;
  radicalCount: number;
  handleDownloadJsonBackup: () => void;
  isDownloaded: boolean;
}

export const JsonBackupSection: React.FC<JsonBackupSectionProps> = React.memo(({
  isLight,
  glyphCount,
  radicalCount,
  handleDownloadJsonBackup,
  isDownloaded,
}) => {
  return (
    <div
      className={`p-3 sm:p-3.5 rounded-xl border space-y-2.5 transition-colors ${
        isLight
          ? 'bg-amber-50/70 border-amber-200/80 text-stone-800'
          : 'bg-[#18231c] border-[#2f4236] text-emerald-100'
      }`}
    >
      <div className="flex items-start space-x-2.5">
        <div
          className={`p-2 rounded-lg shrink-0 mt-0.5 ${
            isLight ? 'bg-amber-200/80 text-amber-900' : 'bg-emerald-950 text-emerald-300'
          }`}
        >
          <FileJson className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-xs font-bold flex flex-wrap items-center gap-1.5">
            <span>プロジェクトバックアップ (JSON形式)</span>
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                isLight ? 'bg-amber-200/80 text-amber-950' : 'bg-emerald-900/80 text-emerald-300'
              }`}
            >
              .fontproj.json
            </span>
          </h4>
          <p className="text-[11px] opacity-80 leading-relaxed mt-0.5">
            全文字のベクター輪郭、メトリクス設定、部首パーツ定義をJSON形式でローカル保存します。
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-amber-200/60 dark:border-[#25362b] text-[11px]">
        <div className="flex items-center gap-3 font-mono opacity-85">
          <span>収録文字: <strong className="font-bold font-sans">{glyphCount}</strong> 字</span>
          {radicalCount > 0 && (
            <span>部首パーツ: <strong className="font-bold font-sans">{radicalCount}</strong> 個</span>
          )}
        </div>

        <button
          type="button"
          onClick={handleDownloadJsonBackup}
          className={`w-full sm:w-auto px-3.5 py-2 sm:py-1.5 rounded-lg font-bold text-xs flex items-center justify-center space-x-1.5 transition-all active:scale-95 cursor-pointer ${
            isDownloaded
              ? 'bg-emerald-600 text-white'
              : isLight
              ? 'bg-amber-500 hover:bg-amber-600 text-stone-950 border border-amber-600/30'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
          }`}
        >
          {isDownloaded ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>保存完了</span>
            </>
          ) : (
            <>
              <HardDriveDownload className="w-3.5 h-3.5" />
              <span>JSONバックアップ保存</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
});
