import React from 'react';
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
    <div className="space-y-2.5">
      <div className="bg-stone-50 dark:bg-stone-900/40 p-2.5 rounded-lg border border-stone-200/80 dark:border-stone-800/80 space-y-2">
        <span className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center space-x-1.5">
          <span>筆先形状・角度・扁平率</span>
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-0.5">
          <SliderControl
            label="筆先扁平率 (縦横比)"
            value={workingPreset.nibAspectRatio ?? 0}
            min={0}
            max={100}
            step={5}
            unit="%"
            onChange={(v) => setWorkingPreset((prev) => ({ ...prev, nibAspectRatio: v }))}
            desc="0% = 円形断面, 100% = 極平チゼル・カリグラフィー"
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
        </div>

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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-0.5">
          <SliderControl
            label="筆先間隔"
            value={workingPreset.nibSpacing ?? 1}
            min={1}
            max={100}
            step={1}
            unit="%"
            onChange={(v) => setWorkingPreset((prev) => ({ ...prev, nibSpacing: v }))}
            desc="輪郭生成のサンプリング間隔。1%ではこれまでと同じ間隔。大きいほど粗い輪郭になる"
          />
          <SliderControl
            label="二重線の間隔"
            value={workingPreset.doubleLineGap ?? 0}
            min={0}
            max={100}
            step={5}
            unit="%"
            onChange={(v) => setWorkingPreset((prev) => ({ ...prev, doubleLineGap: v }))}
            desc="二重線ペン（ラウンドBで追加）の2本の線の間の距離。既存の筆では描画に反映されない"
          />
          <SliderControl
            label="点線の間隔"
            value={workingPreset.dottedSpacing ?? 0}
            min={0}
            max={100}
            step={5}
            unit="%"
            onChange={(v) => setWorkingPreset((prev) => ({ ...prev, dottedSpacing: v }))}
            desc="点線・破線ペン（ラウンドBで追加）の点と点の間の距離。既存の筆では描画に反映されない"
          />
        </div>

        {/* Line Cap Selector */}
        <div className="flex flex-col space-y-1 pt-1.5 border-t border-stone-200/60 dark:border-stone-800/60">
          <span className="text-xs font-medium text-stone-700 dark:text-stone-300">線端の形状</span>
          <div className="grid grid-cols-3 gap-1.5">
            {([
              { value: 'round', label: '丸 (ラウンド)' },
              { value: 'square', label: '四角 (スクエア)' },
              { value: 'butt', label: '切りっぱなし' },
            ] as const).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setWorkingPreset((prev) => ({ ...prev, lineCap: opt.value }))}
                className={`py-1.5 px-2 rounded-md text-xs font-semibold border flex items-center justify-center space-x-1.5 cursor-pointer ${
                  (workingPreset.lineCap || 'round') === opt.value
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                    : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300'
                }`}
              >
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
          <span className="text-[10px] leading-tight text-stone-500 dark:text-stone-400">尖った先端（入り抜きの先端形状が尖りの場合など）では端の形状より先端が優先される。カクカク角筆・多角形ペン・カクカク角丸筆では筆自体の端の形が使われる</span>
        </div>

        {/* Line Join Selector */}
        <div className="flex flex-col space-y-1 pt-1.5 border-t border-stone-200/60 dark:border-stone-800/60">
          <span className="text-xs font-medium text-stone-700 dark:text-stone-300">角の接合</span>
          <div className="grid grid-cols-3 gap-1.5">
            {([
              { value: 'miter', label: '尖らせる' },
              { value: 'round', label: '丸める' },
              { value: 'bevel', label: '切り落とす' },
            ] as const).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setWorkingPreset((prev) => ({ ...prev, lineJoin: opt.value }))}
                className={`py-1.5 px-2 rounded-md text-xs font-semibold border flex items-center justify-center space-x-1.5 cursor-pointer ${
                  (workingPreset.lineJoin || 'miter') === opt.value
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                    : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300'
                }`}
              >
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
          <span className="text-[10px] leading-tight text-stone-500 dark:text-stone-400">輪郭の鋭い角に適用される。緩やかな曲がりは従来どおり滑らかになる。カクカク角筆・多角形ペン・カクカク角丸筆では筆自体の角の扱いが使われる</span>
        </div>
        <p className="text-[11px] text-stone-500 dark:text-stone-400">アンチエイリアスはベクター輪郭に反映されません。</p>
      </div>
    </div>
  );
};
