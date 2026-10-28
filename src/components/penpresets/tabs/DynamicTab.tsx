import React from 'react';
import { Activity, Flame } from 'lucide-react';
import { UserPenPreset } from '../../../types';
import { SliderControl } from '../Controls';

interface DynamicTabProps {
  workingPreset: UserPenPreset;
  setWorkingPreset: React.Dispatch<React.SetStateAction<UserPenPreset>>;
}

export const DynamicTab: React.FC<DynamicTabProps> = ({
  workingPreset,
  setWorkingPreset,
}) => {
  return (
    <div className="space-y-4 max-w-xl">
      <div className="bg-stone-50 dark:bg-stone-900/40 p-3 rounded-lg border border-stone-200/80 dark:border-stone-800/80 space-y-3">
        <span className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center space-x-1.5">
          <Activity className="w-3.5 h-3.5 text-emerald-500" />
          <span>速度による動的変化</span>
        </span>

        <SliderControl
          label="速度:太さ"
          value={workingPreset.speedWidthFactor ?? 0}
          min={-100}
          max={100}
          step={5}
          unit="%"
          onChange={(v) => setWorkingPreset((prev) => ({ ...prev, speedWidthFactor: v }))}
          desc="正: 速く引くと太い / 負: 速く払うとシャープに細くなる"
        />
        <SliderControl
          label="速度:かすれ"
          value={workingPreset.speedFeatherFactor ?? 0}
          min={0}
          max={100}
          step={5}
          unit="%"
          onChange={(v) => setWorkingPreset((prev) => ({ ...prev, speedFeatherFactor: v }))}
        />
      </div>

      <div className="bg-stone-50 dark:bg-stone-900/40 p-3 rounded-lg border border-stone-200/80 dark:border-stone-800/80 space-y-3">
        <span className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center space-x-1.5">
          <Flame className="w-3.5 h-3.5 text-emerald-500" />
          <span>筆圧による抑揚</span>
        </span>

        <SliderControl
          label="筆圧:太さ抑揚"
          value={workingPreset.pressureWidthFactor ?? 0}
          min={0}
          max={100}
          step={5}
          unit="%"
          onChange={(v) => setWorkingPreset((prev) => ({ ...prev, pressureWidthFactor: v }))}
        />
      </div>
    </div>
  );
};
