import React from 'react';
import { AlignLeft, AlignCenter, AlignRight, AlignJustify } from 'lucide-react';
import { SAMPLE_PRESETS } from './SamplePresets';
import { TestPreviewState } from './hooks/useTestPreviewState';

interface TopControlsBarProps {
  state: TestPreviewState;
}

export const TopControlsBar: React.FC<TopControlsBarProps> = ({ state }) => {
  const {
    testText,
    setTestText,
    writingMode,
    setWritingMode,
    fontSize,
    setFontSize,
    lineHeight,
    setLineHeight,
    letterSpacing,
    setLetterSpacing,
    textAlign,
    setTextAlign,
    useTsume,
    setUseTsume,
    showSpaceMarkers,
    setShowSpaceMarkers,
    showGenkoGrid,
    setShowGenkoGrid,
    showCharBoxes,
    setShowCharBoxes,
    showNotebookGuides,
    setShowNotebookGuides,
    autoBalanceMargins,
    setAutoBalanceMargins,
    fontScaleMultiplier,
    setFontScaleMultiplier,
    isWaterfall,
    setIsWaterfall,
    isPixelProject,
    isShapedText,
    setIsShapedText,
    isTopControlsCollapsed,
    setIsTopControlsCollapsed,
    isLight,
  } = state;

  if (isTopControlsCollapsed) {
    return (
      <div
        className={`px-4 py-2 border-b flex items-center justify-between shrink-0 text-xs ${
          isLight ? 'bg-white border-[#d8e6df]' : 'bg-[#16201a] border-[#25362b]'
        }`}
      >
        <div className="flex items-center space-x-4">
          <span className={`text-[11px] font-bold ${isLight ? 'text-emerald-950' : 'text-emerald-200'}`}>
            {writingMode === 'vertical' ? '縦組み' : '横組み'} ({fontSize}px)
          </span>
          <div className="flex items-center space-x-1.5">
            <span className="text-[11px] text-stone-500">サイズ:</span>
            <input
              type="range"
              min={12}
              max={96}
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-20 accent-emerald-700"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className={`text-[11px] max-sm:hidden ${isLight ? 'text-stone-500' : 'text-emerald-400'}`}>
            （文字プレビュー集中モード中）
          </span>
          <button
            type="button"
            onClick={() => setIsTopControlsCollapsed(false)}
            className="px-2 py-1 rounded border text-xs font-semibold bg-emerald-700 text-white cursor-pointer"
          >
            設定を展開
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Presets selection */}
      <div
        className={`px-3 py-1.5 border-b flex items-center space-x-1.5 overflow-x-auto text-xs shrink-0 ${
          isLight ? 'bg-[#f4f9f6] border-[#d8e6df]' : 'bg-[#121a14] border-[#25362b]'
        }`}
      >
        <span className={`text-[11px] font-semibold shrink-0 ${isLight ? 'text-stone-500' : 'text-emerald-400'}`}>
          例文:
        </span>
        {SAMPLE_PRESETS.map((preset, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              setTestText(preset.text);
              setWritingMode(preset.mode);
            }}
            className={`px-2 py-0.5 rounded text-[11px] whitespace-nowrap transition-colors border cursor-pointer ${
              testText === preset.text
                ? isLight
                  ? 'bg-emerald-800 text-white border-emerald-900 font-bold'
                  : 'bg-emerald-500 text-stone-950 border-emerald-400 font-bold'
                : isLight
                ? 'bg-white border-[#c8ded3] text-stone-700 hover:bg-emerald-50'
                : 'bg-[#18231c] border-[#25362b] text-emerald-300 hover:bg-[#202d24]'
            }`}
          >
            {preset.name}
          </button>
        ))}
      </div>

      {/* Toolbar Parameters */}
      <div
        className={`p-2 border-b flex flex-wrap items-center justify-between gap-2.5 text-xs shrink-0 ${
          isLight ? 'bg-white border-[#d8e6df]' : 'bg-[#16201a] border-[#25362b]'
        }`}
      >
        {/* Writing Mode Selector */}
        <div className="flex items-center space-x-1">
          <span className={`text-[11px] font-semibold ${isLight ? 'text-stone-600' : 'text-emerald-300'}`}>
            組方向:
          </span>
          <div
            className={`flex items-center p-0.5 rounded-md border ${
              isLight ? 'bg-[#edf5f0] border-[#c8ded3]' : 'bg-[#101712] border-[#25362b]'
            }`}
          >
            <button
              type="button"
              onClick={() => setWritingMode('horizontal')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                writingMode === 'horizontal'
                  ? isLight
                    ? 'bg-emerald-800 text-white'
                    : 'bg-emerald-500 text-stone-950'
                  : isLight
                  ? 'text-stone-600'
                  : 'text-emerald-400'
              }`}
            >
              横組み
            </button>
            <button
              type="button"
              onClick={() => setWritingMode('vertical')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                writingMode === 'vertical'
                  ? isLight
                    ? 'bg-emerald-800 text-white'
                    : 'bg-emerald-500 text-stone-950'
                  : isLight
                  ? 'text-stone-600'
                  : 'text-emerald-400'
              }`}
            >
              縦組み
            </button>
          </div>
        </div>

        {/* Size, Line-height, Letter-spacing */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center space-x-1">
            <span className={`text-[11px] ${isLight ? 'text-stone-600' : 'text-emerald-400'}`}>サイズ:</span>
            <input
              type="range"
              min={12}
              max={96}
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-16 accent-emerald-700"
            />
            <span className="font-mono w-6 text-[11px]">{fontSize}</span>
          </div>

          <div className="flex items-center space-x-1">
            <span className={`text-[11px] ${isLight ? 'text-stone-600' : 'text-emerald-400'}`}>行送り:</span>
            <input
              type="range"
              min={1.0}
              max={3.5}
              step={0.1}
              value={lineHeight}
              onChange={(e) => setLineHeight(Number(e.target.value))}
              className="w-14 accent-emerald-700"
            />
            <span className="font-mono w-6 text-[11px]">{lineHeight.toFixed(1)}</span>
          </div>

          <div className="flex items-center space-x-1">
            <span className={`text-[11px] ${isLight ? 'text-stone-600' : 'text-emerald-400'}`}>字間:</span>
            <input
              type="range"
              min={-0.1}
              max={0.8}
              step={0.02}
              value={letterSpacing}
              onChange={(e) => setLetterSpacing(Number(e.target.value))}
              className="w-14 accent-emerald-700"
            />
            <span className="font-mono w-8 text-[11px]">
              {letterSpacing >= 0 ? `+${letterSpacing.toFixed(2)}` : letterSpacing.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Text Align */}
        <div
          className={`flex items-center p-0.5 rounded border ${
            isLight ? 'bg-[#edf5f0] border-[#c8ded3]' : 'bg-[#101712] border-[#25362b]'
          }`}
        >
          <button
            type="button"
            onClick={() => setTextAlign('left')}
            className={`p-1 rounded ${textAlign === 'left' ? (isLight ? 'bg-emerald-800 text-white' : 'bg-emerald-500 text-stone-950 font-bold') : ''}`}
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setTextAlign('center')}
            className={`p-1 rounded ${textAlign === 'center' ? (isLight ? 'bg-emerald-800 text-white' : 'bg-emerald-500 text-stone-950 font-bold') : ''}`}
          >
            <AlignCenter className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setTextAlign('right')}
            className={`p-1 rounded ${textAlign === 'right' ? (isLight ? 'bg-emerald-800 text-white' : 'bg-emerald-500 text-stone-950 font-bold') : ''}`}
          >
            <AlignRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setTextAlign('justify')}
            className={`p-1 rounded ${textAlign === 'justify' ? (isLight ? 'bg-emerald-800 text-white' : 'bg-emerald-500 text-stone-950 font-bold') : ''}`}
          >
            <AlignJustify className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Toggles */}
        {(() => {
          const inactiveToggleCls = isLight
            ? 'bg-white border-[#c8ded3] text-stone-600 hover:bg-emerald-50'
            : 'bg-[#18231c] border-[#25362b] text-emerald-300 hover:bg-[#202d24]';
          return (
            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                disabled={isPixelProject}
                onClick={() => setFontScaleMultiplier(fontScaleMultiplier === 1.35 ? 1.0 : 1.35)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                  isPixelProject
                    ? 'opacity-60 cursor-not-allowed'
                    : 'cursor-pointer'
                } ${
                  !isPixelProject && fontScaleMultiplier === 1.35
                    ? isLight
                      ? 'bg-emerald-800 text-white border-emerald-900'
                      : 'bg-emerald-500 text-stone-950 border-emerald-400'
                    : inactiveToggleCls
                }`}
                title={
                  isPixelProject
                    ? 'ピクセルプロジェクトではコンパイル時に100%に固定されます'
                    : '和文サイズ最適化 (135% / 100%)'
                }
              >
                最適化 {isPixelProject ? '100%固定' : fontScaleMultiplier === 1.35 ? '135%' : '100%'}
              </button>
              <button
                type="button"
                disabled={isPixelProject}
                onClick={() => setAutoBalanceMargins(!autoBalanceMargins)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                  isPixelProject
                    ? 'opacity-60 cursor-not-allowed'
                    : 'cursor-pointer'
                } ${
                  !isPixelProject && autoBalanceMargins
                    ? 'bg-amber-600 text-white border-amber-700'
                    : isLight
                    ? 'bg-emerald-800 text-white border-emerald-900'
                    : 'bg-emerald-500 text-stone-950 border-emerald-400'
                }`}
                title={
                  isPixelProject
                    ? 'ピクセルプロジェクトではコンパイル時に配置補正なし（ガイド位置優先）に固定されます'
                    : '配置補正: 左右センタリング / ガイド位置優先'
                }
              >
                {isPixelProject ? '位置優先(固定)' : autoBalanceMargins ? 'センタリング' : '位置優先'}
              </button>
              <button
                type="button"
                onClick={() => setUseTsume(!useTsume)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                  useTsume
                    ? isLight
                      ? 'bg-emerald-800 text-white border-emerald-900'
                      : 'bg-emerald-500 text-stone-950 border-emerald-400'
                    : inactiveToggleCls
                }`}
                title="OpenType palt/pkna 機能による和文詰め組み切替"
              >
                {useTsume ? '詰め組み' : 'ベタ組'}
              </button>
              <button
                type="button"
                onClick={() => setShowCharBoxes(!showCharBoxes)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border transition-colors cursor-pointer ${
                  showCharBoxes
                    ? isLight
                      ? 'bg-emerald-800 text-white border-emerald-900'
                      : 'bg-emerald-500 text-stone-950 border-emerald-400'
                    : inactiveToggleCls
                }`}
                title="1em仮想ボディ外枠・中心十字線"
              >
                仮想枠
              </button>
              <button
                type="button"
                onClick={() => setShowNotebookGuides(!showNotebookGuides)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border transition-colors cursor-pointer ${
                  showNotebookGuides
                    ? isLight
                      ? 'bg-emerald-800 text-white border-emerald-900'
                      : 'bg-emerald-500 text-stone-950 border-emerald-400'
                    : inactiveToggleCls
                }`}
                title="ノート風ガイド罫線"
              >
                ノートガイド
              </button>
              <button
                type="button"
                onClick={() => setShowGenkoGrid(!showGenkoGrid)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border transition-colors cursor-pointer ${
                  showGenkoGrid
                    ? isLight
                      ? 'bg-emerald-800 text-white border-emerald-900'
                      : 'bg-emerald-500 text-stone-950 border-emerald-400'
                    : inactiveToggleCls
                }`}
                title="原稿用紙マス目・方眼"
              >
                原稿用紙
              </button>
              <button
                type="button"
                onClick={() => setShowSpaceMarkers(!showSpaceMarkers)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border transition-colors cursor-pointer ${
                  showSpaceMarkers ? 'bg-amber-600 text-white border-amber-700' : inactiveToggleCls
                }`}
                title="空白記号ハイライト (全角/半角)"
              >
                空白
              </button>
              <button
                type="button"
                onClick={() => setIsWaterfall(!isWaterfall)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border transition-colors cursor-pointer ${
                  isWaterfall
                    ? isLight
                      ? 'bg-emerald-800 text-white border-emerald-900'
                      : 'bg-emerald-500 text-stone-950 border-emerald-400'
                    : inactiveToggleCls
                }`}
                title="段階サイズ比較 (16px〜80px)"
              >
                段階
              </button>
              <button
                type="button"
                onClick={() => setIsShapedText(!isShapedText)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border transition-colors cursor-pointer ${
                  isShapedText
                    ? isLight
                      ? 'bg-emerald-800 text-white border-emerald-900'
                      : 'bg-emerald-500 text-stone-950 border-emerald-400'
                    : inactiveToggleCls
                }`}
                title="1行を1つのテキストとして表示し、カーニングと合字が反映されるか確認します。ONの間は文字のクリック選択とホバー表示はできません"
              >
                整形表示
              </button>
            </div>
          );
        })()}
      </div>

      {/* Text Input Area */}
      <div
        className={`p-2 border-b shrink-0 ${
          isLight ? 'bg-[#f4f9f6] border-[#d8e6df]' : 'bg-[#101712] border-[#25362b]'
        }`}
      >
        <textarea
          rows={2}
          value={testText}
          onChange={(e) => setTestText(e.target.value)}
          placeholder="ここにテストしたい文章を入力..."
          className={`w-full border rounded-md p-1.5 text-xs focus:outline-none select-text transition-colors ${
            isLight
              ? 'bg-white border-[#c8ded3] text-stone-800 focus:border-emerald-700'
              : 'bg-[#16201a] border-[#2d4034] text-emerald-100 focus:border-emerald-500'
          }`}
        />
      </div>
    </>
  );
};
