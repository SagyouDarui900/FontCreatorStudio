/**
 * Shared trace (underdrawing) option lists and limits.
 *
 * The font list is used by both TraceSettingsModal and
 * TraceAdjustFloatingHud so the two offer the same choices.
 * The scale limits are used by every scale control (modal sliders,
 * HUD slider and step buttons, corner resize, wheel) so the range
 * is 0.1-4.0 everywhere.
 */

export interface TraceFontOption {
  value: string;
  label: string;
}

export const TRACE_FONT_OPTIONS: TraceFontOption[] = [
  { value: "'Noto Sans JP', sans-serif", label: 'ゴシック体 (Noto Sans JP / OFL)' },
  { value: "'Noto Serif JP', serif", label: '明朝体 (Noto Serif JP / OFL)' },
  { value: "'Zen Maru Gothic', sans-serif", label: '丸ゴシック (Zen Maru Gothic / OFL)' },
  { value: "'Kaisei Tokumin', serif", label: '特民明朝 (Kaisei Tokumin / OFL)' },
  { value: 'sans-serif', label: '標準 Sans-Serif (システム)' },
  { value: 'serif', label: '標準 Serif (システム)' },
  { value: 'monospace', label: '等幅 (Monospace / JetBrains Mono)' },
  { value: 'cursive', label: '手書き風 (Cursive)' },
];

export const TRACE_FONT_DEFAULT = "'Noto Sans JP', sans-serif";

/** Trace scale range, shared by all scale controls. */
export const TRACE_SCALE_MIN = 0.1;
export const TRACE_SCALE_MAX = 4.0;

export function clampTraceScale(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(TRACE_SCALE_MAX, Math.max(TRACE_SCALE_MIN, value));
}

/** Trace opacity default, shared by the modal and the reference layer. */
export const TRACE_DEFAULT_OPACITY = 0.18;
