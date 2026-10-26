import React from 'react';
import {
  Grid,
  X,
  Magnet,
  Square,
  Trash2,
} from 'lucide-react';
import { CustomGuideline, GridSettings, JapaneseGuidePattern, VerticalGuidePattern } from '../../../types';

export const JAPANESE_GUIDE_OPTIONS: { id: JapaneseGuidePattern; label: string; sub: string }[] = [
  { id: 'none', label: 'なし', sub: '非表示' },
  { id: 'cross', label: '十字格', sub: '中心' },
  { id: 'tian', label: '田字格', sub: '4象限' },
  { id: 'jiugong', label: '九宮格', sub: '3×3分割' },
  { id: 'sixteen', label: '十六宮格', sub: '4×4分割' },
  { id: 'mi', label: '米字格', sub: '対角線' },
];

export const VERTICAL_GUIDE_OPTIONS: { id: VerticalGuidePattern; label: string; sub: string }[] = [
  { id: 'none', label: 'なし', sub: 'OFF' },
  { id: 'center', label: '左右中心', sub: '' },
  { id: 'thirds', label: '3分割', sub: '偏・中・旁' },
  { id: 'quarters', label: '4分割', sub: '1/4, 1/2, 3/4' },
  { id: 'eighths', label: '8分割', sub: '精密配置' },
];

interface GuidesAndGridModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLight: boolean;
  gridSettings: GridSettings;
  onChangeGridSettings?: (updater: (prev: GridSettings) => GridSettings) => void;
  upm?: number;
  isOutlineMode: boolean;
  setOutlineOnly: (val: boolean) => void;
  nodeStyle: 'full' | 'clean' | 'selected_only';
  setNodeStyle: React.Dispatch<React.SetStateAction<'full' | 'clean' | 'selected_only'>> | ((val: 'full' | 'clean' | 'selected_only') => void);
  showNodes: boolean;
  setShowNodes: React.Dispatch<React.SetStateAction<boolean>>;
  customGuidelines: CustomGuideline[];
  setCustomGuidelines: React.Dispatch<React.SetStateAction<CustomGuideline[]>> | ((val: CustomGuideline[]) => void);
  lockGuidelines: boolean;
  setLockGuidelines: (val: boolean) => void;
  showCanvasToast: (msg: string) => void;
}

export const GuidesAndGridModal: React.FC<GuidesAndGridModalProps> = React.memo(({
  isOpen,
  onClose,
  isLight,
  gridSettings,
  onChangeGridSettings,
  upm = 1000,
  isOutlineMode,
  setOutlineOnly,
  nodeStyle,
  setNodeStyle,
  showNodes,
  setShowNodes,
  customGuidelines,
  setCustomGuidelines,
  lockGuidelines,
  setLockGuidelines,
  showCanvasToast,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-4 bg-black/60 animate-fadeIn">
      <div className="fixed inset-0" onClick={onClose} />
      <div
        className={`relative z-10 w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-4 sm:p-5 pb-28 sm:pb-5 border-t sm:border shadow-2xl max-h-[85vh] overflow-y-auto ${
          isLight
            ? 'bg-white border-[#c8ded3] text-stone-800'
            : 'bg-[#151f19] border-[#25362b] text-emerald-100'
        }`}
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px) + 80px, 20px)' }}
      >
        <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800 mb-3">
          <div className="font-bold text-sm text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <Grid className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>ガイド枠・方眼グリッド設定</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3.5 text-xs">
          {/* Square Grid & Snapping with Intuitive Slider */}
          <div
            className={`p-3 rounded-xl border transition-all ${
              gridSettings.showGrid
                ? isLight
                  ? 'bg-emerald-50/70 border-emerald-300'
                  : 'bg-emerald-950/30 border-emerald-800/80'
                : isLight
                ? 'bg-stone-50/80 border-stone-200'
                : 'bg-stone-900/40 border-stone-800'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="font-bold text-stone-800 dark:text-stone-100 flex items-center gap-1.5 text-[12.5px]">
                <Grid className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>方眼グリッド & 吸着</span>
              </div>
              {/* Alt Shortcut Info Badge */}
              <div
                className="flex items-center gap-1 text-[10px] text-stone-600 dark:text-stone-300 bg-white/80 dark:bg-stone-800/80 px-2 py-0.5 rounded-md border border-stone-200 dark:border-stone-700"
                title="キーボードショートカット: Gキーで表示切替、Altキーを押しながら +/- でサイズ微調整"
              >
                <kbd className="font-mono font-bold bg-stone-200 dark:bg-stone-700 px-1 rounded text-[9px]">G</kbd>
                <span>表示切替</span>
                <span className="text-stone-300 dark:text-stone-600">/</span>
                <kbd className="font-mono font-bold bg-stone-200 dark:bg-stone-700 px-1 rounded text-[9px]">S</kbd>
                <span>吸着</span>
              </div>
            </div>

            {/* Toggles: Grid Line & Snap */}
            <div className="grid grid-cols-2 gap-2 mb-2.5">
              <button
                type="button"
                onClick={() =>
                  onChangeGridSettings?.((prev) => ({
                    ...prev,
                    showGrid: !prev.showGrid,
                  }))
                }
                className={`py-2 px-2.5 rounded-lg border font-bold flex items-center justify-between transition-colors ${
                  gridSettings.showGrid
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white dark:bg-stone-850 border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-300'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Grid className="w-3.5 h-3.5" />
                  <span>方眼線を表示</span>
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/20 font-mono font-bold">
                  {gridSettings.showGrid ? 'ON' : 'OFF'}
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  onChangeGridSettings?.((prev) => ({
                    ...prev,
                    snapToGrid: !prev.snapToGrid,
                  }))
                }
                className={`py-2 px-2.5 rounded-lg border font-bold flex items-center justify-between transition-colors ${
                  gridSettings.snapToGrid
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white dark:bg-stone-850 border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-300'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Magnet className="w-3.5 h-3.5" />
                  <span>グリッド吸着</span>
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/20 font-mono font-bold">
                  {gridSettings.snapToGrid ? 'ON' : 'OFF'}
                </span>
              </button>
            </div>

            {/* Intuitive Grid Size Slider & Direct Input Controls */}
            <div className="space-y-2 p-2.5 rounded-lg bg-white/90 dark:bg-stone-900/90 border border-stone-200 dark:border-stone-800">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[11px] text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                  <span>グリッドサイズ (間隔)</span>
                  {!gridSettings.showGrid && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-normal">
                      (グリッドONで反映)
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      onChangeGridSettings?.((prev) => {
                        const current = prev.gridSize || 50;
                        const step = current > 100 ? 10 : current <= 20 ? 2 : 5;
                        return { ...prev, gridSize: Math.max(5, current - step) };
                      })
                    }
                    className="w-6 h-6 rounded flex items-center justify-center border border-stone-300 dark:border-stone-700 hover:bg-stone-200 dark:hover:bg-stone-800 text-xs font-bold transition-colors select-none"
                    title="サイズ縮小 (-)"
                  >
                    -
                  </button>
                  <div className="flex items-center bg-stone-100 dark:bg-stone-800 rounded px-1.5 py-0.5 border border-stone-300 dark:border-stone-700">
                    <input
                      type="number"
                      min="5"
                      max="250"
                      value={gridSettings.gridSize || 50}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) {
                          onChangeGridSettings?.((prev) => ({
                            ...prev,
                            gridSize: Math.max(5, Math.min(250, val)),
                          }));
                        }
                      }}
                      className="w-10 bg-transparent text-center font-mono font-bold text-emerald-700 dark:text-emerald-300 text-xs focus:outline-hidden"
                    />
                    <span className="text-[10px] font-mono text-stone-500 font-bold">px</span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onChangeGridSettings?.((prev) => {
                        const current = prev.gridSize || 50;
                        const step = current >= 100 ? 10 : current < 20 ? 2 : 5;
                        return { ...prev, gridSize: Math.min(250, current + step) };
                      })
                    }
                    className="w-6 h-6 rounded flex items-center justify-center border border-stone-300 dark:border-stone-700 hover:bg-stone-200 dark:hover:bg-stone-800 text-xs font-bold transition-colors select-none"
                    title="サイズ拡大 (+)"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Range Slider */}
              <div className="flex items-center gap-2 pt-0.5">
                <span className="text-[10px] font-mono text-stone-400 font-bold">5px</span>
                <input
                  type="range"
                  min="5"
                  max="200"
                  step="5"
                  value={gridSettings.gridSize || 50}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    onChangeGridSettings?.((prev) => ({
                      ...prev,
                      gridSize: val,
                    }));
                  }}
                  className="flex-1 h-2 bg-stone-200 dark:bg-stone-700 rounded-lg appearance-none cursor-pointer accent-emerald-600 focus:outline-hidden"
                  title={`グリッドサイズ: ${gridSettings.gridSize || 50}px`}
                />
                <span className="text-[10px] font-mono text-stone-400 font-bold">200px</span>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-1 pt-1 overflow-x-auto no-scrollbar">
                <span className="text-[10px] text-stone-500 dark:text-stone-400 font-bold shrink-0 mr-0.5">プリセット:</span>
                {[
                  { label: '10px (極小)', size: 10 },
                  { label: '25px (細)', size: 25 },
                  { label: '50px (標準)', size: 50 },
                  { label: '100px (中)', size: 100 },
                  { label: '128px (2進)', size: 128 },
                ].map((preset) => (
                  <button
                    key={preset.size}
                    type="button"
                    onClick={() =>
                      onChangeGridSettings?.((prev) => ({
                        ...prev,
                        gridSize: preset.size,
                      }))
                    }
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors shrink-0 ${
                      (gridSettings.gridSize || 50) === preset.size
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-stone-100 dark:bg-stone-800 border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid & Guide Lines Opacity / Darkness Slider */}
            <div className="pt-2 border-t border-stone-200/80 dark:border-stone-800/80">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-stone-600 dark:text-stone-300">
                  グリッド・ガイド線の濃さ (透明度)
                </span>
                <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {gridSettings.gridOpacity ?? 30}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-stone-400 font-bold">10%</span>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={gridSettings.gridOpacity ?? 30}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    onChangeGridSettings?.((prev) => ({
                      ...prev,
                      gridOpacity: val,
                    }));
                  }}
                  className="flex-1 h-1.5 bg-stone-200 dark:bg-stone-700 rounded-lg appearance-none cursor-pointer accent-emerald-600 focus:outline-hidden"
                />
                <span className="text-[10px] text-stone-400 font-bold">100%</span>
              </div>
              {/* Opacity Presets */}
              <div className="flex items-center gap-1.5 mt-1.5">
                {[
                  { label: '極薄 (15%)', val: 15 },
                  { label: '淡め (25%)', val: 25 },
                  { label: '標準 (35%)', val: 35 },
                  { label: 'くっきり (60%)', val: 60 },
                  { label: '濃いめ (85%)', val: 85 },
                ].map((p) => (
                  <button
                    key={p.val}
                    type="button"
                    onClick={() =>
                      onChangeGridSettings?.((prev) => ({
                        ...prev,
                        gridOpacity: p.val,
                      }))
                    }
                    className={`flex-1 py-1 rounded text-[10px] font-bold border transition-colors ${
                      (gridSettings.gridOpacity ?? 30) === p.val
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-stone-100 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Japanese Guide Pattern */}
          <div>
            <div className="font-bold text-stone-500 dark:text-stone-400 mb-1.5 flex items-center justify-between">
              <span>和文目安ガイド (書道・作字格)</span>
              <span className="text-[10px] text-stone-400 font-normal">正方形フレーム内</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {JAPANESE_GUIDE_OPTIONS.map((g) => (
                <button
                  key={g.id}
                  onClick={() =>
                    onChangeGridSettings?.((prev) => ({
                      ...prev,
                      japaneseGuide: g.id,
                    }))
                  }
                  className={`py-1.5 px-1 rounded-lg border text-center font-bold transition-all ${
                    (gridSettings.japaneseGuide || 'tian') === g.id
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                  }`}
                  title={`${g.label} (${g.sub})`}
                >
                  <div className="text-xs">{g.label}</div>
                  <div className="text-[9px] opacity-75 font-normal">{g.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Dedicated Vertical Guideline System (縦グリッド・縦分割線) */}
          <div>
            <div className="font-bold text-stone-500 dark:text-stone-400 mb-1.5 flex items-center justify-between">
              <span className="text-purple-700 dark:text-purple-400">縦グリッド・縦分割ガイド</span>
              <span className="text-[10px] text-stone-400 font-normal">偏・旁・ステム配置</span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {VERTICAL_GUIDE_OPTIONS.map((vg) => (
                <button
                  key={vg.id}
                  onClick={() =>
                    onChangeGridSettings?.((prev) => ({
                      ...prev,
                      verticalGuide: vg.id,
                    }))
                  }
                  className={`py-1.5 px-1 rounded-lg border text-center font-bold transition-all ${
                    (gridSettings.verticalGuide || 'none') === vg.id
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                  }`}
                  title={`縦ガイド: ${vg.label} (${vg.sub})`}
                >
                  <div className="text-xs">{vg.label}</div>
                  <div className="text-[9px] opacity-75 font-normal">
                    {vg.id === 'center' ? `X=${upm / 2}` : vg.sub}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Kanji / Kana Frames & Center Axis */}
          <div>
            <div className="font-bold text-stone-500 dark:text-stone-400 mb-1.5">字面枠・中心軸表示</div>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() =>
                  onChangeGridSettings?.((prev) => ({
                    ...prev,
                    showBodyFrame: !prev.showBodyFrame,
                  }))
                }
                className={`p-1.5 rounded-lg border font-bold flex flex-col items-center justify-center text-center transition-colors ${
                  gridSettings.showBodyFrame !== false
                    ? 'bg-emerald-100 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200'
                    : 'bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-500'
                }`}
              >
                <span className="text-xs">漢字枠 (85%)</span>
                <span className="font-mono text-[9px] mt-0.5 px-1 rounded bg-black/10 dark:bg-white/10">
                  {gridSettings.showBodyFrame !== false ? 'ON' : 'OFF'}
                </span>
              </button>
              <button
                onClick={() =>
                  onChangeGridSettings?.((prev) => ({
                    ...prev,
                    showKanaFrame: !prev.showKanaFrame,
                  }))
                }
                className={`p-1.5 rounded-lg border font-bold flex flex-col items-center justify-center text-center transition-colors ${
                  gridSettings.showKanaFrame
                    ? 'bg-amber-100 dark:bg-amber-950 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200'
                    : 'bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-500'
                }`}
              >
                <span className="text-xs">仮名枠 (78%)</span>
                <span className="font-mono text-[9px] mt-0.5 px-1 rounded bg-black/10 dark:bg-white/10">
                  {gridSettings.showKanaFrame ? 'ON' : 'OFF'}
                </span>
              </button>
              <button
                onClick={() =>
                  onChangeGridSettings?.((prev) => ({
                    ...prev,
                    showVerticalCenter: prev.showVerticalCenter === false ? true : false,
                  }))
                }
                className={`p-1.5 rounded-lg border font-bold flex flex-col items-center justify-center text-center transition-colors ${
                  gridSettings.showVerticalCenter !== false
                    ? 'bg-purple-100 dark:bg-purple-950 border-purple-300 dark:border-purple-700 text-purple-900 dark:text-purple-200'
                    : 'bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-500'
                }`}
                title={`メトリクス左右中心線 (X=${upm / 2})`}
              >
                <span className="text-xs">左右中心線</span>
                <span className="font-mono text-[9px] mt-0.5 px-1 rounded bg-black/10 dark:bg-white/10">
                  {gridSettings.showVerticalCenter !== false ? 'ON' : 'OFF'}
                </span>
              </button>
            </div>
          </div>

          {/* Outline Mode vs Filled Mode Appearance */}
          <div>
            <div className="font-bold text-stone-500 dark:text-stone-400 mb-1.5 flex items-center justify-between">
              <span>文字の描画表示モード</span>
              <span className="text-[10px] font-mono text-stone-400">Shift+O / Alt+O</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setOutlineOnly(false);
                  showCanvasToast('塗りつぶし表示モードに切り替えました');
                }}
                className={`p-2 rounded-lg border text-center font-bold transition-all flex items-center justify-center gap-1.5 ${
                  !isOutlineMode
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300'
                }`}
              >
                <div className="w-3 h-3 rounded-xs bg-current border border-current" />
                <span>塗りつぶし</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setOutlineOnly(true);
                  showCanvasToast('輪郭表示モード（ワイヤーフレーム）を有効にしました');
                }}
                className={`p-2 rounded-lg border text-center font-bold transition-all flex items-center justify-center gap-1.5 ${
                  isOutlineMode
                    ? 'bg-sky-600 text-white border-sky-600'
                    : 'bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300'
                }`}
              >
                <Square className="w-3.5 h-3.5 stroke-2 fill-none" />
                <span>輪郭のみ</span>
              </button>
            </div>
          </div>

          {/* Node Points Appearance */}
          <div>
            <div className="font-bold text-stone-500 dark:text-stone-400 mb-1.5">パス頂点（ノード）表示</div>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => {
                  setNodeStyle('clean');
                  setShowNodes(true);
                }}
                className={`p-2 rounded-lg border text-center font-bold transition-all ${
                  showNodes && nodeStyle === 'clean'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300'
                }`}
              >
                形状優先
              </button>
              <button
                onClick={() => {
                  setNodeStyle('selected_only');
                  setShowNodes(true);
                }}
                className={`p-2 rounded-lg border text-center font-bold transition-all ${
                  showNodes && nodeStyle === 'selected_only'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300'
                }`}
              >
                選択のみ
              </button>
              <button
                onClick={() => setShowNodes((prev) => !prev)}
                className={`p-2 rounded-lg border text-center font-bold transition-all ${
                  !showNodes
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300'
                }`}
              >
                {showNodes ? '全隠す' : '非表示中'}
              </button>
            </div>
          </div>

          {/* Custom Guidelines Lock & Clear if any exist */}
          {customGuidelines.length > 0 && (
            <div>
              <div className="font-bold text-stone-500 dark:text-stone-400 mb-1.5">カスタムガイド線 ({customGuidelines.length}本)</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    const next = !lockGuidelines;
                    setLockGuidelines(next);
                    showCanvasToast(next ? 'ガイド線を固定しました' : 'ガイド線ロック解除');
                  }}
                  className={`p-2 rounded-lg border font-bold flex items-center justify-between ${
                    lockGuidelines
                      ? 'bg-stone-100 dark:bg-stone-900 border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300'
                      : 'bg-amber-100 dark:bg-amber-950 border-amber-400 text-amber-900 dark:text-amber-200'
                  }`}
                >
                  <span>{lockGuidelines ? 'ガイド固定中' : '移動可能'}</span>
                  <span className="text-[10px]">{lockGuidelines ? '固定' : '解除'}</span>
                </button>
                <button
                  onClick={() => {
                    setCustomGuidelines([]);
                    showCanvasToast('カスタムガイド線を消去しました');
                    onClose();
                  }}
                  className="p-2 rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ガイド全消去</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
