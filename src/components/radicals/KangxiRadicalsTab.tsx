import React, { useState, useMemo } from 'react';
import { Search, Sparkles, Layers } from 'lucide-react';
import { KANJI_RADICALS } from '../../data/kanjiRadicals';
import { KANGXI_214_RADICALS, KangxiRadicalFullEntry } from '../../data/kangxi214Radicals';
import {
  FontStyleOption,
  getOrExtractRadicalContours,
} from '../../utils/radicalExtractor';
import { PathContour } from '../../types';

interface KangxiRadicalsTabProps {
  isLight: boolean;
  kangxiSearch: string;
  setKangxiSearch: (s: string) => void;
  kangxiStrokeFilter: number | 'all';
  setKangxiStrokeFilter: (f: number | 'all') => void;
  selectedFontStyle: FontStyleOption;
  extractingKangxiNum: number | null;
  setExtractingKangxiNum: (n: number | null) => void;
  onInsertWithPlacement: (contours: PathContour[], name?: string, category?: string) => void;
  onBatchInsertKangxi?: (item: KangxiRadicalFullEntry) => void;
  setExtractChar: (c: string) => void;
  setActiveTab: (t: 'extract') => void;
  showNotice: (msg: string) => void;
}

const CATEGORY_ITEMS: { id: string; label: string }[] = [
  { id: 'all', label: '全分類' },
  { id: 'hen', label: '偏 (左)' },
  { id: 'tsukuri', label: '旁 (右)' },
  { id: 'kanmuri', label: '冠 (上)' },
  { id: 'ashi', label: '脚 (下)' },
  { id: 'tare', label: '垂 (左上)' },
  { id: 'nyo', label: '繞 (左下)' },
  { id: 'kamae', label: '構 (枠)' },
  { id: 'basic', label: '基本筆画' },
];

const STROKE_RANGES: { id: string; label: string; min: number; max: number }[] = [
  { id: 'all', label: '全画数', min: 1, max: 20 },
  { id: '1-2', label: '1~2画', min: 1, max: 2 },
  { id: '3-4', label: '3~4画', min: 3, max: 4 },
  { id: '5-6', label: '5~6画', min: 5, max: 6 },
  { id: '7-8', label: '7~8画', min: 7, max: 8 },
  { id: '9-10', label: '9~10画', min: 9, max: 10 },
  { id: '11+', label: '11画以上', min: 11, max: 20 },
];

export const KangxiRadicalsTab: React.FC<KangxiRadicalsTabProps> = ({
  isLight,
  kangxiSearch,
  setKangxiSearch,
  selectedFontStyle,
  extractingKangxiNum,
  setExtractingKangxiNum,
  onInsertWithPlacement,
  onBatchInsertKangxi,
  setExtractChar,
  setActiveTab,
  showNotice,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStrokeRange, setSelectedStrokeRange] = useState<string>('all');

  const filteredRadicals = useMemo(() => {
    const q = kangxiSearch.trim().toLowerCase();
    const range = STROKE_RANGES.find((r) => r.id === selectedStrokeRange);

    return KANGXI_214_RADICALS.filter((item) => {
      // Category filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }
      // Stroke range filter
      if (range && range.id !== 'all') {
        if (item.strokes < range.min || item.strokes > range.max) {
          return false;
        }
      }
      // Search query filter
      if (q) {
        const matchChar = item.char.includes(q) || item.displayChar.includes(q);
        const matchName = item.name.toLowerCase().includes(q);
        const matchReading = item.reading.toLowerCase().includes(q);
        const matchAlt = item.altChars?.some((a) => a.includes(q));
        const matchKanji = item.kanjiList?.some((k) => k.includes(q));
        if (!matchChar && !matchName && !matchReading && !matchAlt && !matchKanji) {
          return false;
        }
      }
      return true;
    });
  }, [kangxiSearch, selectedCategory, selectedStrokeRange]);

  const insertRadicalChar = async (
    charToInsert: string,
    radicalNumber: number,
    radicalName: string,
    category?: string
  ) => {
    // 1. Try to match with authentic vector bezier contours in KANJI_RADICALS
    const matchedPreset = KANJI_RADICALS.find(
      (r) => r.char === charToInsert || r.name.startsWith(radicalName)
    );
    if (matchedPreset && matchedPreset.contours.length > 0) {
      onInsertWithPlacement(matchedPreset.contours, radicalName, category || matchedPreset.category);
      showNotice(`「${charToInsert}」(${radicalName}) を挿入しました`);
      return;
    }

    // 2. Extract vector contours via font engine
    try {
      setExtractingKangxiNum(radicalNumber);
      const contours = await getOrExtractRadicalContours(
        charToInsert,
        'full',
        selectedFontStyle.fontFamily,
        selectedFontStyle.fontWeight
      );
      if (contours && contours.length > 0) {
        onInsertWithPlacement(
          contours,
          `${radicalName} (${selectedFontStyle.label})`,
          category || matchedPreset?.category
        );
        showNotice(`「${charToInsert}」(${radicalName}) を抽出・挿入しました`);
        return;
      }
    } catch (err) {
      console.warn('Vector extraction fallback:', err);
    } finally {
      setExtractingKangxiNum(null);
    }

    showNotice(`「${charToInsert}」の輪郭抽出に失敗しました`);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Search & Filter Controls */}
      <div
        className={`p-2.5 border-b space-y-2 shrink-0 ${
          isLight ? 'bg-[#f4f8f5] border-[#d8e6df]' : 'bg-[#141d17] border-[#25362b]'
        }`}
      >
        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-stone-400" />
          <input
            type="text"
            value={kangxiSearch}
            onChange={(e) => setKangxiSearch(e.target.value)}
            placeholder="部首名・読み・漢字で瞬時検索 (例: さんずい, 氵, 海, 木)..."
            className={`w-full pl-8 pr-3 py-1.5 rounded-md border text-xs ${
              isLight
                ? 'bg-white border-stone-300 text-stone-800 focus:border-emerald-600'
                : 'bg-[#1a261f] border-[#25362b] text-emerald-100 focus:border-emerald-500'
            }`}
          />
          {kangxiSearch && (
            <button
              type="button"
              onClick={() => setKangxiSearch('')}
              className="absolute right-2.5 top-2 text-stone-400 hover:text-stone-600 text-xs cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Category Filter Pills */}
        <div className="flex space-x-1 overflow-x-auto no-scrollbar text-[10px] pb-0.5">
          {CATEGORY_ITEMS.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2 py-0.5 rounded whitespace-nowrap transition-colors cursor-pointer ${
                  isSelected
                    ? isLight
                      ? 'bg-emerald-800 text-white font-bold'
                      : 'bg-emerald-600 text-white font-bold'
                    : isLight
                    ? 'bg-white text-stone-700 border border-stone-200 hover:bg-emerald-50'
                    : 'bg-[#1a261f] text-stone-300 border border-[#25362b] hover:bg-[#202d24]'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Stroke Count Range Filter */}
        <div className="flex space-x-1 overflow-x-auto no-scrollbar text-[10px]">
          {STROKE_RANGES.map((rng) => {
            const isSelected = selectedStrokeRange === rng.id;
            return (
              <button
                key={rng.id}
                type="button"
                onClick={() => setSelectedStrokeRange(rng.id)}
                className={`px-2 py-0.5 rounded whitespace-nowrap transition-colors cursor-pointer ${
                  isSelected
                    ? isLight
                      ? 'bg-emerald-900 text-white font-bold'
                      : 'bg-emerald-500 text-stone-950 font-bold'
                    : isLight
                    ? 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
                    : 'bg-[#1c2920] text-stone-400 border border-[#28392d] hover:bg-[#223126]'
                }`}
              >
                {rng.label}
              </button>
            );
          })}
        </div>

        {/* Count summary */}
        <div className="flex items-center justify-between text-[10px] text-stone-500 dark:text-stone-400 pt-0.5">
          <span>該当部首: {filteredRadicals.length} / 214部首</span>
          <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
            <Sparkles className="w-3 h-3" />
            タイルクリックで即時挿入
          </span>
        </div>
      </div>

      {/* 4-5 Column Compact Visual Grid Matrix */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-2 pb-28 sm:pb-8">
        {filteredRadicals.length === 0 ? (
          <div className="text-center py-10 text-stone-400 text-xs">
            条件に一致する部首が見つかりませんでした
          </div>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
            {filteredRadicals.map((item) => {
              const isExtracting = extractingKangxiNum === item.number;
              const hasAlt = item.altChars && item.altChars.length > 0;

              return (
                <div
                  key={item.number}
                  className={`relative p-1.5 rounded-lg border flex flex-col items-center justify-between transition-colors group ${
                    isLight
                      ? 'bg-white border-stone-200 hover:border-emerald-600 hover:shadow-xs'
                      : 'bg-[#17221b] border-[#25362b] hover:border-emerald-500 hover:shadow-xs'
                  }`}
                >
                  {/* Top info badge */}
                  <div className="w-full flex items-center justify-between text-[8px] text-stone-400 font-mono leading-none mb-1">
                    <span>#{item.number}</span>
                    <div className="flex items-center gap-1">
                      <span>{item.strokes}画</span>
                      {onBatchInsertKangxi && (
                        <button
                          type="button"
                          disabled={isExtracting}
                          onClick={(e) => {
                            e.stopPropagation();
                            onBatchInsertKangxi(item);
                          }}
                          className={`px-1 py-0.2 rounded text-[8px] font-sans font-bold border transition-colors cursor-pointer ${
                            isLight
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-600 hover:text-white'
                              : 'bg-emerald-950/80 border-emerald-700 text-emerald-300 hover:bg-emerald-600 hover:text-white'
                          }`}
                          title={`「${item.name}」を複数漢字へ一括流し込み`}
                        >
                          <Layers className="w-2.5 h-2.5 inline" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Character Clickable Area for direct 1-click insertion */}
                  <button
                    type="button"
                    disabled={isExtracting}
                    onClick={() => insertRadicalChar(item.char, item.number, item.name, item.category)}
                    className="w-full flex flex-col items-center py-1 cursor-pointer transition-transform group-hover:scale-105 active:scale-95"
                    title={`「${item.char}」(${item.name}) を挿入`}
                  >
                    <span
                      style={{
                        fontFamily: selectedFontStyle.fontFamily,
                        fontWeight: selectedFontStyle.fontWeight,
                      }}
                      className="text-2xl font-bold leading-none text-emerald-950 dark:text-emerald-100 select-none"
                    >
                      {item.displayChar || item.char}
                    </span>
                    <span className="text-[9px] font-bold text-stone-700 dark:text-stone-300 truncate w-full text-center mt-1">
                      {item.name.split(' ')[0]}
                    </span>
                  </button>

                  {/* Variant Buttons (altChars: 氵, 扌, 亻, etc.) */}
                  {hasAlt ? (
                    <div className="w-full flex items-center justify-center gap-1 pt-1 border-t border-stone-100 dark:border-[#223326] mt-1">
                      {item.altChars!.map((alt, altIdx) => (
                        <button
                          key={`${item.number}-${alt}-${altIdx}`}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            insertRadicalChar(alt, item.number, `${item.name}変形`, item.category);
                          }}
                          className={`px-1 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                            isLight
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-900 hover:bg-emerald-100'
                              : 'bg-emerald-950/60 border-emerald-700 text-emerald-200 hover:bg-emerald-900'
                          }`}
                          title={`変形「${alt}」を挿入`}
                        >
                          {alt}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="w-full flex items-center justify-center text-[8px] text-stone-400 truncate pt-1 border-t border-stone-100 dark:border-[#223326] mt-1">
                      {item.reading.split('・')[0]}
                    </div>
                  )}

                  {/* Extracting overlay spinner */}
                  {isExtracting && (
                    <div className="absolute inset-0 bg-stone-900/80 rounded-lg flex items-center justify-center text-white text-[9px] font-bold">
                      抽出中…
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
