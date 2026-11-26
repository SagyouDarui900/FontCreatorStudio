import React from 'react';
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
    <div className="space-y-2.5">
      <div className="bg-stone-50 dark:bg-stone-900/40 p-2.5 rounded-lg border border-stone-200/80 dark:border-stone-800/80 space-y-2">
        <span className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center space-x-1.5">
          <span>手ぶれ補正 (Stabilizer) 設定</span>
        </span>

        <ToggleControl
          label="手ぶれ補正を有効化"
          checked={workingPreset.autoSmoothBrush ?? true}
          onChange={(v) => setWorkingPreset((prev) => ({ ...prev, autoSmoothBrush: v }))}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-0.5">
          <SliderControl
            label="常時補正強度"
            value={workingPreset.smoothingIntensity ?? 55}
            min={0}
            max={100}
            step={5}
            unit=""
            onChange={(v) => setWorkingPreset((prev) => ({ ...prev, smoothingIntensity: v }))}
          />
        </div>
        <p className="text-[11px] text-stone-500 dark:text-stone-400">補正方法・高速時補正強度・旧方式の事前補正は描画に反映されません。手ぶれ補正は常時補正強度で調整します。</p>

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
