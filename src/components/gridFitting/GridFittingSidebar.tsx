import React from 'react';
import { Lock, Search } from 'lucide-react';
import { GlyphData } from '../../types';
import { ThemeClasses } from '../../utils/theme';
import { GridFittingPresetType, GridFittingTab, StemInfo } from './types';

interface GridFittingSidebarProps {
  themeClasses: ThemeClasses;
  activeTab: GridFittingTab;
  searchQuery: string;
  onChangeSearchQuery: (q: string) => void;
  onApplyPreset: (preset: GridFittingPresetType) => void;
  glyphList: GlyphData[];
  totalGlyphCount: number;
  showAllGlyphs: boolean;
  onToggleShowAllGlyphs: () => void;
  selectedUnicode: number;
  onSelectUnicode: (unicode: number) => void;
  detectedStems: StemInfo[];
  hoveredStemId: string | null;
  onHoverStem: (stemId: string | null) => void;
}

export const GridFittingSidebar: React.FC<GridFittingSidebarProps> = ({
  themeClasses,
  activeTab,
  searchQuery,
  onChangeSearchQuery,
  onApplyPreset,
  glyphList,
  totalGlyphCount,
  showAllGlyphs,
  onToggleShowAllGlyphs,
  selectedUnicode,
  onSelectUnicode,
  detectedStems,
  hoveredStemId,
  onHoverStem,
}) => {
  const isTruncated = !searchQuery.trim() && totalGlyphCount > glyphList.length;

  return (
    <div
      className={`w-full md:w-72 shrink-0 p-3 sm:p-4 space-y-3 sm:space-y-4 overflow-y-auto overscroll-contain ${themeClasses.sidebarBg} ${
        activeTab !== 'stems' ? 'hidden md:block' : 'flex-1 md:flex-none min-h-0'
      }`}
    >
      {/* Glyph Search */}
      <div className="relative">
        <Search className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${themeClasses.textMuted}`} />
        <input
          type="text"
          placeholder="文字・Unicode検索..."
          value={searchQuery}
          onChange={(e) => onChangeSearchQuery(e.target.value)}
          className={`w-full pl-8 pr-3 py-1.5 rounded-xl border text-xs outline-hidden ${themeClasses.cardBg}`}
        />
      </div>

      {/* Quick Presets Buttons */}
      <div className="space-y-1.5">
        <span className={`text-[10px] font-bold uppercase tracking-wider block ${themeClasses.textMuted}`}>
          クイックヒンティングプリセット:
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
          <button
            onClick={() => onApplyPreset('retro')}
            className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${themeClasses.cardBg}`}
          >
            ドットゲーム
          </button>
          <button
            onClick={() => onApplyPreset('web_ui')}
            className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${themeClasses.cardBg}`}
          >
            Web・UI画面
          </button>
          <button
            onClick={() => onApplyPreset('soft')}
            className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${themeClasses.cardBg}`}
          >
            ソフト整列
          </button>
        </div>
      </div>

      {/* Glyph Grid Selector */}
      <div className="space-y-1.5">
        <label className={`text-[11px] font-bold uppercase tracking-wider flex items-center justify-between ${themeClasses.textMuted}`}>
          <span>
            検証対象文字選択 ({isTruncated ? `${glyphList.length}/${totalGlyphCount}` : glyphList.length}):
          </span>
          {!searchQuery.trim() && totalGlyphCount > 80 && (
            <button
              type="button"
              onClick={onToggleShowAllGlyphs}
              className={`text-[10px] font-bold underline cursor-pointer ${themeClasses.accentText}`}
            >
              {showAllGlyphs ? '80文字に絞る' : `全${totalGlyphCount}文字を表示`}
            </button>
          )}
        </label>
        <div className={`grid grid-cols-4 sm:grid-cols-6 md:grid-cols-5 gap-1.5 md:max-h-44 md:overflow-y-auto p-1.5 border rounded-xl ${themeClasses.subtoolbarBg}`}>
          {glyphList.map((g) => (
            <button
              key={g.unicode}
              onClick={() => onSelectUnicode(g.unicode)}
              title={`${g.char} (U+${g.unicode.toString(16).toUpperCase()})${g.locked ? ' [ロック中]' : ''}`}
              className={`relative h-10 md:h-9 rounded-lg font-bold text-sm border flex items-center justify-center transition-colors cursor-pointer ${
                selectedUnicode === g.unicode
                  ? `${themeClasses.activeTool} border-transparent`
                  : `${themeClasses.cardBg} ${themeClasses.activeToolHover}`
              }`}
            >
              <span>{g.char}</span>
              {g.locked && (
                <Lock className="w-2.5 h-2.5 absolute top-0.5 right-0.5 opacity-75" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Stem Detection Box */}
      <div className={`p-3 sm:p-3.5 rounded-xl border space-y-2.5 ${themeClasses.subtoolbarBg}`}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold flex items-center space-x-1.5">
            <span>検出ステム解析</span>
          </span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${themeClasses.accentBadge}`}>
            {detectedStems.length} 本
          </span>
        </div>

        {detectedStems.length === 0 ? (
          <p className={`text-[11px] py-2 ${themeClasses.textMuted}`}>
            選択中の文字から垂直・水平の主要ステムが検出されませんでした。
          </p>
        ) : (
          <div className="space-y-1.5 md:max-h-48 md:overflow-y-auto pr-1">
            {detectedStems.map((stem) => (
              <div
                key={stem.id}
                onMouseEnter={() => onHoverStem(stem.id)}
                onMouseLeave={() => onHoverStem(null)}
                className={`flex items-center justify-between text-[11px] p-2 rounded-lg border transition-colors cursor-pointer ${
                  hoveredStemId === stem.id
                    ? `${themeClasses.accentBorder} ${themeClasses.accentBadge}`
                    : `${themeClasses.cardBg} ${themeClasses.activeToolHover}`
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      stem.type === 'v' ? 'bg-cyan-500' : 'bg-emerald-500'
                    }`}
                  />
                  <span className="font-bold">
                    {stem.type === 'v' ? '縦ステム (v)' : '横ステム (h)'}
                  </span>
                </div>
                <div className={`text-right font-mono text-[10px] ${themeClasses.textMuted}`}>
                  <div>位置: {stem.pos}u (幅 {stem.width}u)</div>
                  {stem.shiftDelta !== undefined && (
                    <div className={stem.shiftDelta !== 0 ? `${themeClasses.accentText} font-bold` : ''}>
                      シフト: {stem.shiftDelta > 0 ? `+${stem.shiftDelta}` : stem.shiftDelta}u
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
