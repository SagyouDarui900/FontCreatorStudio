import React from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { PathContour, ThemeClasses } from '../../types';

export interface NavigationSectionProps {
  selectedChar: string;
  selectedUnicode: number;
  contours: PathContour[];
  totalNodes: number;
  isExpanded: boolean;
  onToggle: () => void;
  themeClasses: ThemeClasses;
  onSelectPrevGlyph?: () => void;
  onSelectNextGlyph?: () => void;
  onSelectPrevUncompletedGlyph?: () => void;
  onSelectNextUncompletedGlyph?: () => void;
}

export const NavigationSection: React.FC<NavigationSectionProps> = ({
  selectedChar,
  selectedUnicode,
  contours,
  totalNodes,
  isExpanded,
  onToggle,
  themeClasses,
  onSelectPrevGlyph,
  onSelectNextGlyph,
  onSelectPrevUncompletedGlyph,
  onSelectNextUncompletedGlyph,
}) => {
  return (
    <div
      className={`flex flex-col rounded-xl border overflow-hidden transition-colors ${themeClasses.cardBg} ${themeClasses.border} shadow-xs`}
    >
      <div
        onClick={onToggle}
        className={`flex items-center justify-between p-2.5 cursor-pointer transition-colors ${themeClasses.activeToolHover}`}
      >
        <div className="flex items-center space-x-2.5 min-w-0">
          <div
            className={`w-10 h-10 rounded-lg border flex items-center justify-center text-center font-bold shrink-0 ${themeClasses.toolbarBg} ${themeClasses.accentBorder} ${themeClasses.accentText}`}
          >
            {selectedUnicode === 0x3000 ? (
              <span className="text-[9px] leading-tight">
                全角<br />空白
              </span>
            ) : selectedUnicode === 0x0020 ? (
              <span className="text-[9px] leading-tight">
                半角<br />空白
              </span>
            ) : (
              <span className="text-xl font-bold">{selectedChar || '・'}</span>
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className={`text-xs font-bold truncate ${themeClasses.textPrimary}`}>
              {selectedUnicode === 0x3000
                ? '全角空白 (U+3000)'
                : selectedUnicode === 0x0020
                ? '半角空白 (U+0020)'
                : selectedChar
                ? `文字: 「${selectedChar}」`
                : '未選択'}
            </span>
            <span className={`text-[10px] font-mono truncate ${themeClasses.textMuted}`}>
              U+{selectedUnicode.toString(16).toUpperCase().padStart(4, '0')} • {contours.length}パス ({totalNodes}頂点)
            </span>
          </div>
        </div>
        <div className="shrink-0 p-1 text-stone-400">
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {isExpanded && (
        <div className={`p-2.5 pt-0 space-y-2 border-t ${themeClasses.border}`}>
          {/* Navigation Button Grid */}
          <div className="grid grid-cols-2 gap-1.5 pt-2">
            <button
              type="button"
              onClick={onSelectPrevGlyph}
              disabled={!onSelectPrevGlyph}
              className={`min-h-[38px] py-1.5 px-2 rounded-lg border text-xs font-bold flex items-center justify-center space-x-1 transition-colors active:scale-95 disabled:opacity-40 cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.activeToolHover}`}
              title="前の文字へ (ショートカット: Alt+← または PageUp)"
            >
              <ChevronLeft className="w-4 h-4 shrink-0" />
              <span>前グリフ</span>
            </button>
            <button
              type="button"
              onClick={onSelectNextGlyph}
              disabled={!onSelectNextGlyph}
              className={`min-h-[38px] py-1.5 px-2 rounded-lg border text-xs font-bold flex items-center justify-center space-x-1 transition-colors active:scale-95 disabled:opacity-40 cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.activeToolHover}`}
              title="次の文字へ (ショートカット: Alt+→ または PageDown)"
            >
              <span>次グリフ</span>
              <ChevronRight className="w-4 h-4 shrink-0" />
            </button>

            <button
              type="button"
              onClick={onSelectPrevUncompletedGlyph}
              disabled={!onSelectPrevUncompletedGlyph}
              className={`min-h-[36px] py-1.5 px-2 rounded-lg border text-xs font-bold flex items-center justify-center space-x-1 transition-colors active:scale-95 disabled:opacity-40 cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.activeToolHover}`}
              title="前の未作成グリフへスキップ"
            >
              <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
              <span>未作成文字</span>
            </button>
            <button
              type="button"
              onClick={onSelectNextUncompletedGlyph}
              disabled={!onSelectNextUncompletedGlyph}
              className={`min-h-[36px] py-1.5 px-2 rounded-lg border text-xs font-bold flex items-center justify-center space-x-1 transition-colors active:scale-95 disabled:opacity-40 cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.activeToolHover}`}
              title="次の未作成グリフへジャンプ"
            >
              <span>未作成文字</span>
              <ChevronRight className="w-3.5 h-3.5 shrink-0" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
