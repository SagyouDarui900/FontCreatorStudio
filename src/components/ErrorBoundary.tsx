import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Download } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  hasSavedBackup: boolean;
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
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, hasSavedBackup: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in Font Studio:', error, errorInfo);
  }

  private handleExportBackup = async () => {
    try {
      let jsonString = localStorage.getItem('font_editor_project_data_v2');

      if (!jsonString) {
        try {
          const { loadProjectFromIndexedDB } = await import('../utils/indexedDBStorage');
          const result = await loadProjectFromIndexedDB();
          if (result && result.project) {
            jsonString = JSON.stringify(result.project, null, 2);
          }
        } catch {
          // ignore
        }
      }

      if (!jsonString) {
        return;
      }

      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `font_rescue_backup_${Date.now()}.fontproj.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      this.setState({ hasSavedBackup: true });
    } catch (e) {
      console.error('Failed to export rescue backup:', e);
    }
  };

  private handleReset = () => {
    try {
      localStorage.removeItem('font_editor_project_data_v2');
      localStorage.removeItem('font_editor_theme_mode');
    } catch {
      // Ignored
    }
    window.location.reload();
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let themeMode = 'light';
      try {
        const saved = localStorage.getItem('font_editor_theme_mode');
        if (saved) themeMode = saved;
      } catch {}

      const isDark = themeMode === 'dark' || themeMode === 'nord' || themeMode === 'monochrome' || (typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));
      const isSepia = themeMode === 'sepia';
      const isWarm = themeMode === 'warm';

      const bgClass = isDark
        ? 'bg-[#0f1712] text-stone-100'
        : isSepia
        ? 'bg-[#f4ede2] text-[#423323]'
        : isWarm
        ? 'bg-[#fbf3e8] text-[#3d2a1d]'
        : 'bg-[#f7faf8] text-stone-900';

      const cardClass = isDark
        ? 'bg-[#152319] border-[#25382c] text-emerald-100 shadow-2xl'
        : isSepia
        ? 'bg-[#fdfaf5] border-[#d8c5ab] text-[#423323] shadow-xl'
        : isWarm
        ? 'bg-[#fffaf3] border-[#ecd2b8] text-[#3d2a1d] shadow-xl'
        : 'bg-white border-emerald-100 text-stone-800 shadow-xl';

      const titleClass = isDark ? 'text-emerald-100' : isSepia ? 'text-[#423323]' : isWarm ? 'text-[#3d2a1d]' : 'text-stone-800';
      const subtitleClass = isDark ? 'text-stone-400' : isSepia ? 'text-[#7a644f]' : isWarm ? 'text-[#7d5f47]' : 'text-stone-500';

      const errBoxClass = isDark
        ? 'bg-[#0a110d] text-emerald-300 border-[#1f2d24]'
        : isSepia
        ? 'bg-[#f3ebe0] text-[#5c4632] border-[#dfceb9]'
        : isWarm
        ? 'bg-[#faefe2] text-[#543b29] border-[#ecd5bf]'
        : 'bg-stone-50 text-stone-600 border-stone-200';

      return (
        <div className={`min-h-screen w-full flex items-center justify-center p-6 font-sans ${bgClass}`}>
          <div className={`max-w-md w-full rounded-2xl p-6 border flex flex-col items-center text-center ${cardClass}`}>
            <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 mb-4">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h1 className={`text-xl font-bold mb-2 ${titleClass}`}>画面の表示で予期せぬエラーが発生しました</h1>
            <p className={`text-xs mb-4 leading-relaxed ${subtitleClass}`}>
              作業データの一時的な不整合または描画中に例外が生じました。初期化する前に、現在の作字データを安全にJSON保存できます。
            </p>
            {this.state.error && (
              <div className={`w-full max-h-28 overflow-y-auto p-2.5 rounded-lg text-left text-[11px] font-mono border mb-5 break-all ${errBoxClass}`}>
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            {/* Rescue backup button */}
            <div className="w-full mb-3">
              <button
                type="button"
                onClick={this.handleExportBackup}
                className={`w-full px-4 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  this.state.hasSavedBackup
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white border-transparent shadow-md'
                }`}
              >
                <Download className="w-4 h-4" />
                {this.state.hasSavedBackup ? '救済バックアップJSONを保存完了' : 'プロジェクトを救済保存 (JSONエクスポート)'}
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 px-4 py-2.5 bg-stone-800 hover:bg-stone-900 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer dark:bg-stone-700 dark:hover:bg-stone-600"
              >
                <RotateCcw className="w-4 h-4" />
                再読み込み
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="px-4 py-2.5 bg-stone-100 hover:bg-rose-50 hover:text-rose-700 text-stone-600 border border-stone-200 rounded-xl text-xs font-medium transition-colors cursor-pointer dark:bg-stone-800 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-rose-950 dark:hover:text-rose-300"
                title="ローカル保存データを初期化して復元します"
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
