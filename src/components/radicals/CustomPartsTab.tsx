import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BookmarkPlus, Plus, Trash2, Sparkles, Layers, Search, Undo2 } from 'lucide-react';
import { CustomPart, PartCategory, PathContour } from '../../types';
import { GlyphPreviewSvg } from '../GlyphPreviewSvg';
import { RadicalsDensity } from './types';

type CustomPartsSortKey = 'name' | 'updated' | 'created';

/** 分類の選択肢。自動配置は偏・旁・冠・脚・垂・繞・構を使い、それ以外は偏になる。 */
export const PART_CATEGORY_OPTIONS: { id: PartCategory; label: string }[] = [
  { id: 'other', label: 'その他' },
  { id: 'hen', label: '偏 (へん)' },
  { id: 'tsukuri', label: '旁 (つくり)' },
  { id: 'kanmuri', label: '冠 (かんむり)' },
  { id: 'ashi', label: '脚 (あし)' },
  { id: 'tare', label: '垂 (たれ)' },
  { id: 'nyo', label: '繞 (にょう)' },
  { id: 'kamae', label: '構 (かまえ)' },
  { id: 'stroke', label: '筆画・点・払い' },
  { id: 'geometric', label: '幾何学パーツ' },
  { id: 'kana', label: '仮名共通部' },
];

const SORT_OPTIONS: { id: CustomPartsSortKey; label: string }[] = [
  { id: 'updated', label: '更新日時順' },
  { id: 'created', label: '作成日時順' },
  { id: 'name', label: '名前順' },
];

interface CustomPartsTabProps {
  isLight: boolean;
  gridDensity?: RadicalsDensity;
  showSaveInput: boolean;
  setShowSaveInput: (s: boolean) => void;
  createOnlyFrame: boolean;
  setCreateOnlyFrame: (c: boolean) => void;
  newPartName: string;
  setNewPartName: (n: string) => void;
  newPartCategory: PartCategory;
  setNewPartCategory: (c: PartCategory) => void;
  selectedChar: string;
  currentContours: PathContour[];
  customParts: CustomPart[];
  setCustomParts: React.Dispatch<React.SetStateAction<CustomPart[]>>;
  handleCreateNameFrame: (name?: string) => void;
  handleSaveContoursAsPart: (
    contours: PathContour[],
    defaultName: string,
    options?: { overwriteExisting?: boolean; category?: PartCategory }
  ) => void;
  handleInsertWithPlacement: (contours: PathContour[], name?: string, category?: string) => void;
  onBatchInsertCustomPart?: (part: CustomPart) => void;
  showNotice: (msg: string) => void;
}

export const CustomPartsTab: React.FC<CustomPartsTabProps> = ({
  isLight,
  gridDensity = 'medium',
  showSaveInput,
  setShowSaveInput,
  createOnlyFrame,
  setCreateOnlyFrame,
  newPartName,
  setNewPartName,
  newPartCategory,
  setNewPartCategory,
  selectedChar,
  currentContours,
  customParts,
  setCustomParts,
  handleCreateNameFrame,
  handleSaveContoursAsPart,
  handleInsertWithPlacement,
  onBatchInsertCustomPart,
  showNotice,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortKey, setSortKey] = useState<CustomPartsSortKey>('updated');
  const [pendingDelete, setPendingDelete] = useState<CustomPart | null>(null);
  const [deletedPart, setDeletedPart] = useState<{ part: CustomPart; index: number } | null>(null);
  const deletedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (deletedTimerRef.current !== null) {
        clearTimeout(deletedTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!deletedPart) return;
    deletedTimerRef.current = setTimeout(() => {
      setDeletedPart(null);
      deletedTimerRef.current = null;
    }, 10000);
    return () => {
      if (deletedTimerRef.current !== null) {
        clearTimeout(deletedTimerRef.current);
        deletedTimerRef.current = null;
      }
    };
  }, [deletedPart]);

  const filteredParts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const matched = q
      ? customParts.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            (p.description || '').toLowerCase().includes(q)
        )
      : [...customParts];
    const updatedOf = (p: CustomPart) => p.updatedAt ?? p.createdAt;
    if (sortKey === 'name') {
      matched.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
    } else if (sortKey === 'created') {
      matched.sort((a, b) => b.createdAt - a.createdAt);
    } else {
      matched.sort((a, b) => updatedOf(b) - updatedOf(a));
    }
    return matched;
  }, [customParts, searchQuery, sortKey]);

  const handlePartCategoryChange = (part: CustomPart, category: PartCategory) => {
    setCustomParts((prev) =>
      prev.map((p) => (p.id === part.id ? { ...p, category, updatedAt: Date.now() } : p))
    );
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    const target = pendingDelete;
    const index = customParts.findIndex((p) => p.id === target.id);
    setPendingDelete(null);
    if (index < 0) return;
    setDeletedPart({ part: target, index });
    setCustomParts((prev) => prev.filter((p) => p.id !== target.id));
    showNotice(`「${target.name}」をマイパーツから削除しました`);
  };

  const restoreDeletedPart = () => {
    if (!deletedPart) return;
    const { part, index } = deletedPart;
    if (deletedTimerRef.current !== null) {
      clearTimeout(deletedTimerRef.current);
      deletedTimerRef.current = null;
    }
    setDeletedPart(null);
    setCustomParts((prev) => {
      if (prev.some((p) => p.id === part.id)) return prev;
      const next = [...prev];
      next.splice(Math.min(index, next.length), 0, part);
      return next;
    });
    showNotice(`「${part.name}」を復元しました`);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 p-2 space-y-2">
      {/* Informational Guidance Banner */}
      {customParts.length === 0 ? (
        <div
          className={`p-2 rounded-lg border text-[11px] leading-relaxed shrink-0 ${
            isLight
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
              : 'bg-[#142319] border-[#223d2b] text-emerald-200'
          }`}
        >
          <div className="font-bold flex items-center gap-1.5 mb-0.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>メインキャンバス連動型マイパーツ</span>
          </div>
          <p className="text-[10px] text-stone-600 dark:text-stone-300">
            キャンバスで輪郭を選択し、上部ツールバーの<strong>「部首パーツに登録」</strong>を押すと1クリックで即時保存されます。
          </p>
        </div>
      ) : (
        <div
          className={`px-2 py-1 rounded border text-[10px] flex items-center gap-1.5 shrink-0 min-w-0 ${
            isLight
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
              : 'bg-[#142319] border-[#223d2b] text-emerald-200'
          }`}
        >
          <Sparkles className="w-3 h-3 text-emerald-600 shrink-0" />
          <span className="truncate">ツールバーの「部首パーツに登録」からも即時追加可能</span>
        </div>
      )}

      {/* Manual Save & Name Frame Creation Actions */}
      {!showSaveInput ? (
        <div className="grid grid-cols-2 gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setCreateOnlyFrame(false);
              setShowSaveInput(true);
            }}
            disabled={!currentContours || currentContours.length === 0}
            className={`min-w-0 overflow-hidden py-1.5 px-1.5 rounded-md border flex items-center justify-center gap-1 transition-colors font-bold text-[10.5px] cursor-pointer ${
              !currentContours || currentContours.length === 0
                ? 'opacity-50 cursor-not-allowed bg-stone-100 dark:bg-stone-800 text-stone-400 border-stone-200 dark:border-stone-700'
                : isLight
                ? 'bg-emerald-800 border-emerald-900 text-white hover:bg-emerald-900 shadow-xs'
                : 'bg-emerald-700 border-emerald-600 text-white hover:bg-emerald-600 shadow-xs'
            }`}
            title="現在の文字全体をマイパーツに保存"
          >
            <BookmarkPlus className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate whitespace-nowrap">現在文字を保存</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCreateOnlyFrame(true);
              setShowSaveInput(true);
            }}
            className={`min-w-0 overflow-hidden py-1.5 px-1.5 rounded-md border flex items-center justify-center gap-1 transition-colors font-bold text-[10.5px] cursor-pointer ${
              isLight
                ? 'bg-white border-stone-300 text-stone-700 hover:bg-stone-50 shadow-xs'
                : 'bg-[#1a261f] border-[#25362b] text-emerald-200 hover:bg-[#223127] shadow-xs'
            }`}
            title="空の名前枠を作成"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate whitespace-nowrap">空の枠を作成</span>
          </button>
        </div>
      ) : (
        <div
          className={`p-2 rounded-lg border space-y-1.5 shrink-0 ${
            isLight ? 'bg-white border-[#d8e6df]' : 'bg-[#1a261f] border-[#25362b]'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-1 min-w-0">
            <span className="text-[11px] font-bold truncate min-w-0">
              {createOnlyFrame ? 'パーツ枠の名前を入力:' : '保存するパーツ名を入力:'}
            </span>
            <button
              type="button"
              onClick={() => setCreateOnlyFrame(!createOnlyFrame)}
              className="text-[10px] text-emerald-700 dark:text-emerald-400 underline cursor-pointer whitespace-nowrap shrink-0"
            >
              {createOnlyFrame ? '→ 形状も保存' : '→ 名前枠だけ作成'}
            </button>
          </div>
          <input
            type="text"
            value={newPartName}
            onChange={(e) => setNewPartName(e.target.value)}
            placeholder={createOnlyFrame ? '例: さんずい, きへん, 自作枠1' : `例: ${selectedChar || '無題'}のへん`}
            className={`w-full px-2.5 py-1.5 rounded border text-xs font-bold ${
              isLight ? 'bg-[#f7faf8] border-stone-300 text-stone-800' : 'bg-[#101813] border-[#25362b] text-emerald-100'
            }`}
            autoFocus
          />
          <label className="flex items-center gap-1.5 text-[11px] font-bold">
            <span className="shrink-0">分類:</span>
            <select
              value={newPartCategory}
              onChange={(e) => setNewPartCategory(e.target.value as PartCategory)}
              className={`flex-1 min-w-0 px-1.5 py-1 rounded border text-[11px] cursor-pointer ${
                isLight ? 'bg-[#f7faf8] border-stone-300 text-stone-800' : 'bg-[#101813] border-[#25362b] text-emerald-100'
              }`}
              title="自動配置で使う分類。偏・旁・冠・脚・垂・繞・構以外は偏として挿入されます"
            >
              {PART_CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex justify-end gap-1.5 pt-0.5">
            <button
              type="button"
              onClick={() => setShowSaveInput(false)}
              className="px-2.5 py-1 rounded text-[11px] border border-stone-300 dark:border-stone-700 cursor-pointer whitespace-nowrap shrink-0"
            >
              キャンセル
            </button>
            {createOnlyFrame ? (
              <button
                type="button"
                onClick={() => handleCreateNameFrame()}
                className="px-3 py-1 rounded text-[11px] bg-emerald-800 text-white font-bold hover:bg-emerald-900 cursor-pointer whitespace-nowrap shrink-0"
              >
                名前枠を作成
              </button>
            ) : (
              <button
                type="button"
                onClick={() =>
                  handleSaveContoursAsPart(currentContours, `パーツ_${selectedChar || '無題'}`, {
                    category: newPartCategory,
                  })
                }
                className="px-3 py-1 rounded text-[11px] bg-emerald-800 text-white font-bold hover:bg-emerald-900 cursor-pointer whitespace-nowrap shrink-0"
              >
                保存
              </button>
            )}
          </div>
        </div>
      )}

      {/* Search, Count & Sort */}
      {customParts.length > 0 && (
        <div className="space-y-1.5 shrink-0">
          <div className="flex gap-1.5 min-w-0">
            <div className="relative flex-1 min-w-0">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="パーツ名で検索..."
                className={`w-full pl-8 pr-3 py-1.5 rounded-md border text-xs ${
                  isLight
                    ? 'bg-white border-stone-300 text-stone-800 focus:border-emerald-600'
                    : 'bg-[#1a261f] border-[#25362b] text-emerald-100 focus:border-emerald-500'
                }`}
              />
            </div>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as CustomPartsSortKey)}
              className={`px-1.5 py-1.5 rounded-md border text-[11px] shrink-0 cursor-pointer ${
                isLight ? 'bg-white border-stone-300 text-stone-800' : 'bg-[#1a261f] border-[#25362b] text-emerald-100'
              }`}
              title="並び替え"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between gap-1 text-[10px] text-stone-500 dark:text-stone-400 px-0.5">
            <span className="tabular-nums">
              表示 {filteredParts.length} / {customParts.length} 件
            </span>
            {searchQuery.trim() && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-emerald-700 dark:text-emerald-400 underline cursor-pointer whitespace-nowrap"
              >
                検索を解除
              </button>
            )}
          </div>
        </div>
      )}

      {/* Deleted Part Undo Bar */}
      {deletedPart && (
        <div
          className={`px-2 py-1.5 rounded border text-[11px] flex items-center justify-between gap-2 shrink-0 ${
            isLight
              ? 'bg-amber-50 border-amber-300 text-amber-950'
              : 'bg-amber-950/60 border-amber-700 text-amber-200'
          }`}
        >
          <span className="truncate">「{deletedPart.part.name}」を削除しました</span>
          <button
            type="button"
            onClick={restoreDeletedPart}
            className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-800 text-white hover:bg-emerald-900 flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Undo2 className="w-3 h-3" />
            <span>取り消す</span>
          </button>
        </div>
      )}

      {/* Saved Parts Grid / Name Frame Cards */}
      {customParts.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-stone-500 space-y-2">
          <BookmarkPlus className="w-10 h-10 opacity-30 text-emerald-600" />
          <p className="text-xs font-bold text-stone-700 dark:text-stone-300">マイパーツはまだありません</p>
          <p className="text-[10px] leading-relaxed max-w-xs text-stone-500">
            キャンバス上で偏や旁のパスを選択し、上部ツールバーの「部首パーツに登録」をクリックすると、ここに1クリックで保存されます。
          </p>
        </div>
      ) : filteredParts.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-stone-500 space-y-2">
          <Search className="w-8 h-8 opacity-30 text-emerald-600" />
          <p className="text-xs font-bold text-stone-700 dark:text-stone-300">条件に一致するパーツがありません</p>
          <p className="text-[10px] leading-relaxed max-w-xs text-stone-500">
            検索語句を変えるか、検索を解除してください。
          </p>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="px-2.5 py-1 rounded text-[11px] bg-emerald-800 text-white font-bold hover:bg-emerald-900 cursor-pointer"
          >
            検索を解除
          </button>
        </div>
      ) : (
        <div
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain grid gap-1.5 content-start pr-0.5 pb-28 sm:pb-8"
          style={{
            gridTemplateColumns: `repeat(auto-fill, minmax(${
              gridDensity === 'large' ? 108 : gridDensity === 'compact' ? 72 : 88
            }px, 1fr))`,
          }}
        >
          {filteredParts.map((part) => {
            const hasContours = part.contours && part.contours.length > 0;

            return (
              <div
                key={part.id}
                onClick={() => {
                  if (hasContours) {
                    handleInsertWithPlacement(part.contours, part.name, part.category);
                  } else {
                    showNotice(`「${part.name}」には輪郭が未登録です。「割当」を押してください`);
                  }
                }}
                title={hasContours ? `${part.name} をキャンバスに挿入` : `${part.name}（未割当の名前枠）`}
                className={`relative flex flex-col justify-between ${
                  gridDensity === 'compact' ? 'p-1.5' : 'p-2'
                } rounded-lg border overflow-hidden min-w-0 group transition-colors cursor-pointer ${
                  isLight
                    ? 'bg-white border-[#c8ded3] hover:border-emerald-700 hover:bg-emerald-50/40 shadow-xs'
                    : 'bg-[#1a261f] border-[#25362b] hover:border-emerald-500 hover:bg-[#223127]'
                }`}
              >
                {/* Card Top Actions Row (compact, non-overlapping) */}
                <div className="flex items-center justify-between gap-1 mb-1 min-w-0">
                  {hasContours && onBatchInsertCustomPart ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onBatchInsertCustomPart(part);
                      }}
                      className={`p-0.5 rounded text-[9px] font-bold border transition-colors flex items-center justify-center cursor-pointer shrink-0 ${
                        isLight
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-600 hover:text-white'
                          : 'bg-[#132219] border-emerald-700 text-emerald-300 hover:bg-emerald-600 hover:text-white'
                      }`}
                      title={`「${part.name}」を複数漢字へ一括流し込み`}
                    >
                      <Layers className="w-2.5 h-2.5 shrink-0" />
                    </button>
                  ) : (
                    <span className="text-[8.5px] px-1 py-0.5 rounded font-bold bg-amber-100 text-amber-950 dark:bg-amber-950/60 dark:text-amber-200 whitespace-nowrap shrink-0 leading-none">
                      枠
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPendingDelete(part);
                    }}
                    className="p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-950/50 text-stone-400 hover:text-red-600 transition-colors cursor-pointer shrink-0"
                    title="パーツを削除"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                {hasContours ? (
                  /* Vector Contour Preview */
                  <div className="flex flex-col items-center min-w-0">
                    <div
                      className={`shrink-0 ${
                        gridDensity === 'large'
                          ? 'w-14 h-14'
                          : gridDensity === 'compact'
                          ? 'w-8 h-8'
                          : 'w-11 h-11'
                      } flex items-center justify-center p-0.5 bg-stone-50 dark:bg-[#121c15] rounded border border-stone-100 dark:border-stone-800/60 overflow-hidden`}
                    >
                      <GlyphPreviewSvg
                        contours={part.contours}
                        fill={isLight ? '#1f2937' : '#ecfdf5'}
                        className="w-full h-full"
                      />
                    </div>
                    <span className="text-[9.5px] sm:text-[10px] font-bold mt-1 text-center w-full leading-[1.25] break-words line-clamp-2">
                      {part.name}
                    </span>
                    <select
                      value={part.category ?? 'other'}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => handlePartCategoryChange(part, e.target.value as PartCategory)}
                      className={`mt-1 w-full px-1 py-0.5 rounded border text-[9px] cursor-pointer ${
                        isLight ? 'bg-white border-stone-200 text-stone-600' : 'bg-[#18231c] border-[#25362b] text-stone-300'
                      }`}
                      title="分類を変更（自動配置で使う）"
                    >
                      {PART_CATEGORY_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  /* Minimal Name Frame Badge & Actions */
                  <div className="flex-1 flex flex-col justify-between gap-1.5 min-w-0">
                    <span className="text-[10px] font-bold text-stone-800 dark:text-emerald-100 text-center w-full leading-[1.25] break-words line-clamp-2">
                      {part.name}
                    </span>
                    <select
                      value={part.category ?? 'other'}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => handlePartCategoryChange(part, e.target.value as PartCategory)}
                      className={`w-full px-1 py-0.5 rounded border text-[9px] cursor-pointer ${
                        isLight ? 'bg-white border-stone-200 text-stone-600' : 'bg-[#18231c] border-[#25362b] text-stone-300'
                      }`}
                      title="分類を変更（自動配置で使う）"
                    >
                      {PART_CATEGORY_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>

                    <div className="flex items-center">
                      {currentContours.length > 0 ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveContoursAsPart(currentContours, part.name, {
                              overwriteExisting: true,
                            });
                          }}
                          className="w-full min-w-0 text-[9.5px] font-bold py-1 px-1 rounded bg-emerald-800 text-white hover:bg-emerald-900 transition-colors text-center shadow-xs cursor-pointer whitespace-nowrap truncate"
                          title="現在のキャンバスの文字をこの名前枠に保存"
                        >
                          文字割当
                        </button>
                      ) : (
                        <span className="text-[9px] text-stone-400 block text-center w-full truncate">
                          未割当
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {pendingDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setPendingDelete(null)}
        >
          <div
            className={`w-full max-w-xs rounded-lg border p-3 space-y-2 shadow-xl ${
              isLight ? 'bg-white border-stone-300' : 'bg-[#1a261f] border-[#25362b]'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs font-bold text-stone-800 dark:text-emerald-100">
              「{pendingDelete.name}」を削除しますか
            </p>
            <p className="text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
              削除したパーツは、表示される「取り消す」ボタンで10秒以内であれば復元できます。
            </p>
            <div className="flex justify-end gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="px-2.5 py-1 rounded text-[11px] border border-stone-300 dark:border-stone-700 cursor-pointer whitespace-nowrap"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-3 py-1 rounded text-[11px] bg-red-600 text-white font-bold hover:bg-red-700 cursor-pointer whitespace-nowrap"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
