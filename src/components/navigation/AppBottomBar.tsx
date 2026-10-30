import React from 'react';
import { Undo2, Redo2 } from 'lucide-react';

export interface AppBottomBarProps {
  selectedChar: string;
  selectedUnicode: number;
  handleSelectPrevGlyph: () => void;
  handleSelectNextGlyph: () => void;
  handleSelectPrevUncompletedGlyph: () => void;
  handleSelectNextUncompletedGlyph: () => void;
  contourCount: number;
  handleUndo: () => void;
  handleRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  themeClasses: {
    toolbarBg: string;
    border: string;
    [key: string]: any;
  };
}

export const AppBottomBar: React.FC<AppBottomBarProps> = React.memo(({
  selectedChar,
  selectedUnicode,
  handleSelectPrevGlyph,
  handleSelectNextGlyph,
  handleSelectPrevUncompletedGlyph,
  handleSelectNextUncompletedGlyph,
  contourCount,
  handleUndo,
  handleRedo,
  canUndo,
  canRedo,
  themeClasses,
}) => {
  return (
    <div
      className={`hidden sm:flex h-9 border-t items-center justify-between px-3 text-xs shrink-0 ${themeClasses.toolbarBg} ${themeClasses.border}`}
    >
      <div className="flex items-center space-x-2">
        <span className="font-mono text-stone-500 dark:text-stone-400">
          {selectedChar} (U+
          {selectedUnicode.toString(16).toUpperCase().padStart(4, '0')})
        </span>
        <span className="text-stone-300 dark:text-stone-600">|</span>
        <button
          onClick={handleSelectPrevGlyph}
          className="px-1.5 py-0.5 rounded hover:bg-stone-200 dark:hover:bg-stone-700 font-mono text-[11px]"
          title="前の文字へ (Alt+Left)"
        >
          &lt; 前の文字
        </button>
        <button
          onClick={handleSelectNextGlyph}
          className="px-1.5 py-0.5 rounded hover:bg-stone-200 dark:hover:bg-stone-700 font-mono text-[11px]"
          title="次の文字へ (Alt+Right)"
        >
          次の文字 &gt;
        </button>
        <span className="text-stone-300 dark:text-stone-600">|</span>
        <button
          onClick={handleSelectPrevUncompletedGlyph}
          className="px-1.5 py-0.5 rounded hover:bg-stone-200 dark:hover:bg-stone-700 text-[11px] text-amber-600 dark:text-amber-400 font-medium"
          title="前の未作成文字へジャンプ"
        >
          &lt; 前の未作成
        </button>
        <button
          onClick={handleSelectNextUncompletedGlyph}
          className="px-1.5 py-0.5 rounded hover:bg-stone-200 dark:hover:bg-stone-700 text-[11px] text-amber-600 dark:text-amber-400 font-medium"
          title="次の未作成文字へジャンプ"
        >
          次の未作成 &gt;
        </button>
      </div>

      <div className="flex items-center space-x-2">
        <span className="text-stone-400 text-[11px]">
          輪郭数: {contourCount} パス
        </span>
        <span className="text-stone-300 dark:text-stone-600">|</span>
        <button
          onClick={handleUndo}
          disabled={!canUndo}
          className="p-1 rounded disabled:opacity-30 hover:bg-stone-100 dark:hover:bg-stone-800"
          title="元に戻す (Ctrl+Z)"
        >
          <Undo2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleRedo}
          disabled={!canRedo}
          className="p-1 rounded disabled:opacity-30 hover:bg-stone-100 dark:hover:bg-stone-800"
          title="やり直し (Ctrl+Y)"
        >
          <Redo2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
});

AppBottomBar.displayName = 'AppBottomBar';
