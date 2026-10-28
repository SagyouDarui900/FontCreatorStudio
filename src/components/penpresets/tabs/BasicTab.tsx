import React from 'react';
import { Paintbrush } from 'lucide-react';
import { UserPenPreset, PressureCurveConfig } from '../../../types';
import { SliderControl, ToggleControl } from '../Controls';
import { PressureGraph } from '../PressureGraph';
import { DEFAULT_PRESSURE_CURVES } from '../../../utils/presetData';

interface BasicTabProps {
  workingPreset: UserPenPreset;
  setWorkingPreset: React.Dispatch<React.SetStateAction<UserPenPreset>>;
  onChangePressureCurve?: (curve: PressureCurveConfig) => void;
}

export const BasicTab: React.FC<BasicTabProps> = ({
  workingPreset,
  setWorkingPreset,
  onChangePressureCurve,
}) => {
  return (
    <div className="space-y-4 max-w-xl">
      <div className="bg-stone-50 dark:bg-stone-900/40 p-3 rounded-lg border border-stone-200/80 dark:border-stone-800/80 space-y-3">
        <span className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center space-x-1.5">
          <Paintbrush className="w-3.5 h-3.5 text-emerald-500" />
          <span>太さと筆圧感度</span>
        </span>

        <SliderControl
          label="ブラシ太さ"
          value={workingPreset.brushWidth}
          min={1}
          max={150}
          step={1}
          unit="px"
          onChange={(v) => setWorkingPreset((prev) => ({ ...prev, brushWidth: v }))}
        />

        {/* Pressure Sensitivity Selector */}
        <div className="flex flex-col space-y-1.5 pt-1">
          <span className="text-xs font-medium text-stone-700 dark:text-stone-300">筆圧感度モード</span>
          <div className="grid grid-cols-4 gap-1.5">
            {(['high', 'normal', 'low', 'off'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setWorkingPreset((prev) => ({ ...prev, pressureSensitivity: mode }))}
                className={`py-1.5 px-2 rounded-md text-xs font-semibold border transition-all cursor-pointer ${
                  workingPreset.pressureSensitivity === mode
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 shadow-sm'
                    : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-100'
                }`}
              >
                {mode === 'high' ? '高感度' : mode === 'normal' ? '標準' : mode === 'low' ? '弱め' : 'OFF (均一)'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Pressure Curve Graph */}
      <PressureGraph
        curveConfig={workingPreset.pressureCurve || DEFAULT_PRESSURE_CURVES.soft}
        onChangeCurveConfig={(newConfig) => {
          setWorkingPreset((prev) => ({ ...prev, pressureCurve: newConfig }));
          onChangePressureCurve?.(newConfig);
        }}
      />
    </div>
  );
};
