import React from 'react';
import {
  Paintbrush,
  Sliders,
  Activity,
  Wand2,
  Compass,
} from 'lucide-react';
import { BrushStyle } from '../../../types';
import { PEN_PRESETS } from '../../../utils/pathUtils';

interface BrushSubToolbarProps {
  brushStyle: BrushStyle;
  onChangeBrushStyle?: (style: BrushStyle) => void;
  brushWidth: number;
  onChangeBrushWidth?: (w: number) => void;
  onOpenPenPresetsModal?: () => void;
  pressureSensitivity: 'high' | 'normal' | 'low' | 'off';
  onChangePressureSensitivity?: (s: 'high' | 'normal' | 'low' | 'off') => void;
  setShowMobileBrushSheet: (show: boolean) => void;
  brushStraightMode: boolean;
  setBrushStraightMode: (val: boolean) => void;
  autoSmoothBrush: boolean;
  setAutoSmoothBrush: (val: boolean) => void;
  smoothStrength: 'mild' | 'standard' | 'strong';
  setSmoothStrength: (val: 'mild' | 'standard' | 'strong') => void;
  handleStraightenWobblySelected: () => void;
  showCanvasToast: (msg: string, sub?: string) => void;
  isLight: boolean;
}

export const BrushSubToolbar: React.FC<BrushSubToolbarProps> = ({
  brushStyle,
  onChangeBrushStyle,
  brushWidth,
  onChangeBrushWidth,
  onOpenPenPresetsModal,
  pressureSensitivity,
  onChangePressureSensitivity,
  setShowMobileBrushSheet,
  brushStraightMode,
  setBrushStraightMode,
  autoSmoothBrush,
  setAutoSmoothBrush,
  smoothStrength,
  setSmoothStrength,
  handleStraightenWobblySelected,
  showCanvasToast,
  isLight,
}) => {
  return (
    <>
      {/* Mobile Brush Presets Sheet Trigger */}
      <button
        type="button"
        onClick={() => setShowMobileBrushSheet(true)}
        className="sm:hidden px-2 py-1 rounded text-xs font-bold border transition-colors flex items-center space-x-1 bg-emerald-100 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 shrink-0 cursor-pointer"
        title="ペンの種類と太さを設定"
      >
        <Paintbrush className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-300" />
        <span>{PEN_PRESETS.find((p) => p.id === brushStyle)?.name || 'ペン'}</span>
        <span className="font-mono text-[10px]">({brushWidth}px)</span>
      </button>

      {/* Desktop Rich Brush Studio Controls */}
      <div className="hidden sm:flex items-center space-x-1.5 ml-1 pl-1.5 border-l border-stone-200 dark:border-stone-700 overflow-x-auto no-scrollbar">
        {/* All Pens Dropdown */}
        {onChangeBrushStyle && (
          <select
            value={brushStyle || 'signpen'}
            onChange={(e) => {
              const newStyle = e.target.value as BrushStyle;
              onChangeBrushStyle(newStyle);
              const preset = PEN_PRESETS.find((p) => p.id === newStyle);
              if (preset && preset.defaultWidth && onChangeBrushWidth) {
                onChangeBrushWidth(preset.defaultWidth);
              }
            }}
            className={`text-xs font-bold px-1.5 py-1 rounded border transition-colors cursor-pointer outline-none ${
              isLight
                ? 'bg-stone-50 border-stone-300 text-stone-800 focus:border-emerald-600'
                : 'bg-[#18231c] border-[#25382c] text-emerald-200 focus:border-emerald-500'
            }`}
            title="その他全ペンスタイル一覧"
          >
            {PEN_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}

        {/* Studio Launch Button */}
        {onOpenPenPresetsModal && (
          <button
            type="button"
            onClick={onOpenPenPresetsModal}
            className="px-2.5 py-1 rounded-lg text-xs font-bold border transition-all flex items-center space-x-1.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 border-stone-300 dark:border-stone-700 shrink-0 active:scale-95 cursor-pointer"
            title="ペン作成・ブラシカスタマイズスタジオを開く"
          >
            <Sliders className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>ペン作成・編集</span>
          </button>
        )}

        {/* Width Stepper */}
        {onChangeBrushWidth && (
          <div className="flex items-center gap-0.5 bg-stone-100 dark:bg-[#18231c] px-1.5 py-0.5 rounded-lg border border-stone-200 dark:border-stone-700 text-xs">
            <button
              type="button"
              onClick={() => onChangeBrushWidth(Math.max(4, brushWidth - 4))}
              className="px-1 py-0.5 font-bold hover:bg-stone-200 dark:hover:bg-stone-700 rounded text-stone-600 dark:text-stone-300 cursor-pointer"
              title="線を細く"
            >
              -
            </button>
            <span className="font-mono font-bold px-1 min-w-[32px] text-center">{brushWidth}px</span>
            <button
              type="button"
              onClick={() => onChangeBrushWidth(Math.min(150, brushWidth + 4))}
              className="px-1 py-0.5 font-bold hover:bg-stone-200 dark:hover:bg-stone-700 rounded text-stone-600 dark:text-stone-300 cursor-pointer"
              title="線を太く"
            >
              +
            </button>
          </div>
        )}

        {/* Pressure Sensitivity */}
        {onChangePressureSensitivity && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                if (pressureSensitivity === 'off') {
                  onChangePressureSensitivity('high');
                } else {
                  onChangePressureSensitivity('off');
                }
              }}
              className={`px-2 py-1 rounded-lg text-xs font-bold border transition-colors flex items-center space-x-1 cursor-pointer ${
                pressureSensitivity !== 'off'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-500 border-stone-300 dark:border-stone-700'
              }`}
              title={pressureSensitivity !== 'off' ? '筆圧感知有効 (クリックでOFF)' : '筆圧感知無効 (クリックでON)'}
            >
              <Activity className="w-3 h-3" />
              <span className="hidden sm:inline">筆圧:</span>
              <span>{pressureSensitivity !== 'off' ? 'ON' : 'OFF'}</span>
            </button>

            {pressureSensitivity !== 'off' && (
              <select
                value={pressureSensitivity || 'normal'}
                onChange={(e) =>
                  onChangePressureSensitivity(e.target.value as 'high' | 'normal' | 'low' | 'off')
                }
                className={`text-[11px] font-bold px-1.5 py-1 rounded border transition-colors cursor-pointer outline-none ${
                  isLight
                    ? 'bg-stone-50 border-stone-300 text-stone-800 focus:border-emerald-600'
                    : 'bg-[#18231c] border-[#25382c] text-emerald-200 focus:border-emerald-500'
                }`}
                title="筆圧感度の強さを変更"
              >
                <option value="high">感度: 高</option>
                <option value="normal">感度: 標準</option>
                <option value="low">感度: 弱</option>
              </select>
            )}
          </div>
        )}

        {/* Straight Mode Toggle */}
        <button
          type="button"
          onClick={() => {
            const next = !brushStraightMode;
            setBrushStraightMode(next);
            showCanvasToast(next ? '直線モードをONにしました (定規のようにまっすぐ描画)' : 'フリーハンド描画に戻しました');
          }}
          className={`px-2 py-1 rounded-lg text-xs font-bold border transition-colors flex items-center space-x-1 cursor-pointer ${
            brushStraightMode
              ? 'bg-emerald-600 text-white border-emerald-600'
              : 'bg-stone-100 dark:bg-stone-800 text-stone-500 border-stone-300 dark:border-stone-700'
          }`}
          title="直線モード (始点と終点をまっすぐ結ぶ)"
        >
          <span className="hidden sm:inline">直線:</span>
          <span>{brushStraightMode ? 'ON' : 'OFF'}</span>
        </button>

        {/* Auto Smooth */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              const next = !autoSmoothBrush;
              setAutoSmoothBrush(next);
              showCanvasToast(next ? '手ブレ補正・自動平滑化をONにしました' : '自動平滑化をOFFにしました');
            }}
            className={`px-2 py-1 rounded-lg text-xs font-bold border transition-colors flex items-center space-x-1 cursor-pointer ${
              autoSmoothBrush
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-500 border-stone-300 dark:border-stone-700'
            }`}
            title="手書きストローク自動平滑化・手ブレ補正"
          >
            <Wand2 className="w-3 h-3" />
            <span className="hidden sm:inline">手ブレ補正:</span>
            <span>{autoSmoothBrush ? 'ON' : 'OFF'}</span>
          </button>

          {autoSmoothBrush && (
            <select
              value={smoothStrength}
              onChange={(e) => {
                const val = e.target.value as 'mild' | 'standard' | 'strong';
                setSmoothStrength(val);
                showCanvasToast(`手ブレ補正レベル: ${val === 'strong' ? '強 (なめらか)' : val === 'standard' ? '標準' : '弱 (そのまま)'}`);
              }}
              className={`text-[11px] font-bold px-1.5 py-1 rounded border transition-colors cursor-pointer outline-none ${
                isLight
                  ? 'bg-stone-50 border-stone-300 text-stone-800 focus:border-emerald-600'
                  : 'bg-[#18231c] border-[#25382c] text-emerald-200 focus:border-emerald-500'
              }`}
              title="手ブレ補正の強さを変更"
            >
              <option value="strong">補正: 強 (なめらか)</option>
              <option value="standard">補正: 標準</option>
              <option value="mild">補正: 弱</option>
            </select>
          )}
        </div>

        {/* Straighten Wobbly Contour Action */}
        <button
          type="button"
          onClick={handleStraightenWobblySelected}
          className="px-2 py-1 rounded-lg text-xs font-bold border transition-colors flex items-center space-x-1 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 border-stone-300 dark:border-stone-700 active:scale-95 cursor-pointer"
          title="描いた線のうねり・ガタガタ歪みを自動でまっすぐ直線化補正します"
        >
          <Compass className="w-3 h-3" />
          <span className="hidden sm:inline">うねり直線補正</span>
          <span className="sm:hidden">直線補正</span>
        </button>
      </div>
    </>
  );
};
