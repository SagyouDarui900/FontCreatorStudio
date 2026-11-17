import React, { useMemo, useState } from 'react';
import { Download, Upload, Copy, Trash2, Search } from 'lucide-react';
import { UserPenPreset } from '../../types';
import { BRUSH_STYLE_INFO } from './constants';

interface PenPresetsSidebarProps {
  presets: UserPenPreset[];
  workingPreset: UserPenPreset;
  onSelectPreset: (p: UserPenPreset) => void;
  onDuplicatePreset: (p: UserPenPreset, e: React.MouseEvent) => void;
  onDeletePreset: (id: string, e: React.MouseEvent) => void;
  onExportPresets: () => void;
  onImportPresets: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const PenPresetsSidebar: React.FC<PenPresetsSidebarProps> = ({
  presets,
  workingPreset,
  onSelectPreset,
  onDuplicatePreset,
  onDeletePreset,
  onExportPresets,
  onImportPresets,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<'updated' | 'name'>('updated');

  const visiblePresets = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const matched = query
      ? presets.filter((p) => p.name.toLowerCase().includes(query))
      : [...presets];
    if (sortKey === 'name') {
      matched.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
    } else {
      matched.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    }
    return matched;
  }, [presets, searchQuery, sortKey]);

  return (
    <div className="w-56 border-r border-stone-200 dark:border-stone-800 bg-stone-50/90 dark:bg-[#141e17] flex flex-col shrink-0 anim-slide-left overflow-hidden">
      <div className="p-2 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
        <span className="text-xs font-bold text-stone-700 dark:text-stone-300">マイプリセット</span>
        <div className="flex items-center space-x-1">
          <button
            type="button"
            onClick={onExportPresets}
            className="p-1 hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-500 rounded cursor-pointer"
            title="JSONエクスポート"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <label className="p-1 hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-500 rounded cursor-pointer" title="JSONインポート">
            <Upload className="w-3.5 h-3.5" />
            <input type="file" accept=".json" onChange={onImportPresets} className="hidden" />
          </label>
        </div>
      </div>

      <div className="p-1.5 border-b border-stone-200 dark:border-stone-800 space-y-1.5">
        <div className="flex items-center gap-1 px-1.5 py-1 rounded-md border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900">
          <Search className="w-3.5 h-3.5 text-stone-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="名前で検索"
            className="min-w-0 flex-1 bg-transparent text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none"
          />
        </div>
        <div className="flex items-center justify-between gap-1">
          <span className="text-[10px] text-stone-500 dark:text-stone-400">
            {visiblePresets.length} / {presets.length} 件
          </span>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as 'updated' | 'name')}
            className="text-[11px] font-bold px-1 py-0.5 rounded border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 cursor-pointer outline-none"
            title="並び替え"
          >
            <option value="updated">更新日順</option>
            <option value="name">名前順</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
        {visiblePresets.length === 0 && (
          <p className="p-2 text-[11px] text-stone-500 dark:text-stone-400">
            {searchQuery ? '検索条件に合うプリセットがありません' : 'プリセットがありません'}
          </p>
        )}
        {visiblePresets.map((p) => {
          const isSelected = p.id === workingPreset.id;
          return (
            <div
              key={p.id}
              onClick={() => onSelectPreset(p)}
              className={`p-1.5 rounded-lg border text-xs cursor-pointer transition-colors flex items-center justify-between ${
                isSelected
                  ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200'
                  : 'border-stone-200/80 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 bg-white dark:bg-stone-900'
              }`}
            >
              <div className="flex flex-col truncate pr-2">
                <span className="font-bold truncate">{p.name}</span>
                <span className="text-[10px] text-stone-500 dark:text-stone-400">
                  {BRUSH_STYLE_INFO[p.brushStyle]?.name || p.brushStyle} · {p.brushWidth}px
                </span>
              </div>
              <div className="flex items-center space-x-1 shrink-0">
                <button
                  type="button"
                  onClick={(e) => onDuplicatePreset(p, e)}
                  className="p-1 hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded cursor-pointer"
                  title="複製"
                >
                  <Copy className="w-3 h-3" />
                </button>
                {p.isCustom && (
                  <button
                    type="button"
                    onClick={(e) => onDeletePreset(p.id, e)}
                    className="p-1 hover:bg-rose-100 dark:hover:bg-rose-950/60 text-stone-400 hover:text-rose-600 rounded cursor-pointer"
                    title="削除"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
