import React from 'react';
import { BrushStyle, UserPenPreset } from '../../../types';
import { BRUSH_STYLE_INFO } from '../constants';

interface TypeTabProps {
  workingPreset: UserPenPreset;
  setWorkingPreset: React.Dispatch<React.SetStateAction<UserPenPreset>>;
}

export const TypeTab: React.FC<TypeTabProps> = ({
  workingPreset,
  setWorkingPreset,
}) => {
  return (
    <div className="space-y-4 max-w-2xl">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {(Object.keys(BRUSH_STYLE_INFO) as BrushStyle[]).map((st) => {
          const info = BRUSH_STYLE_INFO[st];
          const isSelected = workingPreset.brushStyle === st;
          return (
            <button
              key={st}
              type="button"
              onClick={() => setWorkingPreset((prev) => ({ ...prev, brushStyle: st }))}
              className={`p-2.5 rounded-lg border text-left transition-all flex flex-col justify-between space-y-1.5 cursor-pointer ${
                isSelected
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 shadow-sm'
                  : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-stone-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs">{info.name}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-500">
                  {info.category}
                </span>
              </div>
              <span className="text-[10px] text-stone-500 dark:text-stone-400 line-clamp-2">{info.desc}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
