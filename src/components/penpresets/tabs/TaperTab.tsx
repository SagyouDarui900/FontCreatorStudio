import React from 'react';
import { Diamond, Circle, Flame } from 'lucide-react';
import { UserPenPreset } from '../../../types';
import { SliderControl, ToggleControl } from '../Controls';

interface TaperTabProps {
  workingPreset: UserPenPreset;
  setWorkingPreset: React.Dispatch<React.SetStateAction<UserPenPreset>>;
}

export const TaperTab: React.FC<TaperTabProps> = ({
  workingPreset,
  setWorkingPreset,
}) => {
  return (
    <div className="space-y-4 max-w-xl">
      <div className="bg-stone-50 dark:bg-stone-900/40 p-3 rounded-lg border border-stone-200/80 dark:border-stone-800/80 space-y-3">
        <span className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center space-x-1.5">
          <Diamond className="w-3.5 h-3.5 text-emerald-500" />
          <span>入り抜きの長さ・太さ設定</span>
        </span>

        <SliderControl
          label="入りの太さ"
          value={workingPreset.taperStartWidth ?? 20}
          min={0}
          max={100}
          step={5}
          unit="%"
          onChange={(v) => setWorkingPreset((prev) => ({ ...prev, taperStartWidth: v }))}
        />
        <SliderControl
          label="抜きの太さ"
          value={workingPreset.taperEndWidth ?? 10}
          min={0}
          max={100}
          step={5}
          unit="%"
          onChange={(v) => setWorkingPreset((prev) => ({ ...prev, taperEndWidth: v }))}
        />
        <SliderControl
          label="入りの長さ"
          value={workingPreset.taperStartLength ?? 30}
          min={0}
          max={100}
          step={5}
          unit="%"
          onChange={(v) => setWorkingPreset((prev) => ({ ...prev, taperStartLength: v }))}
        />
        <SliderControl
          label="抜きの長さ"
          value={workingPreset.taperEndLength ?? 40}
          min={0}
          max={100}
          step={5}
          unit="%"
          onChange={(v) => setWorkingPreset((prev) => ({ ...prev, taperEndLength: v }))}
        />

        {/* Taper Tip Shape Selector */}
        <div className="flex flex-col space-y-1.5 pt-2 border-t border-stone-200/60 dark:border-stone-800/60">
          <span className="text-xs font-medium text-stone-700 dark:text-stone-300">入り抜きの先端形状</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setWorkingPreset((prev) => ({ ...prev, taperTipShape: 'round' }))}
              className={`py-2 px-3 rounded-md text-xs font-semibold border flex items-center justify-center space-x-1.5 cursor-pointer ${
                (workingPreset.taperTipShape || 'round') === 'round'
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                  : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300'
              }`}
            >
              <Circle className="w-3.5 h-3.5" />
              <span>丸まり (ラウンド)</span>
            </button>
            <button
              type="button"
              onClick={() => setWorkingPreset((prev) => ({ ...prev, taperTipShape: 'sharp' }))}
              className={`py-2 px-3 rounded-md text-xs font-semibold border flex items-center justify-center space-x-1.5 cursor-pointer ${
                workingPreset.taperTipShape === 'sharp'
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                  : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>尖り (シャープ)</span>
            </button>
          </div>
        </div>

        <ToggleControl
          label="強制入り抜き (マウス/タッチでもハライ適用)"
          checked={workingPreset.forceTaper ?? true}
          onChange={(v) => setWorkingPreset((prev) => ({ ...prev, forceTaper: v }))}
        />
        <ToggleControl
          label="強制抜き (末端の払い自動先細り)"
          checked={workingPreset.forceTaperEnd ?? false}
          onChange={(v) => setWorkingPreset((prev) => ({ ...prev, forceTaperEnd: v }))}
        />
      </div>
    </div>
  );
};
