import React from 'react';
import { Grid, X } from 'lucide-react';
import { GridSettings } from '../../types';
import { ThemeClasses } from '../../utils/theme';
import { VERTICAL_GUIDES, JAPANESE_GUIDES } from './toolbarConstants';

export interface DesktopGridMenuPopoverProps {
  isOpen: boolean;
  anchorTop: number;
  onClose: () => void;
  gridSettings: GridSettings;
  setGridSettings: React.Dispatch<React.SetStateAction<GridSettings>>;
  themeClasses: ThemeClasses;
  isLight: boolean;
}

export const DesktopGridMenuPopover: React.FC<DesktopGridMenuPopoverProps> = React.memo(({
  isOpen,
  anchorTop,
  onClose,
  gridSettings,
  setGridSettings,
  themeClasses,
  isLight,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        top: `${anchorTop}px`,
        maxHeight: `calc(100vh - ${anchorTop}px - 24px)`,
      }}
      className={`fixed inset-x-3 max-w-xs mx-auto sm:inset-x-auto sm:bottom-auto sm:fixed sm:left-13 md:left-14 sm:w-72 z-50 p-3 pb-6 rounded-2xl border shadow-2xl animate-in fade-in duration-150 overflow-y-auto ${themeClasses.cardBg}`}
    >
      <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-stone-200 dark:border-[#223025]">
        <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-700 dark:text-emerald-400">
          <Grid className="w-3.5 h-3.5" />
          <span>方眼グリッド設定</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Grid ON/OFF and Snap Toggles */}
      <div className="grid grid-cols-2 gap-1.5 mb-3">
        <button
          type="button"
          onClick={() => setGridSettings((s) => ({ ...s, showGrid: !s.showGrid }))}
          className={`p-1.5 rounded-lg border text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
            gridSettings.showGrid
              ? 'bg-emerald-600 text-white border-emerald-600'
              : 'bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400'
          }`}
        >
          <span>方眼グリッド</span>
          <span className="text-[10px] font-mono">{gridSettings.showGrid ? 'ON' : 'OFF'}</span>
        </button>
        <button
          type="button"
          onClick={() => setGridSettings((s) => ({ ...s, snapToGrid: !s.snapToGrid }))}
          className={`p-1.5 rounded-lg border text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
            gridSettings.snapToGrid
              ? 'bg-emerald-600 text-white border-emerald-600'
              : 'bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400'
          }`}
        >
          <span>吸着 (Snap)</span>
          <span className="text-[10px] font-mono">{gridSettings.snapToGrid ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      {/* Grid Size Adjustment Slider */}
      <div className="space-y-2 p-2 rounded-xl bg-stone-50/80 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 mb-2.5">
        <div className="flex items-center justify-between">
          <span className="font-bold text-[11px] text-stone-700 dark:text-stone-300">
            グリッドサイズ
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() =>
                setGridSettings((prev) => {
                  const current = prev.gridSize || 50;
                  const step = current > 100 ? 10 : current <= 20 ? 2 : 5;
                  return { ...prev, gridSize: Math.max(5, current - step) };
                })
              }
              className="w-5 h-5 rounded flex items-center justify-center border border-stone-300 dark:border-stone-700 hover:bg-stone-200 dark:hover:bg-stone-800 text-xs font-bold leading-none select-none cursor-pointer"
              title="縮小 (-)"
            >
              -
            </button>
            <div className="flex items-center bg-white dark:bg-stone-800 rounded px-1.5 py-0.5 border border-stone-300 dark:border-stone-700">
              <input
                type="number"
                min="5"
                max="250"
                value={gridSettings.gridSize || 50}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) {
                    setGridSettings((prev) => ({
                      ...prev,
                      gridSize: Math.max(5, Math.min(250, val)),
                    }));
                  }
                }}
                className="w-8 text-center font-mono font-bold text-emerald-700 dark:text-emerald-300 text-xs bg-transparent focus:outline-hidden"
              />
              <span className="text-[9px] font-mono text-stone-500 font-bold">px</span>
            </div>
            <button
              type="button"
              onClick={() =>
                setGridSettings((prev) => {
                  const current = prev.gridSize || 50;
                  const step = current >= 100 ? 10 : current < 20 ? 2 : 5;
                  return { ...prev, gridSize: Math.min(250, current + step) };
                })
              }
              className="w-5 h-5 rounded flex items-center justify-center border border-stone-300 dark:border-stone-700 hover:bg-stone-200 dark:hover:bg-stone-800 text-xs font-bold leading-none select-none cursor-pointer"
              title="拡大 (+)"
            >
              +
            </button>
          </div>
        </div>

        {/* Range Slider */}
        <div className="flex items-center gap-1.5 pt-0.5">
          <span className="text-[9px] font-mono text-stone-400 font-bold">5</span>
          <input
            type="range"
            min="5"
            max="200"
            step="5"
            value={gridSettings.gridSize || 50}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              setGridSettings((prev) => ({
                ...prev,
                gridSize: val,
              }));
            }}
            className="flex-1 h-1.5 bg-stone-200 dark:bg-stone-700 rounded-lg appearance-none cursor-pointer accent-emerald-600 focus:outline-hidden"
          />
          <span className="text-[9px] font-mono text-stone-400 font-bold">200</span>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center justify-between gap-1 pt-1">
          {[10, 25, 50, 100, 128].map((size) => (
            <button
              key={size}
              type="button"
              onClick={() =>
                setGridSettings((prev) => ({
                  ...prev,
                  gridSize: size,
                }))
              }
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors cursor-pointer ${
                (gridSettings.gridSize || 50) === size
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700'
              }`}
            >
              {size}
            </button>
          ))}
        </div>

        {/* Grid & Guides Opacity (濃さ・透明度) */}
        <div className="pt-2 mt-1 border-t border-stone-200 dark:border-stone-800">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-stone-600 dark:text-stone-300">
              グリッド線の濃さ
            </span>
            <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {gridSettings.gridOpacity ?? 30}%
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-mono text-stone-400 font-bold">10</span>
            <input
              type="range"
              min="10"
              max="100"
              step="5"
              value={gridSettings.gridOpacity ?? 30}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setGridSettings((prev) => ({
                  ...prev,
                  gridOpacity: val,
                }));
              }}
              className="flex-1 h-1.5 bg-stone-200 dark:bg-stone-700 rounded-lg appearance-none cursor-pointer accent-emerald-600 focus:outline-hidden"
            />
            <span className="text-[9px] font-mono text-stone-400 font-bold">100</span>
          </div>
          <div className="flex items-center justify-between gap-1 pt-1">
            {[
              { label: '極薄', val: 15 },
              { label: '淡め', val: 25 },
              { label: '標準', val: 35 },
              { label: 'くっきり', val: 60 },
            ].map((p) => (
              <button
                key={p.val}
                type="button"
                onClick={() =>
                  setGridSettings((prev) => ({
                    ...prev,
                    gridOpacity: p.val,
                  }))
                }
                className={`flex-1 py-0.5 rounded text-[9.5px] font-bold border transition-colors cursor-pointer ${
                  (gridSettings.gridOpacity ?? 30) === p.val
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Vertical Guides Section */}
      <div className="space-y-1.5 mb-2.5 p-2 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-900/40">
        <div className="flex items-center justify-between">
          <span className="font-bold text-[11px] text-purple-900 dark:text-purple-300">
            縦グリッド・縦分割ガイド
          </span>
          <span className="text-[9px] text-purple-700 dark:text-purple-400 font-medium">偏・旁・ステム</span>
        </div>
        <div className="grid grid-cols-5 gap-1">
          {VERTICAL_GUIDES.map((vg) => (
            <button
              key={vg.id}
              type="button"
              onClick={() =>
                setGridSettings((prev) => ({
                  ...prev,
                  verticalGuide: vg.id,
                }))
              }
              className={`py-1 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                (gridSettings.verticalGuide || 'none') === vg.id
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-white dark:bg-stone-800 border-purple-200 dark:border-purple-900/50 text-stone-700 dark:text-stone-300 hover:bg-purple-100 dark:hover:bg-purple-900/30'
              }`}
              title={`縦ガイド: ${vg.label}`}
            >
              {vg.label}
            </button>
          ))}
        </div>
      </div>

      {/* Japanese Guide Pattern Section */}
      <div className="space-y-1.5 mb-2.5 p-2 rounded-xl bg-stone-50/80 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800">
        <div className="flex items-center justify-between">
          <span className="font-bold text-[11px] text-stone-700 dark:text-stone-300">
            和文目安ガイド (作字格)
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {JAPANESE_GUIDES.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() =>
                setGridSettings((prev) => ({
                  ...prev,
                  japaneseGuide: g.id,
                }))
              }
              className={`py-1 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                (gridSettings.japaneseGuide || 'tian') === g.id
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* Frames & Center Axis Quick Toggles */}
      <div className="grid grid-cols-3 gap-1 mb-2">
        <button
          type="button"
          onClick={() => setGridSettings((prev) => ({ ...prev, showBodyFrame: !prev.showBodyFrame }))}
          className={`py-1 px-1 rounded text-[10px] font-bold border text-center transition-colors cursor-pointer ${
            gridSettings.showBodyFrame !== false
              ? 'bg-emerald-100 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200'
              : 'bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-500'
          }`}
          title="漢字字面枠 85% (850x850)"
        >
          漢字枠 {gridSettings.showBodyFrame !== false ? 'ON' : 'OFF'}
        </button>
        <button
          type="button"
          onClick={() => setGridSettings((prev) => ({ ...prev, showKanaFrame: !prev.showKanaFrame }))}
          className={`py-1 px-1 rounded text-[10px] font-bold border text-center transition-colors cursor-pointer ${
            gridSettings.showKanaFrame
              ? 'bg-amber-100 dark:bg-amber-950 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200'
              : 'bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-500'
          }`}
          title="仮名字面枠 78% (780x780)"
        >
          仮名枠 {gridSettings.showKanaFrame ? 'ON' : 'OFF'}
        </button>
        <button
          type="button"
          onClick={() =>
            setGridSettings((prev) => ({
              ...prev,
              showVerticalCenter: prev.showVerticalCenter === false ? true : false,
            }))
          }
          className={`py-1 px-1 rounded text-[10px] font-bold border text-center transition-colors cursor-pointer ${
            gridSettings.showVerticalCenter !== false
              ? 'bg-purple-100 dark:bg-purple-950 border-purple-300 dark:border-purple-700 text-purple-900 dark:text-purple-200'
              : 'bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-500'
          }`}
          title="左右中心線 (X=500)"
        >
          中心線 {gridSettings.showVerticalCenter !== false ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Keyboard Shortcut Footer */}
      <div className="text-[10px] text-stone-500 dark:text-stone-400 text-center flex items-center justify-center gap-1 pt-1 border-t border-stone-200 dark:border-[#223025]">
        <span>ショートカット:</span>
        <kbd className="px-1 py-0.2 bg-stone-100 dark:bg-stone-800 rounded border border-stone-300 dark:border-stone-700 font-mono font-bold">
          Alt
        </kbd>
        <span>+</span>
        <kbd className="px-1 py-0.2 bg-stone-100 dark:bg-stone-800 rounded border border-stone-300 dark:border-stone-700 font-mono font-bold">
          +/-
        </kbd>
      </div>
    </div>
  );
});

DesktopGridMenuPopover.displayName = 'DesktopGridMenuPopover';
