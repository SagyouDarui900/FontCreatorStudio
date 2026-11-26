import React, { useState, useMemo, useCallback, useEffect } from 'react';
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
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { FontProject } from '../../types';
import {
  calculateJisProgress,
  JOUYOU_KANJI_2136,
  getJisKuTenCode,
} from '../../data/jisKanjiSets';
import { JIS_LEVEL_1_KANJI } from '../../data/jisLevel1';
import { JIS_LEVEL_2_KANJI } from '../../data/jisLevel2';
import { getThemeClasses, ThemeMode } from '../../utils/theme';
import { useIsTopModal } from '../modals/ModalStackFrame';

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
  const themeClasses = getThemeClasses(theme);

  const [activeTab, setActiveTab] = useState<StandardTab>('jouyou');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('standard');
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize] = useState(180);
  const [currentPage, setCurrentPage] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isTopModal = useIsTopModal();

  // Escape exits fullscreen first, F toggles fullscreen outside form fields
  useEffect(() => {
    if (!isOpen || !isTopModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing) return;
      const activeTag = document.activeElement?.tagName.toLowerCase();
      const isInput =
        activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select';
      if (e.key === 'Escape') {
        e.preventDefault();
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          onClose();
        }
      } else if ((e.key === 'f' || e.key === 'F') && !isInput && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setIsFullscreen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isTopModal, isFullscreen, onClose]);

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
      aria-label="JIS規格・常用漢字 制作進捗ダッシュボード"
      className={`fixed inset-0 z-[60] anim-fade ${
        isFullscreen
          ? 'p-0 w-screen h-[100dvh] bg-black/85 flex flex-col'
          : 'flex flex-col sm:items-center sm:justify-center p-0 sm:p-4 bg-black/75 select-none'
      }`}
    >
      <div
        className={`flex flex-col overflow-hidden ${themeClasses.modalBg} ${
          isFullscreen
            ? 'w-screen h-[100dvh] rounded-none border-none shadow-none'
            : `w-full h-[100dvh] sm:h-auto sm:max-w-6xl border-0 sm:border ${themeClasses.border} rounded-none sm:rounded-2xl shadow-none sm:shadow-2xl sm:max-h-[92vh]`
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between gap-2 px-3.5 py-2.5 pt-[calc(0.625rem+env(safe-area-inset-top,0px))] sm:px-4 sm:py-2.5 sm:pt-2.5 border-b shrink-0 ${themeClasses.toolbarBg} ${themeClasses.border}`}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className={`hidden sm:flex w-8 h-8 rounded-xl border items-center justify-center shrink-0 ${themeClasses.accentBadge}`}>
              <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0 flex flex-col xl:flex-row xl:items-baseline xl:gap-3">
              <h2 className={`text-sm sm:text-base font-bold flex items-center gap-2 truncate ${themeClasses.textPrimary}`}>
                JIS規格・常用漢字 制作進捗ダッシュボード
              </h2>
              <p className={`hidden sm:block text-[11px] truncate ${themeClasses.textMuted}`}>
                常用漢字2,136字・JIS第1水準2,965字・第2水準3,390字の制作達成状況
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className={`hidden sm:flex p-1.5 px-2.5 rounded-lg border text-xs font-semibold items-center space-x-1.5 transition-colors cursor-pointer ${
                isFullscreen
                  ? themeClasses.activeTool
                  : `${themeClasses.cardBg} ${themeClasses.activeToolHover}`
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
              className={`p-1.5 max-sm:min-w-[40px] max-sm:min-h-[40px] flex items-center justify-center rounded-xl border transition-colors shrink-0 cursor-pointer ${themeClasses.cardBg} ${themeClasses.textMuted} ${themeClasses.activeToolHover}`}
              title="閉じる"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Metric Cards Top Section */}
        <div
          className={`p-2 sm:px-4 sm:py-2 border-b grid grid-cols-3 gap-1.5 sm:gap-2.5 shrink-0 ${themeClasses.subtoolbarBg} ${themeClasses.border}`}
        >
          {/* 常用漢字 */}
          <button
            onClick={() => {
              setActiveTab('jouyou');
              setCurrentPage(1);
            }}
            className={`p-2 sm:px-3 sm:py-2 rounded-xl border text-left transition-colors cursor-pointer relative overflow-hidden ${
              activeTab === 'jouyou'
                ? `${themeClasses.cardBg} ${themeClasses.accentBorder} ring-2 ring-emerald-500/20`
                : `${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.activeToolHover}`
            }`}
          >
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className={`text-[11px] sm:text-xs font-bold truncate ${themeClasses.textPrimary}`}>
                <span className="sm:hidden">常用漢字</span>
                <span className="hidden sm:inline">常用漢字 (2,136字)</span>
              </span>
              <span className="font-mono tabular-nums font-bold text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 shrink-0">
                {progress.jouyou.percent}%
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden sm:mb-1">
              <div
                className="h-full bg-emerald-500 rounded-full transition-[width] duration-300"
                style={{ width: `${progress.jouyou.percent}%` }}
              />
            </div>
            <div className={`hidden sm:flex items-center justify-between text-[11px] tabular-nums ${themeClasses.textMuted}`}>
              <span>完了: <strong className={themeClasses.textPrimary}>{progress.jouyou.completed}</strong> 字</span>
              <span>未作: {progress.jouyou.missingChars.length} 字</span>
            </div>
          </button>

          {/* JIS第1水準 */}
          <button
            onClick={() => {
              setActiveTab('jis1');
              setCurrentPage(1);
            }}
            className={`p-2 sm:px-3 sm:py-2 rounded-xl border text-left transition-colors cursor-pointer relative overflow-hidden ${
              activeTab === 'jis1'
                ? `${themeClasses.cardBg} border-teal-500 ring-2 ring-teal-500/20`
                : `${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.activeToolHover}`
            }`}
          >
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className={`text-[11px] sm:text-xs font-bold truncate ${themeClasses.textPrimary}`}>
                <span className="sm:hidden">JIS第1</span>
                <span className="hidden sm:inline">JIS第1水準 (2,965字)</span>
              </span>
              <span className="font-mono tabular-nums font-bold text-xs sm:text-sm text-teal-600 dark:text-teal-400 shrink-0">
                {progress.jis1.percent}%
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden sm:mb-1">
              <div
                className="h-full bg-teal-500 rounded-full transition-[width] duration-300"
                style={{ width: `${progress.jis1.percent}%` }}
              />
            </div>
            <div className={`hidden sm:flex items-center justify-between text-[11px] tabular-nums ${themeClasses.textMuted}`}>
              <span>完了: <strong className={themeClasses.textPrimary}>{progress.jis1.completed}</strong> 字</span>
              <span>未作: {progress.jis1.missingChars.length} 字</span>
            </div>
          </button>

          {/* JIS第2水準 */}
          <button
            onClick={() => {
              setActiveTab('jis2');
              setCurrentPage(1);
            }}
            className={`p-2 sm:px-3 sm:py-2 rounded-xl border text-left transition-colors cursor-pointer relative overflow-hidden ${
              activeTab === 'jis2'
                ? `${themeClasses.cardBg} border-cyan-500 ring-2 ring-cyan-500/20`
                : `${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.activeToolHover}`
            }`}
          >
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className={`text-[11px] sm:text-xs font-bold truncate ${themeClasses.textPrimary}`}>
                <span className="sm:hidden">JIS第2</span>
                <span className="hidden sm:inline">JIS第2水準 (3,390字)</span>
              </span>
              <span className="font-mono tabular-nums font-bold text-xs sm:text-sm text-cyan-600 dark:text-cyan-400 shrink-0">
                {progress.jis2.percent}%
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden sm:mb-1">
              <div
                className="h-full bg-cyan-500 rounded-full transition-[width] duration-300"
                style={{ width: `${progress.jis2.percent}%` }}
              />
            </div>
            <div className={`hidden sm:flex items-center justify-between text-[11px] tabular-nums ${themeClasses.textMuted}`}>
              <span>完了: <strong className={themeClasses.textPrimary}>{progress.jis2.completed}</strong> 字</span>
              <span>未作: {progress.jis2.missingChars.length} 字</span>
            </div>
          </button>
        </div>

        {/* Filter and Action Bar */}
        <div
          className={`px-3 sm:px-4 py-1.5 sm:py-2 border-b flex flex-wrap items-center justify-between gap-2 shrink-0 ${themeClasses.subtoolbarBg} ${themeClasses.border}`}
        >
          {/* Status filter tabs */}
          <div className="flex items-center gap-1 overflow-x-auto max-w-full no-scrollbar whitespace-nowrap">
            <button
              onClick={() => {
                setStatusFilter('all');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                statusFilter === 'all'
                  ? themeClasses.accentBtn
                  : `${themeClasses.textMuted} hover:bg-black/5 dark:hover:bg-white/10`
              }`}
            >
              全文字 ({rawList.length})
            </button>
            <button
              onClick={() => {
                setStatusFilter('missing');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
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
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                statusFilter === 'completed'
                  ? themeClasses.accentBtn
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
                      : `${themeClasses.textMuted} hover:bg-black/5 dark:hover:bg-white/10`
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <button
              onClick={handleJumpToFirstMissing}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer ${themeClasses.accentBtn}`}
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
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3.5 sm:p-4">
          {filteredList.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center">
              <p className={`text-sm ${themeClasses.textMuted}`}>該当する文字がありません</p>
            </div>
          ) : (
            <div className="grid grid-cols-5 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-15 xl:grid-cols-[repeat(18,minmax(0,1fr))] 2xl:grid-cols-[repeat(20,minmax(0,1fr))] gap-1.5">
              {pagedList.map((ch) => {
                const isCompleted = completedCharSet.has(ch);
                const kuten = getJisKuTenCode(ch);
                const unicode = ch.codePointAt(0);

                return (
                  <button
                    key={ch}
                    onClick={() => handleJumpToChar(ch)}
                    className={`p-1.5 sm:py-1.5 sm:px-1 rounded-lg border flex flex-col items-center justify-center transition-colors cursor-pointer group relative ${
                      isCompleted
                        ? `${themeClasses.accentBadge} hover:opacity-90`
                        : `${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textMuted} ${themeClasses.activeToolHover}`
                    }`}
                    title={`「${ch}」U+${unicode?.toString(16).toUpperCase()}${
                      kuten ? ` (JIS区点 ${kuten.kuTenStr})` : ''
                    } - ${isCompleted ? '作成済み' : '未作成'}`}
                  >
                    <span className="text-lg font-medium leading-tight mb-0.5">
                      {ch}
                    </span>
                    <span className="text-[9px] font-mono tabular-nums leading-none opacity-60">
                      {kuten ? kuten.kuTenStr : unicode ? unicode.toString(16).toUpperCase() : ''}
                    </span>
                    {isCompleted && (
                      <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-xs bg-emerald-500" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Pagination */}
        <div
          className={`px-3.5 sm:px-4 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] sm:py-2.5 border-t flex flex-wrap items-center justify-between gap-2 shrink-0 ${themeClasses.toolbarBg} ${themeClasses.border}`}
        >
          <div className={`text-xs tabular-nums ${themeClasses.textMuted}`}>
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
                className={`px-2.5 py-1 rounded-lg border text-xs font-bold disabled:opacity-40 transition-colors cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.activeToolHover}`}
              >
                前へ
              </button>
              <span className={`text-xs font-mono font-bold px-2 ${themeClasses.textPrimary}`}>
                {validPage} / {totalPages}
              </span>
              <button
                disabled={validPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className={`px-2.5 py-1 rounded-lg border text-xs font-bold disabled:opacity-40 transition-colors cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.activeToolHover}`}
              >
                次へ
              </button>
            </div>
          )}

          <button
            onClick={onClose}
            className={`max-sm:w-full min-h-[40px] sm:min-h-0 px-4 py-1.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.activeToolHover}`}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
