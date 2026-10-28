import React from 'react';
import { SHAPE_PRESETS, generateShapeByType } from '../../utils/pathUtils';
import { GlyphPreviewSvg } from '../GlyphPreviewSvg';
import { PathContour } from '../../types';

interface ShapePresetsTabProps {
  isLight: boolean;
  shapeCategoryFilter: string;
  setShapeCategoryFilter: (c: string) => void;
  onInsertWithPlacement: (contours: PathContour[]) => void;
}

export const ShapePresetsTab: React.FC<ShapePresetsTabProps> = ({
  isLight,
  shapeCategoryFilter,
  setShapeCategoryFilter,
  onInsertWithPlacement,
}) => {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Category Filter */}
      <div
        className={`p-2 border-b flex space-x-1 overflow-x-auto text-[11px] shrink-0 ${
          isLight ? 'bg-[#edf5f0] border-[#d8e6df]' : 'bg-[#101813] border-[#25362b]'
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
            className={`px-2 py-0.5 rounded-full whitespace-nowrap text-[10px] cursor-pointer ${
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
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-2.5 pb-28 sm:pb-8 grid grid-cols-3 gap-2 content-start">
        {SHAPE_PRESETS.filter(
          (p) => shapeCategoryFilter === 'all' || p.category === shapeCategoryFilter
        ).map((preset) => {
          const shapeContours = generateShapeByType(preset.id, 500, 500, 750);
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onInsertWithPlacement(shapeContours)}
              className={`flex flex-col items-center justify-between p-2 rounded-lg border group transition-all cursor-pointer ${
                isLight
                  ? 'bg-white border-[#c8ded3] hover:border-emerald-700 hover:bg-emerald-50 shadow-xs'
                  : 'bg-[#1a261f] border-[#25362b] hover:border-emerald-500 hover:bg-[#223127]'
              }`}
              title={`${preset.name} (${preset.description}) をキャンバスに挿入`}
            >
              <div className="w-12 h-12 flex items-center justify-center p-1">
                <GlyphPreviewSvg
                  contours={shapeContours}
                  fill={isLight ? '#1f2937' : '#ecfdf5'}
                  className="w-full h-full"
                />
              </div>
              <span
                className={`text-[10px] font-bold mt-1 truncate w-full text-center ${
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
