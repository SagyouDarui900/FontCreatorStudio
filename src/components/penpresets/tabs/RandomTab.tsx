import React from 'react';
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
    <div className="space-y-2.5">
      <div className="bg-stone-50 dark:bg-stone-900/40 p-2.5 rounded-lg border border-stone-200/80 dark:border-stone-800/80 space-y-2">
        <span className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center space-x-1.5">
          <span>ランダムゆらぎ・散布ジッター</span>
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-0.5">
          <SliderControl
            label="太さランダム (サイズジッター)"
            value={workingPreset.jitterSize ?? 0}
            min={0}
            max={100}
            step={5}
            unit="%"
            onChange={(v) => setWorkingPreset((prev) => ({ ...prev, jitterSize: v }))}
            desc="線の太さにランダムな手書きのムラを付与"
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
          <SliderControl
            label="回転ランダム"
            value={workingPreset.jitterAngle ?? 0}
            min={0}
            max={100}
            step={5}
            unit="%"
            onChange={(v) => setWorkingPreset((prev) => ({ ...prev, jitterAngle: v }))}
          />
          <SliderControl
            label="不透明度ランダム"
            value={workingPreset.jitterOpacity ?? 0}
            min={0}
            max={100}
            step={5}
            unit="%"
            onChange={(v) => setWorkingPreset((prev) => ({ ...prev, jitterOpacity: v }))}
            desc="ベクター輪郭には不透明度の情報がないため、太さの変化として近似して反映されます"
          />
          <SliderControl
            label="間隔ランダム"
            value={workingPreset.jitterSpacing ?? 0}
            min={0}
            max={100}
            step={5}
            unit="%"
            onChange={(v) => setWorkingPreset((prev) => ({ ...prev, jitterSpacing: v }))}
            desc="筆先間隔のばらつき。筆先間隔と組み合わせて使う"
          />
        </div>

        <ToggleControl
          label="位置ランダムは上下(法線)に拘束"
          checked={workingPreset.jitterConstrainPerp ?? true}
          onChange={(v) => setWorkingPreset((prev) => ({ ...prev, jitterConstrainPerp: v }))}
        />
      </div>
    </div>
  );
};
