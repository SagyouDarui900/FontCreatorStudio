import React from 'react';
import { createPortal } from 'react-dom';
import { RotateCcw, X, Type, Save } from 'lucide-react';
import { FontProject } from '../../types';
import { ThemeMode, getThemeClasses } from '../../utils/theme';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLight: boolean;
  theme?: ThemeMode;
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
  theme,
  project,
  glyphCount,
  newProjectName,
  setNewProjectName,
  onSaveAndReset,
  onResetWithoutSave,
}) => {
  if (!isOpen || typeof document === 'undefined') return null;
  const resolvedTheme: ThemeMode = theme ?? (isLight ? 'light' : 'dark');
  const themeClasses = getThemeClasses(resolvedTheme);

  return createPortal(
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-[60] anim-fade">
      <div
        className={`w-full max-w-md rounded-2xl p-5 border shadow-xl space-y-4 ${themeClasses.modalBg} ${themeClasses.border} ${themeClasses.textPrimary}`}
      >
        <div className={`flex items-center justify-between border-b pb-3 ${themeClasses.border}`}>
          <div className={`flex items-center space-x-2 ${themeClasses.accentText}`}>
            <RotateCcw className="w-5 h-5" />
            <h3 className="text-base font-extrabold">新規プロジェクト作成・リセット</h3>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded-lg transition-colors cursor-pointer ${themeClasses.textMuted} ${themeClasses.activeToolHover}`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Project Info Summary Card */}
        <div
          className={`p-3 rounded-xl border text-xs space-y-1 ${themeClasses.cardBg} ${themeClasses.border}`}
        >
          <div className={`font-bold text-[10px] uppercase tracking-wider ${themeClasses.textMuted}`}>
            現在のフォントデータ
          </div>
          <div className="flex items-center justify-between pt-0.5">
            <span className={`font-extrabold text-sm ${themeClasses.textPrimary}`}>
              {project.metadata.familyName || '手書きフォント'}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] border ${themeClasses.accentBadge}`}>
              作成済み: {glyphCount} 文字
            </span>
          </div>
        </div>

        {/* New Project Name Input */}
        <div className="space-y-1.5">
          <label className={`text-xs font-bold flex items-center space-x-1 ${themeClasses.textPrimary}`}>
            <Type className={`w-3.5 h-3.5 ${themeClasses.accentText}`} />
            <span>新しいフォントプロジェクト名</span>
          </label>
          <input
            type="text"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="例: 新規手書きフォント"
            className={`w-full px-3 py-2 rounded-xl text-xs border font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary}`}
          />
        </div>

        <p className={`text-xs opacity-85 leading-relaxed ${themeClasses.textMuted}`}>
          作成・選択したフォントをリセットして新しいキャンバスを開きます。データ保護のため、<strong>「JSONバックアップして新規リセット」</strong>のご利用をお勧めします。
        </p>

        {/* Action Buttons */}
        <div className={`space-y-2 pt-2 border-t ${themeClasses.border}`}>
          {/* Primary: Backup JSON & Reset */}
          <button
            onClick={onSaveAndReset}
            className={`w-full py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center space-x-2 transition-colors active:scale-98 cursor-pointer ${themeClasses.accentBtn}`}
          >
            <Save className="w-4 h-4" />
            <span>JSONバックアップを保存して新規作成 (推奨)</span>
          </button>

          <div className="flex items-center space-x-2 pt-1">
            <button
              onClick={onClose}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.activeToolHover}`}
            >
              キャンセル
            </button>

            <button
              onClick={onResetWithoutSave}
              className="flex-1 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors active:scale-98 flex items-center justify-center space-x-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>保存せずに新規リセット</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
