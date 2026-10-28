import React from 'react';
import { Settings } from 'lucide-react';
import { UserPenPreset } from '../../../types';
import { SliderControl, ToggleControl } from '../Controls';

interface SettingsTabProps {
  workingPreset: UserPenPreset;
  setWorkingPreset: React.Dispatch<React.SetStateAction<UserPenPreset>>;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  workingPreset,
  setWorkingPreset,
}) => {
  return (
    <div className="space-y-4 max-w-xl">
      <div className="bg-stone-50 dark:bg-stone-900/40 p-3 rounded-lg border border-stone-200/80 dark:border-stone-800/80 space-y-3">
        <span className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center space-x-1.5">
          <Settings className="w-3.5 h-3.5 text-emerald-500" />
          <span>手ぶれ補正 (Stabilizer) 設定</span>
        </span>

        <ToggleControl
          label="手ぶれ補正を有効化"
          checked={workingPreset.autoSmoothBrush ?? true}
          onChange={(v) => setWorkingPreset((prev) => ({ ...prev, autoSmoothBrush: v }))}
        />

        {/* Stabilization Method: Pre / Post */}
        <div className="flex flex-col space-y-1.5 pt-1">
          <span className="text-xs font-medium text-stone-700 dark:text-stone-300">補正方法</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setWorkingPreset((prev) => ({ ...prev, stabilizationMethod: 'pre' }))}
              className={`py-1.5 px-3 rounded-md text-xs font-semibold border cursor-pointer ${
                (workingPreset.stabilizationMethod || 'pre') === 'pre'
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                  : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300'
              }`}
            >
              事前補正 (リアルタイム追従)
            </button>
            <button
              type="button"
              onClick={() => setWorkingPreset((prev) => ({ ...prev, stabilizationMethod: 'post' }))}
              className={`py-1.5 px-3 rounded-md text-xs font-semibold border cursor-pointer ${
                workingPreset.stabilizationMethod === 'post'
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                  : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300'
              }`}
            >
              事後補正 (書き終わり時に最適化)
            </button>
          </div>
        </div>

        <SliderControl
          label="常時補正強度"
          value={workingPreset.smoothingIntensity ?? 55}
          min={0}
          max={100}
          step={5}
          unit=""
          onChange={(v) => setWorkingPreset((prev) => ({ ...prev, smoothingIntensity: v }))}
        />
        <SliderControl
          label="高速時補正強度"
          value={workingPreset.speedStabilization ?? 0}
          min={0}
          max={100}
          step={5}
          unit=""
          onChange={(v) => setWorkingPreset((prev) => ({ ...prev, speedStabilization: v }))}
        />

        <ToggleControl
          label="折れ・角の張り出しを保持 (転折保護)"
          checked={workingPreset.smoothPreserveCorners ?? true}
          onChange={(v) => setWorkingPreset((prev) => ({ ...prev, smoothPreserveCorners: v }))}
        />
        <ToggleControl
          label="自動合体 (交差した線の白抜き解消・自動融合)"
          checked={workingPreset.autoUnionBrush ?? true}
          onChange={(v) => setWorkingPreset((prev) => ({ ...prev, autoUnionBrush: v }))}
        />
      </div>
    </div>
  );
};
