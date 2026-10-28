import React from 'react';
import { RotateCcw, X, Type, Save } from 'lucide-react';
import { FontProject } from '../../types';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLight: boolean;
  project: FontProject;
  glyphCount: number;
  newProjectName: string;
  setNewProjectName: (name: string) => void;
  onSaveAndReset: () => void;
  onResetWithoutSave: () => void;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  isLight,
  project,
  glyphCount,
  newProjectName,
  setNewProjectName,
  onSaveAndReset,
  onResetWithoutSave,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div
        className={`w-full max-w-md rounded-2xl p-5 border shadow-xl space-y-4 ${
          isLight ? 'bg-white border-stone-200 text-stone-900' : 'bg-[#151e18] border-[#25362b] text-emerald-100'
        }`}
      >
        <div className="flex items-center justify-between border-b pb-3 border-stone-200 dark:border-[#25362b]">
          <div className="flex items-center space-x-2 text-emerald-700 dark:text-emerald-400">
            <RotateCcw className="w-5 h-5" />
            <h3 className="text-base font-extrabold">新規プロジェクト作成・リセット</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:bg-stone-100 dark:hover:bg-[#1d2b21] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Project Info Summary Card */}
        <div
          className={`p-3 rounded-xl border text-xs space-y-1 ${
            isLight ? 'bg-stone-50 border-stone-200' : 'bg-[#1a261f] border-[#233328]'
          }`}
        >
          <div className="font-bold text-stone-400 dark:text-stone-400 text-[10px] uppercase tracking-wider">
            現在のフォントデータ
          </div>
          <div className="flex items-center justify-between pt-0.5">
            <span className="font-extrabold text-sm text-stone-800 dark:text-emerald-200">
              {project.metadata.familyName || '手書きフォント'}
            </span>
            <span className="px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 text-[11px] border border-emerald-300 dark:border-emerald-800">
              作成済み: {glyphCount} 文字
            </span>
          </div>
        </div>

        {/* New Project Name Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-stone-700 dark:text-emerald-300 flex items-center space-x-1">
            <Type className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>新しいフォントプロジェクト名</span>
          </label>
          <input
            type="text"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="例: 新規手書きフォント"
            className={`w-full px-3 py-2 rounded-xl text-xs border font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
              isLight
                ? 'bg-stone-50 border-stone-300 text-stone-900'
                : 'bg-[#101712] border-[#25362b] text-emerald-100'
            }`}
          />
        </div>

        <p className="text-xs opacity-80 leading-relaxed text-stone-600 dark:text-emerald-300/80">
          作成・選択したフォントをリセットして新しいキャンバスを開きます。データ保護のため、<strong>「JSONバックアップして新規リセット」</strong>のご利用をお勧めします。
        </p>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2 border-t border-stone-200 dark:border-[#25362b]">
          {/* Primary: Backup JSON & Reset */}
          <button
            onClick={onSaveAndReset}
            className="w-full py-2.5 px-3 rounded-xl text-xs font-extrabold bg-emerald-700 hover:bg-emerald-800 text-white flex items-center justify-center space-x-2 transition-all active:scale-98 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>JSONバックアップを保存して新規作成 (推奨)</span>
          </button>

          <div className="flex items-center space-x-2 pt-1">
            <button
              onClick={onClose}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                isLight
                  ? 'border-stone-300 text-stone-700 hover:bg-stone-100'
                  : 'border-[#2d4034] text-stone-300 hover:bg-[#1f2d24]'
              }`}
            >
              キャンセル
            </button>

            <button
              onClick={onResetWithoutSave}
              className="flex-1 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-all active:scale-98 flex items-center justify-center space-x-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>保存せずに新規リセット</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
