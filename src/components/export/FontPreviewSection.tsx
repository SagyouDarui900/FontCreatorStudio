import React from 'react';
import { Type, X } from 'lucide-react';
import { FontProject } from '../../types';
import { getThemeClasses, ThemeClasses } from '../../utils/theme';
import { ModalSection } from '../modals/ModalSection';
import { SliderRow } from '../modals/SliderRow';

/**
 * The display character for a glyph: the stored char when present,
 * otherwise the character for its Unicode value. An out-of-range or
 * non-integer Unicode (hand-edited project data) yields '' instead of
 * throwing a RangeError from String.fromCodePoint and breaking the
 * whole preview section.
 */
export function safeGlyphChar(glyph: { char?: string; unicode: number }): string {
  if (glyph.char) return glyph.char;
  if (
    typeof glyph.unicode !== 'number' ||
    !Number.isInteger(glyph.unicode) ||
    glyph.unicode < 0 ||
    glyph.unicode > 0x10ffff
  ) {
    return '';
  }
  try {
    return String.fromCodePoint(glyph.unicode);
  } catch {
    return '';
  }
}

interface FontPreviewSectionProps {
  isLight: boolean;
  themeClasses?: ThemeClasses;
  previewText: string;
  setPreviewText: (text: string) => void;
  previewFontSize: number;
  setPreviewFontSize: (size: number) => void;
  previewFontFamily: string;
  project: FontProject;
}

export const FontPreviewSection: React.FC<FontPreviewSectionProps> = ({
  isLight,
  themeClasses: propThemeClasses,
  previewText,
  setPreviewText,
  previewFontSize,
  setPreviewFontSize,
  previewFontFamily,
  project,
}) => {
  const themeClasses = propThemeClasses || getThemeClasses(isLight ? 'light' : 'dark');
  return (
    <ModalSection
      title="ライブプレビュー"
      themeClasses={themeClasses}
    >
      <div className="space-y-2.5 sm:space-y-3">
        <SliderRow
          label="プレビューサイズ"
          value={previewFontSize}
          min={16}
          max={48}
          step={1}
          unit="px"
          onChange={setPreviewFontSize}
          themeClasses={themeClasses}
        />

        {/* Custom Input Field with Type Icon (16px on mobile avoids iOS auto-zoom) */}
        <div className="relative">
          <Type className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${themeClasses.accentText}`} />
          <input
            type="text"
            value={previewText}
            onChange={(e) => setPreviewText(e.target.value)}
            placeholder="プレビューしたい文字列を入力..."
            className={`w-full pl-9 pr-10 py-2 sm:py-1.5 min-h-[42px] sm:min-h-0 text-base sm:text-xs rounded-lg border ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary}`}
          />
          {previewText && (
            <button
              type="button"
              onClick={() => setPreviewText('')}
              aria-label="入力をクリア"
              className={`absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center cursor-pointer ${themeClasses.textMuted}`}
              title="クリア"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Quick Sample Presets (Horizontal scroll on mobile, wrap on desktop) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar sm:flex-wrap py-0.5">
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
              className={`px-2.5 py-1.5 sm:px-2 sm:py-0.5 min-h-[32px] sm:min-h-0 rounded-md border text-[11px] font-medium whitespace-nowrap shrink-0 cursor-pointer ${
                previewText === preset.text
                  ? themeClasses.activeTool
                  : `${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.activeToolHover}`
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
                  .map((g) => safeGlyphChar(g))
                  .join('');
                setPreviewText(allChars);
              }}
              className={`px-2.5 py-1.5 sm:px-2 sm:py-0.5 min-h-[32px] sm:min-h-0 rounded-md text-[11px] font-semibold border whitespace-nowrap shrink-0 cursor-pointer ${themeClasses.accentBadge}`}
              title="プロジェクト内の作成済みグリフをすべて入力欄に挿入します"
            >
              作成済み ({Object.keys(project.glyphs).length}字)
            </button>
          )}
        </div>

        {/* Rendered Live Font Display Box (Safe horizontal scrolling without left clipping) */}
        <div
          className={`p-3 sm:p-4 rounded-xl border min-h-[76px] overflow-x-auto touch-scroll-x shadow-inner ${themeClasses.subtoolbarBg} ${themeClasses.border}`}
        >
          <div className="min-w-full w-max min-h-[44px] flex items-center justify-center">
            {previewText && previewText.trim().length > 0 ? (
              <div
                style={{
                  fontFamily: `'${previewFontFamily}', sans-serif`,
                  fontSize: `${previewFontSize}px`,
                }}
                className={`tracking-normal select-none text-center whitespace-nowrap px-2 ${themeClasses.textPrimary}`}
              >
                {previewText}
              </div>
            ) : (
              <span className={`text-xs italic ${themeClasses.textMuted}`}>
                （上の入力欄にテストしたい文字を入力してください）
              </span>
            )}
          </div>
        </div>
      </div>
    </ModalSection>
  );
};
