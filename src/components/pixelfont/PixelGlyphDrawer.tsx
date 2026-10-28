import React from 'react';
import { Search, X } from 'lucide-react';
import { PIXEL_STUDIO_CATEGORIES } from './constants';

interface PixelGlyphDrawerProps {
  displayedGlyphList: { unicode: number; char: string; hasData: boolean }[];
  currentUnicode: number;
  glyphSearchQuery: string;
  setGlyphSearchQuery: (q: string) => void;
  activeCategory: string;
  setActiveCategory: (cat: string) => void;
  onSelectGlyphItem: (unicode: number) => void;
  isLight: boolean;
  isMobile?: boolean;
}

export const PixelGlyphDrawer: React.FC<PixelGlyphDrawerProps> = ({
  displayedGlyphList,
  currentUnicode,
  glyphSearchQuery,
  setGlyphSearchQuery,
  activeCategory,
  setActiveCategory,
  onSelectGlyphItem,
  isLight,
  isMobile = false,
}) => {
  if (isMobile) {
    return (
      <div
        className={`flex md:hidden flex-1 overflow-hidden flex-col ${
          isLight ? 'bg-stone-50 text-stone-900' : 'bg-[#0c130f] text-emerald-100'
        }`}
      >
        {/* Glyph Search Bar */}
        <div className="p-2 border-b border-stone-300 dark:border-stone-800">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={glyphSearchQuery}
              onChange={(e) => setGlyphSearchQuery(e.target.value)}
              placeholder="文字またはUnicode検索 (例: あ, A, 3042)"
              className="w-full pl-9 pr-8 py-2 text-sm border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#0a0f0c] focus:outline-hidden focus:border-emerald-500 rounded-none"
            />
            {glyphSearchQuery && (
              <button
                onClick={() => setGlyphSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Horizontal Scroll */}
        <div className="px-2 py-1.5 border-b border-stone-300 dark:border-stone-800 flex overflow-x-auto no-scrollbar gap-1.5 text-xs shrink-0">
          {PIXEL_STUDIO_CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              className={`px-2.5 py-1 min-h-[32px] border text-xs font-bold shrink-0 transition-colors cursor-pointer ${
                activeCategory === c.id
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : isLight
                  ? 'bg-white border-stone-300 text-stone-700'
                  : 'bg-[#142018] border-stone-800 text-stone-300'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Glyph Cards Grid with Generous Touch Targets */}
        <div className="flex-1 overflow-y-auto p-2">
          <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
            {displayedGlyphList.map((item) => {
              const isSelected = item.unicode === currentUnicode;
              return (
                <button
                  key={item.unicode}
                  onClick={() => onSelectGlyphItem(item.unicode)}
                  className={`aspect-square min-h-[52px] flex flex-col items-center justify-center border relative transition-all active:scale-95 cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-400 font-extrabold shadow-md'
                      : isLight
                      ? 'bg-white border-stone-300 text-stone-800 hover:bg-stone-100'
                      : 'bg-[#101812] border-stone-800 text-emerald-100 hover:bg-[#16251b]'
                  }`}
                >
                  <span className="text-xl font-bold leading-none select-none">
                    {item.char}
                  </span>
                  <span className="text-[9px] font-mono opacity-60 mt-0.5">
                    {item.unicode.toString(16).toUpperCase()}
                  </span>
                  {item.hasData && (
                    <div
                      className={`w-2 h-2 rounded-full absolute top-1 right-1 ${
                        isSelected ? 'bg-white' : 'bg-emerald-500'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {displayedGlyphList.length === 0 && (
            <div className="text-center py-12 text-stone-400 text-sm">
              一致する文字がありません
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`hidden md:flex w-60 sm:w-64 border-r-2 flex-col shrink-0 z-20 overflow-hidden ${
        isLight ? 'bg-stone-50 border-stone-300' : 'bg-[#101812] border-[#294232]'
      }`}
    >
      {/* Glyph Search Bar */}
      <div className="p-2 border-b border-stone-300 dark:border-stone-800">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={glyphSearchQuery}
            onChange={(e) => setGlyphSearchQuery(e.target.value)}
            placeholder="文字またはUnicode検索 (例: あ, A, 3042)"
            className="w-full pl-8 pr-2 py-1 text-xs border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#0a0f0c] focus:outline-hidden focus:border-emerald-500 rounded-none"
          />
          {glyphSearchQuery && (
            <button
              onClick={() => setGlyphSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="px-2 py-1.5 border-b border-stone-300 dark:border-stone-800 flex flex-wrap gap-1 text-[10.5px]">
        {PIXEL_STUDIO_CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveCategory(c.id)}
            className={`px-1.5 py-0.5 border text-[10.5px] font-bold transition-colors cursor-pointer ${
              activeCategory === c.id
                ? 'bg-emerald-600 text-white border-emerald-600'
                : isLight
                ? 'bg-white border-stone-200 text-stone-700 hover:bg-stone-100'
                : 'bg-[#142018] border-stone-800 text-stone-300 hover:bg-[#1a2820]'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Glyph Cards Grid */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
          {displayedGlyphList.map((item) => {
            const isSelected = item.unicode === currentUnicode;
            return (
              <button
                key={item.unicode}
                onClick={() => onSelectGlyphItem(item.unicode)}
                className={`aspect-square flex flex-col items-center justify-center border relative transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-600 text-white border-emerald-400 font-extrabold'
                    : isLight
                    ? 'bg-white border-stone-300 text-stone-800 hover:bg-stone-100 hover:border-emerald-500'
                    : 'bg-[#0a0f0c] border-stone-800 text-emerald-100 hover:bg-[#16251b] hover:border-emerald-600'
                }`}
                title={`U+${item.unicode.toString(16).toUpperCase().padStart(4, '0')} (${item.char})`}
              >
                <span className="text-base sm:text-lg leading-none font-bold select-none">
                  {item.char}
                </span>
                {item.hasData && (
                  <div
                    className={`w-1.5 h-1.5 rounded-full absolute bottom-0.5 right-0.5 ${
                      isSelected ? 'bg-white' : 'bg-emerald-500'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {displayedGlyphList.length === 0 && (
          <div className="text-center py-8 text-stone-400 text-xs">
            一致する文字がありません
          </div>
        )}
      </div>

      {/* Bottom Summary */}
      <div className="p-2 border-t border-stone-300 dark:border-stone-800 text-[10.5px] flex items-center justify-between opacity-70">
        <span>{displayedGlyphList.length} 文字表示</span>
        <span className="font-mono">U+{currentUnicode.toString(16).toUpperCase()}</span>
      </div>
    </div>
  );
};
