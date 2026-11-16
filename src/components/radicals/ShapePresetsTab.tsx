import React from 'react';
import { SHAPE_PRESETS, generateShapeByType } from '../../utils/path';
import { GlyphPreviewSvg } from '../GlyphPreviewSvg';
import { PathContour } from '../../types';
import { RadicalsDensity } from './types';

interface ShapePresetsTabProps {
  isLight: boolean;
  shapeCategoryFilter: string;
  setShapeCategoryFilter: (c: string) => void;
  gridDensity?: RadicalsDensity;
  onInsertWithPlacement: (contours: PathContour[]) => void;
}

export const ShapePresetsTab: React.FC<ShapePresetsTabProps> = ({
  isLight,
  shapeCategoryFilter,
  setShapeCategoryFilter,
  gridDensity = 'medium',
  onInsertWithPlacement,
}) => {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Category Filter */}
      <div
        className={`p-2 border-b flex items-center gap-1 overflow-x-auto no-scrollbar touch-scroll-x text-[10px] shrink-0 ${
          isLight ? 'bg-[#f4f8f5] border-[#d8e6df]' : 'bg-[#141d17] border-[#25362b]'
        }`}
      >
        {[
          { id: 'all', label: 'すべて' },
          { id: 'basic', label: '基本' },
          { id: 'polygon', label: '多角形' },
          { id: 'symbol', label: '星・ハート' },
          { id: 'decorative', label: '装飾・複合' },
        ].map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setShapeCategoryFilter(cat.id)}
            className={`shrink-0 px-2.5 py-1 rounded-md whitespace-nowrap text-[10px] transition-colors cursor-pointer ${
              shapeCategoryFilter === cat.id
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

      {/* Grid */}
      <div
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-2 pb-28 sm:pb-8 grid gap-1.5 content-start"
        style={{
          gridTemplateColumns: `repeat(auto-fill, minmax(${
            gridDensity === 'large' ? 104 : gridDensity === 'compact' ? 70 : 86
          }px, 1fr))`,
        }}
      >
        {SHAPE_PRESETS.filter(
          (p) => shapeCategoryFilter === 'all' || p.category === shapeCategoryFilter
        ).map((preset) => {
          const shapeContours = generateShapeByType(preset.id, 500, 500, 750);
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onInsertWithPlacement(shapeContours)}
              className={`min-w-0 overflow-hidden flex flex-col items-center justify-start ${
                gridDensity === 'compact' ? 'p-1.5' : 'p-2'
              } rounded-lg border group transition-colors cursor-pointer ${
                isLight
                  ? 'bg-white border-[#c8ded3] hover:border-emerald-700 hover:bg-emerald-50 shadow-xs'
                  : 'bg-[#1a261f] border-[#25362b] hover:border-emerald-500 hover:bg-[#223127]'
              }`}
              title={`${preset.name} (${preset.description}) をキャンバスに挿入`}
            >
              <div
                className={`shrink-0 ${
                  gridDensity === 'large'
                    ? 'w-14 h-14'
                    : gridDensity === 'compact'
                    ? 'w-8 h-8'
                    : 'w-11 h-11'
                } flex items-center justify-center p-0.5 overflow-hidden`}
              >
                <GlyphPreviewSvg
                  contours={shapeContours}
                  fill={isLight ? '#1f2937' : '#ecfdf5'}
                  className="w-full h-full"
                />
              </div>
              <span
                className={`text-[9.5px] sm:text-[10px] font-bold mt-1 w-full text-center leading-[1.25] break-words line-clamp-2 ${
                  isLight ? 'text-stone-800 group-hover:text-emerald-950' : 'text-emerald-200 group-hover:text-white'
                }`}
              >
                {preset.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
