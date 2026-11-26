import React, { useId } from 'react';
import { getThemeClasses, type ThemeClasses, type ThemeMode } from '../../utils/theme';

/**
 * SliderRow — スライダー行（監査 (d) 4、M-08 対応）。
 *
 * 使い方（組み込み側）:
 * ```tsx
 * <SliderRow
 *   label="線の太さ"
 *   value={weight}
 *   min={0}
 *   max={100}
 *   step={1}
 *   unit="%"
 *   onChange={setWeight}
 *   showNumberInput
 *   theme={theme}
 * />
 * ```
 * - スライダー色は `accent-emerald-600` に統一（Trace の emerald-700、
 *   GlyphCompare の sky-600 との違いをなくす）。監査の指定による固定色で、
 *   テーマのアクセント色とは別に決めている。
 * - 値表示は `font-mono tabular-nums min-w-[64px]` のバッジで統一
 *   （`min-w-[54px]` との違いをなくす）。
 * - 数値入力は `showNumberInput` のときだけ出す。Trace のように数値入力が
 *   ないモーダルは付けない。
 */

export interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  /** 値の後ろに付ける単位（例: "%"、"px"）。 */
  unit?: string;
  onChange: (value: number) => void;
  showNumberInput?: boolean;
  disabled?: boolean;
  /** スライダーの下に出す補足文。 */
  hint?: string;
  /** 値の表示方法。未指定時は value をそのまま表示する。 */
  formatValue?: (value: number) => string;
  id?: string;
  theme?: ThemeMode;
  themeClasses?: ThemeClasses;
}

export const SliderRow: React.FC<SliderRowProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
  showNumberInput = false,
  disabled = false,
  hint,
  formatValue,
  id: idProp,
  theme = 'light',
  themeClasses: passedThemeClasses,
}) => {
  const themeClasses = passedThemeClasses ?? getThemeClasses(theme);
  const fallbackId = useId();
  const id = idProp ?? fallbackId;
  const display = formatValue ? formatValue(value) : String(value);

  const handleNumberChange = (raw: string) => {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return;
    onChange(Math.min(max, Math.max(min, parsed)));
  };

  return (
    <div className={`space-y-1 ${disabled ? 'opacity-50' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-xs font-bold truncate">
          {label}
        </label>
        <span
          className={`min-w-[64px] px-2 py-0.5 rounded-md border text-center font-mono tabular-nums text-[11px] font-bold shrink-0 ${themeClasses.accentBadge}`}
        >
          {display}
          {unit}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-emerald-600"
          aria-label={label}
        />
        {showNumberInput && (
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            disabled={disabled}
            onChange={(e) => handleNumberChange(e.target.value)}
            className={`w-16 shrink-0 px-2 py-1 rounded-lg border text-xs font-mono tabular-nums text-center ${themeClasses.cardBg}`}
            aria-label={`${label}（数値入力）`}
          />
        )}
      </div>
      {hint && (
        <p className={`text-[10.5px] leading-snug jp-wrap ${themeClasses.textMuted}`}>
          {hint}
        </p>
      )}
    </div>
  );
};
