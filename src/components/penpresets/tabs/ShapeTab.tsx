import React from 'react';
import { Circle } from 'lucide-react';
import { UserPenPreset } from '../../../types';
import { SliderControl, ToggleControl } from '../Controls';

interface ShapeTabProps {
  workingPreset: UserPenPreset;
  setWorkingPreset: React.Dispatch<React.SetStateAction<UserPenPreset>>;
}

export const ShapeTab: React.FC<ShapeTabProps> = ({
  workingPreset,
  setWorkingPreset,
}) => {
  return (
    <div className="space-y-4 max-w-xl">
      <div className="bg-stone-50 dark:bg-stone-900/40 p-3 rounded-lg border border-stone-200/80 dark:border-stone-800/80 space-y-3">
        <span className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center space-x-1.5">
          <Circle className="w-3.5 h-3.5 text-emerald-500" />
          <span>筆先形状・角度・扁平率</span>
        </span>

        <SliderControl
          label="筆先扁平率 (縦横比)"
          value={workingPreset.nibAspectRatio ?? 0}
          min={0}
          max={100}
          step={5}
          unit="%"
          onChange={(v) => setWorkingPreset((prev) => ({ ...prev, nibAspectRatio: v }))}
          desc="0% = 円形断面, 100% = 極平チゼル・カリグラフィーペン"
        />
        <SliderControl
          label="初期角度"
          value={workingPreset.nibAngle ?? 25}
          min={0}
          max={180}
          step={5}
          unit="°"
          onChange={(v) => setWorkingPreset((prev) => ({ ...prev, nibAngle: v }))}
          desc="明朝体(25°〜45°)やカリグラフィーの傾斜角"
        />

        <ToggleControl
          label="回転の追従 (進行方向に筆先を合わせる)"
          checked={workingPreset.nibFollowDirection ?? false}
          onChange={(v) => setWorkingPreset((prev) => ({ ...prev, nibFollowDirection: v }))}
          desc="ON: 進行方向に追従 / OFF: 固定角度（カリグラフィー・隷書調）"
        />
        <ToggleControl
          label="太さを固定 (均一ストローク)"
          checked={workingPreset.constantWidth ?? false}
          onChange={(v) => setWorkingPreset((prev) => ({ ...prev, constantWidth: v }))}
        />
        <ToggleControl
          label="アンチエイリアス / 滑らかなエッジ"
          checked={workingPreset.antiAlias ?? true}
          onChange={(v) => setWorkingPreset((prev) => ({ ...prev, antiAlias: v }))}
        />
      </div>
    </div>
  );
};
