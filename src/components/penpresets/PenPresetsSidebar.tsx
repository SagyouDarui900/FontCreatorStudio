import React from 'react';
import { Download, Upload, Copy, Trash2 } from 'lucide-react';
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
  return (
    <div className="w-72 border-r border-stone-200 dark:border-stone-800 bg-stone-50/90 dark:bg-[#141e17] flex flex-col shrink-0 animate-in slide-in-from-left duration-150 overflow-hidden">
      <div className="p-2.5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
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

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {presets.map((p) => {
          const isSelected = p.id === workingPreset.id;
          return (
            <div
              key={p.id}
              onClick={() => onSelectPreset(p)}
              className={`p-2 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between ${
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
