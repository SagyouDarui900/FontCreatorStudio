import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FontProject } from '../types';
import { ThemeMode, isLightTheme, getThemeClasses } from '../utils/theme';
import { validateStoredFontProjectWithReport } from '../utils/font/validation';
import {
 StorageUsageBreakdown,
 ProjectBackupSnapshot,
 IndexedDBAutoSaveEntry,
 getStorageUsageBreakdown,
 getBackupStatusInfo,
 listSnapshots,
 listAutosaveHistoryFromIndexedDB,
 loadAutosaveEntryFromIndexedDB,
 createLocalSnapshot,
 loadProjectFromSnapshotWithReport,
 deleteSnapshot,
 deleteStorageBreakdownItem,
 clearAllSnapshots,
 clearNonEssentialCache,
 exportProjectJsonFile,
 downloadSnapshotJsonFile,
 formatBytes,
 formatDateTime,
 formatRelativeTime,
 SNAPSHOTS_INDEX_KEY,
 SNAPSHOT_DATA_PREFIX,
 normalizeValidatedProject,
 formatRemovedDataNotice,
} from '../utils/storageManager';
import {
 HardDrive,
 Download,
 Trash2,
 RotateCcw,
 Plus,
 RefreshCw,
 AlertTriangle,
 CheckCircle2,
 Clock,
 FileJson,
 X,
 Layers,
 Sparkles,
 Info,
 ShieldCheck,
 FolderArchive,
 Database,
} from 'lucide-react';

interface StorageManagerModalProps {
 isOpen: boolean;
 onClose: () => void;
 project: FontProject;
 setProject: React.Dispatch<React.SetStateAction<FontProject>>;
 onProjectReplaced?: () => void;
 theme: ThemeMode;
 onShowToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const StorageManagerModal: React.FC<StorageManagerModalProps> = ({
 isOpen,
 onClose,
 project,
 setProject,
 onProjectReplaced,
 theme,
 onShowToast,
}) => {
 const isLight = isLightTheme(theme);
 const themeClasses = getThemeClasses(theme);

 const [activeTab, setActiveTab] = useState<'snapshots' | 'autosave' | 'breakdown' | 'guide'>('snapshots');
 const [breakdown, setBreakdown] = useState<StorageUsageBreakdown>(getStorageUsageBreakdown());
 const [snapshots, setSnapshots] = useState<ProjectBackupSnapshot[]>(listSnapshots());
 const [autosaveEntries, setAutosaveEntries] = useState<IndexedDBAutoSaveEntry[]>([]);
 const [lastBackupTime, setLastBackupTime] = useState<number | null>(null);
 const [lastAutoSaveTime, setLastAutoSaveTime] = useState<number | null>(null);

 // New snapshot creation input state
 const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
 const [snapshotLabel, setSnapshotLabel] = useState('');

 // Confirmation modals state
 const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null);
 const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
 const [confirmClearAll, setConfirmClearAll] = useState(false);
 const [confirmDeleteBreakdownItem, setConfirmDeleteBreakdownItem] = useState<{ key: string; label: string } | null>(null);

 // Refresh storage data
 const refreshStorageData = useCallback(() => {
 setBreakdown(getStorageUsageBreakdown());
 setSnapshots(listSnapshots());
 const status = getBackupStatusInfo();
 setLastBackupTime(status.lastBackupTimestamp);
 setLastAutoSaveTime(status.lastAutoSaveTimestamp);

 listAutosaveHistoryFromIndexedDB().then((history) => {
 setAutosaveEntries(history);
 }).catch(() => {
 setAutosaveEntries([]);
 });
 }, []);

 useEffect(() => {
 if (isOpen) {
 refreshStorageData();
 }
 }, [isOpen, refreshStorageData]);

 // Keyboard shortcut listener: Escape, Tabs (1/2/3/4), Refresh (R)
 useEffect(() => {
 if (!isOpen) return;

 const handleKeyDown = (e: KeyboardEvent) => {
 const activeTag = document.activeElement?.tagName.toLowerCase();
 const isInput = activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select';

 if (e.key === 'Escape') {
 e.preventDefault();
 if (confirmRestoreId) {
 setConfirmRestoreId(null);
 } else if (confirmDeleteId) {
 setConfirmDeleteId(null);
 } else if (confirmDeleteBreakdownItem) {
 setConfirmDeleteBreakdownItem(null);
 } else if (confirmClearAll) {
 setConfirmClearAll(false);
 } else if (isCreatingSnapshot) {
 setIsCreatingSnapshot(false);
 } else {
 onClose();
 }
 } else if (!isInput && !e.ctrlKey && !e.metaKey && !e.altKey) {
 if (e.key === '1') {
 e.preventDefault();
 setActiveTab('snapshots');
 } else if (e.key === '2') {
 e.preventDefault();
 setActiveTab('autosave');
 } else if (e.key === '3') {
 e.preventDefault();
 setActiveTab('breakdown');
 } else if (e.key === '4') {
 e.preventDefault();
 setActiveTab('guide');
 } else if (e.key.toLowerCase() === 'r') {
 e.preventDefault();
 refreshStorageData();
 onShowToast('ストレージ状態を再読込しました', 'info');
 }
 }
 };

 window.addEventListener('keydown', handleKeyDown);
 return () => window.removeEventListener('keydown', handleKeyDown);
 }, [
 isOpen,
 onClose,
 refreshStorageData,
 onShowToast,
 confirmRestoreId,
 confirmDeleteId,
 confirmDeleteBreakdownItem,
 confirmClearAll,
 isCreatingSnapshot,
 ]);

 // Handle manual JSON file backup export
 const handleExportJson = () => {
 const res = exportProjectJsonFile(project);
 if (res.success) {
 onShowToast(`バックアップ『${res.filename}』をダウンロードしました`, 'success');
 refreshStorageData();
 } else {
 onShowToast('バックアップファイルの書き出しに失敗しました', 'error');
 }
 };

 // Handle creating a manual snapshot
 const handleCreateSnapshot = () => {
 const label = snapshotLabel.trim() || undefined;
 const res = createLocalSnapshot(project, 'manual', label);
 if (res.success) {
 onShowToast('ローカルスナップショットを作成しました', 'success');
 setSnapshotLabel('');
 setIsCreatingSnapshot(false);
 refreshStorageData();
 } else {
 onShowToast(res.error || 'スナップショットの作成に失敗しました', 'error');
 }
 };

 // Handle restoring project from snapshot
 const handleRestoreSnapshot = (snap: ProjectBackupSnapshot) => {
 const { project: loaded, removed } = loadProjectFromSnapshotWithReport(snap.id);
 if (loaded) {
 setProject(loaded);
 onProjectReplaced?.();
 onShowToast(`スナップショット「${snap.formattedDate}」をキャンバスに復元しました`, 'success');
 const removedNotice = formatRemovedDataNotice(removed);
 if (removedNotice) {
 onShowToast(removedNotice, 'warning');
 }
 setConfirmRestoreId(null);
 refreshStorageData();
 } else {
 onShowToast('スナップショットデータが無効なため、復元できませんでした', 'error');
 }
 };

 // Handle restoring project from IndexedDB autosave history entry
 const handleRestoreAutosaveEntry = (entry: IndexedDBAutoSaveEntry) => {
 if (entry.project) {
 const { project: validated, removed } = normalizeValidatedProject(validateStoredFontProjectWithReport(entry.project));
 if (validated) {
 setProject(validated);
 onProjectReplaced?.();
 onShowToast(`IndexedDB自動バックアップ「${formatDateTime(entry.timestamp)}」を復元しました`, 'success');
 const removedNotice = formatRemovedDataNotice(removed);
 if (removedNotice) {
 onShowToast(removedNotice, 'warning');
 }
 refreshStorageData();
 } else {
 onShowToast('自動バックアップデータが無効なため、復元できませんでした', 'error');
 }
 } else {
 onShowToast('バックアップデータの復元に失敗しました', 'error');
 }
 };

 // Handle deleting a single storage-breakdown item (1-12): the index and
 // its data keys are deleted together by deleteStorageBreakdownItem.
 const handleDeleteBreakdownItem = (key: string, label: string) => {
 const res = deleteStorageBreakdownItem(key);
 if (res.success) {
 onShowToast(`「${label}」を削除し、${formatBytes(res.freedBytes)} を開放しました`, 'info');
 setConfirmDeleteBreakdownItem(null);
 refreshStorageData();
 } else {
 onShowToast('ストレージ項目の削除に失敗しました', 'error');
 }
 };

 // Handle deleting a single snapshot
 const handleDeleteSnapshot = (id: string) => {
 const res = deleteSnapshot(id);
 if (res.success) {
 onShowToast(`スナップショットを削除し、${formatBytes(res.freedBytes)} を開放しました`, 'info');
 setConfirmDeleteId(null);
 refreshStorageData();
 } else {
 onShowToast('スナップショットの削除に失敗しました', 'error');
 }
 };

 // Handle clearing all snapshots
 const handleClearAllSnapshots = () => {
 const res = clearAllSnapshots();
 if (res.success) {
 onShowToast(`全スナップショット（${res.deletedCount}件）を削除し、${formatBytes(res.freedBytes)} を開放しました`, 'success');
 setConfirmClearAll(false);
 refreshStorageData();
 } else {
 onShowToast('スナップショットの一括削除に失敗しました', 'error');
 }
 };

 // Handle cleaning non-essential cache
 const handleCleanCache = () => {
 const res = clearNonEssentialCache();
 if (res.success) {
 onShowToast(`一時キャッシュをクリーンアップし、${formatBytes(res.freedBytes)} を開放しました`, 'success');
 refreshStorageData();
 } else {
 onShowToast('キャッシュのクリアに失敗しました', 'error');
 }
 };

 if (!isOpen) return null;

 return (
  <div
    role="dialog"
    aria-modal="true"
    aria-label="保存・バックアップ管理"
    className="fixed inset-0 bg-black/75 flex flex-col sm:items-center sm:justify-center p-0 sm:p-4 z-[60] anim-fade"
  >
    <div
      className={`w-full h-[100dvh] sm:h-auto sm:max-w-3xl sm:max-h-[92vh] flex flex-col rounded-none sm:rounded-2xl border-0 sm:border shadow-none sm:shadow-2xl overflow-hidden ${themeClasses.modalBg} ${themeClasses.border} ${themeClasses.textPrimary}`}
    >
      {/* MODAL HEADER */}
      <div
        className={`flex items-center justify-between px-4 sm:px-6 py-3 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] sm:py-3.5 border-b shrink-0 ${themeClasses.headerBg} ${themeClasses.border}`}
      >
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-xs shrink-0 ${themeClasses.accentBtn}`}>
            <HardDrive className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-extrabold flex items-center gap-2">
              <span className="max-sm:truncate">保存・バックアップ管理</span>
              <span className={`text-[11px] font-normal px-2 py-0.5 rounded-full border font-mono max-sm:shrink-0 ${themeClasses.accentBadge}`}>
                容量と履歴
              </span>
            </h2>
            <p className={`text-[11px] max-sm:hidden ${themeClasses.textMuted}`}>
              ブラウザ保存容量の確認、スナップショット履歴の復元、JSON入出力を行います
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="閉じる"
          className={`p-1.5 min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 flex items-center justify-center rounded-lg transition-colors cursor-pointer shrink-0 ${themeClasses.textMuted} ${themeClasses.activeToolHover}`}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* TOP STORAGE CAPACITY METRIC HERO CARD */}
      <div
        className={`px-4 sm:px-6 py-3 border-b shrink-0 ${themeClasses.cardBg}`}
      >
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
 <div className="flex items-center space-x-2">
 <span className={`text-xs font-bold ${themeClasses.accentText}`}>
 localStorage 使用量:
 </span>
 <span className={`text-sm font-extrabold font-mono ${themeClasses.textPrimary}`}>
 {formatBytes(breakdown.totalUsedBytes)}
 </span>
 <span className={`text-xs font-mono ${themeClasses.textMuted}`}>
 / 約 {formatBytes(breakdown.estimatedLimitBytes)} ({breakdown.usedPercentage.toFixed(1)}%)
 </span>
 </div>

 {/* Health status badge */}
 <div className="flex items-center space-x-1.5">
 {breakdown.status === 'safe' && (
 <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
 <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
 保存容量: 良好
 </span>
 )}
 {breakdown.status === 'warning' && (
 <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
 <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
 保存容量: 要注意 (65%超過)
 </span>
 )}
 {breakdown.status === 'critical' && (
 <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
 <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
 容量上限リスク (85%超過)
 </span>
 )}
 </div>
 </div>

 {/* Meter progress bar */}
 <div className="w-full h-2.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden relative">
 <div
 className={`h-full transition-[width] duration-300 rounded-full ${
 breakdown.status === 'safe'
 ? 'bg-emerald-500'
 : breakdown.status === 'warning'
 ? 'bg-amber-500'
 : 'bg-rose-500'
 }`}
 style={{ width: `${Math.min(100, Math.max(1, breakdown.usedPercentage))}%` }}
 />
 </div>

 {/* Breakdown Pills */}
 <div className={`flex flex-wrap gap-2 pt-2 text-[10px] ${themeClasses.textMuted}`}>
 <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border ${themeClasses.subtoolbarBg}`}>
 <span className="w-2 h-2 rounded-full bg-emerald-500" />
 作業中フォント: <strong>{formatBytes(breakdown.projectBytes)}</strong>
 </span>
 <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border ${themeClasses.subtoolbarBg}`}>
 <span className="w-2 h-2 rounded-full bg-cyan-500" />
 スナップショット ({snapshots.length}件): <strong>{formatBytes(breakdown.snapshotsBytes)}</strong>
 </span>
 <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border ${themeClasses.subtoolbarBg}`}>
 <span className="w-2 h-2 rounded-full bg-indigo-400" />
 カスタム部首部品: <strong>{formatBytes(breakdown.customPartsBytes)}</strong>
 </span>
 <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border ${themeClasses.subtoolbarBg}`}>
 <span className="w-2 h-2 rounded-full bg-stone-400" />
 設定・その他: <strong>{formatBytes(breakdown.presetsBytes + breakdown.settingsBytes + breakdown.otherBytes)}</strong>
 </span>
 </div>
 </div>

 {/* PRIMARY ACTION CARD: LAST BACKUP STATUS & INSTANT EXPORT */}
 <div
 className={`px-4 sm:px-6 py-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 ${themeClasses.subtoolbarBg}`}
 >
 <div className="flex items-start space-x-3">
 <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${themeClasses.accentBadge}`}>
 <ShieldCheck className="w-5 h-5" />
 </div>
 <div>
 <div className="text-xs font-extrabold flex items-center gap-2">
 <span>最終ファイルバックアップ (.json):</span>
 {lastBackupTime ? (
 <span className={`font-mono font-bold ${themeClasses.accentText}`}>
 {formatDateTime(lastBackupTime)} ({formatRelativeTime(lastBackupTime)})
 </span>
 ) : (
 <span className="text-amber-600 dark:text-amber-400 font-bold bg-amber-500/15 px-1.5 py-0.5 rounded">
 未実行（ファイルバックアップを推奨）
 </span>
 )}
 </div>
 <p className={`text-[11px] leading-tight mt-0.5 ${themeClasses.textMuted}`}>
 ブラウザのキャッシュ消去や容量制限による消失を防ぐため、PC/スマホのローカル保存ファイルとして手動ダウンロードできます。
 </p>
 </div>
 </div>

 <button
 onClick={handleExportJson}
 className={`px-3.5 py-2 rounded-xl text-xs font-extrabold shadow-sm flex items-center justify-center space-x-1.5 transition-[transform,background-color] shrink-0 active:scale-95 cursor-pointer ${themeClasses.accentBtn}`}
 >
 <Download className="w-4 h-4" />
 <span>今すぐJSON保存 (.fontproj.json)</span>
 </button>
 </div>

 {/* TABS NAVIGATION */}
 <div
 className={`flex items-center space-x-2 px-3 sm:px-6 pt-2.5 pb-0 border-b shrink-0 overflow-x-auto no-scrollbar whitespace-nowrap ${themeClasses.cardBg}`}
 >
 <button
 onClick={() => setActiveTab('snapshots')}
 className={`px-3 max-sm:px-2 py-1.5 text-xs font-bold rounded-t-lg border-t border-x -mb-px flex items-center space-x-1.5 transition-colors cursor-pointer ${
 activeTab === 'snapshots'
 ? `${themeClasses.modalBg} ${themeClasses.textPrimary} border-b-transparent`
 : `border-transparent ${themeClasses.textMuted} ${themeClasses.activeToolHover}`
 }`}
 >
 <RotateCcw className="w-3.5 h-3.5" />
 <span>手動スナップショット ({snapshots.length})</span>
 </button>

 <button
 onClick={() => setActiveTab('autosave')}
 className={`px-3 max-sm:px-2 py-1.5 text-xs font-bold rounded-t-lg border-t border-x -mb-px flex items-center space-x-1.5 transition-colors cursor-pointer ${
 activeTab === 'autosave'
 ? `${themeClasses.modalBg} ${themeClasses.textPrimary} border-b-transparent`
 : `border-transparent ${themeClasses.textMuted} ${themeClasses.activeToolHover}`
 }`}
 >
 <Clock className={`w-3.5 h-3.5 ${themeClasses.accentText}`} />
 <span>IndexedDB クラッシュ復元 ({autosaveEntries.length})</span>
 </button>

 <button
 onClick={() => setActiveTab('breakdown')}
 className={`px-3 max-sm:px-2 py-1.5 text-xs font-bold rounded-t-lg border-t border-x -mb-px flex items-center space-x-1.5 transition-colors cursor-pointer ${
 activeTab === 'breakdown'
 ? `${themeClasses.modalBg} ${themeClasses.textPrimary} border-b-transparent`
 : `border-transparent ${themeClasses.textMuted} ${themeClasses.activeToolHover}`
 }`}
 >
 <Database className="w-3.5 h-3.5" />
 <span>ストレージ詳細内訳</span>
 </button>

 <button
 onClick={() => setActiveTab('guide')}
 className={`px-3 max-sm:px-2 py-1.5 text-xs font-bold rounded-t-lg border-t border-x -mb-px flex items-center space-x-1.5 transition-colors cursor-pointer ${
 activeTab === 'guide'
 ? `${themeClasses.modalBg} ${themeClasses.textPrimary} border-b-transparent`
 : `border-transparent ${themeClasses.textMuted} ${themeClasses.activeToolHover}`
 }`}
 >
 <Info className="w-3.5 h-3.5" />
 <span>保存仕様</span>
 </button>
 </div>

 {/* TAB 1: SNAPSHOTS LIST & MANAGEMENT */}
 {activeTab === 'snapshots' && (
 <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
 {/* Snapshot Actions Bar */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1">
 {isCreatingSnapshot ? (
 <div className="flex items-center space-x-2 flex-1 max-w-md">
 <input
 type="text"
 value={snapshotLabel}
 onChange={(e) => setSnapshotLabel(e.target.value)}
 placeholder="スナップショット名 (例: ひらがな完成時点)"
 className={`flex-1 px-3 py-1.5 text-xs rounded-xl border focus:outline-none focus:ring-2 ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary}`}
 autoFocus
 onKeyDown={(e) => {
 if (e.key === 'Enter') handleCreateSnapshot();
 if (e.key === 'Escape') setIsCreatingSnapshot(false);
 }}
 />
 <button
 onClick={handleCreateSnapshot}
 className={`px-3 py-1.5 rounded-xl text-xs font-bold shadow-xs cursor-pointer ${themeClasses.accentBtn}`}
 >
 作成
 </button>
 <button
 onClick={() => setIsCreatingSnapshot(false)}
 className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textMuted} ${themeClasses.activeToolHover}`}
 >
 取消
 </button>
 </div>
 ) : (
 <button
 onClick={() => setIsCreatingSnapshot(true)}
 className={`px-3 py-1.5 rounded-xl text-xs font-bold shadow-xs flex items-center space-x-1.5 transition-transform active:scale-95 cursor-pointer ${themeClasses.accentBtn}`}
 >
 <Plus className="w-3.5 h-3.5" />
 <span>現在の状態をスナップショット保存</span>
 </button>
 )}

 <div className="flex items-center space-x-2">
 <button
 onClick={handleCleanCache}
 className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-colors flex items-center space-x-1 cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.activeToolHover}`}
 title="作業画面の一時キャッシュをクリアして空き容量を確保"
 >
 <RefreshCw className={`w-3.5 h-3.5 ${themeClasses.textMuted}`} />
 <span>キャッシュ整理</span>
 </button>

 {snapshots.length > 0 && (
 <button
 onClick={() => setConfirmClearAll(true)}
 className="px-2.5 py-1.5 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center space-x-1 transition-colors cursor-pointer"
 >
 <Trash2 className="w-3.5 h-3.5" />
 <span>全スナップショット削除</span>
 </button>
 )}
 </div>
 </div>

 {/* Snapshots Grid / List */}
 {snapshots.length === 0 ? (
 <div
 className={`text-center py-12 px-4 rounded-2xl border border-dashed ${themeClasses.subtoolbarBg} ${themeClasses.border}`}
 >
 <FolderArchive className={`w-10 h-10 mx-auto mb-2 opacity-60 ${themeClasses.textMuted}`} />
 <h3 className={`text-sm font-bold ${themeClasses.textPrimary}`}>
 保存されたスナップショットはありません
 </h3>
 <p className={`text-xs max-w-sm mx-auto mt-1 ${themeClasses.textMuted}`}>
 「現在の状態をスナップショット保存」を押すと、作業の節目で復元可能なバックアップをブラウザ内に保存できます。
 </p>
 <button
 onClick={() => setIsCreatingSnapshot(true)}
 className={`mt-3.5 px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs inline-flex items-center space-x-1.5 transition-colors cursor-pointer ${themeClasses.accentBtn}`}
 >
 <Plus className="w-3.5 h-3.5" />
 <span>最初のスナップショットを作成</span>
 </button>
 </div>
 ) : (
 <div className="space-y-2.5">
 {snapshots.map((snap) => (
 <div
 key={snap.id}
 className={`p-3.5 rounded-xl border transition-colors duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${themeClasses.cardBg}`}
 >
 <div className="flex items-start space-x-3 min-w-0 flex-1">
 <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${themeClasses.accentBadge}`}>
 <FileJson className="w-4 h-4" />
 </div>
 <div className="min-w-0 flex-1">
 <div className="flex items-center space-x-2 flex-wrap">
 <span className={`text-xs font-extrabold truncate ${themeClasses.textPrimary}`}>
 {snap.label || snap.familyName || '手書きフォント'}
 </span>
 <span className={`text-[11px] px-1.5 py-0.5 rounded border font-mono ${themeClasses.subtoolbarBg} ${themeClasses.textMuted}`}>
 {snap.glyphCount} 文字
 </span>
 <span className={`text-[11px] px-1.5 py-0.5 rounded border font-mono ${themeClasses.accentBadge}`}>
 {formatBytes(snap.sizeBytes)}
 </span>
 </div>
 <div className={`flex items-center space-x-2 text-[11px] mt-0.5 ${themeClasses.textMuted}`}>
 <Clock className="w-3 h-3" />
 <span>{snap.formattedDate}</span>
 <span>({formatRelativeTime(snap.timestamp)})</span>
 </div>
 </div>
 </div>

 {/* Snapshot Action Buttons */}
 <div className="flex items-center space-x-1.5 shrink-0 self-end sm:self-center">
 <button
 onClick={() => setConfirmRestoreId(snap.id)}
 className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border flex items-center space-x-1 transition-colors cursor-pointer ${themeClasses.accentBadge} ${themeClasses.activeToolHover}`}
 title="このスナップショットを作業キャンバスに復元"
 >
 <RotateCcw className="w-3.5 h-3.5" />
 <span>復元</span>
 </button>

 <button
 onClick={() => downloadSnapshotJsonFile(snap)}
 className={`p-1.5 rounded-lg text-xs border transition-colors cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textMuted} ${themeClasses.activeToolHover}`}
 title="JSONファイルとしてダウンロード"
 >
 <Download className="w-3.5 h-3.5" />
 </button>

 <button
 onClick={() => setConfirmDeleteId(snap.id)}
 className="p-1.5 rounded-lg text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-transparent hover:border-rose-200 dark:hover:border-rose-900/40 transition-colors cursor-pointer"
 title="スナップショットを削除"
 >
 <Trash2 className="w-3.5 h-3.5" />
 </button>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 )}

 {/* TAB 2: INDEXEDDB AUTOSAVE RECOVERY HISTORY */}
 {activeTab === 'autosave' && (
 <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
 <div className={`p-3.5 rounded-xl border text-xs leading-relaxed flex items-start space-x-3 ${themeClasses.accentBadge}`}>
 <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
 <div>
 <div className="font-bold mb-0.5">IndexedDB オートセーブ履歴</div>
 <p className="text-[11px] opacity-90">
 編集データは IndexedDB に自動保存されます。直近の保存時点を選択して復元できます。
 </p>
 </div>
 </div>

 {autosaveEntries.length === 0 ? (
 <div className={`py-12 text-center text-xs ${themeClasses.textMuted}`}>
 IndexedDB のオートセーブ履歴はまだありません。作図変更を行うと自動保存されます。
 </div>
 ) : (
 <div className="space-y-2.5">
 {autosaveEntries.map((entry, idx) => (
 <div
 key={entry.id}
 className={`p-3.5 rounded-xl border transition-colors duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${themeClasses.cardBg}`}
 >
 <div className="flex items-start space-x-3 min-w-0 flex-1">
 <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs ${themeClasses.accentBadge}`}>
 {idx === 0 ? '最新' : `#${idx + 1}`}
 </div>
 <div className="min-w-0 flex-1">
 <div className="flex items-center space-x-2 flex-wrap">
 <span className={`text-xs font-extrabold truncate ${themeClasses.textPrimary}`}>
 {entry.projectName || '手書きフォント'}
 </span>
 <span className={`text-[11px] px-1.5 py-0.5 rounded border font-mono ${themeClasses.subtoolbarBg} ${themeClasses.textMuted}`}>
 {entry.glyphCount} 文字収録
 </span>
 {idx === 0 && (
 <span className={`text-[11px] px-1.5 py-0.5 rounded font-bold border ${themeClasses.accentBadge}`}>
 直近の自動保護ポイント
 </span>
 )}
 </div>
 <div className={`flex items-center space-x-2 text-[11px] mt-0.5 ${themeClasses.textMuted}`}>
 <Clock className={`w-3 h-3 ${themeClasses.accentText}`} />
 <span>{formatDateTime(entry.timestamp)}</span>
 <span>({formatRelativeTime(entry.timestamp)})</span>
 </div>
 </div>
 </div>

 <button
 onClick={() => handleRestoreAutosaveEntry(entry)}
 className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center space-x-1.5 transition-[transform,background-color] shadow-xs shrink-0 self-end sm:self-center active:scale-95 cursor-pointer ${themeClasses.cardBg} ${themeClasses.activeToolHover}`}
 >
 <RotateCcw className="w-3.5 h-3.5" />
 <span>この時点へ復元</span>
 </button>
 </div>
 ))}
 </div>
 )}
 </div>
 )}

 {/* TAB 2: DETAILED STORAGE BREAKDOWN */}
 {activeTab === 'breakdown' && (
 <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
 <div className={`text-xs ${themeClasses.textMuted}`}>
 ブラウザ（localStorage）内に保管されている全データの内訳と専有サイズ一覧です。
 </div>

 <div className="space-y-2">
 {breakdown.items.map((item) => (
 <div
 key={item.key}
 className={`p-3 rounded-lg border flex items-center justify-between text-xs ${themeClasses.cardBg}`}
 >
 <div className="min-w-0 flex-1 pr-3">
 <div className={`font-bold truncate ${themeClasses.textPrimary}`}>
 {item.label}
 </div>
 <div className={`font-mono text-[11px] ${themeClasses.textMuted} truncate`}>
 キー: {item.key}
 </div>
 </div>
 <div className="flex items-center space-x-3 shrink-0">
 <span className={`font-mono font-bold ${themeClasses.accentText}`}>
 {formatBytes(item.sizeBytes)}
 </span>
 {item.removable && (
 <button
 onClick={() => setConfirmDeleteBreakdownItem({ key: item.key, label: item.label })}
 className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer"
 title="手動削除"
 >
 <Trash2 className="w-3.5 h-3.5" />
 </button>
 )}
 </div>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* TAB 3: SAFETY & STORAGE GUIDE */}
 {activeTab === 'guide' && (
 <div className={`flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4 text-xs leading-relaxed ${themeClasses.textPrimary}`}>
 <div
 className={`p-4 rounded-xl border space-y-2 ${
 isLight ? 'bg-amber-50/60 border-amber-200 text-amber-950' : 'bg-amber-950/20 border-amber-800/40 text-amber-200'
 }`}
 >
 <div className="font-bold flex items-center gap-1.5">
 <AlertTriangle className="w-4 h-4 text-amber-600" />
 <span>ブラウザの保存領域（localStorage）に関する注意点</span>
 </div>
 <ul className="list-disc list-inside space-y-1 text-[11px] opacity-90 pl-1">
 <li>
 ブラウザのlocalStorageは約 <strong>5MB</strong> の容量上限が定められています。
 </li>
 <li>
 文字数が増えたり、ノード数の多い複雑なベクター輪郭が増えると容量制限に達する場合があります。
 </li>
 <li>
 ブラウザの「閲覧履歴やキャッシュの削除」を実行すると、ブラウザ内の保存データが消失するリスクがあります。
 </li>
 </ul>
 </div>

 <div
 className={`p-4 rounded-xl border space-y-2 ${themeClasses.accentBadge}`}
 >
 <div className="font-bold flex items-center gap-1.5">
 <ShieldCheck className="w-4 h-4 shrink-0" />
 <span>制作データのバックアップ手順</span>
 </div>
 <ul className="list-disc list-inside space-y-1.5 text-[11px] opacity-90 pl-1">
 <li>
 <strong>「今すぐJSON保存 (.fontproj.json)」の定期実行:</strong>{' '}
 PCやiPadのファイルストレージ・Googleドライブ・iCloud等にセーブデータとして保管できます。
 </li>
 <li>
 <strong>スナップショットの適宜作成:</strong>{' '}
 大きな変更を加える前や、部首合成・一括正規化の前後にスナップショットを作成してバックアップできます。
 </li>
 <li>
 <strong>容量が逼迫した時の対処法:</strong>{' '}
 最新状態をJSONファイルとして書き出した後、古いスナップショットを一括削除して容量を開放してください。
 </li>
 </ul>
 </div>
 </div>
 )}

 {/* MODAL FOOTER */}
 <div
 className={`flex items-center justify-between px-4 sm:px-6 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:py-3 border-t shrink-0 ${themeClasses.headerBg} ${themeClasses.border}`}
 >
 <div className={`text-[11px] ${themeClasses.textMuted} flex items-center gap-1.5 max-sm:hidden`}>
 <Clock className="w-3.5 h-3.5" />
 <span>自動保存: 編集時に常時バックグラウンド実行中</span>
 </div>

 <button
 type="button"
 onClick={onClose}
 className={`max-sm:w-full max-sm:min-h-[40px] px-4 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${themeClasses.cardBg} ${themeClasses.activeToolHover}`}
 >
 閉じる
 </button>
 </div>
 </div>

 {/* CONFIRM RESTORE DIALOG */}
 {confirmRestoreId && (
 <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-[70] anim-fade">
 <div
 role="alertdialog"
 aria-modal="true"
 aria-label="スナップショットの復元"
 className={`w-full max-w-sm rounded-2xl p-5 border shadow-2xl space-y-3.5 ${themeClasses.modalBg} ${themeClasses.border}`}
 >
 <div className={`flex items-center space-x-2 ${themeClasses.accentText}`}>
 <RotateCcw className="w-5 h-5" />
 <h3 className="font-extrabold text-sm">スナップショットの復元</h3>
 </div>
 <p className={`text-xs ${themeClasses.textMuted} leading-relaxed`}>
 このスナップショットのデータを現在の作業キャンバスに上書き復元します。現在の作業中の未保存変更は置き換えられますが、復元しますか？
 </p>
 <div className="flex items-center justify-end space-x-2 pt-2">
 <button
 onClick={() => setConfirmRestoreId(null)}
 className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${themeClasses.cardBg} ${themeClasses.activeToolHover}`}
 >
 キャンセル
 </button>
 <button
 onClick={() => {
 const snap = snapshots.find((s) => s.id === confirmRestoreId);
 if (snap) handleRestoreSnapshot(snap);
 }}
 className={`px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer ${themeClasses.accentBtn}`}
 >
 復元を実行する
 </button>
 </div>
 </div>
 </div>
 )}

 {/* CONFIRM DELETE DIALOG */}
 {confirmDeleteId && (
 <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-[70] anim-fade">
 <div
 role="alertdialog"
 aria-modal="true"
 aria-label="スナップショットの削除"
 className={`w-full max-w-sm rounded-2xl p-5 border shadow-2xl space-y-3.5 ${themeClasses.modalBg} ${themeClasses.border}`}
 >
 <div className="flex items-center space-x-2 text-rose-600">
 <Trash2 className="w-5 h-5" />
 <h3 className="font-extrabold text-sm">スナップショットの削除</h3>
 </div>
 <p className={`text-xs ${themeClasses.textMuted} leading-relaxed`}>
 このスナップショットを削除します。削除されたデータは復元できません。よろしいですか？
 </p>
 <div className="flex items-center justify-end space-x-2 pt-2">
 <button
 onClick={() => setConfirmDeleteId(null)}
 className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${themeClasses.cardBg} ${themeClasses.activeToolHover}`}
 >
 キャンセル
 </button>
 <button
 onClick={() => handleDeleteSnapshot(confirmDeleteId)}
 className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors cursor-pointer"
 >
 削除する
 </button>
 </div>
 </div>
 </div>
 )}

 {/* CONFIRM STORAGE-BREAKDOWN DELETE DIALOG */}
 {confirmDeleteBreakdownItem && (
 <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-[70] anim-fade">
 <div
 role="alertdialog"
 aria-modal="true"
 aria-label="ストレージ項目の削除"
 className={`w-full max-w-sm rounded-2xl p-5 border shadow-2xl space-y-3.5 ${themeClasses.modalBg} ${themeClasses.border}`}
 >
 <div className="flex items-center space-x-2 text-rose-600">
 <Trash2 className="w-5 h-5" />
 <h3 className="font-extrabold text-sm">ストレージ項目の削除</h3>
 </div>
 <p className={`text-xs ${themeClasses.textMuted} leading-relaxed`}>
 {confirmDeleteBreakdownItem.key === SNAPSHOTS_INDEX_KEY
 ? 'スナップショット目録を削除します。目録に登録された全てのスナップショットデータも一緒に削除されます。削除されたデータは復元できません。よろしいですか？'
 : confirmDeleteBreakdownItem.key.startsWith(SNAPSHOT_DATA_PREFIX)
 ? `「${confirmDeleteBreakdownItem.label}」を削除します。スナップショット目録からも該当項目を除きます。削除されたデータは復元できません。よろしいですか？`
 : `「${confirmDeleteBreakdownItem.label}」を削除します。削除されたデータは復元できません。よろしいですか？`}
 </p>
 <div className="flex items-center justify-end space-x-2 pt-2">
 <button
 onClick={() => setConfirmDeleteBreakdownItem(null)}
 className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${themeClasses.cardBg} ${themeClasses.activeToolHover}`}
 >
 キャンセル
 </button>
 <button
 onClick={() => handleDeleteBreakdownItem(confirmDeleteBreakdownItem.key, confirmDeleteBreakdownItem.label)}
 className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors cursor-pointer"
 >
 削除する
 </button>
 </div>
 </div>
 </div>
 )}

 {/* CONFIRM CLEAR ALL DIALOG */}
 {confirmClearAll && (
 <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-[70] anim-fade">
 <div
 role="alertdialog"
 aria-modal="true"
 aria-label="全スナップショットの一括削除"
 className={`w-full max-w-sm rounded-2xl p-5 border shadow-2xl space-y-3.5 ${themeClasses.modalBg} ${themeClasses.border}`}
 >
 <div className="flex items-center space-x-2 text-rose-600">
 <Trash2 className="w-5 h-5" />
 <h3 className="font-extrabold text-sm">全スナップショットの一括削除</h3>
 </div>
 <p className={`text-xs ${themeClasses.textMuted} leading-relaxed`}>
 保存されているすべてのスナップショット（{snapshots.length}件）を削除し、ブラウザの保存領域を開放します。よろしいですか？
 </p>
 <div className="flex items-center justify-end space-x-2 pt-2">
 <button
 onClick={() => setConfirmClearAll(false)}
 className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${themeClasses.cardBg} ${themeClasses.activeToolHover}`}
 >
 キャンセル
 </button>
 <button
 onClick={handleClearAllSnapshots}
 className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors cursor-pointer"
 >
 全削除して容量開放
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
};
