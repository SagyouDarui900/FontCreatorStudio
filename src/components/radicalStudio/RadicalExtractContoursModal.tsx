import React, { useState, useMemo } from 'react';
import { Scissors, X } from 'lucide-react';
import { GlyphData, PathContour } from '../../types';

interface RadicalExtractContoursModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLight: boolean;
  glyphs: GlyphData[];
  onExtractFromGlyph: (glyph: GlyphData) => void;
  contoursToSvgPath: (contours: PathContour[]) => string;
}

export const RadicalExtractContoursModal: React.FC<RadicalExtractContoursModalProps> = ({
  isOpen,
  onClose,
  isLight,
  glyphs,
  onExtractFromGlyph,
  contoursToSvgPath,
}) => {
  const [extractSearch, setExtractSearch] = useState<string>('');

  const filteredGlyphs = useMemo(() => {
    return glyphs.filter((g) => {
      if (!extractSearch) return true;
      return (
        (g.char && g.char.includes(extractSearch)) ||
        (g.name && g.name.toLowerCase().includes(extractSearch.toLowerCase()))
      );
    });
  }, [glyphs, extractSearch]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 animate-fadeIn">
      <div
        className={`w-full max-w-lg rounded-xl border shadow-2xl flex flex-col max-h-[85vh] overflow-hidden ${
          isLight ? 'bg-white border-[#c8ded3]' : 'bg-[#16221a] border-[#25362b]'
        }`}
      >
        <div className="p-3.5 border-b flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Scissors className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            <h3 className="text-sm font-bold">文字データからパーツを抽出</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-stone-400 hover:text-stone-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 border-b">
          <input
            type="text"
            placeholder="抽出したい文字を検索..."
            value={extractSearch}
            onChange={(e) => setExtractSearch(e.target.value)}
            className={`w-full px-3 py-1.5 rounded-md text-xs border outline-hidden ${
              isLight ? 'bg-[#f7faf8] border-[#c8ded3]' : 'bg-[#101712] border-[#25362b]'
            }`}
          />
        </div>

        <div className="flex-1 overflow-y-auto p-3 grid grid-cols-4 sm:grid-cols-6 gap-2">
          {filteredGlyphs.length === 0 ? (
            <div className="col-span-full py-8 text-center text-xs text-stone-400">
              作成済みの字形がありません。まず文字エディタで作字してください。
            </div>
          ) : (
            filteredGlyphs.map((glyph) => (
              <button
                key={glyph.unicode}
                onClick={() => onExtractFromGlyph(glyph)}
                className={`p-2 rounded-lg border flex flex-col items-center justify-center space-y-1 transition-all ${
                  isLight
                    ? 'bg-[#f7faf8] border-[#d8e6df] hover:border-emerald-700 hover:bg-emerald-50'
                    : 'bg-[#121a14] border-[#25362b] hover:border-emerald-500 hover:bg-[#1a2820]'
                }`}
              >
                <div className="w-10 h-10 flex items-center justify-center">
                  <svg viewBox="0 0 1000 1000" className="w-full h-full">
                    <path
                      d={contoursToSvgPath(glyph.contours)}
                      fill={isLight ? '#1f2937' : '#ecfdf5'}
                    />
                  </svg>
                </div>
                <span className="text-xs font-bold">{glyph.char}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
