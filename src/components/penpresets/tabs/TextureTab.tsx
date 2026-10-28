import React from 'react';
import { Flame } from 'lucide-react';
import { UserPenPreset } from '../../../types';
import { SliderControl } from '../Controls';

interface TextureTabProps {
  workingPreset: UserPenPreset;
  setWorkingPreset: React.Dispatch<React.SetStateAction<UserPenPreset>>;
}

export const TextureTab: React.FC<TextureTabProps> = ({
  workingPreset,
  setWorkingPreset,
}) => {
  return (
    <div className="space-y-4 max-w-xl">
      <div className="bg-stone-50 dark:bg-stone-900/40 p-3 rounded-lg border border-stone-200/80 dark:border-stone-800/80 space-y-3">
        <span className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center space-x-1.5">
          <Flame className="w-3.5 h-3.5 text-orange-500" />
          <span>質感・インク・傾斜パラメータ</span>
        </span>

        <SliderControl
          label="墨にじみ・インク滲み"
          value={workingPreset.inkBleed ?? 0}
          min={0}
          max={100}
          step={5}
          unit="%"
          onChange={(v) => setWorkingPreset((prev) => ({ ...prev, inkBleed: v }))}
        />

        <SliderControl
          label="軸の傾斜角 (イタリック)"
          value={workingPreset.axisSlant ?? 0}
          min={-45}
          max={45}
          step={1}
          unit="°"
          onChange={(v) => setWorkingPreset((prev) => ({ ...prev, axisSlant: v }))}
        />

        <SliderControl
          label="輪郭の微細な荒れ (質感)"
          value={workingPreset.edgeRoughness ?? 0}
          min={0}
          max={100}
          step={5}
          unit="%"
          onChange={(v) => setWorkingPreset((prev) => ({ ...prev, edgeRoughness: v }))}
        />

        <SliderControl
          label="尖端の鋭利さ (抜き強調)"
          value={workingPreset.tipSharpness ?? 0}
          min={0}
          max={100}
          step={5}
          unit="%"
          onChange={(v) => setWorkingPreset((prev) => ({ ...prev, tipSharpness: v }))}
        />

        <SliderControl
          label="筆圧レスポンスガンマ"
          value={workingPreset.pressureGamma ?? 1.0}
          min={0.5}
          max={2.5}
          step={0.1}
          unit=""
          onChange={(v) => setWorkingPreset((prev) => ({ ...prev, pressureGamma: v }))}
        />
      </div>
    </div>
  );
};
