import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, FileUp, PlusCircle, Replace, X } from 'lucide-react';
import { ThemeMode, getThemeClasses } from '../../utils/theme';
import { useDialogFocusTrap } from '../modals/ModalStackFrame';

export interface PendingFontImportSummary {
  fileName: string;
  familyName: string;
  totalImportedCount: number;
  overwriteCount: number;
  newOnlyCount: number;
  /** Glyphs dropped because they have no Unicode value. */
  droppedNoUnicodeCount?: number;
  /** Glyphs dropped because another glyph already uses their Unicode. */
  droppedDuplicateUnicodeCount?: number;
  /** kern-table pairs present in the file (not imported). */
  droppedKerningCount?: number;
  /** A kern/GPOS table exists, so kerning data was present but not imported. */
  kerningNotImported?: boolean;
}

interface ImportFontConfirmModalProps {
  pendingImport: PendingFontImportSummary | null;
  isLight: boolean;
  theme?: ThemeMode;
  onConfirmOverwrite: () => void;
  onConfirmAddOnly: () => void;
  onCancel: () => void;
}

export const ImportFontConfirmModal: React.FC<ImportFontConfirmModalProps> = ({
  pendingImport,
  isLight,
  theme,
  onConfirmOverwrite,
  onConfirmAddOnly,
  onCancel,
}) => {
  useEffect(() => {
    if (!pendingImport) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [pendingImport, onCancel]);

  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocusTrap(dialogRef, Boolean(pendingImport));

  if (!pendingImport || typeof document === 'undefined') return null;
  const resolvedTheme: ThemeMode = theme ?? (isLight ? 'light' : 'dark');
  const themeClasses = getThemeClasses(resolvedTheme);

  return createPortal(
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-[80] anim-fade">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="フォント読み込み方法の確認"
        className={`w-full max-w-md rounded-2xl p-5 border shadow-xl space-y-4 ${themeClasses.modalBg} ${themeClasses.border} ${themeClasses.textPrimary}`}
      >
        <div className={`flex items-center justify-between border-b pb-3 ${themeClasses.border}`}>
          <div className={`flex items-center space-x-2 ${themeClasses.accentText}`}>
            <FileUp className="w-5 h-5" />
            <h3 className="text-base font-extrabold">フォント読み込み方法の確認</h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="閉じる"
            className={`p-1 rounded-lg transition-colors cursor-pointer ${themeClasses.textMuted} ${themeClasses.activeToolHover}`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div
          className={`p-3 rounded-xl border text-xs space-y-1.5 ${themeClasses.cardBg} ${themeClasses.border}`}
        >
          <div className={`font-bold text-[10px] uppercase tracking-wider ${themeClasses.textMuted}`}>
            読み込み対象ファイル
          </div>
          <div className="font-extrabold text-sm truncate" title={pendingImport.fileName}>
            {pendingImport.familyName}（{pendingImport.fileName}）
          </div>
          <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
            <span className={`px-2 py-0.5 rounded-full font-bold border ${themeClasses.accentBadge}`}>
              収録グリフ: {pendingImport.totalImportedCount} 文字
            </span>
            <span
              className={`px-2 py-0.5 rounded-full font-bold border ${
                pendingImport.overwriteCount > 0
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30'
                  : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
              }`}
            >
              既存と重複: {pendingImport.overwriteCount} 文字
            </span>
            <span className={`px-2 py-0.5 rounded-full font-bold border ${themeClasses.border} ${themeClasses.textMuted}`}>
              新規追加分: {pendingImport.newOnlyCount} 文字
            </span>
          </div>
        </div>

        {pendingImport.overwriteCount > 0 ? (
          <div
            className={`p-3 rounded-xl border flex items-start gap-2 text-xs leading-relaxed ${
              isLight
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-amber-950/40 border-amber-800 text-amber-200'
            }`}
          >
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <div>
              <strong>{pendingImport.overwriteCount} 文字</strong>の既存データとフォント情報（メタデータ）が上書きされます。既存文字を保護する場合は「未作成の文字のみ追加」を選んでください。
            </div>
          </div>
        ) : (
          <p className={`text-xs leading-relaxed ${themeClasses.textMuted}`}>
            既存のグリフと重複はありません。「すべて上書き」を選ぶとフォント基本情報（書体名・メトリクス）も読み込んだフォントの内容に更新されます。
          </p>
        )}

        {((pendingImport.droppedNoUnicodeCount ?? 0) > 0 ||
          (pendingImport.droppedDuplicateUnicodeCount ?? 0) > 0 ||
          (pendingImport.droppedKerningCount ?? 0) > 0 ||
          pendingImport.kerningNotImported) && (
          <div
            className={`p-3 rounded-xl border flex items-start gap-2 text-xs leading-relaxed ${
              isLight
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-amber-950/40 border-amber-800 text-amber-200'
            }`}
          >
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <div>
              読み込めなかった情報があります。
              {(pendingImport.droppedNoUnicodeCount ?? 0) > 0 && (
                <div>Unicodeを持たないグリフ {pendingImport.droppedNoUnicodeCount}件（.notdef・合字など）は除外されます。</div>
              )}
              {(pendingImport.droppedDuplicateUnicodeCount ?? 0) > 0 && (
                <div>重複するUnicodeのグリフ {pendingImport.droppedDuplicateUnicodeCount}件は除外されます（先に読み込んだものを採用）。</div>
              )}
              {(pendingImport.droppedKerningCount ?? 0) > 0 ? (
                <div>カーニング {pendingImport.droppedKerningCount}件は読み込まれません。</div>
              ) : (
                pendingImport.kerningNotImported && <div>カーニングは読み込まれません。</div>
              )}
            </div>
          </div>
        )}

        <div className={`space-y-2 pt-2 border-t ${themeClasses.border}`}>
          <button
            type="button"
            onClick={onConfirmOverwrite}
            className={`w-full py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center space-x-2 transition-colors cursor-pointer ${themeClasses.accentBtn}`}
          >
            <Replace className="w-4 h-4 shrink-0" />
            <span>上書きしてインポート（{pendingImport.totalImportedCount} 文字・書体情報も更新）</span>
          </button>

          <button
            type="button"
            onClick={onConfirmAddOnly}
            disabled={pendingImport.newOnlyCount === 0}
            className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold border flex items-center justify-center space-x-2 transition-colors disabled:opacity-45 cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.activeToolHover}`}
          >
            <PlusCircle className="w-4 h-4 shrink-0" />
            <span>
              {pendingImport.newOnlyCount > 0
                ? `未作成の文字のみ追加（${pendingImport.newOnlyCount} 文字・既存データ保持）`
                : '追加可能な新規文字がありません'}
            </span>
          </button>

          <button
            type="button"
            onClick={onCancel}
            className={`w-full py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textMuted} ${themeClasses.activeToolHover}`}
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
