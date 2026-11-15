import React from 'react';
import { Search, Flame } from 'lucide-react';
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
  selectedUnicode,
  onSelectUnicode,
  detectedStems,
  hoveredStemId,
  onHoverStem,
}) => {
  return (
    <div
      className={`w-full md:w-72 shrink-0 p-3 sm:p-4 pb-24 sm:pb-4 space-y-3 sm:space-y-4 overflow-y-auto ${themeClasses.sidebarBg} ${
        activeTab !== 'stems' ? 'hidden sm:block' : ''
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
        <div className="grid grid-cols-3 gap-1">
          <button
            onClick={() => onApplyPreset('retro')}
            className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border hover:border-amber-500 transition-colors cursor-pointer ${themeClasses.cardBg}`}
          >
            ドットゲーム
          </button>
          <button
            onClick={() => onApplyPreset('web_ui')}
            className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border hover:border-amber-500 transition-colors cursor-pointer ${themeClasses.cardBg}`}
          >
            Web・UI画面
          </button>
          <button
            onClick={() => onApplyPreset('soft')}
            className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border hover:border-amber-500 transition-colors cursor-pointer ${themeClasses.cardBg}`}
          >
            ソフト整列
          </button>
        </div>
      </div>

      {/* Glyph Grid Selector */}
      <div className="space-y-1.5">
        <label className={`text-[11px] font-bold uppercase tracking-wider flex items-center justify-between ${themeClasses.textMuted}`}>
          <span>検証対象文字選択 ({glyphList.length}):</span>
        </label>
        <div className={`grid grid-cols-5 gap-1.5 max-h-36 sm:max-h-40 overflow-y-auto p-1.5 border rounded-xl ${themeClasses.subtoolbarBg}`}>
          {glyphList.map((g) => (
            <button
              key={g.unicode}
              onClick={() => onSelectUnicode(g.unicode)}
              className={`h-9 rounded-lg font-bold text-sm border flex items-center justify-center transition-colors cursor-pointer ${
                selectedUnicode === g.unicode
                  ? 'bg-amber-600 text-white border-amber-600'
                  : `${themeClasses.cardBg} ${themeClasses.activeToolHover}`
              }`}
            >
              <span>{g.char}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Stem Detection Box */}
      <div className={`p-3 sm:p-3.5 rounded-xl border space-y-2.5 ${themeClasses.subtoolbarBg}`}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold flex items-center space-x-1.5">
            <Flame className="w-4 h-4 text-amber-500" />
            <span>検出ステム解析</span>
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-600">
            {detectedStems.length} 本
          </span>
        </div>

        {detectedStems.length === 0 ? (
          <p className={`text-[11px] py-2 ${themeClasses.textMuted}`}>
            選択中の文字から垂直・水平の主要ステムが検出されませんでした。
          </p>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {detectedStems.map((stem) => (
              <div
                key={stem.id}
                onMouseEnter={() => onHoverStem(stem.id)}
                onMouseLeave={() => onHoverStem(null)}
                className={`flex items-center justify-between text-[11px] p-2 rounded-lg border transition-colors cursor-pointer ${
                  hoveredStemId === stem.id
                    ? 'border-amber-500 bg-amber-500/10'
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
                    <div className={stem.shiftDelta !== 0 ? 'text-amber-500 font-bold' : ''}>
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
