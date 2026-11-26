import React, { useState, useMemo } from 'react';
import { X } from 'lucide-react';
import { GlyphData, PathContour } from '../../types';
import { getThemeClasses } from '../../utils/theme';

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
  const themeClasses = getThemeClasses(isLight ? 'light' : 'dark');

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
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/75 anim-fade select-none">
      <div
        className={`w-full max-w-lg rounded-2xl border shadow-2xl flex flex-col max-h-[85vh] overflow-hidden ${themeClasses.modalBg} ${themeClasses.border}`}
      >
        <div className={`px-3.5 py-2.5 sm:px-5 sm:py-2.5 border-b flex items-center justify-between shrink-0 ${themeClasses.headerBg} ${themeClasses.border}`}>
          <div className="flex items-center space-x-2.5 min-w-0">
            <h2 className="text-sm sm:text-base font-bold">文字データからパーツを抽出</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className={`p-1.5 min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 flex items-center justify-center rounded-lg border transition-colors cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textMuted} ${themeClasses.activeToolHover}`}
            title="閉じる (Esc)"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        <div className="p-3.5 sm:p-4 border-b">
          <input
            type="text"
            placeholder="抽出したい文字を検索..."
            value={extractSearch}
            onChange={(e) => setExtractSearch(e.target.value)}
            className={`w-full px-3 py-1.5 rounded-md text-xs border outline-hidden ${themeClasses.appBg} ${themeClasses.border} ${themeClasses.textPrimary}`}
          />
        </div>

        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 grid grid-cols-4 sm:grid-cols-6 gap-2">
          {filteredGlyphs.length === 0 ? (
            <div className={`col-span-full py-8 text-center text-xs ${themeClasses.textMuted}`}>
              作成済みの字形がありません。まず文字エディタで作字してください。
            </div>
          ) : (
            filteredGlyphs.map((glyph) => (
              <button
                key={glyph.unicode}
                onClick={() => onExtractFromGlyph(glyph)}
                className={`p-2 rounded-lg border flex flex-col items-center justify-center space-y-1 transition-colors cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.activeToolHover}`}
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
