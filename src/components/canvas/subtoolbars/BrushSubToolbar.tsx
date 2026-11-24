import React from 'react';
import {
  Paintbrush,
  Sliders,
  Activity,
  Wand2,
  Compass,
} from 'lucide-react';
import { BrushStyle } from '../../../types';
import { PEN_PRESETS } from '../../../utils/path';

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
        className="sm:hidden px-2 py-1 rounded text-xs font-bold border flex items-center space-x-1 bg-emerald-100 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 shrink-0 cursor-pointer"
        title="ペンの種類と太さを設定"
      >
        <Paintbrush className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-300" />
        <span>{PEN_PRESETS.find((p) => p.id === brushStyle)?.name || 'ペン'}</span>
        <span className="font-mono tabular-nums text-[10px]">({brushWidth}px)</span>
      </button>

      {/* Desktop Rich Brush Studio Controls */}
      <div className="hidden sm:flex items-center space-x-1.5 ml-1 pl-1.5 border-l border-stone-200 dark:border-stone-700 shrink-0">
        {/* All Pens Dropdown */}
        {onChangeBrushStyle && (
          <select
            value={brushStyle || 'signpen'}
            onChange={(e) => {
              const newStyle = e.target.value as BrushStyle;
              // Do not overwrite the width here: onChangeBrushStyle
              // (handleChangeBrushStyle) restores the width saved for
              // the selected style.
              onChangeBrushStyle(newStyle);
            }}
            className={`text-xs font-bold px-1.5 py-0.5 rounded border cursor-pointer outline-none ${
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
            className="px-2 py-0.5 rounded text-xs font-bold border flex items-center gap-1 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 border-stone-300 dark:border-stone-700 shrink-0 cursor-pointer whitespace-nowrap"
            title="ペン作成・ブラシカスタマイズスタジオを開く"
          >
            <Sliders className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>ペン設定</span>
          </button>
        )}

        {/* Width Stepper */}
        {onChangeBrushWidth && (
          <div className="flex items-center gap-0.5 bg-stone-100 dark:bg-[#18231c] px-1 py-0.5 rounded border border-stone-200 dark:border-stone-700 text-xs shrink-0">
            <button
              type="button"
              onClick={() => onChangeBrushWidth(Math.max(4, brushWidth - 4))}
              className="w-5 h-5 font-bold hover:bg-stone-200 dark:hover:bg-stone-700 rounded text-stone-600 dark:text-stone-300 cursor-pointer flex items-center justify-center"
              title="線を細く"
            >
              -
            </button>
            <span className="font-mono tabular-nums font-bold px-1 min-w-[32px] text-center">{brushWidth}px</span>
            <button
              type="button"
              onClick={() => onChangeBrushWidth(Math.min(150, brushWidth + 4))}
              className="w-5 h-5 font-bold hover:bg-stone-200 dark:hover:bg-stone-700 rounded text-stone-600 dark:text-stone-300 cursor-pointer flex items-center justify-center"
              title="線を太く"
            >
              +
            </button>
          </div>
        )}

        {/* Unified Pressure Sensitivity Selector */}
        {onChangePressureSensitivity && (
          <div
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded border shrink-0 ${
              pressureSensitivity !== 'off'
                ? isLight
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-[#18231c] border-emerald-700 text-emerald-200'
                : isLight
                ? 'bg-stone-100 border-stone-300 text-stone-500'
                : 'bg-stone-800 border-stone-700 text-stone-400'
            }`}
            title="筆圧感知の有効/無効と感度を変更"
          >
            <Activity className="w-3 h-3 shrink-0" />
            <select
              value={pressureSensitivity || 'normal'}
              onChange={(e) =>
                onChangePressureSensitivity(e.target.value as 'high' | 'normal' | 'low' | 'off')
              }
              className="text-[11px] font-bold bg-transparent cursor-pointer outline-none"
              aria-label="筆圧感度"
            >
              <option value="high">筆圧: 高</option>
              <option value="normal">筆圧: 標準</option>
              <option value="low">筆圧: 弱</option>
              <option value="off">筆圧: OFF</option>
            </select>
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
          className={`px-2 py-0.5 rounded text-xs font-bold border flex items-center justify-center gap-1 cursor-pointer shrink-0 whitespace-nowrap ${
            brushStraightMode
              ? 'bg-emerald-600 text-white border-emerald-600'
              : 'bg-stone-100 dark:bg-stone-800 text-stone-500 border-stone-300 dark:border-stone-700'
          }`}
          title={`直線モード: ${brushStraightMode ? 'ON' : 'OFF'} (始点と終点をまっすぐ結ぶ)`}
        >
          <span>{brushStraightMode ? '直線 ON' : '直線'}</span>
        </button>

        {/* Unified Auto Smooth Selector */}
        <div
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded border shrink-0 ${
            autoSmoothBrush
              ? isLight
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-[#18231c] border-emerald-700 text-emerald-200'
              : isLight
              ? 'bg-stone-100 border-stone-300 text-stone-500'
              : 'bg-stone-800 border-stone-700 text-stone-400'
          }`}
          title="手書きストローク自動平滑化・手ブレ補正の強さを変更"
        >
          <Wand2 className="w-3 h-3 shrink-0" />
          <select
            value={autoSmoothBrush ? smoothStrength || 'standard' : 'off'}
            onChange={(e) => {
              const val = e.target.value as 'mild' | 'standard' | 'strong' | 'off';
              if (val === 'off') {
                setAutoSmoothBrush(false);
                showCanvasToast('自動平滑化・手ブレ補正をOFFにしました');
              } else {
                setAutoSmoothBrush(true);
                setSmoothStrength(val);
                showCanvasToast(
                  `手ブレ補正レベル: ${val === 'strong' ? '強 (なめらか)' : val === 'standard' ? '標準' : '弱 (そのまま)'}`
                );
              }
            }}
            className="text-[11px] font-bold bg-transparent cursor-pointer outline-none"
            aria-label="手ブレ補正"
          >
            <option value="strong">手ブレ: 強</option>
            <option value="standard">手ブレ: 標準</option>
            <option value="mild">手ブレ: 弱</option>
            <option value="off">手ブレ: OFF</option>
          </select>
        </div>

        {/* Straighten Wobbly Contour Action */}
        <button
          type="button"
          onClick={handleStraightenWobblySelected}
          className="px-2 py-0.5 rounded text-xs font-bold border flex items-center gap-1 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 border-stone-300 dark:border-stone-700 cursor-pointer shrink-0 whitespace-nowrap"
          title="描いた線のうねり・ガタガタ歪みを自動でまっすぐ直線化補正します"
        >
          <Compass className="w-3 h-3 shrink-0" />
          <span>直線補正</span>
        </button>
      </div>
    </>
  );
};
