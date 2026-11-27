import React from 'react';
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
    <div className="space-y-2.5">
      <div className="bg-stone-50 dark:bg-stone-900/40 p-2.5 rounded-lg border border-stone-200/80 dark:border-stone-800/80 space-y-2">
        <span className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center space-x-1.5">
          <span>速度による動的変化</span>
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-0.5">
          <SliderControl
            label="速度:太さ"
            value={workingPreset.speedWidthFactor ?? 0}
            min={-100}
            max={100}
            step={5}
            unit="%"
            onChange={(v) => setWorkingPreset((prev) => ({ ...prev, speedWidthFactor: v }))}
            desc="正: 速く引くと太い / 負: 速く払うと細くなる"
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
      </div>

      <div className="bg-stone-50 dark:bg-stone-900/40 p-2.5 rounded-lg border border-stone-200/80 dark:border-stone-800/80 space-y-2">
        <span className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center space-x-1.5">
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
        <SliderControl
          label="筆圧:かすれ"
          value={workingPreset.pressureFeatherFactor ?? 0}
          min={0}
          max={100}
          step={5}
          unit="%"
          onChange={(v) => setWorkingPreset((prev) => ({ ...prev, pressureFeatherFactor: v }))}
        />
        <SliderControl
          label="筆のしなり"
          value={workingPreset.brushFlex ?? 0}
          min={0}
          max={100}
          step={5}
          unit="%"
          onChange={(v) => setWorkingPreset((prev) => ({ ...prev, brushFlex: v }))}
          desc="筆圧の変化に対する太さの追従の遅れ。0では遅れなし。大きいほど太さの変化が遅れて現れる"
        />
      </div>
      <p className="text-[11px] text-stone-500 dark:text-stone-400">速度・筆圧による不透明度変化はベクター輪郭に反映されません。</p>
    </div>
  );
};
