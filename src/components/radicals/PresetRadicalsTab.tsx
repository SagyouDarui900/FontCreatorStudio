import React from 'react';
import { Search } from 'lucide-react';
import { KANJI_RADICALS } from '../../data/kanjiRadicals';
import { FontStyleOption } from '../../utils/radicalExtractor';

interface PresetRadicalsTabProps {
  isLight: boolean;
  presetSearch: string;
  setPresetSearch: (s: string) => void;
  categoryFilter: string;
  setCategoryFilter: (c: string) => void;
  filteredRadicals: (typeof KANJI_RADICALS);
  selectedFontStyle: FontStyleOption;
  onInsertPresetRadical: (radical: (typeof KANJI_RADICALS)[0]) => void;
  onImportAllPresetRadicals: () => void;
}

export const PresetRadicalsTab: React.FC<PresetRadicalsTabProps> = ({
  isLight,
  presetSearch,
  setPresetSearch,
  categoryFilter,
  setCategoryFilter,
  filteredRadicals,
  selectedFontStyle,
  onInsertPresetRadical,
  onImportAllPresetRadicals,
}) => {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Search & Action Bar */}
      <div className={`p-2 border-b space-y-1.5 shrink-0 ${isLight ? 'bg-[#f4f8f5]' : 'bg-[#141d17]'}`}>
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-stone-400" />
          <input
            type="text"
            value={presetSearch}
            onChange={(e) => setPresetSearch(e.target.value)}
            placeholder="部首名・漢字で検索 (例: さんずい, 木, 氵, 門)..."
            className={`w-full pl-8 pr-3 py-1.5 rounded-md border text-xs ${
              isLight
                ? 'bg-white border-stone-300 text-stone-800 focus:border-emerald-600'
                : 'bg-[#1a261f] border-[#25362b] text-emerald-100 focus:border-emerald-500'
            }`}
          />
        </div>

        {/* Category Filter Chips */}
        <div className="flex space-x-1 overflow-x-auto text-[10px] pb-0.5">
          {[
            { id: 'all', label: 'すべて' },
            { id: 'hen', label: '偏 (へん)' },
            { id: 'tsukuri', label: '旁 (つくり)' },
            { id: 'kanmuri', label: '冠 (かんむり)' },
            { id: 'ashi', label: '脚 (あし)' },
            { id: 'kamae', label: '構え' },
            { id: 'nyo', label: '繞 (にょう)' },
            { id: 'tare', label: '垂れ' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-2 py-0.5 rounded-md whitespace-nowrap text-[10px] transition-colors cursor-pointer ${
                categoryFilter === cat.id
                  ? isLight
                    ? 'bg-emerald-800 text-white font-bold'
                    : 'bg-emerald-600 text-white font-bold'
                  : isLight
                  ? 'bg-white text-stone-700 hover:bg-emerald-100 border border-stone-200'
                  : 'bg-[#1a261f] text-stone-300 hover:bg-[#25362b] border border-[#25362b]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Typographic Radicals */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-2.5 pb-28 sm:pb-8 grid grid-cols-3 gap-2 content-start">
        {filteredRadicals.map((radical) => {
          return (
            <button
              key={radical.id}
              type="button"
              onClick={() => onInsertPresetRadical(radical)}
              className={`flex flex-col items-center justify-between p-2 rounded-lg border group transition-all cursor-pointer ${
                isLight
                  ? 'bg-white border-[#c8ded3] hover:border-emerald-700 hover:bg-emerald-50 shadow-xs'
                  : 'bg-[#1a261f] border-[#25362b] hover:border-emerald-500 hover:bg-[#223127]'
              }`}
              title={`${radical.name} (${radical.char}) をキャンバスに挿入`}
            >
              <div className="w-14 h-14 flex items-center justify-center p-0.5">
                <span
                  style={{
                    fontFamily: selectedFontStyle.fontFamily,
                    fontWeight: selectedFontStyle.fontWeight,
                  }}
                  className={`text-2xl transition-transform group-hover:scale-110 ${
                    isLight ? 'text-stone-800 group-hover:text-emerald-900' : 'text-emerald-100 group-hover:text-white'
                  }`}
                >
                  {radical.char || radical.name}
                </span>
              </div>
              <span
                className={`text-[10px] font-bold mt-1 truncate w-full text-center ${
                  isLight ? 'text-stone-800 group-hover:text-emerald-950' : 'text-emerald-200 group-hover:text-white'
                }`}
              >
                {radical.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Footer action to import to My Parts */}
      <div className={`p-2 border-t shrink-0 flex items-center justify-between text-xs ${isLight ? 'bg-white' : 'bg-[#18231c]'}`}>
        <div className="flex flex-col">
          <span className="text-[10.5px] font-semibold text-stone-700 dark:text-stone-300">
            ベクター即時編集パーツ: {filteredRadicals.length} / 138 件
          </span>
          <span className="text-[9.5px] text-stone-500 dark:text-stone-400">
            全214部首は「康熙214」タブから参照・自動抽出可能
          </span>
        </div>
        <button
          type="button"
          onClick={onImportAllPresetRadicals}
          className={`px-2.5 py-1 rounded text-[11px] font-bold border transition-all cursor-pointer ${
            isLight
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900 hover:bg-emerald-100'
              : 'bg-[#1c2920] border-emerald-600 text-emerald-200 hover:bg-[#233529]'
          }`}
          title="すべての定番部首をマイパーツへ登録して自由に編集できるようにします"
        >
          マイパーツへ一括登録
        </button>
      </div>
    </div>
  );
};
