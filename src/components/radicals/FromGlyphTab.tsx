import React from 'react';
import { Layers } from 'lucide-react';
import { GlyphPreviewSvg } from '../GlyphPreviewSvg';
import { PathContour, GlyphData } from '../../types';
import { RadicalsDensity } from './types';

interface FromGlyphTabProps {
  isLight: boolean;
  availableGlyphs: GlyphData[];
  gridDensity?: RadicalsDensity;
  onInsertWithPlacement: (contours: PathContour[]) => void;
}

export const FromGlyphTab: React.FC<FromGlyphTabProps> = ({
  isLight,
  availableGlyphs,
  gridDensity = 'medium',
  onInsertWithPlacement,
}) => {
  return (
    <div className="flex-1 flex flex-col min-h-0 p-3 space-y-2">
      <div className="text-[11px] leading-relaxed text-stone-600 dark:text-stone-300">
        プロジェクト内で作成済みの別の文字を選択し、現在のグリフに偏や旁として合体できます。
      </div>

      {availableGlyphs.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-stone-500 space-y-2">
          <Layers className="w-8 h-8 opacity-40 text-emerald-600" />
          <p className="text-xs">まだ作成済みの文字がありません。</p>
          <p className="text-[10px]">文字を作図するとここに合成候補として現れます。</p>
        </div>
      ) : (
        <div
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain grid gap-2 content-start pr-1 pb-28 sm:pb-8"
          style={{
            gridTemplateColumns: `repeat(auto-fill, minmax(${
              gridDensity === 'large' ? 82 : gridDensity === 'compact' ? 56 : 66
            }px, 1fr))`,
          }}
        >
          {availableGlyphs.map((glyph) => {
            return (
              <button
                key={glyph.unicode}
                type="button"
                onClick={() => onInsertWithPlacement(glyph.contours)}
                className={`min-w-0 overflow-hidden flex flex-col items-center p-1.5 rounded-md border group transition-colors cursor-pointer ${
                  isLight
                    ? 'bg-white border-[#c8ded3] hover:border-emerald-700 hover:bg-emerald-50 shadow-xs'
                    : 'bg-[#1a261f] border-[#25362b] hover:border-emerald-500 hover:bg-[#223127]'
                }`}
                title={`文字「${glyph.char}」の輪郭を取り込む`}
              >
                <div
                  className={`${
                    gridDensity === 'large'
                      ? 'w-12 h-12'
                      : gridDensity === 'compact'
                      ? 'w-8 h-8'
                      : 'w-10 h-10'
                  } flex items-center justify-center overflow-hidden`}
                >
                  <GlyphPreviewSvg
                    contours={glyph.contours}
                    fill={isLight ? '#1f2937' : '#ecfdf5'}
                    className="w-full h-full"
                  />
                </div>
                <span className="text-xs font-bold mt-1 text-emerald-950 dark:text-emerald-200 truncate w-full text-center leading-tight">
                  {glyph.char}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
