import React from 'react';
import {
  Paintbrush,
  Sliders,
  X,
  Plus,
  Grid,
} from 'lucide-react';
import {
  ToolMode,
  BrushStyle,
  UserPenPreset,
} from '../../types';
import { ThemeClasses } from '../../utils/theme';
import { PEN_PRESETS } from '../../utils/pathUtils';
import { PEN_ICONS, PRESSURE_MODES } from './toolbarConstants';

export interface DesktopBrushMenuPopoverProps {
  isOpen: boolean;
  anchorTop: number;
  onClose: () => void;
  brushStyle: BrushStyle;
  setBrushStyle?: (style: BrushStyle) => void;
  brushWidth: number;
  setBrushWidth: (width: number) => void;
  setToolMode: (mode: ToolMode) => void;
  pressureSensitivity?: 'high' | 'normal' | 'low' | 'off';
  onChangePressureSensitivity?: (val: 'high' | 'normal' | 'low' | 'off') => void;
  smoothingIntensity?: number;
  onChangeSmoothingIntensity?: (val: number) => void;
  activePenPreset?: UserPenPreset;
  customPresets: UserPenPreset[];
  onApplyPreset?: (preset: UserPenPreset) => void;
  onOpenPenPresetsModal?: () => void;
  onOpenPixelStudio?: () => void;
  themeClasses: ThemeClasses;
  isLight: boolean;
}

export const DesktopBrushMenuPopover: React.FC<DesktopBrushMenuPopoverProps> = React.memo(({
  isOpen,
  anchorTop,
  onClose,
  brushStyle,
  setBrushStyle,
  setBrushWidth,
  setToolMode,
  pressureSensitivity = 'normal',
  onChangePressureSensitivity,
  smoothingIntensity = 50,
  onChangeSmoothingIntensity,
  activePenPreset,
  customPresets,
  onApplyPreset,
  onOpenPenPresetsModal,
  onOpenPixelStudio,
  themeClasses,
  isLight,
}) => {
  if (!isOpen) return null;

  const isCustomPen = Boolean(
    activePenPreset &&
      (activePenPreset.id?.startsWith('preset-custom-') ||
        activePenPreset.id?.startsWith('custom-') ||
        activePenPreset.isCustom ||
        activePenPreset.name?.includes('カスタム') ||
        !PEN_PRESETS.some((p) => p.id === brushStyle))
  );

  return (
    <div
      style={{
        top: `${anchorTop}px`,
        maxHeight: `calc(100vh - ${anchorTop}px - 24px)`,
      }}
      className={`fixed inset-x-3 max-w-sm mx-auto sm:inset-x-auto sm:bottom-auto sm:fixed sm:left-14 md:left-16 sm:w-80 z-50 p-2.5 pb-8 rounded-2xl border shadow-2xl animate-in fade-in duration-150 overflow-y-auto ${themeClasses.cardBg}`}
    >
      <div className="px-2 py-1 text-[11px] font-bold border-b mb-1.5 flex items-center justify-between border-stone-200 dark:border-[#223025]">
        <div className="flex items-center space-x-1.5">
          <span className={isLight ? 'text-emerald-800' : 'text-emerald-400'}>手書きペンの種類</span>
          {isCustomPen && (
            <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white font-bold text-[9px]">
              カスタムペン
            </span>
          )}
        </div>
        <div className="flex items-center space-x-1.5">
          {onOpenPenPresetsModal && (
            <button
              onClick={() => {
                onClose();
                onOpenPenPresetsModal();
              }}
              className="px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center space-x-1 bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer"
              title="ペン作成・ブラシカスタマイズを開く"
            >
              <Sliders className="w-3 h-3" />
              <span>ペン作成・編集</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-stone-200 dark:hover:bg-[#25362b] opacity-70 hover:opacity-100 transition-opacity"
            title="閉じる"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="space-y-1 max-h-[340px] overflow-y-auto pr-1">
        {/* Custom User Pens */}
        {customPresets.length > 0 && (
          <div className="mb-2 pb-2 border-b border-stone-200/80 dark:border-[#223025]">
            <div className="px-1.5 pb-1 text-[10px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider flex items-center justify-between">
              <span>自作カスタムペン ({customPresets.length})</span>
              <span className="text-[9px] font-normal opacity-70">マイプリセット</span>
            </div>
            <div className="space-y-1">
              {customPresets.map((preset) => {
                const PIcon = PEN_ICONS[preset.brushStyle] || Paintbrush;
                const isSelected = activePenPreset?.id === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onApplyPreset?.(preset);
                      setToolMode('brush');
                      onClose();
                    }}
                    className={`w-full text-left p-2 rounded-xl transition-all flex items-start space-x-2.5 ${
                      isSelected
                        ? isLight
                          ? 'bg-emerald-50 text-emerald-950 font-bold border border-emerald-300'
                          : 'bg-emerald-950/80 text-emerald-200 font-bold border border-emerald-700'
                        : isLight
                        ? 'hover:bg-stone-100 text-stone-700'
                        : 'hover:bg-[#1d2921] text-emerald-300'
                    }`}
                  >
                    <div
                      className={`p-1.5 rounded-lg mt-0.5 ${
                        isSelected
                          ? isLight
                            ? 'bg-emerald-700 text-white'
                            : 'bg-emerald-500 text-stone-950'
                          : isLight
                          ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-300'
                          : 'bg-[#1a251e] text-emerald-400'
                      }`}
                    >
                      <PIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold truncate">{preset.name}</span>
                        <span className="text-[10px] font-mono opacity-70 shrink-0 ml-1">
                          太さ {preset.brushWidth}px
                        </span>
                      </div>
                      <p className="text-[10.5px] leading-relaxed opacity-75 mt-0.5 font-normal truncate">
                        筆圧: {preset.pressureSensitivity} · スムーズ: {preset.smoothingIntensity ?? 50}%
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Built-in Standard Pens */}
        {customPresets.length > 0 && (
          <div className="px-1.5 pt-0.5 pb-1 text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">
            標準ペン
          </div>
        )}
        {PEN_PRESETS.map((preset) => {
          const PIcon = PEN_ICONS[preset.id] || Paintbrush;
          const isSelected = (!isCustomPen && brushStyle === preset.id) || activePenPreset?.id === preset.id;
          return (
            <button
              key={preset.id}
              onClick={(e) => {
                e.stopPropagation();
                setBrushStyle?.(preset.id);
                if (preset.defaultWidth) {
                  setBrushWidth(preset.defaultWidth);
                }
                setToolMode('brush');
                onClose();
              }}
              className={`w-full text-left p-2 rounded-xl transition-all flex items-start space-x-2.5 ${
                isSelected
                  ? isLight
                    ? 'bg-emerald-50 text-emerald-950 font-bold border border-emerald-300'
                    : 'bg-emerald-950/80 text-emerald-200 font-bold border border-emerald-700'
                  : isLight
                  ? 'hover:bg-stone-100 text-stone-700'
                  : 'hover:bg-[#1d2921] text-emerald-300'
              }`}
            >
              <div
                className={`p-1.5 rounded-lg mt-0.5 ${
                  isSelected
                    ? isLight
                      ? 'bg-emerald-700 text-white'
                      : 'bg-emerald-500 text-stone-950'
                    : isLight
                    ? 'bg-stone-100 text-stone-600'
                    : 'bg-[#1a251e] text-emerald-400'
                }`}
              >
                <PIcon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">{preset.name}</span>
                  <span className="text-[10px] font-mono opacity-70">太さ {preset.defaultWidth}px</span>
                </div>
                <p className="text-[10.5px] leading-relaxed opacity-75 mt-0.5 font-normal">
                  {preset.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Dedicated Pixel Font Studio Launcher */}
      {onOpenPixelStudio && (
        <button
          onClick={() => {
            onClose();
            onOpenPixelStudio();
          }}
          className="w-full mt-1.5 py-2 px-2.5 rounded-xl text-xs font-bold bg-stone-100 hover:bg-stone-200 dark:bg-[#18261e] dark:hover:bg-[#22352a] text-stone-800 dark:text-emerald-200 border border-stone-200 dark:border-[#25362b] flex items-center justify-center space-x-1.5 transition-all active:scale-95 cursor-pointer"
          title="グリッド上でドットを配置し、ピクセルフォントを作字します"
        >
          <Grid className="w-3.5 h-3.5 text-emerald-300" />
          <span>ピクセルフォント作成</span>
        </button>
      )}

      {/* Add Custom Brush / Preset Trigger */}
      {onOpenPenPresetsModal && (
        <button
          onClick={() => {
            onClose();
            onOpenPenPresetsModal();
          }}
          className="w-full mt-2 py-2 px-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white dark:text-stone-950 flex items-center justify-center space-x-1.5 transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>カスタムブラシを作成・編集</span>
        </button>
      )}

      {/* Apple Pencil & Stylus Pressure Sensitivity Settings */}
      <div className="mt-2 pt-2 border-t border-stone-200 dark:border-[#223025] px-1">
        <div className="flex items-center justify-between text-[11px] mb-1.5 font-bold">
          <span className="flex items-center space-x-1">
            <span>筆圧感度 (Apple Pencil / ペン)</span>
          </span>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
            {pressureSensitivity === 'high'
              ? '高感度 (推奨)'
              : pressureSensitivity === 'normal'
              ? '標準'
              : pressureSensitivity === 'low'
              ? '弱め'
              : 'OFF (均一)'}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-1">
          {PRESSURE_MODES.map((mode) => (
            <button
              key={mode.id}
              onClick={() => onChangePressureSensitivity?.(mode.id)}
              className={`py-1 px-1 rounded-lg text-center transition-all cursor-pointer ${
                (pressureSensitivity || 'normal') === mode.id
                  ? isLight
                    ? 'bg-emerald-700 text-white font-bold'
                    : 'bg-emerald-500 text-stone-950 font-bold'
                  : isLight
                  ? 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                  : 'bg-[#18231c] hover:bg-[#1f2d24] text-emerald-200/80'
              }`}
            >
              <div className="text-[10.5px] font-bold leading-none">{mode.label}</div>
              <div className="text-[8px] opacity-70 leading-none mt-0.5">{mode.desc}</div>
            </button>
          ))}
        </div>
        <p className="text-[9.5px] opacity-70 mt-1.5 leading-relaxed">
          スタイラスペンの筆圧・速度の入力に対応しています。
        </p>
      </div>

      {/* Real-time Hand-jitter & Stroke Smoothing Intensity */}
      <div className="mt-2 pt-2 border-t border-stone-200 dark:border-[#223025] px-1">
        <div className="flex items-center justify-between text-[11px] mb-1 font-bold">
          <span className="flex items-center space-x-1">
            <span>手ブレ補正強度 (Smoothing)</span>
          </span>
          <span className="text-[10.5px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
            {smoothingIntensity === 0
              ? 'OFF (0%)'
              : smoothingIntensity <= 25
              ? `${smoothingIntensity}% (弱め)`
              : smoothingIntensity <= 60
              ? `${smoothingIntensity}% (標準)`
              : smoothingIntensity <= 85
              ? `${smoothingIntensity}% (強め)`
              : `${smoothingIntensity}% (最大)`}
          </span>
        </div>
        <div className="flex items-center space-x-2 my-1">
          <span className="text-[9px] opacity-60">OFF</span>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={smoothingIntensity ?? 0}
            onChange={(e) => onChangeSmoothingIntensity?.(Number(e.target.value))}
            className="flex-1 accent-emerald-600 dark:accent-emerald-400 cursor-pointer h-1.5 bg-stone-200 dark:bg-[#202d24] rounded-lg"
          />
          <span className="text-[9px] opacity-60">100%</span>
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
              className={`py-1 px-0.5 rounded text-[9.5px] font-bold text-center transition-all cursor-pointer ${
                smoothingIntensity === preset.val
                  ? isLight
                    ? 'bg-emerald-700 text-white'
                    : 'bg-emerald-500 text-stone-950'
                  : isLight
                  ? 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                  : 'bg-[#18231c] hover:bg-[#1f2d24] text-emerald-200/80'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <p className="text-[9.5px] opacity-70 mt-1.5 leading-relaxed">
          文字を書く際の細かな手の震えやガタつきをリアルタイムに抑制し、滑らかな筆跡を形成します。
        </p>
      </div>
    </div>
  );
});

DesktopBrushMenuPopover.displayName = 'DesktopBrushMenuPopover';
