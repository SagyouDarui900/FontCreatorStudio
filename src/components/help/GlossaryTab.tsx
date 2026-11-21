import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { FONT_GLOSSARY, GLOSSARY_CATEGORIES } from './FontGlossaryData';

interface GlossaryTabProps {
  isLight: boolean;
}

export const GlossaryTab: React.FC<GlossaryTabProps> = ({ isLight }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredTerms = useMemo(() => {
    return FONT_GLOSSARY.filter((item) => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.term.toLowerCase().includes(q) ||
          (item.reading && item.reading.includes(q)) ||
          (item.english && item.english.toLowerCase().includes(q)) ||
          item.shortSummary.toLowerCase().includes(q) ||
          item.easyExplanation.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [selectedCategory, searchQuery]);

  const dividerClass = isLight ? 'border-stone-200' : 'border-[#25362b]';
  const mutedText = isLight ? 'text-stone-600' : 'text-stone-300';
  const subtleText = isLight ? 'text-stone-500' : 'text-stone-400';

  return (
    <div className="space-y-8">
      {/* Section Header */}
      <div className="space-y-1.5">
        <h3 className={`text-sm font-bold ${isLight ? 'text-stone-900' : 'text-stone-100'}`}>
          フォント用語辞典
        </h3>
        <p className={`text-xs leading-relaxed ${mutedText}`}>
          作字やフォント書き出しで使う主な用語の意味と、アプリ内の対応箇所をまとめています。
        </p>
      </div>

      {/* Visual Diagram: Anatomy of a Font Glyph */}
      <section className={`pt-6 border-t ${dividerClass} space-y-4`}>
        <div className="space-y-1">
          <h4 className={`text-xs font-bold ${isLight ? 'text-stone-900' : 'text-stone-100'}`}>
            グリフ枠と余白の構造
          </h4>
          <p className={`text-xs ${subtleText}`}>
            1文字の領域（1000 × 1000 単位）は、左右余白・字面・送り幅・ベースラインで構成されます。
          </p>
        </div>

        <div
          className={`p-4 rounded-lg border flex flex-col items-center ${
            isLight ? 'bg-stone-50/60 border-stone-200' : 'bg-[#111914] border-[#25362b]'
          }`}
        >
          <div
            className={`w-full max-w-md aspect-[16/9] sm:aspect-[2/1] relative border-2 border-dashed border-emerald-600/70 flex items-center justify-center p-2 sm:p-4 ${
              isLight ? 'bg-white' : 'bg-[#0c120e]'
            }`}
          >
            {/* Advance Width Indicator */}
            <div className="absolute top-1.5 inset-x-2 flex items-center justify-between text-[10px] text-emerald-700 dark:text-emerald-400 font-mono tabular-nums">
              <span>X = 0</span>
              <span className="font-bold">送り幅 (Advance Width: 1000)</span>
              <span>X = 1000</span>
            </div>

            {/* Left Bearing */}
            <div className="absolute left-0 inset-y-0 w-8 sm:w-12 bg-amber-500/10 border-r border-amber-500/40 flex items-center justify-center">
              <span className="text-[9px] font-medium text-amber-800 dark:text-amber-300 -rotate-90 whitespace-nowrap">
                左余白 (LSB)
              </span>
            </div>

            {/* Right Bearing */}
            <div className="absolute right-0 inset-y-0 w-8 sm:w-12 bg-amber-500/10 border-l border-amber-500/40 flex items-center justify-center">
              <span className="text-[9px] font-medium text-amber-800 dark:text-amber-300 rotate-90 whitespace-nowrap">
                右余白 (RSB)
              </span>
            </div>

            {/* Inner Glyph Area */}
            <div className="border border-emerald-500/50 bg-emerald-500/5 px-4 py-2 text-center flex flex-col items-center justify-center z-10">
              <span className="text-3xl sm:text-4xl font-serif font-bold text-emerald-900 dark:text-emerald-200">
                あ
              </span>
              <span className="text-[10px] font-medium text-emerald-800 dark:text-emerald-300 mt-1">
                字面（描画範囲）
              </span>
            </div>

            {/* Baseline indicator */}
            <div className="absolute bottom-5 inset-x-0 border-b border-stone-400 dark:border-stone-500 flex items-center justify-between px-2 text-[9px] font-mono text-stone-600 dark:text-stone-400">
              <span>ベースライン (Y = 200)</span>
              <span>英数字の下端基準</span>
            </div>
          </div>

          <dl className={`grid grid-cols-1 sm:grid-cols-3 gap-4 w-full mt-4 pt-3 border-t ${dividerClass} text-[11px]`}>
            <div className="space-y-0.5">
              <dt className={`font-bold ${isLight ? 'text-stone-900' : 'text-stone-100'}`}>
                仮想ボディ（外枠）
              </dt>
              <dd className={mutedText}>
                1文字分の正方形の基準枠（1000 × 1000 単位）です。
              </dd>
            </div>
            <div className="space-y-0.5">
              <dt className={`font-bold ${isLight ? 'text-stone-900' : 'text-stone-100'}`}>
                サイドベアリング（左右余白）
              </dt>
              <dd className={mutedText}>
                文字同士が接触しないよう左右に設ける間隔（LSB / RSB）です。
              </dd>
            </div>
            <div className="space-y-0.5">
              <dt className={`font-bold ${isLight ? 'text-stone-900' : 'text-stone-100'}`}>
                ベースライン
              </dt>
              <dd className={mutedText}>
                欧文の大文字や数字の下端を揃える水平基準線です。
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* Search & Category Filter */}
      <section className={`pt-6 border-t ${dividerClass} space-y-4`}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${subtleText}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="用語を検索（例: グリフ, 余白, ベジェ, OTF, 単純化）"
              className={`w-full pl-9 pr-3 py-2 rounded-md border text-xs outline-none transition-colors ${
                isLight
                  ? 'bg-white border-stone-300 text-stone-900 focus:border-emerald-600'
                  : 'bg-[#121c16] border-[#2c3d31] text-stone-100 focus:border-emerald-500'
              }`}
            />
          </div>
          <span className={`text-xs font-mono tabular-nums shrink-0 ${subtleText}`}>
            {filteredTerms.length} 件
          </span>
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs no-scrollbar">
          {GLOSSARY_CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-md font-medium shrink-0 whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-emerald-700 text-white'
                    : isLight
                    ? 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                    : 'bg-[#1a261f] hover:bg-[#23332a] text-stone-300'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Terms List */}
        {filteredTerms.length > 0 ? (
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 pt-2 border-t ${dividerClass}`}>
            {filteredTerms.map((t) => (
              <article key={t.id} className={`pt-4 border-t first:border-t-0 md:[&:nth-child(2)]:border-t-0 ${dividerClass} space-y-1.5`}>
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <h5 className={`text-xs font-bold ${isLight ? 'text-stone-900' : 'text-stone-100'}`}>
                    {t.term}
                  </h5>
                  {t.reading && (
                    <span className={`text-[11px] ${subtleText}`}>{t.reading}</span>
                  )}
                  {t.english && (
                    <span className={`text-[11px] font-mono ${subtleText}`}>/ {t.english}</span>
                  )}
                </div>

                <p className={`text-xs font-semibold ${isLight ? 'text-stone-800' : 'text-stone-200'}`}>
                  {t.shortSummary}
                </p>

                <p className={`text-xs leading-relaxed ${mutedText}`}>
                  {t.easyExplanation}
                </p>

                {t.appFeatureTip && (
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 leading-relaxed pt-0.5">
                    操作箇所: {t.appFeatureTip}
                  </p>
                )}
              </article>
            ))}
          </div>
        ) : (
          <p className={`py-8 text-center text-xs ${subtleText}`}>
            条件に一致する用語はありません。
          </p>
        )}
      </section>
    </div>
  );
};
