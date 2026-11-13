import React, { useState, useMemo, useCallback } from 'react';
import {
  X,
  Award,
  CheckCircle2,
  CircleDashed,
  ArrowRight,
  Search,
  Filter,
  BarChart3,
  Hash,
} from 'lucide-react';
import { FontProject } from '../../types';
import {
  calculateJisProgress,
  JOUYOU_KANJI_2136,
  getJisKuTenCode,
} from '../../data/jisKanjiSets';
import { JIS_LEVEL_1_KANJI } from '../../data/jisLevel1';
import { JIS_LEVEL_2_KANJI } from '../../data/jisLevel2';
import { isLightTheme, getThemeClasses, ThemeMode } from '../../utils/theme';

export interface JisProgressDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: FontProject;
  theme: ThemeMode;
  onSelectGlyph: (unicode: number) => void;
  onShowToast: (message: string, type: 'info' | 'success' | 'warning' | 'error') => void;
}

type StandardTab = 'jouyou' | 'jis1' | 'jis2';
type StatusFilter = 'all' | 'missing' | 'completed';
type SortOrder = 'standard' | 'kuten' | 'unicode';

export const JisProgressDashboardModal: React.FC<JisProgressDashboardModalProps> = ({
  isOpen,
  onClose,
  project,
  theme,
  onSelectGlyph,
  onShowToast,
}) => {
  const isLight = isLightTheme(theme);
  const themeClasses = getThemeClasses(theme);

  const [activeTab, setActiveTab] = useState<StandardTab>('jouyou');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('standard');
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize] = useState(180);
  const [currentPage, setCurrentPage] = useState(1);

  const progress = useMemo(() => {
    return calculateJisProgress(project?.glyphs || {});
  }, [project?.glyphs]);

  // Set of completed characters in current project
  const completedCharSet = useMemo(() => {
    const set = new Set<string>();
    const glyphs = project?.glyphs || {};
    Object.values(glyphs).forEach((g) => {
      if (!g) return;
      const hasVector = Array.isArray(g.contours) && g.contours.length > 0;
      const hasPixel = !!(g.pixelData && Array.isArray(g.pixelData.data) && g.pixelData.data.some((d) => d === 1));
      if (hasVector || hasPixel) {
        if (g.char) set.add(g.char);
        else if (g.unicode) {
          try {
            set.add(String.fromCodePoint(g.unicode));
          } catch {
            // ignore
          }
        }
      }
    });
    return set;
  }, [project?.glyphs]);

  // Base list depending on active tab
  const rawList = useMemo(() => {
    switch (activeTab) {
      case 'jouyou':
        return JOUYOU_KANJI_2136;
      case 'jis1':
        return JIS_LEVEL_1_KANJI;
      case 'jis2':
        return JIS_LEVEL_2_KANJI;
    }
  }, [activeTab]);

  // Filtered and sorted list
  const filteredList = useMemo(() => {
    let list = [...rawList];

    // Status filter
    if (statusFilter === 'missing') {
      list = list.filter((ch) => !completedCharSet.has(ch));
    } else if (statusFilter === 'completed') {
      list = list.filter((ch) => completedCharSet.has(ch));
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.trim();
      list = list.filter((ch) => ch.includes(q));
    }

    // Sort order
    if (sortOrder === 'unicode') {
      list.sort((a, b) => (a.codePointAt(0) || 0) - (b.codePointAt(0) || 0));
    } else if (sortOrder === 'kuten') {
      list.sort((a, b) => {
        const ka = getJisKuTenCode(a);
        const kb = getJisKuTenCode(b);
        const scoreA = ka ? ka.ku * 100 + ka.ten : 999999;
        const scoreB = kb ? kb.ku * 100 + kb.ten : 999999;
        if (scoreA !== scoreB) return scoreA - scoreB;
        return (a.codePointAt(0) || 0) - (b.codePointAt(0) || 0);
      });
    }

    return list;
  }, [rawList, statusFilter, searchQuery, sortOrder, completedCharSet, activeTab]);

  const totalPages = Math.max(1, Math.ceil(filteredList.length / pageSize));
  const validPage = Math.min(currentPage, totalPages);
  const pagedList = useMemo(() => {
    const start = (validPage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, validPage, pageSize]);

  // Jump to character in editor
  const handleJumpToChar = useCallback(
    (char: string) => {
      const unicode = char.codePointAt(0);
      if (!unicode) return;
      onSelectGlyph(unicode);
      onClose();
      onShowToast(`「${char}」(U+${unicode.toString(16).toUpperCase()}) を開きました`, 'success');
    },
    [onSelectGlyph, onClose, onShowToast]
  );

  // Jump to first missing character in active category
  const handleJumpToFirstMissing = useCallback(() => {
    const missing = rawList.find((ch) => !completedCharSet.has(ch));
    if (missing) {
      handleJumpToChar(missing);
    } else {
      onShowToast('この規格の文字はすべて作成完了しています！', 'success');
    }
  }, [rawList, completedCharSet, handleJumpToChar, onShowToast]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        className={`w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden ${themeClasses.cardBg} ${themeClasses.border}`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-5 py-3.5 border-b shrink-0 ${themeClasses.toolbarBg} ${themeClasses.border}`}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className={`text-base font-bold flex items-center gap-2 ${themeClasses.textPrimary}`}>
                JIS規格・常用漢字 制作進捗ダッシュボード
              </h2>
              <p className={`text-xs ${themeClasses.textMuted}`}>
                日本のフォント規格（常用漢字2,136字・JIS第1水準2,965字・第2水準3,390字）の制作達成状況を管理
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 transition-colors cursor-pointer ${themeClasses.activeToolHover}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Metric Cards Top Section */}
        <div
          className={`p-4 border-b grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0 ${
            isLight ? 'bg-stone-50/60' : 'bg-stone-900/40'
          } ${themeClasses.border}`}
        >
          {/* 常用漢字 */}
          <button
            onClick={() => {
              setActiveTab('jouyou');
              setCurrentPage(1);
            }}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
              activeTab === 'jouyou'
                ? isLight
                  ? 'bg-white border-emerald-500 shadow-md ring-2 ring-emerald-400/20'
                  : 'bg-[#15271e] border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                : isLight
                ? 'bg-white hover:border-stone-300'
                : 'bg-[#141b17] hover:border-stone-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-stone-600 dark:text-stone-300">常用漢字 (2,136字)</span>
              <span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                {progress.jouyou.percent}%
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden mb-1.5">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${progress.jouyou.percent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
              <span>完了: <strong className="text-stone-800 dark:text-stone-200">{progress.jouyou.completed}</strong> 字</span>
              <span>未作: {progress.jouyou.missingChars.length} 字</span>
            </div>
          </button>

          {/* JIS第1水準 */}
          <button
            onClick={() => {
              setActiveTab('jis1');
              setCurrentPage(1);
            }}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
              activeTab === 'jis1'
                ? isLight
                  ? 'bg-white border-teal-500 shadow-md ring-2 ring-teal-400/20'
                  : 'bg-[#142624] border-teal-500 shadow-md ring-2 ring-teal-500/20'
                : isLight
                ? 'bg-white hover:border-stone-300'
                : 'bg-[#141b17] hover:border-stone-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-stone-600 dark:text-stone-300">JIS第1水準 (2,965字)</span>
              <span className="font-mono font-bold text-sm text-teal-600 dark:text-teal-400">
                {progress.jis1.percent}%
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden mb-1.5">
              <div
                className="h-full bg-teal-500 rounded-full transition-all duration-300"
                style={{ width: `${progress.jis1.percent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
              <span>完了: <strong className="text-stone-800 dark:text-stone-200">{progress.jis1.completed}</strong> 字</span>
              <span>未作: {progress.jis1.missingChars.length} 字</span>
            </div>
          </button>

          {/* JIS第2水準 */}
          <button
            onClick={() => {
              setActiveTab('jis2');
              setCurrentPage(1);
            }}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
              activeTab === 'jis2'
                ? isLight
                  ? 'bg-white border-cyan-500 shadow-md ring-2 ring-cyan-400/20'
                  : 'bg-[#132429] border-cyan-500 shadow-md ring-2 ring-cyan-500/20'
                : isLight
                ? 'bg-white hover:border-stone-300'
                : 'bg-[#141b17] hover:border-stone-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-stone-600 dark:text-stone-300">JIS第2水準 (3,390字)</span>
              <span className="font-mono font-bold text-sm text-cyan-600 dark:text-cyan-400">
                {progress.jis2.percent}%
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden mb-1.5">
              <div
                className="h-full bg-cyan-500 rounded-full transition-all duration-300"
                style={{ width: `${progress.jis2.percent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
              <span>完了: <strong className="text-stone-800 dark:text-stone-200">{progress.jis2.completed}</strong> 字</span>
              <span>未作: {progress.jis2.missingChars.length} 字</span>
            </div>
          </button>
        </div>

        {/* Filter and Action Bar */}
        <div
          className={`px-4 py-2.5 border-b flex flex-wrap items-center justify-between gap-2.5 shrink-0 ${themeClasses.subtoolbarBg} ${themeClasses.border}`}
        >
          {/* Status filter tabs */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setStatusFilter('all');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? themeClasses.accentBtn
                  : `${themeClasses.textMuted} hover:${themeClasses.textPrimary}`
              }`}
            >
              全文字 ({rawList.length})
            </button>
            <button
              onClick={() => {
                setStatusFilter('missing');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                statusFilter === 'missing'
                  ? 'bg-rose-500 text-white'
                  : 'text-rose-600 dark:text-rose-400 hover:bg-rose-500/10'
              }`}
            >
              <CircleDashed className="w-3.5 h-3.5" />
              未作成のみ ({rawList.filter((ch) => !completedCharSet.has(ch)).length})
            </button>
            <button
              onClick={() => {
                setStatusFilter('completed');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                statusFilter === 'completed'
                  ? 'bg-emerald-600 text-white'
                  : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              完成済み ({rawList.filter((ch) => completedCharSet.has(ch)).length})
            </button>
          </div>

          {/* Sort Order, Quick Jump & Search Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Sort Mode Selector */}
            <div className={`flex items-center rounded-lg border p-0.5 text-[11px] ${themeClasses.cardBg} ${themeClasses.border}`}>
              <span className={`px-1.5 flex items-center gap-0.5 font-bold ${themeClasses.textMuted}`}>
                <Hash className="w-3 h-3" />
                <span className="hidden sm:inline">並び順:</span>
              </span>
              {[
                { id: 'standard', label: '標準' },
                { id: 'kuten', label: 'JIS区点' },
                { id: 'unicode', label: 'Unicode' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setSortOrder(opt.id as SortOrder);
                    setCurrentPage(1);
                  }}
                  className={`px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer ${
                    sortOrder === opt.id
                      ? themeClasses.accentBtn
                      : `${themeClasses.textMuted} hover:${themeClasses.textPrimary}`
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <button
              onClick={handleJumpToFirstMissing}
              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
              title="未作成の先頭文字をエディタで開いて制作を開始"
            >
              <span>次の未作成文字へジャンプ</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {/* Search */}
            <div className="relative">
              <Search className={`w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 ${themeClasses.textMuted}`} />
              <input
                type="text"
                placeholder="文字を検索..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className={`w-28 sm:w-36 border rounded-lg pl-7 pr-2 py-1 text-xs focus:outline-hidden ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary}`}
              />
            </div>
          </div>
        </div>

        {/* Character Grid Area */}
        <div className="flex-1 min-h-[320px] max-h-[50vh] overflow-y-auto p-4">
          {filteredList.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center">
              <p className={`text-sm ${themeClasses.textMuted}`}>該当する文字がありません</p>
            </div>
          ) : (
            <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-15 gap-2">
              {pagedList.map((ch) => {
                const isCompleted = completedCharSet.has(ch);
                const kuten = getJisKuTenCode(ch);
                const unicode = ch.codePointAt(0);

                return (
                  <button
                    key={ch}
                    onClick={() => handleJumpToChar(ch)}
                    className={`p-2 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer group relative ${
                      isCompleted
                        ? isLight
                          ? 'bg-emerald-50/80 border-emerald-300 text-stone-900 hover:bg-emerald-100 hover:scale-105'
                          : 'bg-[#12241b] border-emerald-800 text-emerald-100 hover:bg-[#1a3327] hover:scale-105'
                        : isLight
                        ? 'bg-white border-stone-200 text-stone-400 hover:border-emerald-400 hover:text-stone-800 hover:scale-105'
                        : 'bg-[#151c17] border-stone-800 text-stone-500 hover:border-emerald-600 hover:text-stone-200 hover:scale-105'
                    }`}
                    title={`「${ch}」U+${unicode?.toString(16).toUpperCase()}${
                      kuten ? ` (JIS区点 ${kuten.kuTenStr})` : ''
                    } - ${isCompleted ? '作成済み' : '未作成'}`}
                  >
                    <span className="text-xl font-medium leading-none mb-1 group-hover:scale-110 transition-transform">
                      {ch}
                    </span>
                    <span className="text-[9px] font-mono leading-none opacity-60">
                      {kuten ? kuten.kuTenStr : unicode ? unicode.toString(16).toUpperCase() : ''}
                    </span>
                    {isCompleted && (
                      <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Pagination */}
        <div
          className={`px-5 py-3 border-t flex items-center justify-between shrink-0 ${themeClasses.toolbarBg} ${themeClasses.border}`}
        >
          <div className={`text-xs ${themeClasses.textMuted}`}>
            全 <strong>{filteredList.length}</strong> 字中{' '}
            <span className="font-mono">
              {Math.min(filteredList.length, (validPage - 1) * pageSize + 1)}〜
              {Math.min(filteredList.length, validPage * pageSize)} 字
            </span>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                disabled={validPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded-lg border text-xs font-bold disabled:opacity-40 cursor-pointer"
              >
                前へ
              </button>
              <span className="text-xs font-mono font-bold px-2">
                {validPage} / {totalPages}
              </span>
              <button
                disabled={validPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded-lg border text-xs font-bold disabled:opacity-40 cursor-pointer"
              >
                次へ
              </button>
            </div>
          )}

          <button
            onClick={onClose}
            className={`px-4 py-1.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} hover:${themeClasses.activeToolHover}`}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
