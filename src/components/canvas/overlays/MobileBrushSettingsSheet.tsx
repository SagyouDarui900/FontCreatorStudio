import React from 'react';
import { X, Ruler } from 'lucide-react';
import { BrushStyle } from '../../../types';
import { PEN_PRESETS } from '../../../utils/pathUtils';

export interface MobileBrushSettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  isLight: boolean;
  brushWidth: number;
  onChangeBrushWidth?: (w: number) => void;
  pressureSensitivity?: 'high' | 'normal' | 'low' | 'off';
  onChangePressureSensitivity?: (val: 'high' | 'normal' | 'low' | 'off') => void;
  smoothingIntensity?: number;
  onChangeSmoothingIntensity?: (val: number) => void;
  brushStraightMode: boolean;
  setBrushStraightMode: (val: boolean) => void;
  showCanvasToast: (msg: string, sub?: string) => void;
  brushStyle?: BrushStyle;
  onChangeBrushStyle?: (style: BrushStyle) => void;
}

export const MobileBrushSettingsSheet: React.FC<MobileBrushSettingsSheetProps> = React.memo(
  ({
    isOpen,
    onClose,
    isLight,
    brushWidth,
    onChangeBrushWidth,
    pressureSensitivity = 'high',
    onChangePressureSensitivity,
    smoothingIntensity = 50,
    onChangeSmoothingIntensity,
    brushStraightMode,
    setBrushStraightMode,
    showCanvasToast,
    brushStyle = 'brush',
    onChangeBrushStyle,
  }) => {
    if (!isOpen) return null;

    return (
      <div className="sm:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/60 animate-fadeIn">
        <div className="fixed inset-0" onClick={onClose} />
        <div
          className={`relative z-10 w-full rounded-t-2xl p-4 border-t shadow-2xl max-h-[82vh] overflow-y-auto ${
            isLight ? 'bg-white border-[#c8ded3] text-stone-800' : 'bg-[#151f19] border-[#25362b] text-emerald-100'
          }`}
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px) + 80px, 80px)' }}
        >
          <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800 mb-3">
            <div className="font-bold text-sm text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
              <span>手書きペンの種類と太さ</span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Stroke Width Slider */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs font-bold mb-1.5">
              <span className="text-stone-500 dark:text-stone-400">線の太さ (Stroke Width)</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 text-sm">{brushWidth} px</span>
            </div>
            <input
              type="range"
              min={2}
              max={160}
              value={brushWidth}
              onChange={(e) => onChangeBrushWidth?.(parseInt(e.target.value, 10))}
              className="w-full accent-emerald-600 h-2 bg-stone-200 dark:bg-stone-800 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex items-center justify-between mt-1.5">
              {[8, 16, 28, 48, 80, 120].map((w) => (
                <button
                  key={w}
                  onClick={() => onChangeBrushWidth?.(w)}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-colors ${
                    brushWidth === w
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-stone-100 dark:bg-stone-900 border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  {w}px
                </button>
              ))}
            </div>
          </div>

          {/* Pressure Sensitivity Control */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs font-bold mb-1.5">
              <span className="text-stone-500 dark:text-stone-400">筆圧感知 (Pressure Sensitivity)</span>
              <span
                className={`font-mono text-xs px-1.5 py-0.5 rounded font-bold ${
                  pressureSensitivity !== 'off'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                    : 'bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
                }`}
              >
                {pressureSensitivity !== 'off' ? '有効 (ON)' : '無効 (OFF)'}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {[
                { id: 'off', label: 'OFF (一定)' },
                { id: 'low', label: '低感度' },
                { id: 'normal', label: '標準' },
                { id: 'high', label: '高感度' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => onChangePressureSensitivity?.(item.id as 'high' | 'normal' | 'low' | 'off')}
                  className={`py-1.5 px-1 rounded-lg text-xs font-bold border transition-colors text-center ${
                    pressureSensitivity === item.id
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-stone-100 dark:bg-stone-900 border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Smoothing Intensity Control */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs font-bold mb-1.5">
              <span className="text-stone-500 dark:text-stone-400">手ブレ補正強度 (Smoothing)</span>
              <span className="font-mono text-xs px-1.5 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                {smoothingIntensity === 0 ? 'OFF (0%)' : `${smoothingIntensity}%`}
              </span>
            </div>
            <div className="flex items-center space-x-2 my-1">
              <span className="text-[10px] opacity-60">OFF</span>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={smoothingIntensity ?? 0}
                onChange={(e) => onChangeSmoothingIntensity?.(Number(e.target.value))}
                className="flex-1 h-2 bg-stone-200 dark:bg-stone-700 rounded-lg cursor-pointer accent-emerald-600"
              />
              <span className="text-[10px] opacity-60">100%</span>
            </div>
            <div className="grid grid-cols-5 gap-1 mt-1.5">
              {[
                { val: 0, label: 'OFF' },
                { val: 25, label: '弱め' },
                { val: 50, label: '標準' },
                { val: 75, label: '強め' },
                { val: 100, label: '最大' },
              ].map((preset) => (
                <button
                  key={preset.val}
                  onClick={() => onChangeSmoothingIntensity?.(preset.val)}
                  className={`py-1 rounded text-[10px] font-bold border transition-colors text-center ${
                    smoothingIntensity === preset.val
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-stone-100 dark:bg-stone-900 border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Straight Ruler Line Assist Toggle for Mobile */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs font-bold mb-1.5">
              <span className="text-stone-500 dark:text-stone-400">定規直線モード (Straight Line)</span>
              <span
                className={`font-mono text-xs px-1.5 py-0.5 rounded font-bold ${
                  brushStraightMode
                    ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200'
                    : 'bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
                }`}
              >
                {brushStraightMode ? '有効 (ON)' : '無効 (OFF)'}
              </span>
            </div>
            <button
              onClick={() => {
                const next = !brushStraightMode;
                setBrushStraightMode(next);
                showCanvasToast(
                  next
                    ? '定規直線モードをONにしました (ドラッグで水平・垂直・45度の直線を引けます)'
                    : '定規直線モードをOFFにしました'
                );
              }}
              className={`w-full py-2 px-3 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-2 ${
                brushStraightMode
                  ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                  : 'bg-stone-100 dark:bg-stone-900 border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300'
              }`}
            >
              <Ruler className="w-4 h-4" />
              <span>{brushStraightMode ? '定規直線モード: ON (手ブレなし直線)' : '定規直線モード: OFF (通常手書き)'}</span>
            </button>
          </div>

          {/* Pen Presets Grid */}
          <div>
            <div className="font-bold text-xs text-stone-500 dark:text-stone-400 mb-2">ペンの種類</div>
            <div className="grid grid-cols-2 gap-2">
              {PEN_PRESETS.map((preset) => {
                const isSelected = brushStyle === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => {
                      onChangeBrushStyle?.(preset.id);
                      if (preset.defaultWidth && onChangeBrushWidth) {
                        onChangeBrushWidth(preset.defaultWidth);
                      }
                      onClose();
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? isLight
                          ? 'bg-emerald-100/90 text-emerald-950 font-bold border-emerald-400 ring-1 ring-emerald-400'
                          : 'bg-emerald-950/80 text-emerald-200 font-bold border-emerald-600 ring-1 ring-emerald-600'
                        : isLight
                        ? 'bg-stone-50 hover:bg-emerald-50/50 border-stone-200 text-stone-700'
                        : 'bg-stone-900/60 hover:bg-[#1f2f24] border-stone-800 text-emerald-300'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center justify-between">
                      <span>{preset.name}</span>
                      {isSelected && <span className="text-[10px] text-emerald-600 dark:text-emerald-400">✓ 選択中</span>}
                    </div>
                    <div className="text-[10px] opacity-75 mt-0.5 truncate">{preset.description}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }
);
