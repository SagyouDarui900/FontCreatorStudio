import React from 'react';
import { Video, Type, X } from 'lucide-react';
import { FontProject } from '../../types';

interface FontPreviewSectionProps {
  isLight: boolean;
  previewText: string;
  setPreviewText: (text: string) => void;
  previewFontSize: number;
  setPreviewFontSize: (size: number) => void;
  previewFontFamily: string;
  project: FontProject;
}

export const FontPreviewSection: React.FC<FontPreviewSectionProps> = ({
  isLight,
  previewText,
  setPreviewText,
  previewFontSize,
  setPreviewFontSize,
  previewFontFamily,
  project,
}) => {
  return (
    <div
      className={`p-3.5 rounded-xl border space-y-3 ${
        isLight ? 'bg-stone-100/90 border-stone-200' : 'bg-[#121b15] border-[#223025]'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-950 dark:text-emerald-200">
          <Video className="w-3.5 h-3.5 text-emerald-600" />
          <span>レンダリング・シミュレーター (自由入力)</span>
        </div>

        <div className="flex items-center space-x-2 text-[11px]">
          <span className="text-stone-500 dark:text-stone-400">文字サイズ:</span>
          <input
            type="range"
            min={16}
            max={48}
            value={previewFontSize}
            onChange={(e) => setPreviewFontSize(Number(e.target.value))}
            className="w-20 sm:w-24 accent-emerald-600 h-1.5"
          />
          <span className="font-mono text-stone-700 dark:text-stone-300 w-8">
            {previewFontSize}px
          </span>
        </div>
      </div>

      {/* Custom Input Field with Type Icon */}
      <div className="flex items-center space-x-1.5">
        <div className="relative flex-1">
          <Type className="w-4 h-4 text-emerald-600 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={previewText}
            onChange={(e) => setPreviewText(e.target.value)}
            placeholder="プレビューしたい文字列を自由に入力..."
            className={`w-full pl-8.5 pr-8 py-1.5 text-xs rounded-lg border transition-all ${
              isLight
                ? 'bg-white border-stone-300 text-stone-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600'
                : 'bg-[#0f1712] border-[#25382b] text-emerald-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
            }`}
          />
          {previewText && (
            <button
              type="button"
              onClick={() => setPreviewText('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              title="クリア"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Quick Sample Presets Pills */}
      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
        <span className="text-[10.5px] font-semibold text-stone-500 dark:text-stone-400 shrink-0 mr-1">
          定番プリセット:
        </span>
        {[
          { label: 'いろは歌', text: 'いろはにほへと ちりぬるを わかよたれそ つねならむ' },
          { label: '五十音', text: 'あいうえお かきくけこ さしすせそ たちつてと' },
          { label: '漢字熟語', text: '青空 森林 宇宙 旅情 永遠 感謝 夢想 飛翔' },
          { label: '英数記号', text: 'The quick brown fox jumps over the lazy dog. 0123456789' },
        ].map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => setPreviewText(preset.text)}
            className={`px-2 py-0.5 rounded-md text-[10.5px] font-medium transition-all ${
              previewText === preset.text
                ? 'bg-emerald-700 text-white font-bold '
                : 'bg-white dark:bg-[#18261e] border border-stone-200 dark:border-[#283d30] text-stone-700 dark:text-emerald-200 hover:bg-emerald-50 dark:hover:bg-[#203328]'
            }`}
          >
            {preset.label}
          </button>
        ))}

        {/* Insert All Project Characters */}
        {project.glyphs && Object.keys(project.glyphs).length > 0 && (
          <button
            type="button"
            onClick={() => {
              const allChars = Object.values(project.glyphs)
                .map((g) => g.char || String.fromCodePoint(g.unicode))
                .join('');
              setPreviewText(allChars);
            }}
            className="px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-emerald-100/80 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900 transition-colors"
            title="プロジェクト内の作成済みグリフをすべて入力欄に挿入します"
          >
            作成済み文字 ({Object.keys(project.glyphs).length}字)
          </button>
        )}
      </div>

      {/* Rendered Live Font Display Box */}
      <div
        className={`p-4 rounded-xl border flex items-center justify-center min-h-[76px] overflow-x-auto transition-all ${
          isLight
            ? 'bg-white border-stone-200 shadow-inner'
            : 'bg-black/40 border-[#25362b] shadow-inner'
        }`}
      >
        {previewText && previewText.trim().length > 0 ? (
          <div
            style={{
              fontFamily: `'${previewFontFamily}', sans-serif`,
              fontSize: `${previewFontSize}px`,
            }}
            className="tracking-normal select-none text-stone-900 dark:text-emerald-100 transition-all text-center whitespace-nowrap px-2"
          >
            {previewText}
          </div>
        ) : (
          <span className="text-xs text-stone-400 italic">
            （上の入力欄にテストしたい文字を入力してください）
          </span>
        )}
      </div>
    </div>
  );
};
