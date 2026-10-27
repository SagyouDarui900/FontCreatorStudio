import React from 'react';
import {
  FileText,
  Sliders,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Eye,
} from 'lucide-react';
import { SAMPLE_PRESETS } from './SamplePresets';
import { TestPreviewState } from './hooks/useTestPreviewState';

interface TextControlsPanelProps {
  state: TestPreviewState;
}

export const TextControlsPanel: React.FC<TextControlsPanelProps> = ({ state }) => {
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
    isLight,
  } = state;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain custom-scrollbar pb-12 md:pb-0">
      {/* 1. Text Input & Presets */}
      <div className="p-3 sm:p-3.5 border-b border-inherit">
        <div className="flex items-center justify-between mb-1.5">
          <label className={`text-xs font-bold flex items-center space-x-1 ${isLight ? 'text-emerald-950' : 'text-emerald-200'}`}>
            <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>テスト文章</span>
          </label>
          <div className="flex items-center space-x-2">
            <span className={`text-[10px] font-mono ${isLight ? 'text-stone-500' : 'text-emerald-500'}`}>
              {testText.length} 文字
            </span>
            {testText && (
              <button
                type="button"
                onClick={() => setTestText('')}
                className="text-[10px] text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 underline cursor-pointer"
                title="テスト文章をすべて消去"
              >
                消去
              </button>
            )}
          </div>
        </div>

        {/* Preset Quick Horizontal Chips */}
        <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar pb-1 mb-2">
          {SAMPLE_PRESETS.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              title={preset.name}
              onClick={() => {
                setTestText(preset.text);
                setWritingMode(preset.mode);
              }}
              className={`px-2 py-1 rounded text-[10.5px] font-medium shrink-0 border transition-all whitespace-nowrap cursor-pointer ${
                testText === preset.text
                  ? isLight
                    ? 'bg-emerald-700 text-white border-emerald-800 font-bold'
                    : 'bg-emerald-500 text-stone-950 border-emerald-400 font-bold'
                  : isLight
                  ? 'bg-white border-stone-200 text-stone-600 hover:bg-emerald-50'
                  : 'bg-[#18231c] border-[#2b3d30] text-emerald-300 hover:bg-[#202d24]'
              }`}
            >
              {preset.name.replace(/【.*?】/, '').split(' ')[0] || preset.name}
            </button>
          ))}
        </div>

        {/* Preset Quick Select Dropdown */}
        <div className="mb-2">
          <select
            onChange={(e) => {
              const idx = Number(e.target.value);
              if (!isNaN(idx) && SAMPLE_PRESETS[idx]) {
                setTestText(SAMPLE_PRESETS[idx].text);
                setWritingMode(SAMPLE_PRESETS[idx].mode);
              }
            }}
            value={SAMPLE_PRESETS.findIndex((p) => p.text === testText)}
            className={`w-full text-xs p-2 rounded-lg border ${
              isLight
                ? 'bg-white border-[#c8ded3] text-stone-700'
                : 'bg-[#18231c] border-[#2b3d30] text-emerald-200'
            }`}
          >
            <option value={-1}>-- 例文プリセットを選択 --</option>
            {SAMPLE_PRESETS.map((preset, idx) => (
              <option key={idx} value={idx}>
                {preset.name}
              </option>
            ))}
          </select>
        </div>

        <textarea
          rows={3}
          value={testText}
          onChange={(e) => setTestText(e.target.value)}
          placeholder="ここにテストしたい文章を入力..."
          className={`w-full border rounded-lg p-2.5 text-xs focus:outline-none select-text transition-colors leading-relaxed ${
            isLight
              ? 'bg-white border-[#c8ded3] text-stone-800 focus:border-emerald-700'
              : 'bg-[#18231c] border-[#2d4034] text-emerald-100 focus:border-emerald-500'
          }`}
        />
      </div>

      {/* 2. Typesetting Parameters */}
      <div className="p-3 sm:p-3.5 border-b border-inherit flex flex-col space-y-3">
        <div className={`text-xs font-bold flex items-center space-x-1 ${isLight ? 'text-emerald-950' : 'text-emerald-200'}`}>
          <Sliders className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>組版パラメータ</span>
        </div>

        {/* Writing Mode (横組み / 縦組み) */}
        <div>
          <span className={`block text-[11px] font-semibold mb-1 ${isLight ? 'text-stone-600' : 'text-emerald-300'}`}>
            組方向:
          </span>
          <div
            className={`grid grid-cols-2 p-0.5 rounded-lg border ${
              isLight ? 'bg-[#edf5f0] border-[#c8ded3]' : 'bg-[#101712] border-[#25362b]'
            }`}
          >
            <button
              type="button"
              onClick={() => setWritingMode('horizontal')}
              className={`py-1.5 rounded-md text-xs font-bold transition-all text-center ${
                writingMode === 'horizontal'
                  ? isLight
                    ? 'bg-emerald-800 text-white'
                    : 'bg-emerald-500 text-stone-950'
                  : isLight
                  ? 'text-stone-600 hover:text-stone-900'
                  : 'text-emerald-400 hover:text-emerald-200'
              }`}
            >
              横組み (横書き)
            </button>
            <button
              type="button"
              onClick={() => setWritingMode('vertical')}
              className={`py-1.5 rounded-md text-xs font-bold transition-all text-center ${
                writingMode === 'vertical'
                  ? isLight
                    ? 'bg-emerald-800 text-white'
                    : 'bg-emerald-500 text-stone-950'
                  : isLight
                  ? 'text-stone-600 hover:text-stone-900'
                  : 'text-emerald-400 hover:text-emerald-200'
              }`}
            >
              縦組み (縦書き)
            </button>
          </div>
        </div>

        {/* Font Size */}
        <div>
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className={isLight ? 'text-stone-600' : 'text-emerald-400'}>サイズ:</span>
            <span className={`font-mono font-bold ${isLight ? 'text-emerald-950' : 'text-emerald-300'}`}>
              {fontSize} px
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setFontSize((prev) => Math.max(12, prev - 2))}
              className="h-7 w-7 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-950 shrink-0 inline-flex items-center justify-center"
            >
              -
            </button>
            <input
              type="range"
              min={14}
              max={96}
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="flex-1 accent-emerald-700 h-3"
            />
            <button
              type="button"
              onClick={() => setFontSize((prev) => Math.min(96, prev + 2))}
              className="h-7 w-7 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-950 shrink-0 inline-flex items-center justify-center"
            >
              +
            </button>
          </div>
        </div>

        {/* Line Height */}
        <div>
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className={isLight ? 'text-stone-600' : 'text-emerald-400'}>行送り:</span>
            <span className={`font-mono font-bold ${isLight ? 'text-emerald-950' : 'text-emerald-300'}`}>
              {lineHeight.toFixed(1)}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setLineHeight((prev) => Math.max(1.0, Math.round((prev - 0.1) * 10) / 10))}
              className="h-7 w-7 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-950 shrink-0 inline-flex items-center justify-center"
            >
              -
            </button>
            <input
              type="range"
              min={1.2}
              max={3.0}
              step={0.1}
              value={lineHeight}
              onChange={(e) => setLineHeight(Number(e.target.value))}
              className="flex-1 accent-emerald-700 h-3"
            />
            <button
              type="button"
              onClick={() => setLineHeight((prev) => Math.min(3.5, Math.round((prev + 0.1) * 10) / 10))}
              className="h-7 w-7 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-950 shrink-0 inline-flex items-center justify-center"
            >
              +
            </button>
          </div>
        </div>

        {/* Letter Spacing */}
        <div>
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className={isLight ? 'text-stone-600' : 'text-emerald-400'}>字間:</span>
            <span className={`font-mono font-bold ${isLight ? 'text-emerald-950' : 'text-emerald-300'}`}>
              {letterSpacing >= 0 ? `+${letterSpacing.toFixed(2)}` : letterSpacing.toFixed(2)} em
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setLetterSpacing((prev) => Math.max(-0.1, Math.round((prev - 0.02) * 100) / 100))}
              className="h-7 w-7 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-950 shrink-0 inline-flex items-center justify-center"
            >
              -
            </button>
            <input
              type="range"
              min={-0.05}
              max={0.5}
              step={0.02}
              value={letterSpacing}
              onChange={(e) => setLetterSpacing(Number(e.target.value))}
              className="flex-1 accent-emerald-700 h-3"
            />
            <button
              type="button"
              onClick={() => setLetterSpacing((prev) => Math.min(0.8, Math.round((prev + 0.02) * 100) / 100))}
              className="h-7 w-7 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-950 shrink-0 inline-flex items-center justify-center"
            >
              +
            </button>
          </div>
        </div>

        {/* Text Align */}
        <div>
          <span className={`block text-[11px] font-semibold mb-1 ${isLight ? 'text-stone-600' : 'text-emerald-300'}`}>
            配置・揃え:
          </span>
          <div
            className={`grid grid-cols-4 p-0.5 rounded-lg border ${
              isLight ? 'bg-[#edf5f0] border-[#c8ded3]' : 'bg-[#101712] border-[#25362b]'
            }`}
          >
            <button
              type="button"
              onClick={() => setTextAlign('left')}
              title="左揃え / 天揃え"
              className={`p-1.5 rounded-md flex justify-center transition-colors ${
                textAlign === 'left'
                  ? isLight
                    ? 'bg-emerald-800 text-white'
                    : 'bg-emerald-500 text-stone-950 font-bold'
                  : isLight
                  ? 'text-stone-600 hover:text-stone-900'
                  : 'text-emerald-400 hover:text-emerald-200'
              }`}
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setTextAlign('center')}
              title="中央揃え"
              className={`p-1.5 rounded-md flex justify-center transition-colors ${
                textAlign === 'center'
                  ? isLight
                    ? 'bg-emerald-800 text-white'
                    : 'bg-emerald-500 text-stone-950 font-bold'
                  : isLight
                  ? 'text-stone-600 hover:text-stone-900'
                  : 'text-emerald-400 hover:text-emerald-200'
              }`}
            >
              <AlignCenter className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setTextAlign('right')}
              title="右揃え / 地揃え"
              className={`p-1.5 rounded-md flex justify-center transition-colors ${
                textAlign === 'right'
                  ? isLight
                    ? 'bg-emerald-800 text-white'
                    : 'bg-emerald-500 text-stone-950 font-bold'
                  : isLight
                  ? 'text-stone-600 hover:text-stone-900'
                  : 'text-emerald-400 hover:text-emerald-200'
              }`}
            >
              <AlignRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setTextAlign('justify')}
              title="均等割り付け"
              className={`p-1.5 rounded-md flex justify-center transition-colors ${
                textAlign === 'justify'
                  ? isLight
                    ? 'bg-emerald-800 text-white'
                    : 'bg-emerald-500 text-stone-950 font-bold'
                  : isLight
                  ? 'text-stone-600 hover:text-stone-900'
                  : 'text-emerald-400 hover:text-emerald-200'
              }`}
            >
              <AlignJustify className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Display & Optimization Toggles */}
      <div className="p-3 sm:p-3.5 flex flex-col space-y-2.5">
        <div className={`text-xs font-bold flex items-center justify-between ${isLight ? 'text-emerald-950' : 'text-emerald-200'}`}>
          <div className="flex items-center space-x-1">
            <Eye className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>表示・補正オプション</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5 text-xs">
          {/* 和文拡大 135% */}
          <button
            type="button"
            onClick={() => setFontScaleMultiplier(fontScaleMultiplier === 1.35 ? 1.0 : 1.35)}
            className={`p-2 h-14 rounded-lg border text-left transition-all flex flex-col justify-between cursor-pointer ${
              fontScaleMultiplier === 1.35
                ? isLight
                  ? 'bg-emerald-100/90 text-emerald-950 border-emerald-400 font-bold'
                  : 'bg-emerald-950 text-emerald-200 border-emerald-600 font-bold'
                : isLight
                ? 'bg-white border-[#d8e6df] text-stone-600 hover:bg-emerald-50'
                : 'bg-[#18231c] border-[#25362b] text-emerald-400 hover:bg-[#202d24]'
            }`}
            title="和文（漢字・仮名）を標準的な135%に拡大表示、または100%原寸キャンバス比率で表示"
          >
            <span className="text-[11px] truncate">和文サイズ最適化</span>
            <span className="text-[10px] font-mono mt-0.5 opacity-80">
              {fontScaleMultiplier === 1.35 ? '135% 拡大中' : '100% 原寸'}
            </span>
          </button>

          {/* 配置モード (センタリング / ガイド優先) */}
          <button
            type="button"
            onClick={() => setAutoBalanceMargins(!autoBalanceMargins)}
            className={`p-2 h-14 rounded-lg border text-left transition-all flex flex-col justify-between cursor-pointer ${
              autoBalanceMargins
                ? isLight
                  ? 'bg-amber-100 text-amber-950 border-amber-400 font-bold'
                  : 'bg-amber-950 text-amber-200 border-amber-600 font-bold'
                : isLight
                ? 'bg-emerald-50 text-emerald-900 border-emerald-300 font-medium'
                : 'bg-emerald-950/70 text-emerald-300 border-emerald-800 font-medium'
            }`}
            title="配置補正: ガイド位置優先（手書きした通りの自然な位置）または左右センタリング補正"
          >
            <span className="text-[11px] truncate">配置補正</span>
            <span className="text-[10px] truncate mt-0.5 opacity-80">
              {autoBalanceMargins ? '左右センタリング' : 'ガイド位置優先'}
            </span>
          </button>

          {/* 和文詰め組 (OpenType palt/pkna) */}
          <button
            type="button"
            onClick={() => setUseTsume(!useTsume)}
            className={`p-2 h-14 rounded-lg border text-left transition-all flex flex-col justify-between cursor-pointer ${
              useTsume
                ? isLight
                  ? 'bg-emerald-800 text-white border-emerald-900 font-bold'
                  : 'bg-emerald-500 text-stone-950 font-bold border-emerald-400'
                : isLight
                ? 'bg-white border-[#d8e6df] text-stone-600 hover:bg-emerald-50'
                : 'bg-[#18231c] border-[#25362b] text-emerald-400 hover:bg-[#202d24]'
            }`}
            title="OpenType palt/pkna 機能によるプロポーショナル詰め組み（約物や仮名の字幅に応じた字詰め）をシミュレート"
          >
            <span className="text-[11px] truncate">和文詰め組 (palt)</span>
            <span className="text-[10px] font-mono mt-0.5 opacity-80">{useTsume ? 'ON (詰め組)' : 'OFF (ベタ組)'}</span>
          </button>

          {/* 仮想ボディ枠 */}
          <button
            type="button"
            onClick={() => setShowCharBoxes(!showCharBoxes)}
            className={`p-2 h-14 rounded-lg border text-left transition-all flex flex-col justify-between cursor-pointer ${
              showCharBoxes
                ? isLight
                  ? 'bg-emerald-800 text-white border-emerald-900 font-bold'
                  : 'bg-emerald-500 text-stone-950 font-bold border-emerald-400'
                : isLight
                ? 'bg-white border-[#d8e6df] text-stone-600 hover:bg-emerald-50'
                : 'bg-[#18231c] border-[#25362b] text-emerald-400 hover:bg-[#202d24]'
            }`}
            title="各文字の1em仮想ボディ外枠と中心十字線を表示し、クリックで個別変形調整"
          >
            <span className="text-[11px] truncate">仮想ボディ枠</span>
            <span className="text-[10px] font-mono mt-0.5 opacity-80">{showCharBoxes ? 'ON (1em枠)' : 'OFF'}</span>
          </button>

          {/* ノートガイド */}
          <button
            type="button"
            onClick={() => setShowNotebookGuides(!showNotebookGuides)}
            className={`p-2 h-14 rounded-lg border text-left transition-all flex flex-col justify-between cursor-pointer ${
              showNotebookGuides
                ? isLight
                  ? 'bg-emerald-800 text-white border-emerald-900 font-bold'
                  : 'bg-emerald-500 text-stone-950 font-bold border-emerald-400'
                : isLight
                ? 'bg-white border-[#d8e6df] text-stone-600 hover:bg-emerald-50'
                : 'bg-[#18231c] border-[#25362b] text-emerald-400 hover:bg-[#202d24]'
            }`}
            title="ノート風のベースライン・中心軸・キャップライン・ディセンダーガイド罫線を表示"
          >
            <span className="text-[11px] truncate">ノートガイド線</span>
            <span className="text-[10px] font-mono mt-0.5 opacity-80">{showNotebookGuides ? 'ON (罫線)' : 'OFF'}</span>
          </button>

          {/* 原稿用紙 */}
          <button
            type="button"
            onClick={() => setShowGenkoGrid(!showGenkoGrid)}
            className={`p-2 h-14 rounded-lg border text-left transition-all flex flex-col justify-between cursor-pointer ${
              showGenkoGrid
                ? isLight
                  ? 'bg-emerald-800 text-white border-emerald-900 font-bold'
                  : 'bg-emerald-500 text-stone-950 font-bold border-emerald-400'
                : isLight
                ? 'bg-white border-[#d8e6df] text-stone-600 hover:bg-emerald-50'
                : 'bg-[#18231c] border-[#25362b] text-emerald-400 hover:bg-[#202d24]'
            }`}
            title="原稿用紙・方眼ドット背景を表示"
          >
            <span className="text-[11px] truncate">原稿用紙・方眼</span>
            <span className="text-[10px] font-mono mt-0.5 opacity-80">{showGenkoGrid ? 'ON' : 'OFF'}</span>
          </button>

          {/* 空白マーク */}
          <button
            type="button"
            onClick={() => setShowSpaceMarkers(!showSpaceMarkers)}
            className={`p-2 h-14 rounded-lg border text-left transition-all flex flex-col justify-between cursor-pointer ${
              showSpaceMarkers
                ? isLight
                  ? 'bg-amber-100 border-amber-400 text-amber-900 font-bold'
                  : 'bg-amber-950 border-amber-700 text-amber-300 font-bold'
                : isLight
                ? 'bg-white border-[#d8e6df] text-stone-600 hover:bg-emerald-50'
                : 'bg-[#18231c] border-[#25362b] text-emerald-400 hover:bg-[#202d24]'
            }`}
            title="全角空白(□)と半角空白(␣)を可視化ハイライト"
          >
            <span className="text-[11px] truncate">空白マーク</span>
            <span className="text-[10px] font-mono mt-0.5 opacity-80">{showSpaceMarkers ? 'ON (全角/半角)' : 'OFF'}</span>
          </button>

          {/* 段階サイズ (ウォーターフォール) */}
          <button
            type="button"
            onClick={() => setIsWaterfall(!isWaterfall)}
            className={`p-2 h-14 rounded-lg border text-left transition-all flex flex-col justify-between cursor-pointer ${
              isWaterfall
                ? isLight
                  ? 'bg-emerald-800 text-white border-emerald-900 font-bold'
                  : 'bg-emerald-500 text-stone-950 font-bold border-emerald-400'
                : isLight
                ? 'bg-white border-[#d8e6df] text-stone-600 hover:bg-emerald-50'
                : 'bg-[#18231c] border-[#25362b] text-emerald-400 hover:bg-[#202d24]'
            }`}
            title="16pxから80pxまでの段階サイズ（ウォーターフォール）で可読性を一覧比較"
          >
            <span className="text-[11px] truncate">段階サイズ</span>
            <span className="text-[10px] font-mono mt-0.5 opacity-80">{isWaterfall ? 'ON (段別表示)' : 'OFF'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
