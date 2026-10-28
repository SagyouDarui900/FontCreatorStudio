import React from 'react';

interface SliderControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (val: number) => void;
  desc?: string;
}

export const SliderControl: React.FC<SliderControlProps> = ({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
  desc,
}) => {
  const handleDec = () => onChange(Math.max(min, Math.round((value - step) * 100) / 100));
  const handleInc = () => onChange(Math.min(max, Math.round((value + step) * 100) / 100));

  return (
    <div className="flex flex-col space-y-1.5 py-1.5 border-b border-stone-200/60 dark:border-stone-800/60 last:border-0">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-stone-700 dark:text-stone-300">{label}</span>
        <span className="font-mono text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
          {value}
          {unit}
        </span>
      </div>
      {desc && <span className="text-[10px] text-stone-500 dark:text-stone-400">{desc}</span>}
      <div className="flex items-center space-x-2">
        <button
          type="button"
          onClick={handleDec}
          className="w-7 h-7 shrink-0 rounded-md flex items-center justify-center bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition-colors font-bold text-sm cursor-pointer"
        >
          -
        </button>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="flex-1 accent-emerald-600 h-1.5 bg-stone-200 dark:bg-stone-700 rounded-lg cursor-pointer"
        />
        <button
          type="button"
          onClick={handleInc}
          className="w-7 h-7 shrink-0 rounded-md flex items-center justify-center bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition-colors font-bold text-sm cursor-pointer"
        >
          +
        </button>
      </div>
    </div>
  );
};

interface ToggleControlProps {
  label: string;
  checked: boolean;
  onChange: (val: boolean) => void;
  desc?: string;
}

export const ToggleControl: React.FC<ToggleControlProps> = ({
  label,
  checked,
  onChange,
  desc,
}) => {
  return (
    <div className="flex items-center justify-between py-2 border-b border-stone-200/60 dark:border-stone-800/60 last:border-0">
      <div className="flex flex-col pr-3">
        <span className="text-xs font-medium text-stone-700 dark:text-stone-300">{label}</span>
        {desc && <span className="text-[10px] text-stone-500 dark:text-stone-400">{desc}</span>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          checked ? 'bg-emerald-600' : 'bg-stone-300 dark:bg-stone-700'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
};
