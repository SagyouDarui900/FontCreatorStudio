import React from 'react';
import { Search } from 'lucide-react';
import { KANJI_RADICALS } from '../../data/kanjiRadicals';
import {
  KANGXI_RADICALS_CATALOG,
  KangxiRadicalItem,
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
  filteredKangxi: KangxiRadicalItem[];
  selectedFontStyle: FontStyleOption;
  extractingKangxiNum: number | null;
  setExtractingKangxiNum: (n: number | null) => void;
  onInsertWithPlacement: (contours: PathContour[], name?: string, category?: string) => void;
  setExtractChar: (c: string) => void;
  setActiveTab: (t: 'extract') => void;
  showNotice: (msg: string) => void;
}

export const KangxiRadicalsTab: React.FC<KangxiRadicalsTabProps> = ({
  isLight,
  kangxiSearch,
  setKangxiSearch,
  kangxiStrokeFilter,
  setKangxiStrokeFilter,
  filteredKangxi,
  selectedFontStyle,
  extractingKangxiNum,
  setExtractingKangxiNum,
  onInsertWithPlacement,
  setExtractChar,
  setActiveTab,
  showNotice,
}) => {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Search & Stroke Filter */}
      <div className={`p-2 border-b space-y-1.5 shrink-0 ${isLight ? 'bg-[#f4f8f5]' : 'bg-[#141d17]'}`}>
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-stone-400" />
          <input
            type="text"
            value={kangxiSearch}
            onChange={(e) => setKangxiSearch(e.target.value)}
            placeholder="部首名・読み・漢字で検索 (例: にんべん, ジン, 水)..."
            className={`w-full pl-8 pr-3 py-1.5 rounded-md border text-xs ${
              isLight
                ? 'bg-white border-stone-300 text-stone-800 focus:border-emerald-600'
                : 'bg-[#1a261f] border-[#25362b] text-emerald-100 focus:border-emerald-500'
            }`}
          />
        </div>

        {/* Stroke Count filter */}
        <div className="flex space-x-1 overflow-x-auto text-[10px] pb-0.5">
          <button
            type="button"
            onClick={() => setKangxiStrokeFilter('all')}
            className={`px-2 py-0.5 rounded-md whitespace-nowrap cursor-pointer ${
              kangxiStrokeFilter === 'all'
                ? 'bg-emerald-800 text-white font-bold'
                : isLight
                ? 'bg-white text-stone-700 border border-stone-200'
                : 'bg-[#1a261f] text-stone-300 border border-[#25362b]'
            }`}
          >
            全画数
          </button>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setKangxiStrokeFilter(s)}
              className={`px-2 py-0.5 rounded-md whitespace-nowrap cursor-pointer ${
                kangxiStrokeFilter === s
                  ? 'bg-emerald-800 text-white font-bold'
                  : isLight
                  ? 'bg-white text-stone-700 border border-stone-200'
                  : 'bg-[#1a261f] text-stone-300 border border-[#25362b]'
              }`}
            >
              {s}画
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-2 pb-28 sm:pb-8 space-y-1">
        {filteredKangxi.map((item) => (
          <div
            key={item.number}
            className={`p-2 rounded-lg border flex items-center justify-between transition-all ${
              isLight ? 'bg-white border-stone-200 hover:border-emerald-600' : 'bg-[#1a261f] border-[#25362b] hover:border-emerald-500'
            }`}
          >
            <div className="flex items-center space-x-3 min-w-0">
              <span
                style={{
                  fontFamily: selectedFontStyle.fontFamily,
                  fontWeight: selectedFontStyle.fontWeight,
                }}
                className="text-xl font-bold w-8 text-center shrink-0 text-emerald-950 dark:text-emerald-200"
              >
                {item.char}
              </span>
              <div className="min-w-0">
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-bold truncate">{item.name}</span>
                  <span className="text-[10px] text-stone-400">({item.strokes}画)</span>
                </div>
                <div className="text-[10px] text-stone-500 truncate">
                  音: {item.reading} {item.exampleChars && `| 例: ${item.exampleChars}`}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-1 shrink-0">
              <button
                type="button"
                disabled={extractingKangxiNum === item.number}
                onClick={async () => {
                  const matchedPreset = KANJI_RADICALS.find(
                    (r) => r.char === item.char || r.name.startsWith(item.name)
                  );

                  try {
                    setExtractingKangxiNum(item.number);
                    const contours = await getOrExtractRadicalContours(
                      item.char,
                      'full',
                      selectedFontStyle.fontFamily,
                      selectedFontStyle.fontWeight
                    );
                    if (contours && contours.length > 0) {
                      onInsertWithPlacement(contours, `${item.name} (${selectedFontStyle.label})`, matchedPreset?.category);
                      return;
                    }
                  } catch {
                    // fallback
                  } finally {
                    setExtractingKangxiNum(null);
                  }

                  if (matchedPreset && matchedPreset.contours.length > 0) {
                    onInsertWithPlacement(matchedPreset.contours, item.name, matchedPreset.category);
                    return;
                  }
                  showNotice(`「${item.char}」の輪郭抽出に失敗しました`);
                }}
                className={`px-2 py-1 rounded text-[10px] font-bold transition-colors flex items-center justify-center min-w-[42px] cursor-pointer ${
                  extractingKangxiNum === item.number
                    ? 'opacity-60 cursor-wait bg-stone-500 text-white'
                    : isLight
                    ? 'bg-emerald-800 text-white hover:bg-emerald-900'
                    : 'bg-emerald-600 text-white hover:bg-emerald-500'
                }`}
              >
                {extractingKangxiNum === item.number ? '抽出中…' : '挿入'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setExtractChar(item.char);
                  setActiveTab('extract');
                }}
                className={`px-2 py-1 rounded text-[10px] border transition-colors cursor-pointer ${
                  isLight ? 'border-stone-300 hover:bg-stone-100' : 'border-[#25362b] hover:bg-[#202d24]'
                }`}
                title="この部首の詳細抽出画面へ切り替える"
              >
                詳細
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
