import React from 'react';
import { Layers, Copy, Trash2, X } from 'lucide-react';
import { ToolMode } from '../../../types';

export interface MobileSelectionActionBarProps {
  toolMode: ToolMode;
  selectedContourIds: string[];
  isLight: boolean;
  handleMergeSelectedContours: () => void;
  setShowMobilePartSheet: (show: boolean) => void;
  handleDuplicateSelected: () => void;
  handleDeleteSelected: () => void;
  setSelectedContourIds: (ids: string[]) => void;
  setSelectedNodeId: (id: string | null) => void;
}

export const MobileSelectionActionBar: React.FC<MobileSelectionActionBarProps> = React.memo(({
  toolMode,
  selectedContourIds,
  isLight,
  handleMergeSelectedContours,
  setShowMobilePartSheet,
  handleDuplicateSelected,
  handleDeleteSelected,
  setSelectedContourIds,
  setSelectedNodeId,
}) => {
  if ((toolMode !== 'select' && toolMode !== 'node') || selectedContourIds.length === 0) {
    return null;
  }

  return (
    <div
      className={`sm:hidden absolute bottom-14 left-2 right-2 z-30 flex items-center justify-between px-3 py-1.5 rounded-full border shadow-xl whitespace-nowrap ${
        isLight
          ? 'bg-white border-emerald-300/80 text-stone-800'
          : 'bg-[#121c15] border-emerald-700/60 text-emerald-100'
      }`}
    >
      <div className="flex items-center space-x-1 shrink-0">
        <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 whitespace-nowrap">
          選択中{selectedContourIds.length > 1 ? ` (${selectedContourIds.length}個)` : ''}
        </span>
      </div>
      <div className="flex items-center space-x-1.5">
        {selectedContourIds.length >= 2 && (
          <button
            onClick={handleMergeSelectedContours}
            className="px-2.5 py-1 rounded-full bg-indigo-600 text-white text-xs font-bold active:scale-95 transition-transform flex items-center gap-1"
            title="選択したパスを合体"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>合体</span>
          </button>
        )}
        <button
          onClick={() => setShowMobilePartSheet(true)}
          className="px-2.5 py-1 rounded-full bg-emerald-600 text-white text-xs font-bold active:scale-95 transition-transform"
        >
          変形
        </button>
        <button
          onClick={handleDuplicateSelected}
          className="p-1.5 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-emerald-300"
          title="複製"
        >
          <Copy className="w-4 h-4" />
        </button>
        <button
          onClick={handleDeleteSelected}
          className="p-1.5 rounded-full hover:bg-rose-100 dark:hover:bg-rose-950 text-rose-600 dark:text-rose-400"
          title="削除"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            setSelectedContourIds([]);
            setSelectedNodeId(null);
          }}
          className="p-1.5 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400"
          title="選択解除"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});

MobileSelectionActionBar.displayName = 'MobileSelectionActionBar';
