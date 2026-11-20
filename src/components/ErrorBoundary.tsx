import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Download } from 'lucide-react';
import { loadProjectFromIndexedDB, LOCAL_STORAGE_PROJECT_KEY } from '../utils/storageManager';
import { clearIndexedDBStorage } from '../utils/indexedDBStorage';
import { STORAGE_KEYS, getStorageItem } from '../utils/storageKeys';
import { ThemeMode, getThemeClasses, isLightTheme } from '../utils/theme';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  hasSavedBackup: boolean;
  resetError: string | null;
  backupError: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public props: Props;
  public state: State;

  constructor(props: Props) {
    super(props);
    this.props = props;
    this.state = {
      hasError: false,
      error: null,
      hasSavedBackup: false,
      resetError: null,
      backupError: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, hasSavedBackup: false, resetError: null, backupError: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in Font Studio:', error, errorInfo);
  }

  private handleExportBackup = async () => {
    this.setState({ backupError: null });
    try {
      // Read both stores and use the newer copy by updatedAt (1-9).
      // LocalStorage mirrors lag edits by 2 seconds, so an older
      // LocalStorage copy must not win over a newer IndexedDB copy.
      let localJson: string | null = null;
      let localUpdatedAt = 0;
      try {
        localJson = localStorage.getItem(LOCAL_STORAGE_PROJECT_KEY);
        if (localJson) {
          const parsed = JSON.parse(localJson) as { updatedAt?: unknown };
          localUpdatedAt =
            typeof parsed?.updatedAt === 'number' && Number.isFinite(parsed.updatedAt) ? parsed.updatedAt : 0;
        }
      } catch {
        localJson = null;
        localUpdatedAt = 0;
      }

      let indexedJson: string | null = null;
      let indexedUpdatedAt = 0;
      let indexedDbFailed = false;
      try {
        const result = await loadProjectFromIndexedDB();
        if (result.status === 'ok' && result.project) {
          indexedJson = JSON.stringify(result.project, null, 2);
          indexedUpdatedAt = result.updatedAt;
        } else if (result.status === 'error') {
          indexedDbFailed = true;
        }
      } catch {
        indexedDbFailed = true;
      }

      let jsonString: string | null = null;
      if (indexedJson && localJson) {
        jsonString = indexedUpdatedAt >= localUpdatedAt ? indexedJson : localJson;
      } else {
        jsonString = indexedJson ?? localJson;
      }

      if (!jsonString) {
        this.setState({
          backupError: indexedDbFailed
            ? 'IndexedDBとLocalStorageのどちらからも保存データを取得できませんでした。IndexedDBの読み込みに失敗しました。'
            : 'IndexedDBとLocalStorageのどちらにも保存データがありませんでした。',
        });
        return;
      }

      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `font_rescue_backup_${Date.now()}.fontproj.json`;
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        try {
          a.remove();
          URL.revokeObjectURL(url);
        } catch {}
      }, 60000);
      this.setState({ hasSavedBackup: true });
    } catch (e) {
      console.error('Failed to export rescue backup:', e);
      this.setState({ backupError: 'プロジェクトJSONの書き出しに失敗しました。' });
    }
  };

  private handleReset = async () => {
    const failures: string[] = [];
    try {
      localStorage.removeItem(LOCAL_STORAGE_PROJECT_KEY);
      localStorage.removeItem(STORAGE_KEYS.THEME_MODE.primary);
      for (const legacyKey of STORAGE_KEYS.THEME_MODE.legacy) {
        localStorage.removeItem(legacyKey);
      }
    } catch (e) {
      console.error('Failed to clear localStorage during reset:', e);
      failures.push('ローカル保存データの削除に失敗しました。');
    }
    // Also delete the IndexedDB project data (active_project) and the
    // autosave history, so a corrupt stored project cannot break the
    // next launch again.
    try {
      const cleared = await clearIndexedDBStorage();
      if (!cleared) {
        failures.push('IndexedDBの削除に失敗しました。');
      }
    } catch (e) {
      console.error('Failed to clear IndexedDB during reset:', e);
      failures.push('IndexedDBの削除に失敗しました。');
    }
    if (failures.length > 0) {
      // Do not reload: the stored data may still be present, and the user
      // needs to see that the reset did not complete.
      this.setState({ resetError: failures.join(' ') });
      return;
    }
    window.location.reload();
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const validThemes: ThemeMode[] = ['light', 'dark', 'sepia', 'warm', 'nord', 'monochrome'];
      const rawSaved = getStorageItem(STORAGE_KEYS.THEME_MODE);
      const fallbackDomDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
      const resolvedTheme: ThemeMode =
        rawSaved && validThemes.includes(rawSaved as ThemeMode)
          ? (rawSaved as ThemeMode)
          : fallbackDomDark
          ? 'dark'
          : 'light';
      const themeClasses = getThemeClasses(resolvedTheme);
      const isLight = isLightTheme(resolvedTheme);

      return (
        <div className={`min-h-screen w-full flex items-center justify-center p-6 font-sans ${themeClasses.appBg}`}>
          <div className={`max-w-md w-full p-6 border flex flex-col items-center text-center shadow-xl ${themeClasses.modalBg} ${themeClasses.border} ${themeClasses.textPrimary}`}>
            <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h1 className={`text-base font-bold mb-2 ${themeClasses.textPrimary}`}>エラーが発生しました</h1>
            <p className={`text-xs mb-4 leading-relaxed ${themeClasses.textMuted}`}>
              画面描画中に例外が発生しました。初期化前にプロジェクトJSONを保存できます。
            </p>
            {this.state.error && (
              <div className={`w-full max-h-28 overflow-y-auto p-2.5 text-left text-[11px] font-mono border mb-5 break-all ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textMuted}`}>
                {this.state.error.message || String(this.state.error)}
              </div>
            )}
            {this.state.resetError && (
              <div className="w-full p-2.5 text-left text-[11px] border border-rose-300 bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 mb-5 break-all">
                キャッシュ初期化に失敗しました。{this.state.resetError}
              </div>
            )}
            {this.state.backupError && (
              <div className="w-full p-2.5 text-left text-[11px] border border-rose-300 bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 mb-5 break-all">
                {this.state.backupError}
              </div>
            )}

            {/* Rescue backup button */}
            <div className="w-full mb-3">
              <button
                type="button"
                onClick={this.handleExportBackup}
                className={`w-full px-4 py-2 text-xs font-bold border transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                  this.state.hasSavedBackup
                    ? themeClasses.accentBadge
                    : `${themeClasses.accentBtn} border-transparent`
                }`}
              >
                <Download className="w-4 h-4" />
                {this.state.hasSavedBackup ? 'プロジェクトJSONを保存しました' : 'プロジェクトJSONを書き出す'}
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <button
                type="button"
                onClick={this.handleReload}
                className={`flex-1 px-4 py-2 border text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                  isLight
                    ? 'bg-stone-800 hover:bg-stone-900 text-white border-transparent'
                    : 'bg-stone-700 hover:bg-stone-600 text-white border-transparent'
                }`}
              >
                <RotateCcw className="w-4 h-4" />
                再読み込み
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className={`px-4 py-2 border text-xs font-medium transition-colors cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textMuted} hover:text-rose-600`}
                title="ローカル保存データを初期化します"
              >
                キャッシュ初期化
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
