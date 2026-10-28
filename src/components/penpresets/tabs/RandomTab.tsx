import React from 'react';
import { Shuffle } from 'lucide-react';
import { UserPenPreset } from '../../../types';
import { SliderControl, ToggleControl } from '../Controls';

interface RandomTabProps {
  workingPreset: UserPenPreset;
  setWorkingPreset: React.Dispatch<React.SetStateAction<UserPenPreset>>;
}

export const RandomTab: React.FC<RandomTabProps> = ({
  workingPreset,
  setWorkingPreset,
}) => {
  return (
    <div className="space-y-4 max-w-xl">
      <div className="bg-stone-50 dark:bg-stone-900/40 p-3 rounded-lg border border-stone-200/80 dark:border-stone-800/80 space-y-3">
        <span className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center space-x-1.5">
          <Shuffle className="w-3.5 h-3.5 text-emerald-500" />
          <span>ランダムゆらぎ・散布ジッター</span>
        </span>

        <SliderControl
          label="太さランダム (サイズジッター)"
          value={workingPreset.jitterSize ?? 0}
          min={0}
          max={100}
          step={5}
          unit="%"
          onChange={(v) => setWorkingPreset((prev) => ({ ...prev, jitterSize: v }))}
          desc="線の太さにランダムな手書きのムラ・ゆらぎを付与"
        />
        <SliderControl
          label="位置ランダム (散布)"
          value={workingPreset.jitterPosition ?? 0}
          min={0}
          max={100}
          step={5}
          unit="%"
          onChange={(v) => setWorkingPreset((prev) => ({ ...prev, jitterPosition: v }))}
        />
        <ToggleControl
          label="位置ランダムは上下(法線)に拘束"
          checked={workingPreset.jitterConstrainPerp ?? true}
          onChange={(v) => setWorkingPreset((prev) => ({ ...prev, jitterConstrainPerp: v }))}
        />
        <SliderControl
          label="回転ランダム"
          value={workingPreset.jitterAngle ?? 0}
          min={0}
          max={100}
          step={5}
          unit="%"
          onChange={(v) => setWorkingPreset((prev) => ({ ...prev, jitterAngle: v }))}
        />
      </div>
    </div>
  );
};
